import { describe, expect, it } from "vitest";

import type { AnalysisCase, AnalysisProject } from "../../lib/analysisProjects";
import type { CollectionSummary } from "../../lib/libraryCollections";
import type { PlayedGame } from "../../lib/playedGames";
import type { SavedRepertoire } from "../../lib/savedRepertoires";
import { ADDRESS_GROUP_LIMIT, addressEntriesOf, addressOptionsOf, type AddressRecords } from "./addressOptions";

const pgn = (white: string, black: string, event = "Club") => `[Event "${event}"]\n[White "${white}"]\n[Black "${black}"]\n[Result "*"]\n\n1. e4 *`;

const collection = (id: string, name: string) => ({ id, name, source: "uploaded", count: 3 }) as CollectionSummary;
const repertoire = (id: string, name: string) => ({ id, name, pgn: pgn("?", "?") }) as SavedRepertoire;

const RECORDS: AddressRecords = {
  collections: [collection("candidates2026", "Candidates 2026"), collection("u1", "ספרדית — משחקים")],
  cases: [],
  projects: [],
  repertoires: [repertoire("caro", "My Caro-Kann"), repertoire("blank", "  ")],
  playedGames: [{ id: "g1", pgn: pgn("You", "Stockfish", "Play with Engine"), savedAt: "2026-10-07T10:00:00.000Z" } as PlayedGame],
};

const entries = addressEntriesOf(RECORDS);
const valuesOf = (text: string) => addressOptionsOf(entries, text).map((option) => option.value);

describe("addressOptions (CTA-150)", () => {
  it("offers every kind of record as its canonical path, under its kind", () => {
    expect(addressOptionsOf(entries, "").map(({ value, group }) => [value, group])).toEqual([
      ["/library/candidates2026", "Library"],
      ["/library/u1", "Library"],
      ["/repertoires/caro", "Repertoires"],
      ["/repertoires/blank", "Repertoires"],
      ["/engine/play?saved=g1", "Played games"],
    ]);
  });

  it("finds by words of the name, in any case and any order — Hebrew too", () => {
    expect(valuesOf("CARO kann")).toEqual(["/repertoires/caro"]);
    expect(valuesOf("משחקים")).toEqual(["/library/u1"]);
    expect(valuesOf("stockfish you")).toEqual(["/engine/play?saved=g1"]);
    expect(valuesOf("nothing like it")).toEqual([]);
  });

  it("names an untitled record as the app's lists do, and a played game by its players and day", () => {
    const labels = (text: string) => addressOptionsOf(entries, text).map((option) => option.label);
    expect(labels("untitled")).toEqual(["An untitled repertoire"]);
    expect(labels("stockfish")).toEqual(["You – Stockfish, 2026-10-07"]);
  });

  it("offers nothing for an address — pasted, with its host, or typed from its first slash", () => {
    expect(valuesOf("/library/cand")).toEqual([]);
    expect(valuesOf("http://localhost:5173/chess-trainer-app/he/repertoires/caro")).toEqual([]);
    expect(valuesOf("https://chessapp.dev/library/candidates2026")).toEqual([]);
  });

  it("offers an Analysis case by its name or its game's players, and finds it by its Project's name too (CTA-192)", () => {
    const record = (id: string, name: string, white: string) =>
      ({ id, name, type: "game", projectId: "p1", source: { kind: "pgn", pgn: pgn(white, "Lee"), startPath: [], fen: "" }, pgn: "" }) as unknown as AnalysisCase;
    const withCases = addressEntriesOf({
      ...RECORDS,
      cases: [record("c1", "", "Kim"), record("c2", "My study", "Ann")],
      projects: [{ id: "p1", name: "Najdorf" } as AnalysisProject],
    });
    expect(addressOptionsOf(withCases, "najdorf").map(({ value, label, group }) => [value, label, group])).toEqual([
      ["/analysis/projects/p1/cases/c1", "Kim – Lee, Club", "Analysis cases"],
      ["/analysis/projects/p1/cases/c2", "My study", "Analysis cases"],
    ]);
  });

  it("cuts each group short, so thousands of cases stay a short list", () => {
    const cases = Array.from(
      { length: 5000 },
      (_, index) =>
        ({ id: `c${index}`, name: "", type: "game", projectId: "p", source: { kind: "pgn", pgn: pgn(`Player ${index}`, "Opponent"), startPath: [], fen: "" }, pgn: "" }) as unknown as AnalysisCase,
    );
    const many = addressEntriesOf({ ...RECORDS, cases });
    const found = addressOptionsOf(many, "opponent");
    expect(found.filter((option) => option.group === "Analysis cases")).toHaveLength(ADDRESS_GROUP_LIMIT);
    expect(addressOptionsOf(many, "player 4999").map((option) => option.value)).toEqual(["/analysis/projects/p/cases/c4999"]);
  });
});
