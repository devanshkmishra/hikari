// 夏ヶ原 — every word in this world. Japanese first; English is a quiet, optional shadow.
// Markup: [表記|よみ|gloss] for the harder words only (rendered by ctx.jp.html).

export const INTRO = [
  { jp: '目を開けると、白かった。',
    en: 'When I opened my eyes, it was white.' },
  { jp: '光の[粒|つぶ|grain; particle; dot]の向こうへ落ちていったはずなのに、足の裏には、ちゃんとコンクリートの固さがある。',
    en: 'I should have fallen through to the far side of those grains of light, and yet under my feet is the plain hardness of concrete.' },
  { jp: '[指先|ゆびさき|fingertip(s)]に、[ブラウン管|ブラウンかん|CRT; cathode-ray tube]の[静電気|せいでんき|static electricity]が少しだけ残っていた。',
    en: 'A little of the CRT’s static was still on my fingertips.' },
  { jp: '[蝉|せみ|cicada]が鳴いている。遠くで。近くで。数えようとして、やめた。',
    en: 'Cicadas are crying. Far off. Close by. I started to count them, then stopped.' },
  { jp: '空は一面の[薄曇り|うすぐもり|thin overcast; hazy cloud cover]で、どこに太陽があるのかわからない。影だけが、地面にうっすらと[溶けて|とけて|melting; dissolving]いる。',
    en: 'The sky is one thin sheet of overcast; I can’t tell where the sun is. Only the shadows remain, faintly dissolving into the ground.' },
  { jp: '[駅名標|えきめいひょう|station name sign]には「なつがはら」とある。聞いたことのない名前なのに、読み方だけは、なぜか知っていた。',
    en: 'The station sign says なつがはら. A name I have never heard — and yet, somehow, I already knew how to read it.' },
  { jp: '誰もいない。駅員も、[乗客|じょうきゃく|passenger(s)]も。',
    en: 'No one is here. No staff. No passengers.' },
  { jp: 'それなのに、人の[気配|けはい|presence; sign of someone]だけが残っている。[掃き目|はきめ|broom marks (traces of sweeping)]の残るホーム。[待合室|まちあいしつ|waiting room]の[座布団|ざぶとん|floor cushion]。[軒下|のきした|under the eaves]の[風鈴|ふうりん|wind chime]。',
    en: 'And still, the sense of people lingers. Broom marks on the platform. Cushions in the waiting room. A wind chime under the eaves.' },
  { jp: 'ツバメの[巣|す|nest]の下には、新聞紙が[敷いて|しいて|spread out (on the ground)]あった。',
    en: 'Under the swallows’ nest, someone has spread out a sheet of newspaper.' },
  { jp: '[自販機|じはんき|vending machine]だけが、誰に頼まれたわけでもなく、[律儀|りちぎ|dutiful; conscientious]に光っている。',
    en: 'Only the vending machine, though no one asked it to, keeps dutifully glowing.' },
  { jp: '[駐輪場|ちゅうりんじょう|bicycle parking]の自転車は、朝の電車で出かけた誰かを、まだ待っている。',
    en: 'The bicycles at the rack are still waiting for whoever left on the morning train.' },
  { jp: 'この町の人たちは、今ごろどこで、何をしているんだろう。',
    en: 'I wonder where the people of this town are right now, and what they are doing.' },
  { jp: '待合室のベンチに、ノートが一冊、[立てかけて|たてかけて|leaning (it) against]あった。',
    en: 'On the bench in the waiting room, a notebook had been left leaning against the wall.' },
  { jp: '[表紙|ひょうし|cover (of a book)]には[油性|ゆせい|oil-based; permanent (marker)]ペンで「駅ノート」。その下に小さく、「ご自由にお書きください」。',
    en: 'On the cover, in permanent marker: 駅ノート, “station notebook”. Underneath, smaller: “Please feel free to write.”' },
];

export const REVISIT = [
  { jp: 'また、ここに来た。', en: 'I came here again.' },
  { jp: '蝉の声も、自販機の[唸り|うなり|hum; drone]も、前と同じだった。変わったのは、たぶんこっちのほうだ。',
    en: 'The cicadas, the hum of the vending machine — all the same as before. What changed is probably me.' },
  { jp: 'ノートは、同じ場所に立てかけてあった。', en: 'The notebook was leaning in the same place.' },
];

