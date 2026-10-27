// transformer-v0's output, post-processed. Rhythm is read straight from the song's own
// note data (melody first, drums to fill), then laid out with a flow model: spacing that
// follows intensity, sharp angles for jumps, arcs for flow, mirrored layouts when a
// rhythm repeats. Deterministic: the same four maps every time.

import * as S from './song-data.js';

export const DIFFS = [
  { id: 'easy', name: 'Easy', cs: 2.5, ar: 3, od: 2, hp: 2, sm: 1.0, tickRate: 1, stars: 1.68, colour: '#8fd86f', seed: 11 },
  { id: 'normal', name: 'Normal', cs: 3.5, ar: 5, od: 4, hp: 4, sm: 1.3, tickRate: 1, stars: 2.61, colour: '#6fcdff', seed: 23 },
  { id: 'hard', name: 'Hard', cs: 4, ar: 8, od: 6, hp: 5, sm: 1.6, tickRate: 2, stars: 3.94, colour: '#ffd23f', seed: 37 },
  { id: 'insane', name: 'Insane', cs: 4.2, ar: 9.2, od: 8, hp: 6, sm: 1.9, tickRate: 2, stars: 5.27, colour: '#ff66aa', seed: 41 },
];

export const COMBO_COLOURS = ['#ff66aa', '#7fd4ff', '#ffd27f', '#c7a6ff'];
export const radiusOf = (cs) => 54.4 - 4.48 * cs;
export const preemptOf = (ar) => (ar < 5 ? 1200 + (600 * (5 - ar)) / 5 : 1200 - (750 * (ar - 5)) / 5);
export const fadeInOf = (ar) => (ar < 5 ? 800 + (400 * (5 - ar)) / 5 : 800 - (500 * (ar - 5)) / 5);
export const windowsOf = (od) => ({ w300: 80 - 6 * od, w100: 140 - 8 * od, w50: 200 - 10 * od });

const MS = S.BEAT * 1000;
const SPIN = [136, 143];
const FIRST_BAR = 4, LAST_BEAT = 208;
const SV = { intro: 0.8, verse: 0.9, pre: 1.0, chorus: 1.15, bridge: 0.65, build: 1.0, final: 1.22, outro: 1 };
const FINISH = new Set([32, 80, 96, 160, 176, 192, 208]);
const EPS = 1e-4;

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MEL = S.MELODY.filter((n) => n.b >= FIRST_BAR * 4 - EPS && n.b < LAST_BEAT + EPS);
const melAt = (b) => MEL.find((n) => Math.abs(n.b - b) < EPS);
const sec = (b) => S.sectionAt(b + EPS).id;
const isKiai = (b) => S.inKiai(b + EPS);
const inSpin = (b) => b > SPIN[0] - 2 + EPS && b < SPIN[1] + 1 - EPS;
const onGrid = (b, g) => Math.abs(b / g - Math.round(b / g)) < EPS;
const snapDown = (v, g) => Math.floor(v / g + EPS) * g;

function fillSources(b0, b1) {
  const out = [];
  for (const d of S.DRUMS) if (d.b > b0 + EPS && d.b < b1 - EPS && ['kick', 'snare', 'clap', 'ohat'].includes(d.k)) out.push(d.b);
  for (const a of S.ARPS) if (a.b > b0 + EPS && a.b < b1 - EPS) out.push(a.b);
  return [...new Set(out.map((v) => Math.round(v * 4) / 4))].sort((a, b) => a - b);
}

