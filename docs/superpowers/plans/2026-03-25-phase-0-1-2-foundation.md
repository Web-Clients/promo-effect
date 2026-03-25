# Promo-Effect Foundation: Phases 0-1-2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish infrastructure (linting, testing, CI/CD), harden security, and clean dead code — the foundation for all subsequent phases.

**Architecture:** Phase 0 sets up tooling (ESLint, Prettier, Vitest, Jest, GitHub Actions, husky). Phase 1 fixes all security vulnerabilities (rate limiting, HTTPS prep, CORS, Gemini API key leak, CSRF, input validation). Phase 2 removes all dead files and stubs. Phases 1+2 run after Phase 0 completes.

**Tech Stack:** React 19, Vite 6.2, TypeScript 5.8, Express 4, Prisma 5, ESLint 9, Prettier, Vitest, Jest, Husky, GitHub Actions

**Spec:** `docs/superpowers/specs/2026-03-25-promo-effect-completion-strategy-design.md`

**Project root:** `/Users/macbook_nou/Projects/promo-effect`

---

## File Map

### Phase 0 — New Files:
- `eslint.config.mjs` — flat config ESLint 9 (frontend)
- `.prettierrc` — Prettier config
- `vitest.config.ts` — Vitest config (frontend)
- `backend/jest.config.ts` — Jest config (backend)
- `.github/workflows/ci.yml` — GitHub Actions CI
- `.husky/pre-commit` — pre-commit hook

### Phase 0 — Modified Files:
- `package.json` — add lint/test/format scripts + devDeps
- `backend/package.json` — add lint script
- `tsconfig.json` — enable strict, remove legacy flags
- `vite.config.ts` — remove `define` block, add Tailwind plugin
- `backend/tsconfig.json` — align TS version

### Phase 1 — Modified Files:
- `backend/src/modules/auth/auth.controller.ts:11` — uncomment rate limiter
- `backend/src/app.ts:37-68` — CORS from env vars
- `backend/src/server.ts` — JWT_SECRET validation at startup
- `backend/src/modules/auth/auth.service.ts` — sanitizeUser()
- `services/geminiService.ts` — already uses backend API (no change needed)
- `vite.config.ts` — remove Gemini key injection (done in Phase 0)
- `package.json` — remove `@google/genai`, `pdf-parse` (done in Phase 0)

### Phase 2 — Deleted Files:
- 9 empty shell/python scripts
- 10 empty markdown files
- 1 .eml file (420KB)
- 3 stub components

---

## PHASE 0: INFRASTRUCTURE

---

### Task 0.1: Setup ESLint + Prettier (Frontend)

**Files:**
- Create: `eslint.config.mjs`
- Create: `.prettierrc`
- Modify: `package.json` — add devDeps + scripts

- [ ] **Step 1: Install ESLint + Prettier + plugins**

```bash
cd /Users/macbook_nou/Projects/promo-effect
npm install -D eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh prettier eslint-config-prettier
```

- [ ] **Step 2: Create ESLint flat config**

Create `eslint.config.mjs`:
```javascript
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  { ignores: ['dist/', 'node_modules/', 'backend/', '*.config.*'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'max-lines': ['warn', { max: 800, skipBlankLines: true, skipComments: true }],
    },
  }
);
```

- [ ] **Step 3: Create Prettier config**

Create `.prettierrc`:
```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "tabWidth": 2,
  "printWidth": 100
}
```

- [ ] **Step 4: Add scripts to frontend package.json**

Add to `package.json` scripts:
```json
"lint": "eslint .",
"lint:fix": "eslint . --fix",
"format": "prettier --write \"**/*.{ts,tsx,json,md}\""
```

- [ ] **Step 5: Run lint to see baseline errors (expect many)**

