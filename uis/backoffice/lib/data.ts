// Brasaland Backoffice - Mock Data
// Based on company context: 14 locations, ~115 employees, $6M annual revenue

export interface Location {
  id: string;
  name: string;
  city: string;
  country: "Colombia" | "United States";
  address: string;
  phone: string;
  manager: string;
  employees: number;
  openingYear: number;
}

export interface DailySales {
  date: string;
  locationId: string;
  revenue: number;
  orders: number;
  averageTicket: number;
}

export interface BrasaPointsMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  favoriteLocation: string;
  totalPoints: number;
  redeemedPoints: number;
  registrationDate: string;
  lastVisit: string;
}

export interface Order {
  id: string;
  locationId: string;
  customerName: string;
  items: string[];
  total: number;
  status: "pending" | "preparing" | "ready" | "delivered" | "cancelled";
  timestamp: string;
}

// All 14 Brasaland locations
export const locations: Location[] = [
  // Colombia
  { id: "col-001", name: "Brasaland El Poblado", city: "Medellín", country: "Colombia", address: "Cra 43A #1-50, El Poblado", phone: "+57 4 268 9001", manager: "Andrés Mejía", employees: 9, openingYear: 2008 },
  { id: "col-002", name: "Brasaland Laureles", city: "Medellín", country: "Colombia", address: "Cra 74 #39-22, Laureles", phone: "+57 4 268 9002", manager: "Laura Giraldo", employees: 8, openingYear: 2012 },
  { id: "col-003", name: "Brasaland Envigado", city: "Medellín", country: "Colombia", address: "Cra 43A #30-15, Envigado", phone: "+57 4 268 9003", manager: "Carlos Ríos", employees: 7, openingYear: 2015 },
  { id: "col-004", name: "Brasaland Sabaneta", city: "Medellín", country: "Colombia", address: "Cra 70 #38-20, Sabaneta", phone: "+57 4 268 9004", manager: "María Vásquez", employees: 7, openingYear: 2018 },
  { id: "col-005", name: "Brasaland Usaquén", city: "Bogotá", country: "Colombia", address: "Cra 7 #116-21, Usaquén", phone: "+57 1 638 9005", manager: "Diego Ramírez", employees: 8, openingYear: 2014 },
  { id: "col-006", name: "Brasaland Chapinero", city: "Bogotá", country: "Colombia", address: "Cra 7 #45-12, Chapinero", phone: "+57 1 638 9006", manager: "Valentina Ospina", employees: 7, openingYear: 2016 },
  { id: "col-007", name: "Brasaland Zona Rosa", city: "Bogotá", country: "Colombia", address: "Cra 11 #82-71, Zona Rosa", phone: "+57 1 638 9007", manager: "Santiago López", employees: 9, openingYear: 2013 },
  { id: "col-008", name: "Brasaland Granada", city: "Cali", country: "Colombia", address: "Cra 43A #6-20, Granada", phone: "+57 2 488 9008", manager: "Natalia Henao", employees: 7, openingYear: 2017 },
  { id: "col-009", name: "Brasaland Ciudad Jardín", city: "Cali", country: "Colombia", address: "Av 6N #34-50, Ciudad Jardín", phone: "+57 2 488 9009", manager: "Felipe Castaño", employees: 7, openingYear: 2019 },
  { id: "col-010", name: "Brasaland Unicentro", city: "Cali", country: "Colombia", address: "Cl 5 #66-80, Unicentro", phone: "+57 2 488 9010", manager: "Luisa Fernanda Arango", employees: 7, openingYear: 2020 },
  // United States
  { id: "us-001", name: "Brasaland Brickell", city: "Miami", country: "United States", address: "1010 Brickell Ave, Miami FL", phone: "+1 305 555 0001", manager: "Roberto Martínez", employees: 9, openingYear: 2021 },
  { id: "us-002", name: "Brasaland Coral Gables", city: "Miami", country: "United States", address: "301 Alhambra Cir, Coral Gables FL", phone: "+1 305 555 0002", manager: "Ana García", employees: 8, openingYear: 2022 },
  { id: "us-003", name: "Brasaland Downtown", city: "Orlando", country: "United States", address: "150 S Orange Ave, Orlando FL", phone: "+1 407 555 0003", manager: "Juan Carlos Pérez", employees: 8, openingYear: 2023 },
  { id: "us-004", name: "Brasaland International Drive", city: "Orlando", country: "United States", address: "8986 International Dr, Orlando FL", phone: "+1 407 555 0004", manager: "Patricia Torres", employees: 9, openingYear: 2023 },
];

