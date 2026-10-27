// Act I — your room, late October, a little after one in the morning.
// A HIKARI CT-1486 sits on a low stand with a VCR and an RF modulator.
// Turn it on, turn the dial, and let it choose a channel for you.
import { CRTGL } from './crt-gl.js';

let shownCard = false;
let lastChannel = 1;

const CSS = `
.rm { position:absolute; inset:0; background:#050508; overflow:hidden; cursor:default; }
.rm-world { position:absolute; left:0; top:0; width:100%; height:100%; transform-origin:0 0; will-change:transform; }
.rm-bg { position:absolute; inset:0; width:100%; height:100%; }
.rm-tv { position:absolute; border-radius:2.2% / 3%; cursor:pointer; touch-action:none; }
.rm-dial { position:absolute; border-radius:50%; cursor:grab; touch-action:none; filter:brightness(var(--lit,.4)); }
.rm-dial:active { cursor:grabbing; }
.rm-dial .knob { position:absolute; inset:14%; border-radius:50%;
  background: radial-gradient(circle at 38% 30%, #f4f2ec 0, #c9c6be 38%, #8f8c85 75%, #6e6b65 100%);
  box-shadow: 0 3px 6px rgba(0,0,0,.6), inset 0 -3px 5px rgba(0,0,0,.35), inset 0 2px 3px rgba(255,255,255,.6); }
.rm-dial .grip { position:absolute; inset:14%; border-radius:50%;
  background: repeating-conic-gradient(from 0deg, rgba(0,0,0,.16) 0 4deg, rgba(255,255,255,.05) 4deg 8deg);
  -webkit-mask: radial-gradient(circle, transparent 0 58%, #000 60%); mask: radial-gradient(circle, transparent 0 58%, #000 60%); }
.rm-dial .ptr { position:absolute; left:50%; top:16%; width:4px; height:26%; margin-left:-2px; border-radius:2px; background:#d13b2a; box-shadow:0 0 2px rgba(0,0,0,.5); }
.rm-dial .rot { position:absolute; inset:0; transition: transform .18s cubic-bezier(.3,1.6,.5,1); }
.rm-dial .nums { position:absolute; inset:0; }
.rm-dial .nums span { position:absolute; left:50%; top:50%; font: 700 9px/1 'Zen Kaku Gothic New', sans-serif; color:#2a2a2e; width:14px; margin:-5px 0 0 -7px; text-align:center; }
.rm-dial .nums span.on { color:#c4321f; }
.rm-power { position:absolute; border-radius:4px; cursor:pointer; border:0; padding:0;
  background: linear-gradient(#d9d6cf, #a9a69f); box-shadow: 0 2px 0 #6f6c66, 0 3px 5px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.7);
  filter:brightness(var(--lit,.4)); font: 700 8px/1 'Zen Kaku Gothic New', sans-serif; color:#3a3a40; letter-spacing:.1em; }
.rm-power:active { transform: translateY(2px); box-shadow: 0 0 0 #6f6c66, 0 1px 2px rgba(0,0,0,.5); }
.rm-led { position:absolute; width:6px; height:6px; border-radius:50%; background:#ff2a14; box-shadow:0 0 6px 2px rgba(255,40,20,.7), 0 0 18px 6px rgba(255,40,20,.25); }
.rm-led.on { background:#5dff7a; box-shadow:0 0 6px 2px rgba(80,255,120,.6), 0 0 16px 5px rgba(80,255,120,.2); }
.rm-led.blink { animation: rm-blink 1.6s ease-in-out infinite; }
@keyframes rm-blink { 0%,100% { opacity:1 } 50% { opacity:.35 } }
.rm-nixie { position:absolute; display:flex; gap:3%; align-items:flex-end; cursor:pointer; padding:4px 6px 6px; border-radius:4px;
  background: linear-gradient(#1b1714, #0d0b0a); box-shadow: 0 6px 10px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.08); }
.rm-nixie .tube { position:relative; flex:1; height:100%; border-radius:40% 40% 8% 8% / 18% 18% 4% 4%;
  background: linear-gradient(90deg, rgba(255,255,255,.07), rgba(255,255,255,.02) 30%, rgba(255,255,255,.0) 60%, rgba(255,255,255,.06)), rgba(30,20,14,.6);
  box-shadow: inset 0 0 0 1px rgba(255,220,180,.12); display:grid; place-items:center; overflow:hidden; }
.rm-nixie .tube::before { content: attr(data-ghost); position:absolute; font: 400 1em/1 'IBM Plex Mono', monospace; color: rgba(255,160,80,.08); }
.rm-nixie .d { position:relative; font: 400 1em/1 'IBM Plex Mono', monospace; color:#ffb35c;
  text-shadow: 0 0 2px #ff8a2a, 0 0 6px #ff6a00, 0 0 14px rgba(255,90,0,.8), 0 0 28px rgba(255,80,0,.4); }
.rm-nixie .tube.dot { flex:.45; }
.rm-cap { position:absolute; left:50%; bottom:5.5%; transform:translateX(-50%); text-align:center; pointer-events:none; width:min(92vw,720px);
  transition: opacity 1.2s ease; opacity:0; text-shadow: 0 2px 12px rgba(0,0,0,.9); }
.rm-cap.on { opacity:1; }
.rm-cap .jp { font-family:'Noto Serif JP', serif; font-size:clamp(14px,1.5vw,17px); letter-spacing:.35em; color:#efe6d2; padding-left:.35em; }
.rm-cap .en { margin-top:6px; font-family:'EB Garamond', serif; font-style:italic; font-size:clamp(13px,1.3vw,15px); color:rgba(239,230,210,.55); }
.rm-cap kbd { font-family:'IBM Plex Mono', monospace; font-size:.85em; border:1px solid rgba(239,230,210,.3); border-radius:3px; padding:0 4px; font-style:normal; }
.rm-eva { position:absolute; inset:0; background:#000; z-index:5; display:grid; place-items:center; transition: opacity 1s ease; }
.rm-eva .card { animation: rm-eva-in .5s steps(1) .55s both; }
@keyframes rm-eva-in { from { opacity:0 } to { opacity:1 } }
.rm-eva.gone { opacity:0; pointer-events:none; }
.rm-eva .card { position:relative; width:min(86vw, 900px); aspect-ratio: 16/9; color:#f5f1e8; font-family:'Noto Serif JP', serif; font-weight:900; }
.rm-eva .ep { position:absolute; left:4%; top:6%; font-family:'Shippori Mincho B1', serif; font-weight:800; font-size:clamp(13px,1.8vw,20px); letter-spacing:.06em; transform:scaleX(.82); transform-origin:left; }
.rm-eva .big { position:absolute; left:4%; top:18%; font-size:clamp(46px,9.5vw,118px); line-height:.98; transform:scaleX(.78); transform-origin:left; letter-spacing:-.02em; }
.rm-eva .big .sm { font-size:.55em; vertical-align: .55em; }
.rm-eva .sub { position:absolute; right:4%; bottom:10%; font-family:'Shippori Mincho B1', serif; font-weight:800; font-size:clamp(14px,2.4vw,30px); letter-spacing:.02em; transform:scaleX(.8); transform-origin:right; text-align:right; }
.rm-eva .no { position:absolute; left:4%; bottom:10%; font-family:'Shippori Mincho B1', serif; font-weight:800; font-size:clamp(26px,5vw,60px); transform:scaleX(.8); transform-origin:left; }
.rm-hand { position:absolute; pointer-events:none; font-size:28px; opacity:0; transition:opacity .4s; filter: drop-shadow(0 0 6px rgba(160,200,255,.6)); }
`;

