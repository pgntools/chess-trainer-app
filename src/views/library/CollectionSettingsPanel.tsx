import { useTranslation } from "react-i18next";

import { CollectionSettingsForm } from "../../blocks/forms";
import { StatusText } from "../../design-system/components/feedback";
import { SettingsFrame } from "../../design-system/components/forms";
import type { CollectionSummary } from "../../lib/libraryCollections";
import type { CollectionSettings } from "./useCollectionSettings";
import { useTournamentGuess } from "./useLibraryCollections";

/**
 * **A collection's settings on its page** (CTA-231 — the Settings tab, Options until CTA-235, of
 * the page's left panel, in place of the `/library/<c>/settings` screen of
 * CTA-121): the `CollectionSettingsForm` block in a `SettingsFrame`, over
 * the page's draft (`useCollectionSettings`) — Save writes it whole, Cancel
 * takes it back, Save off while nothing changed; "Saved." once it landed.
 *
 * Uploaded collections only (a shipped one is read-only: the panel says so).
 * The tournament mark's verdict is the rows' (`canBeTournament`); **the
 * suggested type** (CTA-142) reads the games' own tags — only while this tab
 * is open, and only where the games can be a tournament.
 */
function CollectionSettingsPanel({
  collection,
  canMark,
  settings,
}: {
  collection: CollectionSummary;
  /** The games allow the mark (`canBeTournament` over the rows). */
  canMark: boolean;
  settings: CollectionSettings;
}) {
  const { t } = useTranslation();
  const suggestion = useTournamentGuess(collection.id, canMark);
  const { draft, change, dirty, reset, save, busy, failed, saved } = settings;
  return (
    <SettingsFrame
      onSave={() => void save()}
      onCancel={reset}
      saveLabel={t("library.settings.save")}
      cancelLabel={t("library.settings.cancel")}
      // The title is required: a blank one saves nothing.
      saveDisabled={!dirty || draft.name.trim() === ""}
      busy={busy}
      footer={
        failed ? (
          <StatusText tone="error" testId="library-settings-problem">
            {t("library.settings.problem")}
          </StatusText>
        ) : saved ? (
          <StatusText tone="success" testId="library-settings-saved">
            {t("library.collectionDetails.saved")}
          </StatusText>
        ) : undefined
      }
      testId="library-settings"
    >
      <CollectionSettingsForm
        value={draft}
        onChange={change}
        canBeTournament={canMark}
        suggestion={suggestion}
        disabled={busy}
        testId="library-settings-form"
      />
    </SettingsFrame>
  );
}

export default CollectionSettingsPanel;
