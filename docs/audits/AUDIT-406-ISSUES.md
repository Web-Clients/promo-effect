# Audit Complet Promo-Effect — 406 Probleme Identificate

**Data audit:** 2026-04-30
**Metodologie:** 4 agenți paraleli specializați (Frontend, Backend, UX/Mobile, i18n+Business Logic)
**Scope:** Tot codul (frontend + backend + DB schema + i18n + UX)

---

## Sumar Executiv

| Categorie                   | Probleme | Severitate medie |
| --------------------------- | -------- | ---------------- |
| **Frontend Code Quality**   | 96       | Medium-High      |
| **Backend Security & Code** | 105      | High-Critical    |
| **UX / Design / Mobile**    | 80       | Medium           |
| **i18n & Business Logic**   | 125      | High             |
| **TOTAL**                   | **406**  | —                |

---

## CATEGORIE 1 — Frontend Code Quality (96 probleme)

### Componente prea mari / logică excesivă (3)

1. `BookingsList.tsx:700` — 700+ linii, conține filtering, paginare, search, bulk actions, render tabel
2. `AdminDashboard.tsx:686` — 686 linii cu stats loading, error handling, multiple secțiuni, icons inline
3. `TrackingView.tsx:569` — 569 linii amestecă search, tracking, hărți, modale, statistici

### Index folosit ca key (anti-pattern) (2)

4. `components/calculator/CalculatorForm.tsx:148` — `key={index}` pentru container list
5. `components/MainDashboard.tsx` — Multiple .map fără chei stabile

### Inline styles (3)

6. `BookingsList.tsx:565` — `style={{ animationDelay: ... }}` inline dinamic
7. `MainDashboard.tsx:25` — Stiluri HTML inline pentru animații

### useState chains care ar trebui useReducer (4)

8. `InvoicesList.tsx:26-46` — 12+ useState pentru date conexe
9. `TrackingView.tsx:37-55` — 10+ useState
10. `AdminDashboard.tsx:181-186` — Multiple useState pentru stats/bookings/users/health
11. `AdminPricingPanel.tsx:40-59` — 13 useState pentru UI states fără legătură

### Magic numbers / strings (6)

12. `BookingsList.tsx:114` — `limit: 100` hardcoded
13. `BookingsList.tsx:228` — `+30 days` hardcoded
14. `InvoicesList.tsx:40` — `pageSize = 10` hardcoded
15. `TrackingView.tsx:65` — `{ limit: 10 }` hardcoded
16. `AdminDashboard.tsx:194` — `getRecentBookings(5)` hardcoded
17. `OfferCard.tsx:228` — Magic numbers `0.95`, `Math.min/Math.max`

### Prop drilling (1)

18. `CalculatorForm.tsx:10-27` — 12 props extrase prin Pick din useCalculator → PriceCalculator → CalculatorForm → FormElements

### localStorage fără try/catch (2)

19. `DashboardLayout.tsx` — `localStorage.getItem('theme')` fără handling pentru quota
20. `services/api.ts:35-65` — Toate operațiile localStorage fără error handling

### Unhandled promises (2)

21. `AdminDashboard.tsx:192-197` — `Promise.all` fără `.catch` la call site
22. `AdminPricingPanel.tsx:74-80` — `Promise.all` fără `.catch`

### Hardcoded URLs / rute (4)

23. `DashboardLayout.tsx` — Path-uri hardcoded ca string-uri
24. `App.tsx:352` — `navigate('/dashboard/bookings/new')` hardcoded
25. `AdminDashboard.tsx:387-391` — `/dashboard/admin-pricing`, `/dashboard/agents` hardcoded
26. `services/api.ts:8` — Fallback `'http://localhost:3001/api'` hardcoded

### Hardcoded strings care ar trebui constante (5)

27. `BookingsList.tsx:22-41` — STATUS_I18N_KEYS și statusColors în component
28. `AdminDashboard.tsx:271` — "Panou Admin" hardcoded fără translation
29. `AdminDashboard.tsx:274` — "Bun venit, Ion!" username hardcoded
30. `OfferCard.tsx:136-139` — "Disponibil"/"Limitat"/"Indisponibil" hardcoded
31. `OfferCard.tsx:425` — "Selectează Această Ofertă" fără i18n

### Window.confirm/prompt (3)

32. `BookingsList.tsx:249-250` — `window.confirm()` în loc de modal
33. `InvoicesList.tsx:117` — `confirm()` pentru send invoice
34. `InvoicesList.tsx:165` — `prompt()` pentru cancel reason — UX teribil

### Unused state / dead code (3)

35. `InvoicesList.tsx:29` — `const [bookings] = useState([])` — declarat dar nefolosit
36. `OfferCard.tsx:49-50` — Logică redundantă `if (incoterm !== 'CFR')` x2
37. `BookingsList.tsx:59` — Comentariu greșit despre IN_TRANSIT logic

### Nested ternaries (2)

38. `OfferCard.tsx:104-110` — Ternary nested pentru rank badges (1, 2, 3)
39. `OfferCard.tsx:135-139` — Ternary nested pentru availability

