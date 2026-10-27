// 地下 — the platform and the tunnel. A tiled station box (H05), the track pit, a staff-only
// end wall with an arch into the dark, then the tunnel: caged lamps, cables, puddles, and at
// the end a strip curtain with the whole night thumping behind it.

import { clamp, lerp, smooth, TAU, mixRGB, rgbCSS } from './util.js';

export const HALL_END = 30;
export const CURTAIN_Z = 50;
const XL = -2.6, XE = 1.3, XR = 5.8, PIT_Y = -1.1, CEIL = 3.3;
const TX0 = 1.8, TX1 = 5.2, TW = 1.5, TA = 2.6;
const PROFILE = (() => {
  const p = [[TX1, PIT_Y], [TX0, PIT_Y], [TX0, TW]];
  for (let i = 1; i < 8; i++) { const a = Math.PI - (i / 8) * Math.PI; p.push([3.5 + 1.7 * Math.cos(a), TW + (TA - TW) * Math.sin(a)]); }
  p.push([TX1, TW]);
  return p;
})();

export function camAt(z) {
  const x = z < 22 ? -0.9 : z < HALL_END ? lerp(-0.9, 3.3, smooth((z - 22) / 8)) : 3.3;
  const y = z < 25 ? 1.6 : z < HALL_END ? lerp(1.6, 0.5, smooth((z - 25) / 5)) : 0.5;
  return { x, y };
}

export class Outside {
  constructor(tex) {
    this.tex = tex;
    this.lights = [];
    for (let i = 0; i < 7; i++) {
      this.lights.push({ x: -0.8, y: 3.2, z: 2 + i * 4, i: i === 4 ? 0 : 0.72, c: [205, 238, 222], tube: true, flick: i === 2 });
      this.lights.push({ x: 3.8, y: 3.2, z: 4 + i * 4, i: i === 1 || i === 5 ? 0 : 0.6, c: [205, 238, 222], tube: true });
    }
    this.lights.push({ x: -1.8, y: 1.0, z: 13.9, i: 0.7, c: [200, 220, 255] }); // vending machine
    for (const z of [33, 39, 45]) this.lights.push({ x: TX0 + 0.2, y: 1.15, z, i: 0.75, c: [255, 190, 120], lamp: true });
    this.lights.push({ x: TX1 - 0.2, y: 1.1, z: 42, i: 0.5, c: [255, 40, 40], lamp: true });
    this.door = { x: 3.5, y: 0.2, z: CURTAIN_Z - 0.3, i: 1, c: [255, 42, 42] };
    this.lights.push(this.door);
    this.flierRect = null;
  }

  draw(g, W, H, S) {
    const cam = S.cam;
    const F = 0.62 * H + 0.32 * W;
    const hy = H * 0.5 + (cam.pitch || 0) * H;
    const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
    const P = (x, y, z) => {
      const dx = x - cam.x, dz = z - cam.z;
      const rx = dx * cy - dz * sy, rz = dx * sy + dz * cy;
      if (rz < 0.06) return null;
      const k = F / rz;
      return [W / 2 + rx * k, hy - (y - cam.y) * k, rz, k];
    };
    this.P = P; this.cam = cam; this.W = W; this.H = H;
    this.door.c = S.doorCol; this.door.i = S.doorInt;
    for (const l of this.lights) if (l.flick) l.i = S.flick;
    const inTunnel = cam.z >= HALL_END;
    this.fogC = inTunnel ? [6, 6, 9] : [10, 12, 16];
    this.fogD = inTunnel ? 16 : 20;
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = rgbCSS(this.fogC); g.fillRect(0, 0, W, H);
    this.flierRect = null;

    this.drawTunnel(g, S);
    if (!inTunnel) this.drawHall(g, S);
  }

