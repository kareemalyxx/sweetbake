import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Alert, Platform, Clipboard } from 'react-native';
import { CakeOrder, ReminderTiming } from '../types';

// Safely resolve Expo Notifications with lazy loading to prevent Metro module resolution / stale cache crashes
let Notifications: typeof import('expo-notifications') | null = null;
try {
  Notifications = require('expo-notifications');
  if (Notifications && typeof Notifications.setNotificationHandler === 'function') {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }
} catch (e) {
  // Gracefully fallback on web or before native module bundle reload
  Notifications = null;
}

export interface InAppNotification {
  id: string;
  orderId: string;
  customerName: string;
  customerPhone?: string;
  triggerTime: string; // ISO string when it should alert (e.g. 1:45 PM for 2:00 PM delivery with 15_min)
  deliveryDate: string;
  fulfillmentType: string;
  location?: string;
  message: string;
  timing?: ReminderTiming | 'custom';
  timingLabel: string;
  isRead: boolean;
  createdAt: string;
  systemNotificationId?: string; // Expo system notification identifier
}

const NOTIFICATIONS_STORAGE_KEY = '@sweetbake_reminders_v1';

export const NotificationService = {
  /**
   * Builds the formatted order message string for WhatsApp or copying to clipboard
   */
  buildOrderMessage(order: {
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
  }): string {
    const formattedDate = new Date(order.deliveryDate).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const lines = [
      `🎂 *Kake Studio Order Update*`,
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

    lines.push(`🔗 *InstaPay:* https://ipn.eg/S/danawaleed92646/instapay/907lRy`);
    lines.push(``);
    lines.push(`Let us know if you need any adjustments. Thank you for baking with Kake Studio!`);

    return lines.join('\n');
  },

  /**
   * Copies the order update message to the system clipboard
   */
  async copyOrderMessage(order: {
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
    const message = this.buildOrderMessage(order);
    try {
      Clipboard.setString(message);
      Alert.alert('Copied!', 'Order message copied to clipboard.');
    } catch (err) {
      console.warn('Failed to copy to clipboard:', err);
      Alert.alert('Copy Failed', 'Unable to copy message to clipboard.');
    }
  },

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
    const message = this.buildOrderMessage(order);
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

  /**
   * Request device notification permissions for native phone alerts
   */
  async requestDeviceNotificationPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'web' || !Notifications) return false;
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      return finalStatus === 'granted';
    } catch (e) {
      console.warn('Notification permission error:', e);
      return false;
    }
  },

  /**
   * Trigger an immediate test notification alert directly on the phone
   */
  async sendImmediatePhoneAlert(title: string, body: string): Promise<string | null> {
    try {
      if (!Notifications) return null;
      await this.requestDeviceNotificationPermission();
      const notifId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // immediate
      });
      return notifId;
    } catch (e) {
      console.warn('Failed to send immediate phone notification:', e);
      return null;
    }
  },

  /**
   * Schedule a native phone alert at a future trigger time
   */
  async schedulePhoneAlert(triggerDate: Date, title: string, body: string, data?: any): Promise<string | null> {
    try {
      if (!Notifications) return null;
      const now = Date.now();
      const triggerMs = triggerDate.getTime();
      const secondsUntil = Math.floor((triggerMs - now) / 1000);
      if (secondsUntil <= 0) return null;

      await this.requestDeviceNotificationPermission();
      const notifId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          data,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        },
      });
      return notifId;
    } catch (e) {
      console.warn('Failed to schedule native phone alert:', e);
      return null;
    }
  },

  /**
   * Schedule one or more order reminders based on order pickup/delivery time.
   * Calculates the exact trigger timestamp by subtracting the offset:
   * (e.g. delivery at 2:00 PM with '15_min' -> trigger at 1:45 PM).
   */
  async scheduleOrderReminder(order: CakeOrder): Promise<void> {
    if (!order.reminderEnabled) {
      await this.cancelOrderReminder(order.id);
      return;
    }

    // Cancel existing native phone alerts for this order to avoid duplicates
    await this.cancelOrderReminder(order.id);

    const remindersObj = order.reminders || {};

    // 1. Standard Offset Reminders from `reminders` map (e.g. '15_min', '1_hour')
    const timingsToSchedule = Object.keys(remindersObj).filter((k) =>
      ['15_min', '1_hour', '2_hours', '1_day', 'on_time'].includes(k)
    ) as ReminderTiming[];

    const orderTime = new Date(order.deliveryDate).getTime();
    const newNotifications: InAppNotification[] = [];

    for (const timing of (timingsToSchedule.length > 0 ? timingsToSchedule : (['1_hour'] as ReminderTiming[]))) {
      const offsetMs = this.getTimingOffsetMs(timing);
      const triggerTimestamp = remindersObj[timing]
        ? new Date(remindersObj[timing]).getTime()
        : orderTime - offsetMs;
      const triggerDate = new Date(triggerTimestamp);
      const timingLabel = this.getTimingDisplay(timing);
      const title = `🎂 SweetBake Alert: ${order.customerName}`;
      const message = `${order.fulfillmentType || 'Pickup'} due for ${order.customerName} (${timingLabel})`;

      // Schedule native OS phone banner & ringtone
      let systemNotificationId: string | undefined;
      if (triggerTimestamp > Date.now()) {
        const sysId = await this.schedulePhoneAlert(triggerDate, title, message, {
          orderId: order.id,
          timing,
        });
        if (sysId) systemNotificationId = sysId;
      }

      newNotifications.push({
        id: `remind-${order.id}-${timing}`,
        orderId: order.id,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        triggerTime: triggerDate.toISOString(),
        deliveryDate: order.deliveryDate,
        fulfillmentType: order.fulfillmentType || 'Pickup',
        location: order.location,
        message,
        timing,
        timingLabel,
        isRead: false,
        createdAt: new Date().toISOString(),
        systemNotificationId,
      });
    }

    // 2. Custom Date & Time Alerts from `reminders` map (e.g. 'Custom Alert 1')
    const customEntries = Object.entries(remindersObj).filter(
      ([k]) => k.startsWith('Custom Alert') || k.startsWith('custom_')
    );

    for (let idx = 0; idx < customEntries.length; idx++) {
      const [customKey, customIso] = customEntries[idx];
      const customDate = new Date(customIso);
      if (!isNaN(customDate.getTime())) {
        const timingLabel = customDate.toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });

        const title = `🎂 SweetBake Alert: ${order.customerName}`;
        const message = `Order reminder for ${order.customerName} (${timingLabel})`;

        // Schedule native phone alert
        let systemNotificationId: string | undefined;
        if (customDate.getTime() > Date.now()) {
          const sysId = await this.schedulePhoneAlert(customDate, title, message, {
            orderId: order.id,
            customIso,
          });
          if (sysId) systemNotificationId = sysId;
        }

        newNotifications.push({
          id: `remind-${order.id}-${customKey.replace(/\s+/g, '-').toLowerCase()}`,
          orderId: order.id,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          triggerTime: customDate.toISOString(),
          deliveryDate: order.deliveryDate,
          fulfillmentType: order.fulfillmentType || 'Pickup',
          location: order.location,
          message,
          timing: 'custom',
          timingLabel,
          isRead: false,
          createdAt: new Date().toISOString(),
          systemNotificationId,
        });
      }
    }

    const current = await this.getAllReminders();
    // Remove old reminders for this order and merge in the new multi-reminders
    const updated = [...newNotifications, ...current.filter((n) => n.orderId !== order.id)];
    await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
  },

  async cancelOrderReminder(orderId: string): Promise<void> {
    const current = await this.getAllReminders();
    // Cancel scheduled native OS phone notifications
    for (const notif of current) {
      if (notif.orderId === orderId && notif.systemNotificationId && Notifications) {
        try {
          await Notifications.cancelScheduledNotificationAsync(notif.systemNotificationId);
        } catch {
          // Ignore cancellation errors
        }
      }
    }
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

