import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import CasesList, { type CasesListProps } from "./CasesList";
import { CASES } from "./fixtures";

const mount = (props: Partial<CasesListProps> = {}) =>
  render(
    <CasesList
      cases={CASES}
      caseLink={(id) => ({ href: `/case/${id}` })}
      onCaseAction={() => {}}
      testId="probe"
      {...props}
    />,
  );

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("CasesList (CTA-186)", () => {
  it("names each Case — its own name, else its game's tags or its position — with its type and date", async () => {
    const { container } = mount();
    expect(screen.getByRole("list", { name: "Cases" })).toBeInTheDocument();
    expect(screen.getByTestId("probe-case-cgame")).toHaveTextContent("Carlsen – Caruana, Club Championship, 2024");
    expect(screen.getByTestId("probe-case-cgame")).toHaveTextContent("Game");
    expect(screen.getByTestId("probe-case-cpos")).toHaveTextContent("Black to move, move 41");
    expect(screen.getByTestId("probe-case-cpos")).toHaveTextContent("Position");
    expect(screen.getByTestId("probe-case-cpos")).toHaveTextContent("Updated Oct 12, 2026");
    expect(screen.getByRole("link", { name: "Open Lucena position" })).toHaveAttribute("href", "/case/cnamed");
    await expectNoAxeViolations(container);
  });

  it("hands each action its Case, and keeps Move off without another Project", async () => {
    const onCaseAction = vi.fn();
    const user = userEvent.setup();
    mount({ onCaseAction, canMove: false });
    expect(screen.getByRole("button", { name: "Move Lucena position" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Rename Lucena position" }));
    expect(onCaseAction).toHaveBeenCalledWith("rename", CASES[2]);
  });

  it("says when the Project has none", () => {
    mount({ cases: [] });
    expect(screen.getByTestId("probe-empty")).toHaveTextContent("No cases in this project yet.");
  });
});