export const CHOICE = {
  open: { jp: 'ノートを開く', en: 'open the notebook' },
  stay: { jp: 'もう少し、このままでいる', en: 'stay like this a little longer' },
  wait: { jp: '電車を待つ', en: 'wait for the train' },
  board: { jp: '乗る', en: 'get on' },
};

export const AFTER = [
  { jp: 'ノートを[閉じた|とじた|closed]。知らない人たちの字のあいだに、自分の字が[挟まって|はさまって|wedged in between]いる。',
    en: 'I closed the notebook. Between the handwriting of people I will never meet, my own is now pressed.' },
  { jp: 'いつか誰かが読むのかもしれないし、誰も読まないのかもしれない。どちらでもいい気がした。',
    en: 'Someday someone may read it, or maybe no one will. Either way seemed fine.' },
  { jp: '書いた、ということだけが、ここに残る。',
    en: 'Only the fact that I wrote it stays here.' },
];

export const WAITING = [
  { jp: 'ベンチに座って、次の電車を待つことにした。', en: 'I sat down on the bench to wait for the next train.' },
];

export const TRAIN = [
  { id: 'bell', jp: '遠くで、[踏切|ふみきり|railroad crossing]が鳴りはじめた。',
    en: 'Far off, the crossing began to ring.' },
  { jp: 'カン、カン、カン。音は田んぼを[渡って|わたって|crossing over]、少し遅れてここに[届く|とどく|to reach; arrive]。',
    en: 'Kan, kan, kan. The sound crosses the paddies and reaches me a moment late.' },
  { id: 'light', jp: '[線路|せんろ|railway track]の先に、小さな光がひとつ[灯った|ともった|lit up]。',
    en: 'Far down the track, a single small light came on.' },
  { id: 'near', jp: '[一両|いちりょう|one (rail) car]だけの[気動車|きどうしゃ|diesel railcar]が、低いエンジンの音を[響かせ|ひびかせ|making (it) resound]ながら、ホームに入ってくる。',
    en: 'A single diesel car comes in along the platform, its low engine note echoing.' },
  { id: 'doors', jp: '[扉|とびら|door]が開く。[車内|しゃない|inside the train]には誰もいなくて、[蛍光灯|けいこうとう|fluorescent light]だけがやけに明るい。',
    en: 'The doors open. There is no one inside; only the fluorescent lights, strangely bright.' },
  { jp: '[振り返る|ふりかえる|to look back]。自販機が、まだ光っている。',
    en: 'I look back. The vending machine is still glowing.' },
];

// Things you can look at. Lines show in the text window.
export const LOOK = {
  board: [{ jp: '駅名標の[錆|さび|rust]の下で、前の駅の名前は読めなくなっていた。次の駅の名前だけが、[妙|みょう|strangely; oddly]にはっきりしている。',
    en: 'Under the rust on the sign, the previous station’s name has worn away. Only the next station’s name is oddly clear.' }],
  nest: [{ jp: '巣の[縁|ふち|edge; rim]から、小さな頭が四つ並んでのぞいている。親鳥が戻るたびに、[一斉に|いっせいに|all at once]口を開ける。',
    en: 'Four small heads peek over the rim of the nest. Each time a parent returns, they all open their mouths at once.' }],
  furin: [{ jp: '風鈴の[短冊|たんざく|paper strip (hung from a wind chime)]には、何も書かれていなかった。',
    en: 'Nothing was written on the wind chime’s paper strip.' }],
  bikes: [{ jp: '駐輪場の自転車は三台。一台だけ、[鍵|かぎ|lock; key]がかかっていない。',
    en: 'Three bicycles at the rack. Only one of them isn’t locked.' }],
  crossing: [{ jp: '踏切は黙っている。次に鳴るときは、電車が来るときだ。',
    en: 'The crossing is silent. The next time it rings, a train will be coming.' }],
  fields: [{ jp: '風が[渡る|わたる|to sweep across]たびに、[稲|いね|rice plant(s)]の葉が[裏返って|うらがえって|flipping over]、田んぼが白っぽく光る。波みたいだ、と思うより先に、もう次の波が来ている。',
    en: 'Each time the wind crosses, the rice leaves flip over and the paddies shine pale. Before I can think “like waves”, the next one is already coming.' }],
  wires: [{ jp: '[電線|でんせん|power lines]が空を何本にも[区切って|くぎって|dividing; partitioning]いる。区切られた空のほうが、なぜか広く見える。',
    en: 'Power lines cut the sky into strips. Somehow, the divided sky looks wider.' }],
  clock: [{ jp: '待合室の時計は、三分進んでいる。誰も直さないのは、たぶんわざとだ。',
    en: 'The waiting-room clock is three minutes fast. That nobody fixes it is probably on purpose.' }],
  timetable: [{ jp: '一日に七本。一本[逃したら|のがしたら|if (I) miss (it)]、次は二時間後だ。',
    en: 'Seven a day. Miss one, and the next is two hours later.' }],
  houses: [{ jp: '遠くの家に、明かりがひとつ[点いた|ついた|came on (a light)]。台所だろうか。誰かが、誰かの帰りを待つ時間だ。',
    en: 'A light came on in a distant house. The kitchen, maybe. It is the hour when someone waits for someone to come home.' }],
};

