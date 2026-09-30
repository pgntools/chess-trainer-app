import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import { CANDIDATES, EMPTY, HEBREW, LONG_NAMES, MISSING_GAME, SINGLE, UNFINISHED } from "./fixtures";
import RoundRobinCrossTable, { type RoundRobinCrossTableProps } from "./RoundRobinCrossTable";

const mount = (props: Partial<RoundRobinCrossTableProps> = {}) =>
  render(<RoundRobinCrossTable tournament={CANDIDATES} ariaLabel="FIDE Candidates 2026 — crosstable" testId="t" {...props} />);

const cell = (row: string, column: string) => screen.getByTestId(`t-cell-${row}-${column}`);
const glyphs = (row: string, column: string) => [...cell(row, column).querySelectorAll("[aria-hidden]")].map((glyph) => glyph.textContent);
const names = () => screen.getAllByRole("rowheader").map((header) => header.textContent);

// The Candidates' FIDE ids.
const SINDAROV = "14205483";
const GIRI = "24116068";
const ESIPENKO = "24175439";
const BLUEBAUM = "24651516";
const PRAGGNANANDHAA = "25059530";
// The hand-made fixtures'.
const TAL = "1001";
const BOTVINNIK = "1002";
const SMYSLOV = "1003";

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("RoundRobinCrossTable", () => {
  describe("the FIDE Candidates 2026 — the real file", () => {
    it("lists the eight players by points, then Sonneborn-Berger — Bluebaum ahead of Praggnanandhaa", () => {
      mount();
      // The file carries no country tags, so no federation follows a name.
      expect(names()).toEqual([
        "GM Sindarov, Javokhir",
        "GM Giri, Anish",
        "GM Caruana, Fabiano",
        "GM Wei, Yi",
        "GM Nakamura, Hikaru",
        "GM Bluebaum, Matthias",
        "GM Praggnanandhaa, R",
        "GM Esipenko, Andrey",
      ]);
      expect(screen.getByTestId(`t-row-${SINDAROV}-points`)).toHaveTextContent("10.0");
      expect(screen.getByTestId(`t-row-${SINDAROV}-sonnebornBerger`)).toHaveTextContent("64.75");
      expect(screen.getByTestId(`t-row-${BLUEBAUM}-points`)).toHaveTextContent("6.0");
      expect(screen.getByTestId(`t-row-${BLUEBAUM}-sonnebornBerger`)).toHaveTextContent("42.00");
      expect(screen.getByTestId(`t-row-${PRAGGNANANDHAA}-points`)).toHaveTextContent("6.0");
      expect(screen.getByTestId(`t-row-${PRAGGNANANDHAA}-sonnebornBerger`)).toHaveTextContent("40.00");
    });

    it("heads the rank, the player, the rating, a column per player, the points and Sonneborn-Berger alone", () => {
      mount();
      const table = within(screen.getByRole("table", { name: "FIDE Candidates 2026 — crosstable" }));
      expect(table.getAllByRole("columnheader").map((head) => head.querySelector("[aria-hidden]")?.textContent ?? head.textContent)).toEqual([
        "#",
        "Player",
        "Rtg",
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "Pts",
        "SB",
      ]);
      expect(table.getByRole("columnheader", { name: "Sonneborn-Berger" })).toBeInTheDocument();
      expect(table.queryByRole("columnheader", { name: "Buchholz" })).toBeNull();
    });

    it("names both players of a cell — a real header on its row and on its column", () => {
      mount();
      const column = screen.getByRole("columnheader", { name: "Giri, Anish" });
      expect(column).toBe(screen.getByTestId(`t-column-${GIRI}`));
      expect(column).toHaveAttribute("scope", "col");
      expect(column).toHaveTextContent("2");
      expect(within(screen.getByTestId(`t-row-${SINDAROV}`)).getByRole("rowheader", { name: "GM Sindarov, Javokhir" })).toHaveAttribute("scope", "row");
    });

    it("holds exactly two results in every cell off the diagonal, and none on it", () => {
      mount();
      const ids = screen.getAllByTestId(/^t-column-/).map((header) => header.getAttribute("data-testid")!.slice("t-column-".length));
      expect(ids).toHaveLength(8);
      for (const row of ids) {
        for (const column of ids) {
          expect(glyphs(row, column)).toHaveLength(row === column ? 0 : 2);
        }
      }
    });

    it("shows the results only, in round order — the round, the colour and the opponent in each one's name", () => {
      mount();
      expect(glyphs(SINDAROV, ESIPENKO)).toEqual(["1", "½"]);
      expect(glyphs(ESIPENKO, SINDAROV)).toEqual(["0", "½"]);
      expect(glyphs(SINDAROV, GIRI)).toEqual(["½", "½"]);
      expect(
        within(screen.getByTestId(`t-row-${SINDAROV}`)).getByRole("cell", {
          name: "Round 1, White against Esipenko, Andrey: win Round 8, Black against Esipenko, Andrey: draw",
        }),
      ).toBe(cell(SINDAROV, ESIPENKO));
      expect(within(cell(GIRI, SINDAROV)).getByText("Round 13, White against Sindarov, Javokhir: draw")).toBeInTheDocument();
    });

    it("has no legend — every game is finished and every pair has met", () => {
      mount();
      expect(screen.queryByTestId("t-legend")).toBeNull();
    });
  });

  describe("other round robins", () => {
    it("draws a single one as one result a cell", () => {
      mount({ tournament: SINGLE });
      // Three on 2 points and the same Sonneborn-Berger: the rating decides.
      expect(names()).toEqual(["GM Botvinnik, Mikhail RUS", "GM Tal, Mikhail LAT", "GM Smyslov, Vasily", "Newcomer, Nina"]);
      expect(glyphs(TAL, BOTVINNIK)).toEqual(["½"]);
      expect(glyphs(TAL, "Newcomer, Nina")).toEqual(["1"]);
      expect(glyphs("Newcomer, Nina", TAL)).toEqual(["0"]);
    });

    it("draws an unfinished double one as cells with fewer results than the rest, a game still going marked *", () => {
      mount({ tournament: UNFINISHED });
      expect(glyphs(TAL, "Newcomer, Nina")).toEqual(["1", "½"]);
      expect(glyphs(TAL, BOTVINNIK)).toEqual(["½"]);
      expect(glyphs(BOTVINNIK, SMYSLOV)).toEqual(["½", "*"]);
      expect(within(cell(BOTVINNIK, SMYSLOV)).getByText("Round 4, Black against Smyslov, Vasily: unfinished")).toBeInTheDocument();
      expect(screen.getByTestId("t-legend")).toHaveTextContent("* = unfinished game");
      expect(screen.getByTestId("t-legend")).not.toHaveTextContent("no game in the file");
    });

    it("says so where the file holds no game between two players", () => {
      mount({ tournament: MISSING_GAME });
      expect(glyphs(TAL, SMYSLOV)).toEqual(["–"]);
      expect(screen.getByRole("cell", { name: "No game against Smyslov, Vasily in the file" })).toBe(cell(TAL, SMYSLOV));
      expect(screen.getByRole("cell", { name: "No game against Tal, Mikhail in the file" })).toBe(cell(SMYSLOV, TAL));
      expect(screen.getByTestId("t-legend")).toHaveTextContent("– = no game in the file");
      // The diagonal stays blank: a pair that has not played is not the same as nobody.
      expect(cell(TAL, TAL)).toBeEmptyDOMElement();
    });
  });

  describe("states", () => {
    it("is busy while the tournament is read", () => {
      mount({ tournament: undefined });
      expect(screen.getByRole("table", { name: "FIDE Candidates 2026 — crosstable" })).toHaveAttribute("aria-busy", "true");
      expect(screen.getByRole("status")).toHaveTextContent("Reading the tournament…");
    });

    it("says so when the file holds no game", () => {
      mount({ tournament: EMPTY });
      expect(screen.getByTestId("t-empty")).toHaveTextContent("No games to show.");
      expect(screen.queryAllByRole("rowheader")).toEqual([]);
    });

    it("keeps a long name on one line, its column headed by the rank alone", () => {
      mount({ tournament: LONG_NAMES });
      for (const header of screen.getAllByRole("rowheader")) expect(header).toHaveStyle({ whiteSpace: "nowrap" });
      expect(screen.getAllByTestId(/^t-column-/).map((header) => header.querySelector("[aria-hidden]")?.textContent)).toEqual(["1", "2"]);
    });

    it("tightens its rows when asked", () => {
      mount({ density: "dense" });
      expect(screen.getByTestId("t-frame-table")).toHaveAttribute("data-density", "dense");
    });
  });

  describe("in Hebrew", () => {
    it("says its headings and its results' names in the reader's language", async () => {
      await i18n.changeLanguage("he");
      mount({ tournament: HEBREW, ariaLabel: "טבלת התוצאות" });
      const table = within(screen.getByRole("table", { name: "טבלת התוצאות" }));
      expect(table.getByRole("columnheader", { name: "שחקן" })).toBeInTheDocument();
      expect(table.getByRole("columnheader", { name: "זונבורן־ברגר" })).toBeInTheDocument();
      expect(table.getByRole("columnheader", { name: "כהן, דנה" })).toBeInTheDocument();
      expect(table.getByRole("cell", { name: "סיבוב 1, בלבן מול כהן, דנה: ניצחון סיבוב 4, בשחור מול כהן, דנה: תיקו" })).toBeInTheDocument();
      expect(within(table.getByRole("rowheader", { name: "WIM כהן, דנה ISR" })).getByText("כהן, דנה")).toHaveAttribute("dir", "auto");
    });
  });

  describe("accessibility", () => {
    it("cannot be nameless — the types refuse it", () => {
      // @ts-expect-error — the table is named by its ariaLabel.
      const nameless = <RoundRobinCrossTable tournament={CANDIDATES} testId="t" />;
      expect(nameless).toBeTruthy();
    });

    it("lets the keyboard reach its scrolling frame", async () => {
      mount();
      await userEvent.tab();
      expect(screen.getByRole("region", { name: "FIDE Candidates 2026 — crosstable" })).toHaveFocus();
    });

    it("passes axe — with rows, while loading and empty", async () => {
      const { unmount } = mount({ tournament: UNFINISHED });
      await expectNoAxeViolations();
      unmount();
      const loading = mount({ tournament: undefined });
      await expectNoAxeViolations();
      loading.unmount();
      mount({ tournament: EMPTY });
      await expectNoAxeViolations();
    });
  });
});
