/**
 * ============================================================================
 * AMBIENT MODULE DECLARATIONS — React Native / Expo / Navigation
 * ============================================================================
 * Purpose:
 *   Allow TypeScript to type-check the Expo mobile apps (apps/mobile-*)
 *   WITHOUT requiring the full React Native / Expo toolchain to be installed
 *   in the Next.js workspace. Real type packages would be installed when
 *   running `expo start` inside each app — but for the root workspace's
 *   `pnpm typecheck:mobile` script, we provide minimal structural types so
 *   tsc can resolve imports and catch real bugs (typos, missing props,
 *   wrong types) without crashing on missing modules.
 *
 * Scope:
 *   - `react-native` (core components: View, Text, TextInput, TouchableOpacity,
 *     StyleSheet, FlatList, ScrollView, ActivityIndicator, SafeAreaView,
 *     StatusBar, Alert, Linking, Modal, Switch, Image, Pressable, KeyboardAvoidingView)
 *   - `expo-secure-store` (getItemAsync / setItemAsync / deleteItemAsync)
 *   - `@expo/vector-icons` (Ionicons + generic icon family)
 *   - `@react-navigation/native` (NavigationContainer, useNavigation, RouteProp)
 *   - `@react-navigation/native-stack` (createNativeStackNavigator)
 *   - `@react-navigation/bottom-tabs` (createBottomTabNavigator)
 *   - `react-native-safe-area-context`, `react-native-screens`,
 *     `react-native-gesture-handler`, `react-native-reanimated`, `expo-status-bar`
 *
 * Notes:
 *   - These are intentionally loose (`any`-typed in most places) so that they
 *     don't generate spurious errors on real code. The goal is to let tsc
 *     verify the rest of the code (your own business logic, type usage, etc.)
 *     without needing the RN ecosystem installed at root.
 *   - When you actually run `expo start` from inside an app dir, the real
 *     type packages take precedence (they're real node_modules, not ambient).
 *
 * Used by: scripts/typecheck-mobile.ts (per-app tsc --noEmit runs).
 * ============================================================================
 */

declare module "react-native" {
  // ── Style system ───────────────────────────────────────────────────────────
  export interface StyleProp<T> { /* opaque */ }
  export type ViewStyle = Record<string, any>
  export type TextStyle = Record<string, any>
  export type ImageStyle = Record<string, any>
  export type FlexStyle = Record<string, any>
  export type LayoutStyle = Record<string, any>
  export interface StyleSheet { create<T extends Record<string, any>>(styles: T): T }

  // ── Core components ────────────────────────────────────────────────────────
  export type ComponentType = React.ComponentType<any>
  export interface ViewProps { style?: StyleProp<ViewStyle>; children?: React.ReactNode; [k: string]: any }
  export interface TextProps { style?: StyleProp<TextStyle>; children?: React.ReactNode; [k: string]: any }
  export interface TextInputProps { style?: StyleProp<TextStyle>; value?: string; onChangeText?: (t: string) => void; [k: string]: any }
  export interface TouchableOpacityProps { style?: StyleProp<ViewStyle>; onPress?: () => void; disabled?: boolean; activeOpacity?: number; children?: React.ReactNode; [k: string]: any }
  export interface PressableProps { style?: StyleProp<ViewStyle>; onPress?: () => void; children?: React.ReactNode; [k: string]: any }
  export interface ScrollViewProps { style?: StyleProp<ViewStyle>; contentContainerStyle?: StyleProp<ViewStyle>; children?: React.ReactNode; [k: string]: any }
  export interface FlatListProps<T = any> { data?: T[]; renderItem?: (info: { item: T; index: number }) => React.ReactNode; keyExtractor?: (item: T, index: number) => string; style?: StyleProp<ViewStyle>; [k: string]: any }
  export interface ImageProps { source?: any; style?: StyleProp<ImageStyle>; [k: string]: any }
  export interface ModalProps { visible?: boolean; animationType?: "none" | "slide" | "fade"; transparent?: boolean; onRequestClose?: () => void; children?: React.ReactNode; [k: string]: any }
  export interface SwitchProps { value?: boolean; onValueChange?: (v: boolean) => void; disabled?: boolean; [k: string]: any }
  export interface KeyboardAvoidingViewProps { behavior?: "padding" | "height" | "position"; style?: StyleProp<ViewStyle>; children?: React.ReactNode; [k: string]: any }
  export interface SafeAreaViewProps { style?: StyleProp<ViewStyle>; children?: React.ReactNode; edges?: any[]; [k: string]: any }
  export interface StatusBarProps { barStyle?: "default" | "light-content" | "dark-content"; backgroundColor?: string; translucent?: boolean; hidden?: boolean; networkActivityIndicatorVisible?: boolean; [k: string]: any }

