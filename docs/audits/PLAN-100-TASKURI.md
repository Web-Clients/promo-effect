# Plan Master 100 Taskuri — Promo-Effect către Perfecțiune

**Data:** 2026-04-30
**Scope:** Rezolvare 406 probleme audit + integrare cerințe client (10 directive)
**Estimare totală:** 12-16 săptămâni full-time pentru un dezvoltator senior
**Prioritate:** Cerințele clientului PRIME → Securitate → Code Quality → Polish

---

## Cerințe Client Sintetizate

1. **Rezervări** — Nr.Rezervare = Nr.BL din email; afișare rută/shipper/beneficiar/data sosire Constanța; badge-uri TLX (telex release) și DOC (acte încărcate); detail view pe click row
2. **Detail Booking** — Hartă poziție + rată stabilită manual + acces client cabinet personal + tipărire automată comandă transport + cont plată
3. **Eliminare pagina Urmărire** — duplicat, integrat în Rezervări
4. **Eliminare pagina Marfă în Drum** — duplicat, mutat în arhivă; tab-uri din prima pagină: LA INCARCARE / IN DRUM / PORT / LIVRATE
5. **Calculator destinație finală** — dropdown Constanța/Chișinău cu rută extinsă
6. **Calculator Incoterms** — EXW (cu taxe export China), FOB (navlu + destinație), CFR (selectare linie maritimă)
7. **Calculator HS Code reparare** — nomenclatorul nu funcționează
8. **Calculator detail breakdown** — EXW: 500+250+350=1100; Maritim: 1100+ajustare; Constanța-Chișinău: 1500+300+500+200=2500
9. **Calculator ofertă listare** — mereu ultimele prețuri (preț nou înlocuiește vechi)
10. **Pricing Admin** — un singur port de bază (Shanghai) cu prețuri pe 4-6 linii maritime; 7 tipuri container (20DV, 40DV/HQ, 45HQ, 20OT, 40OT, 20RF, 40RF); ajustări port +/- față de bază; intervale greutate pe tip container (1-18, 18-23, 23-24, 24-25, 25-26, 26-27, 27-28); buton "Contact reprezentant" când lipsește preț; access ulterior 2-3 agenți chinezi pentru ajustare zilnică

---

## FAZA A — Refactor Business Logic (25 taskuri)

### Bookings (Rezervări) — pagina centrală

**Task A1: Database Schema — extindere model Booking**

- Adăugare câmpuri Prisma: `blNumber` (unique), `shipperName`, `beneficiaryName`, `arrivalDateConstanta`, `telexReleased` (boolean), `documentsUploaded` (boolean)
- Migration cu backfill: `blNumber` derivat din `bookingNumber` existent
- Indexare pe `blNumber`, `arrivalDateConstanta`
- Update Prisma client + types
- Verificare cu `npx prisma migrate dev`

**Task A2: Email Parser — extragere BL number ca rezervare**

- Regex update în `email.service.ts` pentru parsing BL format ex. `MEDUKC298446`, `FTAU1173171`
- Mapare automată: BL extras → `Booking.blNumber`
- Test cu 5 email-uri reale (din inbox-ul existent)
- Fallback: dacă lipsește BL, generează UUID temporar și flaguiește pentru revizuire manuală

**Task A3: Backend — endpoint update booking metadata**

- POST `/api/bookings/:id/telex-release` (admin only) → set `telexReleased=true`
- POST `/api/bookings/:id/documents` (client + admin) → set `documentsUploaded=true`, save files
- Audit log pentru ambele operații
- Validare cu Zod schema

**Task A4: Frontend — refactor BookingsList.tsx (697 linii → 4 componente)**

- Extract: `BookingsTable.tsx` (render tabel), `BookingsFilters.tsx` (search + tabs), `BookingsBulkActions.tsx`, `BookingsBadges.tsx` (TLX/DOC badges)
- Coloane noi: BL Number | Client | Linie Maritimă | Container | Rută | ETA | Pret | Status + badges TLX/DOC
- Format conform mock-up: `10.03.2026 | CONSTANTA | MSC | MED AYDIN | MEDUKC298446 | FTAU1173171 | 17860 | 20DV | BETY COMPANY SRL | 2490 USD`

**Task A5: Frontend — Tab-uri status în Rezervări**

- Tabs: TOATE | LA INCARCARE | IN DRUM | PORT (în Constanța) | LIVRATE | ARHIVĂ
- Mapping status → tab:
  - LA INCARCARE: `DRAFT`, `CONFIRMED`
  - IN DRUM: `IN_TRANSIT`
  - PORT: `IN_TRANSIT` cu `arrivalDateConstanta` setat
  - LIVRATE: `DELIVERED`
  - ARHIVĂ: `DELIVERED` mai vechi de 30 zile + `CANCELLED`
