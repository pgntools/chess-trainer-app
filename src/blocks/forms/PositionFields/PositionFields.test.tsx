import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import { AFTER_E4, START } from "./fixtures";
import PositionFields from "./PositionFields";

const mount = (fields = START) => {
  const onTurnChange = vi.fn();
  const onCastlingChange = vi.fn();
  const onEnPassantChange = vi.fn();
  render(<PositionFields testId="probe" fields={fields} onTurnChange={onTurnChange} onCastlingChange={onCastlingChange} onEnPassantChange={onEnPassantChange} />);
  return { onTurnChange, onCastlingChange, onEnPassantChange };
};

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("PositionFields", () => {
  it("shows the side to move, the castling rights and the target as the fields say", async () => {
    mount(AFTER_E4);
    expect(screen.getByTestId("probe-turn-b")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("group", { name: "Castling" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "White 0-0" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "White 0-0-0" })).not.toBeChecked();
    expect(screen.getByTestId("probe-en-passant")).toHaveTextContent("e3");
    await expectNoAxeViolations(screen.getByTestId("probe-position-fields"));
  });

  it("changes each from the keyboard", async () => {
    const user = userEvent.setup();
    const { onTurnChange, onCastlingChange } = mount();
    screen.getByTestId("probe-turn-w").focus();
    await user.keyboard("{ArrowRight}{Enter}");
    expect(onTurnChange).toHaveBeenCalledWith("b");
    screen.getByRole("checkbox", { name: "Black 0-0" }).focus();
    await user.keyboard(" ");
    expect(onCastlingChange).toHaveBeenCalledWith("k", false);
  });

  it("offers only the targets the side to move allows", async () => {
    const user = userEvent.setup();
    const { onEnPassantChange } = mount();
    await user.click(screen.getByTestId("probe-en-passant"));
    expect(screen.queryByRole("option", { name: "e3" })).toBeNull();
    await user.click(screen.getByRole("option", { name: "e6" }));
    expect(onEnPassantChange).toHaveBeenCalledWith("e6");
  });
});
