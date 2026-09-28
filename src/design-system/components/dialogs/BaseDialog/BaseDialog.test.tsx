import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";

import { buildTheme } from "../../../theme";
import { defaultTheme } from "../../../themes";
import BaseDialog from "./BaseDialog";

describe("BaseDialog", () => {
  it("renders the title, body and actions under test ids derived from its own", () => {
    render(
      <BaseDialog open onClose={() => {}} testId="probe" title="Title" actions={<button>Go</button>}>
        Body
      </BaseDialog>,
    );
    expect(screen.getByTestId("probe")).toBeInTheDocument();
    expect(screen.getByTestId("probe-title")).toHaveTextContent("Title");
    expect(screen.getByTestId("probe-content")).toHaveTextContent("Body");
    expect(screen.getByTestId("probe-actions")).toHaveTextContent("Go");
    expect(screen.getByRole("dialog", { name: "Title" })).toBeInTheDocument();
  });

  it("leaves out the content and actions rows it is not given", () => {
    render(<BaseDialog open onClose={() => {}} testId="probe" title="Title" />);
    expect(screen.queryByTestId("probe-content")).toBeNull();
    expect(screen.queryByTestId("probe-actions")).toBeNull();
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    render(<BaseDialog open onClose={onClose} testId="probe" title="Title" />);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders nothing while closed", () => {
    render(<BaseDialog open={false} onClose={() => {}} testId="probe" title="Title" />);
    expect(screen.queryByTestId("probe")).toBeNull();
  });

  it("carries the theme's direction, so a portalled dialog mirrors under RTL", () => {
    render(
      <ThemeProvider theme={buildTheme(defaultTheme, "light", "rtl")}>
        <BaseDialog open onClose={() => {}} testId="probe" title="Title" />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("probe")).toHaveAttribute("dir", "rtl");
  });
});
