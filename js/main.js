// HIKARI — 画面の向こう. The shell: a stage that mounts one scene at a time
// (the room, the train, a world, the ending), the lights, and the HUD.
import { AudioEngine } from './lib/audio.js';
import { jpHTML, attachGloss, hideGloss } from './lib/jp.js';
import { LINE, TERMINUS, loadWorld } from './worlds/index.js';
import { chime, knock } from './shell/sfx.js';

const UNLOCK = 5;               // lights needed before the line extends to 銀河
const KEY = 'hikari:v1';
const $ = (s) => document.querySelector(s);
const stageEl = $('#stage');
const veilEl = $('#veil');
const boardBtn = $('#board');
const lightsEl = $('#lights');
const toastEl = $('#toast');
const crtEl = $('#crt');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ───────────────────────── persistence ─────────────────────────
const blank = () => ({ orbs: {}, visits: {}, kv: {}, rained: false, finished: false });
let save = blank();
try { save = Object.assign(blank(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) {} };
export const lightsCount = () => LINE.filter((s) => save.orbs[s.id]).length;
const endingReady = () => lightsCount() >= UNLOCK;

// ───────────────────────── audio ─────────────────────────
let audio = null;
let muted = false;

// ───────────────────────── language ─────────────────────────
// 'ja' (default: Japanese with hover glosses) or 'en' (everything readable in English).
const langListeners = new Set();
export const getLang = () => (save.lang === 'en' ? 'en' : 'ja');
function setLang(l) {
  save.lang = l === 'en' ? 'en' : 'ja';
  persist();
  document.documentElement.classList.toggle('lang-en', save.lang === 'en');
  document.documentElement.lang = save.lang;
  const b = document.getElementById('lang');
  if (b) { b.textContent = save.lang === 'en' ? 'EN' : '日本語'; b.title = save.lang === 'en' ? 'English mode — click for Japanese' : '日本語モード — click for English'; }
  langListeners.forEach((fn) => { try { fn(save.lang); } catch (e) { console.error(e); } });
}

// ───────────────────────── scene management ─────────────────────────
let current = null;   // { id, root, ctx, handle, teardown }
let busy = false;

function makeScene(id, extras = {}) {
  const root = document.createElement('div');
  root.className = 'scene scene-' + id;
  stageEl.appendChild(root);

  const ac = audio.ac;
  const fader = ac.createGain();
  fader.gain.value = 0;
  fader.connect(audio.master);
  const out = ac.createGain();
  out.connect(fader);
  const sendFader = ac.createGain();
  sendFader.gain.value = 0;
  sendFader.connect(audio.reverbIn);
  const send = ac.createGain();
  send.connect(sendFader);

  const abort = new AbortController();
  const timers = new Set();
  const intervals = new Set();
  const loops = new Set();

  save.visits[id] = (save.visits[id] || 0) + 1;
  persist();

  const ctx = {
    id,
    get w() { return root.clientWidth || innerWidth; },
    get h() { return root.clientHeight || innerHeight; },
    dpr: Math.min(2, devicePixelRatio || 1),
    audio,
    out,
    send,
    signal: abort.signal,
    loop(fn) {
      let last = performance.now();
      let raf = 0;
      const stepFn = (now) => {
        if (abort.signal.aborted) return;
        const dt = Math.min(0.1, (now - last) / 1000);
        last = now;
        try { fn(now / 1000, dt); } catch (e) { console.error(e); }
        raf = requestAnimationFrame(stepFn);
      };
      raf = requestAnimationFrame(stepFn);
      const stop = () => { cancelAnimationFrame(raf); loops.delete(stop); };
      loops.add(stop);
      return stop;
    },
    timeout(fn, ms) {
      const t = setTimeout(() => { timers.delete(t); if (!abort.signal.aborted) fn(); }, ms);
      timers.add(t);
      return t;
    },
    interval(fn, ms) {
      const t = setInterval(() => { if (!abort.signal.aborted) fn(); }, ms);
      intervals.add(t);
      return t;
    },
    award: (label) => award(id, label),
    hasOrb: () => !!save.orbs[id],
    visits: save.visits[id],
    store: {
      get(k, fallback) { const v = save.kv[id + ':' + k]; return v === undefined ? fallback : v; },
      set(k, v) { save.kv[id + ':' + k] = v; persist(); },
    },
    leave: () => goTrain(id),
    exitVisible: (v) => { exitWanted = !!v; syncBoard(); },
    toast,
    hudInset: ({ bottom = 0 } = {}) => document.getElementById('hud').style.setProperty('--hud-bottom', bottom + 'px'),
    crt: (a) => crtEl.style.setProperty('--crt', String(Math.max(0, Math.min(1, a)))),
    jp: { html: jpHTML, attach: (el) => attachGloss(el, abort.signal) },
    get muted() { return muted; },
    get lang() { return getLang(); },
    get en() { return getLang() === 'en'; },
    onLang(fn) { langListeners.add(fn); abort.signal.addEventListener('abort', () => langListeners.delete(fn)); },
    name: 'Devansh',
    reduced,
    ...extras,
  };

  const teardown = () => {
    abort.abort();
    timers.forEach(clearTimeout);
    intervals.forEach(clearInterval);
    [...loops].forEach((s) => s());
    hideGloss();
    const t = audio.now();
    fader.gain.cancelScheduledValues(t);
    fader.gain.setValueAtTime(fader.gain.value, t);
    fader.gain.linearRampToValueAtTime(0, t + 0.6);
    sendFader.gain.cancelScheduledValues(t);
    sendFader.gain.setValueAtTime(sendFader.gain.value, t);
    sendFader.gain.linearRampToValueAtTime(0, t + 0.6);
    setTimeout(() => { try { fader.disconnect(); sendFader.disconnect(); } catch (e) {} }, 900);
  };

  const fadeIn = (sec = 1.2) => {
    const t = audio.now();
    fader.gain.cancelScheduledValues(t);
    fader.gain.setValueAtTime(0, t);
    fader.gain.linearRampToValueAtTime(1, t + sec);
    sendFader.gain.cancelScheduledValues(t);
    sendFader.gain.setValueAtTime(0, t);
    sendFader.gain.linearRampToValueAtTime(1, t + sec);
  };

  return { id, root, ctx, teardown, fadeIn };
}

async function swapTo(id, modPromise, extras = {}, { veil = true, veilColor = '', fade = 1.2, hold = 0 } = {}) {
  modPromise.catch(() => {});
  if (veil) await setVeil(true, veilColor);
  let mod;
  try {
    mod = await modPromise;
  } catch (e) {
    console.warn('scene missing', id, e);
    mod = placeholder(id);
  }
  if (current) {
    const old = current;
    old.teardown();
    try { old.handle && old.handle.destroy && old.handle.destroy(); } catch (e) { console.error(e); }
    old.root.remove();
  }
  crtEl.style.setProperty('--crt', '0');
  document.getElementById('hud').style.setProperty('--hud-bottom', '0px');
  exitWanted = true;
  const scene = makeScene(id, extras);
  current = scene;
  try {
    scene.handle = mod.mount(scene.root, scene.ctx) || {};
  } catch (e) {
    console.error('mount failed', id, e);
    scene.handle = {};
  }
  scene.fadeIn(fade);
  if (hold) await sleep(hold);
  if (veil) setVeil(false);
  return scene;
}

function placeholder(id) {
  return {
    id,
    mount(root, ctx) {
      root.style.cssText = 'display:grid;place-items:center;background:#0b0b10;color:#efe6d2;font-family:"Noto Serif JP",serif;text-align:center';
      root.innerHTML = `<div><div style="font-size:42px;letter-spacing:.3em">工事中</div><div style="margin-top:12px;opacity:.6;font-family:'EB Garamond',serif;font-style:italic">${id} is still being built</div></div>`;
      return {};
    },
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function setVeil(on, color = '') {
  veilEl.classList.toggle('white', color === 'white');
  veilEl.classList.toggle('on', on);
  return sleep(on ? 650 : 50);
}

// ───────────────────────── navigation ─────────────────────────
let phase = 'gate';
let lastStation = null;

export async function goWorld(id, { veilColor = '' } = {}) {
  if (busy) return;
  busy = true;
  phase = 'world';
  lastStation = id;
  boardBtn.hidden = true;
  const st = LINE.find((s) => s.id === id);
  showLights(true);
  const scene = await swapTo(id, loadWorld(id), {}, { veil: true, veilColor, hold: veilColor ? 900 : 200, fade: veilColor ? 2.5 : 1.2 });
  if (st) await ekimei(st);
  busy = false;
  if (current === scene) syncBoard();
}

export async function goTrain(from = lastStation) {
  if (busy) return;
  busy = true;
  phase = 'train';
  boardBtn.hidden = true;
  showLights(true);
  const line = LINE.map((s) => ({ ...s, lit: !!save.orbs[s.id], visited: !!save.visits[s.id] }));
  await swapTo('train', import('./shell/train.js').then((m) => m.default), {
    line,
    terminus: TERMINUS,
    endingReady: endingReady(),
    from: from || null,
    arrive: (id) => (id === 'ginga' ? goEnding() : goWorld(id)),
  }, { veil: true, hold: 150 });
  busy = false;
}

export async function goRoom(extras = {}) {
  phase = 'room';
  boardBtn.hidden = true;
  showLights(lightsCount() > 0);
  await swapTo('room', import('./shell/room.js').then((m) => m.default), {
    lightsCount: lightsCount(),
    endingReady: endingReady(),
    finished: save.finished,
    dive: () => goWorld('station', { veilColor: 'white' }),
    toTrain: () => goTrain(lastStation || 'station'),
    ...extras,
  }, { veil: false, fade: 0.4 });
}

export async function goEnding() {
  if (busy) return;
  busy = true;
  phase = 'ending';
  boardBtn.hidden = true;
  showLights(false);
  await swapTo('ending', import('./shell/ending.js').then((m) => m.default), {
    lights: LINE.map((s) => ({ ...s, label: save.orbs[s.id] ? save.orbs[s.id].label : null })),
    kv: save.kv,
    parade: () => import('./shell/parade.js').then((m) => m.default),
    finish: () => { save.finished = true; persist(); },
    toRoom: () => goRoom({ afterEnding: true }),
  }, { veil: true, hold: 300 });
  busy = false;
}

// ───────────────────────── the station board card ─────────────────────────
function ekimei(st) {
  const i = LINE.indexOf(st);
  const prev = LINE[i - 1] || (endingReady() ? null : null);
  const next = LINE[i + 1] || (endingReady() ? TERMINUS : null);
  const el = document.createElement('div');
  el.className = 'ekimei';
  el.innerHTML = `
    <div class="board">
      <div class="no"><div><b>H</b><span>${st.no.slice(1)}</span></div></div>
      <div class="line-name">ひかり線</div>
      <div class="kanji">${st.jp}</div>
      <div class="kana">${st.kana}</div>
      <div class="roma">${st.en}</div>
      <div class="band">
        <div>${prev ? `← ${prev.kana}<small>${prev.en}</small>` : '&nbsp;'}</div>
        <div class="r">${next ? `${next.kana} →<small>${next.en}</small>` : '&nbsp;'}</div>
      </div>
    </div>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('on')));
  knock(audio);
  return new Promise((res) => {
    setTimeout(() => { el.classList.remove('on'); }, 2400);
    setTimeout(() => { el.remove(); res(); }, 3200);
  });
}

// ───────────────────────── lights ─────────────────────────
function renderLights() {
  lightsEl.innerHTML = LINE.map((s) => `<span class="sock${save.orbs[s.id] ? ' lit' : ''}" title="${s.jp}${save.orbs[s.id] ? ' — ' + save.orbs[s.id].label : ''}"></span>`).join('');
}
function showLights(on) { renderLights(); lightsEl.classList.toggle('show', on); }

function award(id, label = '') {
  if (save.orbs[id]) return false;
  save.orbs[id] = { label: String(label || ''), at: Date.now() };
  persist();
  const wasReady = lightsCount() - 1 >= UNLOCK;

  const wrap = document.createElement('div');
  wrap.className = 'award';
  const orb = document.createElement('div');
  orb.className = 'award-orb';
  const cap = document.createElement('div');
  cap.className = 'award-cap';
  const n = lightsCount();
  cap.innerHTML = getLang() === 'en'
    ? `<div class="a-jp" style="font-family:'EB Garamond',serif;letter-spacing:.2em">ONE LIGHT, FOUND</div><div class="a-en">${escapeHTML(label)}</div>`
    : `<div class="a-jp">光を、ひとつ。</div><div class="a-en">${escapeHTML(label)}</div>`;
  wrap.append(orb, cap);
  document.body.appendChild(wrap);
  chime(audio);

  const cx = innerWidth / 2, cy = innerHeight * 0.5;
  orb.style.left = cx + 'px';
  orb.style.top = cy + 'px';
  const rise = orb.animate([
    { transform: 'translateY(60px) scale(.1)', opacity: 0 },
    { transform: 'translateY(0) scale(1)', opacity: 1, offset: 0.35 },
    { transform: 'translateY(-50px) scale(1.06)', opacity: 1 },
  ], { duration: 3400, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'forwards' });
  setTimeout(() => cap.classList.add('on'), 700);

  rise.finished.then(() => {
    showLights(true);
    const socks = lightsEl.querySelectorAll('.sock');
    const idx = LINE.findIndex((s) => s.id === id);
    const target = socks[idx];
    const r = target ? target.getBoundingClientRect() : { left: innerWidth - 40, top: 20, width: 10, height: 10 };
    const dx = r.left + r.width / 2 - cx;
    const dy = r.top + r.height / 2 - (cy - 50);
    if (target) target.classList.remove('lit');
    setTimeout(() => cap.classList.remove('on'), 1200);
    orb.animate([
      { transform: 'translateY(-50px) scale(1.06)', opacity: 1 },
      { transform: `translate(${dx}px, ${dy - 50}px) scale(.09)`, opacity: 0.95 },
    ], { duration: 1500, delay: 1300, easing: 'cubic-bezier(.6,0,.3,1)', fill: 'forwards' }).finished.then(() => {
      if (target) target.classList.add('lit');
      wrap.remove();
      if (!wasReady && n >= UNLOCK) announceRain();
    });
  });
  return true;
}

function announceRain() {
  toast(getLang() === 'en' ? 'It has started to rain. The line goes further now.' : '雨が降りはじめた。— it has started to rain. the line goes further now.', 6000);
}

const escapeHTML = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ───────────────────────── HUD ─────────────────────────
let exitWanted = true;
function syncBoard() { boardBtn.hidden = !(phase === 'world' && exitWanted && !busy); }
boardBtn.addEventListener('click', () => goTrain(lastStation));

let toastTimer = 0;
export function toast(text, ms = 3200) {
  toastEl.textContent = text;
  toastEl.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('on'), ms);
}

const muteBtn = $('#mute');
function setMuted(m) {
  muted = m;
  if (audio) audio.setMuted(m);
  muteBtn.classList.toggle('off', m);
  if (m && 'speechSynthesis' in window) speechSynthesis.cancel();
}
muteBtn.addEventListener('click', () => setMuted(!muted));
$('#lang')?.addEventListener('click', () => setLang(getLang() === 'en' ? 'ja' : 'en'));
setLang(getLang());

addEventListener('keydown', (e) => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) return;
  if (e.key === 'Escape' && phase === 'world' && exitWanted && !busy) { e.preventDefault(); goTrain(lastStation); }
  if ((e.key === 'm' || e.key === 'M') && !e.metaKey && !e.ctrlKey && audio) setMuted(!muted);
});

addEventListener('resize', () => {
  if (current && current.handle && current.handle.resize) {
    try { current.handle.resize(current.ctx.w, current.ctx.h); } catch (e) { console.error(e); }
  }
});

document.addEventListener('visibilitychange', () => {
  if (!audio) return;
  if (document.hidden) audio.ac.suspend(); else if (!muted || true) audio.ac.resume();
});

// ───────────────────────── boot ─────────────────────────
const params = new URLSearchParams(location.search);
const dev = params.get('dev');
if (params.has('reset')) { try { localStorage.removeItem(KEY); } catch (e) {} save = blank(); }

const gate = $('#gate');
if (dev) gate.querySelector('.gate-hint').textContent = `dev: ${dev} — click`;

const langBtns = gate.querySelectorAll('.gate-langs button');
const GATE_INFO = {
  en: [
    'It begins with an old television. Start there.',
    'Give it about an hour. You can stop anytime; this browser remembers where you were.',
    'Click, drag, scroll and <kbd>Space</kbd> are all you need. <kbd>M</kbd> mutes.',
    'Some places hide a small light. Keep an eye out.',
    'Everything you see and hear is made live, in your browser. Sound on.',
  ],
  ja: [
    '古いテレビから始まります。まずは、そこから。',
    'だいたい一時間。途中でやめても、このブラウザが覚えています。',
    'クリック、ドラッグ、スクロール、<kbd>Space</kbd> で遊べます。<kbd>M</kbd> でミュート。',
    'ところどころに、小さな光が隠れています。',
    '日本語の言葉には、マウスを乗せると辞書が出ます。',
  ],
};
const syncGate = () => {
  const info = gate.querySelector('.gate-info');
  if (info) info.innerHTML = GATE_INFO[getLang()].map((t) => `<li>${t}</li>`).join('');
  langBtns.forEach((b) => b.classList.toggle('on', b.dataset.l === getLang()));
  gate.querySelector('.gate-hint').textContent = dev ? `dev: ${dev} — click` : (getLang() === 'en' ? 'click to begin' : 'クリックして、はじめる');
};
langBtns.forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); setLang(b.dataset.l); syncGate(); }));
syncGate();

gate.addEventListener('click', async () => {
  audio = new AudioEngine();
  await audio.resume();
  gate.classList.add('gone');
  setTimeout(() => gate.remove(), 1500);
  window.__hikari = { audio, save, goWorld, goTrain, goRoom, goEnding, award, toast };
  if (!dev) return goRoom();
  if (LINE.some((s) => s.id === dev)) return goWorld(dev);
  if (dev === 'train') return goTrain(params.get('from') || null);
  if (dev === 'ending' || dev === 'ginga') return goEnding();
  if (dev === 'room') return goRoom();
  if (dev === 'parade') {
    phase = 'ending';
    return swapTo('parade', import('./shell/parade.js').then((m) => m.default), { done: () => toast('parade done') }, { veil: false });
  }
  goRoom();
}, { once: true });
