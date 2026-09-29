	// ========== Intro + Music ==========
const intro = document.getElementById('intro');
const site = document.getElementById('site');
const music = document.getElementById('bgMusic');
const player = document.getElementById('player');
const musicBtn = document.getElementById('musicBtn');
const playerFill = document.getElementById('playerFill');
const playerTime = document.getElementById('playerTime');
const playerDur = document.getElementById('playerDur');
const playerBar = document.getElementById('playerBar');

music.volume = 0.42;
let isPlaying = false;
let entered = false;

// Default theme = 222 (bye × Into You) · set correct source + start offset on load
(function initDefaultTrack() {
  const source = music.querySelector('source');
  if (source) {
    source.src = 'bye-into-you-remix.mp3';
    music.load();
  }
  window.__audioStartAt = 33;
  // seek after metadata is ready
  const seekToStart = () => {
    if (window.__audioStartAt && isFinite(music.duration)) {
      music.currentTime = Math.min(window.__audioStartAt, Math.max(0, music.duration - 1));
    }
  };
  if (music.readyState >= 1) seekToStart();
  else music.addEventListener('loadedmetadata', seekToStart, { once: true });
})();

function fmt(sec) {
  if (!isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m + ':' + String(s).padStart(2, '0');
}

function updateProgress() {
  if (!music.duration) return;
  const pct = (music.currentTime / music.duration) * 100;
  playerFill.style.width = pct + '%';
  playerTime.textContent = fmt(music.currentTime);
  playerDur.textContent = fmt(music.duration);
}

music.addEventListener('timeupdate', updateProgress);
music.addEventListener('loadedmetadata', updateProgress);

function setPlaying(on) {
  isPlaying = on;
  musicBtn.innerHTML = on
    ? '<i class="fas fa-pause"></i>'
    : '<i class="fas fa-play"></i>';
  if (player) player.classList.toggle('is-playing', on);
  if (on) {
    ensureAudioGraph();
    startViz();
  } else {
    stopViz();
  }
}

/** Unlock / resume AudioContext during a real user gesture so sound can come out */
function unlockAudio() {
  ensureAudioGraph();
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
}

function playMusic() {
  unlockAudio();
  return music.play()
    .then(() => setPlaying(true))
    .catch(() => setPlaying(false));
}

function enterSite() {
  if (entered) return;
  entered = true;

  // ซ่อน intro แล้วเปิดหน้าโหลด
  intro.classList.add('hide');
  const loader = document.getElementById('loader');
  const loaderFill = document.getElementById('loaderFill');
  const loaderPct = document.getElementById('loaderPct');
  const loaderStatus = document.getElementById('loaderStatus');

  // สุ่มพื้นหลัง + ธีมตอนกดเข้า
  const randomClip = THEME_LIST[Math.floor(Math.random() * THEME_LIST.length)];
  applyThemeSilent(randomClip);

  // unlock audio ภายใน user gesture (เล่นจริงตอนโหลดครบ 100%)
  unlockAudio();
  // เตรียม element ไว้ล่วงหน้า บางเบราว์เซอร์อนุญาต play ทีหลังได้หลัง unlock
  try {
    const p = music.play();
    if (p && typeof p.then === 'function') {
      p.then(() => { music.pause(); music.currentTime = window.__audioStartAt || 0; }).catch(() => {});
    }
  } catch (_) {}

  const isMobile = window.matchMedia('(max-width: 720px)').matches;
  const sideL = document.getElementById('loaderSideL');
  const sideR = document.getElementById('loaderSideR');
  const themeTag = document.getElementById('loaderThemeTag');
  const stepEls = document.querySelectorAll('.loader-step');

  if (loader) {
    loader.hidden = false;
    loader.classList.remove('is-glitch', 'is-flash', 'is-done');

    // particles
    const particlesEl = document.getElementById('loaderParticles');
    if (particlesEl) {
      particlesEl.innerHTML = '';
      const count = isMobile ? 10 : 20;
      for (let i = 0; i < count; i++) {
        const p = document.createElement('span');
        p.className = 'loader-particle';
        p.style.left = Math.random() * 100 + '%';
        p.style.bottom = (-5 - Math.random() * 20) + '%';
        p.style.animationDuration = (5 + Math.random() * 7) + 's';
        p.style.animationDelay = (Math.random() * 2.5) + 's';
        p.style.opacity = 0.25 + Math.random() * 0.55;
        const size = (isMobile ? 1.5 : 2) + Math.random() * (isMobile ? 2 : 3);
        p.style.width = size + 'px';
        p.style.height = size + 'px';
        particlesEl.appendChild(p);
      }
    }

    // floating hex codes
    const hexEl = document.getElementById('loaderHex');
    if (hexEl) {
      hexEl.innerHTML = '';
      const hexCount = isMobile ? 6 : 14;
      const words = ['0xFUSION', 'BOOT', 'SYNC', 'LOAD', 'TALOS', '0xA7', '0xFF', 'INIT', 'CORE', 'MEM'];
      for (let i = 0; i < hexCount; i++) {
        const s = document.createElement('span');
        s.textContent = words[i % words.length] + ' ' + Math.floor(Math.random() * 0xff).toString(16).toUpperCase().padStart(2, '0');
        s.style.left = (5 + Math.random() * 90) + '%';
        s.style.bottom = (-10 - Math.random() * 30) + '%';
        s.style.animationDuration = (7 + Math.random() * 8) + 's';
        s.style.animationDelay = (Math.random() * 3) + 's';
        hexEl.appendChild(s);
      }
    }

    // show theme name mid-load
    if (themeTag) {
      themeTag.textContent = '';
      themeTag.classList.remove('is-show');
    }

    requestAnimationFrame(() => loader.classList.add('is-active'));
  }

  const statuses = [
    'กำลังเข้าสู่ระบบ...',
    'ซิงค์ธีม...',
    'โหลดเนื้อหา...',
    'เกือบเสร็จแล้ว...',
    'พร้อมแล้ว'
  ];
  const sideMsgs = ['INIT', 'SYNC', 'LOAD', 'LINK', 'DONE'];
  let pct = 0;
  let statusIdx = 0;
  let glitchOn = false;
  let themeShown = false;
  const duration = 3200; // ms · longer for extra flair
  const start = performance.now();
  const lineFill = document.querySelector('.loader-line-fill');

  function tickLoader(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    pct = Math.round(eased * 100);

    if (loaderFill) loaderFill.style.width = pct + '%';
    if (loaderPct) loaderPct.textContent = pct + '%';
    if (lineFill) lineFill.style.width = pct + '%';

    // side hex counter
    if (sideL) sideL.textContent = '0x' + pct.toString(16).toUpperCase().padStart(2, '0');

    // step dots
    const stepIdx = Math.min(stepEls.length - 1, Math.floor(t * stepEls.length));
    stepEls.forEach((el, i) => {
      el.classList.toggle('is-on', i === stepIdx && t < 1);
      el.classList.toggle('is-done', i < stepIdx || t >= 1);
    });

    const nextStatus = Math.min(statuses.length - 1, Math.floor(t * statuses.length));
    if (nextStatus !== statusIdx && loaderStatus) {
      statusIdx = nextStatus;
      loaderStatus.style.opacity = '0';
      if (sideR) sideR.textContent = sideMsgs[statusIdx] || 'SYNC';
      setTimeout(() => {
        loaderStatus.textContent = statuses[statusIdx];
        loaderStatus.style.opacity = '1';
      }, 120);
    }

    // reveal theme tag around 55%
    if (!themeShown && t > 0.55 && themeTag) {
      themeShown = true;
      themeTag.textContent = getThemeLabel(window.__bgClip || '222.mp4');
      themeTag.classList.add('is-show');
    }

    // glitch letters near the end
    if (loader && t > 0.82 && t < 0.95) {
      if (!glitchOn) {
        glitchOn = true;
        loader.classList.add('is-glitch');
      }
    } else if (glitchOn && loader) {
      glitchOn = false;
      loader.classList.remove('is-glitch');
    }

    if (t < 1) {
      requestAnimationFrame(tickLoader);
    } else {
      if (loader) loader.classList.remove('is-glitch');
      finishEnter();
    }
  }
  requestAnimationFrame(tickLoader);

  function finishEnter() {
    // เล่นเพลงเมื่อโหลดครบ 100%
    if (window.__audioStartAt && isFinite(music.duration)) {
      music.currentTime = Math.min(window.__audioStartAt, Math.max(0, music.duration - 1));
    }
    playMusic();

    // brief flash then fade out
    if (loader) {
      loader.classList.add('is-flash');
      setTimeout(() => {
        loader.classList.remove('is-flash');
        loader.classList.add('is-done');
        loader.classList.remove('is-active');
      }, 180);
    }

    setTimeout(() => {
      site.classList.add('show');
      document.body.classList.remove('locked');
      player.hidden = false;

      const nav = document.getElementById('navbar');
      const glow = document.getElementById('navGlow');
      if (nav) {
        nav.hidden = false;
        requestAnimationFrame(() => nav.classList.add('is-visible'));
      }
      if (glow) {
        glow.hidden = false;
        requestAnimationFrame(() => glow.classList.add('is-visible'));
      }
    }, 220);

    setTimeout(() => {
      intro.style.display = 'none';
      if (loader) {
        loader.hidden = true;
        loader.classList.remove('is-done', 'is-flash');
      }
      const active = document.querySelector('.nav-link.active');
      if (active && typeof moveNavIndicator === 'function') moveNavIndicator(active);
    }, 750);
  }
}

intro.addEventListener('click', enterSite);
intro.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    enterSite();
  }
});

musicBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (isPlaying) {
    music.pause();
    setPlaying(false);
  } else {
    playMusic();
  }
});

/* กดแถบที่พับอยู่เพื่อเล่นเพลง */
player.addEventListener('click', (e) => {
  if (isPlaying) return;
  if (e.target.closest('.player-btn')) return;
  playMusic();
});

playerBar.addEventListener('click', (e) => {
  if (!music.duration) return;
  const rect = playerBar.getBoundingClientRect();
  const ratio = (e.clientX - rect.left) / rect.width;
  music.currentTime = Math.max(0, Math.min(1, ratio)) * music.duration;
});

// ========== Theme + BG + Music hotkeys ==========
const THEME_LIST = [
  'ssstik.io_@soul.blr_1779080280199.mp4', // noir
  '222.mp4',                                 // alt
  'capitano.mp4',
  'qingxioa.mp4',                            // aegir
  'alucard.mp4'
];
const THEME_CLIPS = {
  Numpad1: THEME_LIST[0], Digit1: THEME_LIST[0],
  Numpad2: THEME_LIST[1], Digit2: THEME_LIST[1],
  Numpad3: THEME_LIST[2], Digit3: THEME_LIST[2],
  Numpad4: THEME_LIST[3], Digit4: THEME_LIST[3],
  Numpad5: THEME_LIST[4], Digit5: THEME_LIST[4]
};
const THEME_CLASSES = ['theme-noir', 'theme-alt', 'theme-capitano', 'theme-aegir', 'theme-alucard', 'theme-secret'];
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let bgSwitching = false;
window.__bgClip = '222.mp4';
window.__audioStartAt = 0;

