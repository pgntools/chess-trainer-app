import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { describeEngines } from "../../../lib/engines";
import {
  repertoireEvaluationSettingsFrom,
  type RepertoireEvaluationSettings,
} from "../../../lib/jobs/kinds/repertoireEvaluation/core";
import { expectNoAxeViolations } from "../../../test/axe";
import RepertoireEvaluationForm, { type RepertoireEvaluationFormProps } from "./RepertoireEvaluationForm";
import { BEFORE_HANDSHAKE, BLACK_EVERYTHING, MULTI_THREAD, PRESETS, SINGLE_THREAD, WHITE } from "./fixtures";

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

/** The form over its own state, as a screen holds it — every change reported. */
function Harness({
  initial = WHITE,
  onSettings,
  ...rest
}: { initial?: RepertoireEvaluationSettings; onSettings?: (settings: RepertoireEvaluationSettings) => void } & Partial<
  Omit<RepertoireEvaluationFormProps, "settings" | "onChange" | "testId">
>) {
  const [settings, setSettings] = useState(initial);
  return (
    <RepertoireEvaluationForm
      settings={settings}
      onChange={(patch) => {
        const next = repertoireEvaluationSettingsFrom({ ...settings, ...patch });
        setSettings(next);
        onSettings?.(next);
      }}
      repertoireName="Queen's Gambit Declined"
      engineOptions={SINGLE_THREAD}
      testId="form"
      {...rest}
    />
  );
}

describe("RepertoireEvaluationForm (CTA-219)", () => {
  it("offers the engine's search, the side and the ply limit, the thresholds and the outputs", () => {
    render(<Harness />);
    for (const name of ["Threads", "Hash (MB)", "Depth", "Time per move", "Lines", "Ply limit", "Inaccuracy above", "Mistake above", "Blunder above"]) {
      expect(screen.getByRole("slider", { name })).toBeInTheDocument();
    }
    // The repertoire evaluation has no early stop.
    expect(screen.queryByRole("slider", { name: "Early stop from depth" })).not.toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Depth" })).toHaveValue("18");
    expect(screen.getByRole("group", { name: "The repertoire's side" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "White" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("slider", { name: "Ply limit" })).toHaveValue("20");
    expect(screen.getByText("20 plies, to move 10")).toBeInTheDocument();

    const report = screen.getByRole("checkbox", { name: "A report" });
    expect(report).toBeChecked();
    expect(report).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "A new repertoire" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "A new repertoire" })).toHaveAccessibleDescription(
      "“Queen's Gambit Declined — evaluated”: the repertoire with every evaluation and verdict written into its moves.",
    );
    expect(screen.getByRole("checkbox", { name: "The annotated PGN, as a file" })).not.toBeChecked();
  });

  it("changes the side, the ply limit, the search and the thresholds as patches", async () => {
    const user = userEvent.setup();
    const onSettings = vi.fn();
    render(<Harness onSettings={onSettings} engineOptions={MULTI_THREAD} />);

    await user.click(screen.getByRole("button", { name: "Black" }));
    expect(onSettings).toHaveBeenLastCalledWith(expect.objectContaining({ side: "b" }));

    screen.getByRole("slider", { name: "Ply limit" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(onSettings).toHaveBeenLastCalledWith(expect.objectContaining({ maxPlies: 21 }));
    expect(screen.getByText("21 plies, to move 11")).toBeInTheDocument();

    screen.getByRole("slider", { name: "Depth" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(onSettings).toHaveBeenLastCalledWith(expect.objectContaining({ search: expect.objectContaining({ depth: 19, moveTimeMs: 5000 }) }));

    screen.getByRole("slider", { name: "Threads" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(onSettings).toHaveBeenLastCalledWith(expect.objectContaining({ search: expect.objectContaining({ threads: 2, depth: 19 }) }));

    screen.getByRole("slider", { name: "Blunder above" }).focus();
    await user.keyboard("{ArrowLeft}");
    expect(onSettings).toHaveBeenLastCalledWith(expect.objectContaining({ thresholds: { inaccuracy: 50, mistake: 100, blunder: 299 } }));

    await user.click(screen.getByRole("switch", { name: "No time limit" }));
    expect(onSettings).toHaveBeenLastCalledWith(expect.objectContaining({ search: expect.objectContaining({ moveTimeMs: 0 }) }));
  });

  it("ticks the outputs, the report staying", async () => {
    const user = userEvent.setup();
    const onSettings = vi.fn();
    render(<Harness onSettings={onSettings} />);
    await user.click(screen.getByRole("checkbox", { name: "A new repertoire" }));
    expect(onSettings).toHaveBeenLastCalledWith(expect.objectContaining({ outputs: { repertoire: true, pgnFile: false } }));
    await user.click(screen.getByRole("checkbox", { name: "The annotated PGN, as a file" }));
    expect(onSettings).toHaveBeenLastCalledWith(expect.objectContaining({ outputs: { repertoire: true, pgnFile: true } }));
    await user.click(screen.getByRole("checkbox", { name: "A new repertoire" }));
    expect(onSettings).toHaveBeenLastCalledWith(expect.objectContaining({ outputs: { repertoire: false, pgnFile: true } }));
    expect(screen.getByRole("checkbox", { name: "A report" })).toBeChecked();
  });

  it("shows a Black repertoire with its outputs ticked", () => {
    render(<Harness initial={BLACK_EVERYTHING} />);
    expect(screen.getByRole("button", { name: "Black" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("checkbox", { name: "A new repertoire" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "The annotated PGN, as a file" })).toBeChecked();
    expect(screen.getByRole("slider", { name: "Inaccuracy above" })).toHaveValue("30");
  });

  it("puts the engine and its preset at the head, as selects", async () => {
    const user = userEvent.setup();
    const onEngineChange = vi.fn();
    const onPresetChange = vi.fn();
    const engines = describeEngines();
    render(
      <Harness
        engineOptions={BEFORE_HANDSHAKE}
        multiThread={false}
        engineChoice={{ engines, engineId: engines[0].descriptor.id, onEngineChange, presets: PRESETS, presetId: "default", onPresetChange }}
      />,
    );
    expect(screen.getByRole("slider", { name: "Threads" })).toBeDisabled();
    await user.click(screen.getByRole("combobox", { name: "Preset" }));
    await user.click(screen.getByRole("option", { name: "Deep analysis" }));
    expect(onPresetChange).toHaveBeenCalledWith("deep");
    expect(screen.getByRole("combobox", { name: "Engine" })).toBeInTheDocument();
  });

  it("passes axe", async () => {
    render(<Harness initial={BLACK_EVERYTHING} />);
    await expectNoAxeViolations();
  });

  it("passes axe in Hebrew", async () => {
    await i18n.changeLanguage("he");
    render(<Harness />);
    expect(screen.getByRole("slider", { name: "מגבלת חצאי מסעים" })).toBeInTheDocument();
    await expectNoAxeViolations();
  });
});
