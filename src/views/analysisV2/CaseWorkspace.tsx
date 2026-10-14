import { useCallback, useMemo, useState, type ReactNode } from "react";
import FormatListBulletedRoundedIcon from "@mui/icons-material/FormatListBulletedRounded";
import SmartToyRoundedIcon from "@mui/icons-material/SmartToyRounded";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { Link as RouterLink, useParams, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import type { ChessboardOptions } from "react-chessboard";

import { CasePickerDialog } from "../../blocks/dialogs";
import { CaseJobs, CaseLinks } from "../../blocks/lists";
import { caseDisplayName } from "../../blocks/tables";
import { CaseDetails, type CaseDetailsTab } from "../../blocks/panels";
import { CaseSiblings } from "../../blocks/trees";
import { CurrentOpening, EngineThinking, PgnExportPanel, PlayToggleButton } from "../../blocks/panels";
import { StatusText } from "../../design-system/components/feedback";
import { SwitchField } from "../../design-system/components/forms";
import { MissState } from "../../design-system/components/states";
import { sortRows } from "../../design-system/components/tables";
import { IconAction } from "../../design-system/components/toolbars";
import { linkAnalysisCases, unlinkAnalysisCases } from "../../lib/analysisCaseLinkStore";
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
  caseLinksOf,
  casesOf,
  caseNode,
  caseTree,
  type AnalysisCase,
  type CaseDisplay,
  type CaseState,
} from "../../lib/analysisProjects";
import { jobV2AnalysisOf } from "../../lib/jobsV2";
import { arrowWidthSourcesIn, engineLineWeights } from "../../lib/nextMoveWeights";
import { evalSeriesOf } from "../../lib/computerAnalysisTree";
import { emptyTree, mainlineGame, sanPathTo, type GameTree } from "../../lib/gameTree";
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
import AnalysisEvalReport from "../shared/AnalysisEvalReport";
import { useCurrentOpening } from "../shared/useCurrentOpening";
import CaseDisplayTab from "./CaseDisplayTab";
import CaseSettingsTab from "./CaseSettingsTab";
import NewJobV2, { type NewJobV2Case } from "./jobs/NewJobV2";
import { browserPath, caseListContextOf, casePath, jobsV2Path, projectPath, withCaseView } from "./paths";
import { useAnalysisCases, useAnalysisProjects, useCaseLinks, useJobsV2 } from "./useAnalysisProjects";

/** The tabs that stay mounted once opened — a long move list is costly to mount, and the Map keeps its pan. */
const KEEP_MOUNTED = ["moves", "map"] as const;

/** What the board shows its left panel — the tree on screen and the way to move about it (CTA-186). */
export type CaseBoardView = {
  tree: GameTree;
  nodeId: string | null;
  /** The mainline's ply on screen — 0 at the start, or off the mainline. */
  mainlinePly: number;
  goToNode: (nodeId: string | null) => void;
  /** Whether the tree carries `[%eval]`s — the Graph tab's to show. */
  hasEvaluations: boolean;
  /** How the board draws (`CaseDisplayTab`, the board's state) — the Case view's Display tab. */
  display: ReactNode;
};

