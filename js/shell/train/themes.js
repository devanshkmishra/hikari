// What lies beyond the glass between each pair of stations. One entry per world, plus the
// tunnel between them and the stars at the end of the line. Colours are sRGB hex; the
// renderer linearises them.

export const THEMES = {
  // 夏ヶ原 — overcast late afternoon in high summer; rice, wires, hills going blue with distance.
  station: {
    sky: { zen: '#8fa2b3', hor: '#e6e4d6', horPow: 3.2, sun: [-0.42, 0.34, -0.84], sunSize: 1.6, sunCol: '#ffe0b0', sunI: 1.0, glow: 0.7,
      cloud: '#f4f1e7', shade: '#9aa29f', cover: 0.62, scale: 0.85, stars: 0, mode: 0 },
    light: { ambLo: '#151915', ambHi: '#2f363a', winL: 0.4, winCol: '#e9eadf', flu: 0.08, sun: 1.6, sunCol: '#ffe2b4', expo: 0.95,
      lift: [0.018, 0.03, 0.03], gam: [1.07, 1.06, 1.06], gain: [1.0, 0.985, 0.95], sat: 0.86,
      outAmb: '#a9b1aa', outAmbI: 0.5, outSun: '#ffe7c4', outSunI: 0.75 },
    ground: { type: 1, y: -2.0, g1: '#56813a', g2: '#7d9c48', g3: '#8f8a62', refl: '#c9d2d0' },
    track: { ballast: '#8a857a', glint: '#d8dde0' },
    fog: { col: '#d9dccf', den: 0.0011, floor: 0.0 },
    strips: [
      { kind: 'ridges', D: 1500, H: 300, base: -2, W: 5600, tex: [2048, 512], seed: 11, cols: ['#9fb0bd', '#8397a8', '#6d8396'] },
      { kind: 'forest', D: 330, H: 58, base: -2, W: 1150, tex: [2048, 512], seed: 23 },
      { kind: 'village', D: 62, H: 15, base: -2, W: 380, tex: [2048, 512], seed: 37, occ: true },
    ],
    poles: { D: 8.6, period: 42, style: 'concrete', top: 6.4, wires: 3, near: -11 },
    crossings: true, ambience: 'summer', rain: 0, particles: null, platform: 'rural',
  },

  // 銀座 1985 — night, wet streets far below the viaduct, signs in every colour.
  showa: {
    sky: { zen: '#0b0a1a', hor: '#3d2240', horPow: 5.5, sun: [0.3, 0.55, 0.78], sunSize: 0.5, sunCol: '#9aa6ff', sunI: 0.12, glow: 0.2,
      cloud: '#3a2238', shade: '#140f1c', cover: 0.45, scale: 0.7, stars: 0.0, mode: 1, cityGlow: 1.0 },
    light: { ambLo: '#07060a', ambHi: '#0f0c14', winL: 0.05, winCol: '#ff8fb8', flu: 0.46, sun: 0.0, sunCol: '#000000', expo: 1.05,
      lift: [0.012, 0.03, 0.026], gam: [1.0, 0.98, 1.0], gain: [1.06, 0.98, 0.9], sat: 1.1,
      outAmb: '#3a2d48', outAmbI: 0.22, outSun: '#000000', outSunI: 0.0 },
    ground: { type: 2, y: -9.0, g1: '#ff5fa2', g2: '#ffb347', g3: '#62d6ff', refl: '#2a1830' },
    track: { ballast: '#3e3a3a', glint: '#ff9fc4' },
    fog: { col: '#241628', den: 0.0035, floor: 0.0 },
    strips: [
      { kind: 'skyline', D: 950, H: 140, base: -9, W: 2600, tex: [2048, 512], seed: 41, emis: true },
      { kind: 'neon', D: 120, H: 60, base: -9, W: 560, tex: [2048, 512], seed: 43, emis: true },
      { kind: 'fronts', D: 24, H: 14, base: -9, W: 190, tex: [2048, 512], seed: 47, emis: true },
    ],
    poles: { D: 11, period: 31, style: 'lamp', top: 6.0, wires: 0, near: -12 },
    crossings: false, ambience: 'city', rain: 0, particles: null, platform: 'city', neonLights: true,
  },

  // 水色ヶ丘 — the glossy optimistic future: a green hill, a perfect sky, bubbles.
  aero: {
    sky: { zen: '#1d78dc', hor: '#c4ecff', horPow: 2.6, sun: [-0.32, 0.62, -0.72], sunSize: 1.4, sunCol: '#fffbe8', sunI: 1.0, glow: 0.8,
      cloud: '#ffffff', shade: '#b3d0ea', cover: 0.46, scale: 0.55, stars: 0, mode: 0 },
    light: { ambLo: '#18232b', ambHi: '#3d566a', winL: 0.55, winCol: '#e8f6ff', flu: 0.06, sun: 1.8, sunCol: '#fffaf0', expo: 0.92,
      lift: [0.0, 0.02, 0.045], gam: [1.0, 1.0, 1.0], gain: [0.99, 1.02, 1.06], sat: 1.14,
      outAmb: '#cfe8ff', outAmbI: 0.55, outSun: '#fffaf0', outSunI: 0.8 },
    ground: { type: 3, y: -2.0, g1: '#2fae35', g2: '#a4e35a', g3: '#5fd04a', refl: '#8fd4ff' },
    track: { ballast: '#b8bfc4', glint: '#ffffff' },
    fog: { col: '#cdeeff', den: 0.0006, floor: 0.0 },
    strips: [
      { kind: 'aerofar', D: 1700, H: 160, base: -2, W: 5200, tex: [2048, 512], seed: 51 },
      { kind: 'aerohill', D: 360, H: 80, base: -2, W: 1500, tex: [2048, 512], seed: 53 },
      { kind: 'aeronear', D: 70, H: 13, base: -2, W: 520, tex: [2048, 512], seed: 59, occ: true },
    ],
    poles: null, crossings: false, ambience: 'aero', rain: 0, particles: 'bubbles', platform: 'aero',
  },

  // 円町 — nothing at all, and in it, circles closing to the beat.
  circles: {
    sky: { zen: '#040306', hor: '#170914', horPow: 7, sun: [0, 1, 0], sunSize: 0, sunCol: '#000000', sunI: 0, glow: 0,
      cloud: '#000000', shade: '#000000', cover: 0, scale: 1, stars: 0.0, mode: 2, voidRings: 1.0 },
    light: { ambLo: '#050306', ambHi: '#0b070c', winL: 0.0, winCol: '#ff66aa', flu: 0.42, sun: 0.0, sunCol: '#000000', expo: 1.05,
      lift: [0.012, 0.0, 0.02], gam: [1.0, 1.0, 1.0], gain: [1.04, 0.98, 1.02], sat: 1.05,
      outAmb: '#1a0d16', outAmbI: 0.2, outSun: '#000000', outSunI: 0 },
    ground: { type: 4, y: -2.0, g1: '#ff66aa', g2: '#000000', g3: '#000000', refl: '#000000' },
    track: { ballast: '#151216', glint: '#ff66aa' },
    fog: { col: '#06040a', den: 0.004, floor: 0.0 },
    strips: [],
    poles: null, crossings: false, ambience: 'circles', rain: 0, particles: 'rings', platform: 'void',
  },

  // 地下 — underground: a tunnel that does not end, paint on every surface, flash.
  rage: {
    sky: { zen: '#000000', hor: '#000000', horPow: 1, sun: [0, 1, 0], sunSize: 0, sunCol: '#000000', sunI: 0, glow: 0,
      cloud: '#000000', shade: '#000000', cover: 0, scale: 1, stars: 0, mode: 0 },
    light: { ambLo: '#030303', ambHi: '#070707', winL: 0.0, winCol: '#ff2a2a', flu: 0.4, sun: 0.0, sunCol: '#000000', expo: 1.08,
      lift: [0.0, 0.0, 0.0], gam: [1.08, 1.08, 1.08], gain: [1.08, 1.0, 0.96], sat: 1.2,
      outAmb: '#0b0b0b', outAmbI: 0.25, outSun: '#000000', outSunI: 0 },
    ground: { type: 0, y: -2.0, g1: '#050505', g2: '#000000', g3: '#000000', refl: '#000000' },
    track: { ballast: '#2a2826', glint: '#d8ff3a' },
    fog: { col: '#000000', den: 0.02, floor: 0.0 },
    strips: [],
    poles: null, crossings: false, ambience: 'rage', rain: 0, particles: null, platform: 'under',
    tunnel: 'graffiti',
  },

  // 区域 — the Zone: low cloud, drizzle, birches through broken concrete, monoliths in the mist.
  zone: {
    sky: { zen: '#7b8275', hor: '#b7b9a6', horPow: 1.8, sun: [-0.3, 0.5, -0.8], sunSize: 0, sunCol: '#000000', sunI: 0, glow: 0,
      cloud: '#a3a69a', shade: '#6a6e64', cover: 0.92, scale: 0.6, stars: 0, mode: 0 },
    light: { ambLo: '#151812', ambHi: '#2c3029', winL: 0.34, winCol: '#c6cab6', flu: 0.2, sun: 0.0, sunCol: '#000000', expo: 1.0,
      lift: [0.032, 0.036, 0.022], gam: [1.04, 1.0, 1.05], gain: [0.97, 1.0, 0.88], sat: 0.68,
      outAmb: '#a4a896', outAmbI: 0.55, outSun: '#000000', outSunI: 0 },
    ground: { type: 5, y: -2.0, g1: '#495036', g2: '#6d6b48', g3: '#3a3a2c', refl: '#9ea294' },
    track: { ballast: '#5d584c', glint: '#a7a99a' },
    fog: { col: '#acb09f', den: 0.0068, floor: 0.0 },
    strips: [
      { kind: 'monoliths', D: 900, H: 170, base: -2, W: 3400, tex: [2048, 512], seed: 61 },
      { kind: 'birches', D: 170, H: 34, base: -2, W: 760, tex: [2048, 512], seed: 67 },
      { kind: 'wild', D: 26, H: 5.5, base: -2, W: 210, tex: [2048, 512], seed: 71, occ: true },
    ],
    poles: { D: 10.5, period: 56, style: 'wood', top: 5.2, wires: 2, near: -13, broken: true },
    crossings: false, ambience: 'zone', rain: 0.5, particles: null, platform: 'ruin',
  },

  // 黄昏ヶ浜 — golden hour over a drowned town; a long bridge far out on the water.
  coast: {
    sky: { zen: '#4d5288', hor: '#ffb066', horPow: 5.0, sun: [0.18, 0.075, 0.98], sunSize: 2.6, sunCol: '#ffad5c', sunI: 1.0, glow: 1.5,
      cloud: '#ffd2a0', shade: '#8f5f7e', cover: 0.36, scale: 1.25, stars: 0, mode: 0 },
    light: { ambLo: '#1d1418', ambHi: '#3d2a2c', winL: 0.55, winCol: '#ffc58e', flu: 0.08, sun: 1.6, sunCol: '#ffb36a', expo: 1.0,
      lift: [0.035, 0.02, 0.045], gam: [1.0, 1.0, 1.0], gain: [1.05, 0.97, 0.88], sat: 1.06,
      outAmb: '#c08a7a', outAmbI: 0.5, outSun: '#ffb36a', outSunI: 0.5 },
    ground: { type: 6, y: -2.4, g1: '#2c3058', g2: '#a7716a', g3: '#000000', refl: '#f2a878' },
    track: { ballast: '#7a6a60', glint: '#ffd09a' },
    fog: { col: '#f0a37a', den: 0.0011, floor: 0.0 },
    strips: [
      { kind: 'headlands', D: 2800, H: 110, base: -2.4, W: 7000, tex: [2048, 256], seed: 81 },
      { kind: 'bridge', D: 820, H: 46, base: -2.4, W: 2600, tex: [2048, 512], seed: 83, emis: true },
      { kind: 'drowned', D: 78, H: 10, base: -2.4, W: 560, tex: [2048, 512], seed: 89 },
    ],
    poles: { D: 15, period: 48, style: 'wood', top: 5.0, wires: 2, near: 0, lean: true },
    crossings: false, ambience: 'coast', rain: 0, particles: 'dust', platform: 'coast',
  },

  // 銀河 — the end of the line.
  ginga: {
    sky: { zen: '#02030b', hor: '#0b1236', horPow: 3.0, sun: [0, 1, 0], sunSize: 0, sunCol: '#000000', sunI: 0, glow: 0,
      cloud: '#000000', shade: '#000000', cover: 0, scale: 1, stars: 1.0, mode: 3, galaxy: 1.0 },
    light: { ambLo: '#04060e', ambHi: '#0b1024', winL: 0.08, winCol: '#9fb7ff', flu: 0.1, sun: 0.0, sunCol: '#000000', expo: 1.05,
      lift: [0.01, 0.015, 0.04], gam: [1.0, 1.0, 1.0], gain: [0.98, 1.0, 1.06], sat: 1.0,
      outAmb: '#1a2246', outAmbI: 0.2, outSun: '#000000', outSunI: 0 },
    ground: { type: 0, y: -2.0, g1: '#000000', g2: '#000000', g3: '#000000', refl: '#000000' },
    track: { ballast: '#1a1c28', glint: '#cfe0ff' },
    fog: { col: '#04050c', den: 0.0005, floor: 0.0 },
    strips: [],
    poles: null, crossings: false, ambience: 'ginga', rain: 0, particles: 'stars', platform: 'light',
  },
};

// the tunnel between worlds
export const TUNNEL = {
  light: { ambLo: '#030303', ambHi: '#08080a', winL: 0.0, winCol: '#ffae4a', flu: 0.5, sun: 0.0, sunCol: '#000000', expo: 1.05,
    lift: [0.01, 0.01, 0.012], gam: [1.0, 1.0, 1.0], gain: [1.02, 1.0, 0.96], sat: 0.95,
    outAmb: '#0a0a0a', outAmbI: 0.2, outSun: '#000000', outSunI: 0 },
  lamp: '#ffa848',
};

// Kicked off when you first fall in: the train is already moving, in a tunnel, at dusk.
export const ORDER = ['station', 'showa', 'aero', 'circles', 'rage', 'zone', 'coast'];
