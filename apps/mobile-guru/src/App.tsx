/**
 * SIM MADIN — Guru Mobile App
 * Login: Email + Password (Supabase Auth)
 * Fitur: Jadwal mengajar, Input absensi cepat, Input nilai
 * Backend: API di Netlify + Supabase
 */

import React, { useState, useEffect, useCallback } from "react"
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, SafeAreaView, StatusBar, ScrollView, Alert,
  FlatList, Modal,
} from "react-native"
import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { Ionicons } from "@expo/vector-icons"
import { createClient, SupabaseClient } from "@supabase/supabase-js"
import * as SecureStore from "expo-secure-store"
import { formatRupiah, formatDate, STATUS_STYLES, DAYS, NILAI_TYPES } from "../../../packages/mobile-shared/src"

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "https://sim-madin.netlify.app"
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "https://ooglxextkliuhpequwme.supabase.co"
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vZ2x4ZXh0a2xpdWhwZXF1d21lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyMDYyNzUsImV4cCI6MjEwODc4MjI3NX0.os3Vbdo0TB6z4OrH4b3ZLFQqBpNY1pMN-8LKyhZaK2w"

// Supabase client dengan SecureStore adapter
let supabase: SupabaseClient | null = null
function getSupabase() {
  if (supabase) return supabase
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: {
        getItem: async (k: string) => { try { return await SecureStore.getItemAsync(k) } catch { return null } },
        setItem: async (k: string, v: string) => { try { await SecureStore.setItemAsync(k, v) } catch {} },
        removeItem: async (k: string) => { try { await SecureStore.deleteItemAsync(k) } catch {} },
      },
      autoRefreshToken: true,
      persistSession: true,
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

async function apiPost(path: string, body: any) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error((await res.json())?.error || `Failed: ${res.status}`)
  return res.json()
}

const Colors = {
  primary: "#ea580c", // orange-600 untuk Guru
  primaryLight: "#fed7aa",
  primaryDark: "#c2410c",
  background: "#f8fafc",
  card: "#ffffff",
  text: "#1e293b",
  textMuted: "#64748b",
  border: "#e2e8f0",
  danger: "#dc2626",
  dangerLight: "#fee2e2",
  warning: "#d97706",
  warningLight: "#fef3c7",
  success: "#059669",
  successLight: "#d1fae5",
  white: "#ffffff",
}

// ============================================================================
// LOGIN SCREEN
// ============================================================================
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("guru@madrasah.test")
  const [password, setPassword] = useState("admin123")
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Validasi", "Email dan password wajib diisi")
      return
    }
    setLoading(true)
    try {
      const sb = getSupabase()
      const { data, error } = await sb.auth.signInWithPassword({ email, password })
      if (error) throw error
      authToken = data.session?.access_token || null
      await SecureStore.setItemAsync("authToken", authToken || "")
      onLogin()
    } catch (e: any) {
      Alert.alert("Login Gagal", e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.loginContainer}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <ScrollView contentContainerStyle={styles.loginScroll}>
        <View style={styles.loginLogo}>
          <Ionicons name="school" size={80} color={Colors.primary} />
          <Text style={styles.loginTitle}>SIM MADIN</Text>
          <Text style={styles.loginSubtitle}>Guru</Text>
        </View>
        <View style={styles.loginCard}>
          <Text style={styles.loginCardTitle}>Masuk sebagai Guru</Text>
          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="guru@madrasah.test" />
          <Text style={styles.label}>Password</Text>
          <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" />
          <TouchableOpacity style={[styles.loginButton, loading && { opacity: 0.6 }]} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.loginButtonText}>Masuk</Text>}
          </TouchableOpacity>
          <Text style={styles.demoText}>Demo: guru@madrasah.test / admin123</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

