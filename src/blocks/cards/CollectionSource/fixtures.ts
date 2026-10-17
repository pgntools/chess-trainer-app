import type { CollectionSources } from "../../../lib/libraryCollections";

/*
  The source card's samples (CTA-233) — as The Week in Chess writes its
  `Source…` tags. Imported only by the block's gallery and its test.
*/

/** One issue of The Week in Chess, every game from it. */
export const TWIC: CollectionSources = {
  entries: [
    {
      tags: [
        { name: "SourceTitle", value: "The Week in Chess 1662" },
        { name: "Source", value: "Mark Crowther" },
        { name: "SourceDate", value: "2026.09.14" },
      ],
      games: 412,
    },
  ],
  untagged: 0,
};

/** Two issues merged into one collection, and a few games of the reader's own naming none. */
export const MERGED: CollectionSources = {
  entries: [
    {
      tags: [
        { name: "SourceTitle", value: "The Week in Chess 1661" },
        { name: "Source", value: "Mark Crowther" },
        { name: "SourceDate", value: "2026.09.07" },
      ],
      games: 1240,
    },
    {
      tags: [
        { name: "SourceTitle", value: "The Week in Chess 1662" },
        { name: "Source", value: "Mark Crowther" },
        { name: "SourceDate", value: "2026.09.14" },
      ],
      games: 1180,
    },
  ],
  untagged: 3,
};

/** Every tag PGN names, and one it does not — labelled by its name. */
export const EVERY_TAG: CollectionSources = {
  entries: [
    {
      tags: [
        { name: "SourceTitle", value: "Mega Database 2026" },
        { name: "Source", value: "ChessBase" },
        { name: "SourceDate", value: "2025.11.20" },
        { name: "SourceVersion", value: "1" },
        { name: "SourceVersionDate", value: "2025.11.20" },
        { name: "SourceEdition", value: "2" },
        { name: "SourceEditionDate", value: "2026.01.05" },
        { name: "SourceQuality", value: "1" },
        { name: "SourceURL", value: "https://example.com/mega-2026" },
      ],
      games: 25,
    },
  ],
  untagged: 0,
};

/** One source over some of the games — counted, beside those naming none. */
export const PARTLY: CollectionSources = {
  entries: [{ tags: [{ name: "Source", value: "מועדון השחמט תל אביב" }], games: 18 }],
  untagged: 1,
};
