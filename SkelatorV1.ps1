# Skelator.ps1: AI-First Next.js Functional Scaffold
# This script builds a complete, runnable full-stack application.
# It uses the optimal stack for AI-assisted development: Next.js, Prisma, Shadcn/UI, and the Vercel AI SDK.

# 1. Defines the parameters the script accepts.
param (
    [Parameter(Mandatory=$true)]
    [string]$ProjectName
)

# --- Configuration ---
$DbName = $ProjectName.ToLower()
# --- End Configuration ---

Write-Host "🚀 Creating new AI-First project: $ProjectName"

# 2. Create Directory Structure
New-Item -ItemType Directory -Path $ProjectName -Force | Out-Null
Set-Location -Path $ProjectName

Write-Host "    - Creating folder structure..."
New-Item -ItemType Directory -Path "app/(dashboard)", "app/api/chat", "components/ai", "components/ui", "lib", "prisma/migrations" -Force | Out-Null

# 3. Create and Populate Files
Write-Host "📄 Creating project configuration files..."

# --- ROOT FILES ---

# .gitignore
$gitignoreContent = @"
# See https://help.github.com/articles/ignoring-files/ for more about ignoring files.

# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env.local
.env.development.local
.env.test.local
.env.production.local

# vercel
.vercel
"@
Set-Content -Path ".gitignore" -Value $gitignoreContent

# .env.example
$envExampleContent = @"
# This file is an example. Create a .env.local file and add your actual secrets.

# Database
# Use the connection string from your Vercel Postgres database.
POSTGRES_PRISMA_URL=""
POSTGRES_URL_NON_POOLING=""

# AI Provider (Example for OpenAI, adapt for Gemini/Claude etc.)
# You can get your key from https://platform.openai.com/account/api-keys
OPENAI_API_KEY=""

# NextAuth.js (if you add authentication)
# You can generate a secret with `openssl rand -base64 32`
# AUTH_SECRET=""
"@
Set-Content -Path ".env.example" -Value $envExampleContent

# package.json
$packageJsonContent = @"
{
  "name": "$($ProjectName.ToLower())",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "postinstall": "prisma generate"
  },
  "dependencies": {
    "@prisma/client": "^5.15.0",
    "@radix-ui/react-slot": "^1.0.2",
    "@vercel/ai": "^3.1.26",
    "ai": "^3.1.26",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "framer-motion": "^11.2.10",
    "lucide-react": "^0.394.0",
    "next": "14.2.3",
    "react": "^18",
    "react-dom": "^18",
    "tailwind-merge": "^2.3.0",
    "tailwindcss-animate": "^1.0.7"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "eslint": "^8",
    "eslint-config-next": "14.2.3",
    "postcss": "^8",
    "prisma": "^5.15.0",
    "tailwindcss": "^3.4.1",
    "typescript": "^5"
  }
}
"@
Set-Content -Path "package.json" -Value $packageJsonContent

# next.config.mjs
$nextConfigContent = @"
/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
"@
Set-Content -Path "next.config.mjs" -Value $nextConfigContent

# tailwind.config.ts
$tailwindConfigContent = @"
import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
	],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
"@
Set-Content -Path "tailwind.config.ts" -Value $tailwindConfigContent

# postcss.config.js
Set-Content -Path "postcss.config.js" -Value "module.exports = {`n  plugins: {`n    tailwindcss: {},`n    autoprefixer: {},`n  },`n}"

# --- PRISMA ---
Write-Host "    - Configuring Prisma schema and database connection..."

# prisma/schema.prisma
$prismaSchemaContent = @"
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("POSTGRES_PRISMA_URL") // uses connection pooling
  directUrl = env("POSTGRES_URL_NON_POOLING") // uses a direct connection
}

model User {
  id        String    @id @default(cuid())
  email     String    @unique
  name      String?
  createdAt DateTime  @default(now())
  messages  Message[]
}

model Message {
  id        String   @id @default(cuid())
  content   String
  role      String // "user" or "assistant"
  createdAt DateTime @default(now())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
}
"@
Set-Content -Path "prisma/schema.prisma" -Value $prismaSchemaContent

