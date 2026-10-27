// BeetleJu.exe. The installer reads from a disc that is no longer anywhere.
// What survives is what you remember — so the beetle comes out and lives on your desktop.
import { h, mkCanvas, clamp } from './util.js';

export const BEETLE_CSS = `
.ae-setup .bd{flex-direction:row;background:#fff}
.su-side{width:156px;flex:none;background:linear-gradient(180deg,#0c7a6a,#0b4a8a 60%,#082a5a);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:#d6fff0;font:13px "Silkscreen","DotGothic16",monospace;letter-spacing:.06em;text-align:center;padding:10px}
.su-side canvas{width:108px;height:108px;image-rendering:pixelated;filter:drop-shadow(0 4px 0 rgba(0,0,0,.25))}
.su-main{flex:1;min-width:0;padding:16px 18px 12px;display:flex;flex-direction:column;gap:10px;font-size:13px}
.su-main h3{margin:0;font:bold 15px Tahoma,"Zen Kaku Gothic New",sans-serif}
.su-bar{height:22px;border:1px solid #7f9db9;border-radius:3px;padding:2px;background:#fff;position:relative;margin-top:24px}
.su-bar i{display:block;height:100%;width:0;background:repeating-linear-gradient(90deg,#3fc84a 0 8px,transparent 8px 10px);transition:width .5s linear}
.su-bar canvas{position:absolute;top:-23px;width:36px;height:21px;image-rendering:pixelated;margin-left:-30px;transition:left .5s linear}
.su-file{font:13px "IBM Plex Mono",monospace;color:#444;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.su-foot{margin-top:auto;display:flex;justify-content:flex-end;gap:6px}
.ae-beetle{position:absolute;left:0;top:0;width:30px;height:30px;image-rendering:pixelated;z-index:3;cursor:pointer;touch-action:none;will-change:transform}
.ae-note{position:absolute;z-index:4;pointer-events:none;color:#fff;font:bold 15px "Silkscreen",monospace;text-shadow:0 1px 2px rgba(0,0,0,.6);animation:ae-note 1.2s ease-out forwards}
@keyframes ae-note{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(-26px)}}
`;

const PAL = { a: '#22313a', h: '#183634', H: '#2f6a62', l: '#22313a', s: '#0c4a3c', p: '#123c36', P: '#1f6a58' };
// a tamamushi (jewel beetle), top-down, two walking frames
const TOP = [
  ['....a.....a....', '.....a...a.....', '......hhh......', '.l...hHHHh...l.', '..l.ppppppp.l..', '...pPPPPPPPp...',
    'llpGGGGsGGGGpll', '..pGGGGsGGGGp..', '..pGgGGsGGgGp..', 'llpGGGGsGGGGpll', '..pGGGGsGGGGp..', '...pGGGsGGGp...',
    '..l.pGGsGGp.l..', '.l...ppppp...l.', '.......p.......'],
  ['....a.....a....', '....a.....a....', '......hhh......', '..l..hHHHh..l..', '.l..ppppppp..l.', 'l..pPPPPPPPp..l',
    '..pGGGGsGGGGp..', 'llpGGGGsGGGGpll', '..pGgGGsGGgGp..', '..pGGGGsGGGGp..', 'llpGGGGsGGGGpll', '...pGGGsGGGp...',
    '.l..pGGsGGp..l.', 'l....ppppp....l', '.......p.......'],
];
const SIDE = [
  ['.......a....', '........a...', '..gggg.hh...', '.gGGGGghhh..', 'gGGGsGGghh..', 'gggggggg....', '.l..l..l....'],
  ['.......a....', '........a...', '..gggg.hh...', '.gGGGGghhh..', 'gGGGsGGghh..', 'gggggggg....', 'l..l..l.....'],
];

// jewel-beetle iridescence: the shell drifts teal → green → gold
function shell(t) {
  const k = (Math.sin(t * 0.7) + 1) / 2, j = (Math.sin(t * 0.43 + 1) + 1) / 2;
  const G = `hsl(${150 - k * 60 + j * 20}, ${70 + j * 15}%, ${50 + k * 10}%)`;
  const g = `hsl(${165 - k * 50}, 65%, ${32 + k * 6}%)`;
  return { G, g };
}
function paint(c, map, t) {
  const g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  const { G, g: gg } = shell(t);
  map.forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch === '.') return;
    g.fillStyle = ch === 'G' ? G : ch === 'g' ? gg : PAL[ch];
    g.fillRect(i, j, 1, 1);
  }));
  // a glint that slides along the shell
  const n = map[0].length;
  if (n === 15) {
    const gy = 6 + Math.floor(((Math.sin(t * 0.9) + 1) / 2) * 5);
    g.fillStyle = 'rgba(255,244,190,.9)'; g.fillRect(4, gy, 1, 1);
    g.fillStyle = 'rgba(255,244,190,.45)'; g.fillRect(10, gy + 1, 1, 1);
  } else { g.fillStyle = 'rgba(255,240,170,.9)'; g.fillRect(3, 3, 1, 1); }
}

