// Tipos base
export type CountryCode = "US" | "ES";
export type WarehouseCode = "LA" | "ZGZ";
export type CarrierCode = "UPS" | "FEDEX" | "DHL" | "MRW" | "SEUR" | "LOCAL_1" | "LOCAL_2";
export type ShipmentStatus = "pending" | "in_transit" | "delivered" | "failed" | "returned";
export type TicketChannel = "email" | "whatsapp" | "phone";
export type TicketPriority = "low" | "medium" | "high";
export type ReturnCondition = "new" | "opened" | "damaged" | "unusable";

// region warehouse
export interface Warehouse {
	id: string;
	code: WarehouseCode;
	name: string;
	city: string;
	country: CountryCode;
	capacityUnits: number;
	active: boolean;
	occupancyRate(currentUnits: number): number;
}

export interface InventoryItem {
	sku: string;
	warehouseCode: WarehouseCode;
	quantityAvailable: number;
	reorderPoint: number;
	unitCostEur: number;
	updatedAt: string;
	inventoryValue(): number;
	isLowStock(): boolean;
}


// region Last mile
export interface CarrierPerformance {
	carrier: CarrierCode;
	country: CountryCode;
	totalShipments: number;
	onTimeShipments: number;
	incidents: number;
	avgCostPerKgEur: number;
	onTimeRate(): number;
	incidentRate(): number;
}

export interface Shipment {
	id: string;
	orderId: string;
	carrier: CarrierCode;
	originWarehouse: WarehouseCode;
	destinationCountry: CountryCode;
	weightKg: number;
	priority: "standard" | "urgent";
	shippedAt: string;
	estimatedDeliveryAt: string;
	deliveredAt?: string;
	status: ShipmentStatus;
	isLate(referenceDateISO?: string): boolean;
}

// Logistica inversa
export interface ReturnRequest {
	id: string;
	orderId: string;
	customerId: string;
	country: CountryCode;
	reason: string;
	condition: ReturnCondition;
	approved: boolean;
	requestedAt: string;
	processedAt?: string;
	autoApprovalEligible(): boolean;
}

// Experiencia de cliente
export interface SupportTicket {
	id: string;
	customerId: string;
	channel: TicketChannel;
	language: "es" | "en";
	topic: "tracking" | "returns" | "billing" | "other";
	priority: TicketPriority;
	firstResponseMinutes?: number;
	createdAt: string;
	isSlaBreached(maxMinutes: number): boolean;
}


// region Literal Objects

// Objetos literales de ejemplo
export const warehouseLA: Warehouse = {
	id: "wh_001",
	code: "LA",
	name: "Los Angeles Main Warehouse",
	city: "Los Angeles",
	country: "US",
	capacityUnits: 120000,
	active: true,
	occupancyRate(currentUnits: number): number {
		if (this.capacityUnits === 0) return 0;
		return (currentUnits / this.capacityUnits) * 100;
	}
};

export const inventorySkuA100: InventoryItem = {
	sku: "A100-BLACK-M",
	warehouseCode: "ZGZ",
	quantityAvailable: 35,
	reorderPoint: 40,
	unitCostEur: 18.5,
	updatedAt: "2026-06-15T08:30:00.000Z",
	inventoryValue(): number {
		return this.quantityAvailable * this.unitCostEur;
	},
	isLowStock(): boolean {
		return this.quantityAvailable <= this.reorderPoint;
	}
};

export const carrierSeurSpain: CarrierPerformance = {
	carrier: "SEUR",
	country: "ES",
	totalShipments: 1200,
	onTimeShipments: 1110,
	incidents: 36,
	avgCostPerKgEur: 2.75,
	onTimeRate(): number {
		if (this.totalShipments === 0) return 0;
		return this.onTimeShipments / this.totalShipments;
	},
	incidentRate(): number {
		if (this.totalShipments === 0) return 0;
		return this.incidents / this.totalShipments;
	}
};

export const shipmentExample: Shipment = {
	id: "shp_9001",
	orderId: "ord_5521",
	carrier: "MRW",
	originWarehouse: "ZGZ",
	destinationCountry: "ES",
	weightKg: 2.4,
	priority: "urgent",
	shippedAt: "2026-06-12T11:00:00.000Z",
	estimatedDeliveryAt: "2026-06-13T15:00:00.000Z",
	status: "in_transit",
	isLate(referenceDateISO?: string): boolean {
		const referenceDate = referenceDateISO ? new Date(referenceDateISO) : new Date();
		const estimated = new Date(this.estimatedDeliveryAt);
		return this.status !== "delivered" && referenceDate.getTime() > estimated.getTime();
	}
};

export const returnExample: ReturnRequest = {
	id: "ret_441",
	orderId: "ord_5001",
	customerId: "cust_89",
	country: "US",
	reason: "Size mismatch",
	condition: "opened",
	approved: false,
	requestedAt: "2026-06-10T09:45:00.000Z",
	autoApprovalEligible(): boolean {
		const autoAllowedConditions: ReturnCondition[] = ["new", "opened"];
		return autoAllowedConditions.includes(this.condition);
	}
};

export const ticketExample: SupportTicket = {
	id: "t_1002",
	customerId: "cust_89",
	channel: "whatsapp",
	language: "es",
	topic: "tracking",
	priority: "medium",
	firstResponseMinutes: 26,
	createdAt: "2026-06-15T07:10:00.000Z",
	isSlaBreached(maxMinutes: number): boolean {
		if (this.firstResponseMinutes === undefined) return false;
		return this.firstResponseMinutes > maxMinutes;
	}
};

export const sampleData = {
	warehouses: [warehouseLA],
	inventory: [inventorySkuA100],
	carrierPerformance: [carrierSeurSpain],
	shipments: [shipmentExample],
	returns: [returnExample],
	tickets: [ticketExample]
};
