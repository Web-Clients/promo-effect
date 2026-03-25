# Promo-Effect Platform Completion Strategy

**Date:** 2026-03-25
**Status:** Approved
**Platform:** Promo-Effect Logistics — Import Containere China-Moldova
**Stack:** React 19 + Vite 6 + TypeScript (frontend ~5.8.2, backend ^5.4.5) | Express + Prisma + PostgreSQL
**Server:** 141.227.180.43 | Up to 25 users, all 8 roles active
**Languages:** RO, RU, EN
**Current completion:** ~60%

---

## Context

A 50-point audit revealed the following gaps in the production platform:

| Category | Current State |
|----------|--------------|
| UI/Frontend | 85% complete |
| Backend API | 75% complete |
| Security | 50% — rate limiting disabled, HTTP only, hardcoded CORS, **Gemini API key leaked to frontend** |
| Testing | 0% — zero test files |
| CI/CD | 0% — no pipelines |
| i18n | 0% — all hardcoded Romanian |
| Accessibility | 10% — 1 ARIA attribute total |
| SEO | 60% — no sitemap, no robots.txt |
| Performance | 40% — minimal lazy loading, 77K-line files |
| Deployment readiness | 65% |

### Critical Issues
- `PublicPages.tsx`: 77,045 lines (single file)
- `PriceCalculator.tsx`: 55,441 lines
- `AdminPricingPanel.tsx`: 48,042 lines
- `TrackingView.tsx`: 35,807 lines
- `ContainersInTransit.tsx`: 35,329 lines
- 20+ TODO comments marking unimplemented backend features
- 14 empty shell scripts, 10 empty markdown files, 1 committed .eml file (420KB)
- No ErrorBoundary, no 404 page, no Sentry integration
- Rate limiting commented out on auth endpoints
- Server runs HTTP (no HTTPS)
- Frontend TypeScript strict mode disabled (backend already has `strict: true`)
- **SECURITY: `@google/genai` SDK + `GEMINI_API_KEY` injected into frontend bundle via `vite.config.ts` `define`** — API key exposed to any user
- **SECURITY: No CSRF protection**
- **ARCHITECTURE: `process.env.*` used via Vite `define` instead of standard `import.meta.env.VITE_*`**

---

## Strategy: Foundation First

**Principle:** Build on a solid base. Each phase depends on the previous one being complete. No phase is skipped.

**Methodology:**
1. Every phase has a **verification gate** — measurable criteria that must pass before advancing
2. Refactoring happens BEFORE i18n and testing (so we work on clean, small files)
3. Security comes first (production system with real users)
4. Each phase produces a commit (or series of commits) that can be verified independently
5. **Prisma migrations on production require a DB backup BEFORE running** (documented in Phase 5)

---

## Phase 0: Infrastructure Setup

**Goal:** Linting, test runner, CI/CD minimal — the tools needed for quality work.

