// 地下 — every printed thing in the world, painted once into canvases:
// fliers, the station sign, graffiti, the missing-sneaker poster, the スマホ禁止 sign,
// the banner, concrete, haze, and one grey chunky sneaker.

import { rng, makeCanvas, valueNoise, TAU } from './util.js';

const GOTH = '"Zen Kaku Gothic New", "Hiragino Kaku Gothic ProN", sans-serif';
const MIN = '"Shippori Mincho B1", "Noto Serif JP", serif';
const POP = '"Mochiy Pop One", "M PLUS Rounded 1c", sans-serif';
const ANTON = 'Anton, Impact, "Arial Narrow", sans-serif';
const FRAK = '"UnifrakturCook", "EB Garamond", serif';
const MONO = '"IBM Plex Mono", Menlo, monospace';
const GLITCH = '"Rubik Glitch", Anton, Impact, sans-serif';
const DOT = '"DotGothic16", "VT323", monospace';

export const FONT_SPECS = [
  ['700 40px "Zen Kaku Gothic New"', '地下ちか禁止'], ['800 40px "Shippori Mincho B1"', '地下'],
  ['40px "Mochiy Pop One"', '地下ちか'], ['40px Anton', 'AUX'], ['700 40px UnifrakturCook', 'vol'],
  ['40px "Rubik Glitch"', 'RAGE'], ['40px "DotGothic16"', '現在地'], ['400 20px "IBM Plex Mono"', 'OPEN'],
  ['900 40px "Noto Serif JP"', '地下'],
];

function torn(g, w, h, r, jag = 6) {
  g.beginPath();
  const pts = [];
  const edge = (x0, y0, x1, y1, n) => {
    for (let i = 0; i < n; i++) {
      const u = i / n;
      pts.push([x0 + (x1 - x0) * u + (r() - 0.5) * jag * (y0 === y1 ? 0.4 : 1), y0 + (y1 - y0) * u + (r() - 0.5) * jag * (x0 === x1 ? 0.4 : 1)]);
    }
  };
  const m = jag;
  edge(m, m, w - m, m, 26); edge(w - m, m, w - m, h - m, 30); edge(w - m, h - m, m, h - m, 26); edge(m, h - m, m, m, 30);
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
}

function paperNoise(g, w, h, r, amt = 18, dark = false) {
  const id = g.getImageData(0, 0, w, h);
  const d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const n = (r() - 0.5) * amt;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
    if (dark && r() < 0.002) { d[i] *= 0.3; d[i + 1] *= 0.3; d[i + 2] *= 0.3; }
  }
  g.putImageData(id, 0, 0);
}

// A crowd shot run through a photocopier: silhouettes, halftone, toner.
export function xeroxCrowd(w, h, seed = 7) {
  const r = rng(seed);
  const c = makeCanvas(w, h), g = c.getContext('2d');
  const gr = g.createRadialGradient(w * 0.5, h * 0.15, 4, w * 0.5, h * 0.2, w * 0.8);
  gr.addColorStop(0, '#fff'); gr.addColorStop(0.4, '#999'); gr.addColorStop(1, '#111');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  // lasers
  g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1.2;
  for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(w * 0.5, h * 0.18); g.lineTo(-20 + i * (w + 40) / 8, h * 0.02 + r() * h * 0.2); g.stroke(); }
  g.fillStyle = '#000';
  for (let row = 0; row < 4; row++) {
    const y0 = h * (0.62 + row * 0.13), s = 0.55 + row * 0.35;
    for (let x = -20; x < w + 20; x += 22 * s + r() * 10) {
      const hh = (40 + r() * 14) * s;
      g.beginPath();
      g.ellipse(x, y0 - hh, 8 * s, 9 * s, 0, 0, TAU);
      g.moveTo(x - 17 * s, y0 + 30 * s);
      g.quadraticCurveTo(x - 17 * s, y0 - hh + 14 * s, x, y0 - hh + 12 * s);
      g.quadraticCurveTo(x + 17 * s, y0 - hh + 14 * s, x + 17 * s, y0 + 30 * s);
      g.fill();
      if (r() < 0.35) {
        g.lineWidth = 6 * s; g.lineCap = 'round'; g.strokeStyle = '#000';
        const sd = r() < 0.5 ? -1 : 1;
        g.beginPath(); g.moveTo(x + sd * 12 * s, y0 - hh + 18 * s); g.lineTo(x + sd * (18 + r() * 10) * s, y0 - hh - 22 * s); g.stroke();
        if (r() < 0.5) { g.fillStyle = '#fff'; g.fillRect(x + sd * (16 + 8) * s - 4 * s, y0 - hh - 34 * s, 8 * s, 12 * s); g.fillStyle = '#000'; }
      }
    }
  }
  // halftone threshold
  const id = g.getImageData(0, 0, w, h), d = id.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    const L = d[i] / 255;
    const cx = (x % 4) - 1.5, cy = (y % 4) - 1.5;
    const th = Math.sqrt(cx * cx + cy * cy) / 2.2;
    const v = L + (r() - 0.5) * 0.12 > th ? 238 : 18;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  g.putImageData(id, 0, 0);
  return c;
}

