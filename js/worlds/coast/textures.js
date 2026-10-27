// Procedural textures for 黄昏ヶ浜, generated once in code.
//  • noise: 256² RGBA of independent uniform values (value-noise source)
//  • ripple: a tileable sea-surface patch built from integer-wavenumber plane waves,
//    R = height, G/B = slope (dh/du, dh/dv), so one texture fetch gives a smooth gradient.

function rng(seed) {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}

export function noiseData(seed = 20241027) {
  const r = rng(seed);
  const d = new Uint8Array(256 * 256 * 4);
  for (let i = 0; i < d.length; i++) d[i] = (r() * 256) | 0;
  return d;
}

export function rippleData(seed = 7) {
  const N = 256;
  const r = rng(seed);
  const TAU = Math.PI * 2;
  const waves = [];
  for (let i = 0; i < 44; i++) {
    const mag = 3 + Math.floor(r() * r() * 19);
    const ang = -Math.PI / 2 + (r() - 0.5) * Math.PI * 1.1;
    let kx = Math.round(Math.cos(ang) * mag);
    let ky = Math.round(Math.sin(ang) * mag);
    if (!kx && !ky) ky = -3;
    const k = Math.hypot(kx, ky);
    waves.push({ kx, ky, amp: Math.pow(k, -1.7) * (0.55 + 0.9 * r()), ph: r() * TAU });
  }
  const h = new Float32Array(N * N);
  const gx = new Float32Array(N * N);
  const gy = new Float32Array(N * N);
  const sx = new Float32Array(N), cx = new Float32Array(N), sy = new Float32Array(N), cy = new Float32Array(N);
  for (const w of waves) {
    for (let i = 0; i < N; i++) {
      const a = (TAU * w.kx * i) / N;
      const b = (TAU * w.ky * i) / N + w.ph;
      sx[i] = Math.sin(a); cx[i] = Math.cos(a);
      sy[i] = Math.sin(b); cy[i] = Math.cos(b);
    }
    const ax = w.amp * TAU * w.kx, ay = w.amp * TAU * w.ky;
    for (let y = 0; y < N; y++) {
      const syy = sy[y], cyy = cy[y];
      const row = y * N;
      for (let x = 0; x < N; x++) {
        const s = sx[x] * cyy + cx[x] * syy;
        const c = cx[x] * cyy - sx[x] * syy;
        h[row + x] += w.amp * s;
        gx[row + x] += ax * c;
        gy[row + x] += ay * c;
      }
    }
  }
  let hMin = Infinity, hMax = -Infinity, gMax = 0, gSq = 0;
  for (let i = 0; i < N * N; i++) {
    hMin = Math.min(hMin, h[i]); hMax = Math.max(hMax, h[i]);
    gMax = Math.max(gMax, Math.abs(gx[i]), Math.abs(gy[i]));
    gSq += gx[i] * gx[i] + gy[i] * gy[i];
  }
  const rmsC = Math.sqrt(gSq / (2 * N * N));
  const d = new Uint8Array(N * N * 4);
  for (let i = 0; i < N * N; i++) {
    d[i * 4] = Math.round(((h[i] - hMin) / (hMax - hMin)) * 255);
    d[i * 4 + 1] = Math.round((0.5 + 0.5 * gx[i] / gMax) * 255);
    d[i * 4 + 2] = Math.round((0.5 + 0.5 * gy[i] / gMax) * 255);
    d[i * 4 + 3] = 255;
  }
  return { data: d, k: gMax / rmsC };
}
