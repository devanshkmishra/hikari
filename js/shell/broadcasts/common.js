// Shared plumbing for the Act I broadcasts.
// - a broadcast clock that keeps running while you are on another channel (programmes go on
//   without you, like real TV), plus the fictional 1 a.m. wall clock
// - canvases that match the TV canvas' backing store, web-font readiness, cached layers
// - the RF "look": luma smear, multipath ghost, low-bandwidth chroma bleed, a little snow
// - an audio timeline locked to the broadcast clock

export const T0 = performance.now();
/** Seconds since the transmitters came on (module load). */
export const gclock = () => (performance.now() - T0) / 1000;

// The fiction: you sat down at 1:12 a.m., Sunday 17 August 1986.
const WALL0 = 1 * 3600 + 12 * 60 + 36;
export function wall() {
  const s = WALL0 + gclock();
  return { h: Math.floor(s / 3600) % 24, m: Math.floor(s / 60) % 60, s: Math.floor(s) % 60, f: s % 1 };
}
export const DATE = { y: 1986, mo: 8, d: 17, dow: '日' };

export const pad2 = (n) => (n < 10 ? '0' : '') + n;
export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
export const vnoise = (x) => { const i = Math.floor(x), f = x - i; return lerp(hash(i), hash(i + 1), f * f * (3 - 2 * f)); };
export const easeOutBack = (t) => { const c = 1.9; t = clamp(t) - 1; return 1 + (c + 1) * t * t * t + c * t * t; };

// Programmes are authored at this size and scaled to whatever W×H the TV asks for.
export const DW = 640, DH = 480;

// ---------- canvases ----------
let OPTS = null;
/** Match the TV canvas' backing (GPU vs willReadFrequently CPU) so drawImage never forces readbacks. */
export function adopt(g) {
  if (OPTS) return;
  OPTS = {};
  try {
    const a = g.getContextAttributes && g.getContextAttributes();
    if (a && a.willReadFrequently) OPTS.willReadFrequently = true;
  } catch (e) { /* older engines */ }
}
export function mk(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d', OPTS || {})];
}

// ---------- fonts ----------
export const F = {
  dot: '"DotGothic16", "Hiragino Kaku Gothic ProN", "Yu Gothic", monospace',
  vt: '"VT323", "IBM Plex Mono", monospace',
  goth: '"Zen Kaku Gothic New", "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif',
  round: '"M PLUS Rounded 1c", "Hiragino Maru Gothic ProN", sans-serif',
  serif: '"Noto Serif JP", "Hiragino Mincho ProN", serif',
  mincho: '"Shippori Mincho B1", "Noto Serif JP", "Hiragino Mincho ProN", serif',
  pop: '"Mochiy Pop One", "M PLUS Rounded 1c", sans-serif',
};

// Google Fonts serves Japanese in unicode-range slices that only load when used, and canvas
// text does not always trigger that. So every programme declares the text it draws.
export let fontEpoch = 0;
const wants = [];
export function wantFont(spec, text) { wants.push([spec, text]); }
let lastKick = -1e9, kicks = 0;
export function kickFonts() {
  if (typeof document === 'undefined' || !document.fonts || kicks > 45) return;
  const now = performance.now();
  if (now - lastKick < 700) return;
  lastKick = now; kicks++;
  for (const [spec, text] of wants) {
    let ok = true;
    try { ok = document.fonts.check(spec, text); } catch (e) { ok = true; }
    if (!ok) document.fonts.load(spec, text).then((fs) => { if (fs && fs.length) fontEpoch++; }, () => {});
  }
}
if (typeof document !== 'undefined' && document.fonts && document.fonts.addEventListener) {
  document.fonts.addEventListener('loadingdone', () => { fontEpoch++; });
}

// Cached layers. Text layers rebuild when fonts arrive; pass fixed=true for text-free layers.
const CACHE = new Map();
export function cached(key, w, h, build, fixed = false) {
  let e = CACHE.get(key);
  if (e && (fixed || e.epoch === fontEpoch)) return e.c;
  if (!e) { const [c, x] = mk(w, h); e = { c, x, epoch: -1 }; CACHE.set(key, e); }
  const x = e.x;
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  x.clearRect(0, 0, w, h);
  build(x, w, h);
  e.epoch = fontEpoch;
  return e.c;
}

