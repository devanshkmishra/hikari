// 地下 — styles, all scoped under .rg. Ugly on purpose, never unreadable.
export const CSS = `
.rg { position:absolute; inset:0; overflow:hidden; background:#050506; color:#fff; touch-action:none; user-select:none; -webkit-user-select:none; cursor:crosshair; font-family:'Zen Kaku Gothic New', system-ui, sans-serif; }
.rg canvas.rg-gl { position:absolute; inset:0; width:100%; height:100%; display:block; }
.rg .rg-white { position:absolute; inset:0; background:#fff; opacity:0; pointer-events:none; }

/* ── collage layer ── */
.rg .rg-wall, .rg .rg-coll, .rg .rg-caps, .rg .rg-scrib { position:absolute; inset:0; pointer-events:none; }
.rg .rg-scrib { width:100%; height:100%; overflow:visible; }
.rg .rg-scrib path { fill:none; stroke-linecap:round; stroke-linejoin:round; }
.rg .rg-photo { position:absolute; left:0; top:0; transform-origin:0 0; background:#f3efe4; padding:0; box-shadow:0 10px 30px rgba(0,0,0,.55); will-change:transform; }
.rg .rg-photo canvas { display:block; width:100%; height:100%; }
.rg .rg-photo.slap { transition: transform .5s cubic-bezier(.2,.95,.25,1.12), padding .3s ease; }
.rg .rg-photo.print { padding:2.2%; }
.rg .rg-photo.print::after { content:''; position:absolute; left:38%; top:-3.5%; width:24%; height:9%; background:rgba(235,230,205,.82); transform:rotate(-4deg); box-shadow:0 1px 2px rgba(0,0,0,.2); }
.rg .rg-photo.dim canvas { filter:brightness(.72); }

.rg .rg-stk { position:absolute; display:grid; place-items:center; font-family:'Mochiy Pop One', sans-serif; color:#111; animation: rg-slap .32s cubic-bezier(.2,1.4,.3,1) both; filter: drop-shadow(0 3px 0 rgba(0,0,0,.35)); }
.rg .rg-stk.circle { width:clamp(58px,7vw,92px); aspect-ratio:1; border-radius:50%; background:#d8ff3a; border:5px solid #fff; font-size:clamp(17px,2vw,26px); }
.rg .rg-stk.star { width:clamp(70px,8vw,110px); aspect-ratio:1; background:#ff5ab4; clip-path:polygon(50% 0,61% 33%,96% 20%,72% 50%,96% 80%,61% 67%,50% 100%,39% 67%,4% 80%,28% 50%,4% 20%,39% 33%); font-size:clamp(22px,2.6vw,34px); color:#fff; }
.rg .rg-stk.rect { padding:6px 12px; background:#111; color:#fff; border:3px solid #fff; font-family:Anton, Impact, sans-serif; font-size:clamp(18px,2.2vw,30px); letter-spacing:.04em; }
.rg .rg-stk.stamp { padding:4px 10px; border:4px solid #e0261f; color:#e0261f; font-family:'Zen Kaku Gothic New', sans-serif; font-weight:700; font-size:clamp(18px,2.2vw,28px); background:rgba(255,255,255,.06); }
.rg .rg-stk.face { width:clamp(60px,7vw,90px); aspect-ratio:1; }
@keyframes rg-slap { from { transform: var(--r) scale(2.2); opacity:0; } 60% { opacity:1; } to { transform: var(--r) scale(1); opacity:1; } }

.rg .rg-torn { position:absolute; left:max(14px, env(safe-area-inset-left)); top:92px; width:clamp(118px,13vw,170px); padding:10px 12px 14px; background:#efeadf; color:#111; pointer-events:auto; cursor:pointer;
  clip-path:polygon(0 4%,8% 0,22% 3%,40% 0,61% 4%,78% 1%,100% 5%,97% 30%,100% 52%,96% 74%,100% 100%,74% 96%,52% 100%,30% 95%,12% 100%,0 96%,3% 70%,0 44%,4% 22%);
  transform:rotate(-5deg); transition: transform .2s; opacity:0; }
.rg .rg-torn.on { opacity:1; }
.rg .rg-torn:hover { transform:rotate(-2deg) scale(1.04); }
.rg .rg-torn b { display:block; font-family:'Shippori Mincho B1', serif; font-weight:800; font-size:clamp(28px,3vw,40px); line-height:1; }
.rg .rg-torn i { font-family:UnifrakturCook, serif; font-style:normal; color:#e0261f; font-size:clamp(15px,1.6vw,20px); }
.rg .rg-torn small { display:block; margin-top:6px; font-family:'IBM Plex Mono', monospace; font-size:10.5px; line-height:1.35; }

/* ── captions ── */
.rg .rg-cap { position:absolute; width:max-content; max-width:min(76vw, 620px); line-height:1.15; white-space:normal; animation: rg-cap-in .28s cubic-bezier(.2,1.5,.3,1) both; pointer-events:none; }
.rg .rg-cap .jt { pointer-events:auto; cursor:help; }
.rg .rg-cap.out { animation: rg-cap-out .35s ease-in both; }
@keyframes rg-cap-in { from { transform: rotate(var(--rot)) scale(1.5); opacity:0; } to { transform: rotate(var(--rot)) scale(1); opacity:1; } }
@keyframes rg-cap-out { to { transform: rotate(var(--rot)) translateY(-14px) scale(.96); opacity:0; } }
.rg .cap-impact { font-family:Anton, Impact, sans-serif; font-size:clamp(24px,3.3vw,46px); text-transform:uppercase; letter-spacing:.01em; color:#fff;
  text-shadow: 2px 2px 0 #000,-2px 2px 0 #000,2px -2px 0 #000,-2px -2px 0 #000,0 3px 0 #000,3px 0 0 #000,-3px 0 0 #000,0 -3px 0 #000, 5px 6px 0 rgba(224,38,31,.85); }
.rg .cap-hl { font-family:'IBM Plex Mono', monospace; font-weight:500; font-size:clamp(14px,1.6vw,20px); color:#0a0a0a; background:#d8ff3a; padding:3px 9px; box-shadow:4px 4px 0 #111; }
.rg .cap-tt { font-family:'Zen Kaku Gothic New', system-ui, sans-serif; font-weight:700; font-size:clamp(14px,1.6vw,20px); color:#111; background:#fff; border-radius:7px; padding:5px 11px; }
.rg .cap-pop { font-family:'Mochiy Pop One', sans-serif; font-size:clamp(24px,3.4vw,48px); color:#ffe600;
  text-shadow: 3px 3px 0 #111,-3px 3px 0 #111,3px -3px 0 #111,-3px -3px 0 #111,0 4px 0 #111,4px 0 0 #111,-4px 0 0 #111,0 -4px 0 #111, 7px 8px 0 #ff5ab4; }
.rg .cap-red { font-family:'Zen Kaku Gothic New', sans-serif; font-weight:700; font-size:clamp(15px,1.8vw,24px); color:#fff; background:#e0261f; padding:4px 10px; }
.rg .cap-glitch { font-family:'Rubik Glitch', Anton, sans-serif; font-size:clamp(26px,3.6vw,52px); color:#fff; text-shadow:3px 0 #ff2a6a,-3px 0 #3affd8; }
.rg .cap-goth { font-family:UnifrakturCook, serif; font-size:clamp(24px,3vw,42px); color:#f2f2f6; text-shadow:0 0 12px rgba(255,42,42,.8), 2px 2px 0 #000; }
.rg .cap-clean { font-family:'EB Garamond', serif; font-style:italic; font-size:clamp(18px,2vw,26px); color:#fff8e6; letter-spacing:.06em; text-shadow:0 0 18px rgba(255,230,180,.6); }
.rg .cap-grade { font-family:Anton, Impact, sans-serif; font-size:clamp(34px,4.6vw,64px); letter-spacing:.02em; text-shadow:3px 3px 0 #000; }
.rg .cap-grade.g300 { color:#6fd7ff; } .rg .cap-grade.g100 { color:#9dff6f; } .rg .cap-grade.g50 { color:#ffd84a; } .rg .cap-grade.gx { color:#ff3a3a; }

/* ── countdown ── */
.rg .rg-count { position:absolute; left:50%; top:42%; transform:translate(-50%,-50%); text-align:center; pointer-events:none; }
.rg .rg-count .n { font-family:Anton, Impact, sans-serif; font-size:clamp(90px,17vw,240px); line-height:.9; color:#fff; display:inline-block;
  text-shadow:4px 4px 0 #000,-4px 4px 0 #000,4px -4px 0 #000,-4px -4px 0 #000, 12px 12px 0 #e0261f; animation: rg-num .38s cubic-bezier(.2,1.6,.3,1) both; }
.rg .rg-count .n.sw { font-family:'Rubik Glitch', Anton, sans-serif; font-size:clamp(60px,12vw,170px); text-shadow:6px 0 #ff2a6a,-6px 0 #3affd8; }
.rg .rg-count .s { display:block; margin-top:6px; font-family:'IBM Plex Mono', monospace; font-size:clamp(12px,1.4vw,16px); background:#d8ff3a; color:#000; padding:2px 8px; width:max-content; margin-inline:auto; }
.rg .rg-count .soon { font-family:'Rubik Glitch', Anton, sans-serif; font-size:clamp(22px,3vw,40px); color:#fff; text-shadow:3px 0 #ff2a6a,-3px 0 #3affd8; }
@keyframes rg-num { from { transform: scale(1.8) rotate(-8deg); opacity:0; } to { transform: scale(1) rotate(-3deg); opacity:1; } }

/* ── viewfinder OSD ── */
.rg .rg-osd { position:absolute; inset:0; pointer-events:none; font-family:VT323, 'DotGothic16', monospace; color:rgba(255,255,255,.9); text-shadow:0 0 3px rgba(0,0,0,.9); font-size:clamp(17px,1.6vw,21px); letter-spacing:.04em; }
.rg .rg-osd .tl { position:absolute; left:max(16px, env(safe-area-inset-left)); top:max(14px, env(safe-area-inset-top)); line-height:1.05; }
.rg .rg-osd .rec::before { content:''; display:inline-block; width:.55em; height:.55em; border-radius:50%; background:#ff2a2a; margin-right:.4em; vertical-align:.05em; animation: rg-blink 1s steps(1) infinite; box-shadow:0 0 6px #ff2a2a; }
@keyframes rg-blink { 50% { opacity:0; } }
.rg .rg-osd .bat { display:inline-block; width:1.4em; height:.62em; border:2px solid currentColor; vertical-align:.05em; margin-right:.5em; position:relative; }
.rg .rg-osd .bat::before { content:''; position:absolute; left:1px; top:1px; bottom:1px; width:35%; background:#ff9a2a; }
.rg .rg-osd .bat::after { content:''; position:absolute; right:-5px; top:25%; height:50%; width:3px; background:currentColor; }
.rg .rg-osd .bl { position:absolute; left:max(16px, env(safe-area-inset-left)); bottom:76px; opacity:.85; }
.rg .rg-osd .date { position:absolute; right:max(18px, env(safe-area-inset-right)); bottom:calc(max(16px, env(safe-area-inset-bottom)) + 50px); color:#ff9a2a; text-shadow:0 0 6px rgba(255,140,30,.8), 0 0 1px #000; font-size:clamp(20px,1.9vw,25px); }
.rg .rg-osd .frame { position:absolute; inset:clamp(10px,2.4vw,28px); border:1px solid rgba(255,255,255,.0); }
.rg .rg-osd .frame i { position:absolute; width:18px; height:18px; border-color:rgba(255,255,255,.55); border-style:solid; border-width:0; }
.rg .rg-osd .frame i:nth-child(1) { left:0; top:0; border-left-width:2px; border-top-width:2px; }
.rg .rg-osd .frame i:nth-child(2) { right:0; top:0; border-right-width:2px; border-top-width:2px; }
.rg .rg-osd .frame i:nth-child(3) { left:0; bottom:0; border-left-width:2px; border-bottom-width:2px; }
.rg .rg-osd .frame i:nth-child(4) { right:0; bottom:0; border-right-width:2px; border-bottom-width:2px; }
.rg .rg-osd .af { position:absolute; left:50%; top:50%; width:44px; height:30px; transform:translate(-50%,-50%); border:2px solid rgba(255,255,255,.4); }
.rg .rg-osd .af.lock { border-color:#9dff6f; }

/* ── the meter ── */
.rg .rg-meter { position:absolute; left:max(16px, env(safe-area-inset-left)); top:50%; transform:translateY(-50%) skewY(-4deg); display:flex; flex-direction:column; align-items:center; gap:6px; pointer-events:none; opacity:0; transition:opacity .4s; }
.rg .rg-meter.on { opacity:1; }
.rg .rg-meter .lab { font-family:'Mochiy Pop One', sans-serif; font-size:clamp(16px,1.7vw,22px); color:#fff; text-shadow:2px 2px 0 #e0261f, -1px -1px 0 #000; writing-mode:vertical-rl; letter-spacing:.1em; }
.rg .rg-meter .bar { width:clamp(18px,1.8vw,26px); height:clamp(140px,26vh,260px); border:3px solid #fff; background:rgba(0,0,0,.45); position:relative; box-shadow:4px 4px 0 #000; }
.rg .rg-meter .fill { position:absolute; left:2px; right:2px; bottom:2px; height:0; background:repeating-linear-gradient(0deg, #d8ff3a 0 9px, #b9e020 9px 11px); }
.rg .rg-meter.hot .fill { background:repeating-linear-gradient(0deg, #ff2a2a 0 9px, #ff7a2a 9px 11px); }
.rg .rg-meter .mark { position:absolute; left:-8px; right:-8px; top:8%; height:3px; background:#fff; }
.rg .rg-meter .pct { font-family:Anton, Impact, sans-serif; font-size:clamp(20px,2.2vw,30px); color:#fff; text-shadow:2px 2px 0 #000; transform:scaleY(1.35); }
.rg .rg-meter .max { font-family:'Rubik Glitch', sans-serif; font-size:clamp(18px,2vw,26px); color:#fff; text-shadow:2px 0 #ff2a6a,-2px 0 #3affd8; visibility:hidden; }
.rg .rg-meter.full .max { visibility:visible; animation: rg-blink .5s steps(1) infinite; }

/* ── hints + toggles ── */
.rg .rg-hint { position:absolute; left:50%; bottom:max(22px, env(safe-area-inset-bottom)); transform:translateX(-50%); font-family:'IBM Plex Mono', monospace; font-size:12.5px; color:rgba(255,255,255,.85); background:rgba(0,0,0,.5); padding:6px 12px; border-radius:4px; white-space:nowrap; transition:opacity .8s; pointer-events:none; max-width:calc(100vw - 260px); overflow:hidden; text-overflow:ellipsis; }
.rg .rg-hint.off { opacity:0; }
.rg .rg-ui { position:absolute; right:max(16px, env(safe-area-inset-right)); bottom:calc(max(16px, env(safe-area-inset-bottom)) + 84px); display:flex; flex-direction:column; align-items:flex-end; gap:8px; }
.rg .rg-btn { pointer-events:auto; cursor:pointer; font-family:Silkscreen, 'VT323', monospace; font-size:12px; letter-spacing:.06em; color:#fff; background:rgba(0,0,0,.55); border:2px solid rgba(255,255,255,.75); padding:5px 9px; text-transform:lowercase; box-shadow:3px 3px 0 rgba(0,0,0,.6); }
.rg .rg-btn:hover { background:#d8ff3a; color:#000; border-color:#000; }
.rg .rg-btn b { color:#d8ff3a; font-weight:400; }
.rg .rg-btn:hover b { color:#000; }
.rg .rg-btn.low b { color:#ff9a2a; }
.rg .rg-ftag { position:absolute; left:0; top:0; pointer-events:auto; cursor:pointer; font-family:'IBM Plex Mono', monospace; font-size:12px; color:#000; background:#d8ff3a; padding:3px 7px; box-shadow:3px 3px 0 #000; white-space:nowrap; opacity:0; transition:opacity .4s; }
.rg .rg-ftag.on { opacity:1; }

/* ── the flier, up close ── */
.rg .rg-modal { position:absolute; inset:0; display:grid; place-items:center; background:rgba(4,4,6,.72); opacity:0; pointer-events:none; transition:opacity .3s; z-index:5; cursor:pointer; }
.rg .rg-modal.on { opacity:1; pointer-events:auto; }
.rg .rg-fl { cursor:auto; width:min(440px, calc(100vw - 32px)); max-height:calc(100vh - 40px); overflow:auto; background:#efeadf; color:#111; padding:0 0 18px; transform:rotate(-1.4deg);
  clip-path:polygon(0 1%,9% 0,25% 1.2%,44% 0,63% 1%,81% 0,100% 1.3%,99% 24%,100% 50%,98.6% 76%,100% 99%,78% 100%,55% 98.8%,33% 100%,14% 98.9%,0 100%,1.2% 74%,0 48%,1% 24%);
  background-image: radial-gradient(rgba(0,0,0,.06) 1px, transparent 1.2px); background-size:5px 5px; }
.rg .rg-fl .top { background:#111; color:#efeadf; font-weight:700; font-size:13px; padding:9px 16px; letter-spacing:.04em; }
.rg .rg-fl h1 { margin:6px 14px 0; font-family:'Shippori Mincho B1', serif; font-weight:800; font-size:clamp(84px,24vw,128px); line-height:1; letter-spacing:-.02em; }
.rg .rg-fl h1 span { font-family:UnifrakturCook, serif; color:#e0261f; font-size:.42em; letter-spacing:0; display:inline-block; transform:rotate(-7deg) translate(-6px,-4px); }
.rg .rg-fl .sub { margin:4px 16px 10px; font-weight:700; font-size:16px; }
.rg .rg-fl canvas { display:block; width:calc(100% - 32px); margin:0 16px; }
.rg .rg-fl .aux { margin:12px 16px 0; background:#111; color:#d8ff3a; font-family:Anton, Impact, sans-serif; font-size:21px; padding:4px 10px; display:flex; justify-content:space-between; align-items:center; }
.rg .rg-fl .aux span { font-family:'Zen Kaku Gothic New', sans-serif; font-weight:700; font-size:14px; color:#efeadf; }
.rg .rg-fl .names { margin:8px 16px 0; font-family:Anton, Impact, sans-serif; font-size:clamp(20px,5.4vw,25px); line-height:1.22; text-transform:none; }
.rg .rg-fl .names em { font-style:normal; color:#e0261f; margin:0 .05em; }
.rg .rg-fl .names span { white-space:nowrap; }
.rg .rg-fl .names span.you { white-space:normal; }
.rg .rg-fl .names .you { font-family:'IBM Plex Mono', monospace; font-size:13px; color:#555; display:block; margin-top:2px; }
.rg .rg-fl .info { margin:10px 16px 4px; font-family:'IBM Plex Mono', monospace; font-size:12.5px; }
.rg .rg-fl ul { list-style:none; margin:6px 16px 0; padding:0; font-weight:700; font-size:13.5px; line-height:1.55; }
.rg .rg-fl .en { margin:12px 16px 0; font-family:'IBM Plex Mono', monospace; font-size:11px; color:#666; }
.rg .rg-fl .x { float:right; font-family:Silkscreen, monospace; cursor:pointer; color:#efeadf; }

/* ── camera roll ── */
.rg .rg-roll { position:absolute; inset:0; overflow:auto; padding:clamp(20px,4vw,48px); background:rgba(6,6,8,.92); opacity:0; pointer-events:none; transition:opacity .3s; z-index:6; cursor:pointer; }
.rg .rg-roll.on { opacity:1; pointer-events:auto; }
.rg .rg-roll h2 { margin:0 0 18px; font-family:'Zen Kaku Gothic New', sans-serif; font-weight:700; font-size:18px; letter-spacing:.08em; }
.rg .rg-roll h2 small { font-family:'IBM Plex Mono', monospace; font-weight:400; font-size:12px; opacity:.7; margin-left:10px; }
.rg .rg-roll .grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(150px, 1fr)); gap:22px; }
.rg .rg-roll figure { margin:0; background:#f3efe4; padding:6px 6px 22px; box-shadow:0 8px 20px rgba(0,0,0,.5); position:relative; }
.rg .rg-roll figure img { display:block; width:100%; }
.rg .rg-roll figcaption { position:absolute; left:8px; bottom:4px; font-family:'IBM Plex Mono', monospace; font-size:10px; color:#333; }
.rg .rg-roll .empty { font-family:'IBM Plex Mono', monospace; font-size:13px; opacity:.7; }
.rg .rg-hidden { display:none !important; }

@media (max-width: 560px) {
  .rg .rg-hint { bottom:196px; max-width:calc(100vw - 32px); white-space:normal; text-align:center; font-size:11.5px; }
  .rg .rg-meter .bar { height:clamp(120px,20vh,200px); }
  .rg .rg-osd .bl { display:none; }
  .rg .rg-ui { bottom:100px; }
  .rg .rg-torn { top:84px; width:104px; }
  .rg .rg-torn small { display:none; }
  .rg .rg-meter { left:10px; }
}
@media (prefers-reduced-motion: reduce) {
  .rg .rg-cap, .rg .rg-stk, .rg .rg-count .n { animation-duration:.01s; }
}
`;
