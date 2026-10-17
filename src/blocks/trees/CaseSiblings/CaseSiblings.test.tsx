import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import CaseSiblings, { type CaseSiblingsProps } from "./CaseSiblings";
import { MANY_ROWS, ROWS } from "./fixtures";

const props = (given: Partial<CaseSiblingsProps> = {}): CaseSiblingsProps => ({
  projectName: "Club",
  rows: ROWS,
  currentId: "cpos",
  linkOf: (row) => ({ href: `/case/${row.id}` }),
  closeLink: { href: "/project" },
  previous: { href: "/case/cgame" },
  next: { href: "/case/clong" },
  text: "",
  onTextChange: () => {},
  testId: "probe",
  ...given,
});

const mount = (given: Partial<CaseSiblingsProps> = {}) => render(<CaseSiblings {...props(given)} />);

/** The names of the rows on the page shown. */
const shownNames = () => within(screen.getByRole("tree")).getAllByRole("treeitem").map((item) => item.textContent);

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("CaseSiblings (CTA-186)", () => {
  it("lists the Project's Cases as a tree of links, the open one current, with Close and previous / next", async () => {
    const { container } = mount();
    expect(screen.getByRole("navigation", { name: "Cases of Club" })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: /Carlsen – Caruana/ })).toHaveAttribute("href", "/case/cgame");
    expect(screen.getByTestId("probe-tree-cpos")).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Back to Club" })).toHaveAttribute("href", "/project");
    expect(screen.getByRole("link", { name: "Previous case" })).toHaveAttribute("href", "/case/cgame");
    expect(screen.getByRole("link", { name: "Next case" })).toHaveAttribute("href", "/case/clong");
    // One page: no pager (CTA-211).
    expect(screen.queryByTestId("probe-pager")).toBeNull();
    await expectNoAxeViolations(container);
  });

  it("hands the words over, and says when they leave nothing", async () => {
    const onTextChange = vi.fn();
    const { unmount } = mount({ onTextChange });
    await userEvent.type(screen.getByRole("searchbox", { name: "Filter cases" }), "l");
    expect(onTextChange).toHaveBeenCalledWith("l");
    unmount();
    mount({ rows: [], text: "zzz", previous: undefined, next: undefined });
    expect(screen.getByTestId("probe-no-match")).toHaveTextContent("No case matches the filter.");
    expect(screen.getByRole("button", { name: "Previous case" })).toBeDisabled();
  });
});

describe("CaseSiblings — paged, 100 a page (CTA-211)", () => {
  it("opens on the open Case's page, marked current, with the pager's count and no size to choose", async () => {
    const { container } = mount({ rows: MANY_ROWS, currentId: "c150" });
    const names = shownNames();
    expect(names).toHaveLength(100);
    expect(names[0]).toBe("Chapter 101");
    expect(names[99]).toBe("Chapter 200");
    expect(screen.getByTestId("probe-tree-c150")).toHaveAttribute("aria-current", "page");
    const pager = screen.getByTestId("probe-pager");
    expect(pager).toHaveTextContent("101–200 of 250");
    expect(within(pager).queryByRole("combobox")).toBeNull();
    await expectNoAxeViolations(container);
  });

  it("pages by hand without changing the Case; a step to another Case lands on its page", async () => {
    const { rerender } = mount({ rows: MANY_ROWS, currentId: "c150" });
    await userEvent.click(within(screen.getByTestId("probe-pager")).getByRole("button", { name: /next page/i }));
    expect(screen.getByTestId("probe-pager")).toHaveTextContent("201–250 of 250");
    expect(shownNames()).toHaveLength(50);
    expect(screen.queryByTestId("probe-tree-c150")).toBeNull();
    // The foot's previous / next Case are the screen's, untouched by paging.
    expect(screen.getByRole("link", { name: "Next case" })).toHaveAttribute("href", "/case/clong");
    expect(within(screen.getByTestId("probe-pager")).getByRole("button", { name: /next page/i })).toBeDisabled();

    rerender(<CaseSiblings {...props({ rows: MANY_ROWS, currentId: "c42" })} />);
    expect(screen.getByTestId("probe-pager")).toHaveTextContent("1–100 of 250");
    expect(screen.getByTestId("probe-tree-c42")).toHaveAttribute("aria-current", "page");
  });

  it("goes back to the open Case's page when the words change — the first page where they leave it out", async () => {
    const { rerender } = mount({ rows: MANY_ROWS, currentId: "c150" });
    await userEvent.click(within(screen.getByTestId("probe-pager")).getByRole("button", { name: /previous page/i }));
    expect(screen.getByTestId("probe-pager")).toHaveTextContent("1–100 of 250");

    // "Chapter 1…" keeps 1, 10–19, 100–199: 111 rows, Chapter 150 the 62nd.
    const narrowed = MANY_ROWS.filter((row) => row.name.startsWith("Chapter 1"));
    rerender(<CaseSiblings {...props({ rows: narrowed, currentId: "c150", text: "Chapter 1" })} />);
    expect(screen.getByTestId("probe-pager")).toHaveTextContent("1–100 of 111");
    expect(screen.getByTestId("probe-tree-c150")).toHaveAttribute("aria-current", "page");

    await userEvent.click(within(screen.getByTestId("probe-pager")).getByRole("button", { name: /next page/i }));
    expect(screen.getByTestId("probe-pager")).toHaveTextContent("101–111 of 111");
    // Words that leave the open Case out: the first page.
    const leftOut = MANY_ROWS.filter((row) => row.id !== "c150");
    rerender(<CaseSiblings {...props({ rows: leftOut, currentId: "c150", text: "other words" })} />);
    expect(screen.getByTestId("probe-pager")).toHaveTextContent("1–100 of 249");
    expect(shownNames()[0]).toBe("Chapter 1");
  });

  it("words the count in the reader's language", async () => {
    await i18n.changeLanguage("he");
    mount({ rows: MANY_ROWS, currentId: "c250" });
    expect(screen.getByTestId("probe-pager")).toHaveTextContent("201–250 מתוך 250");
  });
});
