import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { DataTable, type DataTableColumn } from "../../../design-system/patterns/tables";
import type { EngineOption } from "../../../lib/engineTypes";

export type EngineOptionsTableProps = {
  /** The options as the engine declared them, in its order. */
  options: readonly EngineOption[];
  /** The table's accessible name ("UCI defaults — Stockfish 19"). */
  ariaLabel: string;
  /** The table's test id; each row is `<testId>-row-<option name>`. */
  testId: string;
};

type Column = "name" | "type" | "default" | "range";

/** What an option may be set to: a spin's bounds, a combo's values, a check's two — or nothing (a button, a string). */
const rangeOf = (option: EngineOption): string | undefined => {
  if (option.type === "spin" && option.min !== undefined && option.max !== undefined) {
    return option.min === option.max ? String(option.min) : `${option.min} – ${option.max}`;
  }
  if (option.type === "combo" && option.vars?.length) return option.vars.join(" / ");
  if (option.type === "check") return "true / false";
  return undefined;
};

/**
 * **What an engine declared** — one row per `option` of its `uci` reply:
 * its name, its type (`spin`, `check`, `combo`, `button`, `string`), its
 * default, and what it may be set to (a spin's bounds — one value where the
 * build pinned it —, a combo's values). Settings → Engine shows it in the
 * right-hand panel for an engine on the engine server, as the server sent it
 * (`GET /v1/engines`, `Threads` and `Hash` under the server's ceilings).
 *
 * Presentational and read-only: the options arrive as a prop, verbatim — the
 * engine's own words, so every cell is set left to right. A missing value is
 * a dash; a string option's `<empty>` default is shown as the engine wrote it.
 */
function EngineOptionsTable({ options, ariaLabel, testId }: EngineOptionsTableProps) {
  const { t } = useTranslation();
  const none = t("engineOptionsTable.none");

  const columns = useMemo<DataTableColumn<EngineOption, Column>[]>(
    () => [
      { id: "name", header: t("engineOptionsTable.columns.name"), dir: "ltr", render: (option) => option.name },
      { id: "type", header: t("engineOptionsTable.columns.type"), dir: "ltr", render: (option) => option.type },
      {
        id: "default",
        header: t("engineOptionsTable.columns.default"),
        dir: "ltr",
        render: (option) => option.defaultValue ?? none,
      },
      {
        id: "range",
        header: t("engineOptionsTable.columns.range"),
        dir: "ltr",
        wrap: true,
        render: (option) => rangeOf(option) ?? none,
      },
    ],
    [t, none],
  );

  return (
    <DataTable<EngineOption, Column>
      columns={columns}
      rows={options}
      rowId={(option) => option.name}
      density="dense"
      stickyHeader={false}
      emptyLabel={t("engineOptionsTable.empty")}
      ariaLabel={ariaLabel}
      testId={testId}
    />
  );
}

export default EngineOptionsTable;
