import {
	CarrierPerformance,
	InventoryItem,
	ReturnRequest,
	Shipment,
	SupportTicket
} from "../types/models";
import { FilterRule, NumericRange, filterByCriteria } from "./collections";

export interface ShipmentFilters {
	carrier?: Shipment["carrier"] | Shipment["carrier"][];
	status?: Shipment["status"] | Shipment["status"][];
	destinationCountry?: Shipment["destinationCountry"] | Shipment["destinationCountry"][];
	priority?: Shipment["priority"] | Shipment["priority"][];
	weightKgRange?: NumericRange;
}

// Aplica filtros de envios por campos simples y rango de peso.
export function filterShipments(items: Shipment[], filters: ShipmentFilters = {}): Shipment[] {
	const rules: FilterRule<Shipment>[] = [];

	if (filters.carrier !== undefined) {
		rules.push(
			Array.isArray(filters.carrier)
				? { field: "carrier", in: filters.carrier }
				: { field: "carrier", equals: filters.carrier }
		);
	}

	if (filters.status !== undefined) {
		rules.push(
			Array.isArray(filters.status)
				? { field: "status", in: filters.status }
				: { field: "status", equals: filters.status }
		);
	}

	if (filters.destinationCountry !== undefined) {
		rules.push(
			Array.isArray(filters.destinationCountry)
				? { field: "destinationCountry", in: filters.destinationCountry }
				: { field: "destinationCountry", equals: filters.destinationCountry }
		);
	}

	if (filters.priority !== undefined) {
		rules.push(
			Array.isArray(filters.priority)
				? { field: "priority", in: filters.priority }
				: { field: "priority", equals: filters.priority }
		);
	}

	if (filters.weightKgRange) {
		rules.push({ field: "weightKg", range: filters.weightKgRange });
	}

	return filterByCriteria(items, rules);
}

export interface InventoryFilters {
	warehouseCode?: InventoryItem["warehouseCode"] | InventoryItem["warehouseCode"][];
	sku?: string | string[];
	unitCostRange?: NumericRange;
	inventoryValueRange?: NumericRange;
	quantityRange?: NumericRange;
	lowStock?: boolean;
}

// Filtra inventario incluyendo reglas calculadas como valor total y bajo stock.
export function filterInventory(items: InventoryItem[], filters: InventoryFilters = {}): InventoryItem[] {
	const rules: FilterRule<InventoryItem>[] = [];

	if (filters.warehouseCode !== undefined) {
		rules.push(
			Array.isArray(filters.warehouseCode)
				? { field: "warehouseCode", in: filters.warehouseCode }
				: { field: "warehouseCode", equals: filters.warehouseCode }
		);
	}

	if (filters.sku !== undefined) {
		rules.push(Array.isArray(filters.sku) ? { field: "sku", in: filters.sku } : { field: "sku", equals: filters.sku });
	}

	if (filters.unitCostRange) {
		rules.push({ field: "unitCostEur", range: filters.unitCostRange });
	}

	if (filters.inventoryValueRange) {
		rules.push({
			range: filters.inventoryValueRange,
			resolver: (item) => item.inventoryValue()
		});
	}

	if (filters.quantityRange) {
		rules.push({ field: "quantityAvailable", range: filters.quantityRange });
	}

	if (filters.lowStock !== undefined) {
		rules.push({ predicate: (item) => item.isLowStock() === filters.lowStock });
	}

	return filterByCriteria(items, rules);
}

export interface ReturnFilters {
	country?: ReturnRequest["country"] | ReturnRequest["country"][];
	condition?: ReturnRequest["condition"] | ReturnRequest["condition"][];
	approved?: boolean;
	autoApprovalEligible?: boolean;
}

