// 8ch — snow. But if you look, there is a picture underneath, rolling, barely holding sync:
// a starfield, two fleets in formation, a dual calendar. Somebody far away is broadcasting a
// space opera at 1 a.m. (Homage only: no characters, no ships you could name.)
import { F, DW, DH, wantFont, kickFonts, adopt, cached, stage, stageCanvas, gclock, txt, glowSprite, clamp, smooth, hash, vnoise, timeline, EN } from './common.js';
import { drawSnow, snowSound } from './snow.js';
import { pad, snare } from './synth.js';

wantFont(`600 28px ${F.serif}`, '宇宙暦796年帝国暦487年');

/** How much of the ghost gets through right now (0..~0.5). Shared by picture and sound. */
export function ghostLevel(G) {
  const base = 0.1 + 0.07 * vnoise(G * 0.35);
  const surge = smooth(0.62, 1, vnoise(G * 0.085 + 3.1)) * 0.3;
  return base + surge;
}

function buildSky(x) {
  x.fillStyle = '#000'; x.fillRect(0, 0, DW, DH);
  for (let i = 0; i < 420; i++) {
    const b = Math.pow(hash(i * 3 + 1), 3);
    x.fillStyle = `rgba(255,255,255,${0.25 + b * 0.75})`;
    const s = b > 0.6 ? 2 : 1;
    x.fillRect(hash(i * 7 + 2) * DW, hash(i * 11 + 5) * DH, s, s);
  }
  // a planet's limb, lower right
  const g = x.createRadialGradient(640, 760, 300, 640, 760, 420);
  g.addColorStop(0, 'rgba(70,90,140,0.9)'); g.addColorStop(0.92, 'rgba(120,150,210,0.8)'); g.addColorStop(1, 'rgba(160,190,255,0)');
  x.fillStyle = g; x.beginPath(); x.arc(640, 760, 420, 0, Math.PI * 2); x.fill();
  txt(x, '宇宙暦796年', 72, 392, { font: `600 28px ${F.serif}`, color: '#ffffff' });
  txt(x, '帝国暦487年', 74, 424, { font: `600 18px ${F.serif}`, color: '#d8dcff' });
}

// formations: a crescent advancing right, a block advancing left
const FLEET_A = [], FLEET_B = [];
for (let r = 0; r < 5; r++) for (let c = 0; c < 9; c++) {
  const yy = (r - 2) * 11 + (c - 4) * (c - 4) * 0.9;
  FLEET_A.push([c * 13 - Math.abs(r - 2) * 6 + hash(r * 9 + c) * 3, yy * 1.0 + (c - 4) * 9]);
}
for (let r = 0; r < 6; r++) for (let c = 0; c < 7; c++) FLEET_B.push([c * 12 + (r % 2) * 5, r * 10 + hash(r * 7 + c + 50) * 2]);

function drawGhost(x, G) {
  x.drawImage(cached('ch8:sky', DW, DH, buildSky), 0, 0);
  if (EN()) txt(x, 'U.C. 796  /  I.C. 487', 74, 450, { font: `22px ${F.vt}`, color: '#ffff55' });
  const ax = 70 + (G * 2.2) % 110, ay = 200;
  const bx = 460 - (G * 1.6) % 90, by = 140;
  x.fillStyle = '#ffffff';
  for (const [dx, dy] of FLEET_A) { x.fillRect(ax + dx * 1.3, ay + dy * 1.2, 10, 3); x.fillRect(ax + dx * 1.3 + 6, ay + dy * 1.2 - 2, 3, 7); }
  x.fillStyle = '#ffe6dc';
  for (const [dx, dy] of FLEET_B) { x.fillRect(bx + dx * 1.2, by + dy * 1.2, 9, 3); x.fillRect(bx + dx * 1.2, by + dy * 1.2 - 2, 3, 7); }
  // exchanges of fire, now and then
  const k = Math.floor(G * 3);
  if (hash(k) < 0.5) {
    const s = FLEET_B[(hash(k + 1) * FLEET_B.length) | 0], d = FLEET_A[(hash(k + 2) * FLEET_A.length) | 0];
    x.strokeStyle = 'rgba(255,255,255,0.8)'; x.lineWidth = 1;
    x.beginPath(); x.moveTo(bx + s[0] * 1.2, by + s[1] * 1.2); x.lineTo(ax + d[0] * 1.3 + 8, ay + d[1] * 1.2); x.stroke();
    x.globalCompositeOperation = 'lighter';
    x.drawImage(glowSprite('255,240,210'), ax + d[0] * 1.3 - 8, ay + d[1] * 1.2 - 12, 28, 28);
    x.globalCompositeOperation = 'source-over';
  }
}

