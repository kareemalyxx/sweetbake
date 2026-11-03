export type OrderStatus = 'Pending' | 'Baking' | 'Decorating' | 'Delivered';

export interface CakeOrder {
  id: string;
  customerName: string;
  deliveryDate: string; // ISO String
  cakeType: string;
  shape: string;
  flavor: string;
  customRequirements: string;
  status: OrderStatus;
  quotedPrice: number;
  referenceImages: string[]; // Base64 or local file URIs
  createdAt: string;
}

export type RequirementCategory = 'Ingredients' | 'Packaging' | 'Tools';

export interface GeneralRequirement {
  id: string;
  title: string;
  category: RequirementCategory;
  isCompleted: boolean;
  createdAt: string;
}

