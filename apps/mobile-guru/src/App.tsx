/**
 * SIM MADIN — Guru Mobile App (V1 Complete)
 * Login: Email + Password (Supabase Auth)
 * Fitur: Jadwal mengajar, Input absensi cepat, Input nilai
 */

import React, { useState, useEffect, useCallback } from "react"
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, SafeAreaView, StatusBar, ScrollView, Alert,
  FlatList, Modal, Picker,
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
  primary: "#ea580c", primaryLight: "#fed7aa", primaryDark: "#c2410c",
  background: "#f8fafc", card: "#ffffff", text: "#1e293b", textMuted: "#64748b",
  border: "#e2e8f0", danger: "#dc2626", dangerLight: "#fee2e2",
  warning: "#d97706", warningLight: "#fef3c7",
  success: "#059669", successLight: "#d1fae5",
  info: "#3b82f6", infoLight: "#dbeafe",
  white: "#ffffff",
}

const ABS_STATUS = [
  { value: "HADIR", label: "Hadir", color: Colors.success, bg: Colors.successLight },
  { value: "SAKIT", label: "Sakit", color: Colors.warning, bg: Colors.warningLight },
  { value: "IZIN", label: "Izin", color: Colors.info, bg: Colors.infoLight },
  { value: "ALFA", label: "Alfa", color: Colors.danger, bg: Colors.dangerLight },
]

