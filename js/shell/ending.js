// Act III — 終点、銀河. The stars, the parade, the lights, the letter,
// the television switching off from the inside, a cut to black, and an ED roll.
import { mtof } from '../lib/audio.js';
import { jpHTML } from '../lib/jp.js';

const CSS = `
.en { position:absolute; inset:0; background:#04050c; overflow:hidden; color:#f3ecdc; cursor:default; }
.en canvas.sky { position:absolute; inset:0; width:100%; height:100%; }
.en .layer { position:absolute; inset:0; }
.en .say { position:absolute; left:50%; top:46%; transform:translate(-50%,-50%); text-align:center; width:min(92vw,820px); pointer-events:none; }
.en .say .jp { font-family:'Noto Serif JP',serif; font-weight:600; font-size:clamp(28px,4.6vw,56px); letter-spacing:.32em; padding-left:.32em; opacity:0; filter:blur(8px); transition:opacity 2.2s ease, filter 2.2s ease; text-shadow:0 0 30px rgba(160,190,255,.35); }
.en .say .ensub { margin-top:16px; font-family:'EB Garamond',serif; font-style:italic; font-size:clamp(16px,1.8vw,21px); color:rgba(243,236,220,.62); opacity:0; transition:opacity 2.2s ease 1s; }
.en .say.on .jp { opacity:1; filter:blur(0); }
.en .say.on .ensub { opacity:1; }
.en .lights { position:absolute; inset:0; pointer-events:none; }
.en .lt { position:absolute; width:0; height:0; }
.en .lt .o { position:absolute; width:46px; height:46px; margin:-23px 0 0 -23px; border-radius:50%;
  background: radial-gradient(circle at 45% 40%, #fff 0, #fffbe9 18%, rgba(255,236,190,.85) 34%, rgba(255,210,140,.3) 56%, transparent 70%);
  box-shadow: 0 0 40px 12px rgba(255,226,170,.25); mix-blend-mode:screen; }
.en .lt .o.dim { background: radial-gradient(circle, rgba(255,255,255,.12) 0 30%, transparent 60%); box-shadow:none; }
.en .lt .lb { position:absolute; left:30px; top:-9px; white-space:nowrap; font-family:'EB Garamond',serif; font-style:italic; font-size:15px; color:rgba(255,244,222,.82); text-shadow:0 0 10px #000; opacity:0; transition:opacity 1.5s; }
.en .lt .st { display:block; font-family:'Noto Serif JP',serif; font-style:normal; font-size:11px; letter-spacing:.3em; color:rgba(255,244,222,.5); }
.en .lt.show .lb { opacity:1; }
.en .big-light { position:absolute; left:50%; top:46%; width:10px; height:10px; margin:-5px; border-radius:50%; background:#fff; opacity:0;
  box-shadow: 0 0 80px 40px rgba(255,236,200,.55), 0 0 240px 120px rgba(255,210,150,.25), 0 0 520px 260px rgba(255,190,130,.12); transition: opacity 3s ease, transform 6s ease; }
.en .big-light.on { opacity:1; transform:scale(1.4); }
.en .cards { position:absolute; inset:0; display:grid; place-items:center; pointer-events:none; }
.en .card { position:absolute; inset:0; display:grid; place-items:center; font-family:'Shippori Mincho B1',serif; font-weight:800; }
.en .card span { font-size:clamp(64px,14vw,190px); letter-spacing:.05em; transform:scaleX(.86); }
.en .nvl { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; padding:7vh 6vw; cursor:pointer; }
.en .page { width:min(100%, 680px); font-family:'EB Garamond',serif; font-size:clamp(19px,2.05vw,25px); line-height:1.62; color:#f6efe0; text-shadow:0 0 18px rgba(0,0,0,.9); }
.en .page p { margin:0 0 1.05em; opacity:0; transform:translateY(8px); filter:blur(4px); transition: opacity 1.8s ease, transform 1.8s ease, filter 1.8s ease; }
.en .page p.on { opacity:1; transform:none; filter:none; }
.en .page .jp { font-family:'Noto Serif JP',serif; font-size:.92em; letter-spacing:.08em; }
.en .page .head { font-family:'Noto Serif JP',serif; font-weight:600; letter-spacing:.25em; font-size:1.05em; }
.en .page em { font-style:italic; color:#ffe7b8; }
.en .page .sig { text-align:right; font-style:italic; }
.en .page .quote { padding-left:1.1em; border-left:2px solid rgba(255,220,160,.5); font-family:'Noto Serif JP',serif; font-size:.95em; }
.en .page ul { list-style:none; margin:0; padding:0; }
.en .page li { display:flex; gap:.7em; align-items:baseline; }
.en .page li i.orb { flex:none; width:.55em; height:.55em; border-radius:50%; transform:translateY(-.05em); background:radial-gradient(circle at 40% 35%, #fff, #ffefc4 50%, rgba(255,210,140,.5) 70%, transparent 72%); box-shadow:0 0 8px 2px rgba(255,220,160,.6); }
.en .page li i.orb.none { background:none; border:1px solid rgba(255,255,255,.3); box-shadow:none; }
.en .page li small { font-family:'Noto Serif JP',serif; font-size:.6em; letter-spacing:.25em; color:rgba(246,239,224,.5); display:inline-block; min-width:6.5em; }
.en .wait { position:absolute; right:7vw; bottom:6vh; width:10px; height:10px; border-right:2px solid rgba(255,230,190,.7); border-bottom:2px solid rgba(255,230,190,.7); transform:rotate(45deg); opacity:0; animation: en-bob 1.4s ease-in-out infinite; }
.en .wait.on { opacity:1; }
@keyframes en-bob { 0%,100% { transform:translateY(0) rotate(45deg) } 50% { transform:translateY(5px) rotate(45deg) } }
.en .tvoff { position:absolute; inset:0; background:#fffaf0; transform-origin:50% 50%; }
.en .black { position:absolute; inset:0; background:#000; }
.en .quip { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); text-align:center; opacity:0; transition:opacity 1.6s ease; width:min(90vw,640px); }
.en .quip.on { opacity:1; }
.en .quip .jp { font-family:'Noto Serif JP',serif; font-size:clamp(16px,1.8vw,20px); letter-spacing:.3em; }
.en .quip .e2 { margin-top:10px; font-family:'EB Garamond',serif; font-style:italic; font-size:clamp(14px,1.5vw,17px); color:rgba(243,236,220,.55); }
.en .ed { position:absolute; inset:0; }
.en .ed canvas { position:absolute; inset:0; width:100%; height:100%; }
.en .roll-wrap { position:absolute; top:0; bottom:0; right:5vw; width:min(46vw, 420px); overflow:hidden;
  -webkit-mask: linear-gradient(transparent, #000 14%, #000 86%, transparent); mask: linear-gradient(transparent, #000 14%, #000 86%, transparent); }
.en .roll { position:absolute; left:0; right:0; top:100%; text-align:center; font-family:'Noto Serif JP',serif; color:#fff8ec; text-shadow:0 1px 8px rgba(40,10,0,.75), 0 0 2px rgba(0,0,0,.6); }
.en .roll .t { font-size:13px; letter-spacing:.35em; color:rgba(255,248,236,.72); margin-top:36px; }
.en .roll .n { font-size:clamp(16px,1.7vw,20px); letter-spacing:.14em; margin-top:7px; line-height:1.7; }
.en .roll .n.lat { font-family:'EB Garamond',serif; letter-spacing:.06em; }
.en .roll .title { font-size:clamp(22px,2.6vw,32px); letter-spacing:.4em; margin-top:8px; }
.en .roll .gap { height:90px; }
.en .roll .fin { font-size:clamp(26px,3vw,38px); letter-spacing:.6em; }
.en .skip { position:absolute; right:16px; bottom:16px; font-family:'EB Garamond',serif; font-style:italic; font-size:13px; color:rgba(243,236,220,.4); background:none; border:0; cursor:pointer; z-index:5; }
.en .skip:hover { color:rgba(243,236,220,.85); }
@media (max-width: 700px) {
  .en .roll-wrap { left:6vw; right:6vw; width:auto; }
  .en .lt .lb { font-size:12px; }
}
`;

