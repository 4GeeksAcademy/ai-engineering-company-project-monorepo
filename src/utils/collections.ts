export type { SortDirection } from "../../packages/shared/types/collections";

export {
  isEmpty,
  filterItems,
  sortItems,
  groupBy,
} from "../../packages/shared/types/collections";

export function mapItems<T, R>(items: T[], mapper: (item: T, index: number) => R): R[] {
  return items.map(mapper);
}

export function flattenMatrix<T>(matrix: T[][]): T[] {
  return matrix.reduce<T[]>((flat, row) => flat.concat(row), []);
}

export function transposeMatrix<T>(matrix: T[][]): T[][] {
  if (matrix.length === 0) {
    return [];
  }

  const totalColumns = matrix[0].length;
  for (const row of matrix) {
    if (row.length !== totalColumns) {
      throw new Error("Todas las filas de la matriz deben tener la misma longitud.");
    }
  }

  return Array.from({ length: totalColumns }, (_, columnIndex) =>
    matrix.map((row) => row[columnIndex])
  );
}