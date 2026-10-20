import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import type { ChessboardOptions } from "react-chessboard";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate } from "react-router";

import { AccuracySessionReport, AccuracyTrainerDetails, GradedLines, type AccuracyTrainerDetailsTab } from "../../../blocks/panels";
import { InlineAlert, StatusText } from "../../../design-system/components/feedback";
import { BackButton } from "../../../design-system/components/navigation";
import { LabelChip } from "../../../design-system/components/tables";
import { IconAction } from "../../../design-system/components/toolbars";
import { useChessTokens } from "../../../design-system/theme";
import { bareSan, moveSquaresOf } from "../../../lib/accuracyTrainer";
import type { AnalysisCase } from "../../../lib/analysisProjects";
import { downloadPgn } from "../../../lib/pgnExport";
import { casePath } from "../../analysisV2/paths";
import type { BoardPanelTab } from "../../board/core/BoardPanel";
import BoardShell from "../../board/core/BoardShell";
import { useVariationsExplorer } from "../../explorer/useVariationsExplorer";
import { BoardLeftPanel } from "../../main/boardLeftPanel";
import { usePageTitle } from "../../main/pageTitle";
import { useShellCompact } from "../../main/shellCompact";
import { FIND_BEST_MOVE_V3_PATH } from "./paths";
import { useFindBestMoveSession } from "./useFindBestMoveSession";

type Tab = "moves" | "map" | "result" | "summary";

const ID = "find-best-move-v3";

/**
 * **Find Best Move v3** — the Accuracy Trainer's exercise (CTA-238),
 * experimental and **dev-only** (`routes.tsx`'s `devRoutes`, `navItems.ts`).
 * The reference is `.claude/rules/accuracy-trainer.md`.
 *
 * Composition alone: the session is `useFindBestMoveSession`'s, and this is
 * where its parts go — the board (`BoardShell` over the core, the explorer
 * with editing on: side lines, comments, glyphs, the map), the right panel
 * (Moves · Map · Result · Summary, the footer's moves so far
 * with Pass / Check, or Next) and the left one (`AccuracyTrainerDetails`: the
 * game, its Case, Your moves — the position the board stands at —, Results —
 * every position answered or passed, a way back to each — and Settings). At each position the board shows every move
 * before it and none after; the reader's lines from it are their moves, in
 * their order, and **Check** grades them against the top N. A **pass** is put
 * off for later and goes on at once: its lines stay hidden, and *Answer it
 * now* — on Your moves when the board is back at it — opens it again. On to
 * the next position, the game's moves between them play out on the board.
 *
 * **A session is its Case** (CTA-239): this screen is a session at its
 * address, resumed from its Case's PGN (`resume`, read once) — a new one is
 * started from the lobby's New session form. Its header leads back to the
 * sessions lobby and downloads the session's PGN; a Case that holds no
 * session says so.
 */
type FindBestMoveV3Props = {
  /** How long each of the game's moves between two positions stays on the board — a test's own (`STEP_DELAY_MS` to start with). */
  stepDelayMs?: number;
  /** The session's Case, to go on with. */
  resume: AnalysisCase;
};

