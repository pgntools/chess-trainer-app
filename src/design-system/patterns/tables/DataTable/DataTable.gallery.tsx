import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";

import { SearchField } from "../../../components/forms";
import { DEFAULT_TABLE_PAGE_SIZE, useTableUrlState, type SortDirection } from "../../../components/tables";
import { ActionBar, IconAction } from "../../../components/toolbars";
import type { GalleryModule } from "../../../gallery/types";
import WithHook from "../../../gallery/WithHook";
import WithState from "../../../gallery/WithState";
import type { PatternSectionId } from "../../sections";
import { firstDirectionOf, type DataTableColumn, type DataTableSort } from "./columns";
import DataTable, { type DataTableProps } from "./DataTable";

/** A generic row — the pattern knows no domain, so neither do its demos. */
type Member = { id: string; name: string; city?: string; rating?: number; visits: number; joined?: string };
type Column = "name" | "city" | "rating" | "visits" | "joined";

const NAMES = ["Ada Lovelace", "Alan Turing", "Grace Hopper", "Edsger Dijkstra", "Barbara Liskov", "Donald Knuth", "Frances Allen"];
const CITIES = ["London", "Manchester", "New York", "Amsterdam", undefined, "Stanford", "Boston"];

/** `count` members, deterministic, one of every kind of cell: a missing city, a missing rating, a missing date. */
const members = (count: number): Member[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `m${index + 1}`,
    name: `${NAMES[index % NAMES.length]} ${index + 1}`,
    city: CITIES[index % CITIES.length],
    rating: index % 5 === 3 ? undefined : 1200 + ((index * 389) % 1600),
    visits: (index * 37) % 500,
    joined: index % 6 === 5 ? undefined : `20${String(10 + (index % 16))}-0${(index % 9) + 1}-1${index % 10}`,
  }));

const FEW = members(7);
const SIXTY = members(60);
const TEN_THOUSAND = members(10_000);
const LONG: Member[] = [
  {
    id: "long",
    name: "Augusta Ada King, Countess of Lovelace, née Byron — the first to publish an algorithm meant for a machine",
    city: "Marylebone, London, in the county of Middlesex, the United Kingdom of Great Britain and Ireland",
    rating: 2400,
    visits: 12,
    joined: "1843-09-01",
  },
  ...FEW.slice(0, 2),
];
const HEBREW: Member[] = [
  { id: "h1", name: "עדה לאבלייס", city: "לונדון", rating: 2100, visits: 42, joined: "2015-03-12" },
  { id: "h2", name: "אלן טיורינג", city: "מנצ'סטר", rating: 2350, visits: 7, joined: "2012-06-23" },
  { id: "h3", name: "גרייס הופר", city: "ניו יורק", visits: 130 },
];

const dash = (value: ReactNode | undefined) => value ?? "–";

const COLUMNS: DataTableColumn<Member, Column>[] = [
  { id: "name", header: "Name", sortable: true, dir: "auto", sortValue: (row) => row.name, render: (row) => row.name },
  { id: "city", header: "City", sortable: true, dir: "auto", sortValue: (row) => row.city, render: (row) => dash(row.city) },
  {
    id: "rating",
    header: "Rating",
    sortable: true,
    align: "end",
    firstDirection: "desc",
    sortValue: (row) => row.rating,
    render: (row) => (row.rating === undefined ? "–" : <bdi dir="ltr">{row.rating}</bdi>),
  },
  {
    id: "visits",
    header: "Visits",
    sortable: true,
    align: "end",
    firstDirection: "desc",
    width: 96,
    sortValue: (row) => row.visits,
    render: (row) => <bdi dir="ltr">{row.visits}</bdi>,
  },
  {
    id: "joined",
    header: "Joined",
    sortable: true,
    firstDirection: "desc",
    dir: "ltr",
    sortValue: (row) => row.joined,
    render: (row) => dash(row.joined),
  },
];
/** The same columns, the long ones allowed to wrap. */
const WRAPPING = COLUMNS.map((column) => (column.id === "city" ? { ...column, wrap: true } : column));

type Local = { sort: DataTableSort<Column>; page: number; rowsPerPage: number; picked: Set<string>; words: string; opened?: string };
const INITIAL: Local = { sort: { column: "name", direction: "asc" }, page: 0, rowsPerPage: DEFAULT_TABLE_PAGE_SIZE, picked: new Set(), words: "" };

/** A demo's box: a definite height, so the frame scrolls inside it as it does in a screen. */
const box = (children: ReactNode, height = 360) => (
  <Box sx={{ height, display: "flex", flexDirection: "column", minHeight: 0 }}>{children}</Box>
);

/**
 * The table over `rows`, its sort and paging held by the demo as a screen
 * would hold them; `extra` adds a demo's props, given the state.
 */
const local = (
  rows: readonly Member[],
  extra: (state: Local, set: (patch: Partial<Local>) => void) => Partial<DataTableProps<Member, Column>> = () => ({}),
  height?: number,
) => (
  <WithState initial={INITIAL}>
    {(state, setState) => {
      const set = (patch: Partial<Local>) => setState((before) => ({ ...before, ...patch }));
      return box(
        <DataTable<Member, Column>
          columns={COLUMNS}
          rows={rows}
          rowId={(row) => row.id}
          sort={state.sort}
          onSort={(column, direction) => set({ sort: { column, direction }, page: 0 })}
          paging={{
            page: state.page,
            rowsPerPage: state.rowsPerPage,
            onPageChange: (page) => set({ page }),
            onRowsPerPageChange: (rowsPerPage) => set({ rowsPerPage, page: 0 }),
            labelRowsPerPage: "Rows per page",
          }}
          emptyLabel="No members yet"
          noMatchLabel="No member matches the filters"
          ariaLabel="Members"
          testId="gallery-data-table"
          {...extra(state, set)}
        />,
        height,
      );
    }}
  </WithState>
);

