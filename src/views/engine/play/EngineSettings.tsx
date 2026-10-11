import { Link as RouterLink } from "react-router";

import { EngineSettingsForm } from "../../../blocks/forms";
import type { EngineOption } from "../../../lib/engineTypes";
import type { EngineSettings as EngineSettingsValues } from "../../../lib/engineSettings";

/**
 * **The Engine tab's strength** — an Elo, or a Skill Level with its Elo an
 * estimate — on Play with Engine and Masked Pieces, and in the Lobby's
 * new-game form (`NewGameForm.tsx`, with the eval bar), over an engine that
 * is handshaken but never searches.
 *
 * The `EngineSettingsForm` block (`blocks/forms/`) under the module's ids
 * (`engine-settings`, `engine-setting-<option>`). Since CTA-181 the strength
 * is all the tab sets: depth, move time, lines, Threads and Hash are the
 * reader's global search settings (the top bar's Engine menu). **Whether the
 * Elo applies is the engine's preset's call** — `limitStrength`, its
 * `UCI_LimitStrength` (`presetLimitsStrength`): off, the slider is off and
 * links to Settings → Engine, where it is turned on.
 */
type EngineSettingsProps = {
  settings: Pick<EngineSettingsValues, "skillLevel" | "elo">;
  onChange: (patch: Partial<Pick<EngineSettingsValues, "skillLevel" | "elo">>) => void;
  /** What the running worker declared. Empty until the handshake lands. */
  engineOptions: ReadonlyMap<string, EngineOption>;
  /** Whether the engine's preset has `UCI_LimitStrength` on — the Elo slider's switch. */
  limitStrength: boolean;
  /** The eval bar's switch — the Lobby's form only; a board's is in its engine menu. */
  evalBar?: { checked: boolean; onChange: (next: boolean) => void };
};

function EngineSettings({ limitStrength, ...props }: EngineSettingsProps) {
  return (
    <EngineSettingsForm
      {...props}
      strengthOff={limitStrength ? undefined : { settingsLink: { component: RouterLink, to: "/settings/engine" } }}
      testId="engine"
    />
  );
}

export default EngineSettings;
