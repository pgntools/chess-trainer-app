import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";

import { downloadTextFile } from "../../../lib/pgnExport";
import { expectNoAxeViolations } from "../../../test/axe";
import { resetLibrary } from "../../library/libraryTestKit";
import Main from "./Main";

/*
  The dev-only MDX editor (`/dev/mdx-editor`): MDX typed on the left is
  compiled in the browser and rendered on the right with the components every
  article embeds — the Library's data and all. A document that will not
  compile keeps the last one that did; a component that throws is contained.
*/

vi.mock("react-chessboard", async () => {
  const { reactChessboardMock } = await import("../../board/boardTestHarness");
  return reactChessboardMock();
});

vi.mock("../../../lib/pgnExport", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/pgnExport")>()),
  downloadTextFile: vi.fn(() => true),
}));

/** Where the router is — the editor drops `?article=` once it has opened the file. */
function Where() {
  const location = useLocation();
  return <p data-testid="where">{`${location.pathname}${location.search}`}</p>;
}

const mount = (entry = "/dev/mdx-editor") =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route
          path="/dev/mdx-editor"
          element={
            <>
              <Main />
              <Where />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );

const source = () => screen.getByRole("textbox", { name: "MDX source" });
const preview = () => screen.getByRole("region", { name: "Preview" });
/** Replace the whole document, as a paste would. */
const setSource = (text: string) => fireEvent.change(source(), { target: { value: text } });

beforeEach(async () => {
  sessionStorage.clear();
  await resetLibrary();
});

