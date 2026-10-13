import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";

import { ProjectPickerDialog } from "../../blocks/dialogs";
import { addAnalysisCases } from "../../lib/analysisCaseStore";
import {
  gameCaseOf,
  MAX_ANALYSIS_CASES,
  MAX_ANALYSIS_PROJECTS,
  type AnalysisCase,
  type AnalysisProject,
  type CaseDisplay,
} from "../../lib/analysisProjects";
import { createAnalysisProject, loadAnalysisProjects, removeAnalysisProject } from "../../lib/analysisProjectStore";
import { sanPathTo, type GameTree } from "../../lib/gameTree";
import { newRecordId } from "../../lib/recordId";
import { casePath, projectPath } from "./paths";
import { useAnalysisProjects } from "./useAnalysisProjects";

/** One game handed to Analysis — a Game Case of it. */
type SentGame = {
  tree: GameTree;
  /** Where the reader stands on the sending board — the Case opens there. Absent, at the start. */
  nodeId?: string | null;
  /** The side the sending board faces. Absent, White (a game does not turn the board). */
  orientation?: "white" | "black";
  /** The Case's name; absent or `""`, derived from the game's tags. */
  name?: string;
  /** How the sending board drew — its arrows, its move marks — kept as the Case's display; absent, the defaults. */
  display?: Partial<CaseDisplay>;
};

export type SendRequest = {
  games: readonly SentGame[];
  /** The name a new Project is offered under — the sending screen's words for what it sends. */
  projectName: string;
  /**
   * What follows the writing — the screen stays, and says so (the Library's
   * picks). Absent, one game opens its Case, several the Project's Cases.
   */
  onSent?: (project: AnalysisProject, cases: readonly AnalysisCase[]) => void;
};

/**
 * **A game handed to Analysis from another screen** (CTA-192) — the one way
 * the Openings explorer, Play with Engine and its Lobby, the Library's game
 * board and its picks, and an article's embedded game reach Analysis V2:
 * `send({ games, projectName })` opens a **Project picker**
 * (`ProjectPickerDialog`, its *New project* entry first — chosen at first,
 * named `projectName`), and its submit makes a **Game Case** of each game in
 * the Project picked — or a new one at the top level — in one all-or-nothing
 * `addAnalysisCases` (a Project made for it taken back when they are
 * refused, the refusal said in the dialog, which stays open). Then the
 * caller's `onSent`, or — without one — one game **opens its Case** (at the
 * node the sending board stood on, facing its side), several the Project.
 *
 * Render `dialog` once in the screen. `testId` prefixes the dialog's ids
 * (`ProjectPickerDialog`'s).
 */
export const useSendToAnalysis = (testId: string): { send: (request: SendRequest) => void; dialog: ReactNode } => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const projects = useAnalysisProjects();
  const [request, setRequest] = useState<SendRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const send = (next: SendRequest) => {
    if (next.games.length === 0) return;
    void loadAnalysisProjects();
    setProblem(null);
    setRequest(next);
  };

  const refused = (message: string) => setProblem(message);

  /** The games as Cases in `project` (one made for them when `made`), then on to them. */
  const write = async (sent: SendRequest, project: AnalysisProject, made: boolean) => {
    const now = new Date();
    const cases = sent.games.map((game) => {
      const made = gameCaseOf({ id: newRecordId(now), projectId: project.id, name: game.name ?? "", now }, game.tree);
      return {
        ...made,
        path: sanPathTo(game.tree, game.nodeId ?? null),
        orientation: game.orientation ?? "white",
        display: { ...made.display, ...game.display },
      };
    });
    const problem = await addAnalysisCases(cases);
    if (problem !== undefined) {
      // All or nothing: no empty Project is left behind.
      if (made) await removeAnalysisProject(project.id);
      refused(problem === "too-many" ? t("analysisV2.sendTo.tooManyCases", { max: MAX_ANALYSIS_CASES }) : t("analysisV2.sendTo.storage"));
      return;
    }
    setRequest(null);
    if (sent.onSent !== undefined) sent.onSent(project, cases);
    else if (cases.length === 1) navigate(casePath(project.id, cases[0].id));
    else navigate(projectPath(project.id));
  };

  const run = async (projectId: string | null, projectName: string) => {
    if (request === null || busy) return;
    setBusy(true);
    try {
      if (projectId === null) {
        const made = await createAnalysisProject(projectName, null);
        if (made === undefined) return refused(t("analysisV2.sendTo.tooManyProjects", { max: MAX_ANALYSIS_PROJECTS }));
        return await write(request, made, true);
      }
      const project = projects?.find((candidate) => candidate.id === projectId);
      if (project !== undefined) await write(request, project, false);
    } finally {
      setBusy(false);
    }
  };

  const count = request?.games.length ?? 1;
  // One game and nothing else to do: the Case opens. Otherwise the games are added.
  const opens = count === 1 && request?.onSent === undefined;
  const dialog = (
    <ProjectPickerDialog
      open={request !== null}
      title={opens ? t("analysisV2.sendTo.title") : t("analysisV2.sendTo.addTitle", { count })}
      submitLabel={opens ? t("analysisV2.sendTo.open") : t("analysisV2.sendTo.add", { count })}
      projects={projects ?? []}
      current=""
      newProject={{ initialName: request?.projectName ?? "", onSubmit: (projectName) => void run(null, projectName) }}
      onSubmit={(projectId) => void run(projectId, "")}
      onClose={() => {
        if (!busy) setRequest(null);
      }}
      busy={busy}
      problem={problem}
      testId={testId}
    />
  );

  return { send, dialog };
};
