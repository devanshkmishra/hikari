// 6ch — 天気予報. A 1986 weather map of Japan; a band of rain drifts in from the west toward
// 夏ヶ原. 「今夜、雨。」 (It will: the ending begins with rain.)
import { F, DW, DH, wantFont, kickFonts, adopt, cached, stage, broadcast, gclock, txt, clamp, smooth, lerp, timeline, sub } from './common.js';
import { epiano, bass, flute, hat, pad } from './synth.js';

const PERIOD = 20;

wantFont(`22px ${F.dot}`, '天気予報ひかり放送今夜から明日朝にかけて夏ヶ原地方今夜、雨。降水確率夜明けまで朝最低気温℃傘を、わすれずに。札幌仙台金沢東京名古屋大阪広島福岡高低');
wantFont(`46px ${F.vt}`, '0123456789%°C');

// Coastlines (lon, lat), simplified by hand.
const HONSHU = [[130.9, 34.0], [130.9, 34.3], [131.6, 34.7], [132.4, 35.2], [133.1, 35.6], [134.2, 35.55], [135.3, 35.7], [135.9, 35.6], [136.1, 36.3], [136.7, 36.9], [136.75, 37.3], [137.35, 37.5], [137.0, 37.0], [137.4, 36.8], [138.2, 37.1], [138.9, 37.8], [139.5, 38.4], [139.8, 39.0], [140.0, 39.8], [140.0, 40.6], [140.3, 41.2], [140.8, 40.9], [141.2, 41.25], [141.5, 41.4], [141.4, 40.6], [141.9, 39.6], [141.6, 38.9], [141.0, 38.3], [140.95, 37.5], [140.6, 36.5], [140.85, 35.75], [140.4, 35.2], [139.85, 34.9], [139.85, 35.6], [139.6, 35.3], [139.1, 35.2], [138.85, 34.6], [138.75, 35.05], [138.2, 34.6], [137.2, 34.6], [136.9, 34.9], [136.6, 34.6], [136.9, 34.3], [136.0, 33.6], [135.8, 33.45], [135.1, 33.9], [135.4, 34.6], [134.7, 34.75], [133.9, 34.55], [133.3, 34.4], [132.5, 34.35], [131.9, 33.95], [131.2, 33.95]];
const SHIKOKU = [[133.0, 34.1], [134.0, 34.35], [134.6, 34.2], [134.7, 33.8], [134.25, 33.25], [133.6, 33.5], [133.0, 32.75], [132.5, 33.2], [132.0, 33.35], [132.7, 33.8]];
const KYUSHU = [[130.9, 33.9], [131.0, 33.6], [131.65, 33.6], [131.75, 33.3], [131.9, 33.0], [131.6, 32.3], [131.4, 31.5], [131.0, 31.0], [130.7, 31.0], [130.6, 31.5], [130.2, 31.3], [130.2, 32.0], [130.6, 32.6], [130.2, 32.7], [129.8, 32.7], [129.6, 33.2], [129.9, 33.5], [130.4, 33.6]];
const HOKKAIDO = [[140.0, 41.4], [140.2, 41.8], [140.7, 41.75], [141.1, 42.0], [140.5, 42.5], [141.0, 42.35], [141.6, 42.6], [142.5, 42.2], [143.3, 41.95], [143.6, 42.6], [144.4, 42.95], [145.5, 43.25], [145.3, 43.6], [145.0, 43.9], [145.3, 44.35], [144.3, 44.0], [143.2, 44.5], [142.0, 45.4], [141.65, 45.0], [141.8, 44.0], [141.3, 43.3], [140.4, 43.3], [140.0, 42.6], [139.9, 42.2]];
const SADO = [[138.25, 37.8], [138.5, 38.3], [138.55, 37.95], [138.35, 37.8]];

const K = 20.5, X0 = 262, Y0 = 70;
const px = (lon) => X0 + (lon - 129.4) * K;
const py = (lat) => Y0 + (45.6 - lat) * 1.24 * K;

const CITIES = [
  ['札幌', 141.35, 43.06, 'cloud'], ['仙台', 140.87, 38.27, 'cloud'], ['金沢', 136.65, 36.56, 'cloud'],
  ['東京', 139.69, 35.69, 'cloud'], ['名古屋', 136.91, 35.18, 'cloud'], ['大阪', 135.5, 34.69, 'cloud'],
  ['広島', 132.46, 34.4, 'cloud'], ['福岡', 130.4, 33.59, 'cloud'],
];
const HOME = [139.15, 37.15];

function landPath(x, pts) {
  x.beginPath();
  pts.forEach(([lo, la], i) => (i ? x.lineTo(px(lo), py(la)) : x.moveTo(px(lo), py(la))));
  x.closePath();
}