export default {
  id: 'room',
  mount(root, ctx) {
    const { audio } = ctx;
    const ac = audio.ac;
    const after = !!ctx.afterEnding;
    const raining = !!ctx.endingReady && !after;

    root.classList.add('rm');
    const style = document.createElement('style');
    style.textContent = CSS;
    root.appendChild(style);

    const world = el('div', 'rm-world', root);
    const bg = el('canvas', 'rm-bg', world);
    const g = bg.getContext('2d');
    const tvCanvas = el('canvas', 'rm-tv', world);
    const dial = el('div', 'rm-dial', world);
    dial.innerHTML = '<div class="nums"></div><div class="rot"><div class="grip"></div><div class="knob"></div><div class="ptr"></div></div>';
    const nums = dial.querySelector('.nums');
    for (let i = 1; i <= 12; i++) {
      const s = document.createElement('span');
      s.textContent = i;
      nums.appendChild(s);
    }
    const power = el('button', 'rm-power', world);
    power.setAttribute('aria-label', '電源 power');
    power.textContent = '電源';
    const led = el('div', 'rm-led blink', world);
    const nixie = el('div', 'rm-nixie', world);
    nixie.title = '世界線変動率 — click for the time';
    const cap = el('div', 'rm-cap', root);

    // the picture source: 640×480, NTSC
    const src = document.createElement('canvas');
    src.width = 640;
    src.height = 480;
    const sg = src.getContext('2d');
    const crt = new CRTGL(tvCanvas, src);
    const avgC = document.createElement('canvas');
    avgC.width = 8;
    avgC.height = 6;
    const ag = avgC.getContext('2d', { willReadFrequently: true });

    // ── layout ──
    let L = {};
    let albedo = null;
    const layout = () => {
      const W = ctx.w, H = ctx.h, dpr = ctx.dpr;
      const portrait = H > W * 1.1;
      const sh = portrait ? W * 0.62 * 0.75 : Math.min(H * 0.34, W * 0.36 * 0.75);
      const sw = sh * 4 / 3;
      const padL = sw * 0.075, padT = sh * 0.1, padB = sh * 0.16, panelW = sw * 0.32;
      const cabW = padL + sw + panelW, cabH = padT + sh + padB;
      const floorY = portrait ? H * 0.74 : H * 0.8;
      const standH = sh * (portrait ? 0.5 : 0.56);
      const standTop = floorY - standH;
      const cabX = W / 2 - cabW / 2 + panelW * 0.12;
      const cabY = standTop - cabH;
      L = {
        W, H, dpr, portrait, sw, sh, padL, padT, padB, panelW, cabW, cabH, floorY, standH, standTop, cabX, cabY,
        sx: cabX + padL, sy: cabY + padT,
        panelX: cabX + padL + sw, stand: { x: cabX - sw * 0.2, w: cabW + sw * 0.4 },
        win: portrait
          ? { x: W * 0.18, y: H * 0.07, w: W * 0.64, h: Math.max(80, cabY - H * 0.07 - H * 0.07) }
          : { x: W * 0.06, y: H * 0.13, w: Math.min(W * 0.2, cabX - W * 0.12), h: H * 0.38 },
      };
      bg.width = Math.round(W * dpr);
      bg.height = Math.round(H * dpr);
      place(tvCanvas, L.sx, L.sy, sw, sh);
      crt.resize(sw, sh, dpr);
      const dr = panelW * 0.62;
      L.dial = { x: L.panelX + panelW / 2, y: L.sy + sh * 0.26, r: dr / 2 };
      place(dial, L.dial.x - dr / 2, L.dial.y - dr / 2, dr, dr);
      const ns = nums.children;
      for (let i = 0; i < 12; i++) {
        const a = (i * 30 - 165) * Math.PI / 180;
        const rr = dr * 0.47;
        ns[i].style.transform = `translate(${Math.cos(a) * rr}px, ${Math.sin(a) * rr}px)`;
        ns[i].style.fontSize = Math.max(7, dr * 0.085) + 'px';
      }
      const pw = panelW * 0.38, ph = sh * 0.075;
      L.power = { x: L.panelX + panelW / 2 - pw / 2, y: L.cabY + cabH - padB * 0.5 - ph * 1.1, w: pw, h: ph };
      place(power, L.power.x, L.power.y, pw, ph);
      power.style.fontSize = Math.max(7, ph * 0.42) + 'px';
      place(led, L.power.x + pw + panelW * 0.08, L.power.y + ph / 2 - 3, 6, 6);
      const nw = Math.min(cabW * 0.42, 190), nh = nw * 0.36;
      place(nixie, cabX + cabW - nw - panelW * 0.1, cabY - nh, nw, nh);
      nixie.style.fontSize = nh * 0.62 + 'px';
      albedo = paintAlbedo(L, raining, after);
    };

    // ── state ──
    let on = false;
    let ch = lastChannel;
    let rot = (ch - 1) * 30;
    let prog = null;            // running programme sound handle
    let switching = 0;          // seconds of snow burst remaining
    let tunedAt = 0;            // ac time the current channel was tuned
    let visited = new Set();
    let poweredAt = 0;
    let beckoning = false;
    let diving = false;
    let autoTurned = false;
    let taps = 0;
    let tvColor = [0, 0, 0];
    let tvLevel = 0;
    let B = null;

    // ── audio graph: programmes → TV speaker → room ──
    const tvBus = ac.createGain();
    const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 170;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5200; lp.Q.value = 0.8;
    const pk = ac.createBiquadFilter(); pk.type = 'peaking'; pk.frequency.value = 1900; pk.gain.value = 4; pk.Q.value = 1.2;
    const tvVol = ac.createGain(); tvVol.gain.value = 0;
    tvBus.connect(hp).connect(lp).connect(pk).connect(tvVol);
    tvVol.connect(ctx.out);
    const tvWet = ac.createGain(); tvWet.gain.value = 0.18;
    tvVol.connect(tvWet).connect(ctx.send);
    const snowBus = ac.createGain(); snowBus.gain.value = 0;
    snowBus.connect(tvBus);

    // room tone
    const roomBus = ac.createGain(); roomBus.gain.value = 0.9;
    roomBus.connect(ctx.out);
    const roomWet = ac.createGain(); roomWet.gain.value = 0.35;
    roomBus.connect(roomWet).connect(ctx.send);
    startRoomTone(ctx, roomBus, raining, after);

    // flyback whine (15.734 kHz — the sound only some people can hear)
    let whine = null;

    // ── programmes ──
    const fallback = makeFallbackBroadcasts();
    const applyLang = () => {
      power.textContent = ctx.en ? 'POWER' : '電源';
      try { B && B.setLang && B.setLang(ctx.lang); } catch (e) {}
      if (lastSay && cap.classList.contains('on')) {
        const [j, e] = lastSay;
        cap.innerHTML = ctx.en && e
          ? `<div class="jp" style="font-family:'EB Garamond',serif;letter-spacing:.06em;font-size:clamp(16px,1.7vw,20px)">${e.charAt(0).toUpperCase() + e.slice(1)}</div>`
          : `<div class="jp">${j}</div>${e ? `<div class="en">${e}</div>` : ''}`;
      }
    };
    ctx.onLang(applyLang);
    import('./broadcasts.js').then((m) => { B = m; applyLang(); try { m.prewarm && m.prewarm({ g: sg, audio }); } catch (e) {} }).catch(() => { B = fallback; });
    const getB = () => B || fallback;
    let snowSnd = null;

    const tune = (n, { silent = false } = {}) => {
      n = ((n - 1 + 12) % 12) + 1;
      if (n === ch && prog) return;
      ch = n;
      lastChannel = n;
      rot = (n - 1) * 30;
      dial.querySelector('.rot').style.transform = `rotate(${rot}deg)`;
      [...nums.children].forEach((s, i) => s.classList.toggle('on', i === n - 1));
      if (!silent) clunk(audio, ctx.out);
      if (!on) return;
      if (prog) { try { prog.stop(); } catch (e) {} prog = null; }
      switching = 0.28;
      tunedAt = audio.now();
      visited.add(n);
      const P = getB().PROGRAMS[n];
      if (P) {
        ctx.timeout(() => {
          if (ch !== n || !on) return;
          try { prog = P.start(audio, tvBus); } catch (e) { console.error(e); }
        }, 280);
      }
      if (n === 12) say('夏ヶ原駅、ライブカメラ。', 'a live camera at an empty station. touch the screen to go in.');
      else if (on && !beckoning) hintDial();
    };

    // ── interactions ──
    const powerOn = () => {
      if (on || diving) return;
      on = true;
      poweredAt = audio.now();
      led.classList.remove('blink');
      led.classList.add('on');
      degauss(audio, ctx.out);
      whine = flyback(audio, ctx.out);
      const t = audio.now();
      tvVol.gain.setTargetAtTime(0.9, t + 0.5, 0.3);
      const S = getB();
      snowSnd = S.snowSound(audio, snowBus);
      crt.state.power = 0.001;
      const t0 = performance.now();
      const anim = () => {
        const k = Math.min(1, (performance.now() - t0) / 1300);
        crt.state.power = k;
        if (k < 1 && !ctx.signal.aborted) requestAnimationFrame(anim);
      };
      requestAnimationFrame(anim);
      prog = null;
      const startCh = after ? 12 : ch;
      ctx.timeout(() => tune(startCh, { silent: true }), 700);
      ch = 0;
      ctx.timeout(hintDial, 2400);
    };

    const powerOff = () => {
      if (!on || diving) return;
      on = false;
      led.classList.remove('on');
      if (prog) { try { prog.stop(); } catch (e) {} prog = null; }
      if (snowSnd) { snowSnd.stop(); snowSnd = null; }
      if (whine) { whine.stop(); whine = null; }
      tvVol.gain.setTargetAtTime(0, audio.now(), 0.05);
      zap(audio, ctx.out);
      const t0 = performance.now();
      const anim = () => {
        const k = Math.min(1, (performance.now() - t0) / 450);
        crt.state.power = 1 - k;
        if (k < 1 && !ctx.signal.aborted) requestAnimationFrame(anim);
      };
      requestAnimationFrame(anim);
      beckoning = false;
      say('もう一度、電源を。', 'turn it on again.');
    };

    power.addEventListener('click', (e) => { e.stopPropagation(); on ? powerOff() : powerOn(); }, { signal: ctx.signal });

    // dial: drag, wheel, keys
    let drag = null;
    dial.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      dial.setPointerCapture(e.pointerId);
      drag = { a: angleAt(e), acc: 0, total: 0 };
    }, { signal: ctx.signal });
    dial.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const a = angleAt(e);
      let d = a - drag.a;
      if (d > 180) d -= 360;
      if (d < -180) d += 360;
      drag.a = a;
      drag.acc += d;
      drag.total += Math.abs(d);
      while (drag.acc > 22) { drag.acc -= 30; tune(ch + 1); }
      while (drag.acc < -22) { drag.acc += 30; tune(ch - 1); }
    }, { signal: ctx.signal });
    dial.addEventListener('pointerup', (e) => {
      if (drag && drag.total < 4) { if (!on) powerOn(); else tune(ch + 1); }
      drag = null;
    }, { signal: ctx.signal });
    dial.addEventListener('wheel', (e) => { e.preventDefault(); tune(ch + (e.deltaY > 0 ? 1 : -1)); }, { signal: ctx.signal, passive: false });
    const angleAt = (e) => {
      const r = dial.getBoundingClientRect();
      return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI;
    };
    addEventListener('keydown', (e) => {
      if (diving) return;
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); if (!on) powerOn(); else tune(ch + 1); }
      else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); if (!on) powerOn(); else tune(ch - 1); }
      else if (e.key === 'p' || e.key === 'P' || e.key === ' ') { e.preventDefault(); on ? (beckoning ? dive(0.5, 0.55) : powerOff()) : powerOn(); }
    }, { signal: ctx.signal });

    // the screen itself
    tvCanvas.addEventListener('pointerdown', (e) => {
      if (!on) { powerOn(); return; }
      const r = tvCanvas.getBoundingClientRect();
      const u = (e.clientX - r.left) / r.width, v = 1 - (e.clientY - r.top) / r.height;
      if (beckoning || ch === 12) dive(u, v);
      else {
        crt.state.ripple = [u, v, 0]; crt.state.rippleAmp = 0.35; tap(audio, ctx.out);
        taps++;
        if (taps >= 2) say('12チャンネルの駅が、呼んでいる。', 'the station on channel 12 is calling — turn the dial to 12, then touch the screen.');
        if (taps >= 3 && !autoTurned) { autoTurned = true; let k = 0; const step = () => { if (!on || diving || ch === 12) return; tune(ch + 1); k++; if (ch !== 12 && k < 13) ctx.timeout(step, 140); }; ctx.timeout(step, 600); }
      }
    }, { signal: ctx.signal });

    // nixie: divergence meter ⇄ clock
    let nixieMode = 'div';
    nixie.addEventListener('click', () => { nixieMode = nixieMode === 'div' ? 'clock' : 'div'; tick2(audio, ctx.out); }, { signal: ctx.signal });
    const divergence = after ? '1.048596' : '0.571024';
    let nixieShown = '';
    const setNixie = (str) => {
      if (str === nixieShown) return;
      nixieShown = str;
      nixie.innerHTML = [...str].map((c) => c === '.' || c === ':' ? `<div class="tube dot" data-ghost=""><span class="d">${c === ':' ? '.' : '.'}</span></div>` : `<div class="tube" data-ghost="8"><span class="d">${c}</span></div>`).join('');
    };

    // captions
    let capTimer = 0;
    let lastSay = null;
    function say(jp, en, ms = 0) {
      cap.classList.remove('on');
      clearTimeout(capTimer);
      if (!jp) return;
      capTimer = setTimeout(() => {
        lastSay = [jp, en];
        cap.innerHTML = ctx.en && en
          ? `<div class="jp" style="font-family:'EB Garamond',serif;letter-spacing:.06em;font-size:clamp(16px,1.7vw,20px)">${en.charAt(0).toUpperCase() + en.slice(1)}</div>`
          : `<div class="jp">${jp}</div>${en ? `<div class="en">${en}</div>` : ''}`;
        cap.classList.add('on');
        if (ms) capTimer = setTimeout(() => cap.classList.remove('on'), ms);
      }, 500);
    }
    function hintDial() {
      if (!on || beckoning || diving) return;
      if (ch === 12) { say('夏ヶ原駅、ライブカメラ。', 'a live camera at an empty station. touch the screen to go in.'); return; }
      if (visited.size < 3) say('ダイヤルを、回して。', 'turn the dial — drag it, scroll, or press <kbd>↑</kbd> <kbd>↓</kbd>');
      else cap.classList.remove('on');
    }

    // ── the dive ──
    function dive(u, v) {
      if (diving) return;
      diving = true;
      beckoning = false;
      say('', '');
      crt.state.ripple = [u, v, 0];
      crt.state.rippleAmp = 0.2;
      const t = audio.now();
      lp.frequency.cancelScheduledValues(t);
      lp.frequency.setValueAtTime(lp.frequency.value, t);
      lp.frequency.exponentialRampToValueAtTime(18000, t + 3.5);
      hp.frequency.setTargetAtTime(20, t, 0.8);
      tvVol.gain.setTargetAtTime(1.6, t, 1.0);
      if (whine) { whine.stop(); whine = null; }
      whoosh(audio, ctx.out, 5.2);
      // 1) the glass turns to water
      const t0 = performance.now();
      const W = L.W, H = L.H;
      const k = Math.max(W / L.sw, H / L.sh) * 1.04;
      // sharper backing store for the zoom
      const bw = Math.min(4096, L.sw * k * L.dpr), bh = bw * 0.75;
      ctx.timeout(() => {
        tvCanvas.width = Math.round(bw);
        tvCanvas.height = Math.round(bh);
        const cx = L.sx + L.sw / 2, cy = L.sy + L.sh / 2;
        world.style.transition = 'transform 2.2s cubic-bezier(.65,0,.25,1)';
        world.style.transform = `translate(${W / 2 - cx * k}px, ${H / 2 - cy * k}px) scale(${k})`;
      }, 1100);
      const anim = () => {
        if (ctx.signal.aborted) return;
        const s = (performance.now() - t0) / 1000;
        crt.state.rippleAmp = Math.min(1.6, 0.2 + s * 0.7);
        if (s > 3.2) {
          // 2) into the phosphors
          const z = (s - 3.2) / 2.4;
          crt.state.zoom = 1 + Math.pow(Math.min(1, z), 2.6) * 160;
          crt.state.zoomC = [0.5 + (u - 0.5) * 0.3, 0.5 + (v - 0.5) * 0.3];
          crt.state.bright = 1 + z * 1.4;
          crt.state.whiteout = Math.max(0, Math.min(1, (z - 0.72) / 0.28));
          crt.state.curve = 0.09 * (1 - Math.min(1, z));
        }
        if (s < 6.0) requestAnimationFrame(anim);
        else ctx.dive && ctx.dive();
      };
      requestAnimationFrame(anim);
    }

    // ── EVA title card, once per page load ──
    if (!shownCard && !after) {
      shownCard = true;
      const eva = el('div', 'rm-eva', root);
      eva.innerHTML = `<div class="card"><div class="ep">EPISODE:1</div><div class="big">画面の、<br>向こう</div><div class="no">第壱話</div><div class="sub">BEYOND THE SCREEN<br>THE OTHER SIDE OF THE GLASS</div></div>`;
      ctx.timeout(() => eva.classList.add('gone'), 4300);
      ctx.timeout(() => eva.remove(), 5500);
      ctx.timeout(() => say('一九八六年製、HIKARI CT-1486。', (ctx.en ? 'it still works. you made sure of that. press POWER to turn it on.' : 'it still works. you made sure of that. — press 電源 to turn it on')), 4600);
    } else if (after) {
      ctx.timeout(() => say('あなたの歴史が、また1ページ。', 'and so, another page of your history turns.', 9000), 1800);
      ctx.timeout(() => say('電源を入れれば、またいつでも。', 'turn it on, and the line is still running. anytime.'), 12000);
    } else {
      ctx.timeout(() => say('電源を、入れて。', 'turn it on.'), 900);
    }

    root.__dbg = () => ({ on, beckoning, diving, ch, switching, power: crt.state.power });

    // ── frame ──
    let frame = 0;
    layout();
    const resize = () => { if (!diving) layout(); };

    ctx.loop((tt, dt) => {
      frame++;
      const now = audio.now();
      const S = getB();

      // draw the picture
      if (on) {
        if (switching > 0) {
          switching -= dt;
          S.drawSnow(sg, now, 640, 480);
          if (snowSnd) snowSnd.setLevel(0.9);
        } else {
          const P = S.PROGRAMS[ch];
          if (P) {
            try { P.draw(sg, now - tunedAt, 640, 480); } catch (e) { S.drawSnow(sg, now, 640, 480); }
            if (snowSnd) snowSnd.setLevel(0.0);
          } else if (raining && new Date().getHours() === 0) {
            // rainy night, midnight, an empty channel: something is on.
            drawMidnight(sg, now - tunedAt, S);
            if (snowSnd) snowSnd.setLevel(0.25);
          } else {
            S.drawSnow(sg, now, 640, 480);
            if (snowSnd) snowSnd.setLevel(0.75);
          }
        }
        // channel OSD, green, top right, like every Japanese set of the era
        if (now - tunedAt < 2.6 && !diving) {
          sg.save();
          sg.font = '64px VT323, monospace';
          sg.textAlign = 'right';
          sg.fillStyle = 'rgba(0,0,0,.5)';
          sg.fillText(String(ch).padStart(2, ' '), 594, 82);
          sg.fillStyle = '#5dff7a';
          sg.fillText(String(ch).padStart(2, ' '), 590, 78);
          sg.restore();
        }
        // beckon
        const P12 = S.PROGRAMS[12];
        if (ch === 12 && !diving && P12) {
          const b = typeof P12.beckon === 'number' ? P12.beckon : Math.min(1, (now - tunedAt) / 14);
          if ((b >= 1 || now - tunedAt > 8) && !beckoning) {
            beckoning = true;
            say('画面に、触れて。', 'touch the screen.');
          }
          if (beckoning && frame % 150 === 0) { crt.state.ripple = [0.5, 0.45, 0]; crt.state.rippleAmp = 0.25; }
        } else if (beckoning && ch !== 12) {
          beckoning = false;
        }
        // the TV decides for you
        if (!autoTurned && !diving && ch !== 12 && poweredAt && (now - poweredAt > 36 || visited.size >= 6)) {
          autoTurned = true;
          let k = 0;
          const step = () => {
            if (!on || diving || ch === 12) return;
            tune(ch + 1);
            k++;
            if (ch !== 12 && k < 13) ctx.timeout(step, 140);
          };
          say('……ダイヤルが、勝手に。', 'the dial is turning on its own.');
          ctx.timeout(step, 900);
        }
      } else {
        sg.fillStyle = '#000';
        sg.fillRect(0, 0, 640, 480);
      }

      if (crt.state.ripple[2] >= 0) {
        crt.state.ripple[2] += dt;
        if (crt.state.ripple[2] > 4 && !diving) crt.state.ripple[2] = -1;
      }
      crt.render(tt);

      // TV light colour (sampled), smoothed
      if (frame % 3 === 0) {
        ag.drawImage(src, 0, 0, 8, 6);
        const d = ag.getImageData(0, 0, 8, 6).data;
        let r = 0, gg = 0, b = 0;
        for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; }
        const n = d.length / 4;
        const target = on ? [r / n, gg / n, b / n] : [0, 0, 0];
        for (let i = 0; i < 3; i++) tvColor[i] += (target[i] - tvColor[i]) * 0.35;
      }
      const pw = crt.state.power;
      tvLevel = on ? Math.min(1, pw * 1.2) : Math.max(0, pw);
      composite(g, L, albedo, tvColor, tvLevel, tt, raining, after);
      root.style.setProperty('--lit', String(0.22 + 0.75 * tvLevel * (0.35 + lum(tvColor) / 255)));

      // nixie
      if (frame % 6 === 0) {
        if (nixieMode === 'clock') {
          const d = new Date();
          setNixie(`${pad(d.getHours())}.${pad(d.getMinutes())}.${pad(d.getSeconds())}`);
        } else {
          // the meter twitches when the TV changes channel
          if (switching > 0) setNixie((Math.random() * 1.2).toFixed(6));
          else setNixie(divergence);
        }
      }
    });

    return {
      resize,
      destroy() {
        if (prog) { try { prog.stop(); } catch (e) {} }
        if (snowSnd) snowSnd.stop();
        if (whine) whine.stop();
        crt.dispose();
      },
    };
  },
};

