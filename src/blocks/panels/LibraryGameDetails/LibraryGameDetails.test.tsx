import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import AppThemeWithLang from "../../../theme/AppThemeWithLang";
import { expectNoAxeViolations } from "../../../test/axe";
import LibraryGameDetails, { type LibraryGameDetailsProps, type LibraryGameDetailsTab } from "./LibraryGameDetails";
import { CAPTION, COLLECTION, GAME, HEBREW_TITLE, TITLE } from "./fixtures";

type Given = Partial<Omit<LibraryGameDetailsProps, "tab" | "onTabChange">> & { initialTab?: LibraryGameDetailsTab };

/** The block with its open tab held, as the screen holds it. */
function Held({ initialTab = "info", ...given }: Given) {
  const [tab, setTab] = useState<LibraryGameDetailsTab>(initialTab);
  return (
    <LibraryGameDetails
      title={TITLE}
      collectionName={COLLECTION}
      number={2}
      count={45}
      caption={CAPTION}
      backLink={{ href: "/library/norway" }}
      previousLink={{ href: "/library/norway/1" }}
      nextLink={{ href: "/library/norway/3" }}
      showArrows
      onShowArrowsChange={() => {}}
      showMoveMarks
      onShowMoveMarksChange={() => {}}
      showEvalBar
      onShowEvalBarChange={() => {}}
      game={GAME}
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

describe("LibraryGameDetails (CTA-209)", () => {
  it("heads with the game's title and its caption on one line, and opens on Info, first (CTA-212)", async () => {
    const { container } = render(<Held />);
    expect(screen.getByRole("region", { name: `Details of ${TITLE}` })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: TITLE })).toBeInTheDocument();
    // One line, the whole of it on hover.
    const caption = screen.getByTestId("probe-caption");
    expect(caption).toHaveTextContent(`Game 2 of 45 · ${CAPTION}`);
    expect(caption).toHaveAttribute("title", `Game 2 of 45 · ${CAPTION}`);
    const tabs = screen.getByRole("tablist", { name: "Game details" });
    expect(within(tabs).getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Info", "Settings"]);
    expect(screen.getByRole("tab", { name: "Info" })).toHaveAttribute("aria-selected", "true");
    const info = screen.getByRole("tabpanel", { name: "Info" });
    expect(within(info).getByText("Carlsen, Magnus")).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it("says only where the game sits when it has no event, round, date or result", () => {
    render(<Held caption="" />);
    expect(screen.getByTestId("probe-caption")).toHaveTextContent(/^Game 2 of 45$/);
  });

  it("heads with Back and the title; previous and next sit at the foot, under the tab's content (CTA-212)", () => {
    render(<Held />);
    const head = screen.getByRole("heading", { name: TITLE }).parentElement as HTMLElement;
    expect(within(head).queryByRole("link", { name: "Previous game" })).toBeNull();
    expect(within(head).queryByRole("link", { name: "Next game" })).toBeNull();
    const foot = screen.getByTestId("probe-siblings");
    expect(foot).toBe(screen.getByTestId("probe").lastElementChild);
    const back = screen.getByRole("link", { name: `Back to ${COLLECTION}` });
    const heading = screen.getByRole("heading", { name: TITLE });
    const previous = screen.getByRole("link", { name: "Previous game" });
    const next = screen.getByRole("link", { name: "Next game" });
    expect(back).toHaveAttribute("href", "/library/norway");
    expect(previous).toHaveAttribute("href", "/library/norway/1");
    expect(next).toHaveAttribute("href", "/library/norway/3");
    expect(within(foot).getAllByRole("link")).toEqual([previous, next]);
    const panel = screen.getByRole("tabpanel", { name: "Info" });
    const order = [back, heading, panel, previous, next];
    for (let index = 1; index < order.length; index += 1) {
      expect(order[index - 1].compareDocumentPosition(order[index]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it("keeps previous and next in place on the first and the last game, disabled", () => {
    render(<Held number={1} count={1} previousLink={undefined} nextLink={undefined} />);
    expect(screen.getByRole("button", { name: "Previous game" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next game" })).toBeDisabled();
  });

  it("switches the next-move arrows, the move marks and the eval bar from Settings", async () => {
    const onShowArrowsChange = vi.fn();
    const onShowMoveMarksChange = vi.fn();
    const onShowEvalBarChange = vi.fn();
    render(
      <Held
        onShowArrowsChange={onShowArrowsChange}
        onShowMoveMarksChange={onShowMoveMarksChange}
        showEvalBar={false}
        onShowEvalBarChange={onShowEvalBarChange}
        initialTab="settings"
      />,
    );
    const settings = screen.getByRole("tabpanel", { name: "Settings" });
    await userEvent.click(within(settings).getByRole("switch", { name: /Next-move arrows/ }));
    expect(onShowArrowsChange).toHaveBeenCalledWith(false);
    await userEvent.click(within(settings).getByRole("switch", { name: /Move marks on the board/ }));
    expect(onShowMoveMarksChange).toHaveBeenCalledWith(false);
    const evalBar = within(settings).getByRole("switch", { name: /Show evaluation bar/ });
    expect(evalBar).not.toBeChecked();
    await userEvent.click(evalBar);
    expect(onShowEvalBarChange).toHaveBeenCalledWith(true);
  });

  it("shows the game's PGN tags on Info, and reaches Settings by the keyboard", async () => {
    const user = userEvent.setup();
    const { container } = render(<Held />);
    const info = screen.getByRole("tabpanel", { name: "Info" });
    expect(within(info).getByText("Carlsen, Magnus")).toBeInTheDocument();
    expect(within(info).getByText("Norway Chess")).toBeInTheDocument();
    expect(screen.queryByRole("switch", { name: /Next-move arrows/ })).toBeNull();
    screen.getByRole("tab", { name: "Info" }).focus();
    await user.keyboard("{ArrowRight}{Enter}");
    expect(screen.getByRole("tab", { name: "Settings" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("switch", { name: /Next-move arrows/ })).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it("turns the way back, previous and next under Hebrew, and passes axe there", async () => {
    await i18n.changeLanguage("he");
    const { container } = render(
      <AppThemeWithLang>
        <Held title={HEBREW_TITLE} />
      </AppThemeWithLang>,
    );
    expect(screen.getByRole("heading", { name: HEBREW_TITLE })).toHaveAttribute("dir", "auto");
    expect(screen.getByTestId("probe-back").querySelector('[data-testid="ArrowForwardRoundedIcon"]')).not.toBeNull();
    // Previous points along the reading direction — right under RTL — and next left.
    expect(screen.getByTestId("probe-previous").querySelector('[data-testid="NavigateNextRoundedIcon"]')).not.toBeNull();
    expect(screen.getByTestId("probe-next").querySelector('[data-testid="NavigateBeforeRoundedIcon"]')).not.toBeNull();
    const tabs = within(screen.getByRole("tablist")).getAllByRole("tab");
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(tabs[1]).toHaveTextContent("הגדרות");
    await expectNoAxeViolations(container);
  });
});
