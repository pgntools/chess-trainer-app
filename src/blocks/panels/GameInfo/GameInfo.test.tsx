import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import { FULL, PLACEHOLDERS } from "./fixtures";
import GameInfo from "./GameInfo";

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("GameInfo", () => {
  it("lists the named tags first, in order, then the file's own under their names", async () => {
    render(<GameInfo game={FULL} testId="probe" />);
    const list = screen.getByTestId("probe");
    expect(within(list).getAllByRole("term").map((term) => term.textContent)).toEqual([
      "Event",
      "Site",
      "Date",
      "Round",
      "White",
      "Black",
      "Result",
      "ECO",
      "WhiteElo",
      "Annotator",
    ]);
    expect(screen.getByTestId("probe-White")).toHaveTextContent("Carlsen, Magnus");
    expect(screen.getByTestId("probe-Result")).toHaveAttribute("dir", "ltr");
    await expectNoAxeViolations(list);
  });

  it("reads the roster's placeholders as nothing to show", () => {
    render(<GameInfo game={PLACEHOLDERS} testId="probe" />);
    expect(screen.getByTestId("probe-empty")).toBeInTheDocument();
  });

  it("says so with no game", () => {
    render(<GameInfo game={undefined} testId="probe" />);
    expect(screen.getByTestId("probe-empty")).toBeInTheDocument();
  });
});
