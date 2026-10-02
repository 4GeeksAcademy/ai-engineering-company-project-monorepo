export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  name: string;
  price: number;
  quantity: number;
}

export interface User extends BaseEntity {
  name: string;
  email: string;
}

export interface BaseRestaurantBill extends BaseEntity {
  userId: string;
  items: OrderItem[];
  totalAmount: number;
}

export interface MyRestaurantBill extends BaseRestaurantBill {}

export type OrderStatus = 'pending' | 'confirmed' | 'delivered' | 'canceled';

export interface MyRestaurantOrder extends BaseRestaurantBill {
  status: OrderStatus;
}

