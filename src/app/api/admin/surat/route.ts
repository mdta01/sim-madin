import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"

/**
 * GET /api/admin/surat
 * Query: type, status, santriId, search
 */
export async function GET(req: NextRequest) {
  const guard = await requireApiPermission("surat:read", req)
  if (guard.error) return guard.error
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get("type")
    const status = searchParams.get("status")
    const santriId = searchParams.get("santriId")
    const search = searchParams.get("search") || ""

    const where: any = {}
    if (type) where.type = type
    if (status) where.status = status
    if (santriId) where.santriId = santriId
    if (search) {
      where.OR = [
        { nomorSurat: { contains: search, mode: "insensitive" } },
        { title: { contains: search, mode: "insensitive" } },
      ]
    }

    const data = await db.surat.findMany({
      where,
      include: {
        santri: { select: { id: true, name: true, nis: true } },
        guru: { select: { id: true, name: true, nip: true } },
      },
      orderBy: { tanggalSurat: "desc" },
      take: 500,
    })
    return NextResponse.json({ data, total: data.length })
  } catch (error) {
    console.error("[surat list] error:", error)
    return NextResponse.json({ error: "Gagal memuat surat" }, { status: 500 })
  }
}

/**
 * POST /api/admin/surat
 * Create surat with auto-generated nomorSurat.
 * Auto-fill content from santri/guru data if not provided.
 */
export async function POST(req: NextRequest) {
  const guard = await requireApiPermission("surat:create", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const body = await req.json()
    if (!body.type || !body.title) {
      return NextResponse.json({ error: "Tipe dan Judul wajib diisi" }, { status: 400 })
    }

    // Auto-generate nomorSurat: "001/SKT/X/2025"
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, "0")
    const romanMonths = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"]
    const romanMonth = romanMonths[now.getMonth()]
    const typeCode = body.type.slice(0, 3).toUpperCase()
    const count = await db.surat.count({ where: { type: body.type } })
    const nomorSurat = `${String(count + 1).padStart(3, "0")}/${typeCode}/${romanMonth}/${year}`

    // Auto-fill content from santri data if santriId provided and content empty
    let content = body.content || ""
    if (!content && body.santriId) {
      const santri = await db.santri.findUnique({
        where: { id: body.santriId },
        include: { kelas: true, tahunAjaran: true },
      })
      if (santri) {
        content = generateSuratContent(body.type, santri, body)
      }
    }

    const surat = await db.surat.create({
      data: {
        nomorSurat,
        type: body.type,
        title: body.title,
        santriId: body.santriId || null,
        guruId: body.guruId || null,
        content,
        periodeMulai: body.periodeMulai ? new Date(body.periodeMulai) : null,
        periodeSelesai: body.periodeSelesai ? new Date(body.periodeSelesai) : null,
        tempat: body.tempat || null,
        tanggalSurat: body.tanggalSurat ? new Date(body.tanggalSurat) : new Date(),
        status: body.status || "DRAFT",
        signedBy: body.signedBy || null,
        createdById: session.user.id,
      },
      include: { santri: { select: { name: true } } },
    })
    await logAudit(session, "CREATE", "SURAT", surat.id, {
      nomorSurat: surat.nomorSurat, type: surat.type,
    }, req)
    return NextResponse.json({ data: surat })
  } catch (error) {
    console.error("[surat create] error:", error)
    return NextResponse.json({ error: "Gagal membuat surat" }, { status: 500 })
  }
}

// Helper: auto-generate surat content from santri data
function generateSuratContent(type: string, santri: any, body: any): string {
  const now = new Date()
  const dateStr = now.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })

  switch (type) {
    case "AKTIF":
      return `Yang bertanda tangan di bawah ini, Kepala Madrasah, menerangkan bahwa:

Nama: ${santri.name}
NIS: ${santri.nis}
Kelas: ${santri.kelas?.name || "-"}
Jenis Kelamin: ${santri.gender === "L" ? "Laki-laki" : "Perempuan"}
Tempat Lahir: ${santri.birthPlace || "-"}
Tanggal Lahir: ${santri.birthDate ? new Date(santri.birthDate).toLocaleDateString("id-ID") : "-"}
Alamat: ${santri.address || "-"}

Adalah benar-benar masih aktif sebagai santri di madrasah kami pada tahun ajaran ${santri.tahunAjaran?.name || "berjalan"}.

Surat keterangan ini dibuat untuk keperluan: ${body.title || "keterangan aktif santri"}.

Demikian surat keterangan ini dibuat dengan sebenarnya.`

    case "IZIN":
      return `Yang bertanda tangan di bawah ini, Kepala Madrasah, memberikan izin kepada:

Nama: ${santri.name}
NIS: ${santri.nis}
Kelas: ${santri.kelas?.name || "-"}

Untuk tidak mengikuti kegiatan belajar mengajar pada:
${body.periodeMulai ? `Tanggal mulai: ${new Date(body.periodeMulai).toLocaleDateString("id-ID")}` : ""}
${body.periodeSelesai ? `Tanggal selesai: ${new Date(body.periodeSelesai).toLocaleDateString("id-ID")}` : ""}

Alasan: ${body.title || "izin"}

Demikian surat izin ini dibuat.`

    case "KELULUSAN":
      return `Yang bertanda tangan di bawah ini, Kepala Madrasah, menerangkan bahwa:

Nama: ${santri.name}
NIS: ${santri.nis}
Kelas: ${santri.kelas?.name || "-"}

Dinyatakan LULUS pada tahun ajaran ${santri.tahunAjaran?.name || "berjalan"}.

Surat keterangan kelulusan ini dibuat untuk keperluan pendaftaran lanjutan studi.

Demikian surat keterangan ini dibuat dengan sebenarnya.`

    default:
      return `Surat ${body.title}

Dibuat pada: ${dateStr}
${santri.name ? `Nama: ${santri.name}` : ""}`
  }
}
