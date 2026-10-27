// 街頭ビジョン: the street screen above the record shop plays a late-night music programme,
// 『夜のスタジオ '85』, with a パタパタ split-flap ranking board. Played completely straight,
// the 1985 board counts down… and lands on a chart from 2026.

import { Band } from './synth.js';
import { canvas, rng, clamp, roundRect, rgba } from './util.js';

const W = 960, H = 720;

const ERA = ['中森明菜', '松田聖子', 'チェッカーズ', '安全地帯', '吉川晃司', '小泉今日子', '中山美穂', '本田美奈子', '少年隊',
  'C-C-B', '杏里', '斉藤由貴', '菊池桃子', '荻野目洋子', '早見優', '岡田有希子', '尾崎豊', '柏原芳恵', '石川秀美', '堀ちえみ',
  '薬師丸ひろ子', '原田知世', '中村あゆみ', 'REBECCA', '大貫妙子', '竹内まりや', '山下達郎', '松本伊代', '河合奈保子'];
const GLITCH = ['？？？？？', '■■■■■', 'ＮＯ　ＳＩＧＮＡＬ', '……', '▒▒▒▒▒▒', 'ｴﾗｰ', '未来', 'ＥＲＲＯＲ', 'ー　ー　ー'];

// rank, landing card, points, tag
const ROWS = [
  { rank: 10, name: '菊池桃子', pts: 7421, tag: '↑', era: 85 },
  { rank: 9, name: '斉藤由貴', pts: 7650, tag: '→', era: 85 },
  { rank: 8, name: '中森明菜', pts: 8003, tag: '↑', era: 85 },
  { rank: 7, name: '早見優', pts: 8120, tag: '41年ぶり', era: 26 },
  { rank: 6, name: 'NETTSPEND', font: '400 30px "Rubik Glitch", "Anton", sans-serif', pts: 8233, tag: '初登場', era: 26, future: true },
  { rank: 5, name: 'che', font: '400 30px "Silkscreen", monospace', pts: 8399, tag: '初登場', era: 26, future: true },
  { rank: 4, name: 'NINE VICIOUS', font: '400 30px "Anton", sans-serif', color: '#ff5a5a', pts: 8512, tag: '初登場', era: 26, future: true },
  { rank: 3, name: '大貫妙子', pts: 8760, tag: '41年ぶり', era: 26 },
  { rank: 2, name: '岡田有希子', pts: 9415, tag: '41年ぶり', era: 26, tender: true },
  { rank: 1, name: 'OsamaSon', font: '700 34px "UnifrakturCook", serif', pts: 9999, tag: '初登場', era: 26, future: true },
];

export const TV_FONTS = [
  ['400 30px "Mochiy Pop One"', '夜のスタジオ'], ['400 30px "Anton"', "'85NINE VICIOUS"], ['400 30px "Rubik Glitch"', 'NETTSPEND'],
  ['400 30px "Silkscreen"', 'che'], ['700 34px "UnifrakturCook"', 'OsamaSon'], ['700 30px "Zen Kaku Gothic New"', ERA.join('') + '今週のベストテン昭和令和年月最終週初登場41年ぶり中継電波来春発売明日の色まで、映します。'],
  ['400 30px "DotGothic16"', '0123456789'],
];

