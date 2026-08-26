const PRODUCT_CATEGORIES = [
    "proteins",
    "vegetables_and_fruit",
    "beverages_and_packaging",
    "imported_sauces_and_condiments",
];
const STATUSES = ["preferred", "active", "inactive"];
const COUNTRIES = ["Colombia", "United States"];

const els = {
    tableBody: document.getElementById("supplier-body"),
    listStatus: document.getElementById("list-status"),
    formStatus: document.getElementById("form-status"),
    form: document.getElementById("supplier-form"),
    formTitle: document.getElementById("form-title"),
    editingId: document.getElementById("editing-id"),
    filterCountry: document.getElementById("filter-country"),
    filterCategory: document.getElementById("filter-category"),
    filterStatus: document.getElementById("filter-status"),
    applyFilters: document.getElementById("apply-filters"),
    resetFilters: document.getElementById("reset-filters"),
    cancelEdit: document.getElementById("cancel-edit"),
    categoryBox: document.getElementById("category-checkboxes"),
    statusLifecycle: document.getElementById("status-lifecycle"),
};

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function errorDetail(body, fallback) {
    const detail = body && body.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
        return detail
            .map((item) => {
                const field = Array.isArray(item.loc)
                    ? item.loc.filter((part) => part !== "body").join(".")
                    : "";
                const msg = item.msg || JSON.stringify(item);
                return field ? `${field}: ${msg}` : msg;
            })
            .join("; ");
    }
    return fallback;
}

function showFormError(message) {
    els.formStatus.textContent = message;
    els.formStatus.className = "alert-error";
}

function showFormBusy(message) {
    els.formStatus.textContent = message;
    els.formStatus.className = "status-busy";
    els.formStatus.setAttribute("aria-busy", "true");
}

function showFormSuccess(message) {
    els.formStatus.textContent = message;
    els.formStatus.className = "status-busy";
    els.formStatus.removeAttribute("aria-busy");
}

function fillSelect(select, values, blankLabel) {
    const options = blankLabel ? [`<option value="">${escapeHtml(blankLabel)}</option>`] : [];
    values.forEach((value) => {
        options.push(`<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`);
    });
    select.innerHTML = options.join("");
}

function renderCategoryCheckboxes() {
    els.categoryBox.innerHTML = PRODUCT_CATEGORIES.map(
        (id) =>
            `<label class="checkbox-item"><input type="checkbox" name="product_categories" value="${escapeHtml(id)}"> ${escapeHtml(id)}</label>`,
    ).join("");
}

function selectedCategories() {
    return Array.from(els.form.querySelectorAll('input[name="product_categories"]:checked')).map((input) => input.value);
}

function setCategories(ids) {
    const chosen = new Set(ids || []);
    els.form.querySelectorAll('input[name="product_categories"]').forEach((input) => {
        input.checked = chosen.has(input.value);
    });
    syncRateFromCategories();
}

function syncRateFromCategories() {
    els.form.emergency_surcharge_pct.value = 8;
}

function formPayload() {
    return {
        name: els.form.name.value.trim(),
        country: els.form.country.value,
        product_categories: selectedCategories(),
        emergency_surcharge_pct: Number(els.form.emergency_surcharge_pct.value),
        status: els.form.status.value,
    };
}

function resetForm() {
    els.form.reset();
    els.editingId.value = "";
    els.formTitle.textContent = "Register a new supplier";
    els.cancelEdit.hidden = true;
    els.statusLifecycle.hidden = true;
    document.getElementById("register-supplier").textContent = "Register supplier";
    els.form.status.value = "active";
    els.form.country.value = "Colombia";
    setCategories(["proteins"]);
    showFormSuccess("");
}

function fillForm(row) {
    els.editingId.value = row.supplier_id;
    els.formTitle.textContent = `Edit ${row.supplier_id}`;
    els.cancelEdit.hidden = false;
    els.statusLifecycle.hidden = false;
    document.getElementById("register-supplier").textContent = "Save changes";
    els.form.name.value = row.name;
    els.form.country.value = row.country;
    els.form.status.value = row.status;
    setCategories(row.product_categories);
    els.form.emergency_surcharge_pct.value = row.emergency_surcharge_pct;
    els.form.scrollIntoView({ behavior: "smooth", block: "start" });
}

let listedSuppliers = [];

function showListMessage(message, isError) {
    els.listStatus.textContent = message;
    els.listStatus.className = isError ? "text-error" : "status-busy";
}

async function api(path, options) {
    const headers = { ...(options && options.headers) };
    const response = await fetch(path, { ...options, headers });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(errorDetail(body, `Request failed (${response.status})`));
    }
    return body;
}