```bash
npx eslint . 2>&1 | tail -20
```
Expected: Many warnings/errors (we'll fix incrementally). This is baseline only.

- [ ] **Step 6: Commit**

```bash
git add eslint.config.mjs .prettierrc package.json package-lock.json
git commit -m "feat: add ESLint 9 flat config + Prettier setup"
```

---

### Task 0.2: Setup Vitest (Frontend)

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` — add test devDeps + script

- [ ] **Step 1: Install Vitest + testing-library**

```bash
cd /Users/macbook_nou/Projects/promo-effect
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @types/react @types/react-dom
```

- [ ] **Step 2: Create Vitest config**

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'backend'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: ['node_modules/', 'dist/', 'backend/', '*.config.*', 'tests/'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
```

- [ ] **Step 3: Create test setup file**

Create `tests/setup.ts`:
```typescript
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 4: Add test script to package.json**

Add to `package.json` scripts:
```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

- [ ] **Step 5: Create a smoke test to verify setup**

Create `tests/smoke.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';

describe('Vitest setup', () => {
  it('runs tests', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 6: Run test to verify it passes**

```bash
npx vitest run
```
Expected: 1 test passed.

- [ ] **Step 7: Commit**

```bash
git add vitest.config.ts tests/setup.ts tests/smoke.test.ts package.json package-lock.json
git commit -m "feat: add Vitest + testing-library setup with smoke test"
```

---

### Task 0.3: Setup Jest (Backend)

**Files:**
- Create: `backend/jest.config.ts`
- Create: `backend/__tests__/smoke.test.ts`

- [ ] **Step 1: Install Jest TS support (Jest already in devDeps)**

```bash
cd /Users/macbook_nou/Projects/promo-effect/backend
npm install -D ts-jest @types/jest
```

- [ ] **Step 2: Create Jest config**

Create `backend/jest.config.ts`:
```typescript
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/__tests__'],
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/server.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
};

