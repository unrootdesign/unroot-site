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

  /* ── процесс: над шагами тонкая линия из точек, по ней всё время бегут импульсы слева направо.
     По кругу: звёздочки слетаются и собирают маленькую сферу над первым шагом, их тянет вправо в сферу побольше
     над вторым, потом в самую большую над третьим, из неё лучи уходят дальше. Потом всё гаснет и начинается заново.
     Точки такие же, как у курсора и звёзд в футере: мягкое свечение и изредка четырёхлучевые искры.
     Сферы из случайных точек на поверхности шара, шар медленно вращается: ближние точки ярче и крупнее.
     Рисуем только пока полоса на экране. ── */
  const flow = $('.xpr__flow');
  if (flow) {
    const c = flow.getContext('2d');
    const css = getComputedStyle(document.documentElement);
    const rgb = (v, d) => { const n = parseInt((css.getPropertyValue(v).trim() || d).slice(1), 16); return `${n >> 16 & 255},${n >> 8 & 255},${n & 255}`; };
    const VI = rgb('--violet', '#8961E7'), VD = rgb('--violet-d', '#6A43D1'), VL = rgb('--violet-lt', '#B9A2F5');
    // спрайты как у курсора: мягкая точка двух оттенков и искра
    const sprite = (core, glow, spark) => {
      const s = document.createElement('canvas'); s.width = s.height = 64; const g2 = s.getContext('2d');
      const g = g2.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, core); g.addColorStop(.16, core); g.addColorStop(.42, glow); g.addColorStop(1, 'rgba(0,0,0,0)');
      g2.fillStyle = g; g2.fillRect(0, 0, 64, 64);
      if (spark) { g2.fillStyle = core; g2.beginPath();
        g2.moveTo(32, 2); g2.quadraticCurveTo(34, 30, 62, 32); g2.quadraticCurveTo(34, 34, 32, 62); g2.quadraticCurveTo(30, 34, 2, 32); g2.quadraticCurveTo(30, 30, 32, 2); g2.fill(); }
      return s;
    };
    const SP = [sprite(`rgba(${VI},1)`, `rgba(${VI},.28)`), sprite(`rgba(${VD},1)`, `rgba(${VI},.22)`), sprite(`rgba(${VI},1)`, `rgba(${VL},.3)`, true)];
    const steps = $$('.xpr > li');
    const T = 12;                                   // секунд в одном круге
    const WIN = [[.4, 2.3], [2.7, 4.7], [5.1, 7.3]]; // когда вылетают звёздочки к каждой сфере
    const RAYS = [7.4, 9.6], FADE = [9.9, 11.3];
    const rnd = (a, b) => a + Math.random() * (b - a);
    const ease = x => x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
    let W = 0, H = 0, D = 1, C = [], P = [], R = [], IMP = [], DUST = [], clock = 0, on = false, last = 0, nextImp = 0;
    const bez = (p, u, tx, ty) => { const v = 1 - u; return [v * v * p.sx + 2 * v * u * p.mx + u * u * tx, v * v * p.sy + 2 * v * u * p.my + u * u * ty]; };
    const star = (img, x, y, s, a) => { if (a <= .01) return; c.globalAlpha = Math.min(1, a); c.drawImage(img, x - s, y - s, s * 2, s * 2); };
    function layout() {
      D = Math.min(devicePixelRatio || 1, 2); W = flow.clientWidth; H = flow.clientHeight;
      flow.width = Math.round(W * D); flow.height = Math.round(H * D);
      const fl = flow.getBoundingClientRect().left, cy = H / 2, rs = [H * .15, H * .24, H * .36];
      let xs = steps.map(li => li.getBoundingClientRect().left - fl);
      // на телефоне шаги стоят друг под другом, тогда сферы расставляем по ширине сами
      if (xs.length < 3 || xs[1] - xs[0] < rs[0] + rs[1] + 30) xs = [W * .04, W * .3, W * .56];
      C = rs.map((r, k) => ({ x: xs[k] + r + 2, y: cy, r, spin: .25 + k * .07 }));
      build();
      // импульсы уже бегут, когда полоса появляется на экране
      if (!IMP.length) for (let i = 0; i < 6; i++) IMP.push({ x: rnd(0, W), y: H / 2 + rnd(-3, 3), v: rnd(70, 110), s: rnd(2.6, 3.4) });
    }
    // точка сферы на экране: поворот вокруг вертикальной оси, лёгкий наклон, глубина даёт яркость и размер
    function sph(ci, p, t) {
      const ang = t * ci.spin, ca = Math.cos(ang), sa = Math.sin(ang);
      const x = p.ux * ca + p.uz * sa, z0 = -p.ux * sa + p.uz * ca;
      const y = p.uy * .94 - z0 * .34, z = p.uy * .34 + z0 * .94;
      return [ci.x + x * ci.r * p.rr, ci.y + y * ci.r * p.rr, (z + 1) / 2];
    }
    function build() {
      P = []; R = [];
      C.forEach((ci, k) => {
        const cnt = Math.round(ci.r * ci.r / 8), [w0, w1] = WIN[k], prev = C[k - 1];
        for (let i = 0; i < cnt; i++) {
          const u = rnd(-1, 1), th = rnd(0, Math.PI * 2), q = Math.sqrt(1 - u * u);
          const p = { k, ux: q * Math.cos(th), uy: u, uz: q * Math.sin(th), rr: Math.random() < .1 ? rnd(.55, .92) : rnd(.95, 1.02),
            img: Math.random() < .05 ? 2 : (Math.random() < .5 ? 0 : 1), sz: rnd(2.2, 3.6), f: rnd(1.5, 4), ph: rnd(0, 6.3) };
          if (p.img === 2) p.sz = rnd(4, 5.5);
          if (prev) { const e = rnd(-1.2, 1.2); p.sx = prev.x + Math.cos(e) * prev.r * .9; p.sy = prev.y + Math.sin(e) * prev.r * .9; }
          else { p.sx = rnd(-30, ci.x + ci.r * 4); p.sy = Math.random() < .5 ? rnd(-10, H * .25) : rnd(H * .75, H + 10); }
          p.mx = (p.sx + ci.x) / 2 + rnd(-20, 20); p.my = ci.y + rnd(-1, 1) * H * (prev ? .22 : .35);
          p.t0 = rnd(w0, w1); p.dur = rnd(1, 1.5);
          P.push(p);
        }
      });
      // продолжения: из большой сферы звёздочки уходят дальше вправо веером
      const h = C[2], L = Math.max(60, W - h.x - h.r + 40);
      for (let j = 0; j < 7; j++) {
        const e = (j / 6 - .5) * 1.1;
        for (let q = 0; q < 22; q++) {
          const sx = h.x + Math.cos(e) * h.r, sy = h.y + Math.sin(e) * h.r;
          R.push({ sx, sy, tx: sx + Math.cos(e) * L, ty: sy + Math.sin(e * 1.3) * L * .5, mx: sx + Math.cos(e) * L * .5, my: sy + Math.sin(e) * L * .3,
            t0: rnd(RAYS[0], RAYS[1]), dur: rnd(1.2, 1.8), img: Math.random() < .1 ? 2 : 0, sz: rnd(2.4, 3.4) });
        }
      }
    }
    layout();
    addEventListener('resize', layout); addEventListener('load', layout);
    // пыль: точка, которую оставляет летящая звёздочка, держится и гаснет, как след курсора
    const dust = (x, y, s) => { if (DUST.length < 700) DUST.push({ x, y, vx: rnd(-6, 6), vy: rnd(-6, 6), s: s * rnd(.6, .9), b: 0, life: rnd(.5, 1), img: Math.random() < .5 ? 0 : 1 }); };
    function draw(t, dt) {
      c.setTransform(D, 0, 0, D, 0, 0); c.clearRect(0, 0, W, H);
      const cy = H / 2;
      // тонкая линия из точек
      for (let x = 3; x < W; x += 9) star(SP[1], x, cy, 1.7, .3 + .12 * Math.sin(x * .05 - t * 2));
      // импульсы: бегут по линии всё время, у правого края ускоряются, будто их что-то тянет
      if (t >= nextImp || nextImp - t > 2) { IMP.push({ x: -10, y: cy + rnd(-3, 3), v: rnd(70, 110), s: rnd(2.6, 3.4) }); nextImp = t + rnd(.35, .8); }
      for (let i = IMP.length - 1; i >= 0; i--) {
        const m = IMP[i]; m.x += m.v * (1 + m.x / W * 1.6) * dt;
        if (m.x > W + 10) { IMP.splice(i, 1); continue; }
        star(SP[0], m.x, m.y, m.s, .9); if (Math.random() < .6) dust(m.x, m.y + rnd(-1.5, 1.5), m.s);
      }
      const f = Math.min(1, Math.max(0, (t - FADE[0]) / (FADE[1] - FADE[0]))), g = 1 - f;
      if (g > 0) {
        for (const p of P) {
          if (t < p.t0) continue;
          const ci = C[p.k], u = (t - p.t0) / p.dur, sp = 1 + f * .15;
          let [x, y, z] = sph(ci, p, t); x = ci.x + (x - ci.x) * sp; y = ci.y + (y - ci.y) * sp;
          const tw = .7 + .3 * Math.sin(t * p.f + p.ph);
          if (u < 1) {
            const [bx, by] = bez(p, ease(u), x, y);
            star(SP[p.img], bx, by, p.sz, .95 * g); if (Math.random() < .35) dust(bx, by, p.sz);
          } else {
            const pop = Math.max(0, 1 - (u - 1) * 3);   // вспышка в момент прилёта
            star(SP[p.img], x, y, p.sz * (.55 + .55 * z) + pop * 1.5, (.18 + .82 * z * z) * tw * g + pop * .4);
          }
        }
        for (const p of R) {
          if (t < p.t0) continue;
          const u = (t - p.t0) / p.dur; if (u >= 1) continue;
          const [x, y] = bez(p, ease(u), p.tx, p.ty);
          star(SP[p.img], x, y, p.sz, (1 - u) * g); if (Math.random() < .3) dust(x, y, p.sz * (1 - u * .5));
        }
      }
      for (let i = DUST.length - 1; i >= 0; i--) {
        const d = DUST[i]; d.b += dt; const age = d.b / d.life;
        if (age >= 1) { DUST.splice(i, 1); continue; }
        if (d.b > .15) { d.x += d.vx * dt; d.y += d.vy * dt; }
        star(SP[d.img], d.x, d.y, d.s, .7 * (1 - age * age));
      }
      c.globalAlpha = 1;
    }
    function frame(ts) {
      if (!on) { last = 0; return; }
      const dt = last ? Math.min(.05, (ts - last) / 1000) : .016; last = ts;
      const prev = clock; clock = (clock + dt) % T; if (clock < prev) nextImp = 0;
      draw(clock, dt);
      requestAnimationFrame(frame);
    }
    new IntersectionObserver(es => es.forEach(e => {
      const was = on; on = e.isIntersecting;
      if (RM) { if (on) { layout(); draw(9, 0); } on = false; return; }   // без анимации: линия и три собранные сферы
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
