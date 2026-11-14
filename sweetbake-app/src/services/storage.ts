import AsyncStorage from '@react-native-async-storage/async-storage';
import { CakeOrder, GeneralRequirement, OrderExpense, SavedCustomer, SavedCourier } from '../types';

const ORDERS_KEY = '@sweetbake_orders_v1';
const REQUIREMENTS_KEY = '@sweetbake_requirements_v1';
const FLAVORS_KEY = '@sweetbake_flavors_v1';
const CAKE_TYPES_KEY = '@sweetbake_cake_types_v1';
const CAKE_SHAPES_KEY = '@sweetbake_cake_shapes_v1';
const CAKE_SIZES_KEY = '@sweetbake_cake_sizes_v1';
const CAKE_ADDONS_KEY = '@sweetbake_cake_addons_v1';
const EXPENSES_KEY = '@sweetbake_expenses_v1';
const CUSTOMERS_KEY = '@sweetbake_customers_v1';
const COURIERS_KEY = '@sweetbake_couriers_v1';

const defaultOrders: CakeOrder[] = [
];

const defaultRequirements: GeneralRequirement[] = [
];

export const StorageService = {
  getOrders: async (): Promise<CakeOrder[]> => {
    try {
      const data = await AsyncStorage.getItem(ORDERS_KEY);
      if (data) {
        return JSON.parse(data);
      }
      // Populate initial sample data
      await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(defaultOrders));
      return defaultOrders;
    } catch {
      return defaultOrders;
    }
  },

  saveOrders: async (orders: CakeOrder[]): Promise<void> => {
    try {
      await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    } catch (e) {
      console.error('Failed to save orders', e);
    }
  },

  getRequirements: async (): Promise<GeneralRequirement[]> => {
    try {
      const data = await AsyncStorage.getItem(REQUIREMENTS_KEY);
      if (data) {
        return JSON.parse(data);
      }
      await AsyncStorage.setItem(REQUIREMENTS_KEY, JSON.stringify(defaultRequirements));
      return defaultRequirements;
    } catch {
      return defaultRequirements;
    }
  },

  saveRequirements: async (requirements: GeneralRequirement[]): Promise<void> => {
    try {
      await AsyncStorage.setItem(REQUIREMENTS_KEY, JSON.stringify(requirements));
    } catch (e) {
      console.error('Failed to save requirements', e);
    }
  },

  getFlavors: async (defaultList: string[]): Promise<string[]> => {
    try {
      const data = await AsyncStorage.getItem(FLAVORS_KEY);
      if (data) {
        return JSON.parse(data);
      }
      await AsyncStorage.setItem(FLAVORS_KEY, JSON.stringify(defaultList));
      return defaultList;
    } catch {
      return defaultList;
    }
  },

  saveFlavors: async (flavors: string[]): Promise<void> => {
    try {
      await AsyncStorage.setItem(FLAVORS_KEY, JSON.stringify(flavors));
    } catch (e) {
      console.error('Failed to save flavors', e);
    }
  },

  getCakeTypes: async (defaultList: string[]): Promise<string[]> => {
    try {
      const data = await AsyncStorage.getItem(CAKE_TYPES_KEY);
      if (data) {
        return JSON.parse(data);
      }
      await AsyncStorage.setItem(CAKE_TYPES_KEY, JSON.stringify(defaultList));
      return defaultList;
    } catch {
      return defaultList;
    }
  },

  saveCakeTypes: async (types: string[]): Promise<void> => {
    try {
      await AsyncStorage.setItem(CAKE_TYPES_KEY, JSON.stringify(types));
    } catch (e) {
      console.error('Failed to save cake types', e);
    }
  },

  getCakeShapes: async (defaultList: string[]): Promise<string[]> => {
    try {
      const data = await AsyncStorage.getItem(CAKE_SHAPES_KEY);
      if (data) {
        return JSON.parse(data);
      }
      await AsyncStorage.setItem(CAKE_SHAPES_KEY, JSON.stringify(defaultList));
      return defaultList;
    } catch {
      return defaultList;
    }
  },

  saveCakeShapes: async (shapes: string[]): Promise<void> => {
    try {
      await AsyncStorage.setItem(CAKE_SHAPES_KEY, JSON.stringify(shapes));
    } catch (e) {
      console.error('Failed to save cake shapes', e);
    }
  },

  getCakeSizes: async (defaultList: string[]): Promise<string[]> => {
    try {
      const data = await AsyncStorage.getItem(CAKE_SIZES_KEY);
      if (data) {
        return JSON.parse(data);
      }
      await AsyncStorage.setItem(CAKE_SIZES_KEY, JSON.stringify(defaultList));
      return defaultList;
    } catch {
      return defaultList;
    }
  },

  saveCakeSizes: async (sizes: string[]): Promise<void> => {
    try {
      await AsyncStorage.setItem(CAKE_SIZES_KEY, JSON.stringify(sizes));
    } catch (e) {
      console.error('Failed to save cake sizes', e);
    }
  },

  getCakeAddons: async (defaultList: string[]): Promise<string[]> => {
    try {
      const data = await AsyncStorage.getItem(CAKE_ADDONS_KEY);
      if (data) {
        return JSON.parse(data);
      }
      await AsyncStorage.setItem(CAKE_ADDONS_KEY, JSON.stringify(defaultList));
      return defaultList;
    } catch {
      return defaultList;
    }
  },

  saveCakeAddons: async (addons: string[]): Promise<void> => {
    try {
      await AsyncStorage.setItem(CAKE_ADDONS_KEY, JSON.stringify(addons));
    } catch (e) {
      console.error('Failed to save cake addons', e);
    }
  },

  getExpenses: async (): Promise<OrderExpense[]> => {
    try {
      const data = await AsyncStorage.getItem(EXPENSES_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to load expenses', e);
      return [];
    }
  },

  saveExpenses: async (expenses: OrderExpense[]): Promise<void> => {
    try {
      await AsyncStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
    } catch (e) {
      console.error('Failed to save expenses', e);
    }
  },

  getCustomers: async (): Promise<SavedCustomer[]> => {
    try {
      const data = await AsyncStorage.getItem(CUSTOMERS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveCustomers: async (customers: SavedCustomer[]): Promise<void> => {
    try {
      await AsyncStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));
    } catch (e) {
      console.error('Failed to save customers', e);
    }
  },

  getCouriers: async (): Promise<SavedCourier[]> => {
    try {
      const data = await AsyncStorage.getItem(COURIERS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveCouriers: async (couriers: SavedCourier[]): Promise<void> => {
    try {
      await AsyncStorage.setItem(COURIERS_KEY, JSON.stringify(couriers));
    } catch (e) {
      console.error('Failed to save couriers', e);
    }
  },
};