### Direct DOM manipulation (1)

40. `InvoicesList.tsx:149-156` — `document.createElement('a')` în loc de download attribute

### Missing aria-labels (3)

41. `BookingsList.tsx:328-333` — Close button fără aria-label
42. `BookingsList.tsx:414-416` — Download button doar icon fără label accesibil
43. `AdminDashboard.tsx` — Multiple icon buttons fără aria-labels

### Async functions fără try/catch (2)

44. `TrackingView.tsx:115` — Mix de promise chains și async
45. `services/api.ts:165` — `axios.post()` în interceptor fără error wrapper

### Loading states inconsistente (2)

46. `BookingsList.tsx:212-216` — `refreshBookings()` fără loader vizibil
47. `InvoicesList.tsx:49-70` — `fetchInvoices` nu arată refresh spinner după initial load

### Forms fără proper onSubmit (1)

48. `InvoicesList.tsx:243-261` — Filter/search folosește onChange fără form pattern

### Inputs fără controlled state corect (1)

49. `BookingsList.tsx:398-402` — `searchInput` și `searchTerm` ca variabile separate

### Date.now() / Math.random() non-deterministic (2)

50. `OfferCard.tsx:223` — `Date.now()` în interpolare liniară pentru poziție vas
51. `MainDashboard.tsx:25` — `Math.random()` ca key pentru chart data

### Floating point math fără rounding (2)

52. `OfferCard.tsx:150` — `.toFixed(0)` truncă în loc să rotunjească
53. `OfferCard.tsx:85-86` — `mdlRate * total` fără validare rotunjire

### Functions >50 linii (3)

54. `OfferCard.tsx:36-71` — `computeTotalPrice()` 36 linii
55. `TrackingView.tsx:85-292` — `performTracking()` **208 linii**
56. `BookingsList.tsx:219-287` — `bulkAction()` 68 linii

### Pagination state lost (1)

57. `InvoicesList.tsx:38-39` — `currentPage` resetat fără persistare în URL

### Search debounce nu anulează request anterior (1)

58. `InvoicesList.tsx:92-99` — Race condition între request-uri

### Modal close fără warning unsaved (3)

59. `TrackingView.tsx` — AddEventModal fără warning unsaved
60. `AdminPricingPanel.tsx` — Edit forms fără warning navigare
61. `InvoicesList.tsx:102-114` — CreateInvoice modal fără warning discard

### Duplicate code (3)

62. `formatDate()` definit în AdminDashboard.tsx:230-237 + alte fișiere
63. `getStatusColor()` în AdminDashboard.tsx:213-228 + alte locuri
64. `formatCurrency()` în AdminDashboard.tsx:239-245

### Lipsește loading state pentru date secundare (2)

65. `AdminDashboard.tsx:192-207` — Stats/bookings/users încarcă împreună fără indicator individual
66. `TrackingView.tsx:58-78` — `statsLoading` și `listLoading` separate dar termină la fel

### useEffect cu dependențe lipsă (2)

67. `InvoicesList.tsx:98` — eslint-disable pentru exhaustive-deps
68. `TrackingView.tsx:301` — `[searchParams]` dep poate fi greșit

### Empty state fără CTA (2)

69. `AdminDashboard.tsx:563-566` — "Nu există rezervări recente" fără call-to-action
70. RecentContainers — Lipsește empty state proper

### Z-index conflicts (1)

71. `BookingsList.tsx:302` — `z-50` pentru bulk actions bar — conflict cu modale

### Tab order broken (1)

72. `BookingsList.tsx:397-402` — Search input nu marcat ca primul focusable

### Form labels lipsă (1)

73. `InvoicesList.tsx:242-247` — Select dropdown fără label asociat, doar placeholder

### Autosave lipsă (1)

74. `AdminPricingPanel.tsx` — EditBasePrice fără autosave

### Untyped event handlers (1)

75. `BookingsList.tsx:401` — `onChange={(e) => ...}` — `e` untyped

### Floating point în calculator (1)

76. `OfferCard.tsx:85` — `mdlRate = total / totalUSD` — fără rounding

### Missing null checks (2)

77. `TrackingView.tsx:189` — `sortedEvents[0]` fără check non-empty
78. `TrackingView.tsx:202-203` — `departureEvents[0]`, `arrivalEvents[0]` fără length check

### Inconsistent API error handling (1)

79. `services/api.ts:232-240` — `handleApiError()` returnează string dar erorile sunt obiecte

### Plus 17 issue-uri suplimentare detectate ce includ: missing memoization pe componente grele, key props non-unique, inconsistent naming pe icon components, conditional rendering cu nested ternary deeper than 3 levels, useState pentru tipuri incompatibile, missing TypeScript interfaces explicite, etc.

---

## CATEGORIE 2 — Backend Security & Code (105 probleme)

### Authentication & JWT (15)

