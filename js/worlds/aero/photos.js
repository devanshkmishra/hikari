// マイ ピクチャ: photographs from a 2-megapixel digital camera that never existed.
// Each scene is painted in code, then "developed": flash falloff, sensor noise,
// chroma bleed, 8×8 JPEG blocking, and the orange date stamp in the corner.
import { mkCanvas, rng, rrect } from './util.js';

const W = 640, H = 480;

export const PHOTOS = [
  { id: 'crt', exifEn: '1/60 s · F2.8 · ISO 200 · Flash: fired', capEn: 'A TV with only an RF input. Channel 3, and finally, a picture.', file: 'DSC00412.JPG', date: "'04 10  2", flash: true, iso: 0.09, wb: [1.0, 0.98, 1.06],
    exif: '1/60 秒 · F2.8 · ISO 200 · フラッシュ: 発光',
    cap: 'RF[入力|にゅうりょく|input]しかないテレビ。3ch で、やっと[映|うつ|to appear (on a screen)]った。' },
  { id: 'station', exifEn: '1/250 s · F5.6 · ISO 100 · Flash: off', capEn: 'A station with no one in it. Forty minutes until the next train.', file: 'DSC00087.JPG', date: "'04  8 15", flash: false, iso: 0.035, wb: [1.0, 1.0, 1.02],
    exif: '1/250 秒 · F5.6 · ISO 100 · フラッシュ: なし',
    cap: '[誰|だれ|who; (no) one]もいない[駅|えき|station]。[次|つぎ|next]の[電車|でんしゃ|train]まで、あと[四十分|よんじっぷん|forty minutes]。' },
  { id: 'record', exifEn: '1/60 s · F2.8 · ISO 100 · Flash: fired', capEn: "The disc is close to mint. It doesn't have to be a first pressing.", file: 'DSC00233.JPG', date: "'04  6 20", flash: true, iso: 0.06, wb: [1.03, 1.0, 0.97],
    exif: '1/60 秒 · F2.8 · ISO 100 · フラッシュ: 発光',
    cap: '[盤|ばん|the disc (of a record)]の[状態|じょうたい|condition]は、ほぼ[新品|しんぴん|brand new]。[初回盤|しょかいばん|first pressing]じゃなくていい。' },
  { id: 'shoes', exifEn: '1/500 s · F8 · ISO 100 · Flash: off', capEn: "Panda colourway. Haven't been up any mountain passes yet.", file: 'DSC00301.JPG', date: "'04  5  5", flash: false, iso: 0.03, wb: [1.02, 1.0, 0.98],
    exif: '1/500 秒 · F8 · ISO 100 · フラッシュ: なし',
    cap: 'パンダ[配色|はいしょく|colour scheme]。[峠|とうげ|mountain pass]には、まだ[行|い|to go]ってない。' },
  { id: 'noodles', exifEn: '1/60 s · F2.8 · ISO 400 · Flash: fired', capEn: '3 a.m. Sorry, tomorrow-me.', file: 'DSC00508.JPG', date: "'04 11  3", flash: true, iso: 0.11, wb: [1.0, 0.99, 1.05],
    exif: '1/60 秒 · F2.8 · ISO 400 · フラッシュ: 発光',
    cap: '[午前|ごぜん|a.m.]3[時|じ|o\'clock]。[明日|あした|tomorrow]の[自分|じぶん|oneself]、ごめん。' },
  { id: 'pen', exifEn: '1/60 s · F3.5 · ISO 200 · Flash: fired', capEn: "75mm area. Marked it with tape. Now it's just until the hand remembers.", file: 'DSC00611.JPG', date: "'04  9 30", flash: true, iso: 0.07, wb: [1.0, 1.0, 1.04],
    exif: '1/60 秒 · F3.5 · ISO 200 · フラッシュ: 発光',
    cap: 'エリアは 75mm。テープで[印|しるし|a mark]をつけた。あとは[手|て|hand]が[覚|おぼ|to memorise]えるまで。' },
  { id: 'blur', exifEn: '1/4 s · F2.8 · ISO 400 · Flash: off', capEn: '(what was I trying to take a picture of?)', file: 'DSC00612.JPG', date: "'04  9 30", flash: false, iso: 0.16, wb: [1.05, 0.98, 0.92],
    exif: '1/4 秒 · F2.8 · ISO 400 · フラッシュ: [発光禁止|はっこうきんし|flash off]',
    cap: '(なにを[撮|と|to take (a photo)]ろうとしたんだっけ)' },
];

const cache = new Map();
export function photo(id) {
  if (cache.has(id)) return cache.get(id);
  const p = PHOTOS.find((x) => x.id === id);
  const raw = mkCanvas(W, H);
  const g = raw.getContext('2d');
  PAINT[id](g, rng(id.length * 7919 + id.charCodeAt(0)));
  const out = develop(raw, p);
  cache.set(id, out);
  return out;
}

// ── helpers ──
function lg(g, x0, y0, x1, y1, stops) { const gr = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; }
function rg(g, x, y, r0, r1, stops, x1 = x, y1 = y) { const gr = g.createRadialGradient(x, y, r0, x1, y1, r1); stops.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; }
function speckle(g, R, x, y, w, hh, n, cols, s0 = 1, s1 = 2) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = cols[(R() * cols.length) | 0];
    const s = s0 + R() * (s1 - s0);
    g.fillRect(x + R() * w, y + R() * hh, s, s);
  }
}
function poly(g, pts) { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); }

