// A small songwriter for 1985. Given a recipe (style + seed) it writes a whole arrangement:
// form (A メロ / B メロ / サビ), progressions from the era's vocabulary (王道進行, 丸サ進行,
// ii–V, borrowed iv, the kayō minor cycle), voice-led chords, a singable lead line built from
// motifs (with ヨナ抜き colour where the style wants it), and parts for every player.
// No real song is quoted: everything is generated from rules, per record, per side.

import { rng } from './util.js';

const Q = {
  '': [0, 4, 7], m: [0, 3, 7], maj7: [0, 4, 7, 11], maj9: [0, 4, 7, 11, 14], 6: [0, 4, 7, 9], 69: [0, 4, 7, 9, 14],
  add9: [0, 4, 7, 14], m7: [0, 3, 7, 10], m9: [0, 3, 7, 10, 14], m11: [0, 3, 7, 10, 14, 17], 7: [0, 4, 7, 10],
  9: [0, 4, 7, 10, 14], 13: [0, 4, 7, 10, 14, 21], '7sus4': [0, 5, 7, 10], '9sus4': [0, 5, 7, 10, 14],
  m7b5: [0, 3, 6, 10], dim7: [0, 3, 6, 9], aug: [0, 4, 8], '7b9': [0, 4, 7, 10, 13], 'maj7#11': [0, 4, 7, 11, 18],
  mM7: [0, 3, 7, 11], m6: [0, 3, 7, 9], sus4: [0, 5, 7], '7#5': [0, 4, 8, 10],
};
const QALIAS = { M7: 'maj7', M9: 'maj9', 'M7#11': 'maj7#11' };
const DEG = { I: 0, II: 2, III: 4, IV: 5, V: 7, VI: 9, VII: 11 };

