import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import List from "@mui/material/List";

import FolderRow from "./FolderRow";

describe("FolderRow", () => {
  it("opens from the name, and keeps its actions out of the open button", () => {
    const onOpen = vi.fn();
    const onDelete = vi.fn();
    render(
      <List>
        <FolderRow name="Openings" count="12 games" onOpen={onOpen} actions={<button onClick={onDelete}>Delete</button>} testId="probe" />
      </List>,
    );
    expect(screen.getByTestId("probe-open")).toHaveTextContent("Openings12 games");
    expect(screen.getByTestId("probe-open")).not.toContainElement(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onOpen).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("probe-open"));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("takes its open button's own test id (CTA-113)", () => {
    render(
      <List>
        <FolderRow name="Openings" onOpen={() => {}} openTestId="old-open" testId="probe" />
      </List>,
    );
    expect(screen.getByTestId("old-open")).toHaveTextContent("Openings");
    expect(screen.queryByTestId("probe-open")).toBeNull();
  });

  it("is a real link when given one", () => {
    render(
      <List>
        <FolderRow name="Openings" link={{ href: "/f/1" }} testId="probe" />
      </List>,
    );
    expect(screen.getByTestId("probe-open")).toHaveAttribute("href", "/f/1");
    expect(screen.queryByTestId("probe-actions")).toBeNull();
  });
});
