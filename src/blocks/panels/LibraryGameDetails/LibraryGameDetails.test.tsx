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
function Held({ initialTab = "settings", ...given }: Given) {
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
  it("heads with the game's title and its caption on one line, and opens on Settings", async () => {
    const { container } = render(<Held />);
    expect(screen.getByRole("region", { name: `Details of ${TITLE}` })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: TITLE })).toBeInTheDocument();
    // One line, the whole of it on hover.
    const caption = screen.getByTestId("probe-caption");
    expect(caption).toHaveTextContent(`Game 2 of 45 · ${CAPTION}`);
    expect(caption).toHaveAttribute("title", `Game 2 of 45 · ${CAPTION}`);
    const tabs = screen.getByRole("tablist", { name: "Game details" });
    expect(within(tabs).getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Settings", "Info"]);
    expect(screen.getByRole("tab", { name: "Settings" })).toHaveAttribute("aria-selected", "true");
    await expectNoAxeViolations(container);
  });

  it("says only where the game sits when it has no event, round, date or result", () => {
    render(<Held caption="" />);
    expect(screen.getByTestId("probe-caption")).toHaveTextContent(/^Game 2 of 45$/);
  });

  it("heads with Back at its start, then the title, then the previous and the next game", () => {
    render(<Held />);
    const back = screen.getByRole("link", { name: `Back to ${COLLECTION}` });
    const heading = screen.getByRole("heading", { name: TITLE });
    const previous = screen.getByRole("link", { name: "Previous game" });
    const next = screen.getByRole("link", { name: "Next game" });
    expect(back).toHaveAttribute("href", "/library/norway");
    expect(previous).toHaveAttribute("href", "/library/norway/1");
    expect(next).toHaveAttribute("href", "/library/norway/3");
    const order = [back, heading, previous, next];
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

  it("shows the game's PGN tags on Info, reached by the keyboard", async () => {
    const user = userEvent.setup();
    const { container } = render(<Held />);
    screen.getByRole("tab", { name: "Settings" }).focus();
    await user.keyboard("{ArrowRight}{Enter}");
    expect(screen.getByRole("tab", { name: "Info" })).toHaveAttribute("aria-selected", "true");
    const info = screen.getByRole("tabpanel", { name: "Info" });
    expect(within(info).getByText("Carlsen, Magnus")).toBeInTheDocument();
    expect(within(info).getByText("Norway Chess")).toBeInTheDocument();
    expect(screen.queryByRole("switch", { name: /Next-move arrows/ })).toBeNull();
    await expectNoAxeViolations(container);
  });

  it("turns the way back under Hebrew, and passes axe there", async () => {
    await i18n.changeLanguage("he");
    const { container } = render(
      <AppThemeWithLang>
        <Held title={HEBREW_TITLE} />
      </AppThemeWithLang>,
    );
    expect(screen.getByRole("heading", { name: HEBREW_TITLE })).toHaveAttribute("dir", "auto");
    expect(screen.getByTestId("probe-back").querySelector('[data-testid="ArrowForwardRoundedIcon"]')).not.toBeNull();
    expect(screen.getByRole("tab", { name: "הגדרות" })).toHaveAttribute("aria-selected", "true");
    await expectNoAxeViolations(container);
  });
});
