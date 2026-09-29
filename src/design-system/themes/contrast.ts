import { decomposeColor, getContrastRatio, recomposeColor, type Theme } from "@mui/material/styles";

import { buildTheme } from "../theme/buildTheme";
import type { ThemeDefinition } from "./types";

/*
  The accessibility baseline's contrast (CTA-111, ACCESSIBILITY.md), as a
  pure module (CTA-115) that `contrast.test.ts`, the theme editor and
  `yarn theme:bootstrap` all measure with: every token a theme's text or
  controls are drawn in, against what it sits on. jsdom paints nothing, so
  axe cannot measure a colour in the gallery's tests and this does instead.

  WCAG 2.2 AA: 4.5:1 for text, 3:1 for a control's boundary and the focus
  ring (1.4.11). The **required** checks are the ones the test holds every
  registered theme to; the **advisory** ones (the board's coordinates, the
  move marks, the result bars) are measured and reported but not enforced —
  the coordinates are a known gap in every theme but high contrast.
*/

/** WCAG AA for text. */
export const TEXT_AA = 4.5;
/** WCAG AA for a control's boundary and the focus ring. */
export const NON_TEXT_AA = 3;

/** One measurement: a token over what it sits on. */
export type ContrastCheck = {
  /** Unique within a report: the token and the background's name. */
  id: string;
  /** The token that decides it, as a path into the `ThemeDefinition` (`light.text.secondary`, `chess.nag.good.dark`). */
  token: string;
  /** The colour scheme it was measured in — `null` for the board, which is the same in both. */
  scheme: "light" | "dark" | null;
  /** What was measured, in words ("text.secondary on background.paper"). */
  label: string;
  /** The two colours as measured — the foreground as the theme resolves it (a button's `contrastText`). */
  foreground: string;
  background: string;
  ratio: number;
  /** Text (4.5:1) or a control / the focus ring (3:1). */
  kind: "text" | "ui";
  minimum: number;
  /** Enforced by `contrast.test.ts`, or only reported. */
  level: "required" | "advisory";
  pass: boolean;
};

/** `color` as it shows over `background` — MUI's own contrast text is a translucent black. */
const over = (color: string, background: string): string => {
  const fg = decomposeColor(color);
  const alpha = fg.type === "rgba" ? (fg.values[3] ?? 1) : 1;
  if (alpha >= 1) return color;
  const bg = decomposeColor(background);
  const mixed = [0, 1, 2].map((i) => Math.round(fg.values[i] * alpha + bg.values[i] * (1 - alpha)));
  return recomposeColor({ type: "rgb", values: mixed as [number, number, number] });
};

/** The contrast ratio of `color` shown over `background`. */
export const contrastRatio = (color: string, background: string): number => getContrastRatio(over(color, background), background);

/** The surfaces text and controls sit on: the page, a card or panel, the sunken rail. */
const SURFACES = ["default", "paper", "sunken"] as const;
/** The palette colours a contained button or a chip fills with, its `contrastText` on it. */
const PALETTE_COLOURS = ["primary", "secondary", "error", "warning", "info", "success"] as const;
/** The palette colours written as text (a status line, a link, a text button). */
const TONES = ["primary", "error", "warning", "info", "success"] as const;
const NAG_TONES = ["good", "brilliant", "interesting", "dubious", "mistake", "blunder"] as const;
const RESULTS = ["white", "draw", "black"] as const;

type Measure = Omit<ContrastCheck, "id" | "ratio" | "minimum" | "pass"> & { backgroundName: string };

const checkOf = ({ backgroundName, ...measure }: Measure): ContrastCheck => {
  const minimum = measure.kind === "text" ? TEXT_AA : NON_TEXT_AA;
  const ratio = contrastRatio(measure.foreground, measure.background);
  return { id: `${measure.token}|${backgroundName}`, ...measure, ratio, minimum, pass: ratio >= minimum };
};

