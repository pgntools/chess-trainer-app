import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { ROUND_ROBIN_TIE_BREAKS, tournamentOf } from "../../../lib/tournament";
import { expectNoAxeViolations } from "../../../test/axe";
import { readText } from "../../../test/readText";
import { SOFIA_GAMES } from "../../../test/fixtures/tournamentGames";
import { CLUB_OPEN, EMPTY, HEBREW, LONG_NAMES, ONE_GAME, SOFIA } from "./fixtures";
import SwissStandingsTable, { type SwissStandingsTableProps } from "./SwissStandingsTable";

const mount = (props: Partial<SwissStandingsTableProps> = {}) =>
  render(<SwissStandingsTable tournament={CLUB_OPEN} ariaLabel="Club open — standings" testId="t" {...props} />);

/** The glyphs of a player's round cells, left to right. */
const glyphs = (player: string, rounds: number) =>
  Array.from({ length: rounds }, (_, index) => screen.getByTestId(`t-round-${player}-${index + 1}`).querySelector("[aria-hidden]")?.textContent);
// Each row by its accessible name: a title read in full, a federation by its country (CTA-128).
const names = () => screen.getAllByRole("rowheader").map((header) => readText(header));

const FIROUZJA = "12573981";
const CHEPARINOV = "2905540";
const TISMA = "920614";

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("SwissStandingsTable", () => {
  describe("a small Swiss", () => {
    it("heads the rank, the player, the rating, each round, the points, Buchholz and Sonneborn-Berger", () => {
      mount();
      const table = within(screen.getByRole("table", { name: "Club open — standings" }));
      expect(table.getAllByRole("columnheader").map((head) => head.querySelector("[aria-hidden]")?.textContent ?? head.textContent)).toEqual([
        "#",
        "Player",
        "Rtg",
        "1",
        "2",
        "3",
        "Pts",
        "BH",
        "SB",
      ]);
      for (const name of ["Rank", "Rating", "Round 1", "Round 3", "Points", "Buchholz", "Sonneborn-Berger"]) {
        expect(table.getByRole("columnheader", { name })).toBeInTheDocument();
      }
    });

    it("lists the players as the tournament ranks them — points, then Buchholz, then Sonneborn-Berger", () => {
      mount();
      expect(names()).toEqual([
        // 2 points each: Botvinnik's opponents scored 3, Tal's 1.5 (his unfinished game counts for nothing).
        "Grandmaster Botvinnik, Mikhail Russia",
        "Grandmaster Tal, Mikhail Latvia",
        "International Master Petrosian, Tigran Armenia",
        "Grandmaster Smyslov, Vasily",
        "Grandmaster Keres, Paul Estonia",
        "Newcomer, Nina",
      ]);
      expect(screen.getByTestId("t-row-1002-points")).toHaveTextContent("2.0");
      expect(screen.getByTestId("t-row-1002-buchholz")).toHaveTextContent("3.0");
      expect(screen.getByTestId("t-row-1002-sonnebornBerger")).toHaveTextContent("1.50");
      expect(screen.getByTestId("t-row-1001-buchholz")).toHaveTextContent("1.5");
    });

    it("shows the title before the name and the federation after it — each only where the tags have one", () => {
      mount();
      const tal = within(screen.getByTestId("t-row-1001")).getByRole("rowheader", { name: "Grandmaster Tal, Mikhail Latvia" });
      expect(within(tal).getByText("Tal, Mikhail")).toHaveAttribute("dir", "auto");
      const newcomer = screen.getByTestId("t-row-Newcomer, Nina");
      expect(within(newcomer).getByRole("rowheader", { name: "Newcomer, Nina" })).toBeInTheDocument();
      // No rating: a dash in its column.
      expect(within(newcomer).getAllByRole("cell")[1]).toHaveTextContent("–");
    });

    it("shows the result only in a round's cell — 1, ½, 0, * for an unfinished game, a dash for no game", () => {
      mount();
      expect(glyphs("1001", 3)).toEqual(["1", "1", "*"]);
      expect(glyphs("1002", 3)).toEqual(["½", "½", "1"]);
      expect(glyphs("1004", 3)).toEqual(["0", "–", "0"]);
    });

    it("names a round's cell by the round, the colour played, the opponent and the result", () => {
      mount();
      const tal = within(screen.getByTestId("t-row-1001"));
      expect(tal.getByRole("cell", { name: "Round 1, White against Keres, Paul: win" })).toBe(screen.getByTestId("t-round-1001-1"));
      expect(tal.getByRole("cell", { name: "Round 2, Black against Petrosian, Tigran: win" })).toBe(screen.getByTestId("t-round-1001-2"));
      const botvinnik = within(screen.getByTestId("t-row-1002"));
      expect(botvinnik.getByRole("cell", { name: "Round 2, Black against Smyslov, Vasily: draw" })).toBeInTheDocument();
      expect(within(screen.getByTestId("t-row-1004")).getByRole("cell", { name: "Round 3, Black against Botvinnik, Mikhail: loss" })).toBeInTheDocument();
    });

    it("tells an unfinished game from a missing one — by the glyph, and by the name", () => {
      mount();
      const unfinished = screen.getByRole("cell", { name: "Round 3, White against Smyslov, Vasily: unfinished" });
      const missing = within(screen.getByTestId("t-row-1004")).getByRole("cell", { name: "Round 2: no game in the file" });
      expect(unfinished).toBe(screen.getByTestId("t-round-1001-3"));
      expect(unfinished.querySelector("[aria-hidden]")).toHaveTextContent("*");
      expect(missing.querySelector("[aria-hidden]")).toHaveTextContent("–");
    });

    it("explains the two glyphs that are not numbers under the table", () => {
      mount();
      expect(screen.getByTestId("t-legend")).toHaveTextContent("* = unfinished game");
      expect(screen.getByTestId("t-legend")).toHaveTextContent("– = no game in the file");
    });

    it("has no legend where every game is finished and every round played", () => {
      mount({ tournament: HEBREW });
      expect(screen.queryByTestId("t-legend")).toBeNull();
    });
  });

  describe("Sofia Cup Rapid 2026 — the real file", () => {
    it("shows all 99 players over 9 rounds, no paging", () => {
      mount({ tournament: SOFIA, ariaLabel: "Sofia Cup Rapid 2026 — standings" });
      expect(screen.getAllByRole("rowheader")).toHaveLength(99);
      expect(within(screen.getByRole("table", { name: "Sofia Cup Rapid 2026 — standings" })).getByRole("columnheader", { name: "Round 9" })).toBeInTheDocument();
    });

    it("shows a title as a chip in its tone and a federation as its flag (CTA-128)", () => {
      mount({ tournament: SOFIA, ariaLabel: "Sofia Cup Rapid 2026 — standings", density: "dense" });
      const first = screen.getAllByRole("rowheader")[0];
      expect(first.querySelector("[data-tone]")).toHaveAttribute("data-tone", "warning");
      expect(first.querySelector("[data-tone]")).toHaveAttribute("title", "Grandmaster");
      expect(within(first).getByRole("img", { name: "France" })).toHaveAttribute("data-flag", "fr");
    });

    it("puts Firouzja first on 7.5 — Buchholz 30.5, Sonneborn-Berger 22.25", () => {
      mount({ tournament: SOFIA });
      expect(names()[0]).toBe("Grandmaster Firouzja, Alireza France");
      const row = within(screen.getByTestId(`t-row-${FIROUZJA}`));
      expect(row.getAllByRole("cell").map((cell) => cell.querySelector("[aria-hidden]")?.textContent ?? cell.textContent)).toEqual([
        "1",
        "2757",
        "1",
        "1",
        "½",
        "1",
        "1",
        "1",
        "½",
        "1",
        "½",
        "7.5",
        "30.5",
        "22.25",
      ]);
      expect(row.getByRole("cell", { name: "Round 1, White against Tisma, Ivan: win" })).toBeInTheDocument();
      expect(row.getByRole("cell", { name: "Round 2, Black against Veljanoski, Andrej: win" })).toBeInTheDocument();
    });

    it("gives a player with one game eight rounds of no game", () => {
      mount({ tournament: SOFIA });
      expect(glyphs(TISMA, 9)).toEqual(["0", "–", "–", "–", "–", "–", "–", "–", "–"]);
      const row = within(screen.getByTestId(`t-row-${TISMA}`));
      expect(row.getByRole("cell", { name: "Round 1, Black against Firouzja, Alireza: loss" })).toBeInTheDocument();
      expect(row.getByRole("cell", { name: "Round 9: no game in the file" })).toBeInTheDocument();
    });

    it("keeps an unfinished game in its round", () => {
      mount({ tournament: SOFIA });
      expect(glyphs(CHEPARINOV, 9)[3]).toBe("*");
      // Asked within the player's row: a role query over the whole 99 × 9 table names every cell (CTA-124).
      const row = within(screen.getByTestId(`t-row-${CHEPARINOV}`));
      expect(row.getByRole("cell", { name: "Round 4, White against Ristic, Luka: unfinished" })).toBe(screen.getByTestId(`t-round-${CHEPARINOV}-4`));
    });
  });

  describe("states", () => {
    it("is busy while the tournament is read", () => {
      mount({ tournament: undefined });
      expect(screen.getByRole("table", { name: "Club open — standings" })).toHaveAttribute("aria-busy", "true");
      expect(screen.getByRole("status")).toHaveTextContent("Reading the tournament…");
      expect(screen.queryByTestId("t-legend")).toBeNull();
    });

    it("says so when the file holds no game", () => {
      mount({ tournament: EMPTY });
      expect(screen.getByTestId("t-empty")).toHaveTextContent("No games to show.");
      expect(screen.queryAllByRole("rowheader")).toEqual([]);
    });

    it("shows one game as two rows of one round", () => {
      mount({ tournament: ONE_GAME });
      expect(names()).toEqual(["Grandmaster Botvinnik, Mikhail Russia", "Grandmaster Tal, Mikhail Latvia"]);
      expect(glyphs("1001", 1)).toEqual(["½"]);
    });

    it("keeps a long name on one line", () => {
      mount({ tournament: LONG_NAMES });
      for (const header of screen.getAllByRole("rowheader")) expect(header).toHaveStyle({ whiteSpace: "nowrap" });
    });

    it("tightens its rows when asked", () => {
      mount({ density: "dense" });
      expect(screen.getByTestId("t-frame-table")).toHaveAttribute("data-density", "dense");
    });

    it("shows the tie-breaks the tournament was ranked by — the columns explain the ranks", () => {
      mount({ tournament: tournamentOf(SOFIA_GAMES, ROUND_ROBIN_TIE_BREAKS) });
      expect(screen.getByRole("columnheader", { name: "Sonneborn-Berger" })).toBeInTheDocument();
      expect(screen.queryByRole("columnheader", { name: "Buchholz" })).toBeNull();
      expect(screen.queryByTestId(`t-row-${FIROUZJA}-buchholz`)).toBeNull();
    });
  });

  describe("in Hebrew", () => {
    it("says its headings and its cells' names in the reader's language", async () => {
      await i18n.changeLanguage("he");
      mount({ tournament: HEBREW, ariaLabel: "טבלת הדירוג" });
      const table = within(screen.getByRole("table", { name: "טבלת הדירוג" }));
      expect(table.getByRole("columnheader", { name: "שחקן" })).toBeInTheDocument();
      expect(table.getByRole("columnheader", { name: "סיבוב 2" })).toBeInTheDocument();
      expect(table.getByRole("columnheader", { name: "בוכהולץ" })).toBeInTheDocument();
      expect(table.getByRole("cell", { name: "סיבוב 1, בלבן מול לוי, יואב: ניצחון" })).toBeInTheDocument();
      expect(table.getByRole("cell", { name: "סיבוב 1, בשחור מול בוטבינניק, מיכאל: תיקו" })).toBeInTheDocument();
      expect(within(table.getByRole("rowheader", { name: "רב-אמן טל, מיכאל ישראל" })).getByText("טל, מיכאל")).toHaveAttribute("dir", "auto");
    });
  });

  describe("accessibility", () => {
    it("cannot be nameless — the types refuse it", () => {
      // @ts-expect-error — the table is named by its ariaLabel.
      const nameless = <SwissStandingsTable tournament={CLUB_OPEN} testId="t" />;
      expect(nameless).toBeTruthy();
    });

    it("lets the keyboard reach its scrolling frame", async () => {
      mount();
      await userEvent.tab();
      expect(screen.getByRole("region", { name: "Club open — standings" })).toHaveFocus();
    });

    it("passes axe — with rows, while loading and empty", async () => {
      const { unmount } = mount();
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
