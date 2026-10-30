# Zod Validation — Pattern & Conventions

> Panduan resmi untuk validasi API routes dengan Zod. Semua endpoint baru harus ikut pattern ini.

---

## TL;DR — Pattern yang Wajib

```typescript
// 1. Imports
import { validateBody, validateQuery } from "@/lib/validation/helpers"
import { santriCreateSchema } from "@/lib/validation/santri"

export async function POST(req: NextRequest) {
  const guard = await requireApiPermission("santri:create", req)
  if (guard.error) return guard.error

  try {
    // 2. Validate body dengan Zod (replaces `await req.json()`)
    const body = await validateBody(req, santriCreateSchema)
    if (!body.ok) return body.error
    //    body.data sekarang sudah typed sebagai SantriCreateInput

    // 3. Business logic seperti biasa, pakai body.data.fieldName
    const santri = await db.santri.create({
      data: { name: body.data.name, gender: body.data.gender, ... }
    })

    return NextResponse.json({ data: santri })
  } catch (error) {
    console.error("[santri create] error:", error)
    return NextResponse.json({ error: "Gagal" }, { status: 500 })
  }
}
```

---

## Struktur File

```
src/lib/validation/
├── index.ts            # Re-export semua schemas (import dari sini saja)
├── helpers.ts          # validateBody(), validateQuery(), sanitizeZodError()
├── common.ts           # Schemas primitif (phoneSchema, rupiahSchema, dll)
├── santri.ts           # Schemas untuk modul santri
├── wali.ts             # Schemas untuk modul wali
├── akademik.ts         # Schemas untuk guru, kelas, mapel
├── keuangan.ts         # Schemas untuk tagihan, pembayaran, kas, transaksiKas, honor
└── akademik-detail.ts  # Schemas untuk ujian, absensi, nilai, pertemuan, jadwal, materi, tugas
```

---

## Helper Functions

### `validateBody(req, schema)` — untuk POST/PUT/DELETE

Parse JSON body dan validate dengan Zod schema.

```typescript
const body = await validateBody(req, santriCreateSchema)
if (!body.ok) return body.error  // 400 dengan array of issues
// body.data — typed, valid, siap dipakai
```

**Return type** (discriminated union):
- `{ ok: true; data: T }` — body valid
- `{ ok: false; error: NextResponse }` — 400 response dengan error terformat

### `validateQuery(req, schema)` — untuk GET

Parse query string params dengan coercion otomatis.

```typescript
import { paginationQuerySchema } from "@/lib/validation/helpers"

const query = await validateQuery(req, paginationQuerySchema.extend({
  search: z.string().trim().optional(),
  status: santriStatusSchema.optional(),
}))
if (!query.ok) return query.error
// query.data.page (number, default 1)
// query.data.limit (number, default 50, max 200)
```

**Penting**: gunakan `z.coerce.number()` untuk query params karena URL search params selalu string.

### `sanitizeZodError(error)` — untuk custom error handling

Format Zod issues jadi array yang frontend-friendly:

```typescript
[
  { path: "name", message: "Nama wajib diisi", code: "too_small" },
  { path: "waliPhone", message: "Format nomor WhatsApp tidak valid", code: "invalid_string" }
]
```

---

## Common Schemas (di `common.ts`)

| Schema | Validasi | Contoh |
|--------|---------|--------|
| `genderSchema` | enum `"L" \| "P"` | `"L"` |
| `whatsappInputSchema` | regex `/^(\+62\|62\|0)8\d{6,12}$/` | `"081234567890"` |
| `phoneSchema` | 8-20 digit + spesial chars | `"0812-3456-7890"` |
| `nisSchema` | 6-12 digit angka, optional | `"24000001"` |
| `nisnSchema` | 10 digit angka exact, optional | `"0012345678"` |
| `pinSchema` | 6 digit angka | `"123456"` |
| `otpSchema` | 6 digit angka | `"123456"` |
| `isoDateSchema` | ISO 8601 → transform ke Date | `"2025-10-30"` |
| `rupiahSchema` | number 0 - 1M, max 2 desimal | `150000.50` |
| `rupiahCoercedSchema` | sama, coerce dari string | `"150000"` → `150000` |
| `scoreSchema` | number 0-100 | `85.5` |
| `emailSchema` | RFC email, optional | `"user@example.com"` |
| `idSchema` | non-empty string, max 100 chars | CUID |
| `nonEmptyString` | trim, min 1, max 255 | — |
| `shortText(max)` | trim, min 1, max `max` | — |
| `longText(max)` | trim, max `max`, optional/empty | — |

---

## Enum Schemas

Sudah ada di `common.ts`, di-map dari Prisma schema:

