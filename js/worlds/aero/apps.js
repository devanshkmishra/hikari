// The programs. A registry that opens windows, plus the smaller ones written here:
// メモ帳, folders, マイ ピクチャ, ごみ箱, 画面のプロパティ, ファイル名を指定して実行, ヘルプ, 検索.
import { h, esc, osDate, clamp } from './util.js';
import { iconImg } from './icons.js';
import { PHOTOS, photo, thumb } from './photos.js';
import { todoText, todoTextEn, README, TUNING, REEL, NIHONGO, NIHONGO_EN, BIN } from './texts.js';
import { openPlayer, PLAYER_CSS } from './player.js';
import { openBrowser, BROWSER_CSS } from './explorer.js';
import { openMessenger, openChat, MSN_CSS } from './messenger.js';
import { openBeetle, BEETLE_CSS } from './beetle.js';
import { openFlicker, FLICKER_CSS } from './flicker.js';

export const APPS_CSS = `
.ae-np{flex:1;min-height:0;overflow:auto;background:#fff;padding:6px 8px 20px;font:14px/1.6 "IBM Plex Mono","Zen Kaku Gothic New",monospace;color:#111;
  white-space:pre-wrap;word-break:break-word;outline:none;-webkit-user-select:text;user-select:text;cursor:text;border-top:1px solid #a9a594;touch-action:pan-y}
.ae-np.ro{cursor:default}
.ae-np.ascii{white-space:pre;font-size:13px;line-height:1.45;word-break:normal}
.ae-fold{flex:1;min-height:0;display:flex}
.ae-tp{width:206px;flex:none;overflow:auto;padding:10px;background:linear-gradient(180deg,#7ba2e7,#6375d6);touch-action:pan-y}
.ae-tp .pn{background:#d6dff7;border-radius:5px 5px 0 0;margin-bottom:12px;overflow:hidden}
.ae-tp .ph{padding:5px 10px;font-weight:bold;color:#215dc6;background:linear-gradient(90deg,#fff,#c6d3f7)}
.ae-tp .pb{padding:8px 10px;background:#d6dff7;font-size:13px;line-height:1.6;color:#1a1a1a}
.ae-tp .pb a{display:flex;align-items:flex-start;gap:6px;color:#0b3e9a;cursor:pointer;padding:2px 0}
.ae-tp .pb a:hover{text-decoration:underline;color:#2a6ae8}
.ae-tp .pb a.dis{color:#7f8db0;pointer-events:none}
.ae-tp .pb a img{margin-top:2px;flex:none}
.ae-fl{flex:1;min-width:0;overflow:auto;background:#fff;padding:10px;display:flex;flex-wrap:wrap;align-content:flex-start;gap:6px 4px;touch-action:pan-y}
.ae-fi{width:104px;display:flex;flex-direction:column;align-items:center;text-align:center;padding:4px;border-radius:3px;font-size:13px;line-height:1.3;word-break:break-all}
.ae-fi img{margin-bottom:3px}
.ae-fi:hover{background:#e8f0fd}
.ae-fi.sel{background:#316ac5;color:#fff}
.ae-dt{width:100%;border-collapse:collapse;font-size:13px}
.ae-dt th{position:sticky;top:0;text-align:left;font-weight:normal;padding:3px 8px;background:linear-gradient(#fff,#ebeadb);border-right:1px solid #d6d2c2;border-bottom:1px solid #d6d2c2;white-space:nowrap}
.ae-dt td{padding:3px 8px;white-space:nowrap}
.ae-dt td:first-child{display:flex;align-items:center;gap:6px}
.ae-dt tr:hover td{background:#e8f0fd}
.ae-dt tr.sel td{background:#316ac5;color:#fff}
.ae-fl.det{display:block;padding:0}
.ae-empty{padding:30px;color:#777;font-size:13px}
.ae-addr{display:flex;align-items:center;gap:6px;padding:3px 6px;background:#ece9d8;border-bottom:1px solid #d6d2c2;font-size:13px}
.ae-addr .box{flex:1;min-width:0;display:flex;align-items:center;gap:5px;height:24px;background:#fff;border:1px solid #7f9db9;padding:0 5px;overflow:hidden;white-space:nowrap}
/* pictures */
.ae-pv{flex:1;min-width:0;display:flex;flex-direction:column;background:#fff}
.ae-pv .stage{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:12px;background:#fff;position:relative}
.ae-pv .stage canvas{max-width:100%;max-height:100%;box-shadow:2px 3px 8px rgba(0,0,0,.35);transition:transform .3s;background:#000}
.ae-pv .nav{display:flex;justify-content:center;gap:6px;padding:6px;flex:none}
.ae-pv .nb{width:30px;height:30px;border-radius:50%;border:1px solid #6d8fc9;padding:0;display:grid;place-items:center;color:#1d4fa8;font-size:13px;
  background:radial-gradient(circle at 35% 25%,#fff,#dbe8fb 60%,#bcd2f4)}
.ae-pv .nb:hover{box-shadow:0 0 0 2px #f8b33a}
.ae-pv .strip{flex:none;display:flex;gap:8px;padding:8px 10px 10px;overflow-x:auto;background:#f6f6f2;border-top:1px solid #e1ded0;touch-action:pan-x}
.ae-pv .strip .th{flex:none;padding:3px;border:2px solid transparent;border-radius:2px;text-align:center;font-size:13px;cursor:pointer}
.ae-pv .strip .th canvas{width:96px;height:72px;display:block;box-shadow:1px 1px 3px rgba(0,0,0,.3)}
.ae-pv .strip .th.on{border-color:#316ac5;background:#dbe6f9}
.ae-pv .cap{flex:none;padding:6px 12px 8px;font-size:14px;line-height:1.7;color:#222;border-top:1px solid #eee;min-height:36px}
.ae-pv .cap small{display:block;color:#666;font-size:13px}
.ae-show{position:absolute;inset:0;z-index:86;background:#000;display:flex;align-items:center;justify-content:center;cursor:none}
.ae-show canvas{max-width:92%;max-height:86%;transition:opacity 1s}
.ae-show .q{position:absolute;bottom:18px;left:0;right:0;text-align:center;color:#ccc;font-size:14px;line-height:1.6}
/* properties */
.ae-props .bd{padding:10px}
.ae-tabs{display:flex;gap:2px;padding:0 6px;position:relative;top:1px;flex-wrap:wrap}
.ae-tabs span{padding:4px 12px;border:1px solid #919b9c;border-bottom:0;border-radius:3px 3px 0 0;background:linear-gradient(#fff,#ecebe5);font-size:13px}
.ae-tabs span.on{background:#fcfcfe;border-top:2px solid #f8b33a;padding-bottom:5px;margin-top:-2px}
.ae-tabp{flex:1;min-height:0;border:1px solid #919b9c;background:#fcfcfe;padding:12px;overflow:auto;display:flex;flex-direction:column;align-items:center;gap:10px}
.ae-mon{width:190px;height:160px;position:relative;flex:none}
.ae-mon .case{position:absolute;left:0;top:0;width:190px;height:136px;border-radius:12px;background:linear-gradient(#f4f2ea,#cfc9b8);box-shadow:inset 0 0 0 1px #9b9584,0 2px 4px rgba(0,0,0,.2)}
.ae-mon canvas{position:absolute;left:14px;top:12px;width:162px;height:112px;border-radius:6px;background:#000;box-shadow:inset 0 0 0 2px #333}
.ae-mon .stand{position:absolute;left:66px;top:136px;width:58px;height:20px;background:linear-gradient(#d9d4c4,#a9a393);clip-path:polygon(15% 0,85% 0,100% 100%,0 100%)}
.ae-list{width:100%;max-width:340px;height:96px;overflow:auto;border:1px solid #7f9db9;background:#fff;font-size:13px}
.ae-list div{padding:2px 6px}
.ae-list div.on{background:#316ac5;color:#fff}
.ae-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:13px;width:100%;max-width:340px}
.ae-foot{display:flex;justify-content:flex-end;gap:6px;padding-top:10px;flex-wrap:wrap}
.ae-run .bd{padding:14px}
.ae-kv{display:grid;grid-template-columns:auto 1fr;gap:4px 14px;font-size:13px;margin-top:8px}
.ae-kv b{font-weight:normal;color:#555}
`;

