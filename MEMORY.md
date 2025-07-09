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
* 2025-07-09: Debugged and fixed the chat-to-dashboard workflow to ensure research nodes generated from chat persist and display in the dashboard.
* 2025-07-09: Enhanced localStorage persistence for generated research data with a 30-minute expiration using timestamps.
* 2025-07-09: Improved API data transformation logic to handle both `connections` and `children` fields.
* 2025-07-09: Added detailed debugging logs to VisualizationCanvas for data flow and timing.
* 2025-07-09: Created a comprehensive HTML test page (workflow-test.html) to simulate and verify the full workflow (API call, localStorage, dashboard load).
* 2025-07-09: Restarted the dev server and verified the fix: generated nodes now persist and display in the dashboard as intended.
* 2025-07-09: Documented all lessons learned in MEMORY.md and summarized the debugging/fix process in TASK.md.
