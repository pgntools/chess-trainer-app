import type { ProjectLinkRow } from "./ProjectLinks";

/*
  A Project's links (CTA-188): two it links to, one linking to it, a Hebrew
  name. Imported only by the block's gallery and its test.
*/

export const LINKS_TO: readonly ProjectLinkRow[] = [
  { linkId: "l1", name: "Najdorf — engine lines", link: { href: "#p-lines" } },
  { linkId: "l2", name: "פתיחות", link: { href: "#p-hebrew" } },
];

export const LINKED_FROM: readonly ProjectLinkRow[] = [{ linkId: "l3", name: "Sicilian studies", link: { href: "#p-sicilian" } }];
