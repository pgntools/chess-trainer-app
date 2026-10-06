import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type React from "react";
import { defaultChessTokens } from "../../design-system/themes/defaultChess";
import i18n from "../../i18n";
import AppThemeWithLang from "../../theme/AppThemeWithLang";
import { findNode, mainline, nodeAtSanPath, type GameTree } from "../../lib/gameTree";
import { parsePgnTree } from "../../lib/pgn";
import { MASK_PRESETS } from "../../lib/pieceMask";
import {
  NEXT_MOVE_ARROW_COLOR,
  NEXT_MOVE_ARROW_PALETTES,
  REQUIRED_MOVE_ARROW_COLOR,
  SIDELINE_NEXT_MOVE_ARROW_COLOR,
  UNTAGGED_NEXT_MOVE_ARROW_COLOR,
} from "../tools/analysis/nextMoveArrows";
import type { TreeViewParts } from "./treeView";
import { useVariationsExplorer, type VariationsExplorerOptions } from "./useVariationsExplorer";

/*
  The explorer mode's contract (CTA-72, `.claude/rules/tree-views.md` §2):
  every opt-in part is absent until asked for, editing is off without
  `onEditTree`, and the arrows follow the options. The full behaviour is the
  repertoire player's, asserted by its own suites through the screen.
*/

const tree = parsePgnTree(
  "1. e4 {King's pawn.} e5 2. Nf3 (2. f4 {prc:75} exf4) (2. Nc3 {prc:25}) 2... Nc6 *",
);
const at = (t: GameTree, ...sans: string[]) => nodeAtSanPath(t, sans)!;

let parts: TreeViewParts;
const report = (next: TreeViewParts) => {
  parts = next;
};

function Harness(options: Omit<VariationsExplorerOptions, "testId" | "source"> & { nodeId?: string | null }) {
  const { nodeId = null, ...rest } = options;
  const view = useVariationsExplorer({
    testId: "x",
    source: {
      tree,
      mainlineNodes: mainline(tree),
      nodeId,
      goToNode: vi.fn(),
      orientation: "white",
    },
    ...rest,
  });
  report(view);
  return (
    <>
      <div data-testid="moves">{view.moves}</div>
      <div data-testid="map">{view.map}</div>
      <div data-testid="annotations">{view.annotations}</div>
      <div data-testid="next">{view.nextMoves}</div>
      <div data-testid="overlay">{view.overlay}</div>
    </>
  );
}

const mount = (props: Parameters<typeof Harness>[0] = {}) =>
  render(
    <AppThemeWithLang>
      <Harness {...props} />
    </AppThemeWithLang>,
  );

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("useVariationsExplorer — the opt-in parts", () => {
  it("gives a move list and the next-moves bar, and nothing it was not asked for", () => {
    // At a branch: the bar lists continuations only where there is a choice.
    mount({ nodeId: at(tree, "e4", "e5") });
    expect(screen.getByTestId("move-ply-1")).toBeInTheDocument();
    expect(screen.getByTestId("next")).not.toBeEmptyDOMElement();
    expect(parts.map).toBeUndefined();
    expect(parts.annotations).toBeUndefined();
    expect(parts.overlay).toBeNull();
    expect(parts.arrows).toEqual([]);
  });

  it("is read-only without onEditTree: a right-click opens no menu", () => {
    mount();
    fireEvent.contextMenu(screen.getByTestId("move-ply-1"));
    expect(screen.queryByTestId("move-menu")).toBeNull();
  });

  it("opens the move menu when given onEditTree", () => {
    const onEditTree = vi.fn();
    mount({ onEditTree });
    fireEvent.contextMenu(screen.getByTestId("move-ply-1"));
    expect(screen.getByTestId("move-menu")).toBeInTheDocument();
  });

  it("offers Play chances at a branch unless told not to (CTA-73)", () => {
    // 2. Nf3 has two alternatives, so its menu offers the branch's chances…
    const { unmount } = mount({ onEditTree: vi.fn() });
    fireEvent.contextMenu(screen.getByTestId("move-ply-3"));
    expect(screen.getByTestId("move-menu-chances")).toBeInTheDocument();
    unmount();

    // …and a board with nothing to play by them (the Analysis Board) turns it off.
    mount({ onEditTree: vi.fn(), playChances: false });
    fireEvent.contextMenu(screen.getByTestId("move-ply-3"));
    expect(screen.getByTestId("move-menu")).toBeInTheDocument();
    expect(screen.getByTestId("move-menu-delete")).toBeInTheDocument();
    expect(screen.queryByTestId("move-menu-chances")).toBeNull();
  });

  it("renders the map and the comment block when asked for", () => {
    mount({ map: {}, annotations: true, nodeId: at(tree, "e4") });
    expect(screen.getByTestId("x-map")).toBeInTheDocument();
    expect(screen.getByTestId("x-annotations")).toHaveTextContent("King's pawn.");
    // Read-only: no add button without onEditTree.
    expect(screen.queryByTestId("x-annotations-add")).toBeNull();
  });
});

