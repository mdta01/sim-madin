/**
 * SIM MADIN — Bendahara Mobile App (V1 Complete)
 * Login: Email + Password (Supabase Auth)
 * Fitur: Dashboard keuangan, Input pembayaran, Daftar tunggakan, Riwayat
 */

import React, { useState, useEffect, useCallback } from "react"
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, SafeAreaView, StatusBar, ScrollView, Alert,
  FlatList, Modal, Linking,
} from "react-native"
import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { Ionicons } from "@expo/vector-icons"
import { createClient } from "@supabase/supabase-js"
import * as SecureStore from "expo-secure-store"
import { formatRupiah, formatDate, STATUS_STYLES, PAYMENT_METHODS } from "../vendor/mobile-shared/src"
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
  info: "#3b82f6", infoLight: "#dbeafe",
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
    { id: "tagihan", title: "Data Tagihan", icon: "receipt", color: Colors.primary, bg: Colors.primaryLight, onPress: () => navigation.navigate("TagihanList") },
    { id: "riwayat", title: "Riwayat Pembayaran", icon: "time", color: Colors.info, bg: Colors.infoLight, onPress: () => navigation.navigate("RiwayatList") },
    { id: "kas", title: "Kas & Rekening", icon: "wallet", color: Colors.primary, bg: Colors.primaryLight, onPress: () => navigation.navigate("KasList") },
    { id: "transaksiKas", title: "Transaksi Kas", icon: "swap-horizontal", color: Colors.success, bg: Colors.successLight, onPress: () => navigation.navigate("TransaksiKas") },
    { id: "honorGuru", title: "Honor Guru", icon: "school", color: Colors.warning, bg: Colors.warningLight, onPress: () => navigation.navigate("HonorGuru") },
    { id: "laporan", title: "Laporan Keuangan", icon: "document-text", color: Colors.info, bg: Colors.infoLight, onPress: () => navigation.navigate("Laporan") },
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
// TAGIHAN LIST SCREEN (all tagihan, not just tunggakan)
// ============================================================================
function TagihanListScreen({ navigation }: { navigation: any }) {
  const [tagihan, setTagihan] = useState<any[]>([])
  const [filter, setFilter] = useState<string>("")
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const params = filter ? `?status=${filter}` : ""
      const res = await apiGet(`/api/admin/tagihan${params}`)
      setTagihan(res.data || [])
    } catch (e: any) { Alert.alert("Error", e.message) }
    finally { setLoading(false) }
  }, [filter])

  useEffect(() => { load() }, [load])

  const filters = [
    { value: "", label: "Semua" },
    { value: "LUNAS", label: "Lunas" },
    { value: "CICIL", label: "Cicil" },
    { value: "BELUM_BAYAR", label: "Belum Bayar" },
  ]

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Data Tagihan</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Filter pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
        {filters.map(f => (
          <TouchableOpacity
            key={f.value}
            style={[styles.methodBtn, filter === f.value && styles.methodBtnActive]}
            onPress={() => setFilter(f.value)}
          >
            <Text style={[styles.methodBtnText, filter === f.value && styles.methodBtnTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

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
                <Text style={styles.tunggakanNis}>{item.santri?.nis} • {item.kelas?.name || "-"}</Text>
                <Text style={styles.tunggakanJenis}>{item.jenisTagihan?.name}</Text>
                <Text style={styles.tunggakanDesc}>{item.description || formatDate(item.dueDate || item.createdAt)}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.tunggakanAmount}>{formatRupiah(item.amount)}</Text>
                {item.paidAmount > 0 && <Text style={{ fontSize: 11, color: Colors.success }}>Terbayar: {formatRupiah(item.paidAmount)}</Text>}
                <View style={[styles.statusBadge, { backgroundColor: item.status === "LUNAS" ? Colors.successLight : item.status === "CICIL" ? Colors.warningLight : Colors.dangerLight }]}>
                  <Text style={[styles.statusText, { color: item.status === "LUNAS" ? Colors.success : item.status === "CICIL" ? Colors.warning : Colors.danger }]}>
                    {STATUS_STYLES[item.status]?.label || item.status}
                  </Text>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyCard}><Text style={styles.emptyText}>Tidak ada tagihan</Text></View>
          )}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </SafeAreaView>
  )
}

