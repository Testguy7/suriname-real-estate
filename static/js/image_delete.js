/* =====================================================
   VERWIJDER FOTO (AJAX)
   ===================================================== */
document.addEventListener("click", function (e) {
  const btn = e.target.closest(".delete-image-btn");
  if (!btn) return;

  // Prevent multiple simultaneous deletions
  if (btn.dataset.busy === "1") return;
  btn.dataset.busy = "1";

  const imageId = btn.dataset.imageId;

  if (!imageId) {
    console.error("No image ID found");
    btn.dataset.busy = "0";
    return;
  }

  if (!confirm("Weet je zeker dat je deze foto wilt verwijderen?")) {
    btn.dataset.busy = "0";
    return;
  }

  // Disable button visually
  btn.style.pointerEvents = "none";
  btn.style.opacity = "0.5";

  // Store original content
  const originalContent = btn.innerHTML;
  btn.innerHTML = "⏳";

  fetch(`/property/image/${imageId}/delete`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  })
    .then((res) => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then((data) => {
      if (!data.success) {
        throw new Error(data.error || "Unknown error");
      }

      // Find the image card wrapper
      const card = btn.closest(".edit-image-card");

      if (card) {
        // Fade out animation
        card.style.transition = "opacity 0.3s ease, transform 0.3s ease";
        card.style.opacity = "0";
        card.style.transform = "scale(0.8)";

        setTimeout(() => {
          card.remove();

          // Check if any images remain
          const remainingCards = document.querySelectorAll(".edit-image-card");
          if (remainingCards.length === 0) {
            const grid = document.getElementById("photoGrid");
            if (grid) {
              grid.innerHTML = `
                <div class="col-12 text-center text-muted py-4">
                  <p>Geen foto's meer. Upload nieuwe foto's via het formulier hierboven.</p>
                </div>
              `;
            }
          }

          // If a new primary was set, update the UI
          if (data.new_primary_id) {
            updatePrimaryBadge(data.new_primary_id);
          }
        }, 300);
      }
    })
    .catch((error) => {
      console.error("Delete error:", error);
      alert("Er ging iets mis bij het verwijderen. Probeer het opnieuw.");

      // Restore button
      btn.innerHTML = originalContent;
      btn.dataset.busy = "0";
      btn.style.pointerEvents = "auto";
      btn.style.opacity = "1";
    });
});

/* =====================================================
   MAAK HOOFDFOTO (AJAX)
   ===================================================== */