```typescript
import {
  genderSchema,
  santriStatusSchema,        // "AKTIF" | "LULUS" | "PINDAH" | "KELUAR"
  guruStatusSchema,          // "AKTIF" | "TIDAK_AKTIF" | "CUTI"
  activationStatusSchema,    // "PENDING" | "ACTIVE" | "SUSPENDED"
  paymentMethodSchema,       // "TUNAI" | "TRANSFER" | "QRIS" | "DEPOSIT"
  paymentStatusSchema,       // "PENDING" | "VERIFIED" | "REJECTED" | "REFUNDED"
  tagihanStatusSchema,       // "BELUM_BAYAR" | "CICIL" | "LUNAS" | "DIBATALKAN"
  transaksiKasTypeSchema,    // "PEMASUKAN" | "PENGELUARAN"
  transaksiKasCategorySchema,// 5 categories
  honorGuruStatusSchema,     // "PENDING" | "DIBAYARKAN" | "DITOLAK"
  absensiStatusSchema,       // "HADIR" | "IZIN" | "SAKIT" | "ALFA"
  nilaiTypeSchema,           // "HARIAN" | "TUGAS" | "UTS" | "UAS" | "PRAKTIK"
  ujianTypeSchema,           // "UTS" | "UAS" | "QUIZ" | "MAKEUP"
  tipeSoalSchema,            // "PG" | "ISIAN" | "ESSAY" | "PRAKTIK"
  tipeTugasSchema,           // "INDIVIDU" | "KELOMPOK" | "PRAKTIK" | "HAFALAN"
  tipeMateriSchema,          // "PDF" | "FOTO" | "AUDIO" | "LINK"
} from "@/lib/validation"
```

---

## Cross-Field Validation (`.refine()`)

Untuk validasi yang melibatkan beberapa field sekaligus, gunakan `.refine()`:

```typescript
export const santriCreateSchema = z.object({
  // ...
  waliId: idSchema.optional(),
  waliName: shortText(100).optional(),
  waliPhone: whatsappInputSchema.optional(),
}).refine(
  (data) => {
    const hasExistingWali = !!data.waliId
    const hasNewWali = !!(data.waliName && data.waliPhone)
    if (hasExistingWali && hasNewWali) return false  // can't have both
    return true
  },
  {
    message: "Pilih salah satu: link ke wali existing ATAU buat wali baru, jangan keduanya",
    path: ["waliId"],
  },
)
```

Contoh lain di `keuangan.ts`:
- Transaksi PENGELUARAN dengan kategori HONOR_GURU harus punya `honorGuruId`
- Transaksi PEMASUKAN dengan kategori PEMBAYARAN_SANTRI harus punya `paymentId`

---

## Cara Menambah Schema Baru

### 1. Untuk modul baru (mis. `alumni`):

Buat file `src/lib/validation/alumni.ts`:

```typescript
import { z } from "zod"
import { idSchema, isoDateSchema, nonEmptyString, shortText } from "./common"

export const alumniCreateSchema = z.object({
  santriId: idSchema,
  tahunLulus: z.number().int().min(1990).max(2100),
  statusKelulusan: z.enum(["LULUS", "LULUS_BERSYARAT"]),
  tanggalLulus: isoDateSchema.optional(),
  catatan: shortText(500).optional(),
})
export type AlumniCreateInput = z.infer<typeof alumniCreateSchema>

export const alumniUpdateSchema = z.object({
  tahunLulus: z.number().int().min(1990).max(2100).optional(),
  statusKelulusan: z.enum(["LULUS", "LULUS_BERSYARAT"]).optional(),
  // ...
})
export type AlumniUpdateInput = z.infer<typeof alumniUpdateSchema>
```

Update `src/lib/validation/index.ts`:

```typescript
export * from "./alumni"  // tambahkan baris ini
```

### 2. Apply ke API route:

```typescript
// src/app/api/admin/alumni/route.ts
import { validateBody } from "@/lib/validation/helpers"
import { alumniCreateSchema } from "@/lib/validation/alumni"

export async function POST(req: NextRequest) {
  const guard = await requireApiPermission("alumni:create", req)
  if (guard.error) return guard.error

  try {
    const body = await validateBody(req, alumniCreateSchema)
    if (!body.ok) return body.error
    // body.data.santriId, body.data.tahunLulus, dll — fully typed

    const alumni = await db.alumni.create({
      data: body.data,
    })
    return NextResponse.json({ data: alumni })
  } catch (error) {
    console.error("[alumni create] error:", error)
    return NextResponse.json({ error: "Gagal membuat alumni" }, { status: 500 })
  }
}
```

---

## Error Response Format

