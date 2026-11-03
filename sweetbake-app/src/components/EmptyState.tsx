import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../theme';
import { triggerHaptic } from '../services/haptics';

interface EmptyStateProps {
  title: string;
  subtitle: string;
  actionTitle?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  subtitle,
  actionTitle,
  onAction,
}) => {
  return (
    <View style={styles.container}>
      {/* Decorative Cake Stand Illustration */}
      <View style={styles.illustrationWrapper}>
        <View style={styles.glow} />
        
        {/* Cloche knob */}
        <View style={styles.clocheKnob} />
        {/* Cloche Dome */}
        <View style={styles.clocheDome} />
        {/* Cake Stand Plate */}
        <View style={styles.standPlate} />
        {/* Stand Pillar */}
        <View style={styles.standStem} />
        {/* Stand Base */}
        <View style={styles.standBase} />
        
        {/* Decorative sparkles */}
        <Ionicons name="sparkles" size={18} color={Theme.colors.deepRose} style={styles.sparkleTopRight} />
        <Ionicons name="sparkles" size={14} color={Theme.colors.softLilac} style={styles.sparkleBottomLeft} />
        <Ionicons name="heart" size={12} color={Theme.colors.pastelRose} style={styles.heartBottomRight} />
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      {actionTitle && onAction && (
        <TouchableOpacity
          style={styles.actionButton}
          activeOpacity={0.8}
          onPress={() => {
            triggerHaptic.medium();
            onAction();
          }}
        >
          <Ionicons name="add-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.actionText}>{actionTitle}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
  },
  illustrationWrapper: {
    width: 140,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: Theme.colors.blushPink,
    opacity: 0.6,
  },
  clocheKnob: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Theme.colors.pastelRose,
    backgroundColor: Theme.colors.white,
    marginBottom: -2,
    zIndex: 2,
  },
  clocheDome: {
    width: 68,
    height: 40,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderWidth: 1.5,
    borderColor: Theme.colors.pastelRose,
  },
  standPlate: {
    width: 86,
    height: 6,
    backgroundColor: Theme.colors.roseGold,
    borderRadius: 3,
    marginTop: 1,
  },
  standStem: {
    width: 10,
    height: 18,
    backgroundColor: Theme.colors.roseGold,
    opacity: 0.85,
  },
  standBase: {
    width: 50,
    height: 8,
    backgroundColor: Theme.colors.roseGold,
    borderRadius: 4,
  },
  sparkleTopRight: {
    position: 'absolute',
    top: 6,
    right: 18,
  },
  sparkleBottomLeft: {
    position: 'absolute',
    bottom: 24,
    left: 14,
  },
  heartBottomRight: {
    position: 'absolute',
    bottom: 12,
    right: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: Theme.colors.textDark,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.roseGold,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: Theme.colors.roseGold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
