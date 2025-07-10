import NextAuth from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      username?: string | null
      twoFactorEnabled?: boolean
      isActive?: boolean
      isVerified?: boolean
    }
  }

  interface User {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
    username?: string | null
    twoFactorEnabled?: boolean
    isActive?: boolean
    isVerified?: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    username?: string | null
    twoFactorEnabled?: boolean
    isActive?: boolean
    isVerified?: boolean
  }
}
