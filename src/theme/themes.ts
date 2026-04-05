export interface ThemeColors {
  background: string;
  card: string;
  cardBorder: string;
  inputBackground: string;
  text: string;
  subText: string;
  textMuted: string;
  primary: string;
  primaryDark: string;
  primaryLight: string;
  secondary: string;
  warning: string;
  danger: string;
  border: string;
  gradient: [string, string];
  // status
  success: string;
  error: string;
  info: string;
  // accent helpers (keep for components)
  green: string;
  red: string;
  yellow: string;
  orange: string;
  purple: string;
  cyan: string;
  // tab bar
  tabBarBackground: string;
  tabActive: string;
  tabInactive: string;
  // chart
  chartLine: string;
  chartBar: string;
  chartBarAlt: string;
  chartGrid: string;
  tableRowAlt: string;
  // special
  glow?: boolean;
}

export type ThemeKey = 'light' | 'dark' | 'corporate' | 'game';

export const themes: Record<ThemeKey, ThemeColors> = {
  light: {
    background: '#F8FAFC',
    card: '#FFFFFF',
    cardBorder: '#E2E8F0',
    inputBackground: '#F1F5F9',
    text: '#0F172A',
    subText: '#64748B',
    textMuted: '#94A3B8',
    primary: '#16A34A',
    primaryDark: '#15803D',
    primaryLight: '#DCFCE7',
    secondary: '#22C55E',
    warning: '#F59E0B',
    danger: '#EF4444',
    border: '#E2E8F0',
    gradient: ['#16A34A', '#22C55E'],
    success: '#22C55E',
    error: '#EF4444',
    info: '#06B6D4',
    green: '#22C55E',
    red: '#EF4444',
    yellow: '#F59E0B',
    orange: '#F97316',
    purple: '#8B5CF6',
    cyan: '#06B6D4',
    tabBarBackground: '#FFFFFF',
    tabActive: '#16A34A',
    tabInactive: '#94A3B8',
    chartLine: '#16A34A',
    chartBar: '#22C55E',
    chartBarAlt: '#4ADE80',
    chartGrid: '#E2E8F0',
    tableRowAlt: '#F8FAFC',
  },
  dark: {
    background: '#0F172A',
    card: '#1E293B',
    cardBorder: '#334155',
    inputBackground: '#0F172A',
    text: '#F1F5F9',
    subText: '#94A3B8',
    textMuted: '#64748B',
    primary: '#22C55E',
    primaryDark: '#16A34A',
    primaryLight: '#14532D',
    secondary: '#4ADE80',
    warning: '#FCD34D',
    danger: '#F87171',
    border: '#334155',
    gradient: ['#16A34A', '#22C55E'],
    success: '#22C55E',
    error: '#F87171',
    info: '#38BDF8',
    green: '#22C55E',
    red: '#F87171',
    yellow: '#FCD34D',
    orange: '#FB923C',
    purple: '#A78BFA',
    cyan: '#38BDF8',
    tabBarBackground: '#1E293B',
    tabActive: '#22C55E',
    tabInactive: '#64748B',
    chartLine: '#22C55E',
    chartBar: '#22C55E',
    chartBarAlt: '#4ADE80',
    chartGrid: '#334155',
    tableRowAlt: '#0F172A',
  },
  corporate: {
    background: '#F0F4FF',
    card: '#FFFFFF',
    cardBorder: '#C7D2FE',
    inputBackground: '#EEF2FF',
    text: '#1E1B4B',
    subText: '#4338CA',
    textMuted: '#6366F1',
    primary: '#4F46E5',
    primaryDark: '#4338CA',
    primaryLight: '#E0E7FF',
    secondary: '#6366F1',
    warning: '#D97706',
    danger: '#DC2626',
    border: '#C7D2FE',
    gradient: ['#4F46E5', '#6366F1'],
    success: '#059669',
    error: '#DC2626',
    info: '#0284C7',
    green: '#059669',
    red: '#DC2626',
    yellow: '#D97706',
    orange: '#EA580C',
    purple: '#7C3AED',
    cyan: '#0284C7',
    tabBarBackground: '#FFFFFF',
    tabActive: '#4F46E5',
    tabInactive: '#6366F1',
    chartLine: '#4F46E5',
    chartBar: '#6366F1',
    chartBarAlt: '#818CF8',
    chartGrid: '#C7D2FE',
    tableRowAlt: '#EEF2FF',
  },
  game: {
    background: '#020617',
    card: '#0F172A',
    cardBorder: '#1E293B',
    inputBackground: '#0F172A',
    text: '#F1F5F9',
    subText: '#94A3B8',
    textMuted: '#475569',
    primary: '#22C55E',
    primaryDark: '#16A34A',
    primaryLight: '#052e16',
    secondary: '#38BDF8',
    warning: '#F59E0B',
    danger: '#F43F5E',
    border: '#1E293B',
    gradient: ['#22C55E', '#38BDF8'],
    success: '#22C55E',
    error: '#F43F5E',
    info: '#38BDF8',
    green: '#22C55E',
    red: '#F43F5E',
    yellow: '#F59E0B',
    orange: '#F97316',
    purple: '#A855F7',
    cyan: '#38BDF8',
    tabBarBackground: '#0F172A',
    tabActive: '#22C55E',
    tabInactive: '#475569',
    chartLine: '#22C55E',
    chartBar: '#22C55E',
    chartBarAlt: '#38BDF8',
    chartGrid: '#1E293B',
    tableRowAlt: '#020617',
    glow: true,
  },
};
