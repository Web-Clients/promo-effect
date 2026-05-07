# Plan Master 100 Taskuri — Promo-Effect Mobile/Responsive Optimization

**Data:** 2026-05-07
**Scope:** Promo-Effect FULLY responsive pe toate device-urile (mobile, tablet, desktop, ultrawide)
**Stack actual:** React 19 + Vite + Tailwind CSS v4 (CSS-first config în `index.css`) + react-leaflet + i18next
**Estimare totală:** 4-6 săptămâni pentru un dezvoltator senior
**Status:** Plan only — NU se implementează nimic până la aprobarea fazelor.

---

## 1. Cercetare 2026 best practices (sumar)

### 1.1 Container Queries + Media Queries — pattern hibrid 2026

- Container queries (`@container`, `@sm:`, `@lg:` în Tailwind v4) pentru componente reutilizabile (cards, tabele, navigare).
- Media queries (`md:`, `lg:`) păstrate pentru layout global și user-preferences (`prefers-reduced-motion`, `prefers-color-scheme`).
- Tailwind v4 oferă suport nativ `@container` cu `container-type: inline-size`. Browser support 95%+ în 2026.
- "Container-first" design: stabilește breakpoints pe baza locului unde **componenta** se rupe, nu pe device-uri.

### 1.2 Mobile-first SaaS dashboard 2026

- Ierarhie strictă: 3-5 KPI critice afișate pe mobil, restul în drawer/accordion.
- Bottom navigation persistent pe mobil (3-5 destinații primare în zona thumb-friendly).
- Bottom sheets în loc de modals pentru context secundar.
- Touch targets minim **44×44 CSS px** (WCAG 2.5.5 AAA, Apple HIG); Material Design recomandă **48×48 dp**.
- Single-column stacking, charts simplificate (sparklines vs donut complex), progressive disclosure.

### 1.3 Fluid typography cu `clamp()`

- Pattern: `font-size: clamp(<min>rem, <base>rem + <slope>vw, <max>rem)`.
- Convertit în rem (px/16) ca să respecte preferințele user-ului.
- Elimină 80% din breakpoint-urile explicite pentru typography.
- Tailwind v4: tokens `--text-*` cu valori clamp în `@theme`.

### 1.4 WCAG mobile 2.5.5 + 2.5.8

- 2.5.5 Target Size **Enhanced (AAA)** = 44×44 px obligatoriu.
- 2.5.8 Target Size **Minimum (AA, WCAG 2.2)** = 24×24 px (cu spacing).
- Hit-area > visual size acceptat (padding around small icons).
- Excepții: link-uri inline în text, controale native ale browserului, controale esențial-fixe.

### 1.5 Responsive tables 2026

- **Cards on mobile** (sub 640px): fiecare rând → card cu 3-4 câmpuri prioritare + drawer pentru rest.
- **Sticky first column + horizontal scroll** pe tablet (640-1023px) când coloanele depășesc viewportul.
- **Sticky header** universal cu `position: sticky`.
- Progressive disclosure: chip "+ N more" pentru câmpuri ascunse.
- Sortare/filtre desktop = coloane click; mobile = bottom sheet cu opțiuni.

### 1.6 PWA pentru logistică 2026

- Service worker e baseline în 2026, nu opțional.
- Caching strategy hibrid: cache-first pentru asset-uri statice, network-first pentru API-uri tracking, stale-while-revalidate pentru date semi-statice (porturi, linii maritime).
- Background sync pentru upload documente offline.
- Web Push pentru ETA changes / status booking.
- `manifest.json` cu icons 192/512 + screenshots cu `display: standalone`.

### 1.7 Viewport meta + viewport units

- `<meta name="viewport" content="width=device-width, initial-scale=1.0">` (deja prezent — bine).
- Folosește `dvh`/`svh`/`lvh` în loc de `vh` (rezolvă problema iOS Safari URL bar).
- `100svh` pentru fullscreen modal mobile, `100dvh` pentru main layout.

### 1.8 Performance mobile

- Image lazy-load nativ (`loading="lazy"`).
- Responsive images: `srcSet` + `sizes`.
- Code splitting per route (`React.lazy` + `Suspense`).
- Bundle budget: < 250KB JS gzip pe ruta inițială.
- LCP target: < 2.5s pe 4G simulat; INP < 200ms.

---

## 2. Audit stare curentă — pain points

### Cod găsit

