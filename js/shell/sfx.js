// Shell sounds: the light's chime, the station-board knock, small UI ticks.
import { mtof } from '../lib/audio.js';

// A soft glass-bell arpeggio for when a light is found. Pentatonic, rising, long tails.
export function chime(audio, dest = audio.shell) {
  const ac = audio.ac;
  const t0 = audio.now() + 0.02;
  const notes = [76, 83, 80, 88, 85, 92];
  notes.forEach((m, i) => {
    const t = t0 + i * 0.16 + (i > 3 ? 0.12 : 0);
    const f = mtof(m);
    [1, 2.76, 5.4].forEach((ratio, k) => {
      const o = ac.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * ratio;
      const g = ac.createGain();
      const peak = [0.16, 0.05, 0.018][k] * (1 - i * 0.06);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + [3.2, 1.4, 0.6][k]);
      o.connect(g);
      g.connect(dest);
      g.connect(audio.reverbIn);
      o.start(t);
      o.stop(t + 3.4);
    });
  });
  // a low warm swell underneath
  const pad = ac.createOscillator();
  pad.type = 'triangle';
  pad.frequency.value = mtof(52);
  const pg = ac.createGain();
  pg.gain.setValueAtTime(0.0001, t0);
  pg.gain.linearRampToValueAtTime(0.05, t0 + 0.8);
  pg.gain.exponentialRampToValueAtTime(0.0001, t0 + 4.5);
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 900;
  pad.connect(lp).connect(pg);
  pg.connect(dest);
  pg.connect(audio.reverbIn);
  pad.start(t0);
  pad.stop(t0 + 4.6);
}

// The wooden knock of a station board being hung (used with the 駅名標 card).
export function knock(audio, dest = audio.shell) {
  const ac = audio.ac;
  const t = audio.now() + 0.01;
  [0, 0.11].forEach((dt, i) => {
    const src = ac.createBufferSource();
    src.buffer = audio.noise('white');
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = i ? 420 : 520;
    bp.Q.value = 6;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t + dt);
    g.gain.linearRampToValueAtTime(i ? 0.35 : 0.5, t + dt + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.14);
    src.connect(bp).connect(g);
    g.connect(dest);
    g.connect(audio.reverbIn);
    src.start(t + dt, Math.random());
    src.stop(t + dt + 0.2);
  });
}

export function tick(audio, freq = 1800, dest = audio.shell) {
  const ac = audio.ac;
  const t = audio.now();
  const o = ac.createOscillator();
  o.type = 'square';
  o.frequency.value = freq;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.03, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
  o.connect(g).connect(dest);
  o.start(t);
  o.stop(t + 0.05);
}
