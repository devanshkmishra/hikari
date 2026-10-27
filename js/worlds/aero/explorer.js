// Hikari Explorer 6 — and a lovingly made 2003 personal homepage.
// (Every startup deserved a hit counter, a guestbook and an under-construction sign.)
import { h, esc, osDate, mkCanvas } from './util.js';
import { iconURL, iconImg } from './icons.js';

export const BROWSER_CSS = `
.ae-ie .bd{background:#ece9d8}
.ie-tool{display:flex;align-items:center;gap:2px;padding:3px 4px;border-bottom:1px solid #d6d2c2;flex:none;overflow:hidden}
.ie-tool button{height:36px;display:flex;align-items:center;gap:5px;padding:0 7px;border:1px solid transparent;border-radius:3px;background:none;font-size:13px;color:#000;white-space:nowrap}
.ie-tool button:hover{border-color:#cecbbd;background:linear-gradient(#fff,#efeee6)}
.ie-tool button[disabled]{opacity:.45}
.ie-tool .rb{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;color:#fff;font:bold 15px Tahoma,sans-serif;box-shadow:inset 0 -2px 3px rgba(0,0,0,.25),0 1px 2px rgba(0,0,0,.3)}
.ie-tool .g{background:radial-gradient(circle at 35% 25%,#d4ffb8,#46b83a 55%,#2a8a1f)}
.ie-tool .x{background:radial-gradient(circle at 35% 25%,#ffd0c0,#e2532c 55%,#b8300f);width:22px;height:22px;font-size:12px}
.ie-tool .sep{width:1px;height:28px;background:#cfcbbd;margin:0 3px}
.ie-tool .throb{margin-left:auto;width:38px;height:30px;display:grid;place-items:center;border-left:1px solid #cfcbbd}
.ie-tool .throb img{width:24px;height:24px}
.ie-tool .throb.on img{animation:ie-spin .9s linear infinite}
@keyframes ie-spin{to{transform:rotate(360deg)}}
.ie-addr{display:flex;align-items:center;gap:6px;padding:3px 6px;border-bottom:1px solid #d6d2c2;font-size:13px;flex:none}
.ie-addr form{flex:1;display:flex;gap:4px;min-width:0}
.ie-addr input{flex:1;min-width:0}
.ie-addr .go{display:flex;align-items:center;gap:4px;height:25px;padding:0 8px;border:0;background:none;font-size:13px}
.ie-page{flex:1;min-height:0;overflow:auto;background:#fff;position:relative;touch-action:pan-y;-webkit-user-select:text;user-select:text}
.ie-sb{flex:none;display:flex;gap:2px;padding:2px 3px;background:#ece9d8;border-top:1px solid #d6d2c2;font-size:13px}
.ie-sb > div{padding:1px 6px;border:1px solid;border-color:#c9c3ae #fff #fff #c9c3ae;white-space:nowrap;overflow:hidden}
.ie-sb .pb{width:120px;height:16px;padding:1px;margin-top:1px}
.ie-sb .pb i{display:block;height:100%;background:repeating-linear-gradient(90deg,#2fbf3a 0 7px,transparent 7px 9px);width:0}
/* the homepage */
.hp{min-height:100%;padding:14px 10px 30px;font:14px/1.6 "MS PGothic","Zen Kaku Gothic New",Verdana,sans-serif;color:#102040;
  background-color:#eaf6ff;background-image:radial-gradient(circle at 10px 10px,#ffffff 2px,transparent 3px),radial-gradient(circle at 30px 30px,#cfe8ff 2px,transparent 3px);background-size:40px 40px}
.hp .wrap{max-width:760px;margin:0 auto;background:#fff;border:3px double #3a7ad8;box-shadow:4px 4px 0 #9ccaf7}
.hp .top{text-align:center;padding:12px 8px 6px;background:linear-gradient(#ffffff,#dff1ff);border-bottom:2px groove #9ac}
.hp .top canvas{max-width:100%;height:auto}
.hp .new{display:inline-block;color:#fff;background:#e8212a;font:bold 13px Arial,sans-serif;padding:0 5px;margin-left:4px;animation:hp-blink 1s steps(1) infinite;vertical-align:middle}
@keyframes hp-blink{50%{visibility:hidden}}
.hp .mq{overflow:hidden;white-space:nowrap;background:#002a7a;color:#ffef5a;font-weight:bold;padding:3px 0;font-size:14px}
.hp .mq span{display:inline-block;padding-left:100%;animation:pl-mq 18s linear infinite}
.hp .cols{display:flex;gap:0}
.hp .nav{width:150px;flex:none;padding:10px 8px;background:linear-gradient(90deg,#d8ecff,#f4faff);border-right:2px groove #bcd}
.hp .nav a{display:block;margin-bottom:7px;padding:5px 8px;text-align:center;color:#003;font-weight:bold;font-size:13px;cursor:pointer;
  background:linear-gradient(#fff,#cfe4ff);border:2px outset #9cc0ee}
.hp .nav a:active{border-style:inset}
.hp .main{flex:1;padding:10px 16px;min-width:0}
.hp h2{font-size:17px;margin:14px 0 6px;color:#0a4ab8;border-bottom:2px dotted #8ab4f0}
.hp h2::before{content:"◆ ";color:#ff7a00}
.hp ul{margin:4px 0 4px 18px;padding:0}
.hp .uc{display:flex;align-items:center;gap:10px;margin:14px 0;padding:8px;border:3px solid #111;background:repeating-linear-gradient(45deg,#ffd400 0 14px,#111 14px 28px)}
.hp .uc div{background:#ffd400;padding:4px 12px;font-weight:bold;color:#111;border:2px solid #111;flex:1;text-align:center}
.hp .cone{width:26px;height:30px;flex:none;background:linear-gradient(180deg,#ff7a1a 0 30%,#fff 30% 45%,#ff7a1a 45% 70%,#fff 70% 82%,#ff7a1a 82%);clip-path:polygon(50% 0,64% 0,92% 88%,100% 88%,100% 100%,0 100%,0 88%,8% 88%,36% 0);animation:hp-cone 1.2s steps(1) infinite}
.hp .cone:last-child{animation-delay:.6s}
@keyframes hp-cone{50%{filter:brightness(1.35)}}
.hp .ctr{text-align:center;margin:14px 0;font-size:13px;line-height:2}
.hp .ctr b{display:inline-flex;gap:2px;padding:3px;background:#111;border:2px inset #777;vertical-align:middle;margin:0 4px}
.hp .ctr b i{font:normal 19px "VT323",monospace;color:#38ff4a;background:#0a1a0a;padding:0 4px;text-shadow:0 0 4px #38ff4a;font-style:normal}
.hp .gb{border:2px solid #8ab4f0;background:#f7fbff;padding:8px 10px;margin-top:8px}
.hp .gb .e{border-bottom:1px dashed #9cc0ee;padding:6px 0}
.hp .gb .e:last-child{border-bottom:0}
.hp .gb .who{color:#c0306a;font-weight:bold}
.hp .gb .when{color:#888;font-size:13px;margin-left:8px}
.hp .gb form{display:grid;grid-template-columns:auto 1fr;gap:6px 8px;align-items:center;margin-top:10px}
.hp .gb form .ae-btn{grid-column:2;justify-self:start}
.hp .btns{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:14px 0}
.hp .btns canvas{width:88px;height:31px;image-rendering:pixelated}
.hp .ring{text-align:center;font-size:13px;margin-top:10px}
.hp .ring a{color:#00c;text-decoration:underline;cursor:pointer;margin:0 6px}
.hp .foot{text-align:center;font-size:13px;color:#555;padding:10px;border-top:2px groove #9ac}
@media (max-width:560px){.hp .cols{flex-direction:column}.hp .nav{width:auto;display:flex;flex-wrap:wrap;gap:4px;border-right:0}.hp .nav a{flex:1;margin:0}}
.tt-page{padding:20px;font:14px/1.6 "Zen Kaku Gothic New",sans-serif;background:#fffef6;min-height:100%}
.tt-page h1{font:bold 20px "Zen Kaku Gothic New",sans-serif;color:#fff;background:#e6a23c;padding:6px 12px;margin:0 0 12px}
.tt-page table{border-collapse:collapse;width:100%;max-width:560px;font-size:14px}
.tt-page td,.tt-page th{border:1px solid #d9c9a0;padding:5px 9px;text-align:left}
.tt-page th{background:#fbefd2}
.tt-page tr.here td{background:#fff2c8;font-weight:bold}
.err-page{padding:22px;font:13px/1.7 Tahoma,"Zen Kaku Gothic New",sans-serif;color:#000;max-width:620px}
.err-page h1{display:flex;align-items:center;gap:12px;font-size:20px;font-weight:bold;margin:0 0 14px;color:#000}
.err-page hr{border:0;border-top:1px solid #c0c0c0;margin:14px 0}
.err-page ul{padding-left:20px}
`;

