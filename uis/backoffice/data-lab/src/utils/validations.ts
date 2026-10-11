import type {
	Country,
	Location,
	LocationStatus,
	MenuItem,
	MenuItemStatus,
	SaleTransaction,
} from "../types/models";

type ValidationResult = { valid: boolean; errors: string[] };

const MENU_ITEM_STATUSES: readonly MenuItemStatus[] = [
	"Active",
	"Seasonal",
	"Discontinued",
];

const LOCATION_STATUSES: readonly LocationStatus[] = [
	"Active",
	"Temporarily closed",
	"Under renovation",
];

const COUNTRIES: readonly Country[] = ["Colombia", "USA"];

export function validateMenuItem(item: MenuItem): ValidationResult {
	const errors: string[] = [];

	if (item.name.trim().length === 0) {
		errors.push("El nombre del producto no puede estar vacio.");
	}

	if (item.basePrice.USD <= 0) {
		errors.push("El precio base en USD debe ser mayor que 0.");
	}

	if (item.basePrice.COP <= 0) {
		errors.push("El precio base en COP debe ser mayor que 0.");
	}

	if (item.ingredientCost.USD <= 0) {
		errors.push("El coste de ingredientes en USD debe ser mayor que 0.");
	}

	if (item.ingredientCost.COP <= 0) {
		errors.push("El coste de ingredientes en COP debe ser mayor que 0.");
	}

	if (item.prepTimeMinutes <= 0) {
		errors.push("El tiempo de preparacion debe ser mayor que 0 minutos.");
	}

	if (item.prepTimeMinutes > 60) {
		errors.push("El tiempo de preparacion no puede superar 60 minutos.");
	}

	if (!item.isAvailableInColombia && !item.isAvailableInUSA) {
		errors.push("El producto debe estar disponible al menos en un pais.");
	}

	if (!MENU_ITEM_STATUSES.includes(item.status)) {
		errors.push("El estado del producto no es valido.");
	}

	return { valid: errors.length === 0, errors };
}

export function validateSaleTransaction(sale: SaleTransaction): ValidationResult {
	const errors: string[] = [];

	if (sale.quantity <= 0) {
		errors.push("La cantidad vendida debe ser mayor que 0.");
	}

	if (sale.totalPrice.USD <= 0) {
		errors.push("El importe total en USD debe ser mayor que 0.");
	}

	if (sale.totalPrice.COP <= 0) {
		errors.push("El importe total en COP debe ser mayor que 0.");
	}

	if (sale.waiterName.trim().length === 0) {
		errors.push("El nombre del empleado de la venta no puede estar vacio.");
	}

	if (sale.locationId.trim().length === 0) {
		errors.push("La venta debe incluir un locationId valido.");
	}

	if (sale.itemId.trim().length === 0) {
		errors.push("La venta debe incluir un itemId valido.");
	}

	return { valid: errors.length === 0, errors };
}

export function validateLocation(location: Location): ValidationResult {
	const errors: string[] = [];
	const currentYear = new Date().getFullYear();

	if (location.openingYear < 2008) {
		errors.push("El ano de apertura debe ser igual o posterior a 2008.");
	}

	if (location.openingYear > currentYear) {
		errors.push("El ano de apertura no puede ser posterior al ano actual.");
	}

	if (location.seatingCapacity <= 0) {
		errors.push("La capacidad del restaurante debe ser mayor que 0.");
	}

	if (location.staffCount <= 0) {
		errors.push("El numero de empleados debe ser mayor que 0.");
	}

	if (location.monthlyRentCost.USD <= 0) {
		errors.push("El coste mensual del alquiler en USD debe ser mayor que 0.");
	}

	if (location.monthlyRentCost.COP <= 0) {
		errors.push("El coste mensual del alquiler en COP debe ser mayor que 0.");
	}

	if (location.averageMonthlyUtilities.USD <= 0) {
		errors.push("El coste mensual de suministros en USD debe ser mayor que 0.");
	}

	if (location.averageMonthlyUtilities.COP <= 0) {
		errors.push("El coste mensual de suministros en COP debe ser mayor que 0.");
	}

	if (location.manager.trim().length === 0) {
		errors.push("El nombre del gerente no puede estar vacio.");
	}

	if (!COUNTRIES.includes(location.country)) {
		errors.push("El pais de la locacion no es valido.");
	}

	if (!LOCATION_STATUSES.includes(location.status)) {
		errors.push("El estado de la locacion no es valido.");
	}

	return { valid: errors.length === 0, errors };
}
