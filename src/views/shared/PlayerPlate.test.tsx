import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import i18n from "../../i18n";
import AppThemeWithLang from "../../theme/AppThemeWithLang";
import PlayerPlate from "./PlayerPlate";
import { playerResultsOf } from "./playerResults";

/*
  The plate is presentational: everything it does is which segments show —
  the result with its separator, the Elo, the name — and how it is spoken.
  The one piece of logic here is `playerResultsOf`, the `Result` tag as each
  player fared, asserted straight; the component is asserted through the
  segment test ids the Library's own tests lean on too.
*/

const renderPlate = (overrides: { name?: string; elo?: number; result?: string } = {}) =>
  render(
    <AppThemeWithLang>
      <PlayerPlate
        testId="plate"
        color="white"
        name={overrides.name ?? "Carlsen, Magnus"}
        elo={overrides.elo}
        result={overrides.result}
      />
    </AppThemeWithLang>,
  );

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("playerResultsOf — a PGN result as each player fared", () => {
  it("gives each player their outcome of a decided game", () => {
    expect(playerResultsOf("1-0")).toEqual({ white: "1", black: "0" });
    expect(playerResultsOf("0-1")).toEqual({ white: "0", black: "1" });
  });

  it("gives both players the half sign of a draw", () => {
    expect(playerResultsOf("1/2-1/2")).toEqual({ white: "½", black: "½" });
  });

  it("gives neither player anything for an undecided game", () => {
    expect(playerResultsOf("*")).toEqual({});
    expect(playerResultsOf("anything else")).toEqual({});
  });
});

describe("PlayerPlate — one player beside the board", () => {
  it("reads the result, a separator, the Elo, then the name", () => {
    renderPlate({ elo: 2850, result: "1" });

    expect(screen.getByTestId("plate-result")).toHaveTextContent("1");
    expect(screen.getByTestId("plate-separator")).toBeInTheDocument();
    expect(screen.getByTestId("plate-elo")).toHaveTextContent("2850");
    // A name may be in any script, so the one token that is text finds its own
    // direction.
    expect(screen.getByTestId("plate-name")).toHaveAttribute("dir", "auto");
    expect(screen.getByTestId("plate-name")).toHaveTextContent("Carlsen, Magnus");
    expect(screen.getByTestId("plate")).toHaveAttribute(
      "aria-label",
      "White player, Carlsen, Magnus, rating 2850, result 1",
    );
  });

  it("shows no result and no separator for an undecided game", () => {
    renderPlate();

    expect(screen.queryByTestId("plate-result")).toBeNull();
    expect(screen.queryByTestId("plate-separator")).toBeNull();
    expect(screen.getByTestId("plate-name")).toHaveTextContent("Carlsen, Magnus");
    expect(screen.getByTestId("plate")).toHaveAttribute("aria-label", "White player, Carlsen, Magnus");
  });

  it("shows no Elo for a player the game carries no rating for", () => {
    renderPlate({ result: "½" });

    expect(screen.queryByTestId("plate-elo")).toBeNull();
    expect(screen.getByTestId("plate-result")).toHaveTextContent("½");
    // The separator belongs to the result, so a rating-less plate keeps it.
    expect(screen.getByTestId("plate-separator")).toBeInTheDocument();
  });

  it("names its player by their colour when it speaks", () => {
    render(
      <AppThemeWithLang>
        <PlayerPlate testId="plate" color="black" name="Amy" result="1" />
      </AppThemeWithLang>,
    );

    expect(screen.getByTestId("plate")).toHaveAttribute("aria-label", "Black player, Amy, result 1");
  });
});