// MC lines (with hover-gloss markup) and quiet English
const L = {
  open: ['こんばんは。『夜のスタジオ \'85』、[今夜|こんや|tonight]も[生放送|なまほうそう|live broadcast]でお[送|おく|to send; to broadcast]りします。', 'Good evening. “Night Studio ’85,” live again tonight.'],
  rule: ['[今週|こんしゅう|this week]のランキングは、レコード、[有線|ゆうせん|cable radio (wired background music)]、ラジオ、はがき、そして……『スクロブル』？ の[合計|ごうけい|total]です。', 'This week’s chart combines records, cable radio, radio, postcards, and… “scrobbles”?'],
  start: ['では、[第|だい|ordinal prefix]10[位|い|place; rank]から。', 'From number ten, then.'],
  r10: ['[第|だい|ordinal prefix]10[位|い|place]、[菊池桃子|きくちももこ|Momoko Kikuchi]さん。', 'Number ten, Momoko Kikuchi.'],
  r9: ['[第|だい|ordinal prefix]9[位|い|place]、[斉藤由貴|さいとうゆき|Yuki Saito]さん。', 'Number nine, Yuki Saito.'],
  r8: ['[第|だい|ordinal prefix]8[位|い|place]、[中森明菜|なかもりあきな|Akina Nakamori]さん。[今週|こんしゅう|this week]も[強|つよ|strong]いですね。', 'Number eight, Akina Nakamori. Strong again this week.'],
  r7: ['[第|だい|ordinal prefix]7[位|い|place]、[早見優|はやみゆう|Yu Hayami]さん。', 'Number seven, Yu Hayami.'],
  d1: ['……あれ？ [日付|ひづけ|date]が。', '…Huh? The date—'],
  d2: ['[令和|れいわ|Reiwa — an era name no one in 1985 has heard]……？', '“Reiwa”…?'],
  r6: ['[第|だい|ordinal prefix]6[位|い|place]。……ネット、スペンドさん。[初登場|はつとうじょう|first appearance on the chart]です。', 'Number six… Nett-spend. A new entry.'],
  r6b: ['スタジオには、[来|こ|to come]られないそうです。', 'We’re told they can’t make it to the studio.'],
  r5: ['[第|だい|ordinal prefix]5[位|い|place]、チェさん。……[三文字|さんもじ|three letters]です。', 'Number five, Che. …Three letters.'],
  r4: ['[第|だい|ordinal prefix]4[位|い|place]、ナイン・ヴィシャスさん。[九|ここの|nine]つの……[凶暴|きょうぼう|ferocity; viciousness]？ [初登場|はつとうじょう|first appearance on the chart]です！', 'Number four, Nine Vicious. Nine… ferocities? A new entry!'],
  r3: ['[第|だい|ordinal prefix]3[位|い|place]、[大貫妙子|おおぬきたえこ|Taeko Ohnuki]さん。あっ、[知|し|to know]ってる。……おかえりなさい。', 'Number three, Taeko Ohnuki. Oh — I know her. …Welcome back.'],
  r2: ['[第|だい|ordinal prefix]2[位|い|place]、[岡田有希子|おかだゆきこ|Yukiko Okada]さん。', 'Number two, Yukiko Okada.'],
  r2b: ['……ずっと、[聴|き|to listen]かれているそうです。', '…She has been listened to, all this time.'],
  r1a: ['そして、[今週|こんしゅう|this week]の[第|だい|ordinal prefix]1[位|い|place]は……', 'And this week’s number one is…'],
  r1: ['オサマソンさん！ 9999[点|てん|points]、[満点|まんてん|a perfect score]です！', 'OsamaSon! 9,999 points — a perfect score!'],
  r1b: ['[今夜|こんや|tonight]は、41[年後|ねんご|years later]からの[中継|ちゅうけい|a live relay from another location]でお[送|おく|to broadcast]りします。', 'Tonight we go live, by relay, to forty-one years from now.'],
  r1c: ['……[電波|でんぱ|radio waves; the signal]が、[届|とど|to reach]きません。', '…The signal won’t reach.'],
  end: ['おめでとうございます。それでは、また[来週|らいしゅう|next week]、この[時間|じかん|time]に。', 'Congratulations. Same time next week.'],
};

const HEAD85 = '昭和60年10月 最終週', HEAD26 = '令和8年10月 最終週';

export class TV {
  constructor(audio, dest, { onLine = () => {}, onDone = () => {} } = {}) {
    this.audio = audio;
    this.ac = audio.ac;
    this.cv = canvas(W, H);
    this.g = this.cv.getContext('2d');
    this.onLine = onLine; this.onDone = onDone;
    this.bus = this.ac.createGain(); this.bus.gain.value = 0.6; this.bus.connect(dest);
    this.band = new Band(audio, this.bus);
    this.clickBus = this.ac.createGain(); this.clickBus.gain.value = 0.5;
    const bp = this.ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = 0.9;
    this.clickBus.connect(bp).connect(this.bus);
    this.cards = new Map();
    this.mode = 'standby';
    this.t = 0;
    this.ts = 0; // standby clock
    this.r = rng(1985);
    this.rows = ROWS.map((row) => ({ ...row, flap: null, shown: null, landed: false, lit: 0, ptsShown: null, ptsFlap: null }));
    this.head = { shown: HEAD85, flap: null };
    this.confetti = [];
    this.relay = 0;
    this.mood = [24, 30, 80];
    this.screenTex = this.makeScreenTexture();
    this.lastLine = null;
    this.cueI = 0;
    this.buildCues();
  }

