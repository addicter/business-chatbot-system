<!DOCTYPE html>
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
                    <li><a href="/admin" class="nav-link">Get Started</a></li>
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
                    <a href="/admin" class="btn btn-primary">
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
                <a href="/admin" class="btn btn-primary">
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
</html>
