import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { CakeOrder, GeneralRequirement, OrderExpense, ReminderTiming, SavedCustomer, SavedCourier, BakeryConfig } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ORDERS_CACHE_KEY = '@sweetbake_orders_cache_v1';
const REQS_CACHE_KEY = '@sweetbake_reqs_cache_v1';
const EXPENSES_CACHE_KEY = '@sweetbake_expenses_cache_v1';
const CUSTOMERS_CACHE_KEY = '@sweetbake_customers_cache_v1';
const COURIERS_CACHE_KEY = '@sweetbake_couriers_cache_v1';
const CONFIG_CACHE_KEY = '@sweetbake_config_cache_v1';

/**
 * Helper to normalize Firebase Timestamp or ISO string to ISO string for JS components
 */
function toIsoDate(val: any): string {
  if (!val) return new Date().toISOString();
  if (typeof val.toDate === 'function') {
    return val.toDate().toISOString();
  }
  if (val instanceof Date) {
    return val.toISOString();
  }
  if (typeof val === 'string') {
    return val;
  }
  return new Date().toISOString();
}

/**
 * Helper to convert JS Date or ISO string into a Firebase Timestamp
 */
function toFirebaseTimestamp(val: any): Timestamp {
  if (val && typeof val.toDate === 'function') {
    return val;
  }
  if (val instanceof Date) {
    return Timestamp.fromDate(val);
  }
  if (typeof val === 'string') {
    const parsed = new Date(val);
    if (!isNaN(parsed.getTime())) {
      return Timestamp.fromDate(parsed);
    }
  }
  return Timestamp.now();
}

