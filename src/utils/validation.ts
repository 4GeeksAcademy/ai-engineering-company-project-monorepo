import { MenuItem, SaleTransaction, Location } from "../types/model";

function validateMenuItem(item: MenuItem): { valid: boolean, errors: string[] } {
    const errors: string[] = [];
    if (!item.id || typeof item.id !== "string") {
        errors.push("ID de ítem de menú es requerido y debe ser una cadena.");
    }
    if (!item.name || typeof item.name !== "string") {
        errors.push("Nombre de ítem de menú es requerido y debe ser una cadena.");
    }
    if (!["Meat", "Side", "Beverage", "Dessert", "Combo"].includes(item.category)) {
        errors.push("Categoría de ítem de menú debe ser una de: Meat, Side, Beverage, Dessert, Combo.");
    }
    if (typeof item.basePrice.USD !== "number" || item.basePrice.USD < 0) {
        errors.push("Precio base en USD debe ser un número no negativo.");
    }
    if (typeof item.basePrice.COP !== "number" || item.basePrice.COP < 0) {
        errors.push("Precio base en COP debe ser un número no negativo.");
    }
    if (typeof item.ingredientCost.USD !== "number" || item.ingredientCost.USD < 0) {
        errors.push("Costo de ingredientes en USD debe ser un número no negativo.");
    }
    if (typeof item.ingredientCost.COP !== "number" || item.ingredientCost.COP < 0) {
        errors.push("Costo de ingredientes en COP debe ser un número no negativo.");
    }
    if (typeof item.prepTimeMinutes !== "number" || item.prepTimeMinutes < 0) {
        errors.push("Tiempo de preparación debe ser un número no negativo.");
    }
    if (typeof item.isAvailableInColombia !== "boolean") {
        errors.push("isAvailableInColombia debe ser un booleano.");
    }
    if (typeof item.isAvailableInUSA !== "boolean") {
        errors.push("isAvailableInUSA debe ser un booleano.");
    }
    if (!Array.isArray(item.allergens)) {
        errors.push("Allergens debe ser un array de cadenas.");
    } else if (!item.allergens.every(allergen => typeof allergen === "string")) {
        errors.push("Cada alérgeno debe ser una cadena.");
    }
    if (!["Active", "Seasonal", "Discontinued"].includes(item.status)) {
        errors.push("Status de ítem de menú debe ser una de: Active, Seasonal, Discontinued.");
    }
    return {
        valid: errors.length === 0,
        errors
    };
}

function validateSaleTransaction(sale: SaleTransaction): { valid: boolean, errors: string[] } {
    const errors: string[] = [];
    if (!sale.id || typeof sale.id !== "string") {
        errors.push("ID de transacción es requerido y debe ser una cadena.");
    }
    if (!sale.locationId || typeof sale.locationId !== "string") {
        errors.push("ID de locación es requerido y debe ser una cadena.");
    }
    if (!sale.itemId || typeof sale.itemId !== "string") {
        errors.push("ID de ítem vendido es requerido y debe ser una cadena.");
    }
    if (typeof sale.quantity !== "number" || sale.quantity <= 0) {
        errors.push("Cantidad vendida debe ser un número positivo.");
    }
    if (typeof sale.totalPrice.USD !== "number" || sale.totalPrice.USD < 0) {
        errors.push("Precio total en USD debe ser un número no negativo.");
    }
    if (typeof sale.totalPrice.COP !== "number" || sale.totalPrice.COP < 0) {
        errors.push("Precio total en COP debe ser un número no negativo.");
    }
    if (!["Cash", "Credit card", "Debit card", "Digital wallet"].includes(sale.paymentMethod)) {
        errors.push("Método de pago debe ser uno de: Cash, Credit card, Debit card, Digital wallet.");
    }
    if (!(sale.timestamp instanceof Date) || isNaN(sale.timestamp.getTime())) {
        errors.push("Timestamp debe ser una fecha válida.");
    }
    if (!sale.waiterName || typeof sale.waiterName !== "string") {
        errors.push("Nombre del mesero es requerido y debe ser una cadena.");
    }
    return {
        valid: errors.length === 0,
        errors
    };
}

function validateLocation(location: Location): { valid: boolean, errors: string[] } {
    const errors: string[] = [];
    if (!location.id || typeof location.id !== "string") {
        errors.push("ID de locación es requerido y debe ser una cadena.");
    }
    if (!location.name || typeof location.name !== "string") {
        errors.push("Nombre de locación es requerido y debe ser una cadena.");
    }
    if (!location.city || typeof location.city !== "string") {
        errors.push("Ciudad de locación es requerido y debe ser una cadena.");
    }
    if (!["Colombia", "USA"].includes(location.country)) {
        errors.push("País de locación debe ser Colombia o USA.");
    }
    if (typeof location.openingYear !== "number" || location.openingYear < 1900 || location.openingYear > new Date().getFullYear()) {
        errors.push("Año de apertura debe ser un número entre 1900 y el año actual.");
    }
    if (typeof location.seatingCapacity !== "number" || location.seatingCapacity <= 0) {
        errors.push("Capacidad de asientos debe ser un número positivo.");
    }
    if (typeof location.staffCount !== "number" || location.staffCount < 0) {
        errors.push("Número de empleados debe ser un número no negativo.");
    }
    if (typeof location.monthlyRentCost.USD !== "number" || location.monthlyRentCost.USD < 0) {
        errors.push("Costo de renta mensual en USD debe ser un número no negativo.");
    }
    if (typeof location.monthlyRentCost.COP !== "number" || location.monthlyRentCost.COP < 0) {
        errors.push("Costo de renta mensual en COP debe ser un número no negativo.");
    }
    if (typeof location.averageMonthlyUtilities.USD !== "number" || location.averageMonthlyUtilities.USD < 0) {
        errors.push("Costo promedio de servicios mensuales en USD debe ser un número no negativo.");
    }
    if (typeof location.averageMonthlyUtilities.COP !== "number" || location.averageMonthlyUtilities.COP < 0) {
        errors.push("Costo promedio de servicios mensuales en COP debe ser un número no negativo.");
    }
    if (!location.manager || typeof location.manager !== "string") {
        errors.push("Nombre del gerente es requerido y debe ser una cadena.");
    }
    if (!["Active", "Temporarily closed", "Under renovation"].includes(location.status)) {
        errors.push("Status de locación debe ser uno de: Active, Temporarily closed, Under renovation.");
    }
    return {
        valid: errors.length === 0,
        errors
    };
}

export {
    validateMenuItem,
    validateSaleTransaction,
    validateLocation
};
