(() => {
  'use strict';

  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Toast ---------- */
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast.id);
    toast.id = setTimeout(() => t.classList.remove('show'), 2600);
  }

  /* ---------- Photo fallback (shows a silhouette if profile.jpg is missing) ---------- */
  const photo = $('#photo');
  const PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 560"><rect width="480" height="560" fill="#1a1a1d"/>' +
    '<circle cx="240" cy="210" r="90" fill="#ff6a13"/><path d="M60 560c0-130 80-200 180-200s180 70 180 200z" fill="#ff6a13"/>' +
    '<text x="240" y="520" text-anchor="middle" font-family="Arial" font-size="22" fill="#111">ADD profile.jpg</text></svg>');
  const useFallback = () => { if (photo.src !== PLACEHOLDER) photo.src = PLACEHOLDER; };
  photo.addEventListener('error', useFallback);
  if (photo.complete && photo.naturalWidth === 0) useFallback();

  /* ---------- Footer year ---------- */
  $('#year').textContent = new Date().getFullYear();

  /* ---------- Scroll progress + active nav link ---------- */
  const progress = $('#progress');
  addEventListener('scroll', () => {
    const h = document.documentElement.scrollHeight - innerHeight;
    progress.style.width = (h > 0 ? (scrollY / h) * 100 : 0) + '%';
  }, { passive: true });

  const navLinks = $$('.nav nav a');
  const sectionObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach(s => sectionObs.observe(s));

  /* ---------- Cursor glow (mouse only) ---------- */
  if (matchMedia('(pointer: fine)').matches && !reduceMotion) {
    const glow = $('#glow');
    addEventListener('mousemove', e => {
      glow.classList.add('on');
      glow.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    }, { passive: true });
  }

  /* ---------- Reveal on scroll (+ counters, skill bars) ---------- */
  function countUp(el) {
    const end = +el.dataset.count, dur = 1600, t0 = performance.now();
    (function step(t) {
      const p = clamp((t - t0) / dur, 0, 1);
      el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))).toLocaleString();
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }
  const revealObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      el.classList.add('in');
      $$('[data-count]', el).forEach(countUp);
      $$('.tank-bar span', el).forEach(s => { s.style.width = s.dataset.level + '%'; });
      revealObs.unobserve(el);
    });
  }, { threshold: 0.15 });
  $$('.reveal').forEach(el => revealObs.observe(el));

  /* ---------- Typing effect ---------- */
  const typed = $('#typed');
  const phrases = [
    'future Harley rider',
    'lover of V-twin thunder',
    'chrome, leather & open roads',
    'dreaming of Route 66'
  ];
  if (reduceMotion) {
    typed.textContent = phrases[0];
  } else {
    let pi = 0, ci = 0, del = false;
    (function tick() {
      const word = phrases[pi];
      typed.textContent = word.slice(0, ci);
      if (!del && ci < word.length) { ci++; setTimeout(tick, 70); }
      else if (!del) { del = true; setTimeout(tick, 1400); }
      else if (ci > 0) { ci--; setTimeout(tick, 32); }
      else { del = false; pi = (pi + 1) % phrases.length; setTimeout(tick, 300); }
    })();
  }

  /* ======================================================
     TACHOMETER + ENGINE SOUND
     ====================================================== */
  const MAX_RPM = 8000;
  const NS = 'http://www.w3.org/2000/svg';
  const gaugeEl = $('#gauge');
  const polar = (r, a) => [150 + r * Math.cos(a * Math.PI / 180), 150 + r * Math.sin(a * Math.PI / 180)];
  const angleFor = v => 135 + (v / MAX_RPM) * 270;
  const make = (tag, attrs = {}, parent) => {
    const el = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    if (parent) parent.appendChild(el);
    return el;
  };

  const svg = make('svg', { viewBox: '0 0 300 300' }, gaugeEl);
  svg.innerHTML =
    '<defs>' +
      '<linearGradient id="chromeGrad" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0" stop-color="#f4f6f8"/><stop offset=".5" stop-color="#6f747b"/><stop offset="1" stop-color="#e8ebee"/></linearGradient>' +
      '<radialGradient id="faceGrad" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="#26262b"/><stop offset="1" stop-color="#0a0a0b"/></radialGradient>' +
    '</defs>';
  make('circle', { cx: 150, cy: 150, r: 142, class: 'g-bezel' }, svg);
  make('circle', { cx: 150, cy: 150, r: 134, class: 'g-face' }, svg);

  // redline arc 6500 -> 8000
  const [rx1, ry1] = polar(118, angleFor(6500));
  const [rx2, ry2] = polar(118, angleFor(8000));
  make('path', { d: `M${rx1} ${ry1} A118 118 0 0 1 ${rx2} ${ry2}`, class: 'g-red' }, svg);

  // ticks + numbers (0..8 => x1000 rpm)
  for (let i = 0; i <= 16; i++) {
    const v = (i / 16) * MAX_RPM, major = i % 2 === 0, a = angleFor(v);
    const [x1, y1] = polar(major ? 104 : 110, a);
    const [x2, y2] = polar(122, a);
    make('line', { x1, y1, x2, y2, class: major ? 'g-tick' : 'g-minor' }, svg);
    if (major) {
      const [tx, ty] = polar(88, a);
      const t = make('text', { x: tx, y: ty, class: 'g-num' }, svg);
      t.textContent = i / 2;
    }
  }
  make('text', { x: 150, y: 104, class: 'g-label' }, svg).textContent = 'x1000 RPM';
  const readout = make('text', { x: 150, y: 214, class: 'g-read' }, svg);
  make('text', { x: 150, y: 232, class: 'g-unit' }, svg).textContent = 'RPM';
  const needle = make('g', { transform: 'rotate(135 150 150)' }, svg);
  make('line', { x1: 134, y1: 150, x2: 252, y2: 150, class: 'g-needle' }, needle);
  make('circle', { cx: 150, cy: 150, r: 11, class: 'g-cap' }, svg);

  /* --- Audio (Web Audio synth: no files needed) --- */
  let actx = null, osc1, osc2, filt, amp, lfo, lfoGain, master;
  let soundOn = true, audioActive = false, silenceTimer = 0;

  function initAudio() {
    if (actx) { if (actx.state === 'suspended') actx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    actx = new AC();
    osc1 = actx.createOscillator(); osc1.type = 'sawtooth';
    osc2 = actx.createOscillator(); osc2.type = 'square';
    const g2 = actx.createGain(); g2.gain.value = 0.5;
    filt = actx.createBiquadFilter(); filt.type = 'lowpass'; filt.Q.value = 4;
    amp = actx.createGain(); amp.gain.value = 0.6;
    lfo = actx.createOscillator(); lfo.type = 'sine';
    lfoGain = actx.createGain(); lfoGain.gain.value = 0.4;
    master = actx.createGain(); master.gain.value = 0;
    osc1.connect(filt); osc2.connect(g2); g2.connect(filt);
    filt.connect(amp); amp.connect(master); master.connect(actx.destination);
    lfo.connect(lfoGain); lfoGain.connect(amp.gain);
    osc1.start(); osc2.start(); lfo.start();
  }

  function updateAudio(rpm) {
    if (!actx) return;
    const t = actx.currentTime;
    osc1.frequency.setTargetAtTime(28 + rpm / 50, t, 0.05);
    osc2.frequency.setTargetAtTime(14 + rpm / 100, t, 0.05);
    lfo.frequency.setTargetAtTime(Math.max(8, rpm / 60), t, 0.05);   // the "potato-potato" lump
    filt.frequency.setTargetAtTime(250 + rpm / 8, t, 0.05);
    const vol = (soundOn && audioActive) ? 0.04 + 0.28 * clamp((rpm - 800) / 7000, 0, 1) : 0;
    master.gain.setTargetAtTime(vol, t, 0.08);
  }

  /* --- Gauge physics --- */
  let rpm = 0, target = 0, revving = false, revStart = 0;
  const hero = $('#home');
  const revBtn = $('#revBtn');
  const bikes3d = [];

  function frame(now) {
    let tgt = target;
    if (revving) tgt = 7500 + Math.sin(now / 55) * 260;
    else if (target > 0 && target <= 1000) tgt = 900 + Math.sin(now / 90) * 28;   // idle shudder
    rpm += (tgt - rpm) * (revving ? 0.06 : 0.045);
    needle.setAttribute('transform', `rotate(${angleFor(rpm)} 150 150)`);
    readout.textContent = String(Math.round(rpm / 10) * 10).padStart(4, '0');
    hero.classList.toggle('shake', rpm > 5500 && !reduceMotion);
    document.documentElement.style.setProperty('--spin', clamp(1.6 - rpm / 6000, 0.12, 1.6).toFixed(2) + 's');
    updateAudio(rpm);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Intro: sweep to redline, then settle to idle (immediate "wow" in first 2 seconds)
  setTimeout(() => { target = 8000; }, 500);
  setTimeout(() => { target = 900; }, 1700);

  function startRev() {
    if (revving) return;
    initAudio();
    audioActive = true;
    clearTimeout(silenceTimer);
    revving = true; revStart = performance.now();
    revBtn.classList.add('held');
  }
  function stopRev() {
    if (!revving) return;
    const wait = Math.max(0, 600 - (performance.now() - revStart));   // short taps still give a satisfying burst
    setTimeout(() => {
      revving = false; target = 900;
      revBtn.classList.remove('held');
      silenceTimer = setTimeout(() => { if (!revving) audioActive = false; }, 1800);
    }, wait);
  }

  revBtn.addEventListener('pointerdown', e => { e.preventDefault(); startRev(); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => revBtn.addEventListener(ev, stopRev));
  revBtn.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); startRev(); } });
  revBtn.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') stopRev(); });
  revBtn.addEventListener('contextmenu', e => e.preventDefault());

  addEventListener('keydown', e => { if (e.key.toLowerCase() === 'r' && !e.repeat && !e.ctrlKey && !e.metaKey) startRev(); });
  addEventListener('keyup', e => { if (e.key.toLowerCase() === 'r') stopRev(); });
  addEventListener('blur', stopRev);


  /* ======================================================
     BIKE BUILDER
     ====================================================== */
  const models = [
    { key: 'roadking', name: 'Road King', type: 'Touring / Classic cruiser',
      desc: 'Retro styling, a big windshield and the kind of comfort made for all-day highway rides.',
      stats: { Comfort: 9, Power: 7, Style: 9, Handling: 6 },
      verdict: 'My dream bike. Classic looks and a seat built for a long road trip.' },
    { key: 'fatboy', name: 'Fat Boy', type: 'Softail cruiser',
      desc: 'Solid disc wheels and a low, muscular stance. It looks like it is moving even when parked.',
      stats: { Comfort: 7, Power: 8, Style: 10, Handling: 6 },
      verdict: 'Pure attitude. The most photogenic bike in the garage.' },
    { key: 'streetglide', name: 'Street Glide', type: 'Grand American Touring',
      desc: 'Bagger style with a sleek batwing fairing, built for cruising with a great sound system.',
      stats: { Comfort: 9, Power: 8, Style: 9, Handling: 7 },
      verdict: 'Style and comfort together. Great for a friends-and-music ride.' },
    { key: 'sportster', name: 'Sportster S', type: 'Modern performance',
      desc: 'A newer take on the famous Sportster name: sportier, sharper and more aggressive.',
      stats: { Comfort: 5, Power: 9, Style: 8, Handling: 9 },
      verdict: 'For when I want my heart rate to match my RPM.' }
  ];
  const paints = [
    { name: 'Burnt Orange', hex: '#ff6a13' },
    { name: 'Midnight Black', hex: '#15151a' },
    { name: 'Cherry Red', hex: '#b3151a' },
    { name: 'Chrome Silver', hex: '#b9c0c8' },
    { name: 'Olive Drab', hex: '#56673d' }
  ];

  const tabs = $('#tabs'), info = $('#bikeInfo'), stats = $('#bStats');
  const dream = $('#dreamBike');

  function showModel(i, announce) {
    const m = models[i];
    dream.dataset.model = m.key;
    $$('button', tabs).forEach((b, k) => { b.setAttribute('aria-selected', String(k === i)); b.tabIndex = k === i ? 0 : -1; });
    $('#bType').textContent = m.type;
    $('#bName').textContent = m.name;
    $('#bDesc').textContent = m.desc;
    $('#bVerdict').textContent = m.verdict;
    stats.innerHTML = '';
    Object.entries(m.stats).forEach(([k, v]) => {
      const row = document.createElement('div');
      row.className = 'stat';
      row.innerHTML = `<span>${k}</span><div class="track"><span class="fill"></span></div><span>${v}/10</span>`;
      stats.appendChild(row);
      requestAnimationFrame(() => requestAnimationFrame(() => { row.querySelector('.fill').style.width = v * 10 + '%'; }));
    });
    info.classList.remove('swap'); void info.offsetWidth; info.classList.add('swap');
    if (announce) toast('Selected: ' + m.name);
  }
  models.forEach((m, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.role = 'tab'; b.textContent = m.name;
    b.addEventListener('click', () => showModel(i, true));
    b.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const n = (i + (e.key === 'ArrowRight' ? 1 : -1) + models.length) % models.length;
        showModel(n); tabs.children[n].focus();
      }
    });
    tabs.appendChild(b);
  });

  const swatches = $('#swatches'), paintName = $('#paintName');
  function setPaint(i) {
    const p = paints[i];
    dream.style.setProperty('--paint', p.hex);
    paintName.textContent = p.name;
    $$('button', swatches).forEach((b, k) => b.setAttribute('aria-checked', String(k === i)));
  }
  paints.forEach((p, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.role = 'radio';
    b.style.background = p.hex;
    b.setAttribute('aria-label', p.name);
    b.title = p.name;
    b.addEventListener('click', () => setPaint(i));
    swatches.appendChild(b);
  });
  showModel(0);
  setPaint(0);

  $('#spinBtn').addEventListener('click', e => {
    const on = dream.classList.toggle('spinning');
    e.currentTarget.textContent = on ? 'Stop the wheels' : 'Spin the wheels';
  });

  /* ======================================================
     FLIP CARDS
     ====================================================== */
  $$('.flip').forEach(c => c.addEventListener('click', () => c.classList.toggle('flipped')));

  /* ======================================================
     QUIZ
     ====================================================== */
  const questions = [
    { q: 'Your perfect Saturday morning?', a: [
      ['Sunrise coastal cruise with no destination', 'cruiser'],
      ['Long highway run to a faraway town', 'touring'],
      ['Twisty mountain road, as fast as is safe', 'sport'],
      ['Tuning and polishing the bike in the garage', 'classic'] ] },
    { q: 'Pick a soundtrack for the ride.', a: [
      ['Classic rock anthems', 'classic'],
      ['Something chill with a steady beat', 'touring'],
      ['Loud, fast and energetic', 'sport'],
      ['Nothing. Just the sound of the engine', 'cruiser'] ] },
    { q: 'What matters most in a motorcycle?', a: [
      ['Looking unbelievably cool', 'cruiser'],
      ['Comfort over thousands of kilometers', 'touring'],
      ['Power and handling', 'sport'],
      ['History, heritage and character', 'classic'] ] }
  ];
  const results = {
    cruiser: { t: 'The Fat Boy', d: 'Bold, confident and effortlessly cool. You ride for the feeling, not the finish line.' },
    touring: { t: 'The Street Glide', d: 'You love the journey. Comfort, music and the next horizon are your kind of ride.' },
    sport: { t: 'The Sportster S', d: 'Fast, sharp and fearless. You like your adventures with extra throttle.' },
    classic: { t: 'The Road King', d: 'A true classic. You respect the history and you ride with style that never ages.' }
  };
  const quizBox = $('#quizBox');
  let qi = 0, tally = {};

  function renderQuiz() {
    if (qi >= questions.length) {
      const key = Object.keys(tally).sort((a, b) => tally[b] - tally[a])[0];
      const r = results[key];
      quizBox.innerHTML =
        `<div class="result"><p class="type">You are</p><h3>${r.t}</h3><p>${r.d}</p>` +
        `<button class="btn primary" type="button" id="again">Ride again</button></div>`;
      $('#again').addEventListener('click', () => { qi = 0; tally = {}; renderQuiz(); });
      toast('Result: ' + r.t);
      return;
    }
    const q = questions[qi];
    quizBox.innerHTML =
      `<div class="q-meta"><span>Question ${qi + 1} of ${questions.length}</span><span>Tap an answer</span></div>` +
      `<div class="q-bar"><span style="width:${(qi / questions.length) * 100}%"></span></div>` +
      `<h3>${q.q}</h3><div class="opts"></div>`;
    const opts = $('.opts', quizBox);
    q.a.forEach(([text, key]) => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = text;
      b.addEventListener('click', () => { tally[key] = (tally[key] || 0) + 1; qi++; renderQuiz(); });
      opts.appendChild(b);
    });
  }
  renderQuiz();


  /* ======================================================
     TEST RIDE MINI-GAME (canvas)
     ====================================================== */
  (function () {
    const cv = $('#gameCanvas');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const K = 4 / 3, W = cv.width, H = cv.height;
    const GROUND = Math.round(236 * K), S = 0.3, BX = 90;
    const P = {
      tank: new Path2D('M275 128 Q300 92 365 100 Q400 105 405 125 Q350 142 275 150 Z'),
      seat: new Path2D('M170 140 Q215 118 275 132 L270 150 Q215 142 175 158 Z'),
      frame: new Path2D('M130 210 L200 160 L300 175 L335 205 M300 175 L405 125'),
      fork: new Path2D('M470 210 L425 105'),
      bars: new Path2D('M425 105 L420 82 Q405 72 385 80'),
      exhaust: new Path2D('M300 228 L180 234 L120 226'),
      fender: new Path2D('M58 200 A74 74 0 0 1 195 178')
    };
    const types = [ { w: 26, h: 36, k: 'cone' }, { w: 44, h: 26, k: 'rock' }, { w: 22, h: 58, k: 'bar' } ];
    const stars = Array.from({ length: 45 }, (_, i) => [(i * 137) % W, (i * 53) % (150 * K), 1 + (i % 3) * 0.7]);

    let state = 'ready', speed, dist, vy, lift, obs, since, nextGap, wheelA, flash = 0, overAt = 0;
    let last = performance.now(), visible = false, tick = 0, best = 0;
    try { best = +localStorage.getItem('hdBest') || 0; } catch (e) {}

    function reset() { speed = 6 * K; dist = 0; vy = 0; lift = 0; obs = []; since = 0; nextGap = 520 * K; wheelA = 0; }
    reset();

    const meters = () => Math.floor(dist / (20 * K));
    function jump() { if (lift === 0 && vy === 0) vy = 13 * K; }
    function act() {
      if (state === 'ready') { reset(); state = 'play'; jump(); }
      else if (state === 'play') jump();
      else if (state === 'over' && performance.now() - overAt > 450) { reset(); state = 'play'; }
    }
    function crash() {
      state = 'over'; overAt = performance.now(); flash = 12;
      const m = meters();
      if (m > best) { best = m; try { localStorage.setItem('hdBest', String(best)); } catch (e) {} if (m > 0) toast('New best: ' + m + ' m!'); }
    }

    function update(f) {
      speed = Math.min(10.5 * K, (6 + dist / (3000 * K)) * K);
      dist += speed * f; since += speed * f; wheelA += speed * f * 0.045;
      if (lift > 0 || vy > 0) {
        lift += vy * f; vy -= 0.7 * K * f;
        if (lift <= 0) { lift = 0; vy = 0; }
      }
      if (since > nextGap) {
        const t = types[(Math.random() * types.length) | 0];
        obs.push({ x: W + 20, w: t.w * K, h: t.h * K, k: t.k });
        since = 0; nextGap = (330 + Math.random() * 260) * K + speed * 18;
      }
      obs.forEach(o => { o.x -= speed * f; });
      obs = obs.filter(o => o.x + o.w > -20);
      const bottom = GROUND - lift, top = bottom - 46 * K, left = BX + 24 * K, right = BX + 118 * K;
      for (const o of obs) {
        if (right > o.x + 4 && left < o.x + o.w - 4 && bottom > GROUND - o.h + 4 && top < GROUND) { crash(); break; }
      }
    }

    function mountains(offset, base, amp, color) {
      ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 6) {
        const u = x + offset;
        ctx.lineTo(x, base - (Math.sin(u * 0.008) * amp + Math.sin(u * 0.021) * amp * 0.5 + amp));
      }
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    }
    function drawBg() {
      const g = ctx.createLinearGradient(0, 0, 0, GROUND);
      g.addColorStop(0, '#07070c'); g.addColorStop(0.7, '#1c0e12'); g.addColorStop(1, '#3a1608');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fff';
      stars.forEach(s => { ctx.globalAlpha = 0.35 + 0.35 * Math.sin(tick / 30 + s[0]); ctx.fillRect(s[0], s[1], s[2], s[2]); });
      ctx.globalAlpha = 1;
      const sun = ctx.createRadialGradient(W * 0.78, GROUND - 40, 10, W * 0.78, GROUND - 40, 130);
      sun.addColorStop(0, 'rgba(255,170,60,.95)'); sun.addColorStop(0.35, 'rgba(255,106,19,.45)'); sun.addColorStop(1, 'rgba(255,106,19,0)');
      ctx.fillStyle = sun; ctx.fillRect(0, 0, W, H);
      mountains(dist * 0.15, GROUND - 20, 38, '#1a1013');
      mountains(dist * 0.4 + 300, GROUND + 4, 24, '#0e0b0d');
      ctx.fillStyle = '#121214'; ctx.fillRect(0, GROUND, W, H - GROUND);
      ctx.fillStyle = '#ff6a13'; ctx.fillRect(0, GROUND, W, 4);
      ctx.fillStyle = '#ffb347';
      const dash = 140 * K;
      for (let x = -((dist) % dash); x < W; x += dash) ctx.fillRect(x, GROUND + 52 * K, 70 * K, 4);
    }
    function drawBike() {
      const bottom = GROUND - lift;
      ctx.save();
      ctx.translate(BX, bottom - 278 * S); ctx.scale(S, S);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      // headlight beam
      const beam = ctx.createLinearGradient(447, 128, 900, 128);
      beam.addColorStop(0, 'rgba(255,240,170,.28)'); beam.addColorStop(1, 'rgba(255,240,170,0)');
      ctx.fillStyle = beam; ctx.beginPath(); ctx.moveTo(447, 128); ctx.lineTo(1000, 20); ctx.lineTo(1000, 300); ctx.closePath(); ctx.fill();
      // wheels
      [130, 470].forEach(cx => {
        ctx.fillStyle = '#0a0a0a'; ctx.beginPath(); ctx.arc(cx, 210, 68, 0, 7); ctx.fill();
        ctx.strokeStyle = '#d9dde2'; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(cx, 210, 54, 0, 7); ctx.stroke();
        ctx.save(); ctx.translate(cx, 210); ctx.rotate(wheelA); ctx.lineWidth = 4; ctx.strokeStyle = '#8c9097';
        for (let k = 0; k < 4; k++) { ctx.rotate(Math.PI / 4); ctx.beginPath(); ctx.moveTo(-52, 0); ctx.lineTo(52, 0); ctx.stroke(); }
        ctx.restore();
      });
      ctx.strokeStyle = '#ff6a13'; ctx.lineWidth = 12; ctx.stroke(P.fender);
      ctx.strokeStyle = '#4a4a50'; ctx.lineWidth = 9; ctx.stroke(P.frame);
      ctx.fillStyle = '#2b2d31'; ctx.strokeStyle = '#d9dde2'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.roundRect(285, 168, 72, 58, 8); ctx.fill(); ctx.stroke();
      [[-25, 298, 188, 287], [25, 344, 188, 333]].forEach(([deg, px, py, rx]) => {
        ctx.save(); ctx.translate(px, py); ctx.rotate(deg * Math.PI / 180); ctx.beginPath(); ctx.roundRect(rx - px, 146 - py, 22, 42, 4); ctx.fill(); ctx.stroke(); ctx.restore();
      });
      ctx.strokeStyle = '#d9dde2'; ctx.lineWidth = 11; ctx.stroke(P.exhaust);
      ctx.lineWidth = 8; ctx.stroke(P.fork);
      ctx.lineWidth = 7; ctx.stroke(P.bars);
      ctx.fillStyle = '#1a1210'; ctx.fill(P.seat);
      ctx.fillStyle = '#ff6a13'; ctx.fill(P.tank);
      // rider
      ctx.strokeStyle = '#111'; ctx.lineWidth = 26; ctx.beginPath(); ctx.moveTo(228, 132); ctx.lineTo(262, 80); ctx.stroke();
      ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(262, 88); ctx.lineTo(330, 104); ctx.lineTo(410, 100); ctx.stroke();
      ctx.lineWidth = 18; ctx.beginPath(); ctx.moveTo(236, 140); ctx.lineTo(310, 160); ctx.lineTo(330, 205); ctx.stroke();
      ctx.fillStyle = '#d9dde2'; ctx.beginPath(); ctx.arc(272, 56, 20, 0, 7); ctx.fill();
      ctx.fillStyle = '#ff6a13'; ctx.fillRect(254, 50, 40, 8);
      ctx.fillStyle = '#fff3c4'; ctx.beginPath(); ctx.arc(447, 128, 14, 0, 7); ctx.fill();
      ctx.restore();
    }
    function drawObs(o) {
      const x = o.x, G = GROUND, w = o.w, h = o.h;
      if (o.k === 'cone') {
        ctx.fillStyle = '#ff6a13'; ctx.beginPath(); ctx.moveTo(x, G); ctx.lineTo(x + w, G); ctx.lineTo(x + w / 2, G - h); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath();
        ctx.moveTo(x + (w / 2) * 0.35, G - h * 0.35); ctx.lineTo(x + w - (w / 2) * 0.35, G - h * 0.35);
        ctx.lineTo(x + w - (w / 2) * 0.6, G - h * 0.6); ctx.lineTo(x + (w / 2) * 0.6, G - h * 0.6); ctx.closePath(); ctx.fill();
      } else if (o.k === 'rock') {
        ctx.fillStyle = '#6b6f76'; ctx.strokeStyle = '#a0a6ae'; ctx.lineWidth = 2; ctx.beginPath();
        ctx.moveTo(x, G); ctx.lineTo(x + w * 0.15, G - h * 0.7); ctx.lineTo(x + w * 0.45, G - h); ctx.lineTo(x + w * 0.8, G - h * 0.75); ctx.lineTo(x + w, G);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      } else {
        ctx.fillStyle = '#e0261b'; ctx.fillRect(x, G - h, w, h);
        ctx.fillStyle = '#fff'; for (let y = G - h + 6; y < G - 6; y += 18) ctx.fillRect(x, y, w, 8);
      }
    }
    function text(str, x, y, size, color, align) {
      ctx.font = '700 ' + size + 'px Oswald, Impact, "Arial Narrow", sans-serif';
      ctx.textAlign = align || 'center'; ctx.fillStyle = color; ctx.fillText(str, x, y);
    }
    function draw() {
      drawBg();
      obs.forEach(drawObs);
      drawBike();
      text('DIST ' + meters() + ' m', 24, 44, 30, '#ffb347', 'left');
      text('BEST ' + best + ' m', W - 24, 44, 30, '#d9dde2', 'right');
      if (state === 'ready' || state === 'over') {
        ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, W, H);
        if (state === 'ready') {
          text('TEST RIDE', W / 2, H * 0.4, 84, '#ff6a13');
          text('Jump the obstacles. How far can you ride?', W / 2, H * 0.52, 30, '#d9dde2');
        } else {
          text('CRASHED!', W / 2, H * 0.36, 84, '#e0261b');
          text(meters() + ' m   |   best ' + best + ' m', W / 2, H * 0.50, 38, '#ffb347');
        }
        if (Math.floor(tick / 30) % 2 === 0) text(state === 'ready' ? 'Press SPACE or tap to start' : 'Press SPACE or tap to ride again', W / 2, H * 0.68, 32, '#fff');
      }
      if (flash > 0) { ctx.fillStyle = 'rgba(224,38,27,' + flash / 30 + ')'; ctx.fillRect(0, 0, W, H); flash--; }
    }

    function loop(now) {
      const f = Math.min(2.5, (now - last) / 16.667); last = now; tick++;
      if (visible && state === 'play') update(f);
      if (visible || tick < 3) draw();
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { threshold: 0.3 }).observe(cv);
    cv.addEventListener('pointerdown', e => { e.preventDefault(); act(); });
    addEventListener('keydown', e => {
      if (!visible || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (e.code === 'Space' || e.key === ' ' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();                       // stop the page from scrolling
        if (document.activeElement && /^(BUTTON|A)$/.test(document.activeElement.tagName)) document.activeElement.blur();
        if (!e.repeat) act();
      }
    });
  })();

  /* ======================================================
     EASTER EGG: type "hog"
     ====================================================== */
  let buf = '';
  addEventListener('keydown', e => {
    if (e.key.length !== 1) return;
    buf = (buf + e.key.toLowerCase()).slice(-3);
    if (buf === 'hog') {
      const egg = $('#eggRider');
      egg.classList.remove('go'); void egg.getBoundingClientRect(); egg.classList.add('go');
      toast('You found the secret! Ride on.');
      buf = '';
    }
  });
})();