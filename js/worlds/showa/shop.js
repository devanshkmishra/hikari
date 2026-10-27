// 夜光堂: a used-record shop in Ginza, 1985. The owner has stepped out and left a note.
// Dig through the bins (エサ箱), pull a record, read its obi, put it on the turntable.
// A wall of thirty frames waits for a collection that will take a lifetime.

import { el, canvas, rng, clamp, lerp, glow, rgba, mix, roundRect, vtext, grainTiles } from './util.js';
import { RECORDS, BINS, HELD, byId, sideRecipes, yearOf, showaOf } from './records.js';
import { drawFront, drawBack, drawLabel, plainTitle } from './sleeves.js';
import { Deck } from './player.js';

const NOTES = {
  walkman: ['カセットのラベル：『FM [エアチェック|エアチェック|recording radio broadcasts onto cassette] 10/12』', 'The tape inside: “FM aircheck, 10/12”.'],
  tapes: ['『\'85 [夏|なつ|summer]』『[車用|くるまよう|for the car]』『[店|みせ|shop]用 B』……[全部|ぜんぶ|all]、[手書|てが|handwritten]き。', 'Three tapes, three handwritten labels.'],
  match: ['[純喫茶|じゅんきっさ|old-style coffee house]ルナ ・ [銀座|ぎんざ|Ginza]七丁目。[中|なか|inside]に、マッチが[三本|さんぼん|three (sticks)]だけ。', 'A matchbook from the coffee house across the street. Three matches left.'],
  ash: ['[灰皿|はいざら|ashtray]。たばこはまだ、[少|すこ|a little]し[温|あたた|warm]かい。', 'The cigarette is still a little warm.'],
  note: ['ちょっと[出|で|to go out]てます。レコードは[自由|じゆう|freely]に[聴|き|to listen]いてください。　―[店主|てんしゅ|shop owner]', 'Stepped out for a bit. Play whatever you like. — the owner'],
  receipt: ['お[買上|かいあ|purchase]げ　¥1,300　60.10.27　…[今日|きょう|today]の[一枚目|いちまいめ|first one]。', 'Receipt: ¥1,300, Shōwa 60.10.27 — today’s first sale.'],
  coffee: ['[出前|でまえ|delivery from a nearby shop]のコーヒー。[向|む|across]かいの[喫茶店|きっさてん|coffee shop]から。[冷|さ|to cool]めている。', 'Coffee delivered from the café across the street. Gone cold.'],
  calendar: ['1985[年|ねん|year]（[昭和|しょうわ|Shōwa era]60[年|ねん|year]）10[月|がつ|October]。27[日|にち|day]に[赤丸|あかまる|red circle]。[何|なに|what]の[日|ひ|day]かは、[書|か|to write]いていない。', 'October 1985. The 27th is circled in red. It doesn’t say why.'],
  poster: ['[中古盤|ちゅうこばん|used records] [大放出|だいほうしゅつ|big clearance] 10/26(土)〜11/4(月・[振替休日|ふりかえきゅうじつ|substitute holiday])', 'Used-record clearance, Sat 26 Oct – Mon 4 Nov (substitute holiday).'],
};

const LIGHT_LABEL = 'side A, still turning after forty-one years';

