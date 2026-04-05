import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeContext';
import { ThemeColors } from '../theme/themes';

type EligibilityStatus = 'Eligible' | 'Not Eligible' | 'Conditional' | 'ELIGIBLE' | 'NOT ELIGIBLE' | 'CONDITIONALLY ELIGIBLE' | string;

interface EligibilityBadgeProps {
  status: EligibilityStatus;
  size?: 'sm' | 'md' | 'lg';
}

function getStatusConfig(status: EligibilityStatus, theme: ThemeColors) {
  const s = status?.toUpperCase() ?? '';
  if (s.includes('NOT') || s.includes('INELIGIBLE')) {
    return { color: theme.error, bg: `${theme.error}15`, icon: 'close-circle' as const, label: 'Not Eligible' };
  }
  if (s.includes('CONDITIONAL')) {
    return { color: theme.yellow, bg: `${theme.yellow}15`, icon: 'alert-circle' as const, label: 'Conditional' };
  }
  return { color: theme.green, bg: `${theme.green}15`, icon: 'checkmark-circle' as const, label: 'Eligible' };
}

export function EligibilityBadge({ status, size = 'md' }: EligibilityBadgeProps) {
  const { theme } = useTheme();
  const { color, bg, icon, label } = getStatusConfig(status, theme);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 10, stiffness: 120 });
  }, [status]);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const iconSize = size === 'lg' ? 28 : size === 'sm' ? 16 : 20;
  const fontSize = size === 'lg' ? 15 : size === 'sm' ? 11 : 13;

  return (
    <Animated.View style={[styles.badge, { backgroundColor: bg, borderColor: color }, animStyle]}>
      <Ionicons name={icon} size={iconSize} color={color} />
      <Text style={[styles.text, { color, fontSize }]}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 24,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 6,
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
