import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import CollectionImportDialog from "./CollectionImportDialog";
import { ONE_FILE, PASTE, ZIP } from "./fixtures";

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
