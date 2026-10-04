import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { expectNoAxeViolations } from "../../../../test/axe";
import type { TieBreakColumn } from "../competitors";
import StandingsTable, { type StandingsRow, type StandingsTableLabels, type StandingsTableProps } from "./StandingsTable";

const LABELS: StandingsTableLabels = {
  rank: { header: "#", name: "Rank" },
  name: "Member",
  rating: { header: "Rtg", name: "Rating" },
  points: { header: "Pts", name: "Points" },
  round: (round) => `Round ${round}`,
};

const TIE_BREAKS: TieBreakColumn[] = [
  { id: "opponents", header: "Opp", name: "Opponents' points", format: (value) => value.toFixed(1) },
  { id: "wins", header: "Wins" },
];

/** Three rounds: every kind of cell is here — a win, a draw, a loss, an unfinished game, no game. */
const ROWS: StandingsRow[] = [
  {
    id: "ada",
    rank: 1,
    name: "Ada Lovelace",
    prefix: "Dr",
    suffix: "London",
    rating: 2400,
    points: 2.5,
    tieBreaks: { opponents: 3, wins: 2 },
    rounds: [
      [{ outcome: "win", label: "Round 1, against Alan Turing: win" }],
      [{ outcome: "draw", label: "Round 2, against Grace Hopper: draw" }],
      [{ outcome: "win", label: "Round 3, against Donald Knuth: win" }],
    ],
  },
  {
    id: "alan",
    rank: 2,
    name: "Alan Turing",
    points: 1,
    tieBreaks: { opponents: 2.5 },
    rounds: [
      [{ outcome: "loss", label: "Round 1, against Ada Lovelace: loss" }],
      [{ outcome: "unfinished", label: "Round 2, against Donald Knuth: unfinished" }],
      [{ outcome: "none", label: "Round 3: no game" }],
    ],
  },
];

const mount = (props: Partial<StandingsTableProps> = {}) =>
  render(
    <StandingsTable
      rows={ROWS}
      rounds={3}
      labels={LABELS}
      tieBreaks={TIE_BREAKS}
      emptyLabel="No games yet"
      ariaLabel="Standings"
      testId="t"
      // A test names the table its own way (a caption), so the name above gives way to it.
      {...(props as object)}
    />,
  );

const table = () => screen.getByRole("table", { name: "Standings" });
const glyphs = (row: string) =>
  [1, 2, 3].map((round) => screen.getByTestId(`t-round-${row}-${round}`).querySelector("[aria-hidden]")?.textContent);

