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

export const comboName = ({ theme, scheme, language }: Combo): string => `${theme} · ${scheme} · ${language}`;
