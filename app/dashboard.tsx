import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  FadeIn,
} from 'react-native-reanimated';
import { LineChart, BarChart } from 'react-native-gifted-charts';
import { useTheme } from '../src/theme/ThemeContext';
import { ThemeColors } from '../src/theme/themes';
import { Card, SectionHeader, KPIBox, ChartCard, DataTable, AppHeader, ThemeSwitcher } from '../src/components';
import { getDashboardStats } from '../src/api';
import { DashboardStats } from '../src/types';
import { useAppStore } from '../src/store';
import { generatePDF } from '../src/services/pdfGenerator';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 64; // account for padding + card padding

// Placeholder chart data shown when no real data is available
const PLACEHOLDER_LINE_DATA = [
  { value: 420000, label: 'Jan' },
  { value: 380000, label: 'Feb' },
  { value: 510000, label: 'Mar' },
  { value: 470000, label: 'Apr' },
  { value: 560000, label: 'May' },
  { value: 620000, label: 'Jun' },
];

const formatCurrency = (value: number): string => {
  if (Math.abs(value) >= 1_000_000) return `₹${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `₹${(value / 1_000).toFixed(0)}K`;
  return `₹${value}`;
};

function makeStyles(theme: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 32,
    },
    badgeRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 20,
      flexWrap: 'wrap',
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: theme.card,
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderWidth: 1,
      borderColor: theme.cardBorder,
    },
    badgePrimary: {
      borderColor: theme.primary,
      backgroundColor: theme.primaryLight,
    },
    badgeText: {
      color: theme.subText,
      fontSize: 11,
      fontWeight: '500',
    },
    badgePrimaryText: {
      color: theme.primary,
    },
    kpiRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 12,
    },
    kpiRowSingle: {
      marginBottom: 20,
    },
    chartLabel: {
      color: theme.textMuted,
      fontSize: 10,
    },
    analysisRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 20,
    },
    analysisCard: {
      flex: 1,
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: `${theme.yellow}30`,
    },
    analysisIcon: {
      width: 38,
      height: 38,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    analysisValue: {
      color: theme.text,
      fontSize: 22,
      fontWeight: '800',
      marginBottom: 2,
    },
    analysisLabel: {
      color: theme.subText,
      fontSize: 11,
      fontWeight: '500',
    },
    quickActionsGrid: {
      gap: 10,
      marginBottom: 20,
    },
    quickAction: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: `${theme.yellow}40`,
    },
    quickActionText: {
      flex: 1,
      color: theme.text,
      fontSize: 14,
      fontWeight: '600',
    },
    pdfButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      backgroundColor: theme.purple,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
    },
    pdfButtonDisabled: {
      opacity: 0.7,
    },
    pdfButtonText: {
      flex: 1,
      color: '#fff',
      fontSize: 15,
      fontWeight: '700',
      textAlign: 'center',
    },
  });
}

export default function DashboardScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const { wcResult, bankingResult, trendResult } = useAppStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  const PLACEHOLDER_BAR_DATA = [
    { value: 120000, label: 'Jan', frontColor: theme.chartBar },
    { value: -40000, label: 'Feb', frontColor: theme.error },
    { value: 130000, label: 'Mar', frontColor: theme.chartBar },
    { value: -30000, label: 'Apr', frontColor: theme.error },
    { value: 90000, label: 'May', frontColor: theme.chartBar },
    { value: 60000, label: 'Jun', frontColor: theme.chartBar },
  ];

  // Header fade-in animation
  const headerOpacity = useSharedValue(0);
  const headerTranslateY = useSharedValue(-10);
  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslateY.value }],
  }));

  useEffect(() => {
    headerOpacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) });
    headerTranslateY.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.ease) });
  }, []);

  const fetchStats = async () => {
    try {
      const data = await getDashboardStats();
      setStats(data);
    } catch (error) {
      console.log('Error fetching stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const today = new Date();
  const dateString = today.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  // Derive KPI values from latest WC result stored in recent cases
  const latestWC = stats?.recent_cases?.find(c => c.analysis_type === 'wc')?.data;
  const workingCapital = latestWC?.net_working_capital ?? null;
  const currentRatio = latestWC?.current_ratio ?? null;
  const prevWC = stats?.recent_cases
    ?.filter(c => c.analysis_type === 'wc')
    ?.slice(1, 2)?.[0]?.data?.net_working_capital ?? null;
  const changeWC =
    workingCapital !== null && prevWC !== null ? workingCapital - prevWC : null;

  const currentAssets = latestWC?.input_data?.balance_sheet?.current_assets ?? null;
  const currentLiabilities = latestWC?.input_data?.balance_sheet?.current_liabilities ?? null;
  const inventory = latestWC?.input_data?.balance_sheet?.inventory ?? null;
  const debtors = latestWC?.input_data?.balance_sheet?.debtors ?? null;
  const creditors = latestWC?.input_data?.balance_sheet?.creditors ?? null;
  const cashBank = latestWC?.input_data?.balance_sheet?.cash_bank_balance ?? null;

  const assetsTableRows = [
    { label: 'Cash & Bank Balance', value: currentAssets !== null ? formatCurrency(cashBank ?? 0) : '–' },
    { label: 'Debtors / Receivables', value: debtors !== null ? formatCurrency(debtors) : '–' },
    { label: 'Inventory', value: inventory !== null ? formatCurrency(inventory) : '–' },
    {
      label: 'Total Current Assets',
      value: currentAssets !== null ? formatCurrency(currentAssets) : '–',
      bold: true,
      valueColor: theme.primary,
    },
  ];

  const liabilitiesTableRows = [
    { label: 'Creditors / Payables', value: creditors !== null ? formatCurrency(creditors) : '–' },
    {
      label: 'Total Current Liabilities',
      value: currentLiabilities !== null ? formatCurrency(currentLiabilities) : '–',
      bold: true,
      valueColor: theme.error,
    },
  ];

  const handleGeneratePDF = async () => {
    setGeneratingPDF(true);
    try {
      await generatePDF({
        wcResult,
        bankingResult,
        trendResult,
        companyName: wcResult?.company_name || bankingResult?.company_name || trendResult?.company_name,
      });
    } catch (err: any) {
      Alert.alert('PDF Error', err?.message || 'Failed to generate PDF. Please ensure you have run at least one analysis and try again.');
    } finally {
      setGeneratingPDF(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} colors={[theme.primary]} />
        }
      >
        {/* ── Header ── */}
        <Animated.View style={[headerStyle]}>
          <AppHeader
            title="Dashboard"
            subtitle={dateString}
            rightIcon="refresh-outline"
            onRightPress={onRefresh}
          />
        </Animated.View>

        {/* ── Theme Switcher ── */}
        <ThemeSwitcher />

        {/* ── Status badges ── */}
        <Animated.View entering={FadeIn.delay(100).duration(400)} style={styles.badgeRow}>
          <View style={styles.badge}>
            <Ionicons name="folder-outline" size={13} color={theme.yellow} />
            <Text style={styles.badgeText}>{stats?.total_cases ?? 0} Cases</Text>
          </View>
          <View style={[styles.badge, styles.badgePrimary]}>
            <Ionicons name="radio-button-on" size={10} color={theme.primary} />
            <Text style={[styles.badgeText, styles.badgePrimaryText]}>Live Data</Text>
          </View>
          <View style={styles.badge}>
            <Ionicons name="sync-outline" size={13} color={theme.subText} />
            <Text style={styles.badgeText}>Auto-sync</Text>
          </View>
        </Animated.View>

        {/* ── KPI Cards ── */}
        <SectionHeader title="Key Performance Indicators" />
        <View style={styles.kpiRow}>
          <KPIBox
            title="Working Capital"
            value={workingCapital !== null ? formatCurrency(workingCapital) : '–'}
            subtitle="Net current position"
            icon="wallet-outline"
            iconColor={theme.primary}
            trend={changeWC !== null ? (changeWC >= 0 ? 'up' : 'down') : undefined}
            trendValue={changeWC !== null ? `${changeWC >= 0 ? '+' : ''}${formatCurrency(changeWC)}` : undefined}
            delay={200}
          />
          <KPIBox
            title="Current Ratio"
            value={currentRatio !== null ? currentRatio.toFixed(2) : '–'}
            subtitle={currentRatio !== null ? (currentRatio >= 1.5 ? 'Healthy' : 'Watch closely') : 'No data yet'}
            icon="analytics-outline"
            iconColor={currentRatio !== null && currentRatio >= 1.5 ? theme.green : theme.yellow}
            trend={currentRatio !== null ? (currentRatio >= 1.5 ? 'up' : 'down') : undefined}
            trendValue={currentRatio !== null ? (currentRatio >= 1.5 ? 'Strong' : 'Weak') : undefined}
            delay={300}
          />
        </View>
        <View style={styles.kpiRowSingle}>
          <KPIBox
            title="Change in Working Capital"
            value={changeWC !== null ? formatCurrency(Math.abs(changeWC)) : '–'}
            subtitle="vs previous period"
            icon="swap-vertical-outline"
            iconColor={changeWC !== null && changeWC >= 0 ? theme.green : theme.error}
            trend={changeWC !== null ? (changeWC >= 0 ? 'up' : 'down') : undefined}
            trendValue={changeWC !== null ? (changeWC >= 0 ? 'Improved' : 'Declined') : undefined}
            delay={400}
          />
        </View>

        {/* ── Working Capital Trend Chart ── */}
        <SectionHeader title="Working Capital Trend" color={theme.primary} />
        <ChartCard
          title="WC Over Time"
          subtitle={latestWC ? 'Based on analysis history' : 'Sample data – run an analysis to see real data'}
          delay={500}
        >
          <LineChart
            data={PLACEHOLDER_LINE_DATA}
            width={CHART_WIDTH}
            height={160}
            color={theme.chartLine}
            thickness={2.5}
            dataPointsColor={theme.primaryDark}
            dataPointsRadius={4}
            startFillColor={theme.primaryLight}
            endFillColor="transparent"
            areaChart
            curved
            rulesColor={theme.chartGrid}
            rulesType="solid"
            xAxisColor={theme.cardBorder}
            yAxisColor="transparent"
            yAxisTextStyle={styles.chartLabel}
            xAxisLabelTextStyle={styles.chartLabel}
            hideDataPoints={false}
            noOfSections={4}
            maxValue={700000}
            formatYLabel={(val) => `₹${(Number(val) / 1000).toFixed(0)}K`}
          />
        </ChartCard>

        {/* ── Monthly Changes Bar Chart ── */}
        <SectionHeader title="Monthly WC Changes" color={theme.green} />
        <ChartCard
          title="Month-on-Month Δ Working Capital"
          subtitle="Green = increase · Red = decrease"
          delay={600}
        >
          <BarChart
            data={PLACEHOLDER_BAR_DATA}
            width={CHART_WIDTH}
            height={160}
            barWidth={30}
            barBorderRadius={4}
            noOfSections={4}
            rulesColor={theme.chartGrid}
            rulesType="solid"
            xAxisColor={theme.cardBorder}
            yAxisColor="transparent"
            yAxisTextStyle={styles.chartLabel}
            xAxisLabelTextStyle={styles.chartLabel}
            showReferenceLine1
            referenceLine1Position={0}
            // Type cast needed as gifted-charts type definitions don't include all config options
            referenceLine1Config={{ color: theme.textMuted, thickness: 1, type: 'dashed' } as object}
            formatYLabel={(val) => `₹${(Number(val) / 1000).toFixed(0)}K`}
            isAnimated
          />
        </ChartCard>

        {/* ── Current Assets ── */}
        <SectionHeader title="Current Assets Breakdown" color={theme.primary} />
        <DataTable rows={assetsTableRows} />

        {/* ── Current Liabilities ── */}
        <SectionHeader title="Current Liabilities Breakdown" color={theme.error} />
        <DataTable rows={liabilitiesTableRows} />

        {/* ── Analysis Summary Cards ── */}
        <SectionHeader title="Analysis Overview" color={theme.yellow} />
        <View style={styles.analysisRow}>
          <TouchableOpacity style={styles.analysisCard} onPress={() => router.push('/wc')} activeOpacity={0.8}>
            <View style={[styles.analysisIcon, { backgroundColor: `${theme.yellow}20` }]}>
              <Ionicons name="bar-chart-outline" size={20} color={theme.yellow} />
            </View>
            <Text style={styles.analysisValue}>{stats?.wc_analysis_count ?? 0}</Text>
            <Text style={styles.analysisLabel}>WC Analyses</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.analysisCard, { borderColor: `${theme.cyan}30` }]}
            onPress={() => router.push('/trend')}
            activeOpacity={0.8}
          >
            <View style={[styles.analysisIcon, { backgroundColor: `${theme.cyan}20` }]}>
              <Ionicons name="trending-up-outline" size={20} color={theme.cyan} />
            </View>
            <Text style={styles.analysisValue}>{stats?.multi_year_count ?? 0}</Text>
            <Text style={styles.analysisLabel}>Multi-Year</Text>
          </TouchableOpacity>
        </View>

        {/* ── Quick Actions ── */}
        <SectionHeader title="Quick Actions" color={theme.cyan} />
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/wc')} activeOpacity={0.8}>
            <Ionicons name="bar-chart-outline" size={18} color={theme.yellow} />
            <Text style={styles.quickActionText}>WC Analysis</Text>
            <Ionicons name="chevron-forward" size={14} color={theme.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickAction, { borderColor: `${theme.cyan}40` }]}
            onPress={() => router.push('/trend')}
            activeOpacity={0.8}
          >
            <Ionicons name="trending-up-outline" size={18} color={theme.cyan} />
            <Text style={styles.quickActionText}>Multi-Year Trend</Text>
            <Ionicons name="chevron-forward" size={14} color={theme.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickAction, { borderColor: `${theme.orange}40` }]}
            onPress={() => router.push('/cases')}
            activeOpacity={0.8}
          >
            <Ionicons name="folder-outline" size={18} color={theme.orange} />
            <Text style={styles.quickActionText}>Saved Cases</Text>
            <Ionicons name="chevron-forward" size={14} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        {/* ── Generate PDF Report ── */}
        <SectionHeader title="Reports" color={theme.purple} />
        <TouchableOpacity
          style={[styles.pdfButton, generatingPDF && styles.pdfButtonDisabled]}
          onPress={handleGeneratePDF}
          activeOpacity={0.8}
          disabled={generatingPDF}
        >
          {generatingPDF ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="document-text-outline" size={20} color="#fff" />
          )}
          <Text style={styles.pdfButtonText}>
            {generatingPDF ? 'Generating PDF…' : 'Generate & Share PDF Report'}
          </Text>
          {!generatingPDF && <Ionicons name="share-outline" size={18} color="#fff" />}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}


