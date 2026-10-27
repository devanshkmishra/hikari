// 夏ヶ原 — the station notebook (駅ノート). Strangers across forty years, each in their own hand;
// the last page is blank and dated today. Pages turn like paper; the blank one takes a pen.

import { PAGES, WRITE, todayJP, EN_PAGES, WRITE_EN, todayEN, dateFromTs } from './text.js';
import { rng } from './geom.js';

const INK_NOJITTER = new Set(['robot']);

export function createNotebook(root, ctx, sound, hooks = {}) {
  const el = document.createElement('div');
  el.className = 'st-nb';
  el.innerHTML = `
    <div class="st-nb-shade"></div>
    <div class="st-nb-stage">
      <div class="st-nb-book">
        <div class="st-nb-spread">
          <div class="st-nb-slot st-nb-L"></div>
          <div class="st-nb-slot st-nb-R"></div>
          <div class="st-nb-gutter"></div>
        </div>
        <div class="st-nb-cover">
          <div class="st-nb-face front"></div>
          <div class="st-nb-face back"></div>
        </div>
      </div>
    </div>
    <div class="st-nb-bar">
      <button type="button" class="nb-prev" aria-label="前のページ">‹</button>
      <span class="nb-pg"></span>
      <button type="button" class="nb-next" aria-label="次のページ">›</button>
      <button type="button" class="nb-last" title="最後のページへ">最後のページ</button>
      <button type="button" class="nb-en" title="English">EN</button>
      <button type="button" class="nb-close"></button>
    </div>`;
  root.appendChild(el);
  const book = el.querySelector('.st-nb-book');
  const spreadEl = el.querySelector('.st-nb-spread');
  const slotL = el.querySelector('.st-nb-L');
  const slotR = el.querySelector('.st-nb-R');
  const cover = el.querySelector('.st-nb-cover');
  const pgEl = el.querySelector('.nb-pg');
  const closeBtn = el.querySelector('.nb-close');
  const enBtn = el.querySelector('.nb-en');

  let isOpen = false, busy = false, single = false;
  let pages = [];
  let k = 0;                 // spread index (or page index in single mode)
  let draft = String(ctx.store.get('draft', '') || '');
  let writeEl = null, ta = null;
  let wroteThisTime = false;
  let sawWrite = false;
  let opened = 0;
  const isEN = () => !!(hooks.lang && hooks.lang() === 'en');
  const today = () => (isEN() ? todayEN() : todayJP());
  const LAT = /[!-~\u00A0-\u024F\u2018-\u201F\u2014\u2026°]/;

  // ── handwriting ──────────────────────────────────────────
  function hand(container, seed, ink) {
    const R = rng(seed);
    const amp = ink === 'crayon' ? 2.4 : ink === 'brush' ? 0.7 : ink === 'pencil-2b' ? 1.4 : ink === 'pencil' ? 0.9 : ink === 'fine' ? 0.45 : 0.8;
    const walk = (node) => {
      for (const ch of [...node.childNodes]) {
        if (ch.nodeType === 3) {
          const frag = document.createDocumentFragment();
          let word = null;
          for (const s of Array.from(ch.textContent)) {
            if (s === ' ' || s === '\n') { word = null; frag.appendChild(document.createTextNode(s)); continue; }
            if (LAT.test(s)) { if (!word) { word = document.createElement('span'); word.className = 'w'; frag.appendChild(word); } }
            else word = null;
            const sp = document.createElement('span');
            sp.className = 'h';
            sp.textContent = s;
            if (!INK_NOJITTER.has(ink)) {
              const r = (R() - 0.5) * 5 * amp, y = (R() - 0.5) * 1.6 * amp, sc = 1 + (R() - 0.5) * 0.09 * amp, o = 0.82 + R() * 0.18;
              sp.style.cssText = `--r:${r.toFixed(2)}deg;--y:${y.toFixed(2)}px;--s:${sc.toFixed(3)};--o:${o.toFixed(2)}`;
            }
            (word || frag).appendChild(sp);
          }
          ch.replaceWith(frag);
        } else if (ch.nodeType === 1 && !ch.classList.contains('nohand')) walk(ch);
      }
    };
    walk(container);
  }
  const html = (s) => ctx.jp.html(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function head(date, inkCls) {
    return `<div class="pg-head"><span class="pg-no">No.</span><span class="pg-date">Date</span><span class="pg-dv ink ${inkCls}">${date || ''}</span></div>`;
  }

  // ── pages ────────────────────────────────────────────────
  function buildPage(p0, live) {
    let p = p0;
    if (isEN() && p0.en2) {
      const e = p0.en2;
      p = { ...p0, ...e, vertical: false, isEN: true };
      for (const k of ['ps', 'reply', 'note']) if (e[k]) p[k] = { ...p0[k], ...e[k] };
    }
    const pg = document.createElement('div');
    pg.className = `pg ${p.paper || 'p-newer'} kind-${p.kind}${isEN() ? ' is-en' : ''}`;
    const seed = (p.year || 7) * 13 + (p.kind.length * 7);
    if (p.kind === 'blank') { pg.innerHTML = head('', ''); return pg; }
    if (p.kind === 'intro') {
      pg.classList.add('inside-cover');
      pg.innerHTML = `<div class="taped"><i class="tape a"></i><i class="tape b"></i><div class="ink ink-marker body">${p.body.map((l) => `<div class="ln">${l ? html(l) : '&nbsp;'}</div>`).join('')}</div></div><div class="pg-en">${esc(p.en)}</div>`;
      hand(pg.querySelector('.body'), seed, 'marker');
      return pg;
    }
    if (p.kind === 'drawing') {
      pg.innerHTML = head(`<span class="ink ink-pencil-neat">${p.note.date}</span>`, '') + `
        <div class="kid">${kidDrawing()}
          <div class="ink ink-crayon kid-t1">${p.child[0]}</div>
          <div class="ink ink-crayon kid-t2">${p.child[1]}</div>
          <div class="ink ink-crayon kid-sign">${p.childSign.replace(/\[(.)\]/, '<span class="mir nohand">$1</span>')}</div>
        </div>
        <div class="ink ink-pencil-neat note">${p.note.body.map((l) => `<div class="ln">${html(l)}</div>`).join('')}</div>
        <div class="pg-en">${esc(p.en)}</div>`;
      pg.querySelectorAll('.ink-crayon').forEach((n, i) => hand(n, seed + i, 'crayon'));
      hand(pg.querySelector('.note'), seed + 9, 'pencil');
      return pg;
    }
    if (p.kind === 'entry') {
      const inkCls = `ink-${p.ink}`;
      const date = p.date.replace('<smudge>', '<span class="smudge nohand">61</span>');
      let body = `<div class="ink ${inkCls} body${p.vertical ? ' vert' : ''}">${p.vertical ? `<div class="ln vdate">${html(p.date)}</div>` : ''}${p.body.map((l) => `<div class="ln">${html(l)}</div>`).join('')}${p.sign ? `<div class="ln sign">${p.sign}</div>` : ''}</div>`;
      if (p.ps) body += `<div class="ink ink-${p.ps.ink} ps"><div class="ln">${html(p.ps.date)}</div>${p.ps.body.map((l) => `<div class="ln">${html(l)}</div>`).join('')}</div>`;
      if (p.reply) body += `<div class="ink ink-${p.reply.ink} reply">${p.reply.body.map((l) => `<div class="ln">${html(l)}</div>`).join('')}</div>`;
      if (p.doodle === 'crow') body += crowDoodle();
      pg.innerHTML = (p.vertical ? head('', '') : head(date, inkCls)) + body + `<div class="pg-en">${esc(p.en)}</div>`;
      if (p.stain) pg.classList.add('stain-' + p.stain);
      pg.querySelectorAll('.ink').forEach((n, i) => {
        const ink = [...n.classList].find((c) => c.startsWith('ink-'))?.slice(4) || 'gel';
        hand(n, seed + i * 31, ink);
      });
      return pg;
    }
    if (p.kind === 'mine') {
      pg.innerHTML = head(esc(dateFromTs(p.ts, isEN()) || p.date), 'ink-mine') + `<div class="ink ink-mine body">${esc(p.text).split('\n').map((l) => `<div class="ln">${l || '&nbsp;'}</div>`).join('')}</div>`;
      hand(pg.querySelector('.body'), (p.ts || 1) % 9973, 'mine');
      return pg;
    }
    if (p.kind === 'write') {
      if (live) return writePage();
      // a still image of the write page, for the turning leaf
      pg.className = 'pg p-today kind-write';
      pg.innerHTML = head(esc(today()), 'ink-mine') + `<div class="ink ink-mine body">${esc(draft).split('\n').map((l) => `<div class="ln">${l || '&nbsp;'}</div>`).join('')}</div>`;
      return pg;
    }
    return pg;
  }

  function writePage() {
    if (writeEl) return writeEl;
    writeEl = document.createElement('div');
    writeEl.className = 'pg p-today kind-write';
    writeEl.innerHTML = head(esc(today()), 'ink-mine') + `
      <textarea class="ink ink-mine write" spellcheck="false" maxlength="800" rows="12" aria-label="your entry" placeholder="${isEN() ? WRITE_EN.placeholder : WRITE.placeholder}"></textarea>
      <div class="pen" aria-hidden="true"><i></i></div>
      <div class="pg-en">${esc(WRITE.en)}</div>`;
    ta = writeEl.querySelector('textarea');
    ta.value = draft;
    let saveT = 0;
    ta.addEventListener('input', () => {
      draft = ta.value;
      clearTimeout(saveT);
      saveT = setTimeout(() => ctx.store.set('draft', draft), 400);
      syncClose();
    }, { signal: ctx.signal });
    ta.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (!e.isComposing && e.key.length === 1 && Math.random() < 0.85) sound.ui.pen();
      if (e.key === 'Escape') { e.preventDefault(); close(); }
    }, { signal: ctx.signal });
    ta.addEventListener('compositionend', () => sound.ui.pen(), { signal: ctx.signal });
    ta.addEventListener('pointerdown', (e) => e.stopPropagation(), { signal: ctx.signal });
    return writeEl;
  }

  function kidDrawing() {
    // crayon: a wobble filter plus a speckle mask so it looks rubbed onto paper
    return `<svg class="kid-svg" viewBox="0 0 400 260" aria-hidden="true">
      <defs>
        <filter id="st-crayon" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="4" result="w"/>
          <feDisplacementMap in="SourceGraphic" in2="w" scale="5" result="d"/>
          <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="1" seed="8" result="g"/>
          <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 1.6" result="m"/>
          <feComposite in="d" in2="m" operator="in"/>
        </filter>
      </defs>
      <g filter="url(#st-crayon)" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <g stroke="#e8a23a" stroke-width="6"><circle cx="345" cy="48" r="22" fill="#f3c04e"/>
          <path d="M345 12v-8M372 22l7-6M383 48h9M372 74l7 6M318 22l-7-6M307 48h-9"/></g>
        <path d="M30 168 C 30 120, 46 104, 80 102 L 300 100 C 316 100, 322 110, 322 124 L 324 170 Z" fill="#efe2c0" stroke="#d6553d" stroke-width="5"/>
        <path d="M32 148 L 323 146 L 324 172 L 30 172 Z" fill="#d6553d" stroke="#c0432f" stroke-width="4"/>
        <g fill="#7db3d6" stroke="#3b6ea0" stroke-width="4">
          <rect x="50" y="114" width="34" height="26" rx="4"/><rect x="104" y="112" width="40" height="28" rx="3"/><rect x="160" y="112" width="40" height="28" rx="3"/><rect x="216" y="112" width="40" height="28" rx="3"/><rect x="272" y="112" width="34" height="28" rx="3"/>
        </g>
        <g fill="#3a3a3e" stroke="#2b2b2e" stroke-width="4"><circle cx="78" cy="184" r="15"/><circle cx="118" cy="184" r="15"/><circle cx="238" cy="184" r="15"/><circle cx="278" cy="184" r="15"/></g>
        <g stroke="#fff6a8" stroke-width="5"><circle cx="40" cy="138" r="6" fill="#fff6a8"/></g>
        <path d="M10 205 H 390 M10 220 H 390" stroke="#6b5640" stroke-width="5"/>
        <path d="M30 200 v 26 M70 200 v 26 M110 200 v 26 M150 200 v 26 M190 200 v 26 M230 200 v 26 M270 200 v 26 M310 200 v 26 M350 200 v 26" stroke="#8c6e50" stroke-width="5"/>
        <path d="M14 245 q 6 -14 12 0 q 6 -16 12 0 q 6 -12 12 0 M300 246 q 6 -14 12 0 q 6 -16 12 0 q 6 -12 12 0 q 6 -14 12 0" stroke="#5ea04a" stroke-width="5"/>
        <path d="M150 70 q 10 -18 22 -6 q 12 -22 26 -2 q 10 -6 14 8" stroke="#bdbdbd" stroke-width="5"/>
      </g>
    </svg>`;
  }
  function crowDoodle() {
    return `<svg class="crow" viewBox="0 0 60 40" aria-hidden="true"><g fill="#18181b" stroke="#18181b" stroke-width="1.2" stroke-linejoin="round">
      <path d="M8 24 C 14 14, 28 12, 38 16 C 44 12, 50 12, 54 15 L 49 17 C 47 22, 42 25, 36 26 L 30 34 L 28 27 C 20 28, 13 27, 8 24 Z"/>
      <path d="M22 18 C 26 8, 34 4, 40 6 C 34 10, 30 14, 30 18 Z"/></g>
      <circle cx="50" cy="15" r="0.9" fill="#f3efe4"/></svg>`;
  }

  // ── book mechanics ───────────────────────────────────────
  function pageList() {
    const mine = (ctx.store.get('entries', []) || []).filter((e) => e && e.t).map((e) => ({ kind: 'mine', date: e.d, text: e.t, ts: e.ts, paper: 'p-today' }));
    const list = [...PAGES.map((p, i) => ({ ...p, en2: EN_PAGES[i] })), ...mine, { kind: 'write' }];
    return list;
  }
  const spreadCount = () => Math.ceil(pages.length / 2);
  const P = (i) => pages[i] || { kind: 'blank', paper: 'p-today' };

  function fill(slot, idx) {
    slot.innerHTML = '';
    const p = P(idx);
    slot.appendChild(buildPage(p, p.kind === 'write'));
    if (p.kind === 'write') onWriteShown();
  }
  function render() {
    if (single) { fill(slotR, k); slotL.innerHTML = ''; }
    else { fill(slotL, 2 * k); fill(slotR, 2 * k + 1); }
    const total = single ? pages.length : spreadCount();
    pgEl.textContent = `${k + 1} / ${total}`;
    el.querySelector('.nb-prev').disabled = k === 0;
    el.querySelector('.nb-next').disabled = k >= total - 1;
    el.querySelector('.nb-last').disabled = k >= total - 1;
  }
  function onWriteShown() {
    if (!sawWrite) { sawWrite = true; if (hooks.onWrite) hooks.onWrite(); }
    syncClose();
    if (!('ontouchstart' in window) && ta) setTimeout(() => { if (isOpen && document.activeElement !== ta && ta.isConnected) ta.focus({ preventScroll: true }); }, 450);
  }
  function syncClose() {
    const has = !!(ta && ta.value.trim());
    const W2 = isEN() ? WRITE_EN : WRITE;
    closeBtn.textContent = has ? W2.done : W2.close;
    closeBtn.classList.toggle('done', has);
  }

  function leaf(side) {
    const lf = document.createElement('div');
    lf.className = `st-nb-leaf ${side}`;
    lf.innerHTML = '<div class="st-nb-face front"></div><div class="st-nb-face back"></div><div class="shine"></div>';
    spreadEl.appendChild(lf);
    return lf;
  }
  function turn(dir) {
    if (busy || !isOpen) return;
    const total = single ? pages.length : spreadCount();
    if (dir > 0 && k >= total - 1) return;
    if (dir < 0 && k <= 0) return;
    busy = true;
    sound.ui.pageTurn();
    const dur = ctx.reduced ? 1 : 820;
    if (single) {
      const lf = leaf('single');
      if (dir > 0) {
        lf.querySelector('.front').appendChild(buildPage(P(k), false));
        k += 1; fill(slotR, k);
        lf.animate([{ transform: 'rotateY(0deg)', opacity: 1 }, { transform: 'rotateY(-100deg)', opacity: 0.0 }], { duration: dur * 0.8, easing: 'cubic-bezier(.45,.05,.4,1)', fill: 'forwards' }).finished.then(done);
      } else {
        lf.querySelector('.front').appendChild(buildPage(P(k - 1), false));
        lf.animate([{ transform: 'rotateY(-100deg)', opacity: 0 }, { transform: 'rotateY(0deg)', opacity: 1 }], { duration: dur * 0.8, easing: 'cubic-bezier(.45,.05,.4,1)', fill: 'forwards' }).finished.then(() => { k -= 1; fill(slotR, k); done(); });
      }
      function done() { lf.remove(); busy = false; render(); }
      return;
    }
    if (dir > 0) {
      const lf = leaf('right');
      lf.querySelector('.front').appendChild(buildPage(P(2 * k + 1), false));
      lf.querySelector('.back').appendChild(buildPage(P(2 * k + 2), false));
      fill(slotR, 2 * k + 3);
      const sh = lf.querySelector('.shine');
      sh.animate([{ opacity: 0 }, { opacity: 0.5, offset: 0.5 }, { opacity: 0 }], { duration: dur });
      lf.animate([{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(-180deg)' }], { duration: dur, easing: 'cubic-bezier(.42,.02,.36,1)', fill: 'forwards' }).finished.then(() => {
        k += 1; lf.remove(); busy = false; render();
      });
    } else {
      const lf = leaf('left');
      lf.querySelector('.front').appendChild(buildPage(P(2 * k), false));
      lf.querySelector('.back').appendChild(buildPage(P(2 * k - 1), false));
      fill(slotL, 2 * k - 2);
      lf.animate([{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(180deg)' }], { duration: dur, easing: 'cubic-bezier(.42,.02,.36,1)', fill: 'forwards' }).finished.then(() => {
        k -= 1; lf.remove(); busy = false; render();
      });
    }
  }
  function toLast() {
    if (busy) return;
    const total = single ? pages.length : spreadCount();
    if (k >= total - 2) { turn(1); return; }
    sound.ui.pageTurn();
    setTimeout(() => sound.ui.pageTurn(), 120);
    k = total - 1;
    spreadEl.animate([{ opacity: 0.4, filter: 'blur(1px)' }, { opacity: 1, filter: 'blur(0)' }], { duration: 380 });
    render();
  }

  function layoutMode() {
    const w = ctx.w, h = ctx.h;
    single = w < 760 || w / h < 0.95;
    el.classList.toggle('single', single);
  }

  // ── open / close ─────────────────────────────────────────
  function open(from) {
    if (isOpen) return;
    isOpen = true; busy = true; opened++;
    wroteThisTime = false;
    pages = pageList();
    layoutMode();
    k = 0;
    el.classList.add('on');
    el.classList.remove('opened');
    cover.style.transform = '';
    cover.style.visibility = '';
    cover.getAnimations().forEach((a) => a.cancel());
    coverFace();
    render();
    syncClose();
    enBtn.classList.toggle('on', !!hooks.getEN?.());
    el.classList.toggle('en-on', !!hooks.getEN?.());
    sound.ui.bookOpen();
    // lift it from the bench
    const r = book.getBoundingClientRect();
    if (from && r.width) {
      const dx = from.x - (r.left + r.width / 2), dy = from.y - (r.top + r.height / 2);
      book.animate([
        { transform: `translate(${dx}px, ${dy}px) scale(0.06) rotate(-4deg)`, opacity: 0 },
        { opacity: 1, offset: 0.35 },
        { transform: 'translate(0,0) scale(1) rotate(0deg)', opacity: 1 },
      ], { duration: ctx.reduced ? 1 : 900, easing: 'cubic-bezier(.2,.75,.2,1)' });
    }
    setTimeout(() => {
      if (!isOpen) return;
      sound.ui.pageTurn();
      el.classList.add('opened');
      cover.animate([{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(-180deg)' }], { duration: ctx.reduced ? 1 : 1000, easing: 'cubic-bezier(.45,.05,.3,1)', fill: 'forwards' }).finished.then(() => { busy = false; cover.style.visibility = 'hidden'; });
    }, ctx.reduced ? 10 : 1100);
  }
  function coverFace() {
    cover.querySelector('.front').innerHTML = `
      <div class="cv">
        <div class="cv-label"><div class="cv-title ink ink-marker">駅ノート</div><div class="cv-sub ink ink-marker">ご自由にお書きください</div></div>
        <div class="cv-st ink ink-marker">夏ヶ原駅</div>
        <div class="cv-string"></div>
      </div>`;
    hand(cover.querySelector('.cv-title'), 5, 'marker');
    hand(cover.querySelector('.cv-sub'), 6, 'marker');
    hand(cover.querySelector('.cv-st'), 7, 'marker');
    const back = cover.querySelector('.back');
    back.innerHTML = '';
    back.appendChild(buildPage(single ? P(0) : P(0), false));
  }

  function close() {
    if (!isOpen) return;
    const text = (ta && ta.value.trim()) || '';
    isOpen = false; busy = true;
    sound.ui.bookClose();
    if (document.activeElement === ta) ta.blur();
    const to = hooks.benchPoint ? hooks.benchPoint() : null;
    const r = book.getBoundingClientRect();
    const dx = to ? to.x - (r.left + r.width / 2) : 0, dy = to ? to.y - (r.top + r.height / 2) : 40;
    const a = book.animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.05) rotate(3deg)`, opacity: 0 },
    ], { duration: ctx.reduced ? 1 : 850, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' });
    el.classList.add('closing');
    a.finished.then(() => {
      a.cancel();
      el.classList.remove('on', 'closing', 'opened');
      busy = false;
      let saved = null;
      if (text) {
        const entries = (ctx.store.get('entries', []) || []).slice();
        saved = { d: todayJP(), t: text, ts: Date.now() };
        entries.push(saved);
        ctx.store.set('entries', entries);
        ctx.store.set('draft', '');
        draft = '';
        if (ta) ta.value = '';
        writeEl = null; ta = null;
      }
      if (hooks.onClose) hooks.onClose({ wrote: !!saved, entry: saved });
    });
  }

  // ── input ────────────────────────────────────────────────
  el.querySelector('.nb-prev').addEventListener('click', (e) => { e.stopPropagation(); turn(-1); }, { signal: ctx.signal });
  el.querySelector('.nb-next').addEventListener('click', (e) => { e.stopPropagation(); turn(1); }, { signal: ctx.signal });
  el.querySelector('.nb-last').addEventListener('click', (e) => { e.stopPropagation(); toLast(); }, { signal: ctx.signal });
  closeBtn.addEventListener('click', (e) => { e.stopPropagation(); close(); }, { signal: ctx.signal });
  enBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const v = !hooks.getEN?.();
    hooks.setEN?.(v);
    enBtn.classList.toggle('on', v);
    el.classList.toggle('en-on', v);
  }, { signal: ctx.signal });
  el.querySelector('.st-nb-shade').addEventListener('click', () => { if (!busy) close(); }, { signal: ctx.signal });
  // click the outer part of a page to turn it; swipe on touch
  let down = null;
  spreadEl.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; }, { signal: ctx.signal });
  spreadEl.addEventListener('pointerup', (e) => {
    if (!down || busy) return;
    const dx = e.clientX - down.x, dy = e.clientY - down.y;
    const d0 = down; down = null;
    if (e.target.closest('textarea, .jt, button')) return;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) { turn(dx < 0 ? 1 : -1); return; }
    if (Math.hypot(dx, dy) > 8 || performance.now() - d0.t > 600) return;
    const r = spreadEl.getBoundingClientRect();
    const u = (e.clientX - r.left) / r.width;
    if (single) { if (u > 0.72) turn(1); else if (u < 0.2) turn(-1); }
    else if (u > 0.84) turn(1); else if (u < 0.16) turn(-1);
  }, { signal: ctx.signal });
  addEventListener('keydown', (e) => {
    if (!isOpen) return;
    if (e.target && (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT')) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); turn(1); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); turn(-1); }
    else if (e.key === 'End') { e.preventDefault(); toLast(); }
  }, { signal: ctx.signal });

  return {
    open, close,
    get isOpen() { return isOpen; },
    get el() { return el; },
    relayout() {
      if (!isOpen) return;
      const was = single;
      layoutMode();
      if (was !== single) {
        // keep roughly the same place in the book
        k = single ? Math.min(pages.length - 1, k * 2) : Math.floor(k / 2);
        render();
      }
    },
    setEN(v) { enBtn.classList.toggle('on', v); el.classList.toggle('en-on', v); },
    syncLang() {
      const e = isEN();
      el.classList.toggle('mode-en', e);
      el.querySelector('.nb-last').textContent = e ? WRITE_EN.last : '最後のページ';
      if (writeEl) {
        writeEl.querySelector('.pg-dv').textContent = today();
        if (ta) ta.placeholder = e ? WRITE_EN.placeholder : WRITE.placeholder;
      }
      syncClose();
      if (isOpen && !busy) render();
    },
  };
}