export const LINEUP = ['OsamaSon', 'Nine Vicious', 'Che', 'Nettspend', 'XXXTentacion', 'xaviersobased', 'Glokk40Spaz', 'Lucy Bedroque', 'Kuru'];

// The flier, as it hangs on the tiles.
export function flier(seed = 5) {
  const r = rng(seed);
  const w = 380, h = 540;
  const c = makeCanvas(w, h), g = c.getContext('2d');
  torn(g, w, h, r, 9);
  g.save(); g.clip();
  g.fillStyle = '#efeadf'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#111';
  g.fillRect(0, 0, w, 34);
  g.fillStyle = '#efeadf'; g.font = `700 15px ${GOTH}`; g.textBaseline = 'middle';
  g.fillText('ひかり線 H05 地下ホーム奥 ／ 始発まで', 16, 18);
  g.fillStyle = '#0d0d0d';
  g.font = `800 150px ${MIN}`; g.textBaseline = 'alphabetic';
  g.fillText('地下', 14, 180);
  g.save(); g.translate(250, 196); g.rotate(-0.12);
  g.fillStyle = '#e0261f'; g.font = `700 54px ${FRAK}`; g.fillText('vol.∞', 0, 0);
  g.restore();
  g.font = `700 17px ${GOTH}`; g.fillStyle = '#111';
  g.fillText('終電を逃した人たちへ', 18, 218);
  g.drawImage(xeroxCrowd(344, 120, seed + 3), 18, 230);
  g.fillStyle = '#111'; g.fillRect(18, 360, 344, 26);
  g.fillStyle = '#d8ff3a'; g.font = `24px ${ANTON}`; g.textBaseline = 'middle';
  g.fillText("TONIGHT'S AUX  今夜の選曲", 26, 374);
  g.fillStyle = '#111'; g.font = `19px ${ANTON}`; g.textBaseline = 'alphabetic';
  let y = 410, x = 20;
  LINEUP.forEach((n, i) => {
    const tw = g.measureText(n).width;
    if (x + tw > 352) { x = 20; y += 26; }
    g.fillText(n, x, y);
    x += tw + 10;
    if (i < LINEUP.length - 1) { g.fillStyle = '#e0261f'; g.fillText('/', x - 7, y); g.fillStyle = '#111'; x += 8; }
  });
  y += 30;
  g.font = `500 13px ${MONO}`; g.fillText('OPEN 23:30 → 始発   ADV ¥0 / DOOR ¥0 (+1D)', 20, y);
  g.font = `700 13px ${GOTH}`;
  g.fillText('※場内スマホ禁止  ※モッシュ・ダイブは自己責任で', 20, y + 22);
  g.fillText('※落とし物（特に片方だけの靴）は責任を負いかねます', 20, y + 42);
  // toner streaks
  g.globalAlpha = 0.08; g.fillStyle = '#000';
  for (let i = 0; i < 6; i++) g.fillRect(r() * w, 0, 1 + r() * 2, h);
  g.globalAlpha = 1;
  g.restore();
  paperNoise(g, w, h, r, 22, true);
  return c;
}

// 駅名標 — the station name board, tagged over.
export function stationSign() {
  const w = 720, h = 260, r = rng(55);
  const c = makeCanvas(w, h), g = c.getContext('2d');
  g.fillStyle = '#f4f3ee'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#2b2b2b'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
  g.fillStyle = '#111'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.font = `700 30px ${GOTH}`; g.fillText('ち　か', w / 2, 52);
  g.font = `700 92px ${GOTH}`; g.fillText('地下', w / 2, 140);
  g.font = `500 26px ${GOTH}`; g.fillText('Chika', w / 2, 172);
  // station number badge
  g.fillStyle = '#fff'; g.strokeStyle = '#e0261f'; g.lineWidth = 7;
  g.beginPath(); g.roundRect ? g.roundRect(46, 44, 82, 82, 10) : g.rect(46, 44, 82, 82); g.fill(); g.stroke();
  g.fillStyle = '#e0261f'; g.font = `700 22px ${GOTH}`; g.fillText('H', 87, 76); g.font = `700 34px ${GOTH}`; g.fillText('05', 87, 112);
  // line band
  g.fillStyle = '#e0261f'; g.fillRect(6, 186, w - 12, 18);
  g.fillStyle = '#d8ff3a'; g.fillRect(6, 204, w - 12, 5);
  g.fillStyle = '#111'; g.textAlign = 'left'; g.font = `700 24px ${GOTH}`;
  g.fillText('← 円町', 24, 240); g.font = `500 15px ${GOTH}`; g.fillText('えんまち  Marumachi', 118, 238);
  g.textAlign = 'right'; g.font = `700 24px ${GOTH}`; g.fillText('区域 →', w - 24, 240);
  g.font = `500 15px ${GOTH}`; g.fillText('Kuiki  くいき', w - 118, 238);
  // grime
  const n = valueNoise(r, w, h, 40);
  const id = g.getImageData(0, 0, w, h), d = id.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, k = 1 - Math.max(0, n(x, y) - 0.55) * 0.9 - (r() * 0.05);
    d[i] *= k; d[i + 1] *= k; d[i + 2] *= k * 0.96;
  }
  g.putImageData(id, 0, 0);
  // a silver tag across it, a sticker on the corner
  g.save(); g.translate(430, 120); g.rotate(-0.18);
  scrawl(g, r, 230, 70, '#c9ccd2', 5);
  g.restore();
  sticker(g, 640, 40, 34, '#d8ff3a', '∞', r);
  return c;
}

