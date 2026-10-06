/* Экспериментальная главная: в герое концепты сменяются сами (сначала анимированные, переключатель показывает до и после),
   под сценой серым названия проектов. Лента работ едет сама и тянется, при наведении на маленький кадр он встаёт на место главного. */
(() => {
  if (!document.body.classList.contains('x')) return;
  const RM = matchMedia('(prefers-reduced-motion:reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ── герой: анимированные концепты идут друг за другом без пауз в 1.5 раза быстрее,
     до и после сменяются раз в 4.5 секунды; под сценой серым названия проектов ── */
  const hero = $('.xhero');
  const items = { anim: $$('.xc__vid', hero), ba: $$('.xc__pair', hero) };
  const names = { anim: $$('.xc__names--anim button', hero), ba: $$('.xc__names--ba button', hero) };
  const idx = { anim: 0, ba: 0 };
  const BA_DUR = 4500, RATE = 1.5;
  let mode = hero.dataset.mode || 'anim', paused = false, heroVisible = true, baTimer = 0, baLeft = BA_DUR, baAt = 0;
  const videos = items.anim.map(v => v.querySelector('video'));
  videos.forEach((el, k) => {
    el.defaultPlaybackRate = RATE; el.playbackRate = RATE;
    // следующее видео начинается ровно в момент, когда закончилось текущее
    el.addEventListener('ended', () => { if (mode === 'anim' && k === idx.anim) show(idx.anim + 1); });
  });
  const vid = () => videos[idx.anim];
  const canPlay = () => heroVisible && !paused;
  function warm(el) { if (el && el.preload !== 'auto') { el.preload = 'auto'; el.load(); el.playbackRate = RATE; } }

  function show(i, m = mode) {
    const n = items[m].length; idx[m] = (i + n) % n;
    items[m].forEach((x, k) => x.classList.toggle('on', k === idx[m]));
    names[m].forEach((b, k) => b.classList.toggle('on', k === idx[m]));
    const next = items[m][(idx[m] + 1) % n];
    items[m][idx[m]].querySelectorAll('img').forEach(im => im.loading = 'eager');
    next.querySelectorAll('img').forEach(im => im.loading = 'eager');
    clearTimeout(baTimer);
    videos.forEach((el, k) => {
      if (m === 'anim' && k === idx.anim) { warm(el); el.currentTime = 0; el.playbackRate = RATE; if (canPlay()) el.play().catch(() => {}); }
      else el.pause();
    });
    if (m === 'anim') warm(videos[(idx.anim + 1) % videos.length]);
    else { baLeft = BA_DUR; baRun(); }
  }
  function baRun() { clearTimeout(baTimer); if (RM || mode !== 'ba' || !canPlay()) return; baAt = performance.now(); baTimer = setTimeout(() => show(idx.ba + 1), baLeft); }
  function pause() { if (paused) return; paused = true; if (mode === 'anim') vid()?.pause(); else { clearTimeout(baTimer); baLeft = Math.max(400, baLeft - (performance.now() - baAt)); } }
  function resume() { paused = false; if (!heroVisible) return; if (mode === 'anim') vid()?.play().catch(() => {}); else baRun(); }

  // переключатель «See before / after»: выключен, идут анимированные концепты; включён, пары до и после
  const sw = $('#xSw');
  function setMode(m) {
    mode = m; hero.dataset.mode = m;
    sw?.setAttribute('aria-checked', String(m === 'ba'));
    show(idx[m]);
  }
  sw?.addEventListener('click', () => setMode(mode === 'ba' ? 'anim' : 'ba'));
  ['anim', 'ba'].forEach(m => names[m].forEach(b => b.addEventListener('click', () => show(+b.dataset.i, m))));
  const stage = $('.xhero__stage', hero);
  stage.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') pause(); });
  stage.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') resume(); });
  hero.dataset.mode = mode;
  show(0);
  // страховка: если видео не грузится или застряло на 3 секунды, переходим к следующему
  let lastT = -1, stall = 0;
  setInterval(() => {
    if (mode !== 'anim' || !canPlay()) { stall = 0; return; }
    const t = vid()?.currentTime ?? 0;
    stall = t === lastT ? stall + 500 : 0; lastT = t;
    if (stall >= 3000) { stall = 0; show(idx.anim + 1); }
  }, 500);

  /* ── работы: маленький кадр под курсором встаёт на место главного, уход возвращает первый ── */
  $$('.xg').forEach(g => {
    const imgs = $$('.xg__main img', g), th = $$('.xg__thumbs button', g);
    const set = k => { imgs.forEach(im => im.classList.toggle('on', +im.dataset.k === k)); th.forEach(b => b.classList.toggle('on', +b.dataset.k === k)); };
    th.forEach(b => {
      b.addEventListener('pointerenter', () => set(+b.dataset.k));
      b.addEventListener('focus', () => set(+b.dataset.k));
      b.addEventListener('click', () => set(+b.dataset.k));
    });
    $('.xg__thumbs', g)?.addEventListener('pointerleave', () => set(1));
  });

  /* ── лента работ: едет сама справа налево, стоит под мышью, тянется мышью или пальцем ── */
  const row = $('#xRow'), track = $('.xmq__t');
  if (row && track) {
    const SPEED = 105; // пикселей в секунду
    let x = 0, half = 0, last = 0, hover = false, drag = null, moved = false, visible = true;
    const measure = () => { half = track.scrollWidth / 2; };
    const wrap = () => { if (half) { while (x <= -half) x += half; while (x > 0) x -= half; } };
    const paint = () => { track.style.transform = `translate3d(${x}px,0,0)`; };
    measure(); addEventListener('resize', measure); addEventListener('load', measure);
    new IntersectionObserver(es => es.forEach(e => { visible = e.isIntersecting; })).observe(row);
    requestAnimationFrame(function tick(t) {
      const dt = Math.min(64, t - (last || t)); last = t;
      if (!RM && visible && !hover && !drag) { x -= SPEED * dt / 1000; wrap(); paint(); }
      requestAnimationFrame(tick);
    });
    row.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') hover = true; });
    row.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') hover = false; });
    row.addEventListener('pointerdown', e => { if (e.button) return; drag = { sx: e.clientX, x0: x, id: e.pointerId }; moved = false; });
    addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.sx;
      if (!moved && Math.abs(dx) > 6) { moved = true; row.classList.add('drag'); try { row.setPointerCapture(drag.id); } catch {} }
      if (moved) { x = drag.x0 + dx; wrap(); paint(); }
    });
    const end = () => { if (!drag) return; drag = null; setTimeout(() => row.classList.remove('drag'), 0); };
    addEventListener('pointerup', end); addEventListener('pointercancel', end);
    // после перетаскивания клик по карточке не срабатывает
    row.addEventListener('click', e => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    row.addEventListener('dragstart', e => e.preventDefault());
  }

  /* ── отзывы ── */
  const qs = $$('#xq blockquote');
  let qi = 0;
    const quote = i => { qi = (i + qs.length) % qs.length; qs.forEach((q, k) => q.classList.toggle('on', k === qi)); };
  $$('#xq .xq__arr').forEach(b => b.addEventListener('click', () => quote(qi + +b.dataset.d)));

  /* ── услуги: список переключает кадр, картинки внутри услуги сменяются сами ── */
  const sb = $$('.xsv__list button'), sm = $$('.xsv__m');
  let si = 0, sTimer = 0;
  const svc = i => {
    si = i;
    sb.forEach((b, k) => b.classList.toggle('on', k === i));
    sm.forEach((m, k) => { m.classList.toggle('on', k === i); const v = m.querySelector('video'); if (v) { if (k === i) { v.preload = 'auto'; v.play().catch(() => {}); } else v.pause(); } });
  };
  sb.forEach((b, k) => { b.addEventListener('click', () => svc(k)); b.addEventListener('pointerenter', () => { if (matchMedia('(hover:hover)').matches) svc(k); }); });
  if (!RM) sTimer = setInterval(() => {
    const imgs = $$('img', sm[si]); if (imgs.length < 2) return;
    const c = imgs.findIndex(im => im.classList.contains('on'));
    imgs.forEach((im, k) => im.classList.toggle('on', k === (c + 1) % imgs.length));
  }, 1800);

  /* ── календарь грузится, когда до секции созвона остаётся 2 экрана ── */
  let calBooted = false;
  function bootCal() {
    if (calBooted) return; calBooted = true;
    (function (C, A, L) { let p = function (a, ar) { a.q.push(ar); }; let d = C.document; C.Cal = C.Cal || function () { let cal = C.Cal; let ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement('script')).src = A; cal.loaded = true; } if (ar[0] === L) { const api = function () { p(api, arguments); }; const namespace = ar[1]; api.q = api.q || []; if (typeof namespace === 'string') { cal.ns[namespace] = cal.ns[namespace] || api; p(cal.ns[namespace], ar); p(cal, ['initNamespace', namespace]); } else p(cal, ar); return; } p(cal, ar); }; })(window, 'https://app.cal.com/embed/embed.js', 'init');
    Cal('init', '30min', { origin: 'https://cal.com' });
    Cal.ns['30min']('inline', { elementOrSelector: '#xCal', config: { layout: 'month_view', theme: 'light' }, calLink: 'unrootdesign/30min' });
    Cal.ns['30min']('ui', { theme: 'light', hideEventTypeDetails: false, layout: 'month_view', cssVarsPerTheme: { light: { 'cal-brand': '#8961E7' } } });
  }

  function onScroll() {
    const nowVis = hero.getBoundingClientRect().bottom > 0;
    if (nowVis !== heroVisible) { heroVisible = nowVis; if (nowVis) { if (!paused) resume(); } else { const p = paused; pause(); paused = p; } }
    if ($('#team').getBoundingClientRect().top < innerHeight * 2) bootCal();
  }
  let st = false;
  addEventListener('scroll', () => { if (!st) { st = true; requestAnimationFrame(() => { st = false; onScroll(); }); } }, { passive: true });
  onScroll();

  // старые ссылки вида /#offer, /#concepts ведут к нужной секции
  const ALIAS = { offer: 'concept', concepts: 'concept', about: 'team', contact: 'team' };
  const h = location.hash.slice(1);
  if (ALIAS[h]) addEventListener('load', () => document.getElementById(ALIAS[h])?.scrollIntoView({ behavior: 'auto' }));
})();
