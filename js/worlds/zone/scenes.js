// Places of the Zone, JS side: ground heights (mirroring the GLSL), walkable bounds,
// where things lie, how the air sounds, and how the film is graded.

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function sandH(x, z) {
  const s = 0.5 + 0.5 * Math.sin(0.38 * x + 0.21 * z + 1.1 * Math.sin(0.09 * z + 0.2 * x));
  const e = Math.max(Math.abs(x) - 7, 0);
  return -0.3 + 1.05 * s * s + 0.12 * Math.sin(0.9 * x - 0.5 * z) + 0.02 * e * e;
}

// Grass instance generators: push(x, y, z, h, seed)
function grassPlatform(push, rnd) {
  const pathX = (z) => 0.6 * Math.sin(z * 0.17) + 0.2;
  for (let i = 0; i < 12000; i++) {
    const z = 3.0 + Math.pow(rnd(), 1.5) * 46;
    const x = (rnd() - 0.5) * (8 + z * 1.4);
    if (z < 3.4 && Math.abs(x) > 1.7) continue;
    const onPath = Math.abs(x - pathX(z)) < 0.8;
    if (onPath && rnd() < 0.88) continue;
    const near = Math.min(1, Math.max(0, (z - 3) / 10));
    const h = 0.14 + rnd() * (0.3 + 0.45 * near) + (rnd() < 0.08 ? 0.35 : 0);
    push(x, 0, z, h, rnd());
  }
  for (let i = 0; i < 1800; i++) { // the far platform, gone to seed
    const x = (rnd() - 0.5) * 40, z = -8.8 + rnd() * 2.2;
    push(x, 0.8, z, 0.2 + rnd() * 0.5, rnd());
  }
  for (let i = 0; i < 1300; i++) { // weeds between the sleepers of the dead track
    const x = (rnd() - 0.5) * 40, z = -6.4 + rnd() * 1.9;
    push(x, 0, z, 0.1 + rnd() * 0.35, rnd());
  }
  for (let i = 0; i < 400; i++) { // cracks in our platform
    const x = (rnd() - 0.5) * 30, z = -1.3 + rnd() * 2.6;
    if (Math.abs(x) < 0.9 && z > -0.7) continue;
    push(x, 0.8, z, 0.06 + rnd() * 0.2, rnd());
  }
}
function grassField(push, rnd) {
  const pathX = (z) => 0.8 * Math.sin(z * 0.21) + 0.5 * Math.sin(z * 0.07 + 1);
  for (let i = 0; i < 20000; i++) {
    const z = -4 + Math.pow(rnd(), 1.2) * 30;
    const x = (rnd() - 0.5) * (14 + Math.max(0, z) * 1.3);
    const onPath = Math.abs(x - pathX(z)) < 0.9;
    if (onPath && rnd() < 0.85) continue;
    if (Math.hypot(x - 4.7, z - 11.6) < 1.6 && rnd() < 0.7) continue;
    const side = Math.min(1, Math.abs(x) / 6);
    push(x, 0, z, 0.15 + rnd() * (0.35 + 0.5 * side) + (rnd() < 0.06 ? 0.4 : 0), rnd());
  }
}
function grassMonolith(push, rnd) {
  for (let i = 0; i < 6000; i++) {
    const along = rnd() < 0.5;
    const k = Math.round((rnd() - 0.5) * 16);
    const line = k * 4 - 2;
    const t = -30 + rnd() * 75;
    const x = along ? line + (rnd() - 0.5) * 0.12 : (rnd() - 0.5) * 60;
    const z = along ? t : line + (rnd() - 0.5) * 0.12 + 40 * 0;
    if (z > 44 || z < -10) continue;
    if (Math.hypot(x, z - 41.4) < 1.2) continue;
    push(x, 0, z, 0.08 + rnd() * 0.4, rnd());
  }
}