function sticker(g, x, y, rad, col, text, r) {
  g.save(); g.translate(x, y); g.rotate((r() - 0.5) * 0.8);
  g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, rad + 4, 0, TAU); g.fill();
  g.fillStyle = col; g.beginPath(); g.arc(0, 0, rad, 0, TAU); g.fill();
  g.fillStyle = '#111'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `${Math.round(rad * 1.2)}px ${POP}`; g.fillText(text, 0, 2);
  g.restore();
}

// A handstyle tag: a fast looping marker scrawl.
export function scrawl(g, r, w, h, col, lw = 4) {
  g.save();
  g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round';
  g.shadowColor = col; g.shadowBlur = lw * 0.8;
  g.beginPath();
  let x = -w / 2, y = 0;
  g.moveTo(x, y);
  const letters = 4 + Math.floor(r() * 3);
  for (let L = 0; L < letters; L++) {
    const lx = x + w / letters;
    const kind = Math.floor(r() * 4);
    if (kind === 0) { g.lineTo(x + 6, -h / 2); g.lineTo(x + 10, h / 3); g.quadraticCurveTo(lx, -h / 2, lx - 4, h / 4); }
    else if (kind === 1) { g.bezierCurveTo(x + 20, -h, lx + 10, -h / 3, x + 8, h / 3); g.lineTo(lx, -h / 4); }
    else if (kind === 2) { g.quadraticCurveTo(x + 4, -h * 0.7, lx - 6, -h / 2); g.lineTo(x + 8, h / 3); g.lineTo(lx, h / 3); }
    else { g.arc(x + w / letters / 2, 0, h / 3, Math.PI, Math.PI * 2.8); }
    x = lx;
  }
  g.quadraticCurveTo(x + 30, h / 2, x + 50, -h * 0.2);
  g.stroke();
  // underline swoosh + crown
  g.lineWidth = lw * 0.7;
  g.beginPath(); g.moveTo(-w / 2 + 10, h / 2 + 6); g.quadraticCurveTo(0, h / 2 + 20, w / 2 + 40, h / 2 - 4); g.stroke();
  g.beginPath(); g.moveTo(-w / 2 + 4, -h * 0.75); g.lineTo(-w / 2 + 10, -h * 1.0); g.lineTo(-w / 2 + 18, -h * 0.8); g.lineTo(-w / 2 + 26, -h * 1.05); g.lineTo(-w / 2 + 32, -h * 0.75); g.stroke();
  g.restore();
}

function drips(g, r, x0, x1, y, col, n, maxLen) {
  g.strokeStyle = col; g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const x = x0 + r() * (x1 - x0), L = 8 + r() * maxLen;
    g.lineWidth = 2 + r() * 3;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + L); g.stroke();
    g.fillStyle = col; g.beginPath(); g.arc(x, y + L, g.lineWidth * 0.9, 0, TAU); g.fill();
  }
}

