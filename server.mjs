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
        <a class="btn" href="#features">Features</a>
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
    <p class="sub reveal">Upload PDFs, spreadsheets, and docs. Capture leads. Share secure hash links for chat and analytics. All wrapped in a fast, modern experience.</p>
    <div class="cta-row reveal">
      <a class="btn btn-primary" href="/admin">Create Bot</a>
      <a class="btn" href="#how">See how it works</a>
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
  </header>

  <!-- Features -->
  <section id="features" class="features container">
    <div class="grid">
      <div class="col-4 reveal">
        <div class="feature">
          <div class="icon">📄</div>
          <h3>Multi‑format Uploads</h3>
          <p class="sub">PDF, CSV, TXT, DOCX, XLS, XLSX. Content is chunked and embedded with parallel processing for speed.</p>
        </div>
      </div>
      <div class="col-4 reveal">
        <div class="feature">
          <div class="icon">🔐</div>
          <h3>Secure Hash Links</h3>
          <p class="sub">Unique chat and analytics URLs per business; no guessable slugs. Simple to share, safe by default.</p>
        </div>
      </div>
      <div class="col-4 reveal">
        <div class="feature">
          <div class="icon">🎯</div>
          <h3>Built‑in Lead Capture</h3>
          <p class="sub">Convert conversations into contacts with a lightweight form and optional notifications.</p>
        </div>
      </div>
      <div class="col-6 reveal">
        <div class="feature">
          <div class="icon">📊</div>
          <h3>Analytics that Matter</h3>
          <p class="sub">Monitor conversations, sessions, and conversions over time via dedicated dashboards.</p>
        </div>
      </div>
      <div class="col-6 reveal">
        <div class="feature">
          <div class="icon">⚡️</div>
          <h3>App‑Runner Friendly</h3>
          <p class="sub">Predictable temp storage (<code>/tmp/uploads</code>) and parallel chunking keep requests under 120s.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- How it works -->
  <section id="how" class="steps container">
    <div class="timeline">
      <div class="step reveal">
        <div class="num">1</div>
        <div>
          <h4>Create your bot</h4>
          <p>Head to <strong>/admin</strong> and fill in your business details. You’ll get secure chat & analytics URLs instantly.</p>
        </div>
      </div>
      <div class="step reveal">
        <div class="num">2</div>
        <div>
          <h4>Upload files</h4>
          <p>Drop PDFs, spreadsheets, and docs. We parse, chunk, and embed in parallel for fast, relevant retrieval.</p>
        </div>
      </div>
      <div class="step reveal">
        <div class="num">3</div>
        <div>
          <h4>Share & convert</h4>
          <p>Share your chat link, answer questions, and capture leads. Track performance on the analytics page.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Callout -->
  <div class="container">
    <div class="callout reveal" role="region" aria-label="Quick links">
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
        <div class="icon" style="width:42px;height:42px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(135deg,var(--brand-1),var(--brand-2));color:#0b1020;font-weight:800">🚀</div>
        <div>
          <div style="font-weight:700;">Spin up your bot in minutes</div>
          <div class="sub">Diagnostics included for peace of mind.</div>
        </div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <a class="btn" href="/debug/test-openai">Test OpenAI</a>
        <a class="btn" href="/debug/test-dynamodb">Test DynamoDB</a>
        <a class="btn" href="/health">Health</a>
        <a class="btn btn-primary" href="/admin">Create Bot</a>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <footer class="container">
    <div class="links">
      <span>© <span id="year"></span> Business Chatbot</span> ·
      <a href="/admin">Admin</a>
      <a href="/chat/example" aria-disabled="true" onclick="return false">Live Chat (demo)</a>
      <a href="#features">Features</a>
      <a href="#how">How it works</a>
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
