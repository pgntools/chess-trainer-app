import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../gallery/types";
import type { PatternSectionId } from "../../sections";
import Bracket, { type BracketMatch, type BracketProps, type BracketRound } from "./Bracket";

/** A match between two names: the scores as written, the winner the higher, its words built from them. */
const match = (id: string, a: string, b: string, scoreA: string, scoreB: string, extra: { detail?: [string, string]; prefix?: [string?, string?] } = {}): BracketMatch => {
  const value = (score: string) => Number.parseFloat(score.replace("½", ".5"));
  const winner = value(scoreA) > value(scoreB) ? 0 : value(scoreB) > value(scoreA) ? 1 : undefined;
  return {
    id,
    sides: [
      { id: "a", name: a, score: scoreA, detail: extra.detail?.[0], prefix: extra.prefix?.[0], winner: winner === 0 },
      { id: "b", name: b, score: scoreB, detail: extra.detail?.[1], prefix: extra.prefix?.[1], winner: winner === 1 },
    ],
    label: `${a} ${scoreA}, ${b} ${scoreB}${winner === undefined ? "" : `: ${winner === 0 ? a : b} goes through`}`,
  };
};

const EIGHT: BracketRound[] = [
  {
    id: "1",
    title: "Quarter-finals",
    matches: [
      match("1", "Ada Lovelace", "Alan Turing", "2", "0", { prefix: ["Dr"] }),
      match("2", "Grace Hopper", "Donald Knuth", "1½", "2½", { prefix: [undefined, "Prof"] }),
      match("3", "Barbara Liskov", "Edsger Dijkstra", "3", "1"),
      match("4", "John McCarthy", "Frances Allen", "½", "1½"),
    ],
  },
  { id: "2", title: "Semi-finals", matches: [match("5", "Ada Lovelace", "Donald Knuth", "1½", "½"), match("6", "Barbara Liskov", "Frances Allen", "2", "4")] },
  { id: "3", title: "Final", matches: [match("7", "Ada Lovelace", "Frances Allen", "2½", "1½")] },
];

const demo = (props: Partial<BracketProps> = {}) => (
  <Box sx={{ width: 0, minWidth: "100%" }}>
    <Bracket rounds={EIGHT} ariaLabel="Computing cup — bracket" emptyLabel="No matches yet." testId="gallery-bracket" {...props} />
  </Box>
);

const gallery: GalleryModule<PatternSectionId> = {
  section: "tables",
  title: "Bracket",
  demos: [
    { name: "A knockout of eight — three rounds, each match's winner bold and marked, read in words", render: () => demo() },
    {
      name: "A team knockout — the legs won as the score, the board points muted after it",
      render: () =>
        demo({
          rounds: [
            {
              id: "1",
              title: "Semi-finals",
              matches: [
                match("1", "Lovelace Club", "Turing Club", "2", "1", { detail: ["(10)", "(8)"] }),
                match("2", "Hopper Club", "Knuth Club", "½", "1½", { detail: ["(5)", "(7)"] }),
              ],
            },
            { id: "2", title: "Final", matches: [match("3", "Lovelace Club", "Knuth Club", "1", "1", { detail: ["(6)", "(6)"] })] },
          ],
        }),
    },
    {
      name: "A final round with a match for third place, captioned",
      render: () =>
        demo({
          rounds: [
            ...EIGHT.slice(0, 2),
            {
              id: "3",
              title: "Final",
              matches: [
                match("7", "Ada Lovelace", "Frances Allen", "2½", "1½"),
                { ...match("8", "Donald Knuth", "Barbara Liskov", "1", "2"), caption: "Match for third place" },
              ],
            },
          ],
        }),
    },
    {
      name: "Unfinished — the final level, no winner yet",
      render: () => demo({ rounds: [...EIGHT.slice(0, 2), { id: "3", title: "Final", matches: [match("7", "Ada Lovelace", "Frances Allen", "1", "1")] }] }),
    },
    { name: "Still being read", render: () => demo({ loading: true, loadingLabel: "Reading the bracket…" }) },
    { name: "No round at all", render: () => demo({ rounds: [] }) },
    {
      name: "Long names — cut short in view, read whole",
      render: () =>
        demo({
          rounds: [
            {
              id: "1",
              title: "Final",
              matches: [match("1", "Augusta Ada King, Countess of Lovelace", "Alan Mathison Turing of King's College, Cambridge", "2", "1")],
            },
          ],
        }),
    },
    {
      name: "Hebrew names (switch the direction to RTL — the rounds run right to left)",
      render: () =>
        demo({
          ariaLabel: "גביע — טבלת נוקאאוט",
          rounds: [
            { id: "1", title: "חצי גמר", matches: [match("1", "עדה לאבלייס", "אלן טיורינג", "2", "0"), match("2", "גרייס הופר", "דונלד קנות'", "1", "3")] },
            { id: "2", title: "גמר", matches: [match("3", "עדה לאבלייס", "דונלד קנות'", "1½", "½")] },
          ],
        }),
    },
    { name: "Dense", render: () => demo({ density: "dense" }) },
    {
      name: "Linked — each name to its games, each game under its match (CTA-128)",
      render: () =>
        demo({
          gamesLabel: "Games",
          rounds: EIGHT.map((round) => ({
            ...round,
            matches: round.matches.map((one) => ({
              ...one,
              sides: [
                { ...one.sides[0], link: { href: `#player-${one.id}-a` } },
                { ...one.sides[1], link: { href: `#player-${one.id}-b` } },
              ] as const,
              games: ["1", "½", "0", "½"].map((label, index) => ({
                id: String(index + 1),
                label,
                name: `Game ${index + 1}: ${one.sides[0].name} ${label}`,
                link: { href: `#game-${one.id}-${index + 1}` },
              })),
            })),
          })),
        }),
    },
  ],
};

export default gallery;
