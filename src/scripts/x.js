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

  /* ── процесс: над шагами полоса, анимация по кругу. Кругов по умолчанию нет: частицы слетаются слева и собирают
     круг над первым шагом, потом летят вправо и собирают круг побольше над вторым, потом самый большой над третьим.
     Из третьего частицы уходят дальше вправо лучами. Потом всё гаснет и начинается заново.
     Рисуем только пока полоса на экране. ── */
  const flow = $('.xpr__flow');
  if (flow) {
    const c = flow.getContext('2d');
    const VIO = getComputedStyle(document.documentElement).getPropertyValue('--violet').trim() || '#8961E7';
    const n = parseInt(VIO.slice(1), 16), vr = n >> 16 & 255, vg = n >> 8 & 255, vb = n & 255;
    const V = a => `rgba(${vr},${vg},${vb},${a})`;
    const steps = $$('.xpr > li');
    const T = 11;                                   // секунд в одном круге
    const WIN = [[0, 1.8], [2.2, 4.1], [4.5, 6.6]];  // когда вылетают частицы к каждому кругу
    const RAYS = [6.7, 8.9], FADE = [9.1, 10.4];
    const GOLD = Math.PI * (3 - Math.sqrt(5));
    const rnd = (a, b) => a + Math.random() * (b - a);
    const ease = x => 1 - Math.pow(1 - x, 3);
    let W = 0, H = 0, D = 1, C = [], P = [], R = [], clock = 0, on = false, last = 0;
    const bez = (p, u) => { const v = 1 - u; return [v * v * p.sx + 2 * v * u * p.mx + u * u * p.tx, v * v * p.sy + 2 * v * u * p.my + u * u * p.ty]; };
    function layout() {
      D = Math.min(devicePixelRatio || 1, 2); W = flow.clientWidth; H = flow.clientHeight;
      flow.width = Math.round(W * D); flow.height = Math.round(H * D);
      const fl = flow.getBoundingClientRect().left, cy = H / 2, rs = [H * .15, H * .24, H * .36];
      let xs = steps.map(li => li.getBoundingClientRect().left - fl);
      // на телефоне шаги стоят друг под другом, тогда круги расставляем по ширине сами
      if (xs.length < 3 || xs[1] - xs[0] < rs[0] + rs[1] + 30) xs = [W * .04, W * .3, W * .56];
      C = rs.map((r, k) => ({ x: xs[k] + r + 2, y: cy, r }));
      build();
    }
    function build() {
      P = []; R = [];
      C.forEach((ci, k) => {
        const cnt = Math.round((ci.r / 3.3) ** 2), s = (ci.r - 1) / Math.sqrt(cnt), [w0, w1] = WIN[k], prev = C[k - 1];
        for (let i = 0; i < cnt; i++) {
          // точки круга по спирали подсолнуха: заполняется от центра к краю
          const ang = i * GOLD, rr = s * Math.sqrt(i + .5);
          const p = { tx: ci.x + Math.cos(ang) * rr, ty: ci.y + Math.sin(ang) * rr, k, i, a: .45 + .5 * (1 - rr / ci.r) };
          if (prev) { const e = rnd(-1.1, 1.1); p.sx = prev.x + Math.cos(e) * prev.r; p.sy = prev.y + Math.sin(e) * prev.r; }
          else { p.sx = rnd(-30, ci.x + ci.r * 5); p.sy = Math.random() < .5 ? rnd(-20, H * .2) : rnd(H * .8, H + 20); }
          const mx = (p.sx + p.tx) / 2, my = (p.sy + p.ty) / 2;
          p.mx = mx; p.my = my + rnd(-1, 1) * H * (prev ? .32 : .2);
          p.t0 = w0 + (i / cnt) * (w1 - w0) + rnd(0, .25); p.dur = rnd(.8, 1.25);
          P.push(p);
        }
      });
      // продолжения: из большого круга частицы уходят дальше вправо веером
      const h = C[2], L = Math.max(60, W - h.x - h.r + 30);
      for (let j = 0; j < 7; j++) {
        const e = (j / 6 - .5) * 1.2;
        for (let q = 0; q < 24; q++) {
          const sx = h.x + Math.cos(e) * h.r, sy = h.y + Math.sin(e) * h.r;
          R.push({ sx, sy, tx: sx + Math.cos(e) * L, ty: sy + Math.sin(e * 1.4) * L * .55, mx: sx + Math.cos(e) * L * .5, my: sy + Math.sin(e) * L * .35,
            t0: rnd(RAYS[0], RAYS[1]), dur: rnd(1, 1.6) });
        }
      }
    }
    layout();
    addEventListener('resize', layout); addEventListener('load', layout);
    function draw(t) {
      c.setTransform(D, 0, 0, D, 0, 0); c.clearRect(0, 0, W, H);
      const f = Math.min(1, Math.max(0, (t - FADE[0]) / (FADE[1] - FADE[0]))), g = 1 - f;
      if (g <= 0) return;
      c.lineCap = 'round'; c.lineWidth = 1.6;
      for (const p of P) {
        if (t < p.t0) continue;
        const u = (t - p.t0) / p.dur;
        if (u < 1) {
          const [x, y] = bez(p, ease(u)), [px, py] = bez(p, ease(Math.max(0, u - .035)));
          c.strokeStyle = V(.7 * g); c.beginPath(); c.moveTo(px, py); c.lineTo(x, y); c.stroke();
        } else {
          // собранная точка чуть дышит, а при затухании круг слегка расходится
          const ci = C[p.k], wob = Math.sin(t * 1.6 + p.i) * .35, sp = 1 + f * .18;
          const x = ci.x + (p.tx - ci.x) * sp + wob, y = ci.y + (p.ty - ci.y) * sp - wob;
          const pop = Math.max(0, 1 - (u - 1) * 4);   // вспышка в момент прилёта
          c.fillStyle = V(Math.min(1, p.a + pop * .4) * g); const z = 2 + pop;
          c.fillRect(x - z / 2, y - z / 2, z, z);
        }
      }
      for (const p of R) {
        if (t < p.t0) continue;
        const u = (t - p.t0) / p.dur; if (u >= 1) continue;
        const [x, y] = bez(p, ease(u)), [px, py] = bez(p, ease(Math.max(0, u - .09)));
        c.strokeStyle = V(.8 * (1 - u) * g); c.beginPath(); c.moveTo(px, py); c.lineTo(x, y); c.stroke();
      }
    }
    function frame(ts) {
      if (!on) { last = 0; return; }
      const dt = last ? Math.min(.05, (ts - last) / 1000) : .016; last = ts;
      clock = (clock + dt) % T; draw(clock);
      requestAnimationFrame(frame);
    }
    new IntersectionObserver(es => es.forEach(e => {
      const was = on; on = e.isIntersecting;
      if (RM) { if (on) { layout(); draw(8.2); } on = false; return; }   // без анимации: просто три собранных круга
      if (on && !was) { layout(); requestAnimationFrame(frame); }
    }), { threshold: .1 }).observe(flow);
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
