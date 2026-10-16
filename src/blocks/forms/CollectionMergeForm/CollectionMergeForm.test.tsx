import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { collectionMergeSettingsFrom, type CollectionMergeSettings } from "../../../lib/jobs/kinds/collectionMerge/core";
import { expectNoAxeViolations } from "../../../test/axe";
import CollectionMergeForm, { type CollectionMergeFormSource } from "./CollectionMergeForm";
import { DEFAULTS, EVERYTHING, FOUR, LONG_NAMES, TWO } from "./fixtures";

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

/** The form over its own state, as a screen holds it — every change reported. */
function Harness({
  initialSources = FOUR,
  initialSettings = DEFAULTS,
  onSources,
  onSettings,
}: {
  initialSources?: CollectionMergeFormSource[];
  initialSettings?: CollectionMergeSettings;
  onSources?: (sources: CollectionMergeFormSource[]) => void;
  onSettings?: (settings: CollectionMergeSettings) => void;
}) {
  const [sources, setSources] = useState(initialSources);
  const [settings, setSettings] = useState(initialSettings);
  return (
    <CollectionMergeForm
      sources={sources}
      onSourcesChange={(next) => {
        setSources(next);
        onSources?.(next);
      }}
      settings={settings}
      onChange={(patch) => {
        const next = collectionMergeSettingsFrom({ ...settings, ...patch });
        setSettings(next);
        onSettings?.(next);
      }}
      testId="form"
    />
  );
}

const names = () =>
  within(screen.getByRole("list", { name: "Collections to merge" }))
    .getAllByRole("listitem")
    .map((item) => item.textContent);

describe("CollectionMergeForm (CTA-220)", () => {
  it("lists the collections in order, each with its game count", () => {
    render(<Harness />);
    const items = within(screen.getByRole("list", { name: "Collections to merge" })).getAllByRole("listitem");
    expect(items).toHaveLength(4);
    expect(items[0]).toHaveTextContent("1.Mikhail Tal2,636 games");
    expect(items[2]).toHaveTextContent("3.My club games148 games");
    expect(screen.getByRole("button", { name: "Move Mikhail Tal up" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move Bobby Fischer down" })).toBeDisabled();
    expect(screen.queryByText(/neither of these can be removed/)).not.toBeInTheDocument();
  });

  it("moves a collection up and down, and removes one, as the whole new list", async () => {
    const user = userEvent.setup();
    const onSources = vi.fn();
    render(<Harness onSources={onSources} />);

    await user.click(screen.getByRole("button", { name: "Move Tigran Petrosian up" }));
    expect(onSources).toHaveBeenLastCalledWith([FOUR[1], FOUR[0], FOUR[2], FOUR[3]]);
    expect(names()[0]).toContain("Tigran Petrosian");

    await user.click(screen.getByRole("button", { name: "Move Tigran Petrosian down" }));
    expect(names()[1]).toContain("Tigran Petrosian");

    await user.click(screen.getByRole("button", { name: "Remove My club games" }));
    expect(onSources).toHaveBeenLastCalledWith([FOUR[0], FOUR[1], FOUR[3]]);
    expect(names()).toHaveLength(3);
  });

  it("never goes below two: at two, no Remove, and a note says why", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Remove My club games" }));
    await user.click(screen.getByRole("button", { name: "Remove Bobby Fischer" }));
    expect(screen.getByRole("button", { name: "Remove Mikhail Tal" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Remove Tigran Petrosian" })).toBeDisabled();
    expect(screen.getByText("At least two collections are merged, so neither of these can be removed.")).toBeInTheDocument();
  });

  it("offers the three dedupe modes, each explained, and reports the choice", async () => {
    const user = userEvent.setup();
    const onSettings = vi.fn();
    render(<Harness onSettings={onSettings} />);
    const group = screen.getByRole("radiogroup", { name: "Duplicates" });
    expect(within(group).getAllByRole("radio")).toHaveLength(3);
    expect(screen.getByRole("radio", { name: /^Drop exact copies/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /^Keep every game/ })).toHaveAccessibleName(/copies and all/);

    await user.click(screen.getByRole("radio", { name: /^Drop the same game/ }));
    expect(onSettings).toHaveBeenLastCalledWith(expect.objectContaining({ dedupe: "same-game" }));
    expect(screen.getByRole("radio", { name: /^Drop the same game/ })).toBeChecked();
  });

  it("names the merge '<first> + <n> more' where it is left empty, and takes the reader's own", async () => {
    const user = userEvent.setup();
    const onSettings = vi.fn();
    render(<Harness onSettings={onSettings} />);
    const name = screen.getByRole("textbox", { name: "Name" });
    expect(name).toHaveValue("");
    expect(name).toHaveAttribute("placeholder", "Mikhail Tal + 3 more");
    expect(name).toHaveAccessibleDescription("The PGN file's name, and the new collection's. Left empty: “Mikhail Tal + 3 more”.");

    await user.type(name, "Champions");
    expect(onSettings).toHaveBeenLastCalledWith(expect.objectContaining({ name: "Champions" }));
  });

  it("makes the PGN file always, and the Library collection when ticked", async () => {
    const user = userEvent.setup();
    const onSettings = vi.fn();
    render(<Harness onSettings={onSettings} />);
    const file = screen.getByRole("checkbox", { name: "The merged PGN, as a file" });
    expect(file).toBeChecked();
    expect(file).toBeDisabled();
    const collection = screen.getByRole("checkbox", { name: "Also add as a Library collection" });
    expect(collection).not.toBeChecked();
    expect(collection).toHaveAccessibleDescription(/at most 100,000,000 characters/);

    await user.click(collection);
    expect(onSettings).toHaveBeenLastCalledWith(expect.objectContaining({ outputs: { collection: true } }));
  });

  it("is operable by keyboard: Tab to a move, Enter to press it", async () => {
    const user = userEvent.setup();
    render(<Harness initialSources={TWO} />);
    screen.getByRole("button", { name: "Move Mikhail Tal down" }).focus();
    await user.keyboard("{Enter}");
    expect(names()[0]).toContain("Tigran Petrosian");
  });

  it("passes axe, in English and in Hebrew", async () => {
    const { container, unmount } = render(<Harness initialSettings={EVERYTHING} />);
    await expectNoAxeViolations(container);
    unmount();

    await i18n.changeLanguage("he");
    const hebrew = render(<Harness initialSources={LONG_NAMES} />);
    expect(screen.getByRole("list", { name: "אוספים למיזוג" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "שם" })).toHaveAttribute("placeholder", "The complete correspondence games of the 1987–1994 national championship cycles, annotated + 2 נוספים");
    await expectNoAxeViolations(hebrew.container);
  });
});
