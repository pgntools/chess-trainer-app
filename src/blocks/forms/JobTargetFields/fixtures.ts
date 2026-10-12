import type { JobTargetProject } from "./jobTarget";

/*
  The Projects a Case's results may go to (CTA-188): one the source's Project
  links to already, two it does not, a Hebrew name. Imported only by the
  block's gallery and its test.
*/

export const SOURCE_PROJECT = "Najdorf studies";

export const PROJECTS: readonly JobTargetProject[] = [
  { id: "p-linked", name: "Najdorf — engine lines", linked: true },
  { id: "p-other", name: "Endgames", linked: false },
  { id: "p-hebrew", name: "פתיחות", linked: false },
];