- Counter per tab cu badge

**Task A6: Frontend — Eliminare pagină Urmărire (Tracking)**

- Șterge route `/dashboard/tracking` din App.tsx
- Șterge nav link din DashboardLayout
- Migrare componenta `ContainerMap` → reusable component, folosit doar în BookingDetail
- Redirect /tracking → /bookings (pentru bookmark-uri vechi)

**Task A7: Frontend — Eliminare pagină Marfă în Drum**

- Șterge route `/dashboard/containers-in-transit`
- Șterge nav link
- Stats containers (3 In Tranzit, 1 Confirmat, 0 Expediat) → mutate în BookingsList summary cards
- Redirect către /bookings cu tab "IN DRUM" pre-selectat

**Task A8: Backend — agregare stats per tab**

- Endpoint: `GET /api/bookings/stats?tab=loading|transit|port|delivered|archive`
- Returnează: count, total value (USD)
- Cache 30 secunde (Redis)
- Folosit pentru badge-uri pe tabs și summary cards

### Booking Detail — view completă

**Task A9: Frontend — refactor BookingDetail (597 linii → 5 componente)**

- Extract: `BookingHeader`, `BookingRouteMap`, `BookingPricingPanel`, `BookingDocuments`, `BookingActions`, `BookingTimeline`
- Layout: tabs sau accordion pentru organizare clară
- Mobile-responsive

**Task A10: Frontend — Hartă poziție container în BookingDetail**

- Component `BookingRouteMap`: leaflet map cu marker poziție curentă
- Linie traseu: portOrigin → portDestinație → Chișinău (dacă e cazul)
- Auto-update prin polling sau WebSocket (dacă e disponibil)
- Fallback elegant când nu există GPS data

**Task A11: Frontend — Pricing Panel (rată stabilită manual)**

- Form admin-only: editare rate per booking
- Câmpuri: Tarif Maritim, Ajustare Port, Taxe Portuare, Transport Terestru, Taxe Vamale, Comision
- Calculation total automat (USD + MDL)
- Salvare în `Booking.pricingData` (JSON) cu audit log
- Client view: doar totalul, nu detalii

**Task A12: Backend — generare PDF Comandă Transport**

- Endpoint: `GET /api/bookings/:id/transport-order.pdf`
- Template: header companie + detalii booking + rută + container + condiții
- Folosește `pdfkit` sau `puppeteer` (consistent cu invoices PDF)
- Acces: admin + client owner only
- Test cu booking real

**Task A13: Backend — generare PDF Cont de Plată**

- Endpoint: `GET /api/bookings/:id/payment-invoice.pdf`
- Format conform standard fiscal Moldova
- Include IBAN, codul fiscal companie, TVA
- Numerotare automată (sincronizată cu seria oficială)
- Storage în `BookingDocument` table

**Task A14: Frontend — Print buttons în BookingDetail**

- Buton "Tipărește Comanda Transport" → API call → download PDF
- Buton "Tipărește Cont de Plată" → API call → download PDF
- Loading state, error handling, toast confirmare
- Acces RBAC: client poate doar pentru bookingurile sale

### Calculator

**Task A15: Frontend — Destinație finală în Calculator**

- Dropdown: Port Destinație (Constanța, Odessa) + Destinație Finală (Constanța port, Chișinău, alte orașe)
- Logic: dacă destinație finală ≠ port, adaugă rută `Port → Oraș`
- Display: `Ningbo → Constanța → Chișinău`

**Task A16: Frontend — Incoterm selector (EXW/FOB/CFR)**

- Radio group: EXW | FOB | CFR (CIF dacă e necesar)
- Tooltip explicativ pentru fiecare
- Logica:
  - EXW: arată câmp "Taxe export China" auto-populat
  - FOB: arată "Navlu + livrare"
  - CFR: arată dropdown obligatoriu "Linie Maritimă"
- Persistare în localStorage pentru ultima alegere

**Task A17: Backend — Calculator pricing engine refactor**

- Refactor `calculator.service.ts` (784 linii → 4 module):
  - `calculator-engine.ts` (logica core)
  - `calculator-incoterms.ts` (EXW/FOB/CFR specific)
  - `calculator-routes.ts` (port + destination)
  - `calculator-validation.ts` (Zod)
- Output structurat:

```ts
{
  incoterm: 'EXW',
  rates: [
    { route: 'Ningbo origin', total: 1100, breakdown: { transport: 500, customs: 250, storage: 350 } },
    { route: 'Ningbo → Constanța', total: 1778, breakdown: { freight: 1100, adjustment: 30 + 648 } },
    { route: 'Constanța → Chișinău', total: 2500, breakdown: { transport: 1500, expedition: 300, localTaxes: 500, commission: 200 } }
  ],
  grandTotal: 5378
}
```

