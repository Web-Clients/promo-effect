# G3 — Font Optimization & Self-Hosting

**Date:** 2026-04-30
**Status:** Preconnect already present in index.html; display=swap active via URL param

---

## Current State

`index.html` already contains:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@600;700&display=swap"
  rel="stylesheet"
/>
```

`display=swap` is already enabled via the `&display=swap` URL parameter — no changes needed.

---

## Self-Hosting Fonts (Recommended for Production)

Self-hosting eliminates the Google Fonts third-party request, improves privacy (GDPR) and reduces latency.

### Step 1 — Download fonts

Use the `google-webfonts-helper` tool (https://gwfh.madebymantas.de/fonts) or `fontsource`:

```bash
npm install --save @fontsource-variable/inter @fontsource/poppins
```

### Step 2 — Import in CSS / index.tsx

```ts
// In index.tsx (or index.css)
import '@fontsource-variable/inter'; // variable font, all weights
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
```

### Step 3 — Remove Google Fonts from index.html

Delete the three `<link>` tags for fonts.googleapis.com and fonts.gstatic.com.

### Step 4 — Ensure font-display: swap in CSS

If using fontsource packages (fontsource v5+), `font-display: swap` is set by default in the package CSS.

If using raw @font-face declarations, add explicitly:

```css
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400 700;
  font-display: swap;
  src: url('/fonts/inter-variable.woff2') format('woff2');
}
```

### Step 5 — Preload critical fonts

Add to `index.html` for the primary UI font (Inter 400):

```html
<link
  rel="preload"
  href="/fonts/inter-latin-400-normal.woff2"
  as="font"
  type="font/woff2"
  crossorigin
/>
```

---

## Performance Impact

| Metric               | Google Fonts                                   | Self-hosted                |
| -------------------- | ---------------------------------------------- | -------------------------- |
| Extra DNS lookup     | Yes (2 domains)                                | No                         |
| Extra TCP connection | Yes                                            | No                         |
| Privacy / GDPR       | User IP sent to Google                         | Fully self-controlled      |
| Cache sharing        | Shared across sites (deprecated in Chrome 86+) | Site-local only            |
| Font subsetting      | Automatic                                      | Manual (fonttools/subfont) |

With `@fontsource` packages, fonts are bundled into the Vite build and served from the same origin — optimal for both performance and compliance.
