import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Alert } from 'react-native';
import { CakeOrder, ReminderTiming } from '../types';

export interface InAppNotification {
  id: string;
  orderId: string;
  customerName: string;
  customerPhone?: string;
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
  /**
   * Open WhatsApp with a pre-filled order reminder/update message
   */
  async sendWhatsAppNotification(order: {
    customerName: string;
    customerPhone?: string;
    deliveryDate: string;
    cakeType?: string;
    shape?: string;
    flavor?: string;
    fulfillmentType?: string;
    location?: string;
    quotedPrice?: number;
    remainingPayment?: number;
  }): Promise<void> {
    const formattedDate = new Date(order.deliveryDate).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const lines = [
      `🎂 *SweetBake Studio Order Update*`,
      `Hi ${order.customerName}! Here are the details for your custom cake commission:`,
      ``,
      `🍰 *Cake:* ${order.cakeType || 'Custom Cake'} (${order.shape || 'Standard'} • ${order.flavor || 'Custom'})`,
      `📅 *Schedule:* ${formattedDate}`,
      `📍 *Fulfillment:* ${order.fulfillmentType || 'Pickup'}${order.location ? ` - ${order.location}` : ''}`,
    ];

    if (typeof order.quotedPrice === 'number' && order.quotedPrice > 0) {
      lines.push(`💰 *Total Quoted:* $${order.quotedPrice.toFixed(2)}`);
      if (typeof order.remainingPayment === 'number') {
        if (order.remainingPayment > 0) {
          lines.push(`💳 *Remaining Balance:* $${order.remainingPayment.toFixed(2)}`);
        } else {
          lines.push(`✓ *Payment Status:* Paid in full`);
        }
      }
    }

    lines.push(``);
    lines.push(`Let us know if you need any adjustments. Thank you for baking with SweetBake Studio!`);

    const message = lines.join('\n');
    const cleanPhone = (order.customerPhone || '').replace(/[^0-9+]/g, '');

    // Formulate wa.me or whatsapp:// URL
    const encodedText = encodeURIComponent(message);
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone.replace('+', '')}?text=${encodedText}`
      : `whatsapp://send?text=${encodedText}`;

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        // Fallback to web link if app scheme fails
        await Linking.openURL(`https://api.whatsapp.com/send?${cleanPhone ? `phone=${cleanPhone.replace('+', '')}&` : ''}text=${encodedText}`);
      }
    } catch (err) {
      console.warn('Failed to open WhatsApp:', err);
      Alert.alert(
        'WhatsApp Not Available',
        'Could not open WhatsApp on this device. Please check if WhatsApp is installed.'
      );
    }
  },
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
      customerPhone: order.customerPhone,
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

