const apiBaseInput = document.getElementById("apiBaseUrl");
const fileInput = document.getElementById("csvFile");
const analyzeBtn = document.getElementById("analyzeBtn");
const exportBtn = document.getElementById("exportBtn");
const statusEl = document.getElementById("status");
const resultsSection = document.getElementById("results");

const totalRecords = document.getElementById("totalRecords");
const validRecords = document.getElementById("validRecords");
const invalidRecords = document.getElementById("invalidRecords");
const avgSatisfaction = document.getElementById("avgSatisfaction");

const categoryList = document.getElementById("categoryList");
const statusList = document.getElementById("statusList");
const countryList = document.getElementById("countryList");
const invalidList = document.getElementById("invalidList");
const satisfactionList = document.getElementById("satisfactionList");

let hasResults = false;

function normalizeApiBaseUrl(raw) {
  return (raw || "").trim().replace(/\/+$/, "");
}

function detectCodespacesApiBaseUrl() {
  const host = window.location.hostname || "";
  const match = host.match(/^(?<prefix>.+)-(?:\d+)\.app\.github\.dev$/);
  if (!match || !match.groups || !match.groups.prefix) {
    return "";
  }

  return `https://${match.groups.prefix}-8000.app.github.dev`;
}

function resolveInitialApiBaseUrl() {
  const fromQuery = new URLSearchParams(window.location.search).get("apiBaseUrl");
  if (fromQuery) {
    return normalizeApiBaseUrl(fromQuery);
  }

  const codespacesUrl = detectCodespacesApiBaseUrl();
  if (codespacesUrl) {
    return normalizeApiBaseUrl(codespacesUrl);
  }

  const fromStorage = window.localStorage.getItem("trackflow.apiBaseUrl");
  if (fromStorage) {
    return normalizeApiBaseUrl(fromStorage);
  }

  return "http://127.0.0.1:8000";
}

apiBaseInput.value = resolveInitialApiBaseUrl();

apiBaseInput.addEventListener("change", () => {
  apiBaseInput.value = normalizeApiBaseUrl(apiBaseInput.value);
  window.localStorage.setItem("trackflow.apiBaseUrl", apiBaseInput.value);
});

function setStatus(message, kind = "idle") {
  statusEl.textContent = message;
  statusEl.className = `status ${kind}`;
}

function fillList(element, entries) {
  element.innerHTML = "";
  entries.forEach(([key, value]) => {
    const li = document.createElement("li");
    const left = document.createElement("span");
    left.textContent = key;
    const right = document.createElement("strong");
    right.textContent = String(value);
    li.appendChild(left);
    li.appendChild(right);
    element.appendChild(li);
  });
}

function renderResults(data) {
  totalRecords.textContent = data.total_records;
  validRecords.textContent = data.valid_records;
  invalidRecords.textContent = data.invalid_records;
  avgSatisfaction.textContent = `${data.satisfaction_index.average_score.toFixed(2)} / 5.00`;

  fillList(categoryList, Object.entries(data.breakdown_by_category));
  fillList(statusList, Object.entries(data.breakdown_by_status));
  fillList(countryList, Object.entries(data.breakdown_by_country));
  fillList(invalidList, Object.entries(data.invalid_breakdown));
  fillList(satisfactionList, Object.entries(data.satisfaction_index.distribution));

  resultsSection.classList.remove("hidden");
}

analyzeBtn.addEventListener("click", async () => {
  const file = fileInput.files[0];
  if (!file) {
    setStatus("Please select a CSV file.", "error");
    return;
  }

  setStatus("Analyzing file...", "idle");
  analyzeBtn.disabled = true;

  try {
    const apiBaseUrl = normalizeApiBaseUrl(apiBaseInput.value);
    if (!apiBaseUrl) {
      throw new Error("API Base URL is required.");
    }

    window.localStorage.setItem("trackflow.apiBaseUrl", apiBaseUrl);

    const form = new FormData();
    form.append("file", file);

    const response = await fetch(`${apiBaseUrl}/api/incidents/analyze`, {
      method: "POST",
      body: form,
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.detail || "Analysis failed.");
    }

    renderResults(payload);
    hasResults = true;
    exportBtn.disabled = false;
    setStatus("Analysis completed.", "success");
  } catch (error) {
    setStatus(error.message || "Unexpected error during analysis.", "error");
  } finally {
    analyzeBtn.disabled = false;
  }
});

exportBtn.addEventListener("click", async () => {
  if (!hasResults) {
    setStatus("Run an analysis before exporting.", "error");
    return;
  }

  setStatus("Preparing export...", "idle");

  try {
    const apiBaseUrl = normalizeApiBaseUrl(apiBaseInput.value);
    if (!apiBaseUrl) {
      throw new Error("API Base URL is required.");
    }

    window.localStorage.setItem("trackflow.apiBaseUrl", apiBaseUrl);

    const response = await fetch(`${apiBaseUrl}/api/incidents/results/export`);
    if (!response.ok) {
      const payload = await response.json();
      throw new Error(payload.detail || "Export failed.");
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "results.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);

    setStatus("Export downloaded.", "success");
  } catch (error) {
    setStatus(error.message || "Unexpected export error.", "error");
  }
});
