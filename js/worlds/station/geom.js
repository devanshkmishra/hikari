// 夏ヶ原 — world geometry. One camera, one set of measurements, shared by the painter,
// the overlay (train, birds) and the hotspots, so everything agrees about where things are.
// Units are metres. Y is up (platform surface = 0), Z runs away from you down the line.

export const G = {
  eyeY: 1.55,          // standing on the platform
  eyeX: 0.2,
  railY: -0.98,        // top of rail
  ballastY: -1.12,
  fieldY: -1.75,       // the paddies sit lower than the line
  roadY: -1.25,
  trackX: -3.4,        // centre of the single track
  gauge: 1.067,
  platEdge: -1.75,
  platBack: 3.3,
  platEnd: 52,
  whiteLine: [-1.28, -1.2],
  tactile: [-1.02, -0.72],
  crossingZ: 138,
  curveZ: 150,
  shelter: { x0: 0.8, x1: 3.1, z0: 9.0, z1: 12.0, hF: 2.55, hB: 2.32, eave: 0.62 },
  vend: { x0: 2.2, x1: 3.13, z0: 6.1, z1: 6.85, h: 1.83 },
  board: { x0: -0.4, x1: 1.2, z: 19, y0: 1.66, y1: 2.3 },
  pole: { x: 3.9, z: 11.4, top: 9.8 },
  bikes: { x0: 4.0, x1: 6.6, z0: 4.9, z1: 7.9 },
  stopZ: 14.5,         // where the front of the train comes to rest
  carLen: 21.3,
};

// things that belong to the waiting room move with it
{
  const sh = G.shelter;
  G.nest = { x: 0.98, y: 2.42, z: sh.z0 - 0.06 };
  G.furin = { x: 2.05, y: 2.5, z: sh.z0 - sh.eave + 0.04 };
  G.notebook = { x0: 1.62, x1: 1.88, y0: 0.43, y1: 0.8, z: sh.z1 - 0.45 };
  G.clock = { x: 1.98, y: 1.86, z: sh.z1 - 0.04, r: 0.13 };
  G.timetable = { x0: 2.28, x1: 2.78, y0: 1.18, y1: 1.72, z: sh.z1 - 0.04 };
}

export function trackXAt(z) {
  return z < G.curveZ ? G.trackX : G.trackX - 0.0009 * (z - G.curveZ) * (z - G.curveZ);
}

// The camera. Composition changes with aspect so a phone still sees the shelter and the line.
export function makeCam(W, H) {
  const ar = W / H;
  let f, vpX, vpY;
  if (ar < 0.8) {          // phone portrait
    f = H * 0.62; vpX = W * 0.44; vpY = H * 0.5;
  } else if (ar < 1.25) {  // squarish / tablet portrait
    f = Math.max(W * 0.78, H * 0.72); vpX = W * 0.4; vpY = H * 0.52;
  } else {
    f = Math.max(W * 0.70, H * 1.08); vpX = W * 0.38; vpY = H * 0.535;
  }
  return { W, H, f, vpX, vpY, ex: G.eyeX, ey: G.eyeY, dx: 0, dy: 0 };
}

export function project(cam, X, Y, Z) {
  const z = Math.max(Z, 0.05);
  return [
    cam.vpX + cam.f * (X - cam.ex - cam.dx) / z,
    cam.vpY - cam.f * (Y - cam.ey - cam.dy) / z,
  ];
}

// screen y on a horizontal plane at height Y, at distance Z
export const yAt = (cam, Y, Z) => cam.vpY - cam.f * (Y - cam.ey) / Z;

// Deterministic randomness so a repaint after resize gives the same town.
export function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const h1 = (i, s) => {
  let x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
  return x - Math.floor(x);
};
export function vnoise1(x, s = 0) {
  const i = Math.floor(x), f = x - i;
  const u = f * f * (3 - 2 * f);
  return h1(i, s) * (1 - u) + h1(i + 1, s) * u;
}
export function fbm1(x, s = 0, oct = 5) {
  let v = 0, a = 0.5, fr = 1, n = 0;
  for (let k = 0; k < oct; k++) { v += a * vnoise1(x * fr, s + k * 17); n += a; a *= 0.5; fr *= 2.03; }
  return v / n;
}

export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
