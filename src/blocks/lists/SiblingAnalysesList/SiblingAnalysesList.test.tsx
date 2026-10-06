import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { expectNoAxeViolations } from "../../../test/axe";
import SiblingAnalysesList from "./SiblingAnalysesList";
import { CURRENT, CUT_LABELS, LABELS, SIBLINGS } from "./fixtures";

const mount = (props: Partial<React.ComponentProps<typeof SiblingAnalysesList>> = {}) =>
  render(<SiblingAnalysesList testId="probe" items={SIBLINGS} currentId={CURRENT} labels={LABELS} onClose={() => {}} {...props} />);

describe("SiblingAnalysesList", () => {
  it("is a named navigation landmark over an ordered list of links to every analysis", async () => {
    mount();
    const nav = screen.getByRole("navigation", { name: LABELS.region });
    expect(within(nav).getByRole("heading", { name: LABELS.title })).toBeInTheDocument();
    const rows = within(within(nav).getByRole("list")).getAllByRole("link");
    expect(rows.map((row) => row.textContent)).toEqual(SIBLINGS.map((sibling) => sibling.name));
    expect(rows[0]).toHaveAttribute("href", "#a1");
    expect(screen.getByTestId("probe-position")).toHaveTextContent(LABELS.position);
    await expectNoAxeViolations(nav);
  });

  it("marks the current analysis for assistive technology, and no other", () => {
    mount();
    const current = screen.getByRole("link", { current: true });
    expect(current).toBe(screen.getByTestId("probe-item-a3"));
    expect(screen.getAllByRole("link", { current: true })).toHaveLength(1);
  });

  it("closes from its named button, by the keyboard too", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    mount({ onClose });
    const close = screen.getByRole("button", { name: LABELS.close });
    close.focus();
    await user.keyboard("{Enter}");
    await user.click(close);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("disables the other analyses while locked and says why, the current one staying", async () => {
    mount({ locked: true });
    expect(screen.getByTestId("probe-locked")).toHaveTextContent(LABELS.locked);
    expect(screen.getByTestId("probe-item-a1")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByTestId("probe-item-a3")).not.toHaveAttribute("aria-disabled");
    await expectNoAxeViolations(screen.getByTestId("probe"));
  });

  it("shows no lock note otherwise", () => {
    mount();
    expect(screen.queryByTestId("probe-locked")).toBeNull();
    expect(screen.getByTestId("probe-item-a1")).not.toHaveAttribute("aria-disabled");
  });

  it("says how many analyses were left off a cut list, either end", () => {
    mount({ labels: CUT_LABELS, hiddenBefore: 139, hiddenAfter: 360 });
    expect(screen.getByTestId("probe-more-before")).toHaveTextContent(CUT_LABELS.moreBefore);
    expect(screen.getByTestId("probe-more-after")).toHaveTextContent(CUT_LABELS.moreAfter);
  });

  it("has no cut notes for a whole list", () => {
    mount();
    expect(screen.queryByTestId("probe-more-before")).toBeNull();
    expect(screen.queryByTestId("probe-more-after")).toBeNull();
  });
});
