import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"

/**
 * NextAuth Configuration — SIM MADIN
 * ============================================================================
 * Strategy: CredentialsProvider + JWT session
 * - Email/username + password via bcrypt
 * - Session token disimpan di cookie (HttpOnly)
 * - User session mengandung: id, email, name, role[], permission[]
 * - Permission check dilakukan via helper `requirePermission()` di API routes
 */

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        identifier: { label: "Email / Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) {
          throw new Error("Email/username dan password wajib diisi")
        }

        // Find user by email OR username
        const user = await db.user.findFirst({
          where: {
            OR: [
              { email: credentials.identifier.toLowerCase() },
              { username: credentials.identifier },
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
                    permissions: {
                      include: { permission: true },
                    },
                  },
                },
              },
            },
          },
        })

        if (!user) {
          throw new Error("Akun tidak ditemukan atau tidak aktif")
        }

        // Verify password
        const isValid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!isValid) {
          throw new Error("Password salah")
        }

        // Update last login
        await db.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        })

        // Collect all permissions from all roles
        const roles = user.userRoles.map((ur) => ur.role)
        const permissions = new Set<string>()
        for (const role of roles) {
          for (const rp of role.permissions) {
            permissions.add(rp.permission.code)
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatarUrl,
          // Custom fields
          username: user.username,
          phone: user.phone,
          roles: roles.map((r) => r.code),
          permissions: Array.from(permissions),
        } as any
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7, // 7 hari
    updateAge: 60 * 60 * 24, // refresh setiap 24 jam
  },

  jwt: {
    maxAge: 60 * 60 * 24 * 7,
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.username = (user as any).username
        token.phone = (user as any).phone
        token.roles = (user as any).roles || []
        token.permissions = (user as any).permissions || []
      }
      return token
    },

    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).id = token.id
        ;(session.user as any).username = token.username
        ;(session.user as any).phone = token.phone
        ;(session.user as any).roles = token.roles
        ;(session.user as any).permissions = token.permissions
      }
      return session
    },

    async signIn() {
      return true
    },
  },

  pages: {
    signIn: "/",
    error: "/",
  },

  secret: process.env.NEXTAUTH_SECRET || "sim-madin-dev-secret-change-in-production",
}
