import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import { ANNOTATED, ANNOTATED_FEN } from "./fixtures";
import PgnExportPanel from "./PgnExportPanel";

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("PgnExportPanel", () => {
  it("shows the FEN and the whole PGN, each a labelled field to copy", async () => {
    render(<PgnExportPanel fen={ANNOTATED_FEN} tree={ANNOTATED} onDownload={() => {}} testId="probe" />);
    expect(screen.getByRole("textbox", { name: "Current FEN" })).toHaveValue(ANNOTATED_FEN);
    const pgn = screen.getByTestId("probe-export-pgn");
    expect((pgn as HTMLTextAreaElement).value).toContain("The best by test");
    expect((pgn as HTMLTextAreaElement).value).toContain("(2. c3");
    expect((pgn as HTMLTextAreaElement).value).toContain("$1");
    await expectNoAxeViolations(screen.getByTestId("probe-export"));
  });

  it("leaves out what is switched off, from the keyboard, and downloads what is shown", async () => {
    const user = userEvent.setup();
    const onDownload = vi.fn();
    render(<PgnExportPanel fen={ANNOTATED_FEN} tree={ANNOTATED} onDownload={onDownload} testId="probe" />);
    screen.getByRole("switch", { name: "Comments" }).focus();
    await user.keyboard(" ");
    await user.tab();
    await user.keyboard(" ");
    await user.tab();
    await user.keyboard(" ");
    const pgn = screen.getByTestId("probe-export-pgn");
    expect((pgn as HTMLTextAreaElement).value).not.toContain("The best by test");
    expect((pgn as HTMLTextAreaElement).value).not.toContain("(2. c3");
    await user.click(screen.getByRole("button", { name: "Download .pgn" }));
    expect(onDownload).toHaveBeenCalledWith((pgn as HTMLTextAreaElement).value);
  });
});