// Throw-ups and pieces.
export function graffiti(kind, seed = 1) {
  const r = rng(seed);
  if (kind === 'bubble') {
    const w = 640, h = 260, c = makeCanvas(w, h), g = c.getContext('2d');
    const txt = ['地下', 'ちか', 'RAGE'][seed % 3];
    g.font = `${txt.length > 2 ? 150 : 170}px ${POP}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const cx = w / 2, cy = h / 2 + 6;
    g.lineJoin = 'round';
    g.lineWidth = 34; g.strokeStyle = '#111'; g.strokeText(txt, cx + 10, cy + 10);
    g.lineWidth = 30; g.strokeStyle = '#111'; g.strokeText(txt, cx, cy);
    g.lineWidth = 12; g.strokeStyle = seed % 2 ? '#d8ff3a' : '#ffffff'; g.strokeText(txt, cx, cy);
    const gr = g.createLinearGradient(0, cy - 70, 0, cy + 70);
    const pal = [['#ff5ab4', '#ffd23a'], ['#8a3cff', '#3affd8'], ['#ff2a2a', '#ff9a3a']][seed % 3];
    gr.addColorStop(0, pal[0]); gr.addColorStop(1, pal[1]);
    g.fillStyle = gr; g.fillText(txt, cx, cy);
    g.globalAlpha = 0.85; g.fillStyle = '#fff';
    for (let i = 0; i < 7; i++) { g.beginPath(); g.ellipse(cx - 200 + r() * 400, cy - 40 + r() * 20, 10 + r() * 8, 4, -0.4, 0, TAU); g.fill(); }
    g.globalAlpha = 1;
    drips(g, r, cx - 220, cx + 220, cy + 55, pal[1], 7, 50);
    // overspray
    g.globalAlpha = 0.18; g.fillStyle = pal[0];
    for (let i = 0; i < 400; i++) { g.fillRect(cx - 280 + r() * 560, cy - 110 + r() * 220, 1.5, 1.5); }
    g.globalAlpha = 1;
    return c;
  }
  if (kind === 'goth') {
    const w = 520, h = 180, c = makeCanvas(w, h), g = c.getContext('2d');
    const txt = ['Chika', 'vol.∞', 'afterhours'][seed % 3];
    g.translate(w / 2, h / 2); g.rotate(-0.08);
    g.font = `700 110px ${FRAK}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = '#ff2a2a'; g.shadowBlur = 14;
    g.lineWidth = 8; g.strokeStyle = '#0a0a0a'; g.strokeText(txt, 0, 0);
    g.shadowBlur = 0;
    g.fillStyle = '#e9e9ef'; g.fillText(txt, 0, 0);
    drips(g, r, -180, 180, 34, '#e9e9ef', 5, 30);
    return c;
  }
  if (kind === 'glitch') {
    const w = 520, h = 160, c = makeCanvas(w, h), g = c.getContext('2d');
    const txt = ['NO SLEEP', 'AUX ME', '808 SZN'][seed % 3];
    g.font = `92px ${GLITCH}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#ff2a6a'; g.fillText(txt, w / 2 + 4, h / 2 + 2);
    g.fillStyle = '#3affd8'; g.fillText(txt, w / 2 - 4, h / 2 - 2);
    g.fillStyle = '#d8ff3a'; g.fillText(txt, w / 2, h / 2);
    return c;
  }
  // tag
  const w = 360, h = 160, c = makeCanvas(w, h), g = c.getContext('2d');
  g.translate(w / 2 - 20, h / 2 + 4); g.rotate((r() - 0.5) * 0.3);
  scrawl(g, r, 230, 64, ['#111', '#c9ccd2', '#ff5ab4', '#d8ff3a'][seed % 4], 5 + r() * 3);
  return c;
}

// 探しています — the missing sneaker poster (a single grey chunky shoe).
export function missingPoster(sneakerImg) {
  const w = 300, h = 420, r = rng(906);
  const c = makeCanvas(w, h), g = c.getContext('2d');
  torn(g, w, h, r, 6); g.save(); g.clip();
  g.fillStyle = '#f6f1d8'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#c91d1d'; g.fillRect(0, 0, w, 64);
  g.fillStyle = '#fff'; g.font = `700 40px ${GOTH}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('探しています', w / 2, 34);
  g.drawImage(sneakerImg, 30, 84, 240, 112);
  g.fillStyle = '#111'; g.font = `700 24px ${GOTH}`;
  g.fillText('スニーカー（左足のみ）', w / 2, 230);
  g.font = `500 17px ${GOTH}`;
  g.fillText('グレー・ごつめ・たぶん 9060', w / 2, 262);
  g.fillText('最後に見たのは：', w / 2, 296);
  g.font = `700 18px ${GOTH}`; g.fillText('モッシュピットの上空', w / 2, 320);
  g.font = `500 15px ${GOTH}`; g.fillText('見つけた方は地下まで', w / 2, 356);
  g.fillStyle = '#c91d1d'; g.font = `700 16px ${GOTH}`; g.fillText('お礼：AUX 一曲分', w / 2, 384);
  g.restore();
  paperNoise(g, w, h, r, 16);
  return c;
}

// ひかり線 路線図 — the line map, with 現在地 at H05.
export function lineMap() {
  const w = 760, h = 300, r = rng(808);
  const c = makeCanvas(w, h), g = c.getContext('2d');
  g.fillStyle = '#f1efe8'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#1d1d22'; g.fillRect(0, 0, w, 52);
  g.fillStyle = '#fff'; g.font = `700 26px ${GOTH}`; g.textBaseline = 'middle'; g.fillText('ひかり線  路線図', 22, 27);
  g.font = `500 15px ${MONO}`; g.fillText('HIKARI LINE', w - 140, 27);
  const st = [['H01', '夏ヶ原'], ['H02', '銀座'], ['H03', '水色ヶ丘'], ['H04', '円町'], ['H05', '地下'], ['H06', '区域'], ['H07', '黄昏ヶ浜'], ['H∞', '銀河']];
  const y = 160, x0 = 60, x1 = w - 60;
  g.strokeStyle = '#e0261f'; g.lineWidth = 12; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x0, y); g.lineTo(x1 - 70, y); g.stroke();
  g.setLineDash([4, 10]); g.beginPath(); g.moveTo(x1 - 70, y); g.lineTo(x1, y); g.stroke(); g.setLineDash([]);
  st.forEach(([no, name], i) => {
    const x = x0 + ((x1 - x0) * i) / (st.length - 1);
    const here = i === 4;
    g.fillStyle = '#fff'; g.strokeStyle = here ? '#111' : '#e0261f'; g.lineWidth = here ? 6 : 4;
    g.beginPath(); g.arc(x, y, here ? 15 : 11, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#111'; g.textAlign = 'center';
    g.font = `700 ${here ? 22 : 18}px ${GOTH}`; g.fillText(name, x, y - 40);
    g.font = `500 13px ${MONO}`; g.fillText(no, x, y + 36);
    if (here) {
      g.fillStyle = '#e0261f'; g.beginPath(); g.roundRect ? g.roundRect(x - 40, y + 52, 80, 28, 6) : g.rect(x - 40, y + 52, 80, 28); g.fill();
      g.fillStyle = '#fff'; g.font = `700 16px ${GOTH}`; g.fillText('現在地', x, y + 67);
    }
  });
  g.textAlign = 'left'; g.fillStyle = '#555'; g.font = `500 14px ${GOTH}`;
  g.fillText('終点・銀河より先は運行しておりません', 22, h - 22);
  // someone drew on it
  g.save(); g.translate(500, 240); g.rotate(-0.1);
  g.strokeStyle = '#111'; g.lineWidth = 3; g.lineCap = 'round';
  g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-60, -10, -150, -40); g.stroke();
  g.beginPath(); g.moveTo(-150, -40); g.lineTo(-132, -46); g.moveTo(-150, -40); g.lineTo(-138, -26); g.stroke();
  g.font = `22px ${POP}`; g.fillStyle = '#111'; g.fillText('ここ音デカい', 6, 8);
  g.restore();
  paperNoise(g, w, h, r, 14);
  return c;
}