export function openBeetle(A) {
  const { ctx } = A;
  if (A.beetle) {
    A.beetle.happy();
    return A.wm.msgbox({ title: A.T('Beetle Ju セットアップ', 'Beetle Ju Setup'), icon: 'beetle', html: A.L('Beetle Ju は、もうここにいます。<small>デスクトップのどこかを[歩|ある|to walk]いています。</small>', 'Beetle Ju is already here.<small>It\'s walking around somewhere on your desktop.</small>') });
  }
  const side = mkCanvas(15, 15);
  const walker = mkCanvas(12, 7);
  const win = A.wm.open({ id: 'beetle', title: A.T('Beetle Ju セットアップ', 'Beetle Ju Setup'), icon: 'beetlecd', w: 540, h: 330, max: false, resizable: false, center: true, small: ctx.w >= 640, cls: 'ae-setup' });
  win.body.innerHTML = `<div class="su-side"><div class="sc"></div>BEETLE JU<br><span style="opacity:.7">CD-ROM</span></div>
    <div class="su-main"><h3>${A.T('Beetle Ju をインストールしています', 'Installing Beetle Ju')}</h3><div class="st">${A.T('CD-ROM を読み込んでいます...', 'Reading CD-ROM...')}</div>
    <div class="su-bar"><i></i></div><div class="su-file">D:\\SETUP.EXE</div>
    <div class="su-foot"><button class="ae-btn">${A.T('キャンセル', 'Cancel')}</button></div></div>`;
  if (ctx.w < 640) win.body.querySelector('.su-side').style.display = 'none';
  win.body.querySelector('.sc').appendChild(side);
  const bar = win.body.querySelector('.su-bar'), fill = bar.querySelector('i');
  bar.appendChild(walker);
  walker.style.left = '0%';
  const st = win.body.querySelector('.st'), file = win.body.querySelector('.su-file');
  const cd = A.sfx.cd();
  let alive = true, frame = 0, t0 = performance.now();
  const anim = ctx.loop((t) => {
    if (!alive) return;
    const tt = (performance.now() - t0) / 1000;
    frame = Math.floor(tt * 6) % 2;
    paint(side, TOP[frame], tt);
    paint(walker, SIDE[frame], tt);
  });
  const set = (p, s, f) => {
    fill.style.width = p + '%';
    walker.style.left = p + '%';
    if (s) st.textContent = A.T(...s);
    if (f) file.textContent = f;
  };
  const steps = [
    [1700, 3, ['セットアップの準備をしています...', 'Preparing Setup...'], 'D:\\SETUP.INI'],
    [2600, 12, ['ファイルをコピーしています...', 'Copying files...'], 'D:\\DATA1.CAB'],
    [3400, 27, null, 'D:\\DATA1.CAB'],
    [4300, 41, null, 'D:\\DATA2.CAB'],
    [5100, 55, null, 'D:\\_INST32I.EX_'],
    [5900, 68, null, 'D:\\LAYOUT.BIN'],
    [6900, 79, null, 'D:\\DATA3.CAB'],
    [7700, 87, ['ディスクを読み込んでいます...', 'Reading disc...'], 'D:\\BEETLE.DAT'],
    [9400, 87, ['ディスクを読み込んでいます... (セクタ 0x3F2A)', 'Reading disc... (sector 0x3F2A)'], 'D:\\BEETLE.DAT'],
  ];
  steps.forEach(([ms, p, s, f]) => ctx.timeout(() => { if (alive) set(p, s, f); }, ms));
  const cancel = () => { if (!alive) return; alive = false; cd.stop(); anim(); win.close(true); };
  win.body.querySelector('.ae-btn').addEventListener('click', () => { A.sfx.click(); cancel(); });
  win.relabel = () => {
    win.setTitle(A.T('Beetle Ju セットアップ', 'Beetle Ju Setup'));
    win.body.querySelector('h3').textContent = A.T('Beetle Ju をインストールしています', 'Installing Beetle Ju');
    win.body.querySelector('.ae-btn').textContent = A.T('キャンセル', 'Cancel');
  };
  win.opts.onClose = () => { if (alive) { alive = false; cd.stop(); anim(); } return true; };
  ctx.timeout(async () => {
    if (!alive) return;
    cd.stop();
    st.textContent = A.T('読み込めませんでした。', 'Could not read the disc.');
    const r = win.el.getBoundingClientRect(), rr = A.root.getBoundingClientRect();
    const from = { x: r.left - rr.left + r.width * 0.45, y: r.top - rr.top + r.height * 0.55 };
    await A.wm.msgbox({ title: A.T('Beetle Ju セットアップ', 'Beetle Ju Setup'), icon: 'beetle', w: 470, buttons: [A.T('覚えておく', "I'll remember it")], html: A.en
      ? 'The original files could not be found.<br>The disc may no longer exist anywhere.<br><br>But you remember it.<br>Remembering a small, strange thing is one way of keeping it alive.'
      : A.jp(
      '[元|もと|original]のファイルが[見|み|to find]つかりませんでした。<br>ディスクはもう、どこにも[残|のこ|to remain]っていないのかもしれません。<br><br>' +
      'それでも、あなたは[覚|おぼ|to remember]えています。<br>[小|ちい|small]さくて[不思議|ふしぎ|strange; mysterious]なものを[覚|おぼ|to remember]えていることは、それを[生|い|to keep alive]かしておく、ひとつの[方法|ほうほう|way; method]です。') +
      '<small style="font-family:\'EB Garamond\',serif;font-style:italic;font-size:15px">The files are gone. You remember it anyway — and remembering a strange small thing is one way of keeping it alive.</small>' });
    alive = false;
    anim();
    win.close(true);
    ctx.store.set('beetle', true);
    spawnBeetle(A, from);
    ctx.timeout(() => A.desktop.balloon({ title: 'Beetle Ju', icon: 'beetle', html: A.L('Beetle Ju は、このデスクトップに[住|す|to live]むことにしました。', 'Beetle Ju has decided to live on this desktop.') }), 2600);
    A.emit('beetle:alive');
  }, 11800);
  return win;
}

