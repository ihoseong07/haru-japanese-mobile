const CACHE='haru-mobile-v2';
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(['./','./index.html','./style.css','./app.mjs','./engine.mjs','./japanese.mjs','./lessons.mjs','./icon.svg'])));self.skipWaiting();});
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||new URL(event.request.url).origin!==location.origin)return;
 event.respondWith(fetch(event.request,{cache:'no-cache'}).then(response=>{if(response.ok&&!event.request.headers.has('range')){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>{});}return response;}).catch(()=>caches.match(event.request).then(cached=>cached||new Response('오프라인입니다. 처음 준비는 인터넷 연결이 필요해요.',{status:503}))));
});
