// Temporarily simplified auth service for basic functionality
// Full implementation will be available after database migration

import bcrypt from "bcryptjs"
import prisma from "../db"

export interface AuthenticateUserParams {
  identifier: string // email or username
  password: string
  twoFactorCode?: string
  ipAddress: string
  userAgent: string
}

export interface AuthenticationResult {
  success: boolean
  user?: {
    id: string
    email: string | null
    name: string | null
    username?: string | null
    image: string | null
  }
  error?: string
  requiresTwoFactor?: boolean
}

export interface RegisterUserParams {
  email: string
  username?: string
  password: string
  name?: string
}

export class AuthService {
  private static readonly SALT_ROUNDS = 12

  /**
   * Authenticate a user with username/password (simplified version)
   */
  static async authenticateUser(params: AuthenticateUserParams): Promise<AuthenticationResult> {
    const { identifier, password } = params

    try {
      // Find user by email (username support will be added after migration)
      const user = await prisma.user.findUnique({
        where: { email: identifier },
      })

      if (!user) {
        return { success: false, error: "Invalid credentials" }
      }

      // For now, we'll use OAuth-only authentication
      // Password authentication will be enabled after database migration
      return { success: false, error: "Password authentication not yet available. Please use OAuth." }
    } catch (error) {
      console.error("Authentication error:", error)
      return { success: false, error: "Authentication failed" }
    }
  }

  /**
   * Register a new user (simplified version)
   */
  static async registerUser(params: RegisterUserParams): Promise<AuthenticationResult> {
    const { email, name } = params

    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      })

      if (existingUser) {
        return { success: false, error: "Email already registered" }
      }

      // Create user with OAuth-ready fields only
      const user = await prisma.user.create({
        data: {
          email,
          name,
          // Password and other fields will be added after migration
        },
      })

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        },
      }
    } catch (error) {
      console.error("Registration error:", error)
      return { success: false, error: "Registration failed" }
    }
  }

  /**
   * Setup two-factor authentication (placeholder)
   */
  static async setupTwoFactor(userId: string): Promise<any> {
    throw new Error("2FA setup not available until database migration is complete")
  }

  /**
   * Enable two-factor authentication (placeholder)
   */
  static async enableTwoFactor(userId: string, token: string): Promise<boolean> {
    return false
  }

  /**
   * Disable two-factor authentication (placeholder)
   */
  static async disableTwoFactor(userId: string, password: string): Promise<boolean> {
    return false
  }

  /**
   * Generate password reset token (placeholder)
   */
  static async generatePasswordResetToken(email: string): Promise<string | null> {
    // Will be implemented after migration
    return null
  }

  /**
   * Reset password using token (placeholder)
   */
  static async resetPassword(token: string, newPassword: string): Promise<boolean> {
    return false
  }

  /**
   * Verify email using token (placeholder)
   */
  static async verifyEmail(token: string): Promise<boolean> {
    return false
  }
}
