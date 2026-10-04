import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import { readText } from "../../../test/readText";
import swissPgn from "../../blog/articles/tournaments/20th-werner-obermeyer-swiss-5r.pgn?raw";
import candidatesPgn from "../../blog/articles/tournaments/wchcand26.pgn?raw";
import greenHillsPgn from "../../blog/articles/tournaments/greenhillsrapid26.pgn?raw";
import britishPgn from "../../blog/articles/tournaments/chgbr26.pgn?raw";
import knockoutPgn from "../../blog/articles/tournaments/chned26.pgn?raw";
import matchPgn from "../../blog/articles/tournaments/clutchlegends26.pgn?raw";
import doubleEliminationPgn from "../../blog/articles/tournaments/esportswcuppl26.pgn?raw";
import teamKnockoutPgn from "../../blog/articles/tournaments/fidewrbtf26.pgn?raw";
import { mdxComponents } from "./index";
import { KnockoutBracketEmbed } from "./KnockoutBracketEmbed";
import { MatchTableEmbed } from "./MatchTableEmbed";
import { RoundRobinCrossTableEmbed } from "./RoundRobinCrossTableEmbed";
import { SwissStandingsEmbed } from "./SwissStandingsEmbed";
import { TeamStandingsEmbed } from "./TeamStandingsEmbed";

/*
  The tournament tables' MDX embeds (CTA-128): a PGN of a tournament's games
  in, the CTA-120 block out — named after the Event tag, ranked by the
  tie-breaks of its kind. The PGNs are the Tournaments articles' own.
*/

// Each row by its accessible name: a title read in full, a federation by its country (CTA-128).
const names = () => screen.getAllByRole("rowheader").map((header) => readText(header));
const glyphs = (cell: HTMLElement) => [...cell.querySelectorAll("[aria-hidden]")].map((glyph) => glyph.textContent);

