# MCP (deferred)

A read-only Model Context Protocol server could expose:

- `list_patterns` / `search_patterns` / `get_pattern`
- `recommend_patterns`
- `get_configuration_schema`
- `get_integration_example`
- `validate_configuration`

**Decision for v0.1:** defer implementation. Static `/registry/patterns.json`, JSON Schema, `llms.txt`, and the Agent Skill already cover discovery without a runtime, database, or auth.

If added later: optional package (e.g. `@glyptide/mcp`), stdio-only, no shell tools, no secrets, wrapping the same registry generators — never a dependency of `glyptide` core.
