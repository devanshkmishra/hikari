// flicker_lab.exe — filming a CRT with a phone. The tube draws a field every 1/59.94 s;
// the camera exposes for 1/S. Match them and the rolling dark band disappears.
import { h, mkCanvas, clamp, rrect } from './util.js';

export const FLICKER_CSS = `
.ae-flick .bd{background:#1b1d22;color:#e8ecf2;flex-direction:row;flex-wrap:wrap}
.fl-view{flex:1 1 380px;min-width:0;position:relative;background:#121214;display:flex;align-items:center;justify-content:center;min-height:240px}
.fl-view canvas{width:100%;height:100%;display:block;object-fit:contain}
.fl-side{flex:0 0 210px;padding:12px;display:flex;flex-direction:column;gap:10px;background:linear-gradient(180deg,#2a2d34,#1d1f24);font-size:13px}
.fl-side h4{margin:0;font:bold 13px Tahoma,sans-serif;color:#9fb3cc;letter-spacing:.08em}
.fl-chips{display:flex;flex-wrap:wrap;gap:5px}
.fl-chips button{min-width:52px;height:28px;border-radius:14px;border:1px solid #4a5260;background:linear-gradient(#3a3f49,#2a2e36);color:#e8ecf2;font:13px "IBM Plex Mono",monospace}
.fl-chips button.on{background:linear-gradient(#ffd36a,#f0a020);color:#1b1d22;border-color:#ffd36a;font-weight:bold}
.fl-meter{height:10px;border-radius:5px;background:#111;overflow:hidden;box-shadow:inset 0 1px 3px #000}
.fl-meter i{display:block;height:100%;width:50%;background:linear-gradient(90deg,#3cff7a,#ffd36a,#ff4a3a);transition:width .3s}
.fl-st{font-size:14px;line-height:1.6;min-height:46px}
.fl-st b{color:#ffd36a}
.fl-note{color:#8a94a6;font-size:13px;line-height:1.6;margin-top:auto}
@media (max-width:640px){.fl-side{flex:1 1 100%}}
`;

const SPEEDS = [30, 50, 60, 100, 125, 250, 500];
const FIELD = 1 / 59.94;