- **Tailwind v4** CSS-first (nu există `tailwind.config.js`); theme în `index.css`. Lipsește definirea explicită a breakpoints custom + tokens fluid typography.
- **DashboardLayout.tsx** (`components/DashboardLayout.tsx:136`): sidebar e `hidden md:flex` → pe mobile **nu există nicio navigație vizibilă**. Hamburger lipsește. `aria-expanded` setat pe buton care comută collapse desktop, NU mobile drawer.
- **BookingsTable.tsx** (12 coloane fixe + checkbox = 13): `overflow-x-auto` deci scroll orizontal forțat pe mobile, fără sticky column, fără card alternative.
- **Tabele similare**: `ShippingLinesPage`, `UserManagement`, `TransportRatesPage` (×2), `AgentPriceManager`, `LandingPage`, `AdminPortsManager`, `AgentPricesDashboard`, `ClientsList`, `ContainersInTransit`, `AgentsPanel`, `InvoicesList` — toate folosesc același pattern `overflow-x-auto + <table>` fără responsive cards.
- **CalculatorForm.tsx**: form sticky `top-24` pe desktop dar pe mobile poate ocupa tot ecranul (392 linii, multe câmpuri).
- **MainDashboard.tsx**: KPI grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` corect; charts `h-64` fix → recharts nu se redimensionează ideal sub 380px.
- **Modals** (`ConfirmDialog`, `TextInputDialog`, `ContactRepModal`): `fixed inset-0 flex items-center justify-center` cu container max-width — pe mobile foarte mic ar trebui să devină full-screen sheet.
- **Toasts** (`Toast.tsx:71`): `fixed top-5 right-5 max-w-sm` — pe mobile mic se suprapune cu safe-area și hamburger.
- **Tooltips** (`CalculatorForm.tsx:211`): tooltip absolute `w-64` — pe mobile fără hover, tooltip-ul nu apare niciodată; trebuie tap → bottom sheet.
- **GPSTrackingMap.tsx** (Leaflet) și **LogisticsMap.tsx** (SVG): containere fără `h-[100svh]` mobile → safari iOS taie partea de jos.
- **Login.tsx:74**: hero `hidden lg:flex` corect; `lg:hidden` logo afișat → OK.
- **Tabs.tsx:23**: deja folosește `overflow-x-auto` cu `space-x-6 sm:space-x-8` — bun pattern pentru tab-uri scroll horizontal.
- **PWA**: `public/` are doar `favicon.ico`, `robots.txt`, `sitemap.xml` — **nu există `manifest.json` sau service worker**.
- **viewport meta**: prezent în `index.html` — OK.
- **Reduced motion**: deja gestionat în `index.css:28-37` — OK.
- **Skip link**: prezent în `DashboardLayout.tsx:128` — OK.
- **Focus-visible**: outline global în `index.css:40-43` — OK.

### Concluzii pain-points P0

1. Navigația dispare complet pe mobile (sidebar `hidden md:flex` fără înlocuire).
2. 13 tabele fără responsive cards.
3. Touch targets < 44×44 (multe butoane mici, checkboxes 16×16).
4. Lipsă PWA / offline (critică pentru logistică teren).
5. Lipsă fluid typography (text fix poate fi prea mic pe iPhone SE / prea mare pe iPad Pro).

---

## 3. Breakpoints stabilite

| Nume       | Range       | Tailwind prefix | Use case                     |
| ---------- | ----------- | --------------- | ---------------------------- |
| mobile-xs  | 320-374px   | (default)       | iPhone SE, Galaxy S          |
| mobile     | 375-639px   | `xs:` (custom)  | iPhone 13/15, Pixel          |
| tablet-sm  | 640-767px   | `sm:`           | mini-tablet, landscape phone |
| tablet     | 768-1023px  | `md:`           | iPad portrait                |
| desktop    | 1024-1279px | `lg:`           | iPad landscape, laptop       |
| desktop-lg | 1280-1535px | `xl:`           | desktop standard             |
| ultrawide  | 1536px+     | `2xl:`          | 4K, ultrawide monitor        |

**Container query breakpoints (per componentă):**

- `@xs` 280px, `@sm` 480px, `@md` 640px, `@lg` 800px, `@xl` 1024px.

---

## 4. FAZA A — Foundation (10 taskuri)

### A1. Configurare breakpoints custom în `index.css`

Adaugă `--breakpoint-xs: 22.5rem` (360px) și ajustează `--breakpoint-2xl: 96rem` în `@theme`.

- **Fișiere:** `index.css`
- **Estimare:** 1h | **Prioritate:** P0
- **Succes:** `<div class="xs:hidden">` funcțional în Vite dev.

### A2. Activare container queries Tailwind v4

Activează `@plugin "@tailwindcss/container-queries"` în `index.css` și expune utilități `@container`, `@sm/{name}`, `@lg/{name}`.

- **Fișiere:** `index.css`, `package.json` (install plugin)
- **Estimare:** 1h | **Prioritate:** P0
- **Succes:** clasele `@container` și `@sm:` recunoscute pe `BookingsTable` wrapper.

### A3. Adăugare fluid typography tokens cu `clamp()`

Adaugă în `@theme` tokens: `--text-xs`, `--text-sm`, `--text-base`, `--text-lg`, `--text-xl`, `--text-2xl`, `--text-3xl`, `--text-4xl` cu valori clamp(min, base+vw, max).

- **Fișiere:** `index.css`
- **Estimare:** 2h | **Prioritate:** P0
- **Succes:** `text-base` scalează lin între 320px (14px) și 1920px (17px).

### A4. Adăugare fluid spacing tokens

Adaugă tokens `--spacing-fluid-{1..12}` cu clamp pentru padding/gap responsive.

- **Fișiere:** `index.css`
- **Estimare:** 1h | **Prioritate:** P1
- **Succes:** `gap-fluid-4` aplicabil în grid.

### A5. Înlocuire `vh`/`min-h-screen` cu `dvh`/`svh`

Search-and-replace `min-h-screen` → `min-h-[100svh]` pe layout-uri principale; `h-screen` cu `h-[100dvh]` pe sidebar fixed.

- **Fișiere:** `DashboardLayout.tsx`, `Login.tsx`, `Register.tsx`, `LandingPage.tsx`
- **Estimare:** 1h | **Prioritate:** P0
- **Succes:** iOS Safari URL bar nu mai taie footer.

### A6. Tap target utility class custom

Adaugă în `index.css` clasa `.tap-target` care forțează `min-height: 44px; min-width: 44px;` pe butoane/checkboxes mici.

- **Fișiere:** `index.css`
- **Estimare:** 0.5h | **Prioritate:** P0
- **Succes:** Lighthouse "Tap targets" trece > 95.

### A7. Adăugare safe-area insets (notch iPhone)

`padding: env(safe-area-inset-top)` etc pe header/footer/bottom-nav.

- **Fișiere:** `index.css`, `DashboardLayout.tsx`
- **Estimare:** 1h | **Prioritate:** P1
- **Succes:** Pe iPhone 15 Pro, header nu se suprapune cu notch.

### A8. Update `index.html` viewport meta cu `viewport-fit=cover`

`<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">`.

- **Fișiere:** `index.html`
- **Estimare:** 0.1h | **Prioritate:** P0
- **Succes:** safe-area-inset funcționează.

### A9. Configurare Tailwind tokens pentru dark mode mobile-friendly

Verifică contrast 4.5:1 toate culorile pe sun glare (text-secondary > 4.5:1 contrast pe bg-secondary).

- **Fișiere:** `index.css`
- **Estimare:** 2h | **Prioritate:** P1
- **Succes:** axe-core 0 contrast violations.

### A10. Crearea hook `useBreakpoint()` și `useContainerQuery()`

Hook util React pentru logică condiționată în JS (când CSS nu ajunge: ex. ce pattern de tabel afișezi).

- **Fișiere:** `hooks/useBreakpoint.ts` (nou)
- **Estimare:** 2h | **Prioritate:** P1
- **Succes:** `const { isMobile } = useBreakpoint()` returnează boolean reactiv.

---

## 5. FAZA B — Layout & Navigation (15 taskuri)

### B1. Sidebar mobile drawer cu overlay