const toggled = (picked: ReadonlySet<string>, id: string) => {
  const next = new Set(picked);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
};

const gallery: GalleryModule<PatternSectionId> = {
  section: "tables",
  title: "DataTable",
  demos: [
    {
      name: "Sort and pages (click a header; numbers and dates open high first)",
      render: () => local(SIXTY),
    },
    {
      name: "Picks with select-all, row actions (always visible), a row click and a toolbar",
      render: () =>
        local(SIXTY, (state, set) => ({
          picks: {
            picked: state.picked,
            onChange: (picked) => set({ picked }),
            selectAllLabel: "Select all",
            pickLabel: (row) => `Pick ${row.name}`,
          },
          rowActions: (row) => (
            <>
              <IconAction label={`Download ${row.name}`} testId={`gallery-data-table-download-${row.id}`}>
                <DownloadRoundedIcon fontSize="small" />
              </IconAction>
              <IconAction
                label={`Delete ${row.name}`}
                color="error"
                onClick={() => set({ picked: toggled(state.picked, row.id) })}
                testId={`gallery-data-table-delete-${row.id}`}
              >
                <DeleteOutlineRoundedIcon fontSize="small" />
              </IconAction>
            </>
          ),
          actionsLabel: "Actions",
          onRowClick: (row) => set({ opened: row.name }),
          toolbar: (
            <ActionBar testId="gallery-data-table-toolbar" justify="space-between">
              <Typography variant="body2" color="text.secondary">
                {state.picked.size} picked{state.opened === undefined ? "" : ` · opened ${state.opened}`}
              </Typography>
              <Button size="small" color="error" disabled={state.picked.size === 0} onClick={() => set({ picked: new Set() })}>
                Delete picked
              </Button>
            </ActionBar>
          ),
        })),
    },
    {
      name: "A filters slot above the table — type to filter; a filter leaving nothing says no match",
      render: () =>
        local(SIXTY, (state, set) => {
          const words = state.words.trim().toLowerCase();
          return {
            rows: words === "" ? SIXTY : SIXTY.filter((row) => `${row.name} ${row.city ?? ""}`.toLowerCase().includes(words)),
            filtered: words !== "",
            filters: (
              <SearchField
                value={state.words}
                onChange={(value) => set({ words: value, page: 0 })}
                placeholder="Filter by name or city"
                clearLabel="Clear"
                testId="gallery-data-table-filter"
              />
            ),
          };
        }),
    },
    {
      name: "Sort and pages in the URL, through useTableUrlState (look at the address bar)",
      render: () => (
        <WithHook
          hook={useTableUrlState<Column>}
          args={[
            {
              columns: COLUMNS.map((column) => column.id),
              defaultSort: "joined",
              firstDirection: firstDirectionOf(COLUMNS),
              count: SIXTY.length,
            },
          ]}
        >
          {(table) =>
            box(
              <DataTable<Member, Column>
                columns={COLUMNS}
                rows={SIXTY}
                rowId={(row) => row.id}
                sort={{ column: table.sort, direction: table.direction }}
                onSort={(column) => table.sortBy(column)}
                paging={{
                  page: table.page,
                  rowsPerPage: table.rowsPerPage,
                  onPageChange: table.setPage,
                  onRowsPerPageChange: table.setRowsPerPage,
                  labelRowsPerPage: "Rows per page",
                }}
                emptyLabel="No members yet"
                testId="gallery-data-table-url"
              />,
            )
          }
        </WithHook>
      ),
    },
    {
      name: "A row link — the name is a real link, and a click anywhere on the row follows it",
      render: () => local(FEW, () => ({ rowLink: (row) => ({ href: `#member-${row.id}` }) }), 300),
    },
    { name: "Loading", render: () => local([], () => ({ loading: true, loadingLabel: "Reading the members…" }), 200) },
    { name: "Empty", render: () => local([], undefined, 200) },
    { name: "No match", render: () => local([], () => ({ filtered: true }), 200) },
    { name: "One row", render: () => local(FEW.slice(0, 1), undefined, 200) },
    { name: "Dense", render: () => local(FEW, () => ({ density: "dense" }), 300) },
    { name: "Header not sticky", render: () => local(SIXTY, () => ({ stickyHeader: false }), 300) },
    { name: "Without paging — every row, no pager", render: () => local(FEW, () => ({ paging: undefined }), 300) },
    {
      name: "Long cell text — one line and a sideways scroll by default; City wraps",
      render: () =>
        local(LONG, () => ({ columns: WRAPPING }), 300),
    },
    { name: "Hebrew names (switch the direction to RTL)", render: () => local(HEBREW, undefined, 260) },
    {
      name: "10,000 rows — sorted once, one page rendered",
      render: () =>
        local(TEN_THOUSAND, (state, set) => ({
          picks: {
            picked: state.picked,
            onChange: (picked) => set({ picked }),
            selectAllLabel: "Select all",
            pickLabel: (row) => `Pick ${row.name}`,
          },
          sort: state.sort,
          onSort: (column: Column, direction: SortDirection) => set({ sort: { column, direction }, page: 0 }),
        })),
    },
  ],
};

export default gallery;
