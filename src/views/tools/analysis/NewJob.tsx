import { useMemo, useState } from "react";
import { useHref, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";

import { NewJobDialog } from "../../../blocks/dialogs";
import type { ComputerAnalysisStartProblem } from "../../../blocks/forms";
import { useSnackbar } from "../../../design-system/components/feedback";
import {
  analysisPositionsOf,
  computerAnalysisOptionsFrom,
  type ComputerAnalysisOptions,
} from "../../../lib/computerAnalysis";
import { deviceEngineLimits, type DeviceEngineLimits } from "../../../lib/engineSettings";
import type { EngineOption } from "../../../lib/engineTypes";
import { mainline, plyLabel, type GameTree } from "../../../lib/gameTree";
import { enqueueComputerAnalysis } from "../../../lib/jobStore";
import { useJobs } from "../../jobs/useJobs";
import { jobOfGame, jobPath } from "./gameJob";

/** The game a New Job is for — named, filed and read as the board or the list holds it. */
export type NewJobGame = {
  /** The name the job and its outputs are named after. */
  name: string;
  /** The saved analysis it is, `null` for a board never saved — how its earlier jobs are found. */
  analysisId: string | null;
  /** The folder the outputs are filed in. */
  folderId: string | null;
  /** The game as it stands — what Start is off for (no moves, none in range). */
  tree: GameTree;
  /** The PGN the job is sent with, read when Start is pressed. */
  pgn: () => string;
};

/**
 * The engine a job will run — the reader's choice — and what it declared
 * (empty before its handshake, as on the saved list, where none runs), and
 * the most Threads and Hash to offer it (`engineLimitsOf`, CTA-175). Absent
 * `limits`, this device's.
 */
type NewJobEngine = {
  id: string;
  name: string;
  multiThread: boolean;
  options: ReadonlyMap<string, EngineOption>;
  limits?: DeviceEngineLimits;
};

type NewJobProps = {
  /** The game the dialog is open for; `null`, it is closed. */
  game: NewJobGame | null;
  onClose: () => void;
  /** The form's options — the host's, so the board's outlive the dialog. */
  options: ComputerAnalysisOptions;
  onOptionsChange: (options: ComputerAnalysisOptions) => void;
  engine: NewJobEngine;
  /** The job this host sent last — it counts as the game's own (the board's, CTA-174). */
  sentJobId?: string | null;
  onSent?: (jobId: string) => void;
  /** The dialog's test id (`NewJobDialog`'s parts under it); the snackbar is `<testId>-notice`, its link `<testId>-open-job`. */
  testId: string;
};

/**
 * **A game's New Job** (CTA-177) — the screen side of `NewJobDialog`, shared
 * by the Analysis Board's Analyse icon and the saved list's: the game's job
 * found among the store's (`useJobs`, `jobOfGame`) so the dialog first asks
 * whether to start another or check that one (the Jobs screen at it); the
 * options held to the bounds of the engine the job will run
 * (`computerAnalysisOptionsFrom`); Start queues the mainline
 * (`enqueueComputerAnalysis`) with the engine chosen at that moment and the
 * PGN as the host holds it then, closes the dialog and says so in a snackbar
 * whose button opens the job on the Jobs screen. A refusal (`invalid`,
 * `storage`, `too-many`) is said inside the dialog, which stays open.
 *
 * The job itself is the shell's runner's (`.claude/rules/jobs.md`); its live
 * progress and results are the Jobs screen's.
 */
function NewJob({ game, onClose, options, onOptionsChange, engine, sentJobId = null, onSent, testId }: NewJobProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { show } = useSnackbar();
  // The router's base, so the snackbar's link — outside the router — is a real href.
  const base = useHref("/");
  const jobs = useJobs();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<ComputerAnalysisStartProblem | undefined>();
  /*
    The game last opened for — still drawn while the dialog fades out, so it
    does not empty first. A refusal is about the last Start: a new opening
    starts without it. Adjusted during render.
  */
  const [shown, setShown] = useState(game);
  if (game !== null && game !== shown) setShown(game);
  const [wasOpen, setWasOpen] = useState(game !== null);
  if ((game !== null) !== wasOpen) {
    setWasOpen(game !== null);
    if (game !== null) setProblem(undefined);
  }

  const existing = game === null ? undefined : jobOfGame(jobs, sentJobId, game.analysisId);
  const tree = shown?.tree;
  const mainlineLength = useMemo(() => (tree === undefined ? 0 : mainline(tree).length), [tree]);
  const lastMove = tree === undefined || mainlineLength === 0 ? undefined : plyLabel(tree.startFen, mainlineLength).number;
  const inRange = useMemo(() => tree !== undefined && analysisPositionsOf(tree, options).length > 0, [tree, options]);
  const blocked = lastMove === undefined ? "noMoves" : inRange ? undefined : "noRange";

  const open = (jobId: string) => {
    onClose();
    navigate(jobPath(jobId));
  };

  const start = async () => {
    if (game === null) return;
    setBusy(true);
    setProblem(undefined);
    const result = await enqueueComputerAnalysis({
      source: { analysisId: game.analysisId, name: game.name, folderId: game.folderId, pgn: game.pgn() },
      options: { ...options, engine: engine.id },
    });
    setBusy(false);
    if (result === "invalid" || result === "storage" || result === "too-many") {
      setProblem(result);
      return;
    }
    onSent?.(result);
    onClose();
    const path = jobPath(result);
    show({
      severity: "success",
      duration: 10_000,
      testId: `${testId}-notice`,
      message: t("computerAnalysis.newJob.queued", { name: game.name }),
      action: {
        label: t("computerAnalysis.newJob.openJob"),
        onClick: () => navigate(path),
        href: base === "/" ? path : `${base}${path}`,
        testId: `${testId}-open-job`,
      },
    });
  };

  return (
    <NewJobDialog
      open={game !== null}
      onClose={onClose}
      gameName={shown?.name ?? ""}
      existing={existing === undefined ? undefined : { status: existing.status, onCheck: () => open(existing.id) }}
      options={options}
      onChange={(patch) => {
        setProblem(undefined);
        // Held to the bounds of the engine the job will run: an engine server's keeps its own Hash (CTA-175).
        onOptionsChange(computerAnalysisOptionsFrom({ ...options, ...patch, engine: engine.id }));
      }}
      engineOptions={engine.options}
      multiThread={engine.multiThread}
      engineName={engine.name}
      deviceLimits={engine.limits ?? deviceEngineLimits()}
      lastMove={lastMove}
      blocked={blocked}
      onStart={() => void start()}
      busy={busy}
      problem={problem}
      testId={testId}
    />
  );
}

export default NewJob;
