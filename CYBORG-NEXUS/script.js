function initHeroParticles(){
  try{
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvasEl = document.querySelector('#heroParticles canvas');
    if (!window.tsParticles || !window.tsParticles.load) return;
    window.tsParticles.load('heroParticles', window.__CYBORG_PARTICLES_CONFIG__ || {});
  } catch(e) {
    // no-op
  }
}

// Fallback: load config and init after DOM is ready
(function(){
  function injectConfigAndInit(){
    fetch('particles-config.json')
      .then(r => r.ok ? r.json() : null)
      .then(cfg => {
        window.__CYBORG_PARTICLES_CONFIG__ = cfg || null;
        if (window.tsParticles && window.tsParticles.load) {
          window.tsParticles.load('heroParticles', cfg || {
            fpsLimit: 60,
            particles: {
              number: { value: 70, density: { enable: true, area: 800 } },
              color: { value: '#00ffe1' },
              links: { enable: true, color: '#00ffe1', distance: 160, opacity: 0.5, width: 1 },
              move: { enable: true, speed: 1.2, direction: 'none', random: false, straight: false, outModes: { default: 'out' } },
              opacity: { value: 0.55 },
              shape: { type: 'circle' },
              size: { value: { min: 1, max: 3 } },
              collisions: { enable: false }
            },
            interactivity: {
              detectsOn: 'canvas',
              events: { onHover: { enable: true, mode: 'repulse' }, resize: true }
            }
          });
        }
      })
      .catch(() => {
        if (window.tsParticles && window.tsParticles.load) {
          window.tsParticles.load('heroParticles', {
            fpsLimit: 60,
            particles: {
              color: { value: '#00ffe1' },
              links: { enable: true, color: '#00ffe1', distance: 160, opacity: 0.5, width: 1 },
              collisions: { enable: false },
              move: { enable: true, speed: 1.2, direction: 'none', random: false, straight: false, outModes: { default: 'out' } },
              number: { value: 70, density: { enable: true, area: 800 } },
              opacity: { value: 0.55 },
              shape: { type: 'circle' },
              size: { value: { min: 1, max: 3 } }
            },
            interactivity: {
              detectsOn: 'canvas',
              events: { onHover: { enable: true, mode: 'repulse' }, resize: true },
              modes: { repulse: { distance: 120, duration: 0.4 } }
            },
            background: { color: { value: '#00000000' } },
            detectRetina: true
          });
        }
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectConfigAndInit);
  } else {
    injectConfigAndInit();
  }
})();

function scrollDown(){
  const about = document.getElementById('about');
  if (!about) return;
  about.scrollIntoView({ behavior: 'smooth' });
}

function animateMetrics(){
  const items = document.querySelectorAll('.metricCount[data-target]');
  if (!items || !items.length) return;

  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) {
    items.forEach(el => {
      const target = el.getAttribute('data-target');
      if (target != null) el.textContent = target;
    });
    return;
  }

  const section = document.getElementById('stats');
  const start = () => {
    items.forEach((el, idx) => {
      const targetRaw = el.getAttribute('data-target');
      const target = Number(targetRaw);
      if (!Number.isFinite(target)) return;

      const duration = 1500 + idx * 150;
      const format = el.getAttribute('data-format') || '';

      const startTime = performance.now();
      const tick = (t) => {
        const p = Math.min(1, (t - startTime) / duration);
        const value = target * p;

        if (format === 'compact') {
          if (value < 250000) el.textContent = '';
          else el.textContent = '1M';
        } else {
          el.textContent = p < 0.06 ? '' : String(Math.round(value * 10) / 10);
        }

        if (p < 1) requestAnimationFrame(tick);
        else {
          if (format === 'compact') el.textContent = target >= 1000000 ? '1M' : String(target);
          else el.textContent = String(target);
        }
      };

      requestAnimationFrame(tick);
    });
  };

  if (section && 'IntersectionObserver' in window) {
    const obs = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          start();
          obs.disconnect();
          break;
        }
      }
    }, { threshold: 0.25 });
    obs.observe(section);
  } else {
    start();
  }
}

