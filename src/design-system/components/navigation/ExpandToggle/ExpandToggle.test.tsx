import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";

import { buildTheme } from "../../../theme";
import { defaultTheme } from "../../../themes";
import ExpandToggle from "./ExpandToggle";

describe("ExpandToggle", () => {
  it("toggles, says whether it is open, and keeps the click from the row", () => {
    const onToggle = vi.fn();
    const onRow = vi.fn();
    render(
      // A stand-in for a clickable row; the row's own keyboard access is not under test.
      <div role="presentation" onClick={onRow}>
        <ExpandToggle expanded={false} onToggle={onToggle} label="Open Openings" testId="probe" />
      </div>,
    );
    const toggle = screen.getByRole("button", { name: "Open Openings" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onRow).not.toHaveBeenCalled();
  });

  it("points along the text when closed and down when open", () => {
    const { rerender } = render(<ExpandToggle expanded={false} onToggle={() => {}} label="x" testId="probe" />);
    expect(screen.getByTestId("probe-icon").style.transform).toBe("none");
    rerender(<ExpandToggle expanded onToggle={() => {}} label="x" testId="probe" />);
    expect(screen.getByTestId("probe-icon").style.transform).toBe("rotate(90deg)");
    expect(screen.getByTestId("probe")).toHaveAttribute("aria-expanded", "true");
  });

  it("points left when closed under RTL, and still down when open", () => {
    const rtl = buildTheme(defaultTheme, "light", "rtl");
    const { rerender } = render(
      <ThemeProvider theme={rtl}>
        <ExpandToggle expanded={false} onToggle={() => {}} label="x" testId="probe" />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("probe-icon").style.transform).toBe("scaleX(-1)");
    rerender(
      <ThemeProvider theme={rtl}>
        <ExpandToggle expanded onToggle={() => {}} label="x" testId="probe" />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("probe-icon").style.transform).toBe("rotate(90deg)");
  });
});
