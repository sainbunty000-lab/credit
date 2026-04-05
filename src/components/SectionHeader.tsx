import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { ThemeColors } from '../theme/themes';

interface SectionHeaderProps {
  title: string;
  color?: string;
}

function makeStyles(theme: ThemeColors) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      marginTop: 8,
    },
    indicator: {
      width: 4,
      height: 16,
      borderRadius: 2,
      marginRight: 10,
    },
    title: {
      color: theme.text,
      fontSize: 13,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
  });
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, color }) => {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const indicatorColor = color ?? theme.primary;
  return (
    <View style={styles.container}>
      <View style={[styles.indicator, { backgroundColor: indicatorColor }]} />
      <Text style={styles.title}>{title}</Text>
    </View>
  );
};
