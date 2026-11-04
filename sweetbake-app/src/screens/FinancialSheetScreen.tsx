import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CakeOrder, OrderExpense, GeneralRequirement } from '../types';
import { Theme } from '../theme';
import { triggerHaptic } from '../services/haptics';

interface FinancialSheetScreenProps {
  orders: CakeOrder[];
  requirements?: GeneralRequirement[];
  expenses?: OrderExpense[];
  onDeleteExpense?: (expenseId: string) => void;
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

export const FinancialSheetScreen: React.FC<FinancialSheetScreenProps> = ({
  orders,
  requirements = [],
  expenses = [],
  onDeleteExpense,
}) => {
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

      // Discrete Expenses linked to this order (from local cache/legacy if present)
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

    // Dedicated /expenses collection items
    expenses.forEach((exp: OrderExpense) => {
      const expDate = new Date(exp.date || exp.createdAt || Date.now());
      if (expDate >= periodRange.start && expDate <= periodRange.end) {
        // Prevent duplicate if already added from order.expenses in local cache
        const alreadyAdded = list.some((t) => t.id === `exp-${exp.id}` || t.id === exp.id);
        if (!alreadyAdded) {
          const linkedOrder = exp.orderId ? orders.find((o) => o.id === exp.orderId) : undefined;
          list.push({
            id: `exp-${exp.id}`,
            type: 'Expense',
            date: expDate,
            dateStr: expDate.toISOString(),
            amount: exp.amount || 0,
            title: exp.notes || 'Bakery Expense',
            subtitle: linkedOrder
              ? `For order: ${linkedOrder.customerName} (${linkedOrder.cakeType})`
              : (exp.orderId ? `Order #${exp.orderId.slice(-6)}` : 'General Bakery Supplies'),
            badgeText: exp.orderId ? 'Order Expense' : 'General Expense',
            orderId: exp.orderId || 'general',
          });
        }
      }
    });

    // Discrete Expenses recorded from Checklist / General Requirements (e.g. ingredients, tools, packaging)
    requirements.forEach((req) => {
      if (req.isCompleted && typeof req.expenseAmount === 'number' && req.expenseAmount > 0) {
        // If linked to an order that already recorded this as an order expense, avoid double counting
        const isAlreadyInOrder = orders.some((o) =>
          o.id === req.orderId &&
          Array.isArray(o.expenses) &&
          o.expenses.some((e) => e.notes === req.title && e.amount === req.expenseAmount)
        );

        if (!isAlreadyInOrder) {
          const reqExpDate = new Date(req.expenseDate || req.createdAt);
          if (reqExpDate >= periodRange.start && reqExpDate <= periodRange.end) {
            list.push({
              id: `req-exp-${req.id}`,
              type: 'Expense',
              date: reqExpDate,
              dateStr: reqExpDate.toISOString(),
              amount: req.expenseAmount,
              title: req.title,
              subtitle: `${req.category} Checklist Requirement`,
              badgeText: `${req.category} Expense`,
              orderId: req.orderId || 'general',
            });
          }
        }
      }
    });

    // Sort descending by transaction date
    return list.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [orders, requirements, expenses, periodRange]);

