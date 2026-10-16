import type { JobOutputView } from "./JobOutputsList";

/*
  A job's outputs (CTA-217) — the three kinds, applied and pending, a
  deleted entity and a Hebrew name. Imported only by the block's gallery and
  its test.
*/

export const CASE: JobOutputView = { key: "case-light", kind: "entity", label: "Carlsen – Nepomniachtchi (light)", link: { href: "#case-light" } };
export const DELETED_CASE: JobOutputView = { key: "case-full", kind: "entity", label: "Carlsen – Nepomniachtchi (full)", deleted: true };
export const PGN: JobOutputView = { key: "pgn", kind: "artifact", name: "Tata Steel 2026 + Wijk 2025.pgn", mimeType: "application/x-chess-pgn", size: 1_203_455 };
export const SUMMARY: JobOutputView = { key: "summary", kind: "data", label: "Summary" };

/** Applied: an entity, a deleted one, a file and a report. */
export const APPLIED: readonly JobOutputView[] = [CASE, DELETED_CASE, PGN, SUMMARY];

/** Decided, not yet applied — one of each kind. */
export const PENDING: readonly JobOutputView[] = [
  { key: "collection", kind: "entity", label: "Tata Steel 2026 + Wijk 2025", pending: true },
  { key: "pgn-pending", kind: "artifact", name: "merged.pgn", mimeType: "application/x-chess-pgn", pending: true },
  { key: "report-pending", kind: "data", label: "Report", pending: true },
];

/** Some applied, the rest still pending — a job collecting its outputs. */
export const MIXED: readonly JobOutputView[] = [CASE, PENDING[1], PENDING[2]];

export const HEBREW: readonly JobOutputView[] = [
  { key: "he-case", kind: "entity", label: "גלפנד – סמירין (קל)", link: { href: "#he-case" } },
  { key: "he-pgn", kind: "artifact", name: "רפרטואר מוערך.pgn", mimeType: "application/x-chess-pgn", size: 23_960 },
];