// The beetle that lives here now.
export function spawnBeetle(A, from) {
  const { ctx } = A;
  if (A.beetle) return A.beetle;
  const field = A.field;
  const c = mkCanvas(15, 15);
  c.className = 'ae-beetle';
  field.appendChild(c);
  const W = () => field.clientWidth || ctx.w, H = () => field.clientHeight || ctx.h - 40;
  const s = {
    x: from ? from.x : W() * (0.3 + Math.random() * 0.4),
    y: from ? from.y : H() * (0.3 + Math.random() * 0.4),
    a: Math.random() * 6.28, tx: 0, ty: 0, mode: 'pause', until: 0.8, spin: 0, t: 0,
  };
  const pick = () => {
    const r = Math.random();
    if (r < 0.3 && A.desktop.icons.length) {
      const ic = A.desktop.icons[(Math.random() * A.desktop.icons.length) | 0];
      s.tx = parseFloat(ic.el.style.left) + 46 + (Math.random() - 0.5) * 30;
      s.ty = parseFloat(ic.el.style.top) + 10;
    } else {
      s.tx = 30 + Math.random() * (W() - 60);
      s.ty = 30 + Math.random() * (H() - 60);
    }
    s.mode = 'walk';
  };
  let frame = 0;
  const stop = ctx.loop((t, dt) => {
    s.t += dt;
    if (A.phase !== 'desk') return;
    if (s.mode === 'pause') {
      s.until -= dt;
      if (s.until <= 0) pick();
    } else if (s.mode === 'walk') {
      const dx = s.tx - s.x, dy = s.ty - s.y, d = Math.hypot(dx, dy);
      if (d < 4) { s.mode = 'pause'; s.until = 1 + Math.random() * 4; }
      else {
        const want = Math.atan2(dy, dx);
        let da = want - s.a;
        da = Math.atan2(Math.sin(da), Math.cos(da));
        s.a += clamp(da, -dt * 3.2, dt * 3.2) + Math.sin(s.t * 7) * dt * 0.6;
        const sp = 26;
        s.x += Math.cos(s.a) * sp * dt;
        s.y += Math.sin(s.a) * sp * dt;
        s.x = clamp(s.x, 6, W() - 6);
        s.y = clamp(s.y, 6, H() - 6);
      }
    }
    if (s.spin > 0) s.spin = Math.max(0, s.spin - dt * 2);
    frame = s.mode === 'walk' ? Math.floor(s.t * 8) % 2 : (Math.sin(s.t * 3) > 0.96 ? 1 : 0);
    paint(c, TOP[frame], s.t);
    const rot = s.a + Math.PI / 2 + s.spin * Math.PI * 2;
    c.style.transform = `translate(${s.x - 15}px, ${s.y - 15}px) rotate(${rot}rad)`;
  });
  c.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    api.happy();
  });
  const api = {
    happy() {
      s.spin = 1;
      s.mode = 'pause';
      s.until = 1.5;
      A.sfx.chirp();
      const n = h('div', 'ae-note', '♪');
      n.style.left = s.x + 6 + 'px';
      n.style.top = s.y - 22 + 'px';
      field.appendChild(n);
      setTimeout(() => n.remove(), 1300);
    },
    remove() { stop(); c.remove(); A.beetle = null; },
  };
  A.beetle = api;
  return api;
}
