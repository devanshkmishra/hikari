// 「夏の残響」 — HIKARI SOUND TEAM. 170 BPM, D major → E major for the last chorus.
// The whole song lives here as data: chords per bar, a written melody, drum and bass
// patterns. synth.js turns it into sound; map.js turns it into circles.

export const BPM = 170;
export const BEAT = 60 / BPM;           // seconds
export const BARS = 56;
export const LEN_BEATS = BARS * 4;
export const PREVIEW_BEAT = 20 * 4;
export const TITLE = '夏の残響';
export const TITLE_ROMAJI = 'Natsu no Zankyou';
export const ARTIST = 'HIKARI SOUND TEAM';

// bars [a, b)
export const SECTIONS = [
  { id: 'intro', a: 0, b: 8, energy: 0.3 },
  { id: 'verse', a: 8, b: 16, energy: 0.55 },
  { id: 'pre', a: 16, b: 20, energy: 0.72 },
  { id: 'chorus', a: 20, b: 28, energy: 1, kiai: true },
  { id: 'bridge', a: 28, b: 36, energy: 0.25 },
  { id: 'build', a: 36, b: 40, energy: 0.82 },
  { id: 'final', a: 40, b: 52, energy: 1, kiai: true },
  { id: 'outro', a: 52, b: 56, energy: 0.2 },
];
export const KIAI = SECTIONS.filter((s) => s.kiai).map((s) => [s.a * 4, s.b * 4]);
export const sectionAt = (beat) => {
  const bar = Math.floor(beat / 4);
  return SECTIONS.find((s) => bar >= s.a && bar < s.b) || SECTIONS[SECTIONS.length - 1];
};
export const inKiai = (beat) => KIAI.some(([a, b]) => beat >= a && beat < b);

const CHORDS = [
  'G', 'A', 'F#m', 'Bm', 'G', 'A', 'F#m', 'Bm',          // intro
  'Bm', 'G', 'D', 'A', 'Bm', 'G', 'D', 'A',              // verse
  'Em', 'F#m', 'G', 'A',                                 // pre
  'G', 'A', 'F#m', 'Bm', 'G', 'A', 'D', 'D',             // chorus
  'G', 'A', 'F#m', 'Bm', 'G', 'A', 'Bm', 'A',            // bridge
  'G', 'A', 'C', 'D',                                    // build (bVI bVII → E)
  'A', 'B', 'G#m', 'C#m', 'A', 'B', 'E', 'E',            // final chorus, up a step
  'A', 'B', 'G#m C#m', 'A B',
  'E', 'C#m', 'A', 'E',                                  // outro
];

const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export function noteNum(s) {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(s);
  return 12 * (+m[3] + 1) + PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}

