import { Carrier, Product, Shipment } from "./contracts";
import {
  calculateShippingCost,
  scoreCarrierForShipment,
  selectBestCarrier,
} from "./transformations";
import { validateCarrier, validateProduct, validateShipment } from "./validations";

export interface SmokeCheck {
  id: string;
  title: string;
  passed: boolean;
  detail: string;
}

export interface SmokeReport {
  generatedAt: string;
  shippingCostUSD: number;
  carrierScore: number;
  bestCarrierName: string;
  checks: SmokeCheck[];
}

const testProduct: Product = {
  id: "PRD-LAPTOP-001",
  sku: "LAPTOP-DELL-15",
  name: "Laptop Dell 15 pulgadas",
  category: "Electronics",
  weightKg: 2.3,
  dimensions: { lengthCm: 40, widthCm: 28, heightCm: 3 },
  warehouse: "Zaragoza",
  stockQuantity: 8,
  minStockThreshold: 10,
  unitCostUSD: 650,
  isFragile: true,
  status: "Low stock",
};

const testCarrier: Carrier = {
  id: "CAR-SEUR",
  name: "SEUR",
  operatesIn: ["Spain"],
  baseRateUSD: 6.5,
  ratePerKgUSD: 1.5,
  ratePerKmUSD: 0.08,
  avgDeliveryDays: 2,
  onTimeRate: 92,
  maxWeightKg: 25,
  handlesFragile: true,
  acceptsPriority: ["Standard", "Express", "Same-day"],
};

const testShipment: Shipment = {
  id: "SH-2024-8821",
  sku: "LAPTOP-DELL-15",
  quantity: 1,
  origin: "Zaragoza",
  destination: {
    city: "Madrid",
    country: "Spain",
    postalCode: "28001",
    distanceKm: 320,
  },
  priority: "Express",
  declaredValueUSD: 650,
  carrier: null,
  status: "Pending",
  createdAt: new Date("2024-03-15"),
};

export function buildTrackflowSmokeReport(): SmokeReport {
  const productValidation = validateProduct(testProduct);
  const shipmentValidation = validateShipment(testShipment);
  const carrierValidation = validateCarrier(testCarrier);
  const shippingCost = calculateShippingCost(testShipment, testProduct, testCarrier);
  const carrierScore = scoreCarrierForShipment(testCarrier, testShipment, testProduct);
  const bestCarrier = selectBestCarrier([testCarrier], testShipment, testProduct);

  const checks: SmokeCheck[] = [
    {
      id: "check-1",
      title: "Validacion de producto",
      passed: productValidation.valid,
      detail: productValidation.valid
        ? "Producto valido segun reglas de negocio"
        : productValidation.errors.join(", "),
    },
    {
      id: "check-2",
      title: "Validacion de envio",
      passed: shipmentValidation.valid,
      detail: shipmentValidation.valid
        ? "Envio valido segun reglas de negocio"
        : shipmentValidation.errors.join(", "),
    },
    {
      id: "check-3",
      title: "Validacion de transportista",
      passed: carrierValidation.valid,
      detail: carrierValidation.valid
        ? "Transportista valido segun reglas de negocio"
        : carrierValidation.errors.join(", "),
    },
    {
      id: "check-4",
      title: "Calculo de costo",
      passed: shippingCost > 0,
      detail: `Costo estimado: $${shippingCost}`,
    },
    {
      id: "check-5",
      title: "Scoring de transportista",
      passed: carrierScore >= 50,
      detail: `Puntuacion obtenida: ${carrierScore}/100`,
    },
    {
      id: "check-6",
      title: "Seleccion automatica",
      passed: bestCarrier !== null,
      detail: bestCarrier
        ? `Carrier seleccionado: ${bestCarrier.carrier.name} (score ${bestCarrier.score})`
        : "No hay carrier adecuado",
    },
  ];

  return {
    generatedAt: new Date().toISOString(),
    shippingCostUSD: shippingCost,
    carrierScore,
    bestCarrierName: bestCarrier?.carrier.name ?? "Sin seleccion",
    checks,
  };
}

export function printTrackflowSmokeReport(report: SmokeReport): void {
  console.log("=== PRUEBAS DE FUEGO: TRACKFLOW HITO 2 ===\n");

  report.checks.forEach((check, index) => {
    const icon = check.passed ? "✓" : "x";
    console.log(`${icon} Test ${index + 1}: ${check.title}`);
    console.log(`  ${check.detail}`);
    console.log("");
  });

  console.log("Resumen:");
  console.log(`  Costo de envio: $${report.shippingCostUSD}`);
  console.log(`  Score carrier: ${report.carrierScore}/100`);
  console.log(`  Mejor carrier: ${report.bestCarrierName}`);
}
