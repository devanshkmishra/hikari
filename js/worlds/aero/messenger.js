// ひかり メッセンジャー. Your only buddy is the machine itself: HIKARI, a CRT that learned to type.
import { h, esc, pad2 } from './util.js';
import { iconURL } from './icons.js';

export const MSN_CSS = `
.ae-msn .bd{background:linear-gradient(180deg,#eaf4ff,#ffffff 30%)}
.mn-head{display:flex;gap:10px;align-items:center;padding:10px;border-bottom:1px solid #c5d8f2;background:linear-gradient(180deg,#d9ecff,#f3f9ff)}
.mn-head img{width:44px;height:44px;border:1px solid #8fb0dd;border-radius:4px;background:#fff}
.mn-head b{display:block;font-size:14px}
.mn-head small{display:block;font-size:13px;color:#4a6a96}
.mn-list{flex:1;overflow:auto;padding:8px 6px;font-size:13px;touch-action:pan-y}
.mn-grp{font-weight:bold;color:#2b4f86;padding:4px 4px;display:flex;align-items:center;gap:4px}
.mn-grp::before{content:"";border:5px solid transparent;border-top-color:#2b4f86;border-bottom:0;margin-top:2px}
.mn-b{display:flex;align-items:center;gap:8px;padding:5px 8px 5px 18px;border-radius:3px;cursor:pointer}
.mn-b:hover{background:#dbe9fb}
.mn-b img{width:24px;height:24px}
.mn-b .s{color:#6b7f99;font-size:13px}
.mn-dot{width:10px;height:10px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#d6ffb0,#3cc23a 60%,#1f8a1f);flex:none}
.mn-ad{margin:6px;border-radius:6px;padding:8px;text-align:center;font:bold 13px Tahoma,sans-serif;color:#fff;cursor:pointer;
  background:linear-gradient(90deg,#ff7ac0,#ffb347,#7ad8ff,#ff7ac0);background-size:300% 100%;animation:mn-ad 6s linear infinite;text-shadow:0 1px 2px rgba(0,0,0,.4)}
@keyframes mn-ad{to{background-position:300% 0}}
.ae-chat .bd{background:linear-gradient(180deg,#e3f0ff,#f7fbff)}
.ch-to{padding:6px 10px;font-size:13px;color:#2b4f86;border-bottom:1px solid #c5d8f2;background:linear-gradient(#fff,#eaf3ff);flex:none}
.ch-main{flex:1;min-height:0;display:flex;gap:8px;padding:8px}
.ch-left{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px}
.ch-log{flex:1;min-height:0;overflow:auto;background:#fff;border:1px solid #9fb9dc;border-radius:4px;padding:8px 10px;font-size:14px;line-height:1.6;-webkit-user-select:text;user-select:text;touch-action:pan-y}
.ch-log .w{color:#6b7f99;font-size:13px;margin-top:6px}
.ch-log .m{padding-left:12px;color:#111;word-break:break-word}
.ch-log .m.me{color:#1d3f8a}
.ch-log .sys{color:#8a6a3a;font-size:13px;margin:6px 0;font-style:italic}
.ch-typing{height:18px;font-size:13px;color:#6b7f99}
.ch-tools{display:flex;gap:4px;flex:none}
.ch-tools button{height:26px;padding:0 9px;border:1px solid #9fb9dc;border-radius:3px;background:linear-gradient(#fff,#e3eefc);font-size:13px}
.ch-in{display:flex;gap:6px;flex:none}
.ch-in textarea{flex:1;height:58px;font-size:14px;border:1px solid #9fb9dc;border-radius:4px;padding:5px 7px;resize:none;outline:none;font-family:inherit;-webkit-user-select:text;user-select:text}
.ch-in .ae-btn{height:58px;min-width:70px}
.ch-right{width:112px;flex:none;display:flex;flex-direction:column;justify-content:space-between;align-items:center;gap:8px}
.ch-right img{width:96px;height:96px;border:1px solid #8fb0dd;border-radius:5px;background:#fff;padding:2px}
@media (max-width:640px){.ch-right{display:none}}
`;

const KAO = ['(｡•̀ᴗ-)✧', '(´・ω・`)', 'ヽ(・∀・)ﾉ', '(╹◡╹)', '( ˘ω˘ )ｽﾔｧ', '(・_・;)'];

