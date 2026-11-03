import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CakeOrder, GeneralRequirement, RequirementCategory, OrderStatus } from './src/types';
import { StorageService } from './src/services/storage';
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const fetchedOrders = await StorageService.getOrders();
    const fetchedReqs = await StorageService.getRequirements();
    setOrders(fetchedOrders);
    setRequirements(fetchedReqs);
  };

  // Orders State Handlers
  const handleSaveOrder = async (orderData: Partial<CakeOrder>) => {
    let updatedOrders: CakeOrder[];
    let targetOrderId = orderData.id;

    if (orderData.id) {
      // Edit existing
      updatedOrders = orders.map((o) =>
        o.id === orderData.id ? ({ ...o, ...orderData } as CakeOrder) : o
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
        quotedPrice: orderData.quotedPrice || 0,
        referenceImages: orderData.referenceImages || [],
        createdAt: new Date().toISOString(),
      };
      updatedOrders = [newOrder, ...orders];
    }
    setOrders(updatedOrders);
    await StorageService.saveOrders(updatedOrders);

    // Synchronize Add-ons with Checklist (Business Needs)
    if (orderData.addons && orderData.addons.length > 0) {
      const clientName = orderData.customerName || 'Cake Order';
      let currentReqs = [...requirements];

      for (const addon of orderData.addons) {
        const itemTitle = `${addon} (for ${clientName})`;
        // Check if already in requirements
        const exists = currentReqs.some(
          (r) => r.category === 'Add-ons' && (r.title === itemTitle || (r.orderId === targetOrderId && r.title.startsWith(addon)))
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
});
