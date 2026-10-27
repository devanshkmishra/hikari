// The stock of 夜光堂, a used-record shop in Ginza, on 27 October 1985.
// Every title, date, label, catalogue number, list price and track title below was checked
// against ja.wikipedia and Discogs. Nothing released after 27 Oct 1985 is in the bins.
// Sleeve art is NOT the real art: each `d` is a procedural design that only evokes a mood.
// Obi copy (`obi`) and the clerk's POP cards are original writing for this shop.

import { hashStr } from './util.js';

// d: sleeve design. k = archetype (see sleeves.js), c = palette, f = title font, t = title layout
export const RECORDS = [
  // ---------------------------------------------------------------- 岡田有希子
  { id: 'okada-cinderella', artist: '岡田有希子', en: 'Yukiko Okada', title: 'シンデレラ', date: '1984-09-05', label: 'Canyon', cat: 'C28A0361', price: 2800,
    A: ['さよなら・夏休み', 'リトル プリンセス', '彼はハリケーン', '丘の上のハイスクール', '潮風のラブ・レター'],
    B: ['風の中のカフェテラス', '憧れ', 'Plastic Girl', 'ソネット', 'ファースト・デイト'],
    bin: 0, okada: true, mix: ['tender', 'idol', 'tender', 'idol', 'ballad'], used: 1300, cond: ['A', 'A−'],
    d: { k: 'bokeh', c: ['#f6d9e3', '#e8b8cf', '#fff7f0', '#c98aa9'], f: 'serif', t: 'bottom' },
    obi: '[初|はじ|first]めてのアルバムには、[初|はじ|first]めての[季節|きせつ|season]が[全部|ぜんぶ|all]入っている。',
    pop: { head: 'デビュー[曲|きょく|song]、入ってます', body: '『ファースト・デイト』は[竹内|たけうち|Takeuchi]まりやさんの[作詞|さくし|lyrics]・[作曲|さっきょく|music]。B[面|めん|side]の[最後|さいご|last]です。', color: '#c0304a' } },
  { id: 'okada-fairy', artist: '岡田有希子', en: 'Yukiko Okada', title: 'FAIRY', date: '1985-03-21', label: 'Canyon', cat: 'C28A0400', price: 2800,
    A: ['風の魔法で…', 'Walking In The Moonlight', '目をさまして、Darling', '二人だけのセレモニー', '森のフェアリー'],
    B: ['おしゃれな雨音', 'ストライプのジェラシー', 'Lady Joker', 'あなたを忘れる魔法があれば', 'ポップ・アップ・リセエンヌ'],
    bin: 0, okada: true, mix: ['tender', 'idol', 'euro', 'tender', 'idol'], used: 1500, cond: ['A', 'A'],
    d: { k: 'mist', c: ['#cfe8df', '#b7c9ea', '#f4f1fb', '#7f8fc4'], f: 'serif-i', t: 'center' },
    obi: '[魔法|まほう|magic]は、[雨|あめ|rain]の[音|おと|sound]がするところに[住|す|to live]んでいる。',
    pop: { head: '[昨年|さくねん|last year]の[新人賞|しんじんしょう|best new artist award]', body: 'レコード[大賞|たいしょう|grand prize]の[最優秀新人賞|さいゆうしゅうしんじんしょう|Best New Artist]。[当然|とうぜん|naturally; of course]だと[思|おも|to think]います。', color: '#2f5fa8' } },
  { id: 'okada-ningyo', artist: '岡田有希子', en: 'Yukiko Okada', title: '十月の人魚', date: '1985-09-18', label: 'Canyon', cat: 'C28A0435', price: 2800,
    A: ['Sweet Planet', 'みずうみ', '花鳥図', '哀しい予感', 'ロンサム・シーズン'],
    B: ['流星の高原', 'Bien', 'ペナルティ', '十月の人魚', '水色プリンセス -水の精-'],
    bin: 0, okada: true, promo: true, mix: ['tender', 'ballad', 'tender', 'euro', 'tender'], used: 1800, cond: ['A', 'A'],
    d: { k: 'horizon', c: ['#13253a', '#3c6f86', '#d9c7a4', '#0b1626'], f: 'mincho', t: 'vertical', orb: 'moon' },
    obi: '十月の[海|うみ|sea]は、まだ[少|すこ|a little]しだけ[夏|なつ|summer]を[覚|おぼ|to remember]えている。',
    pop: { head: '[閉店後|へいてんご|after closing]の[一枚|いちまい|one record]', body: 'この[一枚|いちまい|one record]を[最後|さいご|the end]までかけるのが、[私|わたし|I]の[習慣|しゅうかん|habit]です。[声|こえ|voice]が、まっすぐ[届|とど|to reach]くんです。', color: '#1d1d1d' } },

  // ---------------------------------------------------------------- 荻野目洋子
  { id: 'oginome-teens', artist: '荻野目洋子', en: 'Yoko Oginome', title: 'ティーンズ・ロマンス', date: '1984-09-05', label: 'Victor', cat: 'SJX-30241', price: 2800,
    A: ['未来航海 －Sailing－', 'サファイア色のプレリュード', '夏の微笑', '十月物語', '悲しみプレゼント'],
    B: ['さよならから始まる物語', '星空夜曲（プラネット・ノクターン）', '流星少女', '虹色シンドローム', 'ティーンズ・ロマンス'],
    bin: 0, mix: ['idol', 'tender', 'idol'], used: 900, cond: ['B+', 'A−'],
    d: { k: 'geo', c: ['#ffe36b', '#3fb6e8', '#ff5a8a', '#ffffff'], f: 'round', t: 'top' },
    obi: '[十六歳|じゅうろくさい|sixteen years old]の[地図|ちず|map]には、まだ[名前|なまえ|name]のない[海|うみ|sea]がある。' },
  { id: 'oginome-freesia', artist: '荻野目洋子', en: 'Yoko Oginome', title: 'フリージアの雨', date: '1985-03-05', label: 'Victor', cat: 'SJX-30261', price: 2800,
    A: ['入江に帰るヨットのように', 'フリージアの雨', '無国籍ロマンス', '想い出のジューク・ボックス', 'マイ キャサリン'],
    B: ['Bの噂', '彼と彼女とひこうき雲', 'ポインセチアの想い', '雨とジャスミン', '雨のメモリー'],
    bin: 0, mix: ['tender', 'idol', 'ballad'], used: 1000, cond: ['A', 'B+'],
    d: { k: 'rain', c: ['#f3e7a0', '#9fb9c9', '#fffbe8', '#e4b93c'], f: 'serif', t: 'top' },
    obi: '[黄色|きいろ|yellow]い[花|はな|flower]の[匂|にお|scent]いがする[雨|あめ|rain]を、[知|し|to know]っていますか。' },

  // ---------------------------------------------------------------- 菊池桃子
  { id: 'kikuchi-oceanside', artist: '菊池桃子', en: 'Momoko Kikuchi', title: 'OCEAN SIDE', date: '1984-09-10', label: 'VAP', cat: '30152-28', price: 2800,
    A: ['OCEAN SIDE', 'SHADOW SURFER', 'BLIND CURVE', 'SUMMER EYES', 'FUTARI NO NIGHT DIVE'],
    B: ['青春のいじわる', 'EVENING BREAK', 'SO MANY DREAMS', 'I WILL'], sides: ['OCEAN SIDE', 'YOUR SIDE'],
    bin: 0, mix: ['citypop', 'tender', 'citypop'], used: 1200, cond: ['A', 'A'],
    d: { k: 'pool', c: ['#7fd3e6', '#e9f7fb', '#1f7fa8', '#ffb38a'], f: 'grotesk', t: 'bottom' },
    obi: '[波|なみ|wave]の[音|おと|sound]は、いつも[少|すこ|a little]し[遅|おく|to be late]れて[届|とど|to arrive]く。' },
  { id: 'kikuchi-tropic', artist: '菊池桃子', en: 'Momoko Kikuchi', title: 'TROPIC of CAPRICORN 〜南回帰線〜', short: 'TROPIC of CAPRICORN', date: '1985-09-10', label: 'VAP', cat: '30168-28', price: 2800,
    A: ['卒業', 'カレンダーにイニシャル', '恋のProjection', '真夏のSequence', 'Dear Children'],
    B: ['Boy Friend', 'Southern Cross Dreaming', 'Alfa Flight', '愛のSurf Break', '南回帰線'],
    bin: 0, mix: ['citypop', 'mellow', 'tender'], used: 1500, cond: ['A', 'A'],
    d: { k: 'stars', c: ['#0d1a3a', '#6a3d7a', '#f0a96a', '#fff3c8'], f: 'grotesk', t: 'top' },
    obi: '[南|みなみ|south]の[空|そら|sky]の[十字|じゅうじ|cross]は、[帰|かえ|to return]り[道|みち|road]を[知|し|to know]っている。',
    pop: { head: '[南回帰線|みなみかいきせん|Tropic of Capricorn]', body: '[行|い|to go]ったことはないけど、ここにあります。A[面|めん|side]から[順番|じゅんばん|in order]にどうぞ。', color: '#2e6b4f' } },

  // ---------------------------------------------------------------- 斉藤由貴
  { id: 'saito-axia', artist: '斉藤由貴', en: 'Yuki Saito', title: 'AXIA', date: '1985-06-21', label: 'Canyon', cat: 'C28A0416', price: 2800,
    A: ['卒業', '石鹸色の夏', '青春', 'フィナーレの風', 'AXIA 〜かなしいことり〜'],
    B: ['白い炎', '上級生', '手のひらの気球船', '感傷ロマンス', '雨のロードショー'],
    bin: 0, mix: ['tender', 'ballad', 'euro'], used: 1100, cond: ['A', 'A−'],
    d: { k: 'paperwhite', c: ['#f4f2ec', '#9db7cf', '#2c3e57', '#d8d2c2'], f: 'serif', t: 'small' },
    obi: '[制服|せいふく|school uniform]の[袖|そで|sleeve]に、[春|はる|spring]の[光|ひかり|light]が[残|のこ|to remain]っている。',
    pop: { head: 'A[面|めん|side]1[曲目|きょくめ|track]は『[卒業|そつぎょう|graduation]』', body: '[春|はる|spring]まで[待|ま|to wait]たなくていいです。', color: '#3a5f8f' } },

  // ---------------------------------------------------------------- 中森明菜
  { id: 'akina-prologue', artist: '中森明菜', en: 'Akina Nakamori', title: 'プロローグ〈序幕〉', short: 'プロローグ', date: '1982-07-01', label: 'Warner-Pioneer', cat: 'L-12531', price: 2800,
    A: ['あなたのポートレート', 'Bon Voyage', 'イマージュの翳り', '条件反射', 'Tシャツ・サンセット'],
    B: ['銀河伝説', 'スローモーション', 'A型メランコリー', 'ひとかけらのエメラルド', 'ダウンタウンすと〜り〜'],
    bin: 0, mix: ['ballad', 'idol', 'tender'], used: 1000, cond: ['B+', 'B'],
    d: { k: 'curtain', c: ['#1c1a1f', '#7c1d2b', '#e9e1d4', '#3d3540'], f: 'mincho', t: 'vertical' },
    obi: '[幕|まく|curtain]が[上|あ|to rise]がる[前|まえ|before]の、[一番|いちばん|most][静|しず|quiet]かな[一秒|いちびょう|one second]。',
    pop: { head: 'B[面|めん|side]2[曲目|きょくめ|track]『スローモーション』', body: '[明菜|あきな|Akina]さんのデビュー[曲|きょく|song]。この[曲|きょく|song]をスタ[誕|たん|(Star Tanjō)]の[決戦大会|けっせんたいかい|the final round]で[歌|うた|to sing]った[女|おんな|girl]の[子|こ|child]が、いま[同|おな|same]じエサ[箱|ばこ|bin]の[一番前|いちばんまえ|very front]にいます。', color: '#7c1d2b' } },
  { id: 'akina-variation', artist: '中森明菜', en: 'Akina Nakamori', title: 'バリエーション〈変奏曲〉', short: 'バリエーション', date: '1982-10-27', label: 'Warner-Pioneer', cat: 'L-12550', price: 2800,
    A: ['（イントロダクション）', 'キャンセル！', '脆い午後', '哀愁魔術（マジック）', '咲きほこる花に……', 'ヨコハマA・KU・MA'],
    B: ['メルヘン・ロケーション', '少女A', '第七感（セッティエーム・サンス）', 'X³（バイバイ）ララバイ', 'カタストロフィの雨傘', '（エンディング）'],
    bin: 0, mix: ['citypop', 'ballad', 'idol'], used: 1100, cond: ['A−', 'B+'],
    d: { k: 'staff', c: ['#efe9dd', '#141414', '#c4252b', '#8a8172'], f: 'mincho', t: 'top' },
    obi: '[同|おな|same]じ[旋律|せんりつ|melody]を、[三|さん|three]つの[顔|かお|face]で[歌|うた|to sing]う。' },
  { id: 'akina-possibility', artist: '中森明菜', en: 'Akina Nakamori', title: 'POSSIBILITY', date: '1984-10-10', label: 'Warner-Pioneer', cat: 'L-12592', price: 2800,
    A: ['サザン・ウインド', '秋はパステルタッチ', 'October storm ―十月の嵐―', 'リ・フ・レ・イ・ン', '地平線（ホライゾン）'],
    B: ['哀愁のMidnight', '十戒 (1984)', '白い迷い（ラビリンス）', 'Blue Misty Rain', 'ドラマティック・エアポート ―北ウイング Part II―'],
    bin: 0, mix: ['citypop', 'ballad', 'citypop'], used: 1200, cond: ['A', 'A−'],
    d: { k: 'sky', c: ['#2a4f8f', '#a9c7e6', '#f6efe3', '#e2603c'], f: 'grotesk', t: 'bottom' },
    obi: '[北|きた|north]ウイングの[向|む|beyond]こうにも、まだ[空|そら|sky]は[続|つづ|to continue]いている。' },
  { id: 'akina-bitter', artist: '中森明菜', en: 'Akina Nakamori', title: 'BITTER AND SWEET', date: '1985-04-03', label: 'Warner-Pioneer', cat: 'L-12593', price: 2800,
    A: ['飾りじゃないのよ涙は', 'ロマンティックな夜だわ', '予感', '月夜のヴィーナス', 'BABYLON'],
    B: ['UNSTEADY LOVE', 'DREAMING', '恋人のいる時間', 'SO LONG', 'APRIL STARS'],
    bin: 0, mix: ['citypop', 'ballad', 'mellow'], used: 1300, cond: ['A', 'A'],
    d: { k: 'split', c: ['#3b2318', '#f2b6c2', '#f7efe6', '#b8913a'], f: 'grotesk', t: 'center' },
    obi: '[苦|にが|bitter]いのが[先|さき|first]か、[甘|あま|sweet]いのが[先|さき|first]か。' },
  { id: 'akina-d404me', artist: '中森明菜', en: 'Akina Nakamori', title: 'D404ME', date: '1985-08-10', label: 'Warner-Pioneer', cat: 'L-12594', price: 2800,
    A: ['ENDLESS', 'ノクターン', 'アレグロ・ビヴァーチェ', '悲しい浪漫西（ロマンス）', 'ピ・ア・ス'],
    B: ['BLUE OCEAN', 'マグネティック・ラヴ', 'STAR PILOT', 'モナリザ', 'ミ・アモーレ〔Meu amor é･･･〕'],
    bin: 0, mix: ['citypop', 'ballad', 'idol'], used: 1500, cond: ['A', 'A'],
    d: { k: 'grid', c: ['#0b0f1e', '#3fd0ff', '#ff3d7f', '#d9e2ff'], f: 'grotesk', t: 'top' },
    obi: '[暗号|あんごう|cipher]を[解|と|to solve]くと、[夏|なつ|summer]の[終|お|to end]わりが[出|で|to come out]てくる。',
    pop: { head: '『ミ・アモーレ』[入|はい|to be included]り', body: '[今年|ことし|this year]の[夏|なつ|summer]は、これでした。B[面|めん|side]の[最後|さいご|last]。', color: '#b0244e' } },

  // ---------------------------------------------------------------- 早見優
  { id: 'hayami-andiloveyou', artist: '早見優', en: 'Yu Hayami', title: 'AND I LOVE YOU', date: '1982-06-21', label: 'Taurus', cat: '28TR-2008', price: 2800,
    A: ['I Love, who?', '太陽の恋人', 'ゴンドラ・ムーン', '青いSea Side', 'サテン サンバ72☆', '素敵なRAIN DROPS'],
    B: ['急いで!初恋', '私を見つめて…', 'ハニーな昼下り', 'LOVE-LIGHT', 'ALL MY LOVE'],
    bin: 1, mix: ['idol', 'tender', 'idol'], used: 900, cond: ['B+', 'B+'],
    d: { k: 'stripes', c: ['#ff8fa3', '#fff1e0', '#5bc0d8', '#ffd25e'], f: 'round', t: 'center' },
    obi: '[初恋|はつこい|first love]は、いつも[少|すこ|a little]し[急|いそ|to hurry]ぎすぎる。' },
  { id: 'hayami-lanai', artist: '早見優', en: 'Yu Hayami', title: 'LANAI', date: '1983-05-01', label: 'Taurus', cat: '28TR-2020', price: 2800,
    A: ['逢いたい気分', 'Sail In The Sunset', 'Summer Holy Night', 'ロコ・サーファー', 'Someone’s Boy'],
    B: ['Rainy Boy', 'Still Remember You', 'You’re So Shy', 'オレンジ・ムーンの恋', 'Cover The Moon -月よ見ないで-'],
    bin: 1, mix: ['citypop', 'tender', 'idol'], used: 1000, cond: ['A', 'A−'],
    d: { k: 'palm', c: ['#f4d9b0', '#d9824a', '#5f3b2a', '#9cc7c2'], f: 'serif-i', t: 'bottom' },
    obi: '[午後|ごご|afternoon]のベランダに、[葉|は|leaf]っぱの[影|かげ|shadow]が[揺|ゆ|to sway]れている。' },
  { id: 'hayami-colorful', artist: '早見優', en: 'Yu Hayami', title: 'COLORFUL BOX', date: '1983-11-21', label: 'Taurus', cat: '28TR-2030', price: 2800,
    A: ['もう一度 Hello', 'Luna（ルーナ）', 'AZIES', 'St. Amien', 'Stardust Night'],
    B: ['AFTERLIGHT', 'Pink Shock', '白い水平線', 'Teenage Blue', '海辺のクリスマス'],
    bin: 1, mix: ['idol', 'citypop', 'tender'], used: 1000, cond: ['A', 'B+'],
    d: { k: 'memphis', c: ['#fff4d6', '#ff5f7e', '#2bb3c0', '#ffcf3f'], f: 'round', t: 'top' },
    obi: '[開|あ|to open]けるたびに、[違|ちが|different]う[色|いろ|colour]が[出|で|to come out]てくる[箱|はこ|box]。' },

  // ---------------------------------------------------------------- 松田聖子
  { id: 'seiko-kazetachinu', artist: '松田聖子', en: 'Seiko Matsuda', title: '風立ちぬ', date: '1981-10-21', label: 'CBS/Sony', cat: '28AH 1337', price: 2800,
    A: ['冬の妖精', 'ガラスの入江', '一千一秒物語', 'いちご畑でつかまえて', '風立ちぬ'],
    B: ['流星ナイト', '黄昏はオレンジ・ライム', '白いパラソル', '雨のリゾート', 'December Morning'],
    bin: 1, mix: ['tender', 'euro', 'idol'], used: 900, cond: ['A−', 'B+'],
    d: { k: 'wind', c: ['#e9d3a1', '#b9894a', '#fbf4e4', '#6d7f5a'], f: 'mincho', t: 'vertical' },
    obi: '[秋|あき|autumn]の[風|かぜ|wind]が、[帽子|ぼうし|hat]を[少|すこ|a little]しだけ[持|も|to hold]ち[上|あ|to lift]げる。' },
  { id: 'seiko-pineapple', artist: '松田聖子', en: 'Seiko Matsuda', title: 'Pineapple', date: '1982-05-21', label: 'CBS/Sony', cat: '28AH 1432', price: 2800,
    A: ['P・R・E・S・E・N・T', 'パイナップル・アイランド', 'ひまわりの丘', 'LOVE SONG', '渚のバルコニー'],
    B: ['ピンクのスクーター', 'レモネードの夏', '赤いスイートピー', '水色の朝', 'SUNSET BEACH'], sides: ['Pineapple Side', 'Orange Side'],
    bin: 1, mix: ['idol', 'citypop', 'tender'], used: 900, cond: ['A', 'A−'],
    d: { k: 'tropic', c: ['#ffd84a', '#2f9e6a', '#fff8dc', '#ff8a3c'], f: 'serif-i', t: 'top' },
    obi: '[夏|なつ|summer]の[果物|くだもの|fruit]は、[切|き|to cut]った[瞬間|しゅんかん|moment]がいちばん[甘|あま|sweet]い。' },
  { id: 'seiko-utopia', artist: '松田聖子', en: 'Seiko Matsuda', title: 'ユートピア', date: '1983-06-01', label: 'CBS/Sony', cat: '28AH 1528', price: 2800,
    A: ['ピーチ・シャーベット', 'マイアミ午前5時', 'セイシェルの夕陽', '小さなラブソング', '天国のキッス'],
    B: ['ハートをRock', 'Bye-bye playboy', '赤い靴のバレリーナ', '秘密の花園', 'メディテーション'], sides: ['blue-island side', 'south-wind side'],
    bin: 1, mix: ['citypop', 'idol', 'tender'], used: 1000, cond: ['A', 'A'],
    d: { k: 'horizon', c: ['#ff9f7a', '#ffd9b0', '#2d7fa3', '#ffeedd'], f: 'serif', t: 'top', orb: 'sun' },
    obi: '[地図|ちず|map]にない[島|しま|island]の、[午前五時|ごぜんごじ|5 a.m.]の[色|いろ|colour]。' },
  { id: 'seiko-canary', artist: '松田聖子', en: 'Seiko Matsuda', title: 'Canary', date: '1983-12-10', label: 'CBS/Sony', cat: '28AH 1666', price: 2800,
    A: ['BITTER SWEET LOLLIPOPS', 'Canary', 'Private School', 'Misty', 'Diamond Eyes'],
    B: ['LET\'S BOYHUNT', 'Wing', 'Party\'s Queen', 'Photograph of Yesterdays', 'Silvery Moonlight'],
    bin: 1, mix: ['idol', 'tender', 'citypop'], used: 1000, cond: ['A−', 'A−'],
    d: { k: 'type', c: ['#f6d33c', '#232323', '#fffbea', '#e05a3a'], f: 'serif', t: 'huge' },
    obi: '[鳥籠|とりかご|birdcage]の[扉|とびら|door]は、[最初|さいしょ|from the start]から[開|あ|to open]いていた。' },
  { id: 'seiko-9thwave', artist: '松田聖子', en: 'Seiko Matsuda', title: 'The 9th Wave', date: '1985-06-05', label: 'CBS/Sony', cat: '28AH 1880', price: 2800,
    A: ['Vacancy', '夏のジュエリー', 'ボーイの季節', '両手のなかの海', 'す・ず・し・い・あ・な・た'],
    B: ['星空のストーリー', 'さざなみウェディングロード', '天使のウィンク', 'ティーン・エイジ', '夏の幻影（シーン）'],
    bin: 1, mix: ['citypop', 'tender', 'idol'], used: 1400, cond: ['A', 'A'],
    d: { k: 'waves', c: ['#0f4c6b', '#7ccbd9', '#eaf6f4', '#f2c46d'], f: 'serif-i', t: 'bottom' },
    obi: '[九番目|きゅうばんめ|the ninth]の[波|なみ|wave]が、いちばん[遠|とお|far]くまで[来|く|to come]る。' },

  // ---------------------------------------------------------------- 大貫妙子
  { id: 'ohnuki-sunshower', artist: '大貫妙子', en: 'Taeko Ohnuki', title: 'SUNSHOWER', date: '1977-07-25', label: 'Panam / Crown', cat: 'GW-4029', price: 2300,
    A: ['Summer Connection', 'くすりをたくさん', '何もいらない', '都会', 'からっぽの椅子'],
    B: ['Law Of Nature', '誰のために', 'Silent Screamer', 'Sargasso Sea', '振子の山羊'],
    bin: 2, mix: ['mellow', 'citypop', 'mellow'], used: 1600, cond: ['A−', 'B+'],
    d: { k: 'sunrain', c: ['#f2c14e', '#e9e4d0', '#8a6d3b', '#6f8fa3'], f: 'grotesk', t: 'top' },
    obi: '[晴|は|clear]れているのに[降|ふ|to fall]る[雨|あめ|rain]を、[狐|きつね|fox]の[嫁入|よめい|wedding]りと[呼|よ|to call]ぶ。',
    pop: { head: '[雨|あめ|rain]の[日|ひ|day]の[午後|ごご|afternoon]に', body: '[針|はり|needle]を[落|お|to drop]としたら、[窓|まど|window]を[少|すこ|a little]し[開|あ|to open]けてください。', color: '#8a5a12' } },
  { id: 'ohnuki-mignonne', artist: '大貫妙子', en: 'Taeko Ohnuki', title: 'MIGNONNE', date: '1978-09-21', label: 'RCA / RVC', cat: 'RVL-8035', price: 2500,
    A: ['じゃじゃ馬娘', '横顔', '黄昏れ', '空をとべたら', '風のオルガン'],
    B: ['言いだせなくて', '4:00A.M.', '突然の贈りもの', '海と少年', 'あこがれ'],
    bin: 2, mix: ['mellow', 'citypop', 'tender'], used: 1400, cond: ['A', 'A−'],
    d: { k: 'type', c: ['#f3d6d0', '#4a3a3a', '#fffaf5', '#c97b6b'], f: 'serif', t: 'small' },
    obi: '[午前四時|ごぜんよじ|4 a.m.]の[部屋|へや|room]で、[横顔|よこがお|profile]だけが[起|お|to be awake]きている。' },
  { id: 'ohnuki-romantique', artist: '大貫妙子', en: 'Taeko Ohnuki', title: 'ROMANTIQUE', date: '1980-07-21', label: 'RCA / RVC', cat: 'RVL-8049', price: 2500,
    A: ['CARNAVAL', 'ディケイド・ナイト', '雨の夜明け', '若き日の望楼', 'BOHEMIAN'],
    B: ['果てなき旅情', 'ふたり', '軽蔑', '新しいシャツ', '蜃気楼の街'],
    bin: 2, mix: ['euro', 'euro', 'mellow'], used: 1500, cond: ['A', 'A'],
    d: { k: 'deco', c: ['#e8dcc4', '#5b4636', '#a8873e', '#2c2622'], f: 'serif', t: 'center' },
    obi: 'パリの[雨|あめ|rain]は、[東京|とうきょう|Tokyo]の[雨|あめ|rain]より[少|すこ|a little]し[古|ふる|old]い。' },
  { id: 'ohnuki-aventure', artist: '大貫妙子', en: 'Taeko Ohnuki', title: 'AVENTURE', date: '1981-05-21', label: 'RCA / RVC', cat: 'RHL-8507', price: 2700,
    A: ['恋人達の明日', 'Samba de mar', '愛の行方', 'アヴァンチュリエール', 'テルミネ'],
    B: ['チャンス', 'グランプリ', 'La mer, le ciel', 'ブリーカー・ストリートの青春', '最後の日付'],
    bin: 2, mix: ['euro', 'euro', 'citypop'], used: 1500, cond: ['A−', 'A'],
    d: { k: 'map', c: ['#d9d3c0', '#2f4f63', '#b3452f', '#f2eee2'], f: 'serif-i', t: 'top' },
    obi: '[切符|きっぷ|ticket]は[片道|かたみち|one way]。[帰|かえ|to return]りの[日付|ひづけ|date]は、まだ[白紙|はくし|blank]。',
    pop: { head: '[旅|たび|journey]のレコード', body: 'ヨーロッパに[行|い|to go]ったことがなくても、これで[行|い|to go]けます。', color: '#2f4f63' } },
  { id: 'ohnuki-cliche', artist: '大貫妙子', en: 'Taeko Ohnuki', title: 'Cliché', date: '1982-09-21', label: 'RCA / RVC', cat: 'RHL-8807', price: 2800,
    A: ['黒のクレール', '色彩都市', 'ピーターラビットとわたし', 'LABYRINTH', '風の道'],
    B: ['光のカーニバル', 'つむじかぜ〈tourbillion〉', '憶ひ出〈mémoire〉', '夏色の服', '黒のクレール (reprise)'],
    bin: 2, mix: ['euro', 'mellow', 'euro'], used: 1600, cond: ['A', 'A'],
    d: { k: 'noir', c: ['#121212', '#ece6da', '#b3262c', '#6b6660'], f: 'serif', t: 'bottom' },
    obi: '[黒|くろ|black]い[服|ふく|clothes]の[人|ひと|person]だけが、[色|いろ|colour]の[名前|なまえ|name]を[知|し|to know]っている。' },

  // ---------------------------------------------------------------- 杏里
  { id: 'anri-bikini', artist: '杏里', en: 'Anri', title: 'Bi・Ki・Ni', date: '1983-06-05', label: 'For Life', cat: '28K-48', price: 2800,
    A: ['Good Bye Boogie Dance', 'Dancin\' Blue', 'September Walkin\'', 'Lady Sunshine', 'Yes I\'m In Love'],
    B: ['Surf City', 'Just Be Yourself', 'Beach Boy In My Heart', 'Summer Focus', 'Affection'], sides: ['Disco Side', 'Sea Side'],
    bin: 2, mix: ['citypop', 'citypop', 'mellow'], used: 1100, cond: ['A', 'B+'],
    d: { k: 'pool', c: ['#ffb7a1', '#fff3e6', '#2aa6b8', '#ff6f61'], f: 'script', t: 'center' },
    obi: '[九月|くがつ|September]の[砂浜|すなはま|beach]は、[足跡|あしあと|footprints]がよく[残|のこ|to remain]る。' },
  { id: 'anri-timely', artist: '杏里', en: 'Anri', title: 'Timely!!', date: '1983-12-05', label: 'For Life', cat: '28K-63', price: 2800,
    A: ['CAT\'S EYE (NEW TAKE)', 'WINDY SUMMER', 'STAY BY ME', 'A HOPE FROM SAD STREET', 'YOU ARE NOT ALONE'],
    B: ['悲しみがとまらない I CAN\'T STOP THE LONELINESS', 'SHYNESS BOY', 'LOST LOVE IN THE RAIN', 'DRIVING MY LOVE', 'GOOD-NIGHT FOR YOU'],
    bin: 2, mix: ['citypop', 'citypop', 'mellow'], used: 1300, cond: ['A', 'A'],
    d: { k: 'night', c: ['#120d2a', '#ff4fa3', '#47e0ff', '#ffd36b'], f: 'script', t: 'top' },
    obi: '[真夜中|まよなか|midnight]の[高速|こうそく|expressway]は、[誰|だれ|anyone]かの[秘密|ひみつ|secret]に[似|に|to resemble]ている。' },
  { id: 'anri-coool', artist: '杏里', en: 'Anri', title: 'COOOL', date: '1984-06-21', label: 'For Life', cat: '28K-70', price: 2800,
    A: ['BRING ME TO THE DANCENIGHT', 'GONE WITH THE SADNESS', 'KIMAMANI REFLECTION', 'I CAN\'T EVER CHANGE YOUR LOVE FOR ME', 'SILLY CITY GIRL', 'MORNING HIGHWAY'],
    B: ['SURPRISE OF SUMMER', 'FLASHIN\' NIGHT', 'MERCURY LAMP 水銀燈', 'HE\'S MY MUSIC', 'MAUI'],
    bin: 2, mix: ['citypop', 'mellow', 'citypop'], used: 1300, cond: ['A−', 'A'],
    d: { k: 'ice', c: ['#bfe7f2', '#f7fbff', '#3a6fa8', '#8fd0e0'], f: 'grotesk', t: 'huge' },
    obi: '[水銀灯|すいぎんとう|mercury-vapour lamp]の[下|した|under]では、[誰|だれ|everyone]もが[少|すこ|a little]し[青|あお|blue]い。' },

  // ---------------------------------------------------------------- city pop
  { id: 'yamashita-foryou', artist: '山下達郎', en: 'Tatsuro Yamashita', title: 'FOR YOU', date: '1982-01-21', label: 'AIR / RVC', cat: 'RAL-8801', price: 2800,
    A: ['SPARKLE', 'MUSIC BOOK', 'INTERLUDE A Part I', 'MORNING GLORY', 'INTERLUDE A Part II', 'FUTARI'],
    B: ['LOVELAND, ISLAND', 'INTERLUDE B Part I', 'LOVE TALKIN\' (Honey It\'s You)', 'HEY REPORTER!', 'INTERLUDE B Part II', 'YOUR EYES'],
    bin: 2, mix: ['citypop', 'citypop', 'mellow'], used: 1500, cond: ['A', 'A−'],
    d: { k: 'road', c: ['#1f6fb2', '#ff9d6b', '#ffe3b3', '#1b2a44'], f: 'grotesk', t: 'top' },
    obi: '[夏|なつ|summer]が[終|お|to end]わっても、このレコードの[中|なか|inside]だけは[終|お|to end]わらない。',
    pop: { head: '[一枚目|いちまいめ|first one]なら、これ', body: 'A[面|めん|side]1[曲目|きょくめ|track]のギターで、[部屋|へや|room]の[温度|おんど|temperature]が[二度|にど|two degrees][上|あ|to rise]がります。', color: '#1f6fb2' } },
  { id: 'takeuchi-variety', artist: '竹内まりや', en: 'Mariya Takeuchi', title: 'VARIETY', date: '1984-04-25', label: 'MOON / Alfa Moon', cat: 'MOON-28018', price: 2800,
    A: ['もう一度', 'プラスティック・ラブ', '本気でオンリーユー (Let\'s Get Married)', 'ONE NIGHT STAND', 'BROKEN HEART'],
    B: ['アンフィシアターの夜', 'とどかぬ想い', 'マージービートで唄わせて', '水とあなたと太陽と', 'ふたりはステディ', 'シェットランドに頬をうずめて'],
    bin: 2, mix: ['citypop', 'tender', 'mellow'], used: 1200, cond: ['A', 'A'],
    d: { k: 'variety', c: ['#f04e45', '#2a9d8f', '#f4d35e', '#fdf6ec'], f: 'grotesk', t: 'bottom' },
    obi: '[明|あか|bright]るい[曲|きょく|song]ほど、[夜|よる|night]に[聴|き|to listen]くと[少|すこ|a little]し[寂|さび|lonely]しい。',
    pop: { head: 'つながってます', body: '[岡田有希子|おかだゆきこ|Yukiko Okada]さんの『ファースト・デイト』を[書|か|to write]いた[人|ひと|person]の、アルバムです。', color: '#d23a33' } },
  { id: 'ohtaki-longvacation', artist: '大滝詠一', en: 'Eiichi Ohtaki', title: 'A LONG VACATION', date: '1981-03-21', label: 'Niagara / CBS/Sony', cat: '27AH 1234', price: 2700,
    A: ['君は天然色', 'Velvet Motel', 'カナリア諸島にて', 'Pap-pi-doo-bi-doo-ba物語（ストーリー）', '我が心のピンボール'],
    B: ['雨のウェンズデイ', 'スピーチ・バルーン', '恋するカレン', 'FUN×4', 'さらばシベリア鉄道'],
    bin: 2, mix: ['tender', 'mellow', 'idol'], used: 1000, cond: ['A−', 'B+'],
    d: { k: 'sail', c: ['#6fc3df', '#fff6dc', '#f26b3a', '#1c4e80'], f: 'serif-i', t: 'bottom' },
    obi: '[長|なが|long]い[休暇|きゅうか|vacation]の[最後|さいご|last]の[日|ひ|day]は、なぜかいつも[晴|は|clear]れている。' },
  { id: 'matsubara-pocketpark', artist: '松原みき', en: 'Miki Matsubara', title: 'POCKET PARK', date: '1980-01-21', label: 'SEE・SAW / Canyon', cat: 'C25A0077', price: 2500,
    A: ['真夜中のドア〜Stay With Me', 'It\'s So Creamy', 'Cryin\'', 'That\'s All', 'His Woman'],
    B: ['Manhattan Wind', '愛はエネルギー', 'そうして私が', 'Trouble Maker', 'Mind Game', '偽りのない日々'],
    bin: 2, mix: ['citypop', 'mellow', 'citypop'], used: 1200, cond: ['A', 'A−'],
    d: { k: 'lamp', c: ['#0e1426', '#ffb35a', '#3a4a6b', '#f7e7c8'], f: 'serif', t: 'top' },
    obi: 'ビルの[谷間|たにま|gap between buildings]の[小|ちい|small]さな[公園|こうえん|park]に、[街灯|がいとう|street lamp]がひとつ。',
    pop: { head: 'A[面|めん|side]1[曲目|きょくめ|track]', body: '[夜中|よなか|middle of the night]に[聴|き|to listen]くと、ドアの[向|む|beyond]こうが[気|き|mind]になります。', color: '#3a4a6b' } },
  { id: 'sugarbabe-songs', artist: 'シュガー・ベイブ', en: 'Sugar Babe', title: 'SONGS', date: '1975-04-25', label: 'Niagara / Elec', cat: 'NAL-0001', price: 2300,
    A: ['SHOW', 'DOWN TOWN', '蜃気楼の街', '風の世界', 'ためいきばかり'],
    B: ['いつも通り', 'すてきなメロディー', '今日はなんだか', '雨は手のひらにいっぱい', '過ぎ去りし日々“60\'s Dream”', 'SUGAR'],
    bin: 2, mix: ['mellow', 'citypop', 'tender'], used: 2200, cond: ['B+', 'B'],
    d: { k: 'kraft', c: ['#c8a978', '#3b2a1a', '#efe2c4', '#8c2f22'], f: 'type', t: 'top' },
    obi: '[十年|じゅうねん|ten years]たっても、[街|まち|town]はこのレコードの[音|おと|sound]がする。',
    pop: { head: '[同|おな|same]じバンドにいたころ', body: '[大貫妙子|おおぬきたえこ|Taeko Ohnuki]さんと[山下達郎|やましたたつろう|Tatsuro Yamashita]さんが、[一緒|いっしょ|together]にやっていたバンド。[一枚|いちまい|one album]きり。', color: '#5b3a1e' } },
];

