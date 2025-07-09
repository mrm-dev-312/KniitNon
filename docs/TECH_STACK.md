# Technical Stack & Architecture

## Core Framework & Backend
-   **Meta-Framework:** Next.js (App Router)
-   **Language:** TypeScript
-   **Database:** Vercel Postgres
-   **ORM:** Prisma

## Frontend & UI
-   **UI Components:** Shadcn/UI
-   **Styling:** Tailwind CSS
-   **Animation:** Framer Motion
-   **Data Visualization:** D3.js (integrated with React)

## AI & APIs
-   **AI Integration:** Vercel AI SDK
-   **API Handling:** Next.js API Routes for unified frontend/backend experience.

## Project Structure
-   API routes will be located in `app/api/`.
-   Reusable UI components will be in `app/components/`.
-   Prisma schema will be located at `prisma/schema.prisma`.
-   Core types and interfaces will be defined in a `types/` directory.

## Environment Variables
Create a `.env.local` file for the following keys:
-   `POSTGRES_URL`
-   `OPENAI_API_KEY` or equivalent for Gemini

## Containerization
-   **Docker:** Docker is used for creating a consistent development and production environment. Refer to the `Dockerfile` and `docker-compose.yml` files for configuration.
