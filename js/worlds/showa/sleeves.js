// Procedural record sleeves. None of these are the real covers — each is an original
// composition that tries to carry the record's weather: colour fields, soft "photographic"
// gradients, era typography. Front, back (with the verified track list), and the disc label.

import { rng, hashStr, rgba, mix, roundRect, vtext } from './util.js';
import { jpPlain } from '../../lib/jp.js';

const FONTS = {
  serif: (s) => `600 ${s}px "EB Garamond", "Noto Serif JP", serif`,
  'serif-i': (s) => `italic 400 ${s}px "EB Garamond", "Noto Serif JP", serif`,
  mincho: (s) => `800 ${s}px "Shippori Mincho B1", "Noto Serif JP", serif`,
  grotesk: (s) => `400 ${s}px "Anton", "Zen Kaku Gothic New", sans-serif`,
  round: (s) => `800 ${s}px "M PLUS Rounded 1c", sans-serif`,
  script: (s) => `italic 600 ${s}px "EB Garamond", "Noto Serif JP", serif`,
  type: (s) => `500 ${s}px "IBM Plex Mono", "Zen Kaku Gothic New", monospace`,
};
const JPF = (s, w = 700) => `${w} ${s}px "Zen Kaku Gothic New", "Noto Serif JP", sans-serif`;
const hasJP = (s) => /[぀-ヿ一-鿿]/.test(s);

export const FONT_SPECS = [
  ['600 20px "EB Garamond"', 'ABCabc'], ['italic 400 20px "EB Garamond"', 'ABCabc'],
  ['800 20px "Shippori Mincho B1"', '十月の人魚風立ちぬプロローグ'], ['400 20px "Anton"', 'ABC'],
  ['800 20px "M PLUS Rounded 1c"', 'ABCティーンズ'], ['500 20px "IBM Plex Mono"', 'ABC'],
  ['700 20px "Zen Kaku Gothic New"', 'あア亜'], ['400 20px "Zen Kaku Gothic New"', 'あア亜'],
];

function fit(g, text, maxW, size, fontFn, min = 8) {
  let s = size;
  g.font = fontFn(s);
  while (s > min && g.measureText(text).width > maxW) { s -= 1; g.font = fontFn(s); }
  return s;
}

function grain(g, S, amt = 0.06, seed = 1) {
  const r = rng(seed);
  g.save();
  for (let i = 0; i < S * 3; i++) {
    g.fillStyle = r() < 0.5 ? `rgba(0,0,0,${amt * r()})` : `rgba(255,255,255,${amt * r()})`;
    g.fillRect(r() * S, r() * S, 1 + r() * 1.5, 1 + r() * 1.5);
  }
  g.restore();
}

function vgrad(g, S, stops) {
  const gr = g.createLinearGradient(0, 0, 0, S);
  stops.forEach(([t, c]) => gr.addColorStop(t, c));
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
}

function softCircle(g, x, y, r, color, a) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, rgba(color, a)); gr.addColorStop(0.6, rgba(color, a * 0.45)); gr.addColorStop(1, rgba(color, 0));
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
}

