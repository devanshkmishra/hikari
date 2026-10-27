// 地下 — the basement. A concrete room, a riser, a truss, lasers in haze, and a crowd of
// procedural silhouettes that bounce, crouch before the drop, open a pit and crash into it.
// Everyone is a backlit shape until a flash fires; then you see who they were.

import { rng, pick, range, clamp, lerp, TAU, mixRGB, rgbCSS, hexRGB } from './util.js';

export const COL = {
  red: [255, 42, 42], acid: [216, 255, 58], violet: [138, 60, 255], white: [255, 250, 240],
  pink: [255, 90, 180], blue: [60, 90, 255], amber: [255, 170, 60],
};

const TOPS = ['#e9e5dc', '#1b1b1f', '#1b1b1f', '#b3202a', '#27377a', '#5f6a2a', '#cfc6b0', '#7d828c', '#ff5ab4', '#c8f03a', '#3a2a55', '#2a2a2e', '#d9d4c7', '#8a2be2'].map(hexRGB);
const PANTS = ['#2b3a55', '#1a1a1d', '#4a4f5a', '#6b6450', '#2f4a6a', '#151517'].map(hexRGB);
const HAIR = ['#0e0c0b', '#0e0c0b', '#1a1410', '#e8d9a0', '#ff8ac8', '#d8d8e0', '#3a2414', '#b22222'].map(hexRGB);
const SKIN = ['#f1c9a5', '#d9a77f', '#b07a52', '#7a4e33', '#e8b894', '#5a3a26'].map(hexRGB);
const HAIRS = ['spike', 'spike', 'twists', 'beanie', 'cap', 'hood', 'long', 'buzz', 'bun', 'puff'];

const ROOM = { xw: 7, ceil: 3.7, stageZ: 13.6, wallZ: 16, riser: 0.95 };
export const PIT = { x: 0.3, z: 7.6, r: 2.3 };

function makePerson(R, x, z, extra = {}) {
  const tall = range(R, 1.58, 1.9);
  return {
    bx: x, bz: z, ox: 0, oz: 0, vx: 0, vz: 0, tx: 0, tz: 0,
    h: tall, sw: range(R, 0.44, 0.62),
    hair: pick(R, HAIRS), top: pick(R, TOPS), pants: pick(R, PANTS), hairC: pick(R, HAIR), skin: pick(R, SKIN),
    style: R() < 0.45 ? 'jump' : R() < 0.6 ? 'nod' : 'sway',
    arms: R() < 0.3 ? 'pump' : R() < 0.45 ? 'phone' : 'down',
    side: R() < 0.5 ? -1 : 1,
    ph: R(), ph2: R() * TAU, amp: range(R, 0.6, 1.2),
    phoneWant: R(),
    mx: 0, mz: 0, mseed: R() * 100,
    bag: R() < 0.2,
    ...extra,
  };
}

export class Venue {
  constructor(tex, seed = 2026) {
    this.tex = tex;
    const R = (this.R = rng(seed));
    this.people = [];
    const specials = [
      makePerson(R, 1.05, 3.5, { kind: 'chain', h: 1.82, sw: 0.6, hair: 'spike', top: hexRGB('#1b1b1f'), hairC: hexRGB('#0e0c0b'), style: 'jump', arms: 'both', amp: 1.1 }),
      makePerson(R, -1.35, 5.3, { kind: 'scarf', h: 1.5, sw: 0.44, hair: 'bob', top: hexRGB('#151517'), hairC: hexRGB('#e6e6ee'), pants: hexRGB('#151517'), style: 'nod', arms: 'down', amp: 0.8 }),
    ];
    for (let z = 2.1; z < 13.1; z += 0.6) {
      for (let x = -6.5; x < 6.6; x += 0.6) {
        const front = (z - 2) / 11;
        if (R() > 0.2 + 0.5 * front) continue;
        const px = x + (R() - 0.5) * 0.36, pz = z + (R() - 0.5) * 0.3;
        if (specials.some((s) => Math.hypot(s.bx - px, s.bz - pz) < 0.55)) continue;
        this.people.push(makePerson(R, px, pz));
      }
    }
    this.people.push(...specials);
    this.chain = specials[0];
    this.scarf = specials[1];
    // scarf rope (local metres, relative to neck)
    this.rope = Array.from({ length: 11 }, (_, i) => ({ x: i * 0.085, y: i * 0.02, px: i * 0.085, py: i * 0.02 }));
    this.sneakerFly = null;
    this.surfer = null;
    this.phones = [];
    this.marks = {}; // screen positions of notable things (for arrows)
    this.lastPitBeat = -1;
    this.F = 600;
  }

  // ── simulation ─────────────────────────────────────────────────
  update(dt, S) {
    const { cam, music } = S;
    const sec = music ? music.sec.name : 'A';
    const bi = music ? music.sec.i : 0;
    const beats = music ? music.beats : S.t * 2.5;
    const beatN = Math.floor(beats);
    this.pit = sec === 'B' && (bi === 2 || bi === 3) ? 'open' : sec === 'B' && bi >= 4 && bi <= 6 ? 'mosh' : 'none';
    if (S.peak > 0) this.pit = 'none';
    const newBeat = beatN !== this.lastPitBeat;
    this.lastPitBeat = beatN;
    let near = 0;
    for (const p of this.people) {
      let tx = 0, tz = 0;
      const px = p.bx + p.ox, pz = p.bz + p.oz;
      // pit
      const dx = p.bx - PIT.x, dz = p.bz - PIT.z, d = Math.hypot(dx, dz) || 0.001;
      if (this.pit === 'open' && d < PIT.r + 0.4) { const push = PIT.r + 0.25 - d; tx += (dx / d) * push; tz += (dz / d) * push * 0.8; }
      if (this.pit === 'mosh' && d < PIT.r + 0.6) {
        if (newBeat || p.mx === 0) { p.mx = (Math.random() - 0.5) * 1.6; p.mz = (Math.random() - 0.5) * 1.2; }
        tx += p.mx - (dx / d) * 0.4; tz += p.mz - (dz / d) * 0.3;
      }
      // charge: the room tightens toward the centre line
      tx += -p.bx * 0.13 * S.charge;
      // you push through people
      const cx = px - cam.x, cz = pz - cam.z, cd = Math.hypot(cx, cz);
      if (cd < 0.85 && cz > -0.4) {
        const k = (0.85 - cd) / 0.85;
        tx += (cx >= 0 ? 1 : -1) * k * 0.9;
        tz += 0.25 * k;
        near += k;
      }
      p.tx = tx; p.tz = tz;
      const kS = this.pit === 'mosh' ? 26 : 10, kD = this.pit === 'mosh' ? 5 : 6.5;
      p.vx += ((tx - p.ox) * kS - p.vx * kD) * dt;
      p.vz += ((tz - p.oz) * kS - p.vz * kD) * dt;
      p.ox += p.vx * dt; p.oz += p.vz * dt;
    }
    this.nearCrowd = near;

    // scarf: verlet rope pinned at the neck, blown by the stage fans
    const r = this.rope;
    const wind = 1.6 + Math.sin(S.t * 1.7) * 0.9 + Math.sin(S.t * 4.3) * 0.4 + S.kick * 1.2;
    const bounceY = this.scarfBounce || 0;
    const prevB = this.prevScarfB || 0;
    r[0].x = 0; r[0].y = bounceY;
    const ddt = Math.min(dt, 1 / 30);
    for (let i = 1; i < r.length; i++) {
      const n = r[i];
      const vx = (n.x - n.px) * 0.96, vy = (n.y - n.py) * 0.96 - (bounceY - prevB) * 0.25;
      n.px = n.x; n.py = n.y;
      n.x += vx + wind * ddt * ddt * (0.6 + i * 0.08);
      n.y += vy + (0.9 + Math.sin(S.t * 6 + i) * 0.5) * ddt * ddt;
    }
    this.prevScarfB = bounceY;
    for (let it = 0; it < 4; it++) {
      for (let i = 1; i < r.length; i++) {
        const a = r[i - 1], b = r[i];
        const ex = b.x - a.x, ey = b.y - a.y, L = Math.hypot(ex, ey) || 0.0001;
        const diff = (L - 0.085) / L;
        if (i === 1) { b.x -= ex * diff; b.y -= ey * diff; }
        else { a.x += ex * diff * 0.5; a.y += ey * diff * 0.5; b.x -= ex * diff * 0.5; b.y -= ey * diff * 0.5; }
      }
      r[0].x = 0; r[0].y = bounceY;
    }

    // the sneaker
    const sf = this.sneakerFly;
    if (sf) {
      sf.vy -= 6.5 * dt;
      sf.x += sf.vx * dt; sf.y += sf.vy * dt; sf.z += sf.vz * dt;
      sf.rot += sf.spin * dt;
      sf.trail.unshift([sf.x, sf.y, sf.z, sf.rot]);
      if (sf.trail.length > 5) sf.trail.pop();
      if (sf.y < 1.4 && sf.vy < 0) this.sneakerFly = null;
    }
    // a crowd surfer heading for the stage
    const su = this.surfer;
    if (su) {
      su.z += dt * 1.3; su.x += Math.sin(S.t * 1.3) * dt * 0.4;
      su.roll = Math.sin(S.t * 3) * 0.15;
      if (su.z > 13) this.surfer = null;
    }
  }

