// 区域 — all words that live in the Zone. Japanese first; English is a quiet second line.
// Gloss markup: [表記|よみ|meaning] (rendered by ctx.jp.html).

export const EPIGRAPH = {
  jp: 'ここでは、まっすぐな[道|みち|road; path]ほど[遠|とお|far]い。',
  en: 'Here, the straighter the road, the farther it goes.',
};

// Area names (NieR-style area label, top left).
export const PLACES = {
  platform: { no: '01', jp: '[蛍川|ほたるがわ|Hotarugawa (old place name: “firefly river”)]ホーム', plain: '蛍川ホーム', en: 'the platform' },
  field: { no: '02', jp: '[機械|きかい|machines]の[野|の|field; moor]', plain: '機械の野', en: 'field of machines' },
  tunnel: { no: '03', jp: '[長|なが|long]い[喉|のど|throat]', plain: '長い喉', en: 'the long throat' },
  corridor: { no: '04', jp: '[水|みず|water]の[廊下|ろうか|corridor]', plain: '水の廊下', en: 'the flooded corridor' },
  dunes: { no: '05', jp: '[砂|すな|sand]の[講堂|こうどう|assembly hall]', plain: '砂の講堂', en: 'hall of sand' },
  monolith: { no: '06', jp: '[部屋|へや|room]の[前|まえ|front; before]', plain: '部屋の前', en: 'before the Room' },
  coda: { no: '07', jp: '', plain: '', en: '' },
};

