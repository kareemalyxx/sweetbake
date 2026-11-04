import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CakeOrder } from '../types';
import { Theme } from '../theme';
import { StatusPill } from './StatusPill';
import { NotificationService } from '../services/notifications';
import { triggerHaptic } from '../services/haptics';

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

            {order.addons && order.addons.length > 0 ? (
              <View style={styles.addonsPill}>
                <Ionicons name="sparkles" size={12} color={Theme.colors.deepRose} style={{ marginRight: 4 }} />
                <Text style={styles.addonsText} numberOfLines={1}>
                  +{order.addons.length} Add-on{order.addons.length > 1 ? 's' : ''}
                </Text>
              </View>
            ) : null}

            {totalExpenses > 0 && (
              <View style={styles.profitPill}>
                <Ionicons
                  name={profit >= 0 ? 'trending-up' : 'trending-down'}
                  size={12}
                  color={profit >= 0 ? '#2E7D32' : '#C62828'}
                  style={{ marginRight: 4 }}
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
                <Ionicons name="notifications" size={13} color={Theme.colors.softLilac} />
              </View>
            )}

            {order.referenceImages && order.referenceImages.length > 1 && (
              <View style={styles.photoCountBadge}>
                <Ionicons name="images-outline" size={12} color={Theme.colors.textSecondary} />
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
              <Ionicons name="chevron-forward" size={13} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          <View style={styles.iconActionRow}>
            {/* Quick WhatsApp Reminder Trigger */}
            <TouchableOpacity
              style={styles.whatsAppIconBtn}
              onPress={() => {
                triggerHaptic.medium();
                NotificationService.sendWhatsAppNotification({
                  customerName: order.customerName,
                  customerPhone: order.customerPhone,
                  deliveryDate: order.deliveryDate,
                  cakeType: order.cakeType,
                  shape: order.shape,
                  flavor: order.flavor,
                  fulfillmentType: order.fulfillmentType,
                  location: order.location,
                  quotedPrice: order.quotedPrice,
                  remainingPayment: remaining,
                });
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="logo-whatsapp" size={19} color="#25D366" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={onDelete}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="trash-outline" size={18} color={Theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Theme.colors.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
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
    width: 68,
    height: 68,
    borderRadius: 14,
    backgroundColor: Theme.colors.blushPink,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginRight: 14,
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
    fontSize: 16,
    fontWeight: '700',
    color: Theme.colors.textDark,
    flex: 1,
    marginRight: 8,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 15,
    fontWeight: '800',
    color: Theme.colors.deepRose,
  },
  remainingDueText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D81B60',
    marginTop: 1,
  },
  paidBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2E7D32',
    marginTop: 1,
  },
  cakeType: {
    fontSize: 13,
    fontWeight: '500',
    color: Theme.colors.textSecondary,
    marginTop: 2,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  fulfillmentTag: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.deepRose,
  },
  dotSeparator: {
    marginHorizontal: 6,
    color: Theme.colors.textSecondary,
    fontSize: 12,
  },
  dateText: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  locationText: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
    flex: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    flexWrap: 'wrap',
    gap: 6,
  },
  flavorPill: {
    backgroundColor: Theme.colors.cream,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    maxWidth: 110,
  },
  flavorText: {
    fontSize: 11,
    fontWeight: '600',
    color: Theme.colors.textDark,
  },
  addonsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Theme.colors.roseGold,
  },
  addonsText: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.deepRose,
  },
  profitPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F8E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  profitPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  reminderBadge: {
    backgroundColor: Theme.colors.lavenderLight,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.cream,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 3,
  },
  photoCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
  },
  actionColumn: {
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginLeft: 8,
    paddingVertical: 2,
  },
  advanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.deepRose,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 3,
  },
  advanceText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  iconActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  whatsAppIconBtn: {
    padding: 6,
  },
  deleteButton: {
    padding: 6,
  },
});