const HOME = 'http://members.aquanet.ne.jp/~devansh/';
const TT = 'http://www.hikari-sen.jp/jikoku/heijitsu.html';

function wordArt(A) {
  const c = mkCanvas(720, 120), g = c.getContext('2d');
  g.font = 'italic 900 64px "Arial Black", Impact, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const t = "devansh's room";
  g.save(); g.translate(360, 58); g.transform(1, 0, -0.12, 1, 0, 0);
  for (let i = 8; i > 0; i--) { g.fillStyle = `rgba(0,40,${120 + i * 10},${0.12 + i * 0.02})`; g.fillText(t, i * 1.4, i * 1.4); }
  const gr = g.createLinearGradient(0, -30, 0, 30);
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.35, '#7fe0ff'); gr.addColorStop(0.5, '#1a7ae8'); gr.addColorStop(0.75, '#62d2ff'); gr.addColorStop(1, '#e8fbff');
  g.fillStyle = gr; g.fillText(t, 0, 0);
  g.lineWidth = 2; g.strokeStyle = '#002c7a'; g.strokeText(t, 0, 0);
  g.restore();
  g.font = 'bold 15px Tahoma, sans-serif'; g.fillStyle = '#e8212a'; g.textAlign = 'center';
  g.fillText(A.T('〜 CRT と レコード と 夏 の ホームページ 〜', '~ a homepage of CRTs, records and summer ~'), 360, 108);
  return c;
}
function button88(lines, bg, fg) {
  const c = mkCanvas(88, 31), g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 31);
  bg.forEach((col, i) => gr.addColorStop(i / (bg.length - 1), col));
  g.fillStyle = gr; g.fillRect(0, 0, 88, 31);
  g.strokeStyle = '#000'; g.strokeRect(0.5, 0.5, 87, 30);
  g.strokeStyle = 'rgba(255,255,255,.6)'; g.strokeRect(1.5, 1.5, 85, 28);
  g.fillStyle = fg; g.font = 'bold 9px Verdana, sans-serif'; g.textAlign = 'center';
  lines.forEach((l, i) => g.fillText(l, 44, 13 + i * 11));
  return c;
}