function renderRows(rows) {
    listedSuppliers = rows;
    if (!rows.length) {
        els.tableBody.innerHTML = '<tr><td colspan="6">No suppliers match these filters.</td></tr>';
        return;
    }
    els.tableBody.innerHTML = rows
        .map((row) => {
            const suspended = row.status === "inactive";
            const rowKind = suspended ? "suspended" : row.status;
            const badgeLabel = suspended ? "suspended" : row.status;
            return `<tr class="supplier-row supplier-row--${escapeHtml(rowKind)}" data-id="${escapeHtml(row.id)}" data-supplier-id="${escapeHtml(row.supplier_id)}">
                <td>
                    <strong>${escapeHtml(row.name)}</strong>
                    <span class="status-pill status-${escapeHtml(row.status)}${suspended ? " status-suspended" : ""}" title="CONTEXT status: ${escapeHtml(row.status)}">${escapeHtml(badgeLabel)}</span>
                </td>
                <td>${escapeHtml(row.country)}</td>
                <td>${escapeHtml((row.product_categories || []).join(", "))}</td>
                <td>
                    <div class="rate-update">
                        <input type="number" step="0.01" data-rate-input value="${escapeHtml(row.emergency_surcharge_pct)}" aria-label="emergency_surcharge_pct for ${escapeHtml(row.name)}">
                        <button type="button" class="btn-primary btn-compact" data-action="update-rate">Update rate</button>
                    </div>
                </td>
                <td>
                    <div class="status-controls">
                        <span class="status-pill status-${escapeHtml(row.status)}${suspended ? " status-suspended" : ""}" title="CONTEXT status: ${escapeHtml(row.status)}">${escapeHtml(badgeLabel)}</span>
                        <button type="button" class="btn-primary btn-compact" data-action="set-status" data-status="active" ${row.status === "active" ? "disabled" : ""}>Activate</button>
                        <button type="button" class="btn-secondary btn-compact" data-action="set-status" data-status="suspend" ${row.status === "inactive" ? "disabled" : ""}>Suspend</button>
                    </div>
                </td>
                <td>
                    <button type="button" class="btn-secondary btn-compact" data-action="edit">Edit</button>
                </td>
            </tr>`;
        })
        .join("");
}

function applyUpdatedSupplier(updated) {
    listedSuppliers = listedSuppliers.map((row) => (row.id === updated.id ? updated : row));
    renderRows(listedSuppliers);
}

async function patchSupplierStatus(lookup, nextStatus) {
    const updated = await api(`/suppliers/${encodeURIComponent(lookup)}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
    });
    applyUpdatedSupplier(updated);
    const action = nextStatus === "suspend" ? "suspended (stored as inactive)" : "activated";
    showListMessage(`${updated.name}: ${action} — status is ${updated.status}.`);
    if (els.editingId.value === updated.supplier_id) {
        els.form.status.value = updated.status;
    }
    return updated;
}

async function loadSuppliers() {
    showListMessage("Loading suppliers...");
    const params = new URLSearchParams();
    if (els.filterCountry.value) params.set("country", els.filterCountry.value);
    if (els.filterCategory.value) params.set("category", els.filterCategory.value);
    if (els.filterStatus.value) params.set("status", els.filterStatus.value);
    const query = params.toString();
    try {
        const rows = await api(`/suppliers${query ? `?${query}` : ""}`);
        renderRows(rows);
        showListMessage(`${rows.length} supplier${rows.length === 1 ? "" : "s"}`);
    } catch (error) {
        els.tableBody.innerHTML = `<tr><td colspan="6" class="text-error">${escapeHtml(error.message)}</td></tr>`;
        showListMessage("");
    }
}

fillSelect(els.filterCountry, COUNTRIES, "All countries");
fillSelect(els.filterCategory, PRODUCT_CATEGORIES, "All categories");
fillSelect(els.filterStatus, STATUSES, "All statuses");
fillSelect(els.form.country, COUNTRIES);
fillSelect(els.form.status, STATUSES);
renderCategoryCheckboxes();
els.categoryBox.addEventListener("change", syncRateFromCategories);
resetForm();

els.applyFilters.addEventListener("click", () => loadSuppliers());
els.resetFilters.addEventListener("click", () => {
    els.filterCountry.value = "";
    els.filterCategory.value = "";
    els.filterStatus.value = "";
    loadSuppliers();
});
els.cancelEdit.addEventListener("click", resetForm);

els.tableBody.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const row = button.closest("tr");
    const supplierId = row && row.dataset.supplierId;
    if (!supplierId) return;
    if (button.dataset.action === "edit") {
        try {
            fillForm(await api(`/suppliers/${encodeURIComponent(supplierId)}`));
        } catch (error) {
            showListMessage(error.message, true);
        }
        return;
    }
    if (button.dataset.action === "update-rate") {
        const tinydbId = row.dataset.id;
        const input = row.querySelector("[data-rate-input]");
        button.disabled = true;
        try {
            const updated = await api(`/suppliers/${encodeURIComponent(tinydbId)}/rate`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ emergency_surcharge_pct: Number(input.value) }),
            });
            applyUpdatedSupplier(updated);
            showListMessage(
                `${updated.name}: emergency_surcharge_pct is now ${updated.emergency_surcharge_pct}.`,
            );
        } catch (error) {
            showListMessage(error.message || "The API rejected this rate.", true);
        } finally {
            button.disabled = false;
        }
        return;
    }
    if (button.dataset.action === "set-status") {
        const lookup = row.dataset.id;
        const nextStatus = button.dataset.status;
        button.disabled = true;
        try {
            await patchSupplierStatus(lookup, nextStatus);
        } catch (error) {
            showListMessage(error.message || "The API rejected this status.", true);
            button.disabled = false;
        }
        return;
    }
});

els.statusLifecycle.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action='set-status']");
    if (!button || !els.editingId.value) return;
    button.disabled = true;
    try {
        await patchSupplierStatus(els.editingId.value, button.dataset.status);
        showFormSuccess(`Status updated to ${els.form.status.value}.`);
    } catch (error) {
        showFormError(error.message || "The API rejected this status.");
    } finally {
        button.disabled = false;
    }
});

els.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = formPayload();
    const supplierId = els.editingId.value;
    showFormBusy(supplierId ? "Saving changes..." : "Registering supplier...");
    try {
        if (supplierId) {
            await api(`/suppliers/${encodeURIComponent(supplierId)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            await loadSuppliers();
            resetForm();
            showFormSuccess(`Updated ${supplierId}.`);
            return;
        }
        const created = await api("/suppliers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        await loadSuppliers();
        resetForm();
        showFormSuccess(`Registered ${created.name} (${created.supplier_id}).`);
    } catch (error) {
        showFormError(error.message || "The API rejected this supplier.");
    }
});

loadSuppliers();
