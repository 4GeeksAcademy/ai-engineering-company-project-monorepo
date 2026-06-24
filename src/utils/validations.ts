import { FilterRule, NumericRange } from "./collections";

// Comprueba si un valor numerico cae dentro de un rango opcional min/max.
export function inNumericRange(value: number, range: NumericRange): boolean {
	if (range.min !== undefined && value < range.min) return false;
	if (range.max !== undefined && value > range.max) return false;
	return true;
}

// Evalua una regla de filtrado para un item, soportando predicado, rango e igualdad/lista.
export function matchesRule<T>(item: T, rule: FilterRule<T>): boolean {
	if (rule.predicate && !rule.predicate(item)) return false;

	if (rule.range) {
		if (rule.resolver) {
			return inNumericRange(rule.resolver(item), rule.range);
		}

		if (!rule.field) return false;
		const value = item[rule.field];
		if (typeof value !== "number") return false;
		return inNumericRange(value, rule.range);
	}

	if (rule.field) {
		const value = item[rule.field] as unknown;

		if (rule.equals !== undefined && value !== rule.equals) return false;

		if (rule.in && !rule.in.includes(value)) return false;
	}

	return true;
}