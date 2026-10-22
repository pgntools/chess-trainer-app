import { MOVE_SOUND_KINDS, type MoveSoundKind } from "./moveSounds";

/**
 * **Plays the move sounds** (CTA-260) — one `<audio>` element per kind,
 * `public/sounds/<kind>.mp3` under the deployment's `base`, made on first need
 * (a board mounting, {@link preloadMoveSounds}) and never at module load: the
 * pre-render imports this in Node, which has no `Audio`.
 *
 * **It never throws and never complains.** A browser refuses `play()` until
 * the reader has touched the page (its autoplay rule), and a file may fail to
 * load: either way the sound is skipped, silently — a rejected promise caught,
 * a throw swallowed.
 */
const elements = new Map<MoveSoundKind, HTMLAudioElement>();

/** Where a kind's sample is served — `public/sounds/`, under `BASE_URL`. */
export const moveSoundUrl = (kind: MoveSoundKind): string => `${import.meta.env.BASE_URL}sounds/${kind}.mp3`;

const elementFor = (kind: MoveSoundKind): HTMLAudioElement | undefined => {
  if (typeof Audio === "undefined") return undefined;
  let element = elements.get(kind);
  if (element === undefined) {
    element = new Audio(moveSoundUrl(kind));
    element.preload = "auto";
    elements.set(kind, element);
  }
  return element;
};

/** Make every kind's element, so the first sound is not waiting for its file. */
export const preloadMoveSounds = (): void => {
  try {
    for (const kind of MOVE_SOUND_KINDS) elementFor(kind);
  } catch {
    // No audio here — nothing will play.
  }
};

/** Play a kind's sound at `volume` (0–1), from its start — cutting off the same sound still playing. */
export const playMoveSound = (kind: MoveSoundKind, volume: number): void => {
  try {
    const element = elementFor(kind);
    if (element === undefined) return;
    element.volume = Math.min(Math.max(volume, 0), 1);
    element.currentTime = 0;
    const playing = element.play() as Promise<void> | undefined;
    playing?.catch(() => {});
  } catch {
    // Refused or not supported: no sound, and nothing to tell the reader.
  }
};
