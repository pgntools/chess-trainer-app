import { useMemo } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { KeyValueList, type KeyValueRow } from "../../../design-system/components/lists";
import { LabelChip, type LabelChipTone } from "../../../design-system/components/tables";
import { DataTable, type DataTableColumn } from "../../../design-system/patterns/tables";
import type { PositionGrade, SessionSummary } from "../../../lib/accuracyTrainer";
import type { Turn } from "../../../lib/engineAnalysis";

/** One position of the session, as the report lists it. */
export type AccuracyReportRow = {
  /** Its place in the session, 0 the first — what `onOpen` is called with. */
  index: number;
  moveNumber: number;
  turn: Turn;
  /** The game's move there. */
  playedSan: string;
  /** Line 1. */
  bestSan: string;
  /** What the reader suggested, in SAN. */
  suggestions: readonly string[];
  /** `null` while the position is still to be answered. */
  grade: PositionGrade | null;
};

export type AccuracySessionReportProps = {
  summary: SessionSummary;
  rows: readonly AccuracyReportRow[];
  /** Back to a position — its row's move is a button. */
  onOpen: (index: number) => void;
  /**
   * The root; the measures `-measures` (each value `-measures-<measure>`),
   * the table `-table` (a row `-table-row-<index>`, its button `-open-<index>`,
   * its result `-result-<index>`).
   */
  testId: string;
};

type Column = "move" | "game" | "best" | "yours" | "loss" | "result";

/** A move number as a PGN writes it: `12.` for White, `12…` for Black. */
const moveLabelOf = (row: Pick<AccuracyReportRow, "moveNumber" | "turn">) => `${row.moveNumber}${row.turn === "w" ? "." : "…"}`;

/** A position's result as a chip: its words' key and its tone. */
const resultOf = (grade: PositionGrade): { key: string; tone: LabelChipTone } | null => {
  if (grade.passed) return null;
  if (grade.bestFound) return { key: "accuracyTrainer.lines.best", tone: "success" };
  if (grade.worstVerdict === "blunder") return { key: "computerAnalysis.verdicts.blunder", tone: "error" };
  if (grade.worstVerdict !== null) return { key: `computerAnalysis.verdicts.${grade.worstVerdict}`, tone: "warning" };
  if (grade.bestLoss === null) return { key: "accuracyTrainer.report.outside", tone: "secondary" };
  return { key: "accuracyTrainer.lines.good", tone: "info" };
};

/**
 * **An Accuracy Trainer session's summary** (CTA-238): the measures —
 * positions answered and passed, how often the best move and a top move
 * were found, the average loss of the reader's best suggestion (over the
 * positions where it is known), and every suggestion's inaccuracies,
 * mistakes, blunders and moves outside the top N — then **every position**
 * in game order: its move, the game's move, line 1, the reader's moves, the
 * best one's loss and a result (Best, the worst verdict, Good, Outside, or
 * Passed). Each position's move is a button back to it.
 *
 * Presentational: the summary and the rows are props
 * (`lib/accuracyTrainer.ts`'s `sessionSummaryOf`). Its words are
 * `accuracyTrainer.report.*`.
 */
function AccuracySessionReport({ summary, rows, onOpen, testId }: AccuracySessionReportProps) {
  const { t } = useTranslation();

  const rate = (value: number | null, count: number) =>
    value === null ? "–" : t("accuracyTrainer.report.rate", { percent: Math.round(value * 100), count, total: summary.positions });

  const measures: KeyValueRow[] = [
    { id: "positions", label: t("accuracyTrainer.report.positions"), value: summary.positions, dir: "ltr" },
    { id: "answered", label: t("accuracyTrainer.report.answered"), value: summary.answered, dir: "ltr" },
    { id: "passed", label: t("accuracyTrainer.report.passed"), value: summary.passed, dir: "ltr" },
    { id: "bestRate", label: t("accuracyTrainer.report.bestRate"), value: rate(summary.bestRate, summary.bestFound) },
    { id: "topRate", label: t("accuracyTrainer.report.topRate"), value: rate(summary.topRate, summary.topFound) },
    { id: "averageLoss", label: t("accuracyTrainer.report.averageLoss"), value: summary.averageBestLoss ?? "–", dir: "ltr" },
    { id: "inaccuracies", label: t("accuracyTrainer.report.inaccuracies"), value: summary.inaccuracies, dir: "ltr" },
    { id: "mistakes", label: t("accuracyTrainer.report.mistakes"), value: summary.mistakes, dir: "ltr" },
    { id: "blunders", label: t("accuracyTrainer.report.blunders"), value: summary.blunders, dir: "ltr" },
    { id: "outside", label: t("accuracyTrainer.report.outside"), value: summary.outside, dir: "ltr" },
  ];

  const columns = useMemo<DataTableColumn<AccuracyReportRow, Column>[]>(
    () => [
      {
        id: "move",
        header: t("accuracyTrainer.report.move"),
        render: (row) => (
          <Button
            size="small"
            onClick={() => onOpen(row.index)}
            aria-label={t("accuracyTrainer.report.open", { move: `${moveLabelOf(row)} ${row.playedSan}` })}
            data-testid={`${testId}-open-${row.index}`}
            sx={{ minWidth: 32, minHeight: 24, py: 0, px: 0.75, marginInlineStart: -0.75 }}
          >
            <Box component="span" dir="ltr">
              {moveLabelOf(row)}
            </Box>
          </Button>
        ),
      },
      { id: "game", header: t("accuracyTrainer.report.game"), dir: "ltr", render: (row) => row.playedSan },
      { id: "best", header: t("accuracyTrainer.report.best"), dir: "ltr", render: (row) => row.bestSan },
      {
        id: "yours",
        header: t("accuracyTrainer.report.yours"),
        wrap: true,
        render: (row) =>
          row.grade === null ? (
            <Box component="span" sx={{ color: "text.secondary" }}>
              {t("accuracyTrainer.report.notYet")}
            </Box>
          ) : row.grade.passed ? (
            t("accuracyTrainer.report.passedMark")
          ) : (
            <Box component="span" dir="ltr">
              {row.suggestions.join(", ")}
            </Box>
          ),
      },
      { id: "loss", header: t("accuracyTrainer.lines.loss"), align: "end", dir: "ltr", render: (row) => row.grade?.bestLoss ?? "–" },
      {
        id: "result",
        header: t("accuracyTrainer.report.result"),
        cellTestId: (row) => `${testId}-result-${row.index}`,
        render: (row) => {
          const result = row.grade === null ? null : resultOf(row.grade);
          return result === null ? null : <LabelChip label={t(result.key)} tone={result.tone} />;
        },
      },
    ],
    [t, onOpen, testId],
  );

  return (
    <Box component="section" aria-labelledby={`${testId}-title`} data-testid={testId} sx={{ display: "grid", gap: 1.5 }}>
      <Typography id={`${testId}-title`} component="h3" variant="subtitle2" sx={{ fontWeight: 700 }}>
        {t("accuracyTrainer.report.title")}
      </Typography>
      <KeyValueList rows={measures} ariaLabel={t("accuracyTrainer.report.measures")} testId={`${testId}-measures`} />
      <DataTable<AccuracyReportRow, Column>
        columns={columns}
        rows={rows}
        rowId={(row) => String(row.index)}
        stickyHeader={false}
        density="dense"
        emptyLabel={t("accuracyTrainer.report.notYet")}
        ariaLabel={t("accuracyTrainer.report.table")}
        testId={`${testId}-table`}
      />
    </Box>
  );
}

export default AccuracySessionReport;
