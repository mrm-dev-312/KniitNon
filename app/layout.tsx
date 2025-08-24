import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { DragDropProvider } from "@/components/providers/DragDropProvider";
import { ChatProvider } from "@/lib/contexts/ChatContext";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { ToastProvider } from "@/components/shared/ToastProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "KniitNon",
  description: "Built with an AI-First Functional Scaffold",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <ErrorBoundary>
          <ToastProvider>
            <AuthProvider>
              <ChatProvider>
                <DragDropProvider>
                  {children}
                </DragDropProvider>
              </ChatProvider>
            </AuthProvider>
          </ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