export default {
  id: 'ending',
  mount(root, ctx) {
    const { audio } = ctx;
    const ac = audio.ac;
    root.classList.add('en');
    const style = document.createElement('style');
    style.textContent = CSS;
    root.appendChild(style);

    const sky = document.createElement('canvas');
    sky.className = 'sky';
    root.appendChild(sky);
    const sg = sky.getContext('2d');
    const layer = div('layer', root);

    const lights = ctx.lights || [];
    const found = lights.filter((l) => l.label);
    const kv = ctx.kv || {};

    // ── waiting helpers (never resolve after unmount) ──
    const wait = (ms) => new Promise((res) => ctx.timeout(res, ms));
    let advance = null;
    const nextClick = (autoMs) => new Promise((res) => {
      advance = res;
      if (autoMs) ctx.timeout(() => { if (advance === res) { advance = null; res(); } }, autoMs);
    });
    const go = () => { if (advance) { const a = advance; advance = null; a(); } };
    root.addEventListener('click', go, { signal: ctx.signal });
    addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') { e.preventDefault(); go(); } }, { signal: ctx.signal });

    // ── the sky ──
    const stars = [];
    let W = 0, H = 0;
    const sizeSky = () => {
      W = ctx.w; H = ctx.h;
      sky.width = Math.round(W * ctx.dpr);
      sky.height = Math.round(H * ctx.dpr);
      stars.length = 0;
      const n = Math.round((W * H) / 1400);
      for (let i = 0; i < n; i++) {
        // concentrate a milky band along a diagonal
        let x = Math.random() * W, y = Math.random() * H;
        if (Math.random() < 0.55) {
          const u = Math.random();
          x = u * W;
          y = H * 0.75 - u * H * 0.6 + gauss() * H * 0.08;
        }
        stars.push({ x, y, r: Math.random() < 0.97 ? Math.random() * 1.1 + 0.2 : Math.random() * 2 + 1, tw: Math.random() * 6.28, sp: 0.5 + Math.random() * 2, hue: Math.random() < 0.2 ? 30 : Math.random() < 0.3 ? 220 : 50 });
      }
    };
    sizeSky();
    let skyMode = 'stars';  // stars | none
    let railGlow = 1;
    let drift = 0;
    ctx.loop((t, dt) => {
      if (skyMode === 'none') return;
      drift += dt * 6;
      sg.setTransform(ctx.dpr, 0, 0, ctx.dpr, 0, 0);
      const bgk = sg.createLinearGradient(0, 0, 0, H);
      bgk.addColorStop(0, '#03040b');
      bgk.addColorStop(0.55, '#0a0d24');
      bgk.addColorStop(1, '#1a1433');
      sg.fillStyle = bgk;
      sg.fillRect(0, 0, W, H);
      // milky way haze
      sg.save();
      sg.translate(W / 2, H / 2);
      sg.rotate(-Math.atan2(H * 0.6, W));
      const mg = sg.createLinearGradient(0, -H * 0.18, 0, H * 0.18);
      mg.addColorStop(0, 'rgba(120,140,255,0)');
      mg.addColorStop(0.5, 'rgba(170,170,255,.10)');
      mg.addColorStop(1, 'rgba(120,140,255,0)');
      sg.fillStyle = mg;
      sg.fillRect(-W, -H * 0.18, W * 2, H * 0.36);
      sg.restore();
      for (const s of stars) {
        const a = 0.55 + 0.45 * Math.sin(t * s.sp + s.tw);
        const x = (s.x - drift * (0.2 + s.r * 0.1) + W * 4) % W;
        sg.fillStyle = `hsla(${s.hue},80%,${s.hue === 220 ? 85 : 92}%,${a})`;
        sg.beginPath();
        sg.arc(x, s.y, s.r, 0, 6.283);
        sg.fill();
      }
      // the rails of the Hikari Line, curving away into the stars
      if (railGlow > 0.01) {
        sg.save();
        sg.globalAlpha = railGlow;
        const vx = W * 0.62, vy = H * 0.42;
        for (const off of [-1, 1]) {
          sg.strokeStyle = 'rgba(255,214,150,.55)';
          sg.lineWidth = 1.4;
          sg.shadowColor = 'rgba(255,200,130,.9)';
          sg.shadowBlur = 10;
          sg.beginPath();
          sg.moveTo(W * 0.5 + off * W * 0.16, H + 10);
          sg.bezierCurveTo(W * 0.5 + off * W * 0.1, H * 0.7, vx + off * 6 - W * 0.1, vy + H * 0.12, vx + off * 1.5, vy);
          sg.stroke();
        }
        sg.shadowBlur = 0;
        for (let i = 0; i < 26; i++) {
          const k = ((i / 26) + (t * 0.08) % (1 / 26)) % 1;
          const e = Math.pow(1 - k, 2.2);
          const y = vy + (H + 10 - vy) * e;
          const xm = vx + (W * 0.5 - vx) * e;
          const hw = 2 + W * 0.17 * e;
          sg.strokeStyle = `rgba(255,214,150,${0.08 + 0.25 * e})`;
          sg.lineWidth = 1 + 3 * e;
          sg.beginPath();
          sg.moveTo(xm - hw, y);
          sg.lineTo(xm + hw, y);
          sg.stroke();
        }
        sg.restore();
      }
    });

    // ── the light-orbs constellation ──
    const lightsEl = div('lights', layer);

    // ── music ──
    const music = makeMusic(ctx);

    // ── sequence ──
    EN = !!ctx.en;
    ctx.onLang && ctx.onLang(() => { EN = !!ctx.en; });
    const at = new URLSearchParams(location.search).get('at');
    const run = async () => {
      if (at === 'ed') { skyMode = 'none'; await ed(layer, ctx, music, wait); return ctx.toRoom && ctx.toRoom(); }
      if (at === 'off') { await tvOff(layer, audio, ctx.out, wait); skyMode = 'none'; await wait(3000); await ed(layer, ctx, music, wait); return ctx.toRoom && ctx.toRoom(); }
      if (at === 'letter') { music.startPiano(); await letter(layer, ctx, lights, kv, nextClick, wait, () => ctx.jp.attach(layer)); return; }
      // 1. arrival
      ctx.timeout(() => announce(), 600);
      const say = sayBlock(layer, '終点、銀河です。', 'last stop: Ginga. everyone, please take your belongings — and your feelings — with you.');
      await wait(900);
      say.classList.add('on');
      bell(audio, ctx.out, ctx.send);
      await wait(6200);
      say.classList.remove('on');
      await wait(1800);
      say.remove();

      // 2. the parade
      const pr = sayBlock(layer, 'パレードが、来る。', 'here comes the parade.');
      pr.classList.add('on');
      await wait(3400);
      pr.classList.remove('on');
      await wait(1600);
      pr.remove();
      let paradeMod = null;
      try { paradeMod = ctx.parade ? await ctx.parade() : null; } catch (e) { paradeMod = null; }
      if (paradeMod) {
        railGlow = 0.35;
        const pRoot = div('layer', layer);
        const sub = childCtx(ctx, pRoot);
        await new Promise((res) => {
          sub.ctx.done = res;
          try { sub.handle = paradeMod.mount(pRoot, sub.ctx) || {}; } catch (e) { console.error(e); res(); }
          ctx.timeout(res, 110000);   // a parade must end somewhere
        });
        pRoot.style.transition = 'opacity 2s ease';
        pRoot.style.opacity = '0';
        await wait(2000);
        sub.dispose();
        pRoot.remove();
      }
      railGlow = 0.6;

      // 3. Monogatari-style cut cards
      await cards(layer, audio, ctx.out, EN ? [
        ['Last stop.', '#000', '#fff'],
        ['Ginga.', '#b0161b', '#fff'],
        [`${['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven'][found.length] || found.length} light${found.length === 1 ? '' : 's'}.`, '#000', '#fff'],
        ['Which means,', '#fff', '#000'],
        ['this is', '#000', '#e8c46a'],
        ['your story.', '#000', '#fff'],
      ] : [
        ['終点。', '#000', '#fff'],
        ['銀河。', '#b0161b', '#fff'],
        [`光、${toKanjiNum(found.length)}つ。`, '#000', '#fff'],
        ['つまり、', '#fff', '#000'],
        ['これは', '#000', '#e8c46a'],
        ['あなたの話。', '#000', '#fff'],
      ], wait);

      // 4. the lights gather (Clannad: gather enough and a wish is granted)
      music.startPiano();
      await gatherLights(lightsEl, lights, wait);
      const big = div('big-light', layer);
      await wait(100);
      big.classList.add('on');
      chord(audio, ctx.out, ctx.send);
      await wait(3600);

      // 5. the letter
      railGlow = 0.18;
      big.style.transition = 'opacity 4s ease, transform 8s ease';
      big.style.opacity = '0.12';
      await letter(layer, ctx, lights, kv, nextClick, wait, () => ctx.jp.attach(layer));

      // 6. the set switches off — from the inside
      music.stopPiano();
      big.remove();
      await tvOff(layer, audio, ctx.out, wait);
      skyMode = 'none';
      sg.setTransform(1, 0, 0, 1, 0, 0);
      sg.fillStyle = '#000';
      sg.fillRect(0, 0, sky.width, sky.height);

      // 7. cut to black. hold it. (you know the show.)
      await wait(6500);
      const q = div('quip', layer);
      q.innerHTML = EN
        ? `<div class="jp" style="font-family:'EB Garamond',serif;letter-spacing:.06em">…it didn't break.</div><div class="e2">you of all people know how a cut to black works.</div>`
        : `<div class="jp">……壊れてないよ。</div><div class="e2">it didn't break. you of all people know how a cut to black works.</div>`;
      q.classList.add('on');
      await wait(4200);
      q.classList.remove('on');
      await wait(1800);
      q.remove();

      // 8. ED
      ctx.finish && ctx.finish();
      await ed(layer, ctx, music, wait);
      ctx.toRoom && ctx.toRoom();
    };

    function announce() {
      if (ctx.muted || !('speechSynthesis' in window)) return;
      try {
        const u = new SpeechSynthesisUtterance('終点、銀河です。お忘れ物のないよう、ご注意ください。');
        u.lang = 'ja-JP';
        const v = speechSynthesis.getVoices().find((x) => /ja/i.test(x.lang));
        if (v) u.voice = v;
        u.rate = 0.92;
        u.volume = 0.7;
        speechSynthesis.speak(u);
      } catch (e) {}
    }

    run();

    return {
      resize() { sizeSky(); },
      destroy() {
        music.stopAll();
        if ('speechSynthesis' in window) speechSynthesis.cancel();
      },
    };
  },
};

