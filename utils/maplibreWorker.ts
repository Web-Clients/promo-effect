/**
 * Tell MapLibre where its worker lives.
 *
 * MapLibre 6 derives the worker's URL from `import.meta.url` of its own module
 * and expects `maplibre-gl-worker.mjs` to sit next to it. That holds for the
 * published package; it does not hold for a bundle, where the library is rolled
 * into `assets/vendor-globe-<hash>.js` and the worker file is not emitted at
 * all. The request 404s, no vector tile is ever parsed, and the map comes up as
 * a black rectangle — with the attribution and controls drawn on top, so it
 * looks like a map that simply has nothing to show.
 *
 * That is exactly how it shipped: the globe was blank in production while
 * working in dev, where Vite serves the package's own files.
 *
 * Importing the worker with `?url` makes the bundler emit it as an asset and
 * hand back its real hashed URL, which is then the one MapLibre uses.
 */
import { setWorkerUrl } from 'maplibre-gl';
// `?worker&url` — not a plain `?url`. The published worker is an ES module that
// imports `./maplibre-gl-shared.mjs`; copied on its own it loads and then dies
// on that missing import, which looks exactly like no worker at all. `?worker`
// makes the bundler build the worker with its dependencies included.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

let configured = false;

export function configureMaplibreWorker(): void {
  if (configured) return;
  configured = true;
  setWorkerUrl(workerUrl);
}
