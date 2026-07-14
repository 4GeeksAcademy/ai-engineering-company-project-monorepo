# CONTEXTO — TrackFlow

**Hito 2: Fundamentos de Programación**  
**Empresa:** TrackFlow — Gestión de Última Milla y Almacenes  
**Tu Rol:** Ingeniero de IA Junior, Equipo TrackFlow Tech  
**Responsable del Proyecto:** Ana Whitfield, Directora de Operaciones de Almacén

---

## Acerca de TrackFlow

TrackFlow es una empresa de gestión de última milla y almacenes que opera en Estados Unidos (Los Ángeles) y España (Zaragoza). La empresa gestiona almacenes para marcas de e-commerce y maneja la entrega final a los clientes finales. Eres parte de TrackFlow Tech, la unidad interna que lidera la transformación digital de la empresa.

---

## Tu Asignación

Ana Whitfield necesita que construyas la lógica central de procesamiento de datos para los sistemas de gestión de almacenes y transportistas de TrackFlow. Actualmente, los gerentes de almacén y coordinadores logísticos manejan todo manualmente — rastreando inventario, puntuando transportistas, calculando costos de envío, y gestionando cumplimiento de pedidos. Este hito se enfoca en construir las funciones TypeScript que alimentarán el control de inventario y la selección de transportistas.

Esto es programación pura — sin IA, sin prompting. Ana necesita código confiable que no se rompa al procesar miles de pedidos por día.

---

## Lo que Estás Construyendo

Implementarás un conjunto de utilidades TypeScript para:

1. **Modelar datos de envíos, inventario y transportistas** usando interfaces
2. **Filtrar y buscar inventario** por SKU, ubicación y niveles de stock
3. **Puntuar transportistas** basado en costo, velocidad y confiabilidad
4. **Calcular costos de envío** basados en peso, distancia y tarifas de transportista
5. **Generar reportes de almacén** con métricas agregadas
6. **Validar datos** antes de procesar pedidos

---

## Entidades de Negocio

### Producto (Product)

Representa un producto almacenado en los almacenes de TrackFlow.

**Interfaz: `Product`**

```typescript
interface Product {
  sku: string; // Stock Keeping Unit (ej: "SHOE-BLK-42")
  name: string; // Nombre del producto
  category: ProductCategory; // Categoría del producto
  weightKg: number; // Peso en kilogramos
  dimensions: Dimensions; // Largo, ancho, alto en cm
  warehouse: WarehouseLocation; // Almacén actual
  stockQuantity: number; // Unidades disponibles
  minStockThreshold: number; // Stock mínimo antes de alerta
  unitCostUSD: number; // Costo por unidad en USD
  isFragile: boolean; // Requiere manejo especial
  status: ProductStatus; // Estado actual
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

**Reglas de Validación:**

- `sku` no debe estar vacío
- `weightKg` debe ser > 0 y <= 100
- Todas las dimensiones deben ser > 0 y <= 200
- `stockQuantity` debe ser >= 0
- `minStockThreshold` debe ser >= 0
- `unitCostUSD` debe ser > 0

---

### Envío (Shipment)

Representa un pedido de entrega que necesita ser enviado a un cliente.

**Interfaz: `Shipment`**

```typescript
interface Shipment {
  id: string; // ID único de envío (ej: "SH-2024-8821")
  sku: string; // SKU del producto siendo enviado
  quantity: number; // Número de unidades
  origin: WarehouseLocation; // Almacén de origen
  destination: Destination; // Destino de entrega
  priority: ShipmentPriority; // Nivel de urgencia
  declaredValueUSD: number; // Valor declarado para seguro
  carrier: string | null; // Transportista asignado (null si no asignado)
  status: ShipmentStatus; // Estado actual
  createdAt: Date; // Fecha de creación del pedido
}

