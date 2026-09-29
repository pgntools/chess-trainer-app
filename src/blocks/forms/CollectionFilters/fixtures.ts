import type { CollectionFacets, CollectionFilterValues } from "../../../lib/libraryCollections";

/*
  A collection's facets and filter values (CTA-113), typed with `src/lib/`'s
  own shapes. Imported only by the block's gallery and its test.
*/

/** Everything a collection can hold: players, openings, events, dates, results. */
export const FULL_FACETS: CollectionFacets = {
  players: ["Botvinnik, Mikhail", "Smyslov, Vasily", "Tal, Mikhail", "טל, מיכאל"],
  openings: ["B10 Caro-Kann", "E69 King's Indian, fianchetto"],
  events: ["Candidates", "World Championship"],
  results: ["1-0", "0-1", "1/2-1/2"],
  dates: { min: "1959-01-01", max: "1961-12-31" },
};

/** An upload with players only — one event, no dates, one result. */
export const SPARSE_FACETS: CollectionFacets = {
  players: ["Amy", "Bob"],
  openings: [],
  events: ["Club night"],
  results: ["1-0"],
};

export const NO_FILTERS: CollectionFilterValues = {
  player: [],
  color: "",
  opening: "",
  event: "",
  from: "",
  to: "",
  result: "",
  line: "",
};

export const SOME_FILTERS: CollectionFilterValues = {
  ...NO_FILTERS,
  player: ["Tal, Mikhail"],
  color: "white",
  event: "World Championship",
  from: "1960-01-01",
  result: "1-0",
};
