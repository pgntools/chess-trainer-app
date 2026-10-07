import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";

import i18n from "../../i18n";
import { expectNoAxeViolations } from "../../test/axe";
import AppThemeWithLang from "../../theme/AppThemeWithLang";
import SupportTab from "./SupportTab";

const mount = () =>
  render(
    <AppThemeWithLang>
      <SupportTab />
    </AppThemeWithLang>,
  );

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("Settings → Support", () => {
  it("has the logo and a title for a header, a line of introduction and a heading over the list", () => {
    mount();
    expect(screen.getByRole("heading", { name: "Need help with chessapp.dev?" })).toBeInTheDocument();
    expect(screen.getByTestId("support-tab-logo")).toHaveAttribute("alt", "");
    expect(screen.getByTestId("support-tab-intro")).toHaveTextContent("Found a bug");
    expect(screen.getByRole("heading", { name: "How to reach us" })).toBeInTheDocument();
  });

  it("lists the ways in order — a GitHub issue, preferred, then an email — each led by an emoji hidden from a screen reader", () => {
    mount();
    const [first, second] = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(first).toHaveTextContent("Raise a GitHub issue (preferred)");
    expect(second).toHaveTextContent("Send an email");
    for (const item of [first, second]) expect(item.querySelector('[aria-hidden="true"]')).toHaveTextContent(/^\p{Extended_Pictographic}/u);
  });

  it("links to the new-issue page in a new tab, and to the support address, both read left to right", () => {
    mount();
    const issue = screen.getByRole("link", { name: "github.com/pgntools/chess-trainer-app/issues" });
    expect(issue).toHaveAttribute("href", "https://github.com/pgntools/chess-trainer-app/issues/new");
    expect(issue).toHaveAttribute("target", "_blank");
    expect(issue).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(issue).toHaveAttribute("dir", "ltr");
    const mail = screen.getByRole("link", { name: "info@chessapp.dev" });
    expect(mail).toHaveAttribute("href", "mailto:info@chessapp.dev");
    expect(mail).not.toHaveAttribute("target");
  });

  it("reads in Hebrew", async () => {
    await i18n.changeLanguage("he");
    mount();
    expect(screen.getByRole("heading", { name: "צריכים עזרה עם chessapp.dev?" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "איך אפשר ליצור קשר" })).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    mount();
    await expectNoAxeViolations();
  });
});