export default config;
```

- [ ] **Step 3: Create backend smoke test**

Create `backend/__tests__/smoke.test.ts`:
```typescript
describe('Jest backend setup', () => {
  it('runs tests', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 4: Run test**

```bash
cd /Users/macbook_nou/Projects/promo-effect/backend && npx jest --config jest.config.ts
```
Expected: 1 test passed.

- [ ] **Step 5: Commit**

```bash
cd /Users/macbook_nou/Projects/promo-effect
git add backend/jest.config.ts backend/__tests__/smoke.test.ts backend/package.json backend/package-lock.json
git commit -m "feat: add Jest config for backend with smoke test"
```

---

### Task 0.4: Setup GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create CI workflow**

Create `.github/workflows/ci.yml`:
```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-and-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install frontend dependencies
        run: npm ci

      - name: Lint frontend
        run: npm run lint || true  # warn-only initially

      - name: Build frontend
        run: npm run build

      - name: Run frontend tests
        run: npm test

  backend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Install backend dependencies
        run: npm ci

      - name: Lint backend
        run: npm run lint || true

      - name: Build backend
        run: npm run build

      - name: Run backend tests
        run: npm test

  max-file-lines:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check no file exceeds 800 lines
        run: |
          LARGE_FILES=$(find . -name '*.ts' -o -name '*.tsx' | grep -v node_modules | grep -v dist | xargs wc -l | awk '$1 > 800 && !/total/' | sort -rn)
          if [ -n "$LARGE_FILES" ]; then
            echo "::warning::Files exceeding 800 lines (will be fixed in Phase 3):"
            echo "$LARGE_FILES"
          fi
```

- [ ] **Step 2: Commit**

```bash
cd /Users/macbook_nou/Projects/promo-effect
git add .github/workflows/ci.yml
git commit -m "feat: add GitHub Actions CI workflow (lint, build, test)"
```

---

### Task 0.5: Setup Pre-commit Hooks

**Files:**
- Modify: `package.json` — add husky + lint-staged
- Create: `.husky/pre-commit`

- [ ] **Step 1: Install husky + lint-staged**

```bash
cd /Users/macbook_nou/Projects/promo-effect
npm install -D husky lint-staged
```

- [ ] **Step 2: Init husky**

```bash
npx husky init
```

- [ ] **Step 3: Configure pre-commit hook**

Write `.husky/pre-commit`:
```bash
npx lint-staged
```

- [ ] **Step 4: Add lint-staged config to package.json**

Add to `package.json`:
```json
"lint-staged": {
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{json,md}": ["prettier --write"]
}
```

- [ ] **Step 5: Test hook works**

```bash
echo "// test" >> /tmp/test-hook.ts
git add -A && git stash  # save current changes
# Hook will run on next commit
```

- [ ] **Step 6: Commit**

```bash
git add .husky/ package.json package-lock.json
git commit -m "feat: add husky pre-commit hooks with lint-staged"
```

---

### Task 0.6: Enable strict TypeScript (Frontend)

**Files:**
- Modify: `tsconfig.json`

- [ ] **Step 1: Update tsconfig.json**

In `tsconfig.json`, make these changes:
1. Add `"strict": true`
2. Remove `"experimentalDecorators": true`
3. Remove `"useDefineForClassFields": false`

Result:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "strict": true,
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "types": ["node"],
    "moduleResolution": "bundler",
    "isolatedModules": true,
    "moduleDetection": "force",
    "allowJs": true,
    "jsx": "react-jsx",
    "paths": {
      "@/*": ["./*"]
    },
    "allowImportingTsExtensions": true,
    "noEmit": true
  }
}
```

- [ ] **Step 2: Run build to find strict errors**

```bash
cd /Users/macbook_nou/Projects/promo-effect && npx tsc --noEmit 2>&1 | head -50
```
Expected: TypeScript strict errors. Fix them iteratively.

- [ ] **Step 3: Fix strict TypeScript errors**

Common fixes needed:
- Add explicit types where `any` is inferred
- Add null checks for optional values
- Add type annotations to function parameters

Fix errors until `npx tsc --noEmit` passes.

- [ ] **Step 4: Verify build passes**

```bash
npm run build
```
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add tsconfig.json $(git diff --name-only)
git commit -m "feat: enable strict TypeScript in frontend, fix type errors"
```

---

### Task 0.7: Unify TypeScript Versions

**Files:**
- Modify: `backend/package.json`

- [ ] **Step 1: Update backend TypeScript to match frontend**

```bash
cd /Users/macbook_nou/Projects/promo-effect/backend
npm install -D typescript@~5.8.2
```

- [ ] **Step 2: Verify backend still builds**

```bash
cd /Users/macbook_nou/Projects/promo-effect/backend && npm run build
```
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
cd /Users/macbook_nou/Projects/promo-effect
git add backend/package.json backend/package-lock.json
git commit -m "chore: align backend TypeScript to 5.8 matching frontend"
```

---

### Task 0.8: Migrate to Vite Standard Env Vars

**Files:**
- Modify: `vite.config.ts` — remove `define` block, add Tailwind plugin
- Modify: any files using `process.env.*` in frontend

- [ ] **Step 1: Find all frontend `process.env` usage**

```bash
cd /Users/macbook_nou/Projects/promo-effect
grep -r "process\.env" --include="*.ts" --include="*.tsx" -l | grep -v node_modules | grep -v backend | grep -v dist
```

- [ ] **Step 2: Update vite.config.ts**

Replace entire `vite.config.ts`:
```typescript
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
```

Key changes:
- Removed `define` block (no more `process.env.GEMINI_API_KEY` in frontend)
- Added `tailwindcss()` plugin (was missing)
- Removed `loadEnv` import (not needed)
- Removed `mode` parameter

- [ ] **Step 3: Replace any `process.env` references in frontend code**

Replace with `import.meta.env.VITE_*` equivalent. If any frontend file references `process.env.API_KEY` or `process.env.GEMINI_API_KEY`, remove them (Gemini calls go through backend API already).

- [ ] **Step 4: Verify build passes**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add vite.config.ts $(git diff --name-only)
git commit -m "fix: migrate to Vite standard env vars, add Tailwind plugin, remove Gemini key from frontend"
```

---

### Task 0.9: Fix Dependency Placement

**Files:**
- Modify: `package.json` — move/remove misplaced deps

- [ ] **Step 1: Remove @google/genai from frontend**

```bash
cd /Users/macbook_nou/Projects/promo-effect
npm uninstall @google/genai
```

- [ ] **Step 2: Remove pdf-parse from frontend (backend-only concern)**

```bash
npm uninstall pdf-parse
```

- [ ] **Step 3: Move @types/leaflet to devDependencies**

```bash
npm uninstall @types/leaflet && npm install -D @types/leaflet
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: remove @google/genai and pdf-parse from frontend, fix @types/leaflet placement"
```

---

## PHASE 1: SECURITY & HARDENING

---

### Task 1.1: Enable Rate Limiting on Auth

**Files:**
- Modify: `backend/src/modules/auth/auth.controller.ts:11`

- [ ] **Step 1: Uncomment registerLimiter**

In `backend/src/modules/auth/auth.controller.ts`, line 11, change:
```typescript
router.post('/register', /* registerLimiter, */ async (req: Request, res: Response) => {
```
to:
```typescript
router.post('/register', registerLimiter, async (req: Request, res: Response) => {
```

Also remove the TODO comment on line 10.

- [ ] **Step 2: Verify rate limit middleware exists and is properly configured**

```bash
cat /Users/macbook_nou/Projects/promo-effect/backend/src/middleware/rateLimit.middleware.ts
```

Check: `registerLimiter` should have reasonable limits (e.g., 5 requests per 15 min).

- [ ] **Step 3: Verify backend builds**

```bash
cd /Users/macbook_nou/Projects/promo-effect/backend && npm run build
```

- [ ] **Step 4: Commit**

```bash
cd /Users/macbook_nou/Projects/promo-effect
git add backend/src/modules/auth/auth.controller.ts
git commit -m "fix: enable rate limiting on register endpoint (was disabled for dev)"
```

---

### Task 1.2: Remove Gemini API Key from Frontend Bundle

**Note:** This was largely done in Task 0.8 + 0.9. This task verifies completeness.

**Files:**
- Verify: `vite.config.ts` — no `define` with API keys
- Verify: `package.json` — no `@google/genai`
- Verify: `services/geminiService.ts` — uses backend API, not direct Gemini

- [ ] **Step 1: Verify no API keys in frontend code**

```bash
cd /Users/macbook_nou/Projects/promo-effect
grep -r "GEMINI_API_KEY\|API_KEY\|genai\|GoogleGenerativeAI" --include="*.ts" --include="*.tsx" -l | grep -v node_modules | grep -v backend | grep -v dist
```
Expected: Only `services/geminiService.ts` (which calls backend API, not Gemini directly).

- [ ] **Step 2: Verify geminiService.ts uses backend API**

```bash
grep -n "import.*@google" services/geminiService.ts
```
Expected: Zero results. The file should only import from `./api`.

- [ ] **Step 3: Build and check bundle for leaks**

```bash
npm run build
grep -r "AIza\|genai\|generativeai" dist/ 2>/dev/null || echo "CLEAN: No API keys in bundle"
```
Expected: "CLEAN: No API keys in bundle"

- [ ] **Step 4: Commit (if any changes needed)**

```bash
git add -A && git diff --cached --stat
# Only commit if there are changes
```

---

### Task 1.3: HTTPS Preparation

**Files:**
- Document: server-level HTTPS config (not app code)

**Note:** HTTPS is configured at the reverse proxy/server level (nginx, Caddy, or similar), not in Express directly. This task documents what needs to happen on server 141.227.180.43.

- [ ] **Step 1: Check current server setup**

SSH into server and check if nginx/Caddy is installed:
```bash
ssh ubuntu@141.227.180.43 "which nginx; which caddy; ls /etc/nginx/sites-enabled/ 2>/dev/null"
```

- [ ] **Step 2: Plan SSL setup**

Option A (recommended): Install Caddy (automatic HTTPS with Let's Encrypt)
Option B: nginx + certbot

If domain `promo-efect.md` or similar is pointed at 141.227.180.43:
```bash
# On server:
sudo apt install caddy
# Configure Caddy to proxy to port 3000 (frontend) and 3001 (backend)
```

If no domain yet, use self-signed cert for now and document the TODO.

- [ ] **Step 3: Update backend CORS and frontend API URL for HTTPS**

Once HTTPS is active, update:
- `backend/.env`: `FRONTEND_URL=https://promo-efect.md`
- `frontend/.env.production`: `VITE_API_URL=https://promo-efect.md/api`

- [ ] **Step 4: Commit any local config changes**

```bash
cd /Users/macbook_nou/Projects/promo-effect
git add backend/.env.example .env.production
git commit -m "docs: prepare HTTPS config for production deployment"
```

---

### Task 1.4: CORS from Environment Variables (Spec Task 1.4)

**Files:**
- Modify: `backend/src/app.ts:37-68`
- Modify: `backend/.env.example`

- [ ] **Step 1: Read current CORS config**

```bash
sed -n '37,68p' /Users/macbook_nou/Projects/promo-effect/backend/src/app.ts
```

- [ ] **Step 2: Replace hardcoded CORS with env var**

In `backend/src/app.ts`, replace the CORS origin function with:
```typescript
// CORS configuration
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

// Always allow the frontend URL
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
      return callback(null, true);
    }

    // Allow localhost in development
    if (process.env.NODE_ENV === 'development' && /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)/.test(origin)) {
      return callback(null, true);
    }

    callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
```

- [ ] **Step 3: Add ALLOWED_ORIGINS to .env.example**

Add to `backend/.env.example`:
```
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,http://141.227.180.43
```

- [ ] **Step 4: Build and verify**

```bash
cd /Users/macbook_nou/Projects/promo-effect/backend && npm run build
```

- [ ] **Step 5: Commit**

```bash
cd /Users/macbook_nou/Projects/promo-effect
git add backend/src/app.ts backend/.env.example
git commit -m "fix: move CORS origins to env var, remove hardcoded IPs"
```

---

### Task 1.5: Filter User Fields on Login Response

**Files:**
- Create: `backend/src/utils/sanitize.ts`
- Modify: `backend/src/modules/auth/auth.service.ts`

- [ ] **Step 1: Create sanitizeUser utility**

Create `backend/src/utils/sanitize.ts`:
```typescript
import { User } from '@prisma/client';

/**
 * Remove sensitive fields from user object before sending to client.
 */
export function sanitizeUser(user: User) {
  const { password, twoFactorSecret, ...safe } = user;
  return safe;
}
```

- [ ] **Step 2: Find where user objects are returned in auth service**

```bash
grep -n "return.*user\|res.*json.*user" /Users/macbook_nou/Projects/promo-effect/backend/src/modules/auth/auth.service.ts | head -20
```

- [ ] **Step 3: Apply sanitizeUser to all auth responses**

Import and wrap every `user` return with `sanitizeUser(user)` in auth.service.ts and auth.controller.ts.

- [ ] **Step 4: Build and verify**

```bash
cd /Users/macbook_nou/Projects/promo-effect/backend && npm run build
```

- [ ] **Step 5: Commit**

```bash
cd /Users/macbook_nou/Projects/promo-effect
git add backend/src/utils/sanitize.ts backend/src/modules/auth/auth.service.ts backend/src/modules/auth/auth.controller.ts
git commit -m "fix: filter sensitive fields (password, 2FA secret) from auth responses"
```

---

### Task 1.6: Audit dangerouslySetInnerHTML

**Files:**
- Modify: files containing `dangerouslySetInnerHTML`

- [ ] **Step 1: Find all instances**

```bash
cd /Users/macbook_nou/Projects/promo-effect
grep -rn "dangerouslySetInnerHTML" --include="*.tsx" --include="*.ts" | grep -v node_modules
```

- [ ] **Step 2: Evaluate each instance**

For each result, check if it's:
- Inline CSS (safe to replace with Tailwind class or `<style>` tag)
- User content (XSS risk — must replace)
- Static content (low risk but should still be replaced)

- [ ] **Step 3: Replace with safe alternatives**

Replace `dangerouslySetInnerHTML` with Tailwind classes, CSS modules, or `<style>` JSX.

- [ ] **Step 4: Verify build + visual check**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add $(git diff --name-only)
git commit -m "fix: remove dangerouslySetInnerHTML, replace with safe CSS alternatives"
```

---

### Task 1.7: JWT_SECRET Strength Validation

**Files:**
- Modify: `backend/src/server.ts`

- [ ] **Step 1: Read current server.ts startup**

```bash
head -30 /Users/macbook_nou/Projects/promo-effect/backend/src/server.ts
```

- [ ] **Step 2: Add JWT_SECRET validation at startup**

Add to `backend/src/server.ts`, before the server starts listening:
```typescript
// Validate critical environment variables
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET must be at least 32 characters');
  process.exit(1);
}
if (JWT_SECRET === 'your-super-secret-jwt-key-change-in-production') {
  console.error('FATAL: JWT_SECRET is still the default placeholder. Change it!');
  process.exit(1);
}
```

- [ ] **Step 3: Build**

```bash
cd /Users/macbook_nou/Projects/promo-effect/backend && npm run build
```

- [ ] **Step 4: Commit**

```bash
cd /Users/macbook_nou/Projects/promo-effect
git add backend/src/server.ts
git commit -m "fix: add JWT_SECRET strength validation at startup"
```

---

### Task 1.8: Verify Helmet.js Configuration

**Files:**
- Verify: `backend/src/app.ts`

- [ ] **Step 1: Check Helmet config**

```bash
grep -A5 "helmet" /Users/macbook_nou/Projects/promo-effect/backend/src/app.ts
```

- [ ] **Step 2: Ensure Helmet is properly configured**

If Helmet is just `app.use(helmet())` with no options, enhance it:
```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],  // needed for Vite
      styleSrc: ["'self'", "'unsafe-inline'"],    // needed for Tailwind
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.FRONTEND_URL || 'http://localhost:3000'],
    },
  },
  crossOriginEmbedderPolicy: false,  // needed for external images
}));
```

- [ ] **Step 3: Build and verify**

```bash
cd /Users/macbook_nou/Projects/promo-effect/backend && npm run build
```

- [ ] **Step 4: Commit (if changes made)**

```bash
cd /Users/macbook_nou/Projects/promo-effect
git add backend/src/app.ts
git commit -m "fix: enhance Helmet.js security headers configuration"
```

---

### Task 1.9: CSRF Protection

**Files:**
- Modify: `backend/src/app.ts`
- Modify: `backend/package.json`

- [ ] **Step 1: Install CSRF library + cookie-parser (required dependency)**

```bash
cd /Users/macbook_nou/Projects/promo-effect/backend
npm install csrf-csrf cookie-parser
npm install -D @types/cookie-parser
```

- [ ] **Step 2: Read csrf-csrf docs and configure**

Add cookie-parser + CSRF middleware to `backend/src/app.ts`:
```typescript
import cookieParser from 'cookie-parser';
import { doubleCsrf } from 'csrf-csrf';

