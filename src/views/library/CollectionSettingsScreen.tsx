import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useLocation, useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";

import { CollectionSettingsForm } from "../../blocks/forms";
import { StatusText } from "../../design-system/components/feedback";
import { SettingsFrame } from "../../design-system/components/forms";
import { LoadingLine } from "../../design-system/components/states";
import {
  canBeTournament,
  type CollectionSummary,
  type TournamentFormat,
} from "../../lib/libraryCollections";
import { updateCollectionSettings } from "../../lib/libraryCollectionStore";
import { readPgnTags } from "../../lib/pgn";
import { guessTournamentKind } from "../../lib/tournamentKind";
import { RightPanel } from "../main/rightPanel";
import { useOwnPageHeading, usePageTitle } from "../main/pageTitle";
import LibraryMiss from "./LibraryMiss";
import { useCollectionGames, useCollectionRows, useCollectionSummary } from "./useLibraryCollections";

/**
 * **A collection's settings** (`/library/<collection>/settings`, CTA-121) —
 * its title and description, and its tournament mark (Swiss / Round robin).
 *
 * Uploaded collections only: a shipped one has no settings entry, and its
 * id here is the miss — the route is reached from a Settings button in the
 * collection's header that `source === "uploaded"` alone draws.
 *
 * The form is the `CollectionSettingsForm` block over **one draft**; nothing
 * is written until Save, which writes the whole draft at once through
 * `updateCollectionSettings` — the summary alone, so the games and the index
 * are untouched — and goes back where the reader came from (the router state
 * the link here passes, or the collection's table). The store's re-read
 * carries the change to the list, the header and the page title at once,
 * and to other tabs through the Library's `BroadcastChannel`.
 *
 * The tournament mark is a **stored setting; the games decide whether it
 * reads as one** (`canBeTournament` over the index rows — every game
 * sharing one `Event`, none of them loaded for it). Games that do not allow
 * it leave the switch off with its reason, and the stored mark — kept as it
 * is — reads as off everywhere until they do again.
 *
 * **The suggested type** (CTA-142): the games' own tags — the teams, the
 * FIDE ids, which the index rows do not keep — are read once the games
 * arrive, and `guessTournamentKind` names the kind of tournament they look
 * like; the form offers it with an Apply that puts it in the draft. While
 * the games are read, or where they say nothing, nothing is suggested.
 */

/** The screen's draft: `""` a missing description, Swiss a mark with no type. */
type Draft = {
  name: string;
  description: string;
  tournament: { enabled: boolean; type: TournamentFormat };
};

const draftOf = (summary: CollectionSummary): Draft => ({
  name: summary.name,
  description: summary.description ?? "",
  // A mark never switched on defaults to Swiss; a stored type is kept whatever the games say.
  tournament: { enabled: summary.tournament?.enabled === true, type: summary.tournament?.type ?? "swiss" },
});

function CollectionSettingsScreen() {
  const { collectionId } = useParams();
  const { t } = useTranslation();
  const summary = useCollectionSummary(collectionId);
  // The rows decide the tournament mark's verdict — read off the index alone, no games loaded.
  const rows = useCollectionRows(collectionId);
  if (summary.status === "loading" || rows.status === "loading") {
    return <LoadingLine testId="library-settings-loading">{t("library.table.loading")}</LoadingLine>;
  }
  if (summary.status === "missing" || rows.status === "missing") return <LibraryMiss what="collection" />;
  // Shipped collections are read-only everywhere: no settings entry (CTA-121's gate).
  if (summary.summary.source === "shipped") return <LibraryMiss what="collection" />;
  return <SettingsForm key={summary.summary.id} summary={summary.summary} canMark={canBeTournament(rows.value)} />;
}

/** The type a collection's games look like — once they are read; `undefined` until then, and for no guess. */
const useTournamentGuess = (id: string, wanted: boolean) => {
  const games = useCollectionGames(wanted ? id : undefined);
  const value = games.status === "ready" ? games.value : undefined;
  return useMemo(() => (value === undefined ? undefined : guessTournamentKind(value.map(readPgnTags))), [value]);
};

function SettingsForm({ summary, canMark }: { summary: CollectionSummary; canMark: boolean }) {
  // The screen's title is the page's `h1` (CTA-112), the record's name its browser title.
  useOwnPageHeading();
  usePageTitle(summary.name);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  // Where Save and Cancel go: the screen that linked here, else the table.
  const from = (location.state as { from?: unknown } | null)?.from;
  const back =
    typeof from === "string" ? from : `/library/${encodeURIComponent(summary.id)}`;

  const [draft, setDraft] = useState<Draft>(() => draftOf(summary));
  // Only games that can be a tournament are read for a suggestion.
  const suggestion = useTournamentGuess(summary.id, canMark);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const problem = await updateCollectionSettings(summary.id, {
      name: draft.name,
      description: draft.description.trim(),
      tournament: draft.tournament,
    });
    setBusy(false);
    if (problem !== undefined) {
      setFailed(true);
      return;
    }
    navigate(back);
  };

  return (
    <>
      <Box data-testid="library-settings-screen" sx={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        <Box sx={{ flexShrink: 0 }}>
          <Typography variant="subtitle1" component="h1" sx={{ fontWeight: 700 }}>
            {t("library.settings.title")}
          </Typography>
          <Typography variant="body2" dir="auto" sx={{ color: "text.secondary" }} noWrap>
            {summary.name}
          </Typography>
        </Box>

        <Box sx={{ flex: 1, minHeight: 0 }}>
          <SettingsFrame
            onSave={() => void save()}
            onCancel={() => navigate(back)}
            saveLabel={t("library.settings.save")}
            cancelLabel={t("library.settings.cancel")}
            // The title is required: a blank one saves nothing.
            saveDisabled={draft.name.trim() === ""}
            busy={busy}
            footer={
              failed && (
                <StatusText tone="error" testId="library-settings-problem">
                  {t("library.settings.problem")}
                </StatusText>
              )
            }
            testId="library-settings"
          >
            <CollectionSettingsForm
              value={draft}
              onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
              canBeTournament={canMark}
              suggestion={suggestion}
              disabled={busy}
              testId="library-settings-form"
            />
          </SettingsFrame>
        </Box>
      </Box>

      <RightPanel>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {t("library.table.uploadedNote")}
        </Typography>
      </RightPanel>
    </>
  );
}

export default CollectionSettingsScreen;
