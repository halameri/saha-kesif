/* Enerji Yük Hesabı – ek bölümler: sekmeler, salon tasarımı (üstten + 3D), kW/kVA rehberi.
   index.html içindeki st, calc, area, cellDim, AC, BAT, f, num, kw, esc, save, besl değişkenlerini kullanır. */
"use strict";
(function(){
const $=s=>document.querySelector(s);
const UI={tab:"hesap",site:0,view:"top",sel:null,r3:null};
try{const u=JSON.parse(localStorage.getItem("hesap-ui")||"{}");Object.assign(UI,{tab:u.tab||"hesap",site:u.site||0,view:u.view||"top"})}catch(e){}
const saveUI=()=>{try{localStorage.setItem("hesap-ui",JSON.stringify({tab:UI.tab,site:UI.site,view:UI.view}))}catch(e){}};

/* ---------- sekmeler ---------- */
function setTab(t){if(UI.walk&&t!=="salon")toggleWalk(false);UI.tab=t;saveUI();
  document.querySelectorAll(".tabs [data-tab]").forEach(b=>b.setAttribute("aria-selected",b.dataset.tab===t));
  ["hesap","salon","rehber"].forEach(k=>{$("#tab-"+k).hidden=k!==t});
  document.querySelectorAll("header .row .btn").forEach(b=>b.style.display=t==="hesap"?"":"none");
  if(t==="salon")renderSalon();if(t==="rehber")renderRehber()}
document.querySelector(".tabs").addEventListener("click",e=>{const b=e.target.closest("[data-tab]");if(b)setTab(b.dataset.tab)});

function siteIdx(){if(!st.rows.length)return -1;if(UI.site>=st.rows.length)UI.site=0;return UI.site}
function siteSelect(id){return `<label>Site<select id="${id}">${st.rows.map((r,i)=>`<option value="${i}"${i===UI.site?" selected":""}>${esc(r.name||"Site "+(i+1))}${num(r.dc)?" · "+num(r.dc)+" A":""}</option>`).join("")}</select></label>`}

/* ---------- salon: ekipman listesi ---------- */
const COL={dc:"#1c3d5a",aku:"#2f8a57",ac:"#2a9bb5",split:"#2a9bb5",tr:"#6b5aa6",door:"#8a6d3b"};
function planItems(c){const a=st.a,it=[],cnt={},svc=num(a.svc)||0,E=eqOf(c.row,c);
  const add=(type,name,w,d,h,front,extra)=>{cnt[type]=(cnt[type]||0)+1;it.push({key:type+"_"+cnt[type],type,name,w,d,h,front,...(extra||{})})};
  if(c.B.t==="pb2"){
    for(let u=0;u<c.units;u++)add("dc","DC dolabı",E.dc.w,E.dc.d,E.dc.h,svc,{g:0});
    const cell=cellDim(c.mod);for(let m=0;m<c.mods;m++)add("aku",`Jel akü sehpası ${c.mod} Ah`,E.aku.w,E.aku.d,E.aku.h,svc,{kind:"jel",cell});
  }else{
    const cab=c.units,inCab=Math.min(c.mods,cab*(num(a.cabG)||0)),rest=c.mods-inCab,rg=num(a.rackG)||2,racks=Math.ceil(rest/rg-1e-9);
    let left=inCab;for(let u=0;u<cab;u++){const g=Math.min(left,num(a.cabG)||0);left-=g;add("dc",`DC kabin${g?` + ${g} grup akü`:""}`,E.dc.w,E.dc.d,E.dc.h,svc,{g})}
    left=rest;for(let q=0;q<racks;q++){const g=Math.min(left,rg);left-=g;add("aku",`Akü rafı (${g} grup)`,E.aku.w,E.aku.d,E.aku.h,svc,{kind:"li",g})}
  }
  for(let q=0;q<E.tr.n;q++)add("tr",`Transmisyon/fiber kabin ${q+1}`,E.tr.w,E.tr.d,E.tr.h,svc);
  if(c.acT==="dx")for(let q=0;q<c.acN;q++)add("ac",`DX klima ${f(c.acs,0)} kcal/h`,E.ac.w,E.ac.d,E.ac.h,Math.round((num(a.dxFront)||0)*100));
  else for(let q=0;q<c.acN;q++)add("split",`Split ${f(c.acs/1000,0)}k BTU (duvar)`,100,25,32,0,{wall:true});
  add("door","Kapı",90,12,210,0,{wall:true});
  /* aynı adlı ekipmanları numarala (mesajlarda karışmasın) */
  const nm={};it.forEach(x=>{nm[x.name]=(nm[x.name]||0)+1});const seen={};it.forEach(x=>{if(nm[x.name]>1&&!/\d$/.test(x.name)){seen[x.name]=(seen[x.name]||0)+1;x.name+=" – "+seen[x.name]}});
  return it}
const sigOf=it=>it.map(i=>`${i.type}:${i.w}x${i.d}x${i.h}:${i.front}`).join("|");
/* gövde dikdörtgeni ve önündeki servis alanı (rot: 0 ön aşağı, 90 ön sola, 180 ön yukarı, 270 ön sağa) */
function geo(i){const p=i.pos,sw=p.rot%180!==0,bw=sw?i.d:i.w,bd=sw?i.w:i.d,b={x:p.x,y:p.y,w:bw,h:bd},c=i.front;let z=null;
  if(c>0){if(p.rot===0)z={x:p.x,y:p.y+bd,w:bw,h:c};else if(p.rot===180)z={x:p.x,y:p.y-c,w:bw,h:c};else if(p.rot===90)z={x:p.x-c,y:p.y,w:c,h:bd};else z={x:p.x+bw,y:p.y,w:c,h:bd}}
  return{b,z}}
const ov=(r,s)=>r.x<s.x+s.w-0.5&&s.x<r.x+r.w-0.5&&r.y<s.y+s.h-0.5&&s.y<r.y+r.h-0.5;
const inside=(r,R)=>r.x>=-0.5&&r.y>=-0.5&&r.x+r.w<=R.w+0.5&&r.y+r.h<=R.d+0.5;

function autoLayout(items){const a=st.a,g=num(a.lineGap)||0,wg=10;
  const row=items.filter(i=>i.type==="dc"||i.type==="aku"),acs=items.filter(i=>i.type==="tr"||i.type==="ac"),sp=items.filter(i=>i.type==="split");
  let x=wg;row.forEach(i=>{i.pos={x,y:wg,rot:0};x+=i.w+g});const rowLen=row.length?x-g+wg:0,rowD=Math.max(0,...row.map(i=>i.d)),rowF=Math.max(0,...row.map(i=>i.front));
  let W=Math.max(rowLen,200),D;
  if(acs.length){const aisle=Math.max(rowF,...acs.map(i=>i.front)),y=wg+rowD+aisle;let xa=wg;acs.forEach(i=>{i.pos={x:xa,y,rot:180};xa+=i.w+g});
    W=Math.max(W,xa-g+wg);D=y+Math.max(...acs.map(i=>i.d))+wg}
  else D=wg+rowD+rowF+60;
  let xs=wg;sp.forEach(i=>{i.pos={x:xs,y:D-i.d,rot:180};xs+=i.w+60});W=Math.max(W,xs-60+wg);
  const Wr=Math.ceil(W/10)*10,Dr=Math.ceil(D/10)*10,aisleMid=acs.length?wg+rowD+Math.max(rowF,...acs.map(i=>i.front))/2:wg+rowD+(Dr-wg-rowD)/2;
  items.filter(i=>i.type==="door").forEach(i=>{i.pos={x:Wr-i.d,y:Math.round(Math.max(0,Math.min(Dr-i.w,aisleMid-i.w/2))/5)*5,rot:90}});
  return{w:Wr,d:Dr}}

function getPlan(i){const r=st.rows[i],c=calc(r);if(!c)return null;const items=planItems(c),sig=sigOf(items);
  if(!r.plan||r.plan.sig!==sig){const room=autoLayout(items),old=r.plan;
    /* ekipman değiştiyse: yerinde duranları koru, sadece yenilerini otomatik yerleştir */
    const pos=Object.fromEntries(items.map(x=>[x.key,old&&old.pos[x.key]?old.pos[x.key]:x.pos]));
    r.plan={sig,room:old?{w:Math.max(old.room.w,room.w),d:Math.max(old.room.d,room.d)}:room,pos};
    items.forEach(x=>{if(x.type==="door"&&old&&!old.pos[x.key])pos[x.key]={x:r.plan.room.w-x.d,y:Math.max(0,Math.min(r.plan.room.d-x.w,x.pos.y)),rot:90}});save()}
  items.forEach(x=>{x.pos=r.plan.pos[x.key]||{x:10,y:10,rot:0}});
  return{r,c,items,room:r.plan.room}}

function analyse(P){const R=P.room,fl=P.items.filter(i=>!i.wall),G=fl.map(i=>({i,...geo(i)})),msgs=[];
  const bad=new Set();
  G.forEach((A,ai)=>{if(!inside(A.b,R)){bad.add(A.i.key);msgs.push(["e",`${A.i.name} oda dışına taşıyor`])}
    else if(A.z&&!inside(A.z,R))msgs.push(["w",`${A.i.name}: önündeki ${A.i.front} cm servis boşluğu duvara çarpıyor`]);
    G.forEach((B,bi)=>{if(bi<=ai)return;if(ov(A.b,B.b)){bad.add(A.i.key);bad.add(B.i.key);msgs.push(["e",`${A.i.name} ile ${B.i.name} üst üste`])}});
    G.forEach((B,bi)=>{if(bi===ai||!B.z)return;if(ov(A.b,B.z)){bad.add(A.i.key);msgs.push(["e",`${A.i.name}, ${B.i.name} önündeki servis boşluğunu kapatıyor`])}})});
  P.items.filter(i=>i.wall).forEach(i=>{const b=geo(i).b;if(!inside(b,R)){bad.add(i.key);msgs.push(["e",`${i.name} oda dışında`])}
    else if(i.type==="door"&&!(b.x<=2||b.y<=2||b.x+b.w>=R.w-2||b.y+b.h>=R.d-2))msgs.push(["w","Kapı bir duvara dayalı değil"])});
  let bb=null;G.forEach(A=>[A.b,A.z].forEach(r=>{if(!r)return;if(!bb)bb={x0:r.x,y0:r.y,x1:r.x+r.w,y1:r.y+r.h};else{bb.x0=Math.min(bb.x0,r.x);bb.y0=Math.min(bb.y0,r.y);bb.x1=Math.max(bb.x1,r.x+r.w);bb.y1=Math.max(bb.y1,r.y+r.h)}}));
  const foot=G.reduce((s,A)=>s+A.b.w*A.b.h,0)/1e4,svcA=G.reduce((s,A)=>s+(A.z?A.z.w*A.z.h:0),0)/1e4;
  if(!msgs.length)msgs.push(["o","Çakışma yok, tüm ekipman ve servis boşlukları odanın içinde"]);
  return{bad,msgs,bb,foot,svcA}}

/* ---------- teknisyen: geçilebilir alan, ulaşılabilirlik, yürüyüş yolu ---------- */
function walkGrid(P){const a=st.a,R=P.room,S=5,nx=Math.max(1,Math.ceil(R.w/S)),ny=Math.max(1,Math.ceil(R.d/S)),N=nx*ny,manR=(num(a.manW)||60)/2;
  const dist=new Float32Array(N);for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const cx=(i+.5)*S,cy=(j+.5)*S;dist[j*nx+i]=Math.max(0,Math.min(cx,R.w-cx,cy,R.d-cy))}
  P.items.filter(x=>!x.wall).forEach(x=>{const b=geo(x).b,i0=Math.max(0,Math.floor(b.x/S)),i1=Math.min(nx-1,Math.ceil((b.x+b.w)/S)-1),j0=Math.max(0,Math.floor(b.y/S)),j1=Math.min(ny-1,Math.ceil((b.y+b.h)/S)-1);
    for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++)dist[j*nx+i]=0});
  /* iki geçişli mesafe dönüşümü (yaklaşık öklid) */
  const D1=S,D2=S*1.4142;
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const k=j*nx+i;let d=dist[k];if(i>0)d=Math.min(d,dist[k-1]+D1);if(j>0){d=Math.min(d,dist[k-nx]+D1);if(i>0)d=Math.min(d,dist[k-nx-1]+D2);if(i<nx-1)d=Math.min(d,dist[k-nx+1]+D2)}dist[k]=d}
  for(let j=ny-1;j>=0;j--)for(let i=nx-1;i>=0;i--){const k=j*nx+i;let d=dist[k];if(i<nx-1)d=Math.min(d,dist[k+1]+D1);if(j<ny-1){d=Math.min(d,dist[k+nx]+D1);if(i<nx-1)d=Math.min(d,dist[k+nx+1]+D2);if(i>0)d=Math.min(d,dist[k+nx-1]+D2)}dist[k]=d}
  const walk=new Uint8Array(N);for(let k=0;k<N;k++)walk[k]=dist[k]>=manR-0.01?1:0;
  const cellAt=(x,y)=>[Math.min(nx-1,Math.max(0,Math.floor(x/S))),Math.min(ny-1,Math.max(0,Math.floor(y/S)))];
  const nearestWalk=(x,y,maxCm)=>{const[i0,j0]=cellAt(x,y);let best=-1,bd=1e9;const m=Math.ceil(maxCm/S);for(let j=Math.max(0,j0-m);j<=Math.min(ny-1,j0+m);j++)for(let i=Math.max(0,i0-m);i<=Math.min(nx-1,i0+m);i++){const k=j*nx+i;if(!walk[k])continue;const d=(i-i0)**2+(j-j0)**2;if(d<bd){bd=d;best=k}}return best};
  const door=P.items.find(x=>x.type==="door");let start=-1;
  if(door){const b=geo(door).b;start=nearestWalk(b.x+b.w/2,b.y+b.h/2,manR+80)}
  const bfs=src=>{const dd=new Int32Array(N).fill(-1),par=new Int32Array(N).fill(-1);if(src<0)return{dd,par};const q=new Int32Array(N);let h=0,t=0;q[t++]=src;dd[src]=0;
    while(h<t){const k=q[h++],i=k%nx,j=(k-i)/nx;for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){if(!di&&!dj)continue;const ii=i+di,jj=j+dj;if(ii<0||jj<0||ii>=nx||jj>=ny)continue;const n=jj*nx+ii;if(!walk[n]||dd[n]>=0)continue;if(di&&dj&&(!walk[j*nx+ii]||!walk[jj*nx+i]))continue;dd[n]=dd[k]+1;par[n]=k;q[t++]=n}}return{dd,par}};
  const base=bfs(start);
  /* her ekipmanın önünde, önüne bakarak durulacak nokta */
  const targets=P.items.filter(x=>!x.wall&&x.front>0).map(x=>{const b=geo(x).b,r=x.pos.rot,off=manR+8;let best=-1,bd=1e9;
    for(let s=.1;s<=.9001;s+=.1){let px,py;if(r===0){px=b.x+b.w*s;py=b.y+b.h+off}else if(r===180){px=b.x+b.w*s;py=b.y-off}else if(r===90){px=b.x-off;py=b.y+b.h*s}else{px=b.x+b.w+off;py=b.y+b.h*s}
      const[i,j]=cellAt(px,py),k=j*nx+i;if(px<0||py<0||px>R.w||py>R.d)continue;if(walk[k]&&base.dd[k]>=0){const d=Math.abs(s-.5);if(d<bd){bd=d;best=k}}}
    return{key:x.key,name:x.name,cell:best,ok:best>=0,face:r}});
  return{S,nx,ny,walk,start,base,targets,bfs,manR}}
