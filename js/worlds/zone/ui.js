// Interface for the Zone. Two dialects, kept apart on purpose:
//  · a beige system layer (logs ■, area labels, ARCHIVES) in the manner of a certain android's UI,
//  · orange soapstone / bonfire text in the manner of a certain cursed kingdom.
import * as TX from './text.js';

const CSS = `
.zn{position:absolute;inset:0;overflow:hidden;background:#000;color:#e6e1d3;-webkit-user-select:none;user-select:none;touch-action:none}
.zn .zn-gl{position:absolute;inset:0;width:100%;height:100%;display:block;cursor:crosshair}
.zn .zn-gl.zn-hov{cursor:pointer}
.zn .zn-gl.zn-wait{cursor:default}
.zn .zn-hud{position:absolute;inset:0;pointer-events:none;font-family:"Zen Kaku Gothic New",system-ui,sans-serif}
.zn .zn-hud > *{pointer-events:none}
.zn .zn-on{pointer-events:auto!important}
.zn .zn-hud .zn-area,.zn .zn-hud .zn-log div.on,.zn .zn-hud .zn-line.on,.zn .zn-hud .zn-hint.on{pointer-events:auto}

/* ── system layer (beige) ── */
.zn .zn-area{position:absolute;left:clamp(16px,3vw,40px);top:clamp(16px,3.2vh,34px);display:flex;align-items:baseline;gap:.7em;
  color:#3f3c34;background:rgba(205,200,176,.86);padding:6px 14px 5px 10px;font-size:clamp(13px,1.05vw,15px);letter-spacing:.08em;opacity:0;transition:opacity 1.6s}
.zn .zn-area.on{opacity:.92}
.zn .zn-area .sq{font-size:.8em;transform:translateY(-.1em)}
.zn .zn-area .no{font-family:"IBM Plex Mono",monospace;font-size:.85em;opacity:.75}
.zn .zn-area .nm{font-size:1.15em;letter-spacing:.14em}
.zn .zn-area .en{font-family:"IBM Plex Mono",monospace;font-size:.78em;opacity:.6;letter-spacing:.12em;text-transform:uppercase}
.zn .zn-area::after{content:"";position:absolute;left:0;right:-40px;bottom:-5px;height:1px;background:linear-gradient(90deg,rgba(205,200,176,.8),rgba(205,200,176,0))}
.zn .zn-ab{position:absolute;left:clamp(16px,3vw,40px);top:calc(clamp(16px,3.2vh,34px) + 3.4em);font-family:"IBM Plex Mono",monospace;font-size:12px;letter-spacing:.16em;
  color:#3f3c34;background:rgba(205,200,176,.86);padding:5px 10px 4px;border:0;cursor:pointer;opacity:0;transition:opacity 1s,background .2s}
.zn .zn-ab.on{opacity:1}
.zn .zn-ab:hover{background:rgba(226,221,198,.95)}
.zn .zn-ab b{font-weight:500;margin-left:.6em}
.zn .zn-log{position:absolute;left:clamp(16px,3vw,40px);top:42%;display:flex;flex-direction:column;gap:6px;max-width:min(420px,80vw)}
.zn .zn-log div{font-size:13px;letter-spacing:.06em;color:#3f3c34;background:rgba(205,200,176,.84);padding:5px 12px 5px 9px;
  transform:translateX(-12px);opacity:0;transition:opacity .5s,transform .5s;width:max-content;max-width:100%}
.zn .zn-log div.on{opacity:1;transform:none}
.zn .zn-log div small{font-family:"IBM Plex Mono",monospace;font-size:10.5px;margin-left:.8em;opacity:.7;letter-spacing:.08em}
.zn .zn-hint{position:absolute;left:50%;bottom:clamp(22px,6vh,64px);transform:translateX(-50%);text-align:center;opacity:0;transition:opacity .9s;
  color:#3f3c34;background:rgba(205,200,176,.84);padding:7px 16px 6px;font-size:13.5px;letter-spacing:.06em;max-width:min(560px,88vw)}
.zn .zn-hint.on{opacity:1}
.zn .zn-hint small{display:block;font-family:"IBM Plex Mono",monospace;font-size:10.5px;letter-spacing:.1em;opacity:.7;margin-top:2px}
.zn .zn-tag{position:absolute;left:0;top:0;opacity:0;transition:opacity .25s;color:#e8e2cf;font-size:13px;letter-spacing:.08em;white-space:nowrap;
  text-shadow:0 1px 4px rgba(0,0,0,.8);transform:translate(-50%,-100%)}
.zn .zn-tag.on{opacity:1}
.zn .zn-tag i{font-style:normal;font-family:"IBM Plex Mono",monospace;font-size:10.5px;opacity:.7;margin-left:.6em}
.zn .zn-tag::before{content:"◇";display:block;text-align:center;font-size:10px;opacity:.8;margin-bottom:2px}
.zn .zn-prompt{position:absolute;left:50%;bottom:clamp(22px,6vh,64px);transform:translateX(-50%);opacity:0;transition:opacity 1s;
  font-family:"Shippori Mincho B1","Noto Serif JP",serif;font-size:clamp(16px,1.5vw,20px);letter-spacing:.2em;color:#efe6cf;cursor:pointer;
  padding:10px 28px 9px;background:linear-gradient(90deg,rgba(0,0,0,0),rgba(0,0,0,.55) 22%,rgba(0,0,0,.55) 78%,rgba(0,0,0,0));text-shadow:0 0 12px rgba(0,0,0,.6)}
.zn .zn-prompt.on{opacity:1}
.zn .zn-prompt small{font-family:"EB Garamond",serif;font-size:.78em;letter-spacing:.12em;opacity:.65;margin-left:1em;font-style:italic}
.zn .zn-prompt:hover{color:#fff}
.zn .zn-warp{position:absolute;right:clamp(16px,3vw,40px);bottom:calc(clamp(22px,6vh,64px) + 52px);font-size:12.5px;letter-spacing:.08em;color:#3f3c34;background:rgba(205,200,176,.8);
  padding:6px 12px 5px;cursor:pointer;opacity:0;transition:opacity 1s}
.zn .zn-warp.on{opacity:1}
.zn .zn-warp small{font-family:"IBM Plex Mono",monospace;font-size:10px;opacity:.7;margin-left:.6em}

/* epigraph, quiet lines */
.zn .zn-epi{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);text-align:center;opacity:0;transition:opacity 2.4s;width:min(760px,90vw)}
.zn .zn-epi.on{opacity:1}
.zn .zn-epi .jp{font-family:"Shippori Mincho B1","Noto Serif JP",serif;font-size:clamp(20px,2.4vw,32px);letter-spacing:.22em;color:#f1e9d4;text-shadow:0 0 22px rgba(0,0,0,.6)}
.zn .zn-epi .en{font-family:"EB Garamond",serif;font-style:italic;font-size:clamp(13px,1.1vw,16px);letter-spacing:.06em;color:#d9cfb6;opacity:.75;margin-top:1.1em}
.zn .zn-line{position:absolute;left:50%;bottom:clamp(70px,16vh,170px);transform:translateX(-50%);text-align:center;opacity:0;transition:opacity 3s;width:min(760px,90vw)}
.zn .zn-line.on{opacity:1}
.zn .zn-line .jp{font-family:"Shippori Mincho B1","Noto Serif JP",serif;font-size:clamp(17px,1.8vw,24px);letter-spacing:.18em;color:#f3ead2;text-shadow:0 0 18px rgba(0,0,0,.8)}
.zn .zn-line .en{font-family:"EB Garamond",serif;font-style:italic;font-size:clamp(12px,1vw,15px);color:#d9cfb6;opacity:.7;margin-top:.7em}

/* ── soapstone / bonfire layer ── */
.zn .zn-big{position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);text-align:center;opacity:0;transition:opacity 1.4s;padding:3.2vh 0 2.6vh;
  background:linear-gradient(180deg,rgba(0,0,0,0),rgba(0,0,0,.62) 30%,rgba(0,0,0,.62) 70%,rgba(0,0,0,0))}
.zn .zn-big.on{opacity:1}
.zn .zn-big .t{font-family:"EB Garamond",serif;font-weight:600;font-size:clamp(34px,5.6vw,84px);letter-spacing:.08em;
  background:linear-gradient(180deg,#fff3c4 0%,#e2b65a 48%,#9a6a22 100%);-webkit-background-clip:text;background-clip:text;color:transparent;
  filter:drop-shadow(0 0 18px rgba(255,170,60,.25));transform:scale(1.04);transition:transform 5s ease-out}
.zn .zn-big.on .t{transform:scale(1)}
.zn .zn-big .s{font-family:"Shippori Mincho B1",serif;font-size:clamp(14px,1.4vw,19px);letter-spacing:.5em;color:#d8b46a;opacity:.8;margin-top:.4em}

.zn .zn-ds{position:absolute;left:50%;bottom:clamp(30px,10vh,120px);transform:translateX(-50%);width:min(620px,92vw);opacity:0;transition:opacity .45s;
  background:radial-gradient(120% 140% at 50% 50%,rgba(16,13,10,.9),rgba(8,7,6,.82));padding:26px 30px 18px;color:#ebe3cf;pointer-events:none}
.zn .zn-ds.on{opacity:1;pointer-events:auto}
.zn .zn-ds::before,.zn .zn-ds::after{content:"";position:absolute;left:0;right:0;height:1px;background:linear-gradient(90deg,rgba(201,170,110,0),rgba(201,170,110,.65),rgba(201,170,110,0))}
.zn .zn-ds::before{top:0}.zn .zn-ds::after{bottom:0}
.zn .zn-ds .hd{font-family:"EB Garamond",serif;font-size:13px;letter-spacing:.3em;text-transform:uppercase;color:#bfa36a;text-align:center;margin-bottom:14px}
.zn .zn-ds .tx{font-family:"EB Garamond","Shippori Mincho B1",serif;font-size:clamp(21px,2vw,27px);text-align:center;line-height:1.5;color:#f4ecd6}
.zn .zn-ds .tx.jp{font-family:"Shippori Mincho B1","Noto Serif JP",serif;letter-spacing:.12em}
.zn .zn-ds .body{font-family:"Noto Serif JP",serif;font-size:clamp(14px,1.2vw,16px);line-height:2;letter-spacing:.06em;color:#e8dfc7}
.zn .zn-ds .en{font-family:"EB Garamond",serif;font-style:italic;font-size:14.5px;line-height:1.55;color:#cbbf9f;margin-top:12px;opacity:.85}
.zn .zn-ds .ft{display:flex;justify-content:center;gap:28px;margin-top:18px;font-family:"EB Garamond",serif;font-size:15px;letter-spacing:.08em}
.zn .zn-ds button{background:none;border:0;color:#d7c9a6;font:inherit;cursor:pointer;padding:4px 2px;letter-spacing:inherit}
.zn .zn-ds button:hover{color:#fff}
.zn .zn-ds button.dim{opacity:.45;cursor:default}
.zn .zn-ds button .ct{color:#e3a54a;margin-left:.5em;font-variant-numeric:tabular-nums}
.zn .zn-ds .row{display:flex;align-items:center;justify-content:center;gap:14px;margin:8px 0;font-family:"EB Garamond","Shippori Mincho B1",serif;font-size:18px}
.zn .zn-ds .row .v{min-width:12em;text-align:center;color:#f1e6c8}
.zn .zn-ds .row button{font-size:20px;color:#c79b52;padding:0 6px}
.zn .zn-ds .row .lb{font-family:"IBM Plex Mono",monospace;font-size:10px;letter-spacing:.2em;color:#9c8a62;width:5.6em;text-align:right}

.zn .zn-menu{position:absolute;left:clamp(16px,6vw,90px);top:50%;transform:translateY(-50%);opacity:0;transition:opacity .8s;pointer-events:none;
  padding:22px 46px 22px 24px;background:linear-gradient(90deg,rgba(8,7,6,.82),rgba(8,7,6,.6) 70%,rgba(8,7,6,0))}
.zn .zn-menu.on{opacity:1;pointer-events:auto}
.zn .zn-menu .ti{font-family:"EB Garamond",serif;font-size:12px;letter-spacing:.32em;color:#bfa36a;text-transform:uppercase;margin-bottom:12px}
.zn .zn-menu button{display:block;background:none;border:0;color:#e6dcc2;cursor:pointer;padding:7px 0;text-align:left;
  font-family:"Shippori Mincho B1","Noto Serif JP",serif;font-size:clamp(17px,1.5vw,20px);letter-spacing:.16em}
.zn .zn-menu button small{font-family:"EB Garamond",serif;font-style:italic;font-size:.72em;letter-spacing:.06em;opacity:.6;margin-left:.9em}
.zn .zn-menu button:hover{color:#fff;text-shadow:0 0 12px rgba(255,190,90,.5)}
.zn .zn-menu button:hover::before{content:"▸ ";color:#d8a24a;margin-left:-1em}

/* ── archives (beige system panel) ── */
.zn .zn-nier{position:absolute;inset:clamp(12px,5vh,64px) clamp(12px,6vw,110px);opacity:0;transition:opacity .35s;pointer-events:none;
  background:rgba(205,200,176,.95);color:#3f3c34;display:flex;flex-direction:column;box-shadow:0 0 0 1px rgba(63,60,52,.15),0 30px 80px rgba(0,0,0,.45)}
.zn .zn-nier.on{opacity:1;pointer-events:auto}
.zn .zn-nier .top{display:flex;justify-content:space-between;align-items:center;padding:12px 18px 10px;background:#4a473f;color:#d7d1bb;
  font-family:"IBM Plex Mono",monospace;font-size:12px;letter-spacing:.24em}
.zn .zn-nier .top button{background:none;border:0;color:#d7d1bb;font:inherit;cursor:pointer;letter-spacing:.2em;padding:2px 6px}
.zn .zn-nier .top button:hover{background:#d7d1bb;color:#4a473f}
.zn .zn-nier .bd{flex:1;display:flex;min-height:0}
.zn .zn-nier ul{list-style:none;margin:0;padding:14px 0;width:min(300px,38%);overflow:auto;border-right:1px solid rgba(63,60,52,.2)}
.zn .zn-nier li{padding:8px 16px;font-size:14px;letter-spacing:.06em;cursor:pointer;display:flex;gap:.6em;align-items:baseline}
.zn .zn-nier li .k{font-family:"IBM Plex Mono",monospace;font-size:10px;opacity:.6;letter-spacing:.1em}
.zn .zn-nier li:hover{background:rgba(74,71,63,.12)}
.zn .zn-nier li.sel{background:#4a473f;color:#d7d1bb}
.zn .zn-nier li.lock{opacity:.4;cursor:default}
.zn .zn-nier .doc{flex:1;padding:22px clamp(16px,3vw,40px);overflow:auto;position:relative}
.zn .zn-nier .doc h3{margin:0 0 4px;font-weight:700;font-size:clamp(17px,1.5vw,21px);letter-spacing:.1em}
.zn .zn-nier .doc .kd{font-family:"IBM Plex Mono",monospace;font-size:10.5px;letter-spacing:.24em;opacity:.6;margin-bottom:18px}
.zn .zn-nier .doc .ln{font-size:clamp(15px,1.25vw,17px);line-height:2.05;letter-spacing:.05em}
.zn .zn-nier .doc .en{margin-top:18px;padding-top:12px;border-top:1px dashed rgba(63,60,52,.3);font-family:"EB Garamond",serif;font-style:italic;font-size:15.5px;line-height:1.6;opacity:.8}
.zn .zn-nier .doc .empty{opacity:.5;font-size:14px;margin-top:20%}
.zn .zn-nier .ft{display:flex;justify-content:space-between;align-items:center;padding:8px 18px;border-top:1px solid rgba(63,60,52,.2);font-family:"IBM Plex Mono",monospace;font-size:10.5px;letter-spacing:.2em}
.zn .zn-nier .ft button{background:none;border:1px solid rgba(63,60,52,.5);color:#3f3c34;font:inherit;padding:3px 9px;cursor:pointer}
.zn .zn-nier .ft button.sel{background:#4a473f;color:#d7d1bb}
.zn .zn-nier .dots{position:absolute;right:16px;top:16px;width:60px;height:8px;background:radial-gradient(circle,rgba(63,60,52,.4) 1px,transparent 1.5px) 0 0/6px 8px}
@media (max-width:640px){
  .zn .zn-area .en{display:none}
  .zn .zn-nier .bd{flex-direction:column}
  .zn .zn-nier ul{width:auto;max-height:34%;border-right:0;border-bottom:1px solid rgba(63,60,52,.2)}
  .zn .zn-menu{left:12px;padding-right:30px}
}
.zn .pe{font-family:"EB Garamond",serif!important;letter-spacing:.03em!important}
.zn .zn-area .nm-en{font-family:"IBM Plex Mono",monospace;font-size:.9em;letter-spacing:.12em}
.zn .zn-prompt .pe{font-style:italic;font-size:1.08em}
.zn .zn-nier .doc .ln.pe{font-size:clamp(16px,1.35vw,19px);line-height:1.75}
.zn .zn-fallback{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24px;background:#1b1a16;text-align:center;padding:24px}
`;

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

