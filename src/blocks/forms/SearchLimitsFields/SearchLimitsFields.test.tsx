import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import { DEEP, DEFAULTS, INSTANT, OFF_THE_MARKS } from "./fixtures";
import SearchLimitsFields from "./SearchLimitsFields";

const mount = (limits: { depth: number; moveTimeMs: number } = DEFAULTS) => {
  const onChange = vi.fn();
  render(<SearchLimitsFields depth={limits.depth} moveTimeMs={limits.moveTimeMs} onChange={onChange} testId="limits" />);
  return { onChange };
};

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("SearchLimitsFields — where a search stops (CTA-185)", () => {
  it("offers the depth and the move time, each a slider and a number box", () => {
    mount(DEEP);
    expect(screen.getByRole("slider", { name: "Search depth" })).toHaveAttribute("aria-valuenow", "34");
    expect(screen.getByRole("spinbutton", { name: "Search depth, typed" })).toHaveValue(34);
    // A minute is the 60 s mark — slot 4 of 1, 5, 10, 30, 60, 300, 600, ∞.
    expect(screen.getByRole("slider", { name: "Move time" })).toHaveAttribute("aria-valuenow", "4");
    expect(screen.getByRole("spinbutton", { name: "Move time in seconds, typed" })).toHaveValue(60);
  });

  it("reports each change as a patch — the slider and the box alike", async () => {
    const user = userEvent.setup();
    const { onChange } = mount(DEEP);
    screen.getByRole("slider", { name: "Search depth" }).focus();
    await user.keyboard("{ArrowLeft}");
    expect(onChange).toHaveBeenLastCalledWith({ depth: 33 });
    screen.getByRole("slider", { name: "Move time" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenLastCalledWith({ moveTimeMs: 300000 });
    const box = screen.getByRole("spinbutton", { name: "Move time in seconds, typed" });
    await user.clear(box);
    await user.type(box, "0");
    // 0 seconds is the instant reply, never "no limit".
    expect(onChange).toHaveBeenLastCalledWith({ moveTimeMs: 1 });
  });

  it("shows a move time off the marks where it falls, and the instant reply on the first mark", () => {
    mount(OFF_THE_MARKS);
    expect(screen.getByRole("slider", { name: "Move time" })).toHaveAttribute("aria-valuenow", "1.5");
    expect(screen.getByRole("spinbutton", { name: "Move time in seconds, typed" })).toHaveValue(7.5);
  });

  it("says the instant reply as 0s", () => {
    mount(INSTANT);
    expect(screen.getByRole("slider", { name: "Move time" })).toHaveAttribute("aria-valuetext", "0s");
    expect(screen.getByRole("spinbutton", { name: "Move time in seconds, typed" })).toHaveValue(0);
  });

  it("turns the move time's box off on ∞ — never the depth's", () => {
    mount(DEFAULTS);
    expect(screen.getByRole("slider", { name: "Move time" })).toHaveAttribute("aria-valuetext", "No limit");
    expect(screen.getByRole("spinbutton", { name: "Move time in seconds, typed" })).toBeDisabled();
    expect(screen.getByRole("spinbutton", { name: "Search depth, typed" })).toBeEnabled();
  });

  it("passes axe, in English and Hebrew", async () => {
    const { unmount } = render(<SearchLimitsFields depth={20} moveTimeMs={5000} onChange={() => {}} testId="limits" />);
    await expectNoAxeViolations();
    unmount();
    await i18n.changeLanguage("he");
    mount(DEEP);
    await expectNoAxeViolations();
  });
});
