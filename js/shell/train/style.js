// Scoped styles for the railcar's DOM layer: the dock, captions, the enlarged ad, the book.
export const CSS = `
.hk-train { position:absolute; inset:0; overflow:hidden; background:#07070a; color:#f3ecdc; user-select:none; -webkit-user-select:none; touch-action:none; cursor:grab; }
.hk-train.dragging { cursor:grabbing; }
.hk-train.hot { cursor:pointer; }
.hk-train canvas.hk-gl { position:absolute; inset:0; width:100%; height:100%; display:block; }
.hk-train .hk-grain { position:absolute; inset:-60px; pointer-events:none; opacity:.07; mix-blend-mode:overlay;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  animation: hk-grain .6s steps(5) infinite; }
@keyframes hk-grain { 0%{transform:translate(0,0)} 20%{transform:translate(-22px,14px)} 40%{transform:translate(18px,-20px)} 60%{transform:translate(-12px,-8px)} 80%{transform:translate(10px,22px)} 100%{transform:translate(0,0)} }
.hk-train .hk-vig { position:absolute; inset:0; pointer-events:none; background:radial-gradient(ellipse 80% 75% at 50% 48%, transparent 58%, rgba(0,0,0,.42) 100%); }
.hk-train .hk-fade { position:absolute; inset:0; pointer-events:none; background:#000; opacity:1; transition:opacity 1.6s ease; }
.hk-train .hk-fade.white { background:#f6f2ff; }
.hk-train .hk-fade.off { opacity:0; }

/* tooltip that follows the pointer over things you can touch */
.hk-train .hk-tip { position:absolute; left:0; top:0; pointer-events:none; padding:5px 10px 6px; border-radius:6px;
  background:rgba(12,11,15,.72); border:1px solid rgba(255,255,255,.12); font:500 12px/1.3 'Zen Kaku Gothic New',sans-serif; letter-spacing:.06em;
  color:#f3ecdc; opacity:0; transition:opacity .2s; white-space:nowrap; -webkit-backdrop-filter:blur(8px); backdrop-filter:blur(8px); }
.hk-train .hk-tip.on { opacity:1; }
.hk-train .hk-tip small { display:block; font-size:10px; color:rgba(243,236,220,.55); letter-spacing:.04em; }

/* the announcement, as the car's LED would print it */
.hk-train .hk-cap { position:absolute; left:50%; bottom:calc(max(22px, env(safe-area-inset-bottom)) + 4px); transform:translateX(-50%); max-width:min(78vw, 760px);
  pointer-events:auto; text-align:center; font-family:'DotGothic16',monospace; font-size:clamp(15px,1.5vw,19px); letter-spacing:.12em; line-height:1.55;
  color:#ffb43a; text-shadow:0 0 10px rgba(255,140,30,.55), 0 0 2px rgba(255,170,60,.9); padding:8px 18px 9px; border-radius:6px;
  background:rgba(10,6,4,.62); border:1px solid rgba(255,160,60,.18); opacity:0; transition:opacity .5s ease; }
.hk-train .hk-cap.on { opacity:1; }
.hk-train .hk-cap .en-main { font:500 clamp(15px,1.45vw,18px)/1.5 'Zen Kaku Gothic New',sans-serif; letter-spacing:.03em; color:#ffc46a; }
.hk-train .hk-cap .en { display:block; margin-top:2px; font:italic 400 13px 'EB Garamond',serif; letter-spacing:.03em; color:rgba(255,215,160,.6); text-shadow:none; }

/* dock: route map, the request button, fast-forward */
.hk-train .hk-dock { position:absolute; right:max(16px, env(safe-area-inset-right)); bottom:calc(max(16px, env(safe-area-inset-bottom)) + 52px); display:flex; align-items:flex-end; gap:10px; }
.hk-train .hk-dock button { pointer-events:auto; cursor:pointer; border:0; font:inherit; color:inherit; }
.hk-train .hk-pill { height:40px; padding:0 14px; border-radius:999px; background:rgba(14,13,18,.6); border:1px solid rgba(255,255,255,.12) !important;
  -webkit-backdrop-filter:blur(10px); backdrop-filter:blur(10px); display:flex; align-items:center; gap:8px; font:500 13px 'Zen Kaku Gothic New',sans-serif; letter-spacing:.1em;
  transition:background .25s, transform .25s, opacity .3s; }
.hk-train .hk-pill:hover { background:rgba(32,30,38,.75); transform:translateY(-1px); }
.hk-train .hk-pill svg { width:16px; height:16px; }
.hk-train .hk-pill[disabled] { opacity:.35; pointer-events:none; }
.hk-train .hk-pill .k { font:400 10px 'IBM Plex Mono',monospace; color:rgba(243,236,220,.45); letter-spacing:0; }
.hk-train .hk-stop { position:relative; width:74px; height:92px; padding:0; border-radius:16px; background:linear-gradient(#f6cd3c,#e2ad1c) !important;
  box-shadow:0 2px 0 #a97b0c, 0 10px 24px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.6); transition:transform .12s; }
.hk-train .hk-stop:active { transform:translateY(2px); }
.hk-train .hk-stop .lamp { position:absolute; left:9px; right:9px; top:9px; height:26px; border-radius:6px; background:#2a0a08; color:#5a1e18;
  font:900 11px/26px 'Zen Kaku Gothic New',sans-serif; letter-spacing:0; text-align:center; white-space:nowrap; overflow:hidden; transition:color .2s, background .2s, box-shadow .2s; }
.hk-train .hk-stop.lit .lamp { background:#3a0c08; color:#ff5a3c; box-shadow:0 0 14px rgba(255,80,40,.7), inset 0 0 8px rgba(255,90,50,.5); text-shadow:0 0 6px #ff3a20; }
.hk-train .hk-stop .dome { position:absolute; left:50%; top:44px; width:40px; height:40px; margin-left:-20px; border-radius:50%;
  background:radial-gradient(circle at 38% 32%, #a07ad8, #6b3fa3 45%, #3d1f66 100%); box-shadow:0 3px 0 #2a1248, 0 0 0 4px #d5a520; transition:transform .1s, box-shadow .1s; }
.hk-train .hk-stop:active .dome { transform:translateY(2px); box-shadow:0 1px 0 #2a1248, 0 0 0 4px #d5a520; }
.hk-train .hk-stop.pulse .dome { animation: hk-pulse 1.6s ease-in-out infinite; }
@keyframes hk-pulse { 0%,100% { box-shadow:0 3px 0 #2a1248, 0 0 0 4px #d5a520, 0 0 0 0 rgba(160,120,230,.0) } 50% { box-shadow:0 3px 0 #2a1248, 0 0 0 4px #d5a520, 0 0 0 10px rgba(160,120,230,.35) } }
.hk-train .hk-dest { position:absolute; right:0; bottom:100px; text-align:right; pointer-events:none; white-space:nowrap; }
.hk-train .hk-dest .l1 { font:500 11px 'Zen Kaku Gothic New',sans-serif; letter-spacing:.22em; color:rgba(243,236,220,.55); }
.hk-train .hk-dest .l2 { font:600 22px 'Noto Serif JP',serif; letter-spacing:.18em; text-shadow:0 2px 12px rgba(0,0,0,.7); }
.hk-train .hk-dest .l3 { font:italic 400 13px 'EB Garamond',serif; color:rgba(243,236,220,.6); }

.hk-train .hk-hint { position:absolute; left:50%; top:max(18px, env(safe-area-inset-top)); transform:translateX(-50%); pointer-events:none; text-align:center;
  font:500 12px 'Zen Kaku Gothic New',sans-serif; letter-spacing:.18em; color:rgba(243,236,220,.75); text-shadow:0 1px 8px rgba(0,0,0,.8);
  opacity:0; transition:opacity 1.2s ease; }
.hk-train .hk-hint.on { opacity:1; }
.hk-train .hk-hint i { font-style:normal; color:rgba(243,236,220,.45); letter-spacing:.06em; display:block; margin-top:3px; font-family:'EB Garamond',serif; font-size:13px; font-style:italic; }

/* overlays */
.hk-train .hk-modal { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; padding:5vh 5vw; background:rgba(4,4,7,.72);
  -webkit-backdrop-filter:blur(6px); backdrop-filter:blur(6px); opacity:0; pointer-events:none; transition:opacity .35s ease; cursor:zoom-out; }
.hk-train .hk-modal.on { opacity:1; pointer-events:auto; }
.hk-train .hk-modal .frame { position:relative; transform:translateY(10px) rotate(-.4deg); transition:transform .5s cubic-bezier(.2,.8,.2,1); cursor:default; }
.hk-train .hk-modal.on .frame { transform:none; }
.hk-train .hk-modal .ad { display:block; width:min(88vw, 132vh); height:auto; border-radius:2px; box-shadow:0 30px 80px rgba(0,0,0,.6), 0 2px 0 rgba(0,0,0,.4); }
.hk-train .hk-modal .cap { margin-top:14px; display:flex; justify-content:space-between; gap:20px; font:500 12px 'Zen Kaku Gothic New',sans-serif; letter-spacing:.14em; color:rgba(243,236,220,.62); }
.hk-train .hk-modal .cap b { color:#f3ecdc; font-weight:700; }
.hk-train .hk-modal .nav { display:flex; gap:8px; }
.hk-train .hk-modal .nav button { pointer-events:auto; cursor:pointer; background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.14); color:#f3ecdc; border-radius:999px; width:34px; height:34px; font-size:14px; }
.hk-train .hk-modal .nav button:hover { background:rgba(255,255,255,.16); }

.hk-train .hk-map { display:block; width:min(94vw, 1400px); height:auto; border-radius:3px; box-shadow:0 24px 70px rgba(0,0,0,.6); }
.hk-train .hk-mapwrap { position:relative; }
.hk-train .hk-mapwrap button.st { position:absolute; transform:translate(-50%,-50%); width:11%; height:70%; top:56%; background:transparent; border:0; cursor:pointer; border-radius:12px; }
.hk-train .hk-mapwrap button.st:hover, .hk-train .hk-mapwrap button.st:focus-visible { background:rgba(230,162,60,.14); outline:none; }

/* the paperback */
.hk-train .hk-book { position:relative; display:flex; flex-direction:row-reverse; width:min(92vw, 860px); aspect-ratio: 1.42; border-radius:4px;
  background:linear-gradient(90deg, #efe6d2 0%, #f6efdf 47%, #d9cfb8 50%, #f6efdf 53%, #efe6d2 100%); box-shadow:0 30px 80px rgba(0,0,0,.6), inset 0 0 40px rgba(120,90,40,.15); }
.hk-train .hk-page { flex:1; position:relative; padding:7% 6% 9%; }
.hk-train .hk-page .txt { writing-mode:vertical-rl; height:100%; font-family:'Noto Serif JP',serif; font-size:clamp(13px,1.75vw,17.5px); line-height:2.0; letter-spacing:.08em; color:#2a241c; text-align:justify; overflow:hidden; }
.hk-train .hk-page .txt p { margin:0 0 0 .2em; text-indent:1em; }
.hk-train .hk-page .head { position:absolute; top:3.2%; font:500 10px 'Noto Serif JP',serif; letter-spacing:.3em; color:#8a7d66; }
.hk-train .hk-page .no { position:absolute; bottom:3.5%; font:500 10px 'Noto Serif JP',serif; color:#8a7d66; }
.hk-train .hk-page.r .head { right:6%; } .hk-train .hk-page.l .head { left:6%; }
.hk-train .hk-page.r .no { right:7%; } .hk-train .hk-page.l .no { left:7%; }
.hk-train .pencil { background:linear-gradient(90deg, transparent 0 0) ; border-right:1.5px solid rgba(70,62,52,.55); padding-right:2px; }
.hk-train .hk-receipt { position:absolute; top:-10%; left:30%; width:13%; padding:10px 8px 14px; background:#fbfaf6; box-shadow:0 4px 14px rgba(0,0,0,.25);
  font:400 9px/1.6 'IBM Plex Mono',monospace; color:#3a3a3a; transform:rotate(3deg); text-align:center; }
.hk-train .hk-receipt b { display:block; font:700 10px 'Zen Kaku Gothic New',sans-serif; letter-spacing:.1em; margin-bottom:4px; }
.hk-train .hk-booknote { margin-top:14px; text-align:center; font:italic 400 14px 'EB Garamond',serif; color:rgba(243,236,220,.55); }

.hk-train .hk-book.en { flex-direction:row; }
.hk-train .hk-book.en .txt { writing-mode:horizontal-tb; font-family:'EB Garamond',serif; font-size:clamp(14px,1.75vw,19px); line-height:1.7; letter-spacing:.01em; text-align:left; }
.hk-train .hk-book.en .txt p { margin:0 0 .9em; text-indent:1.2em; }
.hk-train .hk-book.en .pencil { border-right:0; padding:0; text-decoration:underline; text-decoration-color:rgba(70,62,52,.55); text-decoration-thickness:1.5px; text-underline-offset:4px; }
.hk-train .hk-book.en .head, .hk-train .hk-book.en .no { font-family:'EB Garamond',serif; font-style:italic; letter-spacing:.06em; font-size:11px; }
.hk-train .hk-book.en .hk-page.r .head { right:auto; left:6%; } .hk-train .hk-book.en .hk-page.l .head { left:auto; right:6%; }
.hk-train .hk-book.en .hk-page.r .no { right:auto; left:7%; } .hk-train .hk-book.en .hk-page.l .no { left:auto; right:7%; }

/* 整理券, a keepsake */
.hk-train .hk-slip { position:absolute; left:max(16px, env(safe-area-inset-left)); bottom:max(16px, env(safe-area-inset-bottom)); width:118px; padding:12px 10px 14px;
  background:#f7f4ea; color:#2b2a28; border-radius:3px; box-shadow:0 10px 30px rgba(0,0,0,.45); font-family:'DotGothic16',monospace; text-align:center;
  transform:translateY(calc(100% + 60px)) rotate(-3deg); opacity:0; transition:transform .7s cubic-bezier(.2,.9,.2,1), opacity .4s; pointer-events:auto; cursor:pointer;
  -webkit-mask: radial-gradient(circle 4px at 0 50%, transparent 98%, #000) , radial-gradient(circle 4px at 100% 50%, transparent 98%, #000); mask-composite:intersect; -webkit-mask-composite: source-in; }
.hk-train .hk-slip.on { transform:translateY(0) rotate(-3deg); opacity:1; }
.hk-train .hk-slip .t { font-size:11px; letter-spacing:.2em; }
.hk-train .hk-slip .n { font-size:46px; line-height:1.1; margin:4px 0; }
.hk-train .hk-slip .s { font-size:12px; letter-spacing:.1em; }
.hk-train .hk-slip .d { margin-top:6px; font-size:9px; color:#8a857a; letter-spacing:.06em; }

.hk-train .hk-fallback { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:20px; background:linear-gradient(#1b2a2a, #07070a); }

@media (max-width: 1180px) { .hk-train .hk-cap { bottom:172px; } }
@media (max-width: 640px) {
  .hk-train .hk-pill .lbl { display:none; }
  .hk-train .hk-pill { height:44px; padding:0 13px; }
  .hk-train .hk-cap { bottom:178px; max-width:92vw; font-size:14px; }
  .hk-train .hk-dest { bottom:104px; }
  .hk-train .hk-dest .l2 { font-size:19px; }
  .hk-train .hk-book { aspect-ratio: .72; flex-direction:column; }
  .hk-train .hk-page .txt { font-size:13px; }
  .hk-train .hk-receipt { display:none; }
}
@media (prefers-reduced-motion: reduce) { .hk-train .hk-grain { animation:none; } }
@media (max-width: 640px) { .hk-train .hk-book.en { flex-direction:column; aspect-ratio:.66; } }
`;
