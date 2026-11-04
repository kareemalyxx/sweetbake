export type OrderStatus = 'Pending' | 'Baking' | 'Decorating' | 'Delivered';

export type FulfillmentType = 'Pickup' | 'Delivery';

export type ReminderTiming = 'on_time' | '15_min' | '1_hour' | '2_hours' | '1_day';

export interface CakeOrder {
  id: string;
  customerName: string;
  deliveryDate: string; // ISO String
  cakeType: string;
  shape: string;
  flavor: string;
  addons?: Record<string, boolean>; // Map of custom addons to completed status (e.g. { "Topper": false, "Flowers": true })
  customRequirements: string;
  status: OrderStatus;
  quotedPrice: number;
  downPayment?: number; // Down payment paid in advance
  remainingPayment?: number; // Calculated: quotedPrice - downPayment
  fulfillmentType?: FulfillmentType; // 'Pickup' | 'Delivery'
  location?: string; // Delivery address or Pickup location notes
  reminderEnabled?: boolean; // In-app reminder active
  reminderTiming?: ReminderTiming; // When to be notified
  referenceImages: string[]; // Base64 or local file URIs
  createdAt: string;
}

export type RequirementCategory = 'Ingredients' | 'Packaging' | 'Tools' | 'Add-ons';

export interface GeneralRequirement {
  id: string;
  title: string;
  category: RequirementCategory;
  isCompleted: boolean;
  orderId?: string; // Optional link to specific cake commission
  createdAt: string;
}
