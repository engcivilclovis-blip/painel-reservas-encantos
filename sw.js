/* Service worker do Painel Encantos de Altitude.
 *
 * Estratégia: REDE PRIMEIRO, cache como reserva.
 * O painel é atualizado com frequência, então servir cache antes da rede faria
 * a equipe ficar com uma versão velha sem perceber. Assim, quando há sinal a
 * pessoa sempre vê a versão mais nova; sem sinal, abre a última que funcionou.
 *
 * Nunca intercepta as chamadas da API (Apps Script) nem dos CDNs: são de outra
 * origem e precisam ir diretas — dados de reserva/estoque não podem vir de cache.
 */
var CACHE = 'encantos-v1';
var ESSENCIAIS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE)
      .then(function(c){ return c.addAll(ESSENCIAIS); })
      .catch(function(){ /* se algum item falhar, segue sem quebrar a instalação */ })
      .then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys()
      .then(function(nomes){
        return Promise.all(nomes.filter(function(n){ return n !== CACHE; })
                                .map(function(n){ return caches.delete(n); }));
      })
      .then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;                          // POSTs vão diretos
  var url = new URL(req.url);
  if(url.origin !== self.location.origin) return;           // API e CDNs: sem cache
  e.respondWith(
    fetch(req)
      .then(function(resp){
        if(resp && resp.ok){
          var copia = resp.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copia); });
        }
        return resp;
      })
      .catch(function(){
        return caches.match(req).then(function(hit){
          return hit || caches.match('./index.html');        // offline: última versão boa
        });
      })
  );
});
