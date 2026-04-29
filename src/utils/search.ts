export function searchLinear<T>(arr: T[], predicate: (item: T) => boolean): number {
  for (let i = 0; i < arr.length; i++) {
    if (predicate(arr[i])) return i;
  }
  return -1;
}

export function binarySearch<T, K>(
  arr: T,
  key: any,
  comparer: (item: any, key: any) => number
): number {
  // Note: this signature kept for backward compatibility; prefer binarySearchByKey below
  const a = arr as unknown as T[];
  let low = 0;
  let high = a.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const cmp = comparer(a[mid], key);

    if (cmp === 0) return mid;
    if (cmp < 0) low = mid + 1;
    else high = mid - 1;
  }
  return -1;
}

export function binarySearchByKey<T, K extends number | string>(
  arr: T[],
  target: K,
  keySelector: (item: T) => K
): number {
  let low = 0;
  let high = arr.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const midVal = keySelector(arr[mid]);
    if (midVal === target) return mid;
    if (midVal < target) low = mid + 1;
    else high = mid - 1;
  }
  return -1;
}
