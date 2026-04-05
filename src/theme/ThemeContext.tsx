import React, { createContext, useContext, useState, ReactNode } from 'react';
import { themes, ThemeColors, ThemeKey } from './themes';

interface ThemeContextValue {
  theme: ThemeColors;
  themeKey: ThemeKey;
  setTheme: (key: ThemeKey) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: themes.light,
  themeKey: 'light',
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeKey, setThemeKey] = useState<ThemeKey>('light');

  const setTheme = (key: ThemeKey) => setThemeKey(key);

  return (
    <ThemeContext.Provider value={{ theme: themes[themeKey], themeKey, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
