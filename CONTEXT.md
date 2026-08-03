# Trackflow Inc.

## Company Overview

Track Flow is your logistics partner for secure warehousing, smooth operations, and on-time last-mile delivery.

## Product & Service

Track Flow provides warehousing, inventory management, order fulfillment, and last-mile delivery solutions for businesses that need speed, organization, and reliability. We help companies store, process, and move products efficiently from warehouse to final destination. Our operations cover major cities, nearby regional markets, and strategic commercial routes, giving our clients the flexibility to scale their logistics with confidence.
## Branding:
- Color: Flow Blue – #2563EB. Very common promotes a sense of reliability.
- Motto: "Faster routes, smarter deliveries"
- Logo: ![TrackFlow Logo](workflows/TrackFlowLogo.png)

- PART 2:
# Milestone 2 — Building Scripts to Automate Tasks

## 🎯 The Challenge

📌 You are building on your own fork of the company's monorepo selected at the beginning of the course — not on a new repository.

You already have your company's public website running with forms and basic validations. Now your tech team needs you to build the first internal functionalities that will make the business operate more efficiently.

Your manager has assigned you to implement a set of data processing utilities that the team needs for day-to-day operations. This is not a complete interface yet — that will come later — but rather the foundational functions that will allow you to manage, filter, sort, and transform critical business information. Think of this as the logic layer that other systems will use down the line.

These utilities must be written in TypeScript, be reusable, properly typed, and able to run both in the browser and in development environments. The emphasis is on mastering structured data manipulation: collections, objects, searches, sorting, and transformations.

## 📋 What you're being asked to build

Your tech lead sends you the following brief via email:

From: Tech Lead
To: You
Subject: Core functionalities for data processing

Hi,

We need you to implement a set of TypeScript functions that allow us to efficiently handle the company's main data. The goal is to have solid, well-typed utilities that we can reuse in multiple contexts.

What we need:

1. **Collection management system:** Functions to filter, sort, search, and group elements within arrays. You must implement linear search for unsorted arrays and binary search for sorted arrays. Make sure to properly handle empty cases and elements not found.

2. **Data modeling with objects and interfaces:** Define the TypeScript interfaces that represent the main business entities. Each interface must have explicit types for all its properties and auxiliary methods to work with that data. Use literal objects to represent concrete instances.

3. **Transformations and aggregations:** Implement functions that take collections of objects and generate simple reports: count elements by category, sum numeric values, find maximums and minimums, calculate averages. Everything must be typed.

4. **Business validations:** Create functions that validate that data complies with your company's specific rules before being processed or stored. For example, verify that an element has all required fields, that numeric values are within allowed ranges, or that dates are coherent.

The code must be clean, with descriptive names, and each function must have a single responsibility. We want this to be maintainable in the long term.

Check your company's context document to know exactly what entities to model, what validations to apply, and what reports to generate.

Best regards,

Tech Lead

---

## 💡 What you should know before starting

This milestone focuses exclusively on programming logic and data manipulation with TypeScript. You are encouraged to solve this challenge without AI support or, if needed, with only minimal AI usage, so you can strengthen your logical and analytical thinking and problem-solving skills, which are fundamental for every programmer.

### Key concepts you'll apply:

- **Arrays and matrices:** How to store, traverse, sort, and search for elements in collections.
- **Linear search vs binary search:** When to use each one and how to implement them correctly.
- **Interfaces and literal objects:** How to model real-world data in TypeScript with explicit types.
- **Pure functions:** Writing functions that only work with what they receive as parameters, without depending on global variables.
- **Functional transformations:** Using `.map()`, `.filter()`, `.reduce()`, and other array methods to transform data without explicit loops.
- **Validations:** How to write functions that verify data complies with business rules before processing it.

### Expected file structure:

Your implementation should be organized in separate TypeScript files by responsibility:

src/
├── types/
│   └── models.ts            # Interfaces and types
├── utils/
│   ├── collections.ts       # Array functions
│   ├── search.ts            # Linear and binary searches
│   ├── transformations.ts   # Aggregations and reports
│   └── validations.ts       # Business validations
└── index.html               # Test page (optional)

You can include a simple HTML page with Tailwind CSS to manually test your functions if you wish, but the main focus is on the TypeScript logic. At minimum, your project must include a clear command to validate or execute the TypeScript code during development, such as:

npx tsc --noEmit
npm run typecheck
npx tsx src/demo.ts

---

4. Create a branch for this milestone:

git checkout -b milestone-2-programming-fundamentals

5. Organize your code in the proposed folder structure and start implementing the functions.

