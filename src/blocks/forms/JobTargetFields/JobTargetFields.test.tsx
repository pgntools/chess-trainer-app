import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import { PROJECTS, SOURCE_PROJECT } from "./fixtures";
import JobTargetFields from "./JobTargetFields";
import { initialJobTarget, jobTargetProblem, type JobTargetChoice } from "./jobTarget";

const renderFields = (value: JobTargetChoice, projects = PROJECTS) => {
  const onChange = vi.fn();
  render(<JobTargetFields value={value} onChange={onChange} projectName={SOURCE_PROJECT} projects={projects} testId="target" />);
  return onChange;
};

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("JobTargetFields (CTA-188)", () => {
  it("offers the three places, the source's Project named, and says what the one chosen does", async () => {
    const onChange = renderFields(initialJobTarget("x"));
    expect(screen.getByRole("radiogroup", { name: "Results go to" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: `New Cases in this project (${SOURCE_PROJECT})` })).toBeChecked();
    expect(screen.getByText("Each variant ticked becomes a new Game Case beside this one, linked from it.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("radio", { name: "Into this Case" }));
    expect(onChange).toHaveBeenCalledWith({ kind: "case" });
    await expectNoAxeViolations();
  });

  it("asks a new project's name, and says when it is missing", async () => {
    const onChange = renderFields({ ...initialJobTarget(""), kind: "other" });
    expect(screen.getByRole("radio", { name: "A new project" })).toBeChecked();
    expect(screen.getByText("A new project needs a name.")).toBeInTheDocument();
    await userEvent.type(screen.getByRole("textbox", { name: "The new project's name" }), "N");
    expect(onChange).toHaveBeenLastCalledWith({ newName: "N" });
  });

  it("lists the other Projects for an existing one", async () => {
    const onChange = renderFields({ kind: "other", otherMode: "existing", newName: "", projectId: null });
    await userEvent.click(screen.getByRole("combobox", { name: "Project" }));
    await userEvent.click(screen.getByRole("option", { name: "Endgames" }));
    expect(onChange).toHaveBeenCalledWith({ projectId: "p-other" });
  });

  it("turns an existing project off where there is none", () => {
    renderFields({ ...initialJobTarget(""), kind: "other" }, []);
    expect(screen.getByRole("radio", { name: "An existing project" })).toBeDisabled();
  });

  it("says why a choice cannot be sent", () => {
    expect(jobTargetProblem(initialJobTarget(""))).toBeUndefined();
    expect(jobTargetProblem({ ...initialJobTarget(" "), kind: "other" })).toBe("name");
    expect(jobTargetProblem({ kind: "other", otherMode: "existing", newName: "", projectId: null })).toBe("project");
    expect(jobTargetProblem({ kind: "other", otherMode: "existing", newName: "", projectId: "p" })).toBeUndefined();
  });
});
