import type {
	Location,
	MenuCategory,
	MenuItem,
	SaleTransaction,
} from "../types/models";

export function filterSalesByLocation(
	sales: SaleTransaction[],
	locationId: string,
): SaleTransaction[] {
	return sales.filter((sale) => sale.locationId === locationId);
}

export function filterSalesByDateRange(
	sales: SaleTransaction[],
	startDate: Date,
	endDate: Date,
): SaleTransaction[] {
	const startTime = startDate.getTime();
	const endTime = endDate.getTime();

	return sales.filter((sale) => {
		const saleTime = sale.timestamp.getTime();
		return saleTime >= startTime && saleTime <= endTime;
	});
}

export function filterMenuItemsByCategory(
	items: MenuItem[],
	category: MenuCategory,
): MenuItem[] {
	return items.filter((item) => item.category === category);
}

export function filterActiveLocations(locations: Location[]): Location[] {
	return locations.filter((location) => location.status === "Active");
}

export function sortLocationsByCapacity(
	locations: Location[],
	order: "asc" | "desc",
): Location[] {
	const sortedLocations = [...locations].sort(
		(a, b) => a.seatingCapacity - b.seatingCapacity,
	);

	return order === "asc" ? sortedLocations : sortedLocations.reverse();
}

export function sortMenuItemsByPrice(
	items: MenuItem[],
	currency: "USD" | "COP",
	order: "asc" | "desc",
): MenuItem[] {
	const sortedItems = [...items].sort(
		(a, b) => a.basePrice[currency] - b.basePrice[currency],
	);

	return order === "asc" ? sortedItems : sortedItems.reverse();
}
