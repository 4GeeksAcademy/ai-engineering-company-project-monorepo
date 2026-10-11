import type {
	CountryMetrics,
	Location,
	MenuItem,
	PaymentMethod,
	SaleTransaction,
	WasteRecord,
	WasteReason,
} from "../types/models";

const COP_PER_USD = 4000;

function roundToTwoDecimals(value: number): number {
	return Math.round(value * 100) / 100;
}

function isSameCalendarDate(dateA: Date, dateB: Date): boolean {
	return (
		dateA.getFullYear() === dateB.getFullYear() &&
		dateA.getMonth() === dateB.getMonth() &&
		dateA.getDate() === dateB.getDate()
	);
}

export function calculateDailyRevenue(
	sales: SaleTransaction[],
	date: Date,
	currency: "USD" | "COP",
): number {
	const totalRevenue = sales
		.filter((sale) => isSameCalendarDate(sale.timestamp, date))
		.reduce((sum, sale) => sum + sale.totalPrice[currency], 0);

	return roundToTwoDecimals(totalRevenue);
}

export function calculateLocationMargin(
	sales: SaleTransaction[],
	menuItems: MenuItem[],
	locationId: string,
	currency: "USD" | "COP",
): number {
	const salesForLocation = sales.filter((sale) => sale.locationId === locationId);

	const totalRevenue = salesForLocation.reduce(
		(sum, sale) => sum + sale.totalPrice[currency],
		0,
	);

	if (totalRevenue === 0) {
		return 0;
	}

	const totalIngredientCost = salesForLocation.reduce((sum, sale) => {
		const menuItem = menuItems.find((item) => item.id === sale.itemId);
		if (!menuItem) {
			return sum;
		}

		return sum + menuItem.ingredientCost[currency] * sale.quantity;
	}, 0);

	const margin =
		((totalRevenue - totalIngredientCost) / totalRevenue) * 100;

	return roundToTwoDecimals(margin);
}

export function calculateWasteCost(
	wasteRecords: WasteRecord[],
	locationId: string,
	currency: "USD" | "COP",
): number {
	const totalWasteCost = wasteRecords
		.filter((record) => record.locationId === locationId)
		.reduce((sum, record) => sum + record.cost[currency], 0);

	return roundToTwoDecimals(totalWasteCost);
}

export function convertCurrency(
	amount: number,
	fromCurrency: "USD" | "COP",
	toCurrency: "USD" | "COP",
): number {
	if (fromCurrency === toCurrency) {
		return amount;
	}

	if (fromCurrency === "USD" && toCurrency === "COP") {
		return roundToTwoDecimals(amount * COP_PER_USD);
	}

	return roundToTwoDecimals(amount / COP_PER_USD);
}

export function scoreLocationPerformance(
	location: Location,
	sales: SaleTransaction[],
	wasteRecords: WasteRecord[],
	menuItems: MenuItem[],
): number {
	const salesForLocation = sales.filter((sale) => sale.locationId === location.id);
	const totalRevenueUSD = salesForLocation.reduce(
		(sum, sale) => sum + sale.totalPrice.USD,
		0,
	);

	const openingDateEstimate = new Date(location.openingYear, 0, 1);
	const today = new Date();
	const millisecondsInDay = 24 * 60 * 60 * 1000;
	const daysSinceOpening = Math.max(
		1,
		Math.floor(
			(today.getTime() - openingDateEstimate.getTime()) / millisecondsInDay,
		),
	);

	const averageDailyRevenueUSD = totalRevenueUSD / daysSinceOpening;
	const revenueScore = Math.min((averageDailyRevenueUSD / 1000) * 40, 40);

	const efficiencyScore = Math.min(
		(salesForLocation.length / location.seatingCapacity) * 30,
		30,
	);

	const totalWasteUSD = calculateWasteCost(wasteRecords, location.id, "USD");
	const wastePercentage =
		totalRevenueUSD > 0 ? (totalWasteUSD / totalRevenueUSD) * 100 : 100;
	const wasteControlScore = Math.max(20 - wastePercentage * 2, 0);

	const margin = calculateLocationMargin(sales, menuItems, location.id, "USD");
	const marginScore = Math.min(margin / 10, 10);

	const totalScore =
		revenueScore + efficiencyScore + wasteControlScore + marginScore;

	return roundToTwoDecimals(Math.min(Math.max(totalScore, 0), 100));
}