export const BINS = [
  { name: 'アイドル（あ〜な）', jp: '[女性|じょせい|female]アイドル　あ〜な', en: 'idols, a–na', dividers: true },
  { name: 'アイドル（は〜わ）', jp: '[女性|じょせい|female]アイドル　は〜わ', en: 'idols, ha–wa', dividers: true },
  { name: 'シティ・ポップ', jp: 'シティ・ポップ／ニューミュージック', en: 'city pop / new music', dividers: true },
];

// Three records the clerk has been holding for you (取り置き). The rest of the thirty are yours to find.
export const HELD = ['ohnuki-sunshower', 'hayami-lanai', 'takeuchi-variety'];

export const byId = (id) => RECORDS.find((r) => r.id === id);
export const yearOf = (r) => +r.date.slice(0, 4);
export const showaOf = (r) => yearOf(r) - 1925; // 昭和

// Track recipes for one side: styles cycle through the record's mix; every side is its own songs.
export function sideRecipes(rec, side) {
  const list = side === 'A' ? rec.A : rec.B;
  const n = Math.min(list.length, 5);
  const out = [];
  for (let k = 0; k < n; k++) {
    const style = rec.mix[(k + (side === 'B' ? 1 : 0)) % rec.mix.length];
    const seed = hashStr(rec.id + side + k);
    out.push({ style, seed });
  }
  return out;
}