function buildBase(x) {
  const sea = x.createLinearGradient(0, 0, 0, DH);
  sea.addColorStop(0, '#0f3f86'); sea.addColorStop(1, '#0a2a62');
  x.fillStyle = sea; x.fillRect(0, 0, DW, DH);
  x.strokeStyle = 'rgba(160,200,255,0.12)'; x.lineWidth = 1;
  for (let lo = 128; lo <= 148; lo += 2) { x.beginPath(); x.moveTo(px(lo), 50); x.lineTo(px(lo), DH); x.stroke(); }
  for (let la = 30; la <= 46; la += 2) { x.beginPath(); x.moveTo(240, py(la)); x.lineTo(DW, py(la)); x.stroke(); }
  for (const pts of [HONSHU, SHIKOKU, KYUSHU, HOKKAIDO, SADO]) {
    landPath(x, pts);
    x.fillStyle = '#5f8f4e'; x.fill();
    x.strokeStyle = '#e9f2d8'; x.lineWidth = 2; x.lineJoin = 'round'; x.stroke();
  }
  // a hint of mountains down the spine
  x.fillStyle = 'rgba(160,140,80,0.35)';
  for (const [lo, la, r] of [[138.2, 36.2, 18], [137.6, 35.9, 14], [140.4, 39.2, 12], [139.7, 37.6, 10], [135.8, 34.2, 8]]) { x.beginPath(); x.ellipse(px(lo), py(la), r, r * 0.6, -0.6, 0, Math.PI * 2); x.fill(); }
  // high pressure over the Pacific
  txt(x, '高', px(144.6), py(32.9), { font: `30px ${F.dot}`, align: 'center', color: '#5ab0ff', stroke: '#ffffff', sw: 4 });

  // header
  x.fillStyle = '#0b1b45'; x.fillRect(0, 0, DW, 52);
  x.fillStyle = '#f2c230'; x.fillRect(0, 52, DW, 3);
  x.fillStyle = '#1e64c8'; x.fillRect(48, 10, 146, 34);
  txt(x, '天気予報', 121, 36, { font: `24px ${F.dot}`, align: 'center', color: '#ffffff' });
  txt(x, '今夜から明日朝にかけて', 210, 35, { font: `18px ${F.dot}`, color: '#d9e6ff' });
  txt(x, 'ひかり放送', 584, 35, { font: `16px ${F.dot}`, align: 'right', color: '#9fb4e6' });

  // left panel
  x.fillStyle = 'rgba(4,14,40,0.82)'; x.fillRect(40, 76, 214, 356);
  x.strokeStyle = 'rgba(242,194,48,0.8)'; x.lineWidth = 2; x.strokeRect(41, 77, 212, 354);
  txt(x, '夏ヶ原地方', 60, 112, { font: `22px ${F.dot}`, color: '#f2c230' });
  txt(x, '今夜、雨。', 58, 168, { font: `40px ${F.dot}`, color: '#ffffff', shadow: 'rgba(0,40,120,0.9)', sx: 3, sy: 3 });
  x.fillStyle = 'rgba(255,255,255,0.25)'; x.fillRect(58, 190, 178, 1);
  txt(x, '降水確率', 60, 220, { font: `18px ${F.dot}`, color: '#bcd0ff' });
  txt(x, '夜明けまで', 60, 262, { font: `16px ${F.dot}`, color: '#d9e6ff' });
  txt(x, '80%', 236, 266, { font: `46px ${F.vt}`, align: 'right', color: '#7fd0ff' });
  txt(x, '朝', 60, 304, { font: `16px ${F.dot}`, color: '#d9e6ff' });
  txt(x, '60%', 236, 308, { font: `46px ${F.vt}`, align: 'right', color: '#7fd0ff' });
  txt(x, '最低気温', 60, 346, { font: `16px ${F.dot}`, color: '#d9e6ff' });
  txt(x, '21℃', 236, 350, { font: `30px ${F.dot}`, align: 'right', color: '#ffd38a' });
  txt(x, '傘を、わすれずに。', 60, 404, { font: `18px ${F.dot}`, color: '#ffffff' });

  // city labels
  for (const [name, lo, la] of CITIES) {
    txt(x, name, px(lo) + 15, py(la) + 22, { font: `14px ${F.dot}`, color: '#ffffff', stroke: 'rgba(0,20,60,0.85)', sw: 3 });
  }
  txt(x, '夏ヶ原', px(HOME[0]) - 9, py(HOME[1]) + 5, { font: `15px ${F.dot}`, align: 'right', color: '#f2c230', stroke: 'rgba(0,20,60,0.9)', sw: 3 });
}

