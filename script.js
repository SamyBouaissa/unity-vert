// script.js
document.addEventListener('DOMContentLoaded', function() {
  const modal    = document.getElementById("modal");
  const modalImg = document.getElementById("modal-img");
  const images   = document.querySelectorAll(".gallery-img");
  const closeBtn = document.getElementsByClassName("close")[0];

  images.forEach(img => {
    img.addEventListener('click', function(e) {
      e.preventDefault();
      // ouvrir la lightbox
      modalImg.src = this.src;
      modal.classList.add('open');
      // désactiver le scroll du body
      document.body.style.overflow = 'hidden';
    });
  });

  function closeModal() {
    modal.classList.remove('open');
    // réactiver le scroll du body
    document.body.style.overflow = '';
  }

  // fermeture au clic sur la croix
  closeBtn.addEventListener('click', closeModal);

  // fermeture au clic en-dehors de l’image
  window.addEventListener('click', function(event) {
    if (event.target === modal) {
      closeModal();
    }
  });
});
