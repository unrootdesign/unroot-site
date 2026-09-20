const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const compactDesk = window.matchMedia('(max-width: 600px)');

// Keep studio clocks in their named time zones.
const updateClocks = () => {
  for (const [key, timeZone] of [['w', 'Europe/Warsaw'], ['n', 'America/New_York']]) {
    const time = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit' }).format(new Date());
    document.querySelectorAll(`[data-clk="${key}"]`).forEach(clock => { clock.textContent = time; });
  }
};
updateClocks();
setInterval(updateClocks, 30000);

// Tabs follow the keyboard pattern: one tab stop, arrows to switch panels.
const tabs = [...document.querySelectorAll('[data-tab]')];
const videos = [...document.querySelectorAll('.an__stage video')];
const selectTab = tab => {
  tabs.forEach(item => {
    item.setAttribute('aria-selected', String(item === tab));
    item.tabIndex = item === tab ? 0 : -1;
  });
  document.querySelectorAll('[data-pane]').forEach(pane => { pane.hidden = pane.dataset.pane !== tab.dataset.tab; });
  videos.forEach(video => video.pause());
};
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    selectTab(tabs[next]);
    tabs[next].focus();
  });
});

// A native range input gives the comparison both touch and keyboard support.
document.querySelectorAll('.ba__stage').forEach(stage => {
  const range = document.createElement('input');
  range.type = 'range';
  range.min = '0';
  range.max = '100';
  range.value = '50';
  range.className = 'comparison-range';
  const project = stage.closest('figure').querySelector('figcaption b').textContent;
  range.setAttribute('aria-label', `Before and after comparison for ${project}`);
  const update = () => {
    stage.style.setProperty('--sp', `${range.value}%`);
    range.setAttribute('aria-valuetext', `${range.value}% before, ${100 - Number(range.value)}% after`);
  };
  range.addEventListener('input', update);
  stage.append(range);
  update();
});

// Videos have native controls; autoplay only when visible and motion is welcome.
const videoObserver = new IntersectionObserver(entries => entries.forEach(({ target: video, isIntersecting }) => {
  if (isIntersecting && !reducedMotion.matches && !document.hidden) video.play().catch(() => {});
  else video.pause();
}), { threshold: 0.35 });
videos.forEach(video => videoObserver.observe(video));
const pauseVideos = () => videos.forEach(video => video.pause());
reducedMotion.addEventListener('change', pauseVideos);
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseVideos(); });

// Project previews change on deliberate hover or keyboard focus.
document.querySelectorAll('.wk__c').forEach(card => {
  const images = [...card.querySelectorAll('.wk__v img')];
  let index = 0;
  let timer;
  const stop = () => { clearInterval(timer); timer = undefined; };
  const start = () => {
    if (timer || reducedMotion.matches) return;
    timer = setInterval(() => {
      if (document.hidden) { stop(); return; }
      images[index].classList.remove('on');
      index = (index + 1) % images.length;
      images[index].classList.add('on');
    }, 1600);
  };
  card.addEventListener('pointerenter', start);
  card.addEventListener('pointerleave', stop);
  card.addEventListener('focusin', start);
  card.addEventListener('focusout', stop);
  reducedMotion.addEventListener('change', stop);
});

const quotes = [...document.querySelectorAll('.q')];
const dots = [...document.querySelectorAll('[data-go]')];
let quoteIndex = 0;
const showQuote = index => {
  quoteIndex = (index + quotes.length) % quotes.length;
  quotes.forEach((quote, i) => {
    quote.classList.toggle('on', i === quoteIndex);
    quote.setAttribute('aria-hidden', String(i !== quoteIndex));
    quote.inert = i !== quoteIndex;
  });
  dots.forEach((dot, i) => {
    dot.classList.toggle('on', i === quoteIndex);
    dot.setAttribute('aria-pressed', String(i === quoteIndex));
  });
};
document.getElementById('qPrev').addEventListener('click', () => showQuote(quoteIndex - 1));
document.getElementById('qNext').addEventListener('click', () => showQuote(quoteIndex + 1));
dots.forEach(dot => dot.addEventListener('click', () => showQuote(Number(dot.dataset.go))));
showQuote(0);

