import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import { NO_JOB_QUEUE_FILTERS } from "./filterValues";
import { ENTITY_TYPES, KINDS, ONE_ENTITY_TYPE, ONE_KIND, SOME_FILTERS } from "./fixtures";
import JobQueueFilters, { type JobQueueFiltersProps } from "./JobQueueFilters";

const mount = (props: Partial<JobQueueFiltersProps> = {}) => {
  const onChange = vi.fn();
  const onClear = vi.fn();
  render(
    <JobQueueFilters
      values={NO_JOB_QUEUE_FILTERS}
      onChange={onChange}
      onClear={onClear}
      kinds={KINDS}
      entityTypes={ENTITY_TYPES}
      testId="filters"
      {...props}
    />,
  );
  return { onChange, onClear };
};

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("JobQueueFilters (CTA-217)", () => {
  it("filters by status, kind and what a job is applied to, each with an 'any' first, Clear off while none is on", async () => {
    mount();
    expect(screen.getByRole("heading", { name: "Filters" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Status" })).toHaveTextContent("Any status");
    expect(screen.getByRole("combobox", { name: "Kind" })).toHaveTextContent("Any kind");
    expect(screen.getByRole("combobox", { name: "Applied to" })).toHaveTextContent("Anything");
    expect(screen.getByRole("button", { name: "Clear filters" })).toBeDisabled();
    await expectNoAxeViolations(screen.getByTestId("filters"));
  });

  it("offers every status in words, and reports a choice as a patch", async () => {
    const user = userEvent.setup();
    const { onChange } = mount();
    await user.click(screen.getByRole("combobox", { name: "Status" }));
    const options = within(screen.getByRole("listbox")).getAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual([
      "Any status",
      "Running",
      "Queued",
      "Paused",
      "Interrupted",
      "Failed",
      "Cancelled",
      "Done",
    ]);
    await user.click(within(screen.getByRole("listbox")).getByRole("option", { name: "Failed" }));
    expect(onChange).toHaveBeenLastCalledWith({ status: "failed" });

    await user.click(screen.getByRole("combobox", { name: "Kind" }));
    await user.click(within(screen.getByRole("listbox")).getByRole("option", { name: "Collection merge" }));
    expect(onChange).toHaveBeenLastCalledWith({ kind: "library.collection-merge" });

    await user.click(screen.getByRole("combobox", { name: "Applied to" }));
    await user.click(within(screen.getByRole("listbox")).getByRole("option", { name: "A repertoire" }));
    expect(onChange).toHaveBeenLastCalledWith({ entityType: "repertoire" });
  });

  it("shows the values on, and clears from the keyboard", async () => {
    const user = userEvent.setup();
    const { onClear } = mount({ values: SOME_FILTERS });
    expect(screen.getByRole("combobox", { name: "Status" })).toHaveTextContent("Failed");
    expect(screen.getByRole("combobox", { name: "Kind" })).toHaveTextContent("Repertoire evaluation");
    screen.getByRole("button", { name: "Clear filters" }).focus();
    await user.keyboard("{Enter}");
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("leaves out a filter with nothing to choose between — unless it is on", () => {
    mount({ kinds: ONE_KIND, entityTypes: ONE_ENTITY_TYPE });
    expect(screen.getByRole("combobox", { name: "Status" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Kind" })).toBeNull();
    expect(screen.queryByRole("combobox", { name: "Applied to" })).toBeNull();
  });

  it("keeps a filter that is on even when its choices shrink", () => {
    mount({ kinds: ONE_KIND, values: { ...NO_JOB_QUEUE_FILTERS, kind: "analysis.computer-analysis" } });
    expect(screen.getByRole("combobox", { name: "Kind" })).toHaveTextContent("Computer analysis");
  });
});
