import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { expectNoAxeViolations } from "../../../test/axe";
import AnalysesTree, { type AnalysesTreeProps } from "./AnalysesTree";
import { FOLDERS, LABELS, MANY_ROWS, OPEN_TO_A4, ROWS, UPDATED_NEWEST_FIRST } from "./fixtures";

const mount = (props: Partial<AnalysesTreeProps> = {}) => {
  const handlers = { onToggle: vi.fn(), onShowMore: vi.fn(), onCollapsedChange: vi.fn(), onTextChange: vi.fn() };
  render(
    <AnalysesTree
      testId="at"
      folders={FOLDERS}
      rootId={null}
      rows={ROWS}
      text=""
      sort={UPDATED_NEWEST_FIRST}
      currentId="a4"
      locked={false}
      linkOf={(row) => ({ href: `#${row.id}` })}
      closeLink={{ href: "#list" }}
      open={OPEN_TO_A4}
      collapsed={false}
      labels={LABELS}
      {...handlers}
      {...props}
    />,
  );
  return handlers;
};

describe("AnalysesTree", () => {
  it("is a named navigation landmark over a named tree of the folders and analyses — nested, the open one current", async () => {
    mount();
    const nav = screen.getByRole("navigation", { name: LABELS.title });
    const tree = within(nav).getByRole("tree", { name: LABELS.title });
    expect(within(tree).getByRole("treeitem", { name: /Chess basics/ })).toHaveAttribute("aria-expanded", "true");
    expect(within(tree).getByTestId("at-tree-grook")).toHaveAttribute("aria-level", "3");
    expect(within(tree).getByRole("treeitem", { current: "page" })).toHaveTextContent("Lucena position");
    expect(screen.getByTestId("at-tree-a5")).toHaveAttribute("href", "#a5");
    await expectNoAxeViolations(nav);
  });

  it("shows a long name whole, wrapped — not cut with an ellipsis", () => {
    mount();
    const name = "1. The opening principles — develop, castle, fight for the centre";
    expect(within(screen.getByTestId("at-tree-a1")).getByText(name)).not.toHaveStyle({ whiteSpace: "nowrap" });
  });

  it("closes into the list: a link, named by where it goes", () => {
    mount();
    expect(screen.getByRole("link", { name: LABELS.close })).toHaveAttribute("href", "#list");
  });

  it("asks to open and close a folder from its row, and for more of a long folder from its row", () => {
    const { onToggle, onShowMore } = mount({ rows: MANY_ROWS, currentId: "m27", open: new Set(["gopenings"]) });
    fireEvent.click(screen.getByTestId("at-tree-gtutorial"));
    expect(onToggle).toHaveBeenCalledWith("gtutorial");
    fireEvent.click(screen.getByRole("treeitem", { name: "Show 200 more" }));
    expect(onShowMore).toHaveBeenCalledWith("gopenings");
  });

  it("is rooted at a folder: its contents are the top rows", () => {
    mount({ rootId: "gendings", open: new Set() });
    const tree = screen.getByRole("tree");
    expect(within(tree).getAllByRole("treeitem").filter((item) => item.getAttribute("aria-level") === "1").map((item) => item.textContent)).toEqual([
      "Rook endings2",
      "Opposition and the square of the pawn",
    ]);
    expect(screen.queryByText("Chess basics")).toBeNull();
  });

  it("disables the other analyses while locked and says why — folders still open", () => {
    const { onToggle } = mount({ locked: true });
    expect(screen.getByTestId("at-locked")).toHaveTextContent(LABELS.locked);
    expect(screen.getByTestId("at-tree-a5")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByTestId("at-tree-a5")).not.toHaveAttribute("href");
    expect(screen.getByTestId("at-tree-a4")).not.toHaveAttribute("aria-disabled");
    fireEvent.click(screen.getByTestId("at-tree-grook"));
    expect(onToggle).toHaveBeenCalledWith("grook");
  });

  it("folds to a rail from its named button, by the keyboard too, and opens again from the rail", async () => {
    const user = userEvent.setup();
    const { onCollapsedChange } = mount();
    screen.getByRole("button", { name: LABELS.collapse }).focus();
    await user.keyboard("{Enter}");
    expect(onCollapsedChange).toHaveBeenLastCalledWith(true);
  });

  describe("the filter box", () => {
    it("is a named search field over the tree, and says what is typed", () => {
      const { onTextChange } = mount();
      const box = screen.getByRole("searchbox", { name: LABELS.filter });
      fireEvent.change(box, { target: { value: "luc" } });
      expect(onTextChange).toHaveBeenCalledWith("luc");
    });

    it("narrows the tree to the matches and opens every branch above them, whatever was open", async () => {
      mount({ text: "lucena", open: new Set() });
      const tree = screen.getByRole("tree");
      expect(within(tree).getAllByRole("treeitem").map((row) => row.textContent)).toEqual(["Chess basics1", "Endings1", "Rook endings1", "Lucena position"]);
      expect(screen.queryByTestId("at-no-match")).toBeNull();
      await expectNoAxeViolations(screen.getByTestId("at"));
    });

    it("says nothing matches, apart from an empty folder, and clears from its button or Escape", async () => {
      const user = userEvent.setup();
      const { onTextChange } = mount({ text: "zugzwang" });
      expect(screen.getByTestId("at-no-match")).toHaveTextContent(LABELS.noMatch);
      expect(screen.queryByRole("treeitem")).toBeNull();
      await user.click(screen.getByRole("button", { name: LABELS.filterClear }));
      expect(onTextChange).toHaveBeenLastCalledWith("");
      screen.getByRole("searchbox", { name: LABELS.filter }).focus();
      await user.keyboard("{Escape}");
      expect(onTextChange).toHaveBeenCalledTimes(2);
    });

    it("keeps the folders the reader opened for blank words, and has no box on the rail", () => {
      mount({ text: "  ", open: new Set(["gtutorial"]) });
      expect(screen.getByTestId("at-tree-gtutorial")).toHaveAttribute("aria-expanded", "true");
      expect(screen.queryByTestId("at-tree-gendings-group")).toBeNull();
    });

    it("is not on the folded rail", () => {
      mount({ collapsed: true });
      expect(screen.queryByRole("searchbox")).toBeNull();
    });
  });

  describe("the previous / next toolbar", () => {
    const siblings = { previous: { href: "#a3" }, next: { href: "#a5" }, testId: "sib" };

    it("is a pair of named links at the panel's foot, beneath the scrolling tree", async () => {
      mount({ siblings });
      const bar = screen.getByTestId("at-siblings");
      expect(within(bar).getByRole("link", { name: LABELS.previous })).toHaveAttribute("href", "#a3");
      expect(within(bar).getByRole("link", { name: LABELS.next })).toHaveAttribute("href", "#a5");
      expect(screen.getByTestId("sib-previous")).toBe(within(bar).getByRole("link", { name: LABELS.previous }));
      expect(screen.getByTestId("at-tree").compareDocumentPosition(bar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      await expectNoAxeViolations(screen.getByTestId("at"));
    });

    it("disables an end that has no neighbour, and draws nothing without `siblings`", () => {
      mount({ siblings: { ...siblings, previous: undefined } });
      expect(screen.getByTestId("sib-previous")).toBeDisabled();
      expect(screen.getByTestId("sib-next")).toBeEnabled();
    });

    it("is off while locked, each button named by why", () => {
      mount({ siblings, locked: true });
      for (const id of ["sib-previous", "sib-next"]) {
        expect(screen.getByTestId(id)).toBeDisabled();
        expect(screen.getByTestId(id)).toHaveAccessibleName(LABELS.locked);
        expect(screen.getByTestId(id)).not.toHaveAttribute("href");
      }
    });

    it("is not drawn when there is none", () => {
      mount();
      expect(screen.queryByTestId("at-siblings")).toBeNull();
    });

    it("stays on the folded rail", () => {
      mount({ siblings, collapsed: true });
      expect(screen.getByRole("link", { name: LABELS.previous })).toHaveAttribute("href", "#a3");
      expect(screen.getByRole("link", { name: LABELS.next })).toHaveAttribute("href", "#a5");
      expect(screen.queryByTestId("at-siblings")).toBeNull();
    });
  });

  it("is two buttons, open and close, while collapsed", async () => {
    const { onCollapsedChange } = mount({ collapsed: true });
    expect(screen.queryByRole("tree")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: LABELS.expand }));
    expect(onCollapsedChange).toHaveBeenCalledWith(false);
    expect(screen.getByRole("link", { name: LABELS.close })).toHaveAttribute("href", "#list");
    await expectNoAxeViolations(screen.getByTestId("at"));
  });

  it("has no fold button where it cannot fold — a drawer — and no rail", () => {
    mount({ onCollapsedChange: undefined, collapsed: true });
    expect(screen.queryByRole("button", { name: LABELS.collapse })).toBeNull();
    // Still the tree: a drawer is closed, not folded.
    expect(screen.getByRole("tree")).toBeInTheDocument();
  });
});