6. Make sure the project can be validated or executed with a clear TypeScript command during development. Example:

npx tsc --noEmit

7. Start implementing the functions.

---

# 💻 What You Need to Do

Implement the following functionalities in TypeScript. All entity names, fields, and rules must match exactly what is specified in your CONTEXT.md.

## Backend / Logic

☐ Define the TypeScript interfaces for all main entities of your company specified in your CONTEXT.md

☐ Implement filtering functions that allow searching for elements by one or more criteria (e.g., filter by category, price range, status)

☐ Implement sorting functions that sort arrays according to different criteria (ascending, descending, by multiple fields)

☐ Implement linear search to find elements in unsorted arrays

☐ Implement binary search to find elements in previously sorted arrays

☐ Create aggregation functions that generate reports: count elements by category, calculate totals, averages, maximums, and minimums

☐ Implement business validations that verify objects comply with the rules in your CONTEXT.md before being processed

☐ All functions must have explicit types in parameters and return values

☐ The code must follow the single responsibility principle: each function does one thing

☐ The project includes a clear command to validate or execute the TypeScript code during development

⚠ IMPORTANT: Field names, entity types, and validation rules in your implementation must match exactly what is specified in your CONTEXT.md. A generic implementation that ignores the context will not be accepted.

## Frontend / Testing (Optional)

☐ Create a simple HTML page with Tailwind CSS that allows you to manually test your functions

☐ Include buttons or controls to execute different operations (filter, search, sort, generate reports)

☐ Display operation results in the interface clearly

If you add an `index.html` page to test your functions manually, make sure you can serve it locally or in Codespaces with a simple command such as:

npx http-server -p 3000 -a 0.0.0.0

## Code Quality

☐ Use descriptive names for variables, functions, and interfaces (camelCase for variables and functions, PascalCase for interfaces)

☐ Each function must be pure: works only with what it receives as parameters, without modifying global variables

☐ Write comments only when necessary to explain complex logic, not to describe obvious code

☐ Handle empty cases correctly: empty arrays, elements not found, null values

☐ Use const by default and let only when the value will change

☐ Maintain consistent indentation and formatting throughout the code
What We Will Evaluate
*Technical Correctness*
  -TypeScript interfaces correctly model the entities specified in CONTEXT.md with all their fields and types 
  -Filtering functions correctly return elements that meet the specified criteria 
  - Sorting works correctly in ascending and descending order
  - Linear search finds elements in unsorted arrays without errors
  - Binary search works correctly on sorted arrays and returns the correct index or -1 if not found
  - Aggregations correctly calculate totals, averages, counts, and extreme values
  - Validations reject data that does not comply with the business rules in CONTEXT.md
  - There are no TypeScript compilation errors in any file There is a documented command to run TypeScript validation or execution locally ( , , etc.)
  - There is a documented command to run TypeScript validation or execution locally (npx tsc --noEmit, npm run typecheck, etc.) npx tsc --noEmit npm run ty
*Structure and Organization*
  - Code is organized in separate files by responsibility (types, utils, validations)
  - Each function has a single clearly identifiable responsibility
  - Variable, function, and interface names are descriptive and follow TypeScript conventions
*Context Adaptation*
    - All entity names, fields, and types match exactly those specified in CONTEXT.md
    - Implemented validations correspond to the business rules defined in CONTEXT.md
    - Generated reports respond to the specific needs described in CONTEXT.md
*Code Quality*
    - Functions are pure: they don't depend on external variables or modify global state
    - Edge cases are handled correctly: empty arrays, elements not found, null values
    - Code follows TypeScript best practices: explicit types, appropriate use of const/let, avoids any

# CONTEXT — TrackFlow

**Milestone 2: Programming Fundamentals**  
**Company:** TrackFlow — Last-Mile Delivery & Warehouse Management  
**Your Role:** Junior AI Engineer, TrackFlow Tech Team  
**Project Owner:** Ana Whitfield, Head of Warehouse Operations

---

## About TrackFlow

TrackFlow is a last-mile delivery and warehouse management company operating in the United States (Los Angeles) and Spain (Zaragoza). The company manages warehouses for e-commerce brands and handles the final delivery to end customers. You're part of TrackFlow Tech, the internal unit leading the company's digital transformation.

---

## Your Assignment

Ana Whitfield needs you to build the core data processing logic for TrackFlow's warehouse and carrier management systems. Currently, warehouse managers and logistics coordinators handle everything manually — tracking inventory, scoring carriers, calculating shipping costs, and managing order fulfillment. This milestone focuses on building the TypeScript functions that will power inventory control and carrier selection.

