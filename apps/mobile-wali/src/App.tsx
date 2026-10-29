/**
 * SIM MADIN — Wali Santri Mobile App
 * ============================================================================
 * Login via WhatsApp + PIN
 * Dashboard: list anak → detail (absensi, nilai, tagihan, dll)
 * Backend: Next.js API (deploy di Netlify) + Supabase Auth + Postgres
 * ============================================================================
 */

import React, { useState, useEffect, useCallback } from "react"
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, SafeAreaView, StatusBar, ScrollView, Alert,
  FlatList, Image, Modal,
} from "react-native"
import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { Ionicons } from "@expo/vector-icons"

// Import dari shared package
import {
  MobileApiClient, normalizeWhatsApp, formatPhoneDisplay,
  saveWaliSession, loadWaliSession, clearWaliSession,
  formatRupiah, formatDate, STATUS_STYLES, DAYS,
} from "../../../packages/mobile-shared/src"

// ============================================================================
// CONFIG
// ============================================================================
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "https://sim-madin.vercel.app"

// API client untuk wali (pakai JWT token dari login WA+PIN)
let waliToken: string | null = null
const api = new MobileApiClient({
  baseUrl: API_BASE_URL,
  getToken: async () => waliToken,
})

// ============================================================================
// TYPES
// ============================================================================
interface WaliData { id: string; name: string; phone: string; email?: string }
interface SantriData {
  id: string; nis: string; name: string; gender: string; photoUrl?: string | null;
  kelas?: { id: string; name: string; code: string }
  relationship?: string; isPrimary?: boolean
}
interface SantriDetail {
  santri: any; absensi: any[]; absensiSummary: any; nilai: any[];
  tagihan: any[]; tagihanSummary: any; payments: any[];
  jadwal: any[]; announcements: any[]; activePeriod: any
}

