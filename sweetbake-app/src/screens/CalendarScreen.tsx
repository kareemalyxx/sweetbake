import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CakeOrder } from '../types';
import { Theme } from '../theme';
import { OrderRow } from '../components/OrderRow';
import { OrderModal } from '../components/OrderModal';
import { triggerHaptic } from '../services/haptics';

interface CalendarScreenProps {
  orders: CakeOrder[];
  onSaveOrder: (order: Partial<CakeOrder>) => void;
  onDeleteOrder: (id: string) => void;
  onAdvanceStatus: (id: string) => void;
}

export const CalendarScreen: React.FC<CalendarScreenProps> = ({
  orders,
  onSaveOrder,
  onDeleteOrder,
  onAdvanceStatus,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState<CakeOrder | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    triggerHaptic.selection();
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    triggerHaptic.selection();
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Filter orders for the selected day in current month & year
  const ordersOnSelectedDay = orders.filter((o) => {
    const d = new Date(o.deliveryDate);
    return (
      d.getFullYear() === year &&
      d.getMonth() === month &&
      d.getDate() === selectedDay
    );
  });

  const monthOrdersCount = orders.filter((o) => {
    const d = new Date(o.deliveryDate);
    return d.getFullYear() === year && d.getMonth() === month;
  }).length;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getDotsForDay = (day: number) => {
    return orders.filter((o) => {
      const d = new Date(o.deliveryDate);
      return (
        d.getFullYear() === year &&
        d.getMonth() === month &&
        d.getDate() === day
      );
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Calendar Card */}
      <View style={styles.calendarCard}>
        {/* Month Navigation */}
        <View style={styles.navRow}>
          <View>
            <Text style={styles.monthTitle}>
              {monthNames[month]} {year}
            </Text>
            <Text style={styles.monthSubtitle}>
              {monthOrdersCount} bakes booked this month
            </Text>
          </View>

          <View style={styles.navButtons}>
            <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
              <Ionicons name="chevron-back" size={16} color={Theme.colors.deepRose} />
            </TouchableOpacity>
            <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
              <Ionicons name="chevron-forward" size={16} color={Theme.colors.deepRose} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Days of Week Header */}
        <View style={styles.daysHeader}>
          {dayLabels.map((lbl, i) => (
            <Text key={i} style={styles.dayLabel}>
              {lbl}
            </Text>
          ))}
        </View>

        {/* Calendar Grid */}
        <View style={styles.grid}>
          {/* Leading empty cells */}
          {Array.from({ length: firstDayIndex }).map((_, i) => (
            <View key={`empty-${i}`} style={styles.dayCell} />
          ))}

          {/* Days */}
          {Array.from({ length: totalDays }).map((_, i) => {
            const dayNum = i + 1;
            const isSelected = selectedDay === dayNum;
            const today = new Date();
            const isToday =
              today.getFullYear() === year &&
              today.getMonth() === month &&
              today.getDate() === dayNum;

            const dayOrders = getDotsForDay(dayNum);

            return (
              <TouchableOpacity
                key={`day-${dayNum}`}
                style={[
                  styles.dayCell,
                  isSelected && styles.dayCellSelected,
                  isToday && !isSelected && styles.dayCellToday,
                ]}
                onPress={() => {
                  triggerHaptic.selection();
                  setSelectedDay(dayNum);
                }}
              >
                <Text
                  style={[
                    styles.dayNumber,
                    isSelected && styles.dayNumberSelected,
                    isToday && !isSelected && styles.dayNumberToday,
                  ]}
                >
                  {dayNum}
                </Text>

                {/* Dot Indicator */}
                <View style={styles.dotContainer}>
                  {dayOrders.slice(0, 3).map((ord, dIdx) => (
                    <View
                      key={dIdx}
                      style={[
                        styles.orderDot,
                        {
                          backgroundColor: isSelected
                            ? '#FFFFFF'
                            : ord.status === 'Delivered'
                            ? Theme.colors.status.deliveredDark
                            : ord.status === 'Decorating'
                            ? Theme.colors.status.decoratingDark
                            : ord.status === 'Baking'
                            ? Theme.colors.status.bakingDark
                            : Theme.colors.status.pendingDark,
                        },
                      ]}
                    />
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Selected Day Schedule */}
      <View style={styles.scheduleHeader}>
        <View>
          <Text style={styles.scheduleTitle}>
            {monthNames[month]} {selectedDay}, {year}
          </Text>
          <Text style={styles.scheduleSubtitle}>
            {ordersOnSelectedDay.length} cake
            {ordersOnSelectedDay.length === 1 ? '' : 's'} scheduled
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addBakeBtn}
          onPress={() => {
            triggerHaptic.medium();
            setOrderToEdit(null);
            setIsModalVisible(true);
          }}
        >
          <Ionicons name="add" size={14} color={Theme.colors.deepRose} style={{ marginRight: 2 }} />
          <Text style={styles.addBakeText}>Add Bake</Text>
        </TouchableOpacity>
      </View>

      {/* Day Orders List */}
      {ordersOnSelectedDay.length === 0 ? (
        <View style={styles.emptyDayBox}>
          <Ionicons name="sparkles-outline" size={26} color={Theme.colors.softLilac} />
          <Text style={styles.emptyDayText}>No custom bakes scheduled on this date</Text>
        </View>
      ) : (
        ordersOnSelectedDay.map((ord) => (
          <OrderRow
            key={ord.id}
            order={ord}
            onPress={() => {
              triggerHaptic.light();
              setOrderToEdit(ord);
              setIsModalVisible(true);
            }}
            onQuickAdvance={() => onAdvanceStatus(ord.id)}
            onDelete={() => onDeleteOrder(ord.id)}
          />
        ))
      )}

      {/* Modal for Order Editing */}
      <OrderModal
        visible={isModalVisible}
        orderToEdit={orderToEdit}
        initialDate={new Date(year, month, selectedDay, 14, 0, 0)}
        onClose={() => setIsModalVisible(false)}
        onSave={onSaveOrder}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.cream,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  calendarCard: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.borderRadius.card,
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: 16,
    shadowColor: Theme.colors.textDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Theme.colors.textDark,
  },
  monthSubtitle: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
    marginTop: 2,
  },
  navButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Theme.colors.blushPink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daysHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dayLabel: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.textSecondary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    marginVertical: 2,
  },
  dayCellSelected: {
    backgroundColor: Theme.colors.deepRose,
  },
  dayCellToday: {
    backgroundColor: Theme.colors.blushPink,
    borderWidth: 1,
    borderColor: Theme.colors.pastelRose,
  },
  dayNumber: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.textDark,
  },
  dayNumberSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  dayNumberToday: {
    color: Theme.colors.deepRose,
    fontWeight: '800',
  },
  dotContainer: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
    height: 4,
  },
  orderDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
  },
  scheduleTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Theme.colors.textDark,
  },
  scheduleSubtitle: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
    marginTop: 2,
  },
  addBakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.blushPink,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  addBakeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.deepRose,
  },
  emptyDayBox: {
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderRadius: 16,
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyDayText: {
    fontSize: 13,
    color: Theme.colors.textSecondary,
    fontWeight: '600',
  },
});

