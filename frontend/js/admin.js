// Panel de Administración Municipal: listado, filtros, detalle y cambio de estado.

(function () {
  const ESTADO_LABEL = {
    pendiente: "Pendiente",
    en_proceso: "En proceso",
    resuelto: "Resuelto",
  };

  const listEl = document.getElementById("report-list");
  const alertBox = document.getElementById("admin-alert");
  const statTotal = document.getElementById("stat-total");
  const statPendiente = document.getElementById("stat-pendiente");
  const statProceso = document.getElementById("stat-proceso");
  const statResuelto = document.getElementById("stat-resuelto");

  const fQ = document.getElementById("f-q");
  const fEstado = document.getElementById("f-estado");
  const fCategoria = document.getElementById("f-categoria");
  const fDesde = document.getElementById("f-desde");
  const fHasta = document.getElementById("f-hasta");
  const clearBtn = document.getElementById("clear-filters");

  const overlay = document.getElementById("modal-overlay");
  const modalBody = document.getElementById("modal-body");
  const modalClose = document.getElementById("modal-close");

  let currentReport = null;
  let searchTimer = null;

  document.getElementById("year").textContent = new Date().getFullYear();

  // -------------------- Utilidades --------------------
  function formatDate(iso) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString("es-GT", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch (error) {
      return iso;
    }
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function showAlert(message) {
    alertBox.textContent = message;
    alertBox.classList.add("show");
  }

  function hideAlert() {
    alertBox.textContent = "";
    alertBox.classList.remove("show");
  }

  // -------------------- Indicadores --------------------
  function renderStats(data) {
    statTotal.textContent = data.total ?? 0;
    statPendiente.textContent = data.pendiente ?? 0;
    statProceso.textContent = data.en_proceso ?? 0;
    statResuelto.textContent = data.resuelto ?? 0;
  }

  // -------------------- Categorías para el filtro --------------------
  async function loadCategorias() {
    try {
      const response = await window.api.meta();
      const categorias = response?.data?.categorias || [];
      categorias.forEach((categoria) => {
        const option = document.createElement("option");
        option.value = categoria;
        option.textContent = categoria;
        fCategoria.appendChild(option);
      });
    } catch (error) {
      console.warn("No se pudieron cargar las categorías:", error.message);
    }
  }

  // -------------------- Listado --------------------
  function renderLoading() {
    listEl.innerHTML =
      '<div class="state"><span class="big">&#8987;</span>Cargando reportes…</div>';
  }

  function renderEmpty() {
    listEl.innerHTML =
      '<div class="state"><span class="big">&#128230;</span>' +
      "<strong>No hay reportes que coincidan.</strong><br />" +
      "Ajuste los filtros o registre un nuevo reporte desde el portal ciudadano.</div>";
  }

  function reportCard(report) {
    const estado = report.estado || "pendiente";
    const foto = report.fotoUrl
      ? `<img class="thumb" src="${escapeHtml(report.fotoUrl)}" alt="Fotografía del reporte ${escapeHtml(
          report.folio
        )}" loading="lazy" />`
      : '<div class="thumb" aria-hidden="true"></div>';

    return `
      <article class="report-card" data-id="${escapeHtml(report.id)}">
        ${foto}
        <div class="body">
          <div class="topline">
            <span class="folio-tag">${escapeHtml(report.folio)}</span>
            <span class="badge ${escapeHtml(estado)}">${escapeHtml(
      ESTADO_LABEL[estado] || estado
    )}</span>
          </div>
          <h3>${escapeHtml(report.categoria)}</h3>
          <div class="meta">
            <span>&#128205; ${escapeHtml(report.ubicacion)}</span>
            <span>&#128197; ${escapeHtml(formatDate(report.createdAt))}</span>
          </div>
          <p class="desc">${escapeHtml(report.descripcion)}</p>
        </div>
        <div class="actions">
          <button type="button" class="btn secondary view-btn" data-id="${escapeHtml(
            report.id
          )}">Ver detalle</button>
        </div>
      </article>
    `;
  }

  function renderReports(reports) {
    if (!reports.length) {
      renderEmpty();
      return;
    }
    listEl.innerHTML = reports.map(reportCard).join("");
  }

  function currentFilters() {
    return {
      q: fQ.value.trim(),
      estado: fEstado.value,
      categoria: fCategoria.value,
      desde: fDesde.value,
      hasta: fHasta.value,
    };
  }

  async function loadReports() {
    renderLoading();
    try {
      const response = await window.api.getReports(currentFilters());
      renderReports(response?.data || []);
      hideAlert();
    } catch (error) {
      listEl.innerHTML =
        '<div class="state"><span class="big">&#9888;</span>No se pudieron cargar los reportes.</div>';
      showAlert(
        error.status === 0
          ? error.message
          : "No se pudieron cargar los reportes. " + (error.message || "")
      );
    }
  }

  async function loadStats() {
    try {
      const response = await window.api.stats();
      renderStats(response?.data || {});
    } catch (error) {
      console.warn("No se pudieron cargar los indicadores:", error.message);
    }
  }

  async function refreshAll() {
    await Promise.all([loadReports(), loadStats()]);
  }

  // -------------------- Modal de detalle --------------------
  function openModal(report) {
    currentReport = report;
    const estado = report.estado || "pendiente";
    const foto = report.fotoUrl
      ? `<img class="detail-photo" src="${escapeHtml(report.fotoUrl)}" alt="Fotografía del reporte" />`
      : "";

    const options = Object.entries(ESTADO_LABEL)
      .map(
        ([value, label]) =>
          `<option value="${value}" ${
            value === estado ? "selected" : ""
          }>${label}</option>`
      )
      .join("");

    modalBody.innerHTML = `
      ${foto}
      <div class="detail-grid">
        <div class="item"><div class="k">Folio</div><div class="v">${escapeHtml(
          report.folio
        )}</div></div>
        <div class="item"><div class="k">Estado actual</div><div class="v"><span class="badge ${escapeHtml(
          estado
        )}">${escapeHtml(ESTADO_LABEL[estado] || estado)}</span></div></div>
        <div class="item"><div class="k">Ciudadano</div><div class="v">${escapeHtml(
          report.nombre
        )}</div></div>
        <div class="item"><div class="k">Categoría</div><div class="v">${escapeHtml(
          report.categoria
        )}</div></div>
        <div class="item"><div class="k">Correo</div><div class="v">${escapeHtml(
          report.correo
        )}</div></div>
        <div class="item"><div class="k">Teléfono</div><div class="v">${escapeHtml(
          report.telefono || "No indicado"
        )}</div></div>
        <div class="item full"><div class="k">Ubicación</div><div class="v">${escapeHtml(
          report.ubicacion
        )}</div></div>
        <div class="item"><div class="k">Registrado</div><div class="v">${escapeHtml(
          formatDate(report.createdAt)
        )}</div></div>
        <div class="item"><div class="k">Última actualización</div><div class="v">${escapeHtml(
          formatDate(report.updatedAt)
        )}</div></div>
        <div class="item full">
          <div class="k">Descripción original</div>
          <div class="detail-desc">${escapeHtml(report.descripcion)}</div>
        </div>
      </div>
      <div class="status-editor">
        <div class="field">
          <label for="modal-estado">Cambiar estado</label>
          <select id="modal-estado">${options}</select>
        </div>
        <button type="button" class="btn success" id="save-status">Guardar estado</button>
      </div>
    `;

    overlay.classList.add("show");
    document.body.style.overflow = "hidden";

    document
      .getElementById("save-status")
      .addEventListener("click", saveStatus);
  }

  function closeModal() {
    overlay.classList.remove("show");
    document.body.style.overflow = "";
    currentReport = null;
  }

  async function saveStatus() {
    if (!currentReport) return;
    const select = document.getElementById("modal-estado");
    const button = document.getElementById("save-status");
    const nuevoEstado = select.value;

    if (nuevoEstado === currentReport.estado) {
      closeModal();
      return;
    }

    button.disabled = true;
    button.textContent = "Guardando…";
    try {
      await window.api.updateStatus(currentReport.id, nuevoEstado);
      closeModal();
      await refreshAll();
    } catch (error) {
      button.disabled = false;
      button.textContent = "Guardar estado";
      showAlert("No se pudo actualizar el estado: " + error.message);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  // -------------------- Eventos --------------------
  listEl.addEventListener("click", async (event) => {
    const button = event.target.closest(".view-btn");
    if (!button) return;
    const id = button.dataset.id;
    button.disabled = true;
    button.textContent = "Cargando…";
    try {
      const response = await window.api.getReport(id);
      openModal(response.data);
    } catch (error) {
      showAlert("No se pudo cargar el detalle: " + error.message);
    } finally {
      button.disabled = false;
      button.textContent = "Ver detalle";
    }
  });

  modalClose.addEventListener("click", closeModal);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && overlay.classList.contains("show")) {
      closeModal();
    }
  });

  fEstado.addEventListener("change", loadReports);
  fCategoria.addEventListener("change", loadReports);
  fDesde.addEventListener("change", loadReports);
  fHasta.addEventListener("change", loadReports);

  fQ.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(loadReports, 350);
  });

  clearBtn.addEventListener("click", () => {
    fQ.value = "";
    fEstado.value = "";
    fCategoria.value = "";
    fDesde.value = "";
    fHasta.value = "";
    loadReports();
  });

  // -------------------- Inicio --------------------
  loadCategorias();
  refreshAll();
})();
