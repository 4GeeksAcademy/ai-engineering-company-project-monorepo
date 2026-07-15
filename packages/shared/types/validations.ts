import {
  Branch,
  BranchMenuAvailability,
  Customer,
  MenuItem,
  Order,
  PrepTimeByCategory,
  Promotion,
  RegionalCompliance,
  Reservation,
  ReservationStatus,
} from "./entities";

export interface ValidationResult {
  is_valid: boolean;
  errors: string[];
}

function createValidationResult(errors: string[]): ValidationResult {
  return {
    is_valid: errors.length === 0,
    errors,
  };
}

function isValidDateString(value: string): boolean {
  const timestamp: number = Date.parse(value);
  return Number.isFinite(timestamp);
}

export function validateBranch(branch: Branch): ValidationResult {
  const errors: string[] = [];

  if (branch.branch_id.trim().length === 0) errors.push("branch_id is required.");
  if (branch.name.trim().length === 0) errors.push("name is required.");
  if (branch.city.trim().length === 0) errors.push("city is required.");
  if (branch.timezone.trim().length === 0) errors.push("timezone is required.");
  if (branch.opening_hours.trim().length === 0) errors.push("opening_hours is required.");

  return createValidationResult(errors);
}

export function validateMenuItem(menuItem: MenuItem): ValidationResult {
  const errors: string[] = [];

  if (menuItem.item_id.trim().length === 0) errors.push("item_id is required.");
  if (menuItem.name.trim().length === 0) errors.push("name is required.");
  if (menuItem.category.trim().length === 0) errors.push("category is required.");
  if (menuItem.price < 0) errors.push("price must be greater than or equal to 0.");

  return createValidationResult(errors);
}

export function validateOrder(
  order: Order,
  existingBranchIds: Set<string>,
  existingCustomerIds: Set<string>,
): ValidationResult {
  const errors: string[] = [];

  if (order.order_id.trim().length === 0) errors.push("order_id is required.");
  if (!isValidDateString(order.created_at)) errors.push("created_at must be a valid ISO date.");
  if (order.total_amount < 0) errors.push("total_amount must be greater than or equal to 0.");

  if (!existingBranchIds.has(order.branch_id)) {
    errors.push("branch_id does not exist.");
  }
  if (!existingCustomerIds.has(order.customer_id)) {
    errors.push("customer_id does not exist.");
  }

  return createValidationResult(errors);
}

export function validateCustomer(customer: Customer): ValidationResult {
  const errors: string[] = [];

  if (customer.customer_id.trim().length === 0) errors.push("customer_id is required.");
  if (customer.name.trim().length === 0) errors.push("name is required.");
  if (customer.contact.trim().length === 0) errors.push("contact is required.");
  if (customer.city.trim().length === 0) errors.push("city is required.");
  if (customer.loyalty_tier.trim().length === 0) errors.push("loyalty_tier is required.");

  return createValidationResult(errors);
}

export function validateReservation(
  reservation: Reservation,
  existingBranchIds: Set<string>,
  existingCustomerIds: Set<string>,
): ValidationResult {
  const errors: string[] = [];

  if (reservation.reservation_id.trim().length === 0) {
    errors.push("reservation_id is required.");
  }
  if (!isValidDateString(reservation.datetime)) {
    errors.push("datetime must be a valid ISO date.");
  }
  if (reservation.party_size <= 0) {
    errors.push("party_size must be greater than 0.");
  }

  if (!existingBranchIds.has(reservation.branch_id)) {
    errors.push("branch_id does not exist.");
  }
  if (!existingCustomerIds.has(reservation.customer_id)) {
    errors.push("customer_id does not exist.");
  }

  return createValidationResult(errors);
}

export function validateBranchMenuAvailability(
  relation: BranchMenuAvailability,
  existingBranchIds: Set<string>,
  existingMenuItemIds: Set<string>,
): ValidationResult {
  const errors: string[] = [];

  if (!existingBranchIds.has(relation.branch_id)) {
    errors.push("branch_id does not exist.");
  }
  if (!existingMenuItemIds.has(relation.item_id)) {
    errors.push("item_id does not exist.");
  }

  return createValidationResult(errors);
}

export function validatePrepTimeByCategory(prepTime: PrepTimeByCategory): ValidationResult {
  const errors: string[] = [];

  if (prepTime.category.trim().length === 0) {
    errors.push("category is required.");
  }
  if (prepTime.prep_time_minutes <= 0) {
    errors.push("prep_time_minutes must be greater than 0.");
  }

  return createValidationResult(errors);
}

export function validatePromotion(promotion: Promotion): ValidationResult {
  const errors: string[] = [];

  if (promotion.promotion_id.trim().length === 0) errors.push("promotion_id is required.");
  if (promotion.name.trim().length === 0) errors.push("name is required.");

  if (!isValidDateString(promotion.starts_at)) {
    errors.push("starts_at must be a valid ISO date.");
  }
  if (!isValidDateString(promotion.ends_at)) {
    errors.push("ends_at must be a valid ISO date.");
  }

  if (isValidDateString(promotion.starts_at) && isValidDateString(promotion.ends_at)) {
    if (Date.parse(promotion.starts_at) > Date.parse(promotion.ends_at)) {
      errors.push("starts_at must be less than or equal to ends_at.");
    }
  }

  return createValidationResult(errors);
}

export function validateRegionalCompliance(compliance: RegionalCompliance): ValidationResult {
  const errors: string[] = [];

  if (compliance.tax_profile.trim().length === 0) errors.push("tax_profile is required.");
  if (compliance.labor_rule_profile.trim().length === 0) {
    errors.push("labor_rule_profile is required.");
  }
  if (compliance.labeling_profile.trim().length === 0) {
    errors.push("labeling_profile is required.");
  }

  return createValidationResult(errors);
}

export function isReservationStatusFinal(status: ReservationStatus): boolean {
  return status === "cancelled" || status === "completed";
}