document.addEventListener("click", async function (e) {
  const btn = e.target.closest(".make-primary-btn");
  if (!btn) return;

  const imageId = btn.dataset.id;

  if (!imageId) {
    console.error("No image ID found on make-primary button");
    return;
  }

  // Prevent multiple clicks
  if (btn.disabled) return;

  btn.disabled = true;
  const originalText = btn.textContent;
  btn.textContent = "Bezig...";

  try {
    const res = await fetch(`/property/image/${imageId}/set-primary`, {
      method: "POST",
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data = await res.json();

    if (!data.success) {
      throw new Error(data.error || "Failed to set primary image");
    }

    // Update all badges and buttons
    updatePrimaryBadge(imageId);

    // Success feedback
    btn.textContent = "✓ Hoofdfoto";
    setTimeout(() => {
      btn.textContent = "Al hoofdfoto";
    }, 2000);
  } catch (error) {
    console.error("Set primary error:", error);
    alert("Hoofdfoto instellen mislukt. Probeer het opnieuw.");
    btn.textContent = originalText;
  } finally {
    btn.disabled = false;
  }
});

/* =====================================================
   UPDATE PRIMARY BADGE
   ===================================================== */
function updatePrimaryBadge(newPrimaryId) {
  // Remove all existing primary badges
  document.querySelectorAll("#photoGrid .badge.bg-success").forEach((badge) => {
    badge.remove();
  });

  // Update all buttons
  document.querySelectorAll(".make-primary-btn").forEach((button) => {
    button.disabled = false;
    button.textContent = "Maak hoofdfoto";
  });

  // Find the new primary card
  const newPrimaryCard = document.querySelector(
    `.edit-image-card[data-image-id="${newPrimaryId}"]`
  );

  if (newPrimaryCard) {
    // Add badge to new primary
    const badge = document.createElement("span");
    badge.className = "badge bg-success position-absolute top-0 start-0 m-2";
    badge.style.zIndex = "10";
    badge.textContent = "Hoofdfoto";
    newPrimaryCard.appendChild(badge);

    // Update the button for this card
    const primaryBtn = newPrimaryCard.querySelector(".make-primary-btn");
    if (primaryBtn) {
      primaryBtn.disabled = true;
      primaryBtn.textContent = "Al hoofdfoto";
    }
  }
}

/* =====================================================
   DRAG & DROP FOTO VOLGORDE
   ===================================================== */

let draggedItem = null;

document.addEventListener("dragstart", function (e) {
  const card = e.target.closest(".edit-image-card");
  if (!card) return;

  draggedItem = card;
  card.classList.add("dragging");

  // Required for Firefox/Chrome compatibility
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/html", card.innerHTML);

  // Add ghost image
  if (e.dataTransfer.setDragImage) {
    const img = card.querySelector("img");
    if (img) {
      e.dataTransfer.setDragImage(img, 50, 50);
    }
  }
});

document.addEventListener("dragend", function (e) {
  const card = e.target.closest(".edit-image-card");

  if (card) {
    card.classList.remove("dragging");
  }

  // Remove all drag-over classes
  document.querySelectorAll(".edit-image-card.drag-over").forEach((el) => {
    el.classList.remove("drag-over");
  });

  draggedItem = null;
});

document.addEventListener("dragover", function (e) {
  const target = e.target.closest(".edit-image-card");

  if (target && draggedItem && target !== draggedItem) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    // Add visual feedback
    target.classList.add("drag-over");
  }
});

document.addEventListener("dragleave", function (e) {
  const target = e.target.closest(".edit-image-card");

  if (target) {
    target.classList.remove("drag-over");
  }
});

document.addEventListener("drop", function (e) {
  const target = e.target.closest(".edit-image-card");

  if (!draggedItem || !target || draggedItem === target) {
    return;
  }

  e.preventDefault();
  target.classList.remove("drag-over");

  const grid = document.getElementById("photoGrid");
  if (!grid) return;

  // Get all cards
  const cards = Array.from(grid.querySelectorAll(".edit-image-card"));

  const draggedIndex = cards.indexOf(draggedItem);
  const targetIndex = cards.indexOf(target);

  // Reorder in DOM
  if (draggedIndex < targetIndex) {
    target.after(draggedItem);
  } else {
    target.before(draggedItem);
  }

  // Save new order
  savePhotoOrder();
});

/* =====================================================
   SAVE PHOTO ORDER
   ===================================================== */
function savePhotoOrder() {
  const grid = document.getElementById("photoGrid");
  if (!grid) return;

  const order = [];

  grid.querySelectorAll(".edit-image-card").forEach((card, index) => {
    const imageId = card.dataset.imageId;
    if (imageId) {
      order.push({
        id: imageId,
        sort_order: index,
      });
    }
  });

  if (order.length === 0) return;

  fetch("/property/image/reorder", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: JSON.stringify({ order }),
  })
    .then((res) => {
      if (!res.ok) {
        throw new Error("Failed to save order");
      }
      return res.json();
    })
    .then((data) => {
      if (data.success) {
        // Show success feedback
        showToast("Volgorde opgeslagen", "success");
      } else {
        throw new Error("Server returned failure");
      }
    })
    .catch((error) => {
      console.error("Reorder error:", error);
      showToast("Volgorde kon niet worden opgeslagen", "danger");
    });
}

/* =====================================================
   TOAST NOTIFICATION
   ===================================================== */
function showToast(message, type = "info") {
  // Remove existing toast
  const existingToast = document.getElementById("customToast");
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement("div");
  toast.id = "customToast";
  toast.className = `alert alert-${type} position-fixed`;
  toast.style.cssText = `
    bottom: 20px;
    right: 20px;
    z-index: 9999;
    min-width: 250px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    animation: slideIn 0.3s ease;
  `;
  toast.textContent = message;

  // Add animation
  const style = document.createElement("style");
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }
  `;

  if (!document.getElementById("toastStyles")) {
    style.id = "toastStyles";
    document.head.appendChild(style);
  }

  document.body.appendChild(toast);

  // Auto remove after 3 seconds
  setTimeout(() => {
    toast.style.animation = "slideOut 0.3s ease";
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 300);
  }, 3000);
}

/* =====================================================
   KEYBOARD SUPPORT FOR DRAG & DROP
   ===================================================== */
document.addEventListener("keydown", function (e) {
  const focusedCard = document.activeElement.closest(".edit-image-card");

  if (!focusedCard) return;

  const grid = document.getElementById("photoGrid");
  if (!grid) return;

  const cards = Array.from(grid.querySelectorAll(".edit-image-card"));
  const currentIndex = cards.indexOf(focusedCard);

  if (currentIndex === -1) return;

  let handled = false;

  // Move with Ctrl/Cmd + Arrow keys
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      if (currentIndex > 0) {
        cards[currentIndex - 1].before(focusedCard);
        savePhotoOrder();
        handled = true;
      }
    } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      if (currentIndex < cards.length - 1) {
        cards[currentIndex + 1].after(focusedCard);
        savePhotoOrder();
        handled = true;
      }
    }
  }

  if (handled) {
    showToast("Volgorde gewijzigd", "info");
  }
});
