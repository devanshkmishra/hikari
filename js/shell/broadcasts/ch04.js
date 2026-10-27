// 4ch — late-night commercials, 9 s each, on a loop. All products fictional.
//  A いちご牛乳      「糖分は、魂の燃料だ。」 (a samurai-drama cut, for strawberry milk)
//  B ジキトール      a degaussing spray for CRTs. It also sprays you.
//  C ひかりペン辞書  a light-pen hover dictionary. 「ふりがなは、いらない。」
//  D 1906           a black sneaker on a black screen. 「1906、黒。」
import { F, DW, DH, wantFont, kickFonts, adopt, cached, stage, broadcast, gclock, txt, vtxt, glowSprite, clamp, smooth, lerp, easeOutBack, hash, mk, randomTile, timeline, sub, EN } from './common.js';
import { epiano, bell, kick, snare, clap, crash, brass, pad, taiko, thunder, whoosh, degauss, boing, blip, bass } from './synth.js';

const CM = 9, PERIOD = CM * 4;

wantFont(`800 54px ${F.round}`, 'いちご牛乳ひかり乳業あまくて、やさしい。500ml');
wantFont(`800 52px ${F.mincho}`, '糖分は、魂の燃料だ。');
wantFont(`18px ${F.dot}`, '※糖分のとりすぎには、気をつけよう。テレビの色ムラ、ありませんか?ありがとうあなたのテレビにも。※ブラウン管専用。効果には個人差があります。※ふりがなが必要な方は、ふりがなをお使いください。※画面が暗いのは、故障ではありません。たそがれ夕方の、うす暗いころ。まる文の終わり。');
wantFont(`700 40px ${F.goth}`, 'ジキトール磁気、とれーる。シュッ!ひかりペン辞書1906、黒。見えなくても、やわらかい。');
wantFont(`600 30px ${F.serif}`, '黄昏の坂道で、誰かが待っている。ふりがなは、いらない。わからない時だけ、ひかりペン辞書。');
wantFont(`22px ${F.vt}`, 'HIKARI ATHLETIC MODEL 1906 BLACK HOVER-1');

// ======================= sprites =======================
function buildCarton(x) {
  const front = [[20, 90], [120, 90], [120, 270], [20, 270]];
  const poly = (pts, fill) => { x.fillStyle = fill; x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath(); x.fill(); };
  poly([[34, 38], [134, 38], [134, 50], [34, 50]], '#f8c9da');
  poly([[20, 90], [120, 90], [134, 50], [34, 50]], '#f9b8cf');
  poly([[120, 90], [148, 76], [134, 50]], '#e489aa');
  poly([[120, 90], [148, 76], [148, 256], [120, 270]], '#d6739a');
  poly(front, '#f29abb');
  x.fillStyle = '#fff'; x.fillRect(20, 98, 100, 22);
  txt(x, 'ひかり乳業', 70, 115, { font: `700 13px ${F.round}`, align: 'center', color: '#e0567f' });
  // strawberry
  x.fillStyle = '#e8203f';
  x.beginPath(); x.moveTo(70, 196); x.bezierCurveTo(40, 176, 40, 140, 70, 146); x.bezierCurveTo(100, 140, 100, 176, 70, 196); x.fill();
  x.fillStyle = '#ffe9a0';
  for (let i = 0; i < 14; i++) { const a = hash(i) * 6.28, r = 6 + hash(i + 40) * 18; x.fillRect(70 + Math.cos(a) * r * 0.9 - 1, 168 + Math.sin(a) * r * 0.7 - 1, 2, 3); }
  x.fillStyle = '#3e9b3a';
  for (let i = 0; i < 5; i++) { x.save(); x.translate(70, 148); x.rotate(-1.2 + i * 0.6); x.beginPath(); x.ellipse(0, -6, 4, 9, 0, 0, Math.PI * 2); x.fill(); x.restore(); }
  txt(x, 'いちご牛乳', 70, 236, { font: `800 19px ${F.round}`, align: 'center', color: '#fff', stroke: '#c93a69', sw: 4 });
  txt(x, '500ml', 112, 262, { font: `11px ${F.vt}`, align: 'right', color: '#fff' });
  x.fillStyle = 'rgba(255,255,255,0.18)'; x.fillRect(26, 90, 10, 180);
}
function buildCartonDark(x) {
  x.drawImage(cached('ch4:carton', 170, 280, buildCarton), 0, 0);
  x.globalCompositeOperation = 'source-atop';
  x.fillStyle = 'rgba(14,2,10,0.9)'; x.fillRect(0, 0, 170, 280);
  const rim = x.createLinearGradient(100, 0, 150, 0);
  rim.addColorStop(0, 'rgba(255,40,40,0)'); rim.addColorStop(1, 'rgba(255,60,50,0.9)');
  x.fillStyle = rim; x.fillRect(0, 0, 170, 280);
  x.globalCompositeOperation = 'source-over';
}

