import type { AnalysisSettings } from "../../../lib/analysisSettings";
import {
  computerAnalysisOptionsFrom,
  DEFAULT_COMPUTER_ANALYSIS_OPTIONS,
  type ComputerAnalysisOptions,
} from "../../../lib/computerAnalysis";

/**
 * **The Computer analysis tab's first options** (CTA-174): the board's Engine
 * tab's depth, time, lines, threads and hash, on the engine the reader chose,
 * with the early stop at the depth (where it does nothing, `main.py`'s
 * behaviour) and the rest the defaults. The tab follows the Engine tab until
 * the reader changes one of its own options.
 */
export const computerAnalysisSeed = (settings: AnalysisSettings, engineId: string): ComputerAnalysisOptions =>
  computerAnalysisOptionsFrom({
    ...DEFAULT_COMPUTER_ANALYSIS_OPTIONS,
    engine: engineId,
    depth: settings.depth,
    minDepth: settings.depth,
    moveTimeMs: settings.moveTimeMs,
    multiPv: settings.multiPv,
    threads: settings.threads,
    hashMb: settings.hashMb,
  });
