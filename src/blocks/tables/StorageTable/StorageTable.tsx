import { useMemo } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { DataTable, type DataTableColumn } from "../../../design-system/patterns/tables";
import { formatBytes } from "../../../lib/formatBytes";
import type { BrowserStorageEstimate } from "../../../lib/storageDiagnostics";

/** One kind of the reader's records, as the Storage tab counts it. */
export type StorageCategoryId = "playedGames" | "analyses" | "repertoires" | "collectionGames" | "jobs";

export type StorageCategory = {
  id: StorageCategoryId;
  /** The database it lives in — a new section starts where this changes. */
  section: string;
  /** Counted exactly; `undefined` while its store is read. */
  records: number | undefined;
  /** The app's own estimate of what the records hold, in bytes; `undefined` while it is made. */
  payload: number | undefined;
};

export type StorageTableProps = {
  /** The browser's own estimates for the origin — `undefined` while they are asked for. */
  browser: BrowserStorageEstimate | undefined;
  /** The reader's records, a row per category, in order. */
  categories: readonly StorageCategory[];
  /**
   * The prefix of its ids: `<testId>-browser` and `<testId>-data` (each
   * table's box), the browser's cells `<testId>-usage` and
   * `<testId>-indexeddb`, a category's `<testId>-<id>-records` and
   * `-payload`.
   */
  testId: string;
};

type BrowserRow = { id: "usage" | "indexeddb"; labelKey: string; value: number | null | undefined };

/** A size: "…" while it is out, "Not available" where the browser reports none, never zero for either. */
const Size = ({ bytes, notAvailable }: { bytes: number | null | undefined; notAvailable: string }) =>
  bytes === undefined ? "…" : bytes === null ? notAvailable : <bdi dir="ltr">{formatBytes(bytes)}</bdi>;

/**
 * **Settings → Storage's two tables** (CTA-109; CTA-94's report) — the
 * browser's estimates for the whole origin (its usage, and the IndexedDB part
 * where the browser reports one), then the reader's records, a row per
 * category with its exact count and **estimated payload**, a bolder line
 * where one database's section ends. Every number says what it is; a number
 * the browser does not report reads "Not available", never zero; "…" while
 * a read is out. Both are `DataTable`s, read-only.
 *
 * Presentational: the estimates and the counts are props (the Storage tab
 * reads the stores). Its words are the app's (`settings.storage.*`).
 */
function StorageTable({ browser, categories, testId }: StorageTableProps) {
  const { t } = useTranslation();
  const notAvailable = t("settings.storage.notAvailable");

  const browserRows: BrowserRow[] = [
    { id: "usage", labelKey: "settings.storage.browser.usage", value: browser?.usage },
    { id: "indexeddb", labelKey: "settings.storage.browser.indexedDb", value: browser?.indexedDB },
  ];

  const browserColumns = useMemo<DataTableColumn<BrowserRow, "measure" | "size">[]>(
    () => [
      { id: "measure", header: t("settings.storage.browser.measure"), wrap: true, render: (row) => t(row.labelKey) },
      {
        id: "size",
        header: t("settings.storage.browser.size"),
        align: "end",
        cellTestId: (row) => `${testId}-${row.id}`,
        render: (row) => <Size bytes={row.value} notAvailable={notAvailable} />,
      },
    ],
    [t, testId, notAvailable],
  );

  const dataColumns = useMemo<DataTableColumn<StorageCategory, "category" | "records" | "payload">[]>(
    () => [
      { id: "category", header: t("settings.storage.data.category"), wrap: true, render: (row) => t(`settings.storage.data.categories.${row.id}`) },
      {
        id: "records",
        header: t("settings.storage.data.records"),
        align: "end",
        cellTestId: (row) => `${testId}-${row.id}-records`,
        render: (row) => (row.records === undefined ? "…" : <bdi dir="ltr">{row.records}</bdi>),
      },
      {
        id: "payload",
        header: t("settings.storage.data.payload"),
        align: "end",
        cellTestId: (row) => `${testId}-${row.id}-payload`,
        render: (row) => <Size bytes={row.payload} notAvailable={notAvailable} />,
      },
    ],
    [t, testId, notAvailable],
  );

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Box data-testid={`${testId}-browser`}>
        <Typography variant="subtitle2" component="h2">
          {t("settings.storage.browser.title")}
        </Typography>
        <DataTable<BrowserRow, "measure" | "size">
          columns={browserColumns}
          rows={browserRows}
          rowId={(row) => row.id}
          stickyHeader={false}
          emptyLabel={notAvailable}
          ariaLabel={t("settings.storage.browser.title")}
          testId={`${testId}-browser-table`}
        />
        <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
          {t("settings.storage.browser.quotaNote")}
        </Typography>
      </Box>

      <Box data-testid={`${testId}-data`}>
        <Typography variant="subtitle2" component="h2">
          {t("settings.storage.data.title")}
        </Typography>
        <DataTable<StorageCategory, "category" | "records" | "payload">
          columns={dataColumns}
          rows={categories}
          rowId={(row) => row.id}
          stickyHeader={false}
          // A section ends where the next row's database differs: a bolder line than within one.
          groupEnd={(row, next) => next !== undefined && next.section !== row.section}
          emptyLabel={notAvailable}
          ariaLabel={t("settings.storage.data.title")}
          testId={`${testId}-data-table`}
        />
        <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
          {t("settings.storage.note")}
        </Typography>
      </Box>
    </Box>
  );
}

export default StorageTable;
