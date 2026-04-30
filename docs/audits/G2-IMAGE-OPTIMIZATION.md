# G2 — Image Optimization

**Date:** 2026-04-30
**Status:** Documentation only (conversion out of scope for code changes)

---

## PNG files to convert to WebP

Located in `public/assets/generated/`:

| File                                                 | Approximate size | Priority |
| ---------------------------------------------------- | ---------------- | -------- |
| `hero_cargo_ship_night_1773224120207.png`            | hero image       | HIGH     |
| `smart_logistics_dashboard_mockup_1773224135612.png` | above-fold       | HIGH     |
| `modern_warehouse_tech_1773224152286.png`            | section image    | MEDIUM   |
| `trade_routes_neon_1773224386483.png`                | section image    | MEDIUM   |
| `logistics_aerial_hub_1773224370709.png`             | section image    | MEDIUM   |
| `consultation_futuristic_1773224405458.png`          | section image    | LOW      |

All are generated PNGs. Converting to WebP typically saves 25-35% in file size.

---

## Vite Plugin Recommendation

Install `vite-plugin-imagemin` (or the maintained fork `vite-plugin-image-optimizer`):

```bash
npm install --save-dev vite-plugin-image-optimizer
```

`vite.config.ts`:

```ts
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';

plugins: [
  react(),
  tailwindcss(),
  ViteImageOptimizer({
    png: { quality: 80 },
    jpg: { quality: 80 },
    webp: { lossless: false, quality: 80 },
  }),
];
```

The plugin converts PNG/JPG → WebP at build time and emits both formats.
Use `<picture>` tags in HTML to serve WebP with PNG fallback.

---

## Lazy Loading Strategy

For images below the fold, add `loading="lazy"` and `decoding="async"`:

```tsx
<img
  src="/assets/generated/logistics_aerial_hub.webp"
  loading="lazy"
  decoding="async"
  width={800}
  height={600}
  alt="Logistics hub aerial view"
/>
```

For above-the-fold hero images, do NOT use `loading="lazy"` — use `fetchpriority="high"` instead:

```tsx
<img
  src="/assets/generated/hero_cargo_ship_night.webp"
  fetchpriority="high"
  decoding="async"
  width={1920}
  height={1080}
  alt="Cargo ship at night"
/>
```

---

## CDN Config (Cloudflare)

If the site is proxied through Cloudflare (recommended):

1. Enable **Polish** (Pro plan) → automatic WebP conversion on the edge.
2. Enable **Mirage** → lazy load + resize for mobile.
3. Set Cache-Control header for images to at least 1 year:
   ```
   Cache-Control: public, max-age=31536000, immutable
   ```
4. Add a Page Rule or Transform Rule for `/assets/*` → `Cache Level: Cache Everything`, Edge TTL: 1 month.

Without Cloudflare Pro, use the Vite plugin above + serve from a CDN origin (e.g., Cloudflare R2 or Backblaze B2 with Workers).
