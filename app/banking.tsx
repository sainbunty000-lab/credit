import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import { colors } from '../src/theme/colors';
import { Card, SectionHeader, InputField, StatusBadge, AppHeader, InsightCard, SummarySection } from '../src/components';
import { analyzeBanking, saveCase, parseDocument, exportPDF, getMimeTypeFromExtension } from '../src/api';
import { BankingResult } from '../src/types';
import { useAppStore } from '../src/store';

interface SelectedFile {
  name: string;
  uri: string;
  type: string;
  size?: number;
}

export default function BankingScreen() {
  const { setBankingResult } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<BankingResult | null>(null);
  const [bankStatementFile, setBankStatementFile] = useState<SelectedFile | null>(null);

  // Credits & Debits
  const [totalCredits, setTotalCredits] = useState('');
  const [totalDebits, setTotalDebits] = useState('');

  // Account Balances
  const [avgBalance, setAvgBalance] = useState('');
  const [minBalance, setMinBalance] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [closingBalance, setClosingBalance] = useState('');

  // Risk Indicators
  const [cashDeposits, setCashDeposits] = useState('');
  const [chequeBounces, setChequeBounces] = useState('');
  const [loanRepayments, setLoanRepayments] = useState('');
  const [overdraftUsage, setOverdraftUsage] = useState('');
  const [ecsEmi, setEcsEmi] = useState('');
  const [numTransactions, setNumTransactions] = useState('');

  const [companyName, setCompanyName] = useState('Company');
  const [exporting, setExporting] = useState(false);

  const pickBankStatement = async () => {
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
        
        setBankStatementFile({
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

  const [parsing, setParsing] = useState(false);

  const handleParseBankStatement = async () => {
    if (!bankStatementFile) {
      Alert.alert('No File', 'Please select a bank statement to parse.');
      return;
    }

    setParsing(true);
    
    try {
      console.log('Sending bank statement to local backend:', bankStatementFile.name);
      
      const response = await parseDocument(
        bankStatementFile.uri,
        bankStatementFile.name,
        bankStatementFile.type,
        'bank_statement'
      );
      
      console.log('Parse response:', response);
      
      if (response.success && response.parsed_data) {
        const data = response.parsed_data;
        let hasData = false;
        
        if (data.total_credits) { setTotalCredits(String(data.total_credits)); hasData = true; }
        if (data.total_debits) { setTotalDebits(String(data.total_debits)); hasData = true; }
        if (data.average_balance) { setAvgBalance(String(data.average_balance)); hasData = true; }
        if (data.minimum_balance) { setMinBalance(String(data.minimum_balance)); hasData = true; }
        if (data.opening_balance) { setOpeningBalance(String(data.opening_balance)); hasData = true; }
        if (data.closing_balance) { setClosingBalance(String(data.closing_balance)); hasData = true; }
        if (data.cash_deposits) { setCashDeposits(String(data.cash_deposits)); hasData = true; }
        if (data.cheque_bounces !== undefined) { setChequeBounces(String(data.cheque_bounces)); hasData = true; }
        if (data.loan_repayments) { setLoanRepayments(String(data.loan_repayments)); hasData = true; }
        if (data.overdraft_usage) { setOverdraftUsage(String(data.overdraft_usage)); hasData = true; }
        if (data.ecs_emi_payments) { setEcsEmi(String(data.ecs_emi_payments)); hasData = true; }
        if (data.num_transactions) { setNumTransactions(String(data.num_transactions)); hasData = true; }
        
        if (hasData) {
          Alert.alert(
            'Parsing Complete',
            'Bank statement parsed using Gemini Vision AI!\n\nExtracted values have been filled in. Please verify and edit if needed.'
          );
        } else {
          Alert.alert(
            'Parsing Issue',
            'Text was extracted but no financial values found.\n\nPlease enter values manually.'
          );
        }
      } else {
        Alert.alert(
          'Parsing Issue',
          response.message || 'Could not extract data from the bank statement.\n\nPlease enter values manually.'
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

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const data = {
        company_name: companyName,
        total_credits: parseFloat(totalCredits) || 0,
        total_debits: parseFloat(totalDebits) || 0,
        average_balance: parseFloat(avgBalance) || 0,
        minimum_balance: parseFloat(minBalance) || 0,
        opening_balance: parseFloat(openingBalance) || 0,
        closing_balance: parseFloat(closingBalance) || 0,
        cash_deposits: parseFloat(cashDeposits) || 0,
        cheque_bounces: parseInt(chequeBounces) || 0,
        loan_repayments: parseFloat(loanRepayments) || 0,
        overdraft_usage: parseFloat(overdraftUsage) || 0,
        ecs_emi_payments: parseFloat(ecsEmi) || 0,
        num_transactions: parseInt(numTransactions) || 0,
        sanctioned_limit: 0,
        utilized_limit: 0,
      };

      const res = await analyzeBanking(data);
      setResult(res);
      setBankingResult(res);
    } catch (error) {
      console.log('Error:', error);
      Alert.alert('Error', 'Failed to analyze banking data. Please try again.');
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
        analysis_type: 'banking',
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
    setBankingResult(null);
    setTotalCredits('');
    setTotalDebits('');
    setAvgBalance('');
    setMinBalance('');
    setOpeningBalance('');
    setClosingBalance('');
    setCashDeposits('');
    setChequeBounces('');
    setLoanRepayments('');
    setOverdraftUsage('');
    setEcsEmi('');
    setNumTransactions('');
  };

  const handleExportPDF = async () => {
    if (!result) return;
    setExporting(true);
    try {
      const blob = await exportPDF('banking', result, result.company_name);
      if (typeof window !== 'undefined' && window.URL) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${result.company_name}_Banking_Report.pdf`;
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

  const getScoreColor = (score: number) => {
    if (score >= 85) return colors.green;
    if (score >= 65) return colors.yellow;
    if (score >= 50) return colors.orange;
    return colors.red;
  };

  const getStatusVariant = (status: string): 'success' | 'warning' | 'error' | 'neutral' => {
    if (status === 'Adequate' || status === 'Strong' || status === 'Disciplined') return 'success';
    if (status === 'Moderate' || status === 'Needs Improvement') return 'warning';
    if (status === 'Weak') return 'error';
    return 'neutral';
  };

  const formatK = (amount: number) => `₹${Math.round(amount / 1000)}K`;

  const gradeText: Record<string, string> = {
    'A': 'Excellent — Full Approval',
    'B': 'Good — Conditional Approval',
    'C': 'Fair — Review Required',
    'D': 'Poor — Not Recommended',
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        enableOnAndroid={true}
        extraScrollHeight={100}
      >
        {/* Header */}
        <AppHeader
          title="Banking Performance"
          subtitle="Bank Statement Analysis & Credit Assessment"
        />

        {/* Upload Bank Statement */}
        <Card>
          <View style={styles.stepHeader}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View>
              <Text style={styles.stepTitle}>Upload Bank Statement</Text>
              <Text style={styles.stepSubtitle}>Select your bank statement for analysis</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.uploadButton} onPress={pickBankStatement}>
            <Ionicons 
              name={bankStatementFile ? "checkmark-circle" : "cloud-upload-outline"} 
              size={20} 
              color={bankStatementFile ? colors.green : colors.primary} 
            />
            <View style={styles.uploadTextContainer}>
              <Text style={[styles.uploadButtonTextStyle, bankStatementFile && styles.uploadButtonTextSelected]}>
                {bankStatementFile ? bankStatementFile.name : 'Select Bank Statement (PDF / Excel / CSV)'}
              </Text>
              {bankStatementFile && (
                <Text style={styles.fileSize}>{formatFileSize(bankStatementFile.size)}</Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Parse Bank Statement Button */}
          {bankStatementFile && (
            <TouchableOpacity
              style={styles.parseButton}
              onPress={handleParseBankStatement}
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
                    <Text style={styles.parseText}>Parsing Statement...</Text>
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

        {/* Calculate Button */}
        <TouchableOpacity
          style={styles.calculateButton}
          onPress={handleAnalyze}
          disabled={loading}
        >
          <LinearGradient
            colors={[colors.green, colors.cyan]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.calculateGradient}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="analytics-outline" size={20} color="#fff" />
                <Text style={styles.calculateText}>Analyze Banking Performance</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Credits & Debits */}
        <SectionHeader title="Credits & Debits" color={colors.primary} />
        <Card>
          <InputField label="Total Credits" value={totalCredits} onChangeText={setTotalCredits} />
          <InputField label="Total Debits" value={totalDebits} onChangeText={setTotalDebits} />
        </Card>

        {/* Account Balances */}
        <SectionHeader title="Account Balances" color={colors.yellow} />
        <Card>
          <InputField label="Average Balance" value={avgBalance} onChangeText={setAvgBalance} />
          <InputField label="Minimum Balance" value={minBalance} onChangeText={setMinBalance} />
          <InputField label="Opening Balance" value={openingBalance} onChangeText={setOpeningBalance} />
          <InputField label="Closing Balance" value={closingBalance} onChangeText={setClosingBalance} />
        </Card>

        {/* Risk Indicators */}
        <SectionHeader title="Risk Indicators" color={colors.red} />
        <Card>
          <InputField label="Cash Deposits" value={cashDeposits} onChangeText={setCashDeposits} />
          <InputField label="Cheque Bounces (#)" value={chequeBounces} onChangeText={setChequeBounces} keyboardType="numeric" />
          <InputField label="Loan Repayments" value={loanRepayments} onChangeText={setLoanRepayments} />
          <InputField label="Overdraft Usage" value={overdraftUsage} onChangeText={setOverdraftUsage} />
          <InputField label="ECS / EMI Payments" value={ecsEmi} onChangeText={setEcsEmi} />
          <InputField label="No. of Transactions" value={numTransactions} onChangeText={setNumTransactions} keyboardType="numeric" />
        </Card>

        {/* ===== PERFIOS-STYLE RESULTS ===== */}
        {result && (
          <>
            {/* 1. Banking Health Score */}
            <View style={styles.healthScoreCard}>
              <LinearGradient
                colors={
                  result.health_score >= 85 ? [colors.green, '#2E7D32'] :
                  result.health_score >= 70 ? [colors.primary, colors.primaryDark] :
                  result.health_score >= 55 ? [colors.yellow, colors.orange] :
                  [colors.red, '#B71C1C']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.healthScoreGradient}
              >
                <View style={styles.healthScoreLeft}>
                  <Text style={styles.healthScoreLabel}>BANKING HEALTH SCORE</Text>
                  <View style={styles.healthScoreRow}>
                    <Text style={styles.healthScoreValue}>{result.health_score}</Text>
                    <Text style={styles.healthScoreMax}> / 100</Text>
                  </View>
                  <View style={styles.healthStatusBadge}>
                    <Text style={styles.healthStatusText}>{result.health_status}</Text>
                  </View>
                </View>
                <View style={styles.healthScoreRight}>
                  <Ionicons
                    name={
                      result.health_score >= 85 ? 'shield-checkmark' :
                      result.health_score >= 70 ? 'checkmark-circle' :
                      result.health_score >= 55 ? 'alert-circle' :
                      'close-circle'
                    }
                    size={56}
                    color="rgba(255,255,255,0.35)"
                  />
                </View>
              </LinearGradient>
            </View>

            {/* 2. KPI Cards */}
            <SectionHeader title="Key Banking KPIs" color={colors.primary} />
            <View style={styles.kpiGrid}>
              <View style={[styles.kpiCard, { borderLeftColor: colors.green }]}>
                <Text style={styles.kpiLabel}>Avg Balance</Text>
                <Text style={[styles.kpiValue, { color: colors.green }]}>
                  ₹{result.input_data.average_balance.toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={[styles.kpiCard, { borderLeftColor: colors.primary }]}>
                <Text style={styles.kpiLabel}>Monthly Inflow</Text>
                <Text style={[styles.kpiValue, { color: colors.primary }]}>
                  ₹{Math.round(result.monthly_inflow).toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={[styles.kpiCard, { borderLeftColor: result.monthly_outflow > result.monthly_inflow ? colors.red : colors.orange }]}>
                <Text style={styles.kpiLabel}>Monthly Outflow</Text>
                <Text style={[styles.kpiValue, { color: result.monthly_outflow > result.monthly_inflow ? colors.red : colors.orange }]}>
                  ₹{Math.round(result.monthly_outflow).toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={[styles.kpiCard, { borderLeftColor: result.input_data.ecs_emi_payments > result.monthly_inflow * 0.4 ? colors.red : colors.yellow }]}>
                <Text style={styles.kpiLabel}>EMI Obligations</Text>
                <Text style={[styles.kpiValue, { color: result.input_data.ecs_emi_payments > result.monthly_inflow * 0.4 ? colors.red : colors.yellow }]}>
                  ₹{result.input_data.ecs_emi_payments.toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={[styles.kpiCard, { borderLeftColor: result.input_data.cheque_bounces > 2 ? colors.red : colors.green }]}>
                <Text style={styles.kpiLabel}>Bounce Count</Text>
                <Text style={[styles.kpiValue, { color: result.input_data.cheque_bounces > 2 ? colors.red : colors.green }]}>
                  {result.input_data.cheque_bounces}
                </Text>
              </View>
            </View>

            {/* 3. Cash Flow Chart */}
            {result.cash_flow_trend.length > 0 && (
              <>
                <SectionHeader title="Cash Flow Trend" color={colors.cyan} />
                <Card>
                  <View style={styles.chartLegend}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: colors.green }]} />
                      <Text style={styles.legendText}>Inflow</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: colors.red }]} />
                      <Text style={styles.legendText}>Outflow</Text>
                    </View>
                  </View>
                  {(() => {
                    const maxVal = Math.max(
                      ...result.cash_flow_trend.map(m => Math.max(m.inflow, m.outflow))
                    ) || 1;
                    return result.cash_flow_trend.map((item, i) => (
                      <View key={i} style={styles.chartRow}>
                        <Text style={styles.chartMonth}>{item.month}</Text>
                        <View style={styles.chartBarsCol}>
                          <View style={styles.chartBarRow}>
                            <View
                              style={[
                                styles.chartBarFill,
                                {
                                  width: `${(item.inflow / maxVal) * 100}%`,
                                  backgroundColor: colors.green,
                                },
                              ]}
                            />
                            <Text style={styles.chartBarAmt}>
                              {formatK(item.inflow)}
                            </Text>
                          </View>
                          <View style={styles.chartBarRow}>
                            <View
                              style={[
                                styles.chartBarFill,
                                {
                                  width: `${(item.outflow / maxVal) * 100}%`,
                                  backgroundColor: colors.red + 'CC',
                                },
                              ]}
                            />
                            <Text style={styles.chartBarAmt}>
                              {formatK(item.outflow)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ));
                  })()}
                </Card>
              </>
            )}

            {/* 4. Risk Indicators */}
            {result.risks.length > 0 && (
              <>
                <SectionHeader title="Risk Indicators" color={colors.red} />
                <View style={styles.riskList}>
                  {result.risks.map((risk, i) => (
                    <View key={i} style={styles.riskCard}>
                      <Ionicons name="warning" size={18} color={colors.red} />
                      <Text style={styles.riskText}>{risk}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* 5. AI Summary */}
            <SectionHeader title="AI Analysis Summary" color={colors.purple} />
            <SummarySection
              summary={result.ai_summary}
              eligibilityStatus={result.eligibility_status}
            />

            {/* 6. Insights Cards */}
            <SectionHeader title="Key Insights" color={colors.primary} />
            <InsightCard items={result.insights} type="info" />
          </>
        )}

        {/* Credit Risk Assessment */}
        {result && (
          <>
            <SectionHeader title="Credit Risk Assessment" color={colors.cyan} />
            <Card>
              <View style={styles.gradeRow}>
                <View>
                  <Text style={styles.gradeLabel}>Grade {result.grade} — {result.grade === 'A' ? 'Excellent' : result.grade === 'B' ? 'Good' : result.grade === 'C' ? 'Fair' : 'Poor'} — {result.grade === 'A' || result.grade === 'B' ? 'Acceptable' : 'Review Needed'}</Text>
                  <StatusBadge status={`Risk Level: ${result.risk_level}`} variant={result.risk_level === 'Low' ? 'success' : result.risk_level === 'Medium' ? 'warning' : 'error'} />
                </View>
                <View style={styles.scoreContainer}>
                  <Text style={[styles.scoreValue, { color: getScoreColor(result.credit_score) }]}>
                    {result.credit_score}
                  </Text>
                  <Text style={styles.scoreMax}>/100</Text>
                </View>
              </View>
            </Card>

            {/* Status Grid */}
            <View style={styles.statusGrid}>
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>WORKING CAPITAL</Text>
                <StatusBadge status={result.working_capital_status} variant={getStatusVariant(result.working_capital_status)} />
              </View>
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>LIQUIDITY</Text>
                <StatusBadge status={result.liquidity_status} variant={getStatusVariant(result.liquidity_status)} />
              </View>
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>CASH FLOW</Text>
                <StatusBadge status={result.cash_flow_status} variant={getStatusVariant(result.cash_flow_status)} />
              </View>
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>CREDITWORTHINESS</Text>
                <StatusBadge status={result.creditworthiness_status} variant={getStatusVariant(result.creditworthiness_status)} />
              </View>
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>REPAYMENT</Text>
                <StatusBadge status={result.repayment_status} variant={getStatusVariant(result.repayment_status)} />
              </View>
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>STABILITY</Text>
                <StatusBadge status={result.stability_status} variant={getStatusVariant(result.stability_status)} />
              </View>
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>BEHAVIOR</Text>
                <StatusBadge status={result.behavior_status} variant={getStatusVariant(result.behavior_status)} />
              </View>
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>RISK LEVEL</Text>
                <StatusBadge status={result.risk_level} variant={result.risk_level === 'Low' ? 'success' : result.risk_level === 'Medium' ? 'warning' : 'error'} />
              </View>
            </View>

            {/* Score Breakdown */}
            <Card>
              <View style={styles.scoreBreakdownHeader}>
                <View style={styles.scorePieContainer}>
                  <Text style={[styles.scorePieValue, { color: getScoreColor(result.credit_score) }]}>
                    {result.credit_score}%
                  </Text>
                  <Text style={styles.scorePieLabel}>Score</Text>
                </View>
                <View style={styles.scoreBreakdown}>
                  <View style={styles.scoreBar}>
                    <Text style={styles.scoreBarLabel}>Liquidity</Text>
                    <View style={styles.scoreBarTrack}>
                      <View style={[styles.scoreBarFill, { width: `${result.liquidity_score}%`, backgroundColor: colors.yellow }]} />
                    </View>
                    <Text style={styles.scoreBarValue}>{result.liquidity_score}%</Text>
                  </View>
                  <View style={styles.scoreBar}>
                    <Text style={styles.scoreBarLabel}>Cash Flow</Text>
                    <View style={styles.scoreBarTrack}>
                      <View style={[styles.scoreBarFill, { width: `${result.cash_flow_score}%`, backgroundColor: colors.green }]} />
                    </View>
                    <Text style={styles.scoreBarValue}>{result.cash_flow_score}%</Text>
                  </View>
                  <View style={styles.scoreBar}>
                    <Text style={styles.scoreBarLabel}>Credit</Text>
                    <View style={styles.scoreBarTrack}>
                      <View style={[styles.scoreBarFill, { width: `${result.credit_score_component}%`, backgroundColor: colors.primary }]} />
                    </View>
                    <Text style={styles.scoreBarValue}>{result.credit_score_component}%</Text>
                  </View>
                  <View style={styles.scoreBar}>
                    <Text style={styles.scoreBarLabel}>Repayment</Text>
                    <View style={styles.scoreBarTrack}>
                      <View style={[styles.scoreBarFill, { width: `${result.repayment_score}%`, backgroundColor: colors.orange }]} />
                    </View>
                    <Text style={styles.scoreBarValue}>{result.repayment_score}%</Text>
                  </View>
                  <View style={styles.scoreBar}>
                    <Text style={styles.scoreBarLabel}>Stability</Text>
                    <View style={styles.scoreBarTrack}>
                      <View style={[styles.scoreBarFill, { width: `${result.stability_score}%`, backgroundColor: colors.cyan }]} />
                    </View>
                    <Text style={styles.scoreBarValue}>{result.stability_score}%</Text>
                  </View>
                </View>
              </View>
            </Card>

            {/* Overall Status */}
            <Card style={[styles.overallCard, { backgroundColor: result.grade === 'A' || result.grade === 'B' ? colors.green + '15' : colors.red + '15' }]}>
              <View style={styles.overallHeader}>
                <View style={styles.gradeBadge}>
                  <Text style={styles.gradeBadgeText}>{result.grade}</Text>
                </View>
                <View>
                  <Text style={[styles.overallTitle, { color: result.grade === 'A' || result.grade === 'B' ? colors.green : colors.red }]}>
                    {gradeText[result.grade]?.toUpperCase()}
                  </Text>
                  <Text style={styles.overallSubtitle}>Overall Score: {result.credit_score}/100</Text>
                </View>
              </View>
            </Card>

            {/* Strengths */}
            <SectionHeader title="Strengths" color={colors.green} />
            <InsightCard items={result.strengths} type="strength" />

            {/* Concerns */}
            <SectionHeader title="Concerns" color={colors.red} />
            <InsightCard items={result.concerns} type="risk" />

            {/* Recommendation */}
            <SectionHeader title="Credit Officer Recommendation" color={colors.primary} />
            <Card>
              <Text style={styles.recommendationText}>{result.recommendation}</Text>
            </Card>
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
  uploadButtonTextStyle: {
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
    marginBottom: 20,
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
  gradeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gradeLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  scoreValue: {
    fontSize: 42,
    fontWeight: '700',
  },
  scoreMax: {
    color: colors.textMuted,
    fontSize: 16,
    marginBottom: 8,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  statusItem: {
    width: '48%',
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  statusLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 6,
  },
  scoreBreakdownHeader: {
    flexDirection: 'row',
    gap: 20,
  },
  scorePieContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 6,
    borderColor: colors.primary,
  },
  scorePieValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  scorePieLabel: {
    color: colors.textMuted,
    fontSize: 10,
  },
  scoreBreakdown: {
    flex: 1,
    gap: 8,
  },
  scoreBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scoreBarLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    width: 70,
  },
  scoreBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: colors.inputBackground,
    borderRadius: 3,
  },
  scoreBarFill: {
    height: 6,
    borderRadius: 3,
  },
  scoreBarValue: {
    color: colors.textSecondary,
    fontSize: 11,
    width: 35,
    textAlign: 'right',
  },
  overallCard: {
    borderColor: colors.cardBorder,
  },
  overallHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  gradeBadge: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeBadgeText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  overallTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  overallSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  listText: {
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
    marginTop: 16,
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
  // ===== PERFIOS-STYLE STYLES =====
  healthScoreCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  healthScoreGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
  },
  healthScoreLeft: {
    flex: 1,
  },
  healthScoreRight: {
    marginLeft: 12,
  },
  healthScoreLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  healthScoreRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  healthScoreValue: {
    color: '#FFFFFF',
    fontSize: 52,
    fontWeight: '800',
    lineHeight: 56,
  },
  healthScoreMax: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 10,
  },
  healthStatusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  healthStatusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: colors.cardBackground,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  kpiLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  chartLegend: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  chartMonth: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    width: 28,
  },
  chartBarsCol: {
    flex: 1,
    gap: 3,
  },
  chartBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chartBarFill: {
    height: 8,
    borderRadius: 4,
    minWidth: 4,
  },
  chartBarAmt: {
    color: colors.textMuted,
    fontSize: 10,
  },
  riskList: {
    gap: 8,
    marginBottom: 16,
  },
  riskCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.red + '10',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.red + '30',
    padding: 14,
  },
  riskText: {
    color: colors.red,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
    lineHeight: 18,
  },
  eligibilityRow: {
    marginBottom: 12,
  },
  eligibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 6,
  },
  eligibilityText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  aiSummaryText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 21,
  },
  insightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  insightText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '500',
  },
});
