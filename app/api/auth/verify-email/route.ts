import { NextRequest, NextResponse } from "next/server"
import { AuthService } from "@/lib/services/auth-service-temp"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Verification token is required" },
        { status: 400 }
      )
    }

    const success = await AuthService.verifyEmail(token)

    if (success) {
      return NextResponse.json({
        success: true,
        message: "Email verified successfully",
      })
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid or expired verification token" },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error("Email verification error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to verify email" },
      { status: 500 }
    )
  }
}
