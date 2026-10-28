# Setup Firebase Cloud Messaging (FCM) — SIM MADIN

Panduan setup Firebase HANYA untuk push notifications (FCM). Bukan untuk Auth, bukan untuk Storage. Estimasi waktu: 10-15 menit.

## 🎯 Kenapa Firebase FCM Saja?

| Aspek | Alasan |
|-------|--------|
| Gratis | **Unlimited** untuk semua platform (Android, iOS, Web) |
| Reliable | Di-backing Google infrastructure |
| Cross-platform | 1 SDK untuk Android + iOS + Web |
| Tidak butuh akun lain | Bisa pakai akun Google biasa |

**Untuk Auth & Storage, kita pakai Supabase** (lihat `docs/SETUP-SUPABASE.md`).

---

## 📋 Yang Akan Didapat

- ✅ Push notifications gratis unlimited
- ✅ Cross-platform: Android, iOS, Web
- ✅ Topic-based & device-based messaging
- ✅ Scheduled notifications
- ✅ Delivery analytics

---

## 🚀 Langkah 1: Buat Firebase Project

1. Buka https://console.firebase.google.com
2. Klik **Add project** (atau **Create a project**)
3. Isi:
   - **Project name**: `madrasah-madin`
   - **Google Analytics**: Disable (tidak perlu untuk MVP, optional nanti)
4. Klik **Create project**
5. Tunggu provisioning

---

## ⚙️ Langkah 2: Setup Cloud Messaging

### Untuk Web Push (Next.js PWA)

1. Di Firebase Console, klik **Project Settings** (gear icon) → **Cloud Messaging**
2. Di section **Web configuration**, klik **Generate key pair** (untuk VAPID key)
3. Copy Web Push Certificate (VAPID key)

### Untuk Android Push (Expo)

1. Klik icon Android di dashboard → register app
2. Package name: `id.madrasah.madin.guru` (atau namespace Anda)
3. Download `google-services.json`
4. Letakkan di `apps/mobile-guru/` (nanti saat build mobile apps)

### Untuk iOS Push (Expo)

1. Butuh Apple Developer account ($99/tahun) untuk push notifications
2. Generate APNs key di Apple Developer Portal
3. Upload APNs key ke Firebase Console → Project Settings → Cloud Messaging → iOS

---

## 🔑 Langkah 3: Setup Service Account (Server-side)

Untuk kirim push dari server (Next.js API route):

1. **Project Settings** (gear icon) → **Service accounts** tab
2. Klik **Generate new private key** → download JSON file
3. ⚠️ **Simpan JSON dengan aman** — jangan commit ke Git!
4. Buka JSON file, ambil values:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY`

---

## ⚙️ Langkah 4: Set Environment Variables

Edit `.env` atau set di Vercel:

```bash
# === FIREBASE CLOUD MESSAGING (Push Notifications) ===
FIREBASE_PROJECT_ID="madrasah-madin"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxx@madrasah-madin.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"

# (Optional) Untuk Web Push
NEXT_PUBLIC_FIREBASE_VAPID_KEY="BP..."
```

⚠️ **PENTING untuk `FIREBASE_PRIVATE_KEY`:**
- Paste isi `\n` sebagai literal (bukan escape sequence)
- Di Vercel: paste persis seperti di JSON file (Vercel akan handle escape)
- Di `.env` lokal: gunakan quotes dan paste literal

---

## 📦 Langkah 5: Install Package

```bash
# Firebase Admin SDK untuk server-side
bun add firebase-admin

# (Optional) Firebase client SDK untuk web push
bun add firebase
```

---

## 🧪 Langkah 6: Test Push Notification

Saat env vars sudah di-set, test dengan script:

```bash
cat > scripts/test-push.ts << 'EOF'
import { getFirebaseAdmin } from "../src/lib/firebase/admin"

async function main() {
  const admin = await getFirebaseAdmin()
  if (!admin) {
    console.log("❌ Firebase Admin SDK tidak terkonfigurasi")
    return
  }

  // Test send to a topic (subscribe device ke topic "all" dulu)
  const result = await admin.messaging?.send({
    notification: {
      title: "Test dari SIM MADIN",
      body: "Jika Anda menerima ini, FCM sudah berfungsi ✅",
    },
    topic: "all",
  })

  console.log("✅ Push terkirim:", result)
}

main()
EOF