# --- LIB ---
Write-Host "    - Setting up library files..."

# lib/db.ts
$libDbContent = @"
import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  return new PrismaClient()
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prisma ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma
"@
Set-Content -Path "lib/db.ts" -Value $libDbContent

# --- APP ---
Write-Host "    - Building application routes and UI..."

# app/layout.tsx
$appLayoutContent = @"
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "$ProjectName",
  description: "Built with an AI-First Functional Scaffold",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
"@
Set-Content -Path "app/layout.tsx" -Value $appLayoutContent

# app/globals.css
$globalsCssContent = @"
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
"@
Set-Content -Path "app/globals.css" -Value $globalsCssContent

# app/page.tsx
$appPageContent = @"
import { Chat } from '@/components/ai/chat';

export default function Home() {
  return (
    <div className=`"flex min-h-screen flex-col items-center justify-center`">
      <div className=`"w-full max-w-2xl`">
        <h1 className=`"text-4xl font-bold text-center mb-4`">$ProjectName</h1>
        <p className=`"text-center text-muted-foreground mb-8`">
          This is a functional, full-stack chat application scaffold.
        </p>
        <Chat />
      </div>
    </div>
  );
}
"@
Set-Content -Path "app/page.tsx" -Value $appPageContent

# app/api/chat/route.ts
$apiChatRouteContent = @"
import { OpenAIStream, StreamingTextResponse } from 'ai';
import OpenAI from 'openai';

// IMPORTANT! Set the runtime to edge
export const runtime = 'edge';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  // Extract the `messages` from the body of the request
  const { messages } = await req.json();

  // Request the OpenAI API for the response based on the prompt
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    stream: true,
    messages: messages,
  });

  // Convert the response into a friendly text-stream
  const stream = OpenAIStream(response);

  // Respond with the stream
  return new StreamingTextResponse(stream);
}
"@
Set-Content -Path "app/api/chat/route.ts" -Value $apiChatRouteContent


# --- COMPONENTS ---
Write-Host "    - Creating foundational UI and AI components..."

# components/ui/button.tsx (Shadcn UI Recipe)
$buttonComponentContent = @"
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
"@
Set-Content -Path "components/ui/button.tsx" -Value $buttonComponentContent

# lib/utils.ts (Required for Shadcn UI)
Set-Content -Path "lib/utils.ts" -Value "import { type ClassValue, clsx } from `"clsx`"`nimport { twMerge } from `"tailwind-merge`"`n`nexport function cn(...inputs: ClassValue[]) {`n  return twMerge(clsx(inputs))`n}"

# components/ai/chat.tsx
$chatComponentContent = @"
'use client';

import { useChat } from 'ai/react';
import { Button } from '@/components/ui/button';

