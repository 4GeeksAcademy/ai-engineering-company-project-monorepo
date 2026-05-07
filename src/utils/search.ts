import { Location, MenuItem } from "../types/model";

function findLocationById(locations: Location[], id: string): Location | null {
    return locations.find(location => location.id === id) || null;
}
function findMenuItemByName(items: MenuItem[], name: string): MenuItem | null {
    return items.find(item => item.name.toLowerCase() === name.toLowerCase()) || null;
}
function binarySearchLocationByCapacity(sortedLocations: Location[], targetCapacity: number): number {
    let left = 0;
    let right = sortedLocations.length - 1;
    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        const midCapacity = sortedLocations[mid].seatingCapacity;
        if (midCapacity === targetCapacity) {
            return mid; // Capacidad encontrada, devolver índice
        } else if (midCapacity < targetCapacity) {
            left = mid + 1; // Buscar en la mitad derecha
        } else {
            right = mid - 1; // Buscar en la mitad izquierda
        }
    }
    return -1; // Capacidad no encontrada
}

export {
    findLocationById,
    findMenuItemByName,
    binarySearchLocationByCapacity
};