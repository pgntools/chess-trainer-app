import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import type { ChessboardOptions } from "react-chessboard";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate } from "react-router";

import { AccuracySessionReport, AccuracyTrainerDetails, GradedLines, type AccuracyTrainerDetailsTab } from "../../../blocks/panels";
import { ConfirmDialog } from "../../../design-system/components/dialogs";
import { InlineAlert, StatusText } from "../../../design-system/components/feedback";
import { BackButton } from "../../../design-system/components/navigation";
import { LabelChip } from "../../../design-system/components/tables";
import { IconAction } from "../../../design-system/components/toolbars";
import { useChessTokens } from "../../../design-system/theme";
import { bareSan, moveSquaresOf } from "../../../lib/accuracyTrainer";
import type { AnalysisCase } from "../../../lib/analysisProjects";
import type { FindBestMoveRecord } from "../../../lib/findBestMove/model";
import type { SessionIssue } from "../../../lib/findBestMove/pgn";
import type { AnswerWords } from "../../../lib/findBestMove/projection";
import type { SessionEvent } from "../../../lib/findBestMove/reducer";
import { downloadPgn } from "../../../lib/pgnExport";
import { casePath } from "../../analysisV2/paths";
import type { BoardPanelTab } from "../../board/core/BoardPanel";
import BoardShell from "../../board/core/BoardShell";
import { useVariationsExplorer } from "../../explorer/useVariationsExplorer";
import { BoardLeftPanel } from "../../main/boardLeftPanel";
import { usePageTitle } from "../../main/pageTitle";
import { useShellCompact } from "../../main/shellCompact";
import { distinctArrows } from "../../shared/nextMoveArrows";
import { FIND_BEST_MOVE_PATH } from "./paths";
import { useFindBestMove, type Landing } from "./useFindBestMove";

type Tab = "moves" | "map" | "result" | "summary";

const ID = "find-best-move-v4";

type FindBestMoveProps = {
  caseRecord: AnalysisCase;
  record: FindBestMoveRecord;
  issues: readonly SessionIssue[];
  dispatch: (events: readonly SessionEvent[]) => Promise<unknown>;
  words: AnswerWords;
  /** A write the browser refused — the screen stays as it was, and says so. */
  writeFailed: boolean;
  /** How long each of the game's moves between two positions stays on the board — a test's own (`STEP_DELAY_MS` to start with). */
  stepDelayMs?: number;
};

/**
 * **Find Best Move v4** — the Accuracy Trainer's exercise (CTA-238, rebuilt
 * in CTA-244), experimental and **dev-only** (`routes.tsx`'s `devRoutes`,
 * `navItems.ts`). The reference is `.claude/rules/accuracy-trainer.md`.
 *
 * Composition alone: the session is `useFindBestMove`'s (its units over the
 * pure record, `lib/findBestMove/`), and this is where its parts go — the
 * board (`BoardShell` over the core, the explorer editing the position's own
 * lines alone), the right panel (Moves · Map · Result · Summary; the footer's
 * moves so far with Add move · Skip · Results · Next, or Next once answered)
 * and the left one (`AccuracyTrainerDetails`: the game, its Case, Your moves,
 * Results, Achievements and Settings).
 */
