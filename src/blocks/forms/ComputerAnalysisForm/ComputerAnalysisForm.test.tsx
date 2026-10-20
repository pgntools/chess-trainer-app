import { useState, type ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { computerAnalysisOptionsFrom, type ComputerAnalysisOptions } from "../../../lib/computerAnalysis";
import type { EngineOption } from "../../../lib/engineTypes";
import { describeEngines } from "../../../lib/engines";
import { expectNoAxeViolations } from "../../../test/axe";
import ComputerAnalysisForm, { type ComputerAnalysisFormProps } from "./ComputerAnalysisForm";
import {
  BEFORE_HANDSHAKE,
  HOSTED_ENGINE,
  HOSTED_LIMITS,
  HOSTED_OPTIONS,
  MULTI_THREAD,
  NO_HASH,
  NO_TIME_LIMIT,
  NONE_TICKED,
  OPTIONS,
  SINGLE_THREAD,
} from "./fixtures";

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

/** The form over its own state, as a screen holds it — every change kept in bounds. */
function Harness({
  initial = OPTIONS,
  engineOptions = SINGLE_THREAD,
  onOptions,
  ...rest
}: {
  initial?: ComputerAnalysisOptions;
  engineOptions?: ReadonlyMap<string, EngineOption>;
  onOptions?: (options: ComputerAnalysisOptions) => void;
} & Partial<Omit<ComputerAnalysisFormProps, "options" | "onChange" | "engineOptions" | "testId">>) {
  const [options, setOptions] = useState(initial);
  return (
    <ComputerAnalysisForm
      options={options}
      onChange={(patch) => {
        const next = computerAnalysisOptionsFrom({ ...options, ...patch });
        setOptions(next);
        onOptions?.(next);
      }}
      engineOptions={engineOptions}
      lastMove={40}
      onStart={() => {}}
      testId="ca"
      {...rest}
    />
  );
}

/** Rendered with the Engine section open — it starts folded (CTA-241). */
const renderOpen = (ui: ReactElement) => {
  const view = render(ui);
  fireEvent.click(screen.getByRole("button", { name: "Engine" }));
  return view;
};

describe("ComputerAnalysisForm (CTA-174)", () => {
  it("names every control", () => {
    renderOpen(<Harness engineName="Stockfish 19 Lite" />);
    for (const name of ["Threads", "Hash (MB)", "Depth", "Time per move", "Lines", "Early stop from depth"]) {
      expect(screen.getByRole("slider", { name })).toBeInTheDocument();
    }
    expect(screen.getByRole("radiogroup", { name: "Analyse the moves of" })).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "From move" })).toHaveValue(1);
    expect(screen.getByRole("spinbutton", { name: "To move" })).toHaveValue(null);
    expect(screen.getByRole("group", { name: "The first move analysed is" })).toBeInTheDocument();
    for (const name of ["Light", "Medium", "Full"]) expect(screen.getByRole("checkbox", { name })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Advanced options" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: "Start computer analysis" })).toBeEnabled();
    expect(screen.getByText("The job runs Stockfish 19 Lite — the engine chosen in Settings.")).toBeInTheDocument();
  });

  describe("Threads, Hash and Lines follow what the engine declared", () => {
    it("pins Threads at 1 on the single-thread build, and says so", () => {
      renderOpen(<Harness engineOptions={SINGLE_THREAD} />);
      expect(screen.getByRole("slider", { name: "Threads" })).toBeDisabled();
      expect(screen.getByText("This engine build fixes Threads at 1.")).toBeInTheDocument();
      expect(screen.getByRole("slider", { name: "Hash (MB)" })).toBeEnabled();
    });

    it("offers Threads on the multi-thread build", () => {
      renderOpen(<Harness engineOptions={MULTI_THREAD} />);
      expect(screen.getByRole("slider", { name: "Threads" })).toBeEnabled();
    });

    it("says what the engine does not have", () => {
      renderOpen(<Harness engineOptions={NO_HASH} />);
      expect(screen.getByRole("slider", { name: "Hash (MB)" })).toBeDisabled();
      expect(screen.getByText('This engine build has no "Hash" option.')).toBeInTheDocument();
      expect(screen.getByRole("slider", { name: "Lines" })).toBeDisabled();
    });

    it("before the handshake, takes a single-thread engine's Threads as pinned at 1 and leaves the rest open", () => {
      const { unmount } = renderOpen(<Harness engineOptions={BEFORE_HANDSHAKE} multiThread={false} />);
      expect(screen.getByRole("slider", { name: "Threads" })).toBeDisabled();
      expect(screen.getByText("This engine build fixes Threads at 1.")).toBeInTheDocument();
      expect(screen.getByRole("slider", { name: "Hash (MB)" })).toBeEnabled();
      unmount();
      renderOpen(<Harness engineOptions={BEFORE_HANDSHAKE} />);
      expect(screen.getByRole("slider", { name: "Threads" })).toBeEnabled();
    });
  });

  describe("an engine server's engine — its own range, not the browser's (CTA-175)", () => {
    const top = (name: string) => screen.getByRole("slider", { name }).getAttribute("aria-valuemax");

    it("offers Threads and Hash up to what the engine declares", () => {
      renderOpen(<Harness initial={HOSTED_OPTIONS} engineOptions={HOSTED_ENGINE} deviceLimits={HOSTED_LIMITS} />);
      expect(top("Threads")).toBe("15");
      expect(top("Hash (MB)")).toBe("4096");
      expect(screen.getByRole("slider", { name: "Hash (MB)" })).toHaveValue("2048");
    });

    it("offers the same range before the handshake, never the device's", () => {
      renderOpen(<Harness initial={HOSTED_OPTIONS} engineOptions={BEFORE_HANDSHAKE} deviceLimits={HOSTED_LIMITS} />);
      expect(top("Threads")).toBe("15");
      expect(top("Hash (MB)")).toBe("4096");
    });

    it("keeps a Hash past 1024 MB once set", async () => {
      const onOptions = vi.fn();
      renderOpen(
        <Harness initial={HOSTED_OPTIONS} engineOptions={HOSTED_ENGINE} deviceLimits={HOSTED_LIMITS} onOptions={onOptions} />,
      );
      screen.getByRole("slider", { name: "Hash (MB)" }).focus();
      await userEvent.keyboard("{End}");
      expect(onOptions).toHaveBeenLastCalledWith(expect.objectContaining({ hashMb: 4096 }));
      expect(screen.getByRole("slider", { name: "Hash (MB)" })).toHaveValue("4096");
    });

    it("still holds an in-browser build to this device's limits, and to 1024 MB without them", () => {
      const { unmount } = renderOpen(<Harness engineOptions={SINGLE_THREAD} deviceLimits={{ threads: 3, hashMb: 512 }} />);
      expect(top("Hash (MB)")).toBe("512");
      unmount();
      renderOpen(<Harness engineOptions={SINGLE_THREAD} />);
      expect(top("Hash (MB)")).toBe("1024");
    });
  });

  it("switches the time limit off and back, the last time set coming back", async () => {
    const user = userEvent.setup();
    const onOptions = vi.fn();
    renderOpen(<Harness onOptions={onOptions} />);
    const noLimit = screen.getByRole("switch", { name: "No time limit" });
    const time = screen.getByRole("slider", { name: "Time per move" });
    expect(noLimit).not.toBeChecked();
    expect(time).toBeEnabled();
    expect(time).toHaveAttribute("aria-valuemin", "1000");

    await user.click(noLimit);
    expect(onOptions).toHaveBeenLastCalledWith(expect.objectContaining({ moveTimeMs: 0 }));
    expect(noLimit).toBeChecked();
    expect(time).toBeDisabled();
    expect(screen.getByTestId("ca-movetime-value")).toHaveTextContent("No limit");

    await user.click(noLimit);
    expect(onOptions).toHaveBeenLastCalledWith(expect.objectContaining({ moveTimeMs: OPTIONS.moveTimeMs }));
    expect(time).toBeEnabled();
  });

  it("opens with no time limit when the options have none", () => {
    renderOpen(<Harness initial={NO_TIME_LIMIT} />);
    expect(screen.getByRole("switch", { name: "No time limit" })).toBeChecked();
    expect(screen.getByRole("slider", { name: "Time per move" })).toBeDisabled();
  });

  it("caps the early stop's depth at the depth", () => {
    renderOpen(<Harness />);
    expect(screen.getByRole("slider", { name: "Early stop from depth" })).toHaveAttribute("aria-valuemax", String(OPTIONS.depth));
  });

  it("changes the side and the colour of the first move", async () => {
    const user = userEvent.setup();
    const onOptions = vi.fn();
    renderOpen(<Harness onOptions={onOptions} />);
    await user.click(screen.getByRole("radio", { name: "Black" }));
    expect(onOptions).toHaveBeenLastCalledWith(expect.objectContaining({ side: "b" }));
    await user.click(screen.getByRole("button", { name: "Black's" }));
    expect(onOptions).toHaveBeenLastCalledWith(expect.objectContaining({ fromColour: "b" }));
  });

  it("takes the move numbers as typed, an empty last move running to the end, and marks one out of range", async () => {
    const user = userEvent.setup();
    const onOptions = vi.fn();
    renderOpen(<Harness onOptions={onOptions} />);
    const to = screen.getByRole("spinbutton", { name: "To move" });
    await user.type(to, "30");
    expect(onOptions).toHaveBeenLastCalledWith(expect.objectContaining({ toMove: 30 }));
    await user.clear(to);
    expect(onOptions).toHaveBeenLastCalledWith(expect.objectContaining({ toMove: null }));

    const from = screen.getByRole("spinbutton", { name: "From move" });
    await user.clear(from);
    expect(from).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("A move number from 1 to 40.")).toBeInTheDocument();
    await user.type(from, "12");
    expect(from).toHaveAttribute("aria-invalid", "false");
    expect(onOptions).toHaveBeenLastCalledWith(expect.objectContaining({ fromMove: 12 }));
    await user.type(from, "0");
    expect(from).toHaveAttribute("aria-invalid", "true");
  });

  it("keeps the thresholds and the variation range under Advanced, collapsed", async () => {
    const user = userEvent.setup();
    renderOpen(<Harness />);
    expect(screen.queryByRole("slider", { name: "Blunder above" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Advanced options" }));
    expect(screen.getByRole("button", { name: "Advanced options" })).toHaveAttribute("aria-expanded", "true");
    for (const name of ["Inaccuracy above", "Mistake above", "Blunder above", "Variation range"]) {
      expect(screen.getByRole("slider", { name })).toBeInTheDocument();
    }
    expect(screen.getByRole("slider", { name: "Blunder above" })).toHaveAttribute("aria-valuenow", "300");
  });

  it("ticks the variants, each explained, in their order", async () => {
    const user = userEvent.setup();
    const onOptions = vi.fn();
    renderOpen(<Harness onOptions={onOptions} />);
    expect(screen.getByRole("checkbox", { name: "Full" })).toHaveAccessibleDescription(
      "Every alternative within the variation range, on every analysed move.",
    );
    await user.click(screen.getByRole("checkbox", { name: "Full" }));
    await user.click(screen.getByRole("checkbox", { name: "Medium" }));
    expect(onOptions).toHaveBeenLastCalledWith(expect.objectContaining({ outputs: ["light", "medium", "full"] }));
  });

  describe("Start", () => {
    it("starts", async () => {
      const user = userEvent.setup();
      const onStart = vi.fn();
      renderOpen(<Harness onStart={onStart} />);
      await user.click(screen.getByRole("button", { name: "Start computer analysis" }));
      expect(onStart).toHaveBeenCalledTimes(1);
    });

    it("is off with no variant ticked, saying why", () => {
      renderOpen(<Harness initial={NONE_TICKED} />);
      const start = screen.getByRole("button", { name: "Start computer analysis" });
      expect(start).toBeDisabled();
      expect(start).toHaveAccessibleDescription("Tick at least one variant to start.");
    });

    it("is off on a board with no moves, or none in range, saying why", () => {
      const { unmount } = renderOpen(<Harness blocked="noMoves" />);
      expect(screen.getByRole("button", { name: "Start computer analysis" })).toHaveAccessibleDescription(
        "The board has no moves to analyse.",
      );
      unmount();
      renderOpen(<Harness blocked="noRange" />);
      expect(screen.getByRole("button", { name: "Start computer analysis" })).toBeDisabled();
      expect(screen.getByText("No move of the game is in the chosen range.")).toBeInTheDocument();
    });

    it("is off while queuing, and says a refusal", () => {
      const { unmount } = renderOpen(<Harness busy />);
      expect(screen.getByRole("button", { name: "Start computer analysis" })).toBeDisabled();
      unmount();
      renderOpen(<Harness problem="storage" />);
      expect(screen.getByTestId("ca-problem")).toHaveTextContent("The job could not be kept");
    });
  });

  describe("the Engine section folds (CTA-241)", () => {
    it("starts folded, its header the engine, the depth and the time per move on one line", async () => {
      const user = userEvent.setup();
      render(<Harness engineName="Stockfish 19 Lite" />);
      const toggle = screen.getByRole("button", { name: "Engine" });
      expect(toggle).toHaveAttribute("aria-expanded", "false");
      expect(toggle).toHaveAccessibleDescription("Stockfish 19 Lite · depth 18 · 5 s a move");
      expect(screen.queryByRole("slider", { name: "Depth" })).toBeNull();
      // The other sections are open as before.
      expect(screen.getByRole("radiogroup", { name: "Analyse the moves of" })).toBeInTheDocument();

      await user.click(toggle);
      expect(toggle).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByRole("slider", { name: "Depth" })).toBeVisible();
      await expectNoAxeViolations();
    });

    it("starts open where the host asks", () => {
      render(<Harness engineExpanded />);
      expect(screen.getByRole("button", { name: "Engine" })).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByRole("slider", { name: "Depth" })).toBeInTheDocument();
    });

    it("follows the choice: the preset by name, a change of depth, no time limit", () => {
      const engines = describeEngines();
      renderOpen(
        <Harness
          initial={NO_TIME_LIMIT}
          engineChoice={{
            engines,
            engineId: engines[0].descriptor.id,
            onEngineChange: () => {},
            presets: [{ id: "deep", name: "Deep" }],
            presetId: "deep",
            onPresetChange: () => {},
          }}
        />,
      );
      expect(screen.getByTestId("ca-engine-summary")).toHaveTextContent(`${engines[0].descriptor.name} · Deep · depth 35 · no time limit`);
      screen.getByRole("slider", { name: "Depth" }).focus();
      fireEvent.keyDown(screen.getByRole("slider", { name: "Depth" }), { key: "ArrowLeft" });
      expect(screen.getByTestId("ca-engine-summary")).toHaveTextContent("depth 34 · no time limit");
    });
  });

  it("passes axe, Advanced open too", async () => {
    const user = userEvent.setup();
    renderOpen(<Harness engineName="Stockfish 19 Lite" />);
    await user.click(screen.getByRole("button", { name: "Advanced options" }));
    await expectNoAxeViolations();
  });

  describe("Jobs V2's additions (CTA-188)", () => {
    it("offers the engine and its preset, each a select, at the head of the Engine section", async () => {
      const onEngineChange = vi.fn();
      const onPresetChange = vi.fn();
      const engines = describeEngines();
      renderOpen(
        <Harness
          engineChoice={{
            engines,
            engineId: engines[0].descriptor.id,
            onEngineChange,
            presets: [
              { id: "default", name: "Default" },
              { id: "deep", name: "Deep" },
            ],
            presetId: "default",
            onPresetChange,
          }}
        />,
      );
      expect(screen.getByText(/The preset sets the depth and the time per move/)).toBeInTheDocument();
      await userEvent.click(screen.getByRole("combobox", { name: "Preset" }));
      await userEvent.click(screen.getByRole("option", { name: "Deep" }));
      expect(onPresetChange).toHaveBeenCalledWith("deep");
      expect(screen.getByRole("combobox", { name: "Engine" })).toHaveTextContent(engines[0].descriptor.name);
      await expectNoAxeViolations();
    });

    it("offers one variant as radios for a merge into the Case", async () => {
      const onOptions = vi.fn();
      renderOpen(<Harness singleVariant onOptions={onOptions} />);
      expect(screen.queryByRole("checkbox", { name: /Light/ })).toBeNull();
      await userEvent.click(screen.getByRole("radio", { name: "Full" }));
      expect(onOptions).toHaveBeenLastCalledWith(expect.objectContaining({ outputs: ["full"] }));
      expect(screen.getByRole("radiogroup", { name: "Variant" })).toBeInTheDocument();
    });
  });
});
