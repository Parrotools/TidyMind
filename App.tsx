/**
 * TidyMind — Knowledge Workspace
 *
 * UI layout and components based on Figma design:
 * https://figma.com/design/UTwDtr261uT6tPxo0Hjxdi
 *
 * @format
 */

import React, { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  LayoutChangeEvent,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { BottomTabBarProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList, TabParamList } from './src/navigation/types';
import AssistantScreen from './src/screens/AssistantScreen';
import ExportScreen from './src/screens/ExportScreen';
import FavoritesScreen from './src/screens/FavoritesScreen';
import HomeScreen from './src/screens/HomeScreen';
import ImportScreen from './src/screens/ImportScreen';
import FilesScreen from './src/screens/FilesScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { AppStateProvider } from './src/state/AppState';
import { BorderRadius, Colors, Spacing } from './src/theme/designTokens';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// ── Custom Tab Bar (Figma-style, animated) ───────────────────────────────

type TabConfig = {
  key: string;
  label: string;
  icon: string;
  iconActive: string;
};

const TAB_CONFIGS: TabConfig[] = [
  { key: 'Home', label: '首页', icon: '⌂', iconActive: '⌂' },
  { key: 'Files', label: '文件', icon: '⊞', iconActive: '⊞' },
  { key: 'Favorites', label: '收藏', icon: '☆', iconActive: '★' },
  { key: 'Profile', label: '我的', icon: '◎', iconActive: '◉' },
];

/** Fixed pill dimensions — measured approx from Figma design */
const PILL_PADDING_H = 18;
const PILL_GAP = 6;
const INACTIVE_ICON_SIZE = 26;
const ACTIVE_ICON_SIZE = 20;
const ACTIVE_FONT_SIZE = 15;

// Fixed pill dimensions — wide enough to fully cover icon + label + padding
const FIXED_PILL_WIDTH = 96;
const PILL_HEIGHT = 41;
const TAB_MIN_HEIGHT = 48;

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const rowWidthRef = useRef(0);
  const didInitialSnap = useRef(false);
  const activeIndex = state.index;
  const tabCount = state.routes.length;
  const pillLeft = useRef(new Animated.Value(0)).current;

  // Measure the row once so we can divide it into equal slices.
  // This guarantees the pill position is consistent regardless of
  // individual tab content widths (which change active ↔ inactive).
  const handleRowLayout = useCallback((e: LayoutChangeEvent) => {
    rowWidthRef.current = e.nativeEvent.layout.width;
  }, []);

  /** Each tab occupies an equal horizontal slice; pill is centered in its slice */
  const pillTargetFor = (index: number) => {
    const sliceW = rowWidthRef.current / tabCount;
    return sliceW * index + sliceW / 2 - FIXED_PILL_WIDTH / 2;
  };

  useEffect(() => {
    if (rowWidthRef.current === 0) {
      return;
    }

    const targetLeft = pillTargetFor(activeIndex);

    if (!didInitialSnap.current) {
      pillLeft.setValue(targetLeft);
      didInitialSnap.current = true;
      return;
    }

    Animated.spring(pillLeft, {
      toValue: targetLeft,
      tension: 60,
      friction: 8,
      useNativeDriver: false,
    }).start();
  }, [activeIndex, pillLeft, pillTargetFor, tabCount]);

  return (
    <View style={[tabStyles.container, { paddingBottom: insets.bottom }]}>
      {/* Handle indicator */}
      <View style={tabStyles.handle} />

      {/* Tab row with absolutely-positioned animated pill */}
      <View style={tabStyles.row} onLayout={handleRowLayout}>
        {/* Sliding pill — vertically centered via top offset */}
        <Animated.View
          style={[
            tabStyles.pillBg,
            {
              transform: [{ translateX: pillLeft }],
              width: FIXED_PILL_WIDTH,
              height: PILL_HEIGHT,
            },
          ]}
        />

        {state.routes.map((route, index) => {
          const isActive = activeIndex === index;
          const config = TAB_CONFIGS[index];
          if (!config) {
            return null;
          }

          return (
            <Pressable
              key={route.key}
              style={tabStyles.tab}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!isActive && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
            >
              {isActive ? (
                <View style={tabStyles.activeContent}>
                  <Animated.Text style={tabStyles.activeIcon}>
                    {config.iconActive}
                  </Animated.Text>
                  <Animated.Text style={tabStyles.activeLabel}>
                    {config.label}
                  </Animated.Text>
                </View>
              ) : (
                <Animated.Text style={tabStyles.inactiveIcon}>
                  {config.icon}
                </Animated.Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderTopWidth: 0,
    ...Platform.select({
      ios: {
        shadowColor: Colors.textPrimary,
        shadowOpacity: 0.04,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: -2 },
      },
      android: {
        elevation: 4,
      },
    }),
  },
  handle: {
    width: 108,
    height: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.navHandle,
    alignSelf: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    position: 'relative',
  },
  // Sliding pill — absolutely positioned behind active content
  pillBg: {
    position: 'absolute',
    top: (TAB_MIN_HEIGHT - PILL_HEIGHT) / 2,
    left: 0,
    backgroundColor: Colors.active,
    borderRadius: BorderRadius.full,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: TAB_MIN_HEIGHT,
    minWidth: 64,
    zIndex: 1,
  },
  activeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: PILL_PADDING_H,
    paddingVertical: 0,
    gap: PILL_GAP,
    minWidth: 80,
    height: PILL_HEIGHT,
  },
  activeIcon: {
    fontSize: ACTIVE_ICON_SIZE,
    color: Colors.textOnDark,
    lineHeight: ACTIVE_ICON_SIZE + 2,
    textAlign: 'center',
  },
  activeLabel: {
    fontSize: ACTIVE_FONT_SIZE,
    fontWeight: '500',
    color: Colors.textOnDark,
    lineHeight: 20,
    textAlign: 'center',
  },
  inactiveIcon: {
    fontSize: INACTIVE_ICON_SIZE,
    color: Colors.textSecondary,
    lineHeight: INACTIVE_ICON_SIZE + 2,
    textAlign: 'center',
  },
});

// ── Tabs Navigator ────────────────────────────────────────────────────────

const renderTabBar = (props: BottomTabBarProps) => <CustomTabBar {...props} />;

function TabsNavigator() {
  return (
    <Tab.Navigator
      tabBar={renderTabBar}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Files" component={FilesScreen} />
      <Tab.Screen name="Favorites" component={FavoritesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// ── App ───────────────────────────────────────────────────────────────────

function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AppStateProvider>
          <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
          <NavigationContainer>
            <RootStack.Navigator screenOptions={{ headerShown: false }}>
              <RootStack.Screen name="Tabs" component={TabsNavigator} />
              <RootStack.Screen name="Assistant" component={AssistantScreen} />
              <RootStack.Screen name="Import" component={ImportScreen} />
              <RootStack.Screen name="Export" component={ExportScreen} />
              <RootStack.Screen name="Settings" component={SettingsScreen} />
            </RootStack.Navigator>
          </NavigationContainer>
        </AppStateProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.backgroundStart,
  },
});

export default App;