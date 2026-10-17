import type { CollectionFilterValues } from "../../../lib/libraryCollections";

/*
  A collection's filter values (CTA-230), typed with `src/lib/`'s own shape —
  what the folded rail counts. Imported only by the block's gallery and its test.
*/

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

/** Two players as White and a start date: three filters on. */
export const THREE_FILTERS: CollectionFilterValues = {
  ...NO_FILTERS,
  player: ["Tal, Mikhail", "Smyslov, Vasily"],
  color: "white",
  from: "1960-01-01",
};

/** Every filter on, and then some: more than the badge shows. */
export const EVERY_FILTER: CollectionFilterValues = {
  player: ["Tal, Mikhail"],
  color: "black",
  opening: "B9",
  event: "Candidates",
  from: "1959-01-01",
  to: "1961-12-31",
  result: "1-0",
  line: "e4,c5",
};
