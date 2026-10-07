import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation, useSearchParams } from "react-router";

import i18n from "../../../i18n";
import { readRepertoireText, savedRepertoireOf } from "../../../lib/savedRepertoires";
import { saveRepertoire } from "../../../lib/savedRepertoireStore";
import { expectNoAxeViolations } from "../../../test/axe";
import { resetLibrary } from "../../library/libraryTestKit";
import { mdxComponents } from "./index";

/*
  One component, any source (CTA-140): every tournament table and the game
  boards read their games through <EmbedSource> — a PGN of the article's
  own, or an app path: a Library collection or one game of it, a saved
  analysis, a played game, a repertoire. Only `src` changes.
*/

vi.mock("react-chessboard", async () => {
  const { reactChessboardMock } = await import("../../board/boardTestHarness");
  return reactChessboardMock();
});

const { RoundRobinCrossTable, KnockoutBracket, SwissStandingsTable, InlinePgnGame, StoredGameEmbed } = mdxComponents as Record<string, (props: Record<string, unknown>) => React.ReactNode>;

/** A shipped collection's PGN is read whole: longer than a store's read on a loaded machine. */
const READ = { timeout: 15_000 };

/** Where a link led: the path and a filter's player. */
function Landing() {
  const location = useLocation();
  const [params] = useSearchParams();
  return <p data-testid="landed">{`${location.pathname} ${params.get("player") ?? ""}`}</p>;
}

const mount = (element: React.ReactNode) =>
  render(
    <MemoryRouter initialEntries={["/blog/an-article"]}>
      <Routes>
        <Route path="/blog/*" element={element} />
        <Route path="/library/*" element={<Landing />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(async () => {
  await resetLibrary();
  await i18n.changeLanguage("en");
});

describe("a tournament table, from any source (CTA-140)", () => {
  it("draws the same crosstable from a PGN and from the Library — the Library's names linked into it", async () => {
    const user = userEvent.setup();
    const pgn = readFileSync("src/views/blog/articles/tournaments/wchcand26.pgn", "utf8");
    const { unmount } = mount(<RoundRobinCrossTable pgn={pgn} />);
    const fromPgn = await screen.findByRole("table", { name: "FIDE Candidates 2026 — crosstable" });
    expect(screen.getByTestId("tournament-crosstable-fide-candidates-2026")).toBeInTheDocument();
    expect(within(fromPgn).queryAllByRole("link")).toEqual([]);
    unmount();

    mount(<RoundRobinCrossTable src="/library/candidates2026" />);
    const fromLibrary = await screen.findByRole("table", { name: "FIDE Candidates 2026 — crosstable" }, READ);
    expect(screen.getByTestId("tournament-collection-candidates2026-roundRobin")).toBeInTheDocument();
    // The name's link — the row's first; its results link to the games.
    await user.click(within(fromLibrary).getAllByRole("link", { name: /Sindarov, Javokhir/ })[0]);
    expect(screen.getByTestId("landed")).toHaveTextContent("/library/candidates2026 Sindarov, Javokhir");
  });

  it("takes the address as the address bar shows it, and a knockout from the Library", async () => {
    mount(<KnockoutBracket src="https://chessapp.dev/he/library/netherlands2026/" playerLink={false} />);
    expect(await screen.findByRole("region", { name: /^ch-NED.* — bracket$/ }, READ)).toBeInTheDocument();
    expect(screen.getByTestId("tournament-collection-netherlands2026-knockout")).toBeInTheDocument();
  });

  it("says when a source is not in this browser — a collection, or a reader's own record", async () => {
    const { unmount } = mount(<SwissStandingsTable src="/library/nowhere" />);
    expect(await screen.findByTestId("tournament-collection-nowhere-missing")).toHaveTextContent("This collection is not in this browser's Library.");
    unmount();
    mount(<SwissStandingsTable src="/tools/analysis?analysis=nope" />);
    expect(await screen.findByTestId("tournament-standings-missing")).toHaveTextContent("This is not in this browser");
    await expectNoAxeViolations();
  });
});

describe("a game board, from any source (CTA-140)", () => {
  it("shows a Library game — by its address, or a collection's with `game` picking one", async () => {
    const { unmount } = mount(<InlinePgnGame src="/library/capablanca/1" />);
    expect(await screen.findByRole("group", { name: /^The game, from The start to / }, READ)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1. e4" })).toBeInTheDocument();
    unmount();
    mount(<InlinePgnGame src="/library/capablanca" game="2" />);
    expect(await screen.findByRole("group", { name: /^The game, from The start to / }, READ)).toBeInTheDocument();
  });

  it("shows a repertoire's whole tree, side lines and all", async () => {
    const reading = readRepertoireText(['[Event "My Caro"]', "", "1. e4 c6 2. d4 (2. Nc3 d5) 2... d5 *"].join("\n"));
    if (!reading.ok) throw new Error("fixture does not read");
    await saveRepertoire(savedRepertoireOf("caro", reading.games[0], "", reading.name));
    mount(<InlinePgnGame src="/repertoires/caro" />);
    expect(await screen.findByRole("group", { name: "The game, from The start to 2... d5" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2. Nc3" })).toBeInTheDocument();
  });

  it("says when the game is not here, and a stored game's board reads a path too", async () => {
    const { unmount } = mount(<InlinePgnGame src="/engine/play?saved=nope" />);
    expect(await screen.findByText("The game this page embeds is not here.")).toBeInTheDocument();
    unmount();
    mount(<StoredGameEmbed src="/library/capablanca/1" />);
    expect(await screen.findByTestId("home-game-library-capablanca-1-players", {}, READ)).toHaveTextContent("Capablanca, Jose – Eschevarria, C. 1-0");
  });
});