/** One scheme's required checks, measured over the theme `buildTheme` makes of it. */
const schemeChecks = (scheme: "light" | "dark", theme: Theme): Measure[] => {
  const { palette } = theme;
  const measures: Measure[] = [];
  const add = (token: string, label: string, foreground: string, background: string, backgroundName: string, kind: "text" | "ui") =>
    measures.push({ token: `${scheme}.${token}`, scheme, label, foreground, background, backgroundName, kind, level: "required" });

  // CTA-113: the engine lines, the move list's rows — the paper under action.hover.
  const row = over(palette.action.hover, palette.background.paper);
  add("text.secondary", "text.secondary on a raised row (the paper under action.hover)", palette.text.secondary, row, "row", "text");
  for (const surface of SURFACES) {
    const background = palette.background[surface];
    add("text.primary", `text.primary on background.${surface}`, palette.text.primary, background, surface, "text");
    add("text.secondary", `text.secondary on background.${surface}`, palette.text.secondary, background, surface, "text");
  }
  for (const colour of PALETTE_COLOURS) {
    const { main, contrastText } = palette[colour];
    add(`${colour}.main`, `${colour}: its contrastText on its main (a contained button, a chip)`, contrastText, main, "contrastText", "text");
  }
  for (const tone of TONES) {
    for (const surface of SURFACES) {
      add(`${tone}.main`, `${tone} as text on background.${surface}`, palette[tone].main, palette.background[surface], surface, "text");
    }
  }
  for (const surface of SURFACES) {
    const background = palette.background[surface];
    add("focusRing", `the focus ring on background.${surface}`, palette.focusRing, background, surface, "ui");
    add("controlBorder", `a control's border on background.${surface}`, palette.controlBorder, background, surface, "ui");
  }
  return measures;
};

/** The board's advisory checks: its coordinates, the move marks on each scheme's paper, the result bars. */
const chessChecks = ({ chess }: ThemeDefinition, papers: Record<"light" | "dark", string>): Measure[] => {
  const measures: Measure[] = [];
  const add = (measure: Omit<Measure, "level" | "kind">) => measures.push({ ...measure, kind: "text", level: "advisory" });
  const { board } = chess;
  add({
    token: "chess.board.lightSquareNotation",
    scheme: null,
    label: "the coordinates on a light square",
    foreground: board.lightSquareNotation,
    background: board.lightSquare,
    backgroundName: "lightSquare",
  });
  add({
    token: "chess.board.darkSquareNotation",
    scheme: null,
    label: "the coordinates on a dark square",
    foreground: board.darkSquareNotation,
    background: board.darkSquare,
    backgroundName: "darkSquare",
  });
  for (const tone of NAG_TONES) {
    for (const scheme of ["light", "dark"] as const) {
      add({
        token: `chess.nag.${tone}.${scheme}`,
        scheme,
        label: `the ${tone} move mark on the ${scheme} paper`,
        foreground: chess.nag[tone][scheme],
        background: papers[scheme],
        backgroundName: "paper",
      });
    }
  }
  for (const result of RESULTS) {
    const bar = chess.filterBoard[result];
    add({
      token: `chess.filterBoard.${result}.text`,
      scheme: null,
      label: `the ${result} result bar's percentage on its fill`,
      foreground: bar.text,
      background: bar.background,
      backgroundName: "bar",
    });
  }
  return measures;
};

/**
 * **Every contrast check of a theme** — its required checks in light, then in
 * dark, then the board's advisory ones. Pure: `buildTheme` resolves what MUI
 * derives (a button's text colour, `action.hover`), nothing is painted.
 */
export const contrastReport = (definition: ThemeDefinition): ContrastCheck[] => {
  const light = buildTheme(definition, "light", "ltr");
  const dark = buildTheme(definition, "dark", "ltr");
  const papers = { light: light.palette.background.paper, dark: dark.palette.background.paper };
  return [...schemeChecks("light", light), ...schemeChecks("dark", dark), ...chessChecks(definition, papers)].map(checkOf);
};

/** How a report came out: its passes and failures, and the failures among the required checks. */
export const contrastSummary = (checks: readonly ContrastCheck[]) => {
  const failed = checks.filter((check) => !check.pass);
  return {
    pass: checks.length - failed.length,
    fail: failed.length,
    requiredFail: failed.filter((check) => check.level === "required").length,
  };
};

/** A ratio as WCAG writes it: `4.52:1`. */
export const formatRatio = (ratio: number): string => `${(Math.floor(ratio * 100) / 100).toFixed(2)}:1`;
