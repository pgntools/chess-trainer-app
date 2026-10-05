import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";

import { downloadTextFile } from "../../../lib/pgnExport";
import { starterFrontmatter, todayIso } from "./metadataYaml";
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
const metadataTab = () => screen.getByRole("tab", { name: "Metadata" });
const contentTab = () => screen.getByRole("tab", { name: "Content" });
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
    // The metadata and the content, joined back into one file (CTA-135).
    expect(vi.mocked(downloadTextFile)).toHaveBeenLastCalledWith("article.mdx", `---\n${starterFrontmatter(todayIso())}---\n\n## Mine`, "text/markdown");
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

describe("the MDX editor's Content and Metadata (CTA-135)", () => {
  it("opens a file in two — its body in Content, its frontmatter in Metadata — and draws the header from the metadata", async () => {
    const user = userEvent.setup();
    mount("/dev/mdx-editor?article=tournaments%2Fwerner-obermeyer-swiss-2026");
    await screen.findByText("Opened tournaments/werner-obermeyer-swiss-2026.mdx.");
    expect((source() as HTMLTextAreaElement).value.startsWith('import games from "./20th-werner-obermeyer-swiss-5r.pgn?raw"')).toBe(true);
    expect((source() as HTMLTextAreaElement).value).not.toContain("---");
    // The preview's header, as the article's page draws it.
    const header = within(preview()).getByTestId("mdx-editor-preview-header");
    expect(within(header).getByRole("heading", { name: "20th Werner-Obermeyer" })).toBeInTheDocument();
    expect(within(header).getByTestId("article-dates")).toHaveTextContent("Published Sep 11, 2026");

    await user.click(metadataTab());
    expect(screen.getByRole("textbox", { name: "Title (required)" })).toHaveValue("20th Werner-Obermeyer");
    expect(screen.getByTestId("mdx-editor-meta-date")).toHaveValue("2026-09-11");
    await user.click(screen.getByRole("button", { name: "YAML" }));
    expect(screen.getByRole("textbox", { name: "Metadata YAML" })).toHaveValue(
      'title: 20th Werner-Obermeyer\nsummary: "A Swiss: five rounds, the top boards of each — <SwissStandingsTable> and three of its games."\ndate: 2026-09-11\n',
    );
    expect(screen.getByTestId("mdx-editor-editing")).not.toHaveTextContent("changed");
  });

  it("edits the metadata in the form, shows it in the YAML and the header, and joins it back on copy", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    mount();
    setSource("## Body");
    await user.click(metadataTab());
    const title = screen.getByRole("textbox", { name: "Title (required)" });
    await user.clear(title);
    // Validated as the build validates it, against its field.
    expect(screen.getByText("title is required")).toBeInTheDocument();
    await user.type(title, "My event");
    await user.click(screen.getByRole("switch", { name: "Draft — in yarn dev only, not in the build" }));
    expect(within(preview()).getByRole("heading", { name: "My event" })).toBeInTheDocument();
    expect(within(preview()).queryByTestId("article-draft")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "YAML" }));
    expect(screen.getByRole("textbox", { name: "Metadata YAML" })).toHaveValue(
      `title: My event\nsummary: One line about it, for the index pages.\ndate: ${todayIso()}\n`,
    );
    await user.click(screen.getByRole("button", { name: "Copy MDX" }));
    expect(writeText).toHaveBeenCalledWith(`---\ntitle: My event\nsummary: One line about it, for the index pages.\ndate: ${todayIso()}\n---\n\n## Body`);
  });

  it("starts a new article as a draft dated today, marked in the preview", async () => {
    mount();
    const header = await within(preview()).findByTestId("mdx-editor-preview-header");
    expect(within(header).getByRole("heading", { name: "A new article" })).toBeInTheDocument();
    expect(within(header).getByTestId("article-draft")).toHaveTextContent("Draft");
  });

  it("keeps YAML that does not parse in the YAML view, saying where, and keeps a key it does not know", async () => {
    const user = userEvent.setup();
    mount();
    await user.click(metadataTab());
    await user.click(screen.getByRole("button", { name: "YAML" }));
    const yaml = screen.getByRole("textbox", { name: "Metadata YAML" });
    fireEvent.change(yaml, { target: { value: "title: [unclosed\n" } });
    expect(screen.getByTestId("mdx-editor-meta-yaml-error")).toHaveTextContent(/Line \d+: Flow sequence/);
    await user.click(screen.getByRole("button", { name: "Form" }));
    // Nothing for the form to show: still the YAML.
    expect(screen.getByRole("textbox", { name: "Metadata YAML" })).toBeInTheDocument();

    fireEvent.change(yaml, { target: { value: "title: T\nsummary: S\nslug: x # mine\n" } });
    expect(screen.getByTestId("mdx-editor-meta-issues")).toHaveTextContent('unknown key "slug"');
    await user.click(screen.getByRole("button", { name: "Form" }));
    expect(screen.getByTestId("mdx-editor-meta-unknown-slug")).toHaveTextContent("an unknown key, kept as written");
    await user.type(screen.getByRole("textbox", { name: "Title (required)" }), "wo");
    await user.click(screen.getByRole("button", { name: "YAML" }));
    expect(screen.getByRole("textbox", { name: "Metadata YAML" })).toHaveValue("title: Two\nsummary: S\nslug: x # mine\n");
  });

  it("gives a translation its own words only, and shows what the English file says", async () => {
    const user = userEvent.setup();
    mount("/dev/mdx-editor?article=tournaments%2Folympiad-2026.he");
    await screen.findByText("Opened tournaments/olympiad-2026.he.mdx.");
    await user.click(metadataTab());
    expect(screen.getByRole("textbox", { name: "Title (required)" })).toHaveValue("האולימפיאדה ה-46 בשחמט 2026");
    expect(screen.queryByTestId("mdx-editor-meta-date")).not.toBeInTheDocument();
    expect(screen.getByTestId("mdx-editor-meta-english")).toHaveTextContent("From the English file: date 2026-09-16.");
  });

  it("offers to move a --- block pasted into Content into Metadata", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mount();
    setSource("---\ntitle: Pasted\nsummary: S\n---\n\n## Pasted body");
    // It draws nothing in the preview, and takes no line marker.
    expect(await within(preview()).findByRole("heading", { name: "Pasted body" })).toBeInTheDocument();
    expect(Array.from(preview().querySelectorAll<HTMLElement>("[data-source-line]"), (marker) => marker.dataset.sourceLine)).toEqual(["6"]);
    await user.click(screen.getByRole("button", { name: "Move it to Metadata" }));
    expect(source()).toHaveValue("## Pasted body");
    await user.click(metadataTab());
    expect(screen.getByRole("textbox", { name: "Title (required)" })).toHaveValue("Pasted");
    await user.click(contentTab());
    expect(screen.queryByTestId("mdx-editor-pasted-frontmatter")).not.toBeInTheDocument();
  });
});

