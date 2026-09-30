/** The kinds of PGN that can still come in by hand, each through a screen of its own. */
export const MANUAL_IMPORTS = ["collections", "analyses", "repertoires"] as const;
export type ManualImport = (typeof MANUAL_IMPORTS)[number];