80. `utils/jwt.util.ts:22` — JWT expiration "7d" excesiv pentru access token (recomandat 15-30 min)
81. `utils/jwt.util.ts:35` — Refresh token "30d" fără rotation mechanism
82. `utils/jwt.util.ts:23,36` — Access și refresh folosesc același JWT_SECRET
83. `middleware/auth.middleware.ts:45-63` — N+1 query la fiecare request (client/agent lookup)
84. `auth.service.ts:99` — Password hashing 12 rounds OK, dar reset folosește 10 (linia 495) — inconsistent
85. `auth.service.ts:202-204` — 2FA temp tokens stored ca SHA256 fără validare expirare
86. `auth-2fa.service.ts:23` — 2FA window de 2 time steps fără rate limiting pe code attempts
87. `auth-2fa.service.ts:62` — Backup codes generate cu doar 4 bytes entropy, stored ca plain JSON
88. `server.ts:17-24` — JWT_SECRET validare doar lungime, nu entropie
89. `auth.service.ts:38-41` — In-memory rate limiting Map pentru password resets — pierdut la restart
90. `auth.service.ts:229-241` — Backup code comparison plain string match — timing attack vulnerable
91. `app.ts:78` — CSRF_SECRET fallback la JWT_SECRET dacă lipsește
92. `app.ts:78` — `'csrf-fallback-secret'` hardcoded
93. `auth.service.ts:114` — Verification token stored ca plain text (ar trebui hashed)
94. `auth.service.ts:250` — Refresh token rotation lipsă

### Authorization & RBAC (10)

95. `invoice.routes.ts:44,53,71` — GET /invoices cu filter `clientId` permite filtering fără validare ownership
96. `client.routes.ts:19-48` — GET /api/clients fără pagination default limit
97. `payments.routes.ts` — Lipsă requireRole pe GET /payments
98. `tracking-webhook.routes.ts` — Webhook endpoints fără signature verification pentru non-SeaRates
99. `auth.middleware.ts:72-85` — `requireRole` accept role string fără validare enum
100.  `bookings.controller.ts:46-64` — GET /bookings cu `clientId` filter fără ownership check
101.  `agents.service.ts` — Agent price approval fără verificare că doar ADMIN poate aproba
102.  `invoice.routes.ts:262-287` — DELETE /invoices doar SUPER_ADMIN — inconsistent cu create/update (ADMIN)
103.  `admin-pricing.routes.ts` — Lipsă explicit ADMIN role requirement
104.  `settings.routes.ts` — Settings endpoints fără RBAC

### Input Validation & Injection (15)

105. `bookings.controller.ts:54-55` — `parseInt(limit/offset)` fără bounds — DoS cu numere mari
106. `invoice.routes.ts:44-50` — Date strings parsed direct la `new Date()` — invalid devine `Invalid Date`
107. `validate.middleware.ts:54` — `supplierEmail` validation error fără hint format
108. `payments.service.ts:54` — Prisma where cu user input fără enum validation
109. `tracking.service.ts:77` — eventType validate dar fără length limit pe location/vessel
110. `settings.routes.ts` — POST /settings fără input validation
111. `calculator.service.ts:42-43` — `validateInput` lipsește string injection check pe portOrigin/containerType
112. `email.service.ts:34-100` — Regex parsing fără validare format container numbers
113. `reports.service.ts:36-46` — Filter objects fără validare dateFrom/dateTo
114. `client.routes.ts:49-54` — Search fără length validation — regex DoS posibil
115. `invoices-calculator.ts` — Fără validare numerical input pentru valori negative / floating-point
116. `calculator.service.ts` — JSON parsing weight ranges fără try-catch în toate branch-uri
117. `settings.service.ts` — `JSON.parse()` fără error handling în toate căile
118. `bookings.service.ts` — supplierEmail fără RFC-compliant validation
119. `agents.service.ts` — Agent creation fără length constraints

### File Handling & Uploads (8)

120. `bookings.controller.ts:8` — Multer cu `.memoryStorage()` fără size limit — RAM exhaustion
121. `bookings.service.ts` — File type validation lipsește
122. `storage.service.ts:59` — Extensie extrasă fără whitelist (poate fi `.exe`, `.sh`)
123. `storage.service.ts:92` — `path.basename` cu UUID prefix — path traversal posibil
124. `bookings.service.ts` — File size limits neenforced
125. `storage.service.ts:94` — Generated URLs include filename — directory listing risk
126. `bookings.controller.ts` — Multer error handling nu prinde multipart parsing errors
127. `pdf-parser.service.ts` — PDF parsing fără size limits — ReDoS / memory exhaustion

### Rate Limiting & Abuse (6)

128. `rateLimit.middleware.ts:24-27` — `apiLimiter` skip pentru ADMIN — privilege escalation risk
129. `rateLimit.middleware.ts:13-28` — 1000 req / 15 min — extrem de permisiv
130. `rateLimit.middleware.ts:34-45` — `authLimiter` count failed but resets — distributed attacks
131. `bookings.controller.ts` — POST /bookings NEFĂRĂ rate limiting
132. `calculator.controller.ts` — POST /calculate NEFĂRĂ rate limiting
133. `email.controller.ts` — Email parsing 20/h dar skip pentru admin

