import { beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import CollectionSettingsForm, { type CollectionSettingsDraft } from "./CollectionSettingsForm";
import { PLAIN, ROUND_ROBIN_GUESS, SWISS } from "./fixtures";

const TYPE_OF = (format: string) => screen.getByTestId(`probe-type-${format}`);

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

const mount = (value: CollectionSettingsDraft, canBeTournament: boolean) =>
  render(
    <CollectionSettingsForm
      value={value}
      onChange={() => {}}
      canBeTournament={canBeTournament}
      testId="probe"
    />,
  );

/** The form over a draft the screen really holds — the patches land and re-render, as they would for real. */
const mountLive = (initial: CollectionSettingsDraft) => {
  const Harness = () => {
    const [held, setHeld] = useState(initial);
    return (
      <CollectionSettingsForm
        value={held}
        onChange={(patch) => setHeld((current) => ({ ...current, ...patch }))}
        canBeTournament
        testId="probe"
      />
    );
  };
  render(<Harness />);
};

describe("CollectionSettingsForm", () => {
  it("edits the title and the description, both named", async () => {
    mountLive(PLAIN);
    const name = screen.getByTestId("probe-name");
    expect(name).toHaveAccessibleDescription("What the collection is called in the Library.");
    await userEvent.type(name, "!");
    expect(screen.getByTestId("probe-name")).toHaveValue("Club games!");
    await userEvent.type(screen.getByTestId("probe-description"), "Six rounds.");
    expect(screen.getByTestId("probe-description")).toHaveValue("Six rounds.");
    expect(screen.getByTestId("probe-description")).toHaveAttribute("maxlength", "2000");
  });

  it("shows the tournament switch off for an unmarked collection, and turning it on keeps Swiss as the type", async () => {
    const onChange = vi.fn();
    render(<CollectionSettingsForm value={PLAIN} onChange={onChange} canBeTournament testId="probe" />);
    const mark = screen.getByTestId("probe-tournament-switch");
    expect(mark).not.toBeChecked();
    await userEvent.click(mark);
    expect(onChange).toHaveBeenLastCalledWith({ tournament: { enabled: true, type: "swiss" } });
  });

  it("offers every format — Arena's label saying it has no standings table yet — each with its description (CTA-142)", () => {
    mount(SWISS, true);
    expect(screen.getByTestId("probe-type-swiss")).toBeChecked();
    for (const format of ["roundRobin", "knockout", "doubleElimination", "match", "teamSwiss", "teamKnockout"]) {
      expect(screen.getByTestId(`probe-type-${format}`)).toBeEnabled();
      expect(screen.getByTestId(`probe-${format}-description`)).toHaveTextContent(/Best for/);
    }
    const arena = screen.getByTestId("probe-type-arena");
    // Selectable since an arena is recognised (CTA-142), its own label saying it has no table yet.
    expect(arena).toBeEnabled();
    expect(arena).toHaveAccessibleName(/no standings table yet/i);
    expect(screen.getByTestId("probe-arena-description")).toHaveTextContent(/Best for/);
    expect(screen.getByTestId("probe-swiss-description")).toHaveTextContent("no one is eliminated");
    expect(screen.getByTestId("probe-roundRobin-description")).toHaveTextContent("plays every other");
    expect(screen.getByRole("radio", { name: "Team knockout" })).toBeEnabled();
  });

  it("suggests the games' type, and Apply turns the mark on with it in the draft (CTA-142)", async () => {
    const Harness = () => {
      const [held, setHeld] = useState(PLAIN);
      return (
        <CollectionSettingsForm
          value={held}
          onChange={(patch) => setHeld((current) => ({ ...current, ...patch }))}
          canBeTournament
          suggestion={ROUND_ROBIN_GUESS}
          testId="probe"
        />
      );
    };
    render(<Harness />);
    expect(screen.getByTestId("probe-suggestion-text")).toHaveTextContent("Round robin: 8 players, every pair met twice.");
    await userEvent.click(screen.getByRole("button", { name: "Apply the suggested type, Round robin" }));
    expect(screen.getByTestId("probe-tournament-switch")).toBeChecked();
    expect(screen.getByTestId("probe-type-roundRobin")).toBeChecked();
    expect(screen.getByTestId("probe-suggestion-apply")).toBeDisabled();
    expect(screen.getByTestId("probe-suggestion-selected")).toHaveTextContent("press Save");
  });

  it("suggests nothing without a guess, or over games that cannot be a tournament", () => {
    const { unmount } = render(<CollectionSettingsForm value={PLAIN} onChange={() => {}} canBeTournament testId="probe" />);
    expect(screen.queryByTestId("probe-suggestion")).not.toBeInTheDocument();
    unmount();
    render(<CollectionSettingsForm value={PLAIN} onChange={() => {}} canBeTournament={false} suggestion={ROUND_ROBIN_GUESS} testId="probe" />);
    expect(screen.queryByTestId("probe-suggestion")).not.toBeInTheDocument();
  });

  it("changes the type through the radios", async () => {
    const onChange = vi.fn();
    render(<CollectionSettingsForm value={SWISS} onChange={onChange} canBeTournament testId="probe" />);
    await userEvent.click(TYPE_OF("roundRobin"));
    expect(onChange).toHaveBeenLastCalledWith({ tournament: { enabled: true, type: "roundRobin" } });
  });

  it("turns the switch off with the games' verdict, the reason its description", () => {
    mount(SWISS, false);
    const mark = screen.getByTestId("probe-tournament-switch");
    expect(mark).toBeDisabled();
    // The stored mark reads as off, whatever it says.
    expect(mark).not.toBeChecked();
    expect(mark).toHaveAccessibleDescription(/only when every game in it shares one Event/);
    // No type is offered while it reads as off.
    expect(screen.queryByTestId("probe-type-swiss")).not.toBeInTheDocument();
  });

  it("turns every field off while a save is under way", () => {
    render(<CollectionSettingsForm value={SWISS} onChange={() => {}} canBeTournament disabled testId="probe" />);
    expect(screen.getByTestId("probe-name")).toBeDisabled();
    expect(screen.getByTestId("probe-description")).toBeDisabled();
    expect(screen.getByTestId("probe-tournament-switch")).toBeDisabled();
    expect(screen.getByTestId("probe-type-swiss")).toBeDisabled();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <>
        <CollectionSettingsForm value={PLAIN} onChange={() => {}} canBeTournament suggestion={ROUND_ROBIN_GUESS} testId="probe" />
        <CollectionSettingsForm value={SWISS} onChange={() => {}} canBeTournament={false} testId="probe-blocked" />
      </>,
    );
    await expectNoAxeViolations(container);
  });
});
