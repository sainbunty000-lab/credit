import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EligibilityBadge } from './EligibilityBadge';
import { useTheme } from '../theme/ThemeContext';
import { ThemeColors } from '../theme/themes';

interface SummarySectionProps {
  summary?: string | null;
  eligibilityStatus?: string | null;
  confidence?: number | null;
  title?: string;
}

function makeStyles(theme: ThemeColors) {
  return StyleSheet.create({
    container: {
      backgroundColor: theme.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.cardBorder,
      padding: 16,
      marginBottom: 12,
    },
    sectionTitle: {
      color: theme.subText,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: 10,
    },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 12,
    },
    confidence: {
      color: theme.subText,
      fontSize: 12,
      fontWeight: '500',
    },
    summaryText: {
      color: theme.text,
      fontSize: 13,
      lineHeight: 21,
    },
  });
}

export function SummarySection({ summary, eligibilityStatus, confidence, title = 'AI Analysis Summary' }: SummarySectionProps) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  if (!summary && !eligibilityStatus) return null;

  return (
    <View style={styles.container}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      {eligibilityStatus ? (
        <View style={styles.badgeRow}>
          <EligibilityBadge status={eligibilityStatus} size="md" />
          {confidence != null ? (
            <Text style={styles.confidence}>Confidence: {Math.round(confidence * 100)}%</Text>
          ) : null}
        </View>
      ) : null}
      {summary ? <Text style={styles.summaryText}>{summary}</Text> : null}
    </View>
  );
}
