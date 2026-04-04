import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  rightIcon?: React.ComponentProps<typeof Ionicons>['name'];
  onRightPress?: () => void;
  rightComponent?: React.ReactNode;
}

export function AppHeader({ title, subtitle, rightIcon, onRightPress, rightComponent }: AppHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
        <View style={styles.textBlock}>
          <Text style={styles.brand}>DHANUSH ENTERPRISES</Text>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {rightComponent ? (
        <View style={styles.right}>{rightComponent}</View>
      ) : rightIcon ? (
        <TouchableOpacity style={styles.iconButton} onPress={onRightPress} activeOpacity={0.7}>
          <Ionicons name={rightIcon} size={22} color={colors.primary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  textBlock: {
    flex: 1,
  },
  brand: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 1,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 24,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 1,
  },
  right: {
    marginLeft: 8,
  },
  iconButton: {
    padding: 8,
    backgroundColor: colors.primaryLight,
    borderRadius: 20,
    marginLeft: 8,
  },
});