  // ------------------------------------------------------------------ timeline
  buildCues() {
    const c = [];
    const at = (t, fn) => c.push([t, fn]);
    at(0, () => { this.scene = 'title'; this.jingle(); });
    at(4.2, () => { this.scene = 'board'; this.line('open'); });
    at(9, () => this.line('rule'));
    at(14.5, () => this.line('start'));
    const reveal = (t, idx, line, opts = {}) => {
      at(t, () => this.spin(idx, opts));
      at(t + (opts.spin || 1.5) + 0.15, () => { this.land(idx); this.line(line); });
    };
    reveal(16, 0, 'r10');
    reveal(20.5, 1, 'r9');
    reveal(25, 2, 'r8');
    reveal(30, 3, 'r7', { spin: 2.4 });
    at(34.2, () => { this.line('d1'); this.spinHead(); });
    at(37.4, () => this.line('d2'));
    reveal(40.5, 4, 'r6', { spin: 3.6, future: true });
    at(47, () => this.line('r6b'));
    reveal(50.5, 5, 'r5', { spin: 2.6, future: true });
    reveal(56, 6, 'r4', { spin: 2.8, future: true });
    reveal(63.5, 7, 'r3', { spin: 1.8 });
    reveal(71, 8, 'r2', { spin: 2.4, tender: true });
    at(76.5, () => this.line('r2b'));
    at(81, () => { this.line('r1a'); this.drumroll(4.2); });
    at(85.2, () => this.spin(9, { spin: 0.01, future: true }));
    at(85.3, () => { this.land(9); this.line('r1'); this.fanfare(); this.burst(); });
    at(91, () => { this.line('r1b'); this.relay = 0.001; });
    at(96.5, () => this.line('r1c'));
    at(101.5, () => this.line('end'));
    at(108, () => { this.scene = 'endcard'; });
    at(113, () => { this.mode = 'after'; this.onDone(); });
    this.cues = c;
  }

  start() {
    this.mode = 'show';
    this.t = 0; this.cueI = 0;
    this.rows.forEach((r) => { r.flap = null; r.shown = null; r.landed = false; r.lit = 0; r.ptsShown = null; r.ptsFlap = null; });
    this.head = { shown: HEAD85, flap: null };
    this.confetti.length = 0;
    this.relay = 0;
    this.scene = 'title';
  }

  stopShow() {
    if (this.mode === 'show') { this.mode = 'after'; this.scene = 'board'; }
    this.onLine(null);
  }

  line(key) { const l = L[key]; this.lastLine = l; this.onLine(l); }

  spin(idx, { spin = 1.5, future = false, tender = false } = {}) {
    const row = this.rows[idx];
    const r = this.r;
    const n = Math.max(1, Math.round(spin * (tender ? 9 : 16)));
    const cards = [];
    for (let i = 0; i < n; i++) {
      if (future && i > n * 0.4) cards.push({ text: r.pick(GLITCH), glitch: true });
      else cards.push({ text: r.pick(ERA) });
    }
    cards.push({ text: row.name, font: row.font, color: row.color });
    row.flap = { cards, i: 0, p: 0, rate: n / Math.max(0.2, spin), from: row.shown };
    row.ptsFlap = { p: 0, dur: Math.max(0.6, spin) };
    row.spinning = true;
  }

  land(idx) {
    const row = this.rows[idx];
    if (row.flap) { row.shown = row.flap.cards[row.flap.cards.length - 1]; row.flap = null; }
    row.landed = true; row.spinning = false; row.lit = 1;
    row.ptsShown = row.pts;
    this.clack(0.9);
    if (row.tender) this.band.bell(this.ac.currentTime + 0.05, 84, 0.5);
    else if (row.rank !== 1) {
      const t = this.ac.currentTime + 0.02;
      this.band.bell(t, 88, 0.35);
      [72, 76, 79].forEach((m) => this.band.brass(t, m, 0.45, 0.18));
    }
  }

  spinHead() {
    const cards = [];
    for (let i = 0; i < 26; i++) cards.push({ text: (this.r() < 0.5 ? '昭和' : '平成') + this.r.int(1, 99) + '年' + this.r.int(1, 12) + '月' });
    cards.push({ text: '????年??月' }, { text: HEAD26 });
    this.head.flap = { cards, i: 0, p: 0, rate: 9, from: typeof this.head.shown === 'string' ? { text: this.head.shown } : this.head.shown };
  }

