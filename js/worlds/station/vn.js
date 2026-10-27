// 夏ヶ原 — the text window. Key/VisualArt's manners: click or space to advance, the line
// types itself in, AUTO, a backlog (wheel up or L), right-click hides the window.

const escH = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function createVN(root, ctx, opts = {}) {
  const isEN = () => !!(opts.lang && opts.lang() === 'en');
  const el = document.createElement('div');
  el.className = 'st-vn';
  el.innerHTML = `
    <div class="st-vn-box" role="log" aria-live="polite">
      <div class="st-vn-ctl">
        <button type="button" data-a="auto" title="自動 (A)">AUTO</button>
        <button type="button" data-a="log" title="バックログ (L)">LOG</button>
        <button type="button" data-a="en" title="English">EN</button>
        <button type="button" data-a="hide" title="ウィンドウを消す (H / 右クリック)">HIDE</button>
      </div>
      <div class="st-vn-text" lang="ja"></div>
      <div class="st-vn-en" lang="en"></div>
      <div class="st-vn-wait"></div>
    </div>`;
  root.appendChild(el);
  const box = el.querySelector('.st-vn-box');
  const textEl = el.querySelector('.st-vn-text');
  const enEl = el.querySelector('.st-vn-en');
  const waitEl = el.querySelector('.st-vn-wait');
  const ctl = el.querySelector('.st-vn-ctl');

  const choicesEl = document.createElement('div');
  choicesEl.className = 'st-choices';
  root.appendChild(choicesEl);

  const logEl = document.createElement('div');
  logEl.className = 'st-log';
  logEl.innerHTML = '<div class="st-log-head"><span>これまで</span><small>backlog — L / wheel down at the end / click outside to close</small></div><div class="st-log-list"></div>';
  root.appendChild(logEl);
  const logList = logEl.querySelector('.st-log-list');

  let en = !!ctx.store.get('en', false);
  let auto = false;
  let hidden = false;
  let shown = false;
  const history = [];

  // state of the current line
  let chars = [];
  let shownN = 0;
  let acc = 0;
  let line = null;
  let full = false;
  let doneAt = 0;
  let resolveLine = null;
  let waiting = null;           // a function that must become true before the next line
  let transient = null;         // ambient line timer
  let choiceResolve = null;
  let clock = 0;

  const setEN = (v) => {
    en = v; ctx.store.set('en', v);
    el.classList.toggle('en-on', en);
    choicesEl.classList.toggle('en-on', en);
    logEl.classList.toggle('en-on', en);
    ctl.querySelector('[data-a=en]').classList.toggle('on', en);
    if (opts.onEN) opts.onEN(en);
  };
  setEN(en);
  queueMicrotask(() => syncLang());

  function charify(container) {
    const out = [];
    const walk = (node) => {
      for (const ch of [...node.childNodes]) {
        if (ch.nodeType === 3) {
          const frag = document.createDocumentFragment();
          for (const s of Array.from(ch.textContent)) {
            const sp = document.createElement('span');
            sp.className = 'c';
            sp.textContent = s;
            frag.appendChild(sp);
            out.push(sp);
          }
          ch.replaceWith(frag);
        } else if (ch.nodeType === 1) walk(ch);
      }
    };
    walk(container);
    return out;
  }

  function show() {
    if (!shown) { shown = true; el.classList.add('on'); }
  }
  function hideBox() { shown = false; el.classList.remove('on'); }

  function render(l) {
    line = l;
    const en0 = isEN() && l.en;
    textEl.innerHTML = en0 ? escH(l.en) : ctx.jp.html(l.jp);
    textEl.lang = en0 ? 'en' : 'ja';
    enEl.textContent = en0 ? '' : (l.en || '');
    chars = charify(textEl);
    shownN = 0; acc = 0; full = false;
    waitEl.classList.remove('on');
    history.push(l);
    if (logEl.classList.contains('on')) renderLog();
    if (l.onShow) { try { l.onShow(); } catch (e) { console.error(e); } }
  }
  function syncLang() {
    const e = isEN();
    el.classList.toggle('mode-en', e);
    choicesEl.classList.toggle('mode-en', e);
    logEl.classList.toggle('mode-en', e);
    logEl.querySelector('.st-log-head span').textContent = e ? 'so far' : 'これまで';
    if (line) {
      const keep = full;
      const l = line;
      history.pop();
      render(l);
      if (keep || transient) completeLine();
    }
    if (choiceResolve && lastOptions) renderChoices(lastOptions);
    if (logEl.classList.contains('on')) renderLog();
  }
  let lastOptions = null;
  function renderChoices(options) {
    choicesEl.innerHTML = '';
    options.forEach((o, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'st-choice';
      b.innerHTML = isEN()
        ? `<span class="jp" lang="en">${escH(o.en || o.jp)}</span>`
        : `<span class="jp" lang="ja">${ctx.jp.html(o.jp)}</span><span class="en">${o.en || ''}</span>`;
      b.style.transitionDelay = `${i * 70}ms`;
      b.addEventListener('click', (e) => { e.stopPropagation(); if (choicesEl._pick) choicesEl._pick(i); }, { signal: ctx.signal });
      choicesEl.appendChild(b);
    });
  }

  function completeLine() {
    for (const c of chars) c.classList.add('on');
    shownN = chars.length; full = true; doneAt = clock;
    waitEl.classList.add('on');
  }

  function update(dt) {
    clock += dt;
    if (waiting) {
      if (waiting()) { waiting = null; box.classList.remove('dim'); nextFromQueue(); }
      return;
    }
    if (!line) return;
    if (!full) {
      acc += dt * (ctx.reduced ? 200 : 34);
      while (acc >= 1 && shownN < chars.length) {
        const c = chars[shownN];
        c.classList.add('on');
        shownN++;
        acc -= 1;
        const ch = c.textContent;
        if (ch === '。' || ch === '」' || ch === '？' || ch === '！') acc -= 7;
        else if (ch === '、') acc -= 3;
        else if (ch === '…') acc -= 1.2;
      }
      if (shownN >= chars.length) { full = true; doneAt = clock; waitEl.classList.add('on'); }
    } else if (auto && resolveLine && !hidden && clock - doneAt > Math.max(1.8, chars.length * 0.075)) {
      advance();
    }
  }

  let queue = [];
  function nextFromQueue() {
    if (!queue.length) { const r = resolveLine; resolveLine = null; line = null; if (r) r(); return; }
    const l = queue.shift();
    if (l.waitFor && !l.waitFor()) {
      waiting = l.waitFor;
      box.classList.add('dim');
      queue.unshift({ ...l, waitFor: null });
      return;
    }
    show();
    render(l);
  }

  function say(lines) {
    clearTransient();
    return new Promise((res) => {
      queue = lines.slice();
      resolveLine = res;
      nextFromQueue();
    });
  }

  // a line the place says by itself; fades if you don't click
  function ambient(l, ms = 0) {
    if (resolveLine || choiceResolve || waiting) return false;
    clearTransient();
    show();
    render(l);
    const life = ms || 6000 + l.jp.length * 90;
    transient = ctx.timeout(() => { transient = null; if (!resolveLine && !choiceResolve) { line = null; hideBox(); } }, life);
    return true;
  }
  function clearTransient() { if (transient) { clearTimeout(transient); transient = null; } }

  function advance() {
    if (hidden) { setHidden(false); return true; }
    if (logEl.classList.contains('on')) { closeLog(); return true; }
    if (choiceResolve) return false;
    if (waiting) return true;
    if (!line) return false;
    if (!full) { completeLine(); return true; }
    if (transient) { clearTransient(); line = null; hideBox(); return true; }
    if (resolveLine) { nextFromQueue(); return true; }
    return false;
  }

  function choose(options) {
    clearTransient();
    return new Promise((res) => {
      choiceResolve = res;
      lastOptions = options;
      renderChoices(options);
      requestAnimationFrame(() => choicesEl.classList.add('on'));
      function pick(i) {
        if (!choiceResolve) return;
        const r = choiceResolve; choiceResolve = null;
        choicesEl.classList.remove('on');
        history.push({ jp: '→ ' + options[i].jp, en: options[i].en ? '→ ' + options[i].en : '', choice: true });
        ctx.timeout(() => { if (!choiceResolve) choicesEl.innerHTML = ''; }, 400);
        r(i);
      }
      choicesEl._pick = pick;
    });
  }

  function setHidden(v) {
    hidden = v;
    el.classList.toggle('hidden', v);
    choicesEl.classList.toggle('hidden', v);
  }

  function renderLog() {
    logList.innerHTML = '';
    for (const l of history) {
      const d = document.createElement('div');
      d.className = 'st-log-item' + (l.choice ? ' choice' : '');
      d.innerHTML = isEN() && l.en ? `<div class="jp" lang="en">${escH(l.en)}</div>` : `<div class="jp" lang="ja">${ctx.jp.html(l.jp)}</div>${l.en ? `<div class="en">${escH(l.en)}</div>` : ''}`;
      logList.appendChild(d);
    }
    logList.scrollTop = logList.scrollHeight;
  }
  function openLog() { if (!history.length) return; renderLog(); logEl.classList.add('on'); }
  function closeLog() { logEl.classList.remove('on'); }

  ctl.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    e.stopPropagation();
    const a = b.dataset.a;
    if (a === 'auto') { auto = !auto; b.classList.toggle('on', auto); }
    else if (a === 'log') openLog();
    else if (a === 'en') setEN(!en);
    else if (a === 'hide') setHidden(true);
  }, { signal: ctx.signal });
  box.addEventListener('click', (e) => { e.stopPropagation(); advance(); }, { signal: ctx.signal });
  logEl.addEventListener('click', (e) => { if (e.target === logEl || e.target.closest('.st-log-head')) closeLog(); }, { signal: ctx.signal });
  logEl.addEventListener('wheel', (e) => {
    if (e.deltaY > 0 && logList.scrollTop + logList.clientHeight >= logList.scrollHeight - 2) closeLog();
  }, { signal: ctx.signal, passive: true });

  return {
    el, choicesEl,
    say, choose, ambient, advance, update,
    openLog, closeLog,
    get logOpen() { return logEl.classList.contains('on'); },
    get busy() { return !!(resolveLine || choiceResolve || waiting); },
    get choosing() { return !!choiceResolve; },
    get hidden() { return hidden; },
    get en() { return en; },
    setEN,
    syncLang,
    setHidden,
    toggleHidden() { setHidden(!hidden); },
    toggleAuto() { auto = !auto; ctl.querySelector('[data-a=auto]').classList.toggle('on', auto); },
    pickChoice(i) { if (choicesEl._pick && choiceResolve) choicesEl._pick(i); },
    hideBox,
    quiet() { clearTransient(); if (!resolveLine && !choiceResolve) { line = null; hideBox(); } },
  };
}
