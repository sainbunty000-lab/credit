import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart } from 'react-native-gifted-charts';
import { colors } from '../src/theme/colors';
import { Card, SectionHeader, InputField, AppHeader, InsightCard, SummarySection } from '../src/components';
import { analyzeMultiYear, saveCase, exportPDF } from '../src/api';
import { MultiYearResult, YearData } from '../src/types';
import { useAppStore } from '../src/store';

interface YearInputs {
  year: string;
  currentAssets: string;
  currentLiabilities: string;
  inventory: string;
  debtors: string;
  creditors: string;
  cashBank: string;
  revenue: string;
  cogs: string;
  purchases: string;
  opex: string;
  netProfit: string;
}

const defaultYear = (year: string): YearInputs => ({
  year,
  currentAssets: '',
  currentLiabilities: '',
  inventory: '',
  debtors: '',
  creditors: '',
  cashBank: '',
  revenue: '',
  cogs: '',
  purchases: '',
  opex: '',
  netProfit: '',
});

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 64;


const getTrendEmoji = (label?: string | null): string => {
  if (!label) return '📊';
  if (label.includes('Strong') || label.includes('Consistent')) return '📈';
  if (label.includes('Volatile')) return '⚠️';
  if (label.includes('Declining')) return '📉';
  return '📊';
};

const getTrendBadgeColor = (label?: string | null): string => {
  if (!label) return colors.textMuted;
  if (label.includes('Strong') || label.includes('Consistent')) return colors.green;
  if (label.includes('Volatile')) return colors.yellow;
  if (label.includes('Declining')) return colors.red;
  return colors.primary;
};

const getEligibilityColor = (status: string): string => {
  if (status === 'Eligible') return colors.green;
  if (status === 'Conditional') return colors.yellow;
  return colors.red;
};

