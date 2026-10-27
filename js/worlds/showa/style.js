// Scoped styles for 銀座 一九八五.
export const CSS = `
.showa-root { position:absolute; inset:0; overflow:hidden; background:#060509; color:#efe6d2;
  font-family:"Zen Kaku Gothic New","Noto Serif JP",sans-serif; -webkit-tap-highlight-color:transparent; user-select:none; }
.showa-root button { font:inherit; color:inherit; cursor:pointer; }
.showa-root .sw-stage, .showa-root .sw-street, .showa-root .sw-shop { position:absolute; inset:0; }
.showa-root .sw-cv { position:absolute; inset:0; display:block; }
.showa-root i { font-family:"EB Garamond",serif; font-style:italic; }
.showa-root .en { display:none; }
/* English mode (global ctx.lang): English becomes the text; Japanese stays only as scenery */
.showa-root.sw-en-mode .jp { display:none !important; }
.showa-root.sw-en-mode .en { display:inline; }
.showa-root.sw-en-mode .sw-hot-tag b { display:none; }
.showa-root.sw-en-mode .sw-hot-tag i { font-family:"Zen Kaku Gothic New",sans-serif; font-style:normal; font-size:13px; opacity:1; color:#ffe2b0; letter-spacing:.03em; }
.showa-root.sw-en-mode .sw-cap .en { display:block; font-size:clamp(18px,2.2vw,26px); opacity:1; line-height:1.45; text-shadow:0 0 14px rgba(0,0,0,.9),0 0 2px #000; }
.showa-root.sw-en-mode .sw-cap .l0 .en { color:#f1dc8a; font-size:clamp(15px,1.7vw,19px); letter-spacing:.06em; }
.showa-root.sw-en-mode .sw-telop .en { display:block; font-family:"Zen Kaku Gothic New",sans-serif; font-style:normal; font-weight:700; font-size:clamp(15px,1.9vw,21px); opacity:1; color:#fff; }
.showa-root.sw-en-mode .sw-note .en { display:block; font-family:"EB Garamond",serif; font-style:normal; font-size:17px; opacity:1; margin:0; }
.showa-root.sw-en-mode .sw-ph-msg .en { display:block; font-family:"EB Garamond",serif; font-size:20px; opacity:1; font-style:normal; }
.showa-root.sw-en-mode .sw-ph-hint .en { display:block; font-size:14px; opacity:.85; }
.showa-root.sw-en-mode .sw-wall-card .en { display:block; font-family:"EB Garamond",serif; font-style:italic; font-weight:400; font-size:18px; line-height:1.55; }
.showa-root.sw-en-mode .sw-wall-card .sig .en { font-size:13px; font-style:normal; text-align:right; opacity:.6; }
.showa-root.sw-en-mode .sw-wall-head .en.t { font:400 clamp(22px,3vw,30px) "Mochiy Pop One",sans-serif; color:#ffe2b0; }
.showa-root.sw-en-mode .sw-pop p .en { display:block; font-family:"M PLUS Rounded 1c",sans-serif; font-weight:700; font-size:15px; line-height:1.6; }
.showa-root.sw-en-mode .sw-insp-obi { display:block; margin-top:10px; font-family:"EB Garamond",serif; font-style:italic; font-size:17px; opacity:.85; }
.showa-root.sw-en-mode .sw-insp-cond { display:block; margin-top:4px; font-size:12px; opacity:.6; }
.showa-root.sw-en-mode .sw-dig-info .sub { font-size:15px; opacity:.75; }
.showa-root.sw-en-mode .sw-np-t .en, .showa-root.sw-en-mode .sw-np-lab .en { display:inline; }
.showa-root.sw-en-mode .sw-shot-exit::after { content:'← Outside'; }
.showa-root.sw-en-mode .sw-ph-ret .en { display:inline; }

/* hotspots */
.showa-root .sw-street-ui { position:absolute; inset:0; transition:opacity .5s; }
.showa-root .sw-hot { position:absolute; left:0; top:0; background:none; border:0; padding:0; border-radius:4px; outline-offset:3px; }
.showa-root .sw-hot-tag, .showa-root .sw-shot .sw-hot-tag { position:absolute; left:50%; bottom:calc(100% + 8px); transform:translate(-50%,4px); white-space:nowrap;
  background:rgba(10,8,12,.78); border:1px solid rgba(255,214,150,.35); padding:5px 10px 6px; border-radius:3px; font-size:13px; line-height:1.25;
  opacity:0; transition:opacity .25s, transform .25s; pointer-events:none; text-align:center; backdrop-filter:blur(3px); }
.showa-root .sw-hot-tag b { display:block; font-weight:700; letter-spacing:.06em; color:#ffe2b0; }
.showa-root .sw-hot-tag i { font-size:12px; opacity:.6; }
.showa-root .sw-hot:hover .sw-hot-tag, .showa-root .sw-hot:focus-visible .sw-hot-tag,
.showa-root .sw-street-ui.intro .sw-hot-tag, .showa-root .sw-street-ui.touch .sw-hot-tag,
.showa-root .sw-shot:hover .sw-hot-tag, .showa-root .sw-shot:focus-visible .sw-hot-tag { opacity:1; transform:translate(-50%,0); }
.showa-root .sw-street-ui.touch .sw-hot-tag { opacity:.75; }
.showa-root .sw-hot:hover { box-shadow:0 0 0 1px rgba(255,226,176,.35); }
.showa-root .sw-back { position:absolute; left:16px; top:16px; padding:8px 14px; border-radius:3px; background:rgba(10,8,12,.7); border:1px solid rgba(255,214,150,.3);
  opacity:0; pointer-events:none; transition:opacity .4s; font-size:14px; }
.showa-root .sw-back.on { opacity:1; pointer-events:auto; }
.showa-root .sw-back i { opacity:.55; font-size:13px; margin-left:4px; }

.showa-root .sw-hot.al .sw-hot-tag { left:0; transform:translate(0,4px) !important; }
.showa-root .sw-hot.ar .sw-hot-tag { left:auto; right:0; transform:translate(0,4px) !important; }
.showa-root .sw-street-ui.touch .sw-hot.al .sw-hot-tag, .showa-root .sw-street-ui.touch .sw-hot.ar .sw-hot-tag, .showa-root .sw-street-ui.intro .sw-hot.al .sw-hot-tag, .showa-root .sw-street-ui.intro .sw-hot.ar .sw-hot-tag,
.showa-root .sw-hot.al:hover .sw-hot-tag, .showa-root .sw-hot.ar:hover .sw-hot-tag { transform:none !important; }
/* WKW interior titles */
.showa-root .sw-cap { position:absolute; left:max(16px,6vw); bottom:max(70px,11vh); max-width:min(640px, calc(100% - 32px)); pointer-events:none; opacity:0; z-index:5; }
.showa-root .sw-cap.on { opacity:1; }
.showa-root .sw-cap .l { opacity:0; margin-top:10px; }
.showa-root .sw-cap.on .l0 { animation:swStep 1.6s steps(6,end) forwards; }
.showa-root .sw-cap.on .l1 { animation:swStep 1.6s steps(6,end) 1.8s forwards; }
.showa-root .sw-cap .jp { display:block; font-family:"Shippori Mincho B1","Noto Serif JP",serif; font-weight:800; font-size:clamp(17px,2.1vw,25px); line-height:1.6; letter-spacing:.06em;
  color:#f6efdc; text-shadow:0 0 14px rgba(0,0,0,.9), 0 0 2px rgba(0,0,0,.9); pointer-events:auto; }
.showa-root .sw-cap .l0 .jp { color:#f1dc8a; font-size:clamp(14px,1.6vw,18px); letter-spacing:.14em; }
.showa-root .sw-cap .en { font-family:"EB Garamond",serif; font-style:italic; font-size:15px; opacity:.6; text-shadow:0 0 8px #000; }
@keyframes swStep { 0%{opacity:0; filter:blur(3px); transform:translateX(-6px)} 100%{opacity:1; filter:none; transform:none} }

/* the MC's telop under the street screen */
.showa-root .sw-telop { position:absolute; left:50%; bottom:max(18px,3vh); transform:translateX(-50%); width:min(860px, calc(100% - 32px)); z-index:5;
  background:linear-gradient(180deg, rgba(14,10,40,.92), rgba(30,10,40,.92)); border:2px solid #ffd34d; border-radius:6px; padding:10px 16px 12px 16px;
  opacity:0; transition:opacity .25s; pointer-events:none; }
.showa-root .sw-telop.on { opacity:1; pointer-events:auto; animation:swPop .25s ease-out; }
.showa-root .sw-telop .who { position:absolute; left:14px; top:-13px; background:#d4243e; color:#fff; font-weight:700; font-size:12px; padding:2px 8px; border-radius:2px; letter-spacing:.1em; }
.showa-root .sw-telop .jp { display:block; font-size:clamp(15px,1.9vw,21px); font-weight:700; line-height:1.55; color:#fff; }
.showa-root .sw-telop .en { font-family:"EB Garamond",serif; font-style:italic; font-size:14px; opacity:.6; }
@keyframes swPop { from{transform:translateX(-50%) translateY(6px)} to{transform:translateX(-50%)} }

.showa-root .sw-en { position:absolute; right:66px; bottom:22px; z-index:8; width:34px; height:24px; border-radius:3px; font:500 11px "IBM Plex Mono",monospace;
  background:rgba(10,8,12,.5); border:1px solid rgba(255,255,255,.18); opacity:.45; }
.showa-root .sw-en.on { opacity:.9; border-color:rgba(255,214,150,.6); }

/* phone */
.showa-root .sw-phone { position:absolute; inset:0; z-index:7; display:flex; align-items:center; justify-content:center; gap:clamp(16px,4vw,48px); padding:16px;
  background:radial-gradient(ellipse at 40% 45%, rgba(40,70,60,.55), rgba(4,6,6,.94) 70%); opacity:0; pointer-events:none; transition:opacity .4s; flex-wrap:wrap; }
.showa-root .sw-phone.on { opacity:1; pointer-events:auto; }
.showa-root .sw-ph-body { position:relative; width:200px; height:300px; border-radius:16px; background:linear-gradient(160deg,#3a9a62,#24683f); box-shadow:inset 0 2px 0 rgba(255,255,255,.25), 0 20px 40px rgba(0,0,0,.6); }
.showa-root .sw-ph-hand { position:absolute; left:-6px; right:-6px; top:-22px; height:52px; border:0; background:none; padding:0; transition:transform .35s cubic-bezier(.3,.7,.2,1); }
.showa-root .sw-ph-hand span { display:block; height:100%; border-radius:26px 26px 14px 14px; background:linear-gradient(180deg,#2f8a52,#1d5a35); box-shadow:0 6px 12px rgba(0,0,0,.45); }
.showa-root .sw-phone.lifted .sw-ph-hand { transform:translate(-120px,-40px) rotate(-28deg); }
.showa-root .sw-ph-face { position:absolute; inset:46px 14px 14px; }
.showa-root .sw-ph-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
.showa-root .sw-ph-slot { width:46px; height:6px; border-radius:3px; background:#0d2618; box-shadow:inset 0 1px 2px #000; }
.showa-root .sw-ph-lcd { font:400 22px "VT323",monospace; background:#9fb88f; color:#1d2a18; padding:0 8px; border-radius:2px; min-width:44px; text-align:right; }
.showa-root .sw-ph-keys { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
.showa-root .sw-ph-key { height:34px; border-radius:5px; border:0; background:linear-gradient(180deg,#f2f0e8,#cfcbbd); color:#1a1a1a; font:500 16px "IBM Plex Mono",monospace; box-shadow:0 2px 0 #7a776c; }
.showa-root .sw-ph-key:active { transform:translateY(2px); box-shadow:none; }
.showa-root .sw-ph-ret { margin-top:12px; font-size:11px; text-align:center; color:#d8efe0; opacity:.7; }
.showa-root .sw-ph-coins { position:absolute; right:-58px; bottom:12px; width:44px; height:70px; border:0; background:none; }
.showa-root .sw-ph-coins i { display:block; height:7px; margin-top:-1px; border-radius:50%; background:linear-gradient(180deg,#d39a5a,#8a5a2a); box-shadow:0 1px 0 #5a3a1a; }
.showa-root .sw-phone.paid .sw-ph-coins i:first-child { visibility:hidden; }
.showa-root .sw-ph-side { width:min(380px, 100%); }
.showa-root .sw-ph-dial { font:400 34px "VT323",monospace; letter-spacing:.2em; color:#cfe8d6; min-height:40px; }
.showa-root .sw-ph-msg { min-height:84px; font-family:"Noto Serif JP",serif; font-size:18px; line-height:1.7; color:#f3ecdc; }
.showa-root .sw-ph-msg i, .showa-root .sw-ph-hint i { display:none; font-size:14px; opacity:.55; }
.showa-root .sw-ph-hint { font-size:14px; opacity:.8; margin:10px 0 18px; }
.showa-root .sw-ph-close { padding:8px 14px; background:rgba(10,8,12,.6); border:1px solid rgba(255,255,255,.25); border-radius:3px; }
.showa-root .sw-ph-close i { opacity:.55; margin-left:4px; }

/* shop */
.showa-root .sw-shop-hot { position:absolute; inset:0; }
.showa-root .sw-shot { position:absolute; background:none; border:0; padding:0; border-radius:4px; }
.showa-root .sw-shot:hover { box-shadow:0 0 0 1px rgba(255,226,176,.4), 0 0 24px rgba(255,200,120,.12); }
.showa-root .sw-shot-item:hover { box-shadow:0 0 0 1px rgba(255,226,176,.25); }
.showa-root .sw-shot-exit { background:rgba(10,8,12,.55); border:1px solid rgba(255,214,150,.3); }
.showa-root .sw-shot-exit::after { content:'← 外へ'; font-size:14px; }
.showa-root .sw-note { position:absolute; transform:translate(-50%,-100%); width:min(320px, calc(100vw - 32px)); background:#f7f1e2; color:#2a2014;
  padding:12px 14px; border-radius:2px; box-shadow:0 10px 30px rgba(0,0,0,.5); font-family:"Noto Serif JP",serif; font-size:15px; line-height:1.7;
  opacity:0; pointer-events:none; transition:opacity .3s; z-index:4; rotate:-1deg; }
.showa-root .sw-note.on { opacity:1; pointer-events:auto; }
.showa-root .sw-note .en { font-family:"EB Garamond",serif; font-style:italic; font-size:14px; opacity:.6; margin-top:4px; }
.showa-root .sw-np { position:absolute; width:260px; background:rgba(12,9,8,.82); border:1px solid rgba(255,190,120,.35); border-radius:3px; padding:8px 12px 10px;
  opacity:0; pointer-events:none; transition:opacity .4s; z-index:3; font-size:13px; }
.showa-root .sw-np.on { opacity:1; pointer-events:auto; }
.showa-root .sw-np-lab { color:#ff8a5a; font-size:11px; letter-spacing:.15em; }
.showa-root .sw-np-t { margin:2px 0 8px; font-weight:700; line-height:1.4; }
.showa-root .sw-np-btns { display:flex; gap:6px; }
.showa-root .sw-np-btns button { flex:1; padding:5px 6px; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.2); border-radius:2px; font-size:12px; }

/* overlays */
.showa-root .sw-ov { position:absolute; inset:0; z-index:6; background:rgba(5,4,6,.82); backdrop-filter:blur(4px); opacity:0; pointer-events:none; transition:opacity .35s; overflow:auto; }
.showa-root .sw-ov.on { opacity:1; pointer-events:auto; }
.showa-root .sw-x { position:absolute; left:16px; top:16px; z-index:3; padding:8px 14px; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.22); border-radius:3px; font-size:14px; }
.showa-root .sw-x i { opacity:.55; margin-left:4px; }

.showa-root .sw-dig { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:56px 16px 16px; }
.showa-root .sw-dig-head { font-size:14px; letter-spacing:.08em; color:#ffe2b0; margin-bottom:40px; position:relative; z-index:2; text-align:center; }
.showa-root .sw-crate { --S:min(46vh, 72vw, 400px); position:relative; width:calc(var(--S) * 1.25); height:calc(var(--S) * 1.32); perspective:1100px; perspective-origin:50% 10%; touch-action:none; cursor:grab; }
.showa-root .sw-stack { position:absolute; inset:0; transform-style:preserve-3d; transition:transform .3s ease-out; }
.showa-root .sw-card { position:absolute; left:calc(50% - var(--S)/2); top:calc(var(--S) * 0.1); width:var(--S); height:var(--S); transform-origin:50% 100%;
  transition:transform .42s cubic-bezier(.2,.8,.2,1), opacity .3s, filter .3s; box-shadow:0 -2px 0 rgba(255,255,255,.06), 0 12px 30px rgba(0,0,0,.55); background:#111; }
.showa-root .sw-card canvas { width:100%; height:100%; display:block; }
.showa-root .sw-card.cur { box-shadow:0 0 0 1px rgba(255,230,190,.25), 0 18px 40px rgba(0,0,0,.6); }
.showa-root .sw-card.pulled { transform:translate3d(0,-60%,40px) rotateX(0) !important; opacity:0 !important; transition:transform .35s ease-in, opacity .35s ease-in; }
.showa-root .sw-card.divider { background:#efe6d0; height:calc(var(--S) * 0.86); top:calc(var(--S) * 0.24); color:#2a1a10; }
.showa-root .sw-div-tab { position:absolute; top:-30px; left:12%; background:#efe6d0; padding:4px 14px; font-weight:700; font-size:17px; border-radius:4px 4px 0 0; }
.showa-root .sw-div-en { position:absolute; left:12%; top:14px; font-family:"EB Garamond",serif; font-style:italic; opacity:.6; }
.showa-root .sw-card-pop { position:absolute; right:-6px; top:-34px; max-width:70%; background:#fffbe8; color:var(--pc); padding:5px 10px; border-radius:2px; font:400 13px "Mochiy Pop One",sans-serif;
  rotate:3deg; box-shadow:0 3px 8px rgba(0,0,0,.4); border-top:3px solid var(--pc); }
.showa-root .sw-card-price { position:absolute; left:8px; bottom:8px; background:#ffe14a; color:#1a1a1a; font:500 12px "IBM Plex Mono",monospace; padding:2px 6px; border-radius:2px; opacity:0; transition:opacity .3s; }
.showa-root .sw-card.cur .sw-card-price { opacity:1; }
.showa-root .sw-crate-front { position:absolute; left:0; right:0; bottom:0; height:27%; transform:translateZ(46px); border-radius:2px;
  background:repeating-linear-gradient(180deg,#8a5a32 0 30%,#6a4222 30% 33%), #7a4c28; box-shadow:0 -8px 20px rgba(0,0,0,.45), inset 0 2px 0 rgba(255,220,170,.2);
  display:flex; align-items:center; justify-content:center; pointer-events:none; }
.showa-root .sw-crate-front span { background:#f3ead6; color:#2a1a10; font:400 clamp(13px,2vw,18px) "Mochiy Pop One",sans-serif; padding:6px 16px; border-radius:2px; }
.showa-root .sw-dig-info { margin-top:34px; min-height:48px; text-align:center; font-size:clamp(15px,2vw,19px); line-height:1.5; }
.showa-root .sw-dig-info .a { font-weight:700; color:#ffe2b0; } .showa-root .sw-dig-info .y { opacity:.6; font-family:"IBM Plex Mono",monospace; font-size:.8em; }
.showa-root .sw-dig-info .sub { display:block; font-size:14px; opacity:.5; font-family:"EB Garamond",serif; font-style:italic; }
.showa-root .sw-dig-help { margin-top:6px; font-size:12px; opacity:.55; text-align:center; } .showa-root .sw-dig-help i { display:block; }

.showa-root .sw-insp { min-height:100%; display:flex; align-items:center; justify-content:center; gap:clamp(20px,4vw,56px); padding:64px 16px 96px; flex-wrap:wrap; }
.showa-root .sw-sleeve-wrap { perspective:1400px; }
.showa-root .sw-sleeve { --S:min(62vh, 86vw, 520px); --rx:0deg; --ry:0deg; position:relative; width:var(--S); height:var(--S); transform-style:preserve-3d;
  transform:rotateX(var(--rx)) rotateY(var(--ry)); transition:transform .5s cubic-bezier(.2,.8,.2,1); cursor:pointer; }
.showa-root .sw-sleeve.flipped { transform:rotateX(var(--rx)) rotateY(calc(180deg + var(--ry))); }
.showa-root .sw-face { position:absolute; inset:0; backface-visibility:hidden; box-shadow:0 30px 60px rgba(0,0,0,.6); }
.showa-root .sw-face canvas { width:100%; height:100%; display:block; }
.showa-root .sw-face.back { transform:rotateY(180deg); }
.showa-root .sw-obi { position:absolute; left:0; top:0; bottom:0; width:13.5%; background:var(--obi); color:var(--obi-ink); transform:translateZ(1px); backface-visibility:hidden;
  writing-mode:vertical-rl; display:flex; flex-direction:column; align-items:center; justify-content:space-between; padding:3% 0; box-shadow:2px 0 6px rgba(0,0,0,.25); overflow:hidden; }
.showa-root .sw-obi::before { content:''; position:absolute; inset:0; background:linear-gradient(90deg, rgba(0,0,0,.06), rgba(255,255,255,0) 30%, rgba(0,0,0,.08)); pointer-events:none; }
.showa-root .sw-obi-copy { font-family:"Noto Serif JP",serif; font-size:calc(var(--S) * 0.026); line-height:1.5; max-height:46%; overflow:hidden; }
.showa-root .sw-obi-title { font-family:"Shippori Mincho B1",serif; font-weight:800; font-size:calc(var(--S) * 0.045); letter-spacing:.06em; max-height:30%; overflow:hidden; }
.showa-root .sw-obi-artist { font-weight:700; font-size:calc(var(--S) * 0.03); }
.showa-root .sw-obi-price { font:500 calc(var(--S) * 0.022) "IBM Plex Mono",monospace; text-combine-upright:none; }
.showa-root .sw-obi-price span { display:block; opacity:.7; margin-top:6px; font-size:.85em; }
.showa-root .sw-sticker { position:absolute; left:16%; top:3%; transform:translateZ(2px) rotate(2deg); backface-visibility:hidden; background:#fff6c8; color:#3a1a10; border:1px solid #e0c060;
  padding:5px 9px; font-size:calc(var(--S) * 0.022); line-height:1.35; text-align:center; box-shadow:0 2px 4px rgba(0,0,0,.25); }
.showa-root .sw-sticker b { display:block; font-family:"Shippori Mincho B1",serif; font-size:1.1em; }
.showa-root .sw-sticker em { display:block; font:500 1.7em "IBM Plex Mono",monospace; color:#b0141e; font-style:normal; }
.showa-root .sw-sticker small { display:block; font-size:.85em; opacity:.8; }
.showa-root .sw-promo { position:absolute; right:5%; bottom:7%; transform:translateZ(2px) rotate(-8deg); backface-visibility:hidden; border:3px double #b0141e; color:#b0141e;
  padding:4px 10px; font-weight:700; font-size:calc(var(--S) * 0.03); text-align:center; line-height:1.3; background:rgba(255,255,255,.4); }
.showa-root .sw-hold { position:absolute; left:16%; bottom:5%; transform:translateZ(2px) rotate(-3deg); backface-visibility:hidden; background:#fff; color:#1a2a6a; padding:5px 10px;
  font:400 calc(var(--S) * 0.026) "M PLUS Rounded 1c",sans-serif; box-shadow:0 2px 6px rgba(0,0,0,.3); line-height:1.4; text-align:center; }
.showa-root .sw-sheen { position:absolute; inset:0; transform:translateZ(3px); pointer-events:none; mix-blend-mode:screen; backface-visibility:hidden; }
.showa-root .sw-insp-side { width:min(380px, 100%); }
.showa-root .sw-insp-artist { font-size:16px; color:#ffe2b0; } .showa-root .sw-insp-artist i { margin-left:8px; opacity:.55; font-size:15px; }
.showa-root .sw-insp-title { font-family:"Shippori Mincho B1",serif; font-weight:800; font-size:clamp(24px,3.2vw,34px); line-height:1.3; margin:4px 0 6px; }
.showa-root .sw-insp-meta { font-size:13px; opacity:.65; }
.showa-root .sw-pop { position:relative; margin:18px 0 6px; background:#fffbe8; color:#2a2014; padding:12px 14px 16px; rotate:-1.2deg; box-shadow:0 8px 20px rgba(0,0,0,.4); border-top:5px solid var(--pc); }
.showa-root .sw-pop b { display:block; font:400 17px "Mochiy Pop One",sans-serif; color:var(--pc); margin-bottom:6px; line-height:1.4; }
.showa-root .sw-pop p { margin:0; font-family:"M PLUS Rounded 1c",sans-serif; font-weight:700; font-size:15px; line-height:1.75; }
.showa-root .sw-pop-sig { position:absolute; right:12px; bottom:4px; font-size:11px; opacity:.6; }
.showa-root .sw-pop::before { content:''; position:absolute; left:42%; top:-14px; width:56px; height:18px; background:rgba(240,230,200,.7); rotate:3deg; }
.showa-root .sw-insp-btns { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:18px; }
.showa-root .sw-insp-btns button { padding:9px 10px; text-align:left; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.2); border-radius:3px; font-size:14px; line-height:1.3; }
.showa-root .sw-insp-btns button i { display:block; font-size:12px; opacity:.5; }
.showa-root .sw-insp-btns button.main { background:rgba(255,170,90,.16); border-color:rgba(255,190,120,.6); }
.showa-root .sw-insp-btns button:hover { background:rgba(255,255,255,.1); }

.showa-root .sw-wall { min-height:100%; display:flex; flex-direction:column; align-items:center; padding:60px 16px 96px; }
.showa-root .sw-wall-head { display:flex; align-items:baseline; gap:16px; margin-bottom:16px; }
.showa-root .sw-wall-head span { font:400 clamp(22px,3vw,30px) "Mochiy Pop One",sans-serif; color:#ffe2b0; }
.showa-root .sw-wall-head em { font:500 16px "IBM Plex Mono",monospace; font-style:normal; opacity:.7; }
.showa-root .sw-wall-grid { display:grid; grid-template-columns:repeat(6, 1fr); gap:clamp(6px,1.2vw,14px); width:min(760px, 100%); padding:clamp(10px,2vw,22px);
  background:#5a4430; box-shadow:inset 0 0 0 4px #6b5238, 0 20px 50px rgba(0,0,0,.5); background-image:radial-gradient(rgba(30,18,8,.55) 1px, transparent 1.6px); background-size:9px 9px; }
.showa-root .sw-wcell { position:relative; aspect-ratio:1; border:1px dashed rgba(243,234,214,.32); background:rgba(0,0,0,.08); padding:0; border-radius:1px; }
.showa-root .sw-wcell.full { border:0; box-shadow:0 4px 10px rgba(0,0,0,.5); }
.showa-root .sw-wcell canvas { width:100%; height:100%; display:block; }
.showa-root .sw-wcell-n { font:400 clamp(10px,1.4vw,14px) "IBM Plex Mono",monospace; opacity:.35; }
.showa-root .sw-wcell-tag { position:absolute; left:4px; bottom:4px; background:#fff; color:#1a2a6a; font:400 10px "M PLUS Rounded 1c",sans-serif; padding:1px 4px; }
.showa-root .sw-wall-card { margin-top:20px; max-width:560px; background:#fffbe8; color:#2a2014; padding:14px 18px 18px; rotate:-.8deg; font-family:"M PLUS Rounded 1c",sans-serif; font-weight:700;
  font-size:16px; line-height:1.8; box-shadow:0 10px 24px rgba(0,0,0,.4); position:relative; }
.showa-root .sw-wall-card span { display:block; text-align:right; font-size:12px; opacity:.6; }
.showa-root .sw-wall-card i { display:none; font-weight:400; font-size:14px; opacity:.6; margin-top:6px; }

@media (max-width:640px) {
  .showa-root .sw-insp { padding-top:60px; }
  .showa-root .sw-insp-btns { grid-template-columns:1fr 1fr; }
  .showa-root .sw-cap { bottom:84px; }
}
@media (prefers-reduced-motion: reduce) {
  .showa-root .sw-card, .showa-root .sw-sleeve { transition-duration:.01s; }
}
`;