// Add cookie-parser BEFORE CSRF middleware
app.use(cookieParser());

const { doubleCsrfProtection, generateToken } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET || process.env.JWT_SECRET || 'csrf-secret',
  cookieName: '__csrf',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
  },
  getTokenFromRequest: (req) => req.headers['x-csrf-token'] as string,
});

// Apply CSRF to state-changing routes
app.use('/api', doubleCsrfProtection);

// Endpoint to get CSRF token
app.get('/api/csrf-token', (req, res) => {
  res.json({ token: generateToken(req, res) });
});
```

- [ ] **Step 3: Build**

```bash
cd /Users/macbook_nou/Projects/promo-effect/backend && npm run build
```

- [ ] **Step 4: Commit**

```bash
cd /Users/macbook_nou/Projects/promo-effect
git add backend/src/app.ts backend/package.json backend/package-lock.json
git commit -m "feat: add CSRF protection with double-submit cookie pattern"
```

---

### Task 1.10: Backend Input Validation Audit

**Files:**
- Modify: various backend route files

- [ ] **Step 1: Find all POST/PUT/PATCH/DELETE routes without Zod validation**

```bash
cd /Users/macbook_nou/Projects/promo-effect/backend
grep -rn "router\.\(post\|put\|patch\|delete\)" src/modules/ --include="*.ts" | head -30
```

- [ ] **Step 2: Check which routes already use Zod**

```bash
grep -rn "\.parse\|\.safeParse\|z\.\|zod" src/modules/ --include="*.ts" | head -20
```

- [ ] **Step 3: Add Zod validation to unprotected endpoints**

For each route accepting user input without validation, add a Zod schema. Priority: auth routes, booking creation, invoice creation.

Example pattern:
```typescript
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100),
});

