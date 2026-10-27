// H02 銀座 一九八五 — Shōwa Tokyo at night, after the last train.
// A wet street under the elevated line; a street screen counting down a chart from two eras;
// a used-record shop whose owner has stepped out; one record, turning for you.

import { el, stampJP, stampEN, loadFonts } from './showa/util.js';
import { Street } from './showa/street.js';
import { Shop } from './showa/shop.js';
import { Phone } from './showa/phone.js';
import { FONT_SPECS } from './showa/sleeves.js';
import { TV_FONTS } from './showa/tv.js';
import { CSS } from './showa/style.js';

// Wong Kar-wai style interior titles: a timestamp, then one thought. Original lines.
const THOUGHTS = [
  ['[終電|しゅうでん|the last train of the night]はもう[行|い|to go]ってしまった。それでも、この[街|まち|town; streets]はまだ[眠|ねむ|to sleep]らない。', 'The last train has gone. The city still isn’t sleeping.'],
  ['『[質|しち|pawn (shop)]』の[看板|かんばん|signboard]は、[三秒|さんびょう|three seconds]に[一度|いちど|once]だけ[消|き|to go out]える。[誰|だれ|nobody]も[直|なお|to fix]さない。', 'The “pawn” sign goes out once every three seconds. Nobody fixes it.'],
  ['[電話|でんわ|telephone]ボックスの[受話器|じゅわき|receiver]は、まだ[少|すこ|a little]し[温|あたた|warm]かかった。', 'The receiver in the phone box was still a little warm.'],
  ['この[夜|よる|night]のことを、[誰|だれ|nobody]も[覚|おぼ|to remember]えていない。だから、あなたが[覚|おぼ|to remember]えていればいい。', 'No one will remember this night. So it’s enough that you do.'],
  ['タクシーの『[空車|くうしゃ|vacant (taxi)]』の[赤|あか|red]い[字|じ|letters]が、[水|みず|water]たまりの[中|なか|inside]を[横切|よこぎ|to cross]った。', 'The red letters of a vacant taxi crossed a puddle.'],
  ['[四十一年後|よんじゅういちねんご|forty-one years later]、あなたはこの[街|まち|town]の[音|おと|sound]を[探|さが|to look for]しに[来|く|to come]る。', 'Forty-one years from now, you come looking for the sound of this street.'],
  ['[有線|ゆうせん|cable radio]から[流|なが|to flow; to play]れる[曲|きょく|song]の[名前|なまえ|name]を、[誰|だれ|nobody]も[知|し|to know]らなかった。', 'No one knew the name of the song on the cable radio.'],
];

export default {
  id: 'showa',
  mount(root, ctx) {
    root.classList.add('showa-root');
    const style = document.createElement('style');
    style.textContent = CSS;
    root.appendChild(style);
    const stage = el('div', 'sw-stage', root);
    const capEl = el('div', 'sw-cap', root);
    const telop = el('div', 'sw-telop', root);
    const syncLang = () => root.classList.toggle('sw-en-mode', !!ctx.en);
    syncLang();
    if (ctx.onLang) ctx.onLang(() => { syncLang(); });
    ctx.jp.attach(root);

    let scene = 'street';
    let capTimer = null;
    const caption = (lines, hold = 7000) => {
      capEl.innerHTML = lines.map(([jp, en], i) => {
        const j = jp === 'STAMP' ? stampJP() : ctx.jp.html(jp);
        const e = en === 'STAMP' ? stampEN() : en;
        return `<div class="l l${i}"><span class="jp">${j}</span><span class="en">${e}</span></div>`;
      }).join('');
      capEl.classList.remove('on'); void capEl.offsetWidth; capEl.classList.add('on');
      clearTimeout(capTimer);
      capTimer = ctx.timeout(() => capEl.classList.remove('on'), hold);
    };

    const hooks = {
      tvLine: (l) => {
        if (!l) { telop.classList.remove('on'); return; }
        telop.innerHTML = `<span class="who"><span class="jp">司会</span><span class="en">Host</span></span><span class="jp">${ctx.jp.html(l[0])}</span><span class="en">${l[1]}</span>`;
        telop.classList.remove('on'); void telop.offsetWidth; telop.classList.add('on');
      },
      onWatch: (on) => { if (!on) telop.classList.remove('on'); root.classList.toggle('sw-watching', on); },
      enterShop: () => {
        scene = 'shop';
        street.setVisible(false);
        shop.setVisible(true);
        capEl.classList.remove('on');
      },
      exitShop: () => {
        scene = 'street';
        shop.setVisible(false);
        street.setVisible(true);
        street.returnFromShop();
        shop.doorBell();
      },
      openPhone: () => { phone.show(); },
      caption,
      dimExit: (on) => ctx.exitVisible(!on),
    };

    const street = new Street(stage, ctx, hooks);
    const shop = new Shop(stage, ctx, hooks);
    const phone = new Phone(root, ctx, { onClose: () => {} });
    // what plays in the shop leaks out of its door into the street
    shop.musicNode.connect(street.leakIn);

    loadFonts([...FONT_SPECS, ...TV_FONTS,
      ['700 20px "Zen Kaku Gothic New"', '純喫茶ルナ麻雀スナック夜光カラオケホテルラーメン来々軒港くすりパチンコ喫茶白馬酒焼鳥止まれ銀座架道橋公衆電話中古レコード夜光堂営業中買取洋食うなぎ天ぷら画廊ヒカリ電機'],
      ['800 20px "M PLUS Rounded 1c"', '麻雀スナック夜光ホテルBAR港ちょっと出てます店主夏車用店用'],
      ['800 20px "Shippori Mincho B1"', '質夜光堂ルナ'],
      ['400 20px "Mochiy Pop One"', 'あなたの30枚アイドルシティ・ポップ（あ〜なは〜わ）'],
    ]).then(() => { if (!ctx.signal.aborted) { street.resize(ctx.w, ctx.h); shop.resize(ctx.w, ctx.h); } });

    // occasional interior titles on the street
    let nextCap = 8, capI = (ctx.visits || 1) % THOUGHTS.length;
    ctx.loop((t, dt) => {
      if (document.hidden) return;
      dt = Math.max(0, Math.min(0.1, dt || 0));
      if (scene === 'street') {
        street.frame(t, dt);
        if (street.mode === 'street' && !street.camAnim) {
          nextCap -= dt;
          if (nextCap <= 0) {
            caption([['STAMP', 'STAMP'], THOUGHTS[capI % THOUGHTS.length]], 8500);
            capI++;
            nextCap = 55 + Math.random() * 25;
          }
        }
      } else {
        shop.frame(t, dt);
      }
    });

    return {
      resize(w, h) { street.resize(w, h); shop.resize(w, h); shop.renderNP(); },
      destroy() { clearTimeout(capTimer); street.dispose(); shop.dispose(); },
    };
  },
};
