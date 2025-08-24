# AI Podcast Generator - Copilot Instructions

## Project Context
This is the AI Podcast Generator project implementing a stage-gated research pipeline. The system converts literature research into submission-ready manuscripts through 6 distinct stages (0-5).

## Core Architecture
- **Backend**: Python with FastAPI, SQLAlchemy, PostgreSQL
- **Frontend**: React with TypeScript, Tailwind CSS  
- **Research Pipeline**: Stage-gated system with artifact validation
- **Database**: PostgreSQL only (never SQLite)
- **Testing**: pytest for Python, Jest/Vitest for JavaScript/TypeScript

## Stage-Gated Pipeline Overview
The research engine follows a strict 6-stage progression:
- Stage 0: Exploration & Scope
- Stage 1: Corpus Build  
- Stage 2: Triage & Appraisal
- Stage 3: Synthesis & Theming
- Stage 4: Argument & Outline
- Stage 5: Drafting & Polish

Each stage has defined inputs, outputs, and gate criteria that must be met before advancement.

## Development Patterns

### Database & Migrations
- Always use absolute imports in Python: `from lib.database.models import SourceRecord`
- Test migrations on clean database first
- Use dedicated test database (aipodcastgen_test) 
- Validate SQLAlchemy models match database schema
- Implement rollback procedures for all migrations

### Error Handling & Validation
- Dual-layer validation: Zod at API boundaries, Ajv for internal artifacts
- Schema-first approach with JSON Schema validation
- Implement comprehensive error handling with proper logging
- Use feature flag `RESEARCH_PIPELINE_V2` for new pipeline features

### Testing Strategy
- Use pytest with `--tb=short -x` flags for fast feedback
- Implement test isolation with dedicated test database
- Reset test fixtures between runs for clean state
- Create factory functions for mock data generation
- Validate mocks against TypeScript interfaces

### Shell Commands
- Use PowerShell syntax with ';' separators, not '&&'
- Example: `command1; command2; command3`

## Quality Gates
Before considering any task complete:
- [ ] All relevant tests pass
- [ ] Code formatted and linted
- [ ] Schema validation passes
- [ ] Database migrations work both ways
- [ ] Documentation updated
- [ ] Error handling implemented

## Domain-Specific Rules

### Research Pipeline
- Maintain stage isolation - later stages never mutate earlier artifacts
- Every claim must link to source evidence with page references
- Gate advancement only when measurable criteria are met
- Export deliverables available at each stage for early value

### Citation Management
- Capture DOI and metadata for all sources
- Use CrossRef for enrichment when available
- Track citation integrity through audit module
- Support multiple citation styles (APA, MLA, IEEE)

### File Organization
- Schemas in `lib/research-engine/schemas/`
- Domain models in `lib/research-engine/domain/`
- Prompt chains in `prompt-chains/stage-{n}/`
- Adapters in `lib/research-engine/adapters/`

## Performance Guidelines
- Implement caching for external API calls
- Use parallel processing for independent operations
- Timebox all stages to prevent endless iteration
- Monitor and log key metrics per stage

## Security Considerations
- Sandbox PDF extraction processes
- Validate all external data inputs
- Use secure HTTP clients with timeouts
- Implement rate limiting for external APIs