import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

import FolderTree, { type FolderTreeProps } from "./FolderTree";
import { BROKEN, COUNTS, FOLDER_LABELS, FOLDERS } from "./fixtures";
import { FOLDER_TREE_ROOT, folderTreeNodes } from "./folderTreeNodes";

const mount = (props: Partial<FolderTreeProps> = {}) => {
  const onSelect = vi.fn();
  const onToggle = vi.fn();
  render(
    <FolderTree
      folders={FOLDERS}
      counts={COUNTS}
      selectedId={null}
      onSelect={onSelect}
      open={new Set()}
      onToggle={onToggle}
      labels={FOLDER_LABELS}
      testId="ft"
      {...props}
    />,
  );
  return { onSelect, onToggle };
};

const topLevel = () =>
  within(screen.getByRole("list", { name: "Folders" }))
    .getAllByRole("listitem")
    .filter((item) => item.parentElement === screen.getByTestId("ft"))
    .map((item) => item.querySelector("[data-testid^='ft-']")?.textContent);

describe("FolderTree — the Trees family's folder tree", () => {
  it("lists the top-level row, then the top-level folders by name, each with its count", () => {
    mount();
    expect(topLevel()).toEqual(["All analyses57", "An empty folder0", "Endgames8", "Openings3"]);
  });

  it("opens the folders it is told are open, sub-folders by name", () => {
    mount({ open: new Set(["gopenings", "gsicilian"]) });
    const openings = within(screen.getByTestId("ft-gopenings-group"));
    expect(openings.getByTestId("ft-gfrench")).toBeInTheDocument();
    expect(within(screen.getByTestId("ft-gsicilian-group")).getAllByTestId(/^ft-g(dragon|najdorf)$/).map((row) => row.textContent)).toEqual([
      "Dragon8",
      "Najdorf20",
    ]);
  });

  it("selects a folder from its row and opens it from its chevron", () => {
    const { onSelect, onToggle } = mount();
    fireEvent.click(screen.getByTestId("ft-gopenings"));
    expect(onSelect).toHaveBeenCalledWith("gopenings");
    fireEvent.click(screen.getByRole("button", { name: "Open Openings" }));
    expect(onToggle).toHaveBeenCalledWith("gopenings");
  });

  it("gives a folder without sub-folders no chevron", () => {
    mount();
    expect(screen.queryByTestId("ft-gendgames-toggle")).toBeNull();
  });

  it("answers null for the top-level row, and marks the selection", () => {
    const { onSelect } = mount({ selectedId: "gendgames" });
    expect(screen.getByTestId("ft-gendgames")).toHaveAttribute("aria-current", "page");
    fireEvent.click(screen.getByTestId(`ft-${FOLDER_TREE_ROOT}`));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it("leaves the top-level row out without its label", () => {
    mount({ labels: { ...FOLDER_LABELS, root: undefined } });
    expect(screen.queryByTestId(`ft-${FOLDER_TREE_ROOT}`)).toBeNull();
  });

  it("names folders in the reader's own direction", () => {
    mount();
    expect(within(screen.getByTestId("ft-gopenings")).getByText("Openings")).toHaveAttribute("dir", "auto");
  });
});

describe("folderTreeNodes", () => {
  it("shows every folder of a half-broken store once — a missing parent at the top, a cycle cut", () => {
    const nodes = folderTreeNodes(BROKEN);
    const ids: string[] = [];
    const walk = (level: readonly (typeof nodes)[number][]) => {
      for (const node of level) {
        ids.push(node.id);
        walk(node.children ?? []);
      }
    };
    walk(nodes);
    expect(ids).toContain("gorphan");
    expect(new Set(ids).size).toBe(ids.length);
  });
});
