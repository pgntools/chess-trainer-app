import { useMemo } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { StatusText } from "../../../design-system/components/feedback";
import { LabelChip, type LabelChipTone } from "../../../design-system/components/tables";
import { DataTable, type DataTableColumn } from "../../../design-system/patterns/tables";
import type { PositionGrade, SuggestionGrade, TrainingPosition } from "../../../lib/accuracyTrainer";
import { formatScore, type Score } from "../../../lib/engineAnalysis";

export type GradedLinesProps = {
  /** The position answered, its lines best first (`trainingPositionsOf`). */
  position: TrainingPosition;
  /** The reader's suggestions there, graded (`gradePosition`). */
  grade: PositionGrade;
  /** The root; the headline `-headline`, the table `-table` (a row `-table-row-<san>`), a row's verdict `-verdict-<san>`. */
  testId: string;
};

type Column = "rank" | "move" | "eval" | "loss" | "yours";

/** A row: one of the lines, or a suggestion outside them. */
type Row = {
  san: string;
  rank?: number;
  score?: Score;
  loss?: number;
  lossAtLeast?: number;
  played: boolean;
  suggestion?: SuggestionGrade;
};

/** A suggestion's verdict as a chip: its words and its tone. */
const verdictOf = (grade: SuggestionGrade): { key: string; tone: LabelChipTone } => {
  if (grade.kind === "outside") return { key: "outside", tone: "secondary" };
  if (grade.verdict === "blunder") return { key: "blunder", tone: "error" };
  if (grade.verdict === "mistake" || grade.verdict === "inaccuracy") return { key: grade.verdict, tone: "warning" };
  return grade.loss === 0 ? { key: "best", tone: "success" } : { key: "good", tone: "info" };
};

/**
 * **A graded position** of the Accuracy Trainer (CTA-238): after Submit, a
 * headline — the best move found, how many of the top lines, none, or a
 * pass — over **the engine's lines** as the tree has them, best first: each
 * one's rank, move (the game's marked), eval (White's view) and loss against
 * line 1 in centipawns, and, where the reader suggested it, its verdict
 * (Best, Good, Inaccuracy, Mistake, Blunder — the computer analysis's
 * thresholds). A suggestion none of the lines has comes after them,
 * *outside the top N*, its loss a bound (≥ the worst listed line's) and
 * never a number.
 *
 * Presentational: the position and its grade are props
 * (`lib/accuracyTrainer.ts`). Its words are `accuracyTrainer.lines.*` and the
 * computer analysis's verdicts.
 */
function GradedLines({ position, grade, testId }: GradedLinesProps) {
  const { t } = useTranslation();

  const rows = useMemo<Row[]>(() => {
    const suggested = new Map(grade.suggestions.map((each) => [each.san, each]));
    const lines = position.lines.map((line): Row => {
      const suggestion = grade.suggestions.find((each) => each.kind === "line" && each.rank === line.rank);
      return { san: line.san, rank: line.rank, score: line.score, loss: line.loss, played: line.played, ...(suggestion === undefined ? {} : { suggestion }) };
    });
    const outside = [...suggested.values()].flatMap((each): Row[] =>
      each.kind === "outside" ? [{ san: each.san, lossAtLeast: each.lossAtLeast, played: false, suggestion: each }] : [],
    );
    return [...lines, ...outside];
  }, [position, grade]);

  const columns = useMemo<DataTableColumn<Row, Column>[]>(
    () => [
      { id: "rank", header: t("accuracyTrainer.lines.rank"), align: "end", render: (row) => (row.rank === undefined ? "—" : row.rank) },
      {
        id: "move",
        header: t("accuracyTrainer.lines.move"),
        rowHeader: true,
        render: (row) => (
          <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
            <Box component="span" dir="ltr" sx={{ fontWeight: row.suggestion === undefined ? 400 : 700 }}>
              {row.san}
            </Box>
            {row.played && <LabelChip label={t("accuracyTrainer.lines.gameMove")} name={t("accuracyTrainer.lines.gameMoveName")} tone="primary" />}
          </Box>
        ),
      },
      { id: "eval", header: t("accuracyTrainer.lines.eval"), align: "end", dir: "ltr", render: (row) => (row.score === undefined ? "?" : formatScore(row.score)) },
      {
        id: "loss",
        header: t("accuracyTrainer.lines.loss"),
        align: "end",
        dir: "ltr",
        render: (row) => (row.lossAtLeast !== undefined ? t("accuracyTrainer.lines.lossAtLeast", { loss: row.lossAtLeast }) : row.loss),
      },
      {
        id: "yours",
        header: t("accuracyTrainer.lines.yours"),
        render: (row) => {
          if (row.suggestion === undefined) return null;
          const verdict = verdictOf(row.suggestion);
          const label =
            verdict.key === "outside"
              ? t("accuracyTrainer.lines.outside", { count: position.topCount })
              : verdict.key === "best" || verdict.key === "good"
                ? t(`accuracyTrainer.lines.${verdict.key}`)
                : t(`computerAnalysis.verdicts.${verdict.key}`);
          return <LabelChip label={label} tone={verdict.tone} testId={`${testId}-verdict-${row.san}`} />;
        },
      },
    ],
    [t, position.topCount, testId],
  );

  const headline = grade.passed
    ? { tone: "neutral" as const, text: t("accuracyTrainer.lines.headline.passed") }
    : grade.bestFound
      ? { tone: "success" as const, text: t("accuracyTrainer.lines.headline.best") }
      : grade.topFound > 0
        ? { tone: "info" as const, text: t("accuracyTrainer.lines.headline.top", { found: grade.topFound, count: position.topCount }) }
        : { tone: "warning" as const, text: t("accuracyTrainer.lines.headline.none", { count: position.topCount }) };

  return (
    <Box component="section" aria-labelledby={`${testId}-title`} data-testid={testId} sx={{ display: "grid", gap: 1 }}>
      <StatusText tone={headline.tone} emphasis testId={`${testId}-headline`}>
        {headline.text}
      </StatusText>
      <Typography id={`${testId}-title`} component="h3" variant="subtitle2" sx={{ fontWeight: 700 }}>
        {t("accuracyTrainer.lines.title")}
      </Typography>
      <DataTable<Row, Column>
        columns={columns}
        rows={rows}
        rowId={(row) => row.san}
        stickyHeader={false}
        density="dense"
        // The lines end where the suggestions outside them begin.
        groupEnd={(row, next) => row.rank !== undefined && next !== undefined && next.rank === undefined}
        emptyLabel={t("accuracyTrainer.lines.title")}
        ariaLabel={t("accuracyTrainer.lines.title")}
        testId={`${testId}-table`}
      />
    </Box>
  );
}

export default GradedLines;
