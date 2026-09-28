import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";

import { buildTheme } from "../../../theme";
import { defaultTheme } from "../../../themes";
import BackButton from "./BackButton";

describe("BackButton", () => {
  it("goes back on a click, named by where it goes", () => {
    const onClick = vi.fn();
    render(<BackButton label="Back to the Library" onClick={onClick} testId="probe" />);
    fireEvent.click(screen.getByRole("button", { name: "Back to the Library" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("points left in a left-to-right language", () => {
    render(<BackButton label="Back" onClick={() => {}} testId="probe" />);
    expect(screen.getByTestId("probe-icon").style.transform).toBe("");
  });

  it("points right under RTL — the way back there", () => {
    render(
      <ThemeProvider theme={buildTheme(defaultTheme, "light", "rtl")}>
        <BackButton label="חזרה" onClick={() => {}} testId="probe" />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("probe-icon").style.transform).toBe("scaleX(-1)");
  });
});
