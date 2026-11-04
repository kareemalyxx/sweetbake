import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { CakeOrder, GeneralRequirement } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ORDERS_CACHE_KEY = '@sweetbake_orders_cache_v1';
const REQS_CACHE_KEY = '@sweetbake_reqs_cache_v1';

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
   * Listen to real-time updates for bakery cake orders (direct root collection)
   */
  subscribeToOrders(
    onSuccess: (orders: CakeOrder[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    const ordersCol = collection(db, 'orders');
    const q = query(ordersCol, orderBy('createdAt', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const orders: CakeOrder[] = [];
        snapshot.forEach((docSnap) => {
          const raw = docSnap.data();
          orders.push({
            id: docSnap.id,
            ...(raw as any),
            deliveryDate: toIsoDate(raw.deliveryDate),
            createdAt: toIsoDate(raw.createdAt),
            updatedAt: raw.updatedAt ? toIsoDate(raw.updatedAt) : undefined,
            expenses: Array.isArray(raw.expenses)
              ? raw.expenses.map((e: any) => ({
                  ...e,
                  date: toIsoDate(e.date),
                }))
              : [],
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
   * Fetch orders once from Firestore (with local cache fallback)
   */
  async getOrders(): Promise<CakeOrder[]> {
    try {
      const ordersCol = collection(db, 'orders');
      const q = query(ordersCol, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const orders: CakeOrder[] = [];
      snapshot.forEach((docSnap) => {
        const raw = docSnap.data();
        orders.push({
          id: docSnap.id,
          ...(raw as any),
          deliveryDate: toIsoDate(raw.deliveryDate),
          createdAt: toIsoDate(raw.createdAt),
          updatedAt: raw.updatedAt ? toIsoDate(raw.updatedAt) : undefined,
          expenses: Array.isArray(raw.expenses)
            ? raw.expenses.map((e: any) => ({
                ...e,
                date: toIsoDate(e.date),
              }))
            : [],
        });
      });
      await AsyncStorage.setItem(ORDERS_CACHE_KEY, JSON.stringify(orders));
      return orders;
    } catch (err) {
      console.warn('Failed to fetch from Firestore, checking offline cache:', err);
      const cached = await AsyncStorage.getItem(ORDERS_CACHE_KEY);
      return cached ? JSON.parse(cached) : [];
    }
  },

  /**
   * Create or update an order with native Firebase Timestamp dates
   */
  async saveOrder(order: CakeOrder): Promise<void> {
    const orderRef = doc(db, 'orders', order.id);
    const dataToSave = {
      ...order,
      deliveryDate: toFirebaseTimestamp(order.deliveryDate),
      createdAt: toFirebaseTimestamp(order.createdAt),
      updatedAt: Timestamp.now(),
      expenses: Array.isArray(order.expenses)
        ? order.expenses.map((e) => ({
            ...e,
            date: toFirebaseTimestamp(e.date),
          }))
        : [],
    };
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
   * Listen to real-time updates for bakery checklist requirements (direct root collection)
   */
  subscribeToRequirements(
    onSuccess: (reqs: GeneralRequirement[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    const reqsCol = collection(db, 'requirements');
    const q = query(reqsCol, orderBy('createdAt', 'desc'));

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
  async getRequirements(): Promise<GeneralRequirement[]> {
    try {
      const reqsCol = collection(db, 'requirements');
      const q = query(reqsCol, orderBy('createdAt', 'desc'));
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
    const dataToSave = {
      ...req,
      id: reqId,
      reqId: reqId,
      createdAt: toFirebaseTimestamp(req.createdAt),
      updatedAt: Timestamp.now(),
    };
    await setDoc(reqRef, dataToSave, { merge: true });
  },

  /**
   * Delete a requirement item
   */
  async deleteRequirement(reqId: string): Promise<void> {
    const reqRef = doc(db, 'requirements', reqId);
    await deleteDoc(reqRef);
  },
};

