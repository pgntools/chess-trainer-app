import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";

import { buildTheme } from "../../../theme";
import { defaultTheme } from "../../../themes";
import ContextMenu from "./ContextMenu";

describe("ContextMenu", () => {
  it("opens at the pointer with its heading and entries, and runs a choice after closing", () => {
    const onClose = vi.fn();
    const promote = vi.fn();
    render(
      <ContextMenu
        position={{ top: 10, left: 20 }}
        onClose={onClose}
        subheader="12…Nf6"
        entries={[
          { id: "promote", label: "Promote", onClick: promote },
          { id: "delete", label: "Delete", onClick: () => {}, divider: true, destructive: true },
        ]}
        testId="probe"
      />,
    );
    const menu = screen.getByRole("menu");
    expect(screen.getByTestId("probe-subheader")).toHaveTextContent("12…Nf6");
    expect(within(menu).getAllByRole("menuitem").map((item) => item.textContent)).toEqual(["Promote", "Delete"]);
    expect(within(menu).getByRole("separator")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("probe-promote"));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(promote).toHaveBeenCalledTimes(1);
  });

  it("is closed without a position", () => {
    render(<ContextMenu position={null} onClose={() => {}} entries={[{ id: "a", label: "A", onClick: () => {} }]} testId="probe" />);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("carries the theme's direction to its portalled list", () => {
    render(
      <ThemeProvider theme={buildTheme(defaultTheme, "light", "rtl")}>
        <ContextMenu position={{ top: 0, left: 0 }} onClose={() => {}} entries={[{ id: "a", label: "א", onClick: () => {} }]} testId="probe" />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("probe")).toHaveAttribute("dir", "rtl");
  });
});