// ============================================================================
// LOGIN SCREEN
// ============================================================================
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("guru@madrasah.test")
  const [password, setPassword] = useState("admin123")
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) { Alert.alert("Validasi", "Email dan password wajib diisi"); return }
    setLoading(true)
    try {
      const { data, error } = await getSupabase().auth.signInWithPassword({ email, password })
      if (error) throw error
      authToken = data.session?.access_token || null
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
// DASHBOARD SCREEN (Home with menu)
// ============================================================================
function DashboardScreen({ onLogout, navigation }: { onLogout: () => void; navigation: any }) {
  const [jadwal, setJadwal] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadJadwal = useCallback(async () => {
    try {
      setLoading(true)
      const res = await apiGet("/api/admin/jadwal")
      setJadwal(res.data || [])
    } catch (e: any) { Alert.alert("Error", e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadJadwal() }, [loadJadwal])

  const today = new Date().getDay() || 7
  const todayJadwal = jadwal.filter(j => j.dayOfWeek === today)

  const menuItems = [
    { id: "absensi", title: "Input Absensi", icon: "checkmark-done", color: Colors.success, bg: Colors.successLight, onPress: () => navigation.navigate("AbsensiInput") },
    { id: "nilai", title: "Input Nilai", icon: "school", color: Colors.primary, bg: Colors.primaryLight, onPress: () => navigation.navigate("NilaiInput") },
    { id: "jadwal", title: "Lihat Jadwal", icon: "calendar", color: Colors.info, bg: Colors.infoLight, onPress: () => navigation.navigate("JadwalList") },
  ]

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Dashboard Guru</Text>
        </View>
        <TouchableOpacity onPress={onLogout}>
          <Ionicons name="log-out-outline" size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Menu Grid */}
        <View style={styles.menuGrid}>
          {menuItems.map((item) => (
            <TouchableOpacity key={item.id} style={styles.menuCard} onPress={item.onPress}>
              <View style={[styles.menuIcon, { backgroundColor: item.bg }]}>
                <Ionicons name={item.icon as any} size={28} color={item.color} />
              </View>
              <Text style={styles.menuTitle}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Today's Schedule */}
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
              <TouchableOpacity
                style={styles.absensiQuickBtn}
                onPress={() => navigation.navigate("AbsensiInput", { kelasId: j.kelasId, kelasName: j.kelas?.name })}
              >
                <Ionicons name="checkmark-done" size={18} color={Colors.white} />
                <Text style={styles.absensiQuickText}>Absen</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

// ============================================================================
// ABSENSI INPUT SCREEN
// ============================================================================
function AbsensiInputScreen({ route, navigation }: { route: any; navigation: any }) {
  const kelasIdFromRoute = route?.params?.kelasId
  const kelasNameFromRoute = route?.params?.kelasName

  const [kelasList, setKelasList] = useState<any[]>([])
  const [selectedKelas, setSelectedKelas] = useState(kelasIdFromRoute || "")
  const [santriList, setSantriList] = useState<any[]>([])
  const [absensiData, setAbsensiData] = useState<Record<string, string>>({})
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const loadKelas = useCallback(async () => {
    try {
      const res = await apiGet("/api/admin/kelas")
      setKelasList(res.data || [])
      if (!selectedKelas && res.data?.length > 0) {
        setSelectedKelas(res.data[0].id)
      }
    } catch (e: any) { Alert.alert("Error", e.message) }
  }, [selectedKelas])

  const loadSantri = useCallback(async () => {
    if (!selectedKelas) return
    try {
      setLoading(true)
      const res = await apiGet(`/api/admin/santri?kelasId=${selectedKelas}&status=AKTIF`)
      setSantriList(res.data || [])
      // Default semua HADIR
      const defaults: Record<string, string> = {}
      res.data?.forEach((s: any) => { defaults[s.id] = "HADIR" })
      setAbsensiData(defaults)
    } catch (e: any) { Alert.alert("Error", e.message) }
    finally { setLoading(false) }
  }, [selectedKelas])

  useEffect(() => { loadKelas() }, [loadKelas])
  useEffect(() => { if (selectedKelas) loadSantri() }, [selectedKelas, loadSantri])

  const setStatus = (santriId: string, status: string) => {
    setAbsensiData(prev => ({ ...prev, [santriId]: status }))
  }

  const setAllStatus = (status: string) => {
    const newData: Record<string, string> = {}
    santriList.forEach(s => { newData[s.id] = status })
    setAbsensiData(newData)
  }

  const handleSave = async () => {
    if (santriList.length === 0) { Alert.alert("Error", "Belum ada santri"); return }
    setSaving(true)
    try {
      const entries = Object.entries(absensiData).map(([santriId, status]) => ({ santriId, status }))
      const res = await apiPost("/api/admin/absensi", { entries, kelasId: selectedKelas, date: selectedDate })
      Alert.alert("Berhasil", `${res.count} absensi tersimpan`)
      navigation.goBack()
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
        <Text style={styles.headerTitle}>Input Absensi</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.absensiControls}>
        {/* Date picker */}
        <Text style={styles.label}>Tanggal</Text>
        <TextInput
          style={styles.dateInput}
          value={selectedDate}
          onChangeText={setSelectedDate}
          placeholder="YYYY-MM-DD"
        />

        {/* Kelas selector */}
        <Text style={styles.label}>Kelas</Text>
        <View style={styles.pickerContainer}>
          {kelasList.map((k) => (
            <TouchableOpacity
              key={k.id}
              style={[styles.kelasPill, selectedKelas === k.id && styles.kelasPillActive]}
              onPress={() => setSelectedKelas(k.id)}
            >
              <Text style={[styles.kelasPillText, selectedKelas === k.id && styles.kelasPillTextActive]}>
                {k.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick set all */}
        <View style={styles.quickSetRow}>
          <Text style={styles.quickSetLabel}>Set Semua:</Text>
          {ABS_STATUS.map(s => (
            <TouchableOpacity
              key={s.value}
              style={[styles.quickSetBtn, { backgroundColor: s.bg, borderColor: s.color }]}
              onPress={() => setAllStatus(s.value)}
            >
              <Text style={[styles.quickSetText, { color: s.color }]}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={santriList}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.absensiRow}>
              <View style={styles.absensiInfo}>
                <Text style={styles.absensiName}>{item.name}</Text>
                <Text style={styles.absensiNis}>{item.nis}</Text>
              </View>
              <View style={styles.absensiButtons}>
                {ABS_STATUS.map(s => (
                  <TouchableOpacity
                    key={s.value}
                    style={[
                      styles.absensiBtn,
                      absensiData[item.id] === s.value && { backgroundColor: s.bg, borderColor: s.color },
                    ]}
                    onPress={() => setStatus(item.id, s.value)}
                  >
                    <Text style={[
                      styles.absensiBtnText,
                      absensiData[item.id] === s.value ? { color: s.color, fontWeight: "bold" } : { color: Colors.textMuted },
                    ]}>
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Pilih kelas untuk melihat daftar santri</Text>
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 80 }}
        />
      )}

      {/* Save button */}
      {santriList.length > 0 && (
        <TouchableOpacity
          style={[styles.saveButton, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color={Colors.white} /> : (
            <>
              <Ionicons name="save" size={20} color={Colors.white} />
              <Text style={styles.saveButtonText}>Simpan Absensi ({santriList.length} santri)</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </SafeAreaView>
  )
}

// ============================================================================
// NILAI INPUT SCREEN
// ============================================================================
function NilaiInputScreen({ navigation }: { navigation: any }) {
  const [kelasList, setKelasList] = useState<any[]>([])
  const [mapelList, setMapelList] = useState<any[]>([])
  const [selectedKelas, setSelectedKelas] = useState("")
  const [selectedMapel, setSelectedMapel] = useState("")
  const [selectedType, setSelectedType] = useState("HARIAN")
  const [santriList, setSantriList] = useState<any[]>([])
  const [nilaiData, setNilaiData] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const loadMaster = useCallback(async () => {
    try {
      const [kelasRes, mapelRes] = await Promise.all([
        apiGet("/api/admin/kelas"),
        apiGet("/api/admin/mapel"),
      ])
      setKelasList(kelasRes.data || [])
      setMapelList(mapelRes.data || [])
      if (kelasRes.data?.length > 0) setSelectedKelas(kelasRes.data[0].id)
      if (mapelRes.data?.length > 0) setSelectedMapel(mapelRes.data[0].id)
    } catch (e: any) { Alert.alert("Error", e.message) }
  }, [])

  const loadSantri = useCallback(async () => {
    if (!selectedKelas) return
    try {
      setLoading(true)
      const res = await apiGet(`/api/admin/santri?kelasId=${selectedKelas}&status=AKTIF`)
      setSantriList(res.data || [])
      const defaults: Record<string, string> = {}
      res.data?.forEach((s: any) => { defaults[s.id] = "" })
      setNilaiData(defaults)
    } catch (e: any) { Alert.alert("Error", e.message) }
    finally { setLoading(false) }
  }, [selectedKelas])

  useEffect(() => { loadMaster() }, [loadMaster])
  useEffect(() => { if (selectedKelas) loadSantri() }, [selectedKelas, loadSantri])

  const setNilai = (santriId: string, value: string) => {
    const numValue = value.replace(/\D/g, "").slice(0, 3)
    setNilaiData(prev => ({ ...prev, [santriId]: numValue }))
  }

  const handleSave = async () => {
    const entries = Object.entries(nilaiData).filter(([_, v]) => v && Number(v) > 0)
    if (entries.length === 0) { Alert.alert("Validasi", "Isi minimal 1 nilai"); return }

    setSaving(true)
    try {
      const promises = entries.map(([santriId, score]) =>
        apiPost("/api/admin/nilai", {
          santriId, kelasId: selectedKelas, mapelId: selectedMapel,
          type: selectedType, score: Number(score),
        })
      )
      await Promise.all(promises)
      Alert.alert("Berhasil", `${entries.length} nilai tersimpan`)
      navigation.goBack()
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
        <Text style={styles.headerTitle}>Input Nilai</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.nilaiControls}>
        {/* Kelas selector */}
        <Text style={styles.label}>Kelas</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
          {kelasList.map(k => (
            <TouchableOpacity
              key={k.id}
              style={[styles.pill, selectedKelas === k.id && styles.pillActive]}
              onPress={() => setSelectedKelas(k.id)}
            >
              <Text style={[styles.pillText, selectedKelas === k.id && styles.pillTextActive]}>{k.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Mapel selector */}
        <Text style={styles.label}>Mata Pelajaran</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
          {mapelList.map(m => (
            <TouchableOpacity
              key={m.id}
              style={[styles.pill, selectedMapel === m.id && styles.pillActive]}
              onPress={() => setSelectedMapel(m.id)}
            >
              <Text style={[styles.pillText, selectedMapel === m.id && styles.pillTextActive]}>{m.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Type selector */}
        <Text style={styles.label}>Jenis Nilai</Text>
        <View style={styles.typeRow}>
          {NILAI_TYPES.map(t => (
            <TouchableOpacity
              key={t.value}
              style={[styles.typeBtn, selectedType === t.value && styles.typeBtnActive]}
              onPress={() => setSelectedType(t.value)}
            >
              <Text style={[styles.typeBtnText, selectedType === t.value && styles.typeBtnTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={santriList}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.nilaiRow}>
              <View style={styles.nilaiInfo}>
                <Text style={styles.nilaiName}>{item.name}</Text>
                <Text style={styles.nilaiNis}>{item.nis}</Text>
              </View>
              <TextInput
                style={[
                  styles.nilaiInput,
                  nilaiData[item.id] && Number(nilaiData[item.id]) >= 70
                    ? { borderColor: Colors.success, color: Colors.success }
                    : nilaiData[item.id] && Number(nilaiData[item.id]) < 70
                    ? { borderColor: Colors.danger, color: Colors.danger }
                    : {},
                ]}
                value={nilaiData[item.id] || ""}
                onChangeText={(v) => setNilai(item.id, v)}
                keyboardType="numeric"
                maxLength={3}
                placeholder="0-100"
              />
            </View>
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Pilih kelas untuk melihat santri</Text>
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 80 }}
        />
      )}

      {santriList.length > 0 && (
        <TouchableOpacity
          style={[styles.saveButton, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color={Colors.white} /> : (
            <>
              <Ionicons name="save" size={20} color={Colors.white} />
              <Text style={styles.saveButtonText}>Simpan Nilai</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </SafeAreaView>
  )
}

// ============================================================================
// JADWAL LIST SCREEN
// ============================================================================
function JadwalListScreen({ navigation }: { navigation: any }) {
  const [jadwal, setJadwal] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await apiGet("/api/admin/jadwal")
      setJadwal(res.data || [])
    } catch (e: any) { Alert.alert("Error", e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const grouped = DAYS.map(d => ({
    ...d,
    items: jadwal.filter(j => j.dayOfWeek === d.value).sort((a, b) => a.startTime.localeCompare(b.startTime)),
  })).filter(g => g.items.length > 0)

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Jadwal Mengajar</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <ScrollView style={styles.content}>
          {grouped.map(day => (
            <View key={day.value}>
              <Text style={styles.dayTitle}>{day.label}</Text>
              {day.items.map((j, i) => (
                <View key={i} style={styles.jadwalCard}>
                  <View style={styles.jadwalTime}>
                    <Text style={styles.jadwalStartTime}>{j.startTime}</Text>
                    <Text style={styles.jadwalEndTime}>{j.endTime}</Text>
                  </View>
                  <View style={styles.jadwalInfo}>
                    <Text style={styles.jadwalMapel}>{j.mapel?.name}</Text>
                    <Text style={styles.jadwalKelas}>{j.kelas?.name}</Text>
                  </View>
                </View>
              ))}
            </View>
          ))}
          {grouped.length === 0 && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Belum ada jadwal</Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

// ============================================================================
// APP ROOT
// ============================================================================
type RootStackParamList = {
  Login: undefined
  Dashboard: undefined
  AbsensiInput: { kelasId?: string; kelasName?: string }
  NilaiInput: undefined
  JadwalList: undefined
}

const Stack = createNativeStackNavigator<RootStackParamList>()

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
          <>
            <Stack.Screen name="Dashboard">
              {({ navigation }) => (
                <DashboardScreen
                  navigation={navigation}
                  onLogout={async () => {
                    await getSupabase().auth.signOut()
                    await SecureStore.deleteItemAsync("authToken")
                    authToken = null
                    setIsLoggedIn(false)
                  }}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="AbsensiInput" component={AbsensiInputScreen} />
            <Stack.Screen name="NilaiInput" component={NilaiInputScreen} />
            <Stack.Screen name="JadwalList" component={JadwalListScreen} />
          </>
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
  loginButton: { backgroundColor: Colors.primary, borderRadius: 8, paddingVertical: 14, alignItems: "center", marginTop: 24, flexDirection: "row", justifyContent: "center", gap: 8 },
  loginButtonText: { color: Colors.white, fontSize: 16, fontWeight: "600" },
  demoText: { fontSize: 12, color: Colors.textMuted, textAlign: "center", marginTop: 16 },
  screen: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 12, paddingTop: 48 },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: "600", color: Colors.white },
  content: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: Colors.text, marginBottom: 12 },
  menuGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 24 },
  menuCard: { backgroundColor: Colors.white, borderRadius: 12, padding: 20, width: "47%", alignItems: "center", elevation: 1 },
  menuIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  menuTitle: { fontSize: 14, fontWeight: "500", color: Colors.text, textAlign: "center" },
  emptyCard: { backgroundColor: Colors.white, borderRadius: 12, padding: 24, alignItems: "center" },
  emptyText: { fontSize: 14, color: Colors.textMuted },
  jadwalCard: { backgroundColor: Colors.white, borderRadius: 12, padding: 16, marginBottom: 8, flexDirection: "row", alignItems: "center", elevation: 1 },
  jadwalTime: { width: 60, alignItems: "center" },
  jadwalStartTime: { fontSize: 14, fontWeight: "600", color: Colors.primary },
  jadwalEndTime: { fontSize: 11, color: Colors.textMuted },
  jadwalInfo: { flex: 1, marginLeft: 12 },
  jadwalMapel: { fontSize: 15, fontWeight: "500", color: Colors.text },
  jadwalKelas: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  absensiQuickBtn: { backgroundColor: Colors.success, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6, flexDirection: "row", alignItems: "center", gap: 4 },
  absensiQuickText: { fontSize: 12, color: Colors.white, fontWeight: "600" },
  // Absensi Input
  absensiControls: { padding: 16, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  dateInput: { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: Colors.text },
  pickerContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  pickerScroll: { marginTop: 4 },
  kelasPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white, marginRight: 8 },
  kelasPillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  kelasPillText: { fontSize: 12, color: Colors.textMuted },
  kelasPillTextActive: { color: Colors.white, fontWeight: "600" },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white, marginRight: 8 },
  pillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  pillText: { fontSize: 12, color: Colors.textMuted },
  pillTextActive: { color: Colors.white, fontWeight: "600" },
  quickSetRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12, flexWrap: "wrap" },
  quickSetLabel: { fontSize: 12, fontWeight: "600", color: Colors.text },
  quickSetBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  quickSetText: { fontSize: 11, fontWeight: "600" },
  absensiRow: { flexDirection: "row", alignItems: "center", padding: 12, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  absensiInfo: { flex: 1 },
  absensiName: { fontSize: 14, fontWeight: "500", color: Colors.text },
  absensiNis: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  absensiButtons: { flexDirection: "row", gap: 4 },
  absensiBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white },
  absensiBtnText: { fontSize: 10 },
  // Nilai Input
  nilaiControls: { padding: 16, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  typeRow: { flexDirection: "row", gap: 8, marginTop: 4, flexWrap: "wrap" },
  typeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white },
  typeBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  typeBtnText: { fontSize: 12, color: Colors.textMuted },
  typeBtnTextActive: { color: Colors.white, fontWeight: "600" },
  nilaiRow: { flexDirection: "row", alignItems: "center", padding: 12, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  nilaiInfo: { flex: 1 },
  nilaiName: { fontSize: 14, fontWeight: "500", color: Colors.text },
  nilaiNis: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  nilaiInput: { width: 70, height: 40, borderWidth: 2, borderColor: Colors.border, borderRadius: 8, textAlign: "center", fontSize: 18, fontWeight: "bold", color: Colors.text },
  // Save button
  saveButton: { position: "absolute", bottom: 16, left: 16, right: 16, backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, elevation: 4 },
  saveButtonText: { color: Colors.white, fontSize: 16, fontWeight: "600" },
  // Jadwal List
  dayTitle: { fontSize: 14, fontWeight: "bold", color: Colors.primary, marginTop: 16, marginBottom: 8, paddingHorizontal: 4 },
})
