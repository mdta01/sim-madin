/**
 * SIM MADIN — Kepala Madrasah Mobile App
 * Login: Email + Password (Supabase Auth)
 * Fitur: Dashboard monitoring (statistik santri, guru, keuangan, absensi)
 */

import React, { useState, useEffect, useCallback } from "react"
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, SafeAreaView, StatusBar, ScrollView, Alert,
} from "react-native"
import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { Ionicons } from "@expo/vector-icons"
import { createClient } from "@supabase/supabase-js"
import * as SecureStore from "expo-secure-store"
import { formatRupiah, formatDate } from "../../../packages/mobile-shared/src"

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "https://sim-madin.netlify.app"
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "https://ooglxextkliuhpequwme.supabase.co"
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vZ2x4ZXh0a2xpdWhwZXF1d21lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyMDYyNzUsImV4cCI6MjEwODc4MjI3NX0.os3Vbdo0TB6z4OrH4b3ZLFQqBpNY1pMN-8LKyhZaK2w"

let supabase: any = null
function getSupabase() {
  if (supabase) return supabase
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: {
        getItem: async (k: string) => { try { return await SecureStore.getItemAsync(k) } catch { return null } },
        setItem: async (k: string, v: string) => { try { await SecureStore.setItemAsync(k, v) } catch {} },
        removeItem: async (k: string) => { try { await SecureStore.deleteItemAsync(k) } catch {} },
      },
      autoRefreshToken: true, persistSession: true,
    },
  })
  return supabase
}

let authToken: string | null = null

async function apiGet(path: string) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
  })
  if (!res.ok) throw new Error((await res.json())?.error || `Failed: ${res.status}`)
  return res.json()
}

const Colors = {
  primary: "#2563eb", // blue-600
  primaryLight: "#dbeafe",
  background: "#f8fafc",
  card: "#ffffff",
  text: "#1e293b",
  textMuted: "#64748b",
  border: "#e2e8f0",
  success: "#059669",
  successLight: "#d1fae5",
  danger: "#dc2626",
  dangerLight: "#fee2e2",
  warning: "#d97706",
  warningLight: "#fef3c7",
  white: "#ffffff",
}

// Login
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("kepala@madrasah.test")
  const [password, setPassword] = useState("admin123")
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    try {
      const { data, error } = await getSupabase().auth.signInWithPassword({ email, password })
      if (error) throw error
      authToken = data.session?.access_token
      await SecureStore.setItemAsync("authToken", authToken || "")
      onLogin()
    } catch (e: any) { Alert.alert("Login Gagal", e.message) }
    finally { setLoading(false) }
  }

  return (
    <SafeAreaView style={styles.loginContainer}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <ScrollView contentContainerStyle={styles.loginScroll}>
        <View style={styles.loginLogo}>
          <Ionicons name="analytics" size={80} color={Colors.primary} />
          <Text style={styles.loginTitle}>SIM MADIN</Text>
          <Text style={styles.loginSubtitle}>Kepala Madrasah</Text>
        </View>
        <View style={styles.loginCard}>
          <Text style={styles.loginCardTitle}>Masuk sebagai Kepala</Text>
          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <Text style={styles.label}>Password</Text>
          <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry />
          <TouchableOpacity style={[styles.loginButton, loading && { opacity: 0.6 }]} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.loginButtonText}>Masuk</Text>}
          </TouchableOpacity>
          <Text style={styles.demoText}>Demo: kepala@madrasah.test / admin123</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

