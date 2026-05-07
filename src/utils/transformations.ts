import { SaleTransaction, MenuItem, Location, WasteRecord, WasteReason, PaymentMethod, Country, CountryMetrics } from "../types/model";
import { filterSalesByDateRange, filterSalesByLocation } from "./collections";

function calculateDailyRevenue(sales: SaleTransaction[], date: Date, currency: "USD" | "COP"): number { // Calcula el ingreso total para una fecha específica en la moneda especificada. Retorna total redondeado a 2 decimales
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    const dailySales = filterSalesByDateRange(sales, startOfDay, endOfDay);
    const totalRevenue = dailySales.reduce((total, sale) => total + sale.totalPrice[currency], 0);
    return Math.round(totalRevenue * 100) / 100; // Redondear a 2 decimales
}
function calculateLocationMargin(sales: SaleTransaction[], menuItems: MenuItem[], locationId: string, currency: "USD" | "COP"): number { // Calcula margen de ganancia para una locación. Fórmula: ((Ingreso Total - Costo Total de Ingredientes) / Ingreso Total) * 100. Usa ventas de esa locación solamente. Une ventas con ítems de menú para obtener costos de ingredientes. Retorna margen como porcentaje (0-100), redondeado a 2 decimales
    const locationSales = filterSalesByLocation(sales, locationId);
    let totalRevenue = 0;
    let totalCost = 0;
    locationSales.forEach(sale => {
        const menuItem = menuItems.find(mi => mi.id === sale.itemId);
        if (menuItem) {
            totalRevenue += sale.totalPrice[currency];
            totalCost += menuItem.ingredientCost[currency] * sale.quantity;
        }
    });
    const margin = totalRevenue === 0 ? 0 : ((totalRevenue - totalCost) / totalRevenue) * 100;
    return Math.round(margin * 100) / 100; // Redondear a 2 decimales
}
function calculateWasteCost(wasteRecords: WasteRecord[], locationId: string, currency: "USD" | "COP"): number { // Calcula el costo total de desperdicio para una locación específica en la moneda especificada. Suma el costo de todos los registros de desperdicio para esa locación. Retorna total redondeado a 2 decimales
    const locationWaste = wasteRecords.filter(record => record.locationId === locationId);
    const totalWasteCost = locationWaste.reduce((total, record) => total + record.cost[currency], 0);
    return Math.round(totalWasteCost * 100) / 100; // Redondear a 2 decimales
}
function convertCurrency(amount: number, fromCurrency: "USD" | "COP", toCurrency: "USD" | "COP"): number { // Convierte una cantidad de una moneda a otra usando una tasa de cambio fija. Usar tasa: 1 USD = 4000 COP Retorna cantidad redondeada a 2 decimales. Si origen y destino son iguales, retornar la cantidad original
    const exchangeRate = 4000; // Ejemplo: 1 USD = 4000 COP
    if (fromCurrency === toCurrency) {
        return amount;
    }
    const convertedAmount = fromCurrency === "USD" ? amount * exchangeRate : amount / exchangeRate;
    return Math.round(convertedAmount * 100) / 100; // Redondear a 2 decimales
}
function scoreLocationPerformance(location: Location, sales: SaleTransaction[], wasteRecords: WasteRecord[], menuItems: MenuItem[]): number {
    const locationSales = filterSalesByLocation(sales, location.id);
    const locationWaste = wasteRecords.filter(record => record.locationId === location.id);
    const totalRevenueUSD = locationSales.reduce((total, sale) => total + sale.totalPrice.USD, 0);
    const openingYear = new Date().getFullYear() - 1; // Estimar apertura hace 1 año
    const daysOperative = Math.max(1, (new Date().getTime() - new Date(openingYear, 0, 1).getTime()) / (1000 * 60 * 60 * 24));
    const dailyRevenue = totalRevenueUSD / daysOperative;
    const revenueScore = Math.min((dailyRevenue / 1000) * 40, 40);
    const efficiencyScore = Math.min((locationSales.length / location.seatingCapacity) * 30, 30);
    const totalWasteCostUSD = locationWaste.reduce((total, record) => total + record.cost.USD, 0);
    const wastePercentage = totalRevenueUSD === 0 ? 0 : (totalWasteCostUSD / totalRevenueUSD) * 100;
    const wasteScore = Math.max(20 - (wastePercentage * 2), 0);
    const margin = calculateLocationMargin(sales, menuItems, location.id, "USD");
    const marginScore = Math.min(margin / 10, 10);
    const totalScore = revenueScore + efficiencyScore + wasteScore + marginScore;
    return Math.round(totalScore * 100) / 100; // Redondear a 2 decimales
}
function rankLocationsByPerformance(locations: Location[], sales: SaleTransaction[], wasteRecords: WasteRecord[], menuItems: MenuItem[]): Array<{location: Location, score: number}> { //Puntúa todas las locaciones. Las retorna ordenadas por puntaje (más alto primero). Cada elemento contiene la locación y su puntaje
    const scoredLocations = locations.map(location => ({
        location,
        score: scoreLocationPerformance(location, sales, wasteRecords, menuItems)
    }));
    scoredLocations.sort((a, b) => b.score - a.score);
    return scoredLocations;
}
function countSalesByPaymentMethod(sales: SaleTransaction[]): Record<PaymentMethod, number> { // Cuenta el número de ventas por método de pago.
    return sales.reduce((counts, sale) => {
        counts[sale.paymentMethod] = (counts[sale.paymentMethod] || 0) + 1;
        return counts;
    }, {} as Record<PaymentMethod, number>);
}
function calculateAverageTicket(sales: SaleTransaction[], currency: "USD" | "COP"): number { // Retorna valor promedio de venta en la moneda especificada. Redondear a 2 decimales.
    if (sales.length === 0) return 0;
    const totalRevenue = sales.reduce((total, sale) => total + sale.totalPrice[currency], 0);
    const averageTicket = totalRevenue / sales.length;
    return Math.round(averageTicket * 100) / 100; // Redondear a 2 decimales
}
function findTopSellingItems(sales: SaleTransaction[], menuItems: MenuItem[], topN: number): Array<{item: MenuItem, totalSold: number}> { // Encuentra los N ítems de menú más vendidos. Une ventas con ítems de menú. Los retorna ordenados por cantidad vendida (más alto primero). Cada elemento contiene el ítem de menú y cantidad total vendida
    const itemSales: Record<string, number> = {};
    sales.forEach(sale => {
        itemSales[sale.itemId] = (itemSales[sale.itemId] || 0) + sale.quantity;
    });
    const topSellingItems = Object.entries(itemSales)
        .map(([menuItemId, totalSold]) => ({
            item: menuItems.find(menuItem => menuItem.id === menuItemId)!,
            totalSold
        }))
        .filter(entry => entry.item !== undefined)
        .sort((a, b) => b.totalSold - a.totalSold)
        .slice(0, topN);
    return topSellingItems;
}
function groupWasteByReason(wasteRecords: WasteRecord[]): Record<WasteReason, WasteRecord[]> { //Agrupa registros de desperdicio por razón. Retorna un objeto donde las claves son razones de desperdicio y los valores son arrays de registros.
    return wasteRecords.reduce((groups, record) => {
        if (!groups[record.reason]) {
            groups[record.reason] = [];
        }
        groups[record.reason].push(record);
        return groups;
    }, {} as Record<WasteReason, WasteRecord[]>);
}
function calculateCountryComparison(sales: SaleTransaction[], locations: Location[], menuItems: MenuItem[]): {Colombia: CountryMetrics, USA: CountryMetrics} {
    const countryMetrics: Record<Country, CountryMetrics> = {
        Colombia: {
            totalLocations: 0,
            totalRevenue: { USD: 0, COP: 0 },
            averageRevenuePerLocation: { USD: 0, COP: 0 },
            totalSales: 0
        },
        USA: {
            totalLocations: 0,
            totalRevenue: { USD: 0, COP: 0 },
            averageRevenuePerLocation: { USD: 0, COP: 0 },
            totalSales: 0
        }
    };
    locations.forEach(location => {
        const country = location.country;
        countryMetrics[country].totalLocations += 1;
        const locationSales = filterSalesByLocation(sales, location.id);
        const locationRevenueUSD = locationSales.reduce((total, sale) => total + sale.totalPrice.USD, 0);
        const locationRevenueCOP = locationSales.reduce((total, sale) => total + sale.totalPrice.COP, 0);
        countryMetrics[country].totalRevenue.USD += locationRevenueUSD;
        countryMetrics[country].totalRevenue.COP += locationRevenueCOP;
        countryMetrics[country].totalSales += locationSales.length;
    });
    Object.keys(countryMetrics).forEach(country => {
        const metrics = countryMetrics[country as Country];
        if (metrics.totalLocations > 0) {
            metrics.averageRevenuePerLocation.USD = metrics.totalRevenue.USD / metrics.totalLocations;
            metrics.averageRevenuePerLocation.COP = metrics.totalRevenue.COP / metrics.totalLocations;
        }
    });
    return countryMetrics;
}

export {
    calculateDailyRevenue,
    calculateLocationMargin,
    calculateWasteCost,
    convertCurrency,
    rankLocationsByPerformance,
    countSalesByPaymentMethod,
    scoreLocationPerformance,
    calculateAverageTicket,
    findTopSellingItems,
    groupWasteByReason,
    calculateCountryComparison
};