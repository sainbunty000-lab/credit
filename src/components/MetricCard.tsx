import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface MetricCardProps {
  value: string | number;
  label: string;
  color?: string;
  suffix?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  value,
  label,
  color = colors.primary,
  suffix = '',
}) => {
  return (
    <View style={styles.container}>
      <Text style={[styles.value, { color }]}>
        {value}{suffix}
      </Text>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.dot, { backgroundColor: color }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  value: {
    fontSize: 18,
    fontWeight: '700',
  },
  label: {
    color: colors.textSecondary,
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
