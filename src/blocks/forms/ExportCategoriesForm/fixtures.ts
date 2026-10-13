import type { ExportCategory, ExportSelection } from "../../../lib/dataExport";

/*
  The export form's sample selections and counts (CTA-109), typed with
  `src/lib/dataExport.ts`'s own. Imported only by the block's gallery and its test.
*/

export const NOTHING: ExportSelection = {
  collections: false,
  games: false,
  repertoires: false,
  enginePresets: false,
  analysisProjects: false,
  shippedCollections: false,
};

export const EVERYTHING: ExportSelection = {
  collections: true,
  games: true,
  repertoires: true,
  enginePresets: true,
  analysisProjects: true,
  shippedCollections: true,
};

export const COUNTS: Readonly<Record<ExportCategory, number | undefined>> = {
  collections: 3,
  games: 128,
  repertoires: 7,
  enginePresets: 2,
  analysisProjects: 4,
};

/** Every store still being read. */
export const READING: Readonly<Record<ExportCategory, number | undefined>> = {
  collections: undefined,
  games: undefined,
  repertoires: undefined,
  enginePresets: undefined,
  analysisProjects: undefined,
};

export const SHIPPED = 4;
