import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import type { PlayedGameRow } from "../../../lib/playedGames";
import { expectNoAxeViolations } from "../../../test/axe";
import { manyRows, PLAYED_ROWS } from "./fixtures";
import PlayedGamesTable, { type PlayedGamesTableProps } from "./PlayedGamesTable";
import { playedGamesFirstDirection } from "./playedGamesSort";
import { whenPlayed } from "./whenPlayed";

const mount = (props: Partial<PlayedGamesTableProps> = {}) => {
  const handlers = { onSort: vi.fn(), onPickedChange: vi.fn(), onPageChange: vi.fn(), onRowsPerPageChange: vi.fn() };
  render(
    <PlayedGamesTable
      rows={PLAYED_ROWS}
      sort={{ column: "date", direction: "desc" }}
      onSort={handlers.onSort}
      paging={{ page: 0, rowsPerPage: 50, onPageChange: handlers.onPageChange, onRowsPerPageChange: handlers.onRowsPerPageChange }}
      picked={new Set()}
      onPickedChange={handlers.onPickedChange}
      analysisLink={(row: PlayedGameRow) => ({ href: `#analysis-${row.id}` })}
      continueLink={(row: PlayedGameRow) => ({ href: `#continue-${row.id}` })}
      testId="games"
      {...props}
    />,
  );
  return handlers;
};

/** A fixture's moment as a row's name gives it — the reader's time zone, to the minute. */
const at = (id: string) => whenPlayed(PLAYED_ROWS.find((row) => row.id === id)!.savedAt);

const listed = () => screen.getAllByTestId(/^games-row-/).map((row) => row.dataset.testid?.slice("games-row-".length));

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("PlayedGamesTable", () => {
  it("shows the games in the order asked, newest first by default", () => {
    mount();
    expect(listed()).toEqual(["live", "mated", "lines", "masked", "resigned", "bad"]);
    expect(screen.getByRole("table", { name: "Your games" })).toBeInTheDocument();
  });

  it("sorts by lib's own rule — missing values last, ties by the date", () => {
    mount({ sort: { column: "opening", direction: "asc" } });
    // Two games reached no opening: last, and between them the older first.
    expect(listed()).toEqual(["mated", "live", "resigned", "lines", "bad", "masked"]);
  });

  it("asks its caller to sort, opening the numbers and the date high first", async () => {
    const { onSort } = mount();
    await userEvent.click(screen.getByTestId("games-sort-moves"));
    expect(onSort).toHaveBeenCalledWith("moves", "desc");
    expect(playedGamesFirstDirection("moves")).toBe("desc");
    expect(playedGamesFirstDirection("white")).toBe("asc");
  });

  it("fills a row's cells: names, Elo or Unknown, result, the side lines, the date", () => {
    mount();
    const cells = within(screen.getByTestId("games-row-lines")).getAllByRole("cell");
    // The pick, nine columns, the actions.
    expect(cells).toHaveLength(11);
    expect(cells[1]).toHaveTextContent("Human");
    expect(cells[1]).toHaveAttribute("dir", "auto");
    expect(cells[2]).toHaveTextContent("Unknown");
    expect(cells[4]).toHaveTextContent("1500");
    expect(cells[5]).toHaveTextContent("1/2-1/2");
    expect(cells[5]).toHaveAttribute("dir", "ltr");
    expect(cells[7]).toHaveTextContent("313 side lines");
    expect(cells[9]).toHaveTextContent("2026-09-12");
    expect(cells[9]).toHaveAttribute("dir", "ltr");
  });

  it("names a row to the minute, in the reader's time zone", () => {
    const moment = new Date(2026, 8, 20, 18, 5);
    expect(whenPlayed(moment.toISOString())).toBe("2026-09-20 18:05");
    expect(whenPlayed("not a date")).toBe("");
  });

  it("marks a masked game", () => {
    mount();
    expect(screen.getByTestId("games-masked-masked")).toHaveTextContent("Masked");
    expect(screen.queryByTestId("games-masked-live")).toBeNull();
  });

  it("offers Analysis on every readable game and Continue only on one still on, each named by its row", () => {
    mount();
    const continued = screen.getByRole("link", { name: `Continue the game Human – Stockfish level 5 of ${at("live")}` });
    expect(continued).toBe(screen.getByTestId("games-continue-live"));
    expect(continued).toHaveAttribute("href", "#continue-live");
    expect(screen.getByTestId("games-analysis-mated")).toHaveAttribute("href", "#analysis-mated");
    expect(screen.getByTestId("games-analysis-mated")).toHaveAccessibleName(`Analyse the game Stockfish level 3 – Human of ${at("mated")}`);
    expect(screen.queryByTestId("games-continue-mated")).toBeNull();
    expect(screen.queryByTestId("games-continue-resigned")).toBeNull();
  });

  it("says an unreadable game will not read, across the columns, with only its pick", () => {
    mount();
    const row = screen.getByTestId("games-row-bad");
    expect(within(row).getAllByRole("cell")).toHaveLength(3);
    expect(screen.getByTestId("games-note-bad")).toHaveTextContent("This game could not be read.");
    expect(within(row).getByRole("checkbox", { name: `Pick the unreadable game of ${at("bad")}` })).toBeInTheDocument();
    expect(screen.queryByTestId("games-analysis-bad")).toBeNull();
  });

  it("picks from the keyboard, and selects all the rows it holds", async () => {
    const { onPickedChange } = mount();
    const pick = screen.getByRole("checkbox", { name: `Pick the game Human – Stockfish level 5 of ${at("live")}` });
    pick.focus();
    await userEvent.keyboard(" ");
    expect(onPickedChange).toHaveBeenLastCalledWith(new Set(["live"]));
    await userEvent.click(screen.getByRole("checkbox", { name: "Select all the games the table shows" }));
    expect(onPickedChange).toHaveBeenLastCalledWith(new Set(PLAYED_ROWS.map((row) => row.id)));
  });

  it("says it is reading until the store's first read lands", () => {
    mount({ rows: [], loading: true });
    expect(screen.getByTestId("games-loading")).toHaveTextContent("Reading your saved games…");
  });

  it.each([
    [false, "games-empty", "No saved games yet."],
    [true, "games-no-match", "No games match these filters."],
  ])("with no rows and filtered %s, says so", (filtered, testId, words) => {
    mount({ rows: [], filtered });
    expect(screen.getByTestId(testId)).toHaveTextContent(words);
  });

  it("renders one page of 10,000 games", () => {
    mount({ rows: manyRows(10_000) });
    expect(screen.getAllByTestId(/^games-row-/)).toHaveLength(50);
  });

  it("passes axe", async () => {
    mount();
    await expectNoAxeViolations();
  });
});
