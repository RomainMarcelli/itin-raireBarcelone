const CACHE_NAME = "barcelone-cache-v1";
const FILES_TO_CACHE = [
  // Pages principales
  "index.html",
  "itinéraire.html",
  "programme.html",
  "métro/metro-lignes.html",

  // Feuilles de style
  "style.css",
  "responsive.css",
  "métro/metro.css",

  // Scripts
  "script.js",
  "métro/lignes.js",

  // Données
  "barcelone.geojson",
  "metro_stations.geojson",
  "trajet.json",
  "manifest.json",

  // Images générales
  "barcelonepng.png",
  "programme.png",

  // Icônes PWA (si tu les ajoutes)
  "icons/icon-192.png",
  "icons/icon-512.png",

  // Images du dossier métro
  "métro/carte-metro.png",
  "métro/L1.png",
  "métro/L2.png",
  "métro/L3.png",
  "métro/L4.png",
  "métro/L5.png",
  "métro/L6.png",
  "métro/L7.png",
  "métro/L8.png",
  "métro/L9N.png",
  "métro/L9S.png",
  "métro/L10N.png",
  "métro/L10S.png",
  "métro/L11.png",
  "métro/L12.png",
  "métro/legende.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse; // ✅ sert depuis le cache
      }
      return fetch(event.request).catch(() => {
        // ❌ si la requête échoue ET qu'on n'a rien en cache
        if (event.request.destination === 'document') {
          return caches.match("index.html");
        }
      });
    })
  );
});


self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keyList) =>
      Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});
