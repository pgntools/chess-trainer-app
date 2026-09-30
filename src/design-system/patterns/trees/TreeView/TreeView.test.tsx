import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material/styles";
import { MemoryRouter, Link as RouterLink, useLocation } from "react-router";

import { buildTheme } from "../../../theme";
import { defaultTheme } from "../../../themes";

import TreeView, { type TreeNode, type TreeViewProps } from "./TreeView";
import { ancestorsOf, visibleNodes } from "./treeNodes";
import { expectNoAxeViolations } from "../../../../test/axe";

const NODES: TreeNode[] = [
  { id: "home", label: "Home", link: { href: "#home" } },
  {
    id: "docs",
    label: "Documents",
    children: [
      { id: "reports", label: "Reports", link: { href: "#reports" } },
      { id: "archive", label: "Archive", children: [{ id: "old", label: "Old", link: { href: "#old" } }] },
    ],
  },
  { id: "folder", label: "Folder", selectable: true, secondary: 12, children: [{ id: "sub", label: "Sub" }] },
];

const HINT = "Arrow keys to move, Enter to go.";

const mount = (props: Partial<TreeViewProps> = {}) => {
  const onToggle = vi.fn();
  const onSelect = vi.fn();
  render(
    <TreeView
      nodes={NODES}
      open={new Set()}
      onToggle={onToggle}
      onSelect={onSelect}
      toggleLabel={(node, open) => `${open ? "Close" : "Open"} ${String(node.label)}`}
      ariaLabel="Tree"
      hint={HINT}
      testId="t"
      {...props}
    />,
  );
  return { onToggle, onSelect };
};