function vignette(g, S, a = 0.35) {
  const gr = g.createRadialGradient(S / 2, S / 2, S * 0.25, S / 2, S / 2, S * 0.75);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(0,0,0,${a})`);
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
}

// ------------------------------------------------------------------ archetypes
const ART = {
  bokeh(g, S, c, r) {
    const gr = g.createLinearGradient(0, 0, S, S); gr.addColorStop(0, c[2]); gr.addColorStop(0.5, c[0]); gr.addColorStop(1, c[1]);
    g.fillStyle = gr; g.fillRect(0, 0, S, S);
    g.globalCompositeOperation = 'screen';
    for (let i = 0; i < 46; i++) {
      const x = Math.pow(r(), 1.6) * S * 0.9, y = Math.pow(r(), 1.4) * S * 0.75, rad = S * (0.02 + r() * 0.08);
      softCircle(g, x, y, rad, i % 3 ? c[2] : '#ffe9c9', 0.18 + r() * 0.3);
      if (r() < 0.3) { g.strokeStyle = rgba('#ffffff', 0.18); g.lineWidth = 1; g.beginPath(); g.arc(x, y, rad * 0.7, 0, 7); g.stroke(); }
    }
    g.globalCompositeOperation = 'source-over';
    // lace-like scallop along the bottom
    g.fillStyle = rgba('#ffffff', 0.5);
    for (let x = 0; x < S + 20; x += S / 18) { g.beginPath(); g.arc(x, S * 0.86, S / 36, Math.PI, 0); g.fill(); }
    g.fillRect(0, S * 0.86, S, S * 0.14);
    g.strokeStyle = rgba('#b88a3a', 0.6); g.lineWidth = 1.5; g.strokeRect(S * 0.04, S * 0.04, S * 0.92, S * 0.92);
  },
  mist(g, S, c, r) {
    vgrad(g, S, [[0, c[2]], [0.45, c[0]], [1, c[1]]]);
    for (let i = 0; i < 9; i++) {
      g.save(); g.translate(S / 2, S * (0.2 + i * 0.09)); g.scale(1, 0.18);
      softCircle(g, (r() - 0.5) * S * 0.6, 0, S * (0.4 + r() * 0.3), '#ffffff', 0.25);
      g.restore();
    }
    g.strokeStyle = rgba(c[3], 0.55); g.lineWidth = 1.2;
    g.beginPath(); g.arc(S * 0.5, S * 0.42, S * 0.24, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(S * 0.5, S * 0.42, S * 0.255, 0, Math.PI * 2); g.globalAlpha = 0.4; g.stroke(); g.globalAlpha = 1;
    for (let i = 0; i < 60; i++) {
      const x = r() * S, y = r() * S * 0.8, s = 1 + r() * 4;
      g.fillStyle = rgba('#ffffff', 0.4 + r() * 0.6);
      g.beginPath(); g.moveTo(x, y - s * 2); g.lineTo(x + s * 0.4, y); g.lineTo(x, y + s * 2); g.lineTo(x - s * 0.4, y); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(x - s * 2, y); g.lineTo(x, y + s * 0.4); g.lineTo(x + s * 2, y); g.lineTo(x, y - s * 0.4); g.closePath(); g.fill();
    }
  },
  horizon(g, S, c, r, d) {
    const H = S * 0.6;
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, c[3]); sky.addColorStop(0.65, c[0]); sky.addColorStop(1, mix(c[1], c[2], 0.35));
    g.fillStyle = sky; g.fillRect(0, 0, S, H);
    const sea = g.createLinearGradient(0, H, 0, S);
    sea.addColorStop(0, mix(c[1], c[0], 0.3)); sea.addColorStop(1, c[3]);
    g.fillStyle = sea; g.fillRect(0, H, S, S - H);
    const moon = d.orb === 'moon';
    const ox = S * (moon ? 0.34 : 0.5), oy = moon ? S * 0.26 : H - S * 0.04, orr = S * (moon ? 0.06 : 0.12);
    softCircle(g, ox, oy, orr * 5, c[2], moon ? 0.18 : 0.4);
    g.fillStyle = moon ? mix(c[2], '#ffffff', 0.4) : mix(c[2], '#ffffff', 0.2);
    g.beginPath(); g.arc(ox, oy, orr, 0, Math.PI * 2); g.fill();
    if (!moon) { g.fillStyle = mix(c[1], c[0], 0.3); g.fillRect(0, H, S, S * 0.002); }
    // reflection: broken horizontal strokes
    for (let y = H + 3; y < S; y += 2 + (y - H) * 0.03) {
      const w = (orr * 1.2) * (0.6 + r() * 0.8) * (1 + (y - H) / S);
      g.fillStyle = rgba(c[2], 0.65 * (1 - (y - H) / (S - H)) * (0.4 + r() * 0.6));
      g.fillRect(ox - w / 2 + (r() - 0.5) * 8, y, w, 1 + r() * 1.5);
    }
    g.fillStyle = rgba(c[3], 0.6); g.fillRect(0, H - 0.5, S, 1);
  },
  geo(g, S, c, r) {
    g.fillStyle = c[3]; g.fillRect(0, 0, S, S);
    g.fillStyle = c[0]; g.beginPath(); g.arc(S * 0.66, S * 0.58, S * 0.27, 0, 7); g.fill();
    g.fillStyle = c[1]; g.beginPath(); g.moveTo(S * 0.1, S * 0.92); g.lineTo(S * 0.42, S * 0.36); g.lineTo(S * 0.58, S * 0.92); g.closePath(); g.fill();
    g.strokeStyle = c[2]; g.lineWidth = S * 0.018; g.lineJoin = 'round'; g.beginPath();
    for (let i = 0; i <= 8; i++) g.lineTo(S * (0.08 + i * 0.05), S * (0.3 + (i % 2) * 0.05));
    g.stroke();
    g.fillStyle = '#222'; for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) { g.beginPath(); g.arc(S * (0.76 + i * 0.03), S * (0.16 + j * 0.03), S * 0.005, 0, 7); g.fill(); }
  },
  rain(g, S, c, r) {
    vgrad(g, S, [[0, c[2]], [1, c[0]]]);
    for (let i = 0; i < 22; i++) softCircle(g, S * (0.15 + r() * 0.7), S * (0.65 + r() * 0.3), S * (0.03 + r() * 0.05), c[3], 0.5);
    g.strokeStyle = rgba(c[1], 0.5); g.lineWidth = 1;
    for (let i = 0; i < 160; i++) {
      const x = r() * S * 1.2, y = r() * S, l = S * (0.04 + r() * 0.1);
      g.globalAlpha = 0.2 + r() * 0.6; g.beginPath(); g.moveTo(x, y); g.lineTo(x - l * 0.25, y + l); g.stroke();
    }
    g.globalAlpha = 1;
  },
  pool(g, S, c, r) {
    vgrad(g, S, [[0, c[1]], [0.3, c[1]], [0.3001, c[0]], [1, c[2]]]);
    softCircle(g, S * 0.76, S * 0.14, S * 0.22, c[3], 0.5);
    g.fillStyle = c[3]; g.beginPath(); g.arc(S * 0.76, S * 0.14, S * 0.07, 0, 7); g.fill();
    // tiles edge
    for (let x = 0; x < S; x += S / 20) { g.fillStyle = (x / (S / 20)) % 2 < 1 ? '#ffffff' : mix(c[0], '#ffffff', 0.5); g.fillRect(x, S * 0.3, S / 20, S * 0.025); }
    // caustics
    g.strokeStyle = rgba('#ffffff', 0.55); g.lineWidth = 2;
    for (let j = 0; j < 14; j++) {
      g.beginPath();
      const y0 = S * (0.36 + j * 0.047);
      for (let x = 0; x <= S; x += 8) g.lineTo(x, y0 + Math.sin(x * 0.03 + j * 1.7) * 6 + Math.sin(x * 0.011 + j) * 9);
      g.globalAlpha = 0.25 + r() * 0.5; g.stroke();
    }
    g.globalAlpha = 1;
  },
  stars(g, S, c, r) {
    vgrad(g, S, [[0, c[0]], [0.62, c[1]], [0.82, c[2]], [1, c[3]]]);
    for (let i = 0; i < 260; i++) { g.fillStyle = rgba('#ffffff', r() * 0.8); const s = r() < 0.95 ? 1 : 2; g.fillRect(r() * S, r() * S * 0.7, s, s); }
    const cr = [[0.6, 0.18], [0.6, 0.42], [0.5, 0.3], [0.69, 0.29]];
    g.strokeStyle = rgba('#fff3c8', 0.3); g.lineWidth = 1;
    g.beginPath(); g.moveTo(S * cr[0][0], S * cr[0][1]); g.lineTo(S * cr[1][0], S * cr[1][1]); g.moveTo(S * cr[2][0], S * cr[2][1]); g.lineTo(S * cr[3][0], S * cr[3][1]); g.stroke();
    cr.forEach(([x, y], i) => { softCircle(g, S * x, S * y, S * 0.03, '#fff3c8', 0.7); g.fillStyle = '#fff'; g.beginPath(); g.arc(S * x, S * y, S * (i === 1 ? 0.008 : 0.006), 0, 7); g.fill(); });
    g.fillStyle = '#05070f';
    g.beginPath(); g.moveTo(0, S); g.lineTo(0, S * 0.9);
    for (let x = 0; x <= S; x += S / 30) g.lineTo(x, S * (0.9 - r() * 0.03));
    g.lineTo(S, S); g.closePath(); g.fill();
  },
  paperwhite(g, S, c, r) {
    g.fillStyle = c[0]; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 400; i++) { g.strokeStyle = rgba(c[3], 0.25); g.lineWidth = 0.5; const x = r() * S, y = r() * S; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 14, y + (r() - 0.5) * 14); g.stroke(); }
    g.save(); g.globalAlpha = 0.55;
    for (let i = 0; i < 18; i++) softCircle(g, S * (0.3 + r() * 0.4), S * (0.3 + r() * 0.3), S * (0.08 + r() * 0.12), c[1], 0.35);
    g.restore();
    g.fillStyle = rgba(c[2], 0.85); g.fillRect(S * 0.12, S * 0.78, S * 0.06, 2);
  },
  curtain(g, S, c, r) {
    g.fillStyle = c[0]; g.fillRect(0, 0, S, S);
    softCircle(g, S * 0.5, S * 0.55, S * 0.4, c[2], 0.22);
    for (const side of [-1, 1]) {
      for (let i = 0; i < 9; i++) {
        const x0 = side < 0 ? i * S * 0.045 : S - (i + 1) * S * 0.045;
        const gr = g.createLinearGradient(x0, 0, x0 + S * 0.045, 0);
        gr.addColorStop(0, mix(c[1], '#000000', 0.55)); gr.addColorStop(0.5, c[1]); gr.addColorStop(1, mix(c[1], '#000000', 0.6));
        g.fillStyle = gr; g.fillRect(x0, 0, S * 0.046, S);
      }
    }
    g.fillStyle = mix(c[1], '#000000', 0.3); g.fillRect(0, 0, S, S * 0.07);
    for (let x = 0; x < S; x += S / 14) { g.beginPath(); g.arc(x + S / 28, S * 0.07, S / 28, 0, Math.PI); g.fill(); }
  },
  staff(g, S, c, r) {
    g.fillStyle = c[0]; g.fillRect(0, 0, S, S);
    g.strokeStyle = rgba(c[1], 0.75); g.lineWidth = 1.2;
    for (let s = 0; s < 3; s++) for (let l = 0; l < 5; l++) { const y = S * (0.42 + s * 0.17) + l * S * 0.016; g.beginPath(); g.moveTo(S * 0.06, y); g.lineTo(S * 0.94, y); g.stroke(); }
    g.fillStyle = c[1];
    for (let i = 0; i < 26; i++) { const s = r.int(0, 2), l = r.int(0, 8); g.beginPath(); g.ellipse(S * (0.1 + r() * 0.8), S * (0.42 + s * 0.17) + l * S * 0.008, S * 0.009, S * 0.0065, -0.4, 0, 7); g.fill(); }
    g.strokeStyle = c[2]; g.lineWidth = S * 0.012; g.beginPath(); g.moveTo(S * 0.12, S * 0.95); g.lineTo(S * 0.88, S * 0.3); g.stroke();
  },
  sky(g, S, c, r) {
    vgrad(g, S, [[0, c[0]], [0.75, c[1]], [1, c[2]]]);
    g.strokeStyle = rgba('#ffffff', 0.85); g.lineWidth = 2.5; g.beginPath(); g.moveTo(S * 0.05, S * 0.62); g.quadraticCurveTo(S * 0.5, S * 0.3, S * 0.92, S * 0.12); g.stroke();
    g.lineWidth = 8; g.strokeStyle = rgba('#ffffff', 0.12); g.stroke();
    softCircle(g, S * 0.92, S * 0.12, S * 0.04, c[3], 0.9);
    for (let i = 0; i < 5; i++) { g.fillStyle = rgba(c[3], 0.7 - i * 0.12); g.fillRect(0, S * (0.88 + i * 0.022), S, S * 0.008); }
  },
  split(g, S, c, r) {
    g.fillStyle = c[1]; g.fillRect(0, 0, S, S);
    g.fillStyle = c[0]; g.beginPath(); g.moveTo(0, 0); g.lineTo(S, 0); g.lineTo(0, S); g.closePath(); g.fill();
    g.strokeStyle = c[3]; g.lineWidth = 2; g.beginPath(); g.moveTo(S, 0); g.lineTo(0, S); g.stroke();
    grain(g, S, 0.05, 3);
  },
  grid(g, S, c, r) {
    vgrad(g, S, [[0, c[0]], [0.55, mix(c[0], c[2], 0.25)], [0.551, c[0]], [1, mix(c[0], '#000', 0.4)]]);
    const H = S * 0.55;
    g.strokeStyle = rgba(c[1], 0.8); g.lineWidth = 1.2;
    for (let i = -14; i <= 14; i++) { g.beginPath(); g.moveTo(S / 2, H); g.lineTo(S / 2 + i * S * 0.12, S); g.stroke(); }
    for (let k = 1; k < 14; k++) { const y = H + Math.pow(k / 14, 2.2) * (S - H); g.globalAlpha = 0.3 + k / 20; g.beginPath(); g.moveTo(0, y); g.lineTo(S, y); g.stroke(); }
    g.globalAlpha = 1;
    g.fillStyle = c[2]; g.fillRect(0, H - 1, S, 2); softCircle(g, S / 2, H, S * 0.5, c[2], 0.3);
    g.font = `500 ${S * 0.016}px "IBM Plex Mono", monospace`; g.fillStyle = rgba(c[3], 0.25);
    for (let y = S * 0.08; y < H - 20; y += S * 0.03) g.fillText('D404ME  D404ME  D404ME  D404ME  D404ME  D404ME'.slice(r.int(0, 6)), S * 0.04, y);
  },
  stripes(g, S, c, r) {
    g.save(); g.translate(S / 2, S / 2); g.rotate(-0.5);
    for (let i = -20; i < 20; i++) { g.fillStyle = c[((i % 4) + 4) % 4]; g.fillRect(i * S * 0.06, -S, S * 0.06, S * 2); }
    g.restore();
    g.fillStyle = rgba('#ffffff', 0.92); roundRect(g, S * 0.15, S * 0.36, S * 0.7, S * 0.28, S * 0.06); g.fill();
  },
  palm(g, S, c, r) {
    vgrad(g, S, [[0, mix(c[0], '#ffffff', 0.2)], [1, c[1]]]);
    g.fillStyle = rgba('#fff4dc', 0.45); g.fillRect(S * 0.18, S * 0.1, S * 0.5, S * 0.62);
    g.save(); g.filter = 'blur(5px)';
    g.translate(S * 0.9, S * 0.02);
    for (let i = 0; i < 9; i++) {
      g.save(); g.rotate(0.9 + i * 0.16 + (r() - 0.5) * 0.08);
      for (let k = 0; k < 18; k++) {
        g.fillStyle = rgba(c[2], 0.32);
        g.save(); g.translate(k * S * 0.04, 0); g.rotate(0.9 * (k % 2 ? 1 : -1));
        g.beginPath(); g.ellipse(0, 0, S * 0.06 * (1 - k / 22), S * 0.01, 0, 0, 7); g.fill(); g.restore();
      }
      g.restore();
    }
    g.restore();
    g.fillStyle = rgba(c[3], 0.5); g.fillRect(0, S * 0.82, S, S * 0.18);
  },
  memphis(g, S, c, r) {
    g.fillStyle = c[0]; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 26; i++) {
      const x = r() * S, y = r() * S, k = r.int(0, 3), col = c[1 + r.int(0, 2)];
      g.fillStyle = col; g.strokeStyle = col; g.lineWidth = S * 0.01;
      if (k === 0) { g.beginPath(); g.arc(x, y, S * 0.02, 0, 7); g.fill(); }
      else if (k === 1) { g.save(); g.translate(x, y); g.rotate(r() * 6); g.fillRect(-S * 0.03, -S * 0.006, S * 0.06, S * 0.012); g.restore(); }
      else if (k === 2) { g.beginPath(); for (let j = 0; j < 5; j++) g.lineTo(x + j * S * 0.015, y + (j % 2) * S * 0.015); g.stroke(); }
      else { g.beginPath(); g.moveTo(x, y); g.lineTo(x + S * 0.03, y + S * 0.04); g.lineTo(x - S * 0.02, y + S * 0.04); g.closePath(); g.fill(); }
    }
    g.strokeStyle = '#222'; g.lineWidth = 3;
    const bx = S * 0.3, by = S * 0.45, bw = S * 0.4;
    g.strokeRect(bx, by, bw, bw * 0.75);
    g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + bw * 0.2, by - bw * 0.2); g.lineTo(bx + bw * 1.2, by - bw * 0.2); g.lineTo(bx + bw, by); g.moveTo(bx + bw * 1.2, by - bw * 0.2); g.lineTo(bx + bw * 1.2, by + bw * 0.55); g.lineTo(bx + bw, by + bw * 0.75); g.stroke();
  },
  wind(g, S, c, r) {
    vgrad(g, S, [[0, c[2]], [0.6, c[0]], [1, c[1]]]);
    g.strokeStyle = rgba('#ffffff', 0.5); g.lineWidth = 1.2;
    for (let i = 0; i < 40; i++) {
      const y0 = r() * S, a = S * (0.02 + r() * 0.05);
      g.globalAlpha = 0.15 + r() * 0.5;
      g.beginPath(); for (let x = -10; x <= S + 10; x += 10) g.lineTo(x, y0 - x * 0.35 + Math.sin(x * 0.012 + i) * a); g.stroke();
    }
    g.globalAlpha = 1;
    for (let i = 0; i < 9; i++) { g.save(); g.translate(r() * S, r() * S); g.rotate(r() * 6); g.fillStyle = rgba(c[3], 0.75); g.beginPath(); g.ellipse(0, 0, S * 0.014, S * 0.006, 0, 0, 7); g.fill(); g.restore(); }
  },
  tropic(g, S, c, r) {
    g.fillStyle = c[0]; g.fillRect(0, 0, S, S);
    g.fillStyle = c[3]; g.beginPath(); g.arc(S * 0.72, S * 0.66, S * 0.2, 0, 7); g.fill();
    g.save(); g.beginPath(); g.rect(0, S * 0.55, S * 0.55, S * 0.45); g.clip();
    g.fillStyle = mix(c[0], c[3], 0.5); g.fillRect(0, 0, S, S);
    g.strokeStyle = rgba('#7a4a10', 0.55); g.lineWidth = 2;
    for (let i = -12; i < 24; i++) { g.beginPath(); g.moveTo(i * S * 0.05, S * 0.55); g.lineTo(i * S * 0.05 + S * 0.45, S); g.stroke(); g.beginPath(); g.moveTo(i * S * 0.05, S); g.lineTo(i * S * 0.05 + S * 0.45, S * 0.55); g.stroke(); }
    g.restore();
    g.fillStyle = c[1];
    for (let i = 0; i < 9; i++) { g.save(); g.translate(S * 0.27, S * 0.56); g.rotate(-1.2 + i * 0.3); g.beginPath(); g.moveTo(-S * 0.02, 0); g.lineTo(0, -S * (0.28 + (i % 3) * 0.05)); g.lineTo(S * 0.02, 0); g.closePath(); g.fill(); g.restore(); }
  },
  type(g, S, c, r) {
    g.fillStyle = c[0]; g.fillRect(0, 0, S, S);
    g.fillStyle = rgba(c[3], 0.9); g.fillRect(0, S * 0.08, S, S * 0.004); g.fillRect(0, S * 0.92, S, S * 0.004);
  },
  waves(g, S, c, r) {
    vgrad(g, S, [[0, c[2]], [0.35, c[1]], [1, c[0]]]);
    for (let k = 0; k < 9; k++) {
      const y0 = S * (0.3 + k * 0.075);
      g.strokeStyle = k === 8 ? c[3] : rgba('#ffffff', 0.3 + k * 0.05); g.lineWidth = k === 8 ? 3 : 1.5;
      g.beginPath(); for (let x = 0; x <= S; x += 6) g.lineTo(x, y0 + Math.sin(x * (0.018 - k * 0.0008) + k * 0.8) * (4 + k * 1.6)); g.stroke();
    }
  },
  sunrain(g, S, c, r) {
    vgrad(g, S, [[0, c[1]], [1, mix(c[0], c[1], 0.4)]]);
    softCircle(g, S * 0.7, S * 0.32, S * 0.45, c[0], 0.65);
    g.fillStyle = mix(c[0], '#ffffff', 0.35); g.beginPath(); g.arc(S * 0.7, S * 0.32, S * 0.12, 0, 7); g.fill();
    g.strokeStyle = rgba(c[3], 0.55); g.lineWidth = 1;
    for (let i = 0; i < 220; i++) { const x = r() * S * 1.3, y = r() * S, l = S * (0.05 + r() * 0.12); g.globalAlpha = 0.15 + r() * 0.55; g.beginPath(); g.moveTo(x, y); g.lineTo(x - l * 0.35, y + l); g.stroke(); }
    g.globalAlpha = 1;
    g.fillStyle = rgba(c[2], 0.85); g.fillRect(S * 0.06, S * 0.9, S * 0.88, S * 0.003);
  },
  deco(g, S, c, r) {
    g.fillStyle = c[0]; g.fillRect(0, 0, S, S);
    g.save(); g.beginPath(); g.ellipse(S / 2, S * 0.46, S * 0.26, S * 0.33, 0, 0, 7); g.clip();
    vgrad(g, S, [[0, mix(c[0], c[1], 0.3)], [1, c[1]]]);
    g.fillStyle = rgba(c[3], 0.55);
    for (let i = 0; i < 12; i++) { const x = S * (0.25 + r() * 0.5), h = S * (0.1 + r() * 0.25); g.beginPath(); g.ellipse(x, S * 0.7 - h / 2, S * 0.04, h / 2, 0, 0, 7); g.fill(); }
    softCircle(g, S * 0.6, S * 0.3, S * 0.2, '#fff2d0', 0.5);
    grain(g, S, 0.12, 9);
    g.restore();
    g.strokeStyle = c[2]; g.lineWidth = 2;
    g.beginPath(); g.ellipse(S / 2, S * 0.46, S * 0.27, S * 0.34, 0, 0, 7); g.stroke();
    const m = S * 0.05;
    g.lineWidth = 1.5;
    for (const k of [0, 1]) {
      const o = m + k * 8;
      g.beginPath();
      g.moveTo(o + 30, o); g.lineTo(S - o - 30, o); g.lineTo(S - o - 30, o + 12); g.lineTo(S - o, o + 12); g.lineTo(S - o, S - o - 12); g.lineTo(S - o - 30, S - o - 12);
      g.lineTo(S - o - 30, S - o); g.lineTo(o + 30, S - o); g.lineTo(o + 30, S - o - 12); g.lineTo(o, S - o - 12); g.lineTo(o, o + 12); g.lineTo(o + 30, o + 12); g.closePath(); g.stroke();
    }
  },
  map(g, S, c, r) {
    g.fillStyle = c[3]; g.fillRect(0, 0, S, S);
    g.fillStyle = rgba(c[0], 0.9); g.fillRect(0, 0, S, S);
    g.strokeStyle = rgba(c[1], 0.25); g.lineWidth = 1;
    for (let i = 1; i < 8; i++) { g.beginPath(); g.moveTo(0, i * S / 8); g.lineTo(S, i * S / 8); g.stroke(); g.beginPath(); g.moveTo(i * S / 8, 0); g.lineTo(i * S / 8, S); g.stroke(); }
    g.strokeStyle = rgba(c[1], 0.7); g.lineWidth = 1.4;
    for (let k = 0; k < 3; k++) {
      let x = r() * S * 0.3, y = S * (0.2 + k * 0.28);
      g.beginPath(); g.moveTo(x, y);
      for (let i = 0; i < 70; i++) { x += S * 0.012 + (r() - 0.3) * 6; y += (r() - 0.5) * 12; g.lineTo(x, y); }
      g.stroke();
    }
    g.setLineDash([6, 6]); g.strokeStyle = c[2]; g.lineWidth = 2;
    g.beginPath(); g.moveTo(S * 0.15, S * 0.8); g.bezierCurveTo(S * 0.4, S * 0.5, S * 0.55, S * 0.75, S * 0.82, S * 0.36); g.stroke(); g.setLineDash([]);
    g.fillStyle = c[2]; g.beginPath(); g.arc(S * 0.82, S * 0.36, 5, 0, 7); g.fill();
    g.save(); g.translate(S * 0.18, S * 0.22); g.strokeStyle = c[1]; g.lineWidth = 1.2;
    for (let i = 0; i < 8; i++) { g.rotate(Math.PI / 4); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, i % 2 ? -S * 0.04 : -S * 0.08); g.stroke(); }
    g.restore();
    grain(g, S, 0.08, 4);
  },
  noir(g, S, c, r) {
    g.fillStyle = c[0]; g.fillRect(0, 0, S, S);
    g.strokeStyle = c[1]; g.lineWidth = 3; g.strokeRect(S * 0.2, S * 0.16, S * 0.52, S * 0.6);
    g.fillStyle = rgba(c[1], 0.07); g.fillRect(S * 0.2, S * 0.16, S * 0.52, S * 0.6);
    g.fillStyle = c[2]; g.fillRect(S * 0.08, S * 0.8, S * 0.6, 3);
    const gr = g.createLinearGradient(S * 0.7, 0, S, S); gr.addColorStop(0, 'rgba(255,120,60,0)'); gr.addColorStop(0.5, 'rgba(255,120,60,0.18)'); gr.addColorStop(1, 'rgba(255,120,60,0)');
    g.fillStyle = gr; g.fillRect(0, 0, S, S);
    grain(g, S, 0.14, 7);
  },
  night(g, S, c, r) {
    vgrad(g, S, [[0, c[0]], [1, mix(c[0], c[1], 0.25)]]);
    g.fillStyle = '#07051a';
    for (let x = 0; x < S; x += S * (0.05 + r() * 0.06)) { const h = S * (0.12 + r() * 0.3); g.fillRect(x, S * 0.62 - h, S * 0.07, h + S * 0.4); }
    for (let i = 0; i < 70; i++) { g.fillStyle = rgba(c[3], 0.5 + r() * 0.5); g.fillRect(r() * S, S * (0.35 + r() * 0.27), 2, 2); }
    g.lineCap = 'round';
    for (let k = 0; k < 7; k++) {
      const col = k % 2 ? c[1] : c[2];
      const y = S * (0.7 + k * 0.035);
      g.strokeStyle = rgba(col, 0.85); g.lineWidth = 2 + k * 0.4;
      g.beginPath(); g.moveTo(-10, y + k * 4); g.bezierCurveTo(S * 0.3, y - S * 0.05, S * 0.6, y + S * 0.06, S + 10, y - k * 5); g.stroke();
      g.strokeStyle = rgba(col, 0.15); g.lineWidth = 10; g.stroke();
    }
  },
  ice(g, S, c, r) {
    vgrad(g, S, [[0, c[1]], [1, c[0]]]);
    for (let i = 0; i < 40; i++) {
      const x = r() * S, y = r() * S, s = S * (0.06 + r() * 0.16);
      const gr = g.createLinearGradient(x, y, x + s, y + s); gr.addColorStop(0, rgba('#ffffff', 0.35)); gr.addColorStop(1, rgba(c[3], 0.12));
      g.fillStyle = gr; g.beginPath(); g.moveTo(x, y); g.lineTo(x + s, y + s * 0.3); g.lineTo(x + s * 0.3, y + s); g.closePath(); g.fill();
    }
  },
  road(g, S, c, r) {
    const H = S * 0.56;
    vgrad(g, S, [[0, c[0]], [0.42, mix(c[0], c[1], 0.5)], [0.56, c[2]], [0.5601, c[3]], [1, mix(c[3], '#000', 0.3)]]);
    softCircle(g, S * 0.5, H, S * 0.4, c[1], 0.5);
    g.fillStyle = c[3]; g.beginPath(); g.moveTo(S * 0.47, H); g.lineTo(S * 0.53, H); g.lineTo(S * 1.1, S); g.lineTo(-S * 0.1, S); g.closePath(); g.fill();
    g.fillStyle = rgba('#ffffff', 0.9);
    for (let k = 0; k < 9; k++) { const t0 = Math.pow(k / 9, 2), t1 = Math.pow((k + 0.5) / 9, 2); const y0 = H + t0 * (S - H), y1 = H + t1 * (S - H); const w0 = 1 + t0 * 10, w1 = 1 + t1 * 10; g.beginPath(); g.moveTo(S / 2 - w0 / 2, y0); g.lineTo(S / 2 + w0 / 2, y0); g.lineTo(S / 2 + w1 / 2, y1); g.lineTo(S / 2 - w1 / 2, y1); g.fill(); }
    g.strokeStyle = rgba(c[2], 0.8); g.lineWidth = 2;
    g.beginPath(); g.moveTo(S * 0.47, H); g.lineTo(-S * 0.1, S); g.moveTo(S * 0.53, H); g.lineTo(S * 1.1, S); g.stroke();
  },
  variety(g, S, c, r) {
    g.fillStyle = c[3]; g.fillRect(0, 0, S, S);
    let y = 0, i = 0;
    while (y < S * 0.7) { const h = S * (0.02 + r() * 0.08); g.fillStyle = c[i % 3]; g.fillRect(0, y, S, h); y += h + S * 0.012; i++; }
    g.fillStyle = c[3]; g.beginPath(); g.arc(S * 0.72, S * 0.4, S * 0.16, 0, 7); g.fill();
    g.strokeStyle = c[0]; g.lineWidth = 4; g.stroke();
  },
  sail(g, S, c, r) {
    const H = S * 0.62;
    vgrad(g, S, [[0, mix(c[0], '#ffffff', 0.2)], [0.62, c[1]], [0.6201, c[0]], [1, c[3]]]);
    softCircle(g, S * 0.24, S * 0.3, S * 0.18, c[2], 0.35);
    g.fillStyle = c[2]; g.beginPath(); g.arc(S * 0.24, S * 0.3, S * 0.055, 0, 7); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(S * 0.66, H - S * 0.005); g.lineTo(S * 0.66, H - S * 0.13); g.lineTo(S * 0.72, H - S * 0.005); g.closePath(); g.fill();
    g.fillStyle = c[3]; g.fillRect(S * 0.645, H - S * 0.004, S * 0.08, S * 0.008);
    g.strokeStyle = rgba('#ffffff', 0.5); g.lineWidth = 1;
    for (let i = 0; i < 26; i++) { const y = H + 6 + i * (S - H) / 26; g.beginPath(); g.moveTo(r() * S, y); g.lineTo(r() * S, y); g.stroke(); }
  },
  lamp(g, S, c, r) {
    vgrad(g, S, [[0, c[0]], [1, c[2]]]);
    g.fillStyle = mix(c[0], '#000000', 0.3);
    for (let x = 0; x < S; x += S * 0.11) { const h = S * (0.3 + r() * 0.4); g.fillRect(x, S - h, S * 0.1, h); for (let k = 0; k < 10; k++) if (r() < 0.25) { g.fillStyle = rgba(c[1], 0.4); g.fillRect(x + S * 0.02 + (k % 3) * S * 0.025, S - h + 10 + Math.floor(k / 3) * S * 0.04, S * 0.012, S * 0.018); g.fillStyle = mix(c[0], '#000000', 0.3); } }
    softCircle(g, S * 0.38, S * 0.42, S * 0.42, c[1], 0.45);
    g.fillStyle = '#0a0d18'; g.fillRect(S * 0.375, S * 0.44, S * 0.012, S * 0.56);
    g.fillStyle = mix(c[1], '#ffffff', 0.5); g.beginPath(); g.arc(S * 0.381, S * 0.42, S * 0.022, 0, 7); g.fill();
    softCircle(g, S * 0.381, S * 0.97, S * 0.3, c[1], 0.3);
  },
  kraft(g, S, c, r) {
    g.fillStyle = c[0]; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 1400; i++) { g.fillStyle = rgba(r() < 0.5 ? '#5a4022' : '#f3e2bf', 0.12 * r()); g.fillRect(r() * S, r() * S, 2 + r() * 6, 1); }
    g.strokeStyle = rgba('#5a3a1e', 0.25); g.lineWidth = S * 0.012; g.beginPath(); g.arc(S * 0.72, S * 0.7, S * 0.12, 0.3, 5.9); g.stroke();
    g.strokeStyle = rgba(c[3], 0.75); g.lineWidth = 3; g.beginPath(); g.arc(S * 0.24, S * 0.74, S * 0.09, 0, 7); g.stroke();
    g.lineWidth = 1.2; g.beginPath(); g.arc(S * 0.24, S * 0.74, S * 0.075, 0, 7); g.stroke();
    g.fillStyle = rgba(c[3], 0.75); g.font = `500 ${S * 0.022}px "IBM Plex Mono", monospace`; g.textAlign = 'center';
    g.fillText('1975', S * 0.24, S * 0.75); g.textAlign = 'left';
  },
};

function titleText(rec) { return rec.short || rec.title; }

function drawTitle(g, S, rec) {
  const d = rec.d, c = d.c;
  const title = titleText(rec);
  const jp = hasJP(title);
  const fontFn = jp && d.f !== 'mincho' ? (s) => JPF(s, 700) : (FONTS[d.f] || FONTS.serif);
  const dark = ['curtain', 'grid', 'night', 'noir', 'lamp', 'stars', 'horizon'].includes(d.k) && !(d.k === 'horizon' && d.orb === 'sun');
  const ink = d.k === 'type' ? c[1] : dark ? '#f5efe2' : mix(c[3] || '#222222', '#111111', 0.4);
  const sub = dark ? 'rgba(245,239,226,0.75)' : 'rgba(25,20,18,0.72)';
  g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  const artistLine = () => {
    g.font = JPF(S * 0.032, 700); g.fillStyle = sub;
    return [rec.artist, rec.en.toUpperCase()];
  };
  if (d.t === 'vertical' && jp) {
    g.fillStyle = ink; g.textAlign = 'center';
    const size = Math.min(S * 0.11, (S * 0.72) / [...title].length);
    g.font = FONTS.mincho(size);
    vtext(g, title, S * 0.84, S * 0.1, size, 1.06);
    g.font = FONTS.mincho(S * 0.034); g.fillStyle = sub;
    vtext(g, rec.artist, S * 0.73, S * 0.11, S * 0.034, 1.1);
    g.textAlign = 'left';
    return;
  }
  if (d.t === 'huge') {
    g.fillStyle = d.k === 'ice' ? c[2] : ink;
    const s = fit(g, title, S * 0.92, S * 0.5, fontFn, 20);
    g.fillText(title, S * 0.04, S * 0.62);
    g.font = FONTS.serif(S * 0.034); g.fillStyle = sub;
    g.fillText(rec.en, S * 0.05, S * 0.9);
    g.font = JPF(S * 0.03); g.fillText(rec.artist, S * 0.05, S * 0.85);
    void s;
    return;
  }
  if (d.t === 'small') {
    g.fillStyle = ink; fit(g, title, S * 0.5, S * 0.05, fontFn, 10);
    g.fillText(title, S * 0.12, S * 0.84);
    g.font = JPF(S * 0.022, 400); g.fillStyle = sub; g.fillText(rec.artist + '  ' + rec.en, S * 0.12, S * 0.88);
    return;
  }
  // top / bottom / center blocks
  const y = d.t === 'top' ? S * 0.15 : d.t === 'center' ? S * 0.53 : S * 0.84;
  g.fillStyle = ink;
  if (d.k === 'split') {
    // the title is cut by the diagonal: bitter half in sweet colour and vice versa
    const sz = fit(g, title, S * 0.86, S * 0.13, fontFn, 12);
    const w = g.measureText(title).width, x = (S - w) / 2;
    g.save(); g.beginPath(); g.moveTo(0, 0); g.lineTo(S, 0); g.lineTo(0, S); g.closePath(); g.clip(); g.fillStyle = c[1]; g.fillText(title, x, y); g.restore();
    g.save(); g.beginPath(); g.moveTo(S, 0); g.lineTo(S, S); g.lineTo(0, S); g.closePath(); g.clip(); g.fillStyle = c[0]; g.fillText(title, x, y); g.restore();
    g.font = JPF(S * 0.03); g.fillStyle = c[3]; g.fillText(rec.artist + '　' + rec.en, x, y + sz * 0.5);
    return;
  }
  if (d.k === 'stripes') g.fillStyle = c[0];
  const sz = fit(g, title, S * 0.84, S * (d.f === 'grotesk' ? 0.12 : 0.1), fontFn, 12);
  const w = g.measureText(title).width;
  const x = d.t === 'center' ? (S - w) / 2 : S * 0.08;
  if (d.k === 'night' || d.k === 'grid') { g.save(); g.shadowColor = d.k === 'night' ? c[1] : c[1]; g.shadowBlur = S * 0.03; g.fillText(title, x, y); g.restore(); }
  g.fillText(title, x, y);
  const [a] = artistLine();
  g.fillStyle = d.k === 'stripes' ? c[0] : sub;
  g.fillText(a, x + (d.t === 'center' ? (w - g.measureText(a).width) / 2 : 0), y + sz * 0.36 + S * 0.035);
}

// ------------------------------------------------------------------ public
export function drawFront(g, rec, S) {
  const r = rng(hashStr(rec.id));
  g.save();
  (ART[rec.d.k] || ART.type)(g, S, rec.d.c, r, rec.d);
  drawTitle(g, S, rec);
  grain(g, S, 0.05, hashStr(rec.id) + 1);
  // printed-paper softness at the edges
  vignette(g, S, 0.18);
  g.restore();
}

export function drawBack(g, rec, S) {
  const c = rec.d.c;
  const dark = ['curtain', 'grid', 'night', 'noir', 'lamp', 'stars'].includes(rec.d.k);
  const bg = dark ? mix(c[0], '#000000', 0.15) : mix(c[2] || '#f4efe6', '#f4efe6', 0.55);
  const ink = dark ? '#ece5d6' : '#231d18';
  const soft = dark ? 'rgba(236,229,214,0.6)' : 'rgba(35,29,24,0.6)';
  g.fillStyle = bg; g.fillRect(0, 0, S, S);
  // small reprise of the front
  const t = document.createElement('canvas'); t.width = t.height = Math.round(S * 0.3);
  const tg = t.getContext('2d');
  (ART[rec.d.k] || ART.type)(tg, t.width, c, rng(hashStr(rec.id)), rec.d);
  g.drawImage(t, S * 0.07, S * 0.07);
  g.strokeStyle = soft; g.lineWidth = 1; g.strokeRect(S * 0.07, S * 0.07, t.width, t.height);
  g.textBaseline = 'alphabetic';
  g.fillStyle = ink; g.font = JPF(S * 0.05, 700);
  const title = titleText(rec);
  fit(g, title, S * 0.5, S * 0.05, (s) => JPF(s, 700), 10);
  g.fillText(title, S * 0.43, S * 0.13);
  g.font = JPF(S * 0.03, 400); g.fillStyle = soft;
  g.fillText(rec.artist + '　' + rec.en, S * 0.43, S * 0.18);
  g.font = `500 ${S * 0.022}px "IBM Plex Mono", monospace`;
  g.fillText(`STEREO  ${rec.cat}`, S * 0.43, S * 0.23);
  // track list
  const sideNames = rec.sides || ['SIDE A', 'SIDE B'];
  const cols = [[rec.A, sideNames[0], S * 0.07], [rec.B, sideNames[1], S * 0.53]];
  cols.forEach(([list, name, x]) => {
    let y = S * 0.45;
    g.fillStyle = ink; g.font = `500 ${S * 0.026}px "IBM Plex Mono", monospace`;
    g.fillText(name.toUpperCase(), x, y);
    g.fillRect(x, y + S * 0.012, S * 0.38, 1);
    y += S * 0.06;
    list.forEach((tr, i) => {
      g.fillStyle = soft; g.font = `500 ${S * 0.022}px "IBM Plex Mono", monospace`;
      g.fillText(String(i + 1), x, y);
      g.fillStyle = ink;
      fit(g, tr, S * 0.34, S * 0.028, (s) => JPF(s, 400), 9);
      g.fillText(tr, x + S * 0.04, y);
      y += S * 0.052;
    });
  });
  g.fillStyle = soft; g.font = `500 ${S * 0.018}px "IBM Plex Mono", monospace`;
  g.fillText(`℗ ${rec.date.slice(0, 4)}  ${rec.label}`, S * 0.07, S * 0.94);
  g.textAlign = 'right'; g.fillText('MADE IN JAPAN', S * 0.93, S * 0.94); g.textAlign = 'left';
  grain(g, S, 0.04, hashStr(rec.id) + 7);
}

export function drawLabel(g, rec, R, side = 'A') {
  const c = rec.d.c;
  const col = rec.d.k === 'type' || rec.d.k === 'paperwhite' ? c[2] : c[0];
  g.save();
  g.translate(R, R);
  g.fillStyle = col; g.beginPath(); g.arc(0, 0, R, 0, 7); g.fill();
  const lum = (() => { const h = col.replace('#', ''); const v = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); return (v[0] * 0.3 + v[1] * 0.59 + v[2] * 0.11) / 255; })();
  const ink = lum > 0.55 ? '#1d1712' : '#f4eee2';
  g.strokeStyle = rgba(ink === '#1d1712' ? '#000000' : '#ffffff', 0.25); g.lineWidth = 1; g.beginPath(); g.arc(0, 0, R * 0.92, 0, 7); g.stroke();
  g.fillStyle = ink; g.textAlign = 'center'; g.textBaseline = 'middle';
  const title = titleText(rec);
  fit(g, title, R * 1.2, R * 0.2, (s) => JPF(s, 700), 6);
  g.fillText(title, 0, -R * 0.46);
  g.font = JPF(R * 0.12, 400); g.fillText(rec.artist, 0, -R * 0.26);
  g.font = `500 ${R * 0.11}px "IBM Plex Mono", monospace`;
  g.fillText('SIDE ' + side, -R * 0.55, R * 0.02);
  g.fillText('33⅓', R * 0.55, R * 0.02);
  g.font = `500 ${R * 0.09}px "IBM Plex Mono", monospace`;
  g.fillText(rec.cat, 0, R * 0.42);
  g.fillText('STEREO', 0, R * 0.58);
  g.fillStyle = '#d8d2c4'; g.beginPath(); g.arc(0, 0, R * 0.06, 0, 7); g.fill();
  g.fillStyle = '#111'; g.beginPath(); g.arc(0, 0, R * 0.035, 0, 7); g.fill();
  g.restore();
}

export const spineColor = (rec) => rec.d.c[0];
export const plainTitle = (rec) => titleText(rec);
export { jpPlain };
