/**
 * Patch script untuk menambah permission tahun_ajaran:read ke role GURU & WALI
 * Tanpa reset data. Run: `bun run scripts/patch-permissions.ts`
 */
import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

async function main() {
  console.log("🔧 Patching permissions for GURU & WALI roles...")

  // Ambil permission tahun_ajaran:read
  const taRead = await db.permission.findUnique({ where: { code: "tahun_ajaran:read" } })
  if (!taRead) {
    console.error("Permission tahun_ajaran:read tidak ditemukan. Run db:seed terlebih dahulu.")
    process.exit(1)
  }

  // Ambil role GURU dan WALI
  const guruRole = await db.role.findUnique({ where: { code: "GURU" } })
  const waliRole = await db.role.findUnique({ where: { code: "WALI" } })
  if (!guruRole || !waliRole) {
    console.error("Role GURU/WALI tidak ditemukan")
    process.exit(1)
  }

  // Assign tahun_ajaran:read ke GURU
  await db.rolePermission.upsert({
    where: { roleId_permissionId: { roleId: guruRole.id, permissionId: taRead.id } },
    update: {},
    create: { roleId: guruRole.id, permissionId: taRead.id },
  })
  console.log("✓ Added tahun_ajaran:read to GURU")

  // Assign tahun_ajaran:read & kelas:read ke WALI
  await db.rolePermission.upsert({
    where: { roleId_permissionId: { roleId: waliRole.id, permissionId: taRead.id } },
    update: {},
    create: { roleId: waliRole.id, permissionId: taRead.id },
  })
  console.log("✓ Added tahun_ajaran:read to WALI")

  const kelasRead = await db.permission.findUnique({ where: { code: "kelas:read" } })
  if (kelasRead) {
    await db.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: waliRole.id, permissionId: kelasRead.id } },
      update: {},
      create: { roleId: waliRole.id, permissionId: kelasRead.id },
    })
    console.log("✓ Added kelas:read to WALI")
  }

  console.log("✅ Patch selesai")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await db.$disconnect() })
