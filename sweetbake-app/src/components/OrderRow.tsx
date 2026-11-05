import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CakeOrder } from '../types';
import { Theme } from '../theme';
import { StatusPill } from './StatusPill';
import { NotificationService } from '../services/notifications';
import { triggerHaptic } from '../services/haptics';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
  const [isExpanded, setIsExpanded] = useState(false);

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

  const toggleExpand = () => {
    triggerHaptic.selection();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.92}
      onPress={toggleExpand}
    >
      {/* Row 1: Customer Full Name (80% width) + Expand/Collapse Indicator */}
      <View style={styles.nameHeaderRow}>
        <View style={styles.nameContainer}>
          <Text style={styles.customerName} numberOfLines={2}>
            {order.customerName}
          </Text>
        </View>

        <View style={styles.priceAndChevron}>
          <Text style={styles.price}>${order.quotedPrice.toFixed(2)}</Text>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={Theme.colors.textSecondary}
            style={{ marginLeft: 6 }}
          />
        </View>
      </View>

      {/* Row 2: 4 Action Buttons (Copy, WhatsApp, Instagram, Delete) */}
      <View style={styles.actionButtonsRow}>
        {/* 1. Copy Message */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => {
            triggerHaptic.light();
            NotificationService.copyOrderMessage({
              customerName: order.customerName,
              customerPhone: order.customerPhone,
              customerInstagram: order.customerInstagram,
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
          activeOpacity={0.7}
        >
          <Ionicons name="copy-outline" size={15} color={Theme.colors.textDark} style={{ marginRight: 4 }} />
          <Text style={styles.actionBtnText}>Copy</Text>
        </TouchableOpacity>

        {/* 2. WhatsApp */}
        <TouchableOpacity
          style={[styles.actionBtn, styles.whatsAppBtn]}
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
          activeOpacity={0.7}
        >
          <Ionicons name="logo-whatsapp" size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={[styles.actionBtnText, styles.actionBtnTextWhite]}>WhatsApp</Text>
        </TouchableOpacity>

        {/* 3. Instagram */}
        <TouchableOpacity
          style={[styles.actionBtn, styles.instagramBtn]}
          onPress={() => {
            triggerHaptic.medium();
            NotificationService.sendInstagramNotification({
              customerName: order.customerName,
              customerPhone: order.customerPhone,
              customerInstagram: order.customerInstagram,
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
          activeOpacity={0.7}
        >
          <Ionicons name="logo-instagram" size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={[styles.actionBtnText, styles.actionBtnTextWhite]}>Instagram</Text>
        </TouchableOpacity>

        {/* 4. Delete */}
        <TouchableOpacity
          style={[styles.actionBtn, styles.deleteBtn]}
          onPress={onDelete}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={15} color="#C62828" style={{ marginRight: 4 }} />
          <Text style={[styles.actionBtnText, styles.deleteBtnText]}>Delete</Text>
        </TouchableOpacity>
      </View>

      {/* Row 3: Schedule Date & Time + Status Update Button */}
      <View style={styles.scheduleStatusRow}>
        <View style={styles.dateTimeContainer}>
          <Ionicons name="calendar-outline" size={13} color={Theme.colors.deepRose} style={{ marginRight: 4 }} />
          <Text style={styles.scheduleDateText}>{formattedDate}</Text>
          <Text style={styles.dotSeparator}>•</Text>
          <StatusPill status={order.status} />
        </View>

        {order.status !== 'Delivered' ? (
          <TouchableOpacity
            style={styles.advanceStatusButton}
            onPress={onQuickAdvance}
            activeOpacity={0.75}
          >
            <Text style={styles.advanceStatusText}>
              {nextStatusLabel[order.status] || 'Update Status'}
            </Text>
            <Ionicons name="chevron-forward" size={13} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <View style={styles.completedBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#2E7D32" style={{ marginRight: 3 }} />
            <Text style={styles.completedBadgeText}>Completed</Text>
          </View>
        )}
      </View>

      {/* Collapsible Details: Revealed when full card is tapped */}
      {isExpanded && (
        <View style={styles.expandedSection}>
          <View style={styles.divider} />

          {/* Quick Edit Details CTA */}
          <View style={styles.expandedHeaderRow}>
            <Text style={styles.expandedSectionTitle}>Order Preparation Details</Text>
            <TouchableOpacity
              style={styles.editOrderBtn}
              onPress={onPress}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={13} color={Theme.colors.deepRose} style={{ marginRight: 3 }} />
              <Text style={styles.editOrderBtnText}>Edit Order</Text>
            </TouchableOpacity>
          </View>

          {/* Cake Specs Grid */}
          <View style={styles.prepGrid}>
            <View style={styles.prepItem}>
              <Text style={styles.prepLabel}>Type</Text>
              <Text style={styles.prepValue}>{order.cakeType || 'Standard'}</Text>
            </View>

            <View style={styles.prepItem}>
              <Text style={styles.prepLabel}>Shape</Text>
              <Text style={styles.prepValue}>{order.shape || 'Round'}</Text>
            </View>

            <View style={styles.prepItem}>
              <Text style={styles.prepLabel}>Flavor</Text>
              <Text style={styles.prepValue}>{order.flavor || 'Vanilla'}</Text>
            </View>

            <View style={styles.prepItem}>
              <Text style={styles.prepLabel}>Fulfillment</Text>
              <Text style={styles.prepValue}>{order.fulfillmentType || 'Pickup'}</Text>
            </View>
          </View>

          {/* Custom Requirements / Baking Notes */}
          {Boolean(order.customRequirements) && (
            <View style={styles.prepCardBox}>
              <View style={styles.prepBoxHeader}>
                <Ionicons name="document-text-outline" size={13} color={Theme.colors.deepRose} style={{ marginRight: 4 }} />
                <Text style={styles.prepBoxTitle}>Baking & Decoration Instructions</Text>
              </View>
              <Text style={styles.prepBoxBody}>{order.customRequirements}</Text>
            </View>
          )}

          {/* Add-ons List */}
          {order.addons && order.addons.length > 0 && (
            <View style={styles.addonsSection}>
              <Text style={styles.prepLabel}>Add-ons & Extras</Text>
              <View style={styles.addonsList}>
                {order.addons.map((addon, index) => (
                  <View key={`${addon}-${index}`} style={styles.addonTag}>
                    <Ionicons name="sparkles" size={10} color={Theme.colors.deepRose} style={{ marginRight: 4 }} />
                    <Text style={styles.addonTagText}>{addon}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Fulfillment & Location */}
          {Boolean(order.location) && (
            <View style={styles.infoRowItem}>
              <Ionicons name="location-outline" size={13} color={Theme.colors.textSecondary} style={{ marginRight: 5 }} />
              <Text style={styles.infoRowText}>
                <Text style={{ fontWeight: '700' }}>Location: </Text>
                {order.location}
              </Text>
            </View>
          )}

          {/* Delivery Handover / Driver */}
          {order.fulfillmentType === 'Delivery' && (order.deliveryPerson || order.deliveryCost !== undefined || order.deliveryHandoverTime) && (
            <View style={styles.infoRowItem}>
              <Ionicons name="bicycle-outline" size={13} color={Theme.colors.deepRose} style={{ marginRight: 5 }} />
              <Text style={styles.infoRowText}>
                {[
                  order.deliveryPerson ? `Driver: ${order.deliveryPerson}` : null,
                  order.deliveryCost !== undefined ? `Delivery Fee: $${order.deliveryCost.toFixed(2)}` : null,
                  order.deliveryHandoverTime ? `Handover: ${new Date(order.deliveryHandoverTime).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}` : null,
                ].filter(Boolean).join(' • ')}
              </Text>
            </View>
          )}

          {/* Financial Breakdown */}
          <View style={styles.financeSummaryRow}>
            <View style={styles.financeItem}>
              <Text style={styles.financeLabel}>Quoted</Text>
              <Text style={styles.financeValue}>${order.quotedPrice.toFixed(2)}</Text>
            </View>
            <View style={styles.financeItem}>
              <Text style={styles.financeLabel}>Down Payment</Text>
              <Text style={styles.financeValue}>${(order.downPayment || 0).toFixed(2)}</Text>
            </View>
            <View style={styles.financeItem}>
              <Text style={styles.financeLabel}>Remaining</Text>
              <Text style={[styles.financeValue, { color: remaining > 0 ? '#D81B60' : '#2E7D32' }]}>
                {remaining > 0 ? `$${remaining.toFixed(2)}` : 'Paid'}
              </Text>
            </View>
            {totalExpenses > 0 && (
              <View style={styles.financeItem}>
                <Text style={styles.financeLabel}>Est. Profit</Text>
                <Text style={[styles.financeValue, { color: profit >= 0 ? '#2E7D32' : '#C62828' }]}>
                  ${profit.toFixed(2)}
                </Text>
              </View>
            )}
          </View>

          {/* Reference Images Gallery if any */}
          {order.referenceImages && order.referenceImages.length > 0 && (
            <View style={styles.imageGallerySection}>
              <Text style={styles.prepLabel}>Reference Design Photos ({order.referenceImages.length})</Text>
              <View style={styles.galleryRow}>
                {order.referenceImages.map((uri, idx) => (
                  <Image
                    key={`img-${idx}`}
                    source={{ uri }}
                    style={styles.galleryThumb}
                    resizeMode="cover"
                  />
                ))}
              </View>
            </View>
          )}
        </View>
      )}
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
  // Row 1: Full name (80%) + Price/Chevron
  nameHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  nameContainer: {
    width: '80%',
    paddingRight: 6,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '800',
    color: Theme.colors.textDark,
    lineHeight: 21,
  },
  priceAndChevron: {
    width: '20%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  price: {
    fontSize: 15,
    fontWeight: '800',
    color: Theme.colors.deepRose,
  },
  // Row 2: 4 Action Buttons
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.cream,
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8DED8',
  },
  whatsAppBtn: {
    backgroundColor: '#25D366',
    borderColor: '#25D366',
  },
  instagramBtn: {
    backgroundColor: '#E1306C',
    borderColor: '#E1306C',
  },
  deleteBtn: {
    backgroundColor: '#FFF0F2',
    borderColor: '#FFCDD2',
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.textDark,
  },
  actionBtnTextWhite: {
    color: '#FFFFFF',
  },
  deleteBtnText: {
    color: '#C62828',
  },
  // Row 3: Date, Time & Status Update
  scheduleStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
  },
  scheduleDateText: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.textDark,
  },
  dotSeparator: {
    marginHorizontal: 6,
    color: Theme.colors.textSecondary,
    fontSize: 12,
  },
  advanceStatusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.deepRose,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 3,
    marginLeft: 8,
  },
  advanceStatusText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F8E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  completedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2E7D32',
  },
  // Collapsible section
  expandedSection: {
    marginTop: 10,
  },
  divider: {
    height: 1,
    backgroundColor: Theme.colors.border,
    marginBottom: 10,
  },
  expandedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  expandedSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Theme.colors.deepRose,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Theme.colors.roseGold,
  },
  editOrderBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.deepRose,
  },
  prepGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: Theme.colors.cream,
    borderRadius: 12,
    padding: 10,
    gap: 10,
    marginBottom: 8,
  },
  prepItem: {
    width: '46%',
  },
  prepLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Theme.colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  prepValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.colors.textDark,
  },
  prepCardBox: {
    backgroundColor: '#FBF9F6',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EFE8E1',
    marginBottom: 8,
  },
  prepBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  prepBoxTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.deepRose,
  },
  prepBoxBody: {
    fontSize: 12,
    color: Theme.colors.textDark,
    lineHeight: 17,
  },
  addonsSection: {
    marginBottom: 8,
  },
  addonsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  addonTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Theme.colors.roseGold,
  },
  addonTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: Theme.colors.deepRose,
  },
  infoRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoRowText: {
    fontSize: 12,
    color: Theme.colors.textDark,
    flex: 1,
  },
  financeSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F9F7F3',
    padding: 10,
    borderRadius: 10,
    marginTop: 4,
    marginBottom: 8,
  },
  financeItem: {
    alignItems: 'center',
  },
  financeLabel: {
    fontSize: 10,
    color: Theme.colors.textSecondary,
    fontWeight: '600',
    marginBottom: 2,
  },
  financeValue: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.textDark,
  },
  imageGallerySection: {
    marginTop: 4,
  },
  galleryRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  galleryThumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: Theme.colors.blushPink,
  },
});


