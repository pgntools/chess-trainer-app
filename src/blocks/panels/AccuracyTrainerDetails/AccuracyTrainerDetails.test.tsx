import { useState } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import AccuracyTrainerDetails, { type AccuracyTrainerDetailsTab } from "./AccuracyTrainerDetails";
import { CASE_LINK, GAME_TITLE, HEBREW_TITLE, MOVES } from "./fixtures";

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

/** The panel with its switch live, as a screen holds it. */
function Live({
  title = GAME_TITLE,
  initial = true,
  withCase = false,
  locked = false,
  startTab = "settings",
}: {
  title?: string;
  initial?: boolean;
  withCase?: boolean;
  locked?: boolean;
  startTab?: AccuracyTrainerDetailsTab;
}) {
  const [tab, setTab] = useState<AccuracyTrainerDetailsTab>(startTab);
  const [list, setList] = useState<readonly string[]>(MOVES);
  const [showArrows, setShowArrows] = useState(initial);
  const [engine, setEngine] = useState(false);
  const [moves, setMoves] = useState(3);
  return (
    <AccuracyTrainerDetails
      title={title}
      tab={tab}
      onTabChange={setTab}
      showArrows={showArrows}
      onShowArrowsChange={setShowArrows}
      movesToFind={moves}
      onMovesToFindChange={setMoves}
      engine={engine}
      onEngineChange={setEngine}
      {...(withCase
        ? {
            caseLink: CASE_LINK,
            moves: {
              list,
              onMove: (index: number, move: "up" | "down") =>
                setList((current) => {
                  const next = [...current];
                  const to = move === "up" ? index - 1 : index + 1;
                  [next[index], next[to]] = [next[to], next[index]];
                  return next;
                }),
              onRemove: (index: number) => setList((current) => current.filter((_, at) => at !== index)),
              locked,
            },
          }
        : {})}
      testId="details"
    />
  );
}

describe("AccuracyTrainerDetails (CTA-238)", () => {
  it("is a section named for the game, its heading the game, then a Settings tab", () => {
    render(<Live />);
    expect(screen.getByRole("region", { name: "Alice – Bob — the exercise's own view" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: GAME_TITLE })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Your moves" })).toBeInTheDocument();
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

  it("lists the reader's moves on Moves, in their order — each moved up or down, or deleted", async () => {
    const user = userEvent.setup();
    render(<Live withCase startTab="moves" />);
    const items = () => within(screen.getByRole("list", { name: "Your moves, best first" })).getAllByRole("listitem").map((item) => item.textContent);
    expect(items()).toEqual(["1.Nf3", "2.d4", "3.c4"]);
    // The first cannot go up, the last cannot go down.
    expect(screen.getByRole("button", { name: "Move Nf3 up" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move c4 down" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Move d4 up" }));
    expect(items()).toEqual(["1.d4", "2.Nf3", "3.c4"]);
    await user.click(screen.getByRole("button", { name: "Move Nf3 down" }));
    expect(items()).toEqual(["1.d4", "2.c4", "3.Nf3"]);
    await user.click(screen.getByRole("button", { name: "Delete c4" }));
    expect(items()).toEqual(["1.d4", "2.Nf3"]);
    await expectNoAxeViolations();
  });

  it("shows a checked position's moves read only, and says when there are none", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Live withCase locked startTab="moves" />);
    expect(screen.getByRole("list", { name: "Your moves, best first" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Move |^Delete / })).not.toBeInTheDocument();
    expect(screen.getByText("Checked — these moves are the position's answer.")).toBeInTheDocument();
    unmount();
    render(<Live startTab="settings" />);
    await user.click(screen.getByRole("tab", { name: "Your moves" }));
    expect(screen.getByTestId("details-moves-empty")).toHaveTextContent("Start a session to find its moves.");
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
