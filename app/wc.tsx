import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import { colors } from '../src/theme/colors';
import { Card, SectionHeader, InputField, MetricCard } from '../src/components';
import { analyzeWorkingCapital, saveCase, parseDocument, exportPDF, getMimeTypeFromExtension } from '../src/api';
import { WorkingCapitalResult } from '../src/types';
import { useAppStore } from '../src/store';

interface SelectedFile {
  name: string;
  uri: string;
  type: string;
  size?: number;
}

export default function WCScreen() {
  const { setWCResult } = useAppStore();
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
            if (data.current_assets) setCurrentAssets(String(data.current_assets));
            if (data.current_liabilities) setCurrentLiabilities(String(data.current_liabilities));
            if (data.inventory) setInventory(String(data.inventory));
            if (data.receivables || data.debtors) setDebtors(String(data.receivables || data.debtors));
            if (data.payables || data.creditors) setCreditors(String(data.payables || data.creditors));
            if (data.cash || data.cash_bank_balance) setCashBank(String(data.cash || data.cash_bank_balance));
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
            if (data.revenue || data.sales) setRevenue(String(data.revenue || data.sales));
            if (data.cogs || data.cost_of_goods_sold) setCogs(String(data.cogs || data.cost_of_goods_sold));
            if (data.purchases) setPurchases(String(data.purchases));
            if (data.expenses || data.operating_expenses) setOpex(String(data.expenses || data.operating_expenses));
            if (data.net_profit || data.profit) setNetProfit(String(data.net_profit || data.profit));
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
    return ratio >= benchmark ? colors.green : colors.red;
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
            <View>
              <Text style={styles.stepTitle}>Upload Documents</Text>
              <Text style={styles.stepSubtitle}>Select your financial documents — values are auto-extracted</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.uploadButton} onPress={pickBalanceSheet}>
            <Ionicons 
              name={balanceSheetFile ? "checkmark-circle" : "cloud-upload-outline"} 
              size={20} 
              color={balanceSheetFile ? colors.green : colors.primary} 
            />
            <View style={styles.uploadTextContainer}>
              <Text style={[styles.uploadButtonText, balanceSheetFile && styles.uploadButtonTextSelected]}>
                {balanceSheetFile ? balanceSheetFile.name : 'Select Balance Sheet (PDF / Excel / Image)'}
              </Text>
              {balanceSheetFile && (
                <Text style={styles.fileSize}>{formatFileSize(balanceSheetFile.size)}</Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.uploadButton} onPress={pickPLStatement}>
            <Ionicons 
              name={plFile ? "checkmark-circle" : "cloud-upload-outline"} 
              size={20} 
              color={plFile ? colors.green : colors.primary} 
            />
            <View style={styles.uploadTextContainer}>
              <Text style={[styles.uploadButtonText, plFile && styles.uploadButtonTextSelected]}>
                {plFile ? plFile.name : 'Select P&L Statement (PDF / Excel / Image)'}
              </Text>
              {plFile && (
                <Text style={styles.fileSize}>{formatFileSize(plFile.size)}</Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Parse Documents Button */}
          {(balanceSheetFile || plFile) && (
            <TouchableOpacity
              style={styles.parseButton}
              onPress={handleParseDocuments}
              disabled={parsing}
            >
              <LinearGradient
                colors={[colors.yellow, colors.orange]}
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
            <View>
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
              colors={[colors.gradientStart, colors.gradientEnd]}
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

          <Text style={styles.uploadHint}>
            Upload documents above for auto-fill, or tap "Enter Manually" to type values.
          </Text>

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
            <SectionHeader title="Balance Sheet Values" color={colors.yellow} />
            <Card>
              <InputField label="Current Assets" value={currentAssets} onChangeText={setCurrentAssets} />
              <InputField label="Current Liabilities" value={currentLiabilities} onChangeText={setCurrentLiabilities} />
              <InputField label="Inventory / Stock" value={inventory} onChangeText={setInventory} />
              <InputField label="Debtors / Receivables" value={debtors} onChangeText={setDebtors} />
              <InputField label="Creditors / Payables" value={creditors} onChangeText={setCreditors} />
              <InputField label="Cash & Bank Balance" value={cashBank} onChangeText={setCashBank} />
            </Card>

            <SectionHeader title="Profit & Loss Values" color={colors.green} />
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
        <View style={styles.stepHeader}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>3</Text>
          </View>
          <View>
            <Text style={styles.stepTitle}>Analysis Results</Text>
            <Text style={styles.stepSubtitle}>Working capital ratios and eligibility</Text>
          </View>
        </View>

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
            color={result ? getStatusColor(result.current_ratio, 1.33) : colors.yellow}
          />
          <MetricCard
            value={`${(result?.quick_ratio || 0).toFixed(2)}x`}
            label="Quick Ratio"
            color={result ? getStatusColor(result.quick_ratio, 1.0) : colors.primary}
          />
          <MetricCard
            value={`${(result?.inventory_turnover || 0).toFixed(2)}x`}
            label="Inv. Turnover"
            color={colors.orange}
          />
        </View>

        <View style={styles.metricsRow}>
          <MetricCard
            value={`${result?.debtor_days || 0} d`}
            label="Debtor Days"
            color={colors.yellow}
          />
          <MetricCard
            value={`${result?.creditor_days || 0} d`}
            label="Creditor Days"
            color={colors.primary}
          />
          <MetricCard
            value={`${result?.wc_cycle || 0} d`}
            label="WC Cycle"
            color={colors.orange}
          />
        </View>

        <View style={styles.metricsRow}>
          <View style={[styles.marginCard, { borderLeftColor: colors.green }]}>
            <Text style={styles.marginLabel}>GROSS MARGIN</Text>
            <Text style={[styles.marginValue, { color: colors.green }]}>
              {(result?.gross_margin || 100).toFixed(1)}%
            </Text>
          </View>
          <View style={[styles.marginCard, { borderLeftColor: colors.yellow }]}>
            <Text style={styles.marginLabel}>NET MARGIN</Text>
            <Text style={[styles.marginValue, { color: colors.yellow }]}>
              {(result?.net_margin || 0).toFixed(1)}%
            </Text>
          </View>
        </View>

        {/* Eligibility Status */}
        <Card style={result?.eligible ? styles.eligibleCard : styles.notEligibleCard}>
          <View style={styles.statusRow}>
            <Ionicons
              name={result?.eligible ? 'checkmark-circle' : 'close-circle'}
              size={20}
              color={result?.eligible ? colors.green : colors.red}
            />
            <Text style={[styles.statusText, { color: result?.eligible ? colors.green : colors.red }]}>
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
                  color={point.includes('meets') || point.includes('healthy') || point.includes('efficient') ? colors.green : colors.yellow}
                />
                <Text style={styles.assessmentText}>{point}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* Recommendation */}
        {result?.recommendation && (
          <Card>
            <SectionHeader title="Recommendation" color={colors.primary} />
            <Text style={styles.recommendationText}>{result.recommendation}</Text>
          </Card>
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
  brandName: {
    color: colors.primary,
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
    backgroundColor: colors.primary + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  stepTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  stepSubtitle: {
    color: colors.textMuted,
    fontSize: 11,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    gap: 10,
  },
  uploadTextContainer: {
    flex: 1,
  },
  uploadButtonText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  uploadButtonTextSelected: {
    color: colors.text,
    fontWeight: '500',
  },
  fileSize: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  parseButton: {
    borderRadius: 10,
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
    borderRadius: 10,
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
  uploadHint: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 8,
  },
  toggleInputs: {
    alignItems: 'center',
  },
  toggleText: {
    color: colors.yellow,
    fontSize: 13,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  marginCard: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    padding: 14,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  marginLabel: {
    color: colors.textSecondary,
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
    color: colors.textSecondary,
    fontSize: 11,
    letterSpacing: 1,
  },
  eligibilityAmount: {
    color: colors.cyan,
    fontSize: 32,
    fontWeight: '700',
  },
  nwcLabel: {
    color: colors.textMuted,
    fontSize: 12,
  },
  eligibleCard: {
    backgroundColor: colors.green + '15',
    borderColor: colors.green + '40',
  },
  notEligibleCard: {
    backgroundColor: colors.red + '15',
    borderColor: colors.red + '40',
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
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  wcAmount: {
    color: colors.text,
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
    color: colors.textSecondary,
    fontSize: 13,
    flex: 1,
  },
  recommendationText: {
    color: colors.textSecondary,
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
});
