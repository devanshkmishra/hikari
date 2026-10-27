// 中吊り広告 — seven hanging ads, Shōwa print style, absurd and sincere at once.
// Each painter draws at any size into a 3:2 canvas (u = width / 1200).
import { canvas2d, rng } from './gl.js';

const SERIF = '"Noto Serif JP", "Hiragino Mincho ProN", serif';
const MINCHO = '"Shippori Mincho B1", "Noto Serif JP", serif';
const GOTHIC = '"Zen Kaku Gothic New", "Hiragino Sans", sans-serif';
const ROUND = '"M PLUS Rounded 1c", "Zen Kaku Gothic New", sans-serif';

function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

// vertical writing, one glyph per cell; punctuation tucked into the upper right
function vtext(g, str, x, y, size, { gap = 1.08, color = '#111', font = SERIF, weight = 700 } = {}) {
  g.save();
  g.fillStyle = color;
  g.font = `${weight} ${size}px ${font}`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  let cy = y;
  for (const ch of str) {
    if (ch === '\n') { cy = y; x -= size * 1.35; continue; }
    if ('、。'.includes(ch)) {
      g.fillText(ch, x + size * 0.55, cy - size * 0.45);
    } else if ('ー〜…'.includes(ch)) {
      g.save(); g.translate(x, cy); g.rotate(Math.PI / 2); g.fillText(ch, 0, 0); g.restore();
    } else if ('ゃゅょっぁぃぅぇぉャュョッァィゥェォ'.includes(ch)) {
      g.fillText(ch, x + size * 0.12, cy - size * 0.1);
    } else g.fillText(ch, x, cy);
    cy += size * gap;
  }
  g.restore();
}

function grain(g, W, H, seed, amt = 0.06) {
  const r = rng(seed);
  const img = g.getImageData(0, 0, W, H);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * 255 * amt;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
}

function halftone(g, x, y, w, h, color, step, maxR, fn) {
  g.fillStyle = color;
  for (let yy = y; yy < y + h; yy += step) for (let xx = x + ((yy / step) % 2) * step * 0.5; xx < x + w; xx += step) {
    const r = maxR * fn((xx - x) / w, (yy - y) / h);
    if (r > 0.3) { g.beginPath(); g.arc(xx, yy, r, 0, 7); g.fill(); }
  }
}