  // ------------------------------------------------------------------ sound
  clack(v = 0.4) {
    const ac = this.ac, t = ac.currentTime + 0.005;
    const s = ac.createBufferSource(); s.buffer = this.audio.noise('white');
    const g = ac.createGain(); g.gain.setValueAtTime(v * 0.5, t); g.gain.setTargetAtTime(0, t, 0.006 + Math.random() * 0.004);
    s.playbackRate.value = 0.8 + Math.random() * 0.4;
    s.connect(g).connect(this.clickBus); s.start(t, Math.random()); s.stop(t + 0.06);
    const o = ac.createOscillator(); o.frequency.value = 520 + Math.random() * 180;
    const og = ac.createGain(); og.gain.setValueAtTime(v * 0.08, t); og.gain.setTargetAtTime(0, t, 0.01);
    o.connect(og).connect(this.bus); o.start(t); o.stop(t + 0.05);
  }

  jingle() {
    const b = this.band, t = this.ac.currentTime + 0.05, beat = 0.16;
    const chords = [[60, 64, 67, 72], [62, 65, 69, 74], [64, 67, 71, 76], [65, 69, 72, 77, 81]];
    [0, 1, 2].forEach((k) => { b.synthBrass(t + k * beat * 2, chords[k], 0.8, beat * 1.4); b.snare(t + k * beat * 2, 0.6, 0.8); b.kick(t + k * beat * 2, 0.8); });
    b.synthBrass(t + 6 * beat, chords[3], 0.95, 1.4); b.kick(t + 6 * beat, 0.9); b.crash(t + 6 * beat, 0.7);
    [84, 88, 91, 96].forEach((m, k) => b.bell(t + 6 * beat + k * 0.07, m, 0.5));
    b.bassNote(t + 6 * beat, 41, 0.8, 1.2, 'finger');
  }

  fanfare() {
    const b = this.band, t = this.ac.currentTime + 0.02;
    const seq = [[67, 72, 76], [67, 72, 76], [67, 72, 76], [69, 74, 77], [71, 74, 79], [72, 76, 79, 84]];
    const times = [0, 0.12, 0.24, 0.42, 0.6, 0.84];
    seq.forEach((ch, k) => { ch.forEach((m) => b.brass(t + times[k], m, 0.8, k === 5 ? 1.6 : 0.1)); b.snare(t + times[k], 0.5, 0.7); });
    b.crash(t + 0.84, 0.9); b.kick(t + 0.84, 1); b.timpani(t + 0.84, 36, 0.9);
    b.bassNote(t + 0.84, 36, 0.9, 1.4, 'finger');
    [96, 91, 88, 84, 91, 96, 100].forEach((m, k) => b.bell(t + 0.9 + k * 0.08, m, 0.4));
    this.applause(t + 0.6, 6);
  }

  drumroll(sec) {
    const b = this.band, t0 = this.ac.currentTime + 0.05;
    const n = Math.floor(sec * 18);
    for (let i = 0; i < n; i++) b.snare(t0 + i / 18 + (Math.random() - 0.5) * 0.006, 0.12 + 0.5 * (i / n), 0);
    b.timpani(t0, 36, 0.2);
  }

  applause(t, sec) {
    if (!this.clapBuf) {
      const ac = this.ac, sr = ac.sampleRate, n = Math.floor(sr * 7);
      const buf = ac.createBuffer(2, n, sr);
      for (let c = 0; c < 2; c++) {
        const d = buf.getChannelData(c);
        let k = 0;
        while (k < n) {
          k += Math.floor(-Math.log(1 - Math.random()) * sr / 260);
          const len = Math.floor(sr * (0.006 + Math.random() * 0.012));
          const a = 0.05 + Math.random() * 0.12;
          let lp = 0; const bright = 0.3 + Math.random() * 0.5;
          for (let j = 0; j < len && k + j < n; j++) { lp += bright * ((Math.random() * 2 - 1) - lp); d[k + j] += lp * a * Math.exp(-j / (len * 0.3)); }
        }
        for (let i = 0; i < n; i++) { const tt = i / sr; d[i] *= Math.min(1, tt / 0.25) * Math.max(0, 1 - Math.max(0, tt - 4.2) / 2.8); }
      }
      this.clapBuf = buf;
    }
    const s = this.ac.createBufferSource(); s.buffer = this.clapBuf;
    const g = this.ac.createGain(); g.gain.value = 0.9;
    const hp = this.ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 500;
    s.connect(hp).connect(g).connect(this.bus); s.start(t); s.stop(t + Math.min(7, sec + 1));
  }

