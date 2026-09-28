import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Link as RouterLink, useLocation } from "react-router";

import TreeView, { type TreeNode, type TreeViewProps } from "./TreeView";
import { ancestorsOf } from "./treeNodes";

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
      testId="t"
      {...props}
    />,
  );
  return { onToggle, onSelect };
};

describe("TreeView", () => {
  it("shows the top level, a closed branch's children not mounted", () => {
    mount();
    expect(screen.getByRole("list", { name: "Tree" })).toBeInTheDocument();
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

  it("gives a selectable branch a chevron of its own: the row selects, the chevron opens", () => {
    const { onToggle, onSelect } = mount();
    const row = screen.getByTestId("t-folder");
    expect(row).not.toHaveAttribute("aria-expanded");
    expect(row).toHaveTextContent("12");
    fireEvent.click(row);
    expect(onSelect).toHaveBeenCalledWith(NODES[2]);
    expect(onToggle).not.toHaveBeenCalled();
    const chevron = screen.getByRole("button", { name: "Open Folder" });
    expect(chevron).toHaveAttribute("data-testid", "t-folder-toggle");
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
        <TreeView nodes={[{ id: "a", label: "A", link: { component: RouterLink, to: "/a" } }]} open={new Set()} onToggle={vi.fn()} testId="t" />
        <Where />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTestId("t-a"));
    expect(screen.getByTestId("where")).toHaveTextContent("/a");
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
