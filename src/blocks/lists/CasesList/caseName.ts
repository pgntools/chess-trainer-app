import type { TFunction } from "i18next";

import { caseDerivedName, type AnalysisCase } from "../../../lib/analysisProjects";

/**
 * **A Case's name as the reader reads it** (CTA-186): its own, else derived —
 * a Game by its tags ("Carlsen – Caruana, Club Championship, 2024", else
 * "Game"), a Position by its side to move and move number ("Black to move,
 * move 41"), in the reader's language. Beside the block, so the screens name
 * a Case the same way.
 */
export const caseDisplayName = (
  record: Pick<AnalysisCase, "name" | "type" | "source" | "pgn">,
  t: TFunction,
): string => {
  if (record.name !== "") return record.name;
  const derived = caseDerivedName(record);
  if (derived.kind === "game") return derived.text || t("analysisV2.case.untitledGame");
  return t("analysisV2.case.positionName", {
    side: t(derived.turn === "w" ? "analysisV2.case.white" : "analysisV2.case.black"),
    number: derived.moveNumber,
  });
};
