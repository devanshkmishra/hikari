// 銀座, 1985, after the last train. A one-point street under the elevated line: wet asphalt,
// projecting signs, a street screen above a record shop, a phone box, and Wong Kar-wai's
// step-printed smear on anything that moves. Everything is drawn here in canvas 2D with
// cached static layers + a per-frame emissive / reflection / weather pass.

import { clamp, lerp, rng, canvas, glow, rgba, mix, grainTiles, vtext, roundRect, easeInOut, el, isTouch } from './util.js';
import { TV, TV_W, TV_H } from './tv.js';

const F = 700, VPY = 600, EYE = 1.6;
const PX = (X, Z) => (X * F) / Z;
const PY = (Y, Z) => VPY + ((EYE - Y) * F) / Z;
const K = (Z) => F / Z;

const FACADE_X = 6.5, CURB_X = 4.0, BRIDGE_Z = 22, FRONT_Z = 30;
const TV_RECT = { x0: -140, x1: 140, y0: PY(22.4, FRONT_Z), y1: PY(13.4, FRONT_Z) };
const SHOP = { x0: PX(-3.2, FRONT_Z), x1: PX(3.2, FRONT_Z), y0: PY(4.3, FRONT_Z), y1: PY(0, FRONT_Z) };
const BOOTH = { X0: -5.0, X1: -4.0, Z: 13, H: 2.3 };

export class Street {
  constructor(parent, ctx, hooks) {
    this.ctx = ctx;
    this.audio = ctx.audio;
    this.ac = ctx.audio.ac;
    this.hooks = hooks;
    this.root = el('div', 'sw-street', parent);
    this.cv = el('canvas', 'sw-cv', this.root);
    this.g = this.cv.getContext('2d', { alpha: false });
    this.ui = el('div', 'sw-street-ui', this.root);
    this.r = rng(1027);
    this.t = 0;
    this.cam = { fx: 0, fy: 500, z: 1 };
    this.camAnim = null;
    this.mode = 'street'; // 'street' | 'tv' | 'leaving'
    this.grain = grainTiles(4, 160);
    this.hover = null;
    this.flash = 0;
    this.trainLight = 0;
    this.reduced = !!ctx.reduced;
    this.visible = true;

    this.buildAudio();
    this.tv = new TV(this.audio, this.tvIn, {
      onLine: (l) => this.hooks.tvLine(l),
      onDone: () => {},
    });
    this.buildScene();
    this.buildUI();
    this.resize(ctx.w, ctx.h);
    this.bindInput();
  }

  // ===================================================================== audio
  buildAudio() {
    const ac = this.ac, A = this.audio;
    this.bus = ac.createGain(); this.bus.gain.value = 1; this.bus.connect(this.ctx.out);
    const wet = ac.createGain(); wet.gain.value = 0.18; this.bus.connect(wet).connect(this.ctx.send);
    this.amb = ac.createGain(); this.amb.gain.value = 1; this.amb.connect(this.bus);
    this.loops = [];
    this.rainLoop = A.noiseLoop(this.amb, { kind: 'pink', type: 'bandpass', freq: 2400, q: 0.35, gain: 0.07 });
    this.rainLow = A.noiseLoop(this.amb, { kind: 'brown', type: 'lowpass', freq: 220, q: 0.5, gain: 0.08 });
    this.patter = A.noiseLoop(this.amb, { kind: 'white', type: 'bandpass', freq: 5200, q: 0.8, gain: 0.012 });
    this.loops.push(this.rainLoop, this.rainLow, this.patter);
    // 50 Hz east-Japan mains → 100 Hz transformer buzz under the signs
    this.buzz = ac.createGain(); this.buzz.gain.value = 0.006;
    const bf = ac.createBiquadFilter(); bf.type = 'bandpass'; bf.frequency.value = 400; bf.Q.value = 0.6;
    const bo = ac.createOscillator(); bo.type = 'sawtooth'; bo.frequency.value = 100; bo.start();
    const bo2 = ac.createOscillator(); bo2.type = 'square'; bo2.frequency.value = 200; bo2.start();
    const bg2 = ac.createGain(); bg2.gain.value = 0.3;
    bo.connect(bf); bo2.connect(bg2).connect(bf); bf.connect(this.buzz).connect(this.amb);
    this.loops.push({ stop: () => { try { bo.stop(); bo2.stop(); } catch (e) {} } });

    // the street screen's speaker, bouncing off the buildings
    this.tvIn = ac.createGain();
    this.tvLP = ac.createBiquadFilter(); this.tvLP.type = 'lowpass'; this.tvLP.frequency.value = 2200; this.tvLP.Q.value = 0.4;
    const tvHP = ac.createBiquadFilter(); tvHP.type = 'highpass'; tvHP.frequency.value = 180;
    this.tvGain = ac.createGain(); this.tvGain.gain.value = 0.32;
    this.tvIn.connect(tvHP).connect(this.tvLP).connect(this.tvGain).connect(this.bus);
    const echo = ac.createDelay(1); echo.delayTime.value = 0.16;
    const fb = ac.createGain(); fb.gain.value = 0.28;
    const ew = ac.createGain(); ew.gain.value = 0.22;
    this.tvGain.connect(echo); echo.connect(fb).connect(echo); echo.connect(ew).connect(this.bus);
    this.tvSend = ac.createGain(); this.tvSend.gain.value = 0.35; this.tvGain.connect(this.tvSend).connect(this.ctx.send);

    // whatever the record shop is playing, leaking out of its door
    this.leakIn = ac.createGain();
    this.leakLP = ac.createBiquadFilter(); this.leakLP.type = 'lowpass'; this.leakLP.frequency.value = 520;
    this.leakGain = ac.createGain(); this.leakGain.gain.value = 0.26;
    this.leakIn.connect(this.leakLP).connect(this.leakGain).connect(this.bus);
  }

