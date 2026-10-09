import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { DataTable, type DataTableColumn } from "../../../design-system/patterns/tables";
import type { ComputerAnalysisReport as Report, PlayerReport } from "../../../lib/computerAnalysis";

export type ComputerAnalysisReportProps = {
  /** Both players' summaries (`playerReports`, or `reportFromTree` of a saved output). */
  report: Report;
  /** The players' names for the two columns — absent, "White" and "Black". */
  players?: { w?: string; b?: string };
  /** The root; each figure's cell is `<testId>-<measure>-<w|b>`. */
  testId: string;
};

type Measure = "inaccuracies" | "mistakes" | "blunders" | "missedMates" | "acpl" | "accuracy";

const MEASURES: readonly Measure[] = ["inaccuracies", "mistakes", "blunders", "missedMates", "acpl", "accuracy"];

/** One figure of one side, as read: "…" where it has none, the side's "Not analysed" where the side has none. */
const figureOf = (report: PlayerReport | null, measure: Measure, notAnalysed: string): string => {
  if (report === null) return notAnalysed;
  const value = report[measure];
  if (value === null) return "–";
  return measure === "accuracy" ? `${Math.round(value)}%` : String(value);
};

/**
 * **A computer analysis's report** (CTA-173, CTA-171): per player, the
 * inaccuracies, mistakes, blunders and missed mates, the average centipawn
 * loss and the accuracy (lichess's formula) — a row per measure, a column
 * per side, as lichess lays it out. A side with no analysed move says "Not
 * analysed" in each of its cells; a figure that cannot be worked out (an ACPL
 * with no loss known) is a dash.
 *
 * It is the eval graph's text alternative too (`EvalGraph`): the same run in
 * numbers. Presentational — the report is a prop (`lib/computerAnalysis.ts`'s
 * `ComputerAnalysisReport`), its words the app's (`computerAnalysis.report.*`).
 */
function ComputerAnalysisReport({ report, players, testId }: ComputerAnalysisReportProps) {
  const { t } = useTranslation();
  const notAnalysed = t("computerAnalysis.report.notAnalysed");

  const columns = useMemo<DataTableColumn<Measure, "measure" | "w" | "b">[]>(
    () => [
      { id: "measure", header: t("computerAnalysis.report.measure"), wrap: true, render: (measure) => t(`computerAnalysis.report.measures.${measure}`) },
      ...(["w", "b"] as const).map(
        (side): DataTableColumn<Measure, "measure" | "w" | "b"> => ({
          id: side,
          header: players?.[side] || t(side === "w" ? "computerAnalysis.report.white" : "computerAnalysis.report.black"),
          align: "end",
          dir: "ltr",
          wrap: true,
          cellTestId: (measure) => `${testId}-${measure}-${side}`,
          render: (measure) => figureOf(report[side], measure, notAnalysed),
        }),
      ),
    ],
    [t, players, report, testId, notAnalysed],
  );

  return (
    <DataTable<Measure, "measure" | "w" | "b">
      columns={columns}
      rows={MEASURES}
      rowId={(measure) => measure}
      stickyHeader={false}
      density="dense"
      // The counts end where the two averages begin: a bolder line between.
      groupEnd={(measure) => measure === "missedMates"}
      emptyLabel={notAnalysed}
      ariaLabel={t("computerAnalysis.report.title")}
      testId={testId}
    />
  );
}

export default ComputerAnalysisReport;
