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
            <Text style={styles.price}>${order.quotedPrice.toFixed(2)}</Text>
          </View>

          <Text style={styles.cakeType} numberOfLines={1}>
            {order.cakeType} • {order.shape}
          </Text>

          <View style={styles.scheduleRow}>
            <Ionicons name="calendar-outline" size={12} color={Theme.colors.textSecondary} style={{ marginRight: 4 }} />
            <Text style={styles.dateText}>{formattedDate}</Text>
          </View>

          <View style={styles.bottomRow}>
            <StatusPill status={order.status} />

            {order.flavor ? (
              <View style={styles.flavorPill}>
                <Text style={styles.flavorText} numberOfLines={1}>
                  {order.flavor}
                </Text>
              </View>
            ) : null}

            {order.referenceImages && order.referenceImages.length > 1 && (
              <View style={styles.photoCountBadge}>
                <Ionicons name="images-outline" size={10} color={Theme.colors.textSecondary} />
                <Text style={styles.photoCountText}>+{order.referenceImages.length - 1}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Swipe/Quick Actions Bar */}
      <View style={styles.actionBar}>
        {order.status !== 'Delivered' && (
          <TouchableOpacity
            style={styles.advanceButton}
            onPress={onQuickAdvance}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-forward-circle" size={14} color={Theme.colors.deepRose} style={{ marginRight: 4 }} />
            <Text style={styles.advanceButtonText}>
              Mark {nextStatusLabel[order.status] || 'Next'}
            </Text>
          </TouchableOpacity>
        )}

        <View style={{ flex: 1 }} />

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={onDelete}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={14} color={Theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.borderRadius.card,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    shadowColor: Theme.colors.textDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  contentRow: {
    flexDirection: 'row',
  },
  imageBox: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: Theme.colors.lavenderLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: 12,
  },
  image: {
    width: 60,
    height: 60,
  },
  details: {
    flex: 1,
  },
  topLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '800',
    color: Theme.colors.textDark,
    flex: 1,
    marginRight: 8,
  },
  price: {
    fontSize: 15,
    fontWeight: '800',
    color: Theme.colors.textMauve,
  },
  cakeType: {
    fontSize: 13,
    color: Theme.colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  dateText: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  flavorPill: {
    backgroundColor: Theme.colors.warmIvory,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: Theme.borderRadius.pill,
    maxWidth: 120,
  },
  flavorText: {
    fontSize: 11,
    color: Theme.colors.textSecondary,
    fontWeight: '600',
  },
  photoCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  photoCountText: {
    fontSize: 10,
    color: Theme.colors.textSecondary,
    fontWeight: '700',
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.warmIvory,
  },
  advanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.blushPink,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Theme.borderRadius.pill,
  },
  advanceButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.deepRose,
  },
  deleteButton: {
    padding: 4,
  },
});

