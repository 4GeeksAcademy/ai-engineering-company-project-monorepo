import { MenuItem, Order } from "./entities";

export interface OrderKpiReport {
  daily_sales: number;
  average_order_value: number;
  sales_by_branch: Record<string, number>;
  sales_by_channel: Record<string, number>;
  cancellation_rate: number;
}

export function countMenuItemsByCategory(items: MenuItem[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const current: number = counts[item.category] ?? 0;
    counts[item.category] = current + 1;
  }
  return counts;
}

export function calculateOrderTotal(orders: Order[]): number {
  return orders.reduce((total: number, order: Order) => total + order.total_amount, 0);
}

export function calculateOrderAverage(orders: Order[]): number {
  if (orders.length === 0) return 0;
  return calculateOrderTotal(orders) / orders.length;
}

export function calculateAverageOrderValue(orders: Order[]): number {
  return calculateOrderAverage(orders);
}

export function calculateSalesByBranch(orders: Order[]): Record<string, number> {
  const salesByBranch: Record<string, number> = {};
  for (const order of orders) {
    const current: number = salesByBranch[order.branch_id] ?? 0;
    salesByBranch[order.branch_id] = current + order.total_amount;
  }
  return salesByBranch;
}

export function calculateSalesByChannel(orders: Order[]): Record<string, number> {
  const salesByChannel: Record<string, number> = {};
  for (const order of orders) {
    const current: number = salesByChannel[order.channel] ?? 0;
    salesByChannel[order.channel] = current + order.total_amount;
  }
  return salesByChannel;
}

export function calculateCancellationRate(orders: Order[]): number {
  if (orders.length === 0) return 0;
  const cancelledCount: number = orders.filter((order: Order) => order.status === "cancelled").length;
  return cancelledCount / orders.length;
}

export function calculateOrderMaximum(orders: Order[]): number | null {
  if (orders.length === 0) return null;
  return Math.max(...orders.map((order: Order) => order.total_amount));
}

export function calculateOrderMinimum(orders: Order[]): number | null {
  if (orders.length === 0) return null;
  return Math.min(...orders.map((order: Order) => order.total_amount));
}

export function generateOrderKpiReport(orders: Order[]): OrderKpiReport {
  return {
    daily_sales: calculateOrderTotal(orders),
    average_order_value: calculateAverageOrderValue(orders),
    sales_by_branch: calculateSalesByBranch(orders),
    sales_by_channel: calculateSalesByChannel(orders),
    cancellation_rate: calculateCancellationRate(orders),
  };
}
