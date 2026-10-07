import { Link as RouterLink } from "react-router";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import { CardGrid, IconCard } from "../../../design-system/components/cards";
import { asAppLanguage } from "../../../i18n";
import { navLabel, navTree, type NavTreeNode } from "../../main/navTree";

/**
 * **Every screen, as cards** — what the landing page at `/` was before it
 * became an MDX document (CTA-126), now one component the document embeds
 * (`<NavCards />`).
 *
 * It is built from `navTree()`, the same registry the sidebar renders, so a
 * screen or folder added to `navItems` / `navFolders` shows up here for free and
 * nothing lists the routes twice. Each section is a `CardGrid` of
 * `IconCard`s (the design system's, CTA-113), a card a real link, under a
 * heading of `headingLevel` — `2` by default, as the page had them; `3` under
 * a heading of the document's own.
 */

const screensOf = (node: NavTreeNode): NavTreeNode[] =>
  (node.children ?? []).flatMap((child) =>
    child.kind === "screen" ? [child] : screensOf(child),
  );

type NavCardsProps = {
  /** The sections' heading level. */
  headingLevel?: 2 | 3;
};

export function NavCards({ headingLevel = 2 }: NavCardsProps) {
  const { t, i18n } = useTranslation();
  const language = asAppLanguage(i18n.language);
  /*
    A card's name is a catalog key for an authored screen and the data's own
    `{ en, he }` for one named by data — the same two kinds the sidebar
    renders, resolved the same way. See `navTree.ts`.
  */
  const labelOf = (node: NavTreeNode) => navLabel(node, (key) => t(key), language);

  return (
    <Box data-testid="home-nav-cards">
      {navTree().map((node) => {
        /*
          A top-level node is a folder — or a single-entry folder folded to its
          screen (`navTree.ts`), which renders as one card, the same entry the
          sidebar shows. Its own label names both the section and the card:
          there is nothing inside the folder to list.
        */
        const entries = node.kind === "folder" ? screensOf(node) : [node];
        return (
          <Box key={node.id} component="section" sx={{ mb: 3 }}>
            <Typography
              variant="overline"
              component={`h${headingLevel}`}
              color="text.secondary"
              sx={{ display: "block", mb: 1 }}
            >
              {labelOf(node)}
            </Typography>

            <CardGrid size="medium" testId={`home-section-${node.id}`}>
              {entries.map((entry) => {
                const Icon = entry.icon;
                return (
                  <IconCard
                    key={entry.to}
                    icon={<Icon />}
                    label={labelOf(entry)}
                    link={{ component: RouterLink, to: entry.to as string }}
                    testId={`home-card-${entry.id}`}
                  />
                );
              })}
            </CardGrid>
          </Box>
        );
      })}
    </Box>
  );
}
