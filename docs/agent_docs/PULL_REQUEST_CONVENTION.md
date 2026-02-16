# Pull Request Convention

## Branch Naming

```
<type>/<short-description>
```

Examples:

- `feat/dark-mode`
- `fix/timer-accuracy`
- `refactor/state-management`

## PR Title

Same format as commit messages:

```
<type>(<scope>): <description>
```

## PR Labels

Add one of these labels for auto-generated release notes:

| Label                      | Use for                  |
| -------------------------- | ------------------------ |
| `enhancement` or `feature` | New features             |
| `bug` or `fix`             | Bug fixes                |
| `performance`              | Performance improvements |
| `documentation`            | Documentation updates    |

## PR Body Template

```markdown
## Summary

- Brief description of changes

## Type

<!-- Add label: enhancement, bug, documentation, performance -->

## Changes

- Change 1
- Change 2

## Test

- [ ] Tested locally
```

## Workflow

1. Create feature branch: `git checkout -b feat/xxx`
2. Make commits following commit convention
3. Push: `git push -u origin HEAD`
4. Create PR on GitHub
5. Add appropriate label
6. Request review if needed
7. Merge to main
