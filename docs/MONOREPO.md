# Panduan Migrasi ke Nx Monorepo — SIM MADIN

Dokumen ini menjelaskan langkah-langkah untuk memindahkan struktur project dari single Next.js app ke **Nx monorepo** dengan struktur `apps/` + `packages/`.

## 📦 Struktur Target

```
madrasah-diniyah/
├── apps/
│   ├── super-admin/              # Next.js 16 — Web App Super Admin
│   │   ├── src/
│   │   │   ├── app/             # App router
│   │   │   ├── components/admin/
│   │   │   ├── stores/
│   │   │   └── lib/
│   │   ├── prisma/
│   │   ├── public/
│   │   └── package.json
│   │
│   ├── mobile-kepala/           # Expo React Native — Kepala Madrasah
│   ├── mobile-bendahara/        # Expo React Native — Bendahara
│   ├── mobile-guru/             # Expo React Native — Guru
│   └── mobile-wali/             # Expo React Native — Wali Santri
│
├── packages/
│   ├── database/                # Prisma schema + seed + migrations (SHARED)
│   │   ├── schema.prisma
│   │   ├── seed.ts
│   │   └── package.json
│   │
│   ├── shared/                  # Constants, types, utils (SHARED)
│   │   ├── src/
│   │   │   ├── constants.ts
│   │   │   ├── types.ts
│   │   │   └── utils.ts
│   │   └── package.json
│   │
│   └── api-client/              # Typed API client (siap web & mobile)
│       ├── src/
│       │   └── index.ts
│       └── package.json
│
├── nx.json                       # Nx config
├── pnpm-workspace.yaml           # Workspace config
├── package.json                  # Root package.json
└── tsconfig.base.json            # Shared TS config
```

## 🚀 Langkah Migrasi

### Langkah 1: Setup Root Workspace

```bash
# Dari root project
pnpm init

# Install Nx + tools
pnpm add -D nx @nx/workspace @nx/next @nx/react-native @nx/js

# Install shared dependencies
pnpm add prisma @prisma/client next-auth bcryptjs firebase-admin
pnpm add -D @types/bcryptjs
```

Buat `pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

Buat `nx.json`:

```json
{
  "$schema": "./node_modules/nx/schemas/nx-schema.json",
  "npmScope": "sim-madin",
  "tasksRunnerOptions": {
    "default": {
      "runner": "nx/tasks-runners/default",
      "options": {
        "cacheableOperations": ["build", "lint", "test", "e2e"]
      }
    }
  },
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"]
    }
  },
  "plugins": [
    "@nx/next/plugin",
    "@nx/react-native/plugin"
  ]
}
```

### Langkah 2: Pindahkan Shared Code

Folder `packages/shared/` dan `packages/database/` sudah ada di repo ini. Langkah:

```bash
# Sudah ada di packages/shared/src/, packages/database/schema.prisma
# Tinggal tambahkan ke workspace
```

Update `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@sim-madin/shared": ["packages/shared/src/index.ts"],
      "@sim-madin/shared/*": ["packages/shared/src/*"],
      "@sim-madin/database": ["packages/database/src/index.ts"],
      "@sim-madin/api-client": ["packages/api-client/src/index.ts"]
    }
  }
}
```

### Langkah 3: Pindahkan Super Admin App

```bash
# Buat apps/super-admin/
npx g @nx/next:application super-admin \
  --directory=apps/super-admin \
  --style=tailwind \
  --appDir=true

# Pindahkan isi src/ dari root ke apps/super-admin/src/
mv src/ apps/super-admin/src/
mv prisma/ apps/super-admin/prisma/
mv public/ apps/super-admin/public/
mv components.json apps/super-admin/
mv tailwind.config.ts apps/super-admin/
mv postcss.config.mjs apps/super-admin/
mv next.config.ts apps/super-admin/

# Update imports di apps/super-admin/src/lib/constants.ts
# Dari: export * from "../../../packages/shared/src/constants"
# Ke:   export * from "@sim-madin/shared"
```

### Langkah 4: Setup Database Package sebagai Shared

```bash
# Buat package @sim-madin/database
cd packages/database
pnpm init
# (sudah ada schema.prisma dan package.json)

