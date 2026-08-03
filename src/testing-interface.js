const deliveryOrders = [
  {
    id: 'ord-001',
    companyName: 'NorthPoint Commerce',
    service: 'last-mile-delivery',
    destinationCity: 'Valencia',
    status: 'in-transit',
    dispatchDate: '2026-08-03T08:15:00.000Z',
    deliveryDate: null,
    packageCount: 38,
    distanceKm: 356,
    shippingCostUsd: 915.4
  },
  {
    id: 'ord-002',
    companyName: 'NorthPoint Commerce',
    service: 'order-fulfillment',
    destinationCity: 'Barcelona',
    status: 'delivered',
    dispatchDate: '2026-08-03T07:30:00.000Z',
    deliveryDate: '2026-08-03T19:10:00.000Z',
    packageCount: 24,
    distanceKm: 620,
    shippingCostUsd: 1180.25
  },
  {
    id: 'ord-003',
    companyName: 'Nova Route Labs',
    service: 'warehousing',
    destinationCity: 'Seville',
    status: 'pending',
    dispatchDate: '2026-08-04T09:00:00.000Z',
    deliveryDate: null,
    packageCount: 10,
    distanceKm: 530,
    shippingCostUsd: 740.0
  },
  {
    id: 'ord-004',
    companyName: 'Axis Retail Group',
    service: 'reverse-logistics',
    destinationCity: 'Bilbao',
    status: 'cancelled',
    dispatchDate: '2026-08-02T11:10:00.000Z',
    deliveryDate: null,
    packageCount: 7,
    distanceKm: 410,
    shippingCostUsd: 520.5
  }
];

const inventoryRecords = [
  {
    id: 'inv-001',
    warehouseCity: 'Madrid',
    sku: 'ELEC-HEADSET-100',
    productType: 'electronics',
    unitsInStock: 580,
    reorderPoint: 120,
    unitValueUsd: 42.5,
    updatedAt: '2026-08-02T15:00:00.000Z'
  },
  {
    id: 'inv-002',
    warehouseCity: 'Guadalajara',
    sku: 'FASH-JACKET-230',
    productType: 'fashion',
    unitsInStock: 310,
    reorderPoint: 90,
    unitValueUsd: 33.2,
    updatedAt: '2026-08-02T16:20:00.000Z'
  },
  {
    id: 'inv-003',
    warehouseCity: 'Monterrey',
    sku: 'COSM-SERUM-050',
    productType: 'cosmetics',
    unitsInStock: 920,
    reorderPoint: 160,
    unitValueUsd: 18.9,
    updatedAt: '2026-08-03T10:45:00.000Z'
  }
];

const resultMeta = document.getElementById('resultMeta');
const resultOutput = document.getElementById('resultOutput');

const filterStatus = document.getElementById('filterStatus');
const filterMinCost = document.getElementById('filterMinCost');
const filterMaxCost = document.getElementById('filterMaxCost');

const sortField = document.getElementById('sortField');
const sortDirection = document.getElementById('sortDirection');

const searchOrderId = document.getElementById('searchOrderId');
const searchCost = document.getElementById('searchCost');

