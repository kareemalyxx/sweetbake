import AsyncStorage from '@react-native-async-storage/async-storage';
import { CakeOrder, GeneralRequirement } from '../types';

const ORDERS_KEY = '@sweetbake_orders_v1';
const REQUIREMENTS_KEY = '@sweetbake_requirements_v1';
const FLAVORS_KEY = '@sweetbake_flavors_v1';
const CAKE_TYPES_KEY = '@sweetbake_cake_types_v1';
const CAKE_SHAPES_KEY = '@sweetbake_cake_shapes_v1';
const CAKE_ADDONS_KEY = '@sweetbake_cake_addons_v1';

const defaultOrders: CakeOrder[] = [
  {
    id: 'ord-1',
    customerName: 'Eleanor Vance',
    deliveryDate: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    cakeType: 'Vintage Heart Cake',
    shape: 'Heart',
    flavor: 'Vanilla Bean & Berry',
    customRequirements: 'Pastel blush piping with cherry on top, cursive "Happy 25th" in deep mauve script.',
    status: 'Baking',
    quotedPrice: 95.0,
    referenceImages: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ord-2',
    customerName: 'Liam & Chloe',
    deliveryDate: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
    cakeType: 'Tiered Wedding Cake',
    shape: 'Multi-tiered',
    flavor: 'Lemon Lavender Curd',
    customRequirements: '3-tier textured buttercream with pressed edible florals and gold leaf flakes.',
    status: 'Pending',
    quotedPrice: 380.0,
    referenceImages: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ord-3',
    customerName: 'Seraphina Lin',
    deliveryDate: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString(),
    cakeType: 'Bento Box Cake',
    shape: 'Round',
    flavor: 'Pistachio Rosewater',
    customRequirements: 'Minimalist Korean aesthetic, cute hand-piped ribbon bow design.',
    status: 'Pending',
    quotedPrice: 48.0,
    referenceImages: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ord-4',
    customerName: 'Marcus Sterling',
    deliveryDate: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    cakeType: 'Celebration Cake',
    shape: 'Round',
    flavor: 'Rich Belgian Chocolate',
    customRequirements: 'Chocolate drip with macarons on top.',
    status: 'Delivered',
    quotedPrice: 110.0,
    referenceImages: [],
    createdAt: new Date().toISOString(),
  },
];

const defaultRequirements: GeneralRequirement[] = [
  { id: 'req-1', title: 'Organic Madagascar Vanilla Beans (x10)', category: 'Ingredients', isCompleted: false, createdAt: new Date().toISOString() },
  { id: 'req-2', title: 'Callebaut 70% Dark Chocolate Callets (2.5kg)', category: 'Ingredients', isCompleted: false, createdAt: new Date().toISOString() },
  { id: 'req-3', title: 'Unsalted French Butter (5kg block)', category: 'Ingredients', isCompleted: true, createdAt: new Date().toISOString() },
  { id: 'req-4', title: 'Culinary Lavender Buds', category: 'Ingredients', isCompleted: false, createdAt: new Date().toISOString() },
  { id: 'req-5', title: '10-inch White Window Cake Boxes (pack of 25)', category: 'Packaging', isCompleted: false, createdAt: new Date().toISOString() },
  { id: 'req-6', title: 'Mauve Satin Ribbons 1.5-inch rolls', category: 'Packaging', isCompleted: false, createdAt: new Date().toISOString() },
  { id: 'req-7', title: 'Bento Clamshell Boxes (Sugarcane pulp)', category: 'Packaging', isCompleted: true, createdAt: new Date().toISOString() },
  { id: 'req-8', title: 'Wilton 1M Open Star Piping Tip', category: 'Tools', isCompleted: false, createdAt: new Date().toISOString() },
  { id: 'req-9', title: 'Stainless Steel Cake Turntable (Re-oil bearings)', category: 'Tools', isCompleted: true, createdAt: new Date().toISOString() },
  { id: 'req-10', title: 'Offset Icing Spatula (8 inch)', category: 'Tools', isCompleted: false, createdAt: new Date().toISOString() },
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
};

