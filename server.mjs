<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Business Chatbot System — 2025</title>
  <meta name="description" content="Create intelligent chatbots with file uploads, lead capture, and analytics." />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0b1020; /* base background */
      --bg-muted: #0e1327;
      --card: rgba(255, 255, 255, 0.06);
      --card-hover: rgba(255, 255, 255, 0.1);
      --text: #e8ecff;
      --muted: #a5b0d6;
      --brand-1: #7c4dff; /* hyper purple */
      --brand-2: #00d4ff; /* neon cyan */
      --ok: #30d158;
      --warn: #ffd60a;
      --danger: #ff453a;
      --radius: 18px;
      --shadow-1: 0 10px 30px rgba(0,0,0,0.35);
    }

    /* Light theme */
    :root.light {
      --bg: #f7f9ff;
      --bg-muted: #eef2ff;
      --card: rgba(14, 19, 39, 0.05);
      --card-hover: rgba(14, 19, 39, 0.09);
      --text: #0b1020;
      --muted: #42507a;
      --shadow-1: 0 10px 30px rgba(20,40,120,0.12);
    }

    * { box-sizing: border-box; }
    html, body { height: 100%; }
    body {
      margin: 0;
      font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji";
      color: var(--text);
      background: radial-gradient(1200px 800px at 10% -10%, rgba(124,77,255,0.25), transparent 40%),
                  radial-gradient(800px 600px at 110% 10%, rgba(0,212,255,0.25), transparent 40%),
                  linear-gradient(180deg, var(--bg) 0%, var(--bg-muted) 100%);
      overflow-x: hidden;
    }

    /* Animated aurora bands */
    .aurora {
      position: fixed; inset: -30vmax; pointer-events: none; filter: blur(40px); opacity: .55;
      background: conic-gradient(from 180deg at 50% 50%, rgba(124,77,255,.35), rgba(0,212,255,.28), rgba(124,77,255,.35));
      animation: swirl 18s linear infinite;
      transform-origin: 50% 50%;
      z-index: 0;
    }
    @keyframes swirl { to { transform: rotate(360deg) scale(1.02); } }

    /* Subtle noise overlay for texture */
    .noise { position: fixed; inset: 0; pointer-events: none; opacity: .05; z-index: 0; background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="140" height="140" viewBox="0 0 140 140"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(%23n)" opacity="0.5"/></svg>'); mix-blend-mode: soft-light; }

    /* Navigation */
    .nav {
      position: sticky; top: 0; z-index: 100; backdrop-filter: saturate(140%) blur(10px);
      background: linear-gradient(180deg, rgba(10, 12, 28, .6), rgba(10, 12, 28, 0));
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .nav-inner { max-width: 1200px; margin: 0 auto; padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; }
    .brand { display: flex; gap: 12px; align-items: center; text-decoration: none; color: var(--text); }
    .brand-logo { width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, var(--brand-1), var(--brand-2)); box-shadow: var(--shadow-1); position: relative; }
    .brand-logo::after { content: ""; position: absolute; inset: 2px; border-radius: 8px; background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.55), transparent 40%); mix-blend-mode: screen; }
    .brand-name { font-weight: 800; letter-spacing: .2px; }

    .nav-cta { display: flex; gap: 10px; align-items: center; }
    .btn { --pad: 12px 18px; padding: var(--pad); border-radius: 999px; border: 1px solid rgba(255,255,255,0.12); color: var(--text); background: var(--card); text-decoration: none; font-weight: 600; display: inline-flex; align-items: center; gap: 10px; transition: transform .15s ease, background .2s ease, border-color .2s ease; }
    .btn:hover { transform: translateY(-1px); background: var(--card-hover); border-color: rgba(255,255,255,0.18); }
    .btn-primary { background: linear-gradient(90deg, var(--brand-1), var(--brand-2)); border: none; color: #0b1020; }
    .btn-primary:hover { filter: saturate(110%); }
    .theme-toggle { cursor: pointer; border: none; background: var(--card); color: var(--text); padding: 10px 12px; border-radius: 999px; display: inline-flex; align-items: center; gap: 8px; }

    /* Layout */
    .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; position: relative; z-index: 1; }

    /* Hero */
    .hero { padding: 88px 0 36px; text-align: center; }
    .headline { font-size: clamp(34px, 5vw, 62px); line-height: 1.05; font-weight: 900; letter-spacing: -0.02em; margin: 8px auto 14px; max-width: 980px; }
    .headline .grad { background: linear-gradient(90deg, var(--brand-2), var(--brand-1)); -webkit-background-clip: text; background-clip: text; color: transparent; }
    .sub { font-size: clamp(16px, 2vw, 20px); color: var(--muted); max-width: 760px; margin: 0 auto 26px; }

    .cta-row { display: flex; gap: 12px; justify-content: center; align-items: center; flex-wrap: wrap; margin-top: 26px; }
    .pill { display: inline-flex; gap: 8px; align-items: center; font-size: 14px; padding: 8px 12px; border-radius: 999px; background: rgba(0,212,255,0.1); border: 1px solid rgba(0,212,255,0.25); color: var(--text); }

    /* Product mock card */
    .demo { margin: 48px auto 0; display: grid; grid-template-columns: 1.15fr .85fr; gap: 26px; align-items: center; }
    @media (max-width: 1000px){ .demo { grid-template-columns: 1fr; } }

    .glass-card { background: var(--card); border: 1px solid rgba(255,255,255,0.08); border-radius: var(--radius); box-shadow: var(--shadow-1); overflow: hidden; position: relative; isolation: isolate; }
    .glass-card::before { content: ""; position: absolute; inset: -30%; background: radial-gradient(600px 300px at 0% 0%, rgba(124,77,255,0.35), transparent 60%), radial-gradient(500px 260px at 120% 100%, rgba(0,212,255,0.35), transparent 60%); filter: blur(40px); opacity: .4; z-index: -1; }
    .card-header { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.06); }
    .dot { width: 10px; height: 10px; border-radius: 50%; background: #ff5f57; box-shadow: 18px 0 0 #febc2e, 36px 0 0 #28c840; opacity: .9; }
    .chat { padding: 18px; display: grid; gap: 14px; max-height: 380px; overflow: auto; scroll-behavior: smooth; }
    .msg { display: grid; gap: 6px; align-items: start; grid-template-columns: 36px 1fr; }
    .avatar { width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, var(--brand-1), var(--brand-2)); }
    .bubble { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); padding: 12px 14px; border-radius: 14px; }
    .bubble.user { background: rgba(0, 212, 255, 0.12); border-color: rgba(0, 212, 255, 0.2); }

    .stat { display: grid; grid-template-columns: auto 1fr; gap: 10px; align-items: center; padding: 14px 16px; border-top: 1px dashed rgba(255,255,255,0.08); }
    .stat strong { font-size: 22px; letter-spacing: .2px; }
    .spark { width: 100%; height: 54px; }

    /* Features */
    section.features { padding: 70px 0 20px; }
    .grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 22px; }
    .col-4 { grid-column: span 4; }
    .col-6 { grid-column: span 6; }
    @media (max-width: 1000px) { .col-4, .col-6 { grid-column: span 12; } }

    .feature { padding: 20px; border-radius: var(--radius); background: var(--card); border: 1px solid rgba(255,255,255,.08); transition: transform .18s ease, background .2s ease; position: relative; overflow: hidden; }
    .feature:hover { transform: translateY(-2px); background: var(--card-hover); }
    .feature .icon { width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; background: linear-gradient(135deg, var(--brand-2), var(--brand-1)); color: #0b1020; font-weight: 800; }

    /* Timeline */
    .steps { padding: 70px 0; }
    .timeline { position: relative; margin: 0 auto; max-width: 900px; }
    .timeline::before { content: ""; position: absolute; left: 24px; top: 0; bottom: 0; width: 2px; background: linear-gradient(180deg, var(--brand-2), var(--brand-1)); opacity: .4; }
    .step { display: grid; grid-template-columns: 48px 1fr; gap: 18px; padding: 16px 0; }
    .step .num { width: 48px; height: 48px; border-radius: 12px; display: grid; place-items: center; font-weight: 800; background: linear-gradient(135deg, var(--brand-1), var(--brand-2)); color: #0b1020; box-shadow: var(--shadow-1); }
    .step h4 { margin: 4px 0 6px; font-size: 18px; }
    .step p { margin: 0; color: var(--muted); }

    /* Callout */
    .callout { margin: 70px 0; padding: 22px; border-radius: var(--radius); background: linear-gradient(90deg, rgba(124,77,255,.16), rgba(0,212,255,.14)); border: 1px solid rgba(255,255,255,.12); display: flex; align-items: center; gap: 18px; flex-wrap: wrap; justify-content: space-between; }

    /* Footer */
    footer { padding: 50px 0; color: var(--muted); border-top: 1px solid rgba(255,255,255,.06); }
    .links { display: flex; gap: 16px; flex-wrap: wrap; }
    .links a { color: var(--muted); text-decoration: none; border-bottom: 1px dashed transparent; }
    .links a:hover { border-color: var(--muted); }

    /* Reveal on scroll */
    .reveal { opacity: 0; transform: translateY(12px); transition: opacity .6s ease, transform .6s ease; }
    .reveal.show { opacity: 1; transform: translateY(0); }

    /* Reduce motion */
    @media (prefers-reduced-motion: reduce) {
      .aurora { animation: none; }
      .reveal { transition: none; opacity: 1; transform: none; }
    }
  /* Business-first sections */
    .logo-row { display:flex; gap:18px; justify-content:center; align-items:center; flex-wrap:wrap; opacity:.95; padding: 12px 0 0; }
    .logo { padding: 8px 12px; border-radius: 12px; background: var(--card); border: 1px solid rgba(255,255,255,.08); color: var(--muted); font-weight: 700; letter-spacing: .2px; }

    section.benefits { padding: 70px 0 20px; }
    section.solutions { padding: 70px 0 20px; }

    section.testimonials { padding: 70px 0; }
    .testimonial { padding: 22px; border-radius: var(--radius); background: var(--card); border: 1px solid rgba(255,255,255,.08); }
    .testimonial .quote { font-size: 18px; line-height: 1.5; }
    .testimonial .author { margin-top: 10px; color: var(--muted); font-size: 14px; }

    .pricing-strip { margin: 60px 0; padding: 28px; border-radius: var(--radius); background: linear-gradient(90deg, rgba(124,77,255,.16), rgba(0,212,255,.14)); border: 1px solid rgba(255,255,255,.12); display:flex; justify-content: space-between; align-items:center; gap:16px; flex-wrap:wrap; }

    .faq { padding: 30px 0 70px; }
    .faq details { background: var(--card); border: 1px solid rgba(255,255,255,.08); border-radius: var(--radius); padding: 14px 16px; margin: 12px 0; }
    .faq summary { cursor: pointer; font-weight: 600; }
    .faq p { color: var(--muted); margin: 10px 0 0; }
  </style>
</head>
<body>
  <div class="aurora" aria-hidden="true"></div>
  <div class="noise" aria-hidden="true"></div>

  <!-- Nav -->
  <nav class="nav" role="navigation">
    <div class="nav-inner">
      <a class="brand" href="#" aria-label="Business Chatbot home">
        <div class="brand-logo" aria-hidden="true"></div>
        <div class="brand-name">Business Chatbot</div>
      </a>
      <div class="nav-cta">
        <button class="theme-toggle" id="themeToggle" aria-label="Toggle theme">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 3a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1Zm0 15a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8-5a1 1 0 0 1 1 1 1 1 0 1 1-1-1Zm-8 8a1 1 0 0 1 1-1h0a1 1 0 1 1-1 1ZM4 12a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm.64-6.36a1 1 0 0 1 1.41 0l.71.71a1 1 0 1 1-1.41 1.41l-.71-.71a1 1 0 0 1 0-1.41Zm13.3 0a1 1 0 0 1 0 1.41l-.71.71a1 1 0 1 1-1.41-1.41l.71-.71a1 1 0 0 1 1.41 0ZM5.34 18.36a1 1 0 0 1 0-1.41l.71-.71a1 1 0 0 1 1.41 1.41l-.71.71a1 1 0 0 1-1.41 0Zm12.02-2.12.71.71a1 1 0 1 1-1.41 1.41l-.71-.71a1 1 0 0 1 1.41-1.41Z" fill="currentColor"/></svg>
          Theme
        </button>
        <a class="btn" href="#benefits">Benefits</a>
        <a class="btn" href="#pricing">Pricing</a>
        <a class="btn btn-primary" href="/admin">Create Bot</a>
      </div>
    </div>
  </nav>

  <!-- Hero -->
  <header class="hero container">
    <span class="pill" aria-label="Runtime‑ready">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M20 7 9 18l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      Ready for production
    </span>
    <h1 class="headline reveal">Build <span class="grad">sleek, smart</span> business chatbots from your files.</h1>
    <p class="sub reveal">Turn website visitors into customers with an AI assistant trained on your business content. Share secure, branded chat links for campaigns and track impact with a simple analytics view.</p>
    <div class="cta-row reveal">
      <a class="btn btn-primary" href="/admin">Create Bot</a>
      <a class="btn" href="#benefits">See benefits</a>
    </div>

    <div class="demo reveal" aria-label="Product preview">
      <!-- Chat Preview -->
      <section class="glass-card" aria-label="AI chat demo">
        <div class="card-header">
          <div class="dot" aria-hidden="true"></div>
          <strong>Chat</strong>
        </div>
        <div class="chat" id="chatDemo">
          <div class="msg">
            <div class="avatar"></div>
            <div class="bubble">Hi! Ask me anything about Acme Co. I’ve learned from your uploaded docs.</div>
          </div>
          <div class="msg">
            <div class="avatar" style="background:linear-gradient(135deg,#00d4ff,#7c4dff);"></div>
            <div class="bubble user">What are your support hours?</div>
          </div>
          <div class="msg">
            <div class="avatar"></div>
            <div class="bubble">We’re available Monday–Friday, 9am–5pm. Need a callback?</div>
          </div>
        </div>
        <div class="stat">
          <div style="width:42px;height:42px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(135deg,var(--brand-2),var(--brand-1));color:#0b1020;font-weight:800">⚡︎</div>
          <div>
            <div style="font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.12em">Avg. response</div>
            <strong id="ms">128ms</strong>
          </div>
        </div>
      </section>

      <!-- Metrics Preview -->
      <section class="glass-card" aria-label="Analytics preview">
        <div class="card-header">
          <div class="dot" aria-hidden="true"></div>
          <strong>Analytics</strong>
        </div>
        <canvas class="spark" id="spark"></canvas>
        <div class="stat">
          <div style="width:42px;height:42px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(135deg,#30d158,#00d4ff);color:#0b1020;font-weight:800">↑</div>
          <div>
            <div style="font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.12em">30‑day engagement</div>
            <strong id="engage">+142%</strong>
          </div>
        </div>
      </section>
    </div>
    <div class="logo-row reveal" aria-label="Trusted by leading teams">
      <span class="logo">Acme</span>
      <span class="logo">Nimbus</span>
      <span class="logo">Orion</span>
      <span class="logo">Helix</span>
      <span class="logo">Lumen</span>
    </div>
  </header>

  <!-- Features -->
  <section id="benefits" class="benefits container">
    <div class="grid">
      <div class="col-4 reveal">
        <div class="feature">
          <div class="icon">💬</div>
          <h3>Instant Answers</h3>
          <p class="sub">Reduce drop‑offs by answering visitor questions 24/7—right on your site or via a shareable link.</p>
        </div>
      </div>
      <div class="col-4 reveal">
        <div class="feature">
          <div class="icon">📈</div>
          <h3>More Leads</h3>
          <p class="sub">Turn conversations into qualified leads with a simple, friendly form at the right moment.</p>
        </div>
      </div>
      <div class="col-4 reveal">
        <div class="feature">
          <div class="icon">🤝</div>
          <h3>Better Customer Experience</h3>
          <p class="sub">Consistent answers from your content keep prospects confident and moving forward.</p>
        </div>
      </div>
      <div class="col-6 reveal">
        <div class="feature">
          <div class="icon">📣</div>
          <h3>Campaign‑Ready</h3>
          <p class="sub">Share branded chat links in ads, emails, or QR codes and track the impact with a clean overview.</p>
        </div>
      </div>
      <div class="col-6 reveal">
        <div class="feature">
          <div class="icon">🛡️</div>
          <h3>Trust & Compliance</h3>
          <p class="sub">Privacy‑minded by design with clear controls for what’s shown to customers.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- How it works -->
  <section id="solutions" class="solutions container">
    <div class="grid">
      <div class="col-4 reveal">
        <div class="feature">
          <div class="icon">🏥</div>
          <h3>Healthcare</h3>
          <p class="sub">Guide patients to the right service, hours, and plans—no long waits.</p>
        </div>
      </div>
      <div class="col-4 reveal">
        <div class="feature">
          <div class="icon">🏦</div>
          <h3>Financial Services</h3>
          <p class="sub">Answer product questions and capture high‑intent leads with audit‑friendly records.</p>
        </div>
      </div>
      <div class="col-4 reveal">
        <div class="feature">
          <div class="icon">🏗️</div>
          <h3>Real Estate</h3>
          <p class="sub">Qualify buyers and schedule viewings with instant, accurate listing answers.</p>
        </div>
      </div>
      <div class="col-4 reveal">
        <div class="feature">
          <div class="icon">🛍️</div>
          <h3>E‑commerce</h3>
          <p class="sub">Reduce returns and increase checkout by answering sizing, shipping, and policy questions.</p>
        </div>
      </div>
      <div class="col-4 reveal">
        <div class="feature">
          <div class="icon">🎓</div>
          <h3>Education</h3>
          <p class="sub">Support admissions and learners with fast guidance across programs and deadlines.</p>
        </div>
      </div>
      <div class="col-4 reveal">
        <div class="feature">
          <div class="icon">🔧</div>
          <h3>B2B Services</h3>
          <p class="sub">Turn knowledge bases into a helpful assistant that brings in meetings—not tickets.</p>
        </div>
      </div>
    </div>
  </section>

  <section class="testimonials container" id="stories">
    <div class="grid">
      <div class="col-4 reveal">
        <div class="testimonial">
          <div class="quote">“Leads from our website doubled within two weeks. The assistant answers like our best rep.”</div>
          <div class="author">— Priya K., Growth Lead</div>
        </div>
      </div>
      <div class="col-4 reveal">
        <div class="testimonial">
          <div class="quote">“Customers get clarity instantly. Our sales calls are now about pricing and timelines, not basics.”</div>
          <div class="author">— Marco D., Sales Director</div>
        </div>
      </div>
      <div class="col-4 reveal">
        <div class="testimonial">
          <div class="quote">“Setup was fast and the experience feels on‑brand across campaigns.”</div>
          <div class="author">— Aisha R., Marketing Manager</div>
        </div>
      </div>
    </div>
  </section>

  <section id="pricing" class="container">
    <div class="pricing-strip reveal" role="region" aria-label="Get started">
      <div>
        <div style="font-weight:700; font-size: 20px;">Start turning conversations into customers</div>
        <div class="sub">Launch in minutes. Upgrade any time.</div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <a class="btn btn-primary" href="/admin">Get Started</a>
        <a class="btn" href="#faq">FAQs</a>
      </div>
    </div>
  </section>

  <section class="faq container" id="faq">
    <details class="reveal">
      <summary>Can I use it without a developer?</summary>
      <p>Yes. Upload your existing content and share your chat link—no code required.</p>
    </details>
    <details class="reveal">
      <summary>Does it match my brand?</summary>
      <p>Customize the welcome message and colors so the experience feels like yours.</p>
    </details>
    <details class="reveal">
      <summary>Where does it work?</summary>
      <p>Embed on your site, share in campaigns, or use the standalone chat link.</p>
    </details>
  </section>

  <!-- Footer -->
  <footer class="container">
    <div class="links">
      <span>© <span id="year"></span> Business Chatbot</span> ·
      <a href="#benefits">Benefits</a>
      <a href="#solutions">Solutions</a>
      <a href="#pricing">Pricing</a>
      <a href="#faq">FAQ</a>
      <a href="#">Privacy</a>
      <a href="#">Terms</a>
    </div>
  </footer>

  <script>
    // Theme toggle with persistence
    const root = document.documentElement;
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') root.classList.add('light');
    document.getElementById('themeToggle').addEventListener('click', () => {
      root.classList.toggle('light');
      localStorage.setItem('theme', root.classList.contains('light') ? 'light' : 'dark');
    });

    // Reveal on scroll
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('show'); });
    }, { threshold: 0.08 });
    document.querySelectorAll('.reveal').forEach(el => io.observe(el));

    // Dynamic year
    document.getElementById('year').textContent = new Date().getFullYear();

    // Tiny sparkline chart (no deps)
    (function sparkline(){
      const c = document.getElementById('spark');
      const dpr = window.devicePixelRatio || 1;
      const w = c.clientWidth, h = c.clientHeight; c.width = w * dpr; c.height = h * dpr; const ctx = c.getContext('2d'); ctx.scale(dpr, dpr);
      const pts = Array.from({length: 40}, (_,i) => {
        const t = i/39; return [t*w, h*0.6 - Math.sin(t*3.2 + 0.5)*h*0.22 - Math.random()*8];
      });
      // gradient stroke
      const g = ctx.createLinearGradient(0,0,w,0); g.addColorStop(0,'#00d4ff'); g.addColorStop(1,'#7c4dff');
      ctx.lineWidth = 2; ctx.strokeStyle = g; ctx.beginPath();
      pts.forEach(([x,y],i)=> i? ctx.lineTo(x,y): ctx.moveTo(x,y)); ctx.stroke();
      // fill area
      const y0 = h-2; ctx.lineTo(w,y0); ctx.lineTo(0,y0); ctx.closePath();
      ctx.fillStyle = 'rgba(124,77,255,0.12)'; ctx.fill();
    })();

    // Fun: fake response time counter animation
    (function counter(){
      const el = document.getElementById('ms');
      let v = 240; const target = 128; const step = () => { v -= Math.max(1, Math.round((v-target)/12)); el.textContent = v+"ms"; if (v>target) requestAnimationFrame(step); }; step();
    })();

    // Auto-scroll chat demo
    (function chatScroll(){
      const el = document.getElementById('chatDemo');
      setTimeout(()=> el.scrollTo({top: el.scrollHeight, behavior: 'smooth'}), 600);
    })();
  </script>
</body>
</html>