// An old HIKARI TV poster, peeled and tagged.
export function tvPoster() {
  const w = 420, h = 600, r = rng(1986);
  const c = makeCanvas(w, h), g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, '#1b2238'); gr.addColorStop(1, '#4a2a4a');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  // the set
  g.fillStyle = '#c8b89a'; g.beginPath(); g.roundRect ? g.roundRect(70, 150, 280, 230, 18) : g.rect(70, 150, 280, 230); g.fill();
  g.fillStyle = '#111'; g.beginPath(); g.roundRect ? g.roundRect(92, 170, 190, 160, 26) : g.rect(92, 170, 190, 160); g.fill();
  const sg = g.createRadialGradient(187, 250, 5, 187, 250, 110);
  sg.addColorStop(0, '#9fe6ff'); sg.addColorStop(1, '#22406a');
  g.fillStyle = sg; g.beginPath(); g.roundRect ? g.roundRect(100, 178, 174, 144, 22) : g.rect(100, 178, 174, 144); g.fill();
  g.fillStyle = '#333'; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(315, 200 + i * 34, 9, 0, TAU); g.fill(); }
  g.fillStyle = '#fff'; g.font = `700 52px ${GOTH}`; g.textAlign = 'center';
  g.fillText('画面の向こうへ。', w / 2, 100);
  g.font = `500 22px ${MONO}`; g.fillText('HIKARI  CT-1486', w / 2, 440);
  g.font = `500 15px ${GOTH}`; g.fillText('カラーテレビ  14型  1986', w / 2, 470);
  // peeled corner + tag
  g.fillStyle = '#7a776f';
  g.beginPath(); g.moveTo(w, h - 190); g.lineTo(w, h); g.lineTo(w - 170, h); g.closePath(); g.fill();
  g.fillStyle = '#d9d2c2';
  g.beginPath(); g.moveTo(w, h - 190); g.lineTo(w - 170, h); g.lineTo(w - 120, h - 120); g.closePath(); g.fill();
  g.save(); g.translate(200, 540); g.rotate(-0.15); scrawl(g, r, 200, 50, '#d8ff3a', 6); g.restore();
  return c;
}

// The cardboard arrow at the end of the platform.
export function venueArrow() {
  const w = 360, h = 200, r = rng(31);
  const c = makeCanvas(w, h), g = c.getContext('2d');
  g.fillStyle = '#b48a5a';
  g.beginPath(); g.moveTo(8, 14); g.lineTo(w - 10, 6); g.lineTo(w - 4, h - 12); g.lineTo(4, h - 6); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(80,50,20,0.4)'; g.lineWidth = 1;
  for (let x = 20; x < w; x += 9) { g.beginPath(); g.moveTo(x, 10); g.lineTo(x + 2, h - 10); g.stroke(); }
  g.fillStyle = '#111'; g.font = `80px ${POP}`; g.textBaseline = 'middle';
  g.fillText('会場', 26, 82);
  g.strokeStyle = '#111'; g.lineWidth = 12; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(218, 84); g.lineTo(330, 80); g.moveTo(296, 46); g.lineTo(334, 80); g.lineTo(298, 116); g.stroke();
  g.font = `700 22px ${GOTH}`; g.fillStyle = '#c91d1d';
  g.fillText('音のする方へ', 30, 160);
  // tape
  g.fillStyle = 'rgba(230,225,200,0.75)';
  g.save(); g.translate(40, 14); g.rotate(-0.5); g.fillRect(-30, -9, 60, 18); g.restore();
  g.save(); g.translate(w - 40, 16); g.rotate(0.6); g.fillRect(-30, -9, 60, 18); g.restore();
  paperNoise(g, w, h, r, 12);
  return c;
}

