import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";

import i18n from "../../i18n";
import { expectNoAxeViolations } from "../../test/axe";
import AppThemeWithLang from "../../theme/AppThemeWithLang";
import { createPageTitleStore, PageTitleContext } from "../main/pageTitle";
import LegalPage from "./LegalPage";
import type { LegalPageId } from "./legalDocuments";

const renderPage = (page: LegalPageId) => {
  const store = createPageTitleStore();
  const view = render(
    <PageTitleContext.Provider value={store}>
      <AppThemeWithLang>
        <MemoryRouter>
          <LegalPage page={page} />
        </MemoryRouter>
      </AppThemeWithLang>
    </PageTitleContext.Provider>,
  );
  return { ...view, store };
};

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("a legal page (CTA-159)", () => {
  it("is the Privacy Policy: one h1, declared its own, then the document's sections", async () => {
    const { store } = renderPage("privacy");
    expect(screen.getByRole("heading", { level: 1, name: "Privacy Policy" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { level: 2, name: "What the App stores on your device" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(store.getOwnHeadings()).toBe(1);
    // A link to a path of the app is a router link.
    expect(screen.getByRole("link", { name: "Cookies Notice" })).toHaveAttribute("href", "/cookies");
    expect(screen.getByText(/chessapp\.theme/)).toBeInTheDocument();
  });

  it("is the Cookies Notice, saying it sets none", async () => {
    renderPage("cookies");
    expect(screen.getByRole("heading", { level: 1, name: "Cookies Notice" })).toBeInTheDocument();
    expect(await screen.findByText(/sets no cookies/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy");
  });

  it("reads in Hebrew under Hebrew, not pinned left to right", async () => {
    await i18n.changeLanguage("he");
    const { container } = renderPage("privacy");
    expect(screen.getByRole("heading", { level: 1, name: "מדיניות פרטיות" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { level: 2, name: "מי אחראי" })).toBeInTheDocument();
    expect(container.querySelector('[lang="en"]')).toBeNull();
  });

  it.each(["privacy", "cookies"] as const)("passes axe — the %s page, in English", async (page) => {
    const { container } = renderPage(page);
    await screen.findAllByRole("heading", { level: 2 });
    await expectNoAxeViolations(container);
  });
});
