import { EmbedSource } from "./embedSource";
import { KnockoutView } from "./tournamentEmbedViews";

/**
 * **A knockout from the Library — the older names** (CTA-128; aliases since
 * CTA-140) — `<CollectionKnockoutBracket _id="/library/<collection>" />` is
 * `<KnockoutBracket src="/library/<collection>" />`, and
 * `<CollectionDoubleEliminationBracket>` the same with `losersFromRound`
 * `51` unless it says otherwise. Kept for the articles written with them;
 * the MDX editor writes the new form. Their ids are
 * `tournament-collection-<collection>-knockout` (a double elimination's
 * `-doubleElimination`), the block's under them.
 */

type CollectionKnockoutEmbedProps = {
  /** The collection's address: `/library/<collection>`. */
  _id: string;
  losersFromRound?: number | string;
  playerLink?: boolean;
  gameLink?: boolean;
  density?: "normal" | "dense";
};

/** `<CollectionKnockoutBracket>` — a knockout's one bracket; `losersFromRound` makes it a double elimination. */
export function CollectionKnockoutEmbed({ _id, ...bracket }: CollectionKnockoutEmbedProps) {
  return <EmbedSource src={_id}>{(read) => <KnockoutView read={read} {...bracket} word="knockout" />}</EmbedSource>;
}

/** `<CollectionDoubleEliminationBracket>` — the winners' bracket over the losers', which starts at round 51 unless `losersFromRound` says otherwise. */
export function CollectionDoubleEliminationEmbed({ _id, losersFromRound = 51, ...bracket }: CollectionKnockoutEmbedProps) {
  return <EmbedSource src={_id}>{(read) => <KnockoutView read={read} {...bracket} losersFromRound={losersFromRound} word="doubleElimination" />}</EmbedSource>;
}