(function initLoginAndChat(){
  const loginForm = document.getElementById('loginForm');

  const contactForm = document.getElementById('contactForm');
  const contactStatus = document.getElementById('contactStatus');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(contactForm);
      const name = String(formData.get('name') || '').trim();
      const email = String(formData.get('email') || '').trim();

      if (!name || !email) {
        if (contactStatus) contactStatus.textContent = 'Missing fields. Enter your Name and Email.';
        return;
      }

      if (contactStatus) {
        contactStatus.textContent = `Thank you, ${name}. Connection request queued for ${email}.`;
      }

      contactForm.reset();

      if (contactStatus) contactStatus.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  const loginStatus = document.getElementById('loginStatus');
  const sendBtn = document.getElementById('sendBtn');
  const chatInput = document.getElementById('chatInput');
  const chatForm = document.getElementById('chatForm');
  const chatLog = document.getElementById('chatLog');
  const chatHint = document.getElementById('chatHint');

  let isAuthed = false;

  function now(){
    return new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
  }

  function escapeHtml(str){
    return String(str)
      .replaceAll('&','&amp;')
      .replaceAll('<','<')
      .replaceAll('>','>')
      .replaceAll('"','"')
      .replaceAll("'",'&#039;');
  }

  function appendMsg(text, role){
    if (role === 'ai' && typeof text === 'string') {
      const holder = document.createElement('div');
      holder.style.margin = '6px 0';
      holder.style.padding = '10px 12px';
      holder.style.borderRadius = '10px';
      holder.style.border = '1px solid var(--border)';
      holder.style.background = 'rgba(255,255,255,0.03)';
      holder.style.color = 'var(--text)';
      holder.style.wordBreak = 'break-word';

      holder.innerHTML = `
        <div style="font-size:0.85rem;color:var(--muted);margin-bottom:4px;">NEXUS • ${now()}</div>
        <div id="aiTyping" style="white-space:pre-wrap;">&nbsp;</div>
      `;

      chatLog.appendChild(holder);
      chatLog.scrollTop = chatLog.scrollHeight;

      const aiText = escapeHtml(text);
      const aiTyping = holder.querySelector('#aiTyping');
      const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      let i = 0;

      const interval = setInterval(() => {
        i += 1;
        aiTyping.innerHTML = aiText.slice(0, i);
        if (reduceMotion || i >= aiText.length) {
          clearInterval(interval);
          aiTyping.innerHTML = aiText;
        }
      }, reduceMotion ? 0 : 12);

      return;
    }

    const entry = document.createElement('div');
    entry.style.margin = '6px 0';
    entry.style.padding = '10px 12px';
    entry.style.borderRadius = '10px';
    entry.style.border = '1px solid var(--border)';
    entry.style.background = role === 'user' ? 'rgba(0,255,225,0.08)' : 'rgba(255,255,255,0.03)';
    entry.style.color = 'var(--text)';
    entry.style.wordBreak = 'break-word';

    const label = role === 'user' ? 'Operator' : 'NEXUS';
    entry.innerHTML = `
      <div style="font-size:0.85rem;color:var(--muted);margin-bottom:4px;">${label} • ${now()}</div>
      <div>${escapeHtml(text)}</div>
    `;

    chatLog.appendChild(entry);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  function setAuthed(state){
    isAuthed = state;
    if (sendBtn) sendBtn.disabled = !isAuthed;
    if (chatInput) chatInput.disabled = !isAuthed;
    if (chatHint) chatHint.textContent = isAuthed ? 'Session armed. Ask the AI console.' : 'Login is required to send messages.';
  }

  if (sendBtn) sendBtn.disabled = true;
  if (chatInput) chatInput.disabled = true;

  if (chatLog && chatLog.children.length === 0) {
    appendMsg('Secure console online. Awaiting operator authentication.', 'ai');
  }

  function fakeBotReply(userText){
    const tRaw = String(userText);
    const t = tRaw.trim().toLowerCase();
    if (!t) return 'Awaiting command.';

    if (t === 'system status' || t.includes('system status')) {
      return 'All systems operational. Network stability 99.99%. No critical anomalies detected.';
    }
    if (t === 'neural scan' || t.includes('neural scan')) {
      return '1,024,000 nodes synchronized. Neural pathways functioning within optimal parameters.';
    }
    if (t === 'ai integration' || t.includes('ai integration')) {
      return 'Human-machine synchronization active. Adaptive learning systems online.';
    }
    if (t === 'optimize grid' || t.includes('optimize grid') || t.includes('optimize')) {
      return 'Optimization sequence initiated. Signal efficiency increased by 12%.';
    }
    if (t === 'security check' || t.includes('security check') || t.includes('security')) {
      return 'No security threats detected. Quantum encryption active.';
    }
    if (t === 'global network' || t.includes('global network') || t.includes('global') || t.includes('network')) {
      return '12,847 active operators connected across global AI hubs.';
    }

    if (t.includes('hello') || t.includes('hi') || t.includes('hey')) {
      return 'Hello, operator. Neural channels are online. What should we query next: system status, AI integration, or grid optimization?';
    }

    if (t.includes('status') || t.includes('system') || t.includes('uptime') || t.includes('latency')) {
      return 'System status: nominal. Latency within thresholds. Sync grid stable. No critical alerts detected. Choose: diagnostics or optimization.';
    }

    if (t.includes('help') || t.includes('commands') || t.includes('what can you do') || t.includes('how')) {
      return 'Available intents: "system status", "ai integration", "explain", "optimize grid". Ask any Cyborg Nexus question and I’ll respond with a simulated operational brief.';
    }

    if (t.includes('ai') || t.includes('integration') || t.includes('neural') || t.includes('explain') || t.includes('what is') || t.includes('how does')) {
      return 'AI Integration (simulated): an adaptive decision engine that fuses operator intent with real-time feedback loops. It cross-checks context, reduces uncertainty, and keeps an explainable decision trail. What outcome are you targeting—stability, accuracy, or speed?';
    }

    return `Command received: "${tRaw.trim()}". Interpreting intent and generating a simulated response brief.`;
  }

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(loginForm);
      const operatorId = formData.get('operatorId');
      const accessKey = formData.get('accessKey');

      if (!operatorId || !accessKey) {
        if (loginStatus) loginStatus.textContent = 'Missing credentials. Provide Operator ID and Access Key.';
        setAuthed(false);
        return;
      }

      if (loginStatus) loginStatus.textContent = `Operator ${operatorId} authenticated. Session established.`;
      setAuthed(true);
      appendMsg(`Authenticated as ${operatorId}.`, 'user');
      if (chatInput) chatInput.focus();
    });
  }

  if (chatForm) {
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!isAuthed) {
        if (chatHint) chatHint.textContent = 'Login is required to send messages.';
        return;
      }
      const text = chatInput.value;
      if (!text.trim()) return;

      appendMsg(text, 'user');
      chatInput.value = '';
      if (chatHint) chatHint.textContent = 'Thinking...';

      setTimeout(() => {
        const reply = fakeBotReply(text);
        appendMsg(reply, 'ai');
        if (chatHint) chatHint.textContent = 'Session armed. Ask the AI console.';
      }, 450);
    });
  }

})();

