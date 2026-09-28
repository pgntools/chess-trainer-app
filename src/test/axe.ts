import axe from "axe-core";
import { expect } from "vitest";
import { act } from "@testing-library/react";

/*
  axe-core in the tests (CTA-111, ACCESSIBILITY.md): the WCAG 2.2 AA rules
  run over what a test rendered, and a violation fails it. The gallery's
  every-theme tests run it on every demo; a screen test can call it too.

  Only the WCAG A / AA rules run — the target is WCAG 2.2 AA, and axe's
  best-practice rules (a page's landmarks, its one `h1`) judge a whole page,
  which a component or a demo is not. `color-contrast` is off: jsdom lays
  nothing out and paints nothing, so axe cannot measure a colour here — the
  theme tokens' contrast test (`design-system/themes/contrast.test.ts`)
  covers it instead.
*/

const WCAG_AA_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"];

/**
 * **How long a test that runs axe over a whole gallery page may take.** axe
 * asks for every node's computed style, which jsdom works out against every
 * rule emotion has inserted — a page of twelve fifty-row tables takes
 * 15–20 s on its own. That is real work, not a hang, so such a test states
 * this timeout rather than inherit the suite's 20 s.
 */
export const AXE_PAGE_TIMEOUT_MS = 90_000;

/** Rules jsdom cannot judge: it computes no colour and no box. */
const NEEDS_A_BROWSER = ["color-contrast", "target-size"];

export type AxeCheckOptions = {
  /** Further rule ids to switch off, each for a reason the caller states beside the call. */
  disable?: readonly string[];
  /**
   * Rules outside WCAG's tags to run as well — a whole page's best-practice
   * rules (`PAGE_STRUCTURE_RULES`), for a test that renders the app shell
   * and passes `document.documentElement` as the context (CTA-112).
   */
  enable?: readonly string[];
};

/**
 * **A page's structure** (CTA-112), axe's best-practice rules for a whole
 * page: every piece of content in a landmark (`region`), no landmark twice
 * or twice unnamed, each at the top level, the skip link's target there. The
 * app shell's tests run them; a component or a demo is not a page. Two more —
 * `landmark-one-main` and `page-has-heading-one` — come back *incomplete*
 * under jsdom, never passing or failing, so the shell's tests assert one
 * `main` and one `h1` by role instead.
 */
export const PAGE_STRUCTURE_RULES = [
  "landmark-no-duplicate-main",
  "landmark-no-duplicate-banner",
  "landmark-no-duplicate-contentinfo",
  "landmark-unique",
  "landmark-complementary-is-top-level",
  "landmark-main-is-top-level",
  "landmark-banner-is-top-level",
  "landmark-contentinfo-is-top-level",
  "region",
  "skip-link",
] as const;

const describeViolations = (violations: axe.Result[]): string =>
  violations
    .map((violation) => {
      const nodes = violation.nodes.map((node) => `    ${node.target.join(" ")}\n      ${node.failureSummary?.replace(/\n/g, "\n      ")}`);
      return `${violation.id} (${violation.impact}): ${violation.help}\n  ${violation.helpUrl}\n${nodes.join("\n")}`;
    })
    .join("\n");

/** The WCAG A / AA violations axe finds in `context` (the whole document by default). */
const axeViolations = async (
  context: Element = document.body,
  { disable = [], enable = [] }: AxeCheckOptions = {},
): Promise<axe.Result[]> => {
  const off = Object.fromEntries([
    ...enable.map((id) => [id, { enabled: true }]),
    ...[...NEEDS_A_BROWSER, ...disable].map((id) => [id, { enabled: false }]),
  ]);
  const results = await axe.run(context, {
    runOnly: { type: "tag", values: WCAG_AA_TAGS },
    rules: off,
    resultTypes: ["violations"],
  });
  return results.violations;
};

/**
 * **Fails the test on any WCAG A / AA violation in `context`** — what every
 * gallery demo passes under every theme, scheme and direction, and what a
 * screen test can assert of its own render. The message lists each rule, its
 * help link and the offending nodes.
 *
 * It runs inside `act`, so what React does while axe works — a dialog's or a
 * menu's transition finishing — lands as a test's own updates would.
 */
export const expectNoAxeViolations = async (context: Element = document.body, options?: AxeCheckOptions): Promise<void> => {
  let violations: axe.Result[] = [];
  await act(async () => {
    violations = await axeViolations(context, options);
  });
  expect(describeViolations(violations), "axe found WCAG 2.2 A / AA violations").toBe("");
};