function age(g, W, H, warm = 0.14) {
  const gr = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.72);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(130,90,30,${warm})`);
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
}

function grommets(g, W, H, u) {
  for (const x of [60 * u, W - 60 * u]) {
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.arc(x, 32 * u, 12 * u, 0, 7); g.fill();
    g.fillStyle = '#c9c9c4'; g.beginPath(); g.arc(x, 30 * u, 11 * u, 0, 7); g.fill();
    g.fillStyle = '#3a3a38'; g.beginPath(); g.arc(x, 30 * u, 6 * u, 0, 7); g.fill();
  }
}

// ── 1. いちご牛乳 ───────────────────────────────────────────────────────────
function strawberryMilk(g, W, H) {
  const u = W / 1200;
  g.fillStyle = '#fde4e8'; g.fillRect(0, 0, W, H);
  halftone(g, 0, 0, W, H, '#f6b9c6', 22 * u, 7 * u, (x, y) => Math.max(0, (x - 0.35) * 1.3 - y * 0.6));
  // pink diagonal band
  g.fillStyle = '#e8507a';
  g.beginPath(); g.moveTo(0, H * 0.78); g.lineTo(W, H * 0.6); g.lineTo(W, H); g.lineTo(0, H); g.fill();
  g.fillStyle = '#fff'; g.globalAlpha = 0.9;
  g.beginPath(); g.moveTo(0, H * 0.76); g.lineTo(W, H * 0.58); g.lineTo(W, H * 0.6); g.lineTo(0, H * 0.78); g.fill();
  g.globalAlpha = 1;
  // the carton
  g.save(); g.translate(250 * u, 120 * u);
  const cw = 240 * u, ch = 380 * u;
  g.fillStyle = 'rgba(80,20,40,0.18)'; g.fillRect(16 * u, 20 * u, cw, ch + 40 * u);
  g.fillStyle = '#ffffff'; g.fillRect(0, 60 * u, cw, ch);
  g.fillStyle = '#f2f2ee'; g.beginPath(); g.moveTo(0, 60 * u); g.lineTo(cw / 2, 0); g.lineTo(cw, 60 * u); g.fill();
  g.fillStyle = '#e8507a'; g.fillRect(cw / 2 - 30 * u, -16 * u, 60 * u, 18 * u);
  g.fillStyle = '#e8507a'; g.fillRect(0, 230 * u, cw, 130 * u);
  // strawberry
  g.save(); g.translate(cw / 2, 150 * u);
  g.fillStyle = '#e02a40'; g.beginPath(); g.moveTo(0, 62 * u); g.bezierCurveTo(-70 * u, 20 * u, -60 * u, -40 * u, 0, -40 * u); g.bezierCurveTo(60 * u, -40 * u, 70 * u, 20 * u, 0, 62 * u); g.fill();
  g.fillStyle = '#ffe9a8';
  for (let i = 0; i < 16; i++) { const a = i * 2.4, rad = (i % 4) * 12 * u + 8 * u; g.beginPath(); g.ellipse(Math.cos(a) * rad * 0.9, Math.sin(a) * rad * 0.8, 2.5 * u, 4 * u, a, 0, 7); g.fill(); }
  g.fillStyle = '#3d9a3d'; for (let i = 0; i < 5; i++) { g.save(); g.rotate(-1.2 + i * 0.6); g.beginPath(); g.ellipse(0, -46 * u, 9 * u, 22 * u, 0, 0, 7); g.fill(); g.restore(); }
  g.restore();
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `800 ${50 * u}px ${ROUND}`; g.fillText('いちご牛乳', cw / 2, 290 * u);
  g.font = `700 ${16 * u}px ${GOTHIC}`; g.fillText('STRAWBERRY MILK · 500ml', cw / 2, 335 * u);
  g.restore();
  // headline, vertical
  vtext(g, '糖分は、', 1040 * u, 120 * u, 82 * u, { font: MINCHO, weight: 800, color: '#3a0d1a' });
  vtext(g, '魂の燃料だ。', 930 * u, 120 * u, 82 * u, { font: MINCHO, weight: 800, color: '#3a0d1a' });
  // burst
  g.save(); g.translate(640 * u, 210 * u); g.rotate(-0.15);
  g.fillStyle = '#ffd84a';
  g.beginPath(); for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2, rad = i % 2 ? 62 * u : 80 * u; g.lineTo(Math.cos(a) * rad, Math.sin(a) * rad); } g.fill();
  g.fillStyle = '#c2183e'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `900 ${26 * u}px ${GOTHIC}`; g.fillText('甘さ', 0, -14 * u); g.fillText('ひかえめ', 0, 18 * u);
  g.font = `700 ${12 * u}px ${GOTHIC}`; g.fillText('（当社比）', 0, 44 * u);
  g.restore();
  // brand
  g.fillStyle = '#fff'; g.textAlign = 'left';
  g.beginPath(); g.arc(90 * u, 690 * u, 38 * u, 0, 7); g.fill();
  g.fillStyle = '#e8507a'; g.font = `900 ${40 * u}px ${MINCHO}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('萬', 90 * u, 692 * u);
  g.fillStyle = '#fff'; g.textAlign = 'left'; g.font = `800 ${38 * u}px ${MINCHO}`; g.fillText('よろず乳業', 145 * u, 690 * u);
  g.font = `500 ${17 * u}px ${GOTHIC}`;
  g.fillText('※糖分のとりすぎに、ご注意ください。', 520 * u, 735 * u);
  grommets(g, W, H, u);
}

