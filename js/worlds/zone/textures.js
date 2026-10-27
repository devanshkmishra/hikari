// Canvas-painted textures: the station name board, the things under the water, soapstone scrawl.

function mulberry(a) {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function grime(g, w, h, rnd, n, color, maxR) {
  for (let i = 0; i < n; i++) {
    const x = rnd() * w, y = rnd() * h, r = 4 + rnd() * maxR;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, color.replace('A', (0.05 + rnd() * 0.12).toFixed(3)));
    gr.addColorStop(1, color.replace('A', '0'));
    g.fillStyle = gr;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

export function signCanvas() {
  const W = 1024, H = 354;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const rnd = mulberry(606);
  g.fillStyle = '#e4e0d3';
  g.fillRect(0, 0, W, H);
  // the old name, painted over but never quite gone
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = '700 168px "Zen Kaku Gothic New", "Noto Serif JP", sans-serif';
  g.fillStyle = 'rgba(70,72,64,0.13)';
  g.fillText('蛍川', W / 2 + 14, H * 0.36 + 6);
  // repaint patch
  g.fillStyle = 'rgba(236,233,224,0.55)';
  g.fillRect(W * 0.26, H * 0.08, W * 0.48, H * 0.5);
  g.fillStyle = '#1f211d';
  g.font = '700 150px "Zen Kaku Gothic New", "Noto Serif JP", sans-serif';
  g.fillText('区域', W / 2, H * 0.34);
  g.font = '700 38px "Zen Kaku Gothic New", sans-serif';
  g.fillText('く い き', W / 2, H * 0.62);
  // station number badge
  g.strokeStyle = '#2f4a3f'; g.lineWidth = 6;
  g.strokeRect(48, 40, 112, 112);
  g.fillStyle = '#2f4a3f';
  g.font = '700 30px "IBM Plex Mono", monospace';
  g.fillText('H', 104, 76);
  g.font = '700 46px "IBM Plex Mono", monospace';
  g.fillText('06', 104, 120);
  // band
  g.fillStyle = '#2d463c';
  g.fillRect(0, H * 0.72, W, H * 0.28);
  g.fillStyle = '#e8e4d6';
  g.font = '700 34px "Zen Kaku Gothic New", sans-serif';
  g.textAlign = 'left';
  g.fillText('◀ ち か', 34, H * 0.83);
  g.textAlign = 'right';
  g.fillText('たそがれがはま ▶', W - 34, H * 0.83);
  g.font = '500 22px "IBM Plex Mono", monospace';
  g.textAlign = 'left';
  g.fillText('Chika', 70, H * 0.94);
  g.textAlign = 'right';
  g.fillText('Tasogaregahama', W - 70, H * 0.94);
  g.textAlign = 'center';
  g.font = '500 30px "IBM Plex Mono", monospace';
  g.fillText('K u i k i', W / 2, H * 0.86);
  // weather: fade, grime, rust bleeding from the bolts
  grime(g, W, H, rnd, 140, 'rgba(60,52,38,A)', 60);
  for (const bx of [40, W - 40]) {
    for (const by of [26, H - 26]) {
      g.fillStyle = '#5a3a20';
      g.beginPath(); g.arc(bx, by, 7, 0, 7); g.fill();
      const len = 40 + rnd() * 140;
      const gr = g.createLinearGradient(bx, by, bx, by + len);
      gr.addColorStop(0, 'rgba(110,60,25,0.55)');
      gr.addColorStop(1, 'rgba(110,60,25,0)');
      g.fillStyle = gr;
      g.fillRect(bx - 4 - rnd() * 3, by, 7 + rnd() * 6, len);
    }
  }
  for (let i = 0; i < 26; i++) {
    const x = rnd() * W, len = 20 + rnd() * 120;
    const gr = g.createLinearGradient(x, 0, x, len);
    gr.addColorStop(0, 'rgba(80,60,40,0.25)');
    gr.addColorStop(1, 'rgba(80,60,40,0)');
    g.fillStyle = gr;
    g.fillRect(x, 0, 2 + rnd() * 5, len);
  }
  for (let i = 0; i < 30; i++) { // chipped enamel
    const x = rnd() * W, y = rnd() * H, r = 2 + rnd() * 9;
    g.fillStyle = `rgba(${40 + rnd() * 30},${34 + rnd() * 20},${28},${0.5 + rnd() * 0.4})`;
    g.beginPath();
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2, rr = r * (0.5 + rnd() * 0.7);
      g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    g.fill();
  }
  return c;
}

// The floor of the flooded corridor between z 12..15.6, x -0.9..0.9 (1024 x 2048, top = far).
export function floorCanvas() {
  const W = 1024, H = 2048;
  const PX = W / 1.8; // pixels per metre
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const rnd = mulberry(1027);
  const at = (x, z) => [(x + 0.9) * PX, (15.6 - z) * PX];
  const shadow = (fn) => {
    g.save();
    g.shadowColor = 'rgba(0,0,0,0.55)';
    g.shadowBlur = 10;
    g.shadowOffsetY = 4;
    fn();
    g.restore();
  };

  // silt and broken tiles
  for (let i = 0; i < 26; i++) {
    const [x, y] = at(-0.85 + rnd() * 1.7, 12.05 + rnd() * 3.5);
    const s = (0.04 + rnd() * 0.07) * PX;
    g.save();
    g.translate(x, y);
    g.rotate(rnd() * 3);
    shadow(() => {
      g.fillStyle = `rgba(${200 + rnd() * 30},${205 + rnd() * 25},${190 + rnd() * 20},0.92)`;
      g.beginPath();
      g.moveTo(-s, -s * 0.8); g.lineTo(s * (0.6 + rnd() * 0.4), -s); g.lineTo(s, s * (0.3 + rnd() * 0.6)); g.lineTo(-s * 0.7, s);
      g.closePath(); g.fill();
    });
    g.restore();
  }

  // five-yen coins (ご縁)
  const coin = (x, z, r) => {
    const [cx, cy] = at(x, z);
    const R = 0.011 * PX * r;
    shadow(() => {
      const gr = g.createRadialGradient(cx - R * 0.3, cy - R * 0.3, 0, cx, cy, R);
      gr.addColorStop(0, '#e6c873'); gr.addColorStop(1, '#9a7a32');
      g.fillStyle = gr;
      g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill();
    });
    g.globalCompositeOperation = 'destination-out';
    g.beginPath(); g.arc(cx, cy, R * 0.23, 0, 7); g.fill();
    g.globalCompositeOperation = 'source-over';
    g.strokeStyle = 'rgba(90,64,20,0.7)'; g.lineWidth = 1.2;
    g.beginPath(); g.arc(cx, cy, R * 0.82, 0, 7); g.stroke();
    for (let k = 0; k < 9; k++) {
      const a = -0.8 + k * 0.2;
      g.beginPath(); g.moveTo(cx + Math.cos(a) * R * 0.35, cy + Math.sin(a) * R * 0.35); g.lineTo(cx + Math.cos(a) * R * 0.7, cy + Math.sin(a) * R * 0.7); g.stroke();
    }
  };
  coin(0.31, 14.15, 1); coin(0.36, 14.08, 1); coin(-0.55, 12.65, 1); coin(0.66, 15.2, 1);

  // a wristwatch, stopped at 10:27
  {
    const [cx, cy] = at(-0.2, 13.35);
    const R = 0.019 * PX;
    g.save(); g.translate(cx, cy); g.rotate(0.5);
    shadow(() => {
      g.fillStyle = '#3a2a1e';
      g.fillRect(-R * 0.55, -R * 3.2, R * 1.1, R * 6.4);
      g.fillStyle = '#b8b4a6';
      g.beginPath(); g.arc(0, 0, R * 1.12, 0, 7); g.fill();
    });
    g.fillStyle = '#e8e4d6';
    g.beginPath(); g.arc(0, 0, R * 0.95, 0, 7); g.fill();
    g.strokeStyle = '#222'; g.lineWidth = 2;
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      g.beginPath(); g.moveTo(Math.sin(a) * R * 0.78, -Math.cos(a) * R * 0.78); g.lineTo(Math.sin(a) * R * 0.88, -Math.cos(a) * R * 0.88); g.stroke();
    }
    const hand = (a, l, w) => { g.lineWidth = w; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.sin(a) * l, -Math.cos(a) * l); g.stroke(); };
    hand(((10 + 27 / 60) / 12) * Math.PI * 2, R * 0.5, 3);
    hand((27 / 60) * Math.PI * 2, R * 0.78, 2);
    g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(-R * 0.6, -R * 0.2); g.lineTo(R * 0.1, R * 0.5); g.lineTo(R * 0.3, R * 0.2); g.stroke();
    g.restore();
  }

  // a notebook page, the ink run in the water
  {
    const [cx, cy] = at(-0.32, 14.5);
    const w = 0.15 * PX, h = 0.21 * PX;
    g.save(); g.translate(cx, cy); g.rotate(-0.22);
    shadow(() => { g.fillStyle = '#d9d3bd'; g.fillRect(-w / 2, -h / 2, w, h); });
    g.strokeStyle = 'rgba(80,110,140,0.35)'; g.lineWidth = 1;
    for (let y = -h / 2 + 14; y < h / 2 - 6; y += 9) { g.beginPath(); g.moveTo(-w / 2 + 6, y); g.lineTo(w / 2 - 4, y); g.stroke(); }
    g.fillStyle = 'rgba(40,40,60,0.6)';
    g.font = '7px "Zen Kaku Gothic New", sans-serif';
    const lines = ['みんな行ってしまった。', '最後の列車が出てから、', '町はとても静かになった。', '犬のクロだけが残った。', 'わたしも残った。', 'ここにいれば、いつか', '誰かが来てくれる'];
    lines.forEach((l, i) => g.fillText(l, -w / 2 + 8, -h / 2 + 12 + i * 9));
    g.fillStyle = 'rgba(60,70,90,0.18)';
    g.beginPath(); g.ellipse(w * 0.15, h * 0.2, w * 0.3, h * 0.18, 0.4, 0, 7); g.fill();
    g.restore();
  }

  // a ticket stub
  {
    const [cx, cy] = at(0.42, 12.9);
    const w = 0.058 * PX, h = 0.03 * PX;
    g.save(); g.translate(cx, cy); g.rotate(0.7);
    shadow(() => { g.fillStyle = '#a9c4b6'; g.fillRect(-w / 2, -h / 2, w, h); });
    g.fillStyle = 'rgba(30,50,40,0.85)';
    g.font = '700 7px "Zen Kaku Gothic New", sans-serif';
    g.fillText('蛍川 ゆき', -w / 2 + 3, -1);
    g.font = '5px "IBM Plex Mono", monospace';
    g.fillText('片道 小児', -w / 2 + 3, 7);
    g.strokeStyle = 'rgba(160,40,30,0.6)'; g.lineWidth = 1.2;
    g.beginPath(); g.arc(w * 0.28, 0, 5, 0, 7); g.stroke();
    g.restore();
  }

  // a cassette, label in pencil: 夏
  {
    const [cx, cy] = at(0.45, 15.0);
    const w = 0.1 * PX, h = 0.064 * PX;
    g.save(); g.translate(cx, cy); g.rotate(-0.35);
    shadow(() => { g.fillStyle = '#2a2a2c'; g.fillRect(-w / 2, -h / 2, w, h); });
    g.fillStyle = '#cfc8b0'; g.fillRect(-w * 0.42, -h * 0.4, w * 0.84, h * 0.42);
    g.fillStyle = '#111'; g.beginPath(); g.arc(-w * 0.2, h * 0.18, h * 0.12, 0, 7); g.arc(w * 0.2, h * 0.18, h * 0.12, 0, 7); g.fill();
    g.fillStyle = 'rgba(40,40,40,0.8)';
    g.font = '9px "Shippori Mincho B1", serif';
    g.fillText('夏', -w * 0.3, -h * 0.12);
    g.restore();
  }

  // a photograph: people in front of a long building, faces gone to water
  {
    const [cx, cy] = at(-0.5, 15.25);
    const w = 0.089 * PX, h = 0.064 * PX;
    g.save(); g.translate(cx, cy); g.rotate(0.15);
    shadow(() => { g.fillStyle = '#e9e3d0'; g.fillRect(-w / 2, -h / 2, w, h); });
    const gr = g.createLinearGradient(0, -h / 2, 0, h / 2);
    gr.addColorStop(0, '#b9a98a'); gr.addColorStop(1, '#6e5f48');
    g.fillStyle = gr; g.fillRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6);
    g.fillStyle = 'rgba(60,50,38,0.8)'; g.fillRect(-w / 2 + 3, -h * 0.15, w - 6, h * 0.18);
    g.fillRect(w * 0.22, -h * 0.42, 3, h * 0.3);
    for (let k = 0; k < 9; k++) {
      const x = -w / 2 + 7 + k * (w - 14) / 8;
      g.fillStyle = 'rgba(40,32,24,0.85)';
      g.beginPath(); g.arc(x, h * 0.08, 2.2, 0, 7); g.fill();
      g.fillRect(x - 2.2, h * 0.1, 4.4, h * 0.22);
    }
    g.fillStyle = 'rgba(230,226,210,0.45)';
    g.beginPath(); g.ellipse(w * 0.1, -h * 0.05, w * 0.22, h * 0.25, 0.3, 0, 7); g.fill();
    g.restore();
  }

  // a red hair clip, a key, a little tin train car of this line
  {
    let [cx, cy] = at(0.08, 12.4);
    g.save(); g.translate(cx, cy); g.rotate(1.1);
    shadow(() => { g.fillStyle = '#a3262b'; g.fillRect(-12, -2.5, 24, 5); g.beginPath(); g.arc(12, 0, 4, 0, 7); g.fill(); });
    g.restore();
    [cx, cy] = at(-0.7, 13.8);
    g.save(); g.translate(cx, cy); g.rotate(-0.6);
    shadow(() => {
      g.strokeStyle = '#8a8268'; g.lineWidth = 3; g.beginPath(); g.arc(-8, 0, 6, 0, 7); g.stroke();
      g.fillStyle = '#8a8268'; g.fillRect(-2, -1.5, 18, 3); g.fillRect(10, 1, 3, 4); g.fillRect(14, 1, 2, 3);
    });
    g.restore();
    [cx, cy] = at(0.62, 13.6);
    g.save(); g.translate(cx, cy); g.rotate(0.25);
    shadow(() => {
      g.fillStyle = '#d6cfb4'; g.fillRect(-26, -9, 52, 18);
      g.fillStyle = '#3d5a4c'; g.fillRect(-26, -2, 52, 4);
      g.fillStyle = '#5a4a36';
      for (let k = 0; k < 5; k++) g.fillRect(-22 + k * 9.5, -8, 6, 5);
    });
    g.fillStyle = 'rgba(120,70,30,0.5)'; g.fillRect(-26, 5, 30, 4);
    g.restore();
  }

  // a small bell
  {
    const [cx, cy] = at(-0.08, 15.45);
    shadow(() => {
      const gr = g.createRadialGradient(cx - 3, cy - 3, 0, cx, cy, 10);
      gr.addColorStop(0, '#d8c47a'); gr.addColorStop(1, '#7c6a2c');
      g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, 9, 0, 7); g.fill();
    });
    g.strokeStyle = '#3a2f12'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx - 6, cy + 2); g.lineTo(cx + 6, cy + 2); g.stroke();
  }

  // weed and silt over everything
  for (let i = 0; i < 70; i++) {
    const x = rnd() * W, y = rnd() * H;
    g.strokeStyle = `rgba(${30 + rnd() * 30},${50 + rnd() * 30},${20},${0.25 + rnd() * 0.3})`;
    g.lineWidth = 1 + rnd() * 2;
    g.beginPath(); g.moveTo(x, y);
    let a = rnd() * 6;
    for (let k = 0; k < 6; k++) { a += (rnd() - 0.5) * 0.8; g.lineTo(x + Math.cos(a) * k * 9, y + Math.sin(a) * k * 9); }
    g.stroke();
  }
  return c;
}