function buildCan(x) {
  const body = x.createLinearGradient(15, 0, 75, 0);
  body.addColorStop(0, '#5b606c'); body.addColorStop(0.35, '#eef2f7'); body.addColorStop(0.6, '#a3a9b4'); body.addColorStop(1, '#3f434c');
  x.fillStyle = body; x.fillRect(15, 52, 60, 168);
  x.beginPath(); x.ellipse(45, 220, 30, 7, 0, 0, Math.PI); x.fill();
  x.beginPath(); x.ellipse(45, 52, 30, 14, 0, Math.PI, 0); x.fill();
  const lab = x.createLinearGradient(15, 0, 75, 0);
  lab.addColorStop(0, '#7a0d45'); lab.addColorStop(0.35, '#ff3b95'); lab.addColorStop(1, '#5e0834');
  x.fillStyle = lab; x.fillRect(15, 88, 60, 104);
  x.fillStyle = '#ffe64a';
  x.beginPath(); x.moveTo(50, 94); x.lineTo(36, 122); x.lineTo(46, 122); x.lineTo(40, 146); x.lineTo(56, 114); x.lineTo(46, 114); x.closePath(); x.fill();
  vtxt(x, 'ジキ', 45, 146, 17, { font: `700 17px ${F.goth}`, color: '#fff' });
  x.fillStyle = '#d42a2f'; x.fillRect(31, 22, 28, 28);
  x.fillStyle = '#ff6a6a'; x.fillRect(35, 22, 6, 28);
  x.fillStyle = '#222'; x.fillRect(40, 12, 10, 12);
  x.fillStyle = '#111'; x.fillRect(48, 15, 5, 4);
}

function buildTV(x) {
  const wood = x.createLinearGradient(0, 0, 0, 220);
  wood.addColorStop(0, '#6b4528'); wood.addColorStop(1, '#4a2e19');
  x.fillStyle = wood; x.beginPath(); x.roundRect(4, 4, 252, 196, 14); x.fill();
  x.strokeStyle = 'rgba(30,15,5,0.35)'; x.lineWidth = 1;
  for (let i = 0; i < 18; i++) { x.beginPath(); x.moveTo(6, 10 + i * 11 + hash(i) * 4); x.bezierCurveTo(80, 6 + i * 11, 160, 14 + i * 11, 254, 9 + i * 11); x.stroke(); }
  x.fillStyle = '#1a1a1c'; x.beginPath(); x.roundRect(16, 16, 176, 140, 16); x.fill();
  x.fillStyle = '#2b2b2e'; x.fillRect(200, 16, 46, 168);
  for (const [cx, cy, r] of [[223, 44, 15], [223, 88, 11]]) {
    const k = x.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, r);
    k.addColorStop(0, '#f2f2f2'); k.addColorStop(1, '#6d6d72');
    x.fillStyle = k; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
    x.strokeStyle = '#333'; x.lineWidth = 2; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx, cy - r + 3); x.stroke();
  }
  x.fillStyle = '#111';
  for (let i = 0; i < 8; i++) x.fillRect(206, 112 + i * 8, 34, 3);
  x.fillStyle = '#3a2414'; x.fillRect(30, 200, 14, 16); x.fillRect(216, 200, 14, 16);
}

