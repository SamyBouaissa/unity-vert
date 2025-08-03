// script.js
document.addEventListener('DOMContentLoaded', function() {
  const modal    = document.getElementById("modal");
  const modalImg = document.getElementById("modal-img");
  const images   = document.querySelectorAll(".gallery-img");
  const closeBtn = document.getElementsByClassName("close")[0];

  images.forEach(img => {
    img.addEventListener('click', function(e) {
      // ouvre la lightbox via la classe .open
      modalImg.src = this.src;
      modal.classList.add('open');
    });
  });

  // fermeture au clic sur la croix
  closeBtn.addEventListener('click', function() {
    modal.classList.remove('open');
  });

  // fermeture au clic en-dehors de l'image
  window.addEventListener('click', function(event) {
    if (event.target === modal) {
      modal.classList.remove('open');
    }
  });
});
