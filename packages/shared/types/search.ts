export function linearSearch<T>(
  items: T[],
  predicate: (item: T) => boolean,
): T | undefined {
  for (const item of items) {
    if (predicate(item)) {
      return item;
    }
  }
  return undefined;
}

export function linearSearchIndex<T>(
  items: T[],
  predicate: (item: T) => boolean,
): number {
  for (let index: number = 0; index < items.length; index += 1) {
    if (predicate(items[index])) {
      return index;
    }
  }
  return -1;
}

export function binarySearchByNumber<T>(
  sortedItems: T[],
  target: number,
  valueSelector: (item: T) => number,
): number {
  let left: number = 0;
  let right: number = sortedItems.length - 1;

  while (left <= right) {
    const middle: number = Math.floor((left + right) / 2);
    const middleValue: number = valueSelector(sortedItems[middle]);

    if (middleValue === target) {
      return middle;
    }

    if (middleValue < target) {
      left = middle + 1;
    } else {
      right = middle - 1;
    }
  }

  return -1;
}

export function binarySearchByString<T>(
  sortedItems: T[],
  target: string,
  valueSelector: (item: T) => string,
): number {
  let left: number = 0;
  let right: number = sortedItems.length - 1;

  while (left <= right) {
    const middle: number = Math.floor((left + right) / 2);
    const middleValue: string = valueSelector(sortedItems[middle]);

    if (middleValue === target) {
      return middle;
    }

    if (middleValue < target) {
      left = middle + 1;
    } else {
      right = middle - 1;
    }
  }

  return -1;
}
