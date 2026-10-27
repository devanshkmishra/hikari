// HIKARI Aqua 2004 — the look. Luna-era structure, a little more water and glass.
export const CSS = `
.aero{position:absolute;inset:0;overflow:hidden;background:#2a7fe0;color:#000;
  font:13px/1.4 Tahoma,"Zen Kaku Gothic New","Hiragino Kaku Gothic ProN",Meiryo,sans-serif;
  -webkit-user-select:none;user-select:none;cursor:default;-webkit-font-smoothing:antialiased;color-scheme:light}
.aero *{box-sizing:border-box}
.aero :where(button){font:inherit;color:inherit;cursor:default}
.aero canvas.ae-sky,.aero canvas.ae-bub{position:absolute;inset:0;width:100%;height:100%;display:block}
.aero canvas.ae-bub{pointer-events:none}
.aero .ae-solid{position:absolute;inset:0;background:#3a6ea5;opacity:0;transition:opacity .6s;pointer-events:none}
.aero .ae-solid.on{opacity:1}
.aero ::-webkit-scrollbar{width:17px;height:17px}
.aero ::-webkit-scrollbar-track{background:#f3f2ec;border-left:1px solid #e6e3d7}
.aero ::-webkit-scrollbar-thumb{background:linear-gradient(90deg,#d4e1fc,#bcd0f7 55%,#aac1f2);border:1px solid #fff;border-radius:4px;box-shadow:inset 0 0 0 1px #94afe6}
.aero ::-webkit-scrollbar-thumb:hover{background:linear-gradient(90deg,#e2ebff,#c9daff 55%,#b6ccf8)}
.aero ::-webkit-scrollbar-corner{background:#ece9d8}
.aero .jt{pointer-events:auto}

/* ── arrival ── */
.ae-intro{position:absolute;left:0;right:0;top:14%;text-align:center;pointer-events:none;z-index:4;opacity:0;transform:translateY(8px);transition:opacity 2.4s ease,transform 3s cubic-bezier(.2,.8,.2,1)}
.ae-intro.on{opacity:1;transform:none}
.ae-intro .t1{font:800 clamp(38px,6.4vw,84px)/1.05 "M PLUS Rounded 1c",sans-serif;letter-spacing:.1em;padding-left:.1em;color:#fff;
  background:linear-gradient(180deg,#ffffff 0%,#ffffff 46%,#cdeeff 50%,#e9f9ff 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;
  filter:drop-shadow(0 2px 0 rgba(30,110,200,.35)) drop-shadow(0 8px 18px rgba(0,50,140,.35))}
.ae-intro .t2{margin-top:14px;font:400 clamp(13px,1.3vw,15px) "M PLUS Rounded 1c",sans-serif;letter-spacing:.42em;padding-left:.42em;color:rgba(255,255,255,.92);text-shadow:0 1px 4px rgba(0,50,120,.6)}
.ae-intro .t3{margin-top:28px;font:500 clamp(16px,1.8vw,21px) "Zen Kaku Gothic New",sans-serif;letter-spacing:.16em;color:#fff;text-shadow:0 1px 3px rgba(0,40,110,.7),0 0 18px rgba(0,60,160,.35);opacity:0;transition:opacity 2.4s ease 1.6s}
.ae-intro.on .t3{opacity:1}
.ae-hint{position:absolute;left:50%;bottom:11%;transform:translateX(-50%);z-index:4;font:700 14px "M PLUS Rounded 1c",sans-serif;letter-spacing:.3em;color:#fff;text-shadow:0 1px 2px rgba(0,30,10,.85),0 0 12px rgba(0,40,20,.6);opacity:0;transition:opacity 1.5s;pointer-events:none;white-space:nowrap}
.ae-hint.on{opacity:1;animation:ae-breathe 3s ease-in-out infinite}
@keyframes ae-breathe{0%,100%{opacity:.45}50%{opacity:1}}

/* ── desktop ── */
.ae-desk{position:absolute;inset:0;z-index:5;opacity:0;pointer-events:none;transition:opacity .8s}
.ae-desk.on{opacity:1;pointer-events:auto}
.ae-desk.gray{filter:grayscale(1) brightness(.92);transition:filter 1.6s ease,opacity .8s}
.ae-field{position:absolute;left:0;top:0;right:0;bottom:92px;touch-action:none}
.ae-ico{position:absolute;width:106px;display:flex;flex-direction:column;align-items:center;padding:3px 2px 4px;text-align:center;border-radius:3px;touch-action:none;transition:opacity .4s, transform .4s}
.ae-ico.pre{opacity:0;transform:translateY(6px)}
.ae-ico .im{width:48px;height:48px;position:relative;pointer-events:none}
.ae-ico .im img{width:48px;height:48px;display:block;filter:drop-shadow(1px 2px 1px rgba(0,30,80,.25))}
.ae-ico .im::after{content:"";position:absolute;inset:0;background:rgba(18,72,210,.5);-webkit-mask:var(--m) center/contain no-repeat;mask:var(--m) center/contain no-repeat;opacity:0}
.ae-ico.sel .im::after{opacity:1}
.ae-ico .lb{margin-top:3px;color:#fff;font-size:13px;line-height:1.25;padding:1px 3px 2px;max-width:106px;word-break:keep-all;overflow-wrap:anywhere;pointer-events:none;
  text-shadow:1px 1px 1px rgba(0,0,0,.95),0 0 4px rgba(0,0,0,.45)}
.ae-ico.sel .lb{background:#0b55d8;text-shadow:none}
.ae-ico.drag{opacity:.6}
.ae-sel{position:absolute;border:1px solid #3a7cdc;background:rgba(40,110,230,.22);pointer-events:none;z-index:2}
.ae-wins{position:absolute;left:0;top:0;right:0;bottom:40px;pointer-events:none;z-index:6}
.ae-wins > *{pointer-events:auto}

/* ── windows ── */
.ae-win{position:absolute;display:flex;flex-direction:column;border-radius:9px 9px 4px 4px;padding:0 4px 4px;min-width:200px;min-height:96px;
  background:linear-gradient(180deg,#2a78f0,#0d55db 40%,#0b4fd2);box-shadow:0 14px 34px rgba(0,25,80,.32),0 2px 6px rgba(0,25,80,.25),0 0 0 1px rgba(0,30,120,.55);
  animation:ae-open .16s cubic-bezier(.2,.9,.3,1)}
@keyframes ae-open{from{opacity:0;transform:scale(.965)}}
.ae-win.closing{animation:ae-close .14s ease-in forwards}
@keyframes ae-close{to{opacity:0;transform:scale(.97)}}
.ae-win .tb{height:31px;flex:none;display:flex;align-items:center;gap:6px;padding:0 4px 0 7px;margin:0 -4px;border-radius:9px 9px 0 0;position:relative;touch-action:none;
  background:linear-gradient(180deg,#6cb2ff 0%,#2f84f7 7%,#1566ea 38%,#0b57e0 52%,#0a53dc 86%,#0a47c2 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,.35)}
.ae-win .tb::before{content:"";position:absolute;left:5px;right:5px;top:2px;height:13px;border-radius:7px 7px 12px 12px/7px 7px 5px 5px;pointer-events:none;
  background:linear-gradient(rgba(255,255,255,.5),rgba(255,255,255,.06))}
.ae-win .ti{width:16px;height:16px;flex:none;position:relative}
.ae-win .tt{flex:1;min-width:0;color:#fff;font:bold 14px "Trebuchet MS","Zen Kaku Gothic New",sans-serif;letter-spacing:.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:1px 1px 1px #0a1d6a;position:relative}
.ae-win .wbs{display:flex;gap:2px;position:relative}
.ae-win .wb{width:23px;height:23px;border-radius:4px;border:1px solid #fff;padding:0;position:relative;
  background:radial-gradient(circle at 30% 25%,rgba(255,255,255,.55),rgba(255,255,255,0) 55%),linear-gradient(135deg,#5ea0ff,#1c63ea 55%,#2d78f4);box-shadow:inset 0 0 0 1px rgba(255,255,255,.18)}
.ae-win .wb:hover{filter:brightness(1.14) saturate(1.1)}
.ae-win .wb:active{filter:brightness(.88)}
.ae-win .wb.wcls{background:radial-gradient(circle at 30% 25%,rgba(255,255,255,.5),rgba(255,255,255,0) 55%),linear-gradient(135deg,#f6a283,#e2532c 55%,#d4431e)}
.ae-win .wb::before,.ae-win .wb::after{content:"";position:absolute;background:#fff}
.ae-win .wmin::before{left:5px;bottom:5px;width:8px;height:3px}
.ae-win .wmin::after{display:none}
.ae-win .wmax::before{left:4px;top:4px;width:13px;height:13px;background:none;border:2px solid #fff;border-top-width:3px}
.ae-win .wmax::after{display:none}
.ae-win.max .wmax::before{left:7px;top:3px;width:9px;height:9px;border-width:1px;border-top-width:2px}
.ae-win.max .wmax::after{display:block;left:3px;top:7px;width:9px;height:9px;background:#2a70ee;border:1px solid #fff;border-top-width:2px}
.ae-win .wcls::before,.ae-win .wcls::after{left:10px;top:3px;width:2px;height:15px;border-radius:1px}
.ae-win .wcls::before{transform:rotate(45deg)}
.ae-win .wcls::after{transform:rotate(-45deg)}
.ae-win:not(.act){background:linear-gradient(180deg,#9db7f0,#7d9de6)}
.ae-win:not(.act) .tb{background:linear-gradient(180deg,#b9cff8 0%,#98b5f0 10%,#86a5ea 50%,#7f9fe8 100%)}
.ae-win:not(.act) .tt{color:#dbe6fb;text-shadow:none}
.ae-win:not(.act) .wb{filter:saturate(.45) brightness(1.1);opacity:.85}
.ae-win.max{border-radius:0;padding:0 0 0}
.ae-win.max .tb{border-radius:0;margin:0}
.ae-win.max .wbs{margin-right:142px}
.ae-win .bd{flex:1;min-height:0;background:#ece9d8;position:relative;display:flex;flex-direction:column;overflow:hidden}
.ae-win .rg{position:absolute;right:4px;bottom:4px;width:15px;height:15px;cursor:nwse-resize;touch-action:none;z-index:3;
  background:radial-gradient(circle,#a7a294 1.2px,transparent 1.6px) 0 0/5px 5px;-webkit-mask:linear-gradient(135deg,transparent 50%,#000 50%);mask:linear-gradient(135deg,transparent 50%,#000 50%)}
.ae-win.max .rg{display:none}
.ae-win.shake{animation:ae-shake .5s linear}
@keyframes ae-shake{0%,100%{translate:0 0}10%{translate:-7px 2px}20%{translate:6px -3px}30%{translate:-6px -2px}40%{translate:7px 3px}50%{translate:-5px 2px}60%{translate:5px -2px}70%{translate:-4px 1px}80%{translate:3px -1px}90%{translate:-2px 0}}
.ae-mb{display:flex;flex:none;flex-wrap:wrap;padding:1px 2px;background:#ece9d8;border-bottom:1px solid #d8d2bd;font-size:13px}
.ae-mb span{padding:2px 8px;border-radius:2px}
.ae-mb span:hover,.ae-mb span.on{background:#316ac5;color:#fff}
.ae-sb{flex:none;display:flex;gap:2px;padding:2px 3px;background:#ece9d8;border-top:1px solid #d8d2bd;font-size:13px;color:#222}
.ae-sb > div{padding:1px 6px;border:1px solid;border-color:#c9c3ae #fff #fff #c9c3ae;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

/* XP-ish controls */
.ae-btn{min-width:84px;height:27px;padding:0 12px;font:13px Tahoma,"Zen Kaku Gothic New",sans-serif;border:1px solid #003c74;border-radius:3px;color:#000;
  background:linear-gradient(180deg,#ffffff,#f3f2ec 50%,#e8e6dc 86%,#d6d0c3);box-shadow:inset 0 -1px 0 rgba(0,0,0,.05)}
.ae-btn:hover{box-shadow:inset 0 1px 0 #fff3cf,inset 0 0 0 2px #f8b33a}
.ae-btn.def{box-shadow:inset 0 0 0 2px #9ab9ec}
.ae-btn.def:hover{box-shadow:inset 0 1px 0 #fff3cf,inset 0 0 0 2px #f8b33a}
.ae-btn:active{background:linear-gradient(180deg,#e2e0d6,#f1efe8)}
.ae-btn[disabled]{color:#aca899;border-color:#c9c7ba;box-shadow:none;background:#f5f4ea}
.ae-in{height:25px;border:1px solid #7f9db9;background:#fff;padding:2px 5px;font:13px Tahoma,"Zen Kaku Gothic New",sans-serif;color:#000;outline:none;border-radius:0}
.ae-in:focus{border-color:#4a7fd8}
.aero textarea.ae-in{height:auto;resize:none}

/* message boxes */
.ae-msg .bd{padding:16px 16px 12px}
.ae-msg .mrow{display:flex;gap:14px;align-items:flex-start}
.ae-msg .mrow img{flex:none}
.ae-msg .mtx{font-size:13px;line-height:1.7;padding-top:2px;-webkit-user-select:text;user-select:text}
.ae-msg .mtx p{margin:0 0 .5em}
.ae-msg .mtx small{display:block;color:#5a5a50;font-size:13px;margin-top:6px}
.ae-msg .mbtns{display:flex;justify-content:center;gap:8px;margin-top:16px;flex-wrap:wrap}

/* context menus */
.ae-cm{position:absolute;z-index:80;background:#fff;border:1px solid #8a867a;box-shadow:2px 3px 7px rgba(0,0,0,.35);padding:2px;min-width:190px;font-size:13px;animation:ae-fade .1s}
@keyframes ae-fade{from{opacity:0}}
.ae-cm .it{padding:4px 26px 4px 24px;white-space:nowrap;position:relative;border-radius:1px}
.ae-cm .it:hover,.ae-cm .it.on{background:#316ac5;color:#fff}
.ae-cm .it.b{font-weight:bold}
.ae-cm .it.dis{color:#aca899}
.ae-cm .it.dis:hover{background:none;color:#aca899}
.ae-cm .it.chk::before{content:"✓";position:absolute;left:8px}
.ae-cm .it.sub::after{content:"";position:absolute;right:8px;top:50%;margin-top:-4px;border:4px solid transparent;border-left:5px solid currentColor;border-right:0}
.ae-cm .it img{position:absolute;left:4px;top:50%;margin-top:-8px}
.ae-cm .sep{height:1px;background:#d6d2c2;margin:3px 2px}

/* ── taskbar ── */
.ae-tbar{position:absolute;left:0;right:0;bottom:0;height:40px;z-index:40;display:flex;align-items:stretch;transform:translateY(42px);transition:transform .45s cubic-bezier(.2,.9,.3,1);
  background:linear-gradient(180deg,#3d8ff7 0%,#2a76ec 6%,#1f62dc 30%,#1d5ad6 70%,#1a50c8 100%);box-shadow:inset 0 1px 0 #6aaeff,0 -1px 0 #0b2e8e}
.ae-tbar.on{transform:none}
.ae-tbar::before{content:"";position:absolute;left:0;right:0;top:1px;height:17px;background:linear-gradient(rgba(255,255,255,.22),rgba(255,255,255,0));pointer-events:none}
.ae-start{position:relative;display:flex;align-items:center;gap:7px;padding:0 22px 0 12px;margin-right:8px;border:0;border-radius:0 16px 16px 0;flex:none;
  color:#fff;font:italic bold 18px "Trebuchet MS","M PLUS Rounded 1c",sans-serif;letter-spacing:.04em;text-shadow:1px 1px 2px rgba(0,40,0,.65);
  background:radial-gradient(ellipse 60% 70% at 30% 0%,rgba(255,255,255,.55),rgba(255,255,255,0) 70%),linear-gradient(180deg,#5cc85a 0%,#3daa3a 45%,#2f962c 52%,#36a433 100%);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.45),inset -2px 0 3px rgba(0,60,0,.35),2px 0 6px rgba(0,30,90,.4)}
.ae-start:hover{filter:brightness(1.1)}
.ae-start.on{filter:brightness(.88) saturate(1.1)}
.ae-start img{width:24px;height:24px;filter:drop-shadow(1px 1px 1px rgba(0,40,0,.5))}
.ae-tasks{flex:1;display:flex;gap:4px;align-items:center;min-width:0;padding:0 4px;overflow:hidden}
.ae-task{flex:0 1 180px;min-width:40px;height:30px;display:flex;align-items:center;gap:6px;padding:0 9px;border:0;border-radius:4px;color:#fff;font-size:13px;white-space:nowrap;
  background:linear-gradient(180deg,#5aa6ff,#3d89f7 45%,#2f7bef);box-shadow:inset 0 0 0 1px rgba(0,30,120,.5),inset 0 1px 0 rgba(255,255,255,.45)}
.ae-task span{overflow:hidden;text-overflow:ellipsis}
.ae-task img{width:16px;height:16px;flex:none}
.ae-task:hover{filter:brightness(1.1)}
.ae-task.on{background:linear-gradient(180deg,#1648b8,#1d55c8 50%,#1e5ad0);box-shadow:inset 1px 1px 2px rgba(0,0,40,.6),inset 0 0 0 1px rgba(0,20,90,.6)}
.ae-task.flash{animation:ae-flash 1s steps(1) infinite}
@keyframes ae-flash{0%{background:linear-gradient(180deg,#ffb15a,#f08a1a)}50%{background:linear-gradient(180deg,#5aa6ff,#2f7bef)}}
.ae-tray{flex:none;display:flex;align-items:center;gap:8px;padding:0 12px;margin-left:4px;color:#fff;font-size:13px;
  background:linear-gradient(180deg,#25a2f5,#1490ec 45%,#0f86e6);border-left:1px solid #0b58b6;box-shadow:inset 1px 0 0 #4fc0ff,inset 0 1px 0 #6fd0ff}
.ae-tray img{width:16px;height:16px;display:block}
.ae-tray .ti{padding:3px;border-radius:3px}
.ae-tray .ti:hover{background:rgba(255,255,255,.18)}
.ae-clock{padding:0 2px 0 4px;text-shadow:1px 1px 1px rgba(0,40,120,.6);white-space:nowrap}

/* balloons + toasts */
.ae-balloon{position:absolute;z-index:45;right:16px;bottom:102px;width:min(340px,calc(100% - 24px));background:#ffffe1;border:1px solid #2d2d2d;border-radius:9px;padding:10px 30px 11px 12px;
  box-shadow:2px 4px 10px rgba(0,0,0,.3);font-size:13px;line-height:1.55;color:#000;animation:ae-pop .22s cubic-bezier(.2,.9,.3,1.2)}
@keyframes ae-pop{from{opacity:0;transform:translateY(6px) scale(.97)}}
.ae-balloon::after{content:"";position:absolute;right:38px;bottom:-12px;border:12px solid transparent;border-top-color:#2d2d2d;border-bottom:0;border-left-width:0}
.ae-balloon::before{content:"";position:absolute;right:39px;bottom:-10px;border:11px solid transparent;border-top-color:#ffffe1;border-bottom:0;border-left-width:0;z-index:1}
.ae-balloon .bt{display:flex;gap:7px;align-items:center;font-weight:bold;margin-bottom:3px}
.ae-balloon .bx{position:absolute;right:7px;top:7px;width:17px;height:17px;border:1px solid #9a9a8a;border-radius:3px;background:#fff;font-size:12px;line-height:14px;text-align:center;color:#555}
.ae-balloon .bx:hover{border-color:#e2532c;color:#e2532c}
.ae-balloon.out{transition:opacity .3s;opacity:0}
.ae-toast{position:absolute;z-index:44;right:16px;bottom:100px;width:min(240px,calc(100% - 24px));border-radius:7px;overflow:hidden;cursor:pointer;
  background:linear-gradient(180deg,#f4fbff,#d8ecff);border:1px solid #6d9ad8;box-shadow:0 -2px 12px rgba(0,30,90,.3);transform:translateY(120%);transition:transform .5s cubic-bezier(.2,.9,.3,1)}
.ae-toast.on{transform:none}
.ae-toast .th{height:22px;padding:2px 8px;color:#fff;font-size:13px;background:linear-gradient(180deg,#5fb6ff,#2a7ae8);display:flex;align-items:center;gap:6px}
.ae-toast .tc{padding:10px 12px 12px;display:flex;gap:10px;align-items:center;font-size:13px;line-height:1.5;color:#123}
.ae-toast .tc img{width:32px;height:32px;flex:none}

/* ── start menu ── */
.ae-sm{position:absolute;left:0;bottom:40px;z-index:60;width:min(410px,100%);border-radius:8px 8px 0 0;overflow:hidden;display:none;flex-direction:column;
  box-shadow:3px 0 14px rgba(0,20,70,.45),0 0 0 1px #0b3fae;background:#1b5fd8;transform-origin:0 100%}
.ae-sm.on{display:flex;animation:ae-smin .14s ease-out}
@keyframes ae-smin{from{opacity:0;transform:translateY(8px)}}
.ae-sm .smh{display:flex;align-items:center;gap:10px;padding:7px 10px;color:#fff;font:bold 16px "Trebuchet MS","Zen Kaku Gothic New",sans-serif;text-shadow:1px 1px 2px rgba(0,20,80,.7);
  background:linear-gradient(180deg,#2f86f0,#1462dc 40%,#0e55d0);border-bottom:2px solid;border-image:linear-gradient(90deg,rgba(255,255,255,0),#ffb04d 30%,#ffb04d 70%,rgba(255,255,255,0)) 1}
.ae-sm .smh img{width:46px;height:46px;border:2px solid #f0f4ff;border-radius:4px;box-shadow:0 1px 3px rgba(0,0,0,.4);background:#fff}
.ae-sm .smb{display:flex;background:#fff;max-height:calc(100vh - 150px);overflow:auto}
.ae-sm .sml{flex:1.12;padding:6px 0;display:flex;flex-direction:column;min-width:0}
.ae-sm .smr{flex:1;padding:6px 0;background:#d6e6fb;border-left:1px solid #9ac0f0;min-width:0}
.ae-sm .si{display:flex;align-items:center;gap:8px;padding:4px 10px;font-size:13px;color:#1a1a1a;min-height:34px}
.ae-sm .si img{flex:none}
.ae-sm .si b{display:block;font-weight:bold}
.ae-sm .si small{display:block;color:#6a6a6a;font-size:13px}
.ae-sm .si:hover{background:#316ac5;color:#fff}
.ae-sm .si:hover small{color:#dfe8fa}
.ae-sm .smr .si{color:#0b2a6a;min-height:30px}
.ae-sm .smr .si.b{font-weight:bold}
.ae-sm .smr .si:hover{color:#fff}
.ae-sm .ssep{height:1px;margin:5px 10px;background:linear-gradient(90deg,rgba(0,0,0,0),#c3c3c3,rgba(0,0,0,0))}
.ae-sm .smr .ssep{background:linear-gradient(90deg,rgba(0,0,0,0),#9fbbe2,rgba(0,0,0,0))}
.ae-sm .all{margin-top:auto;justify-content:center;font-weight:bold}
.ae-sm .smf{display:flex;justify-content:flex-end;gap:6px;padding:6px 8px;background:linear-gradient(180deg,#2f86f0,#1462dc 40%,#0e55d0)}
.ae-sm .smf .si{color:#fff;min-height:30px;border-radius:3px;padding:3px 8px}
.ae-sm .smf .si:hover{background:rgba(255,255,255,.18)}

/* ── welcome / power screens ── */
.ae-login{position:absolute;inset:0;z-index:70;display:flex;flex-direction:column;opacity:0;pointer-events:none;transition:opacity 1.4s ease}
.ae-login.on{opacity:1;pointer-events:auto}
.ae-login .lt{flex:0 0 13%;background:linear-gradient(180deg,rgba(0,40,150,.95),rgba(6,58,176,.92));position:relative}
.ae-login .lt::after,.ae-login .lb2::before{content:"";position:absolute;left:0;right:0;height:2px;background:linear-gradient(90deg,rgba(130,170,255,0),#9ec2ff 25%,#fff 50%,#9ec2ff 75%,rgba(130,170,255,0))}
.ae-login .lt::after{bottom:0}
.ae-login .lm{flex:1;position:relative;display:flex;align-items:center;justify-content:center;gap:0;
  background:radial-gradient(ellipse 70% 60% at 12% 8%,rgba(150,190,250,.86),rgba(150,190,250,0) 60%),linear-gradient(180deg,rgba(84,132,226,.84),rgba(68,113,208,.86));
  -webkit-backdrop-filter:blur(8px) saturate(1.2);backdrop-filter:blur(8px) saturate(1.2)}
.ae-login .lb2{flex:0 0 13%;position:relative;display:flex;align-items:center;justify-content:space-between;padding:0 max(130px,4%) 0 4%;color:#fff;
  background:linear-gradient(180deg,rgba(36,82,200,.95),rgba(14,52,170,.96));gap:16px}
.ae-login .lb2::before{top:0;background:linear-gradient(90deg,rgba(255,170,80,0),#ffb15a 30%,#ffe2b0 50%,#ffb15a 70%,rgba(255,170,80,0))}
.ae-login .ll{flex:1;display:flex;flex-direction:column;align-items:flex-end;padding:0 5%;text-align:right;color:#fff}
.ae-login .logo{display:flex;align-items:center;gap:10px}
.ae-login .logo img{width:56px;height:56px;filter:drop-shadow(0 3px 6px rgba(0,30,100,.45))}
.ae-login .logo b{display:block;font:bold italic clamp(26px,3.4vw,40px)/1 "Trebuchet MS",sans-serif;letter-spacing:-.01em;text-shadow:0 2px 4px rgba(0,20,90,.45)}
.ae-login .logo small{display:block;font:bold clamp(13px,1.3vw,16px) "Trebuchet MS",sans-serif;color:#ffcf6a;text-align:left;letter-spacing:.08em;margin-top:2px}
.ae-login .ins{margin-top:22px;font-size:clamp(14px,1.4vw,17px);color:#fff;text-shadow:0 1px 2px rgba(0,20,80,.5)}
.ae-login .div{width:2px;align-self:stretch;margin:7% 0;background:linear-gradient(180deg,rgba(255,255,255,0),rgba(255,255,255,.75) 30%,rgba(255,255,255,.75) 70%,rgba(255,255,255,0))}
.ae-login .lr{flex:1;padding:0 4%;display:flex;flex-direction:column;align-items:flex-start;gap:10px}
.ae-user{display:flex;align-items:center;gap:16px;padding:10px 48px 10px 10px;border-radius:10px;cursor:pointer;color:#fff;transition:background .25s;position:relative}
.ae-user .pic{width:78px;height:78px;border-radius:7px;border:2px solid rgba(255,255,255,.75);box-shadow:0 2px 8px rgba(0,20,90,.4);opacity:.78;transition:opacity .25s,border-color .25s,transform .25s}
.ae-user .nm{font:clamp(18px,2vw,23px) Tahoma,"Zen Kaku Gothic New",sans-serif;text-shadow:0 1px 2px rgba(0,20,80,.5)}
.ae-user .sub{font-size:13px;color:#d9e6ff;margin-top:4px;opacity:0;transition:opacity .4s}
.ae-user:hover,.ae-user.go{background:linear-gradient(90deg,rgba(0,40,140,.6),rgba(0,40,140,0))}
.ae-user:hover .pic,.ae-user.go .pic{opacity:1;border-color:#ffd27a}
.ae-user.go .sub{opacity:1}
.ae-login .pw{display:flex;align-items:center;gap:10px;font-size:14px;cursor:pointer;padding:6px 10px 6px 6px;border-radius:5px;margin-left:min(170px,30vw)}
.ae-login .pw:hover{background:rgba(255,255,255,.12)}
.ae-login .pw img{width:30px;height:30px}
.ae-login .note{font-size:13px;color:#cfdcff;max-width:380px;text-align:right;line-height:1.55}
.ae-login .welcome{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;opacity:0;pointer-events:none;transition:opacity .6s}
.ae-login.wel .welcome{opacity:1}
.ae-login.wel .ll,.ae-login.wel .lr,.ae-login.wel .div,.ae-login.wel .pw,.ae-login.wel .note{opacity:0;transition:opacity .4s}
.ae-login .welcome b{font:italic bold clamp(42px,6vw,76px) "Zen Kaku Gothic New",sans-serif;color:#fff;letter-spacing:.06em;text-shadow:0 3px 12px rgba(0,20,90,.45)}
.ae-login .welcome > span{margin-top:14px;font-size:15px;color:#e3ecff;letter-spacing:.1em}
@media (max-width:640px){
  .ae-login .lm{flex-direction:column;gap:18px}
  .ae-login .ll{align-items:center;text-align:center;flex:none}
  .ae-login .div{width:60%;height:2px;align-self:center;margin:0;background:linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.75),rgba(255,255,255,0))}
  .ae-login .lr{flex:none;align-items:center}
  .ae-login .note{display:none}
  .ae-login .lb2{justify-content:flex-end}
  .ae-login .pw{margin-left:0}
  .ae-login .pw span{display:none}
  .ae-user{padding:10px 22px 10px 10px}
}

.ae-pwr{position:absolute;inset:0;z-index:90;display:none}
.ae-pwr.on{display:block}
.ae-boot{position:absolute;inset:0;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:34px;color:#fff}
.ae-boot .logo{display:flex;align-items:center;gap:12px}
.ae-boot .logo img{width:62px;height:62px}
.ae-boot .logo b{font:bold italic 40px "Trebuchet MS",sans-serif}
.ae-boot .logo small{display:block;color:#ffb347;font:bold 16px "Trebuchet MS",sans-serif;letter-spacing:.1em}
.ae-boot .trough{width:150px;height:18px;border:2px solid #b2b2b2;border-radius:4px;position:relative;overflow:hidden;padding:2px}
.ae-boot .trough i{position:absolute;top:3px;width:9px;height:10px;border-radius:2px;background:linear-gradient(180deg,#b6dcff,#2a6ae8 50%,#1d4fd0);animation:ae-blocks 2s linear infinite}
.ae-boot .trough i:nth-child(2){animation-delay:.13s}
.ae-boot .trough i:nth-child(3){animation-delay:.26s}
@keyframes ae-blocks{from{left:-30px}to{left:160px}}
.ae-boot .cr{position:absolute;left:24px;bottom:22px;font-size:13px;color:#8a8a8a}
.ae-boot .cr2{position:absolute;right:24px;bottom:22px;font:italic bold 15px "Trebuchet MS",sans-serif;color:#cfcfcf}
.ae-dlg{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:3}
.ae-dlg .sd{width:min(400px,calc(100% - 24px));border-radius:6px;overflow:hidden;box-shadow:0 18px 40px rgba(0,0,0,.45);animation:ae-pop .2s}
.ae-dlg .sdh{height:52px;display:flex;align-items:center;justify-content:space-between;padding:0 14px;color:#fff;font:15px "Trebuchet MS","Zen Kaku Gothic New",sans-serif;background:linear-gradient(180deg,#0b3fae,#08349a)}
.ae-dlg .sdh img{width:34px;height:34px}
.ae-dlg .sdm{display:flex;justify-content:space-around;padding:26px 10px 20px;background:linear-gradient(180deg,#7ea4ec,#5d86de 30%,#4f78d4);
  border-top:2px solid;border-bottom:2px solid;border-image:linear-gradient(90deg,rgba(255,255,255,0),#fff,rgba(255,255,255,0)) 1}
.ae-dlg .opt{display:flex;flex-direction:column;align-items:center;gap:8px;color:#fff;font-size:13px;cursor:pointer;text-shadow:0 1px 2px rgba(0,20,80,.5);width:92px;text-align:center}
.ae-dlg .opt img{width:46px;height:46px;transition:transform .15s,filter .15s}
.ae-dlg .opt:hover img{transform:translateY(-2px);filter:brightness(1.15) drop-shadow(0 0 8px rgba(255,255,255,.6))}
.ae-dlg .sdf{display:flex;justify-content:flex-end;padding:10px 14px;background:linear-gradient(180deg,#0b3fae,#08349a)}
.ae-dlg .sdf .ae-btn{min-width:84px}
.ae-safe{position:absolute;inset:0;background:#000;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .8s}
.ae-safe.on{opacity:1}
.ae-safe canvas{width:100%;height:100%;image-rendering:pixelated;display:block}
.ae-bezel{position:absolute;left:0;right:0;bottom:0;height:64px;display:flex;align-items:center;justify-content:flex-end;gap:16px;padding:0 max(160px,8%) 0 24px;
  background:linear-gradient(180deg,#5a5c62,#3a3c41 18%,#2b2c30 60%,#232427);box-shadow:inset 0 2px 0 rgba(255,255,255,.12),0 -6px 18px rgba(0,0,0,.6);
  transform:translateY(100%);transition:transform 1.1s cubic-bezier(.2,.9,.3,1);z-index:2}
.ae-bezel.on{transform:none}
.ae-bezel .brand{margin-right:auto;font:bold 15px "Trebuchet MS",sans-serif;letter-spacing:.32em;color:#9a9ca4;text-shadow:0 -1px 0 #111,0 1px 0 #666}
.ae-bezel .model{font:13px Tahoma,sans-serif;color:#8a8c94;letter-spacing:.12em}
.ae-bezel .led{width:9px;height:9px;border-radius:50%;background:#2aff6a;box-shadow:0 0 6px 2px rgba(60,255,120,.7)}
.ae-bezel .led.off{background:#1f3a25;box-shadow:none}
.ae-bezel .pbtn{width:44px;height:44px;border-radius:50%;border:0;padding:0;position:relative;cursor:pointer;
  background:radial-gradient(circle at 40% 30%,#8a8d95,#3e4046 60%,#26272b);box-shadow:inset 0 2px 1px rgba(255,255,255,.25),inset 0 -3px 4px rgba(0,0,0,.6),0 2px 4px rgba(0,0,0,.7)}
.ae-bezel .pbtn::before{content:"";position:absolute;left:13px;top:13px;width:14px;height:14px;border:2.5px solid #c9ccd4;border-top-color:transparent;border-radius:50%}
.ae-bezel .pbtn::after{content:"";position:absolute;left:20px;top:9px;width:2.5px;height:11px;background:#c9ccd4;border-radius:2px}
.ae-bezel .pbtn:hover{filter:brightness(1.2)}
.ae-bezel .pbtn:active{transform:translateY(1px);box-shadow:inset 0 2px 5px rgba(0,0,0,.7)}
.ae-bezel .phint{font-size:13px;color:#b9bcc4;letter-spacing:.08em;opacity:0;transition:opacity 1.2s}
.ae-bezel .phint.on{opacity:1;animation:ae-breathe 2.6s ease-in-out infinite}
.ae-dot{position:absolute;inset:0;pointer-events:none}
.ae-end{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;z-index:4}
.ae-end .e1{font:500 clamp(20px,2.6vw,30px) "Zen Kaku Gothic New",sans-serif;letter-spacing:.24em;color:#fff6ea;text-shadow:0 2px 14px rgba(80,30,40,.6);opacity:0;transition:opacity 3s;pointer-events:auto;margin-top:-12vh}
.ae-end .e1.on{opacity:1}
.ae-end .eb{margin-top:34px;pointer-events:auto;opacity:0;transition:opacity 2s;display:flex;align-items:center;gap:8px;padding:8px 18px 8px 10px;border-radius:999px;border:1px solid rgba(255,255,255,.55);
  color:#fff;font:14px "M PLUS Rounded 1c",sans-serif;letter-spacing:.12em;cursor:pointer;
  background:linear-gradient(180deg,rgba(255,255,255,.38),rgba(255,255,255,.08) 50%,rgba(255,255,255,.16));box-shadow:0 4px 16px rgba(60,20,40,.35),inset 0 1px 0 rgba(255,255,255,.6);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
.ae-end .eb.on{opacity:1}
.ae-end .eb:hover{background:linear-gradient(180deg,rgba(255,255,255,.5),rgba(255,255,255,.14) 50%,rgba(255,255,255,.24))}
.ae-end .eb img{width:22px;height:22px}
.ae-standby{position:absolute;inset:0;background:#000;opacity:0;transition:opacity 1.2s;cursor:pointer}
.ae-standby.on{opacity:1}
.ae-saver{position:absolute;inset:0;z-index:85;width:100%;height:100%;display:block;cursor:none}

@media (max-width:640px){
  .ae-start{font-size:16px;padding:0 16px 0 9px}
  .ae-tray{gap:5px;padding:0 8px}
  .ae-tray .opt{display:none}
  .ae-task{flex:0 1 44px;padding:0 6px}
  .ae-task span{display:none}
  .ae-balloon,.ae-toast{right:8px}
  .ae-balloon::after{right:60px}.ae-balloon::before{right:61px}
}
@media (prefers-reduced-motion:reduce){
  .ae-win,.ae-sm.on,.ae-balloon{animation:none}
}
`;
