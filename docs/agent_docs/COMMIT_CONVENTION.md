# Commit Convention

## Format

```
<type>(<scope>): <description>
```

## Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `refactor` | Code refactoring (no feature/fix) |
| `perf` | Performance improvement |
| `test` | Add or update tests |
| `chore` | Build, dependencies, configs |

## Scope (optional)

Component or area affected: `popup`, `background`, `content`, `options`, `ui`, `db`, etc.

## Examples

```bash
feat(popup): add time tracking chart
fix(background): resolve memory leak in timer
refactor: migrate to composition API
docs: update README installation steps
perf(db): optimize query performance
chore: update dependencies
```

## Rules

1. Use lowercase
2. No period at the end
3. Use imperative mood ("add" not "added")
4. Keep under 72 characters