**Task A18: Frontend — OfferCard breakdown conform Incoterm**

- Refactor `OfferCard.tsx` pentru afișare structurată:
  - Header: rank, line maritimă, total
  - Sectiunea 1 (EXW only): "Taxe Export China — $1100" cu breakdown collapsed (transport 500, vama 250, depozitare 350)
  - Secțiunea 2: "Maritim: Ningbo → Constanța — $1778" cu breakdown (navlu 1100, ajustare 30, taxe portuare 648)
  - Secțiunea 3 (dacă destinație Chișinău): "Constanța → Chișinău — $2500" cu **doar suma** afișată clientului (breakdown intern: transport 1500, expediere 300, taxe locale 500, comision 200)
- Admin role: poate vedea TOATE breakdown-urile
- Client role: vede doar sume agregate

**Task A19: Backend — HS Code Search reparare**

- Debug `hscodes.service.ts` (audit search nu funcționează)
- Adăugare full-text index PostgreSQL pe `hsCodes.code + description`
- Suport căutare: cod numeric (9403.30) sau text liber (mobilier)
- API: `GET /api/hscodes/search?q=mobilier&limit=10`
- Cache rezultate 1 oră (Redis)

**Task A20: Frontend — HS Code autocomplete**

- Component `HSCodeAutocomplete` în CalculatorForm
- Debounce 300ms
- Display: cod + descriere scurtă + categorie
- Loading state + empty state ("Nu am găsit cod pentru...")
- Selectare → fill input + store HSCode entity ID

### Pricing Admin

**Task A21: Database — refactor model BasePrice**

- Schimbă `BasePrice` model:
  - 1 port de bază per containerType (default: Shanghai)
  - Relație 1-N cu `ShippingLine` (4-6 linii maritime per container type)
  - Câmpuri: `containerType` (enum: 20DV, 40DV, 40HQ, 45HQ, 20OT, 40OT, 20RF, 40RF), `shippingLineId`, `priceUSD`, `transitDays`, `validFrom`, `validTo`
- Model nou `PortAdjustment`: `portCode`, `adjustmentUSD`, `notes`, `lastAdjustedAt`
- Migration cu backfill din date existente

**Task A22: Database — model WeightRange refactor**

- Tabel nou `WeightRange`:
  - `containerType`, `minWeight`, `maxWeight`, `freightSurcharge`, `landSurcharge`
- Seed cu valorile cerute:
  - 20DV: 1-18, 18-23, 23-24, 24-25, 25-26, 26-27, 27-28
  - 40DV/HQ: aceleași intervale
  - 45HQ: aceleași intervale
  - 20RF/40RF: aceleași intervale
- Validare overlap (max boundary = min următorul boundary)

**Task A23: Frontend — refactor AdminPricingPanel (1000+ linii → 6 componente)**

- Extract: `BasePricesTab`, `PortAdjustmentsTab`, `WeightRangesTab`, `EditBasePriceModal`, `EditPortAdjustmentModal`, `EditWeightRangeModal`
- Layout: 3 tabs principale (Prețuri Bază, Ajustări Port, Setări Generale)
- Per tab: tabel + buton "Adaugă"

**Task A24: Frontend — Tab "Prețuri de Bază" UX update**

- Tabel: Container Type | Linii Maritime (multiple) | Preț USD | Tranzit Zile | Acțiuni
- Adăugare preț: modal cu pickup container type → loadează lista shipping lines → input preț per linie
- Format display: pentru `20DV`, arată tabel inline cu Maersk $1130, CMA CGM $1230, MSC $1180...
- Filtrare după tip container

**Task A25: Frontend — fallback "Contact Reprezentant"**

- În Calculator, dacă nu există preț pentru combinația portOrigin + containerType + shippingLine:
  - În loc de "Indisponibil" sau pretul rețelei, arată: "Pentru acest tip de container, contactați reprezentantul nostru"
  - Buton "Contactează" → modal cu formular sau redirect WhatsApp/email
  - Notify admin via Telegram/email că s-a cerut preț pentru combinație lipsă
- Logging în `PriceRequestLog` pentru analytics

---

## FAZA B — Securitate Critical (15 taskuri)

**Task B1: JWT — Refresh Token Rotation**

- Implementează rotation: la fiecare refresh, generează NEW access + refresh token, revoke old refresh
- Family ID pentru detection token reuse (security incident → revoke entire family)
- Update `auth.service.ts:286-332` cu transaction
- Test: încercare reuse old refresh = 401 + revoke

**Task B2: JWT — Reduce access token expiration**

- Schimbă `JWT_EXPIRES_IN` din `7d` în `15m`
- Refresh token rămâne `30d`
- Verificare frontend: refresh automat la 401 cu retry o singură dată
- Update teste auth

