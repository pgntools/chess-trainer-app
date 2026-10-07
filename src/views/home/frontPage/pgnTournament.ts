import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { TABLE_PAGE_SIZES } from "../../../design-system/components/tables";
import type { TablePaging } from "../../../design-system/patterns/tables";

/**
 * **Where an embed's PGN comes from** (CTA-128): `pgn`, the text itself
 * (`import games from "./event.pgn?raw"`, in the article's own chunk) — or
 * `load`, a function that imports it (`load={() => import("./olym26.pgn?raw")}`),
 * so a large file is a chunk of its own, fetched when the table shows, and
 * the article opens at once. `pgn` wins.
 */
export type PgnSourceProps = {
  pgn?: string;
  load?: () => Promise<string | { default: string }>;
};

/** A source's text: `text`, or why there is none (`error`) — neither while `load` is under way. */
export type PgnText = { text?: string; error?: string };

/** {@link PgnSourceProps} as text. `load` is called once, on mount — a new function on a later render is not a new file. */
export const usePgnSource = ({ pgn, load }: PgnSourceProps): PgnText => {
  const loadOnMount = useRef(load);
  const [loaded, setLoaded] = useState<PgnText>({});
  useEffect(() => {
    const loader = loadOnMount.current;
    if (pgn !== undefined || loader === undefined) return;
    let live = true;
    loader().then(
      (module) => live && setLoaded({ text: typeof module === "string" ? module : module.default }),
      (error: unknown) => live && setLoaded({ error: error instanceof Error ? error.message : String(error) }),
    );
    return () => {
      live = false;
    };
  }, [pgn]);
  if (pgn !== undefined) return { text: pgn };
  if (load === undefined) return { error: "no pgn and nothing to load" };
  return loaded;
};

/**
 * **An embed's paging** (CTA-128) — `rowsPerPage` from the document
 * (`<SwissStandingsTable pgn={games} rowsPerPage="25" />`): absent, or not a
 * page size the pager offers (`TABLE_PAGE_SIZES`: 25, 50, 100, 250), no
 * paging; else the page, held here, starting at the first.
 */
export const useEmbedPaging = (rowsPerPage: number | string | undefined): TablePaging | undefined => {
  const { t } = useTranslation();
  const asked = rowsPerPage === undefined || rowsPerPage === "" ? Number.NaN : Number(rowsPerPage);
  const size = TABLE_PAGE_SIZES.includes(asked) ? asked : undefined;
  const [state, setState] = useState({ page: 0, rowsPerPage: size ?? 25 });
  if (size === undefined) return undefined;
  return {
    ...state,
    onPageChange: (page) => setState((old) => ({ ...old, page })),
    onRowsPerPageChange: (rows) => setState({ page: 0, rowsPerPage: rows }),
    labelRowsPerPage: t("tournament.rowsPerPage"),
  };
};