// ---------------------------------------------------------------- rhythm
function rhythm(diff) {
  const id = diff.id;
  const out = [];
  const pxb = (b) => 100 * diff.sm * SV[sec(b)];
  const maxLen = { easy: 200, normal: 230, hard: 250, insane: 270 }[id];
  // a long note becomes a slider; if it would be too long, it folds back on itself
  const slider = (b, d, snap, m) => {
    for (let dd = d; dd >= snap - EPS; dd -= snap) {
      const n0 = Math.max(1, Math.ceil((pxb(b) * dd) / maxLen - EPS));
      for (let n = n0; n <= n0 + 2; n++) {
        const per = dd / n;
        if (onGrid(per, snap) && pxb(b) * per <= maxLen + EPS && per >= snap - EPS) return { b, kind: 'slider', d: per, slides: n, m };
      }
    }
    return { b, kind: 'circle', m };
  };

  if (id === 'easy') {
    for (let bar = FIRST_BAR; bar < 52; bar++) {
      const o = bar * 4, s = sec(o);
      if (bar === 34) { out.push({ b: SPIN[0], kind: 'spinner', d: SPIN[1] - SPIN[0] }); continue; }
      if (bar === 35) continue;
      if (s === 'bridge') { out.push({ b: o, kind: 'slider', d: 2, slides: 1 }); continue; }
      if (s === 'intro') { out.push({ b: o, kind: 'circle' }, { b: o + 2, kind: 'circle' }); continue; }
      const m = melAt(o);
      if (m && m.d >= 1 && !FINISH.has(o)) out.push({ b: o, kind: 'slider', d: 1, slides: 1, m: m.m });
      else out.push({ b: o, kind: 'circle', m: m && m.m });
      // phrase-opening bars stretch out on a slider; answering bars land on a circle
      const m2 = melAt(o + 2) || melAt(o + 2.5);
      if (bar % 2 === 0 || bar === 39) out.push({ b: o + 2, kind: 'slider', d: 1, slides: 1, m: m2 && m2.m });
      else out.push({ b: o + 2, kind: 'circle', m: m2 && m2.m });
    }
    out.push({ b: LAST_BEAT, kind: 'circle' });
    return out;
  }

  const P = {
    normal: { grid: 0.5, rest: 0.5, fillGap: 2, fillStep: 1, sliderMin: 1, snap: 0.5 },
    hard: { grid: 0.25, rest: 0.25, fillGap: 1.5, fillStep: 1, sliderMin: 0.75, snap: 0.25 },
    insane: { grid: 0.25, rest: 0.25, fillGap: 0.75, fillStep: 0.5, sliderMin: 1, snap: 0.25 },
  }[id];

  // 1. onsets from the melody
  let on = [];
  for (const n of MEL) {
    if (inSpin(n.b)) continue;
    if (id !== 'normal' && n.b >= 156 - EPS && n.b < 160 - EPS) continue; // the build's held D6 becomes a stream
    let b = n.b;
    if (!onGrid(b, P.grid)) {
      if (id !== 'normal') continue;
      b = Math.ceil(b / 0.5 - EPS) * 0.5; // a syncopated note lands on the next half beat
      if (MEL.some((k) => Math.abs(k.b - b) < EPS)) continue;
    }
    on.push({ b, m: n.m, d: n.d - (b - n.b), src: 'mel' });
  }
  // 2. bursts from the drum fills (hard: triples; insane: the whole fill)
  const fills = { 7: [12, 16], 11: [12, 16], 15: [12, 16], 19: [8, 14], 27: [12, 16], 39: [0, 12], 51: [8, 16] };
  if (id !== 'normal') {
    for (const [bar, [a, z]] of Object.entries(fills)) {
      let pos = [];
      for (let i = a; i < z; i++) pos.push(+bar * 4 + i / 4);
      if (id === 'hard') pos = +bar === 39 ? pos.filter((p) => Math.round(p * 4) % 4 < 3) : pos.slice(-3);
      for (const p of pos) if (!on.some((o) => Math.abs(o.b - p) < EPS)) on.push({ b: p, m: null, d: 0.25, src: 'burst' });
    }
    if (id === 'insane') {
      for (let bar = 20; bar < 51; bar++) {
        const s = sec(bar * 4);
        if (s !== 'chorus' && s !== 'final') continue;
        const rel = bar - (s === 'chorus' ? 20 : 40);
        if (rel % 2 !== 1 || bar === 27 || bar === 47 || bar === 51) continue;
        for (const p of [3.25, 3.75]) if (!on.some((o) => Math.abs(o.b - bar * 4 - p) < EPS)) on.push({ b: bar * 4 + p, m: null, d: 0.25, src: 'burst' });
      }
    }
  }
  on.sort((a, b) => a.b - b.b);
  on = on.filter((o, i) => i === 0 || Math.abs(o.b - on[i - 1].b) > EPS);

  // 3. fill long silences with drums
  const filled = [...on];
  for (let i = 0; i < on.length - 1; i++) {
    const a = on[i], z = on[i + 1];
    const aEnd = a.b + Math.min(a.d, z.b - a.b);
    if (z.b - a.b <= P.fillGap + EPS || (sec(a.b) === 'bridge' && id === 'normal')) continue;
    let last = Math.max(a.b + P.fillStep, aEnd);
    for (const f of fillSources(last - EPS, z.b - P.fillStep + EPS)) {
      if (f >= last - EPS && z.b - f >= P.fillStep - EPS && !inSpin(f) && onGrid(f, P.fillStep)) {
        filled.push({ b: f, m: null, d: 0, src: 'drum' });
        last = f + P.fillStep;
      }
    }
  }
  filled.sort((a, b) => a.b - b.b);

  // 4. objects: long notes become sliders; normal folds 1/2 pairs into sliders
  let busyUntil = -1;
  let flip = false;
  for (let i = 0; i < filled.length; i++) {
    const a = filled[i];
    if (a.b < busyUntil - EPS) continue;
    const nextFree = filled.find((o) => o.b > a.b + EPS);
    const gap = nextFree ? nextFree.b - a.b : 4;
    const s = sec(a.b);
    const kiai = isKiai(a.b);
    if (id === 'normal' && gap <= 0.5 + EPS && nextFree) {
      const after = filled.find((o) => o.b > nextFree.b + EPS);
      flip = !flip;
      if (flip && (!after || after.b - nextFree.b >= 1 - EPS)) {
        out.push({ b: a.b, kind: 'circle', m: a.m }, { b: nextFree.b, kind: 'circle', m: nextFree.m });
        busyUntil = nextFree.b + 0.5;
        continue;
      }
      out.push({ b: a.b, kind: 'slider', d: 0.5, slides: 1, m: a.m });
      busyUntil = a.b + 0.5 + P.rest;
      continue;
    }
    const room = gap - P.rest;
    const minLen = id === 'insane' && !kiai && s !== 'build' ? 0.75 : P.sliderMin;
    if (a.src === 'mel' && a.d >= minLen - EPS && room >= Math.min(minLen, 0.5) - EPS) {
      const d = snapDown(Math.min(a.d, room), P.snap);
      const o = d >= 0.5 - EPS ? slider(a.b, d, P.snap, a.m) : { b: a.b, kind: 'circle', m: a.m };
      out.push(o);
      busyUntil = o.kind === 'slider' ? a.b + o.d * o.slides + P.rest : a.b + 0.25;
    } else {
      out.push({ b: a.b, kind: 'circle', m: a.m, burst: a.src === 'burst' });
      busyUntil = a.b + 0.25;
    }
  }
  out.push({ b: SPIN[0], kind: 'spinner', d: SPIN[1] - SPIN[0] });
  if (!out.some((o) => Math.abs(o.b - LAST_BEAT) < EPS)) out.push({ b: LAST_BEAT, kind: 'circle' });
  out.sort((a, b) => a.b - b.b);
  return out.filter((o) => o.b <= LAST_BEAT + EPS);
}

