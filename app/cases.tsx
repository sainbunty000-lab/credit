import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '../src/theme/ThemeContext';
import { ThemeColors } from '../src/theme/themes';
import { Card, SectionHeader, StatusBadge } from '../src/components';
import { getCases, deleteCase } from '../src/api';
import { Case } from '../src/types';
import { useAppStore } from '../src/store';

export default function CasesScreen() {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const { cases, setCases, removeCase, setLoadedCase, setWCResult, setTrendResult, setGstItrResult } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCases = useCallback(async () => {
    try {
      const data = await getCases();
      setCases(data);
    } catch (error) {
      console.log('Error fetching cases:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [setCases]);

  useFocusEffect(
    useCallback(() => {
      fetchCases();
    }, [fetchCases])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchCases();
  };

  const handleDelete = (caseId: string) => {
    Alert.alert(
      'Delete Case',
      'Are you sure you want to delete this case?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // Remove from local state immediately for responsive UI
            removeCase(caseId);
            try {
              await deleteCase(caseId);
            } catch (error: any) {
              // If the case was already deleted on the backend (404), that's fine.
              // For other errors, restore is complex so we just log.
              const status = error?.response?.status;
              if (status !== 404) {
                console.log('Delete case error:', error);
              }
            }
          },
        },
      ]
    );
  };

  const handleOpenCase = (caseItem: Case) => {
    setLoadedCase(caseItem);
    // Pre-load the result into the appropriate store field
    if (caseItem.analysis_type === 'working_capital') {
      setWCResult(caseItem.data);
      router.navigate('/wc');
    } else if (caseItem.analysis_type === 'multi_year') {
      setTrendResult(caseItem.data);
      router.navigate('/trend');
    } else if (caseItem.analysis_type === 'gst_itr') {
      setGstItrResult(caseItem.data);
      router.navigate('/gst');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'working_capital':
        return 'bar-chart-outline';
      case 'multi_year':
        return 'trending-up-outline';
      case 'gst_itr':
        return 'shield-checkmark-outline';
      default:
        return 'document-outline';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'working_capital':
        return theme.yellow;
      case 'multi_year':
        return theme.purple;
      case 'gst_itr':
        return theme.cyan;
      default:
        return theme.primary;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'working_capital':
        return 'WC Analysis';
      case 'multi_year':
        return 'Multi-Year';
      case 'gst_itr':
        return 'GST & ITR';
      default:
        return type;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Loading cases...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.brandName}>FINANCIAL ANALYTICS</Text>
          <Text style={styles.title}>Saved Cases</Text>
          <Text style={styles.subtitle}>{cases.length} analysis records saved</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="bar-chart-outline" size={20} color={theme.yellow} />
            <Text style={styles.statValue}>
              {cases.filter((c) => c.analysis_type === 'working_capital').length}
            </Text>
            <Text style={styles.statLabel}>WC</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="trending-up-outline" size={20} color={theme.purple} />
            <Text style={styles.statValue}>
              {cases.filter((c) => c.analysis_type === 'multi_year').length}
            </Text>
            <Text style={styles.statLabel}>Trend</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="shield-checkmark-outline" size={20} color={theme.cyan} />
            <Text style={styles.statValue}>
              {cases.filter((c) => c.analysis_type === 'gst_itr').length}
            </Text>
            <Text style={styles.statLabel}>GST & ITR</Text>
          </View>
        </View>

        {/* Cases List */}
        {cases.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="folder-open-outline" size={48} color={theme.textMuted} />
            <Text style={styles.emptyTitle}>No saved cases yet</Text>
            <Text style={styles.emptyText}>Complete an analysis and save it to see it here</Text>
          </Card>
        ) : (
          <>
            <SectionHeader title="All Cases" color={theme.primary} />
            {cases.map((caseItem) => (
              <TouchableOpacity
                key={caseItem.id}
                style={styles.caseCard}
                onPress={() => handleOpenCase(caseItem)}
                activeOpacity={0.8}
              >
                <View style={styles.caseHeader}>
                  <View style={[styles.caseIcon, { backgroundColor: getTypeColor(caseItem.analysis_type) + '20' }]}>
                    <Ionicons
                      name={getTypeIcon(caseItem.analysis_type) as any}
                      size={20}
                      color={getTypeColor(caseItem.analysis_type)}
                    />
                  </View>
                  <View style={styles.caseInfo}>
                    <Text style={styles.caseName}>{caseItem.company_name}</Text>
                    <View style={styles.caseMetaRow}>
                      <StatusBadge status={getTypeLabel(caseItem.analysis_type)} variant="info" />
                      <Text style={styles.caseDate}>{formatDate(caseItem.timestamp)}</Text>
                    </View>
                  </View>
                  <View style={styles.caseActions}>
                    <TouchableOpacity
                      onPress={() => handleDelete(caseItem.id)}
                      style={styles.deleteButton}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={18} color={theme.red} />
                    </TouchableOpacity>
                    <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (theme: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: theme.subText,
    marginTop: 12,
  },
  header: {
    marginBottom: 20,
  },
  brandName: {
    color: theme.orange,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2,
    marginBottom: 4,
  },
  title: {
    color: theme.text,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitle: {
    color: theme.subText,
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.card,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  statValue: {
    color: theme.text,
    fontSize: 22,
    fontWeight: '700',
    marginTop: 6,
  },
  statLabel: {
    color: theme.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    color: theme.subText,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyText: {
    color: theme.textMuted,
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  caseCard: {
    backgroundColor: theme.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    marginBottom: 12,
    overflow: 'hidden',
  },
  caseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  caseIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  caseInfo: {
    flex: 1,
  },
  caseName: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  caseMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  caseDate: {
    color: theme.textMuted,
    fontSize: 11,
  },
  caseActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteButton: {
    padding: 4,
  },
});
