/**
 * **Tags stamped onto games** (CTA-234) — the Library's import popup's TAGS
 * field: tag pairs the reader types, one per line, added to every game an
 * import keeps. Pure text work, no `chess.js`: the movetext is never read.
 *
 * - {@link readTagLines} reads the field: each non-blank line one PGN tag
 *   pair, `[Name "Value"]`, the value's escapes the standard's two (`\"` and
 *   `\\`); a line that is none is a {@link TagLineProblem} naming the line
 *   and why. **A name typed twice: the last one wins.**
 * - {@link stampPgnTags} writes them onto one game's text: a tag the game
 *   carries gets the typed value in its place (no second tag of the name), a
 *   tag it lacks is added to its tag section — a Seven Tag Roster tag in its
 *   roster place, any other at the section's end — and a game with no tag
 *   section is given one. Every other line, the movetext too, is untouched.
 */

/** One tag pair to stamp: its name and its value, unescaped. */
export type PgnTag = { name: string; value: string };

/** Why a line of the field is not a tag pair. */
export type TagLineProblemReason =
  /** Not `[Name "Value"]` at all — a bracket, a quote or the space missing. */
  | "syntax"
  /** The name holds something other than letters, digits and `_`. */
  | "name"
  /** A `"` not escaped, or a `\` before anything but `"` or `\`. */
  | "escape";

/** A line of the field that is not a tag pair: its 1-based number and why. */
export type TagLineProblem = { line: number; reason: TagLineProblemReason };

/**
 * The Seven Tag Roster, in its order — the tags every PGN game carries
 * first, so one added is put where the standard has it.
 */
export const SEVEN_TAG_ROSTER = ["Event", "Site", "Date", "Round", "White", "Black", "Result"] as const;

const rosterIndexOf = (name: string): number => (SEVEN_TAG_ROSTER as readonly string[]).indexOf(name);

/** A line the field takes apart: `[`, a name, the space, a quoted value, `]`. */
const TYPED = /^\s*\[\s*([^\s"\]]*)\s+"(.*)"\s*\]\s*$/;
/** A name the PGN reader takes (`lib/pgn.ts`'s). */
const NAME = /^[A-Za-z0-9_]+$/;
/** A value's text as written: no bare `"`, a `\` only before `"` or `\`. */
const VALUE = /^(?:[^"\\]|\\["\\])*$/;
/** A game's tag line, as `lib/pgn.ts` reads one — its name in group 1. */
const GAME_TAG = /^[ \t]*\[[ \t]*([A-Za-z0-9_]+)[ \t]+"(?:[^"\\]|\\.)*"[ \t]*\][ \t]*$/;

/**
 * The field's tag pairs, or what is wrong with it. Blank lines are skipped;
 * a name typed again replaces the first one's value (keeping its place).
 * Any problem leaves `tags` read from the good lines alone — the host
 * imports only when `problems` is empty.
 */
export const readTagLines = (text: string): { tags: PgnTag[]; problems: TagLineProblem[] } => {
  const byName = new Map<string, string>();
  const problems: TagLineProblem[] = [];
  text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .forEach((raw, index) => {
      if (raw.trim() === "") return;
      const line = index + 1;
      const match = TYPED.exec(raw);
      if (match === null) {
        problems.push({ line, reason: "syntax" });
        return;
      }
      const [, name = "", written = ""] = match;
      if (!NAME.test(name)) {
        problems.push({ line, reason: "name" });
        return;
      }
      if (!VALUE.test(written)) {
        problems.push({ line, reason: "escape" });
        return;
      }
      byName.set(name, written.replace(/\\(["\\])/g, "$1"));
    });
  return { tags: [...byName].map(([name, value]) => ({ name, value })), problems };
};

/** A tag pair as PGN writes it, its value escaped. */
export const pgnTagLine = ({ name, value }: PgnTag): string => `[${name} "${value.replace(/["\\]/g, "\\$&")}"]`;

/**
 * One game's text with `tags` stamped on (see the module's note). No tags:
 * the same string back.
 */
export const stampPgnTags = (pgn: string, tags: readonly PgnTag[]): string => {
  if (tags.length === 0) return pgn;
  const lines = pgn.replace(/\r\n?/g, "\n").split("\n");
  // The tag section: the run of tag lines from the first line that is not blank.
  let start = 0;
  while (start < lines.length && (lines[start] ?? "").trim() === "") start++;
  let end = start;
  while (end < lines.length && GAME_TAG.test(lines[end] ?? "")) end++;

  const typed = new Map(tags.map((tag) => [tag.name, tag]));
  /** The section as it will be written: each line, and the name it carries. */
  const section: { name: string; line: string }[] = [];
  const placed = new Set<string>();
  for (const line of lines.slice(start, end)) {
    const name = GAME_TAG.exec(line)?.[1] ?? "";
    const tag = typed.get(name);
    if (tag === undefined) {
      section.push({ name, line });
    } else if (!placed.has(name)) {
      // The typed value in the game's own tag's place; a second of the name goes.
      section.push({ name, line: pgnTagLine(tag) });
      placed.add(name);
    }
  }
  // The roster's tags the game lacks, each after the last tag that comes before it in the roster.
  for (const name of SEVEN_TAG_ROSTER) {
    const tag = typed.get(name);
    if (tag === undefined || placed.has(name)) continue;
    const rank = rosterIndexOf(name);
    let at = 0;
    section.forEach((entry, index) => {
      const other = rosterIndexOf(entry.name);
      if (other !== -1 && other < rank) at = index + 1;
    });
    section.splice(at, 0, { name, line: pgnTagLine(tag) });
    placed.add(name);
  }
  // Any other tag the game lacks, at the section's end, in the typed order.
  for (const tag of tags) {
    if (placed.has(tag.name)) continue;
    section.push({ name: tag.name, line: pgnTagLine(tag) });
    placed.add(tag.name);
  }

  const written = section.map((entry) => entry.line);
  // A game with no tag section is given one, a blank line between it and the movetext.
  const rest = end === start ? (start < lines.length ? ["", ...lines.slice(start)] : []) : lines.slice(end);
  return [...lines.slice(0, start), ...written, ...rest].join("\n");
};
