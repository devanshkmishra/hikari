// Drawing kit for the parade sprites. One illustration style for everything:
// deep-aubergine ink outlines, flat fills, a soft top-left light and a violet
// bottom-right shade (the night sky reflected), small dot-eyed faces.
// Sprite coordinates are centimetres; the builder scales them to pixels.

export const INK = '#22183a';

export const C = {
  cream: '#fff3dc', paper: '#f7eedb', white: '#fbfbff',
  pink: '#ff6fa8', pinkL: '#ffb6d2', rose: '#ff4f8b',
  red: '#e2394a', vermil: '#d8402c', cherry: '#a8172e',
  gold: '#ffc94a', goldD: '#d9a23a', amber: '#ff9a3c',
  aqua: '#3fc3f0', aquaL: '#a8ecff', bondi: '#22b2c8',
  green: '#3f9a5a', leaf: '#86cf5a',
  navy: '#283070', indigo: '#2b2f86', sky: '#69b8ff',
  wood: '#a86a3a', woodD: '#74462a', woodL: '#d6a066',
  silver: '#cdd3e0', steel: '#8b93aa', chrome: '#e9edf5',
  black: '#2b2733', char: '#3c3a46', lilac: '#b9a6ff',
};

export const F = {
  serif: '"Noto Serif JP", "Hiragino Mincho ProN", serif',
  mincho: '"Shippori Mincho B1", "Noto Serif JP", serif',
  goth: '"Zen Kaku Gothic New", "Hiragino Sans", sans-serif',
  round: '"M PLUS Rounded 1c", "Hiragino Maru Gothic ProN", sans-serif',
  pop: '"Mochiy Pop One", "M PLUS Rounded 1c", sans-serif',
  dot: '"DotGothic16", monospace',
  gara: '"EB Garamond", Georgia, serif',
  y2k: 'Tahoma, Verdana, sans-serif',
  mono: '"IBM Plex Mono", Menlo, monospace',
};

// fonts the sprites use, with the glyphs they need (so the CJK subsets get fetched)
export const FONT_LOADS = [
  ['900 40px "Noto Serif JP"', '祭光夏夢歩香王将銀河祝'],
  ['600 40px "Noto Serif JP"', '夢光祭り'],
  ['800 40px "Shippori Mincho B1"', 'ひかり線銀河大行進お祭り騒ぎ夢の行列光'],
  ['700 40px "Zen Kaku Gothic New"', '帯付美品名盤復刻とまれみよ行先銀河普通発車ひかり線あったか〜いつめた名詞'],
  ['400 40px "Zen Kaku Gothic New"', 'ゆめひかりまつり0123456789'],
  ['800 40px "M PLUS Rounded 1c"', 'いちご牛乳夏のミックスシティポップよる'],
  ['400 40px "Mochiy Pop One"', '星空歌謡ショー0123456789'],
  ['400 40px "DotGothic16"', '(^▽^)(≧▽≦)CH3'],
  ['italic 600 40px "EB Garamond"', 'joy ahead try marching'],
  ['400 40px "VT323"', '0123'],
];

export function loadFonts(timeout = 1600) {
  if (!document.fonts || !document.fonts.load) return Promise.resolve();
  const all = Promise.all(FONT_LOADS.map(([f, s]) => document.fonts.load(f, s).catch(() => null)));
  return Promise.race([all, new Promise((r) => setTimeout(r, timeout))]);
}

// current raster scale (px per cm) while a sprite is being drawn; shadowBlur ignores transforms
let RS = 1;
export const setRS = (r) => { RS = r; };

export function rng(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

// ---------- paths ----------
export function rr(g, x, y, w, h, r) {
  g.beginPath();
  const rad = Math.max(0, Math.min(r, w / 2, h / 2));
  g.roundRect(x, y, w, h, rad);
}
export function ell(g, x, y, rx, ry, rot = 0) {
  g.beginPath();
  g.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, Math.PI * 2);
}
export function circ(g, x, y, r) {
  g.beginPath();
  g.arc(x, y, Math.max(0.01, r), 0, Math.PI * 2);
}
export function poly(g, pts, close = true) {
  g.beginPath();
  g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  if (close) g.closePath();
}

