// script.js
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById("modal");
    const modalImg = document.getElementById("modal-img");
    const images = document.querySelectorAll(".gallery-img");
    const span = document.getElementsByClassName("close")[0];

    images.forEach(img => {
        img.onclick = function() {
            modal.style.display = "block";
            modalImg.src = this.src;
        }
    });

    span.onclick = function() { 
        modal.style.display = "none";
    }

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }
});
