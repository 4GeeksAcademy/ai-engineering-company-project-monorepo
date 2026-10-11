import type { Location, MenuCategory, MenuItem, SaleTransaction, WasteRecord } from "./types/models";
import {
  filterActiveLocations,
  filterMenuItemsByCategory,
  filterSalesByDateRange,
  filterSalesByLocation,
  sortLocationsByCapacity,
  sortMenuItemsByPrice,
} from "./utils/collections";
import {
  binarySearchLocationByCapacity,
  findLocationById,
  findMenuItemByName,
} from "./utils/search";
import {
  calculateDailyRevenue,
  calculateLocationMargin,
  calculateWasteCost,
  convertCurrency,
  rankLocationsByPerformance,
} from "./utils/transformations";
import {
  validateLocation,
  validateMenuItem,
  validateSaleTransaction,
} from "./utils/validations";
import {
  sampleLocations,
  sampleMenuItems,
  sampleSales,
  sampleWasteRecords,
} from "./data/sample-data";

const categories: MenuCategory[] = ["Meat", "Side", "Beverage", "Dessert", "Combo"];
const currencies: Array<"USD" | "COP"> = ["USD", "COP"];

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`No se encontro el elemento con id ${id}`);
  }
  return element as T;
}

function formatMoney(value: number, currency: "USD" | "COP"): string {
  return `${currency} ${value.toLocaleString("es-CO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function createTable(headers: string[], rows: string[][]): string {
  const head = `<tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr>`;
  const body = rows
    .map((row) => `<tr>${row.map((column) => `<td>${column}</td>`).join("")}</tr>`)
    .join("");

  return `<table><thead>${head}</thead><tbody>${body}</tbody></table>`;
}

function renderMenuItems(containerId: string, items: MenuItem[]): void {
  const html = createTable(
    ["ID", "Nombre", "Categoria", "Precio USD", "Precio COP", "Estado"],
    items.map((item) => [
      item.id,
      item.name,
      item.category,
      formatMoney(item.basePrice.USD, "USD"),
      formatMoney(item.basePrice.COP, "COP"),
      item.status,
    ]),
  );
  byId<HTMLDivElement>(containerId).innerHTML = html;
}

function renderLocations(containerId: string, locations: Location[]): void {
  const html = createTable(
    ["ID", "Nombre", "Pais", "Capacidad", "Estado", "Manager"],
    locations.map((location) => [
      location.id,
      location.name,
      location.country,
      String(location.seatingCapacity),
      location.status,
      location.manager,
    ]),
  );
  byId<HTMLDivElement>(containerId).innerHTML = html;
}

function renderSales(containerId: string, sales: SaleTransaction[]): void {
  const html = createTable(
    ["ID", "Locacion", "Item", "Cantidad", "Total USD", "Fecha"],
    sales.map((sale) => [
      sale.id,
      sale.locationId,
      sale.itemId,
      String(sale.quantity),
      formatMoney(sale.totalPrice.USD, "USD"),
      formatDate(sale.timestamp),
    ]),
  );
  byId<HTMLDivElement>(containerId).innerHTML = html;
}

function renderWaste(containerId: string, wasteRecords: WasteRecord[]): void {
  const html = createTable(
    ["ID", "Locacion", "Item", "Motivo", "Costo USD", "Fecha"],
    wasteRecords.map((record) => [
      record.id,
      record.locationId,
      record.itemId,
      record.reason,
      formatMoney(record.cost.USD, "USD"),
      formatDate(record.timestamp),
    ]),
  );
  byId<HTMLDivElement>(containerId).innerHTML = html;
}

function renderMessage(containerId: string, message: string): void {
  byId<HTMLDivElement>(containerId).innerHTML = `<pre>${message}</pre>`;
}

function setupSelectors(): void {
  const locationOptions = sampleLocations
    .map((location) => `<option value="${location.id}">${location.name}</option>`)
    .join("");

  ["salesLocation", "marginLocation", "wasteLocation", "scoreLocation", "validateLocationId"]
    .forEach((id) => {
      byId<HTMLSelectElement>(id).innerHTML = locationOptions;
    });

  const menuOptions = sampleMenuItems
    .map((item) => `<option value="${item.id}">${item.name}</option>`)
    .join("");

  byId<HTMLSelectElement>("validateMenuItemId").innerHTML = menuOptions;

  const salesOptions = sampleSales
    .map((sale) => `<option value="${sale.id}">${sale.id} - ${sale.locationId}</option>`)
    .join("");

  byId<HTMLSelectElement>("validateSaleId").innerHTML = salesOptions;

  byId<HTMLSelectElement>("menuCategory").innerHTML = categories
    .map((category) => `<option value="${category}">${category}</option>`)
    .join("");

  ["menuSortCurrency", "dailyRevenueCurrency", "marginCurrency", "wasteCurrency", "convertFrom", "convertTo"]
    .forEach((id) => {
      byId<HTMLSelectElement>(id).innerHTML = currencies
        .map((currency) => `<option value="${currency}">${currency}</option>`)
        .join("");
    });

  const defaultDate = formatDate(sampleSales[0].timestamp);
  byId<HTMLInputElement>("startDate").value = defaultDate;
  byId<HTMLInputElement>("endDate").value = formatDate(sampleSales[sampleSales.length - 1].timestamp);
  byId<HTMLInputElement>("dailyRevenueDate").value = defaultDate;

  byId<HTMLInputElement>("searchLocationId").value = sampleLocations[0].id;
  byId<HTMLInputElement>("searchMenuName").value = sampleMenuItems[0].name;
  byId<HTMLInputElement>("searchCapacity").value = String(sampleLocations[0].seatingCapacity);
}

function bindCollections(): void {
  byId<HTMLButtonElement>("runSalesByLocation").addEventListener("click", () => {
    const locationId = byId<HTMLSelectElement>("salesLocation").value;
    const filtered = filterSalesByLocation(sampleSales, locationId);
    renderSales("salesByLocationResult", filtered);
  });

  byId<HTMLButtonElement>("runSalesByDate").addEventListener("click", () => {
    const startDate = new Date(byId<HTMLInputElement>("startDate").value);
    const endDate = new Date(byId<HTMLInputElement>("endDate").value);
    const filtered = filterSalesByDateRange(sampleSales, startDate, endDate);
    renderSales("salesByDateResult", filtered);
  });

  byId<HTMLButtonElement>("runMenuByCategory").addEventListener("click", () => {
    const category = byId<HTMLSelectElement>("menuCategory").value as MenuCategory;
    const currency = byId<HTMLSelectElement>("menuSortCurrency").value as "USD" | "COP";
    const order = byId<HTMLSelectElement>("menuSortOrder").value as "asc" | "desc";

    const filtered = filterMenuItemsByCategory(sampleMenuItems, category);
    const sorted = sortMenuItemsByPrice(filtered, currency, order);
    renderMenuItems("menuByCategoryResult", sorted);
  });

  byId<HTMLButtonElement>("runLocationsSorting").addEventListener("click", () => {
    const order = byId<HTMLSelectElement>("locationSortOrder").value as "asc" | "desc";
    const onlyActive = byId<HTMLInputElement>("onlyActive").checked;

    const source = onlyActive ? filterActiveLocations(sampleLocations) : sampleLocations;
    const sorted = sortLocationsByCapacity(source, order);
    renderLocations("locationsSortedResult", sorted);
  });
}

function bindSearch(): void {
  byId<HTMLButtonElement>("runSearchLocation").addEventListener("click", () => {
    const id = byId<HTMLInputElement>("searchLocationId").value.trim();
    const result = findLocationById(sampleLocations, id);
    renderMessage(
      "searchLocationResult",
      result
        ? `${result.name} (${result.city}) - Capacidad: ${result.seatingCapacity}`
        : "No se encontro una locacion con ese ID.",
    );
  });

  byId<HTMLButtonElement>("runSearchMenu").addEventListener("click", () => {
    const name = byId<HTMLInputElement>("searchMenuName").value.trim();
    const result = findMenuItemByName(sampleMenuItems, name);
    renderMessage(
      "searchMenuResult",
      result
        ? `${result.name} - ${formatMoney(result.basePrice.USD, "USD")}`
        : "No se encontro un item con ese nombre.",
    );
  });

  byId<HTMLButtonElement>("runBinarySearch").addEventListener("click", () => {
    const capacity = Number(byId<HTMLInputElement>("searchCapacity").value);
    const sorted = sortLocationsByCapacity(sampleLocations, "asc");
    const index = binarySearchLocationByCapacity(sorted, capacity);

    renderMessage(
      "searchCapacityResult",
      index >= 0
        ? `Indice ${index}: ${sorted[index].name} (${sorted[index].seatingCapacity} asientos)`
        : "No existe locacion con esa capacidad exacta.",
    );
  });
}

function bindFinancials(): void {
  byId<HTMLButtonElement>("runDailyRevenue").addEventListener("click", () => {
    const date = new Date(byId<HTMLInputElement>("dailyRevenueDate").value);
    const currency = byId<HTMLSelectElement>("dailyRevenueCurrency").value as "USD" | "COP";
    const total = calculateDailyRevenue(sampleSales, date, currency);
    renderMessage("dailyRevenueResult", `Ingreso diario: ${formatMoney(total, currency)}`);
  });

  byId<HTMLButtonElement>("runMargin").addEventListener("click", () => {
    const locationId = byId<HTMLSelectElement>("marginLocation").value;
    const currency = byId<HTMLSelectElement>("marginCurrency").value as "USD" | "COP";
    const margin = calculateLocationMargin(sampleSales, sampleMenuItems, locationId, currency);
    renderMessage("marginResult", `Margen: ${margin.toFixed(2)}%`);
  });

  byId<HTMLButtonElement>("runWasteCost").addEventListener("click", () => {
    const locationId = byId<HTMLSelectElement>("wasteLocation").value;
    const currency = byId<HTMLSelectElement>("wasteCurrency").value as "USD" | "COP";
    const wasteCost = calculateWasteCost(sampleWasteRecords, locationId, currency);
    renderMessage("wasteResult", `Costo de desperdicio: ${formatMoney(wasteCost, currency)}`);
  });

  byId<HTMLButtonElement>("runConvert").addEventListener("click", () => {
    const amount = Number(byId<HTMLInputElement>("convertAmount").value);
    const from = byId<HTMLSelectElement>("convertFrom").value as "USD" | "COP";
    const to = byId<HTMLSelectElement>("convertTo").value as "USD" | "COP";
    const converted = convertCurrency(amount, from, to);
    renderMessage("convertResult", `${formatMoney(amount, from)} => ${formatMoney(converted, to)}`);
  });
}

function bindScoring(): void {
  byId<HTMLButtonElement>("runScore").addEventListener("click", () => {
    const locationId = byId<HTMLSelectElement>("scoreLocation").value;
    const ranking = rankLocationsByPerformance(
      sampleLocations,
      sampleSales,
      sampleWasteRecords,
      sampleMenuItems,
    );

    const selected = ranking.find((entry) => entry.location.id === locationId);
    const scoreText = selected
      ? `${selected.location.name}: ${selected.score.toFixed(2)} / 100`
      : "Locacion no encontrada.";

    const rankingText = ranking
      .map((entry, index) => `${index + 1}. ${entry.location.name} - ${entry.score.toFixed(2)}`)
      .join("\n");

    renderMessage("scoreResult", `${scoreText}\n\nRanking:\n${rankingText}`);
  });
}

function bindValidations(): void {
  byId<HTMLButtonElement>("runValidateMenu").addEventListener("click", () => {
    const itemId = byId<HTMLSelectElement>("validateMenuItemId").value;
    const item = sampleMenuItems.find((menuItem) => menuItem.id === itemId);
    if (!item) {
      renderMessage("validateMenuResult", "No se encontro el MenuItem seleccionado.");
      return;
    }

    const validation = validateMenuItem(item);
    renderMessage(
      "validateMenuResult",
      validation.valid ? "MenuItem valido." : validation.errors.join("\n"),
    );
  });

  byId<HTMLButtonElement>("runValidateSale").addEventListener("click", () => {
    const saleId = byId<HTMLSelectElement>("validateSaleId").value;
    const sale = sampleSales.find((transaction) => transaction.id === saleId);
    if (!sale) {
      renderMessage("validateSaleResult", "No se encontro la venta seleccionada.");
      return;
    }

    const validation = validateSaleTransaction(sale);
    renderMessage(
      "validateSaleResult",
      validation.valid ? "SaleTransaction valida." : validation.errors.join("\n"),
    );
  });

  byId<HTMLButtonElement>("runValidateLocation").addEventListener("click", () => {
    const locationId = byId<HTMLSelectElement>("validateLocationId").value;
    const location = sampleLocations.find((branch) => branch.id === locationId);
    if (!location) {
      renderMessage("validateLocationResult", "No se encontro la locacion seleccionada.");
      return;
    }

    const validation = validateLocation(location);
    renderMessage(
      "validateLocationResult",
      validation.valid ? "Location valida." : validation.errors.join("\n"),
    );
  });
}

function renderInitialData(): void {
  renderMenuItems("menuItemsData", sampleMenuItems);
  renderLocations("locationsData", sampleLocations);
  renderSales("salesData", sampleSales);
  renderWaste("wasteData", sampleWasteRecords);
}

function init(): void {
  setupSelectors();
  renderInitialData();
  bindCollections();
  bindSearch();
  bindFinancials();
  bindScoring();
  bindValidations();
}

init();
