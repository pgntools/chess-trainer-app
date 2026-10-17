import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { useTranslation } from "react-i18next";

import type { LinkTarget } from "../../../design-system/components/link";
import { KeyValueList, type KeyValueRow } from "../../../design-system/components/lists";
import { tableDate } from "../../../design-system/components/tables";
import { PanelTabs, tabPanelProps } from "../../../design-system/components/tabs";
import { IconAction } from "../../../design-system/components/toolbars";
import type { CollectionMetadata, CollectionSources, CollectionSummary } from "../../../lib/libraryCollections";
import { CollectionSource, TournamentInfo, type TournamentFacts } from "../../cards";

/** The panel's tabs, in order. */
export type CollectionDetailsTab = "general" | "options" | "jobs";

const COLLECTION_DETAILS_TABS: readonly CollectionDetailsTab[] = ["general", "options", "jobs"];

/**
 * What General shows (CTA-231): a tournament's event card — the facts its
 * games give (`TournamentInfo`) — or, for any other collection, its
 * description and what its index says of it; under either, where the games
 * come from (CTA-233).
 */
export type CollectionDetailsGeneral = (
  | { kind: "tournament"; facts: TournamentFacts; description?: string }
  | {
      kind: "collection";
      source: CollectionSummary["source"];
      /** The games' players, events, ratings and dates (`collectionMetadataOf` over the rows). */
      metadata: CollectionMetadata;
      /** When an upload was added (ISO 8601). Absent for a shipped file. */
      addedAt?: string;
      description?: string;
    }
) & {
  /**
   * The games' `Source…` tags (`collectionSourcesOf` over the rows, CTA-233)
   * — the `CollectionSource` card under the rest. Absent when no game names
   * a source (or the index is from before the column): no card.
   */
  sources?: CollectionSources;
};

export type CollectionDetailsProps = {
  /** The collection's name, as the screen shows it. */
  name: string;
  /** Where Close goes — the Library's list, `/library` (the page's one way back). */
  closeLink: LinkTarget;
  /** The open tab — the screen's. */
  tab: CollectionDetailsTab;
  onTabChange: (tab: CollectionDetailsTab) => void;
  general: CollectionDetailsGeneral;
  /**
   * The Options tab's content — the collection's settings, the screen's
   * (`CollectionSettingsForm` in its frame, the draft and the write its own).
   * Absent — a shipped collection, read-only — a line saying so.
   */
  options?: ReactNode;
  /** The Jobs tab's content — the collection's jobs and New job, the screen's (`EntityJobs`). */
  jobs: ReactNode;
  /**
   * The root; its parts `-close`, `-title`, `-tabs` (each tab `-tab-<id>`),
   * `-general` (a tournament's card `-tournament`, else the description
   * `-description` and the facts `-facts`, each `-facts-<id>`; under either
   * the source card `-source`), `-options`
   * (`-options-read-only` without settings) and `-jobs`.
   */
  testId: string;
};

/** A collection's facts, as a description list — a fact its index does not give left out. */
function CollectionFacts({
  general,
  testId,
}: {
  general: Extract<CollectionDetailsGeneral, { kind: "collection" }>;
  testId: string;
}) {
  const { t, i18n } = useTranslation();
  const count = (value: number) => value.toLocaleString(i18n.language);
  const { metadata } = general;
  const span = (range: { first: string; last: string } | undefined) =>
    range === undefined ? undefined : range.first === range.last ? range.first : `${range.first} – ${range.last}`;
  const dates = span(metadata.dates);
  const elo = metadata.elo === undefined ? undefined : span({ first: String(metadata.elo.min), last: String(metadata.elo.max) });
  const added = general.addedAt === undefined ? undefined : tableDate(general.addedAt);
  const [event] = metadata.events;
  const rows: KeyValueRow[] = [
    { id: "source", label: t("library.collectionDetails.general.source"), value: t(`library.collectionDetails.general.sources.${general.source}`) },
    { id: "games", label: t("library.collectionDetails.general.games"), value: count(metadata.games) },
    ...(metadata.players === 0 ? [] : [{ id: "players", label: t("library.collectionDetails.general.players"), value: count(metadata.players) }]),
    // One event is named; several are counted.
    ...(metadata.events.length === 0
      ? []
      : metadata.events.length === 1 && event !== undefined
        ? [{ id: "events", label: t("library.collectionDetails.general.event"), value: event, dir: "auto" as const }]
        : [{ id: "events", label: t("library.collectionDetails.general.events"), value: count(metadata.events.length) }]),
    ...(dates === undefined ? [] : [{ id: "dates", label: t("library.collectionDetails.general.dates"), value: dates, dir: "ltr" as const }]),
    ...(elo === undefined ? [] : [{ id: "elo", label: t("library.collectionDetails.general.elo"), value: elo, dir: "ltr" as const }]),
    ...(added === undefined
      ? []
      : [{ id: "added", label: t("library.collectionDetails.general.added"), value: <time dateTime={added.dateTime}>{added.text}</time>, dir: "ltr" as const }]),
  ];
  return <KeyValueList rows={rows} testId={testId} />;
}

