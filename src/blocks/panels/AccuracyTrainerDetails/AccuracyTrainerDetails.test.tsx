import { useState } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import AccuracyTrainerDetails from "./AccuracyTrainerDetails";
import { GAME_TITLE, HEBREW_TITLE } from "./fixtures";

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

/** The panel with its switch live, as a screen holds it. */
function Live({ title = GAME_TITLE, initial = true }: { title?: string; initial?: boolean }) {
  const [showArrows, setShowArrows] = useState(initial);
  return (
    <AccuracyTrainerDetails
      title={title}
      tab="settings"
      onTabChange={() => {}}
      showArrows={showArrows}
      onShowArrowsChange={setShowArrows}
      testId="details"
    />
  );
}

describe("AccuracyTrainerDetails (CTA-238)", () => {
  it("is a section named for the game, its heading the game, then a Settings tab", () => {
    render(<Live />);
    expect(screen.getByRole("region", { name: "Alice – Bob — the exercise's own view" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: GAME_TITLE })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Settings" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: "Settings" })).toBeInTheDocument();
  });

  it("switches the next-move arrows on Settings", async () => {
    const user = userEvent.setup();
    render(<Live />);
    const arrows = screen.getByRole("switch", { name: "Show next-move arrows" });
    expect(arrows).toBeChecked();
    await user.click(arrows);
    expect(arrows).not.toBeChecked();
  });

  it("reads a name in another script in its own direction", () => {
    render(<Live title={HEBREW_TITLE} />);
    expect(screen.getByTestId("details-title")).toHaveAttribute("dir", "auto");
  });

  it("passes axe", async () => {
    render(<Live initial={false} />);
    await expectNoAxeViolations();
  });
});