**Task B3: JWT — Separate secrets**

- Adăugare `JWT_REFRESH_SECRET` în env
- `utils/jwt.util.ts`: separate sign/verify pentru access vs refresh
- Validare la startup ambele setate cu min 32 chars
- Documentare în README

**Task B4: CSRF — Eliminare fallback hardcoded**

- `app.ts:78`: elimină `'csrf-fallback-secret'`
- Validare strictă la startup: `CSRF_SECRET` obligatoriu, fail fast dacă lipsește
- Generare separată de `JWT_SECRET`

**Task B5: CORS — Subdomain attack fix**

- `app.ts:54`: schimbă `origin.startsWith(allowed)` → `origin === allowed` exact match
- Pentru wildcard subdomains: regex strict `^https://([a-z0-9-]+\.)*example\.com$`
- Test cu origin malicious: `https://evil.example.com.attacker.com` → BLOCKED

**Task B6: Auth — Rate limiting backup codes**

- Adăugare rate limit pe `/api/auth/2fa/backup-code`: 5 attempts / 15 min
- După 5 eșecuri: lock cont 1h + email notification
- Audit log pentru fiecare attempt

**Task B7: Auth — Password reset token single-use**

- `auth.service.ts:355-400`: după successful reset, mark token `usedAt`
- Verify la utilizare: dacă `usedAt != null` → 401 + audit log "replay attempt"
- Cleanup tokens > 24h via cron

**Task B8: Auth — Race condition register**

- Replace `findUnique → create` pattern (TOCTOU) cu Prisma `create` direct
- Catch unique constraint error → return 409 Conflict
- Test: 100 concurrent register requests cu același email → exact 1 success

**Task B9: Auth — Verification token hashing**

- `auth.service.ts:114`: hash token cu SHA256 înainte de DB store
- Compare la verify: hash request token, lookup hash în DB
- Token original doar în URL (one-way)

**Task B10: Multer — File size limits**

- `bookings.controller.ts:8`: adaugă `limits: { fileSize: 10 * 1024 * 1024 }` (10MB)
- `fileFilter`: whitelist extensii (`.pdf`, `.png`, `.jpg`, `.jpeg`, `.docx`, `.xlsx`)
- Reject `.exe`, `.sh`, `.html`, `.js` etc.
- Error handling cu mesaj user-friendly

**Task B11: Sensitive data — encrypt at rest**

- Migration: `clients.bankAccount`, `users.phone`, `bookings.supplierEmail` → encrypt with AES-256
- Helper `crypto.util.ts`: `encrypt(plaintext)`, `decrypt(ciphertext)` cu key din env
- Backfill existing data
- Decrypt on read în service layer

**Task B12: Gmail OAuth — encrypt tokens**

- `settings.service.ts:99-103`: encrypt `gmailAccessToken`, `gmailRefreshToken` cu AES-256
- Decrypt only when used pentru Gmail API call
- Audit log pentru fiecare access

**Task B13: Logging — remove sensitive data**

- Audit toate `console.log` în backend (auth.service.ts:129,133,444,447,523)
- Replace cu `logger.info` cu sanitizare automată: NU log password, token, email full
- Adăugare regex în logger: redact PII patterns

**Task B14: RBAC — adăugare role checks lipsă**

- `payments.routes.ts`: `requireRole(['ADMIN', 'CONTABIL'])` pe GET /payments
- `invoice.routes.ts`: align permissions create/update/delete (toate ADMIN, nu doar SUPER_ADMIN pe DELETE)
- `client.routes.ts`: pagination default `limit=50, max=200`
- `bookings.controller.ts`: ownership check pe `clientId` filter (CLIENT vede doar propriile)

**Task B15: Idempotency — payment endpoints**

- Adăugare middleware `idempotency.middleware.ts`: check header `Idempotency-Key`
- Cache (Redis) request hash → response timp 24h
- Aplicare pe POST /payments, POST /bookings (creation), POST /invoices

---

## FAZA C — Code Quality & Refactoring (15 taskuri)

**Task C1: Refactor TrackingView.tsx (569 linii)**

- Extract: `TrackingSearch`, `TrackingResults`, `TrackingMap`, `TrackingTimeline`, `TrackingStats`
- Hook `useTracking` pentru logica
- Funcție `performTracking` (208 linii) sparge în 5 funcții mici
- Test: tracking continuă să funcționeze identic

**Task C2: Refactor AdminDashboard.tsx (685 linii)**

- Extract: `AdminStats`, `AdminCharts`, `AdminQuickActions`, `AdminRecentActivity`
- Move `formatDate`, `getStatusColor`, `formatCurrency` în `utils/formatters.ts` (deja există parțial)
- Inline icons → import din icon library

