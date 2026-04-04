import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface StatusBadgeProps {
  status: string;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, variant = 'neutral' }) => {
  const getColors = () => {
    switch (variant) {
      case 'success':
        return { bg: 'rgba(16, 185, 129, 0.2)', text: colors.green };
      case 'warning':
        return { bg: 'rgba(245, 158, 11, 0.2)', text: colors.yellow };
      case 'error':
        return { bg: 'rgba(239, 68, 68, 0.2)', text: colors.red };
      case 'info':
        return { bg: 'rgba(59, 130, 246, 0.2)', text: colors.primary };
      default:
        return { bg: 'rgba(136, 136, 153, 0.2)', text: colors.textSecondary };
    }
  };

  const badgeColors = getColors();

  return (
    <View style={[styles.badge, { backgroundColor: badgeColors.bg }]}>
      <Text style={[styles.text, { color: badgeColors.text }]}>{status}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
