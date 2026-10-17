import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../i18n";
import { updateCollectionSettings, uploadedCollectionsSnapshot } from "../../lib/libraryCollectionStore";
import type { TournamentFormat } from "../../lib/libraryCollections";
import { expectNoAxeViolations } from "../../test/axe";
import { readText } from "../../test/readText";
import { cleanupAndMount, GAMES, keep, mount, mountTable, resetLibrary, upload, where } from "./libraryTestKit";
import { tournamentTabOf } from "./tournamentTabs";

vi.mock("../../lib/engines/builtin", async (importOriginal) =>
  (await import("../board/boardTestHarness")).builtinEnginesMock(importOriginal),
);

const shell = vi.hoisted(() => ({ compact: false }));
vi.mock("../main/shellCompact", () => ({ useShellCompact: () => shell.compact }));
vi.mock("react-chessboard", async () => {
  const { reactChessboardMock } = await import("../board/boardTestHarness");
  return reactChessboardMock();
});

vi.mock("../../lib/pgnExport", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/pgnExport")>()),
  downloadPgn: vi.fn(() => true),
}));

vi.mock("../../lib/openings", async (importOriginal) => {
  const { openingsMock } = await import("../board/boardTestHarness");
  return openingsMock(importOriginal as () => Promise<typeof import("../../lib/openings")>);
});

/*
  The Library's tournament view (CTA-142): a collection that reads as a
  tournament opens on Info, Participants and Games tabs instead of its games
  table — the tab the URL's, each format's table on Info (the shipped
  tournaments, which the manifest marks, and uploads marked in their
  settings), every player's record on Participants, the games table
  unchanged on Games — and an unmarked collection's screen as it was.
*/

beforeEach(async () => {
  shell.compact = false;
  await resetLibrary();
});

/** An upload of `games`, marked as a tournament of `type`. */
const marked = async (type: TournamentFormat, games = GAMES, name = "Club games") => {
  const collection = await keep(name, games);
  expect(await updateCollectionSettings(collection.id, { tournament: { enabled: true, type } })).toBeUndefined();
  return collection;
};

const tab = (id: "info" | "participants" | "games") => screen.getByRole("tab", { name: i18n.t(`library.tournament.tabs.${id}`) });

describe("the tab the URL names", () => {
  it("is ?tab=, else Games for the games table's own state, else Info", () => {
    expect(tournamentTabOf(new URLSearchParams(""))).toBe("info");
    expect(tournamentTabOf(new URLSearchParams("tab=participants"))).toBe("participants");
    expect(tournamentTabOf(new URLSearchParams("player=Giri%2C+Anish"))).toBe("games");
    expect(tournamentTabOf(new URLSearchParams("sort=white&tab=info"))).toBe("info");
    expect(tournamentTabOf(new URLSearchParams("tab=bogus"))).toBe("info");
  });
});

