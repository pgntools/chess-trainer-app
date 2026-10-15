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

  describe("the tournament mark (CTA-142)", () => {
    it("offers a one-event import the settings' tournament fields, the type its games look like with an Apply", async () => {
      const user = userEvent.setup();
      const onImport = vi.fn();
      render(<CollectionImportDialog source={ONE_EVENT} onCancel={() => {}} onImport={onImport} testId="import" />);
      expect(screen.getByTestId("import-mark-suggestion-text")).toHaveTextContent("Swiss system: 3 players, each meeting a few of the others.");
      expect(screen.getByTestId("import-mark-tournament-switch")).not.toBeChecked();
      await expectNoAxeViolations(screen.getByRole("dialog"));

      // Left off: no mark — the collection stays undecided, its table suggests it later.
      await user.click(screen.getByTestId("import-confirm"));
      expect(onImport.mock.calls[0][2]).toEqual({});

      await user.click(screen.getByRole("button", { name: "Apply the suggested type, Swiss system" }));
      await user.click(screen.getByTestId("import-mark-type-roundRobin"));
      await user.click(screen.getByTestId("import-confirm"));
      expect(onImport.mock.calls[1][2]).toEqual({ mark: { enabled: true, type: "roundRobin" } });
    });

    it("turns the switch on with the guessed type", async () => {
      const user = userEvent.setup();
      const onImport = vi.fn();
      render(<CollectionImportDialog source={ONE_EVENT} onCancel={() => {}} onImport={onImport} testId="import" />);
      await user.click(screen.getByTestId("import-mark-tournament-switch"));
      expect(screen.getByTestId("import-mark-type-swiss")).toBeChecked();
    });

    it("offers no mark for several events, nor on Add games", () => {
      const { unmount } = render(<CollectionImportDialog source={ONE_FILE} onCancel={() => {}} onImport={() => {}} testId="import" />);
      expect(screen.queryByTestId("import-mark-tournament-switch")).toBeNull();
      unmount();
      render(<CollectionImportDialog source={ONE_EVENT} intoName="Rated" onCancel={() => {}} onImport={() => {}} testId="import" />);
      expect(screen.queryByTestId("import-mark-tournament-switch")).toBeNull();
    });

    it("on a split, lists every event in a table, each type set to the guess and changeable before Import", async () => {
      const user = userEvent.setup();
      const onImport = vi.fn();
      render(<CollectionImportDialog source={ONE_FILE} onCancel={() => {}} onImport={onImport} testId="import" />);
      expect(screen.queryByTestId("import-auto-type")).toBeNull();
      await user.click(screen.getByTestId("import-split"));
      expect(screen.getByTestId("import-auto-type")).toBeChecked();
      const table = screen.getByRole("table", { name: "Each event's tournament type" });
      const rows = within(table).getAllByRole("row").slice(1);
      expect(rows).toHaveLength(2);
      // Club: two games, three players, its dates — its games tell a Swiss.
      expect(rows[0]).toHaveTextContent(/Club\s*2\s*3\s*2023\.04\.02 – 2023\.05\.10/);
      expect(screen.getByTestId("import-event-types-type-0")).toHaveValue("swiss");
      // Spring Open's one game tells nothing: not a tournament, unless the reader says so.
      expect(screen.getByTestId("import-event-types-type-1")).toHaveValue("");
      await expectNoAxeViolations(screen.getByRole("dialog"));

      // Change both: Club to a round robin, Spring Open to a match.
      await user.click(screen.getByRole("combobox", { name: "Type: Club" }));
      await user.click(screen.getByRole("option", { name: "Round robin" }));
      await user.click(screen.getByRole("combobox", { name: "Type: Spring Open" }));
      await user.click(screen.getByRole("option", { name: "Match play" }));
      await user.click(screen.getByTestId("import-confirm"));
      expect(onImport.mock.calls[0][1]).toBe(true);
      const { eventType } = onImport.mock.calls[0][2];
      expect(eventType(0, "Club")).toBe("roundRobin");
      expect(eventType(0, "Spring Open")).toBe("match");

      // The switch off: nothing is marked.
      await user.click(screen.getByTestId("import-auto-type"));
      expect(screen.queryByRole("table", { name: "Each event's tournament type" })).toBeNull();
      await user.click(screen.getByTestId("import-confirm"));
      expect(onImport.mock.calls[1][2]).toEqual({});
    });
  });
});

