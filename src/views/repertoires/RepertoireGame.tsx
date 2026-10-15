import RepertoireBoard from "./RepertoireBoard";

/**
 * **A repertoire game** (`/repertoires/<id>/games/<game>`, CTA-63) — the
 * player with a game's rules (`RepertoirePlayer.tsx`; the games are
 * `lib/repertoireGames.ts`). Its route is the repertoire's own view's
 * (`RepertoireBoard.tsx`), which reads the `game` and resolves it: one
 * component for both routes (CTA-206), so a step between the repertoire and
 * a game keeps the left panel's open tab.
 */
export default RepertoireBoard;
