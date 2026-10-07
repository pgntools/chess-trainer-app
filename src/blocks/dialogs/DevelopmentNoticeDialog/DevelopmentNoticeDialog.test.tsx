import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import DevelopmentNoticeDialog from "./DevelopmentNoticeDialog";
import { NOTICE_TEST_ID, NOTICE_WORDS } from "./fixtures";

const mount = (open = true) => {
  const onDismiss = vi.fn();
  render(<DevelopmentNoticeDialog open={open} onDismiss={onDismiss} testId={NOTICE_TEST_ID} />);
  return { onDismiss };
};

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("DevelopmentNoticeDialog", () => {
  it("is a dialog named for the app's state, saying what to expect", () => {
    mount();
    expect(screen.getByRole("dialog", { name: NOTICE_WORDS.title })).toBeInTheDocument();
    expect(screen.getByTestId(`${NOTICE_TEST_ID}-intro`)).toHaveTextContent("Please use it with caution");
    expect(screen.getByTestId(`${NOTICE_TEST_ID}-local`)).toHaveTextContent("this browser on this device only");
    expect(screen.getByTestId(`${NOTICE_TEST_ID}-changes`)).toHaveTextContent("may change or break");
  });

  it("renders nothing while closed", () => {
    mount(false);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("is dismissed by its button and by Escape", async () => {
    const user = userEvent.setup();
    const { onDismiss } = mount();
    await user.click(screen.getByRole("button", { name: NOTICE_WORDS.dismiss }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    await user.keyboard("{Escape}");
    expect(onDismiss).toHaveBeenCalledTimes(2);
  });

  it("reads in Hebrew, with the button's own word", async () => {
    await i18n.changeLanguage("he");
    mount();
    expect(screen.getByRole("dialog", { name: "chessapp.dev עדיין בפיתוח" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "סגירה" })).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    mount();
    await expectNoAxeViolations(screen.getByRole("dialog"));
  });
});
