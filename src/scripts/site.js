/* Общие эффекты сайта: курсор со звёздной пылью, отпечатки на кнопке, пятна и звёзды в тёмных блоках.
   Перенесено из превью главной (версия D). */
(() => {
  const RM = matchMedia('(prefers-reduced-motion:reduce)').matches;
  /* курсор: плотная цепочка светящихся точек бежит за мышью,
     сначала держит линию, потом распадается и гаснет, как звёзды в футере. На тёмных блоках звёзды светлые, на светлом фоне фиолетовые */
  (()=>{
    if(RM || matchMedia('(pointer:coarse)').matches) return;
    const cv=document.createElement('canvas'); cv.className='comet'; cv.setAttribute('aria-hidden','true');
    document.body.appendChild(cv);
    const ctx=cv.getContext('2d');
    let W=0,H=0,D=1;
    const size=()=>{ D=Math.min(devicePixelRatio||1,2); W=innerWidth; H=innerHeight; cv.width=W*D; cv.height=H*D; };
    size(); addEventListener('resize',size);
    const R=(a,b)=>a+Math.random()*(b-a);
    // спрайты рисуются один раз: мягкая точка и четырёхлучевая искра, для светлого и тёмного фона
    const sprite=(core,glow,spark)=>{
      const s=document.createElement('canvas'); s.width=s.height=64; const c=s.getContext('2d');
      const g=c.createRadialGradient(32,32,0,32,32,32);
      g.addColorStop(0,core); g.addColorStop(.16,core); g.addColorStop(.42,glow); g.addColorStop(1,'rgba(0,0,0,0)');
      c.fillStyle=g; c.fillRect(0,0,64,64);
      if(spark){ c.fillStyle=core; c.beginPath();
        c.moveTo(32,2); c.quadraticCurveTo(34,30,62,32); c.quadraticCurveTo(34,34,32,62); c.quadraticCurveTo(30,34,2,32); c.quadraticCurveTo(30,30,32,2); c.fill(); }
      return s;
    };
    const SP={
      light:[sprite('rgba(137,97,231,1)','rgba(137,97,231,.28)'),sprite('rgba(106,67,209,1)','rgba(137,97,231,.22)'),sprite('rgba(137,97,231,1)','rgba(185,162,245,.3)',true)],
      dark:[sprite('rgba(255,255,255,1)','rgba(185,162,245,.35)'),sprite('rgba(210,194,252,1)','rgba(185,162,245,.3)'),sprite('rgba(255,255,255,1)','rgba(185,162,245,.35)',true)]
    };
    const MAX=1100, P=[];
    let dark=false, running=false, lastCheck=0, H4=[], last=0;
    const isDark=(x,y)=>{ const el=document.elementFromPoint(x,y); return !!(el && el.closest('.ft,.ob,.pk,.stage--night')); };
    // Catmull-Rom: путь мыши сглаживается кривой через точки, поэтому быстрый круг выходит кругом, а не многоугольником
    const cr=(a,b,c,d,t)=>{ const t2=t*t,t3=t2*t; return .5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t2+(-a+3*b-3*c+d)*t3); };
    const put=(x,y,sp,now)=>{
      if(P.length>=MAX) P.shift();
      const a=Math.random()*6.2832, r=Math.pow(Math.random(),1.6)*sp, v=R(.16,.7);
      P.push({ x:x+Math.cos(a)*r, y:y+Math.sin(a)*r,
        vx:Math.cos(a)*v, vy:Math.sin(a)*v+R(0,.06), hold:R(110,300),
        s:R(2.6,4.8), k:Math.random()<.5?0:1, set:dark?'dark':'light',
        b:now, life:R(800,1500), f:R(.008,.02), ph:Math.random()*6.28 });
    };
    // точки ставятся вдоль сглаженного отрезка между двумя предыдущими замерами
    const seg=(p0,p1,p2,p3,now)=>{
      const dist=Math.hypot(p2.x-p1.x,p2.y-p1.y); if(dist<1) return;
      const n=Math.min(48,Math.max(1,Math.round(dist/2.6)));
      const sp=Math.min(4,.9+dist*.035);
      for(let i=0;i<n;i++){ const t=(i+Math.random())/n; put(cr(p0.x,p1.x,p2.x,p3.x,t),cr(p0.y,p1.y,p2.y,p3.y,t),sp,now); }
    };
    const add=(x,y,now)=>{
      const q=H4[H4.length-1]; if(q && Math.hypot(x-q.x,y-q.y)<2) return;
      H4.push({x,y}); if(H4.length>4) H4.shift();
      if(H4.length===4) seg(H4[0],H4[1],H4[2],H4[3],now);
      else if(H4.length===3) seg(H4[0],H4[0],H4[1],H4[2],now);
    };
    addEventListener('pointermove',e=>{
      if(e.pointerType==='touch') return;
      const now=performance.now();
      if(now-lastCheck>120){ dark=isDark(e.clientX,e.clientY); lastCheck=now; }
      const list=e.getCoalescedEvents?e.getCoalescedEvents():[];   // все промежуточные замеры мыши, не только раз в кадр
      if(list.length) for(const c of list) add(c.clientX,c.clientY,now); else add(e.clientX,e.clientY,now);
      if(!running){ running=true; last=now; requestAnimationFrame(tick); }
    },{passive:true});
    document.addEventListener('pointerleave',()=>{ H4=[]; });
    addEventListener('scroll',()=>{ lastCheck=0; H4=[]; },{passive:true});
    function tick(now){
      const k=Math.min(3,(now-last)/16.67); last=now;   // движение не зависит от частоты кадров
      const damp=Math.pow(.986,k);
      ctx.setTransform(D,0,0,D,0,0); ctx.clearRect(0,0,W,H);
      for(let i=P.length-1;i>=0;i--){
        const p=P[i], age=(now-p.b)/p.life;
        if(age>=1){ P.splice(i,1); continue; }
        if(now-p.b>p.hold){ p.x+=p.vx*k; p.y+=p.vy*k; p.vx*=damp; p.vy*=damp; }   // сначала держат линию, потом разлетаются
        const fin=Math.min(1,age*14), fout=1-age*age;       // быстро вспыхивает, плавно гаснет
        const tw=.62+.38*Math.sin(now*p.f+p.ph);            // мерцание
        ctx.globalAlpha=fin*fout*tw;
        ctx.drawImage(SP[p.set][p.k],p.x-p.s,p.y-p.s,p.s*2,p.s*2);
      }
      ctx.globalAlpha=1;
      if(P.length) requestAnimationFrame(tick); else { running=false; ctx.clearRect(0,0,W,H); }
    }
  })();



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
    let W=0,H=0,D=1,P=[],run=false,mx=-1e4,my=-1e4,clk=0,lt=0;
    const R=(a,b)=>a+Math.random()*(b-a);
    const place=(p)=>{ p.hx=Math.random()*W; p.hy=Math.random()*H; p.x=p.hx; p.y=p.hy; p.vx=0; p.vy=0; };
    const size=()=>{
      D=Math.min(devicePixelRatio||1,1.5); W=host.offsetWidth; H=host.offsetHeight;
      cv.width=Math.round(W*D); cv.height=Math.round(H*D);
      const n=Math.min(innerWidth<700?320:950, Math.round(W*H/1050));
      const now=clk;
      P=[]; for(let i=0;i<n;i++){ const p={a:10+Math.random()*36,f:.00005+Math.random()*.0001,ph:Math.random()*6.28,
        k:(Math.random()*4)|0, o:1, g:0, st:0, tw:Math.random()<.1};
        // у каждой звезды своя фаза, чтобы они никогда не загорались разом
        if(p.tw && Math.random()<.5){ p.st=2; p.o=0; p.at=now+R(0,12000); } else p.at=now+(p.tw?R(0,30000):R(20000,900000)); place(p); P.push(p); }
    };
    host.addEventListener('pointermove',e=>{const r=host.getBoundingClientRect(); mx=e.clientX-r.left; my=e.clientY-r.top;});
    host.addEventListener('pointerleave',()=>{mx=-1e4;my=-1e4;});
    const B=[[],[],[],[]], G=[], AL=[.18,.3,.46,.75], SZ=[1.1,1.4,1.8,2.3];
    // свечение рисуется один раз в маленький спрайт и потом только копируется, видеокарту не грузит
    const GL=document.createElement('canvas'); GL.width=GL.height=64;
    { const c=GL.getContext('2d'), g=c.createRadialGradient(32,32,0,32,32,32);
      g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(.12,'rgba(210,194,252,.85)');
      g.addColorStop(.4,'rgba(137,97,231,.28)'); g.addColorStop(1,'rgba(137,97,231,0)');
      c.fillStyle=g; c.fillRect(0,0,64,64); }
    const frame=T=>{
      ctx.setTransform(D,0,0,D,0,0); ctx.clearRect(0,0,W,H);
      for(const b of B) b.length=0; G.length=0;
      const RP=130,RP2=RP*RP;
      for(const p of P){
        // мерцание: живёт, гаснет, пропадает, загорается в другом месте со вспышкой
        if(T>p.at){
          if(p.st===0){ p.st=1; p.at=T+R(4000,7000); p.d=p.at-T; }
          else if(p.st===1){ p.st=2; p.at=T+R(2500,9000); p.o=0; }
          else if(p.st===2){ place(p); p.st=3; p.at=T+R(5000,8000); p.d=p.at-T; }
          else { p.st=0; p.o=1; p.g=0; p.at=T+(p.tw?R(10000,30000):R(300000,900000)); }
        }
        if(p.st===1){ const q=Math.max(0,(p.at-T)/p.d); p.o=q*q*(3-2*q); p.g=0; }
        else if(p.st===3){ const q=Math.min(1,1-(p.at-T)/p.d), u=Math.min(1,q*1.5); p.o=u*u*(3-2*u); p.g=p.tw?Math.pow(Math.sin(Math.PI*q),2):0; }
        if(p.st===2) continue;
        const tx=p.hx+Math.sin(T*p.f+p.ph)*p.a, ty=p.hy+Math.cos(T*p.f*1.3+p.ph)*p.a*.7;
        let ax=(tx-p.x)*.04, ay=(ty-p.y)*.04;
        const dx=p.x-mx,dy=p.y-my,d2=dx*dx+dy*dy;
        if(d2<RP2){const d=Math.sqrt(d2)||1,f=1-d/RP; ax+=dx/d*f*f*9; ay+=dy/d*f*f*9;}
        p.vx=(p.vx+ax)*.82; p.vy=(p.vy+ay)*.82; p.x+=p.vx; p.y+=p.vy;
        B[p.k].push(p.x,p.y,p.o);
        if(p.g>.02) G.push(p.x,p.y,p.g,p.k);
      }
      for(let k=0;k<4;k++){ const b=B[k], sz=SZ[k];
        for(let i=0;i<b.length;i+=3){
          ctx.fillStyle=`rgba(196,176,250,${(AL[k]*b[i+2]).toFixed(3)})`;
          ctx.fillRect(b[i]-sz/2,b[i+1]-sz/2,sz,sz);
        }
      }
      for(let i=0;i<G.length;i+=4){ const s=6+G[i+3]*2.5;
        ctx.globalAlpha=G[i+2]*(.45+G[i+3]*.12); ctx.drawImage(GL,G[i]-s,G[i+1]-s,s*2,s*2); }
      ctx.globalAlpha=1;
    };
    // своё время: идёт только пока футер виден, поэтому после паузы звёзды не вспыхивают все сразу
    const tick=t=>{ if(!run) return; clk+=Math.min(50,Math.max(0,t-lt)); lt=t; frame(clk); requestAnimationFrame(tick); };
    size(); frame(clk);
    addEventListener('resize',()=>{size();frame(clk);});
    if(RM) return;
    new IntersectionObserver(es=>es.forEach(e=>{const was=run; run=e.isIntersecting; if(run&&!was) requestAnimationFrame(t=>{ lt=t; tick(t); });})).observe(host);
  };
  document.querySelectorAll('.stars').forEach(cv=>stars(cv.parentElement,cv));




})();