| Task | Details |
|------|---------|
| 0.1 Setup ESLint + Prettier | Install, configure `.eslintrc.cjs`, `.prettierrc`, integrate with Vite. **Add `"lint"` script to frontend `package.json`.** |
| 0.2 Setup Vitest (frontend) | Install `vitest` + `@testing-library/react` + `jsdom`, create `vitest.config.ts`. **Add `"test"` script to frontend `package.json`.** Note: Vitest (frontend) and Jest (backend) use separate configs — no conflict since they run in different `package.json` contexts. |
| 0.3 Setup Jest (backend) | Configure `jest.config.ts` (already in devDeps), create `__tests__/` structure |
| 0.4 Setup GitHub Actions | Workflow: lint -> build -> test on push/PR to main |
| 0.5 Setup pre-commit hooks | `husky` + `lint-staged`: lint + type-check before every commit |
| 0.6 Enable `strict: true` in frontend tsconfig | **Frontend only** — backend `tsconfig.json` already has `strict: true`. Fix all resulting TypeScript errors. Also remove `experimentalDecorators` and `useDefineForClassFields: false` if present (not needed for React). |
| 0.7 Unify TypeScript versions | Align frontend (~5.8.2) and backend (^5.4.5) to same major.minor version |
| 0.8 Migrate to Vite standard env | Replace `process.env.*` via `define` in `vite.config.ts` with standard `import.meta.env.VITE_*`. Remove the `define` block. |
| 0.9 Fix dependency placement | Move `@types/leaflet` from `dependencies` to `devDependencies`. Remove `pdf-parse` from frontend (it's a backend concern). Verify `@tailwindcss/vite` is properly loaded in `vite.config.ts` plugins array. |

**Verification Gate:**
- [ ] `npm run lint` passes with zero errors (frontend + backend)
- [ ] `npm run build` succeeds
- [ ] `npm test` runs (even with zero tests)
- [ ] GitHub Actions workflow runs on push
- [ ] Pre-commit hook blocks commits with lint errors
- [ ] `strict: true` active on both frontend and backend tsconfigs
- [ ] No `process.env` usage in frontend code (all `import.meta.env.VITE_*`)
- [ ] `@types/*` packages are in devDependencies

---

## Phase 1: Security & Hardening

**Goal:** Eliminate all critical vulnerabilities.

| Task | Details | Severity |
|------|---------|----------|
| 1.1 Enable rate limiting on auth | Uncomment `registerLimiter` in `auth.controller.ts:10`, test with rapid requests | CRITICAL |
| 1.2 **Remove Gemini API key from frontend** | Remove `@google/genai` from frontend `package.json`. Remove `VITE_GEMINI_API_KEY` from `vite.config.ts` define. **All Gemini/AI calls MUST go through backend API** (`/api/ai/parse`, `/api/ai/generate`). Create backend proxy endpoints if they don't exist. Update `geminiService.ts` to call backend API instead of Gemini directly. | CRITICAL |
| 1.3 HTTPS setup | SSL/TLS on 141.227.180.43, HTTP->HTTPS redirect | CRITICAL |
| 1.4 CORS from env vars | Move hardcoded IPs from `app.ts:50-52` to `ALLOWED_ORIGINS` env var | MEDIUM |
| 1.5 Filter user fields on login response | Create `sanitizeUser()` — exclude password hash, tokens, internal fields | MEDIUM |
| 1.6 Audit `dangerouslySetInnerHTML` | Replace with CSS modules or Tailwind classes in `LandingPage.tsx` | LOW |
| 1.7 JWT_SECRET strength validation | Add startup check: min 32 chars, not placeholder value | MEDIUM |
| 1.8 Full Helmet.js config | Verify all security headers configured properly | MEDIUM |
| 1.9 CSRF protection | Add CSRF token middleware (`csrf-csrf`, `lusca`, or double-submit cookie pattern) for state-changing endpoints. **Do NOT use `csurf` — it is deprecated.** | MEDIUM |
| 1.10 Backend input validation audit | Verify Zod schemas on ALL API endpoints that accept user input. Add where missing. | MEDIUM |
| 1.11 Dependency audit | `npm audit` on both frontend and backend, fix known vulnerabilities | MEDIUM |

**Verification Gate:**
- [ ] Rate limiting active on auth endpoints (test: 10 rapid login attempts → blocked)
- [ ] `@google/genai` NOT in frontend bundle (verify with `vite-bundle-visualizer` or `grep`)
- [ ] No API keys in frontend source code
- [ ] HTTPS functional, HTTP redirects to HTTPS
- [ ] `npm audit` shows zero critical/high vulnerabilities
- [ ] Login response does not contain password hash or tokens
- [ ] JWT_SECRET validation prevents weak secrets at startup
- [ ] CSRF tokens required on POST/PUT/DELETE endpoints
- [ ] All endpoints with user input have Zod validation

---

## Phase 2: Cleanup

**Goal:** Remove all dead code, empty files, unused stubs.

| Task | Details |
|------|---------|
| 2.1 Delete empty shell scripts | 14 files: `fix-gmail-schema.sh`, `setup-gmail.sh`, `get-gmail-url.py`, `get-gmail-url.sh`, `start-and-test.sh`, `test-gmail-oauth.sh`, `test-gmail-oauth-complet.sh`, `test-manual.sh`, `safe-schema-push.sh`, `backend/add-columns-direct.js`, `backend/add-gmail-columns.sh`, `backend/add-gmail-columns.sql`, `backend/add-incoming-email-table.js`, `backend/create-admin-interactive.sh` |
| 2.2 Delete empty markdown files | **10 files** (not 8): `IMPLEMENTATION_STATUS.md`, `START_AICI_RO.md`, `GMAIL_OAUTH_SETUP_SUMMARY.md`, `CONFIGURARE_COMPLETA_PAS_CU_PAS.md`, `FRONTEND_CLEANUP.md`, `GMAIL_OAUTH_QUICKSTART.md`, `GMAIL_OAUTH_TESTING_GUIDE.md`, `VERIFICARE_GMAIL_OAUTH_RO.md`, `ONBOARDING-OLEG.md`, `backend/README_SETUP.md` |
| 2.3 Delete committed .eml file | `AKKNBO26001375 ASG 202602049.eml` (420KB) |
| 2.4 Remove stub components | `Header.tsx` (181B), `Sidebar.tsx` (181B), `Dashboard.tsx` (257B). **Verification method:** `grep -r "from.*Header" --include="*.tsx"` to confirm not imported (note: `PublicHeader.tsx` is a DIFFERENT component — do NOT delete it) |
| 2.5 Evaluate GlassCard.tsx | 492B stub. Run `grep -r "GlassCard" --include="*.tsx"` — if zero results outside its own file, delete |
| 2.6 Clean backend dead code | Empty setup/migration scripts |
| 2.7 Update .gitignore | Add `*.eml`, temporary scripts, debug files |

**Verification Gate:**
- [ ] Zero empty files in repository
- [ ] Zero unused stub components (verified with grep)
- [ ] `npm run build` still passes
- [ ] No broken imports (verified with build + grep)

---

## Phase 3: Refactoring — Split Giant Files

**Goal:** No file exceeds 800 lines. Clear directory structure. Automated check in CI.

### Directory Structure Target:
```
components/
  pages/
    public/          -- ServiciiPage, PreturiPage, DesprePage, etc.
    dashboard/       -- MainDashboard, BookingsList, TrackingView, etc.
    admin/           -- AdminDashboard, AdminSettings, AdminPricing, etc.
    auth/            -- Login, Register, ForgotPassword, etc.
  shared/            -- PublicHeader, PublicFooter, Logo, Icons, etc.
  ui/                -- Button, Card, Input, Badge, etc.
hooks/               -- useCalculator, useTracking, useBookings, etc.
services/            -- (existing, minor reorganization)
types/               -- Split types.ts into domain-specific files
```

### Split Tasks:

| Task | Source | Output Components |
|------|--------|------------------|
| 3.1 Split `PublicPages.tsx` (77K) | Single file → 17 page components in `pages/public/`: `ServiciiPage.tsx`, `PreturiPage.tsx`, `DesprePage.tsx`, `ContactPage.tsx`, `ResursePage.tsx`, `FAQPage.tsx`, `TermeniPage.tsx`, `PoliticaPage.tsx`, `CookiesPage.tsx`, `FCLPage.tsx`, `LCLPage.tsx`, `ConsultantaPage.tsx`, `VamuirePage.tsx`, `DepozitarePage.tsx`, `CarierePage.tsx`, `CalculPromptPage.tsx`, `GhidImportPage.tsx` | 17 |
| 3.2 Split `PriceCalculator.tsx` (55K) | `CalcForm.tsx`, `CalcResults.tsx`, `CalcContainerRow.tsx`, `CalcSummary.tsx`, `CalcPDF.tsx`, hooks: `useCalculator.ts`, `useCalcForm.ts` | 7 |
| 3.3 Split `TrackingView.tsx` (35K) | `TrackingSearch.tsx`, `TrackingResults.tsx`, `TrackingFilters.tsx`, `TrackingDetail.tsx`, hook: `useTracking.ts` | 5 |
| 3.4 Split `ContainersInTransit.tsx` (35K) | `ContainerList.tsx`, `ContainerFilters.tsx`, `ContainerStats.tsx`, hook: `useContainers.ts` | 4 |
| 3.5 Split `InvoicesList.tsx` (34K) | `InvoiceTable.tsx`, `InvoiceForm.tsx`, `InvoicePDF.tsx`, `InvoiceFilters.tsx`, hook: `useInvoices.ts` | 5 |
| 3.6 Split `AdminDashboard.tsx` (25K) | `AdminStats.tsx`, `AdminCharts.tsx`, `AdminActivity.tsx` | 3 |
| 3.7 Split `AdminPricingPanel.tsx` (48K) | `PricingTable.tsx`, `PricingForm.tsx`, `PricingFilters.tsx`, `PortAdjustments.tsx`, hook: `usePricing.ts` | 5 |
| 3.8 Split `LandingPage.tsx` (24K) | `HeroSection.tsx`, `FeaturesSection.tsx`, `TestimonialsSection.tsx`, `CTASection.tsx`, `StatsSection.tsx` | 5 |
| 3.9 Split `BookingsList.tsx` (20K) | `BookingTable.tsx`, `BookingForm.tsx`, `BookingFilters.tsx`, hook: `useBookings.ts` | 4 |
| 3.10 Split `BookingDetail.tsx` (20K) | `BookingInfo.tsx`, `BookingTimeline.tsx`, `BookingDocuments.tsx`, `BookingActions.tsx` | 4 |
| 3.11 Split `AdminSettingsPage.tsx` (14K) | `EmailSettings.tsx`, `TrackingSettings.tsx`, `AISettings.tsx`, `StorageSettings.tsx`, `PaymentSettings.tsx` | 5 |
| 3.12 Split large services | `tracking.ts` (11K), `emailParser.ts` (6K) → extract helpers, types into separate files | 4 |
| 3.13 Reorganize directories | Move all files to new structure per target above | - |
| 3.14 Update App.tsx imports | Rewrite routing with new paths | - |
| 3.15 Add max-lines CI check | Script or ESLint rule: `max-lines: 800`. Add to GitHub Actions workflow to prevent regression. | - |

**Total new modules: ~68 components/hooks extracted**

**Verification Gate:**
- [ ] No `.tsx` or `.ts` file exceeds 800 lines: verified by `find . -name '*.tsx' -o -name '*.ts' | xargs wc -l | awk '$1 > 800'` returns empty
- [ ] CI check enforces max 800 lines per file
- [ ] Clear directory structure matching the target above
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] **CRITICAL: Manual test** — navigate ALL pages in browser, verify identical functionality
- [ ] All existing functionality preserved (no regressions)

