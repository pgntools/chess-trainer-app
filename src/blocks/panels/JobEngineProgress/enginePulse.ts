import { useState } from "react";
import { keyframes, useTheme } from "@mui/material/styles";

/** One beat — the mark's opacity, nothing that moves. */
const BEAT = `
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
`;
/** The same beat under two names: a new name is what starts the animation again, on the same element. */
const beats = [keyframes(BEAT), keyframes(BEAT)] as const;

/** What {@link useEnginePulse} gives a mark: how many beats so far, whether it beats at all, and its animation. */
export type EnginePulse = {
  /** Beats so far. */
  pulse: number;
  /** Whether the mark animates: heard at least once, and motion allowed. */
  beating: boolean;
  /** The mark's CSS `animation`: the beat, once — each beat under the other name, so it starts again; `none` while it does not beat. */
  animation: string;
};

/**
 * **A mark that beats once each time a running job's engine is heard**
 * (CTA-194) — an `info` line or an engine server's heartbeat, which move
 * `heardAt` on (the engine session's live payload, `lib/jobs/engineSession.ts`). A beat lasts four of the theme's
 * `transitions.duration.complex` and is never cut short: a word heard while
 * one is under way starts none, so a busy engine beats steadily and a quiet
 * one beats once per heartbeat. Opacity only; under reduced motion the
 * theme's durations are 0 and the mark stays still. Never announced — the
 * words beside it carry it. `undefined` — nothing is heard: no beat.
 *
 * Timed by `heardAt` itself, adjusted during render
 * (`react-hooks/set-state-in-effect`), so it is the same in every tab.
 */
export const useEnginePulse = (heardAt: number | undefined): EnginePulse => {
  const theme = useTheme();
  const durationMs = theme.transitions.duration.complex * 4;
  const [state, setState] = useState<{ pulse: number; at: number; heard: number | undefined }>({
    pulse: 0,
    at: Number.NEGATIVE_INFINITY,
    heard: heardAt,
  });
  if (heardAt !== state.heard) {
    const fresh = heardAt !== undefined && heardAt - state.at >= durationMs;
    setState({ pulse: fresh ? state.pulse + 1 : state.pulse, at: fresh ? heardAt : state.at, heard: heardAt });
  }
  const beating = heardAt !== undefined && state.pulse > 0 && durationMs > 0;
  return {
    pulse: state.pulse,
    beating,
    animation: beating ? `${beats[state.pulse % 2]} ${durationMs}ms ease-in-out 1` : "none",
  };
};
