import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Link as RouterLink } from "react-router";

import { expectNoAxeViolations } from "../../../../test/axe";
import HintButton from "./HintButton";

describe("HintButton", () => {
  it("is a button named by its words and described by its hint", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <HintButton hint="Save the game to your analyses" onClick={onClick} testId="probe">
        Analyse
      </HintButton>,
    );
    const button = screen.getByRole("button", { name: "Analyse" });
    expect(button).toBe(screen.getByTestId("probe"));
    // The hint describes: it shows on keyboard focus and is read after the name.
    await user.tab();
    expect(button).toHaveFocus();
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Save the game to your analyses");
    expect(button).toHaveAccessibleDescription("Save the game to your analyses");
    expect(button).toHaveAccessibleName("Analyse");
    await user.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("sits in a span, so a disabled one still has something to hover", () => {
    render(
      <HintButton hint="Nothing is picked" disabled testId="probe">
        Analyse
      </HintButton>,
    );
    expect(screen.getByTestId("probe")).toBeDisabled();
    expect(screen.getByTestId("probe").parentElement?.tagName).toBe("SPAN");
  });

  it("is a real link when given one", () => {
    render(
      <MemoryRouter>
        <HintButton hint="Add games to this collection" link={{ component: RouterLink, to: "/library/new?into=c1" }} testId="probe">
          Add games
        </HintButton>
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "Add games" })).toHaveAttribute("href", "/library/new?into=c1");
  });

  it("says it is busy, with a spinner the reader never hears", async () => {
    render(
      <HintButton hint="Analysing…" busy startIcon={<svg data-testid="icon" />} testId="probe">
        Analyse
      </HintButton>,
    );
    expect(screen.getByTestId("probe")).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByTestId("icon")).toBeNull();
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.getByRole("button", { name: "Analyse" })).toBeInTheDocument();
    await expectNoAxeViolations();
  });

  it("carries the variant, the colour and the icon", () => {
    render(
      <HintButton hint="Make them part of the record" variant="contained" color="success" startIcon={<svg data-testid="icon" />} testId="probe">
        Update
      </HintButton>,
    );
    expect(screen.getByTestId("probe").className).toMatch(/contained/);
    expect(screen.getByTestId("probe").className).toMatch(/Success/);
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });
});