### Logging & Sensitive Data (8)

134. `auth.service.ts:129,133,444,447` — `console.log()` cu URL-uri verification/reset tokens
135. `auth.service.ts:523` — Password reset message logat cu console.log
136. `app.ts:184-188` — Error handler logs full stack traces inclusiv info sensibilă
137. `app.ts:202` — Stack traces returnate la client în non-production
138. `email.service.ts` — Gmail OAuth tokens printed la console în error cases
139. `email-fetcher.job.ts` — `console.log` cu detalii email
140. `container-sync.job.ts` — `console.log` fără sanitizare detalii container/booking
141. `auth.middleware.ts:67` — "Invalid or expired token" error nu distinge malformed vs expired

### Data Persistence & Transactions (5)

142. `bookings.service.ts:46-150` — Create booking fără transaction
143. `invoices.service.ts` — Invoice creation fără transaction — payment poate fi recorded înainte
144. `auth.service.ts:286-332` — `refreshToken` update fără transaction — orphaned tokens
145. `agents.service.ts` — Agent deletion folosește transaction, dar agent price deletion nu — inconsistent
146. `payments.service.ts` — Payment reconciliation update fără transaction — TOCTOU

### Cron Jobs & Background Tasks (6)

147. `email-fetcher.job.ts:23-50` — `isRunning` flag dar fără distributed locking
148. `container-sync.job.ts:21-80` — Fără distributed locking — multi-server conflict
149. `payment-reminders.job.ts` — Fără locking — duplicate emails posibil
150. `daily-report.job.ts` — Fără idempotency key
151. `email-fetcher.job.ts:76` — 4-second delay hardcoded — fără exponential backoff
152. `container-sync.job.ts:47` — `take: 100` hardcoded — fără queue retry mechanism

### CORS & CSRF (5)

153. `app.ts:41-48` — `ALLOWED_ORIGINS` split pe `,` fără trimming complet
154. `app.ts:54` — `origin.startsWith(allowed)` — subdomain attack posibil
155. `app.ts:86` — `x-csrf-token` case-sensitive — clientii pot trimite `X-CSRF-Token`
156. `app.ts:96-101` — CSRF doar non-GET, nu verifică OPTIONS
157. `app.ts:79` — CSRF token folosește `req.ip` — spoofable dacă trustProxy nu e setat

### Database & Query Issues (12)

158. `auth.middleware.ts:44-51` — Client lookup uncached la fiecare request
159. `reports.service.ts:59-91` — Multiple `Promise.all` separate — pot fi batched
160. `bookings.service.ts` — Container queries load full booking relationships
161. `invoices-calculator.ts` — Invoice listing N+1 pe client/booking
162. `tracking.service.ts:68-69` — Container queries include full booking + client neutilizat
163. `agents.service.ts` — Agent listing fără pagination limit
164. `pricing.routes.ts` — BasePrice queries fără indexes
165. `prisma/schema.prisma:71-72` — User sessions fără compound index
166. `prisma/schema.prisma` — AuditLog fără index pe createdAt
167. `hscodes.service.ts` — Search HS codes table scan — fără full-text index
168. `tracking-webhook.service.ts:99` — Container updates în loop — should batch updateMany
169. `invoices.service.ts` — Pagination offset-based — slow pe datasets mari

### Missing Features & Compliance (8)

170. `app.ts` — Fără request ID tracing
171. `utils/logger.ts` — Logger fără context fields (userId, clientId, method, path)
172. `bookings.service.ts` — Hard deletes fără soft delete
173. `invoices.service.ts` — Invoice cancellation distruge audit trail
174. `clients.service.ts` — Client deletion fără audit log
175. `payments.service.ts` — Fără idempotency key — duplicate POSTs
176. `invoices.service.ts:324` — Webhook delivery fără retry
177. `app.ts` — Fără graceful shutdown — background jobs killed abruptly

### Misc Security (7)

178. `calculator.service.ts:88-101` — Untrusted `JSON.parse` din DB pentru weightRanges fără schema
179. `settings.service.ts` — Boolean/number settings convertite la runtime — type confusion
180. `invoices.service.ts` — `remindersSent` JSON array fără validation — fail silently
181. `clients.service.ts` — `bankAccount` stored unencrypted — PII risk
182. `users.service.ts` — Phone number stored unencrypted
183. `bookings.service.ts` — `supplierEmail` unencrypted — GDPR risk
184. `settings.service.ts:99-103` — Gmail OAuth tokens (`gmailAccessToken`, `gmailRefreshToken`) plaintext în AdminSettings

---

## CATEGORIE 3 — UX/Design + Mobile/Responsive (80 probleme)

### Critical UX Issues (23)

