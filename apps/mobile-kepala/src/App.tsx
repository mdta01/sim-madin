/**
 * SIM MADIN — Kepala Madrasah Mobile App
 * Login: Email + Password (Supabase Auth)
 * Fitur: Dashboard monitoring (statistik santri, guru, keuangan, absensi)
 */

import React, { useState, useEffect, useCallback } from "react"
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, SafeAreaView, StatusBar, ScrollView, Alert,
  FlatList,
} from "react-native"
import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { Ionicons } from "@expo/vector-icons"
import { createClient } from "@supabase/supabase-js"
import * as SecureStore from "expo-secure-store"
import { formatRupiah, formatDate } from "../vendor/mobile-shared/src"
import { subscribeToTable, subscribeToNotifikasi } from "../vendor/mobile-shared/src/realtime"

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "https://sim-madin.vercel.app"
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
function DashboardScreen({ onLogout, navigation }: { onLogout: () => void; navigation: any }) {
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

          {/* Quick Menu */}
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Monitoring</Text>
          <View style={styles.statsGrid}>
            <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate("MonitorSantri")}>
              <View style={[styles.statIcon, { backgroundColor: Colors.successLight }]}>
                <Ionicons name="people" size={24} color={Colors.success} />
              </View>
              <Text style={styles.menuTitle}>Data Santri</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate("MonitorGuru")}>
              <View style={[styles.statIcon, { backgroundColor: Colors.primaryLight }]}>
                <Ionicons name="school" size={24} color={Colors.primary} />
              </View>
              <Text style={styles.menuTitle}>Data Guru</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate("MonitorAbsensi")}>
              <View style={[styles.statIcon, { backgroundColor: "#dbeafe" }]}>
                <Ionicons name="checkmark-done" size={24} color="#3b82f6" />
              </View>
              <Text style={styles.menuTitle}>Rekap Absensi</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate("MonitorKeuangan")}>
              <View style={[styles.statIcon, { backgroundColor: Colors.warningLight }]}>
                <Ionicons name="wallet" size={24} color={Colors.warning} />
              </View>
              <Text style={styles.menuTitle}>Monitoring Keuangan</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate("MonitorPengumuman")}>
              <View style={[styles.statIcon, { backgroundColor: "#fef3c7" }]}>
                <Ionicons name="megaphone" size={24} color={Colors.warning} />
              </View>
              <Text style={styles.menuTitle}>Pengumuman</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate("MonitorNilai")}>
              <View style={[styles.statIcon, { backgroundColor: "#ede9fe" }]}>
                <Ionicons name="star" size={24} color="#7c3aed" />
              </View>
              <Text style={styles.menuTitle}>Monitoring Nilai</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate("DashboardKepala")}>
              <View style={[styles.statIcon, { backgroundColor: Colors.primaryLight }]}>
                <Ionicons name="bar-chart" size={24} color={Colors.primary} />
              </View>
              <Text style={styles.menuTitle}>Dashboard Analitik</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

// ============================================================================
// MONITORING SCREENS
// ============================================================================

function MonitorListScreen({ navigation, title, endpoint, renderItem }: { navigation: any; title: string; endpoint: string; renderItem: (item: any) => React.ReactNode }) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await apiGet(endpoint)
      setData(res.data || [])
    } catch (e: any) { Alert.alert("Error", e.message) }
    finally { setLoading(false) }
  }, [endpoint])

  useEffect(() => { load() }, [load])

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={{ width: 24 }} />
      </View>
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item: any) => item.id}
          renderItem={({ item }: { item: any }): React.ReactElement => <>{renderItem(item)}</> as React.ReactElement}
          ListEmptyComponent={<View style={styles.emptyCard}><Text style={styles.emptyText}>Tidak ada data</Text></View>}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </SafeAreaView>
  )
}

function MonitorSantriScreen({ navigation }: { navigation: any }) {
  return <MonitorListScreen navigation={navigation} title="Data Santri" endpoint="/api/admin/santri" renderItem={(item: any) => (
    <View style={styles.kelasCard}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryLight, justifyContent: "center", alignItems: "center", marginRight: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: "bold", color: Colors.primary }}>{item.name[0]}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.kelasName}>{item.name}</Text>
          <Text style={styles.kelasWali}>NIS: {item.nis} • {item.kelas?.name || "-"}</Text>
          <Text style={styles.kelasWali}>Wali: {item.wali?.name || "-"}</Text>
        </View>
        <View style={{ backgroundColor: item.status === "AKTIF" ? Colors.successLight : Colors.dangerLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
          <Text style={{ fontSize: 10, color: item.status === "AKTIF" ? Colors.success : Colors.danger }}>{item.status}</Text>
        </View>
      </View>
    </View>
  )} />
}

