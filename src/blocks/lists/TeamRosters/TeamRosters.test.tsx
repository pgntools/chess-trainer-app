import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import TeamRosters from "./TeamRosters";
import { OLYMPIAD } from "./fixtures";

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("TeamRosters", () => {
  it("lists each team with its points and its players, every name a link", async () => {
    render(
      <TeamRosters
        teams={OLYMPIAD}
        playerLink={(name) => ({ href: `/p/${name}` })}
        teamLink={(roster) => ({ href: `/t/${roster.team}` })}
        testId="probe"
      />,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Teams" })).toBeInTheDocument();
    const first = within(screen.getByTestId("probe-team-0"));
    expect(first.getByRole("link", { name: "Uzbekistan" })).toHaveAttribute("href", "/t/Uzbekistan");
    expect(first.getByRole("img", { name: "Uzbekistan" })).toBeInTheDocument();
    expect(screen.getByTestId("probe-team-0-points")).toHaveTextContent("19 match points, 32.0 board points · 4 players");
    expect(within(first.getByRole("list", { name: "Players" })).getAllByRole("link")).toHaveLength(4);
    expect(first.getByRole("link", { name: "Sindarov, Javokhir" })).toHaveAttribute("href", "/p/Sindarov, Javokhir");
    // Players under FIDE's flag: no flag.
    expect(within(screen.getByTestId("probe-team-2")).queryByRole("img")).toBeNull();
    await expectNoAxeViolations(screen.getByTestId("probe"));
  });

  it("leaves the names as text without links", () => {
    render(<TeamRosters teams={OLYMPIAD} testId="probe" />);
    expect(screen.queryByRole("link")).toBeNull();
  });
});
