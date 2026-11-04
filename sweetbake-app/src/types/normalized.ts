// ==========================================
// SWEETBAKE STUDIO - NORMALIZED 3NF SCHEMA
// ==========================================

export type OrderStatus = 'Pending' | 'Baking' | 'Decorating' | 'Delivered';
export type FulfillmentType = 'Pickup' | 'Delivery';
export type ReminderTiming = 'on_time' | '15_min' | '1_hour' | '2_hours' | '1_day';
export type RequirementCategory = 'Ingredients' | 'Packaging' | 'Tools' | 'Add-ons';

/**
 * 1. Customer Entity (3NF - eliminates customer data redundancy)
 */
export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  defaultLocation?: string;
  createdAt: string;
}

/**
 * 2. Catalog Lookup Entities (Eliminates repeated hardcoded strings)
 */
export interface CatalogItem {
  id: string;
  name: string;
  isActive: boolean;
}

export interface AddonItem extends CatalogItem {
  defaultPrice?: number;
}

/**
 * 3. Fulfillment Details (Atomic location and delivery specifications)
 */
export interface FulfillmentDetails {
  method: FulfillmentType;
  location?: string;
  scheduledTime: string; // ISO date-time
}

/**
 * 4. Financial Record (Separates transaction state from cake physical specifications)
 */
export interface OrderFinancials {
  quotedTotal: number;
  downPayment: number;
  // remainingBalance is always computed: Math.max(0, quotedTotal - downPayment)
}

/**
 * 5. Order Add-on Association (Junction table modeling 1:N / M:N add-on commissions)
 */
export interface OrderAddonItem {
  addonId: string;
  name: string; // Snapshot at time of order
  priceAtOrder?: number;
}

/**
 * 6. Order Entity (Core aggregate root in 3NF)
 */
export interface NormalizedOrder {
  id: string;
  customerId: string;
  customerSummary: {
    name: string;
    phone?: string;
  };
  fulfillment: FulfillmentDetails;
  specifications: {
    cakeTypeId: string;
    cakeTypeName: string;
    shapeId: string;
    shapeName: string;
    flavorId: string;
    flavorName: string;
    customRequirements: string;
  };
  addons: OrderAddonItem[];
  financials: OrderFinancials;
  status: OrderStatus;
  referenceImages: string[];
  reminder?: {
    enabled: boolean;
    timing: ReminderTiming;
  };
  createdAt: string;
}

/**
 * 7. In-App Notification Entity (Normalized reminder queue)
 */
export interface NormalizedReminder {
  id: string;
  orderId: string;
  customerId: string;
  customerName: string;
  triggerTime: string; // ISO timestamp
  fulfillmentMethod: FulfillmentType;
  location?: string;
  message: string;
  timingLabel: string;
  isRead: boolean;
  createdAt: string;
}

/**
 * Helper to compute remaining balance dynamically (ensures 3NF compliance)
 */
export const computeRemainingBalance = (financials: OrderFinancials): number => {
  return Math.max(0, (financials.quotedTotal || 0) - (financials.downPayment || 0));
};
