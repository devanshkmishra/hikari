// Act III — the dream parade (夢の行進).
// After the train leaves the rails into the stars, everything you love marches across the
// sky along the Hikari Line: CRTs on rubber-hose legs, records rolling in their obi,
// sneakers with nobody in them, a bonfire on a mikoshi, dango, a keitai, the nixie tubes,
// a vending machine, the one-car train itself… a few walkers at first, then a flood,
// then everything lifts into the stars and only the lights remain.
//
// mount(root, ctx) → ctx.done() when the last bell has rung (~75 s).

import { makeTempo, buildScore, Band, Sequencer, HOLD_BEAT } from './parade/music.js';
import { buildSprite, glowSprite, loadFonts, canvas, INK } from './parade/kit.js';
import { WALKERS } from './parade/walkers.js';
import { FLOATS } from './parade/floats.js';
import { makeCamera, makeRoute, renderSky, renderRouteLayer, makeLanterns } from './parade/scene.js';

const SPECS = { ...WALKERS, ...FLOATS };
for (const k of Object.keys(SPECS)) SPECS[k].id = k;

const TRAVERSE = 16.5; // seconds from the horizon to the exit at 120 bpm
const LANE = 0.68; // metres between lanes (before laneScale)
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const frac = (x) => x - Math.floor(x);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

// default world-scale per type (1 = drawn size in cm)
const SCALE = {
  kicks_takumi: 1.3, kicks_cherry: 1.3, kicks_black: 1.3, nut: 1.7, flip: 1.3, phones: 1.15,
  train: 1.4, soap_a: 1.1, soap_b: 1.1, hit_big: 1.15, bubble: 1.05, puck: 1.2,
};

const FLOOD = [
  'tv_face', 'tv_pink', 'tv_bars', 'tv_snow', 'tv_station', 'record_a', 'record_b', 'record_c',
  'kicks_takumi', 'kicks_cherry', 'kicks_black', 'imac', 'flip', 'cassette_a', 'cassette_b', 'cassette_c',
  'milk', 'mic', 'boxer', 'yomi_yume', 'yomi_hikari', 'yomi_matsuri', 'nixie', 'flap', 'beetle', 'ramen',
  'phones', 'tablet', 'vending', 'neko', 'camera', 'speaker', 'mono', 'bearer', 'soap_a', 'soap_b',
  '@dango', '@nuts', '@shogi', '@combo', '@tetro', 'tv_drum', 'tv_horn', 'fumikiri',
];
const DANGO = ['dango_pink', 'dango_white', 'dango_green', 'dango_yellow', 'dango_sky'];
const TETROS = ['tetro_T', 'tetro_S', 'tetro_Z', 'tetro_L', 'tetro_I'];
const FLAGS = ['祭', '光', '夏', '夢'];
const CONFETTI = ['#ff6fa8', '#ffc94a', '#7fe6ff', '#fbfbff', '#9ff0b0', '#b9a6ff', '#ff5a5a', '#ffe9a8'];