function walkPath(W){const pts=[],cell=k=>[(k%W.nx+.5)*W.S,(Math.floor(k/W.nx)+.5)*W.S];if(W.start<0)return{pts,stops:[]};
  let cur=W.start;const left=W.targets.filter(t=>t.ok).slice(),stops=[];pts.push(cell(cur));
  const go=to=>{const r=W.bfs(cur);if(r.dd[to]<0)return false;const seq=[];for(let k=to;k!==cur&&k>=0;k=r.par[k])seq.push(k);seq.reverse().forEach(k=>pts.push(cell(k)));cur=to;return true};
  while(left.length){const r=W.bfs(cur);left.sort((p,q)=>r.dd[p.cell]-r.dd[q.cell]);const t=left.shift();if(go(t.cell))stops.push({i:pts.length-1,name:t.name,face:t.face})}
  go(W.start);
  /* gereksiz ara noktaları at (aynı doğrultudakiler) */
  const keep=new Set([0,pts.length-1,...stops.map(s=>s.i)]),out=[],map={};
  pts.forEach((p,i)=>{if(keep.has(i)||i===0||i===pts.length-1){map[i]=out.length;out.push(p);return}const a=pts[i-1],b=pts[i+1];if((p[0]-a[0])*(b[1]-p[1])-(p[1]-a[1])*(b[0]-p[0])!==0){map[i]=out.length;out.push(p)}});
  return{pts:out,stops:stops.map(s=>({...s,i:map[s.i]}))}}
