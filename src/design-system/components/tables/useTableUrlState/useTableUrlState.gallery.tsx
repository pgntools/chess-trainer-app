import Box from "@mui/material/Box";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";

import { DEMO_GAMES } from "../../../gallery/demoTable";
import type { GalleryModule } from "../../../gallery/types";
import WithHook from "../../../gallery/WithHook";
import WithState from "../../../gallery/WithState";
import { IconAction } from "../../toolbars";
import DateCell from "../DateCell/DateCell";
import EmptyTableRow from "../EmptyTableRow/EmptyTableRow";
import NumberCell from "../NumberCell/NumberCell";
import PickCell from "../PickCell/PickCell";
import PickHeaderCell from "../PickHeaderCell/PickHeaderCell";
import RowActionsCell from "../RowActionsCell/RowActionsCell";
import SortHeaderCell from "../SortHeaderCell/SortHeaderCell";
import TableFrame from "../TableFrame/TableFrame";
import TablePager from "../TablePager/TablePager";
import { sortRows, type SortDirection } from "./sortRows";
import { useTableUrlState } from "./useTableUrlState";

type Column = "white" | "black" | "elo" | "moves" | "date";
const COLUMNS: readonly Column[] = ["white", "black", "elo", "moves", "date"];
const LABELS: Record<Column, string> = { white: "White", black: "Black", elo: "Elo", moves: "Moves", date: "Date" };
/** Dates and numbers open high first, text A to Z — the tables' rule. */
const firstDirection = (column: Column): SortDirection => (column === "white" || column === "black" ? "asc" : "desc");
/** Many rows, so the pager has pages to turn. */
const ROWS = Array.from({ length: 60 }, (_, index) => {
  const game = DEMO_GAMES[index % DEMO_GAMES.length];
  return { ...game, id: `${game.id}-${index}`, moves: game.moves + index };
});
const valueOf = (row: (typeof ROWS)[number], column: Column) =>
  column === "date" ? (row.date ?? undefined) : row[column];

const gallery: GalleryModule = {
  section: "tables",
  title: "useTableUrlState — the whole table",
  demos: [
    {
      name: "Sort, pages and picks in the URL (look at the address bar)",
      render: () => (
        <WithState initial={new Set<string>()}>
          {(picked, setPicked) => (
            <WithHook
              hook={useTableUrlState<Column>}
              args={[{ columns: COLUMNS, defaultSort: "date", firstDirection, count: ROWS.length }]}
            >
              {(table) => {
                const sorted = sortRows(ROWS, table.sort, table.direction, valueOf);
                const pickedCount = sorted.filter((row) => picked.has(row.id)).length;
                return (
                  <Box sx={{ height: 360, display: "flex", flexDirection: "column", minHeight: 0 }}>
                    <Typography variant="caption" color="text.secondary">
                      ?sort={table.sort} · ?dir={table.direction} · ?page={table.page} · ?rows={table.rowsPerPage}
                    </Typography>
                    <TableFrame ariaLabel="Games" testId="gallery-url-table">
                      <TableHead>
                        <TableRow>
                          <PickHeaderCell
                            total={sorted.length}
                            picked={pickedCount}
                            label="Select all"
                            testId="gallery-url-table-select-all"
                            onToggleAll={() =>
                              setPicked(pickedCount === sorted.length ? new Set() : new Set(sorted.map((row) => row.id)))
                            }
                          />
                          {COLUMNS.map((column) => (
                            <SortHeaderCell
                              key={column}
                              column={column}
                              label={LABELS[column]}
                              sort={table.sort}
                              direction={table.direction}
                              onSort={table.sortBy}
                              align={column === "elo" || column === "moves" ? "end" : "start"}
                              testId={`gallery-url-table-sort-${column}`}
                            />
                          ))}
                          <TableCell />
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {table.pageOf(sorted).map((row) => (
                          <TableRow key={row.id} hover>
                            <PickCell
                              checked={picked.has(row.id)}
                              label={`Pick ${row.white} – ${row.black}`}
                              testId={`gallery-url-table-pick-${row.id}`}
                              onToggle={() =>
                                setPicked((before) => {
                                  const next = new Set(before);
                                  if (next.has(row.id)) next.delete(row.id);
                                  else next.add(row.id);
                                  return next;
                                })
                              }
                            />
                            <TableCell dir="auto">{row.white}</TableCell>
                            <TableCell dir="auto">{row.black}</TableCell>
                            <NumberCell value={row.elo} />
                            <NumberCell value={row.moves} />
                            <DateCell value={row.date} />
                            <RowActionsCell reveal="hover" testId={`gallery-url-table-actions-${row.id}`}>
                              <IconAction label="Open" testId={`gallery-url-table-open-${row.id}`}>
                                <OpenInNewRoundedIcon fontSize="small" />
                              </IconAction>
                            </RowActionsCell>
                          </TableRow>
                        ))}
                        {sorted.length === 0 && (
                          <EmptyTableRow colSpan={7} testId="gallery-url-table-empty">
                            No games
                          </EmptyTableRow>
                        )}
                      </TableBody>
                    </TableFrame>
                    <TablePager
                      count={sorted.length}
                      page={table.page}
                      rowsPerPage={table.rowsPerPage}
                      onPageChange={table.setPage}
                      onRowsPerPageChange={table.setRowsPerPage}
                      labelRowsPerPage="Rows per page"
                      testId="gallery-url-table-pager"
                    />
                  </Box>
                );
              }}
            </WithHook>
          )}
        </WithState>
      ),
    },
  ],
};

export default gallery;
