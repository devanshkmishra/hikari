// ひかり プレーヤー 9 — a skinnable glossy media player with a live spectrum.
// Only one file on this computer actually plays. The rest live on your shelf.
import { h, esc, fmtTime, clamp } from './util.js';
import { createSong, SONG } from './song.js';
import { ARTISTS, ARTIST_EN, GENRE_EN } from './texts.js';

export const PLAYER_CSS = `
.ae-player .bd{background:var(--pl-bg);padding:10px;gap:9px;color:var(--pl-ink)}
.ae-player{--pl-bg:linear-gradient(180deg,#d9ecff,#9fc8f3 40%,#6fa5e6);--pl-panel:linear-gradient(180deg,rgba(255,255,255,.75),rgba(255,255,255,.25) 48%,rgba(190,225,255,.35));
  --pl-edge:#3f78c8;--pl-ink:#0b2a5a;--pl-lcd:#06223f;--pl-lcd-ink:#8ff0ff;--pl-btn:radial-gradient(circle at 35% 25%,#ffffff,#bfe2ff 45%,#3b8fe8 75%,#1b5fc8);--pl-glow:#48d8ff}
.ae-player[data-skin="chrome"]{--pl-bg:linear-gradient(180deg,#f4f5f7,#c9ccd2 30%,#e8eaee 52%,#a9adb5);--pl-panel:linear-gradient(180deg,rgba(255,255,255,.9),rgba(255,255,255,.3) 48%,rgba(200,200,210,.4));
  --pl-edge:#7d828c;--pl-ink:#222;--pl-lcd:#141619;--pl-lcd-ink:#ffcf6a;--pl-btn:radial-gradient(circle at 35% 25%,#ffffff,#e4e6ea 45%,#9aa0aa 75%,#6b717c);--pl-glow:#ffb347}
.ae-player[data-skin="mint"]{--pl-bg:linear-gradient(180deg,#eaffd9,#b8f08a 40%,#6fd24a);--pl-panel:linear-gradient(180deg,rgba(255,255,255,.8),rgba(255,255,255,.25) 48%,rgba(220,255,190,.35));
  --pl-edge:#3c9a2a;--pl-ink:#123a0a;--pl-lcd:#0b2410;--pl-lcd-ink:#b6ff7a;--pl-btn:radial-gradient(circle at 35% 25%,#ffffff,#d8ffb8 45%,#5cc23a 75%,#2f8a1f);--pl-glow:#9dff5a}
.pl-panel{border-radius:14px;border:1px solid var(--pl-edge);background:var(--pl-panel);box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 2px 6px rgba(0,30,80,.18);padding:8px}
.pl-lcd{border-radius:9px;background:var(--pl-lcd);color:var(--pl-lcd-ink);padding:7px 12px;font:14px "VT323","DotGothic16",monospace;letter-spacing:.06em;box-shadow:inset 0 2px 8px rgba(0,0,0,.7),inset 0 0 0 1px rgba(255,255,255,.08);position:relative;overflow:hidden}
.pl-lcd::after{content:"";position:absolute;inset:0;background:linear-gradient(rgba(255,255,255,.14),rgba(255,255,255,0) 45%);pointer-events:none}
.pl-mq{white-space:nowrap;overflow:hidden;font-size:18px;text-shadow:0 0 6px var(--pl-glow)}
.pl-mq span{display:inline-block;padding-left:100%;animation:pl-mq 16s linear infinite}
@keyframes pl-mq{to{transform:translateX(-100%)}}
.pl-row{display:flex;justify-content:space-between;font-size:15px;opacity:.85;margin-top:2px}
.pl-vis{position:relative;height:150px;border-radius:9px;overflow:hidden;background:#020b18;box-shadow:inset 0 2px 10px rgba(0,0,0,.8);cursor:pointer}
.pl-vis canvas{width:100%;height:100%;display:block}
.pl-vis .md{position:absolute;right:8px;top:6px;color:rgba(255,255,255,.6);font-size:13px;pointer-events:none}
.pl-ctrl{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.pl-b{width:34px;height:34px;border-radius:50%;border:1px solid var(--pl-edge);background:var(--pl-btn);box-shadow:inset 0 -2px 4px rgba(0,0,0,.2),0 1px 3px rgba(0,0,0,.25);padding:0;position:relative;display:grid;place-items:center}
.pl-b svg{width:16px;height:16px;fill:#fff;filter:drop-shadow(0 1px 1px rgba(0,0,0,.45))}
.pl-b.big{width:52px;height:52px}
.pl-b.big svg{width:24px;height:24px}
.pl-b:hover{filter:brightness(1.1) drop-shadow(0 0 6px var(--pl-glow))}
.pl-b:active{filter:brightness(.9)}
.pl-seek{flex:1;min-width:120px;height:12px;border-radius:6px;background:rgba(0,0,0,.25);box-shadow:inset 0 1px 3px rgba(0,0,0,.5);position:relative;touch-action:none;cursor:pointer}
.pl-seek i{position:absolute;left:0;top:0;bottom:0;border-radius:6px;background:linear-gradient(180deg,#fff,var(--pl-glow) 50%,var(--pl-edge))}
.pl-seek b{position:absolute;top:50%;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;background:var(--pl-btn);border:1px solid var(--pl-edge)}
.pl-vol{width:84px;accent-color:var(--pl-edge)}
.pl-small{font-size:13px;display:flex;gap:6px;align-items:center}
.pl-small button{height:24px;padding:0 9px;border-radius:12px;border:1px solid var(--pl-edge);background:var(--pl-panel);color:var(--pl-ink);font-size:13px}
.pl-small button.on{box-shadow:inset 0 0 0 1px var(--pl-glow),0 0 6px var(--pl-glow)}
.pl-lib{flex:1;min-height:110px;overflow:auto;border-radius:9px;background:rgba(255,255,255,.88);border:1px solid var(--pl-edge);touch-action:pan-y}
.pl-lib table{width:100%;border-collapse:collapse;font-size:13px;color:#111}
.pl-lib th{position:sticky;top:0;text-align:left;font-weight:normal;padding:4px 8px;background:linear-gradient(#fff,#e3e8ef);border-bottom:1px solid #c8ced8;z-index:1}
.pl-lib td{padding:3px 8px;white-space:nowrap}
.pl-lib tr:hover td{background:#e3efff}
.pl-lib tr.play td{background:linear-gradient(90deg,#cfe9ff,#eaf6ff);font-weight:bold}
.pl-lib .pc{width:34%;}
.pl-lib .pc i{display:block;height:7px;border-radius:4px;background:linear-gradient(90deg,var(--pl-edge),var(--pl-glow));box-shadow:inset 0 1px 0 rgba(255,255,255,.6)}
.pl-lib .g{color:#666}
`;

