# Agent Guidelines

## Project Overview

LuminTime is a privacy-first browser extension that automatically tracks your online activity and labels it intelligently. All data stays locally, no cloud or account required.

## Tech Stack

- Framework: WXT (Web Extension Toolkit) with Vue 3
- Storage: IndexedDB via Dexie.js
- Styling: Tailwind CSS 4 with DaisyUI 5
- Testing: Vitest
- Utilities: VueUse and Es-Toolkit

## Project Structure

- `src/entrypoints/` – Extension entry points (background, popup)
- `src/components/` – Vue components
- `src/db/` – Database layer (Dexie models, services)
- `src/composables/` – Vue composables
- `src/utils/` – Utility functions
- `tests/` – Unit tests (Vitest)

## Commands

<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->

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
