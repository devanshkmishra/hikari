// 10ch — テレビショッピング. A fictional RF modulator: "make your CRT talk to the future!"
// An affectionate nod to getting an RF-only set to show a modern computer: RF modulation,
// manual tuning, NTSC/PAL fiddling. (No consumption tax in 1986: the price is the price.)
import { F, DW, DH, wantFont, kickFonts, adopt, cached, stage, broadcast, gclock, txt, glowSprite, clamp, smooth, lerp, easeOutBack, randomTile, timeline, sub } from './common.js';
import { kick, snare, hat, clap, crash, brass, bass, bell, whoosh, strike } from './synth.js';

const PERIOD = 32;

wantFont(`700 40px ${F.goth}`, '新発売!RFモジュレーターひかりリンクブラウン管が、未来としゃべる!使用前使用後つなぐだけで、未来の映像がうつる!1ch・2ch切りかえ式NTSC・PALどちらもOK(たぶん)手動チューニングつまみ付き同軸ケーブル5mおつけします通常価格19,800円14,860送料は、未来が負担します。フリーダイヤル0120-1486-RF24時間受付中いますぐお電話を!✓');
wantFont(`18px ${F.dot}`, 'ひかり通販CH12VIDEOINAUDIOPOWER');
wantFont(`20px ${F.vt}`, 'RF-1486 HIKARI LINK CH 1 2 VIDEO AUDIO');

// ---------- the product ----------
const BW = 150, BD = 96, BH = 44;
function rfBox(x, cx, cy, ang, s) {
  const c = Math.cos(ang), sn = Math.sin(ang);
  const corner = (u, w) => { const X = u * c - w * sn, Z = u * sn + w * c; return [cx + X * s, cy + Z * s * 0.38]; };
  const base = [corner(-BW / 2, -BD / 2), corner(BW / 2, -BD / 2), corner(BW / 2, BD / 2), corner(-BW / 2, BD / 2)];
  const top = base.map(([a, b]) => [a, b - BH * s]);
  const faces = [
    { i: [0, 1], n: [0, -1], kind: 'back' },
    { i: [1, 2], n: [1, 0], kind: 'side' },
    { i: [2, 3], n: [0, 1], kind: 'front' },
    { i: [3, 0], n: [-1, 0], kind: 'side' },
  ];
  for (const f of faces) {
    const nz = f.n[0] * sn + f.n[1] * c;
    if (nz <= 0.01) continue;
    let [a, b] = f.i;
    if (base[b][0] < base[a][0]) [a, b] = [b, a]; // seen from outside, left to right
    const BL = base[a], BR = base[b], TL = top[a], TR = top[b];
    const shade = 0.55 + 0.45 * nz;
    x.fillStyle = f.kind === 'side' ? `rgb(${120 * shade | 0},${124 * shade | 0},${132 * shade | 0})` : `rgb(${160 * shade | 0},${164 * shade | 0},${174 * shade | 0})`;
    x.beginPath(); x.moveTo(BL[0], BL[1]); x.lineTo(BR[0], BR[1]); x.lineTo(TR[0], TR[1]); x.lineTo(TL[0], TL[1]); x.closePath(); x.fill();
    x.strokeStyle = 'rgba(30,32,40,0.55)'; x.lineWidth = 1.2; x.stroke();
    if (f.kind === 'side') continue;
    const len = BW;
    // affine map panel (u: 0..len, v: 0..BH) onto the face
    x.save();
    x.transform((TR[0] - TL[0]) / len, (TR[1] - TL[1]) / len, (BL[0] - TL[0]) / BH, (BL[1] - TL[1]) / BH, TL[0], TL[1]);
    x.globalAlpha = clamp(nz * 1.6);
    const sw = Math.floor(gclock()) % 4 < 2 ? 0 : 1;
    const panel = f.kind === 'front'
      ? cached('ch10:front' + sw, BW * 2, BH * 2, FRONTS[sw])
      : cached('ch10:back', BW * 2, BH * 2, buildBack);
    x.drawImage(panel, 0, 0, BW, BH);
    x.restore();
  }
  // top
  x.fillStyle = '#b9bdc6';
  x.beginPath(); top.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath(); x.fill();
  x.strokeStyle = 'rgba(30,32,40,0.55)'; x.lineWidth = 1.2; x.stroke();
  x.strokeStyle = 'rgba(0,0,0,0.12)'; x.lineWidth = 1;
  for (let k = 1; k < 6; k++) {
    const p = (q) => [lerp(top[0][0], top[3][0], q), lerp(top[0][1], top[3][1], q)];
    const r = (q) => [lerp(top[1][0], top[2][0], q), lerp(top[1][1], top[2][1], q)];
    const [a0, b0] = p(k / 6), [a1, b1] = r(k / 6);
    x.beginPath(); x.moveTo(lerp(a0, a1, 0.6), lerp(b0, b1, 0.6)); x.lineTo(lerp(a0, a1, 0.9), lerp(b0, b1, 0.9)); x.stroke();
  }
}