export default {
  name: '砂嵐',
  draw(g, t, W, H) {
    adopt(g); kickFonts();
    drawSnow(g, t, W, H);
    const G = gclock();
    const lv = ghostLevel(G);
    const x = stage();
    drawGhost(x, G);
    const pc = stageCanvas();
    // weak signal: no vertical hold (rolling), unsteady horizontal sync (tearing)
    const roll = (G * 22) % DH;
    const sy = H / DH, sx = W / DW;
    g.save();
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = lv;
    g.imageSmoothingEnabled = true;
    const strips = 6, sh = DH / strips;
    for (let i = 0; i < strips; i++) {
      const tear = (vnoise(G * 7 + i * 3.7) - 0.5) * 14 * (1 - lv);
      for (const off of [0, -DH]) {
        const y = i * sh + roll + off;
        if (y + sh < 0 || y > DH) continue;
        g.drawImage(pc, 0, i * sh, DW, sh, tear * sx, y * sy, W, sh * sy);
      }
    }
    // the vertical blanking bar rolling through
    const by = (roll - 18 + DH) % DH;
    g.globalAlpha = lv * 1.6;
    g.fillStyle = '#000';
    g.fillRect(0, by * sy, W, 16 * sy);
    g.restore();
  },
  start(audio, dest) {
    const snow = snowSound(audio, dest);
    // a distant orchestra under the hiss: a slow minor chorale and a faint snare ostinato
    const CH = [[38, 50, 57, 62, 65], [34, 46, 53, 58, 62], [31, 43, 50, 55, 58], [33, 45, 52, 57, 61]];
    const BEAT = 60 / 72, BAR = BEAT * 3;
    const events = [];
    CH.forEach((ch, i) => events.push({ t: i * BAR * 2, fn: (e, w) => pad(e.A, e.ghost, w, ch, BAR * 2, 1.2, 1200, 1.2) }));
    const A = [0, 0.5, 0.667, 0.833, 1, 1.5, 1.667, 1.833, 2, 2.5];
    const B = [0, 0.5, 0.667, 0.833, 1, 1.5, 1.667, 1.833, 2, 2.167, 2.333, 2.5, 2.667, 2.833];
    for (let bar = 0; bar < 8; bar++) for (const b of bar % 2 ? B : A) events.push({ t: (bar * 3 + b) * BEAT, fn: (e, w) => snare(e.A, e.ghost, w, 0.22) });
    const tl = timeline(audio, dest, {
      period: BAR * 8,
      gain: 1,
      events,
      setup(e) {
        const ac = e.ac;
        e.ghost = ac.createGain();
        const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.55;
        e.ghostAmp = ac.createGain(); e.ghostAmp.gain.value = 0;
        e.ghost.connect(bp).connect(e.ghostAmp).connect(e.bus);
      },
      tick(e, G, acNow) {
        e.ghostAmp.gain.setTargetAtTime(clamp(ghostLevel(G) * 1.6, 0, 0.8), acNow, 0.08);
      },
    });
    return { stop() { snow.stop(); tl.stop(); }, setLevel: snow.setLevel };
  },
};
