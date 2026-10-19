import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import type { ChessboardOptions } from "react-chessboard";
import { useTranslation } from "react-i18next";

import { AccuracySessionReport, GradedLines, type AccuracyReportRow } from "../../../blocks/panels";
import type { SideValue } from "../../../design-system/components/forms";
import { LabelChip } from "../../../design-system/components/tables";
import { useChessTokens } from "../../../design-system/theme";
import {
  bareSan,
  gradePosition,
  moveSquaresOf,
  sessionPositionsOf,
  sessionSummaryOf,
  type PositionGrade,
  type TrainingPosition,
} from "../../../lib/accuracyTrainer";
import { emptyTree, pathTo, type GameTree } from "../../../lib/gameTree";
import type { BoardPanelTab } from "../../board/core/BoardPanel";
import BoardShell from "../../board/core/BoardShell";
import { useBoardCore } from "../../board/core/useBoardCore";
import { useVariationsExplorer } from "../../explorer/useVariationsExplorer";
import { usePageTitle } from "../../main/pageTitle";
import AccuracySetup, { type AccuracySource } from "../AccuracySetup";

/**
 * A session: the positions it asks, where the reader is, the move chosen at
 * each (`[san]`, `[]` a pass, `null` not yet) and the reader's own analysis
 * at each — kept for the session, so a position revisited shows it again.
 */
type Session = {
  positions: readonly TrainingPosition[];
  index: number;
  answers: readonly (readonly string[] | null)[];
  trees: readonly (GameTree | null)[];
};

type Tab = "moves" | "map" | "result" | "summary";

const ID = "find-best-move-v2";

/** The side a position's board faces: its side to move. */
const facing = (position: TrainingPosition): "white" | "black" => (position.turn === "w" ? "white" : "black");

/**
 * **Find Best Move v2** — the Accuracy Trainer's second exercise (CTA-238),
 * experimental and **dev-only** (`routes.tsx`'s `devRoutes`, `navItems.ts`).
 * The reference is `.claude/rules/accuracy-trainer.md`.
 *
 * Its setup is v1's (`AccuracySetup`). At each position the board is **a
 * regular analysis board** over a tree of the reader's own that starts at the
 * position — none of the game's moves, lines or evals in it: they move both
 * sides, add side lines, comments and glyphs, as on a Case board (the
 * explorer with editing on — `onEditTree` — its move menu, comment block,
 * map and next-move arrows). Then, standing anywhere in a line, **Choose**
 * takes **that line's first move** as their answer (or Pass). The answer is
 * graded as v1 grades one suggestion (`gradePosition`), the engine's lines
 * revealed in the Result tab; Next goes on. Their analysis at each position
 * lives as long as the session; nothing is kept. No engine runs.
 */
