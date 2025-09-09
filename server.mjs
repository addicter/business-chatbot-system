// Enhanced Business Chatbot System Server
//
// This server file incorporates a number of fixes and enhancements over the
// original implementation. Notable improvements include:
//  * Using a predictable and writable temporary directory for uploads
//    (`/tmp/uploads`) and ensuring it exists before handling uploads. This
//    prevents "ENOENT" errors on platforms like AWS App Runner, which do
//    not create arbitrary directories for you.
//  * Wiring the `multer` middleware on the exact routes that accept
//    `multipart/form-data` so that `req.body` and `req.files` are populated.
//    Without this middleware, Express leaves `req.body` empty when parsing
//    file uploads, leading to 400 errors like "Business slug and name are
//    required" even when the client sends them.
//  * Supporting two ways of passing business data on the combined upload
//    endpoint: either as a JSON string under the `businessData` field (the
//    original behaviour) or as individual form fields (`name`, `slug`,
//    `email`, etc.). This makes it easier to script the endpoint with
//    tools like `curl -F`.
//  * Cleaning up temporary uploaded files once processed to avoid filling
//    the container's disk.
//  * Returning clear error messages in JSON to aid debugging and to
//    integrate nicely with front‑end error handling.
//  * PARALLEL CHUNK PROCESSING: Fixed timeout issues by processing file chunks
//    in parallel batches instead of sequentially, with timeout protection
//    and chunk limiting to stay under App Runner's 120-second request limit.

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { promises as fs } from 'fs';

// Import our modules
import {
  createBusiness,
  getBusinessBySlug,
  getBusinessByChatHash,
  getBusinessByAnalyticsHash,
  getBusinessById,
  saveDocument,
  saveChunk,
  createSession,
  updateSession,
  saveMessage,
  getSessionHistory,
  createLead,
  getBusinessAnalytics,
  getBusinessDocuments,
  getAllBusinesses,
} from './lib/database.mjs';

import { FileProcessor } from './lib/file-processor.mjs';
import { aiSystem } from './lib/ai-system.mjs';
//import { emailService } from './lib/email-service.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));
app.use('/admin', express.static('admin'));

// Ensure a writable temporary upload directory. On some platforms (e.g.,
// AWS App Runner) the working directory is read‑only, so we use `/tmp` which
// is guaranteed to be writable. The directory is created at startup.
const uploadDir = process.env.FILE_UPLOAD_DIR || '/tmp/uploads';
await fs.mkdir(uploadDir, { recursive: true });

