import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, Platform } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { ThemeColors } from '../theme/themes';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

function makeStyles(theme: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.cardBorder,
      padding: 18,
      marginBottom: 12,
      ...Platform.select({
        ios: {
          shadowColor: theme.glow ? theme.primary : '#0F172A',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: theme.glow ? 0.35 : 0.06,
          shadowRadius: theme.glow ? 16 : 10,
        },
        android: {
          elevation: theme.glow ? 8 : 2,
        },
      }),
    },
  });
}

export const Card: React.FC<CardProps> = ({ children, style }) => {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  return (
    <View style={[styles.card, style]}>
      {children}
    </View>
  );
};
