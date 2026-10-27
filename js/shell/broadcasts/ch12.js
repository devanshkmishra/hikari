// 12ch — 「夏ヶ原駅 ライブカメラ」. A fixed, low-resolution camera on an empty rural platform at
// night: one platform lamp with moths, a vending machine glowing, frogs in the fields, the
// timestamp ticking. Stay ~20 s and it starts to call you: the lamp falters, a crossing far
// down the line begins to ring, a headlight appears where the rails meet. `beckon` → 1.
import { F, DW, DH, wantFont, kickFonts, adopt, cached, stage, broadcast, gclock, wall, pad2, txt, glowSprite, clamp, smooth, lerp, hash, mk, randomTile, timeline, DATE, sub } from './common.js';
import { strike, whoosh, makeDelay } from './synth.js';

const LW = 200, LH = 150;           // the camera's own resolution
const VX = 132, VY = 70, S = 80;     // vanishing point, projection scale
const PY = 0.8;                      // platform surface (camera height = 1 above the rails' ground)
const P3 = (X, Y, d) => [VX + (X * S) / d, VY + (Y * S) / d];
const LAMP = [101, 63.5];

wantFont(`22px ${F.dot}`, '夏ヶ原駅ライブカメラ下り1番線');
wantFont(`28px ${F.vt}`, '0123456789-: CAM');

const BECKON_START = 18, BECKON_LEN = 14;

function poly(x, pts, fill) {
  x.fillStyle = fill;
  x.beginPath();
  pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b)));
  x.closePath(); x.fill();
}

