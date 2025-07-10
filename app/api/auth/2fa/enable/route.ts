import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { AuthService } from "@/lib/services/auth-service-temp"

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Verification token is required" },
        { status: 400 }
      )
    }

    // Get user ID from session (we'll need to update session typing later)
    const userId = (session.user as any).id
    const success = await AuthService.enableTwoFactor(userId, token)

    if (success) {
      return NextResponse.json({
        success: true,
        message: "Two-factor authentication enabled successfully",
      })
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid verification code" },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error("2FA enable error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to enable 2FA" },
      { status: 500 }
    )
  }
}