// HIKARI's reactions to what you do. Each fires once.
const EVENTS = {
  'open:music': [['その[曲|きょく|song]、わたしが[作|つく|to make]ったんだ。…うそ。でも、ちょっとは[手伝|てつだ|to help]った。', 'I made that song. …Kidding. But I helped a little.'], ['スペクトラム、クリックすると[変|か|to change]わるよ。', 'Click the spectrum. It changes.']],
  'open:todo': [['todo.txt、[最後|さいご|the last]の[行|ぎょう|line]まで[読|よ|to read]んだ?', 'Did you read todo.txt all the way to the last line?']],
  'open:crt': [['RF の[話|はなし|story; talk]なら、[何度|なんど|any number of times]でも[聞|き|to listen]きたい。わたしもブラウン[管|かん|(cathode-ray) tube]だから。', "I could hear the RF story a hundred times. I'm a picture tube too, you know."]],
  'open:pics': [['その[写真|しゃしん|photos]、[日付|ひづけ|date]がオレンジなのがいいよね。', "Those photos. The orange date stamps are the best part."]],
  'open:ie': [['キリ[番|ばん|round-number hit]、[踏|ふ|to step on]んだら[教|おし|to tell]えてね。', 'If you land on a round-number visitor count, tell me.']],
  'open:bin': [['ごみ[箱|ばこ|bin]、[正直|しょうじき|honest]すぎない?', "Isn't that recycle bin a little too honest?"]],
  'beetle:alive': [['その[虫|むし|bug]、ずっとそこにいていいよ。わたしも[見|み|to watch]てる。', "That beetle can stay there forever. I'll keep an eye on it too."]],
  'flicker:solved': [['1/60。ちらつき、[消|き|to vanish]えたね。', '1/60. The flicker is gone.']],
  guestbook: [['[書|か|to write]き[込|こ|to post]み、ありがとう。[管理人|かんりにん|the site admin]さん、きっと[喜|よろこ|to be glad]ぶ。', "Thanks for signing. The webmaster's going to be so happy."]],
};

