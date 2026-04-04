import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

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

export const DataTable: React.FC<DataTableProps> = ({ rows, title }) => {
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

const styles = StyleSheet.create({
  container: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 12,
  },
  tableTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.primaryLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  rowAlt: {
    backgroundColor: '#FAFFFE',
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 13,
    flex: 1,
  },
  labelBold: {
    color: colors.text,
    fontWeight: '700',
  },
  value: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
  },
  valueBold: {
    fontSize: 14,
    fontWeight: '700',
  },
});