function MonitorGuruScreen({ navigation }: { navigation: any }) {
  return <MonitorListScreen navigation={navigation} title="Data Guru" endpoint="/api/admin/guru" renderItem={(item: any) => (
    <View style={styles.kelasCard}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryLight, justifyContent: "center", alignItems: "center", marginRight: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: "bold", color: Colors.primary }}>{item.name[0]}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.kelasName}>{item.name}</Text>
          <Text style={styles.kelasWali}>{item.specialization || "Guru"}</Text>
          <Text style={styles.kelasWali}>{item.phone || "-"}</Text>
        </View>
        <View style={{ backgroundColor: item.status === "AKTIF" ? Colors.successLight : Colors.dangerLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
          <Text style={{ fontSize: 10, color: item.status === "AKTIF" ? Colors.success : Colors.danger }}>{item.status}</Text>
        </View>
      </View>
    </View>
  )} />
}

function MonitorAbsensiScreen({ navigation }: { navigation: any }) {
  return <MonitorListScreen navigation={navigation} title="Rekap Absensi" endpoint="/api/admin/absensi?limit=50" renderItem={(item: any) => (
    <View style={styles.kelasCard}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kelasName}>{item.santri?.name}</Text>
          <Text style={styles.kelasWali}>{item.kelas?.name} • {formatDate(item.date)}</Text>
        </View>
        <View style={{ backgroundColor: item.status === "HADIR" ? Colors.successLight : item.status === "SAKIT" ? Colors.warningLight : item.status === "IZIN" ? "#dbeafe" : Colors.dangerLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
          <Text style={{ fontSize: 12, fontWeight: "600", color: item.status === "HADIR" ? Colors.success : item.status === "SAKIT" ? Colors.warning : item.status === "IZIN" ? "#3b82f6" : Colors.danger }}>{item.status}</Text>
        </View>
      </View>
    </View>
  )} />
}

function MonitorKeuanganScreen({ navigation }: { navigation: any }) {
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await apiGet("/api/admin/pembayaran?limit=20")
        setPayments(res.data || [])
      } catch (e: any) { Alert.alert("Error", e.message) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const totalIncome = payments.filter(p => p.status === "VERIFIED").reduce((s, p) => s + p.amount, 0)

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Monitoring Keuangan</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={{ margin: 16, borderRadius: 12, padding: 20, backgroundColor: Colors.success, elevation: 2 }}>
        <Text style={{ fontSize: 12, color: Colors.white, opacity: 0.9 }}>Total Pemasukan (20 trxs)</Text>
        <Text style={{ fontSize: 24, fontWeight: "bold", color: Colors.white, marginTop: 4 }}>{formatRupiah(totalIncome)}</Text>
      </View>
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={payments}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.kelasCard}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.kelasName}>{item.santri?.name || "-"}</Text>
                  <Text style={styles.kelasWali}>{item.invoiceNo}</Text>
                  <Text style={styles.kelasWali}>{formatDate(item.paymentDate, true)}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ fontSize: 16, fontWeight: "600", color: Colors.success }}>{formatRupiah(item.amount)}</Text>
                  <View style={{ backgroundColor: item.status === "VERIFIED" ? Colors.successLight : Colors.warningLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 4 }}>
                    <Text style={{ fontSize: 10, color: item.status === "VERIFIED" ? Colors.success : Colors.warning }}>{item.status}</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </SafeAreaView>
  )
}

