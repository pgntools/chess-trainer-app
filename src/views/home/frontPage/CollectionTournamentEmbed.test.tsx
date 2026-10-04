import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation, useSearchParams } from "react-router";

import i18n from "../../../i18n";
import { updateCollectionSettings } from "../../../lib/libraryCollectionStore";
import { expectNoAxeViolations } from "../../../test/axe";
import { keep, resetLibrary } from "../../library/libraryTestKit";
import { CollectionTournamentEmbed } from "./CollectionTournamentEmbed";
import { mdxComponents } from "./index";

/*
  <CollectionTournamentTable> (CTA-128): a Library collection drawn as its
  tournament's table, its names linked to the player's games and its results
  to each game. The demo's collection is the shipped Candidates 2026.
*/

const SINDAROV = "14205483";
const CARUANA = "2020009";

/** Where a link led: the path, a filter's player, and the `from` a game's board would go back to. */
function Landing() {
  const location = useLocation();
  const [params] = useSearchParams();
  return (
    <p data-testid="landed">
      {location.pathname} {params.get("player") ?? ""} {(location.state as { from?: string } | null)?.from ?? ""}
    </p>
  );
}

const mount = (props: Partial<Parameters<typeof CollectionTournamentEmbed>[0]> = {}) =>
  render(
    <MemoryRouter initialEntries={["/blog/an-article"]}>
      <Routes>
        <Route path="/blog/*" element={<CollectionTournamentEmbed _id="/library/candidates2026" format="roundRobin" {...props} />} />
        <Route path="/library/*" element={<Landing />} />
      </Routes>
    </MemoryRouter>,
  );

const table = () => screen.findByRole("table", { name: "FIDE Candidates 2026 — crosstable" });

beforeEach(async () => {
  await resetLibrary();
});

describe("<CollectionTournamentTable> (CTA-128)", () => {
  it("is what an article's <CollectionTournamentTable> names", () => {
    expect(mdxComponents.CollectionTournamentTable).toBe(CollectionTournamentEmbed);
  });

  it("draws a shipped collection as its crosstable, each name a link to the player's games", async () => {
    const user = userEvent.setup();
    mount();
    await table();
    const name = screen.getByRole("link", { name: "Sindarov, Javokhir" });
    expect(name).toHaveAttribute("href", "/library/candidates2026?player=Sindarov%2C%20Javokhir");
    await user.click(name);
    expect(screen.getByTestId("landed")).toHaveTextContent("/library/candidates2026 Sindarov, Javokhir");
  });

  it("makes each result a link to its game on the Library's board, which goes back to the article", async () => {
    const user = userEvent.setup();
    mount();
    await table();
    const [first, second] = within(screen.getByTestId(`tournament-collection-candidates2026-roundRobin-cell-${SINDAROV}-${CARUANA}`)).getAllByRole("link");
    expect(first).toHaveAccessibleName("Round 4, White against Caruana, Fabiano: win");
    expect(second).toHaveAttribute("href", "/library/candidates2026/41");
    await user.click(first);
    expect(screen.getByTestId("landed")).toHaveTextContent("/library/candidates2026/13 /blog/an-article");
  });

  it("leaves names and results as text with playerLink={false} and gameLink={false}", async () => {
    mount({ playerLink: false, gameLink: false });
    await table();
    expect(screen.queryAllByRole("link")).toEqual([]);
    expect(screen.getAllByRole("rowheader")).toHaveLength(8);
  });

  it("is a Swiss's standings unless told — a shipped collection carries no mark", async () => {
    mount({ format: undefined, rowsPerPage: "25" });
    expect(await screen.findByRole("table", { name: "FIDE Candidates 2026 — standings" })).toBeInTheDocument();
  });

  it("takes an upload's own tournament mark — a round robin, from its settings", async () => {
    const collection = await keep("Our club round robin", [
      '[Event "Club RR"]\n[Round "1"]\n[White "Ann"]\n[Black "Bob"]\n[Result "1-0"]\n\n1. e4 e5 1-0',
      '[Event "Club RR"]\n[Round "2"]\n[White "Bob"]\n[Black "Cat"]\n[Result "1/2-1/2"]\n\n1. d4 d5 1/2-1/2',
      '[Event "Club RR"]\n[Round "3"]\n[White "Cat"]\n[Black "Ann"]\n[Result "0-1"]\n\n1. c4 c5 0-1',
    ]);
    await updateCollectionSettings(collection.id, { tournament: { enabled: true, type: "roundRobin" } });
    mount({ _id: `/library/${collection.id}`, format: undefined });
    expect(await screen.findByRole("table", { name: "Club RR — crosstable" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ann" })).toHaveAttribute("href", `/library/${collection.id}?player=Ann`);
  });

  it("says so for a collection this browser's Library does not hold", async () => {
    mount({ _id: "/library/nowhere" });
    expect(await screen.findByText("This collection is not in this browser's Library.")).toBeInTheDocument();
  });

  it("passes axe, links and all", async () => {
    mount();
    await table();
    await expectNoAxeViolations();
  });

  it("is in Hebrew under Hebrew", async () => {
    await i18n.changeLanguage("he");
    mount();
    expect(await screen.findByRole("table", { name: "FIDE Candidates 2026 — טבלה צולבת" })).toBeInTheDocument();
  });
});
