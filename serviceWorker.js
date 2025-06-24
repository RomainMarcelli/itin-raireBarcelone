const CACHE_NAME = "barcelone-cache-v1";
const FILES_TO_CACHE = [
  // Pages principales
  "index.html",
  "itineraire/itineraire.html",
  "programme.html",
  "metro/metro-lignes.html",
  "infos/info.html",

  // Feuilles de style
  "style.css",
  "responsive.css",
  "metro/metro.css",
  "infos/infos.css",
  "itineraire/style.css",

  // Scripts
  "script.js",
  "metro/lignes.js",
  "itineraire/script.js",

  // Données
  "barcelone.geojson",
  "metro_stations.geojson",
  "trajet.json",
  "manifest.json",
  "itineraire/trajet.json",
  "itineraire/barcelone.geojson",

  // Images générales
  "barcelonepng.png",
  "programme.png",
  "image.png",

  // Icônes PWA (si tu les ajoutes)
  "icons/icon-192.png",
  "icons/icon-512.png",

  //Images Icons
  "icons/arrow-compass.png",
  "icons/favicon.ico",
  "icons/user-position.png",

  // Images du dossier metro
  "metro/carte-metro.png",
  "metro/L1.png",
  "metro/L2.png",
  "metro/L3.png",
  "metro/L4.png",
  "metro/L5.png",
  "metro/L6.png",
  "metro/L7.png",
  "metro/L8.png",
  "metro/L9N.png",
  "metro/L9S.png",
  "metro/L10N.png",
  "metro/L10S.png",
  "metro/L11.png",
  "metro/L12.png",
  "metro/legende.png"
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
