import { beforeEach, describe, expect, it } from "vitest";
import type { ReactElement } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation, useSearchParams } from "react-router";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import { resetLibrary } from "../../library/libraryTestKit";
import { CollectionDoubleEliminationEmbed, CollectionKnockoutEmbed } from "./CollectionKnockoutEmbed";
import { CollectionTeamStandingsEmbed } from "./CollectionTeamStandingsEmbed";
import { mdxComponents } from "./index";

/*
  The Library's knockouts and team events in an article (CTA-128):
  <CollectionKnockoutBracket>, <CollectionDoubleEliminationBracket> and
  <CollectionTeamStandingsTable>, over the shipped Netherlands Championship,
  Esports World Cup play-in and World Rapid and Blitz Team 2026 collections —
  names linked to the games of a player (a team's players), games to the
  Library's board.
*/

/** Where a link led: the path, the filter's players, and the `from` a game's board would go back to. */
function Landing() {
  const location = useLocation();
  const [params] = useSearchParams();
  return (
    <p data-testid="landed">
      {location.pathname} [{params.getAll("player").join(" | ")}] {(location.state as { from?: string } | null)?.from ?? ""}
    </p>
  );
}

const mount = (embed: ReactElement) =>
  render(
    <MemoryRouter initialEntries={["/blog/an-article"]}>
      <Routes>
        <Route path="/blog/*" element={embed} />
        <Route path="/library/*" element={<Landing />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(async () => {
  await resetLibrary();
  await i18n.changeLanguage("en");
});

describe("the collection brackets and team table (CTA-128)", () => {
  it("are what an article's MDX names", () => {
    expect(mdxComponents.CollectionKnockoutBracket).toBe(CollectionKnockoutEmbed);
    expect(mdxComponents.CollectionDoubleEliminationBracket).toBe(CollectionDoubleEliminationEmbed);
    expect(mdxComponents.CollectionTeamStandingsTable).toBe(CollectionTeamStandingsEmbed);
  });

  describe("<CollectionKnockoutBracket>", () => {
    it("draws a knockout's bracket, each name a link to the player's games", async () => {
      const user = userEvent.setup();
      mount(<CollectionKnockoutEmbed _id="/library/netherlands2026" />);
      expect(await screen.findByRole("region", { name: "ch-NED KO 2026 — bracket" })).toBeInTheDocument();
      const final = screen.getByRole("list", { name: "Final" });
      const name = within(final).getByRole("link", { name: "Tiviakov, Sergei" });
      expect(name).toHaveAttribute("href", "/library/netherlands2026?player=Tiviakov%2C%20Sergei");
      await user.click(name);
      expect(screen.getByTestId("landed")).toHaveTextContent("/library/netherlands2026 [Tiviakov, Sergei]");
    });

    it("lists each match's games under it, each opening its game on the Library's board, back to the article", async () => {
      const user = userEvent.setup();
      mount(<CollectionKnockoutEmbed _id="/library/netherlands2026" />);
      await screen.findByRole("region", { name: "ch-NED KO 2026 — bracket" });
      const games = within(screen.getByRole("list", { name: "Final" })).getByRole("list", { name: "Games" });
      const [first] = within(games).getAllByRole("link");
      expect(first).toHaveAccessibleName(/^Game 1: .+ – .+, (1–0|0–1|½–½)$/);
      expect(first.getAttribute("href")).toMatch(/^\/library\/netherlands2026\/\d+$/);
      await user.click(first);
      expect(screen.getByTestId("landed")).toHaveTextContent(/^\/library\/netherlands2026\/\d+ \[\] \/blog\/an-article$/);
    });

    it("leaves names and games as text with playerLink={false} and gameLink={false}", async () => {
      mount(<CollectionKnockoutEmbed _id="/library/netherlands2026" playerLink={false} gameLink={false} />);
      await screen.findByRole("region", { name: "ch-NED KO 2026 — bracket" });
      expect(screen.queryAllByRole("link")).toEqual([]);
    });

    it("links a team knockout's team to every one of its players' games, and each leg to its first board", async () => {
      mount(<CollectionKnockoutEmbed _id="/library/worldblitzteam2026" density="dense" />);
      expect(await screen.findByRole("region", { name: "FIDE World Bl Team Final — bracket" })).toBeInTheDocument();
      const team = screen.getAllByRole("link", { name: "Dragon Chilling" })[0];
      expect(new URLSearchParams(team.getAttribute("href")!.split("?")[1]).getAll("player").length).toBeGreaterThan(1);
      const final = within(screen.getByRole("list", { name: "Final" })).getAllByRole("list", { name: "Legs" })[0];
      expect(within(final).getAllByRole("link")[0]).toHaveAccessibleName(/^Leg 1: .+ — opens its first board$/);
    });

    it("says so for a collection this browser's Library does not hold", async () => {
      mount(<CollectionKnockoutEmbed _id="/library/nowhere" />);
      expect(await screen.findByText("This collection is not in this browser's Library.")).toBeInTheDocument();
      expect(screen.getByTestId("tournament-collection-nowhere-knockout-missing")).toBeInTheDocument();
    });

    it("passes axe, links and all", async () => {
      mount(<CollectionKnockoutEmbed _id="/library/netherlands2026" />);
      await screen.findByRole("region", { name: "ch-NED KO 2026 — bracket" });
      await expectNoAxeViolations();
    });
  });

  describe("<CollectionDoubleEliminationBracket>", () => {
    it("draws the winners' bracket over the losers', the losers' from round 51 unless told", async () => {
      mount(<CollectionDoubleEliminationEmbed _id="/library/esportsplayin2026" />);
      expect(await screen.findByRole("region", { name: "Esports World Cup PI 2026 — bracket — Losers' bracket" })).toBeInTheDocument();
      expect(screen.getByTestId("tournament-collection-esportsplayin2026-doubleElimination-winners-title")).toHaveTextContent("Winners' bracket");
      expect(screen.getAllByRole("link", { name: "Esipenko, Andrey" }).length).toBeGreaterThan(1);
    });
  });

  describe("<CollectionTeamStandingsTable>", () => {
    const table = () => screen.findByRole("table", { name: "FIDE World Rapid Team — standings" });

    it("draws a team Swiss's standings, each team a link to its players' games", async () => {
      const user = userEvent.setup();
      mount(<CollectionTeamStandingsEmbed _id="/library/worldrapidteam2026" rowsPerPage="25" />);
      await table();
      const team = screen.getByRole("link", { name: "Dragon Chilling" });
      await user.click(team);
      expect(screen.getByTestId("landed")).toHaveTextContent(/^\/library\/worldrapidteam2026 \[.+ \| .+\]/);
    }, 20_000);

    it("makes each round's match a link to its first board, back to the article", async () => {
      const user = userEvent.setup();
      mount(<CollectionTeamStandingsEmbed _id="/library/worldrapidteam2026" rowsPerPage="25" />);
      await table();
      const match = within(screen.getByTestId("tournament-collection-worldrapidteam2026-team-round-1-1")).getByRole("link");
      expect(match).toHaveAccessibleName(/^Round 1 against .+: 4½–1½, won$/);
      await user.click(match);
      expect(screen.getByTestId("landed")).toHaveTextContent(/^\/library\/worldrapidteam2026\/\d+ \[\] \/blog\/an-article$/);
    }, 20_000);

    it("leaves names and matches as text with teamLink={false} and gameLink={false}", async () => {
      mount(<CollectionTeamStandingsEmbed _id="/library/worldrapidteam2026" rowsPerPage="25" teamLink={false} gameLink={false} />);
      await table();
      expect(within(screen.getByRole("table", { name: "FIDE World Rapid Team — standings" })).queryAllByRole("link")).toEqual([]);
    }, 20_000);

    it("says so for a collection whose games name no teams", async () => {
      mount(<CollectionTeamStandingsEmbed _id="/library/candidates2026" />);
      expect(await screen.findByText("This collection is not a team event: its games name no teams.")).toBeInTheDocument();
    });

    it("is in Hebrew under Hebrew", async () => {
      await i18n.changeLanguage("he");
      mount(<CollectionTeamStandingsEmbed _id="/library/worldblitzteam2026" />);
      expect(await screen.findByRole("table", { name: "FIDE World Bl Team Final — טבלת הדירוג" })).toBeInTheDocument();
    });
  });
});