Semua error response dari `validateBody` / `validateQuery` punya format konsisten:

```json
{
  "error": "Validasi input gagal",
  "issues": [
    {
      "path": "name",
      "message": "Wajib diisi",
      "code": "too_small"
    },
    {
      "path": "waliPhone",
      "message": "Format nomor WhatsApp tidak valid. Format: 08xxx, 628xxx, atau +628xxx",
      "code": "invalid_string"
    }
  ]
}
```

Frontend bisa iterate `issues[]` untuk highlight field yang error di form.

---

## Routes yang Sudah Di-Apply Zod (16 routes)

| Module | Routes |
|--------|--------|
| Santri | `POST /api/admin/santri`, `PUT /api/admin/santri/[id]`, `GET /api/admin/santri` (query pagination) |
| Wali | `POST /api/admin/wali`, `PUT /api/admin/wali/[id]`, `POST /api/wali/login` (with rate-limit) |
| Guru | `POST /api/admin/guru`, `PUT /api/admin/guru/[id]` |
| Kelas | `POST /api/admin/kelas`, `PUT /api/admin/kelas/[id]` |
| Mapel | `POST /api/admin/mapel`, `PUT /api/admin/mapel/[id]` |
| Ujian | `POST /api/admin/ujian`, `PUT /api/admin/ujian/[id]` |
| Kas | `POST /api/admin/kas`, `PUT /api/admin/kas/[id]` |
| Transaksi Kas | `POST /api/admin/kas/transaksi` |
| Jadwal | `POST /api/admin/jadwal`, `PUT /api/admin/jadwal/[id]` |
| Absensi | `POST /api/admin/absensi` (dispatches single vs bulk) |

## Routes yang Belum Di-Apply (TODO)

- `tagihan` POST/PUT — schema sudah ada di `keuangan.ts` (`tagihanCreateSchema`, `tagihanUpdateSchema`)
- `pembayaran` POST/PUT — `pembayaranCreateSchema`, `pembayaranUpdateSchema`
- `honor-guru` POST/PUT — `honorGuruCreateSchema`, `honorGuruUpdateSchema`
- `jenis-tagihan` POST/PUT — `jenisTagihanCreateSchema`, `jenisTagihanUpdateSchema`
- `bank-soal` POST/PUT — `bankSoalCreateSchema`, `bankSoalUpdateSchema`
- `nilai` POST/PUT — `nilaiCreateSchema`, `nilaiUpdateSchema`, `nilaiBulkCreateSchema`
- `pertemuan` POST/PUT — `pertemuanCreateSchema`, `pertemuanUpdateSchema`
- `materi` POST/PUT — `materiCreateSchema`, `materiUpdateSchema`
- `tugas` POST/PUT — `tugasCreateSchema`, `tugasUpdateSchema`
- `pengumpulan` POST/PUT — `pengumpulanTugasCreateSchema`, `pengumpulanTugasGradeSchema`
- `request-otp`, `verify-otp`, `set-pin` — schemas sudah ada di `wali.ts`

---

## Best Practices

### ✅ Do

- **Single source of truth**: schema defines both runtime validation AND TypeScript types
- **Reuse common schemas**: `phoneSchema`, `idSchema`, `isoDateSchema` — jangan redefine
- **Use `.refine()`** untuk cross-field validation (mis. password == confirmPassword)
- **Coerce query params**: pakai `z.coerce.number()` untuk angka di URL query
- **Export inferred types**: `export type X = z.infer<typeof schemaX>` agar callers dapat type safety

### ❌ Don't

- **Jangan pakai `await req.json()` langsung** — selalu lewat `validateBody` agar ada type safety
- **Jangan validate manual dengan `if (!body.name)`** — Zod lebih declarative & consistent
- **Jangan hapus `requireApiPermission` guard** — Zod validasi input, bukan otorisasi
- **Jangan log `body.data` ke audit log** jika ada field sensitif (password, OTP)
- **Jangan lupa test edge cases**: empty body, wrong type, extra fields, boundary values

---

## Testing

```typescript
// Test script untuk verify schema behavior
import { santriCreateSchema } from "@/lib/validation/santri"

const valid = santriCreateSchema.safeParse({
  name: "Ahmad Fauzi",
  gender: "L",
})
console.log(valid.success)  // true

const invalid = santriCreateSchema.safeParse({
  name: "",
  gender: "X",
})
console.log(invalid.success)  // false
console.log(invalid.error.issues)
// [
//   { path: ["name"], message: "Wajib diisi", code: "too_small" },
//   { path: ["gender"], message: "Invalid enum value. Expected 'L' | 'P'", code: "invalid_enum_value" }
// ]
```