// English mode: the obi copy and the owner's POP cards, translated (obi lines are the owner's
// own writing for this shop, not real obi text).
const EN_TEXT = {
  'okada-cinderella': ['A first album holds every first season.', ['Her debut single’s on this', '“First Date” — words and music by Mariya Takeuchi. It’s the last track on side B.']],
  'okada-fairy': ['Magic lives wherever there’s the sound of rain.', ['Last year’s Best New Artist', 'Best New Artist at the Japan Record Awards. Of course it was.']],
  'okada-ningyo': ['The October sea still remembers a little of summer.', ['The one after closing', 'Playing this one all the way through after closing is a habit of mine. Her voice reaches you so directly.']],
  'oginome-teens': ['At sixteen, the map still has a sea with no name.'],
  'oginome-freesia': ['Do you know the rain that smells of yellow flowers?'],
  'kikuchi-oceanside': ['The sound of the waves always arrives a little late.'],
  'kikuchi-tropic': ['The cross in the southern sky knows the way home.', ['Tropic of Capricorn', 'I’ve never been there, but it’s right here. Start from side A and go in order.']],
  'saito-axia': ['Spring light still lingers on a uniform sleeve.', ['Side A, track 1: “Graduation”', 'No need to wait for spring.']],
  'akina-prologue': ['The quietest second, just before the curtain rises.', ['Side B, track 2: “Slow Motion”', 'Akina’s debut single. The girl who sang it at the Star Tanjō! final is at the very front of this same bin right now.']],
  'akina-variation': ['One melody, sung with three faces.'],
  'akina-possibility': ['Even past the North Wing, the sky goes on.'],
  'akina-bitter': ['Bitter first, or sweet first?'],
  'akina-d404me': ['Solve the cipher and the end of summer comes out.', ['“Mi Amore” is on it', 'That was this summer. Last track on side B.']],
  'hayami-andiloveyou': ['First love always hurries a little too much.'],
  'hayami-lanai': ['On the afternoon veranda, the shadows of leaves are swaying.'],
  'hayami-colorful': ['A box that shows a different colour every time you open it.'],
  'seiko-kazetachinu': ['The autumn wind lifts the hat, just a little.'],
  'seiko-pineapple': ['Summer fruit is sweetest the moment it’s cut.'],
  'seiko-utopia': ['The colour of 5 a.m. on an island no map has.'],
  'seiko-canary': ['The birdcage door was open from the start.'],
  'seiko-9thwave': ['The ninth wave is the one that reaches farthest.'],
  'ohnuki-sunshower': ['Rain that falls while the sun shines is called the fox’s wedding.', ['For a rainy afternoon', 'Once the needle’s down, open the window a little.']],
  'ohnuki-mignonne': ['In a room at 4 a.m., only a profile is still awake.'],
  'ohnuki-romantique': ['Paris rain is a little older than Tokyo rain.'],
  'ohnuki-aventure': ['The ticket is one way. The return date is still blank.', ['A record for travelling', 'Even if you’ve never been to Europe, this will take you.']],
  'ohnuki-cliche': ['Only the people in black know the names of the colours.'],
  'anri-bikini': ['September beaches keep footprints well.'],
  'anri-timely': ['A midnight expressway is a lot like someone’s secret.'],
  'anri-coool': ['Under a mercury-vapour lamp, everyone is a little blue.'],
  'yamashita-foryou': ['Summer can end. Inside this record, it doesn’t.', ['If it’s your first one, this', 'The guitar on side A, track 1 raises the room’s temperature by two degrees.']],
  'takeuchi-variety': ['The brighter the song, the lonelier it sounds at night.', ['They’re connected', 'An album by the person who wrote Yukiko Okada’s “First Date.”']],
  'ohtaki-longvacation': ['Somehow the last day of a long vacation is always clear.'],
  'matsubara-pocketpark': ['A tiny park between buildings, and one street lamp.', ['Side A, track 1', 'Listen to it in the middle of the night and you’ll start wondering what’s behind the door.']],
  'sugarbabe-songs': ['Ten years on, the city still sounds like this record.', ['When they were in the same band', 'The band Taeko Ohnuki and Tatsuro Yamashita were in together. Just this one album.']],
};
RECORDS.forEach((r) => {
  const e = EN_TEXT[r.id];
  if (!e) return;
  r.obiEn = e[0];
  if (r.pop && e[1]) r.pop.en = e[1];
});
BINS[0].enName = 'Idols, A–Na'; BINS[1].enName = 'Idols, Ha–Wa'; BINS[2].enName = 'City Pop / New Music';
