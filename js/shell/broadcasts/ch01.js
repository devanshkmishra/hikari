// 1ch — 放送終了. ひかり放送 has signed off for the night: a station clock card, then colour
// bars with the 1 kHz line-up tone, around and around until the morning.
import { F, DW, DH, wantFont, kickFonts, adopt, cached, stage, broadcast, gclock, wall, pad2, txt, timeline, sub } from './common.js';
import { bell, pad } from './synth.js';

const PERIOD = 24, CARD = 9;
const CX = 196, CY = 206, R = 116;

wantFont(`800 50px ${F.mincho}`, 'ひかり放送');
wantFont(`22px ${F.dot}`, '本日の放送はすべて終了いたしました。明日は午前5時55分から放送いたします。夏ヶ原送信所映像出力音声おやすみなさいひかり放送');
wantFont(`16px ${F.serif}`, 'おやすみなさい');
wantFont(`24px ${F.vt}`, 'HIKARI TELEVISION VHF 1ch 0123456789:kW.');

const rgb = (a) => `rgb(${a[0]},${a[1]},${a[2]})`;

export function emblem(x, cx, cy, r, col) {
  x.save();
  x.strokeStyle = col; x.fillStyle = col; x.lineCap = 'round';
  x.lineWidth = Math.max(1.5, r * 0.11);
  x.beginPath(); x.arc(cx, cy, r * 0.6, 0, Math.PI * 2); x.stroke();
  x.beginPath(); x.arc(cx, cy, r * 0.25, 0, Math.PI * 2); x.fill();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const r0 = r * 0.8, r1 = i % 3 === 0 ? r * 1.1 : r * 0.95;
    x.beginPath();
    x.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    x.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    x.stroke();
  }
  x.restore();
}

// EIA/SMPTE-style bars. NTSC-J has no 7.5 IRE setup, so black really is black.
function buildBars(x) {
  const top = [[191, 191, 191], [191, 191, 0], [0, 191, 191], [0, 191, 0], [191, 0, 191], [191, 0, 0], [0, 0, 191]];
  const mid = [[0, 0, 191], [8, 8, 8], [191, 0, 191], [8, 8, 8], [0, 191, 191], [8, 8, 8], [191, 191, 191]];
  const bw = DW / 7;
  for (let i = 0; i < 7; i++) {
    const x0 = Math.round(i * bw), w = Math.round((i + 1) * bw) - x0;
    x.fillStyle = rgb(top[i]); x.fillRect(x0, 0, w, 320);
    x.fillStyle = rgb(mid[i]); x.fillRect(x0, 320, w, 40);
  }
  const bb = (bw * 5) / 4;
  const bot = [[0, 33, 76], [235, 235, 235], [50, 0, 106], [8, 8, 8]];
  for (let i = 0; i < 4; i++) {
    const x0 = Math.round(i * bb), w = Math.round((i + 1) * bb) - x0;
    x.fillStyle = rgb(bot[i]); x.fillRect(x0, 360, w, 120);
  }
  const px = Math.round(4 * bb), pw = bw / 3;
  x.fillStyle = rgb([8, 8, 8]); x.fillRect(px, 360, DW - px, 120);
  x.fillStyle = rgb([0, 0, 0]); x.fillRect(px, 360, Math.round(pw), 120);
  x.fillStyle = rgb([20, 20, 20]); x.fillRect(Math.round(px + 2 * pw), 360, Math.round(pw), 120);
  // station tag in the black block
  const cx = 3.5 * bb;
  emblem(x, cx - 38, 392, 9, '#cfcfcf');
  txt(x, 'ひかり放送', cx + 8, 398, { font: `16px ${F.dot}`, align: 'center', color: '#d6d6d6' });
  txt(x, 'VHF 1ch', cx, 422, { font: `20px ${F.vt}`, align: 'center', color: '#9a9a9a', spacing: 2 });
}

