let currentOutsideClickListener = null;

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
    <div class="panel-controls-row">
      <button class="toggle-size-btn" id="toggle-panel-size" title="Agrandir ou réduire">
        <i class="fas fa-up-down"></i>
      </button>
      <div class="drag-bar"></div>
      <button class="close-cross" id="close-cross-btn" title="Fermer">
        <i class="fas fa-times"></i>
      </button>
    </div>
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
    const toggleBtn = document.getElementById('toggle-panel-size');

    toggleBtn.addEventListener('click', () => {
        if (panel.classList.contains('expanded')) {
            panel.classList.remove('expanded');
            toggleBtn.innerHTML = '<i class="fas fa-up-down"></i>';
        } else {
            panel.classList.add('expanded');
            toggleBtn.innerHTML = '<i class="fas fa-compress-alt"></i>';
        }
    });

    const closePanel = () => {
        panel.classList.remove('visible');
        panel.classList.remove('expanded');
        setTimeout(() => {
            panel.remove();
            if (window.routingControl) {
                map.removeControl(window.routingControl);
                window.routingControl = null;
            }
            const drawer = document.getElementById('drawer');
            const controls = document.getElementById('controls');
            if (drawer && controls) {
                controls.style.display = 'block';
                drawer.classList.add('collapsed');
            }
        }, 300);
    };

    const closeCrossBtn = document.getElementById('close-cross-btn');
    const closeRoutingBtn = document.getElementById('close-routing-btn');

    closeCrossBtn.addEventListener('click', () => {
        closeCrossBtn.style.animation = 'rotateBounce 0.5s ease';
        setTimeout(() => { closeCrossBtn.style.animation = ''; }, 500);
        closePanel();
    });
    closeRoutingBtn.addEventListener('click', closePanel);

    // Réouverture du panneau si replié
    panel.addEventListener('click', (e) => {
        if (
            e.target.closest('#close-cross-btn') ||
            e.target.closest('#close-routing-btn')
        ) return;

        if (panel.classList.contains('collapsed')) {
            panel.classList.remove('collapsed');
            panel.classList.add('visible');
            attachOutsideClickListener(panel); // ← Important ici
        }
    });

    if (isNew) {
        requestAnimationFrame(() => panel.classList.add('visible'));
    } else {
        panel.classList.remove('collapsed');
        panel.classList.add('visible');
    }

    // Drag pour replier ou agrandir
    let startY = 0, currentY = 0, isDragging = false;
    const dragBar = panel.querySelector('.drag-bar');

    const startDrag = (y) => {
        isDragging = true;
        startY = y;
        panel.style.transition = 'none';
    };

    const onMove = (y) => {
        if (!isDragging) return;
        currentY = y - startY;
        if (currentY > 0) panel.style.transform = `translateY(${currentY}px)`;
    };

    const endDrag = () => {
        if (!isDragging) return;
        isDragging = false;
        panel.style.transition = 'transform 0.4s ease';

        if (currentY > 100) {
            panel.classList.remove('visible');
            panel.classList.add('collapsed');
        } else if (currentY < -100) {
            panel.classList.remove('collapsed');
            panel.classList.add('visible');
            panel.classList.add('expanded');
            panel.style.transform = 'translateY(0)';
        } else {
            panel.style.transform = 'translateY(0)';
        }
    };

    dragBar.addEventListener('mousedown', e => startDrag(e.clientY));
    window.addEventListener('mousemove', e => onMove(e.clientY));
    window.addEventListener('mouseup', endDrag);

    dragBar.addEventListener('touchstart', e => startDrag(e.touches[0].clientY));
    window.addEventListener('touchmove', e => onMove(e.touches[0].clientY));
    window.addEventListener('touchend', endDrag);

    // 🔁 Gère l'écouteur pour replier au clic extérieur
    attachOutsideClickListener(panel);
}

// 🔁 Fonction à part pour pouvoir la rappeler à chaque fois
function attachOutsideClickListener(panel) {
    if (currentOutsideClickListener) {
        document.removeEventListener('click', currentOutsideClickListener);
    }

    currentOutsideClickListener = (e) => {
        if (!panel.contains(e.target)) {
            panel.classList.remove('visible');
            panel.classList.add('collapsed');
            document.removeEventListener('click', currentOutsideClickListener);
            currentOutsideClickListener = null;
        }
    };

    setTimeout(() => {
        document.addEventListener('click', currentOutsideClickListener);
    }, 200);
}

window.showMobileRoute = showMobileRoute;
