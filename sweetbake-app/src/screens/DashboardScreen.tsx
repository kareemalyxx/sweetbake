import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CakeOrder, OrderStatus } from '../types';
import { Theme } from '../theme';
import { OrderRow } from '../components/OrderRow';
import { NextSevenDaysWidget } from '../components/NextSevenDaysWidget';
import { RevenueTracker } from '../components/RevenueTracker';
import { EmptyState } from '../components/EmptyState';
import { OrderModal } from '../components/OrderModal';
import { triggerHaptic } from '../services/haptics';

interface DashboardScreenProps {
  orders: CakeOrder[];
  onSaveOrder: (order: Partial<CakeOrder>) => void;
  onDeleteOrder: (id: string) => void;
  onAdvanceStatus: (id: string) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  orders,
  onSaveOrder,
  onDeleteOrder,
  onAdvanceStatus,
}) => {
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<OrderStatus | 'All'>('All');
  const [selectedDateFilter, setSelectedDateFilter] = useState<Date | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState<CakeOrder | null>(null);

  const filteredOrders = orders
    .filter((o) => {
      // Hide delivered / completed orders when browsing scheduled commissions unless specifically filtering for Delivered
      const matchFilter = selectedFilter === 'All'
        ? o.status !== 'Delivered'
        : o.status === selectedFilter;

      const term = search.toLowerCase().trim();
      const flavorStr = Array.isArray(o.flavor) ? o.flavor.join(' ') : (o.flavor || '');
      const matchSearch =
        !term ||
        o.customerName.toLowerCase().includes(term) ||
        o.cakeType.toLowerCase().includes(term) ||
        flavorStr.toLowerCase().includes(term);

      let matchDate = true;
      if (selectedDateFilter) {
        const od = new Date(o.deliveryDate);
        matchDate =
          od.getFullYear() === selectedDateFilter.getFullYear() &&
          od.getMonth() === selectedDateFilter.getMonth() &&
          od.getDate() === selectedDateFilter.getDate();
      }

      return matchFilter && matchSearch && matchDate;
    })
    .sort((a, b) => new Date(a.deliveryDate).getTime() - new Date(b.deliveryDate).getTime());

  const handleEdit = (order: CakeOrder) => {
    triggerHaptic.light();
    setOrderToEdit(order);
    setIsModalVisible(true);
  };

  const handleCreate = () => {
    triggerHaptic.medium();
    setOrderToEdit(null);
    setIsModalVisible(true);
  };

  const handleDeletePrompt = (order: CakeOrder) => {
    triggerHaptic.warning();
    Alert.alert(
      'Delete Order',
      `Are you sure you want to remove the commission for ${order.customerName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDeleteOrder(order.id),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchBarContainer}>
        <Ionicons name="search" size={16} color={Theme.colors.textSecondary} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search client, flavor, cake style..."
          placeholderTextColor={Theme.colors.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={Theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Chips */}
      <View style={{ maxHeight: 46 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {(['All', 'Pending', 'Baking', 'Decorating', 'Delivered'] as const).map((status) => {
            const isSelected = selectedFilter === status;
            const count =
              status === 'All'
                ? orders.filter((o) => o.status !== 'Delivered').length
                : orders.filter((o) => o.status === status).length;

            return (
              <TouchableOpacity
                key={status}
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                onPress={() => {
                  triggerHaptic.selection();
                  setSelectedFilter(status);
                }}
              >
                <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                  {status} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Timeline List */}
      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <NextSevenDaysWidget
              orders={orders}
              selectedDateFilter={selectedDateFilter}
              onSelectDate={(date) => {
                setSelectedDateFilter(date);
              }}
            />
            <RevenueTracker orders={orders} />
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {selectedDateFilter
                  ? `Orders for ${selectedDateFilter.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} (${filteredOrders.length})`
                  : `Scheduled Commissions (${filteredOrders.length})`}
              </Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <EmptyState
            title={orders.length === 0 ? 'No Cake Orders Yet' : 'No Matching Orders'}
            subtitle={
              orders.length === 0
                ? 'Tap the "+" button below to book your first custom cake order.'
                : 'Try adjusting your search terms or filter selection.'
            }
            actionTitle={orders.length === 0 ? 'Add First Order' : undefined}
            onAction={orders.length === 0 ? handleCreate : undefined}
          />
        }
        renderItem={({ item }) => (
          <OrderRow
            order={item}
            onPress={() => handleEdit(item)}
            onQuickAdvance={() => onAdvanceStatus(item.id)}
            onDelete={() => handleDeletePrompt(item)}
          />
        )}
      />

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={handleCreate}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Order Create / Edit Modal */}
      <OrderModal
        visible={isModalVisible}
        orderToEdit={orderToEdit}
        onClose={() => setIsModalVisible(false)}
        onSave={onSaveOrder}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.cream,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.white,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Theme.borderRadius.input,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Theme.colors.textDark,
  },
  filterScroll: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.pill,
    backgroundColor: Theme.colors.white,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: Theme.colors.deepRose,
    borderColor: Theme.colors.deepRose,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.textDark,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 90,
  },
  sectionHeader: {
    marginTop: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Theme.colors.textMauve,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Theme.colors.roseGold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Theme.colors.roseGold,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
});

