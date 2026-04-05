import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { ThemeKey } from '../theme/themes';

const THEME_OPTIONS: { key: ThemeKey; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { key: 'light', label: 'Light', icon: 'sunny-outline' },
  { key: 'dark', label: 'Dark', icon: 'moon-outline' },
  { key: 'corporate', label: 'Corp', icon: 'business-outline' },
  { key: 'game', label: 'Game', icon: 'game-controller-outline' },
];

export function ThemeSwitcher() {
  const { theme, themeKey, setTheme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {THEME_OPTIONS.map((opt) => {
        const isActive = themeKey === opt.key;
        return (
          <TouchableOpacity
            key={opt.key}
            style={[
              styles.btn,
              { borderColor: isActive ? theme.primary : 'transparent', backgroundColor: isActive ? theme.primary + '20' : 'transparent' },
            ]}
            onPress={() => setTheme(opt.key)}
            activeOpacity={0.7}
          >
            <Ionicons name={opt.icon} size={16} color={isActive ? theme.primary : theme.textMuted} />
            <Text style={[styles.label, { color: isActive ? theme.primary : theme.textMuted }]}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    gap: 2,
  },
  btn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
  },
});
