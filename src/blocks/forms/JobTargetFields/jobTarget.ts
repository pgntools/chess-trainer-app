import type { JobV2TargetKind } from "../../../lib/jobsV2";

/**
 * **Where a Jobs V2 computer analysis is to go, as the popup holds it**
 * (CTA-188): the kind — new Cases in the source's Project, a linked Project,
 * or merged into the source Case — and, for a linked Project, whether a new
 * one is made (its name) or an existing one taken (its id). Kept whole while
 * the reader moves between the kinds, so a name typed is not lost.
 */
export type JobTargetChoice = {
  kind: JobV2TargetKind;
  linkedMode: "new" | "existing";
  newName: string;
  projectId: string | null;
};

/** A Project the results may go to: its name, and whether the source's Project links to it already. */
export type JobTargetProject = { id: string; name: string; linked: boolean };

/** The popup's first choice: new Cases beside the source, a new linked Project named `newName` (the screen offers the Case's name). */
export const initialJobTarget = (newName: string): JobTargetChoice => ({
  kind: "project",
  linkedMode: "new",
  newName,
  projectId: null,
});

/**
 * Why the choice cannot be sent yet — a new Project with no name, or no
 * Project picked — `undefined` when it can.
 */
export const jobTargetProblem = (choice: JobTargetChoice): "name" | "project" | undefined => {
  if (choice.kind !== "linked") return undefined;
  if (choice.linkedMode === "new") return choice.newName.trim() === "" ? "name" : undefined;
  return choice.projectId === null ? "project" : undefined;
};
