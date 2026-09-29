import type { ContrastCheck } from "../../../design-system/themes";

/*
  How the theme editor's fields read and write their tokens (CTA-115) —
  pure, beside `TokenField.tsx` so that file exports components only.
*/

/** A length as typed: blank is the token left out, a plain number a number, anything else the words (`clamp(…)`, `-0.02em`). */
export const lengthOf = (text: string): string | number | undefined => {
  const value = text.trim();
  if (value === "") return undefined;
  return /^-?\d+(\.\d+)?$/.test(value) ? Number(value) : value;
};

/** A choice's value as a select's option value — `null`, a number and a string all told apart. */
export const toChoice = (value: unknown): string => JSON.stringify(value ?? null);

/**
 * A select's option value back as the token: `null` leaves a typography
 * token out (MUI's own), but is itself the value of a component knob
 * (`linkUnderline: null`).
 */
export const fromChoice = (option: string, path: string): unknown => {
  const value: unknown = JSON.parse(option);
  return value === null && !path.startsWith("components.") ? undefined : value;
};

/** How a token's checks read under its field: the worst one, how many there are, and the tone of the outcome. */
export const contrastCaptionOf = (
  checks: readonly ContrastCheck[],
  formatRatio: (ratio: number) => string,
): { text: string; tone: "success" | "error" | "warning" } | undefined => {
  if (checks.length === 0) return undefined;
  const worst = checks.reduce((a, b) => (b.ratio / b.minimum < a.ratio / a.minimum ? b : a));
  const failed = checks.filter((check) => !check.pass);
  const outcome =
    failed.length === 0
      ? checks.length === 1
        ? "passes AA"
        : `all ${checks.length} checks pass AA`
      : `${failed.length} of ${checks.length} ${checks.length === 1 ? "check fails" : "checks fail"} AA${failed.every((check) => check.level === "advisory") ? " (advisory)" : ""}`;
  const tone = failed.length === 0 ? "success" : failed.some((check) => check.level === "required") ? "error" : "warning";
  return { text: `${formatRatio(worst.ratio)} at worst — ${worst.label}, needs ${worst.minimum}:1. ${outcome[0].toUpperCase()}${outcome.slice(1)}.`, tone };
};