export const SCENES = {
  platform: {
    vfov: 50,
    fog: [0.6, 0.59, 0.555], fogDen: 0.034, fogK: 0.09,
    grassA: [0.2, 0.2, 0.11], grassB: [0.56, 0.52, 0.33], grassLight: 1.15,
    tint: [1.0, 1.01, 0.95], sat: 0.72, expo: 1.0, bloom: 0.5, vig: 0.42, grain: 0.07,
    rain: 0.45, rainCol: [0.75, 0.76, 0.72], wind: 0.55,
    start: { x: 0, z: 0, yaw: Math.PI - 0.95, pitch: -0.03 },
    eye: 1.62,
    ground(x, z) {
      if (z <= 1.4 && z >= -1.6) return 0.8;
      if (z > 1.4 && z < 3.4 && Math.abs(x) < 1.7) return 0.8 - 0.4 * (z - 1.4);
      return 0;
    },
    surface(x, z) { return z < 1.4 ? 'concrete' : z < 3.4 ? 'gravel' : 'grass'; },
    clampT(x, z) {
      if (z < 3.6) x = clamp(x, -1.35, 1.35);
      return [clamp(x, -3.2, 3.2), clamp(z, 0.4, 15.6)];
    },
    exitZ: 13.9,
    grass: grassPlatform,
    anomalies: { fixed: [{ type: 'haze', x: 0.1, z: 10.6, r: 1.4 }], random: 1, types: ['haze', 'back'], zMin: 9.2, safe: 7.6 },
    messages: [{ key: 'precious', x: 0.25, z: 2.6, yaw: 0 }],
    archives: [{ key: 'log', x: 1.15, z: 5.1 }],
    amb: { wind: 0.5, grass: 0.35, rain: 0.35, dog: 1, groan: 0.6, drip: 0, water: 0, room: 0, birds: 0 },
    drone: { cut: 380, dis: 0.6, metal: 0.35 },
  },
  field: {
    vfov: 52,
    fog: [0.53, 0.57, 0.52], fogDen: 0.03, fogK: 0.11,
    grassA: [0.12, 0.15, 0.07], grassB: [0.44, 0.46, 0.25], grassLight: 0.9,
    tint: [0.95, 1.03, 0.94], sat: 0.7, expo: 1.03, bloom: 0.5, vig: 0.45, grain: 0.065,
    rain: 0.55, rainCol: [0.72, 0.76, 0.72], wind: 0.7,
    start: { x: 0, z: 0, yaw: 0, pitch: -0.04 },
    eye: 1.62,
    ground() { return 0; },
    surface(x, z) {
      const px = 0.8 * Math.sin(z * 0.21) + 0.5 * Math.sin(z * 0.07 + 1);
      return Math.abs(x - px) < 0.9 ? 'mud' : 'grass';
    },
    clampT(x, z) { return [clamp(x, -3.1, 3.1), clamp(z, 0.4, 23.2)]; },
    exitZ: 21.6,
    grass: grassField,
    anomalies: {
      fixed: [{ type: 'well', x: -1.0, z: 8.4, r: 1.35 }, { type: 'haze', x: 1.7, z: 6.7, r: 1.05 }],
      random: 3, types: ['haze', 'well', 'whirl', 'back'], zMin: 9.5, safe: 3.2,
    },
    messages: [{ key: 'liar', x: -1.0, z: 4.7, yaw: 0.1 }, { key: 'struggler', x: 2.5, z: 11.2, yaw: -0.5 }],
    archives: [{ key: 'crew', x: -2.7, y: 0, z: 10.6 }, { key: 'notice', x: 2.3, y: 0, z: 20.4 }],
    blood: { x: 1.3, z: 2.9, toX: 1.65, toZ: 6.7 },
    slab: { x: 4.7, z: 11.6 },
    amb: { wind: 0.65, grass: 0.55, rain: 0.42, dog: 1, groan: 1, drip: 0, water: 0, room: 0, birds: 0 },
    drone: { cut: 420, dis: 0.7, metal: 0.45 },
  },
  tunnel: {
    vfov: 54,
    fog: [0.02, 0.024, 0.02], fogDen: 0.045, fogK: 0,
    tint: [0.94, 1.02, 0.96], sat: 0.6, expo: 1.25, bloom: 0.85, vig: 0.55, grain: 0.085,
    rain: 0, wind: 0,
    start: { x: 0, z: -2, yaw: 0, pitch: -0.02 },
    eye: 1.6,
    ground() { return 0.25; },
    surface(x) { return Math.abs(x) < 0.45 ? 'water' : 'concrete'; },
    clampT(x, z) { return [clamp(x, -1.0, 1.0), clamp(z, -1.6, 30)]; },
    exitZ: 27.5,
    anomalies: { fixed: [], random: 4, types: ['haze', 'well', 'back'], zMin: 2.5, safe: 3.0, xr: 1.0, rr: [0.65, 0.85] },
    messages: [{ key: 'listen', x: -0.35, z: 1.4, yaw: 0 }],
    archives: [{ key: 'radio', x: 0.7, y: 0.25, z: 14.4 }],
    amb: { wind: 0.08, grass: 0, rain: 0, dog: 0, groan: 1.2, drip: 0.7, water: 0.9, room: 0.5, birds: 0 },
    drone: { cut: 300, dis: 1.0, metal: 0.7 },
    dark: true,
  },
  corridor: {
    vfov: 54,
    fog: [0.12, 0.14, 0.125], fogDen: 0.035, fogK: 0,
    tint: [0.93, 1.03, 0.97], sat: 0.66, expo: 1.3, bloom: 0.75, vig: 0.5, grain: 0.07,
    rain: 0, wind: 0,
    start: { x: 0, z: -1.2, yaw: 0, pitch: -0.08 },
    eye: 1.62,
    ground() { return 0.14; },
    surface() { return 'water'; },
    clampT(x, z) { return [clamp(x, -1.2, 1.2), clamp(z, -1, 31.6)]; },
    exitZ: 30.2,
    anomalies: { fixed: [], random: 4, types: ['haze', 'well', 'back'], zMin: 3, safe: 3.0, xr: 1.15, rr: [0.6, 0.8], skip: [11.2, 16.4] },
    messages: [{ key: 'japanese', x: -0.75, z: 10.4, yaw: 0 }, { key: 'goen', x: 0.7, z: 18.2, yaw: 0 }],
    archives: [{ key: 'page', x: -0.32, y: 0.14, z: 14.5, after: 'pan' }, { key: 'ticket', x: 0.42, y: 0.14, z: 12.9, after: 'pan' }],
    pan: { z0: 10.6, from: 11.6, to: 15.4 },
    amb: { wind: 0.12, grass: 0, rain: 0, dog: 0, groan: 0.5, drip: 1.2, water: 0.35, room: 0.6, birds: 0 },
    drone: { cut: 340, dis: 0.8, metal: 0.55 },
    water: true,
  },
  dunes: {
    vfov: 56,
    fog: [0.42, 0.4, 0.34], fogDen: 0.018, fogK: 0,
    tint: [1.02, 1.0, 0.92], sat: 0.7, expo: 1.05, bloom: 0.7, vig: 0.45, grain: 0.065,
    rain: 0, wind: 0.2,
    start: { x: 0, z: -1.5, yaw: 0, pitch: 0.02 },
    eye: 1.62,
    ground(x, z) { return Math.max(0, sandH(x, z)); },
    surface(x, z) { return sandH(x, z) > 0.02 ? 'sand' : 'wood'; },
    clampT(x, z) { return [clamp(x, -5, 5), clamp(z, -1, 36)]; },
    exitZ: 33.5,
    anomalies: { fixed: [], random: 4, types: ['haze', 'well', 'whirl', 'back'], zMin: 4, safe: 3.2, xr: 4.2 },
    messages: [{ key: 'summer', x: -1.3, z: 6.6, yaw: 0.2 }, { key: 'generic', x: 1.7, z: 19.2, yaw: -0.2 }],
    archives: [{ key: 'essay', x: -3.5, z: 14.7 }, { key: 'letter', x: 2.4, z: 31.5 }],
    amb: { wind: 0.35, grass: 0, rain: 0, dog: 0, groan: 0.7, drip: 0, water: 0, room: 0.7, birds: 1 },
    drone: { cut: 460, dis: 0.6, metal: 0.4 },
  },
  monolith: {
    vfov: 56,
    fog: [0.5, 0.53, 0.5], fogDen: 0.026, fogK: 0.022,
    grassA: [0.08, 0.1, 0.05], grassB: [0.34, 0.37, 0.2], grassLight: 0.85,
    tint: [0.95, 1.02, 0.97], sat: 0.66, expo: 1.0, bloom: 0.6, vig: 0.48, grain: 0.065,
    rain: 0.6, rainCol: [0.7, 0.74, 0.72], wind: 0.5,
    start: { x: 0, z: 16, yaw: 0, pitch: 0.13 },
    eye: 1.62,
    ground() { return 0; },
    surface() { return 'wetconcrete'; },
    clampT(x, z) { return [clamp(x, -4, 4), clamp(z, 16.4, 38.7)]; },
    exitZ: 37.9,
    grass: grassMonolith,
    anomalies: { fixed: [], random: 3, types: ['haze', 'well', 'whirl'], zMin: 20, zMax: 36, safe: 3.2, xr: 3.6 },
    messages: [{ key: 'hurry', x: -0.9, z: 23.6, yaw: 0 }, { key: 'bonfire', x: 1.0, z: 35.2, yaw: -0.1 }],
    archives: [{ key: 'note', x: -1.7, z: 29.6 }],
    bonfire: { x: 0, z: 41.4 },
    amb: { wind: 0.7, grass: 0.2, rain: 0.5, dog: 1, groan: 1, drip: 0, water: 0, room: 0, birds: 0 },
    drone: { cut: 360, dis: 0.9, metal: 0.5 },
  },
  coda: {
    vfov: 40,
    fog: [0.62, 0.63, 0.6], fogDen: 0.05, fogK: 0,
    tint: [1, 1, 0.97], sat: 0.6, expo: 1.0, bloom: 0.75, vig: 0.5, grain: 0.08,
    rain: 0, wind: 0,
    start: { x: 0.22, z: -0.95, yaw: 0.1, pitch: -0.19 },
    eye: 1.02,
    ground() { return 0; },
    surface() { return 'wood'; },
    clampT(x, z) { return [x, z]; },
    exitZ: 1e9,
    anomalies: { fixed: [], random: 0, types: [] },
    messages: [], archives: [],
    amb: { wind: 0.15, grass: 0, rain: 0.25, dog: 0, groan: 0, drip: 0, water: 0, room: 0.4, birds: 0 },
    drone: { cut: 300, dis: 0.2, metal: 0.1 },
  },
};

