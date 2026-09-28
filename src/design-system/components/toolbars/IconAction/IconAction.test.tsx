import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Link as RouterLink } from "react-router";

import IconAction from "./IconAction";

describe("IconAction", () => {
  it("is a button named by its tooltip's words", () => {
    const onClick = vi.fn();
    render(
      <IconAction label="Download" onClick={onClick} testId="probe">
        <svg />
      </IconAction>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Download" }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("probe")).not.toHaveAttribute("aria-pressed");
  });

  it("sits in a span, so a disabled one still has something to hover", () => {
    render(
      <IconAction label="Download" disabled testId="probe">
        <svg />
      </IconAction>,
    );
    expect(screen.getByTestId("probe")).toBeDisabled();
    expect(screen.getByTestId("probe").parentElement?.tagName).toBe("SPAN");
  });

  it("is a toggle when pressed is given: aria-pressed, and primary while pressed", () => {
    const { rerender } = render(
      <IconAction label="Show moves" pressed={false} testId="probe">
        <svg />
      </IconAction>,
    );
    expect(screen.getByTestId("probe")).toHaveAttribute("aria-pressed", "false");
    rerender(
      <IconAction label="Show moves" pressed testId="probe">
        <svg />
      </IconAction>,
    );
    expect(screen.getByTestId("probe")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("probe").className).toMatch(/colorPrimary/);
  });

  it("is a real link when given one", () => {
    render(
      <MemoryRouter>
        <IconAction label="Analysis" link={{ component: RouterLink, to: "/tools/analysis?game=x" }} testId="probe">
          <svg />
        </IconAction>
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "Analysis" })).toHaveAttribute("href", "/tools/analysis?game=x");
  });

  it("says it opens a menu, and whether it is open (CTA-113)", () => {
    const { rerender } = render(
      <IconAction label="Games" popupOpen={false} testId="probe">
        <svg />
      </IconAction>,
    );
    expect(screen.getByTestId("probe")).toHaveAttribute("aria-haspopup", "menu");
    expect(screen.getByTestId("probe")).toHaveAttribute("aria-expanded", "false");
    rerender(
      <IconAction label="Games" popupOpen testId="probe">
        <svg />
      </IconAction>,
    );
    expect(screen.getByTestId("probe")).toHaveAttribute("aria-expanded", "true");
  });
});
