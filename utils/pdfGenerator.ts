/**
 * pdfGenerator.ts
 * Cross-platform PDF export utility.
 * - Mobile (iOS / Android): uses expo-print to render HTML → PDF file,
 *   then expo-sharing to share / save the file.
 * - Web: falls back to window.print() (or blob download for programmatic use).
 */

import { Platform } from 'react-native';
import { FinancialMetrics } from './bankParser';
import { BankingResult } from '../src/types';

// ---------------------------------------------------------------------------
// HTML template
// Build a simple, self-contained HTML page summarising the banking metrics.
// ---------------------------------------------------------------------------
function buildHTML(result: BankingResult, metrics?: FinancialMetrics): string {
  const now = new Date().toLocaleString('en-IN');
  const companyName = result.company_name || 'Company';

  const formatCurrency = (n: number) =>
    `₹${Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  const riskColor =
    (metrics?.risk ?? result.risk_level) === 'HIGH' || result.risk_level === 'High'
      ? '#e53935'
      : (metrics?.risk ?? result.risk_level) === 'MEDIUM' || result.risk_level === 'Medium'
      ? '#fb8c00'
      : '#43a047';

  const insightRows = (result.insights ?? [])
    .map(i => `<li>${i}</li>`)
    .join('');
  const strengthRows = (result.strengths ?? [])
    .map(s => `<li style="color:#2e7d32">${s}</li>`)
    .join('');
  const concernRows = (result.concerns ?? [])
    .map(c => `<li style="color:#c62828">${c}</li>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Banking Report – ${companyName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #222; padding: 32px; }
    h1 { font-size: 22px; color: #1565c0; margin-bottom: 4px; }
    .subtitle { color: #555; font-size: 12px; margin-bottom: 24px; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 14px; font-weight: bold; color: #1565c0; border-bottom: 1px solid #90caf9; padding-bottom: 4px; margin-bottom: 10px; }
    .kpi-grid { display: flex; flex-wrap: wrap; gap: 12px; }
    .kpi-box { flex: 1 1 160px; background: #f5f5f5; border-radius: 8px; padding: 12px; }
    .kpi-label { font-size: 11px; color: #777; text-transform: uppercase; letter-spacing: .5px; }
    .kpi-value { font-size: 18px; font-weight: bold; color: #1565c0; margin-top: 4px; }
    .risk-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; color: #fff; background: ${riskColor}; }
    .score-circle { display: inline-block; width: 64px; height: 64px; border-radius: 50%; background: #e3f2fd; border: 4px solid #1565c0; text-align: center; line-height: 56px; font-size: 18px; font-weight: bold; color: #1565c0; }
    ul { padding-left: 18px; }
    li { margin-bottom: 4px; }
    .recommendation { background: #e8f5e9; border-left: 4px solid #43a047; padding: 12px 16px; border-radius: 4px; }
    .footer { margin-top: 32px; font-size: 11px; color: #aaa; text-align: center; }
  </style>
</head>
<body>
  <h1>Banking Analysis Report</h1>
  <div class="subtitle">${companyName} &nbsp;|&nbsp; Generated: ${now}</div>

  <!-- Health Score -->
  <div class="section">
    <div class="section-title">Banking Health</div>
    <div class="kpi-grid">
      <div class="kpi-box">
        <div class="kpi-label">Health Score</div>
        <div class="kpi-value">${result.health_score ?? '-'} / 100</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">Credit Score</div>
        <div class="kpi-value">${result.credit_score ?? '-'}</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">Grade</div>
        <div class="kpi-value">${result.grade ?? '-'}</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">Risk Level</div>
        <div class="risk-badge">${result.risk_level ?? '-'}</div>
      </div>
    </div>
  </div>

  <!-- Financial Metrics -->
  <div class="section">
    <div class="section-title">Financial Metrics</div>
    <div class="kpi-grid">
      <div class="kpi-box">
        <div class="kpi-label">Monthly Inflow</div>
        <div class="kpi-value">${formatCurrency(result.monthly_inflow ?? 0)}</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">Monthly Outflow</div>
        <div class="kpi-value">${formatCurrency(result.monthly_outflow ?? 0)}</div>
      </div>
      ${metrics ? `
      <div class="kpi-box">
        <div class="kpi-label">Total Revenue</div>
        <div class="kpi-value">${formatCurrency(metrics.revenue)}</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">Total Expenses</div>
        <div class="kpi-value">${formatCurrency(metrics.expenses)}</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">EMI Obligations</div>
        <div class="kpi-value">${formatCurrency(metrics.emi)}</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">Net Cash Flow</div>
        <div class="kpi-value" style="color:${metrics.cashFlow >= 0 ? '#2e7d32' : '#c62828'}">${formatCurrency(metrics.cashFlow)}</div>
      </div>
      ` : ''}
    </div>
  </div>

  <!-- Insights -->
  ${insightRows ? `
  <div class="section">
    <div class="section-title">Key Insights</div>
    <ul>${insightRows}</ul>
  </div>` : ''}

  <!-- Strengths & Concerns -->
  ${strengthRows || concernRows ? `
  <div class="section">
    <div class="section-title">Strengths &amp; Concerns</div>
    <ul>${strengthRows}${concernRows}</ul>
  </div>` : ''}

  <!-- Recommendation -->
  ${result.recommendation ? `
  <div class="section">
    <div class="section-title">Credit Officer Recommendation</div>
    <div class="recommendation">${result.recommendation}</div>
  </div>` : ''}

  <div class="footer">This report is auto-generated and for internal use only.</div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// generatePDF
// Main export function — platform-aware.
// ---------------------------------------------------------------------------
export async function generatePDF(
  result: BankingResult,
  metrics?: FinancialMetrics
): Promise<void> {
  const html = buildHTML(result, metrics);

  if (Platform.OS === 'web') {
    // Web fallback: open a print dialog via a hidden iframe
    await generatePDFWeb(html, result.company_name);
  } else {
    // Mobile: expo-print → file, expo-sharing → share sheet
    await generatePDFMobile(html, result.company_name);
  }
}

// ---------------------------------------------------------------------------
// generatePDFMobile
// Uses expo-print to generate a local PDF file, then expo-sharing to share it.
// ---------------------------------------------------------------------------
async function generatePDFMobile(html: string, companyName: string): Promise<void> {
  // Dynamic import so the web bundle doesn't include native-only modules
  const Print   = await import('expo-print');
  const Sharing = await import('expo-sharing');

  const { uri } = await Print.printToFileAsync({ html });
  const fileName = `${companyName.replace(/\s+/g, '_')}_Banking_Report.pdf`;

  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Share ${fileName}`,
      UTI: 'com.adobe.pdf',
    });
  } else {
    // Sharing not available (e.g. simulator without share sheet) — just print
    await Print.printAsync({ uri });
  }
}

// ---------------------------------------------------------------------------
// generatePDFWeb
// Web fallback: injects an invisible iframe with the report HTML and triggers
// window.print() so the browser's native print/save-as-PDF dialog opens.
// ---------------------------------------------------------------------------
async function generatePDFWeb(html: string, companyName: string): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.top = '-9999px';
  iframe.style.left = '-9999px';
  iframe.style.width = '0';
  iframe.style.height = '0';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    document.body.removeChild(iframe);
    return;
  }

  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close();

  // Wait a tick for the iframe to finish rendering, then print
  await new Promise<void>(resolve => setTimeout(resolve, 300));
  iframe.contentWindow?.focus();
  iframe.contentWindow?.print();

  // Clean up after a short delay to allow the print dialog to open
  setTimeout(() => {
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
  }, 2000);
}
