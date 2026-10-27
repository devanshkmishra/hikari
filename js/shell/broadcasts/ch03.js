// 3ch — 「夜のスタジオ '85」 (rerun). A late-night idol music show: the split-flap ranking board
// clatters to 第3位, then the performance — a silhouette under a bulb arch, spotlights sweeping,
// an original bright idol-pop song (FM e-piano, synth bass, gated snare, a sweet lead line).
import { F, DW, DH, wantFont, kickFonts, adopt, cached, stage, broadcast, gclock, txt, glowSprite, clamp, smooth, hash, timeline, sub } from './common.js';
import { epiano, bass, lead, bell, kick, snare, hat, clap, crash, brass, makeGate, makeDelay, clatterBuffer, blip } from './synth.js';

const BPM = 128, BEAT = 60 / BPM, S16 = BEAT / 4, BAR = BEAT * 4;
const BOARD = 6, SONG = BAR * 16, PERIOD = BOARD + SONG; // 36 s
const KEY = 2; // D major

const TITLE = '午前0時のシグナル';
const ARTIST = '水瀬あかり';
const POINTS = '8640';
const KANA = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワン';
const DIGITS = '0123456789';

wantFont(`700 34px ${F.goth}`, TITLE + ARTIST + KANA + DIGITS + '今週の第位点先週♪夜のスタジオ\'85再放送ランキング');
wantFont(`18px ${F.dot}`, 'この番組は1985年10月に放送したものです再放送先週5位→今週3位');
wantFont(`40px ${F.pop}`, '夜のスタジオ');

// ---------- music ----------
const VOX = {
  F: [41, [57, 60, 64, 69]], G6: [43, [59, 62, 64, 67]], C: [36, [55, 62, 64, 67]],
  Am7: [45, [55, 60, 64, 69]], Dm7: [38, [57, 60, 62, 65]], G7: [43, [59, 62, 65, 67]],
  Em7: [40, [59, 62, 64, 67]], A7: [45, [57, 61, 64, 67]], G: [43, [59, 62, 67, 71]],
};
const PROG = [['F'], ['G6'], ['C'], ['Am7'], ['Dm7'], ['G7'], ['C'], ['Am7'],
  ['F'], ['G'], ['Em7'], ['Am7'], ['F'], ['G'], ['Em7', 'A7'], ['Dm7', 'G7']];
const chordAt = (bar, step) => { const c = PROG[bar]; return VOX[c.length > 1 && step >= 8 ? c[1] : c[0]]; };
// 8th-note melody: number = note on, 0 = hold, -1 = rest
const MEL = [
  null,
  [-1, -1, -1, -1, -1, -1, 67, 69],
  [72, 0, 76, 0, 74, 72, 74, 0],
  [76, 0, 0, 0, -1, 72, 69, 72],
  [74, 0, 77, 0, 76, 74, 72, 0],
  [74, 0, 0, 0, -1, -1, 67, 69],
  [72, 0, 76, 0, 79, 0, 81, 79],
  [76, 0, 0, 74, 72, 0, -1, -1],
  [69, 0, 72, 0, 77, 0, 76, 0],
  [74, 0, 71, 0, 67, 0, -1, 67],
  [67, 0, 71, 0, 76, 0, 74, 0],
  [72, 0, 0, 0, 76, 0, 79, 0],
  [81, 0, 0, 79, 0, 0, 76, 0],
  [79, 0, 77, 76, 0, 74, 0, 0],
  [76, 0, 79, 0, 81, 0, 79, 0],
  [77, 0, 76, 0, 74, 0, 0, -1],
];
const INTRO_BELLS = [[81, 84, 88, 84, 81, 84, 88, 89], [83, 86, 88, 86, 83, 86, 91, 88]];