// Lines the place says on its own, if you are not busy reading.
export const AMBIENT = {
  higurashi: { jp: '[蜩|ひぐらし|higurashi; the evening cicada]が鳴きはじめた。昼の蝉とは違う、どこか遠くへ呼びかけるような声だ。',
    en: 'The higurashi have started. Not like the daytime cicadas — a voice that seems to call to somewhere far away.' },
  chime: { jp: 'どこかのスピーカーから、夕方のチャイムが流れてきた。山に[跳ね返って|はねかえって|bouncing back]、少し遅れて、もう一度聞こえる。',
    en: 'From a loudspeaker somewhere, the evening chime drifts over. It bounces off the hills and comes again, a little late.' },
  lamp: { jp: '待合室の蛍光灯が、迷うように二度[瞬いて|まばたいて|blinking; flickering]から点いた。',
    en: 'The waiting-room light flickered twice, as if hesitating, then came on.' },
  window: LOOK.houses[0],
};

export const VEND = [
  [{ jp: '百円玉と、十円玉を二枚。ボタンを押すと、思ったより大きな音で[缶|かん|can]が落ちてきた。',
     en: 'One hundred-yen coin, two ten-yen coins. I pressed the button and the can dropped with a louder clunk than I expected.' },
   { jp: '冷たい。[頬|ほお|cheek]に当てると、夏が少しだけ遠くなる。',
     en: 'Cold. Pressed to my cheek, summer moves a little further away.' }],
  [{ jp: 'もう一本。誰かの分、というわけでもなく。', en: 'One more. Not that it’s for anyone.' }],
  [{ jp: '小さな[ルーレット|るーれっと|(a vending machine’s) lucky-number roulette]が回って、7が四つ[並んだ|ならんだ|lined up]。',
     en: 'The little roulette spun, and four sevens lined up.' },
   { jp: '……当たった。誰も見ていないところで、[運|うん|luck]を使ってしまった。',
     en: '…I won. I used up my luck where no one was watching.' }],
  [{ jp: 'さすがに、もういい。', en: 'That’s really enough.' }],
  [{ jp: '自販機は、何も言わずに光っている。', en: 'The vending machine glows on without a word.' }],
];

export const HOTSPOT_NAMES = {
  notebook: '駅ノート', vend: '自販機', timetable: '時刻表', board: '駅名標', nest: 'ツバメの巣',
  furin: '風鈴', bikes: '駐輪場', crossing: '踏切', fields: '田んぼ', wires: '電線', clock: '時計',
};

