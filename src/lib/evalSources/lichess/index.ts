/*
  The lichess evaluation API (CTA-193), an eval source (CTA-196) — the plugin.
  Removing it is deleting this folder, its line in `../registry.ts` and its
  locale keys (`evalSources.lichess.*`) — docs/engine.md §10.
*/
export { lichessEvalSource } from "./source";
