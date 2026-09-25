/* Общие эффекты сайта: хвост курсора, отпечатки на кнопке, пятна и звёзды в тёмных блоках.
   Перенесено из превью главной (версия D). */
(() => {
  const RM = matchMedia('(prefers-reduced-motion:reduce)').matches;
  if (!document.getElementById('trail')) { const t = document.createElement('div'); t.id = 'trail'; document.body.appendChild(t); }
  /* курсор */
  const SPEC=[{d:4,e:1,o:1},{d:8,e:.26,o:.55},{d:12,e:.155,o:.38},{d:16,e:.095,o:.25},{d:20,e:.055,o:.15}];
  const wrap=document.getElementById('trail');
  const nodes=SPEC.map(sp=>{
    const el=document.createElement('span'); el.className='trail';
    el.style.width=sp.d+'px'; el.style.height=sp.d+'px';
    el.style.margin=`${-sp.d/2}px 0 0 ${-sp.d/2}px`; el.style.setProperty('--o',sp.o);
    wrap.appendChild(el); return {el,x:0,y:0,...sp};
  });
  let mx=innerWidth/2,my=innerHeight/2,idle=null,big=false;
  addEventListener('pointermove',e=>{
    if(e.pointerType==='touch') return;
    mx=e.clientX; my=e.clientY; document.body.classList.add('cur-on');
    clearTimeout(idle); idle=setTimeout(()=>document.body.classList.remove('cur-on'),700);
    big=!!(e.target instanceof Element && e.target.closest('button,a,.ba__stage,summary'));
  });
  addEventListener('pointerleave',()=>document.body.classList.remove('cur-on'));
  (function loop(){
    nodes.forEach(n=>{ n.x+=(mx-n.x)*n.e; n.y+=(my-n.y)*n.e;
      const k=big&&n.d>5?1.5:1;
      // хвост сжимается в ноль, когда курсор остановился и точки его догнали
      const lag=n.d>5?Math.min(1,Math.hypot(mx-n.x,my-n.y)/14):1;
      n.s=(n.s??0)+((lag*k)-(n.s??0))*.3;
      n.el.style.transform=`translate(${n.x.toFixed(2)}px,${n.y.toFixed(2)}px) scale(${n.s.toFixed(3)})`; });
    requestAnimationFrame(loop);
  })();

  /* отпечатки на фиолетовой кнопке */
  const rnd=(a,b)=>a+Math.random()*(b-a);
  const HERE=import.meta.url; const FPS=[1,2,3,4].map(i=>new URL("../fp/fp"+i+".webp", HERE).href); FPS.forEach(u=>{const i=new Image(); i.src=u;});
  document.querySelectorAll('.btn--main').forEach(btn=>{
    const box=btn.querySelector('.prints'); if(!box) return;
    btn.addEventListener('pointerdown',e=>{
      const r=btn.getBoundingClientRect();
      const s=document.createElement('span'); s.className='print';
      s.style.left=(e.clientX-r.left)+'px'; s.style.top=(e.clientY-r.top)+'px';
      s.style.backgroundImage=`url("${FPS[(Math.random()*FPS.length)|0]}")`;
      s.style.setProperty('--rot',rnd(-180,180).toFixed(0)+'deg');
      s.style.setProperty('--sc',rnd(.6,1).toFixed(2));
      s.style.setProperty('--op',rnd(.3,.5).toFixed(2));
      box.appendChild(s); requestAnimationFrame(()=>s.classList.add('on'));
      if(box.children.length>12) box.firstChild.remove();
      setTimeout(()=>{s.classList.remove('on');s.classList.add('fade');setTimeout(()=>s.remove(),2200);},rnd(3000,5000));
    });
  });


  /* пятна в футере: плывут сами и чуть тянутся за курсором */
  (()=>{
    const ft=document.querySelector('.ft'), gs=[...document.querySelectorAll('.ft__glow')];
    if(!ft || !gs.length || RM) return;
    let mx=0,my=0,run=false,t0=performance.now();
    const st=gs.map(()=>({x:0,y:0}));
    ft.addEventListener('pointermove',e=>{const r=ft.getBoundingClientRect();
      mx=(e.clientX-r.left)/r.width-.5; my=(e.clientY-r.top)/r.height-.5;});
    ft.addEventListener('pointerleave',()=>{mx=0;my=0;});
    const tick=now=>{
      if(!run) return;
      const t=(now-t0)/1000, w=ft.offsetWidth;
      gs.forEach((g,k)=>{
        const s=k?-1:1, A=w*.07;
        const tx=Math.sin(t*.21+k*2.1)*A + Math.sin(t*.13+k)*A*.6 + mx*w*.09*s;
        const ty=Math.cos(t*.17+k*1.3)*A*.8 + my*w*.06*s;
        st[k].x+=(tx-st[k].x)*.02; st[k].y+=(ty-st[k].y)*.02;
        g.style.transform=`translate3d(${st[k].x.toFixed(1)}px,${st[k].y.toFixed(1)}px,0)`;
      });
      requestAnimationFrame(tick);
    };
    new IntersectionObserver(es=>es.forEach(e=>{ const was=run; run=e.isIntersecting; if(run&&!was) requestAnimationFrame(tick); })).observe(ft);
  })();


  /* звёзды: сетка точек и плавающие частицы, всё уходит от курсора (футер и блок концепта) */
  const stars=(host,cv)=>{
    if(!host||!cv||!cv.getContext) return;
    const ctx=cv.getContext('2d');
    let W=0,H=0,D=1,P=[],G=[],run=false,mx=-1e4,my=-1e4,gx=-1e4,gy=-1e4,first=true;
    const S=innerWidth<700?26:30;
    const size=()=>{
      D=Math.min(devicePixelRatio||1,1.5); W=host.offsetWidth; H=host.offsetHeight;
      cv.width=Math.round(W*D); cv.height=Math.round(H*D);
      const n=Math.min(innerWidth<700?260:620, Math.round(W*H/1500));
      P=[]; for(let i=0;i<n;i++) P.push({hx:Math.random()*W,hy:Math.random()*H,x:0,y:0,vx:0,vy:0,
        a:14+Math.random()*34,f:.00012+Math.random()*.00022,p:Math.random()*6.28,k:(Math.random()*4)|0});
      G=[]; const ox=(W%S)/2, oy=(H%S)/2;
      for(let y=oy;y<H;y+=S) for(let x=ox;x<W;x+=S) G.push(x,y);
      first=true;
    };
    host.addEventListener('pointermove',e=>{const r=host.getBoundingClientRect(); mx=e.clientX-r.left; my=e.clientY-r.top;});
    host.addEventListener('pointerleave',()=>{mx=-1e4;my=-1e4;});
    const B=[[],[],[],[]], AL=[.16,.28,.44,.7];
    const frame=T=>{
      gx+=(mx-gx)*.14; gy+=(my-gy)*.14;
      ctx.setTransform(D,0,0,D,0,0); ctx.clearRect(0,0,W,H);
      const RG=150,RG2=RG*RG, near=[];
      ctx.fillStyle='rgba(185,162,245,.17)';
      for(let i=0;i<G.length;i+=2){
        const x=G[i],y=G[i+1],dx=x-gx,dy=y-gy,d2=dx*dx+dy*dy;
        if(d2<RG2){const d=Math.sqrt(d2)||1,f=1-d/RG; near.push(x+dx/d*f*f*26,y+dy/d*f*f*26,f);}
        else ctx.fillRect(x-.75,y-.75,1.5,1.5);
      }
      for(let i=0;i<near.length;i+=3){const f=near[i+2];
        ctx.fillStyle=`rgba(196,176,250,${(.17+f*.6).toFixed(3)})`; const s=1.5+f*2;
        ctx.fillRect(near[i]-s/2,near[i+1]-s/2,s,s);}
      for(const b of B) b.length=0;
      const RP=130,RP2=RP*RP;
      for(const p of P){
        const tx=p.hx+Math.sin(T*p.f+p.p)*p.a, ty=p.hy+Math.cos(T*p.f*1.3+p.p)*p.a*.7;
        if(first){p.x=tx;p.y=ty;}
        let ax=(tx-p.x)*.04, ay=(ty-p.y)*.04;
        const dx=p.x-mx,dy=p.y-my,d2=dx*dx+dy*dy;
        if(d2<RP2){const d=Math.sqrt(d2)||1,f=1-d/RP; ax+=dx/d*f*f*9; ay+=dy/d*f*f*9;}
        p.vx=(p.vx+ax)*.82; p.vy=(p.vy+ay)*.82; p.x+=p.vx; p.y+=p.vy;
        B[p.k].push(p.x,p.y);
      }
      first=false;
      for(let k=0;k<4;k++){const b=B[k]; if(!b.length) continue;
        ctx.fillStyle=`rgba(196,176,250,${AL[k]})`; const sz=k>1?1.9:1.4;
        for(let i=0;i<b.length;i+=2) ctx.fillRect(b[i],b[i+1],sz,sz);}
    };
    const tick=t=>{ if(!run) return; frame(t); requestAnimationFrame(tick); };
    size(); frame(performance.now());
    addEventListener('resize',()=>{size();frame(performance.now());});
    if(RM) return;
    new IntersectionObserver(es=>es.forEach(e=>{const was=run; run=e.isIntersecting; if(run&&!was) requestAnimationFrame(tick);})).observe(host);
  };
  document.querySelectorAll('.stars').forEach(cv=>stars(cv.parentElement,cv));

})();