router.post('/register', registerLimiter, async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten() });
  }
  // use parsed.data instead of req.body
});
```

- [ ] **Step 4: Build and verify**

```bash
cd /Users/macbook_nou/Projects/promo-effect/backend && npm run build
```

- [ ] **Step 5: Commit**

```bash
cd /Users/macbook_nou/Projects/promo-effect
git add backend/src/
git commit -m "fix: add Zod input validation on all POST/PUT endpoints"
```

---

### Task 1.11: Dependency Audit

**Files:**
- Both `package.json` files

- [ ] **Step 1: Audit frontend**

```bash
cd /Users/macbook_nou/Projects/promo-effect && npm audit
```

- [ ] **Step 2: Audit backend**

```bash
cd /Users/macbook_nou/Projects/promo-effect/backend && npm audit
```

- [ ] **Step 3: Fix vulnerabilities**

```bash
cd /Users/macbook_nou/Projects/promo-effect && npm audit fix
cd /Users/macbook_nou/Projects/promo-effect/backend && npm audit fix
```

- [ ] **Step 4: Verify builds still pass**

```bash
cd /Users/macbook_nou/Projects/promo-effect && npm run build
cd /Users/macbook_nou/Projects/promo-effect/backend && npm run build
```

- [ ] **Step 5: Commit**

```bash
cd /Users/macbook_nou/Projects/promo-effect
git add package.json package-lock.json backend/package.json backend/package-lock.json
git commit -m "fix: resolve npm audit vulnerabilities"
```

---

## PHASE 2: CLEANUP

---

### Task 2.1: Delete Empty Shell Scripts

**Files to delete:**
- `fix-gmail-schema.sh`
- `get-gmail-url.py`
- `get-gmail-url.sh`
- `setup-gmail.sh`
- `start-and-test.sh`
- `test-gmail-oauth.sh`
- `test-gmail-oauth-complet.sh`
- `test-manual.sh`
- `safe-schema-push.sh`

- [ ] **Step 1: Verify all files are empty**

```bash
cd /Users/macbook_nou/Projects/promo-effect
wc -c fix-gmail-schema.sh get-gmail-url.py get-gmail-url.sh setup-gmail.sh start-and-test.sh test-gmail-oauth.sh test-gmail-oauth-complet.sh test-manual.sh safe-schema-push.sh 2>/dev/null
```
Expected: All 0 bytes.

- [ ] **Step 2: Delete them**

```bash
rm -f fix-gmail-schema.sh get-gmail-url.py get-gmail-url.sh setup-gmail.sh start-and-test.sh test-gmail-oauth.sh test-gmail-oauth-complet.sh test-manual.sh safe-schema-push.sh
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove 9 empty shell/python scripts"
```

---

### Task 2.2: Delete Empty Markdown Files

**Files to delete (10 files):**
- `IMPLEMENTATION_STATUS.md`
- `START_AICI_RO.md`
- `GMAIL_OAUTH_SETUP_SUMMARY.md`
- `CONFIGURARE_COMPLETA_PAS_CU_PAS.md`
- `FRONTEND_CLEANUP.md`
- `GMAIL_OAUTH_QUICKSTART.md`
- `GMAIL_OAUTH_TESTING_GUIDE.md`
- `VERIFICARE_GMAIL_OAUTH_RO.md`
- `ONBOARDING-OLEG.md`
- `GMAIL_OAUTH_PRODUCTION_DEPLOYMENT.md`

- [ ] **Step 1: Verify all files are empty**

```bash
cd /Users/macbook_nou/Projects/promo-effect
wc -c IMPLEMENTATION_STATUS.md START_AICI_RO.md GMAIL_OAUTH_SETUP_SUMMARY.md CONFIGURARE_COMPLETA_PAS_CU_PAS.md FRONTEND_CLEANUP.md GMAIL_OAUTH_QUICKSTART.md GMAIL_OAUTH_TESTING_GUIDE.md VERIFICARE_GMAIL_OAUTH_RO.md ONBOARDING-OLEG.md GMAIL_OAUTH_PRODUCTION_DEPLOYMENT.md 2>/dev/null
```

- [ ] **Step 2: Also check for backend/README_SETUP.md**

```bash
wc -c backend/README_SETUP.md 2>/dev/null
```

- [ ] **Step 3: Delete all empty markdown files**

```bash
rm -f IMPLEMENTATION_STATUS.md START_AICI_RO.md GMAIL_OAUTH_SETUP_SUMMARY.md CONFIGURARE_COMPLETA_PAS_CU_PAS.md FRONTEND_CLEANUP.md GMAIL_OAUTH_QUICKSTART.md GMAIL_OAUTH_TESTING_GUIDE.md VERIFICARE_GMAIL_OAUTH_RO.md ONBOARDING-OLEG.md GMAIL_OAUTH_PRODUCTION_DEPLOYMENT.md backend/README_SETUP.md
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove 11 empty markdown files"
```

---

### Task 2.3: Delete Committed .eml File

**File:** `AKKNBO26001375 ASG 202602049.eml` (420KB)

- [ ] **Step 1: Delete the file**

```bash
cd /Users/macbook_nou/Projects/promo-effect
rm -f "AKKNBO26001375 ASG 202602049.eml"
```

- [ ] **Step 2: Also delete COMPLETE_ANALYSIS_REPORT.json if it's debug data**

```bash
head -5 COMPLETE_ANALYSIS_REPORT.json 2>/dev/null
```
If it's debug/temp data, delete it too.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove committed .eml file and temp analysis data"
```

