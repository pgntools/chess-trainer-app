import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";

import { brownTheme, defaultTheme, greenTheme, type ThemeDefinition } from "../../../design-system/themes";
import { downloadTextFile } from "../../../lib/pgnExport";
import { AXE_PAGE_TIMEOUT_MS, expectNoAxeViolations } from "../../../test/axe";
import { loadThemeSource } from "../../../test/themeSource";
import AppThemeWithLang from "../../../theme/AppThemeWithLang";
import { THEME_STORAGE_KEY } from "../../../theme/themeChoice";
import { withToken } from "./draft";
import Main from "./Main";

/*
  The theme editor (CTA-115, `/dev/theme-editor`): it opens any registered
  theme, edits every token through its sections, reports contrast live,
  and saves by download only — a file that loads back as the edited theme.
*/

vi.mock("../../../lib/pgnExport", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/pgnExport")>()),
  downloadTextFile: vi.fn(() => true),
}));

const downloads = () => vi.mocked(downloadTextFile).mock.calls.map(([fileName, text, type]) => ({ fileName, text, type }));
const lastDownload = () => downloads().at(-1)!;

const mount = (entry = "/dev/theme-editor?theme=brown") =>
  render(
    <AppThemeWithLang>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/dev/theme-editor" element={<Main />} />
        </Routes>
      </MemoryRouter>
    </AppThemeWithLang>,
  );

