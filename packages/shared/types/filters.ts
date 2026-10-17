import {
  CurrencyCode,
  MenuAvailability,
  MenuItem,
  Order,
  OrderChannel,
  OrderStatus,
} from "./entities";

export interface NumberRange {
  min?: number;
  max?: number;
}

export interface MenuItemFilterCriteria {
  category?: string;
  price_range?: NumberRange;
  availability?: MenuAvailability;
  currency?: CurrencyCode;
}

export interface OrderFilterCriteria {
  status?: OrderStatus;
  channel?: OrderChannel;
  branch_id?: string;
  customer_id?: string;
  total_amount_range?: NumberRange;
}

export function filterMenuItemsByCategory(items: MenuItem[], category: string): MenuItem[] {
  return items.filter((item: MenuItem) => item.category === category);
}

export function filterMenuItemsByPriceRange(
  items: MenuItem[],
  priceRange: NumberRange,
): MenuItem[] {
  return items.filter((item: MenuItem) => {
    const meetsMin: boolean = priceRange.min === undefined || item.price >= priceRange.min;
    const meetsMax: boolean = priceRange.max === undefined || item.price <= priceRange.max;
    return meetsMin && meetsMax;
  });
}

export function filterMenuItemsByAvailability(
  items: MenuItem[],
  availability: MenuAvailability,
): MenuItem[] {
  return items.filter((item: MenuItem) => item.availability === availability);
}

export function filterMenuItemsByCurrency(items: MenuItem[], currency: CurrencyCode): MenuItem[] {
  return items.filter((item: MenuItem) => item.currency === currency);
}

export function filterMenuItems(items: MenuItem[], criteria: MenuItemFilterCriteria): MenuItem[] {
  let result: MenuItem[] = [...items];

  if (criteria.category !== undefined) {
    result = filterMenuItemsByCategory(result, criteria.category);
  }
  if (criteria.price_range !== undefined) {
    result = filterMenuItemsByPriceRange(result, criteria.price_range);
  }
  if (criteria.availability !== undefined) {
    result = filterMenuItemsByAvailability(result, criteria.availability);
  }
  if (criteria.currency !== undefined) {
    result = filterMenuItemsByCurrency(result, criteria.currency);
  }

  return result;
}

export function filterOrdersByStatus(orders: Order[], status: OrderStatus): Order[] {
  return orders.filter((order: Order) => order.status === status);
}

export function filterOrdersByChannel(orders: Order[], channel: OrderChannel): Order[] {
  return orders.filter((order: Order) => order.channel === channel);
}

export function filterOrdersByBranchId(orders: Order[], branchId: string): Order[] {
  return orders.filter((order: Order) => order.branch_id === branchId);
}

export function filterOrdersByCustomerId(orders: Order[], customerId: string): Order[] {
  return orders.filter((order: Order) => order.customer_id === customerId);
}

export function filterOrdersByTotalAmountRange(
  orders: Order[],
  totalAmountRange: NumberRange,
): Order[] {
  return orders.filter((order: Order) => {
    const meetsMin: boolean =
      totalAmountRange.min === undefined || order.total_amount >= totalAmountRange.min;
    const meetsMax: boolean =
      totalAmountRange.max === undefined || order.total_amount <= totalAmountRange.max;
    return meetsMin && meetsMax;
  });
}

export function filterOrders(orders: Order[], criteria: OrderFilterCriteria): Order[] {
  let result: Order[] = [...orders];

  if (criteria.status !== undefined) {
    result = filterOrdersByStatus(result, criteria.status);
  }
  if (criteria.channel !== undefined) {
    result = filterOrdersByChannel(result, criteria.channel);
  }
  if (criteria.branch_id !== undefined) {
    result = filterOrdersByBranchId(result, criteria.branch_id);
  }
  if (criteria.customer_id !== undefined) {
    result = filterOrdersByCustomerId(result, criteria.customer_id);
  }
  if (criteria.total_amount_range !== undefined) {
    result = filterOrdersByTotalAmountRange(result, criteria.total_amount_range);
  }

  return result;
}
