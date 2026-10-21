import i18next from "i18next";

import type { AnswerWords } from "./projection";

/** A catalog reader — `i18next.t`, or a screen's `t`. */
type Translate = (key: string, options?: Record<string, unknown>) => string;

/**
 * **The answers worded** (CTA-244) — the catalog's
 * `accuracyTrainer.session.answer.*`, as the session's movetext writes them
 * (`projection.ts`): "Find Best Move: 1. e4 (#1, Best), 2. Nf3 (#3, Good) — 2
 * of the top 3, 1 in place", "Find Best Move: skipped". In the writer's
 * language: a screen hands its `t`, the job the app's i18next (the catalog
 * the page loaded).
 */
export const answerWordsOf = (t: Translate = (key, options) => i18next.t(key, options)): AnswerWords => ({
  passed: t("accuracyTrainer.session.answer.passed"),
  waiting: (moves) =>
    t("accuracyTrainer.session.answer.waiting", { moves: moves.map((san, index) => `${index + 1}. ${san}`).join(", ") }),
  graded: (grade) => {
    const moves = grade.suggestions.map((each) => {
      if (each.kind === "outside") return t("accuracyTrainer.session.answer.moveOutside", { order: each.order, san: each.san });
      const verdict =
        each.verdict !== null
          ? t(`computerAnalysis.verdicts.${each.verdict}`)
          : t(each.loss === 0 ? "accuracyTrainer.lines.best" : "accuracyTrainer.lines.good");
      return t("accuracyTrainer.session.answer.move", { order: each.order, san: each.san, rank: each.rank, verdict });
    });
    return t("accuracyTrainer.session.answer.moves", { moves: moves.join(", "), found: grade.found, count: grade.target, inPlace: grade.inPlace });
  },
});
