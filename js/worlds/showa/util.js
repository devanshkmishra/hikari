// 銀座 一九八五 — small shared helpers.

export const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
export const easeInOut = (t) => { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const easeOut = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

// mulberry32 with a few conveniences.
export function rng(seed) {
  let a = (seed >>> 0) || 1;
  const f = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.range = (lo, hi) => lo + (hi - lo) * f();
  f.int = (lo, hi) => Math.floor(lo + (hi - lo + 1) * f());
  f.pick = (arr) => arr[Math.floor(f() * arr.length)];
  f.chance = (p) => f() < p;
  f.weighted = (pairs) => {
    let tot = 0;
    for (const p of pairs) tot += p[1];
    let r = f() * tot;
    for (const p of pairs) { r -= p[1]; if (r <= 0) return p[0]; }
    return pairs[pairs.length - 1][0];
  };
  return f;
}

export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function el(tag, cls, parent, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  if (parent) parent.appendChild(e);
  return e;
}

export function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

// ---- kanji numerals & the 1985 clock ---------------------------------------
const KD = '〇一二三四五六七八九';
export const kanjiDigits = (n) => String(n).split('').map((d) => KD[+d]).join('');
export function kanjiNum(n) {
  if (n === 0) return '〇';
  const t = Math.floor(n / 10), o = n % 10;
  let s = '';
  if (t) s += (t > 1 ? KD[t] : '') + '十';
  if (o) s += KD[o];
  return s;
}
// The world is fixed on one night: Sunday 27 October 1985 (Shōwa 60). The minute is yours.
export const DATE_JP = '一九八五年十月二十七日';
export function clockJP(d = new Date()) {
  const h = d.getHours(), m = d.getMinutes();
  const h12 = h % 12;
  return `${h < 12 ? '午前' : '午後'}${h12 === 0 ? '零' : kanjiNum(h12)}時${m === 0 ? 'ちょうど' : kanjiNum(m) + '分'}`;
}
export function stampJP(d = new Date()) { return `${DATE_JP}、${clockJP(d)}。`; }
export function stampEN(d = new Date()) {
  const h = d.getHours(), m = d.getMinutes();
  return `27 October 1985, ${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'a.m.' : 'p.m.'}`;
}

// ---- canvas helpers ---------------------------------------------------------
const glowCache = new Map();
// Soft radial glow sprite (cached). Returns a canvas of size 2r.
export function glow(color, r = 64, falloff = 2.2) {
  const key = color + '|' + r + '|' + falloff;
  if (glowCache.has(key)) return glowCache.get(key);
  const c = canvas(r * 2, r * 2);
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(r, r, 0, r, r, r);
  const rgb = hexRgb(color);
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const a = Math.pow(1 - t, falloff);
    grd.addColorStop(t, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a.toFixed(4)})`);
  }
  g.fillStyle = grd;
  g.fillRect(0, 0, r * 2, r * 2);
  glowCache.set(key, c);
  return c;
}

export function hexRgb(hex) {
  const h = hex.replace('#', '');
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}
export const rgba = (hex, a) => { const [r, g, b] = hexRgb(hex); return `rgba(${r},${g},${b},${a})`; };
export function mix(h1, h2, t) {
  const a = hexRgb(h1), b = hexRgb(h2);
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
}

// Grain tiles: a few pre-baked noise frames, cycled at film rate.
export function grainTiles(n = 4, size = 192) {
  const out = [];
  for (let k = 0; k < n; k++) {
    const c = canvas(size, size);
    const g = c.getContext('2d');
    const im = g.createImageData(size, size);
    for (let i = 0; i < im.data.length; i += 4) {
      const v = 128 + (Math.random() + Math.random() + Math.random() - 1.5) * 120;
      im.data[i] = im.data[i + 1] = im.data[i + 2] = v;
      im.data[i + 3] = 255;
    }
    g.putImageData(im, 0, 0);
    out.push(c);
  }
  return out;
}

// Vertical text: draw each glyph stacked, centered at x, starting at y.
export function vtext(g, str, x, y, size, gap = 1.04) {
  const chars = [...str];
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (ch === 'ー' || ch === '〜' || ch === '…') {
      g.save();
      g.translate(x, y + i * size * gap + size * 0.5);
      g.rotate(Math.PI / 2);
      g.fillText(ch, 0, 0);
      g.restore();
    } else {
      g.fillText(ch, x, y + i * size * gap + size * 0.5);
    }
  }
}

export function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

// Ensure the Google font subsets we draw into canvases are actually loaded.
export function loadFonts(specs) {
  if (!document.fonts || !document.fonts.load) return Promise.resolve();
  return Promise.all(specs.map(([font, text]) => document.fonts.load(font, text).catch(() => null)))
    .then(() => null).catch(() => null);
}

export const isTouch = () => typeof matchMedia === 'function' && matchMedia('(hover: none)').matches;
