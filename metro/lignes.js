/// ----------- 🖼️ Plein écran avec navigation ----------- //
const fullscreen = document.getElementById('fullscreen-map');
const fullscreenImg = fullscreen.querySelector('img');
const allImages = Array.from(document.querySelectorAll('#metro-images img'));
const closeBtn = document.getElementById('close-fullscreen');
const prevBtn = document.getElementById('prev-image');
const nextBtn = document.getElementById('next-image');
const downloadBtn = document.getElementById('download-image');

let currentIndex = -1;

// ▶️ Fonction pour ouvrir une image en plein écran
function openFullscreen(index) {
  if (index >= 0 && index < allImages.length) {
    fullscreen.style.display = 'flex';
    fullscreenImg.src = allImages[index].src;
    currentIndex = index;
  }
}

// ❌ Fermer le plein écran
function closeFullscreen() {
  fullscreen.style.display = 'none';
  fullscreenImg.src = '';
  currentIndex = -1;
}

// ◀️ Afficher l’image précédente
function showPrevious() {
  if (currentIndex > 0) {
    openFullscreen(currentIndex - 1);
  }
}

// ▶️ Afficher l’image suivante
function showNext() {
  if (currentIndex < allImages.length - 1) {
    openFullscreen(currentIndex + 1);
  }
}

// 💾 Télécharger l’image
function downloadCurrentImage() {
  if (fullscreenImg.src) {
    const link = document.createElement('a');
    link.href = fullscreenImg.src;
    link.download = 'ligne-metro-barcelone.png';
    link.click();
  }
}

// 🎯 Lier les événements
allImages.forEach((img, index) => {
  img.addEventListener('click', () => openFullscreen(index));
});

closeBtn?.addEventListener('click', closeFullscreen);
prevBtn?.addEventListener('click', showPrevious);
nextBtn?.addEventListener('click', showNext);
downloadBtn?.addEventListener('click', downloadCurrentImage);

// ⎋ Fermer avec la touche Échap
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeFullscreen();
  }
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