  // ------------------------------------------------------------------ drawing helpers
  card(cd, w, h) {
    const key = cd.text + '|' + (cd.font || '') + '|' + w + 'x' + h + (cd.glitch ? 'g' : '');
    let c = this.cards.get(key);
    if (c) return c;
    c = canvas(w, h);
    const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#1b1b1d'); gr.addColorStop(0.49, '#0e0e10'); gr.addColorStop(0.51, '#161618'); gr.addColorStop(1, '#0a0a0b');
    g.fillStyle = gr; roundRect(g, 0, 0, w, h, 3); g.fill();
    g.fillStyle = cd.color || (cd.glitch ? '#7fe7ff' : '#f6f1e4');
    g.font = cd.font || '700 30px "Zen Kaku Gothic New", sans-serif';
    g.textBaseline = 'middle'; g.textAlign = 'left';
    let size = parseInt((g.font.match(/(\d+)px/) || [0, 30])[1], 10);
    const small = w < 60;
    while (g.measureText(cd.text).width > w - (small ? 4 : 30) && size > 12) { size -= 1; g.font = g.font.replace(/\d+px/, size + 'px'); }
    if (small) g.textAlign = 'center';
    const tx = small ? w / 2 : 16;
    if (cd.glitch) { g.globalAlpha = 0.6; g.fillStyle = '#ff3d7f'; g.fillText(cd.text, tx + 2, h / 2 + 1); g.globalAlpha = 1; g.fillStyle = '#7fe7ff'; }
    g.fillText(cd.text, tx, h / 2 + 1);
    g.fillStyle = 'rgba(0,0,0,0.75)'; g.fillRect(0, h / 2 - 1, w, 2);
    this.cards.set(key, c);
    return c;
  }

  drawFlap(g, x, y, w, h, flap, shown) {
    const blank = { text: '' };
    if (!flap) { g.drawImage(this.card(shown || blank, w, h), x, y); return; }
    const cur = flap.i === 0 ? (flap.from || blank) : flap.cards[flap.i - 1];
    const nxt = flap.cards[Math.min(flap.i, flap.cards.length - 1)];
    const A = this.card(cur, w, h), B = this.card(nxt, w, h);
    const hh = h / 2, p = flap.p;
    // top half: next card (revealed behind the falling flap)
    g.drawImage(B, 0, 0, w, hh, x, y, w, hh);
    // bottom half: current card until the flap lands
    g.drawImage(A, 0, hh, w, hh, x, y + hh, w, hh);
    if (p < 0.5) {
      const s = 1 - p * 2;
      g.drawImage(A, 0, 0, w, hh, x, y + hh - hh * s, w, hh * s);
      g.fillStyle = `rgba(0,0,0,${0.5 * (1 - s)})`; g.fillRect(x, y + hh - hh * s, w, hh * s);
    } else {
      const s = (p - 0.5) * 2;
      g.drawImage(B, 0, hh, w, hh, x, y + hh, w, hh * s);
      g.fillStyle = `rgba(255,255,255,${0.12 * (1 - s)})`; g.fillRect(x, y + hh, w, hh * s);
    }
  }

  advanceFlap(flap, dt, clickVol) {
    if (!flap) return false;
    flap.p += dt * flap.rate * (flap.i >= flap.cards.length - 3 ? 0.55 : 1);
    while (flap.p >= 1) {
      flap.p -= 1; flap.i++;
      if (clickVol > 0) this.clack(clickVol);
      if (flap.i >= flap.cards.length) { flap.p = 0; return true; }
    }
    return false;
  }

