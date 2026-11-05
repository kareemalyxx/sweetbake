import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Customer,
  NormalizedOrder,
  NormalizedReminder,
  computeRemainingBalance,
} from '../types/normalized';
import { CakeOrder, ReminderTiming } from '../types';

const KEYS = {
  CUSTOMERS: '@sweetbake_customers_v2',
  ORDERS: '@sweetbake_orders_v2',
  REMINDERS: '@sweetbake_reminders_v2',
  MIGRATION_DONE: '@sweetbake_v2_migrated',
};

export const NormalizedStorage = {
  // 1. Customers API
  async getCustomers(): Promise<Customer[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.CUSTOMERS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async saveCustomer(customer: Customer): Promise<void> {
    const all = await this.getCustomers();
    const index = all.findIndex((c) => c.id === customer.id);
    let updated: Customer[];
    if (index >= 0) {
      updated = all.map((c) => (c.id === customer.id ? customer : c));
    } else {
      updated = [customer, ...all];
    }
    await AsyncStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(updated));
  },

  async getOrCreateCustomer(name: string, location?: string): Promise<Customer> {
    const trimmed = name.trim();
    const all = await this.getCustomers();
    const existing = all.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      return existing;
    }
    const newCustomer: Customer = {
      id: `cust-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: trimmed,
      defaultLocation: location,
      createdAt: new Date().toISOString(),
    };
    await this.saveCustomer(newCustomer);
    return newCustomer;
  },

  // 2. Normalized Orders API
  async getOrders(): Promise<NormalizedOrder[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.ORDERS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async saveOrders(orders: NormalizedOrder[]): Promise<void> {
    await AsyncStorage.setItem(KEYS.ORDERS, JSON.stringify(orders));
  },

  async saveOrder(order: NormalizedOrder): Promise<void> {
    const all = await this.getOrders();
    const index = all.findIndex((o) => o.id === order.id);
    let updated: NormalizedOrder[];
    if (index >= 0) {
      updated = all.map((o) => (o.id === order.id ? order : o));
    } else {
      updated = [order, ...all];
    }
    await this.saveOrders(updated);
  },

  async deleteOrder(orderId: string): Promise<void> {
    const all = await this.getOrders();
    const updated = all.filter((o) => o.id !== orderId);
    await this.saveOrders(updated);
  },

  // 3. Adapter: Convert Legacy flat CakeOrder to NormalizedOrder
  fromLegacyOrder(legacy: CakeOrder, customerId: string): NormalizedOrder {
    const quoted = legacy.quotedPrice || 0;
    const down = legacy.downPayment || 0;

    return {
      id: legacy.id,
      customerId,
      customerSummary: {
        name: legacy.customerName,
      },
      fulfillment: {
        method: legacy.fulfillmentType || 'Pickup',
        location: legacy.location,
        scheduledTime: legacy.deliveryDate,
      },
      specifications: {
        cakeTypeId: legacy.cakeType,
        cakeTypeName: legacy.cakeType,
        shapeId: legacy.shape,
        shapeName: legacy.shape,
        flavorId: Array.isArray(legacy.flavor) ? legacy.flavor.join(', ') : (legacy.flavor || ''),
        flavorName: Array.isArray(legacy.flavor) ? legacy.flavor.join(', ') : (legacy.flavor || ''),
        customRequirements: legacy.customRequirements || '',
      },
      addons: Array.isArray(legacy.addons)
        ? legacy.addons.map((addonName: string) => ({
            addonId: addonName,
            name: addonName,
          }))
        : legacy.addons
        ? Object.keys(legacy.addons).map((addonName: string) => ({
            addonId: addonName,
            name: addonName,
          }))
        : [],
      financials: {
        quotedTotal: quoted,
        downPayment: down,
      },
      status: legacy.status,
      referenceImages: legacy.referenceImages || [],
      reminder: legacy.reminderEnabled
        ? {
            enabled: true,
            timing: ((legacy.reminders && Object.keys(legacy.reminders)[0]) as ReminderTiming) || '1_hour',
          }
        : undefined,
      createdAt: legacy.createdAt || new Date().toISOString(),
    };
  },

  // 4. Adapter: Convert NormalizedOrder to Flat CakeOrder for UI compatibility
  toLegacyOrder(norm: NormalizedOrder): CakeOrder {
    return {
      id: norm.id,
      customerName: norm.customerSummary.name,
      deliveryDate: norm.fulfillment.scheduledTime,
      cakeType: norm.specifications.cakeTypeName,
      shape: norm.specifications.shapeName,
      flavor: norm.specifications.flavorName,
      addons: norm.addons.map((a) => a.name),
      customRequirements: norm.specifications.customRequirements,
      status: norm.status,
      quotedPrice: norm.financials.quotedTotal,
      downPayment: norm.financials.downPayment,
      remainingPayment: computeRemainingBalance(norm.financials),
      fulfillmentType: norm.fulfillment.method,
      location: norm.fulfillment.location,
      reminderEnabled: norm.reminder?.enabled ?? false,
      reminders: norm.reminder?.enabled
        ? {
            [norm.reminder.timing]: norm.fulfillment.scheduledTime,
          }
        : undefined,
      referenceImages: norm.referenceImages,
      createdAt: norm.createdAt,
    };
  },

  // 5. Automatic Transparent Migration from v1 to Normalized v2
  async migrateIfNeeded(legacyOrders: CakeOrder[]): Promise<NormalizedOrder[]> {
    const isMigrated = await AsyncStorage.getItem(KEYS.MIGRATION_DONE);
    if (isMigrated === 'true') {
      return await this.getOrders();
    }

    if (!legacyOrders || legacyOrders.length === 0) {
      await AsyncStorage.setItem(KEYS.MIGRATION_DONE, 'true');
      return [];
    }

    const normalizedList: NormalizedOrder[] = [];
    for (const leg of legacyOrders) {
      const customer = await this.getOrCreateCustomer(leg.customerName, leg.location);
      const norm = this.fromLegacyOrder(leg, customer.id);
      normalizedList.push(norm);
    }

    await this.saveOrders(normalizedList);
    await AsyncStorage.setItem(KEYS.MIGRATION_DONE, 'true');
    return normalizedList;
  },
};
