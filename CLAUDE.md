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

### Testing
```bash
pnpm test              # Run tests in watch mode
pnpm test:run          # Run tests once
pnpm --filter web test:run <path>   # Run a specific test file
```

### Browser Testing (WebGPU/Canvas)
```bash
# Run browser tests (headed mode for full WebGPU support)
HEADED=1 pnpm --filter web test:browser:run

# Run browser tests (headless - WebGPU tests will be skipped)
pnpm --filter web test:browser:run
```

Browser tests use Vitest Browser Mode with Playwright. Tests are in `*.browser.test.ts` files.
- WebGPU requires headed mode on macOS (headless lacks GPU adapter)
- Test fixtures are in `apps/web/src/modules/HeroScene/Infra/__fixtures__/`

## Architecture

- **Monorepo structure**: Uses pnpm workspaces with `apps/*` and `packages/*` directories
- **Web app** (`apps/web`): Vue 3 SFC with `<script setup>` syntax and TypeScript
- **Tooling**: Uses mise for Node.js (v25.2.1) and pnpm version management
- **Build**: rolldown-vite (experimental Vite with Rolldown bundler)

### Module Organization (Clean Architecture)

The web app follows a domain-driven design pattern in `apps/web/src/modules/`:

- **Domain/ValueObject/**: Pure domain entities and value objects (no external dependencies)
- **Application/**: Use cases and application logic with ports (interfaces)
- **Infra/**: Infrastructure implementations (repositories, services, external integrations)

Current modules: `Photo`, `PhotoLocal`, `Filter`, `Color`, `Pipe`

### Test Configuration

- Domain/Application tests run in Node environment
- Infrastructure and composables tests run in happy-dom environment
- Browser tests (`*.browser.test.ts`) run in real Chromium via Playwright
- Tests are co-located with source files

### MCP Integration

Playwright MCP is configured in `.mcp.json` for AI-assisted visual inspection:
- Use `browser_navigate` to open pages
- Use `browser_screenshot` to capture Canvas rendering
- Requires Claude Code restart after modifying `.mcp.json`

## Issue & PR Workflow

### Issue起票ルール
- Issueを起票する前に、必ずコードベースを調査してあたりをつけること
- 問題の原因や修正箇所の見当がついた状態で起票する

### PR作成ルール
- PRはmasterブランチから新しいブランチを作成して作業すること
- Issueの解決に必要な変更のみをcommitする
