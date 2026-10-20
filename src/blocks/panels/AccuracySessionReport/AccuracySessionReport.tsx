import { useMemo } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { KeyValueList, type KeyValueRow } from "../../../design-system/components/lists";
import { LabelChip, type LabelChipTone } from "../../../design-system/components/tables";
import { DataTable, type DataTableColumn } from "../../../design-system/patterns/tables";
import type { PositionGrade, SessionSummary } from "../../../lib/accuracyTrainer";
import type { AchievementCategoryId } from "../../../lib/achievements/categories";
import type { PieceCounts, SessionMaterial } from "../../../lib/achievements/material";
import { PIECES, type Piece } from "../../../lib/achievements/pieces";
import type { Turn } from "../../../lib/engineAnalysis";
import { PieceIcon } from "../GradedLines";

/** One position of the session, as the report lists it. */
export type AccuracyReportRow = {
  /** Its place in the session, 0 the first — what `onOpen` is called with. */
  index: number;
  moveNumber: number;
  turn: Turn;
  /** The game's move there. */
  playedSan: string;
  /** The engine's best moves there — its top N, best first. */
  best: readonly string[];
  /** What the reader suggested, in SAN. */
  suggestions: readonly string[];
  /** `null` while the position is still to be answered. */
  grade: PositionGrade | null;
};

export type AccuracySessionReportProps = {
  summary: SessionSummary;
  rows: readonly AccuracyReportRow[];
  /**
   * The session's achievements (CTA-249, `materialOf`) — the material per
   * category and the count of each piece, a table under the measures.
   * Absent, none.
   */
  material?: SessionMaterial;
  /** Back to a position — its row's move is a button. */
  onOpen: (index: number) => void;
  /**
   * The root; the measures `-measures` (each value `-measures-<measure>`),
   * the achievements `-achievements` (a row `-achievements-row-<category>`,
   * the whole `-achievements-row-total`),
   * the table `-table` (a row `-table-row-<index>`, its button `-open-<index>`,
   * its result `-result-<index>`).
   */
  testId: string;
};

type Column = "move" | "game" | "best" | "yours" | "found" | "loss" | "result";

/** A row of the achievements table: a category's pieces and material, or every category's. */
type MaterialRow = { id: AchievementCategoryId | "total"; counts: PieceCounts; material: number };
type MaterialColumn = "category" | Piece | "material";

/** A move number as a PGN writes it: `12.` for White, `12…` for Black. */
const moveLabelOf = (row: Pick<AccuracyReportRow, "moveNumber" | "turn">) => `${row.moveNumber}${row.turn === "w" ? "." : "…"}`;

/** A position's result as a chip: its words' key and its tone. */
const resultOf = (grade: PositionGrade): { key: string; tone: LabelChipTone } | null => {
  if (grade.passed) return null;
  if (grade.target > 0 && grade.inPlace === grade.target) return { key: "accuracyTrainer.report.perfectMark", tone: "success" };
  if (grade.bestFound) return { key: "accuracyTrainer.lines.best", tone: "success" };
  if (grade.worstVerdict === "blunder") return { key: "computerAnalysis.verdicts.blunder", tone: "error" };
  if (grade.worstVerdict !== null) return { key: `computerAnalysis.verdicts.${grade.worstVerdict}`, tone: "warning" };
  if (grade.bestLoss === null) return { key: "accuracyTrainer.report.outside", tone: "secondary" };
  return { key: "accuracyTrainer.lines.good", tone: "info" };
};

/**
 * **An Accuracy Trainer session's summary** (CTA-238): the measures —
 * positions answered and passed, **the best moves found and how many in
 * their place** (over every best move there was to find), the positions done
 * perfectly (every one found, in order), how often the best move was found,
 * the average loss of the reader's best move (where it is known), and every
 * move's inaccuracies, mistakes, blunders and moves not among the lines —
 * then **every position** in game order: its move, the game's move, the
 * engine's top N (hidden for a pass — put off for later), the reader's moves in their order, found / in place, the
 * best one's loss and a result (Perfect, Best, the worst verdict, Good,
 * Outside, or Passed). Each position's move is a button back to it. With
 * `material` (CTA-249), **the achievements** between the two: each
 * category's pieces counted and its material (Pawn 1, Knight 3, Bishop 3,
 * Rook 5, Queen 9), and every category's together.
 *
 * Presentational: the summary and the rows are props
 * (`lib/accuracyTrainer.ts`'s `sessionSummaryOf`). Its words are
 * `accuracyTrainer.report.*`.
 */
