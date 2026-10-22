import { useEffect, useRef } from "react";

import { pathTo } from "../../../lib/gameTree";
import { preloadMoveSounds, playMoveSound } from "../../../lib/moveSoundPlayer";
import { moveSoundOf } from "../../../lib/moveSounds";
import { readSoundSettings } from "../../../lib/soundSettings";
import type { BoardCore } from "./useBoardCore";

/**
 * **The move sounds** (CTA-260) — called by `BoardShell`, so every board
 * composed from the core has them, with no flag of its own.
 *
 * **One move forward sounds; anything else is silent.** A step is one move
 * forward when the node now on screen is a child of the one before — a move
 * played (the reader's drop, the engine's or the trainer's reply, a line
 * clicked one move deep) or a step through the game (→, a move clicked in
 * the list, the board's controls). A step back, a jump of several moves, the
 * first render and a game loaded (`core.loads` moved) say nothing.
 *
 * **Each move its kind** (`lib/moveSounds.ts`): a capture, castling, a check,
 * a promotion, the game's end, a plain move.
 *
 * **The reader's settings, read as the sound plays** (`lib/soundSettings.ts`,
 * Settings → Sounds): off, nothing; a step through the game only while
 * `stepping` is on — a move played (`core.lastPlayed` names it) sounds either
 * way.
 */
export const useMoveSounds = (core: Pick<BoardCore, "tree" | "nodeId" | "lastPlayed" | "loads">): void => {
  const { tree, nodeId, lastPlayed, loads } = core;
  const seen = useRef({ nodeId, lastPlayed, loads });

  // The files, fetched once a board is on screen — never at module load (the pre-render) or before.
  useEffect(() => {
    if (readSoundSettings().enabled) preloadMoveSounds();
  }, []);

  useEffect(() => {
    const before = seen.current;
    seen.current = { nodeId, lastPlayed, loads };
    if (nodeId === null || nodeId === before.nodeId || loads !== before.loads) return;

    const path = pathTo(tree, nodeId);
    const node = path.at(-1);
    if (node === undefined) return;
    const parentId = path.length > 1 ? path[path.length - 2].id : null;
    if (parentId !== before.nodeId) return;

    const settings = readSoundSettings();
    if (!settings.enabled || settings.volume === 0) return;
    const played = lastPlayed !== before.lastPlayed && lastPlayed?.nodeId === nodeId;
    if (!played && !settings.stepping) return;
    playMoveSound(moveSoundOf(node), settings.volume / 100);
  }, [tree, nodeId, lastPlayed, loads]);
};
