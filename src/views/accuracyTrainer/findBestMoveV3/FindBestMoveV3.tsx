import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import type { ChessboardOptions } from "react-chessboard";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router";

import { AccuracySessionReport, AccuracyTrainerDetails, GradedLines, type AccuracyTrainerDetailsTab } from "../../../blocks/panels";
import { StatusText } from "../../../design-system/components/feedback";
import type { SideValue } from "../../../design-system/components/forms";
import { LabelChip } from "../../../design-system/components/tables";
import { IconAction } from "../../../design-system/components/toolbars";
import { useChessTokens } from "../../../design-system/theme";
import { bareSan, moveSquaresOf } from "../../../lib/accuracyTrainer";
import { casePath } from "../../analysisV2/paths";
import type { BoardPanelTab } from "../../board/core/BoardPanel";
import BoardShell from "../../board/core/BoardShell";
import { useVariationsExplorer } from "../../explorer/useVariationsExplorer";
import { BoardLeftPanel } from "../../main/boardLeftPanel";
import { usePageTitle } from "../../main/pageTitle";
import { useShellCompact } from "../../main/shellCompact";
import SessionSetup, { type SessionSource } from "./SessionSetup";
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
 * (the setup, then Moves · Map · Result · Summary, the footer's Pass / Choose
 * or Next) and the left one (`AccuracyTrainerDetails`: the game, its Case,
 * Settings). At each position the board shows every move before it and none
 * after; **Choose** takes the line on screen's first move from the position.
 */
function FindBestMoveV3() {
  const { t } = useTranslation();
  const { drawing } = useChessTokens();
  const run = useFindBestMoveSession();
  const { core, session, position, grade, settings } = run;

  const [source, setSource] = useState<SessionSource | null>(null);
  const [side, setSide] = useState<SideValue>("all");
  const [tab, setTab] = useState<Tab>("moves");
  const [detailsTab, setDetailsTab] = useState<AccuracyTrainerDetailsTab>("settings");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const compact = useShellCompact();

  usePageTitle(source?.name);

  const explorer = useVariationsExplorer({
    testId: ID,
    source: core,
    onEditTree: core.replaceTree,
    playChances: false,
    annotations: true,
    arrows: { show: settings.showArrows },
    map: { linked: true },
  });

  // Once graded, on the position itself: line 1 in green, a different choice in red, over the reader's own arrows.
  const arrows = useMemo(() => {
    const best = position?.lines[0];
    if (position === undefined || best === undefined || grade === null || session === null || core.nodeId !== session.view.nodeId) {
      return explorer.arrows;
    }
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
  }, [position, grade, session, core.nodeId, explorer.arrows, drawing]);
  const boardOptions = useMemo<ChessboardOptions>(() => ({ ...explorer.boardOptions, arrows }), [explorer.boardOptions, arrows]);

  const answer = (moves: "pass" | string) => {
    if (moves === "pass") run.pass();
    else run.choose(moves);
    setTab("result");
  };
  const next = () => setTab(run.next() ? "moves" : "summary");
  const reset = () => {
    run.reset();
    setTab("moves");
  };

  const sideLabel = (turn: "w" | "b") => t(turn === "w" ? "accuracyTrainer.position.white" : "accuracyTrainer.position.black");

  const tabs: BoardPanelTab[] =
    session === null || position === undefined
      ? [
          {
            id: "moves",
            label: t("accuracyTrainer.position.train"),
            content: (
              <SessionSetup
                source={source}
                onSource={setSource}
                engine={settings.engine}
                side={side}
                onSide={setSide}
                onStart={() => {
                  if (source !== null) void run.start(source, side);
                }}
                starting={run.starting}
                {...(run.startProblem === undefined ? {} : { problem: run.startProblem })}
              />
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
                {grade !== null && <GradedLines position={position} grade={grade} testId={`${ID}-graded`} />}
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
    </Box>
  );

  const footer = session !== null && (
    <>
      {explorer.annotations}
      {activeTab === "moves" && explorer.nextMoves}
      {run.answering && (
        <Typography variant="caption" component="p" sx={{ color: "text.secondary", px: 1, m: 0 }}>
          {t("accuracyTrainer.session.instructions")}
        </Typography>
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
            <Button variant="outlined" onClick={() => answer("pass")} data-testid={`${ID}-pass`}>
              {t("accuracyTrainer.position.pass")}
            </Button>
            <Button
              variant="contained"
              onClick={() => run.candidate !== undefined && answer(run.candidate)}
              disabled={run.candidate === undefined}
              data-testid={`${ID}-choose`}
            >
              {run.candidate === undefined ? (
                t("accuracyTrainer.session.chooseNone")
              ) : (
                <>
                  {t("accuracyTrainer.session.choose")}{" "}
                  <Box component="span" dir="ltr" sx={{ marginInlineStart: 0.5 }}>
                    {run.candidate}
                  </Box>
                </>
              )}
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

  const title = source?.name ?? t("pages.findBestMoveV3");

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
          showArrows={settings.showArrows}
          onShowArrowsChange={(showArrows) => run.setSettings((current) => ({ ...current, showArrows }))}
          engine={{
            on: settings.engine,
            onChange: (engine) => run.setSettings((current) => ({ ...current, engine })),
            lines: settings.lines,
            onLinesChange: (lines) => run.setSettings((current) => ({ ...current, lines })),
          }}
          {...(session === null ? {} : { caseLink: { component: RouterLink, to: casePath(session.caseRef.projectId, session.caseRef.caseId) } })}
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