function FindBestMove({ caseRecord, record, issues, dispatch, words, writeFailed, stepDelayMs }: FindBestMoveProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { drawing } = useChessTokens();
  const run = useFindBestMove({ caseRecord, record, issues, dispatch, words, ...(stepDelayMs === undefined ? {} : { stepDelayMs }) });
  const { core, board, position, grade } = run;

  // A session resumed on a position already answered opens on its result.
  const [tab, setTab] = useState<Tab>(() => (run.answered ? "result" : "moves"));
  const [detailsTab, setDetailsTab] = useState<AccuracyTrainerDetailsTab>("moves");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [downloadFailed, setDownloadFailed] = useState(false);
  // A read issue is said once, until it is closed.
  const [issueShown, setIssueShown] = useState(run.unreadPositions > 0);
  const compact = useShellCompact();

  const gameName = record.name || undefined;
  usePageTitle(gameName);

  const explorer = useVariationsExplorer({
    testId: ID,
    source: core,
    onEditTree: core.replaceTree,
    // Only the position's own lines are the reader's (S5): the session's moves are never theirs to edit.
    editableAt: board.editableAt,
    playChances: false,
    annotations: true,
    arrows: { show: record.settings.arrows },
    map: { linked: true },
  });

  // Once graded, on the position itself: the top N in green, the reader's moves outside them in red, over the reader's own arrows.
  // One arrow to a pair of squares (`distinctArrows`): a move of the reader's that is also graded keeps its grade's colour.
  const arrows = useMemo(() => {
    // A skip is put off for later: no answer is drawn.
    if (position === undefined || grade === null || grade.passed || core.nodeId !== board.positionNodeId) return distinctArrows(explorer.arrows);
    const arrowOf = (san: string, color: string) => {
      const squares = moveSquaresOf(position.fen, san);
      return squares === undefined ? [] : [{ startSquare: squares.from, endSquare: squares.to, color }];
    };
    const top = position.lines.slice(0, grade.target);
    const missed = grade.suggestions.filter((each) => !each.inTop && !top.some((line) => bareSan(line.san) === bareSan(each.san)));
    // Green last: two moves to the same squares (a pawn's promotions) show the top one.
    return distinctArrows([...explorer.arrows, ...missed.flatMap((each) => arrowOf(each.san, drawing.red)), ...top.flatMap((line) => arrowOf(line.san, drawing.green))]);
  }, [position, grade, core.nodeId, board.positionNodeId, explorer.arrows, drawing]);
  const boardOptions = useMemo<ChessboardOptions>(() => ({ ...explorer.boardOptions, arrows }), [explorer.boardOptions, arrows]);

  const land = (landing: Landing) => setTab(landing);
  const download = () => setDownloadFailed(!downloadPgn("find-best-move", [run.pgn()]));

  const tabs: BoardPanelTab[] = [
    { id: "moves", label: t("accuracyTrainer.session.tabs.moves"), content: explorer.moves },
    { id: "map", label: t("accuracyTrainer.session.tabs.map"), content: explorer.map },
    {
      id: "result",
      label: t("accuracyTrainer.session.tabs.result"),
      disabled: !run.answered,
      content: (
        <Box sx={{ p: 1, display: "grid", gap: 1 }}>
          {run.waiting && (
            <StatusText tone="info" emphasis testId={`${ID}-evaluating`}>
              {t("accuracyTrainer.session.engine.waiting")}
            </StatusText>
          )}
          {(run.engineFailed || run.engineRetry) && (
            <StatusText tone="warning" testId={`${ID}-engine-unavailable`}>
              {t(run.engineFailed ? "accuracyTrainer.session.engine.unavailable" : "accuracyTrainer.session.engine.notAsked")}
            </StatusText>
          )}
          {run.engineRetry && (
            // Graded without its engine (CTA-250): asked once more, a new Evaluate Position job.
            <Box>
              <Button variant="outlined" size="small" onClick={() => run.evaluateAgain(run.key)} data-testid={`${ID}-evaluate-again`}>
                {t("accuracyTrainer.session.engine.evaluateAgain")}
              </Button>
            </Box>
          )}
          {grade !== null && grade.passed && (
            <>
              <StatusText tone="neutral" emphasis testId={`${ID}-passed`}>
                {t("accuracyTrainer.session.passed")}
              </StatusText>
              <Box>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    run.answerAgain(run.key);
                    setTab("moves");
                  }}
                  data-testid={`${ID}-answer-again`}
                >
                  {t("accuracyTrainer.details.answerAgain")}
                </Button>
              </Box>
            </>
          )}
          {grade !== null && !grade.passed && position !== undefined && <GradedLines position={position} grade={grade} testId={`${ID}-graded`} />}
        </Box>
      ),
    },
    {
      id: "summary",
      label: t("accuracyTrainer.position.summary"),
      content: (
        <Box sx={{ p: 1 }}>
          <AccuracySessionReport
            summary={run.summary}
            material={run.material}
            rows={run.reportRows}
            onOpen={(key) => {
              run.open(key);
              setTab("moves");
            }}
            testId={`${ID}-report`}
          />
        </Box>
      ),
    },
  ];
  // The tab on screen is one the panel has: Result waits for an answer.
  const activeTab: Tab = !run.answered && tab === "result" ? "moves" : tab;

  const header = (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0, flexWrap: "wrap" }}>
      {/* The way back to the sessions, first of all — where it is on every board screen. */}
      <BackButton label={t("accuracyTrainer.sessions.back")} link={{ component: RouterLink, to: FIND_BEST_MOVE_PATH }} edge={false} testId={`${ID}-back`} />
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
      {position !== undefined && (
        <Typography variant="body2" data-testid={`${ID}-progress`} sx={{ fontWeight: 600, minWidth: 0 }}>
          {t("accuracyTrainer.position.progress", { at: run.place, count: record.keys.length })}
          {" · "}
          <Box component="span" dir="ltr">{`${position.moveNumber}${position.turn === "w" ? "." : "…"}`}</Box> {run.sideOf(run.key)}
        </Typography>
      )}
      <Box sx={{ flexGrow: 1 }} />
      {/* A new session is the lobby's form. */}
      <IconAction label={t("accuracyTrainer.position.newSession")} onClick={() => navigate(FIND_BEST_MOVE_PATH)} testId={`${ID}-new-session`}>
        <RestartAltRoundedIcon fontSize="small" />
      </IconAction>
      <IconAction label={t("accuracyTrainer.sessions.download")} onClick={download} testId={`${ID}-download`}>
        <DownloadRoundedIcon fontSize="small" />
      </IconAction>
    </Box>
  );

  const footer = (
    <>
      {issueShown && (
        <Box sx={{ px: 1 }}>
          <InlineAlert severity="warning" onClose={() => setIssueShown(false)} testId={`${ID}-read-issue`}>
            {t("accuracyTrainer.sessions.readIssue", { count: run.unreadPositions })}
          </InlineAlert>
        </Box>
      )}
      {writeFailed && (
        <Box sx={{ px: 1 }}>
          <InlineAlert severity="error" testId={`${ID}-write-problem`}>
            {t("accuracyTrainer.sessions.writeProblem")}
          </InlineAlert>
        </Box>
      )}
      {downloadFailed && (
        <Box sx={{ px: 1 }}>
          <InlineAlert severity="error" testId={`${ID}-download-problem`}>
            {t("accuracyTrainer.sessions.downloadProblem")}
          </InlineAlert>
        </Box>
      )}
      {explorer.annotations}
      {activeTab === "moves" && explorer.nextMoves}
      {run.answering && (
        <Box sx={{ px: 1, display: "grid", gap: 0.5 }}>
          <Typography variant="caption" component="p" sx={{ color: "text.secondary", m: 0 }}>
            {t("accuracyTrainer.session.instructions", { count: record.wanted })}
          </Typography>
          <Typography variant="body2" component="p" data-testid={`${ID}-candidates`} sx={{ m: 0 }}>
            <Box component="span" sx={{ fontWeight: 600 }}>
              {t("accuracyTrainer.session.candidates")}
            </Box>{" "}
            {run.candidates.length === 0 ? (
              <Box component="span" sx={{ color: "text.secondary" }}>
                {t("accuracyTrainer.session.noCandidates")}
              </Box>
            ) : (
              <Box component="span" dir="ltr">
                {run.candidates.map((san, index) => `${index + 1}. ${san}`).join("  ")}
              </Box>
            )}
          </Typography>
        </Box>
      )}
      {run.searching && (
        <Box sx={{ px: 1 }}>
          <StatusText tone="info" testId={`${ID}-engine-searching`}>
            {t("accuracyTrainer.session.engine.searching")}
          </StatusText>
        </Box>
      )}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 1, flexWrap: "wrap" }}>
        {run.answering ? (
          <>
            {/* Back to the position, so the next move played there is a new line. */}
            <Button variant="outlined" size="small" onClick={board.newMove} disabled={board.onPosition} data-testid={`${ID}-add-move`}>
              {t("accuracyTrainer.session.addMove")}
            </Button>
            <Box sx={{ flexGrow: 1 }} />
            <Button variant="outlined" onClick={() => land(run.pass())} data-testid={`${ID}-pass`}>
              {t("accuracyTrainer.position.pass")}
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                run.check();
                setTab("result");
              }}
              disabled={run.candidates.length === 0}
              data-testid={`${ID}-check`}
            >
              {t("accuracyTrainer.session.check", { count: run.candidates.length })}
            </Button>
            <Button variant="contained" onClick={() => land(run.checkAndNext())} disabled={run.candidates.length === 0} data-testid={`${ID}-check-next`}>
              {t("accuracyTrainer.position.next")}
            </Button>
          </>
        ) : (
          <>
            <Box sx={{ flexGrow: 1 }} />
            <Button variant="contained" onClick={() => land(run.next())} data-testid={`${ID}-next`}>
              {run.hasNext ? t("accuracyTrainer.position.next") : t("accuracyTrainer.position.summary")}
            </Button>
          </>
        )}
      </Box>
    </>
  );

  const title = gameName ?? t("pages.findBestMoveV4");

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
          movesToFind={record.wanted}
          // N is fixed for the session (R3).
          onMovesToFindChange={() => {}}
          movesLocked
          showArrows={record.settings.arrows}
          onShowArrowsChange={(arrowsOn) => run.changeArrows(arrowsOn)}
          engineStart={record.settings.engineStart}
          onEngineStartChange={run.changeEngineStart}
          caseLink={{ component: RouterLink, to: casePath(caseRecord.projectId, caseRecord.id) }}
          {...(run.shownMoves === undefined ? {} : { moves: run.shownMoves })}
          {...(run.shownAchievements === undefined ? {} : { achievements: run.shownAchievements })}
          results={{
            rows: run.results,
            // A passed one to answer on the board, Moves; an answered one's result, Result.
            onOpen: (key: number) => land(run.openResult(key)),
          }}
          testId={`${ID}-details`}
        />
      </BoardLeftPanel>
      <BoardShell
        id={ID}
        core={{ ...core, ...board.board }}
        showEvalBar={false}
        allowDragging={board.canMove}
        boardOptions={boardOptions}
        overlay={explorer.overlay}
        panel={{ testId: `${ID}-panel`, header, tabs, activeTab, onTabChange: (id) => setTab(id as Tab), footer }}
      />
      {/* A first move where the lines are too few, the engine off: turn it on for the session? (CTA-245) */}
      <ConfirmDialog
        open={board.engineOffer.open}
        onClose={board.engineOffer.decline}
        onConfirm={board.engineOffer.accept}
        title={t("accuracyTrainer.session.engine.offer.title")}
        message={t("accuracyTrainer.session.engine.offer.message")}
        confirmLabel={t("accuracyTrainer.session.engine.offer.confirm")}
        cancelLabel={t("accuracyTrainer.session.engine.offer.cancel")}
        testId={`${ID}-engine-offer`}
      />
    </>
  );
}

export default FindBestMove;
