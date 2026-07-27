import {
  utilityFunctionCatalog as functionCatalog,
  type FunctionRunnerInput,
  type UtilityResult,
} from "./utility-registry";

type Lang = "en" | "es";
type DataFormat = "auto" | "json" | "csv" | "tsv" | "yaml" | "text";
type StatusKind = "error" | "success" | "info";

/** JSON-like value produced by parsing user input (JSON, CSV, YAML, etc.). */
type ParsedValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | ParsedValue[]
  | { [key: string]: ParsedValue };

/** One row from delimited (CSV/TSV) input, with camelCase-normalized keys. */
type DelimitedRow = { [key: string]: ParsedValue };

/** A value in a utility function input object — parsed JSON or fixture entity data. */
type InputValue =
  | ParsedValue
  | Claim
  | Claim[]
  | Appointment
  | Appointment[]
  | Clinician
  | Clinician[]
  | ClinicLocation
  | FilterType;

/** Coerce parsed input to a domain type at the utility runner boundary. */
function castInput<T>(value: InputValue | undefined): T {
  return value as unknown as T;
}

type I18nEntry = {
  ready: string;
  loaded: string;
  noFunction: string;
  noData: string;
  unsupported: string;
  parseError: string;
  runOk: string;
  runError: string;
  templateLoaded: string;
  templateMissing: string;
  templateTitle: string;
  hintPrefix: string;
  missingAsOfDate: string;
};

function requireElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Utility tester page is missing required DOM element: #${id}`);
  }
  return element as T;
}

const formatSelect = requireElement<HTMLSelectElement>("data-format");
const functionSelect = requireElement<HTMLSelectElement>("utility-function");
const textInput = requireElement<HTMLTextAreaElement>("test-data-input");
const fileInput = requireElement<HTMLInputElement>("test-data-file");
const runButton = requireElement<HTMLButtonElement>("run-test");
const templateButton = requireElement<HTMLButtonElement>("load-template");
const clearButton = requireElement<HTMLButtonElement>("clear-test");
const resultBox = requireElement<HTMLElement>("test-result");
const statusBox = requireElement<HTMLElement>("test-status");
const hintBox = requireElement<HTMLElement>("function-hint");

const i18n: Record<Lang, I18nEntry> = {
  en: {
    ready: "Ready to run.",
    loaded: "Data loaded from file.",
    noFunction: "Select a utility function first.",
    noData: "Provide input data in the textarea or upload a file.",
    unsupported: "Unsupported file type. Use JSON, CSV, TSV, YAML, or TXT.",
    parseError: "Could not parse input data:",
    runOk: "Function executed successfully.",
    runError: "Function execution failed:",
    templateLoaded: "Template loaded for selected function.",
    templateMissing: "No template found for this function.",
    templateTitle: "Input template:",
    hintPrefix: "Expected input:",
    missingAsOfDate: "For this function, provide an asOfDate value (YYYY-MM-DD).",
  },
  es: {
    ready: "Listo para ejecutar.",
    loaded: "Datos cargados desde archivo.",
    noFunction: "Selecciona una funcion utilitaria primero.",
    noData: "Proporciona datos de entrada en el area de texto o sube un archivo.",
    unsupported: "Tipo de archivo no soportado. Usa JSON, CSV, TSV, YAML o TXT.",
    parseError: "No se pudieron interpretar los datos de entrada:",
    runOk: "Funcion ejecutada correctamente.",
    runError: "La ejecucion de la funcion fallo:",
    templateLoaded: "Plantilla cargada para la funcion seleccionada.",
    templateMissing: "No se encontro plantilla para esta funcion.",
    templateTitle: "Plantilla de entrada:",
    hintPrefix: "Entrada esperada:",
    missingAsOfDate: "Para esta funcion, proporciona un valor asOfDate (YYYY-MM-DD).",
  },
};


function getCurrentLang(): Lang {
  return document.documentElement.getAttribute("data-current-lang") === "es" ? "es" : "en";
}