function toNumberOrUndefined(value) {
  if (value === '' || value === null) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function printResult(label, payload) {
  const now = new Date().toLocaleTimeString();
  resultMeta.textContent = `${label} executed at ${now}`;
  resultOutput.textContent = JSON.stringify(payload, null, 2);
}

function compareValues(left, right) {
  if (typeof left === 'string' && typeof right === 'string') {
    return left.localeCompare(right, undefined, { sensitivity: 'base' });
  }

  if (left < right) {
    return -1;
  }

  if (left > right) {
    return 1;
  }

  return 0;
}

function filterDeliveryOrders(items, filters) {
  return items.filter((item) => {
    if (filters.status && item.status !== filters.status) {
      return false;
    }

    if (typeof filters.minShippingCostUsd === 'number' && item.shippingCostUsd < filters.minShippingCostUsd) {
      return false;
    }

    if (typeof filters.maxShippingCostUsd === 'number' && item.shippingCostUsd > filters.maxShippingCostUsd) {
      return false;
    }

    return true;
  });
}

function sortByField(items, field, direction) {
  const factor = direction === 'asc' ? 1 : -1;
  return [...items].sort((left, right) => factor * compareValues(left[field], right[field]));
}

function linearSearch(items, matcher) {
  for (let index = 0; index < items.length; index += 1) {
    if (matcher(items[index])) {
      return index;
    }
  }

  return -1;
}

function binarySearchByNumber(items, target, valueSelector) {
  let left = 0;
  let right = items.length - 1;

  while (left <= right) {
    const middle = Math.floor((left + right) / 2);
    const current = valueSelector(items[middle]);

    if (current === target) {
      return middle;
    }

    if (current < target) {
      left = middle + 1;
    } else {
      right = middle - 1;
    }
  }

  return -1;
}

function countByCategory(items, selector) {
  return items.reduce((counts, item) => {
    const key = selector(item);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function sumBy(items, selector) {
  return items.reduce((total, item) => total + selector(item), 0);
}

function averageBy(items, selector) {
  if (items.length === 0) {
    return 0;
  }

  return sumBy(items, selector) / items.length;
}

function maxBy(items, selector) {
  if (items.length === 0) {
    return null;
  }

  return items.reduce((max, item) => Math.max(max, selector(item)), Number.NEGATIVE_INFINITY);
}

function minBy(items, selector) {
  if (items.length === 0) {
    return null;
  }

  return items.reduce((min, item) => Math.min(min, selector(item)), Number.POSITIVE_INFINITY);
}

function generateDeliveryOperationsReport(orders) {
  return {
    totalOrders: orders.length,
    totalShippingCostUsd: sumBy(orders, (order) => order.shippingCostUsd),
    averageShippingCostUsd: averageBy(orders, (order) => order.shippingCostUsd),
    averageDistanceKm: averageBy(orders, (order) => order.distanceKm),
    maxShippingCostUsd: maxBy(orders, (order) => order.shippingCostUsd),
    minShippingCostUsd: minBy(orders, (order) => order.shippingCostUsd),
    ordersByStatus: countByCategory(orders, (order) => order.status)
  };
}

function generateInventorySummaryReport(records) {
  return {
    totalSkus: records.length,
    totalUnitsInStock: sumBy(records, (record) => record.unitsInStock),
    totalInventoryValueUsd: sumBy(records, (record) => record.unitsInStock * record.unitValueUsd),
    averageUnitValueUsd: averageBy(records, (record) => record.unitValueUsd),
    unitsByProductType: records.reduce((totals, record) => {
      totals[record.productType] = (totals[record.productType] ?? 0) + record.unitsInStock;
      return totals;
    }, {})
  };
}

document.getElementById('runFilter').addEventListener('click', () => {
  const filtered = filterDeliveryOrders(deliveryOrders, {
    status: filterStatus.value || undefined,
    minShippingCostUsd: toNumberOrUndefined(filterMinCost.value),
    maxShippingCostUsd: toNumberOrUndefined(filterMaxCost.value)
  });

  printResult('Filter Orders', {
    totalFound: filtered.length,
    data: filtered
  });
});

document.getElementById('runSort').addEventListener('click', () => {
  const sorted = sortByField(deliveryOrders, sortField.value, sortDirection.value);

  printResult('Sort Orders', {
    sortField: sortField.value,
    direction: sortDirection.value,
    data: sorted
  });
});

document.getElementById('runLinearSearch').addEventListener('click', () => {
  const targetId = searchOrderId.value.trim();
  const index = linearSearch(deliveryOrders, (order) => order.id.toLowerCase() === targetId.toLowerCase());

  printResult('Linear Search', {
    targetOrderId: targetId,
    index,
    result: index >= 0 ? deliveryOrders[index] : null
  });
});

document.getElementById('runBinarySearch').addEventListener('click', () => {
  const targetCost = toNumberOrUndefined(searchCost.value);
  if (typeof targetCost !== 'number') {
    printResult('Binary Search', {
      error: 'Please enter a valid shipping cost number.'
    });
    return;
  }

  const sortedByCost = sortByField(deliveryOrders, 'shippingCostUsd', 'asc');
  const index = binarySearchByNumber(sortedByCost, targetCost, (order) => order.shippingCostUsd);

  printResult('Binary Search', {
    targetShippingCostUsd: targetCost,
    sortedData: sortedByCost,
    index,
    result: index >= 0 ? sortedByCost[index] : null
  });
});

document.getElementById('runDeliveryReport').addEventListener('click', () => {
  printResult('Delivery Report', generateDeliveryOperationsReport(deliveryOrders));
});

document.getElementById('runInventoryReport').addEventListener('click', () => {
  printResult('Inventory Report', generateInventorySummaryReport(inventoryRecords));
});

document.getElementById('clearResults').addEventListener('click', () => {
  resultMeta.textContent = 'Run an operation to see output.';
  resultOutput.textContent = JSON.stringify(
    {
      message: 'No operation executed yet'
    },
    null,
    2
  );
});