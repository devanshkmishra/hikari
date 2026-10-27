// A tiny Yomitan-style reading aid. No automatic furigana, no translation —
// hover (or tap) a word only when you want help with it.
//
// Markup inside any string: [表記|よみ|gloss]  e.g.  "[夏|なつ|summer]の[駅|えき|station]"
// Anything outside brackets renders as plain text.

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function jpHTML(str) {
  let out = '';
  let i = 0;
  const re = /\[([^\[\]|]+)\|([^\[\]|]*)\|([^\[\]]*)\]/g;
  let m;
  while ((m = re.exec(str))) {
    out += esc(str.slice(i, m.index));
    out += `<span class="jt" data-r="${esc(m[2])}" data-g="${esc(m[3])}">${esc(m[1])}</span>`;
    i = m.index + m[0].length;
  }
  out += esc(str.slice(i));
  return out;
}

// Strip markup to plain surface text (for typewriter effects, length counting, etc.)
export function jpPlain(str) {
  return str.replace(/\[([^\[\]|]+)\|[^\[\]|]*\|[^\[\]]*\]/g, '$1');
}

let pop = null;
function ensurePop() {
  if (pop) return pop;
  pop = document.createElement('div');
  pop.className = 'jt-pop';
  pop.innerHTML = '<div class="jt-head"><span class="jt-word"></span><span class="jt-read"></span></div><div class="jt-gloss"></div><div class="jt-src">辞書 · hover dictionary</div>';
  document.body.appendChild(pop);
  return pop;
}

export function hideGloss() { if (pop) pop.classList.remove('on'); }

export function attachGloss(root, signal) {
  const p = ensurePop();
  const show = (el) => {
    p.querySelector('.jt-word').textContent = el.textContent;
    p.querySelector('.jt-read').textContent = el.dataset.r || '';
    const g = p.querySelector('.jt-gloss');
    g.innerHTML = '';
    (el.dataset.g || '').split(';').map((s) => s.trim()).filter(Boolean).forEach((s, k) => {
      const li = document.createElement('div');
      li.innerHTML = `<b>${k + 1}</b> ${esc(s)}`;
      g.appendChild(li);
    });
    const r = el.getBoundingClientRect();
    p.classList.add('on');
    const pw = p.offsetWidth, ph = p.offsetHeight;
    let x = r.left + r.width / 2 - pw / 2;
    let y = r.top - ph - 10;
    if (y < 8) y = r.bottom + 10;
    x = Math.max(8, Math.min(innerWidth - pw - 8, x));
    p.style.transform = `translate(${x}px, ${y}px)`;
    el.classList.add('jt-on');
  };
  const opts = signal ? { signal } : undefined;
  root.addEventListener('pointerover', (e) => {
    const el = e.target.closest && e.target.closest('.jt');
    if (el) show(el);
  }, opts);
  root.addEventListener('pointerout', (e) => {
    const el = e.target.closest && e.target.closest('.jt');
    if (el) { el.classList.remove('jt-on'); hideGloss(); }
  }, opts);
  if (signal) signal.addEventListener('abort', hideGloss);
}
