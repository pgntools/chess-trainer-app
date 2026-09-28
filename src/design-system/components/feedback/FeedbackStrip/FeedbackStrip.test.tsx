import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider, hexToRgb } from "@mui/material/styles";

import { buildTheme } from "../../../theme";
import { defaultTheme } from "../../../themes";
import FeedbackStrip from "./FeedbackStrip";

const theme = buildTheme(defaultTheme, "light", "ltr");

describe("FeedbackStrip", () => {
  it("borders itself in its tone's colour", () => {
    render(
      <ThemeProvider theme={theme}>
        <FeedbackStrip tone="success" testId="probe">
          Saved
        </FeedbackStrip>
        <FeedbackStrip tone="neutral" testId="neutral">
          Next
        </FeedbackStrip>
      </ThemeProvider>,
    );
    expect(screen.getByTestId("probe")).toHaveAttribute("data-tone", "success");
    expect(getComputedStyle(screen.getByTestId("probe")).borderColor).toBe(hexToRgb(theme.palette.success.main));
    expect(getComputedStyle(screen.getByTestId("probe")).borderColor).not.toBe(getComputedStyle(screen.getByTestId("neutral")).borderColor);
  });

  it("is a named region with its actions when asked", () => {
    render(
      <FeedbackStrip tone="info" ariaLabel="Comment" actions={<button>Edit</button>} testId="probe">
        A comment
      </FeedbackStrip>,
    );
    expect(screen.getByRole("region", { name: "Comment" })).toHaveTextContent("A commentEdit");
  });
});
