// Cliente de la API REST. Centraliza todas las llamadas fetch del frontend.

const API_BASE = (window.APP_CONFIG?.API_BASE_URL || "http://localhost:4000/api")
  .replace(/\/+$/, "");

function buildQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      query.set(key, value);
    }
  });
  const text = query.toString();
  return text ? `?${text}` : "";
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, options);
  } catch (networkError) {
    const error = new Error(
      "No se pudo conectar con el servidor. Verifique su conexión e intente de nuevo."
    );
    error.status = 0;
    throw error;
  }

  let body = null;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    body = await response.json().catch(() => null);
  }

  if (!response.ok) {
    const error = new Error(body?.message || `Error ${response.status}`);
    error.status = response.status;
    error.errors = body?.errors || null;
    throw error;
  }

  return body;
}

window.api = {
  meta() {
    return request("/meta");
  },

  createReport(formData) {
    return request("/reports", { method: "POST", body: formData });
  },

  getReports(filters) {
    return request(`/reports${buildQuery(filters)}`);
  },

  getReport(id) {
    return request(`/reports/${encodeURIComponent(id)}`);
  },

  updateStatus(id, estado) {
    return request(`/reports/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
  },

  stats() {
    return request("/stats");
  },
};