/**
 * **A Library collection's own panel beside its games** (CTA-229, its
 * content CTA-231) — the collection page's left panel, in the main menu's
 * place, on both its views (the games table and a tournament's Info /
 * Participants / Games), as `ProjectDetails` is beside a Project's Cases: a
 * Close back to the Library and the collection's name at its head (the
 * page's one way back — no header Back), then three tabs:
 *
 * - **General** — a tournament's event card (`TournamentInfo`: the reader's
 *   description, the type, the event, the site, the dates, the rounds and
 *   the counts); any other collection's description (or a line saying it
 *   has none) and its facts — where it comes from, its games, players,
 *   events, dates, ratings and when it was added. Under either, at the
 *   panel's foot (the rest scrolling above it), where the games come from —
 *   their `Source…` tags (`CollectionSource`, CTA-233), when any game names
 *   one.
 * - **Options** — the collection's settings (the screen's form: the title,
 *   the description, the tournament mark); a shipped collection's a line
 *   saying it is read-only.
 * - **Jobs** — the collection's jobs and New job for it (the screen's
 *   `EntityJobs`).
 *
 * Presentational: the open tab, the facts, the settings and the jobs arrive
 * from the screen; its words are `library.collectionDetails.*`.
 */
function CollectionDetails({ name, closeLink, tab, onTabChange, general, options, jobs, testId }: CollectionDetailsProps) {
  const { t } = useTranslation();

  return (
    <Box
      component="section"
      aria-label={t("library.collectionDetails.label", { name })}
      data-testid={testId}
      sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, minWidth: 0 }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0, pb: 1 }}>
        <IconAction label={t("library.collectionDetails.close", { name })} link={closeLink} testId={`${testId}-close`}>
          <CloseRoundedIcon fontSize="small" />
        </IconAction>
        <Typography
          component="h2"
          variant="subtitle2"
          dir="auto"
          data-testid={`${testId}-title`}
          sx={{ flexGrow: 1, minWidth: 0, fontWeight: 700, overflowWrap: "anywhere" }}
        >
          {name}
        </Typography>
      </Box>
      <Box sx={{ flexShrink: 0, pb: 1 }}>
        <PanelTabs
          tabs={COLLECTION_DETAILS_TABS.map((id) => ({ id, label: t(`library.collectionDetails.tabs.${id}`) }))}
          value={tab}
          onChange={(id) => onTabChange(id as CollectionDetailsTab)}
          ariaLabel={t("library.collectionDetails.tabs.label")}
          idPrefix={testId}
          testId={`${testId}-tabs`}
          tabTestIdPrefix={testId}
        />
      </Box>
      {/* The open tab's content scrolls; the head and the tabs stay. The settings' frame scrolls its own fields over its Save, General its facts over the source. */}
      <Box sx={{ flex: 1, minHeight: 0, overflowY: tab === "general" || (tab === "options" && options !== undefined) ? "hidden" : "auto" }}>
        {tab === "general" && (
          <Box {...tabPanelProps(testId, "general")} data-testid={`${testId}-general`} sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", display: "grid", gap: 2, alignContent: "start", px: 1, py: 1 }}>
              {general.kind === "tournament" ? (
                <TournamentInfo facts={general.facts} description={general.description} headingLevel="h3" testId={`${testId}-tournament`} />
              ) : (
                <>
                  <Typography
                    variant="body2"
                    dir={general.description === undefined ? undefined : "auto"}
                    data-testid={`${testId}-description`}
                    sx={{ whiteSpace: "pre-line", ...(general.description === undefined && { color: "text.secondary" }) }}
                  >
                    {general.description ?? t("library.collectionDetails.general.noDescription")}
                  </Typography>
                  <CollectionFacts general={general} testId={`${testId}-facts`} />
                </>
              )}
            </Box>
            {/* The games' source (CTA-233) sits at the panel's foot, under whatever scrolls above it — scrolling itself past half the panel. */}
            {general.sources !== undefined && (
              <Box data-testid={`${testId}-source-foot`} sx={{ flexShrink: 0, maxHeight: "50%", overflowY: "auto", px: 1, pb: 1 }}>
                <CollectionSource sources={general.sources} headingLevel="h3" testId={`${testId}-source`} />
              </Box>
            )}
          </Box>
        )}
        {tab === "options" && (
          <Box
            {...tabPanelProps(testId, "options")}
            data-testid={`${testId}-options`}
            sx={{ px: 1, py: 1, boxSizing: "border-box", ...(options !== undefined && { height: "100%", display: "flex", flexDirection: "column" }) }}
          >
            {options ?? (
              <Typography variant="body2" data-testid={`${testId}-options-read-only`} sx={{ color: "text.secondary" }}>
                {t("library.collectionDetails.readOnly")}
              </Typography>
            )}
          </Box>
        )}
        {tab === "jobs" && (
          <Box {...tabPanelProps(testId, "jobs")} data-testid={`${testId}-jobs`} sx={{ py: 1 }}>
            {jobs}
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default CollectionDetails;
