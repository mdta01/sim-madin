import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"
import { validateBody } from "@/lib/validation/helpers"
import { honorGuruUpdateSchema } from "@/lib/validation/keuangan"

interface Params { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("honor_guru:update", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    const body = await validateBody(req, honorGuruUpdateSchema)
    if (!body.ok) return body.error
    const data = body.data

    const existing = await db.honorGuru.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Honor tidak ditemukan" }, { status: 404 })

    const honorMengajar = data.honorMengajar ?? existing.honorMengajar
    const insentif = data.insentif ?? existing.insentif
    const tunjangan = data.tunjangan ?? existing.tunjangan
    const potongan = data.potongan ?? existing.potongan
    const totalHonor = honorMengajar + insentif + tunjangan - potongan

    const updateData: any = {
      honorMengajar, insentif, tunjangan, potongan, totalHonor,
      catatan: data.catatan ?? existing.catatan,
      status: data.status ?? existing.status,
    }

    // If status changes to DIBAYARKAN, set paidAt + create TransaksiKas
    if (data.status === "DIBAYARKAN" && existing.status !== "DIBAYARKAN") {
      updateData.paidAt = new Date()
      updateData.kasId = data.kasId || existing.kasId

      if (updateData.kasId) {
        await db.$transaction(async (tx) => {
          const honor = await tx.honorGuru.update({ where: { id }, data: updateData })

          // Create TransaksiKas for honor payment
          await tx.transaksiKas.create({
            data: {
              kasId: updateData.kasId,
              tahunAjaranId: existing.tahunAjaranId,
              type: "PENGELUARAN",
              category: "HONOR_GURU",
              amount: totalHonor,
              description: `Honor ${existing.periodeLabel} - Guru`,
              honorGuruId: id,
              transaksiDate: new Date(),
              recordedById: session.user.id,
            },
          })

          // Update kas balance
          const kas = await tx.kas.findUnique({ where: { id: updateData.kasId } })
          if (kas) {
            await tx.kas.update({
              where: { id: updateData.kasId },
              data: { balance: kas.balance - totalHonor },
            })
          }
        })
        await logAudit(session, "UPDATE", "HONOR_GURU", id, { status: "DIBAYARKAN", totalHonor, kasId: updateData.kasId }, req)
        return NextResponse.json({ data: await db.honorGuru.findUnique({ where: { id }, include: { guru: true } }) })
      }
    }

    const honor = await db.honorGuru.update({ where: { id }, data: updateData, include: { guru: { select: { name: true } } } })
    await logAudit(session, "UPDATE", "HONOR_GURU", id, { status: honor.status, totalHonor }, req)
    return NextResponse.json({ data: honor })
  } catch (error) {
    console.error("[honor update] error:", error)
    return NextResponse.json({ error: "Gagal memperbarui honor" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("honor_guru:delete", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    await db.honorGuru.delete({ where: { id } })
    await logAudit(session, "DELETE", "HONOR_GURU", id, {}, req)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[honor delete] error:", error)
    return NextResponse.json({ error: "Gagal menghapus honor" }, { status: 500 })
  }
}