function buildEvents() {
  const ev = [];
  const at = (t, fn) => ev.push({ t, fn });
  // ranking board: clatter, the rank flap ticking alone, a roll, the reveal
  at(0.5, (e, w) => {
    const s = e.ac.createBufferSource(); s.buffer = clatterBuffer(e.A);
    const g = e.ac.createGain();
    g.gain.setValueAtTime(0, w); g.gain.linearRampToValueAtTime(0.5, w + 0.15);
    g.gain.setValueAtTime(0.5, w + 1.6); g.gain.linearRampToValueAtTime(0.0, w + 2.75);
    s.connect(g).connect(e.bus); s.start(w); s.stop(w + 2.9);
  });
  for (let k = 0; k < 16; k++) at(3.4 + k / 14, (e, w) => blip(e.A, e.bus, w, 2600 + (k % 3) * 300, 0.006, 0.7));
  for (let k = 0; k < 20; k++) at(3.5 + k * 0.055, (e, w) => snare(e.A, e.bus, w, 0.12 + (k / 20) * 0.35));
  at(4.6, (e, w) => { brass(e.A, e.bus, w, [62, 66, 69, 74].map((m) => m + 0), 0.12, 0.9); kick(e.A, e.bus, w, 0.8); });
  at(4.85, (e, w) => { brass(e.A, e.bus, w, [62, 66, 69, 74, 78], 0.9, 1); crash(e.A, e.bus, w, 0.7, 2); kick(e.A, e.bus, w, 0.9); });

  for (let bar = 0; bar < 16; bar++) {
    const b0 = BOARD + bar * BAR;
    const intro = bar < 2, chorus = bar >= 12;
    for (let s = 0; s < 16; s++) {
      const t = b0 + s * S16;
      // drums
      if (intro ? s % 4 === 0 : s === 0 || s === 8 || s === 10) at(t, (e, w) => kick(e.A, e.bus, w, s === 10 ? 0.6 : 0.9));
      if (s === 4 || s === 12) at(t, (e, w) => { snare(e.A, e.bus, w, 0.75, e.gate); if (chorus) clap(e.A, e.bus, w, 0.5); });
      if (bar === 15 && s >= 10 && s !== 12) at(t, (e, w) => snare(e.A, e.bus, w, 0.3 + (s - 10) * 0.08, e.gate));
      if (s % 2 === 0) at(t, (e, w) => hat(e.A, e.bus, w, s % 4 === 2 ? 0.5 : 0.32, !intro && s === 14));
      else if (chorus) at(t, (e, w) => hat(e.A, e.bus, w, 0.14));
      if (s === 0 && (bar === 2 || bar === 8 || bar === 12)) at(t, (e, w) => crash(e.A, e.bus, w, 0.45));
      // bass: driving 8ths with octave jumps
      if (s % 2 === 0) {
        const [root] = chordAt(bar, s);
        const off = [0, 0, 12, 0, 0, 7, 12, 0][s / 2];
        at(t, (e, w) => bass(e.A, e.bus, w, root + KEY + off, S16 * 1.6, 0.75));
      }
      // FM e-piano comping
      if (s === 0 || s === 6 || s === 10) {
        const [, vox] = chordAt(bar, s);
        const dur = s === 0 ? S16 * 5 : S16 * 3;
        at(t, (e, w) => { for (const m of vox) epiano(e.A, e.bus, w, m + KEY, dur, s === 0 ? 0.5 : 0.4); });
      }
    }
    // melody
    const mel = MEL[bar];
    if (mel) {
      for (let i = 0; i < 8; i++) {
        const m = mel[i];
        if (m <= 0) continue;
        let len = 1;
        while (i + len < 8 && mel[i + len] === 0) len++;
        const t = b0 + i * 2 * S16;
        at(t, (e, w) => {
          lead(e.A, e.lead, w, m + KEY, len * 2 * S16 * 0.9, 0.85);
          if (chorus) bell(e.A, e.bus, w, m + KEY + 12, 0.18, 0.8, 3.5);
        });
      }
    }
    if (intro) INTRO_BELLS[bar].forEach((m, i) => at(b0 + i * 2 * S16, (e, w) => bell(e.A, e.lead, w, m + KEY, 0.32, 0.9, 3.5)));
  }
  return ev;
}

// ---------- visuals ----------
const ARCH = [];
for (let i = 0; i < 46; i++) {
  const a = Math.PI - (i / 45) * Math.PI;
  ARCH.push([320 + 272 * Math.cos(a), 338 - 292 * Math.sin(a)]);
}

