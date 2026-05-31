function scrollDown(){
  const about = document.getElementById('about');
  if (!about) return;
  about.scrollIntoView({ behavior: 'smooth' });
}

function animateMetrics(){
  const items = document.querySelectorAll('.metricCount[data-target]');
  if (!items || !items.length) return;

  // For suffix like % and /7 that we keep in HTML via data-suffix, also allow display to start at 0.
  // We will write only the animated number part.


  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) {
    items.forEach(el => {
      const target = el.getAttribute('data-target');
      if (target != null) el.textContent = target;
    });
    return;
  }

  // Start when section is near viewport
  const section = document.getElementById('stats');
  const start = () => {
    items.forEach((el, idx) => {
      const targetRaw = el.getAttribute('data-target');
      const target = Number(targetRaw);
      if (!Number.isFinite(target)) return;

      const duration = 1500 + idx * 150;
      const suffix = el.getAttribute('data-suffix') || '';
      const format = el.getAttribute('data-format') || '';

      const startTime = performance.now();
      const tick = (t) => {
        const p = Math.min(1, (t - startTime) / duration);
        const value = target * p;

        if (format === 'compact') {
          // For 1M display: do not show 0 during animation.
          if (value < 250000) {
            // keep blank until meaningful progress
            el.textContent = '';
          } else {
            el.textContent = '1M';
          }
        } else {
          // Avoid showing 0% at the start.
          el.textContent = p < 0.06 ? '' : String(Math.round(value * 10) / 10);
        }


        if (p < 1) requestAnimationFrame(tick);
        else {
          // final polish
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

  // Contact form submit (demo)
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

      // Demo success message
      if (contactStatus) {
        contactStatus.textContent = `Thank you, ${name}. Connection request queued for ${email} .`;
      }

      // Reset form
      contactForm.reset();

      // Smooth scroll to status area if possible
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
    const rawText = text;

    if (role === 'ai' && typeof rawText === 'string') {
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

      const aiText = escapeHtml(rawText);
      const aiTyping = holder.querySelector('#aiTyping');

      let i = 0;
      const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const stepMs = reduceMotion ? 0 : 12;

      const interval = setInterval(() => {
        i += 1;
        aiTyping.innerHTML = aiText.slice(0, i);
        if (reduceMotion || i >= aiText.length) {
          clearInterval(interval);
          aiTyping.innerHTML = aiText;
        }
      }, stepMs);

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

    if (t.includes('hello') || t.includes('hi') || t.includes('hey')) {
      return 'Hello, operator. Neural channels are online. What should we query next: system status, AI integration, or grid optimization?';
    }

    if (t.includes('status') || t.includes('system') || t.includes('uptime') || t.includes('latency')) {
      return 'System status: nominal. Latency within thresholds. Sync grid stable. No critical alerts detected. Choose: diagnostics or optimization.';
    }

    if (t.includes('help') || t.includes('commands') || t.includes('what can you do') || t.includes('how')) {
      return 'Available intents: "system status", "ai integration", "explain", "optimize grid". Ask any Cyborg Nexus question and I’ll respond with a simulated operational brief.';
    }

    if (t.includes('optimize') || t.includes('optimization') || t.includes('grid') || t.includes('sync') || t.includes('synchron')) {
      return 'Optimization routine queued: adaptive pacing + sync smoothing. Expected improvement: reduced jitter and steadier signal alignment. Want a quick explanation of the routine steps?';
    }

    if (
      t.includes('ai') || t.includes('integration') || t.includes('neural') ||
      t.includes('explain') || t.includes('what is') || t.includes('how does')
    ) {
      return 'AI Integration (simulated): an adaptive decision engine that fuses operator intent with real-time feedback loops. It cross-checks context, reduces uncertainty, and keeps an explainable decision trail. What outcome are you targeting—stability, accuracy, or speed?';
    }

    return `Command received: "${tRaw.trim()}". Interpreting intent and generating a simulated response brief. If you want specifics, ask for: "status", "ai integration", or "optimize grid".`;
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

  if (loginForm) {
    const operatorInput = loginForm.querySelector('input[name="operatorId"]');
    const keyInput = loginForm.querySelector('input[name="accessKey"]');
    const statusTicker = () => {
      if (!operatorInput || !keyInput) return;
      const ok = operatorInput.value.trim().length > 0 && keyInput.value.trim().length > 0;
      if (!loginStatus) return;
      loginStatus.textContent = ok ? 'Credentials loaded. Initiate session when ready.' : 'Enter credentials to arm the console.';
    };
    if (operatorInput) operatorInput.addEventListener('input', statusTicker);
    if (keyInput) keyInput.addEventListener('input', statusTicker);
    statusTicker();
  }
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

    // Keyboard support (Enter/Space)
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });
  });
})();