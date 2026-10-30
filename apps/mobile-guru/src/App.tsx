/**
 * SIM MADIN — Guru Mobile App (V1 Complete)
 * Login: Email + Password (Supabase Auth)
 * Fitur: Jadwal mengajar, Input absensi cepat, Input nilai
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
import { createClient, SupabaseClient } from "@supabase/supabase-js"
import * as SecureStore from "expo-secure-store"
import { formatRupiah, formatDate, STATUS_STYLES, DAYS, NILAI_TYPES } from "../vendor/mobile-shared/src"

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "https://sim-madin.vercel.app"
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
  // V2: guru-specific stats
  const [v2Stats, setV2Stats] = useState<{
    pertemuanToday: number
    pendingGrading: number
    materiCount: number
    tugasActive: number
  } | null>(null)

  const loadJadwal = useCallback(async () => {
    try {
      setLoading(true)
      const res = await apiGet("/api/admin/jadwal")
      setJadwal(res.data || [])
      // V2: fetch guru dashboard stats in parallel (best-effort, don't fail whole load)
      apiGet("/api/admin/guru/stats").then((statsRes) => setV2Stats(statsRes.data)).catch(() => setV2Stats(null))
    } catch (e: any) { Alert.alert("Error", e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadJadwal() }, [loadJadwal])

  const today = new Date().getDay() || 7
  const todayJadwal = jadwal.filter(j => j.dayOfWeek === today)

  const menuItems = [
    { id: "absensi", title: "Input Absensi", icon: "checkmark-done", color: Colors.success, bg: Colors.successLight, onPress: () => navigation.navigate("AbsensiInput") },
    { id: "nilai", title: "Input Nilai", icon: "school", color: Colors.primary, bg: Colors.primaryLight, onPress: () => navigation.navigate("NilaiInput") },
    { id: "santri", title: "Daftar Santri", icon: "people", color: "#7c3aed", bg: "#ede9fe", onPress: () => navigation.navigate("SantriList") },
    { id: "jadwal", title: "Lihat Jadwal", icon: "calendar", color: Colors.info, bg: Colors.infoLight, onPress: () => navigation.navigate("JadwalList") },
    { id: "materi", title: "Materi", icon: "book", color: Colors.info, bg: Colors.infoLight, onPress: () => navigation.navigate("MateriList") },
    { id: "tugas", title: "Tugas", icon: "create", color: Colors.success, bg: Colors.successLight, onPress: () => navigation.navigate("TugasList") },
    { id: "pertemuan", title: "Pertemuan", icon: "git-network", color: Colors.primary, bg: Colors.primaryLight, onPress: () => navigation.navigate("PertemuanList") },
    { id: "ujian", title: "Ujian", icon: "ribbon", color: Colors.danger, bg: Colors.dangerLight, onPress: () => navigation.navigate("UjianList") },
    { id: "perkembangan", title: "Perkembangan", icon: "trending-up", color: Colors.success, bg: Colors.successLight, onPress: () => navigation.navigate("Perkembangan") },
    { id: "chat", title: "Chat Wali", icon: "chatbubbles", color: "#7c3aed", bg: "#ede9fe", onPress: () => navigation.navigate("ChatList") },
    { id: "info", title: "Pengumuman", icon: "megaphone", color: Colors.warning, bg: Colors.warningLight, onPress: () => navigation.navigate("PengumumanList") },
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
        {/* V2 — Guru Quick Stats */}
        {v2Stats && (
          <View style={styles.v2StatsRow}>
            <View style={styles.v2StatCard}>
              <Ionicons name="calendar" size={20} color={Colors.info} />
              <Text style={styles.v2StatValue}>{v2Stats.pertemuanToday}</Text>
              <Text style={styles.v2StatLabel}>Pertemuan Hari Ini</Text>
            </View>
            <View style={[styles.v2StatCard, v2Stats.pendingGrading > 0 && { borderColor: Colors.warning }]}>
              <Ionicons name="alert-circle" size={20} color={Colors.warning} />
              <Text style={styles.v2StatValue}>{v2Stats.pendingGrading}</Text>
              <Text style={styles.v2StatLabel}>Perlu Dinilai</Text>
            </View>
            <View style={styles.v2StatCard}>
              <Ionicons name="folder-open" size={20} color="#7c3aed" />
              <Text style={styles.v2StatValue}>{v2Stats.materiCount}</Text>
              <Text style={styles.v2StatLabel}>Materi Saya</Text>
            </View>
            <View style={styles.v2StatCard}>
              <Ionicons name="create" size={20} color={Colors.success} />
              <Text style={styles.v2StatValue}>{v2Stats.tugasActive}</Text>
              <Text style={styles.v2StatLabel}>Tugas Aktif</Text>
            </View>
          </View>
        )}

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
// SANTRI LIST SCREEN
// ============================================================================
function SantriListScreen({ navigation }: { navigation: any }) {
  const [kelasList, setKelasList] = useState<any[]>([])
  const [selectedKelas, setSelectedKelas] = useState("")
  const [santriList, setSantriList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadKelas = useCallback(async () => {
    try {
      const res = await apiGet("/api/admin/kelas")
      setKelasList(res.data || [])
      if (res.data?.length > 0) setSelectedKelas(res.data[0].id)
    } catch (e: any) { Alert.alert("Error", e.message) }
  }, [])

  const loadSantri = useCallback(async () => {
    if (!selectedKelas) return
    try {
      setLoading(true)
      const res = await apiGet(`/api/admin/santri?kelasId=${selectedKelas}&status=AKTIF`)
      setSantriList(res.data || [])
    } catch (e: any) { Alert.alert("Error", e.message) }
    finally { setLoading(false) }
  }, [selectedKelas])

  useEffect(() => { loadKelas() }, [loadKelas])
  useEffect(() => { if (selectedKelas) loadSantri() }, [selectedKelas, loadSantri])

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daftar Santri</Text>
        <View style={{ width: 24 }} />
      </View>

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

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={santriList}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.jadwalCard}>
              <View style={[styles.jadwalTime, { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryLight, justifyContent: "center", alignItems: "center" }]}>
                <Text style={{ fontSize: 18, fontWeight: "bold", color: Colors.primary }}>{item.name[0]}</Text>
              </View>
              <View style={styles.jadwalInfo}>
                <Text style={styles.jadwalMapel}>{item.name}</Text>
                <Text style={styles.jadwalKelas}>NIS: {item.nis} • {item.gender === "L" ? "Laki-laki" : "Perempuan"}</Text>
                {item.wali && <Text style={[styles.jadwalKelas, { fontSize: 11 }]}>Wali: {item.wali.name}</Text>}
              </View>
              <View style={[styles.statusBadge, { backgroundColor: item.status === "AKTIF" ? Colors.successLight : Colors.dangerLight }]}>
                <Text style={[styles.statusText, { color: item.status === "AKTIF" ? Colors.success : Colors.danger, fontSize: 10 }]}>
                  {item.status}
                </Text>
              </View>
            </View>
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyCard}><Text style={styles.emptyText}>Belum ada santri di kelas ini</Text></View>
          )}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </SafeAreaView>
  )
}

