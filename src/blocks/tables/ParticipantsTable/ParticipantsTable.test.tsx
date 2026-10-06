import { beforeEach, describe, expect, it } from "vitest";
import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import { readText } from "../../../test/readText";
import type { DataTableSort } from "../../../design-system/patterns/tables";
import type { Participant } from "../../../lib/tournamentParticipants";
import ParticipantsTable from "./ParticipantsTable";
import { PARTICIPANTS_DEFAULT_SORT, type ParticipantsColumn } from "./participantsColumns";
import { CLUB, TEAMS } from "./fixtures";

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

const Live = ({ participants, teams = false }: { participants: readonly Participant[]; teams?: boolean }) => {
  const [sort, setSort] = useState<DataTableSort<ParticipantsColumn>>(PARTICIPANTS_DEFAULT_SORT);
  return (
    <ParticipantsTable
      participants={participants}
      sort={sort}
      onSort={(column, direction) => setSort({ column, direction })}
      playerLink={(player) => ({ href: `/library/cup?tab=games&player=${encodeURIComponent(player.name)}` })}
      teams={teams}
      ariaLabel="Club championship — participants"
      testId="probe"
    />
  );
};

/** The body's rows' player cells, as read. */
const players = () =>
  within(screen.getByRole("table", { name: "Club championship — participants" }))
    .getAllByRole("row")
    .slice(1)
    .map((row) => readText(within(row).getAllByRole("cell")[1]));

describe("ParticipantsTable", () => {
  it("lists every player in the standings' order, with their record", async () => {
    render(<Live participants={CLUB} />);
    expect(players()).toEqual([
      "Grandmaster Muzychuk, Anna Ukraine",
      "Grandmaster Gelfand, Boris Israel",
      "Woman FIDE Master Heredia, Carla Spain",
      "Levi, Dan",
    ]);
    const anna = within(screen.getByTestId("probe-row-Muzychuk-Anna")).getAllByRole("cell").map((cell) => cell.textContent);
    // #, player, rating, points, games, W, D, L, performance.
    expect(anna.slice(2)).toEqual(["2,520", "2.5", "3", "2", "1", "0", expect.stringMatching(/^\d,\d{3}$/)]);
    // An unrated player: a dash for the rating; two losses to rated players — their average less 800.
    const dan = within(screen.getByTestId("probe-row-Levi-Dan")).getAllByRole("cell");
    expect(dan[2]).toHaveTextContent("—");
    expect(dan.at(-1)).toHaveTextContent("1,785");
    await expectNoAxeViolations(screen.getByTestId("probe"));
  });

  it("links each name to the player's games", () => {
    render(<Live participants={CLUB} />);
    expect(screen.getByRole("link", { name: "Gelfand, Boris" })).toHaveAttribute("href", "/library/cup?tab=games&player=Gelfand%2C%20Boris");
  });

  it("sorts from a header, numbers high first", async () => {
    const user = userEvent.setup();
    render(<Live participants={CLUB} />);
    await user.click(screen.getByRole("button", { name: "Rating" }));
    expect(players()[0]).toContain("Gelfand");
    await user.click(screen.getByRole("button", { name: "Player" }));
    expect(players()[0]).toContain("Gelfand");
    expect(players().at(-1)).toContain("Muzychuk");
  });

  it("names a team event's teams", () => {
    render(<Live participants={TEAMS} teams />);
    expect(screen.getByRole("columnheader", { name: /Team/ })).toBeInTheDocument();
    expect(within(screen.getByTestId("probe-row-Heredia-Carla")).getByText("Kyiv")).toBeInTheDocument();
  });

  it("says when there is no one", () => {
    render(<Live participants={[]} />);
    expect(screen.getByText("No players in these games.")).toBeInTheDocument();
  });
});
