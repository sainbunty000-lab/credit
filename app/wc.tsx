import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '../src/theme/ThemeContext';
import { ThemeColors } from '../src/theme/themes';
import { Dimensions } from 'react-native';
import { Card, SectionHeader, InputField, MetricCard, AnalyticsChart, InsightCard, SummarySection } from '../src/components';
import { generateSummary } from '../utils/generateSummary';
import { analyzeWorkingCapital, saveCase, parseDocument, exportPDF, getMimeTypeFromExtension } from '../src/api';
import { WorkingCapitalResult } from '../src/types';
import { useAppStore } from '../src/store';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 72;

interface SelectedFile {
  name: string;
  uri: string;
  type: string;
  size?: number;
}

export default function WCScreen() {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const { setWCResult, loadedCase, setLoadedCase } = useAppStore();
  const [showInputs, setShowInputs] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<WorkingCapitalResult | null>(null);

  // Selected files
  const [balanceSheetFile, setBalanceSheetFile] = useState<SelectedFile | null>(null);
  const [plFile, setPlFile] = useState<SelectedFile | null>(null);

  // Balance Sheet inputs
  const [currentAssets, setCurrentAssets] = useState('');
  const [currentLiabilities, setCurrentLiabilities] = useState('');
  const [inventory, setInventory] = useState('');
  const [debtors, setDebtors] = useState('');
  const [creditors, setCreditors] = useState('');
  const [cashBank, setCashBank] = useState('');

  // P&L inputs
  const [revenue, setRevenue] = useState('');
  const [cogs, setCogs] = useState('');
  const [purchases, setPurchases] = useState('');
  const [opex, setOpex] = useState('');
  const [netProfit, setNetProfit] = useState('');

  const [companyName, setCompanyName] = useState('Company');
  const [parsing, setParsing] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Pre-fill inputs and result when navigating from the Cases screen
  useFocusEffect(
    useCallback(() => {
      if (loadedCase && loadedCase.analysis_type === 'working_capital') {
        const savedResult: WorkingCapitalResult = loadedCase.data;
        const bs = savedResult.input_data?.balance_sheet;
        const pl = savedResult.input_data?.profit_loss;
        if (bs) {
          setCurrentAssets(bs.current_assets != null ? String(bs.current_assets) : '');
          setCurrentLiabilities(bs.current_liabilities != null ? String(bs.current_liabilities) : '');
          setInventory(bs.inventory != null ? String(bs.inventory) : '');
          setDebtors(bs.debtors != null ? String(bs.debtors) : '');
          setCreditors(bs.creditors != null ? String(bs.creditors) : '');
          setCashBank(bs.cash_bank_balance != null ? String(bs.cash_bank_balance) : '');
        }
        if (pl) {
          setRevenue(pl.revenue != null ? String(pl.revenue) : '');
          setCogs(pl.cogs != null ? String(pl.cogs) : '');
          setPurchases(pl.purchases != null ? String(pl.purchases) : '');
          setOpex(pl.operating_expenses != null ? String(pl.operating_expenses) : '');
          setNetProfit(pl.net_profit != null ? String(pl.net_profit) : '');
        }
        if (savedResult.company_name) setCompanyName(savedResult.company_name);
        setResult(savedResult);
        setWCResult(savedResult);
        setShowInputs(true);
        setLoadedCase(null);
      }
    }, [loadedCase, setWCResult, setLoadedCase])
  );

  const pickBalanceSheet = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        const fileName = file.name.toLowerCase();
        
        // Validate file type
        const validExtensions = ['.pdf', '.xlsx', '.xls', '.csv', '.jpg', '.jpeg', '.png', '.heic', '.heif'];
        const isValid = validExtensions.some(ext => fileName.endsWith(ext));
        
        if (!isValid) {
          Alert.alert('Invalid File', 'Please select a PDF, Excel, CSV, or Image file.');
          return;
        }
        
        setBalanceSheetFile({
          name: file.name,
          uri: file.uri,
          type: getMimeTypeFromExtension(file.name),
          size: file.size,
        });
      }
    } catch (error) {
      console.log('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document. Please try again.');
    }
  };

  const pickPLStatement = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        const fileName = file.name.toLowerCase();
        
        // Validate file type
        const validExtensions = ['.pdf', '.xlsx', '.xls', '.csv', '.jpg', '.jpeg', '.png', '.heic', '.heif'];
        const isValid = validExtensions.some(ext => fileName.endsWith(ext));
        
        if (!isValid) {
          Alert.alert('Invalid File', 'Please select a PDF, Excel, CSV, or Image file.');
          return;
        }
        
        setPlFile({
          name: file.name,
          uri: file.uri,
          type: getMimeTypeFromExtension(file.name),
          size: file.size,
        });
      }
    } catch (error) {
      console.log('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document. Please try again.');
    }
  };

  const handleParseDocuments = async () => {
    if (!balanceSheetFile && !plFile) {
      Alert.alert('No Files', 'Please select at least one document to parse.');
      return;
    }

    setParsing(true);
    
    try {
      let bsSuccess = false;
      let plSuccess = false;
      
      // Parse Balance Sheet via local backend
      if (balanceSheetFile) {
        try {
          console.log('Sending BS to local backend:', balanceSheetFile.name);
          
          const response = await parseDocument(
            balanceSheetFile.uri,
            balanceSheetFile.name,
            balanceSheetFile.type,
            'balance_sheet'
          );
          
          console.log('BS parse response:', response);
          
          if (response.success && response.parsed_data) {
            const data = (response.normalized_data && Object.keys(response.normalized_data).length > 0)
              ? response.normalized_data
              : response.parsed_data;
            console.log('[WC] BS parsed data:', JSON.stringify(data));
            if (data.current_assets != null) setCurrentAssets(String(data.current_assets));
            if (data.current_liabilities != null) setCurrentLiabilities(String(data.current_liabilities));
            if (data.inventory != null) setInventory(String(data.inventory));
            const debtorsVal = data.receivables ?? data.debtors;
            if (debtorsVal != null) setDebtors(String(debtorsVal));
            const creditorsVal = data.payables ?? data.creditors;
            if (creditorsVal != null) setCreditors(String(creditorsVal));
            const cashVal = data.cash ?? data.cash_bank_balance;
            if (cashVal != null) setCashBank(String(cashVal));
            bsSuccess = Object.keys(data).length > 0;
          }
        } catch (bsError: any) {
          console.log('BS parse error:', bsError);
          Alert.alert('Balance Sheet Error', bsError?.message || 'Failed to parse');
        }
      }
      
      // Parse P&L via local backend
      if (plFile) {
        try {
          console.log('Sending PL to local backend:', plFile.name);
          
          const response = await parseDocument(
            plFile.uri,
            plFile.name,
            plFile.type,
            'profit_loss'
          );
          
          console.log('PL parse response:', response);
          
          if (response.success && response.parsed_data) {
            const data = (response.normalized_data && Object.keys(response.normalized_data).length > 0)
              ? response.normalized_data
              : response.parsed_data;
            console.log('[WC] PL parsed data:', JSON.stringify(data));
            const revenueVal = data.revenue ?? data.sales;
            if (revenueVal != null) setRevenue(String(revenueVal));
            const cogsVal = data.cogs ?? data.cost_of_goods_sold;
            if (cogsVal != null) setCogs(String(cogsVal));
            if (data.purchases != null) setPurchases(String(data.purchases));
            const opexVal = data.expenses ?? data.operating_expenses;
            if (opexVal != null) setOpex(String(opexVal));
            const netProfitVal = data.net_profit ?? data.profit;
            if (netProfitVal != null) setNetProfit(String(netProfitVal));
            plSuccess = Object.keys(data).length > 0;
          }
        } catch (plError: any) {
          console.log('PL parse error:', plError);
          Alert.alert('P&L Error', plError?.message || 'Failed to parse');
        }
      }
      
      setShowInputs(true);
      
      if (bsSuccess || plSuccess) {
        Alert.alert(
          'Parsing Complete',
          'Document parsed using Gemini Vision AI!\n\nExtracted values have been filled in. Please verify and edit if needed.'
        );
      } else {
        Alert.alert(
          'Parsing Issue',
          'Could not extract data from the documents.\n\nPlease enter values manually.'
        );
      }
      
    } catch (error: any) {
      console.log('Parse error:', error);
      Alert.alert(
        'Parsing Error',
        `Could not parse document: ${error?.message || 'Unknown error'}.\n\nPlease enter values manually.`
      );
    }
    
    setParsing(false);
  };

  const handleCalculate = async () => {
    setLoading(true);
    try {
      const data = {
        company_name: companyName,
        balance_sheet: {
          current_assets: parseFloat(currentAssets) || 0,
          current_liabilities: parseFloat(currentLiabilities) || 0,
          inventory: parseFloat(inventory) || 0,
          debtors: parseFloat(debtors) || 0,
          creditors: parseFloat(creditors) || 0,
          cash_bank_balance: parseFloat(cashBank) || 0,
        },
        profit_loss: {
          revenue: parseFloat(revenue) || 0,
          cogs: parseFloat(cogs) || 0,
          purchases: parseFloat(purchases) || 0,
          operating_expenses: parseFloat(opex) || 0,
          net_profit: parseFloat(netProfit) || 0,
        },
        projected_turnover: parseFloat(revenue) || 0,
      };

      const res = await analyzeWorkingCapital(data);
      setResult(res);
      setWCResult(res);
    } catch (error) {
      console.log('Error:', error);
      Alert.alert('Error', 'Failed to calculate working capital. Please try again.');
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
        analysis_type: 'working_capital',
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
    setWCResult(null);
    setBalanceSheetFile(null);
    setPlFile(null);
    setCurrentAssets('');
    setCurrentLiabilities('');
    setInventory('');
    setDebtors('');
    setCreditors('');
    setCashBank('');
    setRevenue('');
    setCogs('');
    setPurchases('');
    setOpex('');
    setNetProfit('');
  };

  const handleExportPDF = async () => {
    if (!result) return;
    setExporting(true);
    try {
      const blob = await exportPDF('working_capital', result, result.company_name);
      // On web, trigger download
      if (typeof window !== 'undefined' && window.URL) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${result.company_name}_WC_Report.pdf`;
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

  const getStatusColor = (ratio: number, benchmark: number) => {
    return ratio >= benchmark ? theme.green : theme.red;
  };

  const getRiskColor = (color: string) => {
    if (color === 'green') return theme.green;
    if (color === 'red') return theme.red;
    return theme.yellow; // amber
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        enableOnAndroid={true}
        extraScrollHeight={100}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.brandName}>FINANCIAL ANALYTICS</Text>
          <Text style={styles.title}>Working Capital</Text>
          <Text style={styles.subtitle}>Balance Sheet & Profit & Loss Analysis</Text>
        </View>

        {/* Step 1: Upload Documents */}
        <Card>
          <View style={styles.stepHeader}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>Upload Documents</Text>
              <Text style={styles.stepSubtitle}>Select your financial documents — values are auto-extracted</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.uploadButton} onPress={pickBalanceSheet}>
            <Ionicons 
              name={balanceSheetFile ? "checkmark-circle" : "cloud-upload-outline"} 
              size={20} 
              color={balanceSheetFile ? theme.green : theme.primary} 
            />
            <View style={styles.uploadTextContainer}>
              <Text style={[styles.uploadButtonText, balanceSheetFile && styles.uploadButtonTextSelected]}>
                {balanceSheetFile ? balanceSheetFile.name : 'Select Balance Sheet (PDF / Excel / Image)'}
              </Text>
              {balanceSheetFile && (
                <Text style={styles.fileSize}>{formatFileSize(balanceSheetFile.size)}</Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.uploadButton} onPress={pickPLStatement}>
            <Ionicons 
              name={plFile ? "checkmark-circle" : "cloud-upload-outline"} 
              size={20} 
              color={plFile ? theme.green : theme.primary} 
            />
            <View style={styles.uploadTextContainer}>
              <Text style={[styles.uploadButtonText, plFile && styles.uploadButtonTextSelected]}>
                {plFile ? plFile.name : 'Select P&L Statement (PDF / Excel / Image)'}
              </Text>
              {plFile && (
                <Text style={styles.fileSize}>{formatFileSize(plFile.size)}</Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
          </TouchableOpacity>

          {/* Parse Documents Button */}
          {(balanceSheetFile || plFile) && (
            <TouchableOpacity
              style={styles.parseButton}
              onPress={handleParseDocuments}
              disabled={parsing}
            >
              <LinearGradient
                colors={[theme.yellow, theme.orange]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.parseGradient}
              >
                {parsing ? (
                  <>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.parseText}>Parsing Documents...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="scan-outline" size={20} color="#fff" />
                    <Text style={styles.parseText}>Parse & Extract Data</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}
        </Card>

        {/* Step 2: Calculate */}
        <Card>
          <View style={styles.stepHeader}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>Calculate Working Capital</Text>
              <Text style={styles.stepSubtitle}>Tap to run ratio analysis using extracted or entered values</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.calculateButton}
            onPress={handleCalculate}
            disabled={loading}
          >
            <LinearGradient
              colors={[theme.gradient[0], theme.gradient[1]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.calculateGradient}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="calculator-outline" size={20} color="#fff" />
                  <Text style={styles.calculateText}>Calculate Working Capital</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.uploadHintContainer}>
            <Text style={styles.uploadHint}>
              Upload documents above for auto-fill, or tap "Enter Manually" to type values.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.toggleInputs}
            onPress={() => setShowInputs(!showInputs)}
          >
            <Text style={styles.toggleText}>
              {showInputs ? 'Hide manual inputs' : 'Show manual inputs'}
            </Text>
          </TouchableOpacity>
        </Card>

        {/* Manual Inputs */}
        {showInputs && (
          <>
            <SectionHeader title="Balance Sheet Values" color={theme.yellow} />
            <Card>
              <InputField label="Current Assets" value={currentAssets} onChangeText={setCurrentAssets} />
              <InputField label="Current Liabilities" value={currentLiabilities} onChangeText={setCurrentLiabilities} />
              <InputField label="Inventory / Stock" value={inventory} onChangeText={setInventory} />
              <InputField label="Debtors / Receivables" value={debtors} onChangeText={setDebtors} />
              <InputField label="Creditors / Payables" value={creditors} onChangeText={setCreditors} />
              <InputField label="Cash & Bank Balance" value={cashBank} onChangeText={setCashBank} />
            </Card>

            <SectionHeader title="Profit & Loss Values" color={theme.green} />
            <Card>
              <InputField label="Revenue / Sales" value={revenue} onChangeText={setRevenue} />
              <InputField label="Cost of Goods Sold" value={cogs} onChangeText={setCogs} />
              <InputField label="Purchases" value={purchases} onChangeText={setPurchases} />
              <InputField label="Operating Expenses" value={opex} onChangeText={setOpex} />
              <InputField label="Net Profit / PAT" value={netProfit} onChangeText={setNetProfit} />
            </Card>
          </>
        )}

        {/* Results */}
        <Card>
          <View style={styles.stepHeader}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>Analysis Results</Text>
              <Text style={styles.stepSubtitle}>Working capital ratios and eligibility</Text>
            </View>
          </View>
        </Card>

        {/* WC Loan Eligibility */}
        <Card>
          <View style={styles.eligibilityHeader}>
            <Text style={styles.eligibilityLabel}>WC LOAN ELIGIBILITY</Text>
            <Text style={styles.eligibilityAmount}>
              ₹{(result?.wc_limit || 0).toLocaleString('en-IN')}
            </Text>
            <Text style={styles.nwcLabel}>Net Working Capital: ₹{(result?.net_working_capital || 0).toLocaleString('en-IN')}</Text>
          </View>
        </Card>

        {/* Ratios Grid */}
        <View style={styles.metricsRow}>
          <MetricCard
            value={`${(result?.current_ratio || 0).toFixed(2)}x`}
            label="Current Ratio"
            color={result ? getStatusColor(result.current_ratio, 1.33) : theme.yellow}
          />
          <MetricCard
            value={`${(result?.quick_ratio || 0).toFixed(2)}x`}
            label="Quick Ratio"
            color={result ? getStatusColor(result.quick_ratio, 1.0) : theme.primary}
          />
          <MetricCard
            value={`${(result?.inventory_turnover || 0).toFixed(2)}x`}
            label="Inv. Turnover"
            color={theme.orange}
          />
        </View>

        <View style={styles.metricsRow}>
          <MetricCard
            value={`${result?.debtor_days || 0} d`}
            label="Debtor Days"
            color={theme.yellow}
          />
          <MetricCard
            value={`${result?.creditor_days || 0} d`}
            label="Creditor Days"
            color={theme.primary}
          />
          <MetricCard
            value={`${result?.wc_cycle || 0} d`}
            label="WC Cycle"
            color={theme.orange}
          />
        </View>

        <View style={styles.metricsRow}>
          <MetricCard
            value={`${result?.inventory_days || 0} d`}
            label="Inventory Days"
            color={theme.cyan}
          />
          <MetricCard
            value={`₹${(result?.mpbf || 0).toLocaleString('en-IN')}`}
            label="MPBF"
            color={theme.green}
          />
        </View>

        <View style={styles.metricsRow}>
          <View style={[styles.marginCard, { borderLeftColor: theme.green }]}>
            <Text style={styles.marginLabel}>GROSS MARGIN</Text>
            <Text style={[styles.marginValue, { color: theme.green }]}>
              {(result?.gross_margin || 100).toFixed(1)}%
            </Text>
          </View>
          <View style={[styles.marginCard, { borderLeftColor: theme.yellow }]}>
            <Text style={styles.marginLabel}>NET MARGIN</Text>
            <Text style={[styles.marginValue, { color: theme.yellow }]}>
              {(result?.net_margin || 0).toFixed(1)}%
            </Text>
          </View>
        </View>

        {/* Risk Indicators */}
        {result?.risk_indicators && (
          <Card>
            <Text style={styles.riskTitle}>Risk Indicators</Text>
            <View style={styles.riskRow}>
              <View style={styles.riskItem}>
                <Text style={styles.riskLabel}>Current Ratio</Text>
                <View style={[styles.riskBadge, { backgroundColor: getRiskColor(result.risk_indicators.current_ratio.color) + '20' }]}>
                  <Text style={[styles.riskBadgeText, { color: getRiskColor(result.risk_indicators.current_ratio.color) }]}>
                    {result.risk_indicators.current_ratio.label}
                  </Text>
                </View>
              </View>
              <View style={styles.riskItem}>
                <Text style={styles.riskLabel}>WC Cycle</Text>
                <View style={[styles.riskBadge, { backgroundColor: getRiskColor(result.risk_indicators.wc_cycle.color) + '20' }]}>
                  <Text style={[styles.riskBadgeText, { color: getRiskColor(result.risk_indicators.wc_cycle.color) }]}>
                    {result.risk_indicators.wc_cycle.label}
                  </Text>
                </View>
              </View>
              <View style={styles.riskItem}>
                <Text style={styles.riskLabel}>Net WC</Text>
                <View style={[styles.riskBadge, { backgroundColor: getRiskColor(result.risk_indicators.nwc.color) + '20' }]}>
                  <Text style={[styles.riskBadgeText, { color: getRiskColor(result.risk_indicators.nwc.color) }]}>
                    {result.risk_indicators.nwc.label}
                  </Text>
                </View>
              </View>
            </View>
          </Card>
        )}

        {/* Eligibility Status */}
        <Card style={result?.eligible ? styles.eligibleCard : styles.notEligibleCard}>
          <View style={styles.statusRow}>
            <Ionicons
              name={result?.eligible ? 'checkmark-circle' : 'close-circle'}
              size={20}
              color={result?.eligible ? theme.green : theme.red}
            />
            <Text style={[styles.statusText, { color: result?.eligible ? theme.green : theme.red }]}>
              {result?.eligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'}
            </Text>
          </View>
          <Text style={styles.statusSubtext}>Working Capital Assessment</Text>
          <Text style={styles.wcAmount}>₹{(result?.wc_limit || 0).toLocaleString('en-IN')}</Text>
        </Card>

        {/* Assessment Points */}
        {result?.assessment && result.assessment.length > 0 && (
          <Card>
            {result.assessment.map((point, idx) => (
              <View key={idx} style={styles.assessmentRow}>
                <Ionicons
                  name={point.includes('meets') || point.includes('healthy') || point.includes('efficient') ? 'checkmark-circle' : 'alert-circle'}
                  size={16}
                  color={point.includes('meets') || point.includes('healthy') || point.includes('efficient') ? theme.green : theme.yellow}
                />
                <Text style={styles.assessmentText}>{point}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* Advisory Suggestions */}
        {result?.suggestions && result.suggestions.length > 0 && (
          <Card>
            <SectionHeader title="Advisory Suggestions" color={theme.orange} />
            {result.suggestions.map((suggestion, idx) => (
              <View key={idx} style={styles.assessmentRow}>
                <Ionicons name="information-circle-outline" size={16} color={theme.orange} />
                <Text style={styles.assessmentText}>{suggestion}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* Recommendation */}
        {result?.recommendation && (
          <Card>
            <SectionHeader title="Recommendation" color={theme.primary} />
            <Text style={styles.recommendationText}>{result.recommendation}</Text>
          </Card>
        )}

        {/* ── Charts ── */}
        {result && (() => {
          const rev = result.input_data?.profit_loss?.revenue ?? 0;
          const exp = (result.input_data?.profit_loss?.cogs ?? 0) + (result.input_data?.profit_loss?.operating_expenses ?? 0);
          const netProfit = result.input_data?.profit_loss?.net_profit ?? 0;
          const ca = result.input_data?.balance_sheet?.current_assets ?? 0;
          const cl = result.input_data?.balance_sheet?.current_liabilities ?? 0;
          const inv = result.input_data?.balance_sheet?.inventory ?? 0;
          const debtors = result.input_data?.balance_sheet?.debtors ?? 0;
          const creditors = result.input_data?.balance_sheet?.creditors ?? 0;
          const cash = result.input_data?.balance_sheet?.cash_bank_balance ?? 0;

          const pieData = [
            { value: Math.max(rev, 0), color: theme.green, label: 'Revenue', text: `₹${(rev / 100000).toFixed(0)}L` },
            { value: Math.max(exp, 0), color: theme.red, label: 'Expenses', text: `₹${(exp / 100000).toFixed(0)}L` },
            { value: Math.max(netProfit, 0), color: theme.cyan, label: 'Net Profit', text: `₹${(netProfit / 100000).toFixed(0)}L` },
          ].filter((d) => d.value > 0);

          const barData = [
            { value: ca / 100000, label: 'Curr Assets', frontColor: theme.green },
            { value: cl / 100000, label: 'Curr Liab', frontColor: theme.red },
            { value: inv / 100000, label: 'Inventory', frontColor: theme.yellow },
            { value: debtors / 100000, label: 'Debtors', frontColor: theme.cyan },
            { value: creditors / 100000, label: 'Creditors', frontColor: theme.orange },
            { value: cash / 100000, label: 'Cash', frontColor: theme.primary },
          ].filter((d) => d.value > 0);

          return (
            <>
              <SectionHeader title="Financial Breakdown" color={theme.green} />

              {pieData.length > 0 && (
                <AnalyticsChart
                  type="pie"
                  data={pieData}
                  title="Revenue vs Expenses"
                  subtitle="P&L composition"
                  delay={100}
                  legend={pieData.map((d) => ({ label: d.label, color: d.color, value: d.text }))}
                />
              )}

              {barData.length > 0 && (
                <AnalyticsChart
                  type="bar"
                  data={barData}
                  title="Balance Sheet Overview"
                  subtitle="Key balance sheet items (₹ Lakhs)"
                  height={160}
                  width={CHART_WIDTH}
                  color={theme.primary}
                  delay={200}
                  formatYLabel={(v) => `₹${Number(v).toFixed(0)}L`}
                />
              )}
            </>
          );
        })()}

        {/* ── Business Summary ── */}
        {result && (() => {
          const rev = result.input_data?.profit_loss?.revenue ?? 0;
          const exp = (result.input_data?.profit_loss?.cogs ?? 0) + (result.input_data?.profit_loss?.operating_expenses ?? 0);
          const riskLevel = result.risk_indicators
            ? (() => {
                const scores = [result.risk_indicators.current_ratio.color, result.risk_indicators.wc_cycle.color, result.risk_indicators.nwc.color];
                if (scores.filter((c) => c === 'red').length >= 2) return 'High' as const;
                if (scores.some((c) => c === 'red') || scores.filter((c) => c === 'amber').length >= 2) return 'Medium' as const;
                return 'Low' as const;
              })()
            : 'Medium' as const;

          const summary = generateSummary({
            revenue: rev,
            expenses: exp,
            netProfit: result.input_data?.profit_loss?.net_profit,
            eligibility: result.wc_limit,
            risk: riskLevel,
            currentRatio: result.current_ratio,
            grossMargin: result.gross_margin,
            netMargin: result.net_margin,
            type: 'wc',
          });

          return (
            <>
              <SectionHeader title="Business Summary" color={theme.primary} />
              <SummarySection
                title="Working Capital Analysis Summary"
                summary={summary}
                eligibilityStatus={result.eligible ? 'Eligible' : 'Not Eligible'}
              />
              {result.suggestions && result.suggestions.length > 0 && (
                <InsightCard
                  items={result.suggestions}
                  type="recommendation"
                  title="Key Recommendations"
                />
              )}
            </>
          );
        })()}

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionButton} onPress={handleSaveCase} disabled={!result || saving}>
            {saving ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <>
                <Ionicons name="save-outline" size={18} color={theme.primary} />
                <Text style={styles.actionButtonText}>Save Case</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleExportPDF} disabled={!result || exporting}>
            {exporting ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <>
                <Ionicons name="download-outline" size={18} color={theme.primary} />
                <Text style={styles.actionButtonText}>Export PDF</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
          <Ionicons name="refresh-outline" size={18} color={theme.subText} />
          <Text style={styles.resetButtonText}>Start New Analysis</Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>
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
  header: {
    marginBottom: 20,
  },
  brandName: {
    color: theme.primary,
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
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.primary + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    color: theme.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  stepTitle: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '600',
  },
  stepSubtitle: {
    color: theme.textMuted,
    fontSize: 11,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.inputBackground,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    gap: 10,
  },
  uploadTextContainer: {
    flex: 1,
  },
  uploadButtonText: {
    color: theme.subText,
    fontSize: 13,
  },
  uploadButtonTextSelected: {
    color: theme.text,
    fontWeight: '500',
  },
  fileSize: {
    color: theme.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  parseButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 6,
  },
  parseGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 10,
  },
  parseText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  calculateButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  calculateGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 10,
  },
  calculateText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  uploadHintContainer: {
    flex: 1,
  },
  uploadHint: {
    color: theme.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  toggleInputs: {
    alignItems: 'center',
  },
  toggleText: {
    color: theme.yellow,
    fontSize: 13,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  marginCard: {
    flex: 1,
    backgroundColor: theme.card,
    borderRadius: 8,
    padding: 14,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  marginLabel: {
    color: theme.subText,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
  },
  marginValue: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 4,
  },
  eligibilityHeader: {
    alignItems: 'center',
  },
  eligibilityLabel: {
    color: theme.subText,
    fontSize: 11,
    letterSpacing: 1,
  },
  eligibilityAmount: {
    color: theme.cyan,
    fontSize: 32,
    fontWeight: '700',
  },
  nwcLabel: {
    color: theme.textMuted,
    fontSize: 12,
  },
  eligibleCard: {
    backgroundColor: theme.green + '15',
    borderColor: theme.green + '40',
  },
  notEligibleCard: {
    backgroundColor: theme.red + '15',
    borderColor: theme.red + '40',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '700',
  },
  statusSubtext: {
    color: theme.subText,
    fontSize: 11,
    marginTop: 2,
  },
  wcAmount: {
    color: theme.text,
    fontSize: 18,
    fontWeight: '600',
    position: 'absolute',
    right: 16,
    top: 16,
  },
  assessmentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  assessmentText: {
    color: theme.subText,
    fontSize: 13,
    flex: 1,
  },
  recommendationText: {
    color: theme.subText,
    fontSize: 13,
    lineHeight: 20,
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
    backgroundColor: theme.card,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    gap: 8,
  },
  actionButtonText: {
    color: theme.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.card,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    gap: 8,
    marginBottom: 20,
  },
  resetButtonText: {
    color: theme.subText,
    fontSize: 14,
  },
  riskTitle: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  riskRow: {
    flexDirection: 'row',
    gap: 8,
  },
  riskItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  riskLabel: {
    color: theme.subText,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  riskBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  riskBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
