// Printed and lit things inside the car: the 路線図, the 運賃表, the LED text, stickers,
// labels. All painted into canvases that become textures (and, enlarged, DOM views).
import { canvas2d, rng } from './gl.js';

export const LINE_COL = '#e6a23c';
const INK = '#1d1b19';
const SERIF = '"Noto Serif JP", "Hiragino Mincho ProN", serif';
const GOTHIC = '"Zen Kaku Gothic New", "Hiragino Sans", sans-serif';

function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

function paper(g, w, h, base = '#f3ede0', seed = 3, amt = 0.05) {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  const r = rng(seed);
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * 255 * amt;
    d[i] += n; d[i + 1] += n; d[i + 2] += n * 0.9;
  }
  g.putImageData(img, 0, 0);
  // age: yellowed edges
  const gr = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(150,110,40,0.16)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
}

// ── 路線図 ──────────────────────────────────────────────────────────────────
export const MAP = { W: 2048, H: 504, x0: 170, dx: 236, y: 236 };
export function mapStationX(i) { return MAP.x0 + i * MAP.dx; }

export function paintRouteMap(state, canvas) {
  const { line, terminus, endingReady, dest, here, en } = state;
  const W = MAP.W, H = MAP.H;
  const cv = canvas || canvas2d(W, H).c;
  const g = cv.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  paper(g, W, H, '#f6f1e4', 9, 0.035);
  // frame print
  g.strokeStyle = '#2b2a28'; g.lineWidth = 6; g.strokeRect(14, 14, W - 28, H - 28);
  g.strokeStyle = LINE_COL; g.lineWidth = 3; g.strokeRect(26, 26, W - 52, H - 52);
  // title
  g.fillStyle = INK; g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  if (en) {
    g.font = `600 52px "EB Garamond", serif`; g.fillText('The Hikari Line', 60, 98);
    g.font = `500 22px ${GOTHIC}`; g.fillStyle = '#5b5650';
    g.fillText('ひかり線  ·  route map', 420, 96);
  } else {
    g.font = `900 54px ${SERIF}`; g.fillText('ひかり線', 60, 98);
    g.font = `500 22px ${GOTHIC}`; g.fillStyle = '#5b5650';
    g.fillText('HIKARI LINE  ·  路線案内', 290, 96);
  }
  // legend: what the lights mean
  g.textAlign = 'right';
  g.font = `500 22px ${GOTHIC}`;
  g.fillText(en ? 'a light was found here' : '光の灯った駅', W - 70, 96);
  g.fillStyle = 'rgba(255,214,140,0.55)'; g.beginPath(); g.arc(W - 250 - 30, 89, 16, 0, 7); g.fill();
  g.fillStyle = '#fffaf0'; g.beginPath(); g.arc(W - 250 - 30, 89, 8, 0, 7); g.fill();

  const n = line.length;
  const xEnd = mapStationX(endingReady ? n : n - 1);
  // the line itself
  g.lineCap = 'round';
  g.strokeStyle = '#2b2a28'; g.lineWidth = 30;
  g.beginPath(); g.moveTo(mapStationX(0) - 40, MAP.y); g.lineTo(mapStationX(n - 1), MAP.y); g.stroke();
  g.strokeStyle = LINE_COL; g.lineWidth = 20;
  g.beginPath(); g.moveTo(mapStationX(0) - 40, MAP.y); g.lineTo(mapStationX(n - 1), MAP.y); g.stroke();
  if (endingReady) {
    // newly opened: a darker-blue night segment with stars
    const gr = g.createLinearGradient(mapStationX(n - 1), 0, xEnd, 0);
    gr.addColorStop(0, LINE_COL); gr.addColorStop(1, '#2b3f8f');
    g.strokeStyle = '#2b2a28'; g.lineWidth = 30;
    g.beginPath(); g.moveTo(mapStationX(n - 1), MAP.y); g.lineTo(xEnd, MAP.y); g.stroke();
    g.strokeStyle = gr; g.lineWidth = 20;
    g.beginPath(); g.moveTo(mapStationX(n - 1), MAP.y); g.lineTo(xEnd, MAP.y); g.stroke();
    g.fillStyle = '#fff6d8';
    const r = rng(77);
    for (let i = 0; i < 12; i++) { g.beginPath(); g.arc(mapStationX(n - 1) + 30 + r() * (xEnd - mapStationX(n - 1) - 60), MAP.y + (r() - 0.5) * 12, 1.5 + r() * 2, 0, 7); g.fill(); }
  } else {
    // the stub beyond the last station, covered with a sticker: still being built
    g.setLineDash([10, 12]);
    g.strokeStyle = 'rgba(43,42,40,0.35)'; g.lineWidth = 6;
    g.beginPath(); g.moveTo(mapStationX(n - 1) + 30, MAP.y); g.lineTo(mapStationX(n) + 20, MAP.y); g.stroke();
    g.setLineDash([]);
    g.save();
    g.translate(mapStationX(n) - 30, MAP.y + 4);
    g.rotate(-0.05);
    g.fillStyle = '#fbfaf6'; g.shadowColor = 'rgba(0,0,0,0.18)'; g.shadowBlur = 6; g.shadowOffsetY = 2;
    g.fillRect(en ? -140 : -120, -70, en ? 280 : 240, 140);
    g.shadowColor = 'transparent';
    g.strokeStyle = 'rgba(200,170,90,0.6)'; g.lineWidth = 12;
    g.beginPath(); g.moveTo(-120, -50); g.lineTo(-80, -70); g.moveTo(80, 70); g.lineTo(120, 50); g.stroke();
    g.fillStyle = '#6b655c'; g.textAlign = 'center';
    if (en) {
      g.font = `700 24px ${GOTHIC}`; g.fillText('Beyond here:', 0, -18);
      g.font = `700 23px ${GOTHIC}`; g.fillText('extension being built', 0, 20);
      g.font = `italic 400 18px "EB Garamond", serif`; g.fillText('please wait a little longer', 0, 50);
    } else {
      g.font = `700 26px ${GOTHIC}`; g.fillText('この先', 0, -18);
      g.font = `700 30px ${GOTHIC}`; g.fillText('延伸工事中', 0, 22);
      g.font = `400 16px ${GOTHIC}`; g.fillText('開業まで今しばらくお待ちください', 0, 52);
    }
    g.restore();
  }
  const all = endingReady ? [...line, { ...terminus, lit: false, visited: false, terminus: true }] : line;
  all.forEach((st, i) => {
    const x = mapStationX(i), y = MAP.y;
    const isDest = st.id === dest, isHere = st.id === here;
    // the lit halo printed under the glass orb
    if (st.lit) {
      const gr = g.createRadialGradient(x, y, 4, x, y, 60);
      gr.addColorStop(0, 'rgba(255,226,160,0.9)'); gr.addColorStop(1, 'rgba(255,226,160,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, 60, 0, 7); g.fill();
    }
    if (isDest) {
      g.strokeStyle = '#c8322b'; g.lineWidth = 6;
      g.beginPath(); g.arc(x, y, 38, 0, 7); g.stroke();
      g.fillStyle = '#c8322b';
      rr(g, x - (en ? 40 : 30), y - 104, en ? 80 : 60, 40, 8); g.fill();
      g.fillStyle = '#fff'; g.font = en ? `800 20px ${GOTHIC}` : `900 26px ${GOTHIC}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(en ? 'NEXT' : '次', x, y - 84);
      g.textBaseline = 'alphabetic';
    }
    g.fillStyle = st.terminus ? '#20294f' : '#ffffff';
    g.strokeStyle = '#2b2a28'; g.lineWidth = 7;
    g.beginPath(); g.arc(x, y, st.terminus ? 26 : 22, 0, 7); g.fill(); g.stroke();
    if (st.visited && !st.lit) { g.fillStyle = LINE_COL; g.beginPath(); g.arc(x, y, 10, 0, 7); g.fill(); }
    if (st.terminus) {
      g.fillStyle = '#fff6d8'; star(g, x, y, 13, 5.5);
    }
    // number badge
    g.fillStyle = '#ffffff'; g.strokeStyle = st.terminus ? '#20294f' : LINE_COL; g.lineWidth = 4;
    rr(g, x - 30, y - 60 - (isDest ? 0 : 0), 60, 0, 0);
    g.textAlign = 'center';
    // names
    g.fillStyle = INK;
    const jp = st.jp;
    if (en) {
      const name = st.en;
      g.font = `600 ${name.length > 11 ? 26 : 32}px "EB Garamond", serif`;
      g.fillText(name, x, y + 86);
      g.font = `500 22px ${SERIF}`; g.fillStyle = '#4a4640';
      g.fillText(jp, x, y + 124);
      g.font = `500 17px ${GOTHIC}`; g.fillStyle = '#6b665e';
      g.fillText(st.kana, x, y + 152);
    } else {
      const size = [...jp].length >= 4 ? 44 : 50;
      g.font = `700 ${size}px ${SERIF}`;
      g.fillText(jp, x, y + 92);
      g.font = `500 21px ${GOTHIC}`; g.fillStyle = '#4a4640';
      g.fillText(st.kana, x, y + 126);
      g.font = `italic 400 20px "EB Garamond", serif`; g.fillStyle = '#6b665e';
      g.fillText(st.en.replace(' 1985', ''), x, y + 154);
    }
    // station number tag
    g.font = `700 19px ${GOTHIC}`;
    const tag = st.no;
    g.fillStyle = st.terminus ? '#20294f' : LINE_COL;
    rr(g, x - 30, y + 168, 60, 28, 6); g.fill();
    g.fillStyle = '#fff'; g.fillText(tag, x, y + 189);
    if (isHere) {
      g.fillStyle = '#2b2a28'; g.font = `700 18px ${GOTHIC}`;
      g.fillText(en ? 'here' : 'いま', x, y - 46);
    }
  });
  if (endingReady) {
    // a red ribbon: newly opened
    const x = mapStationX(n) - 4;
    g.save();
    g.translate(x + 70, 92);
    g.rotate(0.08);
    g.fillStyle = '#c8322b';
    g.fillRect(-120, -34, 240, 62);
    g.beginPath(); g.moveTo(-120, -34); g.lineTo(-140, -3); g.lineTo(-120, 28); g.fill();
    g.beginPath(); g.moveTo(120, -34); g.lineTo(140, -3); g.lineTo(120, 28); g.fill();
    g.fillStyle = '#fff6e6'; g.font = en ? `600 30px "EB Garamond", serif` : `900 36px ${SERIF}`; g.textAlign = 'center';
    g.fillText(en ? 'Now open!' : '祝 延伸開業', 0, 10);
    g.restore();
  }
  return cv;
}

function star(g, x, y, R, r) {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? r : R;
    g.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  g.closePath(); g.fill();
}

// ── 運賃表 ──────────────────────────────────────────────────────────────────
export const FARE = { W: 2048, H: 268 };
export function fare(a, b) { return 120 + 40 * Math.abs(a - b) + (Math.abs(a - b) > 3 ? 20 : 0); }

function seg7(g, ch, x, y, w, h, on, off) {
  // seven-segment digit; segments a b c d e f g
  const map = { '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc', '5': 'afgcd', '6': 'afgedc', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg', '-': 'g', ' ': '' };
  const lit = map[ch] ?? '';
  const t = w * 0.18;
  const segs = {
    a: [x + t, y, w - 2 * t, t, 'h'], d: [x + t, y + h - t, w - 2 * t, t, 'h'], g: [x + t, y + h / 2 - t / 2, w - 2 * t, t, 'h'],
    f: [x, y + t * 0.6, t, h / 2 - t * 0.9, 'v'], b: [x + w - t, y + t * 0.6, t, h / 2 - t * 0.9, 'v'],
    e: [x, y + h / 2 + t * 0.3, t, h / 2 - t * 0.9, 'v'], c: [x + w - t, y + h / 2 + t * 0.3, t, h / 2 - t * 0.9, 'v'],
  };
  for (const k of 'abcdefg') {
    const [sx, sy, sw, sh, o] = segs[k];
    g.fillStyle = lit.includes(k) ? on : off;
    g.beginPath();
    if (o === 'h') { g.moveTo(sx, sy + sh / 2); g.lineTo(sx + sh / 2, sy); g.lineTo(sx + sw - sh / 2, sy); g.lineTo(sx + sw, sy + sh / 2); g.lineTo(sx + sw - sh / 2, sy + sh); g.lineTo(sx + sh / 2, sy + sh); }
    else { g.moveTo(sx + sw / 2, sy); g.lineTo(sx + sw, sy + sw / 2); g.lineTo(sx + sw, sy + sh - sw / 2); g.lineTo(sx + sw / 2, sy + sh); g.lineTo(sx, sy + sh - sw / 2); g.lineTo(sx, sy + sw / 2); }
    g.closePath(); g.fill();
  }
}

export function paintFareBoard({ line, destIndex, destName, terminus, clock }, canvas) {
  const W = FARE.W, H = FARE.H;
  const cv = canvas || canvas2d(W, H).c;
  const g = cv.getContext('2d');
  g.fillStyle = '#0b0b0c'; g.fillRect(0, 0, W, H);
  // header block
  g.fillStyle = '#1b3a2c'; g.fillRect(12, 12, 230, H - 24);
  g.fillStyle = '#e9e4d6'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `900 52px ${SERIF}`; g.fillText('運賃表', 127, 78);
  g.font = `500 22px ${GOTHIC}`; g.fillText('整理券番号', 127, 150);
  g.fillText('運　賃', 127, 212);
  const cols = 8, cx0 = 256, cw = 156;
  for (let i = 0; i < cols; i++) {
    const x = cx0 + i * cw;
    g.fillStyle = '#1a1a1c'; g.fillRect(x + 4, 120, cw - 8, 58);
    g.fillStyle = '#e9e4d6'; g.font = `700 38px ${GOTHIC}`;
    g.fillText(i < 7 ? String(i + 1) : '券なし', x + cw / 2, 151);
    g.fillStyle = '#120806'; g.fillRect(x + 4, 184, cw - 8, 70);
    if (terminus) {
      for (let k = 0; k < 3; k++) seg7(g, '-', x + 18 + k * 34, 194, 26, 50, '#ff9a2a', 'rgba(255,120,30,0.07)');
    } else {
      const f = i < 7 ? fare(i, destIndex) : fare(0, destIndex) + 60;
      const s = String(f).padStart(4, ' ');
      for (let k = 0; k < 4; k++) seg7(g, s[k], x + 10 + k * 30, 194, 24, 50, '#ff9a2a', 'rgba(255,120,30,0.07)');
    }
    g.fillStyle = '#c9c2b0'; g.font = `500 20px ${GOTHIC}`; g.fillText('円', x + cw - 20, 236);
  }
  // header row across the top: next stop
  g.textAlign = 'left';
  g.fillStyle = '#e9e4d6'; g.font = `500 26px ${GOTHIC}`;
  g.fillText(terminus ? '終点' : '次は', cx0 + 10, 60);
  g.font = `900 52px ${SERIF}`; g.fillStyle = '#fff4dc';
  g.fillText(destName || '', cx0 + (terminus ? 80 : 80), 62);
  g.textAlign = 'right';
  g.font = `500 24px ${GOTHIC}`; g.fillStyle = '#bdb6a6';
  g.fillText(terminus ? '本日の運賃は、いただきません。' : 'ワンマン　整理券をお取りください', W - 30, 44);
  if (clock) { g.font = `700 34px "IBM Plex Mono", monospace`; g.fillStyle = '#ff9a2a'; g.fillText(clock, W - 30, 92); }
  return cv;
}

// ── LED text (1 texel = 1 dot, 16 dots tall) ────────────────────────────────
export const LED_ROWS = 16, LED_COLS = 160;
export const LEDC = { amber: '#ffae2a', red: '#ff3b26', green: '#7dff4a', white: '#ffe9c8' };
export function paintLED(spans, canvas) {
  // spans: [[text, colour], ...]
  const probe = canvas2d(4, 4).g;
  probe.font = '16px "DotGothic16", monospace';
  let w = 0;
  for (const [t] of spans) w += Math.ceil(probe.measureText(t).width);
  const pad = LED_COLS;
  const W = Math.max(LED_COLS, w + 6);
  const scroll = w > LED_COLS - 4;
  const TW = scroll ? w + pad : LED_COLS;
  const cv = canvas2d(TW, LED_ROWS).c;
  const g = cv.getContext('2d');
  g.clearRect(0, 0, TW, LED_ROWS);
  g.font = '16px "DotGothic16", monospace';
  g.textBaseline = 'top';
  let x = scroll ? 0 : Math.floor((LED_COLS - w) / 2);
  for (const [t, c] of spans) { g.fillStyle = c; g.fillText(t, x, 0); x += Math.ceil(g.measureText(t).width); }
  // binarise alpha so dots are fully on or off
  const img = g.getImageData(0, 0, TW, LED_ROWS);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const on = d[i + 3] > 90;
    d[i + 3] = on ? 255 : 0;
    if (on) { const m = 255 / Math.max(1, d[i + 3]); }
  }
  g.putImageData(img, 0, 0);
  return { canvas: cv, width: TW, scroll, textW: w };
}

// ── stickers, plates, labels ────────────────────────────────────────────────
export function paintDoorSticker() {
  const { c, g } = canvas2d(512, 384);
  g.clearRect(0, 0, 512, 384);
  g.fillStyle = '#ffd21f';
  rr(g, 8, 8, 496, 368, 38); g.fill();
  g.strokeStyle = '#1b1b1b'; g.lineWidth = 6; rr(g, 18, 18, 476, 348, 30); g.stroke();
  // pictogram: a door edge, a little paw too close to it
  g.save(); g.translate(130, 170);
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(0, 0, 100, 0, 7); g.fill();
  g.strokeStyle = '#d42a24'; g.lineWidth = 14; g.beginPath(); g.arc(0, 0, 100, 0, 7); g.stroke();
  g.fillStyle = '#4a4a4a'; g.fillRect(10, -80, 52, 160);
  g.fillStyle = '#1b1b1b'; g.fillRect(4, -80, 8, 160);
  // the cat, worried
  g.fillStyle = '#f2efe6'; g.strokeStyle = '#1b1b1b'; g.lineWidth = 5;
  g.beginPath(); g.ellipse(-36, 6, 44, 38, 0, 0, 7); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(-70, -18); g.lineTo(-64, -50); g.lineTo(-46, -28); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(-26, -30); g.lineTo(-10, -50); g.lineTo(-4, -16); g.fill(); g.stroke();
  g.fillStyle = '#1b1b1b';
  g.beginPath(); g.arc(-50, 2, 4, 0, 7); g.fill(); g.beginPath(); g.arc(-24, 2, 4, 0, 7); g.fill();
  g.beginPath(); g.moveTo(-44, 20); g.quadraticCurveTo(-37, 14, -30, 20); g.stroke();
  g.fillStyle = '#7fc3ff'; g.beginPath(); g.ellipse(-60, 16, 4, 7, 0, 0, 7); g.fill();
  // paw reaching the gap
  g.fillStyle = '#f2efe6';
  g.beginPath(); g.ellipse(4, 30, 16, 12, 0.3, 0, 7); g.fill(); g.stroke();
  g.restore();
  g.fillStyle = '#d42a24'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `900 64px ${GOTHIC}`;
  g.fillText('ドアに', 360, 130);
  g.fillText('注意', 360, 205);
  g.fillStyle = '#1b1b1b'; g.font = `700 24px ${GOTHIC}`;
  g.fillText('手や指を', 360, 268);
  g.fillText('はさまれないように', 360, 300);
  g.fillText('ご注意ください', 360, 332);
  return c;
}

export function paintCatSticker() {
  const { c, g } = canvas2d(256, 256);
  g.clearRect(0, 0, 256, 256);
  // a little sleeping cat, slightly peeling at one corner
  g.save(); g.translate(128, 140);
  g.fillStyle = '#fbf6ea'; g.strokeStyle = '#2b2522'; g.lineWidth = 7;
  g.beginPath(); g.ellipse(0, 10, 92, 62, 0, 0, 7); g.fill(); g.stroke();
  g.beginPath(); g.ellipse(-52, -12, 44, 40, 0, 0, 7); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(-86, -30); g.lineTo(-84, -70); g.lineTo(-58, -48); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(-36, -50); g.lineTo(-22, -82); g.lineTo(-12, -40); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#fbf6ea';
  g.beginPath(); g.ellipse(-52, -12, 40, 36, 0, 0, 7); g.fill();
  g.strokeStyle = '#2b2522'; g.lineWidth = 5;
  g.beginPath(); g.arc(-66, -12, 9, 0.2, Math.PI - 0.2); g.stroke();
  g.beginPath(); g.arc(-38, -12, 9, 0.2, Math.PI - 0.2); g.stroke();
  g.fillStyle = '#f2a0a8'; g.beginPath(); g.ellipse(-52, 2, 5, 3.5, 0, 0, 7); g.fill();
  g.strokeStyle = '#2b2522'; g.lineWidth = 7;
  g.beginPath(); g.moveTo(88, 10); g.quadraticCurveTo(110, 60, 40, 66); g.stroke();
  g.fillStyle = '#e8a43a'; g.beginPath(); g.ellipse(30, -14, 22, 12, -0.3, 0, 7); g.fill();
  g.restore();
  // the peeled corner
  g.fillStyle = 'rgba(255,255,255,0.0)';
  g.globalCompositeOperation = 'destination-out';
  g.beginPath(); g.moveTo(256, 220); g.lineTo(256, 256); g.lineTo(220, 256); g.fill();
  g.globalCompositeOperation = 'source-over';
  g.fillStyle = '#e9e2d0';
  g.beginPath(); g.moveTo(256, 220); g.lineTo(226, 226); g.lineTo(220, 256); g.fill();
  return c;
}

export function paintTicketFace(no = '1', lamp = true) {
  const { c, g } = canvas2d(512, 448);
  g.fillStyle = '#9aa1a4'; g.fillRect(0, 0, 512, 448);
  g.fillStyle = '#868d90'; g.fillRect(0, 0, 512, 22);
  g.fillStyle = '#244a8a'; rr(g, 46, 40, 420, 96, 12); g.fill();
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `900 66px ${GOTHIC}`; g.fillText('整理券', 256, 90);
  g.fillStyle = '#161718'; rr(g, 120, 190, 272, 34, 8); g.fill();
  g.fillStyle = '#f4f1e8'; g.fillRect(166, 200, 180, 16);
  g.fillStyle = '#1d1d1d'; g.font = `700 26px ${GOTHIC}`; g.fillText('お取りください', 256, 268);
  g.fillStyle = lamp ? '#ff4a2e' : '#5a2a22'; g.beginPath(); g.arc(256, 330, 22, 0, 7); g.fill();
  g.fillStyle = '#121212'; rr(g, 186, 372, 140, 56, 8); g.fill();
  seg7(g, no, 236, 380, 22, 40, '#ff9a2a', 'rgba(255,120,30,0.08)');
  seg7(g, ' ', 266, 380, 22, 40, '#ff9a2a', 'rgba(255,120,30,0.08)');
  return c;
}

export function paintPlate(text, w = 512, h = 128, bg = '#2a3b5a', fg = '#f4f1e8') {
  const { c, g } = canvas2d(w, h);
  g.fillStyle = bg; rr(g, 0, 0, w, h, 10); g.fill();
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `700 ${Math.round(h * 0.5)}px ${GOTHIC}`;
  g.fillText(text, w / 2, h / 2);
  return c;
}

export function paintButtonLamp() {
  const { c, g } = canvas2d(256, 160);
  g.fillStyle = '#2a0a08'; rr(g, 0, 0, 256, 160, 22); g.fill();
  g.fillStyle = '#ff4630'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `900 52px ${GOTHIC}`; g.fillText('とまります', 128, 66);
  g.font = `700 20px ${GOTHIC}`; g.fillStyle = '#ffb2a6'; g.fillText('つぎ　停車', 128, 124);
  return c;
}

export function paintCanLabel() {
  const { c, g } = canvas2d(512, 256);
  // 黄昏珈琲 微糖 — a 1980s can: brown, cream, a sunset band
  g.fillStyle = '#4a2a1a'; g.fillRect(0, 0, 512, 256);
  const gr = g.createLinearGradient(0, 70, 0, 186);
  gr.addColorStop(0, '#f2c27a'); gr.addColorStop(0.5, '#e98b3a'); gr.addColorStop(1, '#b84a2a');
  g.fillStyle = gr; g.fillRect(0, 70, 512, 116);
  g.fillStyle = '#f6ecd6'; g.fillRect(0, 60, 512, 8); g.fillRect(0, 188, 512, 8);
  for (const ox of [0, 256]) {
    g.fillStyle = '#4a2a1a';
    g.font = `900 46px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.save(); g.translate(ox + 128, 128); g.scale(1, 1.2); g.fillText('黄昏珈琲', 0, 0); g.restore();
    g.fillStyle = '#f6ecd6'; g.font = `700 22px "Anton", sans-serif`;
    g.fillText('COFFEE', ox + 128, 34);
    g.font = `700 22px ${GOTHIC}`; g.fillText('微糖', ox + 128, 222);
  }
  return c;
}

export function paintBookCover() {
  // a bookstore paper cover: kraft, stamped with the shop's name over and over
  const { c, g } = canvas2d(512, 720);
  paper(g, 512, 720, '#d8c49c', 51, 0.07);
  g.fillStyle = 'rgba(120,80,40,0.28)';
  g.font = `700 30px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let y = 40; y < 720; y += 92) for (let x = 0; x < 600; x += 170) {
    g.save(); g.translate(x + ((y / 92) % 2) * 85, y); g.rotate(-0.2);
    g.fillText('ひかり書店', 0, 0);
    g.restore();
  }
  g.strokeStyle = 'rgba(120,80,40,0.35)'; g.lineWidth = 3;
  g.strokeRect(30, 30, 452, 660);
  return c;
}
