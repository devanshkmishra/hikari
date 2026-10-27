// The window manager: draggable glossy windows, the taskbar buttons that own them,
// message boxes, context menus and menu bars. Behaviour first; the look is in css.js.
import { h, clamp, esc } from './util.js';
import { iconURL, iconImg } from './icons.js';

export function createWM(A) {
  const { ctx, root } = A;
  const layer = A.winLayer;
  const tasks = A.taskArea;
  const wins = [];
  let z = 10, cascade = 0, active = null;
  const sig = { signal: ctx.signal };
  const area = () => ({ w: layer.clientWidth || ctx.w, h: layer.clientHeight || Math.max(100, ctx.h - 40) });
  const mobile = () => ctx.w < 640;
  const rel = (e) => { const r = root.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };

  function place(w, x, y, ww, hh) {
    const s = w.el.style;
    s.left = Math.round(x) + 'px';
    s.top = Math.round(y) + 'px';
    if (ww != null) s.width = Math.round(ww) + 'px';
    if (hh != null && hh !== 'auto') s.height = Math.round(hh) + 'px';
    w.x = x; w.y = y;
    if (ww != null) w.w = ww;
    if (hh != null && hh !== 'auto') w.h = hh;
  }

  function open(o) {
    if (o.id) {
      const ex = wins.find((w) => w.id === o.id);
      if (ex) { if (ex.min) ex.restore(); ex.focus(); return ex; }
    }
    const el = h('div', 'ae-win' + (o.cls ? ' ' + o.cls : ''));
    const tb = h('div', 'tb');
    tb.innerHTML = (o.icon ? `<img class="ti" src="${iconURL(o.icon, 16)}" alt="" draggable="false">` : '') +
      `<span class="tt"></span><div class="wbs">${o.min !== false ? `<button class="wb wmin" title="${A.T('最小化', 'Minimize')}"></button>` : ''}${o.max !== false ? `<button class="wb wmax" title="${A.T('最大化', 'Maximize')}"></button>` : ''}<button class="wb wcls" title="${A.T('閉じる', 'Close')}"></button></div>`;
    const bd = h('div', 'bd');
    el.append(tb, bd);
    const resizable = o.resizable !== false && o.max !== false;
    if (resizable) el.appendChild(h('div', 'rg'));
    const w = { id: o.id, el, tb, body: bd, opts: o, min: false, max: false, closed: false, prev: null, task: null, x: 0, y: 0, w: 0, h: 0 };
    tb.querySelector('.tt').textContent = o.title || '';

    const ar = area();
    let ww = Math.min(o.w || 480, ar.w - 8);
    let hh = o.h === 'auto' ? 'auto' : Math.min(o.h || 360, ar.h - 8);
    let x, y;
    if (mobile() && !o.small) {
      ww = ar.w - 8; x = 4; y = 54 + (cascade % 4) * 12;
      if (hh !== 'auto') hh = Math.min(hh, ar.h - y - 4);
    } else if (o.center) {
      x = (ar.w - ww) / 2; y = Math.max(4, (ar.h - (hh === 'auto' ? 200 : hh)) / 2 - 20);
    } else {
      x = (o.x != null ? o.x : 60 + (cascade % 7) * 28);
      y = (o.y != null ? o.y : 24 + (cascade % 7) * 26);
      if (x + ww > ar.w - 4) x = Math.max(4, ar.w - ww - 4);
      if (hh !== 'auto' && y + hh > ar.h - 4) y = Math.max(4, ar.h - hh - 4);
    }
    cascade++;
    place(w, x, y, ww, hh);
    layer.appendChild(el);
    if (hh === 'auto' && o.center) {
      const r = el.getBoundingClientRect();
      place(w, (ar.w - r.width) / 2, Math.max(4, (ar.h - r.height) / 2 - 20));
    }
    wins.push(w);

    if (o.taskbar !== false) {
      const tbtn = h('button', 'ae-task', `${o.icon ? `<img src="${iconURL(o.icon, 16)}" alt="">` : ''}<span></span>`);
      tbtn.querySelector('span').textContent = o.title || '';
      tbtn.title = o.title || '';
      tbtn.addEventListener('click', () => {
        A.sfx.click();
        if (w.min) { w.restore(); w.focus(); }
        else if (active === w) w.minimize();
        else w.focus();
      }, sig);
      tasks.appendChild(tbtn);
      w.task = tbtn;
    }

    el.addEventListener('pointerdown', () => w.focus(), { capture: true, signal: ctx.signal });

    // drag by title bar
    tb.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.wb') || e.button > 0) return;
      e.preventDefault();
      const p0 = rel(e);
      const sx = w.x, sy = w.y;
      let moved = false;
      tb.setPointerCapture(e.pointerId);
      const mv = (ev) => {
        const p = rel(ev);
        const dx = p.x - p0.x, dy = p.y - p0.y;
        if (!moved && Math.hypot(dx, dy) < 3) return;
        if (!moved && w.max) {
          // pull a maximised window back down under the pointer
          const fr = (p0.x) / Math.max(1, area().w);
          w.toggleMax(true);
          const nx = p.x - w.w * fr;
          place(w, nx, Math.max(0, p.y - 14));
          moved = true;
          return;
        }
        moved = true;
        const ar2 = area();
        place(w, clamp(sx + dx, -w.w + 80, ar2.w - 60), clamp(sy + dy, 0, ar2.h - 28));
      };
      const up = () => { tb.removeEventListener('pointermove', mv); tb.removeEventListener('pointerup', up); tb.removeEventListener('pointercancel', up); };
      tb.addEventListener('pointermove', mv);
      tb.addEventListener('pointerup', up);
      tb.addEventListener('pointercancel', up);
    }, sig);
    tb.addEventListener('dblclick', (e) => { if (!e.target.closest('.wb') && o.max !== false) w.toggleMax(); }, sig);
    const wbs = tb.querySelector('.wbs');
    wbs.addEventListener('click', (e) => {
      const b = e.target.closest('.wb');
      if (!b) return;
      if (b.classList.contains('wmin')) w.minimize();
      else if (b.classList.contains('wmax')) w.toggleMax();
      else if (b.classList.contains('wcls')) w.close();
    }, sig);

    if (resizable) {
      const rg = el.querySelector('.rg');
      rg.addEventListener('pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation();
        rg.setPointerCapture(e.pointerId);
        const p0 = rel(e), sw = w.w, sh = w.h;
        const mv = (ev) => {
          const p = rel(ev);
          const ar2 = area();
          place(w, w.x, w.y, clamp(sw + p.x - p0.x, o.minW || 240, ar2.w - w.x), clamp(sh + p.y - p0.y, o.minH || 140, ar2.h - w.y));
          o.onResize && o.onResize(w);
        };
        const up = () => { rg.removeEventListener('pointermove', mv); rg.removeEventListener('pointerup', up); };
        rg.addEventListener('pointermove', mv);
        rg.addEventListener('pointerup', up);
      }, sig);
    }

    w.setTitle = (t) => {
      tb.querySelector('.tt').textContent = t;
      if (w.task) { w.task.querySelector('span').textContent = t; w.task.title = t; }
    };
    w.focus = () => {
      if (w.closed) return;
      if (active === w && el.classList.contains('act')) return;
      z += 1;
      el.style.zIndex = z;
      wins.forEach((x) => { x.el.classList.toggle('act', x === w); x.task && x.task.classList.toggle('on', x === w); });
      active = w;
      if (w.task) w.task.classList.remove('flash');
      o.onFocus && o.onFocus(w);
    };
    w.minimize = () => {
      if (w.min || o.min === false) return;
      w.min = true;
      A.sfx.whoosh(false);
      const tr = w.task ? w.task.getBoundingClientRect() : null;
      const er = el.getBoundingClientRect();
      const done = () => { if (w.min) el.style.display = 'none'; };
      if (tr && !ctx.reduced) {
        const dx = tr.left + tr.width / 2 - (er.left + er.width / 2);
        const dy = tr.top + tr.height / 2 - (er.top + er.height / 2);
        el.animate([{ transform: 'none', opacity: 1 }, { transform: `translate(${dx}px,${dy}px) scale(.12)`, opacity: 0 }], { duration: 190, easing: 'cubic-bezier(.4,0,.8,.6)' }).finished.then(done, done);
      } else done();
      if (active === w) { active = null; el.classList.remove('act'); if (w.task) w.task.classList.remove('on'); focusTop(w); }
      o.onMinimize && o.onMinimize(w, true);
    };
    w.restore = () => {
      if (!w.min) return;
      w.min = false;
      el.style.display = '';
      A.sfx.whoosh(true);
      const tr = w.task ? w.task.getBoundingClientRect() : null;
      const er = el.getBoundingClientRect();
      if (tr && !ctx.reduced) {
        const dx = tr.left + tr.width / 2 - (er.left + er.width / 2);
        const dy = tr.top + tr.height / 2 - (er.top + er.height / 2);
        el.animate([{ transform: `translate(${dx}px,${dy}px) scale(.12)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 200, easing: 'cubic-bezier(.2,.6,.3,1)' });
      }
      o.onMinimize && o.onMinimize(w, false);
    };
    w.toggleMax = (quiet) => {
      if (o.max === false) return;
      const ar2 = area();
      if (!w.max) {
        w.prev = [w.x, w.y, w.w, w.h];
        w.max = true;
        el.classList.add('max');
        place(w, 0, 0, ar2.w, ar2.h);
      } else {
        w.max = false;
        el.classList.remove('max');
        const [px, py, pw, ph] = w.prev || [40, 30, 480, 360];
        place(w, px, py, Math.min(pw, ar2.w), Math.min(ph, ar2.h));
      }
      if (!quiet) A.sfx.whoosh(w.max);
      o.onResize && o.onResize(w);
      A.onWindowsChanged && A.onWindowsChanged();
    };
    w.close = (force) => {
      if (w.closed) return;
      if (!force && o.onClose && o.onClose(w) === false) return;
      w.closed = true;
      const i = wins.indexOf(w);
      if (i >= 0) wins.splice(i, 1);
      if (w.task) w.task.remove();
      el.classList.add('closing');
      setTimeout(() => el.remove(), 150);
      if (active === w) { active = null; focusTop(); }
      o.onClosed && o.onClosed(w);
      A.onWindowsChanged && A.onWindowsChanged();
    };
    w.shake = () => { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); setTimeout(() => el.classList.remove('shake'), 520); };
    w.flash = () => { if (w.task && active !== w) w.task.classList.add('flash'); };
    w.fit = () => {
      const ar2 = area();
      if (w.max) { place(w, 0, 0, ar2.w, ar2.h); return; }
      const nw = Math.min(w.w, ar2.w - 4);
      const nh = typeof w.h === 'number' ? Math.min(w.h, ar2.h - 4) : null;
      place(w, clamp(w.x, mobile() ? 2 : -nw + 80, Math.max(2, ar2.w - 60)), clamp(w.y, 0, Math.max(0, ar2.h - 30)), nw, nh);
    };

    if (o.menu) menubar(w, o.menu);
    if (o.body) { if (typeof o.body === 'string') bd.insertAdjacentHTML('beforeend', o.body); else bd.appendChild(o.body); }
    if (o.maximized || (mobile() && o.maxOnPhone)) w.toggleMax(true);
    w.focus();
    A.onWindowsChanged && A.onWindowsChanged();
    return w;
  }

  function focusTop(except) {
    const vis = wins.filter((x) => !x.min && x !== except);
    if (!vis.length) return;
    vis.sort((a, b) => (+b.el.style.zIndex || 0) - (+a.el.style.zIndex || 0));
    vis[0].focus();
  }

  function msgbox({ title = 'HIKARI Aqua', icon = 'info', html = '', buttons = ['OK'], w = 420, def = 0, sound = true } = {}) {
    return new Promise((res) => {
      let done = false;
      const fin = (i) => { if (!done) { done = true; res(i); } };
      const win = open({ title, cls: 'ae-msg', w, h: 'auto', min: false, max: false, taskbar: false, center: true, small: true, onClosed: () => fin(-1) });
      win.body.innerHTML = `<div class="mrow">${icon ? iconImg(icon, 36) : ''}<div class="mtx">${html}</div></div><div class="mbtns">${buttons.map((b, i) => `<button class="ae-btn${i === def ? ' def' : ''}" data-i="${i}">${esc(b)}</button>`).join('')}</div>`;
      const ar = area();
      const r = win.el.getBoundingClientRect();
      place(win, Math.max(4, (ar.w - r.width) / 2), Math.max(4, (ar.h - r.height) / 2 - 16));
      win.body.querySelector('.mbtns').addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        A.sfx.click();
        fin(+b.dataset.i);
        win.close(true);
      });
      win.el.addEventListener('keydown', (e) => { if (e.key === 'Enter') { fin(def); win.close(true); } });
      const btn = win.body.querySelector('.ae-btn.def');
      if (btn && !mobile()) btn.focus({ preventScroll: true });
      if (sound) {
        if (icon === 'error' || icon === 'warn') A.sfx.error();
        else if (icon === 'question') A.sfx.question();
        else A.sfx.ding();
      }
      win.box = true;
    });
  }

  // ── context menus ──
  let openMenus = [];
  function closeMenus(from = 0) {
    openMenus.slice(from).forEach((m) => m.remove());
    openMenus = openMenus.slice(0, from);
    if (!openMenus.length && A.onMenusClosed) A.onMenusClosed();
  }
  function buildMenu(items, level) {
    const m = h('div', 'ae-cm');
    items.forEach((it) => {
      if (it.sep) { m.appendChild(h('div', 'sep')); return; }
      const d = h('div', 'it' + (it.b ? ' b' : '') + (it.dis ? ' dis' : '') + (it.chk ? ' chk' : '') + (it.sub ? ' sub' : ''));
      d.innerHTML = (it.icon ? `<img src="${iconURL(it.icon, 16)}" width="16" height="16" alt="">` : '') + (it.html || esc(it.label));
      d.addEventListener('pointerenter', () => {
        closeMenus(level + 1);
        m.querySelectorAll('.it.on').forEach((x) => x.classList.remove('on'));
        if (it.sub && !it.dis) {
          d.classList.add('on');
          const r = d.getBoundingClientRect(), rr = root.getBoundingClientRect();
          showMenu(r.right - rr.left - 3, r.top - rr.top - 3, it.sub, level + 1, r.left - rr.left);
        }
      });
      d.addEventListener('click', (e) => {
        e.stopPropagation();
        if (it.dis) return;
        if (it.sub) {
          if (!d.classList.contains('on')) d.dispatchEvent(new Event('pointerenter'));
          return;
        }
        A.sfx.menu();
        closeMenus(0);
        it.cb && it.cb();
      });
      m.appendChild(d);
    });
    return m;
  }
  function showMenu(x, y, items, level = 0, altX = null) {
    const m = buildMenu(items, level);
    m.style.left = '0px'; m.style.top = '0px';
    root.appendChild(m);
    const W = root.clientWidth, H = root.clientHeight;
    const mw = m.offsetWidth, mh = m.offsetHeight;
    let px = x, py = y;
    if (px + mw > W - 2) px = altX != null ? Math.max(2, altX - mw + 3) : Math.max(2, W - mw - 2);
    if (py + mh > H - 2) py = Math.max(2, H - mh - 2);
    m.style.left = px + 'px'; m.style.top = py + 'px';
    openMenus.push(m);
    return m;
  }
  function menu(x, y, items) {
    closeMenus(0);
    A.sfx.menu();
    return showMenu(x, y, items, 0);
  }
  root.addEventListener('pointerdown', (e) => {
    if (openMenus.length && !e.target.closest('.ae-cm') && !e.target.closest('.ae-mb span')) closeMenus(0);
  }, { capture: true, signal: ctx.signal });

  function menubar(w, spec) {
    const mb = h('div', 'ae-mb');
    spec.forEach((s) => {
      const sp = h('span');
      sp.textContent = s.label;
      const show = () => {
        mb.querySelectorAll('span.on').forEach((x) => x.classList.remove('on'));
        sp.classList.add('on');
        const r = sp.getBoundingClientRect(), rr = root.getBoundingClientRect();
        const items = typeof s.items === 'function' ? s.items() : s.items;
        menu(r.left - rr.left, r.bottom - rr.top, items);
        A.onMenusClosed = () => { sp.classList.remove('on'); A.onMenusClosed = null; };
      };
      sp.addEventListener('click', (e) => {
        e.stopPropagation();
        if (sp.classList.contains('on') && openMenus.length) { closeMenus(0); return; }
        show();
      });
      sp.addEventListener('pointerenter', () => { if (openMenus.length && mb.querySelector('span.on') && !sp.classList.contains('on')) show(); });
      mb.appendChild(sp);
    });
    w.body.prepend(mb);
    return mb;
  }

  // language switch: windows that know how to rebuild themselves are reopened in place
  function relabelAll() {
    closeMenus(0);
    [...wins].forEach((w) => {
      if (w.closed) return;
      if (w.relabel) { w.relabel(); return; }
      if (!w.reopenFn || w.dirty || w.box) return;
      const geo = { x: w.x, y: w.y, w: w.w, h: w.h, max: w.max, min: w.min, z: +w.el.style.zIndex || 0, act: active === w };
      w.el.remove();
      w.close(true);
      const n = w.reopenFn();
      if (!n || n === w) return;
      if (!n.reopenFn) n.reopenFn = w.reopenFn;
      if (n.max) n.toggleMax(true);
      place(n, geo.x, geo.y, geo.w, geo.h);
      if (geo.max) n.toggleMax(true);
      n.el.style.zIndex = geo.z;
      if (geo.min) { n.min = true; n.el.style.display = 'none'; n.el.classList.remove('act'); if (n.task) n.task.classList.remove('on'); }
      else if (!geo.act) { n.el.classList.remove('act'); if (n.task) n.task.classList.remove('on'); }
    });
    const top = wins.filter((x) => !x.min).sort((a, b) => (+b.el.style.zIndex || 0) - (+a.el.style.zIndex || 0))[0];
    if (top) { active = null; top.focus(); }
  }

  return {
    relabelAll,
    open, msgbox, menu, closeMenus, menubar,
    get list() { return wins; },
    get active() { return active; },
    find: (id) => wins.find((w) => w.id === id),
    closeAll() { [...wins].forEach((w) => w.close(true)); },
    fitAll() { wins.forEach((w) => w.fit()); },
    anyMaximized: () => wins.some((w) => w.max && !w.min),
    rel,
  };
}
