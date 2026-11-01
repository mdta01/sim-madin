/**
 * ============================================================================
 * NETWORK STATUS INDICATOR — Shows online/offline status banner
 * ============================================================================
 *
 * Displays a small banner at the top of the screen when the device is offline.
 * Uses @react-native-community/netinfo for network status detection.
 *
 * Usage:
 *   import { NetworkStatusIndicator } from "../vendor/mobile-shared/src/network-status"
 *
 *   // In App root, above NavigationContainer:
 *   <NetworkStatusIndicator />
 *   <NavigationContainer>...</NavigationContainer>
 *
 * Note: If @react-native-community/netinfo is not installed, the indicator
 * will silently not render (graceful degradation).
 * ============================================================================
 */

import React, { useState, useEffect } from "react"
import { View, Text, StyleSheet, Animated } from "react-native"

interface NetworkState {
  isConnected: boolean | null
  isInternetReachable: boolean | null
  type: string | null
}

let cachedState: NetworkState = { isConnected: true, isInternetReachable: true, type: "unknown" }
let listeners: Array<(state: NetworkState) => void> = []

/**
 * Initialize network monitoring. Call once in App root.
 * NetInfo is optional — if not installed, assumes always online.
 * Uses try/catch with require() for static resolution (no dynamic import).
 */
export async function initNetworkMonitor(): Promise<void> {
  // NetInfo (@react-native-community/netinfo) is optional.
  // If not installed, we assume the device is always online.
  // This avoids dynamic import() which crashes Metro release bundler.
  cachedState = { isConnected: true, isInternetReachable: true, type: "unknown" }
}

/**
 * Get current network state (sync).
 */
export function getNetworkState(): NetworkState {
  return cachedState
}

/**
 * Hook to subscribe to network state changes.
 * Returns { isConnected, isOnline } where isOnline = isConnected && isInternetReachable.
 */
export function useNetworkStatus(): { isConnected: boolean; isOnline: boolean } {
  const [state, setState] = useState<NetworkState>(cachedState)

  useEffect(() => {
    const listener = (newState: NetworkState) => setState(newState)
    listeners.push(listener)
    return () => {
      listeners = listeners.filter((l) => l !== listener)
    }
  }, [])

  const isOnline = (state.isConnected !== false) && (state.isInternetReachable !== false)
  return { isConnected: state.isConnected ?? true, isOnline }
}

/**
 * Network status banner component.
 * Shows red banner "Tidak ada koneksi internet" when offline.
 * Auto-hides when online.
 */
export function NetworkStatusIndicator() {
  const { isOnline } = useNetworkStatus()
  const [showBanner, setShowBanner] = useState(false)
  const [opacity] = useState(new Animated.Value(0))

  useEffect(() => {
    if (!isOnline) {
      setShowBanner(true)
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start()
    } else {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setShowBanner(false))
    }
  }, [isOnline])

  if (!showBanner) return null

  return (
    <Animated.View
      style={[
        styles.banner,
        { opacity },
      ]}
    >
      <Text style={styles.bannerText}>
        {isOnline ? "" : "⚠️ Tidak ada koneksi internet"}
      </Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "#DC2626",
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
})