// fill the current path, add the house light + shade inside it, then ink it
export function paint(g, fill, box, o = {}) {
  const [x, y, w, h] = box;
  const { lw = 2.4, gloss = 0.3, shade = 0.3, ink = INK, alpha = 1 } = o;
  g.save();
  g.globalAlpha = alpha;
  g.fillStyle = fill;
  g.fill();
  g.globalAlpha = 1;
  if (gloss || shade) {
    g.clip();
    const gr = g.createLinearGradient(x, y, x + w * 0.45, y + h);
    gr.addColorStop(0, `rgba(255,255,255,${gloss})`);
    gr.addColorStop(0.4, 'rgba(255,255,255,0)');
    gr.addColorStop(0.62, 'rgba(34,12,70,0)');
    gr.addColorStop(1, `rgba(34,12,70,${shade})`);
    g.fillStyle = gr;
    g.fillRect(x - 2, y - 2, w + 4, h + 4);
  }
  g.restore();
  if (lw) {
    g.lineWidth = lw;
    g.strokeStyle = ink;
    g.lineJoin = 'round';
    g.stroke();
  }
}

export function stroke(g, color = INK, lw = 2) {
  g.lineWidth = lw;
  g.strokeStyle = color;
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.stroke();
}

export function fill(g, color) {
  g.fillStyle = color;
  g.fill();
}

// small specular highlight streak
export function shine(g, x, y, rx, ry, a = 0.55, rot = -0.5) {
  g.save();
  g.globalAlpha = a;
  g.fillStyle = '#fff';
  ell(g, x, y, rx, ry, rot);
  g.fill();
  g.restore();
}

// ---------- text ----------
export function text(g, s, x, y, size, o = {}) {
  const { font = F.goth, weight = 700, color = INK, align = 'center', base = 'middle', stroke: st = null, sw = 0, italic = false, glow = 0, glowColor = null, alpha = 1, maxW = 0 } = o;
  g.save();
  g.globalAlpha = alpha;
  g.font = `${italic ? 'italic ' : ''}${weight} ${size}px ${font}`;
  g.textAlign = align;
  g.textBaseline = base;
  if (maxW) {
    const m = g.measureText(s).width;
    if (m > maxW) {
      g.translate(x, y);
      g.scale(maxW / m, 1);
      g.translate(-x, -y);
    }
  }
  if (glow) {
    g.shadowColor = glowColor || color;
    g.shadowBlur = glow * RS;
  }
  if (st) {
    g.lineWidth = sw;
    g.strokeStyle = st;
    g.lineJoin = 'round';
    g.strokeText(s, x, y);
  }
  g.fillStyle = color;
  g.fillText(s, x, y);
  g.restore();
}

// vertical Japanese text, top-down, centred on x
export function vtext(g, s, x, y, size, o = {}) {
  const chars = [...s];
  const lh = o.lh || 1.04;
  chars.forEach((ch, i) => {
    const rot = ch === 'ー' || ch === '〜';
    if (rot) {
      g.save();
      g.translate(x, y + i * size * lh + size / 2);
      g.rotate(Math.PI / 2);
      text(g, ch, 0, 0, size, o);
      g.restore();
    } else {
      text(g, ch, x, y + i * size * lh + size / 2, size, o);
    }
  });
}

