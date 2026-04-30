# G7 — Analytics: GA4 + Facebook Pixel

**Date:** 2026-04-30
**Status:** No analytics currently in index.html or index.tsx

---

## Current State

No GA4 or Facebook Pixel scripts present in the codebase.
No cookie consent banner implemented.

---

## GA4 Setup

### Step 1 — Create GA4 property

1. Go to analytics.google.com → Create Property → Web
2. Get Measurement ID: `G-XXXXXXXXXX` (replace with real ID)
3. Add to `.env.production`: `VITE_GA4_ID=G-XXXXXXXXXX`

### Step 2 — Add to index.html (after cookie consent)

Do NOT add inline — load conditionally after consent (see below).

```html
<!-- GA4 — loaded via consent manager -->
<!-- Do NOT add hardcoded IDs to source control -->
```

### Step 3 — React integration

```bash
npm install react-ga4
```

```ts
// utils/analytics.ts
import ReactGA from 'react-ga4';

export function initGA4() {
  const id = import.meta.env.VITE_GA4_ID;
  if (!id || !import.meta.env.PROD) return;
  ReactGA.initialize(id);
}

export function trackPageView(path: string) {
  ReactGA.send({ hitType: 'pageview', page: path });
}

export function trackEvent(category: string, action: string, label?: string) {
  ReactGA.event({ category, action, label });
}
```

### Step 4 — Track key events

| Event                 | Where to call                  | GA4 event name      |
| --------------------- | ------------------------------ | ------------------- |
| Page view             | React Router `<Routes>` effect | `page_view`         |
| Calculator submission | Calculator form `onSubmit`     | `calculator_submit` |
| Quote request         | "Request quote" button click   | `quote_request`     |
| User signup           | After successful registration  | `sign_up`           |
| User login            | After successful login         | `login`             |
| Booking created       | After booking confirmed        | `booking_created`   |

Example in a React component:

```ts
import { trackEvent } from '@/utils/analytics';

// In calculator submit handler:
trackEvent('Calculator', 'submit', containerType);
```

---

## Facebook Pixel

### Step 1 — Get Pixel ID from Meta Business Suite

Add to `.env.production`: `VITE_FB_PIXEL_ID=XXXXXXXXXXXXXXXX`

### Step 2 — Load after consent

```ts
// utils/analytics.ts
export function initFBPixel() {
  const id = import.meta.env.VITE_FB_PIXEL_ID;
  if (!id || !import.meta.env.PROD) return;

  // Standard FB Pixel init snippet
  (window as any).fbq = function () {
    ((window as any).fbq.q = (window as any).fbq.q || []).push(arguments);
  };
  const script = document.createElement('script');
  script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  script.async = true;
  document.head.appendChild(script);
  (window as any).fbq('init', id);
  (window as any).fbq('track', 'PageView');
}
```

### Key FB Pixel events

| Event                  | Trigger                               |
| ---------------------- | ------------------------------------- |
| `PageView`             | Every page                            |
| `Lead`                 | Calculator submission / quote request |
| `CompleteRegistration` | Signup success                        |
| `InitiateCheckout`     | Booking flow start                    |

---

## Cookie Consent Banner

GDPR / Romania law requires consent before loading analytics cookies.

### Recommended: `react-cookie-consent`

```bash
npm install react-cookie-consent
```

```tsx
// App.tsx
import CookieConsent, { getCookieConsentValue } from 'react-cookie-consent';

// In App component:
<CookieConsent
  onAccept={() => {
    initGA4();
    initFBPixel();
  }}
  buttonText="Accept"
  declineButtonText="Decline"
  enableDeclineButton
>
  Acest site folosește cookie-uri pentru analitics și marketing.{' '}
  <a href="/privacy">Politică confidențialitate</a>
</CookieConsent>;
```

Initialize analytics on app load ONLY if consent was previously given:

```ts
useEffect(() => {
  if (getCookieConsentValue() === 'true') {
    initGA4();
    initFBPixel();
  }
}, []);
```

---

## Security Notes

- **Never commit real Measurement IDs or Pixel IDs to source control** — use `VITE_*` env vars
- GA4 IDs (G-XXXXXXXXXX) are public but best practice is env vars
- FB Pixel IDs are public but should not be in git history
- Do not track PII (names, emails, phone numbers) in GA4 events