interface Destination {
  city: string;
  country: Country;
  postalCode: string;
  distanceKm: number; // Distancia desde el almacén de origen
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

**Reglas de Validación:**

- `quantity` debe ser > 0
- `declaredValueUSD` debe ser > 0
- `distanceKm` debe ser >= 0

---

### Transportista (Carrier)

Representa un transportista de entregas con el que TrackFlow trabaja.

**Interfaz: `Carrier`**

```typescript
interface Carrier {
  id: string; // ID del transportista (ej: "CAR-UPS")
  name: string; // Nombre del transportista (ej: "UPS")
  operatesIn: Country[]; // Países donde opera
  baseRateUSD: number; // Costo base de entrega (USD)
  ratePerKgUSD: number; // Costo adicional por kg (USD)
  ratePerKmUSD: number; // Costo adicional por km (USD)
  avgDeliveryDays: number; // Tiempo promedio de entrega en días
  onTimeRate: number; // Tasa de entrega a tiempo (0-100)
  maxWeightKg: number; // Peso máximo de paquete que aceptan
  handlesFragile: boolean; // Puede manejar ítems frágiles
  acceptsPriority: ShipmentPriority[]; // Prioridades que soportan
}
```

**Reglas de Validación:**

- `baseRateUSD`, `ratePerKgUSD`, `ratePerKmUSD` deben ser todos >= 0
- `avgDeliveryDays` debe ser > 0
- `onTimeRate` debe estar entre 0 y 100
- `maxWeightKg` debe ser > 0
- `operatesIn` debe contener al menos 1 país

---

### Movimiento de Inventario (InventoryMovement)

Rastrea cambios en el inventario (entrada o salida).

**Interfaz: `InventoryMovement`**

```typescript
interface InventoryMovement {
  id: string; // ID del movimiento
  sku: string; // SKU del producto
  warehouse: WarehouseLocation; // Ubicación del almacén
  type: MovementType; // Entrada o salida
  quantity: number; // Número de unidades movidas
  reason: string; // Razón del movimiento
  timestamp: Date; // Cuándo sucedió
}

type MovementType = "Inbound" | "Outbound" | "Transfer" | "Adjustment";
```

---

## Funciones Requeridas

Implementa estas funciones en los archivos apropiados según la estructura del README.

### 1. Operaciones de Colecciones (`src/utils/collections.ts`)

**`filterProductsByWarehouse(products: Product[], warehouse: WarehouseLocation): Product[]`**

- Retorna productos en el almacén especificado

**`filterProductsByCategory(products: Product[], category: ProductCategory): Product[]`**

- Retorna productos en la categoría especificada

**`filterLowStockProducts(products: Product[]): Product[]`**

- Retorna productos donde `stockQuantity <= minStockThreshold`

**`sortProductsByStock(products: Product[], order: "asc" | "desc"): Product[]`**

- Retorna productos ordenados por cantidad de stock
- No debe mutar el array original

**`sortCarriersByReliability(carriers: Carrier[], order: "asc" | "desc"): Carrier[]`**

- Retorna transportistas ordenados por tasa de entrega a tiempo
- No debe mutar el array original

---

### 2. Operaciones de Búsqueda (`src/utils/search.ts`)

**`findProductBySKU(products: Product[], sku: string): Product | null`**

- Realiza búsqueda lineal para encontrar un producto por SKU
- La comparación de SKU debe ser case-insensitive
- Retorna el producto si se encuentra, null en caso contrario

**`findShipmentById(shipments: Shipment[], id: string): Shipment | null`**

- Realiza búsqueda lineal para encontrar un envío por ID
- Retorna el envío si se encuentra, null en caso contrario

**`binarySearchProductByWeight(sortedProducts: Product[], targetWeight: number): number`**

- Asume que el array ya está ordenado por peso (ascendente)
- Realiza búsqueda binaria para encontrar el índice de un producto con el peso objetivo
- Retorna el índice si se encuentra, -1 en caso contrario

---

### 3. Scoring de Transportista y Cálculo de Costos (`src/utils/transformations.ts`)

**`calculateShippingCost(shipment: Shipment, product: Product, carrier: Carrier): number`**

Calcula el costo total de envío basado en:

- Tarifa base: `carrier.baseRateUSD`
- Costo por peso: `product.weightKg * carrier.ratePerKgUSD * shipment.quantity`
- Costo por distancia: `shipment.destination.distanceKm * carrier.ratePerKmUSD`
- Recargo por prioridad:
  - Standard: 0% adicional
  - Express: +30%
  - Same-day: +60%
- Retorna costo total redondeado a 2 decimales

**`scoreCarrierForShipment(carrier: Carrier, shipment: Shipment, product: Product): number`**

Calcula un puntaje de idoneidad (0-100) para un transportista basado en:

- **Opera en país de destino (20 puntos):**
  - +20 si el transportista opera en el país de destino del envío
  - 0 en caso contrario

- **Puede manejar peso (20 puntos):**
  - +20 si `product.weightKg * shipment.quantity <= carrier.maxWeightKg`
  - 0 en caso contrario

- **Soporta prioridad (15 puntos):**
  - +15 si el transportista acepta el nivel de prioridad del envío
  - 0 en caso contrario

- **Maneja frágiles (15 puntos):**
  - +15 si el producto es frágil y el transportista maneja frágiles
  - +15 si el producto no es frágil
  - 0 si el producto es frágil pero el transportista no maneja frágiles

- **Confiabilidad (30 puntos):**
  - Puntos = `onTimeRate` del transportista \* 0.3
  - (ej: 90% de tasa a tiempo = 27 puntos)

Retorna puntaje redondeado a 2 decimales

**`selectBestCarrier(carriers: Carrier[], shipment: Shipment, product: Product): {carrier: Carrier, score: number, cost: number} | null`**

- Puntúa todos los transportistas para el envío
- Filtra transportistas con puntaje < 50 (no adecuados)
- Entre los transportistas adecuados, selecciona el de menor costo
- Retorna el mejor transportista con su puntaje y costo, o null si no se encuentra ninguno adecuado

---

### 4. Agregaciones y Reportes (`src/utils/transformations.ts`)

**`countProductsByCategory(products: Product[]): Record<ProductCategory, number>`**

- Retorna un conteo de productos para cada categoría

**`calculateTotalInventoryValue(products: Product[]): number`**

- Retorna el valor total de todo el inventario
- Fórmula: suma de (`stockQuantity * unitCostUSD`) para todos los productos
- Redondear a 2 decimales

**`calculateAverageShipmentDistance(shipments: Shipment[]): number`**

- Retorna la distancia promedio de todos los envíos
- Redondear a 2 decimales

**`groupShipmentsByStatus(shipments: Shipment[]): Record<ShipmentStatus, Shipment[]>`**

- Agrupa envíos por estado
- Retorna un objeto donde las claves son estados y los valores son arrays de envíos

**`findTopCarriers(shipments: Shipment[], topN: number): Array<{carrier: string, count: number}>`**

- Encuentra los N transportistas más usados basado en envíos asignados
- Ignora envíos con transportista null
- Los retorna ordenados por conteo de uso (más alto primero)
- Cada elemento contiene nombre de transportista y conteo de envíos

---

### 5. Validaciones (`src/utils/validations.ts`)

**`validateProduct(product: Product): { valid: boolean, errors: string[] }`**

- Valida todas las reglas de negocio para un producto
- Retorna un objeto con:
  - `valid`: true si todas las validaciones pasan, false en caso contrario
  - `errors`: array de mensajes de error (vacío si es válido)

**`validateShipment(shipment: Shipment): { valid: boolean, errors: string[] }`**

- Valida todas las reglas de negocio para un envío
- Retorna un objeto con:
  - `valid`: true si todas las validaciones pasan, false en caso contrario
  - `errors`: array de mensajes de error (vacío si es válido)

**`validateCarrier(carrier: Carrier): { valid: boolean, errors: string[] }`**

- Valida todas las reglas de negocio para un transportista
- Retorna un objeto con:
  - `valid`: true si todas las validaciones pasan, false en caso contrario
  - `errors`: array de mensajes de error (vacío si es válido)

---

## Datos de Ejemplo

Usa estos datos para probar tus funciones:

### Productos de Ejemplo

```typescript
const sampleProducts: Product[] = [
  {
    sku: "SHOE-BLK-42",
    name: "Zapatillas Negras Running - Talla 42",
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
    name: "Laptop Dell 15 pulgadas",
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
    name: "Perfume Coco 50ml",
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

### Transportistas de Ejemplo

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

### Envío de Ejemplo

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

## Criterios de Aceptación

Tu implementación será evaluada en:

1. **Type Safety:** Todas las interfaces definidas correctamente con tipos apropiados
2. **Corrección de Funciones:** Cada función produce el output esperado para los inputs dados
3. **Manejo de Casos Límite:** Las funciones manejan arrays vacíos, valores nulos y datos inválidos correctamente
4. **Lógica de Validación:** Las reglas de negocio se aplican con precisión
5. **Organización del Código:** Las funciones están en los archivos correctos según responsabilidad
6. **Convenciones de Nombres:** Variables, funciones y tipos siguen las convenciones de TypeScript
7. **Sin Mutaciones:** Las funciones de ordenamiento y filtrado no modifican los arrays originales
8. **Funciones Puras:** Las funciones solo trabajan con parámetros, sin variables globales

---

## Lo que Ana Espera

> "Escucha, procesamos más de 2,000 envíos por semana en ambos almacenes. No puedo tener tu código rompiéndose cuando hay un valor nulo o un caso límite. Escríbelo como si fuera a producción mañana — porque así será. Hazlo sólido, hazlo testeable, y hazlo mantenible."  
> — Ana Whitfield, Directora de Operaciones de Almacén

---

## ¿Preguntas?

Si no estás seguro sobre algún requisito, pregunta a tu mentor/a. En un entorno de trabajo real, le escribirías a Ana por Slack.

---

_Este es un proyecto real de TrackFlow. Lo que construyas aquí se convertirá en parte del sistema de gestión de almacenes y transportistas en producción usado en Los Ángeles y Zaragoza._