describe("a tournament collection's view", () => {
  it("opens on Info — one h1, the tabs links that keep the URL, each tab its panel", async () => {
    const user = userEvent.setup();
    const cup = await marked("roundRobin");
    mount(`/library/${cup.id}`);
    await screen.findByTestId("library-tournament-screen");
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Club games");
    expect(tab("info")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: "Info" })).toBe(screen.getByTestId("library-tournament-panel-info"));
    // Info registers nothing in the right-hand panel: it spans the panel's room (HideRightPanel).
    expect(screen.queryByTestId("layout-right-panel")).toBeNull();
    expect(tab("participants")).toHaveAttribute("href", `/library/${cup.id}?tab=participants`);

    await user.click(tab("participants"));
    expect(where()).toBe(`/library/${cup.id}?tab=participants`);
    expect(await screen.findByRole("tabpanel", { name: "Participants" })).toBeInTheDocument();

    // Games: the table as an unmarked collection's, the strip under its header.
    await user.click(tab("games"));
    expect(where()).toBe(`/library/${cup.id}?tab=games`);
    const table = await screen.findByTestId("library-table");
    expect(screen.getByRole("tabpanel", { name: "Games" })).toContainElement(table);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByTestId("library-filters")).toBeInTheDocument();
  });

  it("keeps the Games tab's filters in the URL beside its tab, and a player's link from a Blog table lands on Games", async () => {
    const cup = await marked("roundRobin");
    mount(`/library/${cup.id}?player=Amy`);
    await screen.findByTestId("library-table");
    expect(tab("games")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("library-table-count")).toHaveTextContent("2 of 3");
    // Switching away and back keeps the filter.
    expect(tab("info")).toHaveAttribute("href", `/library/${cup.id}?player=Amy&tab=info`);
  });

  it("draws a round robin's crosstable on Info for a shipped tournament, a result opening its game and Back returning", async () => {
    const user = userEvent.setup();
    mount("/library/candidates2026");
    const table = await screen.findByTestId("tournament-collection-candidates2026-roundRobin", {}, { timeout: 15_000 });
    expect(screen.getByTestId("library-collection-details-tournament-facts-type")).toHaveTextContent("Round robin");
    expect(screen.getByTestId("library-collection-details-tournament-facts-event")).toHaveTextContent("FIDE Candidates 2026");
    expect(screen.getByTestId("library-collection-details-tournament-facts-players")).toHaveTextContent("8");
    expect(screen.queryByTestId("library-tournament-misfit")).toBeNull();
    // A shipped collection has no settings.
    expect(screen.queryByTestId("library-table-settings")).toBeNull();
    // A name links to the Games tab filtered by that player.
    expect(within(table).getByRole("link", { name: "Giri, Anish" })).toHaveAttribute("href", "/library/candidates2026?tab=games&player=Giri%2C%20Anish");

    await user.click(within(table).getAllByRole("link", { name: /^Round \d+, White against/ })[0]);
    await screen.findByTestId("library-game-board");
    await user.click(screen.getByTestId("library-game-details-back"));
    await screen.findByTestId("library-tournament-screen");
    expect(tab("info")).toHaveAttribute("aria-selected", "true");
    expect(where()).toBe("/library/candidates2026");
    await expectNoAxeViolations(screen.getByTestId("library-tournament-screen"));
  }, 30_000);

  it.each([
    ["netherlands2026", "a knockout", "tournament-collection-netherlands2026-knockout"],
    ["esportsplayin2026", "a double elimination", "tournament-collection-esportsplayin2026-doubleElimination"],
    ["worldblitzteam2026", "a team knockout", "tournament-collection-worldblitzteam2026-knockout"],
  ])("draws %s's bracket — %s", async (id, _what, testId) => {
    mount(`/library/${id}`);
    expect(await screen.findByTestId(testId, {}, { timeout: 15_000 })).toBeInTheDocument();
    expect(screen.queryByTestId("library-tournament-misfit")).toBeNull();
  }, 30_000);

  it("draws a team Swiss's standings, counting its teams", async () => {
    mount("/library/worldrapidteam2026");
    expect(await screen.findByTestId("tournament-collection-worldrapidteam2026-team", {}, { timeout: 20_000 })).toBeInTheDocument();
    // The teams are counted off the games' own tags, once read.
    await waitFor(() => expect(screen.getByTestId("library-collection-details-tournament-facts-teams")).toHaveTextContent("48"), { timeout: 20_000 });
    expect(screen.getByTestId("library-collection-details-tournament-facts-type")).toHaveTextContent("Team Swiss / round robin");
  }, 40_000);

  it("draws a Swiss's standings and a match's table for uploads marked so", async () => {
    const swiss = await marked("swiss");
    mount(`/library/${swiss.id}`);
    expect(await screen.findByTestId(`tournament-collection-${swiss.id}-swiss`)).toBeInTheDocument();

    const match = await marked(
      "match",
      ['[Event "Duel"]\n[Round "1"]\n[White "Ann"]\n[Black "Bea"]\n[Result "1-0"]\n\n1. e4 1-0', '[Event "Duel"]\n[Round "2"]\n[White "Bea"]\n[Black "Ann"]\n[Result "1/2-1/2"]\n\n1. d4 1/2-1/2'],
      "Duel",
    );
    mount(`/library/${match.id}`);
    expect(await screen.findByTestId(`tournament-collection-${match.id}-match`)).toBeInTheDocument();
  });

  it("says when the games do not read as the type they are marked as, and suggests the one they look like", async () => {
    const cup = await marked("knockout");
    mount(`/library/${cup.id}`);
    const misfit = await screen.findByTestId("library-tournament-misfit");
    expect(misfit).toHaveTextContent("The games do not read as Knockout (elimination) — they look like Round robin: 3 players, every pair met.");
    // Change the type opens the settings: the page's left panel on Options (CTA-231).
    fireEvent.click(within(misfit).getByRole("button", { name: "Change the type" }));
    expect(await screen.findByTestId("library-settings-form-type-knockout")).toBeChecked();
    expect(screen.getByRole("tab", { name: "Options" })).toHaveAttribute("aria-selected", "true");
    expect(where()).toBe(`/library/${cup.id}`);
  });

  it("lists every player's record on Participants, the standouts over them", async () => {
    mount("/library/candidates2026?tab=participants");
    const table = await screen.findByRole("table", { name: "FIDE Candidates 2026 — Participants" }, { timeout: 15_000 });
    expect(within(table).getAllByRole("row")).toHaveLength(9);
    expect(readText(within(table).getAllByRole("row")[1])).toMatch(/^1\s*Grandmaster Sindarov, Javokhir/);
    // The statistics are the right-hand panel's.
    expect(screen.getByTestId("layout-right-panel")).toContainElement(screen.getByTestId("library-tournament-top"));
    expect(within(screen.getByTestId("library-tournament-top")).getByRole("heading", { name: "Statistics" })).toBeInTheDocument();
    expect(screen.getByTestId("library-tournament-top-score")).toHaveTextContent("Sindarov, Javokhir");
    expect(screen.getByTestId("library-tournament-top-score-value")).toHaveTextContent("10.0 of 14");
    expect(within(table).getByRole("link", { name: "Giri, Anish" })).toHaveAttribute("href", "/library/candidates2026?tab=games&player=Giri%2C%20Anish");
    expect(screen.queryByTestId("library-tournament-teams")).toBeNull();
    await expectNoAxeViolations(screen.getByTestId("library-tournament-screen"));
  }, 30_000);

  it("lists a team event's teams and each team's players on Participants", async () => {
    mount("/library/worldblitzteam2026?tab=participants");
    const teams = await screen.findByTestId("library-tournament-teams", {}, { timeout: 15_000 });
    // The teams are the right-hand panel's, under the statistics.
    expect(screen.getByTestId("layout-right-panel")).toContainElement(teams);
    expect(within(teams).getAllByRole("listitem").length).toBeGreaterThan(16);
    const first = within(screen.getByTestId("library-tournament-teams-team-0"));
    const players = within(first.getByRole("list", { name: /players$/ })).getAllByRole("link");
    expect(players.length).toBeGreaterThan(3);
    expect(players[0].getAttribute("href")).toMatch(/^\/library\/worldblitzteam2026\?tab=games&player=/);
    // A titled player carries the same chip the Participants table shows (CTA-164) —
    // before their name, outside the link, so the link's name stays the player's.
    const chips = within(teams).getAllByText("GM");
    expect(chips.length).toBeGreaterThan(0);
    expect(within(teams).queryByRole("link", { name: /Grandmaster/ })).toBeNull();
    expect(screen.getByRole("columnheader", { name: /Team/ })).toBeInTheDocument();
  }, 30_000);

  it("shows a team Swiss's titled players their chips in the sidebar too", async () => {
    mount("/library/worldrapidteam2026?tab=participants");
    const teams = await screen.findByTestId("library-tournament-teams", {}, { timeout: 20_000 });
    expect(screen.getByTestId("layout-right-panel")).toContainElement(teams);
    expect(within(teams).getAllByText("GM").length).toBeGreaterThan(0);
    expect(within(teams).queryByRole("link", { name: /Grandmaster/ })).toBeNull();
  }, 40_000);

  it("follows a player's link from Participants to the Games tab, filtered", async () => {
    const user = userEvent.setup();
    const cup = await marked("roundRobin");
    mount(`/library/${cup.id}?tab=participants`);
    const table = await screen.findByRole("table", { name: "Club — Participants" });
    await user.click(within(table).getByRole("link", { name: "Amy" }));
    await screen.findByTestId("library-table");
    expect(where()).toBe(`/library/${cup.id}?tab=games&player=Amy`);
    expect(screen.getByTestId("library-table-count")).toHaveTextContent("2 of 3");
  });

  it("carries the settings gear on an upload, opening Options beside the tab it is on", async () => {
    const cup = await marked("roundRobin");
    mount(`/library/${cup.id}?tab=participants`);
    await screen.findByTestId("library-tournament-screen");
    fireEvent.click(screen.getByTestId("library-table-settings"));
    expect(await screen.findByTestId("library-settings-form")).toBeInTheDocument();
    expect(screen.getByTestId("library-settings-form-type-roundRobin")).toBeChecked();
    expect(where()).toBe(`/library/${cup.id}?tab=participants`);
    expect(screen.getByRole("tabpanel", { name: "Participants" })).toBeInTheDocument();
  });

  it("shows the event's card on the left panel's General, and only the table on Info (CTA-231)", async () => {
    const cup = await marked("roundRobin");
    await updateCollectionSettings(cup.id, { description: "Our club's round robin." });
    mount(`/library/${cup.id}`);
    expect(await screen.findByTestId(`tournament-collection-${cup.id}-roundRobin`)).toBeInTheDocument();
    const general = screen.getByRole("tabpanel", { name: "General" });
    const card = within(general).getByTestId("library-collection-details-tournament");
    expect(within(card).getByRole("heading", { level: 3, name: "The event" })).toBeInTheDocument();
    expect(within(card).getByTestId("library-collection-details-tournament-description")).toHaveTextContent("Our club's round robin.");
    expect(within(card).getByTestId("library-collection-details-tournament-facts-type")).toHaveTextContent("Round robin");
    expect(within(card).getByTestId("library-collection-details-tournament-facts-players")).toHaveTextContent("3");
    // The Info tab holds the table alone.
    const info = screen.getByTestId("library-tournament-panel-info");
    expect(within(info).queryByTestId("library-tournament-info")).toBeNull();
    expect(within(info).queryByText("The event")).toBeNull();
    expect(within(info).getByTestId("library-tournament-table-section")).toBeInTheDocument();
    await expectNoAxeViolations(screen.getByTestId("library-collection-details"));
  });
});

