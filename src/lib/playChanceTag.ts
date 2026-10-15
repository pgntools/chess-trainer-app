/**
 * **The `prc` tag's readers** (CTA-69) — `prc:40` and `[%prc 40]` in a move's
 * comment, read and taken out. Apart from `lib/playChance.ts` (which
 * re-exports them) so that `lib/gameTree.ts`' merge can strip and write them
 * (CTA-208) without an import cycle. Pure.
 */

/** `prc:40`, a whole token; and `[%prc 40]`, the command form. */
const PRC_TEXT = /(^|\s)prc:\s*(\d+(?:\.\d+)?)(?=\s|$)/i;
const PRC_COMMAND = /\[%prc\s+(\d+(?:\.\d+)?)\s*\]/i;
const PRC_ANY = /(^|\s)prc:\s*\d+(?:\.\d+)?(?=\s|$)|\[%prc\s+\d+(?:\.\d+)?\s*\]/gi;

/** A percentage held to 0–100. */
export const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

/** The `prc` a comment carries, or `undefined`. */
export const playChanceInText = (text: string): number | undefined => {
  const plain = PRC_TEXT.exec(text);
  if (plain !== null) return clampPercent(Number(plain[2]));
  const command = PRC_COMMAND.exec(text);
  if (command !== null) return clampPercent(Number(command[1]));
  return undefined;
};

/** The comment with its `prc` marks taken out — what the prose is. */
export const withoutPlayChance = (text: string): string =>
  // A comment with no mark comes back exactly as it was.
  playChanceInText(text) === undefined
    ? text
    : text
        .replace(PRC_ANY, (_, space: string | undefined) => space ?? "")
        .replace(/[ \t]{2,}/g, " ")
        .trim();
