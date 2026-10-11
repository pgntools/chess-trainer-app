import { useState } from "react";

import { EngineOptionsChangedDialog } from "../../blocks/dialogs";
import {
  heldToEngine,
  searchSettingLimitsOf,
  storeEngineSearchSettings,
  withRecordedSettings,
  type EngineSearchChange,
} from "../../lib/engineSearchSettings";
import type { EngineDescriptor } from "../../lib/engineTypes";
import { useEngineSearchSettings } from "./useEngineSearchSettings";

/**
 * **"Engine options changed", asked once as a record opens** (CTA-181) — the
 * screen side of the `EngineOptionsChangedDialog` block, for a saved analysis
 * (the Analysis Board) and a played game resumed (Play with Engine, Masked
 * Pieces). The caller works out `changes` once, on opening
 * (`searchSettingsChanges` over the record's settings and the ones in
 * effect); none, and nothing is shown. **Dismiss** keeps the reader's
 * settings; **Use these settings** writes the record's back into them, held to
 * the engine running (`heldToEngine` — the dialog says which would be held,
 * and to what, before the choice). Either closes it for good: once per opening.
 */
export function EngineOptionsChangedPrompt({
  changes,
  record,
  engine,
  testId,
}: {
  changes: readonly EngineSearchChange[];
  record: "analysis" | "game";
  /** The engine running — what the record's Threads and Hash are held to. */
  engine: Pick<EngineDescriptor, "id" | "options" | "capabilities">;
  testId: string;
}) {
  const [open, setOpen] = useState(changes.length > 0);
  const { settings } = useEngineSearchSettings();
  const restored = heldToEngine(withRecordedSettings(settings, changes), searchSettingLimitsOf(engine));
  return (
    <EngineOptionsChangedDialog
      open={open}
      changes={changes}
      held={restored.held.map((field) => ({ field, value: restored.settings[field] }))}
      record={record}
      onDismiss={() => setOpen(false)}
      onUse={() => {
        storeEngineSearchSettings(restored.settings);
        setOpen(false);
      }}
      testId={testId}
    />
  );
}
