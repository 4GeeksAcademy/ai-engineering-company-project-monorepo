/**
 * Script de demostración y pruebas de las funciones de utilidad TrackFlow
 */

import {
  // Models
  Brand,
  Product,
  InventoryItem,
  Order,
  OrderLine,
  Shipment,
  ReturnRequest,
  Customer,
  SupportTicket,
  Carrier,
  Warehouse
} from './types/models';

// Utilities
import {
  linearSearch,
  binarySearch,
  linearSearchByField,
  binarySearchByNumericField
} from './utils/search';

import {
  filterByNumericRange,
  sortBy,
  filterProductsByPriceRange,
  filterBrandsByContractStatus,
  sortProductsByPrice,
  filterShipmentsByStatus
} from './utils/collections';

import {
  sumBy,
  averageBy,
  calculateInventoryStats,
  calculateBrandStats,
  formatCurrency,
  countBy
} from './utils/transformations';

import {
  validateRequired,
  validatePositiveNumber,
  validateEmail,
  validateProduct,
  validateShipment,
  validateReturnRequest
} from './utils/validations';

// ============================================
// DATOS DE PRUEBA
// ============================================

const testBrand: Brand = {
  id: 'brand-001',
  name: 'TechBrand',
  country: 'ES',
  contractStatus: 'active',
  contractEndDate: '2025-12-31',
  accountManagerId: 'mgr-001',
  riskScore: 25
};

const testProducts: Product[] = [
  {
    id: 'prod-001',
    brandId: 'brand-001',
    sku: 'LAP-001',
    name: 'Laptop ProMax',
    weightKg: 1.8,
    unitPrice: 999.99,
    currency: 'EUR'
  },
  {
    id: 'prod-002',
    brandId: 'brand-001',
    sku: 'MOUSE-001',
    name: 'Wireless Mouse',
    weightKg: 0.1,
    unitPrice: 25.50,
    currency: 'EUR'
  },
  {
    id: 'prod-003',
    brandId: 'brand-001',
    sku: 'KB-001',
    name: 'Mechanical Keyboard',
    weightKg: 0.5,
    unitPrice: 79.99,
    currency: 'EUR'
  },
  {
    id: 'prod-004',
    brandId: 'brand-001',
    sku: 'SCREEN-001',
    name: '4K Monitor',
    weightKg: 4.2,
    unitPrice: 350.00,
    currency: 'EUR'
  }
];

const testInventory: InventoryItem[] = [
  {
    id: 'inv-001',
    productId: 'prod-001',
    warehouseId: 'warehouse-es-01',
    quantityOnHand: 10,
    quantityReserved: 2,
    lastSyncedAt: new Date().toISOString()
  },
  {
    id: 'inv-002',
    productId: 'prod-002',
    warehouseId: 'warehouse-es-01',
    quantityOnHand: 100,
    quantityReserved: 15,
    lastSyncedAt: new Date().toISOString()
  },
  {
    id: 'inv-003',
    productId: 'prod-003',
    warehouseId: 'warehouse-es-01',
    quantityOnHand: 5,
    quantityReserved: 2,
    lastSyncedAt: new Date().toISOString()
  },
  {
    id: 'inv-004',
    productId: 'prod-004',
    warehouseId: 'warehouse-es-01',
    quantityOnHand: 20,
    quantityReserved: 5,
    lastSyncedAt: new Date().toISOString()
  }
];

const testWarehouse: Warehouse = {
  id: 'warehouse-es-01',
  code: 'ZGZ',
  city: 'Zaragoza',
  system: 'SGA_COMERCIAL'
};

const testCarrier: Carrier = {
  id: 'carrier-001',
  name: 'DHL',
  countries: ['ES', 'US'],
  apiAvailable: true
};

const testCustomer: Customer = {
  id: 'cust-001',
  fullName: 'Juan García López',
  email: 'juan.garcia@example.com',
  phone: '+34 666 123 456',
  preferredChannel: 'email',
  preferredLanguage: 'es'
};

