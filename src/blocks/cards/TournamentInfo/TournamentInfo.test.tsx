import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import TournamentInfo from "./TournamentInfo";
import { CANDIDATES, DESCRIPTION, SPARSE, TEAM } from "./fixtures";

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("TournamentInfo", () => {
  it("names the event and lists what its games say, under its own heading", async () => {
    render(<TournamentInfo facts={CANDIDATES} description={DESCRIPTION} testId="probe" />);
    expect(screen.getByRole("region", { name: "The event" })).toBe(screen.getByTestId("probe"));
    expect(screen.getByRole("heading", { level: 2, name: "The event" })).toBeInTheDocument();
    expect(screen.getByTestId("probe-description")).toHaveTextContent(DESCRIPTION);
    expect(screen.getByTestId("probe-facts-type")).toHaveTextContent("Round robin");
    expect(screen.getByTestId("probe-facts-event")).toHaveTextContent("FIDE Candidates 2026");
    expect(screen.getByTestId("probe-facts-dates")).toHaveTextContent("2026.03.29 – 2026.04.15");
    expect(screen.getByTestId("probe-facts-rounds")).toHaveTextContent("14");
    expect(screen.getByTestId("probe-facts-players")).toHaveTextContent("8");
    expect(screen.getByTestId("probe-facts-games")).toHaveTextContent(/^56$/);
    await expectNoAxeViolations(screen.getByTestId("probe"));
  });

  it("counts a team event's teams and its unfinished games", () => {
    render(<TournamentInfo facts={TEAM} testId="probe" />);
    expect(screen.getByTestId("probe-facts-teams")).toHaveTextContent("48");
    expect(screen.getByTestId("probe-facts-games")).toHaveTextContent("1,650 (3 games unfinished)");
    expect(screen.getByTestId("probe-facts-type")).toHaveTextContent("Team Swiss / round robin");
  });

  it("leaves out what the tags do not say", () => {
    render(<TournamentInfo facts={SPARSE} testId="probe" />);
    for (const id of ["event", "site", "dates", "rounds", "teams"]) expect(screen.queryByTestId(`probe-facts-${id}`)).toBeNull();
    expect(screen.queryByTestId("probe-description")).toBeNull();
  });

  it("speaks Hebrew", async () => {
    await i18n.changeLanguage("he");
    render(<TournamentInfo facts={CANDIDATES} testId="probe" />);
    expect(screen.getByRole("heading", { name: "האירוע" })).toBeInTheDocument();
    expect(screen.getByTestId("probe-facts-type")).toHaveTextContent("ליגה");
  });
});
