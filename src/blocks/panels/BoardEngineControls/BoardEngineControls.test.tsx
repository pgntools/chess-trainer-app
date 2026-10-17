import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import BoardEngineControls from "./BoardEngineControls";
import { OFF, ON_NO_BAR } from "./fixtures";

const mount = (state: { engineOn: boolean; showEvalBar: boolean } = OFF, withWriteEvals = false) => {
  const onEngineOnChange = vi.fn();
  const onShowEvalBarChange = vi.fn();
  const onWriteEvals = vi.fn();
  render(
    <BoardEngineControls
      {...state}
      onEngineOnChange={onEngineOnChange}
      onShowEvalBarChange={onShowEvalBarChange}
      writeEvals={withWriteEvals ? { checked: false, onChange: onWriteEvals } : undefined}
      testId="board"
    />,
  );
  return { onEngineOnChange, onShowEvalBarChange, onWriteEvals };
};

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("BoardEngineControls — a board's engine (CTA-181)", () => {
  it("is a play / pause toggle, one name whatever its state, pressed while on", async () => {
    const { onEngineOnChange } = mount(OFF);
    const toggle = screen.getByRole("button", { name: "Engine analysis" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(toggle).toHaveAttribute("data-testid", "board-setting-engine");
    toggle.focus();
    await userEvent.keyboard("{Enter}");
    expect(onEngineOnChange).toHaveBeenCalledWith(true);
  });

  it("is pressed while the engine is on, and switches it off", async () => {
    const { onEngineOnChange } = mount(ON_NO_BAR);
    const toggle = screen.getByRole("button", { name: "Engine analysis" });
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(toggle);
    expect(onEngineOnChange).toHaveBeenCalledWith(false);
  });

  it("opens its menu — a dialog — with the eval bar's switch, by keyboard, and closes on Escape", async () => {
    const { onShowEvalBarChange } = mount(OFF);
    const menu = screen.getByRole("button", { name: "Board engine options" });
    expect(menu).toHaveAttribute("aria-haspopup", "dialog");
    expect(menu).toHaveAttribute("aria-expanded", "false");
    menu.focus();
    await userEvent.keyboard("{Enter}");
    const dialog = await screen.findByRole("dialog", { name: "Board engine options" });
    expect(menu).toHaveAttribute("aria-expanded", "true");
    expect(screen.queryByRole("switch", { name: "Write evaluations into the game" })).toBeNull();
    await userEvent.click(screen.getByRole("switch", { name: "Show evaluation bar" }));
    expect(onShowEvalBarChange).toHaveBeenCalledWith(false);
    await expectNoAxeViolations(dialog);
    await userEvent.keyboard("{Escape}");
    expect(menu).toHaveAttribute("aria-expanded", "false");
  });

  it("offers Write evaluations into the game where the board does — the Analysis Board", async () => {
    const { onWriteEvals } = mount(OFF, true);
    await userEvent.click(screen.getByRole("button", { name: "Board engine options" }));
    await userEvent.click(await screen.findByRole("switch", { name: "Write evaluations into the game" }));
    expect(onWriteEvals).toHaveBeenCalledWith(true);
  });

  it("passes axe", async () => {
    mount();
    await expectNoAxeViolations();
  });
});