function t(key: keyof I18nEntry): string {
  return i18n[getCurrentLang()][key];
}

function stringifyResult(value: UtilityResult): string {
  if (value === undefined) return "undefined";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function parseScalar(raw: string): string | boolean | null | undefined | number {
  const value = raw.trim();
  if (value === "") return "";
  if (value === "true" || value === "false" || value === "null") return JSON.parse(value);
  if (value === "undefined") return undefined;
  if (!Number.isNaN(Number(value)) && /^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  const quoted = value.match(/^(?:["'])(.*)(?:["'])$/);
  return quoted ? quoted[1] : value;
}

function parseDelimitedLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

function stripTrailingCommas(text: string): string {
  return text.replace(/,\s*([}\]])/g, "$1");
}

function parseJsonLike(text: string): ParsedValue {
  try {
    return JSON.parse(text);
  } catch (jsonError) {
    const sanitized = stripTrailingCommas(text);
    if (sanitized === text) throw jsonError;
    return JSON.parse(sanitized);
  }
}

function parseMaybeStructuredValue(raw: string): ParsedValue {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^[\[{]/.test(trimmed)) {
    try {
      return parseJsonLike(trimmed);
    } catch {
      return parseScalar(raw);
    }
  }
  return parseScalar(raw);
}

function toCamelCase(value: string): string {
  return value
    .trim()
    .replace(/^[A-Z]/, (char) => char.toLowerCase())
    .replace(/[_-]+([a-zA-Z0-9])/g, (_, char: string) => char.toUpperCase());
}

function normalizeRecordKeys(record: DelimitedRow): DelimitedRow {
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [toCamelCase(String(key)), value]));
}

function isPlainObject(value: ParsedValue): value is DelimitedRow {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseCsv(text: string, delimiter: string): DelimitedRow[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) throw new Error("CSV input must include a header row and at least one data row.");
  if (!lines[0].includes(delimiter)) throw new Error("CSV input must include a delimited header row.");

  const headers = parseDelimitedLine(lines[0], delimiter).map((header) => header.trim());
  if (headers.some((header) => header.length === 0)) throw new Error("CSV input contains an empty header value.");

  return lines.slice(1).map((line) => {
    if (!line.includes(delimiter)) throw new Error("CSV rows must match the header delimiter format.");

    const values = parseDelimitedLine(line, delimiter);
    if (values.length !== headers.length) {
      throw new Error("CSV rows must have the same number of columns as the header.");
    }

    const row: DelimitedRow = {};
    headers.forEach((header, index) => {
      row[header] = parseMaybeStructuredValue(values[index] ?? "");
    });
    return normalizeRecordKeys(row);
  });
}

function normalizeDateValue(value: ParsedValue): ParsedValue {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  return value;
}

function sanitizeParsedInput(value: ParsedValue): ParsedValue {
  const normalized = normalizeDateValue(value);
  if (Array.isArray(normalized)) return normalized.map((item) => sanitizeParsedInput(item));
  if (isPlainObject(normalized)) {
    return Object.fromEntries(Object.entries(normalized).map(([key, entry]) => [key, sanitizeParsedInput(entry)]));
  }
  return normalized;
}

function firstNonEmpty(rows: DelimitedRow[], key: string): ParsedValue | undefined {
  for (const row of rows) {
    const value = row[key];
    if (value === undefined || value === null) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    return value;
  }
  return undefined;
}

function toNumberOrFallback(value: ParsedValue | undefined, fallback: number): number {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function splitListValue(value: ParsedValue | undefined): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value !== "string") return [];
  return value.split(/[|,;]/).map((item) => item.trim()).filter(Boolean);
}

function stripFields(record: DelimitedRow, fields: string[]): DelimitedRow {
  const output = { ...record };
  fields.forEach((field) => {
    delete output[field];
  });
  return output;
}

function normalizeTableInput(functionName: string, rows: DelimitedRow[]): FunctionRunnerInput {
  const normalizedRows = rows.map((row) => normalizeRecordKeys(row));
  if (normalizedRows.length === 0) return { input: [] };

  const keyValueRows = normalizedRows.every(
    (row) => isPlainObject(row) && Object.keys(row).length === 2 && "key" in row && "value" in row
  );

  if (keyValueRows) {
    return normalizedRows.reduce<FunctionRunnerInput>((acc, row) => {
      const key = String(row.key ?? "").trim();
      if (!key) return acc;
      acc[toCamelCase(key)] = row.value;
      return acc;
    }, {});
  }

  switch (functionName) {
    case "generateCMEReport":
    case "getCliniciansAtRisk": {
      const asOfDate = firstNonEmpty(normalizedRows, "asOfDate");
      if (!asOfDate) throw new Error(t("missingAsOfDate"));
      return { clinicians: normalizedRows.map((row) => stripFields(row, ["asOfDate"])), asOfDate };
    }
    case "getCliniciansWithExpiringLicences": {
      const asOfDate = firstNonEmpty(normalizedRows, "asOfDate");
      if (!asOfDate) throw new Error(t("missingAsOfDate"));
      return {
        clinicians: normalizedRows.map((row) => stripFields(row, ["asOfDate", "daysThreshold"])),
        asOfDate,
        daysThreshold: toNumberOrFallback(firstNonEmpty(normalizedRows, "daysThreshold"), 45),
      };
    }
    case "calculateDenialRate":
    case "denialRateByPayer":
    case "denialRateByLocation":
    case "flagHighDenialPayers":
      return {
        claims: normalizedRows.map((row) => stripFields(row, ["threshold"])),
        threshold: toNumberOrFallback(firstNonEmpty(normalizedRows, "threshold"), 8),
      };
    case "filterClaims": {
      const filterKeys = ["locationId", "status", "payerName", "serviceType"];
      const filters = Object.fromEntries(
        filterKeys
          .map((key) => [key, firstNonEmpty(normalizedRows, key)])
          .filter(([, value]) => value !== undefined)
      );
      return { claims: normalizedRows.map((row) => stripFields(row, filterKeys)), filters };
    }
    case "findClaimById":
    case "binarySearchClaimById": {
      const claimId = firstNonEmpty(normalizedRows, "claimId") || firstNonEmpty(normalizedRows, "targetId");
      return {
        claims: normalizedRows.map((row) => stripFields(row, ["claimId", "targetId"])),
        sortedClaims: normalizedRows.map((row) => stripFields(row, ["claimId", "targetId"])),
        claimId,
        targetId: claimId,
      };
    }
    case "validateClaim": {
      const first = normalizedRows[0];
      return { claim: stripFields(first, ["knownLocationIds"]), knownLocationIds: splitListValue(first.knownLocationIds) };
    }
    case "findClinicianById": {
      const clinicianId = firstNonEmpty(normalizedRows, "clinicianId");
      return { clinicians: normalizedRows.map((row) => stripFields(row, ["clinicianId"])), clinicianId };
    }
    case "validateClinician":
      return { clinician: normalizedRows[0] };
    case "noShowRateByLocation":
    case "flagHighNoShowLocations":
    case "filterAppointmentsByStatus":
    case "sortAppointmentsByDate":
      return {
        appointments: normalizedRows.map((row) => stripFields(row, ["threshold", "status", "direction"])),
        threshold: toNumberOrFallback(firstNonEmpty(normalizedRows, "threshold"), 20),
        status: splitListValue(firstNonEmpty(normalizedRows, "status")),
        direction: (firstNonEmpty(normalizedRows, "direction") as string | undefined) || "asc",
      };
    case "calculateNoShowCost": {
      const weekEndingDate = firstNonEmpty(normalizedRows, "weekEndingDate");
      const location: Partial<ClinicLocation> = {
        locationId: firstNonEmpty(normalizedRows, "locationId") as string | undefined,
        name: (firstNonEmpty(normalizedRows, "locationName") || firstNonEmpty(normalizedRows, "name")) as string | undefined,
        city: firstNonEmpty(normalizedRows, "city") as string | undefined,
        stateOrCountry: firstNonEmpty(normalizedRows, "stateOrCountry") as string | undefined,
        country: firstNonEmpty(normalizedRows, "country") as ClinicLocation["country"] | undefined,
        phone: firstNonEmpty(normalizedRows, "phone") as string | undefined,
        averageConsultationFee: {} as ConsultantFee,
      };
      return {
        appointments: normalizedRows.map((row) =>
          stripFields(row, ["weekEndingDate", "locationName", "name", "city", "stateOrCountry", "country", "phone"])
        ),
        location,
        weekEndingDate,
      };
    }
    case "sortClaimsById":
      return {
        claims: normalizedRows.map((row) => stripFields(row, ["direction"])),
        direction: (firstNonEmpty(normalizedRows, "direction") as string | undefined) || "asc",
      };
    case "groupClaimsBy":
      return {
        claims: normalizedRows.map((row) => stripFields(row, ["key"])),
        key: (firstNonEmpty(normalizedRows, "key") as string | undefined) || "payerName",
      };
    case "isDenialRateAboveThreshold":
    case "isNoShowRateAboveThreshold":
      return {
        rate: toNumberOrFallback(firstNonEmpty(normalizedRows, "rate"), 0),
        threshold: toNumberOrFallback(firstNonEmpty(normalizedRows, "threshold"), functionName === "isDenialRateAboveThreshold" ? 8 : 20),
      };
    default:
      return { input: normalizedRows };
  }
}

async function parseYaml(text: string): Promise<ParsedValue> {
  const yamlModuleUrl = "https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/+esm";
  const module = await import(yamlModuleUrl);
  return (module as { load: (input: string) => ParsedValue }).load(text);
}

function inferFormat(fileName: string): DataFormat {
  const extension = fileName.toLowerCase().split(".").pop() ?? "";
  if (extension === "json") return "json";
  if (extension === "csv") return "csv";
  if (extension === "tsv") return "tsv";
  if (extension === "yaml" || extension === "yml") return "yaml";
  if (extension === "txt") return "text";
  return "auto";
}

function looksLikeDelimitedText(text: string, delimiter: string): boolean {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return false;

  try {
    const headerColumns = parseDelimitedLine(lines[0], delimiter);
    const firstRowColumns = parseDelimitedLine(lines[1], delimiter);
    return headerColumns.length > 1 && headerColumns.length === firstRowColumns.length;
  } catch {
    return false;
  }
}

async function parseByFormat(rawText: string, format: DataFormat): Promise<ParsedValue> {
  const text = rawText.trim();
  if (!text) return null;

  if (format === "json") return parseJsonLike(text);
  if (format === "csv") return parseCsv(text, ",");
  if (format === "tsv") return parseCsv(text, "\t");
  if (format === "yaml") return parseYaml(text);
  if (format === "text") return text;

  const looksStructured = /^[\[{]/.test(text);
  if (looksLikeDelimitedText(text, ",")) return parseCsv(text, ",");
  if (looksLikeDelimitedText(text, "\t")) return parseCsv(text, "\t");

  try {
    return parseJsonLike(text);
  } catch (jsonError) {
    try {
      return await parseYaml(text);
    } catch {
      if (looksStructured) throw jsonError;
      try {
        return parseCsv(text, ",");
      } catch {
        return text;
      }
    }
  }
}

function setStatus(kind: StatusKind, message: string): void {
  const baseClass = "mt-3 rounded-md border p-3 text-sm";
  const variantClass =
    kind === "error"
      ? "border-red-300 bg-red-50 text-red-800"
      : kind === "success"
        ? "border-emerald-300 bg-emerald-50 text-emerald-800"
        : "border-slate-300 bg-slate-50 text-slate-800";
    statusBox.className = `${baseClass} ${variantClass}`;
    statusBox.textContent = message;
}

function updateHint(): void {
  const selected = functionCatalog[functionSelect.value];
  if (!selected) {
    hintBox.textContent = "";
    return;
  }

  const isDelimited = formatSelect.value === "csv" || formatSelect.value === "tsv";
  const csvHint = isDelimited
    ? ` ${getCurrentLang() === "es" ? "Tambien puedes usar formato key,value para argumentos sueltos." : "You can also use key,value format for scalar arguments."}`
    : "";
  hintBox.textContent = `${t("hintPrefix")} ${selected.hint[getCurrentLang()]}${csvHint}`;
}

async function getInputPayload(): Promise<ParsedValue> {
  const selectedFile = fileInput.files?.[0] ?? null;
  const selectedFormat = formatSelect.value as DataFormat;

  if (selectedFile) {
    const fileText = await selectedFile.text();
    const format = selectedFormat === "auto" ? inferFormat(selectedFile.name) : selectedFormat;
    if (format === "auto") throw new Error(t("unsupported"));
    return sanitizeParsedInput(await parseByFormat(fileText, format));
  }

  const inlineText = textInput.value.trim();
  if (!inlineText) throw new Error(t("noData"));
  return sanitizeParsedInput(await parseByFormat(inlineText, selectedFormat));
}

function normalizeInputForFunction(functionName: string, rawInput: ParsedValue): FunctionRunnerInput {
  if (Array.isArray(rawInput)) return normalizeTableInput(functionName, rawInput as DelimitedRow[]);
  if (isPlainObject(rawInput)) return rawInput;
  return { input: rawInput };
}

function loadTemplate(): void {
  const selected = functionCatalog[functionSelect.value];
  if (!selected) {
    setStatus("error", t("noFunction"));
    return;
  }

  textInput.value = JSON.stringify(selected.template, null, 2);
  setStatus("info", `${t("templateTitle")} ${t("templateLoaded")}`);
}

function autofillTemplateForSelection(): void {
  const selected = functionCatalog[functionSelect.value];
  if (!selected) {
    textInput.value = "";
    return;
  }

  textInput.value = JSON.stringify(selected.template, null, 2);
}

async function runSelectedFunction(): Promise<void> {
  const selected = functionCatalog[functionSelect.value];
  if (!selected) {
    setStatus("error", t("noFunction"));
    return;
  }

  try {
    const parsedInput = await getInputPayload();
    const normalizedInput = normalizeInputForFunction(functionSelect.value, parsedInput);
    const result = selected.run(normalizedInput);
    resultBox.textContent = stringifyResult(result);
    setStatus("success", t("runOk"));
  } catch (error) {
    resultBox.textContent = "";
    const base = error instanceof Error ? error.message : String(error);
    const messagePrefix = /Unexpected token|JSON|YAML|CSV|format|delimiter|header|column/i.test(base)
      ? t("parseError")
      : t("runError");
    setStatus("error", `${messagePrefix} ${base}`);
  }
}

function clearAll(): void {
  textInput.value = "";
  fileInput.value = "";
  resultBox.textContent = "";
  setStatus("info", t("ready"));
}

function handleFileChange(): void {
  if (!fileInput.files?.[0]) return;
  setStatus("info", t("loaded"));
}

functionSelect.addEventListener("change", () => {
  updateHint();
  autofillTemplateForSelection();
});
formatSelect.addEventListener("change", updateHint);
templateButton.addEventListener("click", loadTemplate);
runButton.addEventListener("click", () => {
  void runSelectedFunction();
});
clearButton.addEventListener("click", clearAll);
fileInput.addEventListener("change", handleFileChange);

const langObserver = new MutationObserver(() => {
  updateHint();
  if (statusBox.textContent === "" || statusBox.textContent === i18n.en.ready || statusBox.textContent === i18n.es.ready) {
    setStatus("info", t("ready"));
  }
});

langObserver.observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["data-current-lang"],
});

updateHint();
autofillTemplateForSelection();
setStatus("info", t("ready"));