// ============================================================================
// PENGUMUMAN LIST SCREEN
// ============================================================================
function PengumumanListScreen({ navigation }: { navigation: any }) {
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await apiGet("/api/admin/pengumuman")
      setAnnouncements(res.data || [])
    } catch (e: any) { Alert.alert("Error", e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const getPriorityColor = (priority: string) => {
    if (priority === "URGENT") return { bg: Colors.dangerLight, color: Colors.danger }
    if (priority === "PENTING") return { bg: Colors.warningLight, color: Colors.warning }
    return { bg: "#f1f5f9", color: Colors.textMuted }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pengumuman</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={announcements}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            const pc = getPriorityColor(item.priority)
            return (
              <View style={styles.jadwalCard}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={[styles.statusBadge, { backgroundColor: pc.bg }]}>
                      <Text style={[styles.statusText, { color: pc.color, fontSize: 10 }]}>{item.priority}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: "#dbeafe" }]}>
                      <Text style={[styles.statusText, { color: "#3b82f6", fontSize: 10 }]}>{item.audience}</Text>
                    </View>
                  </View>
                  <Text style={[styles.jadwalMapel, { marginTop: 8 }]}>{item.title}</Text>
                  <Text style={[styles.jadwalKelas, { marginTop: 4 }]} numberOfLines={3}>{item.content}</Text>
                  <Text style={[styles.jadwalKelas, { fontSize: 11, marginTop: 4, color: Colors.textMuted }]}>{formatDate(item.publishedAt, true)}</Text>
                </View>
              </View>
            )
          }}
          ListEmptyComponent={() => (
            <View style={styles.emptyCard}><Text style={styles.emptyText}>Belum ada pengumuman</Text></View>
          )}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </SafeAreaView>
  )
}