This is pure programming — no AI, no prompting. Ana needs reliable code that won't break when processing thousands of orders per day.

---

## What You're Building

You will implement a set of TypeScript utilities to:

1. **Model shipment, inventory, and carrier data** using interfaces
2. **Filter and search inventory** by SKU, location, and stock levels
3. **Score carriers** based on cost, speed, and reliability
4. **Calculate shipping costs** based on weight, distance, and carrier rates
5. **Generate warehouse reports** with aggregated metrics
6. **Validate data** before processing orders

---

## Business Entities

### Product

Represents a product stored in TrackFlow's warehouses.

**Interface: `Product`**

```typescript
interface Product {
  sku: string; // Stock Keeping Unit (e.g., "SHOE-BLK-42")
  name: string; // Product name
  category: ProductCategory; // Product category
  weightKg: number; // Weight in kilograms
  dimensions: Dimensions; // Length, width, height in cm
  warehouse: WarehouseLocation; // Current warehouse
  stockQuantity: number; // Available units
  minStockThreshold: number; // Minimum stock before alert
  unitCostUSD: number; // Cost per unit in USD
  isFragile: boolean; // Requires special handling
  status: ProductStatus; // Current status
}

interface Dimensions {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

type ProductCategory =
  | "Fashion"
  | "Electronics"
  | "Cosmetics"
  | "Home"
  | "Other";
type WarehouseLocation = "Los Angeles" | "Zaragoza";
type ProductStatus = "Active" | "Low stock" | "Out of stock" | "Discontinued";
```

**Validation Rules:**

- `sku` must not be empty
- `weightKg` must be > 0 and <= 100
- All dimensions must be > 0 and <= 200
- `stockQuantity` must be >= 0
- `minStockThreshold` must be >= 0
- `unitCostUSD` must be > 0

---

### Shipment

Represents a delivery order that needs to be shipped to a customer.

**Interface: `Shipment`**

```typescript
interface Shipment {
  id: string; // Unique shipment ID (e.g., "SH-2024-8821")
  sku: string; // Product SKU being shipped
  quantity: number; // Number of units
  origin: WarehouseLocation; // Origin warehouse
  destination: Destination; // Delivery destination
  priority: ShipmentPriority; // Urgency level
  declaredValueUSD: number; // Declared value for insurance
  carrier: string | null; // Assigned carrier (null if not assigned)
  status: ShipmentStatus; // Current status
  createdAt: Date; // Order creation date
}

interface Destination {
  city: string;
  country: Country;
  postalCode: string;
  distanceKm: number; // Distance from origin warehouse
}

type Country = "United States" | "Spain";
type ShipmentPriority = "Standard" | "Express" | "Same-day";
type ShipmentStatus =
  | "Pending"
  | "Assigned"
  | "In transit"
  | "Delivered"
  | "Failed";
```

**Validation Rules:**

- `quantity` must be > 0
- `declaredValueUSD` must be > 0
- `distanceKm` must be >= 0

---

### Carrier

Represents a delivery carrier that TrackFlow works with.

**Interface: `Carrier`**

```typescript
interface Carrier {
  id: string; // Carrier ID (e.g., "CAR-UPS")
  name: string; // Carrier name (e.g., "UPS")
  operatesIn: Country[]; // Countries where they operate
  baseRateUSD: number; // Base delivery cost (USD)
  ratePerKgUSD: number; // Additional cost per kg (USD)
  ratePerKmUSD: number; // Additional cost per km (USD)
  avgDeliveryDays: number; // Average delivery time in days
  onTimeRate: number; // On-time delivery rate (0-100)
  maxWeightKg: number; // Maximum package weight they accept
  handlesFragile: boolean; // Can handle fragile items
  acceptsPriority: ShipmentPriority[]; // Priorities they support
}
```

**Validation Rules:**

- `baseRateUSD`, `ratePerKgUSD`, `ratePerKmUSD` must all be >= 0
- `avgDeliveryDays` must be > 0
- `onTimeRate` must be between 0 and 100
- `maxWeightKg` must be > 0
- `operatesIn` must contain at least 1 country

---

### InventoryMovement

Tracks inventory changes (inbound or outbound).

**Interface: `InventoryMovement`**

```typescript
interface InventoryMovement {
  id: string; // Movement ID
  sku: string; // Product SKU
  warehouse: WarehouseLocation; // Warehouse location
  type: MovementType; // Inbound or outbound
  quantity: number; // Number of units moved
  reason: string; // Reason for movement
  timestamp: Date; // When it happened
}

type MovementType = "Inbound" | "Outbound" | "Transfer" | "Adjustment";
```

