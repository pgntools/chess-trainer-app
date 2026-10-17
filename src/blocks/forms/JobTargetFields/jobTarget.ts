import type { ComputerAnalysisTargetKind } from "../../../lib/jobs/kinds/computerAnalysis/core";

/**
 * **Where a computer-analysis job's results are to go, as the popup holds it**
 * (CTA-188): the kind — new Cases in the source's Project, another Project,
 * or merged into the source Case — and, for another Project, whether a new one
 * is made (its name) or an existing one taken (its id). Kept whole while the
 * reader moves between the kinds, so a name typed is not lost.
 */
export type JobTargetChoice = {
  kind: ComputerAnalysisTargetKind;
  otherMode: "new" | "existing";
  newName: string;
  projectId: string | null;
};

/** A Project the results may go to, by name. */
export type JobTargetProject = { id: string; name: string };

/** The popup's first choice: new Cases beside the source, a new Project named `newName` (the screen offers the Case's name). */
export const initialJobTarget = (newName: string): JobTargetChoice => ({
  kind: "project",
  otherMode: "new",
  newName,
  projectId: null,
});

/**
 * Why the choice cannot be sent yet — a new Project with no name, or no
 * Project picked — `undefined` when it can.
 */
export const jobTargetProblem = (choice: JobTargetChoice): "name" | "project" | undefined => {
  if (choice.kind !== "other") return undefined;
  if (choice.otherMode === "new") return choice.newName.trim() === "" ? "name" : undefined;
  return choice.projectId === null ? "project" : undefined;
};
