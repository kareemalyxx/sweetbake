import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CakeOrder } from '../types';
import { Theme } from '../theme';
import { triggerHaptic } from '../services/haptics';

interface NextSevenDaysWidgetProps {
  orders: CakeOrder[];
  selectedDateFilter?: Date | null;
  onSelectDate: (date: Date | null) => void;
}

export const NextSevenDaysWidget: React.FC<NextSevenDaysWidgetProps> = ({
  orders,
  selectedDateFilter,
  onSelectDate,
}) => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysLater = new Date(startOfToday.getTime() + 7 * 24 * 3600 * 1000);

  const nextSevenDaysOrders = orders.filter((o) => {
    const d = new Date(o.deliveryDate);
    return d >= startOfToday && d <= sevenDaysLater && o.status !== 'Delivered';
  });

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfToday.getTime() + i * 24 * 3600 * 1000);
    const dayOrders = orders.filter((o) => {
      const od = new Date(o.deliveryDate);
      return (
        od.getFullYear() === d.getFullYear() &&
        od.getMonth() === d.getMonth() &&
        od.getDate() === d.getDate()
      );
    });
    return { date: d, count: dayOrders.length, orders: dayOrders };
  });

  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <View style={styles.titleRow}>
            <Ionicons name="flame" size={16} color={Theme.colors.deepRose} style={{ marginRight: 6 }} />
            <Text style={styles.title}>Next 7 Days Rush</Text>
          </View>
          <Text style={styles.subtitle}>
            {selectedDateFilter
              ? `Showing bakes for ${selectedDateFilter.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
              : nextSevenDaysOrders.length === 1
              ? '1 bake due this week • Tap day to view'
              : `${nextSevenDaysOrders.length} bakes due this week • Tap day to view`}
          </Text>
        </View>

        {selectedDateFilter ? (
          <TouchableOpacity
            style={styles.clearFilterBtn}
            onPress={() => {
              triggerHaptic.selection();
              onSelectDate(null);
            }}
          >
            <Ionicons name="close-circle" size={14} color={Theme.colors.deepRose} style={{ marginRight: 3 }} />
            <Text style={styles.clearFilterText}>Show All</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{nextSevenDaysOrders.length}</Text>
          </View>
        )}
      </View>

      <View style={styles.timeline}>
        {days.map((item, idx) => {
          const isToday = idx === 0;
          const isSelected =
            selectedDateFilter &&
            selectedDateFilter.getFullYear() === item.date.getFullYear() &&
            selectedDateFilter.getMonth() === item.date.getMonth() &&
            selectedDateFilter.getDate() === item.date.getDate();

          return (
            <TouchableOpacity
              key={idx}
              activeOpacity={0.7}
              style={[
                styles.dayPill,
                isToday && !isSelected && styles.dayPillToday,
                isSelected && styles.dayPillSelected,
              ]}
              onPress={() => {
                triggerHaptic.selection();
                if (isSelected) {
                  onSelectDate(null); // toggle off
                } else {
                  onSelectDate(item.date);
                }
              }}
            >
              <Text
                style={[
                  styles.dayLetter,
                  isToday && !isSelected && styles.textToday,
                  isSelected && styles.textSelected,
                ]}
              >
                {dayNames[item.date.getDay()]}
              </Text>
              <Text
                style={[
                  styles.dayNum,
                  isToday && !isSelected && styles.textTodayBold,
                  isSelected && styles.textSelectedBold,
                ]}
              >
                {item.date.getDate()}
              </Text>
              
              {/* Order Count / Dot indicator */}
              {item.count > 0 ? (
                <View style={[styles.countBadge, isSelected && styles.countBadgeSelected]}>
                  <Text style={[styles.countText, isSelected && styles.countTextSelected]}>
                    {item.count}
                  </Text>
                </View>
              ) : (
                <View style={styles.dotInactive} />
              )}
            </TouchableOpacity>
          );
        })}
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
    marginBottom: 14,
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
  subtitle: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
    marginTop: 2,
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Theme.colors.blushPink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: Theme.colors.deepRose,
  },
  clearFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.blushPink,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: Theme.borderRadius.pill,
  },
  clearFilterText: {
    fontSize: 11,
    fontWeight: '800',
    color: Theme.colors.deepRose,
  },
  timeline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    marginHorizontal: 3,
    borderRadius: 12,
    backgroundColor: Theme.colors.warmIvory,
  },
  dayPillToday: {
    backgroundColor: Theme.colors.blushPink,
    borderWidth: 1.5,
    borderColor: Theme.colors.pastelRose,
  },
  dayPillSelected: {
    backgroundColor: Theme.colors.deepRose,
  },
  dayLetter: {
    fontSize: 10,
    fontWeight: '700',
    color: Theme.colors.textSecondary,
  },
  dayNum: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.textDark,
    marginVertical: 2,
  },
  textToday: {
    color: Theme.colors.deepRose,
  },
  textTodayBold: {
    color: Theme.colors.deepRose,
    fontWeight: '800',
  },
  textSelected: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  textSelectedBold: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  countBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Theme.colors.deepRose,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  countBadgeSelected: {
    backgroundColor: '#FFFFFF',
  },
  countText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  countTextSelected: {
    color: Theme.colors.deepRose,
  },
  dotInactive: {
    width: 16,
    height: 16,
    marginTop: 2,
  },
});
