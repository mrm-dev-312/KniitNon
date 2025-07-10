import { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import GoogleProvider from "next-auth/providers/google"
import GitHubProvider from "next-auth/providers/github"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import prisma from "./db"
import { AuthService } from "./services/auth-service-temp"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    // OAuth Providers
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
    
    // Username/Password Provider
    CredentialsProvider({
      id: "credentials",
      name: "credentials",
      credentials: {
        identifier: { label: "Email or Username", type: "text" },
        password: { label: "Password", type: "password" },
        twoFactorCode: { label: "Two-Factor Code (if enabled)", type: "text", optional: true },
      },
      async authorize(credentials, req) {
        if (!credentials?.identifier || !credentials?.password) {
          throw new Error("Missing credentials")
        }

        try {
          const result = await AuthService.authenticateUser({
            identifier: credentials.identifier,
            password: credentials.password,
            twoFactorCode: credentials.twoFactorCode,
            ipAddress: req.headers?.["x-forwarded-for"] as string || "unknown",
            userAgent: req.headers?.["user-agent"] as string || "unknown",
          })

          if (result.success && result.user) {
            return {
              id: result.user.id,
              email: result.user.email,
              name: result.user.name,
              username: result.user.username,
              image: result.user.image,
            }
          }

          throw new Error(result.error || "Authentication failed")
        } catch (error) {
          console.error("Authentication error:", error)
          throw new Error("Invalid credentials")
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Additional security checks
      if (account?.provider === "credentials") {
        // User already validated in authorize function
        return true
      }
      
      // For OAuth providers, check if user is active
      if (user.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        })
        
        // TODO: Check isActive when field is available
        // if (existingUser && !existingUser.isActive) {
        //   return false
        // }
      }
      
      return true
    },
    
    async session({ session, token }) {
      if (session?.user && token.sub) {
        const user = await prisma.user.findUnique({
          where: { id: token.sub },
          select: {
            id: true,
            email: true,
            name: true,
            // username: true, // TODO: Uncomment when schema is migrated
            image: true,
            // twoFactorEnabled: true, // TODO: Uncomment when schema is migrated
            // isActive: true, // TODO: Uncomment when schema is migrated
            // isVerified: true, // TODO: Uncomment when schema is migrated
          },
        })
        
        if (user) {
          session.user = {
            ...session.user,
            id: user.id,
            // username: user.username, // TODO: Uncomment when schema is migrated
            // twoFactorEnabled: user.twoFactorEnabled, // TODO: Uncomment when schema is migrated
            // isActive: user.isActive, // TODO: Uncomment when schema is migrated
            // isVerified: user.isVerified, // TODO: Uncomment when schema is migrated
          }
        }
      }
      return session
    },
    
    async jwt({ user, token }) {
      if (user) {
        token.sub = user.id
      }
      return token
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
    verifyRequest: "/auth/verify-request",
  },
  events: {
    async signIn({ user, account, isNewUser }) {
      // Update last login time
      if (user.id) {
        // TODO: Uncomment when schema is migrated
        // await prisma.user.update({
        //   where: { id: user.id },
        //   data: { lastLoginAt: new Date() },
        // })
      }
    },
  },
}