export const ALL_CSS = () => APPS_CSS + PLAYER_CSS + BROWSER_CSS + MSN_CSS + BEETLE_CSS + FLICKER_CSS;

export function createApps(A) {
  const { ctx } = A;
  const opened = new Set();
  const note = (id) => { opened.add(id); A.emit('open:' + id); };

  const T = (ja, en) => A.T(ja, en);
  const L = (ja, en) => A.L(ja, en);
  const npName = (n) => `${n} - ${T('メモ帳', 'Notepad')}`;

  // ── メモ帳 ──
  function notepad({ id, name, text = '', glossed = false, ascii = false, editable = true, store = null }) {
    const saved = store ? ctx.store.get(store, null) : null;
    const body = h('div', 'ae-np' + (ascii ? ' ascii' : '') + (editable ? '' : ' ro'));
    if (saved != null) body.textContent = saved;
    else if (glossed) body.innerHTML = A.jp(text);
    else body.textContent = text;
    if (editable) { body.contentEditable = 'true'; body.spellcheck = false; }
    let dirty = false;
    body.addEventListener('input', () => { if (!dirty) win.setTitle('*' + npName(name)); dirty = true; win.dirty = true; });
    body.addEventListener('keydown', (e) => {
      if (e.key === 'F5') { e.preventDefault(); insertText(`${new Date().toTimeString().slice(0, 5)} ${osDate().str}`); }
      if (e.key === 'Tab') { e.preventDefault(); insertText('    '); }
    });
    function insertText(t) {
      body.focus();
      const s = getSelection();
      if (!s.rangeCount) { body.append(t); return; }
      const r = s.getRangeAt(0);
      r.deleteContents();
      r.insertNode(document.createTextNode(t));
      r.collapse(false);
      dirty = true; win.dirty = true;
    }
    const save = () => { if (store) ctx.store.set(store, body.innerText); dirty = false; win.dirty = false; win.setTitle(npName(name)); };
    let wrap = true;
    const win = A.wm.open({
      id: 'np-' + id, title: npName(name), icon: 'notepad', w: ascii ? 640 : 600, h: 520,
      menu: [
        { label: T('ファイル(F)', 'File'), items: () => [
          { label: T('新規(N)', 'New'), cb: () => notepad({ id: 'new' + Date.now(), name: T('無題', 'Untitled'), text: '' }) },
          { label: T('上書き保存(S)', 'Save'), dis: !editable, cb: save },
          { sep: true },
          { label: T('印刷(P)...', 'Print...'), dis: true },
          { sep: true },
          { label: T('メモ帳の終了(X)', 'Exit'), cb: () => win.close() },
        ] },
        { label: T('編集(E)', 'Edit'), items: () => [
          { label: T('元に戻す(U)', 'Undo'), dis: true },
          { sep: true },
          { label: T('すべて選択(A)', 'Select All'), cb: () => { const r = document.createRange(); r.selectNodeContents(body); const s = getSelection(); s.removeAllRanges(); s.addRange(r); } },
          { label: T('日付と時刻(D)    F5', 'Time/Date    F5'), dis: !editable, cb: () => insertText(`${new Date().toTimeString().slice(0, 5)} ${osDate().str}`) },
        ] },
        { label: T('書式(O)', 'Format'), items: () => [
          { label: T('右端で折り返す(W)', 'Word Wrap'), chk: wrap, cb: () => { wrap = !wrap; body.style.whiteSpace = wrap ? '' : 'pre'; } },
          { label: T('フォント(F)...', 'Font...'), dis: true },
        ] },
        { label: T('ヘルプ(H)', 'Help'), items: () => [
          { label: T('バージョン情報(A)', 'About Notepad'), cb: () => A.wm.msgbox({ title: T('メモ帳のバージョン情報', 'About Notepad'), icon: 'notepad', html: L('HIKARI Aqua 2004 メモ帳<br>Version 5.1<small>このメモ帳は、[未完了|みかんりょう|unfinished]の todo を[責|せ|to blame]めません。</small>', 'HIKARI Aqua 2004 Notepad<br>Version 5.1<small>This notepad does not judge unfinished todos.</small>') }) },
        ] },
      ],
      onClose: () => {
        if (!dirty || !store) return true;
        A.wm.msgbox({ title: T('メモ帳', 'Notepad'), icon: 'warn', html: L(`${esc(name)} の[内容|ないよう|contents]は[変更|へんこう|change]されています。<br><br>[変更|へんこう|changes]を[保存|ほぞん|save]しますか?`, `The text in the ${esc(name)} file has changed.<br><br>Do you want to save the changes?`), buttons: [T('はい(Y)', 'Yes'), T('いいえ(N)', 'No'), T('キャンセル', 'Cancel')] }).then((r) => {
          if (r === 0) { save(); win.close(true); }
          else if (r === 1) win.close(true);
        });
        return false;
      },
    });
    win.body.appendChild(body);
    return win;
  }

  // ── folders ──
  function folder({ id, title, icon = 'docs', addr, items = [], view = 'icons', tasks = [], other = [], details = '', cols, onOpen }) {
    const wrap = h('div', 'ae-fold');
    const tp = h('div', 'ae-tp');
    if (ctx.w < 640) tp.style.display = 'none';
    const panel = (head, inner) => `<div class="pn"><div class="ph">${head}</div><div class="pb">${inner}</div></div>`;
    const oth = other.length ? other : [['docs', T('マイ ドキュメント', 'My Documents'), 'docs'], ['computer', T('マイ コンピュータ', 'My Computer'), 'mycomp']];
    tp.innerHTML = (tasks.length ? panel(T('ファイルとフォルダのタスク', 'File and Folder Tasks'), tasks.map((t, i) => `<a data-t="${i}" class="${t.dis ? 'dis' : ''}">${iconImg(t.icon || 'docs', 16)}<span>${t.label}</span></a>`).join('')) : '') +
      panel(T('その他', 'Other Places'), oth.map(([ic, lb, to]) => `<a data-o="${to}">${iconImg(ic, 16)}<span>${esc(lb)}</span></a>`).join('')) +
      (details ? panel(T('詳細', 'Details'), details) : '');
    tp.addEventListener('click', (e) => {
      const a = e.target.closest('a');
      if (!a) return;
      A.sfx.click();
      if (a.dataset.t != null) tasks[+a.dataset.t].cb();
      if (a.dataset.o) open(a.dataset.o);
    });
    const fl = h('div', 'ae-fl' + (view === 'details' ? ' det' : ''));
    function render() {
      fl.innerHTML = '';
      if (!items.length) { fl.innerHTML = `<div class="ae-empty">${L('このフォルダは[空|から|empty]です。', 'This folder is empty.')}</div>`; return; }
      if (view === 'details') {
        const c = cols || [[T('名前', 'Name'), 'name'], [T('サイズ', 'Size'), 'size'], [T('種類', 'Type'), 'kind'], [T('更新日時', 'Date Modified'), 'date']];
        fl.innerHTML = `<table class="ae-dt"><thead><tr>${c.map(([l]) => `<th>${esc(l)}</th>`).join('')}</tr></thead><tbody>${items.map((it, i) => `<tr data-i="${i}">${c.map(([, k], j) => `<td>${j === 0 ? iconImg(it.icon, 16) : ''}${esc(it[k] || '')}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
      } else {
        items.forEach((it, i) => {
          const d = h('div', 'ae-fi', `${iconImg(it.icon, 48)}<span></span>`);
          d.querySelector('span').textContent = it.name;
          d.dataset.i = i;
          fl.appendChild(d);
        });
      }
    }
    render();
    let last = { i: -1, t: 0 };
    fl.addEventListener('pointerup', (e) => {
      const n = e.target.closest('[data-i]');
      fl.querySelectorAll('.sel').forEach((x) => x.classList.remove('sel'));
      if (!n) return;
      n.classList.add('sel');
      const i = +n.dataset.i, t = performance.now();
      if (e.pointerType === 'touch' || (last.i === i && t - last.t < 480)) { last = { i: -1, t: 0 }; A.sfx.click(); (items[i].open || onOpen || (() => {}))(items[i]); }
      else last = { i, t };
    });
    wrap.append(tp, fl);
    const addrBar = h('div', 'ae-addr', `${T('アドレス(D)', 'Address')} <div class="box">${iconImg(icon, 16)}<span></span></div>`);
    addrBar.querySelector('span').textContent = addr || title;
    const count = () => T(`${items.length} 個のオブジェクト`, `${items.length} object${items.length === 1 ? '' : 's'}`);
    const sb = h('div', 'ae-sb', `<div style="flex:1">${count()}</div><div>${T('マイ コンピュータ', 'My Computer')}</div>`);
    const win = A.wm.open({ id: 'f-' + id, title, icon, w: 720, h: 480, menu: [
      { label: T('ファイル(F)', 'File'), items: () => [{ label: T('閉じる(C)', 'Close'), cb: () => win.close() }] },
      { label: T('編集(E)', 'Edit'), items: () => [{ label: T('すべて選択(A)', 'Select All'), cb: () => fl.querySelectorAll('[data-i]').forEach((x) => x.classList.add('sel')) }] },
      { label: T('表示(V)', 'View'), items: () => [
        { label: T('アイコン(N)', 'Icons'), chk: view === 'icons', cb: () => { view = 'icons'; fl.classList.remove('det'); render(); } },
        { label: T('詳細(D)', 'Details'), chk: view === 'details', cb: () => { view = 'details'; fl.classList.add('det'); render(); } },
      ] },
      { label: T('ヘルプ(H)', 'Help'), items: () => [{ label: T('バージョン情報(A)', 'About HIKARI Aqua'), cb: () => about() }] },
    ] });
    win.body.append(addrBar, wrap, sb);
    win.refresh = (list) => { items = list; render(); sb.firstChild.textContent = count(); };
    return win;
  }

  // ── マイ ピクチャ ──
  const MYPIC = () => T('マイ ピクチャ', 'My Pictures');
  function pictures(startId) {
    let idx = Math.max(0, PHOTOS.findIndex((p) => p.id === startId));
    let rot = 0;
    const wrap = h('div', 'ae-fold');
    const tp = h('div', 'ae-tp');
    if (ctx.w < 640) tp.style.display = 'none';
    const pv = h('div', 'ae-pv', `<div class="stage"></div><div class="nav">
      <button class="nb" data-a="prev" title="${T('前のイメージ', 'Previous Image')}">◀</button><button class="nb" data-a="next" title="${T('次のイメージ', 'Next Image')}">▶</button>
      <button class="nb" data-a="rl" title="${T('左回転', 'Rotate Counterclockwise')}">⟲</button><button class="nb" data-a="rr" title="${T('右回転', 'Rotate Clockwise')}">⟳</button>
      <button class="nb" data-a="show" title="${T('スライド ショー', 'Slide Show')}">▣</button></div>
      <div class="cap"></div><div class="strip"></div>`);
    const stage = pv.querySelector('.stage'), cap = pv.querySelector('.cap'), strip = pv.querySelector('.strip');
    wrap.append(tp, pv);
    const sb = h('div', 'ae-sb', '<div style="flex:1"></div><div>640 × 480</div>');
    const win = A.wm.open({ id: 'pics', title: MYPIC(), icon: 'pics', w: 820, h: 640, menu: [
      { label: T('ファイル(F)', 'File'), items: () => [{ label: T('閉じる(C)', 'Close'), cb: () => win.close() }] },
      { label: T('表示(V)', 'View'), items: () => [{ label: T('フィルム ストリップ(P)', 'Filmstrip'), chk: true }, { label: T('スライド ショー', 'Slide Show'), cb: () => slideshow(idx) }] },
      { label: T('ヘルプ(H)', 'Help'), items: () => [{ label: T('バージョン情報(A)', 'About HIKARI Aqua'), cb: about }] },
    ] });
    win.body.append(h('div', 'ae-addr', `${T('アドレス(D)', 'Address')} <div class="box">${iconImg('pics', 16)}${T('C:\\マイ ドキュメント\\マイ ピクチャ\\2004', 'C:\\My Documents\\My Pictures\\2004')}</div>`), wrap, sb);
    PHOTOS.forEach((p, i) => {
      const th = h('div', 'th', '');
      th.dataset.i = i;
      th.title = p.file;
      strip.appendChild(th);
      ctx.timeout(() => { if (!win.closed) { th.prepend(thumb(p.id, 96)); th.insertAdjacentText('beforeend', p.file.replace('.JPG', '')); } }, 60 + i * 90);
    });
    strip.addEventListener('click', (e) => { const t = e.target.closest('.th'); if (t) { idx = +t.dataset.i; rot = 0; show(); A.sfx.click(); } });
    pv.querySelector('.nav').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      A.sfx.click();
      const a = b.dataset.a;
      if (a === 'prev') { idx = (idx + PHOTOS.length - 1) % PHOTOS.length; rot = 0; }
      if (a === 'next') { idx = (idx + 1) % PHOTOS.length; rot = 0; }
      if (a === 'rl') rot -= 90;
      if (a === 'rr') rot += 90;
      if (a === 'show') { slideshow(idx); return; }
      show();
    });
    function show() {
      const p = PHOTOS[idx];
      const c = photo(p.id);
      stage.innerHTML = '';
      const view = document.createElement('canvas');
      view.width = c.width; view.height = c.height;
      view.getContext('2d').drawImage(c, 0, 0);
      view.style.transform = `rotate(${rot}deg)`;
      if (Math.abs(rot) % 180 === 90) view.style.maxWidth = view.style.maxHeight = '75%';
      stage.appendChild(view);
      strip.querySelectorAll('.th').forEach((t, i) => t.classList.toggle('on', i === idx));
      cap.innerHTML = `${L(p.cap, p.capEn)}<small>${esc(p.file)} · ${L(p.exif, p.exifEn)}</small>`;
      sb.firstChild.textContent = `${p.file} — HIKARI DC-200 · ${T('2.0 メガピクセル', '2.0 megapixels')}`;
      win.setTitle(`${p.file} - ${MYPIC()}`);
      const shot = `2004/${esc(p.date.slice(4).trim().replace(/\s+/g, '/'))}`;
      tp.innerHTML = `<div class="pn"><div class="ph">${T('画像のタスク', 'Picture Tasks')}</div><div class="pb"><a data-x="show">${iconImg('pics', 16)}<span>${T('スライド ショーとして表示', 'View as a slide show')}</span></a><a class="dis">${iconImg('pics', 16)}<span>${T('写真を印刷する', 'Print pictures')}</span></a><a data-x="rot">${iconImg('pics', 16)}<span>${T('右回転', 'Rotate clockwise')}</span></a></div></div>
        <div class="pn"><div class="ph">${T('詳細', 'Details')}</div><div class="pb"><b>${esc(p.file)}</b><br>${T('JPEG イメージ', 'JPEG Image')}<br>${T('撮影日', 'Date Picture Taken')}: ${shot}<br>${T('カメラ', 'Camera')}: HIKARI DC-200<br>${T('サイズ', 'Dimensions')}: 640 × 480</div></div>`;
    }
    tp.addEventListener('click', (e) => { const a = e.target.closest('a'); if (!a) return; if (a.dataset.x === 'show') slideshow(idx); if (a.dataset.x === 'rot') { rot += 90; show(); } });
    ctx.timeout(show, 30);
    note('pics');
    return win;
  }
  function slideshow(start) {
    const el = h('div', 'ae-show', '<canvas></canvas><div class="q"></div>');
    A.root.appendChild(el);
    const cv = el.querySelector('canvas'), q = el.querySelector('.q');
    cv.width = 640; cv.height = 480;
    let i = start, alive = true;
    const draw = () => {
      if (!alive) return;
      const p = PHOTOS[i % PHOTOS.length];
      cv.style.opacity = 0;
      ctx.timeout(() => {
        if (!alive) return;
        cv.getContext('2d').drawImage(photo(p.id), 0, 0);
        q.innerHTML = L(p.cap, p.capEn);
        cv.style.opacity = 1;
      }, 500);
      i++;
      ctx.timeout(draw, 4200);
    };
    draw();
    el.addEventListener('pointerdown', () => { alive = false; el.remove(); });
  }

  // ── ごみ箱 ──
  const binItems = () => (A.binFull() ? BIN : []);
  function recycle() {
    const items = binItems().map((b) => ({ ...b, name: A.en && b.enName ? b.enName : b.name, from: A.en && b.enFrom ? b.enFrom : b.from, kind: kindOf(b.name), open: () => binItem(b) }));
    const win = folder({
      id: 'bin', title: T('ごみ箱', 'Recycle Bin'), icon: A.binFull() ? 'binfull' : 'bin', addr: T('ごみ箱', 'Recycle Bin'), items, view: 'details',
      cols: [[T('名前', 'Name'), 'name'], [T('元の場所', 'Original Location'), 'from'], [T('削除日時', 'Date Deleted'), 'date'], [T('サイズ', 'Size'), 'size']],
      tasks: [
        { label: T('ごみ箱を空にする', 'Empty the Recycle Bin'), icon: 'bin', cb: () => emptyBin(), dis: !A.binFull() },
        { label: T('すべての項目を元に戻す', 'Restore all items'), icon: 'restart', cb: restoreAll, dis: !A.binFull() },
      ],
      details: L('ごみ箱<br>ここにあるものは、もう[要|い|to need]らないもの。', 'Recycle Bin<br>Things you don\'t need anymore.'),
    });
    note('bin');
    return win;
  }
  function kindOf(n) { const e = n.split('.').pop().toUpperCase(); return T(`${e} ファイル`, `${e} File`); }
  async function binItem(b) {
    const nm = A.en && b.enName ? b.enName : b.name;
    if (b.spoiler) {
      const r = await A.wm.msgbox({ title: 'spoilers.txt', icon: 'warn', html: L('このファイルには[重大|じゅうだい|serious; major]なネタバレが[含|ふく|to contain]まれています。<br>[開|ひら|to open]きますか?', 'This file contains major spoilers.<br>Do you want to open it?'), buttons: [T('開かない', "Don't open"), T('開かない', "Don't open")] });
      if (r >= 0) A.wm.msgbox({ title: 'spoilers.txt', icon: 'info', html: L('[賢明|けんめい|wise]な[判断|はんだん|judgement]です。<small>[自分|じぶん|oneself]で[読|よ|to read]んで[知|し|to learn]るのがいちばんです。</small>', 'A wise decision.<small>Finding out by reading it yourself is always best.</small>'), sound: false });
      return;
    }
    A.wm.msgbox({ title: nm, icon: b.icon, html: `${L(b.note, b.en)}<small>${L('(ごみ[箱|ばこ|bin]の[中|なか|inside]のファイルは[開|ひら|to open]けません)', '(Files in the Recycle Bin can\'t be opened.)')}</small>` });
  }
  async function emptyBin() {
    if (!A.binFull()) return;
    const r = await A.wm.msgbox({ title: T('複数ファイルの削除の確認', 'Confirm Multiple File Delete'), icon: 'question', html: L(`これら ${BIN.length} [個|こ|(counter)]の[項目|こうもく|item]を[完全|かんぜん|completely]に[削除|さくじょ|delete]しますか?`, `Are you sure you want to delete these ${BIN.length} items?`), buttons: [T('はい(Y)', 'Yes'), T('いいえ(N)', 'No')] });
    if (r !== 0) return;
    A.sfx.crumple();
    ctx.store.set('binEmpty', true);
    A.desktop.setIconImage('bin', 'bin');
    const w = A.wm.find('f-bin');
    if (w) { w.refresh([]); w.close(true); }
  }
  async function restoreAll() {
    const r = await A.wm.msgbox({ title: T('ごみ箱', 'Recycle Bin'), icon: 'warn', html: L('これらの[項目|こうもく|item]を[元|もと|original (place)]に[戻|もど|to return]すと、すべてが[少|すこ|a little]しずつ generic になります。<br>[本当|ほんとう|really]によろしいですか?', 'If you restore these items, everything will become a little more generic.<br>Are you sure?'), buttons: [T('いいえ', 'No'), T('いいえ', 'No')] });
    if (r >= 0) A.sfx.click();
  }

  // ── the CRT folder, documents, my computer ──
  function crtFolder() {
    const TXT = T('テキスト ドキュメント', 'Text Document');
    const items = [
      { name: 'README.txt', icon: 'txt', size: '3 KB', kind: TXT, date: '2004/10/02', open: () => notepad({ id: 'readme', name: 'README.txt', text: README, ascii: true, editable: false }) },
      { name: 'tuning_log.csv', icon: 'csv', size: '1 KB', kind: T('CSV ファイル', 'CSV File'), date: '2004/10/02', open: () => notepad({ id: 'tuning', name: 'tuning_log.csv', text: TUNING, editable: false }) },
      { name: 'reel_ideas.txt', icon: 'txt', size: '1 KB', kind: TXT, date: '2004/10/03', open: () => notepad({ id: 'reel', name: 'reel_ideas.txt', text: REEL, editable: false }) },
      { name: 'osu_on_crt.jpg', icon: 'jpg', size: '412 KB', kind: T('JPEG イメージ', 'JPEG Image'), date: '2004/10/02', open: () => open('pics', 'crt') },
      { name: 'flicker_lab.exe', icon: 'camera', size: '64 KB', kind: T('アプリケーション', 'Application'), date: '2004/10/04', open: () => open('flicker') },
    ];
    const w = folder({ id: 'crt', title: 'CRT_project', icon: 'crtfolder', addr: T('C:\\マイ ドキュメント\\CRT_project', 'C:\\My Documents\\CRT_project'), items,
      tasks: [{ label: L('このフォルダを Web に[公開|こうかい|publish]する', 'Publish this folder to the Web'), icon: 'globe', dis: true }, { label: L('README を[開|ひら|to open]く', 'Open the README'), icon: 'txt', cb: () => items[0].open() }],
      details: L('<b>CRT_project</b><br>ファイル フォルダ<br>[更新|こうしん|update]日時: 2004/10/04', '<b>CRT_project</b><br>File Folder<br>Date Modified: 2004/10/04') });
    note('crt');
    return w;
  }
  function docs() {
    return folder({ id: 'docs', title: T('マイ ドキュメント', 'My Documents'), icon: 'docs', addr: T('C:\\マイ ドキュメント', 'C:\\My Documents'), items: [
      { name: 'CRT_project', icon: 'crtfolder', open: () => open('crt') },
      { name: MYPIC(), icon: 'pics', open: () => open('pics') },
      { name: T('マイ ミュージック', 'My Music'), icon: 'music', open: () => open('music') },
      { name: 'todo.txt', icon: 'txt', open: () => open('todo') },
      { name: T('日本語ノート.txt', 'japanese_notes.txt'), icon: 'txt', open: () => (A.en
        ? notepad({ id: 'nihongo-en', name: 'japanese_notes.txt', text: NIHONGO_EN, store: 'nihongo_en' })
        : notepad({ id: 'nihongo', name: '日本語ノート.txt', text: NIHONGO, glossed: true, store: 'nihongo' })) },
    ], tasks: [{ label: L('[新|あたら|new]しいフォルダを[作成|さくせい|create]する', 'Make a new folder'), icon: 'docs', cb: () => newItem('folder') }] });
  }
  function mycomp() {
    return folder({ id: 'mycomp', title: T('マイ コンピュータ', 'My Computer'), icon: 'computer', addr: T('マイ コンピュータ', 'My Computer'), items: [
      { name: T('ローカル ディスク (C:)', 'Local Disk (C:)'), icon: 'hdd', open: () => open('docs') },
      { name: T('CD ドライブ (D:) BEETLEJU', 'CD Drive (D:) BEETLEJU'), icon: 'cddrive', open: () => open('beetle') },
      { name: T('CRT テレビ (RF 3ch)', 'CRT Television (RF ch 3)'), icon: 'crtdevice', open: () => open('crt') },
      { name: T('コントロール パネル', 'Control Panel'), icon: 'display', open: () => open('display') },
    ], other: [['docs', T('マイ ドキュメント', 'My Documents'), 'docs'], ['pics', MYPIC(), 'pics']],
    details: L('<b>マイ コンピュータ</b><br>HIKARI Aqua 2004<br>Hikari CT-1486 [互換|ごかん|compatible]', '<b>My Computer</b><br>HIKARI Aqua 2004<br>Hikari CT-1486 compatible') });
  }

  // ── 画面のプロパティ ──
  function display(tab = 0) {
    const WALLS = [[T('水色ヶ丘 (ライブ)', 'Mizuirogaoka (live)'), 0], [T('水色ヶ丘 (夕暮れ)', 'Mizuirogaoka (dusk)'), 1], [T('(なし)', '(None)'), -1]];
    let wall = A.settings.wall, saver = A.settings.saver, wait = A.settings.wait;
    const body = h('div', '', '');
    body.style.cssText = 'flex:1;display:flex;flex-direction:column;padding:10px;min-height:0';
    body.innerHTML = `<div class="ae-tabs"><span data-t="0">${T('デスクトップ', 'Desktop')}</span><span data-t="1">${T('スクリーン セーバー', 'Screen Saver')}</span></div><div class="ae-tabp"></div>
      <div class="ae-foot"><button class="ae-btn def" data-b="ok">OK</button><button class="ae-btn" data-b="cancel">${T('キャンセル', 'Cancel')}</button><button class="ae-btn" data-b="apply">${T('適用(A)', 'Apply')}</button></div>`;
    const pane = body.querySelector('.ae-tabp');
    let raf = 0;
    const win = A.wm.open({ id: 'display', title: T('画面のプロパティ', 'Display Properties'), icon: 'display', w: 430, h: 520, max: false, resizable: false, small: true, center: true, onClosed: () => cancelAnimationFrame(raf) });
    win.body.appendChild(body);
    function monitor() {
      return h('div', 'ae-mon', '<div class="case"></div><canvas width="324" height="224"></canvas><div class="stand"></div>');
    }
    function paintWall(cv, which) {
      const g = cv.getContext('2d');
      const W = cv.width, H = cv.height;
      if (which < 0) { g.fillStyle = '#3a6ea5'; g.fillRect(0, 0, W, H); return; }
      const dusk = which === 1;
      const sky = g.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, dusk ? '#22224e' : '#0b45b8'); sky.addColorStop(0.62, dusk ? '#d4787e' : '#5aa8f2'); sky.addColorStop(1, dusk ? '#ffb070' : '#c9ecff');
      g.fillStyle = sky; g.fillRect(0, 0, W, H);
      g.fillStyle = dusk ? 'rgba(255,200,170,.85)' : 'rgba(255,255,255,.92)';
      [[0.2, 0.25, 0.09], [0.27, 0.21, 0.07], [0.62, 0.3, 0.1], [0.7, 0.26, 0.06]].forEach(([x, y, r]) => { g.beginPath(); g.ellipse(W * x, H * y, W * r, H * r * 0.7, 0, 0, 7); g.fill(); });
      g.beginPath(); g.moveTo(0, H * 0.66); g.quadraticCurveTo(W * 0.38, H * 0.46, W, H * 0.7); g.lineTo(W, H); g.lineTo(0, H); g.closePath();
      const gr = g.createLinearGradient(0, H * 0.5, 0, H);
      gr.addColorStop(0, dusk ? '#7a7a3a' : '#8be04a'); gr.addColorStop(1, dusk ? '#253512' : '#1f7a14');
      g.fillStyle = gr; g.fill();
    }
    function tabDesk() {
      cancelAnimationFrame(raf);
      pane.innerHTML = '';
      const m = monitor();
      const cv = m.querySelector('canvas');
      paintWall(cv, wall);
      const list = h('div', 'ae-list');
      WALLS.forEach(([n, v]) => { const d = h('div', v === wall ? 'on' : ''); d.textContent = n; d.onclick = () => { wall = v; A.sfx.menu(); tabDesk(); }; list.appendChild(d); });
      pane.append(m, h('div', 'ae-row', `<b style="font-weight:normal">${T('背景(K):', 'Background:')}</b>`), list);
    }
    function tabSaver() {
      cancelAnimationFrame(raf);
      pane.innerHTML = '';
      const m = monitor();
      const cv = m.querySelector('canvas');
      const row = h('div', 'ae-row', `<span>${T('スクリーン セーバー(S)', 'Screen saver')}</span><select class="ae-in"><option value="bubbles">${T('シャボン玉', 'Bubbles')}</option><option value="none">${T('(なし)', '(None)')}</option></select><button class="ae-btn" data-p="1" style="min-width:76px">${T('プレビュー', 'Preview')}</button>`);
      const row2 = h('div', 'ae-row', `<span>${T('待ち時間(W):', 'Wait:')}</span><input class="ae-in" type="number" min="1" max="15" style="width:56px"> <span>${T('分', 'minutes')}</span>`);
      pane.append(m, row, row2);
      const selEl = row.querySelector('select');
      selEl.value = saver;
      selEl.onchange = () => { saver = selEl.value; };
      const inp = row2.querySelector('input');
      inp.value = wait;
      inp.onchange = () => { wait = clamp(+inp.value || 1, 1, 15); inp.value = wait; };
      row.querySelector('[data-p]').onclick = () => { A.sfx.click(); A.saver.start(true); };
      const g = cv.getContext('2d');
      const bs = Array.from({ length: 6 }, () => ({ x: Math.random() * 300 + 12, y: Math.random() * 200 + 12, r: 14 + Math.random() * 18, vx: (Math.random() - 0.5) * 60, vy: (Math.random() - 0.5) * 60 }));
      let last = performance.now();
      const loop = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        paintWall(cv, wall);
        if (saver === 'bubbles') {
          g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(0, 0, 324, 224);
          bs.forEach((b) => {
            b.x += b.vx * dt; b.y += b.vy * dt;
            if (b.x < b.r || b.x > 324 - b.r) b.vx *= -1;
            if (b.y < b.r || b.y > 224 - b.r) b.vy *= -1;
            const gr = g.createRadialGradient(b.x, b.y, b.r * 0.5, b.x, b.y, b.r);
            gr.addColorStop(0, 'rgba(200,235,255,.05)'); gr.addColorStop(0.85, 'rgba(255,170,230,.35)'); gr.addColorStop(1, 'rgba(255,255,255,.8)');
            g.fillStyle = gr; g.beginPath(); g.arc(b.x, b.y, b.r, 0, 7); g.fill();
            g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.ellipse(b.x - b.r * 0.4, b.y - b.r * 0.4, b.r * 0.22, b.r * 0.12, -0.7, 0, 7); g.fill();
          });
        }
        if (!win.closed && pane.contains(cv)) raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }
    const tabs = body.querySelectorAll('.ae-tabs span');
    const setTab = (i) => { tabs.forEach((t, k) => t.classList.toggle('on', k === i)); i ? tabSaver() : tabDesk(); };
    body.querySelector('.ae-tabs').onclick = (e) => { const t = e.target.closest('span'); if (t) { A.sfx.menu(); setTab(+t.dataset.t); } };
    const apply = () => { A.applySettings({ wall, saver, wait }); };
    body.querySelector('.ae-foot').onclick = (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      A.sfx.click();
      if (b.dataset.b !== 'cancel') apply();
      if (b.dataset.b !== 'apply') win.close();
    };
    setTab(tab);
    return win;
  }

  // ── ファイル名を指定して実行 ──
  function run() {
    const win = A.wm.open({ id: 'run', title: T('ファイル名を指定して実行', 'Run'), icon: 'run', w: 400, h: 'auto', max: false, min: false, resizable: false, small: true, center: true, cls: 'ae-run' });
    win.body.innerHTML = `<div class="mrow" style="display:flex;gap:12px">${iconImg('run', 32)}<div style="font-size:13px;line-height:1.6">${L('[実行|じっこう|run]するプログラム[名|めい|name]、または[開|ひら|to open]くフォルダやドキュメント[名|めい|name]、インターネット リソース[名|めい|name]を[入力|にゅうりょく|input]してください。', 'Type the name of a program, folder, document, or Internet resource, and HIKARI Aqua will open it for you.')}</div></div>
      <div class="ae-row" style="margin-top:12px;max-width:none"><span>${T('名前(O):', 'Open:')}</span><input class="ae-in" style="flex:1" list="ae-runl"></div>
      <datalist id="ae-runl"><option value="notepad"><option value="beetleju"><option value="iexplore"><option value="msmsgs"><option value="wmplayer"></datalist>
      <div class="ae-foot"><button class="ae-btn def" data-b="ok">OK</button><button class="ae-btn" data-b="x">${T('キャンセル', 'Cancel')}</button><button class="ae-btn" disabled>${T('参照(B)...', 'Browse...')}</button></div>`;
    const inp = win.body.querySelector('input');
    const go = () => {
      const v = inp.value.trim();
      const k = v.toLowerCase().replace(/\.exe$/, '');
      win.close();
      if (!v) return;
      const map = { notepad: 'notepad', todo: 'todo', 'todo.txt': 'todo', iexplore: 'ie', explorer: 'mycomp', ie: 'ie', msmsgs: 'msn', msn: 'msn', messenger: 'msn', beetleju: 'beetle', beetle: 'beetle', 'beetle ju': 'beetle', wmplayer: 'music', music: 'music', control: 'display', 'desk.cpl': 'display', flicker_lab: 'flicker', calc: null };
      if (k in map && map[k]) return open(map[k]);
      if (k === 'shutdown') return A.power.shutdownDialog();
      if (k === 'osu' || k === 'osu!') return A.wm.msgbox({ title: v, icon: 'error', html: L(`'${esc(v)}' が[見|み|to see]つかりません。<small>このソフトウェアは 2007 [年|ねん|year]に[公開|こうかい|release]される[予定|よてい|plan; scheduled]です。もうすこし[待|ま|to wait]ってください。</small>`, `Cannot find '${esc(v)}'.<small>This software is scheduled for release in 2007. Please wait a little longer.</small>`) });
      if (k === 'clannad') return A.wm.msgbox({ title: 'CLANNAD', icon: 'info', html: L('CLANNAD は 2004 [年|ねん|year] 4 [月|がつ|month]に[発売|はつばい|release]されました。<small>いま、[読|よ|to read]んでいるところですね。ネタバレは[表示|ひょうじ|display]しません。</small>', 'CLANNAD was released in April 2004.<small>You\'re in the middle of reading it. No spoilers will be displayed.</small>') });
      if (k === 'cmd' || k === 'command') return A.wm.msgbox({ title: 'C:\\WINDOWS\\system32\\cmd.exe', icon: 'info', html: '<span style="font-family:IBM Plex Mono,monospace">C:\\&gt; echo hello<br>hello<br>C:\\&gt; _</span>' });
      A.wm.msgbox({ title: v, icon: 'error', html: L(`'${esc(v)}' が[見|み|to see]つかりません。[名前|なまえ|name]を[正|ただ|correctly]しく[入力|にゅうりょく|input]したかどうかを[確認|かくにん|confirm]してから、やり[直|なお|to redo]してください。`, `Cannot find '${esc(v)}'. Make sure you typed the name correctly, and then try again.`) });
    };
    win.body.querySelector('.ae-foot').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; A.sfx.click(); if (b.dataset.b === 'ok') go(); if (b.dataset.b === 'x') win.close(); };
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
    if (ctx.w >= 640) setTimeout(() => inp.focus(), 50);
    return win;
  }

  function search() {
    const win = A.wm.open({ id: 'search', title: T('検索結果', 'Search Results'), icon: 'search', w: 420, h: 'auto', max: false, resizable: false, small: true, center: true, cls: 'ae-run' });
    win.body.innerHTML = `<div style="font-size:13px;margin-bottom:8px">${L('[何|なに|what]を[検索|けんさく|search]しますか?', 'What do you want to search for?')}</div>
      <div class="ae-row" style="max-width:none"><input class="ae-in" style="flex:1" value="${T('黒の NB 1906', 'black NB 1906')}"><button class="ae-btn def">${T('検索(R)', 'Search')}</button></div><div class="res" style="margin-top:10px;font-size:13px;line-height:1.7;min-height:44px"></div>`;
    const inp = win.body.querySelector('input'), res = win.body.querySelector('.res');
    const go = () => {
      A.sfx.click();
      const q = inp.value.trim().toLowerCase();
      res.innerHTML = `<i>${T('検索しています...', 'Searching...')}</i>`;
      ctx.timeout(() => {
        let r;
        if (/1906|nb|new balance|ニューバランス/.test(q)) r = L('0 [件|けん|(counter for results)]の[項目|こうもく|item]が[見|み|to see]つかりました。<br><small style="color:#666">このコンピュータにはありません。でも、[世界|せかい|world]のどこかの[棚|たな|shelf]にはあります。</small>', '0 items found.<br><small style="color:#666">Not on this computer. But it\'s on a shelf somewhere in the world.</small>');
        else if (/clannad|クラナド|after story|渚|美佐枝|misae/.test(q)) r = L('ネタバレを[含|ふく|to contain]む[可能性|かのうせい|possibility]があるため、[検索|けんさく|search]を[中止|ちゅうし|cancel]しました。', 'Search cancelled: the results might contain spoilers.');
        else if (/beetle|ビートル/.test(q)) r = T('BeetleJu.exe — デスクトップ<br>CD ドライブ (D:) — BEETLEJU', 'BeetleJu.exe — Desktop<br>CD Drive (D:) — BEETLEJU');
        else if (/crt|rf|ブラウン/.test(q)) r = T('CRT_project — C:\\マイ ドキュメント', 'CRT_project — C:\\My Documents');
        else if (/lp|レコード|vinyl|record/.test(q)) r = L('DSC00233.JPG — マイ ピクチャ<br><small style="color:#666">あと 29 [枚|まい|(counter for flat things)]、でしょうか。</small>', 'DSC00233.JPG — My Pictures<br><small style="color:#666">29 to go, perhaps.</small>');
        else r = T(`「${esc(inp.value)}」: 0 件。`, `“${esc(inp.value)}”: 0 items found.`);
        res.innerHTML = r;
        A.sfx.ding();
      }, 700);
    };
    win.body.querySelector('button').onclick = go;
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    return win;
  }

  function help() {
    return A.wm.msgbox({ title: T('ヘルプとサポート センター', 'Help and Support Center'), icon: 'help', w: 440, html: L(`<b>[困|こま|to be in trouble]ったときは</b><br>1. すこし[休|やす|to rest]む。<br>2. [水|みず|water]を[飲|の|to drink]む。<br>3. もう[一度|いちど|once more]やってみる。<small>それでもだめなら、[再起動|さいきどう|restart]してください。あなたも。</small>`, `<b>When something goes wrong</b><br>1. Rest for a bit.<br>2. Drink some water.<br>3. Try once more.<small>If that still doesn't work, restart. You too.</small>`) });
  }
  function about() {
    return A.wm.msgbox({ title: T('バージョン情報', 'About HIKARI Aqua'), icon: 'drop', w: 440, html: L(`<b>HIKARI Aqua 2004</b><br>Version 5.1 (Build 2600.mizuiro)<br>Copyright © 2004 ひかり線<small>この[製品|せいひん|product]は devansh に[使用|しよう|use]を[許諾|きょだく|licence]されています。<br>[有効期限|ゆうこうきげん|expiry date]: なし</small>`, `<b>HIKARI Aqua 2004</b><br>Version 5.1 (Build 2600.mizuiro)<br>Copyright © 2004 Hikari Line<small>This product is licensed to: devansh<br>Expires: never</small>`), sound: false });
  }

  const PROPS = {
    music: [['ファイル フォルダ', 'File Folder'], ['1 曲 (と、たくさんの名前)', '1 song (and a great many names)'], '2004/04/01', ['あなたの耳は、ここにあるものより[広|ひろ|wide]い。', 'Your ears are wider than what fits in here.']],
    pics: [['ファイル フォルダ', 'File Folder'], ['7 [枚|まい|(counter)]', '7 pictures'], '2004/05/05', ['HIKARI DC-200 で[撮|と|to take (a photo)]りました。', 'Taken with a HIKARI DC-200.']],
    todo: [['テキスト ドキュメント', 'Text Document'], ['1 KB', '1 KB'], '2004/01/01', ['[毎年|まいとし|every year]、すこしずつ[書|か|to write]き[換|か|to rewrite]えています。', 'Rewritten a little every year.']],
    crt: [['ファイル フォルダ', 'File Folder'], ['5 個のファイル', '5 files'], '2004/10/01', ['[一番|いちばん|most][時間|じかん|time]をかけたフォルダ。', 'The folder that took the most time.']],
    beetle: [['アプリケーション', 'Application'], ['1.4 MB (CD-ROM)', '1.4 MB (CD-ROM)'], '1998/??/??', ['[元|もと|original]のディスクは[見|み|to see]つかっていません。', 'The original disc has not been found.']],
    ie: [['アプリケーション', 'Application'], ['6.0', '6.0'], '2001/08/27', ['ホームページ: devansh の部屋', "Home page: devansh's room"]],
    msn: [['アプリケーション', 'Application'], ['6.2', '6.2'], '2004/03/30', ['[相手|あいて|the other party]: HIKARI (ブラウン[管|かん|tube])', 'Contact: HIKARI (a cathode-ray tube)']],
    bin: [['ごみ箱', 'Recycle Bin'], null, '', ['[捨|す|to throw away]てたもので、[自分|じぶん|oneself]がわかることもある。', 'Sometimes what you threw away tells you who you are.']],
  };
  function props(ic) {
    const p = PROPS[ic.id] || [['ファイル', 'File'], null, osDate().str, ['', '']];
    const nm = T(ic.label, ic.en || ic.label);
    A.wm.msgbox({ title: T(`${nm}のプロパティ`, `${nm} Properties`), icon: ic.icon, sound: false, html: `<b>${esc(nm)}</b><div class="ae-kv"><b>${T('種類:', 'Type:')}</b><span>${L(...p[0])}</span><b>${T('場所:', 'Location:')}</b><span>${T('デスクトップ', 'Desktop')}</span>${p[1] ? `<b>${T('サイズ:', 'Size:')}</b><span>${L(...p[1])}</span>` : ''}${p[2] ? `<b>${T('作成日時:', 'Created:')}</b><span>${p[2]}</span>` : ''}<b>${T('コメント:', 'Comment:')}</b><span>${L(...p[3])}</span></div>` });
  }

  let newCount = 0;
  function newItem(kind) {
    newCount++;
    const n = newCount > 1 ? ` (${newCount})` : '';
    if (kind === 'folder') {
      const label = `新しいフォルダ${n}`, en = `New Folder${n}`;
      A.desktop.addIcon({ id: 'new' + newCount, label, en, icon: 'docs', kind: 'folder', open: () => folder({ id: 'new' + label, title: T(label, en), icon: 'docs', items: [] }) });
    } else {
      const label = `新規 テキスト ドキュメント${n}.txt`, en = `New Text Document${n}.txt`;
      A.desktop.addIcon({ id: 'new' + newCount, label, en, icon: 'txt', kind: 'txt', open: () => notepad({ id: 'new' + label, name: T(label, en), text: '' }) });
    }
    A.desktop.layout();
    A.desktop.icons.forEach((ic) => ic.el.classList.remove('pre'));
  }

  // ── the dispatcher ──
  function open(id, arg) {
    const w = openRaw(id, arg);
    if (w && w.el && !w.reopenFn) w.reopenFn = () => openRaw(id, arg);
    return w;
  }
  function openRaw(id, arg) {
    switch (id) {
      case 'music': note('music'); return openPlayer(A);
      case 'pics': return pictures(arg);
      case 'todo': note('todo'); return A.en
        ? notepad({ id: 'todo-en', name: 'todo.txt', text: todoTextEn(), store: 'todo_en' })
        : notepad({ id: 'todo', name: 'todo.txt', text: todoText(), glossed: true, store: 'todo' });
      case 'notepad': return notepad({ id: 'blank' + Date.now(), name: T('無題', 'Untitled'), text: '' });
      case 'crt': return crtFolder();
      case 'beetle': note('beetle'); return openBeetle(A);
      case 'ie': note('ie'); return openBrowser(A, arg);
      case 'msn': note('msn'); return openMessenger(A);
      case 'chat': return openChat(A, true);
      case 'bin': return recycle();
      case 'docs': return docs();
      case 'mycomp': return mycomp();
      case 'display': return display();
      case 'saverprops': return display(1);
      case 'run': return run();
      case 'help': return help();
      case 'search': return search();
      case 'flicker': note('flicker'); return openFlicker(A);
      default: return null;
    }
  }

  return { open, opened, emptyBin, props, newItem, notepad, folder };
}
