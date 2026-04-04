export interface BalanceSheetValues {
  current_assets: number;
  current_liabilities: number;
  inventory: number;
  debtors: number;
  creditors: number;
  cash_bank_balance: number;
}

export interface ProfitLossValues {
  revenue: number;
  cogs: number;
  purchases: number;
  operating_expenses: number;
  net_profit: number;
}

export interface WorkingCapitalInput {
  company_name: string;
  balance_sheet: BalanceSheetValues;
  profit_loss: ProfitLossValues;
  projected_turnover: number;
}

export interface WorkingCapitalResult {
  id: string;
  company_name: string;
  timestamp: string;
  input_data: {
    balance_sheet: BalanceSheetValues;
    profit_loss: ProfitLossValues;
    projected_turnover: number;
  };
  current_ratio: number;
  quick_ratio: number;
  debtor_days: number;
  creditor_days: number;
  inventory_turnover: number;
  wc_cycle: number;
  gross_margin: number;
  net_margin: number;
  net_working_capital: number;
  mpbf_method_1: number;
  mpbf_method_2: number;
  turnover_method: number;
  eligible: boolean;
  wc_limit: number;
  score: number;
  assessment: string[];
  recommendation: string;
  analysis_type: string;
}

export interface BankingInput {
  company_name: string;
  total_credits: number;
  total_debits: number;
  average_balance: number;
  minimum_balance: number;
  opening_balance: number;
  closing_balance: number;
  cash_deposits: number;
  cheque_bounces: number;
  loan_repayments: number;
  overdraft_usage: number;
  ecs_emi_payments: number;
  num_transactions: number;
  sanctioned_limit: number;
  utilized_limit: number;
}

export interface BankingResult {
  id: string;
  company_name: string;
  timestamp: string;
  input_data: BankingInput;
  credit_score: number;
  grade: string;
  risk_level: string;
  liquidity_score: number;
  cash_flow_score: number;
  credit_score_component: number;
  repayment_score: number;
  stability_score: number;
  working_capital_status: string;
  liquidity_status: string;
  cash_flow_status: string;
  creditworthiness_status: string;
  repayment_status: string;
  stability_status: string;
  behavior_status: string;
  strengths: string[];
  concerns: string[];
  recommendation: string;
  // Perfios-style enhanced fields
  health_score: number;
  health_status: string;
  monthly_inflow: number;
  monthly_outflow: number;
  cash_flow_trend: Array<{ month: string; inflow: number; outflow: number }>;
  risks: string[];
  insights: string[];
  ai_summary: string;
  eligibility_status: string;
  analysis_type: string;
}

export interface YearData {
  year: string;
  balance_sheet: BalanceSheetValues;
  profit_loss: ProfitLossValues;
}

export interface MultiYearInput {
  company_name: string;
  years_data: YearData[];
}

export interface MultiYearResult {
  id: string;
  company_name: string;
  timestamp: string;
  input_data: { years_data: YearData[] };
  years: string[];
  trends: {
    revenue: number[];
    net_profit: number[];
    current_ratio: number[];
    net_working_capital: number[];
    gross_margin: number[];
    net_margin: number[];
  };
  insights: string[];
  recommendation: string;
  analysis_type: string;
  growth_trends?: {
    yoy_growth: Record<string, (number | null)[]>;
    cagr: Record<string, number | null>;
    patterns: Record<string, string>;
  };
  patterns?: Record<string, string>;
  ai_analysis?: FinancialAnalysis;
}

export interface FinancialAnalysis {
  eligibility_status: string;
  summary: string;
  insights: string[];
  strengths: string[];
  risks: string[];
  recommendations: string[];
  confidence?: number;
}

export interface FinancialAnalysisResult {
  id: string;
  company_name: string;
  timestamp: string;
  year?: string;
  normalized_data: Record<string, number>;
  metrics: Record<string, number | null>;
  analysis: FinancialAnalysis;
  confidence?: number;
  analysis_type: string;
}

export interface Case {
  id: string;
  company_name: string;
  analysis_type: string;
  timestamp: string;
  data: any;
}

export interface DashboardStats {
  total_cases: number;
  wc_analysis_count: number;
  banking_count: number;
  multi_year_count: number;
  recent_cases: Case[];
}
