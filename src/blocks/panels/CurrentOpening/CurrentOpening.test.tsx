import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import CurrentOpening from "./CurrentOpening";
import { KINGS_PAWN } from "./fixtures";

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("CurrentOpening", () => {
  it("names the opening, its ECO chip a named link", async () => {
    render(<CurrentOpening opening={KINGS_PAWN} loading={false} ecoLink={{ href: "/openings?fen=x" }} testId="probe" />);
    expect(screen.getByTestId("probe")).toHaveTextContent("King's Pawn Game");
    expect(screen.getByRole("link", { name: /B00/ })).toHaveAttribute("href", "/openings?fen=x");
    await expectNoAxeViolations(screen.getByTestId("probe"));
  });

  it("tells loading from unknown, with no link either way", () => {
    const { rerender } = render(<CurrentOpening opening={undefined} loading ecoLink={{ href: "#" }} testId="probe" />);
    expect(screen.getByTestId("probe")).toHaveTextContent(i18n.t("openings.current.loading"));
    rerender(<CurrentOpening opening={undefined} loading={false} ecoLink={{ href: "#" }} testId="probe" />);
    expect(screen.getByTestId("probe")).toHaveTextContent(i18n.t("openings.current.unknown"));
    expect(screen.queryByRole("link")).toBeNull();
  });
});
