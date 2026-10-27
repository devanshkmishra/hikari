// The ranking screen, and the three homages that can play over it:
// MISSION PASSED / RESPECT + (a clean pass), 死 or YOU DIED (a fail), and — for a full
// combo — the screen burning out to pure white.

import { TITLE, TITLE_ROMAJI } from './song-data.js';

const GRADE = {
  SS: ['#fff7c2', '#f5c542'], S: ['#fff1b0', '#f0b429'], A: ['#c9ffb8', '#3fbf62'], B: ['#c4e8ff', '#3a8ee6'],
  C: ['#ead0ff', '#9b59d0'], D: ['#ffc0c0', '#e04848'], F: ['#ffb0b0', '#8a1c22'], silver: ['#ffffff', '#aeb8cc'],
};

const LINES = {
  fc: ['[真っ白|まっしろ|pure white]に、[燃え尽きた|もえつきた|burned out completely]。', 'Burnt out. To pure white.'],
  nf: ['[何度|なんど|how many times][落|お|fall]ちても、[最後|さいご|the end]まで。', 'However many times you fell — all the way to the end.'],
  pass: ['おかえり。[手|て|hand; hands]は、まだ[覚えて|おぼえて|remembered; learned]いた。', 'Welcome back. Your hands still remembered.'],
  fail: ['もう[一度|いちど|once; one time]。', 'Once more.'],
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function showResults(app, r, relang = false) {
  const en = app.isEn ? app.isEn() : false;
  const { ctx, sfx, el } = app;
  const sig = ctx.signal;
  const mods = [r.mods.ez && 'EZ', r.mods.nf && 'NF', r.mods.hd && 'HD', r.mods.dt && 'DT'].filter(Boolean).join(' ') || 'no mods';
  const date = new Date();
  const stamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  const g = r.silver ? GRADE.silver : GRADE[r.grade] || GRADE.D;
  const fails = ctx.store.get('fails', 0) - (relang && r.failed ? 1 : 0);
  const sekiro = fails % 2 === 0;
  const lineKey = r.failed ? 'fail' : r.fullCombo ? 'fc' : r.nfSaved ? 'nf' : 'pass';
  const [jp, enLine] = LINES[lineKey];
  // homage lines keep their Japanese in English mode, with the English underneath
  const lineHTML = lineKey === 'fc' || !en ? `${ctx.jp.html(jp)}<span class="en">${enLine}</span>` : `<span style="font-family:'EB Garamond',serif;font-size:1.15em">${enLine}</span>`;
  const gradeLabel = r.grade === 'SS' && r.silver ? 'SS' : r.grade;

  el.innerHTML = `
    <div class="res">
      <div class="rh"><div class="t">${TITLE} <span style="font-family:var(--mono);font-size:.5em;font-weight:400;color:var(--mute)">${TITLE_ROMAJI}</span> [${r.diff.name}]</div>
        <div class="s">Played by ${esc(ctx.name)} · ${stamp} · ${mods} · ${en ? 'attempt' : '試行'} #${app.attempts}</div></div>
      <div class="rl">
        <div class="score">${String(r.score).padStart(8, '0')}</div>
        <div class="counts">
          <div><span style="color:#6fcdff">300</span>${r.n300}</div>
          <div><span style="color:#7dff9a">100</span>${r.n100}</div>
          <div><span style="color:#ffb347">50</span>${r.n50}</div>
          <div><span style="color:#ff3b5c">×</span>${r.nMiss}</div>
        </div>
        <div class="facts">
          <div>max combo<b>${r.maxCombo}x <small style="font-size:.5em;color:var(--mute)">/ ${r.mapMax}</small></b></div>
          <div>accuracy<b>${(r.acc * 100).toFixed(2)}%</b></div>
          <div>unstable rate<b>${r.ur.toFixed(2)}</b></div>
          <div>mean error<b>${r.mean >= 0 ? '+' : ''}${r.mean.toFixed(1)} ms</b></div>
          ${r.failed ? `<div>progress<b>${Math.round(r.progress * 100)}%</b></div>` : ''}
        </div>
        <canvas class="graph"></canvas>
      </div>
      <div class="rr">
        <div style="text-align:center">
          <div class="grade" style="--g1:${g[0]};--g2:${g[1]}">${gradeLabel}</div>
          <div class="line">${lineHTML}</div>
        </div>
      </div>
      <div class="rb">
        <button class="bb rt">${r.failed && sekiro ? (en ? 'Resurrect <small>回生 · retry</small>' : '回生 <small>resurrect · retry</small>') : (en ? 'Retry <small>`</small>' : 'やり直す <small>retry · `</small>')}</button>
        <button class="bb bk">${en ? 'Song select' : '選曲へ <small>back to song select</small>'}</button>
        ${!r.failed ? `<button class="bb tr" style="margin-left:auto">${en ? 'Board the train' : '乗車 <small>board the train</small>'}</button>` : ''}
      </div>
    </div>`;
  ctx.jp.attach(el);
  el.querySelector('.rt').addEventListener('click', () => { sfx.uiConfirm(); app.retry(); }, { signal: sig });
  el.querySelector('.bk').addEventListener('click', () => { sfx.uiBack(); app.toSelect(); }, { signal: sig });
  const tr = el.querySelector('.tr');
  if (tr) tr.addEventListener('click', () => ctx.leave(), { signal: sig });

  // HP graph
  const cv = el.querySelector('.graph');
  const drawGraph = () => {
    const W = cv.clientWidth, H = cv.clientHeight;
    if (!W) return;
    cv.width = W * ctx.dpr; cv.height = H * ctx.dpr;
    const c = cv.getContext('2d');
    c.setTransform(ctx.dpr, 0, 0, ctx.dpr, 0, 0);
    const log = r.hpLog.length ? r.hpLog : [1];
    const step = W / Math.max(1, log.length - 1);
    c.lineWidth = 2; c.lineJoin = 'round';
    for (let i = 1; i < log.length; i++) {
      c.strokeStyle = log[i] >= 0.5 ? '#8fd86f' : '#ff4f5e';
      c.beginPath();
      c.moveTo((i - 1) * step, 6 + (1 - log[i - 1]) * (H - 12));
      c.lineTo(i * step, 6 + (1 - log[i]) * (H - 12));
      c.stroke();
    }
  };
  requestAnimationFrame(drawGraph);

  if (relang) { requestAnimationFrame(drawGraph); return { redraw: drawGraph }; }
  // homage, then the light
  const hom = document.createElement('div');
  hom.className = 'hom';
  el.appendChild(hom);
  const goodAcc = r.acc >= 0.9 || ['SS', 'S', 'A'].includes(r.grade);
  if (r.failed) {
    ctx.store.set('fails', fails + 1);
    if (sekiro) {
      hom.innerHTML = `<div class="death"><div style="text-align:center"><div class="shi">死</div>${en ? '<div style="font-family:\'EB Garamond\',serif;font-size:clamp(16px,2vw,22px);letter-spacing:.3em;color:#b8323a">DEATH</div>' : ''}</div></div>`;
      sfx.deathSekiro();
    } else {
      hom.innerHTML = `<div class="death" style="background:none"><div class="yd">YOU DIED</div></div>`;
      sfx.deathSouls();
    }
    ctx.timeout(() => { hom.style.transition = 'opacity 1.2s'; hom.style.opacity = '0'; }, 3400);
    ctx.timeout(() => hom.remove(), 4700);
  } else if (r.fullCombo) {
    hom.innerHTML = `<div class="white">
      <svg viewBox="0 0 240 170" aria-hidden="true"><g fill="none" stroke="#000" stroke-linecap="round">
        <path stroke-width="5" d="M200 18 V160"/>
        <path stroke-width="2.2" d="M8 46 Q110 58 198 34 M8 76 Q110 88 198 64 M8 106 Q110 118 198 94"/>
        <path stroke-width="2.6" d="M150 112 H186 M150 112 L146 150 M186 112 L190 150 M156 112 L158 146 M180 112 L178 146"/>
        <path stroke-width="1.6" d="M20 160 H230"/></g></svg>
      <div class="joe">${ctx.jp.html(LINES.fc[0])}${en ? '<div style="margin-top:10px;font-family:\'EB Garamond\',serif;font-style:italic;letter-spacing:.08em">Burnt out. To pure white.</div>' : ''}</div></div>`;
    sfx.burnOut();
    ctx.timeout(() => app.award(r), 2600);
    ctx.timeout(() => hom.remove(), 6500);
  } else if (goodAcc) {
    hom.innerHTML = `<div class="gta"><div class="mp">MISSION PASSED!</div><div class="rs">RESPECT +</div></div>`;
    sfx.missionPassed();
    ctx.timeout(() => app.award(r), 1700);
    ctx.timeout(() => hom.remove(), 3700);
  } else {
    ctx.timeout(() => app.award(r), 1200);
    hom.remove();
  }
  return { redraw: drawGraph };
}
