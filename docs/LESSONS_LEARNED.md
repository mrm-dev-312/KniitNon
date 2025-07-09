## Review Summary
### 📝 Lessons Learned
- Clearly distinguish Core-MVP vs. Post-MVP features upfront to maintain focus and avoid scope creep.
- Next.js route groups (parentheses) don’t create URL segments—use explicit folder names for routable pages.
- React DnD type exports changed between versions; always verify module exports and keep @types in sync.
- Providing mock‐data fallbacks lets frontend development proceed without a live backend.
- Zustand proved simple and flexible for global state, but define a consistent store API early to prevent refactors.
- Breaking large tasks into smaller, end-to-end chunks (e.g., drag-from-canvas → drop-into-outline) reduces debugging time.

### 📚 Documentation Needed
- **README.md**  
  - Setup steps (install deps, start dev server, Docker + Postgres)  
  - Environment variable specs  
  - How to run migrations and seed mock data  
- **Developer Guide**  
  - Outline store API (actions, selectors)  
  - Using React DnD with TypeScript (patterns, common pitfalls)  
  - AdjustableDetailSlider integration and re-fetch logic  
- **API Reference**  
  - `/api/research/nodes` and `/api/research/outline` contracts (request/response examples)  
  - Error handling strategies and status codes  
- **Architecture Diagram**  
  - High-level flow: Visualization → OutlineBuilder → Store → API  
  - Domain model relations (Nodes, Sources, Conflicts)  
- **CONTRIBUTING.md** (if not present)  
  - Branching strategy, code style, testing requirements  
- **Testing Docs**  
  - How to run Jest tests (`npm test --ci`)  
  - Mocking strategies and test isolation best practices  