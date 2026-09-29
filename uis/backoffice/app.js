const API_URL = "http://127.0.0.1:8000/api/incidents/analyze";
const EXPORT_URL = "http://127.0.0.1:8000/api/incidents/results/export";

const dropZone = document.querySelector("#drop-zone");
const fileInput = document.querySelector("#file-input");
const browseButton = document.querySelector("#browse-button");
const analyzeButton = document.querySelector("#analyze-button");
const selectedFile = document.querySelector("#selected-file");
const dropTitle = document.querySelector("#drop-title");
const fileMeta = document.querySelector("#file-meta");
const errorBanner = document.querySelector("#error-banner");
const metricGrid = document.querySelector("#metric-grid");
const detailGrid = document.querySelector("#detail-grid");
const resultState = document.querySelector("#result-state");
const downloadButton = document.querySelector("#download-button");
let selectedCsv = null;

function showError(message) {
  errorBanner.textContent = message;
  errorBanner.hidden = false;
}

function clearError() {
  errorBanner.hidden = true;
  errorBanner.textContent = "";
}

function selectFile(file) {
  clearError();
  if (!file) return;
  if (!file.name.toLowerCase().endsWith(".csv")) {
    showError("Selecciona un fichero con extensión .csv.");
    return;
  }
  selectedCsv = file;
  selectedFile.textContent = `${file.name} · ${formatBytes(file.size)}`;
  dropTitle.textContent = "Fichero listo para analizar";
  fileMeta.textContent = "Revisa el nombre y lanza el análisis cuando quieras.";
  analyzeButton.disabled = false;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function metricCard(label, value, note, muted = false) {
  return `<article class="metric-card${muted ? " muted" : ""}"><span>${label}</span><strong>${value ?? "—"}</strong><small>${note}</small></article>`;
}

function listRows(values) {
  const entries = Object.entries(values || {});
  if (!entries.length) return "<div class=\"empty-state\">No hay registros válidos</div>";
  const max = Math.max(...entries.map(([, value]) => value), 1);
  return entries.map(([label, count]) => `<div class="bar-row"><span>${label}</span><div class="bar-track"><div class="bar-fill" style="width:${(count / max) * 100}%"></div></div><span class="bar-count">${count}</span></div>`).join("");
}

function issueRows(issues) {
  const entries = Object.entries(issues || {});
  if (!entries.length) return "<div class=\"empty-state valid-state\">No hay registros inválidos</div>";
  return entries.map(([issue, detail]) => `<div class="issue-row"><span>${issue}</span><strong>${detail.count}</strong><small>fila(s): ${detail.rows.join(", ")}</small></div>`).join("");
}

function renderResults(summary) {
  const satisfaction = summary.average_satisfaction_closed === null ? "—" : Number(summary.average_satisfaction_closed).toFixed(2);
  metricGrid.innerHTML = [
    metricCard("Total procesados", summary.total_processed, "todos los registros"),
    metricCard("Registros válidos", summary.valid_records, "listos para métricas"),
    metricCard("Registros inválidos", summary.invalid_records, `${Object.keys(summary.validation_issues || {}).length} tipo(s) de problema`),
    metricCard("Satisfacción media", satisfaction, `${summary.satisfaction_scored_closed_cases} caso(s) cerrado(s) puntuado(s)`),
  ].join("");
  detailGrid.innerHTML = `<article class="detail-card"><div class="card-title"><span>Por categoría</span><span class="card-label">VALIDADOS</span></div>${listRows(summary.by_category)}</article><article class="detail-card"><div class="card-title"><span>Por estado</span><span class="card-label">VALIDADOS</span></div>${listRows(summary.by_status)}</article><article class="detail-card issues-card"><div class="card-title"><span>Registros inválidos</span><span class="card-label warning-label">REVISIÓN</span></div>${issueRows(summary.validation_issues)}</article>`;
  resultState.textContent = `${summary.total_processed} registros analizados`;
  resultState.style.color = "var(--teal)";
  resultState.style.background = "var(--mint)";
  downloadButton.disabled = false;
}

async function downloadResults() {
  clearError();
  downloadButton.disabled = true;
  downloadButton.innerHTML = "<span aria-hidden=\"true\">↻</span> Preparando...";
  try {
    const response = await fetch(EXPORT_URL);
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.detail || "No hay resultados disponibles para descargar.");
    }
    const blob = await response.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "results.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
  } catch (error) {
    showError(error.message || "No se pudo descargar el CSV.");
  } finally {
    downloadButton.disabled = false;
    downloadButton.innerHTML = "<span aria-hidden=\"true\">↓</span> Descargar CSV";
  }
}

async function analyzeFile() {
  if (!selectedCsv) return;
  clearError();
  analyzeButton.disabled = true;
  analyzeButton.innerHTML = "<span class=\"button-arrow\">↻</span>Analizando...";
  resultState.textContent = "Procesando fichero";
  try {
    const formData = new FormData();
    formData.append("file", selectedCsv);
    const response = await fetch(API_URL, { method: "POST", body: formData });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.detail || "La API no pudo procesar el fichero.");
    renderResults(payload);
    document.querySelector("#results").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    resultState.textContent = "Análisis fallido";
    showError(error.message || "No se pudo conectar con la API.");
  } finally {
    analyzeButton.disabled = !selectedCsv;
    analyzeButton.innerHTML = "<span class=\"button-arrow\">↗</span>Analizar fichero";
  }
}

browseButton.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (event) => selectFile(event.target.files[0]));
dropZone.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") { event.preventDefault(); fileInput.click(); }
});
["dragenter", "dragover"].forEach((eventName) => dropZone.addEventListener(eventName, (event) => { event.preventDefault(); dropZone.classList.add("dragging"); }));
["dragleave", "drop"].forEach((eventName) => dropZone.addEventListener(eventName, (event) => { event.preventDefault(); dropZone.classList.remove("dragging"); }));
dropZone.addEventListener("drop", (event) => selectFile(event.dataTransfer.files[0]));
analyzeButton.addEventListener("click", analyzeFile);
downloadButton.addEventListener("click", downloadResults);
