// 地下 (ちか, Chika) — station H05. Underground.
//
// You step off onto a tiled, tagged platform. Something is thumping behind the tunnel wall.
// Follow it down the track, through a strip curtain, into a basement show shot entirely on a
// cheap camera with the flash on. Hold to charge (the whole room crouches with you), release
// on the drop. Tap to take a blown-out photo that slaps onto the wall of the night.
//
// The light: charge to full during the build and let go exactly on the beat switch.
// The room flashes white, one beat of silence, and then everyone jumps.

import { Music, BEAT } from './rage/music.js';
import { Venue, COL, PIT } from './rage/venue.js';
import { Outside, camAt, HALL_END, CURTAIN_Z } from './rage/outside.js';
import { Post } from './rage/post.js';
import * as ART from './rage/art.js';
import { CAPS, FLIER, HINTS, FLIER_EN, HINTS_EN } from './rage/text.js';
import { CSS } from './rage/style.js';
import { clamp, lerp, damp, makeCanvas, fontsReady, digicamDate, mixRGB } from './rage/util.js';
import { hideGloss } from '../lib/jp.js';

const LIGHT_LINE = 'one beat of silence, then everyone jumped';
const HOLD = 0.17;

// Everything with type on it (rebuilt once the web fonts arrive, if they were late).
function textTextures(sneakerLit) {
  return {
    banner: ART.banner(),
    phoneBan: ART.phoneBan(),
    flier: ART.flier(5),
    stationSign: ART.stationSign(),
    lineMap: ART.lineMap(),
    missing: ART.missingPoster(sneakerLit),
    tvPoster: ART.tvPoster(),
    venueArrow: ART.venueArrow(),
    staffSign: ART.staffSign(),
    vending: ART.vending(),
    exitSign: ART.exitSign(),
    tagBubble: ART.graffiti('bubble', 0),
    tagBubble2: ART.graffiti('bubble', 1),
    tagGoth: ART.graffiti('goth', 0),
    archTag: ART.graffiti('goth', 1),
    tagGlitch: ART.graffiti('glitch', 0),
    tagGlitch2: ART.graffiti('glitch', 1),
  };
}
function buildTextures() {
  const sneakerLit = ART.sneaker(true);
  return {
    concrete: ART.concrete(512, 150, 11),
    tagScrawl: ART.graffiti('tag', 1),
    tagScrawl2: ART.graffiti('tag', 2),
    haze: ART.haze(),
    sneakerLit,
    sneakerDim: ART.sneaker(false),
    ...textTextures(sneakerLit),
  };
}

