import { NextRequest, NextResponse } from "next/server"
import { AuthService } from "@/lib/services/auth-service-temp"

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, password } = body

    if (!token || !password) {
      return NextResponse.json(
        { success: false, error: "Token and password are required" },
        { status: 400 }
      )
    }

    const success = await AuthService.resetPassword(token, password)

    if (success) {
      return NextResponse.json({
        success: true,
        message: "Password reset successfully",
      })
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid or expired reset token" },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error("Password reset error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to reset password" },
      { status: 500 }
    )
  }
}
