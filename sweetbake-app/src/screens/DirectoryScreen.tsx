import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  TextInput,
  Modal,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SavedCustomer, SavedCourier, CakeOrder } from '../types';
import { Theme } from '../theme';
import { triggerHaptic } from '../services/haptics';

interface DirectoryScreenProps {
  customers: SavedCustomer[];
  couriers: SavedCourier[];
  orders: CakeOrder[];
  onAddCustomer: (customer: Partial<SavedCustomer> & { name: string }) => Promise<void>;
  onAddCourier: (courier: Partial<SavedCourier> & { name: string }) => Promise<void>;
  onDeleteCustomer: (id: string) => Promise<void>;
  onDeleteCourier: (id: string) => Promise<void>;
}

type TabMode = 'Customers' | 'Couriers';

export const DirectoryScreen: React.FC<DirectoryScreenProps> = ({
  customers,
  couriers,
  orders,
  onAddCustomer,
  onAddCourier,
  onDeleteCustomer,
  onDeleteCourier,
}) => {
  const [activeTab, setActiveTab] = useState<TabMode>('Customers');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Customer Modal
  const [showAddCustModal, setShowAddCustModal] = useState(false);
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custInstagram, setCustInstagram] = useState('');
  const [custLocation, setCustLocation] = useState('');

  // Add Courier Modal
  const [showAddCourierModal, setShowAddCourierModal] = useState(false);
  const [courierName, setCourierName] = useState('');
  const [courierPhone, setCourierPhone] = useState('');

  // Detail Modal
  const [selectedCustomer, setSelectedCustomer] = useState<SavedCustomer | null>(null);
  const [selectedCourier, setSelectedCourier] = useState<SavedCourier | null>(null);

  // Compute live completed order count and completed lifetime spend per customer
  const customerStatsMap = useMemo(() => {
    const map = new Map<string, { completedOrderCount: number; completedTotalSpent: number; totalOrdersAll: number }>();
    customers.forEach((c) => {
      const custOrders = orders.filter(
        (o) =>
          (o.customerId && o.customerId === c.id) ||
          (o.customerName && o.customerName.trim().toLowerCase() === c.name.trim().toLowerCase())
      );
      const completed = custOrders.filter((o) => o.status === 'Delivered');
      const spent = completed.reduce((sum, o) => sum + (o.quotedPrice || 0), 0);
      map.set(c.id, {
        completedOrderCount: completed.length,
        completedTotalSpent: spent,
        totalOrdersAll: custOrders.length,
      });
    });
    return map;
  }, [customers, orders]);

  // Compute live completed delivery trips and earned delivery fees per courier
  const courierStatsMap = useMemo(() => {
    const map = new Map<string, { completedDeliveries: number; completedEarnings: number; totalDeliveriesAll: number }>();
    couriers.forEach((cr) => {
      const crOrders = orders.filter(
        (o) =>
          o.fulfillmentType === 'Delivery' &&
          ((o.courierId && o.courierId === cr.id) ||
            (o.deliveryPerson && o.deliveryPerson.trim().toLowerCase() === cr.name.trim().toLowerCase()))
      );
      const completed = crOrders.filter((o) => o.status === 'Delivered');
      const earned = completed.reduce((sum, o) => sum + (typeof o.deliveryCost === 'number' ? o.deliveryCost : 0), 0);
      map.set(cr.id, {
        completedDeliveries: completed.length,
        completedEarnings: earned,
        totalDeliveriesAll: crOrders.length,
      });
    });
    return map;
  }, [couriers, orders]);

  // Filtered lists
  const filteredCustomers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        (c.phone && c.phone.toLowerCase().includes(query)) ||
        (c.instagram && c.instagram.toLowerCase().includes(query)) ||
        (c.defaultLocation && c.defaultLocation.toLowerCase().includes(query))
    );
  }, [customers, searchQuery]);

  const filteredCouriers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return couriers;
    return couriers.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        (c.phone && c.phone.toLowerCase().includes(query))
    );
  }, [couriers, searchQuery]);

  // Handlers
  const handleSaveCustomer = async () => {
    const trimmed = custName.trim();
    if (!trimmed) {
      Alert.alert('Required', 'Please enter customer name');
      return;
    }
    triggerHaptic.success();
    await onAddCustomer({
      name: trimmed,
      phone: custPhone.trim() || undefined,
      instagram: custInstagram.trim() || undefined,
      defaultLocation: custLocation.trim() || undefined,
      orderCount: 0,
      totalSpent: 0,
    });
    setCustName('');
    setCustPhone('');
    setCustInstagram('');
    setCustLocation('');
    setShowAddCustModal(false);
  };

  const handleSaveCourier = async () => {
    const trimmed = courierName.trim();
    if (!trimmed) {
      Alert.alert('Required', 'Please enter courier / delivery person name');
      return;
    }
    triggerHaptic.success();
    await onAddCourier({
      name: trimmed,
      phone: courierPhone.trim() || undefined,
      deliveryCount: 0,
      totalEarned: 0,
    });
    setCourierName('');
    setCourierPhone('');
    setShowAddCourierModal(false);
  };

  const handleDeleteCustConfirm = (c: SavedCustomer) => {
    Alert.alert(
      'Delete Customer',
      `Are you sure you want to remove "${c.name}" from your saved directory?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            triggerHaptic.heavy();
            onDeleteCustomer(c.id);
            setSelectedCustomer(null);
          },
        },
      ]
    );
  };

  const handleDeleteCourierConfirm = (cr: SavedCourier) => {
    Alert.alert(
      'Delete Courier',
      `Are you sure you want to remove "${cr.name}" from your saved couriers?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            triggerHaptic.heavy();
            onDeleteCourier(cr.id);
            setSelectedCourier(null);
          },
        },
      ]
    );
  };

  const openWhatsApp = (phone?: string) => {
    if (!phone) return;
    const clean = phone.replace(/[^0-9+]/g, '');
    Linking.openURL(`whatsapp://send?phone=${clean}`).catch(() => {
      Alert.alert('Error', 'Could not open WhatsApp.');
    });
  };

  const openInstagram = (handle?: string) => {
    if (!handle) return;
    const clean = handle.replace('@', '').trim();
    if (clean.startsWith('http://') || clean.startsWith('https://')) {
      Linking.openURL(clean).catch(() => {});
    } else {
      Linking.openURL(`https://instagram.com/${clean}`).catch(() => {});
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Clients & Logistics</Text>
          <Text style={styles.headerSubtitle}>
            {activeTab === 'Customers'
              ? `${customers.length} Saved Client${customers.length === 1 ? '' : 's'}`
              : `${couriers.length} Delivery Courier${couriers.length === 1 ? '' : 's'}`}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => {
            triggerHaptic.selection();
            if (activeTab === 'Customers') {
              setShowAddCustModal(true);
            } else {
              setShowAddCourierModal(true);
            }
          }}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.addBtnText}>
            {activeTab === 'Customers' ? 'New Client' : 'New Courier'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Segmented Switcher */}
      <View style={styles.tabSwitcher}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'Customers' && styles.tabButtonActive]}
          onPress={() => {
            triggerHaptic.selection();
            setActiveTab('Customers');
          }}
        >
          <Ionicons
            name="people"
            size={16}
            color={activeTab === 'Customers' ? Theme.colors.deepRose : Theme.colors.textSecondary}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.tabButtonText, activeTab === 'Customers' && styles.tabButtonTextActive]}>
            Repeated Clients ({customers.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'Couriers' && styles.tabButtonActive]}
          onPress={() => {
            triggerHaptic.selection();
            setActiveTab('Couriers');
          }}
        >
          <Ionicons
            name="bicycle"
            size={16}
            color={activeTab === 'Couriers' ? Theme.colors.deepRose : Theme.colors.textSecondary}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.tabButtonText, activeTab === 'Couriers' && styles.tabButtonTextActive]}>
            Delivery Couriers ({couriers.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <Ionicons name="search-outline" size={16} color={Theme.colors.textSecondary} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder={activeTab === 'Customers' ? 'Search clients by name, phone, handle...' : 'Search couriers by name or phone...'}
          placeholderTextColor={Theme.colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {Boolean(searchQuery) && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={16} color={Theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Directory Content List */}
      {activeTab === 'Customers' ? (
        <FlatList
          data={filteredCustomers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color={Theme.colors.softLilac} />
              <Text style={styles.emptyTitle}>No Customers Found</Text>
              <Text style={styles.emptySubtitle}>
                Add regular customers with "+ New Client" or they will be automatically saved when booking orders.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const stats = customerStatsMap.get(item.id) || {
              completedOrderCount: 0,
              completedTotalSpent: 0,
              totalOrdersAll: 0,
            };
            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => setSelectedCustomer(item)}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarInitials}>
                      {item.name ? item.name.charAt(0).toUpperCase() : '?'}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.cardName}>{item.name}</Text>
                    {Boolean(item.phone) && (
                      <View style={styles.infoRow}>
                        <Ionicons name="call-outline" size={12} color={Theme.colors.textSecondary} style={{ marginRight: 4 }} />
                        <Text style={styles.infoText}>{item.phone}</Text>
                      </View>
                    )}
                    {Boolean(item.instagram) && (
                      <View style={styles.infoRow}>
                        <Ionicons name="logo-instagram" size={12} color="#E1306C" style={{ marginRight: 4 }} />
                        <Text style={styles.infoText}>{item.instagram}</Text>
                      </View>
                    )}
                  </View>

                  <TouchableOpacity
                    style={styles.deleteCardBtn}
                    onPress={() => handleDeleteCustConfirm(item)}
                  >
                    <Ionicons name="trash-outline" size={16} color="#DC2626" />
                  </TouchableOpacity>
                </View>

                {/* KPI Metrics */}
                <View style={styles.metricsRow}>
                  <View style={styles.metricBox}>
                    <Text style={styles.metricLabel}>Completed Cakes</Text>
                    <Text style={styles.metricValue}>
                      {stats.completedOrderCount} <Text style={styles.metricSub}>({stats.totalOrdersAll} total)</Text>
                    </Text>
                  </View>
                  <View style={styles.metricDivider} />
                  <View style={styles.metricBox}>
                    <Text style={styles.metricLabel}>Completed Spend</Text>
                    <Text style={[styles.metricValue, { color: '#2E7D32' }]}>
                      ${stats.completedTotalSpent.toFixed(2)}
                    </Text>
                  </View>
                </View>

                {Boolean(item.defaultLocation) && (
                  <View style={styles.locationTag}>
                    <Ionicons name="location-outline" size={12} color={Theme.colors.deepRose} style={{ marginRight: 4 }} />
                    <Text style={styles.locationTagText} numberOfLines={1}>
                      {item.defaultLocation}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      ) : (
        <FlatList
          data={filteredCouriers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="bicycle-outline" size={48} color={Theme.colors.softLilac} />
              <Text style={styles.emptyTitle}>No Delivery Couriers Found</Text>
              <Text style={styles.emptySubtitle}>
                Add your regular delivery drivers with "+ New Courier" to easily select them in orders.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const stats = courierStatsMap.get(item.id) || {
              completedDeliveries: 0,
              completedEarnings: 0,
              totalDeliveriesAll: 0,
            };
            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => setSelectedCourier(item)}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.avatarCircle, { backgroundColor: '#FFF3E0' }]}>
                    <Ionicons name="bicycle" size={20} color="#E65100" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.cardName}>{item.name}</Text>
                    {Boolean(item.phone) && (
                      <View style={styles.infoRow}>
                        <Ionicons name="call-outline" size={12} color={Theme.colors.textSecondary} style={{ marginRight: 4 }} />
                        <Text style={styles.infoText}>{item.phone}</Text>
                      </View>
                    )}
                  </View>

                  <TouchableOpacity
                    style={styles.deleteCardBtn}
                    onPress={() => handleDeleteCourierConfirm(item)}
                  >
                    <Ionicons name="trash-outline" size={16} color="#DC2626" />
                  </TouchableOpacity>
                </View>

                {/* KPI Metrics */}
                <View style={styles.metricsRow}>
                  <View style={styles.metricBox}>
                    <Text style={styles.metricLabel}>Completed Trips</Text>
                    <Text style={styles.metricValue}>
                      {stats.completedDeliveries} <Text style={styles.metricSub}>({stats.totalDeliveriesAll} booked)</Text>
                    </Text>
                  </View>
                  <View style={styles.metricDivider} />
                  <View style={styles.metricBox}>
                    <Text style={styles.metricLabel}>Completed Earnings</Text>
                    <Text style={[styles.metricValue, { color: '#E65100' }]}>
                      ${stats.completedEarnings.toFixed(2)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* New Customer Modal */}
      <Modal visible={showAddCustModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Regular Client</Text>
              <TouchableOpacity onPress={() => setShowAddCustModal(false)}>
                <Ionicons name="close" size={22} color={Theme.colors.textDark} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400 }}>
              <Text style={styles.formLabel}>Customer Name *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Full name (e.g. Maria Gonzalez)"
                placeholderTextColor={Theme.colors.textSecondary}
                value={custName}
                onChangeText={setCustName}
              />

              <Text style={styles.formLabel}>WhatsApp / Phone</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. +1 555-0123"
                placeholderTextColor={Theme.colors.textSecondary}
                keyboardType="phone-pad"
                value={custPhone}
                onChangeText={setCustPhone}
              />

              <Text style={styles.formLabel}>Instagram Handle / URL</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. @maria_bakery or URL"
                placeholderTextColor={Theme.colors.textSecondary}
                autoCapitalize="none"
                value={custInstagram}
                onChangeText={setCustInstagram}
              />

              <Text style={styles.formLabel}>Default Delivery Address / Venue</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. 123 Blossom Avenue, Apt 4"
                placeholderTextColor={Theme.colors.textSecondary}
                value={custLocation}
                onChangeText={setCustLocation}
              />
            </ScrollView>

            <TouchableOpacity style={styles.submitBtn} onPress={handleSaveCustomer}>
              <Text style={styles.submitBtnText}>Save Customer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* New Courier Modal */}
      <Modal visible={showAddCourierModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Delivery Driver / Courier</Text>
              <TouchableOpacity onPress={() => setShowAddCourierModal(false)}>
                <Ionicons name="close" size={22} color={Theme.colors.textDark} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 300 }}>
              <Text style={styles.formLabel}>Driver / Service Name *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Carlos Swift Delivery"
                placeholderTextColor={Theme.colors.textSecondary}
                value={courierName}
                onChangeText={setCourierName}
              />

              <Text style={styles.formLabel}>Contact Phone</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. +1 555-0199"
                placeholderTextColor={Theme.colors.textSecondary}
                keyboardType="phone-pad"
                value={courierPhone}
                onChangeText={setCourierPhone}
              />
            </ScrollView>

            <TouchableOpacity style={styles.submitBtn} onPress={handleSaveCourier}>
              <Text style={styles.submitBtnText}>Save Courier</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Customer Detail & Orders History Modal */}
      {selectedCustomer && (
        <Modal visible={Boolean(selectedCustomer)} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.detailCard}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>{selectedCustomer.name}</Text>
                  <Text style={styles.modalSubtitle}>Client History & Stats</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedCustomer(null)}>
                  <Ionicons name="close" size={22} color={Theme.colors.textDark} />
                </TouchableOpacity>
              </View>

              {/* Quick Actions */}
              <View style={styles.detailActionRow}>
                {Boolean(selectedCustomer.phone) && (
                  <TouchableOpacity
                    style={styles.detailActionBtn}
                    onPress={() => openWhatsApp(selectedCustomer.phone)}
                  >
                    <Ionicons name="logo-whatsapp" size={16} color="#25D366" style={{ marginRight: 6 }} />
                    <Text style={styles.detailActionText}>WhatsApp</Text>
                  </TouchableOpacity>
                )}
                {Boolean(selectedCustomer.instagram) && (
                  <TouchableOpacity
                    style={styles.detailActionBtn}
                    onPress={() => openInstagram(selectedCustomer.instagram)}
                  >
                    <Ionicons name="logo-instagram" size={16} color="#E1306C" style={{ marginRight: 6 }} />
                    <Text style={styles.detailActionText}>Instagram</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Stats Box */}
              {(() => {
                const stats = customerStatsMap.get(selectedCustomer.id) || {
                  completedOrderCount: 0,
                  completedTotalSpent: 0,
                  totalOrdersAll: 0,
                };
                const linkedOrders = orders.filter(
                  (o) =>
                    (o.customerId && o.customerId === selectedCustomer.id) ||
                    (o.customerName && o.customerName.trim().toLowerCase() === selectedCustomer.name.trim().toLowerCase())
                );
                return (
                  <View style={{ flex: 1 }}>
                    <View style={styles.detailMetricsRow}>
                      <View style={styles.detailMetricBox}>
                        <Text style={styles.detailMetricNum}>{stats.completedOrderCount}</Text>
                        <Text style={styles.detailMetricText}>Completed Orders</Text>
                      </View>
                      <View style={styles.detailMetricBox}>
                        <Text style={[styles.detailMetricNum, { color: '#2E7D32' }]}>
                          ${stats.completedTotalSpent.toFixed(2)}
                        </Text>
                        <Text style={styles.detailMetricText}>Lifetime Completed Spend</Text>
                      </View>
                    </View>

                    <Text style={styles.historyTitle}>
                      Order History ({linkedOrders.length})
                    </Text>

                    <FlatList
                      data={linkedOrders}
                      keyExtractor={(o) => o.id}
                      renderItem={({ item }) => (
                        <View style={styles.historyRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.historyCake}>{item.cakeType} ({item.cakeSize || 'M'})</Text>
                            <Text style={styles.historyDate}>
                              {new Date(item.deliveryDate || item.createdAt).toLocaleDateString()} • {item.status}
                            </Text>
                          </View>
                          <Text style={[styles.historyPrice, item.status === 'Delivered' && { color: '#2E7D32' }]}>
                            ${(item.quotedPrice || 0).toFixed(2)}
                          </Text>
                        </View>
                      )}
                    />
                  </View>
                );
              })()}
            </View>
          </View>
        </Modal>
      )}

      {/* Courier Detail & Trips History Modal */}
      {selectedCourier && (
        <Modal visible={Boolean(selectedCourier)} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.detailCard}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>{selectedCourier.name}</Text>
                  <Text style={styles.modalSubtitle}>Courier History & Deliveries</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedCourier(null)}>
                  <Ionicons name="close" size={22} color={Theme.colors.textDark} />
                </TouchableOpacity>
              </View>

              {Boolean(selectedCourier.phone) && (
                <View style={styles.detailActionRow}>
                  <TouchableOpacity
                    style={styles.detailActionBtn}
                    onPress={() => openWhatsApp(selectedCourier.phone)}
                  >
                    <Ionicons name="logo-whatsapp" size={16} color="#25D366" style={{ marginRight: 6 }} />
                    <Text style={styles.detailActionText}>WhatsApp Driver</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Stats Box */}
              {(() => {
                const stats = courierStatsMap.get(selectedCourier.id) || {
                  completedDeliveries: 0,
                  completedEarnings: 0,
                  totalDeliveriesAll: 0,
                };
                const linkedOrders = orders.filter(
                  (o) =>
                    o.fulfillmentType === 'Delivery' &&
                    ((o.courierId && o.courierId === selectedCourier.id) ||
                      (o.deliveryPerson && o.deliveryPerson.trim().toLowerCase() === selectedCourier.name.trim().toLowerCase()))
                );
                return (
                  <View style={{ flex: 1 }}>
                    <View style={styles.detailMetricsRow}>
                      <View style={styles.detailMetricBox}>
                        <Text style={styles.detailMetricNum}>{stats.completedDeliveries}</Text>
                        <Text style={styles.detailMetricText}>Completed Deliveries</Text>
                      </View>
                      <View style={styles.detailMetricBox}>
                        <Text style={[styles.detailMetricNum, { color: '#E65100' }]}>
                          ${stats.completedEarnings.toFixed(2)}
                        </Text>
                        <Text style={styles.detailMetricText}>Completed Delivery Fees</Text>
                      </View>
                    </View>

                    <Text style={styles.historyTitle}>
                      Delivery Logs ({linkedOrders.length})
                    </Text>

                    <FlatList
                      data={linkedOrders}
                      keyExtractor={(o) => o.id}
                      renderItem={({ item }) => (
                        <View style={styles.historyRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.historyCake}>To: {item.customerName}</Text>
                            <Text style={styles.historyDate}>
                              {new Date(item.deliveryDate || item.createdAt).toLocaleDateString()} • {item.status}
                            </Text>
                          </View>
                          <Text style={[styles.historyPrice, { color: '#E65100' }]}>
                            ${(typeof item.deliveryCost === 'number' ? item.deliveryCost : 0).toFixed(2)}
                          </Text>
                        </View>
                      )}
                    />
                  </View>
                );
              })()}
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Theme.colors.textDark,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.deepRose,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  tabSwitcher: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: Theme.colors.card,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  tabButtonActive: {
    backgroundColor: '#FFF0F3',
    borderColor: Theme.colors.pastelRose,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
  },
  tabButtonTextActive: {
    color: Theme.colors.deepRose,
    fontWeight: '800',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.card,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Theme.colors.textDark,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Theme.colors.textDark,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
  },
  card: {
    backgroundColor: Theme.colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF0F3',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.pastelRose,
  },
  avatarInitials: {
    fontSize: 16,
    fontWeight: '800',
    color: Theme.colors.deepRose,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '700',
    color: Theme.colors.textDark,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  infoText: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
  },
  deleteCardBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.warmIvory,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 10,
  },
  metricBox: {
    flex: 1,
  },
  metricDivider: {
    width: 1,
    height: '80%',
    backgroundColor: '#E5DCD0',
    marginHorizontal: 10,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '800',
    color: Theme.colors.textDark,
    marginTop: 1,
  },
  metricSub: {
    fontSize: 11,
    fontWeight: '500',
    color: Theme.colors.textSecondary,
  },
  locationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  locationTagText: {
    fontSize: 11,
    color: Theme.colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Theme.colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  detailCard: {
    backgroundColor: Theme.colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    height: '75%',
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Theme.colors.textDark,
  },
  modalSubtitle: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
    marginTop: 2,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.textDark,
    marginTop: 10,
    marginBottom: 4,
  },
  formInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: Theme.colors.textDark,
  },
  submitBtn: {
    backgroundColor: Theme.colors.deepRose,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  detailActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  detailActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.warmIvory,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  detailActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.textDark,
  },
  detailMetricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  detailMetricBox: {
    flex: 1,
    backgroundColor: Theme.colors.warmIvory,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  detailMetricNum: {
    fontSize: 18,
    fontWeight: '800',
    color: Theme.colors.textDark,
  },
  detailMetricText: {
    fontSize: 10,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.colors.textDark,
    marginBottom: 8,
    marginTop: 4,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  historyCake: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.colors.textDark,
  },
  historyDate: {
    fontSize: 11,
    color: Theme.colors.textSecondary,
    marginTop: 2,
  },
  historyPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: Theme.colors.textDark,
  },
});

