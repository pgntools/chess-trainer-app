import { useMemo } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { SwitchField } from "../../../design-system/components/forms";
import type { LinkTarget } from "../../../design-system/components/link";
import { KeyValueList } from "../../../design-system/components/lists";
import { LabelChip, type LabelChipTone } from "../../../design-system/components/tables";
import { DataTable, type DataTableColumn, type DataTablePaging } from "../../../design-system/patterns/tables";
import { formatScore } from "../../../lib/engineAnalysis";
import {
  isFlagged,
  REPERTOIRE_VERDICTS,
  scoreForSide,
  type RepertoireEvaluationReport as Report,
  type RepertoireReportMove,
  type RepertoireVerdict,
} from "../../../lib/jobs/kinds/repertoireEvaluation/core";

export type RepertoireEvaluationReportProps = {
  /** The report (`reportOf`, or a data output read back with `parseRepertoireEvaluationReport`). */
  report: Report;
  /**
   * Where a move opens — the repertoire at that move, its `?at=` the move's
   * `path` (`atParamOf`'s form). Absent, or `undefined` for a move, the move is text.
   */
  moveLink?: (move: RepertoireReportMove) => LinkTarget | undefined;
  /** The filter: only the flagged moves (inaccuracies, mistakes, blunders, missed mates). The screen's state. */
  flaggedOnly: boolean;
  onFlaggedOnlyChange: (flaggedOnly: boolean) => void;
  /** Absent, every move shows. */
  paging?: DataTablePaging;
  /**
   * The root. The summary `-summary` (each count `-summary-<verdict>`), the
   * progress `-progress`, the filter `-flagged-only`, the table `-table`
   * (its rows `-table-row-<move id>`, a move's link `-table-link-<move id>`,
   * its verdict `-verdict-<move id>`).
   */
  testId: string;
};

/** Each verdict's chip: its palette tone — none for a move not judged yet, which is words. */
const TONE: Readonly<Record<RepertoireVerdict, LabelChipTone | undefined>> = {
  blunder: "error",
  missedMate: "error",
  mistake: "warning",
  inaccuracy: "info",
  good: "success",
  pending: undefined,
};

type Column = "line" | "move" | "before" | "after" | "verdict" | "best";

/**
 * **A repertoire evaluation's report** (CTA-219, the Jobs module's
 * `repertoire.evaluation` kind's data output): the counts per verdict and how
 * many positions were evaluated, then a table of the repertoire's moves —
 * the line leading to each (and how many more reach the same position), the
 * move, the evaluation before and after it **from the repertoire's side**, its
 * verdict as a chip (blunder, missed mate, mistake, inaccuracy, good — the
 * tone never the only signal: the words are the chip), and the engine's best
 * move. Flagged moves come first, worst first, as the report orders them; a
 * switch keeps the flagged ones alone. Each move is a link where the screen
 * gives one (the repertoire opened at it).
 *
 * Presentational: the report, the filter and the links are props. Its words
 * are `jobs.kinds.repertoireEvaluation.report.*`.
 */
function RepertoireEvaluationReport({ report, moveLink, flaggedOnly, onFlaggedOnlyChange, paging, testId }: RepertoireEvaluationReportProps) {
  const { t } = useTranslation();
  const words = (key: string, options?: Record<string, unknown>) => t(`jobs.kinds.repertoireEvaluation.report.${key}`, options);
  const verdictWord = (move: Pick<RepertoireReportMove, "verdict" | "missedMateIn">) =>
    move.verdict === "missedMate" && move.missedMateIn !== undefined
      ? words("missedMateIn", { count: move.missedMateIn })
      : words(`verdicts.${move.verdict}`);
  const sideName = words(report.side === "b" ? "black" : "white");

  const rows = useMemo(
    () => (flaggedOnly ? report.moves.filter((move) => isFlagged(move.verdict)) : report.moves),
    [flaggedOnly, report.moves],
  );

  const score = (value: RepertoireReportMove["before"]) => (value === undefined ? "—" : formatScore(scoreForSide(value, report.side)));
  const columns: DataTableColumn<RepertoireReportMove, Column>[] = [
      {
        id: "line",
        header: words("line"),
        wrap: true,
        render: (move) => (
          <>
            <Box component="span" dir="ltr" sx={{ unicodeBidi: "isolate" }}>
              {move.line === "" ? words("start") : move.line}
            </Box>
            {move.otherPaths > 0 && (
              <Typography component="span" variant="caption" sx={{ display: "block", color: "text.secondary" }}>
                {words("otherPaths", { count: move.otherPaths })}
              </Typography>
            )}
          </>
        ),
      },
      { id: "move", header: words("move"), dir: "ltr", render: (move) => move.move },
      { id: "before", header: words("before"), align: "end", dir: "ltr", render: (move) => score(move.before) },
      { id: "after", header: words("after"), align: "end", dir: "ltr", render: (move) => score(move.after) },
      {
        id: "verdict",
        header: words("verdict"),
        cellTestId: (move) => `${testId}-verdict-${move.id}`,
        render: (move) => {
          const tone = TONE[move.verdict];
          return tone === undefined ? (
            <Typography component="span" variant="body2" sx={{ color: "text.secondary" }}>
              {verdictWord(move)}
            </Typography>
          ) : (
            <LabelChip label={verdictWord(move)} tone={tone} />
          );
        },
      },
      { id: "best", header: words("best"), dir: "ltr", render: (move) => move.bestSan ?? "" },
  ];

  const counted = REPERTOIRE_VERDICTS.filter((verdict) => verdict !== "pending" || report.counts.pending > 0);

  return (
    <Box data-testid={testId} sx={{ display: "grid", gap: 1.5, minWidth: 0 }}>
      <Box sx={{ display: "grid", gap: 0.5 }}>
        <Typography variant="subtitle2" component="h3">
          {words("summary")}
        </Typography>
        <KeyValueList
          rows={counted.map((verdict) => ({ id: verdict, label: words(`verdicts.${verdict}`), value: report.counts[verdict], dir: "ltr" }))}
          ariaLabel={words("summary")}
          testId={`${testId}-summary`}
        />
        <Typography variant="body2" sx={{ color: "text.secondary" }} data-testid={`${testId}-progress`}>
          {words("progress", { done: report.positions.done, total: report.positions.total })} {words("evalsFrom", { side: sideName })}
        </Typography>
      </Box>
      <SwitchField
        label={words("flaggedOnly")}
        help={words("flaggedOnlyHelp")}
        size="small"
        checked={flaggedOnly}
        onChange={onFlaggedOnlyChange}
        testId={`${testId}-flagged-only`}
      />
      <DataTable<RepertoireReportMove, Column>
        columns={columns}
        rows={rows}
        rowId={(move) => move.id}
        sorted
        paging={paging}
        density="dense"
        stickyHeader={false}
        {...(moveLink === undefined
          ? {}
          : {
              rowLink: moveLink,
              linkColumn: "move" as const,
              rowLinkLabel: (move: RepertoireReportMove) =>
                move.line === "" ? words("openFirstMove", { move: move.move }) : words("openMove", { move: move.move, line: move.line }),
            })}
        emptyLabel={words("empty")}
        noMatchLabel={words("noMatch")}
        filtered={flaggedOnly}
        ariaLabel={words("moves")}
        testId={`${testId}-table`}
      />
    </Box>
  );
}

export default RepertoireEvaluationReport;