const FACE_DIR={0:180,180:0,90:270,270:90};/* ekipmanın önü aşağıysa teknisyen yukarı bakar */
function manAt(path,dist){/* yol üzerinde verilen mesafedeki konum, yön ve durak */
  const P=path.pts;let acc=0;for(let k=1;k<P.length;k++){const a=P[k-1],b=P[k],L=Math.hypot(b[0]-a[0],b[1]-a[1]);if(acc+L>=dist){const t=L?(dist-acc)/L:0,dx=b[0]-a[0],dy=b[1]-a[1];return{x:a[0]+dx*t,y:a[1]+dy*t,rot:Math.abs(dx)>Math.abs(dy)?(dx>0?270:90):(dy>0?0:180),seg:k}}acc+=L}
  const e=P[P.length-1]||[0,0];return{x:e[0],y:e[1],rot:0,seg:P.length,end:true}}
function walkMsgs(W){const out=[],a=st.a,mw=num(a.manW)||60;
  if(W.start<0)return[["e",`Kapının önü kapalı: teknisyen içeri giremiyor (en az ${mw} cm geçit gerekli)`]];
  const bad=W.targets.filter(t=>!t.ok);
  bad.forEach(t=>out.push(["e",`Teknisyen ${t.name} önüne ulaşamıyor – yol en az ${mw} cm genişliğinde olmalı`]));
  if(!bad.length)out.push(["o",`Teknisyen kapıdan girip tüm ekipmanın önüne ulaşabiliyor (geçit ≥ ${mw} cm)`]);
  return out}
function toggleWalk(on){const P=getPlan(siteIdx());if(UI.walk){cancelAnimationFrame(UI.walk.raf);UI.walk=null;UI.man=null}
  if(on&&P){const W=walkGrid(P),path=walkPath(W);if(path.pts.length<2){toast(W.start<0?"Kapı önü kapalı, teknisyen giremiyor":"Gidilecek ekipman yok");drawSalon();return}
    const speed=110,pause=1100;UI.walk={path,d:0,t0:performance.now(),last:performance.now(),stopUntil:0,stopIdx:-1,raf:0};
    const step=now=>{const w=UI.walk;if(!w)return;const dt=Math.min(80,now-w.last);w.last=now;
      if(now<w.stopUntil){/* müdahale ediyor */}else{w.d+=speed*dt/1000}
      const m=manAt(w.path,w.d),st2=w.path.stops.find(s=>s.i===m.seg-1&&s.i>w.stopIdx&&Math.hypot(w.path.pts[s.i][0]-m.x,w.path.pts[s.i][1]-m.y)<4);
      if(st2){w.stopIdx=st2.i;w.stopUntil=now+pause;w.label=st2.name;w.face=FACE_DIR[st2.face]}
      const busy=now<w.stopUntil;UI.man={x:m.x,y:m.y,rot:busy?w.face:m.rot,phase:busy?0:Math.sin(w.d/14),label:busy?w.label:null,busy};
      paintMan();if(m.end){UI.walk=null;setTimeout(()=>{if(!UI.walk){UI.man=null;paintMan();syncWalkBtn()}},600);syncWalkBtn();return}
      w.raf=requestAnimationFrame(step)};
    UI.walk.raf=requestAnimationFrame(step)}
  syncWalkBtn();paintMan()}
function syncWalkBtn(){const b=$("#pWalk");if(b){b.textContent=UI.walk?"Durdur":"Teknisyeni yürüt";b.classList.toggle("on",!!UI.walk)}}
function paintMan(){if(UI.view==="3d"){UI.r3&&UI.r3();return}const g=$("#man");if(!g)return;const m=UI.man;if(!m){g.setAttribute("visibility","hidden");return}
  g.setAttribute("visibility","visible");g.setAttribute("transform",`translate(${m.x} ${m.y}) rotate(${{0:0,90:90,180:180,270:-90}[m.rot]||0})`);
  const t=$("#manT");if(t){t.textContent=m.label?"🔧 "+m.label:"";t.setAttribute("transform",`rotate(${-({0:0,90:90,180:180,270:-90}[m.rot]||0)})`)}}

/* ---------- salon sekmesi ---------- */
function renderSalon(){const host=$("#tab-salon"),i=siteIdx();
  if(i<0){host.innerHTML=`<div class="panel"><p>Önce Hesap sekmesinde bir site ekle.</p></div>`;return}
  const P=getPlan(i);
  if(!P){host.innerHTML=`<div class="panel">${`<div class="ctl">${siteSelect("pSite")}</div>`}<p class="warn">Bu sitenin DC yükü girilmemiş.</p></div>`;bindSalonCtl();return}
  host.innerHTML=`<div class="panel">
   <h3>Salon yerleşimi</h3><p class="sub">Kabin, raf ve klimalar sitenin hesabından gerçek ölçüleriyle geliyor. Üstten görünümde sürükleyerek taşı, seçip döndür. Taralı alanlar önlerinde bırakılması gereken servis boşluğu.</p>
   <div class="ctl">${siteSelect("pSite")}
    <label>Oda eni (cm)<input id="pW" inputmode="numeric" value="${P.room.w}"></label>
    <label>Oda boyu (cm)<input id="pD" inputmode="numeric" value="${P.room.d}"></label>
    <div class="seg2" role="group" aria-label="Görünüm"><button data-view="top" aria-pressed="${UI.view==="top"}">Üstten</button><button data-view="3d" aria-pressed="${UI.view==="3d"}">3D</button></div>
    <button class="btn" id="pRot">Seçileni döndür</button><button class="btn" id="pAuto">Otomatik yerleştir</button><button class="btn" id="pFit">Odayı sığdır</button>
   </div>
   <details class="eqd" id="pEqD"${UI.eqOpen?" open":""}><summary>Ekipman ölçüleri (bu salon için)</summary><div id="pEq"></div></details>
   <div class="walkbar"><button class="btn" id="pWalk">Teknisyeni yürüt</button><label><input type="checkbox" id="pWalkA"${UI.showWalk!==false?" checked":""}> Geçilebilir alanı göster</label></div>
   <div class="stage" id="pStage"></div>
   <div class="kpis" id="pK"></div>
   <ul class="msgs" id="pM"></ul>
   <ul class="items" id="pL"></ul>
  </div>`;
  bindSalonCtl();renderEq(P);drawSalon()}
function renderEq(P){const el=$("#pEq");if(!el)return;const c=P.c,E=eqOf(P.r,c),pb=c.B.t==="pb2";
  const rows=[["tr","Transmisyon / fiber kabin",true],["dc",pb?"DC dolabı":"DC kabin",false],["aku",pb?"Jel akü sehpası":"Akü rafı",false]];if(c.acT==="dx")rows.push(["ac","DX klima",false]);
  const cnt={dc:c.units,aku:P.items.filter(x=>x.type==="aku").length,ac:c.acN};
  const inp=(k,p,v,def,min)=>`<input data-eq="${E[k].key}.${p}" inputmode="numeric" value="${v!==def?v:""}" placeholder="${def}"${min?` min="${min}"`:""} aria-label="${p}">`;
  el.innerHTML=`<table class="eqt"><colgroup><col class="nm"><col><col><col><col></colgroup><thead><tr><th></th><th>Adet</th><th>En</th><th>Der.</th><th>Yüks.</th></tr></thead><tbody>
   ${rows.map(([k,l,canN])=>`<tr><td><i style="background:${COL[k]}"></i>${l}</td><td>${canN?inp(k,"n",E[k].n,E[k].def.n,2):`<span class="ro">${cnt[k]}</span>`}</td><td>${inp(k,"w",E[k].w,E[k].def.w)}</td><td>${inp(k,"d",E[k].d,E[k].def.d)}</td><td>${inp(k,"h",E[k].h,E[k].def.h)}</td></tr>`).join("")}
   </tbody></table><p class="hint">Ölçüler cm. Boş bırakılan kutu varsayılanı kullanır (Gelişmiş ayarlar). Transmisyon/fiber kabin en az 2. Adetleri DC ve akü için hesap belirler.</p>
   <button class="btn" id="pEqR">Bu salonun ölçülerini sıfırla</button>`;
  el.querySelectorAll("[data-eq]").forEach(i=>i.addEventListener("change",()=>{const[k,p]=i.dataset.eq.split("."),r=P.r;r.eq=r.eq||{};r.eq[k]=r.eq[k]||{};
    let v=num(i.value);if(p==="n"&&v!=null&&v<2){v=2;toast("Her salonda en az 2 transmisyon/fiber kabin olmalı")}
    if(v>0)r.eq[k][p]=v;else delete r.eq[k][p];save();UI.eqOpen=true;render();renderSalon()}));
  $("#pEqR").onclick=()=>{delete P.r.eq;save();UI.eqOpen=true;render();renderSalon()};
  $("#pEqD").ontoggle=e=>{UI.eqOpen=e.target.open}}
