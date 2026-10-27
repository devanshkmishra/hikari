// The documents on this computer. Written for you; glossed where a reader would reach for the dictionary.
import { osDate } from './util.js';

export function todoText() {
  return `todo.txt                                   ${osDate().str} (たぶん)

[ ] CLANNAD を最後まで読む
      - [美佐枝|みさえ|Misae (a name)]さんルート、もうすぐ終わる
      - そのあと After Story。ティッシュを箱で買っておく
      - ネタバレは見ない。絶対に。

[ ] LP を 30 枚
      - [初回盤|しょかいばん|first pressing]じゃなくていい。[盤|ばん|the disc (of a record)]の[状態|じょうたい|condition] > ロマン
      - いま: __ / 30

[ ] 日本へ行く
      - [中古|ちゅうこ|second-hand]レコード屋と[専門店|せんもんてん|specialist shop]。おみやげ屋はスキップ
      - 友達に会う

[ ] 日本語
      - 文法を毎日すこしずつ。[体系的|たいけいてき|systematic]に、[厳|きび|strict]しく
      - output practice: 一日一文、声に出す
      - 聞けるのに話せないのは、まだ[途中|とちゅう|midway; still on the way]なだけ

[ ] osu!
      - aim の自信を[取|と|to take]り[戻|もど|to return]す
      - あの頃はマウスで出来てた。手はまだ覚えてる
      - 75mm。[手首|てくび|wrist]じゃなくて[腕|うで|arm]。たぶん

[ ] 黒の NB 1906 を見つける (チェリーじゃなくて黒)
[ ] CRT の reel を作る (シャッターは 1/60、忘れずに)
[x] RF しか入らない CRT を動かす   ← やった。ほんとにやった。

[ ] 疲れた日は、好きなものに[頼|たよ|to lean on; to rely on]っていい
[x] ここまで来た。   ← これはもう、チェック[済|ず|done; finished]み。
`;
}

export function todoTextEn() {
  return `todo.txt                                   ${osDate().str} (probably)

[ ] Finish CLANNAD
      - Misae's route, almost done
      - then After Story. buy tissues. by the box
      - no spoilers. none. ever.

[ ] 30 LPs
      - first pressings don't matter. condition > romance
      - so far: __ / 30

[ ] Go to Japan
      - second-hand record shops, specialist stores. skip the souvenir shops
      - see my friend

[ ] Japanese
      - a little grammar every day. systematically. strictly
      - output practice: one sentence a day, out loud
      - understanding but not speaking yet just means: still on the way

[ ] osu!
      - get the confidence back in my aim
      - I could do it with a mouse back then. the hand still remembers
      - 75mm. arm, not wrist. probably

[ ] Find the black NB 1906 (not the cherry. the black)
[ ] Make the CRT reel (shutter at 1/60, don't forget)
[x] Get the RF-only CRT working   <- did it. actually did it.

[ ] On tired days, it's okay to lean on the things you love
[x] Made it this far.   <- this one's already checked.
`;
}

export const README = String.raw`
           \              /
            \            /
      .------\----------/------------------.
      |  .--------------------------.  ()  |
      |  |                          |  ()  |
      |  |    ( R F   O N L Y )     |      |
      |  |   ~~~~~~~~~~~~~~~~~~~~   |  ==  |
      |  |     ch 3      NTSC-M     |  ==  |
      |  '--------------------------'  ==  |
      |   H I K A R I                      |
      '------------------------------------'
           ||                        ||

  CRT_project / README.txt
  "an RF-only TV, a modern laptop, and too much patience"
  last edited: 2004/10/02 (according to this computer)

  -- what this is -------------------------------------------
  An old CRT with exactly one input: the antenna jack.
  No composite. No S-Video. No SCART. Just RF, like 1986.
  Goal: make it a real extended display for a modern Mac,
  and play osu! on it. Because it looks right.

  -- signal chain -------------------------------------------

   [ MacBook ] --HDMI--> [ HDMI->AV ] --composite--> [ RF modulator ]
       |                                                  |  ch 3 / 4
   BetterDisplay                                         coax
   (low-res virtual screen,                               |
    EXTENDED, not mirrored)                     [ CRT : ANT IN ]

   (a VCR works as the modulator too: AV in, RF out.
    that's how this started.)

  -- the steps that actually mattered ----------------------
  1. Channel 3 or 4 on the modulator. Pick the one nothing
     broadcasts on. Nothing analog broadcasts here anymore,
     so: 3.
  2. NTSC vs PAL. Match the converter to what the set expects.
     Wrong system = rolling picture, grey colour, or both.
     NTSC-M worked.
  3. Manual tuning. Auto-scan found nothing. Fine-tune by hand,
     one notch at a time, until the snow becomes a desktop.
  4. BetterDisplay: a small virtual screen, set as an EXTENDED
     display. Big text. Big cursor.
  5. Overscan eats the edges. Leave margins. Accept it.

  -- filming it ---------------------------------------------
  Phone: S24 Ultra, Pro video, manual everything.
  The tube redraws at ~60 Hz (59.94). A fast shutter catches
  only part of a field -> a dark band rolls up the screen.
  Fix: shutter 1/60. One exposure = one whole field.
  Band gone.  (try it: flicker_lab.exe, in this folder)

  -- known issues -------------------------------------------
  - Text is soft. That's not a bug. That's the point.
  - Slight ghosting on ch 3. The coax has seen things.
  - It whines at 15.7 kHz. You stop hearing it. Mostly.

  -- status -------------------------------------------------
  [x] picture
  [x] colour
  [x] osu! on a 1980s television
  [ ] the reel

  It works. It actually works.
`;