// side-profile chunky runner, toe to the right; an original shape (no real brand marks)
function sneaker(x, lit) {
  const upper = lit ? '#4a4d58' : '#101013';
  const overlay = lit ? '#6c707c' : '#18181c';
  const sole = lit ? '#5b5e66' : '#141417';
  const silver = lit ? '#eef3fb' : '#2c2e34';
  const stitch = lit ? 'rgba(220,226,240,0.55)' : 'rgba(80,80,90,0.5)';
  // outsole + midsole
  x.fillStyle = sole;
  x.beginPath();
  x.moveTo(30, 120); x.bezierCurveTo(24, 150, 40, 164, 70, 164);
  x.lineTo(360, 164); x.bezierCurveTo(392, 162, 404, 146, 404, 128);
  x.lineTo(392, 126); x.bezierCurveTo(300, 132, 200, 128, 30, 120); x.fill();
  x.fillStyle = lit ? '#2f3036' : '#0b0b0d';
  x.fillRect(46, 156, 310, 8);
  x.strokeStyle = stitch; x.lineWidth = 2;
  x.beginPath(); x.moveTo(40, 136); for (let i = 0; i <= 12; i++) x.quadraticCurveTo(52 + i * 27, 128 + (i % 2) * 14, 66 + i * 27, 136); x.stroke();
  x.fillStyle = silver; x.beginPath(); x.ellipse(120, 142, 26, 7, 0, 0, Math.PI * 2); x.fill();
  // upper (drawn taller than authored: a chunky runner, not a plimsoll)
  x.save(); x.translate(0, 126); x.scale(1, 1.45); x.translate(0, -126);
  x.fillStyle = upper;
  x.beginPath();
  x.moveTo(30, 120); x.bezierCurveTo(22, 90, 30, 60, 46, 48);
  x.quadraticCurveTo(72, 58, 104, 62); x.quadraticCurveTo(136, 46, 158, 30);
  x.lineTo(176, 34); x.quadraticCurveTo(250, 70, 330, 98);
  x.bezierCurveTo(372, 106, 400, 112, 400, 128); x.bezierCurveTo(300, 132, 200, 128, 30, 120); x.fill();
  // overlays: heel counter, mudguard, eyestay, toe cap
  x.fillStyle = overlay;
  x.beginPath(); x.moveTo(30, 120); x.bezierCurveTo(24, 92, 32, 66, 46, 52); x.quadraticCurveTo(70, 70, 92, 120); x.closePath(); x.fill();
  x.beginPath(); x.moveTo(150, 124); x.quadraticCurveTo(230, 96, 300, 104); x.quadraticCurveTo(360, 104, 398, 124); x.closePath(); x.fill();
  x.beginPath(); x.moveTo(160, 36); x.quadraticCurveTo(236, 72, 318, 100); x.lineTo(300, 108); x.quadraticCurveTo(230, 86, 170, 58); x.closePath(); x.fill();
  x.beginPath(); x.moveTo(340, 100); x.quadraticCurveTo(388, 106, 400, 126); x.lineTo(352, 124); x.closePath(); x.fill();
  // layered side panels (the "1906" look, generic)
  x.strokeStyle = stitch; x.lineWidth = 1.5; x.setLineDash([3, 3]);
  for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(80 + i * 14, 118); x.quadraticCurveTo(140 + i * 20, 66 - i * 4, 210 + i * 18, 62 + i * 6); x.stroke(); }
  x.setLineDash([]);
  // reflective accents
  x.fillStyle = silver;
  x.beginPath(); x.moveTo(52, 70); x.quadraticCurveTo(64, 80, 70, 104); x.lineTo(62, 104); x.quadraticCurveTo(58, 84, 48, 76); x.closePath(); x.fill();
  x.beginPath(); x.moveTo(110, 108); x.quadraticCurveTo(170, 74, 236, 80); x.lineTo(232, 86); x.quadraticCurveTo(172, 82, 116, 112); x.closePath(); x.fill();
  // laces
  x.strokeStyle = lit ? '#9aa0ac' : '#202026'; x.lineWidth = 3; x.lineCap = 'round';
  for (let i = 0; i < 6; i++) { const lx = 182 + i * 22, ly = 46 + i * 9.5; x.beginPath(); x.moveTo(lx, ly); x.lineTo(lx + 14, ly - 8); x.stroke(); }
  // heel tab
  x.fillStyle = overlay; x.fillRect(36, 44, 14, 14);
  x.restore();
}
const buildShoeDark = (x) => { x.translate(8, 60); sneaker(x, false); };
const buildShoeLit = (x) => { x.translate(8, 60); sneaker(x, true); };

let SWEEP = null;

function buildDots(x, w, h) {
  x.fillStyle = 'rgba(255,255,255,0.45)';
  for (let j = 0; j < h / 40 + 1; j++) for (let i = 0; i < w / 40 + 1; i++) {
    x.beginPath(); x.arc(i * 40 + (j % 2) * 20, j * 40, 5, 0, Math.PI * 2); x.fill();
  }
}