export const FirestoreService = {
  /**
   * Listen to real-time updates for bakery cake orders with pagination limit (default 25)
   */
  subscribeToOrders(
    onSuccess: (orders: CakeOrder[]) => void,
    onError?: (err: Error) => void,
    pageSize: number = 25
  ): () => void {
    const ordersCol = collection(db, 'orders');
    const q = query(ordersCol, orderBy('createdAt', 'desc'), limit(pageSize));

    return onSnapshot(
      q,
      (snapshot) => {
        const orders: CakeOrder[] = [];
        snapshot.forEach((docSnap) => {
          const raw = docSnap.data();
      // Map raw reminders (label -> timestamp)
      const rawReminders = raw.reminders && typeof raw.reminders === 'object' ? raw.reminders : {};
      const remindersParsed: Record<string, string> = {};
      Object.entries(rawReminders).forEach(([key, val]) => {
        remindersParsed[key] = toIsoDate(val);
      });

      const reminderTimings: ReminderTiming[] = Array.isArray(raw.reminderTimings)
        ? raw.reminderTimings
        : (Object.keys(remindersParsed).filter((k) =>
            ['15_min', '1_hour', '2_hours', '1_day', 'on_time'].includes(k)
          ) as ReminderTiming[]);

      const customReminderDates: string[] = Array.isArray(raw.customReminderDates)
        ? raw.customReminderDates
        : Object.entries(remindersParsed)
            .filter(([k]) => k.startsWith('Custom Alert') || k.startsWith('custom_'))
            .map(([, v]) => v);

      const notificationTimestamps = Object.values(remindersParsed).length > 0
        ? Object.values(remindersParsed)
        : (Array.isArray(raw.notificationTimestamps)
            ? raw.notificationTimestamps.map((t: any) => toIsoDate(t))
            : undefined);

      orders.push({
        id: docSnap.id,
        ...(raw as any),
        deliveryDate: toIsoDate(raw.deliveryDate),
        createdAt: toIsoDate(raw.createdAt),
        updatedAt: raw.updatedAt ? toIsoDate(raw.updatedAt) : undefined,
        deliveryHandoverTime: raw.deliveryHandoverTime ? toIsoDate(raw.deliveryHandoverTime) : undefined,
        reminders: remindersParsed,
        expenses: Array.isArray(raw.expenses)
          ? raw.expenses.map((e: any) => ({
              ...e,
              date: toIsoDate(e.date),
            }))
          : undefined,
      });
        });
        AsyncStorage.setItem(ORDERS_CACHE_KEY, JSON.stringify(orders)).catch(() => {});
        onSuccess(orders);
      },
      (error) => {
        console.warn('Error listening to orders:', error);
        if (onError) onError(new Error(error.message));
      }
    );
  },

  /**
   * Fetch paginated orders once from Firestore (with local cache fallback)
   */
  async getOrders(
    pageSize: number = 25,
    lastDoc?: QueryDocumentSnapshot<DocumentData>
  ): Promise<{ orders: CakeOrder[]; lastVisible?: QueryDocumentSnapshot<DocumentData> }> {
    try {
      const ordersCol = collection(db, 'orders');
      let q = query(ordersCol, orderBy('createdAt', 'desc'), limit(pageSize));
      if (lastDoc) {
        q = query(ordersCol, orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(pageSize));
      }

      const snapshot = await getDocs(q);
      const orders: CakeOrder[] = [];
      snapshot.forEach((docSnap) => {
        const raw = docSnap.data();
        // Map raw reminders (label -> timestamp)
        const rawReminders = raw.reminders && typeof raw.reminders === 'object' ? raw.reminders : {};
        const remindersParsed: Record<string, string> = {};
        Object.entries(rawReminders).forEach(([key, val]) => {
          remindersParsed[key] = toIsoDate(val);
        });

        const reminderTimings: ReminderTiming[] = Array.isArray(raw.reminderTimings)
          ? raw.reminderTimings
          : (Object.keys(remindersParsed).filter((k) =>
              ['15_min', '1_hour', '2_hours', '1_day', 'on_time'].includes(k)
            ) as ReminderTiming[]);

        const customReminderDates: string[] = Array.isArray(raw.customReminderDates)
          ? raw.customReminderDates
          : Object.entries(remindersParsed)
              .filter(([k]) => k.startsWith('Custom Alert') || k.startsWith('custom_'))
              .map(([, v]) => v);

        const notificationTimestamps = Object.values(remindersParsed).length > 0
          ? Object.values(remindersParsed)
          : (Array.isArray(raw.notificationTimestamps)
              ? raw.notificationTimestamps.map((t: any) => toIsoDate(t))
              : undefined);

        orders.push({
          id: docSnap.id,
          ...(raw as any),
          deliveryDate: toIsoDate(raw.deliveryDate),
          createdAt: toIsoDate(raw.createdAt),
          updatedAt: raw.updatedAt ? toIsoDate(raw.updatedAt) : undefined,
          deliveryHandoverTime: raw.deliveryHandoverTime ? toIsoDate(raw.deliveryHandoverTime) : undefined,
          reminders: remindersParsed,
          expenses: Array.isArray(raw.expenses)
            ? raw.expenses.map((e: any) => ({
                ...e,
                date: toIsoDate(e.date),
              }))
            : undefined,
        });
      });
      const lastVisible = snapshot.docs[snapshot.docs.length - 1];
      if (!lastDoc) {
        AsyncStorage.setItem(ORDERS_CACHE_KEY, JSON.stringify(orders)).catch(() => {});
      }
      return { orders, lastVisible };
    } catch (err) {
      console.warn('Failed to fetch from Firestore, checking offline cache:', err);
      const cached = await AsyncStorage.getItem(ORDERS_CACHE_KEY);
      return { orders: cached ? JSON.parse(cached) : [] };
    }
  },

  /**
   * Create or update an order with native Firebase Timestamp dates
   */
  async saveOrder(order: CakeOrder): Promise<void> {
    const orderRef = doc(db, 'orders', order.id);

    // Calculate notification timestamps and build the key-value reminders map:
    // e.g. "1_hour": Timestamp, "15_min": Timestamp, "Custom Alert 1": Timestamp
    const remindersMap: Record<string, Timestamp> = {};
    const remindersInput = order.reminders || {};

    Object.entries(remindersInput).forEach(([label, dateVal]) => {
      if (dateVal) {
        remindersMap[label] = toFirebaseTimestamp(dateVal);
      }
    });

    // Omit expenses and legacy fields from the order document
    const {
      expenses: _expenses,
      reminderTiming: _timing,
      reminderTimings: _timings,
      customReminderDates: _customDates,
      notificationTimestamps: _notifs,
      ...orderWithoutExpenses
    } = order as any;

    // Clean all undefined values to prevent Firestore 'Unsupported field value: undefined' errors
    const cleanedOrder: Record<string, any> = {};
    Object.entries(orderWithoutExpenses).forEach(([key, val]) => {
      if (val !== undefined) {
        cleanedOrder[key] = val;
      }
    });

    // Ensure flavor is always saved as an array of strings (do not write string again)
    const normalizedFlavors = Array.isArray(order.flavor)
      ? order.flavor.filter((f) => Boolean(f && typeof f === 'string' && f.trim()))
      : typeof order.flavor === 'string' && order.flavor.trim()
      ? [order.flavor.trim()]
      : [];

    const dataToSave: Record<string, any> = {
      ...cleanedOrder,
      flavor: normalizedFlavors,
      deliveryDate: toFirebaseTimestamp(order.deliveryDate),
      createdAt: toFirebaseTimestamp(order.createdAt),
      updatedAt: Timestamp.now(),
      // Single Map to store all reminder configuration where label is key and value is Timestamp
      reminders: remindersMap,
    };

    if (order.deliveryHandoverTime) {
      dataToSave.deliveryHandoverTime = toFirebaseTimestamp(order.deliveryHandoverTime);
    }
    if (typeof order.deliveryCost === 'number') {
      dataToSave.deliveryCost = order.deliveryCost;
    }
    if (order.deliveryPerson) {
      dataToSave.deliveryPerson = order.deliveryPerson;
    }
    if (order.deliveryPhone) {
      dataToSave.deliveryPhone = order.deliveryPhone;
    }

    // Strict whitelist according to firestore.rules isValidOrder
    const ALLOWED_ORDER_KEYS = new Set([
      'id', 'customerName', 'customerPhone', 'customerInstagram', 'deliveryDate', 'cakeType', 'shape', 'flavor',
      'customRequirements', 'status', 'quotedPrice', 'downPayment',
      'remainingPayment', 'fulfillmentType', 'location',
      'deliveryCost', 'deliveryPerson', 'deliveryPhone', 'deliveryHandoverTime',
      'reminderEnabled', 'reminders', 'addons', 'referenceImages',
      'createdAt', 'updatedAt', 'userId'
    ]);

    const sanitizedData: Record<string, any> = {};
    Object.entries(dataToSave).forEach(([k, v]) => {
      if (ALLOWED_ORDER_KEYS.has(k) && v !== undefined) {
        sanitizedData[k] = v;
      }
    });

    await setDoc(orderRef, sanitizedData, { merge: true });
  },

  /**
   * Delete an order
   */
  async deleteOrder(orderId: string): Promise<void> {
    const orderRef = doc(db, 'orders', orderId);
    await deleteDoc(orderRef);
  },

  /**
   * Listen to real-time updates for bakery checklist requirements
   */
  subscribeToRequirements(
    onSuccess: (reqs: GeneralRequirement[]) => void,
    onError?: (err: Error) => void,
    maxLimit: number = 100
  ): () => void {
    const reqsCol = collection(db, 'requirements');
    const q = query(
      reqsCol,
      limit(maxLimit)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const reqs: GeneralRequirement[] = [];
        snapshot.forEach((docSnap) => {
          const raw = docSnap.data();
          reqs.push({
            id: docSnap.id,
            reqId: raw.reqId || docSnap.id,
            ...(raw as any),
            createdAt: toIsoDate(raw.createdAt),
            updatedAt: raw.updatedAt ? toIsoDate(raw.updatedAt) : undefined,
          });
        });

        // Sort descending in-memory
        reqs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        AsyncStorage.setItem(REQS_CACHE_KEY, JSON.stringify(reqs)).catch(() => {});
        onSuccess(reqs);
      },
      (error) => {
        console.warn('Error listening to requirements:', error);
        if (onError) onError(new Error(error.message));
      }
    );
  },

  /**
   * Fetch requirements once
   */
  async getRequirements(maxLimit: number = 100): Promise<GeneralRequirement[]> {
    try {
      const reqsCol = collection(db, 'requirements');
      const q = query(
        reqsCol,
        limit(maxLimit)
      );
      const snapshot = await getDocs(q);
      const reqs: GeneralRequirement[] = [];
      snapshot.forEach((docSnap) => {
        const raw = docSnap.data();
        reqs.push({
          id: docSnap.id,
          reqId: raw.reqId || docSnap.id,
          ...(raw as any),
          createdAt: toIsoDate(raw.createdAt),
          updatedAt: raw.updatedAt ? toIsoDate(raw.updatedAt) : undefined,
        });
      });

      // In-memory sort
      reqs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      await AsyncStorage.setItem(REQS_CACHE_KEY, JSON.stringify(reqs));
      return reqs;
    } catch (err) {
      console.warn('Failed to fetch requirements from Firestore, using cache:', err);
      const cached = await AsyncStorage.getItem(REQS_CACHE_KEY);
      return cached ? JSON.parse(cached) : [];
    }
  },

  /**
   * Save a requirement item with Firebase Timestamp dates
   */
  async saveRequirement(req: GeneralRequirement): Promise<void> {
    const reqId = req.reqId || req.id;
    const reqRef = doc(db, 'requirements', reqId);
    
    // Clean out undefined values to prevent Firestore 'Unsupported field value: undefined' errors
    const cleanedReq: Record<string, any> = {};
    Object.entries(req).forEach(([key, val]) => {
      if (val !== undefined) {
        cleanedReq[key] = val;
      }
    });

    const dataToSave: Record<string, any> = {
      ...cleanedReq,
      id: reqId,
      reqId: reqId,
      createdAt: toFirebaseTimestamp(req.createdAt),
      updatedAt: Timestamp.now(),
    };

    if (req.expenseDate) {
      dataToSave.expenseDate = toFirebaseTimestamp(req.expenseDate);
    }

    await setDoc(reqRef, dataToSave, { merge: true });
  },

  /**
   * Delete a requirement item
   */
  async deleteRequirement(reqId: string): Promise<void> {
    const reqRef = doc(db, 'requirements', reqId);
    await deleteDoc(reqRef);
  },

  /**
   * =========================================================================
   * Dedicated `/expenses` Collection (with orderId linking & cursor pagination)
   * =========================================================================
   */

  /**
   * Listen to real-time updates for expenses with pagination and optional orderId filtering
   */
  subscribeToExpenses(
    onSuccess: (expenses: OrderExpense[]) => void,
    onError?: (err: Error) => void,
    options?: {
      orderId?: string;
      pageSize?: number;
    }
  ): () => void {
    const pageSize = options?.pageSize ?? 25;
    const expensesCol = collection(db, 'expenses');

    let q;
    if (options?.orderId) {
      // Query all expenses that have orderId of order
      q = query(
        expensesCol,
        where('orderId', '==', options.orderId),
        limit(pageSize)
      );
    } else {
      // General expenses ordered by date descending
      q = query(
        expensesCol,
        orderBy('date', 'desc'),
        limit(pageSize)
      );
    }

    return onSnapshot(
      q,
      (snapshot) => {
        const expenses: OrderExpense[] = [];
        snapshot.forEach((docSnap) => {
          const raw = docSnap.data();
          expenses.push({
            id: docSnap.id,
            orderId: raw.orderId || undefined,
            amount: typeof raw.amount === 'number' ? raw.amount : parseFloat(raw.amount || 0),
            notes: raw.notes || '',
            date: toIsoDate(raw.date),
            createdAt: raw.createdAt ? toIsoDate(raw.createdAt) : undefined,
          });
        });

        // Ensure chronological sort in memory
        expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        if (!options?.orderId) {
          AsyncStorage.setItem(EXPENSES_CACHE_KEY, JSON.stringify(expenses)).catch(() => {});
        }
        onSuccess(expenses);
      },
      (error) => {
        console.warn('Error listening to expenses:', error);
        if (onError) onError(new Error(error.message));
      }
    );
  },

  /**
   * Fetch paginated expenses once from Firestore (sorted by date or filtered by orderId)
   */
  async getExpenses(options?: {
    orderId?: string;
    pageSize?: number;
    lastDoc?: QueryDocumentSnapshot<DocumentData>;
  }): Promise<{ expenses: OrderExpense[]; lastVisible?: QueryDocumentSnapshot<DocumentData> }> {
    try {
      const pageSize = options?.pageSize ?? 25;
      const expensesCol = collection(db, 'expenses');

      let q;
      if (options?.orderId) {
        // Query specifically for all expenses that have orderId of order
        q = query(
          expensesCol,
          where('orderId', '==', options.orderId),
          limit(pageSize)
        );
        if (options?.lastDoc) {
          q = query(
            expensesCol,
            where('orderId', '==', options.orderId),
            startAfter(options.lastDoc),
            limit(pageSize)
          );
        }
      } else {
        // Sort by date descending with cursor pagination
        q = query(
          expensesCol,
          orderBy('date', 'desc'),
          limit(pageSize)
        );
        if (options?.lastDoc) {
          q = query(
            expensesCol,
            orderBy('date', 'desc'),
            startAfter(options.lastDoc),
            limit(pageSize)
          );
        }
      }

      const snapshot = await getDocs(q);
      const expenses: OrderExpense[] = [];
      snapshot.forEach((docSnap) => {
        const raw = docSnap.data();
        expenses.push({
          id: docSnap.id,
          orderId: raw.orderId || undefined,
          amount: typeof raw.amount === 'number' ? raw.amount : parseFloat(raw.amount || 0),
          notes: raw.notes || '',
          date: toIsoDate(raw.date),
          createdAt: raw.createdAt ? toIsoDate(raw.createdAt) : undefined,
        });
      });

      // In-memory sort by date descending
      expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const lastVisible = snapshot.docs[snapshot.docs.length - 1];
      if (!options?.lastDoc && !options?.orderId) {
        AsyncStorage.setItem(EXPENSES_CACHE_KEY, JSON.stringify(expenses)).catch(() => {});
      }
      return { expenses, lastVisible };
    } catch (err) {
      console.warn('Failed to fetch expenses from Firestore, using cache:', err);
      const cached = await AsyncStorage.getItem(EXPENSES_CACHE_KEY);
      return { expenses: cached ? JSON.parse(cached) : [] };
    }
  },

  /**
   * Save an expense item to `/expenses` with native Firebase Timestamp dates
   */
  async saveExpense(expense: OrderExpense): Promise<void> {
    const expenseRef = doc(db, 'expenses', expense.id);
    const dataToSave: Record<string, any> = {
      id: expense.id,
      amount: typeof expense.amount === 'number' ? expense.amount : parseFloat(expense.amount as any || 0),
      notes: expense.notes || '',
      date: toFirebaseTimestamp(expense.date),
      updatedAt: Timestamp.now(),
    };

    if (expense.orderId) {
      dataToSave.orderId = expense.orderId;
    }

    if (expense.createdAt) {
      dataToSave.createdAt = toFirebaseTimestamp(expense.createdAt);
    } else {
      // For new documents, set createdAt.
      dataToSave.createdAt = Timestamp.now();
    }

    await setDoc(expenseRef, dataToSave, { merge: true });
  },

  /**
   * Delete an expense item from `/expenses`
   */
  async deleteExpense(expenseId: string): Promise<void> {
    const expenseRef = doc(db, 'expenses', expenseId);
    await deleteDoc(expenseRef);
  },

  /**
   * Listen to real-time repeated / saved customers
   */
  subscribeToCustomers(
    onSuccess: (customers: SavedCustomer[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    const customersCol = collection(db, 'customers');
    const q = query(customersCol, orderBy('orderCount', 'desc'), limit(100));

    return onSnapshot(
      q,
      (snapshot) => {
        const customers: SavedCustomer[] = [];
        snapshot.forEach((docSnap) => {
          const raw = docSnap.data();
          customers.push({
            id: docSnap.id,
            name: raw.name || '',
            phone: raw.phone || undefined,
            instagram: raw.instagram || undefined,
            defaultLocation: raw.defaultLocation || undefined,
            orderCount: raw.orderCount || 1,
            totalSpent: typeof raw.totalSpent === 'number' ? raw.totalSpent : undefined,
            lastOrderId: raw.lastOrderId || undefined,
            lastOrderDate: raw.lastOrderDate ? toIsoDate(raw.lastOrderDate) : undefined,
            createdAt: toIsoDate(raw.createdAt),
            updatedAt: raw.updatedAt ? toIsoDate(raw.updatedAt) : undefined,
          });
        });
        AsyncStorage.setItem(CUSTOMERS_CACHE_KEY, JSON.stringify(customers)).catch(() => {});
        onSuccess(customers);
      },
      (error) => {
        console.warn('Error listening to customers:', error);
        if (onError) onError(new Error(error.message));
      }
    );
  },

  /**
   * Fetch repeated / saved customers once
   */
  async getCustomers(): Promise<SavedCustomer[]> {
    try {
      const customersCol = collection(db, 'customers');
      const q = query(customersCol, orderBy('orderCount', 'desc'), limit(100));
      const snapshot = await getDocs(q);
      const customers: SavedCustomer[] = [];
      snapshot.forEach((docSnap) => {
        const raw = docSnap.data();
        customers.push({
          id: docSnap.id,
          name: raw.name || '',
          phone: raw.phone || undefined,
          instagram: raw.instagram || undefined,
          defaultLocation: raw.defaultLocation || undefined,
          orderCount: raw.orderCount || 1,
          totalSpent: typeof raw.totalSpent === 'number' ? raw.totalSpent : undefined,
          lastOrderId: raw.lastOrderId || undefined,
          lastOrderDate: raw.lastOrderDate ? toIsoDate(raw.lastOrderDate) : undefined,
          createdAt: toIsoDate(raw.createdAt),
          updatedAt: raw.updatedAt ? toIsoDate(raw.updatedAt) : undefined,
        });
      });
      AsyncStorage.setItem(CUSTOMERS_CACHE_KEY, JSON.stringify(customers)).catch(() => {});
      return customers;
    } catch (err) {
      console.warn('Failed to fetch customers, using cache:', err);
      const cached = await AsyncStorage.getItem(CUSTOMERS_CACHE_KEY);
      return cached ? JSON.parse(cached) : [];
    }
  },

  /**
   * Save or update a customer in `/customers`
   */
  async saveCustomer(customer: Partial<SavedCustomer> & { name: string }): Promise<void> {
    const id = customer.id || `cust-${customer.name.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    const custRef = doc(db, 'customers', id);
    const dataToSave: Record<string, any> = {
      id,
      name: customer.name.trim(),
      updatedAt: Timestamp.now(),
    };
    if (customer.phone) dataToSave.phone = customer.phone.trim();
    if (customer.instagram) dataToSave.instagram = customer.instagram.trim();
    if (customer.defaultLocation) dataToSave.defaultLocation = customer.defaultLocation.trim();
    if (typeof customer.orderCount === 'number') dataToSave.orderCount = customer.orderCount;
    if (typeof customer.totalSpent === 'number') dataToSave.totalSpent = customer.totalSpent;
    if (customer.lastOrderId) dataToSave.lastOrderId = customer.lastOrderId;
    if (customer.lastOrderDate) dataToSave.lastOrderDate = toFirebaseTimestamp(customer.lastOrderDate);
    if (customer.createdAt) {
      dataToSave.createdAt = toFirebaseTimestamp(customer.createdAt);
    } else {
      dataToSave.createdAt = Timestamp.now();
    }
    await setDoc(custRef, dataToSave, { merge: true });
  },

  /**
   * Delete a customer from `/customers`
   */
  async deleteCustomer(customerId: string): Promise<void> {
    const custRef = doc(db, 'customers', customerId);
    await deleteDoc(custRef);
  },

  /**
   * Listen to real-time repeated / saved couriers
   */
  subscribeToCouriers(
    onSuccess: (couriers: SavedCourier[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    const couriersCol = collection(db, 'deliveryCouriers');
    const q = query(couriersCol, orderBy('deliveryCount', 'desc'), limit(100));

    return onSnapshot(
      q,
      (snapshot) => {
        const couriers: SavedCourier[] = [];
        snapshot.forEach((docSnap) => {
          const raw = docSnap.data();
          couriers.push({
            id: docSnap.id,
            name: raw.name || '',
            phone: raw.phone || undefined,
            deliveryCount: raw.deliveryCount || 1,
            totalEarned: typeof raw.totalEarned === 'number' ? raw.totalEarned : undefined,
            lastDeliveryOrderId: raw.lastDeliveryOrderId || undefined,
            lastDeliveryDate: raw.lastDeliveryDate ? toIsoDate(raw.lastDeliveryDate) : undefined,
            createdAt: toIsoDate(raw.createdAt),
            updatedAt: raw.updatedAt ? toIsoDate(raw.updatedAt) : undefined,
          });
        });
        AsyncStorage.setItem(COURIERS_CACHE_KEY, JSON.stringify(couriers)).catch(() => {});
        onSuccess(couriers);
      },
      (error) => {
        console.warn('Error listening to couriers:', error);
        if (onError) onError(new Error(error.message));
      }
    );
  },

  /**
   * Fetch saved delivery couriers once
   */
  async getCouriers(): Promise<SavedCourier[]> {
    try {
      const couriersCol = collection(db, 'deliveryCouriers');
      const q = query(couriersCol, orderBy('deliveryCount', 'desc'), limit(100));
      const snapshot = await getDocs(q);
      const couriers: SavedCourier[] = [];
      snapshot.forEach((docSnap) => {
        const raw = docSnap.data();
        couriers.push({
          id: docSnap.id,
          name: raw.name || '',
          phone: raw.phone || undefined,
          deliveryCount: raw.deliveryCount || 1,
          totalEarned: typeof raw.totalEarned === 'number' ? raw.totalEarned : undefined,
          lastDeliveryOrderId: raw.lastDeliveryOrderId || undefined,
          lastDeliveryDate: raw.lastDeliveryDate ? toIsoDate(raw.lastDeliveryDate) : undefined,
          createdAt: toIsoDate(raw.createdAt),
          updatedAt: raw.updatedAt ? toIsoDate(raw.updatedAt) : undefined,
        });
      });
      AsyncStorage.setItem(COURIERS_CACHE_KEY, JSON.stringify(couriers)).catch(() => {});
      return couriers;
    } catch (err) {
      console.warn('Failed to fetch couriers, using cache:', err);
      const cached = await AsyncStorage.getItem(COURIERS_CACHE_KEY);
      return cached ? JSON.parse(cached) : [];
    }
  },

  /**
   * Save or update a courier in `/deliveryCouriers`
   */
  async saveCourier(courier: Partial<SavedCourier> & { name: string }): Promise<void> {
    const id = courier.id || `courier-${courier.name.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    const courierRef = doc(db, 'deliveryCouriers', id);
    const dataToSave: Record<string, any> = {
      id,
      name: courier.name.trim(),
      updatedAt: Timestamp.now(),
    };
    if (courier.phone) dataToSave.phone = courier.phone.trim();
    if (typeof courier.deliveryCount === 'number') dataToSave.deliveryCount = courier.deliveryCount;
    if (typeof courier.totalEarned === 'number') dataToSave.totalEarned = courier.totalEarned;
    if (courier.lastDeliveryOrderId) dataToSave.lastDeliveryOrderId = courier.lastDeliveryOrderId;
    if (courier.lastDeliveryDate) dataToSave.lastDeliveryDate = toFirebaseTimestamp(courier.lastDeliveryDate);
    if (courier.createdAt) {
      dataToSave.createdAt = toFirebaseTimestamp(courier.createdAt);
    } else {
      dataToSave.createdAt = Timestamp.now();
    }
    await setDoc(courierRef, dataToSave, { merge: true });
  },

  /**
   * Delete a courier from `/deliveryCouriers`
   */
  async deleteCourier(courierId: string): Promise<void> {
    const courierRef = doc(db, 'deliveryCouriers', courierId);
    await deleteDoc(courierRef);
  },

  /**
   * Fetch bakery configuration options (flavors, types, shapes, sizes, addons)
   */
  async getBakeryConfig(): Promise<BakeryConfig | null> {
    try {
      const configRef = doc(db, 'config', 'bakeryOptions');
      const snapshot = await getDocs(query(collection(db, 'config'), limit(10)));
      const docSnap = snapshot.docs.find(d => d.id === 'bakeryOptions');
      if (docSnap && docSnap.exists()) {
        const raw = docSnap.data();
        const config: BakeryConfig = {
          cakeTypes: Array.isArray(raw.cakeTypes) ? raw.cakeTypes : undefined,
          cakeShapes: Array.isArray(raw.cakeShapes) ? raw.cakeShapes : undefined,
          cakeSizes: Array.isArray(raw.cakeSizes) ? raw.cakeSizes : undefined,
          cakeFlavors: Array.isArray(raw.cakeFlavors) ? raw.cakeFlavors : undefined,
          cakeAddons: Array.isArray(raw.cakeAddons) ? raw.cakeAddons : undefined,
          updatedAt: raw.updatedAt ? toIsoDate(raw.updatedAt) : undefined,
        };
        await AsyncStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify(config));
        return config;
      }
      return null;
    } catch (err) {
      console.warn('Failed to fetch bakery config from Firestore, attempting cache:', err);
      try {
        const cached = await AsyncStorage.getItem(CONFIG_CACHE_KEY);
        return cached ? JSON.parse(cached) : null;
      } catch {
        return null;
      }
    }
  },

  /**
   * Save or update bakery configuration options in Firestore
   */
  async saveBakeryConfig(config: Partial<BakeryConfig>): Promise<void> {
    try {
      const configRef = doc(db, 'config', 'bakeryOptions');
      const dataToSave: Record<string, any> = {
        updatedAt: Timestamp.now(),
      };
      if (Array.isArray(config.cakeTypes)) dataToSave.cakeTypes = config.cakeTypes;
      if (Array.isArray(config.cakeShapes)) dataToSave.cakeShapes = config.cakeShapes;
      if (Array.isArray(config.cakeSizes)) dataToSave.cakeSizes = config.cakeSizes;
      if (Array.isArray(config.cakeFlavors)) dataToSave.cakeFlavors = config.cakeFlavors;
      if (Array.isArray(config.cakeAddons)) dataToSave.cakeAddons = config.cakeAddons;

      await setDoc(configRef, dataToSave, { merge: true });

      // Update local cache
      const cached = await AsyncStorage.getItem(CONFIG_CACHE_KEY);
      const existing = cached ? JSON.parse(cached) : {};
      const merged = { ...existing, ...config, updatedAt: new Date().toISOString() };
      await AsyncStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify(merged));
    } catch (err) {
      console.warn('Failed to save bakery config to Firestore:', err);
    }
  },
};