/*
  Saving through the storage service (CTA-137), with `fetch` standing in for
  `yarn mdx-editor:start`: the files it holds, and whether it is up.
*/
type Service = { up: boolean; files: Map<string, string>; writes: { path: string; content: string; overwrite: boolean }[] };

const stubService = (files: Record<string, string> = {}): Service => {
  const service: Service = { up: true, files: new Map(Object.entries(files)), writes: [] };
  const reply = (status: number, body: unknown) => ({ ok: status < 300, status, json: async () => body }) as Response;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (!service.up) throw new TypeError("Failed to fetch");
      const route = new URL(url).pathname;
      if (route === "/folders") {
        const folders = new Map<string, string[]>([["", []]]);
        for (const path of [...service.files.keys()].sort()) {
          const parts = path.split("/");
          for (let depth = 1; depth < parts.length; depth += 1) if (!folders.has(parts.slice(0, depth).join("/"))) folders.set(parts.slice(0, depth).join("/"), []);
          folders.get(parts.slice(0, -1).join("/"))?.push(parts.at(-1) ?? "");
        }
        return reply(200, { folders: [...folders].map(([path, names]) => ({ path, ...(path === "tournaments" ? { title: "Tournaments" } : {}), files: names })) });
      }
      const { path, content, overwrite } = JSON.parse(String(init?.body)) as Service["writes"][number];
      if (path.includes("..")) return reply(400, { error: `${path}: leaves articles/.` });
      if (service.files.has(path) && !overwrite) return reply(409, { error: `${path} is already there.`, exists: path });
      const created = service.files.has(path) ? [] : path.split("/").slice(0, -1).filter((_, index, parts) => ![...service.files.keys()].some((file) => file.startsWith(`${parts.slice(0, index + 1).join("/")}/`))).map((_, index, made) => made.slice(0, index + 1).join("/"));
      service.writes.push({ path, content, overwrite });
      service.files.set(path, content);
      return reply(201, { written: path, created: true, foldersCreated: created });
    }),
  );
  return service;
};

