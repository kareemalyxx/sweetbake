import AsyncStorage from '@react-native-async-storage/async-storage';
import { CakeOrder, ReminderTiming } from '../types';

export interface InAppNotification {
  id: string;
  orderId: string;
  customerName: string;
  triggerTime: string; // ISO string when it should alert
  deliveryDate: string;
  fulfillmentType: string;
  location?: string;
  message: string;
  timingLabel: string;
  isRead: boolean;
  createdAt: string;
}

const NOTIFICATIONS_STORAGE_KEY = '@sweetbake_reminders_v1';

export const NotificationService = {
  getTimingOffsetMs(timing: ReminderTiming): number {
    switch (timing) {
      case '15_min':
        return 15 * 60 * 1000;
      case '1_hour':
        return 60 * 60 * 1000;
      case '2_hours':
        return 2 * 60 * 60 * 1000;
      case '1_day':
        return 24 * 60 * 60 * 1000;
      case 'on_time':
      default:
        return 0;
    }
  },

  getTimingDisplay(timing: ReminderTiming): string {
    switch (timing) {
      case '15_min':
        return '15 minutes before';
      case '1_hour':
        return '1 hour before';
      case '2_hours':
        return '2 hours before';
      case '1_day':
        return '1 day before';
      case 'on_time':
      default:
        return 'At time of event';
    }
  },

  async scheduleOrderReminder(order: CakeOrder): Promise<void> {
    if (!order.reminderEnabled) {
      await this.cancelOrderReminder(order.id);
      return;
    }

    const orderTime = new Date(order.deliveryDate).getTime();
    const offset = this.getTimingOffsetMs(order.reminderTiming || '1_hour');
    const triggerTimestamp = orderTime - offset;
    const timingLabel = this.getTimingDisplay(order.reminderTiming || '1_hour');

    const notif: InAppNotification = {
      id: `remind-${order.id}`,
      orderId: order.id,
      customerName: order.customerName,
      triggerTime: new Date(triggerTimestamp).toISOString(),
      deliveryDate: order.deliveryDate,
      fulfillmentType: order.fulfillmentType || 'Pickup',
      location: order.location,
      message: `${order.fulfillmentType || 'Pickup'} due for ${order.customerName} (${timingLabel})`,
      timingLabel,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    const current = await this.getAllReminders();
    const updated = [notif, ...current.filter((n) => n.orderId !== order.id)];
    await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
  },

  async cancelOrderReminder(orderId: string): Promise<void> {
    const current = await this.getAllReminders();
    const updated = current.filter((n) => n.orderId !== orderId);
    await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
  },

  async getAllReminders(): Promise<InAppNotification[]> {
    try {
      const data = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async getDueReminders(): Promise<InAppNotification[]> {
    const now = Date.now();
    const all = await this.getAllReminders();
    return all.filter((n) => new Date(n.triggerTime).getTime() <= now && !n.isRead);
  },

  async markAsRead(id: string): Promise<void> {
    const all = await this.getAllReminders();
    const updated = all.map((n) => (n.id === id ? { ...n, isRead: true } : n));
    await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
  },

  async clearAll(): Promise<void> {
    await AsyncStorage.removeItem(NOTIFICATIONS_STORAGE_KEY);
  },
};

