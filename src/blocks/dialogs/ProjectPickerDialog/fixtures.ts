import type { ProjectPickerRow } from "../../../lib/analysisProjectPickerRows";

/*
  The Projects a Case can go to (CTA-186), as the picker's rows (CTA-226:
  each with its folder path and its count of Cases). Imported only by the
  block's gallery and its test.
*/

const AT = "2026-10-12T09:30:00.000Z";

const row = (id: string, name: string, folders: readonly string[] = [], cases = 0, updated = AT): ProjectPickerRow => ({
  id,
  project: { id, name, folderId: folders.length === 0 ? null : `f-${folders.join("-")}`, createdAt: AT, updatedAt: updated },
  name,
  folders,
  cases,
  updated,
});

export const PROJECTS: readonly ProjectPickerRow[] = [
  row("pnaj", "Najdorf ideas", ["Openings", "Sicilian"], 12, "2026-10-14T08:00:00.000Z"),
  row("pend", "Endgames", [], 3, "2026-10-10T08:00:00.000Z"),
  row("pcar", "Caro-Kann", ["Openings"], 40, "2026-10-12T08:00:00.000Z"),
];

export const HEBREW_PROJECTS: readonly ProjectPickerRow[] = [
  row("pheb", "הגנה סיציליאנית", ["פתיחות"], 5),
  row("pheb2", "סיומים", [], 2),
];

const FOLDERS: readonly (readonly string[])[] = [
  [],
  ["Openings"],
  ["Openings", "Sicilian"],
  ["Openings", "Sicilian", "Najdorf"],
  ["Openings", "French"],
  ["Endgames"],
  ["Endgames", "Rook endings"],
  ["Club", "2026", "Autumn"],
];

/** 1,200 Projects across nested folders — 24 pages at 50 a page: "Project 0001" … "Project 1200". */
export const MANY_PROJECTS: readonly ProjectPickerRow[] = Array.from({ length: 1_200 }, (_, index) =>
  row(
    `p${String(index + 1).padStart(4, "0")}`,
    `Project ${String(index + 1).padStart(4, "0")}`,
    FOLDERS[index % FOLDERS.length],
    (index * 37) % 1_100,
    new Date(Date.UTC(2026, 0, 1) + index * 3_600_000).toISOString(),
  ),
);