describe("the MDX editor", () => {
  it("renders the starter article, its embeds reading the shipped Library", async () => {
    mount();
    expect(screen.getByRole("heading", { level: 1, name: "MDX editor" })).toBeInTheDocument();
    expect(await within(preview()).findByRole("heading", { name: "A draft" })).toBeInTheDocument();
    expect(await within(preview()).findByRole("table", { name: "FIDE Candidates 2026 — crosstable" })).toBeInTheDocument();
  });

  it("renders what is typed, a moment after typing stops", async () => {
    const user = userEvent.setup();
    mount();
    await within(preview()).findByRole("heading", { name: "A draft" });
    await user.clear(source());
    await user.type(source(), "## Fresh words\n\nSome **bold** text");
    expect(await within(preview()).findByRole("heading", { name: "Fresh words" })).toBeInTheDocument();
    expect(within(preview()).getByText("bold").tagName).toBe("STRONG");
    expect(within(preview()).queryByRole("heading", { name: "A draft" })).not.toBeInTheDocument();
    expect(screen.getByTestId("mdx-editor-state")).toHaveTextContent("Up to date");
  });

  it("keeps the last document that compiled under the error of one that does not", async () => {
    mount();
    setSource("## Good");
    await within(preview()).findByRole("heading", { name: "Good" });
    setSource("## Good\n\n<BoardRow>\n");
    const error = await screen.findByTestId("mdx-editor-compile-error");
    expect(error).toHaveTextContent("Expected a closing tag for `<BoardRow>`");
    expect(error).toHaveTextContent("showing the last version that did");
    expect(within(preview()).getByRole("heading", { name: "Good" })).toBeInTheDocument();
    expect(screen.getByTestId("mdx-editor-state")).toHaveTextContent("Not compiled");

    setSource("## Better");
    await within(preview()).findByRole("heading", { name: "Better" });
    expect(screen.queryByTestId("mdx-editor-compile-error")).not.toBeInTheDocument();
  });

  it("marks where each block's source line starts in the preview, and scrolls the panes together until switched off", async () => {
    const user = userEvent.setup();
    mount();
    setSource("export const x = 1\n\n## One\n\nWords\n\n{/* a note */}\n\n## Two");
    await within(preview()).findByRole("heading", { name: "Two" });
    const lines = Array.from(preview().querySelectorAll<HTMLElement>("[data-source-line]"), (marker) => marker.dataset.sourceLine);
    // Not the export or the comment, which draw nothing.
    expect(lines).toEqual(["3", "5", "9"]);
    expect(within(preview()).getByRole("heading", { name: "One" }).previousElementSibling).toHaveAttribute("data-source-line", "3");

    const together = screen.getByRole("switch", { name: "Scroll together" });
    expect(together).toBeChecked();
    await user.click(together);
    expect(together).not.toBeChecked();
  });

  it("contains a component that throws, and renders again on the next compile", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    mount();
    setSource('{(() => { throw new Error("broken embed") })()}');
    expect(await screen.findByTestId("mdx-editor-render-error")).toHaveTextContent("broken embed");
    setSource("## Mended");
    expect(await within(preview()).findByRole("heading", { name: "Mended" })).toBeInTheDocument();
    expect(screen.queryByTestId("mdx-editor-render-error")).not.toBeInTheDocument();
  });

  it("opens an article typed to find, its PGN import read from the file beside it", async () => {
    const user = userEvent.setup();
    mount();
    const input = screen.getByRole("combobox", { name: "Open an article" });
    await user.click(input);
    // The list is the Blog's folders as its groups, the articles under them.
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    await user.type(input, "werner");
    await user.click(await screen.findByRole("option", { name: "20th Werner-Obermeyer" }));
    // The article's file is read lazily, as the app reads it.
    expect(await screen.findByText("Editing tournaments/werner-obermeyer-swiss-2026.mdx", { exact: false })).toHaveAttribute("data-testid", "mdx-editor-editing");
    expect((source() as HTMLTextAreaElement).value).toContain('import games from "./20th-werner-obermeyer-swiss-5r.pgn?raw"');
    expect(await within(preview()).findByRole("heading", { name: "The standings" })).toBeInTheDocument();
    expect(await within(preview()).findAllByRole("table")).not.toHaveLength(0);
    expect(screen.queryByTestId("mdx-editor-compile-error")).not.toBeInTheDocument();
  });

  it("opens the article an edit icon names, over the kept draft, then drops it from the address", async () => {
    mount();
    setSource("## A draft of my own");
    await within(preview()).findByRole("heading", { name: "A draft of my own" });
    cleanup();

    mount("/dev/mdx-editor?article=tournaments%2Fwerner-obermeyer-swiss-2026");
    expect(await screen.findByTestId("mdx-editor-notice")).toHaveTextContent("Opened tournaments/werner-obermeyer-swiss-2026.mdx.");
    expect((source() as HTMLTextAreaElement).value).toContain('import games from "./20th-werner-obermeyer-swiss-5r.pgn?raw"');
    expect(screen.getByTestId("mdx-editor-editing")).not.toHaveTextContent("changed");
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent(/^\/dev\/mdx-editor$/));
    expect(await within(preview()).findByRole("heading", { name: "The standings" })).toBeInTheDocument();
  });

  it("says so when the article an address names has no file, keeping the draft", async () => {
    mount("/dev/mdx-editor?article=nowhere");
    expect(await screen.findByTestId("mdx-editor-notice")).toHaveTextContent("No article file nowhere.mdx.");
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent(/^\/dev\/mdx-editor$/));
    expect((source() as HTMLTextAreaElement).value).toContain("## A draft");
  });

  it("says an import it cannot read, and where", async () => {
    mount();
    setSource('import games from "./nowhere.pgn?raw"\n\n## Title');
    expect(await screen.findByTestId("mdx-editor-compile-error")).toHaveTextContent('Line 1: Cannot resolve "./nowhere.pgn?raw"');
  });

  it("asks before replacing changed text, and downloads the document", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    mount();
    setSource("## Mine");
    await user.click(screen.getByRole("button", { name: "New article" }));
    expect(confirm).toHaveBeenCalledOnce();
    expect(source()).toHaveValue("## Mine");

    await user.click(screen.getByRole("button", { name: "Download .mdx" }));
    expect(vi.mocked(downloadTextFile)).toHaveBeenLastCalledWith("article.mdx", "## Mine", "text/markdown");
    expect(screen.getByTestId("mdx-editor-notice")).toHaveTextContent("Downloaded article.mdx.");
  });

  it("keeps the draft across a remount in the same tab", async () => {
    const { unmount } = mount();
    setSource("## Kept");
    await within(preview()).findByRole("heading", { name: "Kept" });
    unmount();
    mount();
    expect(source()).toHaveValue("## Kept");
    // Still changed, so replacing it asks first.
    expect(screen.getByTestId("mdx-editor-editing")).toHaveTextContent("— changed");
  });

  it("has no axe violations", async () => {
    mount();
    setSource("## Accessible\n\nWords.");
    await within(preview()).findByRole("heading", { name: "Accessible" });
    await expectNoAxeViolations();
  });
});