(function initLoginAndChatOperatorTicker(){
  const loginForm = document.getElementById('loginForm');
  if (!loginForm) return;

  const loginStatus = document.getElementById('loginStatus');
  const operatorInput = loginForm.querySelector('input[name="operatorId"]');
  const keyInput = loginForm.querySelector('input[name="accessKey"]');
  if (!operatorInput || !keyInput || !loginStatus) return;

  function statusTicker(){
    const ok = operatorInput.value.trim().length > 0 && keyInput.value.trim().length > 0;
    loginStatus.textContent = ok ? 'Credentials loaded. Initiate session when ready.' : 'Enter credentials to arm the console.';
  }

  operatorInput.addEventListener('input', statusTicker);
  keyInput.addEventListener('input', statusTicker);
  statusTicker();
})();

(function initChatCommandChips(){
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');
  if (!chatForm || !chatInput) return;

  const commands = [
    { label: 'System Status', text: 'System Status' },
    { label: 'Neural Scan', text: 'Neural Scan' },
    { label: 'AI Integration', text: 'AI Integration' },
    { label: 'Optimize Grid', text: 'Optimize Grid' },
    { label: 'Security Check', text: 'Security Check' },
    { label: 'Global Network', text: 'Global Network' },
  ];

  const chipsWrapId = 'commandChips';
  let wrap = document.getElementById(chipsWrapId);

  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = chipsWrapId;
    wrap.style.display = 'flex';
    wrap.style.flexWrap = 'wrap';
    wrap.style.gap = '10px';
    wrap.style.marginTop = '14px';
    wrap.style.justifyContent = 'center';

    const chatShell = document.getElementById('chatShell');
    const hintEl = document.getElementById('chatHint');
    if (chatShell) {
      if (hintEl && hintEl.parentElement) chatShell.insertBefore(wrap, hintEl);
      else chatShell.appendChild(wrap);
    }
  }

  wrap.innerHTML = '';
  commands.forEach((c) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cmdChip';
    btn.textContent = c.label;
    btn.setAttribute('aria-label', c.label);
    btn.addEventListener('click', () => {
      chatInput.value = c.text;
      chatInput.dispatchEvent(new Event('input', { bubbles: true }));
      chatForm.requestSubmit();
    });
    wrap.appendChild(btn);
  });
})();

