const map = L.map('map').setView([41.3851, 2.1734], 13);

// Fonds de carte
const tileLayers = {
    light: L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap & Carto',
        subdomains: 'abcd',
        maxZoom: 19
    }),
    satellite: L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: 'Données © Google Maps'
    })
};

tileLayers.light.addTo(map);

// Variables
let routeLine = null;
let localRoutes = [];
const startSelect = document.getElementById('start');
const endSelect = document.getElementById('end');
const stepsContainer = document.getElementById('steps-holder');
const stepSelects = [];
const points = {};
const markersByCategory = {};

// Charger les données JSON de trajets
fetch('trajet.json')
    .then(res => res.json())
    .then(data => {
        localRoutes = data.routes;
    });

function getIcon(category) {
    const colors = {
        parc: "green",
        restaurant: "red",
        monument: "violet",
        bar: "orange",
        plage: "yellow",
        hotel: "blue"
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

fetch('barcelone.geojson')
    .then(res => res.json())
    .then(data => {
        data.features.forEach(feature => {
            const name = feature.properties.name;
            const desc = feature.properties.description;
            const cat = feature.properties.category || "autre";
            const coords = [feature.geometry.coordinates[1], feature.geometry.coordinates[0]];

            points[name] = coords;

            const optionStart = new Option(name, name);
            const optionEnd = new Option(name, name);

            startSelect.add(optionStart);
            endSelect.add(optionEnd);

            const marker = L.marker(coords, { icon: getIcon(cat) });
            marker.bindPopup(`<strong>${name}</strong><br>${desc}`);
            marker.addTo(map);

            if (!markersByCategory[cat]) markersByCategory[cat] = [];
            markersByCategory[cat].push(marker);
        });

        // Valeur par défaut
        startSelect.value = "Hotel SYSTELECOMS";
        updateEndOptions();
        updateStartOptions();
    });

function getAvailableOptions() {
    const all = Object.keys(points);
    const selected = new Set([startSelect.value, endSelect.value, ...stepSelects.map(sel => sel.value)]);
    return all.filter(name => !selected.has(name));
}

function addStepSelect() {
    const wrapper = document.createElement('div');
    wrapper.className = 'step-wrapper';

    const select = document.createElement('select');
    select.className = 'step-select';

    const options = getAvailableOptions();
    if (options.length === 0) {
        alert("Plus de lieux disponibles.");
        return;
    }

    options.forEach(name => select.appendChild(new Option(name, name)));

    const removeBtn = document.createElement('span');
    removeBtn.textContent = '✖';
    removeBtn.title = 'Supprimer';
    removeBtn.className = 'remove-step';
    removeBtn.onclick = () => {
        stepsContainer.removeChild(wrapper);
        const i = stepSelects.indexOf(select);
        if (i !== -1) stepSelects.splice(i, 1);
    };

    wrapper.appendChild(select);
    wrapper.appendChild(removeBtn);
    stepsContainer.appendChild(wrapper);
    stepSelects.push(select);
}

function calculateRoute() {
    const start = startSelect.value;
    const end = endSelect.value;
    const mode = document.getElementById('mode').value;

    if (!start || !end || start === end) {
        alert("Choisissez des lieux différents.");
        return;
    }

    // Supprimer ligne précédente
    if (routeLine) {
        map.removeLayer(routeLine);
        routeLine = null;
    }

    const infoBox = document.getElementById('route-info');

    // Recherche dans les trajets JSON
    const route = localRoutes.find(r =>
        (r.from === start && r.to === end) || (r.from === end && r.to === start)
    );
    if (!route) {
        infoBox.innerHTML = "Aucune donnée disponible pour ce trajet.";
        infoBox.style.display = 'block';
        return;
    }

    const data = mode === 'foot' ? route.walking : route.driving;

    infoBox.innerHTML = `
    <strong>Itinéraire ${mode === 'foot' ? 'à pied' : 'en voiture'}</strong><br>
    De <em>${start}</em> à <em>${end}</em><br>
    Distance : ${data.distance_km} km<br>
    Durée estimée : ${data.duration_min} minutes
`;

    infoBox.style.display = 'block';

    // Tracer la ligne simple
    const latlngs = [points[start], points[end]];
    routeLine = L.polyline(latlngs, { color: mode === 'foot' ? 'blue' : 'red' }).addTo(map);
    map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });
}

function resetRoute() {
    if (routeLine) {
        map.removeLayer(routeLine);
        routeLine = null;
    }
    startSelect.selectedIndex = 0;
    endSelect.selectedIndex = 0;
    stepsContainer.innerHTML = '';
    stepSelects.length = 0;
    updateStartOptions();
    updateEndOptions();
    document.getElementById('route-info').style.display = 'none';
}

function updateEndOptions() {
    const selectedStart = startSelect.value;
    Array.from(endSelect.options).forEach(opt => {
        opt.disabled = opt.value === selectedStart;
    });

    if (endSelect.value === selectedStart || endSelect.selectedIndex === -1 || endSelect.options[endSelect.selectedIndex].disabled) {
        for (let opt of endSelect.options) {
            if (!opt.disabled) {
                endSelect.value = opt.value;
                break;
            }
        }
    }
}

function updateStartOptions() {
    const selectedEnd = endSelect.value;
    Array.from(startSelect.options).forEach(opt => {
        opt.disabled = opt.value === selectedEnd;
    });

    if (startSelect.value === selectedEnd || startSelect.selectedIndex === -1 || startSelect.options[startSelect.selectedIndex].disabled) {
        for (let opt of startSelect.options) {
            if (!opt.disabled) {
                startSelect.value = opt.value;
                break;
            }
        }
    }
}

startSelect.addEventListener('change', updateEndOptions);
endSelect.addEventListener('change', updateStartOptions);

document.querySelectorAll('.filter').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
        const cat = checkbox.value;
        const isChecked = checkbox.checked;
        if (markersByCategory[cat]) {
            markersByCategory[cat].forEach(marker => {
                isChecked ? marker.addTo(map) : map.removeLayer(marker);
            });
        }
    });
});

function changeBaseMap(style) {
    Object.values(tileLayers).forEach(layer => map.removeLayer(layer));
    tileLayers[style].addTo(map);
}