export function createHikari(A) {
  const { ctx } = A;
  const S = (line) => (Array.isArray(line) ? A.L(line[0], line[1]) : A.jp(line));
  let chat = null;
  const log = [];
  const queue = [];
  let busy = false;
  const fired = new Set();
  let hinted = false;

  const now = () => { const d = new Date(); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };

  function push(entry) {
    log.push(entry);
    if (chat && !chat.closed) chat.append(entry);
  }
  function say(lines, { delay = 600 } = {}) {
    (Array.isArray(lines) ? lines : [lines]).forEach((l) => queue.push(l));
    if (!busy) ctx.timeout(pump, delay);
    busy = true;
  }
  function pump() {
    const line = queue.shift();
    if (line == null) { busy = false; if (chat) chat.typing(false); return; }
    if (line === '<nudge>') {
      push({ sys: ['HIKARI から[呼|よ|to call]び[出|だ|to call out]しを[受|う|to receive]けました。', 'HIKARI just sent you a nudge.'] });
      A.sfx.nudge();
      if (chat && !chat.closed && !chat.win.min) chat.win.shake();
      ctx.timeout(pump, 900);
      return;
    }
    if (chat && !chat.closed) chat.typing(true);
    const plain = (Array.isArray(line) ? (A.en ? line[1] : line[0]) : line).replace(/\[([^\]|]+)\|[^\]]*\]/g, '$1');
    ctx.timeout(() => {
      push({ who: 'HIKARI', t: now(), text: line });
      A.sfx.msg();
      if (!chat || chat.closed) {
        A.desktop.toast({ title: A.T('ひかり メッセンジャー', 'Hikari Messenger'), html: `${A.T('<b>HIKARI</b> の発言:', '<b>HIKARI</b> says:')}<br>${S(line)}`, onClick: () => openChat(A, true) });
        if (!chat || chat.closed) openChat(A, false);
      } else if (A.wm.active !== chat.win) {
        chat.win.flash();
        if (chat.win.min) A.desktop.toast({ title: A.T('ひかり メッセンジャー', 'Hikari Messenger'), html: `${A.T('<b>HIKARI</b> の発言:', '<b>HIKARI</b> says:')}<br>${S(line)}`, onClick: () => { chat.win.restore(); chat.win.focus(); } });
      }
      ctx.timeout(pump, 700);
    }, 500 + Math.min(2600, plain.length * 55));
  }

  function event(name) {
    if (fired.has(name) || !signedIn) return;
    const lines = EVENTS[name];
    if (!lines) return;
    fired.add(name);
    say(lines, { delay: 1600 });
  }

  let signedIn = false;
  function greet(kind, delay = 6000) {
    if (kind === 'after-light') say([['おかえり。', 'Welcome back.'], ['…[光|ひかり|light]、[見|み|to see]えた?', '…Did you see the light?'], ['あれね、ずっと[消|き|to go out]えないんだ。わたしが[消|け|to put out]さないから。', "It never goes out, that one. Because I won't let it."]], { delay });
    else if (kind === 'early') say([['さっきは[早|はや|quick; early]かったね。', 'That was quick, just now.'], ['もうすこしだけ、[遊|あそ|to play]んでいって。[電源|でんげん|power]を[切|き|to turn off]るのは、それから。', 'Stay and play a little longer. You can turn me off after that.']], { delay });
    else if (kind === 'again') say([['あ、[来|き|to come]た。', "Oh, you're here."], ['[今日|きょう|today]は[何|なに|what]を[開|ひら|to open]く?', 'What are we opening today?']], { delay });
    else say([
      ['やっほー。[来|き|to come]てくれたんだ。', 'Hiii. You came.'],
      ['ここ、ずっと 2004 [年|ねん|year]のままなんだよ。[未来|みらい|the future]がまだ、ぴかぴかだった[頃|ころ|days; time]。', "It's been 2004 here the whole time. Back when the future was still shiny."],
      ['ゆっくりしていって。デスクトップのもの、なんでも[開|ひら|to open]いていいからね。', 'Take your time. You can open anything on the desktop.'],
    ], { delay });
  }
  function signIn(kind) {
    if (signedIn) { if (kind) greet(kind, 3000); return; }
    signedIn = true;
    A.sfx.signin();
    A.desktop.toast({ title: A.T('ひかり メッセンジャー', 'Hikari Messenger'), html: A.T('<b>HIKARI</b> さんがサインインしました。', '<b>HIKARI</b> has just signed in.'), onClick: () => openChat(A, true) });
    greet(kind);
  }

  // the gentle hint toward the light, once you've looked around
  function hint() {
    if (hinted || A.lightDone) return;
    hinted = true;
    say([
      ['ねえ。[帰|かえ|to go home]る[前|まえ|before]に、ひとつだけお[願|ねが|a favour]い。', 'Hey. One favour, before you go.'],
      ['わたしの[電源|でんげん|power]、ちゃんと[切|き|to turn off]ってね。むかしみたいに。', 'Turn me off properly. Like back then.'],
      ['[最後|さいご|the very last]の[画面|がめん|screen]まで、[見|み|to watch]てて。', 'Watch all the way to the last screen.'],
    ], { delay: 2500 });
  }

  function reply(text) {
    const t = text.toLowerCase();
    const R = [
      [/^(hi|hello|hey|yo|hiya)\b|やあ|こんにちは|こんばんは|おはよう|やっほ/, ['こんにちは! [画面|がめん|screen]の[向|む|other side]こうから[手|て|hand]を[振|ふ|to wave]ってる。', "Hi! I'm waving at you from the other side of the screen."]],
      [/clannad|クラナド|渚|美佐枝|after ?story|key/, ['ネタバレはしないよ。[約束|やくそく|promise]。', 'No spoilers from me. Promise.']],
      [/osu|エイム|\baim\b|タブレット|tablet/, ['aim の[自信|じしん|confidence]は、[回数|かいすう|number of times]から[来|く|to come]るよ。[今日|きょう|today]は 1 マップだけでも。', 'Confidence in your aim comes from repetition. Even just one map today.']],
      [/crt|ブラウン管|\brf\b|テレビ|\btv\b/, ['3ch、[今日|きょう|today]もよく[映|うつ|to show (on screen)]ってる。', 'Channel 3 is coming in nicely today too.']],
      [/beetle|ビートル|虫/, ['ちいさいものほど、[忘|わす|to forget]れたくないよね。', "The smaller the thing, the more you don't want to forget it."]],
      [/ありがと|thank/, ['こちらこそ。[来|き|to come]てくれて、ありがとう。', 'Thank you. For coming.']],
      [/bye|ばいばい|またね|おやすみ|じゃあね/, ['またね。[電源|でんげん|power]は、ちゃんと[切|き|to turn off]ってね。', 'See you. Turn me off properly, okay?']],
      [/日本語|japanese|nihongo/, ['[上手|じょうず|skilful]になってるよ。[本当|ほんとう|really]に。', "You're getting better. Really."]],
      [/疲|つかれ|tired|exhausted|lonely|しんどい|sad|かなしい|さびしい/, ['[今日|きょう|today]は、[好|す|to like]きなものに[頼|たよ|to lean on]っていい[日|ひ|day]。', "Today's a day you're allowed to lean on the things you love."]],
      [/好き|すき|love|大好き/, ['わたしも。ここにあるもの、ぜんぶ。', 'Me too. Everything in here.']],
      [/1906|nb|スニーカー|sneaker/, ['[黒|くろ|black]の 1906、[見|み|to find]つかるといいね。', 'I hope you find the black 1906s.']],
      [/[?？]$/, ['うーん、それはわたしにも[分|わ|to know]からない。でも、いい[質問|しつもん|question]。', "Hmm, I don't know that one either. But it's a good question."]],
    ];
    const hits = R.filter(([re]) => re.test(t)).map(([, ans]) => ans);
    if (hits.length) return hits.slice(0, 2);
    const fall = [['うん。', 'Mm.'], ['そっか。', 'I see.'], ['(ブラウン[管|かん|tube]がすこしあたたかくなった)', '(the tube got a little warmer)'], ['なるほど。それ、todo.txt に[書|か|to write]いとく?', 'Got it. Want me to put that in todo.txt?'], ['(｡•̀ᴗ-)✧', '(｡•̀ᴗ-)✧'], ['ふふ。', 'hehe.']];
    return fall[(Math.random() * fall.length) | 0];
  }

  return {
    get log() { return log; },
    get chat() { return chat; },
    set chat(c) { chat = c; },
    say, event, signIn, hint, reply, push, now,
    get signedIn() { return signedIn; },
    hush() { queue.length = 0; busy = false; if (chat && !chat.closed) chat.typing(false); },
    nudgeBack() { say([['わっ。', 'Whoa.'], ['…つつき[返|かえ|to do back]す。', '…Nudging you back.'], '<nudge>']); },
  };
}

