import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { computerAnalysisOptionsFrom, type ComputerAnalysisOptions } from "../../../lib/computerAnalysis";
import { expectNoAxeViolations } from "../../../test/axe";
import NewJobDialog, { type NewJobDialogProps } from "./NewJobDialog";
import { BEFORE_HANDSHAKE, GAME, NONE_TICKED, OPTIONS, SINGLE_THREAD } from "./fixtures";

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

type HarnessProps = Partial<Omit<NewJobDialogProps, "options" | "onChange" | "testId">> & { initial?: ComputerAnalysisOptions };

/** The dialog over its own options, as a screen holds them — every change kept in bounds. */
function Harness({ initial = OPTIONS, open = true, ...rest }: HarnessProps) {
  const [options, setOptions] = useState(initial);
  return (
    <NewJobDialog
      open={open}
      onClose={() => {}}
      gameName={GAME}
      options={options}
      onChange={(patch) => setOptions((before) => computerAnalysisOptionsFrom({ ...before, ...patch }))}
      engineOptions={SINGLE_THREAD}
      engineName="Stockfish 19 Lite"
      lastMove={42}
      onStart={() => {}}
      testId="probe"
      {...rest}
    />
  );
}

const start = () => screen.getByRole("button", { name: "Start computer analysis" });

describe("NewJobDialog", () => {
  it("is a dialog named New job, the game named in it, the form's options in it and Start in its actions", async () => {
    render(<Harness />);
    const dialog = screen.getByRole("dialog", { name: "New job" });
    expect(within(dialog).getByTestId("probe-game")).toHaveTextContent(`Game: ${GAME}`);
    expect(within(dialog).getByRole("slider", { name: "Depth" })).toHaveValue("18");
    expect(within(dialog).getByRole("checkbox", { name: /Light/ })).toBeChecked();
    // One Start — the dialog's, not the form's own.
    expect(within(dialog).getAllByRole("button", { name: "Start computer analysis" })).toHaveLength(1);
    expect(within(screen.getByTestId("probe-actions")).getByRole("button", { name: "Start computer analysis" })).toBeEnabled();
    await expectNoAxeViolations(dialog);
  });

  it("starts the job from Start, and closes from Cancel", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    const onClose = vi.fn();
    render(<Harness onStart={onStart} onClose={onClose} />);
    await user.click(start());
    expect(onStart).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps Start off, saying why, with no variant ticked, no moves or no move in range", () => {
    const { rerender } = render(<Harness initial={NONE_TICKED} />);
    expect(start()).toBeDisabled();
    expect(start()).toHaveAccessibleDescription("Tick at least one variant to start.");
    rerender(<Harness blocked="noMoves" />);
    expect(start()).toHaveAccessibleDescription("The board has no moves to analyse.");
    rerender(<Harness blocked="noRange" />);
    expect(start()).toBeDisabled();
    expect(start()).toHaveAccessibleDescription("No move of the game is in the chosen range.");
  });

  it("ticking a variant again turns Start on", async () => {
    const user = userEvent.setup();
    render(<Harness initial={NONE_TICKED} />);
    await user.click(screen.getByRole("checkbox", { name: /Medium/ }));
    expect(start()).toBeEnabled();
  });

  it("while queueing: Start busy and off, Cancel off, and Escape does not close it", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Harness busy onClose={onClose} />);
    expect(start()).toBeDisabled();
    expect(start()).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    await user.keyboard("{Escape}");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("says a refusal inside the dialog", async () => {
    render(<Harness problem="too-many" />);
    expect(screen.getByTestId("probe-problem")).toHaveTextContent("Too many jobs are waiting.");
    await expectNoAxeViolations(screen.getByRole("dialog"));
  });

  it("before an engine has started, a single-thread build's Threads already reads pinned at 1", () => {
    render(<Harness engineOptions={BEFORE_HANDSHAKE} multiThread={false} />);
    expect(screen.getByRole("slider", { name: "Threads" })).toBeDisabled();
  });

  describe("a game with a job already", () => {
    it("asks first — the job's status said — and Check existing is the screen's", async () => {
      const user = userEvent.setup();
      const onCheck = vi.fn();
      render(<Harness existing={{ status: "running", onCheck }} />);
      const dialog = screen.getByRole("dialog", { name: "New job" });
      expect(within(dialog).getByTestId("probe-existing")).toHaveTextContent(
        `${GAME} already has a computer analysis — the job: Running.`,
      );
      expect(within(dialog).queryByRole("slider", { name: "Depth" })).toBeNull();
      await expectNoAxeViolations(dialog);
      await user.click(within(dialog).getByRole("button", { name: "Check existing" }));
      expect(onCheck).toHaveBeenCalledTimes(1);
    });

    it("Start a new analysis turns it to the form, the focus on the game's line", async () => {
      const user = userEvent.setup();
      render(<Harness existing={{ status: "done", onCheck: () => {} }} />);
      await user.click(screen.getByRole("button", { name: "Start a new analysis" }));
      expect(screen.getByRole("slider", { name: "Depth" })).toBeInTheDocument();
      expect(screen.getByTestId("probe-game")).toHaveFocus();
      expect(start()).toBeEnabled();
    });

    it("asks again every time it opens", async () => {
      const user = userEvent.setup();
      const existing = { status: "done" as const, onCheck: () => {} };
      const { rerender } = render(<Harness existing={existing} />);
      await user.click(screen.getByRole("button", { name: "Start a new analysis" }));
      rerender(<Harness existing={existing} open={false} />);
      rerender(<Harness existing={existing} />);
      expect(screen.getByRole("button", { name: "Check existing" })).toBeInTheDocument();
    });
  });

  it("reads in Hebrew", async () => {
    await i18n.changeLanguage("he");
    render(<Harness existing={{ status: "queued", onCheck: () => {} }} />);
    expect(screen.getByRole("dialog", { name: "משימה חדשה" })).toBeInTheDocument();
    expect(screen.getByTestId("probe-existing")).toHaveTextContent("בתור");
  });
});
