import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OrderStatus } from '../types';
import { Theme } from '../theme';

interface StatusPillProps {
  status: OrderStatus;
}

export const StatusPill: React.FC<StatusPillProps> = ({ status }) => {
  const getColors = () => {
    switch (status) {
      case 'Pending':
        return { bg: Theme.colors.status.pending, text: Theme.colors.status.pendingDark, icon: 'time' as const };
      case 'Baking':
        return { bg: Theme.colors.status.baking, text: Theme.colors.status.bakingDark, icon: 'flame' as const };
      case 'Decorating':
        return { bg: Theme.colors.status.decorating, text: Theme.colors.status.decoratingDark, icon: 'sparkles' as const };
      case 'Delivered':
        return { bg: Theme.colors.status.delivered, text: Theme.colors.status.deliveredDark, icon: 'checkmark-circle' as const };
      default:
        return { bg: Theme.colors.status.pending, text: Theme.colors.status.pendingDark, icon: 'time' as const };
    }
  };

  const { bg, text, icon } = getColors();

  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={13} color={text} style={{ marginRight: 5 }} />
      <Text style={[styles.text, { color: text }]}>{status}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Theme.borderRadius.pill,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
  },
});

