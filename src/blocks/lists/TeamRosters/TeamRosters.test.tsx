import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import { readText } from "../../../test/readText";
import TeamRosters from "./TeamRosters";
import { OLYMPIAD } from "./fixtures";

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("TeamRosters", () => {
  it("lists each team as a line, its points at the end and its players under it, every name a link", async () => {
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
    // In view abbreviated; read in full.
    expect(screen.getByTestId("probe-team-0-points")).toHaveTextContent("19 MP · 32.0 BP");
    expect(screen.getByTestId("probe-team-0-points")).toHaveTextContent("19 match points, 32.0 board points");
    expect(within(first.getByRole("list", { name: "Uzbekistan's players" })).getAllByRole("link")).toHaveLength(4);
    expect(first.getByRole("link", { name: "Sindarov, Javokhir" })).toHaveAttribute("href", "/p/Sindarov, Javokhir");
    // Players under FIDE's flag: no flag.
    expect(within(screen.getByTestId("probe-team-2")).queryByRole("img")).toBeNull();
    await expectNoAxeViolations(screen.getByTestId("probe"));
  });

  it("shows a titled player's title as the Participants table's chip, before their name and outside the link", async () => {
    render(
      <TeamRosters
        teams={OLYMPIAD}
        playerLink={(name) => ({ href: `/p/${name}` })}
        teamLink={(roster) => ({ href: `/t/${roster.team}` })}
        testId="probe"
      />,
    );
    const list = within(within(screen.getByTestId("probe-team-0")).getByRole("list", { name: "Uzbekistan's players" }));
    const chips = list.getAllByText("GM");
    expect(chips).toHaveLength(2);
    // The chip is the first thing in the line; the link is the name alone, so the chip is outside it.
    const name = list.getByRole("link", { name: "Abdusattorov, Nodirbek" });
    expect(chips[0].compareDocumentPosition(name)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(name).not.toContainElement(chips[0]);
    // Read in full ("Grandmaster") and in the Participants table's tone.
    expect(list.getAllByText("Grandmaster")).toHaveLength(2);
    expect(chips[0].closest("[data-tone]")).toHaveAttribute("data-tone", "warning");
    // A reader hears the line as the table reads it.
    expect(readText(list.getAllByRole("listitem")[0])).toBe("Grandmaster Abdusattorov, Nodirbek");
    // A player without a title renders unchanged: a plain link, no chip.
    expect(readText(list.getAllByRole("listitem")[2])).toBe("Yakubboev, Nodirbek");
    await expectNoAxeViolations(screen.getByTestId("probe"));
  });

  it("leaves the names as text without links", () => {
    render(<TeamRosters teams={OLYMPIAD} testId="probe" />);
    expect(screen.queryByRole("link")).toBeNull();
    // The title chip shows without a link too.
    expect(screen.getAllByText("GM").length).toBeGreaterThan(0);
  });
});
