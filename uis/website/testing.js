const menuItems = [
  {
    item_id: "M-001",
    name: "Classic Grill Combo",
    category: "combo",
    price: 32,
    currency: "USD",
    availability: "available",
    allergens: ["gluten"]
  },
  {
    item_id: "M-002",
    name: "Weekend Family Pack",
    category: "family_pack",
    price: 58,
    currency: "USD",
    availability: "seasonal",
    allergens: []
  },
  {
    item_id: "M-003",
    name: "Chicken Combo",
    category: "combo",
    price: 28,
    currency: "USD",
    availability: "available",
    allergens: []
  },
  {
    item_id: "M-004",
    name: "Herbal Tea",
    category: "beverage",
    price: 6,
    currency: "USD",
    availability: "available",
    allergens: []
  }
];

const orders = [
  {
    order_id: "O-1001",
    created_at: "2026-07-15T11:00:00Z",
    branch_id: "US-MIA-01",
    customer_id: "C-9001",
    channel: "dine_in",
    status: "completed",
    total_amount: 30
  },
  {
    order_id: "O-1002",
    created_at: "2026-07-15T11:30:00Z",
    branch_id: "US-MIA-01",
    customer_id: "C-9002",
    channel: "delivery",
    status: "in_prep",
    total_amount: 45
  },
  {
    order_id: "O-1003",
    created_at: "2026-07-15T12:00:00Z",
    branch_id: "CO-BOG-01",
    customer_id: "C-9003",
    channel: "takeaway",
    status: "created",
    total_amount: 22
  }
];

const branches = [
  {
    branch_id: "US-MIA-01",
    name: "Miami Doral",
    city: "Miami",
    country: "USA",
    timezone: "America/New_York",
    status: "active",
    opening_hours: "10:00-22:00"
  }
];

const customers = [
  {
    customer_id: "C-9001",
    name: "Ana Diaz",
    contact: "ana@email.com",
    city: "Miami",
    loyalty_tier: "silver",
    preferences: ["combo", "low-spice"]
  }
];

function printResult(payload) {
  const result = document.getElementById("result");
  result.textContent = JSON.stringify(payload, null, 2);
}

function filterMenuItemsByCategory(items, category) {
  return items.filter((item) => item.category === category);
}

function filterMenuItemsByPriceRange(items, min, max) {
  return items.filter((item) => item.price >= min && item.price <= max);
}

function sortByField(items, field, direction) {
  const sorted = [...items];
  sorted.sort((left, right) => {
    if (left[field] === right[field]) return 0;
    if (direction === "asc") return left[field] < right[field] ? -1 : 1;
    return left[field] > right[field] ? -1 : 1;
  });
  return sorted;
}

function linearSearchIndex(items, predicate) {
  for (let index = 0; index < items.length; index += 1) {
    if (predicate(items[index])) {
      return index;
    }
  }
  return -1;
}

function binarySearchByNumber(sortedItems, target, valueSelector) {
  let left = 0;
  let right = sortedItems.length - 1;

  while (left <= right) {
    const middle = Math.floor((left + right) / 2);
    const middleValue = valueSelector(sortedItems[middle]);

    if (middleValue === target) return middle;
    if (middleValue < target) {
      left = middle + 1;
    } else {
      right = middle - 1;
    }
  }
  return -1;
}

function countMenuItemsByCategory(items) {
  const counts = {};
  for (const item of items) {
    counts[item.category] = (counts[item.category] || 0) + 1;
  }
  return counts;
}

function calculateOrderTotal(items) {
  return items.reduce((total, item) => total + item.total_amount, 0);
}

function calculateOrderAverage(items) {
  if (items.length === 0) return 0;
  return calculateOrderTotal(items) / items.length;
}

function calculateOrderMaximum(items) {
  if (items.length === 0) return null;
  return Math.max(...items.map((item) => item.total_amount));
}

function calculateOrderMinimum(items) {
  if (items.length === 0) return null;
  return Math.min(...items.map((item) => item.total_amount));
}

function validateBranch(branch) {
  const errors = [];
  if (!branch.branch_id || branch.branch_id.trim().length === 0) errors.push("branch_id is required.");
  if (!branch.name || branch.name.trim().length === 0) errors.push("name is required.");
  if (!branch.city || branch.city.trim().length === 0) errors.push("city is required.");
  if (!branch.timezone || branch.timezone.trim().length === 0) errors.push("timezone is required.");
  if (!branch.opening_hours || branch.opening_hours.trim().length === 0) errors.push("opening_hours is required.");
  return { is_valid: errors.length === 0, errors };
}

function validateOrder(order, existingBranchIds, existingCustomerIds) {
  const errors = [];
  if (!order.order_id || order.order_id.trim().length === 0) errors.push("order_id is required.");
  if (Number.isNaN(Date.parse(order.created_at))) errors.push("created_at must be a valid ISO date.");
  if (order.total_amount < 0) errors.push("total_amount must be greater than or equal to 0.");
  if (!existingBranchIds.has(order.branch_id)) errors.push("branch_id does not exist.");
  if (!existingCustomerIds.has(order.customer_id)) errors.push("customer_id does not exist.");
  return { is_valid: errors.length === 0, errors };
}

document.getElementById("run-filter").addEventListener("click", () => {
  const category = document.getElementById("filter-category").value;
  const min = Number(document.getElementById("filter-min-price").value);
  const max = Number(document.getElementById("filter-max-price").value);

  const byCategory = filterMenuItemsByCategory(menuItems, category);
  const byCategoryAndPrice = filterMenuItemsByPriceRange(byCategory, min, max);

  printResult({ operation: "filter", result: byCategoryAndPrice });
});

document.getElementById("run-sort").addEventListener("click", () => {
  const field = document.getElementById("sort-field").value;
  const direction = document.getElementById("sort-direction").value;
  const sorted = sortByField(menuItems, field, direction);
  printResult({ operation: "sort", result: sorted });
});

document.getElementById("run-linear-search").addEventListener("click", () => {
  const targetOrderId = document.getElementById("linear-order-id").value;
  const index = linearSearchIndex(orders, (order) => order.order_id === targetOrderId);
  printResult({ operation: "linearSearch", target_order_id: targetOrderId, index });
});

document.getElementById("run-binary-search").addEventListener("click", () => {
  const targetAmount = Number(document.getElementById("binary-target").value);
  const sortedByAmount = sortByField(orders, "total_amount", "asc");
  const index = binarySearchByNumber(sortedByAmount, targetAmount, (order) => order.total_amount);
  printResult({ operation: "binarySearch", target_total_amount: targetAmount, sorted_orders: sortedByAmount, index });
});

document.getElementById("run-report").addEventListener("click", () => {
  const report = {
    count_by_category: countMenuItemsByCategory(menuItems),
    order_total: calculateOrderTotal(orders),
    order_average: calculateOrderAverage(orders),
    order_maximum: calculateOrderMaximum(orders),
    order_minimum: calculateOrderMinimum(orders)
  };
  printResult({ operation: "aggregation_report", report });
});

document.getElementById("run-validation").addEventListener("click", () => {
  const branchIdSet = new Set(branches.map((branch) => branch.branch_id));
  const customerIdSet = new Set(customers.map((customer) => customer.customer_id));

  const branchValidation = validateBranch(branches[0]);
  const orderValidation = validateOrder(orders[1], branchIdSet, customerIdSet);

  printResult({
    operation: "validation",
    branch_validation: branchValidation,
    order_validation: orderValidation
  });
});

printResult({
  operation: "ready",
  message: "Use controls above to run filter, sort, search, report, and validation operations."
});