describe("an arena (CTA-142; its table, CTA-204)", () => {
  // Lichess's way: Round "-" everywhere, more games than players, the same pairs again.
  const ARENA = [
    ["Ann", "Bea"], ["Bea", "Ann"], ["Ann", "Bea"], ["Ann", "Cid"], ["Cid", "Ann"], ["Bea", "Cid"], ["Dan", "Eve"], ["Ann", "Dan"], ["Eve", "Bea"],
  ].map(([white, black], index) => `[Event "Titled Arena"]\n[Round "-"]\n[White "${white}"]\n[Black "${black}"]\n[Result "${index % 3 === 0 ? "1-0" : "1/2-1/2"}"]\n\n1. e4 *`);

  it("is suggested as an arena on its games table", async () => {
    const arena = await keep("Titled Arena", ARENA);
    await mountTable(`/library/${arena.id}`);
    expect(await screen.findByTestId("library-table-suggestion-text")).toHaveTextContent("Arena: 5 players, 9 games and no rounds.");
  });

  /** The arena's table, by its ids — the collection's slug and `-arena` (CTA-204). */
  const arenaTable = (id: string) => `tournament-collection-${id}-arena`;
  /** The names in the arena's rows, in rank order — each row header's words. */
  const ranked = (id: string) => within(screen.getByTestId(arenaTable(id))).getAllByRole("rowheader").map((header) => readText(header));

  it("marked so, shows its event and its standings in game points — and every player's record on Participants", async () => {
    const user = userEvent.setup();
    const arena = await marked("arena", ARENA, "Titled Arena");
    mount(`/library/${arena.id}`);
    const table = await screen.findByRole("table", { name: "Titled Arena — standings" });
    expect(screen.queryByTestId("library-tournament-no-table")).toBeNull();
    // No scoring switch: the type is the scoring (CTA-204).
    expect(screen.queryByRole("group", { name: "Scoring" })).toBeNull();
    // Ann: two wins and four draws; Bea: four draws; Dan a win and a draw.
    expect(ranked(arena.id)).toEqual(["Ann", "Bea", "Dan", "Cid", "Eve"]);
    expect(within(within(table).getAllByRole("row")[1]).getAllByRole("cell")[3]).toHaveTextContent("4.0");
    expect(screen.getByTestId("library-collection-details-tournament-facts-type")).toHaveTextContent("Arena");
    // No rounds to count.
    expect(screen.queryByTestId("library-collection-details-tournament-facts-rounds")).toBeNull();
    // A name opens the Games tab filtered by that player.
    expect(within(table).getByRole("link", { name: "Ann" })).toHaveAttribute("href", `/library/${arena.id}?tab=games&player=Ann`);
    await user.click(tab("participants"));
    const participants = await screen.findByRole("table", { name: "Titled Arena — Participants" });
    expect(within(participants).getAllByRole("row")).toHaveLength(6);
    expect(readText(within(participants).getAllByRole("row")[1])).toMatch(/Ann/);
  });

  // A Lichess export: newest first, each game on lichess.org with its UTC time — Bea wins three in a row (on fire), Ann berserks; Cid and Dan never meet (so not a round robin).
  const LICHESS = [
    { white: "Ann", black: "Cid", result: "1-0", time: "20:00:00", tags: '[WhiteBerserk "true"]' },
    { white: "Bea", black: "Dan", result: "1-0", time: "20:00:00" },
    { white: "Cid", black: "Bea", result: "0-1", time: "20:03:00" },
    { white: "Dan", black: "Ann", result: "1/2-1/2", time: "20:03:00" },
    { white: "Bea", black: "Ann", result: "1-0", time: "20:06:00" },
    { white: "Ann", black: "Cid", result: "1-0", time: "20:09:00" },
  ]
    .reverse()
    .map(
      ({ white, black, result, time, tags }, index) =>
        `[Event "Lichess Arena"]\n[Site "https://lichess.org/g${index}"]\n[Round "-"]\n[White "${white}"]\n[Black "${black}"]\n[Result "${result}"]\n[UTCDate "2026.06.27"]\n[UTCTime "${time}"]${tags === undefined ? "" : `\n${tags}`}\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Na5 10. Bc2 c5 ${result}`,
    );

  it("is suggested as a Lichess arena when every game is a Lichess export's", async () => {
    const arena = await keep("Lichess Arena", LICHESS);
    await mountTable(`/library/${arena.id}`);
    expect(await screen.findByTestId("library-table-suggestion-text")).toHaveTextContent(
      "Lichess arena: 4 players, 6 games and no rounds, every one played on lichess.org.",
    );
  });

  it("marked a Lichess arena, scores Lichess arena points — on fire, berserk — and a game's link opens it", async () => {
    const arena = await marked("lichessArena", LICHESS, "Lichess Arena");
    mount(`/library/${arena.id}?tab=info`);
    await screen.findByRole("table", { name: "Lichess Arena — standings" });
    expect(screen.getByTestId("library-collection-details-tournament-facts-type")).toHaveTextContent("Lichess arena");
    expect(screen.queryByTestId("library-tournament-misfit")).toBeNull();
    // Bea: 2 + 2 + 4 on fire; Ann: 3 berserked + 1 + 0 + 2.
    expect(ranked(arena.id)).toEqual(["Bea", "Ann", "Dan", "Cid"]);
    expect(within(screen.getByTestId(`${arenaTable(arena.id)}-row-Ann`)).getAllByRole("cell")[3]).toHaveTextContent("6");
    expect(readText(screen.getByTestId(`${arenaTable(arena.id)}-sheet-Bea`))).toContain("Game 3, White against Ann: win, scored 4, on fire, double points");
    expect(readText(screen.getByTestId(`${arenaTable(arena.id)}-sheet-Ann`))).toContain("Game 1, White against Cid: win, scored 3, berserk, one point more");
    fireEvent.click(screen.getByTestId(`${arenaTable(arena.id)}-sheet-Bea-link-0`));
    await waitFor(() => expect(where()).toMatch(new RegExp(`^/library/${arena.id}/\\d+$`)));
  });

  it("marked an Arena, scores the same Lichess games in game points — the reader's choice, no misfit said", async () => {
    const arena = await marked("arena", LICHESS, "Lichess Arena");
    mount(`/library/${arena.id}?tab=info`);
    await screen.findByRole("table", { name: "Lichess Arena — standings" });
    // Ann: 1, ½, 0, 1.
    expect(within(screen.getByTestId(`${arenaTable(arena.id)}-row-Ann`)).getAllByRole("cell")[3]).toHaveTextContent("2.5");
    expect(readText(screen.getByTestId(`${arenaTable(arena.id)}-sheet-Bea`))).not.toContain("on fire");
    expect(screen.queryByTestId("library-tournament-misfit")).toBeNull();
  });

  it("has no axe violations", async () => {
    const arena = await marked("lichessArena", LICHESS, "Lichess Arena");
    mount(`/library/${arena.id}?tab=info`);
    await screen.findByRole("table", { name: "Lichess Arena — standings" });
    await expectNoAxeViolations(screen.getByTestId("library-tournament-table-section"));
  });
});