  // Aggregate Totals
  const totals = useMemo(() => {
    const totalIncome = transactions
      .filter((t) => t.type === 'Income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = transactions
      .filter((t) => t.type === 'Expense')
      .reduce((sum, t) => sum + t.amount, 0);

    // Pending Income (Unpaid remaining balance on active orders in this period)
    const pendingBalance = orders
      .filter((o) => {
        const orderDate = new Date(o.deliveryDate || o.createdAt);
        return (
          orderDate >= periodRange.start &&
          orderDate <= periodRange.end &&
          o.status !== 'Delivered'
        );
      })
      .reduce((sum, o) => {
        const remaining = typeof o.remainingPayment === 'number'
          ? o.remainingPayment
          : Math.max(0, (o.quotedPrice || 0) - (o.downPayment || 0));
        return sum + remaining;
      }, 0);

    const receivedIncome = orders
      .filter((o) => {
        const orderDate = new Date(o.deliveryDate || o.createdAt);
        return orderDate >= periodRange.start && orderDate <= periodRange.end;
      })
      .reduce((sum, o) => {
        if (o.status === 'Delivered') {
          return sum + (o.quotedPrice || 0);
        }
        return sum + (o.downPayment || 0);
      }, 0);

    const netProfit = totalIncome - totalExpenses;
    const profitMargin = totalIncome > 0 ? Math.round((netProfit / totalIncome) * 100) : 0;

    return { totalIncome, totalExpenses, pendingBalance, receivedIncome, netProfit, profitMargin };
  }, [transactions, orders, periodRange]);

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
              <Text style={styles.kpiLabel}>Total Income</Text>
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

        {/* Second KPI Row: Pending Balance Due & Received Income */}
        <View style={[styles.kpiRow, { marginTop: 8 }]}>
          {/* Pending Balance Due */}
          <View style={[styles.kpiCard, { borderLeftColor: '#D97706' }]}>
            <View style={styles.kpiHeader}>
              <View style={[styles.kpiIconBox, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="time-outline" size={16} color="#D97706" />
              </View>
              <Text style={styles.kpiLabel}>Pending Balance</Text>
            </View>
            <Text style={[styles.kpiValue, { color: '#D97706' }]}>
              ${totals.pendingBalance.toFixed(2)}
            </Text>
            <Text style={styles.kpiSubCaption}>Unpaid remaining due</Text>
          </View>

          {/* Received / Collected Income */}
          <View style={[styles.kpiCard, { borderLeftColor: '#059669' }]}>
            <View style={styles.kpiHeader}>
              <View style={[styles.kpiIconBox, { backgroundColor: '#D1FAE5' }]}>
                <Ionicons name="checkmark-done-circle-outline" size={16} color="#059669" />
              </View>
              <Text style={styles.kpiLabel}>Collected</Text>
            </View>
            <Text style={[styles.kpiValue, { color: '#059669' }]}>
              ${totals.receivedIncome.toFixed(2)}
            </Text>
            <Text style={styles.kpiSubCaption}>Paid in advance & full</Text>
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

              {/* Delete button for expense entries */}
              {!isIncome && onDeleteExpense && (
                <TouchableOpacity
                  style={styles.deleteExpenseBtn}
                  onPress={() => {
                    triggerHaptic.medium();
                    Alert.alert(
                      'Delete Expense',
                      `Are you sure you want to delete this expense of $${item.amount.toFixed(2)} (${item.title})?`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: () => {
                            triggerHaptic.light();
                            onDeleteExpense(item.id);
                          },
                        },
                      ]
                    );
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="trash-outline" size={17} color={Theme.colors.textSecondary} />
                </TouchableOpacity>
              )}
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
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 7,
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  kpiSubCaption: {
    fontSize: 10,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
    marginTop: 2,
  },
  netProfitBanner: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
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
    fontSize: 14,
    fontWeight: '800',
    color: Theme.colors.textDark,
  },
  netProfitSubtitle: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
    marginTop: 2,
  },
  netProfitValue: {
    fontSize: 19,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
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
    fontSize: 15,
    fontWeight: '700',
    color: Theme.colors.textDark,
    flex: 1,
    marginRight: 8,
  },
  txAmount: {
    fontSize: 16,
    fontWeight: '800',
  },
  txBottomLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 3,
  },
  txSubtitle: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  txDate: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
    fontWeight: '500',
  },
  txBadgeRow: {
    marginTop: 5,
    flexDirection: 'row',
  },
  deleteExpenseBtn: {
    padding: 8,
    marginLeft: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  txBadgeText: {
    fontSize: 11,
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

