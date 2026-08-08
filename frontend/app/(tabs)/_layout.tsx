import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, StyleSheet } from 'react-native';
import { colors, fontSize, fontWeight } from '../../src/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryBright,
        tabBarInactiveTintColor: colors.textFaint,
        sceneContainerStyle: { backgroundColor: colors.bg },
        tabBarStyle: {
          position: Platform.OS === 'web' ? 'fixed' : 'absolute',
          backgroundColor: 'rgba(12,9,20,0.82)',
          borderTopColor: 'rgba(167,139,250,0.22)',
          borderTopWidth: 1,
          height: 64,
          paddingTop: 8,
          paddingBottom: 10,
          // @ts-ignore web-only frosted glass tab bar
          backdropFilter: 'blur(18px)',
          // @ts-ignore web-only glow seam above the bar
          boxShadow: '0 -8px 32px rgba(124,58,237,0.18)',
        } as any,
        tabBarLabelStyle: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, size }) => <Ionicons name="compass" size={size} color={color} />,
          tabBarButtonTestID: 'tab-discover',
        }}
      />
      <Tabs.Screen
        name="analyze"
        options={{
          title: 'Analyze',
          tabBarIcon: ({ color, size }) => <Ionicons name="pulse" size={size} color={color} />,
          tabBarButtonTestID: 'tab-analyze',
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
          tabBarButtonTestID: 'tab-feed',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
          tabBarButtonTestID: 'tab-profile',
        }}
      />
    </Tabs>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const styles = StyleSheet.create({ spacer: { height: 0 } });