// Dashboard
function DashboardScreen({ onLogout }: { onLogout: () => void }) {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await apiGet("/api/admin/dashboard")
      setStats(res)
    } catch (e: any) { Alert.alert("Error", e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const statCards = stats ? [
    { label: "Total Santri", value: stats.stats.totalSantri, icon: "people", color: Colors.success, bg: Colors.successLight },
    { label: "Total Guru", value: stats.stats.totalGuru, icon: "school", color: Colors.primary, bg: Colors.primaryLight },
    { label: "Total Kelas", value: stats.stats.totalKelas, icon: "grid", color: "#7c3aed", bg: "#ede9fe" },
    { label: "Pemasukan Bulan Ini", value: formatRupiah(stats.stats.totalIncomeThisMonth), icon: "cash", color: Colors.success, bg: Colors.successLight },
    { label: "Tunggakan", value: formatRupiah(stats.stats.totalOutstanding), icon: "warning", color: Colors.danger, bg: Colors.dangerLight },
    { label: "Tagihan Lunas", value: stats.stats.tagihanLunas, icon: "checkmark-circle", color: Colors.success, bg: Colors.successLight },
  ] : []

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard Kepala</Text>
        <TouchableOpacity onPress={onLogout}>
          <Ionicons name="log-out-outline" size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView style={styles.content}>
          <Text style={styles.sectionTitle}>Statistik Madrasah</Text>
          <View style={styles.statsGrid}>
            {statCards.map((s, i) => (
              <View key={i} style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: s.bg }]}>
                  <Ionicons name={s.icon as any} size={24} color={s.color} />
                </View>
                <Text style={styles.statLabel}>{s.label}</Text>
                <Text style={styles.statValue}>{s.value}</Text>
              </View>
            ))}
          </View>

          {stats.absensiToday && (
            <>
              <Text style={styles.sectionTitle}>Absensi Hari Ini</Text>
              <View style={styles.absensiRow}>
                <View style={styles.absensiCard}>
                  <Text style={styles.absensiValue}>{stats.absensiToday.hadir}</Text>
                  <Text style={styles.absensiLabel}>Hadir</Text>
                </View>
                <View style={styles.absensiCard}>
                  <Text style={styles.absensiValue}>{stats.absensiToday.sakit}</Text>
                  <Text style={styles.absensiLabel}>Sakit</Text>
                </View>
                <View style={styles.absensiCard}>
                  <Text style={styles.absensiValue}>{stats.absensiToday.izin}</Text>
                  <Text style={styles.absensiLabel}>Izin</Text>
                </View>
                <View style={styles.absensiCard}>
                  <Text style={styles.absensiValue}>{stats.absensiToday.alfa}</Text>
                  <Text style={styles.absensiLabel}>Alfa</Text>
                </View>
              </View>
            </>
          )}

          {stats.santriPerKelas && stats.santriPerKelas.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Distribusi Santri per Kelas</Text>
              {stats.santriPerKelas.map((k: any, i: number) => (
                <View key={i} style={styles.kelasCard}>
                  <Text style={styles.kelasName}>{k.name}</Text>
                  <Text style={styles.kelasCount}>{k.count} santri</Text>
                  <Text style={styles.kelasWali}>Wali: {k.waliKelas}</Text>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const Stack = createNativeStackNavigator()

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function check() {
      const token = await SecureStore.getItemAsync("authToken")
      if (token) {
        authToken = token
        const { data } = await getSupabase().auth.getSession()
        if (data.session) { authToken = data.session.access_token; setIsLoggedIn(true) }
      }
      setChecking(false)
    }
    check()
  }, [])

  if (checking) {
    return <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.primary }}><ActivityIndicator size="large" color={Colors.white} /></View>
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isLoggedIn ? (
          <Stack.Screen name="Dashboard">
            {() => <DashboardScreen onLogout={async () => { await getSupabase().auth.signOut(); await SecureStore.deleteItemAsync("authToken"); authToken = null; setIsLoggedIn(false) }} />}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="Login">{() => <LoginScreen onLogin={() => setIsLoggedIn(true)} />}</Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}

const styles = StyleSheet.create({
  loginContainer: { flex: 1, backgroundColor: Colors.primary },
  loginScroll: { flexGrow: 1, justifyContent: "center", padding: 24 },
  loginLogo: { alignItems: "center", marginBottom: 32 },
  loginTitle: { fontSize: 28, fontWeight: "bold", color: Colors.white, marginTop: 8 },
  loginSubtitle: { fontSize: 16, color: Colors.white, opacity: 0.8 },
  loginCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 24, elevation: 4 },
  loginCardTitle: { fontSize: 20, fontWeight: "bold", color: Colors.text, marginBottom: 20 },
  label: { fontSize: 12, fontWeight: "600", color: Colors.text, marginTop: 12, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16, color: Colors.text },
  loginButton: { backgroundColor: Colors.primary, borderRadius: 8, paddingVertical: 14, alignItems: "center", marginTop: 24 },
  loginButtonText: { color: Colors.white, fontSize: 16, fontWeight: "600" },
  demoText: { fontSize: 12, color: Colors.textMuted, textAlign: "center", marginTop: 16 },
  screen: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 48 },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: Colors.white },
  content: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: Colors.text, marginBottom: 12, marginTop: 8 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statCard: { backgroundColor: Colors.white, borderRadius: 12, padding: 16, width: "47%", elevation: 1 },
  statIcon: { width: 40, height: 40, borderRadius: 8, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  statLabel: { fontSize: 11, color: Colors.textMuted },
  statValue: { fontSize: 20, fontWeight: "bold", color: Colors.text, marginTop: 4 },
  absensiRow: { flexDirection: "row", gap: 8 },
  absensiCard: { flex: 1, backgroundColor: Colors.white, borderRadius: 8, padding: 12, alignItems: "center", elevation: 1 },
  absensiValue: { fontSize: 24, fontWeight: "bold", color: Colors.text },
  absensiLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },
  kelasCard: { backgroundColor: Colors.white, borderRadius: 12, padding: 16, marginBottom: 8, elevation: 1 },
  kelasName: { fontSize: 15, fontWeight: "600", color: Colors.text },
  kelasCount: { fontSize: 14, color: Colors.primary, marginTop: 4 },
  kelasWali: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
})