  shade(x, y, z) {
    let s = 0.06;
    let r = 0, gg = 0, b = 0;
    for (const l of this.lights) {
      if (l.i <= 0) continue;
      const dz = l.z - z;
      if (dz > 14 || dz < -14) continue;
      const dx = l.x - x, dy = l.y - y;
      const k = l.i / (1 + (dx * dx + dy * dy + dz * dz) * (l.tube ? 0.12 : 0.22));
      r += l.c[0] * k; gg += l.c[1] * k; b += l.c[2] * k;
    }
    return [s + r / 255, s + gg / 255, s + b / 255];
  }

  col(base, x, y, z, extra = 1) {
    const L = this.shade(x, y, z);
    const d = Math.hypot(x - this.cam.x, z - this.cam.z);
    const f = Math.exp(-d / this.fogD);
    const c = [base[0] * Math.min(1.3, L[0]) * extra, base[1] * Math.min(1.3, L[1]) * extra, base[2] * Math.min(1.3, L[2]) * extra];
    return rgbCSS(mixRGB(this.fogC, c, f));
  }

  poly(g, pts, fill) {
    const q = [];
    for (const p of pts) { const v = this.P(p[0], p[1], p[2]); if (!v) return false; q.push(v); }
    g.fillStyle = fill; g.beginPath(); g.moveTo(q[0][0], q[0][1]);
    for (let i = 1; i < q.length; i++) g.lineTo(q[i][0], q[i][1]);
    g.closePath(); g.fill();
    return q;
  }

  line3(g, a, b, style, w) {
    const p = this.P(a[0], a[1], a[2]), q = this.P(b[0], b[1], b[2]);
    if (!p || !q) return;
    g.strokeStyle = style; g.lineWidth = w; g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke();
  }

  // image on a plane x = X spanning z0..z1 (sliced for perspective); returns screen bbox
  wallImg(g, img, X, y0, y1, z0, z1, n = 12) {
    const iw = img.width, ih = img.height;
    let bb = null;
    for (let j = 0; j < n; j++) {
      const za = z0 + ((z1 - z0) * j) / n, zb = z0 + ((z1 - z0) * (j + 1)) / n;
      if (za < this.cam.z + 0.1) continue;
      const ta = this.P(X, y1, za), ba = this.P(X, y0, za), tb = this.P(X, y1, zb), bb2 = this.P(X, y0, zb);
      if (!ta || !ba || !tb || !bb2) continue;
      const x = Math.min(ta[0], tb[0]), w = Math.abs(tb[0] - ta[0]) + 0.7;
      const top = (ta[1] + tb[1]) / 2, bot = (ba[1] + bb2[1]) / 2;
      const sx = (iw * (X > 5 ? n - 1 - j : j)) / n; // walls facing −x read the other way
      g.drawImage(img, sx, 0, iw / n, ih, x, top, w, bot - top);
      const L = this.shade(X, (y0 + y1) / 2, (za + zb) / 2);
      const lum = Math.min(0.8, (L[0] + L[1] + L[2]) / 3 * 1.05);
      const d = Math.hypot(X - this.cam.x, (za + zb) / 2 - this.cam.z);
      const f = Math.exp(-d / this.fogD);
      const dark = 1 - lum * f;
      if (dark > 0.02) { g.fillStyle = rgbCSS(this.fogC, dark); g.fillRect(x, top, w, bot - top); }
      bb = bb ? [Math.min(bb[0], x), Math.min(bb[1], top), Math.max(bb[2], x + w), Math.max(bb[3], bot)] : [x, top, x + w, bot];
    }
    return bb;
  }

  frontImg(g, img, x0, y0, x1, y1, z) {
    const a = this.P(x0, y1, z), b = this.P(x1, y0, z);
    if (!a || !b) return;
    g.drawImage(img, a[0], a[1], b[0] - a[0], b[1] - a[1]);
    const L = this.shade((x0 + x1) / 2, (y0 + y1) / 2, z);
    const lum = clamp((L[0] + L[1] + L[2]) / 3);
    const f = Math.exp(-Math.hypot((x0 + x1) / 2 - this.cam.x, z - this.cam.z) / this.fogD);
    g.fillStyle = rgbCSS(this.fogC, clamp(1 - lum * f)); g.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]);
  }

  drawTunnel(g, S) {
    const cam = this.cam, T = this.tex;
    const zStart = Math.max(HALL_END, cam.z + 0.1);
    // curtain + the glow behind it
    this.drawCurtain(g, S);
    // tunnel strips, far → near
    const conc = [64, 63, 62], floor = [34, 32, 30];
    for (let z1 = CURTAIN_Z; z1 > zStart + 0.001;) {
      const z0 = Math.max(zStart, z1 - 1);
      const zm = (z0 + z1) / 2;
      for (let i = 0; i < PROFILE.length; i++) {
        const a = PROFILE[i], b = PROFILE[(i + 1) % PROFILE.length];
        const isFloor = a[1] === PIT_Y && b[1] === PIT_Y;
        const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
        const grime = 0.85 + 0.15 * Math.sin(zm * 3.1 + i);
        this.poly(g, [[a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1], [a[0], a[1], z1]], this.col(isFloor ? floor : conc, mx, my, zm, grime));
      }
      z1 = z0;
    }
    // rails + sleepers
    for (let z = Math.ceil(zStart / 0.65) * 0.65; z < CURTAIN_Z; z += 0.65) {
      if (z - cam.z > 22) break;
      this.poly(g, [[2.3, PIT_Y + 0.03, z], [4.7, PIT_Y + 0.03, z], [4.7, PIT_Y + 0.03, z + 0.22], [2.3, PIT_Y + 0.03, z + 0.22]], this.col([40, 34, 28], 3.5, PIT_Y, z));
    }
    for (const rx of [2.75, 4.25]) {
      this.line3(g, [rx, PIT_Y + 0.15, zStart], [rx, PIT_Y + 0.15, CURTAIN_Z], this.col([150, 150, 155], rx, PIT_Y, zStart + 4), 2.2);
    }
    // puddles catching the door light
    g.globalCompositeOperation = 'lighter';
    for (const [px, pz, r] of [[3.0, 36, 0.8], [4.2, 41.5, 1.1], [3.4, 46.5, 0.9]]) {
      const q = this.P(px, PIT_Y + 0.01, pz);
      if (!q) continue;
      const rw = r * q[3], rh = rw * 0.18 * (1 + (cam.y - PIT_Y) / q[2]);
      const gr = g.createRadialGradient(q[0], q[1], 0, q[0], q[1], rw);
      const dc = S.doorCol;
      gr.addColorStop(0, rgbCSS(dc, 0.22 * S.doorInt * Math.exp(-(CURTAIN_Z - pz) / 12)));
      gr.addColorStop(1, rgbCSS(dc, 0));
      g.save(); g.translate(q[0], q[1]); g.scale(1, rh / rw); g.translate(-q[0], -q[1]);
      g.fillStyle = gr; g.fillRect(q[0] - rw, q[1] - rw, rw * 2, rw * 2);
      g.restore();
    }
    g.globalCompositeOperation = 'source-over';
    // graffiti in the tunnel
    if (cam.z < CURTAIN_Z) {
      this.wallImg(g, T.tagScrawl, TX0 + 0.01, 0.0, 0.8, 32, 34);
      this.wallImg(g, T.tagBubble2, TX0 + 0.01, -0.75, 1.1, 35.5, 40.5, 14);
      this.wallImg(g, T.venueArrow, TX0 + 0.01, 0.3, 1.05, 43, 44.4);
      this.wallImg(g, T.tagGlitch, TX1 - 0.01, -0.3, 0.8, 34, 38.5);
      this.wallImg(g, T.tagGoth, TX1 - 0.01, -0.1, 1.1, 40, 44.5);
      this.wallImg(g, T.tagScrawl2, TX1 - 0.01, 0.3, 1.0, 45.5, 47.5);
    }
    // cables on the right wall, sagging between brackets
    g.lineWidth = 1.6;
    for (const [cy0, c] of [[1.15, '#141416'], [1.25, '#1d1a14'], [1.33, '#121214']]) {
      g.strokeStyle = c; g.beginPath();
      let first = true;
      for (let z = zStart; z <= CURTAIN_Z; z += 0.4) {
        const y = cy0 - 0.07 * Math.sin(Math.PI * ((z / 2) % 1));
        const q = this.P(TX1 - 0.03, y, z);
        if (!q) continue;
        if (first) { g.moveTo(q[0], q[1]); first = false; } else g.lineTo(q[0], q[1]);
      }
      g.stroke();
    }
    // caged lamps
    g.globalCompositeOperation = 'lighter';
    for (const l of this.lights) {
      if (!l.lamp || l.z < cam.z + 0.2) continue;
      const q = this.P(l.x, l.y, l.z);
      if (!q) continue;
      const r = q[3] * 0.55;
      const gr = g.createRadialGradient(q[0], q[1], 0, q[0], q[1], r);
      gr.addColorStop(0, rgbCSS([255, 255, 240], 0.9)); gr.addColorStop(0.12, rgbCSS(l.c, 0.5)); gr.addColorStop(1, rgbCSS(l.c, 0));
      g.fillStyle = gr; g.fillRect(q[0] - r, q[1] - r, r * 2, r * 2);
    }
    g.globalCompositeOperation = 'source-over';
  }

  drawCurtain(g, S) {
    const cam = this.cam, t = S.t;
    const a = this.P(TX0, TW, CURTAIN_Z), b = this.P(TX1, PIT_Y, CURTAIN_Z);
    if (!a || !b) return;
    const w = b[0] - a[0], h = b[1] - a[1];
    // what is behind: light, haze, bodies
    const gr = g.createRadialGradient(a[0] + w / 2, a[1] + h * 0.35, 0, a[0] + w / 2, a[1] + h * 0.4, w * 0.9);
    gr.addColorStop(0, rgbCSS(mixRGB(S.doorCol, [255, 255, 255], 0.35), 1));
    gr.addColorStop(0.5, rgbCSS(S.doorCol, 0.8 * S.doorInt + 0.2));
    gr.addColorStop(1, rgbCSS(mixRGB(S.doorCol, [0, 0, 0], 0.7), 1));
    g.fillStyle = gr; g.fillRect(a[0], a[1], w, h);
    g.fillStyle = 'rgba(5,5,8,0.92)';
    const k = a[3];
    for (let row = 0; row < 2; row++) {
      const kk = k * (row ? 0.78 : 0.62);
      const n = row ? 9 : 12;
      g.fillStyle = row ? 'rgba(5,5,8,0.95)' : 'rgba(20,10,16,0.75)';
      for (let i = 0; i < n; i++) {
        const u = (i + 0.5 + (row ? 0.3 : 0)) / n;
        const x = a[0] + w * u + Math.sin(t * 1.3 + i * 2.1 + row) * kk * 0.06;
        const bob = Math.pow(Math.max(0, Math.sin((S.beats + i * 0.37) * Math.PI)), 2) * kk * 0.12;
        const hh = 1.6 + ((i * 0.37 + row * 0.2) % 1) * 0.3;
        const y = b[1] - kk * hh - bob;
        const sw = kk * (0.22 + ((i * 0.61) % 1) * 0.08);
        g.beginPath(); g.ellipse(x, y, kk * 0.1, kk * 0.115, 0, 0, TAU); g.fill();
        g.beginPath(); g.moveTo(x - sw, b[1]); g.quadraticCurveTo(x - sw * 1.05, y + kk * 0.22, x, y + kk * 0.17); g.quadraticCurveTo(x + sw * 1.05, y + kk * 0.22, x + sw, b[1]); g.fill();
        if ((i + row) % 3 === 1) {
          g.save(); g.strokeStyle = g.fillStyle; g.lineWidth = kk * 0.08; g.lineCap = 'round';
          g.beginPath(); g.moveTo(x + sw * 0.6, y + kk * 0.3); g.lineTo(x + sw * 0.9, y - kk * 0.35 - bob * 0.5); g.stroke(); g.restore();
          if (row) { const f = g.fillStyle; g.fillStyle = 'rgba(200,220,255,0.85)'; g.fillRect(x + sw * 0.8, y - kk * 0.52 - bob * 0.5, kk * 0.08, kk * 0.14); g.fillStyle = f; }
        }
      }
    }
    // haze over the bodies
    const hz = g.createLinearGradient(0, a[1], 0, b[1]);
    hz.addColorStop(0, rgbCSS(mixRGB(S.doorCol, [255, 255, 255], 0.4), 0.35)); hz.addColorStop(0.6, rgbCSS(S.doorCol, 0.12)); hz.addColorStop(1, rgbCSS(S.doorCol, 0));
    g.fillStyle = hz; g.fillRect(a[0], a[1], w, h);
    // PVC strips
    const n = 13;
    for (let i = 0; i < n; i++) {
      const sw = w / n;
      const sway = Math.sin(t * 0.9 + i * 1.7) * sw * 0.08 + (S.part || 0) * (i < n / 2 ? -1 : 1) * w * 0.5 * Math.abs(i - n / 2) / (n / 2);
      const x = a[0] + i * sw + sway;
      g.fillStyle = 'rgba(190,210,225,0.22)'; g.fillRect(x + 1, a[1], sw - 2, h);
      g.fillStyle = 'rgba(255,255,255,0.28)'; g.fillRect(x + sw * 0.2, a[1], Math.max(1, sw * 0.06), h);
    }
    // the arch face above the door, with the event spray-painted on it
    if (this.tex.archTag) {
      const c = this.P(TX0 + 0.3, TA - 0.1, CURTAIN_Z), d = this.P(TX1 - 0.3, TW + 0.05, CURTAIN_Z);
      if (c && d) g.drawImage(this.tex.archTag, c[0], c[1], d[0] - c[0], d[1] - c[1]);
    }
  }

  drawHall(g, S) {
    const cam = this.cam, T = this.tex;
    const zn = Math.max(0, cam.z + 0.1);
    // end wall with the arch
    {
      const outer = [[XL, PIT_Y, HALL_END], [XR, PIT_Y, HALL_END], [XR, CEIL, HALL_END], [XL, CEIL, HALL_END]].map((p) => this.P(...p));
      const hole = PROFILE.map((p) => this.P(p[0], p[1], HALL_END));
      if (!outer.some((v) => !v) && !hole.some((v) => !v)) {
        g.fillStyle = this.col([150, 150, 142], 1, 1.5, HALL_END);
        g.beginPath();
        g.moveTo(outer[0][0], outer[0][1]); for (let i = 1; i < 4; i++) g.lineTo(outer[i][0], outer[i][1]); g.closePath();
        g.moveTo(hole[0][0], hole[0][1]); for (let i = hole.length - 1; i > 0; i--) g.lineTo(hole[i][0], hole[i][1]); g.closePath();
        g.fill('evenodd');
        // the platform's cut face under the platform part
        this.poly(g, [[XL, PIT_Y, HALL_END - 0.01], [XE, PIT_Y, HALL_END - 0.01], [XE, 0, HALL_END - 0.01], [XL, 0, HALL_END - 0.01]], this.col([60, 58, 56], 0, -0.5, HALL_END));
        this.frontImg(g, T.staffSign, -2.3, 1.45, -0.7, 2.21, HALL_END - 0.01);
        this.frontImg(g, T.venueArrow, -0.45, 0.85, 1.05, 1.68, HALL_END - 0.01);
      }
    }
    // ceiling, right wall, pit, platform, left wall — strip by strip, far → near
    const tile = [150, 156, 140], ceil = [52, 55, 58], plat = [104, 102, 96], pit = [30, 28, 27], rwall = [128, 130, 120];
    for (let z1 = HALL_END; z1 > zn + 0.001;) {
      const z0 = Math.max(zn, z1 - 1);
      const zm = (z0 + z1) / 2;
      const gr = 0.88 + 0.12 * Math.sin(zm * 2.3);
      this.poly(g, [[XL, CEIL, z0], [XR, CEIL, z0], [XR, CEIL, z1], [XL, CEIL, z1]], this.col(ceil, 1.5, CEIL, zm));
      this.poly(g, [[XR, PIT_Y, z0], [XR, CEIL, z0], [XR, CEIL, z1], [XR, PIT_Y, z1]], this.col(rwall, XR, 1, zm, gr));
      this.poly(g, [[XE, PIT_Y, z0], [XR, PIT_Y, z0], [XR, PIT_Y, z1], [XE, PIT_Y, z1]], this.col(pit, 3.5, PIT_Y, zm));
      z1 = z0;
    }
    // sleepers + rails
    for (let z = Math.ceil(zn / 0.65) * 0.65; z < HALL_END; z += 0.65) {
      if (z - cam.z > 20) break;
      this.poly(g, [[2.3, PIT_Y + 0.03, z], [4.7, PIT_Y + 0.03, z], [4.7, PIT_Y + 0.03, z + 0.22], [2.3, PIT_Y + 0.03, z + 0.22]], this.col([44, 38, 32], 3.5, PIT_Y, z));
    }
    for (const rx of [2.75, 4.25]) this.line3(g, [rx, PIT_Y + 0.15, zn], [rx, PIT_Y + 0.15, HALL_END], this.col([170, 170, 176], rx, PIT_Y, zn + 5), 2.4);
    // right wall pieces (across the tracks)
    this.wallImg(g, T.tagBubble, XR - 0.01, -0.7, 1.6, 6, 12.5, 16);
    this.wallImg(g, T.tvPoster, XR - 0.01, 0.2, 2.4, 13.5, 15.1, 10);
    this.wallImg(g, T.tagGoth, XR - 0.01, 0.3, 1.5, 16, 20.5);
    this.wallImg(g, T.tagGlitch2, XR - 0.01, -0.5, 0.9, 21, 25.5);
    this.wallImg(g, T.stationSign, XR - 0.01, 2.0, 2.65, 25.5, 28.5);
    // platform floor
    for (let z1 = HALL_END; z1 > zn + 0.001;) {
      const z0 = Math.max(zn, z1 - 1);
      const zm = (z0 + z1) / 2;
      this.poly(g, [[XL, 0, z0], [XE, 0, z0], [XE, 0, z1], [XL, 0, z1]], this.col(plat, -0.5, 0, zm, 0.92 + 0.08 * Math.sin(zm * 5.1)));
      z1 = z0;
    }
    // 点字ブロック — the yellow tactile strip, and the white edge
    this.poly(g, [[0.5, 0.002, zn], [0.82, 0.002, zn], [0.82, 0.002, HALL_END], [0.5, 0.002, HALL_END]], this.col([215, 180, 52], 0.66, 0, zn + 4, 1.1));
    this.poly(g, [[1.12, 0.002, zn], [1.3, 0.002, zn], [1.3, 0.002, HALL_END], [1.12, 0.002, HALL_END]], this.col([215, 215, 205], 1.2, 0, zn + 4));
    g.lineWidth = 1;
    for (let z = Math.ceil(zn / 0.3) * 0.3; z < Math.min(HALL_END, cam.z + 12); z += 0.3) this.line3(g, [0.5, 0.004, z], [0.82, 0.004, z], 'rgba(90,70,10,0.5)', 1);
    // left wall + tile grout
    for (let z1 = HALL_END; z1 > zn + 0.001;) {
      const z0 = Math.max(zn, z1 - 1);
      const zm = (z0 + z1) / 2;
      this.poly(g, [[XL, 0, z0], [XL, CEIL, z0], [XL, CEIL, z1], [XL, 0, z1]], this.col(tile, XL, 1.6, zm, 0.9 + 0.1 * Math.sin(zm * 1.7)));
      z1 = z0;
    }
    // grime where the wall meets the floor, and the long brown stains under the vents
    this.poly(g, [[XL, 0, zn], [XL, 0.38, zn], [XL, 0.38, HALL_END], [XL, 0, HALL_END]], 'rgba(28,24,16,0.35)');
    for (const sz of [3.2, 7.9, 13.1, 19.4, 24.6]) {
      if (sz < zn) continue;
      this.poly(g, [[XL, 1.2, sz], [XL, CEIL, sz], [XL, CEIL, sz + 0.35], [XL, 1.6, sz + 0.3]], 'rgba(60,44,20,0.16)');
    }
    g.lineWidth = 1;
    for (let y = 0.3; y < CEIL; y += 0.3) this.line3(g, [XL, y, zn], [XL, y, HALL_END], 'rgba(20,24,22,0.22)', 1);
    for (let z = Math.ceil(zn / 0.3) * 0.3; z < Math.min(HALL_END, cam.z + 14); z += 0.3) this.line3(g, [XL, 0, z], [XL, CEIL, z], 'rgba(20,24,22,0.18)', 1);
    // things on the left wall
    this.wallImg(g, T.lineMap, XL + 0.01, 1.2, 2.25, 5.6, 8.3, 14);
    this.wallImg(g, T.stationSign, XL + 0.01, 1.6, 2.3, 9.4, 12.2, 14);
    this.wallImg(g, T.tagScrawl, XL + 0.01, 0.4, 1.1, 14.6, 16.1);
    this.wallImg(g, T.missing, XL + 0.01, 1.05, 2.12, 16.4, 17.15, 8);
    const fb = this.wallImg(g, T.flier, XL + 0.01, 1.0, 2.2, 17.5, 18.35, 8);
    if (fb && 17.4 - cam.z < 11) this.flierRect = fb;
    this.wallImg(g, T.tvPoster, XL + 0.01, 0.6, 2.7, 19.5, 21, 10);
    this.wallImg(g, T.tagBubble2, XL + 0.01, 0.15, 1.85, 21.4, 25.6, 14);
    this.wallImg(g, T.tagScrawl2, XL + 0.01, 1.2, 2.0, 26.4, 28);
    // vending machine (box against the wall) + its light on the floor
    if (cam.z < 13.5) {
      this.wallImg(g, T.vending, -1.9, 0, 1.85, 13.5, 14.3, 8);
      this.poly(g, [[XL, 0, 13.5], [-1.9, 0, 13.5], [-1.9, 1.85, 13.5], [XL, 1.85, 13.5]], this.col([120, 122, 128], -2.2, 1, 13.4));
      g.globalCompositeOperation = 'lighter';
      const q = this.P(-1.5, 0, 13.9);
      if (q) {
        const r = q[3] * 1.2;
        const gr = g.createRadialGradient(q[0], q[1], 0, q[0], q[1], r);
        gr.addColorStop(0, 'rgba(180,200,255,0.18)'); gr.addColorStop(1, 'rgba(180,200,255,0)');
        g.save(); g.translate(q[0], q[1]); g.scale(1, 0.3); g.translate(-q[0], -q[1]);
        g.fillStyle = gr; g.fillRect(q[0] - r, q[1] - r, r * 2, r * 2); g.restore();
      }
      g.globalCompositeOperation = 'source-over';
    }
    // pillars, far → near
    for (const pz of [17, 12, 9]) {
      if (pz === 12) {
        if (cam.z < 11.9 && T.exitSign) {
          const a = this.P(-1.9, 3.0, 12), b = this.P(-0.1, 2.6, 12);
          if (a && b) {
            g.strokeStyle = '#222'; g.lineWidth = 1.5;
            const h1 = this.P(-1.6, CEIL, 12), h2 = this.P(-0.4, CEIL, 12);
            if (h1 && h2) { g.beginPath(); g.moveTo(h1[0], h1[1]); g.lineTo(h1[0], a[1]); g.moveTo(h2[0], h2[1]); g.lineTo(h2[0], a[1]); g.stroke(); }
            this.frontImg(g, T.exitSign, -1.9, 2.6, -0.1, 3.0, 12);
          }
        }
        continue;
      }
      if (pz - 0.25 < cam.z + 0.15) continue;
      const x0 = -0.05, x1 = 0.45, z0 = pz - 0.25, z1 = pz + 0.25;
      this.poly(g, [[x0, 0, z0], [x0, CEIL, z0], [x0, CEIL, z1], [x0, 0, z1]], this.col([104, 108, 102], x0, 1.5, pz, 0.8));
      const q = this.poly(g, [[x0, 0, z0], [x1, 0, z0], [x1, CEIL, z0], [x0, CEIL, z0]], this.col([118, 122, 114], 0.2, 1.5, z0));
      if (q) {
        const k = q[0][3];
        g.fillStyle = '#d8ff3a'; g.fillRect(q[0][0] + k * 0.08, q[2][1] + k * 1.7, k * 0.12, k * 0.12);
        g.fillStyle = '#ff5ab4'; g.beginPath(); g.arc(q[0][0] + k * 0.32, q[2][1] + k * 2.0, k * 0.07, 0, TAU); g.fill();
        g.fillStyle = '#efeadf'; g.fillRect(q[0][0] + k * 0.1, q[2][1] + k * 1.1, k * 0.28, k * 0.38);
        g.fillStyle = '#111'; g.fillRect(q[0][0] + k * 0.13, q[2][1] + k * 1.14, k * 0.22, k * 0.08);
      }
    }
    // cable trays along the ceiling
    for (const [tx, tw] of [[-1.7, 0.16], [2.5, 0.22]]) {
      this.poly(g, [[tx - tw, CEIL - 0.12, zn + 0.2], [tx + tw, CEIL - 0.12, zn + 0.2], [tx + tw, CEIL - 0.12, HALL_END], [tx - tw, CEIL - 0.12, HALL_END]], this.col([34, 34, 36], tx, CEIL, zn + 6));
    }
    // fluorescent tubes
    g.globalCompositeOperation = 'lighter';
    for (const l of this.lights) {
      if (!l.tube || l.z < cam.z + 0.4) continue;
      if (l.i <= 0.05) {
        this.poly(g, [[l.x - 0.05, CEIL - 0.04, l.z - 0.6], [l.x + 0.05, CEIL - 0.04, l.z - 0.6], [l.x + 0.05, CEIL - 0.04, l.z + 0.6], [l.x - 0.05, CEIL - 0.04, l.z + 0.6]], 'rgba(40,44,48,0.6)');
        continue;
      }
      const a = clamp(l.i);
      this.poly(g, [[l.x - 0.06, CEIL - 0.04, l.z - 0.6], [l.x + 0.06, CEIL - 0.04, l.z - 0.6], [l.x + 0.06, CEIL - 0.04, l.z + 0.6], [l.x - 0.06, CEIL - 0.04, l.z + 0.6]], `rgba(235,245,255,${0.85 * a})`);
      const q = this.P(l.x, CEIL - 0.1, l.z);
      if (q) {
        const r = q[3] * 0.9;
        const gr = g.createRadialGradient(q[0], q[1], 0, q[0], q[1], r);
        gr.addColorStop(0, `rgba(220,235,255,${0.22 * a})`); gr.addColorStop(1, 'rgba(220,235,255,0)');
        g.fillStyle = gr; g.fillRect(q[0] - r, q[1] - r, r * 2, r * 2);
      }
    }
    // the door glow leaking from the arch
    const m = this.P(3.5, 0.4, HALL_END + 1);
    if (m) {
      const r = m[3] * 2.4;
      const gr = g.createRadialGradient(m[0], m[1], 0, m[0], m[1], r);
      gr.addColorStop(0, rgbCSS(S.doorCol, 0.08 * S.doorInt)); gr.addColorStop(1, rgbCSS(S.doorCol, 0));
      g.fillStyle = gr; g.fillRect(m[0] - r, m[1] - r, r * 2, r * 2);
    }
    g.globalCompositeOperation = 'source-over';
  }
}