// ───────────────────────── helpers ─────────────────────────
function el(tag, cls, parent) {
  const e = document.createElement(tag);
  e.className = cls;
  parent.appendChild(e);
  return e;
}
function place(e, x, y, w, h) {
  e.style.left = x + 'px';
  e.style.top = y + 'px';
  e.style.width = w + 'px';
  e.style.height = h + 'px';
}
const pad = (n) => String(n).padStart(2, '0');
const lum = (c) => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];

function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

// Paint the room as if evenly lit; the frame loop then lights it with the TV.
function paintAlbedo(L, raining, after) {
  const { W, H, dpr } = L;
  const c = document.createElement('canvas');
  c.width = Math.round(W * dpr);
  c.height = Math.round(H * dpr);
  const g = c.getContext('2d');
  g.scale(dpr, dpr);
  const R = seeded(1986);

  // wall: Shōwa wallpaper, faint vertical weave
  const wg = g.createLinearGradient(0, 0, 0, L.floorY);
  wg.addColorStop(0, '#8d8173');
  wg.addColorStop(1, '#a3978a');
  g.fillStyle = wg;
  g.fillRect(0, 0, W, L.floorY);
  for (let x = 0; x < W; x += 6) {
    g.fillStyle = `rgba(60,45,30,${0.03 + R() * 0.035})`;
    g.fillRect(x, 0, 3, L.floorY);
  }
  for (let y = 0; y < L.floorY; y += 3) {
    g.fillStyle = `rgba(255,255,255,${R() * 0.025})`;
    g.fillRect(0, y, W, 1);
  }
  // 長押 beam near the ceiling and a skirting board
  const by = H * 0.075;
  g.fillStyle = '#5b412b';
  g.fillRect(0, by, W, H * 0.022);
  g.fillStyle = 'rgba(255,220,170,.18)';
  g.fillRect(0, by, W, 1.5);
  g.fillStyle = 'rgba(0,0,0,.25)';
  g.fillRect(0, by + H * 0.022, W, 3);
  g.fillStyle = '#4a3423';
  g.fillRect(0, L.floorY - H * 0.018, W, H * 0.018);

  // window frame (glass painted later as emissive night)
  const wn = L.win;
  if (wn.w > 40) {
    g.fillStyle = '#5c432d';
    g.fillRect(wn.x - 10, wn.y - 10, wn.w + 20, wn.h + 20);
    g.fillStyle = '#000';
    g.fillRect(wn.x, wn.y, wn.w, wn.h);
    // sill
    g.fillStyle = '#6b4f36';
    g.fillRect(wn.x - 18, wn.y + wn.h + 8, wn.w + 36, 8);
    // curtain, gathered to one side
    const cw = wn.w * 0.22;
    const cg = g.createLinearGradient(wn.x + wn.w - cw, 0, wn.x + wn.w + 14, 0);
    cg.addColorStop(0, '#6d7a6a');
    cg.addColorStop(0.5, '#86937f');
    cg.addColorStop(1, '#5a6658');
    g.fillStyle = cg;
    g.beginPath();
    g.moveTo(wn.x + wn.w - cw, wn.y - 14);
    for (let i = 0; i <= 12; i++) {
      const yy = wn.y - 14 + (wn.h + 30) * (i / 12);
      g.lineTo(wn.x + wn.w - cw + Math.sin(i * 1.7) * 4, yy);
    }
    g.lineTo(wn.x + wn.w + 16, wn.y + wn.h + 16);
    g.lineTo(wn.x + wn.w + 16, wn.y - 14);
    g.closePath();
    g.fill();
    for (let i = 0; i < 5; i++) {
      g.strokeStyle = 'rgba(0,0,0,.18)';
      g.lineWidth = 2;
      g.beginPath();
      const x = wn.x + wn.w - cw + 6 + i * (cw + 14) / 5;
      g.moveTo(x, wn.y - 12);
      g.lineTo(x + Math.sin(i) * 3, wn.y + wn.h + 14);
      g.stroke();
    }
  }

  // calendar with today circled (landscape only)
  if (!L.portrait) {
    const cx = L.cabX + L.cabW + (W - (L.cabX + L.cabW)) * 0.45, cy = H * 0.16, cw = Math.min(W * 0.085, 120), ch = cw * 1.45;
    if (cx + cw < W - 10) {
      g.fillStyle = 'rgba(0,0,0,.25)';
      g.fillRect(cx + 3, cy + 4, cw, ch);
      g.fillStyle = '#efe9dc';
      g.fillRect(cx, cy, cw, ch);
      g.fillStyle = '#b3402e';
      g.fillRect(cx, cy, cw, ch * 0.36);
      // a block-print summer field on the top half
      g.fillStyle = '#7c9a68';
      g.fillRect(cx + 4, cy + ch * 0.2, cw - 8, ch * 0.14);
      g.fillStyle = '#e8d9a6';
      g.beginPath(); g.arc(cx + cw * 0.72, cy + ch * 0.13, cw * 0.08, 0, 7); g.fill();
      const d = new Date();
      g.fillStyle = '#2a2a2a';
      g.font = `700 ${cw * 0.16}px 'Zen Kaku Gothic New', sans-serif`;
      g.fillText(`${d.getMonth() + 1}月`, cx + 6, cy + ch * 0.47);
      g.font = `400 ${cw * 0.07}px 'Zen Kaku Gothic New', sans-serif`;
      g.fillText(String(d.getFullYear()), cx + cw - cw * 0.32, cy + ch * 0.46);
      const first = new Date(d.getFullYear(), d.getMonth(), 1).getDay();
      const days = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      const gw = (cw - 8) / 7, gh = ch * 0.085;
      g.font = `${cw * 0.075}px 'Zen Kaku Gothic New', sans-serif`;
      for (let i = 1; i <= days; i++) {
        const k = first + i - 1;
        const x = cx + 4 + (k % 7) * gw, y = cy + ch * 0.55 + Math.floor(k / 7) * gh;
        g.fillStyle = k % 7 === 0 ? '#b3402e' : '#333';
        g.fillText(String(i), x + 1, y + gh * 0.7);
        if (i === d.getDate()) {
          g.strokeStyle = '#d0301c';
          g.lineWidth = 1.3;
          g.beginPath();
          g.ellipse(x + gw * 0.42, y + gh * 0.45, gw * 0.55, gh * 0.6, -0.2, 0, Math.PI * 1.9);
          g.stroke();
        }
      }
      g.fillStyle = '#555';
      g.beginPath(); g.arc(cx + cw / 2, cy - 6, 2, 0, 7); g.fill();
    }
  }

  // floor: old wooden boards
  const fg = g.createLinearGradient(0, L.floorY, 0, H);
  fg.addColorStop(0, '#6a4a32');
  fg.addColorStop(1, '#4b3322');
  g.fillStyle = fg;
  g.fillRect(0, L.floorY, W, H - L.floorY);
  let yy = L.floorY;
  let k = 0;
  while (yy < H) {
    const hh = 10 + k * 6;
    g.fillStyle = 'rgba(0,0,0,.22)';
    g.fillRect(0, yy, W, 1);
    let x = -R() * 200;
    while (x < W) {
      const ww = 120 + R() * 220;
      g.fillStyle = `rgba(${R() > 0.5 ? '255,220,180' : '30,15,5'},${R() * 0.06})`;
      g.fillRect(x, yy + 1, ww, hh - 1);
      g.fillStyle = 'rgba(0,0,0,.25)';
      g.fillRect(x, yy, 1, hh);
      x += ww;
    }
    yy += hh;
    k++;
  }
  // a rug
  g.fillStyle = '#5d2f2a';
  g.beginPath();
  g.ellipse(W / 2, L.floorY + (H - L.floorY) * 0.55, W * 0.32, (H - L.floorY) * 0.38, 0, 0, 7);
  g.fill();
  g.strokeStyle = 'rgba(230,200,150,.18)';
  g.lineWidth = 2;
  g.beginPath();
  g.ellipse(W / 2, L.floorY + (H - L.floorY) * 0.55, W * 0.3, (H - L.floorY) * 0.33, 0, 0, 7);
  g.stroke();

  // the low TV stand, with a VCR and the RF modulator
  const st = L.stand;
  g.fillStyle = 'rgba(0,0,0,.35)';
  g.fillRect(st.x + 6, L.floorY - 4, st.w, 10);
  const sg2 = g.createLinearGradient(0, L.standTop, 0, L.floorY);
  sg2.addColorStop(0, '#6e4a2c');
  sg2.addColorStop(1, '#4f341f');
  g.fillStyle = sg2;
  g.fillRect(st.x, L.standTop, st.w, L.floorY - L.standTop - 4);
  g.fillStyle = '#835b39';
  g.fillRect(st.x - 4, L.standTop - 6, st.w + 8, 8);
  // shelf opening
  const ox = st.x + st.w * 0.08, ow = st.w * 0.84, oy = L.standTop + L.standH * 0.16, oh = L.standH * 0.62;
  g.fillStyle = '#1c130c';
  g.fillRect(ox, oy, ow, oh);
  // VCR
  const vx = ox + ow * 0.08, vw = ow * 0.46, vh = oh * 0.36, vy = oy + oh - vh - 4;
  g.fillStyle = '#26262a';
  rr(g, vx, vy, vw, vh, 3); g.fill();
  g.fillStyle = '#3a3a40';
  g.fillRect(vx, vy, vw, 3);
  g.fillStyle = '#0d0d0f';
  g.fillRect(vx + vw * 0.08, vy + vh * 0.32, vw * 0.42, vh * 0.26);
  g.fillStyle = '#9a9aa2';
  g.font = `700 ${Math.max(6, vh * 0.16)}px 'Zen Kaku Gothic New', sans-serif`;
  g.fillText('HQ  VIDEO', vx + vw * 0.08, vy + vh * 0.86);
  L.vfd = { x: vx + vw * 0.62, y: vy + vh * 0.3, w: vw * 0.3, h: vh * 0.3 };
  g.fillStyle = '#0a0d0c';
  g.fillRect(L.vfd.x, L.vfd.y, L.vfd.w, L.vfd.h);
  // RF modulator: a small silver box with a coax lead
  const mx = vx + vw + ow * 0.08, mw = ow * 0.22, mh = vh * 0.62, my = oy + oh - mh - 4;
  const mg = g.createLinearGradient(0, my, 0, my + mh);
  mg.addColorStop(0, '#d7d7d2');
  mg.addColorStop(1, '#9d9d98');
  g.fillStyle = mg;
  rr(g, mx, my, mw, mh, 2); g.fill();
  g.fillStyle = '#333';
  g.font = `700 ${Math.max(5, mh * 0.17)}px 'IBM Plex Mono', monospace`;
  g.fillText('RF MOD', mx + mw * 0.1, my + mh * 0.38);
  g.font = `${Math.max(5, mh * 0.13)}px 'IBM Plex Mono', monospace`;
  g.fillText('CH 3 · 4', mx + mw * 0.1, my + mh * 0.66);
  g.fillStyle = '#c8a54a';
  g.beginPath(); g.arc(mx + mw * 0.86, my + mh * 0.55, mh * 0.09, 0, 7); g.fill();
  // coax lead up to the set
  g.strokeStyle = '#18181a';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(mx + mw * 0.86, my + mh * 0.55);
  g.bezierCurveTo(mx + mw * 1.6, my - oh * 0.2, L.cabX + L.cabW + 30, L.standTop + 10, L.cabX + L.cabW - 6, L.cabY + L.cabH * 0.8);
  g.stroke();
  // magazines / manga stack
  g.fillStyle = '#c94f3b'; g.fillRect(ox + ow * 0.08, oy + 6, ow * 0.2, 7);
  g.fillStyle = '#e7dfc8'; g.fillRect(ox + ow * 0.09, oy + 13, ow * 0.19, 6);
  g.fillStyle = '#3d6a8a'; g.fillRect(ox + ow * 0.08, oy + 19, ow * 0.2, 6);

  // records crate on the floor, with headphones on top
  const rx = st.x + st.w + 14, rw = Math.min(L.sw * 0.42, W - rx - 12), rh = L.sh * 0.42;
  if (rw > 40) {
    const ry = L.floorY - rh;
    for (let i = 0; i < 22; i++) {
      const x = rx + 6 + i * (rw - 12) / 22;
      const hue = [12, 200, 40, 330, 90, 0, 220, 30][i % 8];
      g.fillStyle = `hsl(${hue},${30 + R() * 30}%,${30 + R() * 30}%)`;
      g.fillRect(x, ry - rh * 0.18 - R() * rh * 0.08, (rw - 12) / 22 - 1, rh * 0.7);
    }
    g.fillStyle = '#7a5434';
    g.fillRect(rx, ry + rh * 0.2, rw, rh * 0.8);
    g.fillStyle = 'rgba(0,0,0,.25)';
    g.fillRect(rx, ry + rh * 0.2, rw, 3);
    g.fillRect(rx + rw * 0.33, ry + rh * 0.2, 2, rh * 0.8);
    g.fillRect(rx + rw * 0.66, ry + rh * 0.2, 2, rh * 0.8);
    // studio headphones resting on the records
    const hx = rx + rw * 0.5, hy = ry - rh * 0.18;
    g.strokeStyle = '#3c3c42';
    g.lineWidth = Math.max(3, rw * 0.05);
    g.beginPath();
    g.arc(hx, hy + rh * 0.05, rw * 0.28, Math.PI * 1.08, Math.PI * 1.92);
    g.stroke();
    g.fillStyle = '#2b2b30';
    g.beginPath(); g.ellipse(hx - rw * 0.27, hy + rh * 0.06, rw * 0.09, rh * 0.15, 0.2, 0, 7); g.fill();
    g.beginPath(); g.ellipse(hx + rw * 0.27, hy + rh * 0.06, rw * 0.09, rh * 0.15, -0.2, 0, 7); g.fill();
    g.fillStyle = '#8a8a90';
    g.beginPath(); g.ellipse(hx - rw * 0.27, hy + rh * 0.06, rw * 0.04, rh * 0.07, 0.2, 0, 7); g.fill();
    g.beginPath(); g.ellipse(hx + rw * 0.27, hy + rh * 0.06, rw * 0.04, rh * 0.07, -0.2, 0, 7); g.fill();
  }
  // sneakers by the wall on the left (portrait: skip)
  if (!L.portrait && wn.x + wn.w < L.stand.x - 40) {
    const sx = L.stand.x - Math.min(160, L.sw * 0.42), sy = L.floorY - 2, sw = Math.min(64, L.sw * 0.16);
    for (let i = 0; i < 2; i++) {
      const x = sx + i * sw * 1.05;
      g.fillStyle = '#e9e7e0';
      g.beginPath();
      g.moveTo(x, sy);
      g.lineTo(x + sw, sy);
      g.quadraticCurveTo(x + sw * 1.02, sy - sw * 0.28, x + sw * 0.62, sy - sw * 0.32);
      g.lineTo(x + sw * 0.18, sy - sw * 0.42);
      g.quadraticCurveTo(x - sw * 0.02, sy - sw * 0.3, x, sy);
      g.fill();
      g.fillStyle = '#2f6b45';  // the green of a certain Takumi colourway
      g.beginPath();
      g.moveTo(x + sw * 0.25, sy - sw * 0.12);
      g.lineTo(x + sw * 0.5, sy - sw * 0.34);
      g.lineTo(x + sw * 0.58, sy - sw * 0.3);
      g.lineTo(x + sw * 0.38, sy - sw * 0.1);
      g.fill();
      g.fillStyle = '#d9d4c6';
      g.fillRect(x, sy - sw * 0.07, sw, sw * 0.07);
      g.fillStyle = '#1b1b1b';
      g.fillRect(x + sw * 0.05, sy - sw * 0.38, sw * 0.12, sw * 0.08);
    }
  }

  // ── the set itself ──
  const { cabX, cabY, cabW, cabH } = L;
  g.fillStyle = 'rgba(0,0,0,.45)';
  rr(g, cabX + 6, cabY + 10, cabW, cabH, 10); g.fill();
  const tg = g.createLinearGradient(0, cabY, 0, cabY + cabH);
  tg.addColorStop(0, '#cfcdc6');
  tg.addColorStop(0.5, '#b9b6ae');
  tg.addColorStop(1, '#9d9a92');
  g.fillStyle = tg;
  rr(g, cabX, cabY, cabW, cabH, 10); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.35)';
  g.lineWidth = 1;
  rr(g, cabX + 0.5, cabY + 0.5, cabW - 1, cabH - 1, 10); g.stroke();
  // bezel
  const bx = L.sx - L.sw * 0.03, byy = L.sy - L.sh * 0.04, bw = L.sw * 1.06, bh = L.sh * 1.08;
  const bzg = g.createLinearGradient(0, byy, 0, byy + bh);
  bzg.addColorStop(0, '#2b2b2e');
  bzg.addColorStop(1, '#1a1a1c');
  g.fillStyle = bzg;
  rr(g, bx, byy, bw, bh, L.sh * 0.06); g.fill();
  g.fillStyle = '#050506';
  rr(g, L.sx, L.sy, L.sw, L.sh, L.sh * 0.05); g.fill();
  // panel: speaker grille slots
  const px = L.panelX + L.panelW * 0.12, pw = L.panelW * 0.76;
  const gy0 = L.sy + L.sh * 0.52, gy1 = L.cabY + L.cabH - L.padB * 1.1 - L.sh * 0.12;
  for (let y = gy0; y < gy1; y += 5) {
    g.fillStyle = 'rgba(30,30,32,.55)';
    rr(g, px, y, pw, 2.2, 1); g.fill();
  }
  // brand plate under the screen
  g.fillStyle = '#2d2d31';
  g.font = `italic 800 ${Math.max(9, L.sh * 0.07)}px 'Zen Kaku Gothic New', sans-serif`;
  g.textBaseline = 'middle';
  const bly = L.sy + L.sh + L.padB * 0.52;
  g.save();
  g.translate(L.sx + L.sw * 0.02, bly);
  g.fillText('H I K A R I', 0, 0);
  g.restore();
  g.font = `${Math.max(7, L.sh * 0.04)}px 'Zen Kaku Gothic New', sans-serif`;
  g.fillStyle = '#4a4a50';
  g.textAlign = 'right';
  g.fillText('カラーテレビ  CT-1486', L.sx + L.sw, bly);
  g.textAlign = 'left';
  g.fillStyle = '#4a4a50';
  g.font = `700 ${Math.max(6, L.sh * 0.032)}px 'Zen Kaku Gothic New', sans-serif`;
  g.fillText('VHF', L.panelX + L.panelW * 0.12, L.sy + L.sh * 0.04);
  g.fillText('チャンネル', L.panelX + L.panelW * 0.12, L.sy + L.sh * 0.5 - 2);
  g.textBaseline = 'alphabetic';
  // rabbit ears
  const ax = cabX + cabW * 0.32, ay = cabY;
  g.fillStyle = '#2a2a2c';
  rr(g, ax - 16, ay - 8, 32, 10, 4); g.fill();
  g.strokeStyle = '#bdbdbd';
  g.lineWidth = 1.6;
  [[-1, 0.35], [1, 0.22]].forEach(([s, ang]) => {
    g.beginPath();
    g.moveTo(ax + s * 4, ay - 6);
    const len = L.sh * 0.9;
    g.lineTo(ax + s * 4 + Math.sin(s * ang + s * 0.4) * len, ay - 6 - Math.cos(ang) * len);
    g.stroke();
    g.fillStyle = '#cfcfcf';
    g.beginPath(); g.arc(ax + s * 4 + Math.sin(s * ang + s * 0.4) * len, ay - 6 - Math.cos(ang) * len, 2.5, 0, 7); g.fill();
  });

  // grain over everything
  const ng = document.createElement('canvas');
  ng.width = 128; ng.height = 128;
  const nx = ng.getContext('2d');
  const id = nx.createImageData(128, 128);
  for (let i = 0; i < id.data.length; i += 4) {
    const v = R() * 255;
    id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
    id.data[i + 3] = 18;
  }
  nx.putImageData(id, 0, 0);
  g.fillStyle = g.createPattern(ng, 'repeat');
  g.fillRect(0, 0, W, H);
  return c;
}

