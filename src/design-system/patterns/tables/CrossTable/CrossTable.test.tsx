import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { expectNoAxeViolations } from "../../../../test/axe";
import type { CompetitorLabels, TieBreakColumn } from "../competitors";
import CrossTable, { type CrossTableProps, type CrossTableRow } from "./CrossTable";

const LABELS: CompetitorLabels = {
  rank: { header: "#", name: "Rank" },
  name: "Member",
  rating: { header: "Rtg", name: "Rating" },
  points: { header: "Pts", name: "Points" },
};

const TIE_BREAKS: TieBreakColumn[] = [{ id: "opponents", header: "Opp", name: "Opponents' points", format: (value) => value.toFixed(2) }];

/**
 * Three members of a double round robin, four of its six rounds played: Ada
 * and Alan have met twice, Ada and Grace once, Alan and Grace have one game
 * finished and one still going.
 */
const ROWS: CrossTableRow[] = [
  {
    id: "ada",
    rank: 1,
    name: "Ada Lovelace",
    prefix: "Dr",
    rating: 2400,
    points: 2.5,
    tieBreaks: { opponents: 2.25 },
    results: {
      alan: [
        { outcome: "win", label: "Round 1, against Alan Turing: win" },
        { outcome: "draw", label: "Round 4, against Alan Turing: draw" },
      ],
      grace: [{ outcome: "win", label: "Round 2, against Grace Hopper: win" }],
    },
  },
  {
    id: "alan",
    rank: 2,
    name: "Alan Turing",
    rating: 2350,
    points: 1.5,
    tieBreaks: { opponents: 1.25 },
    results: {
      ada: [
        { outcome: "loss", label: "Round 1, against Ada Lovelace: loss" },
        { outcome: "draw", label: "Round 4, against Ada Lovelace: draw" },
      ],
      grace: [
        { outcome: "win", label: "Round 3, against Grace Hopper: win" },
        { outcome: "unfinished", label: "Round 6, against Grace Hopper: unfinished" },
      ],
    },
  },
  {
    id: "grace",
    rank: 3,
    name: "Grace Hopper",
    points: 0,
    results: {
      ada: [{ outcome: "loss", label: "Round 2, against Ada Lovelace: loss" }],
      alan: [
        { outcome: "loss", label: "Round 3, against Alan Turing: loss" },
        { outcome: "unfinished", label: "Round 6, against Alan Turing: unfinished" },
      ],
    },
  },
];

const mount = (props: Partial<CrossTableProps> = {}) =>
  render(
    <CrossTable
      rows={ROWS}
      labels={LABELS}
      tieBreaks={TIE_BREAKS}
      emptyLabel="No games yet"
      ariaLabel="Crosstable"
      testId="t"
      // A test names the table its own way (a caption), so the name above gives way to it.
      {...(props as object)}
    />,
  );

const table = () => screen.getByRole("table", { name: "Crosstable" });
const cell = (row: string, column: string) => screen.getByTestId(`t-cell-${row}-${column}`);
const glyphs = (row: string, column: string) => [...cell(row, column).querySelectorAll("[aria-hidden]")].map((glyph) => glyph.textContent);

