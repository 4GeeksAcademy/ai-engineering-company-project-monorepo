import { matchesRule } from "./validations";

export interface NumericRange {
	min?: number;
	max?: number;
}

export interface FilterRule<T, TValue = unknown> {
	field?: keyof T;
	equals?: TValue;
	in?: TValue[];
	range?: NumericRange;
	predicate?: (item: T) => boolean;
	resolver?: (item: T) => number;
}

/**
 * Filtra una colección por uno o más criterios con lógica AND.
 * Si no se envían criterios, devuelve una copia del array original.
 */
export function filterByCriteria<T>(
	items: T[],
	criteria?: FilterRule<T> | FilterRule<T>[]
): T[] {
	if (!criteria) return [...items];

	const rules = Array.isArray(criteria) ? criteria : [criteria];
	if (rules.length === 0) return [...items];

	return items.filter((item) => rules.every((rule) => matchesRule(item, rule)));
}