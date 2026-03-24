# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

Gitick is a privacy-first, minimalist desktop task manager built with **Electron + React + TypeScript + Vite**. It uses localStorage for all data persistence (no cloud sync).

## Commands

```bash
npm run dev              # Web dev server (localhost:3000)
npm run build            # Vite production build
npm run typecheck        # TypeScript type checking
npm run test             # Run Vitest tests (watch mode)
npm run test:run         # Run tests once

npm run desktop:dev      # Electron + Vite dev mode
npm run desktop:dmg      # Build macOS DMG
npm run desktop:release  # Build DMG + verify signatures + publish to GitHub
npm run ci:local         # typecheck + build (local CI gate)
```

## Architecture

**State Management**: `useAppState` hook (`hooks/useAppState.tsx`) is the centralized state orchestrator. All task CRUD flows through it.

**Task Model**: `types.ts` defines `Task`, `UserProfile`, `Priority`, `RecurrenceRule`. Tasks have id, title, priority, dueDate, tags, subtasks, recurrence, and completion timestamps.

**Storage**: `utils/storage.ts` wraps localStorage. Key prefix convention: `gitick:<entity>`.

**Task Parsing**: `utils/taskParser.ts` handles smart syntax (`!high`, `#tag`, `today`, `@repo`).

**Electron Main Process** (`electron/main.cjs`): Window management, auto-updater via electron-updater, IPC handlers for desktop operations.

**Preload** (`electron/preload.cjs`): Context bridge exposing safe APIs to renderer.

**UI Components** (`components/`): React components. `components/ui/` contains primitive building blocks.

## Package Manager

**npm** is the primary package manager. `package-lock.json` is the lockfile source of truth. `bun.lock` is gitignored to prevent mixed-lock drift.

## Build Targets

macOS arm64 only (DMG + ZIP with blockmaps for auto-updater). The release pipeline publishes to GitHub Releases and generates `latest-mac.yml` for electron-updater.

## Testing

Vitest with `node` environment. Test files under `utils/__tests__/*.test.ts`. Run single test: `npx vitest run utils/__tests__/taskParser.test.ts`.
