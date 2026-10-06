import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../i18n";
import { updateCollectionSettings } from "../../lib/libraryCollectionStore";
import type { TournamentFormat } from "../../lib/libraryCollections";
import { expectNoAxeViolations } from "../../test/axe";
import { readText } from "../../test/readText";
import { GAMES, keep, mount, mountTable, resetLibrary, upload, where } from "./libraryTestKit";
import { tournamentTabOf } from "./tournamentTabs";

vi.mock("../../lib/engine", async () => ({
  default: (await import("../board/boardTestHarness")).FakeEngine,
}));

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

beforeEach(resetLibrary);

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
    // Info keeps the right-hand panel — the same width as the other tabs — with the note in it.
    expect(screen.getByTestId("layout-right-panel")).toContainElement(screen.getByTestId("library-table-note"));
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
    expect(screen.getByTestId("library-tournament-info-facts-type")).toHaveTextContent("Round robin");
    expect(screen.getByTestId("library-tournament-info-facts-event")).toHaveTextContent("FIDE Candidates 2026");
    expect(screen.getByTestId("library-tournament-info-facts-players")).toHaveTextContent("8");
    expect(screen.queryByTestId("library-tournament-misfit")).toBeNull();
    // A shipped collection has no settings.
    expect(screen.queryByTestId("library-table-settings")).toBeNull();
    // A name links to the Games tab filtered by that player.
    expect(within(table).getByRole("link", { name: "Giri, Anish" })).toHaveAttribute("href", "/library/candidates2026?tab=games&player=Giri%2C%20Anish");

    await user.click(within(table).getAllByRole("link", { name: /^Round \d+, White against/ })[0]);
    await screen.findByTestId("library-game-board");
    await user.click(screen.getByTestId("library-game-back"));
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
    await waitFor(() => expect(screen.getByTestId("library-tournament-info-facts-teams")).toHaveTextContent("48"), { timeout: 20_000 });
    expect(screen.getByTestId("library-tournament-info-facts-type")).toHaveTextContent("Team Swiss / round robin");
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
    expect(within(misfit).getByRole("link", { name: "Change the type" })).toHaveAttribute("href", `/library/${cup.id}/settings`);
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
    expect(screen.getByRole("columnheader", { name: /Team/ })).toBeInTheDocument();
  }, 30_000);

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

  it("carries the settings gear on an upload, back to the tab it left", async () => {
    const cup = await marked("roundRobin");
    mount(`/library/${cup.id}?tab=participants`);
    await screen.findByTestId("library-tournament-screen");
    fireEvent.click(screen.getByTestId("library-table-settings"));
    await screen.findByTestId("library-settings-screen");
    fireEvent.click(screen.getByTestId("library-settings-cancel"));
    await waitFor(() => expect(where()).toBe(`/library/${cup.id}?tab=participants`));
  });
});

describe("a collection that does not read as a tournament", () => {
  it("keeps its games table, with no tabs", async () => {
    const plain = await upload();
    await mountTable(`/library/${plain.id}`);
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.queryByTestId("library-tournament-screen")).toBeNull();
  });

  it("keeps it for a mark whose games no longer share one event", async () => {
    const mixed = await marked("swiss", [...GAMES, '[Event "Other"]\n[White "E"]\n[Black "F"]\n\n1. e4 *'], "Mixed");
    await mountTable(`/library/${mixed.id}`);
    expect(screen.queryByRole("tablist")).toBeNull();
  });

  it("keeps a shipped player's games as a table", async () => {
    await mountTable("/library/capablanca");
    expect(screen.queryByRole("tablist")).toBeNull();
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

describe("the settings' suggestion", () => {
  it("suggests the type the games look like, and Apply puts it in the draft for Save", async () => {
    const cup = await upload();
    mount(`/library/${cup.id}/settings`);
    const text = await screen.findByTestId("library-settings-form-suggestion-text");
    expect(text).toHaveTextContent("Round robin: 3 players, every pair met.");
    fireEvent.click(screen.getByRole("button", { name: "Apply the suggested type, Round robin" }));
    expect(screen.getByTestId("library-settings-form-tournament-switch")).toBeChecked();
    expect(screen.getByTestId("library-settings-form-type-roundRobin")).toBeChecked();
    fireEvent.click(screen.getByTestId("library-settings-save"));
    await screen.findByTestId("library-tournament-screen");
  });

  it("suggests nothing for games that cannot be a tournament", async () => {
    const mixed = await keep("Mixed", [...GAMES, '[Event "Other"]\n[White "E"]\n[Black "F"]\n\n1. e4 *']);
    mount(`/library/${mixed.id}/settings`);
    await screen.findByTestId("library-settings-form");
    expect(screen.queryByTestId("library-settings-form-suggestion")).toBeNull();
  });
});
