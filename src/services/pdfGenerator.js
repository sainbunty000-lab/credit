import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const escapeHtml = (str) => {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const formatCurrency = (value) => {
  if (value == null || isNaN(value)) return '—';
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `₹${(value / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `₹${(value / 1_000).toFixed(0)}K`;
  return `₹${value}`;
};

const formatPercent = (value) => {
  if (value == null || isNaN(value)) return '—';
  return `${value.toFixed(2)}%`;
};

const buildBarChart = (values, labels, color = '#4CAF50') => {
  if (!values || values.length === 0) return '<p style="color:#9CB49C;font-style:italic;">No chart data available</p>';
  const maxVal = Math.max(...values.map(Math.abs), 1);
  const bars = values
    .map((v, i) => {
      const pct = Math.round((Math.abs(v) / maxVal) * 100);
      const barColor = v < 0 ? '#E53935' : color;
      return `
        <div style="display:flex;align-items:center;margin-bottom:6px;">
          <span style="width:40px;font-size:10px;color:#5A7A5A;text-align:right;margin-right:8px;">${labels[i] || ''}</span>
          <div style="flex:1;background:#E2EDE2;border-radius:4px;height:16px;position:relative;">
            <div style="width:${pct}%;background:${barColor};border-radius:4px;height:16px;"></div>
          </div>
          <span style="width:70px;font-size:10px;color:#1A2E1A;text-align:right;margin-left:8px;">${formatCurrency(v)}</span>
        </div>`;
    })
    .join('');
  return `<div style="margin-top:8px;">${bars}</div>`;
};

const buildRiskBadge = (text) =>
  `<span style="display:inline-block;background:#FFF3E0;border:1px solid #FB8C00;border-radius:4px;padding:2px 8px;font-size:11px;color:#E65100;margin:2px;">⚠ ${escapeHtml(text)}</span>`;

const buildBullet = (text) =>
  `<li style="margin-bottom:4px;color:#1A2E1A;font-size:13px;">${escapeHtml(text)}</li>`;

/**
 * Generate a financial analytics PDF report and open the share sheet.
 *
 * @param {Object} data
 * @param {Object|null} data.wcResult     - WorkingCapitalResult
 * @param {Object|null} data.bankingResult - BankingResult
 * @param {Object|null} data.trendResult  - MultiYearResult
 * @param {string}      [data.companyName]
 */
export const generatePDF = async (data = {}) => {
  const { wcResult, bankingResult, trendResult, companyName } = data;
  const company = companyName || wcResult?.company_name || bankingResult?.company_name || trendResult?.company_name || 'N/A';
  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  // ── Key Metrics ──────────────────────────────────────────────────────────────
  const workingCapital = wcResult?.net_working_capital ?? null;
  const currentRatio = wcResult?.current_ratio ?? null;
  const netMargin = wcResult?.net_margin ?? null;
  const quickRatio = wcResult?.quick_ratio ?? null;
  const debtorDays = wcResult?.debtor_days ?? null;
  const wcLimit = wcResult?.wc_limit ?? null;
  const eligible = wcResult?.eligible ?? null;

  const metricsRows = [
    ['Working Capital', formatCurrency(workingCapital)],
    ['Current Ratio', currentRatio != null ? currentRatio.toFixed(2) : '—'],
    ['Quick Ratio', quickRatio != null ? quickRatio.toFixed(2) : '—'],
    ['Net Profit Margin', formatPercent(netMargin)],
    ['Debtor Days', debtorDays != null ? `${Math.round(debtorDays)} days` : '—'],
    ['WC Limit', formatCurrency(wcLimit)],
    ['Eligibility', eligible != null ? (eligible ? '✓ Eligible' : '✗ Not Eligible') : '—'],
  ].map(([label, value]) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #E2EDE2;color:#5A7A5A;font-size:13px;">${label}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #E2EDE2;color:#1A2E1A;font-size:13px;font-weight:600;text-align:right;">${value}</td>
    </tr>`).join('');

  // ── Charts (text-based bars) ─────────────────────────────────────────────────
  let wcTrendChart = '<p style="color:#9CB49C;font-style:italic;">No Working Capital trend data</p>';
  if (trendResult?.trends?.net_working_capital && trendResult?.years) {
    wcTrendChart = buildBarChart(trendResult.trends.net_working_capital, trendResult.years);
  }

  let revenueTrendChart = '<p style="color:#9CB49C;font-style:italic;">No Revenue trend data</p>';
  if (trendResult?.trends?.revenue && trendResult?.years) {
    revenueTrendChart = buildBarChart(trendResult.trends.revenue, trendResult.years, '#00ACC1');
  }

  let cashFlowChart = '<p style="color:#9CB49C;font-style:italic;">No Cash Flow data</p>';
  if (bankingResult?.cash_flow_trend && bankingResult.cash_flow_trend.length > 0) {
    const months = bankingResult.cash_flow_trend.map((d) => d.month);
    const inflows = bankingResult.cash_flow_trend.map((d) => d.inflow);
    cashFlowChart = buildBarChart(inflows, months, '#43A047');
  }

  // ── Banking Analysis ─────────────────────────────────────────────────────────
  const bankingRows = bankingResult
    ? [
        ['Avg Balance', formatCurrency(bankingResult.input_data?.average_balance)],
        ['Monthly Inflow', formatCurrency(bankingResult.monthly_inflow)],
        ['Monthly Outflow', formatCurrency(bankingResult.monthly_outflow)],
        ['EMI / ECS Obligations', formatCurrency(bankingResult.input_data?.ecs_emi_payments)],
        ['Cheque Bounces', bankingResult.input_data?.cheque_bounces ?? '—'],
        ['Credit Score', bankingResult.credit_score ?? '—'],
        ['Grade', bankingResult.grade ?? '—'],
        ['Risk Level', bankingResult.risk_level ?? '—'],
      ]
        .map(([label, value]) => `
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #E2EDE2;color:#5A7A5A;font-size:13px;">${label}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #E2EDE2;color:#1A2E1A;font-size:13px;font-weight:600;text-align:right;">${value}</td>
          </tr>`)
        .join('')
    : '<tr><td colspan="2" style="padding:12px;color:#9CB49C;font-style:italic;">No banking data available</td></tr>';

  const bankingRiskFlags = bankingResult?.risks?.length
    ? bankingResult.risks.map(buildRiskBadge).join(' ')
    : '<span style="color:#9CB49C;font-size:12px;">No risk flags</span>';

  // ── AI Summary ───────────────────────────────────────────────────────────────
  const aiSummary = bankingResult?.ai_summary || trendResult?.ai_analysis?.summary || wcResult?.recommendation || null;
  const eligibilityStatus = bankingResult?.eligibility_status || wcResult?.assessment?.[0] || null;
  const aiInsights = [
    ...(bankingResult?.insights || []),
    ...(trendResult?.insights || []),
    ...(wcResult?.assessment || []),
  ].slice(0, 8);

  const eligibilityColor = eligibilityStatus?.toLowerCase().includes('eligible') ? '#43A047' : '#E53935';
  const eligibilityBg = eligibilityStatus?.toLowerCase().includes('eligible') ? '#E8F5E9' : '#FFEBEE';

  // ── Risk Indicators ──────────────────────────────────────────────────────────
  const riskIndicators = [];
  if (bankingResult?.input_data?.ecs_emi_payments && bankingResult?.input_data?.average_balance > 0) {
    const emiRatio = bankingResult.input_data.ecs_emi_payments / bankingResult.input_data.average_balance;
    if (emiRatio > 0.4) riskIndicators.push('High EMI burden (EMI > 40% of avg balance)');
  }
  if (currentRatio != null && currentRatio < 1.2) riskIndicators.push('Low liquidity (Current Ratio < 1.2)');
  if (bankingResult?.monthly_inflow != null && bankingResult?.monthly_outflow != null) {
    if (bankingResult.monthly_outflow > bankingResult.monthly_inflow) riskIndicators.push('Negative cash flow (Outflow > Inflow)');
  }
  if (bankingResult?.input_data?.cheque_bounces > 2) riskIndicators.push(`High cheque bounces (${bankingResult.input_data.cheque_bounces})`);
  if (wcResult?.net_working_capital != null && wcResult.net_working_capital < 0) riskIndicators.push('Negative working capital');
  if (trendResult?.ai_analysis?.risks) riskIndicators.push(...trendResult.ai_analysis.risks.slice(0, 3));
  if (bankingResult?.concerns) riskIndicators.push(...bankingResult.concerns.slice(0, 3));

  const riskSection = riskIndicators.length
    ? riskIndicators.map(buildRiskBadge).join('<br/>')
    : '<span style="color:#43A047;font-size:13px;">✓ No significant risk indicators detected</span>';

  // ── HTML Template ─────────────────────────────────────────────────────────────
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, Helvetica, Arial, sans-serif; background: #F4F6F4; color: #1A2E1A; }
    .page { max-width: 700px; margin: 0 auto; background: #fff; padding: 32px; }
    h1 { font-size: 22px; font-weight: 800; color: #1A2E1A; }
    h2 { font-size: 15px; font-weight: 700; color: #4CAF50; margin: 24px 0 10px; border-left: 4px solid #4CAF50; padding-left: 10px; }
    .header { border-bottom: 2px solid #4CAF50; padding-bottom: 16px; margin-bottom: 8px; }
    .header-logo-row { display: flex; align-items: center; gap: 12px; }
    .logo-circle { width: 48px; height: 48px; border-radius: 50%; background: #4CAF50; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800; letter-spacing: 1px; flex-shrink: 0; }
    .header-sub { color: #5A7A5A; font-size: 12px; margin-top: 4px; }
    .brand { font-size: 10px; font-weight: 700; letter-spacing: 2px; color: #4CAF50; margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
    th { background: #E8F5E9; color: #388E3C; font-size: 12px; padding: 8px 12px; text-align: left; }
    .eligibility-badge { display: inline-block; padding: 6px 16px; border-radius: 6px; font-weight: 700; font-size: 14px; margin-bottom: 12px; }
    .summary-text { font-size: 13px; line-height: 1.6; color: #1A2E1A; margin-bottom: 12px; }
    ul { padding-left: 18px; }
    .footer { margin-top: 32px; border-top: 1px solid #E2EDE2; padding-top: 12px; color: #9CB49C; font-size: 11px; text-align: center; }
    .section-card { background: #FAFFFE; border: 1px solid #E2EDE2; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
  </style>
</head>
<body>
  <div class="page">

    <!-- HEADER -->
    <div class="header">
      <div class="header-logo-row">
        <div class="logo-circle">DE</div>
        <div>
          <div class="brand">DHANUSH ENTERPRISES</div>
          <h1>Financial Analytics Report</h1>
          <div class="header-sub">
            <strong>Company:</strong> ${escapeHtml(company)} &nbsp;|&nbsp; <strong>Date:</strong> ${today}
          </div>
        </div>
      </div>
    </div>

    <!-- SECTION 1: KEY METRICS -->
    <h2>📊 Section 1: Key Metrics</h2>
    <div class="section-card">
      <table>
        <thead><tr><th>Metric</th><th style="text-align:right;">Value</th></tr></thead>
        <tbody>${metricsRows}</tbody>
      </table>
    </div>

    <!-- SECTION 2: CHARTS -->
    <h2>📈 Section 2: Trend Charts</h2>
    <div class="section-card">
      <p style="font-weight:700;font-size:13px;margin-bottom:8px;color:#388E3C;">Working Capital Trend</p>
      ${wcTrendChart}
      <p style="font-weight:700;font-size:13px;margin:16px 0 8px;color:#00ACC1;">Revenue Trend</p>
      ${revenueTrendChart}
      <p style="font-weight:700;font-size:13px;margin:16px 0 8px;color:#43A047;">Cash Flow (Banking Inflow)</p>
      ${cashFlowChart}
    </div>

    <!-- SECTION 3: BANKING ANALYSIS -->
    <h2>🏦 Section 3: Banking Analysis</h2>
    <div class="section-card">
      <table>
        <thead><tr><th>Indicator</th><th style="text-align:right;">Value</th></tr></thead>
        <tbody>${bankingRows}</tbody>
      </table>
      <p style="font-weight:700;font-size:13px;margin:12px 0 6px;color:#E65100;">Risk Flags</p>
      <div>${bankingRiskFlags}</div>
    </div>

    <!-- SECTION 4: AI SUMMARY -->
    <h2>📄 Section 4: AI Summary</h2>
    <div class="section-card">
      ${eligibilityStatus
        ? `<div class="eligibility-badge" style="background:${eligibilityBg};color:${eligibilityColor};border:1px solid ${eligibilityColor};">${escapeHtml(eligibilityStatus)}</div>`
        : ''}
      <p class="summary-text">${aiSummary ? escapeHtml(aiSummary) : 'Run an analysis to generate an AI-powered summary.'}</p>
      ${aiInsights.length
        ? `<p style="font-weight:700;font-size:13px;margin-bottom:6px;color:#388E3C;">Key Insights</p>
           <ul>${aiInsights.map(buildBullet).join('')}</ul>`
        : ''}
    </div>

    <!-- SECTION 5: RISK INDICATORS -->
    <h2>⚠️ Section 5: Risk Indicators</h2>
    <div class="section-card">
      ${riskSection}
    </div>

    <div class="footer">
      Dhanush Enterprises – Financial Analytics &nbsp;·&nbsp; ${today} &nbsp;·&nbsp; Confidential
    </div>
  </div>
</body>
</html>`;

  let uri;
  try {
    ({ uri } = await Print.printToFileAsync({ html, base64: false }));
  } catch (err) {
    throw new Error(`Failed to generate PDF file: ${err?.message || err}`);
  }

  try {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Financial Analytics Report',
      UTI: 'com.adobe.pdf',
    });
  } catch (err) {
    throw new Error(`Failed to share PDF: ${err?.message || err}`);
  }

  return uri;
};
