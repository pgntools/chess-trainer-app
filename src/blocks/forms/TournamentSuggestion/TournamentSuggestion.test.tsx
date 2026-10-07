import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import TournamentSuggestion from "./TournamentSuggestion";
import { BARE_GUESS, KNOCKOUT_GUESS, ROUND_ROBIN_GUESS, TEAM_SWISS_GUESS } from "./fixtures";

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("TournamentSuggestion", () => {
  it("names the guessed type with its reason, and applies it", async () => {
    const onApply = vi.fn();
    render(<TournamentSuggestion guess={ROUND_ROBIN_GUESS} selected={false} onApply={onApply} testId="probe" />);
    expect(screen.getByTestId("probe-text")).toHaveTextContent("Round robin: 8 players, every pair met twice.");
    await userEvent.click(screen.getByRole("button", { name: "Apply the suggested type, Round robin" }));
    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it("says a knockout's field and a team event in the settings' words", () => {
    render(
      <>
        <TournamentSuggestion guess={KNOCKOUT_GUESS} selected={false} onApply={() => {}} testId="ko" />
        <TournamentSuggestion guess={TEAM_SWISS_GUESS} selected={false} onApply={() => {}} testId="team" />
        <TournamentSuggestion guess={BARE_GUESS} selected={false} onApply={() => {}} testId="bare" />
      </>,
    );
    expect(screen.getByTestId("ko-text")).toHaveTextContent("Knockout (elimination): 16 players, fewer each round (16 → 8 → 4 → 2).");
    expect(screen.getByTestId("team-text")).toHaveTextContent("Team Swiss / round robin: 48 teams over 12 rounds");
    // A guess with no facts keeps its own words.
    expect(screen.getByTestId("bare-text")).toHaveTextContent("Match play: 12 games between two players.");
  });

  it("turns Apply off once the draft holds it, and says Save keeps it", () => {
    render(<TournamentSuggestion guess={ROUND_ROBIN_GUESS} selected onApply={() => {}} testId="probe" />);
    expect(screen.getByTestId("probe-apply")).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("press Save");
  });

  it("offers a close button to turn it down where asked — and none in the settings", async () => {
    const onDismiss = vi.fn();
    const { unmount } = render(<TournamentSuggestion guess={ROUND_ROBIN_GUESS} selected={false} onApply={() => {}} onDismiss={onDismiss} testId="probe" />);
    await userEvent.click(screen.getByRole("button", { name: "Not a tournament — don't suggest again" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    unmount();
    render(<TournamentSuggestion guess={ROUND_ROBIN_GUESS} selected={false} onApply={() => {}} testId="probe" />);
    expect(screen.queryByTestId("probe-dismiss")).toBeNull();
  });

  it("speaks Hebrew", async () => {
    await i18n.changeLanguage("he");
    render(<TournamentSuggestion guess={ROUND_ROBIN_GUESS} selected={false} onApply={() => {}} testId="probe" />);
    expect(screen.getByTestId("probe-text")).toHaveTextContent("8 שחקנים, כל זוג נפגש פעמיים");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <>
        <TournamentSuggestion guess={ROUND_ROBIN_GUESS} selected={false} onApply={() => {}} testId="a" />
        <TournamentSuggestion guess={KNOCKOUT_GUESS} selected onApply={() => {}} testId="b" />
      </>,
    );
    await expectNoAxeViolations(container);
  });
});
