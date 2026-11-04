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
import { CakeOrder, GeneralRequirement, OrderExpense, ReminderTiming } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ORDERS_CACHE_KEY = '@sweetbake_orders_cache_v1';
const REQS_CACHE_KEY = '@sweetbake_reqs_cache_v1';
const EXPENSES_CACHE_KEY = '@sweetbake_expenses_cache_v1';

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
      // Map raw reminders if stored in map format
      const rawReminders = raw.reminders;
      const reminderTimings = Array.isArray(rawReminders?.reminderTimings)
        ? rawReminders.reminderTimings
        : (Array.isArray(raw.reminderTimings) ? raw.reminderTimings : []);
      const customReminderDates = Array.isArray(rawReminders?.customReminderDates)
        ? rawReminders.customReminderDates
        : (Array.isArray(raw.customReminderDates) ? raw.customReminderDates : []);
      const rawTimestamps = rawReminders?.notificationTimestamps || raw.notificationTimestamps;
      const notificationTimestamps = Array.isArray(rawTimestamps)
        ? rawTimestamps.map((t: any) => toIsoDate(t))
        : undefined;

      orders.push({
        id: docSnap.id,
        ...(raw as any),
        deliveryDate: toIsoDate(raw.deliveryDate),
        createdAt: toIsoDate(raw.createdAt),
        updatedAt: raw.updatedAt ? toIsoDate(raw.updatedAt) : undefined,
        deliveryHandoverTime: raw.deliveryHandoverTime ? toIsoDate(raw.deliveryHandoverTime) : undefined,
        reminderTimings,
        customReminderDates,
        notificationTimestamps,
        reminders: {
          reminderTimings,
          customReminderDates,
          notificationTimestamps,
        },
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
        // Map raw reminders if stored in map format
        const rawReminders = raw.reminders;
        const reminderTimings = Array.isArray(rawReminders?.reminderTimings)
          ? rawReminders.reminderTimings
          : (Array.isArray(raw.reminderTimings) ? raw.reminderTimings : []);
        const customReminderDates = Array.isArray(rawReminders?.customReminderDates)
          ? rawReminders.customReminderDates
          : (Array.isArray(raw.customReminderDates) ? raw.customReminderDates : []);
        const rawTimestamps = rawReminders?.notificationTimestamps || raw.notificationTimestamps;
        const notificationTimestamps = Array.isArray(rawTimestamps)
          ? rawTimestamps.map((t: any) => toIsoDate(t))
          : undefined;

        orders.push({
          id: docSnap.id,
          ...(raw as any),
          deliveryDate: toIsoDate(raw.deliveryDate),
          createdAt: toIsoDate(raw.createdAt),
          updatedAt: raw.updatedAt ? toIsoDate(raw.updatedAt) : undefined,
          deliveryHandoverTime: raw.deliveryHandoverTime ? toIsoDate(raw.deliveryHandoverTime) : undefined,
          reminderTimings,
          customReminderDates,
          notificationTimestamps,
          reminders: {
            reminderTimings,
            customReminderDates,
            notificationTimestamps,
          },
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

    // Calculate notification timestamps based on deliveryDate and chosen timings
    const deliveryMs = new Date(order.deliveryDate).getTime();
    const timings: ReminderTiming[] = Array.isArray(order.reminderTimings) && order.reminderTimings.length > 0
      ? order.reminderTimings
      : (order.reminders?.reminderTimings || []);

    const offsetMap: Record<ReminderTiming, number> = {
      '15_min': 15 * 60 * 1000,
      '1_hour': 60 * 60 * 1000,
      '2_hours': 2 * 60 * 60 * 1000,
      '1_day': 24 * 60 * 60 * 1000,
      'on_time': 0,
    };

    // Stored as native Firebase Timestamps: deliveryDate - offset
    const computedTimestamps = timings.map((timing) => {
      const triggerMs = deliveryMs - (offsetMap[timing] ?? 0);
      return Timestamp.fromMillis(triggerMs);
    });

    const customReminderDates = order.customReminderDates || order.reminders?.customReminderDates || [];

    // Also include custom specified date & times as native Timestamps
    const customTimestamps = Array.isArray(customReminderDates)
      ? customReminderDates
          .map((iso) => {
            const d = new Date(iso);
            return !isNaN(d.getTime()) ? Timestamp.fromDate(d) : null;
          })
          .filter((t): t is Timestamp => t !== null)
      : [];

    const notificationTimestamps = [...computedTimestamps, ...customTimestamps];

    // Omit expenses and legacy reminderTiming from the order document
    const { expenses: _expenses, reminderTiming: _timing, ...orderWithoutExpenses } = order as any;

    // Clean all undefined values to prevent Firestore 'Unsupported field value: undefined' errors
    const cleanedOrder: Record<string, any> = {};
    Object.entries(orderWithoutExpenses).forEach(([key, val]) => {
      if (val !== undefined) {
        cleanedOrder[key] = val;
      }
    });

    const dataToSave: Record<string, any> = {
      ...cleanedOrder,
      deliveryDate: toFirebaseTimestamp(order.deliveryDate),
      createdAt: toFirebaseTimestamp(order.createdAt),
      updatedAt: Timestamp.now(),
      // Single Map to store all reminder configuration
      reminders: {
        reminderTimings: timings,
        customReminderDates: customReminderDates,
        notificationTimestamps,
      },
      // Flat properties kept for query/view consistency
      reminderTimings: timings,
      customReminderDates: customReminderDates,
      notificationTimestamps,
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

    await setDoc(orderRef, dataToSave, { merge: true });
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
};