function bindSalonCtl(){const s=$("#pSite");if(s)s.onchange=()=>{if(UI.walk)toggleWalk(false);UI.site=+s.value;UI.sel=null;saveUI();renderSalon()};
  const P=()=>getPlan(siteIdx());
  const setRoom=(k,el)=>{const v=num(el.value);if(v>50){const p=P();p.r.plan.room[k]=Math.round(v);save();drawSalon()}};
  if($("#pWalk")){$("#pWalk").onclick=()=>toggleWalk(!UI.walk);$("#pWalkA").onchange=e=>{UI.showWalk=e.target.checked;drawSalon()};syncWalkBtn()}
  if($("#pW")){$("#pW").oninput=e=>setRoom("w",e.target);$("#pD").oninput=e=>setRoom("d",e.target);
    document.querySelectorAll("[data-view]").forEach(b=>b.onclick=()=>{UI.view=b.dataset.view;saveUI();document.querySelectorAll("[data-view]").forEach(x=>x.setAttribute("aria-pressed",x===b));drawSalon()});
    $("#pRot").onclick=()=>{const p=P();if(!UI.sel||!p.r.plan.pos[UI.sel])return toast("Önce bir ekipman seç");const q=p.r.plan.pos[UI.sel];q.rot=(q.rot+90)%360;save();drawSalon()};
    $("#pAuto").onclick=()=>{const p=P();delete p.r.plan;save();renderSalon()};
    $("#pFit").onclick=()=>{const p=P(),A=analyse(p);if(!A.bb)return;const dx=10-A.bb.x0,dy=10-A.bb.y0;
      Object.values(p.r.plan.pos).forEach(q=>{q.x+=dx;q.y+=dy});p.r.plan.room={w:Math.ceil((A.bb.x1-A.bb.x0+20)/10)*10,d:Math.ceil((A.bb.y1-A.bb.y0+20)/10)*10};
      p.items.filter(x=>x.wall).forEach(x=>{const q=p.r.plan.pos[x.key];q.y=Math.min(q.y,p.r.plan.room.d-x.d);q.x=Math.min(q.x,p.r.plan.room.w-x.w)});save();renderSalon()}}}
function drawSalon(){const i=siteIdx(),P=getPlan(i);if(!P||!$("#pStage"))return;const A=analyse(P),W=walkGrid(P);A.walk=W;A.msgs=A.msgs.concat(walkMsgs(W));
  W.targets.forEach(t=>{if(!t.ok)A.unreach=(A.unreach||new Set()).add(t.key)});
  if(UI.sel&&!P.items.some(x=>x.key===UI.sel))UI.sel=null;
  if(UI.view==="3d")draw3D(P,A);else drawTop(P,A);
  const R=P.room,bbW=A.bb?(A.bb.x1-A.bb.x0):0,bbD=A.bb?(A.bb.y1-A.bb.y0):0,errs=A.msgs.filter(m=>m[0]==="e").length;
  $("#pK").innerHTML=`
   <div class="kpi ${errs?"bad":"ok"}"><span>Gereken alan (ekipman + servis)</span><b>${f(bbW/100,2)} × ${f(bbD/100,2)} m</b><span>${f(bbW*bbD/1e4,1)} m²</span></div>
   <div class="kpi"><span>Oda</span><b>${f(R.w/100,2)} × ${f(R.d/100,2)} m</b><span>${f(R.w*R.d/1e4,1)} m²</span></div>
   <div class="kpi"><span>Ekipman tabanı</span><b>${f(A.foot,2)} m²</b><span>servis boşlukları ${f(A.svcA,2)} m²</span></div>
   <div class="kpi"><span>Doluluk</span><b>%${f(A.bb?bbW*bbD/(R.w*R.d)*100:0,0)}</b><span>gereken alan / oda</span></div>`;
  $("#pM").innerHTML=A.msgs.map(([k,t])=>`<li class="${k}">${esc(t)}</li>`).join("");
  $("#pL").innerHTML=P.items.map(x=>{const q=x.pos;return `<li data-key="${x.key}" aria-current="${UI.sel===x.key}"><i style="background:${COL[x.type]}"></i><span>${esc(x.name)}${x.front?` <small>· önü ${x.front} cm</small>`:""}</span><small>${x.w}×${x.d}×${x.h} cm</small></li>`}).join("");
  $("#pL").onclick=e=>{const li=e.target.closest("[data-key]");if(li){UI.sel=li.dataset.key;drawSalon()}}}

/* ---------- üstten görünüm (SVG, sürükle-bırak) ---------- */
function drawTop(P,A){const R=P.room,pad=Math.max(45,Math.max(R.w,R.d)*0.08),fs=Math.max(10,Math.min(R.w,R.d)/22),stage=$("#pStage");
  const grid=[];for(let x=50;x<R.w;x+=50)grid.push(`<line x1="${x}" y1="0" x2="${x}" y2="${R.d}"/>`);for(let y=50;y<R.d;y+=50)grid.push(`<line x1="0" y1="${y}" x2="${R.w}" y2="${y}"/>`);
  const zones=[],bodies=[],W=A.walk;let walkSvg="";
  if(W&&UI.showWalk!==false){let dR="",dU="";for(let j=0;j<W.ny;j++){let i=0;while(i<W.nx){const k=j*W.nx+i;if(!W.walk[k]){i++;continue}const ok=W.base.dd[k]>=0;let e=i;while(e<W.nx&&W.walk[j*W.nx+e]&&(W.base.dd[j*W.nx+e]>=0)===ok)e++;
      const seg=`M${i*W.S} ${j*W.S}h${(e-i)*W.S}v${W.S}h${-(e-i)*W.S}z`;if(ok)dR+=seg;else dU+=seg;i=e}}
    walkSvg=`<path d="${dR}" fill="#34c759" fill-opacity=".28"/><path d="${dU}" fill="#8e8e93" fill-opacity=".3"/>`}
  P.items.forEach(x=>{const g=geo(x),b=g.b,sel=UI.sel===x.key,bad=A.bad.has(x.key),col=COL[x.type],unr=A.unreach&&A.unreach.has(x.key);
    if(g.z)zones.push(`<rect x="${g.z.x}" y="${g.z.y}" width="${g.z.w}" height="${g.z.h}" fill="url(#hatch-${x.type})" stroke="${col}" stroke-opacity=".5" stroke-dasharray="6 5"/>`);
    const fr=(()=>{const p=x.pos;if(p.rot===0)return[b.x,b.y+b.h,b.x+b.w,b.y+b.h];if(p.rot===180)return[b.x,b.y,b.x+b.w,b.y];if(p.rot===90)return[b.x,b.y,b.x,b.y+b.h];return[b.x+b.w,b.y,b.x+b.w,b.y+b.h]})();
    const lab=x.name.replace(/ \(duvar\)/,""),tw=b.w>b.h,fz=Math.max(6,Math.min(fs,(tw?b.h:b.w)/3.2,((tw?b.w:b.h)-8)/(Math.min(lab.length,26)*0.58)));
    bodies.push(`<g data-it="${x.key}" style="cursor:move">
      <rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="3" fill="${bad?"#c0392b":col}" fill-opacity="${x.wall?.55:.92}" stroke="${sel?"#e09b12":"#0b1720"}" stroke-width="${sel?5:1.5}"/>
      <line x1="${fr[0]}" y1="${fr[1]}" x2="${fr[2]}" y2="${fr[3]}" stroke="${unr?"#c0392b":"#ffd166"}" stroke-width="${unr?8:5}" stroke-linecap="round"${unr?' stroke-dasharray="10 6"':""}/>
      <text x="${b.x+b.w/2}" y="${b.y+b.h/2}" font-size="${fz}" fill="#fff" text-anchor="middle" dominant-baseline="middle" ${tw?"":`transform="rotate(-90 ${b.x+b.w/2} ${b.y+b.h/2})"`} style="pointer-events:none;font-weight:700">${esc(lab.length>26?lab.slice(0,25)+"…":lab)}</text>
      <text x="${b.x+b.w/2}" y="${b.y+b.h/2+fz*1.15}" font-size="${fz*.8}" fill="#fff" fill-opacity=".85" text-anchor="middle" dominant-baseline="middle" ${tw?"":`transform="rotate(-90 ${b.x+b.w/2} ${b.y+b.h/2})"`} style="pointer-events:none">${x.w}×${x.d}</text></g>`)});
  const bb=A.bb?`<rect x="${A.bb.x0}" y="${A.bb.y0}" width="${A.bb.x1-A.bb.x0}" height="${A.bb.y1-A.bb.y0}" fill="none" stroke="#e09b12" stroke-width="2.5" stroke-dasharray="12 8"/>`:"";
  const hatch=t=>`<pattern id="hatch-${t}" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="12" height="12" fill="${COL[t]}" fill-opacity=".08"/><line x1="0" y1="0" x2="0" y2="12" stroke="${COL[t]}" stroke-opacity=".35" stroke-width="3"/></pattern>`;
  stage.innerHTML=`<svg class="plan" viewBox="${-pad} ${-pad} ${R.w+pad*2} ${R.d+pad*2}" role="img" aria-label="Salon üstten görünüm">
   <defs>${["dc","aku","ac","split","tr"].map(hatch).join("")}</defs>
   <rect x="-12" y="-12" width="${R.w+24}" height="${R.d+24}" fill="#5b6b78"/>
   <rect x="0" y="0" width="${R.w}" height="${R.d}" style="fill:var(--surface)"/>
   <g style="stroke:var(--line)" stroke-width="1">${grid.join("")}</g>
   ${zones.join("")}${walkSvg}${bb}${bodies.join("")}
   <g id="man" visibility="hidden" style="pointer-events:none">
    <ellipse cx="0" cy="0" rx="${W?W.manR:30}" ry="14" fill="#f28c28" stroke="#7a3d00" stroke-width="2"/>
    <ellipse cx="${-(W?W.manR:30)*.55}" cy="9" rx="7" ry="9" fill="#1d3557"/><ellipse cx="${(W?W.manR:30)*.55}" cy="9" rx="7" ry="9" fill="#1d3557"/>
    <circle cx="0" cy="2" r="11" fill="#f4d03f" stroke="#8a6d00" stroke-width="2"/><path d="M-6 12 L0 22 L6 12 Z" fill="#7a3d00"/>
    <text id="manT" x="0" y="${-fs*1.6}" font-size="${fs}" text-anchor="middle" style="fill:var(--ink);font-weight:800;paint-order:stroke;stroke:var(--surface);stroke-width:4px"></text></g>
   <g font-size="${fs}" text-anchor="middle" style="fill:var(--ink);font-weight:700">
    <line x1="0" y1="${-pad*.55}" x2="${R.w}" y2="${-pad*.55}" style="stroke:var(--muted)" stroke-width="1.5"/><text x="${R.w/2}" y="${-pad*.7}">${f(R.w/100,2)} m</text>
    <line x1="${-pad*.55}" y1="0" x2="${-pad*.55}" y2="${R.d}" style="stroke:var(--muted)" stroke-width="1.5"/><text x="${-pad*.7}" y="${R.d/2}" transform="rotate(-90 ${-pad*.7} ${R.d/2})">${f(R.d/100,2)} m</text>
   </g></svg>`;
  const svg=stage.querySelector("svg");let drag=null;
  const pt=e=>{const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(svg.getScreenCTM().inverse())};
  svg.addEventListener("pointerdown",e=>{const g=e.target.closest("[data-it]");if(!g){UI.sel=null;drawSalon();return}
    const key=g.dataset.it,q=P.r.plan.pos[key],p=pt(e);UI.sel=key;drag={key,dx:p.x-q.x,dy:p.y-q.y,el:g,moved:false};svg.setPointerCapture(e.pointerId);
    svg.querySelectorAll("[data-it] rect").forEach(r=>{r.setAttribute("stroke",r.parentNode===g?"#e09b12":"#0b1720");r.setAttribute("stroke-width",r.parentNode===g?5:1.5)})});
  svg.addEventListener("pointermove",e=>{if(!drag)return;const p=pt(e),q=P.r.plan.pos[drag.key],nx=Math.round((p.x-drag.dx)/5)*5,ny=Math.round((p.y-drag.dy)/5)*5;
    if(nx===q.x&&ny===q.y)return;const ox=nx-q.x,oy=ny-q.y;q.x=nx;q.y=ny;drag.moved=true;drag.el.setAttribute("transform",`translate(${(+drag.el.dataset.tx||0)+ox} ${(+drag.el.dataset.ty||0)+oy})`);drag.el.dataset.tx=(+drag.el.dataset.tx||0)+ox;drag.el.dataset.ty=(+drag.el.dataset.ty||0)+oy});
  const end=()=>{if(!drag)return;drag=null;save();drawSalon()};svg.addEventListener("pointerup",end);svg.addEventListener("pointercancel",end);
  paintMan()}
