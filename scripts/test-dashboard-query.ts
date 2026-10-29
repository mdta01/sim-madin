import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

async function main() {
  try {
    const count = await db.user.count()
    console.log("✅ DB OK, users:", count)

    // Test raw SQL (the one used in dashboard)
    const counts = await db.$queryRaw`
      SELECT
        (SELECT COUNT(*) FROM "Santri" WHERE "deletedAt" IS NULL AND status = 'AKTIF') as "totalSantri",
        (SELECT COUNT(*) FROM "Payment" WHERE status = 'VERIFIED' AND "paymentDate" >= date_trunc('month', CURRENT_DATE)) as "monthIncome"
    `
    console.log("✅ Raw SQL OK:", counts[0])

    // Test Promise.all queries (like dashboard does)
    const [payments, announcements] = await Promise.all([
      db.payment.findMany({ take: 5, orderBy: { paymentDate: "desc" } }),
      db.announcement.findMany({ take: 5, orderBy: { publishedAt: "desc" } }),
    ])
    console.log("✅ Promise.all OK — payments:", payments.length, "announcements:", announcements.length)

    // Test V2 queries
    const now = new Date()
    const [materiCount, tugasCount, pertemuanCount, pengumpulanCount] = await Promise.all([
      db.materi.count({ where: { deletedAt: null, isPublished: true } }),
      db.tugas.count({ where: { deletedAt: null, isPublished: true } }),
      db.pertemuan.count({ where: { date: { gte: new Date(now.getTime() - 7 * 86400000) } } }),
      db.pengumpulanTugas.count({ where: { status: { in: ["SUBMITTED", "LATE"] } } }),
    ])
    console.log("✅ V2 queries OK — materi:", materiCount, "tugas:", tugasCount, "pertemuan:", pertemuanCount, "pending:", pengumpulanCount)
  } catch (e: any) {
    console.error("❌ ERROR:", e.message)
    console.error("Full:", e)
  } finally {
    await db.$disconnect()
  }
}

main()
