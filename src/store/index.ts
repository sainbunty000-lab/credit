import { create } from 'zustand';
import { WorkingCapitalResult, BankingResult, MultiYearResult, Case } from '../types';

interface AppState {
  // Current analysis results
  wcResult: WorkingCapitalResult | null;
  bankingResult: BankingResult | null;
  trendResult: MultiYearResult | null;
  
  // Saved cases
  cases: Case[];
  
  // Loading states
  isLoading: boolean;
  
  // Actions
  setWCResult: (result: WorkingCapitalResult | null) => void;
  setBankingResult: (result: BankingResult | null) => void;
  setTrendResult: (result: MultiYearResult | null) => void;
  setCases: (cases: Case[]) => void;
  addCase: (caseData: Case) => void;
  removeCase: (caseId: string) => void;
  setLoading: (loading: boolean) => void;
  clearResults: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  wcResult: null,
  bankingResult: null,
  trendResult: null,
  cases: [],
  isLoading: false,
  
  setWCResult: (result) => set({ wcResult: result }),
  setBankingResult: (result) => set({ bankingResult: result }),
  setTrendResult: (result) => set({ trendResult: result }),
  setCases: (cases) => set({ cases }),
  addCase: (caseData) => set((state) => ({ cases: [caseData, ...state.cases] })),
  removeCase: (caseId) => set((state) => ({ cases: state.cases.filter(c => c.id !== caseId) })),
  setLoading: (loading) => set({ isLoading: loading }),
  clearResults: () => set({ wcResult: null, bankingResult: null, trendResult: null }),
}));
