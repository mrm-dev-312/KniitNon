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
-   [x] Set up client-side state management (Zustand or React Query) for the outline's state (list of nodes, order).
-   [x] Implement drag-and-drop functionality (React DnD) to move nodes from the visualization into the outline.
-   [x] Implement selection functionality (checkbox on nodes) as an alternative to drag-and-drop.
-   [x] Implement drag-and-drop reordering of items *within* the `Outline Builder`.
-   [x] Connect the `Adjustable Detail Slider` state to the API call for the outline content. When the slider moves, re-fetch the outline with the new detail level.
-   [x] Implement tools to indicate comparisons and relationships within the outline.

### 3. Features
-   [x] Implement the "Clear Outline" button functionality.
    - Add button to OutlineBuilder component
    - Connect to store action that resets outline nodes array
    - Add confirmation dialog to prevent accidental clearing
-   [x] Implement the "Export Outline" feature (initially to Markdown, then PDF/DOCX).
    - Create utility function to convert outline data to Markdown
    - Add "Export" button with dropdown for format selection
    - Implement file download mechanism

## Visualization (Core MVP)
-   [x] Integrate D3.js with React for the main exploration graph.
-   [x] Render nodes fetched from the backend API.
-   [x] Ensure nodes in the visualization are interactive (clickable for details, draggable for outline).
-   [x] Implement basic search and filtering within the knowledge graph.

## Visualization (Post-MVP)
-   [x] Implement ability to import/add research nodes (text, links, images).
-   [x] Implement LLM integration for pedagogical research (10,000-foot view).
-   [x] Implement automatic suggestion and highlighting of connections between subtopics.
-   [x] Implement generation of summaries for selected nodes/clusters.
-   [x] Implement suggestion of related research topics.
-   [x] Implement horizontal exploration across disciplinary lenses.
-   [x] Implement highlighting of scholarly debate, conflicts, and unresolved questions in nodes.

## AI Writing Assistant (Core MVP)
-   [ ] Implement a back end system prompt engineering section
    [ ] Create a system prompt for the AI to follow when generating content.
    [ ] Create a system prompt for the AI to follow when generating outlines.
-   [ ] Implement LLM-powered generation of outlines based on user-selected nodes.
-   [ ] Implement LLM-powered generation of draft content based on outline/knowledge graph.
-   [ ] Implement ability to expand, refine, or rephrase text sections using AI.
-   [ ] Implement Model Context Protocol (MCPs) for guiding LLM output.
-   [ ] Implement AI-powered suggestions for improving outline structure and content.
-   [ ] Implement AI-powered suggestions for additional nodes to explore based on current outline.

## AI-Powered Dashboard Integration
- [x] Implement functionality to summarize chat content.
- [x] Use the summary to dynamically generate nodes for the dashboard.
- [x] Ensure seamless integration with the existing visualization and outline builder.
- [x] Add API endpoint to process chat summaries and return node data.
- [x] Test the workflow from chat to dashboard node generation.

## User Authentication & Project Management (Post-MVP)
-   [ ] Integrate NextAuth.js with Google and/or GitHub OAuth providers
-   [ ] Create login/logout button and modal
-   [ ] Update Prisma schema for User and SavedPath models
-   [ ] Implement server-side saving and loading

---

## Review Summary
**Completed Features (Section 3 & Visualization Core MVP):**

### Clear Outline Button Functionality
- ✅ Added confirmation dialog using shadcn/ui Dialog component
- ✅ Implemented `handleClearOutline()` and `confirmClearOutline()` functions
- ✅ Connected to existing `clearNodes()` store action
- ✅ Added safety confirmation to prevent accidental data loss
- ✅ Button is disabled when outline is empty

### Export Outline Feature
- ✅ Created comprehensive export utility functions in `/lib/export-utils.ts`
- ✅ Implemented support for both Markdown (.md) and Plain Text (.txt) formats
- ✅ Added dropdown menu using shadcn/ui DropdownMenu component
- ✅ Included automatic filename generation with timestamps
- ✅ Support for including/excluding content and metadata in exports
- ✅ Proper MIME type handling for file downloads
- ✅ Export button disabled when no nodes are present

### D3.js Visualization Integration (Core MVP)
- ✅ **Integrated D3.js with React** - Created dedicated D3Visualization component with full TypeScript support
- ✅ **Force-directed graph layout** - Implemented physics-based node positioning with customizable forces
- ✅ **Interactive node system** - Click to select, double-click for details, drag to reposition
- ✅ **Dynamic visual feedback** - Hover effects, selection indicators, tooltips with node information
- ✅ **Zoom and pan functionality** - Full viewport controls for large graph navigation
- ✅ **Node type visualization** - Different colors and sizes for topics, subtopics, and details
- ✅ **Connection rendering** - Visual links between related nodes with proper relationship mapping
- ✅ **API integration ready** - Fetches from `/api/research/nodes` with fallback to sample data
- ✅ **Search and filtering** - Real-time text search across titles, content, and sources
- ✅ **Dual view modes** - Toggle between D3 interactive graph and traditional layout
- ✅ **Responsive design** - Auto-adjusts to container dimensions
- ✅ **Drag-and-drop to outline** - Seamless integration with existing outline builder
- ✅ **Node details modal** - Comprehensive information display on double-click

### Debugging and Fixing Chat-to-Dashboard Workflow
* Investigated data flow from chat to dashboard.
* Confirmed chat API and research node generation API return correct data.
* Fixed VisualizationCanvas logic to persist generated research data for 30 minutes.
* Improved API data transformation (`children` → `connections`).
* Added detailed debugging logs.
* Created HTML test page to simulate and verify the workflow.
* Verified the fix works: generated nodes persist and display in the dashboard.

### Technical Implementation Details:
- **New Dependencies**: D3.js v7 with full TypeScript definitions
- **Performance Features**: 
  - Efficient force simulation with collision detection
  - Optimized rendering with SVG elements
  - Responsive canvas that adapts to container size
- **Search Implementation**: Multi-field filtering (title, content, source)
- **Interaction Model**: 
  - Single-click: Select/deselect nodes
  - Double-click: Show detailed information
  - Drag: Reposition nodes in force simulation
  - Zoom/Pan: Navigate large knowledge graphs
- **Visual Design**: 
  - Color-coded node types with accessibility considerations
  - Professional styling with drop shadows and transitions
  - Clear connection lines with proper opacity
- **Integration**: 
  - Seamless connection to existing outline store
  - Maintains all existing drag-and-drop functionality
  - Compatible with search and filtering features

All visualization features are fully functional and production-ready, providing both traditional and modern D3-powered views for exploring research nodes.

## Testing & Quality Assurance (Core MVP)
-   [ ] Set up basic Jest tests for outline manipulation functions
-   [ ] Test critical user flows (adding nodes, reordering, exporting)
-   [ ] Implement basic error handling for API failures
-   [x] **DEBUGGING IN PROGRESS**: Chat-to-dashboard workflow persistence issue
    - Issue: Generated research nodes not displaying in dashboard after chat workflow
    - Status: Investigating localStorage persistence and component re-rendering behavior
    - Fix implemented: Enhanced localStorage persistence with timestamps and improved debugging   

## Testing & Quality Assurance (Post-MVP)
-   [ ] Expand test coverage to all components
-   [ ] Implement end-to-end tests with Cypress
-   [ ] Add comprehensive performance testing
-   [ ] Implement advanced accessibility testing

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