// ======================= the four spots =======================
function cmStrawberry(x, u) {
  if (u < 3.2 || u >= 6.4) {
    const bg = x.createRadialGradient(320, 240, 40, 320, 240, 420);
    bg.addColorStop(0, '#ffe1ec'); bg.addColorStop(1, '#f59fc0');
    x.fillStyle = bg; x.fillRect(0, 0, DW, DH);
    const dr = gclock() * 12;
    x.drawImage(cached('ch4:dots', DW + 80, DH + 160, buildDots, true), (dr % 40) - 40, (dr % 80) - 80);
    const carton = cached('ch4:carton', 170, 280, buildCarton);
    if (u < 3.2) {
      const k = easeOutBack(clamp(u / 0.7));
      const sq = 1 + Math.sin(clamp(u / 0.9) * Math.PI) * 0.06;
      x.save(); x.translate(320, 420 - 120 * k + (1 - k) * 240); x.scale(1.2 / sq, 1.2 * sq); x.rotate(Math.sin(u * 3) * 0.05);
      x.drawImage(carton, -85, -280); x.restore();
      if (u > 1.0) txt(x, 'あまくて、やさしい。', 320, 84, { font: `800 30px ${F.round}`, align: 'center', color: '#ffffff', stroke: '#e0457b', sw: 6 });
      if (u > 1.8) txt(x, 'いちご牛乳', 320, 448, { font: `800 54px ${F.round}`, align: 'center', color: '#fff', stroke: '#d2245e', sw: 10, shadow: 'rgba(120,0,40,0.35)', sx: 4, sy: 4 });
      x.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 6; i++) {
        const tw = (Math.sin(gclock() * 6 + i * 2) + 1) / 2;
        x.globalAlpha = tw * 0.9; x.drawImage(glowSprite('255,255,255'), 180 + hash(i) * 280 - 12, 120 + hash(i + 7) * 220 - 12, 24, 24);
      }
      x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    } else {
      x.save(); x.translate(200, 400); x.scale(1.15, 1.15); x.drawImage(carton, -85, -280); x.restore();
      txt(x, 'いちご牛乳', 420, 240, { font: `800 54px ${F.round}`, align: 'center', color: '#fff', stroke: '#d2245e', sw: 10 });
      txt(x, 'ひかり乳業', 420, 290, { font: `700 22px ${F.round}`, align: 'center', color: '#c22a5c' });
      x.fillStyle = 'rgba(255,255,255,0.7)'; x.fillRect(0, 404, DW, 34);
      txt(x, '※糖分のとりすぎには、気をつけよう。', 320, 428, { font: `18px ${F.dot}`, align: 'center', color: '#8a1a40' });
    }
  } else {
    // the samurai-drama cut
    const v = u - 3.2;
    x.fillStyle = '#0b0206'; x.fillRect(0, 0, DW, DH);
    const glow = x.createRadialGradient(250, 300, 20, 250, 300, 360);
    glow.addColorStop(0, 'rgba(150,10,20,0.75)'); glow.addColorStop(1, 'rgba(40,0,10,0)');
    x.fillStyle = glow; x.fillRect(0, 0, DW, DH);
    x.strokeStyle = 'rgba(255,90,70,0.16)'; x.lineWidth = 2;
    for (let i = 0; i < 40; i++) {
      const a = hash(i) * Math.PI * 2, r0 = 160 + hash(i + 3) * 60;
      x.beginPath(); x.moveTo(250 + Math.cos(a) * r0, 300 + Math.sin(a) * r0); x.lineTo(250 + Math.cos(a) * 700, 300 + Math.sin(a) * 700); x.stroke();
    }
    const flash = (v < 0.12) || (v > 1.35 && v < 1.42) || (v > 1.5 && v < 1.55);
    if (flash) { x.fillStyle = 'rgba(255,240,240,0.85)'; x.fillRect(0, 0, DW, DH); }
    const s = 1.55 + v * 0.05;
    x.save(); x.translate(250, 470); x.scale(s, s); x.drawImage(cached('ch4:cartondark', 170, 280, buildCartonDark), -85, -280); x.restore();
    const col = { font: `800 52px ${F.mincho}`, color: '#fff4ee', shadow: 'rgba(200,0,20,0.8)', sx: 3, sy: 3 };
    if (v > 0.25) vtxt(x, '糖分は、', 548, 62, 52, col);
    if (v > 1.35) vtxt(x, '魂の燃料だ。', 474, 62, 52, col);
  }
}