// ---------- the scene, unlit (vending machine on, platform lamp off) ----------
function buildBase(x) {
  const sky = x.createLinearGradient(0, 0, 0, VY);
  sky.addColorStop(0, '#090e11'); sky.addColorStop(1, '#162024');
  x.fillStyle = sky; x.fillRect(0, 0, LW, VY + 2);
  const town = x.createRadialGradient(186, VY, 2, 186, VY, 70);
  town.addColorStop(0, 'rgba(70,72,58,0.55)'); town.addColorStop(1, 'rgba(70,72,58,0)');
  x.fillStyle = town; x.fillRect(100, 0, 100, VY + 2);
  // low cloud texture
  x.fillStyle = 'rgba(160,180,180,0.035)';
  for (let i = 0; i < 26; i++) { x.beginPath(); x.ellipse(hash(i) * 220 - 10, 8 + hash(i + 4) * 44, 20 + hash(i + 8) * 30, 3 + hash(i + 2) * 4, 0, 0, Math.PI * 2); x.fill(); }
  // hills
  x.fillStyle = '#070a0b';
  x.beginPath(); x.moveTo(0, VY + 1);
  for (let i = 0; i <= 20; i++) x.lineTo(i * 10, VY - 6 - 7 * Math.sin(i * 0.7) * Math.sin(i * 0.23 + 1) - hash(i) * 3);
  x.lineTo(LW, VY + 1); x.closePath(); x.fill();
  // ground
  x.fillStyle = '#0b100e'; x.fillRect(0, VY, LW, LH - VY);
  // paddies right of the track: faint sky sheen
  x.fillStyle = 'rgba(120,140,140,0.06)';
  for (let k = 0; k < 9; k++) { const d = 1.4 + k * 1.2; const [, y] = P3(0, 1, d); x.fillRect(VX + 6, y, LW, Math.max(0.6, 2.2 / d)); }
  // distant house lights
  for (const [hx, hy, a] of [[160, 71.5, 0.8], [177, 71, 0.6], [189, 72.5, 0.5], [151, 70.6, 0.4]]) { x.fillStyle = `rgba(255,214,150,${a})`; x.fillRect(hx, hy, 1, 1); }
  // ballast
  poly(x, [P3(-0.42, 1, 0.8), P3(0.12, 1, 0.8), P3(0.12, 1, 80), P3(-0.42, 1, 80)], '#121613');
  // sleepers
  for (let k = 0; k < 70; k++) {
    const d = 0.95 + k * 0.16;
    const [a, y] = P3(-0.33, 1, d), [b] = P3(0.0, 1, d);
    x.fillStyle = `rgba(30,32,30,${clamp(1.2 - k / 70)})`;
    x.fillRect(a, y, b - a, Math.max(0.5, 2.4 / d));
  }
  // rails
  x.strokeStyle = '#22282a'; x.lineWidth = 0.8;
  for (const X of [-0.27, -0.06]) { const [a, b] = P3(X, 1, 0.9); x.beginPath(); x.moveTo(a, b); x.lineTo(VX + (X * S) / 120, VY + S / 120); x.stroke(); }
  // utility poles + wires on the right
  const tops = [];
  for (let k = 0; k < 7; k++) {
    const d = 1.2 + k * 2.1;
    const [px, base] = P3(0.55, 1, d), [, top] = P3(0.55, -1.0, d);
    const w = Math.max(0.7, 3.4 / d);
    x.fillStyle = '#0d1112'; x.fillRect(px - w / 2, top, w, base - top);
    x.fillRect(px - 7 / d, top + 3 / d, 14 / d, Math.max(0.6, 1.2 / d));
    tops.push([px, top + 3 / d, d]);
  }
  x.strokeStyle = 'rgba(30,38,40,0.9)'; x.lineWidth = 0.6;
  for (const off of [-5, 5]) {
    x.beginPath();
    for (let k = 0; k < tops.length - 1; k++) {
      const [a, b, d] = tops[k], [c, e, d2] = tops[k + 1];
      x.moveTo(a + off / d, b); x.quadraticCurveTo((a + c) / 2 + off / ((d + d2) / 2), (b + e) / 2 + 6 / d, c + off / d2, e);
    }
    x.stroke();
  }
  // platform: edge face, surface, edge line
  poly(x, [P3(-0.42, PY, 0.8), P3(-0.42, PY, 9), P3(-0.42, 1, 9), P3(-0.42, 1, 0.8)], '#0e1212');
  poly(x, [P3(-1.6, PY, 0.8), P3(-0.42, PY, 0.8), P3(-0.42, PY, 9), P3(-1.6, PY, 9)], '#191d1d');
  poly(x, [P3(-0.5, PY, 0.8), P3(-0.46, PY, 0.8), P3(-0.46, PY, 9), P3(-0.5, PY, 9)], '#4a4f4a');
  // the far end of the platform: a low ramp
  poly(x, [P3(-1.6, PY, 9), P3(-0.42, PY, 9), P3(-0.42, 1, 11), P3(-1.6, 1, 11)], '#141818');
  // fence at the back, bushes behind it
  x.fillStyle = '#080c0b';
  for (let i = 0; i < 18; i++) { const d = 1.1 + i * 0.55; const [bx, by] = P3(-1.75, 0.45, d); x.beginPath(); x.ellipse(bx, by, 9 / d + 3, 6 / d + 2, 0, 0, Math.PI * 2); x.fill(); }
  x.strokeStyle = '#2a302e'; x.lineWidth = 0.7;
  { const [a, b] = P3(-1.6, PY - 0.2, 1.0), [c, e] = P3(-1.6, PY - 0.2, 9); x.beginPath(); x.moveTo(a, b); x.lineTo(c, e); x.stroke(); }
  for (let i = 0; i < 16; i++) { const d = 1.0 + i * 0.5; const [a, b] = P3(-1.6, PY - 0.2, d), [, e] = P3(-1.6, PY, d); x.beginPath(); x.moveTo(a, b); x.lineTo(a, e); x.stroke(); }
  // waiting shelter with one dim window
  poly(x, [P3(-1.55, 0.3, 4), P3(-1.1, 0.3, 4), P3(-1.1, 0.3, 5.6), P3(-1.55, 0.3, 5.6)], '#161a1a');
  poly(x, [P3(-1.1, 0.3, 4), P3(-1.1, 0.3, 5.6), P3(-1.1, PY, 5.6), P3(-1.1, PY, 4)], '#121616');
  poly(x, [P3(-1.1, 0.42, 4.5), P3(-1.1, 0.42, 5.1), P3(-1.1, 0.6, 5.1), P3(-1.1, 0.6, 4.5)], 'rgba(170,150,100,0.55)');
  // 駅名標: white board on two posts, too far to read, unmistakable anyway
  for (const X of [-1.22, -0.8]) { const [a, b] = P3(X, 0.6, 3.4), [, c] = P3(X, PY, 3.4); x.fillStyle = '#151a1a'; x.fillRect(a - 0.4, b, 0.8, c - b); }
  poly(x, [P3(-1.28, 0.44, 3.4), P3(-0.74, 0.44, 3.4), P3(-0.74, 0.6, 3.4), P3(-1.28, 0.6, 3.4)], '#5c6460');
  poly(x, [P3(-1.28, 0.53, 3.4), P3(-0.74, 0.53, 3.4), P3(-0.74, 0.545, 3.4), P3(-1.28, 0.545, 3.4)], '#2a4f3a');
  // bench (back of the platform)
  poly(x, [P3(-1.38, 0.7, 2.4), P3(-1.2, 0.7, 2.4), P3(-1.2, 0.7, 3.1), P3(-1.38, 0.7, 3.1)], '#262b2a');
  poly(x, [P3(-1.4, 0.55, 2.4), P3(-1.4, 0.55, 3.1), P3(-1.4, 0.7, 3.1), P3(-1.4, 0.7, 2.4)], '#1d2221');
  // lamp pole + fixture (off)
  { const [a, b] = P3(-1.0, PY, 2.0), [, c] = P3(-1.0, -0.2, 2.0); x.fillStyle = '#1b2020'; x.fillRect(a - 1, c, 2, b - c); x.fillRect(a, c, 10, 1.2); }
  x.fillStyle = '#3a403e'; x.fillRect(LAMP[0] - 4, LAMP[1] - 1.5, 8, 1.6);
  // vending machine: top, side (facing you), front (facing the track) glowing
  poly(x, [P3(-1.6, 0.43, 1.15), P3(-1.3, 0.43, 1.15), P3(-1.3, 0.43, 1.45), P3(-1.6, 0.43, 1.45)], '#30383c');
  poly(x, [P3(-1.6, 0.43, 1.15), P3(-1.3, 0.43, 1.15), P3(-1.3, PY, 1.15), P3(-1.6, PY, 1.15)], '#273236');
  poly(x, [P3(-1.33, 0.43, 1.15), P3(-1.3, 0.43, 1.15), P3(-1.3, PY, 1.15), P3(-1.33, PY, 1.15)], '#5d7078');
  poly(x, [P3(-1.3, 0.43, 1.15), P3(-1.3, 0.43, 1.45), P3(-1.3, PY, 1.45), P3(-1.3, PY, 1.15)], '#6f8088');
  poly(x, [P3(-1.3, 0.45, 1.17), P3(-1.3, 0.45, 1.43), P3(-1.3, 0.63, 1.43), P3(-1.3, 0.63, 1.17)], '#e3eef3');
  // display rows of cans (tiny coloured dots) in the upper part of the front face
  const cols = ['#d33', '#36c', '#eb3', '#3a5', '#e70', '#c3c'];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) {
    const d = lerp(1.18, 1.42, c / 5), Y = 0.48 + r * 0.045;
    const [a, b] = P3(-1.3, Y, d);
    x.fillStyle = cols[(r * 2 + c) % cols.length]; x.fillRect(a, b, Math.max(0.8, 2.2 / d), Math.max(0.8, 2.6 / d));
  }
  poly(x, [P3(-1.3, 0.66, 1.36), P3(-1.3, 0.66, 1.42), P3(-1.3, 0.7, 1.42), P3(-1.3, 0.7, 1.36)], '#c8f0ff');
  poly(x, [P3(-1.3, 0.73, 1.2), P3(-1.3, 0.73, 1.38), P3(-1.3, 0.77, 1.38), P3(-1.3, 0.77, 1.2)], '#1a2226');
  // glow spilling onto the platform
  x.save();
  x.globalCompositeOperation = 'lighter';
  const [gx, gy] = P3(-1.1, PY, 1.32);
  x.translate(gx, gy); x.scale(1, 0.32);
  const sp = x.createRadialGradient(0, 0, 1, 0, 0, 34);
  sp.addColorStop(0, 'rgba(150,190,205,0.42)'); sp.addColorStop(1, 'rgba(150,190,205,0)');
  x.fillStyle = sp; x.beginPath(); x.arc(0, 0, 34, 0, Math.PI * 2); x.fill();
  x.restore();
  x.save();
  x.globalCompositeOperation = 'lighter';
  const halo = x.createRadialGradient(52, 108, 2, 52, 108, 30);
  halo.addColorStop(0, 'rgba(170,210,225,0.25)'); halo.addColorStop(1, 'rgba(170,210,225,0)');
  x.fillStyle = halo; x.fillRect(20, 78, 64, 60);
  x.restore();
}

