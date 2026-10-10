import { useMemo } from "react";
import Button from "@mui/material/Button";
import { useTranslation } from "react-i18next";

import { DataTable, type DataTableColumn } from "../../../design-system/patterns/tables";
import type { ComputerAnalysisReport as Report, MoveVerdictKind, PlayerReport } from "../../../lib/computerAnalysis";
import type { Turn } from "../../../lib/engineAnalysis";

export type ComputerAnalysisReportProps = {
  /** Both players' summaries (`playerReports`, or `reportFromTree` of a saved output). */
  report: Report;
  /** The players' names for the two columns — absent, "White" and "Black". */
  players?: { w?: string; b?: string };
  /**
   * A count above 0 is a button that steps to that side's next move of that
   * kind (lichess's) — the board's, which goes there (CTA-174). Absent, the
   * counts are text.
   */
  onStep?: (side: Turn, kind: MoveVerdictKind) => void;
  /** The root; each figure's cell is `<testId>-<measure>-<w|b>`, a count's button `<testId>-<measure>-<w|b>-step`. */
  testId: string;
};

type Measure = "inaccuracies" | "mistakes" | "blunders" | "missedMates" | "acpl" | "accuracy";

const MEASURES: readonly Measure[] = ["inaccuracies", "mistakes", "blunders", "missedMates", "acpl", "accuracy"];

/** The counts, and the verdict each one counts. */
const KIND_OF: Partial<Record<Measure, MoveVerdictKind>> = {
  inaccuracies: "inaccuracy",
  mistakes: "mistake",
  blunders: "blunder",
  missedMates: "missedMate",
};

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
 * numbers. On the Analysis Board (CTA-174, `onStep`) each count above 0 is a
 * button to that side's next move of that kind, as on lichess. Presentational — the report is a prop (`lib/computerAnalysis.ts`'s
 * `ComputerAnalysisReport`), its words the app's (`computerAnalysis.report.*`).
 */
function ComputerAnalysisReport({ report, players, onStep, testId }: ComputerAnalysisReportProps) {
  const { t } = useTranslation();
  const notAnalysed = t("computerAnalysis.report.notAnalysed");

  const columns = useMemo<DataTableColumn<Measure, "measure" | "w" | "b">[]>(() => {
    const playerName = (side: Turn) =>
      players?.[side] || t(side === "w" ? "computerAnalysis.report.white" : "computerAnalysis.report.black");
    return [
      { id: "measure", header: t("computerAnalysis.report.measure"), wrap: true, render: (measure) => t(`computerAnalysis.report.measures.${measure}`) },
      ...(["w", "b"] as const).map(
        (side): DataTableColumn<Measure, "measure" | "w" | "b"> => ({
          id: side,
          header: playerName(side),
          align: "end",
          dir: "ltr",
          wrap: true,
          cellTestId: (measure) => `${testId}-${measure}-${side}`,
          render: (measure) => {
            const figure = figureOf(report[side], measure, notAnalysed);
            const kind = KIND_OF[measure];
            const count = report[side]?.[measure] ?? 0;
            if (onStep === undefined || kind === undefined || count === 0) return figure;
            return (
              <Button
                size="small"
                onClick={() => onStep(side, kind)}
                aria-label={t("computerAnalysis.report.step", {
                  measure: t(`computerAnalysis.report.measures.${measure}`),
                  player: playerName(side),
                  count,
                })}
                data-testid={`${testId}-${measure}-${side}-step`}
                sx={{ minWidth: 32, minHeight: 24, py: 0, px: 0.75, marginInlineEnd: -0.75 }}
              >
                {figure}
              </Button>
            );
          },
        }),
      ),
    ];
  }, [t, players, report, testId, notAnalysed, onStep]);

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