(function initNexusWelcomeAndThinking(){
  const chatLog = document.getElementById('chatLog');
  const chatHint = document.getElementById('chatHint');
  if (!chatLog || !chatHint) return;
  if (chatLog.children.length !== 0) return;

  const msg = document.createElement('div');
  msg.style.margin = '6px 0';
  msg.style.padding = '10px 12px';
  msg.style.borderRadius = '10px';
  msg.style.border = '1px solid var(--border)';
  msg.style.background = 'rgba(255,255,255,0.03)';
  msg.style.color = 'var(--text)';
  msg.style.wordBreak = 'break-word';

  const WELCOME = [
    'NEXUS ONLINE.',
    'Neural synchronization complete.',
    'Awaiting operator command.',
  ];

  msg.innerHTML = `
    <div style="font-size:0.85rem;color:var(--muted);margin-bottom:6px;">NEXUS • ${new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
    <div>${WELCOME.join('<br/>')}</div>
  `;

  chatLog.appendChild(msg);
})();

(function initReveal(){
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;

  const cards = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || cards.length === 0) {
    cards.forEach(el => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }
  }, { threshold: 0.15 });

  cards.forEach(el => observer.observe(el));
})();

function initAchievementsStats(){

  const achSection = document.getElementById('achievements');
  if (!achSection) return;

  const items = Array.from(achSection.querySelectorAll('.achStatVal[data-ach-target]'));
  if (!items.length) return;

  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function formatNumber(n){
    if (!Number.isFinite(n)) return '0';
    return Math.round(n).toLocaleString('en-US');
  }

  function formatCompact(n, suffix){
    if (!Number.isFinite(n)) return '0';
    const rounded = Math.round(n);
    if (rounded < 250000) return '';
    const isMillionish = rounded >= 900000;
    return isMillionish ? '1M' + (suffix || '+') : formatNumber(rounded) + (suffix || '');
  }

  function formatPercent(n, suffix){
    if (!Number.isFinite(n)) return '0';
    const fixed = (Math.round(n * 100) / 100).toFixed(2);
    return fixed + (suffix || '%');
  }

  function animateNumber(el, target, opts, durationMs){
    const { format, suffix } = opts;

    if (reduceMotion) {
      if (format === 'compact') el.textContent = formatCompact(target, suffix);
      else if (format === 'percent') el.textContent = formatPercent(target, suffix);
      else el.textContent = formatNumber(target) + (suffix || '');
      return;
    }

    const startTime = performance.now();
    const startVal = 0;

    function tick(t){
      const p = Math.min(1, (t - startTime) / durationMs);
      const cur = startVal + (target - startVal) * p;

      if (format === 'compact') el.textContent = formatCompact(cur, suffix);
      else if (format === 'percent') el.textContent = p < 0.06 ? '' : formatPercent(cur, suffix);
      else el.textContent = p < 0.06 ? '' : formatNumber(cur) + (suffix || '');

      if (p < 1) requestAnimationFrame(tick);
      else {
        if (format === 'compact') el.textContent = formatCompact(target, suffix);
        else if (format === 'percent') el.textContent = formatPercent(target, suffix);
        else el.textContent = formatNumber(target) + (suffix || '');
      }
    }

    requestAnimationFrame(tick);
  }

  function start(){
    items.forEach((el, idx) => {
      const target = Number(el.getAttribute('data-ach-target'));
      const format = el.getAttribute('data-ach-format') || 'number';
      const suffix = el.getAttribute('data-ach-suffix') || '';
      const durationMs = 1100 + idx * 120;

      if (!Number.isFinite(target)) {
        el.textContent = '0';
        return;
      }

      animateNumber(el, target, { format, suffix }, durationMs);
    });
  }

  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          start();
          obs.disconnect();
          break;
        }
      }
    }, { threshold: 0.2 });

    obs.observe(achSection);
  } else {
    start();
  }
}

