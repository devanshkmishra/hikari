// ひかり線 — the one-car train between Devansh's worlds. You sit on the long seat and look
// across the aisle; the windows carry you from one world into the next.
import { createGL, m4, lin, canvas2d, rng } from './train/gl.js';
import { Scene } from './train/scene.js';
import { L } from './train/interior.js';
import { THEMES, TUNNEL } from './train/themes.js';
import { TrainAudio } from './train/sound.js';
import { Voice } from './train/voice.js';
import { CSS } from './train/style.js';
import { paintRouteMap, paintFareBoard, paintLED, paintDoorSticker, paintCatSticker, paintTicketFace, paintPlate, paintButtonLamp, paintCanLabel, paintBookCover, MAP, mapStationX, LEDC, LED_COLS, LED_ROWS } from './train/boards.js';
import { ADS, paintAd, paintAdBack } from './train/ads.js';
import { jpHTML } from '../lib/jp.js';

export default {
  id: 'train',
  mount(root, ctx) {
    const ride = new Ride(root, ctx);
    return { destroy: () => ride.destroy(), resize: () => ride.resize() };
  },
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const CRUISE = 17;
const NEON = ['#ff4f9a', '#5fe0ff', '#ffb347', '#7dff9a', '#c78bff'];

// ── words ───────────────────────────────────────────────────────────────────
const W = {
  welcome: '本日も、ひかり線をご利用いただきまして、ありがとうございます。',
  oneman: 'この列車は、ワンマン列車です。',
  hint: 'お降りのお客様は、お近くのボタンでお知らせください。',
  stop: '次、止まります。',
  close: 'ドアが閉まります。ご注意ください。',
  fare: '運賃と整理券は、運賃箱にお入れください。',
  forget: 'お忘れ物のないよう、ご注意ください。',
  bound: 'この列車は、終点、銀河行きです。',
  thanks: '本日も、ひかり線をご利用いただきまして、ありがとうございました。',
};

const WE = {
  welcome: 'Thank you for riding the Hikari Line today.',
  oneman: 'This is a one-man train.',
  hint: 'If you are getting off, please press the button nearest you.',
  close: 'The doors are closing. Please stand clear.',
  fare: 'Please put your fare and your numbered ticket in the fare box.',
  forget: 'Please make sure you have all your belongings.',
  bound: 'This train is bound for the end of the line: Ginga.',
  thanks: 'Thank you for riding the Hikari Line today.',
};
const nm = (st) => st.en.replace(' 1985', '');

class Ride {
  constructor(root, ctx) {
    this.root = root; this.ctx = ctx;
    this.sig = ctx.signal;
    this.t = 0;
    this.line = ctx.line || [];
    this.term = ctx.terminus;
    this.endingReady = !!ctx.endingReady;
    this.stations = this.endingReady ? [...this.line, { ...this.term, lit: false, visited: false }] : this.line.slice();
    this.reduced = !!ctx.reduced;
    this.buildDOM();
    const canvas = this.canvas;
    const gl = (this.gl = createGL(canvas));
    if (!gl) { this.fallback(); return; }
    try {
      this.scene = new Scene(gl, { reduced: this.reduced });
    } catch (e) {
      console.error(e);
      this.fallback();
      return;
    }
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.lost = true; }, { signal: this.sig });
    this.audio = new TrainAudio(ctx);
    this.voice = new Voice(ctx);
    this.initState();
    this.initTextures();
    this.bindInput();
    this.resize();
    // repaint text once the web fonts are surely in
    if (document.fonts && document.fonts.ready) {
      Promise.all([
        document.fonts.load('16px "DotGothic16"', '次は'),
        document.fonts.load('900 40px "Noto Serif JP"', '銀河'),
        document.fonts.load('700 40px "Zen Kaku Gothic New"', '整理券'),
        document.fonts.load('800 40px "Shippori Mincho B1"', '糖分'),
        document.fonts.load('400 40px "Anton"', '1906'),
      ]).catch(() => {}).then(() => document.fonts.ready).then(() => {
        if (this.sig.aborted) return;
        this.initTextures(true);
        this.scene.out.refreshSigns();
        for (const id of Object.keys(this.scene.out.themes)) {
          if (THEMES[id].strips.some((s) => s.emis) || id === 'zone') { delete this.scene.out.themes[id]; this.scene.out.ensure(id); }
        }
      });
    }
    this.stopLoop = ctx.loop((t, dt) => this.tick(t, dt));
    if (ctx.onLang) ctx.onLang(() => this.applyLang());
    this.applyLang(true);
  }

  // ── DOM ───────────────────────────────────────────────────────────────────
  buildDOM() {
    const r = this.root;
    r.classList.add('hk-train');
    r.innerHTML = `<style>${CSS}</style>
      <canvas class="hk-gl" aria-label="ひかり線の車内"></canvas>
      <div class="hk-vig"></div><div class="hk-grain"></div>
      <div class="hk-tip"></div>
      <div class="hk-hint"></div>
      <div class="hk-cap" aria-live="polite"></div>
      <div class="hk-dock">
        <div class="hk-dest"><div class="l1">次は</div><div class="l2"></div><div class="l3"></div></div>
        <button class="hk-pill hk-mapbtn" aria-label="路線図 route map"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M1 8h14"/><circle cx="3" cy="8" r="1.6" fill="#07070a"/><circle cx="8" cy="8" r="1.6" fill="#07070a"/><circle cx="13" cy="8" r="1.6" fill="#07070a"/></svg><span class="lbl">路線図</span></button>
        <button class="hk-pill hk-ff" aria-label="早送り fast forward"><svg viewBox="0 0 16 16" fill="currentColor"><path d="M1 3l6 5-6 5zM8 3l6 5-6 5z"/></svg><span class="lbl">早送り</span></button>
        <button class="hk-stop" aria-label="とまります — request stop"><span class="lamp">とまります</span><span class="dome"></span></button>
      </div>
      <div class="hk-slip" role="button" aria-label="整理券"></div>
      <div class="hk-modal" role="dialog" aria-modal="true"></div>
      <div class="hk-fade"></div>`;
    const q = (s) => r.querySelector(s);
    this.canvas = q('canvas.hk-gl');
    this.tipEl = q('.hk-tip'); this.hintEl = q('.hk-hint'); this.capEl = q('.hk-cap');
    this.stopBtn = q('.hk-stop'); this.ffBtn = q('.hk-ff'); this.mapBtn = q('.hk-mapbtn');
    this.destEl = q('.hk-dest'); this.slipEl = q('.hk-slip'); this.modal = q('.hk-modal'); this.fadeEl = q('.hk-fade');
    this.ctx.jp.attach(r);
    requestAnimationFrame(() => this.fadeEl.classList.add('off'));
  }

  get en() { return !!this.ctx.en; }

  applyLang(first = false) {
    if (this.dead && !first) return;
    const en = this.en;
    const lbl = (b, ja, e) => { const l = b.querySelector('.lbl'); if (l) l.textContent = en ? e : ja; };
    lbl(this.mapBtn, '路線図', 'Route map');
    lbl(this.ffBtn, '早送り', 'Fast-forward');
    this.mapBtn.setAttribute('aria-label', en ? 'Route map — choose your stop' : '路線図');
    this.ffBtn.setAttribute('aria-label', en ? 'Fast-forward' : '早送り');
    this.stopBtn.querySelector('.lamp').textContent = en ? 'STOP' : 'とまります';
    this.stopBtn.setAttribute('aria-label', en ? 'Request stop' : 'とまります');
    this.stopBtn.title = en ? 'Request stop (とまります)' : 'とまります';
    if (first) return;
    if (this.scene && this.dest) this.updateDest(true);
    this.capEl.classList.remove('on');
    this.hint(false);
    if (this.modal.classList.contains('on') && this.reopen) this.reopen();
  }

  fallback() {
    // no WebGL2: a quiet, still version that still gets you where you are going
    const r = this.root;
    const fb = document.createElement('div');
    fb.className = 'hk-fallback';
    const dest = this.defaultDest();
    fb.innerHTML = `<div style="font:600 22px 'Noto Serif JP';letter-spacing:.2em">ひかり線</div>`;
    const map = paintRouteMap({ line: this.line, terminus: this.term, endingReady: this.endingReady, dest, here: this.ctx.from });
    map.style.cssText = 'width:min(92vw,900px);height:auto;border-radius:3px';
    fb.appendChild(map);
    const go = document.createElement('div');
    go.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;justify-content:center';
    this.stations.forEach((st) => {
      const b = document.createElement('button');
      b.className = 'hk-pill'; b.textContent = st.jp;
      b.onclick = () => this.ctx.arrive(st.id);
      go.appendChild(b);
    });
    fb.appendChild(go);
    r.appendChild(fb);
    this.dead = true;
  }

  // ── state ─────────────────────────────────────────────────────────────────
  idx(id) { return this.stations.findIndex((s) => s.id === id); }
  st(id) { return this.stations.find((s) => s.id === id) || (id === 'ginga' ? this.term : null); }

  defaultDest() {
    if (this.endingReady) return 'ginga';
    const from = this.ctx.from;
    const n = this.line.length;
    const start = from ? this.line.findIndex((s) => s.id === from) : -1;
    for (let k = 1; k <= n; k++) {
      const s = this.line[(start + k + n) % n];
      if (!s.lit && s.id !== from) return s.id;
    }
    return this.line[(start + 1 + n) % n].id;
  }

  initState() {
    const ctx = this.ctx;
    this.from = ctx.from && this.st(ctx.from) ? ctx.from : null;
    this.dest = this.defaultDest();
    this.here = this.from;
    this.s = 0; this.v = 0; this.a = 0;
    this.throttle = 0; this.braking = 0;
    this.heading = 0;
    this.requested = false;
    this.ff = false;
    this.door = 0;
    this.trans = null;
    this.tunnels = [];
    this.crossings = [];
    this.station = null;
    this.rain = 0;
    this.flick = { x: -4.9, val: 1, t: 0 };
    this.bob = 0; this.bobV = 0;
    this.lastJoint = [null, null, null, null];
    this.phaseT = 0;
    this.rideT = 0;
    this.nextReminder = 40;
    this.orbs = [];
    // look: yaw (0 = facing the front), pitch, field of view
    this.look = { yaw: -1.36, pitch: 0.02, tanV: 0.64, eye: L.eye.slice() };
    this.lookBase = { ...this.look, eye: L.eye.slice() };
    this.lookCur = { yaw: this.look.yaw, pitch: this.look.pitch, tanV: this.look.tanV, eye: L.eye.slice() };
    this.mouse = { x: 0, y: 0 };
    this.focus = null;
    // physics bodies
    this.straps = [];
    for (const s of [-1, 1]) for (const [x0, x1] of L.seats) for (let x = x0 + 0.18; x < x1 - 0.1; x += 0.31) {
      this.straps.push({ x, z: s * 0.78, a: 0, va: 0, b: 0, vb: 0, w: 5.9 * (0.95 + Math.random() * 0.1), tw: (Math.random() - 0.5) * 0.3 });
    }
    this.strapData = new Float32Array(128 * 8);
    this.ads = L.ads.map((x, i) => ({ x, i: [3, 1, 0, 4, 2, 5][i], a: 0, va: 0, b: 0, vb: 0 }));
    this.can = { x: 0.1, z: L.canZ, vx: 0, vz: 0, rot: 0, rotX: 0 };
    this.umb = { a: 0, va: 0 };
    this.fan = 0;
    this.button = { lit: 0, press: 0 };
    this.ticketSlip = 0;
    this.particles = { bubbles: [], rings: [], stars: [], dust: [] };
    this.sprites = new Float32Array(1400 * 12);
    this.beams = new Float32Array(64 * 6 * 16);
    this.ledMsg = null;
    this.ledQueue = [];
    this.capTimer = 0;
    this.r = rng(Date.now() & 0xffff);

    const startTheme = this.from ? this.themeOf(this.from) : 'station';
    this.vis = startTheme;
    this.sky = { a: startTheme, b: startTheme, mix: 0 };
    this.light = { a: startTheme, b: startTheme, mix: 0 };
    this.scene.out.ensure(startTheme);
    this.scene.out.ensure(this.themeOf(this.dest));
    this.rain = THEMES[startTheme].rain || 0;
    if (startTheme === 'station' && this.r() < 0.28) this.rainBonus = 0.45;

    if (this.from) {
      // standing at the platform, doors open
      this.phase = 'board';
      this.door = 1;
      this.scene.setDoorMask(1);
      this.station = { s: 0, id: this.from };
      this.audio.engF = 27;
    } else {
      // first boarding: you wake on a moving train, in a long tunnel, and come out into summer
      this.phase = 'run';
      this.v = CRUISE;
      this.s = 0;
      this.tunnels.push({ s0: -400, s1: 46, kind: 'plain', hill: '#4d6b43' });
      this.departS = -400;
      this.firstRide = true;
      this.timeline([[3.4, () => this.announce([W.welcome, W.oneman], { chime: true, en: WE.welcome + ' ' + WE.oneman })], [11, () => this.announceNext()]]);
    }
    this.audio.setAmbience(THEMES[startTheme].ambience);
    this.updateDest(true);
  }

  themeOf(id) { return THEMES[id] ? id : 'station'; }

  timeline(list) {
    for (const [sec, fn] of list) this.ctx.timeout(() => { if (!this.dead) fn(); }, sec * 1000);
  }

  // ── textures for printed and lit things ───────────────────────────────────
  initTextures(again = false) {
    const S = this.scene;
    S.tex('door', paintDoorSticker());
    S.tex('cat', paintCatSticker());
    S.tex('plate', paintPlate('乗務員室', 512, 120, '#2a3b5a'));
    S.tex('farebox', paintPlate('運賃箱・両替', 512, 200, '#20262c'));
    S.tex('lamp', paintButtonLamp());
    S.tex('can', paintCanLabel(), { wrap: 'repeat' });
    S.tex('book', paintBookCover());
    S.tex('marker', this.paintMarker());
    for (let i = 0; i < ADS.length; i++) { S.tex('ad' + i, paintAd(i, 1200)); S.tex('adb' + i, paintAdBack(i)); }
    this.repaintBoards();
    if (!again) this.setLEDDefault();
    else if (this.ledMsg) this.showLED(this.ledMsg.spans, this.ledMsg.hold, true);
  }

  paintMarker() {
    const { c, g } = canvas2d(128, 64);
    g.fillStyle = '#c8322b'; g.beginPath(); g.moveTo(8, 50); g.lineTo(8, 18); g.quadraticCurveTo(10, 10, 20, 10); g.lineTo(104, 10); g.quadraticCurveTo(120, 12, 122, 30); g.lineTo(122, 50); g.closePath(); g.fill();
    g.fillStyle = '#f2e8d2'; g.fillRect(8, 36, 114, 8);
    g.fillStyle = '#cfe4f0'; for (let i = 0; i < 5; i++) g.fillRect(18 + i * 18, 16, 13, 14);
    g.fillStyle = '#222'; g.beginPath(); g.arc(30, 54, 7, 0, 7); g.arc(100, 54, 7, 0, 7); g.fill();
    return c;
  }

  repaintBoards() {
    const S = this.scene;
    this.mapCanvas = paintRouteMap({ line: this.line, terminus: this.term, endingReady: this.endingReady, dest: this.dest, here: this.here, en: this.en }, this.mapCanvas);
    S.tex('map', this.mapCanvas);
    const dst = this.st(this.dest);
    this.fareCanvas = paintFareBoard({ line: this.line, destIndex: Math.max(0, this.idx(this.dest)), destName: dst ? dst.jp : '', terminus: this.dest === 'ginga' }, this.fareCanvas);
    S.tex('fare', this.fareCanvas);
    const no = this.here ? String(Math.max(1, this.idx(this.here) + 1)) : '1';
    S.tex('ticket', paintTicketFace(no.slice(-1), true));
  }

  updateDest(silent = false) {
    const st = this.st(this.dest);
    const en = this.en;
    this.destEl.querySelector('.l1').textContent = en ? (this.dest === 'ginga' ? 'Next, the end of the line' : 'Next stop') : (this.dest === 'ginga' ? '次は　終点' : '次は');
    this.destEl.querySelector('.l2').textContent = en ? nm(st) : st.jp;
    this.destEl.querySelector('.l3').textContent = en ? st.jp : nm(st);
    this.repaintBoards();
    if (!silent) this.audio.beep(2100, 0.07, 0.025);
  }

  // ── LED ───────────────────────────────────────────────────────────────────
  showLED(spans, hold = 4, force = false) {
    const p = paintLED(spans);
    this.ledMsg = { spans, hold, t: 0, scroll: p.scroll, texW: p.width, textW: p.textW, x: 0 };
    this.scene.tex('led', p.canvas, { nearest: true, wrap: 'clamp' });
  }
  setLEDDefault() {
    const st = this.st(this.dest);
    const bound = this.endingReady ? '銀河' : this.line[this.line.length - 1].jp;
    const msgs = [
      [['ひかり線 ', LEDC.amber], ['各駅停車 ', LEDC.green], [bound + ' 行', LEDC.amber]],
      [['次は ', LEDC.amber], [(this.dest === 'ginga' ? '終点 ' : '') + st.jp, LEDC.white]],
      [['Next ', LEDC.amber], [st.en.replace(' 1985', ''), LEDC.white]],
    ];
    if (this.requested) msgs.push([['次 ', LEDC.amber], ['止まります', LEDC.red]]);
    this.ledCycle = msgs; this.ledCycleI = 0;
    this.showLED(msgs[0], 3.5);
  }
  tickLED(dt) {
    const m = this.ledMsg;
    if (!m) return;
    m.t += dt;
    if (m.scroll) m.x = (m.t * 22) % m.texW; else m.x = 0;
    const done = m.scroll ? m.t * 22 > m.textW + LED_COLS * 0.6 : m.t > m.hold;
    if (done) {
      if (this.ledQueue.length) { const n = this.ledQueue.shift(); this.showLED(n[0], n[1]); return; }
      if (!this.ledCycle) this.setLEDDefault();
      this.ledCycleI = (this.ledCycleI + 1) % this.ledCycle.length;
      this.showLED(this.ledCycle[this.ledCycleI], 3.2);
    }
  }

  // ── announcements: voice, the LED, and a caption ──────────────────────────
  announce(lines, { chime = false, en = '', speech = null } = {}) {
    if (this.dead) return;
    if (chime) this.audio.announceChime();
    const text = lines.join('');
    const delay = chime ? 0.9 : 0.1;
    this.ctx.timeout(() => {
      if (this.dead) return;
      const spoken = (speech || lines).join('');
      const est = this.voice.say(spoken);
      this.ledQueue = [];
      this.showLED([[text, LEDC.amber]], 1);
      this.caption(text, en, Math.max(est + 1.2, 4));
    }, delay * 1000);
  }
  caption(text, en, sec) {
    if (this.en && en) this.capEl.innerHTML = `<span class="en-main">${en}</span>`;
    else this.capEl.innerHTML = jpHTML(text) + (en ? `<span class="en">${en}</span>` : '');
    this.capEl.classList.add('on');
    clearTimeout(this.capTimer);
    this.capTimer = setTimeout(() => this.capEl.classList.remove('on'), sec * 1000);
  }
  announceNext() {
    const st = this.st(this.dest);
    if (this.dest === 'ginga') {
      this.announce([`次は、終点、${st.jp}です。`], { chime: true, speech: [`つぎは、しゅうてん、${st.kana}です。`], en: 'The next stop is Ginga, the end of the line.' });
      return;
    }
    const lines = [`次は、${st.jp}、${st.jp}です。`];
    const sp = [`つぎは、${st.kana}、${st.kana}です。`];
    if (!this.requested) { lines.push(W.hint); sp.push(W.hint); }
    this.announce(lines, { chime: true, speech: sp, en: `The next stop is ${nm(st)}. ${nm(st)}.${this.requested ? '' : ' ' + WE.hint}` });
  }

  // ── input ─────────────────────────────────────────────────────────────────
  bindInput() {
    const o = { signal: this.sig };
    const r = this.root;
    let down = null;
    r.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button, .hk-modal, .hk-slip, .jt')) return;
      down = { x: e.clientX, y: e.clientY, yaw: this.look.yaw, pitch: this.look.pitch, moved: false, id: e.pointerId };
      try { r.setPointerCapture(e.pointerId); } catch (err) {}
    }, o);
    r.addEventListener('pointermove', (e) => {
      const rect = r.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      if (down) {
        const dx = e.clientX - down.x, dy = e.clientY - down.y;
        if (!down.moved && Math.hypot(dx, dy) > 6) { down.moved = true; r.classList.add('dragging'); if (this.focus) this.unfocus(); this.hint(false); }
        if (down.moved) {
          const k = (this.look.tanV * 2) / rect.height;
          this.look.yaw = clamp(down.yaw + dx * k, -2.9, 0.3);
          this.look.pitch = clamp(down.pitch + dy * k, -0.55, 0.62);
        }
      } else this.hover(e.clientX - rect.left, e.clientY - rect.top);
    }, o);
    const up = (e) => {
      if (!down) return;
      const d = down; down = null;
      r.classList.remove('dragging');
      if (!d.moved) { const rect = r.getBoundingClientRect(); this.click(e.clientX - rect.left, e.clientY - rect.top); }
    };
    r.addEventListener('pointerup', up, o);
    r.addEventListener('pointercancel', () => { down = null; r.classList.remove('dragging'); }, o);
    r.addEventListener('dblclick', (e) => { if (!e.target.closest('button, .hk-modal')) this.resetLook(); }, o);
    r.addEventListener('wheel', (e) => {
      if (this.modal.classList.contains('on')) return;
      this.look.yaw = clamp(this.look.yaw - e.deltaX * 0.0015, -2.9, 0.3);
      this.look.pitch = clamp(this.look.pitch + e.deltaY * 0.0012, -0.55, 0.62);
    }, { ...o, passive: true });
    this.stopBtn.addEventListener('click', () => this.pressButton(), o);
    this.ffBtn.addEventListener('click', () => this.fastForward(), o);
    this.mapBtn.addEventListener('click', () => this.openMap(), o);
    this.slipEl.addEventListener('click', () => this.slipEl.classList.remove('on'), o);
    this.modal.addEventListener('click', (e) => { if (e.target === this.modal) this.closeModal(); }, o);
    window.addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Escape') { if (this.modal.classList.contains('on')) this.closeModal(); else if (this.focus) this.unfocus(); return; }
      if (this.modal.classList.contains('on')) {
        if (this.modalAd != null && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) this.showAd((this.modalAd + (e.key === 'ArrowRight' ? 1 : ADS.length - 1)) % ADS.length);
        return;
      }
      if (e.key === ' ' || e.key === 'Enter') { if (document.activeElement && document.activeElement.tagName === 'BUTTON') return; e.preventDefault(); this.pressButton(); }
      else if (e.key === 'f' || e.key === 'F') this.fastForward();
      else if (e.key === 'r' || e.key === 'R') this.openMap();
      else if (e.key === 'ArrowLeft') this.look.yaw = clamp(this.look.yaw + 0.12, -2.9, 0.3);
      else if (e.key === 'ArrowRight') this.look.yaw = clamp(this.look.yaw - 0.12, -2.9, 0.3);
      else if (e.key === 'ArrowUp') this.look.pitch = clamp(this.look.pitch + 0.08, -0.55, 0.62);
      else if (e.key === 'ArrowDown') this.look.pitch = clamp(this.look.pitch - 0.08, -0.55, 0.62);
      else if (/^[1-8]$/.test(e.key)) { const st = this.stations[+e.key - 1]; if (st) this.choose(st.id); }
    }, o);
  }

  resetLook() { this.unfocus(); this.look.yaw = this.lookBase.yaw; this.look.pitch = this.lookBase.pitch; }

  pickables() {
    const F = this.F;
    if (!F) return [];
    const list = [
      { id: 'map', m: F.mapM, w: L.routeMap.w, h: L.routeMap.h, tip: ['路線図', 'the route map — choose your stop'] },
      { id: 'fare', m: F.fareM, w: 2.6, h: 0.34, tip: ['運賃表', 'the fare board'] },
      { id: 'led', m: F.ledM, w: L.led.w, h: L.led.h, pad: 1.4, tip: ['車内案内表示器', 'the next-stop display'] },
      { id: 'button', m: F.buttonM, w: 0.12, h: 0.15, pad: 1.4, tip: ['とまります', 'request a stop'] },
      { id: 'ticket', m: F.ticketM, w: 0.3, h: 0.26, pad: 1.1, tip: ['整理券', 'take a ticket'] },
      { id: 'book', m: F.coverM, w: 0.104, h: 0.148, pad: 1.8, tip: ['忘れ物の文庫本', 'a paperback someone left behind'] },
      { id: 'can', m: F.canPickM, w: 0.14, h: 0.08, pad: 1.8, tip: ['缶コーヒー', 'a can of coffee, still rolling'] },
      { id: 'umb', m: F.umbPickM, w: 0.12, h: 0.9, pad: 1.2, tip: ['ビニール傘', 'somebody’s umbrella, forgotten'] },
    ];
    F.adM.forEach((m, k) => list.push({ id: 'ad' + k, ad: this.ads[k].i, m, w: 0.78, h: 0.52, tip: ['中吊り広告', this.en ? ADS[this.ads[k].i].en.split(' — ')[0].toLowerCase() : ADS[this.ads[k].i].title] }));
    return list;
  }

  hover(x, y) {
    if (!this.scene || !this.F) return;
    const hit = this.scene.pick(x, y, this.root.clientWidth, this.root.clientHeight, this.pickables());
    const hot = !!hit;
    this.root.classList.toggle('hot', hot);
    if (hot) {
      let [a, b] = hit.q.tip;
      if (hit.id === 'map' && this.focus === 'map') { const s = this.mapStationAt(hit.u, hit.v); if (s) { a = s.jp; b = 'get off at ' + nm(s); } }
      this.tipEl.innerHTML = this.en ? `${b.charAt(0).toUpperCase() + b.slice(1)}<small>${a}</small>` : `${a}<small>${b}</small>`;
      this.tipEl.style.transform = `translate(${Math.min(x + 16, this.root.clientWidth - 220)}px, ${y + 18}px)`;
      this.tipEl.classList.add('on');
    } else this.tipEl.classList.remove('on');
  }

  mapStationAt(u, v) {
    const x = u * MAP.W, y = v * MAP.H;
    if (y < 130 || y > 460) return null;
    let best = null, bd = 1e9;
    this.stations.forEach((s, i) => { const d = Math.abs(mapStationX(i) - x); if (d < bd) { bd = d; best = s; } });
    return bd < MAP.dx * 0.5 ? best : null;
  }

  click(x, y) {
    if (!this.scene) return;
    const W = this.root.clientWidth, H = this.root.clientHeight;
    const hit = this.scene.pick(x, y, W, H, this.pickables());
    if (!hit) { if (this.focus) this.unfocus(); return; }
    const narrow = W < 700 || W / H < 1;
    if (hit.id === 'map') {
      if (this.focus === 'map') { const s = this.mapStationAt(hit.u, hit.v); if (s) this.choose(s.id); }
      else if (narrow) this.openMap();
      else this.focusOn('map');
    } else if (hit.id === 'fare') { narrow ? this.openImage(this.fareCanvas, this.en ? 'Fare board' : '運賃表', this.en ? 'fares from each boarding station' : '各駅からの運賃') : this.focusOn('fare'); }
    else if (hit.id === 'led') this.focusOn('led');
    else if (hit.id === 'button') this.pressButton();
    else if (hit.id === 'ticket') this.takeTicket();
    else if (hit.id === 'book') this.openBook();
    else if (hit.id === 'can') { this.can.vx += (this.r() - 0.5) * 1.6; this.can.vz += (this.r() < 0.5 ? -1 : 1) * 0.9; this.audio.can(0, 0.6); }
    else if (hit.id === 'umb') { this.umb.va += 1.6; }
    else if (hit.id.startsWith('ad')) { this.ads[+hit.id.slice(2)].va += 0.6; this.showAd(hit.q.ad); }
  }

  focusOn(what) {
    let c, w;
    if (what === 'map') { c = [L.routeMap.x, L.routeMap.y, 1.37]; w = L.routeMap.w * 1.12; }
    else if (what === 'fare') { c = [L.XF, 2.03, 0]; w = 2.7; }
    else { c = [L.led.x, L.led.y, 1.36]; w = 1.4; }
    // stand up and step over to it, past the straps
    const e2 = what === 'map' ? [c[0] + 0.05, c[1] - 0.05, c[2] - 0.52] : what === 'fare' ? [L.XF - 1.5, 1.72, 0.05] : [c[0] + 0.1, c[1] - 0.1, 0.72];
    const d2 = [c[0] - e2[0], c[1] - e2[1], c[2] - e2[2]];
    const yaw = Math.atan2(-d2[2], d2[0]);
    const pitch = Math.atan2(d2[1], Math.hypot(d2[0], d2[2]));
    const dist = Math.hypot(...d2);
    const aspect = this.root.clientWidth / this.root.clientHeight;
    const tanV = clamp(((w / 2) / dist) / aspect * 1.08, 0.12, 0.8);
    this.focus = what;
    this.focusT = { yaw, pitch, tanV, eye: e2 };
    this.hint(false);
  }
  unfocus() { this.focus = null; this.focusT = null; }

  choose(id) {
    if (id === 'ginga' && !this.endingReady) return;
    if (this.phase === 'approach' || this.phase === 'arrived') {
      this.caption('まもなく到着します。', 'We’re already pulling in.', 2.5);
      return;
    }
    if (id === this.dest) { this.unfocus(); return; }
    this.dest = id;
    this.scene.out.ensure(this.themeOf(id));
    this.updateDest();
    this.setLEDDefault();
    if (this.phase === 'run') {
      this.planTransition();
      this.ctx.timeout(() => this.announceNext(), 900);
    }
    this.ctx.timeout(() => this.unfocus(), 700);
  }

  pressButton() {
    if (this.dead) return;
    this.button.press = 1;
    if (this.phase === 'arrived') return;
    if (this.requested) { this.fastForward(); return; }
    this.requested = true;
    this.audio.buttonChime();
    this.stopBtn.classList.add('lit');
    this.stopBtn.classList.remove('pulse');
    this.ctx.timeout(() => this.voice.say('つぎ、とまります。', { rate: 1.0 }), 700);
    this.setLEDDefault();
    this.ledQueue = [];
    this.showLED([['次 ', LEDC.amber], ['止まります', LEDC.red]], 3);
    this.caption('次、止まります。', 'Stop requested.', 2.5);
    this.hint(false);
  }

  fastForward() {
    if (this.phase === 'arrived' || this.phase === 'board' || this.phase === 'close') {
      if (this.phase === 'board') this.phaseT = 99;
      return;
    }
    if (!this.requested && this.dest !== 'ginga') { this.requested = true; this.stopBtn.classList.add('lit'); this.stopBtn.classList.remove('pulse'); this.audio.buttonChime(); }
    if (!this.ff) { this.ff = true; this.audio.whoosh(0.4); this.voice.cancel(); }
  }

  takeTicket() {
    if (this.ticketSlip > 0.1) return;
    this.audio.ticket();
    this.ticketSlip = 0.001;
    const n = this.here ? this.idx(this.here) + 1 : 1;
    const st = this.st(this.here || 'station');
    const d = new Date();
    const ds = `${d.getFullYear() - 41}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    this.slipEl.innerHTML = this.en
      ? `<div class="t">HIKARI LINE · TICKET</div><div class="n">${n}</div><div class="s">from ${nm(st)}</div><div class="d">${ds} · valid today only</div>`
      : `<div class="t">ひかり線 整理券</div><div class="n">${n}</div><div class="s">${st.jp} から</div><div class="d">${ds} 有効当日限り</div>`;
    this.ctx.timeout(() => this.slipEl.classList.add('on'), 700);
    this.ctx.timeout(() => this.slipEl.classList.remove('on'), 7000);
  }

  // ── overlays ──────────────────────────────────────────────────────────────
  openModal(html) {
    this.modal.innerHTML = html;
    this.modal.classList.add('on');
    this.tipEl.classList.remove('on');
  }
  closeModal() { this.modal.classList.remove('on'); this.modalAd = null; this.reopen = null; }
  showAd(i) {
    this.modalAd = i;
    this.reopen = () => this.showAd(i);
    const c = paintAd(i, Math.min(2400, Math.round(Math.max(1200, this.root.clientWidth * this.ctx.dpr * 0.9))));
    c.className = 'ad';
    this.openModal(`<div class="frame"></div>`);
    const f = this.modal.querySelector('.frame');
    f.appendChild(c);
    const cap = document.createElement('div');
    cap.className = 'cap';
    cap.innerHTML = this.en
      ? `<span><b>${ADS[i].en}</b>　hanging ad ${i + 1}/${ADS.length}</span><span class="nav"><button aria-label="Previous">‹</button><button aria-label="Next">›</button><button aria-label="Close">×</button></span>`
      : `<span><b>${ADS[i].title}</b>　中吊り広告 ${i + 1}/${ADS.length}</span><span class="nav"><button aria-label="前">‹</button><button aria-label="次">›</button><button aria-label="閉じる">×</button></span>`;
    f.appendChild(cap);
    const [p, n, x] = cap.querySelectorAll('button');
    p.onclick = () => this.showAd((i + ADS.length - 1) % ADS.length);
    n.onclick = () => this.showAd((i + 1) % ADS.length);
    x.onclick = () => this.closeModal();
  }
  openImage(canvas, title, en) {
    const img = new Image();
    img.src = canvas.toDataURL();
    img.className = 'hk-map';
    this.openModal(`<div class="frame"><div class="hk-mapwrap"></div><div class="cap"><span><b>${title}</b>　${en}</span><span class="nav"><button aria-label="${this.en ? 'Close' : '閉じる'}">×</button></span></div></div>`);
    this.modal.querySelector('.hk-mapwrap').appendChild(img);
    this.modal.querySelector('.nav button').onclick = () => this.closeModal();
    return this.modal.querySelector('.hk-mapwrap');
  }
  openMap() {
    const wrap = this.openImage(this.mapCanvas, this.en ? 'Route map' : '路線図', this.en ? 'choose where to get off' : '降りる駅を選ぶ');
    this.reopen = () => this.openMap();
    this.stations.forEach((s, i) => {
      if (s.id === 'ginga' && !this.endingReady) return;
      const b = document.createElement('button');
      b.className = 'st';
      b.style.left = (mapStationX(i) / MAP.W) * 100 + '%';
      b.setAttribute('aria-label', this.en ? `${nm(s)} (${s.jp})` : `${s.jp} ${s.en}`);
      b.onclick = (e) => { e.stopPropagation(); this.choose(s.id); this.closeModal(); };
      wrap.appendChild(b);
    });
  }
  openBook() {
    this.reopen = () => this.openBook();
    if (this.en) {
      this.openModal(`<div class="frame">
      <div class="hk-book en">
        <div class="hk-receipt"><b>HIKARI RECORDS</b>Ginza<br>1985.08.04<br>LP ×1<br>¥2,800<br>──────<br>thank you</div>
        <div class="hk-page r"><div class="head">What the Light Leaves · Chapter 3</div><div class="txt"><p>At the end of summer, the local train is always carrying something someone left behind.</p><p>An umbrella, sometimes. A book half read. A promise with no name on it.</p><p>Whoever owned it has already got off. The train carries it to the next station anyway.</p></div><div class="no">116</div></div>
        <div class="hk-page l"><div class="head">Every Stop</div><div class="txt"><p>Watching the rice fields slide past the window, I think:</p><p><span class="pencil">maybe a faraway place isn’t somewhere on a map, but the space between you and the things you love.</span></p><p>And the train runs to close that distance, a little at a time.</p></div><div class="no">117</div></div>
      </div>
      <div class="hk-booknote">A paperback left on the seat, a record-shop receipt for a bookmark. One line is underlined in pencil.</div></div>`);
      return;
    }
    const p1a = '夏の終わりの[各駅停車|かくえきていしゃ|local train that stops at every station]には、いつも誰かの[忘れ物|わすれもの|something left behind]が乗っている。';
    const p1b = '傘であったり、読みかけの本であったり、名前のない約束であったりする。';
    const p1c = '[持ち主|もちぬし|owner]はもう降りてしまった。それでも列車は、それを乗せたまま、次の駅へ向かう。';
    const p2a = '窓の外を流れていく田んぼを[眺|なが|to gaze at]めながら、わたしは思う。';
    const p2b = '遠い場所というのは、地図の上ではなく、自分と好きなもののあいだにあるのかもしれない。';
    const p2c = 'そして列車は、その[距離|きょり|distance]を、少しずつ[縮|ちぢ|to shrink; to close a gap]めるために走っている。';
    this.openModal(`<div class="frame">
      <div class="hk-book">
        <div class="hk-receipt"><b>ひかりレコード</b>銀座店<br>1985.08.04<br>LP ×1<br>¥2,800<br>──────<br>ありがとう<br>ございました</div>
        <div class="hk-page r"><div class="head">ひかりの残り　第三章</div><div class="txt"><p>${jpHTML(p1a)}</p><p>${jpHTML(p1b)}</p><p>${jpHTML(p1c)}</p></div><div class="no">一一六</div></div>
        <div class="hk-page l"><div class="head">各駅停車</div><div class="txt"><p>${jpHTML(p2a)}</p><p><span class="pencil">${jpHTML(p2b)}</span></p><p>${jpHTML(p2c)}</p></div><div class="no">一一七</div></div>
      </div>
      <div class="hk-booknote">A paperback left on the seat, someone's receipt for a bookmark. One line is underlined in pencil.</div></div>`);
  }

  hint(on, html) {
    if (on) { this.hintEl.innerHTML = html; this.hintEl.classList.add('on'); }
    else this.hintEl.classList.remove('on');
  }

  // ── transitions between worlds ────────────────────────────────────────────
  kindFor(from, to) {
    if (from === to) return null;
    if (to === 'ginga') return 'ascend';
    if (from === 'rage') return 'tunnel';
    if (to === 'circles') return 'void';
    if (to === 'zone' || (from === 'zone' && to === 'coast')) return 'fog';
    return 'tunnel';
  }

  planTransition() {
    const to = this.themeOf(this.dest);
    const swapped = this.trans && this.s >= this.trans.swapS;
    if (this.trans && !swapped) {
      // not through yet: just aim the tunnel somewhere else
      if (this.trans.kind === this.kindFor(this.trans.from, to) || this.trans.kind === 'tunnel') { this.trans.to = to; return; }
    }
    const from = this.vis;
    const kind = this.kindFor(from, to);
    if (!kind) { this.trans = null; return; }
    const s0 = Math.max(this.s + (this.v > 5 ? 45 : 70), this.trans ? this.trans.s1 + 40 : 0);
    let len = { tunnel: 96, fog: 150, void: 160, ascend: 340 }[kind];
    if (this.ff) len *= 0.8;
    const tr = { kind, from, to, s0, s1: s0 + len, swapS: s0 + len * 0.5, departS: this.s };
    if (kind === 'ascend') tr.swapS = s0 + len * 0.55;
    this.trans = tr;
    if (kind === 'tunnel') {
      const hill = { station: '#4d6b43', showa: '#2a2430', aero: '#5fc46a', zone: '#55593f', coast: '#6a5a4a', circles: '#0a0608', rage: '#1a1a1a' }[from] || '#4d6b43';
      this.tunnels.push({ s0: from === 'rage' ? tr.swapS : s0, s1: to === 'rage' ? tr.swapS + 1e6 : tr.s1, kind: 'plain', hill, trans: true, portalIn: from !== 'rage', portalOut: to !== 'rage' });
    }
    this.scene.out.ensure(to);
  }

  transState() {
    const s = this.s, tr = this.trans;
    const out = { fogBoost: 0, stripFade: 1, groundFade: 1, rise: 0, climb: 0, fluor: 1, galaxy: 1, carPitch: 0, stars: 0 };
    if (!tr) { this.sky.mix = 0; this.light.mix = 0; return out; }
    const pre = clamp((s - tr.departS) / Math.max(1, tr.s0 - tr.departS), 0, 1);
    if (tr.kind === 'tunnel') {
      if (s < tr.swapS) { this.sky.a = tr.from; this.sky.b = tr.to; this.sky.mix = 0.4 * ss(0, 1, pre); this.light.a = tr.from; this.light.b = tr.to; this.light.mix = this.sky.mix * 0.6; }
      else this.swap(tr.to);
    } else if (tr.kind === 'fog') {
      const up = ss(tr.s0, tr.swapS, s), down = ss(tr.s1, tr.swapS, s);
      out.fogBoost = s < tr.swapS ? up : down;
      out.fogCol = '#d6d9cf';
      if (s < tr.swapS) { this.sky.a = tr.from; this.sky.b = tr.to; this.sky.mix = up * 0.5; this.light.a = tr.from; this.light.b = tr.to; this.light.mix = up * 0.5; }
      else { this.swap(tr.to, true); this.sky.a = tr.from; this.sky.b = tr.to; this.sky.mix = 1 - down * 0.5; this.light.a = tr.from; this.light.b = tr.to; this.light.mix = 1 - down * 0.5; if (s > tr.s1) { this.sky.a = this.light.a = tr.to; this.sky.mix = this.light.mix = 0; } }
    } else if (tr.kind === 'void') {
      const k = ss(tr.s0, tr.swapS, s);
      if (s < tr.swapS) {
        out.stripFade = 1 - k; out.groundFade = 1 - k;
        this.sky.a = tr.from; this.sky.b = tr.to; this.sky.mix = k; this.light.a = tr.from; this.light.b = tr.to; this.light.mix = k;
      } else this.swap(tr.to);
    } else if (tr.kind === 'ascend') {
      const p = clamp((s - tr.s0) / (tr.s1 - tr.s0), 0, 1);
      this.ascendP = p;
      this.sky.a = tr.from; this.sky.b = 'ginga'; this.sky.mix = ss(0.0, 0.5, p);
      this.light.a = tr.from; this.light.b = 'ginga'; this.light.mix = ss(0.05, 0.55, p);
      out.rise = Math.pow(ss(0.08, 1, p), 1.6) * 900;
      out.climb = 0.0025 * ss(0, 0.15, p) * (1 - ss(0.7, 1, p));
      out.stripFade = 1 - ss(0.25, 0.6, p);
      out.groundFade = 1 - ss(0.2, 0.55, p);
      out.fluor = 1 - 0.72 * ss(0.25, 0.65, p);
      out.carPitch = -0.05 * Math.sin(Math.PI * ss(0.05, 0.8, p));
      out.stars = ss(0.3, 0.7, p);
      if (p >= 0.6 && this.vis !== 'ginga') this.swap('ginga', true);
    }
    return out;
  }

  swap(to, keepSky = false) {
    if (this.vis !== to) {
      this.vis = to;
      this.audio.setAmbience(THEMES[to].ambience);
      this.rain = THEMES[to].rain || 0;
      this.rainBonus = to === 'station' && this.r() < 0.25 ? 0.45 : 0;
      this.crossings = [];
      this.nextCrossing = this.s + 150;
      if (to === 'rage') this.strobeT = 0.5;
    }
    if (!keepSky) { this.sky.a = this.sky.b = to; this.sky.mix = 0; this.light.a = this.light.b = to; this.light.mix = 0; }
  }

  // ── the simulation ────────────────────────────────────────────────────────
  tick(t, dtReal) {
    if (this.dead || this.lost) return;
    if (document.hidden) return;
    const dtR = Math.min(dtReal, 0.05);
    this.t += dtR;
    const dt = dtR * (this.ff && this.phase === 'run' ? 3.2 : 1);
    this.sim(dt, dtR);
    this.frame(dtR);
    if (this.ctx.muted && this.voice.synth && this.voice.synth.speaking) this.voice.cancel();
  }

  sim(dt, dtR) {
    const ph = this.phase;
    this.phaseT += dtR;
    this.rideT += dt;
    let accel = 0, braking = 0, throttle = 0, engineOn = true;
    if (ph === 'board') {
      if (this.phaseT > 0.6 && !this.boardAnn) {
        this.boardAnn = true;
        const st = this.st(this.dest);
        this.announce([this.dest === 'ginga' ? W.bound : `この列車は、${st.jp}方面行きです。`], { chime: false, speech: [this.dest === 'ginga' ? 'このれっしゃは、しゅうてん、ぎんがゆきです。' : `このれっしゃは、${st.kana}ほうめんゆきです。`], en: this.dest === 'ginga' ? WE.bound : `This train is bound for ${nm(st)}.` });
        this.hint(true, this.en ? `Drag to look around the car · touch the route map to choose a stop` : `ドラッグで車内を見回す　·　路線図で行き先を選ぶ<i>drag to look around · touch the route map to choose a stop</i>`);
        this.ctx.timeout(() => this.hint(false), 9000);
      }
      if (this.phaseT > 3.4) { this.phase = 'close'; this.phaseT = 0; this.audio.doorChime(); this.announce([W.close], { en: WE.close }); }
    } else if (ph === 'close') {
      if (this.phaseT > 1.9 && !this.closing) { this.closing = true; this.audio.door(false); }
      if (this.closing) {
        this.door = Math.max(0, this.door - dtR / 1.05);
        this.scene.setDoorMask(this.door);
      }
      if (this.phaseT > 3.4) {
        this.phase = 'run'; this.phaseT = 0; this.rideT = 0;
        this.departS = 0;
        this.audio.air(true, 0.06);
        this.planTransition();
        this.timeline([[3.2, () => this.announceNext()]]);
        if (!this.requested && this.dest !== 'ginga') this.stopBtn.classList.add('pulse');
      }
    } else if (ph === 'run') {
      const ascend = this.trans && this.trans.kind === 'ascend';
      const target = ascend ? 15 : CRUISE;
      if (this.v < target - 0.2) { accel = 2.4 * Math.sqrt(1 - this.v / (target + 1)); throttle = clamp(accel / 2.4, 0.2, 1); }
      else { accel = (target - this.v) * 0.5; throttle = 0.15; }
      if (this.firstRide) throttle = 0.25;
      // ready to stop?
      const settled = !this.trans || this.s > this.trans.s1 + 20 || (this.trans.kind === 'ascend' && this.ascendP >= 0.97);
      const minRide = this.ff ? 2 : 6;
      if ((this.requested || this.dest === 'ginga') && settled && this.rideT > minRide && this.vis === this.themeOf(this.dest)) this.beginApproach();
      // reminders while cruising with no request
      if (!this.requested && this.dest !== 'ginga' && settled && this.rideT > this.nextReminder) {
        this.nextReminder = this.rideT + 45;
        this.announceNext();
        this.stopBtn.classList.add('pulse');
      }
    } else if (ph === 'approach') {
      const rem = this.station.s - this.s;
      const dec = this.ff ? 3.0 : this.dest === 'ginga' ? 1.2 : 1.9;
      const need = (this.v * this.v) / (2 * Math.max(rem, 0.01));
      if (need >= dec * 0.98 || this.brakingOn) {
        this.brakingOn = true;
        accel = -need;
        braking = clamp(need / 2, 0, 1);
        if (!this.airOn) { this.airOn = true; this.audio.air(false, 0.05); }
      } else { accel = (CRUISE * 0.85 - this.v) * 0.4; throttle = 0.1; }
      if (rem < 0.03 || (this.v < 0.12 && rem < 1.5)) this.arrive();
    } else if (ph === 'arrived') {
      engineOn = true;
      if (this.phaseT > 0.9 && !this.opening) { this.opening = true; this.audio.door(true); this.audio.bell(this.audio.now() + 0.05, 84, 1.2, 0.05, { ratio: 1, index: 0.5 }); }
      if (this.opening) { this.door = Math.min(1, this.door + dtR / 1.0); this.scene.setDoorMask(this.door); }
      if (this.door >= 1 && !this.called) {
        this.called = true;
        this.ctx.timeout(() => { if (!this.sig.aborted) this.ctx.arrive(this.dest); }, this.dest === 'ginga' ? 1600 : 900);
        if (this.dest === 'ginga') { this.fadeEl.classList.add('white'); this.fadeEl.classList.remove('off'); }
      }
    }
    // integrate
    this.v = Math.max(0, this.v + accel * dt);
    if (ph === 'board' || ph === 'close' || ph === 'arrived') this.v = 0;
    const ds = this.v * dt;
    this.s += ds;
    this.a = lerp(this.a, accel, Math.min(1, dt * 6));
    this.throttle = lerp(this.throttle, throttle, Math.min(1, dtR * 2));
    this.braking = lerp(this.braking, braking, Math.min(1, dtR * 4));
    // the track: gentle curves and a little grade
    const s = this.s;
    this.heading = 0.32 * Math.sin(s / 260) + 0.14 * Math.sin(s / 123 + 1.3);
    this.curv = (0.32 / 260) * Math.cos(s / 260) + (0.14 / 123) * Math.cos(s / 123 + 1.3);
    const latA = this.v * this.v * this.curv + Math.sin(this.t * 1.7) * 0.05 * (this.v / CRUISE) + Math.sin(this.t * 3.1 + 1) * 0.03 * (this.v / CRUISE);
    this.latA = latA;
    this.joints(dt);
    this.physics(dtR, dt, latA);
    this.ts = this.transState();
    this.events(dt);
    // remove the platform once it is far behind
    if (this.station && this.station.s - this.s < -260 && this.phase === 'run') this.station = null;
    // audio state
    const tunnel = this.tunnelAt(this.s + L.eye[0]);
    if (tunnel > 0.5 && !this.inTunnel) { this.inTunnel = true; this.audio.tunnelEnter(); }
    if (tunnel < 0.5 && this.inTunnel) { this.inTunnel = false; this.audio.tunnelExit(); }
    this.tunnelF = tunnel;
    const asc = this.ascendP || 0;
    this.audio.update(dtR, {
      speed: this.v * (this.ff && this.phase === 'run' ? 1.5 : 1), throttle: this.throttle, engineOn, braking: this.braking, tunnel,
      curv: this.curv, fluor: this.ts.fluor, flicker: this.flick.val < 0.7, rain: (this.rain + (this.rainBonus || 0)) * (1 - tunnel),
      windowOpen: false,
    });
    if (asc > 0.3) this.audio.eng.gain.setTargetAtTime(0.04, this.audio.now(), 1.5);
    this.audio.updateCrossing();
    this.tickLED(dtR);
    // the flickering tube near the back of the car
    const f = this.flick;
    f.t -= dtR;
    if (f.t <= 0) { f.t = 0.04 + this.r() * (this.r() < 0.15 ? 0.06 : 3.5); f.val = this.r() < 0.35 ? 0.25 + this.r() * 0.4 : 1; }
    else if (f.val < 1 && this.r() < 0.3) f.val = Math.min(1, f.val + 0.4);
    this.fan += dtR * 4.2;
    this.button.press = Math.max(0, this.button.press - dtR * 4);
    this.button.lit = lerp(this.button.lit, this.requested ? 1 : 0, Math.min(1, dtR * 10));
    if (this.ticketSlip > 0) { this.ticketSlip = Math.min(1, this.ticketSlip + dtR * 1.6); if (this.ticketSlip >= 1) this.ctx.timeout(() => { this.ticketSlip = 0; }, 2500); }
  }

  beginApproach() {
    this.phase = 'approach'; this.phaseT = 0;
    this.brakingOn = false; this.airOn = false;
    const dec = this.ff ? 3.0 : this.dest === 'ginga' ? 1.2 : 1.9;
    const lead = this.ff ? 6 : this.v * 2.4;
    this.station = { s: this.s + lead + (this.v * this.v) / (2 * dec), id: this.dest };
    this.crossings = this.crossings.filter((c) => c.s < this.station.s - 80 || c.s > this.station.s + 80);
    if (!this.ff) {
      const st = this.st(this.dest);
      const dur = this.audio.approachChime();
      this.ctx.timeout(() => {
        if (this.dest === 'ginga') {
          this.announce([`まもなく、終点、${st.jp}です。`, W.thanks, W.forget], { speech: ['まもなく、しゅうてん、ぎんがです。', W.thanks, W.forget], en: `We will soon arrive at Ginga, the end of the line. ${WE.thanks} ${WE.forget}` });
        } else {
          this.announce([`まもなく、${st.jp}です。`, 'お出口は、右側です。', W.fare], { speech: [`まもなく、${st.kana}です。`, 'おでぐちは、みぎがわです。', W.fare], en: `We will soon arrive at ${nm(st)}. The doors on the right side will open. ${WE.fare}` });
        }
      }, (dur + 0.3) * 1000);
    }
  }

  arrive() {
    this.phase = 'arrived'; this.phaseT = 0;
    this.v = 0; this.s = this.station.s;
    this.ff = false;
    this.audio.settle();
    this.audio.air(true, 0.09);
    this.here = this.dest;
    this.repaintBoards();
    this.stopBtn.classList.remove('lit', 'pulse');
    this.requested = false;
  }

  tunnelAt(x) {
    let f = 0;
    for (const tn of this.tunnels) f = Math.max(f, ss(tn.s0 - 3, tn.s0 + 6, x) * (1 - ss(tn.s1 - 6, tn.s1 + 3, x)));
    if (this.vis === 'rage') f = 1;
    return f;
  }

  joints(dt) {
    // four axles crossing 25 m rails: ga-tan … go-ton
    if (this.v < 0.3) return;
    const axles = [5.5, 3.5, -3.5, -5.5];
    const asc = this.ascendP || 0;
    const amp0 = Math.pow(clamp(this.v / 14, 0, 1), 0.8) * 0.5 * (1 - ss(0.35, 0.6, asc)) * (this.vis === 'circles' ? 0.8 : 1);
    if (amp0 <= 0.002) return;
    const vr = this.v * (this.ff && this.phase === 'run' ? 3.2 : 1);
    axles.forEach((a, i) => {
      const pos = this.s + a;
      const k = Math.floor(pos / 25) + 1;
      const tt = (k * 25 - pos) / vr;
      if (tt < 0.12 && this.lastJoint[i] !== k) {
        this.lastJoint[i] = k;
        const near = 1 / (1 + Math.abs(a - L.eye[0]) * 0.18);
        this.audio.clack(tt, amp0 * near * (i % 2 ? 0.75 : 1), a > 0 ? -0.25 : 0.25);
        this.ctx.timeout(() => { if (!this.reduced) this.bobV -= 0.05 * amp0 * near; this.straps.forEach((st) => { st.vb += (this.r() - 0.5) * 0.25 * amp0; st.va += (this.r() - 0.5) * 0.12 * amp0; }); }, tt * 1000);
      }
    });
  }

  physics(dtR, dt, latA) {
    const g = 9.8;
    const ax = this.a;
    const sway = this.reduced ? 0.4 : 1;
    for (const s of this.straps) {
      const w2 = s.w * s.w;
      s.va += (-w2 * Math.sin(s.a) - (ax / 0.28) * Math.cos(s.a) * sway - 2 * 0.07 * s.w * s.va) * dtR;
      s.vb += (-w2 * Math.sin(s.b) + (latA / 0.28) * Math.cos(s.b) * sway - 2 * 0.07 * s.w * s.vb) * dtR;
      s.a += s.va * dtR; s.b += s.vb * dtR;
    }
    for (const d of this.ads) {
      d.va += (-22 * d.a - (ax / 0.4) * 0.35 * sway - 0.6 * d.va) * dtR;
      d.vb += (-16 * d.b + (latA / 0.4) * 0.6 * sway - 0.5 * d.vb) * dtR;
      d.a += d.va * dtR; d.b += d.vb * dtR;
    }
    // the can: rolls across the doorway on curves, slides on braking
    const c = this.can;
    c.vz += (latA * 0.62 - c.vz * 0.25) * dtR;
    c.vx += (-ax * 0.35 - c.vx * 1.4) * dtR;
    c.z += c.vz * dtR; c.x += c.vx * dtR;
    let hit = 0;
    if (c.z < 0.62) { hit = Math.abs(c.vz); c.z = 0.62; c.vz = -c.vz * 0.35; }
    if (c.z > 1.32) { hit = Math.abs(c.vz); c.z = 1.32; c.vz = -c.vz * 0.35; }
    if (c.x < -0.36) { hit = Math.max(hit, Math.abs(c.vx)); c.x = -0.36; c.vx = -c.vx * 0.3; }
    if (c.x > 0.36) { hit = Math.max(hit, Math.abs(c.vx)); c.x = 0.36; c.vx = -c.vx * 0.3; }
    c.rot += (c.vz * dtR) / 0.033;
    this.audio.can(c.vz, hit);
    const u = this.umb;
    u.va += (-9 * u.a + latA * 0.5 * sway - 0.8 * u.va) * dtR;
    u.a += u.va * dtR;
    this.bobV += (-160 * this.bob - 14 * this.bobV) * dtR;
    this.bob += this.bobV * dtR;
  }

  events(dt) {
    const s = this.s;
    // crossings in the countryside
    if (this.vis === 'station' && this.phase === 'run' && !this.trans?.kind?.match(/ascend/) && (!this.trans || s > this.trans.s1)) {
      if (this.nextCrossing == null) this.nextCrossing = s + 140;
      if (s + 260 > this.nextCrossing) {
        const cs = this.nextCrossing;
        this.crossings.push({ s: cs, rung: false });
        this.nextCrossing = cs + 380 + this.r() * 420;
      }
    }
    for (const c of this.crossings) {
      if (!c.rung && c.s - s < 150) {
        c.rung = true;
        this.audio.crossing({ pos: () => c.s - this.s - L.eye[0], speed: () => this.v * (this.ff ? 3.2 : 1) });
      }
    }
    this.crossings = this.crossings.filter((c) => c.s - s > -200);
    this.tunnels = this.tunnels.filter((tn) => tn.s1 - s > -300);
    // rings in the void, to the beat
    const P = this.particles;
    if (this.vis === 'circles') {
      const beat = 60 / 180;
      this.beatT = (this.beatT || 0) + dt;
      if (this.beatT > beat) {
        this.beatT -= beat;
        this.audio.kick();
        const n = this.r() < 0.4 ? 2 : 1;
        for (let k = 0; k < n; k++) P.rings.push({ x: s + 8 + this.r() * 60, y: -0.5 + this.r() * 4.5, z: (this.r() < 0.75 ? 1 : -1) * (5 + this.r() * 30), size: 1.2 + this.r() * 2.6, t: 0, col: this.r() < 0.8 ? [1, 0.4, 0.67] : [0.55, 0.8, 1] });
      }
    }
    P.rings = P.rings.filter((rg) => { const before = rg.t < 1; rg.t += dt / 0.8; if (before && rg.t >= 1) { this.audio.hit(); rg.flash = 1; } return rg.t < 2 && rg.x - s > -80; });
    // 地下: flash photography in the dark
    if (this.vis === 'rage' && !this.reduced) {
      this.strobeT = (this.strobeT || 0) - dt;
      if (this.strobeT <= 0) {
        this.strobeT = 0.45 + this.r() * 1.6;
        this.strobe = { amt: 1, col: this.r() < 0.5 ? [1, 1, 1] : this.r() < 0.5 ? [1, 0.18, 0.15] : [0.85, 1, 0.25] };
        this.audio.sub(0, 0.12);
      }
    }
    if (this.strobe) { this.strobe.amt *= Math.exp(-dt * 14); if (this.strobe.amt < 0.01) this.strobe = null; }
    // bubbles
    if (this.vis === 'aero') {
      while (P.bubbles.length < 70) P.bubbles.push({ x: s - 30 + this.r() * 140, y: -1.5 + this.r() * 6, z: (this.r() < 0.75 ? 1 : -1) * (3.2 + this.r() * 22), size: 0.12 + Math.pow(this.r(), 2) * 0.7, ph: this.r() * 10 });
      for (const b of P.bubbles) { b.y += dt * 0.25; b.ph += dt; }
      P.bubbles = P.bubbles.filter((b) => b.x - s > -60 && b.y < 9);
      for (const b of P.bubbles) if (b.x - s < -55) b.x += 180;
    } else P.bubbles.length = 0;
    // stars streaming past at the end of the line
    const starsOn = this.ts.stars || (this.vis === 'ginga' ? 1 : 0);
    if (starsOn > 0) {
      while (P.stars.length < 420) P.stars.push({ x: s - 200 + this.r() * 900, y: -260 + this.r() * 520, z: (this.r() < 0.6 ? 1 : -1) * (12 + Math.pow(this.r(), 1.5) * 380), size: 0.3 + this.r() * 2.2, ph: this.r() * 6 });
      for (const st of P.stars) if (st.x - s < -220) { st.x += 900; }
    }
    // orbs leave the route map and keep you company on the way to the stars
    if (this.dest === 'ginga' && (this.ascendP || 0) > 0.3 && !this.orbs.length) {
      this.stations.forEach((st, i) => { if (st.lit) this.orbs.push({ i, t: 0, p: this.mapPoint(i), seed: this.r() * 10 }); });
      if (this.orbs.length) this.audio.bell(this.audio.now(), 88, 2.5, 0.05, { ratio: 2, index: 1 });
    }
    for (const o of this.orbs) o.t += dt;
  }

  mapPoint(i) {
    const { x, y, w, h } = L.routeMap;
    const u = mapStationX(i) / MAP.W, v = MAP.y / MAP.H;
    return [x + (0.5 - u) * w, y + (0.5 - v) * h, 1.355];
  }

  // ── the frame ─────────────────────────────────────────────────────────────
  frame(dt) {
    const S = this.scene;
    const Wd = this.canvas.width, Hd = this.canvas.height;
    if (!Wd || !Hd) return;
    // camera
    const lk = this.lookCur;
    const tgt = this.focusT || { yaw: this.look.yaw - this.mouse.x * 0.05, pitch: this.look.pitch - this.mouse.y * 0.03, tanV: this.baseTanV, eye: L.eye };
    const k = 1 - Math.exp(-dt * (this.focusT ? 4 : 7));
    lk.yaw = lerp(lk.yaw, tgt.yaw, k); lk.pitch = lerp(lk.pitch, tgt.pitch, k); lk.tanV = lerp(lk.tanV, tgt.tanV, k);
    for (let i = 0; i < 3; i++) lk.eye[i] = lerp(lk.eye[i], tgt.eye[i], k);
    const eye = [lk.eye[0], lk.eye[1] + (this.reduced ? 0 : this.bob), lk.eye[2]];
    const ts = this.ts || {};
    const s = this.s;
    const th = THEMES[this.vis];
    const groundY = th.ground.y;
    const F = {
      w: Wd, h: Hd, t: this.t,
      eye, yaw: lk.yaw, pitch: lk.pitch, roll: 0, tanV: lk.tanV,
      s, v: this.v, heading: this.heading, curvBend: this.curv * 0.9,
      carRoll: (this.reduced ? 0.4 : 1) * (-this.latA * 0.006 + Math.sin(this.t * 1.3) * 0.0015 * (this.v / CRUISE)),
      carPitch: (ts.carPitch || 0) + this.a * 0.0012,
      rise: ts.rise || 0, climb: ts.climb || 0,
      vis: this.vis, skyA: this.sky.a, skyB: this.sky.b, skyMix: this.sky.mix,
      lightA: this.light.a, lightB: this.light.b, lightMix: this.light.mix,
      tunnel: this.tunnelF || 0, fluorMaster: ts.fluor ?? 1,
      groundY, groundFade: ts.groundFade ?? 1, stripFade: ts.stripFade ?? 1, trackOn: true, trackGlow: this.vis === 'ginga' ? 2 : 0,
      fogBoost: ts.fogBoost || 0, fogBoostCol: ts.fogCol,
      flick: this.flick, door: this.door,
      rain: clamp(this.rain + (this.rainBonus || 0), 0, 1) * (1 - (this.tunnelF || 0)),
      strobe: this.strobe ? { amt: this.strobe.amt, col: this.strobe.col } : { amt: 0, col: [0, 0, 0] },
      button: this.button, galaxy: 1,
    };
    // occluder strip for sun shadows (near-side layer of the current world)
    const entry = S.out.themes[this.vis];
    const occS = entry && entry.strips.find((x) => x.spec.occ);
    F.occ = occS && F.stripFade > 0.5 ? { tex: occS.tex, D: occS.spec.D, W: occS.spec.W, H: occS.spec.H + occS.spec.D * 0.03, offset: s, } : null;
    if (F.occ) F.occ.offset = s + (S.lit && S.lit.sunDir[2] > 0 ? 0 : 0.37 * occS.spec.W);
    const poles = th.poles && F.stripFade > 0.3 ? th.poles : null;
    F.pole = poles ? { D: poles.D, period: poles.period, offset: s, top: groundY + poles.top + 1.2 } : null;
    if (F.pole && S.lit && S.lit.sunDir[2] < 0 && poles.near) F.pole.D = -poles.near;
    // pole instances
    if (poles) {
      const list = [];
      for (const [z, off] of [[poles.D, 0], ...(poles.near ? [[poles.near, 13]] : [])]) {
        const per = poles.period;
        const k0 = Math.floor((s - 160 - off) / per), k1 = Math.ceil((s + 1500 - off) / per);
        for (let kk = k0; kk <= k1; kk++) {
          const x = kk * per + off - s;
          if (this.insideTunnel(x + s)) continue;
          list.push({ x, z, wire: true, lean: poles.lean ? Math.sin(kk * 7.3) * 0.08 : poles.broken && kk % 3 === 0 ? 0.12 : 0 });
        }
      }
      F.poles = { style: poles.style, list };
    }
    // tunnels in view, car-relative
    F.tunnels = this.tunnels.map((tn) => ({ x0: tn.s0 - s, x1: Math.min(tn.s1, s + 1e5) - s, kind: tn.kind, hill: tn.hill, lampOff: 7, portalIn: tn.portalIn, portalOut: tn.portalOut }));
    if (this.vis === 'rage') {
      const end = this.trans && this.trans.from === 'rage' ? this.trans.swapS - s : 1e5;
      F.tunnels.push({ x0: -1e5, x1: end, kind: 'graffiti', portalIn: false, portalOut: false });
    }
    F.tunnels = F.tunnels.filter((tn) => !(tn.kind === 'plain' && this.vis === 'rage' && tn.x0 < -1e4));
    // station platform
    F.station = null;
    if (this.station) {
      const sid = this.station.id;
      const thS = THEMES[this.themeOf(sid)];
      const i = this.idx(sid);
      const st = this.st(sid);
      const prev = this.stations[i - 1], next = this.stations[i + 1];
      F.station = { x: this.station.s - s, style: thS.platform, sign: S.out.sign(st, prev, next) };
    }
    F.crossings = this.crossings.map((c) => ({ x: c.s - s }));
    // straps
    let n = 0;
    const sd = this.strapData;
    for (const st of this.straps) {
      const o = n * 8;
      sd[o] = st.x; sd[o + 1] = 1.95; sd[o + 2] = st.z; sd[o + 3] = 0;
      sd[o + 4] = st.a; sd[o + 5] = st.b; sd[o + 6] = st.tw; sd[o + 7] = 1;
      n++;
    }
    F.straps = sd; F.strapCount = n;
    F.fan = this.fan;
    // positioned things
    const [px, pz] = L.pole;
    const dx = L.eye[0] - px, dz = L.eye[2] - pz, dl = Math.hypot(dx, dz);
    const ang = Math.atan2(dx / dl, dz / dl);
    F.buttonM = m4.trs(px + (dx / dl) * 0.064, 1.06, pz + (dz / dl) * 0.064, 0, ang, 0);
    F.mapM = m4.trs(L.routeMap.x, L.routeMap.y, 1.373, 0, Math.PI, 0);
    F.fareM = m4.trs(L.XF - 0.102, (L.fare.y0 + L.fare.y1) / 2, 0, 0, -Math.PI / 2, 0);
    F.ledM = m4.trs(L.led.x, L.led.y, 1.298, 0, Math.PI, 0);
    F.ticketM = m4.trs(L.ticket.x, L.ticket.y, 1.248, 0, Math.PI, 0);
    F.bookM = m4.trs(L.book.x, 0.445, L.book.z, 0, 0.35, 0);
    F.coverM = m4.mul(F.bookM, m4.trs(0, 0.0165, 0, -Math.PI / 2, 0, 0));
    const c = this.can;
    F.canM = m4.trs(c.x, 0.04, c.z, c.rot, 0, 0);
    F.canPickM = m4.trs(c.x, 0.05, c.z, 0, Math.PI, 0);
    F.umbM = m4.mul(m4.trs(-0.475, 0.98, 1.02, this.umb.a * 0.4, 0, this.umb.a * 0.15 + 0.06), m4.trs(0, -0.905, 0.045));
    F.umbPickM = m4.trs(-0.475, 0.55, 1.0, 0, Math.PI, 0);
    F.adM = this.ads.map((d) => m4.mul(m4.mul(m4.trs(d.x, 2.23, 0, d.b, 0, d.a), m4.trs(0, -0.32, 0)), m4.trs(0, 0, -0.004, 0, Math.PI, 0)));
    // lights through the windows
    this.buildLights(F);
    // decals
    const leafX = this.door * 0.43;
    const D = [];
    D.push({ tex: 'map', q: 'map', w: L.routeMap.w, h: L.routeMap.h, m: F.mapM, mode: 1 });
    D.push({ tex: 'fare', q: 'fare', w: 2.6, h: 0.34, m: F.fareM, mode: 2, emis: 1.6 * (0.6 + 0.4 * (ts.fluor ?? 1)) });
    D.push({ tex: 'ticket', q: 'ticket', w: 0.3, h: 0.26, m: F.ticketM, mode: 1 });
    D.push({ tex: 'door', q: 'door', w: 0.16, h: 0.12, m: m4.trs(0.22 + leafX, 1.16, 1.396, 0, Math.PI, 0), mode: 1 });
    D.push({ tex: 'cat', q: 'cat', w: 0.085, h: 0.085, m: m4.trs(-2.02, 1.02, 1.417, 0, Math.PI, 0), mode: 1 });
    D.push({ tex: 'plate', q: 'plate', w: 0.3, h: 0.07, m: m4.trs(L.XF + 0.012, 1.74, -0.79, 0, -Math.PI / 2, 0), mode: 1 });
    D.push({ tex: 'farebox', q: 'farebox', w: 0.22, h: 0.086, m: m4.trs(4.637, 0.93, -1.085, 0, -Math.PI / 2, 0), mode: 1 });
    D.push({ tex: 'lamp', q: 'lamp', w: 0.085, h: 0.05, m: m4.mul(F.buttonM, m4.trs(0, 0.036, 0.0126)), mode: this.button.lit > 0.5 ? 2 : 1, emis: 2.2, tint: [1, 1, 1, 0] });
    D.push({ tex: 'book', q: 'book', w: 0.104, h: 0.148, m: F.coverM, mode: 1 });
    this.ads.forEach((d, k) => {
      D.push({ tex: 'ad' + d.i, q: 'ad', w: 0.78, h: 0.52, m: F.adM[k], mode: 1 });
      D.push({ tex: 'adb' + d.i, q: 'adb', w: 0.78, h: 0.52, m: m4.mul(m4.mul(m4.trs(d.x, 2.23, 0, d.b, 0, d.a), m4.trs(0, -0.32, 0)), m4.trs(0, 0, 0.004)), mode: 1 });
    });
    // the little train marker on the route map
    const mk = this.markerPos();
    D.push({ tex: 'marker', q: 'marker', w: 0.05, h: 0.025, m: m4.trs(mk[0], mk[1], 1.3715, 0, Math.PI, 0), mode: 2, emis: 1.2 });
    F.decals = D;
    // LED
    const lm = this.ledMsg;
    F.leds = S.texs.led && lm ? [{ tex: S.texs.led, q: 'led', w: L.led.w, h: L.led.h, m: m4.trs(L.led.x, L.led.y, 1.297, 0, Math.PI, 0), grid: [LED_COLS, LED_ROWS], scroll: lm.scroll ? Math.floor(lm.x) - LED_COLS : 0, texW: lm.texW, bright: 0.8 }] : [];
    // sprites, beams
    this.buildSprites(F);
    this.buildBeams(F);
    this.F = F;
    S.render(F);
  }

  insideTunnel(x) {
    for (const tn of this.tunnels) if (x > tn.s0 - 8 && x < tn.s1 + 8) return true;
    return this.vis === 'rage';
  }

  markerPos() {
    // between the station we left and the one we are going to
    const hi = this.here ? this.idx(this.here) : -0.6;
    const di = this.idx(this.dest);
    let p = 0;
    if (this.phase === 'run' || this.phase === 'approach') {
      const total = this.station && this.phase === 'approach' ? this.station.s : Math.max(this.s + 200, 300);
      p = clamp(this.s / Math.max(1, total), 0, 0.98);
      if (this.phase === 'run') p = Math.min(p, 0.75);
    }
    if (this.phase === 'arrived') p = 1;
    const f = lerp(hi, di, p);
    const { x, y, w, h } = L.routeMap;
    const u = (MAP.x0 + f * MAP.dx) / MAP.W, v = (MAP.y - 50) / MAP.H;
    return [x + (0.5 - u) * w, y + (0.5 - v) * h];
  }

  buildLights(F) {
    const s = this.s;
    const cand = [];
    const add = (x, y, z, r, col, I) => cand.push({ p: [x, y, z, r], c: [...col, I], d: Math.abs(x - L.eye[0]) });
    // tunnel lamps
    for (const tn of F.tunnels) {
      const graf = tn.kind === 'graffiti';
      const per = graf ? 14 : 22;
      const col = graf ? lin('#e8f0ff') : lin(TUNNEL.lamp);
      for (let kk = Math.floor((s - 14) / per); kk <= Math.ceil((s + 14) / per); kk++) {
        const x = kk * per - 7 - s;
        if (x < tn.x0 || x > tn.x1) continue;
        add(x, 1.05, 2.25, 2.4, col, graf ? 1.2 : 2.2);
        add(x, 1.05, -2.25, 2.4, col, graf ? 1.2 : 2.2);
      }
    }
    // neon passing in Ginza
    if (this.vis === 'showa') {
      for (let kk = Math.floor((s - 20) / 9); kk <= Math.ceil((s + 20) / 9); kk++) {
        const hh = Math.abs(Math.sin(kk * 12.9898) * 43758.5453) % 1;
        if (hh < 0.45) continue;
        add(kk * 9 - s, 1.4 + hh * 2, (hh > 0.7 ? 1 : -1) * 7, 6, lin(NEON[Math.floor(hh * 50) % NEON.length]), 1.4);
      }
    }
    // platform lamps
    if (F.station && Math.abs(F.station.x) < 60) {
      const thS = THEMES[this.themeOf(this.station.id)];
      const night = 1 - Math.min(1, (thS.light.winL || 0) * 1.4);
      for (let x = -10; x <= 10; x += 5) add(F.station.x + x, 2.6, 3.5, 5, lin('#fff1d8'), 1.0 * (0.25 + night));
    }
    // circles: bursts flash pink
    for (const rg of this.particles.rings) if (rg.flash > 0) { add(rg.x - s, rg.y, rg.z, 14, rg.col, rg.flash * 3); rg.flash *= 0.85; }
    // 地下 strobe
    if (this.strobe) add(0, 1.4, 3.4, 30, this.strobe.col, this.strobe.amt * 6);
    // crossing lamps
    for (const c of F.crossings) if (Math.abs(c.x) < 30) add(c.x, 1.45, 3.4, 4, [1, 0.08, 0.03], (Math.sin(this.t * 9) > 0 ? 1 : 0.1) * 1.5);
    cand.sort((a, b) => a.d - b.d);
    const pl = new Float32Array(16), plc = new Float32Array(16);
    cand.slice(0, 4).forEach((c, i) => { pl.set(c.p, i * 4); plc.set(c.c, i * 4); });
    F.pl = pl; F.plc = plc;
    // outside object lights (platform & lamp heads)
    const ol = new Float32Array(24), olc = new Float32Array(24);
    cand.slice(0, 6).forEach((c, i) => { ol.set(c.p, i * 4); olc.set(c.c, i * 4); });
    F.ol = ol; F.olc = olc;
    // interior: button lamp, LED glow, orbs
    const il = new Float32Array(32), ilc = new Float32Array(32);
    let n = 0;
    const iadd = (p, r, col, I) => { if (n >= 8) return; il.set([...p, r], n * 4); ilc.set([...col, I], n * 4); n++; };
    if (this.button.lit > 0.05) { const bp = [F.buttonM[12], F.buttonM[13] + 0.04, F.buttonM[14]]; iadd(bp, 0.35, [1, 0.25, 0.1], this.button.lit * 0.5); }
    iadd([L.led.x, L.led.y - 0.1, 1.2], 0.6, [1, 0.6, 0.2], 0.12 * (this.ledMsg ? 1 : 0));
    this.orbPositions = [];
    for (const o of this.orbs) {
      const p = this.orbPos(o);
      this.orbPositions.push(p);
      iadd(p, 1.2, [1, 0.88, 0.62], 0.5 * ss(0, 1.5, o.t));
    }
    F.il = il; F.ilc = ilc;
  }

  orbPos(o) {
    // drift off the map, wander the car, gather by the window, then out into the stars
    const a = o.p;
    const t = o.t;
    const k = ss(0, 4, t);
    const wx = -1.5 + Math.sin(o.seed + t * 0.35) * 2.2;
    const wy = 1.45 + Math.sin(o.seed * 2 + t * 0.5) * 0.35;
    const wz = 0.1 + Math.cos(o.seed + t * 0.42) * 0.6;
    let p = [lerp(a[0], wx, k), lerp(a[1], wy, k), lerp(a[2], wz, k)];
    const out = ss(14, 22, t);
    p = [lerp(p[0], -1.5 + (o.i - 3) * 0.35, out), lerp(p[1], 1.3 + out * 0.6, out), lerp(p[2], 1.3 + out * 4, out)];
    return p;
  }

  buildSprites(F) {
    const sp = this.sprites;
    let n = 0;
    const push = (x, y, z, size, r, g, b, a, kind, stretch = 0, phase = 0, rot = 0) => {
      if (n >= 1400) return;
      const o = n * 12;
      sp[o] = x; sp[o + 1] = y; sp[o + 2] = z; sp[o + 3] = size;
      sp[o + 4] = r; sp[o + 5] = g; sp[o + 6] = b; sp[o + 7] = a;
      sp[o + 8] = kind; sp[o + 9] = stretch; sp[o + 10] = phase; sp[o + 11] = rot;
      n++;
    };
    const s = this.s;
    const Lt = this.scene.lit || { flu: [0.5, 0.5, 0.5] };
    const fl = (Lt.flu[1] || 0) * (F.fluorMaster ?? 1);
    // bloom around the tubes
    for (const zt of [-0.55, 0.55]) for (let x = L.tubes[0] + 0.3; x < L.tubes[1] - 0.6; x += 0.42) {
      const near = Math.abs(x - this.flick.x) < 0.6 ? this.flick.val : 1;
      push(x, 2.3, zt, 0.07, 0.85, 0.93, 1.0, fl * 0.45 * near, 0);
    }
    // the LED's own light
    if (this.ledMsg) push(L.led.x, L.led.y, 1.25, 0.42, 1, 0.55, 0.15, 0.09, 0, 1.6);
    // orbs on the map
    const orbsOut = this.orbs.length > 0;
    this.stations.forEach((st, i) => {
      if (!st.lit) return;
      const p = this.mapPoint(i);
      const pulse = 0.85 + 0.15 * Math.sin(this.t * 1.7 + i);
      const left = orbsOut ? 1 - ss(0, 2, this.orbs[0].t) : 1;
      push(p[0], p[1], p[2] - 0.01, 0.045 * pulse, 1, 0.86, 0.6, 1.1 * left, 1);
    });
    (this.orbPositions || []).forEach((p, k) => push(p[0], p[1], p[2], 0.07, 1, 0.88, 0.62, 1.2 * ss(0, 1, this.orbs[k].t), 1));
    // the request lamp
    if (this.button.lit > 0.05) push(F.buttonM[12], F.buttonM[13] + 0.036, F.buttonM[14], 0.06, 1, 0.3, 0.12, 0.8 * this.button.lit, 0);
    // ── outside: transform by the rolling world, the curve, the rise ──
    const Wm = this.scene.mats.world;
    const ow = (x, y, z) => {
      const zz = z + F.curvBend * x * Math.abs(x) * 0.5;
      const p = m4.xform(Wm, [x, y - F.rise, zz]);
      return p;
    };
    // street lamps, crossing lamps, platform lamps, tunnel lamps
    if (F.poles && F.poles.style === 'lamp') for (const ps of F.poles.list) { const p = ow(ps.x, F.groundY + 9.34, ps.z - 1.55); push(p[0], p[1], p[2], 1.4, 1, 0.75, 0.42, 0.55, 0); }
    for (const c of F.crossings) {
      const on = Math.sin(this.t * 9) > 0;
      for (const [cx, cz] of [[c.x, 3.32], [c.x + 9, -3.32]]) {
        const p1 = ow(cx, 1.53, cz + (cz > 0 ? -0.1 : 0.1) * 0 - 0.32), p2 = ow(cx, 1.53, cz + 0.32);
        push(p1[0], p1[1], p1[2], 0.45, 1, 0.08, 0.03, on ? 1.2 : 0.05, 0);
        push(p2[0], p2[1], p2[2], 0.45, 1, 0.08, 0.03, on ? 0.05 : 1.2, 0);
      }
    }
    for (const tn of F.tunnels) {
      const graf = tn.kind === 'graffiti', per = graf ? 14 : 22;
      for (let kk = Math.floor((s - 120) / per); kk <= Math.ceil((s + 500) / per); kk++) {
        const x = kk * per - 7 - s;
        if (x < tn.x0 || x > tn.x1) continue;
        for (const z of [2.2, -2.2]) { const p = ow(x, 1.05, z); push(p[0], p[1], p[2], 0.5, graf ? 0.8 : 1, graf ? 0.9 : 0.6, graf ? 1 : 0.25, 0.7, 0); }
      }
    }
    if (F.station) {
      const thS = THEMES[this.themeOf(this.station.id)];
      const night = 1 - Math.min(1, (thS.light.winL || 0) * 1.4);
      for (let x = -15; x <= 15; x += 5) { const p = ow(F.station.x + x, 2.62, 3.47); push(p[0], p[1], p[2], 0.8, 1, 0.95, 0.85, 0.25 + night * 0.5, 0); }
      const vp = ow(F.station.x + 7.2, 1.3, 5.55); push(vp[0], vp[1], vp[2], 1.2, 1, 0.97, 0.9, 0.35 + night * 0.4, 0);
    }
    // bubbles
    for (const b of this.particles.bubbles) { const p = ow(b.x - s + Math.sin(b.ph) * 0.3, b.y, b.z); push(p[0], p[1], p[2], b.size, 1, 1, 1, 0.9, 3, 0, b.ph * 0.05); }
    // approach circles
    for (const rg of this.particles.rings) { const p = ow(rg.x - s, rg.y, rg.z); push(p[0], p[1], p[2], rg.size, rg.col[0], rg.col[1], rg.col[2], 1.6, 4, 0, rg.t); }
    // stars
    const starsOn = Math.max(this.ts?.stars || 0, this.vis === 'ginga' ? 1 : 0);
    if (starsOn > 0) for (const st of this.particles.stars) {
      const p = [st.x - s, st.y, st.z];
      push(p[0], p[1], p[2], st.size, 0.85, 0.9, 1, starsOn * (0.6 + 0.4 * Math.sin(this.t * 2 + st.ph)), 5);
    }
    // dust in the sunbeams
    const sun = this.scene.lit ? this.scene.lit.sunCol : [0, 0, 0];
    const sunI = (sun[0] + sun[1] + sun[2]) / 3;
    const dustAmt = (THEMES[this.vis].particles === 'dust' ? 1.6 : 0.8) * Math.min(1, sunI);
    const P = this.particles;
    if (dustAmt > 0.05) {
      while (P.dust.length < 140) P.dust.push({ x: -4 + this.r() * 6, y: 0.4 + this.r() * 1.9, z: -1.1 + this.r() * 2.3, ph: this.r() * 10 });
      const sd = this.scene.lit.sunDir;
      for (const d of P.dust) {
        d.ph += 0.01;
        const x = d.x + Math.sin(d.ph * 0.7) * 0.1, y = d.y + Math.sin(d.ph * 0.5 + 1) * 0.06, z = d.z + Math.cos(d.ph * 0.6) * 0.08;
        const lit = this.sunAt([x, y, z], sd);
        if (lit > 0.05) push(x, y, z, 0.006, 1, 0.92, 0.75, lit * dustAmt * 1.4, 2);
      }
    }
    F.sprites = sp; F.spriteCount = n;
  }

  // a JS mirror of the shader's window test, for dust motes and light shafts
  sunAt(p, L3) {
    if (Math.abs(L3[2]) < 0.03) return 0;
    const zw = L3[2] < 0 ? -L.W : L.W;
    const t = (zw - p[2]) / L3[2];
    if (t <= 0) return 0;
    const hx = p[0] + L3[0] * t, hy = p[1] + L3[1] * t;
    if (hy < L.SILL || hy > L.TOP) return 0;
    const side = L3[2] < 0 ? '-1' : '1';
    for (let i = 0; i < L.windows.length; i++) {
      const [a, b] = L.windows[i];
      if (hx > a && hx < b) { const bl = L.blinds[side][i]; return hy > L.TOP - bl * (L.TOP - L.SILL) ? 0.2 : 1; }
    }
    return 0;
  }

  buildBeams(F) {
    const Lt = this.scene.lit;
    F.beamCount = 0;
    if (!Lt) return;
    const sun = Lt.sunCol, sd = Lt.sunDir;
    const I = (sun[0] + sun[1] + sun[2]) / 3 * (THEMES[this.vis].particles === 'dust' ? 0.06 : 0.03) * (1 - (this.tunnelF || 0));
    if (I < 0.002 || Math.abs(sd[2]) < 0.05) return;
    const side = sd[2] < 0 ? -1 : 1;
    const zw = side * L.W;
    const b = this.beams;
    let n = 0;
    const col = sun.map((c) => c / Math.max(0.001, Math.max(...sun)));
    L.windows.forEach(([x0, x1], wi) => {
      const bl = L.blinds[String(side)][wi];
      const top = L.TOP - 0.06 - bl * (L.TOP - L.SILL);
      for (let k = 1; k <= 5 && n < 60; k++) {
        const t = k * 0.42;
        const o = [-sd[0] * t, -sd[1] * t, -sd[2] * t];
        const z = zw + o[2];
        if (Math.abs(z) > L.W) continue;
        const y0 = L.SILL + 0.03 + o[1], y1 = top + o[1];
        if (y1 < 0.05) continue;
        const a = I * (1 - k / 6);
        const quad = [[x0 + o[0], Math.max(0, y0), z], [x1 + o[0], Math.max(0, y0), z], [x1 + o[0], y1, z], [x0 + o[0], y1, z]];
        const uv = [[0, 0], [1, 0], [1, 1], [0, 1]];
        const tri = [0, 1, 2, 0, 2, 3];
        let w = n * 6 * 16;
        for (const vi of tri) {
          const p = quad[vi];
          b.set([p[0], p[1], p[2], 0, 0, -side, uv[vi][0], uv[vi][1], col[0], col[1], col[2], a, -1, 0, 1, 0], w);
          w += 16;
        }
        n++;
      }
    });
    F.beams = b; F.beamCount = n;
  }

  resize() {
    if (!this.canvas) return;
    const w = this.root.clientWidth || innerWidth, h = this.root.clientHeight || innerHeight;
    const dpr = Math.min(2, this.ctx.dpr || 1);
    const scale = w * h * dpr * dpr > 4.2e6 ? Math.sqrt(4.2e6 / (w * h * dpr * dpr)) : 1;
    this.canvas.width = Math.round(w * dpr * scale);
    this.canvas.height = Math.round(h * dpr * scale);
    const aspect = w / h;
    // wider screens see more of the car; phones get a taller view and look around
    this.baseTanV = aspect >= 1.2 ? 0.64 : aspect >= 0.9 ? 0.78 : clamp(0.44 / aspect, 0.8, 1.05);
    if (aspect < 0.9) this.lookBase.yaw = -1.48;
    if (!this.moved) { this.look.yaw = this.lookBase.yaw; this.lookCur.tanV = this.baseTanV; }
  }

  destroy() {
    this.dead = true;
    clearTimeout(this.capTimer);
    try { this.voice && this.voice.destroy(); } catch (e) {}
    try { this.audio && this.audio.destroy(); } catch (e) {}
    try { this.scene && this.scene.destroy(); } catch (e) {}
    const ext = this.gl && this.gl.getExtension('WEBGL_lose_context');
    if (ext) try { ext.loseContext(); } catch (e) {}
  }
}
