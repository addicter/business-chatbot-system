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

// Home page with modern design - REPLACE THIS ENTIRE ROUTE HANDLER
app.get('/', (req, res) => {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.get('host');
  const baseUrl = `${protocol}://${host}`;
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Business Chatbot System</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        :root {
            --primary-gradient: linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899);
            --secondary-gradient: linear-gradient(135deg, #0ea5e9, #06b6d4, #10b981);
            --dark-bg: #0a0a0b;
            --card-bg: rgba(255, 255, 255, 0.05);
            --glass-border: rgba(255, 255, 255, 0.1);
            --text-primary: #ffffff;
            --text-secondary: rgba(255, 255, 255, 0.8);
            --accent: #6366f1;
            --success: #10b981;
        }

        html {
            scroll-behavior: smooth;
        }

        body {
            font-family: 'Inter', sans-serif;
            background: var(--dark-bg);
            color: var(--text-primary);
            overflow-x: hidden;
            line-height: 1.6;
        }

        /* Animated Background */
        .animated-bg {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: -2;
            background: var(--dark-bg);
        }

        .animated-bg::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: 
                radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 80% 80%, rgba(236, 72, 153, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 40% 60%, rgba(139, 92, 246, 0.1) 0%, transparent 50%);
            animation: gradientShift 8s ease-in-out infinite;
        }

        @keyframes gradientShift {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.8; transform: scale(1.05); }
        }

        /* Floating particles */
        .particles {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: -1;
        }

        .particle {
            position: absolute;
            background: var(--primary-gradient);
            border-radius: 50%;
            animation: float 8s infinite linear;
            opacity: 0.6;
        }

        @keyframes float {
            0% {
                transform: translateY(100vh) scale(0);
                opacity: 0;
            }
            10% {
                opacity: 0.6;
            }
            90% {
                opacity: 0.6;
            }
            100% {
                transform: translateY(-100vh) scale(1);
                opacity: 0;
            }
        }

        /* Header */
        .header {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 1000;
            padding: 1rem 2rem;
            backdrop-filter: blur(20px);
            background: rgba(10, 10, 11, 0.8);
            border-bottom: 1px solid var(--glass-border);
            animation: slideDown 0.8s ease-out;
        }

        @keyframes slideDown {
            from {
                transform: translateY(-100%);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }

        .header-content {
            max-width: 1200px;
            margin: 0 auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .logo {
            font-size: 1.5rem;
            font-weight: 800;
            background: var(--primary-gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .nav-links {
            display: flex;
            gap: 2rem;
            list-style: none;
        }

        .nav-link {
            color: var(--text-secondary);
            text-decoration: none;
            font-weight: 500;
            transition: all 0.3s ease;
            position: relative;
        }

        .nav-link::after {
            content: '';
            position: absolute;
            bottom: -5px;
            left: 0;
            width: 0;
            height: 2px;
            background: var(--primary-gradient);
            transition: width 0.3s ease;
        }

        .nav-link:hover {
            color: var(--text-primary);
        }

        .nav-link:hover::after {
            width: 100%;
        }

        /* Main Container */
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 2rem;
        }

        /* Hero Section */
        .hero {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            position: relative;
            padding: 8rem 0 4rem;
        }

        .hero-content {
            max-width: 800px;
            animation: fadeInUp 1s ease-out 0.2s both;
        }

        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(50px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .hero h1 {
            font-size: clamp(3rem, 8vw, 6rem);
            font-weight: 900;
            margin-bottom: 1.5rem;
            background: var(--primary-gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            line-height: 1.1;
            animation: textGlow 2s ease-in-out infinite alternate;
        }

        @keyframes textGlow {
            from {
                filter: drop-shadow(0 0 20px rgba(99, 102, 241, 0.5));
            }
            to {
                filter: drop-shadow(0 0 30px rgba(236, 72, 153, 0.5));
            }
        }

        .hero-subtitle {
            font-size: 1.5rem;
            color: var(--text-secondary);
            margin-bottom: 3rem;
            font-weight: 400;
            animation: fadeInUp 1s ease-out 0.4s both;
        }

        .hero-cta {
            display: flex;
            gap: 1.5rem;
            justify-content: center;
            flex-wrap: wrap;
            animation: fadeInUp 1s ease-out 0.6s both;
        }

        /* Modern Buttons */
        .btn {
            padding: 1rem 2.5rem;
            border: none;
            border-radius: 50px;
            font-weight: 600;
            font-size: 1.1rem;
            cursor: pointer;
            transition: all 0.4s ease;
            position: relative;
            overflow: hidden;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            z-index: 1;
        }

        .btn-primary {
            background: var(--primary-gradient);
            color: white;
            box-shadow: 0 10px 30px rgba(99, 102, 241, 0.3);
        }

        .btn-primary::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
            transition: left 0.6s ease;
            z-index: -1;
        }

        .btn-primary:hover::before {
            left: 100%;
        }

        .btn-primary:hover {
            transform: translateY(-3px);
            box-shadow: 0 15px 40px rgba(99, 102, 241, 0.4);
        }

        .btn-secondary {
            background: rgba(255, 255, 255, 0.1);
            color: var(--text-primary);
            border: 1px solid var(--glass-border);
            backdrop-filter: blur(20px);
        }

        .btn-secondary:hover {
            background: rgba(255, 255, 255, 0.15);
            transform: translateY(-3px);
            box-shadow: 0 10px 30px rgba(255, 255, 255, 0.1);
        }

        /* Features Section */
        .features {
            padding: 8rem 0;
            position: relative;
        }

        .section-header {
            text-align: center;
            margin-bottom: 4rem;
            animation: fadeInUp 1s ease-out;
        }

        .section-title {
            font-size: 3rem;
            font-weight: 800;
            margin-bottom: 1rem;
            background: var(--secondary-gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .section-subtitle {
            font-size: 1.2rem;
            color: var(--text-secondary);
            max-width: 600px;
            margin: 0 auto;
        }

        .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
            margin-top: 4rem;
        }

        .feature-card {
            background: var(--card-bg);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            padding: 2.5rem;
            backdrop-filter: blur(20px);
            transition: all 0.4s ease;
            position: relative;
            overflow: hidden;
            animation: fadeInUp 1s ease-out;
        }

        .feature-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.1), transparent);
            transition: left 0.6s ease;
            z-index: -1;
        }

        .feature-card:hover::before {
            left: 100%;
        }

        .feature-card:hover {
            transform: translateY(-10px);
            border-color: rgba(99, 102, 241, 0.3);
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .feature-icon {
            font-size: 3rem;
            margin-bottom: 1.5rem;
            display: block;
            transform: scale(1);
            transition: transform 0.4s ease;
        }

        .feature-card:hover .feature-icon {
            transform: scale(1.1) rotate(5deg);
        }

        .feature-title {
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 1rem;
            color: var(--text-primary);
        }

        .feature-description {
            color: var(--text-secondary);
            line-height: 1.6;
        }

        /* Stats Section */
        .stats {
            padding: 6rem 0;
            background: rgba(99, 102, 241, 0.05);
            margin: 4rem 0;
            border-radius: 30px;
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 3rem;
            text-align: center;
        }

        .stat-item {
            animation: fadeInUp 1s ease-out;
        }

        .stat-number {
            font-size: 3rem;
            font-weight: 900;
            background: var(--primary-gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            display: block;
            margin-bottom: 0.5rem;
        }

        .stat-label {
            color: var(--text-secondary);
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.1em;
        }

        /* CTA Section */
        .cta-section {
            padding: 8rem 0;
            text-align: center;
        }

        .cta-content {
            max-width: 600px;
            margin: 0 auto;
            animation: fadeInUp 1s ease-out;
        }

        .cta-title {
            font-size: 2.5rem;
            font-weight: 800;
            margin-bottom: 1.5rem;
            background: var(--primary-gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .cta-description {
            font-size: 1.1rem;
            color: var(--text-secondary);
            margin-bottom: 2.5rem;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
            .hero h1 {
                font-size: 3rem;
            }
            
            .hero-subtitle {
                font-size: 1.2rem;
            }
            
            .hero-cta {
                flex-direction: column;
                align-items: center;
            }
            
            .features-grid {
                grid-template-columns: 1fr;
            }
            
            .nav-links {
                display: none;
            }
            
            .stats-grid {
                grid-template-columns: repeat(2, 1fr);
                gap: 2rem;
            }
        }

        /* Scroll indicator */
        .scroll-indicator {
            position: fixed;
            top: 0;
            left: 0;
            height: 4px;
            background: var(--primary-gradient);
            z-index: 1001;
            transition: width 0.3s ease;
        }

        /* Loading animation */
        .loading-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: var(--dark-bg);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 1;
            transition: opacity 0.5s ease;
        }

        .loading-overlay.hidden {
            opacity: 0;
            pointer-events: none;
        }

        .loader {
            width: 50px;
            height: 50px;
            border: 3px solid rgba(99, 102, 241, 0.3);
            border-top: 3px solid var(--accent);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <!-- Loading Overlay -->
    <div class="loading-overlay" id="loadingOverlay">
        <div class="loader"></div>
    </div>

    <!-- Scroll Indicator -->
    <div class="scroll-indicator" id="scrollIndicator"></div>

    <!-- Animated Background -->
    <div class="animated-bg"></div>
    
    <!-- Particles -->
    <div class="particles" id="particles"></div>

    <!-- Header -->
    <header class="header">
        <div class="header-content">
            <div class="logo">ChatBot System</div>
            <nav>
                <ul class="nav-links">
                    <li><a href="#features" class="nav-link">Features</a></li>
                    <li><a href="#stats" class="nav-link">Stats</a></li>
                    <li><a href="${baseUrl}/admin" class="nav-link">Get Started</a></li>
                </ul>
            </nav>
        </div>
    </header>

    <!-- Hero Section -->
    <section class="hero">
        <div class="container">
            <div class="hero-content">
                <h1>Business Chatbot System</h1>
                <p class="hero-subtitle">Create intelligent AI chatbots with file uploads, lead capture, and advanced analytics in minutes</p>
                <div class="hero-cta">
                    <a href="${baseUrl}/admin" class="btn btn-primary">
                        🚀 Create Your Bot
                    </a>
                    <a href="#features" class="btn btn-secondary">
                        ✨ Explore Features
                    </a>
                </div>
            </div>
        </div>
    </section>

    <!-- Features Section -->
    <section class="features" id="features">
        <div class="container">
            <div class="section-header">
                <h2 class="section-title">Powerful Features</h2>
                <p class="section-subtitle">Everything you need to create and deploy intelligent chatbots for your business</p>
            </div>
            
            <div class="features-grid">
                <div class="feature-card">
                    <span class="feature-icon">📄</span>
                    <h3 class="feature-title">Smart File Processing</h3>
                    <p class="feature-description">Upload PDFs, Excel, CSV, Word files. Our AI automatically processes and learns from your content with advanced parallel processing for optimal performance.</p>
                </div>
                
                <div class="feature-card">
                    <span class="feature-icon">🔐</span>
                    <h3 class="feature-title">Secure Hash URLs</h3>
                    <p class="feature-description">Each business gets secure, unique hash-based URLs for chat and analytics instead of predictable slugs, ensuring maximum security.</p>
                </div>
                
                <div class="feature-card">
                    <span class="feature-icon">🎯</span>
                    <h3 class="feature-title">Advanced Lead Generation</h3>
                    <p class="feature-description">Automatic lead capture with intelligent contact forms, real-time notifications, and seamless CRM integration.</p>
                </div>
                
                <div class="feature-card">
                    <span class="feature-icon">📊</span>
                    <h3 class="feature-title">Comprehensive Analytics</h3>
                    <p class="feature-description">Dedicated analytics dashboard with detailed insights, conversation tracking, and performance metrics you can share with stakeholders.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Stats Section -->
    <section class="stats" id="stats">
        <div class="container">
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-number">99.9%</span>
                    <span class="stat-label">Uptime</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number">10k+</span>
                    <span class="stat-label">Chats Processed</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number">50+</span>
                    <span class="stat-label">File Formats</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number">24/7</span>
                    <span class="stat-label">AI Support</span>
                </div>
            </div>
        </div>
    </section>

    <!-- CTA Section -->
    <section class="cta-section">
        <div class="container">
            <div class="cta-content">
                <h2 class="cta-title">Ready to Transform Your Business?</h2>
                <p class="cta-description">Join thousands of businesses using our AI chatbot system to enhance customer engagement and capture more leads.</p>
                <a href="${baseUrl}/admin" class="btn btn-primary">
                    🚀 Get Started Now
                </a>
            </div>
        </div>
    </section>

    <script>
        // Loading animation
        window.addEventListener('load', () => {
            const loadingOverlay = document.getElementById('loadingOverlay');
            setTimeout(() => {
                loadingOverlay.classList.add('hidden');
            }, 800);
        });

        // Scroll indicator
        window.addEventListener('scroll', () => {
            const scrollIndicator = document.getElementById('scrollIndicator');
            const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
            const progressWidth = (window.pageYOffset / totalHeight) * 100;
            scrollIndicator.style.width = progressWidth + '%';
        });

        // Floating particles
        function createParticle() {
            const particle = document.createElement('div');
            particle.classList.add('particle');
            
            const size = Math.random() * 4 + 1;
            particle.style.width = size + 'px';
            particle.style.height = size + 'px';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDuration = (Math.random() * 8 + 8) + 's';
            particle.style.animationDelay = Math.random() * 8 + 's';
            
            document.getElementById('particles').appendChild(particle);
            
            setTimeout(() => {
                particle.remove();
            }, 16000);
        }

        // Create particles periodically
        setInterval(createParticle, 300);

        // Smooth scrolling for navigation links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });

        // Intersection Observer for animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);

        // Observe all feature cards and stat items
        document.querySelectorAll('.feature-card, .stat-item').forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(el);
        });

        // Add hover effect to buttons
        document.querySelectorAll('.btn').forEach(btn => {
            btn.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-3px) scale(1.05)';
            });
            
            btn.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0) scale(1)';
            });
        });

        // Counter animation for stats
        function animateCounter(element, target) {
            let current = 0;
            const increment = target / 100;
            const timer = setInterval(() => {
                current += increment;
                if (current >= target) {
                    current = target;
                    clearInterval(timer);
                }
                
                if (element.textContent.includes('k')) {
                    element.textContent = Math.floor(current / 1000) + 'k+';
                } else if (element.textContent.includes('.')) {
                    element.textContent = current.toFixed(1) + '%';
                } else if (element.textContent.includes('/')) {
                    element.textContent = '24/7';
                } else {
                    element.textContent = Math.floor(current) + '+';
                }
            }, 20);
        }

        // Start counter animation when stats come into view
        const statsObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const number = entry.target.querySelector('.stat-number');
                    const text = number.textContent;
                    let target = 0;
                    
                    if (text.includes('99.9')) target = 99.9;
                    else if (text.includes('10k')) target = 10000;
                    else if (text.includes('50')) target = 50;
                    else if (text.includes('24')) return; // Skip 24/7
                    
                    if (target > 0) {
                        number.textContent = '0';
                        animateCounter(number, target);
                    }
                    
                    statsObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        document.querySelectorAll('.stat-item').forEach(item => {
            statsObserver.observe(item);
        });
    </script>
</body>
</html>`);
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