function initGlobalAiNetworkMap(){

  const mapSection = document.getElementById('global-ai-network');

  const tooltip = document.getElementById('globalMapTooltip');
  if (!mapSection || !tooltip) return;

  const cityEls = mapSection.querySelectorAll('[data-city]');
  const dotEls = mapSection.querySelectorAll('.cityDot');
  const citiesForHover = dotEls.length ? dotEls : cityEls;

  const cityNameEl = document.getElementById('globalMapTooltipCity');
  const activeEl = document.getElementById('globalMapTooltipActive');
  const connectedEl = document.getElementById('globalMapTooltipConnected');

  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Animate dashboard counters on visibility
  const dashCountEls = Array.from(mapSection.querySelectorAll('.dashCount[data-target]'));
  const started = { value: false };

  function formatConnected(n){
    // Requirement shows: 1,024,000+
    if (!Number.isFinite(n)) return '0';
    return Math.round(n).toLocaleString('en-US') + '+';
  }

  function formatPercent(n){
    if (!Number.isFinite(n)) return '0';
    // keep 2 decimals for the look (99.99%)
    return (Math.round(n * 100) / 100).toFixed(2);
  }

  function animateNumber(el, target, format, durationMs){
    if (reduceMotion){
      if (format === 'compact'){
        el.textContent = '1M';
      } else if (format === 'percent'){
        el.textContent = formatPercent(target) + '%';
      } else {
        el.textContent = target >= 1000 ? Math.round(target).toLocaleString('en-US') : String(Math.round(target));
      }
      return;
    }

    const startTime = performance.now();
    const startVal = 0;

    function tick(t){
      const p = Math.min(1, (t - startTime) / durationMs);
      const cur = startVal + (target - startVal) * p;

      if (format === 'compact'){
        // For connected nodes card: keep 1M+ style
        if (cur < 250000) el.textContent = '';
        else el.textContent = formatConnected(cur);
      } else if (format === 'percent'){
        el.textContent = formatPercent(cur) + '%';
      } else {
        el.textContent = Math.round(cur).toLocaleString('en-US');
      }

      if (p < 1) requestAnimationFrame(tick);
      else {
        // final polish
        if (format === 'compact') el.textContent = formatConnected(target);
        else if (format === 'percent') el.textContent = formatPercent(target) + '%';
        else el.textContent = Math.round(target).toLocaleString('en-US');
      }
    }

    requestAnimationFrame(tick);
  }

  function startDashAnimations(){
    if (started.value) return;
    started.value = true;

    dashCountEls.forEach((el, idx) => {
      const targetRaw = el.getAttribute('data-target');
      const target = Number(targetRaw);
      const format = el.getAttribute('data-format') || '';
      const durationMs = 1200 + idx * 120;

      if (!Number.isFinite(target)){
        el.textContent = '0';
        return;
      }

      animateNumber(el, target, format, durationMs);
    });
  }

  if ('IntersectionObserver' in window){
    const obs = new IntersectionObserver((entries) => {
      for (const entry of entries){
        if (entry.isIntersecting){
          startDashAnimations();
          obs.disconnect();
          break;
        }
      }
    }, { threshold: 0.25 });

    obs.observe(mapSection);
  } else {
    startDashAnimations();
  }

  function hideTooltip(){
    tooltip.setAttribute('aria-hidden', 'true');
  }

  function showTooltipForDot(dot){
    if (!dot) return;

    const city = dot.getAttribute('data-city') || 'City';
    const active = Number(dot.getAttribute('data-active'));
    const connected = Number(dot.getAttribute('data-connected'));

    if (cityNameEl) cityNameEl.textContent = city;
    if (activeEl) activeEl.textContent = Number.isFinite(active) ? Math.round(active).toLocaleString('en-US') : '0';
    if (connectedEl) connectedEl.textContent = Number.isFinite(connected) ? formatConnected(connected) : '0+';

    tooltip.setAttribute('aria-hidden', 'false');

    // Position: use SVG point -> bounding rect; then place tooltip near dot.
    const mapStage = mapSection.querySelector('#mapStage');
    if (!mapStage) return;

    const dotRect = dot.getBoundingClientRect();
    const stageRect = mapStage.getBoundingClientRect();

    // Tooltip is absolutely positioned inside mapStage (via CSS transform)
    // We'll set its left/top relative to stage.
    const left = (dotRect.left - stageRect.left) + dotRect.width / 2;
    const top = (dotRect.top - stageRect.top) + dotRect.height / 2;

    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
  }

  citiesForHover.forEach((dot) => {
    if (!dot) return;

    const onEnter = () => showTooltipForDot(dot);
    const onLeave = () => hideTooltip();

    dot.addEventListener('mouseenter', onEnter);
    dot.addEventListener('mouseleave', onLeave);

    dot.addEventListener('focus', onEnter);
    dot.addEventListener('blur', onLeave);

    // Touch: tap toggles tooltip
    dot.addEventListener('click', () => {
      const isHidden = tooltip.getAttribute('aria-hidden') === 'true';
      if (isHidden) showTooltipForDot(dot);
      else hideTooltip();
    });
  });

  // Hide tooltip when leaving the map panel
  const mapPanel = mapSection.querySelector('.mapPanel');
  if (mapPanel) {
    mapPanel.addEventListener('mouseleave', hideTooltip);
    mapPanel.addEventListener('blur', hideTooltip);
  }
}

