// Shared Web Audio engine. Every sound in HIKARI is synthesized here or in a channel —
// no samples, no recordings. Master → compressor → speakers, plus one shared hall reverb.

export class AudioEngine {
  constructor() {
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ac = new AC({ latencyHint: 'interactive' });
    const ac = this.ac;

    this.master = ac.createGain();
    this.master.gain.value = 0.9;

    this.comp = ac.createDynamicsCompressor();
    this.comp.threshold.value = -16;
    this.comp.knee.value = 18;
    this.comp.ratio.value = 3.5;
    this.comp.attack.value = 0.004;
    this.comp.release.value = 0.22;

    // A gentle "TV speaker" tone: the whole set sounds slightly boxed in, like a 1986 cabinet.
    this.cabinet = ac.createBiquadFilter();
    this.cabinet.type = 'highshelf';
    this.cabinet.frequency.value = 9000;
    this.cabinet.gain.value = -3;

    this.master.connect(this.cabinet).connect(this.comp).connect(ac.destination);

    this.reverbIn = ac.createGain();
    this.reverb = ac.createConvolver();
    this.reverb.buffer = this.impulse(3.4, 2.6);
    this.reverbOut = ac.createGain();
    this.reverbOut.gain.value = 0.85;
    this.reverbIn.connect(this.reverb).connect(this.reverbOut).connect(this.master);

    this.shell = ac.createGain();
    this.shell.gain.value = 0.8;
    this.shell.connect(this.master);

    this._noise = {};
    this.muted = false;
  }

  now() { return this.ac.currentTime; }

  resume() { return this.ac.state === 'running' ? Promise.resolve() : this.ac.resume(); }

  setMuted(m) {
    this.muted = m;
    const t = this.now();
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(m ? 0 : 0.9, t, 0.05);
  }

  // Cached looping noise buffers. kind: 'white' | 'pink' | 'brown'
  noise(kind = 'white', seconds = 2) {
    const key = kind + seconds;
    if (this._noise[key]) return this._noise[key];
    const sr = this.ac.sampleRate;
    const len = Math.floor(sr * seconds);
    const buf = this.ac.createBuffer(2, len, sr);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        if (kind === 'pink') {
          b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759;
          b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856;
          b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
          d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
          b6 = w * 0.115926;
        } else if (kind === 'brown') {
          last = (last + 0.02 * w) / 1.02;
          d[i] = last * 3.5;
        } else {
          d[i] = w;
        }
      }
    }
    this._noise[key] = buf;
    return buf;
  }

  // Synthetic impulse response (exponentially decaying stereo noise).
  impulse(seconds = 3, decay = 2.5, reverse = false) {
    const sr = this.ac.sampleRate;
    const len = Math.floor(sr * seconds);
    const buf = this.ac.createBuffer(2, len, sr);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) {
        const n = reverse ? len - i : i;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / len, decay);
      }
    }
    return buf;
  }

  // Looping noise source → optional filter → dest. Returns { src, filter, gain, stop() }.
  noiseLoop(dest, { kind = 'white', type = null, freq = 1000, q = 0.7, gain = 0.2 } = {}) {
    const ac = this.ac;
    const src = ac.createBufferSource();
    src.buffer = this.noise(kind);
    src.loop = true;
    src.loopStart = Math.random();
    const g = ac.createGain();
    g.gain.value = gain;
    let filter = null;
    if (type) {
      filter = ac.createBiquadFilter();
      filter.type = type;
      filter.frequency.value = freq;
      filter.Q.value = q;
      src.connect(filter).connect(g);
    } else {
      src.connect(g);
    }
    g.connect(dest);
    src.start();
    return { src, filter, gain: g, stop: (t = 0) => { try { src.stop(this.now() + t); } catch (e) {} } };
  }

  // Per-channel bus. out → master (dry), send → shared reverb.
  channelBus() {
    const out = this.ac.createGain();
    out.gain.value = 0;
    out.connect(this.master);
    const send = this.ac.createGain();
    send.gain.value = 1;
    const sendTap = this.ac.createGain();
    sendTap.gain.value = 0;
    send.connect(sendTap).connect(this.reverbIn);
    return { out, send, sendTap };
  }
}

// Small helpers channels can import.
export const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ADSR-ish envelope on an AudioParam.
export function env(param, t, { a = 0.005, d = 0.1, s = 0, r = 0.1, peak = 1, hold = 0 } = {}) {
  param.cancelScheduledValues(t);
  param.setValueAtTime(0.0001, t);
  param.linearRampToValueAtTime(peak, t + a);
  param.setTargetAtTime(Math.max(peak * s, 0.0001), t + a, d / 3);
  if (hold > 0) param.setTargetAtTime(0.0001, t + a + hold, r / 3);
}

// Soft-clip waveshaper curve.
export function driveCurve(amount = 20) {
  const n = 2048, curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((3 + amount) * x * 20 * (Math.PI / 180)) / (Math.PI + amount * Math.abs(x));
  }
  return curve;
}
