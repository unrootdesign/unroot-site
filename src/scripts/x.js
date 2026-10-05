/* Экспериментальная главная: 4 экрана, док снизу, коридор работ в перспективе.
   Движение только transform и opacity, анимация крутится, пока есть куда двигаться. */
(() => {
  const app = document.querySelector('.x-app'); if (!app) return;
  const RM = matchMedia('(prefers-reduced-motion:reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const pad = n => String(n).padStart(2, '0');
  const views = $$('.xv'), tabs = $$('.x-dock__tabs button');
  const crumb = $('#xCrumb'), count = $('#xCount'), prev = $('#xPrev'), next = $('#xNext');
  const NAMES = { works: 'Works', concepts: 'Concepts', about: 'About', contact: 'Contact' };
  const ALIAS = { work: 'works', concept: 'concepts', offer: 'concepts', reviews: 'about', pricing: 'about', team: 'contact', faq: 'about' };
  let view = 'works';

  /* ── коридор ── */
  const xw = $('#xw'), frames = $$('.xf', xw), hero = $('#xwHero'), hud = $('#xwHud'), huds = $$('.xw-hud__p', hud);
  const N = frames.length, STEP = 360;
  let cam = 0, target = 0, raf = 0, X = 0, FW = 520, ANG = 58, Z0 = 320, cur = -1;
  function layout() {
    const w = innerWidth, small = w < 760;
    FW = small ? Math.round(w * .74) : Math.round(Math.min(760, Math.max(300, w * .44)));
    X = small ? w * .46 : w * .345;
    ANG = small ? 52 : 60;
    Z0 = small ? 140 : 70;
    xw.style.setProperty('--fw', FW + 'px');
    paint();
  }
  function paint() {
    for (let i = 0; i < N; i++) {
      const f = frames[i], rel = i * STEP - cam, side = i % 2 ? 1 : -1;
      const near = Math.min(1, Math.max(0, (rel + STEP * .9) / (STEP * .6)));
      const far = Math.min(1, Math.max(0, (STEP * 15 - rel) / (STEP * 3)));
      const o = near * far;
      f.style.opacity = o.toFixed(3);
      f.style.visibility = o < .01 ? 'hidden' : 'visible';
      f.style.transform = `translate3d(${side * X}px,-50%,${-(rel + Z0)}px) rotateY(${-side * ANG}deg)`;
      f.style.zIndex = String(1000 - i);
    }
    const i = Math.max(0, Math.min(N - 1, Math.round(cam / STEP)));
    hero.classList.toggle('off', cam > STEP * .35);
    hud.classList.toggle('off', cam <= STEP * .35);
    if (i !== cur) {
      cur = i;
      const p = +frames[i].dataset.p;
      huds.forEach(h => h.classList.toggle('on', +h.dataset.p === p));
      if (view === 'works') setCount();
    }
  }
  function loop() {
    const d = target - cam;
    if (RM || Math.abs(d) < .4) { cam = target; paint(); raf = 0; return; }
    cam += d * .11; paint(); raf = requestAnimationFrame(loop);
  }
  const go = t => { target = Math.max(0, Math.min((N - 1) * STEP, t)); if (!raf) raf = requestAnimationFrame(loop); };
  let snapT = 0;
  const snapSoon = () => { clearTimeout(snapT); snapT = setTimeout(() => go(Math.round(target / STEP) * STEP), 170); };
  xw.addEventListener('wheel', e => {
    e.preventDefault();
    const k = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? innerHeight : 1;
    go(target + (Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX) * k * 1.1);
    snapSoon();
  }, { passive: false });
  // перетаскивание мышью и пальцем: вверх или влево значит вперёд
  let drag = null, moved = false;
  xw.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, t: target }; moved = false; });
  addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!moved && Math.hypot(dx, dy) > 6) { moved = true; xw.classList.add('drag'); }
    if (moved) go(drag.t - (Math.abs(dy) > Math.abs(dx) ? dy : dx) * 2.2);
  });
  addEventListener('pointerup', () => { if (!drag) return; drag = null; xw.classList.remove('drag'); if (moved) snapSoon(); });
  frames.forEach(f => f.addEventListener('click', e => {
    if (moved) { e.preventDefault(); return; }
    const i = +f.dataset.i;
    if (i !== cur) { e.preventDefault(); go(i * STEP); }   // первый клик подводит к кадру, второй открывает кейс
  }));
  addEventListener('resize', layout);
  layout();

  /* ── концепты: список переключает пары, слайдер ведётся мышью и остаётся на месте ── */
  const pairs = $$('.xc__pair'), pbtn = $$('.xc__list button'), bst = $('.xc .ba__stage');
  let pi = 0;
  function setPair(i) {
    pi = (i + pairs.length) % pairs.length;
    pairs.forEach((p, k) => p.classList.toggle('on', k === pi));
    pbtn.forEach((b, k) => b.classList.toggle('on', k === pi));
    pairs[pi].querySelectorAll('img').forEach(im => im.loading = 'eager');
    if (view === 'concepts') setCount();
  }
  pbtn.forEach(b => b.addEventListener('click', () => setPair(+b.dataset.i)));
  if (bst) {
    const card = bst.closest('figure');
    const set = x => { const r = bst.getBoundingClientRect(); bst.style.setProperty('--sp', Math.max(0, Math.min(100, (x - r.left) / r.width * 100)) + '%'); };
    card.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' || bst.hasPointerCapture(e.pointerId)) set(e.clientX); });
    bst.addEventListener('pointerdown', e => { bst.setPointerCapture(e.pointerId); set(e.clientX); });
    bst.addEventListener('pointermove', e => { if (bst.hasPointerCapture(e.pointerId)) set(e.clientX); });
  }

  /* ── о студии: 4 карточки, активная выпрямляется ── */
  const xa = $('#xa'), cols = $$('.xa__col', xa);
  let ci = 0;
  function setCard(i, scroll = true) {
    ci = Math.max(0, Math.min(cols.length - 1, i));
    cols.forEach((c, k) => c.classList.toggle('on', k === ci));
    if (scroll && xa.scrollWidth > xa.clientWidth + 4) cols[ci].scrollIntoView({ behavior: RM ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
    if (view === 'about') setCount();
  }
  cols.forEach((c, k) => c.addEventListener('pointerenter', () => { if (matchMedia('(hover:hover)').matches) setCard(k, false); }));
  let st = 0;
  xa.addEventListener('scroll', () => { clearTimeout(st); st = setTimeout(() => {
    if (xa.scrollWidth <= xa.clientWidth + 4) return;
    const mid = xa.scrollLeft + xa.clientWidth / 2;
    let best = 0, bd = 1e9; cols.forEach((c, k) => { const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = k; } });
    if (best !== ci) setCard(best, false);
  }, 90); });
  // отзывы
  const qs = $$('#xq blockquote'), dots = $$('#xq .xa__dots button');
  dots.forEach(d => d.addEventListener('click', () => { const i = +d.dataset.i; qs.forEach((q, k) => q.classList.toggle('on', k === i)); dots.forEach((x, k) => x.classList.toggle('on', k === i)); }));

  /* ── контакт: календарь грузится при первом открытии ── */
  let calBooted = false;
  function bootCal() {
    if (calBooted) return; calBooted = true;
    (function (C, A, L) { let p = function (a, ar) { a.q.push(ar); }; let d = C.document; C.Cal = C.Cal || function () { let cal = C.Cal; let ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement('script')).src = A; cal.loaded = true; } if (ar[0] === L) { const api = function () { p(api, arguments); }; const namespace = ar[1]; api.q = api.q || []; if (typeof namespace === 'string') { cal.ns[namespace] = cal.ns[namespace] || api; p(cal.ns[namespace], ar); p(cal, ['initNamespace', namespace]); } else p(cal, ar); return; } p(cal, ar); }; })(window, 'https://app.cal.com/embed/embed.js', 'init');
    Cal('init', '30min', { origin: 'https://cal.com' });
    Cal.ns['30min']('inline', { elementOrSelector: '#xCal', config: { layout: 'month_view', theme: 'light' }, calLink: 'unrootdesign/30min' });
    Cal.ns['30min']('ui', { theme: 'light', hideEventTypeDetails: false, layout: 'month_view', cssVarsPerTheme: { light: { 'cal-brand': '#8961E7' } } });
  }

  /* ── экраны и док ── */
  function setCount() {
    let i = 0, n = 1;
    if (view === 'works') { i = cur; n = N; }
    else if (view === 'concepts') { i = pi; n = pairs.length; }
    else if (view === 'about') { i = ci; n = cols.length; }
    count.textContent = `${pad(i + 1)} / ${pad(n)}`;
    prev.disabled = i <= 0 && view !== 'concepts';
    next.disabled = i >= n - 1 && view !== 'concepts';
  }
  function show(v, push = true) {
    if (!NAMES[v]) v = 'works';
    view = v; app.dataset.view = v;
    views.forEach(s => { const on = s.dataset.v === v; s.classList.toggle('on', on); s.toggleAttribute('hidden', !on); s.setAttribute('aria-hidden', String(!on)); });
    tabs.forEach(t => t.setAttribute('aria-selected', String(t.dataset.v === v)));
    crumb.textContent = NAMES[v];
    if (v === 'contact') bootCal();
    if (v === 'about') setCard(ci, false);
    setCount();
    if (push) history.replaceState(null, '', v === 'works' ? location.pathname : '#' + v);
  }
  function step(d) {
    if (view === 'works') go(Math.round(target / STEP) * STEP + d * STEP);
    else if (view === 'concepts') setPair(pi + d);
    else if (view === 'about') setCard(ci + d);
  }
  tabs.forEach(t => t.addEventListener('click', () => show(t.dataset.v)));
  prev.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));
  // колесо на экранах концептов и карточек листает по одному шагу
  let wl = 0;
  ['concepts', 'about'].forEach(v => $(`.xv[data-v="${v}"]`).addEventListener('wheel', e => {
    if (Math.abs(e.deltaY) < 8) return;
    e.preventDefault(); const now = Date.now(); if (now - wl < 520) return; wl = now; step(e.deltaY > 0 ? 1 : -1);
  }, { passive: false }));
  addEventListener('keydown', e => {
    if (e.target.closest('input,textarea,select,[contenteditable]')) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); step(1); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); step(-1); }
    else if (/^[1-4]$/.test(e.key)) show(Object.keys(NAMES)[+e.key - 1]);
    else if (e.key === 'Escape') toggleHelp(false);
  });
  // подсказка «?»
  const hb = $('#xHelpBtn'), hp = $('#xHelp');
  function toggleHelp(on) { hp.hidden = !on; hb.setAttribute('aria-expanded', String(on)); }
  hb.addEventListener('click', e => { e.stopPropagation(); toggleHelp(hp.hidden); });
  addEventListener('click', e => { if (!e.target.closest('#xHelp')) toggleHelp(false); });

  const h = location.hash.slice(1);
  show(ALIAS[h] || h || 'works', false);
  addEventListener('hashchange', () => { const k = location.hash.slice(1); show(ALIAS[k] || k || 'works', false); });
})();
