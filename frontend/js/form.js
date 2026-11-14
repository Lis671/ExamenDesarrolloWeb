// Portal público: validación del formulario y envío al backend.

(function () {
  const FALLBACK_CATEGORIAS = [
    "Bacheo y calles",
    "Alumbrado público",
    "Recolección de basura",
    "Agua y drenajes",
    "Parques y áreas verdes",
    "Seguridad",
    "Otro",
  ];

  const MAX_FILE_SIZE = 5 * 1024 * 1024;
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
  // Límites para que la imagen comprimida quepa en un documento de Firestore (1 MiB).
  const MAX_FULL_CHARS = 650000;
  const MAX_THUMB_DIMENSION = 320;
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PHONE_REGEX = /^[0-9+\-\s()]{7,20}$/;

  const form = document.getElementById("report-form");
  const formHead = document.getElementById("form-head");
  const successPanel = document.getElementById("success-panel");
  const successFolio = document.getElementById("success-folio");
  const alertBox = document.getElementById("form-alert");
  const submitBtn = document.getElementById("submit-btn");
  const resetBtn = document.getElementById("reset-btn");
  const newReportBtn = document.getElementById("new-report-btn");
  const categoriaSelect = document.getElementById("categoria");
  const descripcion = document.getElementById("descripcion");
  const descCount = document.getElementById("desc-count");
  const fileInput = document.getElementById("foto");
  const dropzone = document.getElementById("dropzone");
  const preview = document.getElementById("preview");
  const previewImg = document.getElementById("preview-img");
  const previewName = document.getElementById("preview-name");
  const previewSize = document.getElementById("preview-size");
  const removePhotoBtn = document.getElementById("remove-photo");

  let selectedFile = null;

  document.getElementById("year").textContent = new Date().getFullYear();

  // -------------------- Categorías desde el backend --------------------
  async function loadCategorias() {
    let categorias = FALLBACK_CATEGORIAS;
    try {
      const response = await window.api.meta();
      if (response?.data?.categorias?.length) {
        categorias = response.data.categorias;
      }
    } catch (error) {
      console.warn("No se pudieron cargar las categorías:", error.message);
    }

    categoriaSelect.innerHTML =
      '<option value="">Seleccione una categoría…</option>';
    categorias.forEach((categoria) => {
      const option = document.createElement("option");
      option.value = categoria;
      option.textContent = categoria;
      categoriaSelect.appendChild(option);
    });
  }

  // -------------------- Utilidades de errores --------------------
  function fieldWrapper(name) {
    return form.querySelector(`.field[data-field="${name}"]`);
  }

  function setFieldError(name, message) {
    const wrapper = fieldWrapper(name);
    if (!wrapper) return;
    const errorSpan = wrapper.querySelector(`[data-error="${name}"]`);
    if (message) {
      wrapper.classList.add("invalid");
      if (errorSpan) errorSpan.textContent = message;
    } else {
      wrapper.classList.remove("invalid");
      if (errorSpan) errorSpan.textContent = "";
    }
  }

  function clearAllErrors() {
    form.querySelectorAll(".field").forEach((wrapper) => {
      wrapper.classList.remove("invalid");
    });
    form.querySelectorAll("[data-error]").forEach((span) => {
      span.textContent = "";
    });
    hideAlert();
  }

  function showAlert(message) {
    alertBox.textContent = message;
    alertBox.classList.add("show");
  }

  function hideAlert() {
    alertBox.textContent = "";
    alertBox.classList.remove("show");
  }

  // -------------------- Manejo de la fotografía --------------------
  function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function clearPhoto() {
    selectedFile = null;
    fileInput.value = "";
    preview.classList.remove("show");
    previewImg.removeAttribute("src");
    previewName.textContent = "";
    previewSize.textContent = "";
  }

  function handleFile(file) {
    setFieldError("foto", "");
    if (!file) {
      clearPhoto();
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      setFieldError("foto", "Formato no permitido. Use JPG, PNG o WEBP.");
      clearPhoto();
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setFieldError("foto", "La imagen supera el máximo de 5 MB.");
      clearPhoto();
      return;
    }

    selectedFile = file;
    previewImg.src = URL.createObjectURL(file);
    previewName.textContent = file.name;
    previewSize.textContent = `${formatSize(file.size)} · ${file.type.replace(
      "image/",
      ""
    )}`;
    preview.classList.add("show");
  }

  fileInput.addEventListener("change", () => {
    handleFile(fileInput.files[0] || null);
  });

  dropzone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropzone.classList.add("dragover");
  });

  dropzone.addEventListener("dragleave", () => {
    dropzone.classList.remove("dragover");
  });

  dropzone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropzone.classList.remove("dragover");
    const file = event.dataTransfer?.files?.[0] || null;
    if (file) {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      fileInput.files = transfer.files;
      handleFile(file);
    }
  });

  removePhotoBtn.addEventListener("click", clearPhoto);

  descripcion.addEventListener("input", () => {
    descCount.textContent = descripcion.value.length;
  });

  // -------------------- Compresión de imagen --------------------
  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("No se pudo leer la imagen seleccionada."));
      };
      img.src = url;
    });
  }

  function renderToDataUrl(img, maxDimension, quality) {
    const scale = Math.min(
      1,
      maxDimension / Math.max(img.width, img.height)
    );
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    return canvas.toDataURL("image/jpeg", quality);
  }

  async function buildImagePayload(file) {
    const img = await loadImage(file);

    let maxDimension = 1280;
    let quality = 0.72;
    let full = renderToDataUrl(img, maxDimension, quality);

    while (full.length > MAX_FULL_CHARS) {
      maxDimension = Math.round(maxDimension * 0.85);
      quality = Math.max(0.5, quality - 0.06);
      full = renderToDataUrl(img, maxDimension, quality);
      if (maxDimension <= 640 && quality <= 0.5) break;
    }

    if (full.length > MAX_FULL_CHARS) {
      throw new Error(
        "La fotografía es demasiado grande incluso después de comprimirla. Use una imagen más liviana."
      );
    }

    const thumb = renderToDataUrl(img, MAX_THUMB_DIMENSION, 0.6);
    return { full, thumb };
  }

  // -------------------- Validación --------------------
  function validate(values) {
    const errors = {};

    if (!values.nombre) {
      errors.nombre = "El nombre es obligatorio.";
    } else if (values.nombre.length < 3 || values.nombre.length > 80) {
      errors.nombre = "El nombre debe tener entre 3 y 80 caracteres.";
    }

    if (!values.correo) {
      errors.correo = "El correo es obligatorio.";
    } else if (!EMAIL_REGEX.test(values.correo)) {
      errors.correo = "Ingrese un correo electrónico válido.";
    }

    if (values.telefono && !PHONE_REGEX.test(values.telefono)) {
      errors.telefono = "Ingrese un teléfono válido (7 a 20 dígitos).";
    }

    if (!values.categoria) {
      errors.categoria = "Seleccione una categoría.";
    }

    if (!values.ubicacion) {
      errors.ubicacion = "La ubicación es obligatoria.";
    } else if (values.ubicacion.length < 5 || values.ubicacion.length > 150) {
      errors.ubicacion = "La ubicación debe tener entre 5 y 150 caracteres.";
    }

    if (!values.descripcion) {
      errors.descripcion = "La descripción es obligatoria.";
    } else if (
      values.descripcion.length < 10 ||
      values.descripcion.length > 1000
    ) {
      errors.descripcion =
        "La descripción debe tener entre 10 y 1000 caracteres.";
    }

    if (!selectedFile) {
      errors.foto = "La fotografía es obligatoria.";
    }

    return errors;
  }

  function applyErrors(errors) {
    Object.entries(errors).forEach(([name, message]) => {
      setFieldError(name, message);
    });
    const firstInvalid = Object.keys(errors)[0];
    const wrapper = fieldWrapper(firstInvalid);
    if (wrapper) {
      const focusable = wrapper.querySelector("input, select, textarea");
      if (focusable) focusable.focus();
      wrapper.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  // -------------------- Envío --------------------
  function setLoading(loading) {
    submitBtn.disabled = loading;
    submitBtn.innerHTML = loading
      ? '<span class="spinner"></span><span>Enviando…</span>'
      : "<span>Enviar reporte</span>";
  }

  function showSuccess(folio) {
    successFolio.textContent = folio;
    form.classList.add("hidden");
    formHead.classList.add("hidden");
    successPanel.classList.add("show");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    form.reset();
    clearPhoto();
    clearAllErrors();
    descCount.textContent = "0";
    form.classList.remove("hidden");
    formHead.classList.remove("hidden");
    successPanel.classList.remove("show");
    document.getElementById("nombre").focus();
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearAllErrors();

    const values = {
      nombre: document.getElementById("nombre").value.trim(),
      correo: document.getElementById("correo").value.trim(),
      telefono: document.getElementById("telefono").value.trim(),
      categoria: categoriaSelect.value.trim(),
      ubicacion: document.getElementById("ubicacion").value.trim(),
      descripcion: descripcion.value.trim(),
    };

    const errors = validate(values);
    if (Object.keys(errors).length > 0) {
      applyErrors(errors);
      showAlert("Revise los campos marcados en rojo antes de enviar.");
      return;
    }

    setLoading(true);
    try {
      const { full, thumb } = await buildImagePayload(selectedFile);

      const response = await window.api.createReport({
        ...values,
        fotoBase64: full,
        fotoThumbBase64: thumb,
      });

      const folio = response?.data?.folio || "Registrado";
      showSuccess(folio);
    } catch (error) {
      if (error.errors) {
        applyErrors(error.errors);
      }
      showAlert(
        error.message || "No se pudo registrar el reporte. Intente de nuevo."
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setLoading(false);
    }
  });

  resetBtn.addEventListener("click", (event) => {
    event.preventDefault();
    resetForm();
  });

  newReportBtn.addEventListener("click", resetForm);

  loadCategorias();
})();
