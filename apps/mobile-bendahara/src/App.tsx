/**
 * SIM MADIN — Bendahara Mobile App (V1 Complete)
 * Login: Email + Password (Supabase Auth)
 * Fitur: Dashboard keuangan, Input pembayaran, Daftar tunggakan, Riwayat
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
import { createClient } from "@supabase/supabase-js"
import * as SecureStore from "expo-secure-store"
import { formatRupiah, formatDate, STATUS_STYLES, PAYMENT_METHODS } from "../../../packages/mobile-shared/src"

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
  const res = await fetch(`${API_BASE_URL}${path}`, { headers: authToken ? { Authorization: `Bearer ${authToken}` } : {} })
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
  primary: "#7c3aed", primaryLight: "#ede9fe", primaryDark: "#5b21b6",
  background: "#f8fafc", card: "#ffffff", text: "#1e293b", textMuted: "#64748b",
  border: "#e2e8f0", danger: "#dc2626", dangerLight: "#fee2e2",
  warning: "#d97706", warningLight: "#fef3c7",
  success: "#059669", successLight: "#d1fae5",
  white: "#ffffff",
}

// ============================================================================
// LOGIN SCREEN
// ============================================================================
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("bendahara@madrasah.test")
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
          <Ionicons name="wallet" size={80} color={Colors.primary} />
          <Text style={styles.loginTitle}>SIM MADIN</Text>
          <Text style={styles.loginSubtitle}>Bendahara</Text>
        </View>
        <View style={styles.loginCard}>
          <Text style={styles.loginCardTitle}>Masuk sebagai Bendahara</Text>
          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <Text style={styles.label}>Password</Text>
          <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry />
          <TouchableOpacity style={[styles.loginButton, loading && { opacity: 0.6 }]} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.loginButtonText}>Masuk</Text>}
          </TouchableOpacity>
          <Text style={styles.demoText}>Demo: bendahara@madrasah.test / admin123</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

// ============================================================================
// DASHBOARD SCREEN
// ============================================================================
function DashboardScreen({ onLogout, navigation }: { onLogout: () => void; navigation: any }) {
  const [payments, setPayments] = useState<any[]>([])
  const [tagihan, setTagihan] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [payRes, tagihanRes] = await Promise.all([
        apiGet("/api/admin/pembayaran?limit=10"),
        apiGet("/api/admin/tagihan?status=BELUM_BAYAR"),
      ])
      setPayments(payRes.data || [])
      setTagihan(tagihanRes.data || [])
    } catch (e: any) { Alert.alert("Error", e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const totalIncome = payments.filter(p => p.status === "VERIFIED").reduce((s, p) => s + p.amount, 0)
  const totalOutstanding = tagihan.reduce((s, t) => s + (t.amount - t.paidAmount), 0)

  const menuItems = [
    { id: "bayar", title: "Input Pembayaran", icon: "cash", color: Colors.success, bg: Colors.successLight, onPress: () => navigation.navigate("PembayaranInput") },
    { id: "tunggakan", title: "Daftar Tunggakan", icon: "warning", color: Colors.danger, bg: Colors.dangerLight, onPress: () => navigation.navigate("TunggakanList") },
    { id: "riwayat", title: "Riwayat Pembayaran", icon: "time", color: Colors.primary, bg: Colors.primaryLight, onPress: () => navigation.navigate("RiwayatList") },
  ]

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard Bendahara</Text>
        <TouchableOpacity onPress={onLogout}>
          <Ionicons name="log-out-outline" size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: Colors.success }]}>
            <Text style={styles.statLabel}>Pemasukan (10 trxs)</Text>
            <Text style={styles.statValue}>{formatRupiah(totalIncome)}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: Colors.danger }]}>
            <Text style={styles.statLabel}>Tunggakan ({tagihan.length})</Text>
            <Text style={styles.statValue}>{formatRupiah(totalOutstanding)}</Text>
          </View>
        </View>

        {/* Menu */}
        <View style={styles.menuGrid}>
          {menuItems.map(item => (
            <TouchableOpacity key={item.id} style={styles.menuCard} onPress={item.onPress}>
              <View style={[styles.menuIcon, { backgroundColor: item.bg }]}>
                <Ionicons name={item.icon as any} size={28} color={item.color} />
              </View>
              <Text style={styles.menuTitle}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Payments */}
        <Text style={styles.sectionTitle}>Pembayaran Terbaru</Text>
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
        ) : payments.length === 0 ? (
          <View style={styles.emptyCard}><Text style={styles.emptyText}>Belum ada pembayaran</Text></View>
        ) : (
          payments.slice(0, 5).map((p, i) => (
            <View key={i} style={styles.paymentCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.paymentSantri}>{p.santri?.name || "-"}</Text>
                <Text style={styles.paymentInvoice}>{p.invoiceNo}</Text>
                <Text style={styles.paymentDate}>{formatDate(p.paymentDate, true)}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.paymentAmount}>{formatRupiah(p.amount)}</Text>
                <View style={[styles.statusBadge, { backgroundColor: p.status === "VERIFIED" ? Colors.successLight : Colors.warningLight }]}>
                  <Text style={[styles.statusText, { color: p.status === "VERIFIED" ? Colors.success : Colors.warning }]}>
                    {STATUS_STYLES[p.status]?.label || p.status}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

// ============================================================================
// PEMBAYARAN INPUT SCREEN
// ============================================================================
function PembayaranInputScreen({ navigation }: { navigation: any }) {
  const [santriList, setSantriList] = useState<any[]>([])
  const [tagihanList, setTagihanList] = useState<any[]>([])
  const [selectedSantri, setSelectedSantri] = useState("")
  const [selectedTagihan, setSelectedTagihan] = useState("")
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState("TUNAI")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [searchText, setSearchText] = useState("")

  const loadSantri = useCallback(async () => {
    try {
      setLoading(true)
      const res = await apiGet("/api/admin/santri?status=AKTIF")
      setSantriList(res.data || [])
    } catch (e: any) { Alert.alert("Error", e.message) }
    finally { setLoading(false) }
  }, [])

  const loadTagihan = useCallback(async () => {
    if (!selectedSantri) { setTagihanList([]); return }
    try {
      const res = await apiGet(`/api/admin/tagihan?santriId=${selectedSantri}`)
      const unpaid = (res.data || []).filter((t: any) => t.status !== "LUNAS")
      setTagihanList(unpaid)
    } catch (e: any) { Alert.alert("Error", e.message) }
  }, [selectedSantri])

  useEffect(() => { loadSantri() }, [loadSantri])
  useEffect(() => { loadTagihan() }, [loadTagihan])

  const selectTagihan = (tagihanId: string, tagihanAmount: number) => {
    setSelectedTagihan(tagihanId)
    setAmount(String(tagihanAmount - (tagihanList.find(t => t.id === tagihanId)?.paidAmount || 0)))
  }

  const handleSave = async () => {
    if (!selectedSantri || !amount || Number(amount) <= 0) {
      Alert.alert("Validasi", "Pilih santri dan isi nominal")
      return
    }
    setSaving(true)
    try {
      await apiPost("/api/admin/pembayaran", {
        santriId: selectedSantri,
        tagihanId: selectedTagihan || undefined,
        amount: Number(amount),
        paymentMethod: method,
      })
      Alert.alert("Berhasil", `Pembayaran ${formatRupiah(Number(amount))} tercatat`)
      navigation.goBack()
    } catch (e: any) { Alert.alert("Gagal", e.message) }
    finally { setSaving(false) }
  }

  const filteredSantri = santriList.filter(s =>
    !searchText || s.name.toLowerCase().includes(searchText.toLowerCase()) || s.nis.includes(searchText)
  )

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Input Pembayaran</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Search Santri */}
        <Text style={styles.label}>Cari Santri</Text>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={Colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Nama atau NIS..."
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        {/* Santri List */}
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
        ) : (
          <View>
            {filteredSantri.slice(0, 5).map(s => (
              <TouchableOpacity
                key={s.id}
                style={[styles.santriOption, selectedSantri === s.id && styles.santriOptionActive]}
                onPress={() => { setSelectedSantri(s.id); setSelectedTagihan(""); setAmount("") }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.santriOptionName}>{s.name}</Text>
                  <Text style={styles.santriOptionNis}>{s.nis} • {s.kelas?.name}</Text>
                </View>
                {selectedSantri === s.id && <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />}
              </TouchableOpacity>
            ))}
            {filteredSantri.length > 5 && (
              <Text style={styles.moreText}>+{filteredSantri.length - 5} santri lainnya (ketik untuk filter)</Text>
            )}
          </View>
        )}

        {/* Tagihan List (if santri selected) */}
        {selectedSantri && tagihanList.length > 0 && (
          <View>
            <Text style={styles.label}>Tagihan Belum Lunas</Text>
            {tagihanList.map(t => (
              <TouchableOpacity
                key={t.id}
                style={[styles.tagihanOption, selectedTagihan === t.id && styles.tagihanOptionActive]}
                onPress={() => selectTagihan(t.id, t.amount)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.tagihanOptionName}>{t.jenisTagihan?.name}</Text>
                  <Text style={styles.tagihanOptionDesc}>
                    Total: {formatRupiah(t.amount)} • Sisa: {formatRupiah(t.amount - t.paidAmount)}
                  </Text>
                </View>
                {selectedTagihan === t.id && <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Amount */}
        <Text style={styles.label}>Nominal Pembayaran</Text>
        <View style={styles.amountContainer}>
          <Text style={styles.amountPrefix}>Rp</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={(v) => setAmount(v.replace(/\D/g, ""))}
            keyboardType="numeric"
            placeholder="0"
          />
        </View>

        {/* Method */}
        <Text style={styles.label}>Metode Pembayaran</Text>
        <View style={styles.methodRow}>
          {PAYMENT_METHODS.map(m => (
            <TouchableOpacity
              key={m.value}
              style={[styles.methodBtn, method === m.value && styles.methodBtnActive]}
              onPress={() => setMethod(m.value)}
            >
              <Text style={[styles.methodBtnText, method === m.value && styles.methodBtnTextActive]}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveButton, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color={Colors.white} /> : (
            <>
              <Ionicons name="save" size={20} color={Colors.white} />
              <Text style={styles.saveButtonText}>Catat Pembayaran</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

// ============================================================================
// TUNGAKAN LIST SCREEN
// ============================================================================
function TunggakanListScreen({ navigation }: { navigation: any }) {
  const [tagihan, setTagihan] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await apiGet("/api/admin/tagihan?status=BELUM_BAYAR")
      setTagihan(res.data || [])
    } catch (e: any) { Alert.alert("Error", e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const totalOutstanding = tagihan.reduce((s, t) => s + (t.amount - t.paidAmount), 0)

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daftar Tunggakan</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total Tunggakan ({tagihan.length} tagihan)</Text>
        <Text style={styles.totalValue}>{formatRupiah(totalOutstanding)}</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={tagihan}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.tunggakanCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.tunggakanName}>{item.santri?.name}</Text>
                <Text style={styles.tunggakanNis}>{item.santri?.nis} • {item.kelas?.name}</Text>
                <Text style={styles.tunggakanJenis}>{item.jenisTagihan?.name}</Text>
                <Text style={styles.tunggakanDesc}>{item.description || formatDate(item.dueDate || item.createdAt)}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.tunggakanAmount}>{formatRupiah(item.amount - item.paidAmount)}</Text>
                <View style={[styles.statusBadge, { backgroundColor: Colors.dangerLight }]}>
                  <Text style={[styles.statusText, { color: Colors.danger }]}>{STATUS_STYLES[item.status]?.label || item.status}</Text>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyCard}>
              <Ionicons name="checkmark-circle" size={48} color={Colors.success} />
              <Text style={styles.emptyText}>Tidak ada tunggakan 🎉</Text>
            </View>
          )}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </SafeAreaView>
  )
}

// ============================================================================
// RIWAYAT LIST SCREEN
// ============================================================================
function RiwayatListScreen({ navigation }: { navigation: any }) {
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await apiGet("/api/admin/pembayaran?limit=50")
      setPayments(res.data || [])
    } catch (e: any) { Alert.alert("Error", e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const total = payments.filter(p => p.status === "VERIFIED").reduce((s, p) => s + p.amount, 0)

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Riwayat Pembayaran</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={[styles.totalCard, { backgroundColor: Colors.success }]}>
        <Text style={styles.totalLabel}>Total Pemasukan ({payments.length} transaksi)</Text>
        <Text style={styles.totalValue}>{formatRupiah(total)}</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={payments}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.paymentCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.paymentSantri}>{item.santri?.name || "-"}</Text>
                <Text style={styles.paymentInvoice}>{item.invoiceNo}</Text>
                <Text style={styles.paymentDate}>{formatDate(item.paymentDate, true)}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.paymentAmount}>{formatRupiah(item.amount)}</Text>
                <View style={[styles.statusBadge, { backgroundColor: item.status === "VERIFIED" ? Colors.successLight : Colors.warningLight }]}>
                  <Text style={[styles.statusText, { color: item.status === "VERIFIED" ? Colors.success : Colors.warning }]}>
                    {STATUS_STYLES[item.status]?.label || item.status}
                  </Text>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyCard}><Text style={styles.emptyText}>Belum ada pembayaran</Text></View>
          )}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
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
          <>
            <Stack.Screen name="Dashboard">
              {({ navigation }) => (
                <DashboardScreen
                  navigation={navigation}
                  onLogout={async () => { await getSupabase().auth.signOut(); await SecureStore.deleteItemAsync("authToken"); authToken = null; setIsLoggedIn(false) }}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="PembayaranInput" component={PembayaranInputScreen} />
            <Stack.Screen name="TunggakanList" component={TunggakanListScreen} />
            <Stack.Screen name="RiwayatList" component={RiwayatListScreen} />
          </>
        ) : (
          <Stack.Screen name="Login">{() => <LoginScreen onLogin={() => setIsLoggedIn(true)} />}</Stack.Screen>
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
  label: { fontSize: 12, fontWeight: "600", color: Colors.text, marginTop: 16, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16, color: Colors.text },
  loginButton: { backgroundColor: Colors.primary, borderRadius: 8, paddingVertical: 14, alignItems: "center", marginTop: 24 },
  loginButtonText: { color: Colors.white, fontSize: 16, fontWeight: "600" },
  demoText: { fontSize: 12, color: Colors.textMuted, textAlign: "center", marginTop: 16 },
  screen: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 12, paddingTop: 48 },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: "600", color: Colors.white },
  content: { flex: 1, padding: 16 },
  statsContainer: { flexDirection: "row", gap: 12, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: 12, padding: 16, elevation: 2 },
  statLabel: { fontSize: 11, color: Colors.white, opacity: 0.9 },
  statValue: { fontSize: 18, fontWeight: "bold", color: Colors.white, marginTop: 4 },
  menuGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 24 },
  menuCard: { backgroundColor: Colors.white, borderRadius: 12, padding: 20, width: "47%", alignItems: "center", elevation: 1 },
  menuIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  menuTitle: { fontSize: 13, fontWeight: "500", color: Colors.text, textAlign: "center" },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: Colors.text, marginBottom: 12 },
  paymentCard: { backgroundColor: Colors.white, borderRadius: 12, padding: 16, marginBottom: 8, flexDirection: "row", justifyContent: "space-between", elevation: 1 },
  paymentSantri: { fontSize: 15, fontWeight: "500", color: Colors.text },
  paymentInvoice: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  paymentDate: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  paymentAmount: { fontSize: 16, fontWeight: "600", color: Colors.success },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
  statusText: { fontSize: 10, fontWeight: "600" },
  emptyCard: { backgroundColor: Colors.white, borderRadius: 12, padding: 24, alignItems: "center" },
  emptyText: { fontSize: 14, color: Colors.textMuted, marginTop: 8 },
  // Pembayaran Input
  searchContainer: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: Colors.white },
  searchInput: { flex: 1, paddingVertical: 8, fontSize: 14, color: Colors.text },
  santriOption: { backgroundColor: Colors.white, borderRadius: 8, padding: 12, marginBottom: 4, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: Colors.border },
  santriOptionActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  santriOptionName: { fontSize: 14, fontWeight: "500", color: Colors.text },
  santriOptionNis: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  moreText: { fontSize: 12, color: Colors.textMuted, textAlign: "center", paddingVertical: 8 },
  tagihanOption: { backgroundColor: Colors.white, borderRadius: 8, padding: 12, marginBottom: 4, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: Colors.border },
  tagihanOptionActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  tagihanOptionName: { fontSize: 14, fontWeight: "500", color: Colors.text },
  tagihanOptionDesc: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  amountContainer: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 12, backgroundColor: Colors.white },
  amountPrefix: { fontSize: 18, fontWeight: "600", color: Colors.textMuted, marginRight: 8 },
  amountInput: { flex: 1, paddingVertical: 12, fontSize: 24, fontWeight: "bold", color: Colors.text },
  methodRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  methodBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white },
  methodBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  methodBtnText: { fontSize: 12, color: Colors.textMuted },
  methodBtnTextActive: { color: Colors.white, fontWeight: "600" },
  saveButton: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 24, elevation: 4 },
  saveButtonText: { color: Colors.white, fontSize: 16, fontWeight: "600" },
  // Tunggakan
  totalCard: { margin: 16, borderRadius: 12, padding: 20, backgroundColor: Colors.danger, elevation: 2 },
  totalLabel: { fontSize: 12, color: Colors.white, opacity: 0.9 },
  totalValue: { fontSize: 24, fontWeight: "bold", color: Colors.white, marginTop: 4 },
  tunggakanCard: { backgroundColor: Colors.white, borderRadius: 12, padding: 16, marginBottom: 8, flexDirection: "row", justifyContent: "space-between", elevation: 1 },
  tunggakanName: { fontSize: 15, fontWeight: "500", color: Colors.text },
  tunggakanNis: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  tunggakanJenis: { fontSize: 13, color: Colors.primary, marginTop: 4 },
  tunggakanDesc: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  tunggakanAmount: { fontSize: 16, fontWeight: "600", color: Colors.danger },
})
