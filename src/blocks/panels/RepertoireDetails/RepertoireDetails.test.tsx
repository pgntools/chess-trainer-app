import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import AppThemeWithLang from "../../../theme/AppThemeWithLang";
import { expectNoAxeViolations } from "../../../test/axe";
import RepertoireDetails, { type RepertoireDetailsProps, type RepertoireDetailsTab } from "./RepertoireDetails";
import { CARO_KANN, DESCRIPTION, HEBREW_NAME, NAME } from "./fixtures";

type Given = Partial<Omit<RepertoireDetailsProps, "tab" | "onTabChange">> & { initialTab?: RepertoireDetailsTab };

/** The block with its open tab held, as the screen holds it. */
function Held({ initialTab = "settings", ...given }: Given) {
  const [tab, setTab] = useState<RepertoireDetailsTab>(initialTab);
  return (
    <RepertoireDetails
      name={NAME}
      description={DESCRIPTION}
      opening={{ opening: CARO_KANN, loading: false, ecoLink: { href: "/openings" } }}
      side="white"
      onSideChange={() => {}}
      autoplay={false}
      onAutoplayChange={() => {}}
      showArrows
      onShowArrowsChange={() => {}}
      chanceArrows={false}
      onChanceArrowsChange={() => {}}
      showEvalBar
      onShowEvalBarChange={() => {}}
      settingsLink={{ href: "/repertoires/r1/settings" }}
      backLink={{ href: "/repertoires" }}
      gameLink={(game) => ({ href: `/repertoires/r1/games/${game}` })}
      testId="probe"
      {...given}
      tab={tab}
      onTabChange={setTab}
    />
  );
}

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("RepertoireDetails (CTA-206)", () => {
  it("heads with the name, the description on one line and the opening, and opens on Settings", async () => {
    const { container } = render(<Held />);
    expect(screen.getByRole("region", { name: `Details of ${NAME}` })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: NAME })).toBeInTheDocument();
    // One line, the whole of it on hover.
    expect(screen.getByTestId("probe-description")).toHaveAttribute("title", DESCRIPTION);
    expect(screen.getByTestId("probe-opening")).toHaveTextContent("Caro-Kann Defense: Advance Variation");
    const tabs = screen.getByRole("tablist", { name: "Repertoire details" });
    expect(within(tabs).getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Settings", "Games", "Jobs"]);
    expect(screen.getByRole("tab", { name: "Settings" })).toHaveAttribute("aria-selected", "true");
    await expectNoAxeViolations(container);
  });

  it("heads with Back at its start and the record's settings, a gear, at its end", () => {
    render(<Held />);
    const heading = screen.getByRole("heading", { name: NAME });
    const back = screen.getByRole("link", { name: "Back to the repertoires" });
    const settings = screen.getByRole("link", { name: "Repertoire settings" });
    expect(back).toHaveAttribute("href", "/repertoires");
    expect(settings).toHaveAttribute("href", "/repertoires/r1/settings");
    // Back, the name, the gear — in that order, on one row.
    expect(back.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(heading.compareDocumentPosition(settings) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // Nothing of the record's settings — and no Clear — in the Settings tab.
    const panel = screen.getByRole("tabpanel", { name: "Settings" });
    expect(within(panel).queryByRole("link")).toBeNull();
    expect(within(panel).queryByRole("button", { name: "Clear the board" })).toBeNull();
  });

  it("names Back for the repertoire in a game", () => {
    render(<Held currentGame="end" backLink={{ href: "/repertoires/r1" }} />);
    expect(screen.getByRole("link", { name: "Back to the repertoire" })).toHaveAttribute("href", "/repertoires/r1");
  });

  it("holds the session's settings, the eval bar's among them", async () => {
    const onSideChange = vi.fn();
    const onAutoplayChange = vi.fn();
    const onShowArrowsChange = vi.fn();
    const onChanceArrowsChange = vi.fn();
    const onShowEvalBarChange = vi.fn();
    render(
      <Held
        onSideChange={onSideChange}
        onAutoplayChange={onAutoplayChange}
        onShowArrowsChange={onShowArrowsChange}
        onChanceArrowsChange={onChanceArrowsChange}
        onShowEvalBarChange={onShowEvalBarChange}
      />,
    );
    const panel = screen.getByRole("tabpanel", { name: "Settings" });
    await userEvent.click(within(panel).getByRole("button", { name: "Black" }));
    expect(onSideChange).toHaveBeenCalledWith("black");
    await userEvent.click(within(panel).getByRole("switch", { name: /Autoplay/ }));
    expect(onAutoplayChange).toHaveBeenCalledWith(true);
    await userEvent.click(within(panel).getByRole("switch", { name: /Show next-move arrows/ }));
    expect(onShowArrowsChange).toHaveBeenCalledWith(false);
    await userEvent.click(within(panel).getByRole("switch", { name: /Show play chances/ }));
    expect(onChanceArrowsChange).toHaveBeenCalledWith(true);
    await userEvent.click(within(panel).getByRole("switch", { name: /Show evaluation bar/ }));
    expect(onShowEvalBarChange).toHaveBeenCalledWith(false);
  });

  it("leaves out Autoplay and the play chances where the screen gives none — a game", () => {
    render(<Held autoplay={undefined} chanceArrows={undefined} currentGame="end" />);
    expect(screen.queryByRole("switch", { name: /Autoplay/ })).toBeNull();
    expect(screen.queryByRole("switch", { name: /Show play chances/ })).toBeNull();
    expect(screen.getByRole("switch", { name: /Show next-move arrows/ })).toBeChecked();
    // In a game the head names the game, not the description.
    expect(screen.getByTestId("probe-game-title")).toHaveTextContent("Get to the end");
    expect(screen.queryByTestId("probe-description")).toBeNull();
  });

  it("lists the games as links, each with what it does — none current on the repertoire's own view", async () => {
    const { container } = render(<Held initialTab="games" />);
    const list = screen.getByRole("list", { name: `Games of ${NAME}` });
    const links = within(list).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual(["/repertoires/r1/games/end", "/repertoires/r1/games/backtrack"]);
    expect(links[0]).toHaveTextContent("Get to the end");
    expect(links[1]).toHaveTextContent("Backtracking");
    expect(links[1]).toHaveTextContent("Cover every line");
    expect(within(list).queryByRole("link", { current: "page" })).toBeNull();
    expect(screen.queryByTestId("probe-games-back")).toBeNull();
    await expectNoAxeViolations(container);
  });

  it("in a game, marks it current and offers the way back to the repertoire first", async () => {
    const { container } = render(<Held initialTab="games" currentGame="backtrack" repertoireLink={{ href: "/repertoires/r1" }} />);
    const list = screen.getByRole("list", { name: `Games of ${NAME}` });
    const links = within(list).getAllByRole("link");
    expect(links[0]).toHaveAccessibleName(/Back to the repertoire/);
    expect(links[0]).toHaveAttribute("href", "/repertoires/r1");
    expect(within(list).getByRole("link", { current: "page" })).toHaveTextContent("Backtracking");
    await expectNoAxeViolations(container);
  });

  it("says repertoire jobs are coming, on Jobs", async () => {
    render(<Held />);
    await userEvent.click(screen.getByRole("tab", { name: "Jobs" }));
    expect(screen.getByRole("tabpanel", { name: "Jobs" })).toContainElement(screen.getByTestId("probe-jobs-empty"));
    expect(screen.getByTestId("probe-jobs-empty")).toHaveTextContent("Repertoire jobs are coming");
  });

  it("reads right to left under Hebrew, the way back pointing along it", async () => {
    await i18n.changeLanguage("he");
    const { container } = render(
      <AppThemeWithLang>
        <Held name={HEBREW_NAME} description="" initialTab="games" currentGame="end" repertoireLink={{ href: "/repertoires/r1" }} />
      </AppThemeWithLang>,
    );
    expect(screen.getByRole("heading", { name: HEBREW_NAME })).toHaveAttribute("dir", "auto");
    expect(screen.getByTestId("probe-games-back").querySelector('[data-testid="ArrowForwardRoundedIcon"]')).not.toBeNull();
    expect(screen.getByRole("tab", { name: "משחקים" })).toHaveAttribute("aria-selected", "true");
    await expectNoAxeViolations(container);
  });
});