# Update scripts untuk work dengan workspace
# Edit package.json:
{
  "scripts": {
    "db:push": "prisma db push --schema=./schema.prisma",
    "db:generate": "prisma generate --schema=./schema.prisma",
    "db:seed": "tsx seed.ts"
  }
}
```

Di `apps/super-admin/package.json`:

```json
{
  "dependencies": {
    "@sim-madin/shared": "workspace:*",
    "@sim-madin/database": "workspace:*",
    "@sim-madin/api-client": "workspace:*",
    "@prisma/client": "^6.11.1",
    "next-auth": "^4.24.11",
    "bcryptjs": "^3.0.3",
    "firebase-admin": "^12.0.0"
  }
}
```

### Langkah 5: Setup Mobile Apps (Expo)

```bash
# Generate mobile-guru app
npx g @nx/react-native:application mobile-guru \
  --directory=apps/mobile-guru \
  --preset=blank-typescript

# Setup dependencies
cd apps/mobile-guru
pnpm add @sim-madin/shared@workspace:* @sim-madin/api-client@workspace:*
pnpm add firebase @react-native-async-storage/async-storage
pnpm add nativewind react-native-safe-area-context
```

### Langkah 6: Run Commands di Workspace

```bash
# Run super-admin dev server
npx nx serve super-admin

# Run mobile-guru dev
npx nx run-android mobile-guru

# Build semua apps
npx nx run-many --target=build --all

# Lint semua packages
npx nx run-many --target=lint --all
```

## 🔧 Konfigurasi Tambahan

### Environment Variables per App

**apps/super-admin/.env.local**:
```bash
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"
FIREBASE_PROJECT_ID="..."
FIREBASE_CLIENT_EMAIL="..."
FIREBASE_PRIVATE_KEY="..."
FIREBASE_STORAGE_BUCKET="..."
```

**apps/mobile-guru/.env** (Expo):
```bash
EXPO_PUBLIC_API_BASE_URL="http://localhost:3000"
EXPO_PUBLIC_FIREBASE_API_KEY="..."
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN="..."
EXPO_PUBLIC_FIREBASE_PROJECT_ID="..."
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET="..."
EXPO_PUBLIC_FIREBASE_APP_ID="..."
```

### Shared Database Client

Buat `packages/database/src/index.ts`:

```typescript
import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

export const db = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query"] : [],
})

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db
```

Update `apps/super-admin/src/lib/db.ts`:

```typescript
// Dari: import { PrismaClient } from "@prisma/client" + new PrismaClient()
// Ke:
export { db } from "@sim-madin/database"
```

### Type-Safe API Client

Di mobile apps, pakai shared API client:

```typescript
// apps/mobile-guru/src/api/index.ts
import { createApiClient } from "@sim-madin/api-client"
import * as SecureStore from "expo-secure-store"
import * as firebase from "firebase/auth"

const api = createApiClient({
  baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
  getToken: async () => {
    const user = firebase.getAuth().currentUser
    if (!user) return null
    return await user.getIdToken()
  },
})

export { api }
```

## ✅ Verification Checklist

Setelah migrasi:

- [ ] `pnpm install` di root jalan tanpa error
- [ ] `npx nx serve super-admin` jalan di port 3000
- [ ] `npx nx run-android mobile-guru` build APK berhasil
- [ ] Login web dengan `admin@madrasah.test` jalan
- [ ] Mobile app bisa login via Firebase Auth
- [ ] Mobile app bisa GET `/api/admin/santri` dengan Bearer token
- [ ] Upload foto dari mobile terlihat di Firebase Storage
- [ ] Audit log tercatat untuk aksi mobile (header User-Agent akan menunjukkan mobile)
- [ ] Shared constants berubah di `packages/shared` langsung ter-effect di web & mobile

## 📚 Bacaan Tambahan

- [Nx Documentation](https://nx.dev)
- [Nx + Next.js guide](https://nx.dev/recipes/next/next-js-setup)
- [Nx + React Native guide](https://nx.dev/recipes/react-native/react-native-setup)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