---

## Required Functions

Implement these functions in the appropriate files according to the structure in the README.

### 1. Collection Operations (`src/utils/collections.ts`)

**`filterProductsByWarehouse(products: Product[], warehouse: WarehouseLocation): Product[]`**

- Returns products in the specified warehouse

**`filterProductsByCategory(products: Product[], category: ProductCategory): Product[]`**

- Returns products in the specified category

**`filterLowStockProducts(products: Product[]): Product[]`**

- Returns products where `stockQuantity <= minStockThreshold`

**`sortProductsByStock(products: Product[], order: "asc" | "desc"): Product[]`**

- Returns products sorted by stock quantity
- Should not mutate the original array

**`sortCarriersByReliability(carriers: Carrier[], order: "asc" | "desc"): Carrier[]`**

- Returns carriers sorted by on-time rate
- Should not mutate the original array

---

### 2. Search Operations (`src/utils/search.ts`)

**`findProductBySKU(products: Product[], sku: string): Product | null`**

- Performs linear search to find a product by SKU
- SKU comparison should be case-insensitive
- Returns the product if found, null otherwise

**`findShipmentById(shipments: Shipment[], id: string): Shipment | null`**

- Performs linear search to find a shipment by ID
- Returns the shipment if found, null otherwise

**`binarySearchProductByWeight(sortedProducts: Product[], targetWeight: number): number`**

- Assumes the array is already sorted by weight (ascending)
- Performs binary search to find the index of a product with the target weight
- Returns the index if found, -1 otherwise

---

### 3. Carrier Scoring and Cost Calculation (`src/utils/transformations.ts`)

**`calculateShippingCost(shipment: Shipment, product: Product, carrier: Carrier): number`**

Calculates the total shipping cost based on:

- Base rate: `carrier.baseRateUSD`
- Weight cost: `product.weightKg * carrier.ratePerKgUSD * shipment.quantity`
- Distance cost: `shipment.destination.distanceKm * carrier.ratePerKmUSD`
- Priority surcharge:
  - Standard: 0% additional
  - Express: +30%
  - Same-day: +60%
- Returns total cost rounded to 2 decimal places

**`scoreCarrierForShipment(carrier: Carrier, shipment: Shipment, product: Product): number`**

Calculates a suitability score (0-100) for a carrier based on:

- **Operates in destination country (20 points):**
  - +20 if carrier operates in shipment's destination country
  - 0 otherwise

- **Can handle weight (20 points):**
  - +20 if `product.weightKg * shipment.quantity <= carrier.maxWeightKg`
  - 0 otherwise

- **Supports priority (15 points):**
  - +15 if carrier accepts the shipment's priority level
  - 0 otherwise

- **Handles fragile (15 points):**
  - +15 if product is fragile and carrier handles fragile items
  - +15 if product is not fragile
  - 0 if product is fragile but carrier doesn't handle fragile

- **Reliability (30 points):**
  - Points = carrier's `onTimeRate * 0.3`
  - (e.g., 90% on-time rate = 27 points)

Returns score rounded to 2 decimal places

**`selectBestCarrier(carriers: Carrier[], shipment: Shipment, product: Product): {carrier: Carrier, score: number, cost: number} | null`**

- Scores all carriers for the shipment
- Filters out carriers with score < 50 (unsuitable)
- Among suitable carriers, selects the one with the lowest cost
- Returns the best carrier with its score and cost, or null if no suitable carrier found

---

### 4. Aggregations and Reports (`src/utils/transformations.ts`)

**`countProductsByCategory(products: Product[]): Record<ProductCategory, number>`**

- Returns a count of products for each category

**`calculateTotalInventoryValue(products: Product[]): number`**

- Returns the total value of all inventory
- Formula: sum of (`stockQuantity * unitCostUSD`) for all products
- Round to 2 decimal places

**`calculateAverageShipmentDistance(shipments: Shipment[]): number`**

- Returns the average distance across all shipments
- Round to 2 decimal places

**`groupShipmentsByStatus(shipments: Shipment[]): Record<ShipmentStatus, Shipment[]>`**

- Groups shipments by status
- Returns an object where keys are statuses and values are arrays of shipments

**`findTopCarriers(shipments: Shipment[], topN: number): Array<{carrier: string, count: number}>`**

- Finds the N most used carriers based on assigned shipments
- Ignores shipments with null carrier
- Returns them sorted by usage count (highest first)
- Each element contains carrier name and shipment count

---

