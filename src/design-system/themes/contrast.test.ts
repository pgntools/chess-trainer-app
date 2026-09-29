import { describe, expect, it } from "vitest";

import { contrastRatio, contrastReport, contrastSummary, formatRatio, NON_TEXT_AA, TEXT_AA, type ContrastCheck } from "./contrast";
import { defaultTheme } from "./default";
import { themes } from "./registry";
import type { ThemeDefinition } from "./types";

/*
  The accessibility baseline's contrast (CTA-111, ACCESSIBILITY.md): every
  registered theme, in light and dark, measured over its tokens by
  `contrast.ts` (CTA-115 moved the measuring there, so the theme editor and
  `yarn theme:bootstrap` report exactly what this enforces). WCAG 2.2 AA:
  4.5:1 for text, 3:1 for a control's boundary and the focus ring (1.4.11). A
  theme that fails is fixed by the smallest token change, each listed in
  docs/design/README.md's themes section.
*/

const shown = (check: ContrastCheck) => `${check.scheme ?? "board"} · ${check.label}: ${formatRatio(check.ratio)} (needs ${check.minimum}:1)`;

describe.each(themes.map((definition) => [definition.id, definition] as const))("%s meets WCAG 2.2 AA", (_id, definition) => {
  const report = contrastReport(definition);

  it.each(["light", "dark"] as const)("%s: every required check — text at 4.5:1, the focus ring and a control's border at 3:1", (scheme) => {
    const failures = report.filter((check) => check.scheme === scheme && check.level === "required" && !check.pass);
    expect(failures.map(shown)).toEqual([]);
  });
});

describe("the contrast report", () => {
  const report = contrastReport(defaultTheme);
  const required = (scheme: "light" | "dark") => report.filter((check) => check.scheme === scheme && check.level === "required");

  it("measures, in each scheme, what CTA-111 and CTA-113 hold every theme to", () => {
    for (const scheme of ["light", "dark"] as const) {
      const checks = required(scheme);
      const count = (token: string) => checks.filter((check) => check.token === `${scheme}.${token}`).length;
      // text.secondary on a raised row, and both text colours on the three surfaces.
      expect(count("text.secondary")).toBe(4);
      expect(count("text.primary")).toBe(3);
      // primary: its contrastText on it, and it as text on the three surfaces.
      expect(count("primary.main")).toBe(4);
      expect(count("secondary.main")).toBe(1);
      expect(count("focusRing")).toBe(3);
      expect(count("controlBorder")).toBe(3);
      expect(checks).toHaveLength(34);
    }
  });

  it("holds text to 4.5:1 and a control or the focus ring to 3:1", () => {
    for (const check of report) expect(check.minimum).toBe(check.kind === "text" ? TEXT_AA : NON_TEXT_AA);
    expect(report.find((check) => check.id === "light.focusRing|paper")?.kind).toBe("ui");
  });

  it("gives every check a unique id, and names the token that decides it", () => {
    expect(new Set(report.map((check) => check.id)).size).toBe(report.length);
    expect(report.find((check) => check.id === "light.primary.main|contrastText")).toMatchObject({
      token: "light.primary.main",
      background: "#2563eb",
      level: "required",
    });
  });

  it("reports the board's colours as advisory", () => {
    const advisory = report.filter((check) => check.level === "advisory");
    expect(advisory.map((check) => check.token)).toContain("chess.nag.good.light");
    expect(advisory.every((check) => check.token.startsWith("chess."))).toBe(true);
  });

  it("measures a translucent colour as it shows over its background", () => {
    expect(contrastRatio("rgba(0, 0, 0, 0.5)", "#ffffff")).toBeCloseTo(contrastRatio("rgb(128, 128, 128)", "#ffffff"), 1);
    expect(formatRatio(4.4999)).toBe("4.49:1");
  });

  it("sums a report, telling a required failure from an advisory one", () => {
    const broken: ThemeDefinition = { ...defaultTheme, light: { ...defaultTheme.light, text: { primary: "#cccccc", secondary: "#646e83" } } };
    const summary = contrastSummary(contrastReport(broken));
    expect(summary.requiredFail).toBeGreaterThanOrEqual(3);
    expect(summary.fail).toBeGreaterThan(summary.requiredFail);
    expect(summary.pass + summary.fail).toBe(report.length);
  });
});

/**
 * **The board's coordinates on their squares.** The high-contrast theme
 * writes them at AA; the others keep the traditional board look — the
 * coordinates in the other square's colour — and are a known gap
 * (ACCESSIBILITY.md), measured here so the document stays true: a change to
 * one of these boards' squares shows up as a changed ratio. A theme added
 * later is not held to a number here — the editor and the report show it.
 */
const COORDINATE_GAPS: Record<string, { light: number; dark: number }> = {
  default: { light: 2.3, dark: 2.3 },
  brown: { light: 2.3, dark: 2.3 },
  green: { light: 2.84, dark: 2.84 },
};

const coordinates = ({ chess: { board } }: ThemeDefinition) => ({
  light: contrastRatio(board.lightSquareNotation, board.lightSquare),
  dark: contrastRatio(board.darkSquareNotation, board.darkSquare),
});

describe("the board's coordinates on their squares", () => {
  it("are at AA in the high-contrast theme", () => {
    const measured = coordinates(themes.find((theme) => theme.id === "high-contrast")!);
    expect(measured.light).toBeGreaterThanOrEqual(TEXT_AA);
    expect(measured.dark).toBeGreaterThanOrEqual(TEXT_AA);
  });

  it.each(Object.entries(COORDINATE_GAPS))("are the known gap ACCESSIBILITY.md records in the %s theme", (id, gap) => {
    const theme = themes.find((candidate) => candidate.id === id);
    expect(theme, `${id} is registered`).toBeDefined();
    const measured = coordinates(theme!);
    expect(measured.light, `${id} light`).toBeCloseTo(gap.light, 2);
    expect(measured.dark, `${id} dark`).toBeCloseTo(gap.dark, 2);
  });
});
