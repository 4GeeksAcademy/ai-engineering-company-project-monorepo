// Modelo de dominio de TrackFlow (logística de última milla, almacenes y devoluciones)

export type Country = "US" | "ES";

export type Currency = "USD" | "EUR";

export type WarehouseCode = "LA" | "ZGZ";

export type ShipmentStatus =
  | "pending"
  | "in_transit"
  | "delivered"
  | "failed_delivery"
  | "lost"
  | "returned";

export type ReturnStatus =
  | "requested"
  | "approved"
  | "rejected"
  | "pickup_scheduled"
  | "received"
  | "inspected";

// Destino final de un producto devuelto tras la inspección
export type ReturnDisposition = "restock" | "refurbish" | "dispose";

export type ProductCondition = "new" | "good" | "damaged" | "unsellable";

export type ContractStatus = "active" | "expiring" | "expired" | "renewed" | "lost";

export type ContactChannel = "email" | "whatsapp" | "phone";

export interface Brand {
  id: string;
  name: string;
  country: Country;
  contractStatus: ContractStatus;
  contractEndDate: string; // ISO 8601
  accountManagerId: string;
  riskScore?: number; // 0-100
}

export interface Product {
  id: string;
  brandId: string;
  sku: string;
  name: string;
  weightKg: number;
  unitPrice: number;
  currency: Currency;
}

export interface Warehouse {
  id: string;
  code: WarehouseCode;
  city: "Los Angeles" | "Zaragoza";
  // Cada almacén usa un sistema distinto; por eso el modelo lo registra
  system: "SGA_COMERCIAL" | "SPREADSHEET";
}

export interface InventoryItem {
  id: string;
  productId: string;
  warehouseId: string;
  quantityOnHand: number;
  quantityReserved: number;
  lastSyncedAt: string; // ISO 8601
}

export interface Carrier {
  id: string;
  name: string; // p. ej. UPS, FedEx, DHL, MRW, SEUR
  countries: Country[];
  apiAvailable: boolean;
}

// Consumidor final (B2C)
export interface Customer {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  preferredChannel: ContactChannel;
  preferredLanguage: "es" | "en";
}

export interface OrderLine {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
}

export interface Order {
  id: string;
  brandId: string; // Marca que contrata el servicio
  customerId: string; // Consumidor final que recibe el paquete
  warehouseId: string;
  lines: OrderLine[];
  receivedVia: "email" | "api" | "manual";
  createdAt: string; // ISO 8601
}

export interface Shipment {
  id: string;
  orderId: string;
  carrierId: string;
  trackingNumber: string;
  status: ShipmentStatus;
  weightKg: number;
  shippedAt?: string; // ISO 8601
  deliveredAt?: string; // ISO 8601
  isOnTime?: boolean;
}

export interface ReturnRequest {
  id: string;
  orderId: string;
  customerId: string;
  productId: string;
  reason: string;
  status: ReturnStatus;
  condition?: ProductCondition; // Se conoce tras la inspección
  disposition?: ReturnDisposition;
  pickupType?: "home_pickup" | "dropoff_point"; // Cómo llega el paquete al transportista
  returnShipmentId?: string; // Envío de retorno al almacén; existe también en punto de entrega
  imageUrls: string[];
  createdAt: string; // ISO 8601
}

export interface SupportTicket {
  id: string;
  customerId: string;
  brandId?: string; // Se rellena si la consulta la hace una marca
  orderId?: string; // Permite llegar a todos los envíos y devoluciones del pedido
  shipmentId?: string; // Solo para consultas sobre un envío concreto
  returnRequestId?: string;
  channel: ContactChannel;
  language: "es" | "en";
  status: "open" | "resolved_by_agent" | "escalated" | "closed";
  resolvedBy: "agent" | "human";
  createdAt: string; // ISO 8601
}

// Mapa de relaciones:
// Brand 1 ──< Product 1 ──< InventoryItem >── 1 Warehouse
// Brand 1 ──< Order >── 1 Customer
// Order 1 ──< OrderLine >── 1 Product
// Order 1 ──< Shipment >── 1 Carrier
// Order 1 ──< ReturnRequest ──0..1 Shipment (retorno al almacén)
// Customer 1 ──< SupportTicket >──0..1 Order | Shipment | ReturnRequest