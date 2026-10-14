import { useState } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import CaseDetails, { type CaseDetailsProps, type CaseDetailsTab } from "./CaseDetails";
import { GAME, GAME_ROW } from "./fixtures";

/** The block with its open tab held, as the screen holds it. */
function Held(props: Omit<CaseDetailsProps, "tab" | "onTabChange">) {
  const [tab, setTab] = useState<CaseDetailsTab>("settings");
  return <CaseDetails {...props} tab={tab} onTabChange={setTab} />;
}

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("CaseDetails (CTA-186)", () => {
  it("names the Case, opens on Settings — its tags on Info — leads back to the list, and steps to its neighbours", async () => {
    const { container } = render(
      <Held row={GAME_ROW} game={GAME} settings={<p data-testid="settings-probe">settings</p>} graph={<p data-testid="graph-probe">graph</p>} display={<p data-testid="display-probe">display</p>} backLink={{ href: "/cases" }} previous={undefined} next={{ href: "/case/next" }} testId="probe" />,
    );
    expect(screen.getByRole("navigation", { name: "Details of Carlsen – Caruana" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Carlsen – Caruana" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to the cases" })).toHaveAttribute("href", "/cases");
    expect(screen.getByRole("button", { name: "Previous case" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "Next case" })).toHaveAttribute("href", "/case/next");
    // Settings first and open: the board's settings, then its own tabs — Info open; no links given, no Linked cases (CTA-199).
    expect(screen.getByRole("tab", { name: "Settings" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: "Settings" })).toContainElement(screen.getByTestId("settings-probe"));
    const sections = screen.getByRole("tablist", { name: "Case settings" });
    expect(within(sections).getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Info"]);
    expect(screen.getByRole("tab", { name: "Info" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("probe-info-Event")).toHaveTextContent("Norway Chess");
    await expectNoAxeViolations(container);
    await expectNoAxeViolations(container);

    await userEvent.click(screen.getByRole("tab", { name: "Graph" }));
    expect(screen.getByTestId("graph-probe")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: "Display" }));
    expect(screen.getByTestId("display-probe")).toBeInTheDocument();
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Settings", "Graph", "Display"]);
    expect(screen.queryByTestId("probe-info-Event")).toBeNull();
  });

  it("shows the screen's links on Settings' own Linked cases tab, beside Info (CTA-188, CTA-199)", async () => {
    render(<Held row={GAME_ROW} game={GAME} links={<p data-testid="links-probe">links</p>} backLink={{ href: "/cases" }} previous={undefined} next={undefined} testId="probe" />);
    const sections = screen.getByRole("tablist", { name: "Case settings" });
    expect(within(sections).getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Info", "Linked cases"]);
    expect(screen.queryByTestId("links-probe")).toBeNull();
    await userEvent.click(screen.getByRole("tab", { name: "Linked cases" }));
    expect(screen.getByRole("tabpanel", { name: "Linked cases" })).toContainElement(screen.getByTestId("links-probe"));
    expect(screen.queryByTestId("probe-info-Event")).toBeNull();
  });

  it("adds a Jobs tab, last, when the screen gives one (CTA-188)", async () => {
    render(
      <Held row={GAME_ROW} game={GAME} display={<p>display</p>} jobs={<p data-testid="jobs-probe">jobs</p>} backLink={{ href: "/cases" }} previous={undefined} next={undefined} testId="probe" />,
    );
    expect(within(screen.getByRole("tablist", { name: "Case details" })).getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "Settings",
      "Graph",
      "Display",
      "Jobs",
    ]);
    await userEvent.click(screen.getByRole("tab", { name: "Jobs" }));
    expect(screen.getByRole("tabpanel", { name: "Jobs" })).toContainElement(screen.getByTestId("jobs-probe"));
  });

  it("says a Case with no tags, and disables Graph while there are no evaluations", () => {
    render(<Held row={GAME_ROW} game={undefined} backLink={{ href: "/cases" }} previous={undefined} next={undefined} testId="probe" />);
    expect(screen.getByTestId("probe-info-empty")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Graph" })).toBeDisabled();
  });
});
