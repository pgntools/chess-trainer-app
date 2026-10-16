import { useState } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import ProjectDetails, { type ProjectDetailsTab } from "./ProjectDetails";
import { CLOSE_LINK, HEBREW_NAME, NAME } from "./fixtures";

/** The block with its tab and its switch held, as the screen holds them. */
function Held({ name = NAME }: { name?: string }) {
  const [tab, setTab] = useState<ProjectDetailsTab>("general");
  const [on, setOn] = useState(false);
  return <ProjectDetails name={name} closeLink={CLOSE_LINK} tab={tab} onTabChange={setTab} exampleOption={on} onExampleOptionChange={setOn} testId="probe" />;
}

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("ProjectDetails (CTA-213)", () => {
  it("is headed by the Project's name and opens on General, a placeholder", async () => {
    const { container } = render(<Held />);
    expect(screen.getByRole("region", { name: `Details of ${NAME}` })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: NAME })).toBeInTheDocument();
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["General", "Options"]);
    expect(screen.getByRole("tab", { name: "General" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: "General" })).toHaveTextContent(i18n.t("analysisV2.projectDetails.placeholder"));
    expect(screen.queryByRole("switch")).toBeNull();
    await expectNoAxeViolations(container);
  });

  it("leads back to the Projects list by a Close at its head, before the name (CTA-224)", () => {
    render(<Held />);
    const close = screen.getByRole("link", { name: `Close ${NAME}` });
    expect(close).toHaveAttribute("href", "/analysis?folder=openings");
    expect(close).toHaveAttribute("data-testid", "probe-close");
    const heading = screen.getByRole("heading", { level: 2, name: NAME });
    expect(close.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("holds an example switch on Options, reached and toggled by the keyboard", async () => {
    const user = userEvent.setup();
    const { container } = render(<Held />);
    await user.tab();
    expect(screen.getByRole("link", { name: `Close ${NAME}` })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("tab", { name: "General" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Options" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("tab", { name: "Options" })).toHaveAttribute("aria-selected", "true");
    const panel = screen.getByRole("tabpanel", { name: "Options" });
    const toggle = screen.getByRole("switch", { name: "Example option" });
    expect(panel).toContainElement(toggle);
    expect(toggle).not.toBeChecked();
    await user.click(toggle);
    expect(toggle).toBeChecked();
    await user.click(toggle);
    expect(toggle).not.toBeChecked();
    await expectNoAxeViolations(container);
  });

  it("speaks Hebrew under Hebrew", async () => {
    await i18n.changeLanguage("he");
    render(<Held name={HEBREW_NAME} />);
    expect(screen.getByRole("heading", { level: 2, name: HEBREW_NAME })).toHaveAttribute("dir", "auto");
    expect(screen.getByRole("tab", { name: i18n.t("analysisV2.projectDetails.tabs.options") })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: i18n.t("analysisV2.projectDetails.close", { name: HEBREW_NAME }) })).toBeInTheDocument();
  });
});
