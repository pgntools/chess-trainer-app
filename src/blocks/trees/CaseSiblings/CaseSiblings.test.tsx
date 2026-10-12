import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import CaseSiblings, { type CaseSiblingsProps } from "./CaseSiblings";
import { ROWS } from "./fixtures";

const mount = (props: Partial<CaseSiblingsProps> = {}) =>
  render(
    <CaseSiblings
      projectName="Club"
      rows={ROWS}
      currentId="cpos"
      linkOf={(row) => ({ href: `/case/${row.id}` })}
      closeLink={{ href: "/project" }}
      previous={{ href: "/case/cgame" }}
      next={{ href: "/case/clong" }}
      text=""
      onTextChange={() => {}}
      testId="probe"
      {...props}
    />,
  );

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("CaseSiblings (CTA-186)", () => {
  it("lists the Project's Cases as a tree of links, the open one current, with Close and previous / next", async () => {
    const { container } = mount();
    expect(screen.getByRole("navigation", { name: "Cases of Club" })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: /Carlsen – Caruana/ })).toHaveAttribute("href", "/case/cgame");
    expect(screen.getByTestId("probe-tree-cpos")).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Back to Club" })).toHaveAttribute("href", "/project");
    expect(screen.getByRole("link", { name: "Previous case" })).toHaveAttribute("href", "/case/cgame");
    expect(screen.getByRole("link", { name: "Next case" })).toHaveAttribute("href", "/case/clong");
    await expectNoAxeViolations(container);
  });

  it("hands the words over, and says when they leave nothing", async () => {
    const onTextChange = vi.fn();
    const { unmount } = mount({ onTextChange });
    await userEvent.type(screen.getByRole("searchbox", { name: "Filter cases" }), "l");
    expect(onTextChange).toHaveBeenCalledWith("l");
    unmount();
    mount({ rows: [], text: "zzz", previous: undefined, next: undefined });
    expect(screen.getByTestId("probe-no-match")).toHaveTextContent("No case matches the filter.");
    expect(screen.getByRole("button", { name: "Previous case" })).toBeDisabled();
  });
});
