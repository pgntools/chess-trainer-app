import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "../../i18n";
import { expectNoAxeViolations } from "../../test/axe";
import AppThemeWithLang from "../../theme/AppThemeWithLang";
import { findNode, mainline, nodeAtSanPath, type GameTree } from "../../lib/gameTree";
import { parsePgnTree } from "../../lib/pgn";
import ShapesDialog from "./ShapesDialog";
import { useVariationsExplorer } from "./useVariationsExplorer";

/*
  The move menu's *Arrows and circles…* (CTA-143): the shapes the move's
  comment draws, each recoloured or removed, one added by its squares, and
  Remove all — every change an edit through `onEditTree`. The harness holds
  the tree the way a screen's core does, so the dialog reads each edit back.
*/

const START = parsePgnTree("1. e4 {Sharp. [%cal Rd7d5,Gg1f3][%csl Ye5] [%eval 0.3]} e5 *");
const e4 = nodeAtSanPath(START, ["e4"])!;

let latest: GameTree = START;
const edits = vi.fn();

function Harness({ tree: initial = START }: { tree?: GameTree }) {
  const [tree, setTree] = useState(initial);
  return (
    <ShapesDialog
      tree={tree}
      target={{ nodeId: e4, label: "1. e4" }}
      onClose={vi.fn()}
      onEditTree={(next) => {
        latest = next;
        edits(next);
        setTree(next);
      }}
    />
  );
}

const mount = (tree?: GameTree) =>
  render(
    <AppThemeWithLang>
      <Harness tree={tree} />
    </AppThemeWithLang>,
  );

const commentNow = () => findNode(latest, e4)?.comments;

beforeEach(async () => {
  latest = START;
  edits.mockClear();
  await i18n.changeLanguage("en");
});

describe("ShapesDialog — the move's shapes", () => {
  it("lists every arrow and circle the comment draws, its brush pressed", async () => {
    mount();
    expect(screen.getByTestId("shapes-dialog-move")).toHaveTextContent("1. e4");
    expect(screen.getByTestId("shapes-dialog-row-d7d5")).toHaveTextContent("Arrow d7 → d5");
    expect(screen.getByTestId("shapes-dialog-row-g1f3")).toHaveTextContent("Arrow g1 → f3");
    expect(screen.getByTestId("shapes-dialog-row-e5")).toHaveTextContent("Circle e5");
    expect(screen.getByRole("button", { name: "Arrow d7 → d5: Red" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Arrow d7 → d5: Green" })).toHaveAttribute("aria-pressed", "false");
    await expectNoAxeViolations(screen.getByRole("dialog"));
  });

  it("recolours a shape in place, the prose and other commands kept", async () => {
    mount();
    await userEvent.click(screen.getByRole("button", { name: "Circle e5: Blue" }));
    expect(commentNow()).toEqual(["Sharp. [%cal Rd7d5,Gg1f3][%csl Be5] [%eval 0.3]"]);
    expect(screen.getByRole("button", { name: "Circle e5: Blue" })).toHaveAttribute("aria-pressed", "true");
    // The brush it already has is no edit.
    await userEvent.click(screen.getByRole("button", { name: "Circle e5: Blue" }));
    expect(edits).toHaveBeenCalledTimes(1);
  });

  it("removes one shape, then all of them", async () => {
    mount();
    await userEvent.click(screen.getByRole("button", { name: "Remove Arrow g1 → f3" }));
    expect(commentNow()).toEqual(["Sharp. [%cal Rd7d5][%csl Ye5] [%eval 0.3]"]);
    expect(screen.queryByTestId("shapes-dialog-row-g1f3")).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Remove all" }));
    expect(commentNow()).toEqual(["Sharp. [%eval 0.3]"]);
    expect(screen.getByTestId("shapes-dialog-empty")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove all" })).toBeDisabled();
  });

  it("adds an arrow and a circle by their squares, in the chosen brush", async () => {
    mount(parsePgnTree("1. e4 e5 *"));
    expect(screen.getByTestId("shapes-dialog-empty")).toBeInTheDocument();
    const add = screen.getByRole("button", { name: "Add" });
    expect(add).toBeDisabled();

    await userEvent.type(screen.getByTestId("shapes-dialog-from"), "E2");
    await userEvent.type(screen.getByTestId("shapes-dialog-to"), "e4");
    await userEvent.click(screen.getByRole("button", { name: "Blue" }));
    await userEvent.click(add);
    expect(commentNow()).toEqual(["[%cal Be2e4]"]);
    expect(screen.getByTestId("shapes-dialog-row-e2e4")).toBeInTheDocument();

    // The same again is refused, saying why.
    await userEvent.type(screen.getByTestId("shapes-dialog-from"), "e2");
    await userEvent.type(screen.getByTestId("shapes-dialog-to"), "e4");
    expect(screen.getByTestId("shapes-dialog-exists")).toBeInTheDocument();
    expect(add).toBeDisabled();
    await userEvent.clear(screen.getByTestId("shapes-dialog-from"));

    // A circle takes one square.
    fireEvent.change(screen.getByTestId("shapes-dialog-kind"), { target: { value: "circle" } });
    expect(screen.queryByTestId("shapes-dialog-to")).toBeNull();
    await userEvent.type(screen.getByTestId("shapes-dialog-from"), "d4");
    await userEvent.click(add);
    expect(commentNow()).toEqual(["[%cal Be2e4] [%csl Bd4]"]);
  });

  it("refuses a square that is not one", async () => {
    mount();
    await userEvent.type(screen.getByTestId("shapes-dialog-from"), "z9");
    expect(screen.getByText("A square, a1 to h8")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
  });
});

describe("the move menu's Arrows and circles… (CTA-143)", () => {
  function Explorer() {
    const [tree, setTree] = useState(START);
    const view = useVariationsExplorer({
      testId: "x",
      source: { tree, mainlineNodes: mainline(tree), nodeId: null, goToNode: vi.fn(), orientation: "white" },
      onEditTree: (next) => {
        latest = next;
        setTree(next);
      },
      map: {},
    });
    return (
      <>
        <div>{view.moves}</div>
        <div>{view.map}</div>
      </>
    );
  }

  it("opens on the move right-clicked, in the list and on the map", async () => {
    render(
      <AppThemeWithLang>
        <Explorer />
      </AppThemeWithLang>,
    );
    fireEvent.contextMenu(screen.getByTestId("move-ply-1"));
    fireEvent.click(screen.getByTestId("move-menu-shapes"));
    expect(screen.getByTestId("shapes-dialog-move")).toHaveTextContent("1. e4");
    await userEvent.click(screen.getByRole("button", { name: "Remove Arrow d7 → d5" }));
    expect(commentNow()).toEqual(["Sharp. [%cal Gg1f3][%csl Ye5] [%eval 0.3]"]);
    await userEvent.click(screen.getByTestId("shapes-dialog-close"));

    fireEvent.contextMenu(screen.getByTestId(`x-map-go-${e4}`));
    expect(screen.getByTestId("move-menu-shapes")).toBeInTheDocument();
  });
});
