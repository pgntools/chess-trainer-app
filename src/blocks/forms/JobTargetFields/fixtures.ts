import type { JobTargetProject } from "./jobTarget";

/*
  The other Projects a Case's results may go to (CTA-188), a Hebrew name
  among them. Imported only by the block's gallery and its test.
*/

export const SOURCE_PROJECT = "Najdorf studies";

export const PROJECTS: readonly JobTargetProject[] = [
  { id: "p-other", name: "Endgames" },
  { id: "p-lines", name: "Najdorf — engine lines" },
  { id: "p-hebrew", name: "פתיחות" },
];
