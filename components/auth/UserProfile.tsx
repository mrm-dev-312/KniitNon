"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TwoFactorSetupDialog } from "@/components/auth/AuthForm"

export function UserProfile() {
  const { data: session, update } = useSession()
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false)
  const [show2FADisable, setShow2FADisable] = useState(false)
  const [disablePassword, setDisablePassword] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    if (session?.user) {
      setUser(session.user)
    }
  }, [session])

  const handleDisable2FA = async () => {
    if (!disablePassword) {
      setError("Please enter your password to disable 2FA")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: disablePassword }),
      })

      const result = await response.json()

      if (result.success) {
        setMessage("Two-factor authentication disabled successfully")
        setShow2FADisable(false)
        setDisablePassword("")
        // Update session to reflect the change
        await update()
      } else {
        setError(result.error || "Failed to disable 2FA")
      }
    } catch (error) {
      setError("Failed to disable 2FA")
    } finally {
      setIsLoading(false)
    }
  }

  if (!session) {
    return (
      <div className="max-w-2xl mx-auto mt-8 p-6">
        <p>Please sign in to view your profile.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto mt-8 p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">User Profile</h1>
        <p className="text-gray-600">Manage your account settings and security preferences.</p>
      </div>

      {message && (
        <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          {message}
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Your basic account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Name</Label>
              <div className="mt-1 text-sm text-gray-900">
                {user?.name || "Not provided"}
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <div className="mt-1 text-sm text-gray-900">
                {user?.email}
                {user?.isVerified && (
                  <Badge variant="secondary" className="ml-2">Verified</Badge>
                )}
              </div>
            </div>
          </div>
          
          {user?.username && (
            <div>
              <Label>Username</Label>
              <div className="mt-1 text-sm text-gray-900">{user.username}</div>
            </div>
          )}

          <div>
            <Label>Account Status</Label>
            <div className="mt-1">
              <Badge variant={user?.isActive ? "default" : "destructive"}>
                {user?.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Security Settings</CardTitle>
          <CardDescription>Manage your account security and two-factor authentication</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-medium">Two-Factor Authentication</h3>
              <p className="text-sm text-gray-500">
                Add an extra layer of security to your account
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {user?.twoFactorEnabled ? (
                <>
                  <Badge variant="default">Enabled</Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShow2FADisable(true)}
                  >
                    Disable
                  </Button>
                </>
              ) : (
                <>
                  <Badge variant="secondary">Disabled</Badge>
                  <Button
                    size="sm"
                    onClick={() => setShowTwoFactorSetup(true)}
                  >
                    Enable
                  </Button>
                </>
              )}
            </div>
          </div>

          {show2FADisable && (
            <div className="p-4 border rounded-lg bg-gray-50">
              <h4 className="font-medium mb-2">Disable Two-Factor Authentication</h4>
              <p className="text-sm text-gray-600 mb-3">
                Enter your password to confirm disabling 2FA:
              </p>
              <div className="space-y-3">
                <Input
                  type="password"
                  placeholder="Enter your password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                />
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleDisable2FA}
                    disabled={isLoading}
                  >
                    {isLoading ? "Disabling..." : "Disable 2FA"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShow2FADisable(false)
                      setDisablePassword("")
                      setError("")
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-medium">Login Activity</h3>
              <p className="text-sm text-gray-500">
                Monitor recent login attempts and activity
              </p>
            </div>
            <Button variant="outline" size="sm">
              View Activity
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Password Management */}
      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>Change your password</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline">Change Password</Button>
        </CardContent>
      </Card>

      {/* Two-Factor Setup Dialog */}
      <TwoFactorSetupDialog
        isOpen={showTwoFactorSetup}
        onClose={() => setShowTwoFactorSetup(false)}
        onComplete={async () => {
          setMessage("Two-factor authentication enabled successfully!")
          await update() // Refresh session
        }}
      />
    </div>
  )
}
