# Promo-Effect — design from the 8 Sep 2026 meeting with Ion

Status: approved 8 Sep 2026. Supersedes nothing; extends the 3 Sep incoterm work
(`backend/src/modules/calculator/calculator-incoterms.ts`).

## How this document was derived

From a transcript of the meeting. Two things had to be filtered out first:

1. **Seven phone calls Ion took mid-meeting** (00:00, 01:13, 04:19, 07:00,
   15:13, 29:08, 49:18) plus a tax/bank digression at 13:20. None of it is a
   requirement — customs declarations, bank statements, a colleague named
   Cătălin.
2. **Speaker labels are unreliable.** At 01:03:00 "Ion" thanks "domnule Ion";
   at 50:50 "Ion" promises to build the widgets. Requirements were read from
   content, not from the label on the line.

## What already exists (do not rebuild)

Investigation before planning turned up four subsystems that are already built
and, in two cases, already running in production:

| Subsystem                     | State                          | Evidence                                                                                                          |
| ----------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| AISStream live vessels        | **Running now**                | 74.340 rows in `vessel_directory`, last position minutes old; 79 containers linked by MMSI; 1.206 tracking events |
| Terminal49 carrier milestones | Key set on prod                | `TERMINAL49_API_KEY` present in `/opt/promo-effect/backend/.env`                                                  |
| Chinese agent portal          | Built, mounted, **never used** | `/api/agent-portal`, login + price entry + admin approval; `agent_prices` = 0 rows                                |
| Audit trail                   | Model exists                   | `AuditLog` in schema                                                                                              |

Consequence: SeaRates is not needed. Terminal49 gives the real ETA from the
carrier once a BL exists; AIS gives the live position. Both are already paid for.

## Decisions taken

- **Map engine: MapLibre GL JS, 3D globe.** Zero cost at any volume, no token,
  no quota. Rejected: Cesium + Google Photorealistic 3D Tiles (what God's Eye
  View uses) because tile loads bill to Google Cloud and grow with visitors.
- **Notifications: email only.** Telegram exists but the client-facing
  "request a valid offer" flow goes out over the existing email queue.
- **No intermediate delivery.** Nothing reaches Ion until the whole package is
  done, test accounts included. Noted against this: the meeting promised him a
  client-side test by Saturday. Realistic estimate for the full package is
  12–15 working days.

## The defect that matters most

`findAgentPriceOffers` in `calculator-engine.ts` queries `agent_prices` on
port + container type + weight range only. It filters neither validity nor
approval state:

```ts
where: {
  (portOrigin, containerType, weightRange);
} // that is the whole filter
```

`readyDate` is computed on line 381 and never used. Two consequences: expired
agent rates are quotable, and **a PENDING or REJECTED Chinese agent price goes
straight into a client quote**, bypassing the approval workflow entirely.
Dormant today only because the table is empty — it arms itself the day Ion's
agents start entering rates, which is what this meeting asked for.

Ion also demonstrated an expired offer being returned (cargo ready 15.09, offer
valid to 14.09). `base_prices` _is_ filtered correctly by validity, so that
symptom is not explained by the code read so far. **Do not guess the cause.**
The first task is a test that reproduces the exact scenario against production
figures; fix what the test shows.

## Land transport has two parallel authorities

`transport_rates` (type × weight × destination) and `land_transport_rates`
(direction × city × weight band) both supply the inland leg. Neither has any
validity window — only `is_active`. This is the "$600 transport conflict" Ion
demonstrated at 39:35. One table must become the authority and gain validity
dates, or a stale rate can win at any time.

## Scope, in eight waves

1. **Defects** — validity + approval filtering; reproduce the expired-offer
   case; land-transport authority; PDF diacritics (PDFKit standard fonts are
   WinAnsi and have no ș/ț — embed DejaVu/Noto in all four PDF services);
   concrete pickup address for EXW; CFR/CIF route without the origin leg;
   uploaded bill of lading not appearing.
