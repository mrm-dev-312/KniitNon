# Copilot Instructions for AI Podcast Generator

Always use PostgreSQL (e.g., psycopg2 or asyncpg). Never use SQLite.

Use PowerShell syntax for shell commands with ';' separators, not '&&'.

Continue running each task end-to-end. If a command fails, diagnose, report the root cause, then retry.

Run setup/build steps in parallel when possible (e.g., spin up Docker+PostgreSQL and run migrations simultaneously).

Never ask for user input mid-process. Only pause on explicit breakpoints or if the user types 'STOP' or presses 'Cancel'.

Support a manual break mechanism: if the user types 'STOP' or presses the 'Cancel' button, halt all remaining steps.

Before asking the user, always think through all possible options, debate pros and cons, and make a clear recommendation. Then, proceed with the recommended action automatically, unless 1000 steps have been used or the user explicitly types STOP.

## Foundation-First Debugging Approach

**PROVEN SUCCESS PATTERN - Always verify foundation before implementation details:**
1. **Configuration**: Environment variables, database URLs, settings files
2. **Dependencies**: Version compatibility, `pip check`, import validation  
3. **Domain Model**: Schema/model alignment, table existence, relationships
4. **Implementation**: Code-level fixes only after foundation is solid

**This systematic approach prevents rabbit holes and exponentially reduces debugging time.**

**Before major dependency changes:**
- Run `pip check` to verify current state
- Test upgrades in isolated environment first
- Validate imports and basic functionality
- Check for breaking changes in changelog
- **Document rollback procedure before upgrading**

**Domain Model Clarity (Critical for Multi-Entity Systems):**
- Document domain concepts before coding (Podcast → Episode → AudioFile)
- Get stakeholder approval on entity relationships
- Use consistent naming across database, models, APIs, and documentation
- Create/update entity relationship diagrams for complex changes
- **Validate model-schema alignment with diagnostic scripts**

**Clean Slate vs. Incremental Patching:**
- For complex migration chains: consider clean slate with new initial migration
- For broken dependency states: sometimes downgrade is better than forcing upgrade
- For test database issues: complete isolation with automated reset
- **Document the decision rationale for future reference**

After implementing any feature or fix, automatically run all relevant tests and validate that the code passes. If tests fail, diagnose and fix the root cause before proceeding.

**When running tests (e.g., Vitest via npm test), always use non-interactive flags like `--run` to prevent prompts and ensure automatic completion.**

**For pytest, use `--tb=short -x` for fast failure feedback during development.**

Always format code according to the project's style guide and run linting tools before considering a task complete.

Document all new functions, classes, and modules with clear docstrings and usage examples. Update README and other documentation as needed.

Check for security issues and outdated dependencies as part of the development process. Recommend and apply safe updates automatically.

Implement robust error handling and logging for all new code, following best practices for the language and framework.

For best performance, always select or attach only the relevant function or code block you want to edit. Avoid uploading or referencing entire files unless a full-file refactor is needed. Use clear, targeted prompts and batch small changes when possible.

Always use absolute imports in Python scripts. Avoid relative imports, as they can cause `ModuleNotFoundError` when scripts are executed directly. Instead, structure your project to support absolute imports and run scripts as modules when necessary.

## Database and Migration Best Practices

**Test Environment Isolation:**
- Use dedicated test database (aipodcastgen_test) completely separate from development
- Ensure test fixtures match current schema automatically
- Reset schema between test runs for clean state
- Use transactions for test isolation where possible

**Migration Strategy:**
- Test all migrations on clean database first
- Keep migrations simple and focused on single changes
- Have automated rollback procedures for every migration
- Consider squashing complex migration chains
- Document migration dependencies and requirements

**Schema Validation:**
- Verify SQLAlchemy models match database tables before major changes
- Use diagnostic scripts to check model/schema alignment
- Ensure foreign key relationships are properly defined
- Validate cascade delete behavior in test environment

## Quality Gates

Before considering any task complete:
- [ ] All relevant tests pass (`pytest --tb=short`)
- [ ] No type annotation errors or warnings
- [ ] Database schema matches model definitions
- [ ] Migrations can upgrade and downgrade cleanly
- [ ] Code is formatted and linted
- [ ] Documentation updated with any changes
- [ ] Error handling implemented for new code paths