function getTrackForClip(clip) {
  if (clip === '222.mp4') return 'bye-into-you-remix.mp3';
  if (clip === 'qingxioa.mp4') return 'funk-mandala-slowed.mp3';
  if (clip === 'alucard.mp4') return 'The Neighbourhood - Sweater Weather.mp3';
  if (clip === 'capitano.mp4') return 'Halsey-Gasoline(instrumental).mp3';
  return 'Insomnia slowed reverb.mp3';
}

function getAudioStartForClip(clip) {
  if (clip === '222.mp4') return 33;
  if (clip === 'alucard.mp4') return 19;
  if (clip === 'qingxioa.mp4') return 4.1;
  return 0;
}

function getThemeLabel(clip) {
  if (clip === '222.mp4') return 'theme · 222';
  if (clip === 'capitano.mp4') return 'theme · capitano';
  if (clip === 'qingxioa.mp4') return 'theme · aegir';
  if (clip === 'alucard.mp4') return 'theme · alucard';
  return 'theme · noir';
}

/** ใช้ตอนเข้าเว็บ · ตั้งพื้นหลังทันทีโดยไม่ fade */
function applyThemeSilent(clip) {
  window.__bgClip = clip;
  window.__audioStartAt = getAudioStartForClip(clip);

  const active = getActiveBg();
  if (active) {
    const src = active.querySelector('source');
    if (src) src.src = clip;
    active.load();
    try { active.play(); } catch (_) {}
  }

  applyThemeClasses(clip);
  applyMeta(clip);

  const source = music.querySelector('source');
  if (source) {
    source.src = getTrackForClip(clip);
    music.load();
  }
}

function cycleTheme(dir) {
  if (!entered || bgSwitching) return;
  const idx = THEME_LIST.indexOf(window.__bgClip);
  const cur = idx < 0 ? 0 : idx;
  const next = (cur + dir + THEME_LIST.length) % THEME_LIST.length;
  switchBackground(THEME_LIST[next]);
}

function getActiveBg() {
  return document.querySelector('.video-bg .bg-layer.is-active') || document.getElementById('bgVideo');
}
function getInactiveBg() {
  return document.querySelector('.video-bg .bg-layer:not(.is-active)') || document.getElementById('bgVideoB');
}

function fadeVolume(audio, to, ms) {
  return new Promise((resolve) => {
    if (!audio || reduceMotion || ms <= 0) {
      if (audio) audio.volume = to;
      resolve();
      return;
    }
    const from = audio.volume;
    const start = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - start) / ms);
      const eased = t * (2 - t);
      audio.volume = from + (to - from) * eased;
      if (t < 1) requestAnimationFrame(tick);
      else resolve();
    }
    requestAnimationFrame(tick);
  });
}

