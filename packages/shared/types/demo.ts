import {
  MenuItem,
  Order,
  calculateOrderAverage,
  countMenuItemsByCategory,
  filterMenuItems,
  sortByField,
} from "./index";

const menuItems: MenuItem[] = [
  {
    item_id: "m1",
    name: "Classic Grill Combo",
    category: "combo",
    price: 32,
    currency: "USD",
    availability: "available",
    allergens: ["gluten"],
  },
  {
    item_id: "m2",
    name: "Family Roast Pack",
    category: "family_pack",
    price: 58,
    currency: "USD",
    availability: "seasonal",
    allergens: [],
  },
  {
    item_id: "m3",
    name: "Lemon Tea",
    category: "beverage",
    price: 5,
    currency: "USD",
    availability: "available",
    allergens: [],
  },
];

const orders: Order[] = [
  {
    order_id: "o1",
    created_at: "2026-07-15T12:10:00Z",
    branch_id: "b1",
    customer_id: "c1",
    channel: "dine_in",
    status: "completed",
    total_amount: 40,
  },
  {
    order_id: "o2",
    created_at: "2026-07-15T13:20:00Z",
    branch_id: "b1",
    customer_id: "c2",
    channel: "delivery",
    status: "completed",
    total_amount: 70,
  },
];

const filtered: MenuItem[] = filterMenuItems(menuItems, {
  category: "combo",
  price_range: { min: 20, max: 40 },
});
const sorted: MenuItem[] = sortByField(menuItems, "price", "asc");
const grouped: Record<string, number> = countMenuItemsByCategory(menuItems);
const average: number = calculateOrderAverage(orders);

console.log("filtered", filtered.map((item: MenuItem) => item.name));
console.log("sorted", sorted.map((item: MenuItem) => item.price));
console.log("grouped", grouped);
console.log("average", average);
