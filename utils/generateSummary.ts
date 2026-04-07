/**
 * generateSummary.ts
 * Generates rich, human-readable business financial summaries
 * for use across WC, GST, Trend, and Dashboard screens.
 */

export interface SummaryMetrics {
  revenue: number;
  expenses: number;
  netProfit?: number;
  emi?: number;
  cashFlow?: number;
  eligibility: number;
  risk: 'Low' | 'Medium' | 'High';
  currentRatio?: number;
  grossMargin?: number;
  netMargin?: number;
  growthRate?: number;
  cagr?: number;
  years?: number;
  complianceScore?: number;
  itcUtilization?: number;
  type: 'wc' | 'gst' | 'trend' | 'general';
}

const fmt = (n: number): string => {
  if (Math.abs(n) >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)} Cr`;
  if (Math.abs(n) >= 100_000) return `₹${(n / 100_000).toFixed(1)} L`;
  if (Math.abs(n) >= 1_000) return `₹${(n / 1_000).toFixed(0)}K`;
  return `₹${n.toFixed(0)}`;
};

const pct = (n: number): string => `${n.toFixed(1)}%`;

function revenueStrength(revenue: number): string {
  if (revenue >= 10_000_000) return 'strong and substantial';
  if (revenue >= 1_000_000) return 'moderate';
  if (revenue >= 100_000) return 'modest';
  return 'limited';
}

function expenseBurden(ratio: number): string {
  if (ratio >= 0.9) return 'extremely high — critically compressing margins';
  if (ratio >= 0.75) return 'high, significantly reducing profitability';
  if (ratio >= 0.5) return 'moderate, leaving reasonable headroom';
  return 'well-controlled, supporting healthy margins';
}

function riskDescription(risk: string): string {
  if (risk === 'High') return 'elevated financial risk due to stressed metrics';
  if (risk === 'Medium') return 'moderate risk with some areas needing attention';
  return 'low risk, reflecting stable financial health';
}

export function generateSummary(metrics: SummaryMetrics): string {
  const {
    revenue, expenses, netProfit, emi, cashFlow,
    eligibility, risk, currentRatio, grossMargin, netMargin,
    growthRate, cagr, years, complianceScore, itcUtilization, type,
  } = metrics;

  const expenseRatio = revenue > 0 ? expenses / revenue : 0;
  const profitability = netProfit != null ? netProfit : revenue - expenses;
  const isProfitable = profitability > 0;
  const isEligible = eligibility > 0;

  const parts: string[] = [];

  if (type === 'wc') {
    parts.push(
      `This business reports ${revenueStrength(revenue)} revenue of ${fmt(revenue)}, ` +
      `with total expenses of ${fmt(expenses)} — an expense ratio of ${pct(expenseRatio * 100)}, which is ${expenseBurden(expenseRatio)}.`
    );

    if (netMargin != null) {
      parts.push(
        `The net margin stands at ${pct(netMargin)}, indicating ${netMargin >= 10 ? 'healthy profitability' : netMargin >= 5 ? 'thin but positive returns' : 'very tight margins that need attention'}.`
      );
    }

    if (currentRatio != null) {
      parts.push(
        `The current ratio of ${currentRatio.toFixed(2)}x ${currentRatio >= 1.33 ? 'meets the standard lending threshold, signalling adequate short-term liquidity' : 'falls below the recommended 1.33x, indicating potential liquidity strain'}.`
      );
    }

    if (emi != null && emi > 0) {
      const emiImpact = revenue > 0 ? (emi / revenue) * 100 : 0;
      parts.push(
        `EMI obligations of ${fmt(emi)} (${pct(emiImpact)} of revenue) ${emiImpact > 30 ? 'are significantly impacting net cash flow and working capital availability' : 'remain manageable relative to revenue'}.`
      );
    }

    if (cashFlow != null) {
      parts.push(
        `Cash flow is ${cashFlow > 0 ? 'positive at ' + fmt(cashFlow) + ', supporting operational continuity' : 'negative at ' + fmt(Math.abs(cashFlow)) + ', posing a liquidity concern'}.`
      );
    }

    parts.push(
      `Based on this analysis, the working capital limit is estimated at ${fmt(eligibility)}. ` +
      `The overall risk profile reflects ${riskDescription(risk)}.`
    );

    if (isEligible) {
      parts.push(
        `The business is eligible for working capital financing. To optimise the limit, focus on improving debtor collection cycles and maintaining consistent revenue inflows.`
      );
    } else {
      parts.push(
        `Currently, eligibility for working capital financing is limited. Key improvement areas include reducing expense burden, managing debt repayments, and building a stronger liquidity cushion.`
      );
    }

  } else if (type === 'gst') {
    parts.push(
      `GST filings indicate a business with an annualised turnover of ${fmt(revenue)}, reflecting a ${revenueStrength(revenue)} revenue base.`
    );

    if (complianceScore != null) {
      parts.push(
        `The tax compliance score of ${complianceScore}/100 reflects ${complianceScore >= 75 ? 'strong regulatory adherence and reliable filing history' : complianceScore >= 50 ? 'acceptable compliance with room for improvement' : 'compliance gaps that may increase lender scrutiny'}.`
      );
    }

    if (itcUtilization != null) {
      parts.push(
        `ITC utilization stands at ${pct(itcUtilization)}, indicating ${itcUtilization >= 80 ? 'efficient input tax credit management' : itcUtilization >= 60 ? 'moderate ITC efficiency' : 'underutilization of available input credits, which may signal process gaps'}.`
      );
    }

    if (grossMargin != null) {
      parts.push(
        `The gross margin of ${pct(grossMargin)} ${grossMargin >= 30 ? 'demonstrates healthy value-add in the business model' : 'suggests a cost-intensive operation with limited buffer'}.`
      );
    }

    parts.push(
      `GST surrogate analysis estimates a loan eligibility of ${fmt(eligibility)}, with ${riskDescription(risk)}.`
    );

    if (isEligible) {
      parts.push(
        `The business qualifies for GST surrogate-based lending. Maintaining consistent filing records and growing taxable turnover will further strengthen loan capacity.`
      );
    } else {
      parts.push(
        `Eligibility under GST surrogate norms is currently constrained. Consistent GST filing, higher declared turnover, and improved compliance scores would significantly enhance borrowing capacity.`
      );
    }

  } else if (type === 'trend') {
    const yearLabel = years != null ? `over ${years} years` : 'across the analysis period';

    parts.push(
      `Multi-year financial analysis ${yearLabel} reveals a business with ${revenueStrength(revenue)} peak revenue of ${fmt(revenue)}.`
    );

    if (growthRate != null) {
      const direction = growthRate >= 0 ? 'growth' : 'contraction';
      parts.push(
        `Revenue shows a ${direction} trend of ${growthRate >= 0 ? '+' : ''}${pct(growthRate)} year-on-year, indicating ${Math.abs(growthRate) >= 15 ? 'significant momentum' : Math.abs(growthRate) >= 5 ? 'steady movement' : 'relative stability'}.`
      );
    }

    if (cagr != null) {
      parts.push(
        `The Compound Annual Growth Rate (CAGR) of ${cagr >= 0 ? '+' : ''}${pct(cagr)} ${cagr >= 20 ? 'demonstrates exceptional compounding growth, reflective of a high-performing business' : cagr >= 10 ? 'reflects healthy long-term expansion' : cagr >= 0 ? 'suggests modest but positive trajectory' : 'indicates a declining business that requires strategic realignment'}.`
      );
    }

    if (netMargin != null) {
      parts.push(
        `Profitability margins are ${netMargin >= 15 ? 'strong, well above industry norms' : netMargin >= 7 ? 'acceptable' : 'thin, requiring cost optimisation'}, with a net margin of ${pct(netMargin)}.`
      );
    }

    parts.push(
      `The overall financial trajectory reflects ${riskDescription(risk)}. Growth eligibility is assessed at ${fmt(eligibility)}.`
    );

    if (isEligible) {
      parts.push(
        `The multi-year trend supports lending eligibility. Sustaining consistent growth and margin improvement will unlock higher credit limits over time.`
      );
    } else {
      parts.push(
        `Despite some positive indicators, the multi-year trajectory does not yet meet full eligibility criteria. Consistent revenue growth, margin stabilisation, and reduced volatility are recommended to improve standing.`
      );
    }

  } else {
    parts.push(
      `Financial overview: Revenue of ${fmt(revenue)} against expenses of ${fmt(expenses)} (ratio: ${pct(expenseRatio * 100)}). ` +
      `The business demonstrates ${isProfitable ? 'positive profitability' : 'a loss position'} with ${riskDescription(risk)}.`
    );

    parts.push(
      `Estimated eligible credit capacity: ${fmt(eligibility)}. ` +
      `${isEligible ? 'Creditworthiness indicators are favourable.' : 'Further financial strengthening is recommended to improve credit eligibility.'}`
    );
  }

  return parts.join(' ');
}