describe("the tournament view's own panel (CTA-229; its content CTA-231)", () => {
  it("is in the main menu's place on every tab, its tab and settings' draft kept across them — and Close, not Back, leads to the Library", async () => {
    const user = userEvent.setup();
    const cup = await marked("roundRobin");
    mount(`/library/${cup.id}`);
    await screen.findByTestId("library-tournament-screen");
    const details = () => screen.getByRole("region", { name: "Details of Club games" });
    expect(screen.getByTestId("layout-board-left-panel")).toContainElement(details());
    expect(within(details()).getByRole("heading", { level: 2, name: "Club games" })).toBeInTheDocument();
    expect(within(details()).getAllByRole("tab").map((each) => each.textContent)).toEqual(["General", "Options", "Jobs"]);
    expect(within(screen.getByTestId("library-table-header")).queryByRole("link", { name: "All collections" })).toBeNull();
    await user.click(within(details()).getByRole("tab", { name: "Options" }));
    const name = await within(details()).findByTestId("library-settings-form-name");
    await user.clear(name);
    await user.type(name, "Club cup");

    await user.click(tab("participants"));
    expect(await screen.findByRole("tabpanel", { name: "Participants" })).toBeInTheDocument();
    expect(within(details()).getByRole("tab", { name: "Options" })).toHaveAttribute("aria-selected", "true");
    expect(within(details()).getByTestId("library-settings-form-name")).toHaveValue("Club cup");

    await user.click(tab("games"));
    await screen.findByTestId("library-table");
    expect(within(details()).getByTestId("library-settings-form-name")).toHaveValue("Club cup");
    expect(within(screen.getByTestId("library-table-header")).queryByRole("link", { name: "All collections" })).toBeNull();
    expect(screen.getByTestId("library-filters")).toBeInTheDocument();

    await user.click(within(details()).getByRole("link", { name: "Close Club games" }));
    expect(where()).toBe("/library");
  });

  it("is a drawer under the breakpoint, opened from the header on Info and on Games", async () => {
    shell.compact = true;
    const cup = await marked("roundRobin");
    mount(`/library/${cup.id}`, { compact: true });
    await screen.findByTestId("library-tournament-screen");
    expect(screen.queryByRole("region", { name: "Details of Club games" })).not.toBeInTheDocument();
    fireEvent.click(within(screen.getByTestId("library-table-header")).getByRole("button", { name: "The collection's details" }));
    const drawer = await screen.findByRole("dialog", { name: "Details of Club games" });
    expect(within(drawer).getByRole("link", { name: "Close Club games" })).toHaveAttribute("href", "/library");
    fireEvent.keyDown(drawer, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Details of Club games" })).not.toBeInTheDocument());

    fireEvent.click(tab("games"));
    await screen.findByTestId("library-table");
    expect(within(screen.getByTestId("library-table-header")).getByRole("button", { name: "The collection's details" })).toBeInTheDocument();
  });
});

describe("the Participants statistics folded to a rail (CTA-231)", () => {
  it("folds to the shell's rail and opens again, the focus handed between the two, kept across a change of tab", async () => {
    const user = userEvent.setup();
    const cup = await marked("roundRobin");
    mount(`/library/${cup.id}?tab=participants`);
    await screen.findByTestId("library-tournament-top");
    const hide = within(screen.getByTestId("library-tournament-top")).getByRole("button", { name: "Hide statistics" });
    expect(hide).toHaveAttribute("aria-expanded", "true");
    await user.click(hide);
    const show = await screen.findByRole("button", { name: "Show statistics" });
    expect(show).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByTestId("library-tournament-top")).toBeNull();
    expect(screen.getByTestId("layout-right-panel")).toContainElement(screen.getByTestId("library-tournament-statistics-rail"));
    await waitFor(() => expect(show).toHaveFocus());

    // Folded for the visit: Info and back keeps it so.
    await user.click(tab("info"));
    await user.click(tab("participants"));
    await user.click(await screen.findByRole("button", { name: "Show statistics" }));
    expect(await screen.findByTestId("library-tournament-top")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Hide statistics" })).toHaveFocus());
  });

  it("has no Hide under the shell's breakpoint — the panel stacked, open", async () => {
    shell.compact = true;
    const cup = await marked("roundRobin");
    mount(`/library/${cup.id}?tab=participants`, { compact: true });
    await screen.findByTestId("library-tournament-top");
    expect(screen.queryByRole("button", { name: "Hide statistics" })).toBeNull();
  });
});

describe("the Games tab's filters folded to a rail (CTA-230)", () => {
  it("stays folded across a change of tab, and opens again with its filters", async () => {
    const user = userEvent.setup();
    const cup = await marked("roundRobin");
    mount(`/library/${cup.id}?tab=games&player=Amy`);
    await screen.findByTestId("library-table");
    await user.click(screen.getByRole("button", { name: "Hide filters" }));
    expect(screen.getByRole("button", { name: "Show filters — 1 filter on" })).toBeInTheDocument();

    await user.click(tab("info"));
    await user.click(tab("games"));
    await screen.findByTestId("library-table");
    await user.click(screen.getByRole("button", { name: "Show filters — 1 filter on" }));
    expect(screen.getByTestId("library-filters")).toBeInTheDocument();
  });
});

describe("a collection that does not read as a tournament", () => {
  it("keeps its games table, with no tabs", async () => {
    const plain = await upload();
    await mountTable(`/library/${plain.id}`);
    expect(screen.queryByTestId("library-tournament-tabs")).toBeNull();
    expect(screen.queryByTestId("library-tournament-screen")).toBeNull();
  });

  it("keeps it for a mark whose games no longer share one event", async () => {
    const mixed = await marked("swiss", [...GAMES, '[Event "Other"]\n[White "E"]\n[Black "F"]\n\n1. e4 *'], "Mixed");
    await mountTable(`/library/${mixed.id}`);
    expect(screen.queryByTestId("library-tournament-tabs")).toBeNull();
  });

  it("keeps a shipped player's games as a table", async () => {
    await mountTable("/library/capablanca");
    expect(screen.queryByTestId("library-tournament-tabs")).toBeNull();
  });
});

describe("the list", () => {
  it("marks the tournaments with a trophy, shipped and marked uploads alike", async () => {
    const cup = await marked("roundRobin");
    const plain = await keep("Loose", GAMES);
    mount("/library");
    await screen.findByTestId(`library-row-${cup.id}`);
    expect(screen.getByTestId(`library-tournament-icon-${cup.id}`)).toBeInTheDocument();
    expect(screen.getByTestId("library-tournament-icon-candidates2026")).toBeInTheDocument();
    expect(screen.queryByTestId(`library-tournament-icon-${plain.id}`)).toBeNull();
    expect(screen.queryByTestId("library-tournament-icon-tal")).toBeNull();
    expect(screen.getByRole("link", { name: "FIDE Candidates 2026, Tournament" })).toBeInTheDocument();
  });
});

describe("the games table's suggestion", () => {
  it("offers a never-marked upload the type its games look like; Apply marks it at once and opens its view", async () => {
    const user = userEvent.setup();
    const cup = await upload();
    await mountTable(`/library/${cup.id}?sort=white`);
    const offer = await screen.findByTestId("library-table-suggestion");
    expect(within(offer).getByTestId("library-table-suggestion-text")).toHaveTextContent("Round robin: 3 players, every pair met.");
    await user.click(within(offer).getByRole("button", { name: "Apply the suggested type, Round robin" }));
    await screen.findByTestId("library-tournament-screen");
    expect(where()).toBe(`/library/${cup.id}?tab=info`);
    expect(uploadedCollectionsSnapshot()?.find((c) => c.id === cup.id)?.tournament).toEqual({ enabled: true, type: "roundRobin" });
    expect(await screen.findByTestId("library-table-suggestion-notice")).toHaveTextContent("Marked as a tournament: Round robin.");

    // Undo: the mark off again, never decided — back on the table as it was, the suggestion offered again.
    await user.click(screen.getByRole("button", { name: "Undo" }));
    await screen.findByTestId("library-table-suggestion");
    await waitFor(() => expect(where()).toBe(`/library/${cup.id}?sort=white`));
    expect(uploadedCollectionsSnapshot()?.find((c) => c.id === cup.id)?.tournament).toBeUndefined();
  });

  it("turns it down for good: the mark stored off, the table kept, not asked again", async () => {
    const user = userEvent.setup();
    const cup = await upload();
    await mountTable(`/library/${cup.id}`);
    await user.click(await screen.findByRole("button", { name: "Not a tournament — don't suggest again" }));
    await waitFor(() => expect(screen.queryByTestId("library-table-suggestion")).toBeNull());
    expect(uploadedCollectionsSnapshot()?.find((c) => c.id === cup.id)?.tournament).toEqual({ enabled: false, type: "roundRobin" });
    expect(screen.getByTestId("library-table")).toBeInTheDocument();
    cleanupAndMount(`/library/${cup.id}`);
    await screen.findByTestId("library-table");
    expect(screen.queryByTestId("library-table-suggestion")).toBeNull();
  });

  it("offers nothing to a shipped collection, to games of several events, or on a tournament's Games tab", async () => {
    await mountTable("/library/capablanca");
    expect(screen.queryByTestId("library-table-suggestion")).toBeNull();

    const mixed = await keep("Mixed", [...GAMES, '[Event "Other"]\n[White "E"]\n[Black "F"]\n\n1. e4 *']);
    cleanupAndMount(`/library/${mixed.id}`);
    await screen.findByTestId("library-table");
    expect(screen.queryByTestId("library-table-suggestion")).toBeNull();

    const cup = await marked("roundRobin");
    cleanupAndMount(`/library/${cup.id}?tab=games`);
    await screen.findByTestId("library-table");
    expect(screen.queryByTestId("library-table-suggestion")).toBeNull();
  });
});

describe("the list's potential tournaments (CTA-142)", () => {
  it("marks a never-marked one-event upload with a warning until its type is applied or turned down", async () => {
    const user = userEvent.setup();
    const cup = await upload();
    const plain = await keep("Loose", [...GAMES, '[Event "Other"]\n[White "E"]\n[Black "F"]\n\n1. e4 *']);
    const declined = await upload();
    expect(await updateCollectionSettings(declined.id, { tournament: { enabled: false, type: "swiss" } })).toBeUndefined();
    mount("/library");
    await screen.findByTestId(`library-row-${cup.id}`);
    expect(screen.getByTestId(`library-potential-tournament-${cup.id}`)).toBeInTheDocument();
    expect(screen.queryByTestId(`library-potential-tournament-${plain.id}`)).toBeNull();
    expect(screen.queryByTestId(`library-potential-tournament-${declined.id}`)).toBeNull();
    // Shipped collections are never potential: the tournaments among them are marked.
    expect(screen.queryByTestId("library-potential-tournament-tal")).toBeNull();

    // The warning opens its table, where the type is suggested; applied there, a trophy from then on.
    await user.click(screen.getByTestId(`library-potential-tournament-${cup.id}`));
    await user.click(await screen.findByRole("button", { name: "Apply the suggested type, Round robin" }));
    await screen.findByTestId("library-tournament-screen");
    cleanupAndMount("/library");
    await screen.findByTestId(`library-tournament-icon-${cup.id}`);
    expect(screen.queryByTestId(`library-potential-tournament-${cup.id}`)).toBeNull();
  });
});

describe("the settings' suggestion — on the page's Options tab (CTA-231)", () => {
  /** The collection's page, its left panel on Options. */
  const mountOptions = async (id: string) => {
    mount(`/library/${id}`);
    fireEvent.click(await screen.findByRole("tab", { name: "Options" }));
    await screen.findByTestId("library-settings-form");
  };

  it("suggests the type the games look like, and Apply puts it in the draft for Save", async () => {
    const cup = await upload();
    await mountOptions(cup.id);
    const text = await screen.findByTestId("library-settings-form-suggestion-text");
    expect(text).toHaveTextContent("Round robin: 3 players, every pair met.");
    // The table offers it too (CTA-142); the form's is the draft's.
    fireEvent.click(within(screen.getByTestId("library-settings-form")).getByRole("button", { name: "Apply the suggested type, Round robin" }));
    expect(screen.getByTestId("library-settings-form-tournament-switch")).toBeChecked();
    expect(screen.getByTestId("library-settings-form-type-roundRobin")).toBeChecked();
    fireEvent.click(screen.getByTestId("library-settings-save"));
    // Marked, the page turns into its tournament view — the panel still on Options.
    await screen.findByTestId("library-tournament-screen");
    expect(screen.getByRole("tab", { name: "Options" })).toHaveAttribute("aria-selected", "true");
  });

  it("suggests nothing for games that cannot be a tournament", async () => {
    const mixed = await keep("Mixed", [...GAMES, '[Event "Other"]\n[White "E"]\n[Black "F"]\n\n1. e4 *']);
    await mountOptions(mixed.id);
    expect(screen.queryByTestId("library-settings-form-suggestion")).toBeNull();
  });
});
