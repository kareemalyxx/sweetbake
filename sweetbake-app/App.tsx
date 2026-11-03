import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CakeOrder, GeneralRequirement, RequirementCategory, OrderStatus } from './src/types';
import { StorageService } from './src/services/storage';
import { NotificationService, InAppNotification } from './src/services/notifications';
import { Theme } from './src/theme';
import { triggerHaptic } from './src/services/haptics';

// Screens
import { DashboardScreen } from './src/screens/DashboardScreen';
import { CalendarScreen } from './src/screens/CalendarScreen';
import { BusinessNeedsScreen } from './src/screens/BusinessNeedsScreen';

export default function App() {
  const [activeTab, setActiveTab] = useState<'Orders' | 'Schedule' | 'Checklist'>('Orders');
  const [orders, setOrders] = useState<CakeOrder[]>([]);
  const [requirements, setRequirements] = useState<GeneralRequirement[]>([]);

  // In-App Notification Center
  const [dueNotifications, setDueNotifications] = useState<InAppNotification[]>([]);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [allReminders, setAllReminders] = useState<InAppNotification[]>([]);

  useEffect(() => {
    loadData();
    checkReminders();
    const interval = setInterval(checkReminders, 20000); // Check every 20 seconds
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    const fetchedOrders = await StorageService.getOrders();
    const fetchedReqs = await StorageService.getRequirements();
    setOrders(fetchedOrders);
    setRequirements(fetchedReqs);
  };

  const checkReminders = async () => {
    const due = await NotificationService.getDueReminders();
    const all = await NotificationService.getAllReminders();
    setDueNotifications(due);
    setAllReminders(all);
  };

  // Orders State Handlers
  const handleSaveOrder = async (orderData: Partial<CakeOrder>) => {
    let updatedOrders: CakeOrder[];
    let targetOrderId = orderData.id;

    const totalVal = orderData.quotedPrice ?? 85;
    const downVal = orderData.downPayment ?? 0;
    const remainingVal = Math.max(0, totalVal - downVal);

    if (orderData.id) {
      // Edit existing
      updatedOrders = orders.map((o) =>
        o.id === orderData.id
          ? ({
              ...o,
              ...orderData,
              quotedPrice: totalVal,
              downPayment: downVal,
              remainingPayment: remainingVal,
            } as CakeOrder)
          : o
      );
    } else {
      // Add new
      targetOrderId = `ord-${Date.now()}`;
      const newOrder: CakeOrder = {
        id: targetOrderId,
        customerName: orderData.customerName || 'Anonymous',
        deliveryDate: orderData.deliveryDate || new Date().toISOString(),
        cakeType: orderData.cakeType || 'Celebration Cake',
        shape: orderData.shape || 'Round',
        flavor: orderData.flavor || 'Vanilla Bean & Berry',
        addons: orderData.addons || [],
        customRequirements: orderData.customRequirements || '',
        status: orderData.status || 'Pending',
        quotedPrice: totalVal,
        downPayment: downVal,
        remainingPayment: remainingVal,
        fulfillmentType: orderData.fulfillmentType || 'Pickup',
        location: orderData.location || '',
        reminderEnabled: Boolean(orderData.reminderEnabled),
        reminderTiming: orderData.reminderTiming || '1_hour',
        referenceImages: orderData.referenceImages || [],
        createdAt: new Date().toISOString(),
      };
      updatedOrders = [newOrder, ...orders];
    }
    setOrders(updatedOrders);
    await StorageService.saveOrders(updatedOrders);

    // Schedule or update In-App notification reminder
    const savedOrder = updatedOrders.find((o) => o.id === targetOrderId);
    if (savedOrder) {
      await NotificationService.scheduleOrderReminder(savedOrder);
      await checkReminders();
    }

    // Synchronize Add-ons with Checklist (Business Needs)
    if (orderData.addons && orderData.addons.length > 0) {
      const clientName = orderData.customerName || 'Cake Order';
      let currentReqs = [...requirements];

      for (const addon of orderData.addons) {
        const itemTitle = `${addon} (for ${clientName})`;
        // Check if already in requirements
        const exists = currentReqs.some(
          (r) =>
            r.category === 'Add-ons' &&
            (r.title === itemTitle || (r.orderId === targetOrderId && r.title.startsWith(addon)))
        );
        if (!exists) {
          const newReq: GeneralRequirement = {
            id: `addon-req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            title: itemTitle,
            category: 'Add-ons',
            isCompleted: false,
            orderId: targetOrderId,
            createdAt: new Date().toISOString(),
          };
          currentReqs = [newReq, ...currentReqs];
        }
      }

      setRequirements(currentReqs);
      await StorageService.saveRequirements(currentReqs);
    }
  };

  const handleDeleteOrder = async (id: string) => {
    const updated = orders.filter((o) => o.id !== id);
    setOrders(updated);
    await StorageService.saveOrders(updated);

    // Cancel notifications linked to this order
    await NotificationService.cancelOrderReminder(id);
    await checkReminders();

    // Also remove any linked add-on checklist items
    const updatedReqs = requirements.filter((r) => r.orderId !== id);
    if (updatedReqs.length !== requirements.length) {
      setRequirements(updatedReqs);
      await StorageService.saveRequirements(updatedReqs);
    }
  };

  const handleAdvanceStatus = async (id: string) => {
    const nextMap: Record<OrderStatus, OrderStatus> = {
      Pending: 'Baking',
      Baking: 'Decorating',
      Decorating: 'Delivered',
      Delivered: 'Delivered',
    };

    triggerHaptic.medium();
    const updated = orders.map((o) => {
      if (o.id === id) {
        return { ...o, status: nextMap[o.status] };
      }
      return o;
    });
    setOrders(updated);
    await StorageService.saveOrders(updated);
  };

  // Requirements State Handlers
  const handleToggleRequirement = async (id: string) => {
    const updated = requirements.map((r) =>
      r.id === id ? { ...r, isCompleted: !r.isCompleted } : r
    );
    setRequirements(updated);
    await StorageService.saveRequirements(updated);
  };

  const handleAddRequirement = async (title: string, category: RequirementCategory) => {
    const newReq: GeneralRequirement = {
      id: `req-${Date.now()}`,
      title,
      category,
      isCompleted: false,
      createdAt: new Date().toISOString(),
    };
    const updated = [newReq, ...requirements];
    setRequirements(updated);
    await StorageService.saveRequirements(updated);
  };

  const handleDeleteRequirement = async (id: string) => {
    const updated = requirements.filter((r) => r.id !== id);
    setRequirements(updated);
    await StorageService.saveRequirements(updated);
  };

  const handleClearCompleted = async (category: RequirementCategory) => {
    const updated = requirements.filter((r) => !(r.category === category && r.isCompleted));
    setRequirements(updated);
    await StorageService.saveRequirements(updated);
  };

  const handleDismissNotification = async (notifId: string) => {
    triggerHaptic.selection();
    await NotificationService.markAsRead(notifId);
    await checkReminders();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      {/* Main App Bar */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <Text style={styles.brandEmoji}>🎂</Text>
          <View>
            <Text style={styles.brandTitle}>SweetBake Studio</Text>
            <Text style={styles.brandSubtitle}>Custom Bakery Management</Text>
          </View>
        </View>

        {/* Bell Reminder Notification Center */}
        <TouchableOpacity
          style={styles.bellButton}
          onPress={() => {
            triggerHaptic.selection();
            setShowNotificationModal(true);
          }}
        >
          <Ionicons
            name={dueNotifications.length > 0 ? 'notifications' : 'notifications-outline'}
            size={22}
            color={dueNotifications.length > 0 ? Theme.colors.deepRose : Theme.colors.textDark}
          />
          {dueNotifications.length > 0 && (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>{dueNotifications.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Screen Body */}
      <View style={styles.screenContainer}>
        {activeTab === 'Orders' && (
          <DashboardScreen
            orders={orders}
            onSaveOrder={handleSaveOrder}
            onDeleteOrder={handleDeleteOrder}
            onAdvanceStatus={handleAdvanceStatus}
          />
        )}
        {activeTab === 'Schedule' && (
          <CalendarScreen
            orders={orders}
            onSaveOrder={handleSaveOrder}
            onDeleteOrder={handleDeleteOrder}
            onAdvanceStatus={handleAdvanceStatus}
          />
        )}
        {activeTab === 'Checklist' && (
          <BusinessNeedsScreen
            requirements={requirements}
            onToggleRequirement={handleToggleRequirement}
            onAddRequirement={handleAddRequirement}
            onDeleteRequirement={handleDeleteRequirement}
            onClearCompleted={handleClearCompleted}
          />
        )}
      </View>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => {
            triggerHaptic.selection();
            setActiveTab('Orders');
          }}
        >
          <Ionicons
            name={activeTab === 'Orders' ? 'gift' : 'gift-outline'}
            size={22}
            color={activeTab === 'Orders' ? Theme.colors.deepRose : Theme.colors.textSecondary}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'Orders' && styles.tabLabelActive,
            ]}
          >
            Orders
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => {
            triggerHaptic.selection();
            setActiveTab('Schedule');
          }}
        >
          <Ionicons
            name={activeTab === 'Schedule' ? 'calendar' : 'calendar-outline'}
            size={22}
            color={activeTab === 'Schedule' ? Theme.colors.deepRose : Theme.colors.textSecondary}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'Schedule' && styles.tabLabelActive,
            ]}
          >
            Schedule
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => {
            triggerHaptic.selection();
            setActiveTab('Checklist');
          }}
        >
          <Ionicons
            name={activeTab === 'Checklist' ? 'checkbox' : 'checkbox-outline'}
            size={22}
            color={activeTab === 'Checklist' ? Theme.colors.deepRose : Theme.colors.textSecondary}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'Checklist' && styles.tabLabelActive,
            ]}
          >
            Checklist
          </Text>
        </TouchableOpacity>
      </View>

      {/* In-App Notifications Modal */}
      <Modal
        visible={showNotificationModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.notifModalContainer}>
          <View style={styles.notifHeader}>
            <View>
              <Text style={styles.notifHeaderTitle}>Order Alerts & Reminders</Text>
              <Text style={styles.notifHeaderSubtitle}>
                {dueNotifications.length} active alert{dueNotifications.length === 1 ? '' : 's'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.notifCloseBtn}
              onPress={() => setShowNotificationModal(false)}
            >
              <Ionicons name="close" size={22} color={Theme.colors.textDark} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.notifBody} showsVerticalScrollIndicator={false}>
            {allReminders.length === 0 ? (
              <View style={styles.emptyNotifBox}>
                <Ionicons name="notifications-off-outline" size={44} color={Theme.colors.softLilac} />
                <Text style={styles.emptyNotifTitle}>No Reminders Scheduled</Text>
                <Text style={styles.emptyNotifText}>
                  When you add or edit an order, turn on "Order Reminder Notification" to receive in-app alerts before pickup or delivery!
                </Text>
              </View>
            ) : (
              <>
                {allReminders.map((notif) => {
                  const isDue = new Date(notif.triggerTime).getTime() <= Date.now() && !notif.isRead;
                  const orderDate = new Date(notif.deliveryDate).toLocaleTimeString([], {
                    hour: 'numeric',
                    minute: '2-digit',
                  });
                  return (
                    <View
                      key={notif.id}
                      style={[
                        styles.notifCard,
                        isDue && styles.notifCardDue,
                        notif.isRead && styles.notifCardRead,
                      ]}
                    >
                      <View style={styles.notifCardHeader}>
                        <View style={styles.notifBadgeRow}>
                          <View
                            style={[
                              styles.fulfillmentTag,
                              notif.fulfillmentType === 'Delivery'
                                ? styles.tagDelivery
                                : styles.tagPickup,
                            ]}
                          >
                            <Ionicons
                              name={notif.fulfillmentType === 'Delivery' ? 'car' : 'storefront'}
                              size={12}
                              color="#FFFFFF"
                              style={{ marginRight: 3 }}
                            />
                            <Text style={styles.fulfillmentTagText}>{notif.fulfillmentType}</Text>
                          </View>
                          <Text style={styles.timingBadge}>{notif.timingLabel}</Text>
                        </View>
                        {isDue && (
                          <View style={styles.dueIndicator}>
                            <Text style={styles.dueIndicatorText}>DUE NOW</Text>
                          </View>
                        )}
                      </View>

                      <Text style={styles.notifCustomer}>{notif.customerName}</Text>
                      <Text style={styles.notifMessage}>{notif.message}</Text>
                      <Text style={styles.notifTime}>Scheduled for: {orderDate}</Text>

                      {Boolean(notif.location) && (
                        <View style={styles.notifLocationRow}>
                          <Ionicons name="location-outline" size={12} color={Theme.colors.textSecondary} />
                          <Text style={styles.notifLocationText} numberOfLines={1}>
                            {notif.location}
                          </Text>
                        </View>
                      )}

                      {!notif.isRead && (
                        <TouchableOpacity
                          style={styles.dismissBtn}
                          onPress={() => handleDismissNotification(notif.id)}
                        >
                          <Ionicons name="checkmark-done" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                          <Text style={styles.dismissBtnText}>Dismiss Reminder</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Theme.colors.cream,
  },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: Theme.colors.cream,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandEmoji: {
    fontSize: 26,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Theme.colors.textDark,
  },
  brandSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
  },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Theme.colors.white,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: Theme.colors.deepRose,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  bellBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  screenContainer: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    height: 64,
    backgroundColor: Theme.colors.white,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    paddingBottom: 6,
    paddingTop: 6,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
    marginTop: 2,
  },
  tabLabelActive: {
    color: Theme.colors.deepRose,
    fontWeight: '800',
  },
  notifModalContainer: {
    flex: 1,
    backgroundColor: Theme.colors.cream,
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  notifHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Theme.colors.textDark,
  },
  notifHeaderSubtitle: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
    marginTop: 2,
  },
  notifCloseBtn: {
    padding: 6,
    borderRadius: 18,
    backgroundColor: Theme.colors.cream,
  },
  notifBody: {
    flex: 1,
    padding: 16,
  },
  emptyNotifBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyNotifTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Theme.colors.textDark,
    marginTop: 12,
  },
  emptyNotifText: {
    fontSize: 13,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
  },
  notifCard: {
    backgroundColor: Theme.colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  notifCardDue: {
    borderColor: Theme.colors.deepRose,
    backgroundColor: '#FFF7F9',
    borderWidth: 1.5,
  },
  notifCardRead: {
    opacity: 0.6,
  },
  notifCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  notifBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fulfillmentTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tagDelivery: {
    backgroundColor: Theme.colors.deepRose,
  },
  tagPickup: {
    backgroundColor: Theme.colors.softLilac,
  },
  fulfillmentTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  timingBadge: {
    fontSize: 10,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
    backgroundColor: Theme.colors.cream,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dueIndicator: {
    backgroundColor: '#D81B60',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dueIndicatorText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  notifCustomer: {
    fontSize: 16,
    fontWeight: '700',
    color: Theme.colors.textDark,
  },
  notifMessage: {
    fontSize: 13,
    color: Theme.colors.textSecondary,
    marginTop: 2,
  },
  notifTime: {
    fontSize: 11,
    color: Theme.colors.textDark,
    fontWeight: '600',
    marginTop: 4,
  },
  notifLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  notifLocationText: {
    fontSize: 11,
    color: Theme.colors.textSecondary,
  },
  dismissBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.deepRose,
    borderRadius: 10,
    paddingVertical: 8,
    marginTop: 10,
  },
  dismissBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
