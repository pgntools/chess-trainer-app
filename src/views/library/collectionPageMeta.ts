import type { UIMatch } from "react-router";

import i18n, { type AppLanguage } from "../../i18n";
import { findShippedCollection } from "../../lib/shippedCollections";
import type { PageMeta } from "../main/routeHandle";

/**
 * **A shipped collection's page** (CTA-136), for `/library/<collection>`'s
 * `handle.meta`: its name, first in the page title — "Fischer — Collection —
 * Chess Trainer App" — and a description with its count. Known from the
 * manifest, with nothing read, so the page the build renders ahead of time
 * carries them. A reader's own collection is named by its screen once read
 * (`usePageTitle`), as before: none of it is known here.
 */
export const collectionPageMeta = (match: UIMatch, language: AppLanguage): PageMeta => {
  const shipped = findShippedCollection(match.params.collectionId);
  if (shipped === undefined) return {};
  return {
    title: shipped.name,
    description: i18n.getFixedT(language)("pageDescriptions.collectionNamed", {
      name: shipped.name,
      games: shipped.count.toLocaleString(language),
    }),
  };
};
