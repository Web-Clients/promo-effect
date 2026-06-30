// Type shim for jest-axe (no official types). Pure ambient module
// declaration — no top-level import, so it does not accidentally turn
// into a module-augmentation that would clobber other modules' types.
declare module 'jest-axe' {
  export type AxeViolation = { impact?: string; id?: string; [key: string]: unknown };
  export type AxeResults = {
    violations: AxeViolation[];
    passes: unknown[];
    [key: string]: unknown;
  };
  export function axe(html: Element | string, options?: unknown): Promise<AxeResults>;
  export function configureAxe(options?: unknown): typeof axe;
  export const toHaveNoViolations: {
    toHaveNoViolations(results: AxeResults): { pass: boolean; message: () => string };
  };
}
