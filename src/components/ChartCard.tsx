import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeContext';
import { ThemeColors } from '../theme/themes';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  delay?: number;
}

function makeStyles(theme: ThemeColors) {
  return StyleSheet.create({
    container: {
      backgroundColor: theme.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.cardBorder,
      padding: 16,
      marginBottom: 14,
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
    header: {
      marginBottom: 12,
    },
    title: {
      color: theme.text,
      fontSize: 15,
      fontWeight: '700',
    },
    subtitle: {
      color: theme.subText,
      fontSize: 12,
      marginTop: 2,
    },
    chartArea: {
      alignItems: 'center',
    },
  });
}

export const ChartCard: React.FC<ChartCardProps> = ({ title, subtitle, children, delay = 0 }) => {
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(16);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) }));
    translateY.value = withDelay(delay, withTiming(0, { duration: 500, easing: Easing.out(Easing.ease) }));
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <View style={styles.chartArea}>{children}</View>
    </Animated.View>
  );
};