Convertește `aside` din `hidden md:flex` în `fixed -translate-x-full md:translate-x-0` cu state `mobileOpen` și backdrop click-to-close.

- **Fișiere:** `DashboardLayout.tsx`
- **Estimare:** 4h | **Prioritate:** P0
- **Succes:** Hamburger pe mobile deschide sidebar peste content cu overlay.

### B2. Hamburger button în header mobile

Adaugă buton hamburger `md:hidden` în header `DashboardLayout` cu icon și `aria-controls="mobile-sidebar"`, `aria-expanded={mobileOpen}`.

- **Fișiere:** `DashboardLayout.tsx`, `components/icons.tsx`
- **Estimare:** 1.5h | **Prioritate:** P0
- **Succes:** Tap hamburger toggle drawer pe iPhone simulator.

### B3. Bottom navigation pe mobile (3-5 tab-uri primare)

Componentă nouă `BottomNav.tsx` cu Dashboard / Bookings / Calculator / Tracking / More. Vizibil doar `<md`.

- **Fișiere:** `components/BottomNav.tsx` (nou), `DashboardLayout.tsx`
- **Estimare:** 4h | **Prioritate:** P0
- **Succes:** Tabs vizibile pe mobile, ascunse pe desktop, navigate funcțional.

### B4. Header mobile mai compact (h-12 vs h-16)

Pe mobile header redus la 48px (`h-12`) ca să economisim spațiu vertical.

- **Fișiere:** `DashboardLayout.tsx`
- **Estimare:** 0.5h | **Prioritate:** P1
- **Succes:** mai mult content vizibil deasupra fold pe iPhone SE.

### B5. Search bar collapsible pe mobile

În loc de input full-width pe mobile, doar icon search care expandă în overlay full-width la tap.

- **Fișiere:** `DashboardLayout.tsx`
- **Estimare:** 2h | **Prioritate:** P1
- **Succes:** Header mobile nu mai e dominat de search.

### B6. NotificationsDropdown adaptat full-screen pe mobile

Pe mobile deschide ca bottom sheet, nu dropdown absolut.

- **Fișiere:** `NotificationsDropdown.tsx`
- **Estimare:** 2h | **Prioritate:** P1
- **Succes:** Lista notificări ușor de citit pe iPhone.

### B7. UserProfile menu → bottom sheet pe mobile

Avatar tap pe mobile = bottom sheet cu profile/settings/logout.

- **Fișiere:** `UserProfile.tsx`, `DashboardLayout.tsx`
- **Estimare:** 2h | **Prioritate:** P1
- **Succes:** UX consistent cu alte bottom sheets.

### B8. PublicHeader mobile menu (hamburger + drawer)

Pentru landing/login/register: hamburger + drawer cu link-uri public.

- **Fișiere:** `PublicHeader.tsx`
- **Estimare:** 2h | **Prioritate:** P0
- **Succes:** Landing page navigabil pe mobile.

### B9. Sticky bottom CTA pe LandingPage mobile

"Solicită ofertă" sticky bottom pe mobile pentru conversie.

- **Fișiere:** `LandingPage.tsx`
- **Estimare:** 1h | **Prioritate:** P2
- **Succes:** CTA mereu vizibil pe scroll.

### B10. Skip link mobile-friendly cu animație

Skip link existent OK, dar verificat pe screen reader iOS VoiceOver.

- **Fișiere:** `DashboardLayout.tsx`
- **Estimare:** 0.5h | **Prioritate:** P2
- **Succes:** VoiceOver anunță skip link la primul Tab.

### B11. Sidebar collapse/expand persistat în localStorage

Deja există state, persistă cu key `sidebar-collapsed`.

- **Fișiere:** `DashboardLayout.tsx`, `hooks/useLocalStorage.ts`
- **Estimare:** 1h | **Prioritate:** P2
- **Succes:** Refresh păstrează preferința.

### B12. Mobile sidebar swipe-to-close gesture

Cu `@use-gesture/react` sau touch event handlers nativi.

- **Fișiere:** `DashboardLayout.tsx`
- **Estimare:** 3h | **Prioritate:** P2
- **Succes:** Swipe stânga închide drawer.

### B13. Breadcrumbs collapsible pe mobile

Dacă breadcrumb depășește 1 rând: afișează doar "..." + ultimul.

- **Fișiere:** `components/shared/Breadcrumbs.tsx` (verifică existent)
- **Estimare:** 2h | **Prioritate:** P2
- **Succes:** Nu rupe header pe iPhone SE.

### B14. Mobile tabs scroll-snap

Tabs orizontale: `scroll-snap-type: x mandatory` pentru UX nativ.

- **Fișiere:** `components/ui/Tabs.tsx`
- **Estimare:** 1h | **Prioritate:** P1
- **Succes:** Swipe între tab-uri se „prinde" la fiecare tab.

### B15. Focus trap în mobile drawer

Când drawer deschis: focus trapped înăuntru, ESC închide.

- **Fișiere:** `DashboardLayout.tsx`, `hooks/useFocusTrap.ts` (nou sau radix-ui)
- **Estimare:** 2h | **Prioritate:** P0 (a11y)
- **Succes:** Tab nu scapă din drawer; ESC închide.

---

## 6. FAZA C — Tables Responsive (15 taskuri)

### C1. Component generic `ResponsiveTable` cu pattern card-on-mobile

Wrapper componentă: pe `<sm` randează cards, pe `>=sm` randează `<table>`. Definit prin prop `columns: ColumnDef[]`.

- **Fișiere:** `components/ui/ResponsiveTable.tsx` (nou)
- **Estimare:** 6h | **Prioritate:** P0
- **Succes:** Refolosit pe toate cele 13 tabele.

### C2. `BookingsTable` → cards pe mobile

3 câmpuri prioritare per card (BL + Status + ETA), restul în drawer/expand.

- **Fișiere:** `components/bookings/BookingsTable.tsx`
- **Estimare:** 4h | **Prioritate:** P0
- **Succes:** iPhone SE 320px afișează cards lizibile.

### C3. Sticky first column pentru tablele care rămân `<table>` pe tablet

`position: sticky; left: 0; background: var(--bg-primary)` pe `<th>:first-child` și `<td>:first-child`.

