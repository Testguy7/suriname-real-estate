/* ===============================
   GALLERY - CHANGE PHOTO
   =============================== */
function changePhoto(el) {
  const mainPhoto = document.getElementById("mainPhoto");

  if (!mainPhoto || !el) {
    console.error("Main photo element or thumbnail not found");
    return;
  }

  // Update main photo source
  mainPhoto.src = el.src;

  // Update alt text for accessibility
  const thumbnailAlt = el.getAttribute("alt") || "Property photo";
  mainPhoto.alt = thumbnailAlt;

  // Remove active class from all thumbnails
  const thumbnails = document.querySelectorAll(".thumbnail");
  thumbnails.forEach((thumbnail) => {
    thumbnail.classList.remove("active");
    thumbnail.setAttribute("aria-selected", "false");
  });

  // Add active class to clicked thumbnail
  el.classList.add("active");
  el.setAttribute("aria-selected", "true");
}

/* ===============================
   KEYBOARD NAVIGATION
   =============================== */
document.addEventListener("DOMContentLoaded", function () {
  const thumbnailRow = document.querySelector(".thumbnail-row");

  if (!thumbnailRow) return;

  const thumbnails = Array.from(document.querySelectorAll(".thumbnail"));

  thumbnails.forEach((thumbnail, index) => {
    // Arrow key navigation
    thumbnail.addEventListener("keydown", function (e) {
      let targetIndex = index;

      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          targetIndex = (index + 1) % thumbnails.length;
          break;
        case "ArrowLeft":
          e.preventDefault();
          targetIndex = (index - 1 + thumbnails.length) % thumbnails.length;
          break;
        case "Home":
          e.preventDefault();
          targetIndex = 0;
          break;
        case "End":
          e.preventDefault();
          targetIndex = thumbnails.length - 1;
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          changePhoto(thumbnail);
          return;
        default:
          return;
      }

      // Focus the target thumbnail
      thumbnails[targetIndex].focus();
    });
  });

  /* ===============================
     LIGHTBOX FEATURE (Optional)
     =============================== */
  const mainPhoto = document.getElementById("mainPhoto");

  if (mainPhoto) {
    mainPhoto.style.cursor = "zoom-in";

    mainPhoto.addEventListener("click", function () {
      openLightbox(this.src);
    });
  }
});

/* ===============================
   LIGHTBOX FUNCTIONALITY
   =============================== */
function openLightbox(imageSrc) {
  // Create lightbox overlay
  const lightbox = document.createElement("div");
  lightbox.id = "lightbox";
  lightbox.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    cursor: zoom-out;
  `;

  // Create image
  const img = document.createElement("img");
  img.src = imageSrc;
  img.style.cssText = `
    max-width: 90%;
    max-height: 90%;
    object-fit: contain;
    border-radius: 8px;
  `;
  img.alt = "Lightbox image";

  // Create close button
  const closeBtn = document.createElement("button");
  closeBtn.innerHTML = "&times;";
  closeBtn.style.cssText = `
    position: absolute;
    top: 20px;
    right: 30px;
    background: rgba(255, 255, 255, 0.9);
    border: none;
    font-size: 40px;
    color: #000;
    cursor: pointer;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s ease;
  `;
  closeBtn.setAttribute("aria-label", "Close lightbox");

  closeBtn.addEventListener("mouseenter", function () {
    this.style.background = "rgba(255, 255, 255, 1)";
  });

  closeBtn.addEventListener("mouseleave", function () {
    this.style.background = "rgba(255, 255, 255, 0.9)";
  });

  // Assemble lightbox
  lightbox.appendChild(img);
  lightbox.appendChild(closeBtn);
  document.body.appendChild(lightbox);

  // Prevent body scroll
  document.body.style.overflow = "hidden";

  // Close on click
  lightbox.addEventListener("click", function (e) {
    if (e.target === lightbox || e.target === closeBtn) {
      closeLightbox();
    }
  });

  // Close on Escape key
  document.addEventListener("keydown", handleEscapeKey);

  // Fade in animation
  requestAnimationFrame(() => {
    lightbox.style.opacity = "0";
    lightbox.style.transition = "opacity 0.3s ease";
    requestAnimationFrame(() => {
      lightbox.style.opacity = "1";
    });
  });
}

function closeLightbox() {
  const lightbox = document.getElementById("lightbox");

  if (!lightbox) return;

  // Fade out animation
  lightbox.style.opacity = "0";

  setTimeout(() => {
    if (lightbox.parentNode) {
      lightbox.parentNode.removeChild(lightbox);
    }
    document.body.style.overflow = "";
    document.removeEventListener("keydown", handleEscapeKey);
  }, 300);
}

function handleEscapeKey(e) {
  if (e.key === "Escape") {
    closeLightbox();
  }
}

/* ===============================
   TOUCH SWIPE SUPPORT (Mobile)
   =============================== */
document.addEventListener("DOMContentLoaded", function () {
  const mainPhoto = document.getElementById("mainPhoto");

  if (!mainPhoto) return;

  let touchStartX = 0;
  let touchEndX = 0;

  mainPhoto.addEventListener(
    "touchstart",
    function (e) {
      touchStartX = e.changedTouches[0].screenX;
    },
    { passive: true }
  );

  mainPhoto.addEventListener(
    "touchend",
    function (e) {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    },
    { passive: true }
  );

  function handleSwipe() {
    const swipeThreshold = 50;
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) < swipeThreshold) return;

    const thumbnails = Array.from(document.querySelectorAll(".thumbnail"));
    const activeThumbnail = document.querySelector(".thumbnail.active");

    if (!activeThumbnail || thumbnails.length === 0) return;

    const currentIndex = thumbnails.indexOf(activeThumbnail);

    if (diff > 0) {
      // Swipe left - next image
      const nextIndex = (currentIndex + 1) % thumbnails.length;
      changePhoto(thumbnails[nextIndex]);
    } else {
      // Swipe right - previous image
      const prevIndex =
        (currentIndex - 1 + thumbnails.length) % thumbnails.length;
      changePhoto(thumbnails[prevIndex]);
    }
  }
});

/* ===============================
   LAZY LOADING FOR THUMBNAILS
   =============================== */
document.addEventListener("DOMContentLoaded", function () {
  const thumbnails = document.querySelectorAll(".thumbnail[loading='lazy']");

  if ("IntersectionObserver" in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src || img.src;
          img.classList.add("loaded");
          observer.unobserve(img);
        }
      });
    });

    thumbnails.forEach((img) => {
      imageObserver.observe(img);
    });
  }
});