function cmDegauss(x, u) {
  // studio backdrop
  const bg = x.createLinearGradient(0, 0, 0, DH);
  bg.addColorStop(0, '#20325e'); bg.addColorStop(1, '#0d1630');
  x.fillStyle = bg; x.fillRect(0, 0, DW, DH);
  if (u >= 7) {
    // pack shot
    x.fillStyle = 'rgba(255,255,255,0.05)';
    for (let i = 0; i < 12; i++) { x.save(); x.translate(200, 250); x.rotate(i * Math.PI / 6 + gclock() * 0.2); x.fillRect(0, -10, 500, 20); x.restore(); }
    x.save(); x.translate(200, 250); x.scale(1.4, 1.4); x.rotate(-0.08); x.drawImage(cached('ch4:can', 90, 230, buildCan), -45, -125); x.restore();
    txt(x, 'ジキトール', 430, 220, { font: `700 56px ${F.goth}`, align: 'center', color: '#ffe64a', stroke: '#b0105a', sw: 10, shadow: 'rgba(0,0,0,0.5)', sx: 4, sy: 4 });
    txt(x, '磁気、とれーる。', 430, 272, { font: `700 28px ${F.goth}`, align: 'center', color: '#fff' });
    x.fillStyle = 'rgba(0,0,0,0.55)'; x.fillRect(0, 404, DW, 34);
    txt(x, '※ブラウン管専用。効果には個人差があります。', 320, 428, { font: `18px ${F.dot}`, align: 'center', color: '#e8e8e8' });
    return;
  }
  // the TV in the ad
  const tvX = 110, tvY = 120;
  x.drawImage(cached('ch4:tv', 260, 220, buildTV), tvX, tvY);
  x.save();
  x.beginPath(); x.roundRect(tvX + 16, tvY + 16, 176, 140, 16); x.clip();
  const fixed = u > 3.4;
  const wob = u > 3.3 && u < 4.3 ? Math.sin(u * 60) * (4.3 - u) * 10 : 0;
  // picture: colour bars, purity-blotched until degaussed
  const cols = ['#bfbfbf', '#bfbf00', '#00bfbf', '#00bf00', '#bf00bf', '#bf0000', '#0000bf'];
  for (let i = 0; i < 7; i++) { x.fillStyle = cols[i]; x.fillRect(tvX + 16 + i * 25.2 + wob, tvY + 16, 26, 140); }
  if (!fixed || u < 4.3) {
    const k = fixed ? 1 - clamp((u - 3.4) / 0.9) : 1;
    x.globalAlpha = 0.75 * k;
    for (const [bx, by, r, c] of [[tvX + 40, tvY + 40, 70, '255,0,200'], [tvX + 170, tvY + 130, 80, '0,255,120'], [tvX + 160, tvY + 30, 50, '0,120,255']]) {
      x.drawImage(glowSprite(c), bx - r + wob, by - r, r * 2, r * 2);
    }
    x.globalAlpha = 1;
  }
  if (u > 4.0 && u < 7) {
    x.fillStyle = 'rgba(0,0,0,0.6)'; x.fillRect(tvX + 16, tvY + 64, 176, 44);
    txt(x, 'ありがとう', tvX + 104, tvY + 95, { font: `24px ${F.dot}`, align: 'center', color: '#fff' });
  }
  x.restore();
  // spray can + mist
  if (u > 2.2) {
    const inK = smooth(2.2, 2.6, u);
    const toYou = u > 5.0;
    const cx = toYou ? 470 : lerp(700, 470, inK), cy = 250;
    x.save(); x.translate(cx, cy);
    const rot = toYou ? lerp(-0.5, 0, smooth(5.0, 5.3, u)) : -0.5;
    x.rotate(rot);
    const sc = toYou ? lerp(1, 1.5, smooth(5.0, 5.4, u)) : 1;
    x.scale(sc, sc);
    x.drawImage(cached('ch4:can', 90, 230, buildCan), -45, -125);
    x.restore();
    const sprayA = (u > 2.6 && u < 3.0) || (u > 3.0 && u < 3.35);
    if (sprayA) {
      x.fillStyle = 'rgba(255,255,255,0.5)';
      for (let i = 0; i < 40; i++) { const f = hash(i + Math.floor(u * 30)); x.beginPath(); x.arc(440 - f * 160, 160 + (hash(i * 3) - 0.5) * f * 120, 2 + f * 5, 0, Math.PI * 2); x.fill(); }
      txt(x, 'シュッ!', 392, 112, { font: `700 40px ${F.goth}`, color: '#fff', stroke: '#1d2b5c', sw: 6 });
    }
  }
  if (u < 2.4) {
    x.fillStyle = 'rgba(0,0,0,0.55)'; x.fillRect(0, 396, DW, 40);
    txt(x, 'テレビの色ムラ、ありませんか?', 320, 424, { font: `22px ${F.dot}`, align: 'center' });
  }
  if (u > 5.0 && u < 7) {
    // it sprays the camera: mist over your screen, then a wipe
    const fog = smooth(5.2, 5.9, u) * (1 - smooth(6.3, 6.9, u));
    x.globalAlpha = fog * 0.92;
    x.fillStyle = '#f2f4f8'; x.fillRect(0, 0, DW, DH);
    x.globalAlpha = 1;
    if (u > 5.3) txt(x, 'あなたのテレビにも。', 320, 250, { font: `700 34px ${F.goth}`, align: 'center', color: '#21305e' });
  }
}