function FindBestMoveV2() {
  const { t } = useTranslation();
  const { drawing } = useChessTokens();
  const core = useBoardCore();

  const [source, setSource] = useState<AccuracySource | null>(null);
  const [side, setSide] = useState<SideValue>("all");
  const [session, setSession] = useState<Session | null>(null);
  const [tab, setTab] = useState<Tab>("moves");

  usePageTitle(source?.name);

  const explorer = useVariationsExplorer({
    testId: ID,
    source: core,
    onEditTree: core.replaceTree,
    playChances: false,
    annotations: true,
    arrows: { show: true },
    map: { linked: true },
  });

  const position = session === null ? undefined : session.positions[session.index];
  const answer = session === null ? null : session.answers[session.index];
  const answering = position !== undefined && answer === null;

  const grades = useMemo(
    () =>
      session === null
        ? []
        : session.positions.map((each, index) => {
            const given = session.answers[index];
            return given === null ? null : gradePosition(each, given);
          }),
    [session],
  );
  const grade: PositionGrade | null = session === null ? null : grades[session.index];

  /** The move the reader would choose: the first move of the line on screen. */
  const candidate = pathTo(core.tree, core.nodeId)[0]?.san;

  /** The session with the board's tree kept as the position on screen's analysis. */
  const withBoardTree = (current: Session): Session => ({
    ...current,
    trees: current.trees.map((tree, index) => (index === current.index ? core.tree : tree)),
  });

  /** Show a position of the session — the reader's analysis there, else a fresh board at it. */
  const goTo = (index: number, current: Session) => {
    const next = current.positions[index];
    if (next === undefined) return;
    setSession({ ...current, index });
    core.loadTree(current.trees[index] ?? emptyTree(next.fen));
    core.setOrientation(facing(next));
  };

  const start = () => {
    if (source === null) return;
    const positions = sessionPositionsOf(source.positions, side === "all" ? "both" : side === "white" ? "w" : "b");
    if (positions.length === 0) return;
    setTab("moves");
    goTo(0, { positions, index: 0, answers: positions.map(() => null), trees: positions.map(() => null) });
  };

  const newSession = () => {
    setSession(null);
    setTab("moves");
    core.reset();
  };

  /** Answer the position on screen: the chosen move, or none — a pass. */
  const answerWith = (moves: readonly string[]) => {
    if (session === null) return;
    const kept = withBoardTree(session);
    setSession({ ...kept, answers: kept.answers.map((given, index) => (index === kept.index ? [...moves] : given)) });
    setTab("result");
  };

  const next = () => {
    if (session === null) return;
    const kept = withBoardTree(session);
    // The next position still to answer, else the summary.
    const later = kept.answers.findIndex((given, index) => index > kept.index && given === null);
    if (later >= 0) {
      setTab("moves");
      goTo(later, kept);
    } else {
      setSession(kept);
      setTab("summary");
    }
  };

  // Once graded, at the position itself: line 1 in green, a different choice in red over the reader's own arrows.
  const arrows = useMemo(() => {
    if (position === undefined || grade === null || core.nodeId !== null) return explorer.arrows;
    const arrowOf = (san: string, color: string) => {
      const squares = moveSquaresOf(position.fen, san);
      return squares === undefined ? [] : [{ startSquare: squares.from, endSquare: squares.to, color }];
    };
    const best = position.lines[0];
    const chosen = grade.suggestions[0];
    return [
      ...explorer.arrows,
      ...arrowOf(best.san, drawing.green),
      ...(chosen === undefined || bareSan(chosen.san) === bareSan(best.san) ? [] : arrowOf(chosen.san, drawing.red)),
    ];
  }, [position, grade, core.nodeId, explorer.arrows, drawing]);
  const boardOptions = useMemo<ChessboardOptions>(() => ({ ...explorer.boardOptions, arrows }), [explorer.boardOptions, arrows]);

  const reportRows = useMemo<AccuracyReportRow[]>(
    () =>
      session === null
        ? []
        : session.positions.map((each, index) => ({
            index,
            moveNumber: each.moveNumber,
            turn: each.turn,
            playedSan: each.playedSan,
            bestSan: each.lines[0].san,
            suggestions: session.answers[index] ?? [],
            grade: grades[index],
          })),
    [session, grades],
  );
  const summary = useMemo(() => sessionSummaryOf(grades.flatMap((each) => (each === null ? [] : [each]))), [grades]);

  const tabs: BoardPanelTab[] =
    session === null || position === undefined
      ? [
          {
            id: "moves",
            label: t("accuracyTrainer.position.train"),
            content: <AccuracySetup source={source} onSource={setSource} side={side} onSide={setSide} onStart={start} />,
          },
        ]
      : [
          { id: "moves", label: t("accuracyTrainer.v2.tabs.moves"), content: explorer.moves },
          { id: "map", label: t("accuracyTrainer.v2.tabs.map"), content: explorer.map },
          {
            id: "result",
            label: t("accuracyTrainer.v2.tabs.result"),
            disabled: grade === null,
            content:
              grade === null ? null : (
                <Box sx={{ p: 1 }}>
                  <GradedLines position={position} grade={grade} testId={`${ID}-graded`} />
                </Box>
              ),
          },
          {
            id: "summary",
            label: t("accuracyTrainer.position.summary"),
            content: (
              <Box sx={{ p: 1 }}>
                <AccuracySessionReport
                  summary={summary}
                  rows={reportRows}
                  onOpen={(index) => {
                    setTab("moves");
                    goTo(index, withBoardTree(session));
                  }}
                  testId={`${ID}-report`}
                />
              </Box>
            ),
          },
        ];
  // The tab on screen must be one the panel has: the setup has one.
  const activeTab: Tab = session === null ? "moves" : grade === null && tab === "result" ? "moves" : tab;

  const header = (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0, flexWrap: "wrap" }}>
      <Box title={t("accuracyTrainer.experimentalHint")}>
        <LabelChip label={t("accuracyTrainer.experimental")} tone="info" testId={`${ID}-experimental`} />
      </Box>
      {position !== undefined && session !== null && (
        <Typography variant="body2" data-testid={`${ID}-progress`} sx={{ fontWeight: 600, minWidth: 0 }}>
          {t("accuracyTrainer.position.progress", { at: session.index + 1, count: session.positions.length })}
          {" · "}
          <Box component="span" dir="ltr">{`${position.moveNumber}${position.turn === "w" ? "." : "…"}`}</Box>{" "}
          {t(position.turn === "w" ? "accuracyTrainer.position.white" : "accuracyTrainer.position.black")}
        </Typography>
      )}
    </Box>
  );

  const footer = session !== null && (
    <>
      {explorer.annotations}
      {activeTab === "moves" && explorer.nextMoves}
      {answering && (
        <Typography variant="caption" component="p" sx={{ color: "text.secondary", px: 1, m: 0 }}>
          {t("accuracyTrainer.v2.instructions")}
        </Typography>
      )}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 1, flexWrap: "wrap" }}>
        <Button size="small" onClick={newSession} data-testid={`${ID}-new-session`}>
          {t("accuracyTrainer.position.newSession")}
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        {answering ? (
          <>
            <Button variant="outlined" onClick={() => answerWith([])} data-testid={`${ID}-pass`}>
              {t("accuracyTrainer.position.pass")}
            </Button>
            <Button
              variant="contained"
              onClick={() => candidate !== undefined && answerWith([candidate])}
              disabled={candidate === undefined}
              data-testid={`${ID}-choose`}
            >
              {candidate === undefined ? (
                t("accuracyTrainer.v2.chooseNone")
              ) : (
                <>
                  {t("accuracyTrainer.v2.choose")}{" "}
                  <Box component="span" dir="ltr" sx={{ marginInlineStart: 0.5 }}>
                    {candidate}
                  </Box>
                </>
              )}
            </Button>
          </>
        ) : (
          <Button variant="contained" onClick={next} data-testid={`${ID}-next`}>
            {session.answers.some((given, index) => index > session.index && given === null)
              ? t("accuracyTrainer.position.next")
              : t("accuracyTrainer.position.summary")}
          </Button>
        )}
      </Box>
    </>
  );

  return (
    <BoardShell
      id={ID}
      core={core}
      showEvalBar={false}
      allowDragging={session !== null}
      boardOptions={boardOptions}
      overlay={explorer.overlay}
      panel={{
        testId: `${ID}-panel`,
        header,
        tabs,
        activeTab,
        onTabChange: (id) => setTab(id as Tab),
        footer,
      }}
    />
  );
}

export default FindBestMoveV2;
