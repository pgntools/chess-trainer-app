import { useCallback, useMemo, useState } from "react";
import FormatListBulletedRoundedIcon from "@mui/icons-material/FormatListBulletedRounded";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { Link as RouterLink, useParams, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import type { ChessboardOptions } from "react-chessboard";

import { caseDisplayName } from "../../blocks/tables";
import { CaseSiblings } from "../../blocks/trees";
import { BoardEngineControls, CurrentOpening, EngineThinking, PgnExportPanel, PlayToggleButton } from "../../blocks/panels";
import { StatusText } from "../../design-system/components/feedback";
import { MissState } from "../../design-system/components/states";
import { sortRows } from "../../design-system/components/tables";
import { IconAction } from "../../design-system/components/toolbars";
import { saveCaseState } from "../../lib/analysisCaseStore";
import {
  CASE_COLUMNS,
  caseFirstDirection,
  caseRowOf,
  caseSortValue,
  filteredCaseRows,
  newestCaseFirst,
  type CaseColumn,
} from "../../lib/analysisCaseRows";
import {
  casesOf,
  caseNode,
  caseTree,
  sameCaseState,
  type AnalysisCase,
  type CaseDisplay,
  type CaseState,
} from "../../lib/analysisProjects";
import { arrowWidthSourcesIn } from "../../lib/nextMoveWeights";
import { emptyTree, sanPathTo } from "../../lib/gameTree";
import { downloadPgn } from "../../lib/pgnExport";
import { slugify } from "../../lib/pgnText";
import BoardShell from "../board/core/BoardShell";
import { useAnalysisSession } from "../board/core/useAnalysisSession";
import { useAutosave } from "../board/core/useAutosave";
import { useVariationsExplorer } from "../explorer/useVariationsExplorer";
import { BoardLeftPanel } from "../main/boardLeftPanel";
import { usePageTitle } from "../main/pageTitle";
import { useShellCompact } from "../main/shellCompact";
import { playerPlatesOf } from "../shared/playerResults";
import { useCurrentOpening } from "../shared/useCurrentOpening";
import CaseDisplayTab from "./CaseDisplayTab";
import { browserPath, caseListContextOf, casePath, projectPath } from "./paths";
import { useAnalysisCases, useAnalysisProjects } from "./useAnalysisProjects";

/** The tabs that stay mounted once opened — a long move list is costly to mount, and the Map keeps its pan. */
const KEEP_MOUNTED = ["moves", "map"] as const;

type CaseBoardProps = {
  record: AnalysisCase;
  projectName: string;
  /** Where the header's way back goes — the Project's Cases as the table stood. Absent, the Project's Cases. */
  backPath?: string;
  /** Under the shell's breakpoint: open the Project's Cases in their drawer — a header button. Absent, none. */
  onOpenSiblings?: () => void;
  /** Whether that drawer is open — the button's `aria-expanded`. */
  siblingsOpen?: boolean;
};

/**
 * **A Case's board** — composed from the board core
 * (`.claude/rules/chessboard.md` §9) as the Analysis Board is: the shared
 * analysis session (`useAnalysisSession`: the core, the engine — off at the
 * start, the reader's global search settings — and Play), the variations
 * explorer (Moves, Map, the comment block, the next-move arrows, editing on),
 * one `BoardShell` and its panel (Moves · Map · Display · Export — Display
 * the arrows and move marks, `CaseDisplayTab`). Read from its record
 * **once**, as it mounts: the tree, the move it was left on and the way it
 * faced — a Game at its start facing White, a Position facing the side to
 * move, where its record put it.
 *
 * **Every change autosaves** (`useAutosave` → `saveCaseState`): the tree
 * (side lines, comments, NAGs, `[%eval]`s), the move on screen, the
 * orientation and how the board draws, written in place as the reader works — a state the record
 * already holds writes nothing — so reopening the Case finds it where it was
 * left. There is no Save button; the header says Saving… / Saved, or that the
 * browser refused.
 */
export function CaseBoard({ record, projectName, backPath, onOpenSiblings, siblingsOpen = false }: CaseBoardProps) {
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
  /*
    How the board draws (the Display tab) — read from the record once, then
    the board's, autosaved with the analysis. A width source the tree no
    longer carries is kept, and drawn as None until it is back.
  */
  const [display, setDisplay] = useState<CaseDisplay>(record.display);
  const changeDisplay = (patch: Partial<CaseDisplay>) => setDisplay((current) => ({ ...current, ...patch }));
  const availableWidthSources = useMemo(() => arrowWidthSourcesIn(core.tree), [core.tree]);
  const drawnWidthSource = availableWidthSources.has(display.arrowWidthSource) ? display.arrowWidthSource : "none";

  const name = caseDisplayName(record, t);
  usePageTitle(name);

  /*
    The autosave: what the board holds now, as the record keeps it. `core.pgn`
    is memoised on the tree, so a step writes the path alone; the store
    compares before it writes, so a mount, or a state the record already
    holds, writes nothing.
  */
  const state = useMemo(
    (): CaseState => ({ pgn: core.pgn, path: sanPathTo(core.tree, core.nodeId), orientation: core.orientation, display }),
    [core.pgn, core.tree, core.nodeId, core.orientation, display],
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
    moveMarks: display.showMoveMarks,
    arrows: { show: display.showArrows, widthSource: drawnWidthSource, palette: display.arrowPalette },
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
      showEvalBar={session.engineOn && display.showEvalBar}
      playerPlates={playerPlates}
      boardOptions={boardOptions}
      overlay={explorer.overlay}
      panel={{
        header: (
          <>
            <IconAction
              label={t("analysisV2.workspace.back", { name: projectName })}
              link={{ component: RouterLink, to: backPath ?? projectPath(record.projectId) }}
              testId="analysis-case-back"
            >
              <ArrowBackRoundedIcon fontSize="small" />
            </IconAction>
            {onOpenSiblings !== undefined && (
              // Under the breakpoint the Project's Cases are a drawer; wide, the board's own column.
              <IconAction
                label={t("analysisV2.siblings.toggle")}
                onClick={onOpenSiblings}
                popupOpen={siblingsOpen}
                popupKind="dialog"
                testId="analysis-case-siblings-toggle"
              >
                <FormatListBulletedRoundedIcon fontSize="small" />
              </IconAction>
            )}
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
              showEvalBar={display.showEvalBar}
              onShowEvalBarChange={(showEvalBar) => changeDisplay({ showEvalBar })}
              writeEvals={{ checked: session.settings.writeEvals, onChange: session.setWriteEvals }}
              testId="analysis-case"
            />
          </>
        ),
        analysis: engine.analysis,
        // The engine's lines, as the Display tab says.
        showVariations: display.showVariations,
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
            id: "display",
            label: t("analysisV2.workspace.tabs.display"),
            content: <CaseDisplayTab display={display} onChange={changeDisplay} available={availableWidthSources} />,
          },
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
 * new board read from its own record — and, in the main menu's place, **the
 * Project's Cases** (`CaseSiblings` in the shell's board left panel,
 * `keepShell`: the header and its Engine menu stay): in the Cases table's
 * order and under its words, carried in the URL, with a words box, Close,
 * previous / next and a fold to a rail; a drawer under the breakpoint, opened
 * from the board's header. Dev-only while the module is built.
 */
function CaseWorkspace() {
  const { t } = useTranslation();
  const { projectId = "", caseId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const projects = useAnalysisProjects();
  const cases = useAnalysisCases();
  const compact = useShellCompact();
  // The list beside the board, as the reader left it — the route's, so it outlives a step to another Case.
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  /*
    The Project's Cases beside the board (`CaseSiblings`), in the order and
    under the words the Cases table had when the Case was opened from it —
    carried in this URL (`?sort=`, `?dir=`, `?q=`, `caseListContextOf`). The
    list's own words box writes `?q=` back, so Close returns to the table as
    the list left it.
  */
  const context = caseListContextOf(searchParams);
  const text = searchParams.get("q") ?? "";
  const sortParam = searchParams.get("sort");
  const column: CaseColumn = (CASE_COLUMNS as readonly string[]).includes(sortParam ?? "") ? (sortParam as CaseColumn) : "updated";
  const dirParam = searchParams.get("dir");
  const direction = dirParam === "asc" || dirParam === "desc" ? dirParam : caseFirstDirection(column);
  const ordered = useMemo(
    () =>
      cases === undefined
        ? []
        : sortRows(
            casesOf(cases, projectId).map((record) => caseRowOf(record, caseDisplayName(record, t))),
            column,
            direction,
            (row, by) => caseSortValue(row, by),
            newestCaseFirst,
          ),
    [cases, projectId, column, direction, t],
  );
  const shown = useMemo(
    () => filteredCaseRows(ordered, text, (type) => t(type === "game" ? "analysisV2.case.typeGame" : "analysisV2.case.typePosition")),
    [ordered, text, t],
  );

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
        backLink={{ component: RouterLink, to: project === undefined ? browserPath(null) : projectPath(project.id, context) }}
        testId="analysis-case-missing"
      >
        {t("analysisV2.case.missing")}
      </MissState>
    );
  }

  const projectName = project.name || t("analysisV2.project.untitled");
  const linkTo = (id: string) => ({ component: RouterLink, to: casePath(project.id, id, context) });
  // Previous / next walk the list as shown — or, the words leaving the open Case out, the whole of it.
  const walk = shown.some((row) => row.id === record.id) ? shown : ordered;
  const at = walk.findIndex((row) => row.id === record.id);

  return (
    <>
      <CaseBoard
        key={record.id}
        record={record}
        projectName={projectName}
        backPath={projectPath(project.id, context)}
        onOpenSiblings={compact ? () => setDrawerOpen(true) : undefined}
        siblingsOpen={drawerOpen}
      />
      {/* In the main menu's place — the shell's header and its Engine menu stay (`keepShell`); a drawer under the breakpoint. */}
      <BoardLeftPanel
        collapsed={collapsed && !compact}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        drawerLabel={t("analysisV2.siblings.title", { name: projectName })}
        keepShell
      >
        <CaseSiblings
          projectName={projectName}
          rows={shown}
          currentId={record.id}
          linkOf={(row) => linkTo(row.id)}
          closeLink={{ component: RouterLink, to: projectPath(project.id, context) }}
          previous={at > 0 ? linkTo(walk[at - 1].id) : undefined}
          next={at >= 0 && at < walk.length - 1 ? linkTo(walk[at + 1].id) : undefined}
          text={text}
          onTextChange={(next) =>
            setSearchParams(
              (params) => {
                const updated = new URLSearchParams(params);
                if (next === "") updated.delete("q");
                else updated.set("q", next);
                return updated;
              },
              { replace: true },
            )
          }
          collapsed={collapsed && !compact}
          onCollapsedChange={compact ? undefined : setCollapsed}
          testId="analysis-case-siblings"
        />
      </BoardLeftPanel>
    </>
  );
}

export default CaseWorkspace;