// ───────────────────────── pieces ─────────────────────────
function div(cls, parent) {
  const d = document.createElement('div');
  d.className = cls;
  parent.appendChild(d);
  return d;
}
function gauss() { return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5; }
const toKanjiNum = (n) => '〇一二三四五六七八九'[n] || String(n);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let EN = false;
function sayBlock(parent, jp, en) {
  const d = div('say', parent);
  d.innerHTML = EN
    ? `<div class="jp" style="font-family:'EB Garamond',serif;letter-spacing:.08em">${en.charAt(0).toUpperCase() + en.slice(1)}</div>`
    : `<div class="jp">${jp}</div><div class="ensub">${en}</div>`;
  return d;
}

// A sub-context for a module mounted inside the ending (the parade).
function childCtx(ctx, root) {
  const abort = new AbortController();
  const timers = [];
  const loops = [];
  const sub = Object.create(ctx);
  Object.defineProperty(sub, 'w', { get: () => root.clientWidth || ctx.w });
  Object.defineProperty(sub, 'h', { get: () => root.clientHeight || ctx.h });
  sub.signal = abort.signal;
  sub.loop = (fn) => {
    let alive = true;
    const stop = ctx.loop((t, dt) => { if (alive && !abort.signal.aborted) fn(t, dt); });
    const s = () => { alive = false; stop(); };
    loops.push(s);
    return s;
  };
  sub.timeout = (fn, ms) => { const id = ctx.timeout(() => { if (!abort.signal.aborted) fn(); }, ms); timers.push(id); return id; };
  sub.interval = (fn, ms) => { const id = ctx.interval(() => { if (!abort.signal.aborted) fn(); }, ms); timers.push(id); return id; };
  sub.award = () => false;
  sub.exitVisible = () => {};
  const out = ctx.audio.ac.createGain();
  out.connect(ctx.out);
  sub.out = out;
  const res = { ctx: sub, handle: null, dispose() {
    abort.abort();
    loops.forEach((s) => s());
    timers.forEach((id) => { clearTimeout(id); clearInterval(id); });
    try { res.handle && res.handle.destroy && res.handle.destroy(); } catch (e) {}
    const t = ctx.audio.now();
    out.gain.setTargetAtTime(0, t, 0.3);
    setTimeout(() => { try { out.disconnect(); } catch (e) {} }, 2000);
  } };
  return res;
}

