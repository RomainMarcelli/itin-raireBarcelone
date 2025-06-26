const etapes = [
    "Hotel SYSTELCOMS", "Casa Batlló", "Casa Milà (La Pedrera)", "Sagrada Família",
    "Parc Güell", "Quartier Gràcia", "Casa Vicens",
    "Quartier Gothique (Barri Gòtic)", "Palais Güell", "La Boqueria", "Hotel SYSTELCOMS"
];

let lieuxCoords = {};
let map;
window.routingControls = [];
let trajetData = null;

// Création immédiate de la map AVANT tout fetch !
map = L.map('map', { zoomControl: false }).setView([41.3851, 2.17], 13);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap & Carto',
    subdomains: 'abcd', maxZoom: 19
}).addTo(map);


const DEFAULT_CENTER = [41.3851, 2.17]; // Modifie si besoin
const DEFAULT_ZOOM = 13;

document.getElementById('recenter-btn').addEventListener('click', function () {
    map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
});



// Couleurs de marqueurs selon catégorie
function getIcon(category) {
    const colors = {
        parc: "green",
        restaurant: "red",
        monument: "violet",
        quartier: "orange",
        plage: "yellow",
        Maureen: "grey",
        hotel: "blue",
        special: "black"
    };
    const color = colors[category] || "gray";
    return L.icon({
        iconUrl: `https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-${color}.png`,
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });
}

// Palette de couleurs (autant de couleurs que de segments)
const lineColors = [
    "#0074D9", // bleu
    "#FF4136", // rouge
    "#2ECC40", // vert vif
    "#FF851B", // orange
    "#B10DC9", // violet
    "#FFDC00", // jaune
    "#39CCCC", // turquoise
    "#F012BE", // rose/magenta
    "#01FF70", // vert néon
    "#111111", // noir
    "#FF69B4", // rose vif (si besoin d’un 11ème)
];


// 1. Charger les coordonnées de chaque lieu (uniquement ceux des étapes)
fetch('barcelone.geojson')
    .then(res => res.json())
    .then(data => {
        data.features.forEach(feature => {
            const props = feature.properties;
            if (!etapes.includes(props.name)) return;
            const coords = [feature.geometry.coordinates[1], feature.geometry.coordinates[0]];
            lieuxCoords[props.name] = coords;

            const marker = L.marker(coords, { icon: getIcon(props.category) });
            let popupHtml = `<div style="font-size:1.1rem; font-weight:bold; margin-bottom:5px;">${props.name}</div>
                <div style="margin-bottom:6px;">${props.description || ""}</div>`;
            if (props.hours) popupHtml += `<div>${props.hours}</div>`;
            if (props.prix) popupHtml += `<div>💶 <strong>${props.prix}</strong></div>`;
            marker.bindPopup(popupHtml);
            marker.addTo(map);
        });
        checkReady();
    });

// 2. Charger les distances/temps de trajet
fetch('trajet.json')
    .then(res => res.json())
    .then(data => {
        trajetData = data.routes;
        checkReady();
    });

let readyCount = 0;
function checkReady() {
    readyCount++;
    if (readyCount < 2) return;
    afficherItineraire();
}

function afficherItineraire() {
    // Affichage panel + détails (sans tracer tout l'itinéraire sur la map)
    let totalWalkDist = 0, totalWalkTime = 0;
    const tableBody = document.querySelector('#stepsTable tbody');
    tableBody.innerHTML = "";

    for (let i = 0; i < etapes.length - 1; i++) {
        const from = etapes[i], to = etapes[i + 1];
        const segment = trajetData.find(r =>
            (r.from === from && r.to === to) || (r.from === to && r.to === from)
        );
        if (!segment) {
            tableBody.innerHTML += `<tr>
                <td>${from} → ${to}</td>
                <td colspan="3" style="color:#c00;">Données manquantes</td>
            </tr>`;
            continue;
        }
        const w = segment.walking;
        totalWalkDist += w.distance_km;
        totalWalkTime += w.duration_min;
        // Ajout d'une classe et dataset pour reconnaître la ligne
        tableBody.innerHTML += `<tr data-from="${from}" data-to="${to}" style="cursor:pointer">
         <td>${from} → ${to}</td>
         <td>${w.distance_km.toFixed(2)} km</td>
         <td>${formatDuration(w.duration_min)}</td>
        </tr>`;
    }
    document.getElementById('totWalkDist').textContent = totalWalkDist.toFixed(2) + " km";
    document.getElementById('totWalkTime').textContent = formatDuration(totalWalkTime);

    // Après remplissage du tableau, activer les clics
    document.querySelectorAll('#stepsTable tbody tr[data-from][data-to]').forEach((row, i) => {
        row.addEventListener('click', function () {
            const from = this.getAttribute('data-from');
            const to = this.getAttribute('data-to');
            const segmentId = `${from}_${to}`;

            if (!window.routingSegments) window.routingSegments = {};

            const isActive = this.classList.contains('active');

            if (isActive) {
                // Si déjà actif → on supprime
                if (window.routingSegments[segmentId]) {
                    map.removeControl(window.routingSegments[segmentId]);
                    delete window.routingSegments[segmentId];
                }
                this.classList.remove('active');
                // NE PAS fermer le panel dans ce cas
            } else {
                // Sinon → on ajoute le trajet
                afficherSegmentRouting(from, to, i, segmentId);

                // Griser la ligne
                this.classList.add('active');

                // Fermer le panel
                detailsPanel.classList.remove('expanded');
            }
        });
    });
}


