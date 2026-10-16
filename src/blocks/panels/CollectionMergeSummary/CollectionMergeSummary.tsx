import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { linkProps, type LinkTarget } from "../../../design-system/components/link";
import { KeyValueList } from "../../../design-system/components/lists";
import { DataTable, type DataTableColumn } from "../../../design-system/patterns/tables";
import type { CollectionMergeSourceSummary, CollectionMergeSummary as Summary } from "../../../lib/jobs/kinds/collectionMerge/core";

export type CollectionMergeSummaryProps = {
  /** The summary (`summaryOf`, or a data output read back with `parseCollectionMergeSummary`). */
  summary: Summary;
  /** Where the new collection opens, when it was added — absent, its name is words. */
  collectionLink?: LinkTarget;
  /**
   * The root. The totals `-totals` (each `-totals-<count>`), the dedupe mode
   * `-dedupe`, the length `-chars`, the table `-table` (a row
   * `-table-row-<source id>`), what became of the collection `-collection`
   * (its link `-collection-link`).
   */
  testId: string;
};

const COUNTS = ["read", "written", "duplicates", "unreadable"] as const;

type Column = "name" | (typeof COUNTS)[number];

/**
 * **A collection merge's summary** (CTA-220, the Jobs module's
 * `library.collection-merge` kind's data output): the totals — games read,
 * written, dropped as duplicates, unreadable — the dedupe mode and the
 * file's length; a table of the same counts per collection, in the order
 * merged; and what became of the new Library collection — added (its name,
 * a link where the screen gives one) or, with the reason, not: the PGN over
 * the most a collection holds, or no game written. Nothing is said of it
 * when none was asked for.
 *
 * Presentational: the summary and the link are props. Its words are
 * `jobs.kinds.collectionMerge.summary.*`.
 */
function CollectionMergeSummary({ summary, collectionLink, testId }: CollectionMergeSummaryProps) {
  const { t, i18n } = useTranslation();
  const words = (key: string, options?: Record<string, unknown>) => t(`jobs.kinds.collectionMerge.summary.${key}`, options);
  const number = (value: number) => value.toLocaleString(i18n.language);

  const columns: DataTableColumn<CollectionMergeSourceSummary, Column>[] = [
    {
      id: "name",
      header: words("collection"),
      wrap: true,
      render: (source) => <bdi dir="auto">{source.name}</bdi>,
    },
    ...COUNTS.map(
      (count): DataTableColumn<CollectionMergeSourceSummary, Column> => ({
        id: count,
        header: words(count),
        align: "end",
        dir: "ltr",
        render: (source) => number(source[count]),
      }),
    ),
  ];

  const { collection } = summary;
  let outcome: ReactNode = null;
  if (collection.status === "added") {
    outcome = (
      <>
        {words("added", { name: collection.name })}
        {collectionLink !== undefined && (
          <>
            {" "}
            <Link {...(linkProps(collectionLink) as Record<string, unknown>)} underline="hover" data-testid={`${testId}-collection-link`}>
              {words("open", { name: collection.name })}
            </Link>
          </>
        )}
      </>
    );
  } else if (collection.status === "too-large") {
    outcome = words("tooLarge", { chars: number(collection.chars), limit: number(collection.limit) });
  } else if (collection.status === "empty") {
    outcome = words("empty");
  }

  return (
    <Box data-testid={testId} sx={{ display: "grid", gap: 1.5, minWidth: 0 }}>
      <Box sx={{ display: "grid", gap: 0.5 }}>
        <Typography variant="subtitle2" component="h3">
          {words("title")}
        </Typography>
        <KeyValueList
          rows={COUNTS.map((count) => ({ id: count, label: words(count), value: number(summary.totals[count]), dir: "ltr" }))}
          ariaLabel={words("totals")}
          testId={`${testId}-totals`}
        />
        <Typography variant="body2" sx={{ color: "text.secondary" }} data-testid={`${testId}-dedupe`}>
          {words("dedupe", { mode: t(`jobs.kinds.collectionMerge.dedupe.${summary.dedupe}`) })}
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }} data-testid={`${testId}-chars`}>
          {words("chars", { chars: number(summary.chars) })}
        </Typography>
      </Box>
      <DataTable<CollectionMergeSourceSummary, Column>
        columns={columns}
        rows={summary.sources}
        rowId={(source) => source.id}
        sorted
        density="dense"
        stickyHeader={false}
        emptyLabel={words("noSources")}
        ariaLabel={words("perSource")}
        testId={`${testId}-table`}
      />
      {outcome !== null && (
        <Typography variant="body2" data-testid={`${testId}-collection`}>
          {outcome}
        </Typography>
      )}
    </Box>
  );
}

export default CollectionMergeSummary;