  export const View: React.ComponentType<ViewProps>
  export const Text: React.ComponentType<TextProps>
  export const TextInput: React.ComponentType<TextInputProps>
  export const TouchableOpacity: React.ComponentType<TouchableOpacityProps>
  export const Pressable: React.ComponentType<PressableProps>
  export const ScrollView: React.ComponentType<ScrollViewProps>
  export const FlatList: React.ComponentType<FlatListProps<any>>
  export const Image: React.ComponentType<ImageProps>
  export const Modal: React.ComponentType<ModalProps>
  export const Switch: React.ComponentType<SwitchProps>
  export const KeyboardAvoidingView: React.ComponentType<KeyboardAvoidingViewProps>
  export const SafeAreaView: React.ComponentType<SafeAreaViewProps>
  export const StatusBar: React.ComponentType<StatusBarProps>
  export const ActivityIndicator: React.ComponentType<{ size?: "small" | "large" | number; color?: string; style?: StyleProp<ViewStyle> }>

  // ── APIs ──────────────────────────────────────────────────────────────────
  export const StyleSheet: StyleSheet
  export const Alert: {
    alert: (title: string, message?: string, buttons?: any[], options?: any) => void
  }
  export const Linking: {
    openURL: (url: string) => Promise<boolean>
    canOpenURL: (url: string) => Promise<boolean>
    getInitialURL: () => Promise<string | null>
  }
  export const Platform: { OS: "ios" | "android" | "web"; select: <T>(spec: { ios?: T; android?: T; web?: T; default: T }) => T; Version?: number | string }
  export const Dimensions: { get: (dim: "window" | "screen") => { width: number; height: number; scale: number; fontScale: number } }
  export const Keyboard: { dismiss: () => void; addListener: (e: string, cb: (e?: any) => void) => { remove: () => void } }
}

declare module "expo-secure-store" {
  export function getItemAsync(key: string): Promise<string | null>
  export function setItemAsync(key: string, value: string): Promise<void>
  export function deleteItemAsync(key: string): Promise<void>
}

declare module "@expo/vector-icons" {
  import * as React from "react"
  export interface IconProps {
    name: string
    size?: number | string
    color?: string
    style?: any
    [k: string]: any
  }
  export class Ionicons extends React.Component<IconProps> {}
  export const MaterialIcons: React.ComponentType<IconProps>
  export const FontAwesome: React.ComponentType<IconProps>
  export const Feather: React.ComponentType<IconProps>
  export const MaterialCommunityIcons: React.ComponentType<IconProps>
  export const Entypo: React.ComponentType<IconProps>
  export const AntDesign: React.ComponentType<IconProps>
  export const SimpleLineIcons: React.ComponentType<IconProps>
  export const Octicons: React.ComponentType<IconProps>
  export const Fontisto: React.ComponentType<IconProps>
  export const Foundation: React.ComponentType<IconProps>
  export const EvilIcons: React.ComponentType<IconProps>
  export const Zocial: React.ComponentType<IconProps>
  export const createIconSet: (fontFamily: string, glyphMap?: any) => React.ComponentType<IconProps>
  export const createIconSetFromFontello: (config: any, fontName: string) => React.ComponentType<IconProps>
  export const createIconSetFromIcoMoon: (config: any, fontName: string) => React.ComponentType<IconProps>
}

declare module "@react-navigation/native" {
  import * as React from "react"
  export interface NavigationContainerRef { navigate: (name: string, params?: any) => void; goBack: () => void; [k: string]: any }
  export interface NavigationContainerProps { children?: React.ReactNode; linking?: any; theme?: any; [k: string]: any }
  export const NavigationContainer: React.ComponentType<NavigationContainerProps>
  export function useNavigation<T = any>(): T
  export function useRoute<T = any>(): T
  export function useFocusEffect(cb: () => void | (() => void)): void
  export type RouteProp<T = any> = T
  export type ParamListBase = Record<string, any>
}

declare module "@react-navigation/native-stack" {
  import * as React from "react"
  export interface NativeStackNavigationOptions { title?: string; headerShown?: boolean; presentation?: "card" | "modal"; [k: string]: any }
  export interface NativeStackScreenProps<TParamList = any, TRouteName extends string | number = string> { navigation: any; route: any }
  export interface NativeStackNavigationProp<TParamList = any, TRouteName extends string | number = string> { navigate: (name: string, params?: any) => void; goBack: () => void; setOptions: (opts: NativeStackNavigationOptions) => void; [k: string]: any }
  export interface NativeStackScreenComponentProps { navigation: NativeStackNavigationProp; route: { name: string; key: string; params?: any } }