const VN_LINE = '黄昏の坂道で、誰かが待っている。';
function cmDictionary(x, u) {
  if (u < 5.6) {
    const bg = x.createLinearGradient(0, 0, 0, DH);
    bg.addColorStop(0, '#f2a96b'); bg.addColorStop(0.55, '#a35a7a'); bg.addColorStop(1, '#2e2448');
    x.fillStyle = bg; x.fillRect(0, 0, DW, DH);
    x.fillStyle = 'rgba(40,20,50,0.6)';
    x.beginPath(); x.moveTo(0, 300); x.lineTo(200, 270); x.lineTo(380, 220); x.lineTo(640, 190); x.lineTo(640, 330); x.lineTo(0, 330); x.fill();
    // VN text window
    x.fillStyle = 'rgba(12,16,40,0.82)'; x.fillRect(48, 318, 544, 112);
    x.strokeStyle = 'rgba(220,230,255,0.7)'; x.lineWidth = 2; x.strokeRect(54, 324, 532, 100);
    x.font = `600 30px ${F.serif}`; x.textBaseline = 'alphabetic';
    const shown = Math.min(VN_LINE.length, Math.floor(u * 14));
    const s = VN_LINE.slice(0, shown);
    txt(x, s, 80, 384, { font: `600 30px ${F.serif}`, color: '#f4f0ff' });
    // word positions
    const wTwilight = x.measureText('黄昏').width;
    const wFull = x.measureText(VN_LINE).width;
    const wDot = x.measureText('。').width;
    let target = null, pop = null;
    if (u > 1.2 && u < 3.4) { target = [80, wTwilight]; pop = ['黄昏', 'たそがれ', '夕方の、うす暗いころ。']; }
    else if (u >= 3.6) { target = [80 + wFull - wDot, wDot]; pop = ['。', 'まる', '文の終わり。']; }
    // light pen
    const pts = [[600, 120], [96, 352], [96, 352], [80 + wFull - wDot * 0.5, 352]];
    const k1 = smooth(0.5, 1.2, u), k2 = smooth(3.0, 3.6, u);
    let px = lerp(pts[0][0], pts[1][0], k1), py = lerp(pts[0][1], pts[1][1], k1);
    px = lerp(px, pts[3][0], k2);
    if (target) {
      x.fillStyle = 'rgba(255,240,140,0.35)'; x.fillRect(target[0] - 2, 352, target[1] + 4, 40);
      // the popup
      const bx = Math.min(target[0], 330), by = 196;
      x.fillStyle = 'rgba(6,10,30,0.92)'; x.fillRect(bx, by, 250, 100);
      x.strokeStyle = '#7fd6ff'; x.lineWidth = 2; x.strokeRect(bx + 0.5, by + 0.5, 250, 100);
      txt(x, pop[0], bx + 16, by + 42, { font: `600 30px ${F.serif}`, color: '#fff' });
      txt(x, pop[1], bx + 30 + (pop[0].length * 30), by + 40, { font: `18px ${F.dot}`, color: '#7fd6ff' });
      txt(x, pop[2], bx + 16, by + 80, { font: `18px ${F.dot}`, color: '#e8ecff' });
    }
    x.save(); x.translate(px, py); x.rotate(-0.55);
    x.fillStyle = '#d8dbe2'; x.fillRect(-5, -150, 10, 130);
    x.fillStyle = '#2b2e36'; x.fillRect(-5, -60, 10, 40);
    x.fillStyle = '#9aa0ab'; x.beginPath(); x.moveTo(-5, -20); x.lineTo(5, -20); x.lineTo(1, -2); x.lineTo(-1, -2); x.fill();
    x.globalCompositeOperation = 'lighter'; x.drawImage(glowSprite('140,220,255'), -12, -12, 24, 24); x.globalCompositeOperation = 'source-over';
    x.strokeStyle = '#1b1b1f'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, -150); x.bezierCurveTo(10, -220, 80, -200, 120, -320); x.stroke();
    x.restore();
    if (u > 1.2) {
      x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillRect(0, 34, DW, 34);
      txt(x, 'ひかりペン辞書  HOVER-1', 320, 58, { font: `700 22px ${F.goth}`, align: 'center', color: '#fff' });
    }
  } else {
    x.fillStyle = '#05060a'; x.fillRect(0, 0, DW, DH);
    const a = smooth(5.6, 6.1, u);
    x.globalAlpha = a;
    txt(x, 'ふりがなは、いらない。', 320, 228, { font: `600 44px ${F.serif}`, align: 'center', color: '#ffffff' });
    x.globalAlpha = smooth(6.6, 7.1, u);
    txt(x, 'わからない時だけ、ひかりペン辞書。', 320, 290, { font: `600 22px ${F.serif}`, align: 'center', color: '#bcd6ff' });
    x.globalAlpha = 1;
    if (u > 7.3) {
      x.fillStyle = 'rgba(255,255,255,0.08)'; x.fillRect(0, 404, DW, 34);
      txt(x, '※ふりがなが必要な方は、ふりがなをお使いください。', 320, 428, { font: `18px ${F.dot}`, align: 'center', color: '#c8c8c8' });
    }
  }
}

