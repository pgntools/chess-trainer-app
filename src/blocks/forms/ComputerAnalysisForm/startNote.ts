import type { ComputerAnalysisOptions } from "../../../lib/computerAnalysis";

/**
 * **Why Start is off**, as a catalog key — the game has no moves, none is in
 * the chosen range, or no variant is ticked — or `undefined` when it is on.
 * The form's own Start reads it, and so does a host that draws Start itself
 * (the New Job dialog, CTA-177).
 */
export const computerAnalysisStartNote = (
  options: Pick<ComputerAnalysisOptions, "outputs">,
  blocked: "noMoves" | "noRange" | undefined,
): `computerAnalysis.form.${"noMoves" | "noRange" | "noVariant"}` | undefined =>
  blocked !== undefined
    ? `computerAnalysis.form.${blocked}`
    : options.outputs.length === 0
      ? "computerAnalysis.form.noVariant"
      : undefined;
