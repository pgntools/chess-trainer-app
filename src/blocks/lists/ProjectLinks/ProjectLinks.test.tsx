import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import { LINKED_FROM, LINKS_TO } from "./fixtures";
import ProjectLinks from "./ProjectLinks";

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("ProjectLinks (CTA-188)", () => {
  it("lists the Projects linked to and from, each a link with its Unlink", async () => {
    const onUnlink = vi.fn();
    render(<ProjectLinks linksTo={LINKS_TO} linkedFrom={LINKED_FROM} onUnlink={onUnlink} testId="links" />);
    const to = screen.getByRole("region", { name: "Links to" });
    expect(within(to).getByRole("link", { name: "Najdorf — engine lines" })).toHaveAttribute("href", "#p-lines");
    const from = screen.getByRole("region", { name: "Linked from" });
    await userEvent.click(within(from).getByRole("button", { name: "Unlink Sicilian studies" }));
    expect(onUnlink).toHaveBeenCalledWith(LINKED_FROM[0]);
    await expectNoAxeViolations();
  });

  it("says None on a side with none, and draws nothing with no link at all", () => {
    const { container, rerender } = render(<ProjectLinks linksTo={[]} linkedFrom={LINKED_FROM} onUnlink={() => {}} testId="links" />);
    expect(within(screen.getByRole("region", { name: "Links to" })).getByText("None")).toBeInTheDocument();
    rerender(<ProjectLinks linksTo={[]} linkedFrom={[]} onUnlink={() => {}} testId="links" />);
    expect(container).toBeEmptyDOMElement();
  });
});