const frontPanel = (sw) => (x) => {
  x.scale(2, 2);
  x.fillStyle = '#26272c'; x.fillRect(6, 6, 64, 32);
  txt(x, 'RF-1486', 12, 22, { font: `16px ${F.vt}`, color: '#e8e8e8' });
  txt(x, 'HIKARI LINK', 12, 34, { font: `11px ${F.vt}`, color: '#ff7aa8' });
  x.fillStyle = '#ff2a2a'; x.beginPath(); x.arc(84, 14, 3, 0, Math.PI * 2); x.fill();
  txt(x, 'POWER', 84, 28, { font: `9px ${F.vt}`, align: 'center', color: '#333' });
  x.fillStyle = '#2b2b30'; x.fillRect(100, 10, 30, 12);
  x.fillStyle = '#d8d8dc'; x.fillRect(sw, 11, 12, 10);
  txt(x, 'CH 1  2', 115, 34, { font: `11px ${F.vt}`, align: 'center', color: '#333' });
  x.fillStyle = '#55565c'; x.beginPath(); x.arc(140, 30, 5, 0, Math.PI * 2); x.fill();
};
const FRONTS = [frontPanel(102), frontPanel(116)];
function buildBack(x) {
  x.scale(2, 2);
  for (const [u, col] of [[24, '#f2d23a'], [44, '#f4f4f4'], [64, '#e33']]) {
    x.fillStyle = '#c9a641'; x.beginPath(); x.arc(u, 22, 6, 0, Math.PI * 2); x.fill();
    x.fillStyle = col; x.beginPath(); x.arc(u, 22, 3.5, 0, Math.PI * 2); x.fill();
  }
  x.fillStyle = '#d6d6d6'; x.beginPath(); x.arc(110, 22, 9, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#888'; x.beginPath(); x.arc(110, 22, 4, 0, Math.PI * 2); x.fill();
  txt(x, 'VIDEO AUDIO  RF OUT', 74, 40, { font: `9px ${F.vt}`, align: 'center', color: '#333' });
}

function turntable(x, cx, cy, s) {
  x.fillStyle = '#3a3c44'; x.beginPath(); x.ellipse(cx, cy + 10 * s, 120 * s, 34 * s, 0, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#6a6d78'; x.beginPath(); x.ellipse(cx, cy, 120 * s, 34 * s, 0, 0, Math.PI * 2); x.fill();
  x.strokeStyle = 'rgba(255,255,255,0.35)'; x.lineWidth = 2;
  x.beginPath(); x.ellipse(cx, cy, 120 * s, 34 * s, 0, Math.PI * 1.1, Math.PI * 1.6); x.stroke();
}

function buildRays(x) {
  x.translate(400, 400);
  for (let i = 0; i < 24; i++) {
    x.fillStyle = i % 2 ? 'rgba(255,255,255,0.13)' : 'rgba(255,255,255,0.0)';
    x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, 420, (i / 24) * Math.PI * 2, ((i + 1) / 24) * Math.PI * 2); x.closePath(); x.fill();
  }
}

function burst(x, cx, cy, r, label, t) {
  const D = r * 2 + 12;
  const spr = cached(`ch10:burst:${label}:${r}`, D, D, (y) => {
    y.translate(D / 2, D / 2);
    y.fillStyle = '#ffe63a'; y.strokeStyle = '#e8141f'; y.lineWidth = 4; y.lineJoin = 'round';
    y.beginPath();
    for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2, rr = i % 2 ? r * 0.72 : r; y.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    y.closePath(); y.fill(); y.stroke();
    const fs = Math.round(Math.min(28, (r * 1.45) / [...label].length));
    txt(y, label, 0, fs * 0.36, { font: `700 ${fs}px ${F.goth}`, align: 'center', color: '#e8141f' });
  });
  x.save(); x.translate(cx, cy); x.rotate(-0.15 + Math.sin(t * 6) * 0.04);
  const s = 1 + Math.sin(t * 8) * 0.04; x.scale(s, s);
  x.drawImage(spr, -D / 2, -D / 2);
  x.restore();
}

function studio(x, a, b) {
  const g = x.createRadialGradient(320, 230, 30, 320, 240, 460);
  g.addColorStop(0, a); g.addColorStop(1, b);
  x.fillStyle = g; x.fillRect(0, 0, DW, DH);
  x.save(); x.translate(320, 240); x.rotate(gclock() * 0.15);
  x.drawImage(cached('ch10:rays', 800, 800, buildRays, true), -400, -400);
  x.restore();
}

function band(x, y, h, col) { x.fillStyle = col; x.fillRect(0, y, DW, h); }

function miniTV(x, X, Y, w, h, drawScreen) {
  x.fillStyle = '#2a2a2e'; x.beginPath(); x.roundRect(X - 12, Y - 12, w + 24, h + 24, 12); x.fill();
  x.fillStyle = '#0b0b0d'; x.beginPath(); x.roundRect(X, Y, w, h, 10); x.fill();
  x.save(); x.beginPath(); x.roundRect(X, Y, w, h, 10); x.clip();
  drawScreen(X, Y, w, h);
  x.restore();
}

function scene(x, p) {
  const G = gclock();
  if (p < 7) {
    studio(x, '#ffe58a', '#f0791a');
    turntable(x, 320, 300, 1.15);
    rfBox(x, 320, 296, G * 0.6, 1.15);
    burst(x, 140, 110, 66, '新発売!', p);
    if (p > 0.6) {
      band(x, 352, 44, 'rgba(10,30,110,0.85)');
      txt(x, 'RFモジュレーター  ひかりリンク', 320, 384, { font: `700 26px ${F.goth}`, align: 'center', color: '#ffffff' });
    }
    if (p > 2.4) {
      const k = easeOutBack(clamp((p - 2.4) / 0.4));
      const tag = cached('ch10:tagline', 600, 70, (y) => {
        y.translate(300, 48); y.transform(1, 0, -0.18, 1, 0, 0);
        txt(y, 'ブラウン管が、未来としゃべる!', 0, 0, { font: `700 34px ${F.goth}`, align: 'center', color: '#ffe63a', stroke: '#c8101c', sw: 8, shadow: 'rgba(60,0,0,0.6)', sx: 3, sy: 3 });
      });
      x.save(); x.translate(320, 436); x.scale(k, k);
      x.drawImage(tag, -300, -48);
      x.restore();
    }
  } else if (p < 15) {
    const q = p - 7;
    studio(x, '#bfe6ff', '#3d7fd6');
    const tile = randomTile();
    miniTV(x, 70, 130, 200, 150, (X, Y, w, h) => {
      x.imageSmoothingEnabled = false;
      x.drawImage(tile, 0, (Math.random() * 140) | 0, 160, 120, X, Y, w, h);
      x.imageSmoothingEnabled = true;
    });
    miniTV(x, 370, 130, 200, 150, (X, Y, w, h) => {
      const on = q > 1.2;
      if (!on) { x.drawImage(tile, 0, (Math.random() * 140) | 0, 160, 120, X, Y, w, h); return; }
      x.fillStyle = '#16121e'; x.fillRect(X, Y, w, h);
      // a circle to click, an approach ring closing in: the future, apparently
      const beat = (G * 1.6) % 1;
      const pts = [[0.3, 0.4], [0.62, 0.32], [0.7, 0.66], [0.4, 0.7]];
      const k = Math.floor(G * 1.6) % pts.length;
      const [ux, uy] = pts[k];
      const cx = X + ux * w, cy = Y + uy * h;
      x.strokeStyle = '#ff66aa'; x.lineWidth = 3;
      x.beginPath(); x.arc(cx, cy, 16 + 26 * (1 - beat), 0, Math.PI * 2); x.stroke();
      x.fillStyle = '#ff66aa'; x.beginPath(); x.arc(cx, cy, 15, 0, Math.PI * 2); x.fill();
      x.strokeStyle = '#fff'; x.lineWidth = 2.5; x.beginPath(); x.arc(cx, cy, 15, 0, Math.PI * 2); x.stroke();
      txt(x, String(k + 1), cx, cy + 6, { font: `700 16px ${F.goth}`, align: 'center', color: '#fff' });
      const [px2, py2] = pts[(k + 3) % 4];
      x.globalCompositeOperation = 'lighter';
      x.drawImage(glowSprite('255,220,120'), lerp(X + px2 * w, cx, Math.min(1, beat * 1.4)) - 8, lerp(Y + py2 * h, cy, Math.min(1, beat * 1.4)) - 8, 16, 16);
      x.globalCompositeOperation = 'source-over';
    });
    x.fillStyle = '#5a5e68'; x.fillRect(120, 92, 100, 28); txt(x, '使用前', 170, 114, { font: `700 20px ${F.goth}`, align: 'center' });
    x.fillStyle = '#e8141f'; x.fillRect(420, 92, 100, 28); txt(x, '使用後', 470, 114, { font: `700 20px ${F.goth}`, align: 'center' });
    x.fillStyle = '#ffe63a';
    x.beginPath(); x.moveTo(296, 192); x.lineTo(330, 192); x.lineTo(330, 180); x.lineTo(352, 205); x.lineTo(330, 230); x.lineTo(330, 218); x.lineTo(296, 218); x.closePath(); x.fill();
    if (q > 1.2) {
      band(x, 352, 44, 'rgba(10,30,110,0.85)');
      txt(x, 'つなぐだけで、未来の映像がうつる!', 320, 383, { font: `700 26px ${F.goth}`, align: 'center', color: '#ffffff' });
    }
  } else if (p < 22) {
    const q = p - 15;
    studio(x, '#fff3c0', '#f2a13a');
    turntable(x, 500, 330, 0.62);
    rfBox(x, 500, 328, G * 0.6, 0.62);
    const items = ['1ch・2ch切りかえ式', 'NTSC・PALどちらもOK(たぶん)', '手動チューニングつまみ付き', '同軸ケーブル5mおつけします'];
    items.forEach((s, i) => {
      const at = 0.5 + i * 1.2;
      if (q < at) return;
      const k = easeOutBack(clamp((q - at) / 0.3));
      const y = 104 + i * 62;
      const row = cached('ch10:row' + i, 360, 48, (y) => {
        y.fillStyle = 'rgba(255,255,255,0.92)'; y.fillRect(0, 0, 360, 48);
        y.fillStyle = '#e8141f'; y.fillRect(0, 0, 48, 48);
        txt(y, '✓', 24, 36, { font: `700 30px ${F.goth}`, align: 'center', color: '#fff' });
        txt(y, s, 60, 33, { font: `700 ${i === 1 ? 20 : 22}px ${F.goth}`, color: '#13235e' });
      });
      x.drawImage(row, Math.round(64 + (1 - k) * -300), y);
    });
  } else {
    const q = p - 22;
    const flash = q > 2 && Math.floor(G * 4) % 2 === 0;
    studio(x, flash ? '#ffef6a' : '#ffd93a', '#d91a1a');
    if (q < 2.0) {
      txt(x, '通常価格', 320, 150, { font: `700 30px ${F.goth}`, align: 'center', color: '#ffffff', stroke: '#13235e', sw: 6 });
    }
    const showOld = q < 2.0;
    if (showOld) {
      txt(x, '19,800円', 320, 236, { font: `700 64px ${F.goth}`, align: 'center', color: '#ffffff', stroke: '#13235e', sw: 8 });
      if (q > 1.4) {
        const k = clamp((q - 1.4) / 0.2);
        x.strokeStyle = '#e8141f'; x.lineWidth = 8; x.lineCap = 'round';
        x.beginPath(); x.moveTo(170, 230); x.lineTo(lerp(170, 470, k), lerp(230, 200, k)); x.stroke();
      }
    } else {
      const k = q - 2.0;
      const shake = Math.exp(-k * 5) * 10;
      x.save(); x.translate(320 + (Math.random() - 0.5) * shake, 222 + (Math.random() - 0.5) * shake);
      const s = 1 + 0.6 * Math.exp(-k * 9);
      x.scale(s, s);
      const price = cached('ch10:price', 520, 160, (y) => {
        y.translate(260, 80);
        txt(y, '14,860', -16, 30, { font: `700 104px ${F.goth}`, align: 'center', color: '#ffe63a', stroke: '#c8101c', sw: 14, shadow: 'rgba(60,0,0,0.6)', sx: 5, sy: 5 });
        txt(y, '円', 190, 30, { font: `700 48px ${F.goth}`, align: 'center', color: '#ffffff', stroke: '#c8101c', sw: 8 });
      });
      x.drawImage(price, -260, -80);
      x.restore();
      burst(x, 120, 110, 62, 'いますぐ!', G);
    }
    if (q > 3.5) {
      band(x, 300, 40, 'rgba(10,30,110,0.88)');
      txt(x, '送料は、未来が負担します。', 320, 328, { font: `700 24px ${F.goth}`, align: 'center', color: '#ffffff' });
    }
    if (q > 5) {
      x.fillStyle = '#ffffff'; x.fillRect(60, 356, 520, 74);
      x.strokeStyle = '#13235e'; x.lineWidth = 3; x.strokeRect(60, 356, 520, 74);
      txt(x, 'フリーダイヤル', 78, 384, { font: `700 18px ${F.goth}`, color: '#13235e' });
      txt(x, '0120-1486-RF', 330, 420, { font: `700 40px ${F.goth}`, align: 'center', color: '#e8141f' });
      txt(x, '24時間受付中', 562, 384, { font: `700 16px ${F.goth}`, align: 'right', color: '#13235e' });
    }
  }
  // the shopping channel's corner bug
  txt(x, 'ひかり通販', 584, 58, { font: `18px ${F.dot}`, align: 'right', color: 'rgba(255,255,255,0.9)', stroke: 'rgba(0,0,0,0.4)', sw: 3 });
}

// ---------- sound ----------
const BEAT = 0.5, BAR = 2;
const PROG = [48, 53, 55, 48, 53, 55, 57, 55, 48, 53, 55, 48, 53, 55, 43, 55];
const TRIAD = { 48: [60, 64, 67], 53: [60, 65, 69], 55: [59, 62, 67], 57: [60, 64, 69], 43: [59, 62, 67] };
function buildEvents() {
  const ev = [];
  const at = (t, fn) => ev.push({ t, fn });
  for (let b = 0; b < 16; b++) {
    const t0 = b * BAR, root = PROG[b];
    for (let s = 0; s < 8; s++) {
      const t = t0 + s * BEAT / 2;
      if (s % 2 === 0) at(t, (e, w) => kick(e.A, e.bus, w, 0.8));
      if (s === 2 || s === 6) at(t, (e, w) => { snare(e.A, e.bus, w, 0.5); clap(e.A, e.bus, w, 0.45); });
      at(t + BEAT / 4, (e, w) => hat(e.A, e.bus, w, 0.3, s === 7));
      at(t, (e, w) => bass(e.A, e.bus, w, root - 12 + (s % 2 ? 12 : 0), BEAT * 0.4, 0.6));
    }
    at(t0, (e, w) => brass(e.A, e.bus, w, TRIAD[root], 0.18, 0.6));
    at(t0 + BEAT * 1.5, (e, w) => brass(e.A, e.bus, w, TRIAD[root], 0.14, 0.5));
    at(t0 + BEAT * 3, (e, w) => brass(e.A, e.bus, w, TRIAD[root].map((m) => m + 2), 0.3, 0.55));
  }
  at(0.02, (e, w) => { brass(e.A, e.bus, w, [60, 64, 67, 72], 0.9, 1); crash(e.A, e.bus, w, 0.6); });
  at(7, (e, w) => whoosh(e.A, e.bus, w, 0.5, 0.8, 400, 6000));
  at(8.2, (e, w) => { bell(e.A, e.bus, w, 84, 0.5, 1, 3.5); bell(e.A, e.bus, w + 0.12, 91, 0.5, 1.4, 3.5); });
  at(15, (e, w) => whoosh(e.A, e.bus, w, 0.5, 0.8, 400, 6000));
  [15.5, 16.7, 17.9, 19.1].forEach((t) => at(t, (e, w) => bell(e.A, e.bus, w, 88, 0.4, 0.5, 2)));
  at(23.4, (e, w) => whoosh(e.A, e.bus, w, 0.25, 0.7, 5000, 1500));
  at(24, (e, w) => { brass(e.A, e.bus, w, [48, 60, 64, 67, 72, 76], 1.0, 1.2); crash(e.A, e.bus, w, 0.8, 2); kick(e.A, e.bus, w, 1); });
  at(24.5, (e, w) => { strike(e.A, e.bus, w, 2100, 0.9, 0.9); strike(e.A, e.bus, w + 0.09, 2800, 0.9, 1.2); });
  return ev;
}

let EVENTS = null;
export default {
  name: 'テレビショッピング',
  draw(g, t, W, H) {
    adopt(g); kickFonts();
    const x = stage();
    const p = gclock() % PERIOD;
    scene(x, p);
    sub(x, p < 7 ? ['NEW! RF modulator HIKARI LINK', 'Your CRT talks to the future!']
      : p < 15 ? ['BEFORE / AFTER', 'Just plug it in: the future shows up on screen!']
      : p < 22 ? ['Ch 1/2 switch · NTSC & PAL (probably)', 'Manual tuning knob · 5 m coax cable included']
      : p < 24 ? 'Regular price: 19,800 yen'
      : ['NOW 14,860 YEN! Shipping paid by the future.', 'Toll-free 0120-1486-RF · 24 hours · Call now!'], 470);
    broadcast(g, W, H, { noise: 0.085, ghostA: 0.1, ghost: 12, smear: 0.34 });
  },
  start(audio, dest) {
    if (!EVENTS) EVENTS = buildEvents();
    return timeline(audio, dest, { period: PERIOD, gain: 0.42, events: EVENTS.slice() });
  },
};