// ============================================================================
// MATERI LIST SCREEN (V2)
// ============================================================================
function MateriListScreen({ navigation }: { navigation: any }) {
  const [materi, setMateri] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMateri, setSelectedMateri] = useState<any | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await apiGet("/api/admin/materi")
      setMateri(res.data || [])
    } catch (e: any) { Alert.alert("Error", e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const openLink = async (url: string | null | undefined) => {
    if (!url) { Alert.alert("Tidak ada tautan", "Materi ini tidak memiliki file/URL"); return }
    const full = url.startsWith("http") ? url : `${API_BASE_URL}${url}`
    try {
      const supported = await Linking.canOpenURL(full)
      if (supported) await Linking.openURL(full)
      else Alert.alert("Tidak bisa membuka tautan", full)
    } catch (e: any) { Alert.alert("Error", e.message) }
  }

  const typeMeta: Record<string, { bg: string; color: string; icon: any }> = {
    DOKUMEN: { bg: Colors.infoLight, color: Colors.info, icon: "document-text" },
    FOTO: { bg: Colors.warningLight, color: Colors.warning, icon: "image" },
    LINK: { bg: "#ede9fe", color: "#7c3aed", icon: "link" },
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Materi Pembelajaran</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={materi}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            const tc = typeMeta[item.type] || typeMeta.DOKUMEN
            return (
              <TouchableOpacity
                style={[styles.jadwalCard, { alignItems: "center" }]}
                onPress={() => setSelectedMateri(item)}
              >
                <View style={[styles.menuIcon, { backgroundColor: tc.bg, width: 40, height: 40, borderRadius: 10, marginBottom: 0 }]}>
                  <Ionicons name={tc.icon} size={20} color={tc.color} />
                </View>
                <View style={styles.jadwalInfo}>
                  <Text style={styles.jadwalMapel} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.jadwalKelas} numberOfLines={1}>
                    {item.mapel?.name || "-"} • {item.kelas?.name || "Semua kelas"}
                  </Text>
                  <Text style={[styles.jadwalKelas, { fontSize: 11 }]} numberOfLines={1}>
                    {item.guru?.name ? `Guru: ${item.guru.name}` : ""}{item.pertemuan ? ` • Pertemuan ${item.pertemuan}` : ""}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: item.isPublished ? Colors.successLight : "#f1f5f9" }]}>
                  <Text style={[styles.statusText, { color: item.isPublished ? Colors.success : Colors.textMuted, fontSize: 10 }]}>
                    {item.isPublished ? "Published" : "Draft"}
                  </Text>
                </View>
              </TouchableOpacity>
            )
          }}
          ListEmptyComponent={() => (
            <View style={styles.emptyCard}><Text style={styles.emptyText}>Belum ada materi</Text></View>
          )}
          contentContainerStyle={{ padding: 16 }}
        />
      )}

      {/* Detail Modal */}
      <Modal visible={!!selectedMateri} transparent animationType="slide" onRequestClose={() => setSelectedMateri(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {selectedMateri && (
              <>
                <Text style={styles.modalTitle}>{selectedMateri.title}</Text>
                <View style={styles.modalMetaRow}>
                  <Text style={styles.modalMetaLabel}>Jenis</Text>
                  <Text style={styles.modalMetaValue}>{selectedMateri.type}</Text>
                </View>
                <View style={styles.modalMetaRow}>
                  <Text style={styles.modalMetaLabel}>Mapel</Text>
                  <Text style={styles.modalMetaValue}>{selectedMateri.mapel?.name || "-"}</Text>
                </View>
                <View style={styles.modalMetaRow}>
                  <Text style={styles.modalMetaLabel}>Kelas</Text>
                  <Text style={styles.modalMetaValue}>{selectedMateri.kelas?.name || "Semua kelas"}</Text>
                </View>
                <View style={styles.modalMetaRow}>
                  <Text style={styles.modalMetaLabel}>Guru</Text>
                  <Text style={styles.modalMetaValue}>{selectedMateri.guru?.name || "-"}</Text>
                </View>
                {selectedMateri.description ? (
                  <View style={{ marginTop: 8 }}>
                    <Text style={styles.modalMetaLabel}>Deskripsi</Text>
                    <Text style={styles.modalDesc}>{selectedMateri.description}</Text>
                  </View>
                ) : null}
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedMateri(null)}>
                    <Text style={styles.modalCloseText}>Tutup</Text>
                  </TouchableOpacity>
                  {(selectedMateri.fileUrl || selectedMateri.externalUrl) && (
                    <TouchableOpacity
                      style={styles.modalOpenBtn}
                      onPress={() => openLink(selectedMateri.externalUrl || selectedMateri.fileUrl)}
                    >
                      <Ionicons name="open-outline" size={16} color={Colors.white} />
                      <Text style={styles.modalOpenText}>Buka</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

// ============================================================================
// TUGAS LIST SCREEN (V2)
// ============================================================================
function TugasListScreen({ navigation }: { navigation: any }) {
  const [tugas, setTugas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await apiGet("/api/admin/tugas")
      setTugas(res.data || [])
    } catch (e: any) { Alert.alert("Error", e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const stats = {
    total: tugas.length,
    active: tugas.filter(t => !t.isOverdue && t.isPublished).length,
    overdue: tugas.filter(t => t.isOverdue).length,
  }

  const openSubmissions = (id: string) => {
    const url = `${API_BASE_URL}/admin/tugas`
    Linking.openURL(url).catch(() => Alert.alert("Tidak bisa membuka", url))
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daftar Tugas</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 16 }}>
        {/* Stats Row */}
        <View style={styles.v2StatsRow}>
          <View style={styles.v2StatCard}>
            <Ionicons name="list" size={20} color={Colors.info} />
            <Text style={styles.v2StatValue}>{stats.total}</Text>
            <Text style={styles.v2StatLabel}>Total Tugas</Text>
          </View>
          <View style={styles.v2StatCard}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            <Text style={styles.v2StatValue}>{stats.active}</Text>
            <Text style={styles.v2StatLabel}>Aktif</Text>
          </View>
          <View style={[styles.v2StatCard, stats.overdue > 0 && { borderColor: Colors.danger }]}>
            <Ionicons name="alert-circle" size={20} color={Colors.danger} />
            <Text style={styles.v2StatValue}>{stats.overdue}</Text>
            <Text style={styles.v2StatLabel}>Lewat Tenggat</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
        ) : tugas.length === 0 ? (
          <View style={styles.emptyCard}><Text style={styles.emptyText}>Belum ada tugas</Text></View>
        ) : (
          tugas.map((item, i) => {
            const dueDate = item.dueDate ? formatDate(item.dueDate, true) : "-"
            return (
              <View key={i} style={[styles.jadwalCard, { alignItems: "center" }]}>
                <View style={styles.jadwalInfo}>
                  <Text style={styles.jadwalMapel} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.jadwalKelas}>{item.mapel?.name || "-"} • {item.kelas?.name || "-"}</Text>
                  <Text style={[styles.jadwalKelas, { fontSize: 11 }]}>
                    Jenis: {item.type || "-"} • Tenggat: {dueDate}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <View style={[styles.statusBadge, { backgroundColor: item.isOverdue ? Colors.dangerLight : item.isPublished ? Colors.successLight : "#f1f5f9" }]}>
                    <Text style={[styles.statusText, { color: item.isOverdue ? Colors.danger : item.isPublished ? Colors.success : Colors.textMuted, fontSize: 10 }]}>
                      {item.isOverdue ? "Overdue" : item.isPublished ? "Aktif" : "Draft"}
                    </Text>
                  </View>
                  <Text style={[styles.jadwalKelas, { fontSize: 11 }]}>
                    {item._count?.submissions ?? 0} kumpul
                  </Text>
                  <TouchableOpacity
                    style={[styles.absensiQuickBtn, { backgroundColor: Colors.info }]}
                    onPress={() => openSubmissions(item.id)}
                  >
                    <Ionicons name="eye" size={14} color={Colors.white} />
                    <Text style={[styles.absensiQuickText, { fontSize: 11 }]}>Lihat</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          })
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

// ============================================================================
// PERTEMUAN LIST SCREEN (V2)
// ============================================================================
function PertemuanListScreen({ navigation }: { navigation: any }) {
  const [pertemuan, setPertemuan] = useState<any[]>([])
  const [kelasList, setKelasList] = useState<any[]>([])
  const [mapelList, setMapelList] = useState<any[]>([])
  const [filterKelas, setFilterKelas] = useState("")
  const [filterMapel, setFilterMapel] = useState("")
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const params: string[] = []
      if (filterKelas) params.push(`kelasId=${filterKelas}`)
      if (filterMapel) params.push(`mapelId=${filterMapel}`)
      const path = `/api/admin/pertemuan${params.length ? `?${params.join("&")}` : ""}`
      const res = await apiGet(path)
      setPertemuan(res.data || [])
    } catch (e: any) { Alert.alert("Error", e.message) }
    finally { setLoading(false) }
  }, [filterKelas, filterMapel])

  const loadFilters = useCallback(async () => {
    try {
      const [k, m] = await Promise.all([apiGet("/api/admin/kelas"), apiGet("/api/admin/mapel")])
      setKelasList(k.data || [])
      setMapelList(m.data || [])
    } catch { /* silent */ }
  }, [])

  useEffect(() => { loadFilters() }, [loadFilters])
  useEffect(() => { load() }, [load])

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daftar Pertemuan</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Filters */}
      <View style={styles.filterBar}>
        <Text style={styles.label}>Kelas</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
          <TouchableOpacity
            style={[styles.pill, !filterKelas && styles.pillActive]}
            onPress={() => setFilterKelas("")}
          >
            <Text style={[styles.pillText, !filterKelas && styles.pillTextActive]}>Semua</Text>
          </TouchableOpacity>
          {kelasList.map(k => (
            <TouchableOpacity
              key={k.id}
              style={[styles.pill, filterKelas === k.id && styles.pillActive]}
              onPress={() => setFilterKelas(filterKelas === k.id ? "" : k.id)}
            >
              <Text style={[styles.pillText, filterKelas === k.id && styles.pillTextActive]}>{k.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Text style={styles.label}>Mapel</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
          <TouchableOpacity
            style={[styles.pill, !filterMapel && styles.pillActive]}
            onPress={() => setFilterMapel("")}
          >
            <Text style={[styles.pillText, !filterMapel && styles.pillTextActive]}>Semua</Text>
          </TouchableOpacity>
          {mapelList.map(m => (
            <TouchableOpacity
              key={m.id}
              style={[styles.pill, filterMapel === m.id && styles.pillActive]}
              onPress={() => setFilterMapel(filterMapel === m.id ? "" : m.id)}
            >
              <Text style={[styles.pillText, filterMapel === m.id && styles.pillTextActive]}>{m.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={pertemuan}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={[styles.jadwalCard, { alignItems: "center" }]}>
              <View style={[styles.menuIcon, { backgroundColor: item.isCompleted ? Colors.successLight : Colors.infoLight, width: 44, height: 44, borderRadius: 12 }]}>
                <Text style={{ fontSize: 16, fontWeight: "bold", color: item.isCompleted ? Colors.success : Colors.info }}>
                  #{item.pertemuanKe}
                </Text>
              </View>
              <View style={styles.jadwalInfo}>
                <Text style={styles.jadwalMapel} numberOfLines={1}>{item.topic || `Pertemuan ke-${item.pertemuanKe}`}</Text>
                <Text style={styles.jadwalKelas}>{item.mapel?.name || "-"} • {item.kelas?.name || "-"}</Text>
                <Text style={[styles.jadwalKelas, { fontSize: 11 }]}>{formatDate(item.date)}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: item.isCompleted ? Colors.successLight : Colors.warningLight }]}>
                <Text style={[styles.statusText, { color: item.isCompleted ? Colors.success : Colors.warning, fontSize: 10 }]}>
                  {item.isCompleted ? "Selesai" : "Belum"}
                </Text>
              </View>
            </View>
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyCard}><Text style={styles.emptyText}>Belum ada pertemuan</Text></View>
          )}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </SafeAreaView>
  )
}

// ============================================================================
// UJIAN LIST SCREEN (V3)
// ============================================================================
function UjianListScreen({ navigation }: { navigation: any }) {
  const [ujian, setUjian] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await apiGet("/api/admin/ujian")
      setUjian(res.data || [])
    } catch (e: any) { Alert.alert("Error", e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const statusMeta: Record<string, { bg: string; color: string; label: string }> = {
    UPCOMING: { bg: Colors.infoLight, color: Colors.info, label: "Akan Datang" },
    ONGOING: { bg: Colors.successLight, color: Colors.success, label: "Berlangsung" },
    COMPLETED: { bg: "#f1f5f9", color: Colors.textMuted, label: "Selesai" },
  }

  const openDetail = (id: string) => {
    const url = `${API_BASE_URL}/admin/ujian`
    Linking.openURL(url).catch(() => Alert.alert("Tidak bisa membuka", url))
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daftar Ujian</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={ujian}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            const sm = statusMeta[item.status] || statusMeta.UPCOMING
            return (
              <View style={[styles.jadwalCard, { alignItems: "center" }]}>
                <View style={[styles.menuIcon, { backgroundColor: sm.bg, width: 44, height: 44, borderRadius: 12 }]}>
                  <Ionicons name="ribbon" size={22} color={sm.color} />
                </View>
                <View style={styles.jadwalInfo}>
                  <Text style={styles.jadwalMapel} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.jadwalKelas}>{item.type} • {item.mapel?.name || "-"} • {item.kelas?.name || "-"}</Text>
                  <Text style={[styles.jadwalKelas, { fontSize: 11 }]}>
                    {formatDate(item.startTime, true)} → {formatDate(item.endTime, true)}
                  </Text>
                  <Text style={[styles.jadwalKelas, { fontSize: 11 }]}>
                    {item._count?.peserta ?? 0} peserta • {item._count?.nilai ?? 0} nilai
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 6 }}>
                  <View style={[styles.statusBadge, { backgroundColor: sm.bg }]}>
                    <Text style={[styles.statusText, { color: sm.color, fontSize: 10 }]}>{sm.label}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.absensiQuickBtn, { backgroundColor: Colors.info }]}
                    onPress={() => openDetail(item.id)}
                  >
                    <Ionicons name="eye" size={14} color={Colors.white} />
                    <Text style={[styles.absensiQuickText, { fontSize: 11 }]}>Lihat</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          }}
          ListEmptyComponent={() => (
            <View style={styles.emptyCard}><Text style={styles.emptyText}>Belum ada ujian</Text></View>
          )}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </SafeAreaView>
  )
}

