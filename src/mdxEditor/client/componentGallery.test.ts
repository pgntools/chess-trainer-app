import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { splitPgnGames } from "../../lib/pgn";
import { MDX_ALIASES, mdxComponents } from "../../views/home/frontPage";
import { elementsIn, SETTINGS } from "./componentSettings";
import { builtInsOf, collectionSourceFor, GALLERY, galleryEntries, libraryEntryFor, imageSnippetOf, misfitOf, SAMPLE_IMAGE, sampleOf, snippetOf, sourceKindOf, tournamentMisfitOf } from "./componentGallery";
import { guessOf } from "./libraryLookup";

/*
  The Components gallery's index (CTA-140): every component an article
  embeds, one entry each by component — one component, any source — each
  opening on a shipped sample that fits it: a PGN beside the Blog's
  articles, or a Library collection.
*/

const ARTICLES = "src/views/blog/articles";
const manifest = JSON.parse(readFileSync("src/data/library/manifest.json", "utf8")) as { collections: { id: string; pgn: string }[] };
/** Markdown's own elements, which the map renders prose with — not components an article names. */
const PROSE = new Set(["h1", "h2", "h3", "p", "ul", "ol", "li", "a", "hr", "pre", "code"]);
/** The components an article embeds — but the older names that are another with a source. */
const embeds = Object.keys(mdxComponents).filter((name) => !PROSE.has(name) && !MDX_ALIASES.has(name));
const entries = galleryEntries();

/** A sample's games, read from disk as the page reads them from the build. */
const sampleGames = (entry: (typeof entries)[number]): string[] => {
  const sample = entry.sample;
  if (sample === undefined) return [];
  if ("file" in sample) return splitPgnGames(readFileSync(`${ARTICLES}/${sample.file}`, "utf8"));
  const collection = manifest.collections.find((candidate) => `/library/${candidate.id}` === sample.address.replace(/\/\d+$/, ""));
  return collection === undefined ? [] : splitPgnGames(readFileSync(`src/data/library/${collection.pgn}`, "utf8"));
};

