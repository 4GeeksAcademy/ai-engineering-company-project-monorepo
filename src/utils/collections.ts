import { SaleTransaction, MenuItem, MenuCategory, Location } from "../types/model";

function filterSalesByLocation(sales: SaleTransaction[], locationId: string): SaleTransaction[] {
    return sales.filter(sale => sale.locationId === locationId);
}
function filterSalesByDateRange(sales: SaleTransaction[], startDate: Date, endDate: Date): SaleTransaction[] {
    return sales.filter(sale => sale.timestamp >= startDate && sale.timestamp <= endDate);
}
function filterMenuItemsByCategory(items: MenuItem[], category: MenuCategory): MenuItem[] {
    return items.filter(item => item.category === category);
}
function filterActiveLocations(locations: Location[]): Location[] {
    return locations.filter(location => location.status === "Active");
}
function sortLocationsByCapacity(locations: Location[], order: "asc" | "desc"): Location[] {
    const sortedLocations = [...locations]; // Crear una copia para no mutar el array original
    sortedLocations.sort((a, b) => {
        if (order === "asc") {
            return a.seatingCapacity - b.seatingCapacity;
        } else {
            return b.seatingCapacity - a.seatingCapacity;
        }
    });
    return sortedLocations;
}
function sortMenuItemsByPrice(items: MenuItem[], currency: "USD" | "COP", order: "asc" | "desc"): MenuItem[] {
    const sortedItems = [...items]; // Crear una copia para no mutar el array original
    sortedItems.sort((a, b) => {
        const priceA = a.basePrice[currency];
        const priceB = b.basePrice[currency];
        if (order === "asc") {
            return priceA - priceB;
        } else {
            return priceB - priceA;
        }
    });
    return sortedItems;
}

export {
    filterSalesByLocation,
    filterSalesByDateRange,
    filterMenuItemsByCategory,
    filterActiveLocations,
    sortLocationsByCapacity,
    sortMenuItemsByPrice
};