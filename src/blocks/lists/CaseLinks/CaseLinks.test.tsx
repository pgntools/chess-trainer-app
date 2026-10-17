import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import CaseLinks from "./CaseLinks";
import { LINKED_FROM, LINKS_TO } from "./fixtures";

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("CaseLinks (CTA-188)", () => {
  it("lists the Cases linked to and from — each a link, its Project named — with Unlink and Link a case", async () => {
    const onUnlink = vi.fn();
    const onLink = vi.fn();
    render(<CaseLinks linksTo={LINKS_TO} linkedFrom={LINKED_FROM} onUnlink={onUnlink} onLink={onLink} testId="links" />);
    const to = screen.getByRole("region", { name: "Links to" });
    expect(within(to).getByRole("link", { name: "Carlsen – Caruana - computer analysis (light)" })).toHaveAttribute("href", "#c-light");
    expect(within(to).getByText("Najdorf studies")).toBeInTheDocument();
    const from = screen.getByRole("region", { name: "Linked from" });
    await userEvent.click(within(from).getByRole("button", { name: "Unlink Sicilian, move 12" }));
    expect(onUnlink).toHaveBeenCalledWith(LINKED_FROM[0]);
    await userEvent.click(screen.getByRole("button", { name: "Link a case" }));
    expect(onLink).toHaveBeenCalled();
    await expectNoAxeViolations();
  });

  it("says None on a side with none, and that there are no links at all", () => {
    const { rerender } = render(<CaseLinks linksTo={[]} linkedFrom={LINKED_FROM} onUnlink={() => {}} testId="links" />);
    expect(within(screen.getByRole("region", { name: "Links to" })).getByText("None")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Link a case" })).toBeNull();
    rerender(<CaseLinks linksTo={[]} linkedFrom={[]} onUnlink={() => {}} testId="links" />);
    expect(screen.getByTestId("links-empty")).toHaveTextContent("No linked cases yet.");
  });
});
