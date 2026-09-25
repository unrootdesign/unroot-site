/* Поведение главной: заголовки, табы, до/после, видео, кейсы, отзывы, услуги. */
(() => {
  const RM = matchMedia('(prefers-reduced-motion:reduce)').matches;
  /* пословное проявление заголовков */
  function splitWords(el){
    const walk=node=>{
      [...node.childNodes].forEach(ch=>{
        if(ch.nodeType===3){
          const parts=ch.textContent.split(/(\s+)/);
          const frag=document.createDocumentFragment();
          parts.forEach(p=>{
            if(!p) return;
            if(/^\s+$/.test(p)){frag.appendChild(document.createTextNode(p));return;}
            const s=document.createElement('span'); s.className='w'; s.textContent=p; frag.appendChild(s);
          });
          ch.replaceWith(frag);
        } else if(ch.nodeType===1 && !ch.classList.contains('w')) walk(ch);
      });
    };
    walk(el);
    el.querySelectorAll('.w').forEach((w,i)=>w.style.transitionDelay=(i*55)+'ms');
  }
  const rvs=[...document.querySelectorAll('.rv')];
  if(RM || !('IntersectionObserver' in window)) rvs.forEach(e=>e.classList.add('in'));
  else{
    rvs.forEach(splitWords);
    const ro=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');ro.unobserve(e.target);}}),{threshold:.35});
    rvs.forEach(e=>ro.observe(e));
  }

  /* табы */
  document.querySelectorAll('.tabs button').forEach(b=>b.addEventListener('click',()=>{
    document.querySelectorAll('.tabs button').forEach(x=>x.setAttribute('aria-selected',String(x===b)));
    document.querySelectorAll('.pane').forEach(p=>p.hidden=p.dataset.pane!==b.dataset.tab);
  }));

  /* до и после */
  document.querySelectorAll('.ba__stage').forEach(st=>{
    const set=x=>{const r=st.getBoundingClientRect();
      st.style.setProperty('--sp',Math.max(0,Math.min(100,((x-r.left)/r.width)*100))+'%');};
    st.addEventListener('pointermove',e=>set(e.clientX));
    st.addEventListener('pointerdown',e=>{st.setPointerCapture(e.pointerId);set(e.clientX);});
    st.addEventListener('pointerleave',()=>st.style.setProperty('--sp','50%'));
  });

  /* видео: грузим и играем то, что в кадре */
  const vids=[...document.querySelectorAll('video[data-lazy], .home video:not(.svv)')];
  if('IntersectionObserver' in window){
    const io=new IntersectionObserver(es=>es.forEach(e=>{
      const v=e.target;
      if(e.isIntersecting){ if(!v.dataset.l){v.dataset.l=1;v.preload='auto';v.load();} v.play().catch(()=>{}); }
      else v.pause();
    }),{threshold:.25});
    vids.forEach(v=>io.observe(v));
  }

  /* кадры в кейсах, без анимации */
  document.querySelectorAll('.wk__c .win__v').forEach((box,bi)=>{
    const ims=[...box.querySelectorAll('img')];
    if(ims.length<2) return;
    let i=0;
    setTimeout(()=>setInterval(()=>{
      ims[i].classList.remove('on'); i=(i+1)%ims.length; ims[i].classList.add('on');
    },420), bi*140);
  });

  /* отзывы */
  const qs=[...document.querySelectorAll('.q')], cnt=document.getElementById('qn');
  let qi=0;
  const go=i=>{qi=(i+qs.length)%qs.length; qs.forEach((q,k)=>q.classList.toggle('on',k===qi));
    if(cnt) cnt.textContent=String(qi+1).padStart(2,'0')+' / '+String(qs.length).padStart(2,'0');};
  if(qs.length){
    document.getElementById('qPrev')?.addEventListener('click',()=>go(qi-1));
    document.getElementById('qNext')?.addEventListener('click',()=>go(qi+1));
    go(0);
  }

  /* услуги: пункт слева, примеры справа */
  (()=>{
    const items=[...document.querySelectorAll('.sv')], ls=[...document.querySelectorAll('.svm__l')];
    if(!items.length) return;
    let cur=-1, timer=null, auto=null, touched=false;
    const wide=()=>matchMedia('(min-width:1101px)').matches;
    const set=i=>{
      if(i===cur) return; cur=i;
      items.forEach((x,k)=>x.classList.toggle('on',k===i));
      ls.forEach((l,k)=>{
        const on=k===i; l.classList.toggle('on',on);
        const v=l.querySelector('video');
        if(v){ if(on){ if(!v.dataset.l){v.dataset.l=1;v.preload='auto';v.load();} v.currentTime=0; v.play().catch(()=>{}); } else v.pause(); }
      });
      clearInterval(timer);
      const ims=[...ls[i].querySelectorAll('img')];
      if(ims.length>1 && !RM){
        let n=0; ims.forEach((m,k)=>m.classList.toggle('on',k===0));
        timer=setInterval(()=>{ims[n].classList.remove('on'); n=(n+1)%ims.length; ims[n].classList.add('on');},900);
      }
    };
    items.forEach((x,k)=>{
      x.addEventListener('mouseenter',()=>{ if(wide()) set(k); });
      x.addEventListener('click',()=>{ touched=true; set(k); });
    });
    const io=new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting && wide()) set(+e.target.dataset.i); }),
      {rootMargin:'-46% 0px -46% 0px'});
    items.forEach(x=>io.observe(x));
    // на узких экранах сами листаются, пока не нажали
    const box=document.querySelector('.svm'); if(!box) return;
    new IntersectionObserver(es=>es.forEach(e=>{
      clearInterval(auto);
      if(e.isIntersecting && !wide() && !RM) auto=setInterval(()=>{ if(!touched) set((cur+1)%items.length); },4200);
    }),{threshold:.4}).observe(box);
    set(0);
  })();

})();