describe("useVariationsExplorer — the arrows", () => {
  it("draws every continuation, the mainline's in its own colour, when shown", () => {
    mount({ arrows: { show: true }, nodeId: at(tree, "e4", "e5") });
    expect(parts.arrows.map((arrow) => [arrow.endSquare, arrow.color])).toEqual([
      ["f3", NEXT_MOVE_ARROW_COLOR],
      ["f4", SIDELINE_NEXT_MOVE_ARROW_COLOR],
      ["c3", SIDELINE_NEXT_MOVE_ARROW_COLOR],
    ]);
  });

  it("draws the required moves alone, whatever the switch says", () => {
    const required = [at(tree, "e4", "e5", "f4")].map((id) =>
      mainline(tree)[1].children.find((node) => node.id === id)!,
    );
    mount({ arrows: { show: true, required }, nodeId: at(tree, "e4", "e5") });
    expect(parts.arrows).toEqual([
      { startSquare: "f2", endSquare: "f4", color: REQUIRED_MOVE_ARROW_COLOR },
    ]);
  });

  it("hands the board to the play-chance overlay where the branch is marked", () => {
    mount({ arrows: { show: true, chances: true }, nodeId: at(tree, "e4", "e5") });
    expect(parts.arrows).toEqual([]);
    expect(screen.getByTestId("x-chance-arrows-overlay")).toBeInTheDocument();
  });
});

describe("useVariationsExplorer — a masked board's notation (CTA-79)", () => {
  it("writes a hidden piece's move as coordinates in every part that prints one", () => {
    mount({
      nodeId: at(tree, "e4", "e5"),
      mask: MASK_PRESETS.nonPawns,
      annotations: true,
      map: {},
    });
    // The side lines under the list's rows.
    const moves = screen.getByTestId("moves");
    expect(moves).toHaveTextContent("b1c3");
    expect(moves).not.toHaveTextContent(/Nf3|Nc3/);
    // The next-moves bar at the branch — a pawn move is hidden too, being
    // what the others are drawn as.
    const next = screen.getByTestId("next");
    expect(next).toHaveTextContent("g1f3");
    expect(next).toHaveTextContent("f2f4");
    // The map's labels.
    const labels = screen.getByTestId("x-map-labels");
    expect(labels).toHaveTextContent("g1f3");
    expect(labels).not.toHaveTextContent("Nf3");
  });

  it("prints SAN with no mask", () => {
    mount({ nodeId: at(tree, "e4", "e5"), map: {} });
    expect(screen.getByTestId("next")).toHaveTextContent("Nf3");
    expect(screen.getByTestId("x-map-labels")).toHaveTextContent("Nf3");
  });
});

