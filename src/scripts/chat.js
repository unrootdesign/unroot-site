/* Чат в левой колонке главной. Без AI: понимает тему по ключевым словам,
   ищет ответ в FAQ и прокручивает правую колонку к нужному блоку.
   Ничего на странице не прячет, только ведёт к секциям. */
(() => {
  const root = document.getElementById('chat');
  if (!root) return;
  const log = root.querySelector('.chat__log');
  const chipsBox = root.querySelector('.chat__chips');
  const form = root.querySelector('.chat__in');
  const input = form.querySelector('input');
  const rail = root.closest('.rail');
  const BUY = root.dataset.buy;
  const FAQ = JSON.parse(document.getElementById('chat-faq')?.textContent || '[]');
  const RM = matchMedia('(prefers-reduced-motion:reduce)').matches;
  const wide = () => matchMedia('(min-width:961px)').matches;

  const BUY_BTN = { label: 'Get a concept, $1,499', href: BUY };
  const CALL_BTN = { label: 'Book a call', go: 'team' };

  /* темы: подписи кнопок, слова для распознавания, ответ, куда вести */
  const T = {
    concepts: { chip: 'Show me concepts', re: /concept|example|before|after|redesign|sample|mock|prototype|preview/,
      say: 'These are homepages we redesigned from scratch, 7 days each. Drag the slider to compare before and after.',
      go: 'concept', next: ['price', 'work'] },
    work: { chip: 'Show me live websites', re: /work|portfolio|case|project|website[s]? you|built|launch|live|client[s]? (site|website)/,
      say: 'These started as concepts and are live websites now. Open any card for the full case study.',
      go: 'work', next: ['reviews', 'start'] },
    reviews: { chip: 'What do clients say?', re: /review|testimonial|say about|feedback|trust|reference|recommend|trustpilot|happy/,
      say: 'Here is what founders say after working with us.',
      go: 'reviews', next: ['price', 'call'] },
    price: { chip: 'How much is it?', re: /price|pricing|cost|how much|budget|\$|pay|rate|expensive|cheap|afford|plan/,
      say: 'A homepage concept is $1,499 and takes 7 days. If you start the full website within 60 days, the $1,499 goes toward it. Weekly and monthly plans are right below.',
      go: 'pricing', btn: [BUY_BTN], next: ['start', 'call'] },
    start: { chip: 'Not sure where to start', re: /start|begin|don.?t know|not sure|where to|first step|confus|advice|what should/,
      say: 'Start with a concept. Send us your website, and in 7 days you click through your new homepage. Then you decide if we build the rest.',
      go: 'offer', btn: [BUY_BTN], next: ['concepts', 'call'] },
    call: { chip: 'Let’s talk', re: /call|talk|meet|book|contact|email|reach|human|person|discuss|chat with/,
      say: '30 minutes with the people who do the work. You tell us what you are building, we tell you what we would change on your website. No sales pitch.',
      go: 'team', next: ['price'] },
    services: { chip: 'What do you do?', re: /service|what do you do|offer|brand|logo|identity|webflow|framer|design system|social|vibe cod/,
      say: 'Website design, Webflow and Framer builds, brand identity, design systems, vibe coding and AI setup. Pick a service to see examples.',
      go: 'services', next: ['work', 'price'] },
    handover: { chip: 'Can we edit it ourselves?', re: /edit|update|cms|myself|ourselves|after launch|handover|maintain|support|manage|without you/,
      say: 'Yes. We set up the website so your team edits it by asking AI in plain words, and we show you how on a handover call.',
      go: 'handover', next: ['call'] },
    speed: { chip: 'How fast?', re: /how long|how fast|timeline|deadline|quick|asap|urgent|days|weeks?\b|month/,
      say: 'A concept takes 7 days. A full website usually fits into a month.',
      go: 'pricing', next: ['start', 'call'] },
    jobs: { chip: 'Are you hiring?', re: /job|hiring|career|vacanc|join (you|the team)|work for you|intern/,
      say: 'We are. Open roles and the application form are on the Careers page.',
      btn: [{ label: 'Open Careers', href: '/careers' }], next: ['work'] },
    faq: { chip: 'Other questions', re: /faq|question/,
      say: 'Here are the questions we get most on calls.', go: 'faq', next: ['call'] },
    hi: { re: /^(hi|hey|hello|yo|hola|sup|good (morning|afternoon|evening))\b/,
      say: 'Hi. What would you like to see first?', next: ['concepts', 'work', 'price', 'start'] },
  };
  const FIRST = ['concepts', 'work', 'reviews', 'price', 'start', 'call'];

  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const down = () => { log.scrollTop = log.scrollHeight; };

  function chips(keys) {
    chipsBox.replaceChildren(...keys.filter(k => T[k]?.chip).map(k => {
      const b = el('button', 'chip', T[k].chip); b.type = 'button';
      b.addEventListener('click', () => ask(T[k].chip, k));
      return b;
    }));
  }

  function you(text) {
    const m = el('div', 'msg msg--you'); m.append(el('p', null, text)); log.append(m); down();
  }

  function bot(text, btns = []) {
    return new Promise(res => {
      const m = el('div', 'msg msg--bot');
      m.append(el('span', 'msg__who mono', 'Unroot'));
      const dots = el('span', 'msg__dots'); dots.append(el('i'), el('i'), el('i'));
      m.append(dots); log.append(m); down();
      setTimeout(() => {
        dots.remove();
        m.append(el('p', null, text));
        if (btns.length) {
          const row = el('div', 'msg__acts');
          btns.forEach(b => {
            const a = el('a', 'btn btn--main btn--sm', b.label);
            if (b.href) { a.href = b.href; if (/^https?:/.test(b.href)) { a.target = '_blank'; a.rel = 'noopener'; } }
            else { a.href = '#' + b.go; a.addEventListener('click', e => { e.preventDefault(); show(b.go); }); }
            row.append(a);
          });
          m.append(row);
        }
        down(); res();
      }, RM ? 0 : 520);
    });
  }

  /* прокрутка к секции и короткая подсветка её метки */
  function show(id) {
    const t = document.getElementById(id); if (!t) return;
    t.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' });
    t.classList.remove('hit'); void t.offsetWidth; t.classList.add('hit');
    setTimeout(() => t.classList.remove('hit'), 2200);
  }

  /* распознавание: сначала темы по словам, потом поиск по FAQ */
  const STOP = new Set('the a an and or but to of in on for with is are do does can you your we our it this that what how who why when i my me be at by from about there have has will would should could'.split(' '));
  const words = s => s.toLowerCase().replace(/[^a-z0-9$ ]+/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOP.has(w));
  function understand(q) {
    const s = q.toLowerCase();
    let best = null, score = 0;
    for (const [k, t] of Object.entries(T)) {
      const m = s.match(new RegExp(t.re.source, 'g'));
      if (m && m.length > score) { best = k; score = m.length; }
    }
    const qw = words(q);
    let fb = null, fs = 0;
    FAQ.forEach(f => {
      const qs = new Set(words(f.q)), as = new Set(words(f.a));
      const sc = qw.reduce((n, w) => n + (qs.has(w) ? 2 : 0) + (as.has(w) ? 1 : 0), 0);
      if (sc > fs) { fb = f; fs = sc; }
    });
    /* вопрос, похожий на FAQ сильнее, чем на тему, получает ответ из FAQ */
    if (fb && fs >= 4 && fs > score * 3) return { faq: fb };
    if (best) return { key: best };
    if (fb && fs >= 2) return { faq: fb };
    return null;
  }

  let busy = false;
  async function ask(text, key) {
    if (busy || !text.trim()) return;
    busy = true;
    rail?.classList.add('is-chat');
    you(text.trim());
    chipsBox.replaceChildren();
    const r = key ? { key } : understand(text);
    if (r?.key) {
      const t = T[r.key];
      await bot(t.say, t.btn || []);
      if (t.go) setTimeout(() => show(t.go), wide() ? 120 : 700);
      chips(t.next || FIRST);
    } else if (r?.faq) {
      await bot(r.faq.a);
      chips(['faq', 'call', 'price']);
    } else {
      await bot('I did not catch that. Pick a topic below, or ask the team directly on a call.', [CALL_BTN]);
      chips(FIRST);
    }
    down();
    busy = false;
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const v = input.value; input.value = '';
    ask(v);
  });

  root.querySelector('.chat__reset')?.addEventListener('click', () => {
    log.replaceChildren(); rail?.classList.remove('is-chat'); chips(FIRST); input.value = '';
    window.scrollTo({ top: 0, behavior: RM ? 'auto' : 'smooth' });
  });

  chips(FIRST);
  addEventListener('resize', down);

  /* на телефоне: кнопка «Ask us» возвращает к чату, когда он ушёл из вида */
  const fab = document.querySelector('.chat-fab');
  if (fab && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => fab.classList.toggle('on', !e.isIntersecting && !wide()), { threshold: 0 }).observe(root);
    fab.addEventListener('click', () => { root.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'center' }); setTimeout(() => input.focus({ preventScroll: true }), 500); });
  }
})();
