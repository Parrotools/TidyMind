/**
 * TidyMind — Knowledge Workspace
 *
 * UI layout and components based on Figma design:
 * https://figma.com/design/UTwDtr261uT6tPxo0Hjxdi
 *
 * @format
 */

import React from 'react';
import { Image, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { BottomTabBarProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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
import { BorderRadius, Colors, Spacing, Typography } from './src/theme/designTokens';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// ── Icon assets (from Figma) ──────────────────────────────────────────────

const ICONS = {
  home: {
    uri: 'https://www.figma.com/api/mcp/asset/67233ba1-3882-4b3c-925c-4094381708f1',
  },
  homeActive: {
    uri: 'https://www.figma.com/api/mcp/asset/67233ba1-3882-4b3c-925c-4094381708f1',
  },
  files: {
    uri: 'https://www.figma.com/api/mcp/asset/37a1b243-0e31-4164-9f80-aafd9bc3f6a0',
  },
  filesActive: {
    uri: 'https://www.figma.com/api/mcp/asset/37a1b243-0e31-4164-9f80-aafd9bc3f6a0',
  },
  favorites: {
    uri: 'https://www.figma.com/api/mcp/asset/6f279a2c-64be-42de-93c8-06c9ed541152',
  },
  favoritesActive: {
    uri: 'https://www.figma.com/api/mcp/asset/6f279a2c-64be-42de-93c8-06c9ed541152',
  },
  profile: {
    uri: 'https://www.figma.com/api/mcp/asset/9d5d9f13-8906-475a-8a1e-19d4a23e7c9f',
  },
  profileActive: {
    uri: 'https://www.figma.com/api/mcp/asset/9d5d9f13-8906-475a-8a1e-19d4a23e7c9f',
  },
};

// ── Custom Tab Bar (Figma-style) ──────────────────────────────────────────

type TabConfig = {
  key: string;
  label: string;
  icon: { uri: string };
  iconActive: { uri: string };
};

const TAB_CONFIGS: TabConfig[] = [
  { key: 'Home', label: '首页', icon: ICONS.home, iconActive: ICONS.homeActive },
  { key: 'Files', label: '文件', icon: ICONS.files, iconActive: ICONS.filesActive },
  { key: 'Favorites', label: '收藏', icon: ICONS.favorites, iconActive: ICONS.favoritesActive },
  { key: 'Profile', label: '我的', icon: ICONS.profile, iconActive: ICONS.profileActive },
];

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  return (
    <View style={tabStyles.container}>
      {/* Handle indicator */}
      <View style={tabStyles.handle} />
      {/* Tab row */}
      <View style={tabStyles.row}>
        {state.routes.map((route, index) => {
          const isActive = state.index === index;
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
                <View style={tabStyles.activePill}>
                  <Image
                    source={config.iconActive}
                    style={tabStyles.icon}
                    resizeMode="contain"
                  />
                  <Text style={tabStyles.activeLabel}>{config.label}</Text>
                </View>
              ) : (
                <Image
                  source={config.icon}
                  style={[tabStyles.icon, tabStyles.inactiveIcon]}
                  resizeMode="contain"
                />
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
    paddingBottom: 0,
  },
  handle: {
    width: 108,
    height: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.navHandle,
    alignSelf: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.active,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 18,
    paddingVertical: 6,
    gap: 4,
  },
  activeLabel: {
    ...Typography.tabLabel,
    color: Colors.textOnDark,
  },
  icon: {
    width: 28,
    height: 28,
  },
  inactiveIcon: {
    opacity: 0.55,
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