// 関係者以外立入禁止 — with an edit.
export function staffSign() {
  const w = 420, h = 200, r = rng(77);
  const c = makeCanvas(w, h), g = c.getContext('2d');
  g.fillStyle = '#f2f0ea'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#c91d1d'; g.fillRect(0, 0, w, 16); g.fillRect(0, h - 16, w, 16);
  g.fillStyle = '#c91d1d'; g.font = `700 44px ${GOTH}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('関係者以外', w / 2, 66);
  g.fillText('立入禁止', w / 2, 120);
  g.save(); g.translate(300, 160); g.rotate(-0.14);
  g.fillStyle = '#111'; g.font = `30px ${POP}`; g.fillText('全員関係者', 0, 0);
  g.restore();
  g.strokeStyle = '#111'; g.lineWidth = 4;
  g.beginPath(); g.moveTo(60, 112); g.lineTo(210, 128); g.stroke();
  paperNoise(g, w, h, r, 10);
  return c;
}

// スマホ禁止 — laminated, slightly peeling, entirely ignored.
export function phoneBan() {
  const w = 300, h = 400, r = rng(404);
  const c = makeCanvas(w, h), g = c.getContext('2d');
  g.fillStyle = '#fbfaf6'; g.fillRect(0, 0, w, h);
  // pictogram
  g.save(); g.translate(w / 2, 140);
  g.fillStyle = '#111';
  g.beginPath(); g.roundRect ? g.roundRect(-38, -66, 76, 132, 12) : g.rect(-38, -66, 76, 132); g.fill();
  g.fillStyle = '#fbfaf6'; g.fillRect(-28, -50, 56, 92);
  g.strokeStyle = '#d91a1a'; g.lineWidth = 16;
  g.beginPath(); g.arc(0, 0, 92, 0, TAU); g.stroke();
  g.beginPath(); g.moveTo(-65, -65); g.lineTo(65, 65); g.stroke();
  g.restore();
  g.fillStyle = '#d91a1a'; g.font = `700 54px ${GOTH}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('スマホ禁止', w / 2, 290);
  g.fillStyle = '#111'; g.font = `500 17px ${GOTH}`;
  g.fillText('撮影・録音はご遠慮ください', w / 2, 334);
  // laminate glare
  const gl = g.createLinearGradient(0, 0, w, h);
  gl.addColorStop(0.2, 'rgba(255,255,255,0)'); gl.addColorStop(0.35, 'rgba(255,255,255,0.35)'); gl.addColorStop(0.45, 'rgba(255,255,255,0)');
  g.fillStyle = gl; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(230,225,200,0.8)';
  g.save(); g.translate(20, 14); g.rotate(-0.7); g.fillRect(-26, -8, 52, 16); g.restore();
  g.save(); g.translate(w - 20, 14); g.rotate(0.7); g.fillRect(-26, -8, 52, 16); g.restore();
  sticker(g, w - 44, h - 50, 30, '#ff5ab4', '草', r);
  return c;
}

// The banner behind the decks: a bedsheet, spray paint, tape.
export function banner() {
  const w = 900, h = 360, r = rng(9);
  const c = makeCanvas(w, h), g = c.getContext('2d');
  g.fillStyle = '#e8e3d6'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(0,0,0,0.06)'; g.lineWidth = 3;
  for (let i = 0; i < 18; i++) { g.beginPath(); g.moveTo(r() * w, 0); g.quadraticCurveTo(r() * w, h / 2, r() * w, h); g.stroke(); }
  const chars = ['地', '下'];
  g.textAlign = 'center'; g.textBaseline = 'middle';
  chars.forEach((ch, i) => {
    g.save(); g.translate(220 + i * 230, 170); g.rotate((r() - 0.5) * 0.18);
    g.font = `900 230px "Noto Serif JP", ${MIN}`;
    g.shadowColor = '#000'; g.shadowBlur = 10; g.fillStyle = '#0a0a0a'; g.fillText(ch, 0, 0);
    g.restore();
  });
  drips(g, r, 120, 560, 268, '#0a0a0a', 9, 70);
  g.save(); g.translate(720, 120); g.rotate(-0.16);
  g.font = `700 96px ${FRAK}`; g.shadowColor = '#ff2a2a'; g.shadowBlur = 16; g.fillStyle = '#e0261f'; g.fillText('vol.∞', 0, 0);
  g.restore();
  g.font = `40px ${ANTON}`; g.fillStyle = '#111'; g.fillText('CHIKA UNDERGROUND', 690, 250);
  g.font = `500 22px ${MONO}`; g.fillText('始発まで / until the first train', 690, 292);
  return c;
}

// Concrete: value noise, stains, form-tie holes, cracks.
export function concrete(w, h, seed, base = [70, 70, 74]) {
  const r = rng(seed);
  const c = makeCanvas(w, h), g = c.getContext('2d');
  const n1 = valueNoise(r, w, h, 64), n2 = valueNoise(r, w, h, 12), n3 = valueNoise(r, w, h, 3);
  const id = g.createImageData(w, h), d = id.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    const v = 0.65 + n1(x, y) * 0.35 + (n2(x, y) - 0.5) * 0.25 + (n3(x, y) - 0.5) * 0.18 - Math.max(0, (y / h) - 0.7) * 0.4 * n1(x * 2, y);
    d[i] = base[0] * v; d[i + 1] = base[1] * v; d[i + 2] = base[2] * v; d[i + 3] = 255;
  }
  g.putImageData(id, 0, 0);
  // form-tie holes
  g.fillStyle = 'rgba(0,0,0,0.45)';
  for (let y = h * 0.2; y < h; y += h * 0.33) for (let x = w * 0.1; x < w; x += w * 0.2) { g.beginPath(); g.arc(x + (r() - 0.5) * 4, y, 3, 0, TAU); g.fill(); }
  // panel seams
  g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 2;
  for (let x = w * 0.2; x < w; x += w * 0.2) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  // cracks
  g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1;
  for (let k = 0; k < 4; k++) {
    let x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y);
    for (let s = 0; s < 14; s++) { x += (r() - 0.5) * 20; y += r() * 12; g.lineTo(x, y); }
    g.stroke();
  }
  return c;
}

