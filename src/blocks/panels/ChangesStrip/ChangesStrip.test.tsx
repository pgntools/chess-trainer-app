import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import ChangesStrip from "./ChangesStrip";
import { ADDED, STORAGE } from "./fixtures";

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

const props = { testId: "probe", labelKey: "repertoires.changes", summary: ADDED, problem: null };

describe("ChangesStrip", () => {
  it("is a named region saying what changed, each action named by its words and described by its help", async () => {
    render(<ChangesStrip {...props} onUpdate={() => {}} onCopy={() => {}} onDiscard={() => {}} />);
    expect(screen.getByRole("region", { name: i18n.t("repertoires.changes.title") })).toHaveTextContent(ADDED);
    const update = screen.getByRole("button", { name: i18n.t("repertoires.changes.update") });
    expect(update).toBe(screen.getByTestId("probe-update"));
    await expectNoAxeViolations(screen.getByTestId("probe"));
  });

  it("runs each action from the keyboard", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    const onCopy = vi.fn();
    const onDiscard = vi.fn();
    render(<ChangesStrip {...props} onUpdate={onUpdate} onCopy={onCopy} onDiscard={onDiscard} />);
    await user.tab();
    await user.keyboard("{Enter}");
    await user.tab();
    await user.keyboard("{Enter}");
    await user.tab();
    await user.keyboard("{Enter}");
    expect([onUpdate, onCopy, onDiscard].map((fn) => fn.mock.calls.length)).toEqual([1, 1, 1]);
  });

  it("offers the settings in Update's place for a protected record, nothing for a read-only one", () => {
    const { rerender } = render(<ChangesStrip {...props} protectedLink={{ href: "/r/1/settings" }} onCopy={() => {}} onDiscard={() => {}} />);
    expect(screen.getByTestId("probe-settings")).toHaveAttribute("href", "/r/1/settings");
    expect(screen.getByTestId("probe-protected")).toBeInTheDocument();
    rerender(<ChangesStrip {...props} readOnly labelKey="library.shippedChanges" onCopy={() => {}} onDiscard={() => {}} />);
    expect(screen.queryByTestId("probe-update")).toBeNull();
    expect(screen.getByTestId("probe-read-only")).toBeInTheDocument();
  });

  it("says a failed save as an alert", () => {
    render(<ChangesStrip {...props} problem={STORAGE} onCopy={() => {}} onDiscard={() => {}} />);
    expect(screen.getByRole("alert")).toHaveTextContent(i18n.t("repertoires.changes.problem.storage"));
  });
});
