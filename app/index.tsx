import React, { useEffect } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { colors } from '../src/theme/colors';

const modules = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    subtitle: 'ANALYTICS',
    icon: 'stats-chart-outline' as const,
    color: colors.primary,
    route: '/dashboard',
    description: 'KPIs, charts & overview',
  },
  {
    id: 'wc',
    title: 'Working Capital',
    subtitle: 'CORE MODULE',
    icon: 'bar-chart-outline' as const,
    color: colors.yellow,
    route: '/wc',
    description: 'WC analysis & ratios',
  },
  {
    id: 'banking',
    title: 'Banking Performance',
    subtitle: 'CORE MODULE',
    icon: 'business-outline' as const,
    color: colors.green,
    route: '/banking',
    description: 'Credit & liquidity scores',
  },
  {
    id: 'trend',
    title: 'Multi-Year Analysis',
    subtitle: 'ADVANCED',
    icon: 'trending-up-outline' as const,
    color: colors.cyan,
    route: '/trend',
    description: 'Historical trend analysis',
  },
  {
    id: 'cases',
    title: 'Saved Cases',
    subtitle: 'RECORDS',
    icon: 'folder-outline' as const,
    color: colors.orange,
    route: '/cases',
    description: 'View past analyses',
  },
] as const;

function AnimatedModuleCard({
  module,
  index,
  isLastOdd,
  onPress,
}: {
  module: (typeof modules)[number];
  index: number;
  isLastOdd: boolean;
  onPress: () => void;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(24);

  useEffect(() => {
    const delay = 200 + index * 80;
    opacity.value = withDelay(delay, withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) }));
    translateY.value = withDelay(delay, withTiming(0, { duration: 400, easing: Easing.out(Easing.ease) }));
  }, [index]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.moduleCardWrapper, isLastOdd && styles.moduleCardFull, animatedStyle]}>
      <TouchableOpacity
        style={styles.moduleCard}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={[styles.moduleBadge, { borderColor: module.color }]}>
          <Text style={[styles.moduleBadgeText, { color: module.color }]}>{module.subtitle}</Text>
        </View>
        <View style={[styles.moduleIconContainer, { backgroundColor: `${module.color}18` }]}>
          <Ionicons name={module.icon} size={24} color={module.color} />
        </View>
        <Text style={styles.moduleTitle}>{module.title}</Text>
        <Text style={styles.moduleDesc}>{module.description}</Text>
        <View style={styles.openRow}>
          <Text style={[styles.openText, { color: module.color }]}>Open</Text>
          <Ionicons name="arrow-forward" size={13} color={module.color} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const router = useRouter();

  const headerOpacity = useSharedValue(0);
  const headerTranslateY = useSharedValue(-12);
  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslateY.value }],
  }));

  useEffect(() => {
    headerOpacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) });
    headerTranslateY.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.ease) });
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View style={[styles.header, headerStyle]}>
          <View style={styles.headerLeft}>
            <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
            <View>
              <Text style={styles.brandName}>DHANUSH ENTERPRISES</Text>
              <Text style={styles.title}>Capital Analytics</Text>
              <Text style={styles.subtitle}>Professional Financial Analysis Platform</Text>
            </View>
          </View>
          <View style={styles.headerBadge}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
          </View>
        </Animated.View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statBadge}>
            <Ionicons name="flash-outline" size={13} color={colors.primary} />
            <Text style={styles.statText}>AI-Powered OCR</Text>
          </View>
          <View style={[styles.statBadge, { borderColor: colors.green }]}>
            <Ionicons name="checkmark-circle-outline" size={13} color={colors.green} />
            <Text style={styles.statText}>100% Accurate</Text>
          </View>
          <View style={[styles.statBadge, { borderColor: colors.cyan }]}>
            <Ionicons name="cloud-outline" size={13} color={colors.cyan} />
            <Text style={styles.statText}>Cloud Sync</Text>
          </View>
        </View>

        {/* Module Cards Grid */}
        <View style={styles.modulesGrid}>
          {modules.map((module, index) => {
            const isLastOdd = modules.length % 2 !== 0 && index === modules.length - 1;
            return (
              <AnimatedModuleCard
                key={module.id}
                module={module}
                index={index}
                isLastOdd={isLastOdd}
                onPress={() => router.push(module.route as any)}
              />
            );
          })}
        </View>

        {/* Start Analysis CTA */}
        <TouchableOpacity
          style={styles.startButton}
          onPress={() => router.push('/wc')}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.startButtonGradient}
          >
            <Ionicons name="cloud-upload-outline" size={22} color="#fff" />
            <Text style={styles.startButtonText}>Start New Analysis</Text>
            <Ionicons name="chevron-forward" size={18} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  brandName: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  headerBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  modulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  moduleCardWrapper: {
    width: '47.5%',
  },
  moduleCardFull: {
    width: '100%',
  },
  moduleCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    flex: 1,
  },
  moduleBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  moduleBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  moduleIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  moduleTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  moduleDesc: {
    color: colors.textSecondary,
    fontSize: 11,
    marginBottom: 10,
  },
  openRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  openText: {
    fontSize: 12,
    fontWeight: '600',
  },
  startButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 20,
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
});