function buildRainTile(x) {
  x.strokeStyle = 'rgba(210,235,255,0.9)'; x.lineWidth = 1.6; x.lineCap = 'round';
  for (const [a, b] of [[3, 2], [11, 9], [5, 13]]) { x.beginPath(); x.moveTo(a + 2, b); x.lineTo(a - 1, b + 5); x.stroke(); }
}

function icon(x, kind, cx, cy, s = 1) {
  x.save(); x.translate(cx, cy); x.scale(s, s);
  if (kind === 'cloud' || kind === 'rain') {
    x.fillStyle = kind === 'rain' ? '#c9d3e2' : '#f2f4f8';
    x.beginPath(); x.arc(-6, 2, 7, 0, Math.PI * 2); x.arc(3, -2, 9, 0, Math.PI * 2); x.arc(10, 3, 6, 0, Math.PI * 2); x.fill();
    x.fillRect(-10, 2, 22, 7);
  }
  if (kind === 'rain') {
    // umbrella
    x.fillStyle = '#2f7bff';
    x.beginPath(); x.arc(3, 18, 10, Math.PI, 0); x.closePath(); x.fill();
    x.strokeStyle = '#2f7bff'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(3, 18); x.lineTo(3, 28); x.arc(0.5, 28, 2.5, 0, Math.PI); x.stroke();
  }
  x.restore();
}

// The rain band: blobs strung along a NNE–SSW axis, advancing west → east with a cold front.
const BLOBS = [[-3.2, -0.4, 1.0], [-2.0, 0.3, 1.3], [-0.9, -0.2, 1.5], [0.2, 0.4, 1.4], [1.3, -0.1, 1.2], [2.4, 0.3, 1.0], [3.3, -0.2, 0.8]];
const ANG = -1.1;
const AX = Math.cos(ANG), AY = Math.sin(ANG); // along the band (pointing NNE on screen)
const NX = -AY, NY = AX; // direction of travel (ESE)

let RAIN = null;
function drawWeather(x) {
  x.drawImage(cached('ch6:base', DW, DH, buildBase), 0, 0);
  const p = gclock() % PERIOD;
  const k = p / PERIOD;
  const cx = px(lerp(126.8, 142.6, k)), cy = py(lerp(32.8, 37.8, k));
  const fade = smooth(0, 1.2, p) * (1 - smooth(PERIOD - 1, PERIOD, p));
  const tile = cached('ch6:rain', 16, 18, buildRainTile, true);
  if (!RAIN) RAIN = x.createPattern(tile, 'repeat');

  const path = new Path2D();
  for (const [u, v, r] of BLOBS) {
    const bx = cx + AX * u * 30 + NX * v * 30, by = cy + AY * u * 30 + NY * v * 30;
    const rot = ANG + Math.PI / 2;
    path.moveTo(bx + Math.cos(rot) * r * 22, by + Math.sin(rot) * r * 22);
    path.ellipse(bx, by, r * 22, r * 36, rot, 0, Math.PI * 2);
  }
  x.save();
  x.beginPath(); x.rect(254, 56, DW - 254, DH - 56); x.clip();
  x.globalAlpha = 0.8 * fade;
  x.fillStyle = 'rgba(40,140,255,0.35)';
  x.fill(path);
  // rain marks drifting down through the band (pattern origin moves, the band does not)
  const drift = gclock() * 14;
  const ox = (-drift * 0.4) % 16, oy = drift % 18;
  x.translate(ox, oy);
  const shifted = new Path2D();
  shifted.addPath(path, new DOMMatrix([1, 0, 0, 1, -ox, -oy]));
  x.fillStyle = RAIN;
  x.fill(shifted);
  x.setTransform(1, 0, 0, 1, 0, 0);
  // cold front on the leading edge, 低 at its northern end
  x.globalAlpha = fade;
  const fx = cx + NX * 48, fy = cy + NY * 48;
  const f0 = [fx - AX * 130, fy - AY * 130], f1 = [fx + AX * 130, fy + AY * 130];
  x.strokeStyle = '#3a8bff'; x.lineWidth = 3;
  x.beginPath(); x.moveTo(f0[0], f0[1]); x.lineTo(f1[0], f1[1]); x.stroke();
  x.fillStyle = '#3a8bff';
  for (let i = 0; i < 6; i++) {
    const q = (i + 0.5) / 6;
    const tx = lerp(f0[0], f1[0], q), ty = lerp(f0[1], f1[1], q);
    x.beginPath(); x.moveTo(tx - AX * 7, ty - AY * 7); x.lineTo(tx + AX * 7, ty + AY * 7); x.lineTo(tx + NX * 11, ty + NY * 11); x.closePath(); x.fill();
  }
  txt(x, '低', f1[0] - 10, f1[1] - 6, { font: `28px ${F.dot}`, align: 'center', color: '#ff5a5a', stroke: '#ffffff', sw: 4 });
  x.restore();

  // city icons turn to umbrellas once the band reaches them
  for (const [, lo, la] of CITIES) {
    const dx = px(lo) - cx, dy = py(la) - cy;
    const dn = dx * NX + dy * NY, du = dx * AX + dy * AY;
    const wet = fade > 0.5 && dn < 50 && dn > -170 && Math.abs(du) < 160;
    icon(x, wet ? 'rain' : 'cloud', px(lo), py(la) - 2, 0.8);
  }
  // 夏ヶ原, blinking
  const hx = px(HOME[0]), hy = py(HOME[1]);
  const blink = 0.5 + 0.5 * Math.sin(gclock() * 4);
  x.fillStyle = `rgba(242,194,48,${0.4 + 0.6 * blink})`;
  x.beginPath(); x.arc(hx, hy, 5, 0, Math.PI * 2); x.fill();
  x.strokeStyle = '#fff'; x.lineWidth = 1.5; x.stroke();
}