function buildCard(x) {
  const bg = x.createLinearGradient(0, 0, 0, DH);
  bg.addColorStop(0, '#08133d'); bg.addColorStop(0.55, '#15296a'); bg.addColorStop(1, '#071030');
  x.fillStyle = bg; x.fillRect(0, 0, DW, DH);
  x.fillStyle = 'rgba(255,255,255,0.025)';
  for (let y = 0; y < DH; y += 4) x.fillRect(0, y, DW, 1);
  const halo = x.createRadialGradient(CX, CY, 40, CX, CY, 230);
  halo.addColorStop(0, 'rgba(130,160,255,0.28)'); halo.addColorStop(1, 'rgba(130,160,255,0)');
  x.fillStyle = halo; x.fillRect(0, 0, DW, DH);

  // bezel
  const bz = x.createLinearGradient(CX - R, CY - R, CX + R, CY + R);
  bz.addColorStop(0, '#e9ecf2'); bz.addColorStop(0.5, '#8a90a0'); bz.addColorStop(1, '#4b5060');
  x.fillStyle = bz; x.beginPath(); x.arc(CX, CY, R + 13, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#20253a'; x.beginPath(); x.arc(CX, CY, R + 3, 0, Math.PI * 2); x.fill();
  const face = x.createRadialGradient(CX - 30, CY - 40, 10, CX, CY, R);
  face.addColorStop(0, '#fbf6e6'); face.addColorStop(1, '#e2dac2');
  x.fillStyle = face; x.beginPath(); x.arc(CX, CY, R, 0, Math.PI * 2); x.fill();
  // ticks
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    x.save(); x.translate(CX, CY); x.rotate(a);
    x.fillStyle = '#1b2240';
    if (i % 5 === 0) x.fillRect(-3.5, -R + 8, 7, i % 15 === 0 ? 24 : 18);
    else x.fillRect(-1, -R + 8, 2, 7);
    x.restore();
  }
  emblem(x, CX, CY - 46, 11, '#1b2240');
  txt(x, 'ひかり放送', CX, CY + 54, { font: `13px ${F.dot}`, align: 'center', color: '#1b2240' });

  // right column
  emblem(x, 470, 122, 34, '#ffe6a3');
  txt(x, 'ひかり放送', 470, 218, { font: `800 50px ${F.mincho}`, align: 'center', color: '#fff5d8', shadow: 'rgba(0,0,10,0.55)', sx: 2, sy: 3 });
  txt(x, 'HIKARI TELEVISION', 470, 250, { font: `24px ${F.vt}`, align: 'center', color: '#c6d2ff', spacing: 3 });
  x.fillStyle = 'rgba(255,230,163,0.55)'; x.fillRect(382, 266, 176, 2);
  txt(x, '夏ヶ原送信所  VHF 1ch', 470, 294, { font: `16px ${F.dot}`, align: 'center', color: '#dde4ff' });
  txt(x, '映像出力10kW  音声出力2.5kW', 470, 318, { font: `16px ${F.dot}`, align: 'center', color: '#aab6e6' });
  txt(x, 'おやすみなさい', 470, 352, { font: `16px ${F.serif}`, align: 'center', color: '#ffe6a3' });

  // bottom band
  x.fillStyle = 'rgba(0,0,20,0.5)'; x.fillRect(0, 372, DW, 72);
  x.fillStyle = 'rgba(255,230,163,0.45)'; x.fillRect(0, 372, DW, 1); x.fillRect(0, 443, DW, 1);
  txt(x, '本日の放送はすべて終了いたしました。', 320, 403, { font: `22px ${F.dot}`, align: 'center', color: '#ffffff', shadow: 'rgba(0,0,0,0.6)' });
  txt(x, '明日は午前5時55分から放送いたします。', 320, 431, { font: `18px ${F.dot}`, align: 'center', color: '#d4dcfa' });
}

function hand(x, frac, len, w, col, tail = 0) {
  const a = frac * Math.PI * 2 - Math.PI / 2, c = Math.cos(a), s = Math.sin(a);
  x.strokeStyle = col; x.lineWidth = w; x.lineCap = 'round';
  x.beginPath(); x.moveTo(CX - c * tail, CY - s * tail); x.lineTo(CX + c * len, CY + s * len); x.stroke();
}

function drawHands(x) {
  const w = wall();
  const sec = w.s + Math.min(1, w.f * 9); // quartz tick with a quick snap
  const min = w.m + w.s / 60;
  const hr = (w.h % 12) + min / 60;
  x.save();
  x.shadowColor = 'rgba(0,0,0,0.25)'; x.shadowOffsetX = 2; x.shadowOffsetY = 3; x.shadowBlur = 0;
  hand(x, hr / 12, R * 0.52, 9, '#161c36', 12);
  hand(x, min / 60, R * 0.8, 6, '#161c36', 14);
  hand(x, sec / 60, R * 0.86, 2.2, '#d42a2f', 24);
  x.restore();
  x.fillStyle = '#d42a2f'; x.beginPath(); x.arc(CX, CY, 5, 0, Math.PI * 2); x.fill();
}

export default {
  name: '放送終了',
  draw(g, t, W, H) {
    adopt(g); kickFonts();
    const x = stage();
    const p = gclock() % PERIOD;
    if (p < CARD) {
      x.drawImage(cached('ch1:card', DW, DH, buildCard), 0, 0);
      drawHands(x);
      sub(x, ['Our broadcast day has ended.', 'We return at 5:55 a.m. Good night.'], 470);
    } else {
      x.drawImage(cached('ch1:bars', DW, DH, buildBars), 0, 0);
      const w = wall();
      txt(x, `${pad2(w.h)}:${pad2(w.m)}`, 3.5 * (DW / 7) * 1.25, 452, { font: `22px ${F.vt}`, align: 'center', color: '#bdbdbd' });
      sub(x, 'HIKARI TV  ·  off the air  ·  line-up tone', 300, '#ffffff');
    }
    broadcast(g, W, H, { noise: 0.03, ghostA: 0.05 });
  },
  start(audio, dest) {
    return timeline(audio, dest, {
      period: PERIOD,
      gain: 0.9,
      setup(e) {
        const ac = e.ac;
        e.tone = ac.createOscillator();
        e.tone.frequency.value = 1000;
        e.tg = ac.createGain();
        e.tg.gain.value = gclock() % PERIOD >= CARD ? 0.075 : 0;
        e.tone.connect(e.tg).connect(e.bus);
        e.tone.start();
        e.nodes.push(e.tone);
      },
      events: [
        { t: 0, fn: (e, w) => e.tg.gain.setTargetAtTime(0, w, 0.004) },
        { t: CARD, fn: (e, w) => e.tg.gain.setTargetAtTime(0.075, w, 0.004) },
        // a small sign-off chime over the clock card, then quiet
        ...[[81, 0.6], [77, 1.15], [79, 1.7], [72, 2.25], [77, 3.1]].map(([m, at], i) => ({
          t: at, fn: (e, w) => bell(e.A, e.bus, w, m, i === 4 ? 0.5 : 0.42, 2.4, 3.01),
        })),
        { t: 3.1, fn: (e, w) => pad(e.A, e.bus, w, [53, 60, 65, 69], 3.2, 0.35, 900, 0.8) },
      ],
    });
  },
};
