import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CakeOrder } from '../types';
import { Theme } from '../theme';

interface RevenueTrackerProps {
  orders: CakeOrder[];
}

export const RevenueTracker: React.FC<RevenueTrackerProps> = ({ orders }) => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const currentMonthOrders = orders.filter((o) => {
    const d = new Date(o.deliveryDate);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const pendingRevenue = currentMonthOrders
    .filter((o) => o.status !== 'Delivered')
    .reduce((sum, o) => sum + (o.quotedPrice || 0), 0);

  const completedRevenue = currentMonthOrders
    .filter((o) => o.status === 'Delivered')
    .reduce((sum, o) => sum + (o.quotedPrice || 0), 0);

  const totalRevenue = pendingRevenue + completedRevenue;
  const fulfilledPercent = totalRevenue > 0 ? Math.round((completedRevenue / totalRevenue) * 100) : 0;

  const monthName = now.toLocaleString('default', { month: 'long' });

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <View style={styles.titleRow}>
            <Ionicons name="trending-up" size={16} color={Theme.colors.deepRose} style={{ marginRight: 6 }} />
            <Text style={styles.title}>{monthName} Revenue</Text>
          </View>
          <Text style={styles.totalText}>Total: ${totalRevenue.toFixed(2)}</Text>
        </View>

        {totalRevenue > 0 && (
          <View style={styles.percentBadge}>
            <Text style={styles.percentText}>{fulfilledPercent}% Fulfilled</Text>
          </View>
        )}
      </View>

      {/* Progress Bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${fulfilledPercent}%` }]} />
      </View>

      {/* Financial Split Cards */}
      <View style={styles.row}>
        {/* Pipeline Card */}
        <View style={styles.subCard}>
          <View style={[styles.iconCircle, { backgroundColor: Theme.colors.status.pending }]}>
            <Ionicons name="hourglass" size={13} color={Theme.colors.status.pendingDark} />
          </View>
          <View>
            <Text style={styles.subLabel}>In Pipeline</Text>
            <Text style={styles.subValue}>${pendingRevenue.toFixed(2)}</Text>
          </View>
        </View>

        {/* Delivered Card */}
        <View style={styles.subCard}>
          <View style={[styles.iconCircle, { backgroundColor: Theme.colors.status.delivered }]}>
            <Ionicons name="checkmark" size={13} color={Theme.colors.status.deliveredDark} />
          </View>
          <View>
            <Text style={styles.subLabel}>Delivered</Text>
            <Text style={styles.subValue}>${completedRevenue.toFixed(2)}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.borderRadius.card,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    shadowColor: Theme.colors.textDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: Theme.colors.textDark,
  },
  totalText: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
    marginTop: 2,
  },
  percentBadge: {
    backgroundColor: Theme.colors.lavenderLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.pill,
  },
  percentText: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.softLilac,
  },
  progressTrack: {
    height: 8,
    backgroundColor: Theme.colors.lavenderLight,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Theme.colors.status.deliveredDark,
    borderRadius: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  subCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.warmIvory,
    borderRadius: Theme.borderRadius.input,
    padding: 10,
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  subLabel: {
    fontSize: 11,
    color: Theme.colors.textSecondary,
    fontWeight: '600',
  },
  subValue: {
    fontSize: 14,
    fontWeight: '800',
    color: Theme.colors.textDark,
  },
});