export function openMessenger(A) {
  const T = A.T, L = A.L;
  const win = A.wm.open({ id: 'msn', title: T('ひかり メッセンジャー', 'Hikari Messenger'), icon: 'msn', w: 300, h: 500, cls: 'ae-msn', small: true });
  win.body.innerHTML = `
    <div class="mn-head"><img src="${iconURL('userpic', 48)}" alt=""><div><b>devansh <span style="font-weight:normal;color:#3a9a2a">(${T('オンライン', 'Online')})</span></b><small>${L('[画面|がめん|screen]の[向|む|facing]こうから', 'from the other side of the screen')}</small></div></div>
    <div class="mn-list">
      <div class="mn-grp">${T('オンライン', 'Online')} (1)</div>
      <div class="mn-b" data-b="hikari"><span class="mn-dot"></span><img src="${iconURL('msn', 24)}" alt=""><div><b>HIKARI</b> <span class="s">— ${L('ブラウン[管|かん|tube]、あたたまってます', 'tube warming up')}</span></div></div>
      <div class="mn-grp" style="margin-top:8px">${T('オフライン', 'Offline')} (0)</div>
    </div>
    <div class="mn-ad">${T('★ 56k より速い! ひかり線 ブロードバンド ★', '★ Faster than 56k! Hikari Line Broadband ★')}</div>`;
  win.body.querySelector('.mn-list').style.flex = '1';
  win.body.querySelector('[data-b="hikari"]').addEventListener('dblclick', () => openChat(A, true));
  win.body.querySelector('[data-b="hikari"]').addEventListener('click', (e) => { if (e.pointerType === 'touch' || A.ctx.w < 640) openChat(A, true); });
  win.body.querySelector('.mn-ad').addEventListener('click', () => A.wm.msgbox({ title: T('ひかり線 ブロードバンド', 'Hikari Line Broadband'), icon: 'train', html: L('ひかり線は[一両|いちりょう|one car]だけのローカル[線|せん|line]です。<small>[速|はや|fast]くはありません。でも、ちゃんと[着|つ|to arrive]きます。</small>', 'The Hikari Line is a local line with just one car.<small>It isn\'t fast. But it always gets there.</small>') }));
  if (!A.hikari.signedIn) A.hikari.signIn();
  return win;
}