// FIDE ids, as the tags carry them.
const SINDAROV = "14205483";
const GIRI = "24116068";
const YAKUBBOEV = "14203987";

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("the tournament table embeds (CTA-128)", () => {
  it("are what an article's <SwissStandingsTable> and <RoundRobinCrossTable> name", () => {
    expect(mdxComponents.SwissStandingsTable).toBe(SwissStandingsEmbed);
    expect(mdxComponents.RoundRobinCrossTable).toBe(RoundRobinCrossTableEmbed);
    expect(mdxComponents.KnockoutBracket).toBe(KnockoutBracketEmbed);
    expect(mdxComponents.MatchTable).toBe(MatchTableEmbed);
    expect(mdxComponents.TeamStandingsTable).toBe(TeamStandingsEmbed);
  });

  it("<RoundRobinCrossTable>: a double round robin's crosstable, both meetings in a cell, named after its event", async () => {
    render(<RoundRobinCrossTableEmbed pgn={candidatesPgn} />);
    expect(screen.getByRole("table", { name: "FIDE Candidates 2026 — crosstable" })).toBeInTheDocument();
    expect(names()[0]).toBe("Grandmaster Sindarov, Javokhir");
    expect(names()).toHaveLength(8);
    // Round 7, a draw; round 13, a draw.
    expect(glyphs(screen.getByTestId(`tournament-crosstable-fide-candidates-2026-cell-${SINDAROV}-${GIRI}`))).toEqual(["½", "½"]);
    // Sonneborn-Berger alone: no Buchholz in a round robin.
    expect(screen.queryByTestId(`tournament-crosstable-fide-candidates-2026-row-${SINDAROV}-buchholz`)).not.toBeInTheDocument();
    await expectNoAxeViolations();
  });

  it("<RoundRobinCrossTable>: a single round robin, one game a cell", () => {
    render(<RoundRobinCrossTableEmbed pgn={greenHillsPgn} />);
    expect(screen.getByRole("table", { name: "Green Hills Masters Rapid — crosstable" })).toBeInTheDocument();
    expect(names().slice(0, 3)).toEqual(["Grandmaster Yakubboev, Nodirbek", "Grandmaster Artemiev, Vladislav", "Grandmaster Abdusattorov, Nodirbek"]);
    expect(screen.getByTestId(`tournament-crosstable-green-hills-masters-rapid-row-${YAKUBBOEV}-points`)).toHaveTextContent("6.0");
  });

  it("<SwissStandingsTable>: a Swiss's standings by points, then Buchholz — a round the file has no game of a dash", async () => {
    render(<SwissStandingsEmbed pgn={swissPgn} />);
    expect(screen.getByRole("table", { name: "20th Werner-Obermeyer — standings" })).toBeInTheDocument();
    // Level on 4 points: Krivoborodov first on Buchholz.
    expect(names().slice(0, 4)).toEqual(["Grandmaster Krivoborodov,E", "Stoettner,Moritz", "Grandmaster Korneev,O", "Grandmaster Milov,L"]);
    expect(names()).toHaveLength(17);
    // The file is the top four boards a round: the legend explains the dashes.
    expect(screen.getByTestId("tournament-standings-20th-werner-obermeyer-legend")).toHaveTextContent("no game in the file");
    await expectNoAxeViolations();
  });

  it("says so for a PGN with no game in it", () => {
    render(<SwissStandingsEmbed pgn="" />);
    expect(screen.getByText("This tournament's PGN holds no game.")).toBeInTheDocument();
  });

  it("names the table in Hebrew under Hebrew", async () => {
    await i18n.changeLanguage("he");
    render(<RoundRobinCrossTableEmbed pgn={greenHillsPgn} />);
    expect(screen.getByRole("table", { name: "Green Hills Masters Rapid — טבלה צולבת" })).toBeInTheDocument();
  });

  it("<KnockoutBracket>: a knockout's bracket, named after its event", async () => {
    render(<KnockoutBracketEmbed pgn={knockoutPgn} />);
    expect(screen.getByRole("region", { name: "ch-NED KO 2026 — bracket" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Final" })).toBeInTheDocument();
    await expectNoAxeViolations();
  });

  it("<KnockoutBracket losersFromRound=\"51\">: a double elimination's two brackets", () => {
    render(<KnockoutBracketEmbed pgn={doubleEliminationPgn} losersFromRound="51" />);
    expect(screen.getByRole("region", { name: "Esports World Cup PI 2026 — bracket — Winners' bracket" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Esports World Cup PI 2026 — bracket — Losers' bracket" })).toBeInTheDocument();
  });

  it("<KnockoutBracket>: a team knockout, in legs", () => {
    render(<KnockoutBracketEmbed pgn={teamKnockoutPgn} />);
    expect(screen.getByText(/^Team MGD1 2 \(8½ board points\), Kazchess 0/)).toBeInTheDocument();
  });

  it("<MatchTable>: a match, and a PGN that is not one", () => {
    const { unmount } = render(<MatchTableEmbed pgn={matchPgn} />);
    expect(screen.getByRole("table", { name: "Clutch Chess: The Legends 2026 — the match" })).toBeInTheDocument();
    unmount();
    render(<MatchTableEmbed pgn={greenHillsPgn} />);
    expect(screen.getByText(/is not a match/)).toBeInTheDocument();
  });

  it("<TeamStandingsTable>: a team event's standings, named after its event", () => {
    render(<TeamStandingsEmbed pgn={teamKnockoutPgn} />);
    expect(screen.getByRole("table", { name: "FIDE World Bl Team Final — standings" })).toBeInTheDocument();
  });

  it("pages a long table when the document asks — rowsPerPage, one of the pager's sizes", () => {
    const { unmount } = render(<SwissStandingsEmbed pgn={britishPgn} rowsPerPage="25" />);
    expect(screen.getAllByRole("rowheader")).toHaveLength(25);
    expect(screen.getByTestId("tournament-standings-112th-ch-gbr-2026-pager")).toHaveTextContent("Rows per page");
    unmount();
    // A size the pager does not offer: no paging, every row.
    render(<SwissStandingsEmbed pgn={britishPgn} rowsPerPage="7" />);
    expect(screen.getAllByRole("rowheader")).toHaveLength(108);
  });
});