// Soft haze blobs (white on transparent).
export function haze(w = 512, h = 256, seed = 3) {
  const r = rng(seed);
  const c = makeCanvas(w, h), g = c.getContext('2d');
  for (let i = 0; i < 90; i++) {
    const x = r() * w, y = r() * h, rad = 20 + r() * 90;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, `rgba(255,255,255,${0.05 + r() * 0.08})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    // wrap horizontally
    if (x < rad) { g.save(); g.translate(w, 0); g.fillRect(x - rad, y - rad, rad * 2, rad * 2); g.restore(); }
    if (x > w - rad) { g.save(); g.translate(-w, 0); g.fillRect(x - rad, y - rad, rad * 2, rad * 2); g.restore(); }
  }
  return c;
}

// One grey chunky runner, side profile, toe to the right: a sculpted, wavy split midsole that
// climbs at the heel, a padded collar, suede over mesh. (No logos, just the silhouette.)
export function sneaker(lit = true) {
  const w = 320, h = 150;
  const c = makeCanvas(w, h), g = c.getContext('2d');
  const k = lit ? 1 : 0.3;
  const col = (r, gg, b) => `rgb(${(r * k) | 0},${(gg * k) | 0},${(b * k) | 0})`;
  g.lineJoin = 'round'; g.lineCap = 'round';
  // upper (mesh base)
  g.fillStyle = col(150, 152, 158);
  g.beginPath();
  g.moveTo(22, 86);
  g.bezierCurveTo(12, 56, 20, 22, 46, 16);      // heel counter
  g.bezierCurveTo(66, 12, 84, 22, 96, 34);      // collar
  g.bezierCurveTo(106, 42, 116, 42, 126, 40);   // throat
  g.bezierCurveTo(176, 40, 236, 50, 272, 62);   // lace line to toe
  g.bezierCurveTo(300, 70, 314, 82, 310, 96);   // rounded toe box
  g.lineTo(22, 96);
  g.closePath(); g.fill();
  // padded collar
  g.fillStyle = col(98, 100, 106);
  g.beginPath(); g.moveTo(44, 18); g.bezierCurveTo(66, 12, 84, 22, 96, 34); g.bezierCurveTo(84, 36, 62, 30, 44, 26); g.closePath(); g.fill();
  // suede: toe cap, eyestay, heel
  g.fillStyle = col(112, 114, 122);
  g.beginPath(); g.moveTo(236, 54); g.bezierCurveTo(276, 60, 310, 76, 310, 96); g.lineTo(230, 96); g.bezierCurveTo(236, 80, 236, 66, 236, 54); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(22, 86); g.bezierCurveTo(12, 56, 20, 22, 46, 16); g.bezierCurveTo(50, 40, 60, 70, 82, 96); g.lineTo(22, 96); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(118, 42); g.bezierCurveTo(160, 42, 200, 48, 232, 56); g.lineTo(226, 66); g.bezierCurveTo(196, 58, 160, 54, 122, 54); g.closePath(); g.fill();
  // a sweeping side band (generic, no mark)
  g.fillStyle = col(226, 226, 232);
  g.beginPath(); g.moveTo(92, 92); g.bezierCurveTo(112, 66, 156, 54, 204, 60); g.bezierCurveTo(170, 66, 140, 78, 124, 94); g.closePath(); g.fill();
  // tongue + laces + pull tab
  g.fillStyle = col(132, 134, 140);
  g.beginPath(); g.moveTo(104, 36); g.bezierCurveTo(106, 10, 132, 4, 142, 18); g.lineTo(134, 44); g.closePath(); g.fill();
  g.strokeStyle = col(242, 242, 242); g.lineWidth = 3;
  for (let i = 0; i < 5; i++) { const x = 128 + i * 20, y = 42 + i * 3.4; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 13, y + 8); g.moveTo(x + 13, y); g.lineTo(x, y + 8); g.stroke(); }
  g.fillStyle = col(196, 58, 58); g.fillRect(26, 22, 9, 26);
  // mesh texture
  g.save(); g.globalAlpha = 0.22; g.strokeStyle = col(60, 60, 64); g.lineWidth = 1;
  for (let x = 60; x < 300; x += 6) { g.beginPath(); g.moveTo(x, 44); g.lineTo(x - 12, 96); g.stroke(); }
  g.restore();
  // the midsole: tall at the heel, two big pods underneath, a wave along its top edge
  g.fillStyle = col(222, 218, 206);
  g.beginPath();
  g.moveTo(14, 70);
  g.bezierCurveTo(60, 84, 110, 98, 150, 96);
  g.bezierCurveTo(200, 94, 250, 84, 312, 92);
  g.bezierCurveTo(318, 104, 308, 118, 290, 122);
  g.bezierCurveTo(262, 130, 236, 134, 212, 128);   // fore pod
  g.bezierCurveTo(196, 124, 180, 120, 168, 124);
  g.bezierCurveTo(140, 136, 100, 140, 70, 134);    // rear pod
  g.bezierCurveTo(36, 128, 10, 110, 14, 70);
  g.closePath(); g.fill();
  // split line + outsole
  g.strokeStyle = col(150, 146, 136); g.lineWidth = 3;
  g.beginPath(); g.moveTo(26, 96); g.bezierCurveTo(70, 112, 120, 116, 168, 112); g.bezierCurveTo(210, 108, 260, 104, 304, 104); g.stroke();
  g.fillStyle = col(70, 70, 74);
  g.beginPath(); g.moveTo(40, 126); g.bezierCurveTo(80, 142, 130, 140, 166, 126); g.lineTo(168, 130); g.bezierCurveTo(130, 146, 76, 146, 38, 130); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(206, 128); g.bezierCurveTo(240, 138, 276, 132, 296, 120); g.lineTo(298, 124); g.bezierCurveTo(276, 138, 236, 142, 204, 132); g.closePath(); g.fill();
  if (!lit) {
    g.globalCompositeOperation = 'source-atop';
    const rim = g.createLinearGradient(0, 0, 0, h);
    rim.addColorStop(0, 'rgba(255,230,255,0.6)'); rim.addColorStop(0.35, 'rgba(255,255,255,0)');
    g.fillStyle = rim; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'source-over';
  }
  return c;
}

// 自販機 front panel (emissive). つめた〜い / あったか〜い.
export function vending() {
  const w = 200, h = 380, r = rng(130);
  const c = makeCanvas(w, h), g = c.getContext('2d');
  g.fillStyle = '#e8e8ea'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#c4202a'; g.fillRect(0, 0, w, 26);
  g.fillStyle = '#fff'; g.font = `700 15px ${GOTH}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('つめた〜い', w / 2, 14);
  const glow = g.createLinearGradient(0, 30, 0, 230);
  glow.addColorStop(0, '#fffef4'); glow.addColorStop(1, '#dfe8ff');
  g.fillStyle = glow; g.fillRect(10, 32, w - 20, 200);
  const cols = ['#c4202a', '#1f5fbf', '#f2c31b', '#2a9a4a', '#ff7aa8', '#111', '#e8e0c8', '#7a3cff'];
  for (let row = 0; row < 3; row++) for (let i = 0; i < 6; i++) {
    const x = 18 + i * 29, y = 42 + row * 64;
    g.fillStyle = cols[Math.floor(r() * cols.length)];
    g.beginPath(); g.roundRect ? g.roundRect(x, y + 6, 20, 40, 4) : g.rect(x, y + 6, 20, 40); g.fill();
    g.fillStyle = '#ccc'; g.fillRect(x + 6, y, 8, 7);
    g.fillStyle = row === 2 ? '#c4202a' : '#1f5fbf'; g.fillRect(x - 1, y + 50, 22, 9);
    g.fillStyle = '#fff'; g.font = `500 8px ${MONO}`; g.fillText('130', x + 10, y + 55);
  }
  g.fillStyle = '#1f5fbf'; g.fillRect(10, 236, w - 20, 16);
  g.fillStyle = '#fff'; g.font = `700 11px ${GOTH}`; g.fillText('あったか〜い は 冬だけ', w / 2, 244);
  g.fillStyle = '#2a2a30'; g.fillRect(24, 300, w - 48, 54);
  g.fillStyle = '#111'; g.fillRect(150, 262, 26, 30);
  g.fillStyle = '#d8ff3a'; g.fillRect(154, 266, 18, 6);
  return c;
}

// A hanging yellow station sign, slightly hacked: 会場 → (the venue).
export function exitSign() {
  const w = 560, h = 124;
  const c = makeCanvas(w, h), g = c.getContext('2d');
  g.fillStyle = '#f2c200'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#111'; g.fillRect(14, 16, 92, 92);
  g.fillStyle = '#f2c200'; g.font = `700 30px ${GOTH}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('H05', 60, 62);
  g.fillStyle = '#111'; g.textAlign = 'left';
  g.font = `700 58px ${GOTH}`; g.fillText('会場', 128, 54);
  g.font = `500 22px ${GOTH}`; g.fillText('Venue · 地下 vol.∞', 132, 98);
  g.lineWidth = 12; g.strokeStyle = '#111'; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(400, 62); g.lineTo(520, 62); g.moveTo(486, 28); g.lineTo(522, 62); g.lineTo(486, 96); g.stroke();
  // somebody's sticker
  g.save(); g.translate(352, 30); g.rotate(0.3);
  g.fillStyle = '#ff5ab4'; g.beginPath(); g.arc(0, 0, 18, 0, TAU); g.fill();
  g.fillStyle = '#fff'; g.font = `18px ${POP}`; g.textAlign = 'center'; g.fillText('∞', 0, 2);
  g.restore();
  return c;
}
