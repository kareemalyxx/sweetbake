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
   * Listen to real-time updates for bakery checklist requirements (only active uncompleted items)
   * Drastically reduces Firestore reads by ignoring historical completed checklist items.
   */
  subscribeToRequirements(
    onSuccess: (reqs: GeneralRequirement[]) => void,
    onError?: (err: Error) => void,
    maxLimit: number = 100
  ): () => void {
    const reqsCol = collection(db, 'requirements');
    // Query only uncompleted items, limit to active items to keep reads minimal
    const q = query(
      reqsCol,
      where('isCompleted', '==', false),
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

        // Sort descending in-memory to avoid needing composite Firestore index (isCompleted + createdAt)
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
   * Fetch uncompleted requirements once
   */
  async getRequirements(maxLimit: number = 100): Promise<GeneralRequirement[]> {
    try {
      const reqsCol = collection(db, 'requirements');
      const q = query(
        reqsCol,
        where('isCompleted', '==', false),
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

