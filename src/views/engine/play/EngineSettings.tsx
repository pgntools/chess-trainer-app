import { EngineSettingsForm } from "../../../blocks/forms";
import type { EngineOption } from "../../../lib/engineTypes";
import { deviceEngineLimits, type EngineSettings as EngineSettingsValues } from "../../../lib/engineSettings";

/**
 * **The Engine tab** — strength, search limits, the lines to report, the two
 * resource knobs and the eval bar — on Play with Engine and Masked Pieces,
 * and the body of the Lobby's new-game form (`NewGameForm.tsx`), over an
 * engine that is handshaken but never searches.
 *
 * Since CTA-109 it is the `EngineSettingsForm` block (`blocks/forms/`) under
 * the module's ids (`engine-settings`, `engine-setting-<option>`): the block
 * renders every option-backed control from what the running worker declared
 * — absent, pinned or adjustable (`.claude/rules/chessboard.md` §4.1) — the
 * strength as an Elo where the engine takes one. The screen reads what this
 * device can give the engine (`deviceEngineLimits`, CTA-160) and the block
 * offers Threads and Hash up to it. Which colour the reader plays, and a new
 * game, are the header's.
 */
type EngineSettingsProps = {
  settings: EngineSettingsValues;
  onChange: (patch: Partial<EngineSettingsValues>) => void;
  /** What the running worker declared. Empty until the handshake lands. */
  engineOptions: ReadonlyMap<string, EngineOption>;
  showEvalBar: boolean;
  onShowEvalBarChange: (next: boolean) => void;
};

function EngineSettings(props: EngineSettingsProps) {
  return <EngineSettingsForm {...props} deviceLimits={deviceEngineLimits()} testId="engine" />;
}

export default EngineSettings;
