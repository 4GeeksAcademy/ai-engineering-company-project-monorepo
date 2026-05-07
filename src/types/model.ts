export interface MenuItem {
  id: string; // ID del ítem (ej: "ITEM-PICANHA-250")
  name: string; // Nombre del ítem (ej: "Picanha 250g")
  category: MenuCategory; // Categoría de comida
  basePrice: Price; // Precio base (puede variar por locación)
  ingredientCost: Price; // Costo de ingredientes por unidad
  prepTimeMinutes: number; // Tiempo promedio de preparación
  isAvailableInColombia: boolean;
  isAvailableInUSA: boolean;
  allergens: string[]; // Lista de alérgenos
  status: MenuItemStatus;
}

export interface Price {
  USD: number; // Precio en Dólares Estadounidenses
  COP: number; // Precio en Pesos Colombianos
}

export type MenuCategory = "Meat" | "Side" | "Beverage" | "Dessert" | "Combo";
export type MenuItemStatus = "Active" | "Seasonal" | "Discontinued";

export interface SaleTransaction {
  id: string; // ID de transacción (ej: "TXN-2024-15482")
  locationId: string; // Locación donde ocurrió la venta
  itemId: string; // Ítem de menú vendido
  quantity: number; // Número de unidades vendidas
  totalPrice: Price; // Precio total cobrado
  paymentMethod: PaymentMethod; // Cómo pagó el cliente
  timestamp: Date; // Cuándo ocurrió la venta
  waiterName: string; // Miembro del personal que atendió
}

export type PaymentMethod = "Cash" | "Credit card" | "Debit card" | "Digital wallet";

export interface Location {
  id: string; // ID de locación (ej: "LOC-MEDELLIN-01")
  name: string; // Nombre de la locación
  city: string; // Nombre de la ciudad
  country: Country; // Colombia o USA
  openingYear: number; // Año de apertura
  seatingCapacity: number; // Número máximo de clientes
  staffCount: number; // Número de empleados
  monthlyRentCost: Price; // Renta mensual
  averageMonthlyUtilities: Price; // Servicios mensuales promedio
  manager: string; // Nombre del gerente de locación
  status: LocationStatus;
}

export type Country = "Colombia" | "USA";
export type LocationStatus = "Active" | "Temporarily closed" | "Under renovation";

export interface WasteRecord {
  id: string; // ID de registro de desperdicio
  locationId: string; // Locación donde ocurrió el desperdicio
  itemId: string; // Ítem de menú desperdiciado
  quantity: number; // Número de unidades desperdiciadas
  reason: WasteReason; // Por qué se desperdició
  cost: Price; // Costo de ítems desperdiciados
  timestamp: Date; // Cuándo se registró
  reportedBy: string; // Miembro del personal que lo reportó
}

export type WasteReason =
  | "Expired"
  | "Cooking error"
  | "Customer return"
  | "Damage"
  | "Other";

export interface CountryMetrics {
  totalLocations: number;
  totalRevenue: Price;
  averageRevenuePerLocation: Price;
  totalSales: number;
}