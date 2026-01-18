document.addEventListener("DOMContentLoaded", function () {
  /* ===============================
     FOTO PREVIEW BIJ UPLOAD
     =============================== */
  const fileInput = document.querySelector('input[type="file"][name="fotos"]');

  if (fileInput) {
    // Check if preview container already exists
    let previewContainer = document.getElementById("photoPreview");

    if (!previewContainer) {
      previewContainer = document.createElement("div");
      previewContainer.id = "photoPreview";
      previewContainer.className = "d-flex flex-wrap gap-2 mt-2";
      fileInput.parentNode.appendChild(previewContainer);
    }

    fileInput.addEventListener("change", function (e) {
      previewContainer.innerHTML = "";

      const files = Array.from(e.target.files);

      if (files.length === 0) {
        return;
      }

      files.forEach((file, index) => {
        if (!file.type.startsWith("image/")) {
          console.warn(`File ${file.name} is not an image`);
          return;
        }

        const reader = new FileReader();

        reader.onload = function (e) {
          const col = document.createElement("div");
          col.className = "position-relative";
          col.style.width = "100px";

          col.innerHTML = `
            <img src="${e.target.result}"
                 class="img-fluid rounded"
                 style="height: 100px; width: 100%; object-fit: cover; border: 2px solid #dee2e6;"
                 alt="Preview ${index + 1}">
            <span class="badge bg-primary position-absolute top-0 start-0 m-1" style="font-size: 0.7rem;">
              ${index + 1}
            </span>
          `;

          previewContainer.appendChild(col);
        };

        reader.onerror = function () {
          console.error(`Error reading file ${file.name}`);
        };

        reader.readAsDataURL(file);
      });
    });
  }

  /* ===============================
     SUBMIT KNOP BESCHERMING
     =============================== */
  const forms = document.querySelectorAll("form");

  forms.forEach((form) => {
    // Skip forms marked with data-no-lock
    if (form.dataset.noLock === "true") {
      return;
    }

    // Skip forms with method DELETE (dropdown actions)
    if (form.method && form.method.toUpperCase() === "DELETE") {
      return;
    }

    form.addEventListener("submit", function (e) {
      const submitBtn = form.querySelector('button[type="submit"]');

      if (!submitBtn) {
        return; // Allow form to submit
      }

      // Check if already submitting
      if (submitBtn.disabled) {
        e.preventDefault();
        return false;
      }

      // Don't prevent default - let form submit naturally
      // Just disable button to prevent double-submit

      // Disable button and show loading state
      submitBtn.disabled = true;

      // Store original text
      const originalText = submitBtn.textContent;
      submitBtn.dataset.originalText = originalText;

      // Change text to loading
      submitBtn.textContent = "Bezig...";

      // Add loading class for CSS styling
      submitBtn.classList.add("loading");

      // Re-enable after 10 seconds as safety fallback
      setTimeout(() => {
        if (submitBtn.disabled) {
          submitBtn.disabled = false;
          submitBtn.textContent =
            submitBtn.dataset.originalText || originalText;
          submitBtn.classList.remove("loading");
        }
      }, 10000);
    });
  });

  /* ===============================
     FORM VALIDATION FEEDBACK
     =============================== */
  const formsWithValidation = document.querySelectorAll(".needs-validation");

  formsWithValidation.forEach((form) => {
    form.addEventListener(
      "submit",
      function (e) {
        if (!form.checkValidity()) {
          e.preventDefault();
          e.stopPropagation();
        }

        form.classList.add("was-validated");
      },
      false
    );
  });

  /* ===============================
     AUTO-RESIZE TEXTAREA
     =============================== */
  const textareas = document.querySelectorAll("textarea.auto-resize");

  textareas.forEach((textarea) => {
    textarea.addEventListener("input", function () {
      this.style.height = "auto";
      this.style.height = this.scrollHeight + "px";
    });

    // Initial resize
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
  });

  /* ===============================
     CLEAR FORM HELPER
     =============================== */
  const clearButtons = document.querySelectorAll("[data-clear-form]");

  clearButtons.forEach((button) => {
    button.addEventListener("click", function (e) {
      e.preventDefault();

      const formId = this.dataset.clearForm;
      const form = formId
        ? document.getElementById(formId)
        : this.closest("form");

      if (form) {
        form.reset();
        form.classList.remove("was-validated");

        // Clear file previews
        const previewContainer = form.querySelector("#photoPreview");
        if (previewContainer) {
          previewContainer.innerHTML = "";
        }
      }
    });
  });

  /* ===============================
     CHARACTER COUNTER
     =============================== */
  const textareasWithCounter = document.querySelectorAll("textarea[maxlength]");

  textareasWithCounter.forEach((textarea) => {
    const maxLength = textarea.getAttribute("maxlength");

    if (!maxLength) return;

    // Create counter element
    const counter = document.createElement("small");
    counter.className = "form-text text-muted";
    counter.style.display = "block";
    counter.style.textAlign = "right";

    const updateCounter = () => {
      const currentLength = textarea.value.length;
      counter.textContent = `${currentLength} / ${maxLength} karakters`;

      if (currentLength >= maxLength * 0.9) {
        counter.classList.add("text-warning");
      } else {
        counter.classList.remove("text-warning");
      }
    };

    textarea.addEventListener("input", updateCounter);

    // Insert counter after textarea
    textarea.parentNode.insertBefore(counter, textarea.nextSibling);

    // Initial update
    updateCounter();
  });

  /* ===============================
     PRICE INPUT FORMATTING
     =============================== */
  const priceInputs = document.querySelectorAll(
    'input[name="prijs"], input[name="min_prijs"], input[name="max_prijs"]'
  );

  priceInputs.forEach((input) => {
    input.addEventListener("blur", function () {
      if (this.value) {
        const value = parseFloat(this.value);
        if (!isNaN(value)) {
          this.value = Math.round(value);
        }
      }
    });
  });

  /* ===============================
     CONFIRM ON LEAVE (UNSAVED CHANGES)
     =============================== */
  const formsWithUnsavedWarning = document.querySelectorAll(
    "form[data-warn-unsaved]"
  );

  formsWithUnsavedWarning.forEach((form) => {
    let formChanged = false;

    form.addEventListener("input", function () {
      formChanged = true;
    });

    form.addEventListener("submit", function () {
      formChanged = false;
    });

    window.addEventListener("beforeunload", function (e) {
      if (formChanged) {
        e.preventDefault();
        e.returnValue =
          "Je hebt niet-opgeslagen wijzigingen. Weet je zeker dat je wilt verlaten?";
        return e.returnValue;
      }
    });
  });
});
