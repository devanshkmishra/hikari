// Small helpers shared by the 水色ヶ丘 modules.
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const easeOut = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const pad2 = (n) => String(n).padStart(2, '0');

export function h(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

export function mkCanvas(w, hh) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(hh));
  return c;
}

// xorshift — deterministic little worlds
export function rng(seed = 1) {
  let s = (seed >>> 0) || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

export function rrect(g, x, y, w, hh, r) {
  r = Math.min(r, w / 2, hh / 2);
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + hh, r);
  g.arcTo(x + w, y + hh, x, y + hh, r);
  g.arcTo(x, y + hh, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function fmtTime(s) {
  s = Math.max(0, Math.floor(s));
  return `${Math.floor(s / 60)}:${pad2(s % 60)}`;
}

// The OS believes it is 2004. Month and day are real; the year is not.
export function osDate(d = new Date()) {
  const y = 2004;
  const m = d.getMonth() + 1, day = d.getDate();
  const wd = '日月火水木金土'[new Date(y, m - 1, day).getDay()];
  const wdEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date(y, m - 1, day).getDay()];
  const mEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][m - 1];
  return { y, m, day, wd, str: `${y}/${pad2(m)}/${pad2(day)}`, long: `${y}年${m}月${day}日 ${wd}曜日`, longEn: `${wdEn}, ${mEn} ${day}, ${y}` };
}

export function isTouch(e) { return e && e.pointerType === 'touch'; }

// Like jpHTML, but for markup authored here: only the [表記|よみ|gloss] tokens are rewritten,
// everything else is passed through as HTML. Never feed it unescaped user text.
export function jpRich(str) {
  return String(str).replace(/\[([^\[\]|]+)\|([^\[\]|]*)\|([^\[\]]*)\]/g,
    (m, w, r, g) => `<span class="jt" data-r="${esc(r)}" data-g="${esc(g)}">${esc(w)}</span>`);
}