// Generate mock daily sales for last 30 days
export function generateDailySales(): DailySales[] {
  const sales: DailySales[] = [];
  const now = new Date();

  for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
    const date = new Date(now);
    date.setDate(date.getDate() - dayOffset);
    const dateStr = date.toISOString().split("T")[0];

    for (const location of locations) {
      // Simulate realistic daily revenue between $800-$3500 USD per location
      const baseRevenue = location.country === "United States" ? 2200 : 1400;
      const weekdayMultiplier = date.getDay() === 0 || date.getDay() === 6 ? 1.4 : 1;
      const randomFactor = 0.7 + Math.random() * 0.6;
      const revenue = Math.round(baseRevenue * weekdayMultiplier * randomFactor);

      // Calculate orders from average ticket
      const averageTicket = location.country === "United States" ? 28 : 18;
      const orders = Math.round(revenue / averageTicket);

      sales.push({
        date: dateStr,
        locationId: location.id,
        revenue,
        orders,
        averageTicket,
      });
    }
  }
  return sales;
}

// Brasa Points members
export const brasaPointsMembers: BrasaPointsMember[] = [
  { id: "bp-001", name: "Camila Ospina", email: "camila.ospina@email.com", phone: "+57 310 123 4567", country: "Colombia", city: "Medellín", favoriteLocation: "Brasaland El Poblado", totalPoints: 2840, redeemedPoints: 1200, registrationDate: "2024-01-15", lastVisit: "2026-09-10" },
  { id: "bp-002", name: "Santiago Rodríguez", email: "santiago.r@email.com", phone: "+57 315 987 6543", country: "Colombia", city: "Bogotá", favoriteLocation: "Brasaland Zona Rosa", totalPoints: 1520, redeemedPoints: 500, registrationDate: "2024-03-22", lastVisit: "2026-09-08" },
  { id: "bp-003", name: "María Fernanda López", email: "mafe.lopez@email.com", phone: "+1 305 555 1234", country: "United States", city: "Miami", favoriteLocation: "Brasaland Brickell", totalPoints: 3100, redeemedPoints: 1500, registrationDate: "2024-02-10", lastVisit: "2026-09-12" },
  { id: "bp-004", name: "Juan Esteban Giraldo", email: "jegiraldo@email.com", phone: "+57 301 456 7890", country: "Colombia", city: "Medellín", favoriteLocation: "Brasaland Laureles", totalPoints: 890, redeemedPoints: 0, registrationDate: "2025-06-01", lastVisit: "2026-09-05" },
  { id: "bp-005", name: "Andrea Mejía", email: "andrea.mejia@email.com", phone: "+1 407 555 5678", country: "United States", city: "Orlando", favoriteLocation: "Brasaland Downtown", totalPoints: 1750, redeemedPoints: 800, registrationDate: "2024-08-18", lastVisit: "2026-09-11" },
  { id: "bp-006", name: "Carlos Andrés Pérez", email: "carlos.perez@email.com", phone: "+57 318 234 5678", country: "Colombia", city: "Cali", favoriteLocation: "Brasaland Granada", totalPoints: 2100, redeemedPoints: 900, registrationDate: "2024-05-12", lastVisit: "2026-09-09" },
  { id: "bp-007", name: "Isabella Martinez", email: "isa.martinez@email.com", phone: "+1 305 555 9012", country: "United States", city: "Miami", favoriteLocation: "Brasaland Coral Gables", totalPoints: 980, redeemedPoints: 200, registrationDate: "2025-01-20", lastVisit: "2026-09-07" },
  { id: "bp-008", name: "Laura Valentina Restrepo", email: "laura.restrepo@email.com", phone: "+57 300 876 5432", country: "Colombia", city: "Medellín", favoriteLocation: "Brasaland Envigado", totalPoints: 4200, redeemedPoints: 2500, registrationDate: "2024-01-05", lastVisit: "2026-09-12" },
];

