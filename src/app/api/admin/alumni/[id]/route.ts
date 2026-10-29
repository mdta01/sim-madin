import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"

interface Params { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("alumni:update", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    const body = await req.json()
    const existing = await db.alumni.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Alumni tidak ditemukan" }, { status: 404 })

    const alumni = await db.alumni.update({
      where: { id },
      data: {
        statusKelulusan: body.statusKelulusan ?? existing.statusKelulusan,
        nilaiAkhir: body.nilaiAkhir !== undefined ? Number(body.nilaiAkhir) : existing.nilaiAkhir,
        predikatAkhir: body.predikatAkhir ?? existing.predikatAkhir,
        syaratNilaiLengkap: body.syaratNilaiLengkap ?? existing.syaratNilaiLengkap,
        syaratAbsensiCukup: body.syaratAbsensiCukup ?? existing.syaratAbsensiCukup,
        syaratTagihanLunas: body.syaratTagihanLunas ?? existing.syaratTagihanLunas,
        syaratUjianAkhir: body.syaratUjianAkhir ?? existing.syaratUjianAkhir,
        syaratLainnya: body.syaratLainnya ?? existing.syaratLainnya,
        suratKeteranganLulus: body.suratKeteranganLulus ?? existing.suratKeteranganLulus,
        sertifikat: body.sertifikat ?? existing.sertifikat,
        piagam: body.piagam ?? existing.piagam,
        pendidikanLanjutan: body.pendidikanLanjutan ?? existing.pendidikanLanjutan,
        pekerjaan: body.pekerjaan ?? existing.pekerjaan,
        telepon: body.telepon ?? existing.telepon,
        email: body.email ?? existing.email,
        domisiliKota: body.domisiliKota ?? existing.domisiliKota,
        domisiliAlamat: body.domisiliAlamat ?? existing.domisiliAlamat,
        aktivitasAlumni: body.aktivitasAlumni ?? existing.aktivitasAlumni,
        catatan: body.catatan ?? existing.catatan,
        tanggalLulus: body.tanggalLulus ? new Date(body.tanggalLulus) : existing.tanggalLulus,
      },
      include: { santri: { select: { name: true } } },
    })
    await logAudit(session, "UPDATE", "ALUMNI", id, { status: alumni.statusKelulusan }, req)
    return NextResponse.json({ data: alumni })
  } catch (error) {
    console.error("[alumni update] error:", error)
    return NextResponse.json({ error: "Gagal memperbarui alumni" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("alumni:delete", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    const existing = await db.alumni.findUnique({ where: { id }, select: { santriId: true } })
    if (!existing) return NextResponse.json({ error: "Alumni tidak ditemukan" }, { status: 404 })

    // Delete alumni record + revert santri status to AKTIF
    await db.$transaction(async (tx) => {
      await tx.alumni.delete({ where: { id } })
      await tx.santri.update({
        where: { id: existing.santriId },
        data: { status: "AKTIF" },
      })
    })

    await logAudit(session, "DELETE", "ALUMNI", id, { santriId: existing.santriId }, req)
    return NextResponse.json({ success: true, message: "Alumni dihapus, santri dikembalikan ke status AKTIF" })
  } catch (error) {
    console.error("[alumni delete] error:", error)
    return NextResponse.json({ error: "Gagal menghapus alumni" }, { status: 500 })
  }
}
