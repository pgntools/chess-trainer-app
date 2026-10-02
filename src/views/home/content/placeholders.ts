import { libraryGameReference } from "../../../lib/gameReference";

/**
 * ┌───────────────────────────────────────────────────────────────────────┐
 * │ PLACEHOLDER DATA (CTA-126) — replace before relying on it.            │
 * └───────────────────────────────────────────────────────────────────────┘
 *
 * **The stored game the front page embeds**, as a `?game=` reference
 * (`lib/gameReference.ts`) — today game 1 of the Library's shipped Capablanca
 * collection (Capablanca – Eschevarria, Havana 1901), picked only because
 * every reader has it. Swap it for the game the page should show:
 *
 * - another Library game: `libraryGameReference("<collection id>", <n>)` — the
 *   ids are `src/data/library/manifest.json`'s, `n` the game's 1-based number
 *   (the `/library/<collection>/<n>` address);
 * - a saved analysis: `"analysis/saved/<id>"`; a game against the engine:
 *   `"play/games/<id>"` — the reader's own records, so on another reader's
 *   device the embed says the game is not there.
 *
 * Both documents (`front-page.en.mdx`, `front-page.he.mdx`) import it, so this
 * is the one line to change.
 */
export const EXAMPLE_GAME_REFERENCE = libraryGameReference("capablanca", 1);