// Mock orders
export const recentOrders: Order[] = [
  { id: "ORD-9847", locationId: "col-001", customerName: "Camila Ospina", items: ["Punta de Anca", "Chorizo", "Cerveza"], total: 85000, status: "delivered", timestamp: "2026-09-13T12:30:00" },
  { id: "ORD-9848", locationId: "us-001", customerName: "María Fernanda López", items: ["Ribeye Steak", "Grilled Shrimp", "Caesar Salad"], total: 78, status: "preparing", timestamp: "2026-09-13T12:45:00" },
  { id: "ORD-9849", locationId: "col-005", customerName: "Santiago Rodríguez", items: ["Lomo al Trapo", "Patacón"], total: 65000, status: "pending", timestamp: "2026-09-13T13:00:00" },
  { id: "ORD-9850", locationId: "col-007", customerName: "Diego Ramírez", items: ["Secreto Ibérico", "Ensalada Tropical", "Jugo Natural"], total: 72000, status: "ready", timestamp: "2026-09-13T13:15:00" },
  { id: "ORD-9851", locationId: "us-003", customerName: "Andrea Mejía", items: ["Churrasco", "Yuca Frita", "Tres Leches"], total: 62, status: "preparing", timestamp: "2026-09-13T13:20:00" },
  { id: "ORD-9852", locationId: "col-002", customerName: "Laura Restrepo", items: ["Costillas BBQ", "Arroz con Coco"], total: 58000, status: "delivered", timestamp: "2026-09-13T11:45:00" },
  { id: "ORD-9853", locationId: "us-002", customerName: "Isabella Martinez", items: ["Grilled Chicken", "Quinoa Salad"], total: 45, status: "cancelled", timestamp: "2026-09-13T11:30:00" },
  { id: "ORD-9854", locationId: "col-008", customerName: "Carlos Pérez", items: ["Bandeja Paisa", "Limonada de Coco"], total: 48000, status: "pending", timestamp: "2026-09-13T13:30:00" },
];

// Helper functions
export function getRevenueByCountry(sales: DailySales[]): Record<string, number> {
  const result: Record<string, number> = { Colombia: 0, "United States": 0 };
  for (const sale of sales) {
    const location = locations.find((l) => l.id === sale.locationId);
    if (location) {
      result[location.country] += sale.revenue;
    }
  }
  return result;
}

export function getRevenueByLocation(sales: DailySales[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const sale of sales) {
    if (!result[sale.locationId]) result[sale.locationId] = 0;
    result[sale.locationId] += sale.revenue;
  }
  return result;
}

export function getTotalMembers(): number {
  return brasaPointsMembers.length * 120; // Simulated total (120x sample)
}

export function getTotalPointsInCirculation(): number {
  return brasaPointsMembers.reduce((acc, m) => acc + (m.totalPoints - m.redeemedPoints), 0) * 85;
}

export function getOrdersByStatus(): Record<string, number> {
  const result: Record<string, number> = { pending: 0, preparing: 0, ready: 0, delivered: 0, cancelled: 0 };
  for (const order of recentOrders) {
    result[order.status]++;
  }
  return result;
}
