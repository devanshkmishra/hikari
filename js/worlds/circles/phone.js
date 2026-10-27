// Easter egg (R): you hold up your phone to film the CRT, like the reel you wanted to make.
// Pro video mode, REC, 4K 60. The camera's shutter fights the tube's 59.94 Hz refresh:
// dark scan bands roll through the picture until the shutter matches (1/60, or 1/30).

const SHUTTERS = [30, 50, 60, 100, 120, 250, 500, 1000];
const CRT_HZ = 59.94;

const CSS = `
.cm-phone{position:absolute;inset:0;pointer-events:none;z-index:60;opacity:0;transition:opacity .25s;font-family:"IBM Plex Mono",ui-monospace,monospace;color:#fff}
.cm-phone.on{opacity:1}
.cm-phone canvas{position:absolute;inset:0;width:100%;height:100%}
.cm-phone .scan{position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(0,0,0,.2) 0 1px,transparent 1px 3px)}
.cm-phone .scr{position:absolute;inset:2.2vmin;border-radius:4.2vmin;box-shadow:0 0 0 60vmax #050407, inset 0 0 6vmin rgba(0,0,0,.55)}
.cm-phone .moire{position:absolute;inset:2.2vmin;border-radius:4.2vmin;opacity:.07;background:repeating-linear-gradient(17deg,#fff 0 1px,transparent 1px 4px),repeating-linear-gradient(-14deg,#9cf 0 1px,transparent 1px 5px);mix-blend-mode:overlay}
.cm-phone .top{position:absolute;top:calc(2.2vmin + 14px);left:0;right:0;display:flex;justify-content:center;gap:18px;font-size:13px;letter-spacing:.06em;text-shadow:0 1px 2px #000}
.cm-phone .rec{display:flex;align-items:center;gap:7px;background:rgba(0,0,0,.35);padding:3px 10px;border-radius:12px}
.cm-phone .rec i{width:9px;height:9px;border-radius:50%;background:#ff2d3a;animation:cmBlink 1s steps(2) infinite}
@keyframes cmBlink{50%{opacity:.15}}
.cm-phone .side{position:absolute;right:calc(2.2vmin + 16px);top:50%;transform:translateY(-50%);display:flex;flex-direction:column;gap:6px;align-items:flex-end;font-size:12px;pointer-events:auto}
.cm-phone .side b{font-weight:500;opacity:.55;margin-right:6px}
.cm-phone .side div{background:rgba(0,0,0,.4);padding:4px 9px;border-radius:9px;cursor:default}
.cm-phone .side .s{color:#ffd23f;outline:1px solid rgba(255,210,63,.6);cursor:ns-resize}
.cm-phone .side .s.ok{color:#8fffb0;outline-color:rgba(143,255,176,.7)}
.cm-phone .zoom{position:absolute;bottom:calc(2.2vmin + 84px);left:50%;transform:translateX(-50%);display:flex;gap:8px;font-size:12px}
.cm-phone .zoom span{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:rgba(0,0,0,.45);opacity:.8}
.cm-phone .zoom span.cur{background:rgba(0,0,0,.7);color:#ffd23f;opacity:1;font-weight:500}
.cm-phone .shut{position:absolute;bottom:calc(2.2vmin + 18px);left:50%;transform:translateX(-50%);width:54px;height:54px;border-radius:50%;border:3px solid #fff;display:grid;place-items:center}
.cm-phone .shut i{width:20px;height:20px;border-radius:4px;background:#ff2d3a}
.cm-phone .focus{position:absolute;left:50%;top:50%;width:16vmin;height:16vmin;transform:translate(-50%,-50%);border:1.5px solid rgba(255,210,63,.75);border-radius:6px;transition:transform .3s}
.cm-phone .grid{position:absolute;inset:2.2vmin;border-radius:4.2vmin;background:linear-gradient(90deg,transparent 33.2%,rgba(255,255,255,.12) 33.3%,transparent 33.5%,transparent 66.5%,rgba(255,255,255,.12) 66.6%,transparent 66.8%),linear-gradient(180deg,transparent 33.2%,rgba(255,255,255,.12) 33.3%,transparent 33.5%,transparent 66.5%,rgba(255,255,255,.12) 66.6%,transparent 66.8%)}
.cm-phone .note{position:absolute;left:calc(2.2vmin + 18px);bottom:calc(2.2vmin + 20px);font-size:11.5px;line-height:1.55;opacity:.8;max-width:min(44vw,420px);text-shadow:0 1px 2px #000}
.cm-phone .note .jt{border-bottom:1px dotted rgba(255,255,255,.4)}
@media (max-width:600px){.cm-phone .top{font-size:11px;gap:8px}.cm-phone .note{display:none}.cm-phone .zoom{bottom:calc(2.2vmin + 80px)}}
`;

