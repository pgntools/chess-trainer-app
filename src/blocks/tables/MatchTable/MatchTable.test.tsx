import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import { CLUTCH, HEBREW, UNFINISHED } from "./fixtures";
import MatchTable, { type MatchTableProps } from "./MatchTable";

const mount = (props: Partial<MatchTableProps> = {}) =>
  render(<MatchTable match={CLUTCH} ariaLabel="Clutch Chess: The Legends 2026 — the match" testId="m" {...props} />);

const TOPALOV = "2900084";
const KASPAROV = "4100018";

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("MatchTable", () => {
  it("is two rows, the leader first, and a column per game", () => {
    mount();
    const table = screen.getByRole("table", { name: "Clutch Chess: The Legends 2026 — the match" });
    expect(screen.getAllByRole("rowheader").map((header) => header.textContent)).toEqual(["Topalov, Veselin", "Kasparov, Garry"]);
    // The rank, the player, the rating, twelve games, the points.
    expect(within(table).getAllByRole("columnheader")).toHaveLength(16);
    expect(within(table).getByRole("columnheader", { name: "Game 12" })).toBeInTheDocument();
    expect(screen.getByTestId(`m-row-${TOPALOV}-points`)).toHaveTextContent("8");
    expect(screen.getByTestId(`m-row-${KASPAROV}-points`)).toHaveTextContent("4");
  });

  it("reads each game's cell for its row's player: the game, the colour, the opponent and the result", () => {
    mount();
    expect(screen.getByTestId(`m-round-${TOPALOV}-1`)).toHaveAccessibleName("Game 1, White against Kasparov, Garry: win");
    expect(screen.getByTestId(`m-round-${KASPAROV}-4`)).toHaveAccessibleName("Game 4, White against Topalov, Veselin: win");
  });

  it("writes a half point as ½, and explains an unfinished game", () => {
    mount({ match: UNFINISHED });
    expect(screen.getByTestId("m-legend")).toHaveTextContent("unfinished game");
    expect(screen.getAllByRole("rowheader")[0]).toHaveAccessibleName("Grandmaster Lovelace, Ada England");
    expect(screen.getAllByRole("row")[1]).toHaveTextContent("1½");
  });

  it("is busy while the games are read", () => {
    mount({ match: undefined });
    expect(screen.getByRole("table")).toHaveAttribute("aria-busy", "true");
  });

  it("is in Hebrew under Hebrew", async () => {
    await i18n.changeLanguage("he");
    mount({ match: HEBREW });
    expect(screen.getByRole("columnheader", { name: "משחק 2" })).toBeInTheDocument();
  });

  it("passes axe", async () => {
    mount();
    await expectNoAxeViolations();
  });
});
