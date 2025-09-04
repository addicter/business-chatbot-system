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
  createBusiness, getBusinessBySlug, getBusinessByChatHash, getBusinessByAnalyticsHash,
  getBusinessById, saveDocument, saveChunk, createSession, updateSession, saveMessage,
  getSessionHistory, createLead, getBusinessAnalytics, getBusinessDocuments,
  getAllBusinesses
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

// File upload configuration
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: (process.env.MAX_FILE_SIZE_MB || 10) * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['pdf', 'csv', 'txt', 'docx', 'xlsx', 'xls'];
    const fileExt = file.originalname.split('.').pop()?.toLowerCase();
    
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${fileExt}. Allowed: ${allowedTypes.join(', ')}`));
    }
  }
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

// Routes

// Add this test route to your server.mjs to test OpenAI integration:

app.get('/debug/test-openai', async (req, res) => {
  try {
    console.log('🧪 Testing OpenAI integration...');
    
    // Test 1: Check API key
    if (!process.env.OPENAI_API_KEY) {
      return res.json({
        success: false,
        error: 'OPENAI_API_KEY not found in environment variables',
        solution: 'Add OPENAI_API_KEY=your_key_here to your .env file'
      });
    }
    
    console.log('✅ API key found');
    
    // Test 2: Create a test embedding
    const testText = "This is a test sentence for embedding.";
    console.log('🔍 Creating test embedding...');
    
    const embedding = await aiSystem.createEmbedding(testText);
    
    console.log(`✅ Embedding created successfully: ${embedding.length} dimensions`);
    
    // Test 3: Test chat completion
    console.log('🤖 Testing chat completion...');
    
    const testBusiness = {
      name: 'Test Business',
      description: 'Test description',
      phone: '123-456-7890',
      email: 'test@example.com',
      address: '123 Test St',
      website: 'https://test.com',
      hours: '9 AM - 5 PM'
    };
    
    const testResponse = await aiSystem.generateResponse(
      testBusiness, 
      "What are your hours?", 
      [], 
      [{ content: "Our business hours are 9 AM to 5 PM Monday through Friday." }]
    );
    
    console.log('✅ Chat completion successful');
    
    res.json({
      success: true,
      tests: {
        apiKey: '✅ Found',
        embedding: `✅ Created (${embedding.length} dimensions)`,
        chatCompletion: '✅ Working',
        sampleResponse: testResponse
      },
      models: {
        embedding: aiSystem.embeddingModel,
        chat: aiSystem.chatModel
      }
    });
    
  } catch (error) {
    console.error('❌ OpenAI test failed:', error);
    
    let errorType = 'Unknown error';
    let solution = 'Check server logs for details';
    
    if (error.message.includes('401')) {
      errorType = 'Invalid API key';
      solution = 'Check your OPENAI_API_KEY in .env file';
    } else if (error.message.includes('quota')) {
      errorType = 'Quota exceeded';
      solution = 'Check your OpenAI billing and usage';
    } else if (error.message.includes('rate limit')) {
      errorType = 'Rate limit hit';
      solution = 'Wait a moment and try again';
    }
    
    res.json({
      success: false,
      error: errorType,
      solution: solution,
      details: error.message
    });
  }
});

// Home page
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
        .btn { 
          display: inline-block; padding: 15px 30px; background: #4CAF50; 
          color: white; text-decoration: none; border-radius: 25px; 
          font-weight: bold; margin: 10px; transition: transform 0.2s;
        }
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

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Get business information by hash (public)
app.get('/api/business/:chatHash', (req, res) => {
  try {
    const business = getBusinessByChatHash(req.params.chatHash);
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
      welcome_message: business.welcome_message
    };
    
    res.json(publicInfo);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Initialize chat session
app.post('/api/chat/init', (req, res) => {
  try {
    const { chatHash } = req.body;
    
    const business = getBusinessByChatHash(chatHash);
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }
    
    const userIp = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || '';
    
    const sessionId = createSession(business.id, userIp, userAgent);
    const token = createSessionToken(business.id, sessionId);
    
    res.json({ 
      sessionToken: token,
      business: {
        name: business.name,
        welcomeMessage: business.welcome_message,
        primaryColor: business.primary_color
      }
    });
    
  } catch (error) {
    console.error('Error initializing session:', error);
    res.status(500).json({ error: 'Failed to initialize chat session' });
  }
});

// Send message (unchanged)
app.post('/api/chat/message', verifySessionToken, async (req, res) => {
  try {
    const { message } = req.body;
    const { businessId, sessionId } = req.session;
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }
    
    const business = getBusinessById(businessId);
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }
    
    const intent = aiSystem.analyzeIntent(message);
    const sentiment = aiSystem.analyzeSentiment(message);
    
    const relevantChunks = await aiSystem.retrieveRelevantChunks(businessId, message);
    const history = getSessionHistory(sessionId, 6);
    const aiResponse = await aiSystem.generateResponse(business, message, history, relevantChunks);
    
    saveMessage(sessionId, businessId, 'user', message, intent, sentiment, 0.8, relevantChunks.map(c => c.id));
    saveMessage(sessionId, businessId, 'assistant', aiResponse);
    
    const suggestions = aiSystem.generateSuggestions(intent, business);
    const showContactForm = aiSystem.shouldShowContactForm(intent, message);
    
    res.json({
      response: aiResponse,
      suggestions,
      showContactForm,
      intent,
      sentiment
    });
    
  } catch (error) {
    console.error('Error processing message:', error);
    res.status(500).json({ 
      response: "I'm sorry, I'm having technical difficulties. Please try again or contact us directly.",
      suggestions: ['Try again', 'Contact us', 'Get help']
    });
  }
});

// Lead capture (unchanged)
app.post('/api/lead/capture', verifySessionToken, async (req, res) => {
  try {
    const { name, email, phone, interest, budget, timeline, message } = req.body;
    const { businessId, sessionId } = req.session;
    
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }
    
    const business = getBusinessById(businessId);
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }
    
    const leadData = { name, email, phone, interest, budget, timeline, message };
    const leadId = createLead(businessId, sessionId, leadData);
    
    updateSession(sessionId, {
      user_name: name,
      user_email: email,
      user_phone: phone || ''
    });
    
    if (business.enable_email_notifications) {
      await emailService.sendLeadNotification(leadData, business);
    }
    
    res.json({
      success: true,
      leadId,
      message: `Thank you ${name}! We've received your information and will get back to you soon.`
    });
    
  } catch (error) {
    console.error('Error capturing lead:', error);
    res.status(500).json({ error: 'Failed to save your information. Please try again.' });
  }
});


