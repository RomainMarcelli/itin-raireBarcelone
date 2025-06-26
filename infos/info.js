document.addEventListener("DOMContentLoaded", function () {
  // === Connexion désactivée temporairement pour dev ===
  /*
  const LOGIN = "Julie";
  const PASS = "test";
  const form = document.getElementById('login-form');
  const errorDiv = document.getElementById('login-error');
  const modal = document.getElementById('login-modal');
  const mainContent = document.querySelector('.media-wrapper');
  const loginBack = document.querySelector('.login-back');

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const user = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value.trim();

    if (user === LOGIN && pass === PASS) {
      modal.style.display = 'none';
      mainContent.style.display = 'block';
      loginBack.style.display = 'none';
    } else {
      errorDiv.style.display = 'block';
      setTimeout(() => errorDiv.style.display = 'none', 2400);
    }
  });

  document.getElementById('username').focus();
  */

  // === Variables pour la visionneuse et le zoom ===
  const modalViewer = document.getElementById("imageModal");
  const modalImg = document.getElementById("fullImage");
  const downloadBtn = document.getElementById("downloadImg");
  const closeBtn = document.querySelector(".close");
  const sliderImages = document.querySelectorAll(".slider-image");

  let zoomLevel = 0;

  // Fonction pour appliquer le niveau de zoom
  function applyZoom() {
    modalImg.classList.remove("zoom-0", "zoom-1", "zoom-2");
    modalImg.classList.add(`zoom-${zoomLevel}`);
  }

  // Gestion du clic sur les images (visionneuse)
  sliderImages.forEach(img => {
    img.addEventListener("click", () => {
      const src = img.dataset.full;
      modalImg.src = src;
      downloadBtn.href = src;
      modalViewer.style.display = "flex";
      zoomLevel = 0;
      applyZoom();
    });
  });

  // Fermeture de la modale
  closeBtn.addEventListener("click", () => {
    modalViewer.style.display = "none";
  });

  window.addEventListener("click", (e) => {
    if (e.target === modalViewer) {
      modalViewer.style.display = "none";
    }
  });

  // Zoom tactile au clic sur l'image
  modalImg.addEventListener("click", () => {
    zoomLevel = (zoomLevel + 1) % 3;
    applyZoom();
  });

  // === Slider gauche/droite ===
  const slider = document.querySelector(".slider");
  const leftBtn = document.querySelector(".slider-btn.left");
  const rightBtn = document.querySelector(".slider-btn.right");
  let currentIndex = 0;

  function updateSlider() {
    slider.style.transform = `translateX(-${currentIndex * 100}%)`;
  }

  leftBtn.addEventListener("click", () => {
    currentIndex = (currentIndex - 1 + sliderImages.length) % sliderImages.length;
    updateSlider();
  });

  rightBtn.addEventListener("click", () => {
    currentIndex = (currentIndex + 1) % sliderImages.length;
    updateSlider();
  });

  // === Toggle infos transport / bateau avec ouverture/fermeture ===
  document.querySelectorAll('.toggle-btn').forEach(button => {
    button.addEventListener('click', () => {
      const target = button.getAttribute('data-target');
      const targetSection = document.querySelector(`.${target}-info`);
      const isVisible = targetSection.style.display === 'block';

      // Masquer toutes les sections
      document.querySelector('.transport-info').style.display = 'none';
      document.querySelector('.bateau-info').style.display = 'none';

      // Retirer l'état actif de tous les boutons
      document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));

      if (!isVisible) {
        targetSection.style.display = 'block';
        button.classList.add('active');
      }
    });
  });
});
