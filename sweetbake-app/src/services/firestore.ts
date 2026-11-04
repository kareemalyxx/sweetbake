import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { CakeOrder, GeneralRequirement } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ORDERS_CACHE_KEY = '@sweetbake_orders_cache_v1';
const REQS_CACHE_KEY = '@sweetbake_reqs_cache_v1';

export const FirestoreService = {
  /**
   * Listen to real-time updates for user's cake orders
   */
  subscribeToOrders(
    userId: string,
    onSuccess: (orders: CakeOrder[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    const ordersCol = collection(db, 'users', userId, 'orders');
    const q = query(ordersCol, orderBy('createdAt', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const orders: CakeOrder[] = [];
        snapshot.forEach((docSnap) => {
          orders.push({ id: docSnap.id, ...(docSnap.data() as Omit<CakeOrder, 'id'>) });
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
  async getOrders(userId: string): Promise<CakeOrder[]> {
    try {
      const ordersCol = collection(db, 'users', userId, 'orders');
      const q = query(ordersCol, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const orders: CakeOrder[] = [];
      snapshot.forEach((docSnap) => {
        orders.push({ id: docSnap.id, ...(docSnap.data() as Omit<CakeOrder, 'id'>) });
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
   * Create or update an order
   */
  async saveOrder(userId: string, order: CakeOrder): Promise<void> {
    const orderRef = doc(db, 'users', userId, 'orders', order.id);
    const dataToSave = {
      ...order,
      userId,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(orderRef, dataToSave, { merge: true });
  },

  /**
   * Delete an order
   */
  async deleteOrder(userId: string, orderId: string): Promise<void> {
    const orderRef = doc(db, 'users', userId, 'orders', orderId);
    await deleteDoc(orderRef);
  },

  /**
   * Listen to real-time updates for bakery checklist requirements
   */
  subscribeToRequirements(
    userId: string,
    onSuccess: (reqs: GeneralRequirement[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    const reqsCol = collection(db, 'users', userId, 'requirements');
    const q = query(reqsCol, orderBy('createdAt', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const reqs: GeneralRequirement[] = [];
        snapshot.forEach((docSnap) => {
          reqs.push({ id: docSnap.id, ...(docSnap.data() as Omit<GeneralRequirement, 'id'>) });
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
  async getRequirements(userId: string): Promise<GeneralRequirement[]> {
    try {
      const reqsCol = collection(db, 'users', userId, 'requirements');
      const q = query(reqsCol, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const reqs: GeneralRequirement[] = [];
      snapshot.forEach((docSnap) => {
        reqs.push({ id: docSnap.id, ...(docSnap.data() as Omit<GeneralRequirement, 'id'>) });
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
   * Save a requirement item
   */
  async saveRequirement(userId: string, req: GeneralRequirement): Promise<void> {
    const reqRef = doc(db, 'users', userId, 'requirements', req.id);
    const dataToSave = {
      ...req,
      userId,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(reqRef, dataToSave, { merge: true });
  },

  /**
   * Delete a requirement item
   */
  async deleteRequirement(userId: string, reqId: string): Promise<void> {
    const reqRef = doc(db, 'users', userId, 'requirements', reqId);
    await deleteDoc(reqRef);
  },
};

