import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import CollectionDetails, { type CollectionDetailsGeneral, type CollectionDetailsTab } from "./CollectionDetails";
import { CLOSE_LINK, EMPTY, HEBREW_NAME, NAME, ONE_EVENT, SHIPPED, TOURNAMENT, UPLOADED } from "./fixtures";

/** The block with its tab held, as the screen holds it; the settings a stand-in of the screen's. */
function Held({
  name = NAME,
  general = UPLOADED,
  readOnly = false,
  initialTab = "general",
}: {
  name?: string;
  general?: CollectionDetailsGeneral;
  readOnly?: boolean;
  initialTab?: CollectionDetailsTab;
}) {
  const [tab, setTab] = useState<CollectionDetailsTab>(initialTab);
  return (
    <CollectionDetails
      name={name}
      closeLink={CLOSE_LINK}
      tab={tab}
      onTabChange={setTab}
      general={general}
      options={readOnly ? undefined : <label>Title <input defaultValue={name} /></label>}
      testId="probe"
    />
  );
}

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("CollectionDetails (CTA-229, CTA-231, CTA-232)", () => {
  it("is headed by the collection's name and opens on General: its description and its facts", async () => {
    const { container } = render(<Held />);
    expect(screen.getByRole("region", { name: `Details of ${NAME}` })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: NAME })).toBeInTheDocument();
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["General", "Options"]);
    expect(screen.getByRole("tab", { name: "General" })).toHaveAttribute("aria-selected", "true");
    const general = screen.getByRole("tabpanel", { name: "General" });
    expect(within(general).getByTestId("probe-description")).toHaveTextContent("Every Tuesday at the club");
    expect(within(general).getByTestId("probe-description")).toHaveAttribute("dir", "auto");
    const fact = (id: string) => screen.getByTestId(`probe-facts-${id}`);
    expect(fact("source")).toHaveTextContent("Your upload");
    expect(fact("games")).toHaveTextContent("412");
    expect(fact("players")).toHaveTextContent("38");
    // Several events are counted.
    expect(fact("events")).toHaveTextContent("3");
    expect(fact("dates")).toHaveTextContent("2026.01.06 – 2026.10.13");
    expect(fact("dates")).toHaveAttribute("dir", "ltr");
    expect(fact("elo")).toHaveTextContent("1480 – 2310");
    expect(within(fact("added")).getByText("2026-10-14")).toHaveAttribute("datetime");
    await expectNoAxeViolations(container);
  });

  it("names one event, says when there is no description, and leaves out what the index does not give", () => {
    render(<Held general={ONE_EVENT} />);
    expect(screen.getByTestId("probe-description")).toHaveTextContent("No description.");
    expect(screen.getByTestId("probe-facts-events")).toHaveTextContent("Spring open");
    expect(screen.queryByTestId("probe-facts-dates")).toBeNull();
    expect(screen.queryByTestId("probe-facts-elo")).toBeNull();
  });

  it("gives a shipped file no date added, and an empty collection no players or events", () => {
    const { unmount } = render(<Held general={SHIPPED} />);
    expect(screen.getByTestId("probe-facts-source")).toHaveTextContent("Built-in");
    expect(screen.queryByTestId("probe-facts-added")).toBeNull();
    unmount();
    render(<Held general={EMPTY} />);
    expect(screen.getByTestId("probe-facts-games")).toHaveTextContent("0");
    expect(screen.queryByTestId("probe-facts-players")).toBeNull();
    expect(screen.queryByTestId("probe-facts-events")).toBeNull();
  });

  it("shows a tournament's event card on General, its heading under the panel's", async () => {
    const { container } = render(<Held name="FIDE Candidates 2026" general={TOURNAMENT} />);
    const card = screen.getByTestId("probe-tournament");
    expect(within(card).getByRole("heading", { level: 3, name: "The event" })).toBeInTheDocument();
    expect(within(card).getByTestId("probe-tournament-description")).toHaveTextContent("Eight players, two cycles");
    expect(within(card).getByTestId("probe-tournament-facts-type")).toHaveTextContent("Round robin");
    expect(within(card).getByTestId("probe-tournament-facts-rounds")).toHaveTextContent("14");
    expect(screen.queryByTestId("probe-facts")).toBeNull();
    await expectNoAxeViolations(container);
  });

  it("leads back to the Library by a Close at its head, before the name", () => {
    render(<Held />);
    const close = screen.getByRole("link", { name: `Close ${NAME}` });
    expect(close).toHaveAttribute("href", "/library");
    expect(close).toHaveAttribute("data-testid", "probe-close");
    const heading = screen.getByRole("heading", { level: 2, name: NAME });
    expect(close.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("holds the screen's settings on Options, reached by the keyboard — no Jobs tab (CTA-232)", async () => {
    const user = userEvent.setup();
    const { container } = render(<Held />);
    await user.tab();
    expect(screen.getByRole("link", { name: `Close ${NAME}` })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("tab", { name: "General" })).toHaveFocus();
    await user.keyboard("{ArrowRight}{Enter}");
    expect(screen.getByRole("tab", { name: "Options" })).toHaveAttribute("aria-selected", "true");
    expect(within(screen.getByRole("tabpanel", { name: "Options" })).getByRole("textbox", { name: "Title" })).toHaveValue(NAME);
    await expectNoAxeViolations(container);
    expect(screen.queryByRole("tab", { name: "Jobs" })).toBeNull();
  });

  it("says a shipped collection is read-only on Options", () => {
    render(<Held general={SHIPPED} readOnly initialTab="options" />);
    expect(screen.getByTestId("probe-options-read-only")).toHaveTextContent(i18n.t("library.collectionDetails.readOnly"));
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("hands the open tab back to the screen", async () => {
    const onTabChange = vi.fn();
    render(<CollectionDetails name={NAME} closeLink={CLOSE_LINK} tab="general" onTabChange={onTabChange} general={UPLOADED} testId="probe" />);
    await userEvent.click(screen.getByRole("tab", { name: "Options" }));
    expect(onTabChange).toHaveBeenCalledWith("options");
  });

  it("speaks Hebrew under Hebrew", async () => {
    await i18n.changeLanguage("he");
    render(<Held name={HEBREW_NAME} />);
    expect(screen.getByRole("heading", { level: 2, name: HEBREW_NAME })).toHaveAttribute("dir", "auto");
    expect(screen.getByRole("tab", { name: i18n.t("library.collectionDetails.tabs.options") })).toBeInTheDocument();
    expect(screen.getByTestId("probe-facts-source")).toHaveTextContent(i18n.t("library.collectionDetails.general.sources.uploaded"));
    expect(screen.getByRole("link", { name: i18n.t("library.collectionDetails.close", { name: HEBREW_NAME }) })).toBeInTheDocument();
  });
});