export function openBrowser(A, startPage) {
  const { ctx } = A;
  const T = A.T, L = A.L;
  const hist = [], fwd = [];
  let cur = null;
  const favs = () => [
    { label: T('devansh の部屋 (工事中!)', "devansh's room (under construction!)"), icon: 'globe', cb: () => go(HOME) },
    { label: T('ひかり線 時刻表', 'Hikari Line timetable'), icon: 'train', cb: () => go(TT) },
  ];
  const win = A.wm.open({ id: 'ie', title: 'Hikari Explorer', icon: 'globe', w: 860, h: 640, cls: 'ae-ie', maxOnPhone: true, menu: [
    { label: T('ファイル(F)', 'File'), items: () => [{ label: T('閉じる(C)', 'Close'), cb: () => win.close() }] },
    { label: T('編集(E)', 'Edit'), items: () => [{ label: T('コピー(C)', 'Copy'), dis: true }] },
    { label: T('表示(V)', 'View'), items: () => [{ label: T('最新の情報に更新(R)', 'Refresh'), cb: () => go(cur, true) }] },
    { label: T('お気に入り(A)', 'Favorites'), items: favs },
    { label: T('ツール(T)', 'Tools'), items: () => [{ label: T('インターネット オプション(O)...', 'Internet Options...'), dis: true }] },
    { label: T('ヘルプ(H)', 'Help'), items: () => [{ label: T('バージョン情報(A)', 'About Hikari Explorer'), cb: () => A.wm.msgbox({ title: T('Hikari Explorer について', 'About Hikari Explorer'), icon: 'globe', html: L('Hikari Explorer 6.0<br>[暗号化|あんごうか|encryption]の[強度|きょうど|strength]: 128 ビット<small>[未来|みらい|the future]は、まだ[読|よ|to read]み[込|こ|to load]み[中|ちゅう|in progress]です。</small>', 'Hikari Explorer 6.0<br>Cipher strength: 128-bit<small>The future is still loading.</small>') }) }] },
  ] });
  const tool = h('div', 'ie-tool', '');
  const addr = h('div', 'ie-addr', '');
  const page = h('div', 'ie-page');
  const sb = h('div', 'ie-sb', '');
  function paintChrome() {
    tool.innerHTML = `
    <button data-a="back"><span class="rb g">◀</span>${T('戻る', 'Back')}</button>
    <button data-a="fwd"><span class="rb g">▶</span></button>
    <button data-a="stop" title="${T('中止', 'Stop')}"><span class="rb x">✕</span></button>
    <button data-a="reload" title="${T('最新の情報に更新', 'Refresh')}">↻</button>
    <button data-a="home" title="${T('ホーム', 'Home')}">⌂</button>
    <span class="sep"></span>
    <button data-a="fav">☆ ${T('お気に入り', 'Favorites')}</button>
    <div class="throb"><img src="${iconURL('globe', 24)}" alt=""></div>`;
    const v = addr.querySelector('input') ? addr.querySelector('input').value : '';
    addr.innerHTML = `${T('アドレス(D)', 'Address')} <form><input class="ae-in" spellcheck="false"><button class="go" type="submit">${iconImg('allprog', 16)}${T('移動', 'Go')}</button></form>`;
    addr.querySelector('input').value = v;
    addr.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); let u = addr.querySelector('input').value.trim(); if (!u) return; if (!/^\w+:\/\//.test(u)) u = 'http://' + u; go(u); });
    sb.innerHTML = `<div style="flex:1" class="msg">${T('完了', 'Done')}</div><div class="pb"><i></i></div><div style="display:flex;align-items:center;gap:4px">${iconImg('globe', 16)}${T('インターネット', 'Internet')}</div>`;
    if (cur) sync();
  }
  paintChrome();
  win.body.append(tool, addr, page, sb);
  const $ = (s) => win.body.querySelector(s);

  tool.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    A.sfx.click();
    const a = b.dataset.a;
    if (a === 'back' && hist.length) { fwd.push(cur); go(hist.pop(), false, true); }
    if (a === 'fwd' && fwd.length) { hist.push(cur); go(fwd.pop(), false, true); }
    if (a === 'reload') go(cur, true);
    if (a === 'home') go(HOME);
    if (a === 'fav') { const r = b.getBoundingClientRect(), rr = A.root.getBoundingClientRect(); A.wm.menu(r.left - rr.left, r.bottom - rr.top, favs()); }
    if (a === 'stop') { $('.throb').classList.remove('on'); $('.ie-sb .msg').textContent = T('中止しました', 'Stopped'); }
  });
  function sync() {
    $('[data-a="back"]').disabled = !hist.length;
    $('[data-a="fwd"]').disabled = !fwd.length;
  }

  function render(url, count = true) {
    if (url.replace(/\/index\.html?$/, '/') === HOME) renderHome(count);
    else if (url === TT) renderTT();
    else renderErr(url);
    win.setTitle(`${page.dataset.title} - Hikari Explorer`);
  }
  function go(url, reload = false, nav = false) {
    if (!nav && !reload && cur && url !== cur) { hist.push(cur); fwd.length = 0; }
    cur = url;
    $('.ie-addr input').value = url;
    sync();
    $('.throb').classList.add('on');
    $('.ie-sb .msg').textContent = T(`Web サイト ${url.split('/')[2] || ''} を待機しています...`, `Waiting for ${url.split('/')[2] || ''}...`);
    const pb = $('.ie-sb .pb i');
    pb.style.transition = 'none'; pb.style.width = '0';
    requestAnimationFrame(() => { pb.style.transition = 'width .7s'; pb.style.width = '100%'; });
    page.style.opacity = '.0';
    ctx.timeout(() => {
      if (win.closed) return;
      page.scrollTop = 0;
      render(url);
      page.style.opacity = '';
      $('.throb').classList.remove('on');
      $('.ie-sb .msg').textContent = T('ページが表示されました', 'Done');
      $('.ie-sb .pb i').style.width = '0';
    }, 650 + Math.random() * 400);
  }
  win.relabel = () => {
    paintChrome();
    $('.ie-addr input').value = cur || '';
    const y = page.scrollTop;
    if (cur) render(cur, false);
    page.scrollTop = y;
  };

  function renderHome(count = true) {
    page.dataset.title = T('devansh の部屋へようこそ!!', "Welcome to devansh's room!!");
    let n = ctx.store.get('hits', 411);
    if (count) { n += 1; ctx.store.set('hits', n); }
    const digits = String(n).padStart(6, '0').split('').map((d) => `<i>${d}</i>`).join('');
    const d = osDate();
    page.innerHTML = `<div class="hp"><div class="wrap">
      <div class="top"></div>
      <div class="mq"><span>${T('★☆★ ようこそ!! devansh の部屋へ ★☆★ CRT と レコード と 夏 ★☆★ 好きなものだけ、ゆっくり置いていきます ★☆★ Best viewed with Hikari Explorer 6.0 / 800×600 ★☆★ リンクフリーです ★☆★',
        "★☆★ Welcome!! to devansh's room ★☆★ CRTs and records and summer ★☆★ Only the things I love, placed here slowly ★☆★ Best viewed with Hikari Explorer 6.0 / 800×600 ★☆★ Link freely! ★☆★")}</span></div>
      <div class="cols">
        <div class="nav"><a data-n="top">${T('ホーム', 'Home')}</a><a data-n="about">${T('これは何?', 'What is this?')}</a><a data-n="gb">${T('掲示板', 'Guestbook')}</a><a data-n="links">${T('リンク', 'Links')}</a><a data-n="tt">${T('時刻表', 'Timetable')}</a></div>
        <div class="main">
          <p>${L('はじめまして! [管理人|かんりにん|site administrator]の devansh です。<br>ここは、[好|す|to like]きなものを[並|なら|to line up]べておくための[部屋|へや|room]… に、なる[予定|よてい|plan]です。', "Nice to meet you! I'm devansh, the webmaster.<br>This is going to be a room for keeping the things I love… eventually.")}<span class="new">NEW!</span></p>
          <div class="uc"><i class="cone"></i><div>${L('ただいま[工事中|こうじちゅう|under construction] · UNDER CONSTRUCTION', 'UNDER CONSTRUCTION · please come back soon')}</div><i class="cone"></i></div>
          <h2 id="about">${T('これは何?', 'What is this?')}</h2>
          <ul>
            <li>${L('RF しか[入|はい|to go in]らない[古|ふる|old]いテレビを、[現役|げんえき|active duty]に[戻|もど|to return]した[記録|きろく|record]', 'A log of bringing an old RF-only TV back into service')}</li>
            <li>${L('いつか[集|あつ|to collect]める 30 [枚|まい|counter for flat things]のレコードのリスト', 'A list of the 30 records I will collect someday')}</li>
            <li>${L('[夏|なつ|summer]の[駅|えき|station]の[写真|しゃしん|photo]。[人|ひと|people]は[写|うつ|to appear (in a photo)]っていません。', 'Photos of summer stations. No people in them.')}</li>
          </ul>
          <h2>${T('最新情報', "What's New")}</h2>
          <ul>
            <li>2003/12/24 ${L('ホームページを[開設|かいせつ|open (a site)]しました!!', 'The homepage is open!!')}</li>
            <li>2003/12/25 ${T('カウンターをつけました。', 'Added a hit counter.')}</li>
            <li>2003/12/26 ${L('[掲示板|けいじばん|bulletin board]をつけました。[荒|あ|to vandalise]らしは[禁止|きんし|forbidden]です!', 'Added a guestbook. No trolling, please!')}</li>
            <li>${d.str} ${L('CRT のページを[更新|こうしん|update]しました。もうすこし[待|ま|to wait]ってね。', 'Updated the CRT page. Just a little longer, okay?')}</li>
          </ul>
          <div class="ctr">${A.en ? `You are visitor number <b>${digits}</b>.` : `あなたは <b>${digits}</b> 人目のお客様です。`}${L('キリ[番|ばん|round-number hit]を[踏|ふ|to step on]んだら[掲示板|けいじばん|bulletin board]で[報告|ほうこく|report]してね!', ' If you land on a round number, tell me in the guestbook!')}</div>
          <h2 id="gb">${T('掲示板 (ゲストブック)', 'Guestbook')}</h2>
          <div class="gb"><div class="entries"></div>
            <form><span>${T('お名前', 'Name')}</span><input class="ae-in" maxlength="24" placeholder="${T('名無しさん', 'Anonymous')}"><span>${T('メッセージ', 'Message')}</span><input class="ae-in" maxlength="140"><button class="ae-btn" type="submit">${T('書き込む', 'Sign')}</button></form>
          </div>
          <h2 id="links">${T('リンク', 'Links')}</h2>
          <p>${L('[相互|そうご|mutual]リンク[募集中|ぼしゅうちゅう|now recruiting]です。バナーはご[自由|じゆう|freely]にどうぞ。', 'Looking for link exchanges! Feel free to take a banner.')}</p>
          <div class="btns"></div>
          <div class="ring">[<a data-n="tt">&lt;&lt; ${T('前のサイト', 'Prev')}</a>] Summer Stations Webring [<a data-n="err">${T('次のサイト', 'Next')} &gt;&gt;</a>]</div>
        </div>
      </div>
      <div class="foot">${T('最終更新日', 'Last updated')}: ${d.str} · ${L('このページはリンクフリーです', 'Feel free to link to this page')} · (c) 2003-2004 devansh</div>
    </div></div>`;
    page.querySelector('.top').appendChild(wordArt(A));
    const btns = page.querySelector('.btns');
    [
      [['HIKARI Aqua', '2004'], ['#5fb0ff', '#0b4fc9'], '#fff'],
      [['Best viewed', '800 x 600'], ['#ffffff', '#cfcfcf'], '#000'],
      [['Hikari', 'Explorer 6'], ['#b8f08a', '#2f8a1f'], '#fff'],
      [['devansh', T('工事中!', 'building!')], ['#ffe14a', '#ff9a00'], '#000'],
      [['ひかり線', 'Hikari Line'], ['#ffd29a', '#e6a23c'], '#3a2000'],
    ].forEach(([l, bg, fg]) => btns.appendChild(button88(l, bg, fg)));
    const seed = A.en ? [
      ['HIKARI', '2003/12/26', "Congrats on opening! I'll be cheering you on, always. Whoever lands on visitor 000500, report in!"],
      ['Anonymous', '2004/01/03', 'Your RF modulator write-up helped a lot. Our TV shows a picture now too!'],
      ['traveller', '2004/02/11', 'The polka-dot background is cute. I\'ll come again.'],
    ] : [
      ['HIKARI', '2003/12/26', '開設おめでとう! ずっと応援しています。キリ番 000500 を踏んだ人は報告してね!'],
      ['名無しさん', '2004/01/03', 'RF モジュレーターの話、参考になりました。うちのテレビも映りました!'],
      ['旅人', '2004/02/11', '背景の水玉、かわいいですね。また来ます。'],
    ];
    const extra = ctx.store.get('guest', []);
    const entries = page.querySelector('.entries');
    const renderGB = () => {
      entries.innerHTML = [...seed, ...extra].map(([w, t, m]) => `<div class="e"><span class="who">${esc(w)}</span><span class="when">${esc(t)}</span><div>${esc(m)}</div></div>`).join('');
    };
    renderGB();
    page.querySelector('.gb form').addEventListener('submit', (e) => {
      e.preventDefault();
      const [nm, ms] = e.target.querySelectorAll('input');
      if (!ms.value.trim()) { A.wm.msgbox({ title: T('Web ページからのメッセージ', 'Message from webpage'), icon: 'warn', html: L('メッセージを[入力|にゅうりょく|input]してください!', 'Please enter a message!') }); return; }
      extra.push([nm.value.trim() || T('名無しさん', 'Anonymous'), osDate().str, ms.value.trim()]);
      ctx.store.set('guest', extra.slice(-12));
      ms.value = '';
      renderGB();
      A.sfx.ding();
      A.emit('guestbook');
    });
    page.querySelectorAll('[data-n]').forEach((a) => a.addEventListener('click', () => {
      const n2 = a.dataset.n;
      if (n2 === 'tt') return go(TT);
      if (n2 === 'err') return go('http://www.webring.example/next?id=devansh');
      const t = n2 === 'top' ? page.querySelector('.hp') : page.querySelector('#' + n2);
      if (t) page.scrollTo({ top: t.offsetTop - 8, behavior: 'smooth' });
    }));
  }

  function renderTT() {
    page.dataset.title = T('ひかり線 時刻表 (平日)', 'Hikari Line timetable (weekdays)');
    const rows = [
      ['H01', '夏ヶ原', 'なつがはら', 'Natsugahara', '06:12', '19:48'],
      ['H02', '銀座', 'ぎんざ', 'Ginza', '06:31', '20:07'],
      ['H03', '水色ヶ丘', 'みずいろがおか', 'Mizuirogaoka', '06:52', '20:28'],
      ['H04', '円町', 'まるまち', 'Marumachi', '07:10', '20:46'],
      ['H05', '地下', 'ちか', 'Chika', '07:27', '21:03'],
      ['H06', '区域', 'くいき', 'Kuiki', '07:51', '21:27'],
      ['H07', '黄昏ヶ浜', 'たそがれがはま', 'Tasogaregahama', '08:18', '21:54'],
      ['H∞', '銀河', 'ぎんが', 'Ginga', '—', '—'],
    ];
    page.innerHTML = `<div class="tt-page"><h1>${T('ひかり線 時刻表 (平日・下り)', 'Hikari Line timetable (weekdays, outbound)')}</h1>
      <table><tr><th>${T('駅番号', 'No.')}</th><th>${T('駅名', 'Station')}</th><th>${T('始発', 'First train')}</th><th>${T('終電', 'Last train')}</th></tr>
      ${rows.map(([no, jp, kana, en, a, b]) => `<tr class="${no === 'H03' ? 'here' : ''}"><td>${no}</td><td>${jp} <small style="color:#888">${A.en ? en : kana}</small></td><td>${a}</td><td>${b}</td></tr>`).join('')}</table>
      <p style="margin-top:14px">${L('※ [終点|しゅうてん|terminus] 銀河 [行|ゆ|bound for]きは、[夜|よる|night]にだけ[運行|うんこう|operate (a train service)]します。', '※ Trains bound for the terminus, Ginga, run only at night.')}<br>${L('※ [一両|いちりょう|one car]のワンマン[運転|うんてん|operation]です。[乗車|じょうしゃ|boarding]は[前|まえ|front]のドアから。', '※ One car, driver only. Please board through the front door.')}</p></div>`;
  }

  function renderErr(url) {
    page.dataset.title = T('ページを表示できません', 'The page cannot be displayed');
    page.innerHTML = A.en ? `<div class="err-page"><h1>${iconImg('info', 32)}The page cannot be displayed</h1>
      The page you are looking for is currently unavailable. The Web site might be experiencing technical difficulties, or you may need to adjust your browser settings.
      <hr><p>Please try the following:</p><ul>
      <li>Click the Refresh button, or try again later.</li>
      <li>If you typed the page address in the Address bar, make sure that it is spelled correctly.</li>
      <li>That future may not have arrived yet.</li></ul>
      <hr><p style="color:#666">HTTP 404 - File not found<br>Hikari Explorer<br><small>${esc(url)}</small></p></div>`
      : `<div class="err-page"><h1>${iconImg('info', 32)}ページを表示できません</h1>
      ${L('[検索|けんさく|search]しているページは[現在|げんざい|currently]、[利用|りよう|use]できません。Web サイトに[技術的|ぎじゅつてき|technical]な[問題|もんだい|problem]が[発生|はっせい|occur]しているか、ブラウザの[設定|せってい|settings]を[調整|ちょうせい|adjust]する[必要|ひつよう|necessary]があります。', '')}
      <hr><p>次のことを試してください:</p><ul>
      <li>[最新の情報に更新] ボタンをクリックするか、後でやり直してください。</li>
      <li>アドレス バーにページ アドレスを入力した場合は、ページ アドレスを正しく入力したかどうかを確認してください。</li>
      <li>${L('その[未来|みらい|future]は、まだ[来|き|to come]ていないのかもしれません。', '')}</li></ul>
      <hr><p style="color:#666">HTTP 404 - ファイルが見つかりません<br>Hikari Explorer<br><small>${esc(url)}</small></p></div>`;
  }

  go(startPage === 'timetable' ? TT : HOME);
  return win;
}