describe("useVariationsExplorer — annotation glyphs (CTA-97)", () => {
  const annotated = parsePgnTree(
    "1. e4! $14 e5 2. Nf3 (2. f4?! $40 exf4) (2. Nc3 $250) 2... Nc6 *",
  );

  function Annotated(props: Omit<VariationsExplorerOptions, "testId" | "source">) {
    const view = useVariationsExplorer({
      testId: "x",
      source: {
        tree: annotated,
        mainlineNodes: mainline(annotated),
        nodeId: null,
        goToNode: vi.fn(),
        orientation: "white",
      },
      ...props,
    });
    return (
      <>
        <div data-testid="moves">{view.moves}</div>
        <div data-testid="map">{view.map}</div>
      </>
    );
  }

  const mountAnnotated = (props: Parameters<typeof Annotated>[0] = {}) =>
    render(
      <AppThemeWithLang>
        <Annotated {...props} />
      </AppThemeWithLang>,
    );

  it("follows the SAN in the mainline's cells, the move mark first and coloured", () => {
    mountAnnotated();
    const cell = screen.getByTestId("move-ply-1");
    expect(cell).toHaveTextContent("e4!⩲");
    expect(cell).toHaveAttribute("dir", "ltr");
    const glyphs = within(screen.getByTestId("move-nags-1"));
    expect(glyphs.getByText("!")).toHaveAttribute("data-tone", "good");
    expect(glyphs.getByText("⩲")).not.toHaveAttribute("data-tone");
    expect(screen.queryByTestId("move-nags-2")).toBeNull();
  });

  it("follows the SAN in the side lines, a code outside the table as $N", () => {
    mountAnnotated();
    const f4 = at(annotated, "e4", "e5", "f4");
    const token = screen.getByTestId(`tree-move-${f4}`);
    expect(token).toHaveTextContent("2. f4?!→");
    expect(within(token).getByText("?!")).toHaveAttribute("data-tone", "dubious");
    expect(screen.getByTestId(`tree-nags-${at(annotated, "e4", "e5", "Nc3")}`)).toHaveTextContent("$250");
  });

  it("follows the SAN in the map's labels", () => {
    mountAnnotated({ map: {} });
    const e4 = at(annotated, "e4");
    const label = screen.getByTestId(`x-map-label-${e4}`);
    expect(label).toHaveTextContent("e4!⩲");
    expect(label.querySelector('.map-nag[data-tone="good"]')).toHaveTextContent("!");
  });

  it("still shows the glyphs beside a masked board's coordinates", () => {
    mountAnnotated({ mask: MASK_PRESETS.nonPawns, map: {} });
    const nc3 = at(annotated, "e4", "e5", "Nc3");
    expect(screen.getByTestId(`tree-move-${nc3}`)).toHaveTextContent("b1c3$250");
    expect(screen.getByTestId(`x-map-label-${nc3}`)).toHaveTextContent("b1c3$250");
  });

  it("offers Add annotation… in the move menu, which opens the dialog on that move", () => {
    const onEditTree = vi.fn();
    mountAnnotated({ onEditTree });
    fireEvent.contextMenu(screen.getByTestId("move-ply-1"));
    fireEvent.click(screen.getByTestId("move-menu-annotate"));
    expect(screen.getByTestId("nag-dialog")).toBeInTheDocument();
    expect(screen.getByTestId("nag-dialog-move")).toHaveTextContent("1. e4!⩲");

    // Picking the active mark takes it off, through onEditTree like every edit.
    fireEvent.click(screen.getByTestId("nag-dialog-choice-1"));
    const [next] = onEditTree.mock.calls[0] as [GameTree];
    expect(findNode(next, at(annotated, "e4"))?.nags).toEqual([14]);
  });

  it("offers it from the map's menu too, and nowhere without onEditTree", () => {
    const { unmount } = mountAnnotated({ onEditTree: vi.fn(), map: {} });
    fireEvent.contextMenu(screen.getByTestId(`x-map-go-${at(annotated, "e4", "e5")}`));
    expect(screen.getByTestId("move-menu-annotate")).toBeInTheDocument();
    unmount();

    mountAnnotated({ map: {} });
    fireEvent.contextMenu(screen.getByTestId("move-ply-1"));
    expect(screen.queryByTestId("move-menu-annotate")).toBeNull();
  });
});