const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
export function seg7(g, str, x, y, hh, color = '#ff8a1e', glow = 'rgba(255,110,20,.85)') {
  const w = hh * 0.52, t = hh * 0.13, sk = hh * 0.1;
  const P = (px, py) => [x + px + (hh - py) * sk / hh, y + py];
  const segs = {
    a: [[t, 0], [w - t, 0], [w - t * 1.6, t], [t * 1.6, t]],
    b: [[w, t * 0.6], [w, hh / 2 - t * 0.4], [w - t, hh / 2 - t * 0.9], [w - t, t * 1.2]],
    c: [[w, hh / 2 + t * 0.4], [w, hh - t * 0.6], [w - t, hh - t * 1.2], [w - t, hh / 2 + t * 0.9]],
    d: [[t * 1.6, hh - t], [w - t * 1.6, hh - t], [w - t, hh], [t, hh]],
    e: [[0, hh / 2 + t * 0.4], [t, hh / 2 + t * 0.9], [t, hh - t * 1.2], [0, hh - t * 0.6]],
    f: [[0, t * 0.6], [t, t * 1.2], [t, hh / 2 - t * 0.9], [0, hh / 2 - t * 0.4]],
    g: [[t, hh / 2 - t * 0.5], [w - t, hh / 2 - t * 0.5], [w - t * 0.5, hh / 2], [w - t, hh / 2 + t * 0.5], [t, hh / 2 + t * 0.5], [t * 0.5, hh / 2]],
  };
  const draw = (pass) => {
    let cx = 0;
    for (const ch of str) {
      if (ch === ' ') { cx += w * 0.55; continue; }
      if (ch === "'") {
        g.beginPath(); const [a, b] = P(cx + t * 0.3, 0); g.moveTo(a, b);
        const [c, d] = P(cx + t * 1.3, 0); g.lineTo(c, d); const [e, f] = P(cx + t * 0.5, hh * 0.32); g.lineTo(e, f); g.closePath(); g.fill();
        cx += t * 2.4; continue;
      }
      if (ch === ':') {
        g.fillRect(...P(cx + t * 0.4, hh * 0.25), t, t); g.fillRect(...P(cx + t * 0.4, hh * 0.68), t, t);
        cx += t * 2.6; continue;
      }
      const on = SEG[ch] || '';
      for (const s of on) {
        g.beginPath();
        segs[s].forEach(([px, py], i) => { const [a, b] = P(cx + px, py); i ? g.lineTo(a, b) : g.moveTo(a, b); });
        g.closePath(); g.fill();
      }
      cx += w + hh * 0.2;
    }
    return cx;
  };
  g.save();
  g.fillStyle = color;
  g.shadowColor = glow; g.shadowBlur = hh * 0.5;
  draw();
  g.shadowBlur = 0;
  g.globalAlpha = 0.55; g.fillStyle = '#ffe2b0';
  draw();
  g.restore();
}

function develop(src, p) {
  const c = mkCanvas(W, H), g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  if (p.flash) {
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = rg(g, W * 0.5, H * 0.46, 40, W * 0.78, [[0, '#ffffff'], [0.5, '#c8c6cc'], [1, '#2c2a30']]);
    g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'screen';
    g.fillStyle = rg(g, W * 0.5, H * 0.46, 0, W * 0.34, [[0, 'rgba(255,255,255,.28)'], [1, 'rgba(255,255,255,0)']]);
    g.fillRect(0, 0, W, H);
  }
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = rg(g, W / 2, H / 2, W * 0.3, W * 0.72, [[0, '#ffffff'], [1, '#9a9aa0']]);
  g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'source-over';

  const img = g.getImageData(0, 0, W, H);
  const d = img.data;
  const R = rng(p.file.length * 131 + p.id.charCodeAt(1));
  const N = W * H;
  const Y = new Float32Array(N), Cb = new Float32Array(N), Cr = new Float32Array(N);
  const [wr, wgc, wb] = p.wb;
  for (let i = 0, j = 0; j < N; i += 4, j++) {
    let r = d[i] * wr, gg = d[i + 1] * wgc, b = d[i + 2] * wb;
    // gentle S-curve and clipped highlights, like a small sensor
    const y0 = 0.299 * r + 0.587 * gg + 0.114 * b;
    const n = (R() - 0.5) * 255 * p.iso * (1.3 - y0 / 255);
    r += n + (R() - 0.5) * 18 * p.iso * 2; gg += n; b += n + (R() - 0.5) * 22 * p.iso * 2;
    Y[j] = 0.299 * r + 0.587 * gg + 0.114 * b;
    Cb[j] = -0.1687 * r - 0.3313 * gg + 0.5 * b;
    Cr[j] = 0.5 * r - 0.4187 * gg - 0.0813 * b;
  }
  // 8×8 blocks: chroma flattens almost entirely, luma flattens where the block is quiet
  for (let by = 0; by < H; by += 8) {
    for (let bx = 0; bx < W; bx += 8) {
      let sy = 0, sy2 = 0, scb = 0, scr = 0;
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        const k = (by + y) * W + bx + x;
        sy += Y[k]; sy2 += Y[k] * Y[k]; scb += Cb[k]; scr += Cr[k];
      }
      const my = sy / 64, v = sy2 / 64 - my * my, mcb = scb / 64, mcr = scr / 64;
      const fl = v < 140 ? 0.62 * (1 - v / 140) : 0;
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        const k = (by + y) * W + bx + x;
        Y[k] = Y[k] + (my - Y[k]) * fl;
        Cb[k] = Cb[k] + (mcb - Cb[k]) * 0.7;
        Cr[k] = Cr[k] + (mcr - Cr[k]) * 0.7;
      }
    }
  }
  for (let i = 0, j = 0; j < N; i += 4, j++) {
    let t = Y[j] / 255;
    t = t < 0 ? 0 : t;
    // a small sensor's S-curve: crushed shadows, punchy mids, highlights that clip
    if (t < 1) t = t * t * (3 - 2 * t) * 0.6 + t * 0.4;
    const yy = t * 262 - 4;
    const cb = Cb[j] * 1.12, cr = Cr[j] * 1.12;
    d[i] = yy + 1.402 * cr;
    d[i + 1] = yy - 0.34414 * cb - 0.71414 * cr;
    d[i + 2] = yy + 1.772 * cb;
  }
  g.putImageData(img, 0, 0);
  seg7(g, p.date, W - 200, H - 52, 26);
  return c;
}

