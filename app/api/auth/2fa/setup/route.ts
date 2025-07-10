import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { AuthService } from "@/lib/services/auth-service-temp"
import QRCode from "qrcode"

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

    // Get user ID from session (we'll need to update session typing later)
    const userId = (session.user as any).id
    const result = await AuthService.setupTwoFactor(userId)

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(result.qrCodeUrl)

    return NextResponse.json({
      success: true,
      qrCodeUrl: qrCodeDataUrl,
      secret: result.secret,
      backupCodes: result.backupCodes,
    })
  } catch (error) {
    console.error("2FA setup error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to setup 2FA" },
      { status: 500 }
    )
  }
}
