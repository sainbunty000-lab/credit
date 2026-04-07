/**
 * AnalyticsChart.tsx
 * Reusable chart component supporting pie, line, and bar chart types.
 * Wraps react-native-gifted-charts with ChartCard animation and theme support.
 */

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { PieChart, LineChart, BarChart } from 'react-native-gifted-charts';
import { useTheme } from '../../theme/ThemeContext';
import { ThemeColors } from '../../theme/themes';
import { ChartCard } from '../ChartCard';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DEFAULT_CHART_WIDTH = SCREEN_WIDTH - 72;

// ── Types ──────────────────────────────────────────────────────────────────

export interface PieSlice {
  value: number;
  color: string;
  label?: string;
  text?: string;
}

export interface DataPoint {
  value: number;
  label?: string;
  frontColor?: string;
}

export interface ChartProps {
  type: 'pie' | 'line' | 'bar';
  data: PieSlice[] | DataPoint[];
  title: string;
  subtitle?: string;
  height?: number;
  width?: number;
  color?: string;
  delay?: number;
  formatYLabel?: (val: string) => string;
  /** Optional legend items rendered below a pie chart */
  legend?: { label: string; color: string; value?: string }[];
}

// ── Helper ──────────────────────────────────────────────────────────────────

function makeStyles(theme: ThemeColors) {
  return StyleSheet.create({
    chartArea: {
      alignItems: 'center',
      marginTop: 4,
    },
    legendRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      marginTop: 14,
      gap: 10,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    legendDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    legendLabel: {
      color: theme.subText,
      fontSize: 12,
    },
    legendValue: {
      color: theme.text,
      fontSize: 12,
      fontWeight: '600',
    },
    emptyText: {
      color: theme.textMuted,
      fontSize: 12,
      textAlign: 'center',
      paddingVertical: 20,
    },
    axisLabel: {
      color: theme.subText,
      fontSize: 10,
    },
    pieCenter: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    pieCenterText: {
      color: theme.text,
      fontSize: 11,
      fontWeight: '700',
      textAlign: 'center',
    },
    pieCenterSub: {
      color: theme.subText,
      fontSize: 9,
      textAlign: 'center',
    },
  });
}

// ── Component ────────────────────────────────────────────────────────────────

export const AnalyticsChart: React.FC<ChartProps> = ({
  type,
  data,
  title,
  subtitle,
  height = 160,
  width,
  color,
  delay = 0,
  formatYLabel,
  legend,
}) => {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const chartWidth = width ?? DEFAULT_CHART_WIDTH;
  const lineColor = color ?? theme.primary;

  const safeData = data || [];
  const hasData = safeData.length > 0;

  const axisLabelStyle = styles.axisLabel;

  return (
    <ChartCard title={title} subtitle={subtitle} delay={delay}>
      <View style={styles.chartArea}>
        {!hasData ? (
          <Text style={styles.emptyText}>No data available</Text>
        ) : type === 'pie' ? (
          <>
            <PieChart
              data={safeData as PieSlice[]}
              donut
              radius={80}
              innerRadius={52}
              innerCircleColor={theme.card}
              centerLabelComponent={() => (
                <View style={styles.pieCenter}>
                  <Text style={styles.pieCenterText}>
                    {(safeData as PieSlice[]).length}
                  </Text>
                  <Text style={styles.pieCenterSub}>items</Text>
                </View>
              )}
              isAnimated
              animationDuration={600}
            />
            {(legend || (safeData as PieSlice[]).some((d) => d.label)) && (
              <View style={styles.legendRow}>
                {(legend ?? (safeData as PieSlice[]).map((d) => ({ label: d.label ?? '', color: d.color, value: d.text }))).map(
                  (item, i) => (
                    <View key={i} style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                      <Text style={styles.legendLabel}>{item.label}</Text>
                      {item.value ? (
                        <Text style={styles.legendValue}>{item.value}</Text>
                      ) : null}
                    </View>
                  )
                )}
              </View>
            )}
          </>
        ) : type === 'line' ? (
          <LineChart
            data={safeData as DataPoint[]}
            width={chartWidth}
            height={height}
            color={lineColor}
            thickness={2.5}
            dataPointsColor={theme.primaryDark}
            dataPointsRadius={4}
            startFillColor={`${lineColor}25`}
            endFillColor="transparent"
            areaChart
            curved
            rulesColor={theme.chartGrid}
            rulesType="solid"
            xAxisColor={theme.cardBorder}
            yAxisColor="transparent"
            yAxisTextStyle={axisLabelStyle}
            xAxisLabelTextStyle={axisLabelStyle}
            noOfSections={4}
            isAnimated
            formatYLabel={formatYLabel}
          />
        ) : (
          <BarChart
            data={safeData as DataPoint[]}
            width={chartWidth}
            height={height}
            barWidth={Math.max(20, Math.floor(chartWidth / (safeData.length * 2 + 1)))}
            barBorderRadius={4}
            frontColor={lineColor}
            noOfSections={4}
            rulesColor={theme.chartGrid}
            rulesType="solid"
            xAxisColor={theme.cardBorder}
            yAxisColor="transparent"
            yAxisTextStyle={axisLabelStyle}
            xAxisLabelTextStyle={axisLabelStyle}
            isAnimated
            formatYLabel={formatYLabel}
          />
        )}
      </View>
    </ChartCard>
  );
};
