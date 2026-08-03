import {
  DeliveryOrder,
  binarySearchByNumber,
  filterDeliveryOrders,
  generateDeliveryOperationsReport,
  linearSearch,
  sampleClientApplication,
  sampleDeliveryOrder,
  sortByField,
  validateClientApplication
} from './index';

const demoOrders: DeliveryOrder[] = [
  sampleDeliveryOrder,
  {
    ...sampleDeliveryOrder,
    id: 'ord-002',
    destinationCity: 'Barcelona',
    status: 'delivered',
    deliveryDate: '2026-08-03T19:10:00.000Z',
    packageCount: 24,
    distanceKm: 620,
    shippingCostUsd: 1180.25
  },
  {
    ...sampleDeliveryOrder,
    id: 'ord-003',
    destinationCity: 'Seville',
    status: 'pending',
    packageCount: 10,
    distanceKm: 530,
    shippingCostUsd: 740.0
  }
];

const expensiveOrders = filterDeliveryOrders(demoOrders, {
  minShippingCostUsd: 900,
  status: 'delivered'
});

const ordersSortedByCost = sortByField(demoOrders, 'shippingCostUsd', 'asc');

const linearSearchIndex = linearSearch(demoOrders, (order: DeliveryOrder) => order.id === 'ord-003');

const binarySearchIndex = binarySearchByNumber(
  ordersSortedByCost,
  915.4,
  (order: DeliveryOrder) => order.shippingCostUsd
);

const deliveryReport = generateDeliveryOperationsReport(demoOrders);
const applicationValidation = validateClientApplication(sampleClientApplication);

console.log('Expensive delivered orders:', expensiveOrders.length);
console.log('Linear search index for ord-003:', linearSearchIndex);
console.log('Binary search index for shipping cost 915.4:', binarySearchIndex);
console.log('Delivery report total shipping cost:', deliveryReport.totalShippingCostUsd);
console.log('Application validation result:', applicationValidation.isValid);