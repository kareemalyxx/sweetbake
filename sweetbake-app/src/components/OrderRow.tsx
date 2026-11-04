import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CakeOrder } from '../types';
import { Theme } from '../theme';
import { StatusPill } from './StatusPill';

interface OrderRowProps {
  order: CakeOrder;
  onPress: () => void;
  onQuickAdvance: () => void;
  onDelete: () => void;
}

export const OrderRow: React.FC<OrderRowProps> = ({
  order,
  onPress,
  onQuickAdvance,
  onDelete,
}) => {
  const deliveryDate = new Date(order.deliveryDate);
  const formattedDate = deliveryDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const nextStatusLabel: Record<string, string> = {
    Pending: 'Bake',
    Baking: 'Decorate',
    Decorating: 'Deliver',
  };

  const remaining = order.remainingPayment ?? Math.max(0, order.quotedPrice - (order.downPayment || 0));
  const totalExpenses = (order.expenses || []).reduce((sum, e) => sum + (e.amount || 0), 0);
  const profit = order.quotedPrice - totalExpenses;

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <View style={styles.contentRow}>
        {/* Cake Preview / Icon */}
        <View style={styles.imageBox}>
          {order.referenceImages && order.referenceImages.length > 0 ? (
            <Image
              source={{ uri: order.referenceImages[0] }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <Ionicons name="sparkles" size={24} color={Theme.colors.softLilac} />
          )}
        </View>

        {/* Center Details */}
        <View style={styles.details}>
          <View style={styles.topLine}>
            <Text style={styles.customerName} numberOfLines={1}>
              {order.customerName}
            </Text>
            <View style={styles.priceContainer}>
              <Text style={styles.price}>${order.quotedPrice.toFixed(2)}</Text>
              {remaining > 0 ? (
                <Text style={styles.remainingDueText}>(${remaining.toFixed(0)} due)</Text>
              ) : (
                <Text style={styles.paidBadgeText}>✓ Paid</Text>
              )}
            </View>
          </View>

          <Text style={styles.cakeType} numberOfLines={1}>
            {order.cakeType} • {order.shape}
          </Text>

          {/* Schedule & Fulfillment Line */}
          <View style={styles.scheduleRow}>
            <Ionicons
              name={order.fulfillmentType === 'Delivery' ? 'car-outline' : 'storefront-outline'}
              size={12}
              color={Theme.colors.deepRose}
              style={{ marginRight: 4 }}
            />
            <Text style={styles.fulfillmentTag}>
              {order.fulfillmentType === 'Delivery' ? 'Delivery' : 'Pickup'}
            </Text>
            <Text style={styles.dotSeparator}>•</Text>
            <Ionicons name="calendar-outline" size={12} color={Theme.colors.textSecondary} style={{ marginRight: 4 }} />
            <Text style={styles.dateText}>{formattedDate}</Text>
          </View>

          {/* Location note if present */}
          {Boolean(order.location) && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={11} color={Theme.colors.textSecondary} style={{ marginRight: 3 }} />
              <Text style={styles.locationText} numberOfLines={1}>
                {order.location}
              </Text>
            </View>
          )}

          {/* Badges / Status row */}
          <View style={styles.bottomRow}>
            <StatusPill status={order.status} />

            {order.flavor ? (
              <View style={styles.flavorPill}>
                <Text style={styles.flavorText} numberOfLines={1}>
                  {order.flavor}
                </Text>
              </View>
            ) : null}

            {order.addons && (Array.isArray(order.addons) ? order.addons.length > 0 : Object.keys(order.addons).length > 0) ? (
              <View style={styles.addonsPill}>
                <Ionicons name="sparkles" size={10} color={Theme.colors.deepRose} style={{ marginRight: 3 }} />
                {(() => {
                  if (Array.isArray(order.addons)) {
                    return (
                      <Text style={styles.addonsText} numberOfLines={1}>
                        +{order.addons.length} Add-on{order.addons.length > 1 ? 's' : ''}
                      </Text>
                    );
                  }
                  const addonEntries = Object.entries(order.addons);
                  const completedCount = addonEntries.filter(([_, done]) => done).length;
                  const totalCount = addonEntries.length;
                  return (
                    <Text style={styles.addonsText} numberOfLines={1}>
                      {completedCount === totalCount ? '✓ ' : ''}
                      {completedCount}/{totalCount} Add-on{totalCount > 1 ? 's' : ''}
                    </Text>
                  );
                })()}
              </View>
            ) : null}

            {totalExpenses > 0 && (
              <View style={styles.profitPill}>
                <Ionicons
                  name={profit >= 0 ? 'trending-up' : 'trending-down'}
                  size={10}
                  color={profit >= 0 ? '#2E7D32' : '#C62828'}
                  style={{ marginRight: 3 }}
                />
                <Text
                  style={[
                    styles.profitPillText,
                    { color: profit >= 0 ? '#2E7D32' : '#C62828' },
                  ]}
                  numberOfLines={1}
                >
                  ${profit.toFixed(0)} profit
                </Text>
              </View>
            )}

            {order.reminderEnabled && (
              <View style={styles.reminderBadge}>
                <Ionicons name="notifications" size={10} color={Theme.colors.softLilac} />
              </View>
            )}

            {order.referenceImages && order.referenceImages.length > 1 && (
              <View style={styles.photoCountBadge}>
                <Ionicons name="images-outline" size={10} color={Theme.colors.textSecondary} />
                <Text style={styles.photoCountText}>+{order.referenceImages.length - 1}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Action column */}
        <View style={styles.actionColumn}>
          {order.status !== 'Delivered' && (
            <TouchableOpacity
              style={styles.advanceButton}
              onPress={onQuickAdvance}
              activeOpacity={0.7}
            >
              <Text style={styles.advanceText}>
                {nextStatusLabel[order.status] || 'Next'}
              </Text>
              <Ionicons name="chevron-forward" size={11} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={onDelete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={16} color={Theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Theme.colors.white,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  contentRow: {
    flexDirection: 'row',
  },
  imageBox: {
    width: 62,
    height: 62,
    borderRadius: 12,
    backgroundColor: Theme.colors.blushPink,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginRight: 12,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  details: {
    flex: 1,
    justifyContent: 'center',
  },
  topLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  customerName: {
    fontSize: 15,
    fontWeight: '700',
    color: Theme.colors.textDark,
    flex: 1,
    marginRight: 8,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 14,
    fontWeight: '800',
    color: Theme.colors.deepRose,
  },
  remainingDueText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#D81B60',
  },
  paidBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2E7D32',
  },
  cakeType: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
    marginTop: 1,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  fulfillmentTag: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.deepRose,
  },
  dotSeparator: {
    marginHorizontal: 5,
    color: Theme.colors.textSecondary,
    fontSize: 10,
  },
  dateText: {
    fontSize: 11,
    color: Theme.colors.textSecondary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  locationText: {
    fontSize: 11,
    color: Theme.colors.textSecondary,
    flex: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    flexWrap: 'wrap',
    gap: 5,
  },
  flavorPill: {
    backgroundColor: Theme.colors.cream,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    maxWidth: 90,
  },
  flavorText: {
    fontSize: 10,
    color: Theme.colors.textDark,
  },
  addonsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F3',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Theme.colors.roseGold,
  },
  addonsText: {
    fontSize: 10,
    fontWeight: '700',
    color: Theme.colors.deepRose,
  },
  profitPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F8E9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  profitPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  reminderBadge: {
    backgroundColor: Theme.colors.lavenderLight,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.cream,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  photoCountText: {
    fontSize: 9,
    color: Theme.colors.textSecondary,
  },
  actionColumn: {
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginLeft: 6,
    paddingVertical: 2,
  },
  advanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.deepRose,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 2,
  },
  advanceText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  deleteButton: {
    padding: 4,
  },
});

