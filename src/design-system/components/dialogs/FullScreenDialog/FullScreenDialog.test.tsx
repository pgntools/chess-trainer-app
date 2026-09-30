import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import FullScreenDialog from "./FullScreenDialog";

describe("FullScreenDialog", () => {
  it("fills the window with a header over its body, named by its title", () => {
    render(
      <FullScreenDialog open onClose={() => {}} title="Map" closeLabel="Close" testId="probe" actions={<button>Zoom</button>}>
        <p>drawing</p>
      </FullScreenDialog>,
    );
    expect(screen.getByRole("dialog", { name: "Map" })).toBeInTheDocument();
    expect(screen.getByTestId("probe-header")).toHaveTextContent("Zoom");
    expect(screen.getByTestId("probe-body")).toHaveTextContent("drawing");
    expect(document.querySelector(".MuiDialog-paperFullScreen")).not.toBeNull();
  });

  it("closes from its button, named by the caller, and on Escape", () => {
    const onClose = vi.fn();
    render(
      <FullScreenDialog open onClose={onClose} title="Map" closeLabel="Close the map" testId="probe">
        body
      </FullScreenDialog>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Close the map" }));
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