  throwSneaker(cam) {
    if (this.sneakerFly) return false;
    const side = Math.random() < 0.5 ? -1 : 1;
    const z = Math.max(cam.z + 3.5, Math.min(11, cam.z + 4 + Math.random() * 3));
    this.sneakerFly = { x: -side * 4.2, y: 2.0, z, vx: side * (3.6 + Math.random()), vy: 5.2, vz: (Math.random() - 0.5) * 0.6, rot: 0, spin: side * (7 + Math.random() * 4), trail: [] };
    return true;
  }
  launchSurfer(cam) {
    if (this.surfer) return;
    this.surfer = { x: cam.x + (Math.random() - 0.5) * 2, z: cam.z + 1.6, roll: 0, top: pick(this.R, TOPS), pants: pick(this.R, PANTS), hairC: pick(this.R, HAIR), skin: pick(this.R, SKIN) };
  }

  // ── drawing ────────────────────────────────────────────────────
  draw(g, W, H, S) {
    const cam = S.cam;
    this.W_ = W; this.camZ = cam.z;
    const F = (this.F = 0.62 * H + 0.32 * W);
    const hy = H * (W < H ? 0.37 : 0.43) + (cam.pitch || 0) * H;
    const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
    const P = (x, y, z) => {
      const dx = x - cam.x, dz = z - cam.z;
      const rx = dx * cy - dz * sy, rz = dx * sy + dz * cy;
      if (rz < 0.05) return null;
      const k = F / rz;
      return [W / 2 + rx * k, hy - (y - cam.y) * k, rz, k];
    };
    this.P = P;
    const L = S.light; // { a: rgb, b: rgb, wash: rgb, int, beamInt, laser, laserCol, strobe, white }
    const flashLit = S.flash;
    const t = S.t;
    this.phones.length = 0;

    // ── room shell ──
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = '#060608'; g.fillRect(0, 0, W, H);
    const wallTL = P(-ROOM.xw, ROOM.ceil, ROOM.wallZ), wallBR = P(ROOM.xw, 0, ROOM.wallZ);
    if (wallTL && wallBR) {
      g.drawImage(this.tex.concrete, wallTL[0], wallTL[1], wallBR[0] - wallTL[0], wallBR[1] - wallTL[1]);
      g.fillStyle = `rgba(4,4,8,${0.72 - L.int * 0.25})`;
      g.fillRect(wallTL[0], wallTL[1], wallBR[0] - wallTL[0], wallBR[1] - wallTL[1]);
      this.quadImg(g, this.tex.banner, -2.5, 1.78, 2.5, 3.35, ROOM.wallZ - 0.02, 0.16 + L.int * 0.22);
      this.quadImg(g, this.tex.phoneBan, 3.15, 1.35, 4.05, 2.55, ROOM.wallZ - 0.02, 0.3 + L.int * 0.3);
      const sb = P(3.6, 1.95, ROOM.wallZ); if (sb) this.marks.sign = [sb[0], sb[1], sb[3]];
      this.quadImg(g, this.tex.tagGoth, -6.4, 0.6, -3.6, 1.6, ROOM.wallZ - 0.02, 0.5 + L.int * 0.3);
    }
    // side walls + ceiling + floor as single quads
    const zn = cam.z + 0.12;
    const quad = (pts, fill) => {
      const q = pts.map((p) => P(p[0], p[1], p[2]));
      if (q.some((v) => !v)) return;
      g.fillStyle = fill; g.beginPath(); g.moveTo(q[0][0], q[0][1]);
      for (let i = 1; i < q.length; i++) g.lineTo(q[i][0], q[i][1]);
      g.closePath(); g.fill();
    };
    const wash = L.wash;
    const wallCol = (k) => rgbCSS(mixRGB([22, 22, 26], wash, 0.12 + L.int * 0.1 * k), 1);
    quad([[-ROOM.xw, 0, zn], [-ROOM.xw, ROOM.ceil, zn], [-ROOM.xw, ROOM.ceil, ROOM.wallZ], [-ROOM.xw, 0, ROOM.wallZ]], wallCol(1));
    quad([[ROOM.xw, 0, zn], [ROOM.xw, ROOM.ceil, zn], [ROOM.xw, ROOM.ceil, ROOM.wallZ], [ROOM.xw, 0, ROOM.wallZ]], wallCol(1));
    quad([[-ROOM.xw, ROOM.ceil, zn], [ROOM.xw, ROOM.ceil, zn], [ROOM.xw, ROOM.ceil, ROOM.wallZ], [-ROOM.xw, ROOM.ceil, ROOM.wallZ]], '#0c0c0f');
    quad([[-ROOM.xw, 0, zn], [ROOM.xw, 0, zn], [ROOM.xw, 0, ROOM.wallZ], [-ROOM.xw, 0, ROOM.wallZ]], '#0a0a0c');
    // graffiti on the side walls
    this.wallImg(g, this.tex.tagBubble, -ROOM.xw + 0.01, 0.9, 2.5, 4.2, 9.2, 0.35 + L.int * 0.3);
    this.wallImg(g, this.tex.tagGlitch, ROOM.xw - 0.01, 1.5, 2.6, 5.5, 10.5, 0.35 + L.int * 0.3);
    this.wallImg(g, this.tex.tagScrawl, ROOM.xw - 0.01, 0.6, 1.4, 10.8, 13.4, 0.4 + L.int * 0.3);
    this.wallImg(g, this.tex.flier, -ROOM.xw + 0.01, 1.2, 2.1, 10.2, 10.85, 0.45 + L.int * 0.3);
    // pipes on the ceiling
    g.strokeStyle = '#17171b'; g.lineCap = 'butt';
    for (const [x, y, w] of [[-3.6, 3.52, 0.16], [-3.15, 3.58, 0.08], [2.1, 3.55, 0.2], [4.6, 3.5, 0.12]]) this.tube(g, x, y, zn + 0.2, ROOM.wallZ, w);

    // ── light beams (behind everyone) ──
    g.globalCompositeOperation = 'lighter';
    const back = P(0, 2.2, ROOM.wallZ - 0.5);
    if (back) {
      const rad = back[3] * 9;
      const gr = g.createRadialGradient(back[0], back[1], 0, back[0], back[1], rad);
      gr.addColorStop(0, rgbCSS(L.a, 0.5 * L.int + 0.08));
      gr.addColorStop(0.35, rgbCSS(L.b, 0.18 * L.int + 0.02));
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(back[0] - rad, back[1] - rad, rad * 2, rad * 2);
    }
    if (back) {
      // backlight through haze: soft rays fanning out from behind the decks
      const rays = 7;
      for (let i = 0; i < rays; i++) {
        const an = -Math.PI / 2 + (i / (rays - 1) - 0.5) * 2.4 + Math.sin(t * 0.3 + i) * 0.05;
        const len = back[3] * (7 + (i % 3) * 2);
        const wv = 0.06 + (i % 2) * 0.05;
        const ex = back[0] + Math.cos(an) * len, ey = back[1] + Math.sin(an) * len;
        const rg = g.createLinearGradient(back[0], back[1], ex, ey);
        const rc = i % 2 ? L.a : L.b;
        rg.addColorStop(0, rgbCSS(rc, (0.16 + 0.12 * S.kick) * L.int));
        rg.addColorStop(1, rgbCSS(rc, 0));
        g.fillStyle = rg;
        g.beginPath(); g.moveTo(back[0], back[1]);
        g.lineTo(back[0] + Math.cos(an - wv) * len, back[1] + Math.sin(an - wv) * len);
        g.lineTo(back[0] + Math.cos(an + wv) * len, back[1] + Math.sin(an + wv) * len);
        g.closePath(); g.fill();
      }
    }
    const fixtures = [-4.6, -2.8, -0.95, 0.95, 2.8, 4.6];
    fixtures.forEach((fx, i) => {
      const col = i % 2 ? L.a : L.b;
      const sw = Math.sin(t * L.sweep + i * 1.3);
      const tx = fx * 0.5 + sw * 3.4, tz = 4.5 + Math.cos(t * L.sweep * 0.7 + i) * 2.4;
      const inten = L.beamInt * (0.55 + 0.45 * S.kick) * (i % 2 ? 1 : 0.85);
      if (inten > 0.02) this.beam(g, fx, 3.38, 13.3, tx, 0.4, tz, 0.12, 1.5, col, inten);
    });
    // haze (texture), tinted by the wash under it
    const hz = this.tex.haze;
    g.globalAlpha = 0.16 + L.int * 0.12 + S.hazeBoost * 0.2;
    const hw = W * 1.6, hh = H * 0.9, off = (t * 12) % hw;
    g.drawImage(hz, -off, H * 0.05, hw, hh); g.drawImage(hz, hw - off, H * 0.05, hw, hh);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';

    // ── stage ──
    this.drawStage(g, S, P);

    // ── crowd + things in the crowd, far to near ──
    const items = [];
    for (const p of this.people) {
      const x = p.bx + p.ox, z = p.bz + p.oz;
      const dx = x - cam.x, dz = z - cam.z;
      const rz = dx * sy + dz * cy;
      if (rz < 0.45 || rz > 15) continue;
      items.push({ rz, p, x, z });
    }
    if (this.sneakerFly) { const s = this.sneakerFly; const rz = (s.x - cam.x) * sy + (s.z - cam.z) * cy; if (rz > 0.4) items.push({ rz, sneaker: s }); }
    if (this.surfer) { const s = this.surfer; const rz = (s.x - cam.x) * sy + (s.z - cam.z) * cy; if (rz > 0.6) items.push({ rz, surfer: s }); }
    items.sort((a, b) => b.rz - a.rz);
    const beats = S.music ? S.music.beats : t * 2.5;
    const secName = S.music ? S.music.sec.name : 'A';
    const energy = S.energy;
    for (const it of items) {
      if (it.sneaker) { this.drawSneaker(g, it.sneaker, P, flashLit); continue; }
      if (it.surfer) { this.drawSurfer(g, it.surfer, P, S); continue; }
      this.drawPerson(g, it.p, it.x, it.z, P, S, beats, secName, energy);
    }

    // ── haze veil in front of the crowd: the room is full of light you can see ──
    g.globalCompositeOperation = 'lighter';
    if (back) {
      const vg = g.createLinearGradient(0, back[1] - back[3] * 2.2, 0, H);
      vg.addColorStop(0, rgbCSS(L.a, 0));
      vg.addColorStop(0.18, rgbCSS(mixRGB(L.a, L.b, 0.5), 0.07 + 0.09 * L.int));
      vg.addColorStop(0.55, rgbCSS(L.wash, 0.035 * L.int));
      vg.addColorStop(1, rgbCSS(L.wash, 0));
      g.fillStyle = vg; g.fillRect(0, 0, W, H);
      g.globalAlpha = 0.07 + 0.05 * L.int;
      g.drawImage(hz, -((t * 20) % hw) * 0.7, H * 0.18, hw, hh * 0.8);
      g.globalAlpha = 1;
    }
    // ── lasers ──
    if (L.laser > 0.01) this.lasers(g, S, P);
    // phone screens glow
    for (const ph of this.phones) {
      const rad = ph[2] * 0.26;
      const gr = g.createRadialGradient(ph[0], ph[1], 0, ph[0], ph[1], rad);
      gr.addColorStop(0, 'rgba(190,215,255,0.16)'); gr.addColorStop(1, 'rgba(190,215,255,0)');
      g.fillStyle = gr; g.fillRect(ph[0] - rad, ph[1] - rad, rad * 2, rad * 2);
    }
    // chain glint
    if (this.marks.chainPt) {
      const [x, y, k] = this.marks.chainPt;
      const gl = clamp(Math.pow(Math.max(0, Math.sin(beats * Math.PI)), 10) * 0.9 + S.kick * 0.35 + flashLit * 1.5) * (0.6 + L.int * 0.6);
      if (gl > 0.05) this.glint(g, x, y, k * 0.32 * (0.5 + gl), gl);
    }
    // the light rising out of the crowd
    if (S.peak > 0) this.orb(g, S, P); else this.orbAt = null;
    g.globalCompositeOperation = 'source-over';
  }

