// 黄昏ヶ浜 たそがれがはま — H07. Golden hour on a quiet coast: the long bridge, the empty
// road, the roofs of a town that went under the sea. The wallpaper you asked for, alive.
// The light is earned by staying until the sun touches the water.
import { GLSL_SKY } from './coast/glsl-sky.js';
import { GLSL_WORLD } from './coast/glsl-world.js';
import { GLSL_MAIN } from './coast/glsl-main.js';
import { noiseData, rippleData } from './coast/textures.js';
import { CoastSound } from './coast/sound.js';

const FRAG = GLSL_SKY + GLSL_WORLD + GLSL_MAIN;
const VERT = 'attribute vec2 aPos;\nvoid main() { gl_Position = vec4(aPos, 0.0, 1.0); }\n';

const SUN_R = 0.0175;
const SUN_AZ = -0.067;
const EL0 = 0.112;
const T_TOUCH = 118;                     // seconds of staying before the sun's lower edge meets the sea
const RATE = (EL0 - SUN_R) / T_TOUCH;
const CLOCK0 = 16 * 60 + 54;             // the radio's clock reads 16:54 when you arrive
const CLOCK_RATE = 6;                    // one minute on the radio every ten seconds
const LABEL = 'the road the sun laid on the sea';

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const ease = (x) => x * x * (3 - 2 * x);

const UNIFORMS = ['uRes', 'uTime', 'uSunEl', 'uSunAz', 'uSet', 'uDusk', 'uLights', 'uPearl', 'uStreet',
  'uStar', 'uOrb', 'uFade', 'uExpo', 'uCam', 'uYaw', 'uFocal', 'uHz', 'uShift', 'uSeed', 'uRipK',
  'uFerry', 'uLedge', 'uNoise', 'uRipple'];

function timeline(t) {
  const el = Math.max(-0.06, EL0 - RATE * t);
  const dusk = 0.9 * ease(clamp01((t - (T_TOUCH + 15)) / 150));
  return {
    el,
    set: clamp01((EL0 - el) / EL0),
    dusk,
    lights: clamp01((t - 50) / 95),
    pearl: clamp01((t - 128) / 45),
    street: clamp01((t - 95) / 70),
    star: ease(clamp01((t - 152) / 22)),
    expo: 1 + 0.55 * dusk,
    ferry: 0.12 + t / 720,
  };
}