describe("StandingsTable", () => {
  describe("columns", () => {
    it("heads the rank, the name, the rating, a column per round, the points and each tie-break", () => {
      mount();
      expect(screen.getByTestId("t")).toContainElement(screen.getByTestId("t-frame"));
      expect(within(table()).getAllByRole("columnheader").map((head) => head.querySelector("[aria-hidden]")?.textContent ?? head.textContent)).toEqual([
        "#",
        "Member",
        "Rtg",
        "1",
        "2",
        "3",
        "Pts",
        "Opp",
        "Wins",
      ]);
    });

    it("reads an abbreviated header by its full name, and shows it on hover", () => {
      mount();
      for (const name of ["Rank", "Rating", "Round 1", "Round 2", "Round 3", "Points", "Opponents' points"]) {
        expect(within(table()).getByRole("columnheader", { name })).toHaveAttribute("title", name);
      }
      // A header that is its own name says it once.
      expect(within(table()).getByRole("columnheader", { name: "Wins" })).not.toHaveAttribute("title");
      expect(within(table()).getByRole("columnheader", { name: "Member" })).toBeInTheDocument();
    });

    it("has as many round columns as `rounds` says, whatever the rows hold", () => {
      mount({ rounds: 5 });
      expect(within(table()).getByRole("columnheader", { name: "Round 5" })).toBeInTheDocument();
      // A row that stops at round 3 leaves the rest empty.
      expect(screen.getByTestId("t-round-ada-5")).toBeEmptyDOMElement();
    });

    it("drops the rating column without its heading", () => {
      mount({ labels: { ...LABELS, rating: undefined } });
      expect(within(table()).queryByRole("columnheader", { name: "Rating" })).toBeNull();
      expect(within(screen.getByTestId("t-row-ada")).queryByText("2400")).toBeNull();
    });

    it("takes its tie-breaks as data — none, one, or a caller's own", () => {
      const { unmount } = mount({ tieBreaks: undefined });
      expect(within(table()).getAllByRole("columnheader")).toHaveLength(7);
      expect(screen.queryByTestId("t-row-ada-opponents")).toBeNull();
      unmount();
      mount({ tieBreaks: [{ id: "wins", header: "W", name: "Wins" }] });
      expect(within(table()).getByRole("columnheader", { name: "Wins" })).toHaveTextContent("W");
      expect(screen.getByTestId("t-row-ada-wins")).toHaveTextContent("2");
    });
  });

  describe("a row", () => {
    it("is headed by its competitor's name, the prefix and the suffix around it", () => {
      mount();
      const header = within(screen.getByTestId("t-row-ada")).getByRole("rowheader", { name: "Dr Ada Lovelace London" });
      expect(header).toHaveAttribute("scope", "row");
      expect(within(header).getByText("Ada Lovelace")).toHaveAttribute("dir", "auto");
      expect(within(screen.getByTestId("t-row-alan")).getByRole("rowheader", { name: "Alan Turing" })).toBeInTheDocument();
    });

    it("shows the rank, the rating, the points and the tie-breaks as numbers — end-aligned, left to right", () => {
      mount();
      const row = within(screen.getByTestId("t-row-ada"));
      expect(row.getAllByRole("cell").map((cell) => cell.querySelector("[aria-hidden]")?.textContent ?? cell.textContent)).toEqual([
        "1",
        "2400",
        "1",
        "½",
        "1",
        "2.5",
        "3.0",
        "2",
      ]);
      expect(screen.getByTestId("t-row-ada-points")).toHaveStyle({ textAlign: "end" });
      expect(screen.getByTestId("t-row-ada-points").querySelector("bdi")).toHaveAttribute("dir", "ltr");
      expect(screen.getByTestId("t-row-ada-opponents")).toHaveTextContent("3.0");
    });

    it("writes the points the caller's way", () => {
      mount({ formatPoints: (value) => value.toFixed(1) });
      expect(screen.getByTestId("t-row-alan-points")).toHaveTextContent("1.0");
    });

    it("reads a missing rating and a missing tie-break as a dash", () => {
      mount();
      const cells = within(screen.getByTestId("t-row-alan")).getAllByRole("cell");
      expect(cells[1]).toHaveTextContent("–");
      expect(screen.getByTestId("t-row-alan-wins")).toHaveTextContent("–");
    });

    it("comes in the order given — the table ranks nothing", () => {
      mount({ rows: [...ROWS].reverse() });
      expect(screen.getAllByRole("rowheader").map((header) => header.textContent)).toEqual(["Alan Turing", "Dr Ada Lovelace London"]);
    });
  });

  describe("a round's cell", () => {
    it("shows the result only — 1, ½, 0, * for an unfinished game, a dash for none", () => {
      mount();
      expect(glyphs("ada")).toEqual(["1", "½", "1"]);
      expect(glyphs("alan")).toEqual(["0", "*", "–"]);
    });

    it("is named by the caller's words — the round, the opponent and the result", () => {
      mount();
      const ada = within(screen.getByTestId("t-row-ada"));
      expect(ada.getByRole("cell", { name: "Round 1, against Alan Turing: win" })).toBe(screen.getByTestId("t-round-ada-1"));
      expect(ada.getByRole("cell", { name: "Round 2, against Grace Hopper: draw" })).toBe(screen.getByTestId("t-round-ada-2"));
      expect(within(screen.getByTestId("t-row-alan")).getByRole("cell", { name: "Round 1, against Ada Lovelace: loss" })).toBeInTheDocument();
    });

    it("tells an unfinished game from a missing one, by the glyph and by the name", () => {
      mount();
      const alan = within(screen.getByTestId("t-row-alan"));
      const unfinished = alan.getByRole("cell", { name: "Round 2, against Donald Knuth: unfinished" });
      const none = alan.getByRole("cell", { name: "Round 3: no game" });
      expect(unfinished).not.toBe(none);
      expect(unfinished.querySelector("[data-outcome]")).toHaveAttribute("data-outcome", "unfinished");
      expect(none.querySelector("[data-outcome]")).toHaveAttribute("data-outcome", "none");
    });

    it("holds every result of its round, a space between", () => {
      mount({
        rows: [
          {
            ...ROWS[0],
            rounds: [
              [
                { outcome: "win", label: "Round 1, game 1: win" },
                { outcome: "loss", label: "Round 1, game 2: loss" },
              ],
            ],
          },
        ],
        rounds: 1,
      });
      expect(screen.getByRole("cell", { name: "Round 1, game 1: win Round 1, game 2: loss" })).toBe(screen.getByTestId("t-round-ada-1"));
    });
  });

  describe("the legend", () => {
    it("says under the table what the glyphs that are not numbers mean", () => {
      mount({
        legend: [
          { outcome: "unfinished", label: "unfinished game" },
          { outcome: "none", label: "no game" },
        ],
      });
      const legend = screen.getByTestId("t-legend");
      expect(legend).toHaveTextContent("* = unfinished game");
      expect(legend).toHaveTextContent("– = no game");
      expect(screen.getByTestId("t-frame")).not.toContainElement(legend);
    });

    it("is absent without entries", () => {
      mount();
      expect(screen.queryByTestId("t-legend")).toBeNull();
    });

    it("is absent with no row to explain — while loading, and when empty", () => {
      const legend = [{ outcome: "unfinished" as const, label: "unfinished game" }];
      const { unmount } = mount({ legend, loading: true });
      expect(screen.queryByTestId("t-legend")).toBeNull();
      unmount();
      mount({ legend, rows: [] });
      expect(screen.queryByTestId("t-legend")).toBeNull();
    });
  });

  describe("states", () => {
    it("is busy while its rows are read — one row under the kept header", () => {
      mount({ loading: true, loadingLabel: "Reading…" });
      expect(table()).toHaveAttribute("aria-busy", "true");
      expect(within(screen.getByTestId("t-loading")).getByRole("status")).toHaveTextContent("Reading…");
      expect(screen.queryByTestId("t-row-ada")).toBeNull();
      expect(within(table()).getByRole("columnheader", { name: "Round 3" })).toBeInTheDocument();
      expect(screen.getByTestId("t-loading").querySelector("td")).toHaveAttribute("colspan", "9");
    });

    it("says so when there is no row", () => {
      mount({ rows: [] });
      expect(table()).not.toHaveAttribute("aria-busy");
      expect(screen.getByTestId("t-empty")).toHaveTextContent("No games yet");
    });

    it("shows every row — ninety-nine of them, no paging", () => {
      mount({ rows: Array.from({ length: 99 }, (_, index) => ({ ...ROWS[1], id: `m${index}`, rank: index + 1, name: `Member ${index + 1}` })) });
      // One role query, its last row named: a second, by name, walks all ninety-nine again (CTA-124).
      const rows = screen.getAllByRole("rowheader");
      expect(rows).toHaveLength(99);
      expect(rows.at(-1)).toHaveAccessibleName("Member 99");
    });

    it("keeps a long name on one line, for the frame to scroll", () => {
      mount({ rows: [{ ...ROWS[0], name: "Augusta Ada King, Countess of Lovelace, née Byron" }] });
      expect(screen.getByTestId("t-row-ada-name")).toHaveStyle({ whiteSpace: "nowrap" });
    });

    it("takes the density and the sticky header to its frame", () => {
      mount({ density: "dense", stickyHeader: false });
      expect(screen.getByTestId("t-frame-table")).toHaveAttribute("data-density", "dense");
      expect(screen.getByTestId("t-frame-table")).not.toHaveClass("MuiTable-stickyHeader");
    });
  });

  describe("accessibility", () => {
    it("is named by a label, or by a caption instead", () => {
      const { unmount } = mount();
      expect(screen.getByRole("region", { name: "Standings" })).toContainElement(table());
      unmount();
      mount({ ariaLabel: undefined, caption: "After round 3" });
      expect(screen.getByRole("table", { name: "After round 3" })).toBeInTheDocument();
    });

    it("cannot be nameless — the types refuse it", () => {
      const base = { rows: ROWS, rounds: 3, labels: LABELS, emptyLabel: "", testId: "t" };
      // @ts-expect-error — a table is named by an ariaLabel or a caption.
      const nameless = <StandingsTable {...base} />;
      // @ts-expect-error — one or the other, not both.
      const both = <StandingsTable {...base} ariaLabel="Standings" caption="Standings" />;
      // @ts-expect-error — and every round column has its full name.
      const unnamedRounds = <StandingsTable {...base} ariaLabel="Standings" labels={{ rank: LABELS.rank, name: "Member", points: LABELS.points }} />;
      expect([nameless, both, unnamedRounds]).toHaveLength(3);
    });

    it("lets the keyboard reach its scrolling frame — it holds nothing else to focus", async () => {
      mount();
      await userEvent.tab();
      expect(screen.getByRole("region", { name: "Standings" })).toHaveFocus();
      await userEvent.tab();
      expect(document.body).toHaveFocus();
    });

    it("passes axe — with rows, while loading and empty", async () => {
      const { unmount } = mount({ legend: [{ outcome: "unfinished", label: "unfinished game" }] });
      await expectNoAxeViolations();
      unmount();
      const loading = mount({ loading: true, loadingLabel: "Reading…" });
      await expectNoAxeViolations();
      loading.unmount();
      mount({ rows: [] });
      await expectNoAxeViolations();
    });
  });

  describe("paging (CTA-128)", () => {
    /** Thirty rows, ranked 1–30: more than a page of 25. */
    const MANY = Array.from({ length: 30 }, (_, index) => ({ ...ROWS[0], prefix: undefined, suffix: undefined, id: `p${index + 1}`, rank: index + 1, name: `Player ${index + 1}` }));
    const paging = (page: number, onPageChange: (page: number) => void = () => {}) => ({
      page,
      rowsPerPage: 25,
      onPageChange,
      onRowsPerPageChange: () => {},
      labelRowsPerPage: "Rows per page",
    });

    it("shows every row with no paging, and no pager", () => {
      mount({ rows: MANY });
      expect(screen.getAllByRole("rowheader")).toHaveLength(30);
      expect(screen.queryByTestId("t-pager")).not.toBeInTheDocument();
    });

    it("shows a page of rows, each keeping its own rank, and a pager that turns it", async () => {
      const user = userEvent.setup();
      const turned: number[] = [];
      const { rerender } = mount({ rows: MANY, paging: paging(0, (page: number) => turned.push(page)) });
      expect(screen.getAllByRole("rowheader")).toHaveLength(25);
      await user.click(within(screen.getByTestId("t-pager")).getByRole("button", { name: /next page/i }));
      expect(turned).toEqual([1]);
      rerender(
        <StandingsTable rows={MANY} rounds={3} labels={LABELS} emptyLabel="No games yet" ariaLabel="Standings" testId="t" paging={paging(1)} />,
      );
      expect(screen.getAllByRole("rowheader").map((header) => header.textContent)).toEqual(["Player 26", "Player 27", "Player 28", "Player 29", "Player 30"]);
      expect(screen.getByTestId("t-row-p26").firstElementChild).toHaveTextContent("26");
    });
  });
});
