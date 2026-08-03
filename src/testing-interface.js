const products = [
  {
    sku: 'SHOE-BLK-42',
    name: 'Black Running Shoes - Size 42',
    category: 'Fashion',
    weightKg: 0.8,
    dimensions: { lengthCm: 35, widthCm: 22, heightCm: 12 },
    warehouse: 'Los Angeles',
    stockQuantity: 45,
    minStockThreshold: 20,
    unitCostUSD: 35.0,
    isFragile: false,
    status: 'Active'
  },
  {
    sku: 'LAPTOP-DELL-15',
    name: 'Dell Laptop 15 inch',
    category: 'Electronics',
    weightKg: 2.3,
    dimensions: { lengthCm: 40, widthCm: 28, heightCm: 3 },
    warehouse: 'Zaragoza',
    stockQuantity: 8,
    minStockThreshold: 10,
    unitCostUSD: 650.0,
    isFragile: true,
    status: 'Low stock'
  },
  {
    sku: 'PERFUME-COCO-50',
    name: 'Coco Perfume 50ml',
    category: 'Cosmetics',
    weightKg: 0.3,
    dimensions: { lengthCm: 12, widthCm: 8, heightCm: 15 },
    warehouse: 'Los Angeles',
    stockQuantity: 120,
    minStockThreshold: 30,
    unitCostUSD: 85.0,
    isFragile: true,
    status: 'Active'
  }
];

const carriers = [
  {
    id: 'CAR-UPS',
    name: 'UPS',
    operatesIn: ['United States'],
    baseRateUSD: 5.0,
    ratePerKgUSD: 1.2,
    ratePerKmUSD: 0.05,
    avgDeliveryDays: 3,
    onTimeRate: 88,
    maxWeightKg: 30,
    handlesFragile: true,
    acceptsPriority: ['Standard', 'Express']
  },
  {
    id: 'CAR-SEUR',
    name: 'SEUR',
    operatesIn: ['Spain'],
    baseRateUSD: 6.5,
    ratePerKgUSD: 1.5,
    ratePerKmUSD: 0.08,
    avgDeliveryDays: 2,
    onTimeRate: 92,
    maxWeightKg: 25,
    handlesFragile: true,
    acceptsPriority: ['Standard', 'Express', 'Same-day']
  },
  {
    id: 'CAR-DHL',
    name: 'DHL Express',
    operatesIn: ['United States', 'Spain'],
    baseRateUSD: 12.0,
    ratePerKgUSD: 2.0,
    ratePerKmUSD: 0.1,
    avgDeliveryDays: 1,
    onTimeRate: 95,
    maxWeightKg: 50,
    handlesFragile: true,
    acceptsPriority: ['Express', 'Same-day']
  }
];

const shipments = [
  {
    id: 'SH-2024-8821',
    sku: 'LAPTOP-DELL-15',
    quantity: 1,
    origin: 'Zaragoza',
    destination: {
      city: 'Madrid',
      country: 'Spain',
      postalCode: '28001',
      distanceKm: 320
    },
    priority: 'Express',
    declaredValueUSD: 650.0,
    carrier: null,
    status: 'Pending',
    createdAt: new Date('2024-03-15')
  },
  {
    id: 'SH-2024-9001',
    sku: 'SHOE-BLK-42',
    quantity: 3,
    origin: 'Los Angeles',
    destination: {
      city: 'Los Angeles',
      country: 'United States',
      postalCode: '90001',
      distanceKm: 24
    },
    priority: 'Standard',
    declaredValueUSD: 105.0,
    carrier: 'UPS',
    status: 'Assigned',
    createdAt: new Date('2024-03-16')
  },
  {
    id: 'SH-2024-9002',
    sku: 'PERFUME-COCO-50',
    quantity: 2,
    origin: 'Los Angeles',
    destination: {
      city: 'Barcelona',
      country: 'Spain',
      postalCode: '08001',
      distanceKm: 300
    },
    priority: 'Same-day',
    declaredValueUSD: 170.0,
    carrier: 'DHL Express',
    status: 'In transit',
    createdAt: new Date('2024-03-17')
  }
];

const resultMeta = document.getElementById('resultMeta');
const resultOutput = document.getElementById('resultOutput');

const filterWarehouse = document.getElementById('filterWarehouse');
const filterCategory = document.getElementById('filterCategory');