function cmSneaker(x, u) {
  x.fillStyle = '#030304'; x.fillRect(0, 0, DW, DH);
  const dark = cached('ch4:shoedark', 430, 240, buildShoeDark, true);
  const lit = cached('ch4:shoelit', 430, 240, buildShoeLit, true);
  if (!SWEEP) SWEEP = mk(430, 240);
  const [sc, sx] = SWEEP;
  // drop + soft bounce after the reveal
  let y = 170, squash = 1;
  if (u > 3.0) {
    const v = u - 3.0;
    const h = Math.abs(Math.sin(v * 5.2)) * Math.exp(-v * 2.2) * 60;
    y = 170 - h;
    const contact = Math.exp(-((v * 5.2) % Math.PI) * 3) * Math.exp(-v * 1.5);
    squash = 1 - 0.08 * contact;
  }
  x.save();
  x.translate(320, y + 200);
  x.scale(2 - squash, squash);
  x.drawImage(dark, -215, -240);
  // light sweep reveals what the dark hides
  const sweepX = lerp(-200, 640, smooth(0.8, 2.8, u));
  const glint = u > 5.6 ? 0.25 + 0.2 * Math.sin(gclock() * 3) : 0;
  sx.globalCompositeOperation = 'copy';
  sx.drawImage(lit, 0, 0);
  sx.globalCompositeOperation = 'destination-in';
  const gr = sx.createLinearGradient(sweepX - 120, 0, sweepX + 120, 0);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  sx.fillStyle = gr; sx.fillRect(0, 0, 430, 240);
  x.drawImage(sc, -215, -240);
  if (glint) { x.globalAlpha = glint; x.drawImage(lit, -215, -240); x.globalAlpha = 1; }
  x.restore();
  // floor reflection hint
  x.fillStyle = 'rgba(255,255,255,0.03)'; x.fillRect(80, 372, 480, 1);
  if (u > 3.4) {
    const a = smooth(3.4, 3.9, u);
    x.globalAlpha = a;
    txt(x, '1906、黒。', 320, 120, { font: `700 52px ${F.goth}`, align: 'center', color: '#f2f2f2', spacing: 6 });
    x.globalAlpha = smooth(5.6, 6.2, u);
    txt(x, '見えなくても、やわらかい。', 320, 410, { font: `700 22px ${F.goth}`, align: 'center', color: '#bfc4cf' });
    txt(x, 'HIKARI ATHLETIC  MODEL 1906 BLACK', 320, 436, { font: `20px ${F.vt}`, align: 'center', color: '#7d828c', spacing: 2 });
    x.globalAlpha = 1;
  }
  if (u < 3.4) txt(x, '※画面が暗いのは、故障ではありません。', 320, 440, { font: `16px ${F.dot}`, align: 'center', color: '#5c5c62' });
  if (u > 5.6) {
    const tw = (Math.sin(gclock() * 5) + 1) / 2;
    x.globalCompositeOperation = 'lighter'; x.globalAlpha = tw;
    x.drawImage(glowSprite('230,240,255'), 320 - 215 + 64, y + 200 - 240 + 60 + 60, 20, 20);
    x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  }
}

const SPOTS = [cmStrawberry, cmDegauss, cmDictionary, cmSneaker];
const SUBS = [
  (u) => u < 3.2 ? ['Sweet and gentle.', 'STRAWBERRY MILK'] : u < 6.4 ? (u < 4.55 ? 'Sugar is...' : 'Sugar is fuel for the soul.')
    : ['STRAWBERRY MILK — Hikari Dairy', '*Mind your sugar intake.'],
  (u) => u < 2.4 ? 'Colour blotches on your TV?' : u < 4.0 ? 'Pssht!' : u < 5.0 ? 'TV: "Thank you."' : u < 7 ? 'Yours too.'
    : ['JIKITORU degauss spray: "Magnetism, be gone."', '*CRTs only. Results vary by individual.'],
  (u) => u < 1.2 ? 'At dusk on the hill road, someone is waiting.'
    : u < 3.4 ? ['tasogare: dusk; the dim hour after sunset', 'HIKARI PEN DICTIONARY  HOVER-1']
    : u < 5.6 ? ['maru: the end of a sentence.', 'HIKARI PEN DICTIONARY  HOVER-1']
    : u < 7.3 ? ['You don\'t need furigana.', 'Only when you\'re stuck: Hikari Pen Dictionary.']
    : '*If you need furigana, please use furigana.',
  (u) => u < 3.4 ? '*The dark screen is not a malfunction.' : u < 5.6 ? '1906. Black.' : ['1906. Black.', 'You can\'t see it. It\'s soft anyway.'],
];

