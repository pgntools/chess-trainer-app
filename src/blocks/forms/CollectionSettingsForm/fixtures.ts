import type { CollectionSettingsDraft } from "./CollectionSettingsForm";

/*
  The collection settings form's sample drafts (CTA-121). Imported only by the
  block's gallery and its test.
*/

/** A collection never touched: no description, no mark. */
export const PLAIN: CollectionSettingsDraft = {
  name: "Club games",
  description: "",
  tournament: { enabled: false, type: "swiss" },
};

/** A one-event collection described and marked as a Swiss. */
export const SWISS: CollectionSettingsDraft = {
  name: "Club championship 2026",
  description: "Our club's annual Swiss — six rounds, one Saturday.",
  tournament: { enabled: true, type: "swiss" },
};

/** Marked as a round robin. */
export const ROUND_ROBIN: CollectionSettingsDraft = {
  name: "Candidates 2026",
  description: "",
  tournament: { enabled: true, type: "roundRobin" },
};

/** A long name and a description near the cap. */
export const FULL: CollectionSettingsDraft = {
  name: "A tournament whose title goes on for quite a while indeed",
  description: "A description that fills most of the two thousand characters a collection's description may be. ".repeat(28),
  tournament: { enabled: true, type: "swiss" },
};