---

## Phase 4: Error Handling & Stability

**Goal:** The app never shows a white screen. All errors are caught, logged, and reported.

| Task | Details |
|------|---------|
| 4.1 Create `ErrorBoundary.tsx` | Global component with fallback UI, retry button, error logging to Sentry |
| 4.2 Create 404 page | `NotFoundPage.tsx` with consistent design, home link |
| 4.3 Integrate Sentry (frontend) | `@sentry/react`, init in entry point (`index.tsx` or `main.tsx` — verify which is used), wrap ErrorBoundary |
| 4.4 Integrate Sentry (backend) | `@sentry/node`, proper error middleware in `app.ts` |
| 4.5 Implement backend error middleware | Replace placeholder at `app.ts:145` with real handler: structured logging, error sanitization (no stack traces to client), proper HTTP status codes, Sentry capture |
| 4.6 Complete Winston logging | Configure transports: console (dev), file rotation (prod), Sentry (errors only) |
| 4.7 Consistent loading states | Verify all components show skeleton/spinner during data fetch |
| 4.8 Toast error handling | Verify all catch blocks display useful messages to user |
| 4.9 Network error handling | Retry logic on critical API calls, offline detection banner |

**Verification Gate:**
- [ ] ErrorBoundary wraps all routes in App.tsx
- [ ] 404 page renders for unknown URLs (test: `/nonexistent-page`)
- [ ] Sentry receives test error from frontend (verify in Sentry dashboard)
- [ ] Sentry receives test error from backend (verify in Sentry dashboard)
- [ ] Winston logs to file in production mode
- [ ] Simulate network error — app shows recovery UI, not white screen
- [ ] Simulate component crash — ErrorBoundary catches it, shows fallback

