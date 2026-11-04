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
import { LightTheme, DarkTheme } from './src/theme';
import { triggerHaptic } from './src/services/haptics';

// Screens
import { DashboardScreen } from './src/screens/DashboardScreen';
import { CalendarScreen } from './src/screens/CalendarScreen';
import { BusinessNeedsScreen } from './src/screens/BusinessNeedsScreen';

export default function App() {
  const [activeTab, setActiveTab] = useState<'Orders' | 'Schedule' | 'Checklist'>('Orders');
  const [orders, setOrders] = useState<CakeOrder[]>([]);
  const [requirements, setRequirements] = useState<GeneralRequirement[]>([]);

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState(false);
  const currentTheme = isDarkMode ? DarkTheme : LightTheme;

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

  const toggleDarkMode = () => {
    triggerHaptic.selection();
    setIsDarkMode((prev) => !prev);
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

    // EACH addon has its own unique, independent ID so checking one does NOT check or delete the others!
    if (orderData.addons && orderData.addons.length > 0) {
      const clientName = orderData.customerName || 'Cake Commission';
      let currentReqs = [...requirements];

      orderData.addons.forEach((addon, idx) => {
        const cleanName = addon.trim();
        const safeSlug = cleanName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
        const deterministicId = `addon-${targetOrderId}-${safeSlug}-${idx}`;

        const exists = currentReqs.some(
          (r) => r.id === deterministicId || (r.orderId === targetOrderId && r.title.startsWith(cleanName))
        );

        if (!exists) {
          const newReq: GeneralRequirement = {
            id: deterministicId,
            title: `${cleanName} (${clientName})`,
            category: 'Add-ons',
            isCompleted: false,
            orderId: targetOrderId,
            createdAt: new Date().toISOString(),
          };
          currentReqs = [newReq, ...currentReqs];
        }
      });

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

    // Remove only checklist items linked to this specific order
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

  // Requirements State Handlers - strictly targets ONLY the exact item matching id
  const handleToggleRequirement = async (id: string) => {
    const updated = requirements.map((r) =>
      r.id === id ? { ...r, isCompleted: !r.isCompleted } : r
    );
    setRequirements(updated);
    await StorageService.saveRequirements(updated);
  };

  const handleAddRequirement = async (title: string, category: RequirementCategory) => {
    const newReq: GeneralRequirement = {
      id: `req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
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
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: currentTheme.colors.background },
      ]}
    >
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      {/* Main App Bar with Dark Mode Toggle */}
      <View
        style={[
          styles.topBar,
          {
            backgroundColor: currentTheme.colors.background,
            borderBottomColor: currentTheme.colors.border,
          },
        ]}
      >
        <View style={styles.brandRow}>
          <Text style={styles.brandEmoji}>🎂</Text>
          <View>
            <Text
              style={[styles.brandTitle, { color: currentTheme.colors.textDark }]}
            >
              SweetBake Studio
            </Text>
            <Text
              style={[
                styles.brandSubtitle,
                { color: currentTheme.colors.textSecondary },
              ]}
            >
              Single Bakery Kitchen
            </Text>
          </View>
        </View>

        {/* Right Action Icons: Dark Mode Toggle & Bell Reminder Notification */}
        <View style={styles.headerRightActions}>
          {/* Dark Mode Toggle Pill */}
          <TouchableOpacity
            style={[
              styles.actionIconButton,
              {
                backgroundColor: currentTheme.colors.card,
                borderColor: currentTheme.colors.border,
              },
            ]}
            onPress={toggleDarkMode}
          >
            <Ionicons
              name={isDarkMode ? 'sunny' : 'moon'}
              size={18}
              color={isDarkMode ? '#F59E0B' : currentTheme.colors.textDark}
            />
          </TouchableOpacity>

          {/* Bell Reminder Center */}
          <TouchableOpacity
            style={[
              styles.actionIconButton,
              {
                backgroundColor: currentTheme.colors.card,
                borderColor: currentTheme.colors.border,
              },
            ]}
            onPress={() => {
              triggerHaptic.selection();
              setShowNotificationModal(true);
            }}
          >
            <Ionicons
              name={dueNotifications.length > 0 ? 'notifications' : 'notifications-outline'}
              size={19}
              color={
                dueNotifications.length > 0
                  ? currentTheme.colors.deepRose
                  : currentTheme.colors.textDark
              }
            />
            {dueNotifications.length > 0 && (
              <View
                style={[
                  styles.bellBadge,
                  { backgroundColor: currentTheme.colors.deepRose },
                ]}
              >
                <Text style={styles.bellBadgeText}>{dueNotifications.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
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
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: currentTheme.colors.card,
            borderTopColor: currentTheme.colors.border,
          },
        ]}
      >
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
            color={
              activeTab === 'Orders'
                ? currentTheme.colors.deepRose
                : currentTheme.colors.textSecondary
            }
          />
          <Text
            style={[
              styles.tabLabel,
              { color: currentTheme.colors.textSecondary },
              activeTab === 'Orders' && {
                color: currentTheme.colors.deepRose,
                fontWeight: '800',
              },
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
            color={
              activeTab === 'Schedule'
                ? currentTheme.colors.deepRose
                : currentTheme.colors.textSecondary
            }
          />
          <Text
            style={[
              styles.tabLabel,
              { color: currentTheme.colors.textSecondary },
              activeTab === 'Schedule' && {
                color: currentTheme.colors.deepRose,
                fontWeight: '800',
              },
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
            color={
              activeTab === 'Checklist'
                ? currentTheme.colors.deepRose
                : currentTheme.colors.textSecondary
            }
          />
          <Text
            style={[
              styles.tabLabel,
              { color: currentTheme.colors.textSecondary },
              activeTab === 'Checklist' && {
                color: currentTheme.colors.deepRose,
                fontWeight: '800',
              },
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
        <SafeAreaView
          style={[
            styles.notifModalContainer,
            { backgroundColor: currentTheme.colors.background },
          ]}
        >
          <View
            style={[
              styles.notifHeader,
              {
                backgroundColor: currentTheme.colors.card,
                borderBottomColor: currentTheme.colors.border,
              },
            ]}
          >
            <View>
              <Text
                style={[
                  styles.notifHeaderTitle,
                  { color: currentTheme.colors.textDark },
                ]}
              >
                Order Alerts & Reminders
              </Text>
              <Text
                style={[
                  styles.notifHeaderSubtitle,
                  { color: currentTheme.colors.textSecondary },
                ]}
              >
                {dueNotifications.length} active alert{dueNotifications.length === 1 ? '' : 's'}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.notifCloseBtn,
                { backgroundColor: currentTheme.colors.warmIvory },
              ]}
              onPress={() => setShowNotificationModal(false)}
            >
              <Ionicons name="close" size={22} color={currentTheme.colors.textDark} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.notifBody} showsVerticalScrollIndicator={false}>
            {allReminders.length === 0 ? (
              <View style={styles.emptyNotifBox}>
                <Ionicons
                  name="notifications-off-outline"
                  size={44}
                  color={currentTheme.colors.softLilac}
                />
                <Text
                  style={[
                    styles.emptyNotifTitle,
                    { color: currentTheme.colors.textDark },
                  ]}
                >
                  No Reminders Scheduled
                </Text>
                <Text
                  style={[
                    styles.emptyNotifText,
                    { color: currentTheme.colors.textSecondary },
                  ]}
                >
                  Turn on "Order Reminder Notification" in any order to receive
                  in-app alerts before pickup or delivery!
                </Text>
              </View>
            ) : (
              <>
                {allReminders.map((notif) => {
                  const isDue =
                    new Date(notif.triggerTime).getTime() <= Date.now() &&
                    !notif.isRead;
                  const orderDate = new Date(notif.deliveryDate).toLocaleTimeString([], {
                    hour: 'numeric',
                    minute: '2-digit',
                  });
                  return (
                    <View
                      key={notif.id}
                      style={[
                        styles.notifCard,
                        {
                          backgroundColor: currentTheme.colors.card,
                          borderColor: currentTheme.colors.border,
                        },
                        isDue && {
                          borderColor: currentTheme.colors.deepRose,
                          borderWidth: 1.5,
                        },
                        notif.isRead && styles.notifCardRead,
                      ]}
                    >
                      <View style={styles.notifCardHeader}>
                        <View style={styles.notifBadgeRow}>
                          <View
                            style={[
                              styles.fulfillmentTag,
                              notif.fulfillmentType === 'Delivery'
                                ? { backgroundColor: currentTheme.colors.deepRose }
                                : { backgroundColor: currentTheme.colors.softLilac },
                            ]}
                          >
                            <Ionicons
                              name={
                                notif.fulfillmentType === 'Delivery'
                                  ? 'car'
                                  : 'storefront'
                              }
                              size={12}
                              color="#FFFFFF"
                              style={{ marginRight: 3 }}
                            />
                            <Text style={styles.fulfillmentTagText}>
                              {notif.fulfillmentType}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.timingBadge,
                              {
                                backgroundColor: currentTheme.colors.warmIvory,
                                color: currentTheme.colors.textSecondary,
                              },
                            ]}
                          >
                            {notif.timingLabel}
                          </Text>
                        </View>
                        {isDue && (
                          <View style={styles.dueIndicator}>
                            <Text style={styles.dueIndicatorText}>DUE NOW</Text>
                          </View>
                        )}
                      </View>

                      <Text
                        style={[
                          styles.notifCustomer,
                          { color: currentTheme.colors.textDark },
                        ]}
                      >
                        {notif.customerName}
                      </Text>
                      <Text
                        style={[
                          styles.notifMessage,
                          { color: currentTheme.colors.textSecondary },
                        ]}
                      >
                        {notif.message}
                      </Text>
                      <Text
                        style={[
                          styles.notifTime,
                          { color: currentTheme.colors.textDark },
                        ]}
                      >
                        Scheduled for: {orderDate}
                      </Text>

                      {Boolean(notif.location) && (
                        <View style={styles.notifLocationRow}>
                          <Ionicons
                            name="location-outline"
                            size={12}
                            color={currentTheme.colors.textSecondary}
                          />
                          <Text
                            style={[
                              styles.notifLocationText,
                              { color: currentTheme.colors.textSecondary },
                            ]}
                            numberOfLines={1}
                          >
                            {notif.location}
                          </Text>
                        </View>
                      )}

                      {!notif.isRead && (
                        <TouchableOpacity
                          style={[
                            styles.dismissBtn,
                            { backgroundColor: currentTheme.colors.deepRose },
                          ]}
                          onPress={() => handleDismissNotification(notif.id)}
                        >
                          <Ionicons
                            name="checkmark-done"
                            size={14}
                            color="#FFFFFF"
                            style={{ marginRight: 4 }}
                          />
                          <Text style={styles.dismissBtnText}>
                            Dismiss Reminder
                          </Text>
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
  },
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandEmoji: {
    fontSize: 24,
  },
  brandTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  brandSubtitle: {
    fontSize: 10,
    fontWeight: '600',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  bellBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  screenContainer: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    height: 64,
    borderTopWidth: 1,
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
    marginTop: 2,
  },
  notifModalContainer: {
    flex: 1,
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  notifHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  notifHeaderSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  notifCloseBtn: {
    padding: 6,
    borderRadius: 18,
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
    marginTop: 12,
  },
  emptyNotifText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
  },
  notifCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
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
  fulfillmentTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  timingBadge: {
    fontSize: 10,
    fontWeight: '600',
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
  },
  notifMessage: {
    fontSize: 13,
    marginTop: 2,
  },
  notifTime: {
    fontSize: 11,
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
  },
  dismissBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