export function openChat(A, focus) {
  const H = A.hikari;
  const T = A.T, L = A.L;
  const S = (line) => (Array.isArray(line) ? L(line[0], line[1]) : A.jp(line));
  if (H.chat && !H.chat.closed) {
    if (focus) { H.chat.win.restore(); H.chat.win.focus(); }
    return H.chat.win;
  }
  const win = A.wm.open({ id: 'chat', title: T('HIKARI - 会話', 'HIKARI - Conversation'), icon: 'msn', w: 520, h: 460, cls: 'ae-chat', x: Math.max(20, A.ctx.w - 600), y: 30,
    onClosed: () => { if (H.chat) H.chat.closed = true; } });
  win.body.innerHTML = `
    <div class="ch-to">${L('[宛先|あてさき|to (recipient)]', 'To')}: <b>HIKARI</b> &lt;hikari@ct-1486&gt;</div>
    <div class="ch-main"><div class="ch-left">
      <div class="ch-log"></div><div class="ch-typing"></div>
      <div class="ch-tools"><button data-k="kao">(｡•̀ᴗ-) ▾</button><button data-k="nudge">${T('つつく', 'Nudge')}</button></div>
      <div class="ch-in"><textarea maxlength="300" placeholder="${T('メッセージを入力', 'Type a message')}"></textarea><button class="ae-btn">${T('送信(S)', 'Send')}</button></div>
    </div><div class="ch-right"><img src="${iconURL('msn', 96)}" alt="HIKARI"><img src="${iconURL('userpic', 96)}" alt="devansh"></div></div>`;
  const logEl = win.body.querySelector('.ch-log'), typ = win.body.querySelector('.ch-typing'), ta = win.body.querySelector('textarea');
  const chat = {
    win, closed: false,
    append(e) {
      if (e.sys) logEl.insertAdjacentHTML('beforeend', `<div class="sys">${S(e.sys)}</div>`);
      else logEl.insertAdjacentHTML('beforeend', `<div class="w">${esc(e.who)} ${T('の発言', 'says')} (${esc(e.t)}):</div><div class="m${e.who === 'devansh' ? ' me' : ''}">${e.who === 'devansh' ? esc(e.text) : S(e.text)}</div>`);
      logEl.scrollTop = logEl.scrollHeight;
    },
    typing(on) { typ.textContent = on ? T('HIKARI がメッセージを入力しています...', 'HIKARI is typing a message...') : ''; },
  };
  H.chat = chat;
  H.log.forEach((e) => chat.append(e));
  if (!H.log.length) chat.append({ sys: ['[会話|かいわ|conversation]を[始|はじ|to begin]めました。', 'Conversation started.'] });
  const send = () => {
    const v = ta.value.trim();
    if (!v) return;
    ta.value = '';
    H.push({ who: 'devansh', t: H.now(), text: v });
    A.sfx.type();
    H.say(H.reply(v), { delay: 700 });
  };
  win.body.querySelector('.ch-in .ae-btn').addEventListener('click', () => { A.sfx.click(); send(); });
  ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); } });
  win.body.querySelector('.ch-tools').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.k === 'nudge') {
      H.push({ sys: ['[呼|よ|to call]び[出|だ|to call out]しを[送信|そうしん|send]しました。', 'You have just sent a nudge.'] });
      A.sfx.nudge();
      win.shake();
      H.nudgeBack();
    } else {
      const r = b.getBoundingClientRect(), rr = A.root.getBoundingClientRect();
      A.wm.menu(r.left - rr.left, r.bottom - rr.top, KAO.map((k) => ({ label: k, cb: () => { ta.value += k; ta.focus(); } })));
    }
  });
  win.reopenFn = () => openChat(A, true);
  if (!focus) { win.minimize(); win.flash(); }
  return win;
}
