import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { useTheme } from '../src/theme/ThemeContext';

const queryClient = new QueryClient();

function AppShell() {
  const { theme } = useTheme();
  return (
    <>
      <StatusBar style={theme.background === '#0F172A' || theme.background === '#020617' ? 'light' : 'dark'} />
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: theme.tabBarBackground,
              borderTopColor: theme.border,
              borderTopWidth: 1,
              paddingTop: 8,
              height: 70,
            },
            tabBarActiveTintColor: theme.tabActive,
            tabBarInactiveTintColor: theme.tabInactive,
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
            name="gst"
            options={{
              title: 'GST & ITR',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="shield-checkmark-outline" size={size} color={color} />
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
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AppShell />
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
});
