import { Product, InventoryItem } from './types/models';
import { filterProductsByPriceRange, sortProductsByPrice } from './utils/collections';
import { linearSearchByField, binarySearchByNumericField } from './utils/search';
import { averageBy, calculateInventoryStats, formatCurrency } from './utils/transformations';

const products: Product[] = [
  { id: 'prod-001', brandId: 'brand-001', sku: 'LAP-001', name: 'Laptop ProMax', weightKg: 1.8, unitPrice: 999.99, currency: 'EUR' },
  { id: 'prod-002', brandId: 'brand-001', sku: 'MOUSE-001', name: 'Wireless Mouse', weightKg: 0.1, unitPrice: 25.5, currency: 'EUR' },
  { id: 'prod-003', brandId: 'brand-001', sku: 'KB-001', name: 'Mechanical Keyboard', weightKg: 0.5, unitPrice: 79.99, currency: 'EUR' },
  { id: 'prod-004', brandId: 'brand-001', sku: 'SCREEN-001', name: '4K Monitor', weightKg: 4.2, unitPrice: 350, currency: 'EUR' }
];

const inventory: InventoryItem[] = [
  { id: 'inv-001', productId: 'prod-001', warehouseId: 'warehouse-es-01', quantityOnHand: 10, quantityReserved: 2, lastSyncedAt: '2026-11-17T00:00:00Z' },
  { id: 'inv-002', productId: 'prod-002', warehouseId: 'warehouse-es-01', quantityOnHand: 100, quantityReserved: 15, lastSyncedAt: '2026-11-17T00:00:00Z' },
  { id: 'inv-003', productId: 'prod-003', warehouseId: 'warehouse-es-01', quantityOnHand: 5, quantityReserved: 2, lastSyncedAt: '2026-11-17T00:00:00Z' },
  { id: 'inv-004', productId: 'prod-004', warehouseId: 'warehouse-es-01', quantityOnHand: 20, quantityReserved: 5, lastSyncedAt: '2026-11-17T00:00:00Z' }
];

const app = document.getElementById('app');
if (!app) {
  throw new Error('Falta el elemento #app en index.html');
}

app.innerHTML = `
  <main class="mx-auto max-w-3xl space-y-6 p-6">
    <h1 class="text-2xl font-bold">TrackFlow · Pruebas de utilidades</h1>

    <section class="space-y-3 rounded border bg-white p-4">
      <h2 class="font-semibold">Filtrar y ordenar productos</h2>
      <div class="flex flex-wrap items-center gap-2">
        <input id="min-price" type="number" value="50" class="w-24 rounded border px-2 py-1" />
        <input id="max-price" type="number" value="400" class="w-24 rounded border px-2 py-1" />
        <button id="filter-btn" class="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700">Filtrar por precio</button>
        <button id="sort-btn" class="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700">Ordenar por precio (desc)</button>
      </div>
    </section>

    <section class="space-y-3 rounded border bg-white p-4">
      <h2 class="font-semibold">Búsqueda lineal por SKU</h2>
      <div class="flex flex-wrap gap-2">
        <input id="sku-input" type="text" value="KB-001" class="rounded border px-2 py-1" />
        <button id="linear-btn" class="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700">Buscar</button>
      </div>
    </section>

    <section class="space-y-3 rounded border bg-white p-4">
      <h2 class="font-semibold">Búsqueda binaria por precio</h2>
      <div class="flex flex-wrap gap-2">
        <input id="price-input" type="number" step="0.01" value="79.99" class="w-32 rounded border px-2 py-1" />
        <button id="binary-btn" class="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700">Buscar</button>
      </div>
    </section>

    <section class="space-y-3 rounded border bg-white p-4">
      <h2 class="font-semibold">Reportes</h2>
      <button id="report-btn" class="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700">Generar reporte de inventario</button>
    </section>

    <section id="result" class="min-h-24 space-y-1 rounded border bg-white p-4"></section>
  </main>
`;

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Falta el elemento #${id}`);
  }
  return element as T;
}

function showResult(title: string, lines: string[]): void {
  const result = byId<HTMLElement>('result');
  const heading = document.createElement('h3');
  heading.className = 'font-semibold';
  heading.textContent = title;

  const items = lines.map((line) => {
    const paragraph = document.createElement('p');
    paragraph.textContent = line;
    return paragraph;
  });

  result.replaceChildren(heading, ...items);
}

function formatProduct(product: Product): string {
  return `${product.name} (${product.sku}): ${formatCurrency(product.unitPrice, 'EUR')}`;
}

function handleFilter(): void {
  const minPrice = byId<HTMLInputElement>('min-price').valueAsNumber;
  const maxPrice = byId<HTMLInputElement>('max-price').valueAsNumber;
  if (Number.isNaN(minPrice) || Number.isNaN(maxPrice)) {
    showResult('Filtro por precio', ['Introduce un mínimo y un máximo válidos.']);
    return;
  }

  const filtered = filterProductsByPriceRange(products, minPrice, maxPrice);
  const lines = filtered.length > 0 ? filtered.map(formatProduct) : ['Sin resultados en ese rango.'];
  showResult(`Productos entre ${minPrice} y ${maxPrice} €`, lines);
}

function handleSort(): void {
  const sorted = sortProductsByPrice(products, false);
  showResult('Productos ordenados por precio (desc)', sorted.map(formatProduct));
}

function handleLinearSearch(): void {
  const sku = byId<HTMLInputElement>('sku-input').value.trim();
  const index = linearSearchByField(products, 'sku', sku);
  const lines = index === -1 ? [`No se encontró el SKU "${sku}".`] : [formatProduct(products[index])];
  showResult('Búsqueda lineal por SKU', lines);
}

function handleBinarySearch(): void {
  const price = byId<HTMLInputElement>('price-input').valueAsNumber;
  if (Number.isNaN(price)) {
    showResult('Búsqueda binaria por precio', ['Introduce un precio válido.']);
    return;
  }

  // La búsqueda binaria exige un array ordenado por el campo buscado.
  const sortedByPrice = sortProductsByPrice(products, true);
  const index = binarySearchByNumericField(sortedByPrice, 'unitPrice', price);
  const lines = index === -1 ? [`No hay ningún producto con precio ${price} €.`] : [formatProduct(sortedByPrice[index])];
  showResult('Búsqueda binaria por precio', lines);
}

function handleReport(): void {
  const stats = calculateInventoryStats(inventory, { criticalThreshold: 10 });
  const averageWeight = averageBy(products, (product) => product.weightKg);
  showResult('Reporte de inventario', [
    `Unidades totales: ${stats.total}`,
    `Media por producto: ${stats.average.toFixed(2)}`,
    `Mínimo: ${stats.min}`,
    `Máximo: ${stats.max}`,
    `Peso medio de los productos: ${averageWeight.toFixed(2)} kg`
  ]);
}

byId<HTMLButtonElement>('filter-btn').addEventListener('click', handleFilter);
byId<HTMLButtonElement>('sort-btn').addEventListener('click', handleSort);
byId<HTMLButtonElement>('linear-btn').addEventListener('click', handleLinearSearch);
byId<HTMLButtonElement>('binary-btn').addEventListener('click', handleBinarySearch);
byId<HTMLButtonElement>('report-btn').addEventListener('click', handleReport);
