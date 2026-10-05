/* Экспериментальная главная: одна страница с прокруткой.
   Герой закреплён, пока ряд работ едет влево. Концепты, отзывы, календарь, док с подсветкой текущей секции. */
(() => {
  if (!document.body.classList.contains('x')) return;
  const RM = matchMedia('(prefers-reduced-motion:reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const desktop = () => innerWidth > 760;

  /* ── герой: вертикальная прокрутка двигает ряд работ по горизонтали ── */
  const hero = $('.xh'), track = $('#xhTrack');
  let travel = 0;
  function size() {
    if (!desktop()) { hero.style.height = ''; track.style.transform = ''; return; }
    travel = Math.max(0, track.scrollWidth - innerWidth);
    hero.style.height = `${innerHeight + travel}px`;
    paint();
  }
  let ticking = false;
  function paint() {
    ticking = false;
    if (!desktop()) return;
    const p = Math.min(1, Math.max(0, (scrollY - hero.offsetTop) / (travel || 1)));
    track.style.transform = `translate3d(${-p * travel}px,0,0)`;
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(paint); } }, { passive: true });
  addEventListener('resize', size);
  addEventListener('load', size);
  size();

  /* ── концепты ── */
  const xc = $('.xc');
  const lists = { ba: $$('.xc__list--ba button'), anim: $$('.xc__list--anim button') };
  const items = { ba: $$('.xc__pair'), anim: $$('.xc__vid') };
  const idx = { ba: 0, anim: 0 };
  let mode = 'ba', cVisible = false;
  const playVid = () => items.anim.forEach((v, k) => { const el = v.querySelector('video'); if (mode === 'anim' && cVisible && k === idx.anim) { el.preload = 'auto'; el.play().catch(() => {}); } else el.pause(); });
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
  const msg = $('#xMsg'), mq = $('.xmsg__q', msg), mf = $('#xMsgFull');
  const openMsg = on => { msg.classList.toggle('open', on); mf.hidden = !on; mq.setAttribute('aria-expanded', String(on)); };
  mq.addEventListener('click', () => openMsg(true));
  $('.xmsg__x', msg).addEventListener('click', () => openMsg(false));
  addEventListener('keydown', e => {
    if (e.key === 'Escape') openMsg(false);
    if (!cVisible || e.target.closest('input,textarea,select')) return;
    if (e.key === 'ArrowRight') pick(idx[mode] + 1);
    if (e.key === 'ArrowLeft') pick(idx[mode] - 1);
  });

  /* ── отзывы со стрелками ── */
  const qs = $$('#xq blockquote'), qn = $('#xqn');
  let qi = 0;
  const quote = i => { qi = (i + qs.length) % qs.length; qs.forEach((q, k) => q.classList.toggle('on', k === qi)); qn.textContent = `${qi + 1} / ${qs.length}`; };
  $$('#xq .xa__arr').forEach(b => b.addEventListener('click', () => quote(qi + +b.dataset.d)));

  /* ── календарь грузится, когда до контакта остаётся экран ── */
  let calBooted = false;
  function bootCal() {
    if (calBooted) return; calBooted = true;
    (function (C, A, L) { let p = function (a, ar) { a.q.push(ar); }; let d = C.document; C.Cal = C.Cal || function () { let cal = C.Cal; let ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement('script')).src = A; cal.loaded = true; } if (ar[0] === L) { const api = function () { p(api, arguments); }; const namespace = ar[1]; api.q = api.q || []; if (typeof namespace === 'string') { cal.ns[namespace] = cal.ns[namespace] || api; p(cal.ns[namespace], ar); p(cal, ['initNamespace', namespace]); } else p(cal, ar); return; } p(cal, ar); }; })(window, 'https://app.cal.com/embed/embed.js', 'init');
    Cal('init', '30min', { origin: 'https://cal.com' });
    Cal.ns['30min']('inline', { elementOrSelector: '#xCal', config: { layout: 'month_view', theme: 'light' }, calLink: 'unrootdesign/30min' });
    Cal.ns['30min']('ui', { theme: 'light', hideEventTypeDetails: false, layout: 'month_view', cssVarsPerTheme: { light: { 'cal-brand': '#8961E7' } } });
  }

  /* ── док и подпись сверху следят за текущей секцией, у футера док прячется ── */
  const dockLinks = $$('.x-dock a'), dock = $('.x-dock'), crumb = $('#xCrumb');
  const NAMES = { work: 'works', concepts: 'concepts', about: 'about', contact: 'contact' };
  const secs = ['work', 'concepts', 'about', 'contact'].map(id => document.getElementById(id));
  const footer = $('footer.ft'), top = $('.x-top');
  function spy() {
    const y = innerHeight * .45;
    let cur = 'work';
    secs.forEach(s => { if (s.getBoundingClientRect().top <= y) cur = s.id; });
    dockLinks.forEach(a => { if (a.dataset.t === cur) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    crumb.textContent = NAMES[cur];
    const c = $('#concepts').getBoundingClientRect(); cVisible = c.top < innerHeight && c.bottom > 0; playVid();
    if ($('#contact').getBoundingClientRect().top < innerHeight * 2) bootCal();
    if (footer) { const ft = footer.getBoundingClientRect().top; dock.classList.toggle('off', ft < innerHeight - 40); top.classList.toggle('off', ft < 90); }
  }
  let st = false;
  addEventListener('scroll', () => { if (!st) { st = true; requestAnimationFrame(() => { st = false; spy(); }); } }, { passive: true });
  spy();
  // старые ссылки вида /#concept, /#pricing ведут к нужной секции
  const ALIAS = { concept: 'concepts', offer: 'concepts', reviews: 'about', pricing: 'about', team: 'contact', faq: 'about', works: 'work' };
  const h = location.hash.slice(1);
  if (ALIAS[h]) addEventListener('load', () => document.getElementById(ALIAS[h])?.scrollIntoView({ behavior: 'auto' }));
  dockLinks[0].addEventListener('click', e => { e.preventDefault(); scrollTo({ top: 0, behavior: RM ? 'auto' : 'smooth' }); history.replaceState(null, '', location.pathname); });
})();
