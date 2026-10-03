import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import type { CollectionImportSource, CollectionRow } from "../../../lib/libraryCollections";
import CollectionImportDialog from "./CollectionImportDialog";
import { ONE_EVENT, ONE_FILE, PASTE, ZIP } from "./fixtures";

describe("CollectionImportDialog (CTA-113)", () => {
  it("says what came in, and filters it by Elo, dates and players before anything is kept", async () => {
    const onImport = vi.fn();
    render(<CollectionImportDialog source={ONE_FILE} onCancel={() => {}} onImport={onImport} testId="import" />);
    expect(screen.getByTestId("import-source")).toHaveTextContent("club.pgn");
    expect(screen.getByTestId("import-summary-elo")).toHaveTextContent("1500–2100");
    expect(screen.getByTestId("import-count")).toHaveTextContent("3 of 3");
    await expectNoAxeViolations(screen.getByRole("dialog"));

    fireEvent.change(screen.getByTestId("import-from"), { target: { value: "2023-05-01" } });
    expect(screen.getByTestId("import-count")).toHaveTextContent("2 of 3");
    expect(screen.getByTestId("import-to")).toHaveAttribute("min", "2023-05-01");
    await userEvent.click(screen.getByTestId("import-confirm"));
    expect(onImport.mock.calls[0][0][0].map((row: { number: number }) => row.number)).toEqual([2, 3]);
  });

  it("narrows by the Elo slider from the keyboard, and turns Import off when nothing is left", async () => {
    const user = userEvent.setup();
    render(<CollectionImportDialog source={ONE_FILE} onCancel={() => {}} onImport={() => {}} testId="import" />);
    const [low] = within(screen.getByTestId("import-elo")).getAllByRole("slider");
    low.focus();
    await user.keyboard("{Shift>}{ArrowRight}{/Shift}");
    expect(screen.getByTestId("import-elo-value")).toHaveTextContent("1550 – 2100");
    // Both players within: only Bob (1640) – Dana (2100) is left.
    expect(screen.getByTestId("import-count")).toHaveTextContent("1 of 3");
    fireEvent.change(screen.getByTestId("import-from"), { target: { value: "2030-01-01" } });
    expect(screen.getByTestId("import-confirm")).toBeDisabled();
  });

  it("lists a zip's files, and offers no filters where the games carry nothing to filter on", () => {
    const { unmount } = render(<CollectionImportDialog source={ZIP} onCancel={() => {}} onImport={() => {}} testId="import" />);
    expect(screen.getByTestId("import-file-1")).toHaveTextContent("מועדון.pgn");
    expect(screen.getByTestId("import-several")).toBeInTheDocument();
    unmount();
    render(<CollectionImportDialog source={PASTE} onCancel={() => {}} onImport={() => {}} testId="import" />);
    expect(screen.queryByTestId("import-elo")).toBeNull();
    expect(screen.queryByTestId("import-player")).toBeNull();
  });

  it("cancels from Escape, and shows the last problem", async () => {
    const onCancel = vi.fn();
    render(<CollectionImportDialog source={ONE_FILE} problem="It failed." onCancel={onCancel} onImport={() => {}} testId="import" intoName="Club games" />);
    expect(screen.getByTestId("import-problem")).toHaveTextContent("It failed.");
    expect(screen.getByRole("dialog")).toHaveTextContent("Club games");
    await userEvent.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalled();
  });
});

describe("CollectionImportDialog — Split by event (CTA-127)", () => {
  const importWith = (onImport: (kept: CollectionRow[][], splitByEvent: boolean) => void, source: CollectionImportSource = ONE_FILE) =>
    render(<CollectionImportDialog source={source} onCancel={() => {}} onImport={onImport} testId="import" />);

  it("offers the split on every new-collection import, on by the reader, and hands the choice over", async () => {
    const onImport = vi.fn();
    importWith(onImport);
    const split = screen.getByTestId("import-split");
    expect(split).not.toBeDisabled();
    expect(screen.getByTestId("import-split-help")).toHaveTextContent("one collection per event");
    await expectNoAxeViolations(screen.getByRole("dialog"));
    await userEvent.click(split);
    await userEvent.click(screen.getByTestId("import-confirm"));
    expect(onImport.mock.calls[0][1]).toBe(true);
  });

  it("is off with its reason where every kept game shares one Event", () => {
    importWith(() => {}, ONE_EVENT);
    const split = screen.getByTestId("import-split");
    expect(split).toBeDisabled();
    expect(split).not.toBeChecked();
    expect(screen.getByTestId("import-split-help")).toHaveTextContent("share one Event");
  });

  it("is off with its reason where no kept game has an Event", () => {
    importWith(() => {}, PASTE);
    expect(screen.getByTestId("import-split")).toBeDisabled();
    expect(screen.getByTestId("import-split-help")).toHaveTextContent("no game kept has an Event");
  });

  it("follows the filters: what the Elo range leaves decides whether there is anything to split", () => {
    importWith(() => {});
    // All three games kept: two events, so the split is on offer.
    expect(screen.getByTestId("import-split")).not.toBeDisabled();
    // Only the two "Club" games (2023) are in range — one event left, nothing to split.
    fireEvent.change(screen.getByTestId("import-from"), { target: { value: "2023-01-01" } });
    fireEvent.change(screen.getByTestId("import-to"), { target: { value: "2023-12-31" } });
    const split = screen.getByTestId("import-split");
    expect(split).toBeDisabled();
    expect(screen.getByTestId("import-split-help")).toHaveTextContent("share one Event");
  });

  it("is never offered on Add games", () => {
    render(
      <CollectionImportDialog source={ONE_FILE} onCancel={() => {}} onImport={() => {}} testId="import" intoName="Club games" />,
    );
    expect(screen.queryByTestId("import-split")).toBeNull();
  });
});
