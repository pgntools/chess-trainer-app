import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import type { EnginePresetRow } from "../../../lib/enginePresets";
import { expectNoAxeViolations } from "../../../test/axe";
import EnginePresetForm from "./EnginePresetForm";
import { BROWSER_DEEP_ROWS, BROWSER_DEFAULT_ROWS, PRESETS, SERVER_DEEP_ROWS } from "./fixtures";

const mount = (options: { rows?: readonly EnginePresetRow[] | undefined; selectedId?: string } = {}) => {
  // `rows: undefined` is the reading state, not "the default rows".
  const rows = "rows" in options ? options.rows : BROWSER_DEFAULT_ROWS;
  const selectedId = options.selectedId ?? "default";
  const props = {
    onSelect: vi.fn(),
    onCreate: vi.fn(),
    onRename: vi.fn(),
    onDuplicate: vi.fn(),
    onDelete: vi.fn(),
    onChange: vi.fn(),
  };
  render(
    <EnginePresetForm
      engineName="Stockfish 19 Lite"
      presets={PRESETS}
      selectedId={selectedId}
      rows={rows}
      testId="presets"
      {...props}
    />,
  );
  return props;
};

const optionItem = (name: string) =>
  within(screen.getByTestId("presets-options"))
    .getAllByRole("listitem")
    .find((item) => item.textContent?.includes(name) ?? false)!;

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("EnginePresetForm", () => {
  it("lists every option the engine declares with its type, default and range — the boards' own read-only, each limit said", () => {
    mount();
    const list = screen.getByRole("list", { name: "Options of Stockfish 19 Lite — Default" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(BROWSER_DEFAULT_ROWS.length);

    expect(screen.getByRole("spinbutton", { name: "Move Overhead" })).toHaveValue(10);
    expect(screen.getByRole("spinbutton", { name: "Move Overhead" })).toHaveAccessibleDescription("spin · default 10 · 0–5000");
    expect(screen.getByRole("switch", { name: "UCI_ShowWDL" })).not.toBeChecked();
    // The boards' own: no control, and why.
    expect(screen.queryByRole("spinbutton", { name: "Hash" })).toBeNull();
    expect(optionItem("Hash")).toHaveTextContent("Set on each board");
    expect(optionItem("EvalFile")).toHaveTextContent("Not available in the browser");
    expect(screen.queryByRole("textbox", { name: "EvalFile" })).toBeNull();
    expect(optionItem("Clear Hash")).toHaveTextContent("An action, not a setting");
    expect(optionItem("Skill Level")).toHaveTextContent("Play with Engine and Masked Pieces set this");
    // Nothing set: nothing to reset.
    expect(screen.queryByRole("button", { name: /back to the engine's default/ })).toBeNull();
  });

  it("changes each type in its own control", async () => {
    const { onChange } = mount();
    await userEvent.click(screen.getByRole("switch", { name: "UCI_ShowWDL" }));
    expect(onChange).toHaveBeenLastCalledWith("UCI_ShowWDL", true);

    const overhead = screen.getByRole("spinbutton", { name: "Move Overhead" });
    await userEvent.clear(overhead);
    await userEvent.type(overhead, "250");
    expect(onChange).toHaveBeenLastCalledWith("Move Overhead", 250);
  });

  it("keeps back a number outside the range, saying what it takes", async () => {
    const { onChange } = mount();
    const skill = screen.getByRole("spinbutton", { name: "Skill Level" });
    await userEvent.clear(skill);
    await userEvent.type(skill, "99");
    expect(onChange).not.toHaveBeenCalledWith("Skill Level", 99);
    expect(skill).toHaveAccessibleDescription("A whole number from 0 to 20.");
    expect(skill).toBeInvalid();
  });

  it("resets what the preset sets, and removes a value this engine does not declare", async () => {
    const { onChange } = mount({ rows: BROWSER_DEEP_ROWS, selectedId: "deep" });
    expect(screen.getByRole("spinbutton", { name: "Move Overhead" })).toHaveValue(100);
    await userEvent.click(screen.getByRole("button", { name: "Put Move Overhead back to the engine's default" }));
    expect(onChange).toHaveBeenLastCalledWith("Move Overhead", undefined);

    expect(optionItem("Contempt")).toHaveTextContent("Stockfish 19 Lite does not declare it");
    await userEvent.click(screen.getByRole("button", { name: "Remove Contempt from the preset" }));
    expect(onChange).toHaveBeenLastCalledWith("Contempt", undefined);
  });

  it("offers a file path and a combo on an engine server", async () => {
    const { onChange } = mount({ rows: SERVER_DEEP_ROWS, selectedId: "deep" });
    expect(screen.getByRole("textbox", { name: "SyzygyPath" })).toHaveValue("/tablebases/syzygy");
    await userEvent.click(screen.getByRole("combobox", { name: "Style" }));
    await userEvent.click(screen.getByRole("option", { name: "Risky" }));
    expect(onChange).toHaveBeenLastCalledWith("Style", "Risky");
  });

  it("picks, creates, renames and duplicates presets — and never deletes Default", async () => {
    const props = mount();
    await userEvent.click(screen.getByRole("combobox", { name: "Preset for Stockfish 19 Lite" }));
    await userEvent.click(screen.getByRole("option", { name: "lite-play" }));
    expect(props.onSelect).toHaveBeenCalledWith("lite");

    expect(screen.getByRole("button", { name: "Default cannot be deleted" })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "New preset" }));
    const dialog = screen.getByRole("dialog", { name: "New preset" });
    await userEvent.type(within(dialog).getByRole("textbox", { name: "Name" }), "blitz{Enter}");
    expect(props.onCreate).toHaveBeenCalledWith("blitz");

    await userEvent.click(await screen.findByRole("button", { name: "Duplicate Default" }));
    const copy = screen.getByRole("dialog", { name: "Duplicate the preset" });
    expect(within(copy).getByRole("textbox", { name: "Name" })).toHaveValue("Default (copy)");
    await userEvent.click(within(copy).getByRole("button", { name: "Create" }));
    expect(props.onDuplicate).toHaveBeenCalledWith("default", "Default (copy)");

    await userEvent.click(await screen.findByRole("button", { name: "Rename Default" }));
    const rename = screen.getByRole("dialog", { name: "Rename the preset" });
    const field = within(rename).getByRole("textbox", { name: "Name" });
    await userEvent.clear(field);
    expect(within(rename).getByRole("button", { name: "Save" })).toBeDisabled();
    await userEvent.type(field, "Everyday{Enter}");
    expect(props.onRename).toHaveBeenCalledWith("default", "Everyday");
  });

  it("asks before deleting a preset", async () => {
    const { onDelete } = mount({ rows: BROWSER_DEEP_ROWS, selectedId: "deep" });
    await userEvent.click(screen.getByRole("button", { name: "Delete deep-analysis" }));
    const dialog = screen.getByRole("dialog", { name: "Delete deep-analysis?" });
    expect(dialog).toHaveTextContent("Engines that run it go back to Default.");
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledWith("deep");
  });

  it("says it is reading while the engine has not answered", () => {
    mount({ rows: undefined });
    expect(screen.getByTestId("presets-reading")).toHaveTextContent("Reading what Stockfish 19 Lite declares…");
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("keeps the options' names left to right under Hebrew", async () => {
    await i18n.changeLanguage("he");
    mount({ rows: BROWSER_DEEP_ROWS, selectedId: "deep" });
    expect(screen.getByRole("button", { name: "הגדרה חדשה" })).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "Move Overhead" })).toHaveAttribute("dir", "ltr");
    expect(optionItem("EvalFile")).toHaveTextContent("לא זמינה בדפדפן");
  });

  it("passes axe", async () => {
    mount({ rows: SERVER_DEEP_ROWS, selectedId: "deep" });
    await expectNoAxeViolations();
  });
});