// ── 2. 1906 ─────────────────────────────────────────────────────────────────
function sneaker(g, W, H) {
  const u = W / 1200;
  const bg = g.createRadialGradient(W * 0.62, H * 0.5, 30 * u, W * 0.62, H * 0.5, W * 0.7);
  bg.addColorStop(0, '#35353a'); bg.addColorStop(1, '#09090b');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  // big numerals, silver
  const sv = g.createLinearGradient(0, 60 * u, 0, 400 * u);
  sv.addColorStop(0, '#f4f5f7'); sv.addColorStop(0.5, '#8d9097'); sv.addColorStop(0.52, '#c8cbd0'); sv.addColorStop(1, '#5d6066');
  g.fillStyle = sv; g.font = `400 ${330 * u}px "Anton", sans-serif`; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.save(); g.globalAlpha = 0.92; g.fillText('1906', 40 * u, 360 * u); g.restore();
  // the shoe, in profile
  g.save(); g.translate(560 * u, 470 * u); g.scale(u, u);
  // shadow
  g.fillStyle = 'rgba(0,0,0,0.6)'; g.beginPath(); g.ellipse(80, 118, 330, 22, 0, 0, 7); g.fill();
  // outsole and the soft, thick midsole
  g.fillStyle = '#121214'; rr(g, -230, 70, 610, 46, 22); g.fill();
  const mid = g.createLinearGradient(0, 10, 0, 80);
  mid.addColorStop(0, '#4a4b50'); mid.addColorStop(1, '#2a2b2f');
  g.fillStyle = mid;
  g.beginPath(); g.moveTo(-240, 70); g.bezierCurveTo(-250, 20, -200, 10, -120, 18); g.lineTo(330, 26); g.bezierCurveTo(390, 30, 400, 70, 380, 78); g.lineTo(-230, 82); g.closePath(); g.fill();
  g.fillStyle = 'rgba(200,205,215,0.25)';
  for (let i = 0; i < 6; i++) { rr(g, -150 + i * 70, 40, 42, 22, 10); g.fill(); }
  // upper: mesh base, suede overlays, reflective silver
  g.fillStyle = '#18181b';
  g.beginPath(); g.moveTo(-220, 22); g.bezierCurveTo(-240, -40, -170, -120, -60, -125); g.bezierCurveTo(30, -130, 120, -90, 200, -60);
  g.bezierCurveTo(300, -30, 360, -10, 370, 24); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.05)'; g.lineWidth = 1;
  for (let x = -200; x < 360; x += 7) { g.beginPath(); g.moveTo(x, -120); g.lineTo(x + 40, 24); g.stroke(); }
  g.fillStyle = '#2b2b30';
  g.beginPath(); g.moveTo(-210, 20); g.bezierCurveTo(-200, -40, -150, -70, -90, -60); g.lineTo(-30, 20); g.fill();
  g.beginPath(); g.moveTo(170, -66); g.bezierCurveTo(250, -40, 330, -20, 368, 22); g.lineTo(200, 22); g.closePath(); g.fill();
  g.fillStyle = '#26262a'; g.beginPath(); g.moveTo(-40, -120); g.lineTo(60, -112); g.lineTo(160, 20); g.lineTo(40, 20); g.closePath(); g.fill();
  const refl = g.createLinearGradient(-100, 0, 200, 0);
  refl.addColorStop(0, '#9da1a8'); refl.addColorStop(0.5, '#f2f3f6'); refl.addColorStop(1, '#7c8087');
  g.strokeStyle = refl; g.lineWidth = 9; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-120, 0); g.bezierCurveTo(-40, -60, 60, -70, 150, -30); g.stroke();
  g.lineWidth = 4; g.beginPath(); g.moveTo(-100, 10); g.bezierCurveTo(-20, -40, 70, -50, 170, -10); g.stroke();
  // laces and collar
  g.strokeStyle = '#3a3a40'; g.lineWidth = 5;
  for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(-40 + i * 32, -122 + i * 8); g.lineTo(-10 + i * 32, -100 + i * 8); g.stroke(); }
  g.fillStyle = '#0c0c0e'; g.beginPath(); g.ellipse(-150, -95, 60, 22, -0.3, 0, 7); g.fill();
  // rim light
  g.strokeStyle = 'rgba(230,236,255,0.55)'; g.lineWidth = 2.5;
  g.beginPath(); g.moveTo(-235, 20); g.bezierCurveTo(-245, -40, -175, -122, -60, -127); g.bezierCurveTo(40, -132, 130, -92, 205, -62); g.stroke();
  g.restore();
  // copy
  g.fillStyle = '#ffffff'; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.font = `600 ${64 * u}px ${SERIF}`; g.fillText('チェリーより、黒。', 60 * u, 700 * u);
  g.fillStyle = '#9da0a6'; g.font = `400 ${22 * u}px ${SERIF}`; g.fillText('やわらかい未来を、足もとから。', 64 * u, 745 * u);
  g.textAlign = 'right'; g.font = `400 ${15 * u}px "IBM Plex Mono", monospace`; g.fillStyle = '#b9bcc2';
  ['MODEL   1906', 'COLOUR  BLACK / SILVER', 'UPPER   MESH × SUEDE', 'CUSHION 雲'].forEach((t, i) => g.fillText(t, 1140 * u, 470 * u + i * 26 * u));
  g.fillStyle = '#c8322b'; g.fillRect(1100 * u, 60 * u, 40 * u, 40 * u);
  g.fillStyle = '#fff'; g.font = `900 ${18 * u}px ${GOTHIC}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('黒', 1120 * u, 81 * u);
  grommets(g, W, H, u);
}

// ── 3. 辞書ポップ ───────────────────────────────────────────────────────────
function dictionary(g, W, H) {
  const u = W / 1200;
  g.fillStyle = '#f4efe2'; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(60,80,110,0.08)'; g.lineWidth = 1;
  for (let x = 0; x < W; x += 24 * u) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
  for (let y = 0; y < H; y += 24 * u) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  // headline
  g.fillStyle = '#1a1c22'; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.font = `900 ${84 * u}px ${SERIF}`; g.fillText('ふりがなは、', 70 * u, 160 * u);
  g.fillText('いらない。', 70 * u, 262 * u);
  g.font = `500 ${28 * u}px ${SERIF}`; g.fillStyle = '#4a4e58';
  g.fillText('わからない時だけ、そっと。', 76 * u, 320 * u);
  // a visual-novel screen
  g.save(); g.translate(620 * u, 70 * u);
  const sw = 520 * u, sh = 390 * u;
  rr(g, 0, 0, sw, sh, 14 * u); g.save(); g.clip();
  const sky = g.createLinearGradient(0, 0, 0, sh);
  sky.addColorStop(0, '#f6a35d'); sky.addColorStop(0.55, '#f2c58a'); sky.addColorStop(1, '#6e5a74');
  g.fillStyle = sky; g.fillRect(0, 0, sw, sh);
  g.fillStyle = '#3b3048';
  g.beginPath(); g.moveTo(0, sh * 0.62); for (let x = 0; x <= sw; x += 10 * u) g.lineTo(x, sh * 0.6 - Math.sin(x / (40 * u)) * 8 * u - (x > sw * 0.6 ? 30 * u : 0)); g.lineTo(sw, sh); g.lineTo(0, sh); g.fill();
  g.fillStyle = '#2a2232'; g.fillRect(sw * 0.15, sh * 0.35, 4 * u, sh * 0.4); g.fillRect(sw * 0.15 - 30 * u, sh * 0.37, 60 * u, 3 * u);
  // text box
  g.fillStyle = 'rgba(16,14,24,0.72)'; rr(g, 16 * u, sh - 120 * u, sw - 32 * u, 104 * u, 10 * u); g.fill();
  g.fillStyle = '#f6f1e6'; g.font = `500 ${23 * u}px ${SERIF}`; g.textAlign = 'left';
  const line1 = '黄昏の町で、ぼくらはまだ、';
  const line2 = '終わらない夏を待っていた。';
  g.fillText(line1, 36 * u, sh - 76 * u);
  g.fillText(line2, 36 * u, sh - 40 * u);
  // the hovered word
  const ww = g.measureText('黄昏').width;
  g.fillStyle = 'rgba(255,214,120,0.35)'; g.fillRect(34 * u, sh - 100 * u, ww + 4 * u, 34 * u);
  g.fillStyle = '#ffd678'; g.fillRect(34 * u, sh - 68 * u, ww + 4 * u, 2 * u);
  g.restore();
  // popup
  const px = 60 * u, py = sh - 330 * u;
  g.fillStyle = 'rgba(0,0,0,0.25)'; rr(g, px + 6 * u, py + 8 * u, 300 * u, 170 * u, 10 * u); g.fill();
  g.fillStyle = '#fbf8f0'; rr(g, px, py, 300 * u, 170 * u, 10 * u); g.fill();
  g.strokeStyle = '#2f4f6f'; g.lineWidth = 2 * u; g.stroke();
  g.fillStyle = '#1a1c22'; g.font = `600 ${40 * u}px ${SERIF}`; g.fillText('黄昏', px + 18 * u, py + 54 * u);
  g.fillStyle = '#6b5a3a'; g.font = `400 ${18 * u}px ${GOTHIC}`; g.fillText('たそがれ', px + 110 * u, py + 50 * u);
  g.font = `400 ${16 * u}px ${GOTHIC}`; g.fillStyle = '#1a1c22';
  [['1', '夕暮れ。日が沈み、薄暗くなる頃。'], ['2', '盛りを過ぎ、終わりに向かう頃。']].forEach(([n, t], i) => {
    g.fillStyle = '#2f4f6f'; rr(g, px + 18 * u, py + 78 * u + i * 34 * u, 20 * u, 20 * u, 3 * u); g.fill();
    g.fillStyle = '#fff'; g.font = `700 ${12 * u}px ${GOTHIC}`; g.textAlign = 'center'; g.fillText(n, px + 28 * u, py + 93 * u + i * 34 * u);
    g.textAlign = 'left'; g.fillStyle = '#1a1c22'; g.font = `400 ${16 * u}px ${GOTHIC}`; g.fillText(t, px + 46 * u, py + 94 * u + i * 34 * u);
  });
  // cursor
  g.save(); g.translate(70 * u, sh - 60 * u);
  g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 2 * u;
  g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 34 * u); g.lineTo(9 * u, 26 * u); g.lineTo(16 * u, 40 * u); g.lineTo(22 * u, 37 * u); g.lineTo(15 * u, 23 * u); g.lineTo(26 * u, 23 * u); g.closePath(); g.fill(); g.stroke();
  g.restore();
  g.restore();
  // product
  g.fillStyle = '#2f4f6f'; rr(g, 70 * u, 400 * u, 360 * u, 120 * u, 16 * u); g.fill();
  g.fillStyle = '#fff'; g.font = `800 ${56 * u}px ${ROUND}`; g.textAlign = 'left'; g.fillText('辞書ポップ', 100 * u, 482 * u);
  g.fillStyle = '#2f4f6f'; g.font = `500 ${21 * u}px ${GOTHIC}`;
  g.fillText('マウスを重ねるだけの、やさしい辞書。', 72 * u, 568 * u);
  g.fillText('ビジュアルノベル・テキストフッカー対応', 72 * u, 602 * u);
  g.font = `400 ${15 * u}px ${GOTHIC}`; g.fillStyle = '#7a7e88';
  g.fillText('※読めない漢字は、読めるまで何度でも。', 72 * u, 735 * u);
  grommets(g, W, H, u);
}

// ── 4. 消磁スプレー ─────────────────────────────────────────────────────────
function degauss(g, W, H) {
  const u = W / 1200;
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0d1230'); bg.addColorStop(1, '#05060f');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  // the television
  g.save(); g.translate(90 * u, 150 * u);
  const tw = 520 * u, th = 400 * u;
  g.fillStyle = '#5a3a24'; rr(g, 0, 0, tw, th, 18 * u); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.06)'; for (let y = 8 * u; y < th; y += 9 * u) g.fillRect(0, y, tw, 2 * u);
  g.fillStyle = '#1b1b1d'; rr(g, 22 * u, 22 * u, tw - 150 * u, th - 44 * u, 40 * u); g.fill();
  const sx = 36 * u, sy = 36 * u, sw = tw - 178 * u, sh = th - 72 * u;
  g.save(); rr(g, sx, sy, sw, sh, 34 * u); g.clip();
  // right half: clean colour bars; left half: purity blotches
  const bars = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'];
  bars.forEach((c, i) => { g.fillStyle = c; g.fillRect(sx + (sw / 7) * i, sy, sw / 7 + 1, sh); });
  g.save(); g.beginPath(); g.rect(sx, sy, sw * 0.5, sh); g.clip();
  const blot = (x, y, r, c) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); };
  g.globalCompositeOperation = 'lighter';
  blot(sx + 60 * u, sy + 70 * u, 120 * u, 'rgba(255,40,160,0.7)');
  blot(sx + 150 * u, sy + 220 * u, 140 * u, 'rgba(40,255,120,0.55)');
  blot(sx + 40 * u, sy + 240 * u, 90 * u, 'rgba(80,80,255,0.6)');
  g.restore();
  // spray mist crossing the middle
  g.fillStyle = 'rgba(220,235,255,0.35)';
  const rr2 = rng(5);
  for (let i = 0; i < 400; i++) { const t = rr2(); g.beginPath(); g.arc(sx + sw * (0.45 + t * 0.2) + (rr2() - 0.5) * 40 * u, sy + sh * 0.5 + (rr2() - 0.5) * sh * t, rr2() * 2.2 * u, 0, 7); g.fill(); }
  g.restore();
  g.fillStyle = '#c9b28a'; g.font = `700 ${14 * u}px "IBM Plex Mono", monospace`; g.textAlign = 'center';
  g.fillText('HIKARI', tw - 64 * u, 60 * u);
  for (let i = 0; i < 2; i++) { g.fillStyle = '#2a1a10'; g.beginPath(); g.arc(tw - 64 * u, 120 * u + i * 70 * u, 22 * u, 0, 7); g.fill(); }
  g.restore();
  // the can
  g.save(); g.translate(770 * u, 120 * u);
  const cw = 150 * u, chh = 420 * u;
  const metal = g.createLinearGradient(0, 0, cw, 0);
  metal.addColorStop(0, '#6c7178'); metal.addColorStop(0.3, '#f1f3f6'); metal.addColorStop(0.55, '#9aa0a8'); metal.addColorStop(1, '#4b4f55');
  g.fillStyle = '#c8cdd4'; rr(g, cw * 0.32, -40 * u, cw * 0.36, 40 * u, 6 * u); g.fill();
  g.fillStyle = '#2a63c9'; g.fillRect(cw * 0.4, -60 * u, cw * 0.2, 22 * u);
  g.fillStyle = metal; rr(g, 0, 0, cw, chh, 24 * u); g.fill();
  g.fillStyle = '#16264f'; g.fillRect(0, 110 * u, cw, 210 * u);
  g.fillStyle = '#ffd84a';
  g.beginPath(); g.moveTo(cw * 0.55, 130 * u); g.lineTo(cw * 0.3, 220 * u); g.lineTo(cw * 0.5, 220 * u); g.lineTo(cw * 0.42, 300 * u); g.lineTo(cw * 0.72, 196 * u); g.lineTo(cw * 0.52, 196 * u); g.closePath(); g.fill();
  vtext(g, 'デガウス', cw * 0.84, 140 * u, 30 * u, { font: GOTHIC, weight: 900, color: '#fff' });
  g.restore();
  // copy
  g.fillStyle = '#ffffff'; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.font = `900 ${50 * u}px ${SERIF}`; g.fillText('にじみも、未練も、', 90 * u, 640 * u);
  g.fillText('消磁します。', 90 * u, 700 * u);
  g.fillStyle = '#9fb1e8'; g.font = `500 ${20 * u}px ${GOTHIC}`;
  g.fillText('ブラウン管の色ムラに、シュッとひと吹き。HIKARI 純正アクセサリー', 92 * u, 745 * u);
  g.fillStyle = '#ffd84a'; g.font = `900 ${60 * u}px "Anton", sans-serif`; g.textAlign = 'right'; g.fillText('¥980', 1140 * u, 640 * u);
  g.fillStyle = '#6f7aa0'; g.font = `400 ${13 * u}px ${GOTHIC}`;
  g.fillText('※本品はスプレーです。実際の消磁は電源の入れ直しで行ってください。', 1140 * u, 700 * u);
  grommets(g, W, H, u);
}

// ── 6. 夏ヶ原 ───────────────────────────────────────────────────────────────
function natsugahara(g, W, H) {
  const u = W / 1200;
  const sky = g.createLinearGradient(0, 0, 0, H * 0.62);
  sky.addColorStop(0, '#9fc3d9'); sky.addColorStop(1, '#efe9d6');
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  // a tower of summer cloud
  const r = rng(12);
  for (let i = 0; i < 70; i++) {
    const t = r();
    const x = 380 * u + (r() - 0.5) * 360 * u * (1 - t * 0.6), y = 380 * u - t * 320 * u;
    const rad = (60 - t * 30) * u * (0.6 + r() * 0.6);
    g.fillStyle = r() < 0.3 ? '#dfe3e2' : '#fbfaf5';
    g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill();
  }
  // far hills
  g.fillStyle = '#8ea4b6';
  g.beginPath(); g.moveTo(0, 420 * u); for (let x = 0; x <= W; x += 20 * u) g.lineTo(x, 400 * u - Math.sin(x / (110 * u)) * 26 * u - Math.sin(x / (37 * u)) * 8 * u); g.lineTo(W, H); g.lineTo(0, H); g.fill();
  g.fillStyle = '#5f7f5a';
  g.beginPath(); g.moveTo(0, 470 * u); for (let x = 0; x <= W; x += 20 * u) g.lineTo(x, 455 * u - Math.sin(x / (80 * u) + 1) * 14 * u); g.lineTo(W, H); g.lineTo(0, H); g.fill();
  // rice fields in perspective
  const f = g.createLinearGradient(0, 470 * u, 0, H);
  f.addColorStop(0, '#7ea24e'); f.addColorStop(1, '#4f7d34');
  g.fillStyle = f; g.fillRect(0, 470 * u, W, H);
  g.strokeStyle = 'rgba(40,70,30,0.35)'; g.lineWidth = 1.5 * u;
  for (let i = -20; i < 40; i++) { g.beginPath(); g.moveTo(600 * u + i * 8 * u, 470 * u); g.lineTo(600 * u + i * 90 * u, H); g.stroke(); }
  g.strokeStyle = 'rgba(210,200,150,0.55)'; g.lineWidth = 3 * u;
  for (const y of [520, 600, 720]) { g.beginPath(); g.moveTo(0, y * u); g.lineTo(W, y * u - 10 * u); g.stroke(); }
  // the station: a short platform and a little shelter
  g.fillStyle = '#9a9488'; g.fillRect(90 * u, 520 * u, 420 * u, 26 * u);
  g.fillStyle = '#6b5844'; g.fillRect(180 * u, 440 * u, 8 * u, 82 * u); g.fillRect(320 * u, 440 * u, 8 * u, 82 * u);
  g.fillStyle = '#5e6a72'; g.beginPath(); g.moveTo(160 * u, 445 * u); g.lineTo(350 * u, 438 * u); g.lineTo(352 * u, 452 * u); g.lineTo(158 * u, 458 * u); g.fill();
  g.fillStyle = '#7b5c3e'; g.fillRect(210 * u, 495 * u, 80 * u, 8 * u);
  g.fillStyle = '#f7f5ee'; g.fillRect(400 * u, 478 * u, 70 * u, 26 * u);
  g.fillStyle = '#3c3c3c'; g.fillRect(404 * u, 504 * u, 3 * u, 18 * u); g.fillRect(463 * u, 504 * u, 3 * u, 18 * u);
  g.fillStyle = '#c8302e'; g.fillRect(250 * u, 480 * u, 22 * u, 40 * u);
  // the line of poles
  g.strokeStyle = '#2b2b2b';
  for (const [x, h] of [[640, 230], [860, 200], [1040, 175]]) {
    g.lineWidth = 5 * u; g.beginPath(); g.moveTo(x * u, 560 * u); g.lineTo(x * u, (560 - h) * u); g.stroke();
    g.lineWidth = 3 * u; g.beginPath(); g.moveTo((x - 24) * u, (560 - h + 14) * u); g.lineTo((x + 24) * u, (560 - h + 14) * u); g.stroke();
  }
  g.lineWidth = 1.2 * u;
  for (const k of [0, 1]) { g.beginPath(); g.moveTo(0, (290 + k * 10) * u); g.quadraticCurveTo(320 * u, (340 + k * 10) * u, 640 * u, (344 + k * 10) * u); g.quadraticCurveTo(750 * u, (380 + k * 10) * u, 860 * u, (374 + k * 10) * u); g.quadraticCurveTo(950 * u, (405 + k * 10) * u, 1040 * u, (399 + k * 10) * u); g.quadraticCurveTo(1120 * u, (420 + k * 10) * u, W, (418 + k * 10) * u); g.stroke(); }
  grain(g, W, H, 31, 0.07);
  // copy
  vtext(g, 'あの夏は、', 1120 * u, 90 * u, 52 * u, { color: '#1d2a2a', weight: 600 });
  vtext(g, 'まだ駅で', 1052 * u, 150 * u, 52 * u, { color: '#1d2a2a', weight: 600 });
  vtext(g, '待っている。', 984 * u, 210 * u, 52 * u, { color: '#1d2a2a', weight: 600 });
  g.fillStyle = 'rgba(250,247,238,0.92)'; g.fillRect(0, H - 92 * u, W, 92 * u);
  g.fillStyle = '#e6a23c'; g.fillRect(0, H - 92 * u, W, 6 * u);
  g.fillStyle = '#1d2a2a'; g.font = `700 ${32 * u}px ${SERIF}`; g.textAlign = 'left'; g.textBaseline = 'middle';
  g.fillText('ひかり線で、夏ヶ原へ。', 60 * u, H - 44 * u);
  g.textAlign = 'right'; g.font = `500 ${18 * u}px ${GOTHIC}`; g.fillStyle = '#5a6060';
  g.fillText('H01 夏ヶ原駅　·　ひかり線 旅客案内所', W - 60 * u, H - 44 * u);
  age(g, W, H, 0.2);
  grommets(g, W, H, u);
}

// ── 7. LP30枚組 ─────────────────────────────────────────────────────────────
function boxset(g, W, H) {
  const u = W / 1200;
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#3a1420'); bg.addColorStop(1, '#12070b');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  // a fan of record jackets with obi
  const pal = [['#f6b8c8', '#7fc6e8'], ['#ffd27a', '#e86a5a'], ['#9fd8c8', '#2a4f8a'], ['#f0e6d2', '#c8322b'], ['#c8b6ff', '#ff8fb8'], ['#ffb066', '#4d5288'], ['#e8f4ff', '#5fc6ff']];
  const r = rng(30);
  g.save(); g.translate(330 * u, 470 * u);
  for (let i = 0; i < 7; i++) {
    g.save();
    g.rotate(-0.55 + i * 0.16);
    g.translate(0, -230 * u);
    const s = 250 * u;
    const [c1, c2] = pal[i];
    const gr = g.createLinearGradient(-s / 2, -s / 2, s / 2, s / 2);
    gr.addColorStop(0, c1); gr.addColorStop(1, c2);
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(-s / 2 + 8 * u, -s / 2 + 10 * u, s, s);
    g.fillStyle = gr; g.fillRect(-s / 2, -s / 2, s, s);
    // abstract cover art: sun, horizon, palm or city
    g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.arc(s * 0.12, -s * 0.1, s * 0.16, 0, 7); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.18)'; for (let k = 0; k < 5; k++) g.fillRect(-s / 2, s * 0.05 + k * s * 0.06, s, s * 0.025);
    // obi
    g.fillStyle = '#fbf6ea'; g.fillRect(-s / 2 + 10 * u, -s / 2, 34 * u, s);
    g.fillStyle = '#c8322b'; g.fillRect(-s / 2 + 10 * u, -s / 2 + s * 0.08, 34 * u, 24 * u);
    vtext(g, ['夏の扉', '真夜中の', '水色の街', '銀河通信', '雨の駅', '黄昏電車', '光の粒'][i], -s / 2 + 27 * u, -s / 2 + s * 0.3, 18 * u, { color: '#1a1a1a', weight: 700, gap: 1.05 });
    g.restore();
  }
  g.restore();
  // a record half out of its sleeve
  g.save(); g.translate(560 * u, 520 * u);
  g.fillStyle = '#0a0a0b'; g.beginPath(); g.arc(0, 0, 130 * u, 0, 7); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.06)'; g.lineWidth = 1;
  for (let rad = 40; rad < 128; rad += 3) { g.beginPath(); g.arc(0, 0, rad * u, 0, 7); g.stroke(); }
  g.fillStyle = 'rgba(255,255,255,0.12)'; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 128 * u, -0.9, -0.5); g.fill();
  g.fillStyle = '#e6a23c'; g.beginPath(); g.arc(0, 0, 40 * u, 0, 7); g.fill();
  g.fillStyle = '#1a1a1a'; g.beginPath(); g.arc(0, 0, 4 * u, 0, 7); g.fill();
  g.font = `700 ${10 * u}px ${GOTHIC}`; g.textAlign = 'center'; g.fillText('ひかりレコード', 0, -16 * u);
  g.restore();
  // copy
  g.fillStyle = '#f6e7cf'; g.textAlign = 'right'; g.textBaseline = 'alphabetic';
  g.font = `400 ${22 * u}px ${GOTHIC}`; g.fillText('昭和歌謡 名盤アーカイブ', 1140 * u, 110 * u);
  g.font = `900 ${66 * u}px ${SERIF}`;
  g.fillText('針を落とせば、', 1140 * u, 220 * u);
  g.fillText('あの年に帰れる。', 1140 * u, 300 * u);
  g.fillStyle = '#e6a23c'; g.font = `900 ${44 * u}px ${MINCHO}`;
  g.fillText('LP30枚組', 1140 * u, 410 * u);
  g.fillStyle = '#f6e7cf'; g.font = `500 ${20 * u}px ${GOTHIC}`;
  g.fillText('完全生産限定盤　帯・歌詞カード復刻', 1140 * u, 456 * u);
  g.fillText('重量盤／解説ブックレット付', 1140 * u, 486 * u);
  g.font = `400 ${46 * u}px "Anton", sans-serif`; g.fillText('¥39,800', 1140 * u, 600 * u);
  g.font = `400 ${14 * u}px ${GOTHIC}`; g.fillStyle = 'rgba(246,231,207,0.6)';
  g.fillText('※プレーヤーは付属しません。思い出も付属しません。', 1140 * u, 640 * u);
  g.fillStyle = '#f6e7cf'; g.font = `800 ${30 * u}px ${MINCHO}`; g.fillText('ひかりレコード', 1140 * u, 740 * u);
  grommets(g, W, H, u);
}

export const ADS = [
  { id: 'milk', paint: strawberryMilk, title: 'いちご牛乳 — よろず乳業', en: 'Strawberry milk — “Sugar is fuel for the soul.”' },
  { id: '1906', paint: sneaker, title: '1906 — 黒', en: '1906 sneakers — “Black, over cherry.”' },
  { id: 'dict', paint: dictionary, title: '辞書ポップ', en: 'Pop-up dictionary — “You don’t need furigana.”' },
  { id: 'degauss', paint: degauss, title: 'デガウス・スプレー', en: 'Degauss spray — “Erases colour bleed, and lingering regrets.”' },
  { id: 'natsu', paint: natsugahara, title: '夏ヶ原 観光ポスター', en: 'Natsugahara tourism poster — “That summer is still waiting at the station.”' },
  { id: 'lp', paint: boxset, title: '昭和歌謡 名盤アーカイブ', en: 'Shōwa kayō archive, 30 LPs — “Drop the needle and you’re back in that year.”' },
];

export function paintAd(i, W = 1200) {
  const H = Math.round((W * 2) / 3);
  const { c, g } = canvas2d(W, H);
  ADS[i].paint(g, W, H);
  // all print: a touch of grain, a glossy sheen
  if (W <= 1400) grain(g, W, H, 100 + i, 0.035);
  const sh = g.createLinearGradient(0, 0, W, H);
  sh.addColorStop(0, 'rgba(255,255,255,0.0)'); sh.addColorStop(0.45, 'rgba(255,255,255,0.05)'); sh.addColorStop(0.5, 'rgba(255,255,255,0.0)');
  g.fillStyle = sh; g.fillRect(0, 0, W, H);
  return c;
}

export function paintAdBack(i) {
  const { c, g } = canvas2d(256, 170);
  g.fillStyle = ['#f2ece0', '#e8e2d4', '#efe6d8'][i % 3]; g.fillRect(0, 0, 256, 170);
  g.fillStyle = 'rgba(0,0,0,0.08)';
  for (let k = 0; k < 6; k++) g.fillRect(20, 30 + k * 20, 140 + (k * 37) % 80, 8);
  return c;
}
