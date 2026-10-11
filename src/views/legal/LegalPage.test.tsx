import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";

import i18n from "../../i18n";
import { expectNoAxeViolations } from "../../test/axe";
import AppThemeWithLang from "../../theme/AppThemeWithLang";
import { createPageTitleStore, PageTitleContext } from "../main/pageTitle";
import LegalPage from "./LegalPage";
import { LEGAL_PAGES, type LegalPageId } from "./legalDocuments";

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

  it("names the site's operator as the build has them — the Vitest build's (CTA-182)", async () => {
    renderPage("privacy");
    const controller = (await screen.findByRole("heading", { level: 2, name: "Data controller" })).nextElementSibling;
    expect(controller).toHaveTextContent(
      "The App is operated by Ada Example, 1 Example Street, Exampletown, who is the data controller for the processing this policy describes. For any privacy question or request, write to privacy@example.org.",
    );
    expect(document.body).not.toHaveTextContent(/%[A-Z_]+%/);
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
    const controller = await screen.findByRole("heading", { level: 2, name: "בעל השליטה במידע" });
    expect(container.querySelector('[lang="en"]')).toBeNull();
    // The operator's Hebrew name and address, the one email address (CTA-182).
    expect(controller.nextElementSibling).toHaveTextContent("עדה דוגמה, רחוב הדוגמה 1, עיר הדוגמה,");
    expect(controller.nextElementSibling).toHaveTextContent("privacy@example.org");
  });

  it.each(LEGAL_PAGES)("passes axe — the %s page, in English", async (page) => {
    const { container } = renderPage(page);
    await screen.findAllByRole("heading", { level: 2 });
    await expectNoAxeViolations(container);
  });
});
