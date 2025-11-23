# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a pnpm monorepo containing a Vue 3 + TypeScript web application using Vite (via rolldown-vite).

## Commands

### Development
```bash
# Start dev server (from root)
pnpm dev

# Or directly targeting the web package
pnpm --filter web dev
```

### Build
```bash
pnpm --filter web build   # Runs vue-tsc type check, then vite build
```

### Preview Production Build
```bash
pnpm --filter web preview
```

## Architecture

- **Monorepo structure**: Uses pnpm workspaces with `apps/*` and `packages/*` directories
- **Web app** (`apps/web`): Vue 3 SFC with `<script setup>` syntax and TypeScript
- **Tooling**: Uses mise for Node.js (v25.2.1) and pnpm version management
- **Build**: rolldown-vite (experimental Vite with Rolldown bundler)