export const TUNING = `date,ch,system,fine,result
10/01,2,NTSC-M,0,snow
10/01,3,NTSC-M,0,snow (a different snow?)
10/01,3,PAL-B/G,0,rolling. no colour
10/01,4,PAL-B/G,0,snow
10/02,3,NTSC-M,-3,a shape!!
10/02,3,NTSC-M,-5,the menu bar. it's the MENU BAR
10/02,3,NTSC-M,-6,desktop. colour. everything
10/02,3,NTSC-M,-6,osu! on it. sat here for an hour
`;

export const REEL = `reel_ideas.txt

- open on snow. tune in by hand. the picture arrives.
- osu! on the tube, shot at 1/60. no band.
- macro: the phosphor dots. a cursor made of light.
- the coax, slowly, like it's a movie.
- the hum, recorded, under everything.
- end: power off. the white dot in the middle. hold on it.
`;

export const NIHONGO = `日本語ノート — 文法 ([体系的|たいけいてき|systematic]に)

■ 〜ておく : [前|まえ|before]もって〜する
   ティッシュを買っておく。(After Story の前に)

■ 〜わけではない : 〜というわけじゃない
   [寂|さび|lonely]しいわけではない。ただ、静かなのが好き。

■ 〜ずにはいられない : どうしても〜してしまう
   古い CRT を見ると、つなげずにはいられない。

■ 〜ばかりか : 〜だけでなく
   [聞|き|to hear]き[取|と|to catch (by ear)]れるばかりか、最近はすこし話せるようになった。

■ 〜ものの : 〜けれども
   文法はわかったものの、口から出てこない。 → output practice!

今日の一文 (声に出す):
「好きなものの話をするときだけ、日本語がすこし[速|はや|fast]くなる。」
`;

export const NIHONGO_EN = `Japanese notes — grammar (systematically)

■ 〜ておく : to do something in advance
   ティッシュを買っておく。  (buy tissues ahead of time. before After Story)

■ 〜わけではない : it's not that ~
   寂しいわけではない。ただ、静かなのが好き。
   (it's not that I'm lonely. I just like the quiet.)

■ 〜ずにはいられない : can't help doing ~
   古い CRT を見ると、つなげずにはいられない。
   (when I see an old CRT, I can't help plugging it in.)

■ 〜ばかりか : not only ~ but also
   聞き取れるばかりか、最近はすこし話せるようになった。
   (not only can I follow it, lately I can speak a little.)

■ 〜ものの : although ~
   文法はわかったものの、口から出てこない。  -> output practice!
   (I understand the grammar, but it won't come out of my mouth.)

Today's sentence (say it out loud):
「好きなものの話をするときだけ、日本語がすこし速くなる。」
(only when I talk about the things I love does my Japanese get a little faster.)
`;

