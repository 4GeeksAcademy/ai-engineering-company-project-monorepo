(() => {
  const API_BASE = "http://127.0.0.1:8000";

  const INVALID_LABELS = {
    invalid_clinic_id: "Invalid or missing clinic_id",
    country_clinic_mismatch: "Country/clinic mismatch",
    invalid_category: "Invalid or missing category",
    empty_description: "Empty description",
    missing_patient_id: "Missing patient_id",
    closed_without_score: "Closed case, no score",
    score_out_of_range: "Satisfaction score out of range",
  };

  const SCORE_LABELS = {
    1: "Very dissatisfied",
    2: "Dissatisfied",
    3: "Neutral",
    4: "Satisfied",
    5: "Very satisfied",
  };

  const form = document.getElementById("upload-form");
  const fileInput = document.getElementById("file-input");
  const dropzone = document.getElementById("dropzone");
  const fileName = document.getElementById("file-name");
  const statusMsg = document.getElementById("status-msg");
  const results = document.getElementById("results");
  const exportBtn = document.getElementById("export-btn");
  const analyzeBtn = document.getElementById("analyze-btn");

  let selectedFile = null;

  const setStatus = (message, kind = "") => {
    statusMsg.textContent = message;
    statusMsg.classList.remove("is-error", "is-ok");
    if (kind) statusMsg.classList.add(kind);
  };

  const pct = (part, whole) =>
    whole > 0 ? `${((part / whole) * 100).toFixed(1)}%` : "0.0%";

  const renderList = (element, entries) => {
    element.innerHTML = entries
      .map(
        ([label, value]) =>
          `<li><span>${label}</span><strong>${value}</strong></li>`
      )
      .join("");
  };

  const renderResults = (data) => {
    const general = document.getElementById("general-metrics");
    general.innerHTML = [
      ["Total records", data.total_records],
      ["Valid", data.valid_count],
      ["Invalid", data.invalid_count],
    ]
      .map(
        ([label, value]) =>
          `<div class="metric"><strong>${value}</strong><span>${label}</span></div>`
      )
      .join("");

    const ruleOrder = [
      "invalid_clinic_id",
      "country_clinic_mismatch",
      "invalid_category",
      "empty_description",
      "missing_patient_id",
      "closed_without_score",
      "score_out_of_range",
    ];
    const invalidEntries = ruleOrder
      .filter((key) => {
        const count = data.invalid_by_rule?.[key] || 0;
        return key !== "score_out_of_range" || count > 0;
      })
      .map((key) => [INVALID_LABELS[key] || key, data.invalid_by_rule?.[key] || 0]);

    if (data.invalid_count === 0) {
      renderList(document.getElementById("invalid-list"), [
        ["No invalid records detected", "0"],
      ]);
    } else {
      renderList(document.getElementById("invalid-list"), invalidEntries);
    }

    renderList(
      document.getElementById("category-list"),
      Object.entries(data.category_counts || {}).map(([key, count]) => [
        key,
        `${count} (${pct(count, data.valid_count)})`,
      ])
    );

    renderList(
      document.getElementById("status-list"),
      Object.entries(data.status_counts || {}).map(([key, count]) => [
        key,
        `${count} (${pct(count, data.valid_count)})`,
      ])
    );

    renderList(
      document.getElementById("country-list"),
      Object.entries(data.country_counts || {}).map(([key, count]) => [
        key,
        `${count} (${pct(count, data.valid_count)})`,
      ])
    );

    const satisfaction = data.satisfaction || {};
    const average =
      satisfaction.average === null || satisfaction.average === undefined
        ? "n/a"
        : Number(satisfaction.average).toFixed(2);
    document.getElementById("satisfaction-summary").textContent =
      `Scored cases: ${satisfaction.scored_cases ?? 0} of ` +
      `${satisfaction.closed_cases ?? 0}. Average score: ${average} / 5.00`;

    const scoreCounts = satisfaction.score_counts || {};
    renderList(
      document.getElementById("satisfaction-list"),
      [1, 2, 3, 4, 5].map((score) => [
        `Score ${score} (${SCORE_LABELS[score]})`,
        scoreCounts[String(score)] ?? scoreCounts[score] ?? 0,
      ])
    );

    results.classList.remove("is-hidden");
    exportBtn.disabled = false;
  };

  fileInput.addEventListener("change", () => {
    selectedFile = fileInput.files?.[0] || null;
    fileName.textContent = selectedFile ? selectedFile.name : "No file selected";
  });

  ;["dragenter", "dragover"].forEach((eventName) => {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.add("is-dragover");
    });
  });

  ;["dragleave", "drop"].forEach((eventName) => {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.remove("is-dragover");
    });
  });

  dropzone.addEventListener("drop", (event) => {
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    selectedFile = file;
    fileName.textContent = file.name;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    fileInput.files = transfer.files;
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const file = selectedFile || fileInput.files?.[0];
    if (!file) {
      setStatus("Choose a CSV file before analyzing.", "is-error");
      return;
    }

    analyzeBtn.disabled = true;
    setStatus("Analyzing…");

    const body = new FormData();
    body.append("file", file, file.name);

    try {
      const response = await fetch(`${API_BASE}/api/incidents/analyze`, {
        method: "POST",
        body,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = payload.detail || "Analysis failed.";
        throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
      }
      renderResults(payload);
      setStatus(
        payload.invalid_count > 0
          ? `Analysis complete. ${payload.invalid_count} invalid record(s) found.`
          : "Analysis complete. No invalid records.",
        "is-ok"
      );
    } catch (error) {
      results.classList.add("is-hidden");
      exportBtn.disabled = true;
      setStatus(error.message || "Unable to reach the API.", "is-error");
    } finally {
      analyzeBtn.disabled = false;
    }
  });

  exportBtn.addEventListener("click", async () => {
    try {
      const response = await fetch(`${API_BASE}/api/incidents/results/export`);
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail || "Export failed.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "results.csv";
      anchor.click();
      URL.revokeObjectURL(url);
      setStatus("Results CSV downloaded.", "is-ok");
    } catch (error) {
      setStatus(error.message || "Export failed.", "is-error");
    }
  });
})();
