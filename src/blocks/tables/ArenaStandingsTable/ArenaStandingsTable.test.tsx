import { useState } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import { readText } from "../../../test/readText";
import ArenaStandingsTable, { type ArenaStandingsTableProps } from "./ArenaStandingsTable";
import { BIG_ARENA, EMPTY, HEBREW_ARENA, TITLED_ARENA } from "./fixtures";

const mount = (props: Partial<ArenaStandingsTableProps> = {}) =>
  render(
    <ArenaStandingsTable
      arena={TITLED_ARENA.lichess}
      ariaLabel="Titled Arena — standings"
      testId="t"
      {...props}
    />,
  );

/** Each row by its accessible name: a title read in full, a federation by its country. */
const names = () => screen.getAllByRole("rowheader").map((header) => readText(header));
/** A player's sheet as its glyphs, in order. */
const glyphs = (player: string) => [...screen.getByTestId(`t-sheet-${player}`).querySelectorAll("[aria-hidden='true'][dir='ltr']")].map((mark) => mark.textContent);
/** A player's sheet as its marks' words, in order. */
const words = (player: string) => readText(screen.getByTestId(`t-sheet-${player}`));
const pointsOf = (player: string) => within(screen.getByTestId(`t-row-${player}`)).getAllByRole("cell")[3].textContent;

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("ArenaStandingsTable", () => {
  it("heads the rank, the player, the rating, the score sheet, the points, the games and the performance", () => {
    mount();
    const table = within(screen.getByRole("table", { name: "Titled Arena — standings" }));
    expect(table.getAllByRole("columnheader").map((head) => head.querySelector("[aria-hidden]")?.textContent ?? head.textContent)).toEqual([
      "#",
      "Player",
      "Rtg",
      "Score sheet",
      "Pts",
      "G",
      "Perf",
    ]);
    for (const name of ["Rank", "Rating", "Points", "Games", "Performance"]) expect(table.getByRole("columnheader", { name })).toBeInTheDocument();
  });

  it("ranks Lichess points, then performance — titles as chips, federations as flags, each name its row's header", () => {
    mount();
    expect(names()).toEqual([
      "Grandmaster penguingim1 United States",
      "International Master BrightFalcon",
      // 3 points each: yyoochess's performance 3037, msb2's 2995.
      "Grandmaster yyoochess United States",
      "Grandmaster msb2 Germany",
      "International Master rob188 Armenia",
      "newcomer",
    ]);
    expect(pointsOf("penguingim1")).toBe("13");
    const row = within(screen.getByTestId("t-row-yyoochess"));
    expect(row.getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["3", "3,202", expect.any(String), "3", "5", "3,037"]);
  });

  it("writes each game's score in the order played — doubled on fire, a bolt after berserk, nothing for a draw too early or in a streak", () => {
    mount();
    expect(glyphs("penguingim1")).toEqual(["2", "2", "5", "2", "2"]);
    expect(words("penguingim1")).toBe(
      [
        "Game 1, White against newcomer: win, scored 2",
        "Game 2, Black against yyoochess: win, scored 2",
        "Game 3, White against rob188: win, scored 5, on fire, double points, berserk, one point more",
        "Game 4, Black against rob188: draw, scored 2, on fire, double points",
        "Game 5, White against msb2: win, scored 2",
      ].join(" "),
    );
    expect(glyphs("BrightFalcon")).toEqual(["3", "2", "5", "0"]);
    expect(words("BrightFalcon")).toContain("Game 2, Black against newcomer: win, scored 2, berserk, no extra point in under 7 moves");
    expect(words("BrightFalcon")).toContain("Game 4, Black against yyoochess: loss, scored 0, berserk");
    expect(glyphs("msb2")).toEqual(["1", "0", "0", "2", "0"]);
    expect(words("msb2")).toContain("Game 2, Black against rob188: draw, scored 0, no points for a draw in the first 10 moves");
    expect(words("msb2")).toContain("Game 3, White against newcomer: draw, scored 0, no points for a draw in a draw streak");
    expect(glyphs("yyoochess")).toEqual(["1", "0", "0", "2", "*"]);
    expect(words("yyoochess")).toContain("Game 5, Black against rob188: unfinished");
  });

  it("explains the marks it shows under the table", () => {
    mount();
    expect(readText(screen.getByTestId("t-legend"))).toBe(
      "on fire: after two wins in a row, a win scores 4 and a draw 2 berserk: a win scores one point more unfinished game",
    );
  });

  it("draws an arena scored in game points as 1, ½, 0 — no fire or berserk — ranked by them", () => {
    mount({ arena: TITLED_ARENA.game });
    expect(names().map((name) => name.split(" ").at(-1))).toEqual(["States", "BrightFalcon", "Germany", "States", "Armenia", "newcomer"]);
    expect(glyphs("penguingim1")).toEqual(["1", "1", "1", "½", "1"]);
    expect(pointsOf("penguingim1")).toBe("4.5");
    expect(words("penguingim1")).not.toContain("on fire");
    expect(readText(screen.getByTestId("t-legend"))).toBe("unfinished game");
  });

  it("links each name and each game where it is given one", () => {
    mount({ playerLink: (player) => ({ href: `#player-${player.name}` }), gameLink: (game) => ({ href: `#game-${game}` }) });
    const row = within(screen.getByTestId("t-row-penguingim1"));
    expect(row.getByRole("link", { name: "penguingim1" })).toHaveAttribute("href", "#player-penguingim1");
    const third = screen.getByTestId("t-sheet-penguingim1-link-2");
    expect(third).toHaveAccessibleName("Game 3, White against rob188: win, scored 5, on fire, double points, berserk, one point more");
    expect(third.getAttribute("href")).toMatch(/^#game-\d+$/);
  });

  it("pages a long arena, each row keeping its rank", async () => {
    const user = userEvent.setup();
    function Paged() {
      const [page, setPage] = useState(0);
      return (
        <ArenaStandingsTable
          arena={BIG_ARENA.lichess}
          paging={{ page, rowsPerPage: 50, onPageChange: setPage, onRowsPerPageChange: () => {}, labelRowsPerPage: "Rows per page" }}
          ariaLabel="Big Arena"
          testId="t"
        />
      );
    }
    render(<Paged />);
    expect(screen.getAllByRole("rowheader")).toHaveLength(50);
    await user.click(within(screen.getByTestId("t-table-pager")).getByRole("button", { name: /next page/i }));
    const first = screen.getAllByRole("row")[1];
    expect(within(first).getAllByRole("cell")[0]).toHaveTextContent("51");
  });

  it("says it is reading, and that a file has no game", () => {
    const { unmount } = mount({ arena: undefined });
    expect(screen.getByTestId("t-table-loading")).toHaveTextContent("Reading the tournament…");
    expect(screen.getByRole("table")).toHaveAttribute("aria-busy", "true");
    unmount();
    mount({ arena: EMPTY });
    expect(screen.getByTestId("t-table-empty")).toHaveTextContent("No games to show.");
    expect(screen.queryByTestId("t-legend")).toBeNull();
  });

  it("speaks Hebrew", async () => {
    await i18n.changeLanguage("he");
    mount({ arena: HEBREW_ARENA.lichess, ariaLabel: "ארנה" });
    expect(screen.getByRole("columnheader", { name: "גיליון ניקוד" })).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = mount({ playerLink: (player) => ({ href: `#player-${player.name}` }), gameLink: (game) => ({ href: `#game-${game}` }) });
    await expectNoAxeViolations(container);
  });
});
