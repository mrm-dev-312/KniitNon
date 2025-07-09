import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { DragDropProvider } from "@/components/providers/DragDropProvider";

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
        <DragDropProvider>
          {children}
        </DragDropProvider>
      </body>
    </html>
  );
}
