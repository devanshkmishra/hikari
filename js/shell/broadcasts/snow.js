// 砂嵐 — the snow between channels, and its hiss.
import { adopt, noiseTiles, cached, gclock } from './common.js';

function bandSprite() {
  return cached('snow:band', 1, 64, (x) => {
    const gr = x.createLinearGradient(0, 0, 0, 64);
    gr.addColorStop(0, 'rgba(0,0,0,0)');
    gr.addColorStop(0.5, 'rgba(0,0,0,0.85)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 1, 64);
  }, true);
}

/** Fast analog snow: random pre-baked grain tiles + rolling AGC bands + the odd streak. */
export function drawSnow(g, t, W, H) {
  adopt(g);
  const tiles = noiseTiles();
  const tl = tiles[(Math.random() * tiles.length) | 0];
  const sy = (Math.random() * (tl.height - 240)) | 0;
  const flip = Math.random() < 0.5;
  g.save();
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
  g.imageSmoothingEnabled = false;
  if (flip) { g.translate(W, 0); g.scale(-1, 1); }
  g.drawImage(tl, 0, sy, 320, 240, 0, 0, W, H);
  g.restore();

  g.save();
  g.imageSmoothingEnabled = true;
  const tt = (t || 0) + gclock() * 0.0001;
  const band = bandSprite();
  const y1 = ((tt * 41) % (H * 1.6)) - H * 0.3;
  g.globalAlpha = 0.32; g.drawImage(band, 0, y1, W, H * 0.3);
  const y2 = ((tt * 13 + H * 0.7) % (H * 1.5)) - H * 0.25;
  g.globalAlpha = 0.18; g.drawImage(band, 0, y2, W, H * 0.7);
  if (Math.random() < 0.22) {
    g.globalAlpha = 0.18 + Math.random() * 0.3;
    g.fillStyle = '#fff';
    g.fillRect(0, Math.random() * H, W, 1 + Math.random() * 2);
  }
  g.globalAlpha = Math.random() * 0.07;
  g.fillStyle = '#000';
  g.fillRect(0, 0, W, H);
  g.restore();
}

/**
 * The hiss of no signal: band-limited white noise with the resonant "edges" a TV speaker gives
 * it (peaks near 2.3 and 6.8 kHz), a faint 59.94 Hz sync buzz, a drifting heterodyne whistle,
 * and a slow flutter. setLevel(0..1) for fades while tuning.
 */
export function snowSound(audio, dest) {
  const ac = audio.ac;
  const out = ac.createGain();
  out.gain.value = 0;
  out.connect(dest);

  const src = ac.createBufferSource();
  src.buffer = audio.noise('white');
  src.loop = true;
  src.loopStart = 0; src.loopEnd = src.buffer.duration;
  const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 240;
  const pk1 = ac.createBiquadFilter(); pk1.type = 'peaking'; pk1.frequency.value = 2350; pk1.Q.value = 2.4; pk1.gain.value = 7;
  const pk2 = ac.createBiquadFilter(); pk2.type = 'peaking'; pk2.frequency.value = 6800; pk2.Q.value = 3; pk2.gain.value = 5;
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 10500;
  const hiss = ac.createGain(); hiss.gain.value = 0.2;
  const flutter = ac.createGain(); flutter.gain.value = 1;
  src.connect(hp).connect(pk1).connect(pk2).connect(lp).connect(hiss).connect(flutter).connect(out);

  const l1 = ac.createOscillator(); l1.frequency.value = 0.31;
  const l1g = ac.createGain(); l1g.gain.value = 0.12;
  const l2 = ac.createOscillator(); l2.frequency.value = 6.1;
  const l2g = ac.createGain(); l2g.gain.value = 0.035;
  l1.connect(l1g).connect(flutter.gain);
  l2.connect(l2g).connect(flutter.gain);

  const buzz = ac.createOscillator(); buzz.type = 'sawtooth'; buzz.frequency.value = 59.94;
  const bbp = ac.createBiquadFilter(); bbp.type = 'bandpass'; bbp.frequency.value = 950; bbp.Q.value = 0.8;
  const bg = ac.createGain(); bg.gain.value = 0.016;
  buzz.connect(bbp).connect(bg).connect(out);

  const wh = ac.createOscillator(); wh.frequency.value = 3120;
  const whl = ac.createOscillator(); whl.frequency.value = 0.13;
  const whlg = ac.createGain(); whlg.gain.value = 45;
  whl.connect(whlg).connect(wh.frequency);
  const whg = ac.createGain(); whg.gain.value = 0.0035;
  wh.connect(whg).connect(out);

  const srcs = [src, l1, l2, buzz, wh, whl];
  const t0 = ac.currentTime;
  for (const s of srcs) s.start(t0);
  out.gain.setTargetAtTime(0.9, t0, 0.02);

  let dead = false;
  return {
    setLevel(x) {
      if (dead) return;
      const t = ac.currentTime;
      out.gain.cancelScheduledValues(t);
      out.gain.setTargetAtTime(0.9 * Math.max(0, x), t, 0.025);
    },
    stop() {
      if (dead) return;
      dead = true;
      const t = ac.currentTime;
      out.gain.cancelScheduledValues(t);
      out.gain.setTargetAtTime(0, t, 0.015);
      for (const s of srcs) { try { s.stop(t + 0.12); } catch (e) {} }
      setTimeout(() => { try { out.disconnect(); } catch (e) {} }, 250);
    },
  };
}
