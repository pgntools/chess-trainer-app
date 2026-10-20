import { Fragment, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type { ComputerAnalysisEngineChoice, EngineSearchValues } from "./EngineSearchFields";

export type EngineSearchSummaryProps = {
  values: Pick<EngineSearchValues, "depth" | "moveTimeMs">;
  /** The engine and preset chosen — their names lead the line. */
  engineChoice?: ComputerAnalysisEngineChoice;
  /** The engine by name where there is no choice. */
  engineName?: string;
};

/**
 * **The Engine section's one line, folded** (CTA-241): the engine, the
 * preset, the depth and the time per move — "Stockfish 19 Lite · Default ·
 * depth 20 · 5 s a move" — what `EngineSearchFields` hold, said without
 * opening them. The engine's name pinned LTR, the preset's isolated.
 */
function EngineSearchSummary({ values, engineChoice, engineName }: EngineSearchSummaryProps) {
  const { t } = useTranslation();
  const engine =
    engineChoice === undefined ? engineName : engineChoice.engines.find((entry) => entry.descriptor.id === engineChoice.engineId)?.descriptor.name;
  const preset = engineChoice?.presets.find((each) => each.id === engineChoice.presetId)?.name;
  const parts: ReactNode[] = [
    ...(engine === undefined ? [] : [<bdi dir="ltr">{engine}</bdi>]),
    ...(preset === undefined ? [] : [<bdi>{preset}</bdi>]),
    t("computerAnalysis.form.summary.depth", { depth: values.depth }),
    values.moveTimeMs === 0
      ? t("computerAnalysis.form.summary.noTimeLimit")
      : t("computerAnalysis.form.summary.moveTime", { seconds: Math.round(values.moveTimeMs / 100) / 10 }),
  ];
  return (
    <>
      {parts.map((part, index) => (
        <Fragment key={index}>
          {index > 0 && " · "}
          {part}
        </Fragment>
      ))}
    </>
  );
}

export default EngineSearchSummary;
