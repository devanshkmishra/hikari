// H03 水色ヶ丘 (Mizuirogaoka) — Frutiger Aero / Y2K.
// You step off the train onto the wallpaper hill. A welcome screen. A startup chime.
// The hill becomes a desktop: HIKARI Aqua 2004, the future as it was imagined.
// The light is kept where every CRT keeps it: in the last dot, after you turn it off.
import { CSS } from './aero/css.js';
import { h, jpRich } from './aero/util.js';
import { createSfx } from './aero/sfx.js';
import { createHill } from './aero/hill.js';
import { createBubbles } from './aero/bubbles.js';
import { createDesktop } from './aero/desktop.js';
import { createWM } from './aero/wm.js';
import { createApps, ALL_CSS } from './aero/apps.js';
import { createHikari } from './aero/messenger.js';
import { createPower } from './aero/power.js';
import { spawnBeetle } from './aero/beetle.js';

const EXTRA_CSS = `
.aero.gray .ae-sky,.aero.gray .ae-bub,.aero.gray .ae-desk,.aero.gray .ae-tbar,.aero.gray .ae-balloon,.aero.gray .ae-toast{filter:grayscale(1) brightness(.88);transition:filter 1.6s ease}
.aero .ae-sky,.aero .ae-bub,.aero .ae-tbar{transition:filter .6s ease}
.aero .ae-dot{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:block}
.aero .ae-end .e1{pointer-events:auto}
`;

