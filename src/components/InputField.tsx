import React from 'react';
import { View, Text, TextInput, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { ThemeColors } from '../theme/themes';

interface InputFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
  style?: ViewStyle;
  editable?: boolean;
}

function makeStyles(theme: ThemeColors) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.cardBorder,
    },
    label: {
      color: theme.subText,
      fontSize: 14,
      flex: 1,
    },
    input: {
      backgroundColor: theme.inputBackground,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      color: theme.text,
      fontSize: 14,
      minWidth: 100,
      textAlign: 'right',
      borderWidth: 1,
      borderColor: theme.cardBorder,
    },
    inputDisabled: {
      opacity: 0.6,
    },
  });
}

export const InputField: React.FC<InputFieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder = '0',
  keyboardType = 'decimal-pad',
  style,
  editable = true,
}) => {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, !editable && styles.inputDisabled]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textMuted}
        keyboardType={keyboardType}
        editable={editable}
      />
    </View>
  );
};
