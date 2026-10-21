const V="saha-kesif-v21";
const FILES=["./","index.html","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(FILES.map(u=>new Request(u,{cache:"reload"})))).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
const later=ms=>new Promise(r=>setTimeout(()=>r(null),ms));
self.addEventListener("fetch",e=>{
  const req=e.request;
  if(req.method!=="GET")return;
  const url=new URL(req.url);
  if(url.origin!==location.origin)return;
  const isDoc=req.mode==="navigate"||/(^|\/)(index\.html)?$/.test(url.pathname);
  if(isDoc){
    /* Uygulama sayfası: önce ağ (en fazla 2,5 sn), olmazsa önbellek.
       Böylece yeni sürüm hemen gelir, çevrimdışıyken de açılır. */
    e.respondWith((async()=>{
      const cached=await caches.match(req,{ignoreSearch:true})||await caches.match("index.html");
      try{
        const r=await Promise.race([fetch(req,{cache:"no-store"}),later(2500)]);
        if(r&&r.ok){const cp=r.clone();caches.open(V).then(c=>c.put("index.html",cp));return r}
      }catch(err){}
      if(cached)return cached;
      return fetch(req);
    })());
    return;
  }
  /* İkon, manifest vb.: önce önbellek */
  e.respondWith(caches.match(req,{ignoreSearch:true}).then(hit=>{
    const net=fetch(req).then(r=>{if(r.ok){const cp=r.clone();caches.open(V).then(c=>c.put(req,cp))}return r}).catch(()=>hit||caches.match("index.html"));
    return hit||net;
  }));
});