// ---------- faces ----------
export function face(g, x, y, s, o = {}) {
  const { eyes = 'dot', mouth = 'smile', blush = true, ink = INK, look = 0 } = o;
  const ex = s * 0.3;
  const er = s * 0.1;
  g.save();
  g.fillStyle = ink;
  g.strokeStyle = ink;
  g.lineWidth = Math.max(1, s * 0.075);
  g.lineCap = 'round';
  for (const d of [-1, 1]) {
    const cx = x + d * ex;
    if (eyes === 'happy') {
      g.beginPath();
      g.arc(cx, y + er * 0.7, er * 1.05, Math.PI * 1.15, Math.PI * 1.85);
      g.stroke();
    } else if (eyes === 'line') {
      g.beginPath();
      g.moveTo(cx - er, y);
      g.lineTo(cx + er, y);
      g.stroke();
    } else if (eyes === 'dots') {
      circ(g, cx, y, er * 0.55);
      g.fill();
    } else {
      ell(g, cx + look * er * 0.3, y, er * 0.8, er * 1.12);
      g.fill();
      g.fillStyle = '#fff';
      circ(g, cx - er * 0.25 + look * er * 0.3, y - er * 0.42, er * 0.3);
      g.fill();
      g.fillStyle = ink;
    }
  }
  const my = y + s * 0.24;
  if (mouth === 'open') {
    g.beginPath();
    g.moveTo(x - s * 0.13, my - s * 0.04);
    g.quadraticCurveTo(x, my + s * 0.26, x + s * 0.13, my - s * 0.04);
    g.closePath();
    g.fill();
    g.save();
    g.clip();
    g.fillStyle = '#ff7f9c';
    ell(g, x, my + s * 0.12, s * 0.08, s * 0.06);
    g.fill();
    g.restore();
  } else if (mouth === 'smile') {
    g.beginPath();
    g.arc(x, my - s * 0.1, s * 0.12, Math.PI * 0.18, Math.PI * 0.82);
    g.stroke();
  } else if (mouth === 'w') {
    g.beginPath();
    g.arc(x - s * 0.055, my - s * 0.04, s * 0.055, Math.PI * 0.1, Math.PI * 0.95);
    g.arc(x + s * 0.055, my - s * 0.04, s * 0.055, Math.PI * 0.05, Math.PI * 0.9);
    g.stroke();
  } else if (mouth === 'o') {
    ell(g, x, my, s * 0.05, s * 0.065);
    g.fill();
  }
  if (blush) {
    g.fillStyle = 'rgba(255,105,150,0.45)';
    ell(g, x - ex * 1.28, y + s * 0.17, s * 0.1, s * 0.055);
    g.fill();
    ell(g, x + ex * 1.28, y + s * 0.17, s * 0.1, s * 0.055);
    g.fill();
  }
  g.restore();
}

// ---------- glow sprites (drawn additively at render time) ----------
export function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export function glowSprite(color, size = 128, core = 0.0) {
  const c = canvas(size, size);
  const g = c.getContext('2d');
  const h = size / 2;
  const gr = g.createRadialGradient(h, h, 0, h, h, h);
  if (core > 0) {
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(core, hexA(color, 0.9));
  } else {
    gr.addColorStop(0, hexA(color, 1));
  }
  gr.addColorStop(Math.max(core + 0.05, 0.2), hexA(color, 0.5));
  gr.addColorStop(0.5, hexA(color, 0.14));
  gr.addColorStop(1, hexA(color, 0));
  g.fillStyle = gr;
  g.fillRect(0, 0, size, size);
  return c;
}

// ---------- sprite builder ----------
// spec: { w, h, frames, pad, draw(g, f, spec) }. R: px per cm.
export function buildSprite(spec, R) {
  const P = spec.pad ?? 8;
  const W = Math.ceil((spec.w + 2 * P) * R);
  const H = Math.ceil((spec.h + 2 * P) * R);
  const frames = [];
  const n = spec.frames || 1;
  for (let f = 0; f < n; f++) {
    const c = canvas(W, H);
    const g = c.getContext('2d');
    setRS(R);
    g.scale(R, R);
    g.translate(P, P);
    g.lineJoin = 'round';
    g.lineCap = 'round';
    try {
      spec.draw(g, f, spec);
    } catch (e) {
      // a broken sprite should never stop the parade
      console.warn('parade sprite', spec.id, e);
    }
    const lw = Math.max(1, Math.round(W / 4));
    const lh = Math.max(1, Math.round(H / 4));
    const lo = canvas(lw, lh);
    const lg = lo.getContext('2d');
    lg.imageSmoothingEnabled = true;
    lg.imageSmoothingQuality = 'high';
    lg.drawImage(c, 0, 0, lw, lh);
    frames.push({ hi: c, lo });
  }
  return { frames, W, H, P, R };
}