// NieR-style archives. The reader pieces them together; nothing is ever explained.
export const ARCHIVES = {
  log: {
    entitle: 'Station Duty Log',
    title: '[駅務|えきむ|station duties][日誌|にっし|logbook; daily journal]',
    plain: '駅務日誌',
    kind: 'DOCUMENT',
    body: [
      '[十月|じゅうがつ|October][二十七日|にじゅうしちにち|the 27th (day of the month)]　くもり、のち[霧|きり|fog; mist]。',
      '[始発|しはつ|first train of the day]、[乗車|じょうしゃ|boarding; passengers getting on]なし。',
      '[終電|しゅうでん|last train of the night]、乗車なし。',
      '[改札|かいさつ|ticket gate]の前に、[犬|いぬ|dog]が[一匹|いっぴき|one (animal)]すわっている。',
      '[追い払って|おいはらって|chase away; drive off]も、また[戻って|もどって|come back; return]くる。',
      '[駅名標|えきめいひょう|station name board]の[塗り替え|ぬりかえ|repainting]は、[今日|きょう|today]も[業者|ぎょうしゃ|contractor; tradesperson]が来なかった。',
    ],
    en: 'October 27. Cloudy, later fog. First train: no passengers. Last train: no passengers. A dog is sitting in front of the ticket gate. I chase it off; it comes back. The contractors did not come to repaint the station sign today either.',
  },
  notice: {
    entitle: 'Factory Notice No. 14',
    title: '[工場|こうじょう|factory][掲示|けいじ|notice; posting]　[第十四号|だいじゅうよんごう|No. 14]',
    plain: '工場掲示 第十四号',
    kind: 'DOCUMENT',
    body: [
      '[全|ぜん|all][従業員|じゅうぎょういん|employees; workers]へ',
      '[第三炉|だいさんろ|Furnace No. 3]の[灯り|あかり|light; glow]が[消えない|きえない|does not go out][件|けん|matter; affair]について。',
      '[炉|ろ|furnace; kiln]はすでに[冷えて|ひえて|has cooled]いる。[燃料|ねんりょう|fuel]も入っていない。',
      'それでも、[光って|ひかって|shining; glowing]いる。',
      '[原因|げんいん|cause]がわかるまで、[夜勤|やきん|night shift]の[者|もの|person]は炉に[背を向けて|せをむけて|with one’s back turned][作業|さぎょう|work; operations]すること。',
      '[決して|けっして|never; by no means]、[見つめない|みつめない|do not stare at]こと。',
    ],
    en: 'To all employees. Re: the light in Furnace No. 3 that will not go out. The furnace has already cooled. There is no fuel in it. And still it shines. Until the cause is known, night-shift workers are to work with their backs to the furnace. Never stare into it.',
  },
  crew: {
    entitle: 'Work Crew Memo',
    title: '[作業班|さぎょうはん|work crew]の[覚え書き|おぼえがき|memo; note]',
    plain: '作業班の覚え書き',
    kind: 'MEMO',
    body: [
      '[重機|じゅうき|heavy machinery]は[三台|さんだい|three (vehicles)]とも、ここで[止まった|とまった|stopped]。',
      '燃料は[残って|のこって|remains; is left]いる。[故障|こしょう|breakdown; fault]もない。',
      'ただ、これより[先|さき|ahead; further]へは[進もう|すすもう|try to advance]としない。',
      '[運転手|うんてんしゅ|driver; operator]たちも、[無理に|むりに|by force]進めとは言わなかった。',
      'みんな、[何か|なにか|something]を[分かって|わかって|understanding]いる[顔|かお|face; expression]をしていた。',
    ],
    en: 'All three machines stopped here. There is fuel left. Nothing is broken. They simply will not go any further. The drivers did not force them, either. Everyone had the face of someone who understood something.',
  },
  radio: {
    entitle: 'Radio Transcript',
    title: '[無線|むせん|radio; wireless][記録|きろく|record; transcript]',
    plain: '無線記録',
    kind: 'TRANSCRIPT',
    body: [
      '……こちら[第二班|だいにはん|Team Two]。トンネル[内|ない|inside]、[異常|いじょう|abnormality; anomaly]なし。',
      'ただ、[出口|でぐち|exit]がさっきより遠い。',
      '……くり[返す|かえす|repeat]。出口が、遠くなっている。',
      'ナットを[投げる|なげる|throw]。[音|おと|sound]は返ってきた。',
      '進む。',
    ],
    en: '…This is Team Two. Inside the tunnel, nothing abnormal. Only, the exit is farther than it was. …Repeat: the exit is getting farther. Throwing a nut. The sound came back. Proceeding.',
  },
  page: {
    entitle: 'A Page Under the Water',
    title: '[水|みず|water]に[沈んだ|しずんだ|sunken; submerged][頁|ページ|page]',
    plain: '水に沈んだ頁',
    kind: 'FRAGMENT',
    body: [
      'みんな[行って|いって|went away]しまった。',
      '[最後|さいご|last; final]の[列車|れっしゃ|train]が出てから、[町|まち|town]はとても[静か|しずか|quiet]になった。',
      '犬のクロだけが残った。わたしも残った。',
      'ここにいれば、いつか[誰か|だれか|someone]が来てくれる[気がした|きがした|had a feeling]から。',
    ],
    en: 'Everyone has gone. Since the last train left, the town has become very quiet. Only Kuro the dog stayed. I stayed too. Because I had a feeling that if I stayed here, someday someone would come.',
  },
  ticket: {
    entitle: 'An Old Ticket',
    title: '[古い|ふるい|old][切符|きっぷ|ticket]',
    plain: '古い切符',
    kind: 'OBJECT',
    body: [
      '[蛍川|ほたるがわ|Hotarugawa (place name; “firefly river”)]　ゆき',
      '[片道|かたみち|one way]　[小児|しょうに|child (fare)]　[一枚|いちまい|one (ticket)]',
      '（[裏|うら|back; reverse side]に[鉛筆|えんぴつ|pencil]で）',
      '[帰り|かえり|the way home; return]の切符は、[買わなかった|かわなかった|did not buy]。',
    ],
    en: 'To Hotarugawa. One way. Child fare, one ticket. (On the back, in pencil:) I did not buy a ticket home.',
  },
  essay: {
    entitle: 'School Essay: “My Town” (4th grade, class 2)',
    title: '[作文|さくぶん|composition; school essay]「わたしの町」　[四年二組|よねんにくみ|4th grade, class 2]',
    plain: '作文「わたしの町」',
    kind: 'DOCUMENT',
    body: [
      'わたしの町は、テレビの[光|ひかり|light]を[作って|つくって|making]います。',
      'お父さんは、光る[粉|こな|powder]を作る工場で[働いて|はたらいて|working]います。',
      '[夜|よる|night]になると、お父さんの[手|て|hands]は少しだけ光ります。',
      'わたしは、それが[好き|すき|like; love]です。',
      '大きくなったら、わたしも光を作る[人|ひと|person]になりたいです。',
    ],
    en: 'My town makes the light inside televisions. My father works at the factory that makes the glowing powder. At night, his hands glow just a little. I like that. When I grow up, I want to be someone who makes light too.',
  },
  letter: {
    entitle: 'A Letter That Was Never Sent',
    title: '[差し出せなかった|さしだせなかった|could not be sent][手紙|てがみ|letter]',
    plain: '差し出せなかった手紙',
    kind: 'LETTER',
    body: [
      'お[母さん|かあさん|mother]へ',
      'あの部屋に入れば、いちばんの[願い|ねがい|wish]が[叶う|かなう|comes true]そうです。',
      'でも、[自分|じぶん|oneself]のいちばんの願いが何なのか、',
      'まだ、よく分からないのです。',
      '分かるまでは、入らないでおきます。',
    ],
    en: 'Dear Mother — They say that if you enter that room, your deepest wish comes true. But I still do not really know what my deepest wish is. Until I do, I will stay outside.',
  },
  note: {
    entitle: 'A Traveller’s Notes',
    title: '[旅人|たびびと|traveller]の覚え書き',
    plain: '旅人の覚え書き',
    kind: 'MEMO',
    body: [
      'まっすぐ歩くな。ナットを[信じろ|しんじろ|trust; believe]。',
      '[伝言|でんごん|messages (left for others)]は、[半分|はんぶん|half]だけ信じろ。',
      '[篝火|かがりび|bonfire; watch-fire]を[見つけたら|みつけたら|if you find]、[灯して|ともして|light it]、[座れ|すわれ|sit down]。',
      'ここでは、[急ぐ|いそぐ|to hurry][理由|りゆう|reason]は何もない。',
    ],
    en: 'Do not walk straight. Trust the nut. Believe only half of the messages. If you find a bonfire, light it, and sit. Here, there is no reason at all to hurry.',
  },
};
export const ARCHIVE_ORDER = ['log', 'notice', 'crew', 'radio', 'page', 'ticket', 'essay', 'letter', 'note'];