- **Fișiere:** `components/ui/Table.tsx` (utilitate), `BookingsTable.tsx`
- **Estimare:** 2h | **Prioritate:** P0
- **Succes:** Scroll orizontal cu BL number mereu vizibil.

### C4. Sticky table header

`<thead>` cu `position: sticky; top: 0`.

- **Fișiere:** `components/ui/Table.tsx`, toate cele 13 tabele
- **Estimare:** 2h | **Prioritate:** P1
- **Succes:** Scroll vertical lung lasă header vizibil.

### C5. `ClientsList` → cards mobile

Card cu nume + status + acțiuni; restul detail în navigate.

- **Fișiere:** `components/ClientsList.tsx`
- **Estimare:** 3h | **Prioritate:** P0
- **Succes:** Listă clienți utilizabilă pe mobile.

### C6. `InvoicesList` → cards mobile

Card cu factură nr + suma + status + buton download/view.

- **Fișiere:** `components/InvoicesList.tsx`
- **Estimare:** 3h | **Prioritate:** P0
- **Succes:** Aprobă factură pe mobile fără scroll horizontal.

### C7. `ContainersInTransit` → cards mobile cu progress bar ETA

Card cu container nr + rută + progress bar ETA + status.

- **Fișiere:** `components/ContainersInTransit.tsx`
- **Estimare:** 3h | **Prioritate:** P0
- **Succes:** Status vizual clar pe mobile.

### C8. `UserManagement` → cards mobile

Card cu nume + rol + status + acțiuni edit/delete în dropdown.

- **Fișiere:** `components/UserManagement.tsx`
- **Estimare:** 3h | **Prioritate:** P1
- **Succes:** Admin gestionează users pe mobile.

### C9. `ShippingLinesPage` → cards mobile

Card per linie maritimă cu logo + name + actions.

- **Fișiere:** `components/ShippingLinesPage.tsx`
- **Estimare:** 2h | **Prioritate:** P1
- **Succes:** Linii vizibile fără scroll.

### C10. `TransportRatesPage` matrix — scroll orizontal cu indicator

Matrix prețuri rămâne tabel (matrix dens), dar adaugă indicator gradient stânga/dreapta + sticky first col + sticky header.

- **Fișiere:** `components/TransportRatesPage.tsx`
- **Estimare:** 3h | **Prioritate:** P1
- **Succes:** User vede că poate scroll lateral.

### C11. `AdminPortsManager` → cards mobile cu inline edit

Card port cu nume + țară + buton edit care deschide bottom sheet.

- **Fișiere:** `components/AdminPortsManager.tsx`
- **Estimare:** 3h | **Prioritate:** P1
- **Succes:** Edit port pe mobile fluid.

### C12. `AgentsPanel` și `AgentPriceManager` → cards mobile

Card agent cu nume + status + buton manage prices.

- **Fișiere:** `components/AgentsPanel.tsx`, `components/AgentPriceManager.tsx`
- **Estimare:** 4h | **Prioritate:** P1
- **Succes:** Admin agents accesibil pe mobile.

### C13. `AgentPricesDashboard` → cards mobile + filter chips orizontal scroll

Filter chips în `overflow-x-auto` cu scroll-snap.

- **Fișiere:** `components/AgentPricesDashboard.tsx`
- **Estimare:** 3h | **Prioritate:** P1
- **Succes:** Filtre accesibile pe mobile.

### C14. Sortare pe mobile: bottom sheet cu opțiuni sort

Pe desktop click coloană sortează; pe mobile buton "Sort" deschide sheet cu radio.

- **Fișiere:** `components/ui/ResponsiveTable.tsx`
- **Estimare:** 3h | **Prioritate:** P1
- **Succes:** User poate sorta lista pe mobile.

### C15. Filter drawer pe mobile (înlocuiește filters bar)

Buton "Filtre" deschide drawer dreapta cu toate filtrele.

- **Fișiere:** `components/bookings/BookingsFilters.tsx`, `components/ui/FilterDrawer.tsx` (nou)
- **Estimare:** 4h | **Prioritate:** P0
- **Succes:** Filter complex pe mobile fluent.

---

## 7. FAZA D — Forms (15 taskuri)

### D1. `CalculatorForm` → wizard multi-step pe mobile

Pe `<sm` formul cu pași: 1.Origin/Destination 2.Containers 3.Cargo details 4.Result.

- **Fișiere:** `components/calculator/CalculatorForm.tsx`
- **Estimare:** 6h | **Prioritate:** P0
- **Succes:** Calculator usabil pe iPhone SE fără pinch zoom.

### D2. Touch targets 44×44 pe toate inputs/buttons

Audit + ajustare `py-2` → `py-3` pe inputs, `h-10` minim pe butoane.

- **Fișiere:** `components/ui/Button.tsx`, `components/ui/Input.tsx`, `FormElements.tsx`
- **Estimare:** 3h | **Prioritate:** P0
- **Succes:** Lighthouse Tap Targets > 95.

### D3. Native keyboards: `inputmode` + `type` corect

Toate input-uri telefon: `type="tel" inputmode="tel"`. Email: `type="email" inputmode="email"`. Numerice: `type="number" inputmode="decimal"`.

- **Fișiere:** Toate forms (Login, Register, ForgotPassword, ResetPassword, Calculator, Profile)
- **Estimare:** 2h | **Prioritate:** P0
- **Succes:** Pe iPhone, focus pe phone field deschide keypad.

### D4. Floating labels pe forms (mai economice ca spațiu)

Label flotant deasupra input-ului când focus/filled.

- **Fișiere:** `components/ui/Input.tsx`
- **Estimare:** 4h | **Prioritate:** P2
- **Succes:** Forms compact pe mobile.

### D5. Inline validation cu icon + text

Validare onBlur cu icon ✓/✗ + text helper roșu.

- **Fișiere:** `components/ui/Input.tsx`
- **Estimare:** 3h | **Prioritate:** P1
- **Succes:** User vede eroare imediat, nu la submit.

### D6. Auto-grow textarea pe mobile

Textarea care se extinde după conținut, max 8 linii.

- **Fișiere:** `components/ui/Textarea.tsx` (verifică existent)
- **Estimare:** 1h | **Prioritate:** P2
- **Succes:** Textarea nu mai forțează scroll intern.

### D7. Number inputs cu butoane +/- vizibile