describe("useVariationsExplorer — the width source and palette (CTA-98)", () => {
  // 2. Nf3 and 2. f4 carry a games count and 2. Nc3 none; the fork at move 3
  // carries no tag at all.
  const tagged = parsePgnTree(
    "1. e4 e5 2. Nf3 {games:30} (2. f4 {[%games 10]}) (2. Nc3) 2... Nc6 3. Bb5 (3. Bc4) *",
  );

  function Weighted(props: Omit<VariationsExplorerOptions, "testId" | "source"> & { nodeId: string }) {
    const { nodeId, ...rest } = props;
    const view = useVariationsExplorer({
      testId: "x",
      source: {
        tree: tagged,
        mainlineNodes: mainline(tagged),
        nodeId,
        goToNode: vi.fn(),
        orientation: "white",
      },
      ...rest,
    });
    report(view);
    return (
      <>
        <div data-testid="next">{view.nextMoves}</div>
        <div data-testid="overlay">{view.overlay}</div>
      </>
    );
  }

  const mountWeighted = (props: Parameters<typeof Weighted>[0]) =>
    render(
      <AppThemeWithLang>
        <Weighted {...props} />
      </AppThemeWithLang>,
    );

  const pathTo = (square: string) =>
    screen.getByTestId("x-width-arrows-overlay").querySelector(`path[data-to="${square}"]`)!;
  const widthOf = (square: string) => Number(pathTo(square).getAttribute("stroke-width"));

  it("sizes the tagged moves in the overlay, in the palette's colours, the untagged one gray", () => {
    const { lichess } = NEXT_MOVE_ARROW_PALETTES;
    mountWeighted({
      nodeId: at(tagged, "e4", "e5"),
      arrows: { show: true, widthSource: "games", palette: "lichess" },
    });
    // The library arrows stand down; the overlay draws all three.
    expect(parts.arrows).toEqual([]);
    expect(screen.getByTestId("x-width-arrows-overlay").querySelectorAll("path")).toHaveLength(3);
    expect(pathTo("f3")).toHaveAttribute("fill", lichess.mainline);
    expect(pathTo("f4")).toHaveAttribute("fill", lichess.sideline);
    expect(pathTo("c3")).toHaveAttribute("fill", UNTAGGED_NEXT_MOVE_ARROW_COLOR);
    // 30 games against 10: the wider the more played (the border grows with it).
    expect(widthOf("f3")).toBeGreaterThan(widthOf("f4"));
  });

  it("draws the hovered move in the palette's hover colour", () => {
    const { colorblind } = NEXT_MOVE_ARROW_PALETTES;
    mountWeighted({
      nodeId: at(tagged, "e4", "e5"),
      arrows: { show: true, widthSource: "games", palette: "colorblind" },
    });
    fireEvent.mouseEnter(screen.getByTestId(`next-move-${at(tagged, "e4", "e5", "Nc3")}`));
    expect(pathTo("c3")).toHaveAttribute("fill", colorblind.hovered);
  });

  it("draws the ordinary palette arrows where no move at the branch carries the tag", () => {
    const { lichess } = NEXT_MOVE_ARROW_PALETTES;
    mountWeighted({
      nodeId: at(tagged, "e4", "e5", "Nf3", "Nc6"),
      arrows: { show: true, widthSource: "games", palette: "lichess" },
    });
    expect(parts.overlay).toBeNull();
    expect(parts.arrows.map((arrow) => [arrow.endSquare, arrow.color])).toEqual([
      ["b5", lichess.mainline],
      ["c4", lichess.sideline],
    ]);
  });

  it("sizes nothing while the arrows are off — only a hovered move's, in the palette", () => {
    const { lichess } = NEXT_MOVE_ARROW_PALETTES;
    mountWeighted({
      nodeId: at(tagged, "e4", "e5"),
      arrows: { show: false, widthSource: "games", palette: "lichess" },
    });
    expect(parts.overlay).toBeNull();
    expect(parts.arrows).toEqual([]);
    fireEvent.mouseEnter(screen.getByTestId(`next-move-${at(tagged, "e4", "e5", "f4")}`));
    expect(parts.arrows).toEqual([{ startSquare: "f2", endSquare: "f4", color: lichess.hovered }]);
  });

  it("sizes by the lines ahead with no tag at all", () => {
    mountWeighted({
      nodeId: at(tagged, "e4", "e5", "Nf3", "Nc6"),
      arrows: { show: true, widthSource: "lines" },
    });
    expect(screen.getByTestId("x-width-arrows-overlay").querySelectorAll("path")).toHaveLength(2);
    // Classic by default.
    expect(pathTo("b5")).toHaveAttribute("fill", NEXT_MOVE_ARROW_COLOR);
  });
});

