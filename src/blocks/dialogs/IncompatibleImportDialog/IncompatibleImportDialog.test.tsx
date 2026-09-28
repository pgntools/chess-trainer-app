import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import { NEWER, NOT_ZIP, PGN_FILES } from "./fixtures";
import IncompatibleImportDialog, { type IncompatibleImportDialogProps } from "./IncompatibleImportDialog";

const mount = (props: Partial<IncompatibleImportDialogProps> = {}) => {
  const onClose = vi.fn();
  render(
    <IncompatibleImportDialog
      fileName="old.zip"
      problem={NEWER}
      pgnFiles={PGN_FILES}
      manualLink={(kind) => ({ href: `#${kind}` })}
      onClose={onClose}
      testId="imp"
      {...props}
    />,
  );
  return { onClose };
};

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("IncompatibleImportDialog", () => {
  it("says what is wrong with the file, in a dialog named for it", () => {
    mount();
    expect(screen.getByRole("dialog", { name: "This file cannot be imported" })).toBeInTheDocument();
    expect(screen.getByTestId("imp-incompatible-problem")).toHaveTextContent("made by a newer version of the app (format 3)");
  });

  it("links to where each kind of PGN comes in by hand, and lists the files left to right", () => {
    mount();
    expect(screen.getByRole("link", { name: "a collection — the Library's upload" })).toHaveAttribute("href", "#collections");
    expect(screen.getByTestId("imp-incompatible-repertoires")).toHaveAttribute("href", "#repertoires");
    expect(screen.getByText("games.pgn")).toHaveAttribute("dir", "ltr");
  });

  it("says when the zip holds no PGN files", () => {
    mount({ problem: NOT_ZIP, pgnFiles: [] });
    expect(screen.getByTestId("imp-incompatible-files")).toHaveTextContent("It holds no PGN files.");
  });

  it("closes", async () => {
    const { onClose } = mount();
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("passes axe", async () => {
    mount();
    await expectNoAxeViolations();
  });
});
