import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import type { EnginePresetRow } from "../../../lib/enginePresets";
import { expectNoAxeViolations } from "../../../test/axe";
import EnginePresetForm from "./EnginePresetForm";
import { BROWSER_DEEP_ROWS, BROWSER_DEFAULT_ROWS, PRESETS, SERVER_DEEP_ROWS, SERVER_DEFAULT_ROWS } from "./fixtures";

const mount = (
  options: { rows?: readonly EnginePresetRow[] | undefined; selectedId?: string; groups?: Record<string, boolean> } = {},
) => {
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
    onGroupChange: vi.fn(),
  };
  render(
    <EnginePresetForm
      engineName="Stockfish 19 Lite"
      presets={PRESETS}
      selectedId={selectedId}
      rows={rows}
      testId="presets"
      groups={options.groups ?? {}}
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
  it("splits the engine's options over Basic, Advanced and System, opening on Basic", async () => {
    mount();
    const tabs = screen.getByRole("tablist", { name: "Kinds of option" });
    expect(within(tabs).getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Basic", "Advanced", "System"]);
    expect(within(tabs).getByRole("tab", { name: "Basic" })).toHaveAttribute("aria-selected", "true");

    const shown = () => within(screen.getByTestId("presets-options")).getAllByRole("listitem").map((item) => item.dataset.testid);
    const slugs = (tab: string) =>
      BROWSER_DEFAULT_ROWS.filter((row) => row.tab === tab).map((row) => `presets-option-${row.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`);
    expect(shown()).toEqual(slugs("basic"));
    expect(screen.getByRole("tabpanel", { name: "Basic" })).toContainElement(screen.getByRole("list", { name: /Options of Stockfish 19 Lite — Default, Basic/ }));

    await userEvent.click(within(tabs).getByRole("tab", { name: "Advanced" }));
    expect(shown()).toEqual(slugs("advanced"));
    await userEvent.click(within(tabs).getByRole("tab", { name: "System" }));
    expect(shown()).toEqual(["presets-option-clear-hash", "presets-option-evalfile"]);
  });

  it("shows each option with its type, default and range — the boards' own read-only, each limit said", async () => {
    mount();
    // Basic: the boards' own, and the strength.
    expect(screen.queryByRole("spinbutton", { name: "Hash" })).toBeNull();
    expect(optionItem("Hash")).toHaveTextContent("Set on each board");
    expect(optionItem("Skill Level")).toHaveTextContent("Play with Engine and Masked Pieces set this");
    // The limit off: the Elo is full strength, and cannot be changed.
    expect(screen.getByRole("spinbutton", { name: "UCI_Elo" })).toBeDisabled();
    expect(screen.getByRole("spinbutton", { name: "UCI_Elo" })).toHaveValue(3190);
    expect(optionItem("UCI_Elo")).toHaveTextContent("Used only while UCI_LimitStrength is on");

    await userEvent.click(screen.getByRole("tab", { name: "Advanced" }));
    expect(screen.getByRole("spinbutton", { name: "Move Overhead" })).toHaveValue(10);
    expect(screen.getByRole("spinbutton", { name: "Move Overhead" })).toHaveAccessibleDescription("spin · default 10 · 0–5000");
    expect(screen.getByRole("switch", { name: "UCI_ShowWDL" })).not.toBeChecked();

    await userEvent.click(screen.getByRole("tab", { name: "System" }));
    expect(optionItem("EvalFile")).toHaveTextContent("Not available in the browser");
    expect(screen.queryByRole("textbox", { name: "EvalFile" })).toBeNull();
    expect(optionItem("Clear Hash")).toHaveTextContent("An action, not a setting");
    // Nothing set: nothing to reset.
    expect(screen.queryByRole("button", { name: /back to the engine's default/ })).toBeNull();
  });

  it("changes each type in its own control", async () => {
    const { onChange } = mount();
    await userEvent.click(screen.getByRole("switch", { name: "UCI_LimitStrength" }));
    expect(onChange).toHaveBeenLastCalledWith("UCI_LimitStrength", true);

    await userEvent.click(screen.getByRole("tab", { name: "Advanced" }));
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
    await userEvent.click(screen.getByRole("tab", { name: "Advanced" }));
    expect(screen.getByRole("spinbutton", { name: "Move Overhead" })).toHaveValue(100);
    await userEvent.click(screen.getByRole("button", { name: "Put Move Overhead back to the engine's default" }));
    expect(onChange).toHaveBeenLastCalledWith("Move Overhead", undefined);

    expect(optionItem("Contempt")).toHaveTextContent("Stockfish 19 Lite does not declare it");
    await userEvent.click(screen.getByRole("button", { name: "Remove Contempt from the preset" }));
    expect(onChange).toHaveBeenLastCalledWith("Contempt", undefined);
  });

  it("keeps the Syzygy tablebases behind a switch, off by default, their settings off until a path is set", async () => {
    const { onGroupChange } = mount({ rows: SERVER_DEFAULT_ROWS });
    await userEvent.click(screen.getByRole("tab", { name: "Advanced" }));
    const tablebases = screen.getByRole("switch", { name: "Syzygy tablebases" });
    expect(tablebases).not.toBeChecked();
    expect(tablebases).toHaveAccessibleDescription(/Off, none of the Syzygy options is sent/);
    expect(screen.queryByRole("textbox", { name: "SyzygyPath" })).toBeNull();
    await userEvent.click(tablebases);
    expect(onGroupChange).toHaveBeenCalledWith("syzygy", true);
  });

  it("shows the group's options while it is on — a setting off until its path, and the file path on an engine server", async () => {
    mount({ rows: SERVER_DEFAULT_ROWS, groups: { syzygy: true } });
    await userEvent.click(screen.getByRole("tab", { name: "Advanced" }));
    const group = screen.getByRole("list", { name: "Syzygy tablebases" });
    expect(within(group).getByRole("textbox", { name: "SyzygyPath" })).toHaveValue("");
    expect(within(group).getByRole("spinbutton", { name: "SyzygyProbeDepth" })).toBeDisabled();
    expect(within(group).getByTestId("presets-option-syzygyprobedepth-note")).toHaveTextContent("set SyzygyPath first");
  });

  it("offers a file path and a combo on an engine server", async () => {
    const { onChange } = mount({ rows: SERVER_DEEP_ROWS, selectedId: "deep", groups: { syzygy: true } });
    await userEvent.click(screen.getByRole("tab", { name: "Advanced" }));
    expect(screen.getByRole("textbox", { name: "SyzygyPath" })).toHaveValue("/tablebases/syzygy");
    expect(screen.getByRole("spinbutton", { name: "SyzygyProbeDepth" })).toBeEnabled();
    await userEvent.click(screen.getByRole("combobox", { name: "Style" }));
    await userEvent.click(screen.getByRole("option", { name: "Risky" }));
    expect(onChange).toHaveBeenLastCalledWith("Style", "Risky");

    await userEvent.click(screen.getByRole("tab", { name: "System" }));
    expect(screen.getByRole("textbox", { name: "Debug Log File" })).toBeEnabled();
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
    await userEvent.click(screen.getByRole("tab", { name: "מתקדם" }));
    expect(screen.getByRole("spinbutton", { name: "Move Overhead" })).toHaveAttribute("dir", "ltr");
    await userEvent.click(screen.getByRole("tab", { name: "מערכת" }));
    expect(optionItem("EvalFile")).toHaveTextContent("לא זמינה בדפדפן");
  });

  it("passes axe — on Basic, and on Advanced with the tablebases on", async () => {
    mount({ rows: SERVER_DEEP_ROWS, selectedId: "deep", groups: { syzygy: true } });
    await expectNoAxeViolations();
    await userEvent.click(screen.getByRole("tab", { name: "Advanced" }));
    await expectNoAxeViolations();
  });
});