function FindBestMoveV3({ stepDelayMs, resume }: FindBestMoveV3Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { drawing } = useChessTokens();
  const run = useFindBestMoveSession({ resume, ...(stepDelayMs === undefined ? {} : { stepDelayMs }) });
  const { core, session, position, grade, settings } = run;

  // A session resumed on a position already answered opens on its result.
  const [tab, setTab] = useState<Tab>(() => (run.answered !== null && run.answered.length > 0 ? "result" : "moves"));
  // A session opens on the reader's moves.
  const [detailsTab, setDetailsTab] = useState<AccuracyTrainerDetailsTab>("moves");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [downloadFailed, setDownloadFailed] = useState(false);
  const compact = useShellCompact();

  const gameName = session?.game || undefined;
  usePageTitle(gameName);

  const explorer = useVariationsExplorer({
    testId: ID,
    source: core,
    onEditTree: core.replaceTree,
    playChances: false,
    annotations: true,
    arrows: { show: settings.showArrows },
    map: { linked: true },
  });

  // Once graded, on the position itself: the top N in green, the reader's moves outside them in red, over the reader's own arrows.
  const arrows = useMemo(() => {
    // A pass is put off for later: no answer is drawn.
    if (position === undefined || grade === null || grade.passed || session === null || core.nodeId !== session.view.nodeId) return explorer.arrows;
    const arrowOf = (san: string, color: string) => {
      const squares = moveSquaresOf(position.fen, san);
      return squares === undefined ? [] : [{ startSquare: squares.from, endSquare: squares.to, color }];
    };
    const top = position.lines.slice(0, grade.target);
    const missed = grade.suggestions.filter((each) => !each.inTop && !top.some((line) => bareSan(line.san) === bareSan(each.san)));
    return [
      ...explorer.arrows,
      ...top.flatMap((line) => arrowOf(line.san, drawing.green)),
      ...missed.flatMap((each) => arrowOf(each.san, drawing.red)),
    ];
  }, [position, grade, session, core.nodeId, explorer.arrows, drawing]);
  const boardOptions = useMemo<ChessboardOptions>(() => ({ ...explorer.boardOptions, arrows }), [explorer.boardOptions, arrows]);

  const check = () => {
    run.check();
    setTab("result");
  };
  // A pass goes on at once — to the next position, or the summary after the last.
  const pass = () => setTab(run.pass() ? "moves" : "summary");
  const next = () => setTab(run.next() ? "moves" : "summary");
  // A new session is the lobby's form.
  const reset = () => navigate(FIND_BEST_MOVE_V3_PATH);
  const download = () => {
    if (run.pgn !== undefined) setDownloadFailed(!downloadPgn("find-best-move", [run.pgn]));
  };

  const sideLabel = (turn: "w" | "b") => t(turn === "w" ? "accuracyTrainer.position.white" : "accuracyTrainer.position.black");

  const tabs: BoardPanelTab[] =
    session === null || position === undefined
      ? [
          {
            id: "moves",
            label: t("accuracyTrainer.position.train"),
            content: (
              <Box sx={{ p: 1, display: "grid", gap: 1 }}>
                <InlineAlert severity="warning" testId={`${ID}-not-resumable`}>
                  {t("accuracyTrainer.sessions.notResumable")}
                </InlineAlert>
                <Box>
                  <Button component={RouterLink} to={casePath(resume.projectId, resume.id)} variant="outlined" size="small" data-testid={`${ID}-open-case`}>
                    {t("accuracyTrainer.sessions.openCase")}
                  </Button>
                </Box>
              </Box>
            ),
          },
        ]
      : [
          { id: "moves", label: t("accuracyTrainer.session.tabs.moves"), content: explorer.moves },
          { id: "map", label: t("accuracyTrainer.session.tabs.map"), content: explorer.map },
          {
            id: "result",
            label: t("accuracyTrainer.session.tabs.result"),
            disabled: run.answered === null,
            content: (
              <Box sx={{ p: 1, display: "grid", gap: 1 }}>
                {run.waiting && (
                  <StatusText tone="info" emphasis testId={`${ID}-evaluating`}>
                    {t("accuracyTrainer.session.engine.waiting")}
                  </StatusText>
                )}
                {run.engine?.kind === "unavailable" && (
                  <StatusText tone="warning" testId={`${ID}-engine-unavailable`}>
                    {t("accuracyTrainer.session.engine.unavailable")}
                  </StatusText>
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
                          run.answerAgain(session.index);
                          setTab("moves");
                        }}
                        data-testid={`${ID}-answer-again`}
                      >
                        {t("accuracyTrainer.details.answerAgain")}
                      </Button>
                    </Box>
                  </>
                )}
                {grade !== null && !grade.passed && <GradedLines position={position} grade={grade} testId={`${ID}-graded`} />}
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
                  rows={run.reportRows}
                  onOpen={(index) => {
                    run.open(index);
                    setTab("moves");
                  }}
                  testId={`${ID}-report`}
                />
              </Box>
            ),
          },
        ];
  // The tab on screen is one the panel has: the setup has one, and Result waits for an answer.
  const activeTab: Tab = session === null ? "moves" : run.answered === null && tab === "result" ? "moves" : tab;

  const header = (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0, flexWrap: "wrap" }}>
      {/* The way back to the sessions, first of all — where it is on every board screen. */}
      <BackButton
        label={t("accuracyTrainer.sessions.back")}
        link={{ component: RouterLink, to: FIND_BEST_MOVE_V3_PATH }}
        edge={false}
        testId={`${ID}-back`}
      />
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
          <Box component="span" dir="ltr">{`${position.moveNumber}${position.turn === "w" ? "." : "…"}`}</Box> {sideLabel(position.turn)}
        </Typography>
      )}
      {session !== null && (
        <>
          <Box sx={{ flexGrow: 1 }} />
          <IconAction label={t("accuracyTrainer.sessions.download")} onClick={download} testId={`${ID}-download`}>
            <DownloadRoundedIcon fontSize="small" />
          </IconAction>
        </>
      )}
    </Box>
  );

  const footer = session !== null && (
    <>
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
            {t("accuracyTrainer.session.instructions", { count: run.wanted })}
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
      {run.answering && run.engine?.kind === "pending" && (
        <Box sx={{ px: 1 }}>
          <StatusText tone="info" testId={`${ID}-engine-searching`}>
            {t("accuracyTrainer.session.engine.searching")}
          </StatusText>
        </Box>
      )}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 1, flexWrap: "wrap" }}>
        <Button size="small" onClick={reset} data-testid={`${ID}-new-session`}>
          {t("accuracyTrainer.position.newSession")}
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        {run.answering ? (
          <>
            <Button variant="outlined" onClick={pass} data-testid={`${ID}-pass`}>
              {t("accuracyTrainer.position.pass")}
            </Button>
            <Button variant="contained" onClick={check} disabled={run.candidates.length === 0} data-testid={`${ID}-check`}>
              {t("accuracyTrainer.session.check", { count: run.candidates.length })}
            </Button>
          </>
        ) : (
          <Button variant="contained" onClick={next} data-testid={`${ID}-next`}>
            {run.hasNext ? t("accuracyTrainer.position.next") : t("accuracyTrainer.position.summary")}
          </Button>
        )}
      </Box>
    </>
  );

  const title = gameName ?? t("pages.findBestMoveV3");

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
          movesToFind={run.wanted}
          onMovesToFindChange={(moves) => run.setSettings((current) => ({ ...current, moves }))}
          movesLocked={session !== null}
          showArrows={settings.showArrows}
          onShowArrowsChange={(showArrows) => run.setSettings((current) => ({ ...current, showArrows }))}
          engine={settings.engine}
          onEngineChange={(engine) => run.setSettings((current) => ({ ...current, engine }))}
          {...(session === null
            ? {}
            : {
                caseLink: { component: RouterLink, to: casePath(session.caseRef.projectId, session.caseRef.caseId) },
                ...(run.shownMoves === undefined ? {} : { moves: run.shownMoves }),
                results: {
                  rows: run.results,
                  // A passed one to answer on the board, Moves; an answered one's result, Result.
                  onOpen: (index: number) => setTab(run.openResult(index) === "answer" ? "moves" : "result"),
                },
              })}
          testId={`${ID}-details`}
        />
      </BoardLeftPanel>
      <BoardShell
        id={ID}
        core={{ ...core, ...run.board }}
        showEvalBar={false}
        allowDragging={run.canMove}
        boardOptions={boardOptions}
        overlay={explorer.overlay}
        panel={{ testId: `${ID}-panel`, header, tabs, activeTab, onTabChange: (id) => setTab(id as Tab), footer }}
      />
    </>
  );
}

export default FindBestMoveV3;
