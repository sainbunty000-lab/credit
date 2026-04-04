import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../src/theme/colors';
import { Card, SectionHeader, StatusBadge } from '../src/components';
import { getCases, deleteCase } from '../src/api';
import { Case } from '../src/types';
import { useAppStore } from '../src/store';

export default function CasesScreen() {
  const { cases, setCases, removeCase } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedCase, setExpandedCase] = useState<string | null>(null);

  const fetchCases = async () => {
    try {
      const data = await getCases();
      setCases(data);
    } catch (error) {
      console.log('Error fetching cases:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

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
            try {
              await deleteCase(caseId);
              removeCase(caseId);
              Alert.alert('Success', 'Case deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete case');
            }
          },
        },
      ]
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'working_capital':
        return 'bar-chart-outline';
      case 'banking':
        return 'business-outline';
      case 'multi_year':
        return 'trending-up-outline';
      default:
        return 'document-outline';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'working_capital':
        return colors.yellow;
      case 'banking':
        return colors.green;
      case 'multi_year':
        return colors.purple;
      default:
        return colors.primary;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'working_capital':
        return 'WC Analysis';
      case 'banking':
        return 'Banking';
      case 'multi_year':
        return 'Multi-Year';
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

  const renderCaseDetails = (caseItem: Case) => {
    const data = caseItem.data;
    
    if (caseItem.analysis_type === 'working_capital') {
      return (
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Current Ratio</Text>
            <Text style={styles.detailValue}>{data.current_ratio?.toFixed(2)}x</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Quick Ratio</Text>
            <Text style={styles.detailValue}>{data.quick_ratio?.toFixed(2)}x</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Net Working Capital</Text>
            <Text style={styles.detailValue}>₹{data.net_working_capital?.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>WC Limit</Text>
            <Text style={styles.detailValue}>₹{data.wc_limit?.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Eligible</Text>
            <StatusBadge status={data.eligible ? 'Yes' : 'No'} variant={data.eligible ? 'success' : 'error'} />
          </View>
        </View>
      );
    }

    if (caseItem.analysis_type === 'banking') {
      return (
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Credit Score</Text>
            <Text style={styles.detailValue}>{data.credit_score}/100</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Grade</Text>
            <Text style={styles.detailValue}>{data.grade}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Risk Level</Text>
            <StatusBadge
              status={data.risk_level}
              variant={data.risk_level === 'Low' ? 'success' : data.risk_level === 'Medium' ? 'warning' : 'error'}
            />
          </View>
        </View>
      );
    }

    if (caseItem.analysis_type === 'multi_year') {
      return (
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Years Analyzed</Text>
            <Text style={styles.detailValue}>{data.years?.join(', ')}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Insights</Text>
            <Text style={styles.detailValue}>{data.insights?.length || 0} findings</Text>
          </View>
        </View>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
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
            <Ionicons name="bar-chart-outline" size={20} color={colors.yellow} />
            <Text style={styles.statValue}>
              {cases.filter((c) => c.analysis_type === 'working_capital').length}
            </Text>
            <Text style={styles.statLabel}>WC</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="business-outline" size={20} color={colors.green} />
            <Text style={styles.statValue}>
              {cases.filter((c) => c.analysis_type === 'banking').length}
            </Text>
            <Text style={styles.statLabel}>Banking</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="trending-up-outline" size={20} color={colors.purple} />
            <Text style={styles.statValue}>
              {cases.filter((c) => c.analysis_type === 'multi_year').length}
            </Text>
            <Text style={styles.statLabel}>Trend</Text>
          </View>
        </View>

        {/* Cases List */}
        {cases.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="folder-open-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No saved cases yet</Text>
            <Text style={styles.emptyText}>Complete an analysis and save it to see it here</Text>
          </Card>
        ) : (
          <>
            <SectionHeader title="All Cases" color={colors.primary} />
            {cases.map((caseItem) => (
              <TouchableOpacity
                key={caseItem.id}
                style={styles.caseCard}
                onPress={() => setExpandedCase(expandedCase === caseItem.id ? null : caseItem.id)}
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
                    <TouchableOpacity onPress={() => handleDelete(caseItem.id)} style={styles.deleteButton}>
                      <Ionicons name="trash-outline" size={18} color={colors.red} />
                    </TouchableOpacity>
                    <Ionicons
                      name={expandedCase === caseItem.id ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={colors.textMuted}
                    />
                  </View>
                </View>
                {expandedCase === caseItem.id && renderCaseDetails(caseItem)}
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    color: colors.textSecondary,
    marginTop: 12,
  },
  header: {
    marginBottom: 20,
  },
  brandName: {
    color: colors.orange,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2,
    marginBottom: 4,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  statValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginTop: 6,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  caseCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
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
    color: colors.text,
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
    color: colors.textMuted,
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
  detailsContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    padding: 14,
    backgroundColor: colors.inputBackground,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  detailValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
});