document.addEventListener("keydown",e=>{if(UI.tab!=="salon"||!UI.sel||UI.view!=="top"||/INPUT|SELECT/.test(document.activeElement.tagName))return;
  const P=getPlan(siteIdx());if(!P)return;const q=P.r.plan.pos[UI.sel];if(!q)return;const s=e.shiftKey?50:5,m={ArrowLeft:[-s,0],ArrowRight:[s,0],ArrowUp:[0,-s],ArrowDown:[0,s]}[e.key];
  if(m){q.x+=m[0];q.y+=m[1];save();drawSalon();e.preventDefault()}else if(e.key==="r"||e.key==="R"){q.rot=(q.rot+90)%360;save();drawSalon()}});

/* ---------- 3D görünüm (kendi küçük çizicimiz, internet gerekmez) ---------- */
function hexRgb(h){const n=parseInt(h.slice(1),16);return[n>>16&255,n>>8&255,n&255]}
/* 3D: her ekipman gerçeğe benzer parçalardan kurulur (kabin kapısı delikli, jel sehpa açık raf + yatay hücreler,
   lityum modüller siyah kutu + yeşil etiket). Kendi küçük çizicimiz – internet gerekmez. */
const C3={tr:"#1f2326",dc:"#b9c0c6",steel:"#3b4146",cell:"#d5d9dc",li:"#17191b",dx:"#e4e8eb",split:"#f3f5f6",bad:"#c0392b"};
function build3D(P,A){const prims=[],flats=[],labels=[],FN={0:[0,1],180:[0,-1],90:[-1,0],270:[1,0]};
  P.items.forEach(x=>{const g=geo(x),b=g.b,rot=x.pos.rot,w=x.w,d=x.d,h=x.h,el=x.type==="split"?205:0,bad=A.bad.has(x.key),front=FN[rot];
    const W=(u,v)=>rot===0?[b.x+u,b.y+v]:rot===180?[b.x+w-u,b.y+d-v]:rot===90?[b.x+d-v,b.y+u]:[b.x+v,b.y+w-u];
    const box=(u0,v0,z0,u1,v1,z1,col,deco)=>{const p=W(u0,v0),q=W(u1,v1);prims.push({x0:Math.min(p[0],q[0]),x1:Math.max(p[0],q[0]),y0:Math.min(p[1],q[1]),y1:Math.max(p[1],q[1]),z0:el+z0,z1:el+z1,col:bad?C3.bad:col,deco,front})};
    const posts=(t,col)=>{[[0,0],[w-t,0],[0,d-t],[w-t,d-t]].forEach(([u,v])=>box(u,v,0,u+t,v+t,h,col))};
    if(x.type==="tr")box(0,0,0,w,d,h,C3.tr,"cab");
    else if(x.type==="dc")box(0,0,0,w,d,h,C3.dc,"dcCab");
    else if(x.type==="aku"&&x.kind==="jel"){const[cw,cd,ch]=x.cell,T=4,base=14,tier=(h-base-4)/T,cellH=Math.min(cd/10,tier-5),cellL=Math.min(ch/10,d-6),n=6,cu=(w-8)/n;
      posts(4,C3.steel);
      const rails=z=>{box(0,0,z-4,w,4,z,C3.steel);box(0,d-4,z-4,w,d,z,C3.steel);box(0,4,z-3,4,d-4,z,C3.steel);box(w-4,4,z-3,w,d-4,z,C3.steel)};
      for(let k=0;k<T;k++){const z=base+k*tier;rails(z);
        for(let q=0;q<n;q++)box(4+q*cu+0.6,(d-cellL)/2,z,4+(q+1)*cu-0.6,(d+cellL)/2,z+cellH,C3.cell,"cell")}
      rails(h)}
    else if(x.type==="aku"){const G=Math.max(1,x.g||1);posts(3,C3.steel);
      for(let k=0;k<=G;k++){const z=3+k*(h-6)/G;if(k<G)box(1.5,1.5,z-2.5,w-1.5,d-1.5,z,C3.steel);else{box(0,0,z-3,w,3,z,C3.steel);box(0,d-3,z-3,w,d,z,C3.steel)}}
      for(let k=0;k<G;k++){const z=3+k*(h-6)/G;box(5,8,z,w-5,d-8,z+Math.min(24,(h-6)/G-6),C3.li,"li")}}
    else if(x.type==="ac")box(0,0,0,w,d,h,C3.dx,"dx");
    else if(x.type==="door")box(0,0,0,w,4,h,"#8a6d3b","door");
    else box(0,0,0,w,d,h,C3.split,"split");
    if(g.z)flats.push({x0:g.z.x,y0:g.z.y,x1:g.z.x+g.z.w,y1:g.z.y+g.z.h,col:COL[x.type]});
    labels.push({x:b.x+b.w/2,y:b.y+b.h/2,z:el+h+18,t:x.name.replace(/ \(duvar\)/,""),col:COL[x.type]})});
  return{prims,flats,labels}}