---

## Phase 5: Backend Completion (TODO Items)

**Goal:** All promised features are implemented.

**IMPORTANT: Database Migration Strategy**
Tasks 5.3-5.5 require Prisma schema changes and migrations on the production database.
**Before running ANY migration on production:**
1. Create a full PostgreSQL backup: `pg_dump -Fc promo_effect > backup_$(date +%Y%m%d).dump`
2. Test migration on a local copy first
3. Run migration during low-traffic window
4. Verify rollback procedure works

### Priority HIGH (core functionality broken without these):
**Order matters: 5.1 and 5.2 are independent. 5.3 MUST be done before 5.4 and 5.5.**

| Task | Location | Details |
|------|----------|---------|
| 5.1 Landing leads — create DB record | `landing.routes.ts:52` | Contact form submissions must be saved |
| 5.2 Tracking webhook — real user ID | `tracking-webhook.service.ts:206,240` | Replace hardcoded placeholder with actual user resolution |
| 5.3 Client-User relationship | `tracking.routes.ts:728` | Add Prisma relation + migration. **Must complete before 5.4 and 5.5.** |
| 5.4 Reports — clientId from user | `reports.routes.ts:30,72` | Use new Client-User relation from 5.3 |
| 5.5 Invoice — clientId relation | `invoices.service.ts:425` | Use new Client-User relation from 5.3 |

