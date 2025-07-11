import bcrypt from "bcryptjs"
import speakeasy from "speakeasy"
import crypto from "crypto"
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
    username: string | null
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

export interface TwoFactorSetupResult {
  secret: string
  qrCodeUrl: string
  backupCodes: string[]
}

export class AuthService {
  private static readonly MAX_LOGIN_ATTEMPTS = 5
  private static readonly LOCKOUT_DURATION = 15 * 60 * 1000 // 15 minutes
  private static readonly SALT_ROUNDS = 12

  /**
   * Authenticate a user with username/password and optional 2FA
   */
  static async authenticateUser(params: AuthenticateUserParams): Promise<AuthenticationResult> {
    const { identifier, password, twoFactorCode, ipAddress, userAgent } = params

    try {
      // Check for rate limiting
      const isRateLimited = await this.checkRateLimit(identifier, ipAddress)
      if (isRateLimited) {
        await this.logLoginAttempt({
          email: identifier,
          ipAddress,
          userAgent,
          success: false,
          failureReason: "Rate limited",
        })
        return { success: false, error: "Too many failed attempts. Please try again later." }
      }

      // Find user by email or username
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: identifier },
            { username: identifier },
          ],
          isActive: true,
        },
      })

      if (!user || !user.password) {
        await this.logLoginAttempt({
          email: identifier,
          ipAddress,
          userAgent,
          success: false,
          failureReason: "User not found or no password set",
        })
        return { success: false, error: "Invalid credentials" }
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password)
      if (!isValidPassword) {
        await this.logLoginAttempt({
          userId: user.id,
          email: identifier,
          ipAddress,
          userAgent,
          success: false,
          failureReason: "Invalid password",
        })
        return { success: false, error: "Invalid credentials" }
      }

      // Check if 2FA is enabled
      if (user.twoFactorEnabled) {
        if (!twoFactorCode) {
          return { 
            success: false, 
            requiresTwoFactor: true,
            error: "Two-factor authentication code required" 
          }
        }

        const isValid2FA = await this.verifyTwoFactorCode(user.id, twoFactorCode)
        if (!isValid2FA) {
          await this.logLoginAttempt({
            userId: user.id,
            email: identifier,
            ipAddress,
            userAgent,
            success: false,
            failureReason: "Invalid 2FA code",
          })
          return { success: false, error: "Invalid two-factor authentication code" }
        }
      }

      // Successful authentication
      await this.logLoginAttempt({
        userId: user.id,
        email: identifier,
        ipAddress,
        userAgent,
        success: true,
      })

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
          image: user.image,
        },
      }
    } catch (error) {
      console.error("Authentication error:", error)
      return { success: false, error: "Authentication failed" }
    }
  }

  /**
   * Register a new user
   */
  static async registerUser(params: RegisterUserParams): Promise<AuthenticationResult> {
    const { email, username, password, name } = params

    try {
      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email },
            ...(username ? [{ username }] : []),
          ],
        },
      })

      if (existingUser) {
        return { 
          success: false, 
          error: existingUser.email === email ? "Email already registered" : "Username already taken" 
        }
      }

      // Validate password strength
      const passwordValidation = this.validatePassword(password)
      if (!passwordValidation.isValid) {
        return { success: false, error: passwordValidation.message }
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS)

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          username,
          password: hashedPassword,
          name,
          isActive: true,
          isVerified: false,
        },
      })

      // Generate email verification token
      await this.generateEmailVerificationToken(user.id)

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
          image: user.image,
        },
      }
    } catch (error) {
      console.error("Registration error:", error)
      return { success: false, error: "Registration failed" }
    }
  }

  /**
   * Setup two-factor authentication for a user
   */
  static async setupTwoFactor(userId: string): Promise<TwoFactorSetupResult> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new Error("User not found")
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `KniitNon (${user.email})`,
      issuer: "KniitNon",
    })

    // Generate backup codes
    const backupCodes = Array.from({ length: 8 }, () => 
      crypto.randomBytes(4).toString("hex").toUpperCase()
    )

    // Store secret (temporarily, until user confirms)
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: secret.base32,
        backupCodes,
      },
    })

    return {
      secret: secret.base32!,
      qrCodeUrl: secret.otpauth_url!,
      backupCodes,
    }
  }

  /**
   * Enable two-factor authentication after verification
   */
  static async enableTwoFactor(userId: string, token: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user || !user.twoFactorSecret) {
      return false
    }

    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token,
      window: 2,
    })

    if (isValid) {
      await prisma.user.update({
        where: { id: userId },
        data: { twoFactorEnabled: true },
      })
      return true
    }

    return false
  }

  /**
   * Disable two-factor authentication
   */
  static async disableTwoFactor(userId: string, password: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user || !user.password) {
      return false
    }

    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return false
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        backupCodes: [],
      },
    })

    return true
  }

  /**
   * Verify two-factor authentication code
   */
  private static async verifyTwoFactorCode(userId: string, token: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user || !user.twoFactorSecret) {
      return false
    }

    // Check TOTP token
    const isValidTOTP = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token,
      window: 2,
    })

    if (isValidTOTP) {
      return true
    }

    // Check backup codes
    if (user.backupCodes.includes(token.toUpperCase())) {
      // Remove used backup code
      const updatedBackupCodes = user.backupCodes.filter(
        code => code !== token.toUpperCase()
      )
      await prisma.user.update({
        where: { id: userId },
        data: { backupCodes: updatedBackupCodes },
      })
      return true
    }

    return false
  }

  /**
   * Check rate limiting for login attempts
   */
  private static async checkRateLimit(email: string, ipAddress: string): Promise<boolean> {
    const since = new Date(Date.now() - this.LOCKOUT_DURATION)
    
    const recentFailures = await prisma.loginAttempt.count({
      where: {
        OR: [
          { email },
          { ipAddress },
        ],
        success: false,
        createdAt: { gte: since },
      },
    })

    return recentFailures >= this.MAX_LOGIN_ATTEMPTS
  }

  /**
   * Log login attempt
   */
  private static async logLoginAttempt(params: {
    userId?: string
    email?: string
    ipAddress: string
    userAgent: string
    success: boolean
    failureReason?: string
  }): Promise<void> {
    await prisma.loginAttempt.create({
      data: params,
    })
  }

  /**
   * Validate password strength
   */
  private static validatePassword(password: string): { isValid: boolean; message?: string } {
    if (password.length < 8) {
      return { isValid: false, message: "Password must be at least 8 characters long" }
    }

    if (!/(?=.*[a-z])/.test(password)) {
      return { isValid: false, message: "Password must contain at least one lowercase letter" }
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      return { isValid: false, message: "Password must contain at least one uppercase letter" }
    }

    if (!/(?=.*\d)/.test(password)) {
      return { isValid: false, message: "Password must contain at least one number" }
    }

    if (!/(?=.*[@$!%*?&])/.test(password)) {
      return { isValid: false, message: "Password must contain at least one special character (@$!%*?&)" }
    }

    return { isValid: true }
  }

  /**
   * Generate email verification token
   */
  private static async generateEmailVerificationToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(32).toString("hex")
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    await prisma.emailVerificationToken.create({
      data: {
        userId,
        token,
        expires,
      },
    })

    return token
  }

  /**
   * Generate password reset token
   */
  static async generatePasswordResetToken(email: string): Promise<string | null> {
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return null
    }

    const token = crypto.randomBytes(32).toString("hex")
    const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expires,
      },
    })

    return token
  }

  /**
   * Reset password using token
   */
  static async resetPassword(token: string, newPassword: string): Promise<boolean> {
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    })

    if (!resetToken || resetToken.used || resetToken.expires < new Date()) {
      return false
    }

    // Get the user separately
    const user = await prisma.user.findUnique({
      where: { id: resetToken.userId }
    })

    if (!user) {
      return false
    }

    const passwordValidation = this.validatePassword(newPassword)
    if (!passwordValidation.isValid) {
      return false
    }

    const hashedPassword = await bcrypt.hash(newPassword, this.SALT_ROUNDS)

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { password: hashedPassword },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      }),
    ])

    return true
  }

  /**
   * Verify email using token
   */
  static async verifyEmail(token: string): Promise<boolean> {
    const verificationToken = await prisma.emailVerificationToken.findUnique({
      where: { token },
    })

    if (!verificationToken || verificationToken.used || verificationToken.expires < new Date()) {
      return false
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: verificationToken.userId },
        data: { 
          isVerified: true,
          emailVerified: new Date(),
        },
      }),
      prisma.emailVerificationToken.update({
        where: { id: verificationToken.id },
        data: { used: true },
      }),
    ])

    return true
  }
}
