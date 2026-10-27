// The desktop: icons you double-click, the rubber-band selection, right-click menus,
// the taskbar with its green はじめ button, the start menu, the tray, the clock, balloons.
import { h, clamp, esc, pad2, osDate, isTouch } from './util.js';
import { iconURL, iconImg } from './icons.js';

const CELL_W = 108, CELL_H = 96, PAD_X = 8, PAD_Y = 8;

export function createDesktop(A) {
  const { ctx, root } = A;
  const sig = { signal: ctx.signal };

  const desk = h('div', 'ae-desk');
  const field = h('div', 'ae-field');
  const wins = h('div', 'ae-wins');
  desk.append(field, wins);
  const tbar = h('div', 'ae-tbar');
  const startBtn = h('button', 'ae-start', '');
  const paintStart = () => { startBtn.innerHTML = `<img src="${iconURL('drop', 24)}" alt="">${A.T('スタート', 'start')}`; };
  paintStart();
  const tasks = h('div', 'ae-tasks');
  const tray = h('div', 'ae-tray', `
    <span class="ti opt" data-t="crt" title="CRT テレビ (RF 入力)"><img src="${iconURL('crt16', 16)}" alt=""></span>
    <span class="ti opt" data-t="net" title="ひかり線ネットワーク"><img src="${iconURL('net', 16)}" alt=""></span>
    <span class="ti" data-t="vol" title="音量"><img src="${iconURL('vol', 16)}" alt=""></span>
    <span class="ae-clock"></span>`);
  tbar.append(startBtn, tasks, tray);
  const sm = h('div', 'ae-sm');
  root.append(desk, tbar, sm);
  A.winLayer = wins;
  A.taskArea = tasks;
  A.field = field;

  // ── icons ──
  const icons = [];
  let sel = new Set();
  function addIcon(spec) {
    const el = h('div', 'ae-ico pre');
    const url = iconURL(spec.icon, 48);
    el.innerHTML = `<div class="im" style="--m:url(${url})"><img src="${url}" alt="" draggable="false"></div><div class="lb"></div>`;
    el.querySelector('.lb').textContent = A.T(spec.label, spec.en || spec.label);
    el.title = spec.tip || '';
    const ic = { ...spec, el, col: spec.col, row: spec.row, moved: false };
    field.appendChild(el);
    icons.push(ic);
    bindIcon(ic);
    return ic;
  }
  function setIconImage(id, name) {
    const ic = icons.find((i) => i.id === id);
    if (!ic) return;
    const url = iconURL(name, 48);
    ic.icon = name;
    const im = ic.el.querySelector('.im');
    im.style.setProperty('--m', `url(${url})`);
    im.querySelector('img').src = url;
  }
  function grid() {
    const W = field.clientWidth || ctx.w, H = field.clientHeight || ctx.h - 40;
    return { cols: Math.max(1, Math.floor((W - PAD_X) / CELL_W)), rows: Math.max(1, Math.floor((H - PAD_Y) / CELL_H)), W, H };
  }
  function cellXY(c, r) { return [PAD_X + c * CELL_W, PAD_Y + r * CELL_H]; }
  function layout(force = false) {
    const g = grid();
    const taken = new Set();
    const key = (c, r) => c + ',' + r;
    icons.forEach((ic) => {
      if (ic.moved && !force) {
        ic.col = clamp(ic.col, 0, g.cols - 1);
        ic.row = clamp(ic.row, 0, g.rows - 1);
        taken.add(key(ic.col, ic.row));
      }
    });
    const free = (c, r) => !taken.has(key(c, r));
    icons.forEach((ic) => {
      if (ic.moved && !force) return;
      if (ic.corner) {
        let c = g.cols - 1, r = g.rows - 1;
        while (!free(c, r) && r > 0) r--;
        ic.col = c; ic.row = r;
      } else {
        let n = 0, c, r;
        do { c = Math.floor(n / g.rows); r = n % g.rows; n++; } while (!free(c, r) && n < 400);
        ic.col = c; ic.row = r;
      }
      taken.add(key(ic.col, ic.row));
    });
    icons.forEach((ic) => {
      const [x, y] = cellXY(ic.col, ic.row);
      ic.el.style.left = x + 'px';
      ic.el.style.top = y + 'px';
    });
  }
  function select(list, add = false) {
    if (!add) sel.forEach((ic) => ic.el.classList.remove('sel'));
    if (!add) sel = new Set();
    list.forEach((ic) => { sel.add(ic); ic.el.classList.add('sel'); });
  }
  function openIcon(ic) {
    A.sfx.click();
    ic.open && ic.open();
  }

  let lastTap = { ic: null, t: 0 };
  function bindIcon(ic) {
    const el = ic.el;
    let press = null, lp = 0;
    el.addEventListener('pointerdown', (e) => {
      if (e.button === 2) return;
      e.stopPropagation();
      A.wm.closeMenus();
      closeStart();
      if (e.ctrlKey || e.metaKey) { if (sel.has(ic)) { sel.delete(ic); el.classList.remove('sel'); } else select([ic], true); }
      else if (!sel.has(ic)) select([ic]);
      const p = A.wm.rel(e);
      press = { x: p.x, y: p.y, moved: false, id: e.pointerId, touch: isTouch(e), starts: [...sel].map((s) => [s, parseFloat(s.el.style.left), parseFloat(s.el.style.top)]) };
      el.setPointerCapture(e.pointerId);
      clearTimeout(lp);
      if (press.touch) lp = setTimeout(() => { if (press && !press.moved) { press.cancel = true; iconMenu(ic, p.x, p.y); } }, 560);
    }, sig);
    el.addEventListener('pointermove', (e) => {
      if (!press) return;
      const p = A.wm.rel(e);
      const dx = p.x - press.x, dy = p.y - press.y;
      if (!press.moved && Math.hypot(dx, dy) < 6) return;
      press.moved = true;
      clearTimeout(lp);
      press.starts.forEach(([s, x, y]) => { s.el.style.left = x + dx + 'px'; s.el.style.top = y + dy + 'px'; s.el.classList.add('drag'); });
    }, sig);
    const up = () => {
      if (!press) return;
      clearTimeout(lp);
      const pr = press;
      press = null;
      if (pr.cancel) return;
      if (pr.moved) {
        const g = grid();
        const taken = new Set(icons.filter((x) => !sel.has(x)).map((x) => x.col + ',' + x.row));
        pr.starts.forEach(([s]) => {
          s.el.classList.remove('drag');
          let c = clamp(Math.round((parseFloat(s.el.style.left) - PAD_X) / CELL_W), 0, g.cols - 1);
          let r = clamp(Math.round((parseFloat(s.el.style.top) - PAD_Y) / CELL_H), 0, g.rows - 1);
          let n = 0;
          while (taken.has(c + ',' + r) && n++ < 200) { r++; if (r >= g.rows) { r = 0; c = (c + 1) % g.cols; } }
          taken.add(c + ',' + r);
          s.col = c; s.row = r; s.moved = true;
          const [x, y] = cellXY(c, r);
          s.el.style.left = x + 'px'; s.el.style.top = y + 'px';
        });
        return;
      }
      const now = performance.now();
      if (pr.touch) { openIcon(ic); return; }
      if (lastTap.ic === ic && now - lastTap.t < 480) { lastTap = { ic: null, t: 0 }; openIcon(ic); }
      else lastTap = { ic, t: now };
    };
    el.addEventListener('pointerup', up, sig);
    el.addEventListener('pointercancel', () => { clearTimeout(lp); press = null; }, sig);
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault(); e.stopPropagation();
      if (!sel.has(ic)) select([ic]);
      const p = A.wm.rel(e);
      iconMenu(ic, p.x, p.y);
    }, sig);
  }

  function iconMenu(ic, x, y) {
    const T = A.T, nm = esc(T(ic.label, ic.en || ic.label));
    const items = [{ label: T('開く(O)', 'Open'), b: true, cb: () => openIcon(ic) }];
    if (ic.id === 'bin') {
      items.push({ label: T('ごみ箱を空にする(B)', 'Empty Recycle Bin'), dis: !A.binFull(), cb: () => A.apps.emptyBin() });
    } else {
      items.push({ sep: true }, {
        label: T('送る(N)', 'Send To'), sub: [
          { label: T('CRT テレビ (RF 3ch)', 'CRT Television (RF ch 3)'), icon: 'crt16', cb: () => balloon({ title: T('CRT テレビ (RF 入力)', 'CRT Television (RF input)'), icon: 'crt16', html: A.L(`「${nm}」を 3ch に[送信|そうしん|send; transmit]しました。[少|すこ|a little]しにじんで[映|うつ|to appear (on screen)]っています。`, `Sent “${nm}” to channel 3. It's showing, a little blurry at the edges.`) }) },
          { label: T('デスクトップ (ショートカットを作成)', 'Desktop (create shortcut)'), dis: true },
          { label: T('3.5 インチ FD (A:)', '3½ Floppy (A:)'), cb: () => A.wm.msgbox({ title: T('3.5 インチ FD (A:)', '3½ Floppy (A:)'), icon: 'warn', html: A.L('A:\\ にアクセスできません。<br>デバイスの[準備|じゅんび|preparation; ready]ができていません。<small>(フロッピーは、もうどこにもありません)</small>', 'A:\\ is not accessible.<br>The device is not ready.<small>(There are no floppies left anywhere.)</small>') }) },
        ],
      });
      items.push({ sep: true }, { label: T('削除(D)', 'Delete'), cb: () => tryDelete(ic) }, { label: T('名前の変更(M)', 'Rename'), dis: true });
    }
    items.push({ sep: true }, { label: T('プロパティ(R)', 'Properties'), cb: () => A.apps.props(ic) });
    A.wm.menu(x, y, items);
  }
  async function tryDelete(ic) {
    if (ic.id === 'bin') return;
    const T = A.T, nm = esc(T(ic.label, ic.en || ic.label));
    const r = await A.wm.msgbox({ title: T('ファイルの削除の確認', 'Confirm File Delete'), icon: 'question', html: A.L(`「${nm}」をごみ箱に[移動|いどう|move]しますか?`, `Are you sure you want to send “${nm}” to the Recycle Bin?`), buttons: [T('はい(Y)', 'Yes'), T('いいえ(N)', 'No')] });
    if (r !== 0) return;
    A.wm.msgbox({ title: T('ファイルの削除エラー', 'Error Deleting File'), icon: 'error', html: A.L(`「${nm}」を[削除|さくじょ|deletion]できません: [大事|だいじ|precious; important]なファイルです。<small>このファイルは、あなたの[一部|いちぶ|a part (of)]として[使用中|しようちゅう|in use]です。</small>`, `Cannot delete “${nm}”: it is an important file.<small>This file is in use, as a part of you.</small>`) });
  }

  // ── selection rectangle + desktop menu ──
  let band = null;
  field.addEventListener('pointerdown', (e) => {
    if (e.target !== field) return;
    closeStart();
    if (e.button === 2) return;
    select([]);
    const p = A.wm.rel(e);
    const r = field.getBoundingClientRect(), rr = root.getBoundingClientRect();
    const ox = r.left - rr.left, oy = r.top - rr.top;
    const touch = isTouch(e);
    let lp = 0;
    if (touch) lp = setTimeout(() => { if (band && !band.moved) { band.el.remove(); band = null; deskMenu(p.x, p.y); } }, 560);
    band = { x0: p.x - ox, y0: p.y - oy, el: h('div', 'ae-sel'), moved: false };
    field.setPointerCapture(e.pointerId);
    const mv = (ev) => {
      if (!band) return;
      const q = A.wm.rel(ev);
      const x1 = q.x - ox, y1 = q.y - oy;
      if (!band.moved && Math.hypot(x1 - band.x0, y1 - band.y0) < 4) return;
      if (!band.moved) { band.moved = true; field.appendChild(band.el); clearTimeout(lp); }
      const L = Math.min(band.x0, x1), T = Math.min(band.y0, y1), W = Math.abs(x1 - band.x0), H = Math.abs(y1 - band.y0);
      Object.assign(band.el.style, { left: L + 'px', top: T + 'px', width: W + 'px', height: H + 'px' });
      const hit = icons.filter((ic) => {
        const x = parseFloat(ic.el.style.left), y = parseFloat(ic.el.style.top);
        const w = ic.el.offsetWidth, hh = ic.el.offsetHeight;
        return x < L + W && x + w > L && y < T + H && y + hh > T;
      });
      select(hit);
    };
    const up = () => {
      clearTimeout(lp);
      if (band) band.el.remove();
      band = null;
      field.removeEventListener('pointermove', mv);
      field.removeEventListener('pointerup', up);
      field.removeEventListener('pointercancel', up);
    };
    field.addEventListener('pointermove', mv);
    field.addEventListener('pointerup', up);
    field.addEventListener('pointercancel', up);
  }, sig);
  field.addEventListener('contextmenu', (e) => {
    if (e.target !== field) return;
    e.preventDefault();
    const p = A.wm.rel(e);
    deskMenu(p.x, p.y);
  }, sig);
  function sortBy(fn) {
    const list = icons.filter((i) => !i.corner).sort(fn);
    const rest = icons.filter((i) => i.corner);
    icons.length = 0;
    icons.push(...list, ...rest);
    icons.forEach((i) => { i.moved = false; });
    layout(true);
  }
  function deskMenu(x, y) {
    const T = A.T;
    A.wm.menu(x, y, [
      { label: T('アイコンの整列(I)', 'Arrange Icons By'), sub: [
        { label: T('名前', 'Name'), cb: () => sortBy((a, b) => T(a.label, a.en || a.label).localeCompare(T(b.label, b.en || b.label), A.en ? 'en' : 'ja')) },
        { label: T('種類', 'Type'), cb: () => sortBy((a, b) => a.kind.localeCompare(b.kind)) },
        { label: T('更新日時', 'Modified'), cb: () => sortBy((a, b) => (a.date || '').localeCompare(b.date || '')) },
        { sep: true },
        { label: T('等間隔に整列', 'Align to Grid'), chk: true, cb: () => layout(true) },
      ] },
      { label: T('最新の情報に更新(E)', 'Refresh'), cb: refresh },
      { sep: true },
      { label: T('貼り付け(P)', 'Paste'), dis: true },
      { label: T('ショートカットの貼り付け(S)', 'Paste Shortcut'), dis: true },
      { sep: true },
      { label: T('新規作成(W)', 'New'), sub: [
        { label: T('フォルダ(F)', 'Folder'), icon: 'docs', cb: () => A.apps.newItem('folder') },
        { label: T('テキスト ドキュメント', 'Text Document'), icon: 'txt', cb: () => A.apps.newItem('txt') },
      ] },
      { sep: true },
      { label: T('プロパティ(R)', 'Properties'), cb: () => A.apps.open('display') },
    ]);
  }
  function refresh() {
    icons.forEach((ic, i) => {
      ic.el.style.transition = 'none';
      ic.el.style.opacity = '0';
      setTimeout(() => { ic.el.style.transition = ''; ic.el.style.opacity = ''; }, 90 + i * 12);
    });
  }
  root.addEventListener('keydown', (e) => {
    if (A.phase !== 'desk' || e.target.closest('input,textarea,[contenteditable="true"]')) return;
    if (e.key === 'Enter' && sel.size === 1) openIcon([...sel][0]);
    if (e.key === 'Delete' && sel.size === 1) tryDelete([...sel][0]);
    if (e.key === 'F5') { e.preventDefault(); refresh(); }
  }, sig);

  // ── start menu ──
  const S = (icon, html, cb, cls = '', en = '') => ({ icon, html, cb, cls, en });
  function buildStart() {
    const left = [
      S('globe', '<b>インターネット</b><small>Hikari Explorer</small>', () => A.apps.open('ie'), '', '<b>Internet</b><small>Hikari Explorer</small>'),
      S('msn', '<b>メッセンジャー</b><small>ひかり メッセンジャー</small>', () => A.apps.open('msn'), '', '<b>Messenger</b><small>Hikari Messenger</small>'),
      null,
      S('music', 'ひかり プレーヤー', () => A.apps.open('music'), '', 'Hikari Player'),
      S('notepad', 'todo.txt - メモ帳', () => A.apps.open('todo'), '', 'todo.txt - Notepad'),
      S('beetlecd', 'Beetle Ju セットアップ', () => A.apps.open('beetle'), '', 'Beetle Ju Setup'),
      S('camera', 'flicker_lab', () => A.apps.open('flicker')),
      S('train', 'ひかり線に[乗|の|to board]る', () => A.leave(), '', 'Board the Hikari Line'),
    ];
    const right = [
      S('docs', 'マイ ドキュメント', () => A.apps.open('docs'), 'b', 'My Documents'),
      S('pics', 'マイ ピクチャ', () => A.apps.open('pics'), 'b', 'My Pictures'),
      S('music', 'マイ ミュージック', () => A.apps.open('music'), 'b', 'My Music'),
      S('computer', 'マイ コンピュータ', () => A.apps.open('mycomp'), 'b', 'My Computer'),
      null,
      S('display', 'コントロール パネル', () => A.apps.open('display'), '', 'Control Panel'),
      null,
      S('help', 'ヘルプとサポート', () => A.apps.open('help'), '', 'Help and Support'),
      S('search', '[検索|けんさく|search]', () => A.apps.open('search'), '', 'Search'),
      S('run', 'ファイル名を[指定|してい|specify]して[実行|じっこう|run]...', () => A.apps.open('run'), '', 'Run...'),
    ];
    const row = (it, small) => it ? `<div class="si ${it.cls}" data-k="${small}">${iconImg(it.icon, small ? 24 : 32)}<div>${A.L(it.html, it.en || it.html)}</div></div>` : '<div class="ssep"></div>';
    sm.innerHTML = `
      <div class="smh"><img src="${iconURL('userpic', 46)}" alt="">devansh</div>
      <div class="smb">
        <div class="sml">${left.map((it) => row(it, 0)).join('')}<div class="ssep"></div><div class="si all" data-all="1">${A.T('すべてのプログラム(P)', 'All Programs')} ${iconImg('allprog', 20)}</div></div>
        <div class="smr">${right.map((it) => row(it, 1)).join('')}</div>
      </div>
      <div class="smf"><div class="si" data-f="logoff">${iconImg('logoff', 24)}${A.T('ログオフ(L)', 'Log Off')}</div><div class="si" data-f="power">${iconImg('power', 24)}${A.T('電源を切る(U)', 'Turn Off Computer')}</div></div>`;
    const all = [...left, ...right];
    const nodes = [...sm.querySelectorAll('.sml .si:not(.all), .smr .si')];
    const flat = all.filter(Boolean);
    nodes.forEach((n, i) => n.addEventListener('click', () => { closeStart(); A.sfx.click(); flat[i].cb(); }));
    sm.querySelector('[data-f="logoff"]').addEventListener('click', () => { closeStart(); A.power.logoffDialog(); });
    sm.querySelector('[data-f="power"]').addEventListener('click', () => { closeStart(); A.power.shutdownDialog(); });
    const allBtn = sm.querySelector('.all');
    allBtn.addEventListener('pointerenter', () => showAll(allBtn));
    allBtn.addEventListener('click', () => showAll(allBtn));
  }
  function showAll(el) {
    const r = el.getBoundingClientRect(), rr = root.getBoundingClientRect();
    A.wm.closeMenus();
    const T = A.T;
    const items = [
      { label: T('アクセサリ', 'Accessories'), icon: 'docs', sub: [
        { label: T('メモ帳', 'Notepad'), icon: 'notepad', cb: () => { closeStart(); A.apps.open('notepad'); } },
        { label: T('ファイル名を指定して実行', 'Run...'), icon: 'run', cb: () => { closeStart(); A.apps.open('run'); } },
        { label: T('スクリーン セーバー (シャボン玉)', 'Screen Saver (Bubbles)'), icon: 'bubble', cb: () => { closeStart(); setTimeout(() => A.saver.start(true), 300); } },
      ] },
      { sep: true },
      { label: 'Beetle Ju', icon: 'beetlecd', cb: () => { closeStart(); A.apps.open('beetle'); } },
      { label: 'Hikari Explorer', icon: 'globe', cb: () => { closeStart(); A.apps.open('ie'); } },
      { label: T('ひかり プレーヤー', 'Hikari Player'), icon: 'music', cb: () => { closeStart(); A.apps.open('music'); } },
      { label: T('ひかり メッセンジャー', 'Hikari Messenger'), icon: 'msn', cb: () => { closeStart(); A.apps.open('msn'); } },
      { label: 'flicker_lab', icon: 'camera', cb: () => { closeStart(); A.apps.open('flicker'); } },
      { sep: true },
      { label: T('ひかり線 時刻表', 'Hikari Line Timetable'), icon: 'train', cb: () => { closeStart(); A.apps.open('ie', 'timetable'); } },
    ];
    A.wm.menu(Math.min(r.right - rr.left - 4, root.clientWidth - 200), r.top - rr.top - 60, items);
  }
  function toggleStart() {
    const on = !sm.classList.contains('on');
    if (on) { buildStart(); A.wm.closeMenus(); }
    sm.classList.toggle('on', on);
    startBtn.classList.toggle('on', on);
    ctx.exitVisible(!on);
    A.sfx.click();
  }
  function closeStart() { const was = sm.classList.contains('on'); sm.classList.remove('on'); startBtn.classList.remove('on'); if (was && A.phase === 'desk') ctx.exitVisible(true); }
  startBtn.addEventListener('click', toggleStart, sig);
  root.addEventListener('pointerdown', (e) => {
    if (sm.classList.contains('on') && !e.target.closest('.ae-sm') && !e.target.closest('.ae-start') && !e.target.closest('.ae-cm')) closeStart();
  }, { capture: true, signal: ctx.signal });

  // ── tray ──
  const clock = tray.querySelector('.ae-clock');
  function tick() {
    const d = new Date();
    clock.textContent = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    clock.title = A.en ? osDate(d).longEn : osDate(d).long;
  }
  tick();
  ctx.interval(tick, 10000);
  tray.addEventListener('click', (e) => {
    const t = e.target.closest('[data-t]');
    if (t) {
      A.sfx.click();
      if (t.dataset.t === 'crt') balloon({ title: A.T('CRT テレビ (RF 入力)', 'CRT Television (RF input)'), icon: 'crt16', html: A.L('チャンネル: 3 (NTSC-M)<br>[信号|しんごう|signal]: [良好|りょうこう|good]。[少|すこ|a little]しだけ[砂嵐|すなあらし|static (lit. sandstorm)]が[混|ま|to be mixed in]ざっています。', 'Channel: 3 (NTSC-M)<br>Signal: good. A little snow mixed in.') });
      if (t.dataset.t === 'net') balloon({ title: A.T('ひかり線ネットワーク', 'Hikari Line Network'), icon: 'net', html: A.L('[接続|せつぞく|connection]されています。<br>[速度|そくど|speed]: 56.0 Kbps (ゆっくり)', 'Connected.<br>Speed: 56.0 Kbps (slowly)') });
      if (t.dataset.t === 'vol') balloon({ title: A.T('音量', 'Volume'), icon: 'vol', html: A.L(`音量: ちょうどいい。<br>[消音|しょうおん|mute]は M キーで。${ctx.muted ? '<br>(いまは消音中です)' : ''}`, `Volume: just right.<br>Press M to mute.${ctx.muted ? '<br>(Muted right now.)' : ''}`) });
    }
  }, sig);
  clock.addEventListener('dblclick', () => A.wm.msgbox({ title: A.T('日付と時刻のプロパティ', 'Date and Time Properties'), icon: 'info', html: A.L(`${osDate().long}<br>${clock.textContent}<small>この[時計|とけい|clock]は[今日|きょう|today]の[時刻|じこく|time]を[指|さ|to point]しています。[年|ねん|year]だけが、[少|すこ|a little]し[古|ふる|old]いです。</small>`, `${osDate().longEn}<br>${clock.textContent}<small>This clock shows today's time. Only the year is a little old.</small>`) }), sig);

  // ── balloons ──
  const queue = [];
  let showing = null;
  function balloon(b) {
    queue.push(b);
    if (!showing) nextBalloon();
  }
  function nextBalloon() {
    const b = queue.shift();
    if (!b) { showing = null; return; }
    const el = h('div', 'ae-balloon', `<div class="bt">${b.icon ? iconImg(b.icon, 16) : ''}<span></span></div><div class="bb">${b.html}</div><div class="bx">×</div>`);
    el.querySelector('.bt span').textContent = b.title;
    root.appendChild(el);
    showing = el;
    if (b.sound !== false) A.sfx.balloon();
    let gone = false;
    const close = () => {
      if (gone) return;
      gone = true;
      el.classList.add('out');
      setTimeout(() => { el.remove(); nextBalloon(); }, 320);
    };
    el.querySelector('.bx').addEventListener('click', (e) => { e.stopPropagation(); close(); });
    el.addEventListener('click', () => { if (b.onClick) b.onClick(); close(); });
    ctx.timeout(close, b.ms || 7500);
  }

  // ── messenger-style toast (one at a time; a newer message replaces the text) ──
  let cur = null;
  function toast({ title = A.T('ひかり メッセンジャー', 'Hikari Messenger'), html, icon = 'msn', onClick, ms = 6000 }) {
    if (cur && cur.alive) {
      cur.el.querySelector('.th span').textContent = title;
      cur.el.querySelector('.tc > div').innerHTML = html;
      cur.onClick = onClick;
      clearTimeout(cur.timer);
      cur.timer = setTimeout(cur.close, ms);
      return;
    }
    const el = h('div', 'ae-toast', `<div class="th">${iconImg('msn', 16)}<span></span></div><div class="tc">${iconImg(icon, 32)}<div>${html}</div></div>`);
    el.querySelector('.th span').textContent = title;
    root.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('on')));
    const t = { el, alive: true, onClick, timer: 0 };
    t.close = () => { if (!t.alive) return; t.alive = false; el.classList.remove('on'); setTimeout(() => el.remove(), 520); };
    el.addEventListener('click', () => { t.onClick && t.onClick(); t.close(); });
    t.timer = setTimeout(t.close, ms);
    ctx.signal.addEventListener('abort', () => clearTimeout(t.timer));
    cur = t;
  }

  function relabel() {
    paintStart();
    const tt = { crt: ['CRT テレビ (RF 入力)', 'CRT Television (RF input)'], net: ['ひかり線ネットワーク', 'Hikari Line Network'], vol: ['音量', 'Volume'] };
    tray.querySelectorAll('[data-t]').forEach((el) => { el.title = A.T(...tt[el.dataset.t]); });
    icons.forEach((ic) => { ic.el.querySelector('.lb').textContent = A.T(ic.label, ic.en || ic.label); });
    tick();
    if (sm.classList.contains('on')) buildStart();
  }
  relabel();

  return {
    relabel,
    desk, field, tbar, addIcon, setIconImage, layout, balloon, toast, closeStart,
    icons,
    show() {
      desk.classList.add('on');
      tbar.classList.add('on');
      layout();
      icons.forEach((ic, i) => ctx.timeout(() => ic.el.classList.remove('pre'), 120 + i * 70));
    },
    hide() {
      queue.length = 0;
      root.querySelectorAll('.ae-balloon,.ae-toast').forEach((el) => el.remove());
      showing = null;
      if (cur) cur.alive = false;
      desk.classList.remove('on');
      tbar.classList.remove('on');
      closeStart();
      icons.forEach((ic) => ic.el.classList.add('pre'));
    },
  };
}
