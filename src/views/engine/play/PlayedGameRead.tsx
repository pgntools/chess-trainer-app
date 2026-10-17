import type { ReactNode } from "react";
import { useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";

import { LoadingLine } from "../../../design-system/components/states";

import { engineSearchSettingsRead, loadEngineSearchSettings } from "../../../lib/engineSearchInEffect";
import { loadPlayedGames, playedGamesSnapshot } from "../../../lib/playedGameStore";
import { useStoreRead } from "../../shared/useStoreRead";

// The game, and the presets: a resumed game's settings are compared with those in effect — the depth and move time a preset's (CTA-185).
const isRead = () => playedGamesSnapshot() !== undefined && engineSearchSettingsRead();
const load = () => Promise.all([loadPlayedGames(), loadEngineSearchSettings()]);

/**
 * The play routes' wait: a `?saved=<id>` arrival names a played game, and the
 * games are IndexedDB's (`lib/playedGameStore.ts`) — so the route reads the
 * store before it mounts the screen, whose arrival (`arrivalOf`) is read once
 * — and the engine presets, whose depth and move time the game's own are
 * compared with ("Engine options changed", CTA-185).
 * Without the wait, a reload of a game in progress would open a new game. An
 * arrival with no `?saved=` mounts at once.
 */
export function PlayedGameRead({ testId, children }: { testId: string; children: ReactNode }) {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const ready = useStoreRead(searchParams.get("saved") !== null, isRead, load);
  if (!ready) {
    return <LoadingLine testId={`${testId}-loading`}>{t("playedGames.loading")}</LoadingLine>;
  }
  return children;
}
