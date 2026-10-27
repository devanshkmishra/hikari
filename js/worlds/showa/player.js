// The deck: schedules a composed song onto the Band with a look-ahead clock, and (for vinyl)
// runs it through wow & flutter, a cutting-lathe tone, and a needle that hears dust.

import { Band } from './synth.js';
import { compose } from './composer.js';

let CRACKLE = null;
function crackleBuffer(ac) {
  if (CRACKLE && CRACKLE.sampleRate === ac.sampleRate) return CRACKLE;
  const sr = ac.sampleRate, sec = 7, n = sr * sec;
  const b = ac.createBuffer(2, n, sr);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    // fine surface fizz
    let lp = 0;
    for (let i = 0; i < n; i++) { lp += 0.25 * ((Math.random() * 2 - 1) - lp); d[i] = lp * 0.012; }
    // ticks and pops (same in both channels mostly, like real dust)
    const rnd = (() => { let s = 12345 + c * 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
    let t = 0;
    while (t < n) {
      t += Math.floor(-Math.log(1 - Math.random()) * sr / 22);
      if (t >= n) break;
      const big = Math.random() < 0.06;
      const amp = (big ? 0.35 + Math.random() * 0.35 : 0.04 + Math.pow(Math.random(), 3) * 0.2) * (Math.random() < 0.5 ? -1 : 1);
      const len = big ? 40 + Math.floor(Math.random() * 80) : 4 + Math.floor(Math.random() * 14);
      for (let k = 0; k < len && t + k < n; k++) {
        d[t + k] += amp * Math.exp(-k / (len * 0.25)) * (k % 2 ? -0.6 : 1);
      }
      void rnd;
    }
  }
  CRACKLE = b;
  return b;
}

export class Deck {
  constructor(audio, dest, { vinyl = true } = {}) {
    this.audio = audio;
    const ac = this.ac = audio.ac;
    this.vinyl = vinyl;
    this.out = ac.createGain(); this.out.gain.value = 0.5; this.out.connect(dest);
    this.musicIn = ac.createGain();
    this.songGain = ac.createGain(); this.songGain.gain.value = 1;
    this.musicIn.connect(this.songGain);
    this.loops = [];
    if (vinyl) {
      const wow = ac.createDelay(0.1); wow.delayTime.value = 0.012;
      const l1 = ac.createOscillator(); l1.frequency.value = 0.555; // once per revolution, 33⅓
      const g1 = ac.createGain(); g1.gain.value = 0.0007;
      const l2 = ac.createOscillator(); l2.frequency.value = 6.2;
      const g2 = ac.createGain(); g2.gain.value = 0.00006;
      l1.connect(g1).connect(wow.delayTime); l2.connect(g2).connect(wow.delayTime);
      l1.start(); l2.start(); this.loops.push(l1, l2);
      const ls = ac.createBiquadFilter(); ls.type = 'lowshelf'; ls.frequency.value = 140; ls.gain.value = 2;
      const hs = ac.createBiquadFilter(); hs.type = 'highshelf'; hs.frequency.value = 8000; hs.gain.value = -4.5;
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 12500;
      const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 30;
      this.songGain.connect(wow).connect(ls).connect(hs).connect(lp).connect(hp).connect(this.out);

      this.needleOut = ac.createGain(); this.needleOut.gain.value = 1.6; this.needleOut.connect(this.out);
      this.needle = ac.createGain(); this.needle.gain.value = 0; this.needle.connect(this.needleOut);
      const cr = ac.createBufferSource(); cr.buffer = crackleBuffer(ac); cr.loop = true;
      const crf = ac.createBiquadFilter(); crf.type = 'highpass'; crf.frequency.value = 500;
      const crg = ac.createGain(); crg.gain.value = 0.55;
      cr.connect(crf).connect(crg).connect(this.needle); cr.start();
      const hum = audio.noiseLoop(this.needle, { kind: 'brown', type: 'lowpass', freq: 70, q: 0.6, gain: 0.05 });
      this.loops.push(cr, { stop: () => hum.stop() });
    } else {
      this.songGain.connect(this.out);
    }
    this.band = null;
    this.state = 'idle';
    this.tracks = [];
    this.track = -1;
    this.hiddenSince = null;
    this.onEnd = null;
    this.revT = 0;
  }

  get playing() { return this.state !== 'idle'; }

  // Play a list of recipes (one record side) or a single endless rotation (radio).
  playSide(recipes, { leadIn = 1.8, gap = 2.6, onEnd = null, onTrack = null } = {}) {
    this.stop(0.02, true);
    const ac = this.ac, now = ac.currentTime;
    this.tracks = recipes.map((rc) => ({ rc, song: null }));
    this.gap = gap;
    this.onEnd = onEnd; this.onTrack = onTrack;
    this.band = new Band(this.audio, this.musicIn);
    this.songGain.gain.cancelScheduledValues(now);
    this.songGain.gain.setValueAtTime(1, now);
    this.startedAt = now;
    if (this.vinyl) {
      this.needleDrop(now);
      this.needle.gain.cancelScheduledValues(now);
      this.needle.gain.setValueAtTime(0, now);
      this.needle.gain.linearRampToValueAtTime(0.9, now + 0.05);
      this.revT = now + 0.3;
    }
    this.track = -1;
    this.state = 'leadin';
    this.nextStart = now + leadIn;
    this.loadTrack(0);
  }

  loadTrack(k) {
    if (k >= this.tracks.length) { this.state = 'runout'; this.runoutAt = this.ac.currentTime; return; }
    const tr = this.tracks[k];
    if (!tr.song) tr.song = compose(tr.rc);
    this.band.prepare(tr.song.plucks);
    this.track = k;
    this.song = tr.song;
    this.t0 = this.nextStart;
    this.ei = 0;
    this.state = 'playing';
    const now = this.ac.currentTime;
    this.songGain.gain.cancelScheduledValues(now);
    this.songGain.gain.setValueAtTime(this.songGain.gain.value, now);
    this.songGain.gain.linearRampToValueAtTime(1, now + 0.05);
    if (this.song.fade) {
      const sd = this.song.stepDur;
      this.songGain.gain.setValueAtTime(1, this.t0 + this.song.fade.from * sd);
      this.songGain.gain.linearRampToValueAtTime(0.0001, this.t0 + this.song.fade.to * sd);
    }
    if (this.onTrack) this.onTrack(k, this.song);
  }

  songLength(song) { return song.lengthSteps * song.stepDur + (song.fade ? 0 : 2.5); }

  // estimated progress through the side, 0..1 (for the tonearm)
  progress() {
    if (!this.tracks.length) return 0;
    const now = this.ac.currentTime;
    const est = (tr) => (tr.song ? this.songLength(tr.song) : 170) + this.gap;
    let total = 0; this.tracks.forEach((tr) => { total += est(tr); });
    let done = 0;
    for (let i = 0; i < Math.max(0, this.track); i++) done += est(this.tracks[i]);
    if (this.state === 'leadin') return 0;
    if (this.state === 'runout') return 1;
    done += Math.max(0, now - this.t0);
    return Math.min(1, done / total);
  }

  elapsed() { return this.state === 'idle' ? 0 : this.ac.currentTime - this.startedAt; }

  needleDrop(t) {
    const ac = this.ac, dest = this.out;
    const o = ac.createOscillator(); o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.12);
    const g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.35, t + 0.004); g.gain.setTargetAtTime(0, t + 0.01, 0.05);
    o.connect(g).connect(dest); o.start(t); o.stop(t + 0.4);
    const n = ac.createBufferSource(); n.buffer = this.audio.noise('white');
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.8;
    const ng = ac.createGain(); ng.gain.setValueAtTime(0.18, t); ng.gain.setTargetAtTime(0, t, 0.02);
    n.connect(f).connect(ng).connect(dest); n.start(t, Math.random()); n.stop(t + 0.2);
  }

  liftClick(t) {
    const ac = this.ac;
    const n = ac.createBufferSource(); n.buffer = this.audio.noise('white');
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = 1.2;
    const ng = ac.createGain(); ng.gain.setValueAtTime(0.12, t); ng.gain.setTargetAtTime(0, t, 0.012);
    n.connect(f).connect(ng).connect(this.out); n.start(t, Math.random()); n.stop(t + 0.1);
  }

  revTick(t, amp) {
    const ac = this.ac;
    const n = ac.createBufferSource(); n.buffer = this.audio.noise('white');
    const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1200;
    const ng = ac.createGain(); ng.gain.setValueAtTime(amp, t); ng.gain.setTargetAtTime(0, t, 0.003);
    n.connect(f).connect(ng).connect(this.needle); n.start(t, Math.random()); n.stop(t + 0.03);
  }

  stop(fade = 0.08, silent = false) {
    const ac = this.ac, now = ac.currentTime;
    if (this.state !== 'idle') {
      this.songGain.gain.cancelScheduledValues(now);
      this.songGain.gain.setValueAtTime(this.songGain.gain.value, now);
      this.songGain.gain.linearRampToValueAtTime(0, now + fade);
      if (this.vinyl) {
        this.needle.gain.cancelScheduledValues(now);
        this.needle.gain.setValueAtTime(this.needle.gain.value, now);
        this.needle.gain.linearRampToValueAtTime(0, now + 0.03);
        if (!silent) this.liftClick(now);
      }
      const band = this.band;
      if (band) setTimeout(() => band.dispose(), (fade + 3.5) * 1000);
    }
    this.band = null;
    this.state = 'idle';
    this.song = null;
    this.tracks = [];
    this.track = -1;
  }

  tick() {
    if (this.state === 'idle') return;
    const ac = this.ac, now = ac.currentTime;
    if (typeof document !== 'undefined' && document.hidden) {
      if (this.hiddenSince == null) this.hiddenSince = now;
      return;
    }
    if (this.hiddenSince != null) {
      const dt = now - this.hiddenSince + 0.1;
      this.hiddenSince = null;
      if (this.t0 != null) this.t0 += dt;
      this.nextStart += dt;
      if (this.song && this.song.fade) {
        // re-arm the fade relative to the shifted clock
        const sd = this.song.stepDur;
        this.songGain.gain.cancelScheduledValues(now);
        this.songGain.gain.setValueAtTime(1, now);
        const fFrom = this.t0 + this.song.fade.from * sd, fTo = this.t0 + this.song.fade.to * sd;
        if (fFrom > now) { this.songGain.gain.setValueAtTime(1, fFrom); this.songGain.gain.linearRampToValueAtTime(0.0001, fTo); }
      }
    }
    if (this.vinyl) {
      while (this.revT < now + 0.2) { this.revTick(this.revT, this.state === 'runout' ? 0.16 : 0.035); this.revT += 1.8; }
    }
    if (this.state === 'runout') {
      if (now - this.runoutAt > 7 && this.onEnd) { const cb = this.onEnd; this.onEnd = null; cb(); }
      return;
    }
    if (this.state !== 'playing' || !this.song) return;
    const s = this.song, sd = s.stepDur, horizon = now + 0.16;
    while (this.ei < s.events.length) {
      const e = s.events[this.ei];
      const t = this.t0 + e.s * sd;
      if (t > horizon) break;
      if (t >= now - 0.03) this.fire(e, Math.max(t, now + 0.005), sd);
      this.ei++;
    }
    const end = this.t0 + this.songLength(s);
    if (this.ei >= s.events.length && now > end) {
      this.nextStart = now + this.gap;
      this.state = 'gap';
      this.gapUntil = this.nextStart - 0.05;
      this.pendingTrack = this.track + 1;
    }
  }

  // called by tick in 'gap' state
  tickGap() {
    if (this.state === 'gap' && this.ac.currentTime >= this.gapUntil) {
      if (this.pendingTrack >= this.tracks.length) { this.state = 'runout'; this.runoutAt = this.ac.currentTime; }
      else this.loadTrack(this.pendingTrack);
    }
  }

  fire(e, t, sd) {
    const b = this.band;
    if (!b) return;
    switch (e.i) {
      case 'lead': b.lead(t, e.m, e.v, e.d * sd * 0.96, e.k); break;
      case 'ep': b.ep(t, e.m, e.v, e.d * sd); break;
      case 'piano': b.piano(t, e.m, e.v, e.d * sd); break;
      case 'bass': b.bassNote(t, e.m, e.v, e.d * sd, e.k); break;
      case 'kick': b.kick(t, e.v); break;
      case 'snare': b.snare(t, e.v, e.g ?? 0.8); break;
      case 'rim': b.rim(t, e.v); break;
      case 'clap': b.clap(t, e.v); break;
      case 'hat': b.hat(t, e.v, e.o); break;
      case 'shaker': b.shaker(t, e.v); break;
      case 'tamb': b.tamb(t, e.v); break;
      case 'tom': b.tom(t, e.m, e.v); break;
      case 'crash': b.crash(t, e.v); break;
      case 'timp': b.timpani(t, e.m, e.v); break;
      case 'gtr': b.guitar(t, e.m, e.v, e.d * sd, e.mu); break;
      case 'pad': b.pad(t, e.n, e.d * sd, e.v, e.a); break;
      case 'brass': b.brass(t, e.m, e.v, e.d * sd); break;
      case 'sbrass': b.synthBrass(t, e.n, e.v, e.d * sd); break;
      case 'bell': b.bell(t, e.m, e.v); break;
      case 'harp': b.harp(t, e.m, e.v, e.k); break;
      case 'acc': b.accordion(t, e.m, e.v, e.d * sd); break;
      case 'arp': b.arp(t, e.m, e.v); break;
      default: break;
    }
  }

  update() { this.tick(); this.tickGap(); }

  dispose() {
    this.stop(0.05, true);
    for (const l of this.loops) { try { l.stop(); } catch (e) {} }
    try { this.out.disconnect(); } catch (e) {}
  }
}
