// Scoped styles for 円町. Everything lives under .cm.
export const CSS = `
.cm{position:absolute;inset:0;overflow:hidden;background:#07060c;color:#f4eef6;font-family:"Zen Kaku Gothic New","M PLUS Rounded 1c",system-ui,sans-serif;user-select:none;-webkit-user-select:none;touch-action:none;
  --pink:#ff66aa;--pink2:#ffd0e6;--ink:#f4eef6;--mute:rgba(244,238,246,.62);--faint:rgba(244,238,246,.38);--panel:rgba(16,13,24,.74);--line:rgba(255,255,255,.1);--mono:"IBM Plex Mono",ui-monospace,monospace;--round:"M PLUS Rounded 1c",sans-serif}
.cm canvas.cm-cv{position:absolute;inset:0;width:100%;height:100%;display:block}
.cm.playing{cursor:none}
.cm .cm-scr{position:absolute;inset:0;display:none}
.cm .cm-scr.on{display:block;animation:cmIn .45s cubic-bezier(.2,.8,.2,1)}
@keyframes cmIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.cm button{font:inherit;color:inherit;background:none;border:0;cursor:pointer;padding:0}
.cm button:focus-visible{outline:2px solid var(--pink);outline-offset:3px}
.cm .mono{font-family:var(--mono)}

/* ---------- menu ---------- */
.cm .menu.on{display:grid;place-items:center}
.cm .menu-wrap{position:relative;display:flex;align-items:center;gap:clamp(18px,4vw,56px);transition:transform .6s cubic-bezier(.2,.8,.2,1)}
.cm .cookie{position:relative;width:clamp(200px,34vmin,360px);aspect-ratio:1;border-radius:50%;display:grid;place-items:center;
  background:radial-gradient(circle at 50% 38%,#ff8cc0 0%,#ff66aa 45%,#d9437f 100%);
  box-shadow:0 0 0 clamp(6px,1.1vmin,11px) #fff,0 0 60px rgba(255,102,170,.55),0 0 160px rgba(255,102,170,.25);transition:transform .18s}
.cm .cookie:hover{transform:scale(1.04)}
.cm .cookie:active{transform:scale(.97)}
.cm .cookie .kan{font-family:"Shippori Mincho B1","Noto Serif JP",serif;font-weight:800;font-size:clamp(90px,16vmin,170px);color:#fff;line-height:1;text-shadow:0 4px 18px rgba(120,0,50,.35);transform:translateY(-4%)}
.cm .cookie .sub{position:absolute;bottom:20%;font-family:var(--mono);font-size:clamp(10px,1.3vmin,13px);letter-spacing:.42em;color:rgba(255,255,255,.85);padding-left:.42em}
.cm .cookie .ring{position:absolute;inset:-14%;border-radius:50%;border:2px solid rgba(255,208,230,.5);pointer-events:none}
.cm .menu-btns{display:flex;flex-direction:column;gap:10px;opacity:0;transform:translateX(-24px);pointer-events:none;transition:all .45s cubic-bezier(.2,.8,.2,1)}
.cm .menu.open .menu-btns{opacity:1;transform:none;pointer-events:auto}
.cm .mbtn{display:flex;align-items:baseline;gap:14px;min-width:min(300px,62vw);padding:13px 22px;border-radius:12px;background:var(--panel);border:1px solid var(--line);backdrop-filter:blur(8px);text-align:left;transition:background .15s,transform .15s,border-color .15s}
.cm .mbtn:hover{background:rgba(255,102,170,.2);border-color:rgba(255,102,170,.6);transform:translateX(6px)}
.cm .mbtn b{font-family:var(--round);font-weight:800;font-size:clamp(18px,2.2vw,24px)}
.cm .mbtn span{font-family:var(--mono);font-size:12px;color:var(--mute);letter-spacing:.06em}
.cm .menu-foot{position:absolute;left:0;right:0;bottom:clamp(14px,3vh,28px);text-align:center;font-size:clamp(13px,1.6vw,15px);color:var(--mute);line-height:1.8;padding:0 16px}
.cm .menu-foot .mono{font-size:11.5px;color:var(--faint)}
.cm .np{position:absolute;top:36px;left:16px;font-family:var(--mono);font-size:12px;color:var(--mute);display:flex;gap:10px;align-items:center}
.cm .np i{display:inline-block;width:3px;height:10px;background:var(--pink);animation:cmEq .7s ease-in-out infinite alternate}
.cm .np i:nth-child(2){animation-delay:-.3s}.cm .np i:nth-child(3){animation-delay:-.55s}
@keyframes cmEq{from{transform:scaleY(.3)}to{transform:scaleY(1.1)}}

/* ---------- song select ---------- */
.cm .sel{display:grid;grid-template-columns:minmax(320px,1fr) minmax(320px,46%);grid-template-rows:1fr auto;height:100%}
.cm .info{grid-row:1;padding:clamp(56px,8vh,84px) clamp(16px,3vw,44px) 16px;overflow:auto;scrollbar-width:none}
.cm .info::-webkit-scrollbar{display:none}
.cm .ttl{font-family:"Noto Serif JP",serif;font-weight:900;font-size:clamp(30px,4.4vw,60px);line-height:1.05;letter-spacing:.02em;text-shadow:0 2px 24px rgba(0,0,0,.5)}
.cm .ttl small{display:block;font-family:var(--mono);font-weight:400;font-size:clamp(12px,1.2vw,14px);color:var(--mute);letter-spacing:.12em;margin-top:10px}
.cm .meta{margin-top:14px;font-size:14px;line-height:1.8;color:var(--mute)}
.cm .meta b{color:var(--ink);font-weight:700}
.cm .meta .mapper{color:var(--pink2)}
.cm .stats{margin-top:12px;display:flex;flex-wrap:wrap;gap:6px 16px;font-family:var(--mono);font-size:12.5px;color:var(--mute)}
.cm .stats b{color:var(--ink);font-weight:500}
.cm .attrs{margin-top:18px;display:grid;grid-template-columns:auto 1fr auto;gap:7px 12px;align-items:center;max-width:460px;font-family:var(--mono);font-size:12.5px}
.cm .attrs .bar{height:6px;border-radius:3px;background:rgba(255,255,255,.1);overflow:hidden}
.cm .attrs .bar i{display:block;height:100%;background:linear-gradient(90deg,#ff66aa,#ffd0e6);transition:width .35s cubic-bezier(.2,.8,.2,1)}
.cm .attrs .v{text-align:right;min-width:3.2em}
.cm .attrs .mod{color:#ffd23f}
.cm .gen{margin-top:20px;max-width:560px;background:rgba(8,7,12,.66);border:1px solid var(--line);border-radius:10px;padding:12px 14px;font-family:var(--mono);font-size:11.5px;line-height:1.65;color:rgba(200,240,210,.82);min-height:118px;white-space:pre-wrap;word-break:break-all}
.cm .gen .c{color:rgba(244,238,246,.4)}
.cm .board{margin-top:18px;max-width:560px}
.cm .board h4{font-size:12px;font-weight:700;letter-spacing:.14em;color:var(--mute);margin:0 0 8px}
.cm .row{display:grid;grid-template-columns:38px 1fr auto;gap:12px;align-items:center;padding:9px 12px;border-radius:10px;background:var(--panel);border:1px solid var(--line)}
.cm .row .g{font-family:var(--round);font-weight:800;font-size:22px;text-align:center}
.cm .row .who{font-size:14px}.cm .row .who small{display:block;font-family:var(--mono);font-size:11px;color:var(--mute)}
.cm .row .sc{font-family:var(--mono);font-size:13px;text-align:right}
.cm .empty{font-size:13px;color:var(--faint);padding:10px 2px}
.cm .car{grid-row:1;position:relative;overflow:hidden;mask-image:linear-gradient(180deg,transparent,#000 12%,#000 88%,transparent)}
.cm .car-in{position:absolute;left:0;right:0;top:50%;transition:transform .45s cubic-bezier(.2,.8,.2,1)}
.cm .pn{position:relative;display:block;width:calc(100% - 20px);margin:0 0 8px auto;height:76px;border-radius:12px 0 0 12px;background:var(--panel);border:1px solid var(--line);border-right:0;padding:12px 18px 12px 22px;text-align:left;transition:transform .3s cubic-bezier(.2,.8,.2,1),background .2s,border-color .2s;overflow:hidden}
.cm .pn::before{content:"";position:absolute;left:0;top:0;bottom:0;width:6px;background:var(--dc,#888)}
.cm .pn:hover{background:rgba(30,24,44,.85)}
.cm .pn.sel{transform:translateX(-34px);background:rgba(36,22,40,.92);border-color:rgba(255,102,170,.55);box-shadow:0 0 0 1px rgba(255,102,170,.25),0 10px 40px rgba(0,0,0,.4)}
.cm .pn .t1{font-family:var(--round);font-weight:800;font-size:17px;display:flex;gap:10px;align-items:baseline}
.cm .pn .t1 small{font-family:var(--mono);font-weight:400;font-size:12px;color:var(--mute)}
.cm .pn .t2{margin-top:6px;font-family:var(--mono);font-size:12px;color:var(--mute);display:flex;gap:10px;align-items:center}
.cm .pn .stars{display:inline-flex;gap:2px;font-size:11px;color:var(--dc)}
.cm .pn .gr{position:absolute;right:18px;top:50%;transform:translateY(-50%);font-family:var(--round);font-weight:800;font-size:26px;opacity:.9}
.cm .pn.ghost{opacity:.45;height:66px;filter:saturate(.4)}
.cm .pn.ghost:hover{opacity:.7}
.cm .pn.set{height:auto;background:rgba(10,8,16,.6)}
.cm .bot{grid-column:1/-1;grid-row:2;display:flex;align-items:center;gap:10px;padding:10px 72px 10px 168px;background:rgba(8,7,12,.82);border-top:1px solid var(--line);backdrop-filter:blur(10px);flex-wrap:wrap}
.cm .bb{padding:10px 16px;border-radius:10px;border:1px solid var(--line);background:rgba(255,255,255,.04);font-size:14px;display:flex;gap:8px;align-items:baseline;transition:background .15s,border-color .15s}
.cm .bb:hover{background:rgba(255,255,255,.1)}
.cm .bb small{font-family:var(--mono);font-size:11px;color:var(--mute)}
.cm .mods{display:flex;gap:6px;flex-wrap:wrap}
.cm .mod{min-width:62px;padding:8px 10px;border-radius:10px;border:1px solid var(--line);background:rgba(255,255,255,.03);text-align:center;transition:all .15s}
.cm .mod b{display:block;font-family:var(--round);font-weight:800;font-size:15px}
.cm .mod small{font-family:var(--mono);font-size:10.5px;color:var(--mute)}
.cm .mod.on{background:rgba(255,102,170,.24);border-color:var(--pink);box-shadow:0 0 18px rgba(255,102,170,.25)}
.cm .mult{font-family:var(--mono);font-size:12px;color:var(--mute);margin-left:4px}
.cm .play{margin-left:auto;padding:12px 30px;border-radius:12px;background:var(--pink);color:#1a0812;font-family:var(--round);font-weight:800;font-size:18px;box-shadow:0 0 30px rgba(255,102,170,.45);transition:transform .15s,box-shadow .15s}
.cm .play:hover{transform:translateY(-2px);box-shadow:0 0 44px rgba(255,102,170,.65)}
@media (max-width:760px){
  .cm .sel{grid-template-columns:1fr;grid-template-rows:auto 1fr auto}
  .cm .car{grid-row:1;grid-column:1;height:236px}
  .cm .info{grid-row:2;grid-column:1;padding-top:12px}
  .cm .bot{grid-row:3;grid-column:1}
  .cm .mod{min-width:52px;padding:6px 8px}
  .cm .pn{height:64px;padding:9px 14px 9px 18px}.cm .pn .t1{font-size:15px}
  .cm .ttl{font-size:30px}
  .cm .play{margin-left:0;flex:1}
  .cm .gen{display:none}
  .cm .bot{padding:10px 12px 66px;gap:8px}
  .cm .bot .bb small{display:none}
}

/* ---------- overlays: options, pause ---------- */
.cm .ov{position:absolute;inset:0;display:none;place-items:center;background:rgba(5,4,9,.62);backdrop-filter:blur(6px);z-index:30}
.cm .ov.on{display:grid;animation:cmIn .3s ease}
.cm .card{width:min(560px,calc(100vw - 32px));max-height:calc(100vh - 40px);overflow:auto;background:rgba(18,15,27,.94);border:1px solid var(--line);border-radius:16px;padding:22px 24px;box-shadow:0 30px 80px rgba(0,0,0,.5)}
.cm .card h3{margin:0 0 4px;font-family:var(--round);font-weight:800;font-size:22px}
.cm .card .lead{font-size:13px;color:var(--mute);margin-bottom:14px}
.cm .opt{display:grid;grid-template-columns:1fr auto;gap:6px 14px;align-items:center;padding:12px 0;border-top:1px solid var(--line)}
.cm .opt label{font-size:15px}
.cm .opt label small{display:block;font-family:var(--mono);font-size:11px;color:var(--mute);margin-top:2px}
.cm .opt input[type=range]{grid-column:1/-1;width:100%;accent-color:var(--pink)}
.cm .opt .val{font-family:var(--mono);font-size:13px;color:var(--pink2)}
.cm .seg{display:flex;gap:4px;grid-column:1/-1;flex-wrap:wrap}
.cm .seg button{flex:1;min-width:120px;padding:9px 10px;border-radius:9px;border:1px solid var(--line);font-size:13px;background:rgba(255,255,255,.03)}
.cm .seg button.on{background:rgba(255,102,170,.24);border-color:var(--pink)}
.cm .opt .hint{grid-column:1/-1;font-size:12.5px;color:var(--mute);line-height:1.6}
.cm .keys{font-family:var(--mono);font-size:12px;color:var(--mute);line-height:1.9;border-top:1px solid var(--line);padding-top:12px}
.cm .keys kbd{font-family:var(--mono);background:rgba(255,255,255,.08);border:1px solid var(--line);border-bottom-width:2px;border-radius:5px;padding:1px 6px;color:var(--ink)}
.cm .close{margin-top:14px;width:100%;padding:12px;border-radius:11px;background:var(--pink);color:#1a0812;font-family:var(--round);font-weight:800;font-size:16px}
.cm .pause .card{text-align:center;width:min(380px,calc(100vw - 32px))}
.cm .pause h3{font-size:30px;margin-bottom:16px}
.cm .pause .pb{display:block;width:100%;margin-top:8px;padding:13px;border-radius:11px;border:1px solid var(--line);background:rgba(255,255,255,.04);font-family:var(--round);font-weight:700;font-size:17px}
.cm .pause .pb:hover{background:rgba(255,102,170,.2);border-color:var(--pink)}
.cm .pause .pb small{font-family:var(--mono);font-size:11px;color:var(--mute);margin-left:8px;font-weight:400}

/* ---------- results ---------- */
.cm .res{display:grid;grid-template-columns:1fr minmax(200px,34%);grid-template-rows:auto 1fr auto;height:100%;background:linear-gradient(180deg,rgba(7,6,12,.55),rgba(7,6,12,.85))}
.cm .rh{grid-column:1/-1;padding:clamp(48px,7vh,70px) clamp(16px,3vw,44px) 10px;border-bottom:1px solid var(--line)}
.cm .rh .t{font-family:"Noto Serif JP",serif;font-weight:900;font-size:clamp(20px,2.6vw,30px)}
.cm .rh .s{font-family:var(--mono);font-size:12px;color:var(--mute);margin-top:6px}
.cm .rl{padding:clamp(14px,2.4vh,26px) clamp(16px,3vw,44px);overflow:auto}
.cm .score{font-family:var(--mono);font-size:clamp(40px,6vw,74px);font-weight:500;letter-spacing:.02em;line-height:1}
.cm .counts{margin-top:18px;display:grid;grid-template-columns:repeat(2,minmax(120px,200px));gap:10px 26px}
.cm .counts div{display:flex;align-items:baseline;gap:12px;font-family:var(--mono);font-size:clamp(18px,2.2vw,24px)}
.cm .counts span{font-family:var(--round);font-weight:800;font-size:clamp(16px,1.8vw,20px);min-width:3em}
.cm .facts{margin-top:20px;display:flex;flex-wrap:wrap;gap:10px 30px;font-family:var(--mono)}
.cm .facts div{font-size:12px;color:var(--mute)}
.cm .facts b{display:block;font-size:clamp(20px,2.4vw,28px);font-weight:500;color:var(--ink)}
.cm .graph{margin-top:20px;width:min(100%,560px);height:80px;display:block;border-radius:8px;background:rgba(255,255,255,.03);border:1px solid var(--line)}
.cm .rr{display:grid;place-items:center;position:relative}
.cm .grade{font-family:var(--round);font-weight:800;font-size:clamp(130px,22vw,300px);line-height:.9;background:linear-gradient(180deg,var(--g1),var(--g2));-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 8px 40px rgba(0,0,0,.45));animation:cmGrade .7s cubic-bezier(.2,1.4,.3,1) both .15s}
@keyframes cmGrade{from{transform:scale(1.8) rotate(-6deg);opacity:0}to{transform:none;opacity:1}}
.cm .line{margin-top:18px;font-family:"Noto Serif JP",serif;font-size:clamp(15px,1.6vw,18px);color:var(--ink);opacity:.9;line-height:1.8}
.cm .line .en{display:block;font-family:"EB Garamond",serif;font-style:italic;font-size:14px;color:var(--mute)}
.cm .rb{grid-column:1/-1;display:flex;gap:10px;padding:12px 72px 12px 168px;border-top:1px solid var(--line);background:rgba(8,7,12,.8);flex-wrap:wrap}
@media (max-width:760px){.cm .rb{padding:10px 12px 66px}.cm .res{grid-template-columns:1fr;grid-template-rows:auto auto 1fr auto}.cm .rr{grid-row:2;padding-top:8px}.cm .rl{grid-row:3}.cm .grade{font-size:120px}}

/* ---------- homages ---------- */
.cm .hom{position:absolute;inset:0;z-index:40;display:grid;place-items:center;pointer-events:none}
.cm .gta{display:grid;place-items:center;gap:.1em;text-align:center;animation:cmGta 3.6s ease both;padding:6vmin 12vmin;background:radial-gradient(ellipse at center,rgba(0,0,0,.62),rgba(0,0,0,.35) 45%,transparent 72%)}
@keyframes cmGta{0%{opacity:0}6%{opacity:1}86%{opacity:1}100%{opacity:0}}
.cm .gta .mp{font-family:Anton,Impact,sans-serif;font-size:clamp(46px,9vw,120px);letter-spacing:.02em;transform:scaleX(1.22);color:#e8a93a;
  background:linear-gradient(180deg,#ffe28a 0%,#f2b53c 46%,#c97b18 54%,#e9a43a 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;
  -webkit-text-stroke:clamp(3px,.45vw,6px) #000;paint-order:stroke fill;filter:drop-shadow(3px 4px 0 #000)}
.cm .gta .rs{font-family:Anton,Impact,sans-serif;font-size:clamp(22px,3.6vw,44px);letter-spacing:.06em;transform:scaleX(1.18);color:#fff;-webkit-text-stroke:clamp(2px,.3vw,4px) #000;paint-order:stroke fill;filter:drop-shadow(2px 3px 0 #000)}
.cm .death{position:absolute;inset:0;display:grid;place-items:center;background:radial-gradient(ellipse at center,rgba(0,0,0,.4),rgba(0,0,0,.92));animation:cmFadeIn 1.4s ease both}
@keyframes cmFadeIn{from{opacity:0}to{opacity:1}}
.cm .shi{font-family:"Shippori Mincho B1","Noto Serif JP",serif;font-weight:800;font-size:clamp(180px,42vmin,460px);color:#c4161c;line-height:1;text-shadow:0 0 40px rgba(196,22,28,.35);animation:cmShi 2.6s cubic-bezier(.2,.8,.2,1) both}
@keyframes cmShi{0%{opacity:0;transform:scale(1.25);filter:blur(10px)}30%{opacity:1;filter:blur(0)}100%{transform:scale(1)}}
.cm .yd{width:100%;padding:3.2vmin 0;background:linear-gradient(180deg,transparent,rgba(0,0,0,.85) 25%,rgba(0,0,0,.85) 75%,transparent);text-align:center;font-family:"EB Garamond",serif;font-weight:400;font-size:clamp(48px,9vw,120px);letter-spacing:.08em;color:#a5141b;animation:cmYd 3.6s ease both}
@keyframes cmYd{0%{opacity:0;transform:scale(1.04)}35%{opacity:1}100%{opacity:1;transform:scale(1.12)}}
.cm .white{position:absolute;inset:0;background:#fff;animation:cmWhite 6.4s ease both;display:grid;place-items:center}
@keyframes cmWhite{0%{opacity:0}28%{opacity:1}82%{opacity:1}100%{opacity:0}}
.cm .white .joe{font-family:"Noto Serif JP",serif;font-weight:400;font-size:clamp(12px,1.25vw,15px);letter-spacing:.3em;color:rgba(40,36,44,.75);animation:cmFadeIn 1.6s ease both 2.2s}
.cm .white svg{position:absolute;bottom:16%;left:50%;transform:translateX(-50%);width:min(46vw,420px);opacity:.1}
.cm.playing .hint-r{display:none}
.cm .hint-r{position:absolute;left:16px;top:14px;font-family:var(--mono);font-size:11px;color:var(--faint);pointer-events:none}
`;
