import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";

import { buildTheme } from "../../../theme";
import { defaultTheme } from "../../../themes";
import InlineAlert from "./InlineAlert";

describe("InlineAlert", () => {
  it("alerts with its severity, title and words", () => {
    render(
      <InlineAlert severity="error" title="Not a PGN" testId="probe">
        The file could not be read.
      </InlineAlert>,
    );
    const alert = screen.getByRole("alert");
    expect(alert).toBe(screen.getByTestId("probe"));
    expect(alert).toHaveTextContent("Not a PGNThe file could not be read.");
    expect(alert.className).toMatch(/colorError/);
  });

  it("keeps its detail left to right under RTL", () => {
    render(
      <ThemeProvider theme={buildTheme(defaultTheme, "light", "rtl")}>
        <div dir="rtl">
          <InlineAlert severity="error" detail="1. e4 ??" testId="probe">
            The file could not be read.
          </InlineAlert>
        </div>
      </ThemeProvider>,
    );
    expect(screen.getByTestId("probe-detail")).toHaveAttribute("dir", "ltr");
    expect(screen.getByTestId("probe-detail")).toHaveTextContent("1. e4 ??");
  });

  it("closes only when it can be", () => {
    const onClose = vi.fn();
    const { rerender } = render(<InlineAlert severity="info" testId="probe">x</InlineAlert>);
    expect(screen.queryByRole("button")).toBeNull();
    rerender(
      <InlineAlert severity="info" onClose={onClose} testId="probe">
        x
      </InlineAlert>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
