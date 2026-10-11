import type { Location, MenuItem } from "../types/models";

export function findLocationById(
	locations: Location[],
	id: string,
): Location | null {
	for (const location of locations) {
		if (location.id === id) {
			return location;
		}
	}

	return null;
}

export function findMenuItemByName(
	items: MenuItem[],
	name: string,
): MenuItem | null {
	const normalizedTargetName = name.toLowerCase();

	for (const item of items) {
		if (item.name.toLowerCase() === normalizedTargetName) {
			return item;
		}
	}

	return null;
}

export function binarySearchLocationByCapacity(
	sortedLocations: Location[],
	targetCapacity: number,
): number {
	let left = 0;
	let right = sortedLocations.length - 1;

	while (left <= right) {
		const mid = Math.floor((left + right) / 2);
		const currentCapacity = sortedLocations[mid].seatingCapacity;

		if (currentCapacity === targetCapacity) {
			return mid;
		}

		if (currentCapacity < targetCapacity) {
			left = mid + 1;
		} else {
			right = mid - 1;
		}
	}

	return -1;
}