// File upload configuration
const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 10) * 1024 * 1024,
    files: 20,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['pdf', 'csv', 'txt', 'docx', 'xlsx', 'xls'];
    const fileExt = file.originalname.split('.').pop()?.toLowerCase();
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${fileExt}. Allowed: ${allowedTypes.join(', ')}`));
    }
  },
});

const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.APP_JWT_SECRET || 'your_secret_key';
const SESSION_TIMEOUT = (process.env.SESSION_TIMEOUT_HOURS || 2) + 'h';

function createSessionToken(businessId, sessionId) {
  return jwt.sign({ businessId, sessionId }, JWT_SECRET, { expiresIn: SESSION_TIMEOUT });
}

function verifySessionToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No session token provided' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.session = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired session token' });
  }
}

// Test routes for diagnostics
app.get('/debug/test-openai', async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.json({
        success: false,
        error: 'OPENAI_API_KEY not found in environment variables',
        solution: 'Add OPENAI_API_KEY=your_key_here to your environment',
      });
    }
    const testText = 'This is a test sentence for embedding.';
    const embedding = await aiSystem.createEmbedding(testText);
    const testBusiness = {
      name: 'Test Business',
      description: 'Test description',
      phone: '123-456-7890',
      email: 'test@example.com',
      address: '123 Test St',
      website: 'https://test.com',
      hours: '9 AM - 5 PM',
    };
    const testResponse = await aiSystem.generateResponse(
      testBusiness,
      'What are your hours?',
      [],
      [{ content: 'Our business hours are 9 AM to 5 PM Monday through Friday.' }],
    );
    res.json({
      success: true,
      tests: {
        apiKey: '✅ Found',
        embedding: `✅ Created (${embedding.length} dimensions)`,
        chatCompletion: '✅ Working',
        sampleResponse: testResponse,
      },
      models: {
        embedding: aiSystem.embeddingModel,
        chat: aiSystem.chatModel,
      },
    });
  } catch (error) {
    let errorType = 'Unknown error';
    let solution = 'Check server logs for details';
    if (error.message.includes('401')) {
      errorType = 'Invalid API key';
      solution = 'Check your OPENAI_API_KEY in environment';
    } else if (error.message.includes('quota')) {
      errorType = 'Quota exceeded';
      solution = 'Check your OpenAI billing and usage';
    } else if (error.message.includes('rate limit')) {
      errorType = 'Rate limit hit';
      solution = 'Wait a moment and try again';
    }
    res.json({ success: false, error: errorType, solution, details: error.message });
  }
});

// Test DynamoDB connectivity by listing a few businesses
app.get('/debug/test-dynamodb', async (req, res) => {
  try {
    const businesses = await getAllBusinesses();
    res.json({
      success: true,
      region: process.env.AWS_REGION,
      businessCount: businesses.length,
      message: 'DynamoDB connection working!',
      businesses: businesses.slice(0, 3),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, region: process.env.AWS_REGION });
  }
});

// Home page with quick links
app.get('/', (req, res) => {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.get('host');
  const baseUrl = `${protocol}://${host}`;
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Business Chatbot System</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: system-ui, -apple-system, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh; color: white; padding: 20px;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        .hero { text-align: center; padding: 60px 0; }
        .hero h1 { font-size: 3rem; margin-bottom: 20px; }
        .hero p { font-size: 1.2rem; opacity: 0.9; margin-bottom: 40px; }
        .features { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px; margin: 60px 0; }
        .feature { background: rgba(255,255,255,0.1); padding: 30px; border-radius: 15px; backdrop-filter: blur(10px); }
        .feature h3 { font-size: 1.5rem; margin-bottom: 15px; }
        .cta { text-align: center; margin: 60px 0; }
        .btn { display: inline-block; padding: 15px 30px; background: #4CAF50; color: white; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 10px; transition: transform 0.2s; }
        .btn:hover { transform: translateY(-2px); }
        .btn-secondary { background: #2196F3; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="hero">
          <h1>Business Chatbot System</h1>
          <p>Create intelligent chatbots with file uploads, lead capture, and analytics</p>
        </div>
        <div class="features">
          <div class="feature">
            <h3>📄 File Upload Support</h3>
            <p>Upload PDFs, Excel, CSV, Word files. AI processes and learns from your content automatically.</p>
          </div>
          <div class="feature">
            <h3>🔐 Secure Hash URLs</h3>
            <p>Each business gets secure hash-based URLs for chat and analytics instead of predictable slugs.</p>
          </div>
          <div class="feature">
            <h3>🎯 Lead Generation</h3>
            <p>Automatic lead capture with contact forms and instant email notifications.</p>
          </div>
          <div class="feature">
            <h3>📊 Separate Analytics</h3>
            <p>Dedicated analytics dashboard with unique URLs you can share with businesses.</p>
          </div>
        </div>
        <div class="cta">
          <a href="/admin" class="btn">Admin Dashboard</a>
          <a href="/admin/onboard.html" class="btn btn-secondary">Quick Setup</a>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// Public: Get business information by chat hash
app.get('/api/business/:chatHash', async (req, res) => {
  try {
    const business = await getBusinessByChatHash(req.params.chatHash);
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }
    const publicInfo = {
      name: business.name,
      description: business.description,
      phone: business.phone,
      email: business.email,
      address: business.address,
      website: business.website,
      hours: business.hours,
      maps_url: business.maps_url,
      logo_url: business.logo_url,
      primary_color: business.primary_color,
      secondary_color: business.secondary_color,
      welcome_message: business.welcome_message,
    };
    res.json(publicInfo);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Public: Initialize chat session
app.post('/api/chat/init', async (req, res) => {
  try {
    const { chatHash } = req.body;
    const business = await getBusinessByChatHash(chatHash);
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }
    const userIp = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || '';
    const sessionId = await createSession(business.id, userIp, userAgent);
    const token = createSessionToken(business.id, sessionId);
    res.json({
      sessionToken: token,
      business: {
        name: business.name,
        welcomeMessage: business.welcome_message,
        primaryColor: business.primary_color,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to initialize chat session' });
  }
});

// Public: Send message within a chat session
app.post('/api/chat/message', verifySessionToken, async (req, res) => {
  try {
    const { message } = req.body;
    const { businessId, sessionId } = req.session;
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }
    const business = await getBusinessById(businessId);
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }
    const intent = aiSystem.analyzeIntent(message);
    const sentiment = aiSystem.analyzeSentiment(message);
    const relevantChunks = await aiSystem.retrieveRelevantChunks(businessId, message);
    const history = await getSessionHistory(sessionId, 6);
    const aiResponse = await aiSystem.generateResponse(business, message, history, relevantChunks);
    await saveMessage(sessionId, businessId, 'user', message, intent, sentiment, 0.8, relevantChunks.map(c => c.id));
    await saveMessage(sessionId, businessId, 'assistant', aiResponse);
    const suggestions = aiSystem.generateSuggestions(intent, business);
    const showContactForm = aiSystem.shouldShowContactForm(intent, message);
    res.json({ response: aiResponse, suggestions, showContactForm, intent, sentiment });
  } catch (error) {
    res.status(500).json({
      response: "I'm sorry, I'm having technical difficulties. Please try again or contact us directly.",
      suggestions: ['Try again', 'Contact us', 'Get help'],
    });
  }
});

// Public: Lead capture
app.post('/api/lead/capture', verifySessionToken, async (req, res) => {
  try {
    const { name, email, phone, interest, budget, timeline, message } = req.body;
    const { businessId, sessionId } = req.session;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }
    const business = await getBusinessById(businessId);
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }
    const leadData = { name, email, phone, interest, budget, timeline, message };
    const leadId = await createLead(businessId, sessionId, leadData);
    await updateSession(sessionId, {
      user_name: name,
      user_email: email,
      user_phone: phone || '',
    });
    res.json({ success: true, leadId, message: `Thank you ${name}! We've received your information and will get back to you soon.` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save your information. Please try again.' });
  }
});

// Public: Analytics API by hash
app.get('/api/analytics/:analyticsHash', async (req, res) => {
  try {
    const { analyticsHash } = req.params;
    const { days = 30 } = req.query;
    const business = await getBusinessByAnalyticsHash(analyticsHash);
    if (!business) {
      return res.status(404).json({ error: 'Analytics not found' });
    }
    const analytics = await getBusinessAnalytics(business.id, parseInt(days, 10));
    res.json({ business: { name: business.name, chat_hash: business.chat_hash }, period: `${days} days`, analytics });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Admin: Combined create business + upload files (FIXED FOR TIMEOUTS)
app.post('/admin/business/create-and-upload', upload.array('files', 10), async (req, res) => {
  console.log('🚀 CREATE-AND-UPLOAD endpoint hit');
  console.log('📋 Request body keys:', Object.keys(req.body));
  console.log('📁 Files count:', req.files?.length || 0);
  try {
    // Parse business data from either JSON field or individual fields
    let businessData;
    if (req.body.businessData) {
      try {
        businessData = JSON.parse(req.body.businessData);
      } catch (jsonErr) {
        return res.status(400).json({ error: 'Invalid JSON in businessData field' });
      }
    } else {
      // Fall back to reading individual fields (useful for curl -F commands)
      businessData = {
        name: req.body.name,
        slug: req.body.slug,
        email: req.body.email,
        description: req.body.description,
        phone: req.body.phone,
        address: req.body.address,
        website: req.body.website,
        hours: req.body.hours,
        maps_url: req.body.maps_url,
        logo_url: req.body.logo_url,
        primary_color: req.body.primary_color,
        secondary_color: req.body.secondary_color,
        welcome_message: req.body.welcome_message,
        system_prompt: req.body.system_prompt,
        enable_email_notifications: req.body.enable_email_notifications === 'true' || req.body.enable_email_notifications === true,
        enable_lead_capture: req.body.enable_lead_capture === 'true' || req.body.enable_lead_capture === true,
        enable_file_uploads: req.body.enable_file_uploads === 'true' || req.body.enable_file_uploads === true,
      };
    }
    if (!businessData.slug || !businessData.name) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ error: 'Business slug and name are required' });
    }
    // Check if slug exists
    const existing = await getBusinessBySlug(businessData.slug);
    if (existing) {
      return res.status(409).json({ error: 'Business slug already exists' });
    }
    // Create the business
    console.log('💾 About to create business in DynamoDB...');
    const result = await createBusiness(businessData);
    console.log('✅ Business created successfully');
    const business = await getBusinessById(result.id);
    // Build base URL for returned links
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = process.env.CUSTOM_DOMAIN || req.get('host'); // ← Use custom domain if set
    const baseUrl = `${protocol}://${host}`;
    // Process uploaded files with PARALLEL PROCESSING TO PREVENT TIMEOUTS
    let uploadResults = [];
    let totalChunks = 0;
    if (req.files && req.files.length > 0) {
      console.log(`📁 Processing ${req.files.length} files with parallel optimization...`);
      for (const file of req.files) {
        try {
          console.log(`📄 Processing file: ${file.originalname}`);
          const fileExt = path.extname(file.originalname).slice(1).toLowerCase();
          const content = await FileProcessor.processFile(file.path, fileExt, file.originalname);
          const category = FileProcessor.categorizeContent(content, file.originalname);
          const documentId = await saveDocument(
            business.id,
            file.filename,
            file.originalname,
            file.mimetype,
            file.size,
            content,
            category,
          );

          // FIXED: PARALLEL CHUNK PROCESSING TO PREVENT TIMEOUTS
          const chunks = FileProcessor.chunkText(content);
          let chunkCount = 0;
          
          console.log(`🔄 Processing ${chunks.length} chunks for ${file.originalname}...`);
          
          // Limit chunks to prevent timeout (adjust based on your needs)
          const MAX_CHUNKS = 30; // Process max 30 chunks per file to stay under timeout
          const limitedChunks = chunks.slice(0, MAX_CHUNKS);
          
          if (chunks.length > MAX_CHUNKS) {
            console.log(`⚠️ Limiting to first ${MAX_CHUNKS} chunks (was ${chunks.length}) for ${file.originalname}`);
          }
          
          // Process chunks in parallel batches
          const BATCH_SIZE = 5; // Process 5 chunks simultaneously
          
          for (let i = 0; i < limitedChunks.length; i += BATCH_SIZE) {
            const batch = limitedChunks.slice(i, i + BATCH_SIZE);
            const batchNum = Math.floor(i / BATCH_SIZE) + 1;
            const totalBatches = Math.ceil(limitedChunks.length / BATCH_SIZE);
            
            console.log(`📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} chunks) for ${file.originalname}`);
            
            // Create promises for parallel processing
            const batchPromises = batch.map(async (chunk, batchIndex) => {
              const chunkIndex = i + batchIndex;
              const keywords = FileProcessor.extractKeywords(chunk);
              
              try {
                // Add timeout protection to OpenAI call
                const embedding = await Promise.race([
                  aiSystem.createEmbedding(chunk),
                  new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Embedding timeout after 15s')), 15000)
                  )
                ]);
                
                await saveChunk(business.id, documentId, chunkIndex, chunk, embedding, category, keywords);
                return { success: true, chunkIndex };
              } catch (embeddingError) {
                console.error(`❌ Chunk ${chunkIndex} failed for ${file.originalname}:`, embeddingError.message);
                return { success: false, chunkIndex, error: embeddingError.message };
              }
            });
            
            // Wait for the entire batch to complete
            try {
              const batchResults = await Promise.allSettled(batchPromises);
              const successCount = batchResults.filter(
                r => r.status === 'fulfilled' && r.value.success
              ).length;
              chunkCount += successCount;
              
              console.log(`✅ Batch ${batchNum} completed: ${successCount}/${batch.length} successful for ${file.originalname}`);
              
              // Small delay between batches to avoid rate limits
              if (i + BATCH_SIZE < limitedChunks.length) {
                await new Promise(resolve => setTimeout(resolve, 200));
              }
            } catch (batchError) {
              console.error(`❌ Batch ${batchNum} error for ${file.originalname}:`, batchError);
            }
          }
          
          console.log(`✅ File processing completed: ${chunkCount}/${limitedChunks.length} chunks saved for ${file.originalname}`);

          uploadResults.push({
            filename: file.originalname,
            status: 'success',
            chunks: chunkCount,
            totalChunksInFile: chunks.length,
            processedChunks: limitedChunks.length,
            category,
            size: file.size,
          });
          totalChunks += chunkCount;
        } catch (fileError) {
          console.error(`Error processing file ${file.originalname}:`, fileError);
          uploadResults.push({ filename: file.originalname, status: 'error', error: fileError.message });
        } finally {
          // Remove the temp file
          await fs.unlink(file.path).catch(() => {});
        }
      }
    }
    console.log('✅ All files processed successfully');
    res.json({
      success: true,
      business,
      urls: {
        chatUrl: `${baseUrl}/chat/${result.chat_hash}`,
        analyticsUrl: `${baseUrl}/analytics/${result.analytics_hash}`,
        adminUrl: `${baseUrl}/admin`,
      },
      apiKey: result.api_key,
      upload: {
        filesProcessed: uploadResults.filter(r => r.status === 'success').length,
        totalFiles: uploadResults.length,
        totalChunks,
        results: uploadResults,
      },
    });
  } catch (error) {
    console.error('💥 ENDPOINT ERROR:', error);
    console.error('💥 ERROR STACK:', error.stack);
    res.status(500).json({ error: 'Failed to create business and process files' });
  }
});

// Serve analytics and chat interfaces
app.get('/analytics/:analyticsHash', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'admin/analytics.html'));
});

