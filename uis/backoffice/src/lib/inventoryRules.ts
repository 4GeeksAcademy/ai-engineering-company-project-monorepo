// Rules and texts of the inventory screens, moved out of the components so they can be tested on their own.
// Pure functions: no state, no network, no DOM. (The calls to the API are in lib/inventory.ts.)
// Vocabulary: the Hito 5 CONTEXT's own — "activo" (Asset), "entrada de activos" (AssetEntry), "salida de activos"
// (AssetExit), "asignación" / "consumo" — not the generic "product" / "inbound order" of the README.
import { ApiError } from "./api";
import { EXIT_TYPE_LABELS, type Asset, type ExitType, type InventoryOrder, type Office } from "../types/inventory";

/**
 * STOCK THRESHOLDS (the brief leaves them to us; operations can tune them here):
 *   - `empty`: 0 units (or fewer): nothing can be taken out.
 *   - `low`:   1 to LOW_STOCK_THRESHOLD units: time to reorder.
 *   - `ok`:    more than LOW_STOCK_THRESHOLD units.
 * The same thresholds colour the stock page and the stock panel of the forms.
 */
export const LOW_STOCK_THRESHOLD = 5;

export type StockLevel = "empty" | "low" | "ok";

export function stockLevel(stock: number): StockLevel {
  if (stock <= 0) return "empty";
  if (stock <= LOW_STOCK_THRESHOLD) return "low";
  return "ok";
}

export const STOCK_LEVEL_LABELS: Record<StockLevel, string> = {
  empty: "Sin stock",
  low: "Stock bajo",
  ok: "Stock correcto",
};

const LEVEL_ORDER: Record<StockLevel, number> = { empty: 0, low: 1, ok: 2 };

/** Most urgent first (no stock, then low), then the fewest units, then by name: what needs attention is at the top. */
export function compareByUrgency(a: Asset, b: Asset): number {
  return (
    LEVEL_ORDER[stockLevel(a.current_stock)] - LEVEL_ORDER[stockLevel(b.current_stock)] ||
    a.current_stock - b.current_stock ||
    a.name.localeCompare(b.name, "es") ||
    a.sku.localeCompare(b.sku)
  );
}

/** How many assets are at each level, for the summary above the table. */
export function countByLevel(assets: Asset[]): Record<StockLevel, number> {
  const counts: Record<StockLevel, number> = { empty: 0, low: 0, ok: 0 };
  for (const asset of assets) counts[stockLevel(asset.current_stock)] += 1;
  return counts;
}

/** What the asset pickers show: the same name exists in both offices, so the SKU and the office tell them apart. */
export const assetOptionLabel = (asset: Pick<Asset, "name" | "sku" | "office">): string =>
  `${asset.name} · ${asset.sku} · ${asset.office}`;

/** "1 unidad" / "3 unidades". */
export const unitsLabel = (quantity: number): string => `${quantity} ${quantity === 1 ? "unidad" : "unidades"}`;

// ---- Forms ----------------------------------------------------------------------------------

export type FormErrors<K extends string> = Partial<Record<K, string>>;

/** The quantity box holds text; an order needs a whole number of at least one unit. */
export function parseQuantity(raw: string): number | null {
  const text = raw.trim();
  if (!/^\d+$/.test(text)) return null;
  const quantity = Number(text);
  return Number.isSafeInteger(quantity) && quantity > 0 ? quantity : null;
}

export interface InboundForm {
  assetId: string;
  quantity: string;
  supplier: string;
}

export function validateInbound(form: InboundForm): FormErrors<keyof InboundForm> {
  const errors: FormErrors<keyof InboundForm> = {};
  if (!form.assetId) errors.assetId = "Selecciona el activo recibido.";
  if (parseQuantity(form.quantity) === null) errors.quantity = "Indica la cantidad: un número entero mayor que 0.";
  if (!form.supplier.trim()) errors.supplier = "Indica el proveedor.";
  return errors;
}

export interface OutboundForm {
  assetId: string;
  quantity: string;
  exitType: ExitType;
  assignedTo: string;
}

/** What must be right before an exit is sent. The stock is not checked here: see `stockWarning` and the API's 400. */
export function validateOutbound(form: OutboundForm): FormErrors<keyof OutboundForm> {
  const errors: FormErrors<keyof OutboundForm> = {};
  if (!form.assetId) errors.assetId = "Selecciona el activo.";
  if (parseQuantity(form.quantity) === null) errors.quantity = "Indica la cantidad: un número entero mayor que 0.";
  if (form.exitType === "allocation" && !form.assignedTo.trim()) {
    errors.assignedTo = "Indica a quién se asigna (nombre o ID del empleado).";
  }
  return errors;
}

/**
 * The client-side safeguard of the exit form: a warning, while the user types, when the quantity is above the stock
 * shown. It does not block the send (the figure may be stale, and the API applies the real rule with a 400), it only
 * says so before the user sends. `null` when there is nothing to warn about or the stock is not known yet.
 */
export function stockWarning(quantityRaw: string, available: number | null): string | null {
  const quantity = parseQuantity(quantityRaw);
  if (quantity === null || available === null || quantity <= available) return null;
  return available <= 0
    ? "Este activo no tiene stock: la salida será rechazada."
    : `Atención: solo hay ${unitsLabel(available)} en stock y pides ${quantity}. La salida será rechazada.`;
}

/** The exact body of an outbound order: `assigned_to` goes only with an allocation, and is null for a consumption. */
export function outboundPayload(form: OutboundForm, office: Office) {
  return {
    asset_id: Number(form.assetId),
    quantity: Number(form.quantity.trim()),
    exit_type: form.exitType,
    assigned_to: form.exitType === "allocation" ? form.assignedTo.trim() : null,
    office,
  };
}