// ============================================================================
// KAS LIST SCREEN (V5: Kas & Rekening)
// ============================================================================
function KasListScreen({ navigation }: { navigation: any }) {
  const [kasList, setKasList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await apiGet("/api/admin/kas")
      setKasList(res.data || [])
    } catch (e: any) { Alert.alert("Error", e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const totalSaldo = kasList.reduce((s, k) => s + (k.balance || 0), 0)

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kas & Rekening</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={[styles.totalCard, { backgroundColor: Colors.primary }]}>
        <Text style={styles.totalLabel}>Total Saldo ({kasList.length} kas)</Text>
        <Text style={styles.totalValue}>{formatRupiah(totalSaldo)}</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={kasList}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.kasCard}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={[styles.kasIcon, { backgroundColor: item.type === "BANK" ? Colors.primaryLight : Colors.successLight }]}>
                  <Ionicons name={item.type === "BANK" ? "business" : "cash"} size={22} color={item.type === "BANK" ? Colors.primary : Colors.success} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.kasName}>{item.name}</Text>
                  <Text style={styles.kasType}>{item.type === "BANK" ? "Bank" : "Tunai"}{item.accountNumber ? ` • ${item.accountNumber}` : ""}</Text>
                  {item.description ? <Text style={styles.kasDesc}>{item.description}</Text> : null}
                </View>
              </View>
              <View style={styles.kasBalanceWrap}>
                <Text style={styles.kasBalanceLabel}>Saldo</Text>
                <Text style={styles.kasBalance}>{formatRupiah(item.balance || 0)}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyCard}>
              <Ionicons name="wallet-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>Belum ada kas terdaftar</Text>
            </View>
          )}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </SafeAreaView>
  )
}

