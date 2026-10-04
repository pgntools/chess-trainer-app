import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import { BLITZ_TEAMS, DUTCH, EMPTY, ESPORTS, ESPORTS_FINAL, HEBREW, UNFINISHED } from "./fixtures";
import KnockoutBracket, { type KnockoutBracketProps } from "./KnockoutBracket";

const mount = (props: Partial<KnockoutBracketProps> = {}) =>
  render(<KnockoutBracket knockout={DUTCH} ariaLabel="ch-NED KO 2026 — bracket" testId="k" {...props} />);

const titles = (bracket: string) =>
  within(screen.getByTestId(bracket))
    .getAllByRole("list")
    .map((list) => list.getAttribute("aria-labelledby"))
    .map((id) => document.getElementById(id!)?.textContent);

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("KnockoutBracket", () => {
  it("names a plain knockout's last rounds as they halve to the final", () => {
    mount();
    expect(screen.getByRole("region", { name: "ch-NED KO 2026 — bracket" })).toBeInTheDocument();
    expect(titles("k-winners")).toEqual(["Round 1", "Quarter-finals", "Semi-finals", "Final"]);
  });

  it("reads each match in words — the scores, tiebreaks counted, and who went through", () => {
    mount();
    const first = screen.getByRole("list", { name: "Round 1" });
    expect(within(first).getAllByRole("listitem")).toHaveLength(8);
    expect(within(first).getByText("Burg, Twan 1½, Sokolov, Ivan 2½: Sokolov, Ivan goes through")).toBeInTheDocument();
    expect(screen.getByTestId("k-winners-match-4-1-0")).toHaveAttribute("data-winner", "true");
    expect(screen.getByTestId("k-winners-match-4-1-0")).toHaveTextContent(/Tiviakov, Sergei3$/);
  });

  it("draws a double elimination as two brackets, each named — rounds numbered, no stage names", () => {
    mount({ knockout: ESPORTS, ariaLabel: "Play-in — bracket" });
    expect(screen.getByTestId("k-winners-title")).toHaveTextContent("Winners' bracket");
    expect(screen.getByRole("region", { name: "Play-in — bracket — Winners' bracket" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Play-in — bracket — Losers' bracket" })).toBeInTheDocument();
    expect(titles("k-losers")).toEqual(["Round 1", "Round 2", "Round 3", "Round 4"]);
    expect(within(screen.getByTestId("k-losers")).getByText("Esipenko, Andrey 1½, Artemiev, Vladislav ½: Esipenko, Andrey goes through")).toBeInTheDocument();
  });

  it("names the round with a match for third place the final, and captions that match", () => {
    mount({ knockout: ESPORTS_FINAL });
    expect(titles("k-winners")).toEqual(["Quarter-finals", "Semi-finals", "Final"]);
    expect(screen.getByTestId("k-winners-match-3-2-caption")).toHaveTextContent("Match for third place");
    expect(
      screen.getByText("Match for third place: Nakamura, Hikaru 4, Firouzja, Alireza 1: Nakamura, Hikaru goes through"),
    ).toBeInTheDocument();
  });

  it("scores a team knockout in legs, the board points beside them and in the words", () => {
    mount({ knockout: BLITZ_TEAMS });
    const line = screen.getByTestId("k-winners-match-1-1-0");
    expect(line).toHaveTextContent("Team MGD12(8½)");
    expect(screen.getByText("Team MGD1 2 (8½ board points), Kazchess 0 (3½ board points): Team MGD1 goes through")).toBeInTheDocument();
  });

  it("marks nobody in a level match, and says no one went through", () => {
    mount({ knockout: UNFINISHED });
    expect(screen.getByText("Lovelace, Ada 1, Knuth, Donald 1")).toBeInTheDocument();
    expect(screen.getByTestId("k-winners-match-2-1-0")).not.toHaveAttribute("data-winner");
  });

  it("is busy while the games are read, and says so for a file with none", () => {
    const { unmount } = mount({ knockout: undefined });
    expect(screen.getByRole("status")).toHaveTextContent("Reading the bracket…");
    unmount();
    mount({ knockout: EMPTY });
    expect(screen.getByText("No matches to show.")).toBeInTheDocument();
  });

  it("is in Hebrew under Hebrew", async () => {
    await i18n.changeLanguage("he");
    mount({ knockout: HEBREW });
    expect(screen.getByRole("list", { name: "גמר" })).toBeInTheDocument();
  });

  it("passes axe — a plain knockout and a double elimination", async () => {
    const { unmount } = mount();
    await expectNoAxeViolations();
    unmount();
    mount({ knockout: ESPORTS });
    await expectNoAxeViolations();
  });

  describe("links (CTA-128)", () => {
    const toGame = (game: number) => ({ href: `#game-${game}` });

    it("makes each name a link where playerLink gives one", () => {
      mount({ playerLink: (player) => (player.name.startsWith("Tiviakov") ? { href: "#tiviakov" } : undefined) });
      const final = screen.getByRole("list", { name: "Final" });
      expect(within(final).getByRole("link", { name: "Tiviakov, Sergei" })).toHaveAttribute("href", "#tiviakov");
      // `undefined` for a player leaves the name as text.
      expect(within(final).queryByRole("link", { name: /Vrolijk/ })).not.toBeInTheDocument();
      expect(screen.queryByRole("list", { name: "Games" })).not.toBeInTheDocument();
    });

    it("lists a match's games under it, each showing the first side's points and read whole", () => {
      mount({ gameLink: toGame });
      const final = within(screen.getByRole("list", { name: "Final" })).getByRole("list", { name: "Games" });
      const links = within(final).getAllByRole("link");
      const match = DUTCH.winners.rounds.at(-1)!.matches[0];
      expect(links).toHaveLength(match.games.length);
      expect(links[0]).toHaveAttribute("href", `#game-${match.games[0].game}`);
      expect(links[0]).toHaveAccessibleName(/^Game 1: .+ – .+, (1–0|0–1|½–½)$/);
      expect(links.map((link) => link.textContent).every((text) => ["1", "½", "0"].includes(text ?? ""))).toBe(true);
    });

    it("links a team match by its legs, each to its first board, its board points both ways", async () => {
      mount({ knockout: BLITZ_TEAMS, ariaLabel: "Blitz — bracket", gameLink: toGame, playerLink: (team) => ({ href: `#${team.id}` }) });
      const match = BLITZ_TEAMS.winners.rounds[0].matches[0];
      const legs = screen.getByTestId("k-winners-match-1-1-games");
      expect(within(legs).getAllByRole("link")).toHaveLength(match.legs!);
      const first = within(legs).getAllByRole("link")[0];
      expect(first).toHaveAttribute("href", `#game-${match.games[0].game}`);
      expect(first.textContent).toMatch(/^\d½?–\d½?$/);
      expect(first).toHaveAccessibleName(new RegExp(`^Leg 1: ${match.sides[0].competitor.name} .+ — opens its first board$`));
      expect(screen.getAllByRole("link", { name: match.sides[0].competitor.name }).length).toBeGreaterThan(0);
      await expectNoAxeViolations();
    });
  });
});