Pe `containers` count + greutate kg, butoane mari +/- înlocuiesc spinner-ul nativ.

- **Fișiere:** `components/calculator/CalculatorForm.tsx`, `components/ui/NumberInput.tsx` (nou)
- **Estimare:** 3h | **Prioritate:** P1
- **Succes:** Tap pe iPhone increments easy.

### D8. Date pickers native pe mobile (`<input type="date">`)

În loc de date picker custom; păstrează custom doar pe desktop dacă nevoie de range.

- **Fișiere:** Toate forms cu date
- **Estimare:** 2h | **Prioritate:** P1
- **Succes:** iOS native picker se deschide.

### D9. Select dropdown → bottom sheet pe mobile

Pentru selecturi cu > 5 opțiuni (linie maritimă, port).

- **Fișiere:** `components/ui/Select.tsx` (verifică existent)
- **Estimare:** 4h | **Prioritate:** P1
- **Succes:** Selecție linie maritimă fluentă.

### D10. `HSCodeAutocomplete` mobile-optimized

Bottom sheet full-screen cu search + listă rezultate; tap selectează.

- **Fișiere:** `components/calculator/HSCodeAutocomplete.tsx`
- **Estimare:** 3h | **Prioritate:** P0
- **Succes:** Autocomplete utilizabil pe iPhone.

### D11. Login form: 1 column mobile, 2 columns desktop

Verifică deja `lg:flex` corect.

- **Fișiere:** `components/Login.tsx`
- **Estimare:** 0.5h | **Prioritate:** P2
- **Succes:** Login fluent pe toate device-urile.

### D12. Register form: progressive disclosure (collapsible secțiuni)

Secțiunile "Date facturare" + "Adresă" collapsate by default pe mobile.

- **Fișiere:** `components/Register.tsx`
- **Estimare:** 3h | **Prioritate:** P1
- **Succes:** Register pe mobile sub 2 ecrane scroll.

### D13. Auto-save indicator + draft persistat

LocalStorage draft form pentru calculator (nu pierde input la rotire).

- **Fișiere:** `components/calculator/useCalculator.ts`
- **Estimare:** 3h | **Prioritate:** P1
- **Succes:** Rotire device păstrează input.

### D14. Submit button sticky bottom pe mobile

CTA principal sticky bottom în forms lungi (Calculator, Register).

- **Fișiere:** `CalculatorForm.tsx`, `Register.tsx`
- **Estimare:** 2h | **Prioritate:** P1
- **Succes:** CTA mereu accesibil.

### D15. Error summary la top form după submit

Listă erori cu link-uri care focus inputul corespunzător.

- **Fișiere:** Toate forms
- **Estimare:** 3h | **Prioritate:** P1
- **Succes:** A11y screen reader anunță erori.

---

## 8. FAZA E — Components (15 taskuri)

### E1. `ConfirmDialog` → bottom sheet pe mobile, modal pe desktop

Pe `<sm`: slide-up din bottom; pe `>=sm`: centered modal.

- **Fișiere:** `components/ui/ConfirmDialog.tsx`
- **Estimare:** 3h | **Prioritate:** P0
- **Succes:** Confirmare șterge booking confortabil pe mobile.

### E2. `TextInputDialog` → bottom sheet pe mobile

Same pattern ca E1.

- **Fișiere:** `components/ui/ConfirmDialog.tsx`
- **Estimare:** 1h | **Prioritate:** P0
- **Succes:** Input modal full-width pe mobile.

### E3. `ContactRepModal` → full-screen sheet pe mobile

Modal contact = bottom sheet cu form.

- **Fișiere:** `components/calculator/ContactRepModal.tsx`
- **Estimare:** 2h | **Prioritate:** P1
- **Succes:** Contact rep fluid pe iPhone.

### E4. Componentă `BottomSheet` reutilizabilă

Bază comună (radix-ui sau headless implementation) cu drag-to-dismiss.

- **Fișiere:** `components/ui/BottomSheet.tsx` (nou)
- **Estimare:** 5h | **Prioritate:** P0
- **Succes:** Folosit de minim 5 alte componente.

### E5. Toast container responsive (top-center pe mobile, top-right pe desktop)

Toast `top-5 right-5` actual → `top-2 left-2 right-2 sm:left-auto sm:right-5 sm:max-w-sm`.

- **Fișiere:** `components/ui/Toast.tsx`
- **Estimare:** 1h | **Prioritate:** P0
- **Succes:** Toast nu se suprapune cu hamburger.

### E6. Tooltips → buton "?" + bottom sheet pe mobile

Tooltip-urile actuale (CalculatorForm linia 211) absolute nu funcționează pe touch — buton "?" tap deschide sheet cu explicații.

- **Fișiere:** `components/ui/Tooltip.tsx` (nou sau extins)
- **Estimare:** 3h | **Prioritate:** P0
- **Succes:** Help text accesibil pe touch devices.

### E7. Card hover effects → tap effects pe mobile

`hover:scale-105` + adaugă `active:scale-95` pentru feedback tactil.

- **Fișiere:** Toate cards (KpiCard, OfferCard, BookingCard etc.)
- **Estimare:** 2h | **Prioritate:** P2
- **Succes:** Feedback vizual la tap.

### E8. Avatars cu `srcSet` pentru retina

Image variants 2x/3x pentru DPR mare.

- **Fișiere:** `components/DashboardLayout.tsx` (Avatar)
- **Estimare:** 1h | **Prioritate:** P2
- **Succes:** Avatar crisp pe iPhone retina.

### E9. KpiCard responsive (compact pe mobile)

`p-6` → `p-4 md:p-6`; icon mai mic pe mobile.

- **Fișiere:** `components/KpiCard.tsx`
- **Estimare:** 1h | **Prioritate:** P1
- **Succes:** 4 KPI vizibile pe iPhone landscape.

### E10. File upload: drag-drop desktop, native picker mobile

Detect touch device → arată buton "Choose file"; desktop păstrează drag area.

- **Fișiere:** `components/ui/FileUpload.tsx` (verifică existent)
- **Estimare:** 3h | **Prioritate:** P1
- **Succes:** Upload doc booking funcțional pe mobile.

### E11. Date range picker → calendar inline pe desktop, native picker pe mobile

