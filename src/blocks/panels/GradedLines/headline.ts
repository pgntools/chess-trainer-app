import type { PositionGrade } from "../../../lib/accuracyTrainer";

/** What a graded position's headline says — its words' key, their values, and its tone. */
export type GradeHeadline = {
  key: string;
  values: Record<string, number>;
  tone: "neutral" | "warning" | "success" | "info";
};

/**
 * **A graded position's headline** (CTA-238) — a pass; nothing to compare
 * with; every best move found, each in its place; how many found and in place;
 * or none — `GradedLines`' and the left panel's alike.
 */
export const gradeHeadlineOf = (grade: PositionGrade): GradeHeadline => {
  if (grade.passed) return { key: "accuracyTrainer.lines.headline.passed", values: {}, tone: "neutral" };
  if (grade.target === 0) return { key: "accuracyTrainer.lines.headline.noLines", values: {}, tone: "warning" };
  if (grade.inPlace === grade.target) return { key: "accuracyTrainer.lines.headline.perfect", values: { count: grade.target }, tone: "success" };
  if (grade.found > 0) {
    return { key: "accuracyTrainer.lines.headline.found", values: { found: grade.found, count: grade.target, inPlace: grade.inPlace }, tone: "info" };
  }
  return { key: "accuracyTrainer.lines.headline.none", values: { count: grade.target }, tone: "warning" };
};