// ---------- what the platform lamp adds when it is on ----------
function buildLit(x) {
  x.globalCompositeOperation = 'lighter';
  // pool of light on the platform
  x.save();
  const [cx, cy] = P3(-0.85, PY, 2.0);
  x.translate(cx, cy); x.scale(1.4, 0.42);
  const pool = x.createRadialGradient(0, 0, 1, 0, 0, 34);
  pool.addColorStop(0, 'rgba(150,170,150,0.55)'); pool.addColorStop(0.5, 'rgba(110,130,115,0.22)'); pool.addColorStop(1, 'rgba(90,110,100,0)');
  x.fillStyle = pool; x.beginPath(); x.arc(0, 0, 34, 0, Math.PI * 2); x.fill();
  x.restore();
  // edge line catching it
  x.strokeStyle = 'rgba(190,200,185,0.45)'; x.lineWidth = 1;
  { const [a, b] = P3(-0.48, PY, 1.4), [c, d] = P3(-0.48, PY, 3.4); x.beginPath(); x.moveTo(a, b); x.lineTo(c, d); x.stroke(); }
  // rails glinting near the lamp
  x.strokeStyle = 'rgba(170,185,175,0.25)';
  for (const X of [-0.27, -0.06]) { const [a, b] = P3(X, 1, 1.6), [c, d] = P3(X, 1, 3.2); x.beginPath(); x.moveTo(a, b); x.lineTo(c, d); x.stroke(); }
  // the name board lit
  poly(x, [P3(-1.28, 0.44, 3.4), P3(-0.74, 0.44, 3.4), P3(-0.74, 0.6, 3.4), P3(-1.28, 0.6, 3.4)], 'rgba(150,165,150,0.45)');
  // pole, bench, fence lit sides
  { const [a, b] = P3(-1.0, PY, 2.0), [, c] = P3(-1.0, -0.2, 2.0); x.fillStyle = 'rgba(120,135,125,0.45)'; x.fillRect(a, c + 2, 1, b - c - 2); }
  poly(x, [P3(-1.38, 0.7, 2.4), P3(-1.2, 0.7, 2.4), P3(-1.2, 0.7, 3.1), P3(-1.38, 0.7, 3.1)], 'rgba(110,125,115,0.4)');
  // the tube and its halo
  x.fillStyle = 'rgba(235,250,240,1)'; x.fillRect(LAMP[0] - 4, LAMP[1] - 1.5, 8, 1.6);
  const h = x.createRadialGradient(LAMP[0], LAMP[1], 1, LAMP[0], LAMP[1], 22);
  h.addColorStop(0, 'rgba(210,235,220,0.7)'); h.addColorStop(0.3, 'rgba(160,190,175,0.18)'); h.addColorStop(1, 'rgba(120,150,140,0)');
  x.fillStyle = h; x.fillRect(LAMP[0] - 22, LAMP[1] - 22, 44, 44);
}

