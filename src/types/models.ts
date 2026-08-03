export type OperatingCountry = 'mexico' | 'spain' | 'both' | 'other';

export type ProductType = 'fashion' | 'electronics' | 'cosmetics' | 'food' | 'other';

export type ShippingVolumeRange = '0-100' | '101-500' | '501-2000' | '2000+' | 'not-sure';

export type ServiceType =
  | 'warehousing'
  | 'inventory-management'
  | 'order-fulfillment'
  | 'last-mile-delivery'
  | 'reverse-logistics';

export type Current3plStatus = 'yes' | 'no' | 'evaluating';

export type DeliveryStatus = 'pending' | 'in-transit' | 'delivered' | 'cancelled';

export interface ClientApplication {
  id: string;
  companyName: string;
  contactPerson: string;
  corporateEmail: string;
  phone: string;
  companyWebsite: string;
  operatingCountry: OperatingCountry;
  productType: ProductType;
  shippingVolume: ShippingVolumeRange;
  services: ServiceType[];
  current3pl: Current3plStatus;
  comments: string;
  privacyAccepted: boolean;
  createdAt: string;
}

export interface InventoryRecord {
  id: string;
  warehouseCity: string;
  sku: string;
  productType: ProductType;
  unitsInStock: number;
  reorderPoint: number;
  unitValueUsd: number;
  updatedAt: string;
}

export interface DeliveryOrder {
  id: string;
  companyName: string;
  service: ServiceType;
  destinationCity: string;
  status: DeliveryStatus;
  dispatchDate: string;
  deliveryDate: string | null;
  packageCount: number;
  distanceKm: number;
  shippingCostUsd: number;
}

export const sampleClientApplication: ClientApplication = {
  id: 'app-001',
  companyName: 'NorthPoint Commerce',
  contactPerson: 'Elena Ruiz',
  corporateEmail: 'elena@northpoint.example',
  phone: '+34 612345678',
  companyWebsite: 'https://northpoint.example',
  operatingCountry: 'spain',
  productType: 'electronics',
  shippingVolume: '101-500',
  services: ['warehousing', 'order-fulfillment', 'last-mile-delivery'],
  current3pl: 'evaluating',
  comments: 'Need omnichannel fulfillment for seasonal peaks.',
  privacyAccepted: true,
  createdAt: '2026-08-01T09:30:00.000Z'
};

export const sampleInventoryRecord: InventoryRecord = {
  id: 'inv-001',
  warehouseCity: 'Madrid',
  sku: 'ELEC-HEADSET-100',
  productType: 'electronics',
  unitsInStock: 580,
  reorderPoint: 120,
  unitValueUsd: 42.5,
  updatedAt: '2026-08-02T15:00:00.000Z'
};

export const sampleDeliveryOrder: DeliveryOrder = {
  id: 'ord-001',
  companyName: 'NorthPoint Commerce',
  service: 'last-mile-delivery',
  destinationCity: 'Valencia',
  status: 'in-transit',
  dispatchDate: '2026-08-03T08:15:00.000Z',
  deliveryDate: null,
  packageCount: 38,
  distanceKm: 356,
  shippingCostUsd: 915.4
};