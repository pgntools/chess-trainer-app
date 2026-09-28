import type { EngineOption } from "../../../lib/engine";

/**
 * **What the running engine lets a slider do** (CTA-109) — the three states
 * `views/shared/OptionSlider.tsx` renders, as a pure rule:
 *
 * | The engine declared | The slider |
 * | --- | --- |
 * | nothing (no such option) | `absent` — off, "this build has no such option" |
 * | `min` equal to `max` | `pinned` — off, "this build fixes it at N" |
 * | a real range | `adjustable`, with that range |
 *
 * Before the handshake lands the caller passes a placeholder (`{ name, type:
 * "spin" }`), so nothing reads as missing on every mount; the fallback bounds
 * serve until the engine's own arrive. `maxOffered` only ever narrows the top.
 */
export type EngineOptionState =
  | { kind: "adjustable"; min: number; max: number }
  | { kind: "pinned"; min: number; max: number; fixedAt: number }
  | { kind: "absent"; min: number; max: number };

export const engineOptionState = (
  option: EngineOption | undefined,
  fallback: { min: number; max: number },
  maxOffered?: number,
): EngineOptionState => {
  const min = option?.min ?? fallback.min;
  const engineMax = option?.max ?? fallback.max;
  const max = maxOffered === undefined ? engineMax : Math.min(engineMax, maxOffered);
  if (option === undefined) return { kind: "absent", min, max };
  if (option.min !== undefined && option.min === option.max) return { kind: "pinned", min, max, fixedAt: option.min };
  return { kind: "adjustable", min, max };
};

/** An option's part of a test id — `Skill Level` → `skill-level`, OptionSlider's own rule. */
export const optionSlug = (optionName: string): string => optionName.replace(/\s+/g, "-").toLowerCase();
