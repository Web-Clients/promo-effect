import '@testing-library/jest-dom/vitest';

/**
 * jsdom gaps that real browsers do not have.
 *
 * Neither of these is a shortcoming of the code under test: jsdom implements no
 * layout, so it has no scrollIntoView and no ResizeObserver. Stubbing them here
 * rather than guarding every call site keeps the components honest about what
 * they expect from a browser.
 */
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView() {
    /* no layout in jsdom */
  };
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}
