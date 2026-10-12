import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import CaseDetails from "./CaseDetails";
import { GAME, GAME_ROW } from "./fixtures";

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("CaseDetails (CTA-186)", () => {
  it("names the Case, shows its tags on Info, leads back to the list, and steps to its neighbours", async () => {
    const { container } = render(
      <CaseDetails row={GAME_ROW} game={GAME} backLink={{ href: "/cases" }} previous={undefined} next={{ href: "/case/next" }} testId="probe" />,
    );
    expect(screen.getByRole("navigation", { name: "Details of Carlsen – Caruana" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Carlsen – Caruana" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to the cases" })).toHaveAttribute("href", "/cases");
    expect(screen.getByRole("button", { name: "Previous case" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "Next case" })).toHaveAttribute("href", "/case/next");
    expect(screen.getByRole("tab", { name: "Info" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("probe-info-Event")).toHaveTextContent("Norway Chess");
    await expectNoAxeViolations(container);

    await userEvent.click(screen.getByRole("tab", { name: "TBD" }));
    expect(screen.getByTestId("probe-tbd")).toBeInTheDocument();
    expect(screen.queryByTestId("probe-info-Event")).toBeNull();
  });

  it("says a Case with no tags", () => {
    render(<CaseDetails row={GAME_ROW} game={undefined} backLink={{ href: "/cases" }} previous={undefined} next={undefined} testId="probe" />);
    expect(screen.getByTestId("probe-info-empty")).toBeInTheDocument();
  });
});