// Light the room with whatever is on the screen.
function composite(g, L, albedo, tvc, level, t, raining, after) {
  const { W, H, dpr } = L;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-over';
  g.drawImage(albedo, 0, 0);
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cx = L.sx + L.sw / 2, cy = L.sy + L.sh / 2;
  const amb = after ? [118, 112, 108] : [17, 18, 28];
  const boost = 1.25;
  const tc = tvc.map((v) => Math.min(255, v * boost + 30));
  const flick = 0.94 + 0.06 * Math.sin(t * 31) * Math.sin(t * 7.3);
  const I = level * flick;
  const mix = (k) => `rgb(${Math.min(255, amb[0] + tc[0] * I * k) | 0},${Math.min(255, amb[1] + tc[1] * I * k) | 0},${Math.min(255, amb[2] + tc[2] * I * k) | 0})`;
  const R = Math.max(W, H);
  const lg = g.createRadialGradient(cx, cy, L.sh * 0.3, cx, cy + L.sh * 0.3, R * 0.85);
  lg.addColorStop(0, mix(1.05));
  lg.addColorStop(0.18, mix(0.7));
  lg.addColorStop(0.45, mix(0.28));
  lg.addColorStop(1, mix(0.02));
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = lg;
  g.fillRect(0, 0, W, H);

  // emissive: the window
  g.globalCompositeOperation = 'source-over';
  const wn = L.win;
  if (wn.w > 40) {
    const sk = g.createLinearGradient(0, wn.y, 0, wn.y + wn.h);
    if (after) {
      sk.addColorStop(0, '#9fb7d6'); sk.addColorStop(0.6, '#e9c7b4'); sk.addColorStop(1, '#f6dcc0');
    } else {
      sk.addColorStop(0, '#0b1426'); sk.addColorStop(0.7, '#14203a'); sk.addColorStop(1, '#2a2a3c');
    }
    g.fillStyle = sk;
    g.fillRect(wn.x, wn.y, wn.w, wn.h);
    // distant houses and wires
    g.fillStyle = after ? 'rgba(70,70,90,.55)' : '#05070d';
    const R2 = seeded(7);
    let x = wn.x;
    while (x < wn.x + wn.w) {
      const w = 14 + R2() * 30, h = wn.h * (0.1 + R2() * 0.18);
      g.fillRect(x, wn.y + wn.h - h, w, h);
      if (!after && R2() > 0.6) {
        g.fillStyle = 'rgba(255,200,120,.75)';
        g.fillRect(x + w * 0.3, wn.y + wn.h - h * 0.6, 3, 3);
        g.fillStyle = '#05070d';
      }
      x += w + 2;
    }
    g.strokeStyle = after ? 'rgba(40,40,60,.6)' : 'rgba(0,0,0,.9)';
    g.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      g.moveTo(wn.x, wn.y + wn.h * (0.25 + i * 0.07));
      g.quadraticCurveTo(wn.x + wn.w / 2, wn.y + wn.h * (0.33 + i * 0.07), wn.x + wn.w, wn.y + wn.h * (0.22 + i * 0.07));
      g.stroke();
    }
    if (!after) {
      g.fillStyle = 'rgba(230,232,255,.9)';
      g.beginPath(); g.arc(wn.x + wn.w * 0.3, wn.y + wn.h * 0.16, Math.max(3, wn.w * 0.03), 0, 7); g.fill();
      const mg = g.createRadialGradient(wn.x + wn.w * 0.3, wn.y + wn.h * 0.16, 0, wn.x + wn.w * 0.3, wn.y + wn.h * 0.16, wn.w * 0.3);
      mg.addColorStop(0, 'rgba(160,180,255,.25)');
      mg.addColorStop(1, 'rgba(160,180,255,0)');
      g.fillStyle = mg;
      g.fillRect(wn.x, wn.y, wn.w, wn.h);
    }
    if (raining) {
      g.strokeStyle = 'rgba(190,205,240,.35)';
      g.lineWidth = 1;
      for (let i = 0; i < 70; i++) {
        const rx = wn.x + ((i * 97.3 + t * 40 * (1 + (i % 5) * 0.2)) % wn.w);
        const ry = wn.y + ((i * 53.1 + t * (300 + (i % 7) * 40)) % wn.h);
        g.beginPath(); g.moveTo(rx, ry); g.lineTo(rx - 2, ry + 12); g.stroke();
      }
      for (let i = 0; i < 26; i++) {
        const dx = wn.x + (i * 61.7) % wn.w, dy = wn.y + ((i * 33.3 + t * (8 + i % 4) * 3) % wn.h);
        g.fillStyle = 'rgba(200,215,255,.35)';
        g.beginPath(); g.arc(dx, dy, 1.6, 0, 7); g.fill();
      }
    }
    // the TV reflected faintly in the glass
    if (level > 0.05) {
      const rx = wn.x + wn.w * 0.62, ry = wn.y + wn.h * 0.58;
      const rg = g.createRadialGradient(rx, ry, 0, rx, ry, wn.w * 0.16);
      rg.addColorStop(0, `rgba(${tc[0] | 0},${tc[1] | 0},${tc[2] | 0},${0.1 * level})`);
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rg;
      g.fillRect(wn.x, wn.y, wn.w, wn.h);
    }
  }

  // VCR clock, forever blinking 12:00 — or, at this hour, the real time
  if (L.vfd) {
    const v = L.vfd;
    const d = new Date();
    const s = Math.floor(t * 2) % 2 ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : `${pad(d.getHours())} ${pad(d.getMinutes())}`;
    g.font = `${Math.max(7, v.h * 0.85)}px VT323, monospace`;
    g.fillStyle = '#57f0d0';
    g.shadowColor = 'rgba(87,240,208,.8)';
    g.shadowBlur = 6;
    g.fillText(s, v.x + 2, v.y + v.h * 0.85);
    g.shadowBlur = 0;
  }

  // the screen's own glow spilling onto the bezel, the stand, the floor
  if (level > 0.01) {
    g.globalCompositeOperation = 'lighter';
    const gg = g.createRadialGradient(cx, cy, L.sh * 0.35, cx, cy, L.sh * 1.25);
    gg.addColorStop(0, `rgba(${tc[0] | 0},${tc[1] | 0},${tc[2] | 0},${0.16 * level})`);
    gg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gg;
    g.fillRect(cx - L.sh * 1.4, cy - L.sh * 1.4, L.sh * 2.8, L.sh * 2.8);
    const fy = L.floorY + (H - L.floorY) * 0.3;
    const fl = g.createRadialGradient(cx, fy, 0, cx, fy, L.sw * 1.1);
    fl.addColorStop(0, `rgba(${tc[0] | 0},${tc[1] | 0},${tc[2] | 0},${0.1 * level})`);
    fl.addColorStop(1, 'rgba(0,0,0,0)');
    g.save();
    g.translate(cx, fy);
    g.scale(1, 0.28);
    g.translate(-cx, -fy);
    g.fillStyle = fl;
    g.fillRect(cx - L.sw * 1.2, fy - L.sw * 1.2, L.sw * 2.4, L.sw * 2.4);
    g.restore();
  }
  g.globalCompositeOperation = 'source-over';
}