**Task C3: Refactor email.service.ts backend (789 linii)**

- Extract: `email-parser.ts` (regex extraction), `email-classifier.ts` (telex/doc detection), `email-storage.ts`
- Test cu 20 email-uri reale (variate format-uri)

**Task C4: Refactor invoices service (847 linii) — completion**

- Already split partially; finish: extract `invoice-pdf-template.ts`, `invoice-numbering.ts`
- Audit: invoice cancellation must keep audit trail (don't delete payment records)

**Task C5: Replace window.confirm/prompt with branded modals**

- Component nou `ConfirmDialog` în `components/ui/`
- Replace în: `BookingsList:249`, `InvoicesList:117`, `InvoicesList:165`, `ShippingLinesPage:155`, `TransportRatesPage:155`, `AgentPriceManager:78`, `AdminPortsManager:244`, `AgentPricesDashboard:227`
- Hook `useConfirm()` pentru utilizare ușoară

**Task C6: useState chains → useReducer**

- `InvoicesList.tsx`: 12 useState → reducer cu state shape `{ invoices, stats, clients, filters, selection, modals }`
- `TrackingView.tsx`: 10 useState → reducer
- `AdminPricingPanel.tsx`: 13 useState → reducer
- Performanță: re-renders reduse semnificativ

**Task C7: Extract repeated utilities**

- Move `formatDate`, `getStatusColor`, `formatCurrency` în `utils/formatters.ts` (consolidare)
- Update toate componentele să import din utils
- Delete duplicate implementations

**Task C8: Magic numbers → constants**

- Creează `config/constants.ts`:
  - `DEFAULT_PAGE_SIZE = 10`
  - `BULK_FETCH_LIMIT = 100`
  - `RECENT_BOOKINGS_COUNT = 5`
  - `DEFAULT_INVOICE_DUE_DAYS = 30`
  - `OFFER_AVAILABILITY_THRESHOLD = 0.95`
- Replace în 6+ fișiere

**Task C9: Backend N+1 queries fix**

- `auth.middleware.ts:44-51`: cache user/client lookup în Redis (TTL 5 min)
- Invalidate cache la user update/delete
- Reduce DB load with ~80% pentru request authenticated

**Task C10: Backend transactions**

- Wrap în `prisma.$transaction` operațiile multi-step:
  - `bookings.service.ts:46-150` (create booking + invoice)
  - `invoices.service.ts` (create invoice + payment)
  - `auth.service.ts:286-332` (refresh token)
  - `payments.service.ts` (payment + invoice update)

**Task C11: Cron jobs distributed locking**

- Adăugare Redis-based locking (lib `redlock`):
  - `email-fetcher.job.ts`
  - `container-sync.job.ts`
  - `payment-reminders.job.ts`
  - `daily-report.job.ts`
- Lock duration = max job duration + buffer 30s

**Task C12: Soft deletes**

- Adăugare `deletedAt: DateTime?` pe Booking, Invoice, Client, User
- Replace `prisma.x.delete` → `prisma.x.update({ deletedAt: new Date() })`
- Default Prisma queries filter `deletedAt: null` via middleware
- Endpoint admin pentru hard delete (cu audit log + confirmation)

**Task C13: Audit log expansion**

- Log toate operațiile sensitive:
  - Price changes (BasePrice, PortAdjustment, AgentPrice)
  - User deletions, role changes
  - Settings changes
  - Booking status transitions
  - Invoice cancellations + payments
- Index pe `auditLog.createdAt` pentru queries time-range

**Task C14: Error handling consistency**

- Standard error format: `{ code: string, message: string, details?: object, requestId: string }`
- Service `errors.ts` cu coduri:
  - `BOOKING_NOT_FOUND`, `INSUFFICIENT_PERMISSIONS`, `VALIDATION_FAILED`, etc.
- Frontend `getErrorMessage` actualizat să citească `code` și să afișeze translation
- Translation per locale pentru fiecare cod

**Task C15: Request ID tracing**

- Middleware `request-id.middleware.ts`: generează UUID per request, atașat la `req.id`
- Header response: `X-Request-ID`
- Logger include automat în toate log entries
- Frontend: trimite `X-Request-ID` la backend → corelare frontend errors cu backend logs

---

## FAZA D — i18n Completeness (10 taskuri)

**Task D1: Audit & extract toate hardcoded RO strings**

- Script automat: scan all `.tsx`/`.ts` pentru patterns RO
- Output: lista la `i18n-extraction-report.json` cu file:line + text
- Verificare manuală: false positives (e.g., comments)
- ~36+ string-uri identificate în audit

**Task D2: Extragere strings → ro/common.json**

- Pentru fiecare string hardcoded, decide namespace: `errors.*`, `actions.*`, `confirmations.*`, `placeholders.*`
- Update `ro/common.json` cu chei noi
- Replace în cod: `'Eroare la salvare'` → `t('errors.saveFailed')`

**Task D3: Translare RU**

- Copy chei noi în `ru/common.json`
- Translate cu native speaker review (sau DeepL + human review)
- Verificare consistență terminologie (Booking = Бронирование, NU Резервация)

**Task D4: Translare EN**

- Same approach pentru `en/common.json`
- Maritime terminology corect (BL = Bill of Lading, Telex Release, etc.)

**Task D5: Date formatting per locale**

- Helper `utils/date.ts`:
  - `formatDate(date, locale)` → `Intl.DateTimeFormat(locale).format(date)`
  - `formatDateTime(date, locale)`
  - `formatRelative(date, locale)` (e.g., "2 zile ago" / "2 days ago" / "2 дня назад")
- Replace toate `toLocaleDateString('ro-RO')` (12 ocurențe identificate)

**Task D6: Number & currency formatting**

- Helper `utils/number.ts`:
  - `formatNumber(value, locale)` → 1.234,56 (RO/RU) sau 1,234.56 (EN)
  - `formatCurrency(value, currency, locale)` → "1.234,56 USD" sau "$1,234.56"
- Replace `formatCurrency` din AdminDashboard cu versiunea i18n

**Task D7: Email templates RU + EN**

- Folder `backend/templates/emails/`:
  - `verify-email.{ro,ru,en}.html`
  - `password-reset.{ro,ru,en}.html`
  - `invoice-sent.{ro,ru,en}.html`
  - `payment-received.{ro,ru,en}.html`
- Email service: choose template based on `user.preferredLanguage`

**Task D8: Confirmation dialogs i18n**

- După Task C5 (replace confirm/prompt cu modal), toate texts via `t()` keys
- Translation pentru ~10 confirmation dialogs

**Task D9: Validation messages i18n**

- Backend Zod schemas: custom error messages cu i18n keys
- Frontend: catch validation errors → translate code la message
- Format: `{ code: 'VALIDATION_FAILED', field: 'email', issue: 'invalid_format' }` → `t('validation.email.invalidFormat')`

**Task D10: Document titles & meta**

- Hook `useDocumentTitle(key)`: setează `document.title = t(key)` pe page mount
- Use în fiecare pagină
- React Helmet pentru meta tags i18n (description, og:title, etc.)
- Hreflang tags deja în place

---

## FAZA E — UX & Accessibility (15 taskuri)

**Task E1: WCAG color contrast fixes**

- Audit cu axe DevTools / WAVE
- Fix toate cele 12 issue-uri identificate (text-white/50, text-neutral-400, text-yellow-600, etc.)
- Update Tailwind config cu colors care trec WCAG AA: 4.5:1 minimum
- Test cu Lighthouse Accessibility (target 95+)

**Task E2: Form labels — replace placeholders ca labels**

- Login, Register, BookingDetail, CalculatorForm: visible labels above input
- Placeholder = exemple, nu label
- `<label htmlFor=...>` pentru screen readers

**Task E3: Real-time validation feedback**

- Login email/password: validate on blur
- Register password: real-time strength indicator + checkmarks per requirement
- BookingDetail forms: inline error messages sub field

**Task E4: Search clear button**

- BookingsList, ClientsList, InvoicesList, AgentsPanel: buton X în search input pentru clear rapid

**Task E5: Keyboard navigation**

- All interactive divs cu `onClick` → convert la `<button>` sau add `role="button" tabindex="0" onKeyDown`
- Tab order verification (testat cu Tab key)
- Focus visible cu `:focus-visible` (ring 2px primary)

**Task E6: Skip links + landmark roles**

- Verifică skip link existent în DashboardLayout (deja prezent)
- Adaugă `<main>`, `<nav>`, `<header>`, `<footer>` semantic
- ARIA landmarks fallback dacă lipsesc

**Task E7: Reduced motion support**

- CSS: `@media (prefers-reduced-motion: reduce) { animation: none !important; transition: none !important; }`
- Toast, modal, accordion: disable animations
- Vestibular accessibility

**Task E8: Mobile bottom nav — overflow menu**

- 18 nav items dar doar 5 vizibile pe mobile
- Solution: 4 main + "Mai mult..." → drawer cu rest
- Sau prioritize per role (CLIENT vede doar 4: Bookings, Tracking, Calculator, Profil)

**Task E9: Mobile tables — card view**

- BookingsList tabel pe mobile (<640px) → render ca cards
- Card: BL number top, status badge, key info (route, container, ETA), expand pentru detalii
- Bulk actions adaptat pentru touch

**Task E10: Empty states cu CTA**

- BookingsList empty: "Nu există rezervări" + buton "Crează prima rezervare"
- InvoicesList: "Nu există facturi" + "Crează factură"
- Etc. pentru toate listele

**Task E11: Loading states îmbunătățire**

- Skeleton screens pentru BookingsList, InvoicesList, AdminDashboard
- Spinner consistent (component `Spinner.tsx`)
- Loading state per request, nu global

**Task E12: Toast duration accessibility**

- Toasts cu pause on hover (nu dispar dacă mouse e peste)
- Buton X manual close
- Configurable duration per toast type (error 7s, success 4s, info 5s)

**Task E13: Color-blind friendly status**

- Status badges: nu doar culoare, ci și icoană (✓ Delivered, ⏱ In Transit, ⚠ Delayed, ✗ Cancelled)
- Pattern fills în charts (nu doar culori)

**Task E14: Touch targets 44px minimum**

- Toate butoane/links: min `44x44px` (size "icon" actual e 40px)
- Tap area expandată cu padding (vizibil mai mic, dar tap area mare)

**Task E15: Print stylesheet**

- `@media print` CSS pentru pagini documente:
  - Hide nav, sidebar, buttons
  - Black & white friendly
  - Page breaks corecte pentru PDF-uri client
- Aplicabil pentru BookingDetail, Invoice details

---

## FAZA F — Testing & Validation (10 taskuri)

**Task F1: Unit tests — calculator logic**

- Test toate combinațiile Incoterm × destinație × greutate × tip container
- Edge cases: weight = exact boundary (18, 23, 24)
- Snapshot tests pentru pricing breakdown
- Coverage target: 90%+ pe `calculator-engine.ts`

**Task F2: Unit tests — auth flows**

- Login success/fail, 2FA enable/disable, password reset (single-use), refresh token rotation
- Race conditions tests cu `Promise.all([... 100 concurrent])`
- Token expiration scenarios

**Task F3: Integration tests — bookings**

- Create booking → email parser → BL extraction → status transitions → telex release → docs upload
- Multi-role: client creează, admin aprobă, agent transport vede status, contabil generate invoice
- Cleanup în `afterEach` cu transaction rollback

**Task F4: Integration tests — pricing**

- Test pricing engine end-to-end:
  - Add base price (admin) → port adjustment → weight surcharge → calculator returns correct
  - Agent updates daily price → reflected immediately
  - Missing price → "Contact reprezentant" returned

**Task F5: E2E tests — Playwright**

- Setup `playwright.config.ts` cu 3 browsers (Chrome, Firefox, Safari)
- Tests:
  - Public flow: landing → calculator → quote → contact form
  - Auth flow: register → verify email → login → 2FA setup
  - Admin flow: create user → assign role → manage prices
  - Client flow: view bookings → upload docs → print invoice
- Run în CI pe fiecare PR

**Task F6: Visual regression tests**

- Setup Chromatic sau Percy
- Snapshot screenshots pentru components UI critical
- Catch unintended visual changes pe PR

**Task F7: Performance tests**

- Tool: `k6` sau `autocannon`
- Endpoints critical:
  - GET /bookings (lista 100 rezervări) — target <500ms p95
  - POST /calculator/calculate — target <300ms p95
  - GET /tracking/:containerId — target <1s p95
- Run weekly în CI

**Task F8: Security tests**

- Tool: `npm audit`, `snyk`, `OWASP ZAP`
- Tests:
  - SQL injection attempts pe toate query params
  - XSS în form inputs
  - CSRF token bypass attempts
  - Rate limiting effectiveness
  - File upload exploits (oversize, wrong type, path traversal)
- Run lunar

**Task F9: Accessibility tests automated**

- Integrate `axe-core` în Playwright tests
- Per page: assert no critical/serious violations
- Lighthouse CI cu Accessibility threshold 95+

**Task F10: Coverage threshold enforcement**

- Update `vitest.config.ts`:
  - statements: 70% (currently 20%)
  - branches: 60%
  - functions: 70%
  - lines: 70%
- Backend `jest.config.ts` similar
- CI fails dacă coverage scade

---

## FAZA G — Performance & Infrastructure (10 taskuri)

**Task G1: Bundle splitting**

- Recharts → lazy chunk separat (loaded only on dashboards)
- Leaflet → lazy chunk separat (loaded only when map view)
- React-router → vendor chunk
- Target main bundle: <200KB gzip

**Task G2: Image optimization**

- Convert toate PNG/JPG → WebP (vite plugin)
- `<picture>` cu fallback
- Lazy loading verificat pentru toate
- CDN cu cache headers (Cloudflare)

**Task G3: Font optimization**

- Self-host Inter + Poppins (eliminat google-fonts blocking)
- Subset pentru caracterele utilizate (latin + cyrillic)
- `font-display: swap`
- Preload critical fonts

**Task G4: API response caching**

- Redis cache pentru:
  - `/ports/list` (TTL 1 oră)
  - `/shipping-lines/list` (TTL 1 oră)
  - `/hscodes/search?q=*` (TTL 30 min)
  - `/admin/stats` (TTL 1 min)
- Invalidate cache la admin updates

**Task G5: Database indexes**

- Adăugare indexes:
  - `Booking.blNumber` UNIQUE
  - `Booking.arrivalDateConstanta`
  - `Booking.status + Booking.createdAt` (compound, pentru queries by status)
  - `AuditLog.createdAt`
  - `User.email` UNIQUE (deja există)
- Migration cu `CREATE INDEX CONCURRENTLY` pentru zero-downtime

**Task G6: Sentry integration complete**

- Setup Sentry account (oleg@aichat.md)
- DSN frontend + backend în env
- Source maps upload în CI build
- Alerts: error rate >1% / 5min → Telegram
- Performance monitoring (transactions)

**Task G7: GA4 + Hotjar setup**

- GA4 account creat, măsurător ID în env
- Track: page views, calculator submissions, signups, contact forms
- Hotjar pentru heatmaps (gratis tier 35 sessions/day)
- Data privacy: cookie consent banner

**Task G8: Monitoring infrastructure**

- Uptime monitor (UptimeRobot gratis, 50 endpoints):
  - https://promo-efect.md (200 OK)
  - /api/health (200 OK)
  - /api/auth/csrf-token (200 OK)
- Alerting: Telegram bot
- Status page public (statuspage.io gratis)

**Task G9: Deploy automation**

- GitHub Actions workflow:
  - Push pe `main` → run tests → run build → deploy production
  - Push pe `staging` → deploy staging
  - PR → deploy preview
- Rollback automat dacă health check fail post-deploy

**Task G10: Backup strategy automation**

- Cron pe server (deja avem script `backup-db.sh`):
  - Daily 02:00: PostgreSQL dump
  - Weekly Sunday: copy la S3/Backblaze
  - Monthly: full backup + verify restore în staging
- Retention: 7 daily, 4 weekly, 6 monthly
- Notification Telegram dacă backup fail

---

## Sumar Plan Total

| Fază                                   | Taskuri         | Estimare       | Prioritate |
| -------------------------------------- | --------------- | -------------- | ---------- |
| **A. Business Logic + Cerințe Client** | 25              | 4-5 săpt       | CRITICAL   |
| **B. Securitate**                      | 15              | 2-3 săpt       | CRITICAL   |
| **C. Code Quality**                    | 15              | 2-3 săpt       | HIGH       |
| **D. i18n Completeness**               | 10              | 1-2 săpt       | HIGH       |
| **E. UX & Accessibility**              | 15              | 2-3 săpt       | MEDIUM     |
| **F. Testing**                         | 10              | 2 săpt         | HIGH       |
| **G. Performance & Infra**             | 10              | 1-2 săpt       | MEDIUM     |
| **TOTAL**                              | **100 taskuri** | **14-20 săpt** | —          |

---

## Strategie de Execuție

### Sprint 1-2 (săptămâna 1-2) — FAZA B Critical Security

- Toate cele 15 task securitate (B1-B15)
- Deploy hotfix după fiecare task critic
- Verificare nu rupe funcționalitate existentă

### Sprint 3-7 (săptămâna 3-7) — FAZA A Business Logic

- 25 taskuri client requirements
- Demo client la finalul fiecărei săptămâni
- Iterație pe feedback

### Sprint 8-10 (săptămâna 8-10) — FAZA C + D

- Code quality refactoring (în paralel cu i18n)
- Sub-agenți paraleli pe taskuri independente

### Sprint 11-13 (săptămâna 11-13) — FAZA E + F

- UX polish + accessibility
- Testing comprehensive

### Sprint 14-16 (săptămâna 14-16) — FAZA G + buffer

- Performance + monitoring + deployment automation
- Buffer pentru bug fixes + final polish
- Production launch readiness

---

## Quality Gates

După fiecare fază:

1. ✅ Toate testele trec (unit + integration + E2E)
2. ✅ Lighthouse: Performance >85, Accessibility >95, SEO >90
3. ✅ ESLint 0 errors, max 10 warnings
4. ✅ TypeScript strict, 0 `any` în modulele critice
5. ✅ Demo funcțional cu clientul + sign-off
6. ✅ Deploy pe staging + smoke tests pass
7. ✅ Rollback plan documentat

---

**Generat:** 2026-04-30
**Repository:** [Web-Clients/promo-effect](https://github.com/Web-Clients/promo-effect)
**Bază:** AUDIT-406-ISSUES.md + 10 cerințe client (screenshots feedback)