const CSS = `
.cz { position: absolute; inset: 0; overflow: hidden; background: #2a1d2a; user-select: none; -webkit-user-select: none; }
.cz .cz-gl { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.cz .cz-fallback { position: absolute; inset: 0; background:
  linear-gradient(to bottom, #4a4a7a 0%, #b77f98 34%, #f19a7a 52%, #ffc27e 58%, #6a4f62 58.4%, #3a2f45 100%); }
.cz .cz-ui { position: absolute; inset: 0; pointer-events: none; transition: opacity 1.6s ease; }
.cz.wp .cz-ui { opacity: 0; }
.cz.wp.idle { cursor: none; }
.cz .cz-hint { position: absolute; left: max(22px, 5.5vw); top: max(74px, 12vh); max-width: min(78vw, 560px);
  color: rgba(255, 244, 232, .93); font-family: 'Noto Serif JP', serif; font-weight: 400;
  font-size: clamp(15px, 1.45vw, 21px); letter-spacing: .14em; line-height: 1.6;
  text-shadow: 0 0 22px rgba(80, 28, 46, .6), 0 1px 3px rgba(60, 20, 34, .55);
  opacity: 0; transform: translateY(6px); transition: opacity 2.6s ease, transform 2.6s ease; pointer-events: auto; }
.cz .cz-hint.on { opacity: 1; transform: none; }
.cz .cz-hint.en, .cz .cz-wpline.en { font-family: 'EB Garamond', serif; font-style: italic; letter-spacing: .03em; font-size: clamp(17px, 1.6vw, 23px); }
.cz .cz-hint small { display: block; margin-top: .5em; font-family: 'EB Garamond', serif; font-style: italic;
  font-size: .8em; letter-spacing: .04em; color: rgba(255, 238, 226, .8); }
.cz .cz-wpline { position: absolute; left: 50%; top: max(90px, 21vh); transform: translate(-50%, 8px); width: max-content; max-width: 88vw;
  text-align: center; color: rgba(255, 246, 236, .94); font-family: 'Noto Serif JP', serif; font-weight: 400;
  font-size: clamp(15px, 1.4vw, 20px); letter-spacing: .16em; line-height: 1.6;
  text-shadow: 0 1px 18px rgba(70, 26, 40, .55), 0 0 2px rgba(60, 20, 30, .5);
  opacity: 0; transition: opacity 2.2s ease, transform 2.2s ease; pointer-events: none; }
.cz .cz-wpline.on { opacity: 1; transform: translate(-50%, 0); }
.cz .cz-wpline small { display: block; margin-top: .45em; font-family: 'EB Garamond', serif; font-style: italic;
  letter-spacing: .05em; font-size: .78em; color: rgba(255, 236, 222, .6); }
.cz .cz-wpbtn { position: absolute; left: max(16px, env(safe-area-inset-left)); top: max(16px, env(safe-area-inset-top));
  height: 32px; padding: 0 12px 0 9px; display: flex; align-items: center; gap: 8px; border-radius: 999px;
  border: 1px solid rgba(255, 240, 225, .16); background: rgba(40, 24, 36, .28); color: rgba(255, 240, 228, .78);
  -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); pointer-events: auto; cursor: pointer;
  font: 500 12px/1 'Zen Kaku Gothic New', sans-serif; letter-spacing: .14em; opacity: .62;
  transition: opacity .3s ease, background .3s ease; }
.cz .cz-wpbtn:hover, .cz .cz-wpbtn:focus-visible { opacity: 1; background: rgba(40, 24, 36, .5); outline: none; }
.cz .cz-wpbtn svg { width: 15px; height: 12px; }
.cz .cz-wpbtn kbd { font: 400 11px/1 'IBM Plex Mono', monospace; opacity: .6; margin-left: 2px; }
.cz .cz-radio { position: absolute; width: var(--rw, 110px); height: var(--rw, 110px); pointer-events: auto; cursor: pointer;
  transition: transform .5s cubic-bezier(.2, .8, .2, 1), opacity 1.6s ease; transform-origin: 50% 100%; outline: none;
  -webkit-tap-highlight-color: transparent; }
.cz .cz-radio:hover { transform: translateY(-1px); }
.cz .cz-radio:active { transform: translateY(0) scale(.985); }
.cz .cz-radio:focus-visible .cz-body { filter: drop-shadow(0 0 2px rgba(255, 220, 170, .9)); }
.cz .cz-radio svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.cz .cz-shade { position: absolute; left: 6%; right: -22%; bottom: -5%; height: 11%; border-radius: 50%;
  background: radial-gradient(closest-side, rgba(20, 8, 16, .55), rgba(20, 8, 16, 0)); transform: skewX(-28deg); }
.cz .cz-spill { position: absolute; left: -20%; right: -20%; bottom: -14%; height: 26%; border-radius: 50%;
  background: radial-gradient(closest-side, rgba(255, 170, 90, .28), rgba(255, 170, 90, 0)); opacity: 0; transition: opacity 1.2s ease; }
.cz .cz-radio.on .cz-spill { opacity: 1; }
.cz .cz-lcd { position: absolute; left: 56.5%; top: 55.5%; width: 36%; height: 13.5%; border-radius: 2px;
  display: grid; place-items: center; overflow: hidden; background: #2a2a22;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, .7); color: rgba(30, 30, 24, .9);
  font: 400 calc(var(--rw, 110px) * .105)/1 'DotGothic16', monospace; letter-spacing: .06em; transition: background .6s ease, color .6s ease; }
.cz .cz-lcd span { white-space: nowrap; }
.cz .cz-radio .cz-lcd { background: linear-gradient(#5d5a46, #4c4a3a); color: rgba(24, 24, 18, .82); }
.cz .cz-radio.on .cz-lcd { background: linear-gradient(#5a3410, #3c220a); color: #ffc070; text-shadow: 0 0 4px rgba(255, 160, 70, .8); }
.cz .cz-say { position: absolute; left: 50%; bottom: 104%; transform: translate(-50%, 4px); white-space: nowrap;
  font: 400 clamp(13px, 1.05vw, 16px)/1.2 'DotGothic16', monospace; letter-spacing: .12em; color: #ffcf8a;
  text-shadow: 0 0 6px rgba(255, 150, 60, .75), 0 1px 10px rgba(60, 20, 20, .6);
  opacity: 0; transition: opacity .9s ease, transform .9s ease; pointer-events: auto; }
.cz .cz-say.on { opacity: 1; transform: translate(-50%, 0); }
@media (max-width: 640px) { .cz .cz-hint { top: max(70px, 10vh); } .cz .cz-wpbtn span { display: none; } }
@media (prefers-reduced-motion: reduce) { .cz .cz-hint, .cz .cz-wpline, .cz .cz-say { transition-duration: .01s; } }
`;

