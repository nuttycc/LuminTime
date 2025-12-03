# Agent Guidelines

## Project Overview (WHY)
LuminTime is a privacy-first browser extension that automatically tracks your online activity and labels it intelligently. All data stays locally (IndexedDB), no cloud or account required.

## Tech Stack (WHAT)
- **Framework**: WXT (Web Extension Toolkit) with Vue 3
- **Storage**: IndexedDB via Dexie.js
- **Validation**: Arktype for runtime type validation
- **Styling**: Tailwind CSS 4 with DaisyUI 5
- **Testing**: Vitest
- **Utilities**: VueUse and Es-Toolkit

## Project Structure (WHAT)
- `src/entrypoints/` – Extension entry points (background, popup)
- `src/components/` – Vue components
- `src/db/` – Database layer (Dexie models, services)
- `src/composables/` – Vue composables
- `src/utils/` – Utility functions
- `tests/` – Unit tests (Vitest)

## Development Commands (HOW)
- **Install Dependencies**: `bun install`
- **Development Server**: `bun run dev` (WXT dev server)
- **Type Check**: `bun run compile` (vue-tsc --noEmit)
- **Lint**: `bun run lint` (oxlint --type-aware)
- **Format**: `bun run format` (oxfmt)
- **Tests**: `bun run test` (vitest run)

## Progressive Disclosure
For detailed context on specific topics, refer to the following documents in `agent_docs/` (read only when relevant):
- `code_conventions.md` – High-level coding patterns (not linting rules)
- `testing.md` – Test patterns and setup
- `architecture.md` – Key architectural decisions

**Note**: Formatting and linting are handled automatically by Oxlint/Oxfmt. Use `bun run lint` and `bun run format` to check/fix code style.


