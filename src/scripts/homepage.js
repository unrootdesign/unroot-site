
    (() => {
      const overlay = document.querySelector('[data-overlay]');
      const input = document.querySelector('[data-command-input]');
      const allResults = [...document.querySelectorAll('[data-result]')];
      const empty = document.querySelector('[data-empty]');
      let visible = [...allResults];
      let active = 0;

      const paint = () => {
        allResults.forEach(item => item.classList.remove('active'));
        if (!visible.length) return;
        active = Math.max(0, Math.min(active, visible.length - 1));
        visible[active].classList.add('active');
        visible[active].scrollIntoView({block:'nearest'});
      };
      const filter = () => {
        const q = input.value.trim().toLowerCase();
        visible = allResults.filter(item => {
          const ok = !q || item.dataset.search.includes(q) || item.textContent.toLowerCase().includes(q);
          item.hidden = !ok;
          return ok;
        });
        empty.hidden = visible.length > 0;
        active = 0;
        paint();
      };
      let previousFocus;
      const open = () => { previousFocus = document.activeElement; document.querySelector(".shell").inert = true; overlay.hidden = false; document.body.classList.add('command-open'); input.value=''; filter(); setTimeout(() => input.focus(),20); };
      const close = () => { document.querySelector(".shell").inert = false; previousFocus?.focus({preventScroll:true}); overlay.hidden = true; document.body.classList.remove('command-open'); };
      document.querySelectorAll('[data-open-command]').forEach(btn => btn.addEventListener('click', open));
      input.addEventListener('input', filter);
      overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
      allResults.forEach(item => item.addEventListener('click', close));
      document.addEventListener('keydown', e => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); overlay.hidden ? open() : close(); return; }
        if (overlay.hidden) return;
        if (e.key === 'Escape') { close(); return; }
        if (e.key === 'Tab') {
          e.preventDefault();
          const items = [input, ...visible];
          const index = items.indexOf(document.activeElement);
          items[(index + (e.shiftKey ? -1 : 1) + items.length) % items.length].focus();
        }
        if (document.activeElement !== input) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(active + 1, visible.length - 1); paint(); }
        if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(active - 1, 0); paint(); }
        if (e.key === 'Enter' && visible[active]) { e.preventDefault(); visible[active].click(); }
      });

      const compare = document.querySelector('[data-compare]');
      const range = document.querySelector('[data-compare-range]');
      const setCompare = () => {
        compare.style.setProperty('--reveal', range.value + '%');
        range.setAttribute('aria-valuetext', range.value + '% concept revealed');
      };
      range.addEventListener('input', setCompare);
      setCompare();
      const tabs = [...document.querySelectorAll('[data-project]')];
      const selectProject = btn => {
        tabs.forEach(tab => {
          tab.classList.toggle('active', tab === btn);
          tab.setAttribute('aria-selected', String(tab === btn));
          tab.tabIndex = tab === btn ? 0 : -1;
        });
        const name = btn.dataset.project;
        const before = document.querySelector('[data-before-image]');
        const after = document.querySelector('[data-concept-image]');
        before.src = btn.dataset.before;
        before.alt = name + ' website before redesign';
        after.src = btn.dataset.afterImage;
        after.alt = name + ' homepage concept';
        document.querySelector('[data-before-label]').textContent = 'Before, ' + name;
        document.querySelector('[data-after-label]').textContent = '7 day concept, ' + name;
      };
      tabs.forEach((btn, index) => {
        btn.addEventListener('click', () => selectProject(btn));
        btn.addEventListener('keydown', event => {
          let next;
          if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
          if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
          if (event.key === 'Home') next = 0;
          if (event.key === 'End') next = tabs.length - 1;
          if (next === undefined) return;
          event.preventDefault(); selectProject(tabs[next]); tabs[next].focus();
        });
      });
      document.querySelectorAll('.case-visual').forEach(gallery => {
        const images = [...gallery.querySelectorAll('img')];
        const buttons = [...gallery.querySelectorAll('[data-case-image]')];
        buttons.forEach(button => button.addEventListener('click', () => {
          images.forEach((image, index) => image.hidden = index !== Number(button.dataset.caseImage));
          buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
        }));
      });

      const board = document.querySelector('[data-board]');
      const cards = [...document.querySelectorAll('[data-drag]')];
      const initial = cards.map(card => ({left:card.style.left, top:card.style.top, transform:getComputedStyle(card).transform}));
      cards.forEach(card => {
        let dx = 0, dy = 0, moving = false;
        card.addEventListener('pointerdown', e => {
          if (window.matchMedia('(max-width:520px)').matches || e.button !== 0) return;
          moving = true;
          const rect = card.getBoundingClientRect();
          dx = e.clientX - rect.left; dy = e.clientY - rect.top;
          card.setPointerCapture(e.pointerId);
          card.style.zIndex = 20;
          card.style.transform = 'rotate(0deg) scale(1.02)';
        });
        card.addEventListener('pointermove', e => {
          if (!moving) return;
          const b = board.getBoundingClientRect();
          const c = card.getBoundingClientRect();
          const x = Math.max(0, Math.min(b.width - c.width, e.clientX - b.left - dx));
          const y = Math.max(0, Math.min(b.height - c.height, e.clientY - b.top - dy));
          card.style.left = x + 'px'; card.style.top = y + 'px';
        });
        const end = () => { moving = false; card.style.zIndex = ''; card.style.transform = 'rotate(0deg)'; };
        card.addEventListener('pointerup', end); card.addEventListener('pointercancel', end);
      });
      document.querySelector('[data-reset]').addEventListener('click', () => cards.forEach(card => { card.removeAttribute('style'); }));

      const time = document.querySelector('[data-warsaw-time]');
      const updateTime = () => {
        const value = new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Warsaw',hour:'2-digit',minute:'2-digit',weekday:'short'}).format(new Date());
        time.textContent = 'Warsaw, ' + value;
      };
      updateTime(); setInterval(updateTime, 30000);
    })();