  // Internal props for the <Screen> component. Accepts either:
  //   - `component`: a React component to render
  //   - `children`: a render-prop (inline screen pattern, common for auth gates)
  export interface NativeStackScreenConfigProps {
    name: string
    component?: React.ComponentType<NativeStackScreenComponentProps>
    options?: NativeStackNavigationOptions | ((props: { navigation: any; route: any }) => NativeStackNavigationOptions)
    initialParams?: any
    children?: React.ComponentType<NativeStackScreenComponentProps> | React.ReactNode
  }

  export function createNativeStackNavigator<TParamList = any>(): {
    Navigator: React.ComponentType<{ initialRouteName?: string; screenOptions?: NativeStackNavigationOptions | ((props: any) => NativeStackNavigationOptions); children?: React.ReactNode }>
    Screen: React.ComponentType<NativeStackScreenConfigProps>
    Group: React.ComponentType<{ screenOptions?: NativeStackNavigationOptions; children?: React.ReactNode }>
  }
}

declare module "@react-navigation/bottom-tabs" {
  import * as React from "react"
  export interface BottomTabNavigationOptions { title?: string; tabBarIcon?: (props: { focused: boolean; color: string; size: number }) => React.ReactNode; tabBarActiveTintColor?: string; tabBarInactiveTintColor?: string; [k: string]: any }
  export interface BottomTabScreenProps<T = any> { navigation: any; route: any }
  export interface BottomTabNavigationProp<T = any> { navigate: (name: string, params?: any) => void; goBack: () => void; [k: string]: any }
  export function createBottomTabNavigator<T = any>(): {
    Navigator: React.ComponentType<any>
    Screen: React.ComponentType<{ name: string; component: React.ComponentType<any>; options?: any }>
  }
}

declare module "react-native-safe-area-context" {
  import * as React from "react"
  export const SafeAreaProvider: React.ComponentType<{ children?: React.ReactNode }>
  export const SafeAreaConsumer: React.ComponentType<{ children: (insets: any) => React.ReactNode }>
  export function useSafeAreaInsets(): { top: number; right: number; bottom: number; left: number }
  export function useSafeAreaFrame(): { x: number; y: number; width: number; height: number }
}

declare module "react-native-screens" {
  import * as React from "react"
  export function enableScreens(enable?: boolean): void
  export function enableFreeze(enable?: boolean): void
}

declare module "react-native-gesture-handler" {
  import * as React from "react"
  export const GestureHandlerRootView: React.ComponentType<{ children?: React.ReactNode; style?: any }>
  export const Swipeable: React.ComponentType<{ children?: React.ReactNode; [k: string]: any }>
  export const ScrollView: React.ComponentType<{ children?: React.ReactNode; [k: string]: any }>
  export const FlatList: React.ComponentType<{ data?: any[]; renderItem?: (info: any) => React.ReactNode; [k: string]: any }>
  export function TouchableOpacity(props: any): React.ReactElement
}

declare module "react-native-reanimated" {
  import * as React from "react"
  export const Animated: { View: React.ComponentType<any>; Text: React.ComponentType<any>; ScrollView: React.ComponentType<any> }
  export function useSharedValue<T>(initial: T): { value: T }
  export function useAnimatedStyle<T>(cb: () => T): T
  export const Easing: { bezier: (x1: number, y1: number, x2: number, y2: number) => any; linear: () => any; ease: () => any; inOut: (e: any) => any }
  export function withTiming<T>(value: T, config?: any, cb?: (finished: boolean) => void): T
  export function withSpring<T>(value: T, config?: any): T
  export function withDelay<T>(delay: number, value: T): T
  export const defaultStyle: Record<string, any>
}

declare module "expo-status-bar" {
  import * as React from "react"
  export const StatusBar: React.ComponentType<{ style?: "auto" | "inverted" | "light" | "dark"; backgroundColor?: string; [k: string]: any }>
  export function setStatusBarStyle(style: "auto" | "inverted" | "light" | "dark"): void
  export function setStatusBarBackgroundColor(color: string): void
  export function setStatusBarHidden(hidden: boolean): void
}

declare module "expo" {
  export const Constants: { expoConfig?: any; [k: string]: any }
  export function registerRootComponent(component: React.ComponentType<any>): void
  export const SecureStore: { getItemAsync: (k: string) => Promise<string | null>; setItemAsync: (k: string, v: string) => Promise<void>; deleteItemAsync: (k: string) => Promise<void> }
}
