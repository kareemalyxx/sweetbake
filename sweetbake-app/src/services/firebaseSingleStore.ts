/**
 * SWEETBAKE STUDIO - SINGLE RESTAURANT FIREBASE STRUCTURE
 * 
 * For a single bakery kitchen:
 * - Direct root collections: `orders/`, `requirements/`, and `reminders/`
 * - No multi-tenant complexity or authentication hurdles.
 * - Each addon from an order is saved as a discrete independent requirement document.
 */

export interface FirebaseSingleStoreRequirement {
  id: string;
  title: string;
  category: 'Add-ons' | 'Ingredients' | 'Packaging' | 'Tools';
  isCompleted: boolean;
  orderId?: string;
  addonName?: string;
  clientName?: string;
  createdAt: string;
}

export const FirebaseSingleStoreService = {
  /**
   * Helper that takes an order with addons and generates
   * separate discrete checklist documents for Firestore
   */
  generateSeparateAddonRequirements(
    orderId: string,
    customerName: string,
    addons: string[]
  ): FirebaseSingleStoreRequirement[] {
    return addons.map((addon) => ({
      id: `addon-req-${orderId}-${addon.replace(/\s+/g, '-').toLowerCase()}`,
      title: `${addon} (${customerName})`,
      category: 'Add-ons',
      isCompleted: false,
      orderId,
      addonName: addon,
      clientName: customerName,
      createdAt: new Date().toISOString(),
    }));
  },
};
