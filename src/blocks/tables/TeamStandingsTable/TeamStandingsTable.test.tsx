import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import { CLUB_LEAGUE, EMPTY, HEBREW, NATIONS } from "./fixtures";
import TeamStandingsTable, { type TeamStandingsTableProps } from "./TeamStandingsTable";

const mount = (props: Partial<TeamStandingsTableProps> = {}) =>
  render(<TeamStandingsTable tournament={CLUB_LEAGUE} ariaLabel="Club league — standings" testId="t" {...props} />);

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("TeamStandingsTable", () => {
  it("ranks the teams by match points, then board points, and heads Team, MP and BP", () => {
    mount();
    const table = screen.getByRole("table", { name: "Club league — standings" });
    expect(screen.getAllByRole("rowheader")[0]).toHaveTextContent("Lovelace Club");
    expect(within(table).getByRole("columnheader", { name: "Team" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Match points" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Board points" })).toBeInTheDocument();
    // Lovelace: won 2½–1½, won 3½–½, won 2½–1½ — 6 match points, 8½ board points.
    expect(screen.getByTestId("t-row-1-points")).toHaveTextContent("6");
    expect(screen.getByTestId("t-row-1-boardPoints")).toHaveTextContent("8½");
  });

  it("shows a round's board points in its cell, toned as the match went, read with the opponent and the score both ways", () => {
    mount();
    const cell = screen.getByTestId("t-round-1-1");
    expect(cell.querySelector("[aria-hidden]")).toHaveTextContent("2½");
    expect(cell.querySelector("[data-outcome]")).toHaveAttribute("data-outcome", "win");
    expect(cell).toHaveAccessibleName("Round 1 against Turing Club: 2½–1½, won");
  });

  it("explains a match with a game unfinished and a round with no match", () => {
    mount();
    expect(screen.getByTestId("t-legend")).toHaveTextContent("a match with a game unfinished");
    expect(screen.getByTestId("t-legend")).toHaveTextContent("no game in the file");
    expect(screen.getAllByText("Round 2: no match in the file")).toHaveLength(2);
  });

  it("shows a national team's flag — its players' federation — and none for a club of several (CTA-128)", () => {
    mount({ tournament: NATIONS });
    const uzbekistan = screen.getByRole("rowheader", { name: "Uzbekistan Uzbekistan" });
    expect(within(uzbekistan).getByRole("img", { name: "Uzbekistan" })).toHaveAttribute("data-flag", "uz");
    // Before the name, where a player's title stands.
    expect(uzbekistan.querySelector("img")!.compareDocumentPosition(within(uzbekistan).getByText("Uzbekistan"))).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(screen.getByRole("rowheader", { name: "England England" })).toBeInTheDocument();
    expect(within(screen.getByRole("rowheader", { name: "Mixed" })).queryByRole("img")).not.toBeInTheDocument();
  });

  it("is busy while the games are read, and says so for a file with none", () => {
    const { unmount } = mount({ tournament: undefined });
    expect(screen.getByRole("table")).toHaveAttribute("aria-busy", "true");
    unmount();
    mount({ tournament: EMPTY });
    expect(screen.getByText("No games to show.")).toBeInTheDocument();
  });

  it("is in Hebrew under Hebrew", async () => {
    await i18n.changeLanguage("he");
    mount({ tournament: HEBREW });
    expect(screen.getByRole("columnheader", { name: "קבוצה" })).toBeInTheDocument();
  });

  it("passes axe", async () => {
    mount();
    await expectNoAxeViolations();
  });
});
