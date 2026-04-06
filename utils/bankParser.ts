/**
 * bankParser.ts
 * Utility for parsing bank statement rows extracted from PDFs,
 * classifying transactions, filtering noise, and computing financial metrics.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TransactionCategory =
  | 'loan'
  | 'charges'
  | 'revenue'
  | 'transfer'
  | 'reversal'
  | 'cash_in'
  | 'expense'
  | 'other';

export interface RawTransactionRow {
  date?: string;
  narration?: string;
  description?: string;
  withdrawal?: string | number;
  debit?: string | number;
  deposit?: string | number;
  credit?: string | number;
  balance?: string | number;
}

export interface Transaction {
  date: string;
  narration: string;
  withdrawal: number;
  deposit: number;
  balance: number;
  type: 'credit' | 'debit';
  category: TransactionCategory;
}

export interface FinancialMetrics {
  revenue: number;       // sum of credit transactions
  expenses: number;      // sum of debit transactions
  emi: number;           // sum of loan-category debits
  cashFlow: number;      // revenue - expenses
  risk: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface WCEligibility {
  eligible: boolean;
  limit: number;
}

// ---------------------------------------------------------------------------
// classifyTransaction
// Classify a transaction narration into one of the defined categories.
// ---------------------------------------------------------------------------
export function classifyTransaction(narration: string): TransactionCategory {
  const n = (narration || '').toUpperCase();

  // Reversal — check first to avoid mis-classifying returned IMPS as transfer
  if (/RETURN|REVERSAL|REV |FAILED|REJECT|BOUNCE|DISHONOUR/.test(n)) {
    return 'reversal';
  }

  // Loan / EMI
  if (/\bEMI\b|ACH DEBIT|NACH DEBIT|LOAN REPAY|LOAN EMI|REPAYMENT/.test(n)) {
    return 'loan';
  }

  // Bank charges / GST / fees
  if (/\bGST\b|BANK CHARGE|SERVICE CHARGE|IMPS FEE|SMS CHARGE|ANNUAL FEE|MAINTENANCE|PENALTY/.test(n)) {
    return 'charges';
  }

  // Revenue / salary / business inflow
  if (/SALARY|NEFT CR|NEFT CREDIT|BUSINESS INFLOW|INCOME|DIVIDEND|INTEREST CR/.test(n)) {
    return 'revenue';
  }

  // Cash deposit
  if (/CASH DEP|CASH DEPOSIT|CDM|ATM DEP/.test(n)) {
    return 'cash_in';
  }

  // POS / purchase / expense
  if (/\bPOS\b|PURCHASE|DEBIT CARD|MERCHANT|SWIGGY|ZOMATO|AMAZON|FLIPKART|UBER|OLA/.test(n)) {
    return 'expense';
  }

  // Transfer — UPI / IMPS / NEFT (non-reversal)
  if (/\bUPI\b|\bIMPS\b|\bNEFT\b|\bRTGS\b|TRANSFER|FUND TR/.test(n)) {
    return 'transfer';
  }

  return 'other';
}

// ---------------------------------------------------------------------------
// parseTransactions
// Convert raw PDF row objects into normalised Transaction records.
// Applies noise filters (small charges, reversal removal).
// ---------------------------------------------------------------------------
export function parseTransactions(rows: RawTransactionRow[]): Transaction[] {
  const transactions: Transaction[] = [];

  for (const row of rows) {
    const narration = String(row.narration || row.description || '').trim();

    // Safe numeric parsing — fall back to 0 for undefined / blank / NaN
    const withdrawal = parseFloat(String(row.withdrawal ?? row.debit ?? 0)) || 0;
    const deposit    = parseFloat(String(row.deposit    ?? row.credit ?? 0)) || 0;
    const balance    = parseFloat(String(row.balance    ?? 0)) || 0;

    const type: 'credit' | 'debit' = deposit > 0 ? 'credit' : 'debit';
    const category = classifyTransaction(narration);

    // --- Noise filters ---

    // Skip reversals entirely
    if (category === 'reversal') {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[bankParser] Skipping reversal:', narration);
      }
      continue;
    }

    // Skip IMPS fee spam (charges below ₹10)
    if (category === 'charges' && withdrawal < 10) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[bankParser] Skipping tiny charge:', narration, withdrawal);
      }
      continue;
    }

    transactions.push({
      date: String(row.date || '').trim(),
      narration,
      withdrawal,
      deposit,
      balance,
      type,
      category,
    });
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[bankParser] Parsed ${transactions.length} transactions from ${rows.length} rows`);
  }

  return transactions;
}

// ---------------------------------------------------------------------------
// calculateMetrics
// Aggregate parsed transactions into high-level financial metrics.
// ---------------------------------------------------------------------------
export function calculateMetrics(transactions: Transaction[]): FinancialMetrics {
  let revenue  = 0;
  let expenses = 0;
  let emi      = 0;

  for (const tx of transactions) {
    if (tx.type === 'credit') {
      revenue += tx.deposit;
    } else {
      expenses += tx.withdrawal;
      if (tx.category === 'loan') {
        emi += tx.withdrawal;
      }
    }
  }

  const cashFlow = revenue - expenses;

  // Risk assessment
  let risk: 'HIGH' | 'MEDIUM' | 'LOW';
  if (cashFlow < 0) {
    risk = 'HIGH';
  } else if (cashFlow < revenue * 0.1) {
    risk = 'MEDIUM';
  } else {
    risk = 'LOW';
  }

  return { revenue, expenses, emi, cashFlow, risk };
}

// ---------------------------------------------------------------------------
// calculateWCEligibility
// Determine working-capital loan eligibility based on metrics.
// If cashFlow <= 0 → NOT ELIGIBLE.
// Otherwise: limit = max(0, (avgMonthlyRevenue - emi) * multiplier)
// ---------------------------------------------------------------------------
export function calculateWCEligibility(
  metrics: FinancialMetrics,
  months: number = 12,
  multiplier: number = 3
): WCEligibility {
  if (metrics.cashFlow <= 0) {
    return { eligible: false, limit: 0 };
  }

  const avgMonthlyRevenue = metrics.revenue / (months || 1);
  const monthlyEmi        = metrics.emi     / (months || 1);
  const limit = Math.max(0, (avgMonthlyRevenue - monthlyEmi) * multiplier);

  return { eligible: limit > 0, limit: Math.round(limit) };
}
