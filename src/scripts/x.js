/* Экспериментальная главная: до и после в герое сменяются сами, ряд работ тянется мышью,
   при наведении на маленький кадр он встаёт на место главного. Док подсвечивает текущую секцию. */
(() => {
  if (!document.body.classList.contains('x')) return;
  const RM = matchMedia('(prefers-reduced-motion:reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ── герой: пары до и после (или видео) сменяются каждые 4 секунды, на наведении пауза ── */
  const hero = $('.xhero'), nameEl = $('#xName');
  const items = { ba: $$('.xc__pair', hero), anim: $$('.xc__vid', hero) };
  const dots = { ba: $$('.xhero__dots--ba button', hero), anim: $$('.xhero__dots--anim button', hero) };
  const idx = { ba: 0, anim: 0 };
  const DUR = 4000;
  let mode = 'ba', timer = 0, paused = false, heroVisible = true;
  hero.style.setProperty('--dur-cycle', DUR / 1000 + 's');
  function show(i, m = mode) {
    const n = items[m].length; idx[m] = (i + n) % n;
    items[m].forEach((x, k) => x.classList.toggle('on', k === idx[m]));
    dots[m].forEach((d, k) => { d.classList.remove('on'); if (k === idx[m]) { void d.offsetWidth; d.classList.add('on'); } });
    const cur = items[m][idx[m]];
    cur.querySelectorAll('img').forEach(im => im.loading = 'eager');
    nameEl.textContent = cur.dataset.name;
    items.anim.forEach((v, k) => { const el = v.querySelector('video'); if (m === 'anim' && mode === 'anim' && heroVisible && k === idx.anim) { el.preload = 'auto'; el.play().catch(() => {}); } else el.pause(); });
    // заранее подгружаем следующую пару, чтобы смена была без вспышки
    items[m][(idx[m] + 1) % n].querySelectorAll('img').forEach(im => im.loading = 'eager');
    schedule();
  }
  function schedule() { clearTimeout(timer); if (!RM && !paused && heroVisible) timer = setTimeout(() => show(idx[mode] + 1), DUR); }
  function setMode(m) {
    mode = m; hero.dataset.mode = m;
    $$('.xc__mode button', hero).forEach(b => b.setAttribute('aria-selected', String(b.dataset.mode === m)));
    show(idx[m]);
  }
  $$('.xc__mode button', hero).forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
  ['ba', 'anim'].forEach(m => dots[m].forEach(d => d.addEventListener('click', () => show(+d.dataset.i, m))));
  const vis = $('.xhero__vis', hero);
  vis.addEventListener('pointerenter', () => { paused = true; hero.classList.add('paused'); clearTimeout(timer); });
  vis.addEventListener('pointerleave', () => { paused = false; hero.classList.remove('paused'); show(idx[mode]); });
  show(0);

  /* ── работы: ряд тянется мышью, маленький кадр под курсором встаёт на место главного ── */
  const row = $('#xRow');
  let drag = null, moved = false;
  row.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' || e.button) return; drag = { x: e.clientX, sl: row.scrollLeft }; moved = false; });
  addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!moved && Math.abs(dx) > 5) { moved = true; row.classList.add('drag'); }
    if (moved) row.scrollLeft = drag.sl - dx;
  });
  addEventListener('pointerup', () => { drag = null; setTimeout(() => row.classList.remove('drag'), 0); });
  row.addEventListener('click', e => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
  // вертикальное колесо над рядом не трогаем, горизонтальное (тачпад) работает само
  $$('.xg', row).forEach(g => {
    const imgs = $$('.xg__main img', g), th = $$('.xg__thumbs button', g);
    const set = k => { imgs.forEach(im => im.classList.toggle('on', +im.dataset.k === k)); th.forEach(b => b.classList.toggle('on', +b.dataset.k === k)); };
    th.forEach(b => {
      b.addEventListener('pointerenter', () => set(+b.dataset.k));
      b.addEventListener('focus', () => set(+b.dataset.k));
      b.addEventListener('click', () => set(+b.dataset.k));
    });
    $('.xg__thumbs', g)?.addEventListener('pointerleave', () => set(1));
  });

  /* ── отзывы ── */
  const qs = $$('#xq blockquote'), qn = $('#xqn');
  let qi = 0;
  const pad = n => String(n).padStart(2, '0');
  const quote = i => { qi = (i + qs.length) % qs.length; qs.forEach((q, k) => q.classList.toggle('on', k === qi)); qn.textContent = `${pad(qi + 1)} / ${pad(qs.length)}`; };
  $$('#xq .xq__arr').forEach(b => b.addEventListener('click', () => quote(qi + +b.dataset.d)));

  /* ── услуги: список переключает картинку ── */
  const sb = $$('.xsv__list button'), sm = $$('.xsv__m');
  const svc = i => {
    sb.forEach((b, k) => b.classList.toggle('on', k === i));
    sm.forEach((m, k) => { m.classList.toggle('on', k === i); const v = m.querySelector('video'); if (v) { if (k === i) { v.preload = 'auto'; v.play().catch(() => {}); } else v.pause(); } });
  };
  sb.forEach((b, k) => { b.addEventListener('click', () => svc(k)); b.addEventListener('pointerenter', () => { if (matchMedia('(hover:hover)').matches) svc(k); }); });

  /* ── календарь грузится, когда до секции созвона остаётся экран ── */
  let calBooted = false;
  function bootCal() {
    if (calBooted) return; calBooted = true;
    (function (C, A, L) { let p = function (a, ar) { a.q.push(ar); }; let d = C.document; C.Cal = C.Cal || function () { let cal = C.Cal; let ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement('script')).src = A; cal.loaded = true; } if (ar[0] === L) { const api = function () { p(api, arguments); }; const namespace = ar[1]; api.q = api.q || []; if (typeof namespace === 'string') { cal.ns[namespace] = cal.ns[namespace] || api; p(cal.ns[namespace], ar); p(cal, ['initNamespace', namespace]); } else p(cal, ar); return; } p(cal, ar); }; })(window, 'https://app.cal.com/embed/embed.js', 'init');
    Cal('init', '30min', { origin: 'https://cal.com' });
    Cal.ns['30min']('inline', { elementOrSelector: '#xCal', config: { layout: 'month_view', theme: 'light' }, calLink: 'unrootdesign/30min' });
    Cal.ns['30min']('ui', { theme: 'light', hideEventTypeDetails: false, layout: 'month_view', cssVarsPerTheme: { light: { 'cal-brand': '#8961E7' } } });
  }

  /* ── док и подпись сверху следят за секцией, у футера прячутся ── */
  const links = $$('.x-dock a'), dock = $('.x-dock'), top = $('.x-top'), crumb = $('#xCrumb'), footer = $('footer.ft');
  const ids = links.map(a => a.dataset.t);
  const NAMES = { concept: 'concept', work: 'work', reviews: 'reviews', pricing: 'pricing', services: 'services', handover: 'services', team: 'contact', faq: 'faq' };
  const secs = $$('main .xs');
  function spy() {
    const y = innerHeight * .4;
    let cur = 'concept';
    secs.forEach(s => { if (s.getBoundingClientRect().top <= y) cur = s.id; });
    const dockId = ids.includes(cur) ? cur : cur === 'handover' ? 'services' : cur === 'faq' ? 'team' : cur;
    links.forEach(a => { if (a.dataset.t === dockId) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    crumb.textContent = NAMES[cur] || cur;
    const hr = hero.getBoundingClientRect(), nowVis = hr.bottom > 0;
    if (nowVis !== heroVisible) { heroVisible = nowVis; show(idx[mode]); }
    if ($('#team').getBoundingClientRect().top < innerHeight * 2) bootCal();
    if (footer) { const ft = footer.getBoundingClientRect().top; dock.classList.toggle('off', ft < innerHeight - 40); top.classList.toggle('off', ft < 90); }
  }
  let st = false;
  addEventListener('scroll', () => { if (!st) { st = true; requestAnimationFrame(() => { st = false; spy(); }); } }, { passive: true });
  spy();
  links[0].addEventListener('click', e => { e.preventDefault(); scrollTo({ top: 0, behavior: RM ? 'auto' : 'smooth' }); history.replaceState(null, '', location.pathname); });
  // старые ссылки вида /#offer, /#concepts ведут к нужной секции
  const ALIAS = { offer: 'concept', concepts: 'concept', about: 'team', contact: 'team' };
  const h = location.hash.slice(1);
  if (ALIAS[h]) addEventListener('load', () => document.getElementById(ALIAS[h])?.scrollIntoView({ behavior: 'auto' }));
})();
