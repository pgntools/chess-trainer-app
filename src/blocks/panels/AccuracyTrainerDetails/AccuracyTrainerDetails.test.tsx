import { useState } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import AccuracyTrainerDetails from "./AccuracyTrainerDetails";
import { CASE_LINK, GAME_TITLE, HEBREW_TITLE } from "./fixtures";

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

/** The panel with its switch live, as a screen holds it. */
function Live({ title = GAME_TITLE, initial = true, withCase = false }: { title?: string; initial?: boolean; withCase?: boolean }) {
  const [showArrows, setShowArrows] = useState(initial);
  const [engine, setEngine] = useState(false);
  const [moves, setMoves] = useState(3);
  return (
    <AccuracyTrainerDetails
      title={title}
      tab="settings"
      onTabChange={() => {}}
      showArrows={showArrows}
      onShowArrowsChange={setShowArrows}
      movesToFind={moves}
      onMovesToFindChange={setMoves}
      engine={engine}
      onEngineChange={setEngine}
      {...(withCase ? { caseLink: CASE_LINK } : {})}
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

  it("sets the moves to find, and switches the engine", async () => {
    const user = userEvent.setup();
    render(<Live />);
    const moves = screen.getByRole("slider", { name: "Moves to find" });
    expect(moves).toHaveValue("3");
    moves.focus();
    await user.keyboard("{ArrowRight}");
    expect(moves).toHaveValue("4");
    const engine = screen.getByRole("switch", { name: "Use the engine" });
    expect(engine).not.toBeChecked();
    await user.click(engine);
    expect(engine).toBeChecked();
  });

  it("links the session's case once there is one", () => {
    const { unmount } = render(<Live />);
    expect(screen.queryByRole("link", { name: "Open the session's case" })).not.toBeInTheDocument();
    unmount();
    render(<Live withCase />);
    expect(screen.getByRole("link", { name: "Open the session's case" })).toHaveAttribute("href", CASE_LINK.href);
  });

  it("reads a name in another script in its own direction", () => {
    render(<Live title={HEBREW_TITLE} />);
    expect(screen.getByTestId("details-title")).toHaveAttribute("dir", "auto");
  });

  it("passes axe", async () => {
    render(<Live initial={false} withCase />);
    await expectNoAxeViolations();
  });
});
