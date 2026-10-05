/* Экспериментальная главная: 4 экрана, док снизу.
   Works: полотно двигается перетаскиванием и колесом. Concepts: до и после или анимированная версия. */
(() => {
  const app = document.querySelector('.x-app'); if (!app) return;
  const RM = matchMedia('(prefers-reduced-motion:reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const views = $$('.xv'), tabs = $$('.x-dock button'), crumb = $('#xCrumb');
  const ALL = ['works', 'concepts', 'about', 'contact'];
  const ALIAS = { work: 'works', concept: 'concepts', offer: 'concepts', reviews: 'about', pricing: 'about', team: 'contact', faq: 'about' };
  let view = 'works';
  const desktop = () => innerWidth > 760;

  /* ── полотно: стартует с заголовка в центре, двигается в пределах краёв ── */
  const xw = $('#xw'), cv = $('#xwCanvas'), intro = $('.xw-intro', cv);
  let px = 0, py = 0, tx = 0, ty = 0, raf = 0, S = 1;
  // на ноутбуках полотно чуть уменьшено, чтобы с заголовком было видно больше проектов
  const scale = () => { S = innerWidth < 1300 ? .74 : innerWidth < 1700 ? .82 : .92; };
  const bounds = () => ({ minX: Math.min(0, xw.clientWidth - cv.offsetWidth * S - 40), minY: Math.min(0, xw.clientHeight - cv.offsetHeight * S - 40) });
  const clamp = (x, y) => { const b = bounds(); return [Math.max(b.minX, Math.min(40, x)), Math.max(b.minY, Math.min(40, y))]; };
  const apply = () => { cv.style.transform = `translate3d(${px}px,${py}px,0) scale(${S})`; };
  function loop() {
    const dx = tx - px, dy = ty - py;
    if (RM || (Math.abs(dx) < .3 && Math.abs(dy) < .3)) { px = tx; py = ty; apply(); raf = 0; return; }
    px += dx * .14; py += dy * .14; apply(); raf = requestAnimationFrame(loop);
  }
  const moveTo = (x, y, now) => { [tx, ty] = clamp(x, y); if (now) { px = tx; py = ty; apply(); } else if (!raf) raf = requestAnimationFrame(loop); };
  function center(now) {
    if (!desktop()) { cv.style.transform = ''; return; }
    scale();
    const cx = (intro.offsetLeft + intro.offsetWidth / 2) * S, cy = (intro.offsetTop + intro.offsetHeight / 2) * S;
    moveTo(xw.clientWidth / 2 - cx, xw.clientHeight / 2 - cy - 20, now);
  }
  xw.addEventListener('wheel', e => {
    if (!desktop()) return;
    e.preventDefault();
    const k = e.deltaMode === 1 ? 32 : 1;
    moveTo(tx - (e.shiftKey ? e.deltaY : e.deltaX) * k, ty - (e.shiftKey ? 0 : e.deltaY) * k);
  }, { passive: false });
  let drag = null, moved = false;
  xw.addEventListener('pointerdown', e => { if (!desktop() || e.button) return; drag = { x: e.clientX, y: e.clientY, tx, ty }; moved = false; });
  addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!moved && Math.hypot(dx, dy) > 5) { moved = true; xw.classList.add('drag'); }
    if (moved) moveTo(drag.tx + dx, drag.ty + dy, true);
  });
  addEventListener('pointerup', () => { drag = null; setTimeout(() => xw.classList.remove('drag'), 0); });
  $$('.xg', cv).forEach(g => g.addEventListener('click', e => { if (moved) { e.preventDefault(); moved = false; } }));
  addEventListener('resize', () => center(true));
  center(true);

  /* ── концепты ── */
  const xc = $('.xc');
  const lists = { ba: $$('.xc__list--ba button'), anim: $$('.xc__list--anim button') };
  const items = { ba: $$('.xc__pair'), anim: $$('.xc__vid') };
  const idx = { ba: 0, anim: 0 };
  let mode = 'ba';
  const playVid = () => items.anim.forEach((v, k) => { const el = v.querySelector('video'); if (mode === 'anim' && view === 'concepts' && k === idx.anim) { el.preload = 'auto'; el.play().catch(() => {}); } else el.pause(); });
  function pick(i, m = mode) {
    const n = items[m].length; idx[m] = (i + n) % n;
    items[m].forEach((x, k) => x.classList.toggle('on', k === idx[m]));
    lists[m].forEach((b, k) => b.classList.toggle('on', k === idx[m]));
    items[m][idx[m]].querySelectorAll('img').forEach(im => im.loading = 'eager');
    playVid();
  }
  function setMode(m) {
    mode = m; xc.dataset.mode = m;
    $$('.xc__mode button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.mode === m)));
    pick(idx[m]);
  }
  $$('.xc__mode button').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
  ['ba', 'anim'].forEach(m => lists[m].forEach(b => b.addEventListener('click', () => pick(+b.dataset.i, m))));
  // сообщение
  const msg = $('#xMsg'), mq = $('.xmsg__q', msg), mf = $('#xMsgFull');
  const openMsg = on => { msg.classList.toggle('open', on); mf.hidden = !on; mq.setAttribute('aria-expanded', String(on)); };
  mq.addEventListener('click', () => openMsg(true));
  $('.xmsg__x', msg).addEventListener('click', () => openMsg(false));

  /* ── отзывы со стрелками ── */
  const qs = $$('#xq blockquote'), qn = $('#xqn');
  let qi = 0;
  const quote = i => { qi = (i + qs.length) % qs.length; qs.forEach((q, k) => q.classList.toggle('on', k === qi)); qn.textContent = `${qi + 1} / ${qs.length}`; };
  $$('#xq .xa__arr').forEach(b => b.addEventListener('click', () => quote(qi + +b.dataset.d)));

  /* ── календарь грузится при первом открытии контакта ── */
  let calBooted = false;
  function bootCal() {
    if (calBooted) return; calBooted = true;
    (function (C, A, L) { let p = function (a, ar) { a.q.push(ar); }; let d = C.document; C.Cal = C.Cal || function () { let cal = C.Cal; let ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement('script')).src = A; cal.loaded = true; } if (ar[0] === L) { const api = function () { p(api, arguments); }; const namespace = ar[1]; api.q = api.q || []; if (typeof namespace === 'string') { cal.ns[namespace] = cal.ns[namespace] || api; p(cal.ns[namespace], ar); p(cal, ['initNamespace', namespace]); } else p(cal, ar); return; } p(cal, ar); }; })(window, 'https://app.cal.com/embed/embed.js', 'init');
    Cal('init', '30min', { origin: 'https://cal.com' });
    Cal.ns['30min']('inline', { elementOrSelector: '#xCal', config: { layout: 'month_view', theme: 'light' }, calLink: 'unrootdesign/30min' });
    Cal.ns['30min']('ui', { theme: 'light', hideEventTypeDetails: false, layout: 'month_view', cssVarsPerTheme: { light: { 'cal-brand': '#8961E7' } } });
  }

  /* ── экраны и док ── */
  function show(v, push = true) {
    if (!ALL.includes(v)) v = 'works';
    view = v; app.dataset.view = v;
    views.forEach(s => { const on = s.dataset.v === v; s.classList.toggle('on', on); s.toggleAttribute('hidden', !on); s.setAttribute('aria-hidden', String(!on)); });
    tabs.forEach(t => t.setAttribute('aria-pressed', String(t.dataset.v === v)));
    crumb.textContent = v;
    if (v === 'contact') bootCal();
    if (v === 'concepts') pick(idx[mode]); else playVid();
    if (push) history.replaceState(null, '', v === 'works' ? location.pathname : '#' + v);
  }
  tabs.forEach(t => t.addEventListener('click', () => show(t.dataset.v)));
  addEventListener('keydown', e => {
    if (e.target.closest('input,textarea,select,[contenteditable]')) return;
    if (/^[1-4]$/.test(e.key)) show(ALL[+e.key - 1]);
    else if (view === 'concepts' && (e.key === 'ArrowRight' || e.key === 'ArrowDown')) { e.preventDefault(); pick(idx[mode] + 1); }
    else if (view === 'concepts' && (e.key === 'ArrowLeft' || e.key === 'ArrowUp')) { e.preventDefault(); pick(idx[mode] - 1); }
    else if (view === 'about' && e.key === 'ArrowRight') quote(qi + 1);
    else if (view === 'about' && e.key === 'ArrowLeft') quote(qi - 1);
    else if (e.key === 'Escape') openMsg(false);
  });
  const h = location.hash.slice(1);
  show(ALIAS[h] || h || 'works', false);
  addEventListener('hashchange', () => { const k = location.hash.slice(1); show(ALIAS[k] || k || 'works', false); });
})();