export class Shop {
  constructor(parent, ctx, hooks) {
    this.ctx = ctx; this.audio = ctx.audio; this.ac = ctx.audio.ac; this.hooks = hooks;
    this.root = el('div', 'sw-shop', parent);
    this.root.style.display = 'none';
    this.cv = el('canvas', 'sw-cv', this.root);
    this.g = this.cv.getContext('2d', { alpha: false });
    this.hotL = el('div', 'sw-shop-hot', this.root);
    this.overlay = el('div', 'sw-ov', this.root);
    this.noteEl = el('div', 'sw-note', this.root);
    this.np = el('div', 'sw-np', this.root);
    this.grain = grainTiles(3, 160);
    this.t = 0;
    this.quiet = 0; this.quietTarget = 0;
    this.okadaT = 0; this.lightStage = 0;
    this.visible = false;
    this.wall = ctx.store.get('wall', null) || HELD.slice();
    this.sleeves = new Map();
    this.view = 'room';
    this.rain = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), v: 0.05 + Math.random() * 0.2, l: 0.01 + Math.random() * 0.03 }));
    this.smoke = [];
    this.playing = null; // { rec, side }
    this.platterA = 0; this.platterV = 0; this.arm = 0; this.armTarget = 0; this.needle = 0;
    this.buildAudio();
    this.resize(ctx.w, ctx.h);
    ctx.jp.attach(this.root);
    this.bind();
    this.startRadio();
  }

  // ================================================================ audio
  buildAudio() {
    const ac = this.ac, A = this.audio;
    this.bus = ac.createGain(); this.bus.gain.value = 0; this.bus.connect(this.ctx.out);
    const wet = ac.createGain(); wet.gain.value = 0.12; this.bus.connect(wet).connect(this.ctx.send);
    this.amb = ac.createGain(); this.amb.gain.value = 1; this.amb.connect(this.bus);
    this.rainG = ac.createGain(); this.rainG.gain.value = 1; this.rainG.connect(this.bus);
    this.loops = [
      A.noiseLoop(this.rainG, { kind: 'pink', type: 'lowpass', freq: 1300, q: 0.4, gain: 0.05 }),
      A.noiseLoop(this.rainG, { kind: 'brown', type: 'lowpass', freq: 160, q: 0.5, gain: 0.05 }),
    ];
    const hum = ac.createOscillator(); hum.frequency.value = 100; hum.start();
    const hg = ac.createGain(); hg.gain.value = 0.004; hum.connect(hg).connect(this.amb);
    const hum2 = ac.createOscillator(); hum2.frequency.value = 300; hum2.start();
    const hg2 = ac.createGain(); hg2.gain.value = 0.0015; hum2.connect(hg2).connect(this.amb);
    this.loops.push({ stop: () => { try { hum.stop(); hum2.stop(); } catch (e) {} } });
    // all music in the shop: speakers in the room, and the leak out of the door
    this.music = ac.createGain(); this.music.gain.value = 1;
    this.room = ac.createGain(); this.room.gain.value = 1;
    const warm = ac.createBiquadFilter(); warm.type = 'peaking'; warm.frequency.value = 220; warm.gain.value = 2;
    this.music.connect(warm).connect(this.room).connect(this.bus);
    const mw = ac.createGain(); mw.gain.value = 0.18; this.room.connect(mw).connect(this.ctx.send);
    this.deck = new Deck(this.audio, this.music, { vinyl: true });
    // 有線 (cable radio) through a small ceiling speaker
    this.radioOut = ac.createGain(); this.radioOut.gain.value = 0.42;
    const rhp = ac.createBiquadFilter(); rhp.type = 'highpass'; rhp.frequency.value = 280;
    const rlp = ac.createBiquadFilter(); rlp.type = 'lowpass'; rlp.frequency.value = 4200;
    this.radioIn = ac.createGain();
    this.radioIn.connect(rhp).connect(rlp).connect(this.radioOut).connect(this.music);
    this.radio = new Deck(this.audio, this.radioIn, { vinyl: false });
    this.ctx.interval(() => { this.deck.update(); this.radio.update(); }, 25);
    this.ctx.interval(() => this.tick(), 1000);
  }

  startRadio() {
    if (this.playing) return;
    const r = rng((Date.now() / 1000) | 0);
    const styles = ['citypop', 'mellow', 'citypop', 'idol', 'tender'];
    const list = Array.from({ length: 6 }, (_, i) => ({ style: styles[(i + r.int(0, 4)) % styles.length], seed: r.int(1, 1e9) }));
    this.radioOut.gain.cancelScheduledValues(this.ac.currentTime);
    this.radioOut.gain.setTargetAtTime(0.42, this.ac.currentTime, 0.3);
    this.radio.playSide(list, { leadIn: 0.4, gap: 3, onEnd: () => this.startRadio() });
  }

  tick() {
    if (!this.visible || document.hidden) return;
    // the wall clock
    const ac = this.ac, t = ac.currentTime;
    const o = ac.createBufferSource(); o.buffer = this.audio.noise('white');
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = (Date.now() / 1000 | 0) % 2 ? 2400 : 1900; f.Q.value = 4;
    const g = ac.createGain(); g.gain.setValueAtTime(0.06 * (1 - this.quiet), t); g.gain.setTargetAtTime(0, t, 0.006);
    o.connect(f).connect(g).connect(this.amb); o.start(t, Math.random()); o.stop(t + 0.05);
  }

  doorBell() {
    const ac = this.ac;
    for (let i = 0; i < 5; i++) {
      const t = ac.currentTime + i * 0.09 + Math.random() * 0.04;
      [2637, 3520, 5274].forEach((fq, k) => {
        const o = ac.createOscillator(); o.frequency.value = fq * (1 + (Math.random() - 0.5) * 0.02);
        const g = ac.createGain(); g.gain.setValueAtTime(0.04 / (k + 1) * (1 - i * 0.15), t); g.gain.setTargetAtTime(0, t, 0.25);
        o.connect(g).connect(this.ctx.out); o.start(t); o.stop(t + 1.2);
      });
    }
  }

  flap(v = 1) {
    const ac = this.ac, t = ac.currentTime;
    const s = ac.createBufferSource(); s.buffer = this.audio.noise('pink');
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900 + Math.random() * 500; f.Q.value = 0.8;
    const g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.06 * v, t + 0.03); g.gain.setValueAtTime(0.25 * v, t + 0.045); g.gain.setTargetAtTime(0, t + 0.046, 0.02);
    s.connect(f).connect(g).connect(this.ctx.out); s.start(t, Math.random()); s.stop(t + 0.2);
    const o = ac.createOscillator(); o.frequency.setValueAtTime(140, t + 0.045); o.frequency.exponentialRampToValueAtTime(70, t + 0.1);
    const og = ac.createGain(); og.gain.setValueAtTime(0.12 * v, t + 0.045); og.gain.setTargetAtTime(0, t + 0.046, 0.025);
    o.connect(og).connect(this.ctx.out); o.start(t); o.stop(t + 0.2);
  }

  slide() {
    const ac = this.ac, t = ac.currentTime;
    const s = ac.createBufferSource(); s.buffer = this.audio.noise('pink');
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(600, t); f.frequency.linearRampToValueAtTime(2200, t + 0.35); f.Q.value = 1.2;
    const g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.12, t + 0.1); g.gain.linearRampToValueAtTime(0, t + 0.4);
    s.connect(f).connect(g).connect(this.ctx.out); s.start(t, Math.random()); s.stop(t + 0.5);
  }

  // ================================================================ sleeves (cached canvases)
  sleeve(rec, kind = 'front', size = 360) {
    const key = rec.id + kind + size;
    if (this.sleeves.has(key)) return this.sleeves.get(key);
    const c = canvas(size, size), g = c.getContext('2d');
    if (kind === 'front') drawFront(g, rec, size);
    else if (kind === 'back') drawBack(g, rec, size);
    else drawLabel(g, rec, size / 2, kind.slice(-1));
    this.sleeves.set(key, c);
    return c;
  }

  // ================================================================ layout & painting
  resize(w, h) {
    this.W = w; this.H = h;
    this.rs = Math.min(this.ctx.dpr || 1, 1.5);
    this.cv.width = Math.round(w * this.rs); this.cv.height = Math.round(h * this.rs);
    this.cv.style.width = w + 'px'; this.cv.style.height = h + 'px';
    const land = w / h > 1.1;
    const R = (x0, y0, x1, y1) => ({ x: x0 * w, y: y0 * h, w: (x1 - x0) * w, h: (y1 - y0) * h });
    if (land) {
      this.L = {
        land, door: R(0.015, 0.2, 0.11, 0.86), win: R(0.125, 0.14, 0.3, 0.56), shelf: R(0.32, 0.07, 0.66, 0.44),
        wall: R(0.69, 0.06, 0.975, 0.56), cal: R(0.325, 0.47, 0.405, 0.6), clock: { x: 0.47 * w, y: 0.52 * h, r: Math.min(w, h) * 0.04 },
        poster: R(0.52, 0.46, 0.655, 0.6), table: R(0.13, 0.64, 0.66, 0.99), counter: R(0.67, 0.6, 1.0, 1.0),
        tt: { x: 0.785 * w, y: 0.765 * h, r: Math.min(w * 0.075, h * 0.12) },
      };
    } else {
      this.L = {
        land, door: null, win: R(0.04, 0.335, 0.36, 0.425), shelf: null,
        wall: R(0.04, 0.085, 0.96, 0.32), cal: R(0.4, 0.335, 0.56, 0.425), clock: { x: 0.75 * w, y: 0.38 * h, r: Math.min(w, h) * 0.06 },
        poster: null, table: R(0.02, 0.44, 0.98, 0.63), counter: R(0.0, 0.66, 1.0, 1.0),
        tt: { x: 0.32 * w, y: 0.79 * h, r: Math.min(w * 0.22, h * 0.11) },
      };
    }
    const T = this.L.table;
    this.L.bins = [0, 1, 2].map((i) => ({ x: T.x + T.w * (0.03 + i * 0.33), y: T.y + T.h * 0.12, w: T.w * 0.3, h: T.h * 0.78 }));
    const C = this.L.counter;
    const tt = this.L.tt;
    const it = (dx, dy, ww, hh) => ({ x: tt.x + dx * tt.r, y: tt.y + dy * tt.r, w: ww * tt.r, h: hh * tt.r });
    this.L.items = land ? {
      walkman: it(1.35, -0.85, 0.55, 0.75), tapes: it(1.35, 0.1, 0.7, 0.5), match: it(2.15, -0.75, 0.35, 0.25), ash: it(2.1, -0.2, 0.55, 0.32),
      note: it(1.3, 0.72, 0.62, 0.42), receipt: it(2.25, 0.8, 0.36, 0.42), coffee: it(2.15, 0.3, 0.45, 0.4),
    } : {
      walkman: it(1.45, -0.9, 0.6, 0.8), tapes: it(2.25, -0.85, 0.75, 0.55), match: it(1.45, 0.25, 0.4, 0.28), ash: it(2.05, 0.1, 0.6, 0.35),
      note: it(1.15, 0.8, 0.62, 0.4), receipt: it(2.55, 0.55, 0.32, 0.42), coffee: it(2.0, 0.65, 0.5, 0.42),
    };
    void C;
    this.paintStatic();
    this.layoutHot();
  }

  paintStatic() {
    const c = this.static = canvas(this.cv.width, this.cv.height);
    const g = c.getContext('2d');
    g.setTransform(this.rs, 0, 0, this.rs, 0, 0);
    const { W, H, L } = this;
    const r = rng(1985);
    // walls: tired cream plaster above, dark wood wainscot below
    const wall = g.createLinearGradient(0, 0, 0, H);
    wall.addColorStop(0, '#2b2019'); wall.addColorStop(0.5, '#3a2a1e'); wall.addColorStop(1, '#1b130e');
    g.fillStyle = wall; g.fillRect(0, 0, W, H);
    for (let x = 0; x < W; x += 24) { g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x, H * 0.55, 1.5, H); }
    // ceiling fixtures
    g.fillStyle = '#d9e8d8';
    [0.3, 0.6].forEach((fx) => { g.fillRect(W * fx - W * 0.08, H * 0.012, W * 0.16, 4); });
    // window to the street
    if (L.win) {
      const w = L.win;
      const sky = g.createLinearGradient(0, w.y, 0, w.y + w.h);
      sky.addColorStop(0, '#0a0b16'); sky.addColorStop(1, '#23121c');
      g.fillStyle = sky; g.fillRect(w.x, w.y, w.w, w.h);
      g.save(); g.beginPath(); g.rect(w.x, w.y, w.w, w.h); g.clip();
      g.globalCompositeOperation = 'lighter';
      const bok = ['#ff4a6a', '#58ff9a', '#ffcf6a', '#5ff0ff', '#ff5fa8', '#cfe8ff', '#ff9a3c'];
      for (let i = 0; i < 28; i++) {
        const rr = w.w * (0.03 + r() * 0.08);
        g.globalAlpha = 0.25 + r() * 0.4;
        g.drawImage(glow(r.pick(bok), 32, 1.2), w.x + r() * w.w - rr, w.y + w.h * (0.15 + r() * 0.8) - rr, rr * 2, rr * 2);
      }
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      g.restore();
      g.strokeStyle = '#4a3322'; g.lineWidth = 8; g.strokeRect(w.x, w.y, w.w, w.h);
      g.lineWidth = 4; g.beginPath(); g.moveTo(w.x + w.w / 2, w.y); g.lineTo(w.x + w.w / 2, w.y + w.h); g.stroke();
      // gold-leaf shop name, read backwards from inside
      g.save(); g.translate(w.x + w.w / 2, w.y + w.h * 0.3); g.scale(-1, 1);
      g.fillStyle = 'rgba(214,176,90,0.7)'; g.font = `800 ${Math.min(w.w * 0.18, 44)}px "Shippori Mincho B1", serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('夜光堂', 0, 0);
      g.font = `600 ${Math.min(w.w * 0.055, 14)}px "EB Garamond", serif`; g.fillText('USED RECORDS · GINZA', 0, Math.min(w.w * 0.13, 32));
      g.restore();
    }
    if (L.door) {
      const d = L.door;
      g.fillStyle = '#3a2618'; g.fillRect(d.x, d.y, d.w, d.h);
      g.fillStyle = '#0d0d16'; g.fillRect(d.x + d.w * 0.12, d.y + d.h * 0.06, d.w * 0.76, d.h * 0.5);
      g.save(); g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.5; g.drawImage(glow('#ff5fa8', 32), d.x + d.w * 0.1, d.y + d.h * 0.1, d.w * 0.6, d.w * 0.6);
      g.drawImage(glow('#58ff9a', 32), d.x + d.w * 0.4, d.y + d.h * 0.3, d.w * 0.5, d.w * 0.5);
      g.restore();
      g.fillStyle = '#c9b16a'; g.fillRect(d.x + d.w * 0.78, d.y + d.h * 0.6, d.w * 0.08, d.h * 0.05);
      g.fillStyle = '#e8e0cc'; g.fillRect(d.x + d.w * 0.35, d.y + d.h * 0.62, d.w * 0.3, d.w * 0.3);
      g.fillStyle = '#a42a2a'; g.font = `700 ${d.w * 0.22}px "Zen Kaku Gothic New", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('引', d.x + d.w * 0.5, d.y + d.h * 0.62 + d.w * 0.15);
      // the bell
      g.fillStyle = '#b8964a'; g.beginPath(); g.arc(d.x + d.w * 0.5, d.y - 8, 7, Math.PI, 0); g.fill();
    }
    // back-wall shelves of spines
    if (L.shelf) {
      const s = L.shelf;
      const rows = 3, rh = s.h / rows;
      for (let i = 0; i < rows; i++) {
        let x = s.x;
        const y = s.y + i * rh;
        while (x < s.x + s.w - 3) {
          const w = 2 + r() * 4;
          g.fillStyle = mix(r.pick(['#d9c7a4', '#7c1d2b', '#13253a', '#e8b8cf', '#3c6f86', '#f2c14e', '#2a2a2a', '#c8a978', '#f3ead6']), '#000000', 0.35 + r() * 0.3);
          g.fillRect(x, y + rh * 0.08, w, rh * 0.86);
          x += w + 0.6;
        }
        g.fillStyle = '#4a3322'; g.fillRect(s.x - 6, y + rh * 0.94, s.w + 12, rh * 0.08);
      }
    }
    // calendar
    this.paintCalendar(g, L.cal);
    // poster
    if (L.poster) {
      const p = L.poster;
      g.fillStyle = '#efe4c8'; g.fillRect(p.x, p.y, p.w, p.h);
      g.fillStyle = '#c42222'; g.fillRect(p.x, p.y, p.w, p.h * 0.32);
      g.fillStyle = '#fff'; g.font = `800 ${p.h * 0.18}px "Zen Kaku Gothic New", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('中古盤 大放出', p.x + p.w / 2, p.y + p.h * 0.17);
      g.fillStyle = '#2a1a10'; g.font = `700 ${p.h * 0.12}px "Zen Kaku Gothic New", sans-serif`;
      g.fillText('10/26(土)〜11/4(月)', p.x + p.w / 2, p.y + p.h * 0.52);
      g.font = `400 ${p.h * 0.09}px "Zen Kaku Gothic New", sans-serif`; g.fillText('LP 全品 1割引 ・ 買取強化中', p.x + p.w / 2, p.y + p.h * 0.75);
    }
    // the thirty
    this.paintWall(g);
    // table of bins
    const T = L.table;
    g.fillStyle = '#2a1a10'; g.fillRect(T.x, T.y + T.h * 0.85, T.w, T.h * 0.15);
    L.bins.forEach((b, i) => this.paintBin(g, b, i));
    // counter
    const C = L.counter;
    const top = g.createLinearGradient(0, C.y, 0, C.y + C.h * 0.3);
    top.addColorStop(0, '#6a4528'); top.addColorStop(1, '#4a2e1a');
    g.fillStyle = top; g.fillRect(C.x, C.y, C.w, C.h);
    for (let i = 0; i < 40; i++) { g.strokeStyle = 'rgba(30,15,6,0.25)'; g.lineWidth = 1; g.beginPath(); const y = C.y + r() * C.h; g.moveTo(C.x, y); g.bezierCurveTo(C.x + C.w * 0.3, y + 3, C.x + C.w * 0.6, y - 3, C.x + C.w, y + 1); g.stroke(); }
    // cigarette burns
    for (let i = 0; i < 6; i++) {
      const x = C.x + C.w * (0.05 + r() * 0.9), y = C.y + C.h * (0.1 + r() * 0.8);
      g.fillStyle = 'rgba(20,8,2,0.55)'; g.beginPath(); g.ellipse(x, y, 7, 3, r() * 3, 0, 7); g.fill();
      g.fillStyle = 'rgba(60,28,10,0.6)'; g.beginPath(); g.ellipse(x, y, 4, 1.6, r() * 3, 0, 7); g.fill();
    }
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(C.x, C.y, C.w, 3);
    // turntable plinth & speakers
    const tt = L.tt;
    g.fillStyle = '#1c1714'; roundRect(g, tt.x - tt.r * 1.3, tt.y - tt.r * 1.15, tt.r * 2.6, tt.r * 2.3, 6); g.fill();
    g.fillStyle = '#2a2420'; roundRect(g, tt.x - tt.r * 1.26, tt.y - tt.r * 1.11, tt.r * 2.52, tt.r * 2.22, 5); g.fill();
    g.fillStyle = '#0d0b0a'; g.beginPath(); g.arc(tt.x - tt.r * 0.15, tt.y, tt.r * 1.02, 0, 7); g.fill();
    this.paintItems(g);
  }

  paintCalendar(g, c) {
    if (!c) return;
    g.fillStyle = '#f2ece0'; g.fillRect(c.x, c.y, c.w, c.h);
    g.fillStyle = '#7a1d10'; g.font = `700 ${c.h * 0.09}px "Zen Kaku Gothic New", sans-serif`; g.textAlign = 'left'; g.textBaseline = 'top';
    g.fillText('1985 昭和60年', c.x + c.w * 0.06, c.y + c.h * 0.04);
    g.font = `800 ${c.h * 0.16}px "Zen Kaku Gothic New", sans-serif`; g.fillStyle = '#222'; g.textAlign = 'right';
    g.fillText('10', c.x + c.w * 0.94, c.y + c.h * 0.02);
    const days = '日月火水木金土';
    const cw = c.w * 0.88 / 7, x0 = c.x + c.w * 0.06, y0 = c.y + c.h * 0.26, rh = (c.h * 0.6) / 6;
    g.textAlign = 'center'; g.font = `700 ${rh * 0.55}px "Zen Kaku Gothic New", sans-serif`;
    [...days].forEach((d, i) => { g.fillStyle = i === 0 ? '#c42222' : '#333'; g.fillText(d, x0 + cw * (i + 0.5), y0); });
    // 1 Oct 1985 was a Tuesday. 10 Oct: 体育の日.
    for (let d = 1; d <= 31; d++) {
      const idx = d + 1, col = idx % 7, row = Math.floor(idx / 7);
      const x = x0 + cw * (col + 0.5), y = y0 + rh * (row + 1);
      g.fillStyle = col === 0 || d === 10 ? '#c42222' : '#2a2a2a';
      g.font = `400 ${rh * 0.55}px "IBM Plex Mono", monospace`;
      g.fillText(String(d), x, y);
      if (d === 27) { g.strokeStyle = '#d42020'; g.lineWidth = 1.4; g.beginPath(); g.ellipse(x, y + rh * 0.28, cw * 0.48, rh * 0.42, -0.2, 0, 7); g.stroke(); }
    }
    g.fillStyle = '#555'; g.font = `400 ${c.h * 0.06}px "Zen Kaku Gothic New", sans-serif`;
    g.fillText('酒・たばこ 松葉屋', c.x + c.w / 2, c.y + c.h * 0.9);
    g.textBaseline = 'alphabetic';
  }

  paintWall(g) {
    const w = this.L.wall;
    g.fillStyle = '#5a4430'; g.fillRect(w.x, w.y, w.w, w.h);
    g.fillStyle = '#6b5238'; g.fillRect(w.x + 4, w.y + 4, w.w - 8, w.h - 8);
    for (let x = w.x + 10; x < w.x + w.w - 6; x += 9) for (let y = w.y + 10; y < w.y + w.h - 6; y += 9) { g.fillStyle = 'rgba(30,18,8,0.5)'; g.fillRect(x, y, 1.6, 1.6); }
    const head = this.L.land ? w.h * 0.11 : w.h * 0.13;
    g.fillStyle = '#f3ead6'; g.save(); g.translate(w.x + w.w * 0.5, w.y + head * 0.55); g.rotate(-0.015);
    g.fillRect(-w.w * 0.3, -head * 0.42, w.w * 0.6, head * 0.84);
    g.fillStyle = '#2a1a10'; g.font = `400 ${head * 0.5}px "Mochiy Pop One", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('あなたの30枚', 0, 2); g.restore();
    const cols = 6, rows = 5;
    const gx = w.x + w.w * 0.05, gy = w.y + head + 6, gw = w.w * 0.9, gh = w.h - head - 14;
    const cell = Math.min(gw / cols, gh / rows);
    const ox = gx + (gw - cell * cols) / 2;
    this.wallCells = [];
    for (let i = 0; i < 30; i++) {
      const cx = ox + (i % cols) * cell, cy = gy + Math.floor(i / cols) * cell;
      const pad = cell * 0.09;
      const id = this.wall[i];
      this.wallCells.push({ x: cx + pad, y: cy + pad, s: cell - pad * 2 });
      if (id && byId(id)) {
        g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(cx + pad + 2, cy + pad + 3, cell - pad * 2, cell - pad * 2);
        g.drawImage(this.sleeve(byId(id)), cx + pad, cy + pad, cell - pad * 2, cell - pad * 2);
      } else {
        g.setLineDash([3, 3]); g.strokeStyle = 'rgba(243,234,214,0.35)'; g.lineWidth = 1; g.strokeRect(cx + pad, cy + pad, cell - pad * 2, cell - pad * 2); g.setLineDash([]);
        g.fillStyle = 'rgba(243,234,214,0.3)'; g.font = `400 ${cell * 0.2}px "IBM Plex Mono", monospace`; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(String(i + 1).padStart(2, '0'), cx + cell / 2, cy + cell / 2);
      }
    }
    g.textBaseline = 'alphabetic';
  }

  paintBin(g, b, i) {
    const recs = RECORDS.filter((r) => r.bin === i);
    // records' top edges, standing in the crate
    const n = recs.length;
    for (let k = 0; k < Math.min(n, 16); k++) {
      const y = b.y + b.h * 0.08 + k * (b.h * 0.3 / 16);
      const inset = b.w * 0.06 + k * b.w * 0.004;
      g.fillStyle = mix(recs[k % n].d.c[0], '#000000', 0.25 + k * 0.02);
      g.fillRect(b.x + inset, y, b.w - inset * 2, b.h * 0.08);
      g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(b.x + inset, y, b.w - inset * 2, 1);
    }
    // divider tabs
    const artists = [...new Set(recs.map((r) => r.artist))];
    artists.slice(0, 4).forEach((a, k) => {
      const tx = b.x + b.w * (0.12 + k * 0.2), ty = b.y + b.h * 0.02 + k * b.h * 0.07;
      g.fillStyle = '#f3ead6'; g.fillRect(tx, ty, b.w * 0.17, b.h * 0.1);
      g.fillStyle = '#2a1a10'; g.font = `700 ${Math.min(b.h * 0.055, b.w * 0.035)}px "Zen Kaku Gothic New", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(a, tx + b.w * 0.085, ty + b.h * 0.05);
    });
    // crate
    const cg = g.createLinearGradient(0, b.y + b.h * 0.42, 0, b.y + b.h);
    cg.addColorStop(0, '#8a5a32'); cg.addColorStop(1, '#5a381c');
    g.fillStyle = cg; g.fillRect(b.x, b.y + b.h * 0.42, b.w, b.h * 0.58);
    g.fillStyle = 'rgba(0,0,0,0.25)'; [0.6, 0.78].forEach((f) => g.fillRect(b.x, b.y + b.h * f, b.w, 2));
    g.fillStyle = '#f3ead6'; g.fillRect(b.x + b.w * 0.2, b.y + b.h * 0.5, b.w * 0.6, b.h * 0.16);
    g.fillStyle = '#2a1a10'; g.font = `400 ${Math.min(b.h * 0.085, b.w * 0.065)}px "Mochiy Pop One", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(BINS[i].name, b.x + b.w / 2, b.y + b.h * 0.58);
    g.textBaseline = 'alphabetic';
  }

  paintItems(g) {
    const I = this.L.items;
    const box = (r, c) => { g.fillStyle = c; roundRect(g, r.x, r.y, r.w, r.h, Math.min(r.w, r.h) * 0.08); g.fill(); };
    // walkman with orange foam headphones
    const wk = I.walkman;
    box(wk, '#b9bcc0'); g.fillStyle = '#2a3a5a'; g.fillRect(wk.x + wk.w * 0.12, wk.y + wk.h * 0.15, wk.w * 0.76, wk.h * 0.42);
    g.fillStyle = '#d9d2c0'; g.fillRect(wk.x + wk.w * 0.2, wk.y + wk.h * 0.25, wk.w * 0.6, wk.h * 0.2);
    g.strokeStyle = '#1a1a1a'; g.lineWidth = 2; g.beginPath(); g.arc(wk.x + wk.w * 0.5, wk.y - wk.h * 0.05, wk.w * 0.45, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
    g.fillStyle = '#e8762a'; [0.08, 0.92].forEach((f) => { g.beginPath(); g.arc(wk.x + wk.w * f, wk.y + wk.h * 0.02, wk.w * 0.13, 0, 7); g.fill(); });
    // tapes
    const tp = I.tapes;
    ['\'85 夏', '車用', '店用 B'].forEach((lab, k) => {
      const x = tp.x + k * tp.w * 0.06, y = tp.y + k * tp.h * 0.22;
      g.fillStyle = ['#2a2a2a', '#d8d2c4', '#3a4a6a'][k]; g.fillRect(x, y, tp.w * 0.85, tp.h * 0.5);
      g.fillStyle = '#f3ead6'; g.fillRect(x + tp.w * 0.06, y + tp.h * 0.06, tp.w * 0.73, tp.h * 0.18);
      g.fillStyle = '#1a2a8a'; g.font = `400 ${tp.h * 0.15}px "M PLUS Rounded 1c", sans-serif`; g.textAlign = 'left'; g.textBaseline = 'middle';
      g.fillText(lab, x + tp.w * 0.1, y + tp.h * 0.155);
    });
    // matchbook
    const mt = I.match; box(mt, '#1d3a2a'); g.fillStyle = '#e9d9a8'; g.font = `700 ${mt.h * 0.38}px "Shippori Mincho B1", serif`; g.textAlign = 'center';
    g.fillText('ルナ', mt.x + mt.w / 2, mt.y + mt.h * 0.6);
    // ashtray
    const as = I.ash; g.fillStyle = '#8a9aa0'; g.beginPath(); g.ellipse(as.x + as.w / 2, as.y + as.h / 2, as.w / 2, as.h / 2, 0, 0, 7); g.fill();
    g.fillStyle = '#3a3a3e'; g.beginPath(); g.ellipse(as.x + as.w / 2, as.y + as.h / 2, as.w * 0.36, as.h * 0.34, 0, 0, 7); g.fill();
    g.fillStyle = '#efe8da'; g.save(); g.translate(as.x + as.w * 0.5, as.y + as.h * 0.45); g.rotate(-0.3); g.fillRect(0, -1.5, as.w * 0.42, 3); g.fillStyle = '#c96a2a'; g.fillRect(as.w * 0.3, -1.5, as.w * 0.12, 3); g.restore();
    this.emberAt = { x: as.x + as.w * 0.5 + Math.cos(-0.3) * as.w * 0.02, y: as.y + as.h * 0.45 };
    // the note
    const nt = I.note; g.save(); g.translate(nt.x + nt.w / 2, nt.y + nt.h / 2); g.rotate(-0.06);
    g.fillStyle = '#f7f1e2'; g.fillRect(-nt.w / 2, -nt.h / 2, nt.w, nt.h);
    g.fillStyle = '#2a2a6a'; g.font = `400 ${nt.h * 0.14}px "M PLUS Rounded 1c", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('ちょっと出てます', 0, -nt.h * 0.15); g.fillText('―店主', nt.w * 0.15, nt.h * 0.2); g.restore();
    // receipts on a spike
    const rc = I.receipt; g.fillStyle = '#222'; g.fillRect(rc.x + rc.w / 2 - 1, rc.y, 2, rc.h);
    for (let k = 0; k < 4; k++) { g.fillStyle = mix('#efe8d8', '#c8bfa8', k / 4); g.fillRect(rc.x + (k % 2) * 3, rc.y + rc.h * (0.2 + k * 0.12), rc.w * 0.9, rc.h * 0.2); }
    // coffee
    const cf = I.coffee; g.fillStyle = '#efe8da'; g.beginPath(); g.ellipse(cf.x + cf.w / 2, cf.y + cf.h * 0.6, cf.w / 2, cf.h * 0.35, 0, 0, 7); g.fill();
    g.fillStyle = '#f7f2e8'; g.beginPath(); g.ellipse(cf.x + cf.w / 2, cf.y + cf.h * 0.45, cf.w * 0.3, cf.h * 0.22, 0, 0, 7); g.fill();
    g.fillStyle = '#3a1e10'; g.beginPath(); g.ellipse(cf.x + cf.w / 2, cf.y + cf.h * 0.45, cf.w * 0.24, cf.h * 0.16, 0, 0, 7); g.fill();
    g.textBaseline = 'alphabetic';
  }

  // ================================================================ hotspots
  layoutHot() {
    this.hotL.innerHTML = '';
    const L = this.L;
    const mk = (r, label, en, fn, cls = '') => {
      const b = el('button', 'sw-shot ' + cls, this.hotL);
      b.type = 'button';
      Object.assign(b.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' });
      if (label) el('span', 'sw-hot-tag', b, `<b>${label}</b><i>${en}</i>`);
      b.setAttribute('aria-label', `${label || ''} ${en || ''}`);
      b.addEventListener('click', (e) => { e.stopPropagation(); fn(b); }, { signal: this.ctx.signal });
      return b;
    };
    L.bins.forEach((b, i) => mk(b, 'エサ箱', 'Record bin — ' + BINS[i].en, () => this.openDig(i)));
    mk(L.wall, 'あなたの30枚', 'your thirty', () => this.openWall());
    const tt = L.tt;
    mk({ x: tt.x - tt.r * 1.2, y: tt.y - tt.r * 1.1, w: tt.r * 2.4, h: tt.r * 2.2 }, 'ターンテーブル', 'turntable', () => { if (this.playing) this.liftNeedle(); else this.note('turntable'); });
    const exit = L.door || { x: 8, y: 8, w: 92, h: 40 };
    mk(exit, '外へ', 'back to the street', () => this.hooks.exitShop(), L.door ? '' : 'sw-shot-exit');
    Object.entries(L.items).forEach(([k, r]) => mk(r, '', '', (b) => this.note(k, b), 'sw-shot-item'));
    if (L.cal) mk(L.cal, '', '', (b) => this.note('calendar', b), 'sw-shot-item');
    if (L.poster) mk(L.poster, '', '', (b) => this.note('poster', b), 'sw-shot-item');
  }

  note(key, anchor) {
    const n = key === 'turntable'
      ? ['エサ[箱|ばこ|record bin]からレコードを[選|えら|to choose]んで、ここに[置|お|to place]いてください。', 'Pick a record from the bins and put it on here.']
      : NOTES[key];
    if (!n) return;
    this.noteEl.innerHTML = `<div class="jp">${this.ctx.jp.html(n[0])}</div><div class="en">${n[1]}</div>`;
    const r = anchor ? anchor.getBoundingClientRect() : null;
    const pr = this.root.getBoundingClientRect();
    const x = r ? clamp(r.left - pr.left + r.width / 2, 150, this.W - 150) : this.W / 2;
    const y = r ? Math.max(70, r.top - pr.top - 12) : this.H * 0.5;
    this.noteEl.style.left = x + 'px'; this.noteEl.style.top = y + 'px';
    this.noteEl.classList.add('on');
    clearTimeout(this._nt); this._nt = this.ctx.timeout(() => this.noteEl.classList.remove('on'), 6500);
  }

  // ================================================================ digging
  openDig(bi) {
    this.view = 'dig';
    this.binIndex = bi;
    const recs = RECORDS.filter((r) => r.bin === bi);
    const items = [];
    let last = null;
    recs.forEach((r) => { if (r.artist !== last) { items.push({ divider: r.artist, en: r.en }); last = r.artist; } items.push({ rec: r }); });
    this.items = items;
    this.cur = Math.min(1, items.length - 1);
    this.overlay.innerHTML = `
      <div class="sw-dig">
        <div class="sw-dig-head"><span class="jp">${this.ctx.jp.html('エサ[箱|ばこ|“feed box” — record-shop slang for a digging bin]')}：${this.ctx.jp.html(BINS[bi].jp)}</span><span class="en">The bins — ${BINS[bi].enName}</span></div>
        <div class="sw-crate"><div class="sw-stack"></div><div class="sw-crate-front"><span><span class="jp">${BINS[bi].name}</span><span class="en">${BINS[bi].enName}</span></span></div></div>
        <div class="sw-dig-info"></div>
        <div class="sw-dig-help"><span class="jp">${this.ctx.jp.html('スクロール／ドラッグ／← → でめくる　・　クリック／Enter で[取|と|to take]り[出|だ|to take out]す')}</span><span class="en">Scroll, drag or ← → to flip through · click or Enter to pull one out</span></div>
        <button class="sw-x" type="button"><span class="jp">戻る</span><span class="en">Back</span></button>
      </div>`;
    this.overlay.classList.add('on');
    const stack = this.overlay.querySelector('.sw-stack');
    this.cards = items.map((it, i) => {
      const c = el('div', 'sw-card' + (it.divider ? ' divider' : ''), stack);
      if (it.divider) {
        c.innerHTML = `<div class="sw-div-tab">${it.divider}</div><div class="sw-div-en">${it.en}</div>`;
      } else {
        c.appendChild(this.sleeve(it.rec));
        if (it.rec.pop) el('div', 'sw-card-pop', c, `<b><span class="jp">${this.ctx.jp.html(it.rec.pop.head)}</span><span class="en">${it.rec.pop.en ? it.rec.pop.en[0] : ''}</span></b>`).style.setProperty('--pc', it.rec.pop.color);
        el('div', 'sw-card-price', c, `¥${it.rec.used.toLocaleString()}`);
      }
      c.addEventListener('click', (e) => { e.stopPropagation(); if (i === this.cur) this.pull(); else this.go(i - this.cur); }, { signal: this.ctx.signal });
      return c;
    });
    this.overlay.querySelector('.sw-x').addEventListener('click', (e) => { e.stopPropagation(); this.closeOverlay(); }, { signal: this.ctx.signal });
    const crate = this.overlay.querySelector('.sw-crate');
    let acc = 0;
    crate.addEventListener('wheel', (e) => { e.preventDefault(); acc += e.deltaY + e.deltaX; if (Math.abs(acc) > 60) { this.go(Math.sign(acc)); acc = 0; } }, { passive: false, signal: this.ctx.signal });
    let dragY = null;
    crate.addEventListener('pointerdown', (e) => { dragY = e.clientY; }, { signal: this.ctx.signal });
    window.addEventListener('pointermove', (e) => { if (dragY == null) return; const d = e.clientY - dragY; if (Math.abs(d) > 46) { this.go(d > 0 ? 1 : -1); dragY = e.clientY; this.dragged = true; } }, { signal: this.ctx.signal });
    window.addEventListener('pointerup', () => { dragY = null; setTimeout(() => { this.dragged = false; }, 0); }, { signal: this.ctx.signal });
    crate.addEventListener('pointermove', (e) => {
      const r = crate.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5;
      stack.style.transform = `rotateY(${nx * 10}deg) rotateX(${-ny * 6}deg)`;
    }, { signal: this.ctx.signal });
    this.layoutCards(true);
    this.slide();
  }

  go(d) {
    if (this.dragged && d === 0) return;
    const n = clamp(this.cur + d, 0, this.items.length - 1);
    if (n === this.cur) return;
    this.cur = n;
    this.flap(0.8 + Math.random() * 0.4);
    this.layoutCards();
  }

  layoutCards() {
    this.cards.forEach((c, i) => {
      const d = i - this.cur;
      let tf, op = 1, z = 100 - Math.abs(d);
      if (d < 0) { tf = `translate3d(0, 4%, ${40 + d * 6}px) rotateX(-74deg)`; op = d < -2 ? 0 : 0.85; }
      else if (d === 0) tf = 'translate3d(0, -9%, 0) rotateX(-4deg)';
      else { tf = `translate3d(0, ${-d * 2.2}%, ${-d * 26}px) rotateX(${8 + Math.min(d, 6)}deg)`; op = d > 9 ? 0 : 1; c.style.filter = `brightness(${Math.max(0.35, 1 - d * 0.1)})`; }
      if (d <= 0) c.style.filter = d === 0 ? 'none' : 'brightness(0.6)';
      c.style.transform = tf; c.style.opacity = op; c.style.zIndex = z;
      c.classList.toggle('cur', d === 0);
    });
    const it = this.items[this.cur];
    const info = this.overlay.querySelector('.sw-dig-info');
    if (it.divider) info.innerHTML = `<span class="a">${it.divider}</span> <span class="sub">${it.en}</span>`;
    else { const r = it.rec; info.innerHTML = `<span class="a">${r.artist}</span>　<span class="t">${r.title}</span>　<span class="y">${yearOf(r)}</span><span class="sub">${r.en} — ${plainTitle(r)}, ${yearOf(r)}</span>`; }
  }

  pull() {
    const it = this.items[this.cur];
    if (!it || it.divider) return;
    this.slide();
    this.cards[this.cur].classList.add('pulled');
    this.ctx.timeout(() => this.openInspect(it.rec, 'dig'), 320);
  }

  // ================================================================ inspect
  openInspect(rec, from) {
    this.view = 'inspect';
    this.inspectFrom = from;
    this.rec = rec;
    const jp = this.ctx.jp.html;
    const inWall = this.wall.includes(rec.id);
    const held = HELD.includes(rec.id);
    const sideNames = rec.sides || ['A面', 'B面'];
    this.overlay.innerHTML = `
      <div class="sw-insp">
        <div class="sw-sleeve-wrap">
          <div class="sw-sleeve">
            <div class="sw-face front"></div>
            <div class="sw-face back"></div>
            <div class="sw-obi" style="--obi:${rec.d.c[2] && rec.d.k !== 'paperwhite' ? '#f6f1e6' : '#f6f1e6'};--obi-ink:${mix(rec.d.c[0], '#000000', 0.35)}">
              <div class="sw-obi-copy">${jp(rec.obi)}</div>
              <div class="sw-obi-title">${plainTitle(rec)}</div>
              <div class="sw-obi-artist">${rec.artist}</div>
              <div class="sw-obi-price">${rec.price ? `¥${rec.price.toLocaleString()}` : ''}<span>${rec.cat}</span></div>
            </div>
            <div class="sw-sticker"><b>夜光堂</b><span>中古 ・ 帯付</span><em>¥${rec.used.toLocaleString()}</em><small>${jp('[盤質|ばんしつ|disc condition]')} ${rec.cond[0]} / ${jp('ジャケ')} ${rec.cond[1]}</small></div>
            ${rec.promo ? `<div class="sw-promo">${jp('[見本盤|みほんばん|promotional sample copy]')}<br>${jp('[非売品|ひばいひん|not for sale]')}</div>` : ''}
            ${held ? `<div class="sw-hold"><span class="jp">${jp('[取|と|to hold]り[置|お|to keep]き')}<br>デヴァンシュ様</span><span class="en">On hold for<br>Devansh</span></div>` : ''}
            <div class="sw-sheen"></div>
          </div>
        </div>
        <div class="sw-insp-side">
          <div class="sw-insp-artist">${rec.artist}<i>${rec.en}</i></div>
          <div class="sw-insp-title">${rec.title}</div>
          <div class="sw-insp-meta"><span class="jp">${yearOf(rec)}（${jp('[昭和|しょうわ|Shōwa era]')}${showaOf(rec)}年）</span><span class="en">${yearOf(rec)} (Shōwa ${showaOf(rec)})</span> ・ ${rec.label} ・ ${rec.cat}</div>
          <div class="sw-insp-obi en">On the obi: “${rec.obiEn || ''}”</div>
          <div class="sw-insp-cond en">Used, obi intact · ¥${rec.used.toLocaleString()} · disc ${rec.cond[0]} / jacket ${rec.cond[1]}${rec.promo ? ' · promo copy, not for sale' : ''}</div>
          ${rec.pop ? `<div class="sw-pop" style="--pc:${rec.pop.color}"><b><span class="jp">${jp(rec.pop.head)}</span><span class="en">${rec.pop.en ? rec.pop.en[0] : ''}</span></b><p><span class="jp">${jp(rec.pop.body)}</span><span class="en">${rec.pop.en ? rec.pop.en[1] : ''}</span></p><span class="sw-pop-sig"><span class="jp">${jp('[店主|てんしゅ|shop owner]')}</span><span class="en">— the owner</span></span></div>` : ''}
          <div class="sw-insp-btns">
            <button type="button" data-a="playA" class="main"><span class="jp">${jp('A[面|めん|side]をかける')}</span><span class="en">Play side A</span></button>
            <button type="button" data-a="playB"><span class="jp">${jp('B[面|めん|side]をかける')}</span><span class="en">Play side B</span></button>
            <button type="button" data-a="flip"><span class="jp">${jp('[裏|うら|back]を[見|み|to look]る')}</span><span class="en">Turn it over</span></button>
            <button type="button" data-a="wall"><span class="jp">${inWall ? jp('30[枚|まい|(counter for records)]から[外|はず|to remove]す') : jp('あなたの30[枚|まい|(counter for records)]に[入|い|to put in]れる')}</span><span class="en">${inWall ? 'Take it off your wall' : 'Add to your thirty'}</span></button>
            <button type="button" data-a="back"><span class="jp">${jp('[戻|もど|to put back]す')}</span><span class="en">Put it back</span></button>
          </div>
        </div>
      </div>`;
    void sideNames;
    const front = this.overlay.querySelector('.sw-face.front'), back = this.overlay.querySelector('.sw-face.back');
    front.appendChild(this.sleeve(rec, 'front', 720));
    back.appendChild(this.sleeve(rec, 'back', 720));
    const sl = this.overlay.querySelector('.sw-sleeve'), sheen = this.overlay.querySelector('.sw-sheen');
    let flipped = false;
    const flip = () => { flipped = !flipped; sl.classList.toggle('flipped', flipped); this.slide(); };
    sl.addEventListener('click', (e) => { e.stopPropagation(); flip(); }, { signal: this.ctx.signal });
    sl.addEventListener('pointermove', (e) => {
      const r = sl.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5;
      sl.style.setProperty('--ry', `${nx * 12}deg`); sl.style.setProperty('--rx', `${-ny * 10}deg`);
      sheen.style.background = `linear-gradient(${110 + nx * 40}deg, rgba(255,255,255,0) ${30 + ny * 20}%, rgba(255,255,255,0.22) ${45 + nx * 20}%, rgba(255,255,255,0) ${62 + nx * 20}%)`;
    }, { signal: this.ctx.signal });
    this.overlay.querySelectorAll('.sw-insp-btns button').forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation();
      const a = b.dataset.a;
      if (a === 'playA' || a === 'playB') this.play(rec, a === 'playA' ? 'A' : 'B');
      else if (a === 'flip') flip();
      else if (a === 'wall') this.toggleWall(rec);
      else this.backFromInspect();
    }, { signal: this.ctx.signal }));
    this.overlay.classList.add('on');
  }

  backFromInspect() {
    if (this.inspectFrom === 'dig') { const bi = this.binIndex, cur = this.cur; this.openDig(bi); this.cur = cur; this.layoutCards(); }
    else if (this.inspectFrom === 'wall') this.openWall();
    else this.closeOverlay();
  }

  toggleWall(rec) {
    const i = this.wall.indexOf(rec.id);
    if (i >= 0) this.wall.splice(i, 1);
    else if (this.wall.length < 30) this.wall.push(rec.id);
    this.ctx.store.set('wall', this.wall.slice());
    this.paintStatic();
    this.slide();
    this.openInspect(rec, this.inspectFrom);
    if (i < 0) this.ctx.toast(this.ctx.en ? `Your thirty — ${this.wall.length} / 30` : `あなたの30枚 — ${this.wall.length} / 30`);
  }

  // ================================================================ the wall
  openWall() {
    this.view = 'wall';
    const jp = this.ctx.jp.html;
    const filled = this.wall.length;
    this.overlay.innerHTML = `
      <div class="sw-wall">
        <div class="sw-wall-head"><span class="jp">あなたの30枚</span><span class="en t">Your Thirty</span><em>${filled} / 30</em></div>
        <div class="sw-wall-grid"></div>
        <div class="sw-wall-card"><span class="jp">${jp('[三十枚|さんじゅうまい|thirty records]。[一生|いっしょう|a lifetime]かけて、ゆっくり[埋|う|to fill]めてください。[急|いそ|to hurry]がなくていい。[空|あ|to be empty]いている[枠|わく|frame]は、まだ[出会|であ|to meet]っていないだけです。')}</span><span class="en">Thirty records. Fill them slowly, over a lifetime — there’s no hurry. An empty frame is just one you haven’t met yet.</span><span class="sig"><span class="jp">―${jp('[店主|てんしゅ|shop owner]')}</span><span class="en">— the owner</span></span></div>
        <button class="sw-x" type="button"><span class="jp">戻る</span><span class="en">Back</span></button>
      </div>`;
    const grid = this.overlay.querySelector('.sw-wall-grid');
    for (let i = 0; i < 30; i++) {
      const id = this.wall[i];
      const cell = el('button', 'sw-wcell' + (id ? ' full' : ''), grid);
      cell.type = 'button';
      if (id && byId(id)) {
        const rec = byId(id);
        cell.appendChild(this.sleeve(rec));
        if (HELD.includes(id)) el('span', 'sw-wcell-tag', cell, '<span class="jp">取り置き</span><span class="en">on hold</span>');
        cell.setAttribute('aria-label', `${rec.artist} ${rec.title}`);
        cell.addEventListener('click', (e) => { e.stopPropagation(); this.openInspect(rec, 'wall'); }, { signal: this.ctx.signal });
      } else {
        el('span', 'sw-wcell-n', cell, String(i + 1).padStart(2, '0'));
        cell.setAttribute('aria-label', `empty frame ${i + 1}`);
        cell.tabIndex = -1;
      }
    }
    this.overlay.querySelector('.sw-x').addEventListener('click', (e) => { e.stopPropagation(); this.closeOverlay(); }, { signal: this.ctx.signal });
    this.overlay.classList.add('on');
  }

  closeOverlay() {
    this.view = 'room';
    this.overlay.classList.remove('on');
    this.ctx.timeout(() => { if (this.view === 'room') this.overlay.innerHTML = ''; }, 400);
  }

  // ================================================================ turntable
  play(rec, side) {
    this.closeOverlay();
    // switch the cable radio off
    const t = this.ac.currentTime;
    this.radioOut.gain.cancelScheduledValues(t); this.radioOut.gain.setTargetAtTime(0, t, 0.08);
    this.ctx.timeout(() => this.radio.stop(0.05, true), 400);
    this.playing = { rec, side };
    this.okadaT = 0;
    this.labelCv = this.sleeve(rec, 'label' + side, 256);
    this.armTarget = 1;
    this.platterV = 0;
    this.slide();
    this.ctx.timeout(() => {
      if (!this.playing || this.playing.rec !== rec) return;
      this.deck.playSide(sideRecipes(rec, side), { leadIn: 2.2, gap: 3, onEnd: () => this.liftNeedle(true) });
    }, 1100);
    this.renderNP();
  }

  liftNeedle(auto) {
    if (!this.playing) return;
    this.deck.stop(auto ? 0.3 : 0.12);
    this.playing = null;
    this.armTarget = 0;
    this.renderNP();
    this.relaxQuiet();
    this.ctx.timeout(() => { if (!this.playing) this.startRadio(); }, 2500);
  }

  renderNP() {
    const p = this.playing;
    if (!p) { this.np.classList.remove('on'); return; }
    const jp = this.ctx.jp.html;
    const o = p.side === 'A' ? 'B' : 'A';
    this.np.innerHTML = `<div class="sw-np-lab"><span class="jp">${jp('ただいま[演奏中|えんそうちゅう|now playing]')}</span><span class="en">Now playing</span></div><div class="sw-np-t"><span class="jp">${p.rec.artist}『${plainTitle(p.rec)}』 ${p.side}面</span><span class="en">${p.rec.en} — ${plainTitle(p.rec)}, side ${p.side}</span></div>
      <div class="sw-np-btns"><button type="button" data-a="flip"><span class="jp">${o}${jp('[面|めん|side]にする')}</span><span class="en">Flip to side ${o}</span></button><button type="button" data-a="lift"><span class="jp">${jp('[針|はり|the needle]を[上|あ|to raise]げる')}</span><span class="en">Lift the needle</span></button></div>`;
    this.np.querySelector('[data-a=flip]').addEventListener('click', (e) => { e.stopPropagation(); this.deck.stop(0.1); this.play(p.rec, p.side === 'A' ? 'B' : 'A'); }, { signal: this.ctx.signal });
    this.np.querySelector('[data-a=lift]').addEventListener('click', (e) => { e.stopPropagation(); this.liftNeedle(); }, { signal: this.ctx.signal });
    this.np.classList.add('on');
    const tt = this.L.tt;
    if (this.L.land) { this.np.style.left = clamp(tt.x - 130, 8, this.W - 270) + 'px'; this.np.style.top = Math.max(8, tt.y - tt.r * 1.25 - 96) + 'px'; }
    else { this.np.style.left = clamp(tt.x - 130, 8, this.W - 270) + 'px'; this.np.style.top = (this.L.counter.y - 96) + 'px'; }
  }

  // ================================================================ the light
  updateLight(dt) {
    const p = this.playing;
    const listening = p && p.rec.okada && this.deck.state === 'playing' && this.visible && this.view !== 'dig' && !document.hidden;
    if (listening) this.okadaT += dt;
    if (this.lightStage === 0 && this.okadaT > 42 && !this.ctx.hasOrb()) {
      this.lightStage = 1;
      this.quietTarget = 1;
      const t = this.ac.currentTime;
      this.amb.gain.setTargetAtTime(0.05, t, 3);
      this.rainG.gain.setTargetAtTime(2.2, t, 4);
      this.room.gain.setTargetAtTime(1.15, t, 4);
      this.hooks.dimExit(true);
    }
    if (this.lightStage === 1 && this.okadaT > 56) {
      this.lightStage = 2;
      this.hooks.caption([
        ['STAMP', 'STAMP'],
        ['このレコードは、[四十一年|よんじゅういちねん|forty-one years]かけて、あなたのところまで[回|まわ|to turn; to come around (to someone)]ってきた。', 'This record took forty-one years to come around to you.'],
      ], 9000);
      this.ctx.timeout(() => { this.ctx.award(LIGHT_LABEL); this.hooks.dimExit(false); }, 3200);
      this.ctx.timeout(() => this.relaxQuiet(), 16000);
    }
    if (this.lightStage === 1 && !listening && this.okadaT > 0 && !p) { this.lightStage = 0; this.relaxQuiet(); }
  }

  relaxQuiet() {
    this.quietTarget = this.lightStage >= 2 ? 0.25 : 0;
    const t = this.ac.currentTime;
    this.amb.gain.setTargetAtTime(this.lightStage >= 2 ? 0.6 : 1, t, 3);
    this.rainG.gain.setTargetAtTime(1, t, 4);
    this.room.gain.setTargetAtTime(1, t, 3);
    this.hooks.dimExit(false);
  }

  // ================================================================ frame
  frame(t, dt) {
    if (!this.visible) return;
    this.t += dt;
    this.updateLight(dt);
    this.quiet = lerp(this.quiet, this.quietTarget, Math.min(1, dt * 0.35));
    const g = this.g, W = this.W, H = this.H, L = this.L, rs = this.rs;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    g.drawImage(this.static, 0, 0);
    g.setTransform(rs, 0, 0, rs, 0, 0);
    // rain on the window glass (heavier when the shop goes quiet)
    if (L.win) {
      const w = L.win;
      g.save(); g.beginPath(); g.rect(w.x, w.y, w.w, w.h); g.clip();
      g.strokeStyle = 'rgba(200,215,235,0.28)'; g.lineWidth = 1;
      g.beginPath();
      const n = Math.floor(this.rain.length * (0.55 + this.quiet * 0.45));
      for (let i = 0; i < n; i++) {
        const d = this.rain[i];
        d.y += d.v * dt * (1 + this.quiet); if (d.y > 1.1) { d.y = -0.1; d.x = Math.random(); }
        const x = w.x + d.x * w.w, y = w.y + d.y * w.h;
        g.moveTo(x, y); g.lineTo(x + 0.5, y + d.l * w.h);
      }
      g.stroke();
      g.restore();
    }
    // clock
    const now = new Date(), C = L.clock;
    g.fillStyle = '#efe6d2'; g.beginPath(); g.arc(C.x, C.y, C.r, 0, 7); g.fill();
    g.strokeStyle = '#4a3322'; g.lineWidth = C.r * 0.12; g.stroke();
    const ha = ((now.getHours() % 12) + now.getMinutes() / 60) * Math.PI / 6, ma = (now.getMinutes() + now.getSeconds() / 60) * Math.PI / 30, sa = now.getSeconds() * Math.PI / 30;
    g.strokeStyle = '#1a1a1a'; g.lineCap = 'round';
    g.lineWidth = C.r * 0.09; g.beginPath(); g.moveTo(C.x, C.y); g.lineTo(C.x + Math.sin(ha) * C.r * 0.5, C.y - Math.cos(ha) * C.r * 0.5); g.stroke();
    g.lineWidth = C.r * 0.06; g.beginPath(); g.moveTo(C.x, C.y); g.lineTo(C.x + Math.sin(ma) * C.r * 0.78, C.y - Math.cos(ma) * C.r * 0.78); g.stroke();
    g.strokeStyle = '#a42a2a'; g.lineWidth = 1; g.beginPath(); g.moveTo(C.x, C.y); g.lineTo(C.x + Math.sin(sa) * C.r * 0.85, C.y - Math.cos(sa) * C.r * 0.85); g.stroke();
    g.lineCap = 'butt';
    // turntable
    this.drawTurntable(g, dt);
    // cigarette smoke
    if (this.emberAt) {
      if (Math.random() < dt * 2.5) this.smoke.push({ x: 0, y: 0, life: 0, vx: (Math.random() - 0.5) * 5, r: 2 });
      this.smoke.forEach((s) => { s.life += dt; s.y -= dt * 14; s.x += dt * s.vx + Math.sin(s.life * 2 + s.vx) * 0.3; s.r += dt * 4; });
      this.smoke = this.smoke.filter((s) => s.life < 4);
      const e = this.emberAt;
      g.globalCompositeOperation = 'lighter';
      g.drawImage(glow('#ff6a2a', 16, 1.5), e.x + this.L.items.ash.w * 0.1 - 4, e.y - 4, 8, 8);
      g.globalCompositeOperation = 'source-over';
      this.smoke.forEach((s) => { g.globalAlpha = 0.09 * (1 - s.life / 4); g.drawImage(glow('#d8d2e0', 16, 1.4), e.x + s.x - s.r, e.y + s.y - s.r, s.r * 2, s.r * 2); });
      g.globalAlpha = 1;
    }
    // light: green fluorescent wash over the bins, warm pool over the counter; the quiet dims the tubes
    const q = this.quiet;
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.16 * (1 - q * 0.9) * (0.97 + 0.03 * Math.sin(t * 120));
    g.drawImage(glow('#9fe8c8', 64, 1.2), L.table.x - L.table.w * 0.1, -H * 0.2, L.table.w * 1.2, H * 1.2);
    g.globalAlpha = 0.22 + q * 0.18;
    const tt = L.tt;
    g.drawImage(glow('#ffb060', 64, 1.4), tt.x - tt.r * 3.2, tt.y - tt.r * 3.4, tt.r * 6.4, tt.r * 5.4);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    // the room darkens around the record when it goes quiet
    if (q > 0.01) {
      const rad = g.createRadialGradient(tt.x, tt.y, tt.r * 1.2, tt.x, tt.y, Math.max(W, H) * 0.9);
      rad.addColorStop(0, 'rgba(0,0,0,0)'); rad.addColorStop(1, `rgba(4,3,6,${0.72 * q})`);
      g.fillStyle = rad; g.fillRect(0, 0, W, H);
    }
    // grade & grain & vignette
    g.setTransform(1, 0, 0, 1, 0, 0);
    const cw = this.cv.width, ch = this.cv.height;
    g.globalCompositeOperation = 'soft-light';
    const gr = g.createLinearGradient(0, 0, cw, ch);
    gr.addColorStop(0, 'rgba(40,110,90,0.35)'); gr.addColorStop(1, 'rgba(180,100,40,0.35)');
    g.fillStyle = gr; g.fillRect(0, 0, cw, ch);
    g.globalCompositeOperation = 'overlay'; g.globalAlpha = 0.14;
    const go = (Math.floor(this.t * 24) * 53) % 160;
    const gp = g.createPattern(this.grain[Math.abs(Math.floor(this.t * 24)) % 3] || this.grain[0], 'repeat');
    if (gp) { g.fillStyle = gp; g.translate(-go, -go); g.fillRect(go, go, cw, ch); } g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    const v = g.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.35, cw / 2, ch / 2, Math.hypot(cw, ch) * 0.6);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)');
    g.fillStyle = v; g.fillRect(0, 0, cw, ch);
  }

  drawTurntable(g, dt) {
    const tt = this.L.tt, cx = tt.x - tt.r * 0.15, cy = tt.y, R = tt.r * 0.95;
    const spinning = this.playing && this.arm > 0.6;
    this.platterV = lerp(this.platterV, this.playing ? (Math.PI * 2 * 33.333) / 60 : 0, Math.min(1, dt * (this.playing ? 1.5 : 0.6)));
    this.platterA += this.platterV * dt;
    // platter rim with strobe dots
    g.fillStyle = '#2b2b2e'; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill();
    g.fillStyle = '#9a9aa0';
    for (let i = 0; i < 48; i++) { const a = this.platterA + i * Math.PI / 24; g.fillRect(cx + Math.cos(a) * R * 0.97 - 1, cy + Math.sin(a) * R * 0.97 - 1, 2, 2); }
    if (this.playing && this.labelCv) {
      // the record: grooves, sheen, spinning label
      g.fillStyle = '#0a0a0b'; g.beginPath(); g.arc(cx, cy, R * 0.92, 0, 7); g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.05)'; g.lineWidth = 0.6;
      for (let rr = R * 0.38; rr < R * 0.9; rr += R * 0.018) { g.beginPath(); g.arc(cx, cy, rr, 0, 7); g.stroke(); }
      g.save(); g.globalCompositeOperation = 'lighter';
      const sh = g.createConicGradient ? g.createConicGradient(-0.6, cx, cy) : null;
      if (sh) { sh.addColorStop(0, 'rgba(255,220,180,0)'); sh.addColorStop(0.08, 'rgba(255,220,180,0.12)'); sh.addColorStop(0.16, 'rgba(255,220,180,0)'); sh.addColorStop(0.5, 'rgba(255,220,180,0)'); sh.addColorStop(0.58, 'rgba(255,220,180,0.08)'); sh.addColorStop(0.66, 'rgba(255,220,180,0)'); g.fillStyle = sh; g.beginPath(); g.arc(cx, cy, R * 0.92, 0, 7); g.fill(); }
      g.restore();
      g.save(); g.translate(cx, cy); g.rotate(this.platterA);
      g.drawImage(this.labelCv, -R * 0.34, -R * 0.34, R * 0.68, R * 0.68);
      g.restore();
    } else {
      g.fillStyle = '#18181a'; g.beginPath(); g.arc(cx, cy, R * 0.9, 0, 7); g.fill();
      g.fillStyle = '#c9c9cc'; g.beginPath(); g.arc(cx, cy, R * 0.03, 0, 7); g.fill();
    }
    // tonearm: rests outside, swings to the lead-in, creeps inward with the side
    this.arm = lerp(this.arm, this.armTarget, Math.min(1, dt * 1.8));
    const prog = this.playing ? this.deck.progress() : 0;
    const px = cx + R * 1.12, py = cy - R * 0.82;
    const restA = Math.PI * 0.52, inA = Math.PI * 0.62 + prog * 0.32;
    const a = lerp(restA, inA, this.arm);
    const len = R * 1.25;
    const lift = this.playing && this.deck.state !== 'idle' && this.arm > 0.95 ? 0 : 1;
    g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = R * 0.05;
    g.beginPath(); g.moveTo(px + 4, py + 6); g.lineTo(px + Math.cos(a) * len + 4 + lift * 6, py + Math.sin(a) * len + 6 + lift * 6); g.stroke();
    g.strokeStyle = '#d6d6da'; g.lineWidth = R * 0.035;
    g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(a) * len, py + Math.sin(a) * len); g.stroke();
    g.fillStyle = '#2a2a2e'; g.save(); g.translate(px + Math.cos(a) * len, py + Math.sin(a) * len); g.rotate(a + 0.3); g.fillRect(-R * 0.03, -R * 0.06, R * 0.14, R * 0.12); g.restore();
    g.fillStyle = '#3a3a3e'; g.beginPath(); g.arc(px, py, R * 0.1, 0, 7); g.fill();
    // pitch lamp
    g.fillStyle = spinning ? '#ff3a2a' : '#4a1a14'; g.beginPath(); g.arc(tt.x + tt.r * 1.1, tt.y + tt.r * 0.95, 2.5, 0, 7); g.fill();
    // now-playing stand: the sleeve propped up beside the deck
    if (this.playing) {
      const s = tt.r * 0.9;
      const sx = this.L.land ? tt.x - tt.r * 2.5 : tt.x + tt.r * 1.25, sy = this.L.land ? tt.y - tt.r * 1.25 : tt.y - tt.r * 1.05;
      g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(sx + 4, sy + 5, s, s);
      g.drawImage(this.sleeve(this.playing.rec), sx, sy, s, s);
    }
  }

  // ================================================================ input & visibility
  bind() {
    window.addEventListener('keydown', (e) => {
      if (!this.visible) return;
      if (this.view === 'dig') {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); this.go(1); }
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); this.go(-1); }
        else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.pull(); }
        else if (e.key === 'Backspace') { e.preventDefault(); this.closeOverlay(); }
      } else if (this.view === 'inspect') {
        if (e.key === 'Backspace' || e.key === 'ArrowLeft') { e.preventDefault(); this.backFromInspect(); }
        else if (e.key === 'Enter') { e.preventDefault(); this.play(this.rec, 'A'); }
        else if (e.key === 'f' || e.key === ' ') { e.preventDefault(); const sl = this.overlay.querySelector('.sw-sleeve'); if (sl) sl.click(); }
      } else if (this.view === 'wall' && e.key === 'Backspace') { e.preventDefault(); this.closeOverlay(); }
    }, { signal: this.ctx.signal });
    this.overlay.addEventListener('click', (e) => { if (e.target === this.overlay) { if (this.view === 'inspect') this.backFromInspect(); else this.closeOverlay(); } }, { signal: this.ctx.signal });
  }

  setVisible(v) {
    this.visible = v;
    this.root.style.display = v ? '' : 'none';
    const t = this.ac.currentTime;
    this.bus.gain.cancelScheduledValues(t);
    this.bus.gain.setTargetAtTime(v ? 1 : 0, t, v ? 0.5 : 0.3);
    if (v) { this.doorBell(); this.renderNP(); }
    else { this.noteEl.classList.remove('on'); if (this.view !== 'room') this.closeOverlay(); }
  }

  // the music node, for leaking out into the street
  get musicNode() { return this.music; }

  dispose() {
    this.deck.dispose(); this.radio.dispose();
    this.loops.forEach((l) => { try { l.stop(); } catch (e) {} });
    try { this.bus.disconnect(); this.music.disconnect(); } catch (e) {}
  }
}
