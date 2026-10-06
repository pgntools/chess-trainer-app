import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import TopPlayers from "./TopPlayers";
import { NONE, ONE_LEADER, SPREAD } from "./fixtures";

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("TopPlayers", () => {
  it("names each standout and the figure, the names linked", async () => {
    render(<TopPlayers top={ONE_LEADER} playerLink={(player) => ({ href: `/p/${player.name}` })} testId="probe" />);
    expect(screen.getByRole("heading", { level: 2, name: "Top players" })).toBeInTheDocument();
    expect(screen.getByTestId("probe-score")).toHaveTextContent("Best score");
    expect(screen.getByTestId("probe-score-value")).toHaveTextContent("2.0 of 2");
    expect(screen.getByTestId("probe-wins-value")).toHaveTextContent("2 wins");
    expect(screen.getByTestId("probe-unbeaten-value")).toHaveTextContent("2 games");
    expect(screen.getByTestId("probe-performance-value")).toHaveTextContent("3,595");
    expect(screen.getAllByRole("link", { name: "Carlsen, Magnus" })).toHaveLength(4);
    await expectNoAxeViolations(screen.getByTestId("probe"));
  });

  it("names a different player for each where they differ", () => {
    render(<TopPlayers top={SPREAD} testId="probe" />);
    expect(screen.getByTestId("probe-score")).toHaveTextContent("Cid");
    expect(screen.getByTestId("probe-unbeaten")).toHaveTextContent("Cid");
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("draws nothing when no one stands out", () => {
    const { container } = render(<TopPlayers top={NONE} testId="probe" />);
    expect(container).toBeEmptyDOMElement();
  });
});
