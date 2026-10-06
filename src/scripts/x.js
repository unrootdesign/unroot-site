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
  // один и тот же список проектов в обоих режимах, номер текущего общий
  const names = $$('.xc__names button', hero);
  let cur = 0;
  const BA_DUR = 4500, RATE = 1.5;
  let mode = hero.dataset.mode || 'anim', paused = false, heroVisible = true, baTimer = 0, baLeft = BA_DUR, baAt = 0;
  const videos = items.anim.map(v => v.querySelector('video'));
  videos.forEach((el, k) => {
    el.defaultPlaybackRate = RATE; el.playbackRate = RATE;
    // следующее видео начинается ровно в момент, когда закончилось текущее
    el.addEventListener('ended', () => { if (mode === 'anim' && k === cur) show(cur + 1); });
  });
  const vid = () => videos[cur];
  const canPlay = () => heroVisible && !paused;
  function warm(el) { if (el && el.preload !== 'auto') { el.preload = 'auto'; el.load(); el.playbackRate = RATE; } }

  function show(i, m = mode) {
    const n = items[m].length; cur = (i + n) % n;
    ['anim', 'ba'].forEach(md => items[md].forEach((x, k) => x.classList.toggle('on', k === cur)));
    names.forEach((b, k) => b.classList.toggle('on', k === cur));
    const next = items[m][(cur + 1) % n];
    items[m][cur].querySelectorAll('img').forEach(im => im.loading = 'eager');
    next.querySelectorAll('img').forEach(im => im.loading = 'eager');
    clearTimeout(baTimer);
    videos.forEach((el, k) => {
      if (m === 'anim' && k === cur) { warm(el); el.currentTime = 0; el.playbackRate = RATE; if (canPlay()) el.play().catch(() => {}); }
      else el.pause();
    });
    if (m === 'anim') warm(videos[(cur + 1) % videos.length]);
    else { baLeft = BA_DUR; baRun(); }
  }
  function baRun() { clearTimeout(baTimer); if (RM || mode !== 'ba' || !canPlay()) return; baAt = performance.now(); baTimer = setTimeout(() => show(cur + 1), baLeft); }
  function pause() { if (paused) return; paused = true; if (mode === 'anim') vid()?.pause(); else { clearTimeout(baTimer); baLeft = Math.max(400, baLeft - (performance.now() - baAt)); } }
  function resume() { paused = false; if (!heroVisible) return; if (mode === 'anim') vid()?.play().catch(() => {}); else baRun(); }

  // табы «Animated» и «Before / after»; проект при переключении остаётся тот же
  const tabs = $$('.xc__mode button', hero);
  // высота сцены своя у каждого режима: у видео ровно 16:9 плюс строка названий, у до и после выше; меняется плавно
  const stageEl = $('.xhero__stage', hero);
  function fit() {
    if (!stageEl) return;
    if (mode === 'anim') stageEl.style.height = Math.round(stageEl.clientWidth * 9 / 16 + 44) + 'px';
    else stageEl.style.height = '';
  }
  function setMode(m) {
    mode = m; hero.dataset.mode = m;
    tabs.forEach(b => b.setAttribute('aria-selected', String(b.dataset.mode === m)));
    fit();
    show(cur);
  }
  fit();
  addEventListener('resize', fit);
  tabs.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
  names.forEach(b => b.addEventListener('click', () => show(+b.dataset.i)));
  // при наведении не останавливаемся: концепты идут всегда
  hero.dataset.mode = mode;
  show(0);
  // страховка: если видео не грузится или застряло на 3 секунды, переходим к следующему
  let lastT = -1, stall = 0;
  setInterval(() => {
    if (mode !== 'anim' || !canPlay()) { stall = 0; return; }
    const t = vid()?.currentTime ?? 0;
    stall = t === lastT ? stall + 500 : 0; lastT = t;
    if (stall >= 3000) { stall = 0; show(cur + 1); }
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

  $$('.xg').forEach(g => g.addEventListener('click', e => {
    if (e.defaultPrevented || e.target.closest('a, .xg__thumbs')) return;
    const href = $('.xg__main', g)?.getAttribute('href'); if (href) location.href = href;
  }));

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

  /* ── процесс: у каждого шага круг из точек. С каждым шагом круг больше и заполнен сильнее,
     по заполненной части бегут импульсы, у последнего шага круг полный и от него расходятся волны.
     Рисуем только пока круги на экране. ── */
  const orbs = $$('.xpr__orb');
  if (orbs.length) {
    const css = getComputedStyle(document.documentElement);
    const VIO = css.getPropertyValue('--violet').trim() || '#8961E7';
    const INK = 'rgba(18,17,22,';
    const hex = h => { const n = parseInt(h.replace('#', ''), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
    const [vr, vg, vb] = hex(VIO);
    const V = a => `rgba(${vr},${vg},${vb},${a})`;
    const st = orbs.map(cv => ({ cv, ctx: cv.getContext('2d'), k: +cv.dataset.step, n: +cv.dataset.of, w: 0, h: 0, d: 1, grow: 0, on: false, seen: false }));
    const size = () => st.forEach(o => {
      o.d = Math.min(devicePixelRatio || 1, 2); o.w = o.cv.clientWidth; o.h = o.cv.clientHeight;
      o.cv.width = Math.round(o.w * o.d); o.cv.height = Math.round(o.h * o.d);
    });
    size(); addEventListener('resize', size);
    // точки кольца: радиус, количество, доля заполнения
    function ring(o, t, r, count, fill, phase, bright) {
      const c = o.ctx, cx = o.w / 2, cy = o.h / 2;
      for (let i = 0; i < count; i++) {
        const u = i / count, ang = -Math.PI / 2 + u * Math.PI * 2;
        const x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r;
        if (u <= fill) {
          const tw = .55 + .45 * Math.sin(t * .003 + i * 1.7 + phase);
          c.fillStyle = V((.35 + .55 * tw) * bright);
          const s = 2 + tw * 1.4; c.fillRect(x - s / 2, y - s / 2, s, s);
        } else { c.fillStyle = INK + '.16)'; c.fillRect(x - 1, y - 1, 2, 2); }
      }
    }
    function frame(t) {
      st.forEach(o => {
        if (!o.on || !o.w) return;
        const c = o.ctx; c.setTransform(o.d, 0, 0, o.d, 0, 0); c.clearRect(0, 0, o.w, o.h);
        // заполнение плавно растёт, когда круг появился на экране
        o.grow = Math.min(1, o.grow + (RM ? 1 : .012));
        const ease = 1 - Math.pow(1 - o.grow, 3);
        const level = (o.k + 1) / o.n, base = Math.min(o.w, o.h) * .46, R = base * (.5 + .5 * level);
        const fill = level * ease, cx = o.w / 2, cy = o.h / 2;
        // внешнее кольцо и внутренние: у первого шага 1 кольцо, дальше больше
        ring(o, t, R, 96, fill, 0, 1);
        for (let j = 1; j <= o.k; j++) ring(o, t, R * (1 - j * .24), Math.round(96 * (1 - j * .24)), Math.min(1, fill * (1 + j * .15)), j * 2, .8);
        // ядро
        const core = 3 + level * 5 + Math.sin(t * .004) * 1;
        const g = c.createRadialGradient(cx, cy, 0, cx, cy, core * 4);
        g.addColorStop(0, V(.9)); g.addColorStop(.25, V(.35)); g.addColorStop(1, V(0));
        c.fillStyle = g; c.beginPath(); c.arc(cx, cy, core * 4, 0, Math.PI * 2); c.fill();
        // импульсы бегут по заполненной части кольца
        if (fill > .02 && !RM) for (let p = 0; p < 1 + o.k; p++) {
          const head = ((t * .00018 * (1 + p * .35) + p / (1 + o.k)) % 1) * fill;
          for (let q = 0; q < 14; q++) {
            const u = head - q * .006; if (u < 0) break;
            const ang = -Math.PI / 2 + u * Math.PI * 2, a = (1 - q / 14);
            c.fillStyle = q === 0 ? 'rgba(255,255,255,.95)' : V(.8 * a);
            const s = q === 0 ? 4 : 3 * a + .6;
            c.fillRect(cx + Math.cos(ang) * R - s / 2, cy + Math.sin(ang) * R - s / 2, s, s);
          }
        }
        // последний шаг: круг замкнулся, от него расходятся волны из точек
        if (o.k === o.n - 1 && ease > .98 && !RM) for (let wv = 0; wv < 2; wv++) {
          const ph = ((t * .00035) + wv * .5) % 1, rr = R * (1 + ph * .55), a = (1 - ph) * .5;
          for (let i = 0; i < 64; i++) { const ang = i / 64 * Math.PI * 2; c.fillStyle = V(a); c.fillRect(cx + Math.cos(ang) * rr - .8, cy + Math.sin(ang) * rr - .8, 1.6, 1.6); }
        }
      });
      if (st.some(o => o.on)) requestAnimationFrame(frame); else running = false;
    }
    let running = false;
    const io = new IntersectionObserver(es => {
      es.forEach(e => { const o = st.find(x => x.cv === e.target); o.on = e.isIntersecting; });
      if (!running && st.some(o => o.on)) { running = true; requestAnimationFrame(frame); }
    }, { threshold: .2 });
    st.forEach(o => io.observe(o.cv));
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

  // подпись «case studies» стоит по центру экрана, пока на экране секция работ, потом гаснет
  const csBg = $('.xwork__bg'), work = $('#work');
  function onScroll() {
    if (csBg && work) { const r = work.getBoundingClientRect(); csBg.classList.toggle('on', r.top < innerHeight * .3 && r.bottom > innerHeight * .7); }
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