export default function TrendScreen() {
  const { setTrendResult } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<MultiYearResult | null>(null);
  const [activeYear, setActiveYear] = useState(0);
  const [companyName, setCompanyName] = useState('Company');
  const [exporting, setExporting] = useState(false);

  const currentYear = new Date().getFullYear();
  const [yearsData, setYearsData] = useState<YearInputs[]>([
    defaultYear(`${currentYear - 2}`),
    defaultYear(`${currentYear - 1}`),
    defaultYear(`${currentYear}`),
  ]);

  const updateYearField = (yearIndex: number, field: keyof YearInputs, value: string) => {
    const newData = [...yearsData];
    newData[yearIndex] = { ...newData[yearIndex], [field]: value };
    setYearsData(newData);
  };

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const data = {
        company_name: companyName,
        years_data: yearsData.map((y) => ({
          year: y.year,
          balance_sheet: {
            current_assets: parseFloat(y.currentAssets) || 0,
            current_liabilities: parseFloat(y.currentLiabilities) || 0,
            inventory: parseFloat(y.inventory) || 0,
            debtors: parseFloat(y.debtors) || 0,
            creditors: parseFloat(y.creditors) || 0,
            cash_bank_balance: parseFloat(y.cashBank) || 0,
          },
          profit_loss: {
            revenue: parseFloat(y.revenue) || 0,
            cogs: parseFloat(y.cogs) || 0,
            purchases: parseFloat(y.purchases) || 0,
            operating_expenses: parseFloat(y.opex) || 0,
            net_profit: parseFloat(y.netProfit) || 0,
          },
        })),
      };

      const res = await analyzeMultiYear(data);
      setResult(res);
      setTrendResult(res);
    } catch (error) {
      console.log('Error:', error);
      Alert.alert('Error', 'Failed to analyze trends. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCase = async () => {
    if (!result) return;
    setSaving(true);
    try {
      await saveCase({
        id: result.id,
        company_name: result.company_name,
        analysis_type: 'multi_year',
        timestamp: new Date().toISOString(),
        data: result,
      });
      Alert.alert('Success', 'Case saved successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save case.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setTrendResult(null);
    setYearsData([
      defaultYear(`${currentYear - 2}`),
      defaultYear(`${currentYear - 1}`),
      defaultYear(`${currentYear}`),
    ]);
  };

  const handleExportPDF = async () => {
    if (!result) return;
    setExporting(true);
    try {
      const blob = await exportPDF('multi_year', result, result.company_name);
      if (typeof window !== 'undefined' && window.URL) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${result.company_name}_Trend_Report.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
      Alert.alert('Success', 'PDF report downloaded!');
    } catch (error) {
      console.log('PDF export error:', error);
      Alert.alert('Error', 'Failed to generate PDF report.');
    } finally {
      setExporting(false);
    }
  };

  const activeYearData = yearsData[activeYear];

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        enableOnAndroid={true}
        extraScrollHeight={100}
      >
        {/* Header */}
        <AppHeader
          title="Multi-Year Analysis"
          subtitle="Balance Sheet & P&L Trend Comparison"
        />

        {/* Year Tabs */}
        <View style={styles.yearTabs}>
          {yearsData.map((y, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.yearTab, activeYear === idx && styles.yearTabActive]}
              onPress={() => setActiveYear(idx)}
            >
              <Text style={[styles.yearTabText, activeYear === idx && styles.yearTabTextActive]}>
                FY {y.year}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Year Input Form */}
        <SectionHeader title={`Balance Sheet - FY ${activeYearData.year}`} color={colors.yellow} />
        <Card>
          <InputField
            label="Current Assets"
            value={activeYearData.currentAssets}
            onChangeText={(v) => updateYearField(activeYear, 'currentAssets', v)}
          />
          <InputField
            label="Current Liabilities"
            value={activeYearData.currentLiabilities}
            onChangeText={(v) => updateYearField(activeYear, 'currentLiabilities', v)}
          />
          <InputField
            label="Inventory / Stock"
            value={activeYearData.inventory}
            onChangeText={(v) => updateYearField(activeYear, 'inventory', v)}
          />
          <InputField
            label="Debtors / Receivables"
            value={activeYearData.debtors}
            onChangeText={(v) => updateYearField(activeYear, 'debtors', v)}
          />
          <InputField
            label="Creditors / Payables"
            value={activeYearData.creditors}
            onChangeText={(v) => updateYearField(activeYear, 'creditors', v)}
          />
          <InputField
            label="Cash & Bank Balance"
            value={activeYearData.cashBank}
            onChangeText={(v) => updateYearField(activeYear, 'cashBank', v)}
          />
        </Card>

        <SectionHeader title={`Profit & Loss - FY ${activeYearData.year}`} color={colors.green} />
        <Card>
          <InputField
            label="Revenue / Sales"
            value={activeYearData.revenue}
            onChangeText={(v) => updateYearField(activeYear, 'revenue', v)}
          />
          <InputField
            label="Cost of Goods Sold"
            value={activeYearData.cogs}
            onChangeText={(v) => updateYearField(activeYear, 'cogs', v)}
          />
          <InputField
            label="Purchases"
            value={activeYearData.purchases}
            onChangeText={(v) => updateYearField(activeYear, 'purchases', v)}
          />
          <InputField
            label="Operating Expenses"
            value={activeYearData.opex}
            onChangeText={(v) => updateYearField(activeYear, 'opex', v)}
          />
          <InputField
            label="Net Profit / PAT"
            value={activeYearData.netProfit}
            onChangeText={(v) => updateYearField(activeYear, 'netProfit', v)}
          />
        </Card>

        {/* Analyze Button */}
        <TouchableOpacity
          style={styles.analyzeButton}
          onPress={handleAnalyze}
          disabled={loading}
        >
          <LinearGradient
            colors={[colors.purple, colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.analyzeGradient}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="trending-up" size={20} color="#fff" />
                <Text style={styles.analyzeText}>Analyze Multi-Year Trends</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Results */}
        {result && (
          <>
            {/* ── Growth Score ── */}
            <SectionHeader title="Growth Overview" color={colors.purple} />
            <Card>
              <View style={styles.scoreRow}>
                <View style={styles.scoreCircle}>
                  <Text style={styles.scoreNumber}>{result.growth_score ?? 0}</Text>
                  <Text style={styles.scoreSlash}>/100</Text>
                </View>
                <View style={styles.scoreInfo}>
                  <Text style={styles.scoreTitle}>Growth Score</Text>
                  <View style={[styles.trendBadge, { backgroundColor: getTrendBadgeColor(result.trend_label) + '25' }]}>
                    <Text style={[styles.trendBadgeText, { color: getTrendBadgeColor(result.trend_label) }]}>
                      {getTrendEmoji(result.trend_label)}  {result.trend_label ?? 'Analyzing...'}
                    </Text>
                  </View>
                  <Text style={styles.scoreSubtext}>Based on multi-year performance analysis</Text>
                </View>
              </View>
            </Card>

            {/* ── Growth Indicators ── */}
            <SectionHeader title="Growth Indicators" color={colors.cyan} />
            <View style={styles.growthRow}>
              {[
                { label: 'Revenue', value: result.trend_analysis?.metrics.revenue_growth },
                { label: 'Profit', value: result.trend_analysis?.metrics.profit_growth },
                { label: 'Work. Capital', value: result.trend_analysis?.metrics.wc_growth },
              ].map(({ label, value }) => {
                const isPos = value != null && value >= 0;
                const color = value == null ? colors.textMuted : isPos ? colors.green : colors.red;
                return (
                  <View key={label} style={styles.growthBox}>
                    <Text style={[styles.growthPct, { color }]}>
                      {value == null ? '—' : `${isPos ? '+' : ''}${value.toFixed(1)}%`}
                    </Text>
                    <Text style={styles.growthBoxLabel}>{label}</Text>
                    {value != null && <View style={[styles.growthDot, { backgroundColor: color }]} />}
                  </View>
                );
              })}
            </View>

            {/* ── Trend Charts ── */}
            <SectionHeader title="Trend Charts" color={colors.green} />
            <Card>
              <Text style={styles.chartTitle}>Revenue Trend</Text>
              <LineChart
                data={result.years.map((yr, i) => ({
                  value: result.trends.revenue[i] / 100000,
                  label: `FY${String(yr).slice(-2)}`,
                }))}
                width={CHART_WIDTH}
                height={120}
                color={colors.green}
                thickness={2.5}
                dataPointsColor={colors.primaryDark}
                dataPointsRadius={4}
                startFillColor={colors.primaryLight}
                endFillColor="transparent"
                areaChart
                curved
                rulesColor={colors.chartGrid}
                rulesType="solid"
                xAxisColor={colors.cardBorder}
                yAxisColor="transparent"
                yAxisTextStyle={styles.chartLabel}
                xAxisLabelTextStyle={styles.chartLabel}
                noOfSections={3}
                isAnimated
                formatYLabel={(val) => `₹${Number(val).toFixed(0)}L`}
              />
            </Card>

            <Card>
              <Text style={styles.chartTitle}>Net Profit Trend</Text>
              <LineChart
                data={result.years.map((yr, i) => ({
                  value: result.trends.net_profit[i] / 100000,
                  label: `FY${String(yr).slice(-2)}`,
                }))}
                width={CHART_WIDTH}
                height={120}
                color={colors.cyan}
                thickness={2.5}
                dataPointsColor={colors.cyan}
                dataPointsRadius={4}
                startFillColor={`${colors.info}20`}
                endFillColor="transparent"
                areaChart
                curved
                rulesColor={colors.chartGrid}
                rulesType="solid"
                xAxisColor={colors.cardBorder}
                yAxisColor="transparent"
                yAxisTextStyle={styles.chartLabel}
                xAxisLabelTextStyle={styles.chartLabel}
                noOfSections={3}
                isAnimated
                formatYLabel={(val) => `₹${Number(val).toFixed(0)}L`}
              />
            </Card>

            <Card>
              <Text style={styles.chartTitle}>Working Capital Trend</Text>
              <LineChart
                data={result.years.map((yr, i) => ({
                  value: result.trends.net_working_capital[i] / 100000,
                  label: `FY${String(yr).slice(-2)}`,
                }))}
                width={CHART_WIDTH}
                height={120}
                color={colors.purple}
                thickness={2.5}
                dataPointsColor={colors.purple}
                dataPointsRadius={4}
                startFillColor={`${colors.purple}20`}
                endFillColor="transparent"
                areaChart
                curved
                rulesColor={colors.chartGrid}
                rulesType="solid"
                xAxisColor={colors.cardBorder}
                yAxisColor="transparent"
                yAxisTextStyle={styles.chartLabel}
                xAxisLabelTextStyle={styles.chartLabel}
                noOfSections={3}
                isAnimated
                formatYLabel={(val) => `₹${Number(val).toFixed(0)}L`}
              />
            </Card>

            {/* ── AI Summary ── */}
            <SectionHeader title="Financial Summary" color={colors.primary} />
            <SummarySection
              summary={result.trend_analysis?.analysis.summary ?? result.recommendation}
              eligibilityStatus={result.trend_analysis?.analysis.eligibility_status}
            />

            {/* ── Insights Cards ── */}
            <SectionHeader title="Key Insights" color={colors.primary} />
            <InsightCard items={result.insights} type="recommendation" />

            {/* ── Year Comparison Table ── */}
            <SectionHeader title="Year Comparison" color={colors.yellow} />
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <View style={styles.compTableHeader}>
                <Text style={[styles.compCell, styles.compHeaderText]}>Year</Text>
                <Text style={[styles.compCell, styles.compHeaderText]}>Revenue</Text>
                <Text style={[styles.compCell, styles.compHeaderText]}>Profit</Text>
                <Text style={[styles.compCell, styles.compHeaderText]}>WC</Text>
              </View>
              {result.years.map((year, idx) => (
                <View key={year} style={[styles.compRow, idx % 2 === 1 && styles.compRowAlt, idx === result.years.length - 1 && styles.compRowLast]}>
                  <Text style={[styles.compCell, styles.compYearText]}>FY {year}</Text>
                  <Text style={[styles.compCell, styles.compValueText]}>
                    ₹{(result.trends.revenue[idx] / 100000).toFixed(1)}L
                  </Text>
                  <Text style={[styles.compCell, styles.compProfitText, result.trends.net_profit[idx] >= 0 ? styles.compProfitPos : styles.compProfitNeg]}>
                    ₹{(result.trends.net_profit[idx] / 100000).toFixed(1)}L
                  </Text>
                  <Text style={[styles.compCell, styles.compValueText]}>
                    ₹{(result.trends.net_working_capital[idx] / 100000).toFixed(1)}L
                  </Text>
                </View>
              ))}
            </Card>

            {/* Growth Patterns */}
            {result.patterns && Object.keys(result.patterns).length > 0 && (
              <>
                <SectionHeader title="Growth Patterns" color={colors.cyan} />
                <Card>
                  {Object.entries(result.patterns).map(([metric, pattern]) => {
                    const isPositive = pattern === 'growing' || pattern === 'stable';
                    const patternColor = isPositive ? colors.green : pattern === 'volatile' ? colors.orange : colors.red;
                    return (
                      <View key={metric} style={styles.insightRow}>
                        <Ionicons
                          name={isPositive ? 'trending-up' : pattern === 'volatile' ? 'swap-vertical-outline' : 'trending-down'}
                          size={16}
                          color={patternColor}
                        />
                        <Text style={[styles.insightText, { color: patternColor, fontWeight: '600' }]}>
                          {metric.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}: {pattern}
                        </Text>
                      </View>
                    );
                  })}
                </Card>
              </>
            )}

            {/* AI Analysis */}
            {result.ai_analysis && (
              <>
                <SectionHeader title="AI Eligibility Assessment" color={colors.primary} />
                <SummarySection
                  summary={result.ai_analysis.summary}
                  eligibilityStatus={result.ai_analysis.eligibility_status}
                  confidence={result.ai_analysis.confidence}
                />
                {/* Risks */}
                {result.ai_analysis.risks && result.ai_analysis.risks.length > 0 &&
                  result.ai_analysis.risks[0] !== 'No major risks identified from available data.' && (
                  <InsightCard items={result.ai_analysis.risks} type="risk" title="Risk Alerts" />
                )}
              </>
            )}
          </>
        )}

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionButton} onPress={handleSaveCase} disabled={!result || saving}>
            {saving ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Ionicons name="save-outline" size={18} color={colors.primary} />
                <Text style={styles.actionButtonText}>Save Case</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleExportPDF} disabled={!result || exporting}>
            {exporting ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Ionicons name="download-outline" size={18} color={colors.primary} />
                <Text style={styles.actionButtonText}>Export PDF</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
          <Ionicons name="refresh-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.resetButtonText}>Start New Analysis</Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>
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
  header: {
    marginBottom: 20,
  },
  yearTabs: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  yearTab: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  yearTabActive: {
    backgroundColor: colors.primary + '30',
    borderColor: colors.primary,
  },
  yearTabText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  yearTabTextActive: {
    color: colors.primary,
  },
  analyzeButton: {
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 10,
    marginBottom: 20,
  },
  analyzeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 10,
  },
  analyzeText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  trendTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  trendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  trendItem: {
    alignItems: 'center',
  },
  trendYear: {
    color: colors.textMuted,
    fontSize: 11,
    marginBottom: 4,
  },
  trendValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  insightText: {
    color: colors.textSecondary,
    fontSize: 13,
    flex: 1,
    lineHeight: 20,
  },
  recommendationText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  eligibilityBadgeContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  eligibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 40,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  eligibilityText: {
    fontSize: 18,
    fontWeight: '800',
  },
  confidenceText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 8,
  },
  actionButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 8,
    marginBottom: 20,
  },
  resetButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  // ── Growth Score ──────────────────────────────────────────────────────
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    borderWidth: 3,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    color: colors.primary,
    fontSize: 28,
    fontWeight: '800',
  },
  scoreSlash: {
    color: colors.textMuted,
    fontSize: 11,
  },
  scoreInfo: {
    flex: 1,
    gap: 6,
  },
  scoreTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  trendBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  trendBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scoreSubtext: {
    color: colors.textMuted,
    fontSize: 11,
  },
  // ── Growth Indicators ─────────────────────────────────────────────────
  growthRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  growthBox: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  growthPct: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  growthBoxLabel: {
    color: colors.textMuted,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  growthDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  // ── Charts ────────────────────────────────────────────────────────────
  chartTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  chartLabel: {
    color: colors.textMuted,
    fontSize: 9,
  },
  // ── AI Summary ────────────────────────────────────────────────────────
  eligibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  eligibilityLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  eligibilityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  eligibilityStatus: {
    fontSize: 12,
    fontWeight: '700',
  },
  summaryText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  // ── Insights Cards ────────────────────────────────────────────────────
  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  insightCardLast: {
    borderBottomWidth: 0,
    marginBottom: 0,
    paddingBottom: 0,
  },
  insightIconBox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  // ── Year Comparison Table ─────────────────────────────────────────────
  compTableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  compRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 11,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  compRowAlt: {
    backgroundColor: colors.tableRowAlt,
  },
  compRowLast: {
    borderBottomWidth: 0,
  },
  compCell: {
    flex: 1,
    textAlign: 'center',
  },
  compHeaderText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  compYearText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  compValueText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  compProfitText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  compProfitPos: {
    color: colors.green,
  },
  compProfitNeg: {
    color: colors.red,
  },
});
