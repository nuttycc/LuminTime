# LuminTime Browser Extension - Agent Guidelines

## Build/Lint/Test Commands
- **Development**: `bun run dev` (wxt dev server)
- **Build**: `bun run build` (wxt build)
- **Package**: `bun run zip` (create extension package)
- **Type Check**: `bun run compile` (vue-tsc --noEmit)
- **Lint**: `bun run lint` (oxlint --type-aware)
- **Tests**: No test framework configured yet

## Architecture & Structure
- **Framework**: WXT (Web Extension Toolkit) with Vue 3
- **Storage**: IndexedDB via Dexie (local-first, privacy-focused)
- **Validation**: Arktype for runtime type validation
- **Styling**: UnoCSS with Wind4 preset + Iconify icons
- **Entry Points**: popup/, background.ts, content.ts
- **Key Features**: Tab tracking, AI tagging, idle detection, local analytics
- **Scratchpad**: `docs/` for local experiments and design notes

## Code Style Guidelines
- **Extension APIs**: Use unified `browser` API (auto-imported) instead of `chrome` for cross-browser compatibility
- **TypeScript**: Strict mode via WXT defaults, Vue 3 Composition API
- **Vue Components**: Use `<script setup lang="ts">`, defineProps/defineEmits
- **Imports**: Standard order, no cycles (oxlint enforced)
- **Naming**: camelCase for variables/functions, PascalCase for components/types
- **Error Handling**: Try/catch for async operations, proper error types
- **Formatting**: Oxlint handles formatting, no unused vars in prod code
- **CSS**: UnoCSS utility-first, scoped styles in Vue components

