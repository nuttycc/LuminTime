# Agent Guidelines

## Project Overview

LuminTime is a privacy-first browser extension that automatically tracks your online activity and labels it intelligently. All data stays locally, no cloud or account required.

## Tech Stack

- Framework: WXT (Web Extension Toolkit) with Vue 3
- Storage: IndexedDB via Dexie.js
- Styling: Tailwind CSS 4 with DaisyUI 5
- Testing: Vitest
- Utilities: VueUse and Es-Toolkit

## Commands

VITE+ - The Unified Toolchain for the Web

use `vp run xx`

```bash
vp install           # Install deps (runs wxt prepare postinstall)
vp run dev           # Dev server with HMR → load .output/chrome-mv3/ in chrome://extensions/
vp run build         # Production build
vp run zip           # Chrome extension ZIP
vp run zip:firefox   # Firefox extension ZIP
vp run compile       # Type check (vue-tsc --noEmit)
vp run lint          # Oxlint static analysis
vp run format        # Code formatting (oxfmt)
vp run test          # Vitest unit tests
```

## Project Structure

- `src/entrypoints/` – Extension entry points (background, popup)
- `src/components/` – Vue components
- `src/db/` – Database layer (Dexie models, services)
- `src/composables/` – Vue composables
- `src/utils/` – Utility functions
- `tests/` – Unit tests (Vitest)