function buildStage(x) {
  const bg = x.createLinearGradient(0, 0, 0, 340);
  bg.addColorStop(0, '#0b031c'); bg.addColorStop(0.6, '#230838'); bg.addColorStop(1, '#3c0c46');
  x.fillStyle = bg; x.fillRect(0, 0, DW, 340);
  const fl = x.createLinearGradient(0, 336, 0, DH);
  fl.addColorStop(0, '#1d0a28'); fl.addColorStop(1, '#07030c');
  x.fillStyle = fl; x.fillRect(0, 336, DW, DH - 336);
  // back wall panels
  x.strokeStyle = 'rgba(255,160,230,0.07)'; x.lineWidth = 2;
  for (let i = 0; i < 14; i++) { x.beginPath(); x.moveTo(i * 48 + 10, 30); x.lineTo(i * 48 + 10, 336); x.stroke(); }
  // arch frame
  x.strokeStyle = '#2a1636'; x.lineWidth = 16;
  x.beginPath(); x.ellipse(320, 338, 272, 292, 0, Math.PI, 0); x.stroke();
  x.strokeStyle = '#4b2a58'; x.lineWidth = 2;
  x.beginPath(); x.ellipse(320, 338, 281, 301, 0, Math.PI, 0); x.stroke();
  for (const [bx, by] of ARCH) { x.fillStyle = '#4a2440'; x.beginPath(); x.arc(bx, by, 3, 0, Math.PI * 2); x.fill(); }
  // neon: crescent + logotype
  x.save();
  x.shadowColor = '#ff4fb0'; x.shadowBlur = 14;
  x.strokeStyle = '#ff9bd6'; x.lineWidth = 4;
  x.beginPath(); x.arc(178, 116, 34, Math.PI * 0.35, Math.PI * 1.65); x.stroke();
  x.beginPath(); x.arc(196, 108, 28, Math.PI * 1.55, Math.PI * 0.45, true); x.stroke();
  x.shadowColor = '#3fe7ff';
  txt(x, '夜のスタジオ', 352, 132, { font: `40px ${F.pop}`, align: 'center', color: '#dffbff', stroke: '#33d9ff', sw: 2 });
  x.restore();
  for (const [sx, sy, r] of [[488, 82, 6], [520, 120, 4], [458, 150, 3]]) {
    x.fillStyle = '#fff2b3'; x.save(); x.translate(sx, sy); x.rotate(Math.PI / 4); x.fillRect(-r / 2, -r * 1.6, r, r * 3.2); x.fillRect(-r * 1.6, -r / 2, r * 3.2, r); x.restore();
  }
  // riser
  x.fillStyle = '#12061b';
  x.beginPath(); x.ellipse(320, 398, 176, 30, 0, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#1c0b28'; x.fillRect(144, 398, 352, 22);
  x.beginPath(); x.ellipse(320, 420, 176, 30, 0, 0, Math.PI); x.fill();
  x.strokeStyle = 'rgba(120,230,255,0.75)'; x.lineWidth = 2;
  x.beginPath(); x.ellipse(320, 398, 176, 30, 0, 0, Math.PI * 2); x.stroke();
  x.strokeStyle = 'rgba(255,120,200,0.5)';
  x.beginPath(); x.ellipse(320, 420, 176, 30, 0, 0.05, Math.PI - 0.05); x.stroke();
}

function buildLogo(x) {
  x.save();
  x.translate(8, 40);
  x.transform(1, 0, -0.22, 1, 0, 0);
  const gr = x.createLinearGradient(0, -30, 0, 0);
  gr.addColorStop(0, '#fff6a8'); gr.addColorStop(1, '#ff7cc2');
  txt(x, '夜のスタジオ', 14, 0, { font: `700 26px ${F.goth}`, stroke: '#ffffff', sw: 5, shadow: 'rgba(40,0,40,0.8)', sx: 3, sy: 3 });
  x.font = `700 26px ${F.goth}`; x.fillStyle = gr; x.fillText('夜のスタジオ', 14, 0);
  txt(x, "'85", 178, 0, { font: `700 26px ${F.goth}`, color: '#7ff0ff', stroke: '#ffffff', sw: 5, shadow: 'rgba(40,0,40,0.8)', sx: 3, sy: 3 });
  x.restore();
}

function buildRerun(x) {
  x.strokeStyle = '#fff'; x.lineWidth = 2; x.strokeRect(2, 2, 76, 28);
  x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(3, 3, 74, 26);
  txt(x, '再放送', 40, 23, { font: `18px ${F.dot}`, align: 'center' });
}

function buildTelop(x) {
  txt(x, '♪ ' + TITLE, 6, 40, { font: `700 34px ${F.goth}`, color: '#ffffff', stroke: '#c0185f', sw: 7, shadow: 'rgba(20,0,20,0.85)', sx: 3, sy: 3 });
  txt(x, ARTIST, 40, 78, { font: `700 24px ${F.goth}`, color: '#ffffff', stroke: '#1f2d8a', sw: 6, shadow: 'rgba(20,0,20,0.85)', sx: 2, sy: 2 });
}

// ---- the idol (a silhouette, nobody in particular: an era, not a person) ----
function idol(x, beatF, armUp, rim) {
  const bob = Math.abs(Math.sin(beatF * Math.PI)) * 2.2;
  const sway = Math.sin((beatF * Math.PI) / 2) * 0.035;
  x.save();
  x.rotate(sway);
  x.translate(0, -bob);
  const hairSwing = Math.sin((beatF * Math.PI) / 2 - 0.6) * 2.5;
  const p = new Path2D();
  p.moveTo(-11, -74); p.lineTo(-3, -74); p.lineTo(-5, -5); p.lineTo(-8.5, -5); p.closePath();
  p.moveTo(3, -74); p.lineTo(11, -74); p.lineTo(8.5, -5); p.lineTo(5, -5); p.closePath();
  p.ellipse(-8, -3, 7, 3.5, 0, 0, Math.PI * 2); p.ellipse(8, -3, 7, 3.5, 0, 0, Math.PI * 2);
  p.moveTo(-17, -122); p.lineTo(17, -122); p.lineTo(46, -70);
  for (let i = 0; i < 6; i++) { const x0 = 46 - i * (92 / 6); p.quadraticCurveTo(x0 - 92 / 12, -61, x0 - 92 / 6, -70); }
  p.closePath();
  p.moveTo(-16, -120); p.lineTo(-23, -162); p.lineTo(23, -162); p.lineTo(16, -120); p.closePath();
  p.moveTo(-16, -158); p.arc(-26, -158, 10, 0, Math.PI * 2);
  p.moveTo(36, -158); p.arc(26, -158, 10, 0, Math.PI * 2);
  p.rect(-4, -178, 8, 18);
  p.moveTo(15, -190); p.arc(0, -190, 15, 0, Math.PI * 2);
  // layered, outward-flicked hair: the 1980s silhouette
  p.moveTo(-19, -192);
  p.bezierCurveTo(-22, -217, 22, -217, 19, -192);
  p.quadraticCurveTo(22, -178, 31 + hairSwing, -170);
  p.quadraticCurveTo(21, -171, 15, -180);
  p.lineTo(-15, -180);
  p.quadraticCurveTo(-21, -171, -31 + hairSwing, -170);
  p.quadraticCurveTo(-22, -178, -19, -192);
  p.closePath();

  const ue = armUp;
  const wave = Math.sin(beatF * Math.PI) * 6 * ue;
  const free = [[24, -156], [30 + 18 * ue, -128 - 32 * ue], [32 + 36 * ue + wave, -102 - 86 * ue]];
  const mic = [[-24, -156], [-31, -128], [-9, -170]];
  const strokeArm = (pts) => { x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); x.lineTo(pts[1][0], pts[1][1]); x.lineTo(pts[2][0], pts[2][1]); x.stroke(); };
  x.lineJoin = 'round'; x.lineCap = 'round';
  // rim light pass
  x.strokeStyle = rim; x.fillStyle = rim;
  x.lineWidth = 4.5; x.stroke(p);
  x.lineWidth = 11.5; strokeArm(free); strokeArm(mic);
  x.beginPath(); x.arc(-3, -186, 6.5, 0, Math.PI * 2); x.fill();
  // body pass
  const dark = '#0a0310';
  x.fillStyle = dark; x.strokeStyle = dark;
  x.fill(p);
  x.lineWidth = 7; strokeArm(free); strokeArm(mic);
  x.lineWidth = 3; x.beginPath(); x.moveTo(-9, -170); x.lineTo(-4, -182); x.stroke();
  x.beginPath(); x.arc(-3, -186, 4.5, 0, Math.PI * 2); x.fill();
  x.restore();
}