export function rankLocationsByPerformance(
	locations: Location[],
	sales: SaleTransaction[],
	wasteRecords: WasteRecord[],
	menuItems: MenuItem[],
): Array<{ location: Location; score: number }> {
	return locations
		.map((location) => ({
			location,
			score: scoreLocationPerformance(location, sales, wasteRecords, menuItems),
		}))
		.sort((a, b) => b.score - a.score);
}

export function countSalesByPaymentMethod(
	sales: SaleTransaction[],
): Record<PaymentMethod, number> {
	const initialCounts: Record<PaymentMethod, number> = {
		Cash: 0,
		"Credit card": 0,
		"Debit card": 0,
		"Digital wallet": 0,
	};

	return sales.reduce<Record<PaymentMethod, number>>((counts, sale) => {
		counts[sale.paymentMethod] += 1;
		return counts;
	}, initialCounts);
}

export function calculateAverageTicket(
	sales: SaleTransaction[],
	currency: "USD" | "COP",
): number {
	if (sales.length === 0) {
		return 0;
	}

	const totalAmount = sales.reduce(
		(sum, sale) => sum + sale.totalPrice[currency],
		0,
	);

	return roundToTwoDecimals(totalAmount / sales.length);
}

export function findTopSellingItems(
	sales: SaleTransaction[],
	menuItems: MenuItem[],
	topN: number,
): Array<{ item: MenuItem; totalSold: number }> {
	if (topN <= 0) {
		return [];
	}

	const salesByItemId = sales.reduce<Map<string, number>>((accumulator, sale) => {
		const currentTotal = accumulator.get(sale.itemId) ?? 0;
		accumulator.set(sale.itemId, currentTotal + sale.quantity);
		return accumulator;
	}, new Map<string, number>());

	return menuItems
		.map((item) => ({
			item,
			totalSold: salesByItemId.get(item.id) ?? 0,
		}))
		.filter((entry) => entry.totalSold > 0)
		.sort((a, b) => b.totalSold - a.totalSold)
		.slice(0, topN);
}

export function groupWasteByReason(
	wasteRecords: WasteRecord[],
): Record<WasteReason, WasteRecord[]> {
	const grouped: Record<WasteReason, WasteRecord[]> = {
		Expired: [],
		"Cooking error": [],
		"Customer return": [],
		Damage: [],
		Other: [],
	};

	for (const record of wasteRecords) {
		grouped[record.reason].push(record);
	}

	return grouped;
}

export function calculateCountryComparison(
	sales: SaleTransaction[],
	locations: Location[],
	menuItems: MenuItem[],
): { Colombia: CountryMetrics; USA: CountryMetrics } {
	const countryByLocationId = new Map<string, "Colombia" | "USA">(
		locations.map((location) => [location.id, location.country]),
	);
	const validMenuItemIds = new Set<string>(menuItems.map((item) => item.id));

	const initialMetrics: { Colombia: CountryMetrics; USA: CountryMetrics } = {
		Colombia: {
			totalLocations: locations.filter((location) => location.country === "Colombia")
				.length,
			totalRevenue: { USD: 0, COP: 0 },
			averageRevenuePerLocation: { USD: 0, COP: 0 },
			totalSales: 0,
		},
		USA: {
			totalLocations: locations.filter((location) => location.country === "USA").length,
			totalRevenue: { USD: 0, COP: 0 },
			averageRevenuePerLocation: { USD: 0, COP: 0 },
			totalSales: 0,
		},
	};

	const totals = sales.reduce((accumulator, sale) => {
		const country = countryByLocationId.get(sale.locationId);
		if (!country || !validMenuItemIds.has(sale.itemId)) {
			return accumulator;
		}

		accumulator[country].totalRevenue.USD += sale.totalPrice.USD;
		accumulator[country].totalRevenue.COP += sale.totalPrice.COP;
		accumulator[country].totalSales += 1;

		return accumulator;
	}, initialMetrics);

	const computeAverageRevenue = (countryMetrics: CountryMetrics): CountryMetrics => {
		if (countryMetrics.totalLocations === 0) {
			return {
				...countryMetrics,
				averageRevenuePerLocation: { USD: 0, COP: 0 },
			};
		}

		return {
			...countryMetrics,
			averageRevenuePerLocation: {
				USD: roundToTwoDecimals(
					countryMetrics.totalRevenue.USD / countryMetrics.totalLocations,
				),
				COP: roundToTwoDecimals(
					countryMetrics.totalRevenue.COP / countryMetrics.totalLocations,
				),
			},
		};
	};

	return {
		Colombia: computeAverageRevenue(totals.Colombia),
		USA: computeAverageRevenue(totals.USA),
	};
}