function afficherSegmentRouting(from, to, colorIndex, segmentId) {
    if (!lieuxCoords[from] || !lieuxCoords[to]) return;

    const wp = [lieuxCoords[from], lieuxCoords[to]].map(c => L.latLng(c[0], c[1]));

    const control = L.Routing.control({
        waypoints: wp,
        lineOptions: {
            styles: [{ color: lineColors[colorIndex % lineColors.length], weight: 6, opacity: 0.88 }]
        },
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: true, // recentre la carte
        routeWhileDragging: false,
        show: false,
        createMarker: () => null
    }).addTo(map);

    if (!window.routingSegments) window.routingSegments = {};
    window.routingSegments[segmentId] = control;
}

document.getElementById('resetRoutesBtn').addEventListener('click', function () {
    // ❌ Supprime tous les contrôles de trajets encore affichés sur la carte
    if (window.routingSegments) {
        Object.values(window.routingSegments).forEach(control => {
            map.removeControl(control);
        });
        window.routingSegments = {};
    }

    // ❌ Réinitialise les lignes grises actives
    document.querySelectorAll('#stepsTable tbody tr.active').forEach(row => {
        row.classList.remove('active');
    });

    // ✅ Rouvre le panel (si tu le veux toujours ouvert après réinitialisation)
    detailsPanel.classList.add('expanded');
});



// Utilitaire : format XXhYY ou XX min
function formatDuration(mins) {
    mins = Math.round(mins);
    if (mins < 60) return mins + " min";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h + "h" + (m > 0 ? m : "");
}

// PANEL Responsive
const detailsPanel = document.getElementById('details-panel');
const togglePanelBtn = document.getElementById('toggle-panel');
togglePanelBtn.addEventListener('click', () => {
    detailsPanel.classList.toggle('expanded');
});

function afficherEtapesDansPanel(etapes, trajetData) {
    const panelContent = document.getElementById('panel-content');
    let html = `
        <table class="steps-table">
            <thead>
                <tr>
                    <th>Étape</th>
                    <th>Distance</th>
                    <th>Durée</th>
                </tr>
            </thead>
            <tbody>
    `;
    let totalWalkDist = 0, totalWalkTime = 0;

    for (let i = 0; i < etapes.length - 1; i++) {
        const from = etapes[i], to = etapes[i + 1];
        const segment = trajetData.find(r =>
            (r.from === from && r.to === to) || (r.from === to && r.to === from)
        );
        if (segment) {
            const w = segment.walking;
            totalWalkDist += w.distance_km;
            totalWalkTime += w.duration_min;
            html += `<tr>
                <td>${from} → ${to}</td>
                <td>${w.distance_km.toFixed(2)} km</td>
                <td>${formatDuration(w.duration_min)}</td>
            </tr>`;
        } else {
            html += `<tr>
                <td>${from} → ${to}</td>
                <td colspan="2" style="color:#c00;">Données manquantes</td>
            </tr>`;
        }
    }

    html += `
            </tbody>
            <tfoot>
                <tr style="font-weight:bold; background:#f0f6fc;">
                    <td>Total</td>
                    <td>${totalWalkDist.toFixed(2)} km</td>
                    <td>${formatDuration(totalWalkTime)}</td>
                </tr>
            </tfoot>
        </table>
    `;

    // Légende (optionnelle, si tu veux garder)
    html += `<div style="margin-top:18px; font-size: 0.97em; border-top:1px solid #eee; padding-top:8px;">
        <b>Légende des segments :</b>
        <ul style="margin-top: 10px; padding-left: 0; list-style: none;">`;

    for (let i = 0; i < etapes.length - 1; i++) {
        const from = etapes[i], to = etapes[i + 1];
        html += `<li style="display:flex;align-items:center;margin-bottom:5px;">
            <span style="display:inline-block;width:22px;height:5px;border-radius:3px;background:${lineColors[i % lineColors.length]};margin-right:8px;"></span>
            <span>${from} → ${to}</span>
        </li>`;
    }
    html += `</ul></div>`;

    panelContent.innerHTML = html;
}


// MENU SUR LE COTE 

const toggleBtn = document.getElementById('mobileToggle');
const menu = document.getElementById('mobileMenu');

toggleBtn.addEventListener('click', () => {
    menu.classList.toggle('active');

    toggleBtn.innerHTML = menu.classList.contains('active')
        ? '<i class="fas fa-chevron-right"></i>'
        : '<i class="fas fa-chevron-left"></i>';
});


// ME LOCALISER 
document.getElementById('locateBtn').addEventListener('click', function () {
    if (!navigator.geolocation) {
        alert("La géolocalisation n'est pas supportée par ce navigateur.");
        return;
    }
    navigator.geolocation.getCurrentPosition(function (pos) {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        map.setView([lat, lng], 16);

        if (window.locateMarker) map.removeLayer(window.locateMarker);
        window.locateMarker = L.marker([lat, lng], {
            icon: L.icon({
                iconUrl: '../icons/user-position.png',
                iconSize: [40, 40],
                iconAnchor: [16, 32],
                popupAnchor: [0, -32]
            })
        }).addTo(map).bindPopup("Vous êtes ici !").openPopup();

        // Ferme le menu mobile
        document.getElementById('mobileMenu').classList.remove('active');
        // Remet le bouton toggle dans son état normal (optionnel, si tu le fais ailleurs)
        const toggleBtn = document.getElementById('mobileToggle');
        if (toggleBtn) toggleBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    }, function () {
        alert("Impossible de récupérer votre position.");
    });
});


// Fermer le panel si on clique en dehors
document.addEventListener('click', function (e) {
    const panel = document.getElementById('details-panel');
    const toggleBtn = document.getElementById('toggle-panel');

    if (!panel.contains(e.target) && !toggleBtn.contains(e.target)) {
        panel.classList.remove('expanded');
    }
});