function parseChord(name) {
  const m = /^([A-G])(#|b)?(m?)$/.exec(name);
  const root = PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  const minor = m[3] === 'm';
  return { name, root, minor, iv: minor ? [0, 3, 7, 10] : [0, 4, 7, 14] };
}

// chords: [{ b (beat), d (beats), root pc, minor, notes (voiced midi), bass (midi) }]
export const CHORD_EVENTS = [];
CHORDS.forEach((str, bar) => {
  const parts = str.split(' ');
  const len = 4 / parts.length;
  parts.forEach((p, k) => {
    const c = parseChord(p);
    let r = 52 + ((c.root - 52 % 12 + 24) % 12); // root voiced between E3 and D#4
    if (r > 61) r -= 12;
    const notes = c.iv.map((i) => r + i - (i === 14 ? 12 : 0));
    const bass = 36 + ((c.root - 0 + 12) % 12) + (c.root < 4 ? 12 : 0);
    CHORD_EVENTS.push({ b: bar * 4 + k * len, d: len, ...c, notes, bass });
  });
});
export const chordAt = (beat) => {
  let c = CHORD_EVENTS[0];
  for (const e of CHORD_EVENTS) { if (e.b <= beat + 1e-6) c = e; else break; }
  return c;
};

// Melody, written in 16ths: "note:len" or "-:len". Each bar sums to 16.
const MEL = {};
const put = (bar, str, inst = 'lead', tr = 0) => { MEL[bar] = { str, inst, tr }; };

const HOOK = [
  'D5:2 E5:2 F#5:3 A5:3 F#5:2 E5:2 D5:2',
  'E5:3 C#5:3 A4:2 -:2 A4:2 B4:2 C#5:2',
  'D5:2 E5:2 F#5:3 A5:3 B5:2 A5:2 F#5:2',
  'A5:6 F#5:2 E5:4 D5:2 E5:2',
  'D5:2 E5:2 F#5:3 A5:3 F#5:2 E5:2 D5:2',
  'E5:3 F#5:3 E5:2 C#5:2 A4:2 B4:2 C#5:2',
  'D5:3 E5:3 F#5:2 E5:3 D5:3 C#5:2',
  'D5:10 -:2 A4:2 C#5:2',
];
// intro: the hook, half-remembered, on a bell
for (let i = 0; i < 4; i++) put(4 + i, HOOK[i], 'bell');
[
  'F#4:2 F#4:2 A4:2 B4:4 A4:2 F#4:2 E4:2',
  'D4:4 E4:2 F#4:6 -:4',
  'F#4:2 F#4:2 A4:2 D5:4 C#5:2 B4:2 A4:2',
  'B4:4 A4:2 E4:6 -:4',
  'F#4:2 F#4:2 A4:2 B4:4 A4:2 B4:2 D5:2',
  'E5:4 D5:2 B4:6 -:2 A4:2',
  'A4:2 B4:2 A4:2 F#4:4 E4:2 D4:2 E4:2',
  'E4:8 -:8',
].forEach((s, i) => put(8 + i, s, 'lead'));
[
  'G4:2 A4:2 B4:2 G4:2 B4:2 D5:2 E5:4',
  'F#4:2 A4:2 C#5:2 A4:2 C#5:2 E5:2 F#5:4',
  'G5:4 F#5:4 E5:4 D5:4',
  'A4:2 C#5:2 E5:2 A5:6 -:4',
].forEach((s, i) => put(16 + i, s, 'lead'));
HOOK.forEach((s, i) => put(20 + i, s, 'lead'));
[
  'B4:8 A4:4 G4:4',
  'A4:12 -:4',
  'C#5:8 B4:4 A4:4',
  'B4:12 -:4',
  'D5:8 C#5:4 B4:4',
  'C#5:8 E5:8',
  'F#5:16',
  '-:16',
].forEach((s, i) => put(28 + i, s, 'soft'));
[
  'B4:2 D5:2 G5:2 D5:2 B4:2 D5:2 G5:2 D5:2',
  'C#5:2 E5:2 A5:2 E5:2 C#5:2 E5:2 A5:2 E5:2',
  'C5:2 E5:2 G5:2 C6:2 G5:2 E5:2 G5:2 C6:2',
  'D6:12 -:4',
].forEach((s, i) => put(36 + i, s, 'lead'));
HOOK.forEach((s, i) => put(40 + i, s, 'lead', 2));
[
  HOOK[4], HOOK[5],
  'D5:2 E5:2 F#5:3 A5:3 B5:6',
  'B5:4 A5:4 G5:2 F#5:2 E5:4',
  'D5:16',
].forEach((s, i) => put(48 + i, s, 'lead', 2));

export const MELODY = [];
for (const bar of Object.keys(MEL).map(Number).sort((a, b) => a - b)) {
  const { str, inst, tr } = MEL[bar];
  let pos = 0;
  for (const tok of str.split(/\s+/)) {
    const [n, l] = tok.split(':');
    const len = +l;
    if (n !== '-') MELODY.push({ b: bar * 4 + pos / 4, d: len / 4, m: noteNum(n) + tr, inst, bar });
    pos += len;
  }
  if (pos !== 16) console.warn('[circles] bar', bar, 'sums to', pos);
}

// Drums: [{ b, k: 'kick'|'snare'|'clap'|'hat'|'ohat'|'crash'|'ride'|'rev', v }]
export const DRUMS = [];
const D = (b, k, v = 1) => DRUMS.push({ b, k, v });
for (let bar = 0; bar < BARS; bar++) {
  const s = sectionAt(bar * 4).id;
  const o = bar * 4;
  if (s === 'intro' && bar >= 4) {
    D(o, 'kick', 0.8); D(o + 2, 'kick', 0.7);
    for (let i = 0; i < 4; i++) D(o + i + 0.5, 'hat', 0.35);
    if (bar === 7) { for (let i = 0; i < 4; i++) D(o + 3 + i / 4, 'snare', 0.4 + i * 0.12); }
  } else if (s === 'verse') {
    D(o, 'kick'); D(o + 1.5, 'kick', 0.8); D(o + 2, 'kick', 0.9);
    D(o + 1, 'snare', 0.85); D(o + 3, 'snare', 0.85);
    for (let i = 0; i < 8; i++) D(o + i / 2, 'hat', i % 2 ? 0.5 : 0.3);
    if (bar === 11 || bar === 15) for (let i = 0; i < 4; i++) D(o + 3 + i / 4, 'snare', 0.45 + i * 0.12);
  } else if (s === 'pre') {
    for (let i = 0; i < 4; i++) D(o + i, 'kick');
    D(o + 1, 'snare'); D(o + 3, 'snare');
    for (let i = 0; i < 16; i++) D(o + i / 4, 'hat', i % 2 ? 0.25 : 0.45);
    if (bar === 19) {
      for (let i = 0; i < 4; i++) D(o + i / 2, 'snare', 0.5);
      for (let i = 0; i < 6; i++) D(o + 2 + i / 4, 'snare', 0.55 + i * 0.08);
      D(o + 3, 'rev', 1);
    }
  } else if (s === 'chorus' || s === 'final') {
    for (let i = 0; i < 4; i++) D(o + i, 'kick');
    D(o + 1, 'clap'); D(o + 3, 'clap'); D(o + 1, 'snare', 0.7); D(o + 3, 'snare', 0.7);
    for (let i = 0; i < 4; i++) D(o + i + 0.5, 'ohat', 0.55);
    if (s === 'final') for (let i = 0; i < 16; i++) if (i % 2) D(o + i / 4, 'hat', 0.3);
    for (let i = 0; i < 8; i++) D(o + i / 2, 'ride', i % 2 ? 0.25 : 0.4);
    if ((bar - (s === 'final' ? 40 : 20)) % 4 === 0) D(o, 'crash');
    if (bar === 27 || bar === 51) for (let i = 0; i < 4; i++) D(o + 3 + i / 4, 'snare', 0.5 + i * 0.12);
  } else if (s === 'bridge') {
    if (bar >= 32 && bar < 34) { D(o, 'kick', 0.45); D(o + 2.5, 'kick', 0.3); }
  } else if (s === 'build') {
    const n = bar - 36;
    for (let i = 0; i < 4; i++) D(o + i, 'kick', 0.6 + n * 0.12);
    if (n === 1) for (let i = 0; i < 8; i++) D(o + i / 2, 'snare', 0.35 + i * 0.03);
    if (n === 2) for (let i = 0; i < 16; i++) D(o + i / 4, 'snare', 0.45 + i * 0.02);
    if (n === 3) for (let i = 0; i < 12; i++) D(o + i / 4, 'snare', 0.6 + i * 0.03);
    if (n === 3) D(o + 3, 'rev', 0.8);
  } else if (s === 'outro' && bar === 52) {
    D(o, 'kick'); D(o, 'crash', 1.2);
  }
}
DRUMS.sort((a, b) => a.b - b.b);

// Bass: [{ b, d, m, v }]
export const BASS = [];
for (const c of CHORD_EVENTS) {
  const s = sectionAt(c.b).id;
  const bar = Math.floor(c.b / 4);
  const steps = (stepLen, oct) => {
    for (let t = 0; t < c.d - 1e-6; t += stepLen) {
      const up = oct && Math.round(t / stepLen) % 2 === 1;
      BASS.push({ b: c.b + t, d: stepLen * 0.82, m: c.bass + (up ? 12 : 0), v: up ? 0.75 : 1 });
    }
  };
  if (s === 'intro' && bar >= 4) BASS.push({ b: c.b, d: c.d * 0.95, m: c.bass, v: 0.7 });
  else if (s === 'verse' || s === 'chorus' || s === 'final') steps(0.5, true);
  else if (s === 'pre') steps(0.5, false);
  else if (s === 'bridge' && bar >= 32) BASS.push({ b: c.b, d: c.d * 0.98, m: c.bass, v: 0.6 });
  else if (s === 'build') {
    if (bar < 38) steps(0.5, false);
    else for (let t = 0; t < (bar === 39 ? 3 : 4); t += 0.25) BASS.push({ b: c.b + t, d: 0.2, m: c.bass, v: 0.8 });
  } else if (s === 'outro') BASS.push({ b: c.b, d: c.d, m: c.bass, v: bar === 52 ? 1 : 0.5 });
}

// Harmony layer descriptors (synth.js decides the sound).
// stabs: future-bass chord hits in the choruses, syncopated 3+3+4+2+2+2 (16ths)
export const STABS = [];
const STAB_RHYTHM = [[0, 2.6], [3, 2.6], [6, 3.4], [10, 1.6], [12, 1.6], [14, 1.6]];
for (const c of CHORD_EVENTS) {
  const s = sectionAt(c.b).id;
  if (s !== 'chorus' && s !== 'final') continue;
  for (const [p, l] of STAB_RHYTHM) {
    const b = Math.floor(c.b / 4) * 4 + p / 4;
    if (b >= c.b - 1e-6 && b < c.b + c.d - 1e-6) STABS.push({ b, d: l / 4, notes: c.notes });
  }
}
// pads: sustained chords (intro, verse quietly, pre, bridge, outro)
export const PADS = CHORD_EVENTS
  .filter((c) => ['intro', 'verse', 'pre', 'bridge', 'outro', 'build'].includes(sectionAt(c.b).id))
  .map((c) => ({ b: c.b, d: c.d, notes: c.notes, v: { intro: 0.7, verse: 0.35, pre: 0.6, bridge: 0.8, outro: 0.9, build: 0.5 }[sectionAt(c.b).id] }));
// arps: music-box bell in intro bars 0-3 and the outro; electric piano in the bridge
export const ARPS = [];
for (const c of CHORD_EVENTS) {
  const s = sectionAt(c.b).id;
  const bar = Math.floor(c.b / 4);
  const tones = [c.notes[0] + 12, c.notes[1] + 12, c.notes[2] + 12, c.notes[3] + 12];
  const order = [0, 1, 2, 3, 2, 1, 3, 2];
  if ((s === 'intro' && bar < 4) || s === 'outro') {
    const step = s === 'outro' ? (bar >= 54 ? 1 : 0.5) : 0.5;
    for (let t = 0, k = 0; t < c.d - 1e-6; t += step, k++) ARPS.push({ b: c.b + t, m: tones[order[k % 8]], inst: 'bell', v: s === 'outro' ? 0.55 - (bar - 52) * 0.1 : 0.5 });
  } else if (s === 'bridge') {
    for (let t = 0, k = 0; t < c.d - 1e-6; t += 0.5, k++) ARPS.push({ b: c.b + t, m: tones[order[k % 8]] - 12, inst: 'ep', v: 0.55 });
  } else if (s === 'verse') {
    ARPS.push({ b: c.b, m: c.notes[0], inst: 'epchord', notes: c.notes, v: 0.5 });
    ARPS.push({ b: c.b + 2.5, m: c.notes[0], inst: 'epchord', notes: c.notes, v: 0.35 });
  }
}

export const RISERS = [
  { b: 36 * 4, d: 15, kind: 'noise' },      // the build
  { b: 19 * 4, d: 4, kind: 'noise' },       // into the first chorus
];
