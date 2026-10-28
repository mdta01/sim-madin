"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LoadingState, ErrorState, EmptyState } from "@/components/admin/shared/states"
import { StatusBadge } from "@/components/admin/shared/status-badge"
import { formatRupiah, formatDate, GENDER_LABELS, DAYS } from "@/lib/constants"
import { LogOut, ArrowLeft, Phone, User, GraduationCap, Calendar, ClipboardCheck, BookOpen, Wallet, FileText, Megaphone, Clock } from "lucide-react"

interface WaliDashboardProps {
  token: string
  wali: { id: string; name: string; phone: string; email?: string }
  initialSantriList: any[]
  onLogout: () => void
}

export function WaliDashboard({ token, wali, initialSantriList, onLogout }: WaliDashboardProps) {
  const [santriList, setSantriList] = useState(initialSantriList)
  const [selectedSantriId, setSelectedSantriId] = useState<string | null>(null)
  const [santriDetail, setSantriDetail] = useState<any>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [errorDetail, setErrorDetail] = useState<string | null>(null)

  const loadSantriDetail = useCallback(async (id: string) => {
    setLoadingDetail(true)
    setErrorDetail(null)
    try {
      const res = await fetch(`/api/wali/santri/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorDetail(data.error || data.message || "Gagal memuat data")
        return
      }
      setSantriDetail(data.data)
    } catch (e: any) {
      setErrorDetail(e.message)
    } finally {
      setLoadingDetail(false)
    }
  }, [token])

  useEffect(() => {
    if (selectedSantriId) {
      loadSantriDetail(selectedSantriId)
    } else {
      setSantriDetail(null)
    }
  }, [selectedSantriId, loadSantriDetail])

  // Detail view
  if (selectedSantriId && santriDetail) {
    return (
      <WaliSantriDetail
        santri={santriDetail.santri}
        activePeriod={santriDetail.activePeriod}
        absensi={santriDetail.absensi}
        absensiSummary={santriDetail.absensiSummary}
        nilai={santriDetail.nilai}
        tagihan={santriDetail.tagihan}
        tagihanSummary={santriDetail.tagihanSummary}
        payments={santriDetail.payments}
        rapor={santriDetail.rapor}
        jadwal={santriDetail.jadwal}
        announcements={santriDetail.announcements}
        waliName={wali.name}
        onBack={() => setSelectedSantriId(null)}
        onLogout={onLogout}
        loading={loadingDetail}
        error={errorDetail}
      />
    )
  }

  if (loadingDetail) return <LoadingState className="py-20" />
  if (errorDetail) return <ErrorState message={errorDetail} onRetry={() => loadSantriDetail(selectedSantriId!)} />

  // List view (default)
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-background to-amber-50 dark:from-emerald-950/30 dark:via-background dark:to-amber-950/30">
      <header className="bg-white dark:bg-card shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-emerald-600 flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold leading-tight">Dashboard Wali Santri</p>
              <p className="text-[11px] text-muted-foreground">SIM MADIN</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium">{wali.name}</p>
              <p className="text-[10px] text-muted-foreground">{wali.phone}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onLogout}>
              <LogOut className="h-4 w-4" /> Keluar
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">Assalamu'alaikum, {wali.name} 👋</h1>
          <p className="text-sm text-muted-foreground">
            Pilih anak untuk melihat perkembangannya
          </p>
        </div>

        <div className="mb-6">
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <User className="h-4 w-4" /> Anak Saya ({santriList.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {santriList.map((s) => (
              <Card
                key={s.id}
                className="cursor-pointer hover:shadow-md transition-shadow border-emerald-200 dark:border-emerald-900"
                onClick={() => setSelectedSantriId(s.id)}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <Avatar className="h-14 w-14">
                    {s.photoUrl ? (
                      <img src={s.photoUrl} alt={s.name} className="h-full w-full object-cover" />
                    ) : (
                      <AvatarFallback className="bg-emerald-100 text-emerald-700 text-lg">
                        {s.name[0]}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{s.name}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">NIS: {s.nis}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Badge variant="outline" className="text-[10px]">{s.kelas?.name || "Tanpa Kelas"}</Badge>
                      {s.isPrimary && <Badge variant="secondary" className="text-[10px]">{s.relationship}</Badge>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {santriList.length === 0 && (
            <Card>
              <CardContent className="p-6">
                <EmptyState
                  icon={<User className="h-5 w-5" />}
                  title="Belum ada anak terhubung"
                  description="Hubungi madrasah untuk menghubungkan akun Anda dengan data santri"
                />
              </CardContent>
            </Card>
          )}
        </div>

        <div className="mt-8 pt-6 border-t text-center">
          <p className="text-xs text-muted-foreground">
            © 2025 SIM MADIN • Dashboard Wali Santri • MVP V1
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Jika ada masalah dengan akun, hubungi madrasah.
          </p>
        </div>
      </main>
    </div>
  )
}

function WaliSantriDetail({
  santri, activePeriod, absensi, absensiSummary, nilai, tagihan, tagihanSummary,
  payments, rapor, jadwal, announcements, waliName, onBack, onLogout, loading, error,
}: any) {
  const [tab, setTab] = useState("profile")

  if (loading) return <LoadingState className="py-20" />
  if (error) return <ErrorState message={error} onRetry={onBack} />

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-background to-amber-50 dark:from-emerald-950/30 dark:via-background dark:to-amber-950/30">
      <header className="bg-white dark:bg-card shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-sm hover:opacity-80">
            <ArrowLeft className="h-4 w-4" /> Kembali
          </button>
          <p className="text-sm font-medium truncate">{santri.name}</p>
          <Button variant="ghost" size="sm" onClick={onLogout}>
            <LogOut className="h-4 w-4" /> Keluar
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 sm:p-6">
        {/* Santri Card */}
        <Card className="mb-4 border-emerald-200 dark:border-emerald-900">
          <CardContent className="p-4 flex items-center gap-4">
            <Avatar className="h-16 w-16">
              {santri.photoUrl ? (
                <img src={santri.photoUrl} alt={santri.name} className="h-full w-full object-cover" />
              ) : (
                <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xl">{santri.name[0]}</AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1">
              <h1 className="text-xl font-bold">{santri.name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs font-mono">NIS: {santri.nis}</Badge>
                <Badge variant="secondary" className="text-xs">{santri.kelas?.name || "Tanpa Kelas"}</Badge>
                <Badge variant="outline" className="text-xs">{GENDER_LABELS[santri.gender] || santri.gender}</Badge>
              </div>
              {activePeriod && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  {activePeriod.tahunAjaran} — Semester {activePeriod.semester}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <Card><CardContent className="p-3 text-center">
            <ClipboardCheck className="h-5 w-5 mx-auto mb-1 text-emerald-600" />
            <p className="text-[10px] text-muted-foreground">Hadir (30 hari)</p>
            <p className="font-bold text-emerald-600">{absensiSummary.hadir}</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground">Sakit</p>
            <p className="font-bold text-amber-600">{absensiSummary.sakit}</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground">Izin</p>
            <p className="font-bold text-blue-600">{absensiSummary.izin}</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground">Alfa</p>
            <p className="font-bold text-red-600">{absensiSummary.alfa}</p>
          </CardContent></Card>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 mb-4 h-auto">
            <TabsTrigger value="profile" className="text-xs"><User className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Profil</span></TabsTrigger>
            <TabsTrigger value="jadwal" className="text-xs"><Calendar className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Jadwal</span></TabsTrigger>
            <TabsTrigger value="absensi" className="text-xs"><ClipboardCheck className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Absensi</span></TabsTrigger>
            <TabsTrigger value="nilai" className="text-xs"><BookOpen className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Nilai</span></TabsTrigger>
            <TabsTrigger value="tagihan" className="text-xs"><Wallet className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Tagihan</span></TabsTrigger>
            <TabsTrigger value="info" className="text-xs"><Megaphone className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Info</span></TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" /> Profil Santri</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div><p className="text-xs text-muted-foreground">Tempat Lahir</p><p>{santri.birthPlace || "-"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Tanggal Lahir</p><p>{santri.birthDate ? formatDate(santri.birthDate) : "-"}</p></div>
                  <div className="col-span-2"><p className="text-xs text-muted-foreground">Alamat</p><p>{santri.address || "-"}</p></div>
                </div>
                <div className="pt-3 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Wali yang terhubung:</p>
                  <div className="flex flex-wrap gap-2">
                    {santri.wali?.map((w: any, i: number) => (
                      <Badge key={i} variant={w.isPrimary ? "default" : "secondary"} className="text-xs">
                        {w.name} ({w.relationship}){w.isPrimary ? " ⭐" : ""}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="jadwal">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4" /> Jadwal Pelajaran</CardTitle></CardHeader>
              <CardContent>
                {jadwal.length === 0 ? <EmptyState title="Belum ada jadwal" /> : (
                  <div className="space-y-2">
                    {jadwal.map((j: any) => (
                      <div key={j.id} className="flex items-center gap-3 p-2 rounded border">
                        <div className="w-12 text-center">
                          <Badge variant="outline" className="text-[10px]">{DAYS.find(d => d.value === j.dayOfWeek)?.short}</Badge>
                        </div>
                        <div className="text-xs font-mono text-muted-foreground">{j.startTime}-{j.endTime}</div>
                        <div className="flex-1 text-sm">{j.mapel?.name}</div>
                        <div className="text-[11px] text-muted-foreground">{j.guru?.name?.split(" ").slice(0, 2).join(" ")}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="absensi">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><ClipboardCheck className="h-4 w-4" /> Riwayat Absensi (30 hari)</CardTitle></CardHeader>
              <CardContent>
                {absensi.length === 0 ? <EmptyState title="Belum ada absensi" /> : (
                  <div className="space-y-1 max-h-96 overflow-y-auto">
                    {absensi.map((a: any) => (
                      <div key={a.id} className="flex items-center justify-between p-2 rounded border text-sm">
                        <span>{formatDate(a.date)}</span>
                        <StatusBadge status={a.status} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="nilai">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4" /> Daftar Nilai</CardTitle></CardHeader>
              <CardContent>
                {nilai.length === 0 ? <EmptyState title="Belum ada nilai" /> : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Mata Pelajaran</TableHead>
                          <TableHead>Jenis</TableHead>
                          <TableHead className="text-center">Nilai</TableHead>
                          <TableHead>Tanggal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {nilai.map((n: any) => (
                          <TableRow key={n.id}>
                            <TableCell className="text-sm">{n.mapel?.name}</TableCell>
                            <TableCell><Badge variant="outline">{n.type}</Badge></TableCell>
                            <TableCell className="text-center font-mono font-bold">{n.score}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{formatDate(n.assessmentDate)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tagihan">
            <Card className="mb-3">
              <CardContent className="p-4 grid grid-cols-3 gap-2 text-center">
                <div><p className="text-xs text-muted-foreground">Lunas</p><p className="font-bold text-emerald-600">{tagihanSummary.lunas}</p></div>
                <div><p className="text-xs text-muted-foreground">Cicil</p><p className="font-bold text-amber-600">{tagihanSummary.cicil}</p></div>
                <div><p className="text-xs text-muted-foreground">Belum Bayar</p><p className="font-bold text-red-600">{tagihanSummary.belumBayar}</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Wallet className="h-4 w-4" /> Daftar Tagihan</CardTitle></CardHeader>
              <CardContent>
                {tagihan.length === 0 ? <EmptyState title="Tidak ada tagihan" /> : (
                  <div className="space-y-2">
                    {tagihan.map((t: any) => (
                      <div key={t.id} className="flex items-center justify-between p-3 rounded border">
                        <div>
                          <p className="text-sm font-medium">{t.jenisTagihan?.name}</p>
                          <p className="text-[11px] text-muted-foreground">{t.description || formatDate(t.dueDate || t.createdAt)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">{formatRupiah(t.amount)}</p>
                          <StatusBadge status={t.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            {payments.length > 0 && (
              <Card className="mt-3">
                <CardHeader><CardTitle className="text-base">Riwayat Pembayaran</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-1.5">
                    {payments.map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between p-2 rounded border text-sm">
                        <div>
                          <p className="font-medium text-xs">{p.invoiceNo}</p>
                          <p className="text-[11px] text-muted-foreground">{formatDate(p.paymentDate, true)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-emerald-600">{formatRupiah(p.amount)}</p>
                          <StatusBadge status={p.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="info">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Megaphone className="h-4 w-4" /> Pengumuman</CardTitle></CardHeader>
              <CardContent>
                {announcements.length === 0 ? <EmptyState title="Belum ada pengumuman" /> : (
                  <div className="space-y-2">
                    {announcements.map((a: any) => (
                      <div key={a.id} className="p-3 rounded border">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="font-medium text-sm flex-1">{a.title}</p>
                          <StatusBadge status={a.priority} />
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{a.content}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{formatDate(a.publishedAt, true)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-6 text-center">
          <button onClick={onBack} className="text-xs text-emerald-600 hover:underline">
            ← Kembali ke daftar anak
          </button>
        </div>
      </main>
    </div>
  )
}
