import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import CollectionMergeDialog, { type CollectionMergeDialogProps } from "./CollectionMergeDialog";
import { CANDIDATES, DEFAULTS, DONE, DONE_NO_DUPLICATES, FOUR, ONE, TOO_LARGE, TWO } from "./fixtures";

/*
  **The merge dialog** (CTA-232): the form and Merge — off below two
  collections, a note saying why — a refusal said in it, and, done, its
  result: what was made, Open collection, Download PGN, Close.
*/

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

const mount = (extra: Partial<CollectionMergeDialogProps> = {}) => {
  const props: CollectionMergeDialogProps = {
    open: true,
    onClose: vi.fn(),
    sources: TWO,
    onSourcesChange: vi.fn(),
    candidates: CANDIDATES,
    settings: DEFAULTS,
    onChange: vi.fn(),
    onMerge: vi.fn(),
    onDownload: vi.fn(),
    testId: "probe",
    ...extra,
  };
  render(<CollectionMergeDialog {...props} />);
  return props;
};

describe("CollectionMergeDialog (CTA-232)", () => {
  it("is a dialog named by its title, the form in it, and Merge merges", async () => {
    const user = userEvent.setup();
    const props = mount();
    const dialog = screen.getByRole("dialog", { name: "Merge collections" });
    expect(screen.getByRole("list", { name: "Collections to merge" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Merge" }));
    expect(props.onMerge).toHaveBeenCalledTimes(1);
    await expectNoAxeViolations(dialog);
  });

  it("keeps Merge off below two collections, a note saying why", async () => {
    const user = userEvent.setup();
    const props = mount({ sources: ONE });
    const merge = screen.getByRole("button", { name: "Merge" });
    expect(merge).toBeDisabled();
    expect(merge).toHaveAccessibleDescription("Add at least one more collection to merge.");
    await user.keyboard("{Control>}{Enter}{/Control}");
    expect(props.onMerge).not.toHaveBeenCalled();
  });

  it("says a refusal in the dialog", async () => {
    mount({ sources: FOUR, error: TOO_LARGE });
    expect(screen.getByRole("alert")).toHaveTextContent(TOO_LARGE);
    await expectNoAxeViolations(screen.getByRole("dialog"));
  });

  it("changes nothing and cannot be cancelled while the merge is under way", () => {
    mount({ busy: true });
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Name" })).toBeDisabled();
  });

  it("done: says what was made, announced, with Open collection, Download PGN and Close", async () => {
    const user = userEvent.setup();
    const props = mount({ done: DONE });
    const dialog = screen.getByRole("dialog", { name: "Collections merged" });
    expect(screen.getByRole("status")).toHaveTextContent("“Mikhail Tal + 1 more” holds 4,589 games.64 duplicates were left out.");
    expect(screen.getByRole("link", { name: "Open collection" })).toHaveAttribute("href", "/library/u1");

    await user.click(screen.getByRole("button", { name: "Download PGN" }));
    expect(props.onDownload).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(props.onClose).toHaveBeenCalledTimes(1);
    await expectNoAxeViolations(dialog);
  });

  it("done with no duplicate says nothing of duplicates", () => {
    mount({ done: DONE_NO_DUPLICATES });
    expect(screen.getByRole("status")).toHaveTextContent(/^“Soviet champions” holds 1 game\.$/);
  });

  it("passes axe in Hebrew", async () => {
    await i18n.changeLanguage("he");
    mount();
    expect(screen.getByRole("dialog", { name: "מיזוג אוספים" })).toBeInTheDocument();
    await expectNoAxeViolations(screen.getByRole("dialog"));
  });
});
