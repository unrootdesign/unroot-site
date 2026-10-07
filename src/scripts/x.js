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

  /* ── процесс: над шагами полоса. Частицы летят слева направо, проходят через 2 станции (концепт и дизайн)
     и затягиваются в воронку над третьим шагом. Станции растут от шага к шагу. Рисуем только пока полоса на экране. ── */
  const flow = $('.xpr__flow');
  if (flow) {
    const c = flow.getContext('2d');
    const VIO = getComputedStyle(document.documentElement).getPropertyValue('--violet').trim() || '#8961E7';
    const n = parseInt(VIO.slice(1), 16), vr = n >> 16 & 255, vg = n >> 8 & 255, vb = n & 255;
    const V = a => `rgba(${vr},${vg},${vb},${a})`;
    let W = 0, H = 0, D = 1, ST = [], P = [], on = false, last = 0;
    const steps = $$('.xpr > li');
    function layout() {
      D = Math.min(devicePixelRatio || 1, 2); W = flow.clientWidth; H = flow.clientHeight;
      flow.width = Math.round(W * D); flow.height = Math.round(H * D);
      const fl = flow.getBoundingClientRect().left, cy = H / 2;
      const rs = [H * .09, H * .17, H * .3];
      // станция стоит над началом своего шага, левым краем вровень с текстом
      ST = steps.map((li, k) => { const r = rs[k] || rs[2]; return { x: li.getBoundingClientRect().left - fl + r + 2, y: cy, r, k }; });
    }
    const spawn = (p, fresh) => {
      p.x = fresh ? Math.random() * (ST[2] ? ST[2].x : W) : -8 - Math.random() * 40;
      p.y = H / 2 + (Math.random() - .5) * H * .7; p.vx = 50 + Math.random() * 60; p.vy = (Math.random() - .5) * 20;
      p.px = p.x; p.py = p.y; p.a = .55 + Math.random() * .45;
    };
    layout(); for (let i = 0; i < 230; i++) { const p = {}; spawn(p, true); P.push(p); }
    addEventListener('resize', layout); addEventListener('load', layout);
    function ringDots(st, r, count, t, rot, alpha, size) {
      for (let i = 0; i < count; i++) {
        const ang = i / count * Math.PI * 2 + rot, tw = .6 + .4 * Math.sin(t * .004 + i * 1.3);
        c.fillStyle = V(alpha * tw); const s = size * (.8 + .4 * tw);
        c.fillRect(st.x + Math.cos(ang) * r - s / 2, st.y + Math.sin(ang) * r - s / 2, s, s);
      }
    }
    function frame(t) {
      if (!on) { last = 0; return; }
      const dt = last ? Math.min(.05, (t - last) / 1000) : .016; last = t;
      c.setTransform(D, 0, 0, D, 0, 0); c.clearRect(0, 0, W, H);
      const hole = ST[ST.length - 1];
      // тонкая линия процесса
      c.strokeStyle = 'rgba(18,17,22,.08)'; c.lineWidth = 1; c.beginPath(); c.moveTo(0, H / 2); c.lineTo(hole.x, H / 2); c.stroke();
      // частицы
      c.lineWidth = 1.8; c.lineCap = 'round';
      for (const p of P) {
        p.px = p.x; p.py = p.y;
        let ax = 18, ay = (H / 2 - p.y) * .8;
        for (const st of ST) {
          const dx = st.x - p.x, dy = st.y - p.y, d = Math.hypot(dx, dy) || 1;
          if (st === hole) {
            // воронка: сильное притяжение и закрутка
            const g = 60000 / (d * d + 400); ax += dx / d * g - dy / d * g * .9; ay += dy / d * g + dx / d * g * .9;
            if (d < 7) { spawn(p, false); break; }
          } else if (d < st.r * 3) { const g = 900 * (st.k + 1) / (d + 20); ax += dx / d * g * .3; ay += dy / d * g * .3; }
        }
        p.vx = (p.vx + ax * dt) * .992; p.vy = (p.vy + ay * dt) * .985;
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.x > W + 10 || p.y < -20 || p.y > H + 20) spawn(p, false);
        const dh = Math.hypot(hole.x - p.x, hole.y - p.y), near = Math.max(0, 1 - dh / (hole.r * 2.4));
        c.strokeStyle = V(p.a * (.6 + near * .4)); c.beginPath(); c.moveTo(p.px - (p.x - p.px) * 2, p.py - (p.y - p.py) * 2); c.lineTo(p.x, p.y); c.stroke();
      }
      // станции: кольца из точек, у каждой следующей больше и ярче
      ST.forEach(st => {
        if (st === hole) return;
        ringDots(st, st.r, Math.round(st.r * 1.6), t, t * .0004 * (st.k + 1), .55 + st.k * .2, 2);
        c.fillStyle = V(.8); c.beginPath(); c.arc(st.x, st.y, 2.5 + st.k, 0, 7); c.fill();
      });
      // воронка: кольца крутятся, в центре тёмное ядро со светящимся краем
      ringDots(hole, hole.r, 72, t, t * .0009, .7, 2.2);
      ringDots(hole, hole.r * .72, 54, t, -t * .0014, .55, 1.8);
      ringDots(hole, hole.r * .46, 36, t, t * .002, .45, 1.6);
      const g = c.createRadialGradient(hole.x, hole.y, 0, hole.x, hole.y, hole.r * .38);
      g.addColorStop(0, 'rgba(18,17,22,.95)'); g.addColorStop(.6, 'rgba(18,17,22,.85)'); g.addColorStop(.85, V(.55)); g.addColorStop(1, V(0));
      c.fillStyle = g; c.beginPath(); c.arc(hole.x, hole.y, hole.r * .38, 0, 7); c.fill();
      if (!RM) requestAnimationFrame(frame);
    }
    new IntersectionObserver(es => es.forEach(e => {
      const was = on; on = e.isIntersecting;
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
