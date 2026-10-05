/* Экспериментальная главная: в герое концепты сменяются сами (сначала анимированные, по клику до и после),
   внизу список проектов, у текущего полоска показывает время до следующего. Лента работ едет сама,
   при наведении на маленький кадр он встаёт на место главного. «После запуска» оживает по прокрутке. */
(() => {
  if (!document.body.classList.contains('x')) return;
  const RM = matchMedia('(prefers-reduced-motion:reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ── герой ── */
  const hero = $('.xhero');
  const items = { anim: $$('.xc__vid', hero), ba: $$('.xc__pair', hero) };
  const names = { anim: $$('.xc__names--anim button', hero), ba: $$('.xc__names--ba button', hero) };
  const idx = { anim: 0, ba: 0 };
  const BA_DUR = 4500, ANIM_MAX = 12000;
  let mode = hero.dataset.mode || 'anim', paused = false, heroVisible = true, t0 = 0, spent = 0, raf = 0;

  const vid = () => items.anim[idx.anim]?.querySelector('video');
  // длительность текущего кадра: у видео его собственная (но не дольше 12 секунд), у до и после 4.5 секунды
  const dur = () => mode === 'anim' ? Math.min(((vid()?.duration) || 8) * 1000, ANIM_MAX) : BA_DUR;

  function show(i, m = mode) {
    const n = items[m].length; idx[m] = (i + n) % n;
    items[m].forEach((x, k) => x.classList.toggle('on', k === idx[m]));
    names[m].forEach((b, k) => { b.classList.toggle('on', k === idx[m]); b.style.setProperty('--p', 0); });
    const cur = items[m][idx[m]], next = items[m][(idx[m] + 1) % n];
    cur.querySelectorAll('img').forEach(im => im.loading = 'eager');
    next.querySelectorAll('img').forEach(im => im.loading = 'eager');
    items.anim.forEach((v, k) => {
      const el = v.querySelector('video');
      if (m === 'anim' && k === idx.anim) { el.preload = 'auto'; el.currentTime = 0; if (heroVisible && !paused) el.play().catch(() => {}); }
      else el.pause();
    });
    const nv = items.anim[(idx.anim + 1) % items.anim.length]?.querySelector('video'); if (nv && m === 'anim') nv.preload = 'auto';
    t0 = performance.now(); spent = 0;
    loop();
  }
  // полоска под названием и переход к следующему проекту
  function loop() {
    cancelAnimationFrame(raf);
    if (RM) return;
    raf = requestAnimationFrame(function tick(now) {
      if (!paused && heroVisible) spent += now - t0;
      t0 = now;
      const p = Math.min(spent / dur(), 1);
      names[mode][idx[mode]]?.style.setProperty('--p', p);
      if (p >= 1) { show(idx[mode] + 1); return; }
      raf = requestAnimationFrame(tick);
    });
  }
  function setMode(m) {
    mode = m; hero.dataset.mode = m;
    $$('.xc__mode button', hero).forEach(b => b.setAttribute('aria-selected', String(b.dataset.mode === m)));
    show(idx[m]);
  }
  $$('.xc__mode button', hero).forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
  ['anim', 'ba'].forEach(m => names[m].forEach(b => b.addEventListener('click', () => show(+b.dataset.i, m))));
  const stage = $('.xhero__stage', hero);
  stage.addEventListener('pointerenter', () => { paused = true; if (mode === 'anim') vid()?.pause(); });
  stage.addEventListener('pointerleave', () => { paused = false; if (mode === 'anim' && heroVisible) vid()?.play().catch(() => {}); });
  hero.dataset.mode = mode;
  show(0);

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
  // на телефоне лента останавливается, пока палец на ней
  const mq = $('.xmq__t');
  $('#xRow')?.addEventListener('touchstart', () => mq && (mq.style.animationPlayState = 'paused'), { passive: true });
  $('#xRow')?.addEventListener('touchend', () => mq && (mq.style.animationPlayState = ''), { passive: true });

  /* ── отзывы ── */
  const qs = $$('#xq blockquote'), qn = $('#xqn');
  let qi = 0;
  const pad = n => String(n).padStart(2, '0');
  const quote = i => { qi = (i + qs.length) % qs.length; qs.forEach((q, k) => q.classList.toggle('on', k === qi)); qn.textContent = `${pad(qi + 1)} / ${pad(qs.length)}`; };
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

  /* ── после запуска: импульс бежит по линии, шаги открываются, когда до них доходит ── */
  const ho = $('#xHo'), hoItems = ho ? $$('li', ho) : [];
  function handover() {
    if (!ho) return;
    const r = ho.getBoundingClientRect(), mark = innerHeight * .62;
    const p = Math.max(0, Math.min(1, (mark - r.top) / r.height));
    ho.style.setProperty('--p', p.toFixed(4));
    hoItems.forEach(li => { if (li.getBoundingClientRect().top < mark) li.classList.add('in'); });
  }

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
    if (nowVis !== heroVisible) { heroVisible = nowVis; if (mode === 'anim') { if (nowVis && !paused) vid()?.play().catch(() => {}); else vid()?.pause(); } }
    handover();
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