function MonitorPengumumanScreen({ navigation }: { navigation: any }) {
  return <MonitorListScreen navigation={navigation} title="Pengumuman" endpoint="/api/admin/pengumuman" renderItem={(item: any) => (
    <View style={styles.kelasCard}>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
        <View style={{ backgroundColor: item.priority === "URGENT" ? Colors.dangerLight : item.priority === "PENTING" ? Colors.warningLight : "#f1f5f9", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
          <Text style={{ fontSize: 10, fontWeight: "600", color: item.priority === "URGENT" ? Colors.danger : item.priority === "PENTING" ? Colors.warning : Colors.textMuted }}>{item.priority}</Text>
        </View>
        <View style={{ backgroundColor: "#dbeafe", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
          <Text style={{ fontSize: 10, color: "#3b82f6" }}>{item.audience}</Text>
        </View>
      </View>
      <Text style={styles.kelasName}>{item.title}</Text>
      <Text style={styles.kelasWali} numberOfLines={3}>{item.content}</Text>
      <Text style={[styles.kelasWali, { fontSize: 11, marginTop: 4 }]}>{formatDate(item.publishedAt, true)}</Text>
    </View>
  )} />
}

// ============================================================================
// V11 — Monitoring Nilai Santri
// Fetch dari /api/admin/nilai?limit=50 (sudah sort by assessmentDate desc)
// ============================================================================
function MonitorNilaiScreen({ navigation }: { navigation: any }) {
  return <MonitorListScreen navigation={navigation} title="Monitoring Nilai" endpoint="/api/admin/nilai?limit=50" renderItem={(item: any) => {
    const kkm = item.mapel?.kkm ?? 70
    const lulus = item.score >= kkm
    const typeColor = item.type === "UAS" ? Colors.danger : item.type === "UTS" ? Colors.warning : Colors.primary
    const typeBg = item.type === "UAS" ? Colors.dangerLight : item.type === "UTS" ? Colors.warningLight : Colors.primaryLight
    return (
      <View style={styles.kelasCard}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.kelasName}>{item.santri?.name || "-"}</Text>
            <Text style={styles.kelasWali}>{item.mapel?.name || "-"} • {item.kelas?.name || "-"}</Text>
            <Text style={[styles.kelasWali, { fontSize: 11, marginTop: 2 }]}>{formatDate(item.assessmentDate)}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 22, fontWeight: "bold", color: lulus ? Colors.success : Colors.danger }}>{item.score}</Text>
            <View style={{ backgroundColor: typeBg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 4 }}>
              <Text style={{ fontSize: 10, fontWeight: "600", color: typeColor }}>{item.type}</Text>
            </View>
          </View>
        </View>
      </View>
    )
  }} />
}

// ============================================================================
// V11 — Dashboard Kepala (Comprehensive Analytics)
// Fetch dari /api/admin/dashboard-kepala
// ============================================================================
function DashboardKepalaScreen({ navigation }: { navigation: any }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await apiGet("/api/admin/dashboard-kepala")
      setData(res.data || res)
    } catch (e: any) { Alert.alert("Error", e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const statCards = data ? [
    { label: "Total Santri", value: String(data.santri?.total ?? 0), icon: "people", color: Colors.success, bg: Colors.successLight },
    { label: "Santri Aktif", value: String(data.santri?.aktif ?? 0), icon: "person", color: Colors.primary, bg: Colors.primaryLight },
    { label: "Guru Aktif", value: String(data.guru?.aktif ?? 0), icon: "school", color: Colors.primary, bg: Colors.primaryLight },
    { label: "Saldo Kas", value: formatRupiah(data.keuangan?.saldo ?? 0), icon: "cash", color: Colors.success, bg: Colors.successLight },
    { label: "Tunggakan", value: formatRupiah(data.keuangan?.totalTunggakan ?? 0), icon: "warning", color: Colors.danger, bg: Colors.dangerLight },
    { label: "Kehadiran", value: `${data.kehadiran?.persentaseHadir ?? 0}%`, icon: "checkmark-done", color: Colors.success, bg: Colors.successLight },
  ] : []

  const topSantri = (data?.akademik?.topSantri || []).slice(0, 5)
  const seringTidakHadir = (data?.kehadiran?.santriSeringTidakHadir || []).slice(0, 5)
  const rekapPerKelas = data?.kehadiran?.rekapPerKelas || []

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dashboard Analitik</Text>
        <View style={{ width: 24 }} />
      </View>
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <ScrollView style={styles.content}>
          {/* Stat cards */}
          <Text style={styles.sectionTitle}>Ringkasan</Text>
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

          {/* Top 5 Santri by avg nilai */}
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Top 5 Santri (by Avg Nilai)</Text>
          {topSantri.length > 0 ? topSantri.map((s: any, i: number) => (
            <View key={i} style={styles.kelasCard}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.kelasName}>#{s.rank} {s.name}</Text>
                  <Text style={styles.kelasWali}>{s.nis} • {s.kelas}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ fontSize: 22, fontWeight: "bold", color: Colors.success }}>{s.avg}</Text>
                  <Text style={{ fontSize: 10, color: Colors.textMuted, marginTop: 2 }}>{s.count} nilai</Text>
                </View>
              </View>
            </View>
          )) : <View style={styles.emptyCard}><Text style={styles.emptyText}>Belum ada data nilai</Text></View>}

          {/* Santri sering tidak hadir (<80%) */}
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Sering Tidak Hadir (≤80%)</Text>
          {seringTidakHadir.length > 0 ? seringTidakHadir.map((s: any, i: number) => (
            <View key={i} style={styles.kelasCard}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.kelasName}>{s.name}</Text>
                  <Text style={styles.kelasWali}>{s.nis} • {s.kelas}</Text>
                  <Text style={[styles.kelasWali, { fontSize: 11 }]}>{s.hadir}/{s.total} hari hadir</Text>
                </View>
                <View style={{ backgroundColor: Colors.dangerLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: Colors.danger }}>{s.persentase}%</Text>
                </View>
              </View>
            </View>
          )) : <View style={styles.emptyCard}><Text style={styles.emptyText}>Semua santri hadir ≥80%</Text></View>}

          {/* Rekap kehadiran per kelas */}
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Rekap Kehadiran per Kelas</Text>
          {rekapPerKelas.length > 0 ? rekapPerKelas.map((k: any, i: number) => {
            const color = k.persentase >= 80 ? Colors.success : k.persentase >= 60 ? Colors.warning : Colors.danger
            const bg = k.persentase >= 80 ? Colors.successLight : k.persentase >= 60 ? Colors.warningLight : Colors.dangerLight
            return (
              <View key={i} style={styles.kelasCard}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.kelasName}>{k.kelas}</Text>
                    <Text style={styles.kelasWali}>{k.hadir}/{k.total} hadir</Text>
                  </View>
                  <View style={{ backgroundColor: bg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color }}>{k.persentase}%</Text>
                  </View>
                </View>
              </View>
            )
          }) : <View style={styles.emptyCard}><Text style={styles.emptyText}>Belum ada data absensi</Text></View>}

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const Stack = createNativeStackNavigator()

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [checking, setChecking] = useState(true)
  // Realtime refresh tick — bumped whenever a subscribed table changes.
  // Drives dashboard stats refresh on Santri/Guru/Payment events.
  const [refreshKey, setRefreshKey] = useState(0)

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

  // ============================================================================
  // Supabase Realtime subscriptions (OPTIONAL — fails silently if unavailable)
  // - Santri   INSERT/UPDATE : data santri berubah → refresh dashboard stats
  // - Guru     INSERT/UPDATE : data guru berubah  → refresh dashboard stats
  // - Payment  INSERT/UPDATE : pembayaran baru    → refresh keuangan stats
  // ============================================================================
  useEffect(() => {
    if (!isLoggedIn) return
    let cancelled = false
    const unsubs: Array<() => void> = []
    ;(async () => {
      try {
        for (const table of ["Santri", "Guru", "Payment"] as const) {
          try {
            const unsub = await subscribeToTable(table, () => {
              setRefreshKey(k => k + 1)
            })
            if (cancelled) { try { unsub() } catch {} }
            else { unsubs.push(unsub) }
          } catch {}
        }
      } catch(e) { /* realtime optional */ }
    })()
    return () => {
      cancelled = true
      unsubs.forEach(u => { try { u() } catch {} })
    }
  }, [isLoggedIn])

  if (checking) {
    return <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.primary }}><ActivityIndicator size="large" color={Colors.white} /></View>
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isLoggedIn ? (
          <>
            <Stack.Screen name="Dashboard">
              {({ navigation }) => <DashboardScreen navigation={navigation} onLogout={async () => { await getSupabase().auth.signOut(); await SecureStore.deleteItemAsync("authToken"); authToken = null; setIsLoggedIn(false) }} />}
            </Stack.Screen>
            <Stack.Screen name="MonitorSantri" component={MonitorSantriScreen} />
            <Stack.Screen name="MonitorGuru" component={MonitorGuruScreen} />
            <Stack.Screen name="MonitorAbsensi" component={MonitorAbsensiScreen} />
            <Stack.Screen name="MonitorKeuangan" component={MonitorKeuanganScreen} />
            <Stack.Screen name="MonitorPengumuman" component={MonitorPengumumanScreen} />
            <Stack.Screen name="MonitorNilai" component={MonitorNilaiScreen} />
            <Stack.Screen name="DashboardKepala" component={DashboardKepalaScreen} />
          </>
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
  menuTitle: { fontSize: 13, fontWeight: "500", color: Colors.text, textAlign: "center", marginTop: 4 },
  emptyCard: { backgroundColor: Colors.white, borderRadius: 12, padding: 24, alignItems: "center" },
  emptyText: { fontSize: 14, color: Colors.textMuted },
})