// ───────────────────────── the notebook ─────────────────────────
// Each page has an ink: font, colour, size, slant, wobble. They are strangers; they should not look alike.
export const PAGES = [
  {
    kind: 'intro', paper: 'p-newer',
    ink: 'marker',
    body: [
      'このノートは、夏ヶ原駅を',
      '使うみなさんのものです。',
      'ご自由に、お書きください。',
      '',
      '（ペンがなくなったら、[駅前|えきまえ|in front of the station]の',
      '[たばこ屋|たばこや|tobacco & sundries shop]さんへ）',
      '',
      '　　　　　夏ヶ原駅を[守る会|まもるかい|preservation society (lit. the group that looks after)]',
    ],
    en: 'This notebook belongs to everyone who uses Natsugahara Station. Please feel free to write in it. (If the pen goes missing, ask at the tobacco shop in front of the station.) — The Natsugahara Station Preservation Society',
  },
  {
    kind: 'entry', year: 1986, paper: 'p-1986', ink: 'fountain',
    date: '昭和61年 8月14日',
    body: [
      '待合室に、誰かが[忘れていった|わすれていった|left behind (forgot)]ラジオがあった。',
      'つけてみたら、歌が流れてきた。',
      '春にいなくなってしまった人の歌だった。',
      '[雑音|ざつおん|static; noise]まじりで、[途中|とちゅう|partway through]で電車が来て、',
      '最後まで聞けなかった。',
      'だから、たぶん[一生|いっしょう|(for) one’s whole life]忘れないと思う。',
    ],
    en: 'Aug 14, Shōwa 61 (1986). Someone had left a radio in the waiting room. I switched it on and a song came out. It was a song by someone who had gone in the spring. It was full of static, and the train came partway through, so I never heard the end. So I think I will probably never forget it.',
  },
  {
    kind: 'entry', year: 1994, paper: 'p-1994', ink: 'ballpoint',
    date: '平成6年 3月28日',
    body: [
      '明日、東京へ行きます。四月から向こうで働きます。',
      'この駅から乗るのは、たぶんこれが最後です。',
      '帰ってくるときは、きっと車だから。',
      '母には、[見送り|みおくり|seeing someone off]はいいと言いました。',
      '本当は、ここで一人で待ちたかったので。',
      '[枯れた|かれた|withered; dead (plants)]田んぼの色を、覚えておきます。',
    ],
    sign: 'Ｓ．Ｔ',
    ps: {
      ink: 'ballpoint-black',
      date: '（平成20年 8月 [追記|ついき|postscript; added later]）',
      body: ['けっきょく、車で来ました。', 'でも、ホームまで[上がって|あがって|going up (onto)]みました。'],
    },
    en: 'Mar 28, Heisei 6 (1994). Tomorrow I go to Tokyo. From April I’ll be working there. This is probably the last time I’ll board at this station — when I come back, it will surely be by car. I told my mother she didn’t need to see me off. The truth is, I wanted to wait here alone. I will remember the colour of the withered paddies. — S.T.  ·  (Postscript, Aug 2008) In the end, I came by car. But I came up to the platform anyway.',
  },
  {
    kind: 'entry', year: 1999, paper: 'p-1999', ink: 'pencil',
    date: '’99.7.30',
    body: [
      '[浪人|ろうにん|rōnin: a student retaking entrance exams]の夏。[予備校|よびこう|cram school]をさぼって、知らない駅で降りた。',
      'ここには何もない。本当に何もない。',
      'ここにいると、自分が人より[遅れて|おくれて|lagging behind]いるのかどうかも、',
      'よくわからなくなる。それが今は、ありがたい。',
      'ＭＤには、同じ曲しか入っていない。',
      '夜、それを聴きながら[単語|たんご|vocabulary word(s)]を覚えている。',
      '来年の春、これを笑って[読み返せますように|よみかえせますように|may I be able to read this again]。',
    ],
    reply: {
      ink: 'pencil-2b',
      body: ['[同じく|おなじく|likewise; same here]浪人。9月。まだ生きてます。'],
    },
    en: '’99, Jul 30. A rōnin summer. I skipped cram school and got off at a station I didn’t know. There is nothing here. Really nothing. Being here, I can’t even tell anymore whether I’m falling behind everyone else. Right now, I’m grateful for that. My MD has only one song on it. At night I listen to it while I memorise vocabulary. Next spring, may I read this again and laugh.  ·  (another pencil) Also a rōnin. September. Still alive.',
  },
  {
    kind: 'entry', year: 2004, paper: 'p-2004', ink: 'gel', doodle: 'crow', stain: 'ring',
    date: '2004.8.9',
    body: [
      '[聖地巡礼|せいちじゅんれい|“pilgrimage” to real places tied to anime or games]、三日目。',
      '……と言っても、本当はここは[舞台|ぶたい|setting; stage]じゃない。',
      '地図で、似ている駅を探して来てみただけ。',
      'でも、空があのゲームの空に似ている。',
      '[堤防|ていぼう|seawall; embankment]も海もないのに、似ている。',
      'ずっと[画面|がめん|screen]の向こうにあると思っていたものが、',
      'ここには[普通|ふつう|ordinarily; just like that]にあった。',
      '蝉がうるさい。暑い。ジュースが120円。',
      '帰ったら、もう一回、最初からやろう。',
      '（カラスがいた）',
    ],
    en: '2004.8.9. Pilgrimage, day three. …Though honestly, this isn’t the actual setting. I just searched the map for a station that looked similar and came. But the sky looks like the sky in that game. There’s no seawall, no sea, and still it looks like it. Things I always thought existed only on the other side of the screen were just here, ordinarily. The cicadas are loud. It’s hot. Juice is ¥120. When I get home, I’ll play it again from the start. (There was a crow.)',
  },
  {
    kind: 'entry', year: 2011, paper: 'p-2011', ink: 'heavy',
    date: '2011年7月18日',
    body: [
      '北から帰る途中。なんとなく一本[遅らせて|おくらせて|letting (a train) go; delaying]、ここで降りた。',
      '[節電|せつでん|saving electricity (summer 2011)]で、自販機の明かりが消えていた。',
      '暗い自販機を、はじめて見た。',
      'それでもボタンを押したら、ちゃんと冷たいのが出てきて、',
      'なぜか少し泣きそうになった。',
      'ここは何も変わっていないように見える。',
      'それが[救い|すくい|relief; salvation]なのか、怖いのか、まだわからない。',
    ],
    en: 'July 18, 2011. On my way back from the north. For no particular reason I let one train go and got off here. Because of the power-saving, the vending machine’s lights were off. It was the first time I’d seen a dark vending machine. Still, when I pressed the button, a cold one came out, just as it should, and for some reason I almost cried. Nothing here seems to have changed. I don’t know yet whether that is a relief, or something frightening.',
  },
  {
    kind: 'drawing', year: 2019, paper: 'p-2019',
    child: ['キハ40', 'かっこいい'],
    childSign: 'ゆうと　5[さ]い',
    note: {
      ink: 'pencil-neat',
      date: '令和元年 8月12日',
      body: ['（[帰省中|きせいちゅう|back in one’s hometown for the holidays]です。息子が描きました。', '　[祖父|そふ|grandfather]が昔、この線の[運転士|うんてんし|train driver]でした）'],
    },
    en: '(in crayon) KiHa 40 — so cool. Yūto, age 5.  ·  (in pencil) Aug 12, Reiwa 1 (2019). We’re home for Obon. My son drew this. His grandfather used to drive trains on this line, long ago.',
  },
  {
    kind: 'entry', year: 2061, paper: 'p-robot', ink: 'robot', stain: 'water',
    date: '20<smudge>年8月30日　17時02分',
    body: [
      '天気、くもり。気温29.4℃。[湿度|しつど|humidity]78％。',
      'ホームの白線、一部かすれ。',
      '待合室の座布団、二枚とも[日焼け|ひやけ|sun-faded]。',
      'ここで電車を待った人の数を[推定|すいてい|estimate]しようとしましたが、',
      '[記録|きろく|record(s)]が足りませんでした。',
      'なので、このノートを全部読みました。',
      '足りなかったのは記録ではなく、たぶん別のものです。',
      'それくらいは、わかります。[高性能|こうせいのう|high-performance]ですから。',
    ],
    en: '20▒▒, Aug 30, 17:02. Weather: cloudy. 29.4°C. Humidity 78%. Platform white line: partly worn. Waiting-room cushions: both sun-faded. I attempted to estimate the number of people who have waited for trains here, but there were not enough records. So I read this entire notebook. What was missing was probably not records, but something else. I can understand at least that much. I am high-performance, after all.',
  },
  {
    kind: 'entry', year: 2023, paper: 'p-2023', ink: 'brush', vertical: true,
    date: '令和五年十一月三日',
    body: [
      'この線が[廃止|はいし|abolition; closure (of a rail line)]になるかもしれないと',
      '新聞で読み、乗りに来た。',
      '客は私を入れて三人。',
      '三人とも、ずっと窓の外を見ていた。',
      '[紅葉|もみじ|autumn leaves]には、まだ少し早かった。',
    ],
    en: 'November 3, Reiwa 5 (2023). I read in the newspaper that this line may be closed, so I came to ride it. Three passengers, including me. All three of us kept looking out of the window. It was still a little early for the autumn leaves.',
  },
  {
    kind: 'entry', year: 2025, paper: 'p-2025', ink: 'fine',
    date: '2025/8/2',
    body: [
      '[圏外|けんがい|no signal; outside the service area]だった。',
      '二時間、何もすることがなかった。',
      '雲の形が三回変わるのを見ていた。',
      '誰にも見せない時間をすごしたのは、',
      'すごく[久しぶり|ひさしぶり|the first time in a long while]な気がする。',
      '写真は撮らなかった。ここに書くだけにしておく。',
    ],
    en: '2025/8/2. No signal. For two hours there was nothing to do. I watched the clouds change shape three times. It feels like a very long time since I spent time I wasn’t going to show anyone. I didn’t take any photos. I’ll just write it here.',
  },
];

