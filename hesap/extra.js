/* Enerji Yük Hesabı – ek bölümler: sekmeler, salon tasarımı (üstten + 3D), kW/kVA rehberi.
   index.html içindeki st, calc, area, cellDim, AC, BAT, f, num, kw, esc, save, besl değişkenlerini kullanır. */
"use strict";
(function(){
const $=s=>document.querySelector(s);
const UI={tab:"hesap",site:0,view:"top",sel:null,r3:null};
try{const u=JSON.parse(localStorage.getItem("hesap-ui")||"{}");Object.assign(UI,{tab:u.tab||"hesap",site:u.site||0,view:u.view||"top"})}catch(e){}
const saveUI=()=>{try{localStorage.setItem("hesap-ui",JSON.stringify({tab:UI.tab,site:UI.site,view:UI.view}))}catch(e){}};

/* ---------- sekmeler ---------- */
function setTab(t){UI.tab=t;saveUI();
  document.querySelectorAll(".tabs [data-tab]").forEach(b=>b.setAttribute("aria-selected",b.dataset.tab===t));
  ["hesap","salon","rehber"].forEach(k=>{$("#tab-"+k).hidden=k!==t});
  document.querySelectorAll("header .row .btn").forEach(b=>b.style.display=t==="hesap"?"":"none");
  if(t==="salon")renderSalon();if(t==="rehber")renderRehber()}
document.querySelector(".tabs").addEventListener("click",e=>{const b=e.target.closest("[data-tab]");if(b)setTab(b.dataset.tab)});

function siteIdx(){if(!st.rows.length)return -1;if(UI.site>=st.rows.length)UI.site=0;return UI.site}
function siteSelect(id){return `<label>Site<select id="${id}">${st.rows.map((r,i)=>`<option value="${i}"${i===UI.site?" selected":""}>${esc(r.name||"Site "+(i+1))}${num(r.dc)?" · "+num(r.dc)+" A":""}</option>`).join("")}</select></label>`}

/* ---------- salon: ekipman listesi ---------- */
const COL={dc:"#1c3d5a",aku:"#2f8a57",ac:"#2a9bb5",split:"#2a9bb5"};
function planItems(c){const a=st.a,it=[];let k=0,svc=num(a.svc)||0;
  const add=(type,name,w,d,h,front,extra)=>it.push({key:type+"_"+(k++),type,name,w,d,h,front,...(extra||{})});
  if(c.B.t==="pb2"){
    for(let u=0;u<c.units;u++)add("dc","DC dolabı",a.dcBigW,a.dcBigD,a.dcH,svc);
    const[w,d,hh]=cellDim(c.mod),L=Math.round(6*(w/10+1)+8),D=Math.round(2*d/10+35),H=Math.round(2*hh/10+30);
    for(let m=0;m<c.mods;m++)add("aku",`Jel akü sehpası ${c.mod} Ah`,L,D,H,svc);
  }else{
    const cab=c.units,inCab=Math.min(c.mods,cab*(num(a.cabG)||0)),rest=c.mods-inCab,rg=num(a.rackG)||2,racks=Math.ceil(rest/rg-1e-9);
    let left=inCab;for(let u=0;u<cab;u++){const g=Math.min(left,num(a.cabG)||0);left-=g;add("dc",`DC kabin${g?` + ${g} grup akü`:""}`,a.cabW,a.cabD,a.dcH,svc)}
    left=rest;for(let q=0;q<racks;q++){const g=Math.min(left,rg);left-=g;add("aku",`Akü rafı (${g} grup)`,a.rackW,a.rackD,a.rackH,svc)}
  }
  if(c.acT==="dx")for(let q=0;q<c.acN;q++)add("ac",`DX klima ${f(c.acs,0)} kcal/h`,a.dxW,a.dxD,a.dxH,Math.round((num(a.dxFront)||0)*100));
  else for(let q=0;q<c.acN;q++)add("split",`Split ${f(c.acs/1000,0)}k BTU (duvar)`,100,25,32,0,{wall:true});
  return it}
const sigOf=it=>it.map(i=>`${i.type}:${i.w}x${i.d}x${i.h}:${i.front}`).join("|");
/* gövde dikdörtgeni ve önündeki servis alanı (rot: 0 ön aşağı, 90 ön sola, 180 ön yukarı, 270 ön sağa) */
function geo(i){const p=i.pos,sw=p.rot%180!==0,bw=sw?i.d:i.w,bd=sw?i.w:i.d,b={x:p.x,y:p.y,w:bw,h:bd},c=i.front;let z=null;
  if(c>0){if(p.rot===0)z={x:p.x,y:p.y+bd,w:bw,h:c};else if(p.rot===180)z={x:p.x,y:p.y-c,w:bw,h:c};else if(p.rot===90)z={x:p.x-c,y:p.y,w:c,h:bd};else z={x:p.x+bw,y:p.y,w:c,h:bd}}
  return{b,z}}
const ov=(r,s)=>r.x<s.x+s.w-0.5&&s.x<r.x+r.w-0.5&&r.y<s.y+s.h-0.5&&s.y<r.y+r.h-0.5;
const inside=(r,R)=>r.x>=-0.5&&r.y>=-0.5&&r.x+r.w<=R.w+0.5&&r.y+r.h<=R.d+0.5;

function autoLayout(items){const a=st.a,g=num(a.lineGap)||0,wg=10;
  const row=items.filter(i=>i.type==="dc"||i.type==="aku"),acs=items.filter(i=>i.type==="ac"),sp=items.filter(i=>i.type==="split");
  let x=wg;row.forEach(i=>{i.pos={x,y:wg,rot:0};x+=i.w+g});const rowLen=row.length?x-g+wg:0,rowD=Math.max(0,...row.map(i=>i.d)),rowF=Math.max(0,...row.map(i=>i.front));
  let W=Math.max(rowLen,200),D;
  if(acs.length){const aisle=Math.max(rowF,...acs.map(i=>i.front)),y=wg+rowD+aisle;let xa=wg;acs.forEach(i=>{i.pos={x:xa,y,rot:180};xa+=i.w+g});
    W=Math.max(W,xa-g+wg);D=y+Math.max(...acs.map(i=>i.d))+wg}
  else D=wg+rowD+rowF+60;
  let xs=wg;sp.forEach(i=>{i.pos={x:xs,y:D-i.d,rot:180};xs+=i.w+60});W=Math.max(W,xs-60+wg);
  return{w:Math.ceil(W/10)*10,d:Math.ceil(D/10)*10}}

function getPlan(i){const r=st.rows[i],c=calc(r);if(!c)return null;const items=planItems(c),sig=sigOf(items);
  if(!r.plan||r.plan.sig!==sig){const room=autoLayout(items);r.plan={sig,room,pos:Object.fromEntries(items.map(x=>[x.key,x.pos]))};save()}
  items.forEach(x=>{x.pos=r.plan.pos[x.key]||{x:10,y:10,rot:0}});
  return{r,c,items,room:r.plan.room}}

function analyse(P){const R=P.room,fl=P.items.filter(i=>!i.wall),G=fl.map(i=>({i,...geo(i)})),msgs=[];
  const bad=new Set();
  G.forEach((A,ai)=>{if(!inside(A.b,R)){bad.add(A.i.key);msgs.push(["e",`${A.i.name} oda dışına taşıyor`])}
    else if(A.z&&!inside(A.z,R))msgs.push(["w",`${A.i.name}: önündeki ${A.i.front} cm servis boşluğu duvara çarpıyor`]);
    G.forEach((B,bi)=>{if(bi<=ai)return;if(ov(A.b,B.b)){bad.add(A.i.key);bad.add(B.i.key);msgs.push(["e",`${A.i.name} ile ${B.i.name} üst üste`])}});
    G.forEach((B,bi)=>{if(bi===ai||!B.z)return;if(ov(A.b,B.z)){bad.add(A.i.key);msgs.push(["e",`${A.i.name}, ${B.i.name} önündeki servis boşluğunu kapatıyor`])}})});
  P.items.filter(i=>i.wall).forEach(i=>{const b=geo(i).b;if(!inside(b,R)){bad.add(i.key);msgs.push(["e",`${i.name} oda dışında`])}});
  let bb=null;G.forEach(A=>[A.b,A.z].forEach(r=>{if(!r)return;if(!bb)bb={x0:r.x,y0:r.y,x1:r.x+r.w,y1:r.y+r.h};else{bb.x0=Math.min(bb.x0,r.x);bb.y0=Math.min(bb.y0,r.y);bb.x1=Math.max(bb.x1,r.x+r.w);bb.y1=Math.max(bb.y1,r.y+r.h)}}));
  const foot=G.reduce((s,A)=>s+A.b.w*A.b.h,0)/1e4,svcA=G.reduce((s,A)=>s+(A.z?A.z.w*A.z.h:0),0)/1e4;
  if(!msgs.length)msgs.push(["o","Çakışma yok, tüm ekipman ve servis boşlukları odanın içinde"]);
  return{bad,msgs,bb,foot,svcA}}

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
   <div class="stage" id="pStage"></div>
   <div class="kpis" id="pK"></div>
   <ul class="msgs" id="pM"></ul>
   <ul class="items" id="pL"></ul>
  </div>`;
  bindSalonCtl();drawSalon()}
function bindSalonCtl(){const s=$("#pSite");if(s)s.onchange=()=>{UI.site=+s.value;UI.sel=null;saveUI();renderSalon()};
  const P=()=>getPlan(siteIdx());
  const setRoom=(k,el)=>{const v=num(el.value);if(v>50){const p=P();p.r.plan.room[k]=Math.round(v);save();drawSalon()}};
  if($("#pW")){$("#pW").oninput=e=>setRoom("w",e.target);$("#pD").oninput=e=>setRoom("d",e.target);
    document.querySelectorAll("[data-view]").forEach(b=>b.onclick=()=>{UI.view=b.dataset.view;saveUI();document.querySelectorAll("[data-view]").forEach(x=>x.setAttribute("aria-pressed",x===b));drawSalon()});
    $("#pRot").onclick=()=>{const p=P();if(!UI.sel||!p.r.plan.pos[UI.sel])return toast("Önce bir ekipman seç");const q=p.r.plan.pos[UI.sel];q.rot=(q.rot+90)%360;save();drawSalon()};
    $("#pAuto").onclick=()=>{const p=P();delete p.r.plan;save();renderSalon()};
    $("#pFit").onclick=()=>{const p=P(),A=analyse(p);if(!A.bb)return;const dx=10-A.bb.x0,dy=10-A.bb.y0;
      Object.values(p.r.plan.pos).forEach(q=>{q.x+=dx;q.y+=dy});p.r.plan.room={w:Math.ceil((A.bb.x1-A.bb.x0+20)/10)*10,d:Math.ceil((A.bb.y1-A.bb.y0+20)/10)*10};
      p.items.filter(x=>x.wall).forEach(x=>{const q=p.r.plan.pos[x.key];q.y=Math.min(q.y,p.r.plan.room.d-x.d);q.x=Math.min(q.x,p.r.plan.room.w-x.w)});save();renderSalon()}}}
function drawSalon(){const i=siteIdx(),P=getPlan(i);if(!P||!$("#pStage"))return;const A=analyse(P);
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
  const zones=[],bodies=[];
  P.items.forEach(x=>{const g=geo(x),b=g.b,sel=UI.sel===x.key,bad=A.bad.has(x.key),col=COL[x.type];
    if(g.z)zones.push(`<rect x="${g.z.x}" y="${g.z.y}" width="${g.z.w}" height="${g.z.h}" fill="url(#hatch-${x.type})" stroke="${col}" stroke-opacity=".5" stroke-dasharray="6 5"/>`);
    const fr=(()=>{const p=x.pos;if(p.rot===0)return[b.x,b.y+b.h,b.x+b.w,b.y+b.h];if(p.rot===180)return[b.x,b.y,b.x+b.w,b.y];if(p.rot===90)return[b.x,b.y,b.x,b.y+b.h];return[b.x+b.w,b.y,b.x+b.w,b.y+b.h]})();
    const lab=x.name.replace(/ \(duvar\)/,""),tw=b.w>b.h,fz=Math.max(6,Math.min(fs,(tw?b.h:b.w)/3.2,((tw?b.w:b.h)-8)/(Math.min(lab.length,26)*0.58)));
    bodies.push(`<g data-it="${x.key}" style="cursor:move">
      <rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="3" fill="${bad?"#c0392b":col}" fill-opacity="${x.wall?.55:.92}" stroke="${sel?"#e09b12":"#0b1720"}" stroke-width="${sel?5:1.5}"/>
      <line x1="${fr[0]}" y1="${fr[1]}" x2="${fr[2]}" y2="${fr[3]}" stroke="#ffd166" stroke-width="5" stroke-linecap="round"/>
      <text x="${b.x+b.w/2}" y="${b.y+b.h/2}" font-size="${fz}" fill="#fff" text-anchor="middle" dominant-baseline="middle" ${tw?"":`transform="rotate(-90 ${b.x+b.w/2} ${b.y+b.h/2})"`} style="pointer-events:none;font-weight:700">${esc(lab.length>26?lab.slice(0,25)+"…":lab)}</text>
      <text x="${b.x+b.w/2}" y="${b.y+b.h/2+fz*1.15}" font-size="${fz*.8}" fill="#fff" fill-opacity=".85" text-anchor="middle" dominant-baseline="middle" ${tw?"":`transform="rotate(-90 ${b.x+b.w/2} ${b.y+b.h/2})"`} style="pointer-events:none">${x.w}×${x.d}</text></g>`)});
  const bb=A.bb?`<rect x="${A.bb.x0}" y="${A.bb.y0}" width="${A.bb.x1-A.bb.x0}" height="${A.bb.y1-A.bb.y0}" fill="none" stroke="#e09b12" stroke-width="2.5" stroke-dasharray="12 8"/>`:"";
  const hatch=t=>`<pattern id="hatch-${t}" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="12" height="12" fill="${COL[t]}" fill-opacity=".08"/><line x1="0" y1="0" x2="0" y2="12" stroke="${COL[t]}" stroke-opacity=".35" stroke-width="3"/></pattern>`;
  stage.innerHTML=`<svg class="plan" viewBox="${-pad} ${-pad} ${R.w+pad*2} ${R.d+pad*2}" role="img" aria-label="Salon üstten görünüm">
   <defs>${["dc","aku","ac","split"].map(hatch).join("")}</defs>
   <rect x="-12" y="-12" width="${R.w+24}" height="${R.d+24}" fill="#5b6b78"/>
   <rect x="0" y="0" width="${R.w}" height="${R.d}" style="fill:var(--surface)"/>
   <g style="stroke:var(--line)" stroke-width="1">${grid.join("")}</g>
   ${zones.join("")}${bb}${bodies.join("")}
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
  svg.addEventListener("keydown",()=>{})}
document.addEventListener("keydown",e=>{if(UI.tab!=="salon"||!UI.sel||UI.view!=="top"||/INPUT|SELECT/.test(document.activeElement.tagName))return;
  const P=getPlan(siteIdx());if(!P)return;const q=P.r.plan.pos[UI.sel];if(!q)return;const s=e.shiftKey?50:5,m={ArrowLeft:[-s,0],ArrowRight:[s,0],ArrowUp:[0,-s],ArrowDown:[0,s]}[e.key];
  if(m){q.x+=m[0];q.y+=m[1];save();drawSalon();e.preventDefault()}else if(e.key==="r"||e.key==="R"){q.rot=(q.rot+90)%360;save();drawSalon()}});

/* ---------- 3D görünüm (kendi küçük çizicimiz, internet gerekmez) ---------- */
function hexRgb(h){const n=parseInt(h.slice(1),16);return[n>>16&255,n>>8&255,n&255]}
function draw3D(P,A){const stage=$("#pStage");
  if(!stage.querySelector("canvas")){stage.innerHTML=`<canvas aria-label="Salon 3D görünüm"></canvas><div class="hint3">Döndürmek için sürükle · yakınlaştırmak için iki parmak / tekerlek</div>`;UI.cam=UI.cam||{th:-0.75,ph:0.62,z:1}}
  const cv=stage.querySelector("canvas"),R=P.room;
  const scene=()=>{const boxes=[],flats=[];
    P.items.forEach(x=>{const g=geo(x),b=g.b,el=x.wall?200:0,col=A.bad.has(x.key)?"#c0392b":COL[x.type];
      boxes.push({x0:b.x,y0:b.y,x1:b.x+b.w,y1:b.y+b.h,z0:el,z1:el+x.h,col,label:x.name.replace(/ \(duvar\)/,""),key:x.key,rot:x.pos.rot,wall:x.wall});
      if(g.z)flats.push({x0:g.z.x,y0:g.z.y,x1:g.z.x+g.z.w,y1:g.z.y+g.z.h,col:COL[x.type]})});return{boxes,flats}};
  const S=scene();
  const render=()=>{const dpr=window.devicePixelRatio||1,W=cv.clientWidth,H=cv.clientHeight;cv.width=W*dpr;cv.height=H*dpr;const ctx=cv.getContext("2d");ctx.setTransform(dpr,0,0,dpr,0,0);
    const dark=matchMedia("(prefers-color-scheme: dark)").matches;ctx.fillStyle=dark?"#121b21":"#e9eef2";ctx.fillRect(0,0,W,H);
    const cam=UI.cam,cx=R.w/2,cy=R.d/2,cz=60,span=Math.max(R.w,R.d,300),dist=span*1.85/cam.z;
    const ex=cx+dist*Math.cos(cam.ph)*Math.cos(cam.th),ey=cy+dist*Math.cos(cam.ph)*Math.sin(cam.th),ez=cz+dist*Math.sin(cam.ph);
    let fx=cx-ex,fy=cy-ey,fz=cz-ez;const fl=Math.hypot(fx,fy,fz);fx/=fl;fy/=fl;fz/=fl;
    let rx=fy,ry=-fx,rz=0;const rl=Math.hypot(rx,ry);rx/=rl;ry/=rl;const ux=ry*fz-rz*fy,uy=rz*fx-rx*fz,uz=rx*fy-ry*fx;
    const foc=Math.min(W,H)*0.95;
    const prj=(x,y,z)=>{const dx=x-ex,dy=y-ey,dz=z-ez,cz2=dx*fx+dy*fy+dz*fz;return[W/2+(dx*rx+dy*ry)*foc/cz2,H/2-(dx*ux+dy*uy+dz*uz)*foc/cz2,cz2]};
    const faces=[];const L=[-0.45,-0.6,0.66];
    const shade=(rgb,n,a)=>{const d=Math.max(0,-(n[0]*L[0]+n[1]*L[1]+n[2]*L[2]));const k=0.55+0.45*d;return `rgba(${rgb.map(v=>Math.round(v*k)).join(",")},${a})`};
    const quad=(pts,fill,stroke,lw,extra)=>{const P2=pts.map(p=>prj(...p));if(P2.some(p=>p[2]<=1))return;faces.push({P:P2,d:P2.reduce((s,p)=>s+p[2],0)/P2.length,fill,stroke,lw,...(extra||{})})};
    /* zemin + ızgara */
    quad([[0,0,0],[R.w,0,0],[R.w,R.d,0],[0,R.d,0]],dark?"#1f2c35":"#ffffff","#5b6b78",2,{floor:1});
    /* duvarlar: kameraya arkası dönük olanlar (görüşü kapatmayanlar) */
    const WH=280,wallC=dark?"rgba(70,90,105,.55)":"rgba(160,175,188,.45)";
    [[[0,0],[R.w,0],[0,1]],[[R.w,0],[R.w,R.d],[-1,0]],[[R.w,R.d],[0,R.d],[0,-1]],[[0,R.d],[0,0],[1,0]]].forEach(([a,b,n])=>{const mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2;if((ex-mx)*n[0]+(ey-my)*n[1]>0)quad([[a[0],a[1],0],[b[0],b[1],0],[b[0],b[1],WH],[a[0],a[1],WH]],wallC,"rgba(91,107,120,.6)",1,{wall:1})});
    S.flats.forEach(z=>{const rgb=hexRgb(z.col);quad([[z.x0,z.y0,0.5],[z.x1,z.y0,0.5],[z.x1,z.y1,0.5],[z.x0,z.y1,0.5]],`rgba(${rgb},.16)`,`rgba(${rgb},.6)`,1,{flat:1})});
    S.boxes.forEach(B=>{const rgb=hexRgb(B.col),{x0,y0,x1,y1,z0,z1}=B,a=B.wall?.8:1,st2="rgba(10,20,28,.55)";
      const F=[[[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1],[0,0,1]],[[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1],[0,-1,0]],[[x1,y1,z0],[x0,y1,z0],[x0,y1,z1],[x1,y1,z1],[0,1,0]],[[x0,y1,z0],[x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[-1,0,0]],[[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[x1,y0,z1],[1,0,0]]];
      const front={0:[0,1,0],180:[0,-1,0],90:[-1,0,0],270:[1,0,0]}[B.rot];
      F.forEach(q=>{const n=q[4],c=[(x0+x1)/2+n[0]*(x1-x0)/2,(y0+y1)/2+n[1]*(y1-y0)/2,(z0+z1)/2+n[2]*(z1-z0)/2];
        if((ex-c[0])*n[0]+(ey-c[1])*n[1]+(ez-c[2])*n[2]<=0)return;
        const isF=n[0]===front[0]&&n[1]===front[1]&&n[2]===0;quad(q.slice(0,4),shade(rgb,n,a),st2,1,{box:B,front:isF&&!B.wall,n})})});
    faces.sort((p,q)=>(q.floor?1e9:q.wall?5e8:q.flat?4e8:q.d)-(p.floor?1e9:p.wall?5e8:p.flat?4e8:p.d));
    faces.forEach(F=>{ctx.beginPath();F.P.forEach((p,k)=>k?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fillStyle=F.fill;ctx.fill();ctx.strokeStyle=F.stroke;ctx.lineWidth=F.lw;ctx.stroke();
      if(F.front){/* ön yüzde kapak çizgileri */ctx.strokeStyle="rgba(255,209,102,.9)";ctx.lineWidth=2;const p=F.P;ctx.beginPath();ctx.moveTo(p[0][0]+(p[3][0]-p[0][0])*.12,p[0][1]+(p[3][1]-p[0][1])*.12);ctx.lineTo(p[1][0]+(p[2][0]-p[1][0])*.12,p[1][1]+(p[2][1]-p[1][1])*.12);ctx.stroke()}
      if(F.floor){ctx.save();ctx.strokeStyle=dark?"rgba(255,255,255,.06)":"rgba(0,0,0,.06)";ctx.lineWidth=1;for(let x=50;x<R.w;x+=50){const a=prj(x,0,0),b=prj(x,R.d,0);ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke()}for(let y=50;y<R.d;y+=50){const a=prj(0,y,0),b=prj(R.w,y,0);ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke()}ctx.restore()}});
    /* etiketler */
    ctx.font="600 12px system-ui,-apple-system,sans-serif";ctx.textAlign="center";
    S.boxes.map(B=>{const p=prj((B.x0+B.x1)/2,(B.y0+B.y1)/2,B.z1+18);return{B,p}}).filter(o=>o.p[2]>1).sort((a,b)=>b.p[2]-a.p[2]).forEach(({B,p})=>{
      const t=B.label.length>24?B.label.slice(0,23)+"…":B.label,w=ctx.measureText(t).width+12;ctx.fillStyle=dark?"rgba(24,34,41,.9)":"rgba(255,255,255,.92)";ctx.strokeStyle=B.col;ctx.lineWidth=1.5;
      ctx.beginPath();ctx.roundRect?ctx.roundRect(p[0]-w/2,p[1]-11,w,20,5):ctx.rect(p[0]-w/2,p[1]-11,w,20);ctx.fill();ctx.stroke();ctx.fillStyle=dark?"#e3eaef":"#14212b";ctx.fillText(t,p[0],p[1]+4)});
    /* oda ölçüleri */
    const lbl=(x,y,t)=>{const p=prj(x,y,0);if(p[2]<=1)return;ctx.font="700 13px system-ui,sans-serif";ctx.fillStyle=dark?"#e3eaef":"#14212b";ctx.fillText(t,p[0],p[1])};
    lbl(R.w/2,ey<cy?-40:R.d+55,f(R.w/100,2)+" m");lbl(ex<cx?-55:R.w+55,R.d/2,f(R.d/100,2)+" m")};
  UI.r3=render;render();
  if(!cv.dataset.bound){cv.dataset.bound=1;const pts=new Map();let pinch=0;
    cv.addEventListener("pointerdown",e=>{cv.setPointerCapture(e.pointerId);pts.set(e.pointerId,[e.clientX,e.clientY]);if(pts.size===2){const[a,b]=[...pts.values()];pinch=Math.hypot(a[0]-b[0],a[1]-b[1])}});
    cv.addEventListener("pointermove",e=>{if(!pts.has(e.pointerId))return;const o=pts.get(e.pointerId);pts.set(e.pointerId,[e.clientX,e.clientY]);
      if(pts.size===2){const[a,b]=[...pts.values()],d=Math.hypot(a[0]-b[0],a[1]-b[1]);if(pinch){UI.cam.z=Math.min(4,Math.max(.4,UI.cam.z*d/pinch))}pinch=d}
      else{UI.cam.th-=(e.clientX-o[0])*0.008;UI.cam.ph=Math.min(1.5,Math.max(0.12,UI.cam.ph+(e.clientY-o[1])*0.006))}UI.r3&&UI.r3()});
    const up=e=>{pts.delete(e.pointerId);if(pts.size<2)pinch=0};cv.addEventListener("pointerup",up);cv.addEventListener("pointercancel",up);
    cv.addEventListener("wheel",e=>{e.preventDefault();UI.cam.z=Math.min(4,Math.max(.4,UI.cam.z*(e.deltaY<0?1.1:1/1.1)));UI.r3&&UI.r3()},{passive:false})}}
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
