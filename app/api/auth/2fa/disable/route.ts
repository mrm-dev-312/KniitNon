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
    const { password } = body

    if (!password) {
      return NextResponse.json(
        { success: false, error: "Password is required to disable 2FA" },
        { status: 400 }
      )
    }

    const userId = (session.user as any).id
    const success = await AuthService.disableTwoFactor(userId, password)

    if (success) {
      return NextResponse.json({
        success: true,
        message: "Two-factor authentication disabled successfully",
      })
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid password" },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error("2FA disable error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to disable 2FA" },
      { status: 500 }
    )
  }
}