---

### Task 2.4: Remove Stub Components

**Files to delete:**
- `components/Header.tsx` (181B — contains "obsolete" comment)
- `components/Sidebar.tsx` (181B — contains "obsolete" comment)
- `components/Dashboard.tsx` (257B — contains "no longer needed" comment)

- [ ] **Step 1: Verify NOT imported anywhere**

```bash
cd /Users/macbook_nou/Projects/promo-effect
# Check Header (but NOT PublicHeader)
grep -r "from.*['\"].*\/Header['\"]" --include="*.tsx" --include="*.ts" | grep -v PublicHeader | grep -v node_modules

# Check Sidebar
grep -r "from.*['\"].*\/Sidebar['\"]" --include="*.tsx" --include="*.ts" | grep -v node_modules

# Check Dashboard (but NOT MainDashboard, AdminDashboard, etc.)
grep -r "from.*['\"].*\/Dashboard['\"]" --include="*.tsx" --include="*.ts" | grep -v MainDashboard | grep -v AdminDashboard | grep -v AgentPricesDashboard | grep -v node_modules
```
Expected: Zero results for all three.

- [ ] **Step 2: Delete stub components**

```bash
rm -f components/Header.tsx components/Sidebar.tsx components/Dashboard.tsx
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove 3 obsolete stub components (Header, Sidebar, Dashboard)"
```

