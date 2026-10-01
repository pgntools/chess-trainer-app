import { beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import CollectionSettingsForm, { type CollectionSettingsDraft } from "./CollectionSettingsForm";
import { PLAIN, SWISS } from "./fixtures";

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

  it("offers all five formats — only Swiss and Round robin selectable, each with its description", () => {
    mount(SWISS, true);
    expect(screen.getByTestId("probe-type-swiss")).toBeChecked();
    expect(screen.getByTestId("probe-type-roundRobin")).toBeEnabled();
    for (const format of ["knockout", "arena", "match"]) {
      const radio = screen.getByTestId(`probe-type-${format}`);
      // Not selectable, its own label saying so, and its description still there to read.
      expect(radio).toBeDisabled();
      expect(radio).toHaveAccessibleName(/coming later/i);
      expect(screen.getByTestId(`probe-${format}-description`)).toHaveTextContent(/Best for/);
    }
    expect(screen.getByTestId("probe-swiss-description")).toHaveTextContent("no one is eliminated");
    expect(screen.getByTestId("probe-roundRobin-description")).toHaveTextContent("plays every other");
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
        <CollectionSettingsForm value={PLAIN} onChange={() => {}} canBeTournament testId="probe" />
        <CollectionSettingsForm value={SWISS} onChange={() => {}} canBeTournament={false} testId="probe-blocked" />
      </>,
    );
    await expectNoAxeViolations(container);
  });
});