### Priority MEDIUM (important but not blocking):

| Task | Location | Details |
|------|----------|---------|
| 5.6 UserProfile — real 2FA status | `UserProfile.tsx:39` | Fetch 2FA enabled status from backend API instead of local state |
| 5.7 AI parsing with Gemini | `tracking.routes.ts:438` | Implement email/document AI parsing via backend Gemini service |
| 5.8 Gmail OAuth test | `settings.service.ts:237` | "Test connection" button in admin email settings |
| 5.9 SeaRates API test | `settings.service.ts:243` | "Test connection" button in admin tracking settings |

### Priority LOW (deferred — project owner decides before Phase 5 starts):

| Task | Location | Details | Decision Criteria |
|------|----------|---------|-------------------|
| 5.10 Azure Blob storage | `storage.service.ts:152` | Implement Azure upload/delete/get | Only if production uses Azure storage |
| 5.11 GCS storage | `storage.service.ts:161` | Implement GCS upload/delete/get | Only if production uses Google Cloud |
| 5.12 Push notifications (FCM) | `notification.service.ts:133` | Firebase Cloud Messaging integration | Only if mobile app exists/planned |
| 5.13 Scheduled notification queue | `notification.service.ts:336` | Bull queue for deferred notifications | Only if scheduled sends are needed |

**Verification Gate:**
- [ ] Contact form submissions saved in DB and visible in admin panel
- [ ] Tracking webhooks create events with real user IDs (not placeholders)
- [ ] Client-User relationship works: client sees only their bookings/invoices
- [ ] Reports filter by client correctly (test with 2+ clients)
- [ ] 2FA toggle in UserProfile reflects actual backend state
- [ ] AI parsing returns structured data from email text
- [ ] Gmail OAuth test button connects successfully (or shows clear error)
- [ ] SeaRates test button connects successfully (or shows clear error)
- [ ] All HIGH and MEDIUM tasks complete
- [ ] Backend integration tests pass for new functionality
- [ ] Database migration tested on local before production

