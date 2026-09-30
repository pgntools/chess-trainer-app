import { themes } from "../../src/design-system/themes/registry";

/*
  The matrix every route is visited under (CTA-116): theme × colour scheme ×
  language. The full one is every registered theme — a new theme joins it with
  no edit here — in light and dark, in English and Hebrew. A pull request runs
  the reduced one, which is what most regressions show up in: the default and
  the high-contrast theme, light, both languages.

  `A11Y_MATRIX=reduced|full` picks; `full` is the default, so `yarn test:a11y`
  means the whole pass.
*/

const SCHEMES = ["light", "dark"] as const;
type Scheme = (typeof SCHEMES)[number];

export const LANGUAGES = ["en", "he"] as const;
export type Language = (typeof LANGUAGES)[number];

export type Combo = { theme: string; scheme: Scheme; language: Language };

const product = (themeIds: readonly string[], schemes: readonly Scheme[], languages: readonly Language[]): Combo[] =>
  themeIds.flatMap((theme) => schemes.flatMap((scheme) => languages.map((language) => ({ theme, scheme, language }))));

export const MATRICES = {
  reduced: product(["default", "high-contrast"], ["light"], LANGUAGES),
  full: product(
    themes.map((theme) => theme.id),
    SCHEMES,
    LANGUAGES,
  ),
} as const;

export type MatrixName = keyof typeof MATRICES;

export const matrixName = (): MatrixName => {
  const asked = process.env.A11Y_MATRIX ?? "full";
  if (asked !== "reduced" && asked !== "full") throw new Error(`A11Y_MATRIX must be "reduced" or "full", not "${asked}"`);
  return asked;
};

/**
 * **What reflow is measured under** (CTA-118): the selected matrix's themes
 * and languages, in **one colour scheme**.
 *
 * A theme is data, and its typography, shape and component knobs are part of
 * it (CTA-115) — a theme can change how big a box is, so reflow cannot be
 * judged in the default one alone. A **colour scheme cannot**: a theme's
 * light and dark palettes differ in colour and in nothing else
 * (`themes/types.ts`), so a row that fits at 320 px in light fits in dark.
 * Measuring both would double the pass for no finding.
 */
export const reflowCombos = (): readonly Combo[] => {
  const seen = new Set<string>();
  return MATRICES[matrixName()]
    .filter(({ theme, language }) => {
      const key = `${theme}\u0000${language}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((combo) => ({ ...combo, scheme: "light" as const }));
};

export const comboName = ({ theme, scheme, language }: Combo): string => `${theme} · ${scheme} · ${language}`;
