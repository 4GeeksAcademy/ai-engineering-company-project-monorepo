export type CategoryKey = string | number | symbol;

export interface ExtremumResult<T> {
	item: T;
	value: number;
}

// Cuenta cuantos elementos pertenecen a cada categoria calculada.
export function countByCategory<T, K extends CategoryKey>(
	items: T[],
	getCategory: (item: T) => K
): Partial<Record<K, number>> {
	return items.reduce<Partial<Record<K, number>>>((accumulator, item) => {
		const category = getCategory(item);
		accumulator[category] = (accumulator[category] ?? 0) + 1;
		return accumulator;
	}, {});
}

// Suma un valor numerico calculado para todos los elementos de la coleccion.
export function sumBy<T>(items: T[], getValue: (item: T) => number): number {
	return items.reduce((total, item) => total + getValue(item), 0);
}

// Calcula el promedio de un valor numerico o devuelve undefined si no hay elementos.
export function averageBy<T>(items: T[], getValue: (item: T) => number): number | undefined {
	if (items.length === 0) return undefined;
	return sumBy(items, getValue) / items.length;
}

// Encuentra el elemento con el mayor valor numerico calculado.
export function maxBy<T>(items: T[], getValue: (item: T) => number): ExtremumResult<T> | undefined {
	if (items.length === 0) return undefined;

	return items.slice(1).reduce<ExtremumResult<T>>(
		(currentMax, item) => {
			const value = getValue(item);
			if (value > currentMax.value) {
				return { item, value };
			}

			return currentMax;
		},
		{ item: items[0], value: getValue(items[0]) }
	);
}

// Encuentra el elemento con el menor valor numerico calculado.
export function minBy<T>(items: T[], getValue: (item: T) => number): ExtremumResult<T> | undefined {
	if (items.length === 0) return undefined;

	return items.slice(1).reduce<ExtremumResult<T>>(
		(currentMin, item) => {
			const value = getValue(item);
			if (value < currentMin.value) {
				return { item, value };
			}

			return currentMin;
		},
		{ item: items[0], value: getValue(items[0]) }
	);
}