/**
 * ============================================================================
 * SKELETON COMPONENTS — Reusable loading placeholders for React Native
 * ============================================================================
 *
 * Provides skeleton loading states that match the layout of actual content,
 * giving users perceived faster loading compared to spinners.
 *
 * Usage:
 *   import { Skeleton, SkeletonList, SkeletonCard } from "../vendor/mobile-shared/src/skeleton"
 *
 *   if (loading) return <SkeletonList items={5} />
 *   if (loading) return <SkeletonCard />
 *   <Skeleton width={120} height={16} />
 * ============================================================================
 */

import React, { useEffect, useRef } from "react"
import { View, Animated, Easing, StyleSheet, ViewStyle, StyleProp } from "react-native"

interface SkeletonProps {
  width?: number | string
  height?: number | string
  borderRadius?: number
  style?: StyleProp<ViewStyle>
}

/**
 * Single skeleton block with shimmer animation.
 */
export function Skeleton({ width = "100%", height = 16, borderRadius = 4, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    )
    animation.start()
    return () => animation.stop()
  }, [opacity])

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  )
}

/**
 * Skeleton for a list item (avatar + 2 text lines).
 * Matches typical FlatList item layout.
 */
export function SkeletonListItem() {
  return (
    <View style={styles.listItem}>
      <Skeleton width={48} height={48} borderRadius={24} />
      <View style={styles.listItemContent}>
        <Skeleton width="60%" height={14} />
        <Skeleton width="40%" height={12} style={{ marginTop: 6 }} />
      </View>
    </View>
  )
}

/**
 * Skeleton list — renders N skeleton list items.
 * Use as FlatList loading placeholder.
 */
export function SkeletonList({ items = 5 }: { items?: number }) {
  return (
    <View style={styles.listContainer}>
      {Array.from({ length: items }).map((_, i) => (
        <SkeletonListItem key={i} />
      ))}
    </View>
  )
}

/**
 * Skeleton for a card with header + content.
 * Matches typical Card layout (title + body text lines).
 */
export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <Skeleton width="50%" height={18} />
      <View style={{ marginTop: 12 }}>
        <Skeleton width="100%" height={14} />
        <Skeleton width="90%" height={14} style={{ marginTop: 8 }} />
        <Skeleton width="70%" height={14} style={{ marginTop: 8 }} />
      </View>
    </View>
  )
}

/**
 * Skeleton for a stat row (4 stat cards in a grid).
 * Matches dashboard stat card layout.
 */
export function SkeletonStatsRow() {
  return (
    <View style={styles.statsRow}>
      {Array.from({ length: 4 }).map((_, i) => (
        <View key={i} style={styles.statCard}>
          <Skeleton width="60%" height={12} />
          <Skeleton width={32} height={24} style={{ marginTop: 6 }} />
        </View>
      ))}
    </View>
  )
}

/**
 * Full-page skeleton with header + stats + list.
 * Use as screen loading placeholder.
 */
export function SkeletonPage({ withStats = true, listItems = 6 }: { withStats?: boolean; listItems?: number }) {
  return (
    <View style={styles.page}>
      {/* Header skeleton */}
      <Skeleton width="40%" height={20} style={{ marginBottom: 16 }} />
      {/* Stats skeleton */}
      {withStats && (
        <View style={{ marginBottom: 16 }}>
          <SkeletonStatsRow />
        </View>
      )}
      {/* List skeleton */}
      <SkeletonList items={listItems} />
    </View>
  )
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: "#E2E8F0", // slate-200
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E2E8F0",
  },
  listItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  listContainer: {
    padding: 8,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  page: {
    flex: 1,
    padding: 16,
    backgroundColor: "#F8FAFC",
  },
})
