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

  /* PROCESS FLOW. Draw with the wand: the moon grows.
     A star-atlas look: hairlines, stardust and soft nebula glow. The same moon in the same place in all 3 steps:
     1. Concept: a thin crescent, the rest of the disc only hinted, the potential.
     2. Design: a half moon with its relief engraved and a map grid over it.
     3. Build: the full moon, shining, with a halo of fine rays and a soft pulse.
     Above each step there is a faint dotted outline. Wave the wand (the cursor) over it: a short wave starts a glowing trail,
     then the magic takes over and draws the rest. When the trail is finished the picture is engraved line by line
     and stardust flows out of the trail, then a quiet loop. Once 2 neighbours are drawn, stardust flows between them.
     Each picture is a render function in STEPS, drawn in a 140 x 100 box.
     If nobody draws for a while (or on touch screens) the pictures draw themselves slowly.
     Reduced motion shows the finished pictures. Draws only while the strip is on screen. */
  const flow = $('.xpr__flow');
  if (flow) {
    const c = flow.getContext('2d');
    const css = getComputedStyle(document.documentElement), tok = (v, d) => css.getPropertyValue(v).trim() || d;
    const rgb = v => { const n = parseInt(v.slice(1), 16); return `${n >> 16 & 255},${n >> 8 & 255},${n & 255}`; };
    const INK2 = tok('--ink-2', '#5D5B66'), INK3 = tok('--ink-3', '#95939C'), PALE = tok('--pale', '#EEE8FC'), VI = tok('--violet', '#8961E7'),
          VD = tok('--violet-d', '#6A43D1'), VLT = tok('--violet-lt', '#B9A2F5');
    const FONT = '"Google Sans", ui-sans-serif, system-ui, sans-serif';
    const sprite = (core, glow, spark) => {
      const s = document.createElement('canvas'); s.width = s.height = 64; const g2 = s.getContext('2d');
      const g = g2.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, core); g.addColorStop(.16, core); g.addColorStop(.42, glow); g.addColorStop(1, 'rgba(0,0,0,0)');
      g2.fillStyle = g; g2.fillRect(0, 0, 64, 64);
      if (spark) { g2.fillStyle = core; g2.beginPath();
        g2.moveTo(32, 2); g2.quadraticCurveTo(34, 30, 62, 32); g2.quadraticCurveTo(34, 34, 32, 62); g2.quadraticCurveTo(30, 34, 2, 32); g2.quadraticCurveTo(30, 30, 32, 2); g2.fill(); }
      return s;
    };
    const haze = col => { const s = document.createElement('canvas'); s.width = s.height = 128; const g2 = s.getContext('2d'), g = g2.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, `rgba(${rgb(col)},.5)`); g.addColorStop(.45, `rgba(${rgb(col)},.16)`); g.addColorStop(1, `rgba(${rgb(col)},0)`); g2.fillStyle = g; g2.fillRect(0, 0, 128, 128); return s; };
    const SP = [sprite(`rgba(${rgb(VI)},1)`, `rgba(${rgb(VI)},.28)`), sprite(`rgba(${rgb(VD)},1)`, `rgba(${rgb(VI)},.22)`), sprite(`rgba(${rgb(VI)},1)`, `rgba(${rgb(VLT)},.3)`, true)];
    const NEB = [haze(VI), haze(VLT)];
    const TONE = [VD, VI, VLT], BK = Array.from({ length: 12 }, () => []);
    const steps = $$('.xpr > li'), HINT = $('.xpr__hint');
    const COARSE = matchMedia('(pointer:coarse)').matches;
    const BW = 140, BH = 100;                   // every picture is drawn in a 140 x 100 box, then scaled
    const NEED = 300;                           // px of wand movement to finish one picture by hand
    const KICK = .3, FINISH = .42;              // past 30% the magic takes over and finishes at this speed per second
    const IDLE = 6, AUTO = .2;                  // after 6s without drawing a picture draws itself, at this speed per second
    const LINE_W = 1.4, LINE_A = 1.15;          // thickness and strength of all engraved lines

    const clamp = x => Math.min(1, Math.max(0, x)), rnd = (a, b) => a + Math.random() * (b - a);
    const eio = x => x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2, eo = x => 1 - Math.pow(1 - clamp(x), 3);
    const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
    const circ = (cx, cy, r, a0 = -1.571, n = 96, span = 6.283) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + i / n * span; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; });
    const DEG = Math.PI / 180;

    /* drawing kit, in box units (runs inside the box transform) */
    let s = 1, LP = null, TT = 0;
    const line = (pts, u = 1) => { const m = Math.max(1, Math.round((pts.length - 1) * clamp(u))); if (u <= 0) return false; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i <= m; i++) c.lineTo(pts[i][0], pts[i][1]); LP = pts.slice(0, m + 1); return true; };
    const seg = (x0, y0, x1, y1) => { c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); LP = [[x0, y0], [x1, y1]]; };
    const ell = (cx, cy, rx, ry, rot, a0 = 0, a1 = 6.283, n = 32) => { const cr = Math.cos(rot), sr = Math.sin(rot);
      return Array.from({ length: n + 1 }, (_, i) => { const a = a0 + i / n * (a1 - a0), x = Math.cos(a) * rx, y = Math.sin(a) * ry; return [cx + x * cr - y * sr, cy + x * sr + y * cr]; }); };
    /* lines are not crisp strokes: a faint soft pencil line with dense twinkling stars on top, slightly hand-drawn (wavy).
       Same look as the "drag me" and "draw with the wand" hints. Dashed lines become sparse star dots. */
    const hsh = n => { const v = Math.sin(n * 12.9898) * 43758.5453; return v - Math.floor(v); };
    const STB = [[], [], []];
    const ink = (col, a, w = 1, dash) => {
      if (!LP || LP.length < 2) return;
      const A = Math.min(1, a * LINE_A), P0 = LP.find(Boolean), gap = (dash ? 3 : 1.45) / s, r = (.42 + .3 * w) * LINE_W * .62 / s, seed = P0[0] * 7.13 + P0[1] * 3.71;
      if (!dash) { c.save(); c.globalAlpha *= A * .2; c.strokeStyle = col; c.lineWidth = w * LINE_W * 1.8 / s; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke(); c.restore(); }
      let n = 0, carry = 0;
      for (let i = 1; i < LP.length; i++) {
        if (!LP[i] || !LP[i - 1]) { carry = 0; continue; }   // pen lift
        const [x0, y0] = LP[i - 1], dx = LP[i][0] - x0, dy = LP[i][1] - y0, L = Math.hypot(dx, dy); if (L < 1e-6) continue;
        const nx = -dy / L, ny = dx / L;
        for (let d = carry; d < L; d += gap, n++) {
          const h = hsh(n + seed), wob = (Math.sin(n * gap * s * .09 + seed) * .55 + Math.sin(n * gap * s * .23 + seed * 1.7) * .3 + (h - .5) * .9) / s;
          const tw = .62 + .38 * Math.sin(TT * (1.1 + h * 1.6) + n * 1.31 + seed);
          STB[tw > .86 ? 2 : tw > .66 ? 1 : 0].push(x0 + dx * d / L + nx * wob, y0 + dy * d / L + ny * wob, r * (.75 + .5 * h), h);
        }
        carry = (carry - L) % gap; if (carry < 0) carry += gap;
      }
      const base = c.globalAlpha; c.save(); c.fillStyle = col;
      STB.forEach((q, bi) => { if (!q.length) return; const ga = base * A * [.45, .72, 1][bi]; c.globalAlpha = ga; c.beginPath();
        for (let m = 0; m < q.length; m += 4) { const z = q[m + 2] * 1.7; c.rect(q[m] - z / 2, q[m + 1] - z / 2, z, z); } c.fill();
        // a few of the brightest dots become small sparks, like the cursor trail
        if (bi === 2) for (let m = 0; m < q.length; m += 4) if (q[m + 3] > .93) { const z = 3.2 / s; c.globalAlpha = ga * .9; c.drawImage(SP[2], q[m] - z, q[m + 1] - z, z * 2, z * 2); }
        q.length = 0; });
      c.restore();
    };
    const label = (str, x, y, size, col, a, align = 'left') => { if (a <= .01) return; c.save(); c.globalAlpha *= a; c.font = `400 ${size}px ${FONT}`; if ('letterSpacing' in c) c.letterSpacing = `${size * .04}px`; c.fillStyle = col; c.textAlign = align; c.textBaseline = 'middle'; c.fillText(str, x, y); c.restore(); };
    // stage of the engraving: item i appears from e = i * .22
    const K = (e, i, d = .8) => eo((e - i * .22) / d);

    /* STEPS: the moon grows. The same moon in the same place in all 3 steps, so the progress reads left to right:
       a thin crescent, a half moon, a full moon. k is the phase: 1 = new, 0 = half, -1 = full */
    const O = [70, 50], R = 34;
    const loop = (f, n = 96) => Array.from({ length: n + 1 }, (_, i) => f(i / n * 6.283));
    // the lit part of the moon: the right edge, then back along the terminator
    const litPath = (k, n = 48) => { const p = []; for (let i = 0; i <= n; i++) { const a = -1.571 + i / n * 3.1416; p.push([O[0] + Math.cos(a) * R, O[1] + Math.sin(a) * R]); }
      for (let i = 0; i <= n; i++) { const y = R - i / n * 2 * R; p.push([O[0] + k * Math.sqrt(Math.max(0, R * R - y * y)), O[1] + y]); } return p; };
    const term = (k, n = 48) => Array.from({ length: n + 1 }, (_, i) => { const y = -R + i / n * 2 * R; return [O[0] + k * Math.sqrt(Math.max(0, R * R - y * y)), O[1] + y]; });
    const MARIA = [[-11, -7, 12], [9, -13, 8], [-4, 13, 10], [13, 6, 6]];
    const CRATERS = [[14, -16, 3.6], [22, 4, 2.6], [8, 20, 4.4], [-15, -9, 5], [-7, 23, 2.8], [-21, 12, 3.4], [3, -25, 2.6], [25, -9, 2.2], [17, 15, 1.8], [-24, -4, 2], [-2, 2, 2.2]];
    const moonDust = Array.from({ length: 1700 }, () => { const r = R * Math.sqrt(Math.random()), a = rnd(0, 6.283), x = Math.cos(a) * r, y = Math.sin(a) * r;
      const mare = MARIA.some(([mx, my, mr]) => Math.hypot(x - mx, y - my) < mr * (.8 + .4 * Math.random()));
      return { x, y, sz: rnd(.35, 1) * (mare ? 1.1 : .95), al: rnd(.4, .95), tone: mare ? 0 : Math.random() < .55 ? 1 : 2, ph: rnd(0, 6.283) }; });
    const SKY = Array.from({ length: 14 }, () => { const a = rnd(0, 6.283), r = rnd(R + 9, 50); return [O[0] + Math.cos(a) * r * 1.15, O[1] + Math.sin(a) * r * .95, rnd(1.4, 2.4), rnd(0, 6.283)]; });
    // the same moon at 3 phases; the terminator breathes a little so it never looks frozen
    const moonStep = (k0, i) => ({
      k: k0, i,
      path: i === 0 ? litPath(k0) : i === 1 ? [...loop(a => [O[0] + Math.cos(a) * R, O[1] + Math.sin(a) * R]), null, ...term(k0)] : [...loop(a => [O[0] + Math.cos(a) * R, O[1] + Math.sin(a) * R]), null, ...loop(a => [O[0] + Math.cos(a) * (R + 9), O[1] + Math.sin(a) * (R + 9)])],
      right: 120,
      dust(tt) { const k = this.kNow; return moonDust.map(p => { const lit = p.x > k * Math.sqrt(Math.max(0, R * R - p.y * p.y)); return [O[0] + p.x, O[1] + p.y, p.sz * (lit ? 1 : .55), p.al * (lit ? .75 + .25 * Math.sin(tt * 2 + p.ph) : .08), lit ? p.tone : 2]; }); },
      spin: (t, amp) => t,
      glow: i === 2 ? [[O[0], O[1], 58, .75, 0], [O[0], O[1], 66, .4, 1]] : i === 1 ? [[O[0] + 12, O[1], 44, .55, 0], [O[0], O[1], 56, .3, 1]] : [[O[0] + 26, O[1], 30, .55, 0], [O[0], O[1], 52, .25, 1]],
      render(e, t, amp, out) {
        const k = this.kNow = Math.max(-1, Math.min(1, this.k + .04 * Math.sin(t * .7) * amp * (i === 2 ? 0 : 1)));
        // the whole disc is there from the start, faint: the potential
        line(loop(a => [O[0] + Math.cos(a) * R, O[1] + Math.sin(a) * R]), K(e, 0)) && ink(VD, i === 2 ? .8 : .4, i === 2 ? 1 : .7, i === 2 ? null : [1.4, 2.4]);
        line(litPath(k), K(e, .3)) && ink(VD, .85, 1);
        // engraved relief, only on the lit part
        const kc = K(e, 1);
        if (kc > 0) { c.save(); c.beginPath(); litPath(k).forEach(([x, y], j) => j ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.clip();
          CRATERS.forEach(([x, y, r], j) => { const kk = K(e, 1 + j * .1); if (kk <= 0) return; line(ell(O[0] + x, O[1] + y, r * kk, r * .86 * kk, -.3)); ink(VD, .55, .7); line(ell(O[0] + x + r * .25, O[1] + y + r * .2, r * .55 * kk, r * .55 * kk, 0, .2, 2.2, 14)); ink(VD, .35, .6); });
          // a selenographic grid on the half moon: the design stage
          if (i === 1) { for (let m = -2; m <= 2; m++) { const rx = Math.abs(m) * R / 3; line(loop(a => [O[0] + Math.cos(a) * rx, O[1] + Math.sin(a) * R]), K(e, 1.8 + (m + 2) * .1)) && ink(VI, .5, .6, [1.2, 2]); }
            [-20, 0, 20].forEach((y, j) => { const w = Math.sqrt(R * R - y * y); line([[O[0] - w, O[1] + y], [O[0] + w, O[1] + y]], K(e, 2.2 + j * .1)) && ink(VI, .5, .6, [1.2, 2]); }); }
          c.restore(); }
        // the full moon: a halo with fine rays and a pulse, it shines
        if (i === 2) {
          const kh = K(e, 1.4);
          line(loop(a => [O[0] + Math.cos(a) * (R + 9), O[1] + Math.sin(a) * (R + 9)]), kh) && ink(VLT, .6, .7, [1, 2.2]);
          const rays = []; c.beginPath();
          for (let j = 0; j < 72; j++) { const a = j / 72 * 6.283, L = (3 + 4 * (.5 + .5 * Math.sin(j * 1.7 + t * 1.6))) * kh, x0 = O[0] + Math.cos(a) * (R + 3), y0 = O[1] + Math.sin(a) * (R + 3), x1 = O[0] + Math.cos(a) * (R + 3 + L), y1 = O[1] + Math.sin(a) * (R + 3 + L);
            c.moveTo(x0, y0); c.lineTo(x1, y1); rays.push([x0, y0], [x1, y1], null); }
          LP = rays; ink(VD, .3, .5);
          const pu = (t % 3.2) / 3.2; line(loop(a => [O[0] + Math.cos(a) * (R + 4 + pu * 14), O[1] + Math.sin(a) * (R + 4 + pu * 14)])) && ink(VLT, (1 - pu) * .7 * amp, .8);
        } else {
          line(term(k), K(e, .6)) && ink(VI, .6, .7);   // the terminator, where the light is growing
        }
        SKY.forEach(([x, y, r, ph], j) => out.push([x, y, r * (.75 + .25 * Math.sin(t * 2.4 + ph)), K(e, 1.4 + j * .05) * (i === 2 ? .7 : 1)]));
      }
    });
    const STEPS = [moonStep(.62, 0), moonStep(0, 1), moonStep(-1, 2)];
    STEPS.forEach(st => st.kNow = st.k);

    // spread points evenly along the trail; pen lifts become move points
    const even = pts => {
      const out = []; let prev = null;
      for (const q of pts) {
        if (!q) { prev = null; continue; }
        if (!prev) { out.push([q[0], q[1], 1]); prev = q; continue; }
        const L2 = Math.hypot(q[0] - prev[0], q[1] - prev[1]), m = Math.max(1, Math.round(L2 / 1.5));
        for (let j = 1; j <= m; j++) out.push([prev[0] + (q[0] - prev[0]) * j / m, prev[1] + (q[1] - prev[1]) * j / m, 0]);
        prev = q;
      }
      return out;
    };
    const LINES = STEPS.map(k => even(k.path));
    const RIGHT = STEPS.map(k => k.right);
    const LEFT = STEPS.map(k => Math.min(...k.path.filter(Boolean).map(q => q[0])) - 10);
    const START = STEPS.map(k => k.dust(0).map(() => [Math.random(), rnd(0, .6)]));   // where on the trail each speck starts, and its delay

    let W = 0, H = 0, D = 1, B = [], shown = false, clock = 0, on = false, last = 0, seen = 0, mx = -1e4, my = -1e4, SPARK = [];
    const st = [0, 1, 2].map(() => ({ want: 0, p: 0, done: -1, lastDraw: 0 }));
    const spr = (img, x, y, sz, a) => { if (a <= .01 || sz <= 0) return; c.globalAlpha = Math.min(1, a); c.drawImage(img, x - sz, y - sz, sz * 2, sz * 2); };
    const spark = (x, y, sz, v = 12) => { if (SPARK.length < 500) SPARK.push({ x, y, vx: rnd(-v, v), vy: rnd(-v * 1.2, v * .4), sz, b: 0, life: rnd(.5, 1), img: Math.random() < .2 ? 2 : Math.random() < .5 ? 0 : 1 }); };

    function layout() {
      D = Math.min(devicePixelRatio || 1, 2); W = flow.clientWidth; H = flow.clientHeight;
      flow.width = Math.round(W * D); flow.height = Math.round(H * D);
      const fl = flow.getBoundingClientRect().left;
      let cols = steps.map(li => { const r = li.getBoundingClientRect(); return { x: r.left - fl, w: r.width }; });
      if (cols.length < 3 || cols[1].x - cols[0].x < 60) {   // phones: the 3 pictures share the width
        const lr = steps[0] ? steps[0].parentElement.getBoundingClientRect() : { left: fl, width: W }, part = lr.width / 3;
        cols = [0, 1, 2].map(k => ({ x: lr.left - fl + k * part, w: part - 10 }));
      }
      s = Math.min(H * .8 / BH, ...cols.map((cl, k) => cl.w * .92 / (RIGHT[k] - LEFT[k])));
      B = cols.map((cl, k) => ({ x: cl.x - LEFT[k] * s, y: (H - BH * s) / 2 + 2 }));
      if (HINT) { const off = flow.getBoundingClientRect().left - HINT.offsetParent.getBoundingClientRect().left, top = flow.offsetTop;
        HINT.style.left = `${Math.round(B[0].x + (O[0] + R + 5) * s + off - 4)}px`; HINT.style.top = `${Math.round(top + B[0].y + (O[1] - 4) * s - 72)}px`; }
      if (RM && shown) draw(0, 0, true);
    }
    layout();
    addEventListener('resize', layout); addEventListener('load', layout);
    if (document.fonts) document.fonts.ready.then(layout);

    addEventListener('pointermove', e => {
      if (e.pointerType === 'touch') return;
      const r = flow.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      if (mx > -1e3 && y > -40 && y < H + 40) {
        const d = Math.min(80, Math.hypot(x - mx, y - my));
        B.forEach((b, k) => { if (x > b.x + LEFT[k] * s - 20 && x < b.x + RIGHT[k] * s + 30 && st[k].done < 0) { st[k].want = Math.min(1, st[k].want + d / NEED); st[k].lastDraw = clock; } });
      }
      mx = x; my = y;
    }, { passive: true });

    const pick = (pts, u) => pts[Math.min(pts.length - 1, Math.round(u * (pts.length - 1)))];
    function trail(k, u, a, t) {
      const pts = LINES[k], m = Math.round(u * (pts.length - 1)), b = B[k]; if (m < 1 || a <= .01) return;
      for (let i = 0; i <= m; i += 2) { const [x, y] = pts[i], w = .8 + .3 * Math.sin(i * .9 + t * 6), fresh = Math.max(0, 1 - (m - i) / 40);   // the newest part of the trail glows brighter
        spr(SP[i % 3 ? 0 : 1], b.x + x * s, b.y + y * s, (2.6 + 2.4 * fresh) * w * Math.max(.9, s * .7), (.8 + .2 * fresh) * a); }
    }
    function ghost(k, t) {
      const pts = LINES[k], b = B[k], step = Math.max(4, Math.round(5 / s * 1.4));
      for (let i = 0; i < pts.length; i += step) {
        const x = b.x + pts[i][0] * s, y = b.y + pts[i][1] * s, near = Math.max(0, 1 - Math.hypot(x - mx, y - my) / 90);
        c.globalAlpha = .26 + .12 * Math.sin(t * 2.4 - i * .05) + near * .45; c.fillStyle = near > .05 ? VI : INK3; c.fillRect(x - .9, y - .9, 1.8, 1.8);
      }
      c.globalAlpha = 1;
    }
    function picture(k, e, t) {
      const b = B[k], step = STEPS[k], amp = eio(clamp((e - 1.2) / 1.6)), ap = clamp(e / 1.2);
      // nebula
      step.glow.forEach(([x, y, r, k2, col], i) => spr(NEB[col], b.x + x * s, b.y + y * s, r * s * (1 + .05 * Math.sin(t * .8 + i)), k2 * ap * (.85 + .15 * Math.sin(t * 1.3 + i * 2))));
      // stardust, flowing out of the trail
      const dd = step.dust(step.spin(t, amp)), pts = LINES[k], S0 = START[k], px = Math.max(1, s * .9) * 1.12;
      for (let i = 0; i < dd.length; i++) {
        const [tx, ty, sz, al, tone] = dd[i], u = clamp((e - S0[i][1]) / 1.1); if (u <= 0) continue;
        let x = tx, y = ty; if (u < 1) { const q = pick(pts, S0[i][0]), v = eo(u); x = q[0] + (tx - q[0]) * v; y = q[1] + (ty - q[1]) * v; }
        const tw = .65 + .35 * Math.sin(t * (1.4 + i % 3 * .4) + i), a = al * tw * (u < 1 ? .5 + .5 * u : 1);
        BK[tone * 4 + Math.min(3, a * 4 | 0)].push(b.x + x * s, b.y + y * s, sz * px * .6);
      }
      BK.forEach((q, bi) => { if (!q.length) return; c.globalAlpha = ((bi % 4) + .6) / 4; c.fillStyle = TONE[bi >> 2]; c.beginPath();
        for (let m = 0; m < q.length; m += 3) { c.moveTo(q[m] + q[m + 2], q[m + 1]); c.arc(q[m], q[m + 1], q[m + 2], 0, 6.283); } c.fill(); q.length = 0; });
      // the engraving
      const stars = [];
      c.save(); c.translate(b.x, b.y); c.scale(s, s); c.globalAlpha = 1;
      TT = t; step.render(e, t, amp, stars);
      c.restore();
      stars.forEach(([x, y, r, a], i) => { const w = .8 + .2 * Math.sin(t * 2.6 + i * 1.7); spr(SP[0], b.x + x * s, b.y + y * s, r * 1.9 * s * w, .35 * a); spr(SP[2], b.x + x * s, b.y + y * s, r * s * .62 * w, a); });
      c.globalAlpha = 1;
    }

    function draw(t, dt, still) {
      c.setTransform(D, 0, 0, D, 0, 0); c.clearRect(0, 0, W, H);
      const cy = B.length ? B[0].y + 50 * s : H / 2;
      for (let k = 0; k < 2; k++) {   // links between neighbours, once both are finished
        const a = Math.min(st[k].done < 0 ? 0 : clamp((t - st[k].done) / .8), st[k + 1].done < 0 ? 0 : clamp((t - st[k + 1].done) / .8));
        const x0 = B[k].x + RIGHT[k] * s + 8, x1 = B[k + 1].x + LEFT[k + 1] * s - 4;
        for (let x = x0; x < x1; x += 6) { c.globalAlpha = .16 + .4 * (still ? 1 : eio(clamp(a * 1.4 - (x - x0) / (x1 - x0) * .4))); c.fillStyle = a > 0 || still ? VLT : INK3; c.fillRect(x, cy - .6, 1.6, 1.2); }
        // stardust flows from one step into the next: the process keeps going
        if (a > 0 && !still) for (let i = 0; i < 7; i++) { const f = (t * .16 + i / 7 + k * .37) % 1, x = x0 + (x1 - x0) * f, y = cy + Math.sin(f * 9 + i * 2) * 3.5;
          spr(SP[i % 3 ? 0 : 2], x, y, (i % 3 ? 2.2 : 3.4) * Math.max(.9, s * .6), a * Math.sin(f * Math.PI) * .9); }
      }
      c.globalAlpha = 1;
      for (let k = 0; k < 3; k++) {
        const S = st[k];
        if (still) { S.p = 1; if (S.done < 0) S.done = 0; }
        else {
          if (S.done < 0 && (COARSE ? t - seen > .6 + k * 1.8 : t - Math.max(seen, S.lastDraw) > IDLE + k * 1.4)) S.want = Math.min(1, S.want + AUTO * dt);
          if (S.done < 0 && S.want >= KICK) S.want = Math.min(1, S.want + FINISH * dt);
          S.p += (S.want - S.p) * Math.min(1, dt * 9);
          if (S.done < 0 && S.p > .995) { S.done = t; S.p = 1; const b = B[k], cx = b.x + (LEFT[k] + RIGHT[k]) / 2 * s, cy2 = b.y + 50 * s; for (let i = 0; i < 30; i++) spark(cx + rnd(-30, 30) * s, cy2 + rnd(-30, 30) * s, rnd(2.2, 3.6), 70); }
        }
        const e = S.done < 0 ? 0 : still ? 9 : t - S.done;
        if (S.done < 0) ghost(k, t);
        if (e > 0) picture(k, still ? 9 : e, t);
        trail(k, S.p, S.done < 0 ? 1 : 1 - clamp(e / .9), t);
        if (S.done < 0 && S.p > .002) {
          const [px, py] = pick(LINES[k], S.p), x = B[k].x + px * s, y = B[k].y + py * s;
          const busy = clamp((S.want - S.p) * 12);   // how fast the wand is drawing right now
          spr(SP[0], x, y, 14 + 8 * busy, .45 + .3 * busy); spr(SP[2], x, y, 7 + 3 * busy + Math.sin(t * 14), 1);
          for (let q = 0; q < 1 + busy * 3; q++) if (Math.random() < .7) spark(x, y, rnd(1.8, 3.2), 30 + 50 * busy);
        }
      }
      // the hand-drawn hint "draw with the wand" (HTML, same style as "drag me") shows until the first picture starts
      if (HINT) HINT.classList.toggle('on', !still && !COARSE && t - seen > .8 && st[0].p < .12);
      for (let i = SPARK.length - 1; i >= 0; i--) {
        const d = SPARK[i]; d.b += dt; const age = d.b / d.life;
        if (age >= 1) { SPARK.splice(i, 1); continue; }
        d.x += d.vx * dt; d.y += d.vy * dt; d.vx *= .97; d.vy = d.vy * .97 - 6 * dt;
        spr(SP[d.img], d.x, d.y, d.sz, .8 * (1 - age * age));
      }
      c.globalAlpha = 1;
    }
    function frame(ts) {
      if (!on) { last = 0; return; }
      const dt = last ? Math.min(.05, (ts - last) / 1000) : .016; last = ts;
      clock += dt; draw(clock, dt);
      requestAnimationFrame(frame);
    }
    new IntersectionObserver(es => es.forEach(e => {
      const was = on; on = e.isIntersecting;
      if (RM) { if (on) { shown = true; layout(); } on = false; return; }
      if (on && !was) { layout(); seen = clock; requestAnimationFrame(frame); }
    }), { threshold: .3 }).observe(flow);
  }
  /* ── рукописные подсказки («drag me» у работ, «draw with the wand» у процесса): линии стрелок собраны
     из плотных звёздочек, как след курсора, и чуть мерцают. SVG остаётся только как форма, рисует canvas ── */
  $$('.xhint').forEach(h => {
    const svg = $('svg', h); if (!svg) return;
    const cv = document.createElement('canvas'); cv.className = 'xhint__cv'; cv.setAttribute('aria-hidden', 'true'); h.appendChild(cv);
    const c = cv.getContext('2d'), vb = svg.viewBox.baseVal, col = getComputedStyle(h).color;
    const hs = n => { const v = Math.sin(n * 12.9898) * 43758.5453; return v - Math.floor(v); };
    // точки вдоль каждой линии: плотно, с лёгкой волной и разбросом поперёк, как будто нарисовано звёздной пылью
    const DOTS = [];
    $$('path', svg).forEach((p, pi) => {
      const L = p.getTotalLength(), n = Math.ceil(L / 1.25);
      for (let i = 0; i <= n; i++) {
        const d = i / n * L, q = p.getPointAtLength(d), q2 = p.getPointAtLength(Math.min(L, d + .5)), q0 = p.getPointAtLength(Math.max(0, d - .5));
        const tx = q2.x - q0.x, ty = q2.y - q0.y, tl = Math.hypot(tx, ty) || 1, h1 = hs(i + pi * 977), h2 = hs(i * 3.1 + pi * 131);
        const off = Math.sin(d * .11 + pi) * .45 + (h1 - .5) * 1.5;
        DOTS.push({ x: q.x - ty / tl * off, y: q.y + tx / tl * off, r: .55 + .5 * h2, f: .9 + h1 * 1.8, ph: h2 * 6.28, sp: h1 > .965 });
        if (h2 > .8) DOTS.push({ x: q.x + (h1 - .5) * 5, y: q.y + (hs(i + 7) - .5) * 5, r: .45, f: 1.4, ph: h1 * 6.28, dust: true });   // пыль вокруг линии
      }
    });
    const SPK = document.createElement('canvas'); SPK.width = SPK.height = 32;
    { const g2 = SPK.getContext('2d'), g = g2.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, col); g.addColorStop(.3, col.replace('rgb(', 'rgba(').replace(')', ',.35)')); g.addColorStop(1, 'rgba(0,0,0,0)');
      g2.fillStyle = g; g2.fillRect(0, 0, 32, 32); g2.fillStyle = col; g2.beginPath(); g2.moveTo(16, 1); g2.quadraticCurveTo(17, 15, 31, 16); g2.quadraticCurveTo(17, 17, 16, 31); g2.quadraticCurveTo(15, 17, 1, 16); g2.quadraticCurveTo(15, 15, 16, 1); g2.fill(); }
    let W = 0, H = 0, D = 1, k = 1, on = false;
    const size = () => { D = Math.min(devicePixelRatio || 1, 2); W = svg.clientWidth; H = svg.clientHeight; k = W / vb.width; cv.width = Math.round(W * D); cv.height = Math.round(H * D); cv.style.width = W + 'px'; cv.style.height = H + 'px'; };
    const B = [[], [], []];
    const draw = t => {
      c.setTransform(D, 0, 0, D, 0, 0); c.clearRect(0, 0, W, H); c.fillStyle = col;
      for (const d of DOTS) { const tw = .66 + .34 * Math.sin(t * d.f + d.ph); B[tw > .9 ? 2 : tw > .72 ? 1 : 0].push(d); }
      B.forEach((q, bi) => { c.globalAlpha = [.5, .75, 1][bi]; c.beginPath();
        for (const d of q) { if (d.dust) continue; const x = d.x * k, y = d.y * k; c.moveTo(x + d.r, y); c.arc(x, y, d.r, 0, 6.283); } c.fill();
        c.globalAlpha *= .4; c.beginPath(); for (const d of q) { if (!d.dust) continue; c.moveTo(d.x * k + d.r, d.y * k); c.arc(d.x * k, d.y * k, d.r, 0, 6.283); } c.fill();
        if (bi === 2) { c.globalAlpha = .9; for (const d of q) if (d.sp) c.drawImage(SPK, d.x * k - 4, d.y * k - 4, 8, 8); }
        q.length = 0; });
      c.globalAlpha = 1;
    };
    const loop = ts => { if (!on) return; draw(ts / 1000); requestAnimationFrame(loop); };
    size(); svg.style.opacity = 0; draw(0);
    addEventListener('resize', () => { size(); draw(performance.now() / 1000); });
    new IntersectionObserver(es => es.forEach(e => { const was = on; on = e.isIntersecting && !RM; if (on && !was) { size(); requestAnimationFrame(loop); } })).observe(h);
  });

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