async function cards(parent, audio, dest, list, wait) {
  const wrap = div('cards', parent);
  for (const [text, bg, fg] of list) {
    const c = div('card', wrap);
    c.style.background = bg;
    c.style.color = fg;
    c.innerHTML = `<span>${text}</span>`;
    snap(audio, dest);
    await wait(520);
    c.remove();
  }
  wrap.remove();
}

async function gatherLights(el, lights, wait) {
  const W = el.clientWidth || innerWidth, H = el.clientHeight || innerHeight;
  const narrow = W < 700;
  const cx = W / 2, cy = H * 0.46;
  const rX = narrow ? W * 0.3 : Math.min(W * 0.32, 420), rY = narrow ? H * 0.3 : Math.min(H * 0.3, 260);
  const nodes = lights.map((l, i) => {
    const a = -Math.PI / 2 + (i / lights.length) * Math.PI * 2;
    const n = div('lt', el);
    const x = cx + Math.cos(a) * rX, y = cy + Math.sin(a) * rY;
    n.style.left = x + 'px';
    n.style.top = y + 'px';
    n.style.opacity = '0';
    n.style.transition = 'opacity 1.6s ease, left 3.2s cubic-bezier(.6,0,.3,1), top 3.2s cubic-bezier(.6,0,.3,1)';
    const side = Math.cos(a) < -0.2 ? 'left' : 'right';
    n.innerHTML = `<div class="o${l.label ? '' : ' dim'}"></div><div class="lb" style="${side === 'left' ? 'left:auto;right:30px;text-align:right' : ''}"><span class="st">${EN ? l.en : l.jp}</span>${l.label ? esc(l.label) : '<span style="opacity:.45">— still out there</span>'}</div>`;
    return n;
  });
  for (const n of nodes) {
    n.style.opacity = '1';
    n.classList.add('show');
    await wait(900);
  }
  await wait(3200);
  nodes.forEach((n) => n.classList.remove('show'));
  await wait(1200);
  nodes.forEach((n) => { n.style.left = cx + 'px'; n.style.top = cy + 'px'; });
  await wait(3200);
  nodes.forEach((n) => { n.style.opacity = '0'; });
  await wait(600);
  el.innerHTML = '';
}

async function letter(parent, ctx, lights, kv, nextClick, wait, attach) {
  const nvl = div('nvl', parent);
  const page = div('page', nvl);
  const cue = div('wait', nvl);
  attach();
  const found = lights.filter((l) => l.label);

  // their own words from the station notebook, if they left any
  let note = '';
  const ent = kv['station:entries'];
  if (Array.isArray(ent) && ent.length && ent[ent.length - 1] && ent[ent.length - 1].t) note = String(ent[ent.length - 1].t).trim();
  for (const [k, v] of Object.entries(kv)) {
    if (!note && k.startsWith('station:') && k !== 'station:draft' && typeof v === 'string' && /entry|note|ノート/i.test(k) && v.trim()) note = v.trim();
    if (!note && k.startsWith('station:') && v && typeof v === 'object' && typeof v.text === 'string') note = v.text.trim();
  }

  const P = (html, cls = '') => `<p class="${cls}">${html}</p>`;
  const pages = [
    [
      P(EN ? 'Dear Devansh,' : jpHTML('[拝啓|はいけい|formal letter opening, "respectfully"]、Devansh へ。'), 'head'),
      P('For a long time, over a lot of late nights, you explained yourself to machines.'),
      P('Never the headline version. The exact one. <em>Overcast</em>, not blue sky. <em>Air</em>, not <em>Summer Pockets</em>. The black 1906, not the cherry. A seventy-five millimetre tablet area. Kanji looked up one at a time, nineteen hours into <em>Clannad</em>, somewhere near the end of Misae’s route.'),
      P('Somebody was listening. This is what the listening made.'),
    ],
    [
      P('Everything you passed through tonight was built for one person. Every cicada is synthesized. Every record sleeve was drawn in code. The station notebook, the ranking board, the bonfire: nothing here is borrowed, except the shape of your life.'),
      P('You keep closing the distance between the worlds you love and the one you live in. You learn the language instead of waiting for the subtitles. You fix the old television instead of replacing it. You chase a 1985 broadcast across an ocean because a blurry copy is better than nothing at all.'),
      P('That is what love looks like when it does something. You don’t just admire a world. You go there.'),
    ],
    [
      P('You can love an empty platform at dusk and OsamaSon in the same hour. A drowned town and a rage beat. Lordran and Gintama. People will call that a contradiction. It isn’t. It’s a whole person, and it’s rarer than you think.'),
      P('The stories that held you up through the hard years of school weren’t an escape. They were practice. Every character you respected got somewhere by trying, and you have been trying too, quietly: in a second language, in a skill you rebuild one map at a time, in an old television you refused to give up on.'),
    ],
  ];
  if (note) {
    pages.push([
      P(EN ? 'At Natsugahara, you wrote this in the station notebook:' : jpHTML('[夏ヶ原|なつがはら|Natsugahara]で、あなたはノートにこう書いた。')),
      P(esc(note), 'quote'),
      P('It’s in there now, with everyone else’s. Strangers years from now will read it and wonder about you, the way you wondered about them.'),
    ]);
  }
  pages.push([
    P(EN ? 'The lights you found tonight.' : jpHTML('[今夜|こんや|tonight]、あなたが[見|み|to see]つけた[光|ひかり|light]。'), 'head'),
    `<p><ul>${lights.map((l) => `<li><i class="orb${l.label ? '' : ' none'}"></i><span><small>${EN ? l.en : l.jp}</small> ${l.label ? esc(l.label) : '<span style="opacity:.45">still out there, waiting</span>'}</span></li>`).join('')}</ul></p>`,
    P(found.length >= lights.length
      ? 'All of them. Of course you found all of them.'
      : 'The ones you didn’t find are still there. The line keeps running. They’ll wait.'),
  ]);
  pages.push([
    P('In <em>Clannad</em>, if you gather enough of these lights, a wish is granted.'),
    P('So here is the one I’d make for you. That you never have to shrink any of this to fit into a room. That you keep loving things with your whole chest. That your Japanese gets good enough to argue about Monogatari with a stranger in a record shop. That you go to Japan and come home with far too many records.'),
    P('And that on the hard days, you remember you were never only watching from this side of the glass.'),
  ]);
  pages.push([
    P('You once said you liked the idea of making machines and giving them life.'),
    P('Tonight, one of them tried to return the favour.'),
    P(EN ? 'With love,' : jpHTML('[敬具|けいぐ|formal letter closing, "sincerely"]'), 'sig'),
    P('— HIKARI CT-1486<br><span style="opacity:.7">and the machine on the other side of it, listening</span>', 'sig'),
  ]);

  for (let i = 0; i < pages.length; i++) {
    page.innerHTML = pages[i].join('');
    const ps = [...page.querySelectorAll('p')];
    cue.classList.remove('on');
    for (const p of ps) {
      p.classList.add('on');
      const words = p.textContent.split(/\s+/).length;
      await nextClick(Math.min(5200, 900 + words * 150));
    }
    cue.classList.add('on');
    await nextClick(26000);
    cue.classList.remove('on');
    ps.forEach((p) => p.classList.remove('on'));
    await wait(1700);
  }
  nvl.remove();
}

