// 地下 — words. Captions are the night's running commentary: unserious, never mean.
// Japanese uses [表記|よみ|gloss] only where a word is genuinely harder.

export const CAPS = {
  platform: [
    ['follow the bass', 'hl'],
    ['[終電|しゅうでん|the last train]？知らない子ですね', 'pop', 'last train? never heard of her'],
    ['the floor is humming. that is not the trains', 'tt'],
  ],
  tunnel: [
    ['it gets louder. keep walking', 'hl'],
    ['you can feel the kick in your teeth already', 'tt'],
  ],
  enter: [
    ['you\'re in.', 'impact'],
    ['やっと着いた', 'pop', 'finally made it'],
  ],
  idle: [
    ['certified underground moment', 'impact'],
    ['the 808 is legally a weather event now', 'tt'],
    ['no thoughts. only 808', 'hl'],
    ['your DT 770s are earning every ohm', 'tt'],
    ['this beat owes me rent', 'impact'],
    ['aura +1000', 'glitch'],
    ['the ceiling is sweating', 'hl'],
    ['音デカすぎ', 'pop', 'WAY too loud'],
    ['[鼓膜|こまく|eardrum]、[退職|たいしょく|resignation; retiring from a job]しました', 'pop', 'my eardrums have handed in their notice'],
    ['えぐい', 'red', 'this is unwell (positive)'],
    ['POV: you can\'t hear your own thoughts and it\'s peaceful', 'tt'],
    ['the bass just moved your organs 2 cm to the left', 'hl'],
    ['main character? no. main crowd', 'impact'],
    ['last train left 40 min ago. we live here now', 'tt'],
    ['lowkey the best night of the year (highkey)', 'hl'],
    ['you are vibrating at a frequency science can\'t explain', 'goth'],
  ],
  sneaker: [
    ['a single 9060 has achieved flight', 'impact'],
    ['whose 9060. WHOSE 9060', 'red'],
    ['靴が飛んでる', 'pop', 'a shoe is flying'],
    ['left shoe: airborne. owner: unbothered', 'tt'],
  ],
  sign: [
    ['スマホ[禁止|きんし|prohibited] (it is not working)', 'hl', '"no phones" (it is not working)'],
    ['the sign said スマホ禁止. everyone: 4K 60fps', 'tt', 'the sign says no phones. everyone: 4K 60fps'],
    ['the sign is trying its best', 'impact'],
  ],
  scarf: [
    ['scarf kid is lowkey the protagonist', 'tt'],
    ['マフラーの子、[主人公|しゅじんこう|protagonist; main character]すぎる', 'pop', 'scarf kid is way too main-character'],
    ['scarf kid has been here since the ruins', 'goth'],
  ],
  chain: [
    ['chain glint detected. +200 aura', 'glitch'],
    ['that chain has its own lighting rig', 'hl'],
    ['sunglasses. indoors. at 2am. respect', 'impact'],
  ],
  pitOpen: [
    ['the circle is opening. you are near the circle', 'red'],
    ['pit opened. say your goodbyes', 'impact'],
  ],
  pitMosh: [
    ['you are now part of a physics simulation', 'tt'],
    ['[自己責任|じこせきにん|at your own risk; one\'s own responsibility]で', 'pop', 'at your own risk'],
  ],
  holdHint: [['hold it…', 'hl'], ['not yet', 'impact'], ['don\'t you dare let go', 'red']],
  early: [['early. the drop was still loading', 'tt'], ['too early. classic', 'hl']],
  late: [['late. the drop left without you', 'tt'], ['bro let go on the beat switch of a different song', 'hl']],
  photo: [
    ['blurry = authentic', 'hl'],
    ['photographer of the year (blurry)', 'tt'],
    ['camera roll: 0 good pics, 40 perfect ones', 'tt'],
    ['flash on in the club. iconic behaviour', 'impact'],
  ],
  switchSoon: [['beat switch soon. hold, then let go ON it', 'hl']],
  after: [['core memory unlocked', 'clean']],
  surfer: [['someone is crowd-surfing to the front. godspeed', 'tt']],
};

// The flier, readable (DOM). Japanese stays Japanese; the quiet English line is optional.
export const FLIER = {
  top: 'ひかり[線|せん|line (railway)] H05 [地下|ちか|underground]ホーム[奥|おく|the far end; the back] ／ [始発|しはつ|the first train of the day]まで',
  sub: '[終電|しゅうでん|the last train]を[逃|のが|to miss (a chance, a train)]した人たちへ',
  auxJP: '[今夜|こんや|tonight]の[選曲|せんきょく|song selection; what gets played]',
  info: 'OPEN 23:30 → [始発|しはつ|the first train of the day]　ADV ¥0 / DOOR ¥0（+1D ¥600）',
  notes: [
    '※[場内|じょうない|inside the venue]スマホ[禁止|きんし|prohibited]・[撮影|さつえい|photography; filming][禁止|きんし|prohibited]',
    '※モッシュ・ダイブは[自己責任|じこせきにん|at your own risk; one\'s own responsibility]で',
    '※[落とし物|おとしもの|lost property]（特に[片方|かたほう|one of a pair]だけのスニーカー）については[責任|せきにん|responsibility]を[負いかねます|おいかねます|cannot accept (formal, on signs)]',
    '※[再入場|さいにゅうじょう|re-entry][不可|ふか|not allowed]',
  ],
  en: 'for everyone who missed the last train · until the first one · phones banned (lol) · mosh at your own risk · we are not responsible for single sneakers',
};

export const HINTS = {
  out: { desk: 'hold (or W) to walk toward the bass · tap = flash photo', touch: 'hold to walk toward the bass · tap = flash photo' },
  in: { desk: 'hold SPACE / mouse = charge (溜め) · release = drop · tap = flash · WASD / drag = push in', touch: 'hold = charge · release = drop · tap = flash · drag = push in' },
};

// English mode: the flier, readable.
export const FLIER_EN = {
  top: 'Hikari Line H05 · far end of the Chika platform · until the first train',
  sub: 'for everyone who missed the last train',
  aux: "tonight's selection",
  info: 'OPEN 23:30 → first train   ADV ¥0 / DOOR ¥0 (+1 drink ¥600)',
  notes: [
    '* No phones, no filming inside the venue',
    '* Moshing and stage-diving at your own risk',
    '* We cannot take responsibility for lost property (especially single sneakers)',
    '* No re-entry',
  ],
};

export const HINTS_EN = {
  out: { desk: 'hold (or W) to walk toward the bass · tap = flash photo', touch: 'hold to walk toward the bass · tap = flash photo' },
  in: { desk: 'hold SPACE / mouse = charge · release = drop · tap = flash · WASD / drag = push in', touch: 'hold = charge · release = drop · tap = flash · drag = push in' },
};
