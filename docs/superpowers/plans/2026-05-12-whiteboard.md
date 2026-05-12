# Whiteboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an independent `/whiteboard` module embedding Excalidraw with local autosave, import, export, and clear actions.

**Architecture:** Use a client-only Excalidraw wrapper loaded with `next/dynamic` to avoid SSR issues. Keep JSON serialization and validation in `src/lib/excalidraw-storage.ts` so it can be tested with the existing Node test runner.

**Tech Stack:** Next.js App Router, React 19, `@excalidraw/excalidraw`, localStorage, Node test runner, Tailwind CSS utilities.

---

### Task 1: Storage Helpers

**Files:**
- Create: `src/lib/excalidraw-storage.ts`
- Create: `tests/excalidraw-storage.test.mjs`

- [ ] **Step 1: Write failing tests**

Test that whiteboard data serializes as Excalidraw JSON, parses valid JSON, rejects invalid JSON, and creates stable export filenames.

- [ ] **Step 2: Run red test**

Run: `node --test tests/excalidraw-storage.test.mjs`

Expected: fails because `src/lib/excalidraw-storage.ts` does not exist.

- [ ] **Step 3: Implement helpers**

Create `createWhiteboardFile`, `parseWhiteboardFile`, and `createWhiteboardFilename`.

- [ ] **Step 4: Run green test**

Run: `node --test tests/excalidraw-storage.test.mjs`

Expected: all tests pass.

### Task 2: Excalidraw Dependency

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

- [ ] **Step 1: Install dependency**

Run: `pnpm add @excalidraw/excalidraw`

Expected: package is added and lockfile updates.

### Task 3: Whiteboard Page

**Files:**
- Create: `src/app/whiteboard/page.tsx`
- Create: `src/app/whiteboard/whiteboard-client.tsx`

- [ ] **Step 1: Create page shell**

Render a full-height page with `WhiteboardClient`.

- [ ] **Step 2: Create client component**

Dynamic import Excalidraw with `ssr: false`, load stored data from localStorage, autosave on change, and expose clear/import/export buttons.

### Task 4: Navigation

**Files:**
- Modify: `src/components/nav-card.tsx`
- Modify: `src/config/card-styles.json`
- Modify: `src/config/card-styles-default.json`

- [ ] **Step 1: Add whiteboard nav item**

Add a `白板` entry to the navigation list and increase nav card/icon widths enough for the extra item.

### Task 5: Verification

**Files:**
- All changed files.

- [ ] **Step 1: Run focused test**

Run: `node --test tests/excalidraw-storage.test.mjs`

Expected: pass.

- [ ] **Step 2: Run full tests**

Run: `pnpm test`

Expected: pass.

- [ ] **Step 3: Run type check**

Run: `pnpm exec tsc --noEmit`

Expected: pass.

- [ ] **Step 4: Run production build**

Run: `pnpm build`

Expected: pass and show `/whiteboard` route.