// ── the scenes ──
const PAINT = {
  crt(g, R) {
    g.fillStyle = lg(g, 0, 0, 0, H, [[0, '#2e2a27'], [0.6, '#1d1a18'], [1, '#141210']]);
    g.fillRect(0, 0, W, H);
    // wall texture + poster edge
    speckle(g, R, 0, 0, W, 330, 1800, ['rgba(255,255,255,.025)', 'rgba(0,0,0,.05)'], 1, 3);
    // a poster, mostly in shadow: pastel, a sun, two stripes
    g.save(); g.translate(40, 34); g.rotate(-0.02);
    g.fillStyle = 'rgba(232,206,190,.30)'; g.fillRect(0, 0, 118, 158);
    g.fillStyle = 'rgba(255,170,150,.26)'; g.beginPath(); g.arc(58, 60, 30, 0, 7); g.fill();
    g.fillStyle = 'rgba(110,160,220,.24)'; g.fillRect(0, 104, 118, 10); g.fillRect(0, 120, 118, 6);
    g.fillStyle = 'rgba(40,30,30,.3)'; g.fillRect(12, 136, 70, 5);
    g.restore();
    // table
    poly(g, [[0, 330], [W, 318], [W, H], [0, H]]);
    g.fillStyle = lg(g, 0, 318, 0, H, [[0, '#7a5638'], [1, '#3a2716']]); g.fill();
    g.strokeStyle = 'rgba(40,24,10,.35)'; g.lineWidth = 1;
    for (let i = 0; i < 26; i++) { const y = 336 + i * 6 + R() * 3; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(200, y + R() * 6 - 3, 420, y + R() * 6 - 3, W, y - 4); g.stroke(); }
    g.fillStyle = 'rgba(255,230,200,.18)'; g.fillRect(0, 326, W, 4);
    // screen glow spilling on the wall and table
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = rg(g, 430, 210, 0, 300, [[0, 'rgba(90,110,220,.32)'], [0.5, 'rgba(200,80,170,.08)'], [1, 'rgba(0,0,0,0)']]);
    g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'source-over';
    // TV: side, body, screen
    poly(g, [[292, 96], [318, 82], [318, 360], [292, 368]]);
    g.fillStyle = lg(g, 292, 0, 318, 0, [[0, '#4d4b47'], [1, '#6e6c66']]); g.fill();
    rrect(g, 312, 78, 296, 288, 18);
    g.fillStyle = lg(g, 312, 78, 560, 366, [[0, '#d6d3cb'], [0.45, '#a9a69e'], [1, '#77746d']]); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 2; g.stroke();
    rrect(g, 330, 98, 210, 196, 24); g.fillStyle = '#1b1c20'; g.fill();
    g.save(); rrect(g, 342, 108, 186, 176, 30); g.clip();
    g.fillStyle = rg(g, 435, 196, 10, 140, [[0, '#24314f'], [1, '#0a0d18']]); g.fillRect(330, 98, 220, 200);
    // the circles of a rhythm game on the tube
    const circles = [[392, 168, '1'], [452, 214, '2'], [480, 150, '3']];
    g.lineWidth = 5; g.strokeStyle = 'rgba(255,140,200,.55)';
    g.beginPath(); g.moveTo(392, 168); g.quadraticCurveTo(430, 240, 452, 214); g.stroke();
    circles.forEach(([x, y, n], i) => {
      g.fillStyle = rg(g, x - 5, y - 6, 2, 19, [[0, '#ffb2da'], [1, '#e2448e']]);
      g.beginPath(); g.arc(x, y, 18, 0, 7); g.fill();
      g.lineWidth = 3; g.strokeStyle = '#fff'; g.stroke();
      g.fillStyle = '#fff'; g.font = 'bold 17px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(n, x, y + 1);
      if (i === 1) { g.lineWidth = 2.4; g.strokeStyle = 'rgba(255,180,220,.9)'; g.beginPath(); g.arc(x, y, 34, 0, 7); g.stroke(); }
    });
    g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(436, 236, 5, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,240,140,.9)'; g.font = 'bold 13px Arial, sans-serif'; g.textAlign = 'right'; g.fillText('0412850', 520, 122);
    for (let y = 108; y < 286; y += 3) { g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(330, y, 220, 1.2); }
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = rg(g, 435, 196, 20, 130, [[0, 'rgba(80,90,160,.25)'], [1, 'rgba(0,0,0,0)']]); g.fillRect(330, 98, 220, 200);
    g.globalCompositeOperation = 'source-over';
    // the flash bouncing off the glass
    g.fillStyle = rg(g, 392, 140, 0, 58, [[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,.85)'], [1, 'rgba(255,255,255,0)']]);
    g.beginPath(); g.ellipse(392, 140, 62, 40, -0.3, 0, 7); g.fill();
    g.restore();
    // control strip
    g.fillStyle = '#5a5852'; g.beginPath(); g.arc(575, 130, 13, 0, 7); g.fill();
    g.fillStyle = '#8a877f'; g.beginPath(); g.arc(575, 130, 9, 0, 7); g.fill();
    g.fillStyle = '#5a5852'; g.beginPath(); g.arc(575, 172, 10, 0, 7); g.fill();
    for (let i = 0; i < 6; i++) { g.fillStyle = i === 2 ? '#e8e2d2' : '#6c6a63'; g.fillRect(562, 202 + i * 13, 26, 8); }
    g.fillStyle = '#ff3a2a'; g.shadowColor = '#ff2a1a'; g.shadowBlur = 8; g.beginPath(); g.arc(575, 300, 3.4, 0, 7); g.fill(); g.shadowBlur = 0;
    for (let i = 0; i < 9; i++) { g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(352 + i * 20, 318, 12, 3); }
    g.fillStyle = 'rgba(40,38,34,.7)'; g.font = 'bold 13px "Trebuchet MS", sans-serif'; g.textAlign = 'center'; g.fillText('H I K A R I', 435, 340);
    // rabbit ears
    g.strokeStyle = '#c9c6bd'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(452, 74); g.lineTo(390, 6); g.moveTo(462, 74); g.lineTo(540, 0); g.stroke();
    rrect(g, 432, 66, 48, 14, 6); g.fillStyle = '#3d3b37'; g.fill();
    // RF modulator box
    rrect(g, 196, 322, 84, 34, 4); g.fillStyle = lg(g, 0, 322, 0, 356, [[0, '#3c3c40'], [1, '#18181b']]); g.fill();
    g.fillStyle = '#ff2a1a'; g.shadowColor = '#ff2a1a'; g.shadowBlur = 10; g.beginPath(); g.arc(210, 333, 3, 0, 7); g.fill(); g.shadowBlur = 0;
    g.fillStyle = '#bbb'; g.font = '10px Arial'; g.textAlign = 'left'; g.fillText('CH 3  4', 228, 338);
    g.fillStyle = '#ddd'; g.fillRect(240, 342, 9, 6);
    // cables
    g.strokeStyle = '#d9d6cf'; g.lineWidth = 6;
    g.beginPath(); g.moveTo(280, 338); g.bezierCurveTo(300, 338, 296, 300, 318, 296); g.stroke();
    g.strokeStyle = '#141416'; g.lineWidth = 5;
    g.beginPath(); g.moveTo(196, 344); g.bezierCurveTo(170, 350, 190, 392, 120, 380); g.stroke();
    // laptop
    poly(g, [[22, 386], [228, 372], [262, 418], [40, 438]]);
    g.fillStyle = lg(g, 0, 372, 0, 438, [[0, '#d9dce2'], [1, '#9ea3ab']]); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1.5; g.stroke();
    poly(g, [[52, 392], [214, 381], [232, 404], [62, 418]]); g.fillStyle = 'rgba(60,64,72,.55)'; g.fill();
    poly(g, [[30, 384], [222, 372], [208, 214], [40, 232]]);
    g.fillStyle = lg(g, 0, 214, 0, 384, [[0, '#c6cad2'], [1, '#8e939b']]); g.fill(); g.stroke();
    poly(g, [[42, 372], [210, 361], [199, 226], [50, 243]]);
    g.fillStyle = lg(g, 50, 226, 210, 372, [[0, '#4a90f0'], [1, '#1a4fb8']]); g.fill();
    g.fillStyle = 'rgba(255,255,255,.85)';
    poly(g, [[70, 290], [118, 285], [120, 322], [72, 327]]); g.fill();
    g.fillStyle = 'rgba(255,255,255,.55)';
    poly(g, [[126, 292], [160, 288], [161, 314], [128, 318]]); g.fill();
    g.fillStyle = 'rgba(30,60,140,.8)'; g.font = 'bold 14px Arial'; g.fillText('1', 90, 312); g.fillText('2', 140, 308);
  },

  station(g, R) {
    g.fillStyle = lg(g, 0, 0, 0, 240, [[0, '#f2f3f4'], [1, '#d5dbe0']]); g.fillRect(0, 0, W, H);
    const ridge = (y0, amp, col, f) => {
      g.beginPath(); g.moveTo(0, H);
      for (let x = 0; x <= W; x += 8) g.lineTo(x, y0 - Math.sin(x * f + y0) * amp - Math.sin(x * f * 2.7) * amp * 0.35);
      g.lineTo(W, H); g.closePath(); g.fillStyle = col; g.fill();
    };
    ridge(205, 22, '#b7c2c0', 0.008);
    ridge(232, 18, '#93a597', 0.011);
    ridge(258, 10, '#6f8a68', 0.018);
    // trees
    for (let i = 0; i < 26; i++) { g.fillStyle = ['#3f5f34', '#4a6b3c', '#355229'][i % 3]; g.beginPath(); g.arc(R() * 260, 250 + R() * 30, 18 + R() * 22, 0, 7); g.fill(); }
    // grass bank
    poly(g, [[0, 268], [W, 262], [W, H], [0, H]]); g.fillStyle = lg(g, 0, 262, 0, H, [[0, '#6f8f4a'], [1, '#4b6b2e']]); g.fill();
    speckle(g, R, 0, 262, W, 218, 2600, ['#86a85a', '#3f5a26', '#9ab86a'], 1, 3);
    // ballast + rails to the vanishing point
    const vp = [452, 268];
    poly(g, [[330, H], [W, H], [W, 300], vp]); g.fillStyle = '#7f776c'; g.fill();
    speckle(g, R, 300, 270, 340, 210, 3200, ['#958b7e', '#5f584f', '#a59d90', '#6c655b'], 1, 3);
    for (let i = 0; i < 26; i++) {
      const t = Math.pow(i / 26, 1.9);
      const y = vp[1] + (H - vp[1]) * t;
      const xl = vp[0] + (440 - vp[0]) * t, xr = vp[0] + (W + 180 - vp[0]) * t;
      g.fillStyle = 'rgba(60,46,36,.85)'; g.fillRect(xl, y, xr - xl, 2 + t * 10);
    }
    g.strokeStyle = '#8f8f94'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(vp[0], vp[1]); g.lineTo(500, H); g.moveTo(vp[0] + 4, vp[1]); g.lineTo(W + 60, H); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(vp[0], vp[1]); g.lineTo(497, H); g.moveTo(vp[0] + 4, vp[1]); g.lineTo(W + 57, H); g.stroke();
    // platform
    poly(g, [[0, 300], [vp[0] - 10, vp[1]], [438, H], [0, H]]);
    g.fillStyle = lg(g, 0, 270, 0, H, [[0, '#a8a9a6'], [1, '#c9cac6']]); g.fill();
    speckle(g, R, 0, 280, 440, 200, 1400, ['rgba(0,0,0,.06)', 'rgba(255,255,255,.08)'], 1, 4);
    poly(g, [[vp[0] - 30, vp[1] + 1], [vp[0] - 14, vp[1]], [404, H], [356, H]]); g.fillStyle = '#e8c23a'; g.fill();
    poly(g, [[vp[0] - 12, vp[1]], [vp[0] - 9, vp[1]], [440, H], [424, H]]); g.fillStyle = '#efefe9'; g.fill();
    // shelter
    g.fillStyle = '#5f6467'; poly(g, [[250, 262], [392, 258], [396, 266], [246, 271]]); g.fill();
    g.fillStyle = '#41464a'; g.fillRect(262, 268, 4, 34); g.fillRect(380, 264, 4, 34);
    g.fillStyle = '#7a5a3a'; g.fillRect(282, 288, 70, 5);
    // vending machine
    rrect(g, 220, 258, 24, 46, 2); g.fillStyle = '#f4f4f6'; g.fill();
    g.fillStyle = '#d23a2a'; g.fillRect(220, 258, 24, 8);
    g.fillStyle = 'rgba(160,210,255,.9)'; g.fillRect(223, 268, 18, 14);
    // station name board, the line's orange band
    g.fillStyle = '#3a3a3a'; g.fillRect(158, 262, 4, 54); g.fillRect(214, 262, 4, 54);
    rrect(g, 148, 236, 80, 36, 2); g.fillStyle = '#fbfbf8'; g.fill();
    g.fillStyle = '#e6a23c'; g.fillRect(148, 262, 80, 7);
    g.fillStyle = '#222'; g.font = 'bold 13px "Noto Serif JP", serif'; g.textAlign = 'center'; g.fillText('夏ヶ原', 188, 254);
    // pole and wires
    g.fillStyle = '#3d3a36'; g.fillRect(560, 40, 9, 236);
    g.fillRect(526, 64, 78, 6);
    g.strokeStyle = 'rgba(40,40,44,.75)'; g.lineWidth = 1.3;
    [[530, 66], [600, 66], [548, 66]].forEach(([x, y], i) => { g.beginPath(); g.moveTo(-10, 120 + i * 18); g.quadraticCurveTo(280, 150 + i * 22, x, y); g.stroke(); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(600, 76, W + 10, 70 + i * 6); g.stroke(); });
  },

  record(g, R) {
    g.fillStyle = '#b9ae74'; g.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 3) { g.fillStyle = y % 6 ? 'rgba(90,80,30,.12)' : 'rgba(255,250,200,.10)'; g.fillRect(0, y, W, 1.5); }
    for (let x = 0; x < W; x += 52) { g.fillStyle = 'rgba(70,60,20,.08)'; g.fillRect(x, 0, 1, H); }
    g.fillStyle = '#2f4a32'; g.fillRect(0, 410, W, 22);
    g.fillStyle = 'rgba(255,255,255,.12)'; for (let x = 0; x < W; x += 6) g.fillRect(x, 414, 3, 14);
    // sleeve, pastel, worn
    g.save(); g.translate(150, 170); g.rotate(-0.12);
    g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 18; g.shadowOffsetY = 6;
    g.fillStyle = lg(g, -170, -170, 170, 170, [[0, '#ffd9c9'], [1, '#f5a9b8']]); g.fillRect(-170, -170, 340, 340);
    g.shadowColor = 'transparent';
    g.fillStyle = '#ffefc2'; g.beginPath(); g.arc(-40, -40, 70, 0, 7); g.fill();
    for (let i = 0; i < 6; i++) { g.fillStyle = `rgba(110,160,230,${0.55 - i * 0.07})`; g.fillRect(-170, 40 + i * 18, 340, 9); }
    g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 3; g.strokeRect(-166, -166, 332, 332);
    g.fillStyle = 'rgba(60,40,60,.6)'; g.font = 'italic bold 22px Georgia, serif'; g.textAlign = 'left'; g.fillText('Summer Blue', -150, -128);
    g.restore();
    // the disc
    const cx = 380, cy = 250, r = 196;
    g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 22; g.shadowOffsetY = 8;
    g.fillStyle = '#0d0d0f'; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
    g.shadowColor = 'transparent';
    for (let rr = r - 4; rr > 70; rr -= 1.6) {
      const gap = [150, 118, 96].some((x) => Math.abs(rr - x) < 2.2);
      g.strokeStyle = gap ? 'rgba(70,70,76,.55)' : `rgba(${30 + R() * 14},${30 + R() * 14},${34 + R() * 14},.65)`;
      g.lineWidth = gap ? 2 : 1;
      g.beginPath(); g.arc(cx, cy, rr, 0, 7); g.stroke();
    }
    // the flash streak across the grooves
    g.save(); g.beginPath(); g.arc(cx, cy, r - 2, 0, 7); g.arc(cx, cy, 70, 0, 7, true); g.clip();
    g.globalCompositeOperation = 'lighter';
    [[-2.35, 0.32], [0.79, 0.24]].forEach(([a, wdt]) => {
      g.fillStyle = rg(g, cx, cy, 60, r, [[0, 'rgba(160,160,175,.0)'], [0.4, 'rgba(210,210,225,.55)'], [1, 'rgba(120,120,135,.15)']]);
      g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, r, a - wdt / 2, a + wdt / 2); g.closePath(); g.fill();
    });
    g.restore();
    g.fillStyle = lg(g, cx - 64, cy - 64, cx + 64, cy + 64, [[0, '#f6ead0'], [1, '#e2d0aa']]);
    g.beginPath(); g.arc(cx, cy, 64, 0, 7); g.fill();
    g.strokeStyle = '#d2443a'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, 58, 0, 7); g.stroke();
    g.fillStyle = 'rgba(80,50,40,.65)';
    [[-34, -26, 68], [-28, -14, 56], [-30, 18, 60], [-22, 30, 44]].forEach(([x, y, w]) => g.fillRect(cx + x, cy + y, w, 3));
    g.fillStyle = '#d2443a'; g.font = 'bold 11px Georgia, serif'; g.textAlign = 'center'; g.fillText('SIDE A', cx, cy - 34);
    g.fillStyle = '#c8c8cc'; g.beginPath(); g.arc(cx, cy, 6, 0, 7); g.fill();
    g.fillStyle = '#333'; g.beginPath(); g.arc(cx, cy, 3, 0, 7); g.fill();
  },

  shoes(g, R) {
    g.fillStyle = '#4b4c50'; g.fillRect(0, 0, W, H);
    speckle(g, R, 0, 0, W, H, 9000, ['#5b5c61', '#3a3b3f', '#66676c', '#2f3033', '#727378'], 1, 3);
    poly(g, [[0, 70], [W, 30], [W, 52], [0, 94]]); g.fillStyle = 'rgba(232,230,220,.82)'; g.fill();
    speckle(g, R, 0, 30, W, 70, 600, ['rgba(70,70,74,.6)'], 1, 3);
    g.strokeStyle = 'rgba(25,25,28,.7)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(40, 470); g.lineTo(90, 430); g.lineTo(84, 400); g.lineTo(130, 352); g.stroke();
    // a second shoe, behind, mostly cropped
    g.save(); g.translate(250, -40); g.scale(0.82, 0.82); shoe(g, R, true); g.restore();
    // cast shadow (hard noon light)
    g.fillStyle = 'rgba(10,10,14,.5)';
    g.beginPath(); g.ellipse(340, 388, 250, 26, 0.03, 0, 7); g.fill();
    g.save(); g.translate(30, 120); shoe(g, R, false); g.restore();
  },

  noodles(g, R) {
    g.fillStyle = lg(g, 0, 0, 0, H, [[0, '#14151a'], [1, '#2a2622']]); g.fillRect(0, 0, W, H);
    poly(g, [[0, 120], [W, 104], [W, H], [0, H]]); g.fillStyle = lg(g, 0, 104, 0, H, [[0, '#3a2c22'], [1, '#5a4430']]); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i < 30; i++) { g.lineWidth = 1; const y = 120 + i * 12; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y - 14); g.stroke(); }
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = rg(g, 40, 60, 10, 380, [[0, 'rgba(80,130,255,.32)'], [1, 'rgba(0,0,0,0)']]); g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'source-over';
    // the edge of a keyboard
    poly(g, [[0, 360], [150, 342], [190, H], [0, H]]); g.fillStyle = '#d9d4c4'; g.fill();
    for (let r = 0; r < 4; r++) for (let k = 0; k < 6; k++) { rrect(g, 6 + k * 26 + r * 6, 366 + r * 28 - k * 2.6, 22, 22, 3); g.fillStyle = '#ece8dc'; g.fill(); g.strokeStyle = 'rgba(0,0,0,.18)'; g.stroke(); }
    // LED clock
    rrect(g, 470, 30, 140, 64, 6); g.fillStyle = '#0d0d0f'; g.fill();
    seg7(g, '3:04', 492, 44, 36, '#ff2a1a', 'rgba(255,30,20,.9)');
    // bowl
    const cx = 340, cy = 262;
    g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.ellipse(cx + 10, cy + 112, 150, 30, 0, 0, 7); g.fill();
    g.beginPath(); g.ellipse(cx, cy, 162, 96, 0, 0, Math.PI); g.lineTo(cx - 120, cy + 70); g.bezierCurveTo(cx - 100, cy + 118, cx + 100, cy + 118, cx + 120, cy + 70); g.closePath();
    g.fillStyle = lg(g, cx - 160, 0, cx + 160, 0, [[0, '#cfcac0'], [0.4, '#ffffff'], [1, '#b9b4aa']]); g.fill();
    g.fillStyle = '#c8302a'; g.beginPath(); g.ellipse(cx, cy + 28, 150, 70, 0, 0.15, Math.PI - 0.15); g.lineWidth = 9; g.strokeStyle = '#c8302a'; g.stroke();
    g.strokeStyle = '#fff'; g.lineWidth = 1.6;
    for (let a = 0.3; a < Math.PI - 0.3; a += 0.17) {
      const x = cx + Math.cos(a) * 150, y = cy + 28 + Math.sin(a) * 70;
      g.beginPath(); g.moveTo(x - 3, y - 3); g.lineTo(x + 3, y - 3); g.lineTo(x + 3, y + 2); g.lineTo(x - 1, y + 2); g.stroke();
    }
    g.fillStyle = '#f5f2ea'; g.beginPath(); g.ellipse(cx, cy, 162, 96, 0, 0, 7); g.fill();
    g.fillStyle = lg(g, 0, cy - 82, 0, cy + 82, [[0, '#c98a3a'], [1, '#9a5a1e']]); g.beginPath(); g.ellipse(cx, cy + 2, 144, 82, 0, 0, 7); g.fill();
    g.save(); g.beginPath(); g.ellipse(cx, cy + 2, 144, 82, 0, 0, 7); g.clip();
    for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(255,220,140,${0.25 + R() * 0.35})`; g.beginPath(); g.arc(cx - 130 + R() * 260, cy - 70 + R() * 140, 2 + R() * 5, 0, 7); g.fill(); }
    g.lineWidth = 3.2; g.lineCap = 'round';
    for (let i = 0; i < 46; i++) {
      g.strokeStyle = i % 3 ? '#f2d58a' : '#e6c06a';
      const x0 = cx - 110 + R() * 150, y0 = cy - 40 + R() * 90;
      g.beginPath(); g.moveTo(x0, y0);
      for (let k = 1; k < 6; k++) g.quadraticCurveTo(x0 + k * 14 - 7, y0 + (k % 2 ? -9 : 9) + R() * 6, x0 + k * 14, y0 + R() * 6 - 3);
      g.stroke();
    }
    g.fillStyle = '#1c2a1a'; poly(g, [[cx + 40, cy - 92], [cx + 110, cy - 84], [cx + 100, cy - 20], [cx + 34, cy - 30]]); g.fill();
    g.fillStyle = '#fbfbf8'; g.beginPath(); g.ellipse(cx + 56, cy + 24, 30, 20, 0.2, 0, 7); g.fill();
    g.strokeStyle = '#f07aa0'; g.lineWidth = 3;
    g.beginPath(); for (let a = 0; a < 12; a += 0.2) { const rr = a * 2.1; const x = cx + 56 + Math.cos(a) * rr * 1.2, y = cy + 24 + Math.sin(a) * rr * 0.8; a ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    for (let i = 0; i < 18; i++) { g.strokeStyle = '#5aa83a'; g.lineWidth = 2.4; g.beginPath(); g.ellipse(cx - 60 + R() * 90, cy - 30 + R() * 50, 5, 3.4, R() * 3, 0, 7); g.stroke(); }
    g.restore();
    // chopsticks
    g.lineCap = 'round';
    [[0, '#d9b98a'], [10, '#cfae7c']].forEach(([o, c]) => { g.strokeStyle = c; g.lineWidth = 9; g.beginPath(); g.moveTo(560 + o, 420 - o * 0.4); g.lineTo(230 + o * 1.5, 140 + o); g.stroke(); });
    // steam
    g.save(); g.filter = 'blur(6px)';
    for (let i = 0; i < 7; i++) {
      g.strokeStyle = `rgba(255,255,255,${0.12 + R() * 0.12})`; g.lineWidth = 10 + R() * 16;
      const x = cx - 90 + R() * 180;
      g.beginPath(); g.moveTo(x, cy - 30); g.bezierCurveTo(x - 40, cy - 110, x + 50, cy - 160, x - 10 + R() * 30, cy - 250); g.stroke();
    }
    g.restore();
  },

  pen(g, R) {
    g.fillStyle = lg(g, 0, 0, W, H, [[0, '#6a4a30'], [1, '#3e2a1a']]); g.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(30,18,8,${0.08 + R() * 0.1})`; g.lineWidth = 1 + R() * 2; const y = R() * H; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(200, y + 10, 400, y - 10, W, y + R() * 20); g.stroke(); }
    g.save(); g.translate(320, 244); g.rotate(-0.13);
    g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 20; g.shadowOffsetY = 8;
    rrect(g, -250, -150, 500, 300, 18); g.fillStyle = '#1a1a1d'; g.fill();
    g.shadowColor = 'transparent';
    rrect(g, -236, -136, 472, 272, 12); g.fillStyle = lg(g, -236, -136, 236, 136, [[0, '#2a2a2e'], [1, '#141416']]); g.fill();
    speckle(g, R, -236, -136, 472, 272, 2500, ['rgba(255,255,255,.035)', 'rgba(0,0,0,.2)'], 1, 2);
    g.strokeStyle = 'rgba(220,220,230,.55)'; g.lineWidth = 2;
    [[-200, -110, 1, 1], [200, -110, -1, 1], [-200, 110, 1, -1], [200, 110, -1, -1]].forEach(([x, y, sx, sy]) => { g.beginPath(); g.moveTo(x + 16 * sx, y); g.lineTo(x, y); g.lineTo(x, y + 16 * sy); g.stroke(); });
    // masking tape around the small area you actually use
    const tape = (x, y, w, hh, rot) => {
      g.save(); g.translate(x, y); g.rotate(rot);
      g.fillStyle = 'rgba(238,224,170,.88)'; g.beginPath(); g.moveTo(-w / 2, -hh / 2);
      for (let i = 0; i <= 6; i++) g.lineTo(-w / 2 + (w * i) / 6, -hh / 2 + (i % 2 ? 1.5 : -1.5));
      g.lineTo(w / 2, hh / 2); for (let i = 6; i >= 0; i--) g.lineTo(-w / 2 + (w * i) / 6, hh / 2 + (i % 2 ? 1.5 : -1.5)); g.closePath(); g.fill();
      g.restore();
    };
    tape(-40, -66, 170, 16, 0.01); tape(-40, 64, 170, 16, -0.01);
    tape(-126, 0, 16, 150, 0); tape(46, 0, 16, 150, 0.01);
    g.fillStyle = 'rgba(30,30,90,.85)'; g.font = 'bold 15px "Comic Sans MS", "Marker Felt", cursive'; g.textAlign = 'center';
    g.save(); g.translate(-40, -61); g.rotate(-0.02); g.fillText('75mm', 0, 0); g.restore();
    g.strokeStyle = 'rgba(255,120,190,.35)'; g.lineWidth = 2; g.beginPath(); g.arc(-60, 10, 22, 0, 7); g.stroke();
    g.restore();
    // cable
    g.strokeStyle = '#111'; g.lineWidth = 6; g.beginPath(); g.moveTo(330, 96); g.bezierCurveTo(330, 50, 400, 40, 420, -10); g.stroke();
    // pen
    g.save(); g.translate(330, 290); g.rotate(-0.62);
    g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 10; g.shadowOffsetY = 12;
    rrect(g, -190, -11, 340, 22, 11); g.fillStyle = lg(g, 0, -11, 0, 11, [[0, '#4a4a50'], [0.4, '#202024'], [1, '#0e0e10']]); g.fill();
    g.shadowColor = 'transparent';
    poly(g, [[150, -9], [196, -2], [196, 2], [150, 9]]); g.fillStyle = lg(g, 0, -9, 0, 9, [[0, '#d8dbe0'], [1, '#7c8088']]); g.fill();
    g.fillStyle = '#e8e8ec'; g.fillRect(196, -1.4, 6, 2.8);
    g.fillStyle = lg(g, 0, -11, 0, 11, [[0, '#e6e8ec'], [1, '#8a8e96']]); g.fillRect(120, -11, 12, 22);
    rrect(g, 40, -14, 40, 6, 3); g.fillStyle = '#3a3a40'; g.fill();
    g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(-180, -8, 300, 2);
    g.restore();
  },

  blur(g, R) {
    g.fillStyle = lg(g, 0, 0, W, H, [[0, '#2a1d14'], [1, '#0e0a08']]); g.fillRect(0, 0, W, H);
    g.save(); g.filter = 'blur(10px)';
    for (let i = 0; i < 6; i++) { g.strokeStyle = `rgba(255,${180 + i * 10},120,${0.5 - i * 0.06})`; g.lineWidth = 18 - i * 2; g.beginPath(); g.moveTo(140 + i * 6, 120 + i * 10); g.bezierCurveTo(260, 90, 330, 220, 470, 170 + i * 4); g.stroke(); }
    g.fillStyle = 'rgba(90,120,200,.35)'; g.beginPath(); g.ellipse(500, 360, 120, 50, 0.3, 0, 7); g.fill();
    g.restore();
  },
};