const SHOTS = [ // per bar: [zoom, cx, cy, push per bar] — the studio cameras cut on the bar
  [1, 320, 240, 0], [1, 320, 240, 0.03],
  [1.85, 320, 236, 0.02], [1.87, 320, 236, 0.02], [1.89, 324, 236, 0.02], [1.91, 324, 236, 0.02],
  [1.0, 320, 240, 0.06], [1.12, 320, 244, 0.06],
  [2.5, 320, 196, 0.03], [2.53, 320, 196, 0.03], [2.56, 318, 196, 0.03], [2.6, 318, 196, 0.03],
  [1, 320, 240, 0], [1, 320, 240, 0], [1.4, 320, 255, 0.04], [1.44, 320, 255, 0.04],
];

const BEAMS = [[96, -30, '255,190,235'], [544, -30, '170,225,255'], [236, -50, '255,236,200'], [404, -50, '255,150,215']];

function drawPerformance(x, songT) {
  const bar = Math.min(15, Math.floor(songT / BAR));
  const inBar = (songT - bar * BAR) / BAR;
  const beatF = songT / BEAT;
  const chorus = bar >= 12;
  const [z0, cx, cy, push] = SHOTS[bar];
  const z = z0 + push * inBar;

  x.save();
  x.translate(320, 240); x.scale(z, z); x.translate(-cx, -cy);
  x.drawImage(cached('ch3:stage', DW, DH, buildStage), 0, 0);

  x.globalCompositeOperation = 'lighter';
  // bulb chase
  const chase = Math.floor(beatF * 2);
  const bulb = glowSprite('255,214,150');
  for (let i = 0; i < ARCH.length; i++) {
    const on = chorus ? (i + Math.floor(beatF)) % 2 === 0 : (i + chase) % 4 === 0;
    if (!on) continue;
    const [bx, by] = ARCH[i];
    x.globalAlpha = 0.9; x.drawImage(bulb, bx - 11, by - 11, 22, 22);
    if (by > 250) { x.globalAlpha = 0.22; x.drawImage(bulb, bx - 4, 338 + (338 - by) * 0.45 - 12, 8, 30); }
  }
  // spotlights
  const sp = chorus ? 1.6 : 0.7;
  for (let i = 0; i < BEAMS.length; i++) {
    const [bx, by, col] = BEAMS[i];
    const tx = 320 + Math.sin(gclock() * sp + i * 1.9) * (i < 2 ? 150 : 60);
    const ty = 410;
    const w = i < 2 ? 70 : 46;
    const gr = x.createLinearGradient(bx, by, tx, ty);
    gr.addColorStop(0, `rgba(${col},0.42)`); gr.addColorStop(1, `rgba(${col},0)`);
    x.fillStyle = gr; x.globalAlpha = chorus ? 0.9 : 0.75;
    x.beginPath(); x.moveTo(bx - 6, by); x.lineTo(bx + 6, by); x.lineTo(tx + w, ty); x.lineTo(tx - w, ty); x.closePath(); x.fill();
    x.globalAlpha = 0.35; x.drawImage(glowSprite(col), tx - 90, ty - 22, 180, 44);
  }
  // backlight + floor pool
  x.globalAlpha = 0.65; x.drawImage(glowSprite('255,150,215'), 320 - 170, 410 - 330, 340, 340);
  x.globalAlpha = 0.5; x.drawImage(glowSprite('255,220,240'), 320 - 120, 395 - 26, 240, 52);
  x.globalCompositeOperation = 'source-over';
  x.globalAlpha = 1;

  // the singer
  const armUp = chorus ? 0.85 + 0.15 * Math.sin(beatF * Math.PI * 0.5) : bar >= 8 ? 0.35 : 0.1 * (1 + Math.sin(beatF * 0.5));
  x.save(); x.translate(320, 404); x.scale(1.2, 1.2);
  idol(x, beatF, armUp, chorus && Math.floor(beatF) % 2 === 0 ? 'rgba(255,235,250,0.95)' : 'rgba(255,190,230,0.85)');
  x.restore();

  // haze + chorus flashes
  if (chorus) {
    const k = 1 - (beatF % 1);
    if (Math.floor(beatF) % 4 === 0) { x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.18 * k * k; x.fillStyle = '#ffe6f6'; x.fillRect(0, 0, DW, DH); }
  }
  x.restore();
  x.globalCompositeOperation = 'source-over';
  x.globalAlpha = 1;

  // telops
  x.drawImage(cached('ch3:rerun', 80, 32, buildRerun), 500, 44);
  if (bar >= 2 && bar < 7) {
    const reveal = clamp((songT - 2 * BAR) / 0.3);
    const tel = cached('ch3:telop', 460, 92, buildTelop);
    x.save();
    x.beginPath(); x.rect(60, 330, 460 * reveal, 100); x.clip();
    x.drawImage(tel, 62, 332);
    x.restore();
  }
  if (bar < 2) {
    x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillRect(0, 398, DW, 34);
    txt(x, 'この番組は1985年10月に放送したものです', 320, 422, { font: `18px ${F.dot}`, align: 'center', color: '#f2f2f2' });
    sub(x, ['NIGHT STUDIO \'85 (RERUN)', 'First broadcast October 1985'], 470, '#55ffff');
  } else if (bar < 7) sub(x, '\u266a "Midnight Signal"  —  Akari Minase', 470);
  else if (bar >= 12) sub(x, '\u266a (instrumental)', 470, '#ffffff');
}

