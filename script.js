const map = L.map('map').setView([41.3851, 2.1734], 13);

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

let routingControl = null;
let localRoutes = [];
const startSelect = document.getElementById('start');
const endSelect = document.getElementById('end');
const stepsContainer = document.getElementById('steps-holder');
const stepSelects = [];
const points = {};
const markersByCategory = {};

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

            startSelect.add(new Option(name, name));
            endSelect.add(new Option(name, name));

            const marker = L.marker(coords, { icon: getIcon(cat) });
            marker.bindPopup(`
                <div>
                    <div style="display: flex; align-items: center; gap: 6px; font-weight: bold; font-size: 16px;">
                        <span class="favorite-star ${isFavorite(name) ? 'active' : ''}" 
                            onclick="toggleFavorite(this, '${name.replace(/'/g, "\\'")}')" 
                            style="font-size: 18px; cursor: pointer;">
                            ${isFavorite(name) ? '★' : '☆'}
                        </span>
                        <span>${name}</span>
                    </div>
                    <div style="margin-top: 4px; font-size: 14px; color: #444;">
                        ${desc}
                    </div>
                </div>
            `);
            marker.addTo(map);

            if (!markersByCategory[cat]) markersByCategory[cat] = [];
            markersByCategory[cat].push(marker);
        });

        startSelect.value = "Hotel SYSTELCOMS";
        updateEndOptions();
        updateStartOptions();
        updateFavoritesList();
    });

function isFavorite(name) {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    return favorites.includes(name);
}

function toggleFavorite(el, name) {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    const index = favorites.indexOf(name);
    if (index === -1) {
        favorites.push(name);
        el.textContent = '★';
        el.classList.add('active');
    } else {
        favorites.splice(index, 1);
        el.textContent = '☆';
        el.classList.remove('active');
    }
    localStorage.setItem('favorites', JSON.stringify(favorites));
    updateFavoritesList();
}


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

function formatDuration(mins) {
    if (mins < 60) return `${mins.toFixed(0)} min`;
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return `${h}h${m > 0 ? m : ''}`;
}

function calculateRoute() {
    const start = startSelect.value;
    const end = endSelect.value;
    const mode = document.getElementById('mode').value;

    if (!start || !end || start === end) {
        alert("Choisissez des lieux différents.");
        return;
    }

    if (routingControl) {
        map.removeControl(routingControl);
        routingControl = null;
    }

    const intermediate = stepSelects.map(sel => sel.value);
    const allStops = [start, ...intermediate, end];

    const profile = mode === 'foot' ? 'foot-walking' : 'driving-car';

    routingControl = L.Routing.control({
        waypoints: allStops.map(name => L.latLng(points[name])),
        routeWhileDragging: false,
        createMarker: () => null,
        show: true,
        language: 'fr',
        router: new L.Routing.OpenRouteService('5b3ce3597851110001cf6248c0ecdf3661ce4d9f857064f107bee80c', {
            profile: profile
        }),
        summaryTemplate: function () {
            let html = `<strong>Itinéraire ${mode === 'foot' ? 'à pied' : 'en voiture'}</strong><br><br>`;
            let totalDistance = 0;
            let totalDuration = 0;

            for (let i = 0; i < allStops.length - 1; i++) {
                const from = allStops[i];
                const to = allStops[i + 1];
                const seg = localRoutes.find(r => (r.from === from && r.to === to) || (r.from === to && r.to === from));
                if (seg) {
                    const data = mode === 'foot' ? seg.walking : seg.driving;
                    totalDistance += data.distance_km;
                    totalDuration += data.duration_min;
                    html += `<u>Étape ${i + 1}</u> : ${from} → ${to}<br>`;
                    html += `Distance : ${data.distance_km} km<br>`;
                    html += `Durée : ${formatDuration(data.duration_min)}<br><br>`;
                }
            }

            html += `<strong>Total</strong> : ${totalDistance.toFixed(2)} km, ${formatDuration(totalDuration)}`;
            return `<div style="margin-bottom: 10px;">${html}</div>`;
        }
    }).addTo(map);
}

function resetRoute() {
    if (routingControl) {
        map.removeControl(routingControl);
        routingControl = null;
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


function addToFavorites(name) {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    if (!favorites.includes(name)) {
        favorites.push(name);
        localStorage.setItem('favorites', JSON.stringify(favorites));
        updateFavoritesList();
        alert(`✅ "${name}" a été ajouté aux favoris.`);
    } else {
        alert(`"${name}" est déjà dans vos favoris.`);
    }
}

function updateFavoritesList() {
    const list = document.getElementById('favorites-list');
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    list.innerHTML = '';
    favorites.forEach(name => {
        const li = document.createElement('li');
        li.textContent = '⭐ ' + name;
        list.appendChild(li);
    });
}