type CaseBoardProps = {
  record: AnalysisCase;
  /**
   * The board's left panel, drawn from what the board shows — the Case view's
   * Graph reads its live tree. Absent, none (the boards' tests).
   */
  leftPanel?: (view: CaseBoardView) => ReactNode;
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
 * one `BoardShell` and its panel (Moves · Map · Settings · Export — Settings
 * the side the board faces, the eval bar and the evaluations written,
 * `CaseSettingsTab`; how it draws, `CaseDisplayTab`, is the left panel's Case
 * view's Display tab),
 * the engine's on / off a small switch in its header. Read from its record
 * **once**, as it mounts: the tree, the move it was left on and the way it
 * faced — a Game at its start facing White, a Position facing the side to
 * move, where its record put it.
 *
 * **Every change autosaves** (`useAutosave` → `saveCaseState`): the tree
 * (side lines, comments, NAGs, `[%eval]`s), the move on screen, the
 * orientation and how the board draws, written in place as the reader works — a state the record
 * already holds writes nothing — so reopening the Case finds it where it was
 * left. There is no Save button and no saved / saving status — the header
 * speaks only when the browser refuses a write.
 */
export function CaseBoard({ record, leftPanel, onOpenSiblings, siblingsOpen = false }: CaseBoardProps) {
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

  /*
    The Jobs V2 merges the board's tree holds (CTA-188) — the record's as it
    mounted. A merge the record lists and the board does not is taken in,
    adjusted during render (the core's state is this component's): the job's
    analysis applied to the tree as it stands, or — its job gone — the
    record's tree loaded.
  */
  const jobs = useJobsV2();
  const [merged, setMerged] = useState<readonly string[]>(record.merges);
  const pending = record.merges.filter((id) => !merged.includes(id));
  if (pending.length > 0 && jobs !== undefined) {
    setMerged(record.merges);
    for (const id of pending) {
      const job = jobs.find((candidate) => candidate.id === id);
      const variant = job?.options.outputs[0];
      if (job === undefined || variant === undefined) {
        core.loadTree(caseTree(record) ?? core.tree);
        break;
      }
      core.annotateTree((tree) => jobV2AnalysisOf(job, tree, variant));
    }
  }
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
  /*
    Under Variations (CTA-197) the arrows are the engine's listed lines' first
    moves — only while it is on, and only lines for the position on screen,
    so a stale position's are never drawn. Without them, drawn as None.
  */
  const variations = drawnWidthSource === "variations";
  const { analysis } = engine;
  const engineMoves = useMemo(
    () =>
      variations && session.engineOn && analysis.fen === core.fen
        ? engineLineWeights(core.fen, analysis.lines)
        : undefined,
    [variations, session.engineOn, analysis, core.fen],
  );

  const name = caseDisplayName(record, t);
  usePageTitle(name);

  /*
    The autosave: what the board holds now, as the record keeps it. `core.pgn`
    is memoised on the tree, so a step writes the path alone; the store
    compares before it writes, so a mount, or a state the record already
    holds, writes nothing.
  */
  const state = useMemo(
    (): CaseState => ({ pgn: core.pgn, path: sanPathTo(core.tree, core.nodeId), orientation: core.orientation, display, merges: merged }),
    [core.pgn, core.tree, core.nodeId, core.orientation, display, merged],
  );
  const [refused, setRefused] = useState(false);
  const save = useCallback(
    (next: CaseState) => {
      void saveCaseState(record.id, next).then((problem) => setRefused(problem !== undefined));
    },
    [record.id],
  );
  useAutosave({ enabled: true, record: state, save });

  const explorer = useVariationsExplorer({
    testId: "analysis-case",
    source: core,
    evalsByFen: engine.evalsByFen,
    onEditTree: core.replaceTree,
    playChances: false,
    annotations: true,
    moveMarks: display.showMoveMarks,
    arrows: { show: display.showArrows, widthSource: drawnWidthSource, engineMoves, palette: display.arrowPalette },
    map: { linked: true },
  });
  const boardOptions: ChessboardOptions = { ...explorer.boardOptions, arrows: explorer.arrows };
  const playerPlates = useMemo(() => playerPlatesOf(core.tree.headers), [core.tree.headers]);
  const topLine = engine.analysis.lines.find((line) => line !== undefined);
  const hasEvaluations = useMemo(() => evalSeriesOf(core.tree).length > 0, [core.tree]);

  return (
    <>
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
              {/* Silent while the autosave works; mounted throughout, so a refusal is announced. */}
              <Box role="status" sx={{ flexShrink: 0 }}>
                {refused && (
                  <StatusText tone="error" testId="analysis-case-save-status">
                    {t("analysisV2.workspace.problem")}
                  </StatusText>
                )}
              </Box>
              <PlayToggleButton
                testId="analysis-case-play"
                engineOn={session.engineOn}
                playing={session.playing}
                thinking={session.thinking}
                onToggle={session.togglePlaying}
              />
              {/* The engine's on / off — a small switch; its other choices are the Settings tab's. */}
              <Box sx={{ flexShrink: 0 }}>
                <SwitchField
                  size="small"
                  // The top bar's Engine icon for the word — still read, and shown on a hover, as "Engine" —
                  // and its look: neutral at its 0.56 while off, the primary colour while on (no breath — the top bar's says it searches).
                  label={
                    <SmartToyRoundedIcon
                      fontSize="small"
                      color={session.engineOn ? "primary" : "inherit"}
                      titleAccess={t("analysisV2.workspace.engine")}
                      sx={{ display: "block", opacity: session.engineOn ? 1 : 0.56 }}
                    />
                  }
                  checked={session.engineOn}
                  onChange={session.setEngineOn}
                  testId="analysis-case-setting-engine"
                />
              </Box>
            </>
          ),
          analysis: engine.analysis,
          // The depth chip fills toward where the search stops (CTA-195).
          searchProgress: engine.searchProgress,
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
              id: "settings",
              label: t("analysisV2.workspace.tabs.settings"),
              content: (
                <CaseSettingsTab
                  orientation={core.orientation}
                  onOrientationChange={(side) => {
                    if (side !== core.orientation) core.flipBoard();
                  }}
                  showEvalBar={display.showEvalBar}
                  onShowEvalBarChange={(showEvalBar) => changeDisplay({ showEvalBar })}
                  writeEvals={session.settings.writeEvals}
                  onWriteEvalsChange={session.setWriteEvals}
                />
              ),
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
      {leftPanel?.({
        tree: core.tree,
        nodeId: core.nodeId,
        mainlinePly: core.mainlineNodes.findIndex((node) => node.id === core.nodeId) + 1,
        goToNode: core.goToNode,
        hasEvaluations,
        display: (
          <CaseDisplayTab
            display={display}
            onChange={changeDisplay}
            available={availableWidthSources}
            engineLines={engineMoves !== undefined}
          />
        ),
      })}
    </>
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
 * order and under its words, carried in the URL, with a words box, Close
 * (the one way back — the board's header has none) and previous / next; a
 * drawer under the breakpoint, opened from the board's header.
 */
function CaseWorkspace() {
  const { t } = useTranslation();
  const { projectId = "", caseId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const projects = useAnalysisProjects();
  const cases = useAnalysisCases();
  const compact = useShellCompact();
  // Under the breakpoint, the list's drawer — the route's, so it outlives a step to another Case.
  const [drawerOpen, setDrawerOpen] = useState(false);
  // The Case view's open tab — the route's too, so stepping to another Case keeps it.
  const [detailsTab, setDetailsTab] = useState<CaseDetailsTab>("info");
  // The New Job V2 popup (CTA-188), open for the Case on the board — its tree as the board held it.
  const [newJob, setNewJob] = useState<NewJobV2Case | null>(null);
  const jobs = useJobsV2();
  // The Case's links (CTA-188) — on its Info tab — the Link a case picker, and a refused link's words.
  const links = useCaseLinks();
  const [picking, setPicking] = useState(false);
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkProblem, setLinkProblem] = useState<string | undefined>();
  const [unlinkProblem, setUnlinkProblem] = useState<string | undefined>();

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

  /*
    The panel's two screens: the Case's own view — where a Case opens
    (CTA-199) — whose Back goes to the Project's Cases (`?view=list`), and the
    list, a row of which opens that Case's view. Its Info tab reads the tags of
    the Case as saved, parsed only while it shows.
  */
  const details = searchParams.get("view") !== "list";
  const openPgn = cases?.find((candidate) => candidate.id === caseId && candidate.projectId === projectId)?.pgn;
  const infoGame = useMemo(() => {
    if (!details || openPgn === undefined) return undefined;
    const tree = caseTree({ pgn: openPgn });
    return tree === undefined ? undefined : mainlineGame(tree);
  }, [details, openPgn]);

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
  // A link keeps the panel's screen unless it says which.
  const linkTo = (id: string, toDetails = details) => ({
    component: RouterLink,
    to: casePath(project.id, id, withCaseView(context, toDetails)),
  });
  const row = ordered.find((candidate) => candidate.id === record.id) ?? caseRowOf(record, caseDisplayName(record, t));
  /*
    Its links (CTA-188): the Cases it links to and is linked from, across
    Projects — each a link to that Case's board with its Project's name — and
    for Link a case every other Case it does not link to already.
  */
  const nameOfProject = (id: string) => {
    const owner = projects.find((candidate) => candidate.id === id);
    return owner === undefined ? "" : owner.name || t("analysisV2.project.untitled");
  };
  const ends = caseLinksOf(links ?? [], cases, record.id);
  const linkRow = ({ link, record: other }: (typeof ends.to)[number]) => ({
    linkId: link.id,
    name: caseDisplayName(other, t),
    projectName: nameOfProject(other.projectId),
    link: { component: RouterLink, to: casePath(other.projectId, other.id) },
  });
  const linkedTo = new Set(ends.to.map(({ record: other }) => other.id));
  const pickable = cases
    .filter((candidate) => candidate.id !== record.id && !linkedTo.has(candidate.id))
    .map((candidate) => ({ id: candidate.id, projectId: candidate.projectId, name: caseDisplayName(candidate, t), type: candidate.type }));

  // Previous / next walk the list as shown — or, the words leaving the open Case out, the whole of it.
  const walk = shown.some((row) => row.id === record.id) ? shown : ordered;
  const at = walk.findIndex((row) => row.id === record.id);

  return (
    <>
      <CaseBoard
        key={record.id}
        record={record}
        onOpenSiblings={compact ? () => setDrawerOpen(true) : undefined}
        siblingsOpen={drawerOpen}
        /*
          In the main menu's place — the shell's header and its Engine menu
          stay (`keepShell`); a drawer under the breakpoint. Drawn by the board,
          so the Case view's Graph reads the tree on screen.
        */
        leftPanel={(view) => (
          <BoardLeftPanel
            collapsed={false}
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            drawerLabel={details ? t("analysisV2.caseDetails.label", { name: row.name }) : t("analysisV2.siblings.title", { name: projectName })}
            keepShell
          >
            {details ? (
              <CaseDetails
                row={row}
                game={infoGame}
                graph={
                  view.hasEvaluations ? (
                    <AnalysisEvalReport
                      tree={view.tree}
                      mainlinePly={view.mainlinePly}
                      currentNodeId={view.nodeId}
                      onGoToNode={view.goToNode}
                      testId="analysis-case-details-evaluations"
                    />
                  ) : undefined
                }
                display={view.display}
                links={
                  <CaseLinks
                    linksTo={ends.to.map(linkRow)}
                    linkedFrom={ends.from.map(linkRow)}
                    onUnlink={(linked) => {
                      void unlinkAnalysisCases(linked.linkId).then((failed) =>
                        setUnlinkProblem(failed === undefined ? undefined : t("analysisV2.links.problem")),
                      );
                    }}
                    onLink={() => {
                      setLinkProblem(undefined);
                      setPicking(true);
                    }}
                    problem={unlinkProblem}
                    testId="analysis-case-links"
                  />
                }
                jobs={
                  <CaseJobs
                    jobs={jobs?.filter((job) => job.source.caseId === record.id)}
                    jobLink={(job) => ({ component: RouterLink, to: jobsV2Path(job.id) })}
                    onNewJob={() => setNewJob({ record, tree: view.tree, name: row.name })}
                    testId="analysis-case-jobs"
                  />
                }
                tab={detailsTab}
                onTabChange={setDetailsTab}
                backLink={linkTo(record.id, false)}
                previous={at > 0 ? linkTo(walk[at - 1].id) : undefined}
                next={at >= 0 && at < walk.length - 1 ? linkTo(walk[at + 1].id) : undefined}
                testId="analysis-case-details"
              />
            ) : (
              <CaseSiblings
                projectName={projectName}
                rows={shown}
                currentId={record.id}
                linkOf={(sibling) => linkTo(sibling.id, true)}
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
                testId="analysis-case-siblings"
              />
            )}
          </BoardLeftPanel>
        )}
      />
      <NewJobV2 open={newJob} onClose={() => setNewJob(null)} testId="analysis-case-new-job" />
      <CasePickerDialog
        open={picking}
        projects={projects}
        cases={pickable}
        initialProjectId={project.id}
        onSubmit={(caseId) => {
          setLinkBusy(true);
          void linkAnalysisCases(record.id, caseId).then((failed) => {
            setLinkBusy(false);
            if (failed === undefined) setPicking(false);
            else setLinkProblem(t("analysisV2.links.problem"));
          });
        }}
        onClose={() => setPicking(false)}
        busy={linkBusy}
        problem={linkProblem}
        testId="analysis-case-link-picker"
      />
    </>
  );
}

export default CaseWorkspace;