// ---- split-flap board ----
function flapCell(ch, w, h) {
  return cached(`ch3:flap:${w}x${h}:${ch}`, w, h, (x) => {
    const gr = x.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#2c2c33'); gr.addColorStop(0.5, '#1d1d22'); gr.addColorStop(0.5, '#141418'); gr.addColorStop(1, '#202026');
    x.fillStyle = gr; x.fillRect(1, 1, w - 2, h - 2);
    if (ch !== ' ') txt(x, ch, w / 2, h / 2 + 1, { font: `700 ${Math.round(h * 0.62)}px ${F.goth}`, align: 'center', base: 'middle', color: '#f4f1e6' });
    x.fillStyle = '#050507'; x.fillRect(0, h / 2 - 1, w, 2);
    x.fillStyle = '#5a5a62'; x.fillRect(1, h / 2 - 3, 3, 6); x.fillRect(w - 4, h / 2 - 3, 3, 6);
  });
}

const RATE = 14;
function drawFlap(x, X, Y, w, h, finalCh, pool, b, ts, seed) {
  const hh = h / 2;
  let prev, cur, f;
  if (b < 0.45) { prev = cur = ' '; f = 1; }
  else if (b >= ts + 1 / RATE) { prev = cur = finalCh; f = 1; }
  else if (b >= ts) {
    prev = pool[(Math.floor(ts * RATE) + seed) % pool.length]; cur = finalCh; f = (b - ts) * RATE;
  } else {
    const k = b * RATE, i = Math.floor(k);
    prev = pool[(i - 1 + seed + pool.length * 4) % pool.length]; cur = pool[(i + seed) % pool.length]; f = k - i;
  }
  const C = flapCell(cur, w, h), Pv = flapCell(prev, w, h);
  x.drawImage(C, 0, 0, w, hh, X, Y, w, hh);
  x.drawImage(Pv, 0, hh, w, hh, X, Y + hh, w, hh);
  if (f < 0.5) {
    const s = 1 - f * 2;
    x.drawImage(Pv, 0, 0, w, hh, X, Y + hh - hh * s, w, hh * s);
    x.fillStyle = `rgba(0,0,0,${0.5 * (1 - s)})`; x.fillRect(X, Y + hh - hh * s, w, hh * s);
  } else if (f < 1) {
    const s = f * 2 - 1;
    x.drawImage(C, 0, hh, w, hh, X, Y + hh, w, hh * s);
    x.fillStyle = `rgba(255,255,255,${0.12 * (1 - s)})`; x.fillRect(X, Y + hh, w, hh * s);
  }
}