const overlay = document.querySelector('[data-command-overlay]');
const input = document.querySelector('[data-command-input]');
const results = [...document.querySelectorAll('[data-command-result]')];
const empty = document.querySelector('[data-command-empty]');
const background = [...document.body.children].filter(element => element !== overlay && element.tagName !== 'SCRIPT');
let previousFocus;
let inertState = [];
let visible = [...results];
let active = 0;
const paint = () => {
  results.forEach(result => result.classList.remove('is-active'));
  active = Math.max(0, Math.min(active, visible.length - 1));
  visible[active]?.classList.add('is-active');
  visible[active]?.scrollIntoView({ block: 'nearest' });
};
const filter = () => {
  const terms = input.value.trim().toLowerCase().split(/\s+/);
  visible = results.filter(result => {
    const text = `${result.dataset.search} ${result.textContent}`.toLowerCase();
    result.hidden = !terms.every(term => text.includes(term));
    return !result.hidden;
  });
  empty.hidden = visible.length > 0;
  active = 0;
  paint();
};
const openCommand = () => {
  previousFocus = document.activeElement;
  inertState = background.map(element => element.inert);
  background.forEach(element => { element.inert = true; });
  overlay.hidden = false;
  document.body.classList.add('command-open');
  input.value = '';
  filter();
  input.focus();
};
const closeCommand = () => {
  overlay.hidden = true;
  document.body.classList.remove('command-open');
  background.forEach((element, index) => { element.inert = inertState[index]; });
  previousFocus?.focus({ preventScroll: true });
};
document.querySelectorAll('[data-command-open]').forEach(button => button.addEventListener('click', openCommand));
document.querySelector('[data-command-close]').addEventListener('click', closeCommand);
input.addEventListener('input', filter);
overlay.addEventListener('click', event => { if (event.target === overlay) closeCommand(); });
results.forEach(result => result.addEventListener('click', () => {
  closeCommand();
  const href = result.getAttribute('href');
  if (!href.startsWith('#')) return;
  const target = document.querySelector(href);
  if (target) {
    target.tabIndex = -1;
    target.focus({ preventScroll: true });
  }
}));
document.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    overlay.hidden ? openCommand() : closeCommand();
    return;
  }
  if (overlay.hidden) return;
  if (event.key === 'Escape') { event.preventDefault(); closeCommand(); return; }
  if (event.key === 'Tab') {
    const focusable = [input, document.querySelector('[data-command-close]'), ...visible];
    const index = focusable.indexOf(document.activeElement);
    event.preventDefault();
    focusable[(index + (event.shiftKey ? -1 : 1) + focusable.length) % focusable.length].focus();
  }
  if (document.activeElement !== input) return;
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    active += event.key === 'ArrowDown' ? 1 : -1;
    paint();
  }
  if (event.key === 'Enter' && visible[active]) { event.preventDefault(); visible[active].click(); }
});

// The desk stays draggable on desktop and becomes a complete gallery on phones.
const board = document.querySelector('[data-playboard]');
const cards = [...document.querySelectorAll('[data-drag-card]')];
const moveCard = (card, x, y) => {
  card.style.left = `${Math.max(0, Math.min(board.clientWidth - card.offsetWidth, x))}px`;
  card.style.top = `${Math.max(0, Math.min(board.clientHeight - card.offsetHeight, y))}px`;
};
cards.forEach(card => {
  let pointer;
  let dx = 0;
  let dy = 0;
  card.addEventListener('pointerdown', event => {
    if (compactDesk.matches || event.button !== 0) return;
    pointer = event.pointerId;
    card.style.transform = 'rotate(0deg)';
    const rect = card.getBoundingClientRect();
    dx = event.clientX - rect.left;
    dy = event.clientY - rect.top;
    card.setPointerCapture(pointer);
    card.style.zIndex = '25';
  });
  card.addEventListener('pointermove', event => {
    if (pointer !== event.pointerId) return;
    const rect = board.getBoundingClientRect();
    moveCard(card, event.clientX - rect.left - board.clientLeft - dx, event.clientY - rect.top - board.clientTop - dy);
  });
  const end = () => { pointer = undefined; card.style.zIndex = ''; };
  card.addEventListener('pointerup', end);
  card.addEventListener('pointercancel', end);
  card.addEventListener('lostpointercapture', end);
  card.addEventListener('keydown', event => {
    if (compactDesk.matches || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const step = event.shiftKey ? 30 : 10;
    card.style.transform = 'rotate(0deg)';
    moveCard(card, card.offsetLeft + (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0), card.offsetTop + (event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0));
  });
});
const resetDesk = () => cards.forEach(card => { card.removeAttribute('style'); card.tabIndex = compactDesk.matches ? -1 : 0; });
document.querySelector('[data-play-reset]').addEventListener('click', resetDesk);
window.addEventListener('resize', resetDesk);
resetDesk();

document.querySelectorAll('[data-scroll]').forEach(button => button.addEventListener('click', () => {
  document.getElementById(button.dataset.scroll)?.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth' });
}));
