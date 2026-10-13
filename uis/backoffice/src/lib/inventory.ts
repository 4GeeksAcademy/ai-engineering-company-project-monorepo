// The inventory API client: every call to the /inventory endpoints lives here, so no component calls fetch itself.
// Each call carries `Authorization: Bearer <token>` (the token the login stored, read by jsonRequest) and, on a
// 4xx/5xx, throws an ApiError whose message is the one in the response body. The screens turn that into text for
// the user with `describeInventoryError` (lib/inventoryRules.ts); nothing is swallowed here.
import { API_BASE_URL, jsonRequest } from "./api";
import type {
  Asset,
  AssetCreate,
  InboundOrderCreate,
  InventoryOrder,
  OutboundOrderCreate,
} from "../types/inventory";

// The inventory routes are /inventory/* on the API. Their page paths (/inventory/orders...) are the same, so in
// development the app calls them as /api/inventory/*, which next.config.mjs forwards to the inventory API
// (NEXT_PUBLIC_INVENTORY_API_URL). With NEXT_PUBLIC_API_BASE_URL set the app calls the API directly.
const PREFIX = API_BASE_URL ? "/inventory" : "/api/inventory";

/** GET /inventory/products — every asset with its `current_stock` (entries minus exits, computed by the API). */
export const listAssets = () => jsonRequest<Asset[]>(`${PREFIX}/products`);

/** GET /inventory/products/{id} — one asset with its stock as it is now. */
export const getAsset = (assetId: number) => jsonRequest<Asset>(`${PREFIX}/products/${assetId}`);

/** POST /inventory/products — registers a new asset. */
export const createAsset = (payload: AssetCreate) =>
  jsonRequest<Asset>(`${PREFIX}/products`, { method: "POST", body: JSON.stringify(payload) });

/** GET /inventory/orders — every entry and exit, with the asset's data. */
export const listOrders = () => jsonRequest<InventoryOrder[]>(`${PREFIX}/orders`);

/** POST /inventory/orders/inbound — registers a delivery received (AssetEntry). */
export const createInboundOrder = (payload: InboundOrderCreate) =>
  jsonRequest<InventoryOrder>(`${PREFIX}/orders/inbound`, { method: "POST", body: JSON.stringify(payload) });

/** POST /inventory/orders/outbound — registers an allocation or a consumption (AssetExit). */
export const createOutboundOrder = (payload: OutboundOrderCreate) =>
  jsonRequest<InventoryOrder>(`${PREFIX}/orders/outbound`, { method: "POST", body: JSON.stringify(payload) });