app.get('/chat/:chatHash', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'public/chat.html'));
});

// Legacy admin routes for backward compatibility
app.post('/admin/business/create', async (req, res) => {
  try {
    const businessData = req.body;
    if (!businessData.slug || !businessData.name) {
      return res.status(400).json({ error: 'Business slug and name are required' });
    }
    const existing = await getBusinessBySlug(businessData.slug);
    if (existing) {
      return res.status(409).json({ error: 'Business slug already exists' });
    }
    const result = await createBusiness(businessData);
    const business = await getBusinessById(result.id);
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;
    res.json({
      success: true,
      business,
      urls: {
        chatUrl: `${baseUrl}/chat/${result.chat_hash}`,
        analyticsUrl: `${baseUrl}/analytics/${result.analytics_hash}`,
        adminUrl: `${baseUrl}/admin`,
      },
      apiKey: result.api_key,
      hashes: { chat_hash: result.chat_hash, analytics_hash: result.analytics_hash },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create business' });
  }
});

// List all businesses
app.get('/admin/businesses', async (req, res) => {
  try {
    const businesses = await getAllBusinesses();
    res.json(businesses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch businesses' });
  }
});

// Multer error handler and general error handler
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
    return res.status(400).json({ error: error.message });
  }
  // unknown error
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Enhanced Business Chatbot System running on http://0.0.0.0:${PORT}`);
  console.log(`📊 Admin Dashboard: http://0.0.0.0:${PORT}/admin`);
  console.log(`⚡ Quick Setup: http://0.0.0.0:${PORT}/admin/onboard.html`);
  console.log(`🏥 Health Check: http://0.0.0.0:${PORT}/health`);
  console.log(`🧪 OpenAI Test: http://0.0.0.0:${PORT}/debug/test-openai`);
  console.log(`🗃️ DynamoDB Test: http://0.0.0.0:${PORT}/debug/test-dynamodb`);
  console.log(`\n✨ New Features:`);
  console.log(`   🔐 Hash-based secure URLs`);
  console.log(`   📊 Separate analytics endpoints`);
  console.log(`   📄 Parallel chunk processing (TIMEOUT FIXED)`);
  console.log(`   🎨 Enhanced UI with Horizon design`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