const sortTarget = document.getElementById('sortTarget');
const sortDirection = document.getElementById('sortDirection');

const searchProductSku = document.getElementById('searchProductSku');
const searchShipmentId = document.getElementById('searchShipmentId');
const searchWeight = document.getElementById('searchWeight');

const shipmentSelect = document.getElementById('shipmentSelect');
const carrierSelect = document.getElementById('carrierSelect');

function roundTo2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

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

function getProductBySku(sku) {
  return products.find((product) => product.sku === sku) ?? null;
}

function calculatePriorityMultiplier(priority) {
  if (priority === 'Express') {
    return 1.3;
  }

  if (priority === 'Same-day') {
    return 1.6;
  }

  return 1;
}

function filterProductsByWarehouse(items, warehouse) {
  return items.filter((product) => product.warehouse === warehouse);
}

function filterProductsByCategory(items, category) {
  return items.filter((product) => product.category === category);
}

function filterLowStockProducts(items) {
  return items.filter((product) => product.stockQuantity <= product.minStockThreshold);
}

function sortProductsByStock(items, order) {
  const direction = order === 'asc' ? 1 : -1;
  return [...items].sort((left, right) => (left.stockQuantity - right.stockQuantity) * direction);
}

function sortCarriersByReliability(items, order) {
  const direction = order === 'asc' ? 1 : -1;
  return [...items].sort((left, right) => (left.onTimeRate - right.onTimeRate) * direction);
}

function findProductBySKU(items, sku) {
  const normalizedSku = sku.trim().toLowerCase();

  for (const product of items) {
    if (product.sku.toLowerCase() === normalizedSku) {
      return product;
    }
  }

  return null;
}

function findShipmentById(items, id) {
  for (const shipment of items) {
    if (shipment.id === id) {
      return shipment;
    }
  }

  return null;
}

function binarySearchProductByWeight(sortedProducts, targetWeight) {
  let left = 0;
  let right = sortedProducts.length - 1;

  while (left <= right) {
    const middle = Math.floor((left + right) / 2);
    const currentWeight = sortedProducts[middle].weightKg;

    if (currentWeight === targetWeight) {
      return middle;
    }

    if (currentWeight < targetWeight) {
      left = middle + 1;
    } else {
      right = middle - 1;
    }
  }

  return -1;
}

function calculateShippingCost(shipment, product, carrier) {
  const baseRate = carrier.baseRateUSD;
  const weightCost = product.weightKg * carrier.ratePerKgUSD * shipment.quantity;
  const distanceCost = shipment.destination.distanceKm * carrier.ratePerKmUSD;
  const subtotal = baseRate + weightCost + distanceCost;
  return roundTo2(subtotal * calculatePriorityMultiplier(shipment.priority));
}

function scoreCarrierForShipment(carrier, shipment, product) {
  let score = 0;

  if (carrier.operatesIn.includes(shipment.destination.country)) {
    score += 20;
  }

  if (product.weightKg * shipment.quantity <= carrier.maxWeightKg) {
    score += 20;
  }

  if (carrier.acceptsPriority.includes(shipment.priority)) {
    score += 15;
  }

  if (!product.isFragile || carrier.handlesFragile) {
    score += 15;
  }

  score += carrier.onTimeRate * 0.3;
  return roundTo2(score);
}

function selectBestCarrier(availableCarriers, shipment, product) {
  let best = null;

  for (const carrier of availableCarriers) {
    const score = scoreCarrierForShipment(carrier, shipment, product);

    if (score < 50) {
      continue;
    }

    const cost = calculateShippingCost(shipment, product, carrier);

    if (best === null || cost < best.cost) {
      best = { carrier, score, cost };
    }
  }

  return best;
}

function countProductsByCategory(items) {
  const counts = {
    Fashion: 0,
    Electronics: 0,
    Cosmetics: 0,
    Home: 0,
    Other: 0
  };

  for (const product of items) {
    counts[product.category] += 1;
  }

  return counts;
}

function calculateTotalInventoryValue(items) {
  const total = items.reduce((accumulator, product) => accumulator + product.stockQuantity * product.unitCostUSD, 0);
  return roundTo2(total);
}

function calculateAverageShipmentDistance(items) {
  if (items.length === 0) {
    return 0;
  }

  const totalDistance = items.reduce((accumulator, shipment) => accumulator + shipment.destination.distanceKm, 0);
  return roundTo2(totalDistance / items.length);
}