export default {
  id: 'aero',
  mount(root, ctx) {
    root.classList.add('aero');
    const style = document.createElement('style');
    style.textContent = CSS + ALL_CSS() + EXTRA_CSS;
    root.appendChild(style);

    const A = {
      ctx, root,
      phase: 'hill',
      jp: jpRich,
      get en() { return !!ctx.en; },
      L: (ja, en) => (ctx.en ? en : jpRich(ja)),
      T: (ja, en) => (ctx.en ? en : ja),
      settings: { wall: ctx.store.get('wall', 0), saver: ctx.store.get('saver', 'bubbles'), wait: ctx.store.get('wait', 1) },
      lightDone: !!ctx.store.get('light', false) || ctx.hasOrb(),
      binFull: () => !ctx.store.get('binEmpty', false),
      leave: () => ctx.leave(),
    };
    A.sfx = createSfx(ctx);
    A.emit = (name) => { if (A.hikari) A.hikari.event(name); };

    // ── layers ──
    const sky = h('canvas', 'ae-sky');
    const bubCv = h('canvas', 'ae-bub');
    const solid = h('div', 'ae-solid');
    const intro = h('div', 'ae-intro', '');
    const hint = h('div', 'ae-hint', '');
    const paintIntro = () => {
      intro.innerHTML = `<div class="t1">水色ヶ丘</div><div class="t2">MIZUIROGAOKA</div><div class="t3">${A.L('ここは、むかし[未来|みらい|the future]だった。', 'This place used to be the future.')}</div>`;
      hint.textContent = A.T('シャボン玉に、さわってみて', 'try touching a bubble');
    };
    paintIntro();
    root.append(sky, bubCv, solid, intro, hint);

    A.hill = createHill(A, sky);
    const bub = createBubbles(bubCv, { dpr: ctx.dpr, reduced: ctx.reduced });
    A.bubbles = bub;
    A.desktop = createDesktop(A);
    A.wm = createWM(A);
    A.apps = createApps(A);
    A.hikari = createHikari(A);
    A.power = createPower(A);
    ctx.jp.attach(root);

    const W = () => root.clientWidth || ctx.w, Hh = () => root.clientHeight || ctx.h;
    A.hill.resize(W(), Hh());
    bub.resize(W(), Hh());
    A.hill.setDusk(A.settings.wall === 1 ? 1 : 0);
    bub.setMode(A.settings.wall === 1 ? 'dusk' : 'rise');
    bub.warm = A.settings.wall === 1 ? 1 : 0;
    solid.classList.toggle('on', A.settings.wall === -1);

    A.ambience = A.sfx.ambience();
    A.ambience.level(0.9, 3);
    A.ambience.pad(0.55, 6);

    // ── desktop icons ──
    const ICONS = [
      { id: 'music', label: 'マイ ミュージック', en: 'My Music', icon: 'music', kind: 'a-folder', date: '2004/04/01' },
      { id: 'pics', label: 'マイ ピクチャ', en: 'My Pictures', icon: 'pics', kind: 'a-folder', date: '2004/05/05' },
      { id: 'todo', label: 'todo.txt', icon: 'txt', kind: 'txt', date: '2004/10/27' },
      { id: 'crt', label: 'CRT_project', icon: 'crtfolder', kind: 'a-folder', date: '2004/10/04' },
      { id: 'beetle', label: 'BeetleJu.exe', icon: 'beetlecd', kind: 'exe', date: '1998/01/01' },
      { id: 'ie', label: 'Hikari Explorer', icon: 'globe', kind: 'exe', date: '2001/08/27' },
      { id: 'msn', label: 'ひかり メッセンジャー', en: 'Hikari Messenger', icon: 'msn', kind: 'exe', date: '2004/03/30' },
      { id: 'bin', label: 'ごみ箱', en: 'Recycle Bin', icon: A.binFull() ? 'binfull' : 'bin', kind: 'zz', corner: true },
    ];
    ICONS.forEach((ic) => A.desktop.addIcon({ ...ic, open: () => A.apps.open(ic.id) }));

    // ── settings (画面のプロパティ) ──
    A.applySettings = (s, quiet = false) => {
      const prev = A.settings.wall;
      A.settings = { ...A.settings, ...s };
      ctx.store.set('wall', A.settings.wall);
      ctx.store.set('saver', A.settings.saver);
      ctx.store.set('wait', A.settings.wait);
      solid.classList.toggle('on', A.settings.wall === -1);
      if (A.settings.wall >= 0) {
        A.hill.setDusk(A.settings.wall === 1 ? 1 : 0, quiet || prev === -1 ? 0 : 3);
        bub.warm = A.settings.wall === 1 ? 1 : 0;
      }
      if (A.phase === 'desk') bub.setMode(A.settings.wall === -1 ? 'off' : 'wall');
    };

    // ── phases ──
    let deskSince = 0, firstLogin = true;
    A.enterDesktop = () => {
      A.phase = 'desk';
      deskSince = performance.now();
      intro.classList.remove('on');
      hint.classList.remove('on');
      bub.setMode(A.settings.wall === -1 ? 'off' : 'wall');
      A.ambience.level(0.2, 2);
      A.ambience.pad(0, 2);
      A.ambience.set({ larks: false, glass: false });
      A.desktop.show();
      // the shell's board and mute float just above the taskbar
      if (ctx.hudInset) ctx.hudInset({ bottom: 40 });
      ctx.exitVisible(true);
      lastInput = performance.now();
      if (ctx.store.get('beetle', false)) ctx.timeout(() => { if (A.phase === 'desk') spawnBeetle(A); }, 1600);
      const kind = A.afterLight ? 'after-light' : A.earlyOff ? 'early' : ctx.visits > 1 || !firstLogin ? 'again' : null;
      A.afterLight = false;
      A.earlyOff = false;
      ctx.timeout(() => { if (A.phase === 'desk') A.hikari.signIn(kind); }, A.hikari.signedIn ? 4000 : 21000);
      if (firstLogin) {
        firstLogin = false;
        ctx.timeout(() => { if (A.phase === 'desk') A.desktop.balloon({ title: A.T('新しいハードウェアが見つかりました', 'Found New Hardware'), icon: 'crt16', html: A.T('CRT テレビ (RF 入力)', 'CRT Television (RF input)') }); }, 4200);
        ctx.timeout(() => { if (A.phase === 'desk') A.desktop.balloon({ title: A.T('新しいハードウェアが見つかりました', 'Found New Hardware'), icon: 'crt16', html: A.L('[新|あたら|new]しいハードウェアがインストールされ、[使用|しよう|use][準備|じゅんび|ready]ができました。', 'Your new hardware is installed and ready to use.') }); }, 12500);
        ctx.timeout(() => { if (A.phase === 'desk') A.desktop.balloon({ title: A.T('自動更新', 'Automatic Updates'), icon: 'drop', html: A.L('[更新|こうしん|update]プログラムはありません。<br>この[未来|みらい|future]は、もう[完成|かんせい|complete]しています。', 'No updates are available.<br>This future is already complete.') }); }, 170000);
        ctx.timeout(() => { if (A.phase === 'desk') A.desktop.balloon({ title: A.T('CRT テレビ (RF 入力)', 'CRT Television (RF input)'), icon: 'crt16', html: A.L('ブラウン[管|かん|tube]が[温|あたた|to warm up]まりました。[色|いろ|colours]がきれいに[出|で|to come out]ています。', 'The tube has warmed up. The colours are coming through nicely.') }); }, 330000);
      }
    };
    A.leaveDesktop = () => {
      A.phase = 'busy';
      A.saver.stop();
      A.wm.closeMenus();
      A.wm.closeAll();
      if (A.song) A.song.stop();
      if (A.beetle) A.beetle.remove();
      A.hikari.hush();
      A.desktop.hide();
      if (ctx.hudInset) ctx.hudInset({ bottom: 0 });
      ctx.exitVisible(false);
    };
    A.resetForLogin = () => {
      root.classList.remove('gray');
      solid.classList.toggle('on', A.settings.wall === -1);
      A.hill.pause(false);
      bub.setMode(A.settings.wall === 1 ? 'dusk' : 'rise');
      A.ambience.level(0.75, 2);
      A.ambience.pad(0.45, 4);
      A.ambience.set({ larks: A.settings.wall !== 1, glass: true });
    };
    A.showHillOnly = (mode) => {
      solid.classList.remove('on');
      A.hill.pause(false);
      bub.warm = mode === 'dusk' ? 1 : 0;
      bub.setMode(mode === 'dusk' ? 'dusk' : 'rise');
      A.afterLight = true;
    };

    // ── arrival ──
    let shownLogin = false;
    const goLogin = () => {
      if (shownLogin) return;
      shownLogin = true;
      hint.classList.remove('on');
      intro.classList.remove('on');
      A.power.loginFlow();
    };
    ctx.timeout(() => intro.classList.add('on'), 3500);
    ctx.timeout(() => { if (A.phase === 'hill') hint.classList.add('on'); }, 7600);
    ctx.timeout(() => { if (A.phase === 'hill') goLogin(); }, ctx.visits > 1 ? 9500 : 13500);
    const t0 = performance.now();
    root.addEventListener('pointerdown', (e) => {
      if (A.phase !== 'hill' && A.phase !== 'ended') return;
      if (e.target.closest('.ae-login,.eb,.ae-cm')) return;
      const r = root.getBoundingClientRect();
      const b = bub.hit(e.clientX - r.left, e.clientY - r.top);
      if (b) {
        A.sfx.pop(b.r);
        bub.pop(b);
        if (A.phase === 'hill') { hint.classList.remove('on'); popped++; if (popped >= 3) ctx.timeout(goLogin, 900); }
        return;
      }
      if (A.phase === 'hill' && performance.now() - t0 > 3800) goLogin();
    }, { signal: ctx.signal });
    let popped = 0;
    root.addEventListener('pointermove', (e) => {
      if (A.phase === 'desk' || A.phase === 'busy') return;
      const r = root.getBoundingClientRect();
      A.hill.pointer(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
    }, { signal: ctx.signal, passive: true });

    // ── screensaver ──
    let lastInput = performance.now();
    A.saver = (() => {
      let cv = null, field = null, t0s = 0, sx = null, sy = null, active = false;
      const start = () => {
        if (active || A.phase !== 'desk') return;
        active = true;
        A.desktop.closeStart();
        A.wm.closeMenus();
        cv = h('canvas', 'ae-saver');
        root.appendChild(cv);
        field = createBubbles(cv, { dpr: ctx.dpr, reduced: ctx.reduced });
        field.resize(W(), Hh());
        field.setMode('saver');
        cv.style.opacity = '0';
        cv.style.transition = 'opacity .9s ease';
        requestAnimationFrame(() => { if (cv) cv.style.opacity = '1'; });
        t0s = performance.now();
        sx = sy = null;
      };
      const stop = () => {
        if (!active) return;
        active = false;
        const c = cv;
        cv = null; field = null;
        c.style.transition = 'opacity .25s';
        c.style.opacity = '0';
        setTimeout(() => c.remove(), 300);
        lastInput = performance.now();
      };
      const wake = (e) => {
        if (!active) return;
        const el = performance.now() - t0s;
        if (e.type === 'pointermove') {
          if (el < 700) return;
          if (sx == null) { sx = e.clientX; sy = e.clientY; return; }
          if (Math.hypot(e.clientX - sx, e.clientY - sy) < 8) return;
        } else if (el < 350) return;
        if (e.type !== 'pointermove') { e.stopPropagation(); e.preventDefault(); }
        stop();
      };
      ['pointermove', 'pointerdown', 'keydown', 'wheel'].forEach((ev) => root.addEventListener(ev, wake, { capture: true, signal: ctx.signal }));
      return { start, stop, step: (dt) => field && field.step(dt), resize: () => field && field.resize(W(), Hh()), get active() { return active; } };
    })();
    ['pointermove', 'pointerdown', 'keydown', 'wheel'].forEach((ev) => root.addEventListener(ev, () => { lastInput = performance.now(); }, { signal: ctx.signal, passive: true }));
    ctx.interval(() => {
      if (A.phase !== 'desk') return;
      const now = performance.now();
      if (A.settings.saver !== 'none' && !A.saver.active && now - lastInput > A.settings.wait * 60000) A.saver.start();
      if (!A.lightDone && A.hikari.signedIn && (A.apps.opened.size >= 4 || now - deskSince > 210000)) A.hikari.hint();
    }, 1000);

    // Escape belongs to the shell (back to the train); an open menu just closes first.
    root.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || A.phase !== 'desk' || A.saver.active) return;
      if (root.querySelector('.ae-sm.on') || root.querySelector('.ae-cm')) {
        e.stopPropagation();
        A.desktop.closeStart();
        A.wm.closeMenus();
      }
    }, { signal: ctx.signal });

    // ── language: everything you read follows the global setting, live ──
    ctx.onLang(() => {
      paintIntro();
      A.power.relabel();
      A.desktop.relabel();
      A.wm.relabelAll();
    });

    // ── the frame ──
    ctx.loop((t, dt) => {
      if (document.hidden) return;
      const covered = A.phase === 'desk' && (A.settings.wall === -1 || A.wm.anyMaximized());
      A.hill.pause(covered);
      A.hill.frame(t, dt);
      if (!covered || bub.mode !== 'wall') bub.step(dt);
      A.saver.step(dt);
    });

    return {
      resize(w, hh) {
        A.hill.resize(w, hh);
        bub.resize(w, hh);
        A.saver.resize();
        A.desktop.layout();
        A.wm.fitAll();
      },
      destroy() {
        try { if (A.song) A.song.stop(); } catch (e) {}
        try { A.ambience.stop(); } catch (e) {}
        try { A.hill.destroy(); } catch (e) {}
        root.classList.remove('aero', 'gray');
      },
    };
  },
};
