# Code Conventions

## High-Level Patterns

### Vue Components

- Use `<script setup lang="ts">` with Composition API
- Define props/emits using `defineProps`/`defineEmits`
- Prefer reactive state with `ref` and `computed`
- Use TypeScript for type safety

### Extension APIs

- Use unified `browser` API (auto-imported by WXT) instead of `chrome.*`
- This ensures cross-browser compatibility

### Error Handling

- Wrap async operations in try/catch blocks
- Use proper error types and logging
- Handle IndexedDB errors gracefully

### File Organization

- Components in `src/components/` with PascalCase names
- Composables in `src/composables/` with `use` prefix
- Database logic in `src/db/`
- Utilities in `src/utils/`

## Tooling Notes

- **Formatting**: Oxfmt handles all formatting automatically
- **Linting**: Oxlint enforces import order, no cycles, and other rules
- **Type Checking**: `vue-tsc` provides strict TypeScript checking

**Important**: Don't manually enforce style rules in code. Run `bun run lint` and `bun run format` to check/fix code style automatically.
