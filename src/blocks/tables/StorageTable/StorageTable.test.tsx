import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";

import i18n from "../../../i18n";
import { formatBytes } from "../../../lib/storageDiagnostics";
import { expectNoAxeViolations } from "../../../test/axe";
import { BROWSER, BROWSER_WITHOUT_INDEXEDDB, CATEGORIES, READING } from "./fixtures";
import StorageTable, { type StorageTableProps } from "./StorageTable";

const mount = (props: Partial<StorageTableProps> = {}) =>
  render(<StorageTable browser={BROWSER} categories={CATEGORIES} testId="storage" {...props} />);

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("StorageTable", () => {
  it("gives the browser's estimates, each labelled as one", () => {
    mount();
    const browser = within(screen.getByRole("table", { name: "Browser storage" }));
    expect(browser.getAllByRole("columnheader").map((head) => head.textContent)).toEqual(["Measure", "Size"]);
    expect(browser.getByText("Origin usage (estimate)")).toBeInTheDocument();
    expect(screen.getByTestId("storage-usage")).toHaveTextContent(formatBytes(BROWSER.usage!));
    expect(screen.getByTestId("storage-indexeddb")).toHaveTextContent(formatBytes(BROWSER.indexedDB!));
  });

  it("says Not available where the browser reports nothing, and … while it is asked", () => {
    const { unmount } = mount({ browser: BROWSER_WITHOUT_INDEXEDDB });
    expect(screen.getByTestId("storage-indexeddb")).toHaveTextContent("Not available");
    unmount();
    mount({ browser: undefined });
    expect(screen.getByTestId("storage-usage")).toHaveTextContent("…");
  });

  it("counts each category and estimates its payload, the numbers end-aligned", () => {
    mount();
    const data = within(screen.getByRole("table", { name: "Your data" }));
    expect(data.getAllByRole("columnheader").map((head) => head.textContent)).toEqual(["Category", "Records", "Estimated payload"]);
    expect(screen.getByTestId("storage-collectionGames-records")).toHaveTextContent("12904");
    expect(screen.getByTestId("storage-repertoires-payload")).toHaveTextContent(formatBytes(1_203_455));
    expect(screen.getByTestId("storage-analyses-records")).toHaveStyle({ textAlign: "end" });
  });

  it("closes each database's section with a bolder line, never the last", () => {
    mount();
    for (const id of ["playedGames", "analyses", "repertoires"]) {
      expect(screen.getByTestId(`storage-${id}-records`)).toHaveStyle({ borderBottomWidth: "2px" });
    }
    expect(screen.getByTestId("storage-collectionGames-records")).not.toHaveStyle({ borderBottomWidth: "2px" });
  });

  it("says … for every count still being read", () => {
    mount({ categories: READING });
    expect(screen.getByTestId("storage-playedGames-records")).toHaveTextContent("…");
    expect(screen.getByTestId("storage-analyses-payload")).toHaveTextContent("…");
  });

  it("passes axe", async () => {
    mount();
    await expectNoAxeViolations();
  });
});
