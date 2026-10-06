import { beforeEach, describe, expect, it } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import type { CollectionTournament } from "../../../lib/libraryCollections";
import TournamentMarkFields from "./TournamentMarkFields";
import { KNOCKOUT, OFF, TEAM_GUESS } from "./fixtures";

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

const Live = ({ initial, canBeTournament = true }: { initial: CollectionTournament; canBeTournament?: boolean }) => {
  const [mark, setMark] = useState(initial);
  return <TournamentMarkFields value={mark} onChange={setMark} canBeTournament={canBeTournament} suggestion={TEAM_GUESS} testId="probe" />;
};

describe("TournamentMarkFields", () => {
  it("applies the suggested type — the switch on, the type chosen", async () => {
    render(<Live initial={OFF} />);
    expect(screen.queryByRole("radiogroup")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Apply the suggested type, Team Swiss / round robin" }));
    expect(screen.getByTestId("probe-tournament-switch")).toBeChecked();
    expect(screen.getByTestId("probe-type-teamSwiss")).toBeChecked();
    await expectNoAxeViolations(document.body);
  });

  it("offers every format with a table, Arena off, and changes the type", async () => {
    render(<Live initial={KNOCKOUT} />);
    expect(screen.getByTestId("probe-type-arena")).toBeDisabled();
    await userEvent.click(screen.getByTestId("probe-type-match"));
    expect(screen.getByTestId("probe-type-match")).toBeChecked();
  });

  it("is off with its reason, offering nothing, over games that cannot be a tournament", () => {
    render(<Live initial={KNOCKOUT} canBeTournament={false} />);
    expect(screen.getByTestId("probe-tournament-switch")).toBeDisabled();
    expect(screen.getByTestId("probe-tournament-switch")).not.toBeChecked();
    expect(screen.queryByTestId("probe-suggestion")).toBeNull();
    expect(screen.queryByTestId("probe-type-swiss")).toBeNull();
  });
});
