// 円町 (Marumachi), H04 — mastery.
// A rhythm game with circles: an original song, four hand-tuned maps "by transformer-v0",
// hit circles / sliders / a spinner, real AR/OD/CS/HP, NF/EZ/HD/DT, a ranking screen and
// the homages. The light is earned by passing the map, on any difficulty.

import { CSS } from './circles/ui-css.js';
import { SongPlayer } from './circles/synth.js';
import { Sfx } from './circles/sfx.js';
import { Background } from './circles/bg.js';
import { DIFFS, buildMap } from './circles/map.js';
import { Game, effectiveDiff, scoreMultiplier } from './circles/game.js';
import { Phone } from './circles/phone.js';
import { showResults } from './circles/results.js';
import * as S from './circles/song-data.js';

const MODS = [
  { k: 'ez', label: 'EZ', name: 'Easy', mult: '×0.50', key: 'KeyQ' },
  { k: 'nf', label: 'NF', name: 'No Fail', mult: '×0.50', key: 'KeyW' },
  { k: 'hd', label: 'HD', name: 'Hidden', mult: '×1.06', key: 'KeyF' },
  { k: 'dt', label: 'DT', name: 'Double Time', mult: '×1.12', key: 'KeyD' },
];
const DEFAULTS = { cursor: 1, device: 'off', offset: 0, dim: 0.72, music: 0.9, fx: 0.8 };
const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export default {
  id: 'circles',
  mount(root, ctx) {
    const sig = ctx.signal;
    const audio = ctx.audio, ac = audio.ac;
    const store = ctx.store;
    root.classList.add('cm');
    const style = document.createElement('style');
    style.textContent = CSS;
    root.appendChild(style);

    const dims = { w: ctx.w, h: ctx.h, dpr: ctx.dpr };
    const cv = document.createElement('canvas');
    cv.className = 'cm-cv';
    root.appendChild(cv);
    const g2 = cv.getContext('2d', { alpha: false });
    const bg = new Background();
    const sizeCanvas = () => {
      cv.width = Math.round(dims.w * dims.dpr); cv.height = Math.round(dims.h * dims.dpr);
      bg.resize(dims.w, dims.h, dims.dpr);
    };
    sizeCanvas();

    const song = new SongPlayer(audio, ctx.out, ctx.send);
    const sfx = new Sfx(audio, ctx.out, ctx.send);
    const settings = { ...DEFAULTS, ...store.get('settings', {}) };
    const mods = { ez: false, nf: false, hd: false, dt: false, ...store.get('mods', {}) };
    let diffIdx = store.get('diff', 0);
    let screen = 'menu';
    let game = null, gameAbort = null;
    let attempts = store.get('plays', 0);
    sfx.setVolume(settings.fx);
    const saveSettings = () => store.set('settings', settings);

    let lang = ctx.lang === 'en' ? 'en' : 'ja';
    const isEn = () => lang === 'en';
    const app = { ctx, sfx, el: null, isEn, get attempts() { return attempts; } };
    // every [data-en] element swaps between its Japanese markup and its English text
    const applyLang = () => {
      root.querySelectorAll('[data-en]').forEach((el) => {
        if (el.dataset.ja == null) el.dataset.ja = el.innerHTML;
        el.innerHTML = isEn() ? el.dataset.en : el.dataset.ja;
      });
    };

    // ------------------------------------------------------------ screens
    const mk = (cls, html) => { const d = document.createElement('div'); d.className = cls; d.innerHTML = html; root.appendChild(d); return d; };
    const lastPlayed = store.get('lastPlayed', 0);
    const ago = (() => {
      if (!lastPlayed) return 'years ago';
      const m = (Date.now() - lastPlayed) / 60000;
      return m < 2 ? 'just now' : m < 60 ? `${Math.round(m)} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago`;
    })();
    const menu = mk('cm-scr menu on', `
      <div class="np"><i></i><i></i><i></i><span>${S.ARTIST} — ${S.TITLE}</span></div>
      <div class="menu-wrap">
        <button class="cookie" aria-label="円町"><span class="ring"></span><span class="kan">円</span><span class="sub">MARUMACHI</span></button>
        <div class="menu-btns">
          <button class="mbtn" data-a="play"><b data-en="Play">プレイ</b><span data-en="プレイ">play</span></button>
          <button class="mbtn" data-a="opts"><b data-en="Options">設定</b><span data-en="設定">options</span></button>
          <button class="mbtn" data-a="leave"><b data-en="Board">乗車</b><span data-en="back to the train · 乗車">back to the train</span></button>
        </div>
      </div>
      <div class="menu-foot"><span data-en="Welcome back, ${esc(ctx.name)}. It's been a while.">${ctx.jp.html(`おかえり、${esc(ctx.name)}。[久しぶり|ひさしぶり|it's been a while]だね。`)}</span><br><span class="mono">last played: ${ago} · click the circle</span></div>`);
    ctx.jp.attach(menu);
    const cookie = menu.querySelector('.cookie');
    const ring = menu.querySelector('.ring');

    const selScr = mk('cm-scr selscr', `<div class="sel">
      <div class="info">
        <div class="ttl">${S.TITLE}<small>${S.TITLE_ROMAJI.toUpperCase()} — ${S.ARTIST}</small></div>
        <div class="meta">Mapped by <b class="mapper">transformer-v0</b> <span>(trained by you, years ago)</span><br>
          <span class="mono" style="font-size:11.5px">source: HIKARI LINE · tags: j-core future-bass denpa summer generated</span></div>
        <div class="stats"></div>
        <div class="attrs"></div>
        <div class="board"><h4>LOCAL RANKING</h4><div class="rows"></div></div>
        <div class="gen"></div>
      </div>
      <div class="car"><div class="car-in"></div></div>
      <div class="bot">
        <button class="bb back" data-en="Back">戻る <small>back</small></button>
        <button class="bb opts" data-en="Options">設定 <small>options</small></button>
        <div class="mods"></div><span class="mult"></span>
        <button class="play" data-en="▶ Play">▶ プレイ</button>
      </div></div>`);
    const resScr = mk('cm-scr resscr', '');
    app.el = resScr;

    const optOv = mk('ov opts-ov', `<div class="card cm-ui">
      <h3 data-en="Options">設定</h3><div class="lead" data-en="saved on this machine">options — saved on this machine</div>
      <div class="opt"><label data-en="Cursor size">カーソルサイズ<small>cursor size</small></label><span class="val v-cursor"></span><input type="range" min="0.6" max="1.8" step="0.05" data-k="cursor"></div>
      <div class="opt"><label data-en="Input overlay">入力デバイス<small>input overlay</small></label><span></span>
        <div class="seg" data-k="device"><button data-v="off">off</button><button data-v="tablet">tablet area: 75 mm</button><button data-v="mouse">mouse (old peak)</button></div>
        <div class="hint dev-hint"></div></div>
      <div class="opt"><label data-en="Audio offset<small>move right (+) if you're hitting late</small>">オーディオオフセット<small>audio offset — + if you hit late</small></label><span class="val v-offset"></span><input type="range" min="-150" max="250" step="1" data-k="offset">
        <div class="hint"><span data-en="On wireless earbuds, nudge it right.">${ctx.jp.html('ワイヤレスイヤホンなら、少し[右|みぎ|right]へ。')}</span> <span class="mono" style="font-size:11px">wireless earbuds usually want +100 to +200 ms.</span></div></div>
      <div class="opt"><label data-en="Background dim">背景の暗さ<small>background dim</small></label><span class="val v-dim"></span><input type="range" min="0" max="1" step="0.01" data-k="dim"></div>
      <div class="opt"><label data-en="Music volume">音楽<small>music volume</small></label><span class="val v-music"></span><input type="range" min="0" max="1" step="0.01" data-k="music"></div>
      <div class="opt"><label data-en="Hitsound volume">効果音<small>hitsound volume</small></label><span class="val v-fx"></span><input type="range" min="0" max="1" step="0.01" data-k="fx"></div>
      <div class="keys"><kbd>Z</kbd> <kbd>X</kbd> / mouse buttons — hit · <kbd>Space</kbd> skip / pause · <kbd>\`</kbd> quick retry<br>
        song select: <kbd>↑</kbd><kbd>↓</kbd> difficulty · <kbd>Q</kbd> EZ <kbd>W</kbd> NF <kbd>F</kbd> HD <kbd>D</kbd> DT · <kbd>Enter</kbd> play<br>
        <kbd>R</kbd> film the CRT with your phone</div>
      <button class="close" data-en="Close">閉じる</button></div>`);
    ctx.jp.attach(optOv);
    const pauseOv = mk('ov pause', `<div class="card cm-ui"><h3 data-en="Paused">一時停止</h3>
      <button class="pb" data-a="go" data-en="Continue<small>Space</small>">続ける<small>continue · Space</small></button>
      <button class="pb" data-a="retry" data-en="Retry<small>\`</small>">やり直す<small>retry · \`</small></button>
      <button class="pb" data-a="quit" data-en="Song select">選曲へ<small>song select</small></button></div>`);
    mk('hint-r', 'R — film the CRT');
    const phone = new Phone(root, {
      get w() { return dims.w; }, get h() { return dims.h; }, signal: sig, jp: ctx.jp,
      loop: (fn) => ctx.loop(fn), toast: (s) => ctx.toast(s), isEn,
    }, sfx);
    applyLang();
    let lastResult = null;
    if (ctx.onLang) ctx.onLang((l) => {
      lang = l === 'en' ? 'en' : 'ja';
      applyLang();
      phone.relang();
      if (optOv.classList.contains('on')) syncOptions();
      if (screen === 'select') renderSelect();
      if (screen === 'results' && lastResult) showResults(app, lastResult, true);
    });

    const show = (name) => {
      screen = name;
      if (document.activeElement && root.contains(document.activeElement)) document.activeElement.blur();
      menu.classList.toggle('on', name === 'menu');
      selScr.classList.toggle('on', name === 'select');
      resScr.classList.toggle('on', name === 'results');
    };

    // ------------------------------------------------------------ music per screen
    const music = (kind) => {
      if (kind === 'menu') song.play({ fromBeat: 0, at: ac.currentTime + 0.12, loop: [0, 32], volume: 0.8 * settings.music });
      else if (kind === 'preview') song.play({ fromBeat: S.PREVIEW_BEAT, at: ac.currentTime + 0.12, loop: [S.PREVIEW_BEAT, S.PREVIEW_BEAT + 32], volume: 0.72 * settings.music, rate: mods.dt ? 1.5 : 1 });
    };
    music('menu');

    // ------------------------------------------------------------ menu
    cookie.addEventListener('click', () => {
      if (screen !== 'menu') return;
      audio.resume && audio.resume();
      if (!menu.classList.contains('open')) { menu.classList.add('open'); sfx.cookie(); }
      else toSelect();
    }, { signal: sig });
    menu.querySelector('.menu-btns').addEventListener('click', (e) => {
      const b = e.target.closest('.mbtn');
      if (!b) return;
      const a = b.dataset.a;
      if (a === 'play') toSelect();
      else if (a === 'opts') openOptions();
      else if (a === 'leave') { sfx.uiBack(); ctx.leave(); }
    }, { signal: sig });
    menu.querySelectorAll('.mbtn').forEach((b) => b.addEventListener('pointerenter', () => sfx.uiTick(), { signal: sig }));

    // ------------------------------------------------------------ song select
    const carIn = selScr.querySelector('.car-in');
    const diffPanels = DIFFS.map((d, i) => {
      const map = buildMap(d);
      const b = document.createElement('button');
      b.className = 'pn';
      b.style.setProperty('--dc', d.colour);
      b.dataset.i = i;
      const full = Math.floor(d.stars), half = d.stars - full >= 0.5;
      b.innerHTML = `<div class="t1">${d.name}<small>${S.TITLE} · ${map.objects.length} objects</small></div>
        <div class="t2"><span class="stars">${'★'.repeat(full)}${half ? '☆' : ''}</span><span>${d.stars.toFixed(2)}★</span></div><span class="gr"></span>`;
      return b;
    });
    const setHead = document.createElement('div');
    setHead.className = 'pn set';
    setHead.style.setProperty('--dc', '#ff66aa');
    setHead.innerHTML = `<div class="t1">${S.TITLE}<small>${S.ARTIST}</small></div><div class="t2">transformer-v0 · 4 difficulties</div>`;
    const ghosts = [
      { t: 'Beetle Ju — タイトル画面', s: 'audio not found · you only remember it', toast: 'ファイルが見つからない。でも、[音|おと|sound]は[覚えてる|おぼえてる|remember]。', en: 'File not found. But you remember how it sounded.' },
      { t: 'transformer-v0 — sample_0042', s: 'unplayable · 2,048 notes, all at (256, 192)', toast: 'epoch 3: mode collapse. every note in the centre. you fixed it later.', en: 'epoch 3: mode collapse. every note in the centre. you fixed it later.' },
    ].map((gh) => {
      const b = document.createElement('button');
      b.className = 'pn ghost';
      b.style.setProperty('--dc', '#555');
      b.innerHTML = `<div class="t1">${gh.t}</div><div class="t2">${gh.s}</div>`;
      b.addEventListener('click', () => { sfx.uiBack(); ctx.toast(isEn() && gh.en ? gh.en : gh.toast.replace(/\[([^|\]]+)\|[^|\]]*\|[^\]]*\]/g, '$1')); }, { signal: sig });
      return b;
    });
    carIn.append(ghosts[0], setHead, ...diffPanels, ghosts[1]);
    diffPanels.forEach((b) => b.addEventListener('click', () => {
      const i = +b.dataset.i;
      if (i === diffIdx && screen === 'select') play();
      else selectDiff(i);
    }, { signal: sig }));

    const modsEl = selScr.querySelector('.mods');
    MODS.forEach((m) => {
      const b = document.createElement('button');
      b.className = 'mod';
      b.dataset.k = m.k;
      b.title = `${m.name} (${m.key.slice(3)})`;
      b.innerHTML = `<b>${m.label}</b><small>${m.mult}</small>`;
      b.addEventListener('click', () => toggleMod(m.k), { signal: sig });
      modsEl.appendChild(b);
    });
    const toggleMod = (k) => {
      mods[k] = !mods[k];
      store.set('mods', mods);
      sfx.uiTick();
      if (k === 'dt' && screen === 'select') music('preview');
      renderSelect();
    };

    let genTimer = null;
    const typeGen = (text) => {
      const gen = selScr.querySelector('.gen');
      if (genTimer) clearInterval(genTimer);
      let i = 0;
      gen.textContent = '';
      genTimer = setInterval(() => {
        if (sig.aborted) { clearInterval(genTimer); return; }
        i = Math.min(text.length, i + 7);
        gen.innerHTML = esc(text.slice(0, i)).replace(/(#[^\n]*)/g, '<span class="c">$1</span>');
        if (i >= text.length) { clearInterval(genTimer); genTimer = null; }
      }, 16);
    };
    sig.addEventListener('abort', () => genTimer && clearInterval(genTimer));

    const selectDiff = (i) => {
      diffIdx = Math.max(0, Math.min(DIFFS.length - 1, i));
      store.set('diff', diffIdx);
      sfx.uiTick();
      renderSelect(true);
    };

    const renderSelect = (typed = false) => {
      const d = DIFFS[diffIdx];
      const map = buildMap(d);
      const eff = effectiveDiff(d, mods);
      diffPanels.forEach((b, i) => {
        b.classList.toggle('sel', i === diffIdx);
        const best = store.get('best:' + DIFFS[i].id, null);
        const gr = b.querySelector('.gr');
        gr.textContent = best ? best.grade : '';
        gr.style.color = best ? (best.grade.startsWith('S') ? '#f5c542' : best.grade === 'A' ? '#3fbf62' : best.grade === 'B' ? '#3a8ee6' : '#c88') : '';
      });
      const sel = diffPanels[diffIdx];
      carIn.style.transform = `translateY(${-(sel.offsetTop + sel.offsetHeight / 2)}px)`;
      const len = map.last / 1000 / eff.rate;
      const stars = d.stars * (mods.dt ? 1.39 : 1) * (mods.ez ? 0.8 : 1);
      selScr.querySelector('.stats').innerHTML =
        `<span>Length <b>${fmtTime(len)}</b></span><span>BPM <b>${Math.round(S.BPM * eff.rate)}</b></span><span>Objects <b>${map.objects.length}</b></span>` +
        `<span>Circles <b>${map.circles}</b></span><span>Sliders <b>${map.sliders}</b></span><span>Spinners <b>${map.spinners}</b></span><span>Max combo <b>${map.maxCombo}</b></span>`;
      const row = (k, base, val, max = 10) => {
        const changed = Math.abs(base - val) > 0.01;
        return `<span>${k}</span><span class="bar"><i style="width:${Math.min(100, (val / max) * 100)}%"></i></span><span class="v ${changed ? 'mod' : ''}">${val.toFixed(1)}</span>`;
      };
      selScr.querySelector('.attrs').innerHTML =
        row('CS', d.cs, eff.cs) + row('HP', d.hp, eff.hp) + row('OD', d.od, Math.min(11, eff.odReal)) + row('AR', d.ar, Math.min(11, eff.arReal)) +
        `<span>★</span><span class="bar"><i style="width:${Math.min(100, (stars / 8) * 100)}%;background:linear-gradient(90deg,${d.colour},#fff)"></i></span><span class="v ${mods.dt || mods.ez ? 'mod' : ''}">${stars.toFixed(2)}</span>`;
      modsEl.querySelectorAll('.mod').forEach((b) => b.classList.toggle('on', !!mods[b.dataset.k]));
      selScr.querySelector('.mult').textContent = `score ×${scoreMultiplier(mods).toFixed(2)}`;
      const best = store.get('best:' + d.id, null);
      selScr.querySelector('.rows').innerHTML = best
        ? `<div class="row"><span class="g" style="color:${best.grade.startsWith('S') ? '#f5c542' : '#ffd0e6'}">${best.grade}</span><span class="who">${esc(ctx.name)}<small>${best.mods || 'no mods'} · ${best.combo}x · ${(best.acc * 100).toFixed(2)}%</small></span><span class="sc">${String(best.score).padStart(8, '0')}</span></div>`
        : `<div class="empty">No local scores yet. The map is waiting.</div>`;
      if (typed) {
        typeGen(`$ python sample.py --ckpt transformer-v0/epoch_37.pt --song natsu_no_zankyou --diff ${d.name}\n` +
          `# loaded · 6 layers · d_model 512 · val_loss 1.284\n` +
          `sampling  T=0.85  top_p=0.92  seed=${d.seed}\n` +
          `<BOS> <NC> <CIRCLE x=${Math.round(map.objects[0].x)} y=${Math.round(map.objects[0].y)} Δ=1/1> <${map.objects[1].type.toUpperCase()} x=${Math.round(map.objects[1].x)} y=${Math.round(map.objects[1].y)} Δ=1/2> …\n` +
          `${map.objects.length} objects · 0 unsnapped · max combo ${map.maxCombo}\n` +
          `# post-processed by hand: flow, spacing, symmetry. it's yours.`);
      }
    };

    selScr.querySelector('.back').addEventListener('click', () => { sfx.uiBack(); toMenu(); }, { signal: sig });
    selScr.querySelector('.opts').addEventListener('click', () => openOptions(), { signal: sig });
    selScr.querySelector('.play').addEventListener('click', () => play(), { signal: sig });
    selScr.querySelector('.car').addEventListener('wheel', (e) => {
      e.preventDefault();
      if (Math.abs(e.deltaY) < 4) return;
      selectDiff(diffIdx + (e.deltaY > 0 ? 1 : -1));
    }, { signal: sig, passive: false });

    function toMenu() { show('menu'); menu.classList.add('open'); music('menu'); }
    function toSelect() {
      sfx.uiConfirm();
      endGame();
      show('select');
      root.classList.remove('playing');
      ctx.exitVisible(true);
      music('preview');
      renderSelect(true);
    }
    app.toSelect = toSelect;

    // ------------------------------------------------------------ options
    const optCard = optOv.querySelector('.card');
    const devHint = optOv.querySelector('.dev-hint');
    const devLines = {
      tablet: () => isEn() ? 'XP-Pen G640 · 75.0 mm. The area is right. All that\'s left is getting used to it.' : ctx.jp.html('XP-Pen G640 · 75.0 mm。[範囲|はんい|area]は[正しい|ただしい|correct]。あとは[慣れ|なれ|getting used to it]だけ。'),
      mouse: () => isEn() ? 'The mouse from back then. Either way, your hand remembers.' : ctx.jp.html('あの[頃|ころ|those days]のマウス。どっちでも、[手|て|hand]はちゃんと[覚えてる|おぼえてる|remembers]。'),
    };
    const syncOptions = () => {
      optCard.querySelectorAll('input[type=range]').forEach((inp) => {
        const k = inp.dataset.k;
        inp.value = settings[k];
        const v = optCard.querySelector('.v-' + k);
        if (v) v.textContent = k === 'offset' ? `${settings[k] > 0 ? '+' : ''}${settings[k]} ms` : k === 'cursor' ? `${(+settings[k]).toFixed(2)}×` : `${Math.round(settings[k] * 100)}%`;
      });
      optCard.querySelectorAll('.seg button').forEach((b) => b.classList.toggle('on', b.dataset.v === settings.device));
      devHint.innerHTML = settings.device === 'off' ? '' : devLines[settings.device]();
    };
    optCard.addEventListener('input', (e) => {
      const k = e.target.dataset && e.target.dataset.k;
      if (!k) return;
      settings[k] = +e.target.value;
      if (k === 'fx') sfx.setVolume(settings.fx);
      if (k === 'music' && screen !== 'play') music(screen === 'menu' ? 'menu' : 'preview');
      syncOptions(); saveSettings();
    }, { signal: sig });
    optCard.querySelector('.seg').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      settings.device = b.dataset.v;
      if (settings.device === 'tablet') ctx.toast(isEn() ? '75 mm. Trust the area.' : '75 mm。[範囲|はんい|area]を[信じて|しんじて|trust]。'.replace(/\[([^|\]]+)\|[^|\]]*\|[^\]]*\]/g, '$1'));
      sfx.uiTick(); syncOptions(); saveSettings();
    }, { signal: sig });
    ctx.jp.attach(optOv);
    function openOptions() { syncOptions(); optOv.classList.add('on'); sfx.uiTick(); }
    const closeOptions = () => { optOv.classList.remove('on'); sfx.uiBack(); };
    optOv.querySelector('.close').addEventListener('click', closeOptions, { signal: sig });
    optOv.addEventListener('pointerdown', (e) => { if (e.target === optOv) closeOptions(); }, { signal: sig });

    // ------------------------------------------------------------ play
    function endGame() {
      if (game) { game.destroy(); game = null; }
      if (gameAbort) { gameAbort.abort(); gameAbort = null; }
      pauseOv.classList.remove('on');
    }
    function play() {
      if (screen === 'play') return;
      audio.resume && audio.resume();
      sfx.uiConfirm();
      song.stop(0.15);
      endGame();
      show('play');
      root.classList.add('playing');
      ctx.exitVisible(false);
      const d = DIFFS[diffIdx];
      gameAbort = new AbortController();
      const abortGame = () => gameAbort && gameAbort.abort();
      sig.addEventListener('abort', abortGame, { once: true });
      const gctx = {
        get w() { return dims.w; }, get h() { return dims.h; }, get dpr() { return dims.dpr; },
        signal: gameAbort.signal, toast: (s) => ctx.toast(s), reduced: ctx.reduced, isEn,
      };
      game = new Game({
        ctx: gctx, canvas: cv, layer: root, audio, song, sfx, bg,
        map: buildMap(d), mods: { ...mods }, settings: { ...settings },
        onEnd: (r) => finishPlay(r),
        onPause: (p) => { pauseOv.classList.toggle('on', p); root.classList.toggle('playing', !p); },
      });
      attempts++;
      store.set('plays', attempts);
      store.set('lastPlayed', Date.now());
      game.start(0, 0.6);
    }
    function retry() {
      if (!game) { play(); return; }
      attempts++;
      store.set('plays', attempts);
      show('play');
      root.classList.add('playing');
      ctx.exitVisible(false);
      pauseOv.classList.remove('on');
      game.retry();
    }
    app.retry = () => play();

    pauseOv.addEventListener('click', (e) => {
      const b = e.target.closest('.pb');
      if (!b || !game) return;
      const a = b.dataset.a;
      if (a === 'go') game.resume();
      else if (a === 'retry') retry();
      else if (a === 'quit') toSelect();
    }, { signal: sig });

    function finishPlay(r) {
      // the outro keeps ringing under the ranking screen; only the game's input goes away
      if (gameAbort) { gameAbort.abort(); gameAbort = null; }
      game = null;
      root.classList.remove('playing');
      ctx.exitVisible(true);
      if (!r.failed) {
        const key = 'best:' + r.diff.id;
        const best = store.get(key, null);
        const modsTxt = [r.mods.ez && 'EZ', r.mods.nf && 'NF', r.mods.hd && 'HD', r.mods.dt && 'DT'].filter(Boolean).join('') || '';
        if (!best || r.score > best.score) store.set(key, { score: r.score, acc: r.acc, grade: r.grade, combo: r.maxCombo, mods: modsTxt, at: Date.now() });
      }
      show('results');
      lastResult = r;
      showResults(app, r);
    }

    app.award = (r) => {
      if (r.failed) return;
      let label;
      if (r.fullCombo) label = 'a full combo, burnt to pure white';
      else if (r.nfSaved) label = 'the song you finished anyway';
      else if (attempts >= 5) label = 'the retry that finally held';
      else label = 'the hand that remembered';
      ctx.award(label);
    };

    // ------------------------------------------------------------ keys
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyR' && !e.repeat && !e.metaKey && !e.ctrlKey) { phone.toggle(); return; }
      if (optOv.classList.contains('on')) return;
      if (screen === 'menu') {
        if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); cookie.click(); }
      } else if (screen === 'select') {
        if (e.code === 'ArrowDown') { e.preventDefault(); selectDiff(diffIdx + 1); }
        else if (e.code === 'ArrowUp') { e.preventDefault(); selectDiff(diffIdx - 1); }
        else if (e.code === 'Enter') { e.preventDefault(); play(); }
        else if (e.code === 'Backspace') toMenu();
        else { const m = MODS.find((x) => x.key === e.code); if (m && !e.repeat) toggleMod(m.k); }
      } else if (screen === 'results') {
        if (e.code === 'Backquote') app.retry();
        else if (e.code === 'Enter') toSelect();
      }
    }, { signal: sig });

    // ------------------------------------------------------------ frame
    const pointer = { x: 0, y: 0 };
    root.addEventListener('pointermove', (e) => { pointer.x = e.clientX / dims.w - 0.5; pointer.y = e.clientY / dims.h - 0.5; }, { signal: sig });
    let drift = 0;
    ctx.loop((t, dt) => {
      if (document.hidden) return;
      if (game && screen === 'play') { game.update(); return; }
      drift += dt;
      const beat = song.playing ? song.beatAt(ac.currentTime - (ac.outputLatency || 0)) : drift / S.BEAT;
      const ph = beat - Math.floor(beat);
      g2.setTransform(dims.dpr, 0, 0, dims.dpr, 0, 0);
      const dim = screen === 'menu' ? 0.28 : screen === 'select' ? 0.5 : 0.62;
      bg.draw(g2, dims.w, dims.h, { progress: 0.12 + ((drift / 240) % 1) * 0.8, dim, t, px: pointer.x * 2, py: pointer.y * 2, flash: screen === 'select' && !ctx.reduced ? Math.pow(1 - ph, 4) * 0.25 : 0, reduced: ctx.reduced });
      if (screen === 'menu' && !ctx.reduced) {
        const k = Math.pow(1 - ph, 3);
        cookie.style.scale = String(1 + 0.022 * k);
        ring.style.transform = `scale(${1 + 0.25 * ph})`;
        ring.style.opacity = String(0.65 * (1 - ph));
      }
    });


    return {
      resize(w, h) {
        dims.w = w; dims.h = h; dims.dpr = ctx.dpr;
        sizeCanvas();
        if (game) game.resize();
        phone.resize();
        if (screen === 'select') renderSelect();
      },
      destroy() {
        endGame();
        song.stop(0.05);
        sfx.spinStop();
        phone.destroy();
      },
    };
  },
};