export const WRITE = {
  placeholder: '（ご自由にお書きください）',
  close: 'ノートを閉じる',
  done: '書いた。ノートを閉じる',
  en: 'Write anything, in any language. It stays in the notebook.',
};

export const TIMETABLE = {
  title: '夏ヶ原駅　時刻表',
  line: 'ひかり線',
  up: { dir: 'ぎんざ方面', times: [['6', '12', '◆'], ['7', '03'], ['8', '41'], ['11', '27'], ['14', '52'], ['17', '41', 'fix'], ['19', '46']] },
  down: { dir: '方面', times: [['6', '55'], ['9', '20'], ['13', '05'], ['16', '14'], ['18', '22'], ['20', '51']] },
  notes: ['◆印は、土曜・休日は運休です。', 'ワンマン列車です。うしろのドアからお乗りください。'],
  sticker: '令和元年10月 時刻改正',
};

export function todayJP(d = new Date()) {
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export const NBLINE = {
  empty: { jp: 'まだ、何も書けなかった。白いページだけが、こっちを見ている。',
    en: 'I couldn’t write anything yet. Only the white page is looking back at me.' },
  again: { jp: 'もう一度、ノートを閉じた。前に書いた自分の字の、少しあとに。',
    en: 'I closed the notebook again — a little after my own earlier handwriting.' },
  hint: { jp: 'クリックで、調べる', en: 'click things to look at them' },
};

export const LIGHT_LABEL = 'your handwriting, among strangers';

// ───────────────────────── English mode ─────────────────────────
// The notebook, written out again in English, line by line, in the same hands.
export const EN_PAGES = [
  { body: ['This notebook belongs to everyone', 'who uses Natsugahara Station.', 'Please, write whatever you like.', '', '(If the pen goes missing, ask at', 'the tobacco shop by the station.)', '', '— Natsugahara Station', '　Preservation Society'] },
  { date: 'August 14, 1986', body: [
    'Someone had left a radio behind in the waiting room.',
    'I switched it on, and a song came out.',
    'It was a song by someone who had gone in the spring.',
    'Full of static — and partway through, the train came,',
    'so I never heard the end.',
    'Which is why, I think, I will probably never forget it.'] },
  { date: 'March 28, 1994', body: [
    'Tomorrow I go to Tokyo. From April I’ll be working there.',
    'This is probably the last time I’ll board at this station.',
    'When I come back, it will surely be by car.',
    'I told my mother she didn’t need to see me off.',
    'The truth is, I wanted to wait here alone.',
    'I’ll remember the colour of the withered paddies.'],
    sign: 'S.T.',
    ps: { date: '(added, August 2008)', body: ['In the end, I came by car.', 'But I came up to the platform anyway.'] } },
  { date: '7/30/99', body: [
    'A rōnin summer. I skipped cram school and got off at a station I didn’t know.',
    'There’s nothing here. Really, nothing.',
    'Being here, I can’t even tell anymore whether I’m',
    'falling behind everyone else. Right now, I’m grateful for that.',
    'There’s only one song on my MD.',
    'At night I listen to it while I learn vocabulary.',
    'Next spring, may I read this again and laugh.'],
    reply: { body: ['Also a rōnin. September. Still alive.'] } },
  { date: '2004.8.9', body: [
    'Pilgrimage, day three.',
    '…Though honestly, this isn’t where it was set.',
    'I just found a station on the map that looked similar, and came.',
    'But the sky looks like the sky in that game.',
    'No seawall, no sea — and it still looks like it.',
    'Things I always thought were on the other side of the screen',
    'were just here, like it was nothing.',
    'Cicadas: loud. Hot. Juice: ¥120.',
    'When I get home, I’m playing it again from the start.',
    '(There was a crow.)'] },
  { date: 'July 18, 2011', body: [
    'On my way back from the north. For no reason, I let one train go and got off here.',
    'With the power-saving, the vending machine’s lights were off.',
    'First time I’d ever seen a dark vending machine.',
    'Still, when I pressed the button, a cold one came out, just like always,',
    'and for some reason I nearly cried.',
    'Nothing here looks like it has changed.',
    'I don’t know yet if that’s a comfort, or something frightening.'] },
  { child: ['KiHa 40', 'SO COOL'], childSign: 'YUTO AGE [5]',
    note: { date: 'August 12, 2019', body: ['(We’re home for Obon. My son drew this.', ' His grandfather used to drive trains on this line.)'] } },
  { date: '20<smudge>, August 30 — 17:02', body: [
    'Weather: cloudy. 29.4°C. Humidity 78%.',
    'Platform white line: partially worn.',
    'Waiting-room cushions: both sun-faded.',
    'I attempted to estimate how many people have waited for trains here,',
    'but there were not enough records.',
    'So I read this entire notebook.',
    'What was missing was probably not records, but something else.',
    'I can tell that much. I am high-performance, after all.'] },
  { date: 'November 3, 2023', body: [
    'I read in the paper that this line may be closed,',
    'so I came to ride it.',
    'Three passengers, counting me.',
    'All three of us kept looking out of the window.',
    'It was still a little early for the autumn leaves.'] },
  { date: '2025/8/2', body: [
    'No signal.',
    'Two hours with nothing to do.',
    'I watched the clouds change shape three times.',
    'It feels like forever since I spent time',
    'I wasn’t going to show anyone.',
    'I didn’t take any photos. I’ll just leave it written here.'] },
];

export const HOTSPOT_EN = {
  notebook: 'station notebook', vend: 'vending machine', timetable: 'timetable', board: 'station sign', nest: 'swallows’ nest',
  furin: 'wind chime', bikes: 'bicycles', crossing: 'level crossing', fields: 'rice fields', wires: 'power lines', clock: 'clock',
};

export const WRITE_EN = { placeholder: '(write anything you like)', close: 'close the notebook', done: 'done — close the notebook', last: 'last page' };
export const UI_JA = { last: '最後のページ', log: 'これまで', logHint: 'backlog — L / wheel down at the end / click outside to close' };
export const UI_EN = { log: 'so far', logHint: 'backlog — L / scroll down at the end / click outside to close' };

export const TIMETABLE_EN = {
  title: 'Natsugahara — departures', up: 'for Ginza', down: 'other direction (name worn away)',
  notes: ['◆ does not run on Saturdays or holidays.', 'One-man train: please board at the rear door.'],
  sticker: 'revised October 2019 (17:38 → 17:41)',
};

export function todayEN(d = new Date()) {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).replace(/^(\d+) (\w+) (\d+)$/, '$2 $1, $3');
}
export function dateFromTs(ts, en) {
  if (!ts) return null;
  const d = new Date(ts);
  return en ? todayEN(d) : todayJP(d);
}
