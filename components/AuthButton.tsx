"use client"

import { signIn, signOut, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu"
import { LogIn, LogOut, User, Settings, Shield } from "lucide-react"

export function AuthButton() {
  const { data: session, status } = useSession()
  const router = useRouter()

  if (status === "loading") {
    return (
      <Button variant="outline" disabled>
        <User className="w-4 h-4 mr-2" />
        Loading...
      </Button>
    )
  }

  if (session?.user) {
    const user = session.user as any // Extended user type
    
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            {user.name || user.email || "User"}
            {user.twoFactorEnabled && (
              <Badge variant="secondary" className="ml-1 text-xs">
                2FA
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5 text-sm text-muted-foreground">
            Signed in as
          </div>
          <div className="px-2 py-1.5 text-sm font-medium">
            {user.email}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push("/profile")}>
            <Settings className="w-4 h-4 mr-2" />
            Profile Settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/dashboard")}>
            <User className="w-4 h-4 mr-2" />
            Dashboard
          </DropdownMenuItem>
          {user.twoFactorEnabled && (
            <DropdownMenuItem>
              <Shield className="w-4 h-4 mr-2" />
              Security
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => signOut()}
            className="text-red-600 focus:text-red-600"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={() => router.push("/auth/signin")}
        variant="outline" 
        className="flex items-center gap-2"
      >
        <LogIn className="w-4 h-4" />
        Sign In
      </Button>
      <Button
        onClick={() => router.push("/auth/signup")}
        className="flex items-center gap-2"
      >
        <User className="w-4 h-4" />
        Sign Up
      </Button>
    </div>
  )
}
