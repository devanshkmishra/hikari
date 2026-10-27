// 公衆電話: lift the receiver, drop a 10-yen coin, dial. 117 tells you the time, 177 the weather.
// Any seven-digit Tokyo number rings… and nobody answers.

import { el, kanjiNum } from './util.js';

const DTMF = { 1: [697, 1209], 2: [697, 1336], 3: [697, 1477], 4: [770, 1209], 5: [770, 1336], 6: [770, 1477], 7: [852, 1209], 8: [852, 1336], 9: [852, 1477], '*': [941, 1209], 0: [941, 1336], '#': [941, 1477] };

export class Phone {
  constructor(parent, ctx, hooks) {
    this.ctx = ctx; this.ac = ctx.audio.ac; this.audio = ctx.audio; this.hooks = hooks;
    this.out = this.ac.createGain(); this.out.gain.value = 0.5;
    const bp = this.ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 0.5;
    this.out.connect(bp).connect(ctx.out);
    this.root = el('div', 'sw-phone', parent);
    this.root.innerHTML = `
      <div class="sw-ph-body">
        <button class="sw-ph-hand" type="button" aria-label="受話器 receiver"><span></span></button>
        <div class="sw-ph-face">
          <div class="sw-ph-top"><span class="sw-ph-slot"></span><span class="sw-ph-lcd">--</span></div>
          <div class="sw-ph-keys"></div>
          <div class="sw-ph-ret">返却口<span class="en"> · coin return</span></div>
        </div>
        <button class="sw-ph-coins" type="button" aria-label="10円玉 ten-yen coin"><i></i><i></i><i></i><i></i></button>
      </div>
      <div class="sw-ph-side">
        <div class="sw-ph-dial"></div>
        <div class="sw-ph-msg"></div>
        <div class="sw-ph-hint"></div>
        <button class="sw-ph-close" type="button"><span class="jp">受話器を置いて、出る</span><span class="en">Hang up and step out</span></button>
      </div>`;
    const keys = this.root.querySelector('.sw-ph-keys');
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].forEach((k) => {
      const b = el('button', 'sw-ph-key', keys, k); b.type = 'button';
      b.addEventListener('click', () => this.press(k), { signal: ctx.signal });
    });
    this.$ = (s) => this.root.querySelector(s);
    this.$('.sw-ph-hand').addEventListener('click', () => (this.state === 'onhook' ? this.lift() : this.hang()), { signal: ctx.signal });
    this.$('.sw-ph-coins').addEventListener('click', () => this.coin(), { signal: ctx.signal });
    this.$('.sw-ph-close').addEventListener('click', () => this.close(), { signal: ctx.signal });
    window.addEventListener('keydown', (e) => {
      if (!this.open) return;
      if (DTMF[e.key] && this.state !== 'onhook') this.press(e.key);
      if (e.key === 'Backspace') { e.preventDefault(); this.close(); }
    }, { signal: ctx.signal });
    ctx.jp.attach(this.root);
    this.state = 'onhook';
    this.open = false;
    this.timers = [];
  }

  later(fn, ms) { const t = this.ctx.timeout(fn, ms); this.timers.push(t); }
  clearTimers() { this.timers.forEach(clearTimeout); this.timers = []; }

  show() { this.open = true; this.root.classList.add('on'); this.reset(); this.hint('[受話器|じゅわき|telephone receiver]を[取|と|to pick up]る', 'pick up the receiver'); }
  close() { this.hang(true); this.open = false; this.root.classList.remove('on'); this.hooks.onClose(); }

  reset() { this.digits = ''; this.paid = false; this.$('.sw-ph-dial').textContent = ''; this.$('.sw-ph-msg').innerHTML = ''; this.$('.sw-ph-lcd').textContent = '--'; }
  hint(jp, en) { this.$('.sw-ph-hint').innerHTML = `<span class="jp">${this.ctx.jp.html(jp)}</span><span class="en">${en || ''}</span>`; }
  msg(jp, en) { this.$('.sw-ph-msg').innerHTML = `<span class="jp">${this.ctx.jp.html(jp)}</span><span class="en">${en || ''}</span>`; }

  // ------------------------------------------------------------- sounds
  tone(freqs, dur, gain = 0.12, t0 = 0) {
    const ac = this.ac, t = ac.currentTime + t0;
    const g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.005);
    if (dur < 50) { g.gain.setValueAtTime(gain, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + 0.01); }
    g.connect(this.out);
    const os = freqs.map((f) => { const o = ac.createOscillator(); o.frequency.value = f; o.connect(g); o.start(t); if (dur < 50) o.stop(t + dur + 0.05); return o; });
    return { stop: () => { const n = ac.currentTime; g.gain.cancelScheduledValues(n); g.gain.setValueAtTime(g.gain.value, n); g.gain.linearRampToValueAtTime(0, n + 0.02); os.forEach((o) => { try { o.stop(n + 0.05); } catch (e) {} }); } };
  }
  clunk(v = 0.3) {
    const ac = this.ac, t = ac.currentTime;
    const s = ac.createBufferSource(); s.buffer = this.audio.noise('brown');
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
    const g = ac.createGain(); g.gain.setValueAtTime(v, t); g.gain.setTargetAtTime(0, t, 0.03);
    s.connect(f).connect(g).connect(this.ctx.out); s.start(t, Math.random()); s.stop(t + 0.2);
  }
  clink(times = 3) {
    const ac = this.ac;
    for (let i = 0; i < times; i++) {
      const t = ac.currentTime + i * (0.07 + Math.random() * 0.05);
      [3100, 4700, 6900].forEach((f, k) => {
        const o = ac.createOscillator(); o.frequency.value = f * (1 + Math.random() * 0.02);
        const g = ac.createGain(); g.gain.setValueAtTime(0.05 / (k + 1), t); g.gain.setTargetAtTime(0, t, 0.04);
        o.connect(g).connect(this.ctx.out); o.start(t); o.stop(t + 0.3);
      });
    }
  }

  // ------------------------------------------------------------- flow
  lift() {
    this.clunk(); this.state = 'offhook'; this.root.classList.add('lifted');
    this.hint('10[円玉|えんだま|coin (yen)]を[入|い|to put in]れる', 'insert a 10-yen coin');
  }
  coin() {
    if (this.state === 'onhook' || this.paid) return;
    this.clink(2); this.paid = true; this.$('.sw-ph-lcd').textContent = '10';
    this.root.classList.add('paid');
    this.dial = this.tone([400], 99, 0.07);
    this.state = 'dialtone';
    this.hint('[番号|ばんごう|number]を[押|お|to press]す　（117・177・[七桁|ななけた|seven digits]）', 'dial — try 117, 177, or any seven digits');
  }
  hang(silent) {
    this.clearTimers();
    if (this.dial) { this.dial.stop(); this.dial = null; }
    if (this.loop) { this.loop.stop(); this.loop = null; }
    if (this.state !== 'onhook' && !silent) this.clunk(0.4);
    if (this.paid && !this.consumed) { this.clink(3); if (!silent) this.msg('10[円|えん|yen]が[戻|もど|to come back]ってきた。', 'The ten yen comes back.'); }
    this.state = 'onhook'; this.consumed = false; this.paid = false;
    this.root.classList.remove('lifted', 'paid');
    this.digits = ''; this.$('.sw-ph-dial').textContent = ''; this.$('.sw-ph-lcd').textContent = '--';
    if (!silent) this.hint('[受話器|じゅわき|telephone receiver]を[取|と|to pick up]る', 'pick up the receiver');
  }
  press(k) {
    if (!this.open) return;
    if (this.state === 'onhook') return;
    this.tone(DTMF[k], 0.11, 0.08);
    if (!this.paid) { this.hint('[先|さき|first]に10[円玉|えんだま|coin]を', 'a coin first'); return; }
    if (this.state !== 'dialtone' && this.state !== 'dialing') return;
    if (this.dial) { this.dial.stop(); this.dial = null; }
    this.state = 'dialing';
    this.digits += k;
    this.$('.sw-ph-dial').textContent = this.digits;
    this.clearTimers();
    if (this.digits === '117' || this.digits === '177') { this.later(() => this.connect(this.digits), 900); return; }
    if (/^1(10|19|18)$/.test(this.digits)) { this.later(() => this.busy(), 700); return; }
    if (this.digits.length >= 7) { this.later(() => this.ring(), 900); return; }
    this.later(() => this.notInService(), 4200);
  }
  busy() { this.state = 'busy'; this.beepLoop([400], 0.5, 0.5); }
  beepLoop(freqs, on, off) {
    let alive = true;
    const go = () => { if (!alive) return; this.tone(freqs, on, 0.07); this.later(go, (on + off) * 1000); };
    go();
    this.loop = { stop: () => { alive = false; } };
  }
  notInService() {
    this.state = 'msg';
    this.msg('おかけになった[電話番号|でんわばんごう|telephone number]は、[現在|げんざい|at present][使|つか|to use]われておりません。', 'The number you have dialled is not in service.');
    this.later(() => this.busy(), 3500);
  }
  ring() {
    this.state = 'ring'; this.consumed = false;
    let n = 0, alive = true;
    const ac = this.ac;
    const once = () => {
      if (!alive) return;
      // Japanese ringback: 400 Hz shaped by 16 Hz, one second on, two off
      const t = ac.currentTime;
      const o = ac.createOscillator(); o.frequency.value = 400;
      const am = ac.createOscillator(); am.frequency.value = 16;
      const amg = ac.createGain(); amg.gain.value = 0.035;
      const g = ac.createGain(); g.gain.value = 0.035;
      am.connect(amg).connect(g.gain);
      g.gain.setValueAtTime(0.035, t); g.gain.setValueAtTime(0, t + 1);
      o.connect(g).connect(this.out); o.start(t); am.start(t); o.stop(t + 1.05); am.stop(t + 1.05);
      n++;
      if (n === 6) this.msg('……[誰|だれ|nobody]も[出|で|to answer (the phone)]ない。', '…No one picks up.');
      this.later(once, 3000);
    };
    once();
    this.loop = { stop: () => { alive = false; } };
  }
  connect(num) {
    this.consumed = true; this.$('.sw-ph-lcd').textContent = '0';
    if (num === '177') {
      this.state = 'msg';
      const lines = [
        ['[東京地方|とうきょうちほう|the Tokyo area]の[天気予報|てんきよほう|weather forecast]をお[知|し|to know]らせします。', 'Here is the forecast for the Tokyo area.'],
        ['[今夜|こんや|tonight]は[雨|あめ|rain]。[明|あ|dawn]け[方|がた|around (dawn)]には[上|あ|to stop (rain)]がるでしょう。', 'Rain tonight, clearing towards dawn.'],
        ['[明日|あす|tomorrow]は[晴|は|fine weather]れ。[空気|くうき|the air]が[澄|す|to be clear]んで、[遠|とお|far]くまでよく[見|み|to see]えるでしょう。', 'Tomorrow, fine. The air will be clear; you will see a long way.'],
      ];
      lines.forEach((l, i) => this.later(() => this.msg(...l), i * 4200));
      this.later(() => this.busy(), lines.length * 4200 + 600);
      return;
    }
    // 117: the speaking clock, with its pips
    this.state = 'msg';
    const sayNext = () => {
      if (this.state !== 'msg') return;
      const now = new Date();
      const target = new Date(Math.ceil((now.getTime() + 4000) / 10000) * 10000);
      const h = target.getHours(), m = target.getMinutes(), s = target.getSeconds();
      const h12 = h % 12;
      const sec = s === 0 ? '' : `${kanjiNum(s)}[秒|びょう|seconds]`;
      this.msg(`${h < 12 ? '[午前|ごぜん|a.m.]' : '[午後|ごご|p.m.]'}${h12 === 0 ? '零' : kanjiNum(h12)}[時|じ|o’clock]${m === 0 ? '' : kanjiNum(m) + '[分|ふん|minutes]'}${sec}を、お[知|し|to inform]らせします。`,
        `At the tone, it will be ${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} and ${s} seconds.`);
      const dt = (target.getTime() - now.getTime()) / 1000;
      [3, 2, 1].forEach((k) => { if (dt - k > 0) this.tone([440], 0.1, 0.09, dt - k); });
      this.tone([880], 0.7, 0.09, dt);
      this.later(sayNext, dt * 1000 + 1500);
    };
    sayNext();
  }
}
