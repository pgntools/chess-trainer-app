import { useState, type ReactNode } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import ProjectDetails, { type ProjectDetailsTab } from "./ProjectDetails";
import { HEBREW_NAME, NAME } from "./fixtures";

/** The block with its tab and its switch held, as the screen holds them. */
function Held({ name = NAME, gamesTree }: { name?: string; gamesTree?: ReactNode }) {
  const [tab, setTab] = useState<ProjectDetailsTab>("general");
  const [on, setOn] = useState(false);
  return (
    <ProjectDetails
      name={name}
      tab={tab}
      onTabChange={setTab}
      exampleOption={on}
      onExampleOptionChange={setOn}
      gamesTree={gamesTree}
      testId="probe"
    />
  );
}

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("ProjectDetails (CTA-213)", () => {
  it("is headed by the Project's name and opens on General, a placeholder", async () => {
    const { container } = render(<Held />);
    expect(screen.getByRole("region", { name: `Details of ${NAME}` })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: NAME })).toBeInTheDocument();
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["General", "Games tree", "Options"]);
    expect(screen.getByRole("tab", { name: "General" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: "General" })).toHaveTextContent(i18n.t("analysisV2.projectDetails.placeholder"));
    expect(screen.queryByRole("switch")).toBeNull();
    await expectNoAxeViolations(container);
  });

  it("holds an example switch on Options, reached and toggled by the keyboard", async () => {
    const user = userEvent.setup();
    const { container } = render(<Held />);
    await user.tab();
    expect(screen.getByRole("tab", { name: "General" })).toHaveFocus();
    await user.keyboard("{ArrowRight}{ArrowRight}");
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

  it("places the screen's board on Games tree (CTA-214)", async () => {
    const user = userEvent.setup();
    const { container } = render(<Held gamesTree={<p>the board</p>} />);
    await user.click(screen.getByRole("tab", { name: "Games tree" }));
    const panel = screen.getByRole("tabpanel", { name: "Games tree" });
    expect(panel).toHaveTextContent("the board");
    expect(screen.queryByTestId("probe-games-tree-empty")).toBeNull();
    await expectNoAxeViolations(container);
  });

  it("says there are no games on Games tree without a board (CTA-214)", async () => {
    const user = userEvent.setup();
    render(<Held />);
    await user.click(screen.getByRole("tab", { name: "Games tree" }));
    expect(screen.getByRole("tabpanel", { name: "Games tree" })).toHaveTextContent(
      i18n.t("analysisV2.projectDetails.noGames"),
    );
  });

  it("speaks Hebrew under Hebrew", async () => {
    await i18n.changeLanguage("he");
    render(<Held name={HEBREW_NAME} />);
    expect(screen.getByRole("heading", { level: 2, name: HEBREW_NAME })).toHaveAttribute("dir", "auto");
    expect(screen.getByRole("tab", { name: i18n.t("analysisV2.projectDetails.tabs.options") })).toBeInTheDocument();
  });
});