// Add this route in server.mjs after the other routes
app.get('/api/analytics/:analyticsHash', (req, res) => {
  try {
    const { analyticsHash } = req.params;
    const { days = 30 } = req.query;
    
    const business = getBusinessByAnalyticsHash(analyticsHash);
    if (!business) {
      return res.status(404).json({ error: 'Analytics not found' });
    }
    
    const analytics = getBusinessAnalytics(business.id, parseInt(days));
    
    res.json({
      business: {
        name: business.name,
        chat_hash: business.chat_hash
      },
      period: `${days} days`,
      analytics
    });
    
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Combined Admin Route: Create Business + Upload Files
app.post('/admin/business/create-and-upload', upload.array('files', 10), async (req, res) => {
  try {
    const businessData = JSON.parse(req.body.businessData || '{}');
    
    if (!businessData.slug || !businessData.name) {
      return res.status(400).json({ error: 'Business slug and name are required' });
    }
    
    // Check if slug already exists
    const existing = getBusinessBySlug(businessData.slug);
    if (existing) {
      return res.status(409).json({ error: 'Business slug already exists' });
    }
    
    // Create business
    const result = createBusiness(businessData);
    const business = getBusinessBySlug(businessData.slug);
    
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;
    
    let uploadResults = [];
    let totalChunks = 0;
    
    // Process uploaded files if any
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          // Get file extension from filename instead of mimetype
          const fileExt = path.extname(file.originalname).slice(1).toLowerCase();
          const content = await FileProcessor.processFile(file.path, fileExt, file.originalname);
          const category = FileProcessor.categorizeContent(content, file.originalname);
          
          const documentId = saveDocument(
            business.id,
            file.filename,
            file.originalname,
            file.mimetype,
            file.size,
            content,
            category
          );
          
          const chunks = FileProcessor.chunkText(content);
          let chunkCount = 0;
          
          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const keywords = FileProcessor.extractKeywords(chunk);
            
            try {
              const embedding = await aiSystem.createEmbedding(chunk);
              saveChunk(business.id, documentId, i, chunk, embedding, category, keywords);
              chunkCount++;
            } catch (embeddingError) {
              console.error(`Error creating embedding for chunk ${i}:`, embeddingError);
            }
          }
          
          uploadResults.push({
            filename: file.originalname,
            status: 'success',
            chunks: chunkCount,
            category,
            size: file.size
          });
          
          totalChunks += chunkCount;
          
          await fs.unlink(file.path).catch(() => {});
          
        } catch (fileError) {
          console.error(`Error processing file ${file.originalname}:`, fileError);
          uploadResults.push({
            filename: file.originalname,
            status: 'error',
            error: fileError.message
          });
          
          await fs.unlink(file.path).catch(() => {});
        }
      }
    }
    
    res.json({
      success: true,
      business,
      urls: {
        chatUrl: `${baseUrl}/chat/${result.chat_hash}`,
        analyticsUrl: `${baseUrl}/analytics/${result.analytics_hash}`,
        adminUrl: `${baseUrl}/admin`
      },
      apiKey: result.api_key,
      upload: {
        filesProcessed: uploadResults.filter(r => r.status === 'success').length,
        totalFiles: uploadResults.length,
        totalChunks,
        results: uploadResults
      }
    });
    
  } catch (error) {
    console.error('Error creating business:', error);
    res.status(500).json({ error: 'Failed to create business and process files' });
  }
});

