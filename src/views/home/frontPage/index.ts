import type { MDXComponents } from "mdx/types";

import { BoardRow } from "./BoardRow";
import { CollectionCard } from "./CollectionCard";
import { CollectionGameBoard } from "./CollectionGameBoard";
import { NavCards } from "./NavCards";
import { Anchor, CodeBlock, H1, H2, H3, InlineCode, List, ListItem, OrderedList, Paragraph, Rule } from "./Prose";
import { RepertoireBoardEmbed } from "./RepertoireBoardEmbed";
import { StoredGameEmbed } from "./StoredGameEmbed";

/**
 * **What the front page's MDX document — and every Blog article — is
 * rendered with** (CTA-126): its
 * Markdown in the theme's typography (`Prose.tsx`), and the app's components
 * it may embed, by name, with no `import` (`content/README.md` has every
 * prop):
 *
 * | In the document | What it is |
 * | --- | --- |
 * | `<BoardRow>…</BoardRow>` | a row of the embeds below, side by side from `sm` up |
 * | `<CollectionGameBoard game="/library/<c>/<n>" startMove="17" />` | a Library game on a board |
 * | `<RepertoireBoard _id="/repertoires/<id>" startMove="1" fallback="e4-white" />` | a repertoire on a board, or a shipped sample where the reader has none |
 * | `<CollectionCard _id="/library/<c>" showGame="52" />` | a collection: a board on one game, a short table of its games |
 * | `<StoredGameEmbed reference="…" />` | any stored game by its `?game=` reference (`analysis/saved/<id>`, `play/games/<id>`, …) |
 * | `<NavCards />` | every screen as a card, by section — the landing page before CTA-126 |
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
  pre: CodeBlock,
  code: InlineCode,
  BoardRow,
  CollectionGameBoard,
  RepertoireBoard: RepertoireBoardEmbed,
  CollectionCard,
  StoredGameEmbed,
  NavCards,
};