// Filtra devoluciones por metadatos y elegibilidad de autoaprobacion.
export function filterReturns(items: ReturnRequest[], filters: ReturnFilters = {}): ReturnRequest[] {
	const rules: FilterRule<ReturnRequest>[] = [];

	if (filters.country !== undefined) {
		rules.push(
			Array.isArray(filters.country)
				? { field: "country", in: filters.country }
				: { field: "country", equals: filters.country }
		);
	}

	if (filters.condition !== undefined) {
		rules.push(
			Array.isArray(filters.condition)
				? { field: "condition", in: filters.condition }
				: { field: "condition", equals: filters.condition }
		);
	}

	if (filters.approved !== undefined) {
		rules.push({ field: "approved", equals: filters.approved });
	}

	if (filters.autoApprovalEligible !== undefined) {
		rules.push({ predicate: (item) => item.autoApprovalEligible() === filters.autoApprovalEligible });
	}

	return filterByCriteria(items, rules);
}

export interface TicketFilters {
	channel?: SupportTicket["channel"] | SupportTicket["channel"][];
	priority?: SupportTicket["priority"] | SupportTicket["priority"][];
	topic?: SupportTicket["topic"] | SupportTicket["topic"][];
	language?: SupportTicket["language"] | SupportTicket["language"][];
	firstResponseMinutesRange?: NumericRange;
	slaBreached?: {
		maxMinutes: number;
		expected: boolean;
	};
}

// Filtra tickets por atributos, rango de respuesta y cumplimiento de SLA.
export function filterTickets(items: SupportTicket[], filters: TicketFilters = {}): SupportTicket[] {
	const rules: FilterRule<SupportTicket>[] = [];

	if (filters.channel !== undefined) {
		rules.push(
			Array.isArray(filters.channel)
				? { field: "channel", in: filters.channel }
				: { field: "channel", equals: filters.channel }
		);
	}

	if (filters.priority !== undefined) {
		rules.push(
			Array.isArray(filters.priority)
				? { field: "priority", in: filters.priority }
				: { field: "priority", equals: filters.priority }
		);
	}

	if (filters.topic !== undefined) {
		rules.push(
			Array.isArray(filters.topic)
				? { field: "topic", in: filters.topic }
				: { field: "topic", equals: filters.topic }
		);
	}

	if (filters.language !== undefined) {
		rules.push(
			Array.isArray(filters.language)
				? { field: "language", in: filters.language }
				: { field: "language", equals: filters.language }
		);
	}

	if (filters.firstResponseMinutesRange) {
		rules.push({
			range: filters.firstResponseMinutesRange,
			resolver: (item) => item.firstResponseMinutes ?? Number.NEGATIVE_INFINITY
		});
	}

	if (filters.slaBreached) {
		rules.push({
			predicate: (item) => item.isSlaBreached(filters.slaBreached!.maxMinutes) === filters.slaBreached!.expected
		});
	}

	return filterByCriteria(items, rules);
}

export interface CarrierPerformanceFilters {
	carrier?: CarrierPerformance["carrier"] | CarrierPerformance["carrier"][];
	country?: CarrierPerformance["country"] | CarrierPerformance["country"][];
	onTimeRateRange?: NumericRange;
	incidentRateRange?: NumericRange;
	avgCostPerKgRange?: NumericRange;
}

// Filtra rendimiento de carriers por pais y metricas operativas en rango.
export function filterCarrierPerformance(
	items: CarrierPerformance[],
	filters: CarrierPerformanceFilters = {}
): CarrierPerformance[] {
	const rules: FilterRule<CarrierPerformance>[] = [];

	if (filters.carrier !== undefined) {
		rules.push(
			Array.isArray(filters.carrier)
				? { field: "carrier", in: filters.carrier }
				: { field: "carrier", equals: filters.carrier }
		);
	}

	if (filters.country !== undefined) {
		rules.push(
			Array.isArray(filters.country)
				? { field: "country", in: filters.country }
				: { field: "country", equals: filters.country }
		);
	}

	if (filters.onTimeRateRange) {
		rules.push({
			range: filters.onTimeRateRange,
			resolver: (item) => item.onTimeRate()
		});
	}

	if (filters.incidentRateRange) {
		rules.push({
			range: filters.incidentRateRange,
			resolver: (item) => item.incidentRate()
		});
	}

	if (filters.avgCostPerKgRange) {
		rules.push({ field: "avgCostPerKgEur", range: filters.avgCostPerKgRange });
	}

	return filterByCriteria(items, rules);
}