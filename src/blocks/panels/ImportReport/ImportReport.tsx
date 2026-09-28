import Box from "@mui/material/Box";
import { useTranslation } from "react-i18next";

import { InlineAlert } from "../../../design-system/components/feedback";
import { EXPORT_CATEGORIES, type ExportCategory } from "../../../lib/dataExport";
import type { ImportResult, ImportResults } from "../../../lib/dataImportTarget";

export type ImportReportProps = {
  /** What came of each category the import wrote — `applyImport`'s answer. */
  results: ImportResults;
  /** The prefix of its ids: the report `<testId>-done`, each line `<testId>-result-<category>`. */
  testId: string;
};

type Translate = ReturnType<typeof useTranslation>["t"];

/** One category's line: added, replaced, skipped, folders created — or refused, or failed. */
const resultText = (t: Translate, category: ExportCategory, result: ImportResult): string => {
  const values = { category: t(`settings.export.categories.${category}`) };
  switch (result.status) {
    case "done":
      return t("settings.import.result.done", { ...values, ...result.report });
    case "refused":
      return t(result.cap.kind === "records" ? "settings.import.result.refusedRecords" : "settings.import.result.refusedFolders", {
        ...values,
        ...result.cap,
      });
    case "failed":
      return t(
        result.failure === "too-many"
          ? "settings.import.result.tooMany"
          : result.failure === "indexing"
            ? "settings.import.result.indexing"
            : "settings.import.result.storage",
        values,
      );
  }
};

/**
 * **What an import did** (CTA-109; CTA-89's report) — a line per category it
 * wrote: added, replaced, skipped, folders created, or why it was refused or
 * failed. A success when every category was done, a warning otherwise — an
 * alert either way, so a screen reader reads it as it lands.
 *
 * Presentational: the results are props. Its words are the app's
 * (`settings.import.result.*`).
 */
function ImportReport({ results, testId }: ImportReportProps) {
  const { t } = useTranslation();
  const reported = EXPORT_CATEGORIES.filter((category) => results[category] !== undefined);
  const allDone = reported.every((category) => results[category]?.status === "done");
  return (
    <InlineAlert severity={allDone ? "success" : "warning"} testId={`${testId}-done`}>
      {reported.map((category) => {
        const result = results[category];
        return (
          result !== undefined && (
            <Box key={category} data-testid={`${testId}-result-${category}`}>
              {resultText(t, category, result)}
            </Box>
          )
        );
      })}
    </InlineAlert>
  );
}

export default ImportReport;