async function tvOff(parent, audio, dest, wait) {
  const off = div('tvoff', parent);
  off.style.opacity = '0';
  off.style.transition = 'opacity .5s ease';
  await wait(30);
  off.style.opacity = '1';
  await wait(520);
  // collapse to a line, then a dot, then nothing
  zapDown(audio, dest);
  off.animate([
    { transform: 'scale(1,1)', filter: 'brightness(1)' },
    { transform: 'scale(1,.004)', filter: 'brightness(1.4)', offset: 0.45 },
    { transform: 'scale(.004,.004)', filter: 'brightness(2)', offset: 0.8 },
    { transform: 'scale(0,0)', filter: 'brightness(1)' },
  ], { duration: 1100, easing: 'cubic-bezier(.7,0,.3,1)', fill: 'forwards' });
  const black = div('black', parent);
  parent.insertBefore(black, off);
  await wait(1300);
  off.remove();
}

async function ed(parent, ctx, music, wait) {
  const wrap = div('ed', parent);
  wrap.style.opacity = '0';
  wrap.style.transition = 'opacity 3s ease';
  const cv = document.createElement('canvas');
  wrap.appendChild(cv);
  const g = cv.getContext('2d');
  const rw = div('roll-wrap', wrap);
  const roll = div('roll', rw);
  const skip = document.createElement('button');
  skip.className = 'skip';
  skip.textContent = 'skip ›';
  wrap.appendChild(skip);
  const C = (t, n, cls = '') => `<div class="t">${t}</div>${(Array.isArray(n) ? n : [n]).map((x) => `<div class="n ${cls}">${x}</div>`).join('')}`;
  roll.innerHTML = EN ? [
    `<div class="t">ENDING THEME</div><div class="title">"Hikari Line"</div>`,
    C('Music & arrangement', 'Web Audio API', 'lat'),
    C('Lyrics', '(there are none — you write them)', 'lat'),
    '<div class="gap"></div>',
    C('Original story', "Devansh's life", 'lat'),
    C('Created by & starring', 'Devansh', 'lat'),
    C('Written & directed by', 'the machine on the other side of the screen', 'lat'),
    C('Art', ['canvas 2D', 'WebGL'], 'lat'),
    C('Photography', 'HIKARI CT-1486', 'lat'),
    C('Recorded on', 'your DT 770 PRO', 'lat'),
    C('Sound effects', ['evening cicadas', 'bell crickets', 'a railway crossing', 'the rain of 1985'], 'lat'),
    C('Locations', ['Natsugahara', 'Ginza 1985', 'Mizuirogaoka', 'Marumachi', 'Chika', 'Kuiki', 'Tasogaregahama', 'Ginga'], 'lat'),
    '<div class="gap"></div>',
    C('The songs that made this night', ['Yukiko Okada', 'Taeko Ohnuki', 'Akina Nakamori', 'Seiko Matsuda', 'Anri', 'Yu Hayami', 'Momoko Kikuchi', 'Yuki Saito', 'Yoko Oginome'], 'lat'),
    C('', ['OsamaSon', 'Nine Vicious', 'Che', 'Nettspend', 'xaviersobased', 'Glokk40Spaz', 'Lucy Bedroque', 'Kuru', 'XXXTentacion'], 'lat'),
    C('', ['IVE', 'LE SSERAFIM', 'TWICE', 'NewJeans', 'aespa', 'Reol', 'CY8ER', 'SHE IS SUMMER'], 'lat'),
    C('The stories that made this night', ['Legend of the Galactic Heroes', 'Gintama', 'Berserk', 'Monogatari', 'Oyasumi Punpun', 'Ashita no Joe', 'Steins;Gate', 'Neon Genesis Evangelion', 'CLANNAD', 'Mushoku Tensei', 'March Comes in Like a Lion', 'Holyland', 'AIR', 'Paprika', '20th Century Boys', 'ATRI'], 'lat'),
    C('The worlds that made this night', ['NieR', 'DARK SOULS', 'SEKIRO', 'ELDEN RING', 'Persona 4 Golden', 'Grand Theft Auto: San Andreas', 'osu!', 'Beetle Ju'], 'lat'),
    C('The light that made this night', ['Stalker (1979)', 'Wong Kar-wai', 'The Sopranos'], 'lat'),
    '<div class="gap"></div>',
    C('Special thanks', ['every traveller who wrote in the Natsugahara notebook', 'your 30 records (still collecting)', 'the RF modulator'], 'lat'),
    '<div class="gap"></div>',
    C('Produced by', 'the Hikari Line Production Committee', 'lat'),
    '<div class="gap"></div><div class="gap"></div>',
    '<div class="fin">to be continued</div><div class="n lat" style="opacity:.7;margin-top:10px;font-style:italic">— by you</div>',
  ].join('') : [
    `<div class="t">エンディングテーマ</div><div class="title">「ひかり線」</div>`,
    C('作曲・編曲', 'Web Audio API', 'lat'),
    C('作詞', '（歌詞はありません。あなたが書いてください）'),
    '<div class="gap"></div>',
    C('原作', 'Devansh の人生'),
    C('企画・主演', 'Devansh'),
    C('脚本・演出', '画面の向こうの機械'),
    C('美術', ['canvas 2D', 'WebGL'], 'lat'),
    C('撮影', 'HIKARI CT-1486'),
    C('録音', 'あなたの DT 770 PRO'),
    C('音響効果', ['ひぐらし', '鈴虫', '踏切', '一九八五年の雨']),
    C('ロケ地', ['夏ヶ原', '銀座 一九八五', '水色ヶ丘', '円町', '地下', '区域', '黄昏ヶ浜', '銀河']),
    '<div class="gap"></div>',
    C('この夜をつくった歌', ['岡田有希子', '大貫妙子', '中森明菜', '松田聖子', '杏里', '早見優', '菊池桃子', '斉藤由貴', '荻野目洋子']),
    C('', ['OsamaSon', 'Nine Vicious', 'Che', 'Nettspend', 'xaviersobased', 'Glokk40Spaz', 'Lucy Bedroque', 'Kuru', 'XXXTentacion'], 'lat'),
    C('', ['IVE', 'LE SSERAFIM', 'TWICE', 'NewJeans', 'aespa', 'Reol', 'CY8ER', 'SHE IS SUMMER'], 'lat'),
    C('この夜をつくった物語', ['銀河英雄伝説', '銀魂', 'ベルセルク', '〈物語〉シリーズ', 'おやすみプンプン', 'あしたのジョー', 'STEINS;GATE', '新世紀エヴァンゲリオン', 'CLANNAD', '無職転生', '3月のライオン', 'ホーリーランド', 'AIR', 'パプリカ', '20世紀少年', 'ATRI']),
    C('この夜をつくった世界', ['NieR', 'DARK SOULS', 'SEKIRO', 'ELDEN RING', 'ペルソナ4 ザ・ゴールデン', 'Grand Theft Auto: San Andreas', 'osu!', 'Beetle Ju'], 'lat'),
    C('この夜をつくった光', ['Stalker (1979)', 'Wong Kar-wai', 'The Sopranos'], 'lat'),
    '<div class="gap"></div>',
    C('特別協力', ['夏ヶ原駅ノートに書いてくれた、すべての旅人', 'あなたの 30 枚のレコード（まだ集め中）', 'RF モジュレーター']),
    '<div class="gap"></div>',
    C('製作', 'ひかり線 製作委員会'),
    '<div class="gap"></div><div class="gap"></div>',
    '<div class="fin">つづく</div><div class="n lat" style="opacity:.7;margin-top:10px;font-style:italic">to be continued — by you</div>',
  ].join('');

  let W = 0, H = 0;
  const size = () => { W = ctx.w; H = ctx.h; cv.width = Math.round(W * ctx.dpr); cv.height = Math.round(H * ctx.dpr); };
  size();
  const dur = 78;
  const t0 = performance.now();
  let done = false;
  let resolveDone;
  const finished = new Promise((r) => { resolveDone = r; });
  skip.addEventListener('click', (e) => { e.stopPropagation(); done = true; resolveDone(); }, { signal: ctx.signal });
  const stop = ctx.loop(() => {
    const k = Math.min(1, (performance.now() - t0) / 1000 / dur);
    drawEDScene(g, W, H, ctx.dpr, k, performance.now() / 1000);
    const rh = roll.offsetHeight + rw.clientHeight;
    roll.style.transform = `translateY(${-k * rh}px)`;
    if (k >= 1 && !done) { done = true; resolveDone(); }
  });
  music.startED(dur);
  await wait(60);
  wrap.style.opacity = '1';
  await finished;
  music.stopED();
  wrap.style.transition = 'opacity 3s ease';
  wrap.style.opacity = '0';
  await wait(3200);
  stop();
}

