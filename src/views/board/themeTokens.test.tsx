import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { MemoryRouter } from "react-router";
import type { ReactNode } from "react";

import i18n from "../../i18n";
import { buildTheme } from "../../design-system/theme";
import { defaultTheme, type ChessTokens } from "../../design-system/themes";
import AppThemeWithLang from "../../theme/AppThemeWithLang";
import { THEME_STORAGE_KEY } from "../../theme/themeChoice";
import { RightPanelOutlet, RightPanelProvider } from "../main/rightPanel";

/*
  The board's colours are the theme's (CTA-107): every board composed from
  the core draws its squares, coordinates, last-move fill and arrows from the
  theme's `chess` tokens, and so do the overlays drawn over it. A theme is
  registered here whose every board colour differs from the default's, and
  the reader's choice is set to it.
*/

vi.mock("../../lib/engine", async () => ({
  default: (await import("./boardTestHarness")).FakeEngine,
}));

vi.mock("react-chessboard", async () => {
  const { reactChessboardMock } = await import("./boardTestHarness");
  return reactChessboardMock();
});

vi.mock("../../lib/openings", async (importOriginal) => {
  const { openingsMock } = await import("./boardTestHarness");
  return openingsMock(importOriginal as () => Promise<typeof import("../../lib/openings")>);
});

/** Every board colour, none of them the default's — hoisted, for the registry's mock. */
const TOKENS: ChessTokens = vi.hoisted(() => ({
  board: {
    lightSquare: "#dee3e6",
    darkSquare: "#8ca2ad",
    lightSquareNotation: "#8ca2ad",
    darkSquareNotation: "#dee3e6",
  },
  lastMove: "rgba(20, 85, 30, 0.5)",
  arrowPalettes: {
    classic: { mainline: "#111111", sideline: "#222222", hovered: "#333333" },
    lichess: { mainline: "#444444", sideline: "#555555", hovered: "#666666" },
    colorblind: { mainline: "#777777", sideline: "#888888", hovered: "#999999" },
  },
  arrows: { required: "#aaaaaa", untagged: "#bbbbbb", chanceFill: "#cccccc", chanceBorder: "#dddddd" },
  book: { known: "#121212", hovered: "#343434" },
  drawing: { green: "#131313", red: "#141414", yellow: "#151515", blue: "#161616" },
  nag: {
    good: { light: "#010101", dark: "#020202" },
    brilliant: { light: "#030303", dark: "#040404" },
    interesting: { light: "#050505", dark: "#060606" },
    dubious: { light: "#070707", dark: "#080808" },
    mistake: { light: "#090909", dark: "#0a0a0a" },
    blunder: { light: "#0b0b0b", dark: "#0c0c0c" },
  },
  promotion: { scrim: "rgba(10, 20, 30, 0.5)" },
  map: { whiteDot: "#fefefe", blackDot: "#101010" },
  filterBoard: {
    white: { background: "#fafafa", text: "#010101" },
    draw: { background: "#777777", text: "#010101" },
    black: { background: "#303030", text: "#fafafa" },
  },
}));

vi.mock("../../design-system/themes/registry", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../design-system/themes/registry")>();
  const { defaultTheme: base } = await import("../../design-system/themes/default");
  const themes = [base, { ...base, id: "test", chess: TOKENS }];
  return {
    ...actual,
    themes,
    isThemeId: (id: unknown) => typeof id === "string" && themes.some((theme) => theme.id === id),
    themeById: (id: string | null | undefined) => themes.find((theme) => theme.id === id) ?? base,
  };
});

import { boardOptions } from "./boardTestHarness";
import AnalysisBoard from "../tools/analysis/AnalysisBoard";
import PlayWithEngine from "../engine/play/PlayWithEngine";
import MaskedPlay from "../engine/masked/MaskedPlay";
import LibraryGameBoard from "../library/LibraryGameBoard";
import OpeningsBoard from "../openings/OpeningsBoard";
import { parsePgnTree } from "../../lib/pgn";
import ChanceArrows from "../explorer/ChanceArrows";
import PromotionPicker from "../shared/PromotionPicker";
import { nagToneStyles } from "../shared/nagToneSx";

const LIBRARY_FIXTURE = {
  id: "fixture",
  name: "Fixture",
  source: "uploaded" as const,
  games: ['[White "A"]\n[Black "B"]\n\n1. e4 e5 *'],
};
const LibraryGame = () => (
  <LibraryGameBoard collection={LIBRARY_FIXTURE} number={1} tree={parsePgnTree(LIBRARY_FIXTURE.games[0])} />
);