// ============================================================================
// PERKEMBANGAN SCREEN (V4) — Quran / Kitab / Akhlak / Pembinaan
// ============================================================================
const PERKEMBANGAN_TABS = [
  { value: "quran", label: "Quran", endpoint: "/api/admin/perkembangan/quran" },
  { value: "kitab", label: "Kitab", endpoint: "/api/admin/perkembangan/kitab" },
  { value: "akhlak", label: "Akhlak", endpoint: "/api/admin/perkembangan/akhlak" },
  { value: "pembinaan", label: "Pembinaan", endpoint: "/api/admin/perkembangan/pembinaan" },
]

function PerkembanganScreen({ navigation }: { navigation: any }) {
  const [activeTab, setActiveTab] = useState("quran")
  const [entries, setEntries] = useState<any[]>([])
  const [santriList, setSantriList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<any>({
    santriId: "", type: "TIQRO", surah: "", juz: "", ayatFrom: "", ayatTo: "", score: "", status: "PROGRESS", catatan: "",
    kitabName: "", halaman: "",
    adabGuru: "", adabOrangTua: "", adabTeman: "", kedisiplinan: "", kebersihan: "", tanggungJawab: "", predikat: "",
    title: "", description: "", severity: "RINGAN", tindakan: "",
  })

  const active = PERKEMBANGAN_TABS.find(t => t.value === activeTab)!

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await apiGet(active.endpoint)
      setEntries(res.data || [])
    } catch (e: any) { Alert.alert("Error", e.message) }
    finally { setLoading(false) }
  }, [active.endpoint])

  const loadSantri = useCallback(async () => {
    try {
      const res = await apiGet("/api/admin/santri?status=AKTIF")
      setSantriList(res.data || [])
    } catch { /* silent */ }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadSantri() }, [loadSantri])

  const openAdd = () => {
    setForm({
      santriId: santriList[0]?.id || "", type: activeTab === "quran" ? "TIQRO" : "HAFALAN",
      surah: "", juz: "", ayatFrom: "", ayatTo: "", score: "", status: "PROGRESS", catatan: "",
      kitabName: "", halaman: "",
      adabGuru: "", adabOrangTua: "", adabTeman: "", kedisiplinan: "", kebersihan: "", tanggungJawab: "", predikat: "",
      title: "", description: "", severity: "RINGAN", tindakan: "",
    })
    setShowAddModal(true)
  }

  const handleSave = async () => {
    if (!form.santriId) { Alert.alert("Validasi", "Pilih santri dulu"); return }
    setSaving(true)
    try {
      const body: any = { santriId: form.santriId }
      if (activeTab === "quran") {
        body.type = form.type || "TIQRO"
        body.surah = form.surah || null
        body.juz = form.juz || null
        body.ayatFrom = form.ayatFrom ? Number(form.ayatFrom) : null
        body.ayatTo = form.ayatTo ? Number(form.ayatTo) : null
        body.score = form.score ? Number(form.score) : null
        body.status = form.status || "PROGRESS"
        body.catatan = form.catatan || null
        body.pertemuanDate = new Date().toISOString()
      } else if (activeTab === "kitab") {
        body.type = form.type || "HAFALAN"
        body.kitabName = form.kitabName
        body.halaman = form.halaman || null
        body.score = form.score ? Number(form.score) : null
        body.status = form.status || "PROGRESS"
        body.catatan = form.catatan || null
        body.pertemuanDate = new Date().toISOString()
      } else if (activeTab === "akhlak") {
        body.adabGuru = Number(form.adabGuru) || 0
        body.adabOrangTua = Number(form.adabOrangTua) || 0
        body.adabTeman = Number(form.adabTeman) || 0
        body.kedisiplinan = Number(form.kedisiplinan) || 0
        body.kebersihan = Number(form.kebersihan) || 0
        body.tanggungJawab = Number(form.tanggungJawab) || 0
        body.predikat = form.predikat || null
        body.catatan = form.catatan || null
        body.periodeDate = new Date().toISOString()
      } else if (activeTab === "pembinaan") {
        body.type = form.type || "PEMBERIAN"
        body.title = form.title
        body.description = form.description
        body.severity = form.severity || "RINGAN"
        body.tindakan = form.tindakan || null
        body.status = "OPEN"
      }
      await apiPost(active.endpoint, body)
      Alert.alert("Berhasil", "Data tersimpan")
      setShowAddModal(false)
      load()
    } catch (e: any) { Alert.alert("Gagal", e.message) }
    finally { setSaving(false) }
  }

  const renderEntry = (item: any) => {
    const santriName = item.santri?.name || "-"
    const date = item.pertemuanDate || item.periodeDate || item.createdAt
    if (activeTab === "quran") {
      return (
        <View key={item.id} style={[styles.jadwalCard, { alignItems: "center" }]}>
          <View style={styles.jadwalInfo}>
            <Text style={styles.jadwalMapel} numberOfLines={1}>{santriName}</Text>
            <Text style={styles.jadwalKelas}>
              {item.type} • {item.surah || "-"}{item.juz ? ` • Juz ${item.juz}` : ""}
              {item.ayatFrom ? ` • ${item.ayatFrom}${item.ayatTo ? `-${item.ayatTo}` : ""}` : ""}
            </Text>
            <Text style={[styles.jadwalKelas, { fontSize: 11 }]}>{formatDate(date)}</Text>
            {item.catatan ? <Text style={[styles.jadwalKelas, { fontSize: 11, fontStyle: "italic" }]} numberOfLines={2}>"{item.catatan}"</Text> : null}
          </View>
          {item.score != null && (
            <View style={[styles.statusBadge, { backgroundColor: Number(item.score) >= 70 ? Colors.successLight : Colors.dangerLight }]}>
              <Text style={[styles.statusText, { color: Number(item.score) >= 70 ? Colors.success : Colors.danger, fontSize: 12 }]}>{item.score}</Text>
            </View>
          )}
        </View>
      )
    }
    if (activeTab === "kitab") {
      return (
        <View key={item.id} style={[styles.jadwalCard, { alignItems: "center" }]}>
          <View style={styles.jadwalInfo}>
            <Text style={styles.jadwalMapel} numberOfLines={1}>{santriName}</Text>
            <Text style={styles.jadwalKelas}>
              {item.type} • {item.kitabName}{item.halaman ? ` • hlm ${item.halaman}` : ""}
            </Text>
            <Text style={[styles.jadwalKelas, { fontSize: 11 }]}>{formatDate(date)}</Text>
            {item.catatan ? <Text style={[styles.jadwalKelas, { fontSize: 11, fontStyle: "italic" }]} numberOfLines={2}>"{item.catatan}"</Text> : null}
          </View>
          {item.score != null && (
            <View style={[styles.statusBadge, { backgroundColor: Number(item.score) >= 70 ? Colors.successLight : Colors.dangerLight }]}>
              <Text style={[styles.statusText, { color: Number(item.score) >= 70 ? Colors.success : Colors.danger, fontSize: 12 }]}>{item.score}</Text>
            </View>
          )}
        </View>
      )
    }
    if (activeTab === "akhlak") {
      return (
        <View key={item.id} style={[styles.jadwalCard, { alignItems: "center" }]}>
          <View style={styles.jadwalInfo}>
            <Text style={styles.jadwalMapel} numberOfLines={1}>{santriName}</Text>
            <Text style={styles.jadwalKelas}>Rata-rata: {item.rataRata?.toFixed?.(1) ?? item.rataRata ?? "-"}</Text>
            <Text style={[styles.jadwalKelas, { fontSize: 11 }]}>{formatDate(date)}</Text>
            {item.catatan ? <Text style={[styles.jadwalKelas, { fontSize: 11, fontStyle: "italic" }]} numberOfLines={2}>"{item.catatan}"</Text> : null}
          </View>
          {item.predikat && (
            <View style={[styles.statusBadge, { backgroundColor: Colors.infoLight }]}>
              <Text style={[styles.statusText, { color: Colors.info, fontSize: 11 }]}>{item.predikat}</Text>
            </View>
          )}
        </View>
      )
    }
    // pembinaan
    const sevColor = item.severity === "BERAT" ? Colors.danger : item.severity === "SEDANG" ? Colors.warning : Colors.success
    const sevBg = item.severity === "BERAT" ? Colors.dangerLight : item.severity === "SEDANG" ? Colors.warningLight : Colors.successLight
    return (
      <View key={item.id} style={[styles.jadwalCard, { alignItems: "center" }]}>
        <View style={styles.jadwalInfo}>
          <Text style={styles.jadwalMapel} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.jadwalKelas}>{santriName} • {item.type}</Text>
          <Text style={[styles.jadwalKelas, { fontSize: 11 }]} numberOfLines={2}>{item.description}</Text>
          <Text style={[styles.jadwalKelas, { fontSize: 11 }]}>{formatDate(date)}</Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          <View style={[styles.statusBadge, { backgroundColor: sevBg }]}>
            <Text style={[styles.statusText, { color: sevColor, fontSize: 10 }]}>{item.severity}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: item.status === "OPEN" ? Colors.dangerLight : Colors.successLight }]}>
            <Text style={[styles.statusText, { color: item.status === "OPEN" ? Colors.danger : Colors.success, fontSize: 10 }]}>{item.status}</Text>
          </View>
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Perkembangan Santri</Text>
        <TouchableOpacity onPress={openAdd} style={styles.headerAction}>
          <Ionicons name="add-circle" size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {PERKEMBANGAN_TABS.map(t => (
          <TouchableOpacity
            key={t.value}
            style={[styles.tabBtn, activeTab === t.value && styles.tabBtnActive]}
            onPress={() => setActiveTab(t.value)}
          >
            <Text style={[styles.tabBtnText, activeTab === t.value && styles.tabBtnTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
      ) : entries.length === 0 ? (
        <View style={styles.emptyCard}><Text style={styles.emptyText}>Belum ada data {active.label.toLowerCase()}</Text></View>
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 16 }}>
          {entries.map(renderEntry)}
        </ScrollView>
      )}

      {/* Add Modal */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Tambah {active.label}</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              <Text style={styles.modalMetaLabel}>Santri</Text>
              <View style={styles.modalPickerScroll}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {santriList.map(s => (
                    <TouchableOpacity
                      key={s.id}
                      style={[styles.pill, form.santriId === s.id && styles.pillActive]}
                      onPress={() => setForm({ ...form, santriId: s.id })}
                    >
                      <Text style={[styles.pillText, form.santriId === s.id && styles.pillTextActive]}>{s.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {activeTab === "quran" && (
                <>
                  <Text style={styles.modalMetaLabel}>Jenis</Text>
                  <View style={styles.typeRow}>
                    {["TIQRO", "IQRO", "QURAN"].map(t => (
                      <TouchableOpacity
                        key={t}
                        style={[styles.typeBtn, form.type === t && styles.typeBtnActive]}
                        onPress={() => setForm({ ...form, type: t })}
                      >
                        <Text style={[styles.typeBtnText, form.type === t && styles.typeBtnTextActive]}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.modalMetaLabel}>Surah</Text>
                  <TextInput style={styles.modalInput} value={form.surah} onChangeText={(v) => setForm({ ...form, surah: v })} placeholder="Surah/lokasi" />
                  <Text style={styles.modalMetaLabel}>Juz (opsional)</Text>
                  <TextInput style={styles.modalInput} value={form.juz} onChangeText={(v) => setForm({ ...form, juz: v })} keyboardType="numeric" placeholder="Juz" />
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalMetaLabel}>Ayat dari</Text>
                      <TextInput style={styles.modalInput} value={form.ayatFrom} onChangeText={(v) => setForm({ ...form, ayatFrom: v })} keyboardType="numeric" placeholder="1" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalMetaLabel}>Sampai</Text>
                      <TextInput style={styles.modalInput} value={form.ayatTo} onChangeText={(v) => setForm({ ...form, ayatTo: v })} keyboardType="numeric" placeholder="5" />
                    </View>
                  </View>
                </>
              )}

              {activeTab === "kitab" && (
                <>
                  <Text style={styles.modalMetaLabel}>Jenis</Text>
                  <View style={styles.typeRow}>
                    {["HAFALAN", "BACAAN", "PIDATO"].map(t => (
                      <TouchableOpacity
                        key={t}
                        style={[styles.typeBtn, form.type === t && styles.typeBtnActive]}
                        onPress={() => setForm({ ...form, type: t })}
                      >
                        <Text style={[styles.typeBtnText, form.type === t && styles.typeBtnTextActive]}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.modalMetaLabel}>Nama Kitab</Text>
                  <TextInput style={styles.modalInput} value={form.kitabName} onChangeText={(v) => setForm({ ...form, kitabName: v })} placeholder="Mis. Ta'lim Muta'allim" />
                  <Text style={styles.modalMetaLabel}>Halaman (opsional)</Text>
                  <TextInput style={styles.modalInput} value={form.halaman} onChangeText={(v) => setForm({ ...form, halaman: v })} keyboardType="numeric" placeholder="Hlm" />
                </>
              )}

              {activeTab === "akhlak" && (
                <>
                  <Text style={styles.modalMetaLabel}>Nilai Aspek (0-100)</Text>
                  {[
                    ["adabGuru", "Adab ke Guru"],
                    ["adabOrangTua", "Adab ke Ortu"],
                    ["adabTeman", "Adab ke Teman"],
                    ["kedisiplinan", "Kedisiplinan"],
                    ["kebersihan", "Kebersihan"],
                    ["tanggungJawab", "Tanggung Jawab"],
                  ].map(([key, label]) => (
                    <View key={key} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <Text style={{ flex: 1, fontSize: 12, color: Colors.text }}>{label}</Text>
                      <TextInput
                        style={[styles.modalInput, { width: 70 }]}
                        value={form[key]}
                        onChangeText={(v) => setForm({ ...form, [key]: v })}
                        keyboardType="numeric"
                        maxLength={3}
                        placeholder="0-100"
                      />
                    </View>
                  ))}
                </>
              )}

              {activeTab === "pembinaan" && (
                <>
                  <Text style={styles.modalMetaLabel}>Jenis</Text>
                  <View style={styles.typeRow}>
                    {["PEMBERIAN", "PELANGGARAN", "PENGHARGAAN"].map(t => (
                      <TouchableOpacity
                        key={t}
                        style={[styles.typeBtn, form.type === t && styles.typeBtnActive]}
                        onPress={() => setForm({ ...form, type: t })}
                      >
                        <Text style={[styles.typeBtnText, form.type === t && styles.typeBtnTextActive]}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.modalMetaLabel}>Judul</Text>
                  <TextInput style={styles.modalInput} value={form.title} onChangeText={(v) => setForm({ ...form, title: v })} placeholder="Judul singkat" />
                  <Text style={styles.modalMetaLabel}>Deskripsi</Text>
                  <TextInput style={[styles.modalInput, { minHeight: 60 }]} value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} placeholder="Deskripsi kejadian" multiline />
                  <Text style={styles.modalMetaLabel}>Tingkat</Text>
                  <View style={styles.typeRow}>
                    {["RINGAN", "SEDANG", "BERAT"].map(t => (
                      <TouchableOpacity
                        key={t}
                        style={[styles.typeBtn, form.severity === t && styles.typeBtnActive]}
                        onPress={() => setForm({ ...form, severity: t })}
                      >
                        <Text style={[styles.typeBtnText, form.severity === t && styles.typeBtnTextActive]}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.modalMetaLabel}>Tindakan (opsional)</Text>
                  <TextInput style={styles.modalInput} value={form.tindakan} onChangeText={(v) => setForm({ ...form, tindakan: v })} placeholder="Tindakan diambil" />
                </>
              )}

              {(activeTab === "quran" || activeTab === "kitab" || activeTab === "akhlak") && (
                <>
                  <Text style={styles.modalMetaLabel}>Nilai (opsional)</Text>
                  <TextInput style={styles.modalInput} value={form.score} onChangeText={(v) => setForm({ ...form, score: v })} keyboardType="numeric" maxLength={3} placeholder="0-100" />
                </>
              )}

              {activeTab !== "pembinaan" && (
                <>
                  <Text style={styles.modalMetaLabel}>Status</Text>
                  <View style={styles.typeRow}>
                    {["PROGRESS", "SELESAI", "ULANG"].map(t => (
                      <TouchableOpacity
                        key={t}
                        style={[styles.typeBtn, form.status === t && styles.typeBtnActive]}
                        onPress={() => setForm({ ...form, status: t })}
                      >
                        <Text style={[styles.typeBtnText, form.status === t && styles.typeBtnTextActive]}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <Text style={styles.modalMetaLabel}>Catatan (opsional)</Text>
              <TextInput style={[styles.modalInput, { minHeight: 50 }]} value={form.catatan} onChangeText={(v) => setForm({ ...form, catatan: v })} placeholder="Catatan tambahan" multiline />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowAddModal(false)}>
                <Text style={styles.modalCloseText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalOpenBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color={Colors.white} size="small" /> : <Text style={styles.modalOpenText}>Simpan</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

// ============================================================================
// CHAT LIST SCREEN (V6)
// ============================================================================
function ChatListScreen({ navigation }: { navigation: any }) {
  const [rooms, setRooms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [waliList, setWaliList] = useState<any[]>([])
  const [santriList, setSantriList] = useState<any[]>([])
  const [selectedWali, setSelectedWali] = useState("")
  const [selectedSantri, setSelectedSantri] = useState("")
  const [roomType, setRoomType] = useState("WALI_GURU")
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await apiGet("/api/admin/chat")
      setRooms(res.data || [])
    } catch (e: any) { Alert.alert("Error", e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd = async () => {
    try {
      const [waliRes, santriRes] = await Promise.all([
        apiGet("/api/admin/wali"),
        apiGet("/api/admin/santri?status=AKTIF"),
      ])
      setWaliList(waliRes.data || [])
      setSantriList(santriRes.data || [])
      setSelectedWali(waliRes.data?.[0]?.id || "")
      setSelectedSantri("")
      setShowAddModal(true)
    } catch (e: any) { Alert.alert("Error", e.message) }
  }

  const handleCreate = async () => {
    if (!selectedWali) { Alert.alert("Validasi", "Pilih wali dulu"); return }
    setSaving(true)
    try {
      await apiPost("/api/admin/chat", {
        type: roomType,
        waliId: selectedWali,
        santriId: selectedSantri || undefined,
      })
      Alert.alert("Berhasil", "Chat room dibuat")
      setShowAddModal(false)
      load()
    } catch (e: any) { Alert.alert("Gagal", e.message) }
    finally { setSaving(false) }
  }

  const openChatInBrowser = () => {
    const url = `${API_BASE_URL}/admin/chat`
    Linking.openURL(url).catch(() => Alert.alert("Tidak bisa membuka", url))
  }

  const typeMeta: Record<string, { bg: string; color: string; label: string; icon: any }> = {
    WALI_GURU: { bg: Colors.infoLight, color: Colors.info, label: "Wali ↔ Guru", icon: "school" },
    WALI_WALI: { bg: Colors.successLight, color: Colors.success, label: "Wali ↔ Wali", icon: "people" },
    GROUP: { bg: "#ede9fe", color: "#7c3aed", label: "Grup", icon: "people-circle" },
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chat Wali</Text>
        <TouchableOpacity onPress={openAdd} style={styles.headerAction}>
          <Ionicons name="add-circle" size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            const tm = typeMeta[item.type] || typeMeta.WALI_GURU
            return (
              <TouchableOpacity style={[styles.jadwalCard, { alignItems: "center" }]} onPress={openChatInBrowser}>
                <View style={[styles.menuIcon, { backgroundColor: tm.bg, width: 44, height: 44, borderRadius: 22 }]}>
                  <Ionicons name={tm.icon} size={20} color={tm.color} />
                </View>
                <View style={styles.jadwalInfo}>
                  <Text style={styles.jadwalMapel} numberOfLines={1}>
                    {item.wali?.name || "-"}{item.santri ? ` • ${item.santri.name}` : ""}
                  </Text>
                  <Text style={styles.jadwalKelas}>{tm.label}{item.guru ? ` • Guru: ${item.guru.name}` : ""}</Text>
                  <Text style={[styles.jadwalKelas, { fontSize: 11 }]}>{formatDate(item.lastMessageAt, true)}</Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <View style={[styles.statusBadge, { backgroundColor: Colors.infoLight }]}>
                    <Text style={[styles.statusText, { color: Colors.info, fontSize: 11 }]}>{item._count?.messages ?? 0} pesan</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                </View>
              </TouchableOpacity>
            )
          }}
          ListEmptyComponent={() => (
            <View style={styles.emptyCard}><Text style={styles.emptyText}>Belum ada chat room. Tekan + untuk membuat.</Text></View>
          )}
          contentContainerStyle={{ padding: 16 }}
        />
      )}

      {/* Add Chat Modal */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Chat Baru</Text>

            <Text style={styles.modalMetaLabel}>Tipe Chat</Text>
            <View style={styles.typeRow}>
              {Object.entries(typeMeta).map(([key, tm]) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.typeBtn, roomType === key && styles.typeBtnActive]}
                  onPress={() => setRoomType(key)}
                >
                  <Text style={[styles.typeBtnText, roomType === key && styles.typeBtnTextActive]}>{tm.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalMetaLabel}>Wali</Text>
            <View style={styles.modalPickerScroll}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {waliList.map(w => (
                  <TouchableOpacity
                    key={w.id}
                    style={[styles.pill, selectedWali === w.id && styles.pillActive]}
                    onPress={() => setSelectedWali(w.id)}
                  >
                    <Text style={[styles.pillText, selectedWali === w.id && styles.pillTextActive]}>{w.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {waliList.length === 0 && <Text style={[styles.emptyText, { padding: 8 }]}>Belum ada wali terdaftar</Text>}
            </View>

            <Text style={styles.modalMetaLabel}>Santri (opsional)</Text>
            <View style={styles.modalPickerScroll}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                  style={[styles.pill, !selectedSantri && styles.pillActive]}
                  onPress={() => setSelectedSantri("")}
                >
                  <Text style={[styles.pillText, !selectedSantri && styles.pillTextActive]}>Tidak ada</Text>
                </TouchableOpacity>
                {santriList.map(s => (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.pill, selectedSantri === s.id && styles.pillActive]}
                    onPress={() => setSelectedSantri(s.id)}
                  >
                    <Text style={[styles.pillText, selectedSantri === s.id && styles.pillTextActive]}>{s.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowAddModal(false)}>
                <Text style={styles.modalCloseText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalOpenBtn, saving && { opacity: 0.6 }]} onPress={handleCreate} disabled={saving}>
                {saving ? <ActivityIndicator color={Colors.white} size="small" /> : <Text style={styles.modalOpenText}>Buat</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  SantriList: undefined
  PengumumanList: undefined
  MateriList: undefined
  TugasList: undefined
  PertemuanList: undefined
  UjianList: undefined
  Perkembangan: undefined
  ChatList: undefined
}

const Stack = createNativeStackNavigator<RootStackParamList>()

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [checking, setChecking] = useState(true)
  // Realtime refresh tick — bumped whenever a subscribed table changes.
  // Passed down so list screens can re-fetch on Tugas/PengumpulanTugas events.
  const [refreshKey, setRefreshKey] = useState(0)

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

  // ============================================================================
  // Supabase Realtime subscriptions (OPTIONAL — fails silently if unavailable)
  // - PengumpulanTugas INSERT : santri submit tugas → refresh pengumpulan list
  // - Tugas            UPDATE  : tugas dipublish / diubah → refresh list tugas
  // ============================================================================
  useEffect(() => {
    if (!isLoggedIn) return
    let cancelled = false
    const unsubs: Array<() => void> = []
    import("../vendor/mobile-shared/src/realtime")
      .then(async ({ subscribeToTable }) => {
        for (const table of ["Tugas", "PengumpulanTugas"] as const) {
          try {
            const unsub = await subscribeToTable(table, () => {
              setRefreshKey(k => k + 1)
            })
            if (cancelled) { try { unsub() } catch {} }
            else { unsubs.push(unsub) }
          } catch {}
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
      unsubs.forEach(u => { try { u() } catch {} })
    }
  }, [isLoggedIn])

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
            <Stack.Screen name="SantriList" component={SantriListScreen} />
            <Stack.Screen name="PengumumanList" component={PengumumanListScreen} />
            <Stack.Screen name="MateriList" component={MateriListScreen} />
            <Stack.Screen name="TugasList" component={TugasListScreen} />
            <Stack.Screen name="PertemuanList" component={PertemuanListScreen} />
            <Stack.Screen name="UjianList" component={UjianListScreen} />
            <Stack.Screen name="Perkembangan" component={PerkembanganScreen} />
            <Stack.Screen name="ChatList" component={ChatListScreen} />
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
  // V2 — Guru Quick Stats
  v2StatsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  v2StatCard: {
    backgroundColor: Colors.white, borderRadius: 12, padding: 12,
    width: "48%", alignItems: "center", elevation: 1,
    borderWidth: 1, borderColor: Colors.border,
  },
  v2StatValue: { fontSize: 24, fontWeight: "bold", color: Colors.text, marginTop: 4 },
  v2StatLabel: { fontSize: 10, color: Colors.textMuted, marginTop: 2, textAlign: "center" },
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
  // Header right action (Tambah button)
  headerAction: { padding: 4 },
  // Filter bar (PertemuanList)
  filterBar: { padding: 12, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  // Tab row (Perkembangan)
  tabRow: { flexDirection: "row", backgroundColor: Colors.white, paddingHorizontal: 8, paddingVertical: 8, gap: 4, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tabBtn: { flex: 1, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white, alignItems: "center" },
  tabBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabBtnText: { fontSize: 12, color: Colors.textMuted, fontWeight: "500" },
  tabBtnTextActive: { color: Colors.white, fontWeight: "600" },
  // Modal (Detail / Add Form)
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 16 },
  modalCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 20, width: "100%", maxHeight: "85%", elevation: 8 },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: Colors.text, marginBottom: 12 },
  modalMetaRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalMetaLabel: { fontSize: 12, fontWeight: "600", color: Colors.textMuted, marginTop: 8, marginBottom: 4 },
  modalMetaValue: { fontSize: 13, color: Colors.text, fontWeight: "500" },
  modalDesc: { fontSize: 13, color: Colors.text, lineHeight: 20, marginTop: 2 },
  modalInput: { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: Colors.text, marginBottom: 4 },
  modalPickerScroll: { marginTop: 4, marginBottom: 8, maxHeight: 56 },
  modalActions: { flexDirection: "row", gap: 8, marginTop: 16, justifyContent: "flex-end" },
  modalCloseBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white },
  modalCloseText: { fontSize: 14, color: Colors.textMuted, fontWeight: "600" },
  modalOpenBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: Colors.primary },
  modalOpenText: { fontSize: 14, color: Colors.white, fontWeight: "600" },
  // Status badge (used across multiple screens: guru list, pengumuman, tugas, perkembangan, ujian, nilai)
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: "transparent" },
  statusText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.3 },
})
