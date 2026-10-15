import { useState } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import CaseDetails, { type CaseDetailsProps, type CaseDetailsTab } from "./CaseDetails";
import { GAME, GAME_ROW } from "./fixtures";

/** The block with its open tab held, as the screen holds it. */
function Held(props: Omit<CaseDetailsProps, "tab" | "onTabChange">) {
  const [tab, setTab] = useState<CaseDetailsTab>("info");
  return <CaseDetails {...props} tab={tab} onTabChange={setTab} />;
}

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("CaseDetails (CTA-186)", () => {
  it("names the Case, opens on Info — its tags — leads back to the list, and steps to its neighbours", async () => {
    const { container } = render(
      <Held row={GAME_ROW} game={GAME} settings={<p data-testid="settings-probe">settings</p>} graph={<p data-testid="graph-probe">graph</p>} display={<p data-testid="display-probe">display</p>} backLink={{ href: "/cases" }} previous={undefined} next={{ href: "/case/next" }} testId="probe" />,
    );
    expect(screen.getByRole("navigation", { name: "Details of Carlsen – Caruana" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Carlsen – Caruana" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to the cases" })).toHaveAttribute("href", "/cases");
    expect(screen.getByRole("button", { name: "Previous case" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "Next case" })).toHaveAttribute("href", "/case/next");
    // Info first and open (CTA-211): the tags; no links given, no Linked cases button.
    expect(screen.getByRole("tab", { name: "Info" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: "Info" })).toContainElement(screen.getByTestId("probe-info-Event"));
    expect(screen.getByTestId("probe-info-Event")).toHaveTextContent("Norway Chess");
    expect(screen.queryByRole("button", { name: /Linked cases/ })).toBeNull();
    await expectNoAxeViolations(container);

    // Settings is the board's settings alone — no inner tabs (CTA-211).
    await userEvent.click(screen.getByRole("tab", { name: "Settings" }));
    expect(screen.getByRole("tabpanel", { name: "Settings" })).toContainElement(screen.getByTestId("settings-probe"));
    expect(screen.getAllByRole("tablist")).toHaveLength(1);
    expect(screen.queryByTestId("probe-info-Event")).toBeNull();
    await userEvent.click(screen.getByRole("tab", { name: "Graph" }));
    expect(screen.getByTestId("graph-probe")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: "Display" }));
    expect(screen.getByTestId("display-probe")).toBeInTheDocument();
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Info", "Settings", "Graph", "Display"]);
  });

  it("opens the screen's links in a dialog from the Info tab's Linked cases (n) (CTA-188, CTA-211)", async () => {
    render(
      <Held row={GAME_ROW} game={GAME} links={<p data-testid="links-probe">links</p>} linkCount={3} backLink={{ href: "/cases" }} previous={undefined} next={undefined} testId="probe" />,
    );
    expect(screen.queryByTestId("links-probe")).toBeNull();
    const open = screen.getByRole("button", { name: "Linked cases (3)" });
    expect(open).toHaveAttribute("aria-haspopup", "dialog");
    await userEvent.click(open);
    const dialog = screen.getByRole("dialog", { name: "Linked cases" });
    expect(dialog).toContainElement(screen.getByTestId("links-probe"));
    await expectNoAxeViolations(dialog);
    await userEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByRole("button", { name: "Linked cases (3)" })).toHaveFocus();
  });

  it("adds a Jobs tab, last, when the screen gives one (CTA-188)", async () => {
    render(
      <Held row={GAME_ROW} game={GAME} display={<p>display</p>} jobs={<p data-testid="jobs-probe">jobs</p>} backLink={{ href: "/cases" }} previous={undefined} next={undefined} testId="probe" />,
    );
    expect(within(screen.getByRole("tablist", { name: "Case details" })).getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "Info",
      "Settings",
      "Graph",
      "Display",
      "Jobs",
    ]);
    await userEvent.click(screen.getByRole("tab", { name: "Jobs" }));
    expect(screen.getByRole("tabpanel", { name: "Jobs" })).toContainElement(screen.getByTestId("jobs-probe"));
  });

  it("says a Case with no tags, and disables Graph while there are no evaluations — asked for, Info shows", () => {
    render(
      <CaseDetails row={GAME_ROW} game={undefined} tab="graph" onTabChange={() => {}} backLink={{ href: "/cases" }} previous={undefined} next={undefined} testId="probe" />,
    );
    expect(screen.getByTestId("probe-info-empty")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Graph" })).toBeDisabled();
    expect(screen.getByRole("tab", { name: "Info" })).toHaveAttribute("aria-selected", "true");
  });
});
