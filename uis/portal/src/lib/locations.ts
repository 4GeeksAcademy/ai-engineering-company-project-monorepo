import type { Currency } from "./money";

export type LocationRef = {
  id: string;
  name: string;
  city: string;
  country: "Colombia" | "United States";
  region: "Colombia" | "Florida";
  currency: Currency;
};

/** Same 14-location roster as services/api/locations.py (CONTEXT.md). */
export const LOCATIONS: readonly LocationRef[] = [
  { id: "co-med-centro", name: "Medellín Centro", city: "Medellín", country: "Colombia", region: "Colombia", currency: "COP" },
  { id: "co-med-elpoblado", name: "Medellín El Poblado", city: "Medellín", country: "Colombia", region: "Colombia", currency: "COP" },
  { id: "co-bog-chapinero", name: "Bogotá Chapinero", city: "Bogotá", country: "Colombia", region: "Colombia", currency: "COP" },
  { id: "co-bog-norte", name: "Bogotá Norte", city: "Bogotá", country: "Colombia", region: "Colombia", currency: "COP" },
  { id: "co-cali-norte", name: "Cali Norte", city: "Cali", country: "Colombia", region: "Colombia", currency: "COP" },
  { id: "co-barranquilla", name: "Barranquilla", city: "Barranquilla", country: "Colombia", region: "Colombia", currency: "COP" },
  { id: "co-cartagena", name: "Cartagena", city: "Cartagena", country: "Colombia", region: "Colombia", currency: "COP" },
  { id: "co-pereira", name: "Pereira", city: "Pereira", country: "Colombia", region: "Colombia", currency: "COP" },
  { id: "us-mia-brickell", name: "Miami Brickell", city: "Miami", country: "United States", region: "Florida", currency: "USD" },
  { id: "us-mia-downtown", name: "Miami Downtown", city: "Miami", country: "United States", region: "Florida", currency: "USD" },
  { id: "us-orlando", name: "Orlando", city: "Orlando", country: "United States", region: "Florida", currency: "USD" },
  { id: "us-tampa", name: "Tampa", city: "Tampa", country: "United States", region: "Florida", currency: "USD" },
  { id: "us-ftlauderdale", name: "Fort Lauderdale", city: "Fort Lauderdale", country: "United States", region: "Florida", currency: "USD" },
  { id: "us-jacksonville", name: "Jacksonville", city: "Jacksonville", country: "United States", region: "Florida", currency: "USD" },
];

const BY_ID = new Map(LOCATIONS.map((location) => [location.id, location]));

export function locationName(locationId: string): string {
  return BY_ID.get(locationId)?.name ?? locationId;
}