// The Midnight Channel: yellow static, a figure standing in it. Only on rainy nights at midnight.
function drawMidnight(g, t, S) {
  S.drawSnow(g, t, 640, 480);
  g.save();
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = '#e8b83a';
  g.fillRect(0, 0, 640, 480);
  g.globalCompositeOperation = 'source-over';
  const a = 0.35 + 0.25 * Math.sin(t * 0.9) + (Math.random() < 0.05 ? 0.3 : 0);
  g.globalAlpha = Math.max(0, Math.min(1, a));
  g.fillStyle = '#1a1206';
  const x = 320 + Math.sin(t * 0.7) * 6, y = 470;
  // a person with big studio headphones, standing very still
  g.beginPath();
  g.ellipse(x, y - 300, 34, 40, 0, 0, 6.283);
  g.fill();
  g.fillRect(x - 46, y - 312, 14, 40);
  g.fillRect(x + 32, y - 312, 14, 40);
  g.beginPath();
  g.arc(x, y - 312, 46, Math.PI, 0);
  g.lineWidth = 8;
  g.strokeStyle = '#1a1206';
  g.stroke();
  g.beginPath();
  g.moveTo(x - 30, y - 262);
  g.quadraticCurveTo(x - 92, y - 220, x - 96, y);
  g.lineTo(x + 96, y);
  g.quadraticCurveTo(x + 92, y - 220, x + 30, y - 262);
  g.fill();
  g.globalAlpha = 1;
  g.fillStyle = 'rgba(30,20,0,.75)';
  g.font = '26px DotGothic16, monospace';
  g.fillText('マヨナカテレビ', 24, 40);
  g.restore();
}

