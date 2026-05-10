# Food Recommendations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/foods` page for manually maintaining a food wishlist and visited restaurant recommendations, with search, sorting, labels, Dianping links, and GitHub-backed persistence.

**Architecture:** Store food data in `src/app/foods/list.json`, keep shared filtering/sorting helpers in `src/lib/food-recommendations.ts`, and implement the UI as focused client components under `src/app/foods`. Persistence follows the existing `projects` and `share` modules by committing the JSON file through the GitHub client after private-key authentication.

**Tech Stack:** Next.js App Router, React client components, TypeScript, Tailwind CSS utilities, Node test runner for pure helper tests, existing GitHub client utilities.

---

### Task 1: Food Data Model And Search Helpers

**Files:**
- Create: `src/app/foods/types.ts`
- Create: `src/app/foods/list.json`
- Create: `src/lib/food-recommendations.ts`
- Create: `tests/food-recommendations.test.mjs`

- [ ] **Step 1: Write failing helper tests**

Create tests that prove search matches city, area, restaurant names, dish names, tags, and Dianping links; sorting must rank restaurants by recommendation score and visited date.

- [ ] **Step 2: Run helper tests and verify red**

Run: `node --test tests/food-recommendations.test.mjs`

Expected: fail because `src/lib/food-recommendations.ts` does not exist yet.

- [ ] **Step 3: Add food types, sample data, and helper implementation**

Implement typed food data, initial sample records, `filterFoodEntries`, `sortFoodEntries`, `collectFoodCities`, and `collectFoodTags`.

- [ ] **Step 4: Run helper tests and verify green**

Run: `node --test tests/food-recommendations.test.mjs`

Expected: all helper tests pass.

### Task 2: GitHub Persistence

**Files:**
- Create: `src/app/foods/services/push-foods.ts`

- [ ] **Step 1: Add GitHub save service**

Create `pushFoods({ foods })` using the existing GitHub helper functions to write `src/app/foods/list.json` with the commit message `更新美食饭店推荐`.

- [ ] **Step 2: Type-check through build later**

No isolated service test is required because existing services use the same GitHub client integration pattern. The final `pnpm build` verifies import and type correctness.

### Task 3: Food Page UI

**Files:**
- Create: `src/app/foods/page.tsx`

- [ ] **Step 1: Build page state and filters**

Load `list.json`, maintain edit mode, draft list, search query, type filter, city filter, tag filter, and sort mode.

- [ ] **Step 2: Render browse mode**

Render title, search controls, wanted items, restaurant cards, rating stars, tags, address, Dianping links, recommended dishes, and avoid dishes.

- [ ] **Step 3: Render edit mode**

Support adding, editing, deleting wishlist items and restaurant records, including nested recommended and avoid dishes.

- [ ] **Step 4: Save to GitHub**

Use the current private-key flow. If unauthenticated, open `.pem` input; after authentication, call `pushFoods`.

### Task 4: Navigation

**Files:**
- Modify: `src/components/nav-card.tsx`

- [ ] **Step 1: Add nav item**

Add a `美食饭店` link pointing to `/foods` using existing navigation icon styling.

- [ ] **Step 2: Verify nav active state**

Ensure `/foods` appears active in icon navigation and full home navigation by using the existing pathname equality logic.

### Task 5: Verification

**Files:**
- Modify as needed from prior tasks.

- [ ] **Step 1: Run targeted tests**

Run: `node --test tests/food-recommendations.test.mjs`

Expected: all food helper tests pass.

- [ ] **Step 2: Run full test suite**

Run: `pnpm test`

Expected: all tests pass.

- [ ] **Step 3: Run production build**

Run: `pnpm build`

Expected: build completes successfully.

- [ ] **Step 4: Review diff**

Run: `git diff --stat && git diff --check`

Expected: no whitespace errors; changed files match this plan.
