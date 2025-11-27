# Agent Guidelines

## Build/Lint/Test Commands
- **Install Dependencies**: `bun install` (install dependencies)
- **Development**: `bun run dev` (wxt dev server)
- **Type Check**: `bun run compile` (vue-tsc --noEmit)
- **Lint**: `bun run lint` (oxlint --type-aware)
- **Format**: `bun run format` (oxfmt)
- **Tests**: `bun run test` (vitest run)

## Tech Stack
- **Framework**: WXT (Web Extension Toolkit) with Vue 3
- **Storage**: IndexedDB via Dexie.js
- **Validation**: Arktype for runtime type validation
- **Styling**: Tailwind CSS 4 with DaisyUI 5
- **Testing**: Vitest
- **utility**: VueUse and Es-Toolkit

## Code Style Guidelines
- **Extension APIs**: Use unified `browser` API (auto-imported) instead of `chrome` for cross-browser compatibility
- **TypeScript**: Strict mode via WXT defaults, Vue 3 Composition API
- **Vue Components**: Use `<script setup lang="ts">`, defineProps/defineEmits
- **Imports**: Standard order, no cycles (oxlint enforced)
- **Naming**: camelCase for variables/functions, PascalCase for components/types
- **Error Handling**: Try/catch for async operations, proper error types
- **Formatting**: Oxlint handles formatting
- **CSS**: Tailwind CSS utility-first, scoped styles in Vue components


