import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import CurrentOpening from "./CurrentOpening";
import { KINGS_PAWN, LONG } from "./fixtures";

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

  describe("oneLine (the Analysis Board's)", () => {
    it("is the name as a link into the explorer that opens a new tab, the code and full name on hover", async () => {
      render(<CurrentOpening opening={LONG} loading={false} ecoLink={{ href: "/openings?fen=x" }} oneLine testId="probe" />);
      const link = screen.getByRole("link", { name: /Najdorf/ });
      expect(link).toHaveTextContent(LONG.name);
      expect(link).toHaveAttribute("href", "/openings?fen=x");
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("title", `${LONG.eco} · ${LONG.name}`);
      expect(link).toHaveStyle({ whiteSpace: "nowrap", textOverflow: "ellipsis" });
      await expectNoAxeViolations(screen.getByTestId("probe"));
    });

    it("shows nothing at all while unknown or loading", () => {
      const { rerender } = render(<CurrentOpening opening={undefined} loading ecoLink={{ href: "#" }} oneLine testId="probe" />);
      expect(screen.queryByTestId("probe")).toBeNull();
      rerender(<CurrentOpening opening={undefined} loading={false} ecoLink={{ href: "#" }} oneLine testId="probe" />);
      expect(screen.queryByTestId("probe")).toBeNull();
      expect(document.body).not.toHaveTextContent(i18n.t("openings.current.unknown"));
    });
  });
});