2. **Offer validity as a feature** — "valid until" on the card; distinguish
   _route not configured_ from _no valid offer for this date_, the latter
   getting a "request a valid offer" button that creates a `PriceRequest` and
   emails sales; validity defaults on price entry (today → end of month),
   past dates refused; admin screen for inactive/expired prices; ISO week
   numbers displayed and accepted as input.
3. **Offer breakdown and the client cabinet** — three rows (maritime / local
   charges + inland / commission), two under CFR-CIF with maritime shown
   inactive rather than hidden. The client booking view loses the price and the
   administrative block entirely and becomes read-only after placement, keeping
   route, map, status ribbon, documents and ETA. The Chinese agent sees only
   his own leg.
4. **Real ETA** — Terminal49 milestones by BL/container; transit days stop
   being typed by hand.
5. **Aggregator and agent portal** — best offer per shipping line per departure
   week (the rule that kills the "ten useless offers"), four cards per row;
   agent isolation; per-row calendar; agents supply their own supplier details.
6. **WeChat text parsing** — extends the existing `AIEmailParser`. **Blocked
   until Ion supplies 5–10 real message texts**; writing a parser against
   invented formats is guesswork.
7. **Onboarding** — "i" tooltips, guided page tour, changelog.
8. **Languages and documents** — PDFs in the user's language, automatic email
   delivery, full review of all three locales.

## The map, in detail

AIS already supplies per vessel: position, speed over ground, course, true
heading, navigational status, declared destination, draught, dimensions, ship
type, call sign, IMO. None of it is surfaced today.

Borrowed from God's Eye View (`bilawalsidhu/gods-eye-view`), four ideas:
click-to-track with a fading wake trail and a tactical card; **source freshness
always visible**; a roster of all tracked vessels at once; a telemetry HUD.

**Honest limit, designed for rather than hidden:** terrestrial AIS goes quiet
mid-ocean, and satellite AIS costs real money. A China→Constanța voyage will
have a multi-day gap. Dead reckoning (already implemented in `FleetMap.tsx`)
carries the animation across it, Terminal49 milestones fill it with real
events, and the map states plainly when a position is estimated rather than
observed.

## Accounts — who gets one, and what they can see

Ion returned to this four times (51:38, 52:13, 53:19, 54:11). It is the spine of
wave 5, not a detail of it.

**Chinese agents.** Four to start, room for forty. Each gets his own login _and
his own distinct profile link_. Addresses on the company domain — Ion's example
was `copen@…promo-efect.md` — with a work-issued password. Oleg creates the
profiles first so Ion can test them; Ion distributes them when he is satisfied.

What an agent sees: **one page, one form.** Ports, container type (20DV / 40HC /
40HQ), weight bands, departure date, rate, validity from–to with a calendar on
_each row_, and the shipping line. Plus his own identity: supplier name, contact
person, email, company name.

What an agent must never see: **another agent's rates.** Ion was explicit and
gave the reason — "ei la un moment dat se sună și se reglează", they phone each
other and fix the price. Competition between them is the point of the portal, so
isolation is a business requirement, not a privacy nicety.

An agent also receives the order in parallel with the client (24:18), but only
his own leg: Ningbo→Constanța. Constanța→Bălți is not his business and must not
render for him.

**Clients.** Start with a few named ones (Media Magnat, Profil) out of ~500
prospects. Ion gets credentials so he can log in _as a client_ and place an
order himself before anything reaches a real customer.

## Three processes missed on the first pass

- **The route renders backwards** (24:18). For an import it showed
  "Bălți – Constanța" where it must read "Constanța – Bălți". Ion corrected this
  twice in a row and it was not in the first extraction.
- **Price history, "like a stock exchange"** (36:31, 46:36). Ion opens past
  offers to see how a rate moved — rose, fell — and wants that visible rather
  than reconstructed by hand. A rate needs a retained history and a chart, not
  just a current value.
- **Future-dated offers are legitimate** (38:00). "Noi azi punem oferta care-i
  valabilă de pe 1 octombrie." Past validity is refused; _future_ validity is a
  supported case and must not be rejected by the same guard. When no end date is
  chosen the default is mid-month or the last day of the month (46:06).
