import { NextRequest, NextResponse } from "next/server"
import { AuthService } from "@/lib/services/auth-service-temp"

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      )
    }

    const token = await AuthService.generatePasswordResetToken(email)

    if (token) {
      // TODO: Send email with reset link
      // For now, we'll just return success
      // In production, you would send an email here
      console.log(`Password reset token for ${email}: ${token}`)
      
      return NextResponse.json({
        success: true,
        message: "If an account with that email exists, a password reset link has been sent.",
      })
    } else {
      // Don't reveal whether the email exists or not for security
      return NextResponse.json({
        success: true,
        message: "If an account with that email exists, a password reset link has been sent.",
      })
    }
  } catch (error) {
    console.error("Password reset error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to process password reset request" },
      { status: 500 }
    )
  }
}