- **Fișiere:** `components/ui/DateRangePicker.tsx` (verifică existent)
- **Estimare:** 4h | **Prioritate:** P1
- **Succes:** Filter date range mobile-friendly.

### E12. `Pagination` component responsive

Pe mobile: doar Prev / "X of Y" / Next; desktop: numbers full.

- **Fișiere:** `components/ui/Pagination.tsx` (verifică existent)
- **Estimare:** 2h | **Prioritate:** P1
- **Succes:** Pagination compact pe mobile.

### E13. Charts (Recharts) responsive cu `<ResponsiveContainer>`

Verifică Recharts wrappers pe `MainDashboard`, `ReportsPage`.

- **Fișiere:** `components/MainDashboard.tsx`, `components/ReportsPage.tsx`
- **Estimare:** 2h | **Prioritate:** P0
- **Succes:** Chart-uri se redimensionează pe rotire device.

### E14. Mobile: charts simplificate (bar→sparkline, donut→bar)

Pe `<md` afișează variante mai simple ale chart-urilor.

- **Fișiere:** `components/MainDashboard.tsx`
- **Estimare:** 4h | **Prioritate:** P1
- **Succes:** Chart-uri lizibile pe iPhone fără pinch.

### E15. Empty states cu illustration responsive

Illustration SVG scalează cu container; text stack vertical pe mobile.

- **Fișiere:** Toate empty states (BookingsTable, ClientsList etc.)
- **Estimare:** 2h | **Prioritate:** P2
- **Succes:** Empty states arată profi pe mobile.

---

## 9. FAZA F — Specific pages (15 taskuri)

### F1. `MainDashboard` KPI cards stacked pe mobile

Deja `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` — ajustează gap (`gap-3` mobile, `gap-5` desktop).

- **Fișiere:** `components/MainDashboard.tsx`
- **Estimare:** 1h | **Prioritate:** P1
- **Succes:** Layout fluid.

### F2. `MainDashboard` charts side-by-side desktop, stacked mobile

Deja `grid-cols-1 lg:grid-cols-2` corect.

- **Fișiere:** `components/MainDashboard.tsx`
- **Estimare:** 0.5h | **Prioritate:** P2
- **Succes:** Chart container flex.

### F3. `Calculator` collapsible sections pe mobile

Card calcul, card supplier, card results: collapsible cu accordion.

- **Fișiere:** `components/calculator/PriceCalculatorContainer.tsx`
- **Estimare:** 4h | **Prioritate:** P0
- **Succes:** Calculator pe mobile sub 1.5 ecrane scroll.

### F4. `BookingDetail` tabs pe mobile (info / map / docs / payments)

Header booking + tabs sticky; conținut tab fullscreen.

- **Fișiere:** `components/BookingDetail.tsx`, `components/bookings/detail/`
- **Estimare:** 5h | **Prioritate:** P0
- **Succes:** Detail booking utilizabil pe mobile.

### F5. `BookingDetail` map fullscreen mode

Buton "expand map" pe mobile face map full-screen.

- **Fișiere:** `components/bookings/BookingMap.tsx`
- **Estimare:** 3h | **Prioritate:** P1
- **Succes:** User vede map fullscreen pe mobile.

### F6. `AdminPricingPanel` matrix responsive

Care e doar 8 linii — verifică, posibil cards pe mobile.

- **Fișiere:** `components/AdminPricingPanel.tsx`
- **Estimare:** 3h | **Prioritate:** P1
- **Succes:** Admin pricing accesibil pe mobile.

### F7. `AdminSettingsPage` → list view pe mobile

Settings sections ca list cu chevron right pe mobile, side-by-side desktop.

- **Fișiere:** `components/AdminSettingsPage.tsx`
- **Estimare:** 3h | **Prioritate:** P1
- **Succes:** Settings ușor de navigat pe mobile.

### F8. `LandingPage` hero responsive

Hero text + CTA centered mobile, side-by-side desktop. Background image scalat.

- **Fișiere:** `components/LandingPage.tsx`
- **Estimare:** 2h | **Prioritate:** P0
- **Succes:** Landing arată profesional pe mobile.

### F9. `LandingPage` features grid 1 col mobile, 3 col desktop

- **Fișiere:** `components/LandingPage.tsx`
- **Estimare:** 1h | **Prioritate:** P1
- **Succes:** Features lizibile pe mobile.

### F10. `LandingPage` pricing table → cards pe mobile

Tabelul prețuri (linia 274) deja `overflow-x-auto`; convertește la 3 cards stacked pe mobile.

- **Fișiere:** `components/LandingPage.tsx`
- **Estimare:** 3h | **Prioritate:** P1
- **Succes:** Pricing decision easy pe mobile.

### F11. `ReportsPage` filtre + tabel responsive

Filtre în drawer pe mobile, tabel cards.

- **Fișiere:** `components/ReportsPage.tsx`
- **Estimare:** 4h | **Prioritate:** P1
- **Succes:** Reports utile pe mobile.

### F12. `TrackingView` map full-width mobile

Map ocupă toată lățimea pe mobile, info panel below.

- **Fișiere:** `components/TrackingView.tsx`, `components/TrackingTimeline.tsx`
- **Estimare:** 3h | **Prioritate:** P0
- **Succes:** Tracking utilizabil pe iPhone.

### F13. `ContainerMap` și `LogisticsMap` responsive height

`h-[60vh] md:h-[80vh]` în loc de fix.

- **Fișiere:** `components/ContainerMap.tsx`, `components/LogisticsMap.tsx`
- **Estimare:** 1h | **Prioritate:** P0
- **Succes:** Map nu mai depășește viewport mobile.

### F14. `GPSTrackingMap` Leaflet controls touch-friendly

Zoom controls 44×44, pinch-zoom enabled, double-tap zoom.

- **Fișiere:** `components/GPSTrackingMap.tsx`
- **Estimare:** 2h | **Prioritate:** P1
- **Succes:** Map control pe touch.

### F15. `EmailParserAssistant` și `AIEmailParser` mobile layout

Side-by-side preview + parsed data pe desktop; tabs pe mobile.

- **Fișiere:** `components/EmailParserAssistant.tsx`, `components/AIEmailParser.tsx`
- **Estimare:** 3h | **Prioritate:** P2
- **Succes:** Email parser accesibil pe mobile.

---

## 10. FAZA G — Performance & PWA (10 taskuri)