// Four rows of glowing scrawl (the soapstone "handwriting"), white on black.
export function scribbleCanvas() {
  const W = 512, H = 512;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, W, H);
  const rnd = mulberry(77);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (let row = 0; row < 4; row++) {
    const y0 = row * 128;
    for (let line = 0; line < 2; line++) {
      const cy = y0 + 46 + line * 40;
      let x = 50 + rnd() * 20;
      const end = 470 - rnd() * (line ? 140 : 40);
      g.strokeStyle = 'rgba(255,255,255,0.95)';
      g.shadowColor = 'rgba(255,255,255,0.9)';
      g.shadowBlur = 6;
      g.lineWidth = 3.2;
      while (x < end) {
        const wlen = 18 + rnd() * 40;
        g.beginPath();
        g.moveTo(x, cy + (rnd() - 0.5) * 10);
        const steps = 3 + Math.floor(rnd() * 4);
        for (let k = 0; k < steps; k++) {
          const nx = x + (wlen / steps) * (k + 1);
          g.quadraticCurveTo(nx - wlen / steps / 2 + (rnd() - 0.5) * 8, cy + (rnd() - 0.5) * 34, nx, cy + (rnd() - 0.5) * 14);
        }
        g.stroke();
        x += wlen + 10 + rnd() * 10;
      }
    }
  }
  return c;
}

export async function fontsReady(timeout = 1500) {
  if (!document.fonts || !document.fonts.load) return;
  const want = ['700 40px "Zen Kaku Gothic New"', '500 20px "IBM Plex Mono"', '800 20px "Shippori Mincho B1"'];
  await Promise.race([
    Promise.all(want.map((f) => document.fonts.load(f, '区域くいき蛍川夏').catch(() => {}))),
    new Promise((r) => setTimeout(r, timeout)),
  ]);
}
