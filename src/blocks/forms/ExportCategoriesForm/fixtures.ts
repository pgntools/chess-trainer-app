import type { ExportCategory, ExportSelection } from "../../../lib/dataExport";

/*
  The export form's sample selections and counts (CTA-109), typed with
  `src/lib/dataExport.ts`'s own. Imported only by the block's gallery and its test.
*/

export const NOTHING: ExportSelection = { collections: false, games: false, analyses: false, repertoires: false, shippedCollections: false };

export const EVERYTHING: ExportSelection = { collections: true, games: true, analyses: true, repertoires: true, shippedCollections: true };

export const COUNTS: Readonly<Record<ExportCategory, number | undefined>> = { collections: 3, games: 128, analyses: 42, repertoires: 7 };

/** Every store still being read. */
export const READING: Readonly<Record<ExportCategory, number | undefined>> = {
  collections: undefined,
  games: undefined,
  analyses: undefined,
  repertoires: undefined,
};

export const SHIPPED = 4;