function buildBoardBg(x) {
  const bg = x.createLinearGradient(0, 0, 0, DH);
  bg.addColorStop(0, '#0a1440'); bg.addColorStop(1, '#030719');
  x.fillStyle = bg; x.fillRect(0, 0, DW, DH);
  x.strokeStyle = 'rgba(120,160,255,0.08)'; x.lineWidth = 1;
  for (let i = 0; i <= DW; i += 32) { x.beginPath(); x.moveTo(i + 0.5, 0); x.lineTo(i + 0.5, DH); x.stroke(); }
  for (let j = 0; j <= DH; j += 32) { x.beginPath(); x.moveTo(0, j + 0.5); x.lineTo(DW, j + 0.5); x.stroke(); }
  // board housing
  x.fillStyle = '#0b0b0f'; x.fillRect(50, 140, 540, 190);
  x.strokeStyle = '#c9a54a'; x.lineWidth = 3; x.strokeRect(50, 140, 540, 190);
  x.strokeStyle = 'rgba(201,165,74,0.4)'; x.lineWidth = 1; x.strokeRect(56, 146, 528, 178);
  txt(x, '今週の', 64, 124, { font: `700 24px ${F.goth}`, color: '#ffe36b', stroke: '#7a1030', sw: 5 });
  txt(x, 'ランキング', 156, 124, { font: `700 18px ${F.goth}`, color: '#ffffff' });
  txt(x, '位', 132, 214, { font: `700 30px ${F.goth}`, color: '#ffe36b' });
  txt(x, '点', 552, 296, { font: `700 22px ${F.goth}`, color: '#ffe36b' });
}

