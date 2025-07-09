# Project Task List (Revised MVP)

## Backend Setup (Core MVP)
-   [x] Review TASK.md against BRD.md and PRD.md to add any missing steps.
-   [x] Initialize Prisma and define schema for Nodes, Sources, and Conflicts.
-   [x] Create API route `/api/research/nodes` to fetch initial exploration data.
-   [x] **(CRITICAL)** Create API route `/api/research/outline` (POST) that accepts an array of node IDs and a detail level (`low`, `medium`, `high`) and returns dynamically structured outline content.
-   [x] Set up Gemini and OpenAI API integrations.

## Frontend Development (Core MVP)

### 1. Layout & Core Components
-   [x] Set up the main page layout: a primary panel for visualization and a sidebar for the outline builder.
-   [x] Implement the visualization canvas area (placeholder for D3.js integration).
-   [x] Create the `Outline Builder` component in the sidebar.
-   [x] Create the `Adjustable Detail Slider` component using Shadcn/UI.
-   [x] Create dedicated long-form text editor interface.
-   [x] Implement basic text formatting (bold, italics, headings) in editor.

### 2. State Management & Interactivity
-   [ ] Set up client-side state management (Zustand or React Query) for the outline's state (list of nodes, order).
-   [ ] Implement drag-and-drop functionality (React DnD) to move nodes from the visualization into the outline.
-   [ ] Implement selection functionality (checkbox on nodes) as an alternative to drag-and-drop.
-   [ ] Implement drag-and-drop reordering of items *within* the `Outline Builder`.
-   [ ] Connect the `Adjustable Detail Slider` state to the API call for the outline content. When the slider moves, re-fetch the outline with the new detail level.
-   [ ] Implement tools to indicate comparisons and relationships within the outline.

### 3. Features
-   [ ] Implement the "Clear Outline" button functionality.
-   [ ] Implement the "Export Outline" feature (initially to Markdown, then PDF/DOCX).

## Visualization (Core MVP)
-   [ ] Integrate D3.js with React for the main exploration graph.
-   [ ] Render nodes fetched from the backend API.
-   [ ] Ensure nodes in the visualization are interactive (clickable for details, draggable for outline).
-   [ ] Implement ability to import/add research nodes (text, links, images).
-   [ ] Implement basic search and filtering within the knowledge graph.
-   [ ] Implement LLM integration for pedagogical research (10,000-foot view).
-   [ ] Implement automatic suggestion and highlighting of connections between subtopics.
-   [ ] Implement generation of summaries for selected nodes/clusters.
-   [ ] Implement suggestion of related research topics.
-   [ ] Implement horizontal exploration across disciplinary lenses.
-   [ ] Implement highlighting of scholarly debate, conflicts, and unresolved questions in nodes.

## AI Writing Assistant (Core MVP)
-   [ ] Implement LLM-powered generation of draft content based on outline/knowledge graph.
-   [ ] Implement ability to expand, refine, or rephrase text sections using AI.
-   [ ] Implement Model Context Protocol (MCPs) for guiding LLM output.

## User Authentication & Project Management (Core MVP)
-   [ ] Integrate NextAuth.js with Google and/or GitHub OAuth providers.
-   [ ] Create a simple login/logout button and modal.
-   [ ] Update the Prisma schema to include `User` and `SavedPath` models.
-   [ ] Create API route `/api/user/save-path` (POST) to save an authenticated user's current outline configuration.
-   [ ] Create API route `/api/user/load-path` (GET) to retrieve a list of saved paths.
-   [ ] Create "My Saved Paths" button and UI to display and load saved research paths.

---

## Review Summary
*(This section will be filled out by the AI upon completion of a set of tasks, summarizing the changes made.)*

## Testing & Quality Assurance
-   [ ] Set up Jest/React Testing Library for component testing
-   [ ] Implement API route tests using Supertest
-   [ ] Create end-to-end tests with Cypress for critical user flows
-   [ ] Implement test coverage reporting

### API Security
- [ ] Implement rate limiting for all API routes
- [ ] Add request validation middleware using Zod
- [ ] Set up proper CORS configuration
- [ ] Implement API authentication checks

### Performance Optimization
- [ ] Implement virtualization for large node lists
- [ ] Add pagination for API responses with large datasets
- [ ] Optimize D3.js rendering for large graphs
- [ ] Set up performance monitoring

### Accessibility
- [ ] Ensure all interactive elements are keyboard accessible
- [ ] Add proper ARIA attributes to custom components
- [ ] Implement focus management for modal dialogs
- [ ] Test with screen readers

### Error Handling
- [ ] Implement error boundaries for React components
- [ ] Create consistent error states for API failures
- [ ] Add user-friendly error messages
- [ ] Implement toast notifications for system feedback

## DevOps
- [ ] Set up GitHub Actions for CI/CD
- [ ] Implement automated testing in the pipeline
- [ ] Configure deployment to Vercel
- [ ] Set up database migration automation

## Documentation
- [ ] Create API documentation with Swagger/OpenAPI
- [ ] Document component usage with Storybook
- [ ] Write developer setup guide
- [ ] Document database schema and relationships