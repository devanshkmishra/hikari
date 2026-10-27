// H01 夏ヶ原 (なつがはら) — the first world.
// You fall through the phosphor and land on an empty rural platform in late summer.
// Overcast white turns to dusk amber, then early blue. On the bench, a station notebook:
// strangers across forty years. The last page is blank and dated today. When you have written
// on it and closed it, the light is yours, the crossing starts to ring, and a one-car train comes.

import { G, makeCam, project, trackXAt, clamp, lerp, smooth } from './station/geom.js';
import { paintWorld } from './station/paint.js';
import { createGL, lightAt } from './station/gl.js';
import { createOverlay } from './station/overlay.js';
import { createSound } from './station/sound.js';
import { createVN } from './station/vn.js';
import { createNotebook } from './station/notebook.js';
import { STYLE } from './station/style.js';
import { INTRO, REVISIT, CHOICE, AFTER, WAITING, TRAIN, LOOK, AMBIENT, VEND, HOTSPOT_NAMES, TIMETABLE, NBLINE, LIGHT_LABEL, HOTSPOT_EN, TIMETABLE_EN } from './station/text.js';

const MARGIN = 26;

export default {
  id: 'station',
  mount(root, ctx) {
    const signal = ctx.signal;
    root.classList.add('st');
    const style = document.createElement('style');
    style.textContent = STYLE;
    root.appendChild(style);

    // a shared fine grain (also the paper's tooth in the notebook)
    {
      const n = document.createElement('canvas');
      n.width = n.height = 192;
      const x = n.getContext('2d');
      const img = x.createImageData(192, 192);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.random() * 255;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 6 + Math.random() * 20;
      }
      x.putImageData(img, 0, 0);
      root.style.setProperty('--st-noise', `url(${n.toDataURL()})`);
    }

    const el = (tag, cls, parent = root) => { const e = document.createElement(tag); if (cls) e.className = cls; parent.appendChild(e); return e; };
    const glCv = el('canvas', 'st-gl');
    const ovCv = el('canvas', 'st-ov');
    el('div', 'st-grain');
    el('div', 'st-vig');
    const tag = el('div', 'st-tag');
    const hint = el('div', 'st-hint');
    const lang = () => (ctx.lang === 'en' ? 'en' : 'ja');
    const waitBtn = el('button', 'st-waitbtn');
    waitBtn.type = 'button';
    const tt = el('div', 'st-tt');
    function langText() {
      const e = lang() === 'en';
      hint.innerHTML = e ? NBLINE.hint.en : `${NBLINE.hint.jp}<small>${NBLINE.hint.en}</small>`;
      waitBtn.innerHTML = e ? `<b></b><span>${CHOICE.wait.en}</span>` : `<b></b><span>${CHOICE.wait.jp}</span><small>${CHOICE.wait.en}</small>`;
      tt.innerHTML = timetableHTML();
      root.classList.toggle('mode-en', e);
    }
    langText();
    const veil = el('div', 'st-veil');
    el('i', '', veil);
    ctx.jp.attach(root);

    const first = !ctx.hasOrb();
    if (first) ctx.exitVisible(false);

    // ── engines ────────────────────────────────────────────
    let W = ctx.w, H = ctx.h;
    let cam = makeCam(W, H);
    let gl = null;
    try { gl = createGL(glCv); } catch (e) { console.error(e); gl = null; }
    const fallback = gl ? null : glCv.getContext('2d');
    const ov = createOverlay(ovCv);
    const snd = createSound(ctx);
    let nb = null;
    const vn = createVN(root, ctx, { onEN: (v) => nb && nb.setEN(v), lang });
    nb = createNotebook(root, ctx, snd, {
      benchPoint,
      getEN: () => vn.en,
      lang,
      setEN: (v) => vn.setEN(v),
      onWrite: () => snd.piano(),
      onClose: (r) => onNotebookClosed(r),
    });

    let layers = null;
    let scale = 1;
    let painting = false, paintAgain = false;
    async function repaint() {
      if (painting) { paintAgain = true; return; }
      painting = true;
      const w = W, h = H;
      const c = makeCam(w, h);
      const budget = 6.2e6;
      const s = Math.max(0.75, Math.min(ctx.dpr, 2, Math.sqrt(budget / ((w + 2 * MARGIN) * (h + 2 * MARGIN)))));
      try {
        await fontsReady();
        if (signal.aborted) return;
        const L = await paintWorld(c, { scale: s, margin: MARGIN, tick: () => new Promise((r) => setTimeout(r, 0)) });
        if (signal.aborted) return;
        layers = L; scale = s;
        if (gl) {
          gl.upload('uScene', L.scene); gl.upload('uFar', L.far); gl.upload('uAux', L.aux); gl.upload('uE1', L.e1); gl.upload('uE2', L.e2);
        }
      } catch (e) { console.error(e); }
      painting = false;
      if (paintAgain && !signal.aborted) { paintAgain = false; repaint(); }
    }
    function fontsReady() {
      if (!document.fonts || !document.fonts.load) return Promise.resolve();
      const want = ['700 40px "Zen Kaku Gothic New"', '400 40px "Zen Kaku Gothic New"', '600 40px "Noto Serif JP"', '700 40px "Noto Serif JP"', '700 40px "IBM Plex Mono"'];
      return Promise.race([
        Promise.all(want.map((f) => document.fonts.load(f, '夏ヶ原なつがはら駅ノート120ぎんざ'))),
        new Promise((r) => setTimeout(r, 1800)),
      ]).catch(() => {});
    }

    // ── state ──────────────────────────────────────────────
    let tod = first ? 0.03 : 0.26;
    let todCap = first ? 0.62 : 0.78;
    let todRate = 0.6 / 560;
    let todPush = null;              // { to, rate } while the train comes
    let mode = 'arrive';             // arrive · story · idle · notebook · train · leaving
    let awarded = ctx.hasOrb();
    let wind = 0.35, gust = 0, gustPhase = 0, gustT = 4, gustState = 0, gustAmp = 0;
    let mouse = { x: 0, y: 0, tx: 0, ty: 0, has: false, px: -1, py: -1 };
    let dim = 0, dimTarget = 0, white = 0;
    let glint = 0, glintTarget = 0;
    let hover = null;
    let ttOpen = false;
    const lights = { tube: 0, plat: 0, wA: 0, wB: 0, wC: 0 };
    const lit = { tube: false, plat: false, wA: false, wB: false, wC: false };
    const said = new Set();
    let chimeDone = false;
    let roulette = null;
    let cans = 0, vendBusy = false;
    const tr = { active: false, visible: false, z: 640, v: 15, phase: 'off', ringing: false, gate: 0, head: 0, doors: 0, interior: 1, t: 0, horn1: false, horn2: false, stopT: 0, offAt: 0, light: false, prevAxles: null };
    let frameN = 0;
    let lastT = 0;

    // ── frame ──────────────────────────────────────────────
    ctx.loop((t, dt) => {
      lastT = t;
      frameN++;
      // time of day
      if (todPush) {
        tod = Math.min(todPush.to, tod + todPush.rate * dt);
      } else if (tod < todCap) {
        tod = Math.min(todCap, tod + todRate * dt);
      }
      // wind: a slow breath plus gusts that roll across the rice
      gustT -= dt;
      if (gustT < 0 && gustState === 0) { gustState = 1; gustAmp = lerp(0.35, 0.75, Math.random()); gustT = lerp(1.6, 3.2, Math.random()); }
      else if (gustT < 0 && gustState === 1) { gustState = 2; gustT = lerp(2.5, 5, Math.random()); }
      else if (gustT < 0 && gustState === 2) { gustState = 0; gustT = lerp(6, 16, Math.random()); }
      const gTarget = gustState === 1 ? gustAmp : gustState === 2 ? gustAmp * 0.35 : 0;
      gust += (gTarget - gust) * (1 - Math.exp(-dt * (gustState === 1 ? 1.8 : 0.6)));
      wind = clamp(0.24 + 0.1 * Math.sin(t * 0.11) + 0.06 * Math.sin(t * 0.37 + 1.3) + gust - tod * 0.08, 0.05, 1);
      gustPhase += dt * (0.9 + wind * 2.6);
      // parallax camera (mouse) with a slow idle breath
      const breathX = Math.sin(t * 0.21) * 0.008, breathY = Math.sin(t * 0.17 + 1) * 0.004;
      const k = 1 - Math.exp(-dt * 2.2);
      mouse.x += (mouse.tx - mouse.x) * k; mouse.y += (mouse.ty - mouse.y) * k;
      cam.dx = mouse.x * 0.065 + breathX;
      cam.dy = -mouse.y * 0.035 + breathY;
      // lamps & windows, with a hesitant fluorescent start
      lampStep('tube', 0.5, dt, () => { snd.flicker(2, 0.25); ambientOnce('lamp', AMBIENT.lamp, 1.6); });
      lampStep('plat', 0.57, dt, () => snd.flicker(3, -0.1));
      lampStep('wA', 0.46, dt, () => ambientOnce('window', AMBIENT.window, 0.5));
      lampStep('wB', 0.6, dt);
      lampStep('wC', 0.71, dt);
      if (!chimeDone && tod > 0.4) {
        chimeDone = true;
        snd.townChime();
        ambientOnce('chime', AMBIENT.chime, 2.4);
      }
      const fh = snd.firstHigurashi;
      if (fh !== null && !said.has('higu') && ctx.audio.now() - fh > 2) ambientOnce('higu', AMBIENT.higurashi, 0);
      // the train
      if (tr.active) trainStep(dt, t);
      // notebook glint, dims
      glint += (glintTarget - glint) * (1 - Math.exp(-dt * 2));
      dim += (dimTarget - dim) * (1 - Math.exp(-dt * 3));
      // sound
      if (frameN % 3 === 0) {
        snd.set({ tod, wind, lamp: Math.max(lights.tube, lights.plat * 0.5), hidden: document.hidden, duck: nb.isOpen ? 1 : 0 });
        if (tr.active) trainSound();
      }
      vn.update(dt);
      // draw (less often while the notebook covers the scene)
      if (nb.isOpen && frameN % 3 !== 0) return;
      render(t, dt * (nb.isOpen ? 3 : 1));
    });
    ctx.interval(() => snd.tick(), 250);
    // focus or gloss pop-ups must never scroll the world itself
    root.addEventListener('scroll', () => { if (root.scrollLeft || root.scrollTop) { root.scrollLeft = 0; root.scrollTop = 0; } }, { signal });

    function lampStep(key, at, dt, onFirst) {
      const want = tod >= at;
      if (want && !lit[key]) { lit[key] = true; lights[key + 'T'] = 0; if (onFirst) onFirst(); }
      if (!want && lit[key]) { lit[key] = false; }
      if (lit[key]) {
        lights[key + 'T'] = (lights[key + 'T'] || 0) + dt;
        const ft = lights[key + 'T'];
        // flicker on: off/on twice, then hold
        const flick = key === 'tube' || key === 'plat';
        let v = 1;
        if (flick && ft < 1.6) v = (ft < 0.12 || (ft > 0.5 && ft < 0.58) || (ft > 0.9 && ft < 1.1)) ? 1 : ft < 1.1 ? 0.15 : 0.7 + 0.3 * (ft - 1.1) / 0.5;
        else if (!flick) v = Math.min(1, ft / 2.5);
        lights[key] = v;
      } else {
        lights[key] = Math.max(0, lights[key] - dt * 0.5);
      }
    }

    function render(t, dt) {
      const L = lightAt(tod);
      const ambLum = L.amb[0] * 0.3 + L.amb[1] * 0.55 + L.amb[2] * 0.15;
      const night = 0.28 + 0.72 * (1 - ambLum);
      const tv = 0.55 + 0.25 * Math.sin(t * 7.3) * Math.sin(t * 2.1) + 0.2 * Math.sin(t * 13.7);
      const tvHue = Math.sin(t * 0.37) > 0.6 ? [0.95, 0.75, 0.6] : [0.55, 0.7, 1.0];
      const U = {
        uScreen: [W, H], uTexSize: [W + 2 * MARGIN, H + 2 * MARGIN], uMargin: MARGIN,
        uPar: [cam.f * cam.dx / 2, -cam.f * cam.dy / 2], uParFar: [cam.f * cam.dx / 1600, -cam.f * cam.dy / 1600],
        uVP: [cam.vpX, cam.vpY], uF: cam.f, uT: t, uWind: wind, uGust: gustPhase,
        uShimmer: (1 - smooth(0.0, 0.5, tod)) * 0.95,
        uSkyTop: L.top, uSkyHor: L.hor, uCloudLit: L.cl, uCloudDark: L.cd, uFog: L.fog, uAmb: L.amb, uBand: L.band,
        uBandAmt: L.ba, uFarFog: L.ff, uSceneFog: L.sf, uSunX: cam.vpX - cam.f * 0.42, uCover: L.cover,
        uL0: [0.92 * night, 1.0 * night, 1.12 * night],
        uL1: [0.82 * night * lights.plat, 0.98 * night * lights.plat, 0.92 * night * lights.plat],
        uL2: [0.62 * night * lights.tube, 0.72 * night * lights.tube, 0.66 * night * lights.tube],
        uL3: [1.0 * lights.wA * night, 0.74 * lights.wA * night, 0.44 * lights.wA * night],
        uL4: [tvHue[0] * tv * lights.wB * night, tvHue[1] * tv * lights.wB * night, tvHue[2] * tv * lights.wB * night],
        uL5: [1.0 * lights.wC * night, 0.8 * lights.wC * night, 0.56 * lights.wC * night],
        uK0: [0.24, 0.42, 0.3], uK1: [0.85, 0.85, 0.85],
        uDim: dim, uWhite: white,
      };
      if (gl && layers) {
        const gs = Math.min(scale, 1.6);
        gl.size(Math.round(W * gs), Math.round(H * gs));
        gl.render(U);
      } else if (fallback && layers) {
        drawFallback(L);
      }
      ov.resize(W, H, Math.min(ctx.dpr, 1.75));
      ov.draw(cam, {
        t, dt, tod, amb: L.amb, wind,
        gate: tr.gate, ringing: tr.ringing,
        train: tr.visible ? tr : null,
        tube: lights.tube,
        roulette,
        glint: glint * (nb.isOpen ? 0 : 1),
        hover: hover && hover.ring ? hover.ring : null,
        gustKick: gust * 0.6,
        onFurin: (s) => snd.furin(s),
        onCrows: () => snd.crows(),
        onNest: () => {},
      });
    }
    function drawFallback(L) {
      const c = fallback;
      const s = scale;
      if (glCv.width !== Math.round(W * s)) { glCv.width = Math.round(W * s); glCv.height = Math.round(H * s); }
      c.setTransform(1, 0, 0, 1, 0, 0);
      const g = c.createLinearGradient(0, 0, 0, glCv.height * 0.55);
      g.addColorStop(0, `rgb(${L.top.map((v) => v * 255 | 0)})`); g.addColorStop(1, `rgb(${L.hor.map((v) => v * 255 | 0)})`);
      c.fillStyle = g; c.fillRect(0, 0, glCv.width, glCv.height);
      c.drawImage(layers.far, -MARGIN * s, -MARGIN * s);
      c.drawImage(layers.scene, -MARGIN * s, -MARGIN * s);
      c.globalCompositeOperation = 'multiply';
      c.fillStyle = `rgb(${L.amb.map((v) => Math.min(255, v * 255) | 0)})`;
      c.fillRect(0, 0, glCv.width, glCv.height);
      c.globalCompositeOperation = 'source-over';
    }

    // ── the train ──────────────────────────────────────────
    const AXLES = [2.0, 4.1, 17.2, 19.3];
    function startTrain() {
      if (tr.active) return;
      Object.assign(tr, { active: true, visible: false, z: 640, v: 15, phase: 'approach', ringing: false, gate: 0, head: 0, doors: 0, interior: 1, t: 0, horn1: false, horn2: false, stopT: 0, offAt: 0, light: false, prevAxles: null, near: false, doorsDone: false });
      snd.train.start();
      todPush = { to: Math.max(tod, 0.9), rate: Math.max(0.004, (0.9 - tod) / 46) };
    }
    function trainStep(dt, t) {
      tr.t += dt;
      const z0 = tr.z;
      if (tr.phase === 'approach') {
        const brakeFrom = 112, stop = G.stopZ;
        if (tr.z > brakeFrom) tr.v = 15;
        else {
          const a = (15 * 15) / (2 * (brakeFrom - stop));
          tr.v = Math.sqrt(Math.max(0, 2 * a * (tr.z - stop))) + 0.02;
          tr.braking = true;
        }
        tr.z -= tr.v * dt;
        if (!tr.horn1 && tr.t > 2.2) { tr.horn1 = true; snd.train.horn(tr.z, true); }
        if (!tr.ringing && tr.z < 480) { tr.ringing = true; snd.train.crossingOn(); }
        if (!tr.horn2 && tr.z < 215) { tr.horn2 = true; snd.train.horn(tr.z, true); }
        if (tr.ringing && !tr.offAt && tr.z + G.carLen < G.crossingZ - 4) tr.offAt = tr.t + 2.2;
        if (tr.offAt && tr.t > tr.offAt && tr.ringing) { tr.ringing = false; snd.train.crossingOff(); }
        if (tr.z < 352) { tr.visible = true; tr.light = true; }
        if (tr.z < 75) tr.near = true;
        if (tr.z <= stop + 0.01) { tr.z = stop; tr.v = 0; tr.phase = 'stopped'; tr.stopT = tr.t; tr.braking = false; snd.train.air(); }
      } else if (tr.phase === 'stopped') {
        if (!tr.doorsDone && tr.t - tr.stopT > 2.0) { tr.doorsDone = true; snd.train.doors(); announce(); }
        if (tr.doorsDone) tr.doors = Math.min(1, tr.doors + dt / 1.1);
      }
      // gates
      const gWant = tr.ringing && tr.t > 2.5 ? 1 : 0;
      tr.gate += (gWant - tr.gate) * Math.min(1, dt * (gWant ? 0.55 : 0.9));
      // headlight fades in as it comes around the trees
      tr.head = tr.visible ? Math.min(1, tr.head + dt * 0.8) : 0;
      // the rail joints, every 25 m
      const axles = AXLES.map((o) => tr.z + o);
      if (tr.prevAxles && tr.v > 0.3) {
        for (let i = 0; i < 4; i++) {
          const a0 = tr.prevAxles[i], a1 = axles[i];
          if (Math.floor((a0 - 12.5) / 25) !== Math.floor((a1 - 12.5) / 25)) {
            const jz = Math.floor((a0 - 12.5) / 25) * 25 + 12.5;
            const q = project(cam, trackXAt(jz), G.railY, Math.max(jz, 1));
            snd.train.clack(Math.hypot(trackXAt(jz) - G.eyeX, jz), clamp((q[0] / W) * 2 - 1, -0.9, 0.9) * 0.8, tr.v);
          }
        }
      }
      tr.prevAxles = axles;
      void z0; void t;
    }
    function trainSound() {
      const x = trackXAt(tr.z);
      const dist = Math.hypot(x - G.eyeX, tr.z);
      const q = project(cam, x, 1, Math.max(tr.z, 1));
      snd.train.update({ dist, pan: clamp((q[0] / W) * 2 - 1, -1, 1) * 0.8, v: tr.v, braking: !!tr.braking, throttle: tr.z > 112 ? 0.6 : 0 });
    }
    let voice = null;
    function announce() {
      if (ctx.muted || !('speechSynthesis' in window)) return;
      try {
        const vs = speechSynthesis.getVoices().filter((v) => /^ja/i.test(v.lang));
        if (!vs.length) return;
        const u = new SpeechSynthesisUtterance('ご乗車、ありがとうございます。この列車は、ひかり線、ぎんざ行きです。');
        u.voice = vs.find((v) => /kyoko|haruka|nanami|female/i.test(v.name)) || vs[0];
        u.lang = 'ja-JP'; u.rate = 0.92; u.pitch = 1.0; u.volume = 0.55;
        voice = u;
        setTimeout(() => { if (!signal.aborted && !ctx.muted) speechSynthesis.speak(u); }, 1400);
      } catch (e) {}
    }

    // ── story ──────────────────────────────────────────────
    const wait = (ms) => new Promise((r) => ctx.timeout(r, ms));

    async function begin() {
      await repaint();
      if (signal.aborted) return;
      render(lastT || performance.now() / 1000, 0.016);
      veil.classList.add('thin');
      await wait(250);
      veil.classList.add('off');
      await wait(2600);
      if (signal.aborted) return;
      mode = 'story';
      await vn.say(first ? INTRO : REVISIT);
      if (signal.aborted) return;
      glintTarget = awarded ? 0.4 : 1;
      menu();
    }

    async function menu() {
      mode = 'idle';
      if (tr.active) return;
      const opts = awarded ? [CHOICE.open, CHOICE.wait, CHOICE.stay] : [CHOICE.open, CHOICE.stay];
      const i = await vn.choose(opts);
      if (signal.aborted) return;
      const pick = opts[i];
      if (pick === CHOICE.open) openNotebook();
      else if (pick === CHOICE.wait) waitForTrain();
      else {
        vn.hideBox();
        hint.classList.add('on');
        ctx.timeout(() => hint.classList.remove('on'), 5200);
        if (awarded) waitBtn.classList.add('on');
      }
    }

    function openNotebook() {
      if (nb.isOpen || mode === 'train' || mode === 'leaving') return;
      vn.quiet();
      hint.classList.remove('on');
      setHover(null);
      mode = 'notebook';
      dimTarget = 0.28;
      waitBtn.classList.remove('on');
      nb.open(benchPoint());
    }

    async function onNotebookClosed({ wrote }) {
      dimTarget = 0;
      mode = 'idle';
      if (wrote && !awarded) {
        awarded = true;
        glint = 2.4; glintTarget = 0;
        await wait(700);
        ctx.award(LIGHT_LABEL);
        ctx.exitVisible(true);
        await wait(6400);
        if (signal.aborted) return;
        await vn.say(AFTER);
        if (signal.aborted) return;
        trainSequence();
        return;
      }
      if (wrote) vn.ambient(NBLINE.again);
      else if (!awarded) vn.ambient(NBLINE.empty);
      glintTarget = awarded ? 0 : 1;
      if (awarded) waitBtn.classList.add('on');
    }

    async function waitForTrain() {
      if (tr.active) return;
      waitBtn.classList.remove('on');
      hint.classList.remove('on');
      mode = 'train';
      await vn.say(WAITING);
      trainSequence();
    }

    async function trainSequence() {
      mode = 'train';
      waitBtn.classList.remove('on');
      glintTarget = 0;
      ctx.timeout(startTrain, 1200);
      const conds = {
        bell: () => tr.ringing,
        light: () => tr.light && tr.z < 340,
        near: () => tr.near,
        doors: () => tr.doors > 0.6,
      };
      await vn.say(TRAIN.map((l) => (l.id && conds[l.id] ? { ...l, waitFor: conds[l.id] } : l)));
      if (signal.aborted) return;
      await vn.choose([CHOICE.board]);
      if (signal.aborted) return;
      mode = 'leaving';
      snd.ui.step(false);
      ctx.timeout(() => snd.ui.step(true), 380);
      ctx.timeout(() => snd.ui.step(true), 760);
      ctx.timeout(() => ctx.leave(), 900);
    }

    function ambientOnce(key, line, delay = 0) {
      if (said.has(key)) return;
      if (mode !== 'idle' || nb.isOpen || vn.busy || ttOpen) return;
      said.add(key);
      ctx.timeout(() => { if (mode === 'idle' && !nb.isOpen && !vn.busy && !ttOpen) vn.ambient(line); }, delay * 1000);
    }

    // ── things to touch ────────────────────────────────────
    async function buyDrink() {
      if (vendBusy) return;
      vendBusy = true;
      const n = cans++;
      const win = n === 2;
      snd.ui.coin();
      await wait(1150);
      snd.ui.button();
      snd.ui.canDrop(0.45);
      const lines = VEND[Math.min(n, VEND.length - 1)];
      if (n < 4) {
        await wait(700);
        const dur = snd.ui.roulette(win);
        const final = win ? '7777' : ['7735', '7771', '1086', '7773'][n % 4];
        const t0 = performance.now();
        const spin = ctx.interval(() => {
          const el = (performance.now() - t0) / 1000;
          const settled = Math.floor(clamp((el - dur * 0.55) / (dur * 0.45)) * 4);
          let s = '';
          for (let k = 0; k < 4; k++) s += k < settled ? final[k] : String((Math.random() * 10) | 0);
          roulette = s;
        }, 60);
        ctx.timeout(() => { clearInterval(spin); roulette = final; if (win) snd.ui.canDrop(1.6); }, dur * 1000 + 80);
        ctx.timeout(() => { roulette = null; }, dur * 1000 + 3600);
      }
      await vn.say(lines.map((l) => ({ ...l })));
      vendBusy = false;
      if (mode === 'idle') vn.hideBox();
    }

    function openTimetable() {
      ttOpen = true;
      tt.classList.add('on');
      snd.ui.bookOpen();
      vn.ambient(LOOK.timetable[0], 9000);
    }
    function closeTimetable() {
      ttOpen = false;
      tt.classList.remove('on');
    }

    // ── hotspots ───────────────────────────────────────────
    function benchPoint() {
      const nbk = G.notebook;
      const q = project(cam, (nbk.x0 + nbk.x1) / 2, (nbk.y0 + nbk.y1) / 2, nbk.z);
      const r = root.getBoundingClientRect();
      return { x: r.left + q[0], y: r.top + q[1] };
    }
    function hotspots() {
      const P = (X, Y, Z) => project(cam, X, Y, Z);
      const box = (id, a, b, min = 44) => {
        let x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]), y0 = Math.min(a[1], b[1]), y1 = Math.max(a[1], b[1]);
        const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
        if (x1 - x0 < min) { x0 = cx - min / 2; x1 = cx + min / 2; }
        if (y1 - y0 < min) { y0 = cy - min / 2; y1 = cy + min / 2; }
        return { id, x0, x1, y0, y1, ring: { x: cx, y: cy, r: Math.max(x1 - x0, y1 - y0) * 0.6 } };
      };
      const nbk = G.notebook, v = G.vend, b = G.board, ck = G.clock, t = G.timetable, fr = G.furin, ns = G.nest;
      const list = [
        box('notebook', P(nbk.x0 - 0.12, nbk.y0 - 0.05, nbk.z), P(nbk.x1 + 0.12, nbk.y1 + 0.08, nbk.z), 52),
        box('furin', P(fr.x - 0.1, fr.y - 0.36, fr.z), P(fr.x + 0.1, fr.y, fr.z), 34),
        box('nest', P(ns.x - 0.16, ns.y - 0.1, G.shelter.z0), P(ns.x + 0.16, ns.y + 0.12, G.shelter.z0), 34),
        box('clock', P(ck.x - ck.r, ck.y - ck.r, ck.z), P(ck.x + ck.r, ck.y + ck.r, ck.z), 30),
        box('timetable', P(t.x0, t.y0, t.z), P(t.x1, t.y1, t.z), 36),
        box('vend', P(v.x0, 0.05, v.z0), P(v.x1, v.h, v.z0)),
        box('board', P(b.x0, b.y0, b.z), P(b.x1, b.y1, b.z)),
        box('bikes', P(4.1, -0.3, 6.2), P(6.6, 1.0, 6.2)),
        box('crossing', P(trackXAt(G.crossingZ) - 4, G.railY, G.crossingZ), P(trackXAt(G.crossingZ) + 4, G.railY + 3.4, G.crossingZ), 56),
      ];
      return list;
    }
    function wireHit(x, y) {
      // the wires over the line: near pole → the field pole
      const pl = G.pole;
      const a = [pl.x - 0.8, pl.top - 0.25, pl.z], b = [-16 - 0.67, G.fieldY + 10 - 0.25, 50];
      const span = Math.hypot(b[0] - a[0], b[2] - a[2]);
      let best = 1e9;
      let prev = null;
      for (let i = 0; i <= 24; i++) {
        const u = i / 24;
        const X = lerp(a[0], b[0], u), Z = lerp(a[2], b[2], u), Y = lerp(a[1], b[1], u) - span * 0.016 * 4 * u * (1 - u);
        const q = project(cam, X, Y, Z);
        if (prev) {
          const dx = q[0] - prev[0], dy = q[1] - prev[1];
          const tt2 = clamp(((x - prev[0]) * dx + (y - prev[1]) * dy) / (dx * dx + dy * dy || 1));
          best = Math.min(best, Math.hypot(x - prev[0] - dx * tt2, y - prev[1] - dy * tt2));
        }
        prev = q;
      }
      return best < 14;
    }
    function fieldHit(x, y) {
      if (y < cam.vpY + 4) return false;
      // left of the track's outer verge
      const zAt = cam.f * (cam.ey - G.fieldY) / Math.max(1, y - cam.vpY);
      const X = cam.ex + (x - cam.vpX) * zAt / cam.f;
      return X < trackXAt(zAt) - 3.2 && zAt < 400;
    }
    function pick(x, y) {
      for (const h of hotspots()) if (x >= h.x0 && x <= h.x1 && y >= h.y0 && y <= h.y1) {
        if (h.id === 'bikes' && (x > W || h.x0 > W - 10)) continue;
        return h;
      }
      if (wireHit(x, y)) return { id: 'wires', ring: null };
      if (fieldHit(x, y)) return { id: 'fields', ring: null };
      return null;
    }
    function setHover(h, x, y) {
      const was = hover && hover.id;
      hover = h;
      root.classList.toggle('hot', !!h);
      if (h) {
        tag.textContent = (lang() === 'en' ? HOTSPOT_EN[h.id] : HOTSPOT_NAMES[h.id]) || '';
        const tx = clamp(x + 16, 8, W - 140), ty = clamp(y - 34, 8, H - 40);
        tag.style.transform = `translate(${tx}px, ${ty}px)`;
        tag.classList.add('on');
        if (was !== h.id && h.id === 'notebook') snd.ui.hover();
      } else tag.classList.remove('on');
    }
    const canTouch = () => (mode === 'idle') && !nb.isOpen && !ttOpen && !vn.choosing && !vn.logOpen && !(vn.busy);

    function act(id) {
      setHover(null);
      if (id === 'notebook') return openNotebook();
      if (id === 'vend') return buyDrink();
      if (id === 'timetable') return openTimetable();
      if (id === 'furin') { ov.kickFurin(1.2); snd.furin(0.9); }
      const line = LOOK[id];
      if (line) vn.ambient(line[0]);
    }

    // ── input ──────────────────────────────────────────────
    let downAt = null;
    root.addEventListener('pointermove', (e) => {
      const r = root.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      if (e.pointerType === 'mouse') {
        mouse.tx = clamp((x / W) * 2 - 1, -1, 1);
        mouse.ty = clamp((y / H) * 2 - 1, -1, 1);
      }
      if (canTouch() && e.pointerType === 'mouse') setHover(pick(x, y), x, y);
      else if (hover) setHover(null);
    }, { signal });
    root.addEventListener('pointerleave', () => { mouse.tx = 0; mouse.ty = 0; setHover(null); }, { signal });
    root.addEventListener('pointerdown', (e) => { downAt = { x: e.clientX, y: e.clientY }; }, { signal });
    root.addEventListener('click', (e) => {
      if (e.button !== 0) return;
      if (nb.isOpen || e.target.closest('.st-nb, .st-vn, .st-choices, .st-log, button')) return;
      if (ttOpen) { closeTimetable(); return; }
      if (downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 10) return;
      const r = root.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      if (canTouch()) {
        const h = pick(x, y);
        if (h) { act(h.id); return; }
      }
      if (vn.advance()) return;
      if (mode === 'idle' && !vn.busy) { hint.classList.remove('on'); }
    }, { signal });
    root.addEventListener('contextmenu', (e) => {
      if (e.target.closest('textarea')) return;
      e.preventDefault();
      if (!nb.isOpen) vn.toggleHidden();
    }, { signal });
    root.addEventListener('wheel', (e) => {
      if (nb.isOpen || vn.logOpen || ttOpen) return;
      if (e.deltaY < -8) vn.openLog();
      else if (e.deltaY > 8) vn.advance();
    }, { signal, passive: true });
    waitBtn.addEventListener('click', (e) => { e.stopPropagation(); vn.quiet(); waitForTrain(); }, { signal });
    tt.addEventListener('click', (e) => { e.stopPropagation(); closeTimetable(); }, { signal });

    addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (nb.isOpen) { e.stopPropagation(); e.preventDefault(); nb.close(); }
      else if (ttOpen) { e.stopPropagation(); e.preventDefault(); closeTimetable(); }
      else if (vn.logOpen) { e.stopPropagation(); e.preventDefault(); vn.closeLog(); }
    }, { signal, capture: true });
    addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT' || e.target.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (nb.isOpen) return;
      if (ttOpen) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); closeTimetable(); } return; }
      const key = e.key.toLowerCase();
      if (key === ' ' || key === 'enter') {
        e.preventDefault();
        if (vn.choosing) { const b = vn.choicesEl.querySelector('.st-choice:focus'); if (b) b.click(); return; }
        if (!vn.advance() && mode === 'idle' && !vn.busy && !tr.active) { hint.classList.remove('on'); waitBtn.classList.remove('on'); menu(); }
      } else if (key === 'a') vn.toggleAuto();
      else if (key === 'l') { if (vn.logOpen) vn.closeLog(); else vn.openLog(); }
      else if (key === 'h') vn.toggleHidden();
      else if (key >= '1' && key <= '3') vn.pickChoice(+key - 1);
      else if ((key === 'arrowdown' || key === 'arrowup' || key === 'tab') && vn.choosing) {
        const bs = [...vn.choicesEl.querySelectorAll('.st-choice')];
        if (!bs.length) return;
        e.preventDefault();
        const i = bs.indexOf(document.activeElement);
        const n = key === 'arrowup' ? (i <= 0 ? bs.length - 1 : i - 1) : (i + 1) % bs.length;
        bs[n].focus();
      }
    }, { signal });

    // resize: repaint the world for the new frame
    let rsT = 0;
    function resize(w, h) {
      W = w || ctx.w; H = h || ctx.h;
      const c = makeCam(W, H);
      c.dx = cam.dx; c.dy = cam.dy;
      cam = c;
      nb.relayout();
      clearTimeout(rsT);
      rsT = setTimeout(() => { if (!signal.aborted) repaint(); }, 220);
    }

    // a quiet handle for testing (like the shell's room)
    root.__dbg = {
      get tod() { return tod; },
      setTod(v) { tod = v; todCap = Math.max(todCap, v); },
      train: () => { mode = 'idle'; vn.quiet(); trainSequence(); },
      notebook: () => openNotebook(),
      get tr() { return tr; },
    };

    ctx.onLang(() => { langText(); vn.syncLang(); nb.syncLang(); if (hover) setHover(null); });
    nb.syncLang();

    begin();

    function timetableHTML() {
      const T = TIMETABLE;
      const rows = (list) => list.map(([hh, mm, mark]) => {
        if (mark === 'fix') return `<div class="tt-row"><span class="hh">${hh}</span><span class="mm"><span class="old">38</span><span class="new">${mm}</span></span></div>`;
        return `<div class="tt-row"><span class="hh">${hh}</span><span class="mm">${mm}</span>${mark ? `<span class="mark">${mark}</span>` : ''}</div>`;
      }).join('');
      return `<div class="tt-board" lang="ja">
        <div class="tt-head"><b>${T.title}</b><span>${T.line}</span></div>
        <div class="tt-cols">
          <div class="tt-col"><h4>上り　${T.up.dir}</h4>${rows(T.up.times)}</div>
          <div class="tt-col"><h4>下り　<span class="rubbed"></span>${T.down.dir}</h4>${rows(T.down.times)}</div>
        </div>
        <div class="tt-notes">${T.notes.map((n, i) => `<div>${n}${lang() === 'en' ? `<em>${TIMETABLE_EN.notes[i]}</em>` : ''}</div>`).join('')}</div>
        <div class="tt-sticker">${T.sticker}${lang() === 'en' ? `<em>${TIMETABLE_EN.sticker}</em>` : ''}</div>
        ${lang() === 'en' ? `<div class="tt-en">${TIMETABLE_EN.title} · left: ${TIMETABLE_EN.up} · right: ${TIMETABLE_EN.down}</div>` : ''}
      </div>`;
    }

    return {
      resize,
      destroy() {
        clearTimeout(rsT);
        try { snd.destroy(); } catch (e) {}
        try { if (gl) gl.destroy(); } catch (e) {}
        try { if (voice && 'speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) {}
      },
    };
  },
};