  makeScreenTexture() {
    const c = canvas(W, H), g = c.getContext('2d');
    for (let y = 0; y < H; y += 3) { g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(0, y, W, 1); }
    // street-vision cell grid (lamp modules)
    g.fillStyle = 'rgba(0,0,0,0.12)';
    for (let x = 0; x < W; x += 6) g.fillRect(x, 0, 1, H);
    const v = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.85);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.45)');
    g.fillStyle = v; g.fillRect(0, 0, W, H);
    return c;
  }

  // ------------------------------------------------------------------ scenes
  drawStudio(g, t) {
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#0b0f3a'); gr.addColorStop(0.6, '#1d1150'); gr.addColorStop(1, '#3a0e3f');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    // light beams
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) {
      const a = Math.sin(t * 0.4 + i * 1.3) * 0.5;
      g.save(); g.translate(120 + i * 180, -20); g.rotate(a);
      const bg = g.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, i % 2 ? 'rgba(255,90,170,0.22)' : 'rgba(90,200,255,0.2)'); bg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = bg; g.beginPath(); g.moveTo(-8, 0); g.lineTo(8, 0); g.lineTo(90, H); g.lineTo(-90, H); g.closePath(); g.fill();
      g.restore();
    }
    g.restore();
  }

  drawBulbs(g, x, y, w, h, t, step = 24) {
    const per = Math.floor((w + h) * 2 / step);
    let k = 0;
    const put = (bx, by) => {
      const on = ((k + Math.floor(t * 8)) % 3) === 0;
      g.fillStyle = on ? '#ffe7a3' : '#6b4a22';
      g.beginPath(); g.arc(bx, by, 4, 0, 7); g.fill();
      if (on) { g.fillStyle = 'rgba(255,220,140,0.25)'; g.beginPath(); g.arc(bx, by, 9, 0, 7); g.fill(); }
      k++;
    };
    for (let i = 0; i <= w; i += step) put(x + i, y);
    for (let i = step; i <= h; i += step) put(x + w, y + i);
    for (let i = w - step; i >= 0; i -= step) put(x + i, y + h);
    for (let i = h - step; i > 0; i -= step) put(x, y + i);
    void per;
  }

  drawBoard(g, t, dt) {
    this.drawStudio(g, t);
    const bx = 70, by = 84, bw = 820, bh = 590;
    this.drawBulbs(g, bx - 14, by - 14, bw + 28, bh + 28, t);
    g.fillStyle = '#05050a'; roundRect(g, bx, by, bw, bh, 10); g.fill();
    g.strokeStyle = '#c9b27a'; g.lineWidth = 3; roundRect(g, bx + 4, by + 4, bw - 8, bh - 8, 8); g.stroke();
    // header
    g.fillStyle = '#ffd34d'; g.font = '700 30px "Zen Kaku Gothic New", sans-serif'; g.textBaseline = 'middle';
    g.save(); g.translate(bx + 28, by + 38); g.transform(1, 0, -0.18, 1, 0, 0); g.fillText('今週のベストテン', 0, 0); g.restore();
    if (this.head.flap && this.advanceFlap(this.head.flap, dt, 0.25)) { this.head.shown = this.head.flap.cards[this.head.flap.cards.length - 1]; this.head.flap = null; this.clack(0.8); }
    const headCard = typeof this.head.shown === 'string' ? { text: this.head.shown } : this.head.shown;
    this.drawFlap(g, bx + 430, by + 16, 360, 44, this.head.flap, headCard);
    // rows: rank 1 at the top
    const rowH = 46, gap = 4, top = by + 80;
    for (let i = 0; i < 10; i++) {
      const row = this.rows[9 - i];
      const y = top + i * (rowH + gap);
      row.lit = Math.max(0, row.lit - dt * 0.35);
      // spotlight sweep
      if (row.spinning || row.lit > 0) {
        g.save(); g.globalCompositeOperation = 'lighter';
        g.fillStyle = row.tender ? `rgba(255,190,210,${0.16 + 0.1 * row.lit})` : `rgba(255,230,140,${0.12 + 0.18 * row.lit})`;
        g.fillRect(bx + 10, y - 2, bw - 20, rowH + 4); g.restore();
      }
      // rank lamp
      g.fillStyle = row.landed ? '#2a1a02' : '#140d02'; g.fillRect(bx + 18, y, 64, rowH);
      g.font = '400 34px "DotGothic16", monospace'; g.textAlign = 'center';
      g.fillStyle = row.landed || row.spinning ? '#ffcf3a' : '#4a3610';
      g.fillText(String(row.rank), bx + 50, y + rowH / 2 + 2);
      g.textAlign = 'left';
      // name flap
      if (row.flap && this.advanceFlap(row.flap, dt, 0.32)) { /* lands via cue */ }
      this.drawFlap(g, bx + 94, y, 450, rowH, row.flap, row.shown);
      // tag
      g.fillStyle = '#101014'; g.fillRect(bx + 554, y, 108, rowH);
      if (row.landed) {
        g.font = '700 20px "Zen Kaku Gothic New", sans-serif';
        g.fillStyle = row.tag === '初登場' ? '#ff6f9a' : row.tag === '41年ぶり' ? '#9fe0ff' : '#ffe08a';
        g.textAlign = 'center'; g.fillText(row.tag, bx + 608, y + rowH / 2 + 1); g.textAlign = 'left';
      }
      // points (4 digit flaps)
      const px = bx + 672;
      let digits = row.ptsShown != null ? String(row.ptsShown).padStart(4, ' ') : '    ';
      if (row.ptsFlap && row.spinning) {
        row.ptsFlap.p += dt;
        digits = Array.from({ length: 4 }, () => String(Math.floor(Math.random() * 10))).join('');
      }
      for (let k = 0; k < 4; k++) {
        const cd = { text: digits[k] === ' ' ? '' : digits[k], font: '400 32px "DotGothic16", monospace', color: '#ffd34d' };
        g.drawImage(this.card(cd, 30, rowH), px + k * 33, y);
      }
    }
    // relay inset for no.1
    if (this.relay > 0) {
      this.relay = Math.min(1, this.relay + dt * 0.8);
      const iw = 300 * this.relay, ih = 200 * this.relay, ix = W - 40 - iw, iy = 40;
      g.fillStyle = '#000'; g.fillRect(ix - 4, iy - 4, iw + 8, ih + 8);
      const im = g.createImageData(Math.max(1, Math.floor(iw / 3)), Math.max(1, Math.floor(ih / 3)));
      for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 200; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
      const tmp = this._snow || (this._snow = canvas(100, 67));
      tmp.getContext('2d').putImageData(im, 0, 0);
      g.imageSmoothingEnabled = false; g.drawImage(tmp, 0, 0, im.width, im.height, ix, iy, iw, ih); g.imageSmoothingEnabled = true;
      if (this.relay > 0.9) {
        g.fillStyle = '#d42a2a'; g.fillRect(ix, iy, 76, 30);
        g.fillStyle = '#fff'; g.font = '700 20px "Zen Kaku Gothic New", sans-serif'; g.fillText('中継', ix + 16, iy + 16);
        g.font = '400 26px "VT323", monospace'; g.fillStyle = 'rgba(255,255,255,0.85)';
        if (Math.sin(t * 9) > -0.3) g.fillText('2026 ・ TOKYO ?', ix + 12, iy + ih - 18);
      }
    }
    this.drawConfetti(g, dt);
  }

  burst() {
    const r = this.r;
    const cols = ['#ff5a8a', '#ffd34d', '#5ad0ff', '#ffffff', '#8cff8a', '#ff9a3c'];
    for (let i = 0; i < 260; i++) this.confetti.push({ x: r() * W, y: -r() * H * 0.8, vx: (r() - 0.5) * 40, vy: 60 + r() * 120, a: r() * 6, va: (r() - 0.5) * 10, c: r.pick(cols), w: 6 + r() * 8, h: 3 + r() * 5 });
  }

  drawConfetti(g, dt) {
    if (!this.confetti.length) return;
    for (const p of this.confetti) {
      p.x += p.vx * dt + Math.sin(p.a) * 0.6; p.y += p.vy * dt; p.a += p.va * dt;
      g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.scale(1, Math.cos(p.a * 1.7));
      g.fillStyle = p.c; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); g.restore();
    }
    this.confetti = this.confetti.filter((p) => p.y < H + 20);
  }

  drawTitle(g, t) {
    this.drawStudio(g, t);
    const k = clamp(t / 1.4, 0, 1);
    g.save(); g.translate(W / 2, H * 0.42);
    const word = '夜のスタジオ';
    g.font = '400 92px "Mochiy Pop One", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const chars = [...word];
    const total = g.measureText(word).width;
    let x = -total / 2;
    chars.forEach((ch, i) => {
      const w = g.measureText(ch).width;
      const p = clamp((t - i * 0.12) / 0.5, 0, 1);
      const yy = (1 - p) * -260 + Math.sin(p * Math.PI) * -18;
      for (let d = 8; d > 0; d--) { g.fillStyle = d > 4 ? '#5a2a08' : '#a65a10'; g.fillText(ch, x + w / 2 + d, yy + d); }
      const gr = g.createLinearGradient(0, yy - 46, 0, yy + 46);
      gr.addColorStop(0, '#fffbe8'); gr.addColorStop(0.5, '#ffd34d'); gr.addColorStop(0.52, '#ffb21e'); gr.addColorStop(1, '#fff1b0');
      g.fillStyle = gr; g.globalAlpha = p; g.fillText(ch, x + w / 2, yy); g.globalAlpha = 1;
      x += w;
    });
    g.font = '400 84px "Anton", sans-serif';
    g.save(); g.shadowColor = '#ff3d8a'; g.shadowBlur = 30 * k; g.fillStyle = '#ff7ab0'; g.globalAlpha = k;
    g.fillText("'85", total / 2 + 30, 70); g.restore();
    g.restore();
    g.fillStyle = '#d4243e'; g.save(); g.translate(W / 2, H * 0.72); g.transform(1, 0, -0.2, 1, 0, 0);
    g.globalAlpha = clamp((t - 1.2) / 0.4, 0, 1);
    g.fillRect(-230, -30, 460, 60);
    g.fillStyle = '#fff'; g.font = '700 34px "Zen Kaku Gothic New", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('今週のベストテン', 0, 2); g.restore();
    g.textAlign = 'left';
  }

  drawAd(g, t) {
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#e9e4da'); gr.addColorStop(1, '#bdb5a6');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    // the set: a 1986 HIKARI CT-1486, pre-announced
    const x = W / 2 - 170, y = 150;
    g.fillStyle = '#2d2a27'; roundRect(g, x, y, 340, 270, 18); g.fill();
    g.fillStyle = '#4a4540'; roundRect(g, x + 10, y + 10, 320, 250, 14); g.fill();
    const bars = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'];
    g.save(); roundRect(g, x + 30, y + 26, 220, 170, 22); g.clip();
    bars.forEach((c, i) => { g.fillStyle = c; g.fillRect(x + 30 + i * 220 / 7, y + 26, 220 / 7 + 1, 170); });
    g.restore();
    g.fillStyle = '#1c1a18'; g.fillRect(x + 262, y + 30, 54, 160);
    for (let i = 0; i < 6; i++) { g.fillStyle = '#88807a'; g.beginPath(); g.arc(x + 289, y + 52 + i * 24, 6, 0, 7); g.fill(); }
    g.fillStyle = '#d8d2c4'; g.font = '600 15px "IBM Plex Mono", monospace'; g.fillText('HIKARI', x + 30, y + 232);
    g.fillStyle = '#2b2622'; g.font = '700 46px "Zen Kaku Gothic New", sans-serif'; g.textAlign = 'center';
    g.globalAlpha = clamp((t - 0.6) / 0.6, 0, 1);
    g.fillText('明日の色まで、映します。', W / 2, 520);
    g.font = '700 24px "Zen Kaku Gothic New", sans-serif'; g.fillStyle = '#7a2a1e';
    g.fillText('ヒカリ カラーテレビ CT-1486 ・ 来春発売', W / 2, 580);
    g.globalAlpha = 1; g.textAlign = 'left';
  }

  drawEndcard(g, t) {
    this.drawStudio(g, t);
    g.fillStyle = '#fff'; g.font = '400 64px "Mochiy Pop One", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('また来週！', W / 2, H * 0.45);
    g.font = '700 26px "Zen Kaku Gothic New", sans-serif'; g.fillStyle = '#ffd34d';
    g.fillText('夜のスタジオ \'85', W / 2, H * 0.6);
    g.textAlign = 'left';
    this.drawConfetti(g, 1 / 60);
  }

  // ------------------------------------------------------------------ frame
  frame(dt) {
    const g = this.g;
    if (this.mode === 'show') {
      this.t += dt;
      while (this.cueI < this.cues.length && this.cues[this.cueI][0] <= this.t) { this.cues[this.cueI][1](); this.cueI++; }
      if (this.scene === 'title') { this.drawTitle(g, this.t); this.mood = [120, 80, 60]; }
      else if (this.scene === 'endcard') { this.drawEndcard(g, this.t); this.mood = [90, 50, 120]; }
      else { this.drawBoard(g, this.t, dt); this.mood = this.confetti.length ? [150, 110, 120] : [50, 40, 110]; }
    } else {
      // standby rotation: title (6s) → board teaser (8s) → advert (7s)
      this.ts += dt;
      const cyc = this.ts % 21;
      if (cyc < 6) { this.drawTitle(g, cyc); this.mood = [120, 80, 60]; if (cyc < dt * 1.5 && this.mode === 'standby' && Math.floor(this.ts / 21) % 2 === 0) this.softJingle(); }
      else if (cyc < 14) { this.drawBoard(g, this.ts, dt); this.mood = [50, 40, 110]; }
      else { this.drawAd(g, cyc - 14); this.mood = [170, 160, 140]; }
    }
    g.drawImage(this.screenTex, 0, 0);
    // occasional tracking wobble band
    const k = (performance.now() / 1000) % 9;
    if (k < 0.35) { g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(0, (k / 0.35) * H, W, 14); }
  }

  softJingle() {
    const t = this.ac.currentTime + 0.05;
    [[72, 76, 79], [74, 77, 81], [76, 79, 84]].forEach((ch, k) => ch.forEach((m) => this.band.bell(t + k * 0.22, m, 0.25)));
  }

  dispose() {
    this.band.dispose();
    try { this.bus.disconnect(); } catch (e) {}
  }
}

export { W as TV_W, H as TV_H, rgba };
