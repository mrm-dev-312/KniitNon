"use client"

import { useState } from "react"
import { AuthForm } from "@/components/auth/AuthForm"

export default function SignUpPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signup")

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <AuthForm mode={mode} onModeChange={setMode} />
    </div>
  )
}