// Orange soapstone messages left by other travellers. `jp` is gloss markup; `n` is appraisals.
export const MESSAGES = {
  precious: { jp: 'この[先|さき|ahead]、[大切|たいせつ|precious; important]なもの', n: 4286, t: 'something precious ahead' },
  liar: { en: 'safe path ahead', n: 2 },
  struggler: { en: 'struggle on, struggler', n: 1997 },
  listen: { en: 'try listening', n: 512 },
  japanese: { en: 'try reading it in Japanese', n: 2031 },
  goen: { jp: 'もしかして、[ご縁|ごえん|fate; a bond (sounds like 五円, five yen)]？', n: 555, t: 'could this be fate? (a five-yen coin…)' },
  summer: { en: 'visions of summer…', n: 873 },
  generic: { en: 'be wary of genericness', n: 9999 },
  hurry: { jp: '[急がなくて|いそがなくて|without hurrying]いい', n: 3300, t: 'no need to hurry' },
  bonfire: { jp: 'この先、[篝火|かがりび|bonfire]', n: 6120, t: 'bonfire ahead' },
  watch: { jp: 'ナットを、よく[見ろ|みろ|look; watch]', n: 88, t: 'watch the nut closely' },
};

// Messages that bloom around the bonfire when you rest.
export const BLOOM = [
  { jp: 'よく[来た|きた|came]ね', n: 1204, t: 'you made it' },
  { en: 'time for rest', n: 3122 },
  { jp: 'おかえり', n: 2718, t: 'welcome home' },
  { en: 'visions of a summer station…', n: 641 },
  { en: 'praise the struggle!', n: 1416 },
  { jp: 'ありがとう、[旅人|たびびと|traveller]', n: 902, t: 'thank you, traveller' },
  { en: 'still no wish… and that is fine', n: 377 },
  { en: 'nut ahead', n: 6 },
  { jp: 'また[会おう|あおう|let’s meet]', n: 1530, t: 'let us meet again' },
  { en: 'be wary of rushing', n: 260 },
  { jp: 'ここで[休め|やすめ|rest]', n: 4410, t: 'rest here' },
  { en: 'fort, night', n: 1 },
  { en: 'warmth ahead', n: 822 },
  { jp: '[灯り|あかり|light]は、まだ[消えて|きえて|gone out]いない', n: 1006, t: 'the light has not gone out yet' },
];

export const SLAB = {
  jp: [
    'ただの[鉄塊|てっかい|lump of iron; slab of iron]。',
    '[剣|けん|sword]と[呼ぶ|よぶ|to call]には、あまりにも[大きすぎた|おおきすぎた|far too large]。',
    '[誰か|だれか|someone]がここで、[長い|ながい|long]あいだ[戦い|たたかい|fought]、そして[休んだ|やすんだ|rested]。',
    '[錆|さび|rust]は、その[時間|じかん|time]の長さだけ[深い|ふかい|deep]。',
  ],
  en: 'Only a slab of iron, far too big to be called a sword. Someone fought here for a long time, and then rested. The rust is as deep as that time was long.',
};

// Message composer (Souls-style templates). Index-aligned so the language toggle translates.
export const TEMPLATES = {
  en: ['{} ahead', 'be wary of {}', 'try {}', 'visions of {}…', 'could this be {}?', 'if only I had {}…', 'praise the {}!', '{}!', 'seek {}', 'still no {}…', 'time for {}'],
  jp: ['この先、{}', '{}に注意', '{}を試せ', '{}の幻…', 'もしかして、{}？', '{}があれば…', '{}を称えよ！', '{}！', '{}を探せ', 'まだ{}がない…', '{}の時間だ'],
};
export const WORDS = {
  en: ['nut', 'struggler', 'summer', 'train', 'light', 'rain', 'rest', 'home', 'friend', 'silence', 'birch', 'concrete', 'dog', 'wish', 'Japanese', 'CRT', 'beatmap', 'vinyl', 'bonfire', 'you'],
  jp: ['ナット', 'もがく者', '夏', '列車', '光', '雨', '休息', '家', '友', '沈黙', '白樺', 'コンクリート', '犬', '願い', '日本語', 'ブラウン管', '譜面', 'レコード', '篝火', 'あなた'],
};

export const ANOMALY_NAMES = {
  haze: { jp: 'かげろう', en: 'heat-shimmer' },
  well: { jp: 'おもし', en: 'weight' },
  whirl: { jp: 'つむじ', en: 'whirl' },
  back: { jp: 'かえし', en: 'return' },
};
