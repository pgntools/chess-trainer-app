import type { MDXComponents } from "mdx/types";

import { NavCards } from "./NavCards";
import { Anchor, H1, H2, H3, List, ListItem, OrderedList, Paragraph, Rule } from "./Prose";
import { SampleBoard, SampleBoards } from "./SampleBoards";
import { StoredGameEmbed } from "./StoredGameEmbed";

/**
 * **What the front page's MDX document is rendered with** (CTA-126): its
 * Markdown in the theme's typography (`Prose.tsx`), and the app's components
 * it may embed, by name, with no `import` in the document:
 *
 * | In the document | What it is |
 * | --- | --- |
 * | `<NavCards />` | every screen as a card, by section — the landing page before CTA-126 (`headingLevel={3}` under a heading of the document's) |
 * | `<SampleBoards />` | the three demo boards — a game, a repertoire, a collection — each under an `h3` |
 * | `<SampleBoard sample="game" />` | one of them (`game`, `repertoire`, `collection`), alone |
 * | `<StoredGameEmbed reference="…" />` | a stored game, by its `?game=` reference |
 *
 * A component the document names that is not here fails the page at render
 * (MDX's own check), so a new one is a line in this map — and a row in the
 * table above and in `content/README.md`.
 */
export const frontPageComponents: MDXComponents = {
  h1: H1,
  h2: H2,
  h3: H3,
  p: Paragraph,
  ul: List,
  ol: OrderedList,
  li: ListItem,
  a: Anchor,
  hr: Rule,
  NavCards,
  SampleBoards,
  SampleBoard,
  StoredGameEmbed,
};
