import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../src/theme/colors';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <View style={styles.container}>
          <Tabs
            screenOptions={{
              headerShown: false,
              tabBarStyle: styles.tabBar,
              tabBarActiveTintColor: colors.tabActive,
              tabBarInactiveTintColor: colors.tabInactive,
              tabBarLabelStyle: styles.tabLabel,
            }}
          >
            <Tabs.Screen
              name="index"
              options={{
                title: 'Home',
                tabBarIcon: ({ color, size }) => (
                  <Ionicons name="home-outline" size={size} color={color} />
                ),
              }}
            />
            <Tabs.Screen
              name="dashboard"
              options={{
                title: 'Dashboard',
                tabBarIcon: ({ color, size }) => (
                  <Ionicons name="stats-chart-outline" size={size} color={color} />
                ),
              }}
            />
            <Tabs.Screen
              name="wc"
              options={{
                title: 'WC',
                tabBarIcon: ({ color, size }) => (
                  <Ionicons name="bar-chart-outline" size={size} color={color} />
                ),
              }}
            />
            <Tabs.Screen
              name="banking"
              options={{
                title: 'Banking',
                tabBarIcon: ({ color, size }) => (
                  <Ionicons name="business-outline" size={size} color={color} />
                ),
              }}
            />
            <Tabs.Screen
              name="trend"
              options={{
                title: 'Trend',
                tabBarIcon: ({ color, size }) => (
                  <Ionicons name="trending-up-outline" size={size} color={color} />
                ),
              }}
            />
            <Tabs.Screen
              name="cases"
              options={{
                title: 'Cases',
                tabBarIcon: ({ color, size }) => (
                  <Ionicons name="folder-outline" size={size} color={color} />
                ),
              }}
            />
          </Tabs>
        </View>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabBar: {
    backgroundColor: colors.tabBarBackground,
    borderTopColor: colors.tabBarBorder,
    borderTopWidth: 1,
    paddingTop: 8,
    height: 70,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
});
