import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { ThemeColors } from '../theme/themes';

export interface TableRow {
  label: string;
  value: string;
  valueColor?: string;
  bold?: boolean;
}

interface DataTableProps {
  rows: TableRow[];
  title?: string;
}

function makeStyles(theme: ThemeColors) {
  return StyleSheet.create({
    container: {
      borderRadius: 10,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.cardBorder,
      marginBottom: 12,
    },
    tableTitle: {
      color: theme.text,
      fontSize: 13,
      fontWeight: '700',
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: theme.primaryLight,
      borderBottomWidth: 1,
      borderBottomColor: theme.cardBorder,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 11,
      backgroundColor: theme.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.cardBorder,
    },
    rowAlt: {
      backgroundColor: theme.tableRowAlt,
    },
    rowLast: {
      borderBottomWidth: 0,
    },
    label: {
      color: theme.subText,
      fontSize: 13,
      flex: 1,
    },
    labelBold: {
      color: theme.text,
      fontWeight: '700',
    },
    value: {
      color: theme.text,
      fontSize: 13,
      fontWeight: '600',
      textAlign: 'right',
    },
    valueBold: {
      fontSize: 14,
      fontWeight: '700',
    },
  });
}

export const DataTable: React.FC<DataTableProps> = ({ rows, title }) => {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  return (
    <View style={styles.container}>
      {title ? <Text style={styles.tableTitle}>{title}</Text> : null}
      {rows.map((row, index) => (
        <View
          key={`${row.label}-${index}`}
          style={[
            styles.row,
            index % 2 === 0 && styles.rowAlt,
            index === rows.length - 1 && styles.rowLast,
          ]}
        >
          <Text style={[styles.label, row.bold && styles.labelBold]}>{row.label}</Text>
          <Text style={[styles.value, row.bold && styles.valueBold, row.valueColor ? { color: row.valueColor } : undefined]}>
            {row.value}
          </Text>
        </View>
      ))}
    </View>
  );
};
