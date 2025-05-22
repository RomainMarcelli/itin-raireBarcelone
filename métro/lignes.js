// ----------- 🖼️ Plein écran pour les images ----------- //
const previewMap = document.querySelector('#metro-thumbnail');
const fullscreen = document.getElementById('fullscreen-map');
const fullscreenImg = fullscreen.querySelector('img');
const closeBtn = document.getElementById('close-fullscreen');

previewMap.addEventListener('click', () => {
    fullscreenImg.src = previewMap.src;
    fullscreen.style.display = 'flex';
});

document.querySelectorAll('.metro-line-img img').forEach(img => {
    img.addEventListener('click', () => {
        fullscreenImg.src = img.src;
        fullscreen.style.display = 'flex';
    });
});

closeBtn.addEventListener('click', () => {
    fullscreen.style.display = 'none';
});

fullscreen.addEventListener('click', (e) => {
    if (e.target === fullscreen) fullscreen.style.display = 'none';
});


// ----------- 🔍 Barre de recherche + suggestions ----------- //
const searchInput = document.getElementById('search-input');
const suggestionList = document.getElementById('search-suggestions');
const lineImages = document.querySelectorAll('.metro-line-img');
const clearBtn = document.createElement('span');

clearBtn.id = 'clear-search';
clearBtn.textContent = '✖';
searchInput.parentElement.appendChild(clearBtn);

let stationToLine = {};
let currentSuggestionIndex = -1;
let currentMatches = [];


// Charger les stations depuis le GeoJSON
fetch('../metro_stations.geojson')
    .then(res => res.json())
    .then(data => {
        data.features.forEach(feature => {
            const name = feature.properties.name.toUpperCase();
            const line = feature.properties.line.toUpperCase();

            if (!stationToLine[name]) stationToLine[name] = new Set();
            stationToLine[name].add(line);
        });

        // Convertir les Set en Array
        Object.keys(stationToLine).forEach(name => {
            stationToLine[name] = Array.from(stationToLine[name]);
        });
    });

searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim().toUpperCase();
    suggestionList.innerHTML = '';
    clearBtn.style.display = query ? 'inline' : 'none';
    currentSuggestionIndex = -1;
    currentMatches = [];

    if (!query) {
        showAllLines();
        return;
    }

    const stationMatches = Object.keys(stationToLine).filter(name => name.includes(query));
    const lineMatches = Array.from(lineImages)
        .map(div => div.dataset.line.toUpperCase())
        .filter(line => line.includes(query));

    const matches = [...new Set([...stationMatches, ...lineMatches])];
    currentMatches = matches.slice(0, 8);

    currentMatches.forEach((text, index) => {
        const li = document.createElement('li');
        const lineInfo = stationToLine[text]?.length ? ` (${stationToLine[text].join(', ')})` : '';
        li.textContent = text + lineInfo;
        li.setAttribute('data-index', index);

        li.onclick = () => {
            selectSuggestion(index);
        };

        suggestionList.appendChild(li);
    });

    filterLines(query);
});

searchInput.addEventListener('keydown', (e) => {
    const items = suggestionList.querySelectorAll('li');
    if (!items.length) return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        currentSuggestionIndex = (currentSuggestionIndex + 1) % items.length;
        highlightSuggestion(items);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        currentSuggestionIndex = (currentSuggestionIndex - 1 + items.length) % items.length;
        highlightSuggestion(items);
    } else if (e.key === 'Enter') {
        if (currentSuggestionIndex >= 0) {
            e.preventDefault();
            selectSuggestion(currentSuggestionIndex);
        }
    }
});


function filterLines(query) {
    const upper = query.toUpperCase();

    if (stationToLine[upper]) {
        const lines = stationToLine[upper].map(l => l.toUpperCase());
        lineImages.forEach(div => {
            const line = div.dataset.line.toUpperCase();
            div.style.display = lines.includes(line) ? 'block' : 'none';
        });
    } else {
        lineImages.forEach(div => {
            const line = div.dataset.line.toUpperCase();
            div.style.display = line.includes(upper) ? 'block' : 'none';
        });
    }
}

function showAllLines() {
    lineImages.forEach(div => div.style.display = 'block');
}

// ✖ Effacer la recherche
clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    suggestionList.innerHTML = '';
    clearBtn.style.display = 'none';
    showAllLines();
    searchInput.focus();
});

// Cacher les suggestions si clic en dehors
document.addEventListener('click', (e) => {
    if (!document.getElementById('search-container').contains(e.target)) {
        suggestionList.innerHTML = '';
    }
});


const downloadBtn = document.getElementById('download-image');

downloadBtn.addEventListener('click', () => {
    const url = fullscreenImg.src;
    const filename = url.split('/').pop().split('?')[0] || 'metro.png';

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});


function highlightSuggestion(items) {
    items.forEach(item => item.classList.remove('highlighted'));
    const li = items[currentSuggestionIndex];
    if (li) {
        li.classList.add('highlighted');
        searchInput.value = li.textContent.split(' (')[0]; // sans les lignes
        li.scrollIntoView({ block: 'nearest' });
    }
}

function selectSuggestion(index) {
    const text = currentMatches[index];
    if (!text) return;
    searchInput.value = text;
    suggestionList.innerHTML = '';
    clearBtn.style.display = 'inline';
    filterLines(text);
}
