// 車内放送 — the car's announcements. A Japanese system voice if this machine has one,
// otherwise the words appear only on the LED board.

const PREFER = ['Kyoko', 'O-Ren', 'Otoya', 'Hattori', 'Nanami', 'Google 日本語', 'Ayumi', 'Haruka', 'Sayaka', 'Ichiro'];

export class Voice {
  constructor(ctx) {
    this.ctx = ctx;
    this.synth = typeof window !== 'undefined' && window.speechSynthesis ? window.speechSynthesis : null;
    this.voice = null;
    this.queue = [];
    this.speaking = false;
    if (!this.synth) return;
    const pick = () => {
      const vs = this.synth.getVoices().filter((v) => /^ja(-|_|$)/i.test(v.lang));
      if (!vs.length) return;
      vs.sort((a, b) => score(b) - score(a));
      this.voice = vs[0];
    };
    const score = (v) => {
      let s = 0;
      const i = PREFER.findIndex((p) => v.name.includes(p));
      if (i >= 0) s += 50 - i;
      if (/female|女性/i.test(v.name)) s += 3;
      if (v.localService) s += 2;
      if (/enhanced|premium|natural|online/i.test(v.name)) s += 4;
      return s;
    };
    pick();
    this.onVoices = pick;
    try { this.synth.addEventListener('voiceschanged', pick); } catch (e) { /* older engines */ }
  }

  get available() { return !!(this.synth && this.voice); }

  // returns an estimated duration (s) so the LED can keep pace even without speech
  say(text, { rate = 0.94, pitch = 1.04, onend } = {}) {
    const est = Math.max(1.2, [...text].length * 0.13 / rate);
    if (!this.available || this.ctx.muted || this.ctx.signal.aborted) {
      if (onend) this._t = setTimeout(onend, est * 1000);
      return est;
    }
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ja-JP';
      u.voice = this.voice;
      u.rate = rate;
      u.pitch = pitch;
      u.volume = 0.82;
      if (onend) { u.onend = () => onend(); u.onerror = () => onend(); }
      this.synth.speak(u);
    } catch (e) { if (onend) setTimeout(onend, est * 1000); }
    return est;
  }

  cancel() {
    clearTimeout(this._t);
    if (this.synth) try { this.synth.cancel(); } catch (e) {}
  }

  destroy() {
    this.cancel();
    if (this.synth && this.onVoices) try { this.synth.removeEventListener('voiceschanged', this.onVoices); } catch (e) {}
  }
}
