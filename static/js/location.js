document.addEventListener("DOMContentLoaded", function () {
  const districtSelect = document.getElementById("districtSelect");
  const wijkSelect = document.getElementById("wijkSelect");

  if (!districtSelect || !wijkSelect) {
    console.warn("District or Wijk select element not found");
    return;
  }

  /**
   * Load wijken (neighborhoods) for a given district
   * @param {string} district - The district name
   * @param {string|null} selectedWijk - Pre-selected wijk (for edit mode)
   */
  function loadWijken(district, selectedWijk = null) {
    // Clear existing options
    wijkSelect.innerHTML = "";
    wijkSelect.disabled = true;

    if (!district) {
      wijkSelect.innerHTML =
        '<option value="">Selecteer eerst een district</option>';
      return;
    }

    // Show loading state
    wijkSelect.innerHTML = '<option value="">Laden...</option>';

    fetch(`/api/wijken/${encodeURIComponent(district)}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        wijkSelect.disabled = false;
        wijkSelect.innerHTML =
          '<option value="">Selecteer wijk (optioneel)</option>';

        if (!Array.isArray(data) || data.length === 0) {
          wijkSelect.innerHTML =
            '<option value="">Geen wijken beschikbaar</option>';
          wijkSelect.disabled = true;
          return;
        }

        // Populate options
        data.forEach((wijk) => {
          const option = document.createElement("option");
          option.value = wijk;
          option.textContent = capitalizeFirst(wijk);

          // Pre-select if this is the selected wijk
          if (selectedWijk && wijk === selectedWijk) {
            option.selected = true;
          }

          wijkSelect.appendChild(option);
        });
      })
      .catch((error) => {
        console.error("Error loading wijken:", error);
        wijkSelect.innerHTML = '<option value="">Fout bij laden</option>';
        wijkSelect.disabled = true;

        // Show user-friendly error message
        showError("Kon wijken niet laden. Probeer de pagina te vernieuwen.");
      });
  }

  /**
   * Capitalize first letter of string
   * @param {string} str - String to capitalize
   * @returns {string}
   */
  function capitalizeFirst(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Show error message to user
   * @param {string} message - Error message
   */
  function showError(message) {
    // Check if alert already exists
    let alert = document.getElementById("locationError");

    if (!alert) {
      alert = document.createElement("div");
      alert.id = "locationError";
      alert.className = "alert alert-warning alert-dismissible fade show mt-2";
      alert.setAttribute("role", "alert");
      alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      `;

      // Insert after wijk select
      wijkSelect.parentNode.appendChild(alert);
    } else {
      alert.querySelector("span, div, p, :first-child").textContent = message;
    }

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      if (alert && alert.parentNode) {
        const bsAlert = bootstrap.Alert.getOrCreateInstance(alert);
        bsAlert.close();
      }
    }, 5000);
  }

  // ===================================================
  // INITIAL LOAD (for edit mode)
  // ===================================================

  const initialDistrict = districtSelect.value;
  const initialWijk = wijkSelect.dataset.selected;

  if (initialDistrict) {
    loadWijken(initialDistrict, initialWijk);
  }

  // ===================================================
  // DISTRICT CHANGE EVENT
  // ===================================================

  districtSelect.addEventListener("change", function () {
    const district = this.value;
    loadWijken(district);

    // Clear any existing error messages
    const existingError = document.getElementById("locationError");
    if (existingError) {
      existingError.remove();
    }
  });

  // ===================================================
  // FORM VALIDATION HELPER
  // ===================================================

  const form = districtSelect.closest("form");

  if (form) {
    form.addEventListener("submit", function (e) {
      const district = districtSelect.value;

      if (!district) {
        e.preventDefault();
        districtSelect.focus();
        districtSelect.classList.add("is-invalid");

        // Show validation message
        let feedback = districtSelect.nextElementSibling;
        if (!feedback || !feedback.classList.contains("invalid-feedback")) {
          feedback = document.createElement("div");
          feedback.className = "invalid-feedback";
          feedback.textContent = "Selecteer een district";
          districtSelect.parentNode.appendChild(feedback);
        }
        feedback.style.display = "block";

        return false;
      }

      // Remove validation styling if valid
      districtSelect.classList.remove("is-invalid");
      const feedback = districtSelect.nextElementSibling;
      if (feedback && feedback.classList.contains("invalid-feedback")) {
        feedback.style.display = "none";
      }
    });

    // Remove validation styling on change
    districtSelect.addEventListener("change", function () {
      this.classList.remove("is-invalid");
      const feedback = this.nextElementSibling;
      if (feedback && feedback.classList.contains("invalid-feedback")) {
        feedback.style.display = "none";
      }
    });
  }

  // ===================================================
  // PRESERVE SELECTION ON BACK BUTTON
  // ===================================================

  window.addEventListener("pageshow", function (event) {
    // Check if page was loaded from cache (back/forward button)
    if (event.persisted) {
      const district = districtSelect.value;
      const wijk = wijkSelect.value;

      if (district) {
        loadWijken(district, wijk);
      }
    }
  });

  // ===================================================
  // ACCESSIBILITY IMPROVEMENTS
  // ===================================================

  // Add ARIA labels if not present
  if (!districtSelect.getAttribute("aria-label")) {
    districtSelect.setAttribute("aria-label", "Selecteer district");
  }

  if (!wijkSelect.getAttribute("aria-label")) {
    wijkSelect.setAttribute("aria-label", "Selecteer wijk");
  }

  // Update aria-disabled state
  const updateAriaDisabled = () => {
    wijkSelect.setAttribute(
      "aria-disabled",
      wijkSelect.disabled ? "true" : "false"
    );
  };

  // Watch for disabled state changes
  const observer = new MutationObserver(updateAriaDisabled);
  observer.observe(wijkSelect, {
    attributes: true,
    attributeFilter: ["disabled"],
  });

  // Initial state
  updateAriaDisabled();

  // ===================================================
  // KEYBOARD SHORTCUTS
  // ===================================================

  districtSelect.addEventListener("keydown", function (e) {
    // Alt + W jumps to wijk select if enabled
    if (e.altKey && e.key.toLowerCase() === "w") {
      if (!wijkSelect.disabled) {
        e.preventDefault();
        wijkSelect.focus();
      }
    }
  });

  // ===================================================
  // DEBUG MODE (for development)
  // ===================================================

  if (window.location.search.includes("debug=1")) {
    console.log("Location.js Debug Mode");
    console.log("District Select:", districtSelect);
    console.log("Wijk Select:", wijkSelect);
    console.log("Initial District:", initialDistrict);
    console.log("Initial Wijk:", initialWijk);

    // Add debug info to page
    const debugInfo = document.createElement("div");
    debugInfo.className = "alert alert-info mt-2";
    debugInfo.innerHTML = `
      <strong>Debug Info:</strong><br>
      District: ${initialDistrict || "none"}<br>
      Wijk: ${initialWijk || "none"}<br>
      API Endpoint: /api/wijken/${initialDistrict || "district"}
    `;
    wijkSelect.parentNode.appendChild(debugInfo);
  }
});
