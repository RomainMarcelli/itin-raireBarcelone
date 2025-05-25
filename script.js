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
let allMetroStations = [];


fetch('trajet.json')
    .then(res => res.json())
    .then(data => {
        localRoutes = data.routes;
    });


fetch('metro_stations.geojson')
    .then(res => res.json())
    .then(data => {
        allMetroStations = data.features;
        loadBarceloneData(); // on charge les lieux seulement après avoir les métros
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

function distanceMeters(coord1, coord2) {
    const R = 6371e3; // rayon Terre en m
    const toRad = x => x * Math.PI / 180;

    const lat1 = coord1[0], lon1 = coord1[1];
    const lat2 = coord2[0], lon2 = coord2[1];

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Fonction utilitaire pour obtenir un rond coloré
function getLineDot(line) {
    const color = lineColors[line] || "#999";
    return `<span style="color:${color}; font-size: 16px;">●</span>`;
}

function getLineDotHTML(station) {
    const color = lineColors[station.line] || "#999";
    return `
        <span 
            class="metro-dot"
            style="display: inline-block; margin-right: 8px; margin-bottom: 6px; cursor: pointer;"
            onclick="focusMetroStation('${station.name.replace(/'/g, "\\'")}')"
            title="Voir ${station.name}">
            <span style="color:${color}; font-size: 16px;">●</span>
            <span style="margin-left: 4px;">${station.name} (L${station.line})</span>
        </span>`;
}


function loadBarceloneData() {
    fetch('barcelone.geojson')
        .then(res => res.json())
        .then(data => {
            const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');

            data.features.forEach(feature => {
                const name = feature.properties.name;
                const desc = feature.properties.description;
                const cat = feature.properties.category || "autre";
                const coords = [feature.geometry.coordinates[1], feature.geometry.coordinates[0]];

                const distances = allMetroStations.map(st => {
                    const metroCoords = [st.geometry.coordinates[1], st.geometry.coordinates[0]];
                    return {
                        name: st.properties.name,
                        line: st.properties.line,
                        distance: distanceMeters(coords, metroCoords)
                    };
                });

                const nearbyStations = distances.filter(st => st.distance <= 500);
                nearbyStations.sort((a, b) => a.distance - b.distance);

                let metroInfo = '';
                if (nearbyStations.length > 0) {
                    const maxVisible = 3;
                    const visibleStations = nearbyStations.slice(0, maxVisible);
                    const hiddenStations = nearbyStations.slice(maxVisible);

                    metroInfo = `
                        <div style="margin-top: 6px;">
                            <strong>🚇 À proximité :</strong><br>
                            ${visibleStations.map(st => `
                                ${getLineDot(st.line)} 
                                <a href="#" onclick="focusMetroStation('${st.name.replace(/'/g, "\\'")}'); return false;" 
                                   style="color: #666; text-decoration: none;">
                                    ${st.name}
                                </a> (L${st.line}) – ${Math.round(st.distance)} m
                            `).join('<br>')}
                           ${hiddenStations.length > 0 ? `
                                <a href="#" onclick="
                                    event.preventDefault(); 
                                    event.stopPropagation(); 
                                    this.style.display='none'; 
                                    const extra = this.nextElementSibling; 
                                    extra.style.display='inline'; 
                                    extra.nextElementSibling.style.display='inline';
                                " 
                                style="font-size: 13px; color: #666; text-decoration: underline;">
                                    Voir plus...
                                </a>

                                <span style="display:none;">
                                    <br>${hiddenStations.map(st => `
                                        ${getLineDot(st.line)} 
                                        <a href="#" onclick="event.preventDefault(); event.stopPropagation(); focusMetroStation('${st.name.replace(/'/g, "\\'")}'); return false;" 
                                        style="color: #666; text-decoration: none;">
                                            ${st.name}
                                        </a> (L${st.line}) – ${Math.round(st.distance)} m
                                    `).join('<br>')}
                                </span>

                                <a href="#" onclick="
                                    event.preventDefault(); 
                                    event.stopPropagation(); 
                                    const moreLink = this.previousElementSibling.previousElementSibling; 
                                    this.previousElementSibling.style.display='none'; 
                                    this.style.display='none'; 
                                    moreLink.style.display='inline';
                                " 
                                style="display:none; font-size: 13px; color: #666; text-decoration: underline;">
                                    Réduire
                                </a>
                            ` : ''}
                        </div>`;
                } else {
                    const closest = distances.reduce((a, b) => a.distance < b.distance ? a : b);
                    metroInfo = `
                        <div style="margin-top: 6px;">
                            <strong>🚇 Station la plus proche :</strong><br>
                            ${getLineDot(closest.line)} 
                            <a href="#" onclick="focusMetroStation('${closest.name.replace(/'/g, "\\'")}'); return false;" 
                               style="color: #666; text-decoration: none;">
                                ${closest.name}
                            </a> (${closest.line}) – ${closest.distance < 1000
                            ? Math.round(closest.distance) + ' m'
                            : (closest.distance / 1000).toFixed(2) + ' km'
                        }
                        </div>`;
                }

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
                            ${feature.properties.hours ? `<div style="margin-top: 6px;">${feature.properties.hours}</div>` : ''}
                            ${feature.properties.best_time ? `<div style="margin-top: 6px;">${feature.properties.best_time}</div>` : ''}
                            ${metroInfo}
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
}


const metroIcon = L.icon({
    iconUrl: 'barcelonepng.png',
    iconSize: [20, 20],
    iconAnchor: [10, 20],
    popupAnchor: [0, -20]
});

const metroLines = []; // ← ici on stockera les polylines

// Définir les couleurs par ligne
const lineColors = {
    L1: "#DC241F",  // rouge
    L2: "#93278F",  // violet
    L3: "#00A550",  // vert
    L4: "#FFD400",  // jaune
    L5: "#0072BC",  // bleu
    L6: "#A05DA5",  // violet clair
    L7: "#935529",  // brun
    L8: "#EF7CBA",  // rose
    L9: "#F58220",  // orange
    L9N: "#F58220",  // même que L9
    L9S: "#F58220",  // même que L9
    L10: "#00AEEF",  // cyan
    L10N: "#00AEEF",  // même que L10
    L10S: "#00AEEF",  // même que L10
    L11: "#A8BD3A",  // vert olive
    L12: "#B4A7D6"   // lavande
};

fetch('metro_stations.geojson')
    .then(res => res.json())
    .then(data => {
        const lineGroups = {};                // coordonnées par ligne
        const stationLinesMap = {};           // lignes par station
        const isMetroChecked = document.querySelector('input.filter[value="metro"]').checked;

        // Première passe : préparer les données
        data.features.forEach(feature => {
            const name = feature.properties.name;
            const line = feature.properties.line;
            const coords = [feature.geometry.coordinates[1], feature.geometry.coordinates[0]];

            // Regrouper les lignes desservant une même station
            if (!stationLinesMap[name]) stationLinesMap[name] = new Set();
            stationLinesMap[name].add(line);

            // Regrouper les points pour tracer les lignes par couleur
            if (!lineGroups[line]) lineGroups[line] = [];
            lineGroups[line].push(coords);
        });

        // Deuxième passe : créer les marqueurs
        data.features.forEach(feature => {
            const name = feature.properties.name;
            const coords = [feature.geometry.coordinates[1], feature.geometry.coordinates[0]];
            const lines = Array.from(stationLinesMap[name]).sort();

            const marker = L.marker(coords, { icon: metroIcon });
            marker.bindPopup(`<strong>${name}</strong><br>🚇 Ligne${lines.length > 1 ? 's' : ''} ${lines.join(', ')}`);

            if (isMetroChecked) marker.addTo(map);

            if (!markersByCategory["metro"]) markersByCategory["metro"] = [];
            markersByCategory["metro"].push(marker);
        });

        // Tracer les lignes
        for (const line in lineGroups) {
            const coords = lineGroups[line];
            const polyline = L.polyline(coords, {
                color: lineColors[line] || "#999",
                weight: 3,
                opacity: 0.6,
                smoothFactor: 1
            });

            if (isMetroChecked) polyline.addTo(map);

            metroLines.push(polyline);
        }
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

function updateFavoritesList() {
    const list = document.getElementById('favorites-list');
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    list.innerHTML = '';

    favorites.forEach(name => {
        const li = document.createElement('li');
        li.style.display = 'flex';
        li.style.alignItems = 'center';
        li.style.marginBottom = '6px';

        const star = document.createElement('span');
        star.textContent = '★';
        star.className = 'favorite-star active';
        star.style.cursor = 'pointer';
        star.style.fontSize = '22px'; // 👈 Augmente la taille ici
        star.style.marginRight = '2px';
        star.title = 'Supprimer des favoris';
        star.onclick = () => {
            removeFromFavorites(name);
            updatePopupStars();
        };


        const nameSpan = document.createElement('span');
        nameSpan.textContent = name;
        nameSpan.style.cursor = 'pointer';
        nameSpan.style.marginLeft = '6px';
        nameSpan.style.fontWeight = 'bold';       // ✅ Gras
        nameSpan.style.fontSize = '15px';         // ✅ Taille augmentée
        nameSpan.title = 'Afficher sur la carte';
        nameSpan.onclick = () => {
            const marker = findMarkerByName(name);
            if (marker) {
                marker.openPopup();
                map.setView(marker.getLatLng(), 16);
            }
        };

        li.appendChild(star);
        li.appendChild(nameSpan);
        list.appendChild(li);
    });
}


function removeFromFavorites(name) {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    const index = favorites.indexOf(name);
    if (index !== -1) {
        favorites.splice(index, 1);
        localStorage.setItem('favorites', JSON.stringify(favorites));
        updateFavoritesList();
    }
}

function findMarkerByName(name) {
    for (const category in markersByCategory) {
        const marker = markersByCategory[category].find(m => {
            const popup = m.getPopup();
            return popup && popup.getContent().includes(name);
        });
        if (marker) return marker;
    }
    return null;
}


function updatePopupStars() {
    document.querySelectorAll('.leaflet-popup-content .favorite-star').forEach(star => {
        const name = star.nextElementSibling?.textContent?.trim();
        if (name && isFavorite(name)) {
            star.textContent = '★';
            star.classList.add('active');
        } else {
            star.textContent = '☆';
            star.classList.remove('active');
        }
    });
}



function getAvailableOptions() {
    const all = Object.keys(points);
    const selected = new Set([startSelect.value, endSelect.value, ...stepSelects.map(sel => sel.value)]);
    return all.filter(name => !selected.has(name));
}


function replaceEndWithStep() {
    const oldEnd = endSelect.value;

    if (!oldEnd) {
        alert("Veuillez d'abord sélectionner une destination.");
        return;
    }

    const availableOptions = getAvailableOptions().filter(name => name !== oldEnd);
    if (availableOptions.length === 0) {
        alert("Plus de lieux disponibles.");
        return;
    }

    // 🟨 Étape 1 : ancienne destination (modifiable)
    const wrapper = document.createElement('div');
    wrapper.className = 'step-wrapper';

    const label = document.createElement('label');
    label.className = 'step-label';
    label.textContent = `Étape ${stepSelects.length + 1} :`;

    const select = document.createElement('select');
    select.className = 'step-select';

    // On met l'ancienne destination en premier
    select.appendChild(new Option(oldEnd, oldEnd));

    // On ajoute les autres options possibles
    availableOptions.forEach(name => {
        if (name !== oldEnd) select.appendChild(new Option(name, name));
    });

    const removeBtn = document.createElement('span');
    removeBtn.textContent = '✖';
    removeBtn.title = 'Supprimer';
    removeBtn.className = 'remove-step';
    removeBtn.onclick = () => {
        stepsContainer.removeChild(wrapper);
        const i = stepSelects.indexOf(select);
        if (i !== -1) stepSelects.splice(i, 1);
        relabelSteps();
    };

    wrapper.appendChild(label);
    wrapper.appendChild(select);
    wrapper.appendChild(removeBtn);
    stepsContainer.appendChild(wrapper);
    stepSelects.push(select);

    // 🟥 Mettre à jour le champ de destination finale (#end)
    const endWrapper = document.getElementById('end-wrapper');
    const newLabel = endWrapper.querySelector('label');
    newLabel.textContent = 'Destination :';

    endSelect.innerHTML = '';
    availableOptions.forEach(name => {
        const opt = new Option(name, name);
        endSelect.appendChild(opt);
    });

    endSelect.value = endSelect.options[0].value;

    const row = document.createElement('div');
    row.className = 'select-row';

    row.appendChild(select);
    row.appendChild(removeBtn);
    wrapper.appendChild(label);
    wrapper.appendChild(row);

    updateStartOptions();
    updateEndOptions();
    relabelSteps();
}

function relabelSteps() {
    const labels = stepsContainer.querySelectorAll('.step-label');
    labels.forEach((label, index) => {
        label.textContent = `Étape ${index + 1} :`;
    });
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

    // 🟦 Spécifique au mobile
    if (window.innerWidth <= 768) {
        setTimeout(() => {
            const routingPanel = document.querySelector('.leaflet-routing-container');
            const contentContainer = document.getElementById('mobile-routing-content');

            if (routingPanel && contentContainer) {
                contentContainer.innerHTML = routingPanel.innerHTML; // Recopie le contenu
                routingPanel.style.display = 'none'; // Cache le vrai panneau

                // Affiche le drawer mobile
                document.getElementById('controls').style.display = 'none';
                document.getElementById('mobile-routing-wrapper').classList.remove('collapsed');
                document.getElementById('drawer').classList.remove('collapsed');
            }
        }, 500); // attend que Leaflet ait rendu le panneau
    }
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

    if (window.innerWidth <= 768) {
        document.getElementById('controls').style.display = 'block';

        const routingWrapper = document.getElementById('mobile-routing-wrapper');
        if (routingWrapper) {
            routingWrapper.remove(); // ou routingWrapper.classList.add('collapsed') si tu veux le garder
        }
    }
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

        // 🔽 AJOUT pour gérer les lignes de métro
        if (cat === "metro") {
            metroLines.forEach(line => {
                isChecked ? line.addTo(map) : map.removeLayer(line);
            });
        }
    });
});

function changeBaseMap(style) {
    Object.values(tileLayers).forEach(layer => map.removeLayer(layer));
    tileLayers[style].addTo(map);
}

const toggleButton = document.getElementById('toggle-filters');
let filtersEnabled = true; // état initial : tous cochés

toggleButton.addEventListener('click', () => {
    filtersEnabled = !filtersEnabled;

    document.querySelectorAll('.filter').forEach(checkbox => {
        checkbox.checked = filtersEnabled;
        checkbox.dispatchEvent(new Event('change')); // déclenche le comportement normal
    });

    toggleButton.textContent = filtersEnabled ? "Tout désélectionner" : "Tout sélectionner";
});



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

(function makeDraggable() {
    const panel = document.getElementById('controls');
    const handle = document.getElementById('drag-handle');
    let offsetX = 0, offsetY = 0, isDragging = false;

    handle.addEventListener('mousedown', (e) => {
        isDragging = true;
        offsetX = e.clientX - panel.offsetLeft;
        offsetY = e.clientY - panel.offsetTop;
        panel.style.transition = 'none'; // désactive transition pendant le drag
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        panel.style.left = `${e.clientX - offsetX}px`;
        panel.style.top = `${e.clientY - offsetY}px`;
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
    });
})();


function focusMetroStation(stationName) {
    for (const marker of (markersByCategory["metro"] || [])) {
        const content = marker.getPopup()?.getContent();
        if (content && content.includes(stationName)) {
            marker.openPopup();
            map.setView(marker.getLatLng(), 16);
            break;
        }
    }
}


const searchInput = document.getElementById('search-input');
const suggestionList = document.getElementById('search-suggestions');
const clearBtn = document.getElementById('clear-search');

let currentSuggestionIndex = -1;
let currentMatches = [];

searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase().trim();
    suggestionList.innerHTML = '';
    clearBtn.style.display = query ? 'inline' : 'none';
    currentSuggestionIndex = -1;
    currentMatches = [];

    // ✅ Si vide → recentrer la carte à la position initiale
    if (!query) {
        setTimeout(() => {
            // Vérifie que la map est bien initialisée et que des marqueurs existent
            if (Object.keys(points).length > 0) {
                map.setView([41.3851, 2.1734], 13);
            }
        }, 0); // Exécute après l’event courant
        return;
    }


    currentMatches = Object.keys(points).filter(name =>
        name.toLowerCase().includes(query)
    );

    currentMatches.slice(0, 10).forEach((name, index) => {
        const li = document.createElement('li');
        li.textContent = name;
        li.setAttribute('data-index', index);
        li.onclick = () => selectSuggestion(index);
        suggestionList.appendChild(li);
    });
});

searchInput.addEventListener('keydown', (e) => {
    const items = suggestionList.querySelectorAll('li');

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (currentSuggestionIndex < items.length - 1) {
            currentSuggestionIndex++;
            highlightSuggestion(items);
        }
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (currentSuggestionIndex > 0) {
            currentSuggestionIndex--;
            highlightSuggestion(items);
        }
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (currentSuggestionIndex >= 0) {
            selectSuggestion(currentSuggestionIndex);
        } else if (currentMatches.length > 0) {
            selectSuggestion(0); // Sélectionne automatiquement le 1er résultat
        }
    }
});

function highlightSuggestion(items) {
    items.forEach(item => item.classList.remove('highlighted'));

    if (currentSuggestionIndex >= 0 && items[currentSuggestionIndex]) {
        const li = items[currentSuggestionIndex];
        li.classList.add('highlighted');
        searchInput.value = li.textContent;

        // ✅ Scroll dans la suggestion visible
        const containerTop = suggestionList.scrollTop;
        const containerBottom = containerTop + suggestionList.clientHeight;
        const itemTop = li.offsetTop;
        const itemBottom = itemTop + li.offsetHeight;

        if (itemBottom > containerBottom) {
            suggestionList.scrollTop = itemBottom - suggestionList.clientHeight;
        } else if (itemTop < containerTop) {
            suggestionList.scrollTop = itemTop;
        }
    }
}


function selectSuggestion(index) {
    const name = currentMatches[index];
    const marker = findMarkerByName(name);
    if (marker) {
        map.setView(marker.getLatLng(), 16);
        marker.openPopup();
        searchInput.value = name;
        suggestionList.innerHTML = '';
        clearBtn.style.display = 'inline';
    }
}

clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    suggestionList.innerHTML = '';
    clearBtn.style.display = 'none';
    currentSuggestionIndex = -1;
    searchInput.focus();

    map.setView([41.3851, 2.1734], 13); // vue de base
    map.closePopup(); // ferme toute popup ouverte

    // Rétablir tous les filtres cochés sauf métro (stations masquées)
    document.querySelectorAll('.filter').forEach(cb => {
        if (cb.value === "metro") {
            cb.checked = false;
        } else {
            cb.checked = true;
        }
        cb.dispatchEvent(new Event('change'));
    });

    updateStartOptions();
    updateEndOptions();
});


document.addEventListener('click', (e) => {
    if (!document.getElementById('search-container').contains(e.target)) {
        suggestionList.innerHTML = '';
    }
});


document.getElementById('recenter-btn').addEventListener('click', () => {
    map.setView([41.3851, 2.1734], 13);
    map.closePopup();
});


// Drawer mobile toggle
const drawer = document.getElementById('drawer');
const handle = document.getElementById('drawer-handle');

handle.addEventListener('click', () => {
    drawer.classList.toggle('collapsed');
});

// 👉 Fermer le drawer si clic en dehors (mobile uniquement)
document.addEventListener('click', (e) => {
    const isMobile = window.innerWidth <= 768;
    const clickedInsideDrawer = drawer.contains(e.target);
    const clickedHandle = handle.contains(e.target);

    if (isMobile && !clickedInsideDrawer && !clickedHandle && !drawer.classList.contains('collapsed')) {
        drawer.classList.add('collapsed');
    }
});

// 🧹 Supprimer ancien handle sur mobile
if (window.innerWidth <= 768) {
    const oldHandle = document.getElementById('drag-handle');
    if (oldHandle) oldHandle.remove();
}
