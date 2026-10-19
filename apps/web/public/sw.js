const VERSION='retro-shell-v2';
self.addEventListener('install',()=>{});
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('message',event=>{if(event.data==='ACTIVATE_UPDATE')self.skipWaiting();});
self.addEventListener('fetch',event=>{const req=event.request,u=new URL(req.url);if(req.method!=='GET'||u.origin!==location.origin||u.pathname.startsWith('/api/')||u.pathname.startsWith('/dev-assets/'))return;
 if(req.mode==='navigate'||u.pathname.startsWith('/_next/static/')||u.pathname.startsWith('/runtime/')||u.pathname.startsWith('/cores/')||u.pathname.startsWith('/icons/')||u.pathname==='/manifest.webmanifest')event.respondWith((async()=>{const cache=await caches.open(VERSION);const cached=await cache.match(req,{ignoreSearch:req.mode==='navigate'});if(cached)return cached;try{const response=await fetch(req);if(response.ok&&response.type!=='opaque')await cache.put(req,response.clone());return response;}catch{if(req.mode==='navigate'){const fallback=await cache.match('/offline');if(fallback)return fallback;}return new Response('Offline resource missing',{status:503});}})());});
