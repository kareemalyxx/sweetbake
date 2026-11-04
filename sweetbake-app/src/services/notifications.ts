import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Alert, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { CakeOrder, ReminderTiming } from '../types';

// Configure system notification handler for phone alerts
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch (e) {
  // Handled safely in web/unsupported environments
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

  /**
   * Request device notification permissions for native phone alerts
   */
  async requestDeviceNotificationPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') return false;
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

    // Determine the list of timings chosen (supports multiple)
    let timingsToSchedule: ReminderTiming[] = [];
    if (Array.isArray(order.reminderTimings) && order.reminderTimings.length > 0) {
      timingsToSchedule = order.reminderTimings;
    } else if (order.reminderTiming) {
      timingsToSchedule = [order.reminderTiming];
    } else {
      timingsToSchedule = ['1_hour'];
    }

    const orderTime = new Date(order.deliveryDate).getTime();
    const newNotifications: InAppNotification[] = [];

    for (const timing of timingsToSchedule) {
      const offsetMs = this.getTimingOffsetMs(timing);
      // Precise timestamp calculation: e.g. 2:00 PM (14:00) - 15 min = 1:45 PM (13:45)
      const triggerTimestamp = orderTime - offsetMs;
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

    // Also schedule any custom specific date & time reminders picked by user
    if (Array.isArray(order.customReminderDates) && order.customReminderDates.length > 0) {
      for (let idx = 0; idx < order.customReminderDates.length; idx++) {
        const customIso = order.customReminderDates[idx];
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
            id: `remind-${order.id}-custom-${idx}`,
            orderId: order.id,
            customerName: order.customerName,
            customerPhone: order.customerPhone,
            triggerTime: customDate.toISOString(),
            deliveryDate: order.deliveryDate,
            fulfillmentType: order.fulfillmentType || 'Pickup',
            location: order.location,
            message,
            timing: 'custom',
            timingLabel: `At ${timingLabel}`,
            isRead: false,
            createdAt: new Date().toISOString(),
            systemNotificationId,
          });
        }
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
      if (notif.orderId === orderId && notif.systemNotificationId) {
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