export function lampLevel(t, b) {
  const k = Math.floor(t * 14);
  let v = 1;
  const p = 0.003 + 0.3 * b * b;
  if (hash(k * 1.37 + 5) < p) v = 0.12 + 0.5 * hash(k + 99);
  if (b > 0.55 && hash(Math.floor(t * 2.5) + 7) < (b - 0.55) * 0.9) v *= 0.25 + 0.75 * hash(k * 3.1);
  return v;
}

const beckonAt = (t) => clamp((t - BECKON_START) / BECKON_LEN);

let L = null;
function drawCam(t) {
  if (!L) L = mk(LW, LH);
  const [lc, lx] = L;
  const G = gclock();
  const b = beckonAt(t);
  const lamp = lampLevel(t, b);
  lx.setTransform(1, 0, 0, 1, 0, 0);
  lx.globalCompositeOperation = 'source-over'; lx.globalAlpha = 1;
  lx.drawImage(cached('ch12:base', LW, LH, buildBase, true), 0, 0);
  lx.globalAlpha = lamp;
  lx.drawImage(cached('ch12:lit', LW, LH, buildLit, true), 0, 0);
  lx.globalAlpha = 1;
  // moths: around the tube, and one at the vending machine
  lx.fillStyle = `rgba(230,240,230,${0.5 + 0.5 * lamp})`;
  for (let i = 0; i < 5; i++) {
    const a = G * (2.1 + i * 0.7) + i * 1.9, r = 3 + 2.5 * Math.sin(G * 1.3 + i * 2.2);
    lx.fillRect(LAMP[0] + Math.cos(a) * r * 1.5 + Math.sin(G * 7 + i) * 0.8, LAMP[1] + 1 + Math.sin(a * 1.3) * r, 1, 1);
  }
  lx.fillStyle = 'rgba(230,240,240,0.8)';
  lx.fillRect(64 + Math.cos(G * 3.1) * 3, 100 + Math.sin(G * 4.3) * 4, 1, 1);
  // the crossing far down the line, and the headlight
  if (b > 0.05) {
    const on = Math.floor(t / 0.5) % 2;
    const [cx, cy] = P3(-0.62, 0.78, 34);
    lx.globalCompositeOperation = 'lighter';
    lx.fillStyle = 'rgba(255,40,30,0.95)';
    lx.fillRect(cx + (on ? 0 : 1.2), cy, 1, 1);
    lx.globalAlpha = 0.6; lx.drawImage(glowSprite('255,50,40'), cx + (on ? 0 : 1.2) - 3, cy - 3, 7, 7);
    lx.globalAlpha = 1;
  }
  const hl = smooth(0.12, 1, b);
  if (hl > 0) {
    const d = lerp(90, 24, hl);
    const [hx, hy] = P3(-0.165, 0.86, d);
    const flick = 0.85 + 0.15 * Math.sin(G * 31) * Math.sin(G * 17);
    lx.globalCompositeOperation = 'lighter';
    lx.globalAlpha = hl * flick;
    const s = 6 + 16 * hl;
    lx.drawImage(glowSprite('255,244,215'), hx - s / 2, hy - s / 2, s, s);
    lx.fillStyle = '#fffbe8'; lx.fillRect(hx - 0.5, hy - 0.5, 1 + hl, 1 + hl * 0.6);
    // the rails catch it
    lx.globalAlpha = hl * 0.5;
    lx.strokeStyle = 'rgba(255,240,210,0.7)'; lx.lineWidth = 0.6;
    for (const X of [-0.27, -0.06]) {
      const [a, c] = P3(X, 1, d * 0.9), [e, f] = P3(X, 1, Math.max(2.5, d * 0.3));
      lx.beginPath(); lx.moveTo(a, c); lx.lineTo(e, f); lx.stroke();
    }
    lx.globalAlpha = 1;
  }
  lx.globalCompositeOperation = 'source-over';
  // camera grain and the slow mains hum bar
  const tl = randomTile();
  lx.globalAlpha = 0.09;
  lx.drawImage(tl, (Math.random() * 100) | 0, (Math.random() * 200) | 0, LW, LH, 0, 0, LW, LH);
  lx.globalAlpha = 0.05;
  lx.fillStyle = '#cfe0d8';
  const hum = LH - ((G * 9) % (LH + 30));
  lx.fillRect(0, hum, LW, 14);
  lx.globalAlpha = 1;
  return { b, lamp };
}

