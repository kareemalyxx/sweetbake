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
  Image,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CakeOrder, GeneralRequirement, RequirementCategory, OrderStatus, OrderExpense } from './src/types';
import { StorageService } from './src/services/storage';
import { NotificationService, InAppNotification } from './src/services/notifications';
import { AuthService } from './src/services/auth';
import { FirestoreService } from './src/services/firestore';
import { AuthModal } from './src/components/AuthModal';
import { User } from 'firebase/auth';
import { Theme } from './src/theme';
import { triggerHaptic } from './src/services/haptics';

// Screens
import { DashboardScreen } from './src/screens/DashboardScreen';
import { CalendarScreen } from './src/screens/CalendarScreen';
import { BusinessNeedsScreen } from './src/screens/BusinessNeedsScreen';
import { FinancialSheetScreen } from './src/screens/FinancialSheetScreen';

export default function App() {
  const [activeTab, setActiveTab] = useState<'Orders' | 'Schedule' | 'Finances' | 'Checklist'>('Orders');
  const [orders, setOrders] = useState<CakeOrder[]>([]);
  const [requirements, setRequirements] = useState<GeneralRequirement[]>([]);
  const [expenses, setExpenses] = useState<OrderExpense[]>([]);

  // In-App Notification Center
  const [dueNotifications, setDueNotifications] = useState<InAppNotification[]>([]);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [allReminders, setAllReminders] = useState<InAppNotification[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // App Splash Screen (runs for 3 seconds)
  const [showSplash, setShowSplash] = useState(true);
  const splashOpacity = useState(new Animated.Value(1))[0];

  useEffect(() => {
    const splashTimer = setTimeout(() => {
      Animated.timing(splashOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        setShowSplash(false);
      });
    }, 2600); // fades out so total splash experience is 3.0 seconds

    return () => clearTimeout(splashTimer);
  }, []);

  useEffect(() => {
    const unsub = AuthService.subscribeToAuthChanges((u) => setCurrentUser(u));
    return () => unsub();
  }, []);

  // App re-render trigger for child components reading Theme directly
  const [, setTick] = useState(0);

  useEffect(() => {
    // Initial local cache load
    loadData();

    // Real-time Firestore sync on root collections
    const unsubscribeOrders = FirestoreService.subscribeToOrders(
      (cloudOrders) => {
        if (cloudOrders && cloudOrders.length > 0) {
          setOrders(cloudOrders);
          StorageService.saveOrders(cloudOrders).catch(() => { });
        }
      },
      (err) => console.warn('Firestore orders sync notice:', err.message)
    );

    const unsubscribeReqs = FirestoreService.subscribeToRequirements(
      (cloudReqs) => {
        if (cloudReqs && cloudReqs.length > 0) {
          setRequirements(cloudReqs);
          StorageService.saveRequirements(cloudReqs).catch(() => { });
        }
      },
      (err) => console.warn('Firestore requirements sync notice:', err.message)
    );

    const unsubscribeExpenses = FirestoreService.subscribeToExpenses(
      (cloudExpenses) => {
        if (cloudExpenses) {
          setExpenses(cloudExpenses);
        }
      },
      (err) => console.warn('Firestore expenses sync notice:', err.message)
    );

    checkReminders();
    const interval = setInterval(checkReminders, 20000); // Check every 20 seconds
    return () => {
      clearInterval(interval);
      unsubscribeOrders();
      unsubscribeReqs();
      unsubscribeExpenses();
    };
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

    const totalVal = orderData.quotedPrice ?? 0;
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
        customerPhone: orderData.customerPhone,
        customerInstagram: orderData.customerInstagram,
        deliveryDate: orderData.deliveryDate || new Date().toISOString(),
        cakeType: orderData.cakeType || '',
        shape: orderData.shape || '',
        flavor: orderData.flavor || '',
        addons: orderData.addons || [],
        customRequirements: orderData.customRequirements || '',
        status: orderData.status || 'Pending',
        quotedPrice: totalVal,
        downPayment: downVal,
        remainingPayment: remainingVal,
        fulfillmentType: orderData.fulfillmentType || 'Delivery',
        location: orderData.location || '',
        deliveryCost: orderData.deliveryCost,
        deliveryPerson: orderData.deliveryPerson,
        deliveryPhone: orderData.deliveryPhone,
        deliveryHandoverTime: orderData.deliveryHandoverTime,
        reminderEnabled: Boolean(orderData.reminderEnabled),
        reminders: orderData.reminders || {},
        referenceImages: orderData.referenceImages || [],
        createdAt: new Date().toISOString(),
      };
      updatedOrders = [newOrder, ...orders];
    }
    setOrders(updatedOrders);
    await StorageService.saveOrders(updatedOrders);

    // Direct root collection sync to Firestore
    if (targetOrderId) {
      const orderToSave = updatedOrders.find((o) => o.id === targetOrderId);
      if (orderToSave) {
        FirestoreService.saveOrder(orderToSave).catch((e) =>
          console.warn('Failed to sync order to Firestore:', e)
        );

        // Also save each individual expense to the dedicated /expenses collection
        if (Array.isArray(orderToSave.expenses)) {
          orderToSave.expenses.forEach((exp) => {
            FirestoreService.saveExpense({
              ...exp,
              orderId: targetOrderId,
            }).catch(() => { });
          });
        }

        // Manage Delivery Expense in /expenses:
        // - When delivery cost > 0: create or update the single deterministic expense
        // - When delivery cost is 0, empty, or fulfillment changed from Delivery: remove the delivery expense
        const deliveryExpenseId = `exp-deliv-${targetOrderId}`;
        const hasDeliveryCost =
          orderToSave.fulfillmentType === 'Delivery' &&
          typeof orderToSave.deliveryCost === 'number' &&
          orderToSave.deliveryCost > 0;

        if (hasDeliveryCost) {
          const existingDeliveryExp = expenses.find((e) => e.id === deliveryExpenseId);
          const deliveryExpense: OrderExpense = {
            id: deliveryExpenseId,
            orderId: targetOrderId,
            amount: orderToSave.deliveryCost!,
            notes: orderToSave.deliveryPerson
              ? `Delivery fee (${orderToSave.deliveryPerson})`
              : `Delivery fee for ${orderToSave.customerName}`,
            date: orderToSave.deliveryDate || new Date().toISOString(),
            createdAt: existingDeliveryExp?.createdAt,
          };

          // Save / update in Firestore
          FirestoreService.saveExpense(deliveryExpense).catch((e) =>
            console.warn('Failed to record delivery fee to /expenses:', e)
          );

          // Update in-memory state: replace if existed or prepend
          setExpenses((prev) => [
            deliveryExpense,
            ...prev.filter((e) => e.id !== deliveryExpenseId),
          ]);
        } else {
          // If delivery cost is 0, empty, or not delivery, delete any prior delivery expense
          const existed = expenses.some((e) => e.id === deliveryExpenseId);
          if (existed) {
            setExpenses((prev) => prev.filter((e) => e.id !== deliveryExpenseId));
            FirestoreService.deleteExpense(deliveryExpenseId).catch(() => { });
          }
        }
      }
    }

    // Schedule or update In-App notification reminder
    const savedOrder = updatedOrders.find((o) => o.id === targetOrderId);
    if (savedOrder) {
      await NotificationService.scheduleOrderReminder(savedOrder);
      await checkReminders();
    }

    // Synchronize Add-ons with Checklist (Business Needs)
    // Addons are stored in order as a clean string[] list; boolean status is stored in requirements
    if (targetOrderId) {
      const clientName = orderData.customerName || 'Cake Commission';
      const addonList: string[] = Array.isArray(orderData.addons)
        ? orderData.addons
        : orderData.addons && typeof orderData.addons === 'object'
          ? Object.keys(orderData.addons)
          : [];

      // Clean list of addon titles for comparison
      const trimmedAddons = addonList.map((a) => a.trim()).filter(Boolean);

      // 1. Identify which existing Add-ons in requirements belong to this order
      const existingOrderAddonReqs = requirements.filter(
        (r) => r.orderId === targetOrderId && r.category === 'Add-ons'
      );

      // 2. Detect removed add-ons (existed before in requirements, but not in trimmedAddons)
      const toDeleteReqs = existingOrderAddonReqs.filter((req) => {
        // req.title is typically "${addonName} (${clientName})"
        const matchesCurrentAddon = trimmedAddons.some((addonName) =>
          req.title.startsWith(addonName) || req.id.includes(addonName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase())
        );
        return !matchesCurrentAddon;
      });

      // Delete removed add-ons from Firestore
      toDeleteReqs.forEach((r) => {
        FirestoreService.deleteRequirement(r.id).catch(() => { });
      });

      // 3. Keep requirements without the removed ones
      const toDeleteIds = new Set(toDeleteReqs.map((r) => r.id));
      let currentReqs = requirements.filter((r) => !toDeleteIds.has(r.id));

      // 4. Add any newly added add-ons
      trimmedAddons.forEach((cleanName, idx) => {
        const safeSlug = cleanName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
        const deterministicId = `addon-${targetOrderId}-${safeSlug}-${idx}`;

        const existingIndex = currentReqs.findIndex(
          (r) =>
            r.id === deterministicId ||
            r.reqId === deterministicId ||
            (r.orderId === targetOrderId && r.title.startsWith(cleanName))
        );

        if (existingIndex === -1) {
          const newReq: GeneralRequirement = {
            id: deterministicId,
            reqId: deterministicId,
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

      // Sync active order addon requirements to Firestore
      currentReqs
        .filter((r) => r.orderId === targetOrderId && r.category === 'Add-ons')
        .forEach((req) => {
          FirestoreService.saveRequirement(req).catch(() => { });
        });
    }
  };

  const handleDeleteOrder = async (id: string) => {
    const updated = orders.filter((o) => o.id !== id);
    setOrders(updated);
    await StorageService.saveOrders(updated);

    const advanced = updated.find((o) => o.id === id);
    if (advanced) {
      FirestoreService.saveOrder(advanced).catch((e) =>
        console.warn('Failed to update status in Firestore:', e)
      );
    }

    // Cancel notifications linked to this order
    await NotificationService.cancelOrderReminder(id);
    await checkReminders();

    // Delete from Firestore root collection
    FirestoreService.deleteOrder(id).catch((e) =>
      console.warn('Failed to delete order from Firestore:', e)
    );

    // Remove only checklist items linked to this specific order
    const updatedReqs = requirements.filter((r) => r.orderId !== id);
    if (updatedReqs.length !== requirements.length) {
      setRequirements(updatedReqs);
      await StorageService.saveRequirements(updatedReqs);

      // Remove from Firestore
      requirements
        .filter((r) => r.orderId === id)
        .forEach((r) => FirestoreService.deleteRequirement(r.id).catch(() => { }));
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

    const advanced = updated.find((o) => o.id === id);
    if (advanced) {
      FirestoreService.saveOrder(advanced).catch((e) =>
        console.warn('Failed to update status in Firestore:', e)
      );
    }
  };

  // Requirements State Handlers - strictly targets ONLY the exact item matching id
  const handleToggleRequirement = async (id: string, expenseAmount?: number) => {
    const target = requirements.find((r) => r.id === id || r.reqId === id);
    if (!target) return;

    // If an expense amount is explicitly provided, it is completing the item (isCompleted: true)
    const newCompletedStatus = typeof expenseAmount === 'number' && expenseAmount > 0
      ? true
      : !target.isCompleted;
    const nowIso = new Date().toISOString();

    const updated = requirements.map((r) => {
      if (r.id === id || r.reqId === id) {
        return {
          ...r,
          isCompleted: newCompletedStatus,
          expenseAmount: newCompletedStatus && typeof expenseAmount === 'number' && expenseAmount > 0
            ? expenseAmount
            : r.expenseAmount,
          expenseDate: newCompletedStatus && typeof expenseAmount === 'number' && expenseAmount > 0
            ? nowIso
            : r.expenseDate,
        };
      }
      return r;
    });

    setRequirements(updated);
    await StorageService.saveRequirements(updated);

    const toggled = updated.find((r) => r.id === id || r.reqId === id);
    if (toggled) {
      FirestoreService.saveRequirement(toggled).catch((e) =>
        console.warn('Failed to sync requirement to Firestore:', e)
      );
    }

    // If an expense amount was entered when completing, record it as an expense
    if (newCompletedStatus && typeof expenseAmount === 'number' && expenseAmount > 0) {
      const expenseEntry: OrderExpense = {
        id: `exp-chk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        orderId: target.orderId || undefined,
        amount: expenseAmount,
        notes: target.title,
        date: nowIso,
      };

      // Always persist to the dedicated root `/expenses` collection
      FirestoreService.saveExpense(expenseEntry).catch((e) =>
        console.warn('Failed to save expense to /expenses:', e)
      );

      // Update in-memory and local state for instant real-time financial tracking
      setExpenses((prev) => [expenseEntry, ...prev.filter((e) => e.id !== expenseEntry.id)]);

      if (target.orderId) {
        // Link directly into the corresponding cake commission order in memory/local storage
        const targetOrderId = target.orderId;
        const updatedOrders = orders.map((o) => {
          if (o.id === targetOrderId) {
            const currentExpenses = Array.isArray(o.expenses) ? o.expenses : [];
            return {
              ...o,
              expenses: [...currentExpenses, expenseEntry],
            };
          }
          return o;
        });

        setOrders(updatedOrders);
        await StorageService.saveOrders(updatedOrders);
      }
    }
  };

  const handleAddRequirement = async (title: string, category: RequirementCategory) => {
    const genId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newReq: GeneralRequirement = {
      id: genId,
      reqId: genId,
      title,
      category,
      isCompleted: false,
      createdAt: new Date().toISOString(),
    };
    const updated = [newReq, ...requirements];
    setRequirements(updated);
    await StorageService.saveRequirements(updated);
    FirestoreService.saveRequirement(newReq).catch(() => { });
  };

  const handleDeleteRequirement = async (id: string) => {
    const updated = requirements.filter((r) => r.id !== id);
    setRequirements(updated);
    await StorageService.saveRequirements(updated);
    FirestoreService.deleteRequirement(id).catch(() => { });
  };

  const handleClearCompleted = async (category?: RequirementCategory) => {
    const completedIds = requirements
      .filter((r) => (category ? r.category === category : true) && r.isCompleted)
      .map((r) => r.id);
    const updated = requirements.filter(
      (r) => !(category ? r.category === category && r.isCompleted : r.isCompleted)
    );
    setRequirements(updated);
    await StorageService.saveRequirements(updated);
    completedIds.forEach((id) => FirestoreService.deleteRequirement(id).catch(() => { }));
  };

  const handleDismissNotification = async (notifId: string) => {
    triggerHaptic.selection();
    await NotificationService.markAsRead(notifId);
    await checkReminders();
  };

  const handleDeleteExpense = async (transactionOrExpenseId: string) => {
    triggerHaptic.light();
    // Normalize ID by stripping known prefixes
    const cleanId = transactionOrExpenseId.replace(/^(exp-|req-exp-)/, '');

    // 1. Remove from dedicated `/expenses` state
    const targetExp = expenses.find(
      (e) => e.id === cleanId || e.id === transactionOrExpenseId || e.id === `exp-${cleanId}`
    );
    const targetExpId = targetExp ? targetExp.id : cleanId;
    const updatedExpenses = expenses.filter(
      (e) => e.id !== targetExpId && e.id !== cleanId && e.id !== transactionOrExpenseId
    );
    setExpenses(updatedExpenses);

    FirestoreService.deleteExpense(targetExpId).catch((err) =>
      console.warn('Failed to delete expense from Firestore:', err)
    );

    // 2. Also remove from order.expenses if it originated from an order
    const updatedOrders = orders.map((o) => {
      if (Array.isArray(o.expenses) && o.expenses.some((e) => e.id === cleanId || e.id === targetExpId || e.id === transactionOrExpenseId || `exp-${e.id}` === transactionOrExpenseId)) {
        const filtered = o.expenses.filter((e) => e.id !== cleanId && e.id !== targetExpId && e.id !== transactionOrExpenseId && `exp-${e.id}` !== transactionOrExpenseId);
        const newOrder = { ...o, expenses: filtered };
        FirestoreService.saveOrder(newOrder).catch(() => { });
        return newOrder;
      }
      return o;
    });
    setOrders(updatedOrders);
    await StorageService.saveOrders(updatedOrders);

    // 3. If it originated from a requirement/checklist expense (req-exp-...), reset requirement expense fields
    const targetReqId = transactionOrExpenseId.startsWith('req-exp-')
      ? transactionOrExpenseId.replace(/^req-exp-/, '')
      : cleanId;
    const targetReq = requirements.find((r) => r.id === targetReqId || r.reqId === targetReqId || r.id === cleanId || r.reqId === cleanId);
    if (targetReq && (targetReq.expenseAmount || targetReq.expenseDate)) {
      const updatedReqs = requirements.map((r) => {
        if (r.id === targetReq.id || r.reqId === targetReq.id) {
          const { expenseAmount, expenseDate, ...rest } = r;
          return rest;
        }
        return r;
      });
      setRequirements(updatedReqs);
      await StorageService.saveRequirements(updatedReqs);
      const cleaned = updatedReqs.find((r) => r.id === targetReq.id || r.reqId === targetReq.id);
      if (cleaned) {
        FirestoreService.saveRequirement(cleaned).catch(() => { });
      }
    }
  };

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: Theme.colors.background },
      ]}
    >
      <StatusBar barStyle="dark-content" />

      {/* Main App Bar */}
      <View
        style={[
          styles.topBar,
          {
            backgroundColor: Theme.colors.background,
            borderBottomColor: Theme.colors.border,
          },
        ]}
      >
        <View style={styles.brandRow}>
          <Image
            source={require('./assets/icon.png')}
            style={styles.brandLogoImage}
            resizeMode="cover"
          />
          <View>
            <Text
              style={[styles.brandTitle, { color: Theme.colors.textDark }]}
            >
              SweetBake Studio
            </Text>
            <Text
              style={[
                styles.brandSubtitle,
                { color: Theme.colors.textSecondary },
              ]}
            >
              Single Bakery Kitchen
            </Text>
          </View>
        </View>

        {/* Right Action Icons: Profile & Bell Reminder Notification */}
        <View style={styles.headerRightActions}>
          {/* User Profile / Login Button */}
          <TouchableOpacity
            style={[
              styles.actionIconButton,
              {
                backgroundColor: Theme.colors.card,
                borderColor: currentUser ? '#2E7D32' : Theme.colors.border,
              },
            ]}
            onPress={() => {
              triggerHaptic.selection();
              setShowAuthModal(true);
            }}
          >
            <Ionicons
              name={currentUser ? 'person-circle' : 'person-circle-outline'}
              size={20}
              color={currentUser ? '#2E7D32' : Theme.colors.textDark}
            />
          </TouchableOpacity>

          {/* Bell Reminder Center */}
          <TouchableOpacity
            style={[
              styles.actionIconButton,
              {
                backgroundColor: Theme.colors.card,
                borderColor: Theme.colors.border,
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
                  ? Theme.colors.deepRose
                  : Theme.colors.textDark
              }
            />
            {dueNotifications.length > 0 && (
              <View
                style={[
                  styles.bellBadge,
                  { backgroundColor: Theme.colors.deepRose },
                ]}
              >
                <Text style={styles.bellBadgeText}>{dueNotifications.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Screen Body with dynamic background matching Dark Mode */}
      <View
        style={[
          styles.screenContainer,
          { backgroundColor: Theme.colors.background },
        ]}
      >
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
        {activeTab === 'Finances' && (
          <FinancialSheetScreen
            orders={orders}
            requirements={requirements}
            expenses={expenses}
            onDeleteExpense={handleDeleteExpense}
          />
        )}
        {activeTab === 'Checklist' && (
          <BusinessNeedsScreen
            requirements={requirements}
            orders={orders}
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
            backgroundColor: Theme.colors.card,
            borderTopColor: Theme.colors.border,
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
                ? Theme.colors.deepRose
                : Theme.colors.textSecondary
            }
          />
          <Text
            style={[
              styles.tabLabel,
              { color: Theme.colors.textSecondary },
              activeTab === 'Orders' && {
                color: Theme.colors.deepRose,
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
                ? Theme.colors.deepRose
                : Theme.colors.textSecondary
            }
          />
          <Text
            style={[
              styles.tabLabel,
              { color: Theme.colors.textSecondary },
              activeTab === 'Schedule' && {
                color: Theme.colors.deepRose,
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
            setActiveTab('Finances');
          }}
        >
          <Ionicons
            name={activeTab === 'Finances' ? 'receipt' : 'receipt-outline'}
            size={22}
            color={
              activeTab === 'Finances'
                ? Theme.colors.deepRose
                : Theme.colors.textSecondary
            }
          />
          <Text
            style={[
              styles.tabLabel,
              { color: Theme.colors.textSecondary },
              activeTab === 'Finances' && {
                color: Theme.colors.deepRose,
                fontWeight: '800',
              },
            ]}
          >
            Finances
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
                ? Theme.colors.deepRose
                : Theme.colors.textSecondary
            }
          />
          <Text
            style={[
              styles.tabLabel,
              { color: Theme.colors.textSecondary },
              activeTab === 'Checklist' && {
                color: Theme.colors.deepRose,
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
            { backgroundColor: Theme.colors.background },
          ]}
        >
          <View
            style={[
              styles.notifHeader,
              {
                backgroundColor: Theme.colors.card,
                borderBottomColor: Theme.colors.border,
              },
            ]}
          >
            <View>
              <Text
                style={[
                  styles.notifHeaderTitle,
                  { color: Theme.colors.textDark },
                ]}
              >
                Order Alerts & Reminders
              </Text>
              <Text
                style={[
                  styles.notifHeaderSubtitle,
                  { color: Theme.colors.textSecondary },
                ]}
              >
                {dueNotifications.length} active alert{dueNotifications.length === 1 ? '' : 's'}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.notifCloseBtn,
                { backgroundColor: Theme.colors.warmIvory },
              ]}
              onPress={() => setShowNotificationModal(false)}
            >
              <Ionicons name="close" size={22} color={Theme.colors.textDark} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.notifBody} showsVerticalScrollIndicator={false}>
            {allReminders.length === 0 ? (
              <View style={styles.emptyNotifBox}>
                <Ionicons
                  name="notifications-off-outline"
                  size={44}
                  color={Theme.colors.softLilac}
                />
                <Text
                  style={[
                    styles.emptyNotifTitle,
                    { color: Theme.colors.textDark },
                  ]}
                >
                  No Reminders Scheduled
                </Text>
                <Text
                  style={[
                    styles.emptyNotifText,
                    { color: Theme.colors.textSecondary },
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
                          backgroundColor: Theme.colors.card,
                          borderColor: Theme.colors.border,
                        },
                        isDue && {
                          borderColor: Theme.colors.deepRose,
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
                                ? { backgroundColor: Theme.colors.deepRose }
                                : { backgroundColor: Theme.colors.softLilac },
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
                                backgroundColor: Theme.colors.warmIvory,
                                color: Theme.colors.textSecondary,
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
                          { color: Theme.colors.textDark },
                        ]}
                      >
                        {notif.customerName}
                      </Text>
                      <Text
                        style={[
                          styles.notifMessage,
                          { color: Theme.colors.textSecondary },
                        ]}
                      >
                        {notif.message}
                      </Text>
                      <Text
                        style={[
                          styles.notifTime,
                          { color: Theme.colors.textDark },
                        ]}
                      >
                        Scheduled for: {orderDate}
                      </Text>

                      {Boolean(notif.location) && (
                        <View style={styles.notifLocationRow}>
                          <Ionicons
                            name="location-outline"
                            size={12}
                            color={Theme.colors.textSecondary}
                          />
                          <Text
                            style={[
                              styles.notifLocationText,
                              { color: Theme.colors.textSecondary },
                            ]}
                            numberOfLines={1}
                          >
                            {notif.location}
                          </Text>
                        </View>
                      )}

                      <View style={styles.notifActionRow}>
                        {/* WhatsApp Notification Button */}
                        <TouchableOpacity
                          style={styles.whatsAppBtn}
                          onPress={() => {
                            triggerHaptic.selection();
                            const matchedOrder = orders.find((o) => o.id === notif.orderId);
                            NotificationService.sendWhatsAppNotification({
                              customerName: notif.customerName,
                              customerPhone: notif.customerPhone || matchedOrder?.customerPhone,
                              deliveryDate: notif.deliveryDate,
                              cakeType: matchedOrder?.cakeType,
                              shape: matchedOrder?.shape,
                              flavor: matchedOrder?.flavor,
                              fulfillmentType: notif.fulfillmentType,
                              location: notif.location,
                              quotedPrice: matchedOrder?.quotedPrice,
                              remainingPayment: matchedOrder?.remainingPayment,
                            });
                          }}
                        >
                          <Ionicons
                            name="logo-whatsapp"
                            size={15}
                            color="#FFFFFF"
                            style={{ marginRight: 5 }}
                          />
                          <Text style={styles.whatsAppBtnText}>
                            WhatsApp Alert
                          </Text>
                        </TouchableOpacity>

                        {!notif.isRead && (
                          <TouchableOpacity
                            style={[
                              styles.dismissBtn,
                              { backgroundColor: Theme.colors.deepRose },
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
                              Dismiss
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Firebase Auth Modal */}
      <AuthModal
        visible={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        currentUserEmail={currentUser ? currentUser.email : null}
      />

      {/* 3-Second App Splash Screen */}
      {showSplash && (
        <Animated.View style={[styles.splashOverlay, { opacity: splashOpacity }]}>
          <StatusBar barStyle="light-content" />
          <Image
            source={require('./assets/custom-splash.jpg')}
            style={styles.splashImage}
            resizeMode="cover"
          />
          <View style={styles.splashGradientOverlay}>
            <Image
              source={require('./assets/icon.png')}
              style={styles.splashLogoBadge}
              resizeMode="cover"
            />
            <Text style={styles.splashBrandTitle}>SweetBake Studio</Text>
            <Text style={styles.splashBrandSubtitle}>Crafted with Love & Sugar</Text>
          </View>
        </Animated.View>
      )}
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
    gap: 10,
  },
  brandLogoImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: Theme.colors.deepRose,
  },
  brandTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  brandSubtitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
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
    height: 68,
    borderTopWidth: 1,
    paddingBottom: 8,
    paddingTop: 8,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '700',
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
  notifActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  whatsAppBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    borderRadius: 10,
    paddingVertical: 9,
  },
  whatsAppBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  dismissBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 9,
  },
  dismissBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  splashOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000000',
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashImage: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  splashGradientOverlay: {
    position: 'absolute',
    bottom: 60,
    left: 20,
    right: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  splashLogoBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    marginBottom: 10,
  },
  splashBrandTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  splashBrandSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 4,
  },
});