### 5. Validations (`src/utils/validations.ts`)

**`validateProduct(product: Product): { valid: boolean, errors: string[] }`**

- Validates all business rules for a product
- Returns an object with:
  - `valid`: true if all validations pass, false otherwise
  - `errors`: array of error messages (empty if valid)

**`validateShipment(shipment: Shipment): { valid: boolean, errors: string[] }`**

- Validates all business rules for a shipment
- Returns an object with:
  - `valid`: true if all validations pass, false otherwise
  - `errors`: array of error messages (empty if valid)

**`validateCarrier(carrier: Carrier): { valid: boolean, errors: string[] }`**

- Validates all business rules for a carrier
- Returns an object with:
  - `valid`: true if all validations pass, false otherwise
  - `errors`: array of error messages (empty if valid)

---

## Sample Data

Use this data to test your functions:

### Sample Products

```typescript
const sampleProducts: Product[] = [
  {
    sku: "SHOE-BLK-42",
    name: "Black Running Shoes - Size 42",
    category: "Fashion",
    weightKg: 0.8,
    dimensions: { lengthCm: 35, widthCm: 22, heightCm: 12 },
    warehouse: "Los Angeles",
    stockQuantity: 45,
    minStockThreshold: 20,
    unitCostUSD: 35.0,
    isFragile: false,
    status: "Active",
  },
  {
    sku: "LAPTOP-DELL-15",
    name: "Dell Laptop 15 inch",
    category: "Electronics",
    weightKg: 2.3,
    dimensions: { lengthCm: 40, widthCm: 28, heightCm: 3 },
    warehouse: "Zaragoza",
    stockQuantity: 8,
    minStockThreshold: 10,
    unitCostUSD: 650.0,
    isFragile: true,
    status: "Low stock",
  },
  {
    sku: "PERFUME-COCO-50",
    name: "Coco Perfume 50ml",
    category: "Cosmetics",
    weightKg: 0.3,
    dimensions: { lengthCm: 12, widthCm: 8, heightCm: 15 },
    warehouse: "Los Angeles",
    stockQuantity: 120,
    minStockThreshold: 30,
    unitCostUSD: 85.0,
    isFragile: true,
    status: "Active",
  },
];
```

### Sample Carriers

```typescript
const sampleCarriers: Carrier[] = [
  {
    id: "CAR-UPS",
    name: "UPS",
    operatesIn: ["United States"],
    baseRateUSD: 5.0,
    ratePerKgUSD: 1.2,
    ratePerKmUSD: 0.05,
    avgDeliveryDays: 3,
    onTimeRate: 88,
    maxWeightKg: 30,
    handlesFragile: true,
    acceptsPriority: ["Standard", "Express"],
  },
  {
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
  },
  {
    id: "CAR-DHL",
    name: "DHL Express",
    operatesIn: ["United States", "Spain"],
    baseRateUSD: 12.0,
    ratePerKgUSD: 2.0,
    ratePerKmUSD: 0.1,
    avgDeliveryDays: 1,
    onTimeRate: 95,
    maxWeightKg: 50,
    handlesFragile: true,
    acceptsPriority: ["Express", "Same-day"],
  },
];
```

### Sample Shipment

```typescript
const sampleShipment: Shipment = {
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
  declaredValueUSD: 650.0,
  carrier: null,
  status: "Pending",
  createdAt: new Date("2024-03-15"),
};
```

---

## Acceptance Criteria

Your implementation will be evaluated on:

1. **Type Safety:** All interfaces defined correctly with appropriate types
2. **Function Correctness:** Each function produces the expected output for the given inputs
3. **Edge Case Handling:** Functions handle empty arrays, null values, and invalid data gracefully
4. **Validation Logic:** Business rules are enforced accurately
5. **Code Organization:** Functions are in the correct files according to responsibility
6. **Naming Conventions:** Variables, functions, and types follow TypeScript conventions
7. **No Mutations:** Sorting and filtering functions don't modify the original arrays
8. **Pure Functions:** Functions only work with parameters, no global variables

---

## What Ana Expects

> "Listen, we process 2,000+ shipments per week across both warehouses. I can't have your code breaking when there's a null value or an edge case. Write it like it's going into production tomorrow — because it is. Make it solid, make it testable, and make it maintainable."  
> — Ana Whitfield, Head of Warehouse Operations

---

## Questions?

If you're unsure about any requirement, ask your mentor. In a real work environment, you'd message Ana on Slack.

---

_This is a real TrackFlow project. What you build here will become part of the production warehouse and carrier management system used in Los Angeles and Zaragoza._