function parseChord(sym) {
  const m = sym.match(/^([b#]?)(VII|VI|IV|V|III|II|I)([^/]*)(?:\/([b#]?)(VII|VI|IV|V|III|II|I))?$/);
  if (!m) throw new Error('chord? ' + sym);
  const acc = (a) => (a === 'b' ? -1 : a === '#' ? 1 : 0);
  const deg = (DEG[m[2]] + acc(m[1]) + 12) % 12;
  let q = m[3] || '';
  if (QALIAS[q]) q = QALIAS[q];
  if (!Q[q]) throw new Error('quality? ' + sym);
  const bassDeg = m[5] ? (DEG[m[5]] + acc(m[4]) + 12) % 12 : deg;
  return { deg, q, bassDeg };
}
const parseProg = (str) => str.split('|').map((b) => b.trim().split(/\s+/).map(parseChord));

// ---------------------------------------------------------------- vocabulary
const CITY = {
  A: [
    'IVM7 | III7 | VIm7 | Vm7 I7 | IVM7 | III7 | VIm7 | IIm7 V9sus4',
    'IM7 | VIm7 | IIm7 | V9sus4 | IM7 | VIm7 | IIm7 | bVIIM7 V9sus4',
    'IIm7 | V7 | IIIm7 | VIm7 | IIm7 | V7 | IM7 | IM7',
    'VIm9 | IIm9 | V9sus4 | IM9 | VIm9 | IIm9 | bVIIM7 | V9sus4',
    'IM7 | IIIm7 | IVM7 | V9sus4 | IM7 | IIIm7 | IVM7 | IVm7 bVII9',
  ],
  B: [
    'IIm7 | IIIm7 | IVM7 | V9sus4',
    'IVM7 | V/IV | IIIm7 VIm7 | IIm7 V9sus4',
    'bVIM7 | bVII9sus4 | IIm7 | V9sus4',
    'IVM7 | IVm6 | IIIm7 | VI7',
  ],
  C: [
    'IVM7 | V7 | IIIm7 | VIm7 | IIm7 | V7sus4 V7 | IM7 | I7',
    'IVM7 | III7 | VIm7 | Vm7 I7 | IVM7 | III7 | VIm7 | IIm7 V9sus4',
    'IIm7 | V7 | IIIm7 | VIm7 | IIm7 | V7 | IM7 | IVM7 V9sus4',
    'IVM7 | V/IV | IIIm7 | VIm7 | IVM7 | V/IV | IM7 | IM7',
  ],
  X: ['IVM7 | III7 | VIm7 | Vm7 I7', 'IM7 | bVIIM7 | IVM7 | V9sus4', 'IIm9 | V9sus4 | IM9 | IM9'],
};
const IDOL = {
  A: [
    'I | V/VII | VIm | IIIm/V | IV | I/III | IIm7 | V7sus4 V7',
    'I | IIIm | IV | V | I | IIIm | IV | V7sus4 V7',
    'VIm | IV | V | I | VIm | IV | IIm7 | V7sus4 V7',
    'IVM7 | V | IIIm7 | VIm | IVM7 | V | Isus4 I | I',
  ],
  B: [
    'IIm7 | IIIm7 | IVM7 | V7sus4 V7 | IIm7 | IIIm7 | IVM7 | V7sus4 V7',
    'IV | V | IIIm | VIm | IV | V | IIm7 | V7',
    'bVI | bVII | I | I | bVI | bVII | V7sus4 | V7',
  ],
  C: [
    'IVM7 | V | IIIm7 | VIm | IVM7 | V | I | I',
    'IV | V | IIIm | VIm | IIm7 | V7sus4 V7 | I | I7',
    'I | V/VII | VIm | IIIm | IV | I/III | IIm7 V7 | I',
    'IVM7 | V7 | IIIm7 | VIm7 | IVM7 | IVm6 | I | I',
  ],
  X: ['IVM7 | V | IIIm7 | VIm', 'I | V/VII | VIm | V', 'bVI | bVII | IV/V | V7'],
};
// bittersweet idol: more maj7, the minor iv, softer
const TENDER = {
  A: [
    'IM7 | IIIm7 | IVM7 | IVm6 | IM7 | VIm7 | IIm7 | V7sus4 V7',
    'IVM7 | V/IV | IIIm7 | VIm7 | IIm7 | IIIm7 | IVM7 | V7sus4',
    'I | V/VII | VIm7 | IIIm7 | IVM7 | I/III | IIm7 | V7sus4 V7',
  ],
  B: ['IIm7 | IIIm7 | IVM7 | IVm6', 'bVIM7 | bVII | IM7 | V7sus4', 'IVM7 | IIIm7 | IIm7 | V7sus4 V7'],
  C: [
    'IVM7 | V7 | IIIm7 | VIm7 | IVM7 | IVm6 | IM7 | IM7',
    'IVM7 | V/IV | IIIm7 | VIm7 | IIm7 | V7sus4 V7 | IM7 | IVm6',
  ],
  X: ['IVM7 | IVm6 | IM7 | IM7', 'IM7 | IIIm7 | IVM7 | V7sus4'],
};
const BALLAD = { // minor key: I = the minor tonic
  A: [
    'Im | bVIM7 | IVm7 | V7 | Im | bVIM7 | IIm7b5 | V7',
    'Im | Im/bVII | bVIM7 | V7 | IVm7 | bVII7 | bIIIM7 | V7',
    'Im | bVII | bVI | V7 | Im | bVII | bVIM7 | V7sus4 V7',
  ],
  B: ['IVm7 | bVII7 | bIIIM7 bVIM7 | IIm7b5 V7', 'bVIM7 | bVII | Im | V7sus4 V7', 'IVm7 | V7 | bIIIM7 | V7'],
  C: [
    'bVIM7 | bVII7 | bIIIM7 | Im7 | bVIM7 | bVII7 | V7sus4 V7 | Im',
    'IVm7 | bVII7 | bIIIM7 | bVIM7 | IIm7b5 | V7 | Im | Im',
    'bVI | bVII | Im | Im | bVI | bVII | V7 | V7',
  ],
  X: ['Im | bVIM7 | IVm7 | V7', 'bVIM7 | bVII | Im | Im'],
};
const EURO = {
  A: [
    'IM7 | bVIIM7 | IVm6 | IM7 | VIm7 | IIm7 | bIIM7 | IM7',
    'I | #Idim7 | IIm7 | V7 | IIIm7 | VI7 | IIm7 | V7',
    'VIm | IIIm | IVM7 | IM7 | IIm7 | V7 | IM7 | IM7',
  ],
  B: [
    'IVM7 | IVm6 | IIIm7 | VI7 | IIm7 | bII7 | IM7 | IM7',
    'bVIM7 | bVIIM7 | IM7 | IM7 | bVIM7 | bVIIM7 | V7sus4 | V7',
  ],
  C: [
    'IVM7 | V/IV | IIIm7 | VI7 | IIm7 | V7 | IM7 | IM7',
    'I | VIm | IIm7 | V7 | IIIm7 | VI7 | IIm7 V7 | I',
    'IVM7 | IIIm7 | IIm7 | IM7 | IVM7 | IIIm7 | bIIM7 | IM7',
  ],
  X: ['IM7 | bVIIM7 | IM7 | bVIIM7', 'IVM7 | IVm6 | IM7 | IM7'],
};
const EURO_MIN = {
  A: ['Im | IVm7 | bVII7 | bIIIM7 | bVIM7 | IIm7b5 | V7 | Im', 'Im | Im/bVII | bVIM7 | V7 | Im | IVm6 | V7 | Im'],
  B: ['bVIM7 | bVII7 | bIIIM7 | bIIIM7 | IVm7 | V7 | Im | V7'],
  C: ['IVm7 | bVII7 | bIIIM7 | bVIM7 | IIm7b5 | V7 | Im | Im', 'bVIM7 | bVII | bIIIM7 | bVIM7 | IVm7 | V7sus4 | V7 | Im'],
  X: ['Im | IVm7 | bVII7 | bIIIM7', 'bVIM7 | IIm7b5 | V7 | V7'],
};

// rhythm cells: [onset, duration] in 16ths within one bar
const CELLS = {
  citypop: {
    run: [
      [[0, 2], [2, 2], [4, 3], [7, 3], [10, 2], [12, 4]],
      [[2, 2], [4, 2], [6, 4], [10, 2], [12, 2], [14, 2]],
      [[0, 3], [3, 3], [6, 2], [8, 4], [12, 2], [14, 2]],
      [[1, 2], [3, 3], [6, 2], [8, 2], [10, 6]],
      [[0, 4], [4, 2], [6, 2], [8, 2], [10, 2], [12, 4]],
      [[2, 1], [3, 3], [6, 2], [8, 3], [11, 5]],
    ],
    end: [[[0, 2], [2, 2], [4, 10]], [[0, 6], [6, 8]], [[2, 2], [4, 2], [6, 8]], [[0, 3], [3, 11]]],
  },
  idol: {
    run: [
      [[0, 2], [2, 2], [4, 2], [6, 2], [8, 4], [12, 4]],
      [[0, 3], [3, 1], [4, 4], [8, 3], [11, 1], [12, 4]],
      [[0, 2], [2, 2], [4, 4], [8, 2], [10, 2], [12, 4]],
      [[2, 2], [4, 2], [6, 2], [8, 2], [10, 2], [12, 2], [14, 2]],
      [[0, 4], [4, 4], [8, 2], [10, 2], [12, 4]],
    ],
    end: [[[0, 4], [4, 12]], [[0, 2], [2, 2], [4, 12]], [[0, 8], [8, 8]]],
  },
  ballad: {
    run: [
      [[0, 6], [6, 2], [8, 4], [12, 4]],
      [[2, 2], [4, 2], [6, 2], [8, 8]],
      [[0, 3], [3, 1], [4, 4], [8, 2], [10, 2], [12, 4]],
      [[0, 2], [2, 2], [4, 6], [10, 2], [12, 4]],
    ],
    end: [[[0, 16]], [[0, 4], [4, 12]], [[2, 2], [4, 12]]],
  },
  euro: {
    run: [
      [[0, 4], [4, 4], [8, 4]],
      [[0, 6], [6, 2], [8, 4]],
      [[0, 2], [2, 2], [4, 4], [8, 4]],
      [[0, 8], [8, 2], [10, 2]],
      [[4, 4], [8, 4]],
    ],
    end: [[[0, 12]], [[0, 4], [4, 8]], [[0, 8], [8, 4]]],
  },
};
CELLS.mellow = { run: CELLS.citypop.run.filter((_, i) => i !== 1 && i !== 4), end: CELLS.citypop.end };
const SOLO_CELLS = [
  [[0, 1], [1, 1], [2, 2], [4, 1], [5, 1], [6, 2], [8, 2], [10, 1], [11, 1], [12, 4]],
  [[0, 2], [2, 1], [3, 1], [4, 2], [6, 2], [8, 1], [9, 1], [10, 2], [12, 2], [14, 2]],
  [[2, 2], [4, 1], [5, 1], [6, 1], [7, 1], [8, 4], [12, 1], [13, 1], [14, 2]],
];

const STYLES = {
  citypop: { beats: 4, bpm: [98, 112], banks: CITY, minor: false, leads: ['sax', 'sax'], solo: 'synth',
    form: (r) => [['intro', 4], ['A', 8], ['A2', 8], ['B', 4], ['C', 8], ['X', 4], ['A', 8], ['B', 4], ['C', 8], ['C', 8], ['outro', 8]],
    tension: 1.4, yona: 0, swing: 0.03 },
  mellow: { beats: 4, bpm: [86, 96], banks: CITY, minor: false, leads: ['flute', 'flute'], solo: 'sax',
    form: (r) => [['intro', 4], ['A', 8], ['B', 4], ['C', 8], ['X', 8], ['A', 8], ['B', 4], ['C', 8], ['outro', 8]],
    tension: 1.6, yona: 0, swing: 0.1 },
  idol: { beats: 4, bpm: [128, 142], banks: IDOL, minor: false, leads: ['synth', 'synth'], solo: 'brass',
    form: (r) => [['intro', 4], ['A', 8], ['B', 8], ['C', 8], ['X', 4], ['A', 8], ['B', 8], ['C', 8], ['bridge', 4], ['Cmod', 8], ['outro', 4]],
    tension: 0.5, yona: 0.9, swing: 0 },
  tender: { beats: 4, bpm: [112, 120], banks: TENDER, minor: false, leads: ['flute', 'strings'], solo: 'oboe',
    form: (r) => [['intro', 4], ['A', 8], ['B', 4], ['C', 8], ['X', 4], ['A', 8], ['B', 4], ['C', 8], ['bridge', 4], ['Cmod', 8], ['outro', 8]],
    tension: 0.9, yona: 0.6, swing: 0 },
  ballad: { beats: 4, bpm: [66, 74], banks: BALLAD, minor: true, leads: ['oboe', 'strings'], solo: 'sax',
    form: (r) => [['intro', 4], ['A', 8], ['B', 4], ['C', 8], ['X', 4], ['A', 8], ['B', 4], ['C', 8], ['Cmod', 8], ['outro', 4]],
    tension: 0.4, yona: 0.9, swing: 0 },
  euro: { beats: 3, bpm: [104, 118], banks: EURO, minor: false, leads: ['flute', 'oboe'], solo: 'strings',
    form: (r) => [['intro', 4], ['A', 8], ['A2', 8], ['B', 8], ['C', 8], ['X', 8], ['A', 8], ['C', 8], ['C', 8], ['outro', 4]],
    tension: 0.8, yona: 0, swing: 0 },
};

const MAJ = [0, 2, 4, 5, 7, 9, 11], MIN = [0, 2, 3, 5, 7, 8, 10];
const YONA_MAJ = new Set([0, 2, 4, 7, 9]), YONA_MIN = new Set([0, 2, 3, 7, 8]);
const pcOf = (m) => ((m % 12) + 12) % 12;

function voicingIntervals(q, rootless) {
  const iv = Q[q].slice();
  if (!rootless) return iv.slice(0, 4);
  if (iv.length < 4) return iv.concat([12]);
  let out = iv.filter((x) => x !== 0);
  if ((q === 'maj7' || q === 'm7' || q === '7' || q === '6') && !out.includes(14)) out.push(14);
  if (out.length > 4) out = out.filter((x) => x !== 7);
  return out.slice(0, 4);
}

function voice(pcs, lo, hi, prev, maxSpan) {
  const opts = pcs.map((pc) => { const a = []; for (let p = lo; p <= hi; p++) if (pcOf(p) === pc) a.push(p); return a; });
  let best = null, bestS = Infinity;
  const cur = [];
  const mid = (lo + hi) / 2;
  const rec = (i) => {
    if (i === opts.length) {
      const v = cur.slice().sort((a, b) => a - b);
      for (let k = 1; k < v.length; k++) if (v[k] === v[k - 1]) return;
      if (v[v.length - 1] - v[0] > maxSpan) return;
      let s = 0;
      if (prev && prev.length) {
        const n = Math.min(v.length, prev.length);
        for (let k = 0; k < n; k++) s += Math.abs(v[k] - prev[k]);
        s += Math.abs(v[v.length - 1] - prev[prev.length - 1]) * 0.6;
      }
      s += Math.abs((v[0] + v[v.length - 1]) / 2 - mid) * 0.35;
      for (let k = 1; k < v.length; k++) if (v[k] - v[k - 1] === 1 && v[k - 1] < 62) s += 5;
      if (s < bestS) { bestS = s; best = v; }
      return;
    }
    for (const p of opts[i]) { cur.push(p); rec(i + 1); cur.pop(); }
  };
  rec(0);
  return best || pcs.map((pc) => lo + pcOf(pc - lo)).sort((a, b) => a - b);
}

// ---------------------------------------------------------------- the songwriter
export function compose(recipe) {
  const r = rng(recipe.seed);
  const st = STYLES[recipe.style] || STYLES.citypop;
  const style = recipe.style in STYLES ? recipe.style : 'citypop';
  const cellsKey = style === 'tender' ? 'idol' : style;
  const beats = st.beats, SPB = beats * 4;
  const bpm = recipe.bpm || Math.round(r.range(st.bpm[0], st.bpm[1]));
  let minor = st.minor;
  let banks = st.banks;
  if (style === 'euro' && (recipe.minor ?? r.chance(0.4))) { minor = true; banks = EURO_MIN; }
  const key = recipe.key ?? r.int(0, 11);
  const leads = recipe.leads || st.leads;
  const form = st.form(r);
  const modUp = style === 'ballad' ? 1 : 2;

  const progs = {};
  const progFor = (label) => {
    const base = label === 'A2' ? 'A' : label === 'Cmod' || label === 'outro' ? 'C' : label === 'intro' ? 'X' : label === 'bridge' ? 'X' : label;
    if (label === 'bridge') {
      if (!progs.bridge) progs.bridge = parseProg(minor ? 'bVIM7 | bVII7 | IVm7 | V7' : style === 'idol' || style === 'tender' ? 'bVI | bVII | IV/V | V7' : 'IVM7 | IVm6 | IIm7 | V7sus4');
      return progs.bridge;
    }
    if (!progs[base]) progs[base] = parseProg(r.pick(banks[base]));
    return progs[base];
  };
  if (style === 'idol' || style === 'tender' || style === 'ballad') progs.X = progFor('C').slice(0, 4);

  // ---- bars
  const bars = [];
  let barNo = 0;
  form.forEach(([label, n], si) => {
    const prog = progFor(label);
    const transpose = (label === 'Cmod' || (label === 'outro' && form.some((f) => f[0] === 'Cmod'))) ? modUp : 0;
    for (let i = 0; i < n; i++) {
      const pb = prog[i % prog.length];
      const per = SPB / pb.length;
      const chords = pb.map((c, k) => {
        const root = pcOf(key + c.deg + transpose);
        return { root, q: c.q, bass: pcOf(key + c.bassDeg + transpose), at: k * per, len: per, deg: c.deg };
      });
      bars.push({ label, si, i, n, chords, tr: transpose, no: barNo++ });
    }
  });
  const totalSteps = bars.length * SPB;

  const ev = [];
  const E = (s, i, o) => { o.s = s; o.i = i; ev.push(o); };
  const chordAt = (bar, step) => { let c = bar.chords[0]; for (const x of bar.chords) if (x.at <= step) c = x; return c; };

  // ---- melody
  const keyPcBase = key;
  const scaleOf = (tr) => (minor ? MIN : MAJ).map((x) => pcOf(keyPcBase + tr + x));
  const yonaSet = minor ? YONA_MIN : YONA_MAJ;
  const melodies = {};
  const leadLo = { sax: 61, flute: 67, oboe: 63, synth: 64, strings: 62, brass: 58 };

  function writeMelody(label, secBars, solo) {
    const isC = label === 'C' || label === 'Cmod' || label === 'outro';
    const kind = solo ? st.solo : isC ? leads[1] : leads[0];
    const lo0 = leadLo[kind] ?? 62;
    const lo = lo0 + (isC ? 3 : 0) + (solo ? 4 : 0), hi = lo0 + 19 + (isC ? 2 : 0);
    const cellBank = CELLS[cellsKey];
    // plan: bars of an 8-bar period; letters repeat the same rhythm (that's the hook)
    const n = secBars.length;
    const plan = n >= 8 ? ['a', 'b', 'a', 'E', 'c', 'd', 'a', 'F'] : n >= 4 ? ['a', 'b', 'c', 'E'] : ['a', 'E'];
    const cells = {};
    const pickCell = (L) => {
      if (cells[L]) return cells[L];
      if (solo) return (cells[L] = r.pick(SOLO_CELLS));
      cells[L] = L === L.toUpperCase() ? r.pick(cellBank.end) : r.pick(cellBank.run);
      return cells[L];
    };
    const notes = [];
    let prev = Math.round((lo + hi) / 2) - 2;
    let prevD = 0;
    const motif = {};
    const center = (lo + hi) / 2 - 2;
    for (let b = 0; b < n; b++) {
      const L = plan[b % plan.length];
      const cell = pickCell(L);
      const bar = secBars[b];
      const scale = scaleOf(bar.tr);
      const tonic = pcOf(keyPcBase + bar.tr);
      const firstOfLetter = !motif[L];
      const ints = [];
      cell.forEach(([on, dur], k) => {
        const s = b * SPB + on;
        const ch = chordAt(bar, on);
        const ctones = Q[ch.q].filter((x) => x < 12 || x === 14 || x === 21).map((x) => pcOf(ch.root + x));
        const core = Q[ch.q].filter((x) => x < 12).map((x) => pcOf(ch.root + x));
        const tens = [14, 21, 17].map((x) => pcOf(ch.root + x));
        const strong = on % 4 === 0 || dur >= 4;
        const lastNote = b === n - 1 && k === cell.length - 1;
        const phrasePos = ((b % 2) * SPB + on) / (2 * SPB);
        const secPos = s / (n * SPB);
        const target = center + 4.5 * Math.sin(Math.PI * phrasePos) * (b % 4 < 2 ? 1 : 0.7) + (isC ? 3 * Math.sin(Math.PI * secPos) : (secPos - 0.5) * 2);
        let best = prev, bestS = -1e9;
        for (let p = lo; p <= hi; p++) {
          const pc = pcOf(p);
          const inScale = scale.includes(pc);
          const isCt = core.includes(pc);
          if (!inScale && !isCt && !ctones.includes(pc)) continue;
          let sc = 0;
          if (isCt) sc += strong ? 3 : 1.1;
          else if (tens.includes(pc) && ctones.includes(pc)) sc += strong ? st.tension : 0.4;
          else if (tens.includes(pc)) sc += strong ? st.tension * 0.6 : 0.4;
          else sc += strong ? -2.6 : 0.25;
          // avoid notes a semitone above a chord tone on strong beats
          if (strong && !isCt && core.some((c) => pcOf(pc - c) === 1)) sc -= 4;
          const d = p - prev, ad = Math.abs(d);
          sc += ad === 0 ? (style === 'idol' ? -0.1 : -0.7) : ad <= 2 ? 2 : ad <= 4 ? 1 : ad <= 7 ? -0.4 : ad <= 9 ? -2 : -5;
          if (Math.abs(prevD) > 4) sc += (Math.sign(d) === Math.sign(prevD)) ? -2.5 : ad <= 2 ? 1.5 : 0;
          sc += 1.6 * Math.max(-1, 1 - Math.abs(p - target) / 6);
          if (st.yona > 0 && !isCt) sc += yonaSet.has(pcOf(pc - tonic)) ? 0.6 * st.yona : -0.6 * st.yona;
          if (!firstOfLetter && motif[L][k] != null && k > 0) {
            const mi = motif[L][k];
            if (d === mi) sc += 2.6; else if (Math.sign(d) === Math.sign(mi) && Math.abs(d - mi) <= 2) sc += 1;
          }
          if (lastNote) {
            if (pc === tonic) sc += 6; else if (isCt) sc += 2; else sc -= 6;
          }
          sc += r() * 0.9;
          if (sc > bestS) { bestS = sc; best = p; }
        }
        ints.push(best - prev);
        prevD = best - prev;
        prev = best;
        notes.push({ s, d: dur, m: best, v: strong ? 0.78 : 0.64 });
      });
      if (firstOfLetter) motif[L] = ints;
    }
    // trim overlaps & add a breath before each phrase start
    notes.sort((a, b) => a.s - b.s);
    for (let i = 0; i < notes.length - 1; i++) {
      const gap = notes[i + 1].s - notes[i].s;
      if (notes[i].d > gap) notes[i].d = gap;
      if (notes[i].d === gap && gap >= 4 && r.chance(0.5)) notes[i].d = gap - 1;
    }
    return { notes, kind };
  }

  // gather bars by section occurrence
  const sections = [];
  bars.forEach((b) => {
    if (!sections.length || sections[sections.length - 1].si !== b.si) sections.push({ label: b.label, si: b.si, bars: [], start: b.no });
    sections[sections.length - 1].bars.push(b);
  });

  const melodyFor = (sec) => {
    const L = sec.label;
    if (L === 'intro' || L === 'bridge') return null;
    if (L === 'X') return writeMelody('X', sec.bars, true);
    if (L === 'A2') {
      const base = melodies.A || (melodies.A = writeMelody('A', sec.bars, false));
      const alt = writeMelody('A2', sec.bars, false);
      const half = (sec.bars.length / 2) * SPB;
      return { kind: base.kind, notes: base.notes.filter((n) => n.s < half).concat(alt.notes.filter((n) => n.s >= half)) };
    }
    const key2 = L === 'Cmod' || L === 'outro' ? 'C' : L;
    if (!melodies[key2]) melodies[key2] = writeMelody(key2, sec.bars, false);
    if (L === 'Cmod') return { kind: melodies.C.kind, notes: melodies.C.notes.map((n) => ({ ...n, m: n.m + modUp })) };
    if (L === 'outro') {
      const tr = sec.bars[0].tr;
      return { kind: melodies.C.kind, notes: melodies.C.notes.filter((n) => n.s < sec.bars.length * SPB).map((n) => ({ ...n, m: n.m + tr, v: n.v * 0.85 })) };
    }
    return melodies[key2];
  };

  sections.forEach((sec) => {
    const mel = melodyFor(sec);
    if (!mel) return;
    const base = sec.start * SPB;
    const isC = sec.label === 'C' || sec.label === 'Cmod';
    mel.notes.forEach((n) => {
      E(base + n.s, 'lead', { m: n.m, v: n.v, d: Math.max(1, n.d), k: mel.kind });
      if ((style === 'idol' || style === 'tender') && isC && n.d >= 2) E(base + n.s, 'bell', { m: n.m + 12, v: 0.35 });
      if (style === 'euro' && isC && n.d >= 6) E(base + n.s, 'bell', { m: n.m + 12, v: 0.3 });
      if (style === 'citypop' && isC && sec.label !== 'outro' && n.d >= 6 && r.chance(0.5)) E(base + n.s, 'brass', { m: n.m - 12, v: 0.4, d: n.d });
    });
  });

  // ---- accompaniment
  let epPrev = null, padPrev = null, gtrPrev = null, bassPrev = 40, pushed = false;
  const bassPitch = (pc) => {
    let best = 40, bd = 1e9;
    for (let p = 31; p <= 50; p++) if (pcOf(p) === pc) { const d = Math.abs(p - bassPrev) + Math.abs(p - 39) * 0.4; if (d < bd) { bd = d; best = p; } }
    bassPrev = best; return best;
  };
  const rootless = style === 'citypop' || style === 'mellow';
  const chordVoicing = (c, lo, hi, prev, span = 14, n = 4) => {
    const iv = voicingIntervals(c.q, rootless).slice(0, n);
    return voice(iv.map((x) => pcOf(c.root + x)), lo, hi, prev, span);
  };
  const nextChordOf = (barIdx, c) => {
    const bar = bars[barIdx];
    const k = bar.chords.indexOf(c);
    if (k < bar.chords.length - 1) return bar.chords[k + 1];
    return bars[barIdx + 1] ? bars[barIdx + 1].chords[0] : c;
  };

  const sw = st.swing;
  const swing = (st16) => (st16 % 2 === 1 ? sw : 0);
  const energyOf = (L) => ({ intro: 0.7, A: 0.5, A2: 0.55, B: 0.7, C: 1, Cmod: 1, X: 0.8, bridge: 0.6, outro: 0.85 })[L] ?? 0.6;

  const pats = {
    epCity: [[[0, 4], [6, 3], [10, 2], [14, 2, 1]], [[0, 6], [8, 3], [11, 3], [14, 2, 1]], [[0, 3], [3, 3], [8, 4], [14, 2, 1]]],
    epSoft: [[[0, 14]], [[0, 6], [6, 10]], [[2, 4], [8, 8]]],
    gtr: ['.mXm.mXm.mXm.mXm', 'X.mX.mX.mXm.X.m.', '..X...X...X...X.', 'm.X.mmX.m.X.mmXm'],
    bassCity: [
      [[0, 3, 'r'], [3, 1, 'r'], [6, 2, 'o'], [8, 3, 'r'], [11, 1, 'f'], [12, 2, 'o'], [14, 2, 'a']],
      [[0, 4, 'r'], [6, 2, 'r'], [7, 1, 'o'], [10, 2, 'f'], [12, 2, 'r'], [14, 2, 'a']],
      [[0, 6, 'r'], [6, 2, 'r'], [8, 4, 'f'], [12, 2, 'o'], [14, 2, 'a']],
    ],
  };
  const P = {
    ep: r.pick(pats.epCity), epSoft: r.pick(pats.epSoft), gtr: r.pick(pats.gtr), gtrSoft: pats.gtr[2],
    bass: r.pick(pats.bassCity), kick: r.pick([[0, 8, 10], [0, 6, 8], [0, 3, 8, 11], [0, 8, 11, 14]]),
  };

  const fillAt = (barIdx) => {
    const b = bars[barIdx], nx = bars[barIdx + 1];
    return nx && nx.si !== b.si;
  };

  bars.forEach((bar, bi) => {
    const s0 = bi * SPB;
    const L = bar.label;
    const en = energyOf(L);
    const C = ['C', 'Cmod', 'outro'].includes(L);
    const fill = fillAt(bi);
    const sectionStart = bar.i === 0;
    const crashHere = sectionStart && (C || L === 'X' || L === 'A' && bi > 0 || L === 'bridge');
    const t = (st16) => s0 + st16 + swing(st16);

    // ------------- drums
    if (style === 'citypop' || style === 'mellow') {
      const soft = style === 'mellow' && !C;
      if (crashHere) E(t(0), 'crash', { v: 0.6 });
      if (!fill) {
        for (const k of P.kick) E(t(k), 'kick', { v: k === 0 ? 0.9 : 0.72 });
        [4, 12].forEach((k) => (soft ? E(t(k), 'rim', { v: 0.7 }) : E(t(k), 'snare', { v: 0.85, g: 0.9 })));
        if (en >= 0.7 && !soft) [7, 15].forEach((k) => r.chance(0.5) && E(t(k), 'snare', { v: 0.18, g: 0 }));
        for (let k = 0; k < 16; k += en >= 0.7 ? 1 : 2) {
          const open = C && k === 14;
          E(t(k), 'hat', { v: (k % 4 === 0 ? 0.6 : k % 2 === 0 ? 0.45 : 0.28) * (soft ? 0.7 : 1), o: open });
        }
        if (C) { for (let k = 0; k < 16; k += 2) E(t(k + 1), 'shaker', { v: 0.45 }); E(t(4), 'tamb', { v: 0.5 }); E(t(12), 'tamb', { v: 0.5 }); }
      } else {
        E(t(0), 'kick', { v: 0.9 }); E(t(4), 'snare', { v: 0.85, g: 0.9 }); E(t(6), 'kick', { v: 0.7 });
        for (let k = 0; k < 8; k += 2) E(t(k), 'hat', { v: 0.45 });
        if (r.chance(0.6)) [[8, 50], [10, 47], [12, 43], [14, 40]].forEach(([k, m]) => E(t(k), 'tom', { m, v: 0.8 }));
        else for (let k = 8; k < 16; k++) E(t(k), 'snare', { v: 0.3 + (k - 8) * 0.08, g: k >= 14 ? 0.8 : 0.2 });
      }
    } else if (style === 'idol' || style === 'tender') {
      const four = C || L === 'X' || (L === 'B' && style === 'idol');
      if (crashHere) E(t(0), 'crash', { v: 0.6 });
      if (!fill) {
        const kicks = four ? [0, 4, 8, 12] : style === 'tender' ? [0, 10] : [0, 8, 10];
        kicks.forEach((k) => E(t(k), 'kick', { v: 0.85 }));
        [4, 12].forEach((k) => { E(t(k), 'snare', { v: style === 'tender' && !C ? 0.55 : 0.8, g: 0.8 }); if (four && style === 'idol') E(t(k), 'clap', { v: 0.55 }); });
        for (let k = 0; k < 16; k += 2) {
          const off = k % 4 === 2;
          E(t(k), 'hat', { v: off ? 0.5 : 0.32, o: four && off && style === 'idol' });
        }
        if (C) for (let k = 0; k < 16; k++) if (k % 2 === 1) E(t(k), 'tamb', { v: 0.22 });
      } else {
        [0, 4].forEach((k) => E(t(k), 'kick', { v: 0.85 })); E(t(4), 'snare', { v: 0.8, g: 0.8 });
        for (let k = 8; k < 16; k++) E(t(k), 'snare', { v: 0.28 + (k - 8) * 0.08, g: k >= 14 ? 0.8 : 0.2 });
      }
    } else if (style === 'ballad') {
      const drums = C || L === 'X' || (L === 'B' && bar.i >= 2);
      if (crashHere && drums) E(t(0), 'crash', { v: 0.45 });
      if (L === 'A' && bi > 12) { E(t(4), 'rim', { v: 0.5 }); E(t(12), 'rim', { v: 0.5 }); }
      if (drums && !fill) {
        E(t(0), 'kick', { v: 0.75 }); E(t(10), 'kick', { v: 0.55 });
        E(t(4), 'snare', { v: 0.65, g: 0.6 }); E(t(12), 'snare', { v: 0.7, g: 0.6 });
        for (let k = 0; k < 16; k += 2) E(t(k), 'hat', { v: 0.3 });
      } else if (fill && (C || nxLabel(bi) === 'C' || nxLabel(bi) === 'Cmod')) {
        [[8, 50], [9, 50], [10, 47], [11, 47], [12, 43], [13, 43], [14, 40], [15, 38]].forEach(([k, m]) => E(t(k), 'tom', { m, v: 0.55 + k * 0.02 }));
        if (nxLabel(bi) === 'Cmod') E(t(0), 'timp', { m: 36 + pcOf(key), v: 0.7 });
      }
    } else if (style === 'euro') {
      if (sectionStart && (C || L === 'X')) E(t(0), 'timp', { m: 38 + pcOf(bar.chords[0].bass - 38), v: 0.5 });
      if (en >= 0.7) { E(t(4), 'shaker', { v: 0.35 }); E(t(8), 'shaker', { v: 0.35 }); }
      if (bar.i % 2 === 0 && C) E(t(0), 'bell', { m: 96, v: 0.2 });
      if (fill && (C || nxLabel(bi) === 'C')) for (let k = 0; k < 12; k++) E(t(k), 'timp', { m: 38 + pcOf(key + 7 - 38), v: 0.12 + k * 0.035 });
    }

    // ------------- harmony & bass, per chord
    bar.chords.forEach((c) => {
      const cs = c.at, cl = c.len;
      const nxt = nextChordOf(bi, c);
      const bp = bassPitch(c.bass);
      const fifth = bp + 7 <= 52 ? bp + 7 : bp - 5;
      const appr = (() => { const nb = 31 + pcOf(nxt.bass - 31); let target = nb; while (target - bp > 6) target -= 12; while (bp - target > 6) target += 12; return target + (target > bp ? -1 : 1); })();

      if (style === 'citypop' || style === 'mellow') {
        const kind = C && style === 'citypop' ? 'slap' : 'finger';
        const pat = cl === 16 ? P.bass : [[0, 3, 'r'], [3, 1, 'r'], [6, 2, 'a']];
        if (L !== 'intro' || bar.i >= 2 || style === 'citypop') pat.forEach(([on, d, w]) => {
          const m = w === 'r' ? bp : w === 'o' ? bp + 12 : w === 'f' ? fifth : appr;
          E(t(cs + on), 'bass', { m, v: on === 0 ? 0.85 : 0.6, d, k: w === 'o' && kind === 'slap' ? 'pop' : kind });
        });
        // EP
        const ep = chordVoicing(c, 55, 77, epPrev); epPrev = ep;
        const pat2 = (C || L === 'X') ? P.ep : P.epSoft;
        const wasPushed = pushed; pushed = false;
        pat2.forEach(([on, d, push]) => {
          if (on >= cl) return;
          if (on === 0 && wasPushed) return; // the chord already arrived a 16th early; let it ring
          if (push && cl < 16) return;
          let v = ep, dd = Math.min(d, cl - on);
          if (push && nxt !== c && nxt.at === 0) { v = chordVoicing(nxt, 55, 77, ep); dd = 6; pushed = true; }
          v.forEach((m, k) => E(t(cs + on) + k * 0.04, 'ep', { m, v: 0.55 + (on === 0 ? 0.15 : 0), d: dd }));
        });
        // guitar cutting
        if (style === 'citypop' || C) {
          const g = chordVoicing(c, 60, 76, gtrPrev, 12, 3); gtrPrev = g;
          const pat3 = C || L === 'X' ? P.gtr : P.gtrSoft;
          for (let k = 0; k < cl; k++) {
            const ch = pat3[(cs + k) % 16];
            if (ch === '.') continue;
            const up = (cs + k) % 2 === 1;
            const order = up ? g.slice().reverse() : g;
            order.forEach((m, j) => E(t(cs + k) + j * 0.025, 'gtr', { m, v: ch === 'X' ? 0.75 : 0.32, d: ch === 'X' ? 0.9 : 0.3, mu: ch !== 'X' }));
          }
        }
        if (C || L === 'outro') { const pv = chordVoicing(c, 62, 84, padPrev, 16, 4); padPrev = pv; E(t(cs), 'pad', { n: pv, d: cl, v: 0.45, a: 0.4 }); }
        if ((L === 'intro' && bar.i === 0 && cs === 0) || (C && bar.i % 4 === 3 && cs + cl === 16)) {
          const bv = chordVoicing(nxt, 60, 79, null, 12, 3);
          bv.forEach((m) => E(s0 + 14, 'brass', { m, v: 0.75, d: 1.6 }));
        }
        if (L === 'intro' && cs === 0 && bar.i % 2 === 0) {
          const bv = chordVoicing(c, 60, 79, null, 12, 3);
          bv.forEach((m) => { E(t(cs), 'brass', { m, v: 0.7, d: 1.5 }); E(t(cs + 3), 'brass', { m, v: 0.55, d: 1 }); });
        }
      } else if (style === 'idol' || style === 'tender') {
        const kind = style === 'idol' && (C || L === 'X' || L === 'B') ? 'synth' : 'finger';
        if (kind === 'synth') for (let k = 0; k < cl; k += 2) E(t(cs + k), 'bass', { m: (k / 2) % 2 ? bp + 12 : bp, v: 0.7, d: 1.6, k: 'synth' });
        else [[0, 4], [6, 2], [8, 4], [12, 2], [14, 2]].filter(([on]) => on < cl).forEach(([on, d], j) => E(t(cs + on), 'bass', { m: on === 14 ? appr : on === 12 ? bp + 12 : on === 8 ? fifth : bp, v: 0.7, d, k: 'finger' }));
        const ep = chordVoicing(c, 57, 79, epPrev); epPrev = ep;
        if (style === 'tender') {
          // soft piano: broken chord in 8ths
          const arpNotes = [bp + 12, ...ep];
          for (let k = 0; k < cl; k += 2) E(t(cs + k), 'piano', { m: arpNotes[(k / 2) % arpNotes.length] + (k / 2 >= arpNotes.length ? 12 : 0), v: 0.42, d: 3 });
        } else {
          const hits = C ? [0, 4, 6, 10, 12] : [0, 6, 10];
          hits.filter((h) => h < cl).forEach((h) => ep.forEach((m, k) => E(t(cs + h) + k * 0.03, 'ep', { m, v: h % 4 === 0 ? 0.6 : 0.45, d: C ? 1.5 : 3 })));
        }
        if (C || L === 'B' || L === 'X') {
          const tones = Q[c.q].slice(0, 4).map((x) => 72 + pcOf(c.root + x - 72));
          tones.sort((a, b) => a - b);
          const seq = [tones[0], tones[1], tones[2], tones[3] ?? tones[0] + 12, tones[0] + 12, tones[2], tones[1], tones[3] ?? tones[2]];
          if (style === 'idol') for (let k = 0; k < cl; k++) E(t(cs + k), 'arp', { m: seq[k % seq.length], v: 0.5 });
          else for (let k = 0; k < cl; k += 2) E(t(cs + k), 'harp', { m: seq[(k / 2) % seq.length], v: 0.4, k: 'harp' });
        }
        if (C || L === 'B' || L === 'outro' || style === 'tender') { const pv = chordVoicing(c, 60, 84, padPrev, 16, 4); padPrev = pv; E(t(cs), 'pad', { n: pv, d: cl, v: style === 'tender' ? 0.6 : 0.42, a: 0.35 }); }
        if ((C && bar.i === 0 && cs === 0) || L === 'bridge') {
          const bv = chordVoicing(c, 62, 81, null, 12, 3);
          if (style === 'idol') { E(t(cs), 'sbrass', { n: bv, v: 0.8, d: 2.5 }); E(t(cs + 3), 'sbrass', { n: bv, v: 0.6, d: 1.5 }); }
          else bv.forEach((m) => E(t(cs), 'brass', { m, v: 0.4, d: 6 }));
        }
        if (L === 'intro' && cs === 0) {
          const bv = chordVoicing(c, 62, 81, null, 12, 3);
          if (style === 'idol') [0, 3, 6, 10].forEach((h) => E(t(h), 'sbrass', { n: bv, v: h === 0 ? 0.85 : 0.6, d: 2 }));
          else bv.forEach((m, k) => E(t(k * 2), 'bell', { m: m + 12, v: 0.4 }));
        }
      } else if (style === 'ballad') {
        const pv = chordVoicing(c, 55, 76, epPrev, 14, 4); epPrev = pv;
        const low = bp + 12 < 43 ? bp + 24 : bp + 12;
        const tones = [low, ...pv];
        const seq = [tones[0], tones[2] ?? tones[1], tones[3] ?? tones[1] + 12, tones[1], tones[4] ?? tones[2] + 12, tones[3] ?? tones[1] + 12, tones[2] ?? tones[1], tones[1]];
        for (let k = 0; k < cl; k += 2) E(t(cs + k), 'piano', { m: seq[(k / 2) % seq.length], v: k === 0 ? 0.55 : 0.4, d: 4 });
        E(t(cs), 'piano', { m: bp, v: 0.5, d: cl });
        if (L !== 'A' || bi > 12) E(t(cs), 'bass', { m: bp, v: 0.6, d: cl - 1, k: 'finger' });
        if (L !== 'A' && L !== 'intro') { const sp = chordVoicing(c, 60, 86, padPrev, 18, 4); padPrev = sp; E(t(cs), 'pad', { n: sp, d: cl, v: C ? 0.7 : 0.45, a: 0.6 }); }
      } else if (style === 'euro') {
        // waltz: low on 1, chords on 2 & 3 (accordion in A, pizzicato strings in B/C)
        E(t(cs), 'harp', { m: bp, v: 0.7, k: 'pizz' });
        if (cl >= 12) E(t(cs + 8), 'harp', { m: fifth, v: 0.35, k: 'pizz' });
        const pv = chordVoicing(c, 58, 76, epPrev, 12, 3); epPrev = pv;
        const accordion = L === 'A' || L === 'A2' || L === 'intro';
        for (const h of [4, 8]) if (h < cl) pv.forEach((m, k) => accordion ? E(t(cs + h), 'acc', { m, v: 0.55, d: 2.5 }) : E(t(cs + h) + k * 0.02, 'harp', { m, v: 0.45, k: 'pizz' }));
        if (L === 'B' || L === 'X') {
          const arpTones = [bp + 24, ...pv, pv[0] + 12, pv[1] + 12];
          for (let k = 0; k < cl; k += 2) E(t(cs + k), 'harp', { m: arpTones[(k / 2) % arpTones.length], v: 0.45, k: 'harp' });
        }
        if (C || L === 'X' || L === 'B') { const sp = chordVoicing(c, 60, 84, padPrev, 16, 4); padPrev = sp; E(t(cs), 'pad', { n: sp, d: cl, v: C ? 0.6 : 0.4, a: 0.5 }); }
      }
    });
  });

  function nxLabel(bi) { return bars[bi + 1] ? bars[bi + 1].label : null; }

  // a final chord for songs that don't fade
  const lastBar = bars[bars.length - 1];
  const endStep = totalSteps;
  const fades = style === 'citypop' || style === 'mellow';
  if (!fades) {
    const c = { ...lastBar.chords[lastBar.chords.length - 1] };
    const tonicChord = { root: pcOf(key + lastBar.tr), q: minor ? 'm' : style === 'euro' ? 'maj7' : 'add9', bass: pcOf(key + lastBar.tr) };
    const pv = chordVoicing(tonicChord, 55, 79, epPrev);
    const bp = bassPitch(tonicChord.bass);
    E(endStep, 'bass', { m: bp, v: 0.7, d: 14, k: 'finger' });
    pv.forEach((m) => E(endStep, style === 'idol' ? 'ep' : 'piano', { m, v: 0.55, d: 16 }));
    E(endStep, 'pad', { n: chordVoicing(tonicChord, 60, 84, padPrev, 16, 4), d: 16, v: 0.5, a: 0.2 });
    if (style !== 'ballad') E(endStep, 'crash', { v: 0.45 });
    E(endStep, 'kick', { v: 0.6 });
    if (style === 'euro' || style === 'tender') E(endStep, 'bell', { m: 72 + pcOf(key + lastBar.tr - 72) + 12, v: 0.35 });
    void c;
  }

  ev.sort((a, b) => a.s - b.s);
  const lengthSteps = totalSteps + (fades ? 0 : 20);
  return {
    style, bpm, beats, SPB, key, minor, events: ev, lengthSteps,
    fade: fades ? { from: (bars.length - 8) * SPB, to: totalSteps } : null,
    stepDur: 60 / bpm / 4,
    plucks: collectPlucks(ev),
  };
}

function collectPlucks(ev) {
  const set = new Map();
  for (const e of ev) {
    if (e.i === 'gtr') set.set('gtr' + e.m, [e.m, 'gtr']);
    else if (e.i === 'harp') set.set((e.k || 'harp') + e.m, [e.m, e.k || 'harp']);
  }
  return [...set.values()];
}

export const STYLE_NAMES = Object.keys(STYLES);
