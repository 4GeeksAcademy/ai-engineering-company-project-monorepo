// Funciones utilitarias para validaciones

import {
  Brand,
  Product,
  InventoryItem,
  Order,
  OrderLine,
  Shipment,
  ReturnRequest,
  Customer,
  SupportTicket,
  Carrier,
  ShipmentStatus,
  ReturnStatus
} from '../types/models';

// ============================================
// INTERFACES DE VALIDACIÓN
// ============================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface ValidationRule {
  field: string;
  message: string;
  check: (value: unknown) => boolean;
}

// ============================================
// FUNCIONES GENÉRICAS DE VALIDACIÓN
// ============================================

/**
 * Valida que campos requeridos existan y no estén vacíos
 * @param obj Objeto a validar
 * @param requiredFields Array de nombres de campos requeridos
 * @returns ValidationResult con errores acumulados
 * @example
 * const result = validateRequired(brand, ['id', 'name', 'country']);
 */
export function validateRequired<T>(
  obj: T,
  requiredFields: (keyof T)[]
): ValidationResult {
  const errors: string[] = [];

  for (const field of requiredFields) {
    const value = obj[field];
    if (value === undefined || value === null) {
      errors.push(`El campo "${String(field)}" es requerido.`);
    } else if (typeof value === 'string' && value.trim().length === 0) {
      errors.push(`El campo "${String(field)}" no puede estar vacío.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Valida que un número sea positivo (> 0)
 * @param value Número a validar
 * @param fieldName Nombre del campo (para mensaje de error)
 * @returns ValidationResult
 * @example
 * const result = validatePositiveNumber(product.unitPrice, 'unitPrice');
 */
export function validatePositiveNumber(
  value: number,
  fieldName: string
): ValidationResult {
  const errors: string[] = [];

  if (typeof value !== 'number' || isNaN(value)) {
    errors.push(`El campo "${fieldName}" debe ser un número válido.`);
  } else if (value <= 0) {
    errors.push(`El campo "${fieldName}" debe ser mayor a 0.`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Valida que un número esté en un rango específico
 * @param value Número a validar
 * @param min Mínimo (inclusive)
 * @param max Máximo (inclusive)
 * @param fieldName Nombre del campo
 * @returns ValidationResult
 * @example
 * const result = validateRange(brand.riskScore, 0, 100, 'riskScore');
 */
export function validateRange(
  value: number,
  min: number,
  max: number,
  fieldName: string
): ValidationResult {
  const errors: string[] = [];

  if (typeof value !== 'number' || isNaN(value)) {
    errors.push(`El campo "${fieldName}" debe ser un número válido.`);
  } else if (value < min || value > max) {
    errors.push(`El campo "${fieldName}" debe estar entre ${min} y ${max}.`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Valida que una cadena sea ISO 8601 válida
 * @param dateString Fecha en formato ISO 8601
 * @param fieldName Nombre del campo
 * @returns ValidationResult
 * @example
 * const result = validateISODate('2024-12-31T23:59:59Z', 'createdAt');
 */
export function validateISODate(
  dateString: string,
  fieldName: string
): ValidationResult {
  const errors: string[] = [];

  if (typeof dateString !== 'string') {
    errors.push(`El campo "${fieldName}" debe ser una cadena de texto.`);
    return { valid: false, errors };
  }

  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    errors.push(`El campo "${fieldName}" no es una fecha ISO 8601 válida.`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Valida que una fecha no esté en el futuro
 * @param dateString Fecha en ISO 8601
 * @param fieldName Nombre del campo
 * @returns ValidationResult
 * @example
 * const result = validateDateInPast('2024-01-15T10:30:00Z', 'createdAt');
 */
export function validateDateInPast(
  dateString: string,
  fieldName: string
): ValidationResult {
  const isoValidation = validateISODate(dateString, fieldName);
  if (!isoValidation.valid) return isoValidation;

  const errors: string[] = [];
  const date = new Date(dateString);
  const now = new Date();

  if (date > now) {
    errors.push(`El campo "${fieldName}" no puede estar en el futuro.`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Valida que una fecha esté en el futuro
 * @param dateString Fecha en ISO 8601
 * @param fieldName Nombre del campo
 * @returns ValidationResult
 * @example
 * const result = validateDateInFuture('2025-12-31T23:59:59Z', 'expiryDate');
 */
export function validateDateInFuture(
  dateString: string,
  fieldName: string
): ValidationResult {
  const isoValidation = validateISODate(dateString, fieldName);
  if (!isoValidation.valid) return isoValidation;

  const errors: string[] = [];
  const date = new Date(dateString);
  const now = new Date();

  if (date < now) {
    errors.push(`El campo "${fieldName}" debe estar en el futuro.`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Valida que startDate <= endDate
 * @param startDate Fecha inicial en ISO 8601
 * @param endDate Fecha final en ISO 8601
 * @param startFieldName Nombre del campo inicial
 * @param endFieldName Nombre del campo final
 * @returns ValidationResult
 * @example
 * const result = validateDateRange(order.createdAt, shipment.deliveredAt, 'createdAt', 'deliveredAt');
 */
export function validateDateRange(
  startDate: string,
  endDate: string,
  startFieldName: string,
  endFieldName: string
): ValidationResult {
  const startValidation = validateISODate(startDate, startFieldName);
  const endValidation = validateISODate(endDate, endFieldName);
  const errors: string[] = [...startValidation.errors, ...endValidation.errors];

  if (errors.length === 0) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      errors.push(`El campo "${startFieldName}" debe ser anterior a "${endFieldName}".`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Valida que un valor esté en una lista permitida
 * @param value Valor a validar
 * @param allowedValues Array de valores permitidos
 * @param fieldName Nombre del campo
 * @returns ValidationResult
 * @example
 * const result = validateEnum(brand.country, ['US', 'ES'], 'country');
 */
export function validateEnum<T>(
  value: T,
  allowedValues: T[],
  fieldName: string
): ValidationResult {
  const errors: string[] = [];

  if (!allowedValues.includes(value)) {
    errors.push(`El campo "${fieldName}" debe ser uno de: ${allowedValues.join(', ')}.`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Valida formato de email
 * @param email Email a validar
 * @returns ValidationResult
 * @example
 * const result = validateEmail('test@example.com');
 */
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    errors.push('El correo electrónico no tiene un formato válido.');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Valida longitud mínima de cadena
 * @param value Cadena a validar
 * @param min Longitud mínima
 * @param fieldName Nombre del campo
 * @returns ValidationResult
 * @example
 * const result = validateMinLength(customer.fullName, 2, 'fullName');
 */
export function validateMinLength(
  value: string,
  min: number,
  fieldName: string
): ValidationResult {
  const errors: string[] = [];

  if (value.length < min) {
    errors.push(`El campo "${fieldName}" debe tener al menos ${min} caracteres.`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Valida que un array no esté vacío
 * @param arr Array a validar
 * @param fieldName Nombre del campo
 * @returns ValidationResult
 * @example
 * const result = validateArrayNotEmpty(order.lines, 'lines');
 */
export function validateArrayNotEmpty<T>(
  arr: T[],
  fieldName: string
): ValidationResult {
  const errors: string[] = [];

  if (!Array.isArray(arr) || arr.length === 0) {
    errors.push(`El campo "${fieldName}" no puede estar vacío.`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Combina múltiples resultados de validación
 * @param results Array de ValidationResult
 * @returns ValidationResult combinado
 * @example
 * const combined = combineValidationResults([result1, result2, result3]);
 */
export function combineValidationResults(
  results: ValidationResult[]
): ValidationResult {
  const errors = results.flatMap(r => r.errors);
  return {
    valid: errors.length === 0,
    errors
  };
}

// ============================================
// VALIDACIONES ESPECÍFICAS POR ENTIDAD
// ============================================

/**
 * Valida una marca (Brand)
 * @param brand Marca a validar
 * @param options Opciones de validación
 * @returns ValidationResult
 * @example
 * const result = validateBrand(brand);
 */
export function validateBrand(
  brand: Brand,
  options?: { allowExpiredContracts?: boolean }
): ValidationResult {
  const errors: string[] = [];

  const requiredValidation = validateRequired(brand, ['id', 'name', 'country', 'contractStatus', 'contractEndDate', 'accountManagerId']);
  errors.push(...requiredValidation.errors);

  const countryValidation = validateEnum(brand.country, ['US', 'ES'], 'country');
  errors.push(...countryValidation.errors);

  const statusValidation = validateEnum(brand.contractStatus, ['active', 'expiring', 'expired', 'renewed', 'lost'], 'contractStatus');
  errors.push(...statusValidation.errors);

  const dateValidation = validateISODate(brand.contractEndDate, 'contractEndDate');
  errors.push(...dateValidation.errors);

  if (!options?.allowExpiredContracts) {
    const now = new Date();
    if (new Date(brand.contractEndDate) < now) {
      errors.push('El contrato de la marca ha expirado.');
    }
  }

  if (brand.riskScore !== undefined) {
    const riskValidation = validateRange(brand.riskScore, 0, 100, 'riskScore');
    errors.push(...riskValidation.errors);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Valida un producto (Product)
 * @param product Producto a validar
 * @returns ValidationResult
 * @example
 * const result = validateProduct(product);
 */
export function validateProduct(product: Product): ValidationResult {
  const errors: string[] = [];

  const requiredValidation = validateRequired(product, ['id', 'brandId', 'sku', 'name', 'weightKg', 'unitPrice', 'currency']);
  errors.push(...requiredValidation.errors);

  const priceValidation = validatePositiveNumber(product.unitPrice, 'unitPrice');
  errors.push(...priceValidation.errors);

  const weightValidation = validatePositiveNumber(product.weightKg, 'weightKg');
  errors.push(...weightValidation.errors);

  const currencyValidation = validateEnum(product.currency, ['USD', 'EUR'], 'currency');
  errors.push(...currencyValidation.errors);

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Valida un item de inventario (InventoryItem)
 * @param item Item de inventario a validar
 * @param options Opciones de validación
 * @returns ValidationResult
 * @example
 * const result = validateInventoryItem(item);
 */
export function validateInventoryItem(
  item: InventoryItem,
  options?: { allowNegativeReserved?: boolean }
): ValidationResult {
  const errors: string[] = [];

  const requiredValidation = validateRequired(item, ['id', 'productId', 'warehouseId', 'quantityOnHand', 'quantityReserved', 'lastSyncedAt']);
  errors.push(...requiredValidation.errors);

  if (typeof item.quantityOnHand === 'number' && item.quantityOnHand < 0) {
    errors.push('El campo "quantityOnHand" no puede ser negativo.');
  }

  if (typeof item.quantityReserved === 'number') {
    if (item.quantityReserved < 0 && !options?.allowNegativeReserved) {
      errors.push('El campo "quantityReserved" no puede ser negativo.');
    }
    if (item.quantityReserved > item.quantityOnHand) {
      errors.push('La cantidad reservada no puede ser mayor que la cantidad disponible.');
    }
  }

  const dateValidation = validateISODate(item.lastSyncedAt, 'lastSyncedAt');
  errors.push(...dateValidation.errors);

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Valida consistencia de inventario (sin duplicados)
 * @param items Array de items de inventario
 * @returns ValidationResult
 * @example
 * const result = validateInventoryConsistency(inventory);
 */
export function validateInventoryConsistency(items: InventoryItem[]): ValidationResult {
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    const key = `${item.productId}#${item.warehouseId}`;
    if (seen.has(key)) {
      errors.push(`Duplicado encontrado: Producto "${item.productId}" en almacén "${item.warehouseId}".`);
    }
    seen.add(key);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Valida una orden (Order)
 * @param order Orden a validar
 * @returns ValidationResult
 * @example
 * const result = validateOrder(order);
 */
export function validateOrder(order: Order): ValidationResult {
  const errors: string[] = [];

  const requiredValidation = validateRequired(order, ['id', 'brandId', 'customerId', 'warehouseId', 'createdAt', 'receivedVia']);
  errors.push(...requiredValidation.errors);

  const linesValidation = validateArrayNotEmpty(order.lines, 'lines');
  errors.push(...linesValidation.errors);

  const dateValidation = validateDateInPast(order.createdAt, 'createdAt');
  errors.push(...dateValidation.errors);

  const receivedViaValidation = validateEnum(order.receivedVia, ['email', 'api', 'manual'], 'receivedVia');
  errors.push(...receivedViaValidation.errors);

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Valida una línea de orden (OrderLine)
 * @param line Línea de orden a validar
 * @returns ValidationResult
 * @example
 * const result = validateOrderLine(line);
 */
export function validateOrderLine(line: OrderLine): ValidationResult {
  const errors: string[] = [];

  const requiredValidation = validateRequired(line, ['id', 'orderId', 'productId', 'quantity']);
  errors.push(...requiredValidation.errors);

  const quantityValidation = validatePositiveNumber(line.quantity, 'quantity');
  errors.push(...quantityValidation.errors);

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Valida un envío (Shipment)
 * @param shipment Envío a validar
 * @returns ValidationResult
 * @example
 * const result = validateShipment(shipment);
 */
export function validateShipment(shipment: Shipment): ValidationResult {
  const errors: string[] = [];

  const requiredValidation = validateRequired(shipment, ['id', 'orderId', 'carrierId', 'trackingNumber', 'status', 'weightKg']);
  errors.push(...requiredValidation.errors);

  const statusValidation = validateEnum(
    shipment.status,
    ['pending', 'in_transit', 'delivered', 'failed_delivery', 'lost', 'returned'],
    'status'
  );
  errors.push(...statusValidation.errors);

  const weightValidation = validatePositiveNumber(shipment.weightKg, 'weightKg');
  errors.push(...weightValidation.errors);

  if (shipment.shippedAt) {
    const shippedValidation = validateDateInPast(shipment.shippedAt, 'shippedAt');
    errors.push(...shippedValidation.errors);
  }

  if (shipment.deliveredAt) {
    const deliveredValidation = validateDateInPast(shipment.deliveredAt, 'deliveredAt');
    errors.push(...deliveredValidation.errors);
  }

  if (shipment.shippedAt && shipment.deliveredAt) {
    const rangeValidation = validateDateRange(shipment.shippedAt, shipment.deliveredAt, 'shippedAt', 'deliveredAt');
    errors.push(...rangeValidation.errors);
  }

  if (shipment.status === 'delivered' && !shipment.deliveredAt) {
    errors.push('Un envío entregado debe tener fecha de entrega registrada.');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Valida transición de estado de envío
 * @param currentStatus Estado actual
 * @param newStatus Nuevo estado
 * @returns ValidationResult
 * @example
 * const result = validateShipmentTransition('in_transit', 'delivered');
 */
export function validateShipmentTransition(
  currentStatus: ShipmentStatus,
  newStatus: ShipmentStatus
): ValidationResult {
  const errors: string[] = [];

  const allowedTransitions: Record<ShipmentStatus, ShipmentStatus[]> = {
    pending: ['in_transit', 'failed_delivery'],
    in_transit: ['delivered', 'failed_delivery', 'lost'],
    delivered: [],
    failed_delivery: ['pending', 'in_transit'],
    lost: [],
    returned: []
  };

  if (!allowedTransitions[currentStatus].includes(newStatus)) {
    errors.push(`No es permitida la transición de "${currentStatus}" a "${newStatus}".`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Valida una solicitud de devolución (ReturnRequest)
 * @param returnRequest Devolución a validar
 * @returns ValidationResult
 * @example
 * const result = validateReturnRequest(returnRequest);
 */
export function validateReturnRequest(returnRequest: ReturnRequest): ValidationResult {
  const errors: string[] = [];

  const requiredValidation = validateRequired(returnRequest, ['id', 'orderId', 'customerId', 'productId', 'reason', 'status', 'createdAt']);
  errors.push(...requiredValidation.errors);

  const reasonValidation = validateMinLength(returnRequest.reason, 10, 'reason');
  errors.push(...reasonValidation.errors);

  const statusValidation = validateEnum(returnRequest.status, ['requested', 'approved', 'rejected', 'pickup_scheduled', 'received', 'inspected'], 'status');
  errors.push(...statusValidation.errors);

  if (returnRequest.condition) {
    const conditionValidation = validateEnum(returnRequest.condition, ['new', 'good', 'damaged', 'unsellable'], 'condition');
    errors.push(...conditionValidation.errors);
  }

  if (returnRequest.disposition) {
    const dispositionValidation = validateEnum(returnRequest.disposition, ['restock', 'refurbish', 'dispose'], 'disposition');
    errors.push(...dispositionValidation.errors);
  }

  if (returnRequest.pickupType) {
    const pickupValidation = validateEnum(returnRequest.pickupType, ['home_pickup', 'dropoff_point'], 'pickupType');
    errors.push(...pickupValidation.errors);
  }

  const dateValidation = validateDateInPast(returnRequest.createdAt, 'createdAt');
  errors.push(...dateValidation.errors);

  if (returnRequest.status === 'inspected' && (!returnRequest.condition || !returnRequest.disposition)) {
    errors.push('Una devolución inspeccionada debe tener condición y disposición registradas.');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Valida transición de estado de devolución
 * @param currentStatus Estado actual
 * @param newStatus Nuevo estado
 * @returns ValidationResult
 * @example
 * const result = validateReturnStatusTransition('approved', 'pickup_scheduled');
 */
export function validateReturnStatusTransition(
  currentStatus: ReturnStatus,
  newStatus: ReturnStatus
): ValidationResult {
  const errors: string[] = [];

  const allowedTransitions: Record<ReturnStatus, ReturnStatus[]> = {
    requested: ['approved', 'rejected'],
    approved: ['pickup_scheduled'],
    rejected: [],
    pickup_scheduled: ['received'],
    received: ['inspected'],
    inspected: []
  };

  if (!allowedTransitions[currentStatus].includes(newStatus)) {
    errors.push(`No es permitida la transición de devolución de "${currentStatus}" a "${newStatus}".`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Valida un cliente (Customer)
 * @param customer Cliente a validar
 * @returns ValidationResult
 * @example
 * const result = validateCustomer(customer);
 */
export function validateCustomer(customer: Customer): ValidationResult {
  const errors: string[] = [];

  const requiredValidation = validateRequired(customer, ['id', 'fullName', 'email', 'preferredChannel', 'preferredLanguage']);
  errors.push(...requiredValidation.errors);

  const emailValidation = validateEmail(customer.email);
  errors.push(...emailValidation.errors);

  const nameValidation = validateMinLength(customer.fullName, 2, 'fullName');
  errors.push(...nameValidation.errors);

  const channelValidation = validateEnum(customer.preferredChannel, ['email', 'whatsapp', 'phone'], 'preferredChannel');
  errors.push(...channelValidation.errors);

  const languageValidation = validateEnum(customer.preferredLanguage, ['es', 'en'], 'preferredLanguage');
  errors.push(...languageValidation.errors);

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Valida un ticket de soporte (SupportTicket)
 * @param ticket Ticket a validar
 * @returns ValidationResult
 * @example
 * const result = validateSupportTicket(ticket);
 */
export function validateSupportTicket(ticket: SupportTicket): ValidationResult {
  const errors: string[] = [];

  const requiredValidation = validateRequired(ticket, ['id', 'customerId', 'channel', 'language', 'status', 'resolvedBy', 'createdAt']);
  errors.push(...requiredValidation.errors);

  const hasRelation = ticket.brandId || ticket.orderId || ticket.shipmentId || ticket.returnRequestId;
  if (!hasRelation) {
    errors.push('El ticket debe estar relacionado con al menos una entidad (marca, orden, envío o devolución).');
  }

  const channelValidation = validateEnum(ticket.channel, ['email', 'whatsapp', 'phone'], 'channel');
  errors.push(...channelValidation.errors);

  const languageValidation = validateEnum(ticket.language, ['es', 'en'], 'language');
  errors.push(...languageValidation.errors);

  const statusValidation = validateEnum(ticket.status, ['open', 'resolved_by_agent', 'escalated', 'closed'], 'status');
  errors.push(...statusValidation.errors);

  const resolvedByValidation = validateEnum(ticket.resolvedBy, ['agent', 'human'], 'resolvedBy');
  errors.push(...resolvedByValidation.errors);

  const dateValidation = validateDateInPast(ticket.createdAt, 'createdAt');
  errors.push(...dateValidation.errors);

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Valida un transportista (Carrier)
 * @param carrier Transportista a validar
 * @returns ValidationResult
 * @example
 * const result = validateCarrier(carrier);
 */
export function validateCarrier(carrier: Carrier): ValidationResult {
  const errors: string[] = [];

  const requiredValidation = validateRequired(carrier, ['id', 'name', 'countries']);
  errors.push(...requiredValidation.errors);

  const countriesValidation = validateArrayNotEmpty(carrier.countries, 'countries');
  errors.push(...countriesValidation.errors);

  for (const country of carrier.countries) {
    const countryValidation = validateEnum(country, ['US', 'ES'], `countries[${carrier.countries.indexOf(country)}]`);
    errors.push(...countryValidation.errors);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// ============================================
// VALIDACIONES CRUZADAS
// ============================================

/**
 * Valida que un envío pertenezca a una orden
 * @param shipment Envío a validar
 * @param order Orden de referencia
 * @returns ValidationResult
 * @example
 * const result = validateShipmentForOrder(shipment, order);
 */
export function validateShipmentForOrder(
  shipment: Shipment,
  order: Order
): ValidationResult {
  const errors: string[] = [];

  if (shipment.orderId !== order.id) {
    errors.push(`El envío no pertenece a la orden ${order.id}.`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Valida que una devolución pertenezca a una orden
 * @param returnRequest Devolución a validar
 * @param order Orden de referencia
 * @returns ValidationResult
 * @example
 * const result = validateReturnForOrder(returnRequest, order);
 */
export function validateReturnForOrder(
  returnRequest: ReturnRequest,
  order: Order
): ValidationResult {
  const errors: string[] = [];

  if (returnRequest.orderId !== order.id) {
    errors.push(`La devolución no pertenece a la orden ${order.id}.`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Valida que un item de inventario corresponda a un producto
 * @param item Item de inventario a validar
 * @param product Producto de referencia
 * @returns ValidationResult
 * @example
 * const result = validateInventoryForProduct(item, product);
 */
export function validateInventoryForProduct(
  item: InventoryItem,
  product: Product
): ValidationResult {
  const errors: string[] = [];

  if (item.productId !== product.id) {
    errors.push(`El item de inventario no corresponde al producto ${product.id}.`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// ============================================
// VALIDACIONES HEREDADAS (COMPATIBILIDAD)
// ============================================

export function isValidEmail(email: string): boolean {
  return validateEmail(email).valid;
}

export function isNotEmpty(value: string): boolean {
  return value.trim().length > 0;
}

export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

export function hasMinLength(value: string, min: number): boolean {
  return value.length >= min;
}
