import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { ThemeColors } from '../theme/themes';

interface KPIBoxProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  delay?: number;
}

function makeStyles(theme: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.card,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.cardBorder,
      ...Platform.select({
        ios: {
          shadowColor: theme.glow ? theme.primary : '#1A2E1A',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: theme.glow ? 0.35 : 0.07,
          shadowRadius: theme.glow ? 16 : 8,
        },
        android: {
          elevation: theme.glow ? 8 : 2,
        },
      }),
    },
    iconWrapper: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    title: {
      color: theme.subText,
      fontSize: 11,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    value: {
      color: theme.text,
      fontSize: 20,
      fontWeight: '700',
      marginBottom: 2,
    },
    subtitle: {
      color: theme.textMuted,
      fontSize: 11,
    },
    trendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      marginTop: 6,
    },
    trendText: {
      fontSize: 11,
      fontWeight: '600',
    },
  });
}

export const KPIBox: React.FC<KPIBoxProps> = ({
  title,
  value,
  subtitle,
  icon,
  iconColor,
  trend,
  trendValue,
  delay = 0,
}) => {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const resolvedIconColor = iconColor ?? theme.primary;

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) }));
    translateY.value = withDelay(delay, withTiming(0, { duration: 500, easing: Easing.out(Easing.ease) }));
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const trendColor =
    trend === 'up' ? theme.success : trend === 'down' ? theme.error : theme.textMuted;
  const trendIcon =
    trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'remove';

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View style={[styles.iconWrapper, { backgroundColor: `${resolvedIconColor}1A` }]}>
        <Ionicons name={icon} size={22} color={resolvedIconColor} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.value}>{value}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {trend && trendValue ? (
        <View style={styles.trendRow}>
          <Ionicons name={trendIcon as any} size={12} color={trendColor} />
          <Text style={[styles.trendText, { color: trendColor }]}>{trendValue}</Text>
        </View>
      ) : null}
    </Animated.View>
  );
};