---

## Phase 6: Internationalization (i18n)

**Goal:** Full RO/RU/EN support. Zero hardcoded strings.

| Task | Details |
|------|---------|
| 6.1 Setup i18next | Install `i18next` + `react-i18next`, configure `i18n.ts` with lazy loading per namespace |
| 6.2 Translation file structure | `locales/{ro,ru,en}/{common,auth,dashboard,admin,public,forms,errors}.json` |
| 6.3 Language switcher UI | Component in header + user profile settings, persist to localStorage + user.language in backend |
| 6.4 Extract public page strings | All 17 public page components — use `useTranslation('public')` |
| 6.5 Extract dashboard strings | All dashboard components — `useTranslation('dashboard')` |
| 6.6 Extract admin strings | All admin components — `useTranslation('admin')` |
| 6.7 Extract form strings | Labels, placeholders, validation messages, error messages |
| 6.8 Backend translations | Email templates, notification text, API error messages — use user's `language` preference |
| 6.9 Static content translation | FAQ, Terms, Privacy Policy, Cookies (legal review needed for RU/EN) |
| 6.10 Date/number formatting | `Intl.DateTimeFormat` and `Intl.NumberFormat` per locale |
| 6.11 Complete RU translations | Full `ru/*.json` for all namespaces |
| 6.12 Complete EN translations | Full `en/*.json` for all namespaces |

**Verification Gate:**
- [ ] Language switcher works and persists preference (localStorage + backend)
- [ ] Every visible string in the app comes from translation files (grep for hardcoded Romanian strings)
- [ ] All 3 languages display correctly on every page
- [ ] Date/number formats adapt to locale
- [ ] Backend emails sent in user's preferred language
- [ ] **CRITICAL: Visual review** of every page in all 3 languages (check truncation, text overflow, layout breaks)

---

## Phase 7: Testing

**Goal:** Sufficient test coverage for safe deployments. Target: >60% on critical paths.

**Dependencies:** Phases 3 (refactored code), 4 (error handling), 5 (backend complete), AND 6 (i18n — so tests cover translated UI).

| Task | Details |
|------|---------|
| 7.1 Unit tests — UI components | All `ui/` components: Button, Card, Input, Badge, Switch, Tabs, Table, Toast, HsCodeSelector |
| 7.2 Unit tests — Auth flows | Login, Register, ForgotPassword, ResetPassword, 2FA — mock API calls |
| 7.3 Unit tests — Services | API service layer with mocks: auth, bookings, calculator, tracking |
| 7.4 Unit tests — Hooks | Custom hooks: useCalculator, useTracking, useBookings, useInvoices, usePricing |
| 7.5 Integration tests — Backend auth | Full auth flow: register -> verify email -> login -> refresh -> 2FA |
| 7.6 Integration tests — Backend CRUD | Bookings, Clients, Invoices: create/read/update/delete with test DB |
| 7.7 Integration tests — Backend pricing | Calculator, pricing rules, port adjustments |
| 7.8 Integration tests — Backend tracking | Container tracking, webhook processing, event creation |
| 7.9 E2E smoke tests | Playwright: login -> dashboard -> create booking -> track container -> switch language -> logout |
| 7.10 CI/CD test integration | Add coverage reporting, set minimum threshold 60%, block PR merge if below |

**Verification Gate:**
- [ ] All unit tests pass (frontend + backend)
- [ ] All integration tests pass
- [ ] E2E smoke test passes (includes language switch)
- [ ] Coverage > 60% on critical paths: auth, bookings, calculator, tracking
- [ ] CI/CD runs all tests on every PR and blocks merge on failure
- [ ] Tests complete in < 5 minutes total