const prog = {
  name: '夏ヶ原駅 ライブカメラ',
  beckon: 0,
  draw(g, t, W, H) {
    adopt(g); kickFonts();
    const { b } = drawCam(t);
    prog.beckon = b;
    const x = stage();
    x.imageSmoothingEnabled = true;
    x.drawImage(L[0], 0, 0, DW, DH);
    // a breath of brightness as it reaches for you
    if (b > 0.75) {
      x.globalCompositeOperation = 'lighter';
      x.globalAlpha = (b - 0.75) * 0.25 * (0.5 + 0.5 * Math.sin(t * 2.2));
      x.drawImage(glowSprite('200,230,215'), 140, 60, 360, 300);
      x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    }
    // the camera's character generator + the station's caption
    const w = wall();
    const frozen = b >= 0.92;
    const sec = frozen ? '··' : pad2(w.s);
    const stamp = `${String(DATE.y).slice(2)}-${pad2(DATE.mo)}-${pad2(DATE.d)}  ${pad2(w.h)}:${pad2(w.m)}:${sec}`;
    const o = { stroke: 'rgba(0,0,0,0.85)', sw: 4 };
    x.fillStyle = 'rgba(0,0,0,0.45)'; x.fillRect(64, 46, 236, 34);
    txt(x, '夏ヶ原駅 ライブカメラ', 74, 71, { font: `22px ${F.dot}`, color: '#ffffff' });
    txt(x, 'CAM-1', 576, 70, { font: `26px ${F.vt}`, align: 'right', color: '#e8f0ea', ...o });
    txt(x, '下り 1番線', 70, 428, { font: `18px ${F.dot}`, color: '#e8f0ea', ...o });
    txt(x, stamp, 576, 430, { font: `28px ${F.vt}`, align: 'right', color: frozen && Math.floor(t * 6) % 2 ? '#9fb3a8' : '#e8f0ea', ...o });
    sub(x, 'NATSUGAHARA STATION · LIVE CAMERA', 104, '#ffffff');
    sub(x, 'Down line, Platform 1', 396, '#55ffff');
    broadcast(g, W, H, { noise: 0.06, ghostA: 0.05, chroma: 0.4 });
  },
  /** Render the night-field buffers ahead of time (otherwise ~30 ms on first tune-in). */
  warm(audio) { natureBuffers(audio.ac); },
  start(audio, dest) {
    prog.beckon = 0;
    const g0 = gclock();
    const local = () => gclock() - g0;
    return timeline(audio, dest, {
      gain: 1.6,
      setup(e) {
        const ac = e.ac, A = e.A;
        const { frogs, bugs } = natureBuffers(ac);
        const loop = (buf, gain, lp) => {
          const s = ac.createBufferSource(); s.buffer = buf; s.loop = true;
          const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp;
          const g = ac.createGain(); g.gain.value = gain;
          s.connect(f).connect(g).connect(e.bus);
          s.start(ac.currentTime, Math.random() * buf.duration);
          e.nodes.push(s);
          return g;
        };
        e.frogs = loop(frogs, 0.55, 2600);
        e.bugs = loop(bugs, 0.22, 9000);
        e.air = A.noiseLoop(e.bus, { kind: 'brown', type: 'lowpass', freq: 260, gain: 0.07 });
        e.hissAir = A.noiseLoop(e.bus, { kind: 'pink', type: 'highpass', freq: 3200, gain: 0.006 });
        e.nodes.push(e.air.src, e.hissAir.src);
        // the lamp's ballast hum (50 Hz country: 100 Hz buzz)
        e.buzz = ac.createOscillator(); e.buzz.type = 'sawtooth'; e.buzz.frequency.value = 100;
        const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 1.4;
        e.buzzG = ac.createGain(); e.buzzG.gain.value = 0.006;
        e.buzz.connect(bp).connect(e.buzzG).connect(e.bus);
        e.buzz.start(); e.nodes.push(e.buzz);
        // distance: a field-wide slap echo for the bell and horn
        e.far = ac.createGain(); e.far.gain.value = 0;
        const flp = ac.createBiquadFilter(); flp.type = 'lowpass'; flp.frequency.value = 3200;
        e.far.connect(flp); flp.connect(e.bus); flp.connect(makeDelay(A, e.bus, 0.31, 0.28, 0.35, 1800));
        e.rumble = A.noiseLoop(e.bus, { kind: 'brown', type: 'lowpass', freq: 85, gain: 0 });
        e.nodes.push(e.rumble.src);
        e.nextStrike = BECKON_START + 2.4;
        e.k = 0;
        e.horn = false;
        e.frogsGone = false;
        e.lastLamp = 1;
      },
      tick(e, G, acNow) {
        const t = local();
        const b = beckonAt(t);
        const lamp = lampLevel(t, b);
        e.buzzG.gain.setTargetAtTime(0.006 * lamp, acNow, 0.01);
        if (lamp < 0.6 && e.lastLamp >= 0.6) whoosh(e.A, e.bus, acNow, 0.03, 0.12, 3000, 4500, 1, 'highpass');
        e.lastLamp = lamp;
        if (!e.frogsGone && t > BECKON_START + 1) {
          // the frogs fall silent: the night is listening
          e.frogsGone = true;
          e.frogs.gain.setTargetAtTime(0, acNow, 1.6);
          e.bugs.gain.setTargetAtTime(0.09, acNow, 2);
        }
        // the crossing bell, far away, coming up out of the quiet
        const ahead = t + 0.3;
        while (e.nextStrike < ahead) {
          const when = acNow + (e.nextStrike - t);
          if (when >= acNow - 0.01) {
            const lv = smooth(BECKON_START + 2, BECKON_START + 9, e.nextStrike);
            strike(e.A, e.far, Math.max(acNow, when), e.k % 2 ? 715 : 760, 0.9, 0.5);
            e.far.gain.setTargetAtTime(lv * 0.85, Math.max(acNow, when), 0.3);
          }
          e.k++;
          e.nextStrike += 0.5;
        }
        if (t > BECKON_START + 6) e.rumble.gain.gain.setTargetAtTime(0.32 * smooth(BECKON_START + 6, BECKON_START + 22, t), acNow, 0.5);
        if (!e.horn && t > BECKON_START + 11) {
          e.horn = true;
          hornAt(e, acNow + 0.05);
        }
      },
    });
  },
};