export function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat();

  return (
    <div className=`"flex flex-col w-full max-w-2xl mx-auto stretch border rounded-lg shadow-xl`">
      <div className=`"flex-grow p-6 overflow-y-auto`">
        {messages.length > 0
          ? messages.map(m => (
              <div key={m.id} className=`"whitespace-pre-wrap mb-4`">
                <span className={m.role === 'user' ? 'font-bold' : 'font-semibold text-primary'}>
                  {m.role === 'user' ? 'User: ' : 'AI: '}
                </span>
                {m.content}
              </div>
            ))
          : <div className=`"text-center text-muted-foreground`">Start the conversation...</div>}
      </div>

      <form onSubmit={handleSubmit} className=`"p-4 border-t`">
        <div className=`"flex items-center`">
          <input
            className=`"flex-grow w-full p-2 border rounded-md bg-secondary text-foreground`"
            value={input}
            placeholder=`"Say something...`"
            onChange={handleInputChange}
          />
          <Button type=`"submit`" className=`"ml-4`">Send</Button>
        </div>
      </form>
    </div>
  );
}
"@
Set-Content -Path "components/ai/chat.tsx" -Value $chatComponentContent

# --- DOCUMENTATION ---
Write-Host "    - Creating documentation templates for AI context..."

# README.md
Set-Content -Path "README.md" -Value "# $ProjectName`n`nProject overview and setup instructions."

# BRD.md, PRD.md, MEMORY.md, TASK.md
Set-Content -Path "BRD.md" -Value "# Business Requirements: $ProjectName`n## 1. Vision and Goal`n* Problem: What problem are we solving?`n* Vision: What is the high-level vision for this product?`n* Success Metrics: How do we measure success?"
Set-Content -Path "PRD.md" -Value "# Product Requirements: $ProjectName`n## Feature 1: [Name of First Feature, e.g., User Authentication]`n* User Story: As a [user type], I want to [action] so that [benefit].`n* Acceptance Criteria:`n    * [ ] Criterion 1`n    * [ ] Criterion 2"
Set-Content -Path "MEMORY.md" -Value "# Project Memory and Decisions Log: $ProjectName`n## Architectural Decisions`n* $(Get-Date -Format 'yyyy-MM-dd'): Initial project setup using the optimal AI-First Next.js stack."
Set-Content -Path "TASK.md" -Value "# Current Development Task`n## Objective`nSet up the initial database schema and create the first API endpoint."

# gemini.md
$aiGuidanceContent = @"
# Gemini CLI Project Guidance
This document provides the mandatory operational instructions for the Gemini CLI. Adherence is required to ensure quality and efficiency.

## 1. Core Principles
- **Methodical Execution:** Follow the workflow step-by-step. No shortcuts.
- **Simplicity & Focus:** Implement the most direct and efficient solution that meets the requirements.
- **Foundation First:** Always verify config, dependencies, and the database before debugging application code.
- **Document as You Go:** Keep `TASK.md` and `MEMORY.md` continuously updated.
- **Automate Validation:** Use tests and linters to verify all changes before marking a task as complete.

## 2. Development Workflow
1.  **Analyze:** Thoroughly review project requirements (e.g., `PRD.md`).
2.  **Plan:** Create a detailed, sequential task list in `TASK.md`.
3.  **Verify:** Await plan approval before writing any code.
4.  **Execute:** Complete tasks one by one, updating `TASK.md` as you go.
5.  **Log:** Add a brief entry to `MEMORY.md` after each session or significant change.

## 3. Technical Best Practices
### Foundation-First Debugging
Always check in this order before debugging code:

1.  **Configuration:** `.env.local` variables, `next.config.mjs`.
2.  **Dependencies:** Run `npm install`; verify `package.json` and imports.
3.  **Database:** Check Vercel Postgres status and ensure `prisma/schema.prisma` aligns with the database state.

### Code & Database Rules
- **Style:** Format and lint all code (`npm run lint`) before completing any task.
- **Testing:** Run all relevant tests after every change.
- **Migrations:** Use `npx prisma migrate dev --name <descriptive-name>` for all schema changes. Test migrations on a clean database and have a documented rollback plan.
- **Security:** Regularly check for vulnerabilities (`npm audit`) and outdated dependencies.

## 4. Quality Gates Checklist
A task is not complete until every one of these checks has passed:

- [ ] All relevant tests pass.
- [ ] No TypeScript or ESLint errors.
- [ ] Code is formatted (`prettier --write .`) and linted (`npm run lint`).
- [ ] Database schema matches model definitions.
- [ ] Migrations can upgrade and downgrade cleanly on a test database.
- [ ] All new functions, components, and modules have clear JSDoc comments.
- [ ] Project documentation (`README.md`, etc.) is updated with any changes.
- [ ] Robust error handling is implemented for all new code paths.
"@
Set-Content -Path "gemini.md" -Value $aiGuidanceContent

# --- Final Instructions ---
Write-Host ""
Write-Host "✅ Success! Project '$ProjectName' is ready." -ForegroundColor Green
Write-Host ""
Write-Host "--- CRITICAL NEXT STEPS ---"
Write-Host "1. cd $ProjectName"
Write-Host "2. Run 'npm install' to install all dependencies."
Write-Host "3. Create a '.env.local' file: Copy-Item .env.example .env.local"
Write-Host "4. Edit '.env.local' and add your actual database URL and AI provider API key."
Write-Host "5. Run 'npx prisma migrate dev --name init' to create your database schema."
Write-Host "6. Run 'npm run dev' to start the development server."
Write-Host "7. Open http://localhost:3000 in your browser."
