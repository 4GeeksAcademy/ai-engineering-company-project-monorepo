import { readFileSync } from "node:fs";
import { join } from "node:path";

export type Milestone2Order = {
  orderId: string;
  client: string;
  destination: string;
  urgency: string;
  totalWeight: string;
  assignedWarehouse: string;
  warehouseReason: string;
  selectedCarrier: string;
  carrierReason: string;
  trackingId: string;
  expectedDeliveryWindow: string;
  cxNote: string;
};

const FALLBACK_ORDER: Milestone2Order = {
  orderId: "Unavailable",
  client: "Unavailable",
  destination: "Unavailable",
  urgency: "Unavailable",
  totalWeight: "Unavailable",
  assignedWarehouse: "Unavailable",
  warehouseReason: "Generated Milestone 2 output was not found.",
  selectedCarrier: "Unavailable",
  carrierReason: "Generated Milestone 2 output was not found.",
  trackingId: "Unavailable",
  expectedDeliveryWindow: "Unavailable",
  cxNote: "Run npm run milestone2:sync in uis/backoffice to regenerate .trackflow-milestone2-output.json from src/testing-interface.js data.",
};

export function readMilestone2Order(): Milestone2Order {
  try {
    const jsonPath = join(process.cwd(), "..", "..", ".trackflow-milestone2-output.json");
    const jsonPayload = JSON.parse(readFileSync(jsonPath, "utf8")) as Milestone2Order;

    return jsonPayload;
  } catch {
    return FALLBACK_ORDER;
  }
}