---

## Phase 8: Performance

**Goal:** Fast load, instant response. Lighthouse Performance > 80.

| Task | Details |
|------|---------|
| 8.1 Route-based code splitting | `React.lazy()` + `Suspense` on every route in `App.tsx` |
| 8.2 Lazy loading images | `loading="lazy"` on all `<img>` in public pages |
| 8.3 `React.memo()` on heavy components | Tables, lists, charts, maps |
| 8.4 Bundle analysis & optimization | `vite-bundle-visualizer`, eliminate unused imports, verify tree-shaking |
| 8.5 Font optimization | Self-host Inter + Poppins, `font-display: swap`, subset to latin + cyrillic (for RU) |
| 8.6 API response caching | Implement SWR or TanStack Query for frequent GETs: ports, shipping lines, HS codes. Verify cache hits on repeated navigation. |
| 8.7 Image optimization | Convert PNG -> WebP, compress, serve responsive sizes |
| 8.8 Preload critical resources | `<link rel="preload">` for fonts, critical CSS |
| 8.9 Database connection pooling | Configure Prisma connection pool limits appropriate for 25 users + Bull jobs |

**Verification Gate:**
- [ ] Lighthouse Performance > 80 on landing page
- [ ] Lighthouse Performance > 70 on dashboard
- [ ] First Contentful Paint < 2s on landing page
- [ ] Bundle size analyzed, no unexpected large chunks (verify `@google/genai` is NOT in bundle)
- [ ] All images optimized (WebP, compressed)
- [ ] API cache hits verified: navigate away and back — no duplicate requests for static data
- [ ] Database connections stable under load (no pool exhaustion)

---

## Phase 9: Accessibility + SEO + Analytics

**Goal:** Usable, indexable, monitorable.

### Accessibility:

| Task | Details |
|------|---------|
| 9.1 ARIA labels on navigation | Sidebar, header, breadcrumbs, dropdowns |
| 9.2 ARIA on forms | `aria-describedby` on errors, `aria-required`, `aria-invalid` |
| 9.3 Keyboard navigation | Correct tab order, focus management on modals/dropdowns |
| 9.4 Skip links | "Skip to main content" on all pages |
| 9.5 Alt text on images | All images in public pages |
| 9.6 Screen reader testing | Verify with VoiceOver (macOS) |

### SEO:

| Task | Details |
|------|---------|
| 9.7 Generate `sitemap.xml` | All public routes (including i18n variants), auto-generate on build |
| 9.8 Create `robots.txt` | Allow public pages, disallow `/dashboard/*` |
| 9.9 Canonical tags | On every public page |
| 9.10 Hreflang tags | RO/RU/EN per public page (requires i18n URL strategy) |

### Analytics:

| Task | Details |
|------|---------|
| 9.11 Configure GA4 | Replace `G-XXXXXXXXXX` with real ID, or remove script entirely if not needed |
| 9.12 Configure Facebook Pixel | Replace `YOUR_PIXEL_ID` with real ID, or remove script entirely if not needed |

**Verification Gate:**
- [ ] Lighthouse Accessibility > 90
- [ ] `sitemap.xml` validates against XML sitemap schema
- [ ] `robots.txt` correctly blocks `/dashboard/*`
- [ ] All images have meaningful alt text
- [ ] Keyboard-only navigation works for critical flows: login, booking creation, calculator
- [ ] Analytics collecting data OR placeholder scripts removed cleanly

---

## Phase 10: Final Verification & Deploy Checklist

**Goal:** Everything works perfectly before go-live.