function initAchievementsParticles(){
  const shell = document.querySelector('.achHoloShell');
  const canvas = document.getElementById('achParticles');
  if (!shell || !canvas || !canvas.getContext) return;

  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const particles = Array.from({ length: 34 }, () => ({
    x: Math.random() * 1,
    y: Math.random() * 1,
    r: 0.9 + Math.random() * 1.6,
    vx: (Math.random() - 0.5) * 0.18,
    vy: (Math.random() - 0.5) * 0.12,
    alpha: 0.1 + Math.random() * 0.18,
    phase: Math.random() * Math.PI * 2,
  }));

  function resizeCanvas(){
    const rect = shell.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function render(){
    const rect = shell.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.phase += 0.02;
      if (p.x < -20) p.x = rect.width + 20;
      if (p.x > rect.width + 20) p.x = -20;
      if (p.y < -20) p.y = rect.height + 20;
      if (p.y > rect.height + 20) p.y = -20;

      const alpha = Math.max(0.04, p.alpha + Math.sin(p.phase) * 0.06);
      ctx.beginPath();
      ctx.fillStyle = `rgba(0,255,225,${alpha})`;
      ctx.arc(p.x * rect.width, p.y * rect.height, p.r, 0, Math.PI * 2);
      ctx.fill();
    });

    if (!reduceMotion) requestAnimationFrame(render);
  }

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  if (!reduceMotion) requestAnimationFrame(render);
}

function initDashboardInteractions(){
  animateMetrics();
  initAchievementsStats();
  initAchievementsParticles();
  initGlobalAiNetworkMap();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDashboardInteractions);
} else {
  initDashboardInteractions();
}

(function initFeatureAccordion(){
  const featureCards = document.querySelectorAll('#features button.card[data-acc]');
  if (!featureCards.length) return;

  



  function setCardOpen(card, shouldOpen){
    const body = card.querySelector('.accBody');
    if (!body) return;


    card.setAttribute('aria-expanded', String(shouldOpen));
    card.classList.toggle('expanded', shouldOpen);
    body.hidden = !shouldOpen;
    body.style.maxHeight = shouldOpen ? `${body.scrollHeight}px` : '0px';
    body.style.opacity = shouldOpen ? '1' : '0';
  }

  featureCards.forEach((card) => {
    const body = card.querySelector('.accBody');
    if (!body) return;

    body.style.maxHeight = '0px';
    body.style.opacity = '0';

    card.addEventListener('click', () => {
      const shouldOpen = card.getAttribute('aria-expanded') !== 'true';
      featureCards.forEach((otherCard) => {
        setCardOpen(otherCard, otherCard === card ? shouldOpen : false);
      });
    });

    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });
  });
})();