export default {
  id: 'parade',
  mount(root, ctx) {
    const signal = ctx.signal;
    root.classList.add('hk-parade');
    const style = document.createElement('style');
    style.textContent = `
      .hk-parade{position:absolute;inset:0;overflow:hidden;cursor:default}
      .hk-parade canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
    `;
    root.appendChild(style);
    const cv = document.createElement('canvas');
    cv.setAttribute('aria-label', 'A dream parade of everything you love, marching across the stars.');
    cv.setAttribute('role', 'img');
    // cross-fade in over whatever sky was there before (the ending's stars)
    cv.style.opacity = '0';
    cv.style.transition = 'opacity 2.2s ease';
    root.appendChild(cv);
    let shown = false;
    const g = cv.getContext('2d', { alpha: false });
    const reduced = !!ctx.reduced;

    // ------------------------------------------------------------------ music
    const tempo = makeTempo();
    const HOLD = tempo.hold;
    const S = tempo.sec;
    let band = null;
    let seq = null;
    try {
      if (ctx.audio && ctx.out) {
        band = new Band(ctx.audio, ctx.out, ctx.send || ctx.out);
        seq = new Sequencer(band, buildScore(tempo));
      }
    } catch (e) {
      band = null;
      seq = null;
    }
    const ac = ctx.audio && ctx.audio.ac;

    // ------------------------------------------------------------------ layout
    let W = 0, H = 0, U = 1, DPR = 1, cam, route, lant, sky, routeLayer, margin, vignette, grain;
    let spriteR = 2;
    const sprites = {};
    const glows = {};

    function layout(w, h) {
      W = Math.max(1, w);
      H = Math.max(1, h);
      U = Math.min(H, W * 1.4) / 900;
      DPR = Math.min(ctx.dpr || window.devicePixelRatio || 1, 2);
      const budget = 6.4e6;
      if (W * H * DPR * DPR > budget) DPR = Math.max(1, Math.sqrt(budget / (W * H)));
      cv.width = Math.round(W * DPR);
      cv.height = Math.round(H * DPR);
      cam = makeCamera(W, H);
      route = makeRoute(cam);
      lant = makeLanterns(cam, route);
      margin = Math.round(H * 0.34);
      sky = renderSky(cam, margin, DPR);
      routeLayer = renderRouteLayer(cam, route, lant, DPR);
      vignette = makeVignette();
      const kNear = cam.f / 4.3;
      if (!Object.keys(sprites).length) spriteR = clamp((kNear / 100) * DPR, 0.8, 3.4);
      for (const l of lant.all) {
        if (l.liftAt === undefined) l.liftAt = null;
      }
    }

    function makeVignette() {
      const c = canvas(256, 256);
      const vg = c.getContext('2d');
      const gr = vg.createRadialGradient(128, 118, 40, 128, 128, 182);
      gr.addColorStop(0, 'rgba(0,0,0,0)');
      gr.addColorStop(0.7, 'rgba(2,2,12,0.18)');
      gr.addColorStop(1, 'rgba(2,2,12,0.62)');
      vg.fillStyle = gr;
      vg.fillRect(0, 0, 256, 256);
      return c;
    }
    function makeGrain() {
      const c = canvas(160, 160);
      const gg = c.getContext('2d');
      const img = gg.createImageData(160, 160);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.random() * 255;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      gg.putImageData(img, 0, 0);
      return g.createPattern(c, 'repeat');
    }

    layout(ctx.w || root.clientWidth || window.innerWidth, ctx.h || root.clientHeight || window.innerHeight);
    grain = makeGrain();
    for (const [k, col, core] of [['warm', '#ffcf86', 0], ['light', '#ffe6b0', 0.08], ['orange', '#ff8a2a', 0], ['red', '#ff3a30', 0],
      ['aqua', '#7fe6ff', 0], ['pink', '#ff7ab8', 0], ['white', '#e8f0ff', 0], ['green', '#c6ff6a', 0], ['blue', '#8fb6ff', 0], ['star', '#ffffff', 0.05]]) {
      glows[k] = glowSprite(col, 96, core);
    }
    const shadow = (() => {
      const c = canvas(128, 32);
      const sg = c.getContext('2d');
      const gr = sg.createRadialGradient(64, 16, 0, 64, 16, 64);
      gr.addColorStop(0, 'rgba(8,4,24,0.55)');
      gr.addColorStop(1, 'rgba(8,4,24,0)');
      sg.setTransform(1, 0, 0, 0.25, 0, 12);
      sg.fillStyle = gr;
      sg.fillRect(0, 0, 128, 128);
      return c;
    })();

    function sprite(id) {
      let s = sprites[id];
      if (!s) {
        const spec = SPECS[id];
        const part = spec.part && !['nobori_祭', 'nobori_光', 'nobori_夏', 'nobori_夢', 'flame', 'stylus'].includes(id) && !id.startsWith('obi');
        const R = part ? clamp(1.6 * DPR, 1, 3) : clamp(spriteR, 0.6, 1500 / Math.max(spec.w, spec.h));
        s = sprites[id] = buildSprite(spec, R);
      }
      return s;
    }

    // build sprites in idle slices once fonts are in (the first few are needed right away)
    let fontsOK = false;
    const startClock = performance.now();
    loadFonts(1500).then(() => { fontsOK = true; });
    const buildQueue = ['banner', 'bearer', 'nobori_祭', 'nobori_光', 'nobori_夏', 'nobori_夢', 'lantern_r', 'lantern_w', 'tv_major', 'tv_drum',
      'nut', 'tv_face', 'tv_pink', 'cassette_a', 'cassette_b', ...Object.keys(SPECS)];
    function buildSome(budgetMs) {
      const t0 = performance.now();
      while (buildQueue.length && performance.now() - t0 < budgetMs) {
        const id = buildQueue.shift();
        if (!sprites[id] && SPECS[id]) sprite(id);
      }
    }

    // ------------------------------------------------------------------ clock
    let songT = -1.4;
    let started = false;
    let audioT0 = null;
    let paused = false;
    let doneSent = false;
    let lastBeat = -10;
    let elapsed = 0;

    function syncClock(dt) {
      if (!started) {
        if (fontsOK || performance.now() - startClock > 1700) started = true;
        else return;
      }
      if (paused) return;
      if (ac && ac.state === 'running' && seq) {
        if (audioT0 === null) audioT0 = ac.currentTime - songT;
        songT = ac.currentTime - audioT0;
      } else {
        audioT0 = null;
        songT += dt;
      }
    }
    function pump() {
      if (!seq || paused || !started || !ac || ac.state !== 'running' || audioT0 === null) return;
      seq.pump(ac.currentTime - audioT0, audioT0, 0.3);
    }
    ctx.interval(() => { if (!document.hidden) pump(); }, 60);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        paused = true;
        if (band) {
          try {
            const T = ac.currentTime;
            band.master.gain.cancelScheduledValues(T);
            band.master.gain.setTargetAtTime(0, T, 0.03);
          } catch (e) { /* closed */ }
        }
      } else if (paused) {
        paused = false;
        if (ac) audioT0 = ac.currentTime - songT;
        if (band) {
          try {
            const T = ac.currentTime;
            band.master.gain.cancelScheduledValues(T);
            band.master.gain.setTargetAtTime(0.78, T + 0.05, 0.05);
          } catch (e) { /* closed */ }
        }
      }
    }, { signal });

    // ------------------------------------------------------------------ the procession
    const objs = [];
    const R1 = {}, R2 = {};
    const laneOff = (l) => l * LANE * cam.laneScale;

    function halfLen(spec, s) {
      return (spec.w / 100) * s * 0.5;
    }
    function fits(lane, p0, hl) {
      for (const o of objs) {
        if (o.dead) continue;
        const lanesHit = o.wide || Math.abs(o.lane - lane) < 0.9;
        if (!lanesHit) continue;
        const dm = Math.abs(o.p - p0) * route.mpp(clamp(p0, 0.05, 0.95));
        if (dm < o.hl + hl + 0.3) return false;
      }
      return true;
    }

    function spawn(type, o = {}) {
      const spec = SPECS[type];
      if (!spec) return null;
      const s = (o.s ?? SCALE[type] ?? 1) * (spec.big ? cam.floatScale : 1) * (o.sMul ?? 1);
      const ob = {
        type, spec, s,
        p: o.p0 ?? 0,
        lane: o.lane ?? 0,
        spd: o.spd ?? 1,
        ph: o.ph ?? 0,
        seed: Math.random() * 100,
        born: songT,
        hl: halfLen(spec, s),
        wide: !!spec.big,
        rot: 0, lx: null, lz: null,
        flag: o.flag || pick(FLAGS),
        liftAt: null, lit: false, dead: false,
        trail: spec.rider ? [] : null,
        hopH: o.hop ?? spec.hop ?? 0.2,
        lastHitBeat: -1,
        z: 0,
      };
      objs.push(ob);
      if (spec.pet) {
        const pet = spawn(spec.pet, { lane: ob.lane, p0: ob.p - 1.0 / route.mpp(clamp(ob.p, 0.05, 0.95)), spd: ob.spd, ph: 0.5 });
        if (pet) pet.leader = ob;
      }
      return ob;
    }

    function spawnGroup(kind, t0, lane, o = {}) {
      const list = [];
      if (kind === '@dango') {
        const n = 5;
        for (let i = 0; i < n; i++) list.push([i * 0.3, DANGO[i % DANGO.length], { s: lerp(1.55, 0.8, i / (n - 1)), ph: i * 0.18 }]);
      } else if (kind === '@nuts') {
        for (let i = 0; i < 3; i++) list.push([i * 0.32, 'nut', { ph: i * 0.33 }]);
      } else if (kind === '@shogi') {
        ['shogi_fu', 'shogi_fu', 'shogi_ou', 'shogi_kyo', 'shogi_to'].forEach((t, i) => list.push([i * 0.36, t, {}]));
      } else if (kind === '@combo') {
        ['hit_1', 'hit_2', 'hit_3', 'hit_4'].forEach((t, i) => list.push([i * 0.34, t, { ph: i * 0.25 }]));
      } else if (kind === '@tetro') {
        for (let i = 0; i < 3; i++) list.push([i * 0.42, pick(TETROS), {}]);
      }
      for (const [dt, type, extra] of list) queue.push({ t: t0 + dt, type, o: { lane, ...o, ...extra } });
    }

    // choreography --------------------------------------------------------
    const queue = [];
    const at = (t, type, o = {}) => queue.push({ t, type, o });
    {
      // intro: the banner, the flag-bearers, the drum major, the drums
      at(0.0, 'banner', { lane: 0, p0: 0.13 });
      at(1.0, 'bearer', { lane: -1, p0: 0.08, flag: '祭' });
      at(1.0, 'bearer', { lane: 1, p0: 0.08, flag: '光' });
      at(2.6, 'tv_major', { lane: 0, p0: 0.05 });
      at(4.0, 'tv_drum', { lane: -1, p0: 0.03 });
      at(4.0, 'tv_drum', { lane: 1, p0: 0.03 });
      at(4.9, 'tv_horn', { lane: 0, p0: 0.02 });
      at(5.5, 'bearer', { lane: -2, flag: '夏' });
      at(5.5, 'bearer', { lane: 2, flag: '夢' });
      spawnGroup('@nuts', 6.6, -2);
      at(7.5, 'tv_face', { lane: 0 });
      at(7.5, 'tv_pink', { lane: 1 });

      // A: one at a time, so each can be seen
      const a = S.A.t;
      [[0.0, 'cassette_a', -1], [0.0, 'cassette_b', 1], [0.9, 'record_a', 2], [1.6, 'kicks_takumi', -2], [2.4, 'imac', 0],
        [3.4, 'milk', 1], [4.0, '@dango', -2], [5.1, 'flip', 1], [5.9, 'tv_bars', 0], [6.6, 'record_b', -1], [7.2, 'soap_a', 2],
        [8.0, 'neko', 0], [8.8, 'mic', -1], [9.6, 'yomi_yume', 1], [10.4, 'kicks_cherry', -2], [11.2, 'ramen', 0],
        [12.0, 'phones', 1], [12.0, 'tv_horn', -1], [12.6, '@nuts', -2], [13.4, 'vending', -1], [14.2, 'record_c', 2], [15.0, 'tv_snow', 0],
        [15.2, 'cassette_c', -2], [15.9, 'milk', 1]].forEach(([t, type, lane]) => {
        if (type[0] === '@') spawnGroup(type, a + t, lane);
        else at(a + t, type, { lane });
      });

      // A2: the floats arrive; the fleet passes overhead
      const b = S.A2.t;
      [[0.0, 'crt_float', 0], [2.0, 'bearer', -2, '光'], [2.0, 'bearer', 2, '祭'], [2.6, 'nixie', -1], [3.0, 'kicks_black', 1],
        [3.6, '@combo', 2], [4.2, 'boxer', -1], [4.9, 'tablet', 1], [5.4, 'yomi_hikari', -2], [6.0, 'flap', 0],
        [6.8, 'beetle', 2], [6.8, '@dango', -2], [7.8, 'mikoshi', 0], [10.0, 'fumikiri', 1], [10.0, 'tv_station', -2],
        [10.7, 'soap_b', 2], [11.2, 'mono', -1], [11.6, '@shogi', 2], [12.2, 'camera', 1], [12.4, 'speaker', -1],
        [13.2, 'stage', 0], [15.2, 'milk', 2], [15.2, 'record_a', -2]].forEach(([t, type, lane, flag]) => {
        if (type[0] === '@') spawnGroup(type, b + t, lane);
        else at(b + t, type, { lane, flag });
      });

      // B: matsuri, then the basement
      const c = S.B.t;
      [[0.3, 'bearer', -2, '夏'], [0.3, 'bearer', 2, '祭'], [0.4, 'bubble', 0], [2.0, '@dango', 1], [2.4, 'neko', -1],
        [3.2, 'bearer', -2, '夢'], [3.2, 'bearer', 2, '光'], [4.0, 'camera', -1], [4.0, 'speaker', 1], [4.9, 'tv_snow', -2],
        [5.2, 'camera', 2], [5.6, 'speaker', -1], [6.0, 'kicks_black', 1], [6.2, 'hit_big', 0], [6.9, 'cassette_b', -2]].forEach(([t, type, lane, flag]) => {
        if (type[0] === '@') spawnGroup(type, c + t, lane);
        else at(c + t, type, { lane, flag });
      });

      // A3: the train on the rails, then the flood (spawned procedurally below)
      at(S.A3.t + 0.2, 'train', { lane: 0, s: 1.4 });
      queue.sort((x, y) => x.t - y.t);
    }
    const floodFrom = S.A3.t + 0.4;
    const trainWindow = [S.A3.t - 0.6, S.A3.t + 2.2];
    let floodNext = floodFrom;
    let qi = 0;

    function runProgram() {
      while (qi < queue.length && queue[qi].t <= songT) {
        const q = queue[qi++];
        if (songT >= HOLD) continue;
        spawn(q.type, q.o);
      }
      if (songT >= floodFrom && songT < HOLD - 0.3) {
        while (floodNext <= songT) {
          const u = clamp((songT - floodFrom) / (HOLD - floodFrom), 0, 1);
          const rate = lerp(4.2, 9.5, u) * (reduced ? 0.7 : 1);
          floodNext += (1 / rate) * (0.6 + Math.random() * 0.8);
          floodOne(songT);
        }
      }
    }
    function floodOne(t) {
      let type = pick(FLOOD);
      if (type[0] === '@' && Math.random() < 0.55) type = pick(FLOOD);
      const lanes = [-2, -1, 0, 1, 2].sort(() => Math.random() - 0.5);
      for (const lane of lanes) {
        if (lane !== 0 && Math.abs(lane) === 1 && t > trainWindow[0] && t < trainWindow[1] + 0.8) continue;
        if (lane === 0 && t > trainWindow[0] && t < trainWindow[1] + 1.2) continue;
        const p0 = Math.random() * 0.28;
        const spec = SPECS[type[0] === '@' ? 'nut' : type];
        const hl = type[0] === '@' ? 1.2 : halfLen(spec, SCALE[type] ?? 1);
        if (!fits(lane, p0, hl)) continue;
        if (type[0] === '@') {
          const before = queue.length;
          spawnGroup(type, t, lane, { p0 });
          const added = queue.splice(before);
          for (const q of added) {
            q.o.p0 = p0 - (q.t - t) * (1 / TRAVERSE);
            spawn(q.type, { ...q.o, sMul: 0.95 + Math.random() * 0.15 });
          }
        } else {
          spawn(type, { lane, p0, sMul: 0.92 + Math.random() * 0.18, flag: pick(FLAGS) });
        }
        return;
      }
    }

    // ------------------------------------------------------------------ particles
    const lights = [];
    const confetti = [];
    const streamers = [];
    const flies = [];
    const pops = [];
    const drifters = [];
    let flashA = 0;
    let shakeT = -9;
    let shootNext = 3;
    const shooting = [];

    function addLight(x, y, big = false) {
      if (lights.length > 240) {
        const old = lights.findIndex((l) => l.settled && !l.fading);
        if (old >= 0) lights[old].fading = true;
      }
      const ys = y - camY;
      const spread = W * (cam.portrait ? 0.7 : 0.45);
      lights.push({
        x, y: ys,
        tx: clamp(x + (Math.random() - 0.5) * spread, W * 0.04, W * 0.96),
        ty: Math.min(ys - H * 0.12, -margin * 0.9 + Math.random() * (cam.horizon + margin * 0.7)),
        kx: 0.1 + Math.random() * 0.12, ky: 0.13 + Math.random() * 0.13,
        r: (big ? 9 : 5.5 + Math.random() * 4.5) * U, a: 0, tw: 1 + Math.random() * 2.5, ph: Math.random() * TAU,
        fading: false, settled: false,
      });
    }
    function cannon(side, n) {
      const q = (reduced ? 0.3 : 1) * clamp(W / 1440, 0.35, 1.2);
      const count = Math.floor(n * q * quality);
      for (let i = 0; i < count; i++) {
        const x = side < 0 ? -10 : W + 10;
        const sp = (0.85 + Math.random() * 0.55) * H * 1.2;
        const ang = side < 0 ? -Math.PI / 2 + 0.3 + Math.random() * 0.65 : -Math.PI / 2 - 0.3 - Math.random() * 0.65;
        confetti.push({
          x, y: H * (0.78 + Math.random() * 0.15), vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
          rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 14, w: 5 + Math.random() * 6, h: 3 + Math.random() * 4,
          col: pick(CONFETTI), fl: Math.random() * TAU, fs: 6 + Math.random() * 8, life: 0,
        });
      }
      if (!reduced) {
        for (let i = 0; i < 5; i++) {
          const x = side < 0 ? 0 : W;
          const sp = (1.0 + Math.random() * 0.5) * H;
          const ang = side < 0 ? -Math.PI / 2 + 0.3 + Math.random() * 0.4 : -Math.PI / 2 - 0.3 - Math.random() * 0.4;
          streamers.push({ pts: Array.from({ length: 12 }, () => [x, H * 0.9]), vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, col: pick(CONFETTI), ph: Math.random() * TAU, life: 0 });
        }
      }
    }
    function rainConfetti(n) {
      for (let i = 0; i < n; i++) {
        confetti.push({
          x: Math.random() * W, y: -12, vx: (Math.random() - 0.5) * 40, vy: 40 + Math.random() * 60,
          rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 10, w: 5 + Math.random() * 5, h: 3 + Math.random() * 4,
          col: pick(CONFETTI), fl: Math.random() * TAU, fs: 5 + Math.random() * 8, life: 0,
        });
      }
    }

    // overhead: fleet, crow, cicadas
    const fleet = [];
    {
      const t0 = S.A2.t + 1.5;
      const dur = 17;
      // imperial wedge, right → left
      const rows = [[0, 0, 'ship_flag', 1.0]];
      for (let r = 1; r <= 5; r++) {
        for (const s of [-1, 1]) rows.push([r, s * r, 'ship_imp', 0.55 - r * 0.03]);
      }
      for (let r = 2; r <= 5; r++) rows.push([r + 0.6, 0, 'ship_imp', 0.42]);
      for (const [row, col, id, sz] of rows) fleet.push({ t0, dur, dir: -1, y: 0.12, dx: row * 0.045, dy: col * 0.018, id, sz, ph: Math.random() * TAU });
      // the other fleet, higher and farther, left → right
      for (let i = 0; i < 12; i++) {
        fleet.push({ t0: t0 + 3, dur: 20, dir: 1, y: 0.05, dx: (i % 4) * 0.03 + Math.floor(i / 4) * 0.012, dy: Math.floor(i / 4) * 0.014 - 0.01, id: 'ship_all', sz: 0.32, ph: Math.random() * TAU });
      }
    }
    const crow = { t0: S.A.t + 5, dur: 9 };
    const cicadas = Array.from({ length: 7 }, (_, i) => ({ t0: S.B.t + i * 0.35, dur: 4.4 + Math.random(), y: 0.32 + Math.random() * 0.22, sz: 0.7 + Math.random() * 0.5, ph: Math.random() * TAU }));

    // ------------------------------------------------------------------ frame
    let camY = 0;
    let lanternA = 0;
    let quality = 1;
    let ftAvg = 16;
    let twinkles = null;
    const tmpList = [];

    function update(dt) {
      const beat = tempo.beatAt(songT);
      const bpm = songT < 0 ? 116 : songT < HOLD ? tempo.bpmAt(songT) : 0;
      const march = songT < HOLD ? 1 : Math.max(0, 1 - (songT - HOLD) / 0.6);
      const pace = (bpm / 120) * march;

      runProgram();

      // cannons and rain on the big downbeats
      const bInt = Math.floor(beat);
      if (bInt !== lastBeat && songT >= 0) {
        for (let b = lastBeat + 1; b <= bInt; b++) onBeat(b);
        lastBeat = bInt;
      }
      if (songT > S.A3.t && songT < HOLD && quality > 0.5) {
        if (Math.random() < dt * 26 * quality * (reduced ? 0.3 : 1) * clamp(W / 1440, 0.35, 1.2)) rainConfetti(1);
      }

      // objects
      for (const o of objs) {
        if (o.dead) continue;
        if (o.leader && !o.leader.dead) {
          const target = o.leader.p - 0.95 / route.mpp(clamp(o.leader.p, 0.05, 0.95));
          o.p += (target - o.p) * Math.min(1, dt * 3);
        } else {
          o.p += (dt * pace * o.spd) / TRAVERSE;
        }
        if (o.p > 1.02) o.dead = true;
        if (songT >= HOLD && o.liftAt === null) o.liftAt = HOLD + 0.1 + Math.random() * 1.6;
      }
      // lights from the crowd
      if (songT > S.A.t && songT < HOLD) {
        const rate = songT < S.A2.t ? 1.0 : songT < S.A3.t ? 2.4 : 5.5;
        if (Math.random() < dt * rate && objs.length) {
          const o = objs[Math.floor(Math.random() * objs.length)];
          if (!o.dead && o.p > 0.05 && place(o, songT) && o.k > 25 && o.sx > 0 && o.sx < W) {
            const sp = o.spec;
            const legs = sp.legs ? sp.legs.len / 100 : 0;
            addLight(o.sx + (Math.random() - 0.5) * (sp.w / 100) * o.s * o.k, o.gy + camY - (legs + (sp.h / 100) * 0.8) * o.s * o.k);
          }
        }
      }
      // particles
      for (const l of lights) {
        l.a = Math.min(1, l.a + dt * 1.5);
        if (l.fading) l.a = Math.max(0, l.a - dt * 2);
        // rise and slow, like something released; then hover
        l.x += (l.tx - l.x) * (1 - Math.exp(-dt * l.kx)) + Math.sin(songT * 0.9 + l.ph) * 6 * dt;
        l.y += (l.ty - l.y) * (1 - Math.exp(-dt * l.ky)) + Math.cos(songT * 0.6 + l.ph) * 3 * dt;
        if (!l.settled && Math.abs(l.ty - l.y) < 20) l.settled = true;
      }
      for (let i = lights.length - 1; i >= 0; i--) if (lights[i].fading && lights[i].a <= 0) lights.splice(i, 1);
      const grav = H * 1.1;
      for (const c of confetti) {
        c.life += dt;
        c.vy += grav * dt * (c.vy > 120 ? 0.05 : 1);
        c.vx *= Math.pow(0.3, dt);
        if (c.vy > 120) c.vy = 120 + (c.vy - 120) * Math.pow(0.05, dt);
        c.x += (c.vx + Math.sin(c.life * 3 + c.fl) * 30) * dt;
        c.y += c.vy * dt;
        c.rot += c.vr * dt;
      }
      for (let i = confetti.length - 1; i >= 0; i--) if (confetti[i].y > H + 20 || confetti[i].life > 14) confetti.splice(i, 1);
      if (confetti.length > 700 * quality) confetti.splice(0, confetti.length - Math.floor(700 * quality));
      for (const s of streamers) {
        s.life += dt;
        s.vy += grav * 0.5 * dt;
        s.vx *= Math.pow(0.3, dt);
        if (s.vy > 90) s.vy = 90;
        const h = s.pts[0];
        h[0] += (s.vx + Math.sin(s.life * 2.4 + s.ph) * 40) * dt;
        h[1] += s.vy * dt;
        for (let i = 1; i < s.pts.length; i++) {
          const a = s.pts[i - 1], b = s.pts[i];
          const dx = b[0] - a[0], dy = b[1] - a[1];
          const d = Math.hypot(dx, dy) || 1;
          const L = 9 * U;
          b[0] = a[0] + (dx / d) * Math.min(d, L);
          b[1] = a[1] + (dy / d) * Math.min(d, L) + 0.2;
        }
      }
      for (let i = streamers.length - 1; i >= 0; i--) if (streamers[i].pts[streamers[i].pts.length - 1][1] > H + 40) streamers.splice(i, 1);
      for (let i = pops.length - 1; i >= 0; i--) {
        const p = pops[i];
        p.life -= dt;
        p.y -= 40 * dt;
        if (p.life <= 0) pops.splice(i, 1);
      }
      // fireflies
      const want = (songT > S.B.t && songT < S.B.t + 6 ? 46 : 26) * quality;
      while (flies.length < want && songT > -1) {
        flies.push({ x: Math.random() * W, y: H * (0.42 + Math.random() * 0.55), vx: (Math.random() - 0.5) * 16, vy: (Math.random() - 0.5) * 10, ph: Math.random() * TAU, sp: 0.6 + Math.random() * 1.4, life: 6 + Math.random() * 8 });
      }
      for (let i = flies.length - 1; i >= 0; i--) {
        const f = flies[i];
        f.life -= dt;
        f.x += (f.vx + Math.sin(songT * f.sp + f.ph) * 12) * dt;
        f.y += (f.vy + Math.cos(songT * f.sp * 0.8 + f.ph) * 8) * dt;
        if (songT > HOLD) f.vy -= 20 * dt;
        if (f.life <= 0 || f.y < -margin) flies.splice(i, 1);
      }
      // drifting things: feathers (Air), lunar tears (NieR), bubbles (Aero)
      if (songT > S.A3.t && songT < HOLD) {
        if (Math.random() < dt * 1.4) drifters.push({ kind: 'feather', x: Math.random() * W, y: -30, vx: 0, vy: 28 + Math.random() * 18, r: Math.random() * TAU, vr: (Math.random() - 0.5) * 1.5, s: 0.8 + Math.random() * 0.6, ph: Math.random() * TAU });
        if (Math.random() < dt * 1.0) drifters.push({ kind: 'lunar', x: Math.random() * W, y: H + 30, vx: 0, vy: -(26 + Math.random() * 20), r: Math.random() * TAU, vr: (Math.random() - 0.5) * 0.8, s: 0.7 + Math.random() * 0.6, ph: Math.random() * TAU });
        if (Math.random() < dt * 2.0) drifters.push({ kind: 'bub', x: Math.random() * W, y: H + 30, vx: 0, vy: -(40 + Math.random() * 40), r: 0, vr: 0, s: 0.5 + Math.random() * 0.9, ph: Math.random() * TAU });
      }
      for (let i = drifters.length - 1; i >= 0; i--) {
        const d = drifters[i];
        d.x += (d.vx + Math.sin(songT * 1.2 + d.ph) * 22) * dt;
        d.y += d.vy * dt;
        d.r += d.vr * dt;
        if (d.y > H + 60 || d.y < -margin - 60) drifters.splice(i, 1);
      }
      // shooting stars
      if (songT > shootNext) {
        shootNext = songT + 4 + Math.random() * 6;
        shooting.push({ x: W * (0.2 + Math.random() * 0.8), y: H * Math.random() * 0.25 - camY, vx: -(600 + Math.random() * 400), vy: 220 + Math.random() * 160, life: 0.7 });
      }
      for (let i = shooting.length - 1; i >= 0; i--) {
        const s = shooting[i];
        s.life -= dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        if (s.life <= 0) shooting.splice(i, 1);
      }
      // camera tilts up into the stars at the end
      const tl = smooth(HOLD + 0.2, HOLD + 5.5, songT);
      camY = tl * margin;
      flashA *= Math.exp(-dt * 9);
      if (flashA < 0.002) flashA = 0;
      return { beat, march };
    }

    function onBeat(b) {
      const sec = (id) => S[id].beat;
      if (b === sec('A') || b === sec('A2') || b === sec('A3') || b === sec('A3') + 16 || b === sec('tag')) {
        cannon(-1, b === sec('A') ? 90 : 140);
        cannon(1, b === sec('A') ? 90 : 140);
      }
      // the basement: flash photography on the half-time backbeat
      const t0 = sec('B') + 8;
      if (b >= t0 && b < t0 + 8 && (b - t0) % 2 === 0) {
        let fired = false;
        for (const o of objs) {
          if (o.dead || o.type !== 'camera' || o.sx < -50 || o.sx > W + 50) continue;
          o.flashT = songT;
          fired = true;
        }
        if (fired && !reduced) {
          flashA = Math.max(flashA, 0.42);
          shakeT = songT;
        }
      } else if (b % 4 === 0) {
        for (const o of objs) if (!o.dead && o.type === 'camera' && Math.random() < 0.5) o.flashT = songT;
      }
    }

    // ------------------------------------------------------------------ drawing helpers
    function setT(x, y, rot = 0, sx = 1, sy = 1) {
      const c = Math.cos(rot), s = Math.sin(rot);
      g.setTransform(DPR * c * sx, DPR * s * sx, -DPR * s * sy, DPR * c * sy, DPR * (x + shX), DPR * (y + shY));
    }
    let shX = 0, shY = 0;
    function resetT() {
      g.setTransform(DPR, 0, 0, DPR, DPR * shX, DPR * shY);
    }
    function blitGlow(key, x, y, r, a) {
      if (a <= 0.003 || r < 0.5) return;
      g.globalAlpha = Math.min(1, a);
      g.drawImage(glows[key], x - r, y - r, r * 2, r * 2);
    }
    function frameOf(o, spec, t, beat) {
      const n = spec.frames || 1;
      if (n === 1) return 0;
      const an = spec.anim || { by: 'time', rate: 4 };
      if (an.by === 'blink') return ((t + o.seed) % 3.3) < 0.15 ? 1 : 0;
      if (an.pulse) return frac(beat) < 0.2 ? 1 : 0;
      const i = an.by === 'beat' ? Math.floor(Math.max(0, beat) * an.rate) : Math.floor(t * an.rate + o.seed);
      if (an.pingpong) {
        const seqn = [0, 1, 2, 1];
        return seqn[((i % 4) + 4) % 4];
      }
      return ((i % n) + n) % n;
    }
    function img(id, f, drawnPx) {
      const sp = sprite(id);
      const fr = sp.frames[Math.min(f, sp.frames.length - 1)];
      return drawnPx * DPR < sp.W * 0.3 ? fr.lo : fr.hi;
    }

    function drawLegs(o, L, sx, hipY, gy, k, ux, uy, bw, beat, march) {
      const s = o.s;
      const n = L.xs.length;
      const lw = Math.max(1, ((L.lw || 4.4) / 100) * s * k);
      const stride = 0.2 * s * k;
      const liftH = 0.085 * s * k;
      const len = gy - hipY;
      const b = beat * (o.spd > 1.15 ? 2 : 1) + o.ph;
      g.beginPath();
      const feet = [];
      for (let i = 0; i < n; i++) {
        const hx = sx + L.xs[i] * bw;
        const c = march > 0.01 ? ((b + (i % 2)) % 2 + 2) % 2 : 0.5;
        let off, lift = 0;
        if (c < 1) off = stride * (0.5 - c);
        else {
          const u = c - 1;
          off = stride * (u - 0.5);
          lift = Math.sin(Math.PI * u) * liftH;
        }
        off *= march;
        lift *= march;
        const fx = hx + ux * off;
        const fy = gy + uy * off * 0.35 - lift;
        g.moveTo(hx, hipY);
        g.quadraticCurveTo((hx + fx) / 2 + ux * len * 0.22, (hipY + fy) / 2, fx, fy);
        feet.push(fx, fy);
      }
      g.lineCap = 'round';
      g.strokeStyle = L.color || INK;
      g.lineWidth = lw;
      g.stroke();
      if (L.shoe === null) return;
      const rx = 0.07 * s * k, ry = 0.036 * s * k;
      const dir = ux >= 0 ? 1 : -1;
      if (L.shoe === 'geta') {
        g.fillStyle = '#d9b07a';
        g.beginPath();
        for (let i = 0; i < feet.length; i += 2) g.rect(feet[i] - rx * 0.9, feet[i + 1] - ry * 0.2, rx * 1.8, ry * 0.9);
        g.fill();
        g.fillStyle = '#5a2a1a';
        g.beginPath();
        for (let i = 0; i < feet.length; i += 2) g.rect(feet[i] - rx * 0.7, feet[i + 1] + ry * 0.7, rx * 1.4, ry * 0.5);
        g.fill();
        return;
      }
      g.fillStyle = L.shoe === 'tabi' ? '#f4f2ee' : L.shoe;
      g.beginPath();
      for (let i = 0; i < feet.length; i += 2) {
        g.moveTo(feet[i] + dir * rx * 0.3 + rx, feet[i + 1]);
        g.ellipse(feet[i] + dir * rx * 0.3, feet[i + 1], rx, ry, 0, 0, TAU);
      }
      g.fill();
    }

    function glove(x, y, r) {
      g.beginPath();
      g.arc(x, y, r, 0, TAU);
      g.fillStyle = '#fbfbff';
      g.fill();
      g.lineWidth = Math.max(0.6, r * 0.28);
      g.strokeStyle = INK;
      g.stroke();
    }

    function drawArms(o, A, cx, top, bw, bh, k, ux, beat, t, march) {
      const s = o.s;
      const len = (A.len / 100) * s * k;
      const lw = Math.max(1, 0.034 * s * k);
      const gr = Math.max(1, 0.045 * s * k);
      const hands = [];
      g.beginPath();
      A.sh.forEach(([fx, fy], i) => {
        const side = fx < 0 ? -1 : 1;
        const shx = cx + fx * bw, shy = top + fy * bh;
        let hx, hy;
        if (A.kind === 'wave') {
          const a = 0.55 + 0.35 * Math.sin(t * 6 + i * 2);
          hx = shx + side * Math.sin(a) * len;
          hy = shy - Math.cos(a) * len;
        } else if (A.kind === 'hold') {
          hx = cx + A.grip[0] * bw * (side < 0 ? 0.85 : 1);
          hy = top + A.grip[1] * bh + (side < 0 ? 0.06 : 0) * bh;
        } else if (A.kind === 'drum') {
          const hit = Math.max(0, Math.sin(TAU * (beat * 2 + (i ? 0.5 : 0)))) * march;
          hx = cx + (A.target[0] + side * 0.12) * bw;
          hy = top + A.target[1] * bh - len * (0.25 + 0.45 * hit);
        } else if (A.kind === 'baton' && i === 1) {
          const a = 0.6 + 0.4 * Math.sin(t * 3);
          hx = shx + side * Math.sin(a) * len;
          hy = shy - Math.cos(a) * len * 0.6;
        } else {
          const sw = 0.5 * Math.sin(Math.PI * beat + (side > 0 ? Math.PI : 0)) * march;
          const a = 0.45 + sw * (ux >= 0 ? side : -side) * 0.8;
          hx = shx + side * Math.sin(Math.abs(a)) * len * 0.8 + ux * sw * len * 0.4;
          hy = shy + Math.cos(a) * len;
        }
        g.moveTo(shx, shy);
        g.quadraticCurveTo(shx + side * len * 0.35, (shy + hy) / 2 + len * 0.05, hx, hy);
        hands.push([hx, hy, side]);
      });
      g.lineCap = 'round';
      g.strokeStyle = INK;
      g.lineWidth = lw;
      g.stroke();
      if (A.kind === 'drum') {
        g.beginPath();
        for (const [hx, hy, side] of hands) {
          g.moveTo(hx, hy);
          g.lineTo(hx - side * len * 0.15, hy + len * 0.55);
        }
        g.strokeStyle = '#e8d2a8';
        g.lineWidth = Math.max(1, lw * 0.6);
        g.stroke();
      }
      if (A.kind === 'baton') {
        const [hx, hy] = hands[1];
        const a = t * 9;
        const bl = 0.32 * s * k;
        const dx = Math.cos(a) * bl, dy = Math.sin(a) * bl;
        g.beginPath();
        g.moveTo(hx - dx, hy - dy);
        g.lineTo(hx + dx, hy + dy);
        g.strokeStyle = '#e9edf5';
        g.lineWidth = Math.max(1, lw * 0.7);
        g.stroke();
        g.fillStyle = '#fbfbff';
        g.beginPath();
        g.arc(hx - dx, hy - dy, gr * 0.9, 0, TAU);
        g.arc(hx + dx, hy + dy, gr * 1.1, 0, TAU);
        g.fill();
      }
      for (const [hx, hy] of hands) glove(hx, hy, gr);
    }

    // ------------------------------------------------------------------ objects
    function place(o, t) {
      const spec = o.spec;
      route.at(clamp(o.p, 0, 1), R1);
      route.at(clamp(o.p + 0.004, 0, 1), R2);
      const lo = spec.motion === 'rail' ? 0 : laneOff(o.lane);
      const nx1 = -R1.tz, nz1 = R1.tx, nx2 = -R2.tz, nz2 = R2.tx;
      const X = R1.x + nx1 * lo, Z = R1.z + nz1 * lo;
      const X2 = R2.x + nx2 * lo, Z2 = R2.z + nz2 * lo;
      o.z = Z;
      if (Z < 1.2) { o.k = 0; return false; }
      const k = cam.f / Z;
      const k2 = cam.f / Math.max(1.2, Z2);
      o.k = k;
      o.sx = cam.cx + X * k;
      o.gy = cam.horizon + cam.camH * k;
      let dx = cam.cx + X2 * k2 - o.sx, dy = cam.horizon + cam.camH * k2 - o.gy;
      const m = Math.hypot(dx, dy) || 1;
      o.ux = dx / m;
      o.uy = dy / m;
      if (o.lx !== null) o.dist = Math.hypot(X - o.lx, Z - o.lz);
      else o.dist = 0;
      o.lx = X;
      o.lz = Z;
      // lift (finale)
      o.liftY = 0;
      o.la = 1;
      if (o.liftAt !== null && t > o.liftAt) {
        const tt = t - o.liftAt;
        const far = Math.pow(Math.max(1, Z) / 6, 0.75);
        o.liftY = (0.32 * tt + 0.42 * tt * tt) * far;
        o.la = 1 - smooth(1.5, 3.0, tt);
        if (!o.lit && tt > 1.7) {
          o.lit = true;
          o.wantLight = true;
        }
        if (tt > 3.1) o.dead = true;
      }
      const fadeIn = smooth(0, 0.045, o.p) * smooth(0, 0.7, t - o.born);
      const far = 0.5 + 0.5 * smooth(6, 50, k);
      o.alpha = fadeIn * far * o.la;
      return true;
    }

    function drawObj(o, t, beat, march) {
      const spec = o.spec;
      const k = o.k;
      const s = o.s;
      const bw = (spec.w / 100) * s * k;
      const bh = (spec.h / 100) * s * k;
      const pad = ((spec.pad ?? 8) / 100) * s * k;
      const motion = spec.motion || 'walk';
      const L = motion === 'walk' || motion === 'hop' ? spec.legs : null;
      const legLen = L ? (L.len / 100) * s : 0;
      let yUp = o.liftY;
      let bob = 0, tilt = 0, sqx = 1, sqy = 1;
      const bt = beat + o.ph;
      if (motion === 'walk') {
        bob = Math.abs(Math.sin(Math.PI * bt)) * 0.035 * s * march;
        tilt = 0.045 * Math.sin(Math.PI * bt) * march;
      } else if (motion === 'hop') {
        const hs = Math.abs(Math.sin(Math.PI * bt));
        bob = hs * o.hopH * march;
        const land = Math.pow(1 - hs, 6) * march;
        sqx = 1 + 0.12 * land;
        sqy = 1 - 0.12 * land;
      } else if (motion === 'float') {
        yUp += (spec.lift || 0.8) + 0.08 * Math.sin(t * 1.4 + o.seed);
        tilt = 0.03 * Math.sin(t * 1.1 + o.seed);
      } else if (motion === 'glide') {
        yUp += 0.06 + 0.03 * Math.sin(t * 2 + o.seed);
      } else if (motion === 'rail') {
        tilt = 0.008 * Math.sin(t * 4.2);
        bob = Math.abs(Math.sin(t * 9)) * 0.006 * march;
      } else if (motion === 'tumble') {
        bob = Math.abs(Math.sin(Math.PI * bt)) * 0.22 * s * march;
      }
      const gy = o.gy + camY;
      const sx = o.sx;
      const bodyBottom = gy - (legLen + yUp + bob) * k;
      const top = bodyBottom - bh;
      o.top = top;
      o.bw = bw;
      if (o.wantLight) {
        o.wantLight = false;
        if (sx > -60 && sx < W + 60 && top + bh * 0.3 > -margin) {
          addLight(sx, top + bh * 0.3, spec.big);
          if (spec.big) {
            addLight(sx - bw * 0.3, top + bh * 0.5);
            addLight(sx + bw * 0.3, top + bh * 0.5);
          }
        }
      }
      if (sx + bw + pad < -40 || sx - bw - pad > W + 40 || top - pad > H + 40 || bodyBottom + pad < -margin - 40) return;
      const a = o.alpha;
      if (a <= 0.01) return;

      // contact shadow
      if (yUp < 1.5) {
        resetT();
        g.globalAlpha = a * 0.75 * (1 - yUp / 1.5);
        const sw = Math.max(bw, 0.5 * s * k) * 1.05;
        g.drawImage(shadow, sx - sw / 2, gy - sw * 0.06, sw, sw * 0.16);
      }
      g.globalAlpha = a;
      resetT();

      // carried nobori (behind the bearer)
      if (spec.carry) {
        const nid = 'nobori_' + o.flag;
        const nb = SPECS[nid];
        const nw = (nb.w / 100) * s * k, nh = (nb.h / 100) * s * k, np = ((nb.pad ?? 8) / 100) * s * k;
        const px = sx + bw * 0.62;
        const pb = gy - (yUp + bob) * k - 0.04 * s * k;
        const f = Math.floor(t * 2.2 + o.seed) % 2;
        setT(px, pb, tilt * 0.6);
        g.drawImage(img(nid, f, nw), -np - nw * (5 / 48), -nh - np, nw + 2 * np, nh + 2 * np);
        resetT();
      }

      if (L) {
        const footBase = motion === 'hop' ? bodyBottom + legLen * k : gy - yUp * k;
        drawLegs(o, L, sx, bodyBottom - bh * (1 - (L.y ?? 0.985)), footBase, k, o.ux, o.uy, bw, beat, motion === 'hop' ? march * 0.5 : march);
      }

      const f = frameOf(o, spec, t, beat);
      const flip = spec.flip && o.ux < 0 ? -1 : 1;
      const dwp = bw + 2 * pad, dhp = bh + 2 * pad;

      if (motion === 'shoes') {
        for (let i = 1; i >= 0; i--) {
          const c = march > 0.01 ? ((bt + i) % 2 + 2) % 2 : 0.5;
          let off, lift = 0;
          const stride = 0.3 * s;
          if (c < 1) off = stride * (0.5 - c);
          else {
            const u = c - 1;
            off = stride * (u - 0.5);
            lift = Math.sin(Math.PI * u) * 0.16 * s;
          }
          off *= march;
          lift *= march;
          const ax = sx + o.ux * off * k + (i ? 0.1 * s * k * -o.ux : 0);
          const ay = gy - (yUp + lift) * k + o.uy * off * k * 0.35 - (i ? 0.08 * s * k : 0);
          const rot = -0.28 * Math.sin(Math.PI * Math.max(0, c - 1)) * march * flip;
          g.globalAlpha = a * (i ? 0.85 : 1);
          setT(ax, ay, rot, flip, 1);
          g.drawImage(img(o.type, 0, dwp), -bw / 2 - pad, -bh - pad, dwp, dhp);
        }
        resetT();
        g.globalAlpha = 1;
        return;
      }

      if (motion === 'roll') {
        const r = bh / 2;
        const cy = bodyBottom - r;
        o.rot += (o.dist / ((spec.h / 200) * s)) * (o.ux >= 0 ? 1 : -1);
        setT(sx, cy, o.rot);
        g.drawImage(img(o.type, 0, dwp), -bw / 2 - pad, -bh / 2 - pad, dwp, dhp);
        const ob = SPECS[spec.overlay];
        const ow = (ob.w / 100) * s * k, oh = (ob.h / 100) * s * k;
        setT(sx, cy, Math.sin(t * 3 + o.seed) * 0.05);
        g.drawImage(img(spec.overlay, Math.floor(t * 5 + o.seed) % 2, ow), -ow / 2 - pad, -oh / 2 - pad, ow + 2 * pad, oh + 2 * pad);
        resetT();
        g.globalAlpha = 1;
        return;
      }

      if (motion === 'tumble') {
        const st = Math.floor(bt);
        const e = smooth(0, 0.5, frac(bt));
        const ang = (st + e) * (Math.PI / 2) * (o.ux >= 0 ? 1 : -1) * 1;
        const cy = bodyBottom - Math.max(bw, bh) * 0.5;
        setT(sx, cy, march > 0.01 ? ang : o.rot);
        if (march > 0.01) o.rot = ang;
        g.drawImage(img(o.type, 0, dwp), -bw / 2 - pad, -bh / 2 - pad, dwp, dhp);
        resetT();
        g.globalAlpha = 1;
        return;
      }

      // pet cable (iMac's puck mouse)
      if (o.leader && !o.leader.dead && o.leader.k) {
        const ld = o.leader;
        const ax = ld.sx - ld.ux * ld.bw * 0.3, ay = ld.gy + camY - (ld.liftY || 0) * ld.k - 0.18 * ld.s * ld.k;
        const bx = sx, by = bodyBottom - bh * 0.5;
        g.beginPath();
        g.moveTo(ax, ay);
        g.quadraticCurveTo((ax + bx) / 2, Math.max(ay, by) + 0.12 * k, bx, by);
        g.strokeStyle = 'rgba(230,240,248,0.85)';
        g.lineWidth = Math.max(0.8, 0.012 * k);
        g.stroke();
      }

      // body
      const pulse = spec.anim && spec.anim.pulse && frac(beat) < 0.15 ? 1.04 : 1;
      setT(sx, bodyBottom, tilt, sqx * flip * pulse, sqy * pulse);
      if (spec.add) {
        g.globalCompositeOperation = 'lighter';
        g.globalAlpha = a * (0.75 + 0.25 * Math.sin(t * 7 + o.seed));
      }
      g.drawImage(img(o.type, f, dwp), -bw / 2 - pad, -bh - pad, dwp, dhp);
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = a;

      // bonfire on the mikoshi
      if (spec.flame) {
        const fl = SPECS.flame;
        const fw = (fl.w / 100) * s * k, fh = (fl.h / 100) * s * k, fp = 0.08 * s * k;
        const fx = (spec.flame[0] - 0.5) * bw, fy = -bh + spec.flame[1] * bh;
        g.globalCompositeOperation = 'lighter';
        setT(sx, bodyBottom, tilt);
        g.globalAlpha = a * 0.9;
        g.drawImage(img('flame', Math.floor(t * 11) % 4, fw), fx - fw / 2 - fp, fy - fh - fp, fw + 2 * fp, fh + 2 * fp);
        resetT();
        blitGlow('orange', sx + fx, bodyBottom + fy - fh * 0.35, (1.3 + 0.12 * Math.sin(t * 13)) * s * k, a * 0.55);
        g.globalCompositeOperation = 'source-over';
      }
      resetT();

      // stylus over the tablet, with an osu! cursor trail
      if (spec.rider) {
        const st = SPECS.stylus;
        const pw = (st.w / 100) * s * k, ph = (st.h / 100) * s * k, pp = 0.08 * s * k;
        const ang = t * 4.2 + o.seed;
        const tipX = sx + Math.cos(ang) * bw * 0.22;
        const tipY = top + bh * 0.42 + Math.sin(ang) * bh * 0.18;
        o.trail.push(tipX, tipY);
        if (o.trail.length > 36) o.trail.splice(0, 2);
        g.globalCompositeOperation = 'lighter';
        for (let i = 2; i < o.trail.length; i += 2) {
          const u = i / o.trail.length;
          g.globalAlpha = a * u * 0.8;
          g.strokeStyle = u > 0.5 ? '#ff8fd0' : '#7fe6ff';
          g.lineWidth = Math.max(1, 0.03 * s * k * u);
          g.beginPath();
          g.moveTo(o.trail[i - 2], o.trail[i - 1]);
          g.lineTo(o.trail[i], o.trail[i + 1]);
          g.stroke();
        }
        g.globalCompositeOperation = 'source-over';
        g.globalAlpha = a;
        setT(tipX, tipY, 0.5);
        g.drawImage(img('stylus', 0, pw), -pw / 2 - pp, -ph - pp, pw + 2 * pp, ph + 2 * pp);
        resetT();
      }

      if (spec.arms) drawArms(o, spec.arms, sx, top, bw, bh, k, o.ux, bt, t, march);

      // light sources
      g.globalCompositeOperation = 'lighter';
      if (spec.glow) {
        const [gx, gyy] = spec.glowAt || [0.5, 0.5];
        blitGlow(spec.glow, sx + (gx - 0.5) * bw, top + gyy * bh, bw * 0.75, a * 0.38 * (0.85 + 0.15 * Math.sin(t * 9 + o.seed)));
      }
      if (spec.lamps) {
        const [lx, ly] = spec.lamps[f % 2];
        blitGlow('red', sx + (lx - 0.5) * bw, top + ly * bh, bw * 0.55, a * 0.85);
      }
      if (spec.lights) {
        for (const [lx, ly] of spec.lights) blitGlow('warm', sx + (lx - 0.5) * bw, top + ly * bh, bw * 0.3, a * 0.9);
        blitGlow('warm', sx, top + bh * 0.7, bw * 1.1, a * 0.22);
      }
      if (spec.sparkle) {
        const mx = sx + (spec.sparkle[0] - 0.5) * bw, my = top + spec.sparkle[1] * bh;
        for (let i = 0; i < 7; i++) {
          const an = t * 0.8 + i * 0.9;
          const rr = bw * (0.12 + 0.3 * frac(i * 0.37 + t * 0.15));
          blitGlow('star', mx + Math.cos(an) * rr, my + Math.sin(an) * rr * 0.6 + rr * 0.3, bw * 0.03 * (1 + Math.sin(t * 7 + i)), a * 0.9);
        }
        blitGlow('pink', mx, my + bh * 0.3, bw * 0.5, a * 0.18);
      }
      if (spec.flash && o.flashT !== undefined && t - o.flashT < 0.35) {
        const u = 1 - (t - o.flashT) / 0.35;
        blitGlow('white', sx + (spec.flash[0] - 0.5) * bw, top + spec.flash[1] * bh, bw * 2.6 * u, u);
        blitGlow('star', sx + (spec.flash[0] - 0.5) * bw, top + spec.flash[1] * bh, bw * 0.5, u);
      }
      if (spec.approach) {
        const u = frac(bt);
        const cx = sx, cy = top + bh / 2;
        const r0 = bh * 0.39;
        g.globalCompositeOperation = 'source-over';
        g.globalAlpha = a * (0.2 + 0.8 * u) * march;
        g.strokeStyle = o.type === 'hit_2' ? '#bfe8ff' : o.type === 'hit_3' ? '#d6ffa8' : o.type === 'hit_4' ? '#fff0a0' : '#ffb3d6';
        g.lineWidth = Math.max(1, r0 * 0.07);
        g.beginPath();
        g.arc(cx, cy, r0 * (1 + 2.1 * (1 - u)), 0, TAU);
        g.stroke();
        const bi = Math.floor(bt);
        if (bi !== o.lastHitBeat && march > 0.5) {
          if (o.lastHitBeat >= 0 && (o.type === 'hit_big' || Math.random() < 0.3) && k > 30) {
            pops.push({ x: cx, y: cy - r0 * 1.1, s: r0 / 40, life: 0.55 });
          }
          o.lastHitBeat = bi;
        }
      }
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;
    }

    // lanterns hung along both sides of the route
    function placeLantern(l, t) {
      let yUp = l.y;
      l.la = 1;
      if (songT >= HOLD && l.liftAt === null) l.liftAt = HOLD + 0.4 + Math.random() * 2.2;
      if (l.liftAt !== null && t > l.liftAt) {
        const tt = t - l.liftAt;
        yUp += 0.4 * tt + 0.9 * tt * tt;
        l.la = 1 - smooth(1.6, 3.2, tt);
        if (!l.lit && tt > 1.8) {
          l.lit = true;
          l.wantLight = true;
        }
      } else {
        l.lit = false;
      }
      const k = cam.f / l.z;
      l.k = k;
      l.sx = cam.cx + l.x * k;
      l.sy = cam.horizon + (cam.camH - yUp) * k;
      return l.la > 0.01;
    }
    function drawLantern(l, t) {
      const k = l.k;
      const s = 1.0;
      const lw = 0.36 * s * k, lh = 0.5 * s * k, pad = 0.08 * s * k;
      const ly = l.sy + camY;
      if (l.sx < -lw * 2 || l.sx > W + lw * 2 || ly > H + lh || ly < -lh * 2) return;
      const far = 0.45 + 0.55 * smooth(6, 50, k);
      const a = far * l.la * lanternA;
      const sway = (songT > S.B.t && songT < S.B.t + 4.5 ? 0.14 : 0.06) * Math.sin(t * 1.7 + l.ph);
      g.globalCompositeOperation = 'lighter';
      blitGlow('warm', l.sx, ly + lh * 0.55, lw * 1.7, a * (l.red ? 0.42 : 0.5) * (0.92 + 0.08 * Math.sin(t * 11 + l.ph)));
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = a;
      setT(l.sx, ly, sway);
      g.drawImage(img(l.red ? 'lantern_r' : 'lantern_w', 0, lw), -lw / 2 - pad, -pad, lw + 2 * pad, lh + 2 * pad);
      resetT();
      g.globalAlpha = 1;
      if (l.wantLight) {
        l.wantLight = false;
        addLight(l.sx, ly + lh * 0.5, false);
      }
    }

    // ------------------------------------------------------------------ the frame
    function render(t, beat, march) {
      const sh = Math.max(0, 1 - (t - shakeT) / 0.18);
      shX = sh > 0 ? (Math.random() - 0.5) * 9 * sh : 0;
      shY = sh > 0 ? (Math.random() - 0.5) * 6 * sh : 0;
      resetT();
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
      const intro = smooth(-1.4, 0.2, t) * smooth(0, 1.4, elapsed);
      // sky
      g.drawImage(sky.canvas, 0, -margin + camY, W, H + margin);
      if (!twinkles) twinkles = sky.bright.slice(0, 40).map(([x, y, s]) => ({ x, y: y - margin, s, ph: Math.random() * TAU, sp: 1 + Math.random() * 3 }));
      g.globalCompositeOperation = 'lighter';
      for (const tw of twinkles) blitGlow('star', tw.x, tw.y + camY, tw.s * 4, 0.35 * (0.5 + 0.5 * Math.sin(t * tw.sp + tw.ph)));
      for (const s of shooting) {
        g.globalAlpha = Math.min(1, s.life * 2);
        const gr = g.createLinearGradient(s.x, s.y + camY, s.x - s.vx * 0.12, s.y + camY - s.vy * 0.12);
        gr.addColorStop(0, 'rgba(255,255,255,0.9)');
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.strokeStyle = gr;
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(s.x, s.y + camY);
        g.lineTo(s.x - s.vx * 0.12, s.y + camY - s.vy * 0.12);
        g.stroke();
      }
      g.globalCompositeOperation = 'source-over';

      // the fleet, far overhead
      for (const sh of fleet) {
        const u = (t - sh.t0) / sh.dur;
        if (u < -0.1 || u > 1.2) continue;
        const sc = U * (cam.portrait ? 0.7 : 1);
        const x = sh.dir < 0 ? lerp(W + 140, -260, u) + sh.dx * W : lerp(-260, W + 140, u) - sh.dx * W;
        const y = (sh.y + sh.dy) * H + camY + Math.sin(t * 0.6 + sh.ph) * 2;
        const spec = SPECS[sh.id];
        const q = sh.sz * sc * 0.8;
        const w = spec.w * q, h = spec.h * q;
        g.globalAlpha = 0.9 * smooth(-0.1, 0.05, u) * (1 - smooth(1.0, 1.2, u));
        setT(x, y, 0, sh.dir < 0 ? -1 : 1, 1);
        g.drawImage(img(sh.id, 0, w), -w / 2 - 8 * q, -h / 2 - 8 * q, w + 16 * q, h + 16 * q);
        resetT();
        g.globalCompositeOperation = 'lighter';
        blitGlow('blue', x - sh.dir * w * 0.5, y, h * 0.7, 0.55);
        g.globalCompositeOperation = 'source-over';
      }
      g.globalAlpha = 1;
      // a crow (Air)
      {
        const u = (t - crow.t0) / crow.dur;
        if (u > 0 && u < 1) {
          const sc = U * 0.75;
          const x = lerp(W + 80, -120, u), y = H * 0.2 + camY + Math.sin(u * 9) * 14;
          const f = Math.floor(t * 4) % 2;
          setT(x, y, 0.05 * Math.sin(t * 2), -1, 1);
          g.drawImage(img('crow', f, 64 * sc), -40 * sc, -26 * sc, 80 * sc, 52 * sc);
          resetT();
        }
      }

      // the rails
      g.globalAlpha = intro * (1 - 0.75 * smooth(HOLD + 1.0, HOLD + 6, t));
      g.drawImage(routeLayer, 0, camY, W, H);
      g.globalAlpha = 1;

      // depth-sorted procession
      tmpList.length = 0;
      for (const o of objs) if (!o.dead && o.p >= 0 && place(o, t)) tmpList.push(o);
      if (started) for (const l of lant.all) if (placeLantern(l, t)) tmpList.push(l);
      lanternA = intro;
      tmpList.sort((a, b) => b.z - a.z);
      for (const it of tmpList) {
        if (it.spec) drawObj(it, t, beat, march);
        else drawLantern(it, t);
      }
      for (let i = objs.length - 1; i >= 0; i--) if (objs[i].dead) objs.splice(i, 1);

      // particles in front
      resetT();
      g.globalCompositeOperation = 'lighter';
      for (const f of flies) {
        const tw = 0.5 + 0.5 * Math.sin(t * 3 * f.sp + f.ph);
        blitGlow('green', f.x, f.y + camY, 6 + 4 * tw, tw * 0.9 * Math.min(1, f.life));
      }
      g.globalCompositeOperation = 'source-over';
      for (const d of drifters) {
        const id = d.kind;
        const base = id === 'feather' ? 18 : id === 'lunar' ? 30 : 34;
        const sz = base * d.s * U;
        const spd = sprite(id);
        const dh = sz * (spd.H / spd.W);
        if (id === 'lunar') {
          g.globalCompositeOperation = 'lighter';
          blitGlow('aqua', d.x, d.y + camY, sz * 1.1, 0.35);
          g.globalCompositeOperation = 'source-over';
        }
        g.globalAlpha = 0.9;
        setT(d.x, d.y + camY, d.r + (id === 'feather' ? Math.sin(t * 2 + d.ph) * 0.5 : 0));
        g.drawImage(img(id, 0, sz), -sz / 2, -dh / 2, sz, dh);
        resetT();
      }
      g.globalAlpha = 1;
      // cicadas crossing during the matsuri
      for (const c of cicadas) {
        const u = (t - c.t0) / c.dur;
        if (u < 0 || u > 1) continue;
        const sc = U * c.sz;
        const x = lerp(-60, W + 60, u), y = H * c.y + Math.sin(t * 7 + c.ph) * 10 + camY;
        setT(x, y, 0.1 * Math.sin(t * 5 + c.ph));
        g.drawImage(img('cicada', (Math.floor(t * 30) + Math.floor(c.ph)) % 2, 44 * sc), -30 * sc, -19 * sc, 60 * sc, 38 * sc);
        resetT();
      }
      // 300s
      for (const p of pops) {
        const u = p.life / 0.55;
        g.globalAlpha = Math.min(1, u * 1.6);
        const w = 86 * p.s * (1.1 - u * 0.2), h = 50 * p.s * (1.1 - u * 0.2);
        g.drawImage(img('s300', 0, w), p.x - w / 2, p.y + camY - h / 2, w, h);
      }
      g.globalAlpha = 1;
      // confetti + streamers (they fade once everything has lifted)
      const thrown = 1 - smooth(HOLD + 1.5, tempo.bell + 1.2, t);
      g.globalAlpha = thrown;
      for (const c of confetti) {
        const fl = Math.cos(c.life * c.fs + c.fl);
        setT(c.x, c.y, c.rot, 1, fl);
        g.fillStyle = c.col;
        g.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
      }
      resetT();
      g.lineCap = 'round';
      g.lineJoin = 'round';
      for (const s of streamers) {
        g.strokeStyle = s.col;
        g.lineWidth = 3.2 * U;
        g.beginPath();
        s.pts.forEach(([x, y], i) => (i ? g.lineTo(x + Math.sin(i * 1.3 + s.life * 6) * 3, y) : g.moveTo(x, y)));
        g.stroke();
      }
      g.globalAlpha = 1;
      // lights of happiness
      g.globalCompositeOperation = 'lighter';
      const after = smooth(tempo.bell - 0.5, tempo.bell + 1.5, t);
      for (const l of lights) {
        const tw = 0.8 + 0.2 * Math.sin(t * l.tw + l.ph);
        const r = l.r * tw * (1 + after * 0.25);
        const y = l.y + camY;
        if (y < -r * 5 || y > H + r * 5) continue;
        blitGlow('warm', l.x, y, r * 5.5, l.a * 0.42);
        blitGlow('light', l.x, y, r * 2.2, l.a * 0.85);
        blitGlow('star', l.x, y, r * 0.9, l.a);
      }
      // bell bloom
      if (t > tempo.bell && t < tempo.bell + 3) {
        const u = (t - tempo.bell) / 3;
        g.globalAlpha = (1 - u) * 0.25;
        g.drawImage(glows.light, W / 2 - W * 0.8, H * 0.35 - W * 0.8, W * 1.6, W * 1.6);
      }
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;

      // flash photography (the basement)
      if (flashA > 0) {
        g.fillStyle = `rgba(255,255,255,${flashA})`;
        g.fillRect(0, 0, W, H);
      }
      // grain + vignette
      if (quality > 0.6 && grain) {
        g.globalAlpha = 0.035;
        g.save();
        g.translate(Math.floor(Math.random() * 160), Math.floor(Math.random() * 160));
        g.fillStyle = grain;
        g.fillRect(-160, -160, W + 320, H + 320);
        g.restore();
        resetT();
      }
      g.globalAlpha = 1;
      g.drawImage(vignette, 0, 0, W, H);
      if (!shown) {
        shown = true;
        cv.style.opacity = '1';
      }
    }

    // optional: start part-way through (dev / testing) by fast-forwarding the procession
    if (typeof ctx.startAt === 'number' && ctx.startAt > 0) {
      started = true;
      fontsOK = true;
      songT = 0;
      const target = Math.min(ctx.startAt, tempo.end - 0.5);
      while (songT < target) {
        songT += 1 / 30;
        update(1 / 30);
      }
      if (seq) seq.seek(songT);
      elapsed = 2;
    }

    // ------------------------------------------------------------------ loop
    ctx.loop((now, dt) => {
      if (document.hidden) return;
      dt = Math.min(dt, 0.1);
      elapsed += dt;
      const t0 = performance.now();
      if (fontsOK || elapsed > 1.7) buildSome(songT < 0 ? 18 : 4);
      syncClock(dt);
      pump();
      const { beat, march } = update(dt);
      render(songT, Math.max(0, beat) < HOLD_BEAT ? Math.max(0, beat) : HOLD_BEAT, march);
      if (!doneSent && songT >= tempo.end) {
        doneSent = true;
        if (typeof ctx.done === 'function') ctx.done();
      }
      const ft = performance.now() - t0;
      ftAvg = ftAvg * 0.95 + ft * 0.05;
      if (ftAvg > 13 && quality > 0.5) quality = 0.5;
      else if (ftAvg < 7 && quality < 1) quality = Math.min(1, quality + dt * 0.1);
    });

    // ------------------------------------------------------------------ lifecycle
    let resizeTimer = null;
    return {
      resize(w, h) {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          resizeTimer = null;
          if (signal.aborted) return;
          layout(w, h);
          twinkles = null;
          for (const o of objs) o.lx = null;
        }, 120);
      },
      destroy() {
        if (resizeTimer) clearTimeout(resizeTimer);
        if (band) {
          band.stop();
          const b = band;
          setTimeout(() => b.disconnect(), 400);
        }
        objs.length = 0;
        lights.length = 0;
        confetti.length = 0;
      },
    };
  },
};
