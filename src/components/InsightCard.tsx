import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

type InsightType = 'strength' | 'risk' | 'recommendation' | 'info';

interface InsightCardProps {
  items: string[];
  type?: InsightType;
  title?: string;
  compact?: boolean;
}

const TYPE_CONFIG: Record<InsightType, { color: string; bg: string; border: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
  strength: { color: colors.green, bg: `${colors.green}10`, border: `${colors.green}30`, icon: 'checkmark-circle-outline' },
  risk: { color: colors.error, bg: `${colors.error}08`, border: `${colors.error}25`, icon: 'warning-outline' },
  recommendation: { color: colors.primary, bg: colors.primaryLight, border: `${colors.primary}30`, icon: 'bulb-outline' },
  info: { color: colors.cyan, bg: `${colors.cyan}10`, border: `${colors.cyan}25`, icon: 'information-circle-outline' },
};

export function InsightCard({ items, type = 'info', title, compact = false }: InsightCardProps) {
  if (!items || items.length === 0) return null;
  const cfg = TYPE_CONFIG[type];

  return (
    <View style={[styles.container, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      {title ? (
        <View style={styles.titleRow}>
          <Ionicons name={cfg.icon} size={15} color={cfg.color} />
          <Text style={[styles.title, { color: cfg.color }]}>{title}</Text>
        </View>
      ) : null}
      {items.map((item, i) => (
        <View key={i} style={[styles.itemRow, compact && styles.itemRowCompact]}>
          <View style={[styles.dot, { backgroundColor: cfg.color }]} />
          <Text style={[styles.itemText, { color: colors.text }]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  itemRowCompact: {
    marginBottom: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    flexShrink: 0,
  },
  itemText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
});
