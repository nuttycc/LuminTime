# Agent Guidelines

## Project Overview

LuminTime is a privacy-first browser extension that automatically tracks your online activity and labels it intelligently. All data stays locally (IndexedDB), no cloud or account required.

## Tech Stack

- **Framework**: WXT (Web Extension Toolkit) with Vue 3
- **Storage**: IndexedDB via Dexie.js
- **Validation**: Arktype for runtime type validation
- **Styling**: Tailwind CSS 4 with DaisyUI 5
- **Testing**: Vitest
- **Utilities**: VueUse and Es-Toolkit

## Commands

```bash
bun install           # Install deps (runs wxt prepare postinstall)
bun run dev           # Dev server with HMR → load .output/chrome-mv3/ in chrome://extensions/
bun run build         # Production build
bun run zip           # Chrome extension ZIP
bun run zip:firefox   # Firefox extension ZIP
bun run compile       # Type check (vue-tsc --noEmit)
bun run lint          # Oxlint static analysis
bun run format        # Code formatting (oxfmt)
bun run test          # Vitest unit tests
```

## Project Structure

- `src/entrypoints/` – Extension entry points (background, popup)
- `src/components/` – Vue components
- `src/db/` – Database layer (Dexie models, services)
- `src/composables/` – Vue composables
- `src/utils/` – Utility functions
- `tests/` – Unit tests (Vitest)