export function buildUI(root, ctx, Z) {
  const jp = (s) => ctx.jp.html(s);
  const style = el('style');
  style.textContent = CSS;
  root.appendChild(style);
  const hud = el('div', 'zn-hud');
  root.appendChild(hud);
  const sig = { signal: ctx.signal };

  const area = el('div', 'zn-area');
  const ab = el('button', 'zn-ab', '■ ARCHIVES<b>0/9</b>');
  const log = el('div', 'zn-log');
  const hint = el('div', 'zn-hint');
  const tag = el('div', 'zn-tag');
  const prompt = el('div', 'zn-prompt');
  const warp = el('div', 'zn-warp');
  const epi = el('div', 'zn-epi');
  const line = el('div', 'zn-line');
  const big = el('div', 'zn-big', '<div class="t">BONFIRE LIT</div><div class="s">篝火を灯した</div>');
  const ds = el('div', 'zn-ds');
  const menu = el('div', 'zn-menu');
  const nier = el('div', 'zn-nier');
  for (const e of [area, ab, log, hint, tag, prompt, warp, epi, line, big, ds, menu, nier]) hud.appendChild(e);
  ctx.jp.attach(hud);

  let open = null; // which modal is open
  const blockers = [ds, menu, nier];
  for (const b of [ab, prompt, warp, ...blockers]) {
    b.addEventListener('pointerdown', (e) => e.stopPropagation(), sig);
  }

  const api = {};
  api.isOpen = () => !!open;
  const EN = () => (ctx.en != null ? !!ctx.en : ctx.lang === 'en');
  api.EN = EN;
  const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  const last = {}; // what each element last said, so a language switch can re-say it

  const areaHTML = (p) => EN()
    ? `<span class="sq">■</span><span class="no">${p.no}</span><span class="nm nm-en">${cap(p.en)}</span>`
    : `<span class="sq">■</span><span class="no">${p.no}</span><span class="nm">${jp(p.jp)}</span><span class="en">${p.en}</span>`;
  api.area = (id) => {
    const p = TX.PLACES[id];
    last.area = id;
    if (!p || !p.plain) { area.classList.remove('on'); return; }
    area.classList.remove('on');
    ctx.timeout(() => {
      area.innerHTML = areaHTML(p);
      area.classList.add('on');
    }, 600);
  };
  api.areaVisible = (v) => area.classList.toggle('on', v);

  api.archBtn = (n, show = true) => {
    ab.querySelector('b').textContent = `${n}/9`;
    ab.classList.toggle('on', show);
    ab.classList.toggle('zn-on', show);
  };
  ab.addEventListener('click', () => { Z.audio && Z.audio.ui('open'); api.archives(); }, sig);

  api.log = (text, sub, en) => {
    const e = en || (sub ? cap(sub.toLowerCase()) : '');
    const d = el('div', '', EN() ? `■ ${e}` : `■ ${jp(text)}${sub ? `<small>${sub}</small>` : ''}`);
    log.appendChild(d);
    requestAnimationFrame(() => d.classList.add('on'));
    ctx.timeout(() => d.classList.remove('on'), 6500);
    ctx.timeout(() => d.remove(), 7200);
    while (log.children.length > 4) log.firstChild.remove();
    Z.audio && Z.audio.ui('blip');
  };

  let hintKey = null;
  api.hint = (key, text, en) => {
    if (!key) { if (hintKey) { hint.classList.remove('on'); hintKey = null; } return; }
    if (hintKey === key) return;
    hintKey = key;
    last.hint = [text, en];
    hint.innerHTML = EN() ? cap(en) : `${jp(text)}${en ? `<small>${en}</small>` : ''}`;
    hint.classList.add('on');
  };
  api.hintKey = () => hintKey;

  api.tag = (on, x, y, label, en) => {
    if (!on) { tag.classList.remove('on'); return; }
    tag.style.left = `${x}px`;
    tag.style.top = `${y}px`;
    const h = EN() ? `■ ${cap(en)}` : `■ ${label}<i>${en}</i>`;
    if (tag._h !== h) { tag.innerHTML = h; tag._h = h; }
    tag.classList.add('on');
  };

  let promptCb = null;
  api.prompt = (text, en, cb) => {
    if (!text) { prompt.classList.remove('on', 'zn-on'); promptCb = null; last.prompt = null; return; }
    last.prompt = [text, en];
    prompt.innerHTML = EN() ? `<span class="pe">${cap(en)}</span>` : `${jp(text)}${en ? `<small>${en}</small>` : ''}`;
    prompt.classList.add('on', 'zn-on');
    promptCb = cb;
  };
  prompt.addEventListener('click', () => { if (promptCb) { const c = promptCb; c(); } }, sig);
  api.promptActive = () => !!promptCb;

  let warpCb = null;
  api.warp = (on, cb) => {
    if (!on) { warp.classList.remove('on', 'zn-on'); warpCb = null; return; }
    warp.innerHTML = EN() ? '■ Travel to the bonfire' : `■ ${jp('[篝火|かがりび|bonfire]へ[戻る|もどる|return]')}<small>travel to the bonfire</small>`;
    warp.classList.add('on', 'zn-on');
    warpCb = cb;
  };
  warp.addEventListener('click', () => { if (warpCb) warpCb(); }, sig);

  api.epigraph = (on) => {
    if (on) epi.innerHTML = EN() ? `<div class="jp pe">${TX.EPIGRAPH.en}</div>` : `<div class="jp">${jp(TX.EPIGRAPH.jp)}</div><div class="en">${TX.EPIGRAPH.en}</div>`;
    last.epi = on;
    epi.classList.toggle('on', on);
  };
  api.line = (j, en) => {
    if (!j) { line.classList.remove('on'); last.line = null; return; }
    last.line = [j, en];
    line.innerHTML = EN() ? `<div class="jp pe">${en}</div>` : `<div class="jp">${jp(j)}</div>${en ? `<div class="en">${en}</div>` : ''}`;
    requestAnimationFrame(() => line.classList.add('on'));
  };
  api.big = (on) => { big.querySelector('.s').style.display = EN() ? 'none' : ''; big.classList.toggle('on', on); };

  const closeDS = () => {
    ds.classList.remove('on');
    if (open === 'ds') open = null;
  };
  api.closeAll = () => {
    closeDS();
    nier.classList.remove('on');
    menu.classList.remove('on');
    open = null;
  };

  // Souls-style message
  api.message = (m, { count, appraised, own, onAppraise }) => {
    const isJP = !!m.jp && !(EN() && m.t);
    const text = isJP ? jp(m.jp) : (m.jp ? m.t : m.en);
    last.ds = () => api.message(m, { count, appraised, own, onAppraise });
    ds.innerHTML = `<div class="hd">${own ? 'Your message' : 'Message'}</div><div class="tx ${isJP ? 'jp' : ''}">${text}</div>
      <div class="ft"><button class="ap ${appraised || own ? 'dim' : ''}">${own ? 'Appraisals' : appraised ? 'Appraised' : 'Appraise'}<span class="ct">▲ ${count.toLocaleString('en-US')}</span></button><button class="cl">Close</button></div>`;
    ds.querySelector('.cl').addEventListener('click', () => { Z.audio && Z.audio.ui('close'); closeDS(); }, sig);
    const apb = ds.querySelector('.ap');
    if (!appraised && !own) apb.addEventListener('click', () => {
      if (apb.classList.contains('dim')) return;
      onAppraise();
      apb.classList.add('dim');
      apb.innerHTML = `Appraised<span class="ct">▲ ${(count + 1).toLocaleString('en-US')}</span>`;
    }, sig);
    ds.classList.add('on');
    open = 'ds';
  };

  api.slab = () => {
    last.ds = api.slab;
    ds.innerHTML = EN()
      ? `<div class="hd">Slab of Iron</div><div class="body pe">${TX.SLAB.en}</div><div class="ft"><button class="cl">Close</button></div>`
      : `<div class="hd">鉄塊 · Slab of Iron</div><div class="body">${TX.SLAB.jp.map(jp).join('<br>')}</div>
      <div class="en">${TX.SLAB.en}</div><div class="ft"><button class="cl">Close</button></div>`;
    ds.querySelector('.cl').addEventListener('click', () => { Z.audio && Z.audio.ui('close'); closeDS(); }, sig);
    ds.classList.add('on');
    open = 'ds';
  };

  // the archive reader
  let sel = null;
  api.archives = (key) => {
    const have = Z.store.arch;
    if (key) sel = key;
    if (!sel || !have.has(sel)) sel = TX.ARCHIVE_ORDER.find((k) => have.has(k)) || null;
    const E = EN();
    const en = Z.store.en;
    const list = TX.ARCHIVE_ORDER.map((k, i) => {
      const a = TX.ARCHIVES[k];
      const got = have.has(k);
      return `<li data-k="${k}" class="${got ? '' : 'lock'} ${k === sel ? 'sel' : ''}"><span class="k">${String(i + 1).padStart(2, '0')}</span>${got ? (E ? a.entitle : a.plain) : (E ? '???' : '？？？')}</li>`;
    }).join('');
    const a = sel && TX.ARCHIVES[sel];
    const doc = a
      ? (E
        ? `<h3 class="pe">${a.entitle}</h3><div class="kd">ARCHIVE · ${a.kind}</div><div class="ln pe">${a.en}</div>`
        : `<h3>${jp(a.title)}</h3><div class="kd">ARCHIVE · ${a.kind}</div><div class="ln">${a.body.map(jp).join('<br>')}</div>${en ? `<div class="en">${a.en}</div>` : ''}`)
      : (E ? '<div class="empty">■ Nothing yet.</div>' : '<div class="empty">■ まだ何もない。<br>nothing yet.</div>');
    nier.innerHTML = `<div class="top"><span>■ ARCHIVES　${have.size}/9</span><button class="x">CLOSE ✕</button></div>
      <div class="bd"><ul>${list}</ul><div class="doc"><div class="dots"></div>${doc}</div></div>
      <div class="ft"><span>区域 · KUIKI · H06</span><span>${E ? '' : `<button class="en ${en ? 'sel' : ''}">EN</button>`}</span></div>`;
    nier.querySelector('.x').addEventListener('click', () => { Z.audio && Z.audio.ui('close'); nier.classList.remove('on'); open = null; }, sig);
    nier.querySelector('.ft .en')?.addEventListener('click', () => { Z.store.en = !Z.store.en; ctx.store.set('en', Z.store.en); Z.audio && Z.audio.ui('tick'); api.archives(); }, sig);
    nier.querySelectorAll('li').forEach((li) => li.addEventListener('click', () => {
      if (li.classList.contains('lock')) return;
      sel = li.dataset.k;
      Z.audio && Z.audio.ui('tick');
      api.archives();
    }, sig));
    closeDS();
    menu.classList.remove('on');
    nier.classList.add('on');
    open = 'nier';
  };

  api.menu = (items) => {
    if (!items) { menu.classList.remove('on'); last.menu = null; if (open === 'menu') open = null; return; }
    last.menu = items;
    menu.innerHTML = `<div class="ti">Bonfire</div>` + items.map((it, i) => `<button data-i="${i}" class="${EN() ? 'pe' : ''}">${EN() ? cap(it.en) : `${jp(it.jp)}<small>${it.en}</small>`}</button>`).join('');
    menu.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { Z.audio && Z.audio.ui('tick'); items[+b.dataset.i].fn(); }, sig));
    menu.classList.add('on');
  };

  // write a message (Souls-like templates)
  api.composer = (onPlace) => {
    let t = 0, w = 0, lang = EN() ? 'en' : 'jp';
    const render = () => {
      const tpl = TX.TEMPLATES[lang][t], word = TX.WORDS[lang][w];
      const txt = tpl.replace('{}', word);
      last.ds = null;
      ds.innerHTML = `<div class="hd">Write a message</div><div class="tx ${lang === 'jp' ? 'jp' : ''}">${txt}</div>
        <div class="row"><span class="lb">TEMPLATE</span><button class="tp">◂</button><span class="v">${tpl.replace('{}', '＿＿')}</span><button class="tn">▸</button></div>
        <div class="row"><span class="lb">WORD</span><button class="wp">◂</button><span class="v">${word}</span><button class="wn">▸</button></div>
        <div class="ft"><button class="lg">${lang === 'jp' ? '日本語 ⇄ English' : 'English ⇄ 日本語'}</button><button class="pl">Place</button><button class="cl">Cancel</button></div>`;
      const n = TX.TEMPLATES.en.length, m = TX.WORDS.en.length;
      const on = (c, f) => ds.querySelector(c).addEventListener('click', () => { Z.audio && Z.audio.ui('tick'); f(); render(); }, sig);
      on('.tp', () => { t = (t + n - 1) % n; });
      on('.tn', () => { t = (t + 1) % n; });
      on('.wp', () => { w = (w + m - 1) % m; });
      on('.wn', () => { w = (w + 1) % m; });
      on('.lg', () => { lang = lang === 'jp' ? 'en' : 'jp'; });
      ds.querySelector('.cl').addEventListener('click', () => { Z.audio && Z.audio.ui('close'); closeDS(); }, sig);
      ds.querySelector('.pl').addEventListener('click', () => { closeDS(); onPlace({ t, w, lang }); }, sig);
    };
    render();
    menu.classList.remove('on');
    ds.classList.add('on');
    open = 'ds';
  };

  api.relang = () => {
    if (last.area && area.classList.contains('on')) { const p = TX.PLACES[last.area]; if (p && p.plain) area.innerHTML = areaHTML(p); }
    if (hintKey && last.hint) { const k = hintKey; hintKey = null; api.hint(k, ...last.hint); }
    if (last.prompt && promptCb) { const cb = promptCb; api.prompt(...last.prompt, cb); }
    if (last.epi) api.epigraph(true);
    if (last.line) api.line(...last.line);
    if (last.menu && menu.classList.contains('on')) api.menu(last.menu);
    if (open === 'nier') api.archives();
    if (open === 'ds' && last.ds) last.ds();
    if (warpCb) api.warp(true, warpCb);
    big.querySelector('.s').style.display = EN() ? 'none' : '';
  };

  api.fallback = () => {
    const f = el('div', 'zn-fallback zn-on');
    f.innerHTML = `<div class="zn-epi on" style="position:static;transform:none"><div class="jp">${jp(TX.EPIGRAPH.jp)}</div><div class="en">${TX.EPIGRAPH.en}</div></div>
      <div style="font-family:'IBM Plex Mono',monospace;font-size:12px;letter-spacing:.2em;color:#9c957f">■ この区域は、この機械では描けない。 (WebGL2 unavailable)</div>`;
    root.appendChild(f);
    return f;
  };

  return api;
}
