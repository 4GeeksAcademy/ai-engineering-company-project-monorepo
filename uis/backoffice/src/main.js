import './styles.css';

const apiBaseUrl = import.meta.env.VITE_API_URL || '/api';
const validCategories = [
  'carrier_last_mile',
  'carrier_international',
  'warehouse_supplies',
  'packaging_materials',
  'reverse_logistics',
  'fleet_maintenance',
  'it_and_wms_software',
  'cleaning_and_facilities',
];

const state = {
  suppliers: [],
  filters: {
    country: '',
    category: '',
  },
  form: {
    name: '',
    country: 'USA',
    categories: ['carrier_last_mile'],
    rate_per_shipment: '',
    currency: 'USD',
    status: 'active',
    service_zone: '',
    contact_email: '',
    notes: '',
  },
  feedback: '',
  error: '',
};

const app = document.querySelector('#app');

function syncCurrencyWithCountry(country) {
  state.form.country = country;
  state.form.currency = country === 'USA' ? 'USD' : 'EUR';
}

function buildQueryString() {
  const params = new URLSearchParams();
  if (state.filters.country) {
    params.set('country', state.filters.country);
  }
  if (state.filters.category) {
    params.set('category', state.filters.category);
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

async function request(path, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (response.status === 204) {
    return null;
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(formatApiError(data));
  }

  return data;
}

function formatApiError(payload) {
  if (!payload) {
    return 'Unexpected API error.';
  }

  if (typeof payload.detail === 'string') {
    return payload.detail;
  }

  if (Array.isArray(payload.detail)) {
    return payload.detail
      .map((item) => {
        if (item.msg && item.loc) {
          return `${item.loc.join('.')} - ${item.msg}`;
        }
        return JSON.stringify(item);
      })
      .join(' | ');
  }

  return JSON.stringify(payload);
}

async function loadSuppliers() {
  state.error = '';
  try {
    state.suppliers = await request(`/suppliers${buildQueryString()}`, { method: 'GET' });
  } catch (error) {
    state.error = error.message;
  }
  render();
}

async function handleCreateSupplier(event) {
  event.preventDefault();
  state.feedback = '';
  state.error = '';

  const payload = {
    ...state.form,
    rate_per_shipment: Number(state.form.rate_per_shipment),
  };

  try {
    await request('/suppliers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    state.feedback = 'Supplier created successfully.';
    state.form = {
      name: '',
      country: 'USA',
      categories: ['carrier_last_mile'],
      rate_per_shipment: '',
      currency: 'USD',
      status: 'active',
      service_zone: '',
      contact_email: '',
      notes: '',
    };
    await loadSuppliers();
  } catch (error) {
    state.error = error.message;
    render();
  }
}

async function handleRateUpdate(supplierId) {
  const input = document.querySelector(`[data-rate-input="${supplierId}"]`);
  if (!input) {
    return;
  }

  state.feedback = '';
  state.error = '';

  try {
    await request(`/suppliers/${supplierId}/rate`, {
      method: 'PATCH',
      body: JSON.stringify({ rate_per_shipment: Number(input.value) }),
    });
    state.feedback = 'Rate updated successfully.';
    await loadSuppliers();
  } catch (error) {
    state.error = error.message;
    render();
  }
}

async function handleStatusToggle(supplier) {
  const nextStatus = supplier.status === 'active' ? 'suspended' : 'active';
  state.feedback = '';
  state.error = '';

  try {
    await request(`/suppliers/${supplier.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: nextStatus }),
    });
    state.feedback = `Supplier marked as ${nextStatus}.`;
    await loadSuppliers();
  } catch (error) {
    state.error = error.message;
    render();
  }
}

function handleCountryFilterChange(value) {
  state.filters.country = value;
  loadSuppliers();
}

function handleCategoryFilterChange(value) {
  state.filters.category = value;
  loadSuppliers();
}

function handleCategorySelection(selectElement) {
  state.form.categories = Array.from(selectElement.selectedOptions).map((option) => option.value);
}

function renderSuppliers() {
  if (!state.suppliers.length) {
    return '<p class="empty-state">No suppliers match the current filters.</p>';
  }

  return state.suppliers
    .map(
      (supplier) => `
        <article class="supplier-card supplier-card--${supplier.status}">
          <div class="supplier-card__header">
            <div>
              <h3>${supplier.name}</h3>
              <p>${supplier.country}</p>
            </div>
            <span class="status-badge status-badge--${supplier.status}">${supplier.status}</span>
          </div>
          <p class="supplier-card__categories">${supplier.categories.join(', ')}</p>
          <dl class="supplier-card__meta">
            <div><dt>Rate</dt><dd>${supplier.rate_per_shipment} ${supplier.currency}</dd></div>
            <div><dt>Updated</dt><dd>${new Date(supplier.updated_at).toLocaleString()}</dd></div>
            <div><dt>Zone</dt><dd>${supplier.service_zone || 'N/A'}</dd></div>
            <div><dt>Contact</dt><dd>${supplier.contact_email || 'N/A'}</dd></div>
          </dl>
          <p class="supplier-card__notes">${supplier.notes || 'No notes.'}</p>
          <div class="supplier-card__actions">
            <label>
              New rate
              <input data-rate-input="${supplier.id}" type="number" min="0.01" step="0.01" value="${supplier.rate_per_shipment}" />
            </label>
            <button data-action="rate" data-supplier-id="${supplier.id}">Save rate</button>
            <button data-action="status" data-supplier-id="${supplier.id}">${supplier.status === 'active' ? 'Suspend' : 'Reactivate'}</button>
          </div>
        </article>
      `,
    )
    .join('');
}

function render() {
  app.innerHTML = `
    <main class="layout">
      <section class="hero">
        <p class="eyebrow">TrackFlow Backoffice</p>
        <h1>Supplier Directory</h1>
        <p class="hero__copy">Centralized operations view for USA and Spain suppliers.</p>
      </section>

      <section class="panel panel--filters">
        <div>
          <label for="country-filter">Country</label>
          <select id="country-filter">
            <option value="">All countries</option>
            <option value="USA" ${state.filters.country === 'USA' ? 'selected' : ''}>USA</option>
            <option value="Spain" ${state.filters.country === 'Spain' ? 'selected' : ''}>Spain</option>
          </select>
        </div>
        <div>
          <label for="category-filter">Category</label>
          <select id="category-filter">
            <option value="">All categories</option>
            ${validCategories
              .map(
                (category) =>
                  `<option value="${category}" ${state.filters.category === category ? 'selected' : ''}>${category}</option>`,
              )
              .join('')}
          </select>
        </div>
      </section>

      <section class="panel panel--form">
        <div>
          <h2>Register supplier</h2>
          <p>Add a new supplier with the exact TrackFlow contract fields.</p>
        </div>
        <form id="supplier-form" class="supplier-form">
          <label>
            Name
            <input name="name" value="${state.form.name}" required />
          </label>
          <label>
            Country
            <select name="country">
              <option value="USA" ${state.form.country === 'USA' ? 'selected' : ''}>USA</option>
              <option value="Spain" ${state.form.country === 'Spain' ? 'selected' : ''}>Spain</option>
            </select>
          </label>
          <label>
            Currency
            <input name="currency" value="${state.form.currency}" readonly />
          </label>
          <label>
            Categories
            <select id="categories" name="categories" multiple size="5">
              ${validCategories
                .map(
                  (category) =>
                    `<option value="${category}" ${state.form.categories.includes(category) ? 'selected' : ''}>${category}</option>`,
                )
                .join('')}
            </select>
          </label>
          <label>
            Rate per shipment
            <input name="rate_per_shipment" type="number" step="0.01" min="0.01" value="${state.form.rate_per_shipment}" required />
          </label>
          <label>
            Status
            <select name="status">
              <option value="active" ${state.form.status === 'active' ? 'selected' : ''}>active</option>
              <option value="suspended" ${state.form.status === 'suspended' ? 'selected' : ''}>suspended</option>
            </select>
          </label>
          <label>
            Service zone
            <input name="service_zone" value="${state.form.service_zone}" />
          </label>
          <label>
            Contact email
            <input name="contact_email" value="${state.form.contact_email}" />
          </label>
          <label class="supplier-form__notes">
            Notes
            <textarea name="notes">${state.form.notes}</textarea>
          </label>
          <button type="submit">Create supplier</button>
        </form>
      </section>

      <section class="feedback-area">
        ${state.feedback ? `<p class="feedback feedback--success">${state.feedback}</p>` : ''}
        ${state.error ? `<p class="feedback feedback--error">${state.error}</p>` : ''}
      </section>

      <section class="supplier-grid">
        ${renderSuppliers()}
      </section>
    </main>
  `;

  document.querySelector('#country-filter').addEventListener('change', (event) => {
    handleCountryFilterChange(event.target.value);
  });

  document.querySelector('#category-filter').addEventListener('change', (event) => {
    handleCategoryFilterChange(event.target.value);
  });

  const supplierForm = document.querySelector('#supplier-form');
  supplierForm.addEventListener('submit', handleCreateSupplier);
  supplierForm.addEventListener('input', (event) => {
    const { name, value } = event.target;
    if (name === 'country') {
      syncCurrencyWithCountry(value);
      render();
      return;
    }
    if (name !== 'categories') {
      state.form[name] = value;
    }
  });

  document.querySelector('#categories').addEventListener('change', (event) => {
    handleCategorySelection(event.target);
  });

  document.querySelectorAll('[data-action="rate"]').forEach((button) => {
    button.addEventListener('click', () => handleRateUpdate(button.dataset.supplierId));
  });

  document.querySelectorAll('[data-action="status"]').forEach((button) => {
    button.addEventListener('click', () => {
      const supplierId = Number(button.dataset.supplierId);
      const supplier = state.suppliers.find((item) => item.id === supplierId);
      if (supplier) {
        handleStatusToggle(supplier);
      }
    });
  });
}

syncCurrencyWithCountry('USA');
render();
loadSuppliers();
