// Welcome, log off, restart, standby — and the shutdown, which is where this world keeps its light.
import { h, clamp } from './util.js';
import { iconURL, iconImg } from './icons.js';
import { playMusicBox } from './song.js';

export function createPower(A) {
  const { ctx, root } = A;
  const pwr = h('div', 'ae-pwr');
  root.appendChild(pwr);

  // ── the welcome screen ──
  const login = h('div', 'ae-login', '');
  const paintLogin = () => {
    const wel = login.classList.contains('wel'), go = login.querySelector('.ae-user.go');
    const loading = A.L('[個人|こじん|personal][設定|せってい|settings]を[読|よ|to read]み[込|こ|to load]んでいます...', 'Loading your personal settings...');
    login.innerHTML = `
    <div class="lt"></div>
    <div class="lm">
      <div class="ll"><div class="logo"><img src="${iconURL('drop', 56)}" alt=""><div><b>HIKARI</b><small>Aqua 2004</small></div></div>
        <div class="ins">${A.L('はじめるには、ユーザー[名|めい|name]をクリックしてください', 'To begin, click your user name')}</div></div>
      <div class="div"></div>
      <div class="lr"><div class="ae-user${go ? ' go' : ''}" tabindex="0"><img class="pic" src="${iconURL('userpic', 80)}" alt=""><div><div class="nm">devansh</div><div class="sub">${loading}</div></div></div></div>
      <div class="welcome"><b>${A.T('ようこそ', 'welcome')}</b><span>${loading}</span></div>
    </div>
    <div class="lb2"><div class="pw" title="${A.T('コンピュータの電源を切る', 'Turn off computer')}">${iconImg('power', 30)}<span>${A.T('コンピュータの電源を切る', 'Turn off computer')}</span></div>
      <div class="note">${A.L('ログオン[後|ご|after]、ユーザー アカウントを[追加|ついか|add]または[変更|へんこう|change]するには、[コントロール パネル] の [ユーザー アカウント] をクリックしてください。', 'After you log on, you can add or change accounts. Just go to Control Panel and click User Accounts.')}</div></div>`;
    if (wel) login.classList.add('wel');
  };
  paintLogin();
  root.appendChild(login);
  let loginResolve = null;
  const userEl = () => login.querySelector('.ae-user');
  login.addEventListener('click', (e) => {
    if (e.target.closest('.ae-user')) {
      if (!loginResolve) return;
      const r = loginResolve; loginResolve = null;
      A.sfx.click();
      userEl().classList.add('go');
      r();
    } else if (e.target.closest('.pw')) {
      if (loginResolve) { A.sfx.click(); shutdownDialog(true); }
    }
  }, { signal: ctx.signal });
  login.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.closest('.ae-user')) e.target.click(); }, { signal: ctx.signal });

  function showLogin() {
    A.phase = 'login';
    login.classList.remove('wel');
    if (userEl()) userEl().classList.remove('go');
    login.classList.add('on');
    ctx.exitVisible(true);
    return new Promise((res) => { loginResolve = res; });
  }
  async function welcome() {
    await wait(900);
    login.classList.add('wel');
    await wait(500);
    A.sfx.chime();
    await wait(1700);
    login.classList.remove('on');
    A.enterDesktop();
  }
  async function loginFlow() {
    await showLogin();
    await welcome();
  }

  // ── screens ──
  const wait = (ms) => new Promise((r) => ctx.timeout(r, ms));
  function blueScreen(text) {
    if (Array.isArray(text)) text = A.en ? text[1] : text[0];
    pwr.innerHTML = '';
    const el = h('div', 'ae-login on', `<div class="lt"></div><div class="lm"><div class="welcome" style="opacity:1"><b style="font-size:clamp(26px,3.4vw,40px)">${A.jp(text)}</b></div></div><div class="lb2"></div>`);
    el.style.transition = 'none';
    el.querySelector('.lm').style.backdropFilter = 'none';
    el.querySelector('.lm').style.background = 'linear-gradient(180deg,#5a86da,#4a74cc)';
    pwr.appendChild(el);
    pwr.classList.add('on');
    return el;
  }
  function blackout() { pwr.innerHTML = '<div class="ae-boot"></div>'; pwr.classList.add('on'); }
  function clearPwr() { pwr.classList.remove('on'); pwr.innerHTML = ''; }

  async function boot() {
    A.phase = 'boot';
    pwr.innerHTML = `<div class="ae-boot"><div class="logo"><img src="${iconURL('drop', 62)}" alt=""><div><b>HIKARI</b><small>Aqua 2004</small></div></div><div class="trough"><i></i><i></i><i></i></div>
      <div class="cr">Copyright © 2004 ${A.T('ひかり線', 'Hikari Line')}</div><div class="cr2">HIKARI</div></div>`;
    pwr.classList.add('on');
    A.sfx.degauss();
    ctx.crt(0.5);
    await wait(3600);
    ctx.crt(0);
    clearPwr();
    A.resetForLogin();
    loginFlow();
  }

  function standby() {
    A.phase = 'standby';
    const el = h('div', 'ae-standby');
    pwr.innerHTML = '';
    pwr.appendChild(el);
    pwr.classList.add('on');
    A.sfx.crtOff();
    requestAnimationFrame(() => el.classList.add('on'));
    ctx.timeout(() => {
      const wake = () => {
        el.classList.remove('on');
        A.sfx.degauss();
        ctx.timeout(() => { clearPwr(); A.phase = 'desk'; }, 900);
      };
      el.addEventListener('pointerdown', wake, { once: true });
      root.addEventListener('keydown', wake, { once: true, signal: ctx.signal });
    }, 900);
  }

  // ── dialogs ──
  function gray(on) { root.classList.toggle('gray', on); }
  function shutdownDialog(fromLogin = false) {
    if (pwr.classList.contains('on')) return;
    A.desktop.closeStart();
    if (!fromLogin) gray(true);
    const el = h('div', 'ae-dlg', `<div class="sd"><div class="sdh"><span>${A.T('コンピュータの電源を切る', 'Turn off computer')}</span><img src="${iconURL('drop', 34)}" alt=""></div>
      <div class="sdm"><div class="opt" data-o="standby"><img src="${iconURL('standby', 46)}" alt="">${A.T('スタンバイ(S)', 'Stand By')}</div><div class="opt" data-o="off"><img src="${iconURL('power', 46)}" alt="">${A.T('電源を切る(U)', 'Turn Off')}</div><div class="opt" data-o="restart"><img src="${iconURL('restart', 46)}" alt="">${A.T('再起動(R)', 'Restart')}</div></div>
      <div class="sdf"><button class="ae-btn">${A.T('キャンセル', 'Cancel')}</button></div></div>`);
    pwr.innerHTML = '';
    pwr.appendChild(el);
    pwr.classList.add('on');
    A.sfx.question();
    el.addEventListener('click', (e) => {
      const o = e.target.closest('[data-o]');
      if (e.target.closest('.ae-btn')) { A.sfx.click(); clearPwr(); gray(false); return; }
      if (!o) return;
      A.sfx.click();
      gray(false);
      if (o.dataset.o === 'standby') { if (fromLogin) { clearPwr(); return; } standby(); }
      if (o.dataset.o === 'restart') restart(fromLogin);
      if (o.dataset.o === 'off') powerOff(fromLogin);
    });
  }
  function logoffDialog() {
    A.desktop.closeStart();
    gray(true);
    const el = h('div', 'ae-dlg', `<div class="sd" style="width:min(340px,calc(100% - 24px))"><div class="sdh"><span>${A.T('HIKARI Aqua のログオフ', 'Log Off HIKARI Aqua')}</span><img src="${iconURL('drop', 34)}" alt=""></div>
      <div class="sdm"><div class="opt" data-o="switch"><img src="${iconURL('restart', 46)}" alt="">${A.T('ユーザーの切り替え(S)', 'Switch User')}</div><div class="opt" data-o="off"><img src="${iconURL('logoff', 46)}" alt="">${A.T('ログオフ(L)', 'Log Off')}</div></div>
      <div class="sdf"><button class="ae-btn">${A.T('キャンセル', 'Cancel')}</button></div></div>`);
    pwr.innerHTML = '';
    pwr.appendChild(el);
    pwr.classList.add('on');
    A.sfx.question();
    el.addEventListener('click', async (e) => {
      if (e.target.closest('.ae-btn')) { A.sfx.click(); clearPwr(); gray(false); return; }
      const o = e.target.closest('[data-o]');
      if (!o) return;
      A.sfx.click();
      gray(false);
      blueScreen(o.dataset.o === 'off' ? ['ログオフしています...', 'Logging off...'] : ['ようこそ', 'welcome']);
      if (o.dataset.o === 'off') A.sfx.farewell();
      A.leaveDesktop();
      await wait(2200);
      clearPwr();
      A.resetForLogin();
      loginFlow();
    });
  }
  async function restart(fromLogin) {
    A.phase = 'busy';
    blueScreen(['[再起動|さいきどう|restart]しています...', 'Restarting...']);
    login.classList.remove('on');
    if (!fromLogin) A.sfx.farewell();
    A.leaveDesktop();
    await wait(2400);
    blackout();
    await wait(1200);
    boot();
  }

  // ── turning it off ──
  let ended = false, endPaint = null;
  async function powerOff(fromLogin) {
    A.phase = 'busy';
    const earned = A.apps.opened.size >= 2 && !fromLogin;
    const wasDone = A.lightDone;
    ctx.exitVisible(false);
    login.classList.remove('on');
    blueScreen(['[設定|せってい|settings]を[保存|ほぞん|save]しています...', 'Saving your settings...']);
    A.sfx.farewell();
    A.leaveDesktop();
    await wait(2600);
    blackout();
    await wait(900);
    // 「コンピュータの電源を切る準備ができました。」
    pwr.innerHTML = '<div class="ae-safe"><canvas></canvas></div><canvas class="ae-dot"></canvas>' +
      `<div class="ae-bezel"><span class="brand">H I K A R I</span><span class="model">CT-1486</span><span class="phint">${A.L('[電源|でんげん|power]ボタン', 'power')}</span><span class="led"></span><button class="pbtn" title="電源"></button></div>`;
    const safe = pwr.querySelector('.ae-safe'), sc = safe.querySelector('canvas');
    const W = root.clientWidth, H = root.clientHeight;
    const s = W < 700 ? 2 : 3;
    sc.width = Math.ceil(W / s); sc.height = Math.ceil(H / s);
    const sg = sc.getContext('2d');
    sg.fillStyle = '#000'; sg.fillRect(0, 0, sc.width, sc.height);
    const en = A.en;
    const line = en ? "It's now safe to turn off your computer." : 'コンピュータの電源を切る準備ができました。';
    const halves = en ? ["It's now safe to turn off", 'your computer.'] : ['コンピュータの電源を切る', '準備ができました。'];
    let fs = Math.floor(sc.width * 0.8 / (line.length * (en ? 0.55 : 1)));
    const twoLines = fs < 11;
    if (twoLines) fs = Math.floor(sc.width * 0.86 / (halves[0].length * (en ? 0.55 : 1)));
    sg.font = en ? `bold ${fs}px Tahoma, Verdana, sans-serif` : `${fs}px "DotGothic16", monospace`;
    sg.textAlign = 'center'; sg.textBaseline = 'middle';
    sg.fillStyle = '#ff9a1a';
    sg.shadowColor = 'rgba(255,140,20,.6)'; sg.shadowBlur = 2;
    if (twoLines) {
      sg.fillText(halves[0], sc.width / 2, sc.height / 2 - fs * 0.75);
      sg.fillText(halves[1], sc.width / 2, sc.height / 2 + fs * 0.75);
    } else sg.fillText(line, sc.width / 2, sc.height / 2);
    requestAnimationFrame(() => safe.classList.add('on'));
    ctx.crt(0.6);
    await wait(1800);
    const bezel = pwr.querySelector('.ae-bezel');
    bezel.classList.add('on');
    await wait(2600);
    bezel.querySelector('.phint').classList.add('on');
    await new Promise((res) => bezel.querySelector('.pbtn').addEventListener('click', res, { once: true }));
    bezel.querySelector('.led').classList.add('off');
    bezel.querySelector('.phint').classList.remove('on');
    A.sfx.crtOff();
    await crtCollapse(pwr.querySelector('.ae-dot'), sc, safe, earned || wasDone);
    ctx.timeout(() => bezel.classList.remove('on'), 400);
    if (earned || wasDone) await theLight(wasDone);
    else {
      await wait(1600);
      A.earlyOff = true;
      ctx.crt(0);
      blackout();
      await wait(1000);
      boot();
    }
  }

  // The picture folds to a line, the line to a dot. A real tube lets the dot fade.
  // This one doesn't.
  function crtCollapse(cv, src, safe, stays) {
    const W = root.clientWidth, H = root.clientHeight;
    const d = Math.min(ctx.dpr, 2);
    cv.width = W * d; cv.height = H * d;
    const g = cv.getContext('2d');
    g.setTransform(d, 0, 0, d, 0, 0);
    safe.style.transition = 'none';
    safe.style.opacity = '0';
    return new Promise((res) => {
      let t = 0;
      const stop = ctx.loop((_, dt) => {
        t += dt;
        g.clearRect(0, 0, W, H);
        g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
        const cx = W / 2, cy = H / 2;
        if (t < 0.14) {
          const k = t / 0.14;
          const hh = Math.max(2, H * Math.pow(1 - k, 2.4));
          g.globalAlpha = 1;
          g.drawImage(src, 0, cy - hh / 2, W, hh);
          g.globalCompositeOperation = 'lighter';
          g.fillStyle = `rgba(255,255,255,${0.15 + k * 0.6})`;
          g.fillRect(0, cy - hh / 2, W, hh);
          g.globalCompositeOperation = 'source-over';
        } else if (t < 0.42) {
          const k = (t - 0.14) / 0.28;
          const ww = Math.max(4, W * Math.pow(1 - k, 2.2));
          const gr = g.createLinearGradient(cx - ww / 2, 0, cx + ww / 2, 0);
          gr.addColorStop(0, 'rgba(200,220,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(200,220,255,0)');
          g.fillStyle = gr;
          g.fillRect(cx - ww / 2, cy - 1.5, ww, 3);
          glow(g, cx, cy, 10 + 30 * (1 - k), 0.5);
        } else {
          const k = t - 0.42;
          let a;
          if (!stays) a = Math.max(0, 1 - k / 2.4);
          else a = k < 1.9 ? 1 - (k / 1.9) * 0.62 : 0.38;
          glow(g, cx, cy, 4 + a * 26, a);
          if (!stays && a <= 0) { stop(); res(); }
          if (stays && k > 2.6) { stop(); res({ g, W, H }); }
        }
      });
    });
  }
  function glow(g, x, y, r, a, warm = 0) {
    const gr = g.createRadialGradient(x, y, 0, x, y, r * 2.6);
    gr.addColorStop(0, `rgba(255,255,255,${a})`);
    gr.addColorStop(0.16, `rgba(${255},${248 - warm * 20},${235 - warm * 60},${a * 0.9})`);
    gr.addColorStop(0.42, `rgba(${200 + warm * 55},${215 - warm * 20},${255 - warm * 100},${a * 0.25})`);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.beginPath(); g.arc(x, y, r * 2.6, 0, Math.PI * 2); g.fill();
  }

  async function theLight(again = false) {
    const cv = pwr.querySelector('.ae-dot');
    const W = root.clientWidth, H = root.clientHeight;
    const g = cv.getContext('2d');
    // the dot, refusing to go out: it warms, and breathes, and grows
    await new Promise((res) => {
      let t = 0, awarded = false;
      const stop = ctx.loop((_, dt) => {
        t += dt;
        g.clearRect(0, 0, W, H);
        g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
        const warm = clamp(t / 2.2, 0, 1);
        const breath = 0.5 + 0.5 * Math.sin(t * 2.2);
        let a = 0.38 + warm * 0.55 + breath * 0.07;
        let r = 4 + warm * 14 + breath * 2;
        let y = H / 2;
        if (t > 2.9) {
          if (!awarded) {
            awarded = true;
            A.lightDone = true;
            ctx.store.set('light', true);
            // the first time, the shell's light takes over from here; after that, the dot rises on its own
            if (!ctx.award('the last dot on the CRT, which would not go out')) again = true;
          }
          const f = clamp((t - 2.9) / (again ? 2.4 : 1.1), 0, 1);
          if (again) { y -= f * f * H * 0.32; r *= 1 + f * 0.4; }
          a *= 1 - f;
        }
        glow(g, W / 2, y, r, a, warm);
        if (t > (again ? 5.4 : 4.2)) { stop(); res(); }
      });
    });
    // then the hill, at evening
    ctx.crt(0);
    A.settings.wall = 1;
    A.applySettings(A.settings, true);
    A.hill.setDusk(1, 0);
    A.showHillOnly('dusk');
    await wait(4200);
    const fade = pwr.querySelector('.ae-dot');
    fade.style.transition = 'opacity 4s ease';
    fade.style.opacity = '0';
    pwr.querySelector('.ae-safe').remove();
    const end = h('div', 'ae-end', `<div class="e1"></div>
      <div class="e1 e2" style="margin-top:12px;font:italic 17px 'EB Garamond',serif;letter-spacing:.06em;color:rgba(255,240,226,.82)">good night, old future.</div>
      <button class="eb"></button>`);
    const paintEnd = () => {
      end.querySelector('.e1').innerHTML = A.L('おやすみ、むかしの[未来|みらい|the future]。', 'good night, old future.');
      end.querySelector('.e2').style.display = A.en ? 'none' : '';
      end.querySelector('.eb').innerHTML = `${iconImg('power', 22)}${A.T('もう一度、電源を入れる', 'turn it on again')}`;
    };
    paintEnd();
    endPaint = paintEnd;
    pwr.appendChild(end);
    playMusicBox(A);
    A.ambience.level(0.55, 4);
    A.ambience.pad(0.6, 6);
    ctx.timeout(() => { pwr.style.pointerEvents = 'none'; end.style.pointerEvents = 'none'; }, 10);
    await wait(3600);
    end.querySelector('.e1').classList.add('on');
    await wait(2600);
    end.querySelector('.e2').classList.add('on');
    await wait(3000);
    const btn = end.querySelector('.eb');
    btn.classList.add('on');
    btn.style.pointerEvents = 'auto';
    ctx.exitVisible(true);
    A.phase = 'ended';
    ended = true;
    btn.addEventListener('click', async () => {
      A.sfx.click();
      pwr.style.pointerEvents = '';
      ctx.exitVisible(false);
      blackout();
      await wait(800);
      boot();
    }, { once: true });
  }

  return { relabel() { paintLogin(); if (endPaint && pwr.querySelector('.ae-end')) endPaint(); }, loginFlow, showLogin, shutdownDialog, logoffDialog, standby, boot, login, get ended() { return ended; } };
}
