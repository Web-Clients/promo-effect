# UI/UX Audit — Promo-Effect (2026-07-01)

Full-platform UI/UX audit across 5 domains (auth+public, dashboard+admin,
bookings/clients/invoices, maps/tracking, calculator/pricing/email).
~120 findings. Fixes tracked on branch `ui-ux-fixes`.

Severity: BLOCKER (breaks/embarrasses in a live demo) → HIGH → MEDIUM → LOW.

---

## BLOCKER

1. **Fake landing map** — `components/LogisticsMap.tsx:278` — `VESSEL_1024`,
   `PROMO-MAERSK VI`, frozen clock `SYS_CLOCK 12:55:03`, `Math.random()` HUD bars.
   First map a client sees; real FleetMap already exists. Replace/label as decorative.
2. **Admin routes not role-gated** — `App.tsx:256` — any logged-in user can open
   `/dashboard/adminSettings`, `/dashboard/user-management`, etc. Sidebar only hides
   links. Add `RequireRole` wrapper + gate AdminSettingsPage tabs.
3. **Email parser shows raw JSON** — `components/EmailParserAssistant.tsx:164` — dumps
   `JSON.stringify` with English keys + literal `\n\n` on error + no try/catch/finally
   (infinite spinner on reject). Render labeled RO fields; raw behind admin toggle.
4. **Contact form does nothing** — `components/pages/public/Contact.tsx:39` — no
   onSubmit, no `type`, no state, no labels. Silent data loss. Wire it.
5. **Marketing CTAs dead-end at /login** — Preturi/GhidImport/CalculPrompt/Cariere/FAQ —
   quote/consult/apply CTAs all call `onLoginRedirect`. Route to /contact.
6. **"Șterge" cancels, doesn't delete** — `components/BookingsList.tsx:185` — copy says
   "șterse / nu poate fi anulată" but calls `cancelBooking`. Fix copy or endpoint.
7. **Hardcoded "Bun venit, Ion!" + dead header search** — `AdminDashboard.tsx:154`,
   `DashboardLayout.tsx:294`. Use real user; wire/remove search.
8. **ContainerMap crash on null AIS** — `components/ContainerMap.tsx:421` —
   `livePos.sog.toFixed(1)` throws when AIS omits SOG/COG. Guard `?.` + `?? '—'`.

## HIGH

- Fake KPI trends + `Math.random()` sparklines — `MainDashboard.tsx:24`, `KpiCard.tsx:65`.
- Reports page 100% mock data — `ReportsPage.tsx:17`.
- Settings tabs don't persist ("Salvează" lies) — `AdminSettingsPage.tsx:277`.
- Notifications "Vezi toate" → 404 — `NotificationsDropdown.tsx:554`.
- `NaN MDL` conversion — `OfferCard.tsx:101`; NaN price on empty — `BookingDetail.tsx:627`.
- Approve price without confirm — `AdminPriceApproval.tsx:88`.
- Negative freight prices accepted — AgentPriceManager / AgentPricesDashboard / BasePricesTab.
- Dead Export / Change-status buttons — `BookingsBulkActions.tsx:37`, `BookingsFilters.tsx:105`.
- No mobile nav (hamburger) — `PublicHeader.tsx:14`.
- `cursor-none` hides cursor — `LogisticsMap.tsx:196`, `PublicFooter.tsx:59`, `LandingPage.tsx:570`.
- Per-keystroke PATCH storm — `PortPricingMatrixTab.tsx:307`.
- Broken brand: orange glow on blue buttons + invalid Tailwind (`bg-white/2`, `animate-glow`,
  `perspective-1000`) — Preturi/Contact/CalculPrompt/GhidImport, `index.css`.
- Add-port silently swallows failures (phantom rows) — `PortPricingMatrixTab.tsx:361`.
- Date-order validation missing (validUntil < validFrom) — pricing forms.
- Fake weight placeholder "1-10 tone" submittable — `BookingDetail.tsx:252`.
- Bookings tab-filter over capped fetch → missing rows, no pagination — `BookingsList.tsx:138`.

## MEDIUM

- Central: `utils/formatters.ts` — `formatDate*`/`formatCurrency` throw / "Invalid Date" /
  `$NaN` with no guard. Fix once, fixes many screens.
- Raw enums in UI (`IN_TRANSIT`, `LOADED_ON_VESSEL`, `warning`) — use existing
  `getStatusLabel`/`getEventTypeLabel`. FleetMap/ContainerMap/AdminStats.
- i18n leakage: public pages + admin panels hardcoded RO (no `t()`) + English strings
  ("Global Operations Hub", "Knowledge Base", "GPS Tracking").
- No empty states — FleetMap / ContainerMap / tables.
- Currency hardcoded `$`, ignores `invoice.currency`; VAT computed 19% (MD is 20%) —
  `InvoiceDetailModal.tsx:114`.
- Cookie consent buttons only reload, store nothing — `Cookies.tsx:65`.
- Client search debounce is a no-op — `ClientsList.tsx:288`.
- Payment amount not validated against balance — `PaymentModal.tsx:92`.
- Map viewport yank every poll — `GPSTrackingMap.tsx:24`; ContainerMap ±5° single-point box.
- Ambient markers: 1500 mounted `<Popup>` subtrees re-rendered every 5s — `FleetMap.tsx:288`.
- AIEmailParser "Autopilot Activ" hardcoded; confidence 0% hidden; allSettled dead catch.

## LOW

- A11y: modals lack focus-trap/role=dialog/Escape; inputs missing `htmlFor`/`id`;
  table rows not keyboard-navigable; emoji as functional icons.
- Fabricated content on landing (testimonials, `500+` vs `5k+`, partner logos).
- `console.error`/`console.warn` leftovers.
- ContainerMap loads marker icons from external CDN (fails on restricted networks).
- NotFoundPage light theme vs dark site.
- Hardcoded "© 2025" in Login vs dynamic year in footer.
- Hero image `loading="lazy"` hurts LCP.
- VerifyEmail auto-verifies on mount (bots/scanners consume token).