// ---- API errors -----------------------------------------------------------------------------

// The API answers in English (services/api/inventory/service.py); the staff read Spanish.
const INSUFFICIENT_STOCK = /^Insufficient stock for asset '(.*)'\. Available: (-?\d+), requested: (\d+)\.$/;
const OFFICE_MISMATCH = /^Asset '(.*)' belongs to the (\w+) office: an order for it cannot be registered in (\w+)\.$/;

const GENERIC_STATUS_TEXT = /^(|internal server error|bad gateway|service unavailable|gateway time-?out|server error)$/i;

const FIELD_LABELS: Record<string, string> = {
  asset_id: "Activo",
  quantity: "Cantidad",
  supplier: "Proveedor",
  exit_type: "Tipo de salida",
  assigned_to: "Asignado a",
  office: "Oficina",
};

// Per-field validation texts (FastAPI/Pydantic), shown after the field's name.
const VALIDATION_TEXTS: [RegExp, string][] = [
  [/^Input should be greater than 0$/, "debe ser mayor que 0"],
  [/^Field required$/, "es obligatorio"],
  [/^must not be blank$/, "no puede estar vacío"],
];

// The business rule on `assigned_to` fails the whole body, so it arrives as a message with no field.
const RULE_TEXTS: [RegExp, string][] = [
  [/assigned_to is required when exit_type is 'allocation'/, "Indica a quién se asigna la salida (nombre o ID del empleado)."],
  [/assigned_to must be null when exit_type is 'consumption'/, "Un consumo no se asigna a ningún empleado."],
];

function translateValidation(text: string): string {
  return VALIDATION_TEXTS.find(([pattern]) => pattern.test(text))?.[1] ?? text;
}

/**
 * A message the staff can act on, whatever the API answered: never a JSON body, never a bare status code.
 * `fallback` is for failures that are not API errors.
 */
export function describeInventoryError(err: unknown, fallback: string): string {
  if (!(err instanceof ApiError)) return fallback;
  if (err.status === 0) return "No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.";
  if (err.status >= 500) {
    // The body's message, when it says more than the status text ("Internal Server Error" tells nothing).
    const detail = GENERIC_STATUS_TEXT.test(err.message.trim()) ? "" : err.message.trim();
    return `El servidor ha tenido un problema (error ${err.status}). Inténtalo de nuevo en unos minutos.${detail ? ` Detalle: ${detail}` : ""}`;
  }
  if (err.status === 401) return "Tu sesión ha caducado. Vuelve a iniciar sesión.";
  if (err.status === 403) return "No tienes permiso para hacer esto.";
  if (err.status === 404) return "No se encontró el activo. Puede que ya no exista: recarga la página.";

  const stock = INSUFFICIENT_STOCK.exec(err.message);
  if (stock) {
    const [, name, available, requested] = stock;
    return `No hay stock suficiente de «${name}»: disponible ${available}, solicitado ${requested}.`;
  }
  const mismatch = OFFICE_MISMATCH.exec(err.message);
  if (mismatch) {
    const [, name, assetOffice, orderOffice] = mismatch;
    return `«${name}» pertenece a la oficina de ${assetOffice}: no se puede registrar un movimiento suyo en ${orderOffice}.`;
  }

  const rule = RULE_TEXTS.find(([pattern]) => pattern.test(err.message));
  if (rule) return rule[1];

  const fields = Object.entries(err.fieldErrors);
  if (fields.length > 0) {
    return fields.map(([field, text]) => `${FIELD_LABELS[field] ?? field}: ${translateValidation(text)}`).join(". ") + ".";
  }
  // A 400/409/422 with a message of its own (a string `detail`): show it as the API wrote it. A status text
  // such as "Bad Request" is no help to anyone, so that gets the generic sentence.
  const generic = err.status === 400 ? "La operación no es válida. Revisa los datos e inténtalo de nuevo." : fallback;
  return err.message && !/^(bad request|unprocessable|conflict)/i.test(err.message) ? err.message : generic;
}

// ---- Order history --------------------------------------------------------------------------

/** Newest first. Orders have no shared id sequence (entries and exits are separate tables), so the date decides. */
export const compareOrdersNewestFirst = (a: InventoryOrder, b: InventoryOrder): number =>
  new Date(b.created_at).getTime() - new Date(a.created_at).getTime() || b.id - a.id;

/** The seed script stamps its orders with the nil UUID: they were loaded by the system, not registered by a person. */
const NIL_UUID = "00000000-0000-0000-0000-000000000000";

/** The name to show next to an order's `user_uuid`: the user's name from the directory, or why there is none. */
export function authorName(userUuid: string, names: Record<string, string>): string {
  if (names[userUuid]) return names[userUuid];
  if (userUuid === NIL_UUID) return "Sistema (datos iniciales)";
  return "Usuario no disponible";
}

/** The order-specific detail: the supplier of an entry, or the type (and the employee) of an exit. */
export function orderDetail(order: InventoryOrder): string {
  if (order.type === "inbound") return order.supplier ?? "—";
  const type = order.exit_type ? EXIT_TYPE_LABELS[order.exit_type] : "Salida";
  return order.assigned_to ? `${type}: ${order.assigned_to}` : type;
}

/** A 400 from the API: on an exit it is "not enough stock", which belongs next to the quantity field. */
export const isBadRequest = (err: unknown): boolean => err instanceof ApiError && err.status === 400;

/** The `?asset=` of a link from the stock page: a plain positive integer, or nothing (never trust the URL). */
export function assetIdFromQuery(value: string | string[] | undefined): string {
  const text = Array.isArray(value) ? value[0] : value;
  return text !== undefined && /^[1-9]\d{0,9}$/.test(text) ? text : "";
}