// ---------- sound: a soft late-night forecast tune ----------
const BPM = 96, BEAT = 60 / BPM, BAR = BEAT * 4; // 2.5 s, 8 bars = 20 s
const CHORDS = [[46, [57, 62, 65, 69]], [45, [55, 60, 64, 67]], [43, [53, 58, 62, 65]], [41, [52, 57, 60, 64]],
  [46, [57, 62, 65, 69]], [45, [55, 60, 64, 67]], [43, [53, 58, 62, 65]], [48, [53, 58, 60, 64]]];
const MELODY = [[0, 0, 72, 1.5], [0, 1.5, 74, 0.5], [0, 2, 76, 2], [1, 0, 74, 1], [1, 1, 72, 1], [1, 2, 67, 2],
  [2, 0, 70, 1.5], [2, 1.5, 72, 0.5], [2, 2, 74, 1], [2, 3, 72, 1], [3, 0, 69, 4],
  [4, 0, 72, 1.5], [4, 1.5, 74, 0.5], [4, 2, 77, 2], [5, 0, 76, 1], [5, 1, 74, 1], [5, 2, 72, 2],
  [6, 0, 70, 1], [6, 1, 69, 1], [6, 2, 67, 2], [7, 0, 65, 3]];

function buildEvents() {
  const ev = [];
  const at = (t, fn) => ev.push({ t, fn });
  CHORDS.forEach(([root, vox], b) => {
    const t0 = b * BAR;
    // bossa-ish comp
    [[0, 1.4], [1.5, 0.9], [2.5, 1.2]].forEach(([beat, d]) => at(t0 + beat * BEAT, (e, w) => { for (const m of vox) epiano(e.A, e.bus, w, m, d * BEAT, 0.3); }));
    at(t0, (e, w) => bass(e.A, e.bus, w, root, BEAT * 1.4, 0.45));
    at(t0 + 1.5 * BEAT, (e, w) => bass(e.A, e.bus, w, root + 7, BEAT * 0.45, 0.35));
    at(t0 + 2 * BEAT, (e, w) => bass(e.A, e.bus, w, root + 7, BEAT * 1.4, 0.4));
    at(t0 + 3.5 * BEAT, (e, w) => bass(e.A, e.bus, w, root, BEAT * 0.45, 0.35));
    for (let s = 0; s < 8; s++) at(t0 + s * BEAT / 2, (e, w) => hat(e.A, e.bus, w, s % 2 ? 0.12 : 0.2));
    at(t0, (e, w) => pad(e.A, e.bus, w, vox.map((m) => m + 12), BAR * 0.9, 0.25, 1100, 0.6));
  });
  for (const [b, beat, m, d] of MELODY) at(b * BAR + beat * BEAT, (e, w) => flute(e.A, e.bus, w, m, d * BEAT * 0.92, 0.7));
  return ev;
}

let EVENTS = null;
export default {
  name: '天気予報',
  draw(g, t, W, H) {
    adopt(g); kickFonts();
    const x = stage();
    drawWeather(x);
    sub(x, ['WEATHER · Natsugahara: RAIN TONIGHT.', '80% until dawn, 60% morning. Low 21\u00b0C. Take an umbrella.'], 470);
    broadcast(g, W, H, { noise: 0.045, ghostA: 0.06 });
  },
  start(audio, dest) {
    if (!EVENTS) EVENTS = buildEvents();
    return timeline(audio, dest, { period: PERIOD, gain: 0.7, events: EVENTS.slice() });
  },
};