### G1. Lazy load images cu `loading="lazy"`

Audit toate `<img>` și adaugă `loading="lazy"` (excepție LCP image).

- **Fișiere:** Toate cu `<img>`
- **Estimare:** 2h | **Prioritate:** P1
- **Succes:** Network panel arată lazy load.

### G2. Responsive images cu `srcSet` + `sizes`

Pentru imagini hero/landing/avatar.

- **Fișiere:** `LandingPage.tsx`, `Login.tsx`
- **Estimare:** 3h | **Prioritate:** P1
- **Succes:** iPhone descarcă varianta 1x, MacBook Pro 2x.

### G3. Code splitting per route (`React.lazy`)

Verifică ce e deja split; adaugă pentru rutele admin (rare load).

- **Fișiere:** `App.tsx`
- **Estimare:** 3h | **Prioritate:** P0
- **Succes:** Bundle inițial < 250KB gzip.

### G4. Bundle analyzer + reducere

`vite-bundle-visualizer`, identifică heavy deps (Recharts, Leaflet).

- **Fișiere:** `vite.config.ts`
- **Estimare:** 3h | **Prioritate:** P1
- **Succes:** Plan reduce 15% bundle.

### G5. Service worker cu Workbox / vite-plugin-pwa

Install `vite-plugin-pwa`, config caching strategies.

- **Fișiere:** `vite.config.ts`, `package.json`
- **Estimare:** 4h | **Prioritate:** P0
- **Succes:** SW activ în prod, offline shell funcțional.

### G6. `manifest.json` cu icons, theme, screenshots

Generate icons 192/512 (purpose any/maskable), theme color #0a2540.

- **Fișiere:** `public/manifest.json` (nou), `public/icons/` (nou), `index.html`
- **Estimare:** 2h | **Prioritate:** P0
- **Succes:** Lighthouse PWA installable.

### G7. Caching strategy hibrid (cache-first/network-first/SWR)

- Static assets: cache-first
- API tracking: network-first cu fallback
- Linii maritime, porturi: stale-while-revalidate.
- **Fișiere:** `vite.config.ts` workbox config
- **Estimare:** 3h | **Prioritate:** P1
- **Succes:** Tracking funcționează cu net intermitent.

### G8. Install prompt PWA + banner custom

Detectează `beforeinstallprompt`, afișează banner non-intrusive.

- **Fișiere:** `App.tsx`, `components/InstallPrompt.tsx` (nou)
- **Estimare:** 3h | **Prioritate:** P2
- **Succes:** User poate instala app.

### G9. Web Push notifications (ETA changes, status booking)

Backend deja are notifications module — adaugă subscribe/unsubscribe push.

- **Fișiere:** Service worker, `backend/src/modules/notifications/`
- **Estimare:** 6h | **Prioritate:** P2
- **Succes:** Push notif primită pe Android.

### G10. Background sync pentru upload documente offline

Service worker queue upload-uri când offline; sync la reconnect.

- **Fișiere:** Service worker
- **Estimare:** 4h | **Prioritate:** P2
- **Succes:** Upload offline → sync auto.

---

## 11. FAZA H — A11y mobile-specific (10 taskuri)

### H1. Audit Tap Targets (WCAG 2.5.5) toate componentele

Folosind axe-core, verifică toate butoanele/iconurile.

- **Fișiere:** Toate
- **Estimare:** 4h | **Prioritate:** P0
- **Succes:** 0 violări WCAG 2.5.5 AAA.

### H2. Focus order corect cu drawer mobile

Tab după hamburger → drawer items → close button. ESC închide.

- **Fișiere:** `DashboardLayout.tsx`
- **Estimare:** 2h | **Prioritate:** P0
- **Succes:** VoiceOver navighează drawer corect.

### H3. Screen reader VoiceOver iOS testing

Test manual cu VoiceOver toate paginile principale.

- **Fișiere:** Toate
- **Estimare:** 4h | **Prioritate:** P0
- **Succes:** Toate funcțiile usabile cu VO.

### H4. Screen reader TalkBack Android testing

Test manual cu TalkBack.

- **Fișiere:** Toate
- **Estimare:** 4h | **Prioritate:** P1
- **Succes:** Funcțional pe Android.

### H5. Reduced motion support (deja parțial)

Verifică transitions disable, animation parallax disabled, scroll-behavior auto.

- **Fișiere:** `index.css` (deja prezent), audit components
- **Estimare:** 1h | **Prioritate:** P1
- **Succes:** Toate animații respect prefers-reduced-motion.

### H6. Haptic feedback hooks (iOS Safari + Android)

`navigator.vibrate(50)` pe acțiuni critice (submit, delete confirm).

- **Fișiere:** `hooks/useHaptic.ts` (nou)
- **Estimare:** 1h | **Prioritate:** P2
- **Succes:** Tap submit oferă vibrație scurtă.

### H7. Color contrast 4.5:1 mobile (sun glare)

Audit cu Stark/Wave; ajustează `text-secondary` color dacă fail.

- **Fișiere:** `index.css`
- **Estimare:** 2h | **Prioritate:** P0
- **Succes:** axe-core 0 contrast violations.

### H8. ARIA labels pentru iconuri-only buttons

Toate butoanele icon-only au `aria-label` sau `<span class="sr-only">`.

- **Fișiere:** Toate butoane icon (audit)
- **Estimare:** 3h | **Prioritate:** P0
- **Succes:** Screen reader anunță scopul.

### H9. Live regions pentru toast / notifications

`role="status"` sau `role="alert"` pe toast container.

- **Fișiere:** `components/ui/Toast.tsx`
- **Estimare:** 0.5h | **Prioritate:** P0
- **Succes:** VoiceOver anunță toasts.

### H10. Announce loading state cu `aria-busy` și `aria-live`

Skeleton tables, spinners — anunță "loading" la screen reader.

- **Fișiere:** `BookingsTable.tsx` etc.
- **Estimare:** 1h | **Prioritate:** P1
- **Succes:** Screen reader anunță "loading bookings".

---

## 12. FAZA I — Testing (5 taskuri)

### I1. Playwright mobile viewports config

`playwright.config.ts` cu projects: iPhone 13, Pixel 5, iPad. Tests pe rute principale.