function hornAt(e, t) {
  const ac = e.ac;
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
  const g = ac.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.09, t + 0.12);
  g.gain.setValueAtTime(0.09, t + 1.3);
  g.gain.linearRampToValueAtTime(0, t + 1.7);
  lp.connect(g).connect(e.far);
  for (const [f, v] of [[370, 1], [372.5, 0.8], [740, 0.3]]) {
    const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
    const og = ac.createGain(); og.gain.value = v * 0.4;
    o.connect(og).connect(lp);
    o.start(t); o.stop(t + 1.8);
  }
}

// ---------- the fields at night, rendered once ----------
const NATURE = new WeakMap();
function natureBuffers(ac) {
  if (NATURE.has(ac)) return NATURE.get(ac);
  const sr = ac.sampleRate;
  const TAU = Math.PI * 2;
  // frogs: a 9 s seamless loop (writes wrap around), a few near voices, many far ones
  const fl = Math.floor(sr * 9);
  const frogs = ac.createBuffer(2, fl, sr);
  const FL = frogs.getChannelData(0), FR = frogs.getChannelData(1);
  for (let v = 0; v < 11; v++) {
    const near = v < 3;
    const f0 = 380 + Math.random() * 560;
    const rate = 11 + Math.random() * 11;
    const amp = near ? 0.16 + Math.random() * 0.08 : 0.04 + Math.random() * 0.05;
    const pan = Math.random();
    let t = Math.random() * 2;
    while (t < 9) {
      const n = 3 + Math.floor(Math.random() * 7);
      for (let p = 0; p < n; p++) {
        const st = Math.floor((t + p / rate) * sr);
        const len = Math.floor(sr * 0.024);
        const fj = f0 * (1 + (Math.random() - 0.5) * 0.03);
        for (let i = 0; i < len; i++) {
          const e = Math.min(1, i / (sr * 0.002)) * Math.exp(-i / (sr * 0.0065));
          const ph = (TAU * fj * i) / sr;
          const s = (Math.sin(ph) + 0.55 * Math.sin(2 * ph + 0.3) + 0.3 * Math.sin(3 * ph + 1)) * e * amp;
          const k = (st + i) % fl;
          FL[k] += s * (1 - pan * 0.7); FR[k] += s * (0.3 + pan * 0.7);
        }
      }
      t += n / rate + 0.4 + Math.random() * 2.4;
    }
  }
  // insects: a 4 s loop — chirps at ~4.4 kHz and a thin continuous trill at ~5.9 kHz
  const bl = Math.floor(sr * 4);
  const bugs = ac.createBuffer(2, bl, sr);
  const BL = bugs.getChannelData(0), BR = bugs.getChannelData(1);
  for (let i = 0; i < bl; i++) {
    const t = i / sr;
    const chirpPhase = (t % 0.5) / 0.5;
    const inChirp = chirpPhase < 0.16 ? 1 : 0;
    const pulse = Math.max(0, Math.sin(TAU * 31 * t));
    const a = inChirp * pulse * pulse * 0.12 * Math.sin(TAU * 4400 * t);
    const trill = 0.025 * Math.max(0, Math.sin(TAU * 47 * t)) * (0.6 + 0.4 * Math.sin((TAU * t) / 4)) * Math.sin(TAU * 5900 * t);
    BL[i] = a * 0.8 + trill * 0.4;
    BR[i] = a * 0.35 + trill * 0.9;
  }
  const out = { frogs, bugs };
  NATURE.set(ac, out);
  return out;
}

export default prog;
