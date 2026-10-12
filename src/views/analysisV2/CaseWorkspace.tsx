import { useCallback, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { Link as RouterLink, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import type { ChessboardOptions } from "react-chessboard";

import { caseDisplayName } from "../../blocks/lists";
import { BoardEngineControls, CurrentOpening, EngineThinking, PgnExportPanel, PlayToggleButton } from "../../blocks/panels";
import { StatusText } from "../../design-system/components/feedback";
import { MissState } from "../../design-system/components/states";
import { IconAction } from "../../design-system/components/toolbars";
import { saveCaseState } from "../../lib/analysisCaseStore";
import { caseNode, caseTree, sameCaseState, type AnalysisCase, type CaseState } from "../../lib/analysisProjects";
import { emptyTree, sanPathTo } from "../../lib/gameTree";
import { downloadPgn } from "../../lib/pgnExport";
import { slugify } from "../../lib/pgnText";
import BoardShell from "../board/core/BoardShell";
import { useAnalysisSession } from "../board/core/useAnalysisSession";
import { useAutosave } from "../board/core/useAutosave";
import { useVariationsExplorer } from "../explorer/useVariationsExplorer";
import { usePageTitle } from "../main/pageTitle";
import { playerPlatesOf } from "../shared/playerResults";
import { useCurrentOpening } from "../shared/useCurrentOpening";
import { browserPath, projectPath } from "./paths";
import { useAnalysisCases, useAnalysisProjects } from "./useAnalysisProjects";

/** The tabs that stay mounted once opened — a long move list is costly to mount, and the Map keeps its pan. */
const KEEP_MOUNTED = ["moves", "map"] as const;

type CaseBoardProps = { record: AnalysisCase; projectName: string };

/**
 * **A Case's board** — composed from the board core
 * (`.claude/rules/chessboard.md` §9) as the Analysis Board is: the shared
 * analysis session (`useAnalysisSession`: the core, the engine — off at the
 * start, the reader's global search settings — and Play), the variations
 * explorer (Moves, Map, the comment block, the next-move arrows, editing on),
 * one `BoardShell` and its panel (Moves · Map · Export). Read from its record
 * **once**, as it mounts: the tree, the move it was left on and the way it
 * faced — a Game at its start facing White, a Position facing the side to
 * move, where its record put it.
 *
 * **Every change autosaves** (`useAutosave` → `saveCaseState`): the tree
 * (side lines, comments, NAGs, `[%eval]`s), the move on screen and the
 * orientation, written in place as the reader works — a state the record
 * already holds writes nothing — so reopening the Case finds it where it was
 * left. There is no Save button; the header says Saving… / Saved, or that the
 * browser refused.
 */
export function CaseBoard({ record, projectName }: CaseBoardProps) {
  const { t } = useTranslation();
  const [start] = useState(() => {
    const tree = caseTree(record) ?? emptyTree();
    return { tree, nodeId: caseNode(record, tree), orientation: record.orientation };
  });
  const session = useAnalysisSession({
    tree: start.tree,
    nodeId: start.nodeId ?? undefined,
    orientation: start.orientation,
  });
  const { core, engine } = session;
  const currentOpening = useCurrentOpening(core.fen);
  const [tab, setTab] = useState("moves");

  const name = caseDisplayName(record, t);
  usePageTitle(name);

  /*
    The autosave: what the board holds now, as the record keeps it. `core.pgn`
    is memoised on the tree, so a step writes the path alone; the store
    compares before it writes, so a mount, or a state the record already
    holds, writes nothing.
  */
  const state = useMemo(
    (): CaseState => ({ pgn: core.pgn, path: sanPathTo(core.tree, core.nodeId), orientation: core.orientation }),
    [core.pgn, core.tree, core.nodeId, core.orientation],
  );
  const [refused, setRefused] = useState(false);
  const save = useCallback(
    (next: CaseState) => {
      void saveCaseState(record.id, next).then((problem) => setRefused(problem !== undefined));
    },
    [record.id],
  );
  useAutosave({ enabled: true, record: state, save });
  // The record is the store's, read live: saved is the record holding what the board shows.
  const saved = sameCaseState(record, state);

  const explorer = useVariationsExplorer({
    testId: "analysis-case",
    source: core,
    evalsByFen: engine.evalsByFen,
    onEditTree: core.replaceTree,
    playChances: false,
    annotations: true,
    moveMarks: true,
    arrows: { show: true },
    map: { linked: true },
  });
  const boardOptions: ChessboardOptions = { ...explorer.boardOptions, arrows: explorer.arrows };
  const playerPlates = useMemo(() => playerPlatesOf(core.tree.headers), [core.tree.headers]);
  const topLine = engine.analysis.lines.find((line) => line !== undefined);

  return (
    <BoardShell
      id="analysis-case"
      core={core}
      score={topLine?.score ?? null}
      showEvalBar={session.engineOn && session.showEvalBar}
      playerPlates={playerPlates}
      boardOptions={boardOptions}
      overlay={explorer.overlay}
      panel={{
        header: (
          <>
            <IconAction
              label={t("analysisV2.workspace.back", { name: projectName })}
              link={{ component: RouterLink, to: projectPath(record.projectId) }}
              testId="analysis-case-back"
            >
              <ArrowBackRoundedIcon fontSize="small" />
            </IconAction>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography
                variant="subtitle2"
                data-testid="analysis-case-name"
                dir="auto"
                sx={{ fontWeight: 700, lineHeight: 1.3 }}
                noWrap
              >
                {name}
              </Typography>
              <CurrentOpening {...currentOpening} oneLine testId="analysis-case-current-opening" />
            </Box>
            <Box role="status" sx={{ flexShrink: 0 }}>
              <StatusText
                tone={refused ? "error" : saved ? "success" : "neutral"}
                testId="analysis-case-save-status"
              >
                {t(refused ? "analysisV2.workspace.problem" : saved ? "analysisV2.workspace.saved" : "analysisV2.workspace.saving")}
              </StatusText>
            </Box>
            <PlayToggleButton
              testId="analysis-case-play"
              engineOn={session.engineOn}
              playing={session.playing}
              thinking={session.thinking}
              onToggle={session.togglePlaying}
            />
            <BoardEngineControls
              engineOn={session.engineOn}
              onEngineOnChange={session.setEngineOn}
              showEvalBar={session.showEvalBar}
              onShowEvalBarChange={session.setShowEvalBar}
              writeEvals={{ checked: session.settings.writeEvals, onChange: session.setWriteEvals }}
              testId="analysis-case"
            />
          </>
        ),
        analysis: engine.analysis,
        requestedMultiPv: session.settings.multiPv,
        engineOn: session.engineOn,
        onPlayVariation: core.playVariation,
        activeTab: tab,
        onTabChange: setTab,
        keepMounted: KEEP_MOUNTED,
        tabs: [
          { id: "moves", label: t("analysisV2.workspace.tabs.moves"), content: explorer.moves },
          { id: "map", label: t("analysisV2.workspace.tabs.map"), content: explorer.map },
          {
            id: "export",
            label: t("analysisV2.workspace.tabs.export"),
            content: (
              <PgnExportPanel
                fen={core.fen}
                tree={core.tree}
                onDownload={(pgn) => downloadPgn(slugify(name) || "case", [pgn])}
                testId="analysis-case"
              />
            ),
          },
        ],
        footer: (
          <>
            {explorer.annotations}
            {session.playing && (
              <EngineThinking
                testId="analysis-case-play"
                thinking={session.thinking}
                depth={engine.analysis.fen === core.fen ? engine.analysis.depth : 0}
              />
            )}
            {tab === "moves" && explorer.nextMoves}
          </>
        ),
      }}
    />
  );
}

/**
 * **A Case's workspace** (`/analysis/projects/<id>/cases/<caseId>`, CTA-186)
 * — the route: it waits for the Projects' and the Cases' first read (a URL
 * naming a record never calls it missing before), says a Case that is not in
 * the Project, and mounts the board keyed by the Case, so another Case is a
 * new board read from its own record. Dev-only while the module is built.
 */
function CaseWorkspace() {
  const { t } = useTranslation();
  const { projectId = "", caseId = "" } = useParams();
  const projects = useAnalysisProjects();
  const cases = useAnalysisCases();

  if (projects === undefined || cases === undefined) {
    return (
      <Typography data-testid="analysis-v2-loading" sx={{ color: "text.secondary", p: 2 }}>
        {t("analysisV2.loading")}
      </Typography>
    );
  }
  const project = projects.find((candidate) => candidate.id === projectId);
  const record = cases.find((candidate) => candidate.id === caseId && candidate.projectId === projectId);
  if (project === undefined || record === undefined) {
    return (
      <MissState
        backLabel={
          project === undefined
            ? t("analysisV2.project.back")
            : t("analysisV2.case.back", { name: project.name || t("analysisV2.project.untitled") })
        }
        backLink={{ component: RouterLink, to: project === undefined ? browserPath(null) : projectPath(project.id) }}
        testId="analysis-case-missing"
      >
        {t("analysisV2.case.missing")}
      </MissState>
    );
  }
  return <CaseBoard key={record.id} record={record} projectName={project.name || t("analysisV2.project.untitled")} />;
}

export default CaseWorkspace;