export default {
  id: 'rage',
  mount(root, ctx) {
    const { signal } = ctx;
    const jp = (s) => (ctx.jp && ctx.jp.html ? ctx.jp.html(s) : s.replace(/\[([^\[\]|]+)\|[^\[\]|]*\|[^\[\]]*\]/g, '$1'));
    root.classList.add('rg');
    const desk = !(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

    root.innerHTML = `
      <style>${CSS}</style>
      <canvas class="rg-gl"></canvas>
      <div class="rg-white"></div>
      <div class="rg-wall"></div>
      <div class="rg-coll"></div>
      <svg class="rg-scrib" xmlns="http://www.w3.org/2000/svg"></svg>
      <div class="rg-caps"></div>
      <div class="rg-count"></div>
      <div class="rg-osd">
        <div class="frame"><i></i><i></i><i></i><i></i></div>
        <div class="af"></div>
        <div class="tl"><span class="rec">REC</span> <span class="tc">00:00:00</span><br><span class="bat"></span><span class="iso">ISO 6400</span></div>
        <div class="bl"><span class="sh">1/8</span>&nbsp;&nbsp;F2.0&nbsp;&nbsp;<span class="fm">⚡AUTO</span></div>
        <div class="date"></div>
      </div>
      <div class="rg-meter"><div class="max">MAX</div><div class="bar"><div class="mark"></div><div class="fill"></div></div><div class="pct">0%</div><div class="lab">溜め</div></div>
      <div class="rg-hint"></div>
      <div class="rg-ui">
        <button class="rg-btn rg-roll-btn" type="button">roll <b class="n">0</b></button>
        <button class="rg-btn rg-low-btn" type="button">flash: <b>high</b></button>
      </div>
      <div class="rg-torn" title="the flier"><b>地下</b><i>vol.∞</i><small>tonight's aux: OsamaSon / Nine Vicious / Che / Nettspend / …</small></div>
      <div class="rg-ftag">← 地下 vol.∞ (tap to read)</div>
      <div class="rg-modal rg-flier-modal"></div>
      <div class="rg-roll"></div>
    `;
    const $ = (s) => root.querySelector(s);
    const glCanvas = $('.rg-gl');
    const whiteEl = $('.rg-white');
    const wallEl = $('.rg-wall');
    const collEl = $('.rg-coll');
    const scribEl = $('.rg-scrib');
    const capsEl = $('.rg-caps');
    const countEl = $('.rg-count');
    const tcEl = $('.rg-osd .tc'), isoEl = $('.rg-osd .iso'), shEl = $('.rg-osd .sh'), fmEl = $('.rg-osd .fm'), dateEl = $('.rg-osd .date'), afEl = $('.rg-osd .af');
    const meterEl = $('.rg-meter'), fillEl = $('.rg-meter .fill'), pctEl = $('.rg-meter .pct');
    const hintEl = $('.rg-hint');
    const rollBtn = $('.rg-roll-btn'), rollN = $('.rg-roll-btn .n'), lowBtn = $('.rg-low-btn');
    const tornEl = $('.rg-torn'), ftagEl = $('.rg-ftag');
    const flierModal = $('.rg-flier-modal'), rollEl = $('.rg-roll');
    if (ctx.jp && ctx.jp.attach) ctx.jp.attach(root);

    // ── the world ──────────────────────────────────────────────
    const tex = buildTextures();
    const fontsIn = () => { try { return ART.FONT_SPECS.every(([f, t]) => document.fonts.check(f, t)); } catch (e) { return true; } };
    if (document.fonts && !fontsIn()) fontsReady(ART.FONT_SPECS).then(() => { if (!signal.aborted) Object.assign(tex, textTextures(tex.sneakerLit)); });
    const venue = new Venue(tex);
    const outside = new Outside(tex);
    const scene = makeCanvas(640, 360);
    let sg = scene.getContext('2d', { alpha: false });
    const post = new Post(glCanvas);
    if (!post.ok) {
      glCanvas.replaceWith(scene);
      scene.className = 'rg-gl';
    }
    const music = new Music(ctx.audio, ctx.out, ctx.send);
    music.setPlace(0, true);
    ctx.interval(() => music.tick(), 25);
    music.tick();

    // ── state ──────────────────────────────────────────────────
    const S = {
      t: 0, phase: 'out', outZ: 4, walkV: 0, walkHold: 0, walkPhase: 0,
      cam: { x: 0, y: 2.2, z: 0.4, yaw: 0, pitch: 0 }, cvx: 0, cvz: 0, fwd: 0, dyaw: 0,
      lookX: 0, charge: 0, charging: false, jump: 0, punch: 0, shake: 0,
      kick: 0, clap: 0, flash: 0, postFlash: 0, white: 0, mosh: 0, moshSeed: 1, tear: 0, hazeBoost: 0,
      low: !!ctx.store.get('flashLow', !!ctx.reduced), cut: false, lastNote: 75,
      peakStage: null, peak: 0, peakRise: 0, peakBack: 0, whiteHold: 0, frozenBeats: 0,
      shootPending: false, lastShot: -9, shots: ctx.store.get('shots', 0) | 0,
      enterT: 0, part: 0, flick: 1, nextFlick: 0, nextDrip: 3, nextIdle: 9, recT: 0,
      seen: {}, switchesHeard: 0, builds: 0, chargedThisBuild: false, nextBump: 0,
      L: { a: COL.red, b: COL.acid, wash: COL.red, int: 0.5, beamInt: 0.7, laser: 0, laserCol: COL.acid, sweep: 0.6, fanCenter: 0, fanSpread: 1, tilt: 0, wobble: 0.02 },
    };
    const keys = {};
    const photos = [];
    let modal = null;
    let W = 1, H = 1, SW = 1, SH = 1;

    // ── layout ─────────────────────────────────────────────────
    function resize(w, h) {
      W = Math.max(1, w); H = Math.max(1, h);
      const s = Math.min(1, Math.sqrt(470000 / (W * H)));
      SW = Math.max(200, Math.round(W * s)); SH = Math.max(150, Math.round(H * s));
      scene.width = SW; scene.height = SH;
      sg = scene.getContext('2d', { alpha: false });
      const q = Math.min(ctx.dpr || 1, 1.5);
      let ow = Math.round(W * q), oh = Math.round(H * q);
      if (ow > 2400) { oh = Math.round((oh * 2400) / ow); ow = 2400; }
      post.resize(SW, SH, ow, oh);
    }
    resize(ctx.w || root.clientWidth, ctx.h || root.clientHeight);

    // ── photosensitivity: every bright full-frame flash goes through here (≤ 3 / second) ──
    const flashLog = [];
    function flashOK() {
      const now = performance.now();
      while (flashLog.length && now - flashLog[0] > 1000) flashLog.shift();
      if (flashLog.length >= 3) return false;
      flashLog.push(now);
      return true;
    }
    function strobe(amount) {
      if (!flashOK()) return false;
      S.white = Math.max(S.white, amount * (S.low ? 0.2 : 1));
      return true;
    }
    function setLow(v) {
      S.low = v;
      ctx.store.set('flashLow', v);
      lowBtn.innerHTML = `flash: <b>${v ? 'low' : 'high'}</b>`;
      lowBtn.classList.toggle('low', v);
    }
    setLow(S.low);

    // ── captions, stickers, scribbles ──────────────────────────
    const caps = [];
    const pools = {};
    function from(name) {
      const src = CAPS[name];
      if (!pools[name] || !pools[name].length) pools[name] = src.slice().sort(() => Math.random() - 0.5);
      return pools[name].pop();
    }
    function cap(entry, opt = {}) {
      if (!entry || signal.aborted) return null;
      const [jaText, style, enText] = entry;
      const text = ctx.en && enText ? enText : jaText;
      while (caps.length >= 3) dropCap(caps[0]);
      const el = document.createElement('div');
      el.className = `rg-cap cap-${style}${opt.cls ? ' ' + opt.cls : ''}`;
      el.innerHTML = jp(text);
      const rot = opt.rot ?? (Math.random() - 0.5) * 9;
      el.style.setProperty('--rot', `${rot}deg`);
      capsEl.appendChild(el);
      const r = el.getBoundingClientRect();
      const cw = r.width || 200, chh = r.height || 40;
      let x, y;
      if (opt.x != null) { x = opt.x; y = opt.y; }
      else {
        for (let k = 0; k < 8; k++) {
          x = W * (0.05 + Math.random() * 0.62);
          y = H * (0.14 + Math.random() * 0.6);
          const cx = x + cw / 2, cy = y + chh / 2;
          const inCenter = cx > W * 0.3 && cx < W * 0.7 && cy > H * 0.3 && cy < H * 0.62;
          if (!inCenter || k === 7) break;
        }
      }
      x = clamp(x, 10, Math.max(10, W - cw - 10)); y = clamp(y, 56, Math.max(56, H - chh - 90));
      el.style.left = `${x}px`; el.style.top = `${y}px`;
      const c = { el, arrow: null };
      if (opt.target) c.arrow = scribble(x, y, cw, chh, opt.target);
      caps.push(c);
      c.timer = ctx.timeout(() => dropCap(c), opt.dur || 2600);
      return c;
    }
    function dropCap(c) {
      const i = caps.indexOf(c);
      if (i < 0) return;
      caps.splice(i, 1);
      if (c.el.querySelector('.jt-on')) hideGloss();
      c.el.classList.add('out');
      if (c.arrow) c.arrow.style.opacity = '0';
      setTimeout(() => { c.el.remove(); if (c.arrow) c.arrow.remove(); }, 360);
    }
    function clearCaps() { while (caps.length) dropCap(caps[0]); }
    function scribble(x, y, cw, chh, [tx, ty]) {
      const cx = x + cw / 2, cy = y + chh / 2;
      const ang = Math.atan2(ty - cy, tx - cx);
      const sx = cx + Math.cos(ang) * (cw / 2 + 6) * 0.9, sy = cy + Math.sin(ang) * (chh / 2 + 6);
      const d = Math.hypot(tx - sx, ty - sy);
      if (d < 40) return null;
      const ex = tx - Math.cos(ang) * 16, ey = ty - Math.sin(ang) * 16;
      const mx = (sx + ex) / 2 - Math.sin(ang) * d * 0.25, my = (sy + ey) / 2 + Math.cos(ang) * d * 0.25;
      const ea = Math.atan2(ey - my, ex - mx);
      const hx1 = ex - Math.cos(ea - 0.5) * 16, hy1 = ey - Math.sin(ea - 0.5) * 16;
      const hx2 = ex - Math.cos(ea + 0.5) * 16, hy2 = ey - Math.sin(ea + 0.5) * 16;
      const dd = `M${sx.toFixed(1)} ${sy.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)} M${hx1.toFixed(1)} ${hy1.toFixed(1)} L${ex.toFixed(1)} ${ey.toFixed(1)} L${hx2.toFixed(1)} ${hy2.toFixed(1)}`;
      const gEl = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      gEl.style.transition = 'opacity .3s';
      for (const [col, w] of [['#000', 7], ['#d8ff3a', 3.2]]) {
        const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        p.setAttribute('d', dd); p.setAttribute('stroke', col); p.setAttribute('stroke-width', w);
        p.style.strokeDasharray = '1400'; p.style.strokeDashoffset = '1400';
        p.style.transition = 'stroke-dashoffset .45s ease-out';
        gEl.appendChild(p);
        requestAnimationFrame(() => { p.style.strokeDashoffset = '0'; });
      }
      scribEl.appendChild(gEl);
      return gEl;
    }
    const STK = [['circle', '地下'], ['star', '∞'], ['rect', 'AUX'], ['stamp', '限定'], ['face', ''], ['circle', '光'], ['rect', '808'], ['stamp', '始発まで']];
    function sticker() {
      const [kind, text] = STK[Math.floor(Math.random() * STK.length)];
      const el = document.createElement('div');
      el.className = `rg-stk ${kind}`;
      if (kind === 'face') {
        el.innerHTML = `<svg viewBox="0 0 100 100" width="100%" height="100%"><circle cx="50" cy="50" r="46" fill="#ffe600" stroke="#fff" stroke-width="6"/><path d="M28 32l14 14M42 32L28 46M58 32l14 14M72 32L58 46" stroke="#111" stroke-width="6" stroke-linecap="round"/><path d="M28 64q22 20 44 0" fill="none" stroke="#111" stroke-width="6" stroke-linecap="round"/></svg>`;
      } else el.textContent = text;
      const edge = Math.floor(Math.random() * 4);
      const u = 0.12 + Math.random() * 0.76;
      let x = edge === 0 ? u * W : edge === 1 ? W - 90 - Math.random() * 40 : edge === 2 ? u * W : 20 + Math.random() * 50;
      let y = edge === 0 ? 70 + Math.random() * 40 : edge === 1 ? u * H : edge === 2 ? H - 150 - Math.random() * 40 : u * H;
      el.style.left = `${clamp(x, 10, W - 110)}px`; el.style.top = `${clamp(y, 60, H - 140)}px`;
      el.style.setProperty('--r', `rotate(${((Math.random() - 0.5) * 40).toFixed(1)}deg)`);
      el.style.transform = 'var(--r)';
      collEl.appendChild(el);
      const all = collEl.querySelectorAll('.rg-stk');
      if (all.length > 7) all[0].remove();
      music.slap(0.7);
    }

    // ── camera: flash photos onto the wall ─────────────────────
    function shoot() {
      if (S.t - S.lastShot < 0.42) return;
      S.lastShot = S.t;
      S.shootPending = true;
      music.shutter();
      afEl.classList.add('lock');
      ctx.timeout(() => afEl.classList.remove('lock'), 350);
    }
    function slot(n) {
      const pw = clamp(W * 0.15, 92, 210), ph = (pw * H) / W;
      const m = 12, left = m, right = W - pw - m, top = 70, bottom = H - ph - 80;
      const ww = Math.max(1, right - left), hh = Math.max(1, bottom - top);
      let d = ((n * 0.61803398875 + 0.07) % 1) * (2 * ww + 2 * hh);
      let x, y;
      if (d < ww) { x = left + d; y = top; }
      else if ((d -= ww) < hh) { x = right; y = top + d; }
      else if ((d -= hh) < ww) { x = right - d; y = bottom; }
      else { d -= ww; x = left; y = bottom - d; }
      return { x: x + (Math.random() - 0.5) * 24, y: y + (Math.random() - 0.5) * 24, s: pw / W, r: (Math.random() - 0.5) * 18 };
    }
    function capture(src) {
      const long = 440;
      const pw = W >= H ? long : Math.round((long * W) / H), ph = W >= H ? Math.round((long * H) / W) : long;
      const c = makeCanvas(pw, ph), g = c.getContext('2d');
      try { g.drawImage(src, 0, 0, pw, ph); } catch (e) { return; }
      const d = digicamDate();
      g.font = `${Math.round(Math.min(pw, ph) * 0.085)}px VT323, "DotGothic16", monospace`;
      g.textAlign = 'right'; g.textBaseline = 'bottom';
      g.shadowColor = 'rgba(255,120,20,0.9)'; g.shadowBlur = 6;
      g.fillStyle = '#ff9a2a';
      g.fillText(`${d.date}   ${d.time}`, pw * 0.95, ph * 0.95);
      const n = ++S.shots;
      ctx.store.set('shots', n);
      const el = document.createElement('div');
      el.className = 'rg-photo' + (S.low ? ' dim' : '');
      el.style.width = `${W}px`; el.style.height = `${H}px`; el.style.boxSizing = 'border-box';
      el.appendChild(c);
      wallEl.appendChild(el);
      let url = '';
      try { url = c.toDataURL('image/jpeg', 0.5); } catch (e) { url = ''; }
      photos.push({ url, n, d });
      if (photos.length > 60) photos.shift();
      rollN.textContent = String(photos.length);
      const live = wallEl.querySelectorAll('.rg-photo');
      if (live.length > 14) live[0].remove();
      ctx.timeout(() => {
        const s = slot(n);
        el.classList.add('slap', 'print');
        el.classList.remove('dim');
        el.style.transform = `translate(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px) rotate(${s.r.toFixed(1)}deg) scale(${s.s.toFixed(4)})`;
        ctx.timeout(() => music.slap(), 330);
      }, 380);
      if (!S.peakStage && (photos.length === 1 || Math.random() < 0.3)) ctx.timeout(() => cap(from('photo')), 900);
    }

    // ── modals ─────────────────────────────────────────────────
    function openFlier() {
      if (!flierModal.firstChild) {
        const names = ART.LINEUP.map((n) => `<span>${n}</span>`).join(' <em>/</em> ');
        const E = ctx.en;
        flierModal.innerHTML = `<div class="rg-fl">
          <div class="top">${E ? FLIER_EN.top : jp(FLIER.top)}<span class="x">close</span></div>
          <h1>地下<span>vol.∞</span></h1>
          ${E ? '<div class="sub" style="margin-top:-2px;font-family:\'IBM Plex Mono\',monospace;font-weight:500;font-size:13px">CHIKA (underground) · vol. ∞</div>' : ''}
          <div class="sub">${E ? FLIER_EN.sub : jp(FLIER.sub)}</div>
          <div class="ph"></div>
          <div class="aux">TONIGHT'S AUX <span>${E ? FLIER_EN.aux : jp(FLIER.auxJP)}</span></div>
          <div class="names">${names}<span class="you">+ you, if you ask nicely</span></div>
          <div class="info">${E ? FLIER_EN.info : jp(FLIER.info)}</div>
          <ul>${(E ? FLIER_EN.notes : FLIER.notes.map(jp)).map((n) => `<li>${n}</li>`).join('')}</ul>
          ${E ? '' : `<div class="en">${FLIER.en}</div>`}
        </div>`;
        flierModal.querySelector('.ph').appendChild(ART.xeroxCrowd(408, 150, 12));
        flierModal.querySelector('.rg-fl').addEventListener('pointerdown', (e) => { if (!e.target.closest('.x')) e.stopPropagation(); }, { signal });
      }
      flierModal.classList.add('on');
      modal = 'flier';
      music.slap(0.6);
    }
    function openRoll() {
      rollEl.innerHTML = (ctx.en ? `<h2>Camera roll<small>${photos.length} ${photos.length === 1 ? 'photo' : 'photos'} · tap anywhere to close</small></h2>` : `<h2>カメラロール<small>camera roll · ${photos.length} 枚 · tap anywhere to close</small></h2>`) +
        (photos.length ? `<div class="grid">${photos.slice().reverse().map((p) => `<figure style="transform:rotate(${((p.n * 37) % 9) - 4}deg)">${p.url ? `<img src="${p.url}" alt="">` : ''}<figcaption>IMG_${String(p.n).padStart(4, '0')}.JPG</figcaption></figure>`).join('')}</div>`
          : `<div class="empty">no photos yet. tap (don't hold) to fire the flash.</div>`);
      rollEl.classList.add('on');
      modal = 'roll';
    }
    function closeModal() {
      flierModal.classList.remove('on'); rollEl.classList.remove('on');
      modal = null;
    }
    flierModal.addEventListener('pointerdown', (e) => { e.stopPropagation(); closeModal(); }, { signal });
    rollEl.addEventListener('pointerdown', (e) => { e.stopPropagation(); closeModal(); }, { signal });
    rollBtn.addEventListener('pointerdown', (e) => e.stopPropagation(), { signal });
    lowBtn.addEventListener('pointerdown', (e) => e.stopPropagation(), { signal });
    tornEl.addEventListener('pointerdown', (e) => e.stopPropagation(), { signal });
    ftagEl.addEventListener('pointerdown', (e) => e.stopPropagation(), { signal });
    rollBtn.addEventListener('click', () => (modal === 'roll' ? closeModal() : openRoll()), { signal });
    lowBtn.addEventListener('click', () => setLow(!S.low), { signal });
    tornEl.addEventListener('click', openFlier, { signal });
    ftagEl.addEventListener('click', openFlier, { signal });

    // ── input ──────────────────────────────────────────────────
    let press = null;
    const isUI = (e) => e.target && e.target.closest && e.target.closest('.rg-btn, .rg-torn, .rg-ftag, .rg-modal, .rg-roll, .jt');
    function pressStart(kind, x, y) {
      if (press || modal) return;
      if (ctx.audio && ctx.audio.resume) ctx.audio.resume();
      press = { kind, t0: S.t, x, y, lx: x, ly: y, moved: false, dist: 0 };
    }
    function pressMove(x, y) {
      if (!press || press.kind !== 'pointer') return;
      const dx = x - press.lx, dy = y - press.ly;
      press.lx = x; press.ly = y;
      press.dist += Math.hypot(dx, dy);
      if (!press.moved && press.dist > 12 && S.charge < 0.12) { press.moved = true; S.charging = false; }
      if (press.moved) {
        if (S.phase === 'in') {
          S.cam.x = clamp(S.cam.x + dx * 0.012, -5.6, 5.6);
          S.cam.z = clamp(S.cam.z - dy * 0.014 / (1 + venue.nearCrowd * 0.6), 0.3, 12.2);
          S.fwd = -dy * 0.5;
        } else {
          S.outZ = clamp(S.outZ - dy * 0.03, 3, CURTAIN_Z - 0.2);
          S.walkPhase += Math.abs(dy) * 0.02;
        }
      }
    }
    function pressEnd() {
      if (!press) return;
      const p = press;
      press = null;
      const dur = S.t - p.t0;
      if (!p.moved && dur < HOLD) tap(p);
      else if (S.charging) releaseCharge();
      S.charging = false;
    }
    function tap(p) {
      if (S.phase !== 'in' && outside.flierRect && p.kind === 'pointer') {
        const r = outside.flierRect, kx = W / SW, ky = H / SH;
        if (p.x >= r[0] * kx - 10 && p.x <= r[2] * kx + 10 && p.y >= r[1] * ky - 10 && p.y <= r[3] * ky + 10) { openFlier(); return; }
      }
      shoot();
      hintSeen.flash = true;
    }
    root.addEventListener('pointerdown', (e) => {
      if (isUI(e)) return;
      if (modal) return;
      try { root.setPointerCapture(e.pointerId); } catch (err) {}
      const r = root.getBoundingClientRect();
      pressStart('pointer', e.clientX - r.left, e.clientY - r.top);
    }, { signal });
    root.addEventListener('pointermove', (e) => {
      const r = root.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      if (e.pointerType === 'mouse') S.lookX = clamp((x / W) * 2 - 1, -1, 1);
      pressMove(x, y);
    }, { signal });
    root.addEventListener('pointerup', () => pressEnd(), { signal });
    root.addEventListener('pointercancel', () => { press = null; if (S.charging) releaseCharge(); S.charging = false; }, { signal });
    root.addEventListener('contextmenu', (e) => e.preventDefault(), { signal });
    const keyName = (e) => (e.key.length === 1 ? e.key.toLowerCase() : e.key);
    window.addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = keyName(e);
      if (k === 'Escape' || k === 'm') return; // the shell's
      if (k === ' ') {
        e.preventDefault();
        if (!e.repeat) { if (modal) closeModal(); else pressStart('key', W / 2, H / 2); }
        return;
      }
      if (e.repeat) { if ('wasd'.includes(k) || k.startsWith('Arrow')) e.preventDefault(); keys[k] = true; return; }
      if (k === 'f') { if (!modal) shoot(); return; }
      if (k === 'r') { modal === 'roll' ? closeModal() : (closeModal(), openRoll()); return; }
      if (k === 'l') { setLow(!S.low); return; }
      if (k === 'Enter' && modal) { closeModal(); return; }
      if ('wasd'.includes(k) || k.startsWith('Arrow')) { e.preventDefault(); keys[k] = true; hintSeen.move = true; }
    }, { signal });
    window.addEventListener('keyup', (e) => {
      const k = keyName(e);
      if (k === ' ') { e.preventDefault(); pressEnd(); return; }
      keys[k] = false;
    }, { signal });
    window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; if (press) pressEnd(); }, { signal });

    // ── charge & release ───────────────────────────────────────
    function releaseCharge() {
      const c = S.charge;
      S.charging = false;
      if (S.phase !== 'in' || S.peakStage) { S.charge = 0; return; }
      const heard = music.heard();
      const ts = music.switchNear(heard);
      const off = ts == null ? 99 : (heard - ts) / BEAT;
      if (c >= 0.9 && off >= -0.45 && off <= 0.4) { S.charge = 0; music.setCharge(0); startPeak(ts); return; }
      music.release(c);
      S.jump = Math.max(S.jump, c);
      S.punch = Math.max(S.punch, c);
      S.shake = Math.max(S.shake, c * 0.8);
      S.tear = Math.max(S.tear, c * 0.55);
      if (c > 0.55 && !ctx.reduced) { S.mosh = Math.max(S.mosh, c * 0.32); S.moshSeed = Math.random() * 100; }
      if (c > 0.6) strobe(0.35 * c);
      if (c >= 0.45) {
        const pos = music.pos(heard);
        if (pos) {
          const ph = pos.beatPhase;
          const dB = Math.min(ph, 1 - ph) * BEAT;
          const [g, cls] = dB < 0.05 ? ['300', 'g300'] : dB < 0.1 ? ['100', 'g100'] : dB < 0.16 ? ['50', 'g50'] : ['×', 'gx'];
          const mr = meterEl.getBoundingClientRect(), rr = root.getBoundingClientRect();
          cap([g, 'grade'], { cls, x: mr.right - rr.left + 14, y: H * 0.42, rot: -6, dur: 900 });
        }
        if (c >= 0.9 && Math.abs(off) < 3) ctx.timeout(() => cap(from(off < 0 ? 'early' : 'late')), 500);
        if (c > 0.85 && Math.random() < 0.4 && venue.throwSneaker(S.cam)) sneakerCaption();
        if (c > 0.8 && Math.random() < 0.5) sticker();
      }
      S.charge = 0;
      hintSeen.charge = true;
    }

    function startPeak(ts) {
      const now = music.ac.currentTime;
      let back = ts + BEAT;
      while (back < now + 0.1) back += BEAT;
      music.perfect(back);
      S.peakStage = 'silence';
      S.peakBack = back;
      S.whiteHold = S.low ? 0.45 : 1;
      S.white = S.whiteHold;
      flashOK();
      const pos = music.pos();
      S.frozenBeats = pos ? pos.beats : 0;
      S.frozenT = S.t;
      S.mosh = 0; S.tear = 0; S.shake = 0;
      clearCaps();
      countEl.innerHTML = '';
      S.peakShot = false;
    }
    function peakLand() {
      S.peakStage = 'rise';
      S.peak = 1; S.peakRise = 0;
      S.jump = 1; S.punch = 1; S.shake = 0.9; S.tear = 0.4;
      S.white = 0;
      if (!ctx.reduced) { S.mosh = 0.45; S.moshSeed = Math.random() * 100; }
      venue.throwSneaker(S.cam);
      for (let i = 0; i < 3; i++) ctx.timeout(sticker, 250 + i * 260);
      ctx.timeout(() => {
        const first = ctx.award(LIGHT_LINE);
        const n = (ctx.store.get('peaks', 0) | 0) + 1;
        ctx.store.set('peaks', n);
        if (!first) cap(['again. the room remembers you', 'clean'], { x: W * 0.5 - 150, y: H * 0.2, rot: 0, dur: 3200 });
      }, 650);
      ctx.timeout(() => cap(from('after'), { x: W * 0.5 - 120, y: H * 0.22, rot: 0, dur: 4200 }), 3600);
    }

    // ── music → visuals ────────────────────────────────────────
    function onCue(c, pos) {
      const inside = S.phase === 'in';
      if (S.peakStage === 'silence' && c.type !== 'bar') return;
      switch (c.type) {
        case 'kick': S.kick = 1; S.shake = Math.max(S.shake, inside ? 0.12 * (S.low ? 0.5 : 1) : 0.02); break;
        case 'clap':
          S.clap = 1;
          if (inside && pos && pos.sec.name === 'B' && !S.peakStage) strobe(0.42);
          break;
        case 'crash': if (inside) { S.hazeBoost = 1; if (!S.peakStage && c.v > 0.5) strobe(0.55); } break;
        case 'note': S.lastNote = c.m; break;
        case 'count':
          if (inside && !S.peakStage) {
            countEl.innerHTML = `<span class="n">${c.n}</span>${c.n === 4 ? '<span class="s">let go on the switch</span>' : ''}`;
            if (c.n === 4) S.cut = false;
          }
          break;
        case 'cut': S.cut = true; break;
        case 'switch':
          S.cut = false;
          S.switchesHeard++;
          if (inside && !S.peakStage) {
            countEl.innerHTML = '<span class="n sw">SWITCH</span>';
            ctx.timeout(() => { if (countEl.querySelector('.sw')) countEl.innerHTML = ''; }, 700);
            S.jump = Math.max(S.jump, 0.55);
            S.tear = Math.max(S.tear, 0.5);
            if (!ctx.reduced) { S.mosh = Math.max(S.mosh, 0.4); S.moshSeed = Math.random() * 100; }
            if (venue.throwSneaker(S.cam)) ctx.timeout(sneakerCaption, 350);
            if (!S.chargedThisBuild && S.switchesHeard <= 3) ctx.timeout(() => cap(['next time: hold through the build, let go ON the switch', 'hl'], { dur: 3400 }), 1400);
          }
          S.chargedThisBuild = false;
          break;
        case 'bar': onBar(c, pos); break;
      }
    }
    function onBar(c) {
      if (S.phase !== 'in' || S.peakStage) return;
      const { sec, i } = c;
      if (sec === 'BUILD' && i === 0) {
        S.builds++;
        countEl.innerHTML = '<span class="soon">BEAT SWITCH INCOMING</span>' + (S.builds <= 2 ? '<span class="s">hold to charge · let go on the switch</span>' : '');
        ctx.timeout(() => { if (countEl.querySelector('.soon')) countEl.innerHTML = ''; }, 2200);
      }
      if (sec === 'BUILD' && i === 1 && venue.marks.sign && (S.builds <= 2 || Math.random() < 0.3)) {
        const m = venue.marks.sign;
        cap(from('sign'), { target: [m[0] * W / SW, m[1] * H / SH], dur: 3200 });
      }
      if (sec === 'B' && i === 2 && Math.hypot(S.cam.x - PIT.x, S.cam.z - PIT.z) < 7) cap(from('pitOpen'));
      if (sec === 'B' && i === 4) {
        if (Math.hypot(S.cam.x - PIT.x, S.cam.z - PIT.z) < 7) cap(from('pitMosh'));
        if (!ctx.reduced) { S.mosh = Math.max(S.mosh, 0.25); S.moshSeed = Math.random() * 100; }
      }
      if (sec === 'B' && i === 5) { venue.launchSurfer(S.cam); if (Math.random() < 0.5) ctx.timeout(() => cap(from('surfer')), 600); }
      if (sec === 'B' && i === 6 && Math.random() < 0.5 && venue.throwSneaker(S.cam)) ctx.timeout(sneakerCaption, 300);
      if (sec === 'A' && i === 4 && Math.random() < 0.5) sticker();
    }
    function sneakerCaption() {
      const m = venue.marks.sneaker;
      cap(from('sneaker'), m ? { target: [m[0] * W / SW, m[1] * H / SH] } : {});
    }

    // ── lights ─────────────────────────────────────────────────
    function lights(pos) {
      const L = S.L;
      const sec = pos ? pos.sec.name : 'A', i = pos ? pos.sec.i : 0, bar = pos ? pos.bar : 0;
      const kk = S.kick * (S.low ? 0.45 : 1);
      if (sec === 'A') {
        const alt = bar % 2;
        L.a = alt ? COL.red : COL.acid; L.b = alt ? COL.acid : COL.red; L.wash = COL.red;
        L.int = 0.5 + kk * 0.35; L.beamInt = 0.75; L.laser = i >= 4 ? 0.85 : 0; L.laserCol = COL.acid; L.sweep = 0.55;
      } else if (sec === 'BUILD') {
        const u = (i + (pos ? pos.barPhase : 0)) / 4;
        L.a = mixRGB(COL.white, COL.red, 0.25); L.b = COL.white; L.wash = mixRGB(COL.violet, COL.white, u * 0.6);
        L.int = 0.32 + u * 0.55 + kk * 0.2; L.beamInt = 0.35 + u * 0.65; L.laser = 0.45 + u * 0.55; L.laserCol = COL.acid; L.sweep = 0.8 + u * 3;
        if (S.cut) { L.int = 0.06; L.beamInt = 0; L.laser = 0; }
      } else if (sec === 'B') {
        const alt = bar % 2;
        L.a = COL.violet; L.b = alt ? COL.red : COL.pink; L.wash = COL.violet;
        L.int = 0.62 + kk * 0.38; L.beamInt = 0.9; L.laser = 1; L.laserCol = alt ? COL.red : COL.acid; L.sweep = 1.05;
        if (!S.low && pos) L.laser *= pos.beatPhase < 0.6 ? 1 : 0.3;
      } else {
        L.a = COL.blue; L.b = COL.violet; L.wash = COL.blue;
        L.int = 0.26 + kk * 0.1; L.beamInt = 0.3; L.laser = 0; L.laserCol = COL.blue; L.sweep = 0.25;
      }
      if (S.peak > 0) {
        const k = S.peak;
        // after the first hit the room dims to amber so the light is the brightest thing in it
        const f = clamp((S.peakRise - 0.05) / 0.3) * k;
        L.a = mixRGB(L.a, [255, 240, 210], k); L.b = mixRGB(L.b, [255, 228, 190], k); L.wash = mixRGB(L.wash, [255, 214, 170], k * 0.8);
        L.int = lerp(L.int, 0.95, k); L.laserCol = mixRGB(L.laserCol, [255, 245, 220], k); L.laser = Math.max(L.laser, k * 0.85); L.beamInt = Math.max(L.beamInt, k);
        L.a = mixRGB(L.a, [255, 170, 80], f * 0.6); L.b = mixRGB(L.b, [255, 140, 70], f * 0.6); L.wash = mixRGB(L.wash, [120, 60, 30], f * 0.6);
        L.int = lerp(L.int, 0.3, f); L.beamInt = lerp(L.beamInt, 0.25, f); L.laser = lerp(L.laser, 0.15, f);
      }
      if (S.peakStage === 'silence') { L.int = 0.04; L.beamInt = 0; L.laser = 0; }
      L.fanCenter = Math.sin(S.t * 0.45) * 0.35 + (S.lastNote - 75) * 0.035;
      L.fanSpread = 1.05 + 0.35 * Math.sin(S.t * 0.31);
      L.tilt = -0.035 + 0.075 * Math.sin(S.t * 0.6);
      L.wobble = sec === 'BUILD' ? 0.05 : 0.015;
      return L;
    }
    function doorLight(pos) {
      const sec = pos ? pos.sec.name : 'A', bar = pos ? pos.bar : 0;
      const col = sec === 'B' ? (bar % 2 ? COL.violet : COL.red) : sec === 'BUILD' ? mixRGB(COL.white, COL.violet, 0.4) : sec === 'BREAK' ? COL.blue : bar % 2 ? COL.red : COL.acid;
      return [col, 0.5 + S.kick * (S.low ? 0.25 : 0.6)];
    }

    // ── per-frame ──────────────────────────────────────────────
    const hintSeen = {};
    let hintText = '';
    function setHint(txt) { if (txt !== hintText) { hintText = txt; hintEl.textContent = txt; } }
    let dateTick = -99;

    function updateOutside(dt, pos) {
      const fwd = keys.w || keys.ArrowUp, back = keys.s || keys.ArrowDown;
      const holding = press && !press.moved && S.t - press.t0 > HOLD && !modal;
      let want = 0;
      if (fwd || holding) want = 1;
      if (back) want = -0.6;
      S.walkHold = want > 0 ? S.walkHold + dt : 0;
      const maxSp = 2.6 + Math.min(1, S.walkHold / 2) * 2.4;
      S.walkV = damp(S.walkV, want * maxSp, 3.2, dt);
      if (S.phase === 'enter') S.walkV = Math.max(S.walkV, 1.8);
      S.outZ = clamp(S.outZ + S.walkV * dt, 3, CURTAIN_Z - 0.15);
      S.walkPhase += Math.abs(S.walkV) * dt * 2.1;
      if (Math.abs(S.walkV) > 0.3) hintSeen.walk = true;
      const c = camAt(S.outZ);
      const pathYaw = S.outZ < HALL_END - 6 ? -0.07 : S.outZ < HALL_END ? lerp(-0.07, 0.04, (S.outZ - HALL_END + 6) / 6) : 0;
      S.cam.yaw = damp(S.cam.yaw, pathYaw + S.lookX * 0.22, 3, dt);
      S.cam.x = c.x; S.cam.z = S.outZ;
      S.cam.y = c.y + Math.sin(S.walkPhase * Math.PI) * 0.035 * Math.min(1, Math.abs(S.walkV));
      S.cam.pitch = 0;
      music.setPlace(Math.min(0.97, ((S.outZ - 3) / (CURTAIN_Z - 3)) * 0.97));
      if (S.outZ > HALL_END - 3 && S.t > S.nextDrip) { music.drip(); S.nextDrip = S.t + 1.6 + Math.random() * 4; }
      if (S.t > S.nextFlick) { S.flick = S.flick > 0.5 ? 0.12 : 1; S.nextFlick = S.t + (S.flick > 0.5 ? 0.6 + Math.random() * 2.5 : 0.08 + Math.random() * 0.25); }
      if (S.outZ > 33 && !S.seen.tunnel) { S.seen.tunnel = true; cap(from('tunnel')); }
      if (S.phase === 'out' && S.outZ >= CURTAIN_Z - 1.1) { S.phase = 'enter'; S.enterT = 0; music.curtain(); }
      if (S.phase === 'enter') {
        S.enterT += dt;
        S.part = clamp(S.enterT / 0.32);
        if (S.enterT > 0.34) goInside();
      }
      if (!S.seen.p1 && S.t > 2.5) { S.seen.p1 = true; cap(from('platform')); }
      if (!S.seen.p2 && S.t > 10 && S.outZ < HALL_END) { S.seen.p2 = true; cap(CAPS.platform[1]); }
    }

    function goInside() {
      S.phase = 'in';
      S.part = 0;
      music.setPlace(1, true);
      S.cam.x = 0.2; S.cam.z = 0.4; S.cam.y = 2.2; S.cam.yaw = 0;
      if (!ctx.reduced) { S.mosh = 0.9; S.moshSeed = Math.random() * 100; }
      S.tear = 0.6;
      strobe(0.45);
      meterEl.classList.add('on');
      tornEl.classList.add('on');
      ftagEl.classList.remove('on');
      ctx.timeout(() => cap(from('enter')), 500);
      ctx.store.set('inside', true);
      S.nextIdle = S.t + 8;
    }

    function updateInside(dt, pos) {
      const cam = S.cam;
      const ax = (keys.d || keys.ArrowRight ? 1 : 0) - (keys.a || keys.ArrowLeft ? 1 : 0);
      const az = (keys.w || keys.ArrowUp ? 1 : 0) - (keys.s || keys.ArrowDown ? 1 : 0);
      const slow = 1 / (1 + venue.nearCrowd * 0.8);
      S.cvx = damp(S.cvx, ax * 2.3 * slow, 5, dt);
      S.cvz = damp(S.cvz, az * 2.4 * slow, 5, dt);
      cam.x = clamp(cam.x + S.cvx * dt, -5.6, 5.6);
      cam.z = clamp(cam.z + S.cvz * dt, 0.3, 12.2);
      const moving = Math.hypot(S.cvx, S.cvz);
      S.walkPhase += moving * dt * 2.2;
      S.fwd = damp(S.fwd, S.cvz, 6, dt);
      const prevYaw = cam.yaw;
      cam.yaw = damp(cam.yaw, S.lookX * 0.16 + S.cvx * 0.03, 3.5, dt);
      S.dyaw = cam.yaw - prevYaw;
      cam.y = 2.2 + Math.sin(S.walkPhase * Math.PI) * 0.03 * Math.min(1, moving) + S.jump * 0.16 - S.charge * 0.14;
      cam.pitch = S.peak > 0 ? -0.05 * S.peak * S.peakRise : 0;
      // the pit, if you are in it
      if (venue.pit === 'mosh' && Math.hypot(cam.x - PIT.x, cam.z - PIT.z) < PIT.r + 0.6 && S.t > S.nextBump) {
        S.nextBump = S.t + 0.35 + Math.random() * 0.6;
        S.cvx += (Math.random() - 0.5) * 3.2; S.cvz += (Math.random() - 0.5) * 2;
        S.shake = Math.max(S.shake, ctx.reduced ? 0.15 : 0.55);
        music.bump();
      }
      // charging
      const holding = press && !press.moved && S.t - press.t0 > HOLD && !modal && !S.peakStage;
      if (holding && !S.charging) S.charging = true;
      if (S.charging) {
        S.charge = Math.min(1, S.charge + dt / 2.3);
        if (pos && pos.sec.name === 'BUILD') S.chargedThisBuild = true;
        if (S.charge > 0.5 && !S.seen.holdCap) { S.seen.holdCap = true; cap(from('holdHint'), { dur: 1600 }); }
      } else S.charge = Math.max(0, S.charge - dt * 3);
      S.shake = Math.max(S.shake, S.charge * S.charge * 0.6);
      // peak timeline
      if (S.peakStage === 'silence') {
        const heard = music.heard();
        const u = clamp((heard - (S.peakBack - BEAT)) / BEAT);
        S.white = S.whiteHold * (1 - 0.82 * u);
        S.flash = 1;
        if (!S.peakShot && u > 0.35) { S.peakShot = true; S.shootPending = true; music.shutter(); }
        if (heard >= S.peakBack) peakLand();
      } else if (S.peakStage === 'rise') {
        S.peakRise = Math.min(1, S.peakRise + dt / 4.8);
        if (S.peakRise >= 1) { S.peak = Math.max(0, S.peak - dt / 2.2); if (S.peak <= 0) S.peakStage = null; }
      }
      // things worth pointing at
      if (!S.peakStage && S.t > S.nextIdle && caps.length < 2) {
        S.nextIdle = S.t + 11 + Math.random() * 7;
        const m = venue.marks;
        const F = venue.F;
        const opts = [];
        const onScreen = (mk) => mk && mk[0] > SW * 0.1 && mk[0] < SW * 0.9 && mk[1] > SH * 0.12 && mk[1] < SH * 0.85;
        if (onScreen(m.scarf) && m.scarf[2] > F / 6.5 && (!S.seen.scarf || S.t - S.seen.scarf > 50)) opts.push('scarf');
        if (onScreen(m.chain) && m.chain[2] > F / 5 && (!S.seen.chain || S.t - S.seen.chain > 50)) opts.push('chain');
        if (opts.length && Math.random() < 0.8) {
          const k = opts[Math.floor(Math.random() * opts.length)];
          S.seen[k] = S.t;
          cap(from(k), { target: [m[k][0] * W / SW, m[k][1] * H / SH], dur: 3000 });
        } else cap(from('idle'));
      }
    }

    const frame = function (t, dt) {
      if (document.hidden || signal.aborted) return;
      dt = Math.min(0.05, Math.max(0.001, dt || 0.016));
      S.t += dt;
      S.recT += dt;
      const heard = music.heard();
      const pos = music.pos(heard);
      while (music.cues.length && music.cues[0].t <= heard) onCue(music.cues.shift(), pos);
      // decays
      S.kick *= Math.exp(-dt * 8);
      S.clap *= Math.exp(-dt * 10);
      S.jump *= Math.exp(-dt * 3.2);
      S.punch *= Math.exp(-dt * 6);
      S.shake *= Math.exp(-dt * 7);
      S.tear = Math.max(0, S.tear - dt * 1.6);
      S.mosh = Math.max(0, S.mosh - dt * 1.3);
      S.hazeBoost = Math.max(0, S.hazeBoost - dt * 0.5);
      S.flash = Math.max(0, S.flash - dt * 7);
      S.postFlash = Math.max(0, S.postFlash - dt * 9);
      if (S.peakStage !== 'silence') S.white = Math.max(0, S.white - dt * (S.low ? 3 : 5));

      if (S.phase === 'in') updateInside(dt, pos); else updateOutside(dt, pos);
      music.setCharge(S.phase === 'in' ? S.charge : 0);

      // render the scene
      const shooting = S.shootPending;
      S.shootPending = false;
      const mpos = pos && S.peakStage === 'silence' ? { ...pos, beats: S.frozenBeats } : pos;
      const inside = S.phase === 'in';
      let VS = null;
      if (inside) {
        const L = lights(pos);
        const energy = pos ? ({ A: 0.6, BUILD: 0.45, B: 1, BREAK: 0.25 }[pos.sec.name] || 0.5) : 0.5;
        VS = {
          t: S.peakStage === 'silence' ? S.frozenT : S.t, cam: S.cam, music: mpos, kick: S.kick, charge: S.charge, jump: S.jump,
          flash: S.flash, energy, light: L, peak: S.peak, peakRise: S.peakRise, hazeBoost: S.hazeBoost,
        };
        if (S.peakStage !== 'silence') venue.update(dt, VS);
      }
      const paint = (flash) => {
        if (inside) { VS.flash = flash; venue.marks = {}; venue.draw(sg, SW, SH, VS); }
        else {
          const [dc, di] = doorLight(pos);
          outside.draw(sg, SW, SH, { cam: S.cam, t: S.t, doorCol: dc, doorInt: di, flick: S.flick, beats: pos ? pos.beats : S.t * 2.5, part: S.part });
        }
      };
      // the camera
      const red = ctx.reduced ? 0.3 : 1;
      const shk = S.shake * red;
      const n1 = (Math.sin(S.t * 1.31) * 0.0024 + Math.sin(S.t * 2.73 + 1) * 0.0014) * red;
      const n2 = (Math.cos(S.t * 1.07) * 0.002 + Math.sin(S.t * 3.1) * 0.001) * red;
      const jit = shk * 0.012;
      const look = (photo) => ({
        smear: photo ? 0 : clamp((inside ? 0.36 : 0.26) + S.charge * 0.3 + Math.abs(S.dyaw) * 8, 0, 0.8),
        mosh: photo ? 0 : S.mosh * (ctx.reduced ? 0.3 : 1), moshSeed: S.moshSeed,
        zoom: 1 + S.fwd * 0.003, shiftX: -S.dyaw * 0.4, shiftY: 0,
        time: S.t,
        flash: photo ? 1 : S.postFlash * (S.low ? 0.3 : 1), fx: 0.5, fy: 0.55,
        exp: inside ? 0.97 + S.kick * 0.1 * (S.low ? 0.4 : 1) : 1,
        aberr: 0.0025 + S.kick * 0.003 + S.charge * 0.012 + S.tear * 0.012,
        jpeg: clamp(0.26 + S.charge * 0.36 + S.tear * 0.3 + (photo ? 0.22 : 0)),
        grain: inside ? 0.075 : 0.09, vig: 0.55, sat: inside ? 1.2 : 1.04,
        white: photo ? 0 : S.white, crush: photo ? 0.1 : 0.025,
        tear: photo ? 0 : S.tear, seed: S.tear > 0.01 ? Math.floor(S.t * 24) % 97 : 1,
        rot: n1 * 0.6 + (Math.random() - 0.5) * jit * 0.8,
        zm: 1.02 + S.charge * 0.03 * red + S.punch * 0.04 * red,
        shx: n1 + (Math.random() - 0.5) * jit,
        shy: n2 + (Math.random() - 0.5) * jit,
      });
      if (shooting) {
        // 1) the photo: everyone lit by the flash, blown out — rendered off the feedback chain, never shown
        paint(1);
        if (post.ok) post.render(scene, look(true), true);
        capture(post.ok ? glCanvas : scene);
        // 2) what you see: a flash only if the photosensitivity budget allows it
        const ok = !S.low && S.peakStage !== 'silence' && flashOK();
        S.flash = S.peakStage === 'silence' ? 1 : ok ? 0.9 : 0;
        S.postFlash = ok ? 0.5 : 0;
      }
      paint(S.flash);
      if (post.ok) post.render(scene, look(false));
      else whiteEl.style.opacity = String(Math.min(1, S.white + S.postFlash * 0.5));

      // HUD
      hud();
    };

    const hudCache = new Map();
    const put = (el, key, val, fn) => { if (hudCache.get(key) !== val) { hudCache.set(key, val); fn(el, val); } };
    const txt = (el, v) => { el.textContent = v; };
    function hud() {
      const s = Math.floor(S.recT);
      put(tcEl, 'tc', s, (el) => txt(el, `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`));
      if (S.t - dateTick > 20) { dateTick = S.t; const d = digicamDate(); dateEl.textContent = `${d.date}  ${d.time}`; }
      const c = S.charge;
      put(fillEl, 'fill', Math.round(c * 200), (el, v) => { el.style.height = `calc(${(v / 2).toFixed(1)}% - 4px)`; });
      put(pctEl, 'pct', `${Math.max(0, Math.round(c * 100 + (S.charging && c < 1 ? (Math.random() - 0.5) * 3 : 0)))}%`, txt);
      put(meterEl, 'hot', c > 0.66, (el, v) => el.classList.toggle('hot', v));
      put(meterEl, 'full', c >= 0.9, (el, v) => el.classList.toggle('full', v));
      put(shEl, 'sh', S.charging ? '1/4' : '1/8', txt);
      put(isoEl, 'iso', S.phase === 'in' ? 'ISO 6400' : 'ISO 3200', txt);
      put(fmEl, 'fm', S.low ? '⚡LOW' : '⚡AUTO', txt);
      // flier tag on the platform
      if (S.phase !== 'in' && outside.flierRect && !modal) {
        const r = outside.flierRect;
        ftagEl.classList.add('on');
        ftagEl.style.transform = `translate(${Math.round(r[2] * W / SW + 8)}px, ${Math.round(((r[1] + r[3]) / 2) * H / SH - 12)}px)`;
      } else ftagEl.classList.remove('on');
      // hints
      if (S.phase === 'in') {
        const done = hintSeen.charge && hintSeen.flash;
        hintEl.classList.toggle('off', !!done || S.peakStage != null);
        const HH = ctx.en ? HINTS_EN : HINTS;
        setHint(desk ? HH.in.desk : HH.in.touch);
      } else {
        hintEl.classList.toggle('off', !!(hintSeen.walk && S.outZ > 12));
        const HH = ctx.en ? HINTS_EN : HINTS;
        setHint(desk ? HH.out.desk : HH.out.touch);
      }
    }

    // ── language ───────────────────────────────────────────────
    const labEl = $('.rg-meter .lab');
    function applyLang() {
      const E = !!ctx.en;
      labEl.textContent = E ? 'CHARGE' : '溜め';
      labEl.style.letterSpacing = E ? '.02em' : '';
      ftagEl.textContent = E ? '← the flier (tap to read)' : '← 地下 vol.∞ (tap to read)';
      tornEl.title = E ? 'read the flier' : 'the flier';
      hintText = '';
      const open = modal;
      flierModal.innerHTML = '';
      if (open === 'flier') openFlier();
      if (open === 'roll') openRoll();
    }
    applyLang();
    if (ctx.onLang) ctx.onLang(() => applyLang());
    ctx.loop((t, dt) => frame(t, dt));

    return {
      resize(w, h) { resize(w, h); },
      destroy() {
        clearCaps();
        music.destroy();
        post.destroy();
      },
    };
  },
};
