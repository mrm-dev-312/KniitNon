# Project Memory and Decisions Log: KniitNon
## Architectural Decisions
* 2025-07-08: Initial project setup using the optimal AI-First Next.js stack.
* 2025-07-08: Added Docker support for consistent development and production environments.
## Task Management
* 2025-07-08: Reviewed and updated TASK.md based on BRD.md and PRD.md.
* 2025-07-08: Confirmed Prisma schema for Nodes, Sources, and Conflicts is already defined.
* 2025-07-08: Created placeholder API route for `/api/research/nodes`.
* 2025-07-08: Created placeholder API route for `/api/research/outline` (POST).
* 2025-07-08: Configured `app/api/chat/route.ts` to support both OpenAI and Gemini API integrations.
* 2025-07-08: Identified lack of automated tests and added a task to set up a testing framework.
* 2025-07-08: Implemented basic two-column layout for main page.
* 2025-07-08: Prepared visualization canvas area for D3.js integration.
* 2025-07-08: Created and integrated `OutlineBuilder` component.
## Lessons Learned
* 2025-07-09: Debugging revealed that VisualizationCanvas was clearing localStorage immediately after loading, causing fallback to default/example nodes.
* 2025-07-09: Enhanced localStorage persistence by adding a timestamp and keeping generated data for 30 minutes.
* 2025-07-09: Improved API data transformation logic to ensure consistency (`children` → `connections`).
* 2025-07-09: Added detailed debugging logs to trace data flow and timing.
* 2025-07-09: Created a comprehensive HTML test page to simulate and verify the full workflow.
* 2025-07-09: Restarted the dev server and verified the fix works: generated nodes now persist and display in the dashboard as intended.
## Debugging and Fixes

* 2025-07-10: Fixed Docker Build Architecture Failure by resolving client/server component mismatch in Next.js App Router.

* 2025-07-10: Fixed D3.js Depth Limitation by enhancing API and visualization logic to support unlimited depth progression.

* 2025-07-10: Fixed API Detail Level Integration by ensuring API endpoints respect `detailLevel` query parameter.

* 2025-07-10: Fixed D3.js Node Pinning by adding functionality to pin nodes in the D3 graph.

* 2025-07-10: Improved Jest/Cypress Type Conflicts by resolving TypeScript parsing errors in Jest configuration.

## Critical Architecture Lessons Learned (July 2025)

* 2025-07-10: **CRITICAL**: Discovered Docker build failures due to client/server component architecture mismatch

  * Issue: Next.js attempting static generation on client-heavy components causes `clientModules` error

  * Root cause: Heavy use of 'use client' directives throughout app conflicts with static generation

  * Impact: Docker builds fail at "Generating static pages" phase, preventing production deployment

  * Solution: Requires hybrid architecture with strategic server/client component separation

  * `dynamic = 'force-dynamic'` exports must come AFTER imports but BEFORE component definition

  * Client components should be "islands" within server components for optimal performance

  * Static generation incompatible with client-heavy applications without proper configuration

  * Server Actions provide better pattern for data operations than client-side API calls

  * Project naming inconsistency (aipodcastgen vs kniitnon) needs resolution

  * Environment variables must disable static optimization for client-heavy apps

  * Dockerfile needs development/production environment handling for Next.js builds

  * Container architecture should support standalone output mode

  * Project marked as "production-ready" but Docker builds failing = NOT truly production-ready

  * Architecture refactoring required before genuine production deployment

  * Need systematic server/client component boundary documentation

  * Performance optimization requires data fetching migration to server components.