/** Soft additive light sprite, rgb as 'r,g,b'. */
export function glowSprite(rgb) {
  return cached('glow:' + rgb, 64, 64, (x) => {
    const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, `rgba(${rgb},1)`);
    gr.addColorStop(0.22, `rgba(${rgb},0.5)`);
    gr.addColorStop(0.55, `rgba(${rgb},0.12)`);
    gr.addColorStop(1, `rgba(${rgb},0)`);
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  }, true);
}

// ---------- analog noise ----------
let TILES = null;
/** Four 320×384 grayscale snow tiles: bandwidth-limited (horizontally smeared) grain. */
export function noiseTiles() {
  if (TILES) return TILES;
  TILES = [];
  for (let k = 0; k < 4; k++) {
    const w = 320, h = 384;
    const [c, x] = mk(w, h);
    const id = x.createImageData(w, h), d = id.data;
    let v = 0, run = 0;
    for (let i = 0, p = 0; i < w * h; i++, p += 4) {
      if (run-- <= 0) {
        const r = (Math.random() + Math.random() + Math.random()) / 3;
        v = clamp((r - 0.5) * 2.7 + 0.5);
        if (Math.random() < 0.01) v = 1;
        v = (v * 255) | 0;
        run = Math.random() < 0.5 ? 0 : 1 + ((Math.random() * 2) | 0);
      }
      d[p] = d[p + 1] = d[p + 2] = v; d[p + 3] = 255;
    }
    x.putImageData(id, 0, 0);
    TILES.push(c);
  }
  return TILES;
}
export function randomTile() {
  const t = noiseTiles();
  return t[(Math.random() * t.length) | 0];
}

// ---------- the programme stage + RF composite ----------
let P = null, C = null;
/** Clean 640×480 context to author a programme frame into. */
export function stage() {
  if (!P) { P = mk(DW, DH); C = mk(DW >> 3, DH >> 1); }
  const x = P[1];
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  x.imageSmoothingEnabled = true;
  return x;
}
export const stageCanvas = () => P[0];

/**
 * Put the authored frame on the TV canvas as if it came in over the air.
 * q: { noise, smear, ghost (px), ghostA, chroma, shift }
 */
export function broadcast(g, W, H, q = {}) {
  const { noise = 0.04, smear = 0.3, ghost = 9, ghostA = 0.06, chroma = 0.55, shift = 3 } = q;
  const pc = P[0], [cc, cx] = C;
  g.save();
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
  g.imageSmoothingEnabled = true;
  g.drawImage(pc, 0, 0, W, H);
  if (smear) { g.globalAlpha = smear; g.drawImage(pc, 1.6 * W / DW, 0, W, H); }
  if (ghostA) { g.globalAlpha = ghostA; g.drawImage(pc, ghost * W / DW, 0, W, H); }
  if (chroma) {
    cx.globalCompositeOperation = 'copy';
    cx.imageSmoothingEnabled = true;
    cx.drawImage(pc, 0, 0, cc.width, cc.height);
    g.globalCompositeOperation = 'color';
    g.globalAlpha = chroma;
    g.drawImage(cc, shift * W / DW, 0, W, H);
  }
  if (noise) {
    const tl = randomTile();
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = noise;
    g.imageSmoothingEnabled = false;
    g.drawImage(tl, 0, (Math.random() * (tl.height - 240)) | 0, 320, 240, 0, 0, W, H);
  }
  g.restore();
}

// ---------- text ----------
/** Telop text: optional drop shadow, edge stroke, fill. */
export function txt(x, s, X, Y, o = {}) {
  const { font, color = '#fff', align = 'left', base = 'alphabetic', stroke = null, sw = 4,
    shadow = null, sx = 2, sy = 2, spacing = 0 } = o;
  if (font) x.font = font;
  x.textAlign = align; x.textBaseline = base;
  const ls = spacing && 'letterSpacing' in x;
  if (ls) x.letterSpacing = spacing + 'px';
  x.lineJoin = 'round';
  if (shadow) {
    x.fillStyle = shadow;
    if (stroke) { x.lineWidth = sw; x.strokeStyle = shadow; x.strokeText(s, X + sx, Y + sy); }
    x.fillText(s, X + sx, Y + sy);
  }
  if (stroke) { x.lineWidth = sw; x.strokeStyle = stroke; x.strokeText(s, X, Y); }
  x.fillStyle = color;
  x.fillText(s, X, Y);
  if (ls) x.letterSpacing = '0px';
}