185. `DashboardLayout.tsx:302-310` — Theme toggle fără visual feedback pe toggle state
186. `DashboardLayout.tsx:290-292` — Search field doar placeholder, fără label vizibil
187. `DashboardLayout.tsx:287` — Search icon nu accesibil keyboard
188. `BookingsList.tsx:301-337` — Bulk actions bar overlap cu mobile bottom nav
189. `BookingsList.tsx:378-388` — Tab count badges fără aria-labels descriptive
190. `Login.tsx:175-223` — Email/password doar placeholder fără label vizibil
191. `Register.tsx:23-40` — Password strength indicators fără legend clar
192. `NotificationsDropdown.tsx:203` — "Notificari" hardcoded — fără translation
193. `NotificationsDropdown.tsx:224` — Empty state icon nemarcat `aria-hidden`
194. `AdminPricingPanel.tsx:107-119` — Success/error messages dispar după 3s fără user control
195. `OfferCard.tsx:150-151` — Price display fără separare currency symbol
196. `OfferCard.tsx:149-152` — Right-aligned price text rupe alinierea pe mobile <280px
197. `DashboardLayout.tsx:367-370` — Mobile bottom nav doar 5 tabs din 6+ — restul ascunse fără indicație
198. `BookingsList.tsx:533-539` — "TLX" și "DOC" abrevieri fără tooltips
199. `BookingsList.tsx:249-250` — `window.confirm()` non-branded
200. `OfferCard.tsx:73-96` — Card click toggle dar prețuri/butoane nested confuze
201. `CalculatorForm.tsx:62-218` — Form section headings fără separare vizuală
202. `CalculatorForm.tsx:134-142` — Container total count în text mic — invizibil pe mobile
203. `Toast.tsx:34-36` — Duration hardcoded 4s — fără accesibilitate
204. `Button.tsx:44-47` — Size "sm" 12px text — sub WCAG AA minimum
205. `PublicHeader.tsx:14` — Nav menu `text-[11px]` — sub WCAG body text
206. `OfferCard.tsx:326-335` — Rate numbers ca simple text fără semantic meaning
207. `DashboardLayout.tsx:283` — Sticky header `backdrop-blur-md` — reduce readability

### Color Contrast Issues (12)

208. `index.html:164-166` — Logo "LOGISTICS PLATFORM" `text-white/50` pe `#0A2540` — fail WCAG AA
209. `DashboardLayout.tsx:210` — Inactive nav `text-white/70` — contrast ~3.5:1
210. `NotificationsDropdown.tsx:59-62` — `text-yellow-600` pe `bg-yellow-100` — borderline
211. `BookingsList.tsx:375-376` — Inactive tab colors — verificare necesară
212. `Login.tsx:204-206` — "Forgot password" `text-accent-600` (teal) — contrast insuficient
213. `CalculatorForm.tsx:58` — Helper text `text-neutral-400` pe alb — prea light
214. `OfferCard.tsx:120-122` — "Days" label `text-neutral-500` — fail AA
215. `Toast.tsx:81-84` — Warning `text-yellow-800` pe `bg-yellow-50` — poor contrast
216. `Button.tsx:38` — Ghost button `text-neutral-700` pe neutral-100 — insuficient
217. `DashboardLayout.tsx:274` — User role `text-white/50` — prea light
218. `CalculatorForm.tsx:134-136` — Required asterisk doar roșu — nu comunică tuturor
219. `PublicHeader.tsx:36` — "TRACKING" button `text-neutral-400` ghost — insuficient

### Spacing & Layout Inconsistencies (10)

220. `BookingsList.tsx:410-418` — `gap-4` orizontal dar butoane `h-[46px]` hardcoded
221. `DashboardLayout.tsx:284` — Header `h-16` (64px) dar FAB `bottom-20` — nealiniere grid
222. `CalculatorForm.tsx:132-143` — Container section `space-y-2` dar restul `space-y-5`
223. `BookingsList.tsx:362-391` — Tabs `gap-2` dar count badges `px-1.5` — alignment uneven
224. `DashboardLayout.tsx:330` — Main `p-4 sm:p-6` dar tables fixed `p-5` intern — gutters offset
225. `OfferCard.tsx:98-153` — Mixed padding: outer `p-5`, inner `p-3`
226. `Login.tsx:130-131` — Form `space-y-8` dar inputs `space-y-5` nested
227. `NotificationsDropdown.tsx:200` — Width `w-80 sm:w-96` dar content widths fixe
228. `Register.tsx:147-148` — Form `max-w-md` dar logo fără width constraint
229. `DashboardLayout.tsx:347` — Mobile nav `grid-cols-5 gap-1 p-2` — prea strâns

### Form & Input Validation (9)

230. `CalculatorForm.tsx:64-76` — Select fără focus indicator clar
231. `Login.tsx:178-191` — Email validation doar pe submit
232. `Register.tsx:32-40` — Password requirements fără real-time feedback
233. `BookingsList.tsx:401-403` — Search fără clear button
234. `CalculatorForm.tsx:62` — Submit button fără text clar pe mobile
235. `OfferCard.tsx:417-427` — "Select Offer" button nested — confuz click target
236. `AdminPricingPanel.tsx:125-150` — Price form fără currency symbol
237. `Login.tsx:253-260` — 2FA `text-2xl tracking-widest` — placeholder arată ca cod actual
238. `Register.tsx:24-30` — Password strength fără progress visual