describe("useVariationsExplorer — the PGN's shapes (CTA-143)", () => {
  // The game's opening comment rings d4; 1. e4's comment draws a red arrow
  // and a yellow ring beside its prose.
  const drawn = parsePgnTree(
    "{[%csl Gd4]} 1. e4 {Sharp. [%cal Rd7d5][%csl Ye5]} e5 2. Nf3 (2. f4 {prc:75}) (2. Nc3 {prc:25}) *",
  );
  const { drawing } = defaultChessTokens;

  function Drawn(props: Omit<VariationsExplorerOptions, "testId" | "source"> & { nodeId: string | null }) {
    const { nodeId, ...rest } = props;
    const view = useVariationsExplorer({
      testId: "x",
      source: {
        tree: drawn,
        mainlineNodes: mainline(drawn),
        nodeId,
        goToNode: vi.fn(),
        orientation: "white",
      },
      ...rest,
    });
    report(view);
    return (
      <>
        <div data-testid="annotations">{view.annotations}</div>
        <div data-testid="overlay">{view.overlay}</div>
      </>
    );
  }

  const mountDrawn = (props: Parameters<typeof Drawn>[0]) =>
    render(
      <AppThemeWithLang>
        <Drawn {...props} />
      </AppThemeWithLang>,
    );

  const circles = () =>
    [...screen.getByTestId("x-shape-circles").querySelectorAll("circle")].map((circle) => [
      circle.getAttribute("data-square"),
      circle.getAttribute("stroke"),
    ]);

  /** A mouse event as react-chessboard's square handlers receive it. */
  const mouse = (button: number, keys: { shiftKey?: boolean; altKey?: boolean } = {}) =>
    ({ button, shiftKey: false, altKey: false, ctrlKey: false, metaKey: false, ...keys }) as unknown as React.MouseEvent;
  type SquareHandler = (args: { square: string; piece: null }, event: React.MouseEvent) => void;
  const press = (square: string, event: React.MouseEvent) =>
    act(() => (parts.boardOptions.onSquareMouseDown as SquareHandler)({ square, piece: null }, event));
  const pass = (square: string) =>
    act(() => parts.boardOptions.onMouseOverSquare!({ square, piece: null }));
  const release = (square: string, event: React.MouseEvent) =>
    act(() => (parts.boardOptions.onSquareMouseUp as SquareHandler)({ square, piece: null }, event));

  it("draws the move's arrows with the next-move arrows, and its circles over the board, in the theme's brushes", () => {
    mountDrawn({ nodeId: at(drawn, "e4"), annotations: true, arrows: { show: true } });
    expect(parts.arrows).toEqual([
      { startSquare: "e7", endSquare: "e5", color: NEXT_MOVE_ARROW_COLOR },
      { startSquare: "d7", endSquare: "d5", color: drawing.red },
    ]);
    expect(circles()).toEqual([["e5", drawing.yellow]]);
    // The commands are drawn, not read: the block shows the prose alone.
    expect(screen.getByTestId("x-annotations")).toHaveTextContent("Sharp.");
    expect(screen.getByTestId("x-annotations")).not.toHaveTextContent(/cal|csl|d7d5/);
  });

  it("draws the game's opening comment at the start, and nothing where the comment block is off", () => {
    const { unmount } = mountDrawn({ nodeId: null, annotations: true });
    expect(circles()).toEqual([["d4", drawing.green]]);
    unmount();

    // A repertoire game: a test the drawing would answer.
    mountDrawn({ nodeId: at(drawn, "e4"), arrows: { show: true } });
    expect(parts.arrows).toEqual([{ startSquare: "e7", endSquare: "e5", color: NEXT_MOVE_ARROW_COLOR }]);
    expect(parts.overlay).toBeNull();
    expect(parts.boardOptions).toEqual({});
  });

  it("keeps the required move and the play-chance overlay alongside the shapes", () => {
    const required = [findNode(drawn, at(drawn, "e4", "e5"))!];
    const { unmount } = mountDrawn({ nodeId: at(drawn, "e4"), annotations: true, arrows: { show: true, required } });
    expect(parts.arrows).toEqual([
      { startSquare: "e7", endSquare: "e5", color: REQUIRED_MOVE_ARROW_COLOR },
      { startSquare: "d7", endSquare: "d5", color: drawing.red },
    ]);
    unmount();

    const atBranch = parsePgnTree(
      "1. e4 e5 {[%csl Gf3]} 2. Nf3 (2. f4 {prc:75}) (2. Nc3 {prc:25}) *",
    );
    function Branch() {
      report(
        useVariationsExplorer({
          testId: "x",
          source: { tree: atBranch, mainlineNodes: mainline(atBranch), nodeId: at(atBranch, "e4", "e5"), goToNode: vi.fn(), orientation: "white" },
          annotations: true,
          arrows: { show: true, chances: true },
        }),
      );
      return <div data-testid="overlay">{parts.overlay}</div>;
    }
    render(
      <AppThemeWithLang>
        <Branch />
      </AppThemeWithLang>,
    );
    expect(screen.getByTestId("x-chance-arrows-overlay")).toBeInTheDocument();
    expect(circles()).toEqual([["f3", drawing.green]]);
  });

  it("writes a right-drag into the comment as an arrow, in the modifier's brush, with a preview while drawing", () => {
    const onEditTree = vi.fn();
    mountDrawn({ nodeId: at(drawn, "e4"), annotations: true, onEditTree });
    // The library's own right-drag arrows are off: every shape is the comment's.
    expect(parts.boardOptions.allowDrawingArrows).toBe(false);

    press("g8", mouse(2, { altKey: true }));
    pass("g7");
    pass("f6");
    expect(parts.arrows).toContainEqual({ startSquare: "g8", endSquare: "f6", color: drawing.blue });
    release("f6", mouse(2));

    const [next] = onEditTree.mock.calls[0] as [GameTree];
    expect(findNode(next, at(drawn, "e4"))?.comments).toEqual(["Sharp. [%cal Rd7d5,Bg8f6][%csl Ye5]"]);
    // The preview is gone once released.
    expect(parts.arrows).not.toContainEqual(expect.objectContaining({ startSquare: "g8" }));
  });

  it("writes a right-click as a circle, and one drawn again comes off, the prose kept", () => {
    const onEditTree = vi.fn();
    mountDrawn({ nodeId: at(drawn, "e4"), annotations: true, onEditTree });
    // Shift + Alt is yellow: the ring on e5 is drawn again, so it comes off.
    press("e5", mouse(2, { shiftKey: true, altKey: true }));
    release("e5", mouse(2));
    const [next] = onEditTree.mock.calls[0] as [GameTree];
    expect(findNode(next, at(drawn, "e4"))?.comments).toEqual(["Sharp. [%cal Rd7d5]"]);
  });

  it("writes into the game's opening comment at the start, and ignores the left button", () => {
    const onEditTree = vi.fn();
    mountDrawn({ nodeId: null, annotations: true, onEditTree });
    press("e2", mouse(0));
    release("e4", mouse(0));
    expect(onEditTree).not.toHaveBeenCalled();

    press("d4", mouse(2, { shiftKey: true }));
    release("d4", mouse(2));
    const [next] = onEditTree.mock.calls[0] as [GameTree];
    expect(next.comments).toEqual(["[%csl Rd4]"]);
  });

  it("leaves a board that does not edit its own temporary drawing", () => {
    mountDrawn({ nodeId: at(drawn, "e4"), annotations: true });
    expect(parts.boardOptions).toEqual({});
  });
});
