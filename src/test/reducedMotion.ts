import { vi } from "vitest";

/**
 * **Answers `prefers-reduced-motion: reduce` with yes** (CTA-111) until the
 * test's `vi.restoreAllMocks()` — every other media query still answers no,
 * as `setup.ts`'s stand-in does. How a test renders the app, a board or the
 * gallery for a reader whose system asks for less motion.
 */
export const stubReducedMotion = () =>
  vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
    matches: /prefers-reduced-motion:\s*reduce/.test(query),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