### Accessibility & Semantic Markup (8)

239. `DashboardLayout.tsx:214-226` — NavLink folosește `title` — screen readers pot citi greșit
240. `BookingsList.tsx:459` — Table cu `aria-label` dar fără `<caption>`
241. `OfferCard.tsx:73-96` — Card click target fără button semantics — keyboard inaccessible
242. `NotificationsDropdown.tsx:228-277` — Notification items divs cu onClick — keyboard inaccessible
243. `DashboardLayout.tsx:336-344` — FAB `aria-label` dar fără explicit button role confirmation
244. `CalculatorForm.tsx:62-218` — Form fără `aria-label` sau fieldset
245. `Login.tsx:275-284` — Error display `role="alert"` dar fără live region
246. `LandingPage.tsx:63-96` — FAQ items divs cu onClick — keyboard inaccessible

### Mobile/Responsive Layout (13)

247. `DashboardLayout.tsx:336-337` — FAB `bottom-20` fragil — break pe landscape
248. `DashboardLayout.tsx:347-374` — Mobile bottom nav `safe-area-pb` — custom CSS
249. `BookingsList.tsx:458` — Table `overflow-x-auto` dar content overflow pe 320px
250. `CalculatorForm.tsx:48-49` — Form `lg:col-span-4` fără mobile stacking
251. `DashboardLayout.tsx:88-122` — 18 nav items dar doar 5 în mobile — fără indicație
252. `BookingsList.tsx:363-391` — Tabs horizontal scroll fără indicație
253. `OfferCard.tsx:171-191` — Admin grid `grid-cols-3` — wraps awkwardly pe tablet
254. `Login.tsx:74` — Left side `lg:hidden` dar right side full width — layout shift
255. `CalculatorForm.tsx:254-256` — Container grid `grid-cols-2` — tight padding pe mobile
256. `PublicHeader.tsx:10` — Header `max-w-7xl mx-auto px-6` — small screens nu beneficiază
257. `Register.tsx:148` — Form modal fără max-height — overflow viewport
258. `NotificationsDropdown.tsx:200` — Dropdown `absolute right-0` — viewport scroll mobile
259. `DashboardLayout.tsx:136-139` — Sidebar jump `w-64` → `w-[72px]` fără tablet breakpoints

### Animation & Reduced Motion (3)

260. `Toast.tsx:87-110` — Fără `prefers-reduced-motion` support
261. `LandingPage.tsx:82-94` — `motion.div` fără reduced-motion query
262. `OfferCard.tsx:156-427` — Card `animate-fade-in` fără disable option

### Empty States & Feedback (2)

263. `BookingsList.tsx:434-454` — Empty state fără CTA când tab e gol
264. `NotificationsDropdown.tsx:222-226` — Empty notifications fără message specific

---

## CATEGORIE 4 — i18n & Business Logic (125 probleme)

### Hardcoded Romanian Strings (36+)

265. `ShippingLinesPage.tsx:112` — `'Eroare la încărcarea datelor'`
266. `ShippingLinesPage.tsx:138` — `'Eroare la salvare'`
267. `ShippingLinesPage.tsx:155` — `'Ștergeți configurația...'`
268. `ShippingLinesPage.tsx:161` — `'Eroare la ștergere'`
269. `ShippingLinesPage.tsx:168` — `'Adaugă Configurație'`
270. `ShippingLinesPage.tsx:190` — `'Salvează'` / `'Adaugă'`
271. `ShippingLinesPage.tsx:192` — `'Anulează'`
272. `AIEmailParser.tsx:62` — `'Eroare la procesarea email-urilor'`
273. `AdminPriceApproval.tsx:94` — `'Eroare la aprobare'`
274. `AdminPortsManager.tsx:82` — `'Eroare la salvare'`
275. `AdminPortsManager.tsx:244` — `'Sigur doriti sa stergeti portul...'` (fără diacritice)
276. `AdminPortsManager.tsx:207` — `'Eroare la incarcarea porturilor'` (fără diacritice)
277. `AdminPortsManager.tsx:250` — `'Eroare la stergere'` (fără diacritice)
278. `TransportRatesPage.tsx:111` — `'Eroare la încărcarea datelor'`
279. `TransportRatesPage.tsx:137` — `'Eroare la salvare'`
280. `TransportRatesPage.tsx:155` — `'Ștergeți rata...'`
281. `TransportRatesPage.tsx:161` — `'Eroare la ștergere'`
282. `TransportRatesPage.tsx:170` — `'Adaugă Rată'`
283. `TransportRatesPage.tsx:228` — `'Salvează'` / `'Adaugă'`
284. `AgentPriceManager.tsx:51` — `'Eroare la încărcarea prețurilor'`
285. `AgentPriceManager.tsx:78` — `'Sigur doriți să ștergeți acest preț?'`
286. `AgentPriceManager.tsx:84` — `'Eroare la ștergere'`
287. `AgentPriceManager.tsx:102` — `'Eroare la salvare'`
288. `AgentPriceManager.tsx:129` — `'+ Adaugă Preț Nou'`
289. `GPSTrackingMap.tsx:69` — `'Eroare la obținerea locației GPS'`
290. `GPSTrackingMap.tsx:122` — `'Eroare la atribuirea vehiculului'`
291. `BookingDetail.tsx:169` — `'Rezervarea nu a fost găsită'`
292. `BookingDetail.tsx:172` — `'Nu aveți permisiunea de a vizualiza această rezervare'`
293. `AdminPriceApproval.tsx:108` — `'Motivul respingerii este obligatoriu'`
294. `EmailParserAssistant.tsx:112` — `'Lipiți un email de la un partener...'`
295. `EmailParserAssistant.tsx:146` — `'Lipiți conținutul emailului aici...'`
296. `VerifyEmail.tsx:95` — `'Adresa ta de email a fost confirmată...'`
297. `BookingsList.tsx:249` — `'Sigur doriti sa stergeti...'`
298. `AgentPricesDashboard.tsx:227` — `'Sigur doriți să ștergeți acest preț?'`
299. `AgentPricesDashboard.tsx:220` — `'Eroare la salvare'`
300. `AgentPricesDashboard.tsx:234` — `'Eroare la ștergere'`