const BOARDS: readonly { name: string; Screen: () => ReactNode }[] = [
  { name: "Analysis Board", Screen: AnalysisBoard },
  { name: "Play with Engine", Screen: PlayWithEngine },
  { name: "Masked Pieces", Screen: MaskedPlay },
  { name: "Library game", Screen: LibraryGame },
  { name: "Openings explorer", Screen: OpeningsBoard },
];

const renderBoard = (Screen: () => ReactNode) =>
  render(
    <AppThemeWithLang>
      <MemoryRouter initialEntries={["/board"]}>
        <RightPanelProvider>
          <Screen />
          <RightPanelOutlet />
        </RightPanelProvider>
      </MemoryRouter>
    </AppThemeWithLang>,
  );

const drag = (from: string, to: string) =>
  act(() => {
    boardOptions().onPieceDrop!({ sourceSquare: from, targetSquare: to });
  });

/** The options the stub was handed, with the theme's keys the harness does not type. */
const themedOptions = () =>
  boardOptions() as ReturnType<typeof boardOptions> &
    Record<"lightSquareStyle" | "darkSquareStyle" | "lightSquareNotationStyle" | "darkSquareNotationStyle", object> & {
      squareStyles?: Record<string, { background?: string }>;
    };

/** Under the test theme, fixed to one scheme — for the pieces drawn outside a board screen. */
const themed = (node: ReactNode) =>
  render(
    <ThemeProvider theme={buildTheme({ ...defaultTheme, chess: TOKENS }, "light", "ltr")}>{node}</ThemeProvider>,
  );

beforeEach(async () => {
  localStorage.setItem(THEME_STORAGE_KEY, "test");
  await i18n.changeLanguage("en");
});

describe.each(BOARDS)("the $name, under a theme", ({ Screen }) => {
  it("draws its squares and coordinates in the theme's colours", () => {
    renderBoard(Screen);
    expect(themedOptions()).toMatchObject({
      lightSquareStyle: { backgroundColor: TOKENS.board.lightSquare },
      darkSquareStyle: { backgroundColor: TOKENS.board.darkSquare },
      lightSquareNotationStyle: { color: TOKENS.board.lightSquareNotation },
      darkSquareNotationStyle: { color: TOKENS.board.darkSquareNotation },
    });
  });

  it("fills the last move in the theme's colour", () => {
    renderBoard(Screen);
    drag("e2", "e4");
    expect(themedOptions().squareStyles).toEqual({
      e2: { background: TOKENS.lastMove },
      e4: { background: TOKENS.lastMove },
    });
  });
});

describe("the arrows and overlays, under a theme", () => {
  it("draws the next-move arrows in the theme's palette", () => {
    renderBoard(AnalysisBoard);
    drag("e2", "e4");
    drag("e7", "e5");
    fireEvent.keyDown(document, { key: "ArrowLeft" });
    expect(boardOptions().arrows).toEqual([
      { startSquare: "e7", endSquare: "e5", color: TOKENS.arrowPalettes.classic.mainline },
    ]);
  });

  it("draws the play-chance arrows in the theme's fill and border", () => {
    themed(
      <ChanceArrows
        testId="chances"
        nodes={[{ id: "a", from: "e2", to: "e4" }, { id: "b", from: "d2", to: "d4" }]}
        chances={[0.7, 0.3]}
        hoveredId="b"
        orientation="white"
      />,
    );
    const [likely, hovered] = screen.getByTestId("chances").querySelectorAll("path");
    expect(likely).toHaveAttribute("fill", TOKENS.arrows.chanceFill);
    expect(likely).toHaveAttribute("stroke", TOKENS.arrows.chanceBorder);
    expect(hovered).toHaveAttribute("stroke", TOKENS.arrowPalettes.classic.hovered);
  });

  it("puts the theme's scrim behind the promotion picker", () => {
    themed(<PromotionPicker targetSquare="e8" orientation="white" color="w" onSelect={() => {}} />);
    expect(screen.getByTestId("promotion-scrim")).toHaveStyle({ backgroundColor: TOKENS.promotion.scrim });
  });

  it("colours the move marks in the theme's tones", () => {
    const styles = JSON.stringify(
      nagToneStyles(buildTheme({ ...defaultTheme, chess: TOKENS }, "both", "ltr"), "color", "&"),
    );
    expect(styles).toContain(TOKENS.nag.blunder.light);
    expect(styles).toContain(TOKENS.nag.blunder.dark);
    expect(styles).not.toContain(defaultTheme.chess.nag.blunder.light);
  });
});