/** A section's tab, by its title — a badged one's name goes on to count its contrast failures. */
const tab = (title: string) => screen.getByRole("tab", { name: new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(,|$)`) });
const panel = () => screen.getByRole("tabpanel");
const openSection = async (title: string) => {
  await userEvent.click(tab(title));
  return panel();
};
/** Replaces a text field's words — a colour, a length, a name. */
const retype = async (name: string, text: string) => {
  const input = screen.getByRole("textbox", { name });
  await userEvent.clear(input);
  // Pasted, not typed a key at a time: each key re-renders the whole preview.
  await userEvent.click(input);
  await userEvent.paste(text);
};
const pick = async (label: string, option: string) => {
  await userEvent.click(screen.getByRole("combobox", { name: label }));
  await userEvent.click(await screen.findByRole("option", { name: option }));
};
const save = async () => {
  await userEvent.click(screen.getByRole("button", { name: "Save…" }));
  return screen.findByRole("dialog", { name: "Save the theme" });
};

let errors: unknown[][];
beforeEach(() => {
  vi.mocked(downloadTextFile).mockClear();
  errors = [];
  vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    errors.push(args);
  });
});
afterEach(() => {
  vi.restoreAllMocks();
});

/*
  A test that walks several sections re-renders the whole preview — a theme
  built afresh and every styled part of the sample restyled — at each step:
  real work under jsdom, 5–10 s alone, so these tests state a longer timeout
  than the suite's 20 s rather than fail on a loaded machine.
*/
describe("the theme editor", { timeout: 60_000 }, () => {
  it("opens the theme ?theme= names, its sections down the left", () => {
    mount();
    expect(screen.getByRole("heading", { level: 1, name: "Theme editor" })).toBeInTheDocument();
    const sections = screen.getByRole("tablist", { name: "Sections" });
    expect(sections).toHaveAttribute("aria-orientation", "vertical");
    expect(within(sections).getAllByRole("tab").map((node) => node.textContent?.replace(/,.*$/, ""))).toEqual([
      "Theme",
      "Palette — light",
      "Palette — dark",
      "Typography",
      "Shape & components",
      "Accessibility",
      "Board",
      "Arrows",
      "Annotations",
      "Map & Library",
    ]);
    expect(screen.getByRole("textbox", { name: "Id" })).toHaveValue("brown");
    expect(screen.getByRole("textbox", { name: "Name (English)" })).toHaveValue("Brown");
    expect(screen.getByRole("textbox", { name: "Name (Hebrew)" })).toHaveValue("חום");
    expect(screen.getByTestId("theme-editor-editing")).toHaveTextContent("Editing Brown (brown)");
    expect(errors).toEqual([]);
  });

  it("opens the reader's own theme without ?theme=, and any registered theme on request", async () => {
    localStorage.setItem(THEME_STORAGE_KEY, "green");
    mount("/dev/theme-editor");
    expect(screen.getByRole("textbox", { name: "Id" })).toHaveValue("green");
    await pick("Open a registered theme", "High contrast (high-contrast)");
    expect(screen.getByRole("textbox", { name: "Id" })).toHaveValue("high-contrast");
    expect(screen.getByTestId("theme-editor-notice")).toHaveTextContent('The "high-contrast" theme is open.');
  });

  it("moves between the sections with the up and down arrows", async () => {
    mount();
    await userEvent.click(tab("Theme"));
    await userEvent.keyboard("{ArrowDown}");
    expect(tab("Palette — light")).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(panel()).toHaveAccessibleName(/^Palette — light/);
    expect(within(panel()).getByRole("heading", { level: 2, name: "Palette — light" })).toBeInTheDocument();
  });

  it("edits every section's tokens in the main area", async () => {
    mount();
    for (const [section, field] of [
      ["Palette — light", "Primary"],
      ["Palette — dark", "Secondary text"],
      ["Typography", "Font family"],
      ["Accessibility", "Its colour — dark"],
      ["Board", "Dark square"],
      ["Arrows", "A play-chance arrow's border"],
      ["Annotations", "Blunder (??)"],
      ["Map & Library", "White's move"],
    ] as const) {
      const shown = await openSection(section);
      expect(within(shown).getAllByRole("textbox", { name: field }).length, section).toBeGreaterThan(0);
    }
    const components = await openSection("Shape & components");
    expect(within(components).getByRole("slider", { name: "Button corner radius" })).toBeInTheDocument();
    expect(within(components).getByRole("switch", { name: /darker lip/ })).not.toBeChecked();
  });

  it("measures contrast live: a failing token badges its section and says so under its field", async () => {
    mount();
    expect(screen.queryByTestId("theme-editor-badge-palette-light")).toBeNull();
    const summary = screen.getByTestId("theme-editor-contrast-summary");
    expect(summary).toHaveTextContent(/Contrast: \d+ pass, \d+ fail \(0 required\)/);

    await openSection("Palette — light");
    await retype("Text", "#dddddd");
    expect(screen.getByTestId("theme-editor-badge-palette-light")).toHaveTextContent("3");
    expect(tab("Palette — light")).toHaveAccessibleName("Palette — light, 3 contrast failures");
    expect(summary).toHaveTextContent(/\(3 required\)/);
    expect(screen.getByRole("textbox", { name: "Text" })).toHaveAccessibleDescription(/at worst — text\.primary on background\.\w+, needs 4\.5:1\. 3 of 3 checks fail AA\./);
  });

  it("goes to a failing token from the summary", async () => {
    mount();
    await openSection("Accessibility");
    await retype("Its colour — dark", "#262421");
    await openSection("Board");
    await userEvent.click(screen.getByRole("button", { name: "Go to a failure" }));
    const menu = await screen.findByRole("menu");
    await userEvent.click(within(menu).getByRole("menuitem", { name: /Accessibility — the focus ring on background\.paper/ }));
    expect(panel()).toHaveAccessibleName(/^Accessibility/);
    expect(screen.getByRole("textbox", { name: "Its colour — dark" })).toHaveFocus();
  });

  it("downloads a theme file that loads back as exactly the edited theme", async () => {
    mount();
    await retype("Id", "ocean");
    await retype("Name (English)", "Ocean");
    await openSection("Palette — light");
    await retype("Primary", "#0a5c8a");
    await retype("Success", "rgba(0, 120, 60, 0.9)");
    await openSection("Typography");
    await retype("Font family", '"Inter", sans-serif');
    await pick("Case", "Upper case");
    await openSection("Shape & components");
    fireEvent.change(screen.getByTestId("theme-editor-field-components-buttonRadius-input"), { target: { value: "8" } });
    await userEvent.click(screen.getByRole("switch", { name: /darker lip/ }));
    await pick("Links are underlined", "On hover");
    await openSection("Board");
    await retype("Light square", "#dfe8ee");

    const dialog = await save();
    expect(within(dialog).getByRole("heading", { name: "How to use this file" })).toBeInTheDocument();
    expect(within(dialog).getByText(/yarn theme:bootstrap --id ocean --name "Ocean"/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Download ocean.ts" }));

    const { fileName, text } = lastDownload();
    expect(fileName).toBe("ocean.ts");
    const expected = [
      ["light.primary.main", "#0a5c8a"],
      ["light.success.main", "rgba(0, 120, 60, 0.9)"],
      ["typography.fontFamily", '"Inter", sans-serif'],
      ["typography.button.textTransform", "uppercase"],
      ["components.buttonRadius", 8],
      ["components.buttonLip", { rest: 0.22, hover: 0.3 }],
      ["components.linkUnderline", "hover"],
      ["chess.board.lightSquare", "#dfe8ee"],
    ].reduce<ThemeDefinition>((theme, [path, value]) => withToken(theme, path as string, value), {
      ...brownTheme,
      id: "ocean",
      labelKey: "appearance.themes.ocean",
    });
    expect(await loadThemeSource(text, "oceanTheme")).toEqual(expected);
    // The same file the Save dialog offers to copy.
    expect(within(dialog).getByTestId("theme-editor-save-source")).toHaveValue(text);
  });

  it("round-trips a draft file, and says what is wrong with a file that is not one", async () => {
    mount();
    await retype("Name (English)", "Sepia");
    await openSection("Board");
    await retype("Dark square", "#704214");
    const dialog = await save();
    await userEvent.click(within(dialog).getByRole("button", { name: "Export draft (JSON)" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const draft = lastDownload();
    expect(draft).toMatchObject({ fileName: "brown.theme-draft.json", type: "application/json" });

    await pick("Open a registered theme", "Default (default)");
    expect(screen.getByRole("textbox", { name: "Dark square" })).toHaveValue(defaultTheme.chess.board.darkSquare);

    const input = screen.getByTestId("theme-editor-import-input");
    await userEvent.upload(input, new File([draft.text], "sepia.json", { type: "application/json" }));
    await waitFor(() => expect(screen.getByRole("textbox", { name: "Dark square" })).toHaveValue("#704214"));
    expect(screen.getByTestId("theme-editor-editing")).toHaveTextContent("Editing Sepia (brown)");

    await userEvent.upload(input, new File(["not json"], "broken.json", { type: "application/json" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("broken.json: The file is not JSON.");
  });

  it("warns on leaving only while it has unsaved changes", async () => {
    mount();
    const leave = () => {
      const event = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };
    expect(leave()).toBe(false);
    await openSection("Board");
    await retype("Light square", "#ffffff");
    expect(screen.getByTestId("theme-editor-editing")).toHaveTextContent("unsaved changes");
    expect(leave()).toBe(true);
    const dialog = await save();
    await userEvent.click(within(dialog).getByRole("button", { name: "Download brown.ts" }));
    expect(leave()).toBe(false);
  });

  it("undoes a change — a run of typing in one field as one step — and resets a section or the whole theme", async () => {
    mount();
    await openSection("Board");
    await retype("Light square", "#ffffff");
    await retype("Dark square", "#000000");
    await userEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByRole("textbox", { name: "Dark square" })).toHaveValue(brownTheme.chess.board.darkSquare);
    expect(screen.getByRole("textbox", { name: "Light square" })).toHaveValue("#ffffff");

    await openSection("Arrows");
    await retype("A book move", "#123456");
    await openSection("Board");
    await userEvent.click(screen.getByRole("button", { name: "Reset section" }));
    expect(screen.getByRole("textbox", { name: "Light square" })).toHaveValue(brownTheme.chess.board.lightSquare);
    await openSection("Arrows");
    expect(screen.getByRole("textbox", { name: "A book move" })).toHaveValue("#123456");

    await userEvent.click(screen.getByRole("button", { name: "Reset theme" }));
    expect(screen.getByRole("textbox", { name: "A book move" })).toHaveValue(brownTheme.chess.book.known);
    expect(screen.getByRole("button", { name: "Reset theme" })).toBeDisabled();
  });

  it("starts from another theme's tokens, keeping its own id and names", async () => {
    mount();
    await retype("Id", "moss");
    await pick("Starts from", "Green (green)");
    await openSection("Board");
    expect(screen.getByRole("textbox", { name: "Dark square" })).toHaveValue(greenTheme.chess.board.darkSquare);
    expect(screen.getByTestId("theme-editor-editing")).toHaveTextContent("(moss)");
  });

  it("previews the section: light or dark, left to right or right to left, the UI or the board", async () => {
    mount();
    const body = () => screen.getByTestId("theme-editor-preview-body");
    expect(body()).toHaveAttribute("data-kind", "ui");
    expect(within(body()).getByRole("button", { name: "A focused button" })).toHaveClass("Mui-focusVisible");
    await openSection("Palette — dark");
    expect(body()).toHaveAttribute("data-mode", "dark");
    await userEvent.click(screen.getByRole("button", { name: "Right to left" }));
    expect(body()).toHaveAttribute("data-direction", "rtl");
    expect(body()).toHaveAttribute("dir", "rtl");
    await openSection("Board");
    expect(body()).toHaveAttribute("data-kind", "board");
    expect(within(body()).getByRole("img", { name: /A board after 1\.e4 e5 2\.Nf3/ })).toBeInTheDocument();
    expect(within(body()).getByRole("img", { name: /promotion picker/ })).toBeInTheDocument();
    await openSection("Map & Library");
    expect(within(body()).getByTestId("theme-editor-preview-bar")).toHaveTextContent("46%31%23%");
  });

  it("refuses to save under an id no file can take", async () => {
    mount();
    await retype("Id", "Not An Id");
    expect(screen.getByRole("textbox", { name: "Id" })).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("button", { name: "Save…" })).toBeDisabled();
  });

  it("writes nothing anywhere — no storage — whatever is edited and saved", async () => {
    mount();
    const before = JSON.stringify({ ...localStorage });
    await openSection("Board");
    await retype("Light square", "#ffffff");
    const dialog = await save();
    await userEvent.click(within(dialog).getByRole("button", { name: "Download brown.ts" }));
    expect(JSON.stringify({ ...localStorage })).toBe(before);
  });

  it("is worked by the keyboard to the Save actions", async () => {
    mount();
    screen.getByRole("button", { name: "Save…" }).focus();
    await userEvent.keyboard("{Enter}");
    const dialog = await screen.findByRole("dialog", { name: "Save the theme" });
    const download = within(dialog).getByRole("button", { name: "Download brown.ts" });
    while (document.activeElement !== download) await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    expect(lastDownload().fileName).toBe("brown.ts");
  });

  it.each([["Theme"], ["Palette — light"], ["Board"], ["Accessibility"]])(
    "passes axe on the %s section",
    async (section) => {
      mount();
      await openSection(section);
      await expectNoAxeViolations(screen.getByTestId("theme-editor"));
    },
    AXE_PAGE_TIMEOUT_MS,
  );
});