// ============================================================================
// DASHBOARD SCREEN
// ============================================================================
function DashboardScreen({ onLogout }: { onLogout: () => void }) {
  const [jadwal, setJadwal] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadJadwal = useCallback(async () => {
    try {
      setLoading(true)
      const res = await apiGet("/api/admin/jadwal")
      setJadwal(res.data || [])
    } catch (e: any) {
      Alert.alert("Error", e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadJadwal() }, [loadJadwal])

  const today = new Date().getDay() || 7 // 1=Senin, 7=Ahad
  const todayJadwal = jadwal.filter(j => j.dayOfWeek === today)
  const otherJadwal = jadwal.filter(j => j.dayOfWeek !== today)

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard Guru</Text>
        <TouchableOpacity onPress={onLogout}>
          <Ionicons name="log-out-outline" size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>Jadwal Hari Ini ({DAYS.find(d => d.value === today)?.label || "-"})</Text>
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
        ) : todayJadwal.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Tidak ada jadwal hari ini 🎉</Text>
          </View>
        ) : (
          todayJadwal.map((j, i) => (
            <View key={i} style={styles.jadwalCard}>
              <View style={styles.jadwalTime}>
                <Text style={styles.jadwalStartTime}>{j.startTime}</Text>
                <Text style={styles.jadwalEndTime}>{j.endTime}</Text>
              </View>
              <View style={styles.jadwalInfo}>
                <Text style={styles.jadwalMapel}>{j.mapel?.name}</Text>
                <Text style={styles.jadwalKelas}>{j.kelas?.name}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
            </View>
          ))
        )}

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Jadwal Lain</Text>
        {otherJadwal.length === 0 ? (
          <Text style={styles.emptyText}>Tidak ada jadwal lain</Text>
        ) : (
          otherJadwal.map((j, i) => (
            <View key={i} style={styles.jadwalCard}>
              <View style={styles.jadwalTime}>
                <Text style={styles.jadwalStartTime}>{j.startTime}</Text>
                <Text style={styles.jadwalEndText}>{DAYS.find(d => d.value === j.dayOfWeek)?.short}</Text>
              </View>
              <View style={styles.jadwalInfo}>
                <Text style={styles.jadwalMapel}>{j.mapel?.name}</Text>
                <Text style={styles.jadwalKelas}>{j.kelas?.name}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

// ============================================================================
// APP ROOT
// ============================================================================
const Stack = createNativeStackNavigator()

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function checkSession() {
      const token = await SecureStore.getItemAsync("authToken")
      if (token) {
        authToken = token
        const sb = getSupabase()
        const { data } = await sb.auth.getSession()
        if (data.session) {
          authToken = data.session.access_token
          setIsLoggedIn(true)
        }
      }
      setChecking(false)
    }
    checkSession()
  }, [])

  if (checking) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.primary }}>
        <ActivityIndicator size="large" color={Colors.white} />
      </View>
    )
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isLoggedIn ? (
          <Stack.Screen name="Dashboard">
            {() => (
              <DashboardScreen
                onLogout={async () => {
                  const sb = getSupabase()
                  await sb.auth.signOut()
                  await SecureStore.deleteItemAsync("authToken")
                  authToken = null
                  setIsLoggedIn(false)
                }}
              />
            )}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="Login">
            {() => <LoginScreen onLogin={() => setIsLoggedIn(true)} />}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}

// ============================================================================
// STYLES
// ============================================================================
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
  sectionTitle: { fontSize: 16, fontWeight: "600", color: Colors.text, marginBottom: 12 },
  jadwalCard: { backgroundColor: Colors.white, borderRadius: 12, padding: 16, marginBottom: 8, flexDirection: "row", alignItems: "center", elevation: 1 },
  jadwalTime: { width: 60, alignItems: "center" },
  jadwalStartTime: { fontSize: 14, fontWeight: "600", color: Colors.primary },
  jadwalEndTime: { fontSize: 11, color: Colors.textMuted },
  jadwalEndText: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  jadwalInfo: { flex: 1, marginLeft: 12 },
  jadwalMapel: { fontSize: 15, fontWeight: "500", color: Colors.text },
  jadwalKelas: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  emptyCard: { backgroundColor: Colors.white, borderRadius: 12, padding: 24, alignItems: "center" },
  emptyText: { fontSize: 14, color: Colors.textMuted },
})