bun run scripts/test-push.ts
```

---

## 📱 Langkah 7: Integrasi dengan Mobile Apps (Roadmap V1.6+)

Saat mobile apps dibangun (Expo React Native):

### Install di mobile app
```bash
# apps/mobile-guru
npx expo install @react-native-firebase/app @react-native-firebase/messaging
```

### Register FCM token saat login
```typescript
import messaging from "@react-native-firebase/messaging"

async function registerFCMToken(userId: string) {
  const token = await messaging().getToken()
  await fetch(`${API_BASE_URL}/api/notifications/register`, {
    method: "POST",
    headers: { Authorization: `Bearer ${userToken}` },
    body: JSON.stringify({ token, userId, platform: "android" }),
  })
}
```

### Receive notifications
```typescript
messaging().onMessage(async (remoteMessage) => {
  console.log("Notifikasi diterima:", remoteMessage.notification)
  // Tampilkan notifikasi lokal
})

messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log("Background message:", remoteMessage)
})
```

---

## 📋 Langkah 8: Backend API untuk Kirim Push (Roadmap V1.6)

Buat endpoint untuk kirim push notif dari server:

```typescript
// src/app/api/notifications/send/route.ts (roadmap V1.6)
import { NextRequest, NextResponse } from "next/server"
import { requireApiAuth } from "@/lib/auth/guards"
import { getFirebaseAdmin } from "@/lib/firebase/admin"

export async function POST(req: NextRequest) {
  const guard = await requireApiAuth(req)
  if (guard.error) return guard.error

  const { title, body, topic, userIds } = await req.json()
  const admin = await getFirebaseAdmin()

  if (!admin) {
    return NextResponse.json({ error: "FCM not configured" }, { status: 500 })
  }

  const message: any = {
    notification: { title, body },
  }

  if (topic) {
    message.topic = topic
  } else if (userIds) {
    // Kirim ke specific users (need FCM tokens dari DB)
    // message.tokens = await getFCMTokensForUsers(userIds)
  }

  const result = await admin.messaging?.send(message)
  return NextResponse.json({ success: true, messageId: result })
}
```

---

## 🎯 Use Cases di SIM MADIN

Push notif akan dikirim saat:

1. **Pengumuman baru dipublikasi**
   - Topic: `all` atau `kelas-{id}`
   - Title: "Pengumuman Baru"
   - Body: judul pengumuman

2. **Tagihan jatuh tempo H-3**
   - User: wali yang punya tagihan
   - Title: "Pengingat Tagihan"
   - Body: "Tagihan Syahriyah jatuh tempo 3 hari lagi"

3. **Pembayaran terverifikasi**
   - User: wali yang bayar
   - Title: "Pembayaran Diterima"
   - Body: "Pembayaran Rp 50.000 untuk Syahriyah telah diverifikasi"

4. **Anak ditandai ALFA**
   - User: wali dari santri
   - Title: "Anak tidak hadir"
   - Body: "Ananda Ahmad Zaki ditandai ALFA hari ini"

5. **Nilai diperbarui**
   - User: wali dari santri
   - Title: "Nilai Baru"
   - Body: "Nilai Fikih UTS untuk Ahmad Zaki sudah tersedia"

---

## 🆘 Troubleshooting

### Error: "Firebase App not initialized"
- Pastikan semua env vars ter-set (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`)
- Pastikan format `FIREBASE_PRIVATE_KEY` benar (escape `\n`)

### Error: "Permission denied saat send message"
- Cek Service Account role: harus **Firebase Admin** atau **Owner**
- Cek project ID match

### Mobile tidak menerima notif di background
- Android: cek `google-services.json` sudah di-add ke project
- iOS: cek APNs key sudah di-upload ke Firebase
- Pastikan app request permission untuk notifications

### Notif tidak muncul di device
- Cek user sudah subscribe ke topic
- Cek device token sudah terdaftar di DB
- Test dengan Firebase Console → Cloud Messaging → Send test message

---

## 📚 Bacaan Tambahan

- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Firebase Admin SDK for Node.js](https://firebase.google.com/docs/admin/setup)
- [Expo + Firebase Messaging](https://docs.expo.dev/push-notifications/using-fcm/)
- [FCM Topic Messaging](https://firebase.google.com/docs/cloud-messaging/android/topic-messaging)

---

## ⚠️ Catatan Penting

- **Jangan pakai Firebase Auth**: Pakai Supabase Auth saja (lihat SETUP-SUPABASE.md)
- **Jangan pakai Firebase Storage**: Pakai Cloudflare R2 (lihat SETUP-R2.md) atau Supabase Storage
- **Pakai Firebase HANYA untuk FCM**: Push notif gratis unlimited