/** Vertical (tategaki) text: X = column centre, Y = top. Punctuation sits top-right. */
export function vtxt(x, s, X, Y, size, o = {}) {
  let y = Y;
  for (const ch of s) {
    if (ch === '、' || ch === '。') txt(x, ch, X + size * 0.6, y + size * 0.3, { ...o, align: 'center' });
    else txt(x, ch, X, y + size * 0.88, { ...o, align: 'center' });
    y += size * 1.06;
  }
}

// ---------- audio timeline locked to the broadcast clock ----------
/**
 * events: [{ t (seconds within period), fn(env, acTime, gTime) }]
 * tick(env, gNow, acNow): called every ~40 ms for continuous control.
 * Returns { env, bus, stop() }.
 */
export function timeline(audio, dest, { period = 0, events = [], gain = 1, setup = null, tick = null, lookahead = 0.3 } = {}) {
  const ac = audio.ac;
  const bus = ac.createGain();
  bus.gain.value = gain;
  bus.connect(dest);
  const env = { A: audio, ac, bus, nodes: [] };
  if (setup) setup(env);
  events.sort((a, b) => a.t - b.t);
  let last = gclock();
  let dead = false;
  const step = () => {
    if (dead) return;
    const gNow = gclock(), acNow = ac.currentTime;
    if (tick) tick(env, gNow, acNow);
    const to = gNow + lookahead;
    if (to <= last) return;
    const from = last;
    last = to;
    if (!period || !events.length) return;
    for (let c = Math.floor(from / period); c * period < to; c++) {
      const base = c * period;
      for (const ev of events) {
        const tg = base + ev.t;
        if (tg >= from && tg < to) {
          try { ev.fn(env, Math.max(acNow, acNow + tg - gNow), tg); } catch (e) {
            // never let one note kill the show, but never hide it either
            if (!env.warned) { env.warned = true; console.error('[broadcasts] audio event failed', e); }
          }
        }
      }
    }
  };
  step();
  const id = setInterval(step, 40);
  return {
    env, bus,
    stop() {
      if (dead) return;
      dead = true;
      clearInterval(id);
      const t = ac.currentTime;
      bus.gain.cancelScheduledValues(t);
      bus.gain.setTargetAtTime(0, t, 0.015);
      setTimeout(() => {
        for (const n of env.nodes) { try { n.stop(); } catch (e) {} }
        try { bus.disconnect(); } catch (e) {}
        if (env.cleanup) env.cleanup();
      }, 150);
    },
  };
}

// ---------- English mode: teletext-style subtitles over the (still Japanese) broadcast ----------
export let LANG = 'ja';
export function setLang(l) { LANG = l === 'en' ? 'en' : 'ja'; }
export const EN = () => LANG === 'en';
/**
 * Closed-caption box, 1980s teletext style: each line on its own black slab, VT323, centred.
 * lines: string | string[]; yBottom = baseline of the last line.
 */
export function sub(x, lines, yBottom = 466, color = '#ffff55') {
  if (LANG !== 'en') return;
  const arr = Array.isArray(lines) ? lines : [lines];
  x.save();
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  x.font = `22px ${F.vt}`; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
  arr.forEach((s, i) => {
    const y = yBottom - (arr.length - 1 - i) * 23;
    const w = Math.min(DW - 16, x.measureText(s).width + 16);
    x.fillStyle = 'rgba(0,0,0,0.88)';
    x.fillRect(Math.round(DW / 2 - w / 2), y - 17, Math.round(w), 22);
    x.fillStyle = color;
    x.fillText(s, DW / 2, y);
  });
  x.restore();
}
