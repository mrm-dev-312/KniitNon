# Product Requirements: AI-Powered Visual Research Platform

## Project Overview

Develop an interactive, AI-powered visual research platform designed for PhD and postdoctoral researchers. The MVP focuses on a one-shot exploration flow where users can dynamically build and refine a structured outline from visual data.

## Core Features (MVP)

### 1. Multi-dimensional Exploration
-   **Horizontal Exploration:** Allow exploration across multiple disciplinary lenses (e.g., economics, literature).
-   **Vertical Exploration:** Implement tiered research depth within visualization nodes, allowing users to drill down into more specific concepts.

### 2. Interactive Outline Builder
-   **Drag-and-Drop / Checkbox Collection:** Users can drag nodes from the visualization canvas or click a checkbox to add them to a structured outline in a dedicated sidebar.
-   **Interactive Editing:** The outline is fully editable, allowing users to rearrange, edit, or remove items via drag-and-drop directly within the sidebar.
-   **Export Functionality:** Users can export the final, user-structured outline into multiple formats (PDF, DOCX, Markdown).

### 3. Adjustable Information Depth Control
-   **Dynamic Detail Slider:** An intuitive slider/knob allows users to dynamically adjust the information density and academic rigor of their entire outline in real-time.
-   **Defined Rigor Levels:**
    -   **Low:** Concise overviews, key terms, and foundational summaries.
    -   **Medium:** Thematic surveys, systematic reviews, and comparative analysis.
    -   **High:** Rich academic depth, peer-reviewed sources, theoretical debates, and full research discussions.

### 4. Conflict, Tension, and Uncertainty Exploration
-   Visualization nodes will explicitly highlight areas of scholarly debate, theoretical conflicts, and unresolved research questions to encourage critical engagement.

## Revised MVP User Workflow

1.  **Entry & Exploration:** A user enters a topic (e.g., "Manifest Destiny") and can optionally select a disciplinary lens to begin their exploration.
2.  **Interactive Exploration:** The user navigates the visualization canvas, clicking on nodes to explore thematic details.
3.  **Collection into Outline:** The user drags desired nodes (or uses checkboxes) into the sidebar's outline-builder area. The nodes dynamically form a structured, hierarchical outline.
4.  **Refinement & Adjustment:** The user rearranges the outline and uses the **Adjustable Detail Slider** to instantly recalibrate the complexity, source rigor, and level of detail across the entire outline.
5.  **Review & Export:** Once satisfied, the user exports their custom-structured research outline to a portable format (PDF, DOCX, etc.).

## MVP Scope

| Capability | Included in Core MVP | Notes |
| :--- | :--- | :--- |
| One-shot interactive exploration | ✅ **Yes** | Primary user flow. |
| Interactive drag-and-drop outline | ✅ **Yes** | Core feature with a dedicated sidebar. |
| Adjustable detail slider | ✅ **Yes** | Controls the rigor/detail of the outline. |
| Login & saved paths | 🚩 **Stretch Goal** | Optional feature using NextAuth.js. |

## Success Criteria
-   Users can seamlessly collect information from the visualization into the outline builder.
-   The adjustable detail slider provides immediate and noticeable changes to the outline's content.
-   The exported outline is well-structured and accurately reflects the user's selections and detail level.
-   AI recommendations and node content remain academically rigorous.
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