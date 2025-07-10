import { NextRequest, NextResponse } from "next/server"
import { AuthService } from "@/lib/services/auth-service-temp"

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, username, password, name } = body

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      )
    }

    const result = await AuthService.registerUser({
      email,
      username,
      password,
      name,
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Account created successfully",
        user: result.user,
      })
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}
