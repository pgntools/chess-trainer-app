import type { LinkTarget } from "../../../design-system/components/link";

/*
  The engine server's setup steps need the address it listens on and the guide's link.
  Imported only by the block's gallery and its test.
*/

/** Where `yarn api:start` serves. */
export const DEFAULT_ADDRESS = "http://127.0.0.1:8800";

/** A server moved elsewhere — the long, wrapping case. */
export const MOVED_ADDRESS = "https://engines.example-chess-club.org/stockfish/api";

/** The guide — a plain address in the gallery, which has no router to hand it to. */
export const GUIDE_LINK: LinkTarget = { href: "#guide" };
