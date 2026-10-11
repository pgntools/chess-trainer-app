import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import EngineOptionsChangedDialog from "./EngineOptionsChangedDialog";
import { ANALYSIS_CHANGES, GAME_CHANGES, HELD } from "./fixtures";

const mount = (props: Partial<Parameters<typeof EngineOptionsChangedDialog>[0]> = {}) => {
  const onDismiss = vi.fn();
  const onUse = vi.fn();
  render(
    <EngineOptionsChangedDialog
      open
      changes={ANALYSIS_CHANGES}
      record="analysis"
      onDismiss={onDismiss}
      onUse={onUse}
      testId="changed"
      {...props}
    />,
  );
  return { onDismiss, onUse };
};

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("EngineOptionsChangedDialog (CTA-181)", () => {
  it("is a dialog named \"Engine options changed\", a line per setting: the record's value, then the current one", async () => {
    mount();
    const dialog = await screen.findByRole("dialog", { name: "Engine options changed" });
    expect(dialog).toHaveTextContent("This analysis was saved with other engine settings");
    expect(screen.getByTestId("changed-change-multiPv")).toHaveTextContent("Variations to show: 5 → 3");
    expect(screen.getByTestId("changed-change-depth")).toHaveTextContent("Search depth: 26 → 20");
    expect(screen.getByTestId("changed-change-moveTimeMs")).toHaveTextContent("Move time: 5.0s → No limit");
    expect(screen.getByTestId("changed-change-infinite")).toHaveTextContent("Infinite analysis: on → off");
    expect(screen.queryByTestId("changed-held")).toBeNull();
  });

  it("answers Dismiss and Use these settings", async () => {
    const { onDismiss, onUse } = mount();
    await userEvent.click(await screen.findByRole("button", { name: "Use these settings" }));
    expect(onUse).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("says beforehand what this engine would hold — a played game's words", async () => {
    mount({ changes: GAME_CHANGES, record: "game", held: HELD });
    const dialog = await screen.findByRole("dialog", { name: "Engine options changed" });
    expect(dialog).toHaveTextContent("This game was played with other engine settings");
    expect(screen.getByTestId("changed-held")).toHaveTextContent("Threads would be 1 and Hash (MB) would be 512");
  });

  it("passes axe", async () => {
    mount({ changes: GAME_CHANGES, record: "game", held: HELD });
    await expectNoAxeViolations(await screen.findByRole("dialog"));
  });
});