const RADIO_SVG = `
<svg viewBox="0 -36 120 120" aria-hidden="true">
  <defs>
    <linearGradient id="czBody" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#cfc6b5"/><stop offset=".08" stop-color="#b9b09e"/>
      <stop offset=".55" stop-color="#8e8676"/><stop offset="1" stop-color="#5d574c"/>
    </linearGradient>
    <linearGradient id="czRim" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ffb46a" stop-opacity=".55"/><stop offset=".35" stop-color="#ffb46a" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="czChrome" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#6d665e"/><stop offset=".5" stop-color="#e9dfcf"/><stop offset="1" stop-color="#6d665e"/>
    </linearGradient>
    <pattern id="czGrille" width="3.2" height="3.2" patternUnits="userSpaceOnUse">
      <rect width="3.2" height="3.2" fill="#3c3832"/><circle cx="1.6" cy="1.6" r=".95" fill="#15130f"/>
    </pattern>
  </defs>
  <g class="cz-body">
    <line class="cz-ant" x1="98" y1="23" x2="118" y2="-33" stroke="url(#czChrome)" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="104.2" y1="5.5" x2="106.6" y2="-1.2" stroke="#d9cfbf" stroke-width="2.2" stroke-linecap="round" opacity=".7"/>
    <circle cx="118" cy="-33" r="1.6" fill="#e9dfcf"/>
    <path d="M16 23 V15 Q16 9 22 9 H98 Q104 9 104 15 V23" fill="none" stroke="#2d2924" stroke-width="4.2"/>
    <path d="M16 23 V15 Q16 9 22 9 H98 Q104 9 104 15 V23" fill="none" stroke="#ffb46a" stroke-opacity=".35" stroke-width="1" transform="translate(-.6 -.8)"/>
    <rect x="4" y="22" width="112" height="60" rx="7" fill="url(#czBody)" stroke="#2f2a24" stroke-width="1.2"/>
    <rect x="4" y="22" width="112" height="60" rx="7" fill="url(#czRim)"/>
    <path d="M10 23.2 H110" stroke="#ffd8a8" stroke-opacity=".75" stroke-width="1.1" stroke-linecap="round"/>
    <rect x="10" y="30" width="52" height="44" rx="4" fill="url(#czGrille)" stroke="#26221d" stroke-width=".8"/>
    <text x="36" y="79.2" text-anchor="middle" font-family="Silkscreen, monospace" font-size="4.2" letter-spacing=".9" fill="#2b2620" opacity=".8">HIKARI · ICR-77</text>
    <rect x="66.5" y="30" width="45" height="18.5" rx="2" fill="#1b1914"/>
    <g stroke="#2b2620" stroke-width=".6">
      <line x1="69" y1="53" x2="109" y2="53"/>
      <line x1="70" y1="51.5" x2="70" y2="54.5"/><line x1="75" y1="52" x2="75" y2="54"/><line x1="80" y1="51.5" x2="80" y2="54.5"/>
      <line x1="85" y1="52" x2="85" y2="54"/><line x1="90" y1="51.5" x2="90" y2="54.5"/><line x1="95" y1="52" x2="95" y2="54"/>
      <line x1="100" y1="51.5" x2="100" y2="54.5"/><line x1="105" y1="52" x2="105" y2="54"/>
    </g>
    <line class="cz-needle" x1="88" y1="50.5" x2="88" y2="55.5" stroke="#b8402c" stroke-width="1"/>
    <circle cx="77" cy="68" r="6.2" fill="#2f2b26" stroke="#1b1814" stroke-width=".8"/>
    <circle cx="77" cy="68" r="4.4" fill="#4a453d"/><line x1="77" y1="64" x2="77" y2="66.6" stroke="#cfc6b5" stroke-width=".9"/>
    <circle cx="101" cy="68" r="6.2" fill="#2f2b26" stroke="#1b1814" stroke-width=".8"/>
    <circle cx="101" cy="68" r="4.4" fill="#4a453d"/><line class="cz-knob" x1="101" y1="64" x2="101" y2="66.6" stroke="#cfc6b5" stroke-width=".9"/>
    <circle class="cz-led" cx="89" cy="61" r="1.5" fill="#3a1410"/>
  </g>
</svg>`;

