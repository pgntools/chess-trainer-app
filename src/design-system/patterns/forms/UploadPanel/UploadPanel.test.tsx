import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { expectNoAxeViolations } from "../../../../test/axe";
import UploadPanel, { type UploadPanelProps } from "./UploadPanel";

const mount = (props: Partial<UploadPanelProps> = {}) => {
  const onFiles = vi.fn();
  const onSubmit = vi.fn();
  const onPasteChange = vi.fn();
  const view = render(
    <UploadPanel
      fileLabel="Choose a file"
      accept=".pgn"
      onFiles={onFiles}
      pasteLabel="Paste"
      pasteValue=""
      onPasteChange={onPasteChange}
      onSubmit={onSubmit}
      submitLabel="Read"
      testId="probe"
      {...props}
    />,
  );
  return { onFiles, onSubmit, onPasteChange, ...view };
};

describe("UploadPanel", () => {
  it("takes a file through its hidden input", async () => {
    const { onFiles } = mount();
    const file = new File(["1. e4 *"], "a.pgn", { type: "text/plain" });
    await userEvent.upload(screen.getByTestId("probe-input"), file);
    expect(onFiles).toHaveBeenCalledWith([file]);
    await expectNoAxeViolations(screen.getByTestId("probe"));
  });

  it("reads a paste from its button or Ctrl + Enter, never while blank", async () => {
    const user = userEvent.setup();
    const { onSubmit, rerender } = mount();
    expect(screen.getByRole("button", { name: "Read" })).toBeDisabled();
    const props = { fileLabel: "Choose a file", accept: ".pgn", onFiles: () => {}, pasteLabel: "Paste", onPasteChange: () => {}, onSubmit, submitLabel: "Read", testId: "probe" };
    rerender(<UploadPanel {...props} pasteValue="1. e4 *" />);
    await user.click(screen.getByRole("textbox", { name: "Paste" }));
    await user.keyboard("{Control>}{Enter}{/Control}");
    expect(onSubmit).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Read" }));
    expect(onSubmit).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("probe-paste")).toHaveAttribute("dir", "ltr");
  });

  it("says it is reading, and shows a problem with its detail", () => {
    mount({ busy: "Reading…", problem: { message: "Unreadable.", detail: "line 3" }, testIds: { submit: "old-save" } });
    expect(screen.getByRole("status")).toHaveTextContent("Reading…");
    expect(screen.getByRole("alert")).toHaveTextContent("Unreadable.");
    expect(screen.getByTestId("probe-problem-detail")).toHaveTextContent("line 3");
    expect(screen.getByTestId("old-save")).toBeInTheDocument();
  });
});