// ---------------------------------------------------------------- layout
function arcPath(x, y, th, L, turn, wave) {
  const n = Math.max(2, Math.ceil(L / 3));
  const ds = L / n;
  const k = turn / L;
  const pts = [[x, y]];
  let a = th;
  for (let i = 1; i <= n; i++) {
    a += (wave && i > n / 2 ? -k : k) * ds;
    x += Math.cos(a) * ds; y += Math.sin(a) * ds;
    pts.push([x, y]);
  }
  return { pts, exit: a };
}

function layout(objs, diff, rnd) {
  const r = radiusOf(diff.cs);
  const M = r * 0.75;
  const inside = (x, y) => x >= M && x <= 512 - M && y >= M && y <= 384 - M;
  const prof = {
    easy: { ds: () => 1, stream: 1, max: 170, turn: [0.35, 0.75] },
    normal: { ds: (b) => (isKiai(b) ? 1.1 : 1), stream: 1, max: 210, turn: [0.3, 0.9] },
    hard: { ds: (b) => (isKiai(b) ? 1.6 : sec(b) === 'build' ? 1.45 : sec(b) === 'bridge' ? 1 : 1.2), stream: 0.6, max: 260, turn: [0.3, 1.1] },
    insane: { ds: (b) => (isKiai(b) ? 2.4 : sec(b) === 'build' ? 2.1 : sec(b) === 'bridge' ? 1.1 : 1.45), stream: 0.5, max: 300, turn: [0.3, 1.2] },
  }[diff.id];
  const pxPerBeat = (b) => 100 * diff.sm * SV[sec(b)];

  let x = 256, y = 300, th = -Math.PI / 2 - 0.3;
  let omega = 0.5;
  let pattern = 'flow', pSign = 1, burstSign = 1;
  let curBar = -1;
  const placed = [];
  const barMemo = new Map(); // rhythm signature → { origin, items }
  const barUses = new Map();

  const sigOf = (bar) => {
    const items = objs.filter((o) => Math.floor(o.b / 4 + EPS) === bar);
    const grp = ['chorus', 'final'].includes(sec(bar * 4)) ? 'kiai' : sec(bar * 4);
    return grp + '|' + items.map((o) => `${(o.b - bar * 4).toFixed(2)}${o.kind[0]}${o.d || 0}x${o.slides || 0}`).join(',');
  };

  const clearOf = (cx, cy, k) => {
    let best = Infinity;
    for (let j = Math.max(0, k - 4); j < k - 1; j++) {
      const p = placed[j];
      if (!p || p.kind === 'spinner') continue;
      best = Math.min(best, Math.hypot(p.x - cx, p.y - cy));
      if (p.pts) for (let q = 0; q < p.pts.length; q += 4) best = Math.min(best, Math.hypot(p.pts[q][0] - cx, p.pts[q][1] - cy));
    }
    const prev = placed[k - 1];
    if (prev && prev.pts) for (let q = 0; q < prev.pts.length - 6; q += 4) best = Math.min(best, Math.hypot(prev.pts[q][0] - cx, prev.pts[q][1] - cy) + 30);
    return best;
  };

  // how far a candidate slider body stays from the last few objects (its own head excluded)
  const pathClear = (pts) => {
    let best = Infinity;
    const k = placed.length;
    const skip = Math.ceil((r * 1.3) / 3);
    for (let j = Math.max(0, k - 3); j < k; j++) {
      const p = placed[j];
      if (!p || p.kind === 'spinner') continue;
      const refs = p.pts ? p.pts.filter((_, q) => q % 3 === 0) : [[p.x, p.y]];
      for (let q = skip; q < pts.length; q += 2) {
        for (const [ax, ay] of refs) best = Math.min(best, Math.hypot(pts[q][0] - ax, pts[q][1] - ay));
      }
    }
    return best;
  };

  const makeSlider = (o, hx, hy, dir) => {
    const L = pxPerBeat(o.b) * o.d;
    const maxTurn = diff.id === 'easy' ? 0.9 : 1.3;
    const turn = L < 50 ? 0 : (0.35 + rnd() * (maxTurn - 0.35)) * (rnd() < 0.5 ? -1 : 1);
    const wave = diff.id !== 'easy' && L > 150 && rnd() < 0.35;
    let best = null;
    for (let t = 0; t < 24; t++) {
      const d = dir + (t % 2 ? 1 : -1) * Math.ceil(t / 2) * 0.27;
      for (const tw of [turn, -turn, turn * 0.4, 0]) {
        const p = arcPath(hx, hy, d, L, tw, wave);
        if (!p.pts.every(([px, py]) => inside(px, py))) continue;
        const clear = Math.min(pathClear(p.pts), r * 2.2);
        const score = clear - Math.ceil(t / 2) * 3;
        if (!best || score > best.score) best = { ...p, dir: d, L, score };
        if (clear >= r * 2.2 && t < 4) return best;
      }
    }
    if (best) return best;
    const p = arcPath(hx, hy, Math.atan2(192 - hy, 256 - hx), L, 0, false);
    return { ...p, dir: Math.atan2(192 - hy, 256 - hx), L };
  };

  const finishObj = (o, hx, hy, sl) => {
    const rec = { ...o, x: hx, y: hy };
    if (sl) {
      rec.pts = sl.pts; rec.L = sl.L;
      const tail = sl.pts[sl.pts.length - 1];
      const even = o.slides % 2 === 0;
      rec.ex = even ? hx : tail[0]; rec.ey = even ? hy : tail[1];
      th = even ? sl.dir + Math.PI : sl.exit;
    } else { rec.ex = hx; rec.ey = hy; }
    x = rec.ex; y = rec.ey;
    placed.push(rec);
    return rec;
  };

  for (let i = 0; i < objs.length; i++) {
    const o = objs[i];
    if (o.kind === 'spinner') {
      placed.push({ ...o, x: 256, y: 192, ex: 256, ey: 192 });
      x = 256; y = 192; th = -Math.PI / 2;
      continue;
    }
    const bar = Math.floor(o.b / 4 + EPS);
    const prev = placed[placed.length - 1];
    const prevEnd = prev ? prev.b + (prev.kind === 'slider' ? prev.d * prev.slides : prev.kind === 'spinner' ? prev.d : 0) : o.b - 2;
    const gap = Math.max(0, o.b - prevEnd);

    // a new bar: maybe pick a pattern, maybe replay a mirrored memory of an earlier bar
    if (bar !== curBar) {
      curBar = bar;
      const jumpy = (diff.id === 'insane' || diff.id === 'hard') && (isKiai(o.b) || sec(o.b) === 'build');
      const roll = rnd();
      pattern = jumpy ? (roll < 0.34 ? 'zig' : roll < 0.62 ? 'star' : roll < 0.82 ? 'square' : 'flow') : 'flow';
      pSign = rnd() < 0.5 ? -1 : 1;
      if (bar % 2 === 0) omega = (prof.turn[0] + rnd() * (prof.turn[1] - prof.turn[0])) * (rnd() < 0.5 ? -1 : 1);
      const sig = sigOf(bar);
      const memo = barMemo.get(sig);
      if (memo && prev && prev.kind !== 'spinner') {
        const res = replay(memo, bar, o, gap);
        if (res) { i += res - 1; continue; }
      }
    }

    const isStack = prev && prev.kind === 'circle' && o.kind === 'circle' && o.m && prev.m === o.m && gap <= 0.5 + EPS && diff.id !== 'easy' && !o.burst;
    let dist;
    if (isStack) dist = 0;
    else {
      const stream = gap <= 0.25 + EPS;
      dist = pxPerBeat(o.b) * gap * prof.ds(o.b) * (stream ? prof.stream : 1);
      if (prev && prev.kind === 'spinner') dist = Math.min(dist, 70);
      dist = Math.max(stream ? r * 0.7 : r * 1.25, Math.min(prof.max, dist));
    }

    // direction for this move
    if (!isStack) {
      if (gap <= 0.25 + EPS) {
        if (!(prev && prev.burst)) burstSign = rnd() < 0.5 ? -1 : 1;
        th += burstSign * 0.3;
      } else if (pattern === 'zig') { th += pSign * (Math.PI - 0.6); pSign = -pSign; }
      else if (pattern === 'star') th += pSign * 2.51;
      else if (pattern === 'square') th += pSign * Math.PI / 2;
      else { th += omega; omega += (rnd() - 0.5) * 0.2; }
      // melody contour: a rising note moves up the screen, a falling one moves down
      const pm = prev && prev.m, dm = o.m && pm ? o.m - pm : 0;
      if (gap > 0.25 + EPS && Math.abs(dm) >= 2) {
        const want = dm > 0 ? -1 : 1;
        if (Math.sign(Math.sin(th)) !== want) th = -th;
      }
    }

    let hx = x, hy = y, sl = null;
    if (!isStack) {
      let best = null;
      const toC = Math.atan2(192 - y, 256 - x);
      for (let t = 0; t < 30; t++) {
        const off = Math.ceil(t / 2) * 0.21 * (t % 2 ? 1 : -1);
        const sideBias = Math.sin(toC - th) >= 0 ? 1 : -1;
        const a = th + off * sideBias;
        const shrink = t > 22 ? 0.8 : 1;
        const cx = x + Math.cos(a) * dist * shrink, cy = y + Math.sin(a) * dist * shrink;
        if (!inside(cx, cy)) continue;
        const clear = clearOf(cx, cy, placed.length);
        const score = (clear >= r * 1.6 ? 0 : 1000 - clear) + Math.abs(off) * 20;
        if (!best || score < best.score) best = { cx, cy, a, score };
        if (score < 15) break;
      }
      if (!best) { const a = toC; best = { cx: x + Math.cos(a) * dist, cy: y + Math.sin(a) * dist, a }; }
      hx = best.cx; hy = best.cy; th = best.a;
    }
    if (o.kind === 'slider') sl = makeSlider(o, hx, hy, th + (rnd() - 0.5) * 0.5);
    finishObj(o, hx, hy, sl);
    // remember this bar's shape once it is complete
    const nextO = objs[i + 1];
    if (!nextO || Math.floor(nextO.b / 4 + EPS) !== bar) remember(bar);
  }

  function remember(bar) {
    const items = placed.filter((p) => Math.floor(p.b / 4 + EPS) === bar && p.kind !== 'spinner');
    if (!items.length) return;
    const sig = sigOf(bar);
    if (barMemo.has(sig)) return;
    const ox = items[0].x, oy = items[0].y;
    barMemo.set(sig, { items: items.map((p) => ({ dx: p.x - ox, dy: p.y - oy, pts: p.pts && p.pts.map(([a, b]) => [a - ox, b - oy]), ex: p.ex - ox, ey: p.ey - oy })) });
  }

  // Replays a remembered bar mirrored (x, then y, then both). Returns objects consumed or 0.
  function replay(memo, bar, first, gap) {
    const group = objs.filter((p) => Math.floor(p.b / 4 + EPS) === bar);
    if (group.length !== memo.items.length || group.length < 2) return 0;
    const sig = sigOf(bar);
    const uses = barUses.get(sig) || 0;
    const T = [[-1, 1], [1, -1], [-1, -1]];
    const prof2 = pxPerBeat(first.b) * Math.max(gap, 0.25) * prof.ds(first.b);
    const dist = Math.max(r * 1.25, Math.min(prof.max, prof2));
    for (let k = 0; k < 3; k++) {
      const [sx, sy] = T[(uses + k) % 3];
      for (let t = 0; t < 120; t++) {
        const a = th + omega + (t % 2 ? 1 : -1) * Math.ceil((t % 24) / 2) * 0.27;
        const dd = Math.min(prof.max, dist * [1, 0.85, 1.15, 0.7, 1.3][Math.floor(t / 24)]);
        const bx = x + Math.cos(a) * dd, by = y + Math.sin(a) * dd;
        const tf = ([px, py]) => [bx + px * sx, by + py * sy];
        let ok = true;
        for (const it of memo.items) {
          const [px, py] = tf([it.dx, it.dy]);
          if (!inside(px, py)) { ok = false; break; }
          if (it.pts && !it.pts.every((q) => { const [u, v] = tf(q); return inside(u, v); })) { ok = false; break; }
        }
        if (!ok || clearOf(bx, by, placed.length) < r * 1.4) continue;
        // every replayed object must stay clear of what is still on screen before this bar
        const recent = placed.slice(-4).filter((p) => p.kind !== 'spinner');
        const near = (px, py) => recent.some((p) => Math.hypot(p.x - px, p.y - py) < r * 1.5 || (p.pts && p.pts.some((q, qi) => qi % 4 === 0 && Math.hypot(q[0] - px, q[1] - py) < r * 1.5)));
        if (memo.items.slice(1).some((it) => near(...tf([it.dx, it.dy])))) continue;
        group.forEach((o, j) => {
          const it = memo.items[j];
          const [px, py] = tf([it.dx, it.dy]);
          const rec = { ...o, x: px, y: py };
          if (it.pts) { rec.pts = it.pts.map(tf); rec.L = o.d * pxPerBeat(o.b); }
          [rec.ex, rec.ey] = tf([it.ex, it.ey]);
          placed.push(rec);
        });
        const last = placed[placed.length - 1], before = placed[placed.length - 2];
        if (last.pts) {
          const p = last.pts, n = p.length;
          th = last.slides % 2 === 0 ? Math.atan2(p[0][1] - p[1][1], p[0][0] - p[1][0]) : Math.atan2(p[n - 1][1] - p[n - 2][1], p[n - 1][0] - p[n - 2][0]);
        } else th = Math.atan2(last.y - before.ey, last.x - before.ex);
        x = last.ex; y = last.ey;
        barUses.set(sig, uses + 1);
        return group.length;
      }
    }
    return 0;
  }
  return placed;
}

