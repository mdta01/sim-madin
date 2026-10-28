import "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      username: string
      phone?: string
      image?: string | null
      roles: string[]
      permissions: string[]
    }
  }

  interface User {
    id: string
    email: string
    name: string
    username: string
    phone?: string
    image?: string | null
    roles: string[]
    permissions: string[]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    username: string
    phone?: string
    roles: string[]
    permissions: string[]
  }
}
