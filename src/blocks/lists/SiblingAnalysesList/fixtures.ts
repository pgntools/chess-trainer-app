import type { SiblingAnalysesLabels, SiblingAnalysisItem } from "./SiblingAnalysesList";

/*
  A tutorial folder's analyses, as the sibling panel lists them (CTA-145) — the
  record's own names, a Hebrew one (the panel mirrors and isolates each row),
  and the generic name an analysis with none is shown under. Imported only by
  the block's gallery and its test.
*/

const item = (id: string, name: string): SiblingAnalysisItem => ({ id, name, link: { href: `#${id}` } });

export const SIBLINGS: readonly SiblingAnalysisItem[] = [
  item("a1", "1. The opening principles"),
  item("a2", "2. Controlling the centre"),
  item("a3", "3. מלכודת הפרש"),
  item("a4", "4. Back-rank mates"),
  item("a5", "Analysis board"),
];

export const CURRENT = "a3";

export const LABELS: SiblingAnalysesLabels = {
  region: "Analyses in Chess basics",
  title: "Chess basics",
  position: "3 of 5",
  close: "Close the folder's analyses",
  locked: "Save or discard your changes to open another analysis.",
  moreBefore: "",
  moreAfter: "",
};

/** A long folder, cut around the current one. */
export const CUT_LABELS: SiblingAnalysesLabels = {
  ...LABELS,
  position: "240 of 600",
  moreBefore: "139 earlier analyses",
  moreAfter: "360 later analyses",
};