function deco(ctx,kind,role,M,sw,sh){/* M(s,t): yüz üzerinde 0..1 koordinatı ekrana çevirir; sw/sh yüzün ekrandaki yaklaşık eni/boyu */
  const quadP=(s0,t0,s1,t1)=>{const a=M(s0,t0),b=M(s1,t0),c=M(s1,t1),d=M(s0,t1);ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.lineTo(c[0],c[1]);ctx.lineTo(d[0],d[1]);ctx.closePath()};
  const dot=(s,t,r,col)=>{const p=M(s,t);ctx.beginPath();ctx.arc(p[0],p[1],r,0,7);ctx.fillStyle=col;ctx.fill()};
  if(role==="front"&&(kind==="cab"||kind==="dcCab")){
    quadP(.06,.03,.94,.97);ctx.strokeStyle="rgba(0,0,0,.55)";ctx.lineWidth=1.2;ctx.stroke();
    let t0=.05;
    if(kind==="dcCab"){/* üstte rectifier modülleri */const n=4;for(let k=0;k<n;k++){const s0=.12+k*.19;quadP(s0,.72,s0+.16,.93);ctx.fillStyle="#e9edf0";ctx.fill();ctx.strokeStyle="rgba(0,0,0,.4)";ctx.stroke();dot(s0+.08,.89,Math.max(1,sw/90),"#34c759")}
      quadP(.12,.6,.88,.68);ctx.fillStyle="#2b3238";ctx.fill();t0=.05}
    const top=kind==="dcCab"?.55:.93,cols=10,rows=Math.round(28*(top-t0));
    if(sw>22){const r=Math.max(.5,Math.min(1.6,sw/120)),col=kind==="dcCab"?"rgba(40,46,52,.55)":"rgba(255,255,255,.13)";
      for(let i=0;i<cols;i++)for(let j=0;j<rows;j++)dot(.2+i*(.6/(cols-1)),t0+.02+j*((top-t0-.04)/Math.max(1,rows-1)),r,col)}
    quadP(.09,.42,.12,.56);ctx.fillStyle=kind==="dcCab"?"#4b545c":"#9aa3aa";ctx.fill()}
  else if(role==="top"&&(kind==="cab"||kind==="dcCab")){quadP(.25,.55,.42,.75);ctx.fillStyle="rgba(0,0,0,.35)";ctx.fill();quadP(.58,.55,.75,.75);ctx.fill()}
  else if(role==="front"&&kind==="cell"){const r=Math.max(.8,Math.min(3,sw/9));dot(.5,.72,r,"#8e969c");dot(.5,.3,r,"#8e969c");dot(.5,.72,r*.45,"#c0392b");dot(.5,.3,r*.45,"#1b1f22")}
  else if(role==="top"&&kind==="li"){quadP(.06,.62,.32,.9);ctx.fillStyle="#3fae49";ctx.fill();quadP(.62,.62,.9,.9);ctx.fill();
    quadP(.15,.25,.3,.42);ctx.fillStyle="#c9ced2";ctx.fill();quadP(.7,.25,.85,.42);ctx.fill()}
  else if(role==="front"&&kind==="li"){dot(.08,.5,Math.max(1,sw/50),"#c0392b");dot(.14,.5,Math.max(1,sw/50),"#222");quadP(.6,.25,.95,.75);ctx.fillStyle="#3fae49";ctx.fill()}
  else if(role==="front"&&kind==="dx"){ctx.strokeStyle="rgba(0,0,0,.25)";ctx.lineWidth=1;for(let k=0;k<12;k++){const t=.55+k*.033,a=M(.1,t),b=M(.9,t);ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke()}
    quadP(.62,.4,.88,.5);ctx.fillStyle="#1f2a33";ctx.fill();quadP(.1,.05,.9,.45);ctx.strokeStyle="rgba(0,0,0,.2)";ctx.stroke()}
  else if(role==="front"&&kind==="vest"){quadP(.0,.55,1,.65);ctx.fillStyle="rgba(255,255,255,.85)";ctx.fill()}
  else if(role==="front"&&kind==="face"){dot(.32,.62,Math.max(.8,sw/14),"#222");dot(.68,.62,Math.max(.8,sw/14),"#222")}
  else if(role==="front"&&kind==="door"){quadP(.08,.04,.92,.96);ctx.strokeStyle="rgba(0,0,0,.35)";ctx.lineWidth=1.2;ctx.stroke();dot(.84,.48,Math.max(1.2,sw/30),"#d9d9d9")}
  else if(role==="front"&&kind==="split"){const a=M(.06,.25),b=M(.94,.25);ctx.strokeStyle="rgba(0,0,0,.35)";ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();dot(.88,.6,Math.max(1,sw/80),"#2a9bb5")}}
function manPrims(){const m=UI.man;if(!m)return[];const out=[],w=44,d=26,rot=m.rot,sw=rot%180!==0,bw=sw?d:w,bd=sw?w:d,bx=m.x-bw/2,by=m.y-bd/2,
    FN={0:[0,1],180:[0,-1],90:[-1,0],270:[1,0]}[rot],W=(u,v)=>rot===0?[bx+u,by+v]:rot===180?[bx+w-u,by+d-v]:rot===90?[bx+d-v,by+u]:[bx+v,by+w-u];
  const box=(u0,v0,z0,u1,v1,z1,col,deco)=>{const p=W(u0,v0),q=W(u1,v1);out.push({x0:Math.min(p[0],q[0]),x1:Math.max(p[0],q[0]),y0:Math.min(p[1],q[1]),y1:Math.max(p[1],q[1]),z0,z1,col,deco,front:FN})};
  const s=(m.phase||0)*7,arm=m.busy?1:0;
  box(8,8+s,0,19,19+s,85,"#1d3557");box(25,8-s,0,36,19-s,85,"#1d3557");
  box(9,9+s,0,19,22+s,7,"#111");box(25,9-s,0,35,22-s,7,"#111");
  box(4,5,85,40,21,146,"#f28c28","vest");
  if(arm){box(0,10,118,6,34,128,"#1d3557");box(38,10,118,44,34,128,"#1d3557")}else{box(0,9-s,92,6,17-s,142,"#1d3557");box(38,9+s,92,44,17+s,142,"#1d3557")}
  box(14,6,146,30,21,170,"#e0b48a","face");box(12,4,166,32,23,178,"#f4d03f");
  return out}