describe("CrossTable", () => {
  describe("columns", () => {
    it("heads the rank, the name, the rating, a column per competitor by its rank, the points and each tie-break", () => {
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
      ]);
    });

    it("reads a competitor's column by its name — a real column header", () => {
      mount();
      for (const [id, name] of [
        ["ada", "Ada Lovelace"],
        ["alan", "Alan Turing"],
        ["grace", "Grace Hopper"],
      ]) {
        const header = within(table()).getByRole("columnheader", { name });
        expect(header).toBe(screen.getByTestId(`t-column-${id}`));
        expect(header.tagName).toBe("TH");
        expect(header).toHaveAttribute("scope", "col");
        expect(header).toHaveAttribute("title", name);
      }
    });

    it("puts the columns in the rows' order", () => {
      mount({ rows: [ROWS[2], ROWS[0], ROWS[1]] });
      expect(screen.getAllByTestId(/^t-column-/).map((header) => header.getAttribute("data-testid"))).toEqual([
        "t-column-grace",
        "t-column-ada",
        "t-column-alan",
      ]);
      expect(screen.getAllByRole("rowheader").map((header) => header.textContent)).toEqual(["Grace Hopper", "Dr Ada Lovelace", "Alan Turing"]);
    });

    it("drops the rating column without its heading, and takes its tie-breaks as data", () => {
      mount({ labels: { ...LABELS, rating: undefined }, tieBreaks: undefined });
      expect(within(table()).queryByRole("columnheader", { name: "Rating" })).toBeNull();
      expect(within(table()).getAllByRole("columnheader")).toHaveLength(6);
      expect(screen.queryByTestId("t-row-ada-opponents")).toBeNull();
    });
  });

  describe("a row", () => {
    it("is headed by its competitor's name — a real row header", () => {
      mount();
      const header = within(screen.getByTestId("t-row-ada")).getByRole("rowheader", { name: "Dr Ada Lovelace" });
      expect(header.tagName).toBe("TH");
      expect(header).toHaveAttribute("scope", "row");
      expect(within(header).getByText("Ada Lovelace")).toHaveAttribute("dir", "auto");
    });

    it("ends on the points and the tie-breaks, written the caller's way", () => {
      mount({ formatPoints: (value) => value.toFixed(1) });
      expect(screen.getByTestId("t-row-ada-points")).toHaveTextContent("2.5");
      expect(screen.getByTestId("t-row-grace-points")).toHaveTextContent("0.0");
      expect(screen.getByTestId("t-row-ada-opponents")).toHaveTextContent("2.25");
      expect(screen.getByTestId("t-row-grace-opponents")).toHaveTextContent("–");
      expect(screen.getByTestId("t-row-ada-points").querySelector("bdi")).toHaveAttribute("dir", "ltr");
    });
  });

  describe("a cell", () => {
    it("holds every result between the two, in order — the results only", () => {
      mount();
      expect(glyphs("ada", "alan")).toEqual(["1", "½"]);
      expect(glyphs("alan", "ada")).toEqual(["0", "½"]);
      expect(glyphs("alan", "grace")).toEqual(["1", "*"]);
    });

    it("is named by each result's words — the round, the opponent and the result", () => {
      mount();
      expect(within(screen.getByTestId("t-row-ada")).getByRole("cell", { name: "Round 1, against Alan Turing: win Round 4, against Alan Turing: draw" })).toBe(
        cell("ada", "alan"),
      );
      expect(within(cell("alan", "grace")).getByText("Round 6, against Grace Hopper: unfinished")).toBeInTheDocument();
    });

    it("has fewer results where fewer games were played — one, or none at all", () => {
      mount({ rows: [ROWS[0], { ...ROWS[1], results: { ada: ROWS[1].results.ada } }, { ...ROWS[2], results: { ada: ROWS[2].results.ada } }] });
      expect(glyphs("ada", "grace")).toEqual(["1"]);
      expect(cell("alan", "grace")).toBeEmptyDOMElement();
      expect(cell("grace", "alan")).toBeEmptyDOMElement();
    });

    it("shows the caller's own mark for a pair with no game", () => {
      mount({
        rows: [ROWS[0], { ...ROWS[1], results: { ...ROWS[1].results, grace: [{ outcome: "none", label: "No game against Grace Hopper" }] } }, ROWS[2]],
      });
      expect(glyphs("alan", "grace")).toEqual(["–"]);
      expect(screen.getByRole("cell", { name: "No game against Grace Hopper" })).toBe(cell("alan", "grace"));
    });

    it("leaves the diagonal blank — nobody plays themselves", () => {
      mount();
      for (const id of ["ada", "alan", "grace"]) {
        expect(cell(id, id)).toBeEmptyDOMElement();
        expect(cell(id, id).querySelector("[data-outcome]")).toBeNull();
      }
    });
  });

  describe("the legend", () => {
    it("says under the table what the glyphs that are not numbers mean", () => {
      mount({ legend: [{ outcome: "unfinished", label: "unfinished game" }] });
      expect(screen.getByTestId("t-legend")).toHaveTextContent("* = unfinished game");
      expect(screen.getByTestId("t-frame")).not.toContainElement(screen.getByTestId("t-legend"));
    });

    it("is absent without entries", () => {
      mount({ legend: [] });
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
    it("is busy while its rows are read — one row under the header, no competitor's column yet", () => {
      mount({ loading: true, loadingLabel: "Reading…" });
      expect(table()).toHaveAttribute("aria-busy", "true");
      expect(within(screen.getByTestId("t-loading")).getByRole("status")).toHaveTextContent("Reading…");
      expect(screen.queryByTestId("t-row-ada")).toBeNull();
      expect(screen.queryByTestId("t-column-ada")).toBeNull();
      expect(screen.getByTestId("t-loading").querySelector("td")).toHaveAttribute("colspan", "5");
    });

    it("says so when there is no row", () => {
      mount({ rows: [] });
      expect(table()).not.toHaveAttribute("aria-busy");
      expect(screen.getByTestId("t-empty")).toHaveTextContent("No games yet");
    });

    it("draws a single round robin as one result a cell", () => {
      mount({ rows: ROWS.map((row) => ({ ...row, results: Object.fromEntries(Object.entries(row.results).map(([id, results]) => [id, results.slice(0, 1)])) })) });
      expect(glyphs("ada", "alan")).toEqual(["1"]);
      expect(glyphs("grace", "alan")).toEqual(["0"]);
    });

    it("keeps a long name on one line, for the frame to scroll", () => {
      mount({ rows: [{ ...ROWS[0], name: "Augusta Ada King, Countess of Lovelace, née Byron" }, ROWS[1], ROWS[2]] });
      expect(screen.getByTestId("t-row-ada-name")).toHaveStyle({ whiteSpace: "nowrap" });
      expect(screen.getByTestId("t-column-ada")).toHaveTextContent("1");
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
      expect(screen.getByRole("region", { name: "Crosstable" })).toContainElement(table());
      unmount();
      mount({ ariaLabel: undefined, caption: "After round 4" });
      expect(screen.getByRole("table", { name: "After round 4" })).toBeInTheDocument();
    });

    it("cannot be nameless — the types refuse it", () => {
      const base = { rows: ROWS, labels: LABELS, emptyLabel: "", testId: "t" };
      // @ts-expect-error — a table is named by an ariaLabel or a caption.
      const nameless = <CrossTable {...base} />;
      // @ts-expect-error — one or the other, not both.
      const both = <CrossTable {...base} ariaLabel="Crosstable" caption="Crosstable" />;
      expect([nameless, both]).toHaveLength(2);
    });

    it("lets the keyboard reach its scrolling frame — it holds nothing else to focus", async () => {
      mount();
      await userEvent.tab();
      expect(screen.getByRole("region", { name: "Crosstable" })).toHaveFocus();
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
    it("pages the rows and keeps every competitor's column", () => {
      const many: CrossTableRow[] = Array.from({ length: 30 }, (_, index) => ({ id: `p${index + 1}`, rank: index + 1, name: `Player ${index + 1}`, points: 0, results: {} }));
      mount({ rows: many, paging: { page: 1, rowsPerPage: 25, onPageChange: () => {}, onRowsPerPageChange: () => {}, labelRowsPerPage: "Rows per page" } });
      expect(screen.getAllByRole("rowheader")).toHaveLength(5);
      expect(screen.getByTestId("t-column-p1")).toBeInTheDocument();
      expect(screen.getByTestId("t-column-p30")).toBeInTheDocument();
      expect(screen.getByTestId("t-pager")).toBeInTheDocument();
    });
  });

  describe("links (CTA-128)", () => {
    it("makes each result of a cell its own link", () => {
      const [ada] = ROWS;
      mount({
        rows: [
          { ...ada, results: { ...ada.results, alan: ada.results.alan.map((result, index) => ({ ...result, link: { href: `/games/${index + 1}` } })) } },
          ...ROWS.slice(1),
        ],
      });
      expect(within(cell("ada", "alan")).getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(["/games/1", "/games/2"]);
      expect(within(cell("ada", "alan")).getByRole("link", { name: "Round 4, against Alan Turing: draw" })).toBeInTheDocument();
    });
  });
});