export default {
  id: 'coast',
  mount(root, ctx) {
    const signal = ctx.signal;
    root.classList.add('cz');
    const style = document.createElement('style');
    style.textContent = CSS;
    root.appendChild(style);

    const canvas = document.createElement('canvas');
    canvas.className = 'cz-gl';
    root.appendChild(canvas);

    const ui = document.createElement('div');
    ui.className = 'cz-ui';
    root.appendChild(ui);

    const hint = document.createElement('div');
    hint.className = 'cz-hint';
    const revisit = ctx.hasOrb();
    ui.appendChild(hint);

    const wpBtn = document.createElement('button');
    wpBtn.className = 'cz-wpbtn';
    wpBtn.type = 'button';
    wpBtn.innerHTML = '<svg viewBox="0 0 15 12" aria-hidden="true"><rect x=".75" y=".75" width="13.5" height="10.5" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M2.6 9.2 L6 5.6 L8.4 7.8 L10 6.4 L12.6 9.2" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/><circle cx="10.6" cy="3.6" r="1" fill="currentColor"/></svg><span class="cz-wplabel"></span><kbd>⌥</kbd>';
    ui.appendChild(wpBtn);

    const wpLine = document.createElement('div');
    wpLine.className = 'cz-wpline';
    root.appendChild(wpLine);

    const radio = document.createElement('div');
    radio.className = 'cz-radio';
    radio.setAttribute('role', 'button');
    radio.setAttribute('tabindex', '0');
    radio.setAttribute('aria-pressed', 'false');
    radio.innerHTML = `<div class="cz-shade"></div><div class="cz-spill"></div>${RADIO_SVG}<div class="cz-lcd"><span>16:54</span></div><div class="cz-say"></div>`;
    ui.appendChild(radio);
    const lcd = radio.querySelector('.cz-lcd span');
    const say = radio.querySelector('.cz-say');
    const led = radio.querySelector('.cz-led');
    const needle = radio.querySelector('.cz-needle');
    const knob = radio.querySelector('.cz-knob');

    ctx.jp.attach(root);

    // ── language: Japanese with glosses, or English throughout ──
    const isEn = () => !!(ctx.en || ctx.lang === 'en');
    let sayCur = null;
    function renderText() {
      const en = isEn();
      hint.innerHTML = en
        ? (revisit ? 'The sun is going down again today.' : 'Let’s stay here until the sun goes down.')
        : (revisit
          ? `${ctx.jp.html('今日も、日が[沈む|しずむ|to sink; (of the sun) to set]。')}<small>today, too, the sun goes down.</small>`
          : `${ctx.jp.html('日が[沈む|しずむ|to sink; (of the sun) to set]まで、ここにいよう。')}<small>let’s stay here until the sun goes down.</small>`);
      hint.classList.toggle('en', en);
      wpLine.classList.toggle('en', en);
      wpLine.innerHTML = en
        ? 'The wallpaper you wanted. This one moves.'
        : `${ctx.jp.html('[壁紙|かべがみ|wallpaper]にしたかった[景色|けしき|scenery; a view]。これは、[動く|うごく|to move]。')}<small>the wallpaper you wanted. this one moves.</small>`;
      wpBtn.querySelector('.cz-wplabel').textContent = en ? 'Wallpaper' : '壁紙';
      wpBtn.setAttribute('aria-label', en ? 'Wallpaper mode (⌥)' : '壁紙モード');
      radio.setAttribute('aria-label', en ? 'Radio' : 'ラジオ');
      if (sayCur) say.innerHTML = en ? sayCur.en : ctx.jp.html(sayCur.ja);
    }
    renderText();
    if (typeof ctx.onLang === 'function') ctx.onLang(() => renderText());

    // ── WebGL ──
    let gl = null, prog = null, U = {}, glOK = false;
    const ripple = rippleData();
    const noise = noiseData();

    function initGL() {
      const opts = { antialias: false, alpha: false, depth: false, stencil: false, premultipliedAlpha: false,
        preserveDrawingBuffer: false, powerPreference: 'high-performance' };
      gl = canvas.getContext('webgl2', opts) || canvas.getContext('webgl', opts);
      if (!gl) return false;
      const sh = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) {
          const log = gl.getShaderInfoLog(s);
          gl.deleteShader(s);
          throw new Error('coast shader: ' + log);
        }
        return s;
      };
      prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
      gl.bindAttribLocation(prog, 0, 'aPos');
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS) && !gl.isContextLost()) {
        throw new Error('coast link: ' + gl.getProgramInfoLog(prog));
      }
      gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      U = {};
      UNIFORMS.forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });
      const tex = (unit, data) => {
        const t = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 256, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      };
      tex(0, noise);
      tex(1, ripple.data);
      gl.uniform1i(U.uNoise, 0);
      gl.uniform1i(U.uRipple, 1);
      gl.uniform1f(U.uRipK, ripple.k);
      return true;
    }

    try {
      glOK = initGL();
    } catch (e) {
      console.error(e);
      glOK = false;
    }
    if (!glOK) {
      const fb = document.createElement('div');
      fb.className = 'cz-fallback';
      root.insertBefore(fb, canvas);
      canvas.style.display = 'none';
    }
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); glOK = false; }, { signal });
    canvas.addEventListener('webglcontextrestored', () => {
      try { glOK = initGL(); sizeCanvas(); } catch (e) { console.error(e); glOK = false; }
    }, { signal });

    // ── sizing: render resolution adapts to hold the frame rate ──
    let W = ctx.w, H = ctx.h;
    const dpr = Math.min(2, ctx.dpr || 1);
    let scale = Math.min(1, Math.sqrt(0.95e6 / (W * H * dpr * dpr)));
    let scaleCap = 1;
    let focal = 1.8, hz = 0.08, shift = 0;

    function layout() {
      const aspect = W / H;
      const portrait = clamp01((1.25 - aspect) / 0.8);
      focal = 1.8 * (1 - 0.38 * portrait);
      hz = 0.08 + 0.04 * portrait;
      shift = 0.06 * portrait;
      const rw = Math.round(Math.max(W < 480 ? 76 : 88, Math.min(132, Math.min(W, H * 1.6) * 0.082)));
      // stay clear of the shell's mute + language buttons (bottom-right)
      const rx = Math.min(W * (aspect < 0.9 ? 0.71 : 0.795), W - 140 - rw / 2);
      const px = (rx - W / 2) / H;
      const ledgeTop = (0.055 + 0.012 * px - 0.0055) * H;
      radio.style.setProperty('--rw', rw + 'px');
      radio.style.left = Math.round(rx - rw / 2) + 'px';
      radio.style.bottom = Math.round(ledgeTop - rw * (2 / 120)) + 'px';
    }
    function sizeCanvas() {
      const cw = Math.max(2, Math.round(W * dpr * scale));
      const ch = Math.max(2, Math.round(H * dpr * scale));
      if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
      if (gl && glOK) gl.viewport(0, 0, cw, ch);
    }
    layout();
    sizeCanvas();

    // ── sound ──
    let sound = null;
    try { sound = new CoastSound(ctx); } catch (e) { console.error(e); }

    // ── state ──
    // dev aid: ?dev=coast&coastT=100 starts later in the sunset
    const qs = new URLSearchParams(location.search);
    let simT = qs.get('dev') === 'coast' ? Math.max(0, Number(qs.get('coastT')) || 0) : 0;
    let clockT = simT;
    let fade = 0;
    let touched = false, touchT = 0, awarded = false;
    let hornNext = 44, chimeDone = false;
    const cam = { x: 0, y: 0, yaw: 0, tx: 0, ty: 0, tyaw: 0 };
    let wp = false;
    let idleTimer = 0;

    // ── the radio ──
    let radioOn = false;
    let firstManual = true;
    let sayTimer = 0;
    let lcdOverride = null, lcdOverrideUntil = 0;
    function speak(line, ms = 3800) {
      sayCur = line;
      say.innerHTML = isEn() ? line.en : ctx.jp.html(line.ja);
      say.classList.add('on');
      clearTimeout(sayTimer);
      sayTimer = ctx.timeout(() => say.classList.remove('on'), ms);
    }
    function setRadio(on, manual) {
      radioOn = on;
      radio.classList.toggle('on', on);
      radio.setAttribute('aria-pressed', String(on));
      led.setAttribute('fill', on ? '#ff4a2a' : '#3a1410');
      knob.setAttribute('transform', on ? 'rotate(120 101 68)' : '');
      needle.setAttribute('x1', on ? '93' : '88');
      needle.setAttribute('x2', on ? '93' : '88');
      if (sound) sound.setRadio(on);
      if (on) {
        lcdOverride = 'FM76.4';
        lcdOverrideUntil = simT + 3.2;
        if (manual && firstManual) {
          firstManual = false;
          ctx.timeout(() => { if (radioOn) speak({ ja: '[高性能|こうせいのう|high-performance; high-spec]ですから。', en: 'High-performance, after all.' }); }, 1300);
        }
      }
      if (manual) ctx.store.set('radio', on);
    }
    const toggleRadio = () => setRadio(!radioOn, true);
    radio.addEventListener('click', (e) => { e.stopPropagation(); toggleRadio(); }, { signal });
    radio.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleRadio(); }
    }, { signal });
    if (ctx.store.get('radio', true) !== false) {
      ctx.timeout(() => { if (!radioOn) setRadio(true, false); }, 9500);
    }

    // ── wallpaper mode ──
    let wpLineTimer = 0;
    function setWallpaper(on) {
      wp = on;
      root.classList.toggle('wp', on);
      ctx.exitVisible(!on);
      clearTimeout(wpLineTimer);
      if (on) {
        root.classList.remove('idle');
        ctx.timeout(() => { if (wp) wpLine.classList.add('on'); }, 900);
        wpLineTimer = ctx.timeout(() => wpLine.classList.remove('on'), 7600);
      } else {
        wpLine.classList.remove('on');
        root.classList.remove('idle');
      }
    }
    wpBtn.addEventListener('click', (e) => { e.stopPropagation(); setWallpaper(true); }, { signal });
    let altArmed = false;
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Alt') { if (!e.repeat) altArmed = true; }
      else altArmed = false;
    }, { signal });
    window.addEventListener('keyup', (e) => {
      if (e.key === 'Alt' && altArmed) { altArmed = false; e.preventDefault(); setWallpaper(!wp); }
    }, { signal });
    window.addEventListener('blur', () => { altArmed = false; }, { signal });
    root.addEventListener('pointerdown', (e) => {
      if (wp && e.target !== wpBtn && !wpBtn.contains(e.target)) setWallpaper(false);
    }, { signal });

    // ── camera follows the pointer, a little ──
    root.addEventListener('pointermove', (e) => {
      const r = root.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / Math.max(1, r.width)) * 2 - 1;
      const ny = ((e.clientY - r.top) / Math.max(1, r.height)) * 2 - 1;
      const k = ctx.reduced ? 0.35 : 1;
      cam.tx = nx * 1.8 * k;
      cam.ty = -ny * 0.35 * k;
      cam.tyaw = nx * 0.016 * k;
      if (wp) { root.classList.remove('idle'); idleTimer = 0; }
    }, { signal });

    // ── hint, early and quiet ──
    ctx.timeout(() => hint.classList.add('on'), 3600);
    ctx.timeout(() => hint.classList.remove('on'), 15500);

    let frames = 0, acc = 0, hold = 0;
    let lcdLast = '';
    let litLast = -1;

    ctx.loop((now, dt) => {
      if (document.hidden) return;
      simT += dt;
      clockT += dt;
      fade = Math.min(1, fade + dt / 2.4);
      const tl = timeline(simT);

      // the moment: the sun's lower edge touches the sea
      if (!touched && tl.el - SUN_R <= 0) { touched = true; touchT = simT; }
      let orb = 0;
      if (touched) {
        const k = simT - touchT;
        orb = k < 3 ? k / 3 : k < 9 ? 1 + (k - 3) / 6 : Math.min(3, 2 + (k - 9) / 2.5);
        if (!awarded && k >= 7.4) {
          awarded = true;
          ctx.award(LABEL);
          ctx.timeout(() => speak({ ja: 'おつかれさま。', en: 'You did well today. Rest now.' }, 5200), 6500);
        }
      }

      // occasional far sounds
      if (sound) {
        sound.update(simT, tl.set, tl.dusk);
        if (simT > hornNext) {
          hornNext = simT + 130 + Math.random() * 60;
          const fx = -3300 + 6000 * Math.min(1, tl.ferry);
          sound.horn(Math.max(-0.8, Math.min(0.8, (1.8 * fx / 6800) / 0.8)));
        }
        if (!chimeDone && simT > 60) { chimeDone = true; sound.chime(); }
      }

      // camera easing
      const ke = 1 - Math.exp(-dt * 1.6);
      cam.x += (cam.tx - cam.x) * ke;
      cam.y += (cam.ty - cam.y) * ke;
      cam.yaw += (cam.tyaw - cam.yaw) * ke;

      if (wp) {
        idleTimer += dt;
        if (idleTimer > 2.5) root.classList.add('idle');
      }

      // radio display
      const mins = CLOCK0 + Math.floor((clockT * CLOCK_RATE) / 60);
      const clock = `${Math.floor(mins / 60) % 24}:${String(mins % 60).padStart(2, '0')}`;
      const txt = lcdOverride && simT < lcdOverrideUntil ? lcdOverride : clock;
      if (txt !== lcdLast) { lcd.textContent = txt; lcdLast = txt; }
      const lit = Math.round((1 - tl.dusk) * 20) / 20;
      if (lit !== litLast) {
        litLast = lit;
        radio.style.filter = `brightness(${(0.62 + 0.38 * lit).toFixed(3)}) saturate(${(0.8 + 0.2 * lit).toFixed(3)})`;
      }

      if (!glOK) return;

      // adaptive resolution
      acc += dt; frames++;
      hold -= dt;
      if (acc > 1.25) {
        const avg = acc / frames;
        if (avg > 1 / 47 && scale > 0.32) {
          scaleCap = Math.max(0.32, scale * 1.02);
          scale = Math.max(0.32, scale * 0.86);
          sizeCanvas();
          hold = 6;
        } else if (avg < 1 / 58 && hold <= 0 && scale < scaleCap && canvas.width * canvas.height < 3.2e6) {
          scale = Math.min(scaleCap, scale * 1.07);
          sizeCanvas();
          hold = 2;
        }
        acc = 0; frames = 0;
      }

      gl.uniform2f(U.uRes, canvas.width, canvas.height);
      gl.uniform1f(U.uTime, (now % 2400));
      gl.uniform1f(U.uSunEl, tl.el);
      gl.uniform1f(U.uSunAz, SUN_AZ);
      gl.uniform1f(U.uSet, tl.set);
      gl.uniform1f(U.uDusk, tl.dusk);
      gl.uniform1f(U.uLights, tl.lights);
      gl.uniform1f(U.uPearl, tl.pearl);
      gl.uniform1f(U.uStreet, tl.street);
      gl.uniform1f(U.uStar, tl.star);
      gl.uniform1f(U.uOrb, orb);
      gl.uniform1f(U.uFade, ease(fade));
      gl.uniform1f(U.uExpo, tl.expo);
      gl.uniform3f(U.uCam, cam.x, cam.y, 0);
      gl.uniform1f(U.uYaw, cam.yaw);
      gl.uniform1f(U.uFocal, focal);
      gl.uniform1f(U.uHz, hz);
      gl.uniform1f(U.uShift, shift);
      gl.uniform1f(U.uSeed, Math.random());
      gl.uniform1f(U.uFerry, tl.ferry);
      gl.uniform1f(U.uLedge, 1);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    });

    signal.addEventListener('abort', () => {
      ctx.exitVisible(true);
      if (sound) sound.destroy();
      const lose = gl && gl.getExtension && gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
    });

    return {
      resize(w, h) {
        W = w || ctx.w; H = h || ctx.h;
        layout();
        sizeCanvas();
      },
      destroy() {
        ctx.exitVisible(true);
      },
    };
  },
};
