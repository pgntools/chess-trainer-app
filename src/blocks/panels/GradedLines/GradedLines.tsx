import { useMemo } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { StatusText } from "../../../design-system/components/feedback";
import { LabelChip, type LabelChipTone } from "../../../design-system/components/tables";
import { DataTable, type DataTableColumn } from "../../../design-system/patterns/tables";
import type { PositionGrade, SuggestionGrade, TrainingPosition } from "../../../lib/accuracyTrainer";
import type { AchievementPieces } from "../../../lib/achievements/material";
import { formatScore, type Score } from "../../../lib/engineAnalysis";
import { AchievementRow } from "./AchievementRow";
import { gradeHeadlineOf } from "./headline";

export type GradedLinesProps = {
  /** The position answered, its lines best first (`trainingPositionsOf`, with the engine's added). */
  position: TrainingPosition;
  /** The reader's moves there, in their order, graded (`gradePosition`). */
  grade: PositionGrade;
  /**
   * The position's achievements (CTA-249, `achievementsOf`) — a piece per
   * category, drawn as a row under the headline. Absent, no row.
   */
  achievements?: AchievementPieces;
  /**
   * The root; the headline `-headline`, the achievements `-achievements`
   * (each `-achievements-<category>`), the table `-table` (a row
   * `-table-row-<san>`), a row's verdict `-verdict-<san>`, its place
   * `-order-<san>`.
   */
  testId: string;
};

type Column = "rank" | "move" | "eval" | "loss" | "order" | "verdict";

/** A row: one of the lines, or a reader's move outside them. */
type Row = {
  san: string;
  rank?: number;
  score?: Score;
  loss?: number;
  lossAtLeast?: number;
  played: boolean;
  suggestion?: SuggestionGrade;
};

/** A suggestion's verdict as a chip: its words' key and its tone. */
const verdictOf = (grade: SuggestionGrade): { key: string; tone: LabelChipTone } => {
  if (grade.kind === "outside") return { key: "accuracyTrainer.lines.outside", tone: "secondary" };
  if (grade.verdict === "blunder") return { key: "computerAnalysis.verdicts.blunder", tone: "error" };
  if (grade.verdict !== null) return { key: `computerAnalysis.verdicts.${grade.verdict}`, tone: "warning" };
  return grade.loss === 0 ? { key: "accuracyTrainer.lines.best", tone: "success" } : { key: "accuracyTrainer.lines.good", tone: "info" };
};

/**
 * **A graded position** of the Accuracy Trainer (CTA-238): a headline — how
 * many of the top N best moves the reader found and how many in their right
 * place, all of them in order, none, or a pass — over **the engine's lines**,
 * best first: each one's rank, move (the game's marked), eval (White's view)
 * and loss against line 1 in centipawns; and, where the reader played it,
 * **their own rank for it** (marked *In place* when it is the engine's) and its
 * verdict (Best, Good, Inaccuracy, Mistake, Blunder — the computer analysis's
 * thresholds). A line closes the top N. A move of the reader's none of the
 * lines has comes after them, *not among the lines*, its loss a bound (≥ the
 * worst listed line's) and never a number. With `achievements` (CTA-249),
 * the pieces the answer won — one per category — under the headline.
 *
 * Presentational: the position and its grade are props
 * (`lib/accuracyTrainer.ts`). Its words are `accuracyTrainer.lines.*` and the
 * computer analysis's verdicts.
 */
function GradedLines({ position, grade, achievements, testId }: GradedLinesProps) {
  const { t } = useTranslation();

  const rows = useMemo<Row[]>(() => {
    const lines = position.lines.map((line): Row => {
      const suggestion = grade.suggestions.find((each) => each.kind === "line" && each.rank === line.rank);
      return { san: line.san, rank: line.rank, score: line.score, loss: line.loss, played: line.played, ...(suggestion === undefined ? {} : { suggestion }) };
    });
    const outside = grade.suggestions.flatMap((each): Row[] =>
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
        id: "order",
        header: t("accuracyTrainer.lines.order"),
        cellTestId: (row) => `${testId}-order-${row.san}`,
        render: (row) =>
          row.suggestion === undefined ? null : (
            <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
              <span>{row.suggestion.order}</span>
              {row.suggestion.inPlace && <LabelChip label={t("accuracyTrainer.lines.inPlace")} tone="success" />}
            </Box>
          ),
      },
      {
        id: "verdict",
        header: t("accuracyTrainer.lines.verdict"),
        render: (row) => {
          if (row.suggestion === undefined) return null;
          const verdict = verdictOf(row.suggestion);
          return <LabelChip label={t(verdict.key)} tone={verdict.tone} testId={`${testId}-verdict-${row.san}`} />;
        },
      },
    ],
    [t, testId],
  );

  const headline = gradeHeadlineOf(grade);

  return (
    <Box component="section" aria-labelledby={`${testId}-title`} data-testid={testId} sx={{ display: "grid", gap: 1 }}>
      <StatusText tone={headline.tone} emphasis testId={`${testId}-headline`}>
        {t(headline.key, headline.values)}
      </StatusText>
      {achievements !== undefined && <AchievementRow pieces={achievements} testId={`${testId}-achievements`} />}
      <Typography id={`${testId}-title`} component="h3" variant="subtitle2" sx={{ fontWeight: 700 }}>
        {t("accuracyTrainer.lines.title")}
      </Typography>
      <DataTable<Row, Column>
        columns={columns}
        rows={rows}
        rowId={(row) => row.san}
        stickyHeader={false}
        density="dense"
        // The top N end on a bolder line, and so do the lines, before the reader's moves outside them.
        groupEnd={(row, next) => row.rank === grade.target || (row.rank !== undefined && next !== undefined && next.rank === undefined)}
        emptyLabel={t("accuracyTrainer.lines.title")}
        ariaLabel={t("accuracyTrainer.lines.title")}
        testId={`${testId}-table`}
      />
    </Box>
  );
}

export default GradedLines;
