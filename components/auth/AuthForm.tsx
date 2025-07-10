import { useState } from "react"
import Link from "next/link"
import { signIn, getSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface AuthFormProps {
  mode: "signin" | "signup"
  onModeChange: (mode: "signin" | "signup") => void
}

export function AuthForm({ mode, onModeChange }: AuthFormProps) {
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    name: "",
    rememberMe: false,
  })
  const [twoFactorCode, setTwoFactorCode] = useState("")
  const [showTwoFactor, setShowTwoFactor] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      if (mode === "signup") {
        // Register new user
        if (formData.password !== formData.confirmPassword) {
          setError("Passwords do not match")
          return
        }

        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: formData.email,
            username: formData.username || undefined,
            password: formData.password,
            name: formData.name || undefined,
          }),
        })

        const result = await response.json()

        if (result.success) {
          // Auto sign in after registration
          const signInResult = await signIn("credentials", {
            identifier: formData.email,
            password: formData.password,
            redirect: false,
          })

          if (signInResult?.ok) {
            router.push("/dashboard")
          } else {
            setError("Registration successful but sign in failed. Please try signing in.")
            onModeChange("signin")
          }
        } else {
          setError(result.error || "Registration failed")
        }
      } else {
        // Sign in existing user
        const identifier = formData.email || formData.username
        const signInResult = await signIn("credentials", {
          identifier,
          password: formData.password,
          twoFactorCode: showTwoFactor ? twoFactorCode : undefined,
          redirect: false,
        })

        if (signInResult?.ok) {
          router.push("/dashboard")
        } else if (signInResult?.error === "Two-factor authentication code required") {
          setShowTwoFactor(true)
          setError("Please enter your two-factor authentication code")
        } else {
          setError(signInResult?.error || "Invalid credentials")
        }
      }
    } catch (error) {
      console.error("Auth error:", error)
      setError("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleOAuthSignIn = async (provider: "google" | "github") => {
    setIsLoading(true)
    try {
      await signIn(provider, { callbackUrl: "/dashboard" })
    } catch (error) {
      console.error("OAuth error:", error)
      setError("OAuth sign in failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {mode === "signin" ? "Sign In" : "Create Account"}
        </h1>
        <p className="text-gray-600 mt-2">
          {mode === "signin" 
            ? "Welcome back! Please sign in to your account."
            : "Join us today! Create your account to get started."
          }
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "signup" && (
          <div>
            <Label htmlFor="name">Full Name (optional)</Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter your full name"
            />
          </div>
        )}

        <div>
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="Enter your email"
          />
        </div>

        {mode === "signup" && (
          <div>
            <Label htmlFor="username">Username (optional)</Label>
            <Input
              id="username"
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="Choose a username"
            />
          </div>
        )}

        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="Enter your password"
          />
          {mode === "signup" && (
            <p className="text-xs text-gray-500 mt-1">
              Password must be at least 8 characters with uppercase, lowercase, number, and special character
            </p>
          )}
        </div>

        {mode === "signup" && (
          <div>
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              required
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              placeholder="Confirm your password"
            />
          </div>
        )}

        {showTwoFactor && (
          <div>
            <Label htmlFor="twoFactorCode">Two-Factor Authentication Code</Label>
            <Input
              id="twoFactorCode"
              type="text"
              required
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value)}
              placeholder="Enter 6-digit code"
              maxLength={6}
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the code from your authenticator app or use a backup code
            </p>
          </div>
        )}

        {mode === "signin" && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="rememberMe"
                checked={formData.rememberMe}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, rememberMe: checked as boolean })
                }
              />
              <Label htmlFor="rememberMe" className="text-sm">
                Remember me
              </Label>
            </div>
            <Link href="/auth/forgot-password" className="text-sm text-blue-600 hover:underline">
              Forgot password?
            </Link>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Loading..." : mode === "signin" ? "Sign In" : "Create Account"}
        </Button>
      </form>

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or continue with</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOAuthSignIn("google")}
            disabled={isLoading}
            className="w-full"
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOAuthSignIn("github")}
            disabled={isLoading}
            className="w-full"
          >
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            GitHub
          </Button>
        </div>
      </div>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          {mode === "signin" ? "Don't have an account?" : "Already have an account?"}
          {" "}
          <button
            type="button"
            onClick={() => onModeChange(mode === "signin" ? "signup" : "signin")}
            className="text-blue-600 hover:underline font-medium"
          >
            {mode === "signin" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  )
}

// Two-Factor Setup Dialog Component
export function TwoFactorSetupDialog({ 
  isOpen, 
  onClose, 
  onComplete 
}: { 
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}) {
  const [step, setStep] = useState<"setup" | "verify">("setup")
  const [qrCode, setQrCode] = useState("")
  const [secret, setSecret] = useState("")
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [verificationCode, setVerificationCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const setupTwoFactor = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/auth/2fa/setup", {
        method: "POST",
      })
      const data = await response.json()
      
      if (data.success) {
        setQrCode(data.qrCodeUrl)
        setSecret(data.secret)
        setBackupCodes(data.backupCodes)
        setStep("verify")
      } else {
        setError(data.error || "Failed to setup 2FA")
      }
    } catch (error) {
      setError("Failed to setup 2FA")
    } finally {
      setIsLoading(false)
    }
  }

  const verifyAndEnable = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/auth/2fa/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: verificationCode }),
      })
      const data = await response.json()
      
      if (data.success) {
        onComplete()
        onClose()
      } else {
        setError(data.error || "Invalid verification code")
      }
    } catch (error) {
      setError("Failed to enable 2FA")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Setup Two-Factor Authentication</DialogTitle>
        </DialogHeader>
        
        {error && (
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded mb-4">
            {error}
          </div>
        )}

        {step === "setup" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Two-factor authentication adds an extra layer of security to your account.
            </p>
            <Button onClick={setupTwoFactor} disabled={isLoading} className="w-full">
              {isLoading ? "Setting up..." : "Setup 2FA"}
            </Button>
          </div>
        )}

        {step === "verify" && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">
                1. Scan this QR code with your authenticator app:
              </p>
              {qrCode && (
                <div className="flex justify-center">
                  <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                </div>
              )}
            </div>
            
            <div>
              <p className="text-sm text-gray-600 mb-2">
                2. Or manually enter this secret:
              </p>
              <code className="text-xs bg-gray-100 p-2 rounded block break-all">
                {secret}
              </code>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-2">
                3. Save these backup codes in a safe place:
              </p>
              <div className="bg-gray-100 p-3 rounded text-xs">
                {backupCodes.map((code, index) => (
                  <div key={index} className="font-mono">{code}</div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="verificationCode">
                4. Enter verification code from your app:
              </Label>
              <Input
                id="verificationCode"
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Enter 6-digit code"
                maxLength={6}
              />
            </div>

            <Button 
              onClick={verifyAndEnable} 
              disabled={isLoading || verificationCode.length !== 6}
              className="w-full"
            >
              {isLoading ? "Verifying..." : "Enable 2FA"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