export function openFlicker(A) {
  const { ctx } = A;
  let S = 250, frameN = 0, acc = 0, solvedOnce = false;
  const win = A.wm.open({ id: 'flicker', title: A.T('flicker_lab.exe — シャッター スピード テスト', 'flicker_lab.exe — shutter speed test'), icon: 'camera', w: 720, h: 470, cls: 'ae-flick', maxOnPhone: true });
  win.body.innerHTML = `<div class="fl-view"><canvas></canvas></div>
    <div class="fl-side">
      <h4>SHUTTER</h4><div class="fl-chips">${SPEEDS.map((s) => `<button data-s="${s}">1/${s}</button>`).join('')}</div>
      <h4>FLICKER</h4><div class="fl-meter"><i></i></div>
      <div class="fl-st"></div>
      <div class="fl-note">${A.L('カメラ: 30 fps · ブラウン[管|かん|tube]: 59.94 Hz (NTSC)<br>1 [回|かい|one time]の[露光|ろこう|exposure]で、ちょうど 1 フィールド。', 'Camera: 30 fps · tube: 59.94 Hz (NTSC)<br>One exposure, exactly one field.')}</div>
    </div>`;
  const cv = win.body.querySelector('canvas');
  const meter = win.body.querySelector('.fl-meter i'), st = win.body.querySelector('.fl-st');
  const chips = win.body.querySelector('.fl-chips');
  const VW = 480, VH = 300;
  cv.width = VW; cv.height = VH;
  const g = cv.getContext('2d');
  const scr = mkCanvas(220, 160), sg = scr.getContext('2d');
  const rows = new Float32Array(160);

  function setS(s) {
    S = s;
    chips.querySelectorAll('button').forEach((b) => b.classList.toggle('on', +b.dataset.s === s));
    const ratio = 59.94 / S;
    const near = Math.abs(ratio - Math.round(ratio)) < 0.02 && Math.round(ratio) >= 1;
    const bad = near ? 0.04 : ratio < 1 ? 1 - ratio * 0.6 : 0.4;
    meter.style.width = clamp(bad * 100, 4, 100) + '%';
    if (near && Math.round(ratio) === 1) {
      st.innerHTML = A.L('<b>ちらつき: ほぼなし</b><br>[一枚|いちまい|one frame]の[露光|ろこう|exposure]に、フィールドがひとつ[丸|まる|whole]ごと。', '<b>Flicker: almost none</b><br>Each frame holds one whole field.');
      if (!solvedOnce) { solvedOnce = true; A.sfx.ding(); A.emit('flicker:solved'); }
    } else if (near) {
      st.innerHTML = A.L('<b>ちらつき: ほぼなし</b><br>でも 2 フィールド[分|ぶん|worth]で、[動|うご|movement]きがぶれる。', '<b>Flicker: almost none</b><br>But two fields per frame, so motion smears.');
    } else if (ratio < 1) {
      st.innerHTML = A.L(`<b>ちらつき: ひどい</b><br>[速|はや|fast]すぎて、[画面|がめん|screen]の ${Math.round(ratio * 100)}% しか[写|うつ|to be captured]らない。`, `<b>Flicker: bad</b><br>Too fast: only ${Math.round(ratio * 100)}% of the screen gets captured.`);
    } else {
      st.innerHTML = A.L('<b>ちらつき: すこし</b><br>[明|あか|bright]るい[帯|おび|band]が、ゆっくり[流|なが|to flow]れる。', '<b>Flicker: a little</b><br>A bright band drifts slowly up the screen.');
    }
  }
  chips.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { A.sfx.click(); setS(+b.dataset.s); } });
  setS(250);

  // an osu!-like map playing on the tube
  const notes = [];
  for (let i = 0; i < 40; i++) notes.push({ t: i * 0.42, x: 30 + ((i * 53) % 160), y: 30 + ((i * 37) % 100), n: (i % 4) + 1 });
  function drawScreen(time) {
    sg.fillStyle = '#0a0d1c'; sg.fillRect(0, 0, 220, 160);
    sg.fillStyle = 'rgba(80,90,160,.25)'; sg.fillRect(0, 0, 220, 160);
    const tt = time % (40 * 0.42);
    notes.forEach((nt) => {
      const d = nt.t - tt;
      if (d > 0.9 || d < -0.15) return;
      const a = d < 0 ? 1 + d / 0.15 : 1;
      sg.globalAlpha = clamp(a, 0, 1) * (d > 0.6 ? (0.9 - d) / 0.3 : 1);
      if (d > 0) { sg.strokeStyle = '#ffb0dc'; sg.lineWidth = 1.5; sg.beginPath(); sg.arc(nt.x, nt.y, 11 + d * 30, 0, 7); sg.stroke(); }
      sg.fillStyle = '#e2448e'; sg.beginPath(); sg.arc(nt.x, nt.y, 11, 0, 7); sg.fill();
      sg.strokeStyle = '#fff'; sg.lineWidth = 2; sg.stroke();
      sg.fillStyle = '#fff'; sg.font = 'bold 11px Arial'; sg.textAlign = 'center'; sg.textBaseline = 'middle'; sg.fillText(nt.n, nt.x, nt.y + 1);
    });
    sg.globalAlpha = 1;
    const cx = 110 + Math.sin(time * 2.1) * 60, cy = 80 + Math.cos(time * 1.7) * 40;
    sg.fillStyle = '#fff'; sg.beginPath(); sg.arc(cx, cy, 4, 0, 7); sg.fill();
  }

  // brightness of each scanline for one camera exposure [t0, t0+E]
  function bands(t0) {
    const E = 1 / S;
    const w = 0.08;
    const sm = (f) => clamp(f / w, 0, 1);
    for (let i = 0; i < rows.length; i++) {
      const y = i / rows.length;
      const u0 = t0 / FIELD - y, u1 = (t0 + E) / FIELD - y;
      const c = (Math.floor(u1) + sm(u1 - Math.floor(u1))) - (Math.floor(u0) + sm(u0 - Math.floor(u0)));
      rows[i] = c / Math.max(E / FIELD, 0.0001);
    }
  }

  const stop = ctx.loop((t, dt) => {
    if (win.closed) { stop(); return; }
    if (win.min) return;
    acc += dt;
    if (acc < 1 / 30) return;
    acc = 0;
    frameN++;
    const t0 = frameN / 30;
    bands(t0);
    drawScreen(t);
    // viewfinder
    g.fillStyle = '#121214'; g.fillRect(0, 0, VW, VH);
    // the TV in frame
    rrect(g, 110, 40, 270, 220, 22);
    g.fillStyle = '#8f8c84'; g.fill();
    rrect(g, 128, 56, 200, 172, 26); g.fillStyle = '#111'; g.fill();
    g.save(); rrect(g, 136, 62, 184, 158, 28); g.clip();
    g.drawImage(scr, 136, 62, 184, 158);
    for (let i = 0; i < rows.length; i++) {
      const b = rows[i];
      const y = 62 + (i / rows.length) * 158;
      if (b < 1) { g.fillStyle = `rgba(0,0,0,${clamp(1 - b, 0, 0.92)})`; g.fillRect(136, y, 184, 158 / rows.length + 0.6); }
      else if (b > 1.02) { g.fillStyle = `rgba(255,255,255,${clamp((b - 1) * 0.3, 0, 0.35)})`; g.fillRect(136, y, 184, 158 / rows.length + 0.6); }
    }
    g.fillStyle = 'rgba(0,0,0,.18)';
    for (let y = 62; y < 220; y += 2) g.fillRect(136, y, 184, 1);
    g.restore();
    g.fillStyle = '#5a5852'; g.beginPath(); g.arc(352, 80, 9, 0, 7); g.fill(); g.beginPath(); g.arc(352, 108, 7, 0, 7); g.fill();
    // camera UI
    g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 2;
    [[90, 26, 1, 1], [390, 26, -1, 1], [90, 274, 1, -1], [390, 274, -1, -1]].forEach(([x, y, sx, sy]) => { g.beginPath(); g.moveTo(x + 18 * sx, y); g.lineTo(x, y); g.lineTo(x, y + 18 * sy); g.stroke(); });
    g.fillStyle = '#ff3a2a'; g.beginPath(); g.arc(22, 20, 5, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.font = '13px "IBM Plex Mono", monospace'; g.textAlign = 'left';
    const secs = Math.floor(frameN / 30);
    g.fillText(`REC 00:${String(secs % 60).padStart(2, '0')}`, 34, 25);
    g.textAlign = 'right'; g.fillText('PRO VIDEO', VW - 12, 25);
    g.textAlign = 'left';
    g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(0, VH - 30, VW, 30);
    g.fillStyle = '#fff';
    g.fillText(`ISO 200   S 1/${S}   30fps   WB 6500K`, 12, VH - 10);
  });
  return win;
}
