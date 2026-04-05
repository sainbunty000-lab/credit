import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { ThemeColors } from '../theme/themes';

interface MetricCardProps {
  value: string | number;
  label: string;
  color?: string;
  suffix?: string;
}

function makeStyles(theme: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.card,
      borderRadius: 10,
      padding: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.cardBorder,
    },
    value: {
      fontSize: 18,
      fontWeight: '700',
    },
    label: {
      color: theme.subText,
      fontSize: 10,
      textTransform: 'uppercase',
      marginTop: 4,
      textAlign: 'center',
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginTop: 8,
    },
  });
}

export const MetricCard: React.FC<MetricCardProps> = ({
  value,
  label,
  color,
  suffix = '',
}) => {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const resolvedColor = color ?? theme.primary;
  return (
    <View style={styles.container}>
      <Text style={[styles.value, { color: resolvedColor }]}>
        {value}{suffix}
      </Text>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.dot, { backgroundColor: resolvedColor }]} />
    </View>
  );
};
