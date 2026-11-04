export type OrderStatus = 'Pending' | 'Baking' | 'Decorating' | 'Delivered';

export type FulfillmentType = 'Pickup' | 'Delivery';

export type ReminderTiming = 'on_time' | '15_min' | '1_hour' | '2_hours' | '1_day';

export interface OrderExpense {
  id: string;
  orderId?: string; // Linked order ID (optional for general bakery expenses, populated when linked to an order)
  amount: number; // Amount paid
  notes: string; // Description/purpose (e.g., 'Specialty fondant', 'Edible flowers')
  date: string; // When expense was paid (ISO string)
  createdAt?: string; // ISO string creation timestamp
}

export interface CakeOrder {
  id: string;
  customerName: string;
  customerPhone?: string; // Client phone number for WhatsApp reminders & updates
  deliveryDate: string; // ISO String
  cakeType: string;
  shape: string;
  flavor: string;
  addons?: string[]; // Multiselection for custom addons (completion tracked in requirements)
  customRequirements: string;
  status: OrderStatus;
  quotedPrice: number;
  downPayment?: number; // Down payment paid in advance
  remainingPayment?: number; // Calculated: quotedPrice - downPayment
  expenses?: OrderExpense[]; // Expenses incurred for this order
  fulfillmentType?: FulfillmentType; // 'Pickup' | 'Delivery'
  location?: string; // Delivery address or Pickup location notes
  reminderEnabled?: boolean; // In-app reminder active
  reminderTiming?: ReminderTiming; // Legacy single reminder timing
  reminderTimings?: ReminderTiming[]; // Multiple reminder notifications (e.g., ['15_min', '1_hour', '1_day'])
  customReminderDates?: string[]; // Specific custom reminder date & times chosen by user (ISO strings)
  notificationTimestamps?: string[]; // Calculated trigger timestamps (ISO strings) based on deliveryDate - offset or custom alerts
  referenceImages: string[]; // Base64 or local file URIs
  createdAt: string;
}

export type RequirementCategory = 'Ingredients' | 'Packaging' | 'Tools' | 'Add-ons';

export interface GeneralRequirement {
  id: string;
  reqId?: string; // Explicit reqId property stored in document
  title: string;
  category: RequirementCategory;
  isCompleted: boolean;
  orderId?: string; // Optional link to specific cake commission
  expenseAmount?: number; // Cost recorded when requirement is completed
  expenseDate?: string; // ISO string when the expense occurred
  createdAt: string;
}