function drawBoard(x, b) {
  x.drawImage(cached('ch3:boardbg', DW, DH, buildBoardBg), 0, 0);
  const pool = KANA;
  [...TITLE].forEach((ch, i) => drawFlap(x, 168 + i * 44, 168, 42, 58, ch, pool, b, 1.0 + i * 0.11 + hash(i) * 0.12, i * 7));
  [...ARTIST].forEach((ch, i) => drawFlap(x, 168 + i * 44, 252, 42, 54, ch, pool, b, 1.8 + i * 0.12 + hash(i + 9) * 0.1, i * 5 + 3));
  [...POINTS].forEach((ch, i) => drawFlap(x, 410 + i * 34, 252, 32, 54, ch, DIGITS, b, 2.5 + i * 0.16, i * 3));
  drawFlap(x, 66, 160, 58, 72, '3', DIGITS, b, 4.55, 1);
  if (b > 4.6) {
    const k = clamp((b - 4.6) / 0.25);
    x.globalCompositeOperation = 'lighter';
    x.globalAlpha = 0.7 * (1 - k * 0.6);
    x.drawImage(glowSprite('255,220,120'), 95 - 70, 196 - 70, 140, 140);
    x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    txt(x, '先週 5位 → 今週 3位', 168, 360, { font: `18px ${F.dot}`, color: '#ffe36b' });
  }
  x.drawImage(cached('ch3:logo', 240, 56, buildLogo), 56, 34);
  x.drawImage(cached('ch3:rerun', 80, 32, buildRerun), 500, 44);
  sub(x, b > 4.6 ? ['THIS WEEK\'S No. 3  (up from No. 5)', '"Midnight Signal" — Akari Minase · 8640 pts'] : 'THIS WEEK\'S RANKING...', 470);
}

let EVENTS = null;
export default {
  name: "夜のスタジオ'85",
  draw(g, t, W, H) {
    adopt(g); kickFonts();
    const x = stage();
    const p = gclock() % PERIOD;
    if (p < BOARD) drawBoard(x, p);
    else drawPerformance(x, p - BOARD);
    broadcast(g, W, H, { noise: 0.05, ghostA: 0.07, smear: 0.32, chroma: 0.62 });
  },
  warm(audio) { clatterBuffer(audio); if (!EVENTS) EVENTS = buildEvents(); },
  start(audio, dest) {
    if (!EVENTS) EVENTS = buildEvents();
    return timeline(audio, dest, {
      period: PERIOD,
      gain: 0.45,
      events: EVENTS.slice(),
      setup(e) {
        e.gate = makeGate(e.A, e.bus, 0.7);
        e.lead = e.ac.createGain();
        e.lead.gain.value = 0.9;
        e.lead.connect(e.bus);
        e.lead.connect(makeDelay(e.A, e.bus, BEAT * 0.75, 0.32, 0.3, 2600));
      },
    });
  },
};