function applyThemeClasses(clip) {
  document.body.classList.remove(...THEME_CLASSES);
  if (clip === 'ssstik.io_@soul.blr_1779080280199.mp4') document.body.classList.add('theme-noir');
  else if (clip === '222.mp4') document.body.classList.add('theme-alt');
  else if (clip === 'capitano.mp4') document.body.classList.add('theme-capitano');
  else if (clip === 'qingxioa.mp4') document.body.classList.add('theme-aegir');
  else if (clip === 'alucard.mp4') document.body.classList.add('theme-alucard');
  // retrigger bio card entrance animation
  const bioCard = document.querySelector('.section-about .card');
  if (bioCard) {
    bioCard.style.animation = 'none';
    // force reflow
    void bioCard.offsetWidth;
    bioCard.style.animation = '';
  }
}

function applyMeta(clip) {
  const title = document.getElementById('playerTitle');
  const sub = document.getElementById('playerSub');
  if (clip === '222.mp4') {
    if (title) title.textContent = 'bye × Into You';
    if (sub) sub.textContent = 'Ariana Grande · Altare Remix';
  } else if (clip === 'capitano.mp4') {
    if (title) title.textContent = 'Gasoline';
    if (sub) sub.textContent = 'Halsey · instrumental';
  } else if (clip === 'qingxioa.mp4') {
    if (title) title.textContent = 'funk-mandala-slowed';
    if (sub) sub.textContent = 'Dj Samir';
  } else if (clip === 'alucard.mp4') {
    if (title) title.textContent = 'Sweater Weather';
    if (sub) sub.textContent = 'The Neighbourhood';
  } else {
    if (title) title.textContent = 'Insomnia';
    if (sub) sub.textContent = 'slowed + reverb';
  }
}

function showToast(msg) {
  let el = document.querySelector('.theme-toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'theme-toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 1800);
}

async function switchBackground(clip) {
  if (bgSwitching) return;
  if (window.__bgClip === clip) return;
  bgSwitching = true;
  document.body.classList.add('is-theme-fading');

  const incoming = getInactiveBg();
  const outgoing = getActiveBg();
  const audio = music; // fusion uses #bgMusic
  const wasPlaying = audio && !audio.paused;
  const isAlt = clip === '222.mp4';
  const isCapitano = clip === 'capitano.mp4';
  const isAegir = clip === 'qingxioa.mp4';
  const isAlucard = clip === 'alucard.mp4';
  const targetVol = typeof audio.dataset.userVol !== 'undefined'
    ? parseFloat(audio.dataset.userVol)
    : (audio.volume || 0.42);

  window.__bgClip = clip;
  window.__audioStartAt = getAudioStartForClip(clip);

  if (incoming) {
    const src = incoming.querySelector('source');
    if (src) src.src = clip;
    incoming.load();
    try { await incoming.play(); } catch (_) {}
  }

  const fadeMs = reduceMotion ? 0 : 700;
  if (audio && wasPlaying) {
    fadeVolume(audio, 0, fadeMs * 0.65);
  }

  await new Promise((r) => setTimeout(r, reduceMotion ? 0 : 120));

  if (incoming) incoming.classList.add('is-active');
  if (outgoing) outgoing.classList.remove('is-active');

  applyThemeClasses(clip);
  applyMeta(clip);

  await new Promise((r) => setTimeout(r, fadeMs));

  if (outgoing) {
    try { outgoing.pause(); } catch (_) {}
  }

  if (audio) {
    const source = audio.querySelector('source');
    if (source) source.src = getTrackForClip(clip);
    audio.load();
    const startPlay = () => {
      if (window.__audioStartAt) audio.currentTime = window.__audioStartAt;
      audio.volume = 0;
      if (wasPlaying || entered) {
        unlockAudio();
        audio.play().then(() => {
          setPlaying(true);
          fadeVolume(audio, targetVol, reduceMotion ? 0 : 550);
        }).catch(() => setPlaying(false));
      } else {
        audio.volume = targetVol;
      }
    };
    if (audio.readyState >= 2) startPlay();
    else audio.addEventListener('canplay', startPlay, { once: true });
  }

  document.body.classList.remove('is-theme-fading');
  bgSwitching = false;
  showToast(getThemeLabel(clip));
}

// Hotkeys · 1–5 / Numpad 1–5 เลือกธีม · [ ] หรือ T สลับ · 6 secret
document.addEventListener('keydown', (event) => {
  const tag = event.target && event.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || event.target.isContentEditable) return;
  if (!entered && event.code !== 'Enter' && event.code !== 'Space') return;

  // cycle theme
  if (event.code === 'BracketRight' || event.code === 'KeyT') {
    event.preventDefault();
    cycleTheme(1);
    return;
  }
  if (event.code === 'BracketLeft') {
    event.preventDefault();
    cycleTheme(-1);
    return;
  }

  if (event.code === 'Numpad6' || event.code === 'Digit6') {
    event.preventDefault();
    const on = document.body.classList.toggle('theme-secret');
    showToast(on ? 'secret · on' : 'secret · off');
    return;
  }

  const clip = THEME_CLIPS[event.code];
  if (!clip) return;
  event.preventDefault();
  switchBackground(clip);
});