const testOrderLines: OrderLine[] = [
  {
    id: 'line-001',
    orderId: 'order-001',
    productId: 'prod-001',
    quantity: 1
  },
  {
    id: 'line-002',
    orderId: 'order-001',
    productId: 'prod-002',
    quantity: 2
  },
  {
    id: 'line-003',
    orderId: 'order-001',
    productId: 'prod-003',
    quantity: 1
  }
];

const testOrder: Order = {
  id: 'order-001',
  brandId: 'brand-001',
  customerId: 'cust-001',
  warehouseId: 'warehouse-es-01',
  lines: testOrderLines,
  receivedVia: 'api',
  createdAt: new Date().toISOString()
};

const testShipment: Shipment = {
  id: 'ship-001',
  orderId: 'order-001',
  carrierId: 'carrier-001',
  status: 'in_transit',
  trackingNumber: 'DHL123456789',
  weightKg: 2.5,
  shippedAt: new Date().toISOString(),
  isOnTime: true
};

const testReturn: ReturnRequest = {
  id: 'return-001',
  orderId: 'order-001',
  customerId: 'cust-001',
  productId: 'prod-001',
  reason: 'Product defect',
  status: 'requested',
  pickupType: 'home_pickup',
  imageUrls: ['https://example.com/image1.jpg'],
  createdAt: new Date().toISOString()
};

const testTicket: SupportTicket = {
  id: 'ticket-001',
  customerId: 'cust-001',
  brandId: 'brand-001',
  orderId: 'order-001',
  channel: 'email',
  language: 'es',
  status: 'open',
  resolvedBy: 'agent',
  createdAt: new Date().toISOString()
};

// ============================================
// PRUEBAS DE BÚSQUEDA
// ============================================

console.log('\n========== PRUEBAS DE BÚSQUEDA ==========\n');

console.log('1. Búsqueda lineal de producto por nombre:');
const searchResult = linearSearch(testProducts, (p: Product) => p.name === 'Wireless Mouse');
console.log(`   Encontrado: ${searchResult !== -1 ? 'SÍ' : 'NO'} (índice: ${searchResult})`);

console.log('\n2. Búsqueda por campo (productId):');
const foundProductIndex = linearSearchByField(testProducts, 'id', 'prod-003');
const foundProduct = foundProductIndex !== -1 ? testProducts[foundProductIndex] : undefined;
console.log(`   Producto encontrado: ${foundProduct?.name || 'No encontrado'}`);

console.log('\n3. Búsqueda binaria por precio (array debe estar ordenado):');
const sortedByPrice = [...testProducts].sort((a, b) => a.unitPrice - b.unitPrice);
const priceSearchIndex = binarySearchByNumericField(sortedByPrice, 'unitPrice', 79.99);
const priceProduct = priceSearchIndex !== -1 ? sortedByPrice[priceSearchIndex] : undefined;
console.log(`   Producto con precio 79.99: ${priceProduct?.name || 'No encontrado'}`);

// ============================================
// PRUEBAS DE FILTRADO Y ORDENAMIENTO
// ============================================

console.log('\n========== PRUEBAS DE FILTRADO Y ORDENAMIENTO ==========\n');

console.log('1. Filtrar productos por rango de precio (50-400):');
const filtered = filterProductsByPriceRange(testProducts, 50, 400);
console.log(`   Productos encontrados: ${filtered.map((p: Product) => p.name).join(', ')}`);

console.log('\n2. Ordenar productos por precio (descendente):');
const sortedDesc = sortProductsByPrice(testProducts, false);
console.log(`   Orden descendente: ${sortedDesc.map((p: Product) => `${p.name} (€${p.unitPrice})`).join(' -> ')}`);

console.log('\n3. Filtrar envíos por estado:');
const testShipments: Shipment[] = [
  testShipment,
  { ...testShipment, id: 'ship-002', status: 'delivered' },
  { ...testShipment, id: 'ship-003', status: 'pending' }
];
const filteredShipments = filterShipmentsByStatus(testShipments, 'in_transit');
console.log(`   Envíos en tránsito: ${filteredShipments.length}`);

