import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { visuallyHidden } from "../../../design-system/components/a11y";
import { KeyValueList, type KeyValueRow } from "../../../design-system/components/lists";
import { KNOWN_SOURCE_TAGS, sourceLinkHref, type CollectionSourceEntry, type CollectionSources } from "../../../lib/libraryCollections";

export type CollectionSourceProps = {
  /** Where the games come from (`collectionSourcesOf` over the rows) — the screen draws no card without one. */
  sources: CollectionSources;
  /** The card's heading level — `h2` under a page's `h1`, `h3` in the collection page's panel. */
  headingLevel?: "h2" | "h3";
  /**
   * The root; each source's tags are `<testId>-source-<i>` (each value
   * `-source-<i>-<tag>`, the tag as the PGN names it — a `SourceLink`'s link
 * `-source-<i>-SourceLink-link`), its count
   * `-source-<i>-games`, the games with none `-untagged`.
   */
  testId: string;
};

const isKnownTag = (name: string): name is (typeof KNOWN_SOURCE_TAGS)[number] => (KNOWN_SOURCE_TAGS as readonly string[]).includes(name);

/**
 * **Where a collection's games come from** (CTA-233) — the collection page's
 * General, under a tournament's event card or a collection's facts: the
 * games' `Source…` tags (`[SourceTitle "The Week in Chess 1662"]`,
 * `[Source "Mark Crowther"]`, `[SourceDate "2026.09.14"]`) as a description
 * list, the tags PGN names labelled and in their order, any other by its
 * name. Several sources (a merge of two issues) are a list, each with the
 * games it gives; one is its tags alone — counted only when some games name
 * none, which are counted too. A date is shown as the PGN writes it, pinned
 * LTR; a `SourceLink` that is a web address is a link, opened in a new tab. Presentational: the sources arrive worked out
 * (`lib/libraryCollections.ts`'s `collectionSourcesOf`); its words are
 * `library.collectionSource.*`.
 */
function CollectionSource({ sources, headingLevel = "h2", testId }: CollectionSourceProps) {
  const { t, i18n } = useTranslation();
  const count = (value: number) => value.toLocaleString(i18n.language);
  const { entries, untagged } = sources;
  const several = entries.length > 1;
  // One source over every game needs no count; anything else says how many games each gives.
  const counted = several || untagged > 0;

  // A `SourceLink` that is a web address is a link, opened in a new tab; any other value is text.
  const valueOf = (name: string, value: string, id: string) => {
    const href = name === "SourceLink" ? sourceLinkHref(value) : undefined;
    if (href === undefined) return value;
    return (
      <Link href={href} target="_blank" rel="noopener noreferrer" underline="hover" data-testid={`${id}-link`}>
        {value}{" "}
        <Box component="span" sx={visuallyHidden}>
          {t("library.collectionSource.newTab")}
        </Box>
      </Link>
    );
  };

  const tagRows = (entry: CollectionSourceEntry, index: number): KeyValueRow[] =>
    entry.tags.map(({ name, value }) => ({
      id: name,
      label: isKnownTag(name) ? t(`library.collectionSource.tags.${name}`) : <span dir="ltr">{name}</span>,
      value: valueOf(name, value, `${testId}-source-${index}-${name}`),
      dir: name.endsWith("Date") || name === "SourceLink" ? ("ltr" as const) : ("auto" as const),
    }));

  const entryOf = (entry: CollectionSourceEntry, index: number) => (
    <>
      {counted && (
        <Typography variant="body2" data-testid={`${testId}-source-${index}-games`} sx={{ fontWeight: 600 }}>
          {t("library.collectionSource.games", { count: entry.games, games: count(entry.games) })}
        </Typography>
      )}
      <KeyValueList rows={tagRows(entry, index)} testId={`${testId}-source-${index}`} />
    </>
  );

  return (
    <Box
      component="section"
      aria-labelledby={`${testId}-title`}
      data-testid={testId}
      sx={{ display: "grid", gap: 1, p: 2, border: "1px solid", borderColor: "divider", borderRadius: 1 }}
    >
      <Typography id={`${testId}-title`} variant="subtitle1" component={headingLevel} sx={{ fontWeight: 700 }}>
        {t("library.collectionSource.title", { count: entries.length })}
      </Typography>
      {several ? (
        <Box component="ul" sx={{ m: 0, p: 0, listStyle: "none", display: "grid", gap: 1.5 }}>
          {entries.map((entry, index) => (
            // The entries are the collection's, in the order it meets them; their tags are their identity.
            <Box component="li" key={index} sx={{ display: "grid", gap: 0.5 }}>
              {entryOf(entry, index)}
            </Box>
          ))}
        </Box>
      ) : (
        entries[0] !== undefined && <Box sx={{ display: "grid", gap: 0.5 }}>{entryOf(entries[0], 0)}</Box>
      )}
      {untagged > 0 && (
        <Typography variant="body2" data-testid={`${testId}-untagged`} sx={{ color: "text.secondary" }}>
          {t("library.collectionSource.untagged", { count: untagged, games: count(untagged) })}
        </Typography>
      )}
    </Box>
  );
}

export default CollectionSource;
