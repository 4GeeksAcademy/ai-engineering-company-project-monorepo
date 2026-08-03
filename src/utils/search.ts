export type CompareFn<TItem, TTarget = TItem> = (left: TItem, right: TTarget) => number;

export function linearSearch<T>(items: T[], matcher: (item: T) => boolean): number {
  for (let index = 0; index < items.length; index += 1) {
    if (matcher(items[index])) {
      return index;
    }
  }

  return -1;
}

export function binarySearch<TItem, TTarget = TItem>(
  items: TItem[],
  target: TTarget,
  compare: CompareFn<TItem, TTarget>
): number {
  if (items.length === 0) {
    return -1;
  }

  let left = 0;
  let right = items.length - 1;

  while (left <= right) {
    const middle = Math.floor((left + right) / 2);
    const comparison = compare(items[middle], target);

    if (comparison === 0) {
      return middle;
    }

    if (comparison < 0) {
      left = middle + 1;
    } else {
      right = middle - 1;
    }
  }

  return -1;
}

export function binarySearchByNumber<TItem>(
  items: TItem[],
  target: number,
  valueSelector: (item: TItem) => number
): number {
  return binarySearch(
    items,
    target,
    (left: TItem, right: number) => valueSelector(left) - right
  );
}

export function binarySearchByString<TItem>(
  items: TItem[],
  target: string,
  valueSelector: (item: TItem) => string
): number {
  const normalizedTarget = target.toLowerCase();

  return binarySearch(items, normalizedTarget, (left: TItem, right: string) => {
    const leftValue = valueSelector(left).toLowerCase();

    if (leftValue < right) {
      return -1;
    }

    if (leftValue > right) {
      return 1;
    }

    return 0;
  });
}