  quadImg(g, img, x0, y0, x1, y1, z, bright = 1) {
    const a = this.P(x0, y1, z), b = this.P(x1, y0, z);
    if (!a || !b) return;
    g.drawImage(img, a[0], a[1], b[0] - a[0], b[1] - a[1]);
    if (bright < 1) { g.fillStyle = `rgba(4,4,8,${1 - bright})`; g.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]); }
  }

  // An image on a side wall (plane x = X), sliced for perspective.
  wallImg(g, img, X, y0, y1, z0, z1, bright = 1, n = 10) {
    const iw = img.width, ih = img.height;
    for (let j = 0; j < n; j++) {
      const za = z0 + ((z1 - z0) * j) / n, zb = z0 + ((z1 - z0) * (j + 1)) / n;
      const ta = this.P(X, y1, za), ba = this.P(X, y0, za), tb = this.P(X, y1, zb), bb = this.P(X, y0, zb);
      if (!ta || !ba || !tb || !bb) continue;
      const x = Math.min(ta[0], tb[0]), w = Math.abs(tb[0] - ta[0]) + 0.6;
      const top = (ta[1] + tb[1]) / 2, bot = (ba[1] + bb[1]) / 2;
      const sx = (iw * (X > 0 ? n - 1 - j : j)) / n;
      g.drawImage(img, sx, 0, iw / n, ih, x, top, w, bot - top);
      if (bright < 1) { g.fillStyle = `rgba(4,4,8,${1 - bright})`; g.fillRect(x, top, w, bot - top); }
    }
  }

  tube(g, x, y, z0, z1, w) {
    const a = this.P(x, y, z0), b = this.P(x, y, z1);
    if (!a || !b) return;
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L, ny = dx / L;
    const wa = (w * a[3]) / 2, wb = (w * b[3]) / 2;
    g.fillStyle = '#121216';
    g.beginPath();
    g.moveTo(a[0] + nx * wa, a[1] + ny * wa); g.lineTo(b[0] + nx * wb, b[1] + ny * wb);
    g.lineTo(b[0] - nx * wb, b[1] - ny * wb); g.lineTo(a[0] - nx * wa, a[1] - ny * wa);
    g.closePath(); g.fill();
  }

  beam(g, x0, y0, z0, x1, y1, z1, w0, w1, col, inten) {
    let a = this.P(x0, y0, z0), b = this.P(x1, y1, z1);
    if (!a) return;
    if (!b) {
      // clip toward camera
      const cz = this.camZ + 0.3;
      const u = (z0 - cz) / (z0 - z1);
      b = this.P(lerp(x0, x1, u), lerp(y0, y1, u), cz);
      if (!b) return;
      w1 = lerp(w0, w1, u);
    }
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L, ny = dx / L;
    const wa = Math.max(1, w0 * a[3]), wb = w1 * b[3];
    const gr = g.createLinearGradient(a[0], a[1], b[0], b[1]);
    gr.addColorStop(0, rgbCSS(col, 0.55 * inten));
    gr.addColorStop(0.45, rgbCSS(col, 0.16 * inten));
    gr.addColorStop(1, rgbCSS(col, 0.03 * inten));
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(a[0] + nx * wa, a[1] + ny * wa); g.lineTo(b[0] + nx * wb, b[1] + ny * wb);
    g.lineTo(b[0] - nx * wb, b[1] - ny * wb); g.lineTo(a[0] - nx * wa, a[1] - ny * wa);
    g.closePath(); g.fill();
    const lens = a[3] * 0.5;
    const lg = g.createRadialGradient(a[0], a[1], 0, a[0], a[1], lens);
    lg.addColorStop(0, rgbCSS([255, 255, 255], 0.9 * inten)); lg.addColorStop(0.25, rgbCSS(col, 0.5 * inten)); lg.addColorStop(1, rgbCSS(col, 0));
    g.fillStyle = lg; g.fillRect(a[0] - lens, a[1] - lens, lens * 2, lens * 2);
  }

  drawStage(g, S, P) {
    const L = S.light, t = S.t;
    const beats = S.music ? S.music.beats : t * 2.5;
    const bp = beats - Math.floor(beats);
    this.camZ = S.cam.z;
    // speakers
    for (const sx of [-5.4, 5.4]) {
      for (let k = 0; k < 2; k++) {
        const a = P(sx - 0.7, 0.05 + (k + 1) * 1.15, ROOM.stageZ + 0.1), b = P(sx + 0.7, 0.05 + k * 1.15, ROOM.stageZ + 0.1);
        if (!a || !b) continue;
        g.fillStyle = '#0d0d10'; g.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]);
        g.strokeStyle = rgbCSS(mixRGB([40, 40, 46], L.a, 0.3), 0.8); g.lineWidth = Math.max(1, a[3] * 0.02);
        g.strokeRect(a[0], a[1], b[0] - a[0], b[1] - a[1]);
        const cx = (a[0] + b[0]) / 2, cyy = (a[1] + b[1]) / 2, rr = (b[0] - a[0]) * 0.3 * (1 + S.kick * 0.07);
        g.fillStyle = '#050506'; g.beginPath(); g.arc(cx, cyy, rr, 0, TAU); g.fill();
        g.strokeStyle = rgbCSS(L.a, 0.25 + S.kick * 0.4); g.lineWidth = Math.max(1, rr * 0.08);
        g.beginPath(); g.arc(cx, cyy, rr * 0.8, 0, TAU); g.stroke();
        g.fillStyle = '#1a1a1f'; g.beginPath(); g.arc(cx, cyy, rr * 0.25, 0, TAU); g.fill();
        if (k === 0) { g.fillStyle = sx < 0 ? '#d8ff3a' : '#ff5ab4'; g.beginPath(); g.arc(a[0] + (b[0] - a[0]) * 0.18, a[1] + (b[1] - a[1]) * 0.15, rr * 0.18, 0, TAU); g.fill(); }
      }
    }
    // riser
    const ra = P(-4.4, ROOM.riser, ROOM.stageZ), rb = P(4.4, 0, ROOM.stageZ);
    if (ra && rb) {
      g.fillStyle = '#0b0b0d'; g.fillRect(ra[0], ra[1], rb[0] - ra[0], rb[1] - ra[1]);
      g.strokeStyle = 'rgba(200,200,190,0.35)'; g.lineWidth = Math.max(1, ra[3] * 0.04);
      g.beginPath(); g.moveTo(ra[0], ra[1] + 2); g.lineTo(rb[0], ra[1] + 2); g.stroke();
      for (const u of [0.22, 0.61]) { const x = lerp(ra[0], rb[0], u); g.beginPath(); g.moveTo(x - ra[3] * 0.2, ra[1] + ra[3] * 0.25); g.lineTo(x + ra[3] * 0.2, ra[1] + ra[3] * 0.65); g.moveTo(x + ra[3] * 0.2, ra[1] + ra[3] * 0.25); g.lineTo(x - ra[3] * 0.2, ra[1] + ra[3] * 0.65); g.stroke(); }
      g.fillStyle = 'rgba(224,38,31,0.7)'; g.font = `${Math.round(ra[3] * 0.5)}px "Mochiy Pop One", sans-serif`; g.textBaseline = 'middle';
      g.fillText('地下', lerp(ra[0], rb[0], 0.4), (ra[1] + rb[1]) / 2);
    }
    // DJ behind the table (faces you, lit from below by a laptop)
    const nod = Math.pow(Math.max(0, Math.sin(bp * Math.PI)), 2) * 0.05;
    const dj = P(-0.55, ROOM.riser, 15.0);
    if (dj) {
      g.setTransform(dj[3], 0, 0, dj[3], dj[0], dj[1]);
      g.fillStyle = '#060607';
      g.beginPath();
      g.ellipse(0, -1.62 + nod, 0.12, 0.13, 0, 0, TAU);
      g.moveTo(-0.3, -0.5); g.quadraticCurveTo(-0.3, -1.4, 0, -1.42); g.quadraticCurveTo(0.3, -1.4, 0.3, -0.5); g.closePath();
      g.fill();
      g.strokeStyle = '#060607'; g.lineWidth = 0.1; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-0.22, -1.32); g.lineTo(-0.2, -1.62 + nod); g.stroke(); // hand on headphone
      g.beginPath(); g.moveTo(0.24, -1.3); g.lineTo(0.35, -1.0); g.stroke();
      g.fillStyle = '#18181c'; g.fillRect(-0.17, -1.7 + nod, 0.05, 0.12); g.fillRect(0.12, -1.7 + nod, 0.05, 0.12);
      g.fillStyle = 'rgba(150,180,255,0.18)'; g.beginPath(); g.ellipse(0, -1.58 + nod, 0.09, 0.07, 0, 0, TAU); g.fill();
      g.setTransform(1, 0, 0, 1, 0, 0);
    }
    // table
    const ta = P(-1.25, ROOM.riser + 0.9, 14.55), tb = P(1.25, ROOM.riser, 14.55);
    if (ta && tb) {
      g.fillStyle = '#09090b'; g.fillRect(ta[0], ta[1], tb[0] - ta[0], tb[1] - ta[1]);
      g.fillStyle = 'rgba(140,170,255,0.55)';
      const lp = P(-0.35, ROOM.riser + 1.12, 14.6), lq = P(0.15, ROOM.riser + 0.9, 14.6);
      if (lp && lq) { g.fillRect(lp[0], lp[1], lq[0] - lp[0], lq[1] - lp[1]); g.fillStyle = '#ff5ab4'; g.fillRect(lp[0] + (lq[0] - lp[0]) * 0.6, lp[1] + (lq[1] - lp[1]) * 0.3, (lq[0] - lp[0]) * 0.15, (lq[1] - lp[1]) * 0.2); }
      g.fillStyle = 'rgba(216,255,58,0.8)';
      for (let i = 0; i < 6; i++) { const u = 0.62 + i * 0.05; g.fillRect(lerp(ta[0], tb[0], u), ta[1] + 2, Math.max(1, ta[3] * 0.025), Math.max(1, ta[3] * 0.025)); }
      g.font = `${Math.round(ta[3] * 0.35)}px "Mochiy Pop One", sans-serif`; g.fillStyle = 'rgba(255,255,255,0.8)'; g.textBaseline = 'middle';
      g.fillText('∞', lerp(ta[0], tb[0], 0.15), lerp(ta[1], tb[1], 0.55));
    }
    // performer: oversized hoodie, spiky hair, mic. Jumps on the beat; crouches when you charge.
    const pp = P(0.95, ROOM.riser, 14.15);
    if (pp) {
      const sec = S.music ? S.music.sec.name : 'A';
      const jumpAmp = sec === 'B' ? 0.35 : sec === 'A' ? 0.12 : sec === 'BUILD' ? 0.05 : 0;
      let jy = Math.pow(Math.max(0, Math.sin(bp * Math.PI)), 0.8) * jumpAmp + S.jump * 0.5;
      const crouch = S.charge * 0.25;
      g.setTransform(pp[3], 0, 0, pp[3], pp[0], pp[1] - jy * pp[3]);
      const rim = rgbCSS(mixRGB(L.a, [255, 255, 255], 0.3), 0.7 + 0.3 * L.int);
      const hh = 1.85 - crouch;
      g.beginPath();
      g.ellipse(0, -hh + 0.13, 0.13, 0.135, 0, 0, TAU);
      for (let k = 0; k < 6; k++) { const a = -2.6 + k * 0.42; g.moveTo(Math.cos(a) * 0.1, -hh + 0.13 + Math.sin(a) * 0.1); g.lineTo(Math.cos(a) * 0.24, -hh + 0.13 + Math.sin(a) * 0.24); g.lineTo(Math.cos(a + 0.2) * 0.1, -hh + 0.13 + Math.sin(a + 0.2) * 0.1); }
      g.moveTo(-0.36, -0.82); g.quadraticCurveTo(-0.38, -hh + 0.3, 0, -hh + 0.26); g.quadraticCurveTo(0.38, -hh + 0.3, 0.36, -0.82); g.closePath();
      g.moveTo(-0.3, -0.82); g.lineTo(-0.34, 0); g.lineTo(-0.06, 0); g.lineTo(0, -0.5); g.lineTo(0.06, 0); g.lineTo(0.34, 0); g.lineTo(0.3, -0.82);
      g.strokeStyle = rim; g.lineWidth = 0.05; g.lineJoin = 'round'; g.stroke();
      g.fillStyle = '#050506'; g.fill();
      const armUp = sec === 'B' || S.jump > 0.2 || S.peak > 0;
      g.lineCap = 'round';
      const armP = (sw) => { g.beginPath(); g.moveTo(sw * 0.3, -hh + 0.4); if (armUp) { g.lineTo(sw * 0.45, -hh + 0.05); g.lineTo(sw * (0.38 + Math.sin(bp * TAU) * 0.05), -hh - 0.35); } else { g.lineTo(sw * 0.42, -hh + 0.75); g.lineTo(sw * 0.14, -hh + 0.2); } };
      armP(-1); g.strokeStyle = rim; g.lineWidth = 0.17; g.stroke(); g.strokeStyle = '#050506'; g.lineWidth = 0.12; g.stroke();
      // mic arm
      g.beginPath(); g.moveTo(0.3, -hh + 0.4); g.lineTo(0.38, -hh + 0.62); g.lineTo(0.08, -hh + 0.2);
      g.strokeStyle = rim; g.lineWidth = 0.17; g.stroke(); g.strokeStyle = '#050506'; g.lineWidth = 0.12; g.stroke();
      g.fillStyle = '#9a9aa2'; g.beginPath(); g.arc(0.04, -hh + 0.17, 0.035, 0, TAU); g.fill();
      g.setTransform(1, 0, 0, 1, 0, 0);
    }
    // truss + fixtures
    const t0 = P(-5.8, 3.42, 13.3), t1 = P(5.8, 3.42, 13.3);
    if (t0 && t1) {
      g.strokeStyle = '#1c1c22'; g.lineWidth = Math.max(2, t0[3] * 0.12);
      g.beginPath(); g.moveTo(t0[0], t0[1]); g.lineTo(t1[0], t1[1]); g.stroke();
      g.lineWidth = Math.max(1, t0[3] * 0.02);
      for (let x = -5.8; x < 5.8; x += 0.35) { const a = P(x, 3.36, 13.3), b = P(x + 0.35, 3.48, 13.3); if (a && b) { g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); } }
    }
  }

  // Person: back view unless kind === 'chain' (he turned around to face the camera).
  drawPerson(g, p, x, z, P, S, beats, sec, energy) {
    const base = P(x, 0, z);
    if (!base) return;
    const [sx, sy0, rz, k] = base;
    if (sx < -k * 1.2 || sx > this.W_ + k * 1.2) return;
    const L = S.light;
    // motion
    const bp = beats + p.ph * (sec === 'B' ? 0.12 : 0.5);
    const frac = bp - Math.floor(bp);
    const sectionAmp = sec === 'B' ? 1 : sec === 'A' ? 0.55 : sec === 'BUILD' ? 0.3 : 0.12;
    let jump = 0;
    const hype = clamp(sectionAmp * (0.6 + energy * 0.6));
    if (p.style === 'jump') jump = Math.pow(Math.max(0, Math.sin(frac * Math.PI)), 0.75) * 0.17 * p.amp * hype;
    else if (p.style === 'nod') jump = Math.pow(Math.max(0, Math.sin(frac * Math.PI)), 2) * 0.04 * p.amp;
    if (this.pit === 'mosh' && Math.hypot(p.bx - PIT.x, p.bz - PIT.z) < PIT.r + 0.6) jump += Math.abs(Math.sin(beats * Math.PI * 2 + p.ph2)) * 0.12;
    jump += S.jump * (0.35 + p.amp * 0.25);
    const crouch = S.charge * (0.16 + p.amp * 0.06) * (1 - S.jump);
    const sway = Math.sin(S.t * 1.7 + p.ph2) * (p.style === 'sway' ? 0.06 : 0.025) + (this.pit === 'mosh' ? p.vx * 0.04 : 0);
    const h = p.h - crouch;
    if (p.kind === 'scarf') this.scarfBounce = -jump;
    // arms
    let arms = p.arms;
    const wantPhone = p.phoneWant < (sec === 'BUILD' ? 0.5 : sec === 'B' ? 0.12 : 0.14) + S.charge * 0.3 || (S.peak > 0 && p.phoneWant < 0.7);
    if (wantPhone && arms !== 'both') arms = 'phone';
    if ((sec === 'B' && p.phoneWant > 0.6 && p.kind !== 'scarf') || S.jump > 0.25) arms = arms === 'phone' ? 'phone' : 'both';
    if (p.kind === 'scarf') arms = sec === 'B' && frac < 0.5 ? 'pump' : 'down';
    const pump = Math.sin(frac * TAU) * 0.08;

    g.setTransform(k, 0, 0, k, sx + sway * k, sy0 - jump * k);
    const sw = p.sw, shY = -(h - 0.27), hipY = -h * 0.5, hr = p.kind === 'scarf' ? 0.105 : 0.115;
    const headY = -h + hr;
    // rim / silhouette colours (far people sit deeper in the haze)
    const fogK = clamp((rz - 2) / 12);
    const dark = mixRGB([5, 5, 8], mixRGB(L.wash, [14, 14, 20], 0.55), fogK * 0.28);
    const rimA = clamp(0.28 + L.int * 0.55) * (0.5 + fogK * 0.35);
    const rimC = S.peak > 0 ? [255, 246, 220] : mixRGB(L.a, L.b, (p.ph * 3) % 1);
    const lit = S.flash;
    const fl = clamp(2.2 / (rz * rz + 0.2)) * lit;

    const armPath = (side) => {
      const s = side;
      const shX = s * sw * 0.4, shYY = shY + 0.06;
      let ex, ey, hx, hy;
      const mode = arms === 'both' ? 'pump' : arms === 'pump' ? (s === p.side ? 'pump' : 'down') : arms === 'phone' ? (s === p.side ? 'phone' : 'down') : 'down';
      if (mode === 'pump') { ex = s * sw * 0.62; ey = shY - 0.2; hx = s * (sw * 0.5 + 0.05); hy = shY - 0.55 - pump - crouch * 0.4; }
      else if (mode === 'phone') { ex = s * sw * 0.36; ey = shY - 0.3; hx = s * 0.1; hy = shY - 0.62; }
      else { ex = s * sw * 0.53; ey = shY + 0.3; hx = s * sw * 0.47; hy = shY + 0.56; }
      return [shX, shYY, ex, ey, hx, hy, mode];
    };
    const A1 = armPath(-1), A2 = armPath(1);
    const strokeArm = (A) => { g.moveTo(A[0], A[1]); g.lineTo(A[2], A[3]); g.lineTo(A[4], A[5]); };

    const bodyPath = () => {
      g.beginPath();
      g.moveTo(-sw * 0.46, hipY + 0.12);
      g.lineTo(-sw * 0.5, shY + 0.1);
      g.quadraticCurveTo(-sw * 0.48, shY - 0.02, -sw * 0.24, shY - 0.035);
      g.lineTo(sw * 0.24, shY - 0.035);
      g.quadraticCurveTo(sw * 0.48, shY - 0.02, sw * 0.5, shY + 0.1);
      g.lineTo(sw * 0.46, hipY + 0.12);
      g.lineTo(sw * 0.4, -0.02); g.lineTo(sw * 0.07, -0.02); g.lineTo(0, hipY * 0.45); g.lineTo(-sw * 0.07, -0.02); g.lineTo(-sw * 0.4, -0.02);
      g.closePath();
      g.rect(-0.055, shY - 0.11, 0.11, 0.13);
    };
    const headPath = () => {
      g.moveTo(hr * 0.92, headY); g.ellipse(0, headY, hr * 0.92, hr, 0, 0, TAU);
      const hy = headY;
      switch (p.hair) {
        case 'spike': for (let i = 0; i < 6; i++) { const a = -2.55 + i * 0.33 + Math.sin(p.ph2 + i) * 0.06; const L2 = 1.35 + ((p.ph * 7 + i * 0.37) % 1) * 0.35; g.moveTo(Math.cos(a) * hr * 0.85, hy + Math.sin(a) * hr * 0.85); g.lineTo(Math.cos(a + 0.1) * hr * L2, hy + Math.sin(a + 0.1) * hr * L2 - 0.02); g.lineTo(Math.cos(a + 0.3) * hr * 0.85, hy + Math.sin(a + 0.3) * hr * 0.85); } break;
        case 'twists': for (let i = 0; i < 7; i++) { const a = -2.9 + i * 0.45; const cx = Math.cos(a) * hr * 1.05, cy = hy + Math.sin(a) * hr * 1.05; g.moveTo(cx + 0.04, cy); g.arc(cx, cy, 0.04, 0, TAU); } break;
        case 'beanie': g.moveTo(-hr * 1.05, hy - hr * 0.05); g.quadraticCurveTo(-hr * 1.1, hy - hr * 1.6, 0, hy - hr * 1.55); g.quadraticCurveTo(hr * 1.1, hy - hr * 1.6, hr * 1.05, hy - hr * 0.05); g.closePath(); break;
        case 'cap': g.rect(-hr * 1.0, hy - hr * 0.35, hr * 2.0, hr * 0.3); g.moveTo(-hr * 0.55, hy - hr * 0.35); g.lineTo(-hr * 0.4, hy + hr * 0.15); g.lineTo(hr * 0.4, hy + hr * 0.15); g.lineTo(hr * 0.55, hy - hr * 0.35); break;
        case 'hood': g.moveTo(-hr * 1.35, shY + 0.02); g.quadraticCurveTo(-hr * 1.5, hy - hr * 1.5, 0, hy - hr * 1.3); g.quadraticCurveTo(hr * 1.5, hy - hr * 1.5, hr * 1.35, shY + 0.02); g.closePath(); break;
        case 'long': g.rect(-hr * 0.95, hy, hr * 1.9, hr * 2.4); break;
        case 'bun': g.moveTo(0.06, hy - hr * 1.15); g.arc(0, hy - hr * 1.15, 0.06, 0, TAU); break;
        case 'puff': g.moveTo(hr * 1.3, hy - hr * 0.2); g.ellipse(0, hy - hr * 0.25, hr * 1.3, hr * 1.15, 0, 0, TAU); break;
        case 'bob': g.moveTo(-hr * 1.1, hy + hr * 0.9); g.quadraticCurveTo(-hr * 1.3, hy - hr * 1.4, 0, hy - hr * 1.15); g.quadraticCurveTo(hr * 1.3, hy - hr * 1.4, hr * 1.1, hy + hr * 0.9); g.closePath(); break;
        default: break;
      }
    };

    if (fl < 0.04) {
      // silhouette with a backlit rim
      g.lineJoin = 'round'; g.lineCap = 'round';
      const rw = Math.min(0.045, 2.1 / k);
      const rimS = rgbCSS(rimC, rimA), darkS = rgbCSS(dark, 1);
      // arms rim → body rim → arms → body, so only the outer outline of the union glows
      g.beginPath(); strokeArm(A1); strokeArm(A2);
      g.strokeStyle = rimS; g.lineWidth = 0.095 + rw * 2; g.stroke();
      bodyPath(); headPath();
      g.lineWidth = rw * 2; g.stroke();
      g.beginPath(); strokeArm(A1); strokeArm(A2);
      g.strokeStyle = darkS; g.lineWidth = 0.095; g.stroke();
      bodyPath(); headPath();
      g.fillStyle = darkS; g.fill();
      if (p.kind === 'scarf') this.drawScarf(g, shY, dark, rimC, rimA, 0);
      if (p.kind === 'chain') this.drawChainFront(g, sw, shY, h, hr, 0, p);
    } else {
      // the flash found them: colour, falloff, blown highlights
      const kk = 0.25 + fl * 1.15;
      const c = (rgb) => rgbCSS(mixRGB(dark, [rgb[0] * kk, rgb[1] * kk, rgb[2] * kk], clamp(fl * 1.4)), 1);
      g.lineJoin = 'round'; g.lineCap = 'round';
      g.beginPath();
      g.moveTo(-sw * 0.4, -0.02); g.lineTo(-sw * 0.46, hipY + 0.12); g.lineTo(sw * 0.46, hipY + 0.12); g.lineTo(sw * 0.4, -0.02); g.closePath();
      g.fillStyle = c(p.pants); g.fill();
      g.beginPath(); g.rect(-0.055, shY - 0.11, 0.11, 0.13); g.fillStyle = c(p.skin); g.fill();
      g.beginPath();
      g.moveTo(-sw * 0.46, hipY + 0.14); g.lineTo(-sw * 0.5, shY + 0.1); g.quadraticCurveTo(-sw * 0.48, shY - 0.02, -sw * 0.24, shY - 0.035);
      g.lineTo(sw * 0.24, shY - 0.035); g.quadraticCurveTo(sw * 0.48, shY - 0.02, sw * 0.5, shY + 0.1); g.lineTo(sw * 0.46, hipY + 0.14); g.closePath();
      g.fillStyle = c(p.top); g.fill();
      if (p.bag) { g.strokeStyle = c([30, 30, 30]); g.lineWidth = 0.035; g.beginPath(); g.moveTo(-sw * 0.3, shY); g.lineTo(sw * 0.38, hipY + 0.05); g.stroke(); }
      g.beginPath(); strokeArm(A1); strokeArm(A2); g.strokeStyle = c(p.top); g.lineWidth = 0.095; g.stroke();
      g.fillStyle = c(p.skin);
      for (const A of [A1, A2]) { g.beginPath(); g.arc(A[4], A[5], 0.045, 0, TAU); g.fill(); }
      g.beginPath(); headPath();
      g.fillStyle = c(p.kind === 'chain' ? p.skin : p.hair === 'beanie' || p.hair === 'cap' || p.hair === 'hood' ? p.top : p.hairC); g.fill();
      if (p.kind === 'scarf') this.drawScarf(g, shY, dark, [235, 230, 215], 1, fl);
      if (p.kind === 'chain') this.drawChainFront(g, sw, shY, h, hr, fl, p);
    }
    // phone in hand
    for (const A of [A1, A2]) {
      if (A[6] !== 'phone') continue;
      const px = A[4] - 0.045, py = A[5] - 0.17;
      g.fillStyle = '#0a0a0c'; g.fillRect(px - 0.008, py - 0.008, 0.106, 0.176);
      g.fillStyle = S.flash > 0.1 ? '#f4f8ff' : 'rgba(170,200,255,0.95)'; g.fillRect(px, py, 0.09, 0.16);
      g.fillStyle = rgbCSS(L.a, 0.9); g.fillRect(px + 0.012, py + 0.05, 0.066, 0.05);
      g.fillStyle = '#ff2a2a'; g.fillRect(px + 0.012, py + 0.012, 0.014, 0.014);
      this.phones.push([sx + (sway + A[4]) * k, sy0 - jump * k + (A[5] - 0.09) * k, k]);
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (p.kind === 'scarf') this.marks.scarf = [sx, sy0 - (h + 0.1) * k, k];
    if (p.kind === 'chain') this.marks.chain = [sx, sy0 - (h + 0.1) * k, k];
  }

  drawScarf(g, shY, dark, light, a, fl) {
    const r = this.rope;
    const col = fl > 0 ? rgbCSS(mixRGB([200, 196, 184], [255, 252, 240], clamp(fl)), 1) : rgbCSS(mixRGB([150, 146, 136], light, 0.25), 1);
    const rimc = rgbCSS(light, 0.5 * a);
    const ny = shY - 0.04;
    // wrap around the neck
    g.fillStyle = col;
    g.beginPath(); g.ellipse(0, ny + 0.02, 0.13, 0.055, 0, 0, TAU); g.fill();
    // the tails: two strands, tattered at the end
    for (let strand = 0; strand < 2; strand++) {
      const so = strand ? 0.035 : -0.02;
      for (let i = 1; i < r.length; i++) {
        const a0 = r[i - 1], a1 = r[i];
        const w = 0.1 * (1 - i / r.length) + 0.02;
        g.strokeStyle = fl > 0 ? col : (i % 3 ? col : rimc);
        g.lineWidth = w; g.lineCap = 'butt';
        g.beginPath();
        g.moveTo(a0.x + so * (i / r.length), ny + a0.y + so * 0.4);
        g.lineTo(a1.x + so * (i / r.length) * (strand ? 1.3 : 1), ny + a1.y + so * 0.4 + (strand ? i * 0.006 : 0));
        g.stroke();
      }
    }
  }

  drawChainFront(g, sw, shY, h, hr, fl, p) {
    // face (only readable under flash): sunglasses at night, obviously
    if (fl > 0) {
      g.fillStyle = '#060606';
      g.fillRect(-hr * 0.8, -h + hr * 0.75, hr * 1.6, hr * 0.38);
    }
    const cy = shY + 0.08;
    g.strokeStyle = fl > 0 ? '#f4f4f8' : 'rgba(200,205,215,0.85)';
    g.lineWidth = 0.022; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-sw * 0.18, shY - 0.02); g.quadraticCurveTo(0, cy + 0.18, sw * 0.18, shY - 0.02); g.stroke();
    g.fillStyle = g.strokeStyle; g.beginPath(); g.arc(0, cy + 0.11, 0.03, 0, TAU); g.fill();
    // remember where the pendant is on screen for the glint
    const m = g.getTransform();
    this.marks.chainPt = [m.a * 0 + m.c * (cy + 0.11) + m.e, m.b * 0 + m.d * (cy + 0.11) + m.f, m.a];
  }

  drawSneaker(g, s, P, flashLit) {
    const img = flashLit > 0.1 ? this.tex.sneakerLit : this.tex.sneakerDim;
    s.trail.forEach(([x, y, z, rot], i) => {
      const q = P(x, y, z); if (!q) return;
      const w = q[3] * 0.34, hgt = w * (img.height / img.width);
      g.save(); g.globalAlpha = i === 0 ? 1 : 0.16 / i;
      g.translate(q[0], q[1]); g.rotate(rot); g.drawImage(img, -w / 2, -hgt / 2, w, hgt);
      g.restore();
      if (i === 0) this.marks.sneaker = [q[0], q[1], q[3]];
    });
  }

  drawSurfer(g, s, P, S) {
    const q = P(s.x, 2.15, s.z);
    if (!q) return;
    const k = q[3];
    g.setTransform(k * Math.cos(-1.45 + s.roll), k * Math.sin(-1.45 + s.roll), -k * Math.sin(-1.45 + s.roll), k * Math.cos(-1.45 + s.roll), q[0], q[1]);
    const lit = S.flash > 0.1;
    const rim = rgbCSS(S.light.a, 0.6);
    g.beginPath();
    g.ellipse(0, -1.62, 0.11, 0.12, 0, 0, TAU);
    g.moveTo(-0.27, -0.8); g.lineTo(-0.28, -1.42); g.lineTo(0.28, -1.42); g.lineTo(0.27, -0.8); g.closePath();
    g.moveTo(-0.22, -0.82); g.lineTo(-0.2, 0); g.lineTo(-0.04, 0); g.lineTo(0, -0.5); g.lineTo(0.04, 0); g.lineTo(0.2, 0); g.lineTo(0.22, -0.82);
    g.strokeStyle = rim; g.lineWidth = 0.05; g.stroke();
    g.fillStyle = lit ? rgbCSS(s.top, 1) : '#060608'; g.fill();
    g.strokeStyle = lit ? rgbCSS(s.top, 1) : '#060608'; g.lineWidth = 0.11; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-0.25, -1.36); g.lineTo(-0.4, -1.9); g.moveTo(0.25, -1.36); g.lineTo(0.42, -1.85); g.stroke();
    g.setTransform(1, 0, 0, 1, 0, 0);
  }

  lasers(g, S, P) {
    const L = S.light, t = S.t;
    const src = [0, 3.05, 15.5];
    const n = 11;
    const center = L.fanCenter, spread = L.fanSpread, tilt = L.tilt;
    const pts = [];
    const cz = S.cam.z + 0.3;
    for (let i = 0; i < n; i++) {
      const th = center + (i / (n - 1) - 0.5) * spread;
      const ph = tilt + Math.sin(t * 2.1 + i * 0.7) * L.wobble;
      const dx = Math.sin(th) * Math.cos(ph), dy = Math.sin(ph), dz = -Math.cos(th) * Math.cos(ph);
      let u = (cz - src[2]) / dz;
      // also stop at the walls/ceiling
      if (dx !== 0) u = Math.min(u, ((dx > 0 ? 7 : -7) - src[0]) / dx);
      if (dy > 0) u = Math.min(u, (3.7 - src[1]) / dy);
      if (dy < 0) u = Math.min(u, (0 - src[1]) / dy);
      const e = P(src[0] + dx * u, src[1] + dy * u, src[2] + dz * u);
      pts.push(e);
    }
    const s0 = P(src[0], src[1], src[2]);
    if (!s0) return;
    const col = L.laserCol;
    const a = L.laser;
    g.fillStyle = rgbCSS(col, 0.03 * a);
    for (let i = 0; i < n - 1; i++) {
      const p1 = pts[i], p2 = pts[i + 1];
      if (!p1 || !p2) continue;
      g.beginPath(); g.moveTo(s0[0], s0[1]); g.lineTo(p1[0], p1[1]); g.lineTo(p2[0], p2[1]); g.closePath(); g.fill();
    }
    g.lineCap = 'round';
    for (const [w, al] of [[4, 0.12], [1.4, 0.75]]) {
      g.strokeStyle = rgbCSS(al > 0.5 ? mixRGB(col, [255, 255, 255], 0.35) : col, al * a);
      g.lineWidth = w;
      g.beginPath();
      for (const p of pts) { if (!p) continue; g.moveTo(s0[0], s0[1]); g.lineTo(p[0], p[1]); }
      g.stroke();
    }
    const gr = g.createRadialGradient(s0[0], s0[1], 0, s0[0], s0[1], s0[3] * 0.4);
    gr.addColorStop(0, rgbCSS([255, 255, 255], 0.8 * a)); gr.addColorStop(1, rgbCSS(col, 0));
    g.fillStyle = gr; g.fillRect(s0[0] - s0[3] * 0.4, s0[1] - s0[3] * 0.4, s0[3] * 0.8, s0[3] * 0.8);
  }

  glint(g, x, y, r, a) {
    g.save(); g.translate(x, y); g.rotate(0.3);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, r * 0.6);
    gr.addColorStop(0, `rgba(255,255,255,${0.9 * a})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(-r, -r, r * 2, r * 2);
    g.fillStyle = `rgba(255,255,255,${0.85 * a})`;
    g.beginPath();
    g.moveTo(0, -r); g.lineTo(r * 0.08, -r * 0.08); g.lineTo(r, 0); g.lineTo(r * 0.08, r * 0.08);
    g.lineTo(0, r); g.lineTo(-r * 0.08, r * 0.08); g.lineTo(-r, 0); g.lineTo(-r * 0.08, -r * 0.08); g.closePath();
    g.fill();
    g.restore();
  }

  orb(g, S, P) {
    if (!this.orbAt || S.peakRise < 0.02) this.orbAt = { x: S.cam.x - 0.75, z: Math.min(12, S.cam.z + 3.4) };
    const u = S.peakRise; // 0..1 rise
    const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
    const a = clamp(S.peak) * clamp(u * 12);
    const { x, z } = this.orbAt;
    const y = 1.15 + e * 3.6;
    const q = P(x, y, z);
    const base = P(x, 0.9, z);
    if (!q) return;
    const k = q[3];
    // the column it climbed out of
    if (base) {
      const cw = k * 0.22;
      const col = g.createLinearGradient(0, base[1], 0, q[1]);
      col.addColorStop(0, 'rgba(255,236,190,0)'); col.addColorStop(0.7, `rgba(255,240,205,${0.22 * a})`); col.addColorStop(1, `rgba(255,250,235,${0.35 * a})`);
      g.fillStyle = col;
      g.beginPath(); g.moveTo(base[0] - cw * 1.6, base[1]); g.lineTo(q[0] - cw * 0.4, q[1]); g.lineTo(q[0] + cw * 0.4, q[1]); g.lineTo(base[0] + cw * 1.6, base[1]); g.closePath(); g.fill();
    }
    // motes drifting up around it
    for (let i = 0; i < 14; i++) {
      const ph = (S.t * (0.25 + (i % 5) * 0.06) + i * 0.137) % 1;
      const mx = x + Math.sin(i * 2.3 + S.t * 0.7) * (0.25 + (i % 4) * 0.12);
      const my = y - 1.4 + ph * 2.4;
      const m = P(mx, my, z + Math.cos(i) * 0.2);
      if (!m) continue;
      const r = Math.max(1, m[3] * 0.018);
      g.fillStyle = `rgba(255,245,215,${a * Math.sin(ph * Math.PI) * 0.8})`;
      g.beginPath(); g.arc(m[0], m[1], r, 0, TAU); g.fill();
    }
    const R1 = k * (1.05 + 0.08 * Math.sin(S.t * 2.4));
    const gr = g.createRadialGradient(q[0], q[1], 0, q[0], q[1], R1);
    gr.addColorStop(0, `rgba(255,255,255,${a})`);
    gr.addColorStop(0.07, `rgba(255,253,240,${0.95 * a})`);
    gr.addColorStop(0.16, `rgba(255,232,180,${0.45 * a})`);
    gr.addColorStop(0.45, `rgba(255,205,140,${0.12 * a})`);
    gr.addColorStop(1, 'rgba(255,190,120,0)');
    g.fillStyle = gr; g.fillRect(q[0] - R1, q[1] - R1, R1 * 2, R1 * 2);
    g.strokeStyle = `rgba(255,248,225,${0.28 * a})`; g.lineWidth = 1;
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const an = (i / 10) * TAU + S.t * 0.35;
      const r0 = k * 0.1, r1 = k * (0.45 + 0.25 * Math.sin(S.t * 1.7 + i * 1.3));
      g.moveTo(q[0] + Math.cos(an) * r0, q[1] + Math.sin(an) * r0); g.lineTo(q[0] + Math.cos(an) * r1, q[1] + Math.sin(an) * r1);
    }
    g.stroke();
    g.fillStyle = `rgba(255,255,255,${a})`;
    g.beginPath(); g.arc(q[0], q[1], Math.max(2, k * 0.07), 0, TAU); g.fill();
    g.strokeStyle = `rgba(255,236,200,${0.5 * a})`; g.lineWidth = Math.max(1, k * 0.008);
    g.beginPath(); g.arc(q[0], q[1], k * (0.16 + 0.02 * Math.sin(S.t * 3)), 0, TAU); g.stroke();
    this.marks.orb = [q[0], q[1], k];
  }
}