// The recycle bin, honestly.
export const BIN = [
  { name: 'generic_startup_template.html', icon: 'html', from: 'C:\\Projects', date: '2004/03/02', size: '12 KB',
    en: 'This template looked like every company. So it went in the bin.', note: 'このテンプレートは、どの[会社|かいしゃ|company]にも[見|み|to look (like)]えました。だから[捨|す|to throw away]てました。' },
  { name: 'summer_anime_but_too_cheerful.png', icon: 'png', from: 'C:\\マイ ピクチャ', enFrom: 'C:\\My Pictures', date: '2004/08/15', size: '820 KB',
    en: 'Too bright. Summer can be a little quieter than this.', note: '[明|あか|bright]るすぎました。[夏|なつ|summer]は、もうすこし[静|しず|quiet]かでいい。' },
  { name: 'flat_design_2013.psd', icon: 'psd', from: 'C:\\未来', enFrom: 'C:\\Future', date: '2013/06/10', size: '0 KB',
    en: 'A file that arrived from the future. It has no gloss.', note: '[未来|みらい|the future]から[届|とど|to arrive]いたファイルです。[光沢|こうたく|gloss; sheen]がありません。' },
  { name: 'random_saturated_palette.aco', icon: 'aco', from: 'C:\\Design', date: '2004/02/14', size: '2 KB',
    en: 'The colours had no reason to be there.', note: '[色|いろ|colour]に[理由|りゆう|reason]がありませんでした。' },
  { name: 'tiny_text_9px.css', icon: 'css', from: 'C:\\Design', date: '2004/02/14', size: '1 KB',
    en: 'Couldn\'t read it.', note: '[読|よ|to read]めませんでした。' },
  { name: 'dark_cyberpunk_wallpaper_4096.jpg', icon: 'jpg', from: 'C:\\WINDOWS\\Web', date: '2004/09/01', size: '2.1 MB',
    en: 'Purple and blue neon again? Not in the mood today.', note: 'また[紫|むらさき|purple]と[青|あお|blue]のネオン? [今日|きょう|today]はちがう[気分|きぶん|mood]です。' },
  { name: '観光地みやげ_キーホルダー.jpg', enName: 'tourist_souvenir_keychain.jpg', icon: 'jpg', from: 'C:\\旅行', enFrom: 'C:\\Travel', date: '2004/07/20', size: '96 KB',
    en: 'A second-hand record shop would have been better.', note: '[中古|ちゅうこ|second-hand]レコード[屋|や|shop]のほうがいい。' },
  { name: 'vague_answer.txt', icon: 'file', from: 'C:\\', date: '2004/05/11', size: '1 KB',
    en: '“It depends.”  <- Be specific.', note: '「[場合|ばあい|case; situation]によります。」 ← [具体的|ぐたいてき|concrete; specific]に。' },
  { name: 'self_pity_protagonist.wav', icon: 'wav', from: 'C:\\マイ ミュージック', enFrom: 'C:\\My Music', date: '2004/04/04', size: '3.3 MB',
    en: 'A protagonist who only stands still and laments. If you won\'t move, you go here.', note: '[立|た|to stand]ち[止|ど|to stop]まって[嘆|なげ|to lament]くだけの[主人公|しゅじんこう|protagonist]。[動|うご|to move]かないなら、ここへ。' },
  { name: 'spoilers.txt', icon: 'spoiler', from: 'C:\\', date: '2004/04/28', size: '4 KB', spoiler: true,
    note: '' },
];

export const ARTISTS = [
  ['OsamaSon', 'アンダーグラウンド ラップ', 100],
  ['岡田有希子', 'アイドル歌謡 · 1984–86', 93],
  ['大貫妙子', 'シティポップ', 78],
  ['Nine Vicious', 'アンダーグラウンド ラップ', 66],
  ['Che', 'アンダーグラウンド ラップ', 60],
  ['Nettspend', 'アンダーグラウンド ラップ', 55],
  ['早見優', 'アイドル歌謡', 51],
  ['中森明菜', '歌謡曲', 46],
  ['松田聖子', 'アイドル歌謡', 41],
  ['IVE', 'K-POP', 38],
  ['LE SSERAFIM', 'K-POP', 36],
  ['NewJeans', 'K-POP', 34],
  ['TWICE', 'K-POP', 31],
  ['aespa', 'K-POP', 29],
  ['Reol', 'J-POP / エレクトロ', 27],
  ['CY8ER', 'J-POP / エレクトロ', 24],
  ['SHE IS SUMMER', 'J-POP', 21],
  ['杏里', 'シティポップ', 18],
  ['菊池桃子', 'アイドル · シティポップ', 16],
];

export const GENRE_EN = {
  'アンダーグラウンド ラップ': 'Underground rap', 'アイドル歌謡 · 1984–86': 'Idol kayōkyoku · 1984–86', 'シティポップ': 'City pop',
  'アイドル歌謡': 'Idol kayōkyoku', '歌謡曲': 'Kayōkyoku', 'K-POP': 'K-pop', 'J-POP / エレクトロ': 'J-pop / electronic', 'J-POP': 'J-pop',
  'アイドル · シティポップ': 'Idol · city pop',
};
export const ARTIST_EN = { '岡田有希子': 'Yukiko Okada', '大貫妙子': 'Taeko Ohnuki', '早見優': 'Yu Hayami', '中森明菜': 'Akina Nakamori', '松田聖子': 'Seiko Matsuda', '杏里': 'Anri', '菊池桃子': 'Momoko Kikuchi' };