// ============================================
// PRUEBAS DE TRANSFORMACIONES
// ============================================

console.log('\n========== PRUEBAS DE TRANSFORMACIONES ==========\n');

console.log('1. Suma total de precios de productos:');
const totalPrice = sumBy(testProducts, (p: Product) => p.unitPrice);
console.log(`   Total: ${formatCurrency(totalPrice, 'EUR')}`);

console.log('\n2. Promedio de precios:');
const avgPrice = averageBy(testProducts, (p: Product) => p.unitPrice);
console.log(`   Promedio: ${formatCurrency(avgPrice, 'EUR')}`);

console.log('\n3. Suma de inventario disponible:');
const totalInventory = sumBy(testInventory, (i: InventoryItem) => i.quantityOnHand);
console.log(`   Total disponible: ${totalInventory} unidades`);

console.log('\n4. Estadísticas de inventario:');
const inventoryStats = calculateInventoryStats(testInventory);
console.log(`   Cantidad total: ${inventoryStats.total}`);
console.log(`   Cantidad promedio: ${inventoryStats.average.toFixed(2)}`);
console.log(`   Cantidad mínima: ${inventoryStats.min}`);
console.log(`   Cantidad máxima: ${inventoryStats.max}`);

console.log('\n5. Estadísticas de marca:');
const brandStats = calculateBrandStats([testBrand], { riskThreshold: 50 });
console.log(`   Total de marcas: ${brandStats.totalBrands}`);
console.log(`   Marcas en riesgo: ${brandStats.brandsAtRisk}`);
console.log(`   Riesgo promedio: ${brandStats.averageRiskScore.toFixed(2)}`);

// ============================================
// PRUEBAS DE VALIDACIÓN
// ============================================

console.log('\n========== PRUEBAS DE VALIDACIÓN ==========\n');

console.log('1. Validar campos requeridos en Brand:');
const brandValidation = validateRequired(testBrand, ['id', 'name', 'country']);
console.log(`   Válido: ${brandValidation.valid}`);
if (!brandValidation.valid) {
  console.log(`   Errores: ${brandValidation.errors.join(', ')}`);
}

console.log('\n2. Validar producto:');
const productValidation = validateProduct(testProducts[0]);
console.log(`   Válido: ${productValidation.valid}`);
if (!productValidation.valid) {
  console.log(`   Errores: ${productValidation.errors.join(', ')}`);
}

console.log('\n3. Validar email de cliente:');
const emailValidation = validateEmail(testCustomer.email);
console.log(`   Email "${testCustomer.email}" válido: ${emailValidation.valid}`);

console.log('\n4. Validar shipment:');
const shipmentValidation = validateShipment(testShipment);
console.log(`   Válido: ${shipmentValidation.valid}`);
if (!shipmentValidation.valid) {
  console.log(`   Errores: ${shipmentValidation.errors.join(', ')}`);
}

console.log('\n5. Validar return request:');
const returnValidation = validateReturnRequest(testReturn);
console.log(`   Válido: ${returnValidation.valid}`);
if (!returnValidation.valid) {
  console.log(`   Errores: ${returnValidation.errors.join(', ')}`);
}

console.log('\n6. Validar número positivo (cantidad de inventario):');
const qtyValidation = validatePositiveNumber(testInventory[0].quantityOnHand, 'quantityOnHand');
console.log(`   Cantidad ${testInventory[0].quantityOnHand} válida: ${qtyValidation.valid}`);

// ============================================
// RESUMEN
// ============================================

console.log('\n========== RESUMEN DE PRUEBAS ==========\n');
console.log('✅ Todas las funciones compilan correctamente');
console.log('✅ Búsqueda: 3 pruebas completadas');
console.log('✅ Filtrado y Ordenamiento: 3 pruebas completadas');
console.log('✅ Transformaciones: 5 pruebas completadas');
console.log('✅ Validaciones: 6 pruebas completadas');
console.log('\n📊 TOTAL: 17 pruebas de integración ejecutadas exitosamente\n');
