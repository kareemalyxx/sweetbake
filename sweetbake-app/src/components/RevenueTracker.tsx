import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CakeOrder } from '../types';
import { Theme } from '../theme';
import { triggerHaptic } from '../services/haptics';

interface RevenueTrackerProps {
  orders: CakeOrder[];
  isDarkMode?: boolean;
}

type AnalysisTimeframe = 'Week' | 'Month' | 'Year';

export const RevenueTracker: React.FC<RevenueTrackerProps> = ({ orders, isDarkMode = false }) => {
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [timeframe, setTimeframe] = useState<AnalysisTimeframe>('Week');

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

  const totalExpenses = currentMonthOrders.reduce((sum, o) => {
    const orderExp = (o.expenses || []).reduce((eSum, e) => eSum + (e.amount || 0), 0);
    return sum + orderExp;
  }, 0);

  const netProfit = totalRevenue - totalExpenses;

  const fulfilledPercent =
    totalRevenue > 0 ? Math.round((completedRevenue / totalRevenue) * 100) : 0;
  const monthName = now.toLocaleString('default', { month: 'long' });

  // ----------------------------------------------------
  // COMPUTATIONS FOR REVENUE & ORDER VOLUME GRAPHS
  // ----------------------------------------------------
  const computeTimeframeStats = () => {
    if (timeframe === 'Week') {
      // Last 7 days: Day by Day
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const data = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayLabel = days[d.getDay()];

        const matched = orders.filter((o) => o.deliveryDate.startsWith(dateStr));
        const count = matched.length;
        const earn = matched.reduce((s, o) => s + (o.quotedPrice || 0), 0);

        data.push({ label: dayLabel, count, earn, fullDate: dateStr });
      }
      return data;
    }

    if (timeframe === 'Month') {
      // 4 Weeks of Current Month
      const data = [];
      for (let w = 1; w <= 4; w++) {
        const startDay = (w - 1) * 7 + 1;
        const endDay = w === 4 ? 31 : w * 7;

        const matched = orders.filter((o) => {
          const od = new Date(o.deliveryDate);
          return (
            od.getMonth() === currentMonth &&
            od.getFullYear() === currentYear &&
            od.getDate() >= startDay &&
            od.getDate() <= endDay
          );
        });

        const count = matched.length;
        const earn = matched.reduce((s, o) => s + (o.quotedPrice || 0), 0);
        data.push({ label: `W${w}`, count, earn, fullDate: `Day ${startDay}-${endDay}` });
      }
      return data;
    }

    // Year: 12 Months
    const monthLabels = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return monthLabels.map((lbl, idx) => {
      const matched = orders.filter((o) => {
        const od = new Date(o.deliveryDate);
        return od.getFullYear() === currentYear && od.getMonth() === idx;
      });
      const count = matched.length;
      const earn = matched.reduce((s, o) => s + (o.quotedPrice || 0), 0);
      return { label: lbl, count, earn, fullDate: `${lbl} ${currentYear}` };
    });
  };

  const chartData = computeTimeframeStats();
  const maxEarn = Math.max(...chartData.map((d) => d.earn), 100);
  const maxCount = Math.max(...chartData.map((d) => d.count), 5);

  const totalPeriodEarn = chartData.reduce((s, d) => s + d.earn, 0);
  const totalPeriodOrders = chartData.reduce((s, d) => s + d.count, 0);
  const avgOrderValue = totalPeriodOrders > 0 ? totalPeriodEarn / totalPeriodOrders : 0;

  return (
    <>
      {/* Tappable Card that triggers Analytics Sheet */}
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.88}
        onPress={() => {
          triggerHaptic.selection();
          setShowAnalysisModal(true);
        }}
      >
        <View style={styles.header}>
          <View>
            <View style={styles.titleRow}>
              <Ionicons
                name="trending-up"
                size={16}
                color={Theme.colors.deepRose}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.title}>{monthName} Financials</Text>
              <View style={styles.tapToViewPill}>
                <Ionicons name="bar-chart-outline" size={10} color={Theme.colors.deepRose} />
                <Text style={styles.tapToViewText}>View Trends</Text>
              </View>
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

          {/* Net Profit Card */}
          <View style={styles.subCard}>
            <View style={[styles.iconCircle, { backgroundColor: netProfit >= 0 ? '#E8F5E9' : '#FFEBEE' }]}>
              <Ionicons
                name={netProfit >= 0 ? 'cash-outline' : 'trending-down'}
                size={13}
                color={netProfit >= 0 ? '#2E7D32' : '#C62828'}
              />
            </View>
            <View>
              <Text style={styles.subLabel}>Net Profit</Text>
              <Text style={[styles.subValue, { color: netProfit >= 0 ? '#2E7D32' : '#C62828' }]}>
                ${netProfit.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {/* FULL FINANCIAL ANALYSIS MODAL */}
      <Modal
        visible={showAnalysisModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Bakery Financial Analytics</Text>
              <Text style={styles.modalSubtitle}>Orders volume & earnings performance</Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setShowAnalysisModal(false)}
            >
              <Ionicons name="close" size={22} color={Theme.colors.textDark} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Timeframe Selector */}
            <View style={styles.segmentedRow}>
              {(['Week', 'Month', 'Year'] as AnalysisTimeframe[]).map((tf) => (
                <TouchableOpacity
                  key={tf}
                  style={[styles.segmentBtn, timeframe === tf && styles.segmentBtnActive]}
                  onPress={() => {
                    triggerHaptic.selection();
                    setTimeframe(tf);
                  }}
                >
                  <Text
                    style={[
                      styles.segmentBtnText,
                      timeframe === tf && styles.segmentBtnTextActive,
                    ]}
                  >
                    {tf === 'Week' ? 'Past 7 Days' : tf === 'Month' ? 'This Month' : 'This Year'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Top Metric Cards */}
            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <Ionicons name="cash-outline" size={18} color={Theme.colors.deepRose} />
                <Text style={styles.metricLabel}>Total Earned</Text>
                <Text style={styles.metricValue}>${totalPeriodEarn.toFixed(2)}</Text>
              </View>

              <View style={styles.metricCard}>
                <Ionicons name="gift-outline" size={18} color={Theme.colors.softLilac} />
                <Text style={styles.metricLabel}>Orders Count</Text>
                <Text style={styles.metricValue}>{totalPeriodOrders} cakes</Text>
              </View>

              <View style={styles.metricCard}>
                <Ionicons name="pie-chart-outline" size={18} color="#2E7D32" />
                <Text style={styles.metricLabel}>Avg Cake Value</Text>
                <Text style={styles.metricValue}>${avgOrderValue.toFixed(1)}</Text>
              </View>
            </View>

            {/* GRAPH 1: REVENUE EARNINGS ($) */}
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <Text style={styles.chartTitle}>Earnings Trend ($)</Text>
                <Text style={styles.chartSubtitle}>Revenue earned per {timeframe.toLowerCase()}</Text>
              </View>

              <View style={styles.barsContainer}>
                {chartData.map((point, index) => {
                  const heightPercent = maxEarn > 0 ? Math.max(8, (point.earn / maxEarn) * 100) : 8;
                  return (
                    <View key={index} style={styles.barCol}>
                      <Text style={styles.barTopVal}>${Math.round(point.earn)}</Text>
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.barFillEarn,
                            { height: `${heightPercent}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.barLabel}>{point.label}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* GRAPH 2: ORDER VOLUME (HOW MANY CAKES) */}
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <Text style={styles.chartTitle}>Orders Volume (Cakes)</Text>
                <Text style={styles.chartSubtitle}>Number of commissions scheduled</Text>
              </View>

              <View style={styles.barsContainer}>
                {chartData.map((point, index) => {
                  const heightPercent = maxCount > 0 ? Math.max(8, (point.count / maxCount) * 100) : 8;
                  return (
                    <View key={index} style={styles.barCol}>
                      <Text style={styles.barTopVal}>{point.count}</Text>
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.barFillCount,
                            { height: `${heightPercent}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.barLabel}>{point.label}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
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
    gap: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: Theme.colors.textDark,
  },
  tapToViewPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.blushPink,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
  },
  tapToViewText: {
    fontSize: 9,
    fontWeight: '800',
    color: Theme.colors.deepRose,
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
  modalContainer: {
    flex: 1,
    backgroundColor: Theme.colors.cream,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
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
  closeBtn: {
    padding: 6,
    borderRadius: 18,
    backgroundColor: Theme.colors.cream,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  segmentedRow: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.white,
    padding: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: 16,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  segmentBtnActive: {
    backgroundColor: Theme.colors.deepRose,
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.textDark,
  },
  segmentBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: Theme.colors.white,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
    marginTop: 6,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '800',
    color: Theme.colors.textDark,
    marginTop: 2,
  },
  chartCard: {
    backgroundColor: Theme.colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: 16,
  },
  chartHeader: {
    marginBottom: 14,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Theme.colors.textDark,
  },
  chartSubtitle: {
    fontSize: 11,
    color: Theme.colors.textSecondary,
    marginTop: 2,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 140,
    paddingTop: 20,
    paddingBottom: 4,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTopVal: {
    fontSize: 9,
    fontWeight: '700',
    color: Theme.colors.textSecondary,
    marginBottom: 4,
  },
  barTrack: {
    width: 14,
    height: 90,
    backgroundColor: Theme.colors.cream,
    borderRadius: 7,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFillEarn: {
    width: '100%',
    backgroundColor: Theme.colors.deepRose,
    borderRadius: 7,
  },
  barFillCount: {
    width: '100%',
    backgroundColor: Theme.colors.softLilac,
    borderRadius: 7,
  },
  barLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Theme.colors.textDark,
    marginTop: 6,
  },
});