  dripTick() {
    const ac = this.ac, t = ac.currentTime + Math.random() * 0.1;
    const o = ac.createOscillator(); o.type = 'sine';
    const f = 1400 + Math.random() * 2200;
    o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.6, t + 0.04);
    const g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.018 * Math.random(), t + 0.002); g.gain.setTargetAtTime(0, t + 0.003, 0.012);
    const p = ac.createStereoPanner(); p.pan.value = Math.random() * 2 - 1;
    o.connect(g).connect(p).connect(this.amb); o.start(t); o.stop(t + 0.1);
  }

  sputterTick(v = 0.04) {
    const ac = this.ac, t = ac.currentTime;
    const s = ac.createBufferSource(); s.buffer = this.audio.noise('white');
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 3000; f.Q.value = 2;
    const g = ac.createGain(); g.gain.setValueAtTime(v, t); g.gain.setTargetAtTime(0, t, 0.01);
    const p = ac.createStereoPanner(); p.pan.value = -0.45;
    s.connect(f).connect(g).connect(p).connect(this.amb); s.start(t, Math.random()); s.stop(t + 0.08);
  }

  // A train on a steel girder bridge: wheel-joint "ta-tan ta-tan", bridge boom, motor whine.
  trainSound(dir, dur) {
    const ac = this.ac, A = this.audio, t0 = ac.currentTime + 0.05;
    const out = ac.createGain(); out.gain.value = 0;
    const pan = ac.createStereoPanner(); pan.pan.value = -dir * 0.8;
    out.connect(pan).connect(this.bus);
    const sendG = ac.createGain(); sendG.gain.value = 0.3; out.connect(sendG).connect(this.ctx.send);
    out.gain.setValueAtTime(0, t0); out.gain.linearRampToValueAtTime(1, t0 + 3.5);
    out.gain.setValueAtTime(1, t0 + dur - 4); out.gain.linearRampToValueAtTime(0, t0 + dur);
    pan.pan.setValueAtTime(-dir * 0.8, t0); pan.pan.linearRampToValueAtTime(dir * 0.8, t0 + dur);
    const boom = A.noiseLoop(out, { kind: 'brown', type: 'lowpass', freq: 140, q: 1.4, gain: 0.55 });
    const roar = A.noiseLoop(out, { kind: 'pink', type: 'bandpass', freq: 900, q: 0.5, gain: 0.09 });
    const whine = ac.createOscillator(); whine.type = 'triangle'; whine.frequency.value = 410;
    const wg = ac.createGain(); wg.gain.value = 0.012; whine.connect(wg).connect(out); whine.start(t0);
    const whine2 = ac.createOscillator(); whine2.type = 'sine'; whine2.frequency.value = 1230;
    const wg2 = ac.createGain(); wg2.gain.value = 0.004; whine2.connect(wg2).connect(out); whine2.start(t0);
    // wheel joints: each car passes a rail joint as two bogie pairs
    const carT = 20 / 13;
    for (let c = 0; c < 10; c++) {
      for (const off of [0, 0.17, carT * 0.82, carT * 0.82 + 0.17]) {
        const t = t0 + 2 + c * carT + off;
        if (t > t0 + dur - 2) continue;
        const s = ac.createBufferSource(); s.buffer = A.noise('white');
        const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 700 + Math.random() * 400; f.Q.value = 1.1;
        const g = ac.createGain(); g.gain.setValueAtTime(0.5, t); g.gain.setTargetAtTime(0, t, 0.03);
        s.connect(f).connect(g).connect(out); s.start(t, Math.random()); s.stop(t + 0.2);
        const o = ac.createOscillator(); o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(50, t + 0.08);
        const og = ac.createGain(); og.gain.setValueAtTime(0.3, t); og.gain.setTargetAtTime(0, t, 0.05);
        o.connect(og).connect(out); o.start(t); o.stop(t + 0.3);
      }
    }
    const end = t0 + dur + 0.2;
    boom.stop(end - ac.currentTime); roar.stop(end - ac.currentTime);
    whine.stop(end); whine2.stop(end);
    setTimeout(() => { try { out.disconnect(); } catch (e) {} }, (dur + 1) * 1000);
  }

  carSound(dur, panFrom, panTo, peakAt = 0.5, loud = 1) {
    const ac = this.ac, A = this.audio, t0 = ac.currentTime + 0.02;
    const out = ac.createGain(); out.gain.value = 0;
    const pan = ac.createStereoPanner(); pan.pan.setValueAtTime(panFrom, t0); pan.pan.linearRampToValueAtTime(panTo, t0 + dur);
    out.connect(pan).connect(this.bus);
    out.gain.setValueAtTime(0.0001, t0);
    out.gain.exponentialRampToValueAtTime(0.5 * loud, t0 + dur * peakAt);
    out.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    const hiss = A.noiseLoop(out, { kind: 'white', type: 'bandpass', freq: 1400, q: 0.45, gain: 0.25 });
    hiss.filter.frequency.setValueAtTime(900, t0); hiss.filter.frequency.linearRampToValueAtTime(2200, t0 + dur * peakAt); hiss.filter.frequency.linearRampToValueAtTime(800, t0 + dur);
    const eng = ac.createOscillator(); eng.type = 'sawtooth'; eng.frequency.setValueAtTime(48, t0); eng.frequency.linearRampToValueAtTime(52, t0 + dur * peakAt); eng.frequency.linearRampToValueAtTime(42, t0 + dur);
    const el2 = ac.createBiquadFilter(); el2.type = 'lowpass'; el2.frequency.value = 180;
    const eg = ac.createGain(); eg.gain.value = 0.2;
    eng.connect(el2).connect(eg).connect(out); eng.start(t0); eng.stop(t0 + dur + 0.1);
    hiss.stop(dur + 0.1);
    setTimeout(() => { try { out.disconnect(); } catch (e) {} }, (dur + 1) * 1000);
  }

  step(gain, pan) {
    const ac = this.ac, t = ac.currentTime;
    const s = ac.createBufferSource(); s.buffer = this.audio.noise('white');
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900 + Math.random() * 900; f.Q.value = 0.9;
    const g = ac.createGain(); g.gain.setValueAtTime(gain, t); g.gain.setTargetAtTime(0, t, 0.035);
    const p = ac.createStereoPanner(); p.pan.value = clamp(pan, -1, 1);
    s.connect(f).connect(g).connect(p).connect(this.bus); s.start(t, Math.random()); s.stop(t + 0.2);
  }

  // ===================================================================== scene data
  buildScene() {
    const r = this.r;
    // facade segments, near → far, per side
    this.segs = [
      { s: -1, z0: 3.3, z1: 7, h: 18, col: '#2a2426' }, { s: -1, z0: 7, z1: 11, h: 12, col: '#26282c' },
      { s: -1, z0: 11, z1: 14, h: 8, col: '#2b231f', old: true }, { s: -1, z0: 14, z1: 18.5, h: 21, col: '#24232a' },
      { s: -1, z0: 18.5, z1: BRIDGE_Z, h: 14, col: '#2a2522' },
      { s: 1, z0: 3.3, z1: 6, h: 15, col: '#29252a' }, { s: 1, z0: 6, z1: 10.5, h: 24, col: '#232528' },
      { s: 1, z0: 10.5, z1: 13, h: 7, col: '#2c2420', old: true }, { s: 1, z0: 13, z1: 17, h: 7.5, col: '#262326', old: true },
      { s: 1, z0: 17, z1: BRIDGE_Z, h: 19, col: '#25262b' },
    ];
    this.segs.forEach((sg) => {
      sg.win = [];
      for (let y = 3.8; y < sg.h - 1.2; y += 3.2) {
        for (let z = sg.z0 + 0.6; z < sg.z1 - 1.0; z += 2.3) {
          const lit = r() < 0.28;
          sg.win.push({ y, z, lit, col: lit ? r.pick(['#ffc884', '#ffd9a0', '#d8f2e6', '#c9e8ff', '#ff9f6b']) : '#141318', a: 0.5 + r() * 0.5 });
        }
      }
      sg.shop = r.pick(['lit', 'lit', 'shutter', 'noren', 'lit']);
      sg.shopCol = r.pick(['#ffcf8a', '#ffe2b8', '#bfe8ff', '#ffb070']);
    });

    // projecting signs: side, z, y0, h, w, text, style, colours, flicker kind
    const S = (s, z, y0, h, w, text, style, a, b, fl = 'stable') => ({ s, z, y0, h, w, text, style, a, b, fl, seed: r() * 100 });
    this.signs = [
      S(-1, 5.2, 3.2, 4.4, 0.9, '純喫茶ルナ', 'box', '#fff6e4', '#a42a2a'),
      S(-1, 8.3, 3.4, 2.6, 0.8, '麻雀', 'neon', '#1a1a20', '#58ff9a', 'sputter'),
      S(-1, 10.8, 3.6, 1.3, 1.0, '質', 'circle', '#14203a', '#f4efe2', 'dying'),
      S(-1, 14.6, 3.4, 3.4, 0.8, 'スナック夜光', 'neon', '#120f18', '#ff5fa8', 'breathe'),
      S(-1, 17.4, 3.0, 2.8, 0.75, 'カラオケ', 'box', '#ffe14a', '#3a2a8a'),
      S(-1, 20.4, 3.2, 2.9, 0.8, 'ホテル', 'neon', '#110d1c', '#b28cff', 'sputter'),
      S(1, 5.6, 3.0, 4.8, 0.95, 'ラーメン来々軒', 'box', '#ffd84a', '#c42222'),
      S(1, 8.8, 3.6, 3.0, 0.85, 'BAR港', 'neon', '#0d1418', '#5ff0ff', 'stable'),
      S(1, 11.6, 3.0, 2.2, 0.75, 'くすり', 'box', '#f2f7ff', '#1f4fb0'),
      S(1, 15.1, 3.4, 3.9, 0.9, 'パチンコ', 'chaser', '#b0141e', '#fff4d0'),
      S(1, 18.6, 3.2, 2.6, 0.75, '喫茶白馬', 'box', '#f7efe0', '#6a3a18'),
      S(1, 21.3, 3.0, 2.2, 0.75, '酒', 'box', '#20214a', '#f2efe6'),
    ];
    // vending machine, red lantern, lamps, wires, puddles, steam vent
    this.vend = { X0: -6.4, X1: -5.6, Z: 16.4, H: 1.85 };
    this.lantern = { X: -5.0, Z: 21.2, Y: 2.75, r: 0.32 };
    this.lamps = [{ s: -1, z: 9.2 }, { s: 1, z: 13.4 }, { s: -1, z: 19.6 }];
    this.wires = [{ z: 6.4, y: 7.6, sag: 0.7 }, { z: 6.6, y: 7.9, sag: 0.8 }, { z: 12.2, y: 8.2, sag: 0.8 }, { z: 17, y: 9, sag: 0.6 }];
    this.puddles = [];
    for (let i = 0; i < 16; i++) this.puddles.push({ X: (r() - 0.5) * 8, Z: 5 + Math.pow(r(), 1.2) * 16, w: 1 + r() * 2.6, d: 1.2 + r() * 3 });
    this.vent = { X: 1.3, Z: 8.5 };
    this.steam = [];
    this.smoke = [];
    this.frontage = [];
    for (let X = -60; X < 60;) {
      const w = X > -10 && X < 10 ? 20 : 5 + r() * 9;
      const x0 = X > -10 && X < 10 ? -10 : X;
      const h = x0 === -10 ? 27 : (Math.abs(X) < 17 && X > 0 ? 11 : 9 + r() * 14);
      this.frontage.push({ X0: x0, X1: x0 + w, h, col: mix('#1e1b24', '#2a2328', r()), tv: x0 === -10 });
      X = x0 + w;
    }

    // movers
    this.train = null; this.nextTrain = 9;
    this.taxi = null; this.nextTaxi = 4;
    this.car = null; this.nextCar = 16;
    this.walkers = []; this.nextWalker = 2;
    this.passer = null; this.nextPasser = 26;
    this.drops = []; this.splashes = [];
    for (let i = 0; i < 260; i++) this.drops.push(this.newDrop(true));
    this.nextDrip = 0;
  }

  newDrop(init) {
    const r = Math.random;
    const z = 0.25 + r() * 0.75;
    return { x: r() * 1.2 - 0.1, y: init ? r() : -r() * 0.2, z, len: 0.02 + z * 0.06 };
  }

  // ===================================================================== layout
  resize(w, h) {
    this.W = w; this.H = h;
    this.rs = Math.min(this.ctx.dpr || 1, 1.5);
    this.s = Math.min(h / 1000, w / 560);
    const cw = Math.round(w * this.rs), ch = Math.round(h * this.rs);
    this.cv.width = cw; this.cv.height = ch;
    this.cv.style.width = w + 'px'; this.cv.style.height = h + 'px';
    this.L0 = canvas(cw, ch); this.L1 = canvas(cw, ch);
    this.RB = canvas(Math.ceil(cw / 2), Math.ceil(ch / 2));
    this.vig = canvas(cw, ch);
    const vg = this.vig.getContext('2d');
    const rad = vg.createRadialGradient(cw / 2, ch * 0.48, Math.min(cw, ch) * 0.3, cw / 2, ch / 2, Math.hypot(cw, ch) * 0.62);
    rad.addColorStop(0, 'rgba(0,0,0,0)'); rad.addColorStop(1, 'rgba(0,0,0,0.62)');
    vg.fillStyle = rad; vg.fillRect(0, 0, cw, ch);
    this.paintStatic();
    this.layoutUI();
  }

  baseXf(g, z = 1, fx = 0, fy = 500, scale = 1) {
    const k = this.rs * this.s * z * scale;
    g.setTransform(k, 0, 0, k, scale * this.rs * (this.W / 2 - fx * this.s * z), scale * this.rs * (this.H / 2 - fy * this.s * z));
  }

  toScreen(x, y) {
    const { fx, fy, z } = this.cam;
    return [this.W / 2 + (x - fx) * this.s * z, this.H / 2 + (y - fy) * this.s * z];
  }
  toDesign(cx, cy) {
    const { fx, fy, z } = this.cam;
    return [fx + (cx - this.W / 2) / (this.s * z), fy + (cy - this.H / 2) / (this.s * z)];
  }

  // ===================================================================== static painting
  paintStatic() {
    const g0 = this.L0.getContext('2d');
    g0.setTransform(1, 0, 0, 1, 0, 0); g0.clearRect(0, 0, this.L0.width, this.L0.height);
    this.baseXf(g0);
    this.paintFar(g0);
    const g1 = this.L1.getContext('2d');
    g1.setTransform(1, 0, 0, 1, 0, 0); g1.clearRect(0, 0, this.L1.width, this.L1.height);
    this.baseXf(g1);
    this.paintNear(g1);
    this.buildSprites();
  }

  paintFar(g) {
    const r = rng(77);
    const xl = -1500, xr = 1500;
    // sky: sodium haze low, violet-black high
    const sky = g.createLinearGradient(0, -500, 0, VPY);
    sky.addColorStop(0, '#040309'); sky.addColorStop(0.45, '#0c0a17'); sky.addColorStop(0.78, '#21132a'); sky.addColorStop(1, '#4a2230');
    g.fillStyle = sky; g.fillRect(xl, -600, xr - xl, VPY + 600);
    g.save(); g.globalCompositeOperation = 'lighter';
    const hz = g.createRadialGradient(0, VPY - 20, 10, 0, VPY - 20, 900);
    hz.addColorStop(0, 'rgba(255,140,80,0.22)'); hz.addColorStop(0.5, 'rgba(160,60,90,0.08)'); hz.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = hz; g.fillRect(xl, -200, xr - xl, 900);
    g.restore();
    // distant skyline (Z 60–200)
    for (let x = xl; x < xr;) {
      const w = 30 + r() * 110, h = 90 + r() * 330;
      const top = VPY + 8 - h;
      g.fillStyle = mix('#0b0a12', '#151220', r());
      g.fillRect(x, top, w, h + 40);
      for (let wy = top + 8; wy < VPY; wy += 9) for (let wx = x + 4; wx < x + w - 4; wx += 7) {
        if (r() < 0.12) { g.fillStyle = rgba(r() < 0.6 ? '#ffcf8a' : '#cfe8ff', 0.25 + r() * 0.5); g.fillRect(wx, wy, 3, 4); }
      }
      if (r() < 0.3) { g.fillStyle = '#ff2a2a'; g.fillRect(x + w / 2 - 1.5, top - 3, 3, 3); }
      x += w + r() * 10;
    }
    // a clock tower in the gap, lit face (time drawn live)
    const ct = { x: 330, top: 92, w: 92, base: 620 };
    this.clock = { x: ct.x, y: ct.top + 64, r: 24 };
    g.fillStyle = '#100e16';
    g.fillRect(ct.x - ct.w / 2, ct.top + 30, ct.w, ct.base - ct.top);
    g.beginPath(); g.moveTo(ct.x - ct.w / 2 - 6, ct.top + 34); g.lineTo(ct.x, ct.top - 20); g.lineTo(ct.x + ct.w / 2 + 6, ct.top + 34); g.fill();
    g.fillRect(ct.x - 2, ct.top - 46, 4, 30);
    g.fillStyle = '#e9e2c8'; g.beginPath(); g.arc(this.clock.x, this.clock.y, this.clock.r, 0, 7); g.fill();
    g.strokeStyle = '#3a3428'; g.lineWidth = 2; g.stroke();
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g.fillStyle = '#3a3428'; g.fillRect(this.clock.x + Math.sin(a) * 20 - 1, this.clock.y - Math.cos(a) * 20 - 1, 2, 2); }
    for (let wy = ct.top + 110; wy < ct.base - 20; wy += 22) for (let k = -1; k <= 1; k++) { g.fillStyle = r() < 0.4 ? 'rgba(255,214,150,0.45)' : 'rgba(30,26,34,1)'; g.fillRect(ct.x + k * 26 - 6, wy, 12, 14); }

    // the cross-street frontage at Z=30, including the HIKARI building with its screen
    const k = K(FRONT_Z), yg = PY(0, FRONT_Z);
    this.frontage.forEach((b) => {
      const x0 = PX(b.X0, FRONT_Z), x1 = PX(b.X1, FRONT_Z), top = PY(b.h, FRONT_Z);
      const gr = g.createLinearGradient(0, top, 0, yg);
      gr.addColorStop(0, mix(b.col, '#000000', 0.4)); gr.addColorStop(1, mix(b.col, '#3a2418', 0.4));
      g.fillStyle = gr; g.fillRect(x0, top, x1 - x0 + 0.5, yg - top);
      if (b.h < 13) for (let a = 0; a < 2; a++) { const ax = x0 + (x1 - x0) * (0.25 + a * 0.5); g.strokeStyle = '#0b0a10'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(ax, top); g.lineTo(ax, top - 22); g.moveTo(ax - 8, top - 18); g.lineTo(ax + 8, top - 18); g.moveTo(ax - 6, top - 12); g.lineTo(ax + 6, top - 12); g.stroke(); }
      for (let y = 4.4; y < b.h - 1; y += 3.3) {
        for (let X = b.X0 + 0.8; X < b.X1 - 1; X += 2.4) {
          if (b.tv && y > 12.4 && y < 23.6 && X > -6.8 && X < 6.8) continue;
          const wx = PX(X, FRONT_Z), wy = PY(y + 1.5, FRONT_Z);
          const lit = r() < 0.3;
          g.fillStyle = lit ? rgba(r.pick(['#ffcf8a', '#d9f2e6', '#ffe0b0']), 0.55 + r() * 0.4) : '#121117';
          g.fillRect(wx, wy, 1.4 * k, 1.5 * k);
        }
      }
    });
    // TV frame + HIKARI band
    const tv = TV_RECT, m = 0.5 * k;
    g.fillStyle = '#0a0a0d'; g.fillRect(tv.x0 - m, tv.y0 - m, tv.x1 - tv.x0 + 2 * m, tv.y1 - tv.y0 + 2 * m);
    g.strokeStyle = '#3d3a36'; g.lineWidth = 1.5; g.strokeRect(tv.x0 - m, tv.y0 - m, tv.x1 - tv.x0 + 2 * m, tv.y1 - tv.y0 + 2 * m);
    const bandY0 = PY(25.2, FRONT_Z), bandY1 = PY(23.4, FRONT_Z);
    g.fillStyle = '#16141a'; g.fillRect(-150, bandY0, 300, bandY1 - bandY0);
    this.hikariBand = { x0: -150, x1: 150, y0: bandY0, y1: bandY1 };

    // cross street (between bridge and frontage), its far sidewalk, and the whole ground
    const gr = g.createLinearGradient(0, VPY, 0, 1400);
    gr.addColorStop(0, '#191720'); gr.addColorStop(0.08, '#151319'); gr.addColorStop(1, '#09080c');
    g.fillStyle = gr; g.fillRect(xl, VPY, xr - xl, 900);
    g.fillStyle = '#211d22'; g.fillRect(xl, PY(0, 29.6), xr - xl, yg - PY(0, 29.6));
    // shop front (the lit parts are drawn live)
    const sh = SHOP;
    g.fillStyle = '#1b130f'; g.fillRect(sh.x0 - 4, sh.y0 - 3, sh.x1 - sh.x0 + 8, sh.y1 - sh.y0 + 3);
    // barber pole housing on the frontage
    this.pole = { x: PX(8.6, FRONT_Z), y0: PY(2.3, FRONT_Z), y1: PY(0.9, FRONT_Z), w: 0.28 * k };
    g.fillStyle = '#2a2a2e'; g.fillRect(this.pole.x - this.pole.w / 2 - 2, this.pole.y0 - 4, this.pole.w + 4, this.pole.y1 - this.pole.y0 + 8);
    // flat signs on the frontage
    const flat = [[-20, 5, '洋食', '#ffefcf', '#8a2a18'], [-14.5, 4.6, 'うなぎ', '#f4f0e6', '#1a1a1a'], [14.2, 5.2, '天ぷら', '#203a6a', '#ffffff'], [19.5, 4.8, '画廊', '#e8e2d6', '#3a3a3a']];
    this.flatSigns = flat.map(([X, Y, t, bg, fg]) => {
      const n = [...t].length;
      const sz = 0.7 * k;
      return { x: PX(X, FRONT_Z), y: PY(Y, FRONT_Z), w: sz * 1.25, h: sz * n * 1.08 + sz * 0.3, t, bg, fg, sz };
    });
  }

  paintNear(g) {
    const r = rng(99);
    // ---- wet ground overlay with puddle holes (near side of the bridge)
    const ygB = PY(0, BRIDGE_Z);
    const ov = canvas(this.L1.width, this.L1.height);
    const og = ov.getContext('2d');
    this.baseXf(og);
    og.fillStyle = 'rgba(12,11,15,0.38)';
    og.fillRect(-1500, ygB, 3000, 900);
    // asphalt speckle
    for (let i = 0; i < 2600; i++) {
      const Z = 2.6 + Math.pow(r(), 1.8) * 20, X = (r() - 0.5) * 16;
      og.fillStyle = rgba(r() < 0.5 ? '#000000' : '#3a3540', 0.25 * r());
      og.fillRect(PX(X, Z), PY(0, Z), 0.12 * K(Z), 0.05 * K(Z));
    }
    og.globalCompositeOperation = 'destination-out';
    this.puddles.forEach((p) => {
      const cx = PX(p.X, p.Z), cy = PY(0, p.Z), rx = p.w * K(p.Z) * 0.5, ry = Math.max(1.5, (p.d * EYE * F) / (p.Z * p.Z) * 0.5);
      og.save(); og.translate(cx, cy); og.scale(1, ry / rx);
      const pg = og.createRadialGradient(0, 0, rx * 0.2, 0, 0, rx);
      pg.addColorStop(0, 'rgba(0,0,0,1)'); pg.addColorStop(0.7, 'rgba(0,0,0,0.85)'); pg.addColorStop(1, 'rgba(0,0,0,0)');
      og.fillStyle = pg; og.beginPath(); og.arc(0, 0, rx, 0, 7); og.fill(); og.restore();
    });
    og.globalCompositeOperation = 'source-over';
    // sidewalks: drier, paved, less mirror
    for (const s of [-1, 1]) {
      og.fillStyle = 'rgba(30,27,31,0.55)';
      og.beginPath();
      const zs = [2.4, BRIDGE_Z];
      og.moveTo(PX(s * CURB_X, zs[0]), PY(0, zs[0])); og.lineTo(PX(s * 9, zs[0]), PY(0, zs[0]));
      og.lineTo(PX(s * FACADE_X, zs[1]), PY(0, zs[1])); og.lineTo(PX(s * CURB_X, zs[1]), PY(0, zs[1])); og.closePath(); og.fill();
      og.strokeStyle = 'rgba(0,0,0,0.35)'; og.lineWidth = 0.6;
      for (let z = 2.6; z < BRIDGE_Z; z *= 1.045) { og.beginPath(); og.moveTo(PX(s * CURB_X, z), PY(0, z)); og.lineTo(PX(s * FACADE_X, z), PY(0, z)); og.stroke(); }
      // curb face
      og.fillStyle = '#3a363a';
      og.beginPath(); og.moveTo(PX(s * CURB_X, 2.4), PY(0, 2.4)); og.lineTo(PX(s * CURB_X, BRIDGE_Z), PY(0, BRIDGE_Z));
      og.lineTo(PX(s * CURB_X, BRIDGE_Z), PY(0.15, BRIDGE_Z)); og.lineTo(PX(s * CURB_X, 2.4), PY(0.15, 2.4)); og.closePath(); og.fill();
    }
    // centre line (dashed), crossing, 止まれ
    og.fillStyle = 'rgba(225,220,205,0.55)';
    for (let z = 3; z < 19; z += 3) { const z1 = z + 1.5; og.beginPath(); og.moveTo(PX(-0.07, z), PY(0, z)); og.lineTo(PX(0.07, z), PY(0, z)); og.lineTo(PX(0.07, z1), PY(0, z1)); og.lineTo(PX(-0.07, z1), PY(0, z1)); og.fill(); }
    for (let X = -3.6; X < 3.6; X += 0.9) { og.beginPath(); og.moveTo(PX(X, 19.6), PY(0, 19.6)); og.lineTo(PX(X + 0.45, 19.6), PY(0, 19.6)); og.lineTo(PX(X + 0.45, 21.4), PY(0, 21.4)); og.lineTo(PX(X, 21.4), PY(0, 21.4)); og.fill(); }
    og.fillRect(PX(-3.8, 18.6), PY(0, 18.6), PX(-0.2, 18.6) - PX(-3.8, 18.6), 0.25 * EYE * F / (18.6 * 18.6) + 0.6);
    og.save();
    const tz = 16.2, tcx = PX(-2.0, tz), tcy = PY(0, tz);
    og.translate(tcx, tcy); og.scale(1, (EYE / tz) * 0.55);
    og.font = `800 ${0.9 * K(tz)}px "Zen Kaku Gothic New", sans-serif`; og.textAlign = 'center'; og.textBaseline = 'middle';
    og.fillStyle = 'rgba(225,220,205,0.5)'; og.fillText('止まれ', 0, 0);
    og.restore();
    // manhole
    const mz = 8.2, mx = PX(-1.4, mz), my = PY(0, mz);
    og.fillStyle = 'rgba(40,36,40,0.9)'; og.beginPath(); og.ellipse(mx, my, 0.32 * K(mz), 0.32 * EYE * F / (mz * mz), 0, 0, 7); og.fill();
    og.strokeStyle = 'rgba(80,74,70,0.7)'; og.lineWidth = 0.8; og.stroke();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(ov, 0, 0);
    this.baseXf(g);

    // ---- the elevated railway (Z=22): piers, plate girder, lattice parapet
    const kb = K(BRIDGE_Z);
    const deckB = PY(5.2, BRIDGE_Z), rail = PY(6.8, BRIDGE_Z), latTop = PY(8.1, BRIDGE_Z);
    this.bridgeY = { deckB, rail, latTop, ground: ygB };
    for (const s of [-1, 1]) {
      const x0 = PX(s * 4.5, BRIDGE_Z), x1 = PX(s * 5.4, BRIDGE_Z);
      const a = Math.min(x0, x1), b = Math.max(x0, x1);
      const pg = g.createLinearGradient(a, 0, b, 0);
      pg.addColorStop(0, '#26302c'); pg.addColorStop(0.5, '#33403a'); pg.addColorStop(1, '#1a211e');
      g.fillStyle = pg; g.fillRect(a, deckB, b - a, ygB - deckB);
      g.fillStyle = 'rgba(0,0,0,0.35)'; for (let y = deckB + 6; y < ygB; y += 7) g.fillRect(a + 2, y, b - a - 4, 0.8);
    }
    // under-bridge shadow on the road
    const sh = g.createLinearGradient(0, ygB - 6, 0, ygB + 30);
    sh.addColorStop(0, 'rgba(0,0,0,0.0)'); sh.addColorStop(0.3, 'rgba(0,0,0,0.35)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = sh; g.fillRect(-1500, ygB - 6, 3000, 36);
    // girder
    const gg = g.createLinearGradient(0, rail, 0, deckB);
    gg.addColorStop(0, '#2b3532'); gg.addColorStop(0.5, '#222b28'); gg.addColorStop(1, '#151b19');
    g.fillStyle = gg; g.fillRect(-1500, rail, 3000, deckB - rail);
    g.fillStyle = '#0f1312'; g.fillRect(-1500, deckB - 3, 3000, 3);
    for (let X = -50; X < 50; X += 1.25) { const x = PX(X, BRIDGE_Z); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x, rail + 2, 1.2, deckB - rail - 4); g.fillStyle = 'rgba(120,140,130,0.12)'; g.fillRect(x + 1.2, rail + 2, 0.8, deckB - rail - 4); }
    for (let X = -50; X < 50; X += 0.42) { const x = PX(X, BRIDGE_Z); g.fillStyle = 'rgba(140,150,140,0.25)'; g.fillRect(x, rail + 4, 1, 1); g.fillRect(x, deckB - 6, 1, 1); }
    // name plate + clearance sign
    g.fillStyle = '#d9d4c6'; g.fillRect(-58, rail + 10, 116, 22);
    g.fillStyle = '#1d1d1d'; g.font = '700 13px "Zen Kaku Gothic New", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('銀座架道橋', 0, rail + 21.5);
    g.fillStyle = '#f2f2f2'; g.beginPath(); g.arc(-90, rail + 26, 13, 0, 7); g.fill();
    g.strokeStyle = '#c4161c'; g.lineWidth = 3; g.stroke();
    g.fillStyle = '#1a3f9a'; g.font = '700 9px "Zen Kaku Gothic New", sans-serif'; g.fillText('3.8m', -90, rail + 27);
    // lattice parapet in front of the train
    g.strokeStyle = '#1f2826'; g.lineWidth = 2.2;
    g.beginPath(); g.moveTo(-1500, latTop); g.lineTo(1500, latTop); g.stroke();
    g.lineWidth = 1.4;
    for (let X = -60; X < 60; X += 1.1) {
      const x0 = PX(X, BRIDGE_Z), x1 = PX(X + 1.1, BRIDGE_Z);
      g.beginPath(); g.moveTo(x0, rail); g.lineTo(x1, latTop); g.moveTo(x0, latTop); g.lineTo(x1, rail); g.stroke();
    }
    g.lineWidth = 1; g.strokeStyle = '#2c3633';
    g.beginPath(); g.moveTo(-1500, rail - 1); g.lineTo(1500, rail - 1); g.stroke();
    // catenary masts (wires drawn live)
    this.mastY = PY(13.2, BRIDGE_Z);
    for (const X of [-8.5, 8.5, -30, 30]) {
      const x = PX(X, BRIDGE_Z);
      g.fillStyle = '#121615'; g.fillRect(x - 2.5, this.mastY, 5, latTop - this.mastY);
      g.fillRect(x - (X < 0 ? -2 : 26), this.mastY + 6, 26, 3);
    }

    // ---- facades, signs, props: far → near
    const items = [];
    this.segs.forEach((sg) => items.push({ z: (sg.z0 + sg.z1) / 2 + 0.001, zf: sg.z1, draw: () => this.paintSegment(g, sg) }));
    this.signs.forEach((sn) => items.push({ z: sn.z - 0.01, draw: () => this.paintSignBody(g, sn) }));
    this.lamps.forEach((lp) => items.push({ z: lp.z, draw: () => this.paintLampPost(g, lp) }));
    items.push({ z: BOOTH.Z, draw: () => this.paintBooth(g) });
    items.push({ z: this.vend.Z, draw: () => this.paintVend(g) });
    items.push({ z: this.lantern.Z, draw: () => this.paintLantern(g) });
    // sort far → near using a representative depth; segments use their far edge so their own signs land on top
    items.sort((a, b) => (b.zf || b.z) - (a.zf || a.z));
    items.forEach((it) => it.draw());
  }

  paintSegment(g, sg) {
    const r = rng(Math.floor(sg.z0 * 100) + (sg.s > 0 ? 7 : 3));
    const X = sg.s * FACADE_X;
    const p = (Y, Z) => [PX(X, Z), PY(Y, Z)];
    const [ax, ay] = p(0, sg.z0), [bx, by] = p(sg.h, sg.z0), [cx, cy] = p(sg.h, sg.z1), [dx, dy] = p(0, sg.z1);
    const gr = g.createLinearGradient(0, Math.min(by, cy), 0, Math.max(ay, dy));
    gr.addColorStop(0, mix(sg.col, '#000000', 0.45)); gr.addColorStop(0.75, sg.col); gr.addColorStop(1, mix(sg.col, '#5a3220', 0.35));
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.lineTo(cx, cy); g.lineTo(dx, dy); g.closePath(); g.fill();
    // exposed front wall if taller than the nearer neighbour
    const near = this.segs.find((o) => o.s === sg.s && Math.abs(o.z1 - sg.z0) < 0.01);
    if (near && near.h < sg.h) {
      const xa = PX(X, sg.z0), xb = PX(sg.s * (FACADE_X + 16), sg.z0);
      const ya = PY(sg.h, sg.z0), yb = PY(near.h, sg.z0);
      g.fillStyle = mix(sg.col, '#000000', 0.25);
      g.fillRect(Math.min(xa, xb), ya, Math.abs(xb - xa), yb - ya);
      for (let y = near.h + 1; y < sg.h - 1; y += 3.2) for (let k = 1; k < 6; k++) {
        if (r() < 0.25) { const wx = PX(sg.s * (FACADE_X + k * 2.4), sg.z0); g.fillStyle = rgba(r.pick(['#ffcf8a', '#d8f2e6']), 0.6); g.fillRect(Math.min(wx, wx + sg.s * 1.2 * K(sg.z0)), PY(y + 1.5, sg.z0), 1.2 * K(sg.z0), 1.4 * K(sg.z0)); }
      }
    }
    // windows (perspective slivers)
    sg.win.forEach((w) => {
      const z0 = w.z, z1 = w.z + 1.3;
      const q = [p(w.y, z0), p(w.y + 1.5, z0), p(w.y + 1.5, z1), p(w.y, z1)];
      g.fillStyle = w.lit ? rgba(w.col, 0.55 * w.a) : 'rgba(10,9,13,0.9)';
      g.beginPath(); q.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill();
    });
    // ground floor shopfront
    const sf = [p(0.1, sg.z0 + 0.3), p(2.7, sg.z0 + 0.3), p(2.7, sg.z1 - 0.3), p(0.1, sg.z1 - 0.3)];
    if (sg.shop === 'shutter') {
      g.fillStyle = '#3a3a3e';
      g.beginPath(); sf.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 0.6;
      for (let y = 0.2; y < 2.7; y += 0.12) { const [x0, y0] = p(y, sg.z0 + 0.3), [x1, y1] = p(y, sg.z1 - 0.3); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
    } else {
      g.fillStyle = rgba(sg.shopCol, sg.shop === 'noren' ? 0.35 : 0.5);
      g.beginPath(); sf.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill();
      if (sg.shop === 'noren') {
        g.fillStyle = 'rgba(20,24,50,0.85)';
        const n = [p(2.0, sg.z0 + 0.5), p(2.7, sg.z0 + 0.5), p(2.7, sg.z1 - 0.5), p(2.0, sg.z1 - 0.5)];
        g.beginPath(); n.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill();
      }
    }
    g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(...p(3.2, sg.z0)); g.lineTo(...p(3.2, sg.z1)); g.stroke();
    // roof clutter visible against the sky on low buildings
    if (sg.h < 10) {
      for (let k = 0; k < 2; k++) {
        const z = sg.z0 + (sg.z1 - sg.z0) * (0.3 + k * 0.4);
        const [x, y] = p(sg.h, z); const kk = K(z);
        g.strokeStyle = '#0b0a0f'; g.lineWidth = Math.max(1, 0.06 * kk);
        g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 2.4 * kk);
        for (let e = 0; e < 4; e++) { g.moveTo(x - (0.9 - e * 0.15) * kk, y - (1.2 + e * 0.35) * kk); g.lineTo(x + (0.9 - e * 0.15) * kk, y - (1.2 + e * 0.35) * kk); }
        g.stroke();
      }
      const z = sg.z0 + 0.8, [x, y] = p(sg.h, z), kk = K(z);
      g.fillStyle = '#0d0c12'; g.fillRect(x - 0.9 * kk * sg.s, y - 1.3 * kk, 0.9 * kk, 1.3 * kk);
    }
    // roof edge line catching the sodium
    g.strokeStyle = 'rgba(255,170,110,0.18)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(bx, by); g.lineTo(cx, cy); g.stroke();
  }

  signRect(sn) {
    const k = K(sn.z);
    const xo = PX(sn.s * FACADE_X, sn.z), xi = PX(sn.s * (FACADE_X - sn.w), sn.z);
    return { x0: Math.min(xo, xi), x1: Math.max(xo, xi), y0: PY(sn.y0 + sn.h, sn.z), y1: PY(sn.y0, sn.z), k };
  }

  paintSignBody(g, sn) {
    const R = this.signRect(sn);
    // bracket to the wall
    g.fillStyle = '#121014';
    g.fillRect(R.x0 - 1, R.y0 - 0.12 * R.k, R.x1 - R.x0 + 2, 0.12 * R.k);
    this.drawSignFace(g, sn, R, false);
  }

  drawSignFace(g, sn, R, lit, t = 0) {
    const w = R.x1 - R.x0, h = R.y1 - R.y0;
    const chars = [...sn.text];
    const n = chars.length;
    const pad = Math.min(w, h) * 0.08;
    let sz = Math.min(w * 0.7, (h - pad * 2) / (n * 1.06));
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (sn.style === 'box' || sn.style === 'chaser') {
      g.fillStyle = lit ? sn.a : mix(sn.a, '#000000', 0.72);
      g.fillRect(R.x0, R.y0, w, h);
      g.strokeStyle = '#0c0b0e'; g.lineWidth = Math.max(1, w * 0.05); g.strokeRect(R.x0, R.y0, w, h);
      g.fillStyle = lit ? sn.b : mix(sn.b, '#000000', 0.6);
      g.font = `700 ${sz}px "Zen Kaku Gothic New", sans-serif`;
      vtext(g, sn.text, (R.x0 + R.x1) / 2, R.y0 + (h - sz * n * 1.06) / 2, sz, 1.06);
      if (lit) { g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(R.x0, R.y0, w, h * 0.5); }
    } else if (sn.style === 'neon') {
      g.fillStyle = sn.a; g.fillRect(R.x0, R.y0, w, h);
      g.strokeStyle = '#2a2730'; g.lineWidth = 1; g.strokeRect(R.x0, R.y0, w, h);
      g.font = `800 ${sz}px "M PLUS Rounded 1c", sans-serif`;
      const y0 = R.y0 + (h - sz * n * 1.06) / 2;
      if (lit) {
        g.save(); g.shadowColor = sn.b; g.shadowBlur = sz * 0.5;
        g.fillStyle = sn.b; vtext(g, sn.text, (R.x0 + R.x1) / 2, y0, sz, 1.06); g.restore();
        g.fillStyle = mix(sn.b, '#ffffff', 0.65); g.font = `800 ${sz * 0.96}px "M PLUS Rounded 1c", sans-serif`;
        vtext(g, sn.text, (R.x0 + R.x1) / 2, y0 + sz * 0.02, sz, 1.06);
      } else {
        g.fillStyle = mix(sn.b, '#202020', 0.75); vtext(g, sn.text, (R.x0 + R.x1) / 2, y0, sz, 1.06);
      }
    } else if (sn.style === 'circle') {
      g.fillStyle = sn.a; g.fillRect(R.x0, R.y0, w, h);
      const cx = (R.x0 + R.x1) / 2, cy = (R.y0 + R.y1) / 2, rr = Math.min(w, h) * 0.4;
      g.fillStyle = lit ? sn.b : mix(sn.b, '#000000', 0.7);
      g.beginPath(); g.arc(cx, cy, rr, 0, 7); g.fill();
      g.fillStyle = lit ? '#1b2a4a' : '#0b0f18';
      g.font = `800 ${rr * 1.3}px "Shippori Mincho B1", serif`;
      g.fillText('質', cx, cy + rr * 0.05);
    }
  }

  paintLampPost(g, lp) {
    const X = lp.s * (CURB_X + 0.25), z = lp.z, k = K(z);
    const x = PX(X, z), yb = PY(0, z), yt = PY(6.6, z);
    g.fillStyle = '#121214'; g.fillRect(x - 0.07 * k, yt, 0.14 * k, yb - yt);
    const ax = PX(X - lp.s * 1.6, z);
    g.strokeStyle = '#121214'; g.lineWidth = 0.1 * k;
    g.beginPath(); g.moveTo(x, yt); g.quadraticCurveTo(x, yt - 0.4 * k, ax, yt - 0.35 * k); g.stroke();
    g.fillStyle = '#1c1b1f'; g.fillRect(ax - 0.35 * k, yt - 0.45 * k, 0.7 * k, 0.18 * k);
    lp.head = { x: ax, y: yt - 0.28 * k, k };
  }

  paintWire(g, w) {
    g.strokeStyle = 'rgba(8,8,10,0.9)';
    g.lineWidth = Math.max(0.6, 0.03 * K(w.z));
    g.beginPath();
    for (let i = 0; i <= 30; i++) {
      const X = -FACADE_X + (2 * FACADE_X * i) / 30;
      const sag = w.sag * (1 - Math.pow((i / 30) * 2 - 1, 2));
      const x = PX(X, w.z), y = PY(w.y - sag, w.z);
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.stroke();
  }

  paintBooth(g) {
    const b = BOOTH, k = K(b.Z);
    const x0 = PX(b.X0, b.Z), x1 = PX(b.X1, b.Z), yb = PY(0, b.Z), yt = PY(b.H, b.Z);
    // side panel receding (the booth is a box)
    const z2 = b.Z + 1;
    g.fillStyle = 'rgba(120,150,140,0.18)';
    g.beginPath(); g.moveTo(x1, yb); g.lineTo(x1, yt); g.lineTo(PX(b.X1, z2), PY(b.H, z2)); g.lineTo(PX(b.X1, z2), PY(0, z2)); g.closePath(); g.fill();
    // glass + frame
    g.fillStyle = 'rgba(190,230,215,0.12)'; g.fillRect(x0, yt, x1 - x0, yb - yt);
    g.strokeStyle = '#d8dcd6'; g.lineWidth = 0.05 * k; g.strokeRect(x0, yt, x1 - x0, yb - yt);
    g.fillStyle = '#c9cfc9'; g.fillRect(x0, yt, x1 - x0, 0.22 * k);
    g.fillStyle = '#2f7a4a'; g.font = `700 ${0.13 * k}px "Zen Kaku Gothic New", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('公衆電話', (x0 + x1) / 2, yt + 0.11 * k);
    // the green phone on its shelf
    const px = (x0 + x1) / 2, py = PY(1.25, b.Z);
    g.fillStyle = '#2a2a2a'; g.fillRect(x0 + 0.1 * k, PY(0.95, b.Z), x1 - x0 - 0.2 * k, 0.05 * k);
    g.fillStyle = '#2f8a52'; roundRect(g, px - 0.16 * k, py - 0.2 * k, 0.32 * k, 0.28 * k, 0.03 * k); g.fill();
    g.fillStyle = '#226a3e'; roundRect(g, px - 0.18 * k, py - 0.27 * k, 0.36 * k, 0.08 * k, 0.03 * k); g.fill();
    g.fillStyle = '#dfe8e0'; g.fillRect(px - 0.08 * k, py - 0.12 * k, 0.16 * k, 0.12 * k);
    // the phone book on a chain
    g.fillStyle = '#c9b16a'; g.fillRect(x0 + 0.12 * k, PY(0.9, b.Z), 0.22 * k, 0.12 * k);
    this.boothRect = { x0, x1, y0: yt, y1: yb, k };
  }

  paintVend(g) {
    const v = this.vend, k = K(v.Z);
    const x0 = PX(v.X0, v.Z), x1 = PX(v.X1, v.Z), yb = PY(0, v.Z), yt = PY(v.H, v.Z);
    g.fillStyle = '#d5d9dc'; g.fillRect(x0, yt, x1 - x0, yb - yt);
    g.fillStyle = '#1f3b8a'; g.fillRect(x0, yt, x1 - x0, 0.25 * k);
    this.vendRect = { x0, x1, y0: yt, y1: yb, k };
  }

  paintLantern(g) {
    const l = this.lantern, k = K(l.Z);
    const x = PX(l.X, l.Z), y = PY(l.Y, l.Z);
    g.strokeStyle = '#0d0c10'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y - l.r * k * 1.3); g.lineTo(x, PY(5.2, BRIDGE_Z)); g.stroke();
    this.lanternPos = { x, y, rx: l.r * k * 0.8, ry: l.r * k * 1.2, k };
    this.drawLantern(g, false);
  }

  drawLantern(g, lit) {
    const L = this.lanternPos;
    g.fillStyle = lit ? '#ff3a26' : '#4a1410';
    g.beginPath(); g.ellipse(L.x, L.y, L.rx, L.ry, 0, 0, 7); g.fill();
    g.strokeStyle = lit ? 'rgba(120,10,0,0.5)' : 'rgba(0,0,0,0.4)'; g.lineWidth = 0.6;
    for (let i = -3; i <= 3; i++) { g.beginPath(); g.ellipse(L.x, L.y + i * L.ry * 0.26, L.rx * Math.sqrt(1 - Math.pow(i * 0.26, 2)), 0.6, 0, 0, 7); g.stroke(); }
    g.fillStyle = '#111'; g.fillRect(L.x - L.rx * 0.6, L.y - L.ry - 1.5, L.rx * 1.2, 2.5); g.fillRect(L.x - L.rx * 0.6, L.y + L.ry - 1, L.rx * 1.2, 2.5);
    g.fillStyle = lit ? '#1a0a06' : '#140806';
    g.font = `700 ${L.ry * 0.55}px "Zen Kaku Gothic New", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    vtext(g, '焼鳥', L.x, L.y - L.ry * 0.62, L.ry * 0.55, 1.05);
  }

  // lit sprites (sign faces + halo) at base camera resolution
  buildSprites() {
    const kk = this.rs * this.s;
    this.sprites = this.signs.map((sn) => {
      const R = this.signRect(sn);
      const pad = Math.max(R.x1 - R.x0, 14) * 1.2;
      const w = (R.x1 - R.x0 + pad * 2) * kk, h = (R.y1 - R.y0 + pad * 2) * kk;
      const c = canvas(w, h), g = c.getContext('2d');
      g.setTransform(kk, 0, 0, kk, (pad - R.x0) * kk, (pad - R.y0) * kk);
      // halo
      g.save(); g.globalCompositeOperation = 'lighter';
      const hc = sn.style === 'box' || sn.style === 'chaser' ? sn.a : sn.b;
      const cx = (R.x0 + R.x1) / 2, cy = (R.y0 + R.y1) / 2;
      g.translate(cx, cy); g.scale(1, (R.y1 - R.y0 + pad) / (R.x1 - R.x0 + pad));
      const rr = (R.x1 - R.x0 + pad * 1.6) / 2;
      const hg = g.createRadialGradient(0, 0, 0, 0, 0, rr * 1.4);
      hg.addColorStop(0, rgba(hc, 0.32)); hg.addColorStop(0.5, rgba(hc, 0.12)); hg.addColorStop(1, rgba(hc, 0));
      g.fillStyle = hg; g.beginPath(); g.arc(0, 0, rr * 1.4, 0, 7); g.fill();
      g.restore();
      this.drawSignFace(g, sn, R, true);
      return { c, x: R.x0 - pad, y: R.y0 - pad, w: R.x1 - R.x0 + pad * 2, h: R.y1 - R.y0 + pad * 2, R, col: hc };
    });
    // reflection streak sprite (white; tinted by drawing with colour via a small cache)
    this.streaks = new Map();
  }

  streak(col) {
    let c = this.streaks.get(col);
    if (c) return c;
    c = canvas(32, 128);
    const g = c.getContext('2d');
    const [r, gg, b] = [parseInt(col.slice(1, 3), 16), parseInt(col.slice(3, 5), 16), parseInt(col.slice(5, 7), 16)];
    const grd = g.createLinearGradient(0, 0, 0, 128);
    grd.addColorStop(0, `rgba(${r},${gg},${b},0.9)`); grd.addColorStop(0.35, `rgba(${r},${gg},${b},0.45)`); grd.addColorStop(1, `rgba(${r},${gg},${b},0)`);
    g.fillStyle = grd;
    g.beginPath(); g.ellipse(16, 40, 14, 88, 0, 0, 7); g.fill();
    this.streaks.set(col, c);
    return c;
  }

  // ===================================================================== flicker
  intensity(sn, t) {
    const s = sn.seed;
    switch (sn.fl) {
      case 'dying': {
        // 「質」: goes out once every three seconds, for a stutter
        const ph = (t + s) % 3;
        if (ph < 0.06 || (ph > 0.11 && ph < 0.19)) return 0.05;
        return 0.95 + 0.05 * Math.sin(t * 90);
      }
      case 'sputter': {
        const n = Math.sin(t * 1.3 + s) * Math.sin(t * 0.37 + s * 2);
        if (n > 0.86) return Math.random() < 0.5 ? 0.15 : 1;
        return 0.93 + 0.07 * Math.sin(t * 120 + s);
      }
      case 'breathe': return 0.8 + 0.2 * Math.sin(t * 0.9 + s);
      default: return 0.94 + 0.06 * Math.sin(t * 100 + s);
    }
  }

  // ===================================================================== movers
  spawn(dt) {
    const r = Math.random;
    if (!this.train && this.mode !== 'tv' && (this.nextTrain -= dt) <= 0) {
      const dir = r() < 0.5 ? 1 : -1;
      this.train = { dir, X: -dir * 70, v: 13, cars: 10, sparkT: 2 + r() * 5 };
      this.trainSound(dir, (140 + 200) / 13 * 0.82);
      this.nextTrain = 48 + r() * 30;
    }
    if (!this.taxi && (this.nextTaxi -= dt) <= 0) {
      const near = r() < 0.6;
      const dir = near ? -1 : 1;
      const kind = r.call ? 'taxi' : 'taxi';
      this.taxi = { dir, Z: near ? 25.6 : 28.2, X: -dir * 16, v: 6.5 + r() * 2, kind, col: [['#e8a23a', '#f2efe6'], ['#2e6b4a', '#f0e7c8'], ['#1a1a1c', '#1a1a1c'], ['#c9c2a6', '#3a6b9a']][Math.floor(r() * 4)] };
      this.carSound(32 / this.taxi.v, -dir * 0.6, dir * 0.6, 0.5, near ? 0.6 : 0.45);
      this.nextTaxi = 14 + r() * 16;
    }
    if (!this.car && (this.nextCar -= dt) <= 0) {
      const toward = r() < 0.55;
      this.car = toward ? { toward, X: 1.9, Z: 31, v: 5.2, taxi: r() < 0.7 } : { toward, X: -1.9, Z: 2.4, v: 6, taxi: r() < 0.4 };
      this.carSound(28 / this.car.v, toward ? 0.1 : 0.6, toward ? 0.85 : -0.1, toward ? 0.85 : 0.15, 1);
      this.nextCar = 26 + r() * 22;
    }
    if (this.walkers.length < 3 && (this.nextWalker -= dt) <= 0) {
      const toward = r() < 0.5, side = r() < 0.5 ? -1 : 1;
      this.walkers.push({ side, toward, X: side * (4.7 + r() * 1.1), Z: toward ? 24 : 4.5, v: 1.15 + r() * 0.4, ph: r() * 6,
        umb: r() < 0.55 ? 'clear' : r.call ? ['#7a1f2b', '#1f2f5a', '#2a2a2a', '#5a4a2a'][Math.floor(r() * 4)] : null, coat: mix('#0c0b10', '#2a2026', r()), lastStep: 0 });
      this.nextWalker = 6 + r() * 9;
    }
    if (!this.passer && (this.nextPasser -= dt) <= 0) {
      const dir = r() < 0.5 ? 1 : -1;
      this.passer = { dir, X: -dir * 5.5, Z: 3.1, v: 1.9, ph: 0, umb: '#8e1b22', lastStep: 0 };
      this.nextPasser = 38 + r() * 30;
    }
  }

  update(dt) {
    const t = this.t;
    this.spawn(dt);
    if (this.train) {
      this.train.X += this.train.dir * this.train.v * dt;
      this.train.sparkT -= dt;
      if (this.train.sparkT < 0) { this.flash = 0.8 + Math.random() * 0.4; this.sparkX = this.train.X + this.train.dir * -20 * (1 + Math.floor(Math.random() * 3)); this.train.sparkT = 3 + Math.random() * 6; }
      const tail = this.train.X - this.train.dir * this.train.cars * 20;
      if ((this.train.dir > 0 && tail > 70) || (this.train.dir < 0 && tail < -70)) this.train = null;
    }
    if (this.taxi) { this.taxi.X += this.taxi.dir * this.taxi.v * dt; if (Math.abs(this.taxi.X) > 17) this.taxi = null; }
    if (this.car) {
      this.car.Z += (this.car.toward ? -1 : 1) * this.car.v * dt;
      if (this.car.toward && this.car.Z < 1.6) this.car = null;
      else if (!this.car.toward && this.car.Z > 34) this.car = null;
    }
    this.walkers.forEach((w) => {
      w.Z += (w.toward ? -1 : 1) * w.v * dt; w.ph += dt * w.v * 3.2;
      if (Math.floor(w.ph / Math.PI) !== w.lastStep) { w.lastStep = Math.floor(w.ph / Math.PI); if (w.Z < 14) this.step(0.05 * (6 / w.Z), (w.X * F / w.Z) / 500); }
    });
    this.walkers = this.walkers.filter((w) => w.Z > 2.6 && w.Z < 26);
    if (this.passer) {
      const p = this.passer; p.X += p.dir * p.v * dt; p.ph += dt * p.v * 3;
      if (Math.floor(p.ph / Math.PI) !== p.lastStep) { p.lastStep = Math.floor(p.ph / Math.PI); this.step(0.16, p.X / 4); }
      if (Math.abs(p.X) > 6) this.passer = null;
    }
    // steam from the manhole, smoke from the smoker
    if (Math.random() < dt * 6) this.steam.push({ X: this.vent.X + (Math.random() - 0.5) * 0.3, Y: 0.05, Z: this.vent.Z, a: 0.0, life: 0, vx: 0.25 + Math.random() * 0.2 });
    this.steam.forEach((s) => { s.life += dt; s.Y += dt * 0.5; s.X += dt * s.vx; });
    this.steam = this.steam.filter((s) => s.life < 4);
    if (Math.random() < dt * 1.4) this.smoke.push({ x: 0, y: 0, life: 0, vx: (Math.random() - 0.3) * 4, r: 2 });
    this.smoke.forEach((s) => { s.life += dt; s.y -= dt * 9; s.x += dt * s.vx; s.r += dt * 3; });
    this.smoke = this.smoke.filter((s) => s.life < 3.5);
    // rain
    const wind = 0.08;
    this.drops.forEach((d) => {
      d.y += dt * (0.9 + d.z * 1.3) * (this.reduced ? 0.4 : 1);
      d.x -= dt * wind * d.z;
      if (d.y > 1.05) Object.assign(d, this.newDrop(false));
    });
    if (Math.random() < dt * 40) this.splashes.push({ X: (Math.random() - 0.5) * 12, Z: 2.8 + Math.random() * 17, life: 0 });
    this.splashes.forEach((s) => { s.life += dt; });
    this.splashes = this.splashes.filter((s) => s.life < 0.35);
    this.flash = Math.max(0, this.flash - dt * 6);
    // audio: rain patter wobble, drips, neon buzz follows the nearest signs
    this.nextDrip -= dt;
    if (this.nextDrip < 0) { this.dripTick(); this.nextDrip = 0.15 + Math.random() * 0.7; }
    const near = this.intensity(this.signs[2], t);
    this.buzz.gain.setTargetAtTime(0.004 + 0.006 * near * (this.mode === 'tv' ? 0.4 : 1), this.ac.currentTime, 0.02);
    if (near < 0.2 && !this._sputtered) { this.sputterTick(0.03); this._sputtered = true; } else if (near > 0.5) this._sputtered = false;
  }

  // ===================================================================== drawing movers
  drawTrain(g, X, alpha = 1, glowOnly = false) {
    const T = this.train, Z = BRIDGE_Z, k = K(Z);
    const yRoof = PY(10.6, Z), yBot = PY(6.9, Z), yW0 = PY(9.4, Z), yW1 = PY(8.15, Z);
    g.save(); g.globalAlpha = alpha;
    for (let c = 0; c < T.cars; c++) {
      const front = X - T.dir * c * 20;
      const a = Math.min(front, front - T.dir * 19.5), b = Math.max(front, front - T.dir * 19.5);
      const x0 = PX(a, Z), x1 = PX(b, Z);
      if (x1 < -1300 || x0 > 1300) continue;
      if (!glowOnly) {
        const body = g.createLinearGradient(0, yRoof, 0, yBot);
        body.addColorStop(0, '#3e4a26'); body.addColorStop(0.15, '#6e8a34'); body.addColorStop(1, '#3f5222');
        g.fillStyle = body; g.fillRect(x0, yRoof, x1 - x0, yBot - yRoof);
        g.fillStyle = '#20251a'; g.fillRect(x0, yRoof - 0.18 * k, x1 - x0, 0.2 * k);
        if (c % 3 === 1) { // pantograph
          const px = (x0 + x1) / 2;
          g.strokeStyle = '#141614'; g.lineWidth = 1.2;
          g.beginPath(); g.moveTo(px - 0.8 * k, yRoof - 0.2 * k); g.lineTo(px, yRoof - 1.25 * k); g.lineTo(px + 0.8 * k, yRoof - 0.2 * k); g.moveTo(px - 0.6 * k, yRoof - 1.3 * k); g.lineTo(px + 0.6 * k, yRoof - 1.3 * k); g.stroke();
        }
      }
      // windows & doors, lit
      for (let i = 0; i < 9; i++) {
        const wx0 = PX(a + 0.6 + i * 2.1, Z), wx1 = PX(a + 0.6 + i * 2.1 + 1.45, Z);
        const door = i % 2 === 1;
        g.fillStyle = '#e2f6dc';
        g.fillRect(wx0, door ? yW0 - 0.1 * k : yW0, wx1 - wx0, (door ? yW1 + 0.6 * k : yW1) - yW0);
        if (!glowOnly && (i * 7 + c * 3) % 5 === 0) {
          g.fillStyle = 'rgba(30,36,30,0.85)';
          const hx = (wx0 + wx1) / 2;
          g.beginPath(); g.arc(hx, yW0 + 0.35 * k, 0.12 * k, 0, 7); g.fill();
          g.fillRect(hx - 0.2 * k, yW0 + 0.45 * k, 0.4 * k, yW1 - yW0);
        }
      }
    }
    g.restore();
  }

  drawCarSide(g, cr, X, alpha) {
    const Z = cr.Z, k = K(Z), yg = PY(0, Z);
    const L = 4.7, dir = cr.dir;
    const xf = PX(X + dir * L / 2, Z), xr = PX(X - dir * L / 2, Z);
    const a = Math.min(xf, xr), b = Math.max(xf, xr), w = b - a;
    const at = (f) => (dir > 0 ? a + w * f : b - w * f); // f from rear (0) to front (1)
    g.save(); g.globalAlpha = alpha;
    const [c1, c2] = cr.col;
    g.fillStyle = c1;
    g.beginPath(); g.moveTo(a, yg - 0.32 * k); g.lineTo(a, yg - 0.82 * k); g.lineTo(b, yg - 0.82 * k); g.lineTo(b, yg - 0.32 * k); g.closePath(); g.fill();
    g.fillStyle = c2;
    g.beginPath(); g.moveTo(at(0.22), yg - 0.82 * k); g.lineTo(at(0.3), yg - 1.38 * k); g.lineTo(at(0.68), yg - 1.38 * k); g.lineTo(at(0.78), yg - 0.82 * k); g.closePath(); g.fill();
    g.fillStyle = 'rgba(30,40,50,0.9)';
    g.beginPath(); g.moveTo(at(0.26), yg - 0.86 * k); g.lineTo(at(0.32), yg - 1.3 * k); g.lineTo(at(0.66), yg - 1.3 * k); g.lineTo(at(0.74), yg - 0.86 * k); g.closePath(); g.fill();
    // 空車 glowing low in the windscreen
    g.fillStyle = '#ff2a2a'; g.fillRect(at(0.7) - 0.12 * k, yg - 1.0 * k, 0.24 * k, 0.1 * k);
    // andon on the roof
    g.fillStyle = '#ffd36b'; g.fillRect(at(0.49) - 0.18 * k, yg - 1.58 * k, 0.36 * k, 0.2 * k);
    // fender mirror
    g.fillStyle = '#111'; g.fillRect(at(0.88), yg - 0.98 * k, 0.05 * k, 0.16 * k);
    g.fillStyle = '#0c0c0e'; [0.18, 0.82].forEach((f) => { g.beginPath(); g.arc(at(f), yg - 0.3 * k, 0.31 * k, 0, 7); g.fill(); });
    g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(a, yg - 0.5 * k, w, 0.04 * k);
    g.restore();
    return { head: [at(0.99), yg - 0.62 * k], tail: [at(0.01), yg - 0.66 * k], kuusha: [at(0.7), yg - 0.95 * k], andon: [at(0.49), yg - 1.48 * k], k };
  }

  drawCarEnd(g, cr, Z, alpha) {
    const k = K(Z), yg = PY(0, Z), x = PX(cr.X, Z);
    const hw = 0.85 * k;
    g.save(); g.globalAlpha = alpha;
    g.fillStyle = cr.taxi && cr.toward ? '#d89a38' : '#1a1a1e';
    g.fillRect(x - hw, yg - 0.85 * k, hw * 2, 0.55 * k);
    g.fillStyle = cr.taxi && cr.toward ? '#efe8d8' : '#18181b';
    g.beginPath(); g.moveTo(x - hw * 0.86, yg - 0.85 * k); g.lineTo(x - hw * 0.7, yg - 1.4 * k); g.lineTo(x + hw * 0.7, yg - 1.4 * k); g.lineTo(x + hw * 0.86, yg - 0.85 * k); g.closePath(); g.fill();
    g.fillStyle = 'rgba(20,28,36,0.92)';
    g.beginPath(); g.moveTo(x - hw * 0.78, yg - 0.9 * k); g.lineTo(x - hw * 0.66, yg - 1.33 * k); g.lineTo(x + hw * 0.66, yg - 1.33 * k); g.lineTo(x + hw * 0.78, yg - 0.9 * k); g.closePath(); g.fill();
    g.fillStyle = '#0a0a0c'; g.fillRect(x - hw, yg - 0.32 * k, hw * 2, 0.32 * k);
    const out = { k, x, yg, lights: [] };
    if (cr.toward) {
      g.fillStyle = '#26262a'; g.fillRect(x - hw * 0.4, yg - 0.7 * k, hw * 0.8, 0.22 * k);
      if (cr.taxi) {
        g.fillStyle = '#ff2626'; g.fillRect(x + hw * 0.25, yg - 1.02 * k, 0.26 * k, 0.1 * k);
        g.fillStyle = '#ffdc7a'; g.fillRect(x - 0.2 * k, yg - 1.62 * k, 0.4 * k, 0.22 * k);
        out.kuusha = [x + hw * 0.25 + 0.13 * k, yg - 0.97 * k];
        out.andon = [x, yg - 1.5 * k];
      }
      g.fillStyle = '#111'; [-1, 1].forEach((s) => g.fillRect(x + s * hw * 0.82 - 0.02 * k, yg - 1.0 * k, 0.04 * k, 0.15 * k));
      [-1, 1].forEach((s) => { [0.62, 0.42].forEach((f) => out.lights.push([x + s * hw * f, yg - 0.62 * k, '#fff4d8'])); });
      g.fillStyle = '#fff6e0'; out.lights.forEach(([lx, ly]) => g.fillRect(lx - 0.07 * k, ly - 0.05 * k, 0.14 * k, 0.1 * k));
    } else {
      [-1, 1].forEach((s) => out.lights.push([x + s * hw * 0.72, yg - 0.66 * k, '#ff2a1e']));
      g.fillStyle = '#ff3a26'; out.lights.forEach(([lx, ly]) => g.fillRect(lx - 0.16 * k, ly - 0.05 * k, 0.32 * k, 0.1 * k));
    }
    g.restore();
    return out;
  }

  drawPerson(g, X, Z, ph, opts, alpha) {
    const k = K(Z), yg = PY(0, Z), x = PX(X, Z);
    g.save(); g.globalAlpha = alpha;
    const col = opts.coat || '#0b0a0f';
    const stride = Math.sin(ph) * 0.16 * k;
    g.fillStyle = col;
    g.beginPath(); g.moveTo(x - 0.07 * k + stride, yg); g.lineTo(x - 0.04 * k, yg - 0.55 * k); g.lineTo(x + 0.02 * k, yg - 0.55 * k); g.lineTo(x - 0.02 * k + stride, yg); g.fill();
    g.beginPath(); g.moveTo(x + 0.02 * k - stride, yg); g.lineTo(x - 0.02 * k, yg - 0.55 * k); g.lineTo(x + 0.05 * k, yg - 0.55 * k); g.lineTo(x + 0.07 * k - stride, yg); g.fill();
    g.beginPath(); g.moveTo(x - 0.27 * k, yg - 0.48 * k); g.lineTo(x - 0.21 * k, yg - 1.42 * k); g.lineTo(x + 0.21 * k, yg - 1.42 * k); g.lineTo(x + 0.27 * k, yg - 0.48 * k); g.closePath(); g.fill();
    g.beginPath(); g.arc(x, yg - 1.55 * k, 0.11 * k, 0, 7); g.fill();
    if (opts.umb) {
      const ux = x + 0.08 * k, uy = yg - 1.98 * k, ur = 0.52 * k;
      g.strokeStyle = col; g.lineWidth = 0.025 * k; g.beginPath(); g.moveTo(ux, uy); g.lineTo(ux, yg - 1.15 * k); g.stroke();
      if (opts.umb === 'clear') {
        g.fillStyle = 'rgba(205,220,235,0.16)'; g.strokeStyle = 'rgba(230,240,255,0.5)'; g.lineWidth = 0.02 * k;
      } else { g.fillStyle = opts.umb; g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 0.02 * k; }
      g.beginPath(); g.ellipse(ux, uy + 0.2 * k, ur, ur * 0.62, 0, Math.PI, 0);
      for (let i = 0; i <= 6; i++) { const ex = ux + ur - (2 * ur * i) / 6; g.lineTo(ex, uy + 0.2 * k + (i % 2 ? 0.05 * k : 0)); }
      g.closePath(); g.fill(); g.stroke();
      if (opts.umb === 'clear') { g.fillStyle = 'rgba(255,120,190,0.18)'; g.beginPath(); g.ellipse(ux - ur * 0.35, uy - ur * 0.1, ur * 0.25, ur * 0.12, -0.5, 0, 7); g.fill(); }
    }
    g.restore();
  }

  // step-printed draw: hold at ~9 fps, smear between held frames, ghost the previous one
  stepped(t, fps, fn) {
    if (this.reduced) { fn(t, 1); return; }
    const st = Math.floor(t * fps) / fps;
    fn(st - 2 / fps, 0.12);
    for (let i = 0; i < 3; i++) fn(st - (1 / fps) * (1 - i / 3), 0.16);
    fn(st, 0.85);
  }

  // ===================================================================== frame
  frame(t, dt) {
    this.t += dt;
    t = this.t;
    if (this.camAnim) this.stepCam(dt);
    if (this.camAnim && this.mode === 'leaving') this.fade = Math.pow(clamp(this.camAnim.t / this.camAnim.dur, 0, 1), 2.2);
    else if (this.camAnim && this.fromShop) this.fade = 1 - clamp(this.camAnim.t / (this.camAnim.dur * 0.7), 0, 1);
    else if (!this.camAnim) { this.fromShop = false; if (this.mode !== 'leaving') this.fade = 0; }
    this.update(dt);
    const tvWatching = this.mode === 'tv';
    this.tv.frame(dt);

    const g = this.g, cw = this.cv.width, ch = this.cv.height;
    const { fx, fy, z } = this.cam;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    // gate weave, as if the frame sat a little loose in the projector
    const wv = this.reduced ? 0 : Math.floor(t * 12);
    const wx = this.reduced ? 0 : (Math.sin(wv * 12.9898) * 0.5) * this.rs, wy = this.reduced ? 0 : (Math.sin(wv * 78.233) * 0.5) * this.rs;
    const ex = this.rs * this.W / 2 * (1 - z) + this.rs * z * this.s * (0 - fx) + wx;
    const ey = this.rs * this.H / 2 * (1 - z) + this.rs * z * this.s * (500 - fy) + wy;
    g.fillStyle = '#060509'; g.fillRect(0, 0, cw, ch);
    g.setTransform(z, 0, 0, z, ex, ey);
    g.drawImage(this.L0, 0, 0);
    const k = this.rs * this.s * z;
    const ox = this.rs * (this.W / 2 - fx * this.s * z) + wx, oy = this.rs * (this.H / 2 - fy * this.s * z) + wy;
    g.setTransform(k, 0, 0, k, ox, oy);

    // ---- far live elements
    // clock hands (the real minute)
    const now = new Date();
    const C = this.clock;
    g.strokeStyle = '#2a251c'; g.lineCap = 'round';
    const ha = ((now.getHours() % 12) + now.getMinutes() / 60) * Math.PI / 6, ma = (now.getMinutes() + now.getSeconds() / 60) * Math.PI / 30;
    g.lineWidth = 2.4; g.beginPath(); g.moveTo(C.x, C.y); g.lineTo(C.x + Math.sin(ha) * 11, C.y - Math.cos(ha) * 11); g.stroke();
    g.lineWidth = 1.5; g.beginPath(); g.moveTo(C.x, C.y); g.lineTo(C.x + Math.sin(ma) * 17, C.y - Math.cos(ma) * 17); g.stroke();
    g.lineCap = 'butt';
    // HIKARI band (neon letters)
    const hb = this.hikariBand;
    g.save(); g.shadowColor = '#ff4040'; g.shadowBlur = 8;
    g.fillStyle = '#ff5a4a'; g.font = '700 16px "Zen Kaku Gothic New", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('ヒカリ電機　・　HIKARI', 0, (hb.y0 + hb.y1) / 2 + 1); g.restore();
    // the street screen itself
    const tv = TV_RECT;
    g.imageSmoothingEnabled = true;
    g.drawImage(this.tv.cv, tv.x0, tv.y0, tv.x1 - tv.x0, tv.y1 - tv.y0);
    // flat frontage signs
    this.flatSigns.forEach((fsn) => {
      g.fillStyle = fsn.bg; g.fillRect(fsn.x - fsn.w / 2, fsn.y, fsn.w, fsn.h);
      g.fillStyle = fsn.fg; g.font = `700 ${fsn.sz}px "Zen Kaku Gothic New", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      vtext(g, fsn.t, fsn.x, fsn.y + fsn.sz * 0.15, fsn.sz, 1.08);
    });
    // barber pole
    const P = this.pole;
    g.save(); g.beginPath(); g.rect(P.x - P.w / 2, P.y0, P.w, P.y1 - P.y0); g.clip();
    g.fillStyle = '#f2f2f2'; g.fillRect(P.x - P.w / 2, P.y0, P.w, P.y1 - P.y0);
    const off = (t * 14) % 12;
    for (let y = P.y0 - 24 + off; y < P.y1 + 12; y += 12) { g.fillStyle = '#d42020'; g.beginPath(); g.moveTo(P.x - P.w / 2, y); g.lineTo(P.x + P.w / 2, y - 6); g.lineTo(P.x + P.w / 2, y - 3); g.lineTo(P.x - P.w / 2, y + 3); g.fill(); g.fillStyle = '#2040b0'; g.beginPath(); g.moveTo(P.x - P.w / 2, y + 6); g.lineTo(P.x + P.w / 2, y); g.lineTo(P.x + P.w / 2, y + 2); g.lineTo(P.x - P.w / 2, y + 8); g.fill(); }
    g.restore();
    // the record shop: warm windows, door, fascia
    this.drawShopFront(g, t);
    // taxi on the cross street
    let taxiLights = null;
    if (this.taxi) {
      const tx = this.taxi;
      this.stepped(t, 9, (tt, a) => {
        const X = tx.X - tx.dir * tx.v * (t - tt);
        const L = this.drawCarSide(g, tx, X, a);
        if (a > 0.5) taxiLights = L;
      });
    }
    // far car (beyond the bridge)
    let carInfo = null;
    const drawCar = (far) => {
      if (!this.car) return;
      const cr = this.car;
      if ((cr.Z > BRIDGE_Z) !== far) return;
      this.stepped(t, 9, (tt, a) => {
        const Z = cr.Z + (cr.toward ? 1 : -1) * cr.v * (t - tt);
        if (Z < 1.7) return;
        const info = this.drawCarEnd(g, cr, Z, a);
        if (a > 0.5) carInfo = info;
      });
    };
    drawCar(true);
    // the train, behind the lattice
    let trainOn = 0;
    if (this.train) {
      const T = this.train;
      this.stepped(t, 10, (tt, a) => this.drawTrain(g, T.X - T.dir * T.v * (t - tt), a));
      // how much of it is in the street gap (for spill light)
      const head = T.X, tail = T.X - T.dir * T.cars * 20;
      const lo = Math.min(head, tail), hi = Math.max(head, tail);
      trainOn = clamp((Math.min(hi, 7) - Math.max(lo, -7)) / 14, 0, 1);
    }
    this.trainLight = lerp(this.trainLight, trainOn, Math.min(1, dt * 4));

    // ---- reflections (half-res buffer with ripple)
    this.drawReflections(t, k, ox, oy, taxiLights, carInfo);

    // ---- near static layer
    g.setTransform(z, 0, 0, z, ex, ey);
    g.drawImage(this.L1, 0, 0);
    g.setTransform(k, 0, 0, k, ox, oy);

    // ---- emissive
    g.globalCompositeOperation = 'lighter';
    this.sprites.forEach((sp, i) => {
      const sn = this.signs[i];
      const I = this.intensity(sn, t);
      g.globalAlpha = I;
      g.drawImage(sp.c, sp.x, sp.y, sp.w, sp.h);
    });
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    // pachinko chaser bulbs
    this.signs.forEach((sn, i) => {
      if (sn.style !== 'chaser') return;
      const R = this.sprites[i].R;
      const n = 12, step = (R.y1 - R.y0) / n;
      for (let j = 0; j <= n; j++) for (const side of [R.x0, R.x1]) {
        const on = (j + Math.floor(t * 10)) % 3 === 0;
        g.fillStyle = on ? '#fff3b0' : '#5a3a10';
        g.beginPath(); g.arc(side, R.y0 + j * step, Math.max(1, R.k * 0.045), 0, 7); g.fill();
      }
    });
    this.drawLantern(g, true);
    // lamp heads, booth, vending machine, TV halo, train spill
    g.globalCompositeOperation = 'lighter';
    this.lamps.forEach((lp) => { if (!lp.head) return; const r2 = lp.head.k * 2.2; g.drawImage(glow('#ff9a3c', 64), lp.head.x - r2, lp.head.y - r2, r2 * 2, r2 * 2); g.drawImage(glow('#ffe0b0', 32, 3), lp.head.x - r2 * 0.25, lp.head.y - r2 * 0.12, r2 * 0.5, r2 * 0.24); });
    const B = this.boothRect;
    if (B) { g.globalAlpha = 0.42; g.drawImage(glow('#cff5e6', 64, 1.6), B.x0 - B.k * 0.8, B.y0 - B.k * 0.6, (B.x1 - B.x0) + B.k * 1.6, (B.y1 - B.y0) + B.k * 1.0); g.globalAlpha = 1; }
    const V = this.vendRect;
    if (V) {
      g.fillStyle = 'rgba(235,245,255,0.75)'; g.fillRect(V.x0 + 1, V.y0 + 0.3 * V.k, V.x1 - V.x0 - 2, 0.7 * V.k);
      const cols = ['#ff4040', '#ffd040', '#40a0ff', '#40d080', '#ff8030'];
      for (let row = 0; row < 3; row++) for (let c = 0; c < 4; c++) { g.fillStyle = cols[(row * 4 + c) % 5]; g.fillRect(V.x0 + 2 + c * (V.x1 - V.x0 - 4) / 4, V.y0 + (0.36 + row * 0.2) * V.k, (V.x1 - V.x0 - 4) / 4 - 1, 0.12 * V.k); }
      g.drawImage(glow('#e8f4ff', 64, 1.8), V.x0 - V.k, V.y0 - V.k * 0.5, (V.x1 - V.x0) + V.k * 2, (V.y1 - V.y0) + V.k);
    }
    const Lp = this.lanternPos;
    if (Lp) g.drawImage(glow('#ff4020', 64), Lp.x - Lp.rx * 5, Lp.y - Lp.ry * 4, Lp.rx * 10, Lp.ry * 8);
    const m = this.tv.mood;
    const tvc = '#' + m.map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
    g.globalAlpha = 0.5; g.drawImage(glow(tvc, 64, 1.5), tv.x0 - 120, tv.y0 - 90, tv.x1 - tv.x0 + 240, tv.y1 - tv.y0 + 180); g.globalAlpha = 1;
    if (this.trainLight > 0.01) {
      const yb = this.bridgeY.ground;
      g.globalAlpha = this.trainLight * (0.55 + 0.45 * Math.abs(Math.sin(t * 23)));
      g.drawImage(glow('#cfeedd', 64, 1.4), -260, yb - 40, 520, 140);
      g.globalAlpha = 1;
    }
    if (taxiLights) {
      g.drawImage(glow('#fff1cf', 64, 2), taxiLights.head[0] - taxiLights.k * 1.5, taxiLights.head[1] - taxiLights.k * 0.8, taxiLights.k * 3, taxiLights.k * 1.6);
      g.drawImage(glow('#ff2020', 32, 2), taxiLights.kuusha[0] - taxiLights.k * 0.5, taxiLights.kuusha[1] - taxiLights.k * 0.3, taxiLights.k, taxiLights.k * 0.6);
      g.drawImage(glow('#ff3020', 32, 2), taxiLights.tail[0] - taxiLights.k * 0.4, taxiLights.tail[1] - taxiLights.k * 0.25, taxiLights.k * 0.8, taxiLights.k * 0.5);
    }
    g.globalCompositeOperation = 'source-over';

    // ---- near movers
    drawCar(false);
    if (carInfo) {
      g.globalCompositeOperation = 'lighter';
      carInfo.lights.forEach(([lx, ly, col]) => { const rr = carInfo.k * (this.car && this.car.toward ? 1.4 : 0.7); g.drawImage(glow(col, 64, 2), lx - rr, ly - rr, rr * 2, rr * 2); });
      if (carInfo.kuusha) g.drawImage(glow('#ff2020', 32, 2), carInfo.kuusha[0] - carInfo.k * 0.4, carInfo.kuusha[1] - carInfo.k * 0.25, carInfo.k * 0.8, carInfo.k * 0.5);
      if (carInfo.andon) g.drawImage(glow('#ffd36b', 32, 2), carInfo.andon[0] - carInfo.k * 0.5, carInfo.andon[1] - carInfo.k * 0.3, carInfo.k, carInfo.k * 0.6);
      g.globalCompositeOperation = 'source-over';
    }
    // the smoker under the bridge
    this.drawSmoker(g, t);
    // steam
    this.steam.forEach((s) => {
      const kk = K(s.Z), x = PX(s.X, s.Z), y = PY(s.Y, s.Z), a = Math.sin(Math.min(1, s.life / 4) * Math.PI) * 0.12;
      g.globalAlpha = a; g.drawImage(glow('#d8d0e0', 32, 1.5), x - kk * (0.3 + s.life * 0.25), y - kk * (0.3 + s.life * 0.25), kk * (0.6 + s.life * 0.5), kk * (0.6 + s.life * 0.5));
    });
    g.globalAlpha = 1;
    // walkers, far → near
    this.walkers.slice().sort((a, b) => b.Z - a.Z).forEach((w) => {
      this.stepped(t, 8, (tt, a) => {
        const Z = w.Z - (w.toward ? -1 : 1) * w.v * (t - tt);
        this.drawPerson(g, w.X, Z, w.ph - (t - tt) * w.v * 3.2, w, a);
      });
    });
    if (this.passer) {
      const p = this.passer;
      this.stepped(t, 7, (tt, a) => this.drawPerson(g, p.X - p.dir * p.v * (t - tt), p.Z, p.ph - (t - tt) * p.v * 3, { umb: p.umb, coat: '#050407' }, a * 0.95));
    }
    // overhead wires and catenary (fade when watching the screen)
    const wA = 1 - clamp((z - 1) / 1.5, 0, 1);
    if (wA > 0.02) {
      g.globalAlpha = wA; this.wires.forEach((w) => this.paintWire(g, w));
      g.globalAlpha = wA * 0.8; g.strokeStyle = '#0b0c0d'; g.lineWidth = 1;
      [PY(12.4, BRIDGE_Z), PY(11.8, BRIDGE_Z)].forEach((y) => { g.beginPath(); g.moveTo(-1500, y); g.lineTo(1500, y); g.stroke(); });
      g.globalAlpha = 1;
    }
    // splashes
    g.strokeStyle = 'rgba(200,210,230,0.35)'; g.lineWidth = 0.7;
    this.splashes.forEach((s) => {
      const kk = K(s.Z), x = PX(s.X, s.Z), y = PY(0, s.Z), rr = (0.04 + s.life * 0.4) * kk;
      g.globalAlpha = 1 - s.life / 0.35;
      g.beginPath(); g.ellipse(x, y, rr, rr * EYE / s.Z * 0.9 + 0.3, 0, 0, 7); g.stroke();
    });
    g.globalAlpha = 1;

    // ---- screen-space: rain, grade, grain, vignette
    g.setTransform(1, 0, 0, 1, 0, 0);
    this.drawRain(g, cw, ch);
    if (this.flash > 0) {
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = `rgba(170,200,255,${this.flash * 0.18})`; g.fillRect(0, 0, cw, ch);
      g.globalCompositeOperation = 'source-over';
    }
    // WKW grade: green-teal shadows, warm highlights
    g.globalCompositeOperation = 'soft-light';
    const gr = g.createLinearGradient(0, 0, 0, ch);
    gr.addColorStop(0, 'rgba(30,90,95,0.45)'); gr.addColorStop(0.6, 'rgba(60,70,40,0.25)'); gr.addColorStop(1, 'rgba(150,80,30,0.35)');
    g.fillStyle = gr; g.fillRect(0, 0, cw, ch);
    g.globalCompositeOperation = 'overlay';
    const gt = this.grain[((Math.floor(t * 24) % this.grain.length) + this.grain.length) % this.grain.length];
    g.globalAlpha = 0.16;
    const pat = gt && gt.width ? g.createPattern(gt, 'repeat') : null;
    const go = (Math.floor(t * 24) * 37) % 160;
    if (pat) { g.translate(-go, -go * 0.6); g.fillStyle = pat; g.fillRect(go, go * 0.6, cw, ch); }
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    g.drawImage(this.vig, 0, 0);
    if (this.fade > 0) { g.fillStyle = `rgba(6,4,6,${this.fade})`; g.fillRect(0, 0, cw, ch); }
    void tvWatching;
  }

  drawShopFront(g, t) {
    const S = SHOP, k = K(FRONT_Z);
    const w = S.x1 - S.x0;
    const fasc0 = S.y0, fasc1 = PY(3.4, FRONT_Z);
    g.fillStyle = '#f3ead6'; g.fillRect(S.x0, fasc0, w, fasc1 - fasc0);
    g.fillStyle = '#2a1a10'; g.font = `700 ${0.62 * k}px "Zen Kaku Gothic New", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('中古レコード　夜光堂', 0, (fasc0 + fasc1) / 2 + 0.5);
    // windows with sleeves on stands
    const wy0 = PY(2.8, FRONT_Z), wy1 = PY(0.4, FRONT_Z);
    const warm = g.createLinearGradient(0, wy0, 0, wy1);
    warm.addColorStop(0, '#ffcf8a'); warm.addColorStop(1, '#c8743a');
    g.fillStyle = warm;
    g.fillRect(S.x0 + 0.3 * k, wy0, 2.1 * k, wy1 - wy0);
    g.fillRect(S.x1 - 2.4 * k, wy0, 2.1 * k, wy1 - wy0);
    const cols = ['#e8b8cf', '#13253a', '#ffd84a', '#7c1d2b', '#3c6f86', '#f2c14e'];
    for (let i = 0; i < 3; i++) {
      g.fillStyle = cols[i]; g.fillRect(S.x0 + (0.45 + i * 0.66) * k, PY(1.6, FRONT_Z), 0.55 * k, 0.55 * k);
      g.fillStyle = cols[i + 3]; g.fillRect(S.x1 - (2.25 - i * 0.66) * k, PY(1.6, FRONT_Z), 0.55 * k, 0.55 * k);
    }
    // door
    const dx0 = -0.6 * k, dx1 = 0.6 * k, dy0 = PY(2.15, FRONT_Z), dy1 = PY(0, FRONT_Z);
    g.fillStyle = '#ffb868'; g.fillRect(dx0, dy0, dx1 - dx0, dy1 - dy0);
    g.strokeStyle = '#2a1a10'; g.lineWidth = 0.08 * k; g.strokeRect(dx0, dy0, dx1 - dx0, dy1 - dy0);
    g.fillStyle = '#2a1a10'; g.fillRect(dx0 + 0.15 * k, PY(1.2, FRONT_Z), 0.9 * k, 0.24 * k);
    g.fillStyle = '#f3ead6'; g.font = `700 ${0.15 * k}px "Zen Kaku Gothic New", sans-serif`; g.fillText('営業中', 0, PY(1.08, FRONT_Z));
    // A-frame sign on the pavement
    const ax = PX(2.4, 28.6), ay = PY(0.95, 28.6), ak = K(28.6);
    g.fillStyle = '#f7f0e0'; g.fillRect(ax - 0.28 * ak, ay, 0.56 * ak, 0.95 * ak);
    g.fillStyle = '#7a1d10'; g.font = `700 ${0.14 * ak}px "Zen Kaku Gothic New", sans-serif`;
    vtext(g, '買取', ax, ay + 0.08 * ak, 0.15 * ak, 1.1);
    // glow
    g.save(); g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.55 + 0.05 * Math.sin(t * 2);
    g.drawImage(glow('#ffae5a', 64, 1.6), S.x0 - w * 0.4, S.y0 - 30, w * 1.8, S.y1 - S.y0 + 70);
    g.restore();
    if (this.hover === 'shop') { g.strokeStyle = 'rgba(255,230,180,0.6)'; g.lineWidth = 1; g.strokeRect(S.x0 - 3, S.y0 - 3, w + 6, S.y1 - S.y0 + 6); }
  }

  drawSmoker(g, t) {
    const X = -5.8, Z = 21.0, k = K(Z), x = PX(X, Z), yg = PY(0, Z);
    g.fillStyle = '#07060a';
    g.beginPath(); g.moveTo(x - 0.3 * k, yg); g.lineTo(x - 0.24 * k, yg - 1.4 * k); g.lineTo(x + 0.22 * k, yg - 1.42 * k); g.lineTo(x + 0.3 * k, yg); g.fill();
    g.beginPath(); g.arc(x, yg - 1.56 * k, 0.12 * k, 0, 7); g.fill();
    g.beginPath(); g.ellipse(x, yg - 1.66 * k, 0.2 * k, 0.05 * k, 0, 0, 7); g.fill();
    const drag = Math.max(0, Math.sin(t * 0.7)) ** 8;
    const ex = x + 0.14 * k, ey = yg - 1.5 * k;
    g.globalCompositeOperation = 'lighter';
    g.drawImage(glow('#ff6a2a', 16, 1.5), ex - 3 - drag * 4, ey - 3 - drag * 4, 6 + drag * 8, 6 + drag * 8);
    g.globalCompositeOperation = 'source-over';
    this.smoke.forEach((s) => {
      g.globalAlpha = 0.1 * (1 - s.life / 3.5);
      g.drawImage(glow('#c8c0d0', 16, 1.5), ex + s.x - s.r, ey + s.y - s.r, s.r * 2, s.r * 2);
    });
    g.globalAlpha = 1;
  }

  drawReflections(t, k, ox, oy, taxiLights, carInfo) {
    const RB = this.RB, rg = RB.getContext('2d');
    rg.setTransform(1, 0, 0, 1, 0, 0);
    rg.clearRect(0, 0, RB.width, RB.height);
    rg.setTransform(k / 2, 0, 0, k / 2, ox / 2, oy / 2);
    rg.globalCompositeOperation = 'lighter';
    const refl = (x0, x1, yTop, yBot, yg, col, a, stretch = 2.4) => {
      // mirror (yTop..yBot) about yg, stretched down the wet road
      const h = (yBot - yTop) * stretch + (yg - yBot) * 2;
      const y = yg + (yg - yBot);
      rg.globalAlpha = a;
      const w = Math.max(2, x1 - x0);
      rg.drawImage(this.streak(col), x0 - w * 0.15, y, w * 1.3, Math.max(4, h));
    };
    this.sprites.forEach((sp, i) => {
      const sn = this.signs[i], R = sp.R;
      const yg = PY(0, sn.z);
      refl(R.x0, R.x1, R.y0, R.y1, yg, sp.col, 0.5 * this.intensity(sn, t));
    });
    this.lamps.forEach((lp) => { if (lp.head) refl(lp.head.x - lp.head.k * 0.5, lp.head.x + lp.head.k * 0.5, lp.head.y - 2, lp.head.y + 2, PY(0, lp.z), '#ff9a3c', 0.55, 3); });
    const tv = TV_RECT, m = this.tv.mood;
    const tvc = '#' + m.map((v) => clamp(Math.round(v * 1.4), 0, 255).toString(16).padStart(2, '0')).join('');
    refl(tv.x0, tv.x1, tv.y0, tv.y1, PY(0, FRONT_Z), tvc, 0.45, 0.7);
    refl(SHOP.x0, SHOP.x1, SHOP.y0, SHOP.y1, PY(0, FRONT_Z), '#ffae5a', 0.6, 1.2);
    if (this.boothRect) { const B = this.boothRect; refl(B.x0, B.x1, B.y0, B.y1, B.y1, '#cff5e6', 0.4, 1.0); }
    if (this.vendRect) { const V = this.vendRect; refl(V.x0, V.x1, V.y0, V.y1, V.y1, '#e8f4ff', 0.35, 1.0); }
    if (this.lanternPos) { const L = this.lanternPos; refl(L.x - L.rx, L.x + L.rx, L.y - L.ry, L.y + L.ry, PY(0, this.lantern.Z), '#ff3a20', 0.55, 1.5); }
    if (this.train) {
      const T = this.train;
      for (let c = 0; c < T.cars; c++) {
        const front = T.X - T.dir * c * 20, a = Math.min(front, front - T.dir * 19.5), b = Math.max(front, front - T.dir * 19.5);
        const x0 = PX(a, BRIDGE_Z), x1 = PX(b, BRIDGE_Z);
        if (x1 < -400 || x0 > 400) continue;
        for (let i = 0; i < 9; i += 2) {
          const wx0 = PX(a + 0.6 + i * 2.1, BRIDGE_Z), wx1 = PX(a + 2.05 + i * 2.1, BRIDGE_Z);
          refl(wx0, wx1, PY(9.4, BRIDGE_Z), PY(8.15, BRIDGE_Z), this.bridgeY.ground, '#d8f5e0', 0.4, 2.4);
        }
      }
    }
    if (taxiLights) {
      const kk = taxiLights.k, yg = taxiLights.head[1] + 0.62 * kk;
      refl(taxiLights.head[0] - kk * 0.3, taxiLights.head[0] + kk * 0.3, taxiLights.head[1] - 2, taxiLights.head[1] + 2, yg, '#fff1cf', 0.6, 3);
      refl(taxiLights.kuusha[0] - kk * 0.15, taxiLights.kuusha[0] + kk * 0.15, taxiLights.kuusha[1] - 2, taxiLights.kuusha[1] + 2, yg, '#ff3030', 0.6, 3);
    }
    if (carInfo) {
      carInfo.lights.forEach(([lx, ly, col]) => refl(lx - carInfo.k * 0.12, lx + carInfo.k * 0.12, ly - 1, ly + 1, carInfo.yg, col, 0.75, 6));
      if (carInfo.kuusha) refl(carInfo.kuusha[0] - carInfo.k * 0.12, carInfo.kuusha[0] + carInfo.k * 0.12, carInfo.kuusha[1] - 1, carInfo.kuusha[1] + 1, carInfo.yg, '#ff2a2a', 0.6, 5);
    }
    rg.globalAlpha = 1;
    rg.globalCompositeOperation = 'source-over';
    // soften: wet asphalt never gives a sharp mirror (cheap down/up-sample blur, wider than tall)
    const SB = this.SB || (this.SB = canvas(1, 1));
    const sw = Math.max(1, Math.round(RB.width / 6)), sh = Math.max(1, Math.round(RB.height / 3));
    if (SB.width !== sw || SB.height !== sh) { SB.width = sw; SB.height = sh; }
    const sg = SB.getContext('2d');
    sg.clearRect(0, 0, sw, sh);
    sg.imageSmoothingEnabled = true; sg.imageSmoothingQuality = 'high';
    sg.drawImage(RB, 0, 0, sw, sh);
    rg.setTransform(1, 0, 0, 1, 0, 0);
    rg.clearRect(0, 0, RB.width, RB.height);
    rg.imageSmoothingQuality = 'high';
    rg.drawImage(SB, 0, 0, RB.width, RB.height);
    rg.globalCompositeOperation = 'lighter'; rg.globalAlpha = 0.35;
    rg.drawImage(SB, 0, 0, RB.width, RB.height);
    rg.globalCompositeOperation = 'source-over';
    rg.globalAlpha = 1;
    // ripple the buffer onto the ground
    const g = this.g;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'lighter';
    const horizon = Math.max(0, Math.floor((VPY * k + oy) / 2));
    const H2 = RB.height, W2 = RB.width;
    let y = horizon;
    let i = 0;
    while (y < H2) {
      const depth = (y - horizon) / Math.max(1, H2 - horizon);
      const hh = 2;
      const amp = (0.3 + depth * 1.4) * (this.reduced ? 0.3 : 1);
      const dx = Math.sin(t * 1.3 + y * 0.045) * amp + Math.sin(t * 2.3 - y * 0.11) * amp * 0.35;
      g.globalAlpha = 0.9;
      g.drawImage(RB, 0, y, W2, hh, dx * 2, y * 2, W2 * 2, hh * 2);
      y += hh; i++;
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    g.setTransform(k, 0, 0, k, ox, oy);
  }

  drawRain(g, cw, ch) {
    const buckets = [[], [], []];
    this.drops.forEach((d) => buckets[d.z < 0.5 ? 0 : d.z < 0.8 ? 1 : 2].push(d));
    const alphas = [0.1, 0.16, 0.24];
    g.lineCap = 'round';
    buckets.forEach((b, i) => {
      g.strokeStyle = `rgba(205,215,235,${alphas[i]})`;
      g.lineWidth = (0.5 + i * 0.45) * this.rs;
      g.beginPath();
      b.forEach((d) => {
        const x = d.x * cw, y = d.y * ch, l = d.len * ch;
        g.moveTo(x, y); g.lineTo(x + l * 0.08, y - l);
      });
      g.stroke();
    });
    g.lineCap = 'butt';
  }

  // ===================================================================== camera
  animateCam(to, dur, done) {
    const from = { ...this.cam };
    this.camAnim = { from, to, t: 0, dur: this.reduced ? 0.01 : dur, done };
  }
  stepCam(dt) {
    const A = this.camAnim;
    A.t += dt;
    const p = easeInOut(A.t / A.dur);
    // zoom interpolates geometrically so the push feels even
    this.cam.z = A.from.z * Math.pow(A.to.z / A.from.z, p);
    this.cam.fx = lerp(A.from.fx, A.to.fx, p);
    this.cam.fy = lerp(A.from.fy, A.to.fy, p);
    if (A.t >= A.dur) { this.camAnim = null; if (A.done) A.done(); }
    this.layoutUI();
  }

  tvCam() {
    const tw = TV_RECT.x1 - TV_RECT.x0, th = TV_RECT.y1 - TV_RECT.y0;
    const capH = Math.min(150, this.H * 0.22);
    const z = Math.min((this.W * 0.94) / (tw * this.s), ((this.H - capH - 40) * 0.96) / (th * this.s));
    const cy = (TV_RECT.y0 + TV_RECT.y1) / 2 + (capH / 2) / (this.s * z);
    return { fx: 0, fy: cy, z: Math.max(1.2, z) };
  }

  watchTV() {
    if (this.mode !== 'street' || this.camAnim) return;
    this.mode = 'tv';
    this.hooks.onWatch(true);
    this.animateCam(this.tvCam(), 1.8, () => { this.tv.start(); });
    const t = this.ac.currentTime;
    this.tvLP.frequency.setTargetAtTime(11000, t, 0.5);
    this.tvGain.gain.setTargetAtTime(0.95, t, 0.5);
    this.amb.gain.setTargetAtTime(0.45, t, 0.6);
    this.leakGain.gain.setTargetAtTime(0.06, t, 0.6);
    this.layoutUI();
  }

  unwatch() {
    if (this.mode !== 'tv') return;
    this.mode = 'street';
    this.tv.stopShow();
    this.hooks.onWatch(false);
    this.animateCam({ fx: 0, fy: 500, z: 1 }, 1.4);
    const t = this.ac.currentTime;
    this.tvLP.frequency.setTargetAtTime(2200, t, 0.4);
    this.tvGain.gain.setTargetAtTime(0.32, t, 0.4);
    this.amb.gain.setTargetAtTime(1, t, 0.6);
    this.leakGain.gain.setTargetAtTime(0.26, t, 0.6);
  }

  enterShop() {
    if (this.mode !== 'street' || this.camAnim) return;
    this.mode = 'leaving';
    const t = this.ac.currentTime;
    this.leakLP.frequency.setTargetAtTime(3500, t, 0.5);
    this.leakGain.gain.setTargetAtTime(0.6, t, 0.5);
    this.fade = 0;
    const doorY = (PY(2.15, FRONT_Z) + PY(0, FRONT_Z)) / 2;
    this.animateCam({ fx: 0, fy: doorY, z: 7 }, 2.0, () => {
      this.hooks.enterShop();
    });
    this.fadeAnim = true;
  }

  // called by the world when you come back out
  returnFromShop() {
    this.mode = 'street';
    this.fade = 0;
    this.fadeAnim = false;
    const doorY = (PY(2.15, FRONT_Z) + PY(0, FRONT_Z)) / 2;
    this.cam = { fx: 0, fy: doorY, z: 5 };
    this.fromShop = true; this.fade = 1;
    this.animateCam({ fx: 0, fy: 500, z: 1 }, 2.2);
    const t = this.ac.currentTime;
    this.leakLP.frequency.setTargetAtTime(520, t, 0.3);
    this.leakGain.gain.setTargetAtTime(0.26, t, 0.6);
  }

  // ===================================================================== UI & input
  buildUI() {
    const mk = (id, jp, en, onClick) => {
      const b = el('button', 'sw-hot', this.ui);
      b.type = 'button';
      b.dataset.id = id;
      b.setAttribute('aria-label', `${jp} — ${en}`);
      const tag = el('span', 'sw-hot-tag', b, `<b>${jp}</b><i>${en}</i>`);
      void tag;
      b.addEventListener('click', (e) => { e.stopPropagation(); onClick(); }, { signal: this.ctx.signal });
      b.addEventListener('pointerenter', () => { this.hover = id; }, { signal: this.ctx.signal });
      b.addEventListener('pointerleave', () => { if (this.hover === id) this.hover = null; }, { signal: this.ctx.signal });
      b.addEventListener('focus', () => { this.hover = id; }, { signal: this.ctx.signal });
      b.addEventListener('blur', () => { if (this.hover === id) this.hover = null; }, { signal: this.ctx.signal });
      return b;
    };
    this.hot = {
      tv: mk('tv', '街頭ビジョン', 'The street screen — watch', () => this.watchTV()),
      shop: mk('shop', '中古レコード 夜光堂', 'Yakōdō Used Records — go in', () => this.enterShop()),
      phone: mk('phone', '公衆電話', 'The public phone box', () => this.hooks.openPhone()),
    };
    this.back = el('button', 'sw-back', this.root, '← <span class="jp">通りへ</span><span class="en">Back to the street</span>');
    this.back.type = 'button';
    this.back.addEventListener('click', (e) => { e.stopPropagation(); this.unwatch(); }, { signal: this.ctx.signal });
    if (isTouch()) this.ui.classList.add('touch');
    this.ui.classList.add('intro');
    this.ctx.timeout(() => this.ui.classList.remove('intro'), 7000);
  }

  layoutUI() {
    if (!this.hot) return;
    const place = (b, x0, y0, x1, y1) => {
      const [a, c] = this.toScreen(x0, y0), [d, e] = this.toScreen(x1, y1);
      b.style.transform = `translate(${a}px, ${c}px)`;
      b.style.width = Math.max(28, d - a) + 'px'; b.style.height = Math.max(28, e - c) + 'px';
      const cx = (a + d) / 2;
      b.classList.toggle('al', cx < 90); b.classList.toggle('ar', cx > this.W - 90);
    };
    place(this.hot.tv, TV_RECT.x0, TV_RECT.y0, TV_RECT.x1, TV_RECT.y1);
    place(this.hot.shop, SHOP.x0 - 10, SHOP.y0 - 8, SHOP.x1 + 10, SHOP.y1 + 4);
    const B = { x0: PX(BOOTH.X0, BOOTH.Z), x1: PX(BOOTH.X1, BOOTH.Z), y0: PY(BOOTH.H, BOOTH.Z), y1: PY(0, BOOTH.Z) };
    place(this.hot.phone, B.x0 - 6, B.y0 - 6, B.x1 + 6, B.y1);
    const showHot = this.mode === 'street' && !this.camAnim;
    this.ui.style.opacity = showHot ? '1' : '0';
    this.ui.style.pointerEvents = showHot ? '' : 'none';
    this.back.classList.toggle('on', this.mode === 'tv' && !this.camAnim);
  }

  bindInput() {
    const sig = { signal: this.ctx.signal };
    this.root.addEventListener('click', (e) => {
      if (this.mode === 'tv' && !this.camAnim) {
        const [x, y] = this.toDesign(e.clientX - this.root.getBoundingClientRect().left, e.clientY - this.root.getBoundingClientRect().top);
        if (x < TV_RECT.x0 || x > TV_RECT.x1 || y < TV_RECT.y0 || y > TV_RECT.y1) this.unwatch();
      }
    }, sig);
    window.addEventListener('keydown', (e) => {
      if (!this.visible) return;
      if (this.mode === 'tv' && (e.key === 'Backspace' || e.key === 'ArrowDown')) { e.preventDefault(); this.unwatch(); }
    }, sig);
  }

  setVisible(v) {
    this.visible = v;
    this.root.style.display = v ? '' : 'none';
    const t = this.ac.currentTime;
    this.bus.gain.setTargetAtTime(v ? 1 : 0, t, v ? 0.4 : 0.25);
  }

  dispose() {
    this.loops.forEach((l) => { try { l.stop(); } catch (e) {} });
    this.tv.dispose();
    try { this.bus.disconnect(); } catch (e) {}
  }
}