| Task | Details |
|------|---------|
| 10.1 Full regression test | Navigate ALL pages manually, test with all 8 user roles |
| 10.2 Test in 3 languages | RO, RU, EN — every page, every form, every error message |
| 10.3 Test on mobile | Responsive on iPhone, Android, tablet |
| 10.4 Test on browsers | Chrome, Firefox, Safari, Edge |
| 10.5 Security audit final | `npm audit`, OWASP top 10 checklist, verify no API keys in frontend bundle |
| 10.6 Performance audit final | Lighthouse on all key pages (landing, dashboard, calculator, tracking) |
| 10.7 Backup strategy | Document PostgreSQL backup procedure, setup automated daily cron job |
| 10.8 Monitoring setup | Sentry alerts configured, uptime monitoring (e.g., UptimeRobot), external health checks |
| 10.9 Deployment documentation | Updated README, deployment runbook, rollback procedure |
| 10.10 Production env check | All env vars set, HTTPS active, rate limiting active, Sentry active, CSRF active |
| 10.11 Hardcoded -> configurable | `constants.ts` values (shipping lines, ports, container types) from DB |
| 10.12 Redis production check | Bull queue functional, jobs processing correctly, connection stable |

**Verification Gate (FINAL):**
- [ ] All 119 tasks complete
- [ ] All phase gates passed
- [ ] All tests green in CI/CD
- [ ] Lighthouse scores: Performance > 80, Accessibility > 90, SEO > 90
- [ ] Security: HTTPS, rate limiting, CSRF, Sentry, npm audit clean, no API keys in frontend
- [ ] Monitoring: Sentry alerts active, uptime checks configured, backup automated and verified
- [ ] Documentation: README, deployment runbook, rollback procedure complete
- [ ] **Sign-off from project owner**

---

## Summary

| Phase | Tasks | Complexity | Dependencies |
|-------|-------|-----------|-------------|
| 0. Infrastructure | 9 | Small-Medium | None |
| 1. Security | 11 | Medium | Phase 0 |
| 2. Cleanup | 7 | Small | Phase 0 (can run parallel with Phase 1, after Phase 0 complete) |
| 3. Refactoring | 15 | **Large** | Phase 2 |
| 4. Error Handling | 9 | Medium | Phase 3 |
| 5. Backend TODOs | 13 | Medium-Large | Phase 3 |
| 6. i18n | 12 | **Large** | Phase 3 |
| 7. Testing | 10 | **Large** | Phases 3, 4, 5, **6** |
| 8. Performance | 9 | Medium | Phase 3 |
| 9. A11y + SEO | 12 | Medium | Phases 6, 8 |
| 10. Final Check | 12 | Medium | All previous |
| **TOTAL** | **119** | | |

### Dependency Graph:
```
Phase 0
├── Phase 1 (Security)  ← independent, completes before Phase 10
│
└── Phase 2 (Cleanup) ──── Phase 3 (Refactoring)
                               │
                               ├── Phase 4 (Errors) ─────┐
                               │                          │
                               ├── Phase 5 (Backend) ────┤
                               │                          ├── Phase 7 (Testing)──┐
                               ├── Phase 6 (i18n) ───────┤                       │
                               │                          │                       │
                               └── Phase 8 (Perf) ───┬───┘                       │
                                                      │                           │
                                                Phase 9 (A11y+SEO) ──────────────┤
                                                                                  │
                                                                         Phase 10 (Final)
                                                                  (requires ALL phases complete)
```

### Parallelization opportunities (all require Phase 0 complete first):
- **Phases 1 + 2** can run in parallel (security fixes and cleanup don't overlap)
- **Phases 4 + 5 + 6 + 8** can partially overlap after Phase 3 (they touch different areas)
- **Phase 7** (testing) waits for 4 + 5 + 6 to be complete (tests must cover final code including i18n)
- **Phase 9** waits for 6 + 8 (needs i18n for hreflang, needs performance for Lighthouse)

### Non-negotiable rules:
1. Every phase has a verification gate — no skipping
2. `npm run build` must pass after every task
3. Manual browser verification after Phases 3, 6, and 10
4. Git commit after each completed task (atomic commits)
5. No feature additions until all 119 tasks are done
6. **Database backups BEFORE any Prisma migration on production**
7. **No API keys or secrets in frontend bundle — ever**