- **Fișiere:** `playwright.config.ts`, `e2e/`
- **Estimare:** 3h | **Prioritate:** P0
- **Succes:** `npm run e2e -- --project=mobile` rulează.

### I2. Real device testing (iPhone, Android, iPad)

Test manual: iPhone SE/15, Pixel 7, iPad mini.

- **Fișiere:** N/A — checklist
- **Estimare:** 6h | **Prioritate:** P0
- **Succes:** Toate user flows funcționale.

### I3. Lighthouse mobile audit (target 90+ Performance/A11y/PWA)

CI workflow rulează Lighthouse mobile pe build PR.

- **Fișiere:** `.github/workflows/lighthouse.yml` (nou)
- **Estimare:** 3h | **Prioritate:** P0
- **Succes:** Score Mobile Performance > 90, A11y > 95.

### I4. Visual regression cu Playwright snapshots

Snapshot-uri pe rute principale × 3 viewports.

- **Fișiere:** `e2e/visual-regression/`
- **Estimare:** 4h | **Prioritate:** P1
- **Succes:** Diff vizual fail PR.

### I5. Cross-browser BrowserStack

Test Safari iOS, Chrome Android, Samsung Internet.

- **Fișiere:** N/A — checklist
- **Estimare:** 4h | **Prioritate:** P1
- **Succes:** Toate browsere majore funcționale.

---

## 13. Sumar effort estimat

| Fază                    | Taskuri                     | Estimare                             | Prioritate dominantă |
| ----------------------- | --------------------------- | ------------------------------------ | -------------------- |
| A — Foundation          | 10                          | ~13h (1.5 zile)                      | P0                   |
| B — Layout & Navigation | 15                          | ~31h (4 zile)                        | P0                   |
| C — Tables Responsive   | 15                          | ~48h (6 zile)                        | P0                   |
| D — Forms               | 15                          | ~46h (5.5 zile)                      | P0/P1                |
| E — Components          | 15                          | ~38h (5 zile)                        | P0/P1                |
| F — Specific pages      | 15                          | ~39h (5 zile)                        | P0/P1                |
| G — Performance & PWA   | 10                          | ~33h (4 zile)                        | P0/P1                |
| H — A11y mobile         | 10                          | ~22.5h (3 zile)                      | P0                   |
| I — Testing             | 5                           | ~20h (2.5 zile)                      | P0                   |
| **TOTAL**               | **110** (10 surplus tampon) | **~290h (~36 zile / 7-8 săptămâni)** | mix                  |

**Estimare conservativă (cu reviews + bug fixing):** 4-6 săptămâni full-time pentru senior; 8-10 săptămâni pentru mid.

---

## 14. Strategie execuție recomandată

**Sprint 1 (1 săptămână):** FAZA A + B1-B5 — foundation + sidebar mobile drawer + hamburger + bottom nav. Rezultat: navigația funcționează pe mobile.

**Sprint 2 (1 săptămână):** FAZA C1-C7 — `ResponsiveTable` + 6 tabele cele mai folosite (Bookings, Clients, Invoices, Containers, Users, Shipping Lines). Rezultat: listele utilizabile pe mobile.

**Sprint 3 (1 săptămână):** FAZA D1-D10 + FAZA E1-E6 — Calculator wizard + forms + bottom sheets + tooltips. Rezultat: input flows mobile-friendly.

**Sprint 4 (1 săptămână):** FAZA F1-F10 — pagini specifice (BookingDetail, Calculator, AdminSettings, Landing). Rezultat: feature pages mobile-ready.

**Sprint 5 (1 săptămână):** FAZA G + H — PWA + a11y mobile + service worker. Rezultat: instalabil + accesibil.

**Sprint 6 (1 săptămână):** FAZA I + cleanup — testing + bug fix + Lighthouse > 90. Rezultat: production-ready.

---

## 15. Resurse externe

- [Tailwind CSS v4 Container Queries Guide](https://www.sitepoint.com/tailwind-css-v4-container-queries-modern-layouts/)
- [Container Queries Ultimate Guide 2026](https://dev.to/nickbenksim/the-ultimate-guide-to-css-container-queries-in-2026-1ndi)
- [Mobile Navigation UX Patterns 2026](https://www.designstudiouiux.com/blog/mobile-navigation-ux/)
- [SaaS Design Trends 2026](https://www.designstudiouiux.com/blog/top-saas-design-trends/)
- [Smart SaaS Dashboard Design 2026](https://f1studioz.com/blog/smart-saas-dashboard-design/)
- [Fluid Typography with CSS Clamp](https://www.smashingmagazine.com/2022/01/modern-fluid-typography-css-clamp/)
- [Fluid Tailwind Plugin](https://fluid.tw/)
- [Responsive Web Design Guide 2026](https://ardenatech.com/blogs/the-complete-guide-to-responsive-web-design-in-2026)
- [WCAG 2.5.5 Target Size](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)
- [WCAG 2.2 Mobile Accessibility Testing](https://testparty.ai/blog/mobile-accessibility-testing)
- [Accessible Front-End Patterns For Responsive Tables — Smashing Mag](https://www.smashingmagazine.com/2022/12/accessible-front-end-patterns-responsive-tables-part1/)
- [Designing Mobile Tables — UXmatters](https://www.uxmatters.com/mt/archives/2020/07/designing-mobile-tables.php)
- [PWA Best Practices 2026](https://wirefuture.com/post/progressive-web-apps-pwa-best-practices-for-2026)
- [PWA Performance Guide 2026](https://www.digitalapplied.com/blog/progressive-web-apps-2026-pwa-performance-guide)
- [Service Workers PWA Guide 2026](https://jsmanifest.com/service-workers-pwa-guide)
- [Container Queries 2026: Powerful but not silver bullet](https://blog.logrocket.com/container-queries-2026/)

---

## 16. Notă de implementare

Acest plan **NU se execută** până la aprobarea explicită Oleg per fază. Fiecare task din listă include criterii de succes verificabile. Recomandare: implementează fazele în ordinea Sprint 1-6, cu review după fiecare sprint pentru ajustări.

**Pre-implementare obligatorie:**

1. Backup branch curent
2. Branch dedicat: `feat/mobile-responsive-2026`
3. Storybook pentru componentele noi (BottomSheet, ResponsiveTable)
4. CI Lighthouse mobile gating PR.