// ============================================================================
// COLORS
// ============================================================================
const Colors = {
  primary: "#059669", // emerald-600
  primaryLight: "#d1fae5",
  primaryDark: "#047857",
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
// SCREENS
// ============================================================================

// --- Login Screen ---
function LoginScreen({ onLogin, onForgotPin }: { onLogin: (token: string, wali: WaliData, santriList: SantriData[]) => void; onForgotPin?: () => void }) {
  const [phone, setPhone] = useState("081234511001")
  const [pin, setPin] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPin, setShowPin] = useState(false)

  const handleLogin = async () => {
    if (!phone || !pin) {
      Alert.alert("Validasi", "Nomor WhatsApp dan PIN wajib diisi")
      return
    }
    if (pin.length !== 6) {
      Alert.alert("Validasi", "PIN harus 6 digit")
      return
    }

    setLoading(true)
    try {
      const data = await api.post("/api/wali/login", { phone, pin })
      if (data.success) {
        waliToken = data.token
        await saveWaliSession(data.token, data.wali, data.santriList)
        onLogin(data.token, data.wali, data.santriList)
      } else {
        Alert.alert("Login Gagal", data.error || "Terjadi kesalahan")
      }
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
          <Ionicons name="people-circle" size={80} color={Colors.primary} />
          <Text style={styles.loginTitle}>SIM MADIN</Text>
          <Text style={styles.loginSubtitle}>Wali Santri</Text>
        </View>

        <View style={styles.loginCard}>
          <Text style={styles.loginCardTitle}>Masuk ke Akun</Text>
          <Text style={styles.loginCardDesc}>Masuk dengan Nomor WhatsApp & PIN</Text>

          <Text style={styles.label}>Nomor WhatsApp</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="call" size={20} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="08xxx atau 628xxx"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoCapitalize="none"
            />
          </View>

          <Text style={styles.label}>PIN (6 digit)</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed" size={20} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { letterSpacing: 8, textAlign: "center" }]}
              placeholder="••••••"
              value={pin}
              onChangeText={(t) => setPin(t.replace(/\D/g, "").slice(0, 6))}
              keyboardType="numeric"
              secureTextEntry={!showPin}
              maxLength={6}
            />
            <TouchableOpacity onPress={() => setShowPin(!showPin)} style={styles.eyeIcon}>
              <Ionicons name={showPin ? "eye-off" : "eye"} size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.loginButton, loading && { opacity: 0.6 }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.loginButtonText}>Masuk</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.demoText}>Demo: 081234511001 / PIN: 258041</Text>

          <TouchableOpacity onPress={() => onForgotPin?.()} style={styles.forgotPinBtn}>
            <Text style={styles.forgotPinText}>Lupa PIN?</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

// --- Forgot PIN Screen (3-step OTP flow) ---
function ForgotPinScreen({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<"phone" | "otp" | "setPin">("phone")
  const [phone, setPhone] = useState("")
  const [otp, setOtp] = useState("")
  const [newPin, setNewPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [loading, setLoading] = useState(false)
  const [verifyToken, setVerifyToken] = useState("")

  const handleRequestOtp = async () => {
    if (!phone) { Alert.alert("Validasi", "Nomor WhatsApp wajib diisi"); return }
    setLoading(true)
    try {
      const res = await api.post("/api/wali/request-otp", { phone, type: "FORGOT_PIN" })
      Alert.alert("OTP Terkirim", res.devOtp ? `Kode OTP (DEV): ${res.devOtp}` : res.message)
      setStep("otp")
    } catch (e: any) { Alert.alert("Gagal", e.message) }
    finally { setLoading(false) }
  }

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) { Alert.alert("Validasi", "OTP harus 6 digit"); return }
    setLoading(true)
    try {
      const res = await api.post("/api/wali/verify-otp", { phone, otpCode: otp })
      if (res.verifyToken) {
        setVerifyToken(res.verifyToken)
        setStep("setPin")
        Alert.alert("Terverifikasi", "Silakan buat PIN baru")
      } else { Alert.alert("Gagal", "Token verifikasi tidak diterima") }
    } catch (e: any) { Alert.alert("Gagal", e.message) }
    finally { setLoading(false) }
  }

  const handleSetPin = async () => {
    if (!newPin || newPin.length !== 6) { Alert.alert("Validasi", "PIN harus 6 digit"); return }
    if (newPin !== confirmPin) { Alert.alert("Validasi", "PIN tidak cocok"); return }
    setLoading(true)
    try {
      await api.post("/api/wali/set-pin", { verifyToken, pin: newPin })
      Alert.alert("Berhasil", "PIN berhasil diubah. Silakan login dengan PIN baru.", [{ text: "OK", onPress: onBack }])
    } catch (e: any) { Alert.alert("Gagal", e.message) }
    finally { setLoading(false) }
  }

  return (
    <SafeAreaView style={styles.loginContainer}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <ScrollView contentContainerStyle={styles.loginScroll}>
        <View style={styles.loginLogo}>
          <Ionicons name="key" size={80} color={Colors.white} />
          <Text style={styles.loginTitle}>Lupa PIN</Text>
          <Text style={styles.loginSubtitle}>Reset PIN via OTP</Text>
        </View>

        <View style={styles.loginCard}>
          {step === "phone" && (
            <>
              <Text style={styles.loginCardTitle}>Masukkan Nomor WhatsApp</Text>
              <Text style={styles.loginCardDesc}>Kami akan kirim kode OTP ke nomor Anda</Text>
              <Text style={styles.label}>Nomor WhatsApp</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="call" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="08xxx atau 628xxx" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
              </View>
              <TouchableOpacity style={[styles.loginButton, loading && { opacity: 0.6 }]} onPress={handleRequestOtp} disabled={loading}>
                {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.loginButtonText}>Kirim OTP</Text>}
              </TouchableOpacity>
            </>
          )}

          {step === "otp" && (
            <>
              <Text style={styles.loginCardTitle}>Verifikasi OTP</Text>
              <Text style={styles.loginCardDesc}>Masukkan 6 digit kode yang dikirim</Text>
              <TextInput
                style={[styles.input, { textAlign: "center", fontSize: 24, letterSpacing: 8, fontFamily: "monospace" }]}
                placeholder="000000"
                value={otp}
                onChangeText={(t) => setOtp(t.replace(/\D/g, "").slice(0, 6))}
                keyboardType="numeric"
                maxLength={6}
              />
              <TouchableOpacity style={[styles.loginButton, loading && { opacity: 0.6 }]} onPress={handleVerifyOtp} disabled={loading}>
                {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.loginButtonText}>Verifikasi</Text>}
              </TouchableOpacity>
            </>
          )}

          {step === "setPin" && (
            <>
              <Text style={styles.loginCardTitle}>Buat PIN Baru</Text>
              <Text style={styles.loginCardDesc}>PIN 6 digit untuk login</Text>
              <Text style={styles.label}>PIN Baru</Text>
              <TextInput
                style={[styles.input, { textAlign: "center", fontSize: 20, letterSpacing: 6, fontFamily: "monospace" }]}
                placeholder="••••••"
                value={newPin}
                onChangeText={(t) => setNewPin(t.replace(/\D/g, "").slice(0, 6))}
                keyboardType="numeric"
                secureTextEntry
                maxLength={6}
              />
              <Text style={styles.label}>Konfirmasi PIN</Text>
              <TextInput
                style={[styles.input, { textAlign: "center", fontSize: 20, letterSpacing: 6, fontFamily: "monospace" }]}
                placeholder="••••••"
                value={confirmPin}
                onChangeText={(t) => setConfirmPin(t.replace(/\D/g, "").slice(0, 6))}
                keyboardType="numeric"
                secureTextEntry
                maxLength={6}
              />
              <TouchableOpacity style={[styles.loginButton, loading && { opacity: 0.6 }]} onPress={handleSetPin} disabled={loading}>
                {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.loginButtonText}>Simpan PIN</Text>}
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity onPress={onBack} style={[styles.forgotPinBtn, { marginTop: 16 }]}>
            <Text style={styles.forgotPinText}>← Kembali ke Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

// --- Dashboard Screen (List Anak) ---
function DashboardScreen({
  wali, santriList, onSelectSantri, onLogout,
}: {
  wali: WaliData, santriList: SantriData[],
  onSelectSantri: (santri: SantriData) => void, onLogout: () => void,
}) {
  const renderSantri = ({ item }: { item: SantriData }) => (
    <TouchableOpacity style={styles.santriCard} onPress={() => onSelectSantri(item)}>
      <View style={styles.santriAvatar}>
        {item.photoUrl ? (
          <Image source={{ uri: item.photoUrl }} style={styles.santriPhoto} />
        ) : (
          <Text style={styles.santriAvatarText}>{item.name[0]}</Text>
        )}
      </View>
      <View style={styles.santriInfo}>
        <Text style={styles.santriName}>{item.name}</Text>
        <Text style={styles.santriNis}>NIS: {item.nis}</Text>
        <View style={styles.santriBadges}>
          <View style={styles.badge}><Text style={styles.badgeText}>{item.kelas?.name || "-"}</Text></View>
          {item.isPrimary && <View style={[styles.badge, { backgroundColor: Colors.primaryLight }]}><Text style={[styles.badgeText, { color: Colors.primaryDark }]}>{item.relationship}</Text></View>}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={24} color={Colors.textMuted} />
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Assalamu'alaikum,</Text>
          <Text style={styles.headerName}>{wali.name} 👋</Text>
        </View>
        <TouchableOpacity onPress={onLogout}>
          <Ionicons name="log-out-outline" size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={santriList}
        keyExtractor={(item) => item.id}
        renderItem={renderSantri}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={() => (
          <Text style={styles.sectionTitle}>Anak Saya ({santriList.length})</Text>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Ionicons name="people" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>Belum ada anak terhubung</Text>
            <Text style={styles.emptySubtext}>Hubungi madrasah untuk menghubungkan akun</Text>
          </View>
        )}
      />
    </SafeAreaView>
  )
}

// --- Santri Detail Screen ---
function SantriDetailScreen({ santri, onBack }: { santri: SantriData, onBack: () => void }) {
  const [detail, setDetail] = useState<SantriDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("profile")

  const loadDetail = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.get(`/api/wali/santri/${santri.id}`)
      setDetail(res.data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [santri.id])

  useEffect(() => { loadDetail() }, [loadDetail])

  const tabs = [
    { id: "profile", label: "Profil", icon: "person" },
    { id: "jadwal", label: "Jadwal", icon: "calendar" },
    { id: "absensi", label: "Absensi", icon: "checkmark-done" },
    { id: "nilai", label: "Nilai", icon: "school" },
    { id: "tugas", label: "Tugas", icon: "create" },
    { id: "tagihan", label: "Tagihan", icon: "wallet" },
    { id: "rapor", label: "Rapor", icon: "document-text" },
  ]

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.detailHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.detailHeaderTitle}>{santri.name}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Santri Info Card */}
      <View style={styles.detailCard}>
        <View style={styles.detailAvatar}>
          <Text style={styles.detailAvatarText}>{santri.name[0]}</Text>
        </View>
        <View style={styles.detailInfo}>
          <Text style={styles.detailName}>{santri.name}</Text>
          <Text style={styles.detailNis}>NIS: {santri.nis}</Text>
          <Text style={styles.detailKelas}>{santri.kelas?.name || "Tanpa Kelas"}</Text>
          {detail?.activePeriod && (
            <Text style={styles.detailPeriod}>{detail.activePeriod.tahunAjaran} — Semester {detail.activePeriod.semester}</Text>
          )}
        </View>
      </View>

      {/* Quick Stats */}
      {detail && (
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Hadir</Text>
            <Text style={[styles.statValue, { color: Colors.success }]}>{detail.absensiSummary?.hadir || 0}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Sakit</Text>
            <Text style={[styles.statValue, { color: Colors.warning }]}>{detail.absensiSummary?.sakit || 0}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Izin</Text>
            <Text style={[styles.statValue, { color: "#3b82f6" }]}>{detail.absensiSummary?.izin || 0}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Alfa</Text>
            <Text style={[styles.statValue, { color: Colors.danger }]}>{detail.absensiSummary?.alfa || 0}</Text>
          </View>
        </View>
      )}

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Ionicons name={tab.icon as any} size={18} color={activeTab === tab.id ? Colors.primary : Colors.textMuted} />
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tab Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadDetail} style={styles.retryButton}>
            <Text style={styles.retryText}>Coba lagi</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.tabContent}>
          {activeTab === "profile" && detail && (
            <View style={styles.contentCard}>
              <Text style={styles.contentTitle}>Informasi Pribadi</Text>
              <InfoRow label="Tempat Lahir" value={detail.santri?.birthPlace || "-"} />
              <InfoRow label="Tanggal Lahir" value={detail.santri?.birthDate ? formatDate(detail.santri.birthDate) : "-"} />
              <InfoRow label="Alamat" value={detail.santri?.address || "-"} />
              {detail.santri?.wali?.map((w: any, i: number) => (
                <InfoRow key={i} label={`Wali ${i + 1}`} value={`${w.name} (${w.relationship})${w.isPrimary ? " ⭐" : ""}`} />
              ))}
            </View>
          )}

          {activeTab === "absensi" && detail && (
            <View style={styles.contentCard}>
              <Text style={styles.contentTitle}>Riwayat Absensi (30 hari)</Text>
              {detail.absensi?.length === 0 ? (
                <Text style={styles.emptyTextSmall}>Belum ada absensi</Text>
              ) : (
                detail.absensi?.map((a: any, i: number) => (
                  <View key={i} style={styles.listRow}>
                    <Text style={styles.listRowText}>{formatDate(a.date)}</Text>
                    <View style={[styles.statusBadge, {
                      backgroundColor: a.status === "HADIR" ? Colors.successLight :
                        a.status === "SAKIT" ? Colors.warningLight :
                        a.status === "IZIN" ? "#dbeafe" : Colors.dangerLight
                    }]}>
                      <Text style={[styles.statusBadgeText, {
                        color: a.status === "HADIR" ? Colors.success :
                          a.status === "SAKIT" ? Colors.warning :
                          a.status === "IZIN" ? "#3b82f6" : Colors.danger
                      }]}>
                        {STATUS_STYLES[a.status]?.label || a.status}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {activeTab === "nilai" && detail && (
            <View style={styles.contentCard}>
              <Text style={styles.contentTitle}>Daftar Nilai</Text>
              {detail.nilai?.length === 0 ? (
                <Text style={styles.emptyTextSmall}>Belum ada nilai</Text>
              ) : (
                detail.nilai?.map((n: any, i: number) => (
                  <View key={i} style={styles.nilaiRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.nilaiMapel}>{n.mapel?.name}</Text>
                      <Text style={styles.nilaiDate}>{formatDate(n.assessmentDate)}</Text>
                    </View>
                    <View style={styles.nilaiBadge}>
                      <Text style={styles.nilaiType}>{n.type}</Text>
                    </View>
                    <Text style={[styles.nilaiScore, { color: n.score >= 70 ? Colors.success : Colors.danger }]}>
                      {n.score}
                    </Text>
                  </View>
                ))
              )}
            </View>
          )}

          {activeTab === "tugas" && (
            <TugasListSection santriId={santri.id} />
          )}

          {activeTab === "tagihan" && detail && (
            <View style={styles.contentCard}>
              {detail.tagihanSummary && (
                <View style={styles.tagihanSummary}>
                  <View style={styles.tagihanSummaryItem}>
                    <Text style={styles.tagihanSummaryLabel}>Lunas</Text>
                    <Text style={[styles.tagihanSummaryValue, { color: Colors.success }]}>{detail.tagihanSummary.lunas}</Text>
                  </View>
                  <View style={styles.tagihanSummaryItem}>
                    <Text style={styles.tagihanSummaryLabel}>Cicil</Text>
                    <Text style={[styles.tagihanSummaryValue, { color: Colors.warning }]}>{detail.tagihanSummary.cicil}</Text>
                  </View>
                  <View style={styles.tagihanSummaryItem}>
                    <Text style={styles.tagihanSummaryLabel}>Belum</Text>
                    <Text style={[styles.tagihanSummaryValue, { color: Colors.danger }]}>{detail.tagihanSummary.belumBayar}</Text>
                  </View>
                </View>
              )}
              <Text style={styles.contentTitle}>Daftar Tagihan</Text>
              {detail.tagihan?.length === 0 ? (
                <Text style={styles.emptyTextSmall}>Tidak ada tagihan</Text>
              ) : (
                detail.tagihan?.map((t: any, i: number) => (
                  <View key={i} style={styles.tagihanRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tagihanName}>{t.jenisTagihan?.name}</Text>
                      <Text style={styles.tagihanDesc}>{t.description || formatDate(t.dueDate || t.createdAt)}</Text>
                    </View>
                    <View>
                      <Text style={styles.tagihanAmount}>{formatRupiah(t.amount)}</Text>
                      <View style={[styles.statusBadge, {
                        backgroundColor: t.status === "LUNAS" ? Colors.successLight :
                          t.status === "CICIL" ? Colors.warningLight : Colors.dangerLight
                      }]}>
                        <Text style={[styles.statusBadgeText, {
                          color: t.status === "LUNAS" ? Colors.success :
                            t.status === "CICIL" ? Colors.warning : Colors.danger
                        }]}>
                          {STATUS_STYLES[t.status]?.label || t.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {activeTab === "jadwal" && detail && (
            <View style={styles.contentCard}>
              <Text style={styles.contentTitle}>Jadwal Pelajaran</Text>
              {detail.jadwal?.length === 0 ? (
                <Text style={styles.emptyTextSmall}>Belum ada jadwal</Text>
              ) : (
                detail.jadwal?.map((j: any, i: number) => (
                  <View key={i} style={styles.listRow}>
                    <View style={{ width: 50 }}>
                      <Text style={[styles.listRowText, { fontWeight: "bold", color: Colors.primary }]}>
                        {DAYS.find(d => d.value === j.dayOfWeek)?.short || "?"}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.nilaiMapel, { fontSize: 13 }]}>{j.mapel?.name}</Text>
                      <Text style={styles.nilaiDate}>{j.startTime} - {j.endTime}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: Colors.primaryLight }]}>
                      <Text style={[styles.statusBadgeText, { color: Colors.primaryDark }]}>{j.guru?.name?.split(" ").slice(0, 2).join(" ") || "-"}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {activeTab === "rapor" && detail && (
            <View style={styles.contentCard}>
              <Text style={styles.contentTitle}>Rapor Semester</Text>
              {detail.rapor ? (
                <View>
                  <View style={styles.tagihanSummary}>
                    <View style={styles.tagihanSummaryItem}>
                      <Text style={styles.tagihanSummaryLabel}>Hadir</Text>
                      <Text style={[styles.tagihanSummaryValue, { color: Colors.success }]}>{detail.rapor.absensiHadir}</Text>
                    </View>
                    <View style={styles.tagihanSummaryItem}>
                      <Text style={styles.tagihanSummaryLabel}>Sakit</Text>
                      <Text style={[styles.tagihanSummaryValue, { color: Colors.warning }]}>{detail.rapor.absensiSakit}</Text>
                    </View>
                    <View style={styles.tagihanSummaryItem}>
                      <Text style={styles.tagihanSummaryLabel}>Izin</Text>
                      <Text style={[styles.tagihanSummaryValue, { color: "#3b82f6" }]}>{detail.rapor.absensiIzin}</Text>
                    </View>
                    <View style={styles.tagihanSummaryItem}>
                      <Text style={styles.tagihanSummaryLabel}>Alfa</Text>
                      <Text style={[styles.tagihanSummaryValue, { color: Colors.danger }]}>{detail.rapor.absensiAlfa}</Text>
                    </View>
                  </View>

                  {/* Nilai rekap per mapel */}
                  <Text style={[styles.contentTitle, { marginTop: 16 }]}>Rekap Nilai per Mapel</Text>
                  {detail.nilai?.length === 0 ? (
                    <Text style={styles.emptyTextSmall}>Belum ada nilai</Text>
                  ) : (
                    (() => {
                      const byMapel: Record<string, number[]> = {}
                      detail.nilai?.forEach((n: any) => {
                        const key = n.mapel?.name || "Unknown"
                        if (!byMapel[key]) byMapel[key] = []
                        byMapel[key].push(n.score)
                      })
                      return Object.entries(byMapel).map(([mapel, scores], i) => {
                        const avg = scores.reduce((a, b) => a + b, 0) / scores.length
                        return (
                          <View key={i} style={styles.listRow}>
                            <Text style={[styles.listRowText, { flex: 1 }]}>{mapel}</Text>
                            <Text style={[styles.nilaiScore, { color: avg >= 70 ? Colors.success : Colors.danger, minWidth: 50 }]}>
                              {avg.toFixed(1)}
                            </Text>
                          </View>
                        )
                      })
                    })()
                  )}

                  {detail.rapor.notes && (
                    <View style={{ marginTop: 16, padding: 12, backgroundColor: Colors.primaryLight, borderRadius: 8 }}>
                      <Text style={{ fontSize: 12, fontWeight: "600", color: Colors.primaryDark }}>Catatan Wali Kelas:</Text>
                      <Text style={{ fontSize: 13, color: Colors.text, marginTop: 4 }}>{detail.rapor.notes}</Text>
                    </View>
                  )}
                </View>
              ) : (
                <Text style={styles.emptyTextSmall}>Belum ada rapor untuk semester ini</Text>
              )}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  )
}

// ============================================================================
// V2 — Tugas & Pengumpulan (mobile-wali)
// ============================================================================
function TugasListSection({ santriId }: { santriId: string }) {
  const [tugasList, setTugasList] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitModal, setSubmitModal] = useState<any | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.get(`/api/wali/tugas`, { santriId })
      setTugasList(res.data)
      setStats(res.stats)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [santriId])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <View style={styles.contentCard}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.contentCard}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={load} style={styles.retryButton}>
          <Text style={styles.retryText}>Coba lagi</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.contentCard}>
      <Text style={styles.contentTitle}>Tugas & Pengumpulan</Text>

      {stats && (
        <View style={[styles.tagihanSummary, { marginBottom: 12 }]}>
          <View style={styles.tagihanSummaryItem}>
            <Text style={styles.tagihanSummaryLabel}>Dikumpul</Text>
            <Text style={[styles.tagihanSummaryValue, { color: Colors.primary }]}>{stats.submitted}</Text>
          </View>
          <View style={styles.tagihanSummaryItem}>
            <Text style={styles.tagihanSummaryLabel}>Dinilai</Text>
            <Text style={[styles.tagihanSummaryValue, { color: Colors.success }]}>{stats.graded}</Text>
          </View>
          <View style={styles.tagihanSummaryItem}>
            <Text style={styles.tagihanSummaryLabel}>Belum</Text>
            <Text style={[styles.tagihanSummaryValue, { color: Colors.warning }]}>{stats.notSubmitted}</Text>
          </View>
          <View style={styles.tagihanSummaryItem}>
            <Text style={styles.tagihanSummaryLabel}>Lewat</Text>
            <Text style={[styles.tagihanSummaryValue, { color: Colors.danger }]}>{stats.overdue}</Text>
          </View>
        </View>
      )}

      {tugasList.length === 0 ? (
        <Text style={styles.emptyTextSmall}>Belum ada tugas untuk santri ini</Text>
      ) : (
        tugasList.map((t: any, i: number) => {
          const sub = t.submission
          const isOverdue = t.isOverdue
          const isGraded = sub?.status === "GRADED"
          const isLate = sub?.status === "LATE"
          const canSubmit = !isGraded

          return (
            <View key={i} style={[styles.tagihanRow, isOverdue && !sub && { borderColor: Colors.danger, backgroundColor: Colors.dangerLight }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.tagihanName}>{t.title}</Text>
                <Text style={styles.tagihanDesc}>
                  {t.mapel?.name} • Tenggat: {formatDate(t.dueDate, true)}
                </Text>
                {sub?.feedback && (
                  <Text style={[styles.tagihanDesc, { fontStyle: "italic", marginTop: 4 }]}>
                    Feedback: {sub.feedback}
                  </Text>
                )}
              </View>
              <View>
                {!sub && (
                  <View style={[styles.statusBadge, {
                    backgroundColor: isOverdue ? Colors.dangerLight : Colors.warningLight,
                  }]}>
                    <Text style={[styles.statusBadgeText, {
                      color: isOverdue ? Colors.danger : Colors.warning,
                    }]}>
                      {isOverdue ? "Lewat" : "Belum"}
                    </Text>
                  </View>
                )}
                {sub && (
                  <View style={[styles.statusBadge, {
                    backgroundColor: isGraded ? Colors.successLight : isLate ? Colors.warningLight : Colors.primaryLight,
                  }]}>
                    <Text style={[styles.statusBadgeText, {
                      color: isGraded ? Colors.success : isLate ? Colors.warning : Colors.primaryDark,
                    }]}>
                      {isGraded ? `Nilai: ${sub.score}` : isLate ? "Terlambat" : "Dikumpul"}
                    </Text>
                  </View>
                )}
                {canSubmit && (
                  <TouchableOpacity
                    onPress={() => setSubmitModal(t)}
                    style={[styles.submitButton, { marginTop: 6 }]}
                  >
                    <Text style={styles.submitButtonText}>
                      {sub ? "Kumpul Ulang" : "Kumpulkan"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )
        })
      )}

      {submitModal && (
        <TugasSubmitModal
          tugas={submitModal}
          santriId={santriId}
          onClose={() => setSubmitModal(null)}
          onSuccess={() => { setSubmitModal(null); load() }}
        />
      )}
    </View>
  )
}

function TugasSubmitModal({
  tugas, santriId, onClose, onSuccess,
}: {
  tugas: any
  santriId: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [textAnswer, setTextAnswer] = useState("")
  const [fileUrl, setFileUrl] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!textAnswer.trim() && !fileUrl.trim()) {
      Alert.alert("Validasi", "Isi jawaban teks atau tempel URL file jawaban")
      return
    }
    setSubmitting(true)
    try {
      const res = await api.post(`/api/wali/tugas/${tugas.id}/submit`, {
        santriId,
        textAnswer: textAnswer.trim() || null,
        fileUrl: fileUrl.trim() || null,
      })
      Alert.alert("Berhasil", res.message || "Tugas berhasil dikumpulkan", [
        { text: "OK", onPress: onSuccess },
      ])
    } catch (e: any) {
      Alert.alert("Gagal", e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal visible={true} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Kumpulkan Tugas</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 400 }}>
            <Text style={styles.modalTugasTitle}>{tugas.title}</Text>
            <Text style={styles.modalTugasMeta}>
              {tugas.mapel?.name} • Tenggat: {formatDate(tugas.dueDate, true)}
            </Text>
            {tugas.description ? (
              <Text style={styles.modalTugasDesc}>{tugas.description}</Text>
            ) : null}

            <Text style={[styles.infoLabel, { marginTop: 12 }]}>Jawaban Teks (opsional)</Text>
            <TextInput
              style={[styles.textInput, { minHeight: 80, textAlignVertical: "top" }]}
              value={textAnswer}
              onChangeText={setTextAnswer}
              placeholder="Tulis jawaban di sini..."
              multiline
              numberOfLines={4}
            />

            <Text style={[styles.infoLabel, { marginTop: 12 }]}>URL File Jawaban (opsional)</Text>
            <TextInput
              style={styles.textInput}
              value={fileUrl}
              onChangeText={setFileUrl}
              placeholder="https://drive.google.com/..."
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <Text style={styles.modalHint}>
              Tip: Upload file ke Google Drive atau layanan lain, lalu tempel link-nya di sini.
              File lokal akan didukung di versi mendatang.
            </Text>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.modalCancelButton} onPress={onClose} disabled={submitting}>
              <Text style={styles.modalCancelText}>Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalSubmitButton} onPress={handleSubmit} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={styles.modalSubmitText}>Kumpulkan</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

// ============================================================================
// APP ROOT
// ============================================================================
type RootStackParamList = {
  Login: undefined
  ForgotPin: undefined
  Dashboard: { wali: WaliData; santriList: SantriData[] }
  SantriDetail: { santri: SantriData }
}

const Stack = createNativeStackNavigator<RootStackParamList>()

export default function App() {
  const [isReady, setIsReady] = useState(false)
  const [initialRoute, setInitialRoute] = useState<"Login" | "Dashboard">("Login")
  const [savedWali, setSavedWali] = useState<WaliData | null>(null)
  const [savedSantri, setSavedSantri] = useState<SantriData[]>([])

  useEffect(() => {
    async function init() {
      const session = await loadWaliSession()
      if (session) {
        waliToken = session.token
        setSavedWali(session.wali)
        setSavedSantri(session.santriList)
        setInitialRoute("Dashboard")
      }
      setIsReady(true)
    }
    init()
  }, [])

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.primary }}>
        <ActivityIndicator size="large" color={Colors.white} />
      </View>
    )
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Login">
          {({ navigation }) => (
            <LoginScreen
              onLogin={(token, wali, santriList) => {
                waliToken = token
                setSavedWali(wali)
                setSavedSantri(santriList)
                setInitialRoute("Dashboard")
              }}
              onForgotPin={() => navigation.navigate("ForgotPin")}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="ForgotPin" options={{ headerShown: false }}>
          {({ navigation }) => (
            <ForgotPinScreen onBack={() => navigation.goBack()} />
          )}
        </Stack.Screen>
        <Stack.Screen name="Dashboard" options={{ headerShown: false }}>
          {({ navigation }) => (
            <DashboardScreen
              wali={savedWali!}
              santriList={savedSantri}
              onSelectSantri={(santri) => navigation.navigate("SantriDetail", { santri })}
              onLogout={async () => {
                waliToken = null
                await clearWaliSession()
                setSavedWali(null)
                setSavedSantri([])
                navigation.replace("Login")
              }}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="SantriDetail" options={{ headerShown: false }}>
          {({ route, navigation }) => (
            <SantriDetailScreen
              santri={(route.params as any).santri}
              onBack={() => navigation.goBack()}
            />
          )}
        </Stack.Screen>
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
  loginCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 24, elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  loginCardTitle: { fontSize: 20, fontWeight: "bold", color: Colors.text },
  loginCardDesc: { fontSize: 14, color: Colors.textMuted, marginTop: 4, marginBottom: 20 },
  label: { fontSize: 12, fontWeight: "600", color: Colors.text, marginTop: 12, marginBottom: 4 },
  inputContainer: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 12 },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 12, fontSize: 16, color: Colors.text },
  eyeIcon: { padding: 8 },
  loginButton: { backgroundColor: Colors.primary, borderRadius: 8, paddingVertical: 14, alignItems: "center", marginTop: 24 },
  loginButtonText: { color: Colors.white, fontSize: 16, fontWeight: "600" },
  demoText: { fontSize: 12, color: Colors.textMuted, textAlign: "center", marginTop: 16 },
  forgotPinBtn: { alignItems: "center", marginTop: 12 },
  forgotPinText: { fontSize: 13, color: Colors.primary, fontWeight: "500" },
  screen: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 48 },
  headerTitle: { fontSize: 14, color: Colors.white, opacity: 0.9 },
  headerName: { fontSize: 18, fontWeight: "bold", color: Colors.white },
  listContainer: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: Colors.text, marginBottom: 12 },
  santriCard: { backgroundColor: Colors.white, borderRadius: 12, padding: 16, marginBottom: 12, flexDirection: "row", alignItems: "center", elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
  santriAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primaryLight, justifyContent: "center", alignItems: "center", marginRight: 12 },
  santriAvatarText: { fontSize: 24, fontWeight: "bold", color: Colors.primary },
  santriPhoto: { width: 56, height: 56, borderRadius: 28 },
  santriInfo: { flex: 1 },
  santriName: { fontSize: 16, fontWeight: "600", color: Colors.text },
  santriNis: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  santriBadges: { flexDirection: "row", gap: 6, marginTop: 4 },
  badge: { backgroundColor: Colors.border, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 10, color: Colors.text },
  emptyState: { alignItems: "center", paddingVertical: 48 },
  emptyText: { fontSize: 16, fontWeight: "600", color: Colors.text, marginTop: 12 },
  emptySubtext: { fontSize: 14, color: Colors.textMuted, marginTop: 4, textAlign: "center" },
  detailHeader: { backgroundColor: Colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 12, paddingTop: 48 },
  backButton: { padding: 4 },
  detailHeaderTitle: { fontSize: 16, fontWeight: "600", color: Colors.white },
  detailCard: { backgroundColor: Colors.white, margin: 16, borderRadius: 12, padding: 16, flexDirection: "row", alignItems: "center", elevation: 2 },
  detailAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.primaryLight, justifyContent: "center", alignItems: "center", marginRight: 16 },
  detailAvatarText: { fontSize: 28, fontWeight: "bold", color: Colors.primary },
  detailInfo: { flex: 1 },
  detailName: { fontSize: 18, fontWeight: "bold", color: Colors.text },
  detailNis: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  detailKelas: { fontSize: 14, color: Colors.primary, marginTop: 4 },
  detailPeriod: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  statsRow: { flexDirection: "row", paddingHorizontal: 16, gap: 8 },
  statCard: { flex: 1, backgroundColor: Colors.white, borderRadius: 8, padding: 12, alignItems: "center", elevation: 1 },
  statLabel: { fontSize: 10, color: Colors.textMuted },
  statValue: { fontSize: 20, fontWeight: "bold", marginTop: 4 },
  tabBar: { flexDirection: "row", backgroundColor: Colors.white, marginTop: 12, marginHorizontal: 16, borderRadius: 8, padding: 4, elevation: 1 },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 8, borderRadius: 6, gap: 4 },
  tabActive: { backgroundColor: Colors.primaryLight },
  tabText: { fontSize: 12, color: Colors.textMuted },
  tabTextActive: { color: Colors.primary, fontWeight: "600" },
  tabContent: { flex: 1, padding: 16 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  errorText: { fontSize: 14, color: Colors.danger, textAlign: "center", marginBottom: 12 },
  retryButton: { backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 },
  retryText: { color: Colors.white, fontSize: 14 },
  contentCard: { backgroundColor: Colors.white, borderRadius: 12, padding: 16, elevation: 1 },
  contentTitle: { fontSize: 16, fontWeight: "600", color: Colors.text, marginBottom: 12 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  infoLabel: { fontSize: 14, color: Colors.textMuted },
  infoValue: { fontSize: 14, color: Colors.text, fontWeight: "500", textAlign: "right", flex: 1, marginLeft: 16 },
  listRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  listRowText: { fontSize: 14, color: Colors.text },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  statusBadgeText: { fontSize: 10, fontWeight: "600" },
  emptyTextSmall: { fontSize: 14, color: Colors.textMuted, textAlign: "center", paddingVertical: 16 },
  nilaiRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  nilaiMapel: { fontSize: 14, fontWeight: "500", color: Colors.text },
  nilaiDate: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  nilaiBadge: { backgroundColor: Colors.border, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginHorizontal: 8 },
  nilaiType: { fontSize: 10, color: Colors.text },
  nilaiScore: { fontSize: 18, fontWeight: "bold", minWidth: 40, textAlign: "right" },
  tagihanSummary: { flexDirection: "row", justifyContent: "space-around", marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tagihanSummaryItem: { alignItems: "center" },
  tagihanSummaryLabel: { fontSize: 12, color: Colors.textMuted },
  tagihanSummaryValue: { fontSize: 24, fontWeight: "bold", marginTop: 4 },
  tagihanRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tagihanName: { fontSize: 14, fontWeight: "500", color: Colors.text },
  tagihanDesc: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  tagihanAmount: { fontSize: 14, fontWeight: "600", color: Colors.text, textAlign: "right" },
  // V2 — Tugas submit modal
  submitButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: "flex-end",
  },
  submitButtonText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    width: "100%",
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
  },
  modalTugasTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 4,
  },
  modalTugasMeta: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 8,
  },
  modalTugasDesc: {
    fontSize: 13,
    color: Colors.text,
    backgroundColor: Colors.background,
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
  },
  modalHint: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 6,
    fontStyle: "italic",
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: Colors.text,
    backgroundColor: Colors.background,
    marginTop: 4,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 16,
  },
  modalCancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: Colors.border,
  },
  modalCancelText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "500",
  },
  modalSubmitButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  modalSubmitText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "600",
  },
})