// ───────────────────────── sounds of the room ─────────────────────────
function startRoomTone(ctx, dest, raining, after) {
  const { audio } = ctx;
  const ac = audio.ac;
  // a fridge two rooms away (50 Hz mains), barely there
  const hum = ac.createOscillator();
  hum.type = 'sawtooth';
  hum.frequency.value = 50;
  const hl = ac.createBiquadFilter(); hl.type = 'lowpass'; hl.frequency.value = 180;
  const hg = ac.createGain(); hg.gain.value = 0.012;
  hum.connect(hl).connect(hg).connect(dest);
  hum.start();
  ctx.signal.addEventListener('abort', () => { try { hum.stop(); } catch (e) {} });
  // air
  const air = audio.noiseLoop(dest, { kind: 'brown', type: 'lowpass', freq: 500, gain: 0.05 });
  ctx.signal.addEventListener('abort', () => air.stop());

  if (raining) {
    const rain = audio.noiseLoop(dest, { kind: 'pink', type: 'bandpass', freq: 2400, q: 0.5, gain: 0.12 });
    const drip = audio.noiseLoop(dest, { kind: 'white', type: 'highpass', freq: 5000, gain: 0.02 });
    ctx.signal.addEventListener('abort', () => { rain.stop(); drip.stop(); });
  }

  if (after) {
    // morning: sparrows
    const sparrow = () => {
      const t = audio.now();
      const n = 2 + Math.floor(Math.random() * 4);
      for (let i = 0; i < n; i++) {
        const o = ac.createOscillator();
        o.type = 'sine';
        const st = t + i * (0.09 + Math.random() * 0.05);
        const f = 3800 + Math.random() * 1400;
        o.frequency.setValueAtTime(f, st);
        o.frequency.exponentialRampToValueAtTime(f * 0.7, st + 0.06);
        const gg = ac.createGain();
        gg.gain.setValueAtTime(0.0001, st);
        gg.gain.linearRampToValueAtTime(0.025, st + 0.008);
        gg.gain.exponentialRampToValueAtTime(0.0001, st + 0.07);
        const pan = ac.createStereoPanner();
        pan.pan.value = -0.6 + Math.random() * 0.4;
        o.connect(gg).connect(pan).connect(dest);
        o.start(st);
        o.stop(st + 0.1);
      }
      ctx.timeout(sparrow, 1200 + Math.random() * 3800);
    };
    ctx.timeout(sparrow, 800);
  } else {
    // late October: bell crickets (鈴虫) outside — "riiin, riiin"
    const suzumushi = () => {
      const t = audio.now();
      const f = 4300 + Math.random() * 300;
      const pan = ac.createStereoPanner();
      pan.pan.value = -0.8 + Math.random() * 0.5;
      pan.connect(dest);
      const reps = 2 + Math.floor(Math.random() * 3);
      for (let r = 0; r < reps; r++) {
        const st = t + r * 0.55;
        const o = ac.createOscillator();
        o.type = 'sine';
        o.frequency.value = f;
        const am = ac.createOscillator();
        am.frequency.value = 38 + Math.random() * 6;
        const amg = ac.createGain();
        amg.gain.value = 0.5;
        const gg = ac.createGain();
        gg.gain.value = 0;
        const env = ac.createGain();
        env.gain.setValueAtTime(0.0001, st);
        env.gain.linearRampToValueAtTime(0.012, st + 0.04);
        env.gain.setValueAtTime(0.012, st + 0.32);
        env.gain.exponentialRampToValueAtTime(0.0001, st + 0.42);
        am.connect(amg).connect(gg.gain);
        gg.gain.value = 0.5;
        o.connect(gg).connect(env).connect(pan);
        o.start(st); am.start(st);
        o.stop(st + 0.45); am.stop(st + 0.45);
      }
      ctx.timeout(suzumushi, 1600 + Math.random() * 2600);
    };
    ctx.timeout(suzumushi, 1200);
    // and very far away, now and then, a late train
    const farTrain = () => {
      const t = audio.now();
      const src = ac.createBufferSource();
      src.buffer = audio.noise('brown');
      src.loop = true;
      const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 260;
      const gg = ac.createGain();
      gg.gain.setValueAtTime(0.0001, t);
      gg.gain.linearRampToValueAtTime(0.09, t + 5);
      gg.gain.linearRampToValueAtTime(0.0001, t + 12);
      src.connect(f).connect(gg).connect(dest);
      src.start(t);
      src.stop(t + 12.5);
      for (let i = 0; i < 26; i++) {
        const ct = t + 2 + i * 0.36 + (i % 2) * 0.12;
        const c = ac.createBufferSource();
        c.buffer = audio.noise('white');
        const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 3;
        const cg = ac.createGain();
        const amp = 0.02 * Math.sin(Math.PI * i / 26);
        cg.gain.setValueAtTime(0.0001, ct);
        cg.gain.linearRampToValueAtTime(amp, ct + 0.005);
        cg.gain.exponentialRampToValueAtTime(0.0001, ct + 0.12);
        c.connect(bp).connect(cg).connect(dest);
        c.start(ct, Math.random());
        c.stop(ct + 0.15);
      }
      ctx.timeout(farTrain, 50000 + Math.random() * 40000);
    };
    ctx.timeout(farTrain, 20000);
  }
}