// default theme on load
document.body.classList.add('theme-alt');
applyMeta('222.mp4');

// ========== Stars (from pro) ==========
const canvas = document.getElementById('stars');
const ctx = canvas.getContext('2d');
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

const stars = [];
for (let i = 0; i < 110; i++) {
  stars.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    radius: Math.random() * 1.4 + 0.3,
    opacity: Math.random() * 0.7 + 0.2,
    speed: Math.random() * 0.15 + 0.05,
    twinkle: Math.random() * Math.PI * 2
  });
}

function drawStars() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const s of stars) {
    s.twinkle += 0.02;
    const alpha = s.opacity * (0.6 + 0.4 * Math.sin(s.twinkle));
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(200, 180, 255, ${alpha})`;
    ctx.fill();
    s.y -= s.speed;
    if (s.y < -5) {
      s.y = canvas.height + 5;
      s.x = Math.random() * canvas.width;
    }
  }
  requestAnimationFrame(drawStars);
}
drawStars();

// ========== Particles (from profile idea) ==========
const particlesEl = document.getElementById('particles');
function spawnParticle() {
  const p = document.createElement('div');
  p.className = 'particle';
  p.style.left = Math.random() * 100 + '%';
  p.style.bottom = '-10px';
  p.style.animationDuration = (8 + Math.random() * 10) + 's';
  p.style.opacity = 0.3 + Math.random() * 0.5;
  particlesEl.appendChild(p);
  setTimeout(() => p.remove(), 18000);
}
setInterval(spawnParticle, 600);
for (let i = 0; i < 8; i++) setTimeout(spawnParticle, i * 400);

// ========== Navbar · sticky + active indicator + scroll progress ==========
const navbar = document.getElementById('navbar');
const navLinks = document.querySelectorAll('.nav-link');
const sections = document.querySelectorAll('.section');
const navIndicator = document.getElementById('navIndicator');
const scrollProgress = document.getElementById('scrollProgress');
let currentSectionId = 'about';

function moveNavIndicator(activeLink) {
  if (!navIndicator || !activeLink) return;
  const parent = activeLink.parentElement;
  const parentRect = parent.getBoundingClientRect();
  const linkRect = activeLink.getBoundingClientRect();
  const left = linkRect.left - parentRect.left;
  navIndicator.style.width = linkRect.width + 'px';
  navIndicator.style.transform = `translateX(${left}px)`;
}

function setActiveSection(id) {
  if (!id) return;
  if (id === currentSectionId) {
    const active = document.querySelector(`.nav-link[data-section="${currentSectionId}"]`);
    if (active) moveNavIndicator(active);
    return;
  }
  currentSectionId = id;
  navLinks.forEach((link) => {
    const on = link.dataset.section === id;
    link.classList.toggle('active', on);
    if (on) moveNavIndicator(link);
  });
}

function updateScrollUI() {
  const scrollY = window.scrollY || document.documentElement.scrollTop;
  const docH = document.documentElement.scrollHeight - window.innerHeight;
  const pct = docH > 0 ? Math.min(100, (scrollY / docH) * 100) : 0;
  if (scrollProgress) scrollProgress.style.width = pct + '%';

  if (navbar) {
    navbar.classList.toggle('is-scrolled', scrollY > 24);
  }

  const probe = scrollY + window.innerHeight * 0.35;
  let activeId = currentSectionId;
  sections.forEach((section) => {
    const top = section.offsetTop;
    const bottom = top + section.offsetHeight;
    if (probe >= top && probe < bottom) {
      activeId = section.id;
    }
    const rect = section.getBoundingClientRect();
    const inView = rect.top < window.innerHeight * 0.75 && rect.bottom > 80;
    section.classList.toggle('is-inview', inView);
  });
  setActiveSection(activeId);
}

window.addEventListener('scroll', updateScrollUI, { passive: true });
window.addEventListener('resize', () => {
  const active = document.querySelector('.nav-link.active');
  if (active) moveNavIndicator(active);
  updateScrollUI();
});

requestAnimationFrame(() => {
  const first = document.querySelector('.nav-link.active') || navLinks[0];
  if (first) moveNavIndicator(first);
  updateScrollUI();
  sections.forEach((s) => s.classList.add('is-inview'));
});

navLinks.forEach((link) => {
  link.addEventListener('click', () => {
    const id = link.dataset.section;
    setActiveSection(id);
  });
});

// ========== Albums (core from pro + extra from profile assets) ==========
const ALBUMS = {
  videos: {
    title: 'Clips & Videos',
    items: [
      { type: 'video', src: '1.1.mp4', thumb: 'vid-1.1.jpg' },
      { type: 'video', src: '1.2.mp4', thumb: 'vid-1.2.jpg' },
      { type: 'video', src: '1.3.mp4', thumb: 'vid-1.3.jpg' },
      { type: 'video', src: '1.4.mp4', thumb: 'vid-1.4.jpg' }
    ]
  },
  games: {
    title: 'FiveM / Game',
    items: [
      { type: 'image', src: 'game-1.png' },
      { type: 'image', src: 'game-2.png' },
      { type: 'image', src: 'game-3.png' },
      { type: 'image', src: 'game-4.png' },
      { type: 'image', src: 'game-5.png' },
      { type: 'image', src: 'game-6.png' },
      { type: 'image', src: 'game-7.png' },
      { type: 'image', src: 'game-8.png' },
      { type: 'image', src: 'game-9.png' },
      { type: 'image', src: 'game-10.jpg' },
      { type: 'image', src: 'game-11.jpg' },
      { type: 'image', src: 'game-12.jpg' },
      { type: 'image', src: 'game-13.jpg' },
      { type: 'image', src: 'game-14.jpg' },
      { type: 'image', src: 'game-15.png' }
    ]
  },
  chars: {
    title: 'Novel Characters',
    items: [
      { type: 'image', src: 'char-clan.png' },
      { type: 'image', src: 'char-testaros.png' },
      { type: 'image', src: 'char-kline.png' },
      { type: 'image', src: 'char-raven.png' },
      { type: 'image', src: 'char-mikasa.png' },
      { type: 'image', src: 'char-lumine.jfif' },
      { type: 'image', src: 'char-encrid.png' },
      { type: 'image', src: 'char-serios1.jfif' },
      { type: 'image', src: 'char-liliane.jfif' },
      { type: 'image', src: 'char-serios2.jfif' },
      { type: 'image', src: 'char-seraphina.jfif' },
      { type: 'image', src: 'char-varencia.png' },
      { type: 'image', src: 'char-lucifer.png' },
      { type: 'image', src: 'char-raymond.png' }
    ]
  },
  extra: {
    title: 'City & Scenes',
    items: [
      { type: 'image', src: 'work-lightcity.png' },
      { type: 'image', src: 'image1.png' },
      { type: 'image', src: 'game-7.png' },
      { type: 'image', src: 'game-8.png' },
      { type: 'image', src: 'game-9.png' }
    ]
  }
};

const albumModal = document.getElementById('albumModal');
const albumTitle = document.getElementById('albumTitle');
const albumBody = document.getElementById('albumBody');
const albumClose = document.getElementById('albumClose');
const albumBackdrop = document.getElementById('albumBackdrop');

let currentItems = [];
let currentIndex = 0;

document.querySelectorAll('[data-album]').forEach((el) => {
  el.addEventListener('click', () => openAlbum(el.dataset.album));
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openAlbum(el.dataset.album);
    }
  });
});

function openAlbum(key) {
  const album = ALBUMS[key];
  if (!album) return;
  currentItems = album.items;
  albumTitle.textContent = album.title;
  albumBody.innerHTML = '';

  album.items.forEach((item, i) => {
    const el = document.createElement('div');
    el.className = 'album-item';
    el.style.animationDelay = (0.04 * i) + 's';
    if (item.type === 'video') {
      el.innerHTML = `
        <img src="${item.thumb || item.src}" alt="Video ${i + 1}" loading="lazy" />
        <div class="play-badge"><i class="fas fa-play"></i></div>
      `;
    } else {
      el.innerHTML = `<img src="${item.src}" alt="Image ${i + 1}" loading="lazy" />`;
    }
    el.addEventListener('click', () => openLightbox(i));
    albumBody.appendChild(el);
  });

  albumModal.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeAlbum() {
  albumModal.hidden = true;
  document.body.style.overflow = entered ? '' : 'hidden';
}

albumClose.addEventListener('click', closeAlbum);
albumBackdrop.addEventListener('click', closeAlbum);

// ========== Lightbox ==========
const lightbox = document.getElementById('lightbox');
const lightboxContent = document.getElementById('lightboxContent');
const lightboxClose = document.getElementById('lightboxClose');
const lightboxPrev = document.getElementById('lightboxPrev');
const lightboxNext = document.getElementById('lightboxNext');
const lightboxCount = document.getElementById('lightboxCount');

function openLightbox(index) {
  currentIndex = index;
  renderLightbox();
  lightbox.hidden = false;
}

function renderLightbox() {
  const item = currentItems[currentIndex];
  if (!item) return;
  lightboxContent.innerHTML = '';
  if (item.type === 'video') {
    const v = document.createElement('video');
    v.src = item.src;
    v.controls = true;
    v.autoplay = true;
    v.playsInline = true;
    lightboxContent.appendChild(v);
  } else {
    const img = document.createElement('img');
    img.src = item.src;
    img.alt = '';
    lightboxContent.appendChild(img);
  }
  lightboxCount.textContent = `${currentIndex + 1} / ${currentItems.length}`;
}

function closeLightbox() {
  lightbox.hidden = true;
  const v = lightboxContent.querySelector('video');
  if (v) {
    v.pause();
    v.src = '';
  }
  lightboxContent.innerHTML = '';
}

function navLightbox(dir) {
  currentIndex = (currentIndex + dir + currentItems.length) % currentItems.length;
  renderLightbox();
}

lightboxClose.addEventListener('click', closeLightbox);
lightboxPrev.addEventListener('click', () => navLightbox(-1));
lightboxNext.addEventListener('click', () => navLightbox(1));

lightbox.addEventListener('click', (e) => {
  if (e.target === lightbox) closeLightbox();
});

document.addEventListener('keydown', (e) => {
  if (lightbox.hidden) {
    if (e.key === 'Escape' && !albumModal.hidden) closeAlbum();
    return;
  }
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') navLightbox(-1);
  if (e.key === 'ArrowRight') navLightbox(1);
});

// ========== Character preview grid ==========
const charsPreview = document.getElementById('charsPreview');
const previewChars = ALBUMS.chars.items.slice(0, 8);
previewChars.forEach((item, i) => {
  const div = document.createElement('div');
  div.className = 'char-preview';
  div.innerHTML = `<img src="${item.src}" alt="Character" loading="lazy" />`;
  div.addEventListener('click', () => {
    currentItems = ALBUMS.chars.items;
    openLightbox(i);
  });
  charsPreview.appendChild(div);
});

// ========== Profile card flip (QR back) ==========
const profileCard = document.getElementById('profileCard');
if (profileCard) {
  let flipBusy = false;
  const isTouchDevice = () =>
    window.matchMedia('(hover: none), (pointer: coarse)').matches ||
    window.matchMedia('(max-width: 720px)').matches;

  function toggleProfileFlip(onComplete) {
    if (flipBusy) return;
    flipBusy = true;
    const willShowBack = !profileCard.classList.contains('is-flipped');
    profileCard.classList.add('is-flipping');
    // สลับหน้า/หลังตรงกลาง animation (ตอน scaleX ≈ 0)
    setTimeout(() => {
      profileCard.classList.toggle('is-flipped');
    }, 320);
    setTimeout(() => {
      profileCard.classList.remove('is-flipping');
      flipBusy = false;
      if (typeof onComplete === 'function') onComplete(willShowBack);
    }, 720);
  }

  profileCard.addEventListener('click', (e) => {
    // อย่าพลิกเมื่อกดลิงก์โซเชียล
    if (e.target.closest('a.social-btn')) return;

    // มือถือ: ครั้งที่ 1 → ด้านหลัง · ครั้งที่ 2 → กลับหน้า + เปลี่ยนพื้นหลัง
    if (isTouchDevice()) {
      const showingBack = profileCard.classList.contains('is-flipped');
      if (showingBack) {
        toggleProfileFlip(() => {
          if (entered) cycleTheme(1);
        });
      } else {
        toggleProfileFlip();
      }
      return;
    }

    toggleProfileFlip();
  });

  profileCard.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleProfileFlip();
    }
  });
}


// ========== Cursor spotlight ==========
(function initSpotlight() {
  const spot = document.getElementById('spotlight');
  if (!spot) return;
  if (window.matchMedia('(hover: none), (pointer: coarse)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const root = document.documentElement;
  let mx = window.innerWidth / 2;
  let my = window.innerHeight / 2;
  let sx = mx;
  let sy = my;
  let raf = 0;
  let active = false;

  function paint() {
    // smooth follow (lerp)
    sx += (mx - sx) * 0.14;
    sy += (my - sy) * 0.14;
    root.style.setProperty('--spot-x', sx.toFixed(1) + 'px');
    root.style.setProperty('--spot-y', sy.toFixed(1) + 'px');
    const dx = Math.abs(mx - sx) + Math.abs(my - sy);
    if (dx > 0.4) {
      raf = requestAnimationFrame(paint);
    } else {
      raf = 0;
    }
  }

  function onMove(e) {
    mx = e.clientX;
    my = e.clientY;
    if (!active) {
      active = true;
      spot.classList.add('is-on');
    }
    if (!raf) raf = requestAnimationFrame(paint);
  }

  function onLeave() {
    active = false;
    spot.classList.remove('is-on', 'is-hot');
  }

  // brighter when hovering interactive targets
  document.addEventListener('mouseover', (e) => {
    const hot = e.target.closest(
      'a, button, .card-flip, .project-card, .char-preview, .album-item, .social-btn, .nav-link, .tag'
    );
    spot.classList.toggle('is-hot', !!hot);
  });

  window.addEventListener('mousemove', onMove, { passive: true });
  document.addEventListener('mouseleave', onLeave);
})();


// ========== Card light reflection ==========
(function initCardReflection() {
  if (window.matchMedia('(hover: none), (pointer: coarse)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const selector = '.card, .project-card, .char-preview, .album-item';

  function onMove(e) {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    el.style.setProperty('--rx', x.toFixed(2) + '%');
    el.style.setProperty('--ry', y.toFixed(2) + '%');
  }

  function bind(el) {
    if (el.dataset.reflectBound) return;
    el.dataset.reflectBound = '1';
    el.addEventListener('mousemove', onMove, { passive: true });
  }

  document.querySelectorAll(selector).forEach(bind);

  // album items created dynamically
  const body = document.getElementById('albumBody');
  if (body) {
    const obs = new MutationObserver(() => {
      body.querySelectorAll('.album-item').forEach(bind);
    });
    obs.observe(body, { childList: true });
  }
})();


// ========== Audio visualizer ==========
const vizEl = document.getElementById('viz');
const VIZ_BARS = 14;
let audioCtx = null;
let analyser = null;
let mediaSourceNode = null;
let freqData = null;
let vizRaf = 0;
let vizBars = [];

if (vizEl) {
  for (let i = 0; i < VIZ_BARS; i++) {
    const bar = document.createElement('span');
    bar.className = 'viz-bar';
    vizEl.appendChild(bar);
    vizBars.push(bar);
  }
}

/**
 * Create the Web Audio graph once.
 * IMPORTANT:
 * - Must be called during a user gesture (click/keydown) or AudioContext stays suspended.
 * - On file:// protocol Chrome blocks MediaElementSource with CORS → outputs zeroes (silence).
 *   In that case we skip the graph entirely so the <audio> element plays normally.
 */
const isFileProtocol = location.protocol === 'file:';

function ensureAudioGraph() {
  if (!music) return;
  // file:// → never call createMediaElementSource (it mutes the element permanently)
  if (isFileProtocol) return;
  // already built
  if (analyser && audioCtx) {
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return;
  }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    audioCtx = new AC();
    // createMediaElementSource takes over the <audio> output —
    // we MUST connect it all the way to destination or there is no sound
    mediaSourceNode = audioCtx.createMediaElementSource(music);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64;
    analyser.smoothingTimeConstant = 0.72;
    mediaSourceNode.connect(analyser);
    analyser.connect(audioCtx.destination);
    freqData = new Uint8Array(analyser.frequencyBinCount);
    // resume immediately while we still have user activation
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
  } catch (err) {
    console.warn('visualizer unavailable', err);
    analyser = null;
    mediaSourceNode = null;
  }
}

function startViz() {
  if (vizRaf) return;

  // Real analyser available (http/https) → use frequency data
  if (analyser && !isFileProtocol) {
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    const tick = () => {
      if (!isPlaying || !analyser) {
        vizRaf = 0;
        return;
      }
      analyser.getByteFrequencyData(freqData);
      const n = vizBars.length;
      const bins = freqData.length;
      for (let i = 0; i < n; i++) {
        const idx = Math.min(bins - 1, 1 + Math.floor(i * (bins - 2) / n));
        const v = freqData[idx] / 255;
        const center = 1 - Math.abs(i - (n - 1) / 2) / ((n - 1) / 2);
        const h = Math.max(0.12, Math.min(1, v * 0.85 + center * 0.12)) * 100;
        vizBars[i].style.height = h.toFixed(1) + '%';
      }
      vizRaf = requestAnimationFrame(tick);
    };
    vizRaf = requestAnimationFrame(tick);
    return;
  }

  // file:// fallback: fake gentle pulse so the bars still look alive
  const tickFake = () => {
    if (!isPlaying) {
      vizRaf = 0;
      return;
    }
    const t = performance.now() / 280;
    const n = vizBars.length;
    for (let i = 0; i < n; i++) {
      const center = 1 - Math.abs(i - (n - 1) / 2) / ((n - 1) / 2);
      const wave = 0.35 + 0.45 * Math.sin(t + i * 0.55) * Math.sin(t * 0.7 + i * 0.3);
      const h = Math.max(0.12, Math.min(1, wave * 0.7 + center * 0.25)) * 100;
      vizBars[i].style.height = h.toFixed(1) + '%';
    }
    vizRaf = requestAnimationFrame(tickFake);
  };
  vizRaf = requestAnimationFrame(tickFake);
}

function stopViz() {
  if (vizRaf) {
    cancelAnimationFrame(vizRaf);
    vizRaf = 0;
  }
  vizBars.forEach((bar, i) => {
    const base = 12 + (i % 3) * 4;
    bar.style.height = base + '%';
  });
}