describe("the gallery's index", () => {
  it("has every component an article embeds, and nothing unknown but a mock — the aliases left out", () => {
    expect([...MDX_ALIASES].every((name) => name in mdxComponents)).toBe(true);
    const named = new Set(entries.filter((entry) => entry.mock === undefined).map((entry) => entry.component));
    expect([...named].sort()).toEqual([...embeds].sort());
    expect(entries.filter((entry) => entry.mock !== undefined).map((entry) => entry.component)).toEqual(["PlayerGames", "PuzzleBoard"]);
  });

  it("files them in its folders, each entry's id its own", () => {
    expect(GALLERY.map((folder) => folder.title)).toEqual(["Boards", "Collections", "Repertoires", "Tournament tables", "Images", "Other", "Future components"]);
    const ids = [...GALLERY.map((folder) => folder.id), ...entries.map((entry) => entry.id)];
    expect(new Set(ids).size).toBe(ids.length);
    const boards = GALLERY.find((folder) => folder.id === "boards")?.entries.map((entry) => entry.component);
    expect(boards).toEqual(["InlinePgnGame", "InlinePgnGame2colH", "InlinePgnGame2colV"]);
  });

  it("opens every entry that reads a game on a shipped sample that fits it", () => {
    for (const entry of entries) {
      const source = sampleOf(entry);
      if (entry.reads.length === 0) {
        expect(source, entry.id).toBeUndefined();
        continue;
      }
      expect(source, entry.id).toBeDefined();
      if (source === undefined) continue;
      expect(misfitOf(entry, source), entry.id).toBeUndefined();
      if (source.kind === "file") expect(existsSync(`${ARTICLES}/${source.file}`), source.file).toBe(true);
      // A file's PGN written in is that file's text.
      else if (source.kind === "pasted" && entry.sample !== undefined && "file" in entry.sample) expect(source.text, entry.id).toBe(readFileSync(`${ARTICLES}/${entry.sample.file}`, "utf8"));
      else if (source.kind === "address" && "collection" in source.address) expect(manifest.collections.map((collection) => collection.id), entry.id).toContain(source.address.collection);
    }
  });

  it("opens every tournament table on games that look like its kind of tournament", () => {
    for (const entry of entries.filter((candidate) => candidate.tournament !== undefined)) {
      const guess = guessOf(sampleGames(entry));
      expect(guess, entry.id).toBeDefined();
      expect(entry.tournament, entry.id).toContain(guess?.kind);
      const source = sampleOf(entry);
      if (source !== undefined) expect(tournamentMisfitOf(entry, source, guess), entry.id).toBeUndefined();
    }
  });

  it("writes each snippet whole: the PGN's definition, then the component, its settings readable", () => {
    for (const entry of entries) {
      const code = entry.image === true ? imageSnippetOf(SAMPLE_IMAGE.file, SAMPLE_IMAGE.alt) : snippetOf(entry, sampleOf(entry));
      expect(code, entry.id).toContain(`<${entry.component}`);
      // Every self-closing component has a form, or says it has none (`<NavCards>`).
      if (elementsIn(code, entry.component).length > 0 && entry.component !== "NavCards") expect(SETTINGS[entry.component], entry.id).toBeDefined();
    }
    const swiss = entries.find((entry) => entry.id === "swiss-standings");
    if (swiss === undefined) throw new Error("no Swiss entry");
    expect(snippetOf(swiss, sampleOf(swiss))).toBe(
      'import games from "./tournaments/20th-werner-obermeyer-swiss-5r.pgn?raw"\n\n<SwissStandingsTable pgn={games} density="dense" rowsPerPage="25" />',
    );
    expect(snippetOf(swiss, { kind: "pasted", text: "[Event \"`x`\"]\n\n1. e4 *" })).toBe(
      'export const games = `[Event "\\`x\\`"]\n\n1. e4 *`\n\n<SwissStandingsTable pgn={games} density="dense" rowsPerPage="25" />',
    );
    expect(existsSync(`${ARTICLES}/${SAMPLE_IMAGE.file}`)).toBe(true);
  });

  it("says when a source does not fit — the wrong kind of source, or games of another kind of tournament", () => {
    const card = entries.find((entry) => entry.id === "collection-card");
    const swiss = entries.find((entry) => entry.id === "swiss-standings");
    if (card === undefined || swiss === undefined) throw new Error("missing entries");
    const tal = { kind: "address", address: { kind: "collection", collection: "tal" } } as const;
    expect(sourceKindOf(tal)).toBe("collection");
    expect(misfitOf(card, { kind: "address", address: { kind: "analysis", id: "a1" } })).toBe(
      "<CollectionCard> does not read a saved analysis: it reads a whole Library collection, /library/<collection> or one Library game, /library/<collection>/<n>.",
    );
    expect(misfitOf(card, { kind: "pasted", text: "1. e4 *" })).toMatch(/^<CollectionCard> does not read a PGN/);
    // A table reads a PGN or a collection alike — one component, any source.
    expect(misfitOf(swiss, tal)).toBeUndefined();
    expect(misfitOf(swiss, { kind: "address", address: { kind: "repertoire", id: "r" } })).toBe(
      "<SwissStandingsTable> does not read a repertoire: it reads a PGN or a whole Library collection, /library/<collection>.",
    );
    expect(tournamentMisfitOf(swiss, { kind: "file", file: "x.pgn" }, { kind: "match", reason: "12 games between two players" })).toBe(
      "The games look like a match — 12 games between two players. <SwissStandingsTable> may not show them as they are: try Match, <MatchTable>.",
    );
  });

  it("writes an address as the component's src — the same component as for a PGN", () => {
    const byId = (id: string) => {
      const entry = entries.find((candidate) => candidate.id === id);
      if (entry === undefined) throw new Error(`no ${id}`);
      return entry;
    };
    const address = (path: string) => {
      const source = sampleOf({ ...byId("swiss-standings"), sample: { address: path } });
      if (source === undefined) throw new Error(`no address ${path}`);
      return source;
    };
    expect(snippetOf(byId("swiss-standings"), address("/library/candidates2026"))).toBe('<SwissStandingsTable src="/library/candidates2026" density="dense" rowsPerPage="25" />');
    expect(snippetOf(byId("double-elimination-bracket"), address("/library/esportsplayin2026"))).toBe('<KnockoutBracket src="/library/esportsplayin2026" losersFromRound="51" />');
    expect(snippetOf(byId("inline-pgn-game"), address("/repertoires/r7"))).toBe('<InlinePgnGame src="/repertoires/r7" />');
    expect(snippetOf(byId("inline-pgn-game"), address("/library/tal"))).toBe('<InlinePgnGame src="/library/tal" game="1" />');
    expect(snippetOf(byId("inline-pgn-game-2col-v"), address("/tools/analysis?analysis=a1"))).toBe('<InlinePgnGame2colV src="/tools/analysis?analysis=a1" />');
  });

  it("offers as built-in examples only what fits: the entry's own first, then the Blog's PGNs or the shipped collections", () => {
    const files = ["tournaments/chned26.pgn", "tournaments/20th-werner-obermeyer-swiss-5r.pgn"];
    const collections = [{ id: "tal", name: "Tal" }, { id: "capablanca", name: "Capablanca" }];
    const byId = (id: string) => {
      const entry = entries.find((candidate) => candidate.id === id);
      if (entry === undefined) throw new Error(`no ${id}`);
      return builtInsOf(entry, files, collections);
    };
    expect(byId("swiss-standings")[0].label).toBe("tournaments/20th-werner-obermeyer-swiss-5r.pgn (the default)");
    // A one-game board: the Blog's game written in, by an id of its own — the same file imported one of the others.
    expect(byId("inline-pgn-game").slice(0, 2).map((example) => [example.id, example.source.kind])).toEqual([
      ["inline:writing-an-article/inline-pgn/rubinstein-capablanca-1911.pgn", "pasted"],
      ["tournaments/chned26.pgn", "file"],
    ]);
    // A table: the Blog's PGNs and the shipped collections both.
    expect(byId("swiss-standings").map((example) => example.id)).toEqual(["tournaments/20th-werner-obermeyer-swiss-5r.pgn", "tournaments/chned26.pgn", "/library/tal", "/library/capablanca"]);
    expect(byId("collection-card").map((example) => example.label)).toEqual(["Capablanca — /library/capablanca (the default)", "Tal — /library/tal"]);
    // A component that reads a PGN or the Library: both.
    expect(byId("board-row").map((example) => example.id)).toEqual(["/library/capablanca", ...files, "/library/tal"]);
    expect(byId("nav-cards")).toEqual([]);
    for (const entry of entries) for (const example of builtInsOf(entry, files, collections)) expect(misfitOf(entry, example.source), `${entry.id} ${example.id}`).toBeUndefined();
  });

  it("shows a PGN saved as a collection in the same entry — one component, any source", () => {
    const byId = (id: string) => {
      const entry = entries.find((candidate) => candidate.id === id);
      if (entry === undefined) throw new Error(`no ${id}`);
      return entry;
    };
    for (const id of ["swiss-standings", "team-standings", "inline-pgn-game", "collection-card"]) expect(libraryEntryFor(byId(id))?.id).toBe(id);
    expect(libraryEntryFor(byId("puzzle-board"))).toBeUndefined();
    expect(collectionSourceFor({ ...byId("collection-card"), reads: ["libraryGame"] }, "u1")).toEqual({ kind: "address", address: { kind: "libraryGame", collection: "u1", number: 1 } });
    expect(collectionSourceFor(byId("swiss-standings"), "u1")).toEqual({ kind: "address", address: { kind: "collection", collection: "u1" } });
  });
});
