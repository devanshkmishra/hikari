// What's on TV in Act I. Late night, ~1 a.m., summer 1986, on a HIKARI CT-1486.
// Each programme draws into a 2D context (authored at 640×480, scaled to W×H) and synthesizes
// its own sound into the GainNode it is given. Programmes run on a shared broadcast clock, so
// when you flip away and come back, the show has gone on without you.
//
//   PROGRAMS[ch] = { name, start(audio, dest) → { stop() }, draw(g, t, W, H) }
//   PROGRAMS[12].beckon : 0..1, rises from ~18 s to ~32 s after tuning in; at 1 the TV calls you.
//   drawSnow(g, t, W, H), snowSound(audio, dest) → { stop(), setLevel(x) }
//   wall() → the fictional wall clock { h, m, s } (it is 1:12 a.m. when you sit down)
//   setLang('ja' | 'en') → English mode adds teletext-style subtitles; the broadcasts stay Japanese
//   prewarm({ g, audio }) → optional: builds snow tiles, layer caches and audio buffers in idle
//     slices (call it at power-on so the first flip to each channel never hitches)
import ch01 from './broadcasts/ch01.js';
import ch03 from './broadcasts/ch03.js';
import ch04 from './broadcasts/ch04.js';
import ch06 from './broadcasts/ch06.js';
import ch08 from './broadcasts/ch08.js';
import ch10 from './broadcasts/ch10.js';
import ch12 from './broadcasts/ch12.js';

import { adopt, noiseTiles } from './broadcasts/common.js';

export { drawSnow, snowSound } from './broadcasts/snow.js';
export { wall, DATE, setLang } from './broadcasts/common.js';

export const PROGRAMS = {
  1: ch01,
  3: ch03,
  4: ch04,
  6: ch06,
  8: ch08,
  10: ch10,
  12: ch12,
};

export function prewarm({ g = null, audio = null } = {}) {
  if (g) adopt(g);
  const idle = typeof requestIdleCallback === 'function'
    ? (f) => requestIdleCallback(f, { timeout: 400 })
    : (f) => setTimeout(f, 30);
  let scratch = null;
  const jobs = [() => noiseTiles()];
  for (const p of Object.values(PROGRAMS)) {
    jobs.push(() => {
      if (!scratch) { const c = document.createElement('canvas'); c.width = 640; c.height = 480; scratch = c.getContext('2d'); }
      p.draw(scratch, 0, 640, 480);
    });
    if (audio && p.warm) jobs.push(() => p.warm(audio));
  }
  jobs.push(() => { PROGRAMS[12].beckon = 0; });
  const next = () => {
    const j = jobs.shift();
    if (!j) return;
    try { j(); } catch (e) { console.error('[broadcasts] prewarm', e); }
    idle(next);
  };
  idle(next);
}