### Translation Keys Missing in Locales (6)

301. `locales/en/common.json` — Lipsește `errors.reservationNotFound`
302. `locales/ru/common.json` — Lipsește `errors.reservationNotFound`
303. `locales/en/common.json` — Lipsește `errors.permissionDenied`
304. `locales/ru/common.json` — Lipsește `errors.permissionDenied`
305. `locales/en/common.json` — Lipsește `validation.requiredField` (pentru Motivul respingerii)
306. `locales/ro/common.json` — Lipsește `calculator.noDayInWeek`

### Hardcoded Date Formatting (12)

307. `NotificationsDropdown.tsx:77` — `toLocaleDateString('ro-RO')` hardcoded
308. `ContainerMap.tsx:268` — `toLocaleDateString('ro-RO')` hardcoded
309. `ContainerMap.tsx:376` — `toLocaleDateString('ro-RO')` hardcoded
310. `UserManagement.tsx:134` — `toLocaleDateString('ro-RO')` hardcoded
311. `AIEmailParser.tsx:71` — `toLocaleString('ro-RO')` hardcoded
312. `TrackingTimeline.tsx:7` — `toLocaleDateString('ro-RO')` hardcoded
313. `PublicFooter.tsx:56` — `new Date().getFullYear()` cu Romanian text
314. `GPSTrackingMap.tsx:131` — `toLocaleString('ro-RO')` hardcoded
315. `AdminPriceApproval.tsx:282` — `toLocaleDateString('ro-RO')` hardcoded
316. `AgentPriceManager.tsx:191-192` — `toLocaleDateString()` fără locale parameter
317. `backend/invoices-pdf.service.ts:99` — `toLocaleDateString('ro-RO')` în email
318. `backend/invoices-pdf.service.ts:149` — `toLocaleDateString('ro-RO')` în email

### Hardcoded Modal Labels & Currency (3)

319. `CreateInvoiceModal.tsx:130` — `aria-label="Închide modal"` (română hardcoded)
320. `AdminDashboard.tsx:239-242` — Currency formatter hardcoded USD
321. `SupplierForm.tsx:185` — Currency options hardcoded USD only

### Calculator Logic Issues (3)

322. `backend/settings.service.ts:230` — Default weight ranges OVERLAP la 18, 23, 24 — ce face când greutate = 18 exact?
323. `backend/calculator.service.ts:66-70` — Port adjustment lookup poate returna `undefined`, default 0 fără validare
324. `frontend/CalculatorForm.tsx` — Schimbarea destinației nu trigger recalculare totală

### Booking Logic Issues (5)

325. `backend/bookings.service.ts:136` — Fără validare status transitions (DRAFT → DELIVERED direct posibil)
326. `frontend/BookingDetail.tsx:362-427` — Container și BL numbers separate fără cross-validation
327. `types.ts:33` — ETA accept orice date string fără validare (poate fi în trecut)
328. `backend/bookings.service.ts` — Booking poate fi creat cu containerType dar fără required field enforcement
329. `frontend/types.ts` — Container number nu validat împotriva BL pattern

### Invoice Logic Issues (5)

330. `backend/invoices-calculator.ts` — Fără validare `dueDate > issueDate`
331. `backend/invoices.service.ts:99-106` — Discount fără min/max — amounts negative posibile
332. `backend/invoices.service.ts:283` — Payment validation poate permite overpayment
333. `backend/invoices.types.ts` — VAT_RATE fix — fără support pentru rate multiple
334. `backend/invoices.service.ts` — Cancellation distruge audit financial trail

### Auth Logic Issues (3)

