/* Общие эффекты сайта: хвост курсора, отпечатки на кнопке, пятна и звёзды в тёмных блоках.
   Перенесено из превью главной (версия D). */
(() => {
  const RM = matchMedia('(prefers-reduced-motion:reduce)').matches;
  /* курсор: звезда с хвостом. Canvas поверх страницы, клики не перехватывает */
  (()=>{
    if(RM || matchMedia('(pointer:coarse)').matches) return;
    const cv=document.createElement('canvas'); cv.className='comet'; cv.setAttribute('aria-hidden','true');
    document.body.appendChild(cv);
    const ctx=cv.getContext('2d');
    let W=0,H=0,D=1;
    const size=()=>{ D=Math.min(devicePixelRatio||1,2); W=innerWidth; H=innerHeight; cv.width=W*D; cv.height=H*D; };
    size(); addEventListener('resize',size);
    let mx=-100,my=-100,hx=-100,hy=-100,alpha=0,last=0,running=false,seen=false;
    const pts=[]; const LIFE=420;
    const start=()=>{ if(!running){ running=true; requestAnimationFrame(tick); } };
    addEventListener('pointermove',e=>{
      if(e.pointerType==='touch') return;
      mx=e.clientX; my=e.clientY; last=performance.now();
      if(!seen){ hx=mx; hy=my; seen=true; }
      start();
    },{passive:true});
    document.addEventListener('pointerleave',()=>{ last=0; });
    function tick(t){
      hx+=(mx-hx)*.55; hy+=(my-hy)*.55;
      const moving=t-last<120;
      pts.push({x:hx,y:hy,t});
      while(pts.length && t-pts[0].t>LIFE) pts.shift();
      const target=(t-last<1200 && last)?1:0;
      alpha+=(target-alpha)*.12;
      ctx.setTransform(D,0,0,D,0,0); ctx.clearRect(0,0,W,H);
      // хвост: сужается и гаснет к концу
      ctx.lineCap='round';
      for(let i=1;i<pts.length;i++){
        const a=pts[i-1], b=pts[i], k=1-(t-b.t)/LIFE;
        if(k<=0) continue;
        ctx.strokeStyle=`rgba(137,97,231,${(k*k*.55*alpha).toFixed(3)})`;
        ctx.lineWidth=.5+k*4.5;
        ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
      }
      // голова: ядро и свечение
      const r=moving?16:12;
      const g=ctx.createRadialGradient(hx,hy,0,hx,hy,r);
      g.addColorStop(0,`rgba(185,162,245,${(.55*alpha).toFixed(3)})`);
      g.addColorStop(.35,`rgba(137,97,231,${(.28*alpha).toFixed(3)})`);
      g.addColorStop(1,'rgba(137,97,231,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(hx,hy,r,0,6.2832); ctx.fill();
      ctx.fillStyle=`rgba(255,255,255,${alpha.toFixed(3)})`;
      ctx.beginPath(); ctx.arc(hx,hy,1.6,0,6.2832); ctx.fill();
      ctx.fillStyle=`rgba(137,97,231,${alpha.toFixed(3)})`;
      ctx.beginPath(); ctx.arc(hx,hy,2.6,0,6.2832); ctx.lineWidth=1.2; ctx.strokeStyle=ctx.fillStyle; ctx.stroke();
      if(alpha<.01 && !pts.length){ running=false; ctx.clearRect(0,0,W,H); return; }
      if(alpha<.01 && t-last>1200){ pts.length=0; }
      requestAnimationFrame(tick);
    }
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


  /* звёзды: плавают, уходят от курсора и иногда гаснут и загораются в новом месте (футер и тёмный блок) */
  const stars=(host,cv)=>{
    if(!host||!cv||!cv.getContext) return;
    const ctx=cv.getContext('2d');
    let W=0,H=0,D=1,P=[],run=false,mx=-1e4,my=-1e4;
    const R=(a,b)=>a+Math.random()*(b-a);
    const place=(p)=>{ p.hx=Math.random()*W; p.hy=Math.random()*H; p.x=p.hx; p.y=p.hy; p.vx=0; p.vy=0; };
    const size=()=>{
      D=Math.min(devicePixelRatio||1,1.5); W=host.offsetWidth; H=host.offsetHeight;
      cv.width=Math.round(W*D); cv.height=Math.round(H*D);
      const n=Math.min(innerWidth<700?380:1100, Math.round(W*H/900));
      const now=performance.now();
      P=[]; for(let i=0;i<n;i++){ const p={a:10+Math.random()*36,f:.00012+Math.random()*.00022,ph:Math.random()*6.28,
        k:(Math.random()*4)|0, o:1, st:0, at:now+R(2000,30000)}; place(p); P.push(p); }
    };
    host.addEventListener('pointermove',e=>{const r=host.getBoundingClientRect(); mx=e.clientX-r.left; my=e.clientY-r.top;});
    host.addEventListener('pointerleave',()=>{mx=-1e4;my=-1e4;});
    const B=[[],[],[],[]], AL=[.18,.3,.46,.75], SZ=[1.1,1.4,1.8,2.3];
    const frame=T=>{
      ctx.setTransform(D,0,0,D,0,0); ctx.clearRect(0,0,W,H);
      for(const b of B) b.length=0;
      const RP=130,RP2=RP*RP;
      for(const p of P){
        // мерцание: живёт, гаснет, пропадает, появляется в другом месте
        if(T>p.at){
          if(p.st===0){ p.st=1; p.at=T+R(700,1400); }
          else if(p.st===1){ p.st=2; p.at=T+R(800,4000); p.o=0; }
          else if(p.st===2){ place(p); p.st=3; p.at=T+R(700,1400); }
          else { p.st=0; p.o=1; p.at=T+R(8000,40000); }
        }
        if(p.st===1) p.o=Math.max(0,(p.at-T)/1000);
        else if(p.st===3) p.o=Math.min(1,1-(p.at-T)/1000);
        if(p.st===2) continue;
        const tx=p.hx+Math.sin(T*p.f+p.ph)*p.a, ty=p.hy+Math.cos(T*p.f*1.3+p.ph)*p.a*.7;
        let ax=(tx-p.x)*.04, ay=(ty-p.y)*.04;
        const dx=p.x-mx,dy=p.y-my,d2=dx*dx+dy*dy;
        if(d2<RP2){const d=Math.sqrt(d2)||1,f=1-d/RP; ax+=dx/d*f*f*9; ay+=dy/d*f*f*9;}
        p.vx=(p.vx+ax)*.82; p.vy=(p.vy+ay)*.82; p.x+=p.vx; p.y+=p.vy;
        B[p.k].push(p.x,p.y,p.o);
      }
      for(let k=0;k<4;k++){ const b=B[k], sz=SZ[k];
        for(let i=0;i<b.length;i+=3){
          ctx.fillStyle=`rgba(196,176,250,${(AL[k]*b[i+2]).toFixed(3)})`;
          ctx.fillRect(b[i]-sz/2,b[i+1]-sz/2,sz,sz);
        }
      }
    };
    const tick=t=>{ if(!run) return; frame(t); requestAnimationFrame(tick); };
    size(); frame(performance.now());
    addEventListener('resize',()=>{size();frame(performance.now());});
    if(RM) return;
    new IntersectionObserver(es=>es.forEach(e=>{const was=run; run=e.isIntersecting; if(run&&!was) requestAnimationFrame(tick);})).observe(host);
  };
  document.querySelectorAll('.stars').forEach(cv=>stars(cv.parentElement,cv));

})();