export class Phone {
  constructor(root, ctx, sfx) {
    this.ctx = ctx; this.sfx = sfx;
    this.on = false;
    this.idx = 1; // AUTO picks 1/50 — the room's lights run on 50 Hz mains
    this.auto = true;
    this.phase = 0;
    this.synced = false;
    const st = document.createElement('style'); st.textContent = CSS; root.appendChild(st);
    const el = document.createElement('div');
    el.className = 'cm-phone';
    el.innerHTML = `
      <canvas></canvas><div class="scan"></div><div class="moire"></div><div class="grid"></div><div class="scr"></div><div class="focus"></div>
      <div class="top"><span class="rec"><i></i><span class="tm">00:00</span></span><span>UHD 4K · 60</span><span>PRO VIDEO</span><span>▮▮▮ 87%</span></div>
      <div class="side"><div><b>ISO</b>400</div><div class="s"><b>S</b><span class="sv">AUTO 1/50</span></div><div><b>EV</b>0.0</div><div><b>WB</b>6500K</div><div><b>MF</b>●</div></div>
      <div class="zoom"><span>.6</span><span class="cur">1×</span><span>3</span><span>5</span><span>10</span></div>
      <div class="shut"><i></i></div>
      <div class="note"></div>`;
    root.appendChild(el);
    this.el = el;
    this.cv = el.querySelector('canvas');
    this.g = this.cv.getContext('2d');
    this.note = el.querySelector('.note');
    this.sv = el.querySelector('.sv');
    this.sBox = el.querySelector('.s');
    this.tm = el.querySelector('.tm');
    this.relang = () => {
      this.note.innerHTML = ctx.isEn && ctx.isEn()
        ? 'S24 Ultra · Pro Video. The bands roll through the picture. Match the shutter to the tube.<br>[ ] / wheel / tap S — shutter · R — stop'
        : ctx.jp.html('S24 Ultra · Pro Video. [縞|しま|stripes; bands]が[流|なが|flow; roll]れる。シャッターをブラウン[管|かん|tube (CRT)]に[合わせて|あわせて|match it to]。') + '<br>[ ] / wheel / tap S — shutter · R — stop';
    };
    this.relang();
    ctx.jp.attach(this.note);
    const sig = ctx.signal;
    this.sBox.addEventListener('pointerdown', (e) => { e.stopPropagation(); this.step(e.button === 2 ? -1 : 1); }, { signal: sig });
    this.sBox.addEventListener('contextmenu', (e) => e.preventDefault(), { signal: sig });
    window.addEventListener('wheel', (e) => {
      if (!this.on) return;
      e.preventDefault(); e.stopPropagation();
      this.step(e.deltaY > 0 ? 1 : -1);
    }, { signal: sig, passive: false, capture: true });
    window.addEventListener('keydown', (e) => {
      if (!this.on || e.repeat) return;
      if (e.code === 'BracketRight') this.step(1);
      else if (e.code === 'BracketLeft') this.step(-1);
    }, { signal: sig });
    this.resize();
  }

  resize() {
    const { w, h } = this.ctx;
    this.cv.width = Math.max(2, Math.round(w / 4));
    this.cv.height = Math.max(2, Math.round(h / 4));
  }

  step(d) {
    this.auto = false;
    this.idx = Math.max(0, Math.min(SHUTTERS.length - 1, this.idx + d));
    this.sfx.uiTick();
    this._label();
  }
  _label() {
    const s = SHUTTERS[this.idx];
    this.sv.textContent = (this.auto ? 'AUTO ' : '') + '1/' + s;
    const ok = this._contrast() < 0.03;
    this.sBox.classList.toggle('ok', ok);
    if (ok && !this.synced) {
      this.synced = true;
      const en = this.ctx.isEn && this.ctx.isEn();
      this.ctx.toast(s === 60 ? (en ? '1/60s — the bands stopped.' : '1/60s — 縞が止まった。') : (en ? '1/30s — the bands are gone, but now the cursor smears.' : '1/30s — 縞は消えた。でもカーソルがブレる。'));
    }
    if (!ok) this.synced = false;
  }
  _contrast() {
    const n = CRT_HZ / SHUTTERS[this.idx];
    if (n < 1) return 1 - n;
    const f = n - Math.floor(n);
    return (2 * Math.min(f, 1 - f)) / n;
  }

  toggle() {
    this.on = !this.on;
    this.el.classList.toggle('on', this.on);
    this.sfx.shutter(this.on);
    if (this.on) {
      this.t0 = performance.now();
      this._label();
      this.stop = this.ctx.loop((t, dt) => this._frame(dt));
    } else if (this.stop) { this.stop(); this.stop = null; }
  }

  _frame(dt) {
    if (document.hidden) return;
    const g = this.g, W = this.cv.width, H = this.cv.height;
    const s = SHUTTERS[this.idx];
    const c = this._contrast();
    const v = ((s - 60) / 60) * 0.35 + (c > 0.03 ? 0.002 : 0);
    this.phase = (this.phase + v * Math.min(dt, 0.1) + 10) % 1;
    g.clearRect(0, 0, W, H);
    const bands = s >= 250 ? 1 : 2;
    const dark = c > 0.03 ? Math.min(0.88, 0.38 + c * 0.7) : c * 6;
    if (dark > 0.005) {
      for (let k = 0; k < bands; k++) {
        const y0 = ((this.phase + k / bands) % 1) * H;
        const bh = H / bands * Math.min(0.9, 0.25 + c * 0.6);
        for (const off of [-H, 0, H]) {
          const yy = y0 + off;
          const grd = g.createLinearGradient(0, yy, 0, yy + bh);
          grd.addColorStop(0, 'rgba(0,0,0,0)');
          grd.addColorStop(0.35, `rgba(0,0,0,${dark})`);
          grd.addColorStop(0.65, `rgba(0,0,0,${dark})`);
          grd.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = grd;
          g.fillRect(0, yy, W, bh);
        }
      }
    }
    if (s === 30) { g.fillStyle = 'rgba(255,255,255,0.03)'; g.fillRect(0, 0, W, H); }
    const sec = Math.floor((performance.now() - this.t0) / 1000);
    const txt = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
    if (this.tm.textContent !== txt) this.tm.textContent = txt;
  }

  destroy() { if (this.stop) this.stop(); }
}
