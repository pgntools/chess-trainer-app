import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { expectNoAxeViolations } from "../../../../test/axe";
import { TreePicker } from "./index";
import type { TreeNode } from "../TreeView";

const NODES: TreeNode[] = [
  { id: "draft", label: "A draft" },
  {
    id: "articles",
    label: "Articles",
    children: [
      { id: "one", label: "One" },
      { id: "sub", label: "Subfolder", children: [{ id: "deep", label: "Deep" }] },
    ],
  },
];

const HINT = "Arrow keys to move, right and left to open and close, Enter to open.";

const mount = (props: { activeId?: string } = {}) => {
  const onSelect = vi.fn();
  render(
    <TreePicker
      nodes={NODES}
      onSelect={onSelect}
      label="Open a node"
      treeLabel="Nodes"
      hint={HINT}
      testId="picker"
      {...props}
    />,
  );
  return { onSelect };
};

const button = () => screen.getByRole("button", { name: "Open a node" });

describe("TreePicker", () => {
  it("is closed until its button is pressed, then opens the tree under it", async () => {
    const user = userEvent.setup();
    mount();
    expect(screen.queryByRole("tree", { name: "Nodes" })).toBeNull();
    expect(button()).toHaveAttribute("aria-expanded", "false");
    await user.click(button());
    expect(screen.getByRole("tree", { name: "Nodes" })).toBeInTheDocument();
    // While it is open, the modal hides the rest of the page from the
    // accessibility tree — the button included — so the state is read off it.
    expect(screen.getByTestId("picker")).toHaveAttribute("aria-expanded", "true");
  });

  it("opens on the chain of the node on screen, its row marked", async () => {
    const user = userEvent.setup();
    mount({ activeId: "deep" });
    await user.click(button());
    expect(screen.getByTestId("picker-tree-articles")).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("picker-tree-sub")).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("picker-tree-deep")).toHaveAttribute("aria-current", "page");
  });

  it("keeps its branches closed with nothing on screen", async () => {
    const user = userEvent.setup();
    mount();
    await user.click(button());
    expect(screen.getByTestId("picker-tree-articles")).toHaveAttribute("aria-expanded", "false");
  });

  it("hands the picked node to its caller and closes", async () => {
    const user = userEvent.setup();
    const { onSelect } = mount({ activeId: "deep" });
    await user.click(button());
    await user.click(screen.getByTestId("picker-tree-one"));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "one" }));
    expect(screen.queryByRole("tree")).toBeNull();
    expect(button()).toHaveAttribute("aria-expanded", "false");
  });

  it("opens and closes the branches the reader clicks, while it is open", async () => {
    const user = userEvent.setup();
    mount();
    await user.click(button());
    const folder = screen.getByTestId("picker-tree-articles");
    await user.click(folder);
    expect(folder).toHaveAttribute("aria-expanded", "true");
    await user.click(folder);
    expect(folder).toHaveAttribute("aria-expanded", "false");
  });

  it("picks with the keyboard — Tab into the tree, Enter on the node on screen", async () => {
    const user = userEvent.setup();
    const { onSelect } = mount({ activeId: "one" });
    await user.click(button());
    await user.tab();
    expect(screen.getByTestId("picker-tree-one")).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "one" }));
    expect(screen.queryByRole("tree")).toBeNull();
  });

  it("closes on Escape, the focus back on its button", async () => {
    const user = userEvent.setup();
    mount();
    await user.click(button());
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("tree")).toBeNull();
    expect(button()).toHaveFocus();
  });

  it("has no axe violations, open on the node on screen", async () => {
    const user = userEvent.setup();
    mount({ activeId: "deep" });
    await user.click(button());
    await expectNoAxeViolations();
  });
});