---

### Task 2.5: Evaluate GlassCard.tsx

**File:** `components/ui/GlassCard.tsx`

- [ ] **Step 1: Check if GlassCard is used anywhere**

```bash
cd /Users/macbook_nou/Projects/promo-effect
grep -r "GlassCard" --include="*.tsx" --include="*.ts" | grep -v "GlassCard.tsx" | grep -v node_modules
```

- [ ] **Step 2: Decision**

If zero results → delete it.
If used somewhere → keep it (it's a valid 22-line component, not a stub).

- [ ] **Step 3: Act on decision**

```bash
# Only if unused:
rm -f components/ui/GlassCard.tsx
```

- [ ] **Step 4: Commit (if deleted)**

```bash
git add -A
git commit -m "chore: remove unused GlassCard component"
```

---

### Task 2.6: Clean Backend Dead Code

**Files to check:**
- `backend/add-columns-direct.js`
- `backend/add-gmail-columns.sh`
- `backend/add-gmail-columns.sql`
- `backend/add-incoming-email-table.js`
- `backend/create-admin-interactive.sh`

- [ ] **Step 1: Check if files exist and are empty**

```bash
cd /Users/macbook_nou/Projects/promo-effect
ls -la backend/add-columns-direct.js backend/add-gmail-columns.sh backend/add-gmail-columns.sql backend/add-incoming-email-table.js backend/create-admin-interactive.sh 2>/dev/null
```

- [ ] **Step 2: Delete empty/obsolete backend scripts**

```bash
rm -f backend/add-columns-direct.js backend/add-gmail-columns.sh backend/add-gmail-columns.sql backend/add-incoming-email-table.js backend/create-admin-interactive.sh
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove obsolete backend setup/migration scripts"
```

---

### Task 2.7: Update .gitignore

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Add missing patterns to .gitignore**

Append to `.gitignore`:
```
# Temp files
*.eml
*.log
COMPLETE_ANALYSIS_REPORT.json

# IDE
.vscode/
.idea/

# Coverage
coverage/
backend/coverage/

# Claude
.claude/
```

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: update .gitignore with temp files, coverage, IDE patterns"
```

---

## VERIFICATION GATES

### Phase 0 Gate Checklist:
- [ ] `npm run lint` runs (frontend)
- [ ] `npm run build` succeeds (frontend)
- [ ] `npm test` passes (frontend — smoke test)
- [ ] `cd backend && npm run build` succeeds
- [ ] `cd backend && npm test` passes (smoke test)
- [ ] `.github/workflows/ci.yml` exists
- [ ] `.husky/pre-commit` exists
- [ ] `strict: true` in `tsconfig.json`
- [ ] No `process.env` in frontend code
- [ ] No `@google/genai` in frontend `package.json`
- [ ] `@types/leaflet` in devDependencies
- [ ] TypeScript version aligned (both ~5.8)

### Phase 1 Gate Checklist:
- [ ] `registerLimiter` uncommented in auth.controller.ts
- [ ] HTTPS plan documented (or active if domain is ready)
- [ ] No API keys in frontend bundle: `grep -r "AIza\|genai" dist/` returns nothing
- [ ] CORS uses `ALLOWED_ORIGINS` env var (no hardcoded IPs in app.ts)
- [ ] Login response excludes `password` and `twoFactorSecret`
- [ ] Zero `dangerouslySetInnerHTML` in codebase (or justified exceptions)
- [ ] JWT_SECRET validation at startup rejects weak/placeholder values
- [ ] Helmet configured with CSP headers
- [ ] CSRF middleware active on state-changing routes
- [ ] Zod validation on auth + booking + invoice endpoints
- [ ] `npm audit` shows zero critical/high (both packages)

### Phase 2 Gate Checklist:
- [ ] Zero empty files: `find . -maxdepth 2 -empty -name "*.sh" -o -empty -name "*.md" -o -empty -name "*.py" | grep -v node_modules` returns nothing
- [ ] No stub components: `grep -r "export {};" components/` returns nothing
- [ ] No `.eml` files in repo
- [ ] `npm run build` still passes
- [ ] No broken imports (build passes)