const saveDialog = () => screen.getByRole("dialog", { name: "Save the article" });

describe("the MDX editor's Save (CTA-137)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("always shows Save, and says how to start the service when it is not running, then retries", async () => {
    const user = userEvent.setup();
    const service = stubService({ "tournaments/index.mdx": "x" });
    service.up = false;
    mount();
    await user.click(screen.getByRole("button", { name: "Save" }));
    const down = await screen.findByRole("dialog", { name: "The storage service is not running" });
    expect(down).toHaveTextContent("yarn mdx-editor:start");
    expect(down).toHaveTextContent("http://127.0.0.1:5172");

    service.up = true;
    await user.click(within(down).getByRole("button", { name: "Retry" }));
    // A new article has no file yet: Save asks where.
    expect(await screen.findByRole("dialog", { name: "Save the article" })).toBeInTheDocument();
    await expectNoAxeViolations(saveDialog());
  });

  it("saves a new article where the reader picks, and tracks that file from then on", async () => {
    const user = userEvent.setup();
    const service = stubService({ "get-started.mdx": "x", "tournaments/index.mdx": "x", "tournaments/cup.mdx": "x" });
    mount();
    setSource("## Body");
    await user.click(screen.getByRole("button", { name: "Save" }));
    const dialog = await screen.findByRole("dialog", { name: "Save the article" });
    // The name starts from the title, the folder at the root.
    const name = within(dialog).getByRole("textbox", { name: "File name" });
    expect(name).toHaveValue("a-new-article");
    await user.click(within(dialog).getByRole("treeitem", { name: "Tournaments (tournaments/)" }));
    await user.clear(name);
    await user.type(name, "my-event");
    expect(within(dialog).getByTestId("mdx-editor-save-path")).toHaveTextContent("src/views/blog/articles/tournaments/my-event.mdx");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(await screen.findByTestId("mdx-editor-notice")).toHaveTextContent("Saved src/views/blog/articles/tournaments/my-event.mdx.");
    expect(service.writes).toEqual([{ path: "tournaments/my-event.mdx", content: `---\n${starterFrontmatter(todayIso())}---\n\n## Body`, overwrite: false }]);
    expect(screen.queryByRole("dialog", { name: "Save the article" })).not.toBeInTheDocument();
    expect(screen.getByTestId("mdx-editor-editing")).toHaveTextContent("Editing tournaments/my-event.mdx");
    expect(screen.getByTestId("mdx-editor-editing")).not.toHaveTextContent("changed");

    // From now on Save writes that file in place.
    setSource("## Body, again");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(service.writes).toHaveLength(2));
    expect(service.writes[1]).toMatchObject({ path: "tournaments/my-event.mdx", overwrite: true });
  });

  it("writes an opened article over its own file, with no dialog", async () => {
    const user = userEvent.setup();
    const service = stubService({ "tournaments/werner-obermeyer-swiss-2026.mdx": "old" });
    mount("/dev/mdx-editor?article=tournaments%2Fwerner-obermeyer-swiss-2026");
    await screen.findByText("Opened tournaments/werner-obermeyer-swiss-2026.mdx.");
    setSource("## Rewritten");
    expect(screen.getByTestId("mdx-editor-editing")).toHaveTextContent("— changed");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Saved src/views/blog/articles/tournaments/werner-obermeyer-swiss-2026.mdx.")).toBeInTheDocument();
    expect(service.writes).toEqual([{ path: "tournaments/werner-obermeyer-swiss-2026.mdx", content: expect.stringContaining("## Rewritten"), overwrite: true }]);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByTestId("mdx-editor-editing")).not.toHaveTextContent("changed");
  });

  it("saves as a new file elsewhere, leaving the original, and asks before writing over another file", async () => {
    const user = userEvent.setup();
    const service = stubService({ "tournaments/index.mdx": "x", "tournaments/werner-obermeyer-swiss-2026.mdx": "old", "tournaments/taken.mdx": "theirs" });
    mount("/dev/mdx-editor?article=tournaments%2Fwerner-obermeyer-swiss-2026");
    await screen.findByText("Opened tournaments/werner-obermeyer-swiss-2026.mdx.");
    await user.click(screen.getByRole("button", { name: "Save as…" }));
    const dialog = await screen.findByRole("dialog", { name: "Save the article" });
    const name = within(dialog).getByRole("textbox", { name: "File name" });
    expect(name).toHaveValue("werner-obermeyer-swiss-2026");
    await user.clear(name);
    await user.type(name, "taken");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    // The service reports the file there; nothing is written until the reader says so.
    const conflict = await screen.findByRole("dialog", { name: "Replace a file that is there?" });
    expect(conflict).toHaveTextContent("src/views/blog/articles/tournaments/taken.mdx is already there.");
    expect(service.files.get("tournaments/taken.mdx")).toBe("theirs");
    await user.click(within(conflict).getByRole("button", { name: "Replace" }));

    expect(await screen.findByText("Saved src/views/blog/articles/tournaments/taken.mdx.")).toBeInTheDocument();
    expect(service.writes.map(({ path, overwrite }) => ({ path, overwrite }))).toEqual([{ path: "tournaments/taken.mdx", overwrite: true }]);
    expect(service.files.get("tournaments/werner-obermeyer-swiss-2026.mdx")).toBe("old");
    expect(screen.getByTestId("mdx-editor-editing")).toHaveTextContent("Editing tournaments/taken.mdx");
  });

  it("makes a new sub-folder, takes a PGN into it, and refuses a translation with no English file beside it", async () => {
    const user = userEvent.setup();
    const service = stubService({ "tournaments/index.mdx": "x", "tournaments/cup.mdx": "x" });
    mount();
    await user.click(screen.getByRole("button", { name: "Save as…" }));
    const dialog = await screen.findByRole("dialog", { name: "Save the article" });
    await user.click(within(dialog).getByRole("treeitem", { name: "Tournaments (tournaments/)" }));
    const name = within(dialog).getByRole("textbox", { name: "File name" });
    await user.clear(name);
    await user.type(name, "cup.he");
    expect(within(dialog).getByRole("button", { name: "Save" })).toBeEnabled();
    await user.clear(name);
    await user.type(name, "final.he");
    expect(within(dialog).getByText("A translation goes beside its English file, and tournaments/final.mdx is not there.")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Save" })).toBeDisabled();

    await user.type(within(dialog).getByRole("textbox", { name: "New sub-folder (optional)" }), "club-nights");
    await user.clear(name);
    await user.type(name, "round-one");
    expect(within(dialog).getByTestId("mdx-editor-save-path")).toHaveTextContent("src/views/blog/articles/tournaments/club-nights/round-one.mdx");
    await user.upload(within(dialog).getByTestId("mdx-editor-save-pgn-input"), new File(["1. e4 *"], "games.pgn", { type: "application/x-chess-pgn" }));
    expect(await within(dialog).findByText("Added tournaments/club-nights/games.pgn — the article imports it when it is saved in tournaments/club-nights/.")).toBeInTheDocument();
    expect(service.writes[0]).toEqual({ path: "tournaments/club-nights/games.pgn", content: "1. e4 *", overwrite: false });

    await user.click(within(dialog).getByRole("button", { name: "Save" }));
    expect(await screen.findByTestId("mdx-editor-notice")).toHaveTextContent("Saved src/views/blog/articles/tournaments/club-nights/round-one.mdx. It imports games.pgn as games.");
    // Saved with the import, so nothing is left changed.
    expect(service.files.get("tournaments/club-nights/round-one.mdx")).toContain('import games from "./games.pgn?raw"');
    expect((source() as HTMLTextAreaElement).value).toMatch(/^import games from "\.\/games\.pgn\?raw"\n\n/);
    expect(screen.getByTestId("mdx-editor-editing")).not.toHaveTextContent("changed");
  });

  it("shows what the service refuses in the dialog", async () => {
    const user = userEvent.setup();
    stubService({});
    mount();
    await user.click(screen.getByRole("button", { name: "Save" }));
    await user.upload(within(await screen.findByRole("dialog", { name: "Save the article" })).getByTestId("mdx-editor-save-pgn-input"), new File(["x"], "..pgn"));
    // The fake refuses any "..", as the service refuses a path out.
    expect(await within(saveDialog()).findByTestId("mdx-editor-save-error")).toHaveTextContent("leaves articles/");
  });

  it("adds a PGN to an opened article's folder, importing it in the content, the preview reading it at once", async () => {
    const user = userEvent.setup();
    const service = stubService({ "tournaments/werner-obermeyer-swiss-2026.mdx": "x", "tournaments/club.pgn": "theirs" });
    mount("/dev/mdx-editor?article=tournaments%2Fwerner-obermeyer-swiss-2026");
    await screen.findByText("Opened tournaments/werner-obermeyer-swiss-2026.mdx.");
    setSource('import games from "./20th-werner-obermeyer-swiss-5r.pgn?raw"\n\n## Standings');
    await within(preview()).findByRole("heading", { name: "Standings" });

    const pgn = '[Event "Club"]\n[White "Amy"]\n[Black "Bob"]\n[Result "1-0"]\n\n1. e4 e5 1-0';
    await user.upload(screen.getByTestId("mdx-editor-add-pgn-input"), [new File([pgn], "round-2.pgn"), new File(["1. d4 *"], "club.pgn")]);
    // The first is written; the second is there already, and asked about.
    const conflict = await screen.findByRole("dialog", { name: "Replace a file that is there?" });
    expect(conflict).toHaveTextContent("src/views/blog/articles/tournaments/club.pgn is already there.");
    expect(service.files.get("tournaments/round-2.pgn")).toBe(pgn);
    await user.click(within(conflict).getByRole("button", { name: "Replace" }));
    await waitFor(() => expect(service.files.get("tournaments/club.pgn")).toBe("1. d4 *"));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(service.writes.map(({ path, overwrite }) => ({ path, overwrite }))).toEqual([
      { path: "tournaments/round-2.pgn", overwrite: false },
      { path: "tournaments/club.pgn", overwrite: true },
    ]);

    expect(source()).toHaveValue(
      'import games from "./20th-werner-obermeyer-swiss-5r.pgn?raw"\nimport round2 from "./round-2.pgn?raw"\nimport club from "./club.pgn?raw"\n\n## Standings',
    );
    expect(screen.getByTestId("mdx-editor-notice")).toHaveTextContent("Added tournaments/club.pgn — imported as club: give it to a component as pgn={club}.");
    expect(screen.getByTestId("mdx-editor-editing")).toHaveTextContent("— changed");

    // The new file is not in the build's glob yet; the preview reads what was written.
    setSource(`${(source() as HTMLTextAreaElement).value}\n\n{round2.includes("Amy") ? "Read it" : "Missed it"}`);
    expect(await within(preview()).findByText("Read it")).toBeInTheDocument();
    expect(screen.queryByTestId("mdx-editor-compile-error")).not.toBeInTheDocument();
  });

  it("opens the save dialog from Add PGN for an article with no folder yet", async () => {
    const user = userEvent.setup();
    stubService({ "tournaments/index.mdx": "x" });
    mount();
    await user.click(screen.getByRole("button", { name: "Add PGN" }));
    const dialog = await screen.findByRole("dialog", { name: "Save the article" });
    expect(within(dialog).getByTestId("mdx-editor-save-for-pgn")).toHaveTextContent("add the PGN, then save");
    expect(within(dialog).getByRole("button", { name: "Add PGN to this folder" })).toBeInTheDocument();
  });
});