function draw3D(P,A){const stage=$("#pStage");
  if(!stage.querySelector("canvas")){stage.innerHTML=`<canvas aria-label="Salon 3D görünüm"></canvas><div class="hint3">Döndürmek için sürükle · yakınlaştırmak için iki parmak / tekerlek</div>`;UI.cam=UI.cam||{th:0.3,ph:0.78,z:1.25}}
  const cv=stage.querySelector("canvas"),R=P.room,S=build3D(P,A);
  const render=()=>{const dpr=window.devicePixelRatio||1,Wc=cv.clientWidth,H=cv.clientHeight;cv.width=Wc*dpr;cv.height=H*dpr;const ctx=cv.getContext("2d");ctx.setTransform(dpr,0,0,dpr,0,0);
    const dark=matchMedia("(prefers-color-scheme: dark)").matches;ctx.fillStyle=dark?"#121b21":"#e9eef2";ctx.fillRect(0,0,Wc,H);
    const cam=UI.cam,cx=R.w/2,cy=R.d/2,cz=60,span=Math.max(R.w,R.d,300),dist=span*1.85/cam.z;
    const ex=cx+dist*Math.cos(cam.ph)*Math.cos(cam.th),ey=cy+dist*Math.cos(cam.ph)*Math.sin(cam.th),ez=cz+dist*Math.sin(cam.ph);
    let fx=cx-ex,fy=cy-ey,fz=cz-ez;const fl=Math.hypot(fx,fy,fz);fx/=fl;fy/=fl;fz/=fl;
    let rx=fy,ry=-fx;const rl=Math.hypot(rx,ry);rx/=rl;ry/=rl;const ux=ry*fz,uy=-rx*fz,uz=rx*fy-ry*fx;
    const foc=Math.min(Wc,H)*0.95;
    const prj=(x,y,z)=>{const dx=x-ex,dy=y-ey,dz=z-ez,c2=dx*fx+dy*fy+dz*fz;return[Wc/2+(dx*rx+dy*ry)*foc/c2,H/2-(dx*ux+dy*uy+dz*uz)*foc/c2,c2]};
    const faces=[],L=[-0.45,-0.6,0.66];
    const shade=(rgb,n)=>{const d=Math.max(0,-(n[0]*L[0]+n[1]*L[1]+n[2]*L[2]));const k=0.5+0.5*d;return `rgb(${rgb.map(v=>Math.round(v*k)).join(",")})`};
    const quad=(pts,fill,stroke,lw,extra)=>{const P2=pts.map(p=>prj(...p));if(P2.some(p=>p[2]<=1))return;faces.push({P:P2,d:P2.reduce((s,p)=>s+p[2],0)/P2.length,fill,stroke,lw,...(extra||{})})};
    quad([[0,0,0],[R.w,0,0],[R.w,R.d,0],[0,R.d,0]],dark?"#1f2c35":"#f7f8f9","#5b6b78",2,{layer:3});
    const WH=280,wallC=dark?"rgba(70,90,105,.55)":"rgba(160,175,188,.45)";
    [[[0,0],[R.w,0],[0,1]],[[R.w,0],[R.w,R.d],[-1,0]],[[R.w,R.d],[0,R.d],[0,-1]],[[0,R.d],[0,0],[1,0]]].forEach(([a,b,n])=>{const mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2;if((ex-mx)*n[0]+(ey-my)*n[1]>0)quad([[a[0],a[1],0],[b[0],b[1],0],[b[0],b[1],WH],[a[0],a[1],WH]],wallC,"rgba(91,107,120,.6)",1,{layer:2})});
    S.flats.forEach(z=>{const rgb=hexRgb(z.col);quad([[z.x0,z.y0,0.5],[z.x1,z.y0,0.5],[z.x1,z.y1,0.5],[z.x0,z.y1,0.5]],`rgba(${rgb},.14)`,`rgba(${rgb},.55)`,1,{layer:1})});
    S.prims.concat(manPrims()).forEach(B=>{const rgb=hexRgb(B.col),{x0,y0,x1,y1,z0,z1}=B,cxx=(x0+x1)/2,cyy=(y0+y1)/2,hx=(x1-x0)/2,hy=(y1-y0)/2;
      [[0,0,1],[0,-1,0],[0,1,0],[-1,0,0],[1,0,0]].forEach(n=>{
        let pts;
        if(n[2]){const f=B.front,r=[-f[1],f[0]],hf=Math.abs(f[0])?hx:hy,hr=Math.abs(r[0])?hx:hy;
          const at=(a,bq)=>[cxx+f[0]*a*hf+r[0]*bq*hr,cyy+f[1]*a*hf+r[1]*bq*hr,z1];pts=[at(1,-1),at(1,1),at(-1,1),at(-1,-1)]}
        else{const c=[cxx+n[0]*hx,cyy+n[1]*hy],r=[-n[1],n[0]],hr=Math.abs(r[0])?hx:hy;pts=[[c[0]-r[0]*hr,c[1]-r[1]*hr,z0],[c[0]+r[0]*hr,c[1]+r[1]*hr,z0],[c[0]+r[0]*hr,c[1]+r[1]*hr,z1],[c[0]-r[0]*hr,c[1]-r[1]*hr,z1]]}
        const cc=[(pts[0][0]+pts[2][0])/2,(pts[0][1]+pts[2][1])/2,(pts[0][2]+pts[2][2])/2];
        if((ex-cc[0])*n[0]+(ey-cc[1])*n[1]+(ez-cc[2])*n[2]<=0)return;
        const role=n[2]?"top":(n[0]===B.front[0]&&n[1]===B.front[1])?"front":"side";
        quad(pts,shade(rgb,n),"rgba(8,14,20,.5)",.8,{layer:0,deco:B.deco,role})})});
    faces.sort((p,q)=>(q.layer-p.layer)||(q.d-p.d));
    faces.forEach(F=>{ctx.beginPath();F.P.forEach((p,k)=>k?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fillStyle=F.fill;ctx.fill();ctx.strokeStyle=F.stroke;ctx.lineWidth=F.lw;ctx.stroke();
      if(F.deco&&F.role!=="side"){const[A0,B0,C0,D0]=F.P,M=(s,t)=>{const a=[A0[0]+(B0[0]-A0[0])*s,A0[1]+(B0[1]-A0[1])*s],b=[D0[0]+(C0[0]-D0[0])*s,D0[1]+(C0[1]-D0[1])*s];return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]};
        ctx.save();deco(ctx,F.deco,F.role,M,Math.hypot(B0[0]-A0[0],B0[1]-A0[1]),Math.hypot(D0[0]-A0[0],D0[1]-A0[1]));ctx.restore()}
      if(F.layer===3){ctx.save();ctx.strokeStyle=dark?"rgba(255,255,255,.06)":"rgba(0,0,0,.06)";ctx.lineWidth=1;for(let x=50;x<R.w;x+=50){const a=prj(x,0,0),b=prj(x,R.d,0);ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke()}for(let y=50;y<R.d;y+=50){const a=prj(0,y,0),b=prj(R.w,y,0);ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke()}ctx.restore()}});
    ctx.font="600 11px system-ui,-apple-system,sans-serif";ctx.textAlign="center";
    const LB=UI.man&&UI.man.label?S.labels.concat([{x:UI.man.x,y:UI.man.y,z:205,t:"🔧 "+UI.man.label,col:"#f28c28"}]):S.labels;
    LB.map(o=>({o,p:prj(o.x,o.y,o.z)})).filter(q=>q.p[2]>1).sort((a,b)=>b.p[2]-a.p[2]).forEach(({o,p})=>{
      const t=o.t.length>26?o.t.slice(0,25)+"…":o.t,w=ctx.measureText(t).width+12;ctx.fillStyle=dark?"rgba(24,34,41,.88)":"rgba(255,255,255,.9)";ctx.strokeStyle=o.col;ctx.lineWidth=1.5;
      ctx.beginPath();ctx.roundRect?ctx.roundRect(p[0]-w/2,p[1]-10,w,18,5):ctx.rect(p[0]-w/2,p[1]-10,w,18);ctx.fill();ctx.stroke();ctx.fillStyle=dark?"#e3eaef":"#14212b";ctx.fillText(t,p[0],p[1]+3)});
    const lbl=(x,y,t)=>{const p=prj(x,y,0);if(p[2]<=1)return;ctx.font="700 13px system-ui,sans-serif";ctx.fillStyle=dark?"#e3eaef":"#14212b";ctx.fillText(t,p[0],p[1])};
    lbl(R.w/2,ey<cy?-40:R.d+55,f(R.w/100,2)+" m");lbl(ex<cx?-55:R.w+55,R.d/2,f(R.d/100,2)+" m")};
  UI.r3=render;render();
  if(!cv.dataset.bound){cv.dataset.bound=1;const pts=new Map();let pinch=0;
    cv.addEventListener("pointerdown",e=>{cv.setPointerCapture(e.pointerId);pts.set(e.pointerId,[e.clientX,e.clientY]);if(pts.size===2){const[a,b]=[...pts.values()];pinch=Math.hypot(a[0]-b[0],a[1]-b[1])}});
    cv.addEventListener("pointermove",e=>{if(!pts.has(e.pointerId))return;const o=pts.get(e.pointerId);pts.set(e.pointerId,[e.clientX,e.clientY]);
      if(pts.size===2){const[a,b]=[...pts.values()],d=Math.hypot(a[0]-b[0],a[1]-b[1]);if(pinch){UI.cam.z=Math.min(5,Math.max(.4,UI.cam.z*d/pinch))}pinch=d}
      else{UI.cam.th-=(e.clientX-o[0])*0.008;UI.cam.ph=Math.min(1.5,Math.max(0.08,UI.cam.ph+(e.clientY-o[1])*0.006))}UI.r3&&UI.r3()});
    const up=e=>{pts.delete(e.pointerId);if(pts.size<2)pinch=0};cv.addEventListener("pointerup",up);cv.addEventListener("pointercancel",up);
    cv.addEventListener("wheel",e=>{e.preventDefault();UI.cam.z=Math.min(5,Math.max(.4,UI.cam.z*(e.deltaY<0?1.1:1/1.1)));UI.r3&&UI.r3()},{passive:false})}}
window.addEventListener("resize",()=>{if(UI.tab==="salon"&&UI.view==="3d"&&UI.r3)UI.r3()});

/* ---------- kW · kVA rehberi ---------- */
function powers(c){const a=st.a,pf=0.8,tri=c.tri,V=tri?1.732*a.v3:a.v1;
  const acKVA=V*c.acA/1000,acKW=acKVA*pf,dcKW=c.dcW/1000,dcKVA=V*c.dcA/1000,totKW=dcKW+acKW;return{V,acKVA,acKW,dcKW,dcKVA,totKW,pf}}