function AccuracySessionReport({ summary, material, rows, onOpen, testId }: AccuracySessionReportProps) {
  const { t } = useTranslation();

  const rate = (value: number | null, count: number) => share(value, count, summary.positions);
  /** A share as "57% (4 of 7)". */
  function share(value: number | null, count: number, total: number) {
    return value === null ? "–" : t("accuracyTrainer.report.rate", { percent: Math.round(value * 100), count, total });
  }

  const measures: KeyValueRow[] = [
    { id: "positions", label: t("accuracyTrainer.report.positions"), value: summary.positions, dir: "ltr" },
    { id: "answered", label: t("accuracyTrainer.report.answered"), value: summary.answered, dir: "ltr" },
    { id: "passed", label: t("accuracyTrainer.report.passed"), value: summary.passed, dir: "ltr" },
    { id: "foundRate", label: t("accuracyTrainer.report.foundRate"), value: share(summary.foundRate, summary.found, summary.wanted) },
    { id: "inPlaceRate", label: t("accuracyTrainer.report.inPlaceRate"), value: share(summary.inPlaceRate, summary.inPlace, summary.wanted) },
    { id: "perfect", label: t("accuracyTrainer.report.perfect"), value: summary.perfect, dir: "ltr" },
    { id: "bestRate", label: t("accuracyTrainer.report.bestRate"), value: rate(summary.bestRate, summary.bestFound) },
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
      {
        id: "best",
        header: t("accuracyTrainer.report.best"),
        dir: "ltr",
        wrap: true,
        // A pass is put off for later: its best moves stay hidden until it is answered.
        render: (row) => (row.best.length === 0 || row.grade?.passed === true ? "–" : row.best.join(", ")),
      },
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
      {
        id: "found",
        header: t("accuracyTrainer.report.found"),
        align: "end",
        dir: "ltr",
        cellTestId: (row) => `${testId}-found-${row.index}`,
        render: (row) => (row.grade === null || row.grade.passed || row.grade.target === 0 ? "–" : t("accuracyTrainer.report.foundOf", { found: row.grade.found, count: row.grade.target, inPlace: row.grade.inPlace })),
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

  const materialRows = useMemo<MaterialRow[]>(
    () =>
      material === undefined
        ? []
        : [
            ...material.categories.map((each): MaterialRow => ({ id: each.category, counts: each.counts, material: each.material })),
            { id: "total", counts: material.counts, material: material.material },
          ],
    [material],
  );
  const materialColumns = useMemo<DataTableColumn<MaterialRow, MaterialColumn>[]>(
    () => [
      {
        id: "category",
        header: t("accuracyTrainer.achievements.category"),
        rowHeader: true,
        render: (row) => (row.id === "total" ? t("accuracyTrainer.achievements.total") : t(`accuracyTrainer.achievements.categories.${row.id}`)),
      },
      ...PIECES.map((piece): DataTableColumn<MaterialRow, MaterialColumn> => ({
        id: piece,
        header: (
          <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
            <PieceIcon piece={piece} size={18} />
            {t(`accuracyTrainer.achievements.pieces.${piece}`)}
          </Box>
        ),
        align: "end",
        dir: "ltr",
        render: (row) => row.counts[piece],
      })),
      { id: "material", header: t("accuracyTrainer.achievements.material"), align: "end", dir: "ltr", render: (row) => row.material },
    ],
    [t],
  );

  return (
    <Box component="section" aria-labelledby={`${testId}-title`} data-testid={testId} sx={{ display: "grid", gap: 1.5 }}>
      <Typography id={`${testId}-title`} component="h3" variant="subtitle2" sx={{ fontWeight: 700 }}>
        {t("accuracyTrainer.report.title")}
      </Typography>
      <KeyValueList rows={measures} ariaLabel={t("accuracyTrainer.report.measures")} testId={`${testId}-measures`} />
      {material !== undefined && (
        <>
          <Typography id={`${testId}-achievements-title`} component="h4" variant="subtitle2" sx={{ fontWeight: 700 }}>
            {t("accuracyTrainer.achievements.title")}
          </Typography>
          <DataTable<MaterialRow, MaterialColumn>
            columns={materialColumns}
            rows={materialRows}
            rowId={(row) => row.id}
            stickyHeader={false}
            density="dense"
            // Every category's together closes the table, apart.
            groupEnd={(_, next) => next?.id === "total"}
            emptyLabel={t("accuracyTrainer.achievements.empty")}
            ariaLabel={t("accuracyTrainer.achievements.table")}
            testId={`${testId}-achievements`}
          />
        </>
      )}
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