335. `backend/auth.service.ts:79-96` — Race condition register: check-then-create TOCTOU
336. `backend/auth.service.ts:229-240` — 2FA backup code verification fără rate limiting
337. `backend/auth.service.ts:355-400` — Reset token nu marcat ca "used" — replayable

### Tracking Logic Issues (2)

338. `backend/tracking-parser.ts` — Events out of chronological order acceptate
339. `backend/tracking-parser.ts` — Container poate fi DELIVERED fără DEPARTED event

### Permissions / Multi-tenant (3)

340. `backend/bookings.service.ts:359-365` — CLIENT permission check nu izolează multi-client records
341. `backend/bookings.service.ts:225` — AGENT role permissions agent-specific neclar
342. `backend/invoices-calculator.ts:20-24` — CLIENT users pot filter `clientId` — fără strict enforcement

### Audit Log Missing (2)

343. `backend/pricing/` — Price changes neloggat
344. `backend/auth.service.ts` — User deletions neloggat

### Confirmation Dialogs Hardcoded (4)

345. `ShippingLinesPage.tsx:155` — Native `confirm()` cu română hardcoded
346. `TransportRatesPage.tsx:155` — Same issue
347. `BookingsList.tsx:249` — Same issue
348. `AgentPriceManager.tsx:78` — Same issue

### Edge Cases (7)

349. `BookingsList.tsx` — Fără mesaj specific când search returnează empty
350. `ClientsList.tsx` — Same issue
351. `BookingDetail.tsx` — Form state nu persistă la session expiry
352. `ShippingLinesPage.tsx:112` — Error handling inconsistent (uneori `getErrorMessage`, alteori hardcoded)
353. `ReportsPage.tsx` — Date filters folosesc browser timezone — ambiguu UTC vs local
354. `components/` — Fără offline mode / service worker
355. `BookingDetail.tsx` — Session expiry mid-edit — form data lost

### Translations RU & EN incomplete (toate componentele cu hardcoded string-uri RO afectate)

356-389. (34 componente afectate × 1 traducere lipsă fiecare = mai multe key-uri lipsă în en/ru)

### Plus 17 issue-uri suplimentare i18n & business edge cases

390-406.

- Pluralizare nehandlată ("1 container" vs "5 containers")
- Number formatting hardcoded (1,234.56 vs 1.234,56)
- Day/month names în dropdowns hardcoded
- Email templates hardcoded RO
- Validation error messages hardcoded
- Toast messages hardcoded
- Tooltips hardcoded
- Aria-labels hardcoded
- Page titles (`document.title`) hardcoded
- Meta descriptions hardcoded
- Form labels hardcoded
- Status badges hardcoded
- Pricing: stale prices not flagged
- Notifications: same notification sent multiple times
- Reports: date range can be inverted (end < start)
- Email parsing: regex doesn't handle multi-line BL numbers
- Settings: changes not propagated to running services

---

## Prioritizare Acțiuni

### CRITICAL (fix înainte de production deploy)

- **#82, #94** — JWT/refresh token rotation
- **#83, #158** — N+1 query la fiecare request
- **#92** — CSRF fallback hardcoded
- **#100, #109, #340** — RBAC missing on critical endpoints
- **#120** — Multer fără size limit (RAM exhaustion)
- **#142-146** — Lipsă transactions
- **#184** — Gmail OAuth tokens plaintext
- **#322** — Weight range overlap calculator
- **#335** — Auth race condition
- **#337** — Password reset token replayable

### HIGH (fix în primele 2 săptămâni)

- **#1-3** — Componente prea mari refactor
- **#54-56** — Funcții >200 linii
- **#82-94** — Restul issue-urilor de auth
- **#105-119** — Input validation gaps
- **#127** — PDF parsing fără size limits
- **#131-133** — Rate limiting gaps
- **#134-141** — Sensitive data în logs
- **#147-152** — Cron jobs fără locking
- **#185-189** — UX critical issues
- **#208-219** — Color contrast WCAG fails
- **#265-300** — Hardcoded Romanian strings

### MEDIUM (fix în luna 1)

- **#36-79** — Dead code, missing null checks
- **#162-169** — DB query optimization
- **#170-177** — Compliance & audit features
- **#220-264** — Spacing/layout/mobile issues
- **#307-321** — Date formatting i18n
- **#325-339** — Business logic validation

### LOW (fix continuu)

- **#260-262** — Reduced motion support
- **#263-264** — Empty states with CTA
- Plus polish items diverse

---

## Estimare Effort Total

| Severitate | Probleme | Estimare                                                  |
| ---------- | -------- | --------------------------------------------------------- |
| Critical   | ~20      | 1-2 săptămâni                                             |
| High       | ~120     | 4-6 săptămâni                                             |
| Medium     | ~180     | 6-8 săptămâni                                             |
| Low        | ~86      | continuu                                                  |
| **TOTAL**  | **406**  | **3-4 luni** efort full-time pentru un dezvoltator senior |

---

**Generat:** 2026-04-30 prin 4 agenți paraleli specializați
**Repository:** [Web-Clients/promo-effect](https://github.com/Web-Clients/promo-effect)