function clunk(audio, dest) {
  const ac = audio.ac;
  const t = audio.now();
  const src = ac.createBufferSource();
  src.buffer = audio.noise('white');
  const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 2.5;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.5, t + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  src.connect(bp).connect(g).connect(dest);
  src.start(t, Math.random());
  src.stop(t + 0.08);
  const o = ac.createOscillator();
  o.type = 'triangle';
  o.frequency.setValueAtTime(190, t);
  o.frequency.exponentialRampToValueAtTime(90, t + 0.06);
  const og = ac.createGain();
  og.gain.setValueAtTime(0.25, t);
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
  o.connect(og).connect(dest);
  o.start(t);
  o.stop(t + 0.1);
}

function degauss(audio, dest) {
  const ac = audio.ac;
  const t = audio.now();
  // relay click
  clunk(audio, dest);
  // the "bwoong" of the degaussing coil: 50 Hz-ish hum with a wobbling, decaying envelope
  const o = ac.createOscillator();
  o.type = 'sawtooth';
  o.frequency.value = 50;
  const o2 = ac.createOscillator();
  o2.type = 'sine';
  o2.frequency.value = 100;
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t + 0.05);
  g.gain.linearRampToValueAtTime(0.5, t + 0.09);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
  const wob = ac.createOscillator();
  wob.frequency.value = 7;
  const wg = ac.createGain();
  wg.gain.value = 0.18;
  wob.connect(wg).connect(g.gain);
  o.connect(lp);
  o2.connect(lp);
  lp.connect(g).connect(dest);
  [o, o2, wob].forEach((x) => { x.start(t + 0.05); x.stop(t + 1.4); });
  // and the static crackle of the tube charging
  const src = ac.createBufferSource();
  src.buffer = audio.noise('white');
  const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3000;
  const cg = ac.createGain();
  cg.gain.setValueAtTime(0.0001, t + 0.1);
  cg.gain.linearRampToValueAtTime(0.06, t + 0.15);
  cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
  src.connect(hp).connect(cg).connect(dest);
  src.start(t + 0.1, Math.random());
  src.stop(t + 1);
}