function renderRehber(){const host=$("#tab-rehber"),i=siteIdx(),c=i>=0?calc(st.rows[i]):null,a=st.a;
  const glass=`<svg viewBox="0 0 220 210" width="100%" style="max-width:240px" role="img" aria-label="kW ve kVA bardak benzetmesi">
    <defs><clipPath id="gl"><path d="M50 20 L170 20 L156 190 Q155 198 147 198 L73 198 Q65 198 64 190 Z"/></clipPath></defs>
    <g clip-path="url(#gl)"><rect x="0" y="20" width="220" height="44" fill="#f4e6c4"/><g fill="#fff8e6">${[60,80,100,120,140,160].map((x,k)=>`<circle cx="${x}" cy="${36+(k%2)*10}" r="${9+(k%3)*3}"/>`).join("")}</g><rect x="0" y="64" width="220" height="140" fill="#2a9bb5"/></g>
    <path d="M50 20 L170 20 L156 190 Q155 198 147 198 L73 198 Q65 198 64 190 Z" fill="none" style="stroke:var(--ink)" stroke-width="3"/>
    <g font-family="system-ui,sans-serif" font-weight="700" font-size="13" style="fill:var(--ink)">
     <path d="M176 22 L196 22 L196 196 L176 196" fill="none" style="stroke:var(--accent)" stroke-width="2.5"/><text x="203" y="112" transform="rotate(90 203 112)" text-anchor="middle">kVA (tamamı)</text>
     <text x="110" y="135" text-anchor="middle" fill="#fff" font-size="15">kW</text><text x="110" y="152" text-anchor="middle" fill="#fff" font-size="11" font-weight="500">işe dönen güç</text>
     <text x="110" y="47" text-anchor="middle" font-size="11">köpük</text></g></svg>`;
  let site="";
  if(c){const p=powers(c),Vt=c.tri?`1,73 × ${a.v3} V`:`${a.v1} V`,ph=c.tri?" (faz başı)":"";
    site=`<div class="panel"><h3>Bu sitenin hesabı</h3><p class="sub">${esc(st.rows[i].name)} · ${f(c.dc,0)} ADC · ${c.bag?"bağımsız salon":"mevcut salon"} · ${besl(c)}</p>
     <ol class="chain">
      <li><span class="n">1</span><div><div class="t">DC sistemin çektiği akım</div><div class="d">(${f(c.dc,0)} A yük + ${f(c.chA,0)} A şarj) × ${a.dcv} V ÷ ${f(a.eff,2)} = ${f(c.dcW,0)} W ÷ ${Vt}</div></div><div class="v">${f(c.dcA,1)} A</div></li><li class="arrow">+</li>
      <li><span class="n">2</span><div><div class="t">Klimaların akımı</div><div class="d">${c.acCount} × ${f(c.unitA,1)} A</div></div><div class="v">${f(c.acA,1)} A</div></li><li class="arrow">=</li>
      <li><span class="n">3</span><div><div class="t">Toplam akım${ph}</div><div class="d">hattın taşıyacağı en yüksek akım</div></div><div class="v">${f(c.tot,1)} A</div></li><li class="arrow">↓</li>
      <li><span class="n">4</span><div><div class="t">kVA = gerilim × akım</div><div class="d">${Vt} × ${f(c.tot,1)} A</div></div><div class="v">${f(c.kva,1)} kVA</div></li><li class="arrow">↓ ÷ ${f(a.gmax,2)} (jeneratör en fazla %${f(a.gmax*100,0)} yüklenir)</li>
      <li><span class="n">5</span><div><div class="t">Yük payı ile</div><div class="d">${f(c.kva,1)} ÷ ${f(a.gmax,2)}</div></div><div class="v">${f(c.kva/a.gmax,1)} kVA</div></li><li class="arrow">↓ ÷ ${f(a.derate,2)} (sıcakta güç kaybı)</li>
      <li class="fin"><span class="n">6</span><div><div class="t">Jeneratörde gereken boş yer</div><div class="d">${f(c.kva/a.gmax,1)} ÷ ${f(a.derate,2)}${c.gen?` → seçilen ${c.gen} kVA`:""}</div></div><div class="v">${f(c.gNeed,1)} kVA</div></li>
     </ol>
     <div class="vs" style="margin-top:12px"><div><span class="hint">Harcanan güç</span><b>≈ ${f(p.totKW,1)} kW</b><p>DC ${f(p.dcKW,1)} kW + klima ≈ ${f(p.acKW,1)} kW (${f(p.acKVA,1)} kVA × ${p.pf})</p></div>
      <div><span class="hint">Hattan çekilen</span><b>${f(c.kva,1)} kVA</b><p>jeneratör ve kablo bunu taşır</p></div></div>
    </div>
    <div class="panel"><h3>Mevcut jeneratör kontrolü</h3><p class="sub">Sahanın kendi jeneratörü kullanılacaksa: etiketteki kVA'yı ve en yoğun saatte panelde okunan akımı gir.</p>
     <div class="ctl"><label>Jeneratör (kVA)<input id="gK" inputmode="decimal" placeholder="örn. 100"></label>
      <label>Faz<select id="gP"><option value="3"${c.tri?" selected":""}>3 faz 380 V</option><option value="1"${c.tri?"":" selected"}>Tek faz 220 V</option></select></label>
      <label>Okunan akım (A)<input id="gA" inputmode="decimal" placeholder="en yüksek faz"></label></div>
     <div id="gOut"></div></div>`}
  host.innerHTML=`<div class="panel"><div class="ctl">${i>=0?siteSelect("rSite"):""}</div></div>
   <div class="g2">
    <div class="panel"><h3>kW ile kVA farkı</h3><p class="sub">Jeneratörler kVA ile satılır, çünkü kabloyu ve sargıları ısıtan toplam akımdır.</p>
     <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;align-items:center;justify-items:center">${glass}
      <div class="rule" style="justify-self:stretch"><b>kW</b><span>Cihazın gerçekten harcadığı, işe dönen güç (bardaktaki ayran).</span><b>kVA</b><span>Hattan çekilen toplam güç = gerilim × akım (köpüğüyle bardağın tamamı).</span><b>0,8</b><span>Güç faktörü. kW ≈ kVA × 0,8. Jeneratör etiketinde ikisi de yazar: 33 kVA / 26,4 kW.</span></div></div></div>
    <div class="panel"><h3>Sahada kısayol</h3><p class="sub">Hesap makinesi olmadan yaklaşık değer.</p>
     <div class="rule"><b>1 kVA ≈ 4,5 A</b><span>Tek faz 220 V. Örnek: 38 A ÷ 4,5 ≈ 8,4 kVA.</span><b>1 kVA ≈ 1,5 A</b><span>3 faz 380 V, faz başı. Örnek: faz başı 118 A ÷ 1,5 ≈ 78 kVA.</span><b>÷ 0,72</b><span>Bulduğun kVA'yı 0,72'ye böl (0,8 yük payı × 0,9 sıcaklık) → jeneratörde gereken boş yer.</span><b>× 1,25</b><span>Toplam akımı 1,25 ile çarp, bir üst sigorta boyunu seç → talep edilecek sigorta.</span></div></div>
   </div>${site}`;
  const s=$("#rSite");if(s)s.onchange=()=>{UI.site=+s.value;saveUI();renderRehber()};
  const chk=()=>{const out=$("#gOut");if(!out||!c)return;const K=num($("#gK").value),Aa=num($("#gA").value)||0,tri=$("#gP").value==="3";
    if(!K){out.innerHTML="";return}
    const cap=K*a.gmax*a.derate,used=(tri?1.732*a.v3:a.v1)*Aa/1000,free=cap-used,needK=c.kva,ok=free>=needK;
    out.innerHTML=`<ol class="chain" style="margin-top:12px">
      <li><span class="n">1</span><div><div class="t">Kullanılabilir kapasite</div><div class="d">${f(K,0)} kVA × ${f(a.gmax,2)} × ${f(a.derate,2)}</div></div><div class="v">${f(cap,1)} kVA</div></li><li class="arrow">−</li>
      <li><span class="n">2</span><div><div class="t">Şu anki yük</div><div class="d">${tri?`1,73 × ${a.v3} V`:`${a.v1} V`} × ${f(Aa,0)} A</div></div><div class="v">${f(used,1)} kVA</div></li><li class="arrow">=</li>
      <li><span class="n">3</span><div><div class="t">Boş kapasite</div><div class="d">bizim yük: ${f(needK,1)} kVA${c.tri!==tri?` · <b class="warn">dikkat: bu site ${besl(c).toLowerCase()} istiyor</b>`:""}</div></div><div class="v">${f(free,1)} kVA</div></li></ol>
      <div class="verdict" style="background:var(--${ok?"ok":"bad"}-soft);color:var(--${ok?"ok":"bad"})">${ok?`Boş kapasite bizim yükü karşılıyor (${f(free-needK,1)} kVA artıyor).`:`Boş kapasite bizim yük için ${f(needK-free,1)} kVA eksik.`}</div>`};
  ["gK","gA","gP"].forEach(id=>{const el=$("#"+id);if(el){el.oninput=chk;el.onchange=chk}})}

window.onCalcChange=()=>{if(UI.tab==="salon")renderSalon();else if(UI.tab==="rehber")renderRehber()};
setTab(UI.tab);
})();
