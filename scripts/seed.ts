/**
 * SEED SCRIPT - Madrasah Diniyah Terpadu MVP V1
 * ============================================================================
 * Menjalankan seed: `bun run db:seed`
 */

import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const db = new PrismaClient()

// Default password untuk semua user demo: "admin123"
const DEFAULT_PASSWORD = "admin123"
const DEFAULT_PASSWORD_HASH = bcrypt.hashSync(DEFAULT_PASSWORD, 10)

async function main() {
  console.log("🌱 Seeding database...")

  // 1. ROLES
  const roles = await Promise.all([
    db.role.upsert({ where: { code: "SUPER_ADMIN" }, update: {}, create: { code: "SUPER_ADMIN", name: "Super Admin", description: "Akses penuh mengelola seluruh sistem", sortOrder: 1, isSystem: true } }),
    db.role.upsert({ where: { code: "KEPALA" }, update: {}, create: { code: "KEPALA", name: "Kepala Madrasah", description: "Monitoring & pengambilan keputusan", sortOrder: 2, isSystem: true } }),
    db.role.upsert({ where: { code: "BENDAHARA" }, update: {}, create: { code: "BENDAHARA", name: "Bendahara", description: "Pengelolaan keuangan madrasah", sortOrder: 3, isSystem: true } }),
    db.role.upsert({ where: { code: "GURU" }, update: {}, create: { code: "GURU", name: "Guru", description: "Input absensi, nilai, dan catatan santri", sortOrder: 4, isSystem: true } }),
    db.role.upsert({ where: { code: "WALI" }, update: {}, create: { code: "WALI", name: "Wali Santri", description: "Memantau perkembangan & administrasi anak", sortOrder: 5, isSystem: true } }),
  ])

  // 2. PERMISSIONS (matrix per modul)
  const modules = ["santri","wali","guru","kelas","mapel","jadwal","absensi","nilai","rapor","tagihan","pembayaran","pengumuman","user","tahun_ajaran","pengaturan"]
  const actions = ["create","read","update","delete"]
  const permissions: { id: string; code: string; module: string }[] = []
  for (const mod of modules) {
    for (const action of actions) {
      const code = `${mod}:${action}`
      const p = await db.permission.upsert({ where: { code }, update: {}, create: { code, name: `${action} ${mod}`, module: mod, description: `Izin untuk ${action} pada modul ${mod}` } })
      permissions.push(p)
    }
  }

  // Role-Permission mapping
  const superAdminRole = roles[0]
  for (const p of permissions) {
    await db.rolePermission.upsert({ where: { roleId_permissionId: { roleId: superAdminRole.id, permissionId: p.id } }, update: {}, create: { roleId: superAdminRole.id, permissionId: p.id } })
  }
  const kepalaRole = roles[1]
  for (const p of permissions.filter(p => p.code.endsWith(":read"))) {
    await db.rolePermission.upsert({ where: { roleId_permissionId: { roleId: kepalaRole.id, permissionId: p.id } }, update: {}, create: { roleId: kepalaRole.id, permissionId: p.id } })
  }
  const bendaharaRole = roles[2]
  const bendaharaPerms = permissions.filter(p => p.module === "tagihan" || p.module === "pembayaran" || p.module === "santri" || p.module === "pengumuman")
  for (const p of bendaharaPerms) {
    await db.rolePermission.upsert({ where: { roleId_permissionId: { roleId: bendaharaRole.id, permissionId: p.id } }, update: {}, create: { roleId: bendaharaRole.id, permissionId: p.id } })
  }
  const guruRole = roles[3]
  const guruPerms = permissions.filter(p => {
    if (p.module === "absensi" || p.module === "nilai") return true
    if (p.code.endsWith(":read") && ["santri","kelas","mapel","jadwal","pengumuman","rapor","tahun_ajaran"].includes(p.module)) return true
    return false
  })
  for (const p of guruPerms) {
    await db.rolePermission.upsert({ where: { roleId_permissionId: { roleId: guruRole.id, permissionId: p.id } }, update: {}, create: { roleId: guruRole.id, permissionId: p.id } })
  }
  const waliRole = roles[4]
  const waliPerms = permissions.filter(p => p.code.endsWith(":read") && ["santri","tagihan","pembayaran","rapor","absensi","nilai","pengumuman","kelas","tahun_ajaran"].includes(p.module))
  for (const p of waliPerms) {
    await db.rolePermission.upsert({ where: { roleId_permissionId: { roleId: waliRole.id, permissionId: p.id } }, update: {}, create: { roleId: waliRole.id, permissionId: p.id } })
  }

  // 3. USER SUPER ADMIN DEFAULT + demo users per role
  const superAdminUser = await db.user.upsert({
    where: { email: "admin@madrasah.test" },
    update: { passwordHash: DEFAULT_PASSWORD_HASH },
    create: { email: "admin@madrasah.test", username: "admin", passwordHash: DEFAULT_PASSWORD_HASH, name: "Administrator Sistem", phone: "081234567890", isActive: true },
  })
  await db.userRole.upsert({ where: { userId_roleId: { userId: superAdminUser.id, roleId: superAdminRole.id } }, update: {}, create: { userId: superAdminUser.id, roleId: superAdminRole.id } })

  // Demo users untuk tiap role (untuk testing login sebagai role berbeda)
  const demoUsersData = [
    { email: "kepala@madrasah.test", username: "kepala", name: "Kepala Madrasah", roleCode: "KEPALA", phone: "081234511100" },
    { email: "bendahara@madrasah.test", username: "bendahara", name: "Bendahara Madrasah", roleCode: "BENDAHARA", phone: "081234511200" },
    { email: "guru@madrasah.test", username: "guru", name: "Ustadz Ahmad Fauzi", roleCode: "GURU", phone: "081234500001" },
    { email: "wali@madrasah.test", username: "wali", name: "Bapak H. Abdullah", roleCode: "WALI", phone: "081234511001" },
  ]
  for (const du of demoUsersData) {
    const u = await db.user.upsert({
      where: { email: du.email },
      update: { passwordHash: DEFAULT_PASSWORD_HASH, isActive: true },
      create: {
        email: du.email, username: du.username, passwordHash: DEFAULT_PASSWORD_HASH,
        name: du.name, phone: du.phone, isActive: true,
      },
    })
    const role = roles.find((r) => r.code === du.roleCode)!
    await db.userRole.upsert({
      where: { userId_roleId: { userId: u.id, roleId: role.id } },
      update: {},
      create: { userId: u.id, roleId: role.id },
    })
  }
  console.log(`   - Default password for all users: "${DEFAULT_PASSWORD}"`)

  // 4. TAHUN AJARAN & SEMESTER
  const ta = await db.tahunAjaran.upsert({ where: { code: "2025/2026" }, update: { isActive: true }, create: { code: "2025/2026", name: "Tahun Ajaran 2025/2026", startDate: new Date("2025-07-15"), endDate: new Date("2026-06-14"), isActive: true } })
  const semGanjil = await db.semester.upsert({ where: { code: "2025/2026-GANJIL" }, update: { isActive: true }, create: { tahunAjaranId: ta.id, code: "2025/2026-GANJIL", name: "Ganjil", type: "GANJIL", startDate: new Date("2025-07-15"), endDate: new Date("2025-12-31"), isActive: true } })
  await db.semester.upsert({ where: { code: "2025/2026-GENAP" }, update: {}, create: { tahunAjaranId: ta.id, code: "2025/2026-GENAP", name: "Genap", type: "GENAP", startDate: new Date("2026-01-01"), endDate: new Date("2026-06-14"), isActive: false } })

  // 5. JENIS TAGIHAN
  const jenisTagihanData = [
    { code: "SYAHRIYAH", name: "Syahriyah (SPP Bulanan)", defaultAmount: 50000, category: "RUTIN" },
    { code: "UANG_UJIAN", name: "Uang Ujian", defaultAmount: 25000, category: "INSIDENTAL" },
    { code: "KEGIATAN", name: "Kegiatan Pembelajaran", defaultAmount: 30000, category: "INSIDENTAL" },
    { code: "HAFLAH", name: "Haflah Akhir Tahun", defaultAmount: 75000, category: "INSIDENTAL" },
    { code: "SERAGAM", name: "Seragam", defaultAmount: 100000, category: "INSIDENTAL" },
  ]
  const jenisTagihan: { id: string }[] = []
  for (const jt of jenisTagihanData) {
    const r = await db.jenisTagihan.upsert({ where: { code: jt.code }, update: {}, create: jt })
    jenisTagihan.push(r)
  }

  // 6. MATA PELAJARAN
  const mapelData = [
    { code: "QURAN", name: "Al-Qur'an (Tajwid & Tilawah)", category: "AL_QURAN", kkm: 75, durationMnt: 90 },
    { code: "TAUHID", name: "Tauhid", category: "DINIYAH", kkm: 70, durationMnt: 60 },
    { code: "FIKIH", name: "Fiqih", category: "DINIYAH", kkm: 70, durationMnt: 60 },
    { code: "AKHLAK", name: "Akhlak", category: "DINIYAH", kkm: 75, durationMnt: 60 },
    { code: "SKI", name: "Sejarah Kebudayaan Islam", category: "DINIYAH", kkm: 70, durationMnt: 60 },
    { code: "BAHASA_ARAB", name: "Bahasa Arab", category: "BAHASA", kkm: 70, durationMnt: 60 },
  ]
  const mapelList: { id: string }[] = []
  for (const m of mapelData) {
    const r = await db.mataPelajaran.upsert({ where: { code: m.code }, update: {}, create: { ...m, sortOrder: mapelList.length + 1 } })
    mapelList.push(r)
  }

  // 7. GURU
  const guruData = [
    { name: "Ustadz Ahmad Fauzi, S.Pd.I", gender: "L", nip: "198501012010011001", specialization: "Tajwid & Tahfidz", phone: "081234500001" },
    { name: "Ustadzah Fatimah Azzahra, S.Pd.I", gender: "P", nip: "199003152011012002", specialization: "Fiqih & Akhlak", phone: "081234500002" },
    { name: "Ustadz Muhammad Ridwan, S.Pd", gender: "L", nip: "198811202012011003", specialization: "Tauhid & SKI", phone: "081234500003" },
    { name: "Ustadzah Siti Khadijah, S.Pd", gender: "P", nip: "199207052013012004", specialization: "Bahasa Arab", phone: "081234500004" },
    { name: "Ustadz Abdullah Hakim, S.Pd.I", gender: "L", nip: "198606182009011005", specialization: "Al-Qur'an", phone: "081234500005" },
  ]
  const guruList: { id: string }[] = []
  for (const g of guruData) {
    const r = await db.guru.create({ data: { ...g, joinDate: new Date("2020-07-15"), address: "Jl. Madrasah No. 1", status: "AKTIF" } })
    guruList.push(r)
  }

  // 8. KELAS (3 kelas sample, dengan wali kelas dari guru)
  const kelasData = [
    { code: "MDA-1A", name: "Kelas 1 Madrasah Awwaliyah A", level: "MDA-1", capacity: 25, sortOrder: 1, waliKelasId: guruList[0].id },
    { code: "MDA-2A", name: "Kelas 2 Madrasah Awwaliyah A", level: "MDA-2", capacity: 25, sortOrder: 2, waliKelasId: guruList[1].id },
    { code: "MDA-3A", name: "Kelas 3 Madrasah Awwaliyah A", level: "MDA-3", capacity: 25, sortOrder: 3, waliKelasId: guruList[2].id },
  ]
  const kelasList: { id: string }[] = []
  for (const k of kelasData) {
    const r = await db.kelas.create({ data: k })
    kelasList.push(r)
  }

  // 9. WALI SANTRI (dengan phone normalized & activationStatus bervariasi)
  // PIN demo untuk wali ACTIVE: 258041 (bukan blacklist, mudah diingat: "2580 41")
  const WALI_DEMO_PIN = "258041"
  const WALI_DEMO_PIN_HASH = bcrypt.hashSync(WALI_DEMO_PIN, 10)
  const waliData = [
    { name: "Bapak H. Abdullah", phone: "6281234511001", relationship: "AYAH", email: "abdullah.wali@test.com", occupation: "Pedagang", address: "Jl. Mawar No. 10" },
    { name: "Ibu Khadijah", phone: "6281234511002", relationship: "IBU", email: "khadijah.wali@test.com", occupation: "Ibu Rumah Tangga", address: "Jl. Melati No. 5" },
    { name: "Bapak Hasan", phone: "6281234511003", relationship: "AYAH", email: "hasan.wali@test.com", occupation: "Wiraswasta", address: "Jl. Anggrek No. 8" },
    { name: "Bapak Yusuf", phone: "6281234511004", relationship: "AYAH", email: "yusuf.wali@test.com", occupation: "PNS", address: "Jl. Kenanga No. 12" },
    { name: "Ibu Aminah", phone: "6281234511005", relationship: "IBU", email: "aminah.wali@test.com", occupation: "Guru", address: "Jl. Dahlia No. 3" },
    { name: "Bapak Ridwan", phone: null, relationship: "AYAH", email: null, occupation: "Pedagang", address: "Jl. Flamboyan No. 7" }, // wali tanpa WA (PENDING_NO_PHONE)
  ]
  const waliList: { id: string; phone: string | null }[] = []
  for (let i = 0; i < waliData.length; i++) {
    const w = waliData[i]
    const activationStatus = w.phone ? (i === 0 || i === 2 ? "ACTIVE" : "PENDING") : "PENDING_NO_PHONE"
    const r = await db.wali.create({
      data: {
        ...w,
        activationStatus,
        // Untuk wali yang ACTIVE, set PIN hash
        ...(activationStatus === "ACTIVE" ? { pinHash: WALI_DEMO_PIN_HASH } : {}),
      },
    })
    waliList.push(r)
  }
  console.log(`   - 5 wali ACTIVE/PENDING + 1 wali PENDING_NO_PHONE (PIN demo untuk ACTIVE: ${WALI_DEMO_PIN})`)

  // 10. SANTRI (15 santri, 5 per kelas)
  const santriNames = [
    { name: "Ahmad Zaki", gender: "L", waliIdx: 0 },
    { name: "Fatimah Zahra", gender: "P", waliIdx: 0 },
    { name: "Aisyah Putri", gender: "P", waliIdx: 1 },
    { name: "Umar Faruq", gender: "L", waliIdx: 2 },
    { name: "Khadijah Salsa", gender: "P", waliIdx: 2 },
    { name: "Ali Akbar", gender: "L", waliIdx: 3 },
    { name: "Hasan Mukmin", gender: "L", waliIdx: 3 },
    { name: "Husein Asyari", gender: "L", waliIdx: 3 },
    { name: "Zainab Adinda", gender: "P", waliIdx: 4 },
    { name: "Maryam Lestari", gender: "P", waliIdx: 4 },
    { name: "Bilal Ramadhan", gender: "L", waliIdx: 0 },
    { name: "Hafsah Nabila", gender: "P", waliIdx: 1 },
    { name: "Salman Alfarizi", gender: "L", waliIdx: 2 },
    { name: "Ruqayyah Aulia", gender: "P", waliIdx: 3 },
    { name: "Hamzah Pratama", gender: "L", waliIdx: 4 },
  ]
  const santriList: { id: string; kelasId: string | null; waliId: string | null }[] = []
  // NIS auto-generate: format YYNNNNNN (tahun 2 digit + urut 6 digit per tahun)
  let nisSeq = 1
  for (let i = 0; i < santriNames.length; i++) {
    const s = santriNames[i]
    const kelasIdx = Math.floor(i / 5)
    const waliId = waliList[s.waliIdx].id
    const nis = `25${String(nisSeq).padStart(6, "0")}`
    nisSeq++

    const r = await db.santri.create({
      data: {
        nis,
        name: s.name,
        gender: s.gender,
        birthPlace: "Bandung",
        birthDate: new Date(`2017-0${(i % 12) + 1}-15`),
        address: "Jl. Santri No. " + (i + 1),
        entryDate: new Date("2025-07-15"),
        status: "AKTIF",
        waliId,
        kelasId: kelasList[kelasIdx].id,
        tahunAjaranId: ta.id,
        // Create SantriWali pivot link
        waliLinks: {
          create: {
            waliId,
            relationship: waliData[s.waliIdx].relationship,
            isPrimary: true,
            canAccess: true,
          },
        },
      },
    })
    santriList.push(r)
  }
  console.log(`   - 15 santri dengan NIS format YYNNNNNN (25000001 - 25000015)`)

  // 11. JADWAL PELAJARAN (sample)
  for (let kIdx = 0; kIdx < kelasList.length; kIdx++) {
    const kelas = kelasList[kIdx]
    await db.jadwal.create({ data: { tahunAjaranId: ta.id, semesterId: semGanjil.id, kelasId: kelas.id, mapelId: mapelList[0].id, guruId: guruList[kIdx].id, dayOfWeek: 1, startTime: "07:00", endTime: "08:30" } })
    await db.jadwal.create({ data: { tahunAjaranId: ta.id, semesterId: semGanjil.id, kelasId: kelas.id, mapelId: mapelList[1].id, guruId: guruList[(kIdx + 1) % guruList.length].id, dayOfWeek: 1, startTime: "08:30", endTime: "09:30" } })
    await db.jadwal.create({ data: { tahunAjaranId: ta.id, semesterId: semGanjil.id, kelasId: kelas.id, mapelId: mapelList[2].id, guruId: guruList[(kIdx + 2) % guruList.length].id, dayOfWeek: 2, startTime: "07:00", endTime: "08:00" } })
  }

  // 12. TAGIHAN SYAHRIYAH untuk semua santri
  const jenisSyahriyah = jenisTagihan[0]
  const today = new Date()
  const todayMonth = today.getMonth()
  const dueDate = new Date(today.getFullYear(), todayMonth, 25)
  const monthNames = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"]

  for (const santri of santriList) {
    await db.tagihan.create({
      data: {
        tahunAjaranId: ta.id,
        santriId: santri.id,
        kelasId: santri.kelasId!,
        jenisTagihanId: jenisSyahriyah.id,
        amount: 50000,
        description: `Syahriyah ${monthNames[todayMonth]} ${today.getFullYear()}`,
        dueDate,
        status: "BELUM_BAYAR",
      },
    })
  }

  // 5 santri pertama sudah bayar lunas
  for (let i = 0; i < 5; i++) {
    const santri = santriList[i]
    const tagihan = await db.tagihan.findFirst({ where: { santriId: santri.id } })
    if (tagihan) {
      await db.payment.create({
        data: { invoiceNo: `INV-2025-${String(i + 1).padStart(6, "0")}`, tahunAjaranId: ta.id, tagihanId: tagihan.id, santriId: santri.id, amount: 50000, paymentMethod: "TUNAI", paymentDate: new Date(today.getTime() - i * 86400000), status: "VERIFIED", recordedById: superAdminUser.id, note: "Pembayaran tunai" },
      })
      await db.tagihan.update({ where: { id: tagihan.id }, data: { paidAmount: 50000, status: "LUNAS" } })
    }
  }
  // 2 santri cicil
  for (let i = 5; i < 7; i++) {
    const santri = santriList[i]
    const tagihan = await db.tagihan.findFirst({ where: { santriId: santri.id } })
    if (tagihan) {
      await db.payment.create({
        data: { invoiceNo: `INV-2025-${String(i + 1).padStart(6, "0")}`, tahunAjaranId: ta.id, tagihanId: tagihan.id, santriId: santri.id, amount: 25000, paymentMethod: "TUNAI", paymentDate: new Date(today.getTime() - i * 86400000), status: "VERIFIED", recordedById: superAdminUser.id, note: "Cicilan pertama" },
      })
      await db.tagihan.update({ where: { id: tagihan.id }, data: { paidAmount: 25000, status: "CICIL" } })
    }
  }

  // 13. ABSENSI SAMPLE
  for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
    const date = new Date(today.getTime() - dayOffset * 86400000)
    for (const santri of santriList) {
      const rand = Math.random()
      const status = rand < 0.9 ? "HADIR" : rand < 0.94 ? "SAKIT" : rand < 0.97 ? "IZIN" : "ALFA"
      await db.absensi.create({
        data: { tahunAjaranId: ta.id, santriId: santri.id, kelasId: santri.kelasId!, date, status, recordedByGuruId: guruList[Math.floor(Math.random() * guruList.length)].id },
      })
    }
  }

  // 14. NILAI SAMPLE
  for (const santri of santriList.slice(0, 5)) {
    await db.nilai.create({
      data: { tahunAjaranId: ta.id, semesterId: semGanjil.id, santriId: santri.id, kelasId: santri.kelasId!, mapelId: mapelList[2].id, guruId: guruList[1].id, type: "UTS", score: 70 + Math.floor(Math.random() * 25), assessmentDate: new Date(today.getTime() - 7 * 86400000) },
    })
    await db.nilai.create({
      data: { tahunAjaranId: ta.id, semesterId: semGanjil.id, santriId: santri.id, kelasId: santri.kelasId!, mapelId: mapelList[0].id, guruId: guruList[0].id, type: "HARIAN", score: 75 + Math.floor(Math.random() * 20), assessmentDate: new Date(today.getTime() - 3 * 86400000) },
    })
  }

  // 15. PENGUMUMAN
  await db.announcement.create({
    data: { title: "Selamat Datang di Sistem Informasi Madrasah Diniyah Terpadu", content: "Assalamu'alaikum Warahmatullahi Wabarakatuh. Selamat datang di SIM MADIN versi MVP V1. Sistem ini menjadi pintu terpadu untuk seluruh administrasi madrasah. Mohon untuk menggunakan sistem ini dengan baik dan benar. Jika ada kendala, silakan hubungi Super Admin. Wassalamu'alaikum Warahmatullahi Wabarakatuh.", audience: "ALL", priority: "PENTING", isPublished: true, publishedAt: new Date(), createdById: superAdminUser.id },
  })
  await db.announcement.create({
    data: { title: "Pengumuman Jadwal Ujian Tengah Semester", content: "Diberitahukan kepada seluruh santri dan wali santri bahwa Ujian Tengah Semester Ganjil TA 2025/2026 akan dilaksanakan pada minggu ke-3 bulan depan. Jadwal lengkap akan dibagikan melalui aplikasi.", audience: "ALL", priority: "PENTING", isPublished: true, publishedAt: new Date(today.getTime() - 86400000), createdById: superAdminUser.id },
  })
  await db.announcement.create({
    data: { title: "Tagihan Syahriyah Bulan Ini", content: "Mohon segera melakukan pembayaran Syahriyah bulan ini sebelum tanggal 25. Pembayaran dapat dilakukan melalui Bendahara madrasah.", audience: "WALI", priority: "NORMAL", isPublished: true, publishedAt: new Date(today.getTime() - 2 * 86400000), createdById: superAdminUser.id },
  })

  // 16. SYSTEM SETTINGS
  const settings = [
    { key: "MADRASAH_NAME", value: "Madrasah Diniyah Terpadu Al-Hidayah", type: "STRING" },
    { key: "MADRASAH_ADDRESS", value: "Jl. Pendidikan Islam No. 123, Kota Bandung", type: "STRING" },
    { key: "MADRASAH_PHONE", value: "(022) 1234567", type: "STRING" },
    { key: "MADRASAH_EMAIL", value: "info@madrasah-alhidyah.sch.id", type: "STRING" },
    { key: "MADRASAH_HEAD", value: "KH. Abdullah bin Nuh, Lc", type: "STRING" },
    { key: "ACTIVE_TA_ID", value: ta.id, type: "STRING" },
    { key: "ACTIVE_SEMESTER_ID", value: semGanjil.id, type: "STRING" },
    { key: "CURRENCY", value: "IDR", type: "STRING" },
    { key: "TIMEZONE", value: "Asia/Jakarta", type: "STRING" },
  ]
  for (const s of settings) {
    await db.systemSetting.upsert({ where: { key: s.key }, update: {}, create: s })
  }

  console.log("✅ Seed completed successfully!")
  console.log(`   - ${roles.length} roles, ${permissions.length} permissions`)
  console.log(`   - 1 super admin user (admin@madrasah.test)`)
  console.log(`   - 1 tahun ajaran + 2 semester`)
  console.log(`   - ${jenisTagihan.length} jenis tagihan, ${mapelList.length} mapel`)
  console.log(`   - ${guruList.length} guru, ${kelasList.length} kelas`)
  console.log(`   - ${waliList.length} wali, ${santriList.length} santri`)
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