function flyback(audio, dest) {
  const ac = audio.ac;
  const o = ac.createOscillator();
  o.type = 'sine';
  o.frequency.value = 15734;
  const g = ac.createGain();
  const t = audio.now();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.0035, t + 1.2);
  o.connect(g).connect(dest);
  o.start(t);
  return { stop() { const n = audio.now(); g.gain.setTargetAtTime(0, n, 0.05); try { o.stop(n + 0.3); } catch (e) {} } };
}

function zap(audio, dest) {
  const ac = audio.ac;
  const t = audio.now();
  const o = ac.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(1200, t);
  o.frequency.exponentialRampToValueAtTime(60, t + 0.35);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.12, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
  o.connect(g).connect(dest);
  o.start(t);
  o.stop(t + 0.45);
  clunk(audio, dest);
}

function tap(audio, dest) {
  const ac = audio.ac;
  const t = audio.now();
  const o = ac.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(900, t);
  o.frequency.exponentialRampToValueAtTime(420, t + 0.25);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.05, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
  o.connect(g).connect(dest);
  o.start(t);
  o.stop(t + 0.65);
}

function tick2(audio, dest) {
  const ac = audio.ac;
  const t = audio.now();
  const o = ac.createOscillator();
  o.type = 'square';
  o.frequency.value = 2400;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.02, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
  o.connect(g).connect(dest);
  o.start(t);
  o.stop(t + 0.04);
}

function whoosh(audio, dest, dur) {
  const ac = audio.ac;
  const t = audio.now();
  const src = ac.createBufferSource();
  src.buffer = audio.noise('pink');
  src.loop = true;
  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 1.4;
  bp.frequency.setValueAtTime(200, t);
  bp.frequency.exponentialRampToValueAtTime(6000, t + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.35, t + dur * 0.92);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.4);
  src.connect(bp).connect(g).connect(dest);
  src.start(t);
  src.stop(t + dur + 0.5);
  // a rising tone, the tube singing
  const o = ac.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(220, t + dur * 0.4);
  o.frequency.exponentialRampToValueAtTime(1760, t + dur);
  const og = ac.createGain();
  og.gain.setValueAtTime(0.0001, t + dur * 0.4);
  og.gain.exponentialRampToValueAtTime(0.06, t + dur * 0.95);
  og.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.3);
  o.connect(og).connect(dest);
  o.start(t + dur * 0.4);
  o.stop(t + dur + 0.4);
}

// If the broadcasts module isn't there (yet), the TV still works: bars and snow.
function makeFallbackBroadcasts() {
  const noise = document.createElement('canvas');
  noise.width = 160;
  noise.height = 120;
  const nx = noise.getContext('2d');
  const frames = [];
  for (let f = 0; f < 6; f++) {
    const id = nx.createImageData(160, 120);
    for (let i = 0; i < id.data.length; i += 4) {
      const v = Math.random() * 255;
      id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
      id.data[i + 3] = 255;
    }
    frames.push(id);
  }
  const drawSnow = (g, t, W, H) => {
    nx.putImageData(frames[Math.floor(t * 30) % frames.length], 0, 0);
    g.imageSmoothingEnabled = true;
    g.drawImage(noise, 0, 0, W, H);
  };
  const snowSound = (audio, dest) => {
    const n = audio.noiseLoop(dest, { kind: 'white', type: 'bandpass', freq: 3000, q: 0.4, gain: 0 });
    return { stop: () => n.stop(), setLevel: (x) => n.gain.gain.setTargetAtTime(x * 0.18, audio.now(), 0.03) };
  };
  const bars = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'];
  return {
    drawSnow,
    snowSound,
    PROGRAMS: {
      1: {
        name: 'カラーバー',
        start(audio, dest) {
          const o = audio.ac.createOscillator();
          o.frequency.value = 1000;
          const g = audio.ac.createGain();
          g.gain.value = 0.05;
          o.connect(g).connect(dest);
          o.start();
          return { stop: () => o.stop() };
        },
        draw(g, t, W, H) {
          bars.forEach((c, i) => { g.fillStyle = c; g.fillRect(i * W / 7, 0, W / 7 + 1, H * 0.7); });
          g.fillStyle = '#111';
          g.fillRect(0, H * 0.7, W, H * 0.3);
          g.fillStyle = '#eee';
          g.font = '28px DotGothic16, monospace';
          g.fillText('ひかり放送  本日の放送は終了しました', 40, H * 0.86);
        },
      },
      12: {
        name: 'ライブカメラ',
        beckon: 0,
        start() { this._t0 = performance.now(); return { stop() {} }; },
        draw(g, t, W, H) {
          this.beckon = Math.min(1, t / 12);
          g.fillStyle = '#0b0f12';
          g.fillRect(0, 0, W, H);
          g.fillStyle = '#2b3036';
          g.fillRect(0, H * 0.62, W, H * 0.38);
          g.fillStyle = 'rgba(255,240,200,.9)';
          g.fillRect(W * 0.48, H * 0.18, 30, 8);
          g.fillStyle = '#ddd';
          g.font = '22px VT323, monospace';
          g.fillText('夏ヶ原駅  CAM 01', 24, 36);
        },
      },
    },
  };
}
