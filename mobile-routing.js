function showMobileRoute(route, startLabel, stepLabels, endLabel, meta) {
    const steps = Array.isArray(stepLabels) ? stepLabels : [];
    const allLabels = [startLabel, ...steps, endLabel];
    const titleText = allLabels.join(' → ');
    const infoLine = `${meta.distance} km | ${meta.duration} | ${meta.mode}`;

    const instructions = route.instructions.map(step => `
        <div class="instruction-item">
            <div class="icon">📍</div>
            <div class="text">${step.text}</div>
        </div>
    `).join('');

    let panel = document.getElementById('routingWrapper');
    const isNew = !panel;

    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'routingWrapper';
        panel.className = 'mobile-routing-panel';
        document.body.appendChild(panel);
    }

    panel.innerHTML = `
        <div class="panel-header">
            <div class="drag-bar"></div>
            <button class="close-cross" id="close-cross-btn" title="Fermer">✖</button>
            <h3>Itinéraire : ${titleText}</h3>
            <p class="route-meta">${infoLine}</p>
        </div>
        <div class="instructions-list">
            ${instructions}
        </div>
        <div style="margin-top: 20px; text-align: center;">
            <button class="close-btn" id="close-routing-btn">Fermer</button>
        </div>
    `;

    panel.addEventListener('click', (e) => {
        // Ne pas réagir si on clique sur un bouton
        if (
            e.target.closest('#close-cross-btn') ||
            e.target.closest('#close-routing-btn')
        ) return;

        if (panel.classList.contains('collapsed')) {
            panel.classList.remove('collapsed');
            panel.classList.add('visible');
        }
    });

    if (isNew) {
        requestAnimationFrame(() => panel.classList.add('visible'));
    } else {
        panel.classList.remove('collapsed');
        panel.classList.add('visible');
    }

    const closePanel = () => {
        panel.classList.remove('visible');
        panel.classList.add('collapsed');
    };

    document.getElementById('close-cross-btn').addEventListener('click', closePanel);
    document.getElementById('close-routing-btn').addEventListener('click', closePanel);

    // Réouverture si on clique sur la drag-bar
    panel.querySelector('.drag-bar').addEventListener('click', (e) => {
        e.stopPropagation();
        if (panel.classList.contains('collapsed')) {
            panel.classList.remove('collapsed');
            panel.classList.add('visible');
        }
    });

    // Clic extérieur replie le panneau (pas suppression)
    setTimeout(() => {
        const outsideClickListener = (e) => {
            if (!panel.contains(e.target)) {
                panel.classList.remove('visible');
                panel.classList.add('collapsed');
                document.removeEventListener('click', outsideClickListener);
            }
        };
        document.addEventListener('click', outsideClickListener);
    }, 200);

    // Gestion du drag vers le bas pour replier
    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    const dragBar = panel.querySelector('.drag-bar');

    const startDrag = (y) => {
        isDragging = true;
        startY = y;
        panel.style.transition = 'none';
    };

    const onMove = (y) => {
        if (!isDragging) return;
        currentY = y - startY;
        if (currentY > 0) {
            panel.style.transform = `translateY(${currentY}px)`;
        }
    };

    const endDrag = () => {
        if (!isDragging) return;
        isDragging = false;
        panel.style.transition = 'transform 0.4s ease';

        if (currentY > 100) {
            // Glissé vers le bas → replié
            panel.classList.remove('visible');
            panel.classList.add('collapsed');
        } else if (currentY < -100) {
            // Glissé vers le haut → plein écran
            panel.classList.remove('collapsed');
            panel.classList.add('visible');
            panel.classList.add('expanded');
            panel.style.transform = 'translateY(0)';
        } else {
            // Annule le drag, revient à l’état actuel
            panel.style.transform = 'translateY(0)';
        }
    };

    // Événements souris
    dragBar.addEventListener('mousedown', e => startDrag(e.clientY));
    window.addEventListener('mousemove', e => onMove(e.clientY));
    window.addEventListener('mouseup', endDrag);

    // Événements tactiles
    dragBar.addEventListener('touchstart', e => startDrag(e.touches[0].clientY));
    window.addEventListener('touchmove', e => onMove(e.touches[0].clientY));
    window.addEventListener('touchend', endDrag);
}

window.showMobileRoute = showMobileRoute;