export const ORDER = ['platform', 'field', 'tunnel', 'corridor', 'dunes', 'monolith'];

// Seeded RNG
export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return (s >>> 0) / 4294967296;
  };
}

const R = { haze: [1.0, 1.35], well: [0.9, 1.25], whirl: [0.85, 1.1], back: [0.8, 1.1] };

// Lay out anomalies so that a winding lane always survives, and the straight line never does.
export function layAnomalies(id, seed) {
  const S = SCENES[id];
  const A = S.anomalies;
  const rnd = rng(seed);
  const out = A.fixed.map((a) => ({ ...a }));
  if (!A.random) return out;
  const xr = A.xr ?? 3.0;
  const z0 = A.zMin ?? 3, z1 = A.zMax ?? (S.exitZ - 1.5);
  // the lane: a zig-zag from the start to the exit
  const lane = [[S.start.x, S.start.z]];
  let side = rnd() < 0.5 ? -1 : 1;
  for (let z = S.start.z + 3.5; z < S.exitZ + 1; z += 3.2 + rnd() * 1.6) {
    lane.push([side * (0.35 + rnd() * 0.55) * xr * 0.75, z]);
    side = -side;
  }
  lane.push([0, S.exitZ + 1]);
  const segDist = (x, z) => {
    let m = 1e9;
    for (let i = 0; i < lane.length - 1; i++) {
      const [ax, az] = lane[i], [bx, bz] = lane[i + 1];
      const dx = bx - ax, dz = bz - az;
      const t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz), 0, 1);
      m = Math.min(m, Math.hypot(x - ax - dx * t, z - az - dz * t));
    }
    return m;
  };
  // fixed ones must also leave the lane; nudge lane points away from them
  for (const f of out) {
    for (const p of lane) if (Math.hypot(p[0] - f.x, p[1] - f.z) < f.r + 0.8) p[0] = clamp(f.x + Math.sign(p[0] - f.x || 1) * (f.r + 1.0), -xr, xr);
  }
  let tries = 0;
  while (out.length < A.fixed.length + A.random && tries++ < 400) {
    const type = A.types[Math.floor(rnd() * A.types.length)];
    const rr = A.rr || R[type];
    const r = rr[0] + rnd() * (rr[1] - rr[0]);
    const z = z0 + rnd() * (z1 - z0);
    if (A.skip && z > A.skip[0] - r && z < A.skip[1] + r) continue;
    // bias toward the straight line ahead so walking straight is punished
    const x = rnd() < 0.55 ? (rnd() - 0.5) * 0.6 : (rnd() * 2 - 1) * xr;
    if (segDist(x, z) < r + 0.55) continue;
    if (Math.hypot(x - S.start.x, z - S.start.z) < (A.safe ?? 3) + r) continue;
    if (out.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + r + 0.3)) continue;
    out.push({ type, x, z, r });
  }
  return out;
}

export const MAX_THROW = 7.2;
