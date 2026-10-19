import { useCallback, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import type { ChessboardOptions } from "react-chessboard";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router";

import {
  AccuracySessionReport,
  AccuracyTrainerDetails,
  GradedLines,
  type AccuracyReportRow,
  type AccuracyTrainerDetailsTab,
} from "../../../blocks/panels";
import { StatusText } from "../../../design-system/components/feedback";
import type { SideValue } from "../../../design-system/components/forms";
import { LabelChip } from "../../../design-system/components/tables";
import { IconAction } from "../../../design-system/components/toolbars";
import { useChessTokens } from "../../../design-system/theme";
import {
  bareSan,
  gradePosition,
  moveSquaresOf,
  needsEngine,
  sessionPositionsOf,
  sessionSummaryOf,
  trainingPositionsOf,
  withEngineResult,
  type PositionGrade,
  type TrainingPosition,
} from "../../../lib/accuracyTrainer";
import { saveCaseState } from "../../../lib/analysisCaseStore";
import { caseStateOf, DEFAULT_CASE_DISPLAY, type CaseState } from "../../../lib/analysisProjects";
import { sessionCaseTreeOf, type SessionPositionWork } from "../../../lib/findBestMoveSession";
import { emptyTree, pathTo, type GameTree } from "../../../lib/gameTree";
import { casePath } from "../../analysisV2/paths";
import type { BoardPanelTab } from "../../board/core/BoardPanel";
import BoardShell from "../../board/core/BoardShell";
import { useAutosave } from "../../board/core/useAutosave";
import { useBoardCore } from "../../board/core/useBoardCore";
import { useVariationsExplorer } from "../../explorer/useVariationsExplorer";
import { BoardLeftPanel } from "../../main/boardLeftPanel";
import { usePageTitle } from "../../main/pageTitle";
import { useShellCompact } from "../../main/shellCompact";
import AccuracySetup, { type AccuracySource } from "../AccuracySetup";
import { createSessionCase, type SessionCase } from "./sessionCase";
import { useEvaluatePositionJobs, type PositionEngineState } from "./useEvaluatePositionJobs";

/**
 * A session: the positions it asks, where the reader is, the move chosen at
 * each (`[san]`, `[]` a pass, `null` not yet), the reader's own analysis at
 * each, each one's Evaluate Position job (`null` none) — and its Case.
 */
type Session = {
  positions: readonly TrainingPosition[];
  index: number;
  answers: readonly (readonly string[] | null)[];
  trees: readonly (GameTree | null)[];
  jobs: readonly (string | null)[];
  case: SessionCase;
};

type Tab = "moves" | "map" | "result" | "summary";

const ID = "find-best-move-v2";

/** How many of the engine's lines a position needs, to start with. */
const DEFAULT_LINES = 3;

const NO_JOBS: readonly (string | null)[] = [];

/** The side a position's board faces: its side to move. */
const facing = (position: TrainingPosition): "white" | "black" => (position.turn === "w" ? "white" : "black");

/**
 * **Find Best Move v2** — the Accuracy Trainer's second exercise (CTA-238),
 * experimental and **dev-only** (`routes.tsx`'s `devRoutes`, `navItems.ts`).
 * The reference is `.claude/rules/accuracy-trainer.md` §6–§7.
 *
 * Its setup is v1's (`AccuracySetup`). At each position the board is **a
 * regular analysis board** over a tree of the reader's own that starts at the
 * position — none of the game's moves, lines or evals in it: they move both
 * sides, add side lines, comments and glyphs, as on a Case board (the
 * explorer with editing on). Then, standing anywhere in a line, **Choose**
 * takes **that line's first move** as their answer (or Pass), graded as v1
 * grades one suggestion; the Result tab reveals the lines; Next goes on.
 *
 * - **The session is a Case** (`sessionCase.ts`): made at Start in the one
 *   *Find Best Move* project, the game's mainline; then **autosaved** with
 *   every position's work — the reader's analysis, the engine's lines, the
 *   answer as a comment (`sessionCaseTreeOf`).
 * - **The engine** (the left panel's *Use the engine*, off to start): a
 *   position with fewer of the engine's top lines than *Lines needed* is
 *   searched — an **Evaluate Position job** on the Case
 *   (`useEvaluatePositionJobs`) — once the reader moves a piece there (or
 *   Chooses). With the engine on, a game with no engine lines is taken too.
 *   A Choose while its job searches **waits** for it, then grades against the
 *   tree's lines and the engine's (`withEngineResult`). The job writes its
 *   lines into the Case itself (its `merges`); the autosave carries the done
 *   jobs' ids, so it never writes the Case from before them.
 * - **Its own panel beside the board** (`AccuracyTrainerDetails`): the game's
 *   name and the session's Case, then **Settings** — the next-move arrows,
 *   the engine and the lines needed.
 */
function FindBestMoveV2() {
  const { t } = useTranslation();
  const { drawing } = useChessTokens();
  const core = useBoardCore();

  const [source, setSource] = useState<AccuracySource | null>(null);
  const [side, setSide] = useState<SideValue>("all");
  const [session, setSession] = useState<Session | null>(null);
  const [tab, setTab] = useState<Tab>("moves");
  const [detailsTab, setDetailsTab] = useState<AccuracyTrainerDetailsTab>("settings");
  const [showArrows, setShowArrows] = useState(true);
  const [useEngine, setUseEngine] = useState(false);
  const [lines, setLines] = useState(DEFAULT_LINES);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [startProblem, setStartProblem] = useState<string | null>(null);
  const starting = useRef(false);
  // The positions a job is being queued for — a second move before the first enqueue answers queues none.
  const queuing = useRef(new Set<string>());
  const compact = useShellCompact();

  usePageTitle(source?.name);

  const explorer = useVariationsExplorer({
    testId: ID,
    source: core,
    onEditTree: core.replaceTree,
    playChances: false,
    annotations: true,
    arrows: { show: showArrows },
    map: { linked: true },
  });

  const engineJobs = useEvaluatePositionJobs({ caseId: session?.case.caseId, lines, jobIds: session?.jobs ?? NO_JOBS });
  const engineAt = (index: number): PositionEngineState => engineJobs.states[index] ?? { kind: "none" };

  /** Each position with its engine search, once it has one. */
  const effective = useMemo(
    () =>
      session === null
        ? []
        : session.positions.map((each, index) => {
            const state = engineJobs.states[index];
            return state?.kind === "done" ? withEngineResult(each, state.result) : each;
          }),
    [session, engineJobs.states],
  );

  /** An answer whose position's search is still running — its grade waits for it. */
  const waitingAt = (index: number): boolean => {
    const given = session?.answers[index];
    return given !== null && given !== undefined && given.length > 0 && engineAt(index).kind === "pending";
  };

  const grades = useMemo(
    () =>
      session === null
        ? []
        : effective.map((each, index) => {
            const given = session.answers[index];
            if (given === null || (given.length > 0 && engineJobs.states[index]?.kind === "pending")) return null;
            return gradePosition(each, given);
          }),
    [session, effective, engineJobs.states],
  );

  const position = session === null ? undefined : effective[session.index];
  const answer = session === null ? null : session.answers[session.index];
  const answering = position !== undefined && answer === null;
  const grade: PositionGrade | null = session === null ? null : grades[session.index];
  const waiting = session !== null && waitingAt(session.index);

  /** The move the reader would choose: the first move of the line on screen. */
  const candidate = pathTo(core.tree, core.nodeId)[0]?.san;

  /** A position's move as a job's title and the live progress name it ("12. White"). */
  const labelOf = (each: TrainingPosition) =>
    t("accuracyTrainer.v2.moveLabel", {
      number: each.moveNumber,
      side: t(each.turn === "w" ? "accuracyTrainer.position.white" : "accuracyTrainer.position.black"),
    });

  /** Search a position with the engine — once, where the engine is on and its lines are fewer than needed. */
  const evaluateAt = (index: number) => {
    if (!useEngine || session === null || session.jobs[index] !== null) return;
    const target = effective[index];
    const key = `${session.case.caseId}:${index}`;
    if (target === undefined || !needsEngine(target, lines) || queuing.current.has(key)) return;
    queuing.current.add(key);
    const caseId = session.case.caseId;
    void engineJobs
      .evaluate(
        { fen: target.fen, path: target.path, label: labelOf(target) },
        t("accuracyTrainer.v2.jobTitle", { name: source?.name ?? "", move: labelOf(target) }),
      )
      .then((jobId) => {
        queuing.current.delete(key);
        if (jobId === undefined) return;
        setSession((current) =>
          current === null || current.case.caseId !== caseId
            ? current
            : { ...current, jobs: current.jobs.map((each, at) => (at === index ? jobId : each)) },
        );
      });
  };

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

  /** Start: the session's Case made, then its first position. */
  const start = async () => {
    if (source === null || starting.current) return;
    const positions = sessionPositionsOf(
      trainingPositionsOf(source.tree, { unevaluated: useEngine }),
      side === "all" ? "both" : side === "white" ? "w" : "b",
    );
    if (positions.length === 0) return;
    starting.current = true;
    setStartProblem(null);
    const made = await createSessionCase({
      tree: source.tree,
      projectName: t("accuracyTrainer.v2.projectName"),
      caseName: t("accuracyTrainer.v2.caseName", { name: source.name }),
    });
    starting.current = false;
    if (made === undefined) {
      setStartProblem(t("accuracyTrainer.v2.caseProblem"));
      return;
    }
    setTab("moves");
    goTo(0, {
      positions,
      index: 0,
      answers: positions.map(() => null),
      trees: positions.map(() => null),
      jobs: positions.map(() => null),
      case: made,
    });
  };

  const newSession = () => {
    setSession(null);
    setTab("moves");
    core.reset();
  };

  /** Answer the position on screen: the chosen move, or none — a pass. A choice its lines are too few for asks the engine. */
  const answerWith = (moves: readonly string[]) => {
    if (session === null) return;
    if (moves.length > 0) evaluateAt(session.index);
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

  // The reader's first move at a position starts its search: the drops and the promotion go through the core, then ask.
  const onPieceDrop: typeof core.onPieceDrop = (args) => {
    const accepted = core.onPieceDrop(args);
    if (accepted && session !== null && answering) evaluateAt(session.index);
    return accepted;
  };
  const resolvePromotion: typeof core.resolvePromotion = (piece) => {
    core.resolvePromotion(piece);
    if (piece !== null && session !== null && answering) evaluateAt(session.index);
  };

  /** A position's answer as the Case's comment says it. */
  const answerTextOf = (index: number): string | undefined => {
    const given = session?.answers[index];
    if (given === null || given === undefined) return undefined;
    if (given.length === 0) return t("accuracyTrainer.v2.answer.passed");
    const graded = grades[index]?.suggestions[0];
    if (graded === undefined) return t("accuracyTrainer.v2.answer.evaluating", { san: given[0] });
    if (graded.kind === "outside") {
      return t("accuracyTrainer.v2.answer.outside", { san: graded.san, count: effective[index]?.topCount ?? 0, loss: graded.lossAtLeast });
    }
    const verdict =
      graded.verdict !== null
        ? t(`computerAnalysis.verdicts.${graded.verdict}`)
        : t(graded.loss === 0 ? "accuracyTrainer.lines.best" : "accuracyTrainer.lines.good");
    return t("accuracyTrainer.v2.answer.line", { san: graded.san, verdict, loss: graded.loss });
  };

  // The session's Case, as it stands — rebuilt from the session, written on every change.
  const caseState = useMemo<CaseState | undefined>(() => {
    if (session === null) return undefined;
    const work = session.positions.map(
      (each, index): SessionPositionWork => {
        const analysis = index === session.index ? core.tree : session.trees[index];
        const state = engineJobs.states[index];
        const text = answerTextOf(index);
        return {
          path: each.path,
          ...(analysis === null ? {} : { analysis }),
          ...(state?.kind === "done" ? { engine: state.result } : {}),
          ...(text === undefined ? {} : { answer: text }),
        };
      },
    );
    return caseStateOf(sessionCaseTreeOf(session.case.base, work), null, "white", DEFAULT_CASE_DISPLAY, engineJobs.merges);
    // `answerTextOf` reads the session, the grades and the effective positions, all listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, core.tree, engineJobs.states, engineJobs.merges, grades, effective, t]);
  const caseId = session?.case.caseId;
  const saveCase = useCallback(
    (state: CaseState) => {
      if (caseId !== undefined) void saveCaseState(caseId, state);
    },
    [caseId],
  );
  useAutosave({ enabled: session !== null, record: caseState, save: saveCase });

  // Once graded, at the position itself: line 1 in green, a different choice in red over the reader's own arrows.
  const arrows = useMemo(() => {
    const best = position?.lines[0];
    if (position === undefined || best === undefined || grade === null || core.nodeId !== null) return explorer.arrows;
    const arrowOf = (san: string, color: string) => {
      const squares = moveSquaresOf(position.fen, san);
      return squares === undefined ? [] : [{ startSquare: squares.from, endSquare: squares.to, color }];
    };
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
        : effective.map((each, index) => ({
            index,
            moveNumber: each.moveNumber,
            turn: each.turn,
            playedSan: each.playedSan,
            bestSan: each.lines[0]?.san ?? "–",
            suggestions: session.answers[index] ?? [],
            grade: grades[index],
          })),
    [session, effective, grades],
  );
  const summary = useMemo(() => sessionSummaryOf(grades.flatMap((each) => (each === null ? [] : [each]))), [grades]);

  const engineState = session === null ? undefined : engineAt(session.index);
  const resultContent =
    position === undefined || answer === null ? null : (
      <Box sx={{ p: 1, display: "grid", gap: 1 }}>
        {waiting && (
          <StatusText tone="info" emphasis testId={`${ID}-evaluating`}>
            {t("accuracyTrainer.v2.engine.waiting")}
          </StatusText>
        )}
        {engineState?.kind === "unavailable" && (
          <StatusText tone="warning" testId={`${ID}-engine-unavailable`}>
            {t("accuracyTrainer.v2.engine.unavailable")}
          </StatusText>
        )}
        {grade !== null && <GradedLines position={position} grade={grade} testId={`${ID}-graded`} />}
      </Box>
    );

  const tabs: BoardPanelTab[] =
    session === null || position === undefined
      ? [
          {
            id: "moves",
            label: t("accuracyTrainer.position.train"),
            content: (
              <>
                <AccuracySetup
                  source={source}
                  onSource={setSource}
                  unevaluated={useEngine}
                  side={side}
                  onSide={setSide}
                  onStart={() => void start()}
                />
                {startProblem !== null && (
                  <Box sx={{ px: 1 }}>
                    <StatusText tone="error" testId={`${ID}-start-problem`}>
                      {startProblem}
                    </StatusText>
                  </Box>
                )}
              </>
            ),
          },
        ]
      : [
          { id: "moves", label: t("accuracyTrainer.v2.tabs.moves"), content: explorer.moves },
          { id: "map", label: t("accuracyTrainer.v2.tabs.map"), content: explorer.map },
          { id: "result", label: t("accuracyTrainer.v2.tabs.result"), disabled: answer === null, content: resultContent },
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
  const activeTab: Tab = session === null ? "moves" : answer === null && tab === "result" ? "moves" : tab;

  const header = (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0, flexWrap: "wrap" }}>
      {compact && (
        // Under the breakpoint the exercise's own panel is a drawer; wide, the board's own column.
        <IconAction
          label={t("accuracyTrainer.details.toggle")}
          onClick={() => setDrawerOpen(true)}
          popupOpen={drawerOpen}
          popupKind="dialog"
          testId={`${ID}-details-toggle`}
        >
          <TuneRoundedIcon fontSize="small" />
        </IconAction>
      )}
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
      {answering && engineState?.kind === "pending" && (
        <Box sx={{ px: 1 }}>
          <StatusText tone="info" testId={`${ID}-engine-searching`}>
            {t("accuracyTrainer.v2.engine.searching")}
          </StatusText>
        </Box>
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

  const title = source?.name ?? t("pages.findBestMoveV2");

  return (
    <>
      <BoardLeftPanel
        collapsed={false}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        drawerLabel={t("accuracyTrainer.details.label", { name: title })}
        keepShell
      >
        <AccuracyTrainerDetails
          title={title}
          tab={detailsTab}
          onTabChange={setDetailsTab}
          showArrows={showArrows}
          onShowArrowsChange={setShowArrows}
          engine={{ on: useEngine, onChange: setUseEngine, lines, onLinesChange: setLines }}
          {...(session === null ? {} : { caseLink: { component: RouterLink, to: casePath(session.case.projectId, session.case.caseId) } })}
          testId={`${ID}-details`}
        />
      </BoardLeftPanel>
      <BoardShell
        id={ID}
        core={{ ...core, onPieceDrop, resolvePromotion }}
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
    </>
  );
}

export default FindBestMoveV2;