function groupShipmentsByStatus(items) {
  const grouped = {
    Pending: [],
    Assigned: [],
    'In transit': [],
    Delivered: [],
    Failed: []
  };

  for (const shipment of items) {
    grouped[shipment.status].push(shipment);
  }

  return grouped;
}

function findTopCarriers(items, topN) {
  if (topN <= 0) {
    return [];
  }

  const usageMap = new Map();

  for (const shipment of items) {
    if (shipment.carrier === null) {
      continue;
    }

    const currentCount = usageMap.get(shipment.carrier) ?? 0;
    usageMap.set(shipment.carrier, currentCount + 1);
  }

  return Array.from(usageMap.entries())
    .map(([carrier, count]) => ({ carrier, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, topN);
}

function validateProduct(product) {
  const errors = [];

  if (product.sku.trim().length === 0) {
    errors.push('sku must not be empty');
  }

  if (!Number.isFinite(product.weightKg) || product.weightKg <= 0 || product.weightKg > 100) {
    errors.push('weightKg must be > 0 and <= 100');
  }

  if (!Number.isFinite(product.dimensions.lengthCm) || product.dimensions.lengthCm <= 0 || product.dimensions.lengthCm > 200) {
    errors.push('dimensions.lengthCm must be > 0 and <= 200');
  }

  if (!Number.isFinite(product.dimensions.widthCm) || product.dimensions.widthCm <= 0 || product.dimensions.widthCm > 200) {
    errors.push('dimensions.widthCm must be > 0 and <= 200');
  }

  if (!Number.isFinite(product.dimensions.heightCm) || product.dimensions.heightCm <= 0 || product.dimensions.heightCm > 200) {
    errors.push('dimensions.heightCm must be > 0 and <= 200');
  }

  if (!Number.isFinite(product.stockQuantity) || product.stockQuantity < 0) {
    errors.push('stockQuantity must be >= 0');
  }

  if (!Number.isFinite(product.minStockThreshold) || product.minStockThreshold < 0) {
    errors.push('minStockThreshold must be >= 0');
  }

  if (!Number.isFinite(product.unitCostUSD) || product.unitCostUSD <= 0) {
    errors.push('unitCostUSD must be > 0');
  }

  return { valid: errors.length === 0, errors };
}

function validateShipment(shipment) {
  const errors = [];

  if (!Number.isFinite(shipment.quantity) || shipment.quantity <= 0) {
    errors.push('quantity must be > 0');
  }

  if (!Number.isFinite(shipment.declaredValueUSD) || shipment.declaredValueUSD <= 0) {
    errors.push('declaredValueUSD must be > 0');
  }

  if (!Number.isFinite(shipment.destination.distanceKm) || shipment.destination.distanceKm < 0) {
    errors.push('distanceKm must be >= 0');
  }

  return { valid: errors.length === 0, errors };
}

function validateCarrier(carrier) {
  const errors = [];

  if (!Number.isFinite(carrier.baseRateUSD) || carrier.baseRateUSD < 0) {
    errors.push('baseRateUSD must be >= 0');
  }

  if (!Number.isFinite(carrier.ratePerKgUSD) || carrier.ratePerKgUSD < 0) {
    errors.push('ratePerKgUSD must be >= 0');
  }

  if (!Number.isFinite(carrier.ratePerKmUSD) || carrier.ratePerKmUSD < 0) {
    errors.push('ratePerKmUSD must be >= 0');
  }

  if (!Number.isFinite(carrier.avgDeliveryDays) || carrier.avgDeliveryDays <= 0) {
    errors.push('avgDeliveryDays must be > 0');
  }

  if (!Number.isFinite(carrier.onTimeRate) || carrier.onTimeRate < 0 || carrier.onTimeRate > 100) {
    errors.push('onTimeRate must be between 0 and 100');
  }

  if (!Number.isFinite(carrier.maxWeightKg) || carrier.maxWeightKg <= 0) {
    errors.push('maxWeightKg must be > 0');
  }

  if (carrier.operatesIn.length < 1) {
    errors.push('operatesIn must contain at least 1 country');
  }

  return { valid: errors.length === 0, errors };
}

function populateSelectOptions() {
  for (const shipment of shipments) {
    const option = document.createElement('option');
    option.value = shipment.id;
    option.textContent = shipment.id;
    shipmentSelect.appendChild(option);
  }

  for (const carrier of carriers) {
    const option = document.createElement('option');
    option.value = carrier.id;
    option.textContent = carrier.name;
    carrierSelect.appendChild(option);
  }
}

document.getElementById('runFilter').addEventListener('click', () => {
  const warehouse = filterWarehouse.value;
  const category = filterCategory.value;

  const byWarehouse = warehouse ? filterProductsByWarehouse(products, warehouse) : products;
  const byCategory = category ? filterProductsByCategory(products, category) : byWarehouse;
  const lowStock = filterLowStockProducts(byCategory);

  printResult('Filter Products', {
    selectedWarehouse: warehouse || 'Any',
    selectedCategory: category || 'Any',
    totalFound: byCategory.length,
    lowStockCount: lowStock.length,
    data: byCategory
  });
});

document.getElementById('runSort').addEventListener('click', () => {
  if (sortTarget.value === 'products') {
    const sortedProducts = sortProductsByStock(products, sortDirection.value);
    printResult('Sort Products by Stock', {
      direction: sortDirection.value,
      data: sortedProducts
    });
    return;
  }

  const sortedCarriers = sortCarriersByReliability(carriers, sortDirection.value);
  printResult('Sort Carriers by Reliability', {
    direction: sortDirection.value,
    data: sortedCarriers
  });
});

document.getElementById('runProductSearch').addEventListener('click', () => {
  const sku = searchProductSku.value.trim();
  const found = findProductBySKU(products, sku);

  printResult('Find Product By SKU', {
    sku,
    result: found
  });
});

document.getElementById('runShipmentSearch').addEventListener('click', () => {
  const id = searchShipmentId.value.trim();
  const found = findShipmentById(shipments, id);

  printResult('Find Shipment By ID', {
    id,
    result: found
  });
});

document.getElementById('runWeightSearch').addEventListener('click', () => {
  const targetWeight = toNumberOrUndefined(searchWeight.value);
  if (typeof targetWeight !== 'number') {
    printResult('Binary Search Product By Weight', {
      error: 'Please enter a valid target weight.'
    });
    return;
  }

  const sortedByWeight = [...products].sort((left, right) => left.weightKg - right.weightKg);
  const index = binarySearchProductByWeight(sortedByWeight, targetWeight);

  printResult('Binary Search Product By Weight', {
    targetWeight,
    sortedByWeight,
    index,
    result: index >= 0 ? sortedByWeight[index] : null
  });
});

document.getElementById('runCarrierOps').addEventListener('click', () => {
  const shipment = findShipmentById(shipments, shipmentSelect.value);
  const carrier = carriers.find((item) => item.id === carrierSelect.value) ?? null;

  if (!shipment || !carrier) {
    printResult('Carrier Ops', {
      error: 'Please select both a shipment and a carrier.'
    });
    return;
  }

  const product = getProductBySku(shipment.sku);
  if (!product) {
    printResult('Carrier Ops', {
      error: `Product not found for shipment SKU ${shipment.sku}.`
    });
    return;
  }

  const cost = calculateShippingCost(shipment, product, carrier);
  const score = scoreCarrierForShipment(carrier, shipment, product);
  const bestCarrier = selectBestCarrier(carriers, shipment, product);

  printResult('Carrier Cost and Scoring', {
    shipmentId: shipment.id,
    selectedCarrier: carrier.name,
    selectedCarrierCost: cost,
    selectedCarrierScore: score,
    bestCarrier
  });
});

document.getElementById('runReports').addEventListener('click', () => {
  printResult('TrackFlow Reports', {
    productsByCategory: countProductsByCategory(products),
    totalInventoryValueUSD: calculateTotalInventoryValue(products),
    averageShipmentDistanceKm: calculateAverageShipmentDistance(shipments),
    shipmentsByStatus: groupShipmentsByStatus(shipments),
    topCarriers: findTopCarriers(shipments, 3)
  });
});

document.getElementById('runValidations').addEventListener('click', () => {
  printResult('Entity Validations', {
    productValidation: validateProduct(products[0]),
    shipmentValidation: validateShipment(shipments[0]),
    carrierValidation: validateCarrier(carriers[0])
  });
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

populateSelectOptions();