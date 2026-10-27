// The map background, drawn in code: a summer night after the festival. Hills, a town's
// last lights, the Hikari Line viaduct with its one-car train crossing as the song plays,
// power lines over a dark field, fireflies, and a moon wearing a halo like an approach circle.

function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export class Background {
  constructor() {
    this.cv = document.createElement('canvas');
    this.w = 0; this.h = 0;
    this.flies = Array.from({ length: 14 }, (_, i) => ({ x: Math.random(), y: 0.78 + Math.random() * 0.18, p: Math.random() * 10, s: 0.3 + Math.random() * 0.7, i }));
  }

  resize(w, h, dpr) {
    const k = Math.min(dpr, 1.5);
    const W = Math.ceil(w * 1.05), H = Math.ceil(h * 1.05);
    this.w = W; this.h = H; this.k = k;
    this.cv.width = Math.ceil(W * k); this.cv.height = Math.ceil(H * k);
    const g = this.cv.getContext('2d', { willReadFrequently: true });
    g.setTransform(k, 0, 0, k, 0, 0);
    this._paint(g, W, H);
  }

  // geometry shared by static paint and the moving train
  _rail(W, H) { return { y: H * 0.585, deck: Math.max(5, H * 0.012) }; }

  _paint(g, W, H) {
    const R = rng(1986);
    const sky = g.createLinearGradient(0, 0, 0, H * 0.7);
    sky.addColorStop(0, '#05050c');
    sky.addColorStop(0.45, '#120f24');
    sky.addColorStop(0.78, '#2a1a36');
    sky.addColorStop(1, '#4a2440');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    // last of the dusk along the horizon
    const glow = g.createRadialGradient(W * 0.3, H * 0.62, 0, W * 0.3, H * 0.62, W * 0.7);
    glow.addColorStop(0, 'rgba(255,110,150,0.22)');
    glow.addColorStop(1, 'rgba(255,110,150,0)');
    g.fillStyle = glow; g.fillRect(0, 0, W, H);

    // stars
    for (let i = 0; i < (W * H) / 2600; i++) {
      const x = R() * W, y = Math.pow(R(), 1.6) * H * 0.55, a = 0.15 + R() * 0.6, s = R() < 0.06 ? 1.6 : 0.8;
      g.fillStyle = `rgba(${220 + R() * 35 | 0},${215 + R() * 30 | 0},255,${a})`;
      g.fillRect(x, y, s, s);
    }

    // the moon, and its halo: an approach circle that never closes
    const mx = W * 0.78, my = H * 0.17, mr = Math.min(W, H) * 0.035;
    const halo = g.createRadialGradient(mx, my, mr, mx, my, mr * 7);
    halo.addColorStop(0, 'rgba(255,230,240,0.20)');
    halo.addColorStop(1, 'rgba(255,230,240,0)');
    g.fillStyle = halo; g.beginPath(); g.arc(mx, my, mr * 7, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#f6eef0'; g.beginPath(); g.arc(mx, my, mr, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#120f24'; g.beginPath(); g.arc(mx + mr * 0.42, my - mr * 0.18, mr * 0.92, 0, Math.PI * 2); g.fill();
    g.lineWidth = Math.max(1, mr * 0.06);
    for (const [k, a] of [[3.2, 0.16], [5.4, 0.08], [8.5, 0.04]]) {
      g.strokeStyle = `rgba(255,140,190,${a})`;
      g.beginPath(); g.arc(mx, my, mr * k, 0, Math.PI * 2); g.stroke();
    }

    // far hills, near hills
    const ridge = (base, amp, col, seed, rough) => {
      const r2 = rng(seed);
      g.fillStyle = col;
      g.beginPath(); g.moveTo(0, H);
      let y = base;
      for (let x = 0; x <= W + 20; x += 20) {
        y += (r2() - 0.5) * amp * rough;
        y += (base - y) * 0.08;
        const yy = y - Math.sin(x / W * Math.PI * 1.3 + seed) * amp;
        g.lineTo(x, yy);
      }
      g.lineTo(W, H); g.closePath(); g.fill();
    };
    ridge(H * 0.5, H * 0.06, '#191428', 3, 0.9);
    ridge(H * 0.56, H * 0.035, '#120e1d', 7, 1.2);

    // the town's last lights
    for (let i = 0; i < W / 9; i++) {
      const x = R() * W, y = H * (0.575 + R() * 0.03);
      const warm = R() < 0.8;
      g.fillStyle = warm ? `rgba(255,${190 + R() * 50 | 0},140,${0.35 + R() * 0.5})` : `rgba(160,220,255,${0.3 + R() * 0.4})`;
      g.fillRect(x, y, 1.2, 1.2);
    }

    // the Hikari Line viaduct
    const { y: ry, deck } = this._rail(W, H);
    g.fillStyle = '#0a0911';
    g.fillRect(0, ry, W, deck);
    const span = Math.max(60, W / 14);
    for (let x = -span / 2; x < W + span; x += span) {
      g.fillRect(x - deck * 0.7, ry + deck, deck * 1.4, H * 0.08);
      g.beginPath();
      g.moveTo(x + deck * 0.7, ry + deck);
      g.quadraticCurveTo(x + span / 2, ry + deck + H * 0.05, x + span - deck * 0.7, ry + deck);
      g.lineTo(x + span - deck * 0.7, ry + deck + 2);
      g.lineTo(x + deck * 0.7, ry + deck + 2);
      g.fill();
    }
    // catenary poles and wire
    g.strokeStyle = 'rgba(10,9,17,0.95)';
    g.lineWidth = 1.2;
    const poleH = H * 0.045;
    for (let x = span * 0.25; x < W; x += span * 1.5) {
      g.beginPath(); g.moveTo(x, ry); g.lineTo(x, ry - poleH); g.lineTo(x + deck * 2.2, ry - poleH); g.stroke();
    }
    g.lineWidth = 0.8;
    g.beginPath(); g.moveTo(0, ry - poleH * 0.82); g.lineTo(W, ry - poleH * 0.82); g.stroke();

    // the field, power poles and sagging lines in the foreground
    const fg = g.createLinearGradient(0, H * 0.66, 0, H);
    fg.addColorStop(0, '#0c0a14');
    fg.addColorStop(1, '#040308');
    g.fillStyle = fg;
    g.beginPath(); g.moveTo(0, H * 0.7);
    for (let x = 0; x <= W; x += 6) g.lineTo(x, H * 0.69 + Math.sin(x * 0.05) * 2 + (R() - 0.5) * 5);
    g.lineTo(W, H); g.lineTo(0, H); g.fill();
    g.strokeStyle = '#030206';
    const poles = [W * 0.08, W * 0.4, W * 0.73, W * 1.05];
    for (const px of poles) {
      g.lineWidth = Math.max(2, W * 0.004);
      g.beginPath(); g.moveTo(px, H); g.lineTo(px, H * 0.36); g.stroke();
      g.lineWidth = Math.max(1.5, W * 0.0025);
      g.beginPath(); g.moveTo(px - W * 0.025, H * 0.385); g.lineTo(px + W * 0.025, H * 0.385); g.stroke();
    }
    g.lineWidth = 1;
    for (let k = 0; k < 3; k++) {
      g.beginPath();
      for (let i = 0; i < poles.length - 1; i++) {
        const x0 = poles[i] - W * 0.02 + k * W * 0.02, x1 = poles[i + 1] - W * 0.02 + k * W * 0.02, y0 = H * 0.385;
        g.moveTo(x0, y0);
        g.quadraticCurveTo((x0 + x1) / 2, y0 + H * 0.06, x1, y0);
      }
      g.stroke();
    }
    // grain
    const img = g.getImageData(0, 0, this.cv.width, this.cv.height);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (R() - 0.5) * 9;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    g.putImageData(img, 0, 0);
  }

  // progress: 0..1 along the song (the train crosses). px,py: parallax in -1..1.
  draw(g, w, h, { progress = 0.5, dim = 0.7, t = 0, px = 0, py = 0, flash = 0, reduced = false } = {}) {
    const W = this.w, H = this.h;
    const ox = -(W - w) / 2 - px * (W - w) * 0.45, oy = -(H - h) / 2 - py * (H - h) * 0.45;
    g.drawImage(this.cv, ox, oy, W, H);
    // the train
    const { y: ry } = this._rail(W, H);
    const carW = Math.max(70, W * 0.085), carH = carW * 0.26;
    const cx = ox + (-carW + (W + carW * 2) * progress), cy = oy + ry - carH;
    g.fillStyle = '#0d0b15';
    g.beginPath();
    g.moveTo(cx, cy + carH); g.lineTo(cx, cy + carH * 0.22);
    g.quadraticCurveTo(cx, cy, cx + carH * 0.3, cy);
    g.lineTo(cx + carW - carH * 0.3, cy);
    g.quadraticCurveTo(cx + carW, cy, cx + carW, cy + carH * 0.22);
    g.lineTo(cx + carW, cy + carH); g.fill();
    g.strokeStyle = '#0d0b15'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(cx + carW * 0.45, cy); g.lineTo(cx + carW * 0.52, cy - carH * 0.35); g.lineTo(cx + carW * 0.6, cy); g.stroke();
    const wn = 7, ww = carW * 0.085, gap = (carW - wn * ww) / (wn + 1);
    for (let i = 0; i < wn; i++) {
      const flick = 0.85 + 0.15 * Math.sin(t * 7 + i * 2.1);
      g.fillStyle = `rgba(255,214,150,${0.75 * flick})`;
      g.fillRect(cx + gap + i * (ww + gap), cy + carH * 0.25, ww, carH * 0.38);
    }
    const beam = g.createLinearGradient(cx + carW, 0, cx + carW + carW * 1.6, 0);
    beam.addColorStop(0, 'rgba(255,240,210,0.35)'); beam.addColorStop(1, 'rgba(255,240,210,0)');
    g.fillStyle = beam;
    g.beginPath(); g.moveTo(cx + carW, cy + carH * 0.55); g.lineTo(cx + carW * 2.6, cy + carH * 0.1); g.lineTo(cx + carW * 2.6, cy + carH * 1.2); g.fill();
    // fireflies
    if (!reduced) {
      for (const f of this.flies) {
        const x = ox + ((f.x * W + Math.sin(t * 0.3 * f.s + f.p) * 30 + t * 6 * f.s) % W);
        const y = oy + f.y * H + Math.sin(t * 0.7 + f.p) * 12;
        const a = Math.max(0, Math.sin(t * 1.3 * f.s + f.p)) * 0.8;
        g.fillStyle = `rgba(214,255,150,${a})`;
        g.beginPath(); g.arc(x, y, 1.6, 0, Math.PI * 2); g.fill();
      }
    }
    if (dim > 0) { g.fillStyle = `rgba(4,3,8,${dim})`; g.fillRect(0, 0, w, h); }
    if (flash > 0) {
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = `rgba(255,160,205,${flash * 0.16})`;
      g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'source-over';
    }
  }
}
