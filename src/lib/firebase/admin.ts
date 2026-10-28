/**
 * ============================================================================
 * FIREBASE ADMIN SDK ADAPTER — Server-side
 * ============================================================================
 * Pattern: graceful fallback.
 * - Jika FIREBASE_PROJECT_ID + FIREBASE_SERVICE_ACCOUNT set → pakai Firebase Admin
 * - Jika tidak set → return null (fallback ke NextAuth)
 *
 * Penggunaan di production:
 * 1. Buat project di Firebase Console
 * 2. Service Account → Generate new private key → download JSON
 * 3. Set env vars:
 *    FIREBASE_PROJECT_ID=xxx
 *    FIREBASE_CLIENT_EMAIL=xxx@xxx.iam.gserviceaccount.com
 *    FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
 *
 * Setelah mobile apps pakai Firebase Auth (sign in dapatkan ID token),
 * mobile kirim token via Authorization: Bearer <token>.
 * Server verify token via admin.auth().verifyIdToken().
 * ============================================================================
 */

import type { AppSession } from "@/lib/auth/guards"

export interface FirebaseDecodedToken {
  uid: string
  email?: string
  name?: string
  picture?: string
  phone_number?: string
  firebase?: {
    sign_in_provider: string
  }
}

export interface FirebaseAdminAdapter {
  initialized: boolean
  verifyIdToken(token: string): Promise<FirebaseDecodedToken | null>
  getUserByUid(uid: string): Promise<{ uid: string; email?: string; displayName?: string; photoURL?: string; phoneNumber?: string } | null>
}

let cachedAdapter: FirebaseAdminAdapter | null = null

/**
 * Detect apakah Firebase dikonfigurasi
 */
export function isFirebaseConfigured(): boolean {
  return !!(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  )
}

/**
 * Inisialisasi Firebase Admin SDK (lazy load)
 */
export async function getFirebaseAdmin(): Promise<FirebaseAdminAdapter | null> {
  if (!isFirebaseConfigured()) {
    return null
  }

  if (cachedAdapter) return cachedAdapter

  try {
    // Lazy import firebase-admin agar tidak load kalau tidak dipakai
    // (di production, install package: `bun add firebase-admin`)
    const admin = await import("firebase-admin")

    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID!,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
          privateKey,
        }),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      })
    }

    cachedAdapter = {
      initialized: true,

      async verifyIdToken(token: string): Promise<FirebaseDecodedToken | null> {
        try {
          const decoded = await admin.auth().verifyIdToken(token)
          return {
            uid: decoded.uid,
            email: decoded.email,
            name: decoded.name,
            picture: decoded.picture,
            phone_number: decoded.phone_number,
            firebase: decoded.firebase,
          }
        } catch (err) {
          console.error("[firebase] verifyIdToken failed:", err)
          return null
        }
      },

      async getUserByUid(uid: string) {
        try {
          const user = await admin.auth().getUser(uid)
          return {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            phoneNumber: user.phoneNumber,
          }
        } catch (err) {
          console.error("[firebase] getUserByUid failed:", err)
          return null
        }
      },
    }

    return cachedAdapter
  } catch (err) {
    console.warn("[firebase] Failed to initialize firebase-admin. Install with: bun add firebase-admin")
    return null
  }
}

/**
 * Helper: verify Bearer token dari Authorization header.
 * Return session data jika valid, atau null.
 */
export async function verifyBearerToken(authHeader?: string | null): Promise<AppSession | null> {
  if (!authHeader?.startsWith("Bearer ")) return null

  const token = authHeader.slice(7)
  const firebase = await getFirebaseAdmin()
  if (!firebase) return null

  const decoded = await firebase.verifyIdToken(token)
  if (!decoded) return null

  // Cari user di DB berdasarkan firebaseUid atau email
  const { db } = await import("@/lib/db")
  const user = await db.user.findFirst({
    where: {
      OR: [
        { firebaseUid: decoded.uid },
        ...(decoded.email ? [{ email: decoded.email }] : []),
      ],
      deletedAt: null,
      isActive: true,
    },
    include: {
      userRoles: {
        where: { isActive: true },
        include: {
          role: {
            include: {
              permissions: { include: { permission: true } },
            },
          },
        },
      },
    },
  })

  if (!user) return null

  // Sync firebaseUid kalau belum ada
  if (!user.firebaseUid) {
    await db.user.update({
      where: { id: user.id },
      data: { firebaseUid: decoded.uid, lastLoginAt: new Date() },
    })
  }

  const roles = user.userRoles.map((ur) => ur.role)
  const permissions = new Set<string>()
  for (const role of roles) {
    for (const rp of role.permissions) {
      permissions.add(rp.permission.code)
    }
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      username: user.username,
      phone: user.phone || undefined,
      image: user.avatarUrl,
      roles: roles.map((r) => r.code),
      permissions: Array.from(permissions),
    },
  }
}