// ======================= sound =======================
function buildEvents() {
  const ev = [];
  const at = (t, fn) => ev.push({ t, fn });
  // A: いちご牛乳
  const jA = [[76, 0.2], [79, 0.38], [81, 0.56], [79, 0.74], [76, 0.92], [72, 1.1], [77, 1.6], [81, 1.78], [84, 1.96], [83, 2.14], [79, 2.32], [84, 2.5]];
  jA.forEach(([m, t]) => at(t, (e, w) => { bell(e.A, e.bus, w, m, 0.45, 0.6, 3.5); epiano(e.A, e.bus, w, m - 12, 0.15, 0.35); }));
  [0.2, 0.92, 1.6, 2.32].forEach((t) => at(t, (e, w) => { kick(e.A, e.bus, w, 0.5); bass(e.A, e.bus, w, 48, 0.25, 0.6); }));
  [0.56, 1.28, 1.96, 2.68].forEach((t) => at(t, (e, w) => clap(e.A, e.bus, w, 0.4)));
  at(3.2, (e, w) => { taiko(e.A, e.bus, w, 0.75); thunder(e.A, e.bus, w, 0.6, 2.6); pad(e.A, e.bus, w, [33, 40, 45], 2.8, 1.2, 500, 0.1); });
  at(4.55, (e, w) => { taiko(e.A, e.bus, w, 0.75); brass(e.A, e.bus, w, [45, 52, 57, 60], 1.3, 0.9); });
  [[84, 6.5], [88, 6.7], [91, 6.9]].forEach(([m, t]) => at(t, (e, w) => bell(e.A, e.bus, w, m, 0.5, 1.2, 3.5)));
  at(6.9, (e, w) => epiano(e.A, e.bus, w, 60, 1, 0.4));
  // B: ジキトール
  const B = CM;
  [[62, 0.4], [61, 0.85], [60, 1.3]].forEach(([m, t], i) => at(B + t, (e, w) => brass(e.A, e.bus, w, [m - 12, m], i === 2 ? 0.8 : 0.35, 0.6)));
  at(B + 2.6, (e, w) => whoosh(e.A, e.bus, w, 0.32, 0.8, 3000, 7000, 0.7, 'highpass'));
  at(B + 3.0, (e, w) => whoosh(e.A, e.bus, w, 0.3, 0.8, 3000, 7000, 0.7, 'highpass'));
  at(B + 3.35, (e, w) => degauss(e.A, e.bus, w, 0.6));
  [[72, 4.0], [76, 4.12], [79, 4.24], [84, 4.36]].forEach(([m, t]) => at(B + t, (e, w) => bell(e.A, e.bus, w, m, 0.4, 0.8, 3.5)));
  at(B + 5.2, (e, w) => whoosh(e.A, e.bus, w, 1.2, 1, 2500, 8000, 0.5, 'highpass'));
  at(B + 6.1, (e, w) => degauss(e.A, e.bus, w, 0.75));
  [[0, 7.05], [0.18, 7.2], [0.36, 7.35]].forEach(([d, t], i) => at(B + t, (e, w) => brass(e.A, e.bus, w, [60 + [0, 4, 7][i], 72 + [0, 4, 7][i]], 0.14, 0.8)));
  at(B + 7.6, (e, w) => { brass(e.A, e.bus, w, [60, 64, 67, 72], 0.9, 0.9); crash(e.A, e.bus, w, 0.4); kick(e.A, e.bus, w, 0.7); });
  // C: ひかりペン辞書
  const Cc = CM * 2;
  at(Cc + 0.1, (e, w) => pad(e.A, e.bus, w, [60, 64, 67, 71, 74], 5.2, 0.8, 1600, 0.6));
  at(Cc + 1.25, (e, w) => { blip(e.A, e.bus, w, 2200, 0.05, 1); bell(e.A, e.bus, w + 0.08, 84, 0.35, 0.8, 2); });
  at(Cc + 3.65, (e, w) => { blip(e.A, e.bus, w, 2200, 0.05, 1); bell(e.A, e.bus, w + 0.08, 72, 0.35, 0.5, 2); });
  at(Cc + 5.65, (e, w) => { for (const m of [48, 55, 64, 67, 71]) epiano(e.A, e.bus, w, m, 2.5, 0.5); });
  [[79, 7.4], [84, 7.6], [86, 7.8], [88, 8.0]].forEach(([m, t]) => at(Cc + t, (e, w) => bell(e.A, e.bus, w, m, 0.35, 1, 3.5)));
  // D: 1906、黒。
  const D = CM * 3;
  for (let k = 0; k < 9; k++) at(D + 0.2 + k * 0.95, (e, w) => kick(e.A, e.bus, w, 0.35));
  at(D + 0.3, (e, w) => pad(e.A, e.bus, w, [38, 45, 50], 8.2, 0.7, 400, 1.2));
  at(D + 0.8, (e, w) => whoosh(e.A, e.bus, w, 2.0, 0.35, 1200, 9000, 2, 'bandpass'));
  at(D + 3.0, (e, w) => boing(e.A, e.bus, w, 0.8, 120));
  at(D + 3.62, (e, w) => boing(e.A, e.bus, w, 0.45, 150));
  at(D + 3.4, (e, w) => { for (const m of [62, 65, 69, 72, 76]) epiano(e.A, e.bus, w, m, 2.2, 0.32); });
  at(D + 5.7, (e, w) => bell(e.A, e.bus, w, 93, 0.3, 1.6, 3.5));
  return ev;
}

let EVENTS = null;
export default {
  name: 'コマーシャル',
  draw(g, t, W, H) {
    adopt(g); kickFonts();
    const x = stage();
    const p = gclock() % PERIOD;
    const i = Math.floor(p / CM), u = p - i * CM;
    if (u < 0.12) { x.fillStyle = '#000'; x.fillRect(0, 0, DW, DH); }
    else { SPOTS[i](x, u); if (EN()) sub(x, SUBS[i](u), 470); }
    broadcast(g, W, H, { noise: 0.04, ghostA: 0.06 });
  },
  start(audio, dest) {
    if (!EVENTS) EVENTS = buildEvents();
    return timeline(audio, dest, { period: PERIOD, gain: 0.85, events: EVENTS.slice() });
  },
};
