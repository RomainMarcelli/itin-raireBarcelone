const etapes = [
    "Hotel SYSTELCOMS", "Casa Batlló", "Casa Milà (La Pedrera)", "Sagrada Família",
    "Parc Güell", "Quartier Gràcia", "Casa Vicens",
    "Quartier Gothique (Barri Gòtic)", "Palais Güell", "La Boqueria", "Hotel SYSTELCOMS"
];

let lieuxCoords = {};
let map;
let trajetData = null;

// Création immédiate de la map AVANT tout fetch !
map = L.map('map', { zoomControl: false }).setView([41.3851, 2.17], 13);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap & Carto',
    subdomains: 'abcd', maxZoom: 19
}).addTo(map);

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
    // Pour zoomer sur le parcours entier
    const bounds = [];

    // Trace chaque segment avec une couleur unique
    for (let i = 0; i < etapes.length - 1; i++) {
        const from = etapes[i], to = etapes[i + 1];
        if (!lieuxCoords[from] || !lieuxCoords[to]) continue;

        // On ajoute les coordonnées de chaque étape au bounds
        bounds.push(lieuxCoords[from]);
        bounds.push(lieuxCoords[to]);

        L.polyline([lieuxCoords[from], lieuxCoords[to]], {
            color: lineColors[i % lineColors.length],
            weight: 3,
            opacity: 0.88
        }).addTo(map);
    }

    // On supprime les doublons dans bounds (optionnel)
    const uniqueBounds = Array.from(new Set(bounds.map(JSON.stringify)), JSON.parse);

    if (uniqueBounds.length > 0) {
        map.fitBounds(uniqueBounds, { padding: [18, 18] });
    }

    // b. TABLEAU DES ÉTAPES
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
        tableBody.innerHTML += `<tr>
            <td>${from} → ${to}</td>
            <td>${w.distance_km.toFixed(2)} km</td>
            <td>${formatDuration(w.duration_min)}</td>
        </tr>`;
    }
    document.getElementById('totWalkDist').textContent = totalWalkDist.toFixed(2) + " km";
    document.getElementById('totWalkTime').textContent = formatDuration(totalWalkTime);
}


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
    let html = "<h3>Parcours détaillé</h3><ul>";
    for (let i = 0; i < etapes.length - 1; i++) {
        const from = etapes[i];
        const to = etapes[i + 1];
        const segment = trajetData.find(r =>
            (r.from === from && r.to === to) || (r.from === to && r.to === from)
        );
        if (segment) {
            html += `<li><strong>${from} → ${to}</strong><br>
                🚶 ${segment.walking.distance_km} km, ${segment.walking.duration_min} min<br>
            </li>`;
        }
    }

    html += "</ul>";
    // ... après ton <ul>
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
    afficherEtapesDansPanel(etapes, trajetData);


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