// A runner in the panda colourway: white base, black suede, green accents. No logos.
function shoe(g, R, behind) {
  const dark = behind ? 0.75 : 1;
  g.save();
  if (behind) g.globalAlpha = 0.95;
  // outsole
  g.beginPath();
  g.moveTo(40, 252); g.bezierCurveTo(30, 262, 40, 276, 70, 278); g.lineTo(520, 280); g.bezierCurveTo(560, 278, 576, 262, 566, 246); g.closePath();
  g.fillStyle = '#1d1d20'; g.fill();
  g.fillStyle = 'rgba(255,255,255,.08)'; for (let x = 80; x < 540; x += 16) g.fillRect(x, 270, 7, 6);
  // midsole
  g.beginPath();
  g.moveTo(34, 230); g.bezierCurveTo(28, 246, 36, 256, 60, 258); g.lineTo(530, 262); g.bezierCurveTo(566, 260, 580, 240, 572, 214);
  g.bezierCurveTo(470, 222, 300, 226, 160, 222); g.bezierCurveTo(100, 220, 60, 214, 34, 230); g.closePath();
  g.fillStyle = lg(g, 0, 214, 0, 262, [[0, '#ffffff'], [1, '#d6d6d2']]); g.fill();
  g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1.5; g.stroke();
  rrect(g, 420, 230, 92, 20, 8); g.fillStyle = '#9da1a6'; g.fill();
  g.fillStyle = '#2f9a4a'; g.fillRect(150, 246, 300, 4);
  // upper base, white mesh
  g.beginPath();
  g.moveTo(40, 228); g.bezierCurveTo(30, 190, 70, 160, 140, 150); g.bezierCurveTo(220, 136, 280, 100, 330, 70);
  g.bezierCurveTo(380, 52, 440, 50, 470, 60); g.bezierCurveTo(520, 70, 560, 120, 570, 212);
  g.bezierCurveTo(470, 222, 300, 226, 160, 222); g.bezierCurveTo(100, 220, 60, 214, 40, 228); g.closePath();
  g.fillStyle = lg(g, 0, 50, 0, 226, [[0, '#ffffff'], [1, '#e3e3df']]); g.fill();
  g.save(); g.clip();
  g.strokeStyle = 'rgba(0,0,0,.05)'; g.lineWidth = 1;
  for (let i = -40; i < 80; i++) { g.beginPath(); g.moveTo(i * 8, 0); g.lineTo(i * 8 + 240, 300); g.stroke(); g.beginPath(); g.moveTo(i * 8 + 240, 0); g.lineTo(i * 8, 300); g.stroke(); }
  // toe cap, black suede
  g.beginPath(); g.moveTo(20, 230); g.bezierCurveTo(30, 180, 80, 160, 150, 160); g.bezierCurveTo(170, 180, 166, 210, 150, 232); g.closePath();
  g.fillStyle = '#18181b'; g.fill();
  speckle(g, R, 20, 150, 160, 90, 700, ['rgba(255,255,255,.06)', 'rgba(0,0,0,.25)'], 1, 2);
  // eyestay, black
  g.beginPath(); g.moveTo(150, 152); g.bezierCurveTo(220, 136, 290, 96, 340, 72); g.lineTo(362, 98);
  g.bezierCurveTo(320, 140, 260, 172, 196, 190); g.closePath(); g.fillStyle = '#18181b'; g.fill();
  speckle(g, R, 150, 70, 220, 130, 600, ['rgba(255,255,255,.06)', 'rgba(0,0,0,.25)'], 1, 2);
  // mid panel, green suede band
  g.beginPath(); g.moveTo(240, 222); g.bezierCurveTo(270, 180, 320, 150, 380, 120); g.lineTo(410, 128);
  g.bezierCurveTo(360, 160, 320, 196, 300, 224); g.closePath(); g.fillStyle = '#23803c'; g.fill();
  speckle(g, R, 240, 110, 180, 120, 500, ['rgba(255,255,255,.07)', 'rgba(0,0,0,.2)'], 1, 2);
  // heel counter, black
  g.beginPath(); g.moveTo(452, 214); g.bezierCurveTo(456, 160, 470, 110, 500, 80); g.bezierCurveTo(540, 100, 566, 150, 572, 212); g.closePath();
  g.fillStyle = '#18181b'; g.fill();
  g.restore();
  // stitching
  g.setLineDash([5, 4]); g.strokeStyle = 'rgba(230,230,230,.55)'; g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(30, 222); g.bezierCurveTo(40, 186, 84, 168, 146, 168); g.stroke();
  g.beginPath(); g.moveTo(160, 160); g.bezierCurveTo(226, 146, 290, 108, 336, 84); g.stroke();
  g.beginPath(); g.moveTo(462, 206); g.bezierCurveTo(466, 160, 478, 120, 502, 92); g.stroke();
  g.setLineDash([]);
  // collar, green lining
  g.beginPath(); g.moveTo(330, 70); g.bezierCurveTo(380, 40, 450, 38, 500, 66); g.bezierCurveTo(470, 62, 420, 64, 360, 92); g.closePath();
  g.fillStyle = '#2f9a4a'; g.fill();
  g.beginPath(); g.moveTo(498, 64); g.bezierCurveTo(512, 66, 520, 80, 514, 96); g.lineTo(500, 84); g.closePath(); g.fillStyle = '#18181b'; g.fill();
  // heel tab
  rrect(g, 548, 92, 18, 44, 5); g.fillStyle = '#2f9a4a'; g.fill();
  g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(553, 100, 8, 3);
  // tongue + laces
  g.beginPath(); g.moveTo(300, 62); g.bezierCurveTo(320, 30, 352, 26, 372, 40); g.lineTo(348, 84); g.closePath(); g.fillStyle = '#efefec'; g.fill();
  g.strokeStyle = 'rgba(0,0,0,.25)'; g.stroke();
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const x = 176 + t * 170, y = 170 - t * 92;
    g.fillStyle = '#d8d8d4'; g.beginPath(); g.arc(x, y, 3.2, 0, 7); g.fill();
    g.strokeStyle = '#f7f7f4'; g.lineWidth = 5;
    g.beginPath(); g.moveTo(x - 8, y - 14); g.lineTo(x + 18, y - 4); g.stroke();
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1; g.stroke();
  }
  g.fillStyle = `rgba(0,0,0,${0.12 * dark})`;
  g.beginPath(); g.moveTo(40, 228); g.bezierCurveTo(200, 236, 420, 232, 570, 212); g.lineTo(570, 220); g.bezierCurveTo(420, 240, 200, 244, 40, 236); g.fill();
  g.restore();
}

export function thumb(id, w = 120) {
  const src = photo(id);
  const hh = Math.round(w * 0.75);
  const c = mkCanvas(w * 2, hh * 2);
  const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(src, 0, 0, c.width, c.height);
  return c;
}
