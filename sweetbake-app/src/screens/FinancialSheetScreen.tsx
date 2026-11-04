import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CakeOrder, OrderExpense } from '../types';
import { Theme } from '../theme';
import { triggerHaptic } from '../services/haptics';

interface FinancialSheetScreenProps {
  orders: CakeOrder[];
}

type PeriodType = 'Monthly' | 'Weekly';
type FilterType = 'All' | 'Income' | 'Expenses';

interface FlattenedTransaction {
  id: string;
  type: 'Income' | 'Expense';
  date: Date;
  dateStr: string;
  amount: number;
  title: string;
  subtitle: string;
  badgeText?: string;
  orderId: string;
}

export const FinancialSheetScreen: React.FC<FinancialSheetScreenProps> = ({ orders }) => {
  const [period, setPeriod] = useState<PeriodType>('Monthly');
  const [filterType, setFilterType] = useState<FilterType>('All');
  const [selectedPeriodOffset, setSelectedPeriodOffset] = useState<number>(0); // 0 = current, -1 = previous, etc.

  // Target date calculated from offset
  const currentDate = useMemo(() => {
    const d = new Date();
    if (period === 'Monthly') {
      d.setMonth(d.getMonth() + selectedPeriodOffset);
    } else {
      d.setDate(d.getDate() + selectedPeriodOffset * 7);
    }
    return d;
  }, [period, selectedPeriodOffset]);

  // Date range calculation for header & filtering
  const periodRange = useMemo(() => {
    if (period === 'Monthly') {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const start = new Date(year, month, 1, 0, 0, 0);
      const end = new Date(year, month + 1, 0, 23, 59, 59);
      const label = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
      return { start, end, label };
    } else {
      // Weekly: start from Monday (or Sunday) to Sunday
      const curr = new Date(currentDate);
      const day = curr.getDay(); // 0 is Sunday
      const diffToMonday = curr.getDate() - day + (day === 0 ? -6 : 1);
      const start = new Date(curr.setDate(diffToMonday));
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);

      const startMonth = start.toLocaleString('default', { month: 'short' });
      const endMonth = end.toLocaleString('default', { month: 'short' });
      const label = startMonth === endMonth
        ? `${startMonth} ${start.getDate()} - ${end.getDate()}, ${start.getFullYear()}`
        : `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${end.getFullYear()}`;

      return { start, end, label };
    }
  }, [period, currentDate]);

  // Extract all income orders and discrete expenses within period
  const transactions = useMemo<FlattenedTransaction[]>(() => {
    const list: FlattenedTransaction[] = [];

    orders.forEach((o) => {
      const orderDate = new Date(o.deliveryDate || o.createdAt);
      // Income (Order)
      if (orderDate >= periodRange.start && orderDate <= periodRange.end) {
        list.push({
          id: `inc-${o.id}`,
          type: 'Income',
          date: orderDate,
          dateStr: orderDate.toISOString(),
          amount: o.quotedPrice || 0,
          title: o.customerName || 'Cake Commission',
          subtitle: `${o.cakeType} • ${o.flavor || 'Custom'} (${o.status})`,
          badgeText: (o.downPayment || 0) > 0 ? `Paid: $${o.downPayment}` : undefined,
          orderId: o.id,
        });
      }

      // Discrete Expenses linked to this order
      if (Array.isArray(o.expenses)) {
        o.expenses.forEach((exp: OrderExpense) => {
          const expDate = new Date(exp.date || o.createdAt);
          if (expDate >= periodRange.start && expDate <= periodRange.end) {
            list.push({
              id: `exp-${exp.id}`,
              type: 'Expense',
              date: expDate,
              dateStr: expDate.toISOString(),
              amount: exp.amount || 0,
              title: exp.notes || 'Order Supplies',
              subtitle: `For order: ${o.customerName} (${o.cakeType})`,
              badgeText: 'Supply Expense',
              orderId: o.id,
            });
          }
        });
      }
    });

    // Sort descending by transaction date
    return list.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [orders, periodRange]);

  // Aggregate Totals
  const totals = useMemo(() => {
    const totalIncome = transactions
      .filter((t) => t.type === 'Income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = transactions
      .filter((t) => t.type === 'Expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const netProfit = totalIncome - totalExpenses;
    const profitMargin = totalIncome > 0 ? Math.round((netProfit / totalIncome) * 100) : 0;

    return { totalIncome, totalExpenses, netProfit, profitMargin };
  }, [transactions]);

  // Filtered transactions for the list
  const filteredList = useMemo(() => {
    if (filterType === 'All') return transactions;
    return transactions.filter((t) => t.type === filterType);
  }, [transactions, filterType]);

  return (
    <View style={styles.container}>
      {/* Top Controls: Period Switcher & Date Stepper */}
      <View style={styles.controlHeader}>
        {/* Toggle Weekly vs Monthly */}
        <View style={styles.periodTabs}>
          <TouchableOpacity
            style={[styles.periodTab, period === 'Weekly' && styles.periodTabActive]}
            onPress={() => {
              triggerHaptic.selection();
              setPeriod('Weekly');
              setSelectedPeriodOffset(0);
            }}
          >
            <Text style={[styles.periodTabText, period === 'Weekly' && styles.periodTabTextActive]}>
              Weekly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.periodTab, period === 'Monthly' && styles.periodTabActive]}
            onPress={() => {
              triggerHaptic.selection();
              setPeriod('Monthly');
              setSelectedPeriodOffset(0);
            }}
          >
            <Text style={[styles.periodTabText, period === 'Monthly' && styles.periodTabTextActive]}>
              Monthly
            </Text>
          </TouchableOpacity>
        </View>

        {/* Date Navigator */}
        <View style={styles.dateNavigator}>
          <TouchableOpacity
            style={styles.navArrow}
            onPress={() => {
              triggerHaptic.light();
              setSelectedPeriodOffset((prev) => prev - 1);
            }}
          >
            <Ionicons name="chevron-back" size={18} color={Theme.colors.deepRose} />
          </TouchableOpacity>

          <View style={styles.navLabelBox}>
            <Ionicons name="calendar-outline" size={13} color={Theme.colors.deepRose} style={{ marginRight: 5 }} />
            <Text style={styles.navLabelText} numberOfLines={1}>
              {periodRange.label}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.navArrow, selectedPeriodOffset >= 0 && styles.navArrowDisabled]}
            disabled={selectedPeriodOffset >= 0}
            onPress={() => {
              triggerHaptic.light();
              setSelectedPeriodOffset((prev) => prev + 1);
            }}
          >
            <Ionicons
              name="chevron-forward"
              size={18}
              color={selectedPeriodOffset >= 0 ? Theme.colors.border : Theme.colors.deepRose}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary KPI Cards Grid */}
      <View style={styles.kpiContainer}>
        <View style={styles.kpiRow}>
          {/* Total Income */}
          <View style={[styles.kpiCard, { borderLeftColor: '#2E7D32' }]}>
            <View style={styles.kpiHeader}>
              <View style={[styles.kpiIconBox, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="arrow-down-circle" size={16} color="#2E7D32" />
              </View>
              <Text style={styles.kpiLabel}>Income</Text>
            </View>
            <Text style={[styles.kpiValue, { color: '#2E7D32' }]}>
              +${totals.totalIncome.toFixed(2)}
            </Text>
          </View>

          {/* Total Expenses */}
          <View style={[styles.kpiCard, { borderLeftColor: '#C62828' }]}>
            <View style={styles.kpiHeader}>
              <View style={[styles.kpiIconBox, { backgroundColor: '#FFEBEE' }]}>
                <Ionicons name="arrow-up-circle" size={16} color="#C62828" />
              </View>
              <Text style={styles.kpiLabel}>Expenses</Text>
            </View>
            <Text style={[styles.kpiValue, { color: '#C62828' }]}>
              -${totals.totalExpenses.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Net Profit Banner */}
        <View style={[
          styles.netProfitBanner,
          totals.netProfit >= 0 ? styles.netProfitPositive : styles.netProfitNegative,
        ]}>
          <View style={styles.netProfitLeft}>
            <Ionicons
              name={totals.netProfit >= 0 ? 'wallet-outline' : 'warning-outline'}
              size={18}
              color={totals.netProfit >= 0 ? '#1B5E20' : '#B71C1C'}
              style={{ marginRight: 8 }}
            />
            <View>
              <Text style={styles.netProfitLabel}>Net Calculated Profit</Text>
              <Text style={styles.netProfitSubtitle}>
                Margin: {totals.profitMargin}% • {transactions.length} transactions
              </Text>
            </View>
          </View>
          <Text style={[
            styles.netProfitValue,
            { color: totals.netProfit >= 0 ? '#1B5E20' : '#B71C1C' },
          ]}>
            ${totals.netProfit.toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Filter Chips: All, Income, Expenses */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, filterType === 'All' && styles.filterChipActive]}
          onPress={() => {
            triggerHaptic.selection();
            setFilterType('All');
          }}
        >
          <Text style={[styles.filterChipText, filterType === 'All' && styles.filterChipTextActive]}>
            All ({transactions.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, filterType === 'Income' && styles.filterChipActiveIncome]}
          onPress={() => {
            triggerHaptic.selection();
            setFilterType('Income');
          }}
        >
          <Ionicons name="add-circle-outline" size={12} color={filterType === 'Income' ? '#2E7D32' : Theme.colors.textSecondary} style={{ marginRight: 4 }} />
          <Text style={[styles.filterChipText, filterType === 'Income' && styles.filterChipTextActiveIncome]}>
            Income ({transactions.filter((t) => t.type === 'Income').length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, filterType === 'Expenses' && styles.filterChipActiveExpense]}
          onPress={() => {
            triggerHaptic.selection();
            setFilterType('Expenses');
          }}
        >
          <Ionicons name="remove-circle-outline" size={12} color={filterType === 'Expenses' ? '#C62828' : Theme.colors.textSecondary} style={{ marginRight: 4 }} />
          <Text style={[styles.filterChipText, filterType === 'Expenses' && styles.filterChipTextActiveExpense]}>
            Expenses ({transactions.filter((t) => t.type === 'Expense').length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Detailed Ledger Transaction List */}
      <FlatList
        data={filteredList}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={40} color={Theme.colors.border} />
            <Text style={styles.emptyTitle}>No Transactions Recorded</Text>
            <Text style={styles.emptySubtitle}>
              No {filterType.toLowerCase()} records found for this {period.toLowerCase()} period.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isIncome = item.type === 'Income';
          const formattedDate = item.date.toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          });

          return (
            <View style={styles.txRow}>
              {/* Type Icon */}
              <View style={[
                styles.txIconBox,
                { backgroundColor: isIncome ? '#E8F5E9' : '#FFEBEE' },
              ]}>
                <Ionicons
                  name={isIncome ? 'arrow-down' : 'arrow-up'}
                  size={14}
                  color={isIncome ? '#2E7D32' : '#C62828'}
                />
              </View>

              {/* Title & Notes */}
              <View style={styles.txDetails}>
                <View style={styles.txTopLine}>
                  <Text style={styles.txTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={[
                    styles.txAmount,
                    { color: isIncome ? '#2E7D32' : '#C62828' },
                  ]}>
                    {isIncome ? '+' : '-'}${item.amount.toFixed(2)}
                  </Text>
                </View>

                <View style={styles.txBottomLine}>
                  <Text style={styles.txSubtitle} numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                  <Text style={styles.txDate}>{formattedDate}</Text>
                </View>

                {item.badgeText && (
                  <View style={styles.txBadgeRow}>
                    <View style={[
                      styles.txBadge,
                      { backgroundColor: isIncome ? '#F1F8E9' : '#FFF0F2' },
                    ]}>
                      <Text style={[
                        styles.txBadgeText,
                        { color: isIncome ? '#2E7D32' : Theme.colors.deepRose },
                      ]}>
                        {item.badgeText}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  controlHeader: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: Theme.colors.background,
  },
  periodTabs: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.cream,
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 9,
  },
  periodTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  periodTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
  },
  periodTabTextActive: {
    fontWeight: '800',
    color: Theme.colors.deepRose,
  },
  dateNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  navArrow: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: Theme.colors.cream,
  },
  navArrowDisabled: {
    opacity: 0.4,
  },
  navLabelBox: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  navLabelText: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.colors.textDark,
  },
  kpiContainer: {
    paddingHorizontal: 16,
    marginTop: 6,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderLeftWidth: 4,
  },
  kpiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  kpiIconBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  kpiValue: {
    fontSize: 17,
    fontWeight: '800',
  },
  netProfitBanner: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  netProfitPositive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#C8E6C9',
  },
  netProfitNegative: {
    backgroundColor: '#FFEBEE',
    borderColor: '#FFCDD2',
  },
  netProfitLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  netProfitLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: Theme.colors.textDark,
  },
  netProfitSubtitle: {
    fontSize: 10,
    color: Theme.colors.textSecondary,
    marginTop: 1,
  },
  netProfitValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 6,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: Theme.colors.deepRose,
    borderColor: Theme.colors.deepRose,
  },
  filterChipActiveIncome: {
    backgroundColor: '#E8F5E9',
    borderColor: '#2E7D32',
  },
  filterChipActiveExpense: {
    backgroundColor: '#FFEBEE',
    borderColor: '#C62828',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  filterChipTextActiveIncome: {
    color: '#2E7D32',
  },
  filterChipTextActiveExpense: {
    color: '#C62828',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 24,
  },
  txRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    alignItems: 'center',
  },
  txIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  txDetails: {
    flex: 1,
  },
  txTopLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Theme.colors.textDark,
    flex: 1,
    marginRight: 8,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
  txBottomLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  txSubtitle: {
    fontSize: 11,
    color: Theme.colors.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  txDate: {
    fontSize: 10,
    color: Theme.colors.textSecondary,
    fontWeight: '500',
  },
  txBadgeRow: {
    marginTop: 4,
    flexDirection: 'row',
  },
  txBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  txBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Theme.colors.textDark,
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
  },
});