const SVG = {
  play: '<svg viewBox="0 0 16 16"><path d="M4 2l10 6-10 6z"/></svg>',
  pause: '<svg viewBox="0 0 16 16"><path d="M3 2h4v12H3zM9 2h4v12H9z"/></svg>',
  stop: '<svg viewBox="0 0 16 16"><path d="M3 3h10v10H3z"/></svg>',
  prev: '<svg viewBox="0 0 16 16"><path d="M2 2h2v12H2zM15 2v12L5 8z"/></svg>',
  next: '<svg viewBox="0 0 16 16"><path d="M12 2h2v12h-2zM1 2l10 6-10 6z"/></svg>',
};
const SKINS = ['aqua', 'chrome', 'mint'];
const SKIN_NAMES = { aqua: ['アクア', 'Aqua'], chrome: ['クローム', 'Chrome'], mint: ['ミント', 'Mint'] };
const MODES = ['bars', 'scope', 'ambience'];
const MODE_NAMES = { bars: ['バーと波', 'Bars and Waves'], scope: ['スコープ', 'Scope'], ambience: ['アンビエンス', 'Ambience'] };

export function openPlayer(A) {
  const { ctx } = A;
  if (!A.song) A.song = createSong(A);
  const song = A.song;
  let skin = ctx.store.get('skin', 'aqua');
  let mode = 0;
  const body = h('div', '', `
    <div class="pl-panel"><div class="pl-lcd"><div class="pl-mq"><span></span></div><div class="pl-row"><span class="st"></span><span class="tm">0:00 / ${fmtTime(SONG.duration)}</span></div></div></div>
    <div class="pl-vis"><canvas></canvas><div class="md"></div></div>
    <div class="pl-panel pl-ctrl">
      <button class="pl-b" data-a="prev">${SVG.prev}</button>
      <button class="pl-b" data-a="stop">${SVG.stop}</button>
      <button class="pl-b big" data-a="play">${SVG.play}</button>
      <button class="pl-b" data-a="next">${SVG.next}</button>
      <div class="pl-seek"><i></i><b></b></div>
      <div class="pl-small"><span class="vl"></span><input class="pl-vol" type="range" min="0" max="100" value="80"></div>
    </div>
    <div class="pl-small"><button data-a="skin"></button><button class="on rp"></button><span class="lbn" style="margin-left:auto"></span></div>
    <div class="pl-lib"><table><thead><tr><th></th><th class="h1"></th><th class="h2"></th><th class="pc h3"></th></tr></thead><tbody></tbody></table></div>`);
  body.style.cssText = 'display:contents';
  const win = A.wm.open({ id: 'player', title: A.T('ひかり プレーヤー', 'Hikari Player'), icon: 'music', w: 560, h: 620, cls: 'ae-player', minW: 360, minH: 420, onClosed: () => { song.stop(); stopLoop(); A.emit('music:stop'); } });
  win.el.dataset.skin = skin;
  win.body.appendChild(body);
  const $ = (s) => win.body.querySelector(s);
  const mq = $('.pl-mq span'), st = $('.st'), tm = $('.tm'), seek = $('.pl-seek'), fill = seek.querySelector('i'), knob = seek.querySelector('b');
  const cv = $('.pl-vis canvas'), md = $('.pl-vis .md');
  const tb = $('.pl-lib tbody');
  const T = A.T;
  const setMarquee = (t) => { mq.textContent = t; };
  const songLine = () => `♪ ${SONG.title} — ${SONG.artist} · ${SONG.album} · 132 BPM · ${T('ニ長調', 'D major')} ·`;
  let marqueeNote = null;
  const status = () => (song.playing ? T('再生中', 'Playing') : song.position > 0.05 ? T('一時停止', 'Paused') : T('停止', 'Stopped'));
  const nameOf = (n) => (A.en ? ARTIST_EN[n] || n : n);
  const genreOf = (g) => (A.en ? GENRE_EN[g] || g : g);
  function paint() {
    win.setTitle(T('ひかり プレーヤー', 'Hikari Player'));
    setMarquee(marqueeNote ? marqueeNote() : songLine());
    st.textContent = status();
    md.textContent = T(...MODE_NAMES[MODES[mode]]);
    [['prev', '前へ', 'Previous'], ['stop', '停止', 'Stop'], ['next', '次へ', 'Next']].forEach(([a, j, e]) => { $(`[data-a="${a}"]`).title = T(j, e); });
    playBtn.title = song.playing ? T('一時停止', 'Pause') : T('再生', 'Play');
    $('.vl').textContent = T('音量', 'Volume');
    $('[data-a="skin"]').textContent = `${T('スキン', 'Skin')}: ${T(...SKIN_NAMES[skin])}`;
    $('.rp').textContent = T('リピート', 'Repeat');
    $('.lbn').textContent = T(`ライブラリ — ${ARTISTS.length + 1} アーティスト`, `Library — ${ARTISTS.length + 1} artists`);
    $('.h1').textContent = T('タイトル / アーティスト', 'Title / Artist');
    $('.h2').textContent = T('ジャンル', 'Genre');
    $('.h3').textContent = T('再生回数', 'Play count');
    tb.innerHTML = `<tr class="play" data-i="-1"><td>▶</td><td>${esc(SONG.title)} — ${esc(SONG.artist)}</td><td class="g">${T('トランス ポップ', 'Trance pop')}</td><td class="pc"><i style="width:12%"></i></td></tr>` +
      ARTISTS.map(([n, g, p], i) => `<tr data-i="${i}"><td></td><td>${esc(nameOf(n))}</td><td class="g">${esc(genreOf(g))}</td><td class="pc"><i style="width:${p}%"></i></td></tr>`).join('');
  }
  tb.addEventListener('click', (e) => {
    const tr = e.target.closest('tr');
    if (!tr) return;
    if (tr.dataset.i === '-1') { if (!song.playing) play(); return; }
    A.sfx.ding();
    const n = ARTISTS[+tr.dataset.i][0];
    marqueeNote = () => T(`${n} — このコンピュータにはライブラリ情報だけがあります。本物は、あなたの棚に。 ·`, `${nameOf(n)} — only the library entry lives on this computer. The real thing is on your shelf. ·`);
    setMarquee(marqueeNote());
    ctx.timeout(() => { marqueeNote = null; if (!win.closed) setMarquee(songLine()); }, 9000);
  });

  const playBtn = $('[data-a="play"]');
  function play() {
    song.play();
    playBtn.innerHTML = SVG.pause;
    playBtn.title = T('一時停止', 'Pause');
    st.textContent = status();
    A.emit('music:play');
    startLoop();
  }
  function pause() {
    song.pause();
    playBtn.innerHTML = SVG.play;
    playBtn.title = T('再生', 'Play');
    st.textContent = T('一時停止', 'Paused');
  }
  win.body.addEventListener('click', (e) => {
    const b = e.target.closest('[data-a]');
    if (!b) return;
    A.sfx.click();
    const a = b.dataset.a;
    if (a === 'play') song.playing ? pause() : play();
    if (a === 'stop') { song.stop(); playBtn.innerHTML = SVG.play; st.textContent = T('停止', 'Stopped'); }
    if (a === 'prev') song.seek(0);
    if (a === 'next') song.seek(0.43);
    if (a === 'skin') {
      skin = SKINS[(SKINS.indexOf(skin) + 1) % SKINS.length];
      win.el.dataset.skin = skin;
      b.textContent = `${T('スキン', 'Skin')}: ${T(...SKIN_NAMES[skin])}`;
      ctx.store.set('skin', skin);
    }
  });
  paint();
  win.relabel = paint;
  $('.pl-vol').addEventListener('input', (e) => song.volume(+e.target.value / 100));
  $('.pl-vis').addEventListener('click', () => { mode = (mode + 1) % MODES.length; md.textContent = T(...MODE_NAMES[MODES[mode]]); A.sfx.menu(); });
  seek.addEventListener('pointerdown', (e) => {
    seek.setPointerCapture(e.pointerId);
    const set = (ev) => { const r = seek.getBoundingClientRect(); song.seek(clamp((ev.clientX - r.left) / r.width, 0, 1)); };
    set(e);
    const mv = (ev) => set(ev);
    const up = () => { seek.removeEventListener('pointermove', mv); seek.removeEventListener('pointerup', up); };
    seek.addEventListener('pointermove', mv);
    seek.addEventListener('pointerup', up);
  });

  // ── visualizer ──
  const g = cv.getContext('2d');
  const freq = new Uint8Array(song.analyser.frequencyBinCount);
  const wave = new Uint8Array(song.analyser.fftSize);
  const NB = 28;
  const peaks = new Float32Array(NB), lvl = new Float32Array(NB);
  let stop = null, W = 0, H = 0, idleT = 0;
  function size() {
    const r = cv.getBoundingClientRect();
    const d = Math.min(ctx.dpr, 2);
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    cv.width = Math.round(W * d); cv.height = Math.round(H * d);
    g.setTransform(d, 0, 0, d, 0, 0);
  }
  function startLoop() {
    if (stop) return;
    size();
    stop = ctx.loop((t, dt) => {
      if (win.closed) { stopLoop(); return; }
      const pos = song.position;
      fill.style.width = (pos / song.duration) * 100 + '%';
      knob.style.left = (pos / song.duration) * 100 + '%';
      tm.textContent = `${fmtTime(pos)} / ${fmtTime(song.duration)}`;
      if (win.min) return;
      if (cv.width < 4) size();
      draw(t, dt);
      if (!song.playing) { idleT += dt; if (idleT > 2) stopLoop(); } else idleT = 0;
    });
  }
  function stopLoop() { if (stop) { stop(); stop = null; } }
  function draw(t, dt) {
    const an = song.analyser;
    an.getByteFrequencyData(freq);
    g.clearRect(0, 0, W, H);
    const accent = getComputedStyle(win.el).getPropertyValue('--pl-glow').trim() || '#48d8ff';
    const m = MODES[mode];
    // log bands
    for (let i = 0; i < NB; i++) {
      const a = Math.floor(Math.pow(i / NB, 1.9) * (freq.length * 0.7)) + 1;
      const b = Math.max(a + 1, Math.floor(Math.pow((i + 1) / NB, 1.9) * (freq.length * 0.7)) + 1);
      let s = 0;
      for (let k = a; k < b; k++) s += freq[k];
      const v = s / (b - a) / 255;
      lvl[i] += (v - lvl[i]) * Math.min(1, dt * 18);
      peaks[i] = Math.max(peaks[i] - dt * 0.45, lvl[i]);
    }
    if (m === 'bars') {
      const base = H * 0.7, bw = W / NB;
      for (let i = 0; i < NB; i++) {
        const bh = Math.max(2, lvl[i] * base * 0.96);
        const x = i * bw + 2, w = bw - 4;
        const gr = g.createLinearGradient(0, base - bh, 0, base);
        gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.25, accent); gr.addColorStop(1, 'rgba(20,80,180,.9)');
        g.fillStyle = gr;
        g.fillRect(x, base - bh, w, bh);
        g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x, base - bh, w * 0.42, bh);
        g.fillStyle = '#fff'; g.fillRect(x, base - peaks[i] * base * 0.96 - 4, w, 2.5);
        const rg = g.createLinearGradient(0, base, 0, base + bh * 0.45);
        rg.addColorStop(0, 'rgba(120,220,255,.28)'); rg.addColorStop(1, 'rgba(120,220,255,0)');
        g.fillStyle = rg; g.fillRect(x, base + 2, w, bh * 0.45);
      }
    } else if (m === 'scope') {
      an.getByteTimeDomainData(wave);
      g.lineWidth = 2; g.strokeStyle = accent; g.shadowColor = accent; g.shadowBlur = 10;
      g.beginPath();
      for (let i = 0; i < wave.length; i += 2) {
        const x = (i / wave.length) * W, y = H / 2 + ((wave[i] - 128) / 128) * H * 0.42;
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.stroke(); g.shadowBlur = 0;
    } else {
      for (let i = 0; i < NB; i += 2) {
        const x = W * (0.08 + 0.84 * ((i * 0.618) % 1)), y = H * (0.25 + 0.5 * ((i * 0.383 + t * 0.03) % 1));
        const r = 6 + lvl[i] * Math.min(W, H) * 0.32;
        const gr = g.createRadialGradient(x, y, r * 0.2, x, y, r);
        gr.addColorStop(0, 'rgba(255,255,255,.02)'); gr.addColorStop(0.8, 'rgba(160,230,255,.22)'); gr.addColorStop(1, 'rgba(255,190,240,.75)');
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
        g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.ellipse(x - r * 0.38, y - r * 0.4, r * 0.18, r * 0.1, -0.7, 0, 7); g.fill();
      }
    }
  }
  ctx.timeout(() => { size(); draw(0, 0.016); }, 30);
  win.opts.onResize = () => { size(); };
  ctx.timeout(() => { if (!win.closed && !song.playing) play(); }, 450);
  return win;
}