// Separate Analytics Endpoint by Hash
app.get('/analytics/:analyticsHash', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'admin/analytics.html'));
});

app.get('/api/analytics/:analyticsHash', (req, res) => {
  try {
    const { analyticsHash } = req.params;
    const { days = 30 } = req.query;
    
    const business = getBusinessByAnalyticsHash(analyticsHash);
    if (!business) {
      return res.status(404).json({ error: 'Analytics not found' });
    }
    
    const analytics = getBusinessAnalytics(business.id, parseInt(days));
    
    res.json({
      business: {
        name: business.name,
        chat_hash: business.chat_hash
      },
      period: `${days} days`,
      analytics
    });
    
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Legacy admin routes (for backward compatibility)
app.post('/admin/business/create', async (req, res) => {
  try {
    const businessData = req.body;
    
    if (!businessData.slug || !businessData.name) {
      return res.status(400).json({ error: 'Business slug and name are required' });
    }
    
    const existing = getBusinessBySlug(businessData.slug);
    if (existing) {
      return res.status(409).json({ error: 'Business slug already exists' });
    }
    
    const result = createBusiness(businessData);
    const business = getBusinessById(result.id);
    
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;
    
    res.json({
      success: true,
      business,
      urls: {
        chatUrl: `${baseUrl}/chat/${result.chat_hash}`,
        analyticsUrl: `${baseUrl}/analytics/${result.analytics_hash}`,
        adminUrl: `${baseUrl}/admin`
      },
      apiKey: result.api_key,
      hashes: {
        chat_hash: result.chat_hash,
        analytics_hash: result.analytics_hash
      }
    });
    
  } catch (error) {
    console.error('Error creating business:', error);
    res.status(500).json({ error: 'Failed to create business' });
  }
});

// List all businesses
app.get('/admin/businesses', (req, res) => {
  try {
    const businesses = getAllBusinesses();
    res.json(businesses);
  } catch (error) {
    console.error('Error fetching businesses:', error);
    res.status(500).json({ error: 'Failed to fetch businesses' });
  }
});

// Serve chat interface by hash
app.get('/chat/:chatHash', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'public/chat.html'));
});

// Error handling
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
    return res.status(400).json({ error: error.message });
  }
  
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Enhanced Business Chatbot System running on http://localhost:${PORT}`);
  console.log(`📊 Admin Dashboard: http://localhost:${PORT}/admin`);
  console.log(`⚡ Quick Setup: http://localhost:${PORT}/admin/onboard.html`);
  console.log(`\n✨ New Features:`);
  console.log(`   🔐 Hash-based secure URLs`);
  console.log(`   📊 Separate analytics endpoints`);
  console.log(`   📄 Combined create + upload workflow`);
  console.log(`   🎨 Enhanced UI with Horizon design`);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});