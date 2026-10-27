// 夏ヶ原 — styles, all scoped under .st (injected into the world's root, removed on unmount).

export const STYLE = `
.st { position: absolute; inset: 0; overflow: hidden; background: #d9d9d3; color: #f3eee2; cursor: default;
  font-family: 'Zen Kaku Gothic New', 'Hiragino Sans', sans-serif; -webkit-user-select: none; user-select: none; touch-action: manipulation; }
.st.hot { cursor: pointer; }
.st canvas { position: absolute; left: 0; top: 0; width: 100%; height: 100%; display: block; }
.st .st-ov { pointer-events: none; }
.st .st-grain { position: absolute; inset: -80px; pointer-events: none; opacity: .2; background-image: var(--st-noise); background-size: 192px 192px;
  animation: st-grain 1.1s steps(6) infinite; z-index: 2; }
.st .st-vig { position: absolute; inset: 0; pointer-events: none; z-index: 3;
  background: radial-gradient(ellipse 85% 80% at 48% 46%, transparent 52%, rgba(18,16,14,.28) 100%); }
@keyframes st-grain { 0% { transform: translate(0,0) } 20% { transform: translate(-31px, 17px) } 40% { transform: translate(23px,-29px) } 60% { transform: translate(-13px,-7px) } 80% { transform: translate(37px, 21px) } 100% { transform: translate(-7px, 33px) } }

.st .st-veil { position: absolute; inset: 0; z-index: 40; background: #f7f5ef; pointer-events: none; opacity: 1; transition: opacity 3.6s cubic-bezier(.3,0,.25,1); }
.st .st-veil.off { opacity: 0; }
.st .st-veil i { position: absolute; inset: 0; opacity: .55; mix-blend-mode: multiply;
  background: repeating-linear-gradient(90deg, rgba(255,90,90,.55) 0 3px, rgba(90,255,120,.55) 3px 6px, rgba(90,130,255,.55) 6px 9px);
  transition: opacity 1.6s ease, transform 2.6s cubic-bezier(.2,.7,.2,1); transform: scale(4); }
.st .st-veil.off i, .st .st-veil.thin i { opacity: 0; transform: scale(1); }

/* hover tag */
.st .st-tag { position: absolute; left: 0; top: 0; z-index: 6; pointer-events: none; padding: 5px 11px 6px; border-radius: 999px;
  font: 500 13px/1 'Noto Serif JP', serif; letter-spacing: .16em; color: #f7f2e6; background: rgba(16,18,22,.5);
  -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); border: 1px solid rgba(255,255,255,.1);
  opacity: 0; transition: opacity .2s; white-space: nowrap; }
.st .st-tag.on { opacity: 1; }
.st .st-hint { position: absolute; left: 50%; bottom: max(70px, calc(env(safe-area-inset-bottom) + 62px)); transform: translateX(-50%); z-index: 6; pointer-events: none;
  font: 400 12px/1.4 'Zen Kaku Gothic New', sans-serif; letter-spacing: .24em; color: rgba(255,250,240,.8); text-shadow: 0 1px 6px rgba(0,0,0,.5);
  opacity: 0; transition: opacity 1.2s; text-align: center; }
.st .st-hint.on { opacity: 1; }
.st .st-hint small { display: block; font-family: 'EB Garamond', serif; font-style: italic; letter-spacing: .06em; font-size: 13px; opacity: .75; margin-top: 2px; }

/* wait-for-the-train button (later visits) */
.st .st-waitbtn { position: absolute; right: max(16px, env(safe-area-inset-right)); bottom: max(66px, calc(env(safe-area-inset-bottom) + 60px)); z-index: 8;
  display: none; align-items: center; gap: 10px; padding: 9px 16px 9px 12px; border-radius: 999px; cursor: pointer;
  background: rgba(14,13,18,.5); border: 1px solid rgba(255,255,255,.12); color: #f3ecdc; -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
  font: 600 14px/1 'Noto Serif JP', serif; letter-spacing: .14em; transition: background .25s, transform .25s; }
.st .st-waitbtn.on { display: flex; }
.st .st-waitbtn:hover { background: rgba(30,28,36,.72); transform: translateY(-1px); }
.st .st-waitbtn small { font: 400 11px/1 'Zen Kaku Gothic New'; letter-spacing: .14em; opacity: .6; text-transform: uppercase; }
.st .st-waitbtn b { width: 8px; height: 8px; border-radius: 50%; background: #ff6b4f; box-shadow: 0 0 8px 2px rgba(255,90,60,.5); animation: st-blink 1.2s steps(2) infinite; }
@keyframes st-blink { 50% { opacity: .2 } }

/* ── text window ── */
.st .st-vn { position: absolute; left: 50%; bottom: max(64px, calc(env(safe-area-inset-bottom) + 58px)); width: min(1060px, calc(100% - 32px)); z-index: 10;
  transform: translate(-50%, 14px); opacity: 0; pointer-events: none; transition: opacity .7s ease, transform .7s cubic-bezier(.2,.8,.2,1); }
.st .st-vn.on { opacity: 1; transform: translate(-50%, 0); pointer-events: auto; }
.st .st-vn.hidden { opacity: 0 !important; pointer-events: none !important; }
.st .st-vn-box { position: relative; min-height: clamp(104px, 16vh, 168px); padding: 24px 44px 30px; border-radius: 16px; cursor: pointer;
  background: linear-gradient(180deg, rgba(22,26,34,.5), rgba(14,16,22,.7));
  border: 1px solid rgba(255,255,255,.09); box-shadow: inset 0 1px 0 rgba(255,255,255,.07), 0 24px 60px rgba(0,0,0,.22);
  -webkit-backdrop-filter: blur(8px) saturate(1.1); backdrop-filter: blur(8px) saturate(1.1); transition: opacity .6s; }
.st .st-vn-box.dim { opacity: .25; }
.st .st-vn-box::before { content: ''; position: absolute; left: 22px; top: 31px; width: 3px; height: 22px; border-radius: 2px; background: linear-gradient(#ffe2a8, rgba(255,226,168,0)); opacity: .55; }
.st .st-vn-text { font-family: 'Noto Serif JP', serif; font-weight: 400; font-size: clamp(16px, calc(0.9vw + 8px), 22px); line-height: 1.95; letter-spacing: .07em;
  color: #f6f1e5; text-shadow: 0 1px 2px rgba(0,0,0,.55); -webkit-user-select: text; user-select: text; }
.st .st-vn-text .c { opacity: 0; transition: opacity .24s ease; }
.st .st-vn-text .c.on { opacity: 1; }
.st .st-vn-en { display: none; margin-top: 6px; font-family: 'EB Garamond', serif; font-style: italic; font-size: clamp(14px, calc(.4vw + 10px), 17px); line-height: 1.45; color: rgba(240,234,220,.6); }
.st .st-vn.en-on .st-vn-en { display: block; }
.st .st-vn-wait { position: absolute; right: 24px; bottom: 16px; width: 10px; height: 10px; border-radius: 50%; opacity: 0;
  background: radial-gradient(circle at 40% 35%, #fff, #ffecbf 45%, rgba(255,210,140,0) 72%); box-shadow: 0 0 12px 3px rgba(255,220,160,.45); }
.st .st-vn-wait.on { opacity: 1; animation: st-bob 1.8s ease-in-out infinite; }
@keyframes st-bob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-4px) } }
.st .st-vn-ctl { position: absolute; right: 14px; top: -30px; display: flex; gap: 5px; }
.st .st-vn-ctl button { background: rgba(14,16,22,.42); border: 1px solid rgba(255,255,255,.1); color: rgba(240,234,220,.62); cursor: pointer;
  font: 600 10px/1 'Zen Kaku Gothic New', sans-serif; letter-spacing: .2em; padding: 6px 9px 6px 11px; border-radius: 999px; -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px); transition: color .2s, border-color .2s; }
.st .st-vn-ctl button:hover { color: #fff; }
.st .st-vn-ctl button.on { color: #ffd98e; border-color: rgba(255,217,142,.45); }

.st .st-choices { position: absolute; inset: 0; z-index: 11; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding-bottom: 14vh; pointer-events: none; }
.st .st-choices.hidden { opacity: 0; }
.st .st-choice { pointer-events: auto; position: relative; width: min(560px, 88vw); padding: 14px 28px 15px; border: 0; cursor: pointer; color: #f3eee2;
  background: linear-gradient(90deg, rgba(14,16,22,0), rgba(14,16,22,.62) 16%, rgba(14,16,22,.62) 84%, rgba(14,16,22,0));
  font: 400 clamp(16px, calc(.6vw + 10px), 20px)/1.4 'Noto Serif JP', serif; letter-spacing: .16em;
  opacity: 0; transform: translateY(8px); transition: opacity .5s ease, transform .5s cubic-bezier(.2,.8,.2,1), background .25s, color .25s; }
.st .st-choices.on .st-choice { opacity: 1; transform: none; }
.st .st-choice::before { content: ''; position: absolute; left: 16%; top: 50%; width: 7px; height: 7px; margin-top: -4px; border-radius: 50%; opacity: 0; transition: opacity .25s;
  background: radial-gradient(circle at 40% 35%, #fff, #ffecbf 45%, rgba(255,210,140,0) 72%); box-shadow: 0 0 10px 3px rgba(255,220,160,.5); }
.st .st-choice:hover, .st .st-choice:focus-visible { color: #fff4d8; outline: none; background: linear-gradient(90deg, rgba(64,52,30,0), rgba(70,58,34,.72) 16%, rgba(70,58,34,.72) 84%, rgba(64,52,30,0)); }
.st .st-choice:hover::before, .st .st-choice:focus-visible::before { opacity: 1; }
.st .st-choice .jp, .st .st-choice .en { display: block; }
.st .st-choice .en { display: none; font: italic 13px/1.3 'EB Garamond', serif; letter-spacing: .04em; opacity: .62; margin-top: 2px; }
.st .st-choices.en-on .st-choice .en { display: block; }

.st .st-log { position: absolute; inset: 0; z-index: 25; display: flex; flex-direction: column; align-items: center; padding: max(6vh, 40px) 16px 40px;
  background: rgba(9,10,14,.86); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); opacity: 0; pointer-events: none; transition: opacity .35s; }
.st .st-log.on { opacity: 1; pointer-events: auto; }
.st .st-log-head { width: min(820px, 100%); display: flex; align-items: baseline; gap: 16px; padding-bottom: 14px; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,.1); cursor: pointer; }
.st .st-log-head span { font: 600 15px/1 'Noto Serif JP', serif; letter-spacing: .4em; color: #ffe2a8; }
.st .st-log-head small { font: italic 13px/1 'EB Garamond', serif; color: rgba(240,234,220,.45); }
.st .st-log-list { width: min(820px, 100%); flex: 1; overflow-y: auto; padding: 8px 4px 20vh; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.2) transparent; }
.st .st-log-item { padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,.05); }
.st .st-log-item .jp { font: 400 17px/1.9 'Noto Serif JP', serif; letter-spacing: .06em; color: #ece6d8; -webkit-user-select: text; user-select: text; }
.st .st-log-item.choice .jp { color: #ffd98e; font-size: 15px; }
.st .st-log-item .en { display: none; font: italic 14px/1.45 'EB Garamond', serif; color: rgba(236,230,216,.55); margin-top: 2px; }
.st .st-log.en-on .st-log-item .en { display: block; }

/* ── timetable close-up ── */
.st .st-tt { position: absolute; inset: 0; z-index: 22; display: grid; place-items: center; background: rgba(10,10,12,.45); opacity: 0; pointer-events: none; transition: opacity .35s; cursor: pointer; }
.st .st-tt.on { opacity: 1; pointer-events: auto; }
.st .tt-board { position: relative; width: min(440px, 90vw); padding: 0 0 22px; color: #1d2026; background: linear-gradient(#f3f1ea, #e7e4da); border-radius: 4px;
  box-shadow: 0 0 0 6px #3a4553, 0 0 0 8px #2a323d, 0 30px 70px rgba(0,0,0,.5); transform: rotate(-.6deg) translateY(10px); transition: transform .5s cubic-bezier(.2,.8,.2,1); font-family: 'Zen Kaku Gothic New', sans-serif; }
.st .st-tt.on .tt-board { transform: rotate(-.6deg); }
.st .tt-board::after { content: ''; position: absolute; inset: 0; pointer-events: none; background: radial-gradient(90% 50% at 15% 100%, rgba(120,90,50,.14), transparent 70%), radial-gradient(60% 40% at 100% 0%, rgba(120,100,60,.1), transparent 70%); }
.st .tt-head { background: #2b3846; color: #f4f2ea; padding: 14px 20px 12px; display: flex; justify-content: space-between; align-items: baseline; }
.st .tt-head b { font: 700 19px/1 'Noto Serif JP', serif; letter-spacing: .2em; }
.st .tt-head span { font-size: 12px; letter-spacing: .3em; color: #e6a23c; }
.st .tt-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 0; padding: 14px 20px 0; }
.st .tt-col h4 { margin: 0 0 8px; font: 700 14px/1 'Zen Kaku Gothic New'; letter-spacing: .15em; padding-bottom: 8px; border-bottom: 2px solid #2b3846; }
.st .tt-col h4 .rubbed { display: inline-block; width: 3.4em; height: .9em; vertical-align: -1px; background: linear-gradient(90deg, rgba(140,120,90,.35), rgba(160,140,110,.15)); border-radius: 2px; margin-right: 2px; filter: blur(.4px); }
.st .tt-row { display: flex; align-items: baseline; gap: 10px; padding: 6px 2px; border-bottom: 1px dashed rgba(40,50,60,.18); font-variant-numeric: tabular-nums; }
.st .tt-row .hh { width: 2.2em; text-align: right; font: 700 20px/1 'Zen Kaku Gothic New'; }
.st .tt-row .mm { font: 700 20px/1 'Zen Kaku Gothic New'; position: relative; }
.st .tt-row .mark { font-size: 12px; color: #b5402f; }
.st .tt-row .old { text-decoration: line-through; text-decoration-color: #c23b2b; text-decoration-thickness: 2px; color: #6c6c70; }
.st .tt-row .new { font: 400 19px/1 'M PLUS Rounded 1c', sans-serif; color: #c23b2b; transform: rotate(-4deg); display: inline-block; margin-left: 4px; }
.st .tt-notes { margin: 14px 20px 0; font-size: 12px; line-height: 1.7; color: #3b3f48; }
.st .tt-sticker { position: absolute; right: -14px; bottom: 62px; transform: rotate(5deg); background: #fbf7e3; padding: 8px 12px; font: 400 13px/1.3 'M PLUS Rounded 1c'; color: #2b3a6b;
  box-shadow: 0 4px 10px rgba(0,0,0,.25); }
.st .tt-sticker::before { content: ''; position: absolute; left: 30%; top: -7px; width: 40%; height: 12px; background: rgba(230,220,180,.75); transform: rotate(-3deg); }

/* ── the notebook ── */
.st .st-nb { position: absolute; inset: 0; z-index: 20; display: none;
  --pw: min(46vw, 560px, calc((100vh - 150px) / 1.38)); --ph: calc(var(--pw) * 1.38); }
.st .st-nb.single { --pw: min(92vw, 520px, calc((100vh - 136px) / 1.5)); --ph: calc(var(--pw) * 1.5); }
.st .st-nb.on { display: block; }
.st .st-nb-shade { position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 45%, rgba(14,12,10,.28), rgba(8,7,6,.66)); animation: st-in .6s ease both; }
.st .st-nb.closing .st-nb-shade { opacity: 0; transition: opacity .8s ease; }
@keyframes st-in { from { opacity: 0 } }
.st .st-nb-stage { position: absolute; left: 50%; top: calc(50% - 22px); width: calc(var(--pw) * 2); height: var(--ph); margin-left: calc(var(--pw) * -1); margin-top: calc(var(--ph) / -2); }
.st .st-nb.single .st-nb-stage { width: var(--pw); margin-left: calc(var(--pw) / -2); }
.st .st-nb-book { position: absolute; inset: 0; transform-style: preserve-3d; transition: transform 1.05s cubic-bezier(.45,.05,.3,1); }
.st .st-nb:not(.opened) .st-nb-book { transform: translateX(-25%); }
.st .st-nb.single .st-nb-book { transform: none; }
.st .st-nb-spread { position: absolute; inset: 0; perspective: 2800px; opacity: 0; transition: opacity .45s .25s; }
.st .st-nb.opened .st-nb-spread { opacity: 1; }
.st .st-nb-spread::before { content: ''; position: absolute; inset: -7px -9px -9px; border-radius: 5px; background: #5f7584;
  box-shadow: 0 34px 70px rgba(0,0,0,.42), 0 8px 18px rgba(0,0,0,.25), inset 0 0 0 1px rgba(0,0,0,.2); }
.st .st-nb-slot { position: absolute; top: 0; height: 100%; width: 50%; container-type: size; }
.st .st-nb-L { left: 0; box-shadow: -1px 1px 0 #e4ddca, -2px 2px 0 #d9d1bc, -3px 3px 0 #e6dfcc, -4px 4px 0 #d3cbb6; }
.st .st-nb-R { left: 50%; box-shadow: 1px 1px 0 #e4ddca, 2px 2px 0 #d9d1bc, 3px 3px 0 #e6dfcc, 4px 4px 0 #d3cbb6; }
.st .st-nb.single .st-nb-L { display: none; }
.st .st-nb.single .st-nb-R { left: 0; width: 100%; }
.st .st-nb-gutter { position: absolute; left: 50%; top: 0; bottom: 0; width: 70px; margin-left: -35px; pointer-events: none; z-index: 4;
  background: linear-gradient(90deg, transparent, rgba(40,30,20,.1) 38%, rgba(30,22,14,.3) 50%, rgba(40,30,20,.08) 62%, transparent); }
.st .st-nb.single .st-nb-gutter { left: 0; margin-left: -20px; width: 40px; background: linear-gradient(90deg, transparent, rgba(30,22,14,.25) 50%, transparent); }
.st .st-nb-cover, .st .st-nb-leaf { position: absolute; top: 0; height: 100%; width: 50%; transform-style: preserve-3d; }
.st .st-nb-cover { left: 50%; transform-origin: left center; z-index: 6; }
.st .st-nb.single .st-nb-cover { left: 0; width: 100%; }
.st .st-nb-leaf { z-index: 5; }
.st .st-nb-leaf.right { left: 50%; transform-origin: left center; }
.st .st-nb-leaf.left { left: 0; transform-origin: right center; }
.st .st-nb-leaf.single { left: 0; width: 100%; transform-origin: left center; }
.st .st-nb-face { position: absolute; inset: 0; backface-visibility: hidden; -webkit-backface-visibility: hidden; overflow: hidden; container-type: size; }
.st .st-nb-face.back { transform: rotateY(180deg); }
.st .st-nb-leaf .shine { position: absolute; inset: 0; pointer-events: none; opacity: 0; backface-visibility: hidden;
  background: linear-gradient(90deg, rgba(0,0,0,.22), rgba(255,255,255,.3) 55%, rgba(0,0,0,.06)); }
.st .st-nb-cover .front { border-radius: 2px 7px 7px 2px; }
.st .cv { position: absolute; inset: 0; background-color: #6f8a99;
  background-image: radial-gradient(120% 80% at 100% 0%, rgba(255,255,255,.14), transparent 50%), radial-gradient(60% 40% at 0% 100%, rgba(0,0,0,.18), transparent 70%), var(--st-noise);
  box-shadow: inset 6px 0 0 #566f7d, inset 8px 0 10px rgba(0,0,0,.2), inset -2px 0 0 rgba(255,255,255,.15); }
.st .cv::after { content: ''; position: absolute; left: 62%; top: 68%; width: 22%; aspect-ratio: 1; border-radius: 50%; border: 3px solid rgba(80,60,40,.14); transform: scaleY(.92); }
.st .cv-label { position: absolute; left: 16%; right: 16%; top: 16%; padding: 7% 6% 6%; background: #f1ecdd; text-align: center; box-shadow: 0 1px 2px rgba(0,0,0,.2); transform: rotate(-1deg); }
.st .cv-title { font-size: 9cqw; letter-spacing: .1em; line-height: 1.2; }
.st .cv-sub { font-size: 3.6cqw; margin-top: .9em; font-weight: 400; color: #333; }
.st .cv-st { position: absolute; right: 12%; bottom: 10%; font-size: 4.6cqw; color: #1f2a33; opacity: .85; }
.st .cv-string { position: absolute; left: 3%; top: -2%; width: 2px; height: 46%; background: linear-gradient(#e9e6dc, #cfccc2); transform: rotate(8deg); transform-origin: top; border-radius: 2px; }

.st .pg { position: absolute; inset: 0; --lh: max(22px, 4.15cqh); --fs: calc(var(--lh) * .6); --paper: #f4efe2; --rule: rgba(96,124,150,.32);
  color: #222; background-color: var(--paper); overflow: hidden;
  background-image: linear-gradient(to bottom, var(--paper) 0, var(--paper) calc(var(--lh) * 2 - 1px), transparent calc(var(--lh) * 2 - 1px)),
    repeating-linear-gradient(to bottom, transparent 0, transparent calc(var(--lh) - 1px), var(--rule) calc(var(--lh) - 1px), var(--rule) var(--lh)),
    var(--st-noise); }
.st .pg::before { content: ''; position: absolute; inset: 0; pointer-events: none; z-index: 0; background: var(--age, none); }
.st .pg::after { content: ''; position: absolute; inset: 0; pointer-events: none; z-index: 3; }
.st .st-nb-L .pg::after, .st .st-nb-leaf .back .pg::after { background: linear-gradient(90deg, rgba(255,255,255,.08), transparent 12%, transparent 84%, rgba(60,44,28,.16)); }
.st .st-nb-R .pg::after, .st .st-nb-leaf .front .pg::after, .st .st-nb.single .pg::after { background: linear-gradient(90deg, rgba(60,44,28,.18), transparent 14%, transparent 90%, rgba(255,255,255,.06)); }
.st .pg > * { position: relative; z-index: 1; }
.st .p-1986 { --paper: #e8dcbd; --rule: rgba(110,130,140,.3); --age: radial-gradient(3% 2.4% at 22% 31%, rgba(150,110,60,.22), transparent), radial-gradient(2% 1.6% at 74% 66%, rgba(150,110,60,.2), transparent), radial-gradient(4% 3% at 61% 88%, rgba(150,110,60,.16), transparent), radial-gradient(130% 100% at 50% 50%, transparent 60%, rgba(150,120,70,.25)); }
.st .p-1994 { --paper: #ebe2c8; --age: radial-gradient(2% 1.5% at 81% 22%, rgba(150,110,60,.18), transparent), radial-gradient(130% 100% at 50% 50%, transparent 65%, rgba(150,120,70,.18)); }
.st .p-1999 { --paper: #eee6d1; --age: radial-gradient(130% 100% at 50% 50%, transparent 70%, rgba(150,120,70,.14)); }
.st .p-2004 { --paper: #f0e9d7; }
.st .p-2011 { --paper: #f2ecdd; }
.st .p-2019 { --paper: #f4efe3; }
.st .p-robot { --paper: #f3eee2; }
.st .p-2023 { --paper: #f5f1e7; }
.st .p-2025 { --paper: #f6f3ea; }
.st .p-today { --paper: #f8f5ee; }
.st .p-newer { --paper: #f1ebdb; }
.st .stain-ring { --age: radial-gradient(circle at 78% 80%, transparent 0 8.4%, rgba(130,90,50,.22) 8.9%, rgba(130,90,50,.08) 9.8%, transparent 10.8%); }
.st .stain-water { --age: radial-gradient(ellipse 30% 18% at 30% 9%, rgba(120,140,150,.05) 0 60%, rgba(100,118,128,.22) 68%, rgba(150,160,166,.06) 76%, transparent 84%), radial-gradient(ellipse 14% 9% at 46% 15%, rgba(100,118,128,.1), transparent 80%); }

.st .pg-head { height: calc(var(--lh) * 2); display: flex; align-items: flex-end; justify-content: flex-end; gap: .6em; padding: 0 7% calc(var(--lh) * .22) 7%;
  font: 400 calc(var(--fs) * .62)/1 'Zen Kaku Gothic New', sans-serif; letter-spacing: .12em; color: rgba(90,116,140,.7); }
.st .pg-head .pg-no { margin-right: auto; }
.st .pg-head .pg-dv { font-size: calc(var(--fs) * 1.25); letter-spacing: .04em; min-width: 9em; text-align: left; border-bottom: 1px solid rgba(90,116,140,.35); padding-bottom: 2px; }
.st .pg .body, .st .pg .ps, .st .pg .reply, .st .pg .note { padding: 0 6% 0 7%; }
.st .pg .ln { min-height: var(--lh); line-height: var(--lh); }
.st .pg .sign { text-align: right; padding-right: 6%; }
.st .pg .ps { margin-top: var(--lh); padding-left: 12%; }
.st .pg .reply { margin-top: var(--lh); padding-left: 26%; }
.st .ink .h { display: inline-block; transform: translateY(var(--y, 0)) rotate(var(--r, 0)) scale(var(--s, 1)); opacity: var(--o, 1); }
.st .ink-fountain { font-family: 'Noto Serif JP', serif; font-size: var(--fs); color: #2b3964; letter-spacing: .03em; text-shadow: 0 0 .7px rgba(30,40,90,.55); opacity: .84; }
.st .ink-fountain.body { transform: skewX(-5deg); transform-origin: 0 0; }
.st .ink-ballpoint { font-family: 'Zen Kaku Gothic New', sans-serif; font-size: calc(var(--fs) * .95); color: #26408c; letter-spacing: .02em; }
.st .ink-ballpoint-black { font-family: 'Zen Kaku Gothic New', sans-serif; font-size: calc(var(--fs) * .9); color: #1c1c22; }
.st .ink-pencil { font-family: 'Zen Kaku Gothic New', sans-serif; font-size: calc(var(--fs) * .88); color: #5b5c63; letter-spacing: -.01em; text-shadow: 0 0 .5px rgba(80,80,90,.5); }
.st .ink-pencil-2b { font-family: 'M PLUS Rounded 1c', sans-serif; font-weight: 700; font-size: calc(var(--fs) * 1.12); color: #3d3e45; }
.st .ink-pencil-2b.reply { transform: rotate(-3deg); transform-origin: 0 50%; }
.st .ink-pencil-neat { font-family: 'Zen Kaku Gothic New', sans-serif; font-size: calc(var(--fs) * .82); color: #4e4f56; }
.st .ink-gel { font-family: 'M PLUS Rounded 1c', sans-serif; font-size: calc(var(--fs) * .97); color: #131316; }
.st .ink-heavy { font-family: 'Zen Kaku Gothic New', sans-serif; font-weight: 700; font-size: calc(var(--fs) * .96); color: #16161b; }
.st .ink-robot { font-family: 'Zen Kaku Gothic New', sans-serif; font-size: calc(var(--fs) * .86); color: #1b2a48; }
.st .ink-robot .h { width: 1.08em; text-align: center; }
.st .ink-brush { font-family: 'Shippori Mincho B1', 'Noto Serif JP', serif; font-weight: 800; font-size: calc(var(--fs) * 1.1); color: #151515; }
.st .ink-fine { font-family: 'Zen Kaku Gothic New', sans-serif; font-size: calc(var(--fs) * .84); color: #3c3e52; letter-spacing: .06em; }
.st .ink-marker { font-family: 'Zen Kaku Gothic New', sans-serif; font-weight: 700; color: #232327; }
.st .ink-crayon { font-family: 'Mochiy Pop One', 'M PLUS Rounded 1c', sans-serif; }
.st .ink-mine { font-family: 'Noteworthy', 'M PLUS Rounded 1c', 'Zen Kaku Gothic New', sans-serif; font-size: calc(var(--fs) * 1.0); color: #24306a; }
.st .smudge { display: inline-block; color: transparent; text-shadow: 0 0 5px rgba(27,42,72,.75); width: 1.8em; }
.st .pg .body.vert { position: absolute; top: calc(var(--lh) * 2.3); right: 9%; height: calc(100% - var(--lh) * 5.2); padding: 0; writing-mode: vertical-rl; line-height: 2.2em; letter-spacing: .14em; }
.st .pg .body.vert .ln { min-height: 0; line-height: 2.2em; }
.st .pg .body.vert .vdate { font-size: .8em; margin-left: .8em; }
.st .pg .crow { position: absolute; width: 15%; right: 10%; bottom: 17%; transform: rotate(-7deg); z-index: 1; }
.st .inside-cover { background: #aebbbf; background-image: radial-gradient(120% 80% at 0% 0%, rgba(255,255,255,.14), transparent 60%), var(--st-noise); }
.st .taped { position: absolute; left: 9%; right: 9%; top: 10%; padding: 8% 7% 9%; background: #f6f2e6; transform: rotate(-1.4deg); box-shadow: 0 2px 6px rgba(0,0,0,.18); --lh: max(22px, 4.6cqh); --fs: calc(var(--lh) * .58); }
.st .taped .body { font-size: var(--fs); padding: 0; }
.st .taped .tape { position: absolute; width: 22%; height: calc(var(--lh) * .8); background: rgba(232,222,184,.7); box-shadow: 0 1px 1px rgba(0,0,0,.05); }
.st .taped .tape.a { left: -7%; top: -3%; transform: rotate(-34deg); }
.st .taped .tape.b { right: -7%; top: -3%; transform: rotate(30deg); }
.st .kid { position: relative; margin: calc(var(--lh) * .4) 5% 0; height: 62%; }
.st .kid-svg { position: absolute; left: 0; right: 0; top: 18%; width: 100%; height: auto; }
.st .kid-t1, .st .kid-t2, .st .kid-sign { position: absolute; z-index: 2; }
.st .kid-t1 { left: 4%; top: 0; font-size: calc(var(--fs) * 2.5); color: #d6553d; }
.st .kid-t2 { right: 4%; top: 4%; font-size: calc(var(--fs) * 1.9); color: #3b6ea0; transform: rotate(6deg); }
.st .kid-sign { right: 6%; bottom: -4%; font-size: calc(var(--fs) * 1.35); color: #4a8a3d; }
.st .mir { display: inline-block; transform: scaleX(-1); }
.st .pg .note { position: absolute; left: 0; right: 0; bottom: calc(var(--lh) * 2.1); }
.st .pg-en { position: absolute !important; left: 6%; right: 6%; bottom: 2.4%; z-index: 4 !important; display: none; padding: .55em .8em .6em; border-radius: 3px;
  font: italic calc(var(--fs) * .7)/1.4 'EB Garamond', serif; color: rgba(62,52,40,.85); background: rgba(250,247,238,.9); box-shadow: 0 1px 4px rgba(0,0,0,.12); -webkit-user-select: text; user-select: text; }
.st .st-nb.en-on .pg-en { display: block; }
.st .pg textarea.write { position: absolute; left: 7%; right: 6%; top: calc(var(--lh) * 2); height: calc(var(--lh) * 15); margin: 0; padding: 0; border: 0; outline: 0; resize: none; background: transparent;
  line-height: var(--lh); font-size: calc(var(--fs) * 1.02); caret-color: #24306a; -webkit-user-select: text; user-select: text; overflow: hidden; }
.st .pg textarea.write::placeholder { color: rgba(80,84,96,.38); }
.st .pg .pen { position: absolute; right: 9%; bottom: 13%; width: 34%; height: 8%; pointer-events: none; }
.st .pg .pen i { position: absolute; right: 0; top: 40%; width: 100%; height: 13%; border-radius: 20px 3px 3px 20px; transform: rotate(-24deg); transform-origin: right;
  background: linear-gradient(180deg, #4a5fa6, #2b3d7a 60%, #1e2c5e); box-shadow: 0 2px 3px rgba(0,0,0,.18); }
.st .pg .pen i::before { content: ''; position: absolute; left: -9%; top: 25%; width: 10%; height: 50%; background: linear-gradient(90deg, #d8d8d2, #9a9a94); clip-path: polygon(0 50%, 100% 0, 100% 100%); }
.st .pg .pen::after { content: ''; position: absolute; right: -2%; top: 10%; width: 60%; height: 200%; border: 1px solid rgba(230,228,218,.95); border-left: 0; border-bottom: 0; border-radius: 0 60% 0 0; }

.st .st-nb-bar { position: absolute; left: 50%; bottom: max(14px, env(safe-area-inset-bottom)); transform: translateX(-50%); z-index: 9; display: flex; align-items: center; gap: 6px; flex-wrap: nowrap; max-width: calc(100% - 24px); }
.st .st-nb-bar button { cursor: pointer; border: 1px solid rgba(255,255,255,.14); background: rgba(16,15,20,.55); color: #f3ecdc; border-radius: 999px; padding: 8px 13px;
  font: 500 13px/1 'Noto Serif JP', serif; letter-spacing: .1em; -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); transition: background .2s, opacity .2s, color .2s; white-space: nowrap; }
.st .st-nb-bar button:hover { background: rgba(36,33,42,.78); }
.st .st-nb-bar button:disabled { opacity: .3; cursor: default; }
.st .st-nb-bar .nb-prev, .st .st-nb-bar .nb-next { width: 36px; padding: 7px 0 9px; font-size: 18px; }
.st .st-nb-bar .nb-en.on { color: #ffd98e; border-color: rgba(255,217,142,.45); }
.st .st-nb-bar .nb-close.done { background: rgba(98,74,34,.75); border-color: rgba(255,217,142,.5); color: #fff3d6; }
.st .st-nb-bar .nb-pg { min-width: 4.2em; text-align: center; font: 400 12px/1 'Zen Kaku Gothic New'; letter-spacing: .14em; color: rgba(243,236,220,.7); }
.st .st-nb-bar .nb-en, .st .st-nb-bar .nb-last { font-size: 11px; letter-spacing: .16em; }
/* ── English mode ── */
.st .st-vn.mode-en .st-vn-text { font-family: 'EB Garamond', 'Noto Serif JP', serif; font-size: clamp(18px, calc(0.95vw + 10px), 25px); line-height: 1.6; letter-spacing: .01em; }
.st .st-vn.mode-en .st-vn-ctl [data-a=en] { display: none; }
.st .st-choices.mode-en .st-choice { font-family: 'EB Garamond', serif; font-size: clamp(18px, calc(.6vw + 12px), 22px); letter-spacing: .04em; }
.st .st-log.mode-en .st-log-item .jp { font-family: 'EB Garamond', serif; font-size: 19px; line-height: 1.6; letter-spacing: 0; }
.st.mode-en .st-tag, .st.mode-en .st-waitbtn { font-family: 'EB Garamond', serif; letter-spacing: .06em; font-size: 15px; }
.st.mode-en .st-hint { font-family: 'EB Garamond', serif; font-style: italic; letter-spacing: .06em; font-size: 15px; }
.st .tt-notes em, .st .tt-sticker em { display: block; font: italic 12px/1.4 'EB Garamond', serif; color: #6a5a40; }
.st .tt-en { margin: 10px 20px 0; font: italic 13px/1.4 'EB Garamond', serif; color: #4a4a52; }
.st .st-nb.mode-en .nb-en, .st .st-nb.mode-en .pg-en { display: none !important; }
.st .st-nb.mode-en .st-nb-bar button { font-family: 'EB Garamond', serif; letter-spacing: .04em; font-size: 14px; }
.st .ink .w { white-space: nowrap; }
.st .is-en .ink-fountain { font-family: 'EB Garamond', serif; font-style: italic; font-size: calc(var(--fs) * 1.12); letter-spacing: 0; }
.st .is-en .ink-ballpoint, .st .is-en .ink-ballpoint-black, .st .is-en .ink-pencil, .st .is-en .ink-pencil-neat, .st .is-en .ink-fine { font-family: 'Noteworthy', 'Trebuchet MS', sans-serif; letter-spacing: 0; }
.st .is-en .ink-pencil-2b { font-family: 'Marker Felt', 'Noteworthy', sans-serif; font-weight: 400; }
.st .is-en .ink-gel { font-family: 'Trebuchet MS', 'M PLUS Rounded 1c', sans-serif; letter-spacing: .01em; }
.st .is-en .ink-heavy { font-family: 'Noteworthy', sans-serif; font-weight: 700; }
.st .is-en .ink-robot { font-family: 'IBM Plex Mono', monospace; font-size: calc(var(--fs) * .78); }
.st .is-en .ink-robot .h { width: .62em; }
.st .is-en .ink-brush { font-family: 'EB Garamond', serif; font-weight: 600; font-size: var(--fs); letter-spacing: .02em; }
.st .is-en .ink-marker { font-family: 'Marker Felt', 'Zen Kaku Gothic New', sans-serif; font-weight: 400; }
.st .is-en .pg-head .pg-dv { font-size: var(--fs); }
@media (max-width: 520px) {
  .st .st-vn-box { padding: 18px 20px 26px 26px; }
  .st .st-vn-box::before { left: 12px; top: 24px; height: 18px; }
  .st .st-vn-ctl { right: 8px; }
  .st .st-vn-ctl button { padding: 6px 7px 6px 8px; letter-spacing: .12em; }
  .st .st-nb-bar { gap: 4px; }
  .st .st-nb-bar button { padding: 8px 9px; font-size: 12px; }
  .st .st-nb-bar .nb-last { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .st .st-grain { animation: none; }
}
`;
