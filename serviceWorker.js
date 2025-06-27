const CACHE_NAME = "barcelone-cache-v9";

const FILES_TO_CACHE = [
  "/", // page racine

  // Pages HTML
  "index.html", 
  "itineraire/itineraire.html",
  "programme.html",
  "metro/metro-lignes.html",
  "infos/info.html",

  // CSS
  "style.css",
  "responsive.css",
  "metro/metro.css",
  "infos/info.css",
  "itineraire/style.css",

  // JS
  "script.js",
  "metro/lignes.js",
  "itineraire/script.js",
  "mobile-routing.js",
  "infos/info.js",

  // INFOS

  "infos/boarding_info.png",
  "infos/info.png",
  "infos/boarding_info.png",

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

  // Icônes
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/arrow-compass.png",
  "icons/favicon.ico",
  "icons/user-position.png",

  // Librairies locales
  "libs/leaflet/leaflet.js",
  "libs/leaflet/leaflet.css",
  "libs/routing/leaflet-routing-machine.min.js",
  "libs/routing/leaflet-routing-machine.css",
  "libs/fontawesome/all.min.css",
  "libs/routing/lrm-openrouteservice.min.js",
  "libs/routing/leaflet-routing-openroute.min.js",
  "libs/pdf/jspdf.umd.min.js",
  "libs/canva/html2canvas.min.js",

  // WEBFONTS

  "libs/webfonts/fa-solid-900.woff2",
  "libs/webfonts/fa-solid-900.ttf",

  // MARKERS

  "libs/markers/marker-icon-blue.png",
  "libs/markers/marker-icon-green.png",
  "libs/markers/marker-icon-red.png",
  "libs/markers/marker-icon-black.png",
  "libs/markers/marker-icon-gold.png",
  "libs/markers/marker-icon-grey.png",
  "libs/markers/marker-icon-orange.png",
  "libs/markers/marker-icon-violet.png",
  "libs/markers/marker-icon-yellow.png",
  "libs/markers/marker-shadow.png",

  // Images métro
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
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const file of FILES_TO_CACHE) {
        try {
          await cache.add(file);
          console.log("✅ Ajouté au cache :", file);
        } catch (error) {
          console.error("❌ Erreur de mise en cache :", file, error);
        }
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request).catch(() => {
        // Fallbacks personnalisés
        switch (event.request.destination) {
          case "document":
            return caches.match("index.html");
          case "image":
            return caches.match("icons/user-position.png"); // ou "icons/user-position.png"
          case "script":
          case "style":
            console.warn("⛔ Fichier non trouvé hors ligne :", event.request.url);
            return new Response("<h1>Hors ligne</h1>", {
              status: 503,
              statusText: "Offline",
              headers: { "Content-Type": "text/html" }
            });
          default:
            return new Response("", { status: 503, statusText: "Offline" });
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
            console.log("🗑️ Suppression ancien cache :", key);
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});