// ============================================================================
// TRANSAKSI KAS SCREEN (V5: Pemasukan & Pengeluaran)
// ============================================================================
function TransaksiKasScreen({ navigation }: { navigation: any }) {
  const [transaksi, setTransaksi] = useState<any[]>([])
  const [kasList, setKasList] = useState<any[]>([])
  const [filterKas, setFilterKas] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  // form state
  const [formType, setFormType] = useState<"PEMASUKAN" | "PENGELUARAN">("PEMASUKAN")
  const [formCategory, setFormCategory] = useState("")
  const [formAmount, setFormAmount] = useState("")
  const [formDesc, setFormDesc] = useState("")
  const [formKasId, setFormKasId] = useState("")

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [trxRes, kasRes] = await Promise.all([
        apiGet("/api/admin/kas/transaksi?limit=50"),
        apiGet("/api/admin/kas"),
      ])
      let list = trxRes.data || []
      if (filterKas) list = list.filter((t: any) => t.kasId === filterKas)
      setTransaksi(list)
      setKasList(kasRes.data || [])
    } catch (e: any) { Alert.alert("Error", e.message) }
    finally { setLoading(false) }
  }, [filterKas])

  useEffect(() => { load() }, [load])

  const totalPemasukan = transaksi.filter(t => t.type === "PEMASUKAN").reduce((s, t) => s + (t.amount || 0), 0)
  const totalPengeluaran = transaksi.filter(t => t.type === "PENGELUARAN").reduce((s, t) => s + (t.amount || 0), 0)
  const saldoPeriode = totalPemasukan - totalPengeluaran

  const resetForm = () => {
    setFormType("PEMASUKAN")
    setFormCategory("")
    setFormAmount("")
    setFormDesc("")
    setFormKasId("")
    setShowForm(false)
  }

  const handleSave = async () => {
    if (!formAmount || Number(formAmount) <= 0) {
      Alert.alert("Validasi", "Nominal harus diisi")
      return
    }
    if (!formKasId) {
      Alert.alert("Validasi", "Pilih kas terlebih dahulu")
      return
    }
    setSaving(true)
    try {
      await apiPost("/api/admin/kas/transaksi", {
        type: formType,
        category: formCategory || (formType === "PEMASUKAN" ? "Lainnya" : "Operasional"),
        amount: Number(formAmount),
        description: formDesc,
        kasId: formKasId,
      })
      Alert.alert("Berhasil", `${formType === "PEMASUKAN" ? "Pemasukan" : "Pengeluaran"} ${formatRupiah(Number(formAmount))} tercatat`)
      resetForm()
      load()
    } catch (e: any) { Alert.alert("Gagal", e.message) }
    finally { setSaving(false) }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaksi Kas</Text>
        <TouchableOpacity onPress={() => setShowForm(true)} style={styles.headerAction}>
          <Ionicons name="add" size={26} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {/* Stat cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: Colors.success }]}>
            <Text style={styles.statLabel}>Pemasukan</Text>
            <Text style={styles.statValue}>{formatRupiah(totalPemasukan)}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: Colors.danger }]}>
            <Text style={styles.statLabel}>Pengeluaran</Text>
            <Text style={styles.statValue}>{formatRupiah(totalPengeluaran)}</Text>
          </View>
        </View>
        <View style={[styles.totalCard, { margin: 0, marginBottom: 12, backgroundColor: saldoPeriode >= 0 ? Colors.primary : Colors.warning }]}>
          <Text style={styles.totalLabel}>Saldo Periode ({transaksi.length} transaksi)</Text>
          <Text style={styles.totalValue}>{formatRupiah(saldoPeriode)}</Text>
        </View>

        {/* Filter Kas */}
        <Text style={styles.label}>Filter Kas</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
          <TouchableOpacity
            style={[styles.methodBtn, filterKas === "" && styles.methodBtnActive]}
            onPress={() => setFilterKas("")}
          >
            <Text style={[styles.methodBtnText, filterKas === "" && styles.methodBtnTextActive]}>Semua</Text>
          </TouchableOpacity>
          {kasList.map(k => (
            <TouchableOpacity
              key={k.id}
              style={[styles.methodBtn, filterKas === k.id && styles.methodBtnActive]}
              onPress={() => setFilterKas(k.id)}
            >
              <Text style={[styles.methodBtnText, filterKas === k.id && styles.methodBtnTextActive]}>{k.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* List Transaksi */}
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
        ) : transaksi.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>Belum ada transaksi</Text>
          </View>
        ) : (
          transaksi.map((t, i) => (
            <View key={i} style={styles.trxCard}>
              <View style={[styles.trxIcon, { backgroundColor: t.type === "PEMASUKAN" ? Colors.successLight : Colors.dangerLight }]}>
                <Ionicons name={t.type === "PEMASUKAN" ? "arrow-down" : "arrow-up"} size={18} color={t.type === "PEMASUKAN" ? Colors.success : Colors.danger} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.trxCategory}>{t.category || "-"}</Text>
                <Text style={styles.trxDesc}>{t.description || "-"}</Text>
                <Text style={styles.trxMeta}>{t.kas?.name || "-"} • {formatDate(t.date || t.createdAt, true)}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.trxAmount, { color: t.type === "PEMASUKAN" ? Colors.success : Colors.danger }]}>
                  {t.type === "PEMASUKAN" ? "+" : "-"}{formatRupiah(t.amount)}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: t.type === "PEMASUKAN" ? Colors.successLight : Colors.dangerLight }]}>
                  <Text style={[styles.statusText, { color: t.type === "PEMASUKAN" ? Colors.success : Colors.danger }]}>
                    {t.type === "PEMASUKAN" ? "Masuk" : "Keluar"}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Form Modal */}
      <Modal visible={showForm} animationType="slide" transparent={false} onRequestClose={resetForm}>
        <SafeAreaView style={styles.screen}>
          <View style={styles.header}>
            <TouchableOpacity onPress={resetForm} style={styles.backButton}>
              <Ionicons name="close" size={24} color={Colors.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Tambah Transaksi</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView style={styles.content}>
            {/* Type */}
            <Text style={styles.label}>Tipe Transaksi</Text>
            <View style={styles.methodRow}>
              {(["PEMASUKAN", "PENGELUARAN"] as const).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.methodBtn, formType === t && styles.methodBtnActive]}
                  onPress={() => setFormType(t)}
                >
                  <Text style={[styles.methodBtnText, formType === t && styles.methodBtnTextActive]}>
                    {t === "PEMASUKAN" ? "Pemasukan" : "Pengeluaran"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Kas */}
            <Text style={styles.label}>Kas / Rekening</Text>
            {kasList.length === 0 ? (
              <Text style={{ color: Colors.danger, fontSize: 12 }}>Belum ada kas. Tambah dulu di menu Kas & Rekening.</Text>
            ) : (
              <View>
                {kasList.map(k => (
                  <TouchableOpacity
                    key={k.id}
                    style={[styles.santriOption, formKasId === k.id && styles.santriOptionActive]}
                    onPress={() => setFormKasId(k.id)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.santriOptionName}>{k.name}</Text>
                      <Text style={styles.santriOptionNis}>{k.type === "BANK" ? "Bank" : "Tunai"}{k.accountNumber ? ` • ${k.accountNumber}` : ""} • Saldo: {formatRupiah(k.balance || 0)}</Text>
                    </View>
                    {formKasId === k.id && <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Category */}
            <Text style={styles.label}>Kategori</Text>
            <TextInput
              style={styles.input}
              value={formCategory}
              onChangeText={setFormCategory}
              placeholder={formType === "PEMASUKAN" ? "cth: Donasi, Sumbangan" : "cth: Operasional, Honor, ATK"}
            />

            {/* Amount */}
            <Text style={styles.label}>Nominal</Text>
            <View style={styles.amountContainer}>
              <Text style={styles.amountPrefix}>Rp</Text>
              <TextInput
                style={styles.amountInput}
                value={formAmount}
                onChangeText={(v) => setFormAmount(v.replace(/\D/g, ""))}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>

            {/* Description */}
            <Text style={styles.label}>Keterangan</Text>
            <TextInput
              style={[styles.input, { minHeight: 60, textAlignVertical: "top" }]}
              value={formDesc}
              onChangeText={setFormDesc}
              placeholder="Keterangan tambahan..."
              multiline
            />

            <TouchableOpacity
              style={[styles.saveButton, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color={Colors.white} /> : (
                <>
                  <Ionicons name="save" size={20} color={Colors.white} />
                  <Text style={styles.saveButtonText}>Simpan Transaksi</Text>
                </>
              )}
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

// ============================================================================
// HONOR GURU SCREEN (V5: Honor Guru + Slip)
// ============================================================================
function HonorGuruScreen({ navigation }: { navigation: any }) {
  const [honorList, setHonorList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await apiGet("/api/admin/honor-guru")
      setHonorList(res.data || [])
    } catch (e: any) { Alert.alert("Error", e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const openSlip = async (id: string) => {
    const url = `${API_BASE_URL}/api/admin/honor-guru/${id}/slip`
    try {
      const supported = await Linking.canOpenURL(url)
      if (supported) {
        await Linking.openURL(url)
      } else {
        Alert.alert("Tidak bisa membuka", `URL: ${url}`)
      }
    } catch (e: any) { Alert.alert("Gagal", e.message) }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Honor Guru</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={honorList}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            const totalHonor = (item.honorMengajar || 0) + (item.insentif || 0) + (item.tunjangan || 0) - (item.potongan || 0)
            return (
              <View style={styles.honorCard}>
                <View style={styles.honorHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.honorGuruName}>{item.guru?.name || item.guru?.user?.name || "-"}</Text>
                    <Text style={styles.honorPeriode}>Periode: {item.periodeLabel || "-"}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: item.status === "DIBAYARKAN" ? Colors.successLight : item.status === "DRAFT" ? Colors.warningLight : Colors.primaryLight }]}>
                    <Text style={[styles.statusText, { color: item.status === "DIBAYARKAN" ? Colors.success : item.status === "DRAFT" ? Colors.warning : Colors.primary }]}>
                      {item.status || "-"}
                    </Text>
                  </View>
                </View>

                <View style={styles.honorBreakdown}>
                  <View style={styles.honorRow}>
                    <Text style={styles.honorRowLabel}>Honor Mengajar</Text>
                    <Text style={styles.honorRowValue}>{formatRupiah(item.honorMengajar || 0)}</Text>
                  </View>
                  {item.insentif ? (
                    <View style={styles.honorRow}>
                      <Text style={styles.honorRowLabel}>Insentif</Text>
                      <Text style={[styles.honorRowValue, { color: Colors.success }]}>+ {formatRupiah(item.insentif)}</Text>
                    </View>
                  ) : null}
                  {item.tunjangan ? (
                    <View style={styles.honorRow}>
                      <Text style={styles.honorRowLabel}>Tunjangan</Text>
                      <Text style={[styles.honorRowValue, { color: Colors.success }]}>+ {formatRupiah(item.tunjangan)}</Text>
                    </View>
                  ) : null}
                  {item.potongan ? (
                    <View style={styles.honorRow}>
                      <Text style={styles.honorRowLabel}>Potongan</Text>
                      <Text style={[styles.honorRowValue, { color: Colors.danger }]}>- {formatRupiah(item.potongan)}</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.honorTotalWrap}>
                  <Text style={styles.honorTotalLabel}>Total Honor</Text>
                  <Text style={styles.honorTotalValue}>{formatRupiah(item.totalHonor || totalHonor)}</Text>
                </View>

                <TouchableOpacity style={styles.slipButton} onPress={() => openSlip(item.id)}>
                  <Ionicons name="document-text-outline" size={18} color={Colors.primary} />
                  <Text style={styles.slipButtonText}>Slip Honor</Text>
                </TouchableOpacity>
              </View>
            )
          }}
          ListEmptyComponent={() => (
            <View style={styles.emptyCard}>
              <Ionicons name="school-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>Belum ada data honor</Text>
            </View>
          )}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </SafeAreaView>
  )
}

// ============================================================================
// LAPORAN SCREEN (V5: Laporan Keuangan)
// ============================================================================
function LaporanScreen({ navigation }: { navigation: any }) {
  const now = new Date()
  const [month, setMonth] = useState<number>(now.getMonth() + 1)
  const [year, setYear] = useState<number>(now.getFullYear())
  const [laporan, setLaporan] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const months = [
    { v: 1, label: "Jan" }, { v: 2, label: "Feb" }, { v: 3, label: "Mar" },
    { v: 4, label: "Apr" }, { v: 5, label: "Mei" }, { v: 6, label: "Jun" },
    { v: 7, label: "Jul" }, { v: 8, label: "Agu" }, { v: 9, label: "Sep" },
    { v: 10, label: "Okt" }, { v: 11, label: "Nov" }, { v: 12, label: "Des" },
  ]

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await apiGet(`/api/admin/kas/laporan?type=bulanan&month=${month}&year=${year}`)
      setLaporan(res.data || res)
    } catch (e: any) { Alert.alert("Error", e.message) }
    finally { setLoading(false) }
  }, [month, year])

  useEffect(() => { load() }, [load])

  const pemasukanKategori: any[] = laporan?.pemasukanPerKategori || laporan?.incomeByCategory || []
  const pengeluaranKategori: any[] = laporan?.pengeluaranPerKategori || laporan?.expenseByCategory || []
  const totalPemasukan = laporan?.totalPemasukan || laporan?.totalIncome || 0
  const totalPengeluaran = laporan?.totalPengeluaran || laporan?.totalExpense || 0
  const surplus = laporan?.surplus ?? (totalPemasukan - totalPengeluaran)
  const saldo = laporan?.saldo || laporan?.balance || 0
  const tunggakan = laporan?.tunggakan || laporan?.outstanding || 0

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Laporan Keuangan</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Month / Year selector */}
        <Text style={styles.label}>Pilih Bulan</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
          {months.map(m => (
            <TouchableOpacity
              key={m.v}
              style={[styles.methodBtn, month === m.v && styles.methodBtnActive]}
              onPress={() => setMonth(m.v)}
            >
              <Text style={[styles.methodBtnText, month === m.v && styles.methodBtnTextActive]}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.label}>Pilih Tahun</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
            <TouchableOpacity
              key={y}
              style={[styles.methodBtn, year === y && styles.methodBtnActive]}
              onPress={() => setYear(y)}
            >
              <Text style={[styles.methodBtnText, year === y && styles.methodBtnTextActive]}>{y}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
        ) : !laporan ? (
          <View style={styles.emptyCard}><Text style={styles.emptyText}>Tidak ada data</Text></View>
        ) : (
          <>
            {/* Stat cards */}
            <View style={styles.statsContainer}>
              <View style={[styles.statCard, { backgroundColor: Colors.success }]}>
                <Text style={styles.statLabel}>Pemasukan</Text>
                <Text style={styles.statValue}>{formatRupiah(totalPemasukan)}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: Colors.danger }]}>
                <Text style={styles.statLabel}>Pengeluaran</Text>
                <Text style={styles.statValue}>{formatRupiah(totalPengeluaran)}</Text>
              </View>
            </View>

            <View style={[styles.totalCard, { margin: 0, marginBottom: 12, backgroundColor: surplus >= 0 ? Colors.primary : Colors.warning }]}>
              <Text style={styles.totalLabel}>{surplus >= 0 ? "Surplus" : "Defisit"}</Text>
              <Text style={styles.totalValue}>{formatRupiah(Math.abs(surplus))}</Text>
            </View>

            <View style={[styles.totalCard, { margin: 0, marginBottom: 12, backgroundColor: Colors.text }]}>
              <Text style={styles.totalLabel}>Saldo Akhir</Text>
              <Text style={styles.totalValue}>{formatRupiah(saldo)}</Text>
            </View>

            {tunggakan > 0 && (
              <View style={[styles.totalCard, { margin: 0, marginBottom: 12, backgroundColor: Colors.danger }]}>
                <Text style={styles.totalLabel}>Tunggakan</Text>
                <Text style={styles.totalValue}>{formatRupiah(tunggakan)}</Text>
              </View>
            )}

            {/* Pemasukan per kategori */}
            <Text style={styles.sectionTitle}>Pemasukan per Kategori</Text>
            {pemasukanKategori.length === 0 ? (
              <Text style={{ color: Colors.textMuted, fontSize: 12, marginBottom: 12 }}>- Tidak ada data</Text>
            ) : (
              pemasukanKategori.map((k, i) => (
                <View key={`in-${i}`} style={styles.laporanRow}>
                  <Text style={styles.laporanRowLabel}>{k.category || k.name || "-"}</Text>
                  <Text style={[styles.laporanRowValue, { color: Colors.success }]}>{formatRupiah(k.amount || k.total || 0)}</Text>
                </View>
              ))
            )}

            {/* Pengeluaran per kategori */}
            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Pengeluaran per Kategori</Text>
            {pengeluaranKategori.length === 0 ? (
              <Text style={{ color: Colors.textMuted, fontSize: 12, marginBottom: 12 }}>- Tidak ada data</Text>
            ) : (
              pengeluaranKategori.map((k, i) => (
                <View key={`out-${i}`} style={styles.laporanRow}>
                  <Text style={styles.laporanRowLabel}>{k.category || k.name || "-"}</Text>
                  <Text style={[styles.laporanRowValue, { color: Colors.danger }]}>{formatRupiah(k.amount || k.total || 0)}</Text>
                </View>
              ))
            )}
            <View style={{ height: 40 }} />
          </>
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
  // Realtime refresh tick — bumped whenever a subscribed table changes.
  // Passed to DashboardScreen so it can re-fetch on Payment/Tagihan events.
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
  // - Payment INSERT  : new pembayaran recorded → refresh dashboard
  // - Tagihan  UPDATE : status BELUM_BAYAR → LUNAS → refresh tunggakan/tagihan
  // ============================================================================
  useEffect(() => {
    if (!isLoggedIn) return
    let cancelled = false
    const unsubs: Array<() => void> = []
    ;(async () => {
      try {
        for (const table of ["Payment", "Tagihan"] as const) {
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
              {({ navigation }) => (
                <DashboardScreen
                  navigation={navigation}
                  onLogout={async () => { await getSupabase().auth.signOut(); await SecureStore.deleteItemAsync("authToken"); authToken = null; setIsLoggedIn(false) }}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="PembayaranInput" component={PembayaranInputScreen} />
            <Stack.Screen name="TunggakanList" component={TunggakanListScreen} />
            <Stack.Screen name="TagihanList" component={TagihanListScreen} />
            <Stack.Screen name="RiwayatList" component={RiwayatListScreen} />
            <Stack.Screen name="KasList" component={KasListScreen} />
            <Stack.Screen name="TransaksiKas" component={TransaksiKasScreen} />
            <Stack.Screen name="HonorGuru" component={HonorGuruScreen} />
            <Stack.Screen name="Laporan" component={LaporanScreen} />
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
  // Header action button (for add/new in header bar)
  headerAction: { padding: 4 },
  // Kas & Rekening
  kasCard: { backgroundColor: Colors.white, borderRadius: 12, padding: 16, marginBottom: 8, elevation: 1 },
  kasIcon: { width: 44, height: 44, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  kasName: { fontSize: 15, fontWeight: "600", color: Colors.text },
  kasType: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  kasDesc: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  kasBalanceWrap: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  kasBalanceLabel: { fontSize: 11, color: Colors.textMuted },
  kasBalance: { fontSize: 18, fontWeight: "bold", color: Colors.primary },
  // Transaksi Kas
  trxCard: { backgroundColor: Colors.white, borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: "row", alignItems: "center", elevation: 1 },
  trxIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  trxCategory: { fontSize: 14, fontWeight: "500", color: Colors.text },
  trxDesc: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  trxMeta: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  trxAmount: { fontSize: 15, fontWeight: "600" },
  // Honor Guru
  honorCard: { backgroundColor: Colors.white, borderRadius: 12, padding: 16, marginBottom: 12, elevation: 1 },
  honorHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 },
  honorGuruName: { fontSize: 15, fontWeight: "600", color: Colors.text },
  honorPeriode: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  honorBreakdown: { backgroundColor: Colors.background, borderRadius: 8, padding: 12, marginTop: 4 },
  honorRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  honorRowLabel: { fontSize: 12, color: Colors.textMuted },
  honorRowValue: { fontSize: 12, fontWeight: "500", color: Colors.text },
  honorTotalWrap: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.border },
  honorTotalLabel: { fontSize: 13, fontWeight: "600", color: Colors.text },
  honorTotalValue: { fontSize: 16, fontWeight: "bold", color: Colors.primary },
  slipButton: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  slipButtonText: { fontSize: 13, fontWeight: "600", color: Colors.primary },
  // Laporan
  laporanRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: Colors.white, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 4, elevation: 1 },
  laporanRowLabel: { fontSize: 13, color: Colors.text, flex: 1 },
  laporanRowValue: { fontSize: 13, fontWeight: "600" },
})