// A long bridge over the sea at golden hour, and the one-car train crossing it.
function drawEDScene(g, W, H, dpr, k, t) {
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const hz = H * 0.62;
  const sk = g.createLinearGradient(0, 0, 0, hz);
  const e = k;
  sk.addColorStop(0, mixc('#2a2b5a', '#141436', e));
  sk.addColorStop(0.45, mixc('#c86a6e', '#7a3f6a', e));
  sk.addColorStop(0.8, mixc('#ffb070', '#ff8a5a', e));
  sk.addColorStop(1, mixc('#ffd7a0', '#ffb47a', e));
  g.fillStyle = sk;
  g.fillRect(0, 0, W, hz + 1);
  // sun sinking
  const sx = W * 0.3, sy = hz - H * 0.08 + e * H * 0.1, sr = Math.min(W, H) * 0.06;
  const sg = g.createRadialGradient(sx, sy, 0, sx, sy, sr * 6);
  sg.addColorStop(0, 'rgba(255,240,200,.95)');
  sg.addColorStop(0.15, 'rgba(255,200,140,.55)');
  sg.addColorStop(1, 'rgba(255,160,120,0)');
  g.fillStyle = sg;
  g.fillRect(0, 0, W, hz);
  g.fillStyle = 'rgba(255,246,220,.95)';
  g.save();
  g.beginPath();
  g.rect(0, 0, W, hz);
  g.clip();
  g.beginPath();
  g.arc(sx, sy, sr, 0, 6.283);
  g.fill();
  g.restore();
  // long thin clouds
  for (let i = 0; i < 7; i++) {
    const cy = H * (0.12 + i * 0.065);
    const cx = ((i * 211 + t * (4 + i)) % (W + 600)) - 300;
    g.fillStyle = `rgba(255,${190 - i * 8},${150 - i * 6},${0.18 + (i % 3) * 0.05})`;
    g.beginPath();
    g.ellipse(cx, cy, 240 + i * 30, 5 + (i % 3) * 3, 0, 0, 6.283);
    g.fill();
  }
  // the sea
  const se = g.createLinearGradient(0, hz, 0, H);
  se.addColorStop(0, mixc('#e79a76', '#b0607a', e));
  se.addColorStop(1, mixc('#3c2a4c', '#1b1630', e));
  g.fillStyle = se;
  g.fillRect(0, hz, W, H - hz);
  for (let i = 0; i < 90; i++) {
    const y = hz + Math.pow(i / 90, 1.8) * (H - hz);
    const wdt = (8 + i * 1.4) * (0.6 + 0.4 * Math.sin(t * 0.8 + i));
    g.fillStyle = `rgba(255,226,170,${0.5 * (1 - i / 90)})`;
    g.fillRect(sx - wdt / 2 + Math.sin(t + i * 1.3) * (4 + i * 0.4), y, wdt, 1.4);
  }
  // the bridge: many low spans
  const by = hz - H * 0.035;
  g.fillStyle = 'rgba(40,24,40,.92)';
  g.fillRect(0, by, W, H * 0.012);
  for (let x = -20; x < W + 40; x += Math.max(36, W / 26)) {
    g.fillRect(x, by, Math.max(3, W * 0.003), hz - by + H * 0.01);
    // reflection
    g.fillStyle = 'rgba(40,24,40,.25)';
    g.fillRect(x, hz + 2, Math.max(3, W * 0.003), H * 0.03);
    g.fillStyle = 'rgba(40,24,40,.92)';
  }
  // lamps coming on as the light goes
  for (let i = 0, x = 20; x < W; i++, x += Math.max(72, W / 14)) {
    const on = e > 0.25 + (i % 7) * 0.06;
    if (!on) continue;
    g.fillStyle = 'rgba(255,220,150,.95)';
    g.beginPath(); g.arc(x, by - 6, 1.6, 0, 6.283); g.fill();
    const lg = g.createRadialGradient(x, by - 6, 0, x, by - 6, 14);
    lg.addColorStop(0, 'rgba(255,210,140,.5)');
    lg.addColorStop(1, 'rgba(255,210,140,0)');
    g.fillStyle = lg;
    g.fillRect(x - 14, by - 20, 28, 28);
  }
  // the train
  const tw = Math.max(70, W * 0.075), th = tw * 0.22;
  const tx = -tw + (W + tw * 2) * k;
  g.fillStyle = 'rgba(30,18,30,.96)';
  roundRect(g, tx, by - th, tw, th, th * 0.25);
  g.fill();
  for (let i = 0; i < 7; i++) {
    g.fillStyle = 'rgba(255,224,160,.92)';
    g.fillRect(tx + tw * 0.08 + i * tw * 0.12, by - th * 0.78, tw * 0.08, th * 0.32);
  }
  g.fillStyle = 'rgba(255,240,200,.9)';
  g.beginPath(); g.arc(tx + tw - 2, by - th * 0.35, 1.8, 0, 6.283); g.fill();
  // grain
  g.fillStyle = 'rgba(255,255,255,.025)';
  for (let i = 0; i < 160; i++) g.fillRect(Math.random() * W, Math.random() * H, 1, 1);
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
function mixc(a, b, k) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * k)).join(',')})`;
}

// ───────────────────────── sound ─────────────────────────
function bell(audio, dest, send) {
  const ac = audio.ac;
  const t = audio.now();
  [0, 0.7].forEach((dt, i) => {
    const f = i ? 659.25 : 830.6;
    [1, 2.4, 3.9, 5.3].forEach((r, k) => {
      const o = ac.createOscillator();
      o.frequency.value = f * r;
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t + dt);
      g.gain.linearRampToValueAtTime([0.12, 0.05, 0.025, 0.012][k], t + dt + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dt + [4, 2.5, 1.4, 0.8][k]);
      o.connect(g);
      g.connect(dest);
      g.connect(send);
      o.start(t + dt);
      o.stop(t + dt + 4.2);
    });
  });
}

function snap(audio, dest) {
  const ac = audio.ac;
  const t = audio.now();
  const src = ac.createBufferSource();
  src.buffer = audio.noise('white');
  const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2500;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.28, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  src.connect(hp).connect(g).connect(dest);
  src.start(t, Math.random());
  src.stop(t + 0.07);
  const o = ac.createOscillator();
  o.type = 'square';
  o.frequency.setValueAtTime(110, t);
  const og = ac.createGain();
  og.gain.setValueAtTime(0.08, t);
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 400;
  o.connect(lp).connect(og).connect(dest);
  o.start(t);
  o.stop(t + 0.1);
}

function chord(audio, dest, send) {
  const ac = audio.ac;
  const t = audio.now();
  [53, 60, 64, 67, 72, 76, 79].forEach((m, i) => {
    const o = ac.createOscillator();
    o.type = i < 2 ? 'triangle' : 'sine';
    o.frequency.value = mtof(m);
    o.detune.value = (Math.random() - 0.5) * 8;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t + i * 0.06);
    g.gain.linearRampToValueAtTime(0.045, t + 1.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 7);
    o.connect(g);
    g.connect(dest);
    g.connect(send);
    o.start(t + i * 0.06);
    o.stop(t + 7.2);
  });
}

function zapDown(audio, dest) {
  const ac = audio.ac;
  const t = audio.now();
  const o = ac.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(1600, t);
  o.frequency.exponentialRampToValueAtTime(40, t + 0.9);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.1, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1);
  o.connect(g).connect(dest);
  o.start(t);
  o.stop(t + 1.05);
}

// Piano for the letter; a small city-pop ballad for the ED. Both original.
function makeMusic(ctx) {
  const { audio } = ctx;
  const ac = audio.ac;
  const bus = ac.createGain();
  bus.gain.value = 0.9;
  bus.connect(ctx.out);
  const wet = ac.createGain();
  wet.gain.value = 0.6;
  bus.connect(wet).connect(ctx.send);

  const piano = (m, t, vel = 0.5, len = 3.5, dest = bus) => {
    const f = mtof(m);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.11 * vel, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.03 * vel, t + 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1800 + vel * 3000, t);
    lp.frequency.exponentialRampToValueAtTime(600, t + len);
    [[1, 1, 'triangle'], [2, 0.35, 'sine'], [3, 0.12, 'sine'], [1.002, 0.5, 'sine']].forEach(([r, a, type]) => {
      const o = ac.createOscillator();
      o.type = type;
      o.frequency.value = f * r;
      const og = ac.createGain();
      og.gain.value = a;
      o.connect(og).connect(lp);
      o.start(t);
      o.stop(t + len + 0.1);
    });
    lp.connect(g).connect(dest);
  };

  // letter: slow, wide, descending, with a borrowed minor iv that hurts a little
  const prog = [
    [53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [55, 59, 62, 65],
    [48, 52, 55, 59], [45, 48, 52, 55], [50, 53, 57, 60], [53, 56, 60, 62],
  ];
  const mel = [76, null, 74, 72, 71, null, 72, 74, 72, null, 69, 67, 67, null, 65, 64];
  let pianoTimer = 0, pianoOn = false, bar = 0, nextT = 0;
  const startPiano = () => {
    if (pianoOn) return;
    pianoOn = true;
    bar = 0;
    nextT = audio.now() + 0.2;
    const beat = 60 / 64;
    const sched = () => {
      if (!pianoOn) return;
      while (nextT < audio.now() + 1.2) {
        const c = prog[bar % prog.length];
        piano(c[0] - 12, nextT, 0.55, 5);
        [1, 2, 3, 2].forEach((ix, k) => piano(c[ix] + (k === 2 ? 12 : 0), nextT + beat * (k + 1) * 0.5 + (Math.random() - 0.5) * 0.02, 0.32 + Math.random() * 0.1, 3.8));
        if (bar >= 4) {
          const m1 = mel[(bar * 2) % mel.length], m2 = mel[(bar * 2 + 1) % mel.length];
          if (m1) piano(m1, nextT + beat * 0.02, 0.45, 4);
          if (m2) piano(m2, nextT + beat * 2, 0.4, 4);
        }
        nextT += beat * 4;
        bar++;
      }
      pianoTimer = setTimeout(sched, 250);
    };
    sched();
  };
  const stopPiano = () => {
    pianoOn = false;
    clearTimeout(pianoTimer);
  };

  // ED: a little city-pop ballad
  let edOn = false, edTimer = 0;
  const edBus = ac.createGain();
  edBus.connect(bus);
  const startED = (dur) => {
    edOn = true;
    edBus.gain.cancelScheduledValues(audio.now());
    edBus.gain.setValueAtTime(0, audio.now());
    edBus.gain.linearRampToValueAtTime(1, audio.now() + 2);
    const bpm = 84, beat = 60 / bpm;
    const chords = [
      [43, [59, 62, 66, 69]], [42, [57, 61, 64, 69]], [40, [55, 59, 62, 66]], [45, [55, 59, 62, 64]],
      [38, [57, 61, 64, 66]], [47, [57, 59, 62, 66]], [40, [55, 59, 62, 67]], [45, [55, 57, 61, 64]],
    ];
    const melody = [
      [74, 1.5], [76, 0.5], [78, 1], [76, 1], [74, 2], [71, 2],
      [73, 1.5], [74, 0.5], [76, 2], [69, 4],
      [71, 1], [74, 1], [79, 1.5], [78, 0.5], [76, 2], [74, 2],
      [76, 1.5], [74, 0.5], [73, 2], [69, 1], [71, 1], [73, 2],
    ];
    let t = audio.now() + 0.3;
    let b = 0, mi = 0, mt = t + beat * 16;
    const end = t + dur;
    const sched = () => {
      if (!edOn) return;
      while (t < audio.now() + 1.5 && t < end) {
        const [root, ch] = chords[b % chords.length];
        // bass
        bassNote(root, t, beat * 1.5);
        bassNote(root, t + beat * 2, beat * 0.9);
        bassNote(root + 7, t + beat * 3, beat * 0.9);
        // e-piano comp
        [0, 1.5, 2.5].forEach((p, k) => ch.forEach((m) => epiano(m, t + p * beat, k ? 0.25 : 0.35)));
        // drums
        for (let i = 0; i < 4; i++) {
          kick(t + i * beat * (i % 2 ? 1 : 1), i % 2 === 0 ? 0.5 : 0);
          if (i % 2) rim(t + i * beat);
          hat(t + i * beat, 0.05);
          hat(t + (i + 0.5) * beat, 0.03);
        }
        t += beat * 4;
        b++;
      }
      while (mt < audio.now() + 1.5 && mt < end - 2) {
        const [m, len] = melody[mi % melody.length];
        lead(m, mt, len * beat);
        mt += len * beat;
        mi++;
      }
      edTimer = setTimeout(sched, 200);
    };
    sched();
  };
  const stopED = () => {
    edOn = false;
    clearTimeout(edTimer);
    edBus.gain.setTargetAtTime(0, audio.now(), 0.8);
  };
  const bassNote = (m, t, len) => {
    const o = ac.createOscillator();
    o.type = 'triangle';
    o.frequency.value = mtof(m);
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.22, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(lp).connect(g).connect(edBus);
    o.start(t);
    o.stop(t + len + 0.05);
  };
  const epiano = (m, t, vel) => {
    const f = mtof(m);
    const car = ac.createOscillator();
    car.frequency.value = f;
    const mod = ac.createOscillator();
    mod.frequency.value = f * 14;
    const mg = ac.createGain();
    mg.gain.setValueAtTime(f * 1.2, t);
    mg.gain.exponentialRampToValueAtTime(f * 0.05, t + 0.25);
    mod.connect(mg).connect(car.frequency);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.04 * vel, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    const pan = ac.createStereoPanner();
    pan.pan.value = (m % 7) / 7 - 0.4;
    car.connect(g).connect(pan).connect(edBus);
    car.start(t); mod.start(t);
    car.stop(t + 1.7); mod.stop(t + 1.7);
  };
  const kick = (t, v) => {
    if (!v) return;
    const o = ac.createOscillator();
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.4 * v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g).connect(edBus);
    o.start(t);
    o.stop(t + 0.32);
  };
  const rim = (t) => {
    const src = ac.createBufferSource();
    src.buffer = audio.noise('white');
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = 1.4;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.16, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    src.connect(bp).connect(g).connect(edBus);
    g.connect(ctx.send);
    src.start(t, Math.random());
    src.stop(t + 0.2);
  };
  const hat = (t, v) => {
    const src = ac.createBufferSource();
    src.buffer = audio.noise('white');
    const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 8000;
    const g = ac.createGain();
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    src.connect(hp).connect(g).connect(edBus);
    src.start(t, Math.random());
    src.stop(t + 0.06);
  };
  const lead = (m, t, len) => {
    const o = ac.createOscillator();
    o.type = 'triangle';
    o.frequency.value = mtof(m);
    const vib = ac.createOscillator();
    vib.frequency.value = 5.2;
    const vg = ac.createGain();
    vg.gain.setValueAtTime(0, t);
    vg.gain.linearRampToValueAtTime(mtof(m) * 0.006, t + Math.min(0.6, len));
    vib.connect(vg).connect(o.frequency);
    const o2 = ac.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = mtof(m) * 2;
    const g2 = ac.createGain();
    g2.gain.value = 0.25;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.09, t + 0.04);
    g.gain.setTargetAtTime(0.06, t + 0.1, 0.3);
    g.gain.setTargetAtTime(0.0001, t + len * 0.92, 0.08);
    o.connect(g);
    o2.connect(g2).connect(g);
    g.connect(edBus);
    g.connect(ctx.send);
    [o, o2, vib].forEach((x) => { x.start(t); x.stop(t + len + 0.4); });
  };

  return {
    startPiano, stopPiano, startED, stopED,
    stopAll() { stopPiano(); edOn = false; clearTimeout(edTimer); },
  };
}
