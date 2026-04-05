import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { ThemeColors } from '../theme/themes';

type InsightType = 'strength' | 'risk' | 'recommendation' | 'info';

interface InsightCardProps {
  items: string[];
  type?: InsightType;
  title?: string;
  compact?: boolean;
}

function getTypeConfig(type: InsightType, theme: ThemeColors) {
  const configs: Record<InsightType, { color: string; bg: string; border: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
    strength: { color: theme.green, bg: `${theme.green}10`, border: `${theme.green}30`, icon: 'checkmark-circle-outline' },
    risk: { color: theme.error, bg: `${theme.error}08`, border: `${theme.error}25`, icon: 'warning-outline' },
    recommendation: { color: theme.primary, bg: theme.primaryLight, border: `${theme.primary}30`, icon: 'bulb-outline' },
    info: { color: theme.cyan, bg: `${theme.cyan}10`, border: `${theme.cyan}25`, icon: 'information-circle-outline' },
  };
  return configs[type];
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

export function InsightCard({ items, type = 'info', title, compact = false }: InsightCardProps) {
  const { theme } = useTheme();
  if (!items || items.length === 0) return null;
  const cfg = getTypeConfig(type, theme);

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
          <Text style={[styles.itemText, { color: theme.text }]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}
