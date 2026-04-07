import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '../src/theme/ThemeContext';
import { ThemeColors } from '../src/theme/themes';
import { Card, SectionHeader, InputField, StatusBadge, InsightCard, SummarySection } from '../src/components';
import {
  analyzeGstItr,
  saveCase,
  parseDocument,
  exportPDF,
  getMimeTypeFromExtension,
} from '../src/api';
import { GstItrResult } from '../src/types';
import { useAppStore } from '../src/store';

interface SelectedFile {
  name: string;
  uri: string;
  type: string;
  size?: number;
}

export default function GstScreen() {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const { setGstItrResult, loadedCase, setLoadedCase } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<GstItrResult | null>(null);
  const [gstrFile, setGstrFile] = useState<SelectedFile | null>(null);
  const [itrFile, setItrFile] = useState<SelectedFile | null>(null);
  const [parsing, setParsing] = useState(false);
  const [exporting, setExporting] = useState(false);

  // GST inputs
  const [gstin, setGstin] = useState('');
  const [totalTaxableTurnover, setTotalTaxableTurnover] = useState('');
  const [igstCollected, setIgstCollected] = useState('');
  const [cgstCollected, setCgstCollected] = useState('');
  const [sgstCollected, setSgstCollected] = useState('');
  const [totalItcAvailable, setTotalItcAvailable] = useState('');
  const [totalItcUtilized, setTotalItcUtilized] = useState('');
  const [interestPaid, setInterestPaid] = useState('');

  // ITR inputs
  const [taxableIncome, setTaxableIncome] = useState('');
  const [totalDeductions, setTotalDeductions] = useState('');
  const [netTaxLiability, setNetTaxLiability] = useState('');
  const [taxDue, setTaxDue] = useState('');
  const [tdsDeducted, setTdsDeducted] = useState('');
  const [advanceTaxPaid, setAdvanceTaxPaid] = useState('');

  const [companyName, setCompanyName] = useState('Company');

  const validExtensions = ['.pdf', '.xlsx', '.xls', '.csv', '.jpg', '.jpeg', '.png', '.heic', '.heif'];

  // Pre-fill inputs and result when navigating from the Cases screen
  useFocusEffect(
    useCallback(() => {
      if (loadedCase && loadedCase.analysis_type === 'gst_itr') {
        const savedResult: GstItrResult = loadedCase.data;
        const gst = savedResult.input_data?.gst;
        const itr = savedResult.input_data?.itr;
        if (gst) {
          if (gst.gstin != null) setGstin(String(gst.gstin));
          if (gst.total_taxable_turnover != null) setTotalTaxableTurnover(String(gst.total_taxable_turnover));
          if (gst.igst_collected != null) setIgstCollected(String(gst.igst_collected));
          if (gst.cgst_collected != null) setCgstCollected(String(gst.cgst_collected));
          if (gst.sgst_collected != null) setSgstCollected(String(gst.sgst_collected));
          if (gst.total_itc_available != null) setTotalItcAvailable(String(gst.total_itc_available));
          if (gst.total_itc_utilized != null) setTotalItcUtilized(String(gst.total_itc_utilized));
          if (gst.interest_paid != null) setInterestPaid(String(gst.interest_paid));
        }
        if (itr) {
          if (itr.taxable_income != null) setTaxableIncome(String(itr.taxable_income));
          if (itr.total_deductions != null) setTotalDeductions(String(itr.total_deductions));
          if (itr.net_tax_liability != null) setNetTaxLiability(String(itr.net_tax_liability));
          if (itr.tax_due != null) setTaxDue(String(itr.tax_due));
          if (itr.tds_deducted != null) setTdsDeducted(String(itr.tds_deducted));
          if (itr.advance_tax_paid != null) setAdvanceTaxPaid(String(itr.advance_tax_paid));
        }
        if (savedResult.company_name) setCompanyName(savedResult.company_name);
        setResult(savedResult);
        setGstItrResult(savedResult);
        setLoadedCase(null);
      }
    }, [loadedCase])
  );

  const pickFile = async (type: 'gstr' | 'itr') => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const file = res.assets[0];
        const fileName = file.name.toLowerCase();
        const isValid = validExtensions.some(ext => fileName.endsWith(ext));
        if (!isValid) {
          Alert.alert('Invalid File', 'Please select a PDF, Excel, CSV, or Image file.');
          return;
        }
        const fileObj: SelectedFile = {
          name: file.name,
          uri: file.uri,
          type: getMimeTypeFromExtension(file.name),
          size: file.size,
        };
        if (type === 'gstr') setGstrFile(fileObj);
        else setItrFile(fileObj);
      }
    } catch {
      Alert.alert('Error', 'Failed to pick document. Please try again.');
    }
  };

  const parseGstFile = async () => {
    if (!gstrFile) return;
    setParsing(true);
    try {
      const parsed = await parseDocument(gstrFile.uri, gstrFile.name, gstrFile.type, 'gstr');
      const d = parsed.parsed_data;
      if (d.total_taxable_turnover != null) setTotalTaxableTurnover(String(d.total_taxable_turnover));
      if (d.taxable_turnover != null && d.total_taxable_turnover == null)
        setTotalTaxableTurnover(String(d.taxable_turnover));
      if (d.igst_collected != null) setIgstCollected(String(d.igst_collected));
      if (d.cgst_collected != null) setCgstCollected(String(d.cgst_collected));
      if (d.sgst_collected != null) setSgstCollected(String(d.sgst_collected));
      if (d.total_itc_available != null) setTotalItcAvailable(String(d.total_itc_available));
      if (d.itc_available != null && d.total_itc_available == null)
        setTotalItcAvailable(String(d.itc_available));
      if (d.total_itc_utilized != null) setTotalItcUtilized(String(d.total_itc_utilized));
      if (d.itc_utilized != null && d.total_itc_utilized == null)
        setTotalItcUtilized(String(d.itc_utilized));
      if (d.interest_paid != null) setInterestPaid(String(d.interest_paid));
      Alert.alert('Parsed', 'GSTR-3B data extracted. Review and adjust if needed.');
    } catch {
      Alert.alert('Parse Error', 'Could not extract data from this file. Enter values manually.');
    } finally {
      setParsing(false);
    }
  };

  const parseItrFile = async () => {
    if (!itrFile) return;
    setParsing(true);
    try {
      const parsed = await parseDocument(itrFile.uri, itrFile.name, itrFile.type, 'itr');
      const d = parsed.parsed_data;
      if (d.taxable_income != null) setTaxableIncome(String(d.taxable_income));
      if (d.total_deductions != null) setTotalDeductions(String(d.total_deductions));
      if (d.net_tax_liability != null) setNetTaxLiability(String(d.net_tax_liability));
      if (d.tax_due != null) setTaxDue(String(d.tax_due));
      if (d.tds_deducted != null) setTdsDeducted(String(d.tds_deducted));
      if (d.advance_tax_paid != null) setAdvanceTaxPaid(String(d.advance_tax_paid));
      Alert.alert('Parsed', 'ITR data extracted. Review and adjust if needed.');
    } catch {
      Alert.alert('Parse Error', 'Could not extract data from this file. Enter values manually.');
    } finally {
      setParsing(false);
    }
  };

  const handleAnalyze = async () => {
    const turnover = parseFloat(totalTaxableTurnover) || 0;
    const income = parseFloat(taxableIncome) || 0;
    if (turnover === 0 && income === 0) {
      Alert.alert('Missing Data', 'Enter at least GST turnover or ITR taxable income to run analysis.');
      return;
    }
    setLoading(true);
    try {
      const data = {
        company_name: companyName || 'Company',
        gst: {
          gstin: gstin.trim(),
          total_taxable_turnover: parseFloat(totalTaxableTurnover) || 0,
          igst_collected: parseFloat(igstCollected) || 0,
          cgst_collected: parseFloat(cgstCollected) || 0,
          sgst_collected: parseFloat(sgstCollected) || 0,
          total_itc_available: parseFloat(totalItcAvailable) || 0,
          total_itc_utilized: parseFloat(totalItcUtilized) || 0,
          interest_paid: parseFloat(interestPaid) || 0,
        },
        itr: {
          taxable_income: parseFloat(taxableIncome) || 0,
          total_deductions: parseFloat(totalDeductions) || 0,
          net_tax_liability: parseFloat(netTaxLiability) || 0,
          tax_due: parseFloat(taxDue) || 0,
          tds_deducted: parseFloat(tdsDeducted) || 0,
          advance_tax_paid: parseFloat(advanceTaxPaid) || 0,
        },
      };
      const res = await analyzeGstItr(data);
      setResult(res);
      setGstItrResult(res);
    } catch (e: any) {
      Alert.alert('Analysis Failed', e?.message || 'Could not connect to analysis server. Check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    setSaving(true);
    try {
      const caseData = {
        id: result.id,
        company_name: result.company_name,
        analysis_type: 'gst_itr',
        timestamp: result.timestamp,
        data: result,
      };
      await saveCase(caseData);
      Alert.alert('Saved', 'GST & ITR analysis saved to cases.');
    } catch {
      Alert.alert('Save Failed', 'Could not save case. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleExportPDF = async () => {
    if (!result) return;
    setExporting(true);
    try {
      const blob = await exportPDF('gst_itr', result, result.company_name);
      if (Platform.OS === 'web') {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gst-itr-${result.company_name}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        Alert.alert('Export', 'PDF export is available on web.');
      }
    } catch {
      Alert.alert('Export Failed', 'Could not generate PDF.');
    } finally {
      setExporting(false);
    }
  };

  const fmt = (n: number) => '₹' + Math.abs(n).toLocaleString('en-IN');
  const pct = (n: number) => n.toFixed(1) + '%';

  const scoreColor = (s: number) =>
    s >= 75 ? theme.green : s >= 50 ? theme.yellow : theme.red;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        extraScrollHeight={80}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.brandName}>TAX ANALYTICS</Text>
          <Text style={styles.title}>GST & ITR Analysis</Text>
          <Text style={styles.subtitle}>Compliance assessment & tax health check</Text>
        </View>

        {/* Company Name */}
        <Card style={styles.card}>
          <SectionHeader title="Company Name" color={theme.purple} />
          <InputField
            label="Company / Client Name"
            value={companyName}
            onChangeText={setCompanyName}
            placeholder="Enter company name"
          />
        </Card>

        {/* GSTR-3B Section */}
        <Card style={styles.card}>
          <SectionHeader title="GST — GSTR-3B Details" color={theme.primary} />

          {/* File upload for GSTR */}
          <TouchableOpacity
            style={styles.uploadRow}
            onPress={() => pickFile('gstr')}
            activeOpacity={0.8}
          >
            <View style={[styles.uploadIcon, { backgroundColor: theme.primaryLight }]}>
              <Ionicons name="document-attach-outline" size={20} color={theme.primary} />
            </View>
            <View style={styles.uploadInfo}>
              <Text style={styles.uploadLabel}>Upload GSTR-3B Document</Text>
              <Text style={styles.uploadSub}>
                {gstrFile ? gstrFile.name : 'PDF, Excel, Image'}
              </Text>
            </View>
            {gstrFile && (
              <TouchableOpacity
                onPress={parseGstFile}
                style={[styles.parseBtn, { backgroundColor: theme.primaryLight }]}
                disabled={parsing}
              >
                {parsing ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <Text style={[styles.parseBtnText, { color: theme.primary }]}>Parse</Text>
                )}
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          <InputField
            label="GSTIN"
            value={gstin}
            onChangeText={setGstin}
            placeholder="e.g. 29AAAAA0000A1Z5"
            keyboardType="default"
          />
          <InputField
            label="Total Taxable Turnover (₹)"
            value={totalTaxableTurnover}
            onChangeText={setTotalTaxableTurnover}
            placeholder="Annual GST turnover"
            keyboardType="numeric"
          />
          <InputField
            label="IGST Collected (₹)"
            value={igstCollected}
            onChangeText={setIgstCollected}
            placeholder="0"
            keyboardType="numeric"
          />
          <InputField
            label="CGST Collected (₹)"
            value={cgstCollected}
            onChangeText={setCgstCollected}
            placeholder="0"
            keyboardType="numeric"
          />
          <InputField
            label="SGST / UTGST Collected (₹)"
            value={sgstCollected}
            onChangeText={setSgstCollected}
            placeholder="0"
            keyboardType="numeric"
          />
          <InputField
            label="Total ITC Available (₹)"
            value={totalItcAvailable}
            onChangeText={setTotalItcAvailable}
            placeholder="Input Tax Credit available"
            keyboardType="numeric"
          />
          <InputField
            label="Total ITC Utilized (₹)"
            value={totalItcUtilized}
            onChangeText={setTotalItcUtilized}
            placeholder="Input Tax Credit utilized"
            keyboardType="numeric"
          />
          <InputField
            label="Interest Paid on Late Filing (₹)"
            value={interestPaid}
            onChangeText={setInterestPaid}
            placeholder="0 if no penalty"
            keyboardType="numeric"
          />
        </Card>

        {/* ITR Section */}
        <Card style={styles.card}>
          <SectionHeader title="ITR — Income Tax Return" color={theme.cyan} />

          {/* File upload for ITR */}
          <TouchableOpacity
            style={styles.uploadRow}
            onPress={() => pickFile('itr')}
            activeOpacity={0.8}
          >
            <View style={[styles.uploadIcon, { backgroundColor: `${theme.cyan}18` }]}>
              <Ionicons name="receipt-outline" size={20} color={theme.cyan} />
            </View>
            <View style={styles.uploadInfo}>
              <Text style={styles.uploadLabel}>Upload ITR Document</Text>
              <Text style={styles.uploadSub}>
                {itrFile ? itrFile.name : 'PDF, Excel, Image'}
              </Text>
            </View>
            {itrFile && (
              <TouchableOpacity
                onPress={parseItrFile}
                style={[styles.parseBtn, { backgroundColor: `${theme.cyan}18` }]}
                disabled={parsing}
              >
                {parsing ? (
                  <ActivityIndicator size="small" color={theme.cyan} />
                ) : (
                  <Text style={[styles.parseBtnText, { color: theme.cyan }]}>Parse</Text>
                )}
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          <InputField
            label="Taxable Income (₹)"
            value={taxableIncome}
            onChangeText={setTaxableIncome}
            placeholder="Gross taxable income"
            keyboardType="numeric"
          />
          <InputField
            label="Total Deductions (₹)"
            value={totalDeductions}
            onChangeText={setTotalDeductions}
            placeholder="80C, 80D, etc."
            keyboardType="numeric"
          />
          <InputField
            label="Net Tax Liability (₹)"
            value={netTaxLiability}
            onChangeText={setNetTaxLiability}
            placeholder="Computed tax liability"
            keyboardType="numeric"
          />
          <InputField
            label="Tax Due / Outstanding (₹)"
            value={taxDue}
            onChangeText={setTaxDue}
            placeholder="0 if fully paid"
            keyboardType="numeric"
          />
          <InputField
            label="TDS Deducted (₹)"
            value={tdsDeducted}
            onChangeText={setTdsDeducted}
            placeholder="Tax deducted at source"
            keyboardType="numeric"
          />
          <InputField
            label="Advance Tax Paid (₹)"
            value={advanceTaxPaid}
            onChangeText={setAdvanceTaxPaid}
            placeholder="0"
            keyboardType="numeric"
          />
        </Card>

        {/* Analyze Button */}
        <TouchableOpacity
          style={styles.analyzeButton}
          onPress={handleAnalyze}
          disabled={loading}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[theme.purple, '#6A1B9A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.analyzeGradient}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="shield-checkmark-outline" size={20} color="#fff" />
                <Text style={styles.analyzeButtonText}>Run Tax Compliance Analysis</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Results */}
        {result && (
          <>
            {/* Compliance Score */}
            <Card style={styles.card}>
              <SectionHeader title="Compliance Score" color={theme.purple} />
              <View style={styles.scoreRow}>
                <View style={styles.scoreBig}>
                  <Text style={[styles.scoreNumber, { color: scoreColor(result.tax_compliance_score) }]}>
                    {result.tax_compliance_score}
                  </Text>
                  <Text style={styles.scoreMax}>/100</Text>
                </View>
                <View style={styles.scoreDetails}>
                  <View style={styles.scoreLine}>
                    <Text style={styles.scoreLabel}>Eligibility</Text>
                    <StatusBadge
                      status={result.eligible ? 'Eligible' : 'Not Eligible'}
                      variant={result.eligible ? 'success' : 'error'}
                    />
                  </View>
                  <View style={styles.scoreLine}>
                    <Text style={styles.scoreLabel}>ITC Utilization</Text>
                    <Text style={styles.scoreValue}>{pct(result.itc_utilization_rate)}</Text>
                  </View>
                  <View style={styles.scoreLine}>
                    <Text style={styles.scoreLabel}>Effective Tax Rate</Text>
                    <Text style={styles.scoreValue}>{pct(result.effective_tax_rate)}</Text>
                  </View>
                </View>
              </View>
            </Card>

            {/* GST Metrics */}
            <Card style={styles.card}>
              <SectionHeader title="GST Metrics" color={theme.primary} />
              <View style={styles.metricsGrid}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Total GST Collected</Text>
                  <Text style={[styles.metricValue, { color: theme.primary }]}>
                    {fmt(result.total_gst_collected)}
                  </Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Avg Monthly Turnover</Text>
                  <Text style={[styles.metricValue, { color: theme.cyan }]}>
                    {fmt(result.gst_turnover_monthly)}
                  </Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>ITC Utilization</Text>
                  <Text style={[styles.metricValue, { color: result.itc_utilization_rate >= 75 ? theme.green : theme.yellow }]}>
                    {pct(result.itc_utilization_rate)}
                  </Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Interest Penalty</Text>
                  <Text style={[styles.metricValue, { color: (result.input_data.gst.interest_paid || 0) > 0 ? theme.red : theme.green }]}>
                    {fmt(result.input_data.gst.interest_paid || 0)}
                  </Text>
                </View>
              </View>
            </Card>

            {/* ITR Metrics */}
            <Card style={styles.card}>
              <SectionHeader title="ITR Metrics" color={theme.cyan} />
              <View style={styles.metricsGrid}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Taxable Income</Text>
                  <Text style={[styles.metricValue, { color: theme.primary }]}>
                    {fmt(result.input_data.itr.taxable_income)}
                  </Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Net Tax Liability</Text>
                  <Text style={[styles.metricValue, { color: theme.cyan }]}>
                    {fmt(result.input_data.itr.net_tax_liability)}
                  </Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Tax Due</Text>
                  <Text style={[styles.metricValue, { color: (result.input_data.itr.tax_due || 0) > 0 ? theme.red : theme.green }]}>
                    {fmt(result.input_data.itr.tax_due || 0)}
                  </Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Effective Tax Rate</Text>
                  <Text style={[styles.metricValue, { color: theme.purple }]}>
                    {pct(result.effective_tax_rate)}
                  </Text>
                </View>
              </View>
            </Card>

            {/* Assessment */}
            <Card style={styles.card}>
              <SectionHeader title="Assessment" color={theme.primary} />
              {result.assessment.map((item, i) => (
                <View key={i} style={styles.assessmentRow}>
                  <Ionicons name="information-circle-outline" size={16} color={theme.primary} />
                  <Text style={styles.assessmentText}>{item}</Text>
                </View>
              ))}
            </Card>

            {/* Strengths */}
            {result.strengths.length > 0 && (
              <Card style={styles.card}>
                <SectionHeader title="Strengths" color={theme.green} />
                <InsightCard items={result.strengths} type="strength" />
              </Card>
            )}

            {/* Concerns */}
            {result.concerns.length > 0 && (
              <Card style={styles.card}>
                <SectionHeader title="Concerns" color={theme.red} />
                <InsightCard items={result.concerns} type="risk" />
              </Card>
            )}

            {/* Recommendation */}
            <SummarySection
              title="Recommendation"
              summary={result.recommendation}
              eligibilityStatus={result.eligible ? 'Eligible' : 'Not Eligible'}
            />

            {/* Action buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { borderColor: theme.purple }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={theme.purple} />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={16} color={theme.purple} />
                    <Text style={[styles.actionBtnText, { color: theme.purple }]}>Save Case</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { borderColor: theme.cyan }]}
                onPress={handleExportPDF}
                disabled={exporting}
              >
                {exporting ? (
                  <ActivityIndicator size="small" color={theme.cyan} />
                ) : (
                  <>
                    <Ionicons name="download-outline" size={16} color={theme.cyan} />
                    <Text style={[styles.actionBtnText, { color: theme.cyan }]}>Export PDF</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
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
    color: theme.purple,
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
  card: {
    marginBottom: 16,
  },
  uploadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.inputBackground,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    borderStyle: 'dashed',
  },
  uploadIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  uploadInfo: {
    flex: 1,
  },
  uploadLabel: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '600',
  },
  uploadSub: {
    color: theme.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  parseBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  parseBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  analyzeButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 20,
  },
  analyzeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  scoreBig: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: '800',
  },
  scoreMax: {
    color: theme.textMuted,
    fontSize: 18,
    fontWeight: '600',
  },
  scoreDetails: {
    flex: 1,
    gap: 8,
  },
  scoreLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreLabel: {
    color: theme.subText,
    fontSize: 13,
  },
  scoreValue: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricItem: {
    width: '47%',
    backgroundColor: theme.inputBackground,
    borderRadius: 10,
    padding: 12,
  },
  metricLabel: {
    color: theme.textMuted,
    fontSize: 11,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  assessmentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: theme.cardBorder,
  },
  assessmentText: {
    color: theme.subText,
    fontSize: 13,
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
    marginBottom: 20,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    backgroundColor: theme.card,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
