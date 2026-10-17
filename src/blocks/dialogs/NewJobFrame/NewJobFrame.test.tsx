import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import { COLLECTION_KINDS, REPERTOIRE_KINDS } from "./fixtures";
import NewJobFrame, { type NewJobFrameProps } from "./NewJobFrame";

const mount = (props: Partial<NewJobFrameProps> = {}) => {
  const handlers = { onClose: vi.fn(), onStart: vi.fn(), onKindChange: vi.fn() };
  const view = render(
    <NewJobFrame open kinds={REPERTOIRE_KINDS} kindId={undefined} subjectLabel="My Caro-Kann" testId="new-job" {...handlers} {...props}>
      <label>
        Output name
        <input defaultValue="evaluated" />
      </label>
    </NewJobFrame>,
  );
  return { ...handlers, ...view };
};

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("NewJobFrame (CTA-217)", () => {
  it("offers the kinds as radios, each named and described, Start off until one is chosen — saying why", async () => {
    mount();
    const dialog = screen.getByRole("dialog", { name: "New job" });
    expect(within(dialog).getByTestId("new-job-subject")).toHaveTextContent("For My Caro-Kann");
    const group = within(dialog).getByRole("radiogroup", { name: "Kind of job" });
    const evaluation = within(group).getByRole("radio", { name: "Repertoire evaluation" });
    expect(evaluation).toHaveAccessibleDescription(/Every position of the repertoire searched/);
    expect(evaluation).not.toBeChecked();
    // No kind chosen: no form, Start off and why.
    expect(within(dialog).queryByLabelText("Output name")).toBeNull();
    const start = within(dialog).getByRole("button", { name: "Start" });
    expect(start).toBeDisabled();
    expect(start).toHaveAccessibleDescription("Choose a kind of job.");
    await expectNoAxeViolations(dialog);
  });

  it("says why a kind cannot start here, and does not let it be chosen", () => {
    mount();
    const coverage = screen.getByRole("radio", { name: "Coverage holes" });
    expect(coverage).toBeDisabled();
    expect(coverage).toHaveAccessibleDescription(/Not available: needs opening statistics/);
  });

  it("reports a choice from the keyboard", async () => {
    const user = userEvent.setup();
    const { onKindChange } = mount({ kinds: COLLECTION_KINDS.map((kind) => ({ ...kind, disabledReason: undefined })) });
    screen.getByRole("radio", { name: "Opening report" }).focus();
    await user.keyboard(" ");
    expect(onKindChange).toHaveBeenLastCalledWith("library.opening-report");
    await user.keyboard("{ArrowDown}");
    expect(onKindChange).toHaveBeenLastCalledWith("library.move-search");
  });

  it("shows the chosen kind's form, and starts — from Start, and from Enter in a field", async () => {
    const user = userEvent.setup();
    const { onStart } = mount({ kindId: "repertoire.evaluation" });
    expect(screen.getByRole("radio", { name: "Repertoire evaluation" })).toBeChecked();
    expect(screen.getByLabelText("Output name")).toBeInTheDocument();
    const start = screen.getByRole("button", { name: "Start" });
    expect(start).toBeEnabled();
    expect(start).not.toHaveAttribute("aria-describedby");
    await user.click(start);
    expect(onStart).toHaveBeenCalledTimes(1);
    await user.click(screen.getByLabelText("Output name"));
    await user.keyboard("{Enter}");
    expect(onStart).toHaveBeenCalledTimes(2);
    await expectNoAxeViolations(screen.getByRole("dialog"));
  });

  it("holds Start while the form says why", async () => {
    const user = userEvent.setup();
    const { onStart } = mount({ kindId: "repertoire.evaluation", startBlockedNote: "Pick at least two collections." });
    const start = screen.getByRole("button", { name: "Start" });
    expect(start).toBeDisabled();
    expect(start).toHaveAccessibleDescription("Pick at least two collections.");
    await user.click(screen.getByLabelText("Output name"));
    await user.keyboard("{Enter}");
    expect(onStart).not.toHaveBeenCalled();
  });

  it("does not take a kind that cannot start as chosen", () => {
    mount({ kindId: "repertoire.coverage" });
    expect(screen.getByRole("button", { name: "Start" })).toBeDisabled();
    expect(screen.queryByLabelText("Output name")).toBeNull();
  });

  it("says a refusal as an alert beside Start", () => {
    mount({ kindId: "repertoire.evaluation", problem: "The job could not be queued." });
    expect(screen.getByRole("alert")).toHaveTextContent("The job could not be queued.");
    expect(screen.getByRole("button", { name: "Start" })).toBeEnabled();
  });

  it("holds everything while being queued, and cancels otherwise", async () => {
    const user = userEvent.setup();
    const busy = mount({ kindId: "repertoire.evaluation", busy: true });
    expect(screen.getByRole("button", { name: "Start" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: "Repertoire evaluation" })).toBeDisabled();
    busy.unmount();
    const { onClose } = mount();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("says when no kind applies", () => {
    mount({ kinds: [] });
    expect(screen.getByTestId("new-job-kinds")).toHaveTextContent("No kind of job applies here.");
    expect(screen.getByRole("button", { name: "Start" })).toHaveAccessibleDescription("No kind of job applies here.");
  });

  it("takes its own title, and the reader's words in Hebrew", async () => {
    await i18n.changeLanguage("he");
    mount({ title: "הערכה" });
    expect(screen.getByRole("dialog", { name: "הערכה" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "התחלה" })).toHaveAccessibleDescription("בחרו סוג משימה.");
  });
});
