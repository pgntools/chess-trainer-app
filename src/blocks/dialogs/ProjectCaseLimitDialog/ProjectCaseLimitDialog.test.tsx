import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import ProjectCaseLimitDialog, { type ProjectCaseLimitDialogProps } from "./ProjectCaseLimitDialog";
import { FROM_LIBRARY, INTO_PROJECT, NEW_PROJECT, STORAGE_PROBLEM } from "./fixtures";

const mount = (props: Partial<ProjectCaseLimitDialogProps> = {}) => {
  const onCollection = vi.fn();
  const onCreateAnyway = vi.fn();
  const onClose = vi.fn();
  render(
    <ProjectCaseLimitDialog
      open
      {...NEW_PROJECT}
      onCollection={onCollection}
      onCreateAnyway={onCreateAnyway}
      onClose={onClose}
      testId="probe"
      {...props}
    />,
  );
  return { onCollection, onCreateAnyway, onClose };
};

describe("ProjectCaseLimitDialog", () => {
  it("is a dialog named by its title, saying how many cases a new Project would hold and suggesting a collection", async () => {
    mount();
    const dialog = screen.getByRole("dialog", { name: "A large project" });
    expect(screen.getByTestId("probe-message")).toHaveTextContent(
      "These games make 15,905 cases — and a project of more than 1,000 cases is slow to open and to work in.",
    );
    expect(screen.getByTestId("probe-suggestion")).toHaveTextContent("a Library collection suits better");
    expect(screen.getByRole("button", { name: "Create a Library collection instead" })).toBeInTheDocument();
    await expectNoAxeViolations(dialog);
  });

  it("counts the Cases a Project holds already into the total", () => {
    mount(INTO_PROJECT);
    expect(screen.getByTestId("probe-message")).toHaveTextContent(
      "These games make 400 cases. With the 850 the project holds already, it would hold 1,250",
    );
  });

  it("words the collection for games out of the Library", async () => {
    mount(FROM_LIBRARY);
    expect(screen.getByTestId("probe-suggestion")).toHaveTextContent("These games are in the Library already.");
    expect(screen.getByRole("button", { name: "Save them as a Library collection instead" })).toBeInTheDocument();
    await expectNoAxeViolations(screen.getByRole("dialog"));
  });

  it("answers each of its three actions", async () => {
    const user = userEvent.setup();
    const { onCollection, onCreateAnyway, onClose } = mount();
    await user.click(screen.getByRole("button", { name: "Create a Library collection instead" }));
    expect(onCollection).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Create anyway" }));
    expect(onCreateAnyway).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("is locked while the collection is made, and says a refusal in the dialog", async () => {
    const user = userEvent.setup();
    const { onClose } = mount({ busy: true, error: STORAGE_PROBLEM });
    for (const name of ["Cancel", "Create anyway", "Create a Library collection instead"]) {
      expect(screen.getByRole("button", { name })).toBeDisabled();
    }
    await user.keyboard("{Escape}");
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(STORAGE_PROBLEM);
    await expectNoAxeViolations(screen.getByRole("dialog"));
  });
});
