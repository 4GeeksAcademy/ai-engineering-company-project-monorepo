function inferApiBase() {
  const queryApi = new URLSearchParams(window.location.search).get("api");
  if (queryApi) {
    return queryApi.replace(/\/$/, "");
  }

  const { protocol, hostname } = window.location;

  if (hostname.endsWith(".app.github.dev")) {
    const apiHost = hostname.replace(/-\d+\.app\.github\.dev$/, "-8000.app.github.dev");
    return `https://${apiHost}`;
  }

  if (protocol === "file:" || hostname === "" || hostname === "127.0.0.1" || hostname === "localhost") {
    return "http://127.0.0.1:8000";
  }

  return `http://${hostname}:8000`;
}

const API_BASE = inferApiBase();

const suppliersBody = document.getElementById("suppliers-body");
const supplierForm = document.getElementById("supplier-form");
const formMessage = document.getElementById("form-message");
const filterCountry = document.getElementById("filter-country");
const filterCategory = document.getElementById("filter-category");
const applyFiltersBtn = document.getElementById("apply-filters");
const clearFiltersBtn = document.getElementById("clear-filters");

const ALLOWED_CATEGORIES = new Set([
  "ingredientes",
  "empaques",
  "logistica",
  "tecnologia",
  "mantenimiento",
  "limpieza",
]);

function parseCategories(raw) {
  return raw
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function findInvalidCategories(categories) {
  return categories.filter((category) => !ALLOWED_CATEGORIES.has(category));
}

function showError(message) {
  formMessage.textContent = message;
  formMessage.style.color = "#8a2f1a";
}

function showSuccess(message) {
  formMessage.textContent = message;
  formMessage.style.color = "#006a52";
}

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    let detail = `Error HTTP ${response.status}`;
    try {
      const payload = await response.json();
      detail = payload.detail || detail;
      if (Array.isArray(payload.detail)) {
        detail = payload.detail.map((entry) => entry.msg).join(" | ");
      }
    } catch {
      // Use fallback message when backend does not return JSON.
    }
    throw new Error(detail);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function renderStatusBadge(status) {
  const isActive = status === "activo";
  const cls = isActive ? "active" : "suspended";
  return `<span class="badge ${cls}">${status}</span>`;
}

function buildSupplierRow(supplier) {
  const tr = document.createElement("tr");

  tr.innerHTML = `
    <td>${supplier.id}</td>
    <td>${supplier.nombre}</td>
    <td>${supplier.pais}</td>
    <td>${supplier.categorias.join(", ")}</td>
    <td>${supplier.tarifa.toFixed(2)}</td>
    <td>${renderStatusBadge(supplier.estado)}</td>
    <td>${new Date(supplier.updated_at).toLocaleString()}</td>
    <td></td>
  `;

  const actionsTd = tr.querySelector("td:last-child");
  actionsTd.innerHTML = `
    <div class="actions">
      <div class="inline-form">
        <input class="rate-input" type="number" min="0.01" step="0.01" placeholder="Nueva tarifa" />
        <button class="rate-btn" type="button">Actualizar tarifa</button>
      </div>
      <button class="status-btn" type="button">${
        supplier.estado === "activo" ? "Suspender" : "Activar"
      }</button>
    </div>
  `;

  const rateInput = actionsTd.querySelector(".rate-input");
  const rateBtn = actionsTd.querySelector(".rate-btn");
  const statusBtn = actionsTd.querySelector(".status-btn");

  rateBtn.addEventListener("click", async () => {
    const newRate = Number(rateInput.value);
    if (!newRate || newRate <= 0) {
      showError("La tarifa debe ser mayor a cero.");
      return;
    }

    try {
      await api(`/suppliers/${supplier.id}/rate`, {
        method: "PATCH",
        body: JSON.stringify({ tarifa: newRate }),
      });
      showSuccess("Tarifa actualizada.");
      await loadSuppliers();
    } catch (error) {
      showError(error.message);
    }
  });

  statusBtn.addEventListener("click", async () => {
    const nextStatus = supplier.estado === "activo" ? "suspendido" : "activo";

    try {
      await api(`/suppliers/${supplier.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ estado: nextStatus }),
      });
      showSuccess("Estado actualizado.");
      await loadSuppliers();
    } catch (error) {
      showError(error.message);
    }
  });

  return tr;
}

async function loadSuppliers() {
  const params = new URLSearchParams();

  const country = filterCountry.value.trim();
  const category = filterCategory.value;

  if (country) {
    params.set("country", country);
  }
  if (category) {
    params.set("category", category);
  }

  const query = params.toString() ? `?${params}` : "";

  try {
    const suppliers = await api(`/suppliers${query}`);
    suppliersBody.innerHTML = "";

    if (suppliers.length === 0) {
      suppliersBody.innerHTML =
        '<tr><td colspan="8">No hay resultados con los filtros aplicados.</td></tr>';
      formMessage.textContent = "Sin resultados para el filtro actual.";
      formMessage.style.color = "#4d5668";
      return;
    }

    suppliers.forEach((supplier) => {
      suppliersBody.appendChild(buildSupplierRow(supplier));
    });

    formMessage.textContent = `Registros cargados: ${suppliers.length}`;
    formMessage.style.color = "#4d5668";
  } catch (error) {
    showError(error.message);
  }
}

supplierForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(supplierForm);
  const payload = {
    nombre: String(formData.get("nombre") || "").trim(),
    pais: String(formData.get("pais") || "").trim(),
    categorias: parseCategories(String(formData.get("categorias") || "")),
    tarifa: Number(formData.get("tarifa")),
    estado: String(formData.get("estado") || "activo"),
  };

  const invalidCategories = findInvalidCategories(payload.categorias);
  if (invalidCategories.length > 0) {
    showError(`Categorias no permitidas: ${invalidCategories.join(", ")}`);
    return;
  }

  try {
    await api("/suppliers", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    supplierForm.reset();
    showSuccess("Proveedor creado correctamente.");
    await loadSuppliers();
  } catch (error) {
    showError(error.message);
  }
});

applyFiltersBtn.addEventListener("click", loadSuppliers);
clearFiltersBtn.addEventListener("click", async () => {
  filterCountry.value = "";
  filterCategory.value = "";
  await loadSuppliers();
});

loadSuppliers();
