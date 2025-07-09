"use client";

import { useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { User, LogIn, LogOut, Github } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AuthModalProps {
  children?: React.ReactNode;
}

export function AuthModal({ children }: AuthModalProps) {
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);

  if (status === "loading") {
    return (
      <Button variant="outline" disabled>
        <div className="w-4 h-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
      </Button>
    );
  }

  if (session) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          {children || (
            <Button variant="outline" className="flex items-center gap-2">
              <Avatar className="w-6 h-6">
                <AvatarImage src={session.user?.image || ""} />
                <AvatarFallback>
                  {session.user?.name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline">{session.user?.name}</span>
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Account
            </DialogTitle>
            <DialogDescription>
              Manage your account settings and sign out.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <Avatar className="w-10 h-10">
                <AvatarImage src={session.user?.image || ""} />
                <AvatarFallback>
                  {session.user?.name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{session.user?.name}</p>
                <p className="text-sm text-gray-500">{session.user?.email}</p>
              </div>
            </div>
            <Button
              onClick={() => {
                signOut();
                setIsOpen(false);
              }}
              variant="outline"
              className="w-full flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" className="flex items-center gap-2">
            <LogIn className="w-4 h-4" />
            <span className="hidden sm:inline">Sign In</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogIn className="w-5 h-5" />
            Sign In
          </DialogTitle>
          <DialogDescription>
            Choose your preferred sign-in method to access your projects and save your work.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Button
            onClick={() => signIn("google")}
            variant="outline"
            className="w-full flex items-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>
          <Button
            onClick={() => signIn("github")}
            variant="outline"
            className="w-full flex items-center gap-2"
          >
            <Github className="w-4 h-4" />
            Continue with GitHub
          </Button>
        </div>
        <p className="text-xs text-gray-500 text-center mt-4">
          By signing in, you agree to our terms of service and privacy policy.
        </p>
      </DialogContent>
    </Dialog>
  );
}
