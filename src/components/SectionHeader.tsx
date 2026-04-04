import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface SectionHeaderProps {
  title: string;
  color?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, color = colors.primary }) => {
  return (
    <View style={styles.container}>
      <View style={[styles.indicator, { backgroundColor: color }]} />
      <Text style={styles.title}>{title}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  indicator: {
    width: 4,
    height: 16,
    borderRadius: 2,
    marginRight: 10,
  },
  title: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});