// ---------------------------------------------------------------- assemble
function finalize(placed, diff) {
  const r = radiusOf(diff.cs);
  const preempt = preemptOf(diff.ar);
  let colour = -1, num = 0, lastPhrase = -1;
  const phraseLen = (b) => (diff.id === 'hard' || diff.id === 'insane') && (isKiai(b) || sec(b) === 'build') ? 1 : 2;
  const objects = [];
  let prevSpinner = true;
  placed.forEach((p, i) => {
    const bar = Math.floor(p.b / 4 + EPS);
    const phrase = Math.floor(bar / phraseLen(p.b)) + (phraseLen(p.b) === 1 ? 1000 : 0);
    let nc = prevSpinner || phrase !== lastPhrase || num >= (diff.id === 'insane' ? 14 : 10) || p.kind === 'spinner';
    if (p.kind !== 'spinner' && i > 0 && placed[i - 1].burst && p.burst && num < 14) nc = false;
    if (nc) { colour = (colour + 1) % COMBO_COLOURS.length; num = 0; }
    lastPhrase = phrase;
    prevSpinner = p.kind === 'spinner';
    const t = p.b * MS;
    const beatIn = ((p.b % 4) + 4) % 4;
    const s = sec(p.b);
    const snareSec = ['verse', 'pre', 'chorus', 'final', 'build'].includes(s);
    const prevM = placed[i - 1] && placed[i - 1].m, nextM = placed[i + 1] && placed[i + 1].m;
    const hs = {
      clap: snareSec && (Math.abs(beatIn - 1) < EPS || Math.abs(beatIn - 3) < EPS),
      finish: FINISH.has(Math.round(p.b * 4) / 4) && onGrid(p.b, 1),
      whistle: !!p.m && ((isKiai(p.b) && p.m >= 78 && p.m >= (prevM || 0) && p.m >= (nextM || 0)) || (s === 'bridge' && p.kind === 'slider')),
    };
    if (p.kind === 'spinner') {
      objects.push({ type: 'spinner', t, end: (p.b + p.d) * MS, nc: true, colour, b: p.b });
      return;
    }
    num++;
    const o = { type: p.kind, t, x: p.x, y: p.y, nc, colour, num, hs, b: p.b, stack: 0 };
    if (p.kind === 'slider') {
      const pts = p.pts;
      const cum = [0];
      for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
      const L = cum[cum.length - 1];
      const slideMs = p.d * MS;
      const tickDist = (100 * diff.sm * SV[s]) / diff.tickRate;
      const ticks = [];
      for (let sIdx = 0; sIdx < p.slides; sIdx++) {
        const ds = [];
        for (let d = tickDist; d < L - tickDist * 0.1 && (d / L) * slideMs < slideMs - 10; d += tickDist) ds.push(d);
        const ordered = sIdx % 2 ? ds.map((d) => L - d).reverse() : ds;
        for (const d of ordered) ticks.push({ t: t + sIdx * slideMs + ((sIdx % 2 ? L - d : d) / L) * slideMs, d, kind: 'tick' });
        if (sIdx < p.slides - 1) ticks.push({ t: t + (sIdx + 1) * slideMs, d: sIdx % 2 ? 0 : L, kind: 'repeat' });
      }
      const endB = p.b + p.d * p.slides;
      const endIn = ((endB % 4) + 4) % 4;
      Object.assign(o, {
        pts, cum, L, slides: p.slides, slideMs, end: t + slideMs * p.slides, ticks,
        tailHs: { clap: snareSec && (Math.abs(endIn - 1) < EPS || Math.abs(endIn - 3) < EPS), finish: false, whistle: false },
      });
    }
    objects.push(o);
  });
  // stacking (stable-style: earlier notes on a stack drift up-left)
  for (let i = objects.length - 1; i > 0; i--) {
    const a = objects[i], b = objects[i - 1];
    if (a.type === 'spinner' || b.type !== 'circle') continue;
    if (Math.hypot(a.x - b.x, a.y - b.y) < 3 && a.t - b.t <= preempt * 0.7) b.stack = a.stack + 1;
  }
  for (const o of objects) if (o.stack) { o.x -= o.stack * r * 0.1; o.y -= o.stack * r * 0.1; }
  return objects;
}

const cache = new Map();
export function buildMap(diff) {
  if (cache.has(diff.id)) return cache.get(diff.id);
  const rnd = rng(diff.seed);
  const objs = rhythm(diff);
  const placed = layout(objs, diff, rnd);
  const objects = finalize(placed, diff);
  let maxCombo = 0, circles = 0, sliders = 0, spinners = 0;
  for (const o of objects) {
    if (o.type === 'circle') { circles++; maxCombo++; }
    else if (o.type === 'slider') { sliders++; maxCombo += 2 + o.ticks.length; }
    else { spinners++; maxCombo++; }
  }
  const map = { diff, objects, maxCombo, circles, sliders, spinners, first: objects[0].t, last: objects[objects.length - 1].end || objects[objects.length - 1].t };
  cache.set(diff.id, map);
  return map;
}
