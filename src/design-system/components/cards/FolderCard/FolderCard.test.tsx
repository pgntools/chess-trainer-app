import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import RecordCard from "../RecordCard/RecordCard";
import FolderCard from "./FolderCard";

describe("FolderCard", () => {
  it("opens from its square, with the name and count under it", () => {
    const onOpen = vi.fn();
    render(<FolderCard name="Openings" count="12 games" onOpen={onOpen} openLabel="Open Openings" testId="probe" />);
    fireEvent.click(screen.getByRole("button", { name: "Open Openings" }));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("probe")).toHaveTextContent("Openings12 games");
  });

  it("is built as a record card is — a square, then the same two-line caption row", () => {
    render(
      <>
        <FolderCard name="Openings" onOpen={() => {}} openLabel="Open" testId="folder" />
        <RecordCard preview={null} name="Najdorf" caption="24 moves" onOpen={() => {}} openLabel="Open" testId="record" />
      </>,
    );
    const shape = (id: string) =>
      [...screen.getByTestId(id).children].map((child) => `${child.tagName}:${child.children.length}`);
    expect(shape("folder")).toEqual(shape("record"));
    // The caption line is there even with no count, so the two stand the same height.
    expect(screen.getByTestId("folder-name").nextElementSibling).not.toBeNull();
  });
});
