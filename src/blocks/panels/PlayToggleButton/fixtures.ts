import type { PlayToggleButtonProps } from "./PlayToggleButton";

/*
  Play's states (CTA-113) — the toggle has no data of `src/lib/`'s, only the
  session's three switches. Imported only by the block's gallery and its test.
*/

type PlayState = Pick<PlayToggleButtonProps, "engineOn" | "playing" | "thinking">;

export const ENGINE_OFF: PlayState = { engineOn: false, playing: false, thinking: false };
export const PAUSED: PlayState = { engineOn: true, playing: false, thinking: false };
export const THINKING: PlayState = { engineOn: true, playing: true, thinking: true };
export const YOUR_MOVE: PlayState = { engineOn: true, playing: true, thinking: false };