describe("CollectionImportDialog — a plain choice of games (CTA-186)", () => {
  it("keeps the filters and the count, under the host's title and button, with no split and no mark", async () => {
    const onImport = vi.fn();
    render(
      <CollectionImportDialog
        source={ONE_EVENT}
        choiceOnly={{ title: "Choose the games for the project", confirmLabel: "Create project" }}
        onCancel={() => {}}
        onImport={onImport}
        testId="import"
      />,
    );
    expect(screen.getByRole("dialog", { name: "Choose the games for the project" })).toBeInTheDocument();
    expect(screen.queryByTestId("import-split")).toBeNull();
    expect(screen.queryByTestId("import-mark-tournament-switch")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Create project" }));
    expect(onImport).toHaveBeenCalledWith(expect.any(Array), false, {});
    await expectNoAxeViolations(screen.getByRole("dialog"));
  });

  it("picks games by hand among those the filters keep — numbered across a zip's files (CTA-208)", async () => {
    const onImport = vi.fn();
    render(
      <CollectionImportDialog
        source={ZIP}
        choiceOnly={{
          title: "Choose the games for the project",
          confirmLabel: "Create project",
          selectGames: {
            select: "Select games…",
            change: "Change the selection…",
            clear: "Use every game the filters keep",
            selected: (count) => `${count} picked.`,
          },
        }}
        onCancel={() => {}}
        onImport={onImport}
        testId="import"
      />,
    );
    // The filters first: from May 2023, Carl – Amy, Bob – Dana and the zip's second file's one game.
    fireEvent.change(screen.getByTestId("import-from"), { target: { value: "2023-05-01" } });
    expect(screen.getByTestId("import-count")).toHaveTextContent("3 of 4");

    await userEvent.click(screen.getByRole("button", { name: "Select games…" }));
    const picker = screen.getByRole("dialog", { name: "Select games" });
    // Only the games the filters keep, numbered across the files.
    const rows = within(within(picker).getByRole("table", { name: "Games" })).getAllByRole("row").slice(1);
    expect(rows.map((row) => within(row).getAllByRole("cell")[1]?.textContent)).toEqual(["2", "3", "4"]);
    await userEvent.click(within(picker).getByRole("checkbox", { name: "Select Carl – Amy" }));
    await userEvent.click(within(picker).getByRole("checkbox", { name: "Select כהן – לוי" }));
    await userEvent.click(within(picker).getByRole("button", { name: "Select" }));
    await screen.findByRole("button", { name: "Change the selection…" });
    expect(screen.getByTestId("import-selected")).toHaveTextContent("2 picked.");
    expect(screen.getByTestId("import-count")).toHaveTextContent("2 of 4");

    // A pick the filters then leave out is not kept.
    fireEvent.change(screen.getByTestId("import-from"), { target: { value: "2024-01-01" } });
    expect(screen.getByTestId("import-count")).toHaveTextContent("1 of 4");
    await userEvent.click(screen.getByRole("button", { name: "Create project" }));
    const [[kept]] = onImport.mock.calls;
    // Each file's own rows, by their own numbers.
    expect(kept.map((rows: { number: number }[]) => rows.map((row) => row.number))).toEqual([[], [1]]);

    // Back to every game the filters keep.
    await userEvent.click(screen.getByRole("button", { name: "Use every game the filters keep" }));
    expect(screen.queryByTestId("import-selected")).toBeNull();
    expect(screen.getByTestId("import-count")).toHaveTextContent("2 of 4");
    await expectNoAxeViolations(screen.getByRole("dialog"));
  });
});
