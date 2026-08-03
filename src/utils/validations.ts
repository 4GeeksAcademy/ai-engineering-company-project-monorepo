import {
  ClientApplication,
  Current3plStatus,
  DeliveryOrder,
  DeliveryStatus,
  InventoryRecord,
  OperatingCountry,
  ProductType,
  ServiceType,
  ShippingVolumeRange
} from '../types/models';

export interface ValidationIssue {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
}

const VALID_OPERATING_COUNTRIES: OperatingCountry[] = ['mexico', 'spain', 'both', 'other'];
const VALID_PRODUCT_TYPES: ProductType[] = ['fashion', 'electronics', 'cosmetics', 'food', 'other'];
const VALID_SHIPPING_VOLUMES: ShippingVolumeRange[] = ['0-100', '101-500', '501-2000', '2000+', 'not-sure'];
const VALID_SERVICES: ServiceType[] = [
  'warehousing',
  'inventory-management',
  'order-fulfillment',
  'last-mile-delivery',
  'reverse-logistics'
];
const VALID_3PL_STATUSES: Current3plStatus[] = ['yes', 'no', 'evaluating'];
const VALID_DELIVERY_STATUSES: DeliveryStatus[] = ['pending', 'in-transit', 'delivered', 'cancelled'];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_REGEX = /^\+\d{1,3}\s[\d\s()-]{6,20}$/;

function isNonEmptyString(value: string): boolean {
  return value.trim().length > 0;
}

function isValidDateString(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}

function isHttpUrl(value: string): boolean {
  if (value.trim() === '') {
    return true;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (_error) {
    return false;
  }
}

function toResult(issues: ValidationIssue[]): ValidationResult {
  return {
    isValid: issues.length === 0,
    issues
  };
}

export function validateClientApplication(application: ClientApplication): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (application.companyName.trim().length < 2) {
    issues.push({ field: 'companyName', message: 'Company name must be at least 2 characters long.' });
  }

  const contactParts = application.contactPerson.trim().split(/\s+/).filter(Boolean);
  if (contactParts.length < 2) {
    issues.push({ field: 'contactPerson', message: 'Contact person must include first and last name.' });
  }

  if (!EMAIL_REGEX.test(application.corporateEmail.trim())) {
    issues.push({ field: 'corporateEmail', message: 'Corporate email format is invalid.' });
  }

  if (!PHONE_REGEX.test(application.phone.trim())) {
    issues.push({ field: 'phone', message: 'Phone format must be +[country code] [number].' });
  }

  if (!isHttpUrl(application.companyWebsite)) {
    issues.push({ field: 'companyWebsite', message: 'Website must start with http:// or https://.' });
  }

  if (!VALID_OPERATING_COUNTRIES.includes(application.operatingCountry)) {
    issues.push({ field: 'operatingCountry', message: 'Operating country is not allowed.' });
  }

  if (!VALID_PRODUCT_TYPES.includes(application.productType)) {
    issues.push({ field: 'productType', message: 'Product type is not allowed.' });
  }

  if (!VALID_SHIPPING_VOLUMES.includes(application.shippingVolume)) {
    issues.push({ field: 'shippingVolume', message: 'Shipping volume is not allowed.' });
  }

  if (application.services.length === 0) {
    issues.push({ field: 'services', message: 'At least one service must be selected.' });
  }

  if (!application.services.every((service: ServiceType) => VALID_SERVICES.includes(service))) {
    issues.push({ field: 'services', message: 'One or more services are not allowed.' });
  }

  if (!VALID_3PL_STATUSES.includes(application.current3pl)) {
    issues.push({ field: 'current3pl', message: '3PL status is not allowed.' });
  }

  if (application.comments.length > 500) {
    issues.push({ field: 'comments', message: 'Comments must be 500 characters or fewer.' });
  }

  if (!application.privacyAccepted) {
    issues.push({ field: 'privacyAccepted', message: 'Privacy policy must be accepted.' });
  }

  if (!isValidDateString(application.createdAt)) {
    issues.push({ field: 'createdAt', message: 'Created date is invalid.' });
  }

  return toResult(issues);
}

export function validateInventoryRecord(record: InventoryRecord): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!isNonEmptyString(record.id)) {
    issues.push({ field: 'id', message: 'Record id is required.' });
  }

  if (!isNonEmptyString(record.warehouseCity)) {
    issues.push({ field: 'warehouseCity', message: 'Warehouse city is required.' });
  }

  if (record.sku.trim().length < 3) {
    issues.push({ field: 'sku', message: 'SKU must be at least 3 characters long.' });
  }

  if (!VALID_PRODUCT_TYPES.includes(record.productType)) {
    issues.push({ field: 'productType', message: 'Product type is not allowed.' });
  }

  if (!Number.isInteger(record.unitsInStock) || record.unitsInStock < 0) {
    issues.push({ field: 'unitsInStock', message: 'Units in stock must be a non-negative integer.' });
  }

  if (!Number.isInteger(record.reorderPoint) || record.reorderPoint < 0) {
    issues.push({ field: 'reorderPoint', message: 'Reorder point must be a non-negative integer.' });
  }

  if (record.unitValueUsd < 0) {
    issues.push({ field: 'unitValueUsd', message: 'Unit value must be non-negative.' });
  }

  if (!isValidDateString(record.updatedAt)) {
    issues.push({ field: 'updatedAt', message: 'Updated date is invalid.' });
  }

  return toResult(issues);
}

export function validateDeliveryOrder(order: DeliveryOrder): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!isNonEmptyString(order.id)) {
    issues.push({ field: 'id', message: 'Order id is required.' });
  }

  if (!isNonEmptyString(order.companyName)) {
    issues.push({ field: 'companyName', message: 'Company name is required.' });
  }

  if (!VALID_SERVICES.includes(order.service)) {
    issues.push({ field: 'service', message: 'Service is not allowed.' });
  }

  if (!isNonEmptyString(order.destinationCity)) {
    issues.push({ field: 'destinationCity', message: 'Destination city is required.' });
  }

  if (!VALID_DELIVERY_STATUSES.includes(order.status)) {
    issues.push({ field: 'status', message: 'Delivery status is not allowed.' });
  }

  if (!isValidDateString(order.dispatchDate)) {
    issues.push({ field: 'dispatchDate', message: 'Dispatch date is invalid.' });
  }

  if (order.deliveryDate !== null && !isValidDateString(order.deliveryDate)) {
    issues.push({ field: 'deliveryDate', message: 'Delivery date is invalid.' });
  }

  if (order.deliveryDate !== null && isValidDateString(order.dispatchDate)) {
    const dispatchMs = Date.parse(order.dispatchDate);
    const deliveryMs = Date.parse(order.deliveryDate);

    if (deliveryMs < dispatchMs) {
      issues.push({ field: 'deliveryDate', message: 'Delivery date cannot be earlier than dispatch date.' });
    }
  }

  if (order.status === 'delivered' && order.deliveryDate === null) {
    issues.push({ field: 'deliveryDate', message: 'Delivered orders require a delivery date.' });
  }

  if (!Number.isInteger(order.packageCount) || order.packageCount <= 0) {
    issues.push({ field: 'packageCount', message: 'Package count must be a positive integer.' });
  }

  if (order.distanceKm <= 0 || order.distanceKm > 5000) {
    issues.push({ field: 'distanceKm', message: 'Distance must be greater than 0 and less than or equal to 5000 km.' });
  }

  if (order.shippingCostUsd < 0) {
    issues.push({ field: 'shippingCostUsd', message: 'Shipping cost must be non-negative.' });
  }

  return toResult(issues);
}