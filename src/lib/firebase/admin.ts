import admin from "firebase-admin"

// Use type assertion to bypass ESM/CJS type resolution issue
const firebaseAdmin: any = admin

export function isFirebaseConfigured(): boolean {
  return !!(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_STORAGE_BUCKET &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  )
}

export async function verifyBearerToken(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) return null
  if (!isFirebaseConfigured()) return null

  try {
    const token = authHeader.slice(7)
    if (!firebaseAdmin.apps.length) {
      firebaseAdmin.initializeApp({
        credential: firebaseAdmin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      })
    }
    const decoded = await firebaseAdmin.auth().verifyIdToken(token)
    const user = await firebaseAdmin.auth().getUser(decoded.uid)
    return {
      user: {
        id: user.uid,
        email: user.email || "",
        name: user.displayName || user.email || "",
        username: user.email?.split("@")[0] || "",
        roles: [] as string[],
        permissions: [] as string[],
      },
    }
  } catch {
    return null
  }
}
