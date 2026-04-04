/**
 * useFinancialData
 * ----------------
 * Custom hook that wraps API calls for all financial analysis types.
 * Handles loading state, error state, and data mapping for consumers.
 */

import { useState, useCallback } from 'react';
import {
  analyzeWorkingCapital,
  analyzeBanking,
  analyzeMultiYear,
} from '../api';
import {
  WorkingCapitalInput,
  WorkingCapitalResult,
  BankingInput,
  BankingResult,
  MultiYearInput,
  MultiYearResult,
} from '../types';

// ─── Generic fetch state ──────────────────────────────────────────────────────

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

function initState<T>(): FetchState<T> {
  return { data: null, loading: false, error: null };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseFinancialDataReturn {
  // Working Capital
  wc: FetchState<WorkingCapitalResult>;
  runWCAnalysis: (input: WorkingCapitalInput) => Promise<WorkingCapitalResult | null>;
  clearWC: () => void;

  // Banking
  banking: FetchState<BankingResult>;
  runBankingAnalysis: (input: BankingInput) => Promise<BankingResult | null>;
  clearBanking: () => void;

  // Multi-Year
  trend: FetchState<MultiYearResult>;
  runTrendAnalysis: (input: MultiYearInput) => Promise<MultiYearResult | null>;
  clearTrend: () => void;

  // Global reset
  clearAll: () => void;
}

export function useFinancialData(): UseFinancialDataReturn {
  const [wc, setWC] = useState<FetchState<WorkingCapitalResult>>(initState());
  const [banking, setBanking] = useState<FetchState<BankingResult>>(initState());
  const [trend, setTrend] = useState<FetchState<MultiYearResult>>(initState());

  // ── Working Capital ──────────────────────────────────────────────────────

  const runWCAnalysis = useCallback(async (input: WorkingCapitalInput) => {
    setWC({ data: null, loading: true, error: null });
    try {
      const result = await analyzeWorkingCapital(input);
      setWC({ data: result, loading: false, error: null });
      return result;
    } catch (err: any) {
      const message = err?.response?.data?.detail ?? err?.message ?? 'Working capital analysis failed';
      setWC({ data: null, loading: false, error: message });
      return null;
    }
  }, []);

  const clearWC = useCallback(() => setWC(initState()), []);

  // ── Banking ──────────────────────────────────────────────────────────────

  const runBankingAnalysis = useCallback(async (input: BankingInput) => {
    setBanking({ data: null, loading: true, error: null });
    try {
      const result = await analyzeBanking(input);
      setBanking({ data: result, loading: false, error: null });
      return result;
    } catch (err: any) {
      const message = err?.response?.data?.detail ?? err?.message ?? 'Banking analysis failed';
      setBanking({ data: null, loading: false, error: message });
      return null;
    }
  }, []);

  const clearBanking = useCallback(() => setBanking(initState()), []);

  // ── Multi-Year Trend ──────────────────────────────────────────────────────

  const runTrendAnalysis = useCallback(async (input: MultiYearInput) => {
    setTrend({ data: null, loading: true, error: null });
    try {
      const result = await analyzeMultiYear(input);
      setTrend({ data: result, loading: false, error: null });
      return result;
    } catch (err: any) {
      const message = err?.response?.data?.detail ?? err?.message ?? 'Trend analysis failed';
      setTrend({ data: null, loading: false, error: message });
      return null;
    }
  }, []);

  const clearTrend = useCallback(() => setTrend(initState()), []);

  // ── Global reset ──────────────────────────────────────────────────────────

  const clearAll = useCallback(() => {
    setWC(initState());
    setBanking(initState());
    setTrend(initState());
  }, []);

  return {
    wc,
    runWCAnalysis,
    clearWC,
    banking,
    runBankingAnalysis,
    clearBanking,
    trend,
    runTrendAnalysis,
    clearTrend,
    clearAll,
  };
}
