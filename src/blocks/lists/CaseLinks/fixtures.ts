import type { CaseLinkRow } from "./CaseLinks";

/*
  A Case's links (CTA-188): two it links to (one in another Project, one
  Hebrew), one linking to it. Imported only by the block's gallery and its
  test.
*/

export const LINKS_TO: readonly CaseLinkRow[] = [
  { linkId: "l1", name: "Carlsen – Caruana - computer analysis (light)", projectName: "Najdorf studies", link: { href: "#c-light" } },
  { linkId: "l2", name: "עמדת לוסנה", projectName: "Endgames", link: { href: "#c-hebrew" } },
];

export const LINKED_FROM: readonly CaseLinkRow[] = [
  { linkId: "l3", name: "Sicilian, move 12", projectName: "Sicilian studies", link: { href: "#c-sicilian" } },
];