describe("TreeView", () => {
  it("shows the top level, a closed branch's children not mounted", () => {
    mount();
    expect(screen.getByRole("tree", { name: "Tree" })).toBeInTheDocument();
    expect(screen.getByTestId("t-home")).toHaveAttribute("href", "#home");
    expect(screen.getByTestId("t-docs")).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByTestId("t-reports")).toBeNull();
    expect(screen.queryByTestId("t-docs-group")).toBeNull();
  });

  it("opens the branches it is told are open, to any depth", () => {
    mount({ open: new Set(["docs", "archive"]) });
    expect(screen.getByTestId("t-docs")).toHaveAttribute("aria-expanded", "true");
    expect(within(screen.getByTestId("t-docs-group")).getByTestId("t-reports")).toBeInTheDocument();
    expect(screen.getByTestId("t-old")).toHaveAttribute("href", "#old");
  });

  it("asks its caller to open or close a folder that is only a folder — and it is no link", () => {
    const { onToggle, onSelect } = mount();
    expect(screen.getByTestId("t-docs")).not.toHaveAttribute("href");
    fireEvent.click(screen.getByTestId("t-docs"));
    expect(onToggle).toHaveBeenCalledWith("docs");
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("gives a selectable branch a chevron of its own, for the pointer: the row selects, the chevron opens", () => {
    const { onToggle, onSelect } = mount();
    const row = screen.getByTestId("t-folder");
    expect(row).toHaveAttribute("aria-expanded", "false");
    expect(row).toHaveTextContent("12");
    fireEvent.click(row);
    expect(onSelect).toHaveBeenCalledWith(NODES[2]);
    expect(onToggle).not.toHaveBeenCalled();
    const chevron = screen.getByTestId("t-folder-toggle");
    expect(chevron).toHaveAttribute("title", "Open Folder");
    // The keyboard opens it from the row, so the chevron is no tab stop and no second name (CTA-111).
    expect(chevron).toHaveAttribute("tabindex", "-1");
    expect(chevron).toHaveAttribute("aria-hidden", "true");
    fireEvent.click(chevron);
    expect(onToggle).toHaveBeenCalledWith("folder");
  });

  it("hands a click on a leaf without a link to its caller", () => {
    const { onSelect } = mount({ open: new Set(["folder"]) });
    fireEvent.click(screen.getByTestId("t-sub"));
    expect(onSelect).toHaveBeenCalledWith(NODES[2].children?.[0]);
  });

  it("marks the node on screen", () => {
    mount({ open: new Set(["docs"]), activeId: "reports" });
    expect(screen.getByTestId("t-reports")).toHaveAttribute("aria-current", "page");
    expect(screen.getByTestId("t-reports")).toHaveClass("Mui-selected");
    expect(screen.getByTestId("t-home")).not.toHaveAttribute("aria-current");
  });

  it("sets each level further in from the inline start", () => {
    mount({ open: new Set(["docs", "archive"]) });
    const inset = (id: string) => getComputedStyle(screen.getByTestId(`t-${id}`)).paddingInlineStart;
    expect(new Set([inset("home"), inset("reports"), inset("old")]).size).toBe(3);
  });

  it("links through the router", () => {
    function Where() {
      return <span data-testid="where">{useLocation().pathname}</span>;
    }
    render(
      <MemoryRouter>
        <TreeView
          nodes={[{ id: "a", label: "A", link: { component: RouterLink, to: "/a" } }]}
          open={new Set()}
          onToggle={vi.fn()}
          ariaLabel="Pages"
          hint={HINT}
          testId="t"
        />
        <Where />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTestId("t-a"));
    expect(screen.getByTestId("where")).toHaveTextContent("/a");
  });
});

/** The tree with its open branches held as a screen would hold them, under `direction`. */
function Live({ direction = "ltr", onSelect = vi.fn(), activeId }: { direction?: "ltr" | "rtl"; onSelect?: () => void; activeId?: string }) {
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  return (
    <ThemeProvider theme={buildTheme(defaultTheme, "light", direction)}>
      <TreeView
        nodes={NODES}
        open={open}
        onToggle={(id) =>
          setOpen((before) => {
            const next = new Set(before);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
          })
        }
        onSelect={onSelect}
        activeId={activeId}
        ariaLabel="Tree"
        hint={HINT}
        testId="t"
      />
    </ThemeProvider>
  );
}

const item = (name: string) => screen.getByRole("treeitem", { name: new RegExp(`^${name}`) });

describe("TreeView — WAI-ARIA's tree pattern (CTA-111)", () => {
  it("reads its hint with the tree, out of sight — and cannot go without one (CTA-112)", async () => {
    mount();
    expect(screen.getByRole("tree", { name: "Tree" })).toHaveAccessibleDescription(HINT);
    expect(screen.getByTestId("t-hint")).toHaveStyle({ position: "absolute" });
    await expectNoAxeViolations();
    // @ts-expect-error — a tree's keys are told in a hint (CTA-112).
    const unexplained = <TreeView nodes={NODES} open={new Set()} onToggle={() => {}} ariaLabel="Tree" testId="t" />;
    expect(unexplained).toBeDefined();
  });

  it("is a named tree of tree items, each at its level, a branch owning its open group", () => {
    mount({ open: new Set(["docs"]) });
    const tree = screen.getByRole("tree", { name: "Tree" });
    expect(within(tree).getAllByRole("treeitem").map((row) => row.getAttribute("aria-level"))).toEqual(["1", "1", "2", "2", "1"]);
    const group = screen.getByRole("group");
    expect(item("Documents")).toHaveAttribute("aria-owns", group.id);
    expect(item("Folder")).not.toHaveAttribute("aria-owns");
  });

  it("is one tab stop — the node on screen, else the first row", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Live />);
    await user.tab();
    expect(item("Home")).toHaveFocus();
    expect(screen.getAllByRole("treeitem").filter((row) => row.tabIndex === 0)).toHaveLength(1);
    unmount();
    render(<Live activeId="folder" />);
    await user.tab();
    expect(item("Folder")).toHaveFocus();
  });

  it("walks the rows in view with ↓ / ↑, Home and End", async () => {
    const user = userEvent.setup();
    render(<Live />);
    await user.tab();
    await user.keyboard("{ArrowDown}");
    expect(item("Documents")).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(item("Folder")).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(item("Folder")).toHaveFocus();
    await user.keyboard("{ArrowUp}{ArrowUp}");
    expect(item("Home")).toHaveFocus();
    await user.keyboard("{End}");
    expect(item("Folder")).toHaveFocus();
    await user.keyboard("{Home}");
    expect(item("Home")).toHaveFocus();
  });

  it("opens with →, steps in with → again, steps out and closes with ←", async () => {
    const user = userEvent.setup();
    render(<Live />);
    await user.tab();
    await user.keyboard("{ArrowDown}{ArrowRight}");
    expect(item("Documents")).toHaveAttribute("aria-expanded", "true");
    expect(item("Documents")).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(item("Reports")).toHaveFocus();
    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(item("Folder")).toHaveFocus();
    await user.keyboard("{ArrowUp}{ArrowLeft}");
    expect(item("Documents")).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(item("Documents")).toHaveAttribute("aria-expanded", "false");
    await waitFor(() => expect(screen.queryByRole("treeitem", { name: /^Reports/ })).toBeNull());
  });

  it("swaps → and ← under RTL, as the tree mirrors", async () => {
    const user = userEvent.setup();
    render(<Live direction="rtl" />);
    await user.tab();
    await user.keyboard("{ArrowDown}{ArrowLeft}");
    expect(item("Documents")).toHaveAttribute("aria-expanded", "true");
    await user.keyboard("{ArrowRight}");
    expect(item("Documents")).toHaveAttribute("aria-expanded", "false");
  });

  it("selects a row with Enter, and opens a folder that is only a folder", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<Live onSelect={onSelect} />);
    await user.tab();
    await user.keyboard("{End}{Enter}");
    expect(onSelect).toHaveBeenCalledWith(NODES[2]);
    await user.keyboard("{Home}{ArrowDown}{Enter}");
    expect(item("Documents")).toHaveAttribute("aria-expanded", "true");
  });
});

describe("ancestorsOf", () => {
  it("lists the branches above a node, outermost first", () => {
    expect(ancestorsOf(NODES, "old")).toEqual(["docs", "archive"]);
    expect(ancestorsOf(NODES, "sub")).toEqual(["folder"]);
  });

  it("is empty at the top level and for an id the tree does not hold", () => {
    expect(ancestorsOf(NODES, "home")).toEqual([]);
    expect(ancestorsOf(NODES, "nowhere")).toEqual([]);
  });
});

describe("visibleNodes", () => {
  it("lists the rows in view, top to bottom, each with its branch", () => {
    expect(visibleNodes(NODES, new Set()).map((entry) => entry.node.id)).toEqual(["home", "docs", "folder"]);
    expect(visibleNodes(NODES, new Set(["docs", "archive"])).map((entry) => [entry.node.id, entry.parentId])).toEqual([
      ["home", undefined],
      ["docs", undefined],
      ["reports", "docs"],
      ["archive", "docs"],
      ["old", "archive"],
      ["folder", undefined],
    ]);
  });

  it("skips a closed branch's nodes, even under an open one", () => {
    expect(visibleNodes(NODES, new Set(["archive"])).map((entry) => entry.node.id)).toEqual(["home", "docs", "folder